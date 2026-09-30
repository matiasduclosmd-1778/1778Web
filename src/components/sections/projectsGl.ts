import * as THREE from 'three'

// Works reel, loaded lazily by ProjectsReel.
//
// 1. Sheets: each project image is a finely subdivided plane in a row. The one centred on the
//    active rect is flat; as a plane moves away from the centre it folds back like paper, hinged on
//    the edge nearest the centre (radius keeps the sheet's length, so it rolls, not stretches).
//    Scroll speed adds to the curl and splits the colours along X. Out-of-scene sheets blur.
// 2. Title: the project name is drawn on a 2D canvas layer so it goes through the same post pass.
// 3. Liquid trail: the pointer paints velocity into a small self-advecting texture that fades out.
//    A final pass smears the whole reel (images, their silhouettes, the title) along that flow, and
//    where the trail is hottest turns it into a high-contrast heat map with split RGB.

const sheetVertex = /* glsl */ `
  uniform vec2 uSize;          // plane size before the curl, px
  uniform vec2 uPos;           // plane centre, px from the view centre (y up)
  uniform float uEdge;         // 0 centred → 1 a card width or more away
  uniform float uSide;         // -1 left of centre, 1 right
  uniform float uVel;          // smoothed scroll velocity, -1..1
  uniform float uVelWeight;    // how much of the velocity this plane takes (0 right at the centre)
  uniform float uCurlAmount;
  uniform float uRadius;
  uniform float uVelocityCurl;
  uniform float uWave;
  uniform float uMinScale;
  uniform float uTime;
  uniform float uPulse;        // heartbeat on hover (0 at rest)
  uniform float uReveal;       // entrance: 0 rolled up tight → 1 flat
  uniform float uRollAmount;   // how tight the roll is at the start (rad over the sheet)
  varying vec2 vUv;
  varying float vD;            // 0 at the hinge → 1 at the free edge
  varying float vAngle;
  void main() {
    vUv = uv;
    float scale = mix(1.0, uMinScale, uEdge) * (1.0 + uPulse);
    vec2 size = uSize * scale;
    float d = uSide > 0.0 ? uv.x : 1.0 - uv.x;
    vD = d;
    float unroll = 1.0 - uReveal;
    float curl = (uEdge + abs(uVel) * uVelocityCurl * uVelWeight) * uCurlAmount + unroll * unroll * uRollAmount;
    float angle = curl * d;
    vAngle = angle;
    float hinge = uPos.x - uSide * size.x * 0.5;
    float x;
    float z;
    if (curl > 1e-4) {
      // Arc whose length along the sheet matches the flat width (paper doesn't stretch)
      float r = uRadius * size.x / curl;
      x = hinge + uSide * sin(angle) * r;
      z = -(1.0 - cos(angle)) * r;
    } else {
      x = hinge + uSide * d * size.x;
      z = 0.0;
    }
    // Paper ripple along the height, only on sheets that are folding away
    z += sin(uv.y * 6.2831853 + uTime * 0.5) * uEdge * uWave * size.x * d;
    float y = uPos.y + (uv.y - 0.5) * size.y;
    gl_Position = projectionMatrix * viewMatrix * vec4(x, y, z, 1.0);
  }
`

const sheetFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uTex;
  uniform float uReady;
  uniform float uAspect;       // image aspect (w / h)
  uniform vec2 uSize;
  uniform float uHover;        // 0..1 — gentle push-in on hover
  uniform float uEdge;
  uniform float uSide;
  uniform float uVel;
  uniform float uRgbShift;
  uniform float uDarken;       // max darkening on the most folded part
  uniform float uOpacity;
  uniform float uBlur;         // max blur radius (uv) on sheets out of the scene
  uniform float uReveal;       // entrance: ink spreads over the sheet from its hinge
  uniform float uTime;
  varying vec2 vUv;
  varying float vD;
  varying float vAngle;

  vec2 cover(vec2 uv) {
    float plane = uSize.x / uSize.y;
    vec2 p = uv - 0.5;
    if (uAspect > plane) p.x *= plane / uAspect; else p.y *= uAspect / plane;
    return p / (1.0 + 0.07 * uHover) + 0.5;
  }

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    return vnoise(p) * 0.55 + vnoise(p * 2.1 + 3.7) * 0.3 + vnoise(p * 4.3 + 7.1) * 0.15;
  }
  // Same heat palette as the pointer trail: black → red → yellow → acid green
  vec3 thermal(float x) {
    x = clamp(x, 0.0, 1.0);
    vec3 c = mix(vec3(0.0), vec3(0.95, 0.05, 0.0), smoothstep(0.0, 0.35, x));
    c = mix(c, vec3(1.0, 0.92, 0.0), smoothstep(0.35, 0.7, x));
    c = mix(c, vec3(0.35, 1.0, 0.1), smoothstep(0.8, 1.0, x));
    return c;
  }

  vec3 split(vec2 uv, vec2 o) {
    return vec3(texture2D(uTex, uv + o).r, texture2D(uTex, uv).g, texture2D(uTex, uv - o).b);
  }

  void main() {
    vec2 uv = cover(vUv);
    float plane = uSize.x / uSize.y;
    // Entrance: ink spreads from the hinge along the sheet with a liquid, noisy front
    float field = vD * 0.75 + fbm(vUv * vec2(3.0, 2.2) + uTime * 0.12) * 0.35;
    float front = uReveal * 1.25;
    float ink = smoothstep(field - 0.015, field + 0.015, front);
    float edge = ink * (1.0 - smoothstep(0.0, 0.14, front - field)); // just behind the front
    vec3 col;
    if (uReady > 0.5) {
      // RGB split along X, stronger towards the folded edge; none on a sheet at rest in the centre
      float shift = (uEdge * 0.6 + abs(uVel)) * uRgbShift * uSide * vD + edge * 0.03 * uSide;
      vec2 o = vec2(shift, 0.0);
      // Out of the scene: blur that grows towards the folded edge. The branch is on uniforms only
      // (the whole sheet takes the same path), so there is no seam; the sheet in the scene skips
      // the 48 extra taps entirely
      if (uBlur * uEdge > 0.0002) {
        float br = uBlur * uEdge * smoothstep(0.0, 1.0, vD);
        col = split(uv, o) * 0.2;
        for (int k = 0; k < 8; k++) {
          float a = float(k) * 0.785398;
          vec2 d = vec2(cos(a), sin(a) * plane) * br;
          col += split(uv + d, o) * 0.07 + split(uv + d * 0.5, o) * 0.03;
        }
      } else {
        col = split(uv, o);
      }
    } else {
      col = vec3(0.06, 0.08, 0.08);
    }
    // Volume: the more a strip is folded away, the less light it catches
    col = mix(col, vec3(0.0), uDarken * smoothstep(0.0, 1.6, vAngle));
    // Title legibility: bottom of the image fades to rgba(0,0,0,.5)
    col = mix(col, vec3(0.0), 0.5 * smoothstep(0.55, 0.0, vUv.y));
    // The wet front of the ink runs hot, like the pointer trail
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, thermal(smoothstep(0.12, 0.9, lum) * 0.8 + edge * 0.35), edge);
    gl_FragColor = vec4(col, uOpacity * ink);
  }
`

const quadVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

// Pointer trail: velocity (xy) + heat (z), self-advected so it flows, fading every frame
const trailFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uPrev;
  uniform vec2 uPoint;         // pointer, uv
  uniform vec2 uForce;         // pointer velocity, uv per frame (scaled)
  uniform float uRadius;       // splat radius, share of the height
  uniform float uAspect;       // W / H
  uniform float uDecay;
  uniform float uAdvect;
  varying vec2 vUv;
  void main() {
    vec4 here = texture2D(uPrev, vUv);
    vec4 prev = texture2D(uPrev, vUv - here.xy * uAdvect);
    vec2 d = (vUv - uPoint) * vec2(uAspect, 1.0);
    float g = exp(-dot(d, d) / (uRadius * uRadius));
    vec2 vel = prev.xy * uDecay + uForce * g;
    float heat = prev.z * uDecay + g * min(1.0, length(uForce) * 18.0);
    gl_FragColor = vec4(clamp(vel, -1.0, 1.0), min(heat, 1.4), 1.0);
  }
`

const postFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uScene;    // sheets, premultiplied
  uniform sampler2D uText;     // title layer (straight alpha): a horizontal band, not the whole view
  uniform vec2 uTextBand;      // band bottom and height, in uv (y up)
  uniform sampler2D uTrail;
  uniform float uSmear;
  uniform float uCA;
  uniform float uHeat;
  varying vec2 vUv;

  vec4 layer(vec2 uv) {
    vec4 s = texture2D(uScene, uv);
    float ty = (uv.y - uTextBand.x) / uTextBand.y;
    vec4 t = ty > 0.0 && ty < 1.0 ? texture2D(uText, vec2(uv.x, ty)) : vec4(0.0);
    t.rgb *= t.a;
    return s * (1.0 - t.a) + t;
  }

  // Heat map: black → red → yellow → acid green
  vec3 thermal(float x) {
    x = clamp(x, 0.0, 1.0);
    vec3 c = mix(vec3(0.0), vec3(0.95, 0.05, 0.0), smoothstep(0.0, 0.35, x));
    c = mix(c, vec3(1.0, 0.92, 0.0), smoothstep(0.35, 0.7, x));
    c = mix(c, vec3(0.35, 1.0, 0.1), smoothstep(0.8, 1.0, x));
    return c;
  }

  void main() {
    vec4 tr = texture2D(uTrail, vUv);
    float heat = clamp(tr.z, 0.0, 1.0);
    // Smear: pull the picture back along the flow; each channel a little further (split RGB)
    vec2 disp = -tr.xy * uSmear;
    vec4 cr = layer(vUv + disp * (1.0 + uCA));
    vec4 cg = layer(vUv + disp);
    vec4 cb = layer(vUv + disp * (1.0 - uCA));
    float a = max(cg.a, max(cr.a, cb.a));
    vec3 col = vec3(cr.r, cg.g, cb.b);
    // Hot core: high-contrast heat map of the picture's own brightness, so its shapes still read
    float lum = dot(col, vec3(0.299, 0.587, 0.114)) / max(a, 1e-3);
    vec3 hot = thermal(smoothstep(0.12, 0.9, lum)) * a;
    col = mix(col, hot, smoothstep(0.3, 0.85, heat) * uHeat);
    gl_FragColor = vec4(col, a);
  }
`

/** Tunables (exposed in lil-gui in development) */
export const REEL_PARAMS = {
  uCurlAmount: 2.2,
  uRadius: 1.0,
  uWave: 0.08,
  uVelocityCurl: 0.5,
  uRgbShift: 0.004,
  darkenAmount: 0.4,
  minScale: 0.92,
  blur: 0.012,          // blur on sheets out of the scene (uv)
  pulse: 0.035,         // heartbeat size on hover
  rollAmount: 6.5,      // entrance: how tightly the sheet starts rolled (≈ a full turn)
  trailRadius: 0.075,   // pointer splat, share of the height
  trailDecay: 0.975,    // per frame
  smear: 0.09,          // how far the picture is dragged along the flow
  trailCA: 0.35,        // split RGB in the smear
  heat: 1.0,            // heat-map colour in the hot core
}

export interface ReelTitle {
  text: string
  /** Opacity 0..1 and horizontal offset, px */
  alpha: number
  x: number
}

export interface ReelFrame {
  /** Continuous project index under the camera (0 … n-1) */
  pos: number
  /** Active rect: centre (px, from the view centre, y up) and size */
  cx: number
  cy: number
  w: number
  h: number
  /** Distance between neighbouring plane centres, px */
  step: number
  /** Smoothed, normalised scroll velocity (-1..1) */
  vel: number
  /** Hover amount per image */
  hover: number[]
  /** Heartbeat per image (0 at rest) */
  pulse: number[]
  /** Entrance per image: 0 rolled up and dry → 1 flat and inked */
  reveal: number[]
  /** Entrance of the title layer, 0..1 */
  titleReveal: number
  time: number
  /** prefers-reduced-motion: no fold, no RGB, no trail — planes crossfade in place */
  reduced: boolean
  /** Titles to draw (the leaving one and the arriving one), centred on titleY (px from the top) */
  titles: ReelTitle[]
  titleY: number
  titleSize: number
  /** Title RGB ghost, px (± along X) */
  ghost: number
  /** Pointer in uv (y up) and its velocity in uv per frame; null when not over the reel */
  pointer: { x: number; y: number; vx: number; vy: number } | null
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

const TITLE_FONT = '"Geist", system-ui, sans-serif'
const TRAIL_SCALE = 0.25 // trail texture resolution, share of the canvas

export function createReel(canvas: HTMLCanvasElement, images: string[]) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setClearColor(0x000000, 0)
  renderer.autoClear = false
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(35, 1, 1, 20000)
  const geometry = new THREE.PlaneGeometry(1, 1, 64, 16)
  const loader = new THREE.TextureLoader()
  loader.setCrossOrigin('anonymous')

  // ── Sheets ───────────────────────────────────────────────────
  const meshes = images.map((src) => {
    const material = new THREE.ShaderMaterial({
      vertexShader: sheetVertex,
      fragmentShader: sheetFragment,
      transparent: true,
      side: THREE.DoubleSide,
      uniforms: {
        uTex: { value: null },
        uReady: { value: 0 },
        uAspect: { value: 1.6 },
        uSize: { value: new THREE.Vector2(1, 1) },
        uPos: { value: new THREE.Vector2(0, 0) },
        uEdge: { value: 0 },
        uSide: { value: 1 },
        uVel: { value: 0 },
        uVelWeight: { value: 0 },
        uHover: { value: 0 },
        uTime: { value: 0 },
        uOpacity: { value: 1 },
        uPulse: { value: 0 },
        uReveal: { value: 0 },
        uRollAmount: { value: REEL_PARAMS.rollAmount },
        uBlur: { value: REEL_PARAMS.blur },
        uCurlAmount: { value: REEL_PARAMS.uCurlAmount },
        uRadius: { value: REEL_PARAMS.uRadius },
        uWave: { value: REEL_PARAMS.uWave },
        uVelocityCurl: { value: REEL_PARAMS.uVelocityCurl },
        uRgbShift: { value: REEL_PARAMS.uRgbShift },
        uDarken: { value: REEL_PARAMS.darkenAmount },
        uMinScale: { value: REEL_PARAMS.minScale },
      },
    })
    loader.load(src, (tex) => {
      // Raw sRGB in, raw sRGB out: the shaders don't convert, so the photo shows exactly as it is
      tex.generateMipmaps = true
      tex.minFilter = THREE.LinearMipmapLinearFilter
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy()
      material.uniforms.uTex.value = tex
      material.uniforms.uAspect.value = tex.image.width / tex.image.height
      material.uniforms.uReady.value = 1
    })
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)
    return mesh
  })

  // ── Title layer ──────────────────────────────────────────────
  const textCanvas = document.createElement('canvas')
  const textCtx = textCanvas.getContext('2d')!
  const textTex = new THREE.CanvasTexture(textCanvas)
  let lastTitleKey = ''

  // ── Render targets ───────────────────────────────────────────
  const sceneRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType })
  const trailOpts = { type: THREE.HalfFloatType, depthBuffer: false }
  let trailA = new THREE.WebGLRenderTarget(1, 1, trailOpts)
  let trailB = new THREE.WebGLRenderTarget(1, 1, trailOpts)

  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const quadGeo = new THREE.PlaneGeometry(2, 2)
  const trailMat = new THREE.ShaderMaterial({
    vertexShader: quadVertex,
    fragmentShader: trailFragment,
    uniforms: {
      uPrev: { value: null },
      uPoint: { value: new THREE.Vector2(-9, -9) },
      uForce: { value: new THREE.Vector2(0, 0) },
      uRadius: { value: REEL_PARAMS.trailRadius },
      uAspect: { value: 1 },
      uDecay: { value: REEL_PARAMS.trailDecay },
      uAdvect: { value: 0.012 },
    },
  })
  const postMat = new THREE.ShaderMaterial({
    vertexShader: quadVertex,
    fragmentShader: postFragment,
    transparent: true,
    blending: THREE.NoBlending,
    uniforms: {
      uScene: { value: sceneRT.texture },
      uText: { value: textTex },
      uTextBand: { value: new THREE.Vector2(0, 1) },
      uTrail: { value: null },
      uSmear: { value: REEL_PARAMS.smear },
      uCA: { value: REEL_PARAMS.trailCA },
      uHeat: { value: REEL_PARAMS.heat },
    },
  })
  const trailScene = new THREE.Scene()
  trailScene.add(new THREE.Mesh(quadGeo, trailMat))
  const postScene = new THREE.Scene()
  postScene.add(new THREE.Mesh(quadGeo, postMat))

  let W = 1
  let H = 1
  let DPR = 1

  // Compile every program now (the reel is created while the camera is still on the logos screen),
  // not on the first frame of the Works entrance
  renderer.compile(scene, camera)
  renderer.compile(trailScene, quadCam)
  renderer.compile(postScene, quadCam)

  const drawTitles = (f: ReelFrame) => {
    const tr = Math.min(1, Math.max(0, f.titleReveal))
    // The ghost follows the scroll speed: rounded to 0.25 px so it doesn't redraw for invisible changes
    const ghost = Math.round(f.ghost * 4) / 4
    const key = JSON.stringify([f.titles, f.titleY, f.titleSize, ghost, tr.toFixed(3), W, H])
    if (key === lastTitleKey) return
    lastTitleKey = key
    // Only a band around the title is drawn and uploaded (a full-view canvas was ~20 MB per frame
    // while the ghost moved)
    const bandTop = f.titleY - f.titleSize
    const bandH = f.titleSize * 2
    const cw = Math.round(W * DPR)
    const ch = Math.max(1, Math.round(bandH * DPR))
    if (textCanvas.width !== cw || textCanvas.height !== ch) {
      textCanvas.width = cw
      textCanvas.height = ch
      textTex.dispose() // new size → new GPU storage
    }
    ;(postMat.uniforms.uTextBand.value as THREE.Vector2).set(1 - (bandTop + bandH) / H, bandH / H)
    const ctx = textCtx
    ctx.setTransform(DPR, 0, 0, DPR, 0, -bandTop * DPR)
    ctx.clearRect(0, bandTop, W, bandH)
    ctx.font = `700 ${f.titleSize}px ${TITLE_FONT}`
    ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${-0.02 * f.titleSize}px`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const t of f.titles) {
      if (t.alpha * tr <= 0.01) continue
      const x = W / 2 + t.x
      const text = t.text.toUpperCase()
      // Entrance: the name rises a little as it fades in, once its image has inked in
      const y = f.titleY + (1 - tr) * f.titleSize * 0.35
      const alpha = t.alpha * tr
      // Ghost: red / cyan copies along X with the scroll speed
      if (ghost !== 0) {
        ctx.globalAlpha = alpha * 0.75
        ctx.fillStyle = 'rgb(255,40,60)'
        ctx.fillText(text, x + ghost, y)
        ctx.fillStyle = 'rgb(0,230,255)'
        ctx.fillText(text, x - ghost, y)
      }
      ctx.globalAlpha = alpha
      ctx.fillStyle = '#ffffff'
      ctx.fillText(text, x, y)
    }
    ctx.globalAlpha = 1
    textTex.needsUpdate = true
  }

  return {
    resize(w: number, h: number, dpr: number) {
      W = w
      H = h
      // Phones: 1.5× reads the same on photos and saves ~45% of the fill-rate
      DPR = Math.min(dpr, window.matchMedia('(pointer: coarse)').matches ? 1.5 : 2)
      renderer.setPixelRatio(DPR)
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      // 1 world unit = 1 CSS px on the z = 0 plane
      camera.position.z = h / 2 / Math.tan((camera.fov * Math.PI) / 360)
      camera.updateProjectionMatrix()
      const pw = Math.round(w * DPR)
      const ph = Math.round(h * DPR)
      sceneRT.setSize(pw, ph)
      const tw = Math.max(1, Math.round(pw * TRAIL_SCALE))
      const th = Math.max(1, Math.round(ph * TRAIL_SCALE))
      trailA.setSize(tw, th)
      trailB.setSize(tw, th)
      lastTitleKey = ''
    },
    render(f: ReelFrame) {
      // Sheets → scene target
      meshes.forEach((mesh, i) => {
        const u = (mesh.material as THREE.ShaderMaterial).uniforms
        const off = (i - f.pos) * f.step
        const dist = Math.abs(off) / f.w
        if (f.reduced) {
          mesh.visible = dist < f.step / f.w
          u.uPos.value.set(f.cx, f.cy)
          u.uEdge.value = 0
          u.uVel.value = 0
          u.uRgbShift.value = 0
          u.uOpacity.value = Math.max(0, 1 - Math.abs(i - f.pos))
        } else {
          mesh.visible = dist < 3
          u.uPos.value.set(f.cx + off, f.cy)
          u.uEdge.value = smoothstep(0, 1, dist)
          u.uVel.value = f.vel
          u.uOpacity.value = 1
          u.uRgbShift.value = REEL_PARAMS.uRgbShift
        }
        // The sheet in front always unrolls left → right on its entrance (reading direction); its
        // fold side is otherwise undecided right at the centre
        const entering = (f.reveal[i] ?? 1) < 0.999
        u.uSide.value = entering && dist < 0.15 ? 1 : off >= 0 ? 1 : -1
        // Right at the centre the fold side is undecided: velocity bends a sheet only off-centre
        u.uVelWeight.value = smoothstep(0, 0.15, dist)
        u.uSize.value.set(f.w, f.h)
        u.uHover.value = f.hover[i] ?? 0
        u.uPulse.value = (f.pulse[i] ?? 0) * REEL_PARAMS.pulse * (f.reduced ? 0 : 1)
        u.uReveal.value = f.reveal[i] ?? 1
        u.uRollAmount.value = f.reduced ? 0 : REEL_PARAMS.rollAmount
        u.uTime.value = f.time
        u.uBlur.value = REEL_PARAMS.blur
        u.uCurlAmount.value = REEL_PARAMS.uCurlAmount
        u.uRadius.value = REEL_PARAMS.uRadius
        u.uWave.value = REEL_PARAMS.uWave
        u.uVelocityCurl.value = REEL_PARAMS.uVelocityCurl
        u.uDarken.value = REEL_PARAMS.darkenAmount
        u.uMinScale.value = REEL_PARAMS.minScale
      })
      renderer.setRenderTarget(sceneRT)
      renderer.clear()
      renderer.render(scene, camera)

      // Title layer
      drawTitles(f)

      // Trail: advect + fade + splat the pointer
      const tu = trailMat.uniforms
      const ptr = f.reduced ? null : f.pointer
      tu.uPrev.value = trailA.texture
      tu.uAspect.value = W / H
      tu.uRadius.value = REEL_PARAMS.trailRadius
      tu.uDecay.value = REEL_PARAMS.trailDecay
      if (ptr) {
        tu.uPoint.value.set(ptr.x, ptr.y)
        tu.uForce.value.set(ptr.vx * 12, ptr.vy * 12)
      } else {
        tu.uPoint.value.set(-9, -9)
        tu.uForce.value.set(0, 0)
      }
      renderer.setRenderTarget(trailB)
      renderer.render(trailScene, quadCam)
      ;[trailA, trailB] = [trailB, trailA]

      // Post: smear + heat map → screen
      const pu = postMat.uniforms
      pu.uTrail.value = trailA.texture
      pu.uSmear.value = REEL_PARAMS.smear
      pu.uCA.value = REEL_PARAMS.trailCA
      pu.uHeat.value = REEL_PARAMS.heat
      renderer.setRenderTarget(null)
      renderer.clear()
      renderer.render(postScene, quadCam)
    },
    clear() {
      renderer.setRenderTarget(null)
      renderer.clear()
    },
    /** Redraw the title layer on the next frame (e.g. once the web font has loaded) */
    invalidateText() {
      lastTitleKey = ''
    },
    dispose() {
      meshes.forEach((m) => {
        const mat = m.material as THREE.ShaderMaterial
        mat.uniforms.uTex.value?.dispose()
        mat.dispose()
      })
      geometry.dispose()
      quadGeo.dispose()
      trailMat.dispose()
      postMat.dispose()
      textTex.dispose()
      sceneRT.dispose()
      trailA.dispose()
      trailB.dispose()
      renderer.dispose()
    },
    get size() { return { W, H } },
  }
}

export type Reel = ReturnType<typeof createReel>
