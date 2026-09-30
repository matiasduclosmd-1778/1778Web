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

    // Snap to the pixel-block grid; every block gets its own random seed
    vec2 cell = floor(gl_FragCoord.xy / uPixel);
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
    // LED-style gap between blocks
    vec2 f = fract(gl_FragCoord.xy / uPixel);
    float gap = step(1.0 / uPixel, f.x) * step(1.0 / uPixel, f.y);
    col *= mix(0.35, 1.0, gap);
    col = clamp(col, 0.0, 1.0);
    gl_FragColor = vec4(col, max(col.r, max(col.g, col.b)));  // premultiplied
  }
`

export function createEchoFx(canvas: HTMLCanvasElement, mask: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, premultipliedAlpha: true, antialias: false })
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace

  const texture = new THREE.CanvasTexture(mask)
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = false
  texture.colorSpace = THREE.NoColorSpace

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

  let width = 1
  let height = 1
  let cleared = true
  // WebGL2 textures have immutable storage: if the mask is resized, reallocate
  let texW = mask.width
  let texH = mask.height
  const PIXEL_CSS = 5 // block size in CSS px

  const resize = (w: number, h: number, dpr: number) => {
    width = Math.max(1, w)
    height = Math.max(1, h)
    // The effect is soft by nature — capped resolution keeps it cheap
    const ratio = Math.min(dpr, 1.5)
    renderer.setPixelRatio(ratio)
    renderer.setSize(width, height, false)
    renderer.getDrawingBufferSize(material.uniforms.uRes.value)
    material.uniforms.uPixel.value = Math.max(2, Math.round(PIXEL_CSS * ratio))
  }

  return {
    resize,

    /**
     * @param dir    trail direction and length, in CSS px (screen space, y down)
     * @param amt    0..1 trail growth (0 clears)
     * @param phase  0..1 heartbeat front position along the trail
     * @param kick   heartbeat spring displacement (blocks jiggle with it)
     * @param meltPx radius (CSS px) over which the glyph edge dissolves into pixels
     */
    render(dir: { x: number; y: number }, amt: number, phase: number, time: number, kick = 0, meltPx = 0) {
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
      if (mask.width !== texW || mask.height !== texH) {
        texture.dispose()
        texW = mask.width
        texH = mask.height
      }
      texture.needsUpdate = true
      material.uniforms.uDir.value.set(dir.x / width, -dir.y / height)
      material.uniforms.uAmt.value = amt
      material.uniforms.uPhase.value = phase
      material.uniforms.uTime.value = time
      material.uniforms.uKick.value = kick
      material.uniforms.uMelt.value.set(meltPx / width, meltPx / height)
      renderer.render(scene, camera)
    },

    dispose() {
      texture.dispose()
      material.dispose()
      quad.geometry.dispose()
      renderer.dispose()
    },
  }
}

export type EchoFx = ReturnType<typeof createEchoFx>
