import * as THREE from 'three'

// Pixel chromatic-aberration echo, loaded lazily by LogoMorph.
// Input: a mask canvas (R = glyph outline, G = glyph body) in screen space.
// A full-screen shader drags that mask back along a direction in many samples,
// splitting R/G/B at increasing distances along the trail (lens dispersion) and
// banding it into discrete echoes. Everything is resolved on a grid of chunky
// pixels (LED-style gaps, posterised colour) that jiggle when the heartbeat kicks.

const SAMPLES = 72

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform sampler2D uMask;
  uniform vec2 uDir;     // full trail length, in uv units
  uniform float uAmt;    // 0..1 — how much of the trail is grown
  uniform float uPhase;  // 0..1 — travelling flash position
  uniform float uTime;
  uniform float uBands;  // number of discrete echoes along the trail
  uniform float uPixel;  // pixel-block size, in device px
  uniform vec2 uRes;     // drawing buffer size, in device px
  uniform float uKick;   // heartbeat spring (−1..1): blocks jiggle with it
  uniform vec2 uMelt;    // edge-melt radius, in uv units
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  // Ordered (Bayer 4×4) dither — structured, pixel-art style instead of noise
  float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
  float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }

  // Soft coverage of the glyph body around p (two rings of taps) — used to melt its edge
  float coverage(vec2 p) {
    float c = texture2D(uMask, p).g * 2.0;
    for (int k = 0; k < 8; k++) {
      float a = float(k) * 0.785398;
      vec2 d = vec2(cos(a), sin(a)) * uMelt;
      c += texture2D(uMask, p + d).g + texture2D(uMask, p + d * 0.5).g * 1.5;
    }
    return c / 22.0;
  }

  void main() {
    if (uAmt <= 0.001) { gl_FragColor = vec4(0.0); return; }

    // One fragment per pixel block (this pass renders at block resolution); every block gets its
    // own random seed
    vec2 cell = floor(gl_FragCoord.xy);
    float seed = hash(cell);
    vec2 uv = (cell + 0.5) * uPixel / uRes;

    // Physics: each block is shoved by the heartbeat spring with its own weight
    vec2 along = normalize(uDir + 1e-6);
    vec2 across = vec2(-along.y, along.x);
    uv += (across * (seed - 0.5) * 0.006 + along * seed * 0.004) * uKick;

    vec3 col = vec3(0.0);
    float dither = bayer4(cell);
    float jitter = dither * 0.85;

    for (int i = 1; i <= ${SAMPLES}; i++) {
      float t = (float(i) - jitter) / float(${SAMPLES});
      if (t > uAmt) break;

      // Dispersion grows along the trail: the further back, the more the channels split
      float spread = 0.05 + 0.45 * t * t;
      vec2 o = uDir * t;
      vec4 sr = texture2D(uMask, uv - o * (1.0 + spread));
      vec4 sg = texture2D(uMask, uv - o);
      vec4 sb = texture2D(uMask, uv - o * (1.0 - spread));

      vec3 edge = vec3(sr.r, sg.r, sb.r);
      vec3 body = vec3(sr.g, sg.g, sb.g);

      float band = pow(0.5 + 0.5 * cos(t * 6.28318 * uBands), 4.0);
      // Heartbeat shockwave: a sharp front with a short afterglow behind it
      float d = t - uPhase;
      float pulse = exp(-pow(d * 14.0, 2.0)) + 0.35 * exp(-pow((d + 0.06) * 9.0, 2.0));
      // Fade towards the tail, and soften the growing front
      float w = pow(1.0 - t, 1.4) * smoothstep(uAmt, uAmt - 0.12, t);

      col += (edge * (0.3 + 2.1 * band) + body * (0.015 + 0.05 * band)) * w * (1.0 + 2.2 * pulse);
    }

    col *= 6.5 / float(${SAMPLES});

    // Edge melt: the glyph's own border dissolves into pixel blocks, split slightly per channel
    vec2 split = along * uMelt * 0.35;
    vec3 cover = vec3(coverage(uv - split), coverage(uv), coverage(uv + split));
    vec3 melt = step(vec3(dither + 0.03), smoothstep(0.06, 0.8, cover)); // strict: no coverage → no pixel
    col = max(col, melt);
    col = 1.0 - exp(-col * 1.8);                              // filmic shoulder
    // Posterise with an ordered dither → crisp pixel-art colour steps
    col = floor(col * 5.0 + dither * 0.999) / 5.0;
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`

// Second pass, at full resolution: each screen pixel reads its block's colour (nearest) and adds the
// LED-style gap between blocks. The expensive trail is computed once per block, not per pixel
const screenFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uBlocks;
  uniform vec2 uGrid;    // blocks across / down
  uniform float uPixel;  // block size, device px
  void main() {
    vec2 cell = floor(gl_FragCoord.xy / uPixel);
    vec3 col = texture2D(uBlocks, (cell + 0.5) / uGrid).rgb;
    vec2 f = fract(gl_FragCoord.xy / uPixel);
    float gap = step(1.0 / uPixel, f.x) * step(1.0 / uPixel, f.y);
    col *= mix(0.35, 1.0, gap);
    gl_FragColor = vec4(col, max(col.r, max(col.g, col.b)));  // premultiplied
  }
`

/**
 * @param glyphs outlines of the glyphs that can echo, as flat [x0, y0, x1, y1…] in logo units
 */
export function createEchoFx(canvas: HTMLCanvasElement, glyphs: number[][]) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, premultipliedAlpha: true, antialias: false })
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace

  // ── Mask (R = outline, G = body), drawn on the GPU at 1/4 of the card ──
  // It used to be a 2D canvas re-uploaded to a texture every frame, which alone took several ms per
  // frame in Safari. The glyphs are geometry here, placed by the scene's camera each frame.
  const maskRT = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    generateMipmaps: false,
  })
  const texture = maskRT.texture
  const maskScene = new THREE.Scene()
  const maskGroup = new THREE.Group()
  maskGroup.matrixAutoUpdate = false
  maskScene.add(maskGroup)
  const maskParts = glyphs.map((poly) => {
    const shape = new THREE.Shape()
    shape.moveTo(poly[0], poly[1])
    for (let i = 2; i < poly.length; i += 2) shape.lineTo(poly[i], poly[i + 1])
    const body = new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      new THREE.MeshBasicMaterial({ color: 0x000000, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, side: THREE.DoubleSide }),
    )
    const pts: number[] = []
    for (let i = 0; i < poly.length; i += 2) pts.push(poly[i], poly[i + 1], 0)
    const line = new THREE.LineLoop(
      new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)),
      new THREE.LineBasicMaterial({ color: 0x000000, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false }),
    )
    maskGroup.add(body, line)
    return { body, line }
  })

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uMask: { value: texture },
      uDir: { value: new THREE.Vector2() },
      uAmt: { value: 0 },
      uPhase: { value: 0 },
      uTime: { value: 0 },
      uBands: { value: 11 },
      uPixel: { value: 6 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uKick: { value: 0 },
      uMelt: { value: new THREE.Vector2() },

    },
    blending: THREE.NoBlending,
    depthTest: false,
    depthWrite: false,
  })

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
  scene.add(quad)

  // Block-resolution target for the first pass
  const blocks = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: false,
    generateMipmaps: false,
  })
  const screenMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: screenFragment,
    uniforms: {
      uBlocks: { value: blocks.texture },
      uGrid: { value: new THREE.Vector2(1, 1) },
      uPixel: { value: 6 },
    },
    blending: THREE.NoBlending,
    depthTest: false,
    depthWrite: false,
  })
  const screenScene = new THREE.Scene()
  screenScene.add(new THREE.Mesh(quad.geometry, screenMaterial))
  // Compile every program now, not on the first frame of the drop (that froze the scroll)
  renderer.compile(scene, camera)
  renderer.compile(screenScene, camera)
  renderer.compile(maskScene, camera)

  let width = 1
  let height = 1
  let cleared = true
  const PIXEL_CSS = 5 // block size in CSS px

  const resize = (w: number, h: number, dpr: number) => {
    width = Math.max(1, w)
    height = Math.max(1, h)
    // The effect is soft by nature — capped resolution keeps it cheap
    const ratio = Math.min(dpr, 1.5)
    renderer.setPixelRatio(ratio)
    renderer.setSize(width, height, false)
    renderer.getDrawingBufferSize(material.uniforms.uRes.value)
    const px = Math.max(2, Math.round(PIXEL_CSS * ratio))
    material.uniforms.uPixel.value = px
    screenMaterial.uniforms.uPixel.value = px
    const res = material.uniforms.uRes.value
    const cols = Math.ceil(res.x / px)
    const rows = Math.ceil(res.y / px)
    blocks.setSize(cols, rows)
    screenMaterial.uniforms.uGrid.value.set(cols, rows)
    maskRT.setSize(Math.max(1, Math.ceil(width / 4)), Math.max(1, Math.ceil(height / 4)))
  }

  return {
    resize,

    /**
     * @param dir    trail direction and length, in CSS px (screen space, y down)
     * @param amt    0..1 trail growth (0 clears)
     * @param phase  0..1 heartbeat front position along the trail
     * @param kick   heartbeat spring displacement (blocks jiggle with it)
     * @param meltPx radius (CSS px) over which the glyph edge dissolves into pixels
     * @param mask   placement of the glyphs (affine logo units → clip space: a b c d e f, as in
     *               x' = a·x + c·y + e, y' = b·x + d·y + f) and how strong each one is (0..1)
     */
    render(
      dir: { x: number; y: number }, amt: number, phase: number, time: number, kick: number, meltPx: number,
      mask: { m: [number, number, number, number, number, number]; amounts: number[] },
    ) {
      if (amt <= 0.001) {
        if (!cleared) {
          renderer.clear()
          cleared = true
        }
        return
      }
      cleared = false
      // Self-heal if the canvas was laid out after the last resize
      if (canvas.clientWidth !== width || canvas.clientHeight !== height) {
        resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1)
      }
      // Mask pass
      const [a, b, c, d, e, f] = mask.m
      maskGroup.matrix.set(a, c, 0, e, b, d, 0, f, 0, 0, 1, 0, 0, 0, 0, 1)
      maskGroup.matrixWorldNeedsUpdate = true
      maskParts.forEach(({ body, line }, g) => {
        const k = mask.amounts[g] ?? 0
        body.visible = line.visible = k > 0.002
        ;(body.material as THREE.MeshBasicMaterial).color.setRGB(0, k, 0, THREE.LinearSRGBColorSpace)
        ;(line.material as THREE.LineBasicMaterial).color.setRGB(k, 0, 0, THREE.LinearSRGBColorSpace)
      })
      renderer.setRenderTarget(maskRT)
      renderer.clear()
      renderer.render(maskScene, camera)
      material.uniforms.uDir.value.set(dir.x / width, -dir.y / height)
      material.uniforms.uAmt.value = amt
      material.uniforms.uPhase.value = phase
      material.uniforms.uTime.value = time
      material.uniforms.uKick.value = kick
      material.uniforms.uMelt.value.set(meltPx / width, meltPx / height)
      renderer.setRenderTarget(blocks)
      renderer.render(scene, camera)
      renderer.setRenderTarget(null)
      renderer.render(screenScene, camera)
    },

    dispose() {
      maskRT.dispose()
      maskParts.forEach(({ body, line }) => {
        body.geometry.dispose(); (body.material as THREE.Material).dispose()
        line.geometry.dispose(); (line.material as THREE.Material).dispose()
      })
      material.dispose()
      screenMaterial.dispose()
      blocks.dispose()
      quad.geometry.dispose()
      renderer.dispose()
    },
  }
}

export type EchoFx = ReturnType<typeof createEchoFx>
