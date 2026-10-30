/* 3D scenes (Three.js, self-hosted in vendor/, loaded only when needed):

   1. Background (dark theme): the universe behind the page: realistic stars, the
      Milky Way, distant galaxies, nearby stars drifting past and detailed meteors.
   2. "Where I have been": an interactive Earth (NASA Blue Marble colour map) with the places from
      script.js (window.SiteGlobeData) and arcs along the career path. Replaces
      the Leaflet map and its external map tiles.

   Fallbacks: no WebGL -> the 2D star field / a plain list of places; "reduce
   motion" -> one still frame, no animation. Both scenes pause when not visible. */
const THREE_URL = "./vendor/three-0.160.0.module.min.js";
let threeP = null;
const loadThree = () => threeP || (threeP = import(THREE_URL));

const root = document.documentElement;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const small = () => innerWidth < 700;
const light = () => root.getAttribute("data-theme") === "light";
function hasWebGL() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); }
  catch (e) { return false; }
}
const onThemeChange = fn => new MutationObserver(fn).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

/* =========================================================================
   1. BACKGROUND: the universe behind the page (dark theme)
   The page floats in empty space. Behind it:
   - stars as they look outside an atmosphere: steady points (no twinkling),
     brightness from a magnitude distribution (many faint, few bright) and
     colour from their temperature (blue-white O/B ... orange-red K/M), the
     brightest with faint diffraction spikes;
   - the Milky Way: a band of unresolved stars with clumps, dark dust lanes and
     a warmer bulge towards the galactic centre; a few faint distant galaxies;
   - nearby stars in depth that drift past slowly (and with scrolling), so the
     page seems to float forward through space;
   - meteors: each with an entry speed (11-72 km/s) that sets its apparent
     speed, length and colour (fast: Mg/O blue-green; slow: Na/Fe yellow-orange,
     a few Ca violet), a light curve that rises and fades as it ablates, the odd
     terminal flare and, for bright ones, a lingering green train; sometimes a
     small shower diverging from one radiant.
   In the light theme the 2D star field of script.js is used instead.
   ========================================================================= */
const KM_S = [11, 72];
async function startSpace() {
  if (!hasWebGL()) return;                          // keep the 2D star field
  const THREE = await loadThree();
  const canvas = document.createElement("canvas");
  canvas.id = "space3d";
  canvas.setAttribute("aria-hidden", "true");
  document.body.insertBefore(canvas, document.body.firstChild);
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "low-power" }); }
  catch (e) { canvas.remove(); return; }
  renderer.autoClear = false;
  renderer.setClearColor(0x02040a, 1);
  const PHONE = small();

  // ---- the sky: stars, Milky Way and galaxies, all far away ----
  const sky = new THREE.Scene(), skyRig = new THREE.Group();
  sky.add(skyRig);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 3000);
  const G = new THREE.Vector3(-0.5, 0.866, 0).normalize();              // galactic north pole
  const C = new THREE.Vector3(0.52, 0.3, -0.8).projectOnPlane(G).normalize(); // galactic centre, in view
  const E2 = new THREE.Vector3().crossVectors(G, C);
  const gauss = () => { let s = 0; for (let i = 0; i < 4; i++) s += Math.random(); return (s - 2) / 0.58; };
  function kelvin(T) {                              // black body -> RGB (approximation), then pastel
    const t = T / 100;
    let r = t <= 66 ? 255 : 329.7 * Math.pow(t - 60, -0.133);
    let g = t <= 66 ? 99.47 * Math.log(t) - 161.1 : 288.1 * Math.pow(t - 60, -0.0755);
    let b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5 * Math.log(t - 10) - 305;
    const c = [r, g, b].map(v => Math.min(255, Math.max(0, v)) / 255);
    return c.map(v => 0.72 * v + 0.28 * Math.max(...c));
  }
  const TEMPS = [[28000, .04], [15000, .08], [9800, .16], [7300, .2], [5900, .24], [4700, .18], [3600, .1]];
  const pickT = () => { let u = Math.random(); for (const [T, w] of TEMPS) { if ((u -= w) < 0) return T * (0.92 + Math.random() * 0.16); } return 5800; };

  const NS = PHONE ? 4500 : 11000;
  const sp = new Float32Array(NS * 3), sc = new Float32Array(NS * 3), ss = new Float32Array(NS), sk = new Float32Array(NS);
  const v = new THREE.Vector3();
  for (let i = 0; i < NS; i++) {
    if (Math.random() < 0.5) {                     // stars crowding towards the galactic plane
      const th = Math.random() * Math.PI * 2, b = gauss() * 0.13;
      v.copy(C).multiplyScalar(Math.cos(th)).addScaledVector(E2, Math.sin(th)).multiplyScalar(Math.cos(b)).addScaledVector(G, Math.sin(b));
    } else v.randomDirection();
    v.multiplyScalar(1200);
    sp.set([v.x, v.y, v.z], i * 3);
    const f = Math.pow(Math.random(), 7.5);         // flux: many faint stars, few bright ones
    const col = kelvin(pickT()), k = 0.3 + 1.2 * Math.sqrt(f);
    sc.set(col.map(x => x * k), i * 3);
    ss[i] = 1.6 + 5.2 * Math.pow(f, 0.55);
    sk[i] = f > 0.45 ? Math.min(1, (f - 0.45) * 2.5) : 0;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  starGeo.setAttribute("aColor", new THREE.BufferAttribute(sc, 3));
  starGeo.setAttribute("aSize", new THREE.BufferAttribute(ss, 1));
  starGeo.setAttribute("aSpike", new THREE.BufferAttribute(sk, 1));
  const U = { uPx: { value: 1 }, uTravel: { value: 0 }, uFade: { value: 1 } };
  const starMat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uPx; attribute vec3 aColor; attribute float aSize, aSpike; varying vec3 vC; varying float vS;
      void main(){ vC = aColor; vS = aSpike; gl_PointSize = aSize * uPx * (1.0 + 2.2 * aSpike);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 vC; varying float vS;
      void main(){ vec2 q = gl_PointCoord - 0.5; float r = length(q) * 2.0;
        float s = 1.0 + 2.2 * vS;                       // the sprite is bigger for stars with spikes
        float rr = r * s;
        float a = exp(-rr * rr * 7.0) + 0.18 * exp(-rr * 3.2);
        a += vS * 0.55 * (exp(-abs(q.x) * 140.0) * exp(-abs(q.y) * 6.0) + exp(-abs(q.y) * 140.0) * exp(-abs(q.x) * 6.0));
        if (a < 0.004) discard;
        gl_FragColor = vec4(vC, a); }`
  });
  skyRig.add(new THREE.Points(starGeo, starMat));

  // the Milky Way: unresolved starlight with clumps and dark dust lanes
  const NOISE = `
    float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
    float fbm(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * n3(p); p = p * 2.03 + 1.7; a *= 0.5; } return s; }`;
  const mwMat = new THREE.ShaderMaterial({
    uniforms: { uG: { value: G }, uC: { value: C }, uI: { value: PHONE ? 0.8 : 1 } },
    side: THREE.BackSide, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: NOISE + `
      uniform vec3 uG, uC; uniform float uI; varying vec3 vD;
      void main(){
        vec3 n = normalize(vD);
        float b = asin(clamp(dot(n, uG), -1.0, 1.0));
        float band = exp(-pow(b / 0.24, 2.0));
        float core = exp(-pow(acos(clamp(dot(n, uC), -1.0, 1.0)) / 0.55, 2.0));
        float clouds = fbm(n * 7.0);
        float fine = fbm(n * 22.0 + 4.0);
        float lane = smoothstep(0.42, 0.72, fbm(n * 10.0 + 9.0)) * exp(-pow(b / 0.06, 2.0));   // dust
        float I = band * (0.35 + 0.9 * clouds * clouds + 0.35 * fine) * (1.0 - 0.85 * lane) * (0.6 + 1.6 * core);
        I += 0.05 * fbm(n * 3.0 + 2.0);                // faint light all over the sky
        vec3 col = mix(vec3(0.55, 0.62, 0.82), vec3(1.0, 0.82, 0.62), clamp(core * 1.3, 0.0, 1.0));
        col = mix(col, vec3(0.95, 0.55, 0.65), 0.18 * smoothstep(0.55, 0.8, fine) * band);  // a touch of H-alpha
        gl_FragColor = vec4(col, 1.0) * (I * 0.26 * uI); }`
  });
  // drawn once into a cube map (the noise is costly), then shown as a cheap texture
  const mwRT = new THREE.WebGLCubeRenderTarget(PHONE ? 384 : 768, { type: THREE.HalfFloatType });
  const mwScene = new THREE.Scene();
  mwScene.add(new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 32), mwMat));
  renderer.setClearColor(0x000000, 0);
  new THREE.CubeCamera(1, 3000, mwRT).update(renderer, mwScene);
  renderer.setClearColor(0x02040a, 1);
  mwMat.dispose();
  skyRig.add(new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 24), new THREE.ShaderMaterial({
    uniforms: { uCube: { value: mwRT.texture } }, side: THREE.BackSide, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform samplerCube uCube; varying vec3 vD;
      void main(){ vec3 d = normalize(vD); gl_FragColor = textureCube(uCube, d); }`
  })));

  // a few distant galaxies: faint, tilted ellipses with a bright core
  const NG = 16, gp = new Float32Array(NG * 3), ga = new Float32Array(NG * 3);
  for (let i = 0; i < NG; i++) {
    do v.randomDirection(); while (Math.abs(v.dot(G)) < 0.3);          // away from the dusty plane
    v.multiplyScalar(1100); gp.set([v.x, v.y, v.z], i * 3);
    ga.set([Math.random() * Math.PI, 0.25 + Math.random() * 0.6, 8 + Math.random() * 18], i * 3);
  }
  const galGeo = new THREE.BufferGeometry();
  galGeo.setAttribute("position", new THREE.BufferAttribute(gp, 3));
  galGeo.setAttribute("aG", new THREE.BufferAttribute(ga, 3));
  skyRig.add(new THREE.Points(galGeo, new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uPx; attribute vec3 aG; varying vec3 vG;
      void main(){ vG = aG; gl_PointSize = aG.z * uPx; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 vG;
      void main(){ vec2 q = (gl_PointCoord - 0.5) * 2.0; float c = cos(vG.x), s = sin(vG.x);
        q = vec2(c * q.x - s * q.y, (s * q.x + c * q.y) / vG.y); float r = length(q);
        float a = exp(-r * r * 30.0) * 0.9 + exp(-r * 4.5) * 0.28; if (r > 1.0) a *= 1.0 - smoothstep(1.0, 1.4, r);
        gl_FragColor = vec4(vec3(0.95, 0.9, 0.85), a * 0.55); }`
  })));

  // ---- nearby stars in depth: drift past slowly (forward motion through space) ----
  const NN = PHONE ? 500 : 1300, DEPTH = 420;
  const np = new Float32Array(NN * 3), nc = new Float32Array(NN * 3);
  for (let i = 0; i < NN; i++) {
    np.set([(Math.random() - 0.5) * 520, (Math.random() - 0.5) * 340, -Math.random() * DEPTH], i * 3);
    nc.set(kelvin(pickT()), i * 3);
  }
  const nearGeo = new THREE.BufferGeometry();
  nearGeo.setAttribute("position", new THREE.BufferAttribute(np, 3));
  nearGeo.setAttribute("aColor", new THREE.BufferAttribute(nc, 3));
  const near = new THREE.Points(nearGeo, new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uPx, uTravel; attribute vec3 aColor; varying vec3 vC; varying float vA;
      void main(){ vec3 p = position; p.z = mod(p.z + uTravel, ${DEPTH}.0) - ${DEPTH}.0;
        float d = -p.z; vA = smoothstep(${DEPTH}.0, ${DEPTH * 0.6}.0, d) * smoothstep(4.0, 40.0, d);
        vC = aColor; vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = clamp(260.0 / d, 1.2, 4.5) * uPx; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vC; varying float vA;
      void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; float a = exp(-r * r * 6.0) * vA * 0.85;
        if (a < 0.004) discard; gl_FragColor = vec4(vC, a); }`
  }));
  sky.add(near);

  // ---- meteors, drawn in screen space over the sky ----
  const overlay = new THREE.Scene();
  const ortho = new THREE.OrthographicCamera(0, 1, 0, 1, -1, 1);   // pixels, y down
  const MAXM = 8, SEG = 44, VPM = (SEG + 1) * 2;
  const mPos = new Float32Array(MAXM * VPM * 3), mCol = new Float32Array(MAXM * VPM * 4), mSide = new Float32Array(MAXM * VPM);
  const idx = [];
  for (let m = 0; m < MAXM; m++) for (let k = 0; k < SEG; k++) {
    const a = m * VPM + k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  for (let i = 0; i < MAXM * VPM; i++) mSide[i] = i % 2 ? 1 : -1;
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute("position", new THREE.BufferAttribute(mPos, 3).setUsage(THREE.DynamicDrawUsage));
  trailGeo.setAttribute("aCol", new THREE.BufferAttribute(mCol, 4).setUsage(THREE.DynamicDrawUsage));
  trailGeo.setAttribute("aSide", new THREE.BufferAttribute(mSide, 1));
  trailGeo.setIndex(idx);
  const trails = new THREE.Mesh(trailGeo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `attribute vec4 aCol; attribute float aSide; varying vec4 vC; varying float vS;
      void main(){ vC = aCol; vS = aSide; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec4 vC; varying float vS;
      void main(){ float e = 1.0 - vS * vS; gl_FragColor = vec4(vC.rgb, vC.a * e * e); }`
  }));
  trails.frustumCulled = false;
  const hPos = new Float32Array(MAXM * 3), hCol = new Float32Array(MAXM * 4), hSize = new Float32Array(MAXM);
  const headGeo = new THREE.BufferGeometry();
  headGeo.setAttribute("position", new THREE.BufferAttribute(hPos, 3).setUsage(THREE.DynamicDrawUsage));
  headGeo.setAttribute("aCol", new THREE.BufferAttribute(hCol, 4).setUsage(THREE.DynamicDrawUsage));
  headGeo.setAttribute("aSize", new THREE.BufferAttribute(hSize, 1).setUsage(THREE.DynamicDrawUsage));
  const heads = new THREE.Points(headGeo, new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uPx; attribute vec4 aCol; attribute float aSize; varying vec4 vC;
      void main(){ vC = aCol; gl_PointSize = aSize * uPx; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec4 vC;
      void main(){ float r = length(gl_PointCoord - 0.5) * 2.0;
        float core = exp(-r * r * 22.0), glow = exp(-r * 3.5) * 0.45;
        gl_FragColor = vec4(mix(vC.rgb, vec3(1.0), core * 0.7), (core + glow) * vC.a); }`
  }));
  heads.frustumCulled = false;
  overlay.add(trails, heads);

  const meteors = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  function colourFor(kms) {                          // emission of the main elements
    if (Math.random() < 0.08) return { head: [0.85, 0.75, 1.0], tail: [0.75, 0.55, 1.0] };     // calcium: violet
    if (kms > 50) return { head: [0.75, 1.0, 0.88], tail: [0.45, 1.0, 0.6] };                  // magnesium/oxygen
    if (kms < 25) return { head: [1.0, 0.86, 0.55], tail: [1.0, 0.55, 0.28] };                 // sodium/iron
    return { head: [1.0, 0.97, 0.88], tail: [1.0, 0.72, 0.42] };
  }
  let W = 1, H = 1;
  function spawn(radiant, now) {
    if (meteors.length >= MAXM) return;
    const kms = rnd(KM_S[0], KM_S[1]);
    const unit = Math.min(W, H) / 900;
    const vpx = (180 + 1250 * (kms - KM_S[0]) / (KM_S[1] - KM_S[0])) * unit * rnd(0.85, 1.15);
    const dur = Math.max(0.3, 1.45 - 0.95 * (kms - KM_S[0]) / (KM_S[1] - KM_S[0]) + rnd(-0.15, 0.25));
    const sx = rnd(0.05, 0.95) * W, sy = rnd(0.02, 0.6) * H;
    let dx, dy;
    if (radiant) { dx = sx - radiant[0]; dy = sy - radiant[1]; }
    else { const a = rnd(0.15, 1.1) * (Math.random() < 0.5 ? 1 : -1); dx = Math.sin(a); dy = Math.cos(a) * 0.9 + 0.1; }
    const l = Math.hypot(dx, dy) || 1;
    meteors.push({ t0: now, sx, sy, dx: dx / l, dy: dy / l, v: vpx, dur, kms, col: colourFor(kms),
      peak: Math.pow(Math.random(), 1.6) * 0.8 + 0.25, flare: Math.random() < 0.25 ? rnd(0.5, 1.3) : 0, flareU: rnd(0.6, 0.9),
      train: 0, width: rnd(1.4, 2.6) * Math.max(0.8, unit) });
    const m = meteors[meteors.length - 1];
    m.train = m.peak > 0.75 ? rnd(0.5, 1) : 0;
  }
  const lightCurve = (m, u) => u < 0 || u > 1 ? 0 :
    m.peak * (Math.pow(Math.sin(Math.PI * u), 0.75) + m.flare * Math.exp(-Math.pow((u - m.flareU) / 0.05, 2)));
  const TAU = 0.22, TRAIL = 0.5;
  function updateMeteors(now) {
    mCol.fill(0); hCol.fill(0);
    for (let i = meteors.length - 1; i >= 0; i--) if (now - meteors[i].t0 > meteors[i].dur + 3) meteors.splice(i, 1);
    meteors.forEach((m, mi) => {
      const t = now - m.t0, th = Math.min(t, m.dur);
      const nx = -m.dy, ny = m.dx;
      for (let k = 0; k <= SEG; k++) {
        const tk = th - (k / SEG) * TRAIL * (m.train ? 2.2 : 1);
        const age = t - tk;
        const L = tk < 0 ? 0 : lightCurve(m, tk / m.dur);
        const fade = Math.exp(-age / TAU) + m.train * 0.16 * Math.exp(-age / 1.6);
        const a = Math.min(1, L * fade) * (1 - Math.pow(k / SEG, 3));
        const px = m.sx + m.dx * m.v * Math.max(0, tk), py = m.sy + m.dy * m.v * Math.max(0, tk);
        const w = m.width * (0.4 + 1.1 * L) * (1 - 0.6 * k / SEG) * (1 + m.train * Math.max(0, age - 0.2) * 2.5);
        const mix = Math.min(1, k / SEG * 1.4 + age * 0.8), tr = m.train * Math.min(1, Math.max(0, age - 0.25));
        const base = mi * VPM + k * 2;
        for (let s = 0; s < 2; s++) {
          const o = s ? 1 : -1, j = base + s;
          mPos[j * 3] = px + nx * w * o; mPos[j * 3 + 1] = py + ny * w * o; mPos[j * 3 + 2] = 0;
          for (let c = 0; c < 3; c++) {
            const col = m.col.head[c] * (1 - mix) + m.col.tail[c] * mix;
            mCol[j * 4 + c] = col * (1 - tr) + [0.45, 1.0, 0.55][c] * tr;     // the lingering train glows green
          }
          mCol[j * 4 + 3] = a * 0.85;
        }
      }
      const Lh = t <= m.dur ? lightCurve(m, t / m.dur) : 0;
      hPos.set([m.sx + m.dx * m.v * th, m.sy + m.dy * m.v * th, 0], mi * 3);
      hCol.set([...m.col.head, Math.min(1, Lh)], mi * 4);
      hSize[mi] = (5 + 13 * Lh) * Math.max(0.8, Math.min(W, H) / 900);
    });
    trailGeo.attributes.position.needsUpdate = trailGeo.attributes.aCol.needsUpdate = true;
    headGeo.attributes.position.needsUpdate = headGeo.attributes.aCol.needsUpdate = headGeo.attributes.aSize.needsUpdate = true;
  }
  let nextAt = 2 + Math.random() * 4;
  function schedule(now) {
    if (now < nextAt) return;
    if (Math.random() < 0.18 || schedule.force) {     // a small shower from one radiant
      schedule.force = false;
      const r = [rnd(0.1, 0.9) * W, -rnd(0.1, 0.5) * H], n = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) setTimeout(() => spawn(r, clock), i * rnd(250, 700));
    } else spawn(null, now);
    nextAt = now + (-Math.log(1 - Math.random())) * (PHONE ? 9 : 6.5) + 1.5;    // random (Poisson) arrivals
  }

  function layout() {
    W = innerWidth; H = innerHeight;
    const pr = Math.min(devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(pr);
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    ortho.right = W; ortho.bottom = H; ortho.updateProjectionMatrix();
    U.uPx.value = pr;
  }
  layout();
  addEventListener("resize", () => { layout(); if (reduced) draw(0); }, { passive: true });

  let mx = 0, my = 0, clock = 0;
  if (!PHONE) addEventListener("pointermove", e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
  function draw(t) {
    const sc = scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight);
    skyRig.rotation.set(0.0006 * t * 0.3 + sc * 0.12 - my * 0.02, 0.0009 * t + sc * 0.35 - mx * 0.03, 0);   // the sky turns slowly
    near.rotation.set(skyRig.rotation.x * 0.3, skyRig.rotation.y * 0.3, 0);
    U.uTravel.value = t * 3.2 + scrollY * 0.06;      // drifting forward, faster while scrolling
    renderer.clear();
    renderer.render(sky, camera);
    if (!reduced) { schedule(t); updateMeteors(t); renderer.render(overlay, ortho); }
  }

  // ---- dark theme only: the light theme keeps the 2D star field ----
  let raf = 0, t0 = performance.now();
  const loop = now => { clock = (now - t0) / 1000; draw(clock); raf = requestAnimationFrame(loop); };
  const run = () => { if (!raf && !reduced && !document.hidden && !light()) raf = requestAnimationFrame(loop); };
  const halt = () => { cancelAnimationFrame(raf); raf = 0; };
  function theme() {
    const on = !light();
    canvas.style.display = on ? "" : "none";
    root.classList.toggle("has-space3d", on);         // hides and stops the 2D star field
    if (on) { if (reduced) draw(30); else run(); }
    else { halt(); window.dispatchEvent(new Event("site:starfield")); }
  }
  // try it from the browser console: SiteSpace.meteor() or SiteSpace.shower()
  window.SiteSpace = { meteor: () => spawn(null, clock), shower: () => { nextAt = 0; schedule.force = true; } };
  onThemeChange(theme);
  document.addEventListener("visibilitychange", () => document.hidden ? halt() : run());
  if (reduced) addEventListener("scroll", () => { if (!light()) draw(30); }, { passive: true });
  theme();
}

/* =========================================================================
   2. GLOBE ("Where I have been")
   ========================================================================= */
function lang() { return root.getAttribute("lang") || "en"; }
const TEXT = {
  hint: { en: "Drag to rotate · pinch or Ctrl + scroll to zoom", pt: "Arraste para rodar · aperte ou Ctrl + roda para ampliar",
          fr: "Glissez pour tourner · pincez ou Ctrl + molette pour zoomer", ja: "ドラッグで回転 · ピンチまたは Ctrl + スクロールで拡大" },
  reset: { en: "Reset view", pt: "Repor vista", fr: "Réinitialiser la vue", ja: "表示をリセット" }
};
const tt = k => TEXT[k][lang()] || TEXT[k].en;

function fallbackList(el, data) {
  el.classList.add("globe-fallback");
  el.innerHTML = '<ul class="globe-list">' + data.places.map(p =>
    '<li><span class="dot" style="background:' + p.color + '"></span>' + p.html(lang()) + "</li>").join("") + "</ul>";
}

async function startGlobe(el, data) {
  if (!hasWebGL()) { fallbackList(el, data); return; }
  const THREE = await loadThree();
  el.classList.add("globe");
  el.innerHTML = "";
  const canvas = document.createElement("canvas");
  canvas.className = "globe-canvas";
  el.appendChild(canvas);
  const legend = document.createElement("div"); legend.className = "map-legend globe-legend"; el.appendChild(legend);
  const hint = document.createElement("div"); hint.className = "globe-hint"; el.appendChild(hint);
  const reset = document.createElement("button"); reset.type = "button"; reset.className = "map-reset globe-reset"; reset.textContent = "⌖"; el.appendChild(reset);
  const tip = document.createElement("div"); tip.className = "globe-tip"; tip.hidden = true; tip.setAttribute("role", "status"); el.appendChild(tip);
  const list = document.createElement("ul"); list.className = "sr-only"; el.appendChild(list);   // for screen readers
  function texts() {
    legend.innerHTML = data.legendHTML(lang());
    hint.textContent = tt("hint");
    reset.title = tt("reset"); reset.setAttribute("aria-label", tt("reset"));
    list.innerHTML = data.places.map(p => "<li>" + p.html(lang()) + "</li>").join("");
    if (!tip.hidden && tip.__place) tip.innerHTML = tip.__place.html(lang());
  }
  texts();
  window.addEventListener("site:lang", texts);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  const HOME_Z = small() ? 3.25 : 4.1;              // phones: the globe fills more of the width
  camera.position.set(0, 0, HOME_Z);
  const globe = new THREE.Group(); scene.add(globe);

  const vec = (lat, lng, r = 1) => {
    const phi = (90 - lat) * Math.PI / 180, th = (lng + 180) * Math.PI / 180;
    return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
  };

  // the Earth in colour: NASA Blue Marble, with relief shading and shiny oceans
  const tex = new THREE.TextureLoader();
  const load = url => new Promise(res => tex.load(url, res, undefined, () => res(null)));
  const [day, bump, water] = await Promise.all([
    load(small() ? "images/earth/earth-2k.webp" : "images/earth/earth-4k.webp"),     // 4K on large screens
    load("images/earth/earth-bump.webp"), load("images/earth/earth-water.webp")]);
  const aniso = renderer.capabilities.getMaxAnisotropy();
  [day, bump, water].forEach(t => { if (t) t.anisotropy = aniso; });
  if (day) day.colorSpace = THREE.SRGBColorSpace;
  const earthMat = new THREE.MeshPhongMaterial({
    map: day, bumpMap: bump, bumpScale: 0.012, specularMap: water,
    specular: new THREE.Color(0x335577), shininess: 18
  });
  const ocean = new THREE.Mesh(new THREE.SphereGeometry(1, 160, 120), earthMat);
  globe.add(ocean);
  scene.add(new THREE.AmbientLight(0xffffff, 1.15));
  const sunLight = new THREE.DirectionalLight(0xffffff, 1.6);
  sunLight.position.set(-2.5, 1.6, 3);                // lit from the front-left, like a day-side view
  scene.add(sunLight);
  // atmosphere: a thin shell lit by the same light as the Earth, so it is bright on
  // the day side and fades towards the night side (it reads as a 3D layer), plus a
  // faint haze over the edge of the disc
  const lightView = new THREE.Vector3(-2.5, 1.6, 3).normalize();   // camera never rotates: view = world
  const atmoU = { uRim: { value: new THREE.Color() }, uA: { value: 0.9 }, uL: { value: lightView } };
  const atmoVS = `varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix * normal);
      vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`;
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.022, 128, 96), new THREE.ShaderMaterial({
    uniforms: atmoU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: atmoVS,
    fragmentShader: `uniform vec3 uRim; uniform float uA; uniform vec3 uL; varying vec3 vN; varying vec3 vV;
      void main(){ float rim = 1.0 - abs(dot(vN, vV));
        float lit = 0.18 + 0.82 * smoothstep(-0.25, 0.6, dot(vN, uL));
        gl_FragColor = vec4(uRim, pow(rim, 5.5) * lit * uA); }`
  }));
  scene.add(atmo);
  const haze = new THREE.Mesh(new THREE.SphereGeometry(1.002, 128, 96), new THREE.ShaderMaterial({
    uniforms: atmoU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: atmoVS,
    fragmentShader: `uniform vec3 uRim; uniform float uA; uniform vec3 uL; varying vec3 vN; varying vec3 vV;
      void main(){ float rim = 1.0 - max(dot(vN, vV), 0.0);
        float lit = 0.15 + 0.85 * smoothstep(-0.2, 0.7, dot(vN, uL));
        gl_FragColor = vec4(uRim, pow(rim, 2.6) * 0.32 * lit * uA); }`
  }));
  scene.add(haze);

  // places: one marker per location (entries at the same place share it)
  const groups = new Map();
  data.places.forEach(p => {
    const k = p.lat.toFixed(3) + "," + p.lng.toFixed(3);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(p);
  });
  const hits = [], halos = [];
  groups.forEach(entries => {
    const p0 = entries[0];
    const where = vec(p0.lat, p0.lng, 1.008);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.017, 16, 12), new THREE.MeshBasicMaterial({ color: p0.color }));
    dot.position.copy(where); globe.add(dot);
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.024, 0.032, 32),
      new THREE.MeshBasicMaterial({ color: p0.color, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
    halo.position.copy(where); halo.lookAt(where.clone().multiplyScalar(2)); globe.add(halo); halos.push(halo);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.copy(where);
    hit.userData.place = { html: l => entries.map(e => e.html(l)).join('<hr class="globe-tip-sep">') };
    globe.add(hit); hits.push(hit);
  });

  // arcs along the career path, drawn in once, then a light travels along them
  const arcMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9 });
  const arcs = [];
  for (let i = 0; i < data.path.length - 1; i++) {
    const a = vec(data.path[i].lat, data.path[i].lng, 1.005), b = vec(data.path[i + 1].lat, data.path[i + 1].lng, 1.005);
    const ang = a.angleTo(b);
    const lift = 1.005 + Math.min(0.45, 0.04 + ang * 0.42);
    const mid = a.clone().add(b).normalize().multiplyScalar(lift);
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const tube = new THREE.TubeGeometry(curve, 64, ang > 0.2 ? 0.0045 : 0.003, 6, false);
    const mesh = new THREE.Mesh(tube, arcMat); mesh.geometry.setDrawRange(0, 0);
    globe.add(mesh); arcs.push({ curve, mesh, total: tube.index.count });
  }
  const spark = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  globe.add(spark);

  function colours() {
    const L = light();
    atmoU.uRim.value.set(L ? 0x6cb4ff : 0x7cc8ff);
    atmoU.uA.value = L ? 0.75 : 1.0;
    arcMat.color.set(0xfbbf24);
  }
  colours();
  onThemeChange(colours);

  // view: start centred between the US east coast and Europe
  const HOME = { lat: 34, lng: -36 };
  const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  function aim(lat, lng) {
    const v = vec(lat, lng);
    const b = Math.atan2(-v.x, v.z);
    const zp = -v.x * Math.sin(b) + v.z * Math.cos(b);
    target.y = b; target.x = Math.atan2(v.y, zp);
  }
  globe.rotation.order = "XYZ";
  aim(HOME.lat, HOME.lng); cur.x = target.x; cur.y = target.y;
  let zoom = HOME_Z, zoomTarget = HOME_Z;
  reset.addEventListener("click", () => { aim(HOME.lat, HOME.lng); zoomTarget = HOME_Z; unpin(); });

  // buttons under the globe: turn to each place and open its details
  const bar = document.createElement("div");
  bar.className = "globe-places";
  el.insertAdjacentElement("afterend", bar);
  let pinnedHit = null;
  function unpin() { pinnedHit = null; tip.hidden = true; tip.__pinned = false; bar.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", "false")); }
  function flyTo(c, btn) {
    aim(c.lat, c.lng); zoomTarget = small() ? 2.55 : 3.1; idleSince = performance.now() + 60000;
    pinnedHit = hits.reduce((best, h) => {               // the marker nearest to this place
      const d = h.position.distanceTo(vec(c.lat, c.lng, 1.008));
      return !best || d < best.d ? { h, d } : best;
    }, null).h;
    tip.__place = pinnedHit.userData.place; tip.__pinned = true;
    tip.innerHTML = tip.__place.html(lang()); tip.hidden = false;
    bar.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b === btn)));
  }
  function buttons() {
    bar.innerHTML = "";
    (data.cities || []).forEach(c => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "globe-place"; b.setAttribute("aria-pressed", "false");
      b.innerHTML = '<span class="dot" style="background:' + c.color + '"></span>' + c.name(lang());
      b.addEventListener("click", () => flyTo(c, b));
      bar.appendChild(b);
    });
  }
  buttons();
  window.addEventListener("site:lang", buttons);
  if (small()) { legend.classList.add("globe-legend--below"); bar.insertAdjacentElement("beforebegin", legend); }   // phones: legend under the globe

  // interaction: drag to rotate, pinch / ctrl+wheel to zoom, keys, hover/tap for details
  let drag = null, idleSince = 0;
  const pointers = new Map();
  canvas.addEventListener("pointerdown", e => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    drag = { x: e.clientX, y: e.clientY, moved: 0 };
  });
  canvas.addEventListener("pointermove", e => {
    if (pointers.has(e.pointerId)) {
      const prev = pointers.get(e.pointerId);
      if (pointers.size === 2) {
        const [p1, p2] = [...pointers.values()];
        const before = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const [q1, q2] = [...pointers.values()];
        const after = Math.hypot(q1.x - q2.x, q1.y - q2.y);
        zoomTarget = Math.min(6, Math.max(1.9, zoomTarget * before / Math.max(after, 1)));
        return;
      }
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      target.y += dx * 0.006 * (zoom / HOME_Z);
      target.x = Math.max(-1.2, Math.min(1.2, target.x + dy * 0.006 * (zoom / HOME_Z)));
      if (drag) drag.moved += Math.abs(dx) + Math.abs(dy);
      idleSince = performance.now();
    } else hover(e);
  });
  const up = e => {
    pointers.delete(e.pointerId);
    if (drag && drag.moved < 6) hover(e, true);           // a tap shows the details
    drag = null;
  };
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("pointerleave", () => { if (!tip.__pinned) tip.hidden = true; });
  canvas.addEventListener("wheel", e => {
    if (!e.ctrlKey && !e.metaKey) return;                  // plain scrolling keeps scrolling the page
    e.preventDefault();
    zoomTarget = Math.min(6, Math.max(2.1, zoomTarget * (1 + Math.sign(e.deltaY) * 0.12)));
  }, { passive: false });
  el.tabIndex = 0;
  el.addEventListener("keydown", e => {
    const step = { ArrowLeft: [0, -0.15], ArrowRight: [0, 0.15], ArrowUp: [-0.15, 0], ArrowDown: [0.15, 0] }[e.key];
    if (step) { e.preventDefault(); target.x = Math.max(-1.2, Math.min(1.2, target.x + step[0])); target.y += step[1]; }
    if (e.key === "+" || e.key === "=") zoomTarget = Math.max(2.1, zoomTarget * 0.88);
    if (e.key === "-") zoomTarget = Math.min(6, zoomTarget * 1.12);
  });
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function hover(e, tap) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects([...hits, ocean], false)[0];
    const place = hit && hit.object !== ocean && hit.object.userData.place;
    canvas.style.cursor = place ? "pointer" : "grab";
    if (!place) { if (tap) unpin(); else if (!tip.__pinned) tip.hidden = true; return; }
    if (tap) { pinnedHit = hit.object; tip.__pinned = true; }
    else if (tip.__pinned) return;                       // a pinned card stays until another tap
    tip.__place = place;
    tip.innerHTML = place.html(lang());
    tip.hidden = false;
    const x = Math.min(r.width - 250, Math.max(8, e.clientX - r.left + 14));
    const y = Math.min(r.height - tip.offsetHeight - 8, Math.max(8, e.clientY - r.top + 14));
    tip.style.left = x + "px"; tip.style.top = y + "px";
  }

  // render loop (only while the globe is on screen)
  function layout() {
    const w = el.clientWidth, h = el.clientHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < h ? 42 : 35;
    camera.updateProjectionMatrix();
  }
  layout();
  addEventListener("resize", layout, { passive: true });
  const t0 = performance.now();
  let raf = 0;
  function frame(now) {
    const t = (now - t0) / 1000;
    if (!reduced && !pointers.size && now - idleSince > 4000) target.y += 0.0009;   // slow drift when idle
    cur.x += (target.x - cur.x) * 0.08; cur.y += (target.y - cur.y) * 0.08;
    zoom += (zoomTarget - zoom) * 0.1;
    globe.rotation.x = cur.x; globe.rotation.y = cur.y;
    camera.position.z = zoom;
    // arcs draw in one after another, then a light runs along the whole path
    const draw = reduced ? 1 : Math.min(1, t / 3.2);
    arcs.forEach((a, i) => {
      const seg = Math.min(1, Math.max(0, draw * arcs.length - i));
      a.mesh.geometry.setDrawRange(0, Math.floor(a.total * seg / 3) * 3);
    });
    if (draw >= 1 && !reduced) {
      const u = (t * 0.12) % 1, k = Math.min(arcs.length - 1, Math.floor(u * arcs.length));
      spark.visible = true; spark.position.copy(arcs[k].curve.getPoint(u * arcs.length - k));
    } else spark.visible = false;
    if (pinnedHit && !tip.hidden) {                      // keep the details card next to its marker
      const wp = pinnedHit.getWorldPosition(new THREE.Vector3());
      const facing = wp.clone().normalize().dot(camera.position.clone().normalize()) > 0.15;
      const sp = wp.project(camera);
      const w = el.clientWidth, h = el.clientHeight;
      tip.style.visibility = facing ? "visible" : "hidden";
      tip.style.left = Math.min(w - tip.offsetWidth - 8, Math.max(8, (sp.x + 1) / 2 * w + 16)) + "px";
      tip.style.top = Math.min(h - tip.offsetHeight - 8, Math.max(8, (1 - sp.y) / 2 * h - tip.offsetHeight / 2)) + "px";
    } else tip.style.visibility = "visible";
    halos.forEach((h, i) => { const s = 1 + 0.35 * Math.sin(t * 2.2 + i); h.scale.setScalar(reduced ? 1 : s); h.material.opacity = reduced ? 0.6 : 0.75 - 0.3 * s + 0.3; });
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  const start = () => { if (!raf) raf = requestAnimationFrame(frame); };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  let onScreen = true;
  new IntersectionObserver(es => { onScreen = es[0].isIntersecting; onScreen && !document.hidden ? start() : stop(); }).observe(el);
  document.addEventListener("visibilitychange", () => (onScreen && !document.hidden) ? start() : stop());
  start();
}

/* ---- start-up ---------------------------------------------------------- */
startSpace().catch(() => root.classList.remove("has-space3d"));

function whenGlobeNear(data) {
  const el = document.getElementById("presoMap");
  if (!el || el.dataset.globe) return;
  el.dataset.globe = "1";
  const io = new IntersectionObserver(es => {
    if (!es[0].isIntersecting) return;
    io.disconnect();
    startGlobe(el, data).catch(() => fallbackList(el, data));
  }, { rootMargin: "400px 0px" });
  io.observe(el);
}
if (window.SiteGlobeData) whenGlobeNear(window.SiteGlobeData);
window.addEventListener("site:globe-data", e => whenGlobeNear(e.detail));
