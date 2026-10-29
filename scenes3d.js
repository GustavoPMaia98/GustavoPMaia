/* 3D scenes (Three.js, self-hosted in vendor/, loaded only when needed):

   1. Background: inside a protosolar nebula: a 3D model of a young disk (flared,
      with rings and gaps, temperature colours and dark dust), seen from within
      its outer layer, looking in at the protostar. Material orbits at Keplerian
      speed and dust slowly gathers into parent bodies. Replaces the star field.
   2. "Where I have been": an interactive Earth (NASA Blue Marble colour map) with the places from
      script.js (window.SiteGlobeData) and arcs along the career path. Replaces
      the Leaflet map and its external map tiles.

   Fallbacks: no WebGL -> the old star field / a plain list of places;
   "reduce motion" -> one still frame, no animation. Both scenes pause when not
   visible. */
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
   1. BACKGROUND: inside a protosolar nebula
   A 3D model of a young protoplanetary disk: a thick, flared disk of gas and
   dust, denser towards the protostar, with bright rings and dark gaps in the
   inner region and a soft outer edge. Colour follows temperature (white near
   the star, then gold, orange and red-brown) and dark dust clumps add texture.
   The camera sits inside the flared outer layer, slightly above the midplane,
   orbiting with the disk (co-rotating frame) and looking in at the star: the
   material shears past at Keplerian speed (omega ~ r^-1.5) and dust slowly
   gathers into a few parent bodies.
   ========================================================================= */
const R0 = 9.5;                // the observer's orbital radius
const K = 1.2;                 // Keplerian constant: omega(r) = K r^-1.5 (rad/s)
const OMEGA0 = K * Math.pow(R0, -1.5);
const dOmega = r => K * Math.pow(r, -1.5) - OMEGA0;     // angular speed seen from the co-rotating camera
const GAPS = [[1.9, 0.16], [3.1, 0.2], [4.6, 0.26]];  // radius, width
const RINGS = [[1.35, 0.1], [2.5, 0.13], [3.8, 0.17]];
const BODIES = [{ r: 6.2, a: 0.32 }, { r: 7.4, a: -0.2 }, { r: 5.4, a: -0.45 }];
const CYCLE = 90;              // seconds per formation cycle
const gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 0.8;
const profile = r => Math.pow(r, -0.55)
  * GAPS.reduce((f, [g, w]) => f * (1 - 0.95 * Math.exp(-(((r - g) / w) ** 2))), 1)
  * (r > 10 ? Math.exp(-((r - 10) ** 2) / 3) : 1);
function sampleR() {           // radius drawn from the disk's surface-density profile
  for (;;) {
    const r = 0.3 + 12.5 * Math.random();
    if (Math.random() * 1.9 < profile(r)) return r;
  }
}

async function startDisk() {
  if (!hasWebGL()) return;                         // keep the 2D star field
  const THREE = await loadThree();
  const canvas = document.createElement("canvas");
  canvas.id = "space3d";
  canvas.setAttribute("aria-hidden", "true");
  document.body.insertBefore(canvas, document.body.firstChild);
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "low-power" }); }
  catch (e) { canvas.remove(); return; }
  root.classList.add("has-space3d");               // hides and stops the 2D star field

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 200);
  const lookAt = new THREE.Vector3();
  const PHONE = small();

  // ---- particles: glowing gas/dust (additive) and dark dust clumps (absorbing) ----
  function cloud(n, make) {
    const r = new Float32Array(n), th = new Float32Array(n), y = new Float32Array(n), size = new Float32Array(n),
          seed = new Float32Array(n), body = new Float32Array(n), off = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const p = make(i);
      r[i] = p.r; th[i] = p.th; y[i] = p.y; size[i] = p.size; seed[i] = Math.random();
      let b = -1;
      if (p.capturable) BODIES.forEach((B, k) => { if (Math.abs(p.r - B.r) < 0.3 && Math.random() < 0.5) b = k; });
      body[i] = b;
      const v = new THREE.Vector3().randomDirection().multiplyScalar(0.1 + Math.random() * 0.2);
      off[i * 3] = v.x; off[i * 3 + 1] = v.y * 0.5; off[i * 3 + 2] = v.z;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));   // unused, required
    [["aR", r, 1], ["aTh", th, 1], ["aY", y, 1], ["aSize", size, 1], ["aSeed", seed, 1], ["aBody", body, 1], ["aOff", off, 3]]
      .forEach(([k, v, s]) => g.setAttribute(k, new THREE.BufferAttribute(v, s)));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40);
    return g;
  }
  const flare = r => 0.085 * Math.pow(r, 1.3);      // scale height: the disk thickens outwards
  const NG = PHONE ? 7000 : 18000, ND = PHONE ? 900 : 2600;
  const glowGeo = cloud(NG, i => {
    let r;
    const ring = i % 5 === 0 ? RINGS[i % 3] : null;     // bright rings in the inner disk
    r = ring ? Math.max(0.3, ring[0] + gauss() * ring[1]) : sampleR();
    const outer = r > 5;
    return { r, th: Math.random() * Math.PI * 2, y: gauss() * flare(r) * (ring ? 0.35 : 1),
             size: outer ? 0.2 + Math.random() * 0.7 : 0.025 + Math.random() * 0.08 * (0.4 + r / 4), capturable: true };
  });
  const darkGeo = cloud(ND, () => {                // fluffy absorbing dust in the outer nebula
    const r = 4.5 + 8 * Math.pow(Math.random(), 0.8);
    return { r, th: Math.random() * Math.PI * 2, y: gauss() * flare(r) * 1.3, size: 0.5 + Math.random() * 1.3, capturable: false };
  });

  const U = {
    uTime: { value: 0 }, uP: { value: 0 }, uK: { value: K }, uR0: { value: R0 }, uScale: { value: 600 }, uFade: { value: 1 },
    uB: { value: BODIES.map(B => new THREE.Vector3(B.r, B.a, 0)) },
    uC0: { value: new THREE.Color() }, uC1: { value: new THREE.Color() }, uC2: { value: new THREE.Color() },
    uC3: { value: new THREE.Color() }, uDark: { value: new THREE.Color() },
    uGlowA: { value: 1 }, uDarkA: { value: 1 }
  };
  const VERT = `
    uniform float uTime, uK, uR0, uP, uScale; uniform vec3 uB[3];
    attribute float aR, aTh, aY, aSize, aSeed, aBody; attribute vec3 aOff;
    varying float vR, vSeed, vNear;
    float dw(float r){ return uK * (pow(r, -1.5) - pow(uR0, -1.5)); }
    vec3 orbit(float r, float th, float y){ return vec3(r * sin(th), y, r * cos(th)); }
    void main(){
      vec3 p = orbit(aR, aTh + dw(aR) * uTime, aY);
      float cap = 0.0;
      if (aBody > -0.5) {                            // dust gathering into a parent body
        int k = int(aBody + 0.5);
        vec3 B = k == 0 ? uB[0] : (k == 1 ? uB[1] : uB[2]);
        vec3 body = orbit(B.x, B.y + dw(B.x) * uTime, 0.0);
        cap = smoothstep(0.0, 1.0, uP * (0.5 + 0.5 * aSeed));
        p = mix(p, body + aOff * mix(1.0, 0.25, uP), cap);
      }
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      float depth = -mv.z;
      vR = aR; vSeed = aSeed;
      vNear = smoothstep(0.4, 3.0, depth);          // fade material brushing the camera
      gl_PointSize = clamp(aSize * mix(1.0, 0.35, cap) * uScale / depth, 0.0, 180.0);
      gl_Position = projectionMatrix * mv;
    }`;
  const glowMat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexShader: VERT,
    fragmentShader: `
      uniform vec3 uC0, uC1, uC2, uC3; uniform float uGlowA, uFade;
      varying float vR, vSeed, vNear;
      void main(){
        float d = length(gl_PointCoord - 0.5) * 2.0;
        if (d > 1.0) discard;
        float a = exp(-d * d * 3.2);
        // temperature: white near the star, gold, orange, red-brown far out
        vec3 col = mix(uC0, uC1, smoothstep(0.3, 2.2, vR));
        col = mix(col, uC2, smoothstep(2.2, 5.0, vR));
        col = mix(col, uC3, smoothstep(5.0, 10.5, vR) * (0.7 + 0.3 * vSeed));
        float lum = 0.3 + 0.6 / (1.0 + 0.12 * vR * vR);  // lit by the star
        float inner = mix(1.7, 1.0, smoothstep(1.0, 5.0, vR));   // small, crisp grains trace the inner rings
        gl_FragColor = vec4(col * lum, a * uGlowA * inner * uFade * vNear * (0.55 + 0.45 * vSeed));
      }`
  });
  const darkMat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.NormalBlending, vertexShader: VERT,
    fragmentShader: `
      uniform vec3 uDark; uniform float uDarkA, uFade; varying float vSeed, vNear;
      void main(){
        vec2 q = gl_PointCoord - 0.5;
        float d = length(q * vec2(1.0, 1.6)) * 2.0;    // flattened clumps
        if (d > 1.0) discard;
        float a = exp(-d * d * 2.6) * (0.6 + 0.4 * sin(vSeed * 40.0 + q.x * 9.0));
        gl_FragColor = vec4(uDark, max(a, 0.0) * uDarkA * uFade * vNear);
      }`
  });
  const glow = new THREE.Points(glowGeo, glowMat);
  const dark = new THREE.Points(darkGeo, darkMat);
  glow.renderOrder = 1; dark.renderOrder = 2;
  scene.add(glow, dark);

  // ---- distant stars ----
  const S = PHONE ? 350 : 800, sp = new Float32Array(S * 3), ss = new Float32Array(S);
  for (let i = 0; i < S; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(90);
    sp[i * 3] = v.x; sp[i * 3 + 1] = v.y; sp[i * 3 + 2] = v.z; ss[i] = Math.random();
  }
  const starsGeo = new THREE.BufferGeometry();
  starsGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  starsGeo.setAttribute("aSeed", new THREE.BufferAttribute(ss, 1));
  const starsMat = new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime, uA: { value: 1 } }, transparent: true, depthWrite: false,
    vertexShader: `uniform float uTime; attribute float aSeed; varying float vA;
      void main(){ vA = 0.3 + 0.7 * (0.5 + 0.5 * sin(uTime * (0.3 + aSeed) + aSeed * 40.0)) * aSeed;
        gl_PointSize = 0.8 + 1.4 * aSeed; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uA; varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vec3(0.9, 0.92, 1.0), vA * uA * (1.0 - 2.0 * d)); }`
  });
  const stars = new THREE.Points(starsGeo, starsMat); stars.renderOrder = 0;
  scene.add(stars);

  // ---- the protostar: white core, warm halo and soft rays ----
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
  const starU = { uFade: U.uFade, uTime: U.uTime, uCore: { value: new THREE.Color() }, uHalo: { value: new THREE.Color() }, uA: { value: 1 }, uPx: { value: 1 } };
  const starMat = new THREE.ShaderMaterial({
    uniforms: starU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uPx; void main(){ gl_PointSize = 460.0 * uPx; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 uCore, uHalo; uniform float uA, uFade, uTime;
      void main(){ vec2 q = (gl_PointCoord - 0.5) * 2.0; float d = length(q);
        float core = exp(-d * d * 300.0) * 1.4;
        float halo = exp(-d * 8.0) * 0.6 + exp(-d * 3.0) * 0.14;
        float ang = atan(q.y, q.x);
        float rays = pow(abs(cos(ang * 6.0 + 0.3)), 40.0) * exp(-d * 5.0) * 0.35 * (0.85 + 0.15 * sin(uTime * 0.7));
        vec3 col = uCore * core + uHalo * (halo + rays);
        gl_FragColor = vec4(col, clamp(core + halo + rays, 0.0, 1.0) * uA * mix(0.8, 1.0, uFade)); }`
  });
  const star = new THREE.Points(starGeo, starMat); star.renderOrder = 3;
  scene.add(star);

  // ---- parent bodies: lumpy rocks lit by the star ----
  const rockGeo = new THREE.IcosahedronGeometry(1, 3);
  const rp = rockGeo.attributes.position;
  for (let i = 0; i < rp.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(rp, i);
    v.multiplyScalar(0.8 + 0.28 * Math.abs(Math.sin(v.x * 3.3) * Math.cos(v.y * 2.6 + v.z * 1.7)) + 0.06 * Math.sin(v.z * 9.0));
    rp.setXYZ(i, v.x, v.y, v.z);
  }
  rockGeo.computeVertexNormals();
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x8c7b6b, transparent: true });
  const rocks = BODIES.map(() => { const m = new THREE.Mesh(rockGeo, rockMat); m.renderOrder = 2; scene.add(m); return m; });
  scene.add(new THREE.PointLight(0xffe0b0, 90, 0, 1.4));
  const amb = new THREE.AmbientLight(0x6a5a4a, 0.4);
  scene.add(amb);

  function colours() {
    const L = light();
    U.uC0.value.set(0xfff8ef);                     // white-hot inner disk
    U.uC1.value.set(0xffc690);                     // gold
    U.uC2.value.set(0xf4a04e);                     // orange
    U.uC3.value.set(0xb35a32);                     // red-brown outer nebula
    U.uDark.value.set(L ? 0x6b4a32 : 0x1a0d06);
    U.uGlowA.value = L ? 0.08 : 0.2;
    U.uDarkA.value = L ? 0.05 : 0.24;
    glowMat.blending = L ? THREE.NormalBlending : THREE.AdditiveBlending;
    starsMat.uniforms.uA.value = L ? 0.0 : 0.85;
    starU.uCore.value.set(0xffffff);
    starU.uHalo.value.set(L ? 0xf59e0b : 0xffd9a0);
    starU.uA.value = L ? 0.75 : 1.0;
    starMat.blending = L ? THREE.NormalBlending : THREE.AdditiveBlending;
    rockMat.color.set(L ? 0x6b5a4a : 0x9a8774);
    glowMat.needsUpdate = starMat.needsUpdate = true;
  }
  colours();
  onThemeChange(() => { colours(); if (reduced) draw(60); });

  // ---- framing: the star to the right of the intro on wide screens, near the top on phones ----
  function layout() {
    const w = innerWidth, h = innerHeight;
    renderer.setPixelRatio(1);                      // a soft background: full resolution is not needed
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < h ? 64 : 50;
    camera.updateProjectionMatrix();
    U.uScale.value = h / (2 * Math.tan(camera.fov * Math.PI / 360));
    starU.uPx.value = Math.min(1.2, Math.max(0.7, h / 850));
    if (w < 700) lookAt.set(-0.4, -1.4, 0);
    else lookAt.set(-Math.min(5.4, 2.2 + w / 470), 0.1, 0);
  }
  layout();
  addEventListener("resize", () => { layout(); if (reduced) draw(60); }, { passive: true });

  let mx = 0, my = 0;
  if (!PHONE) addEventListener("pointermove", e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
  const ease = x => x * x * (3 - 2 * x);
  function draw(t) {
    const c = (t % CYCLE) / CYCLE;
    const p = ease(Math.min(1, Math.max(0, (c - 0.06) / 0.6))) * (1 - ease(Math.min(1, Math.max(0, (c - 0.88) / 0.12))));
    U.uTime.value = t; U.uP.value = p;
    const sc = Math.min(1, scrollY / (innerHeight * 1.3));
    U.uFade.value = 1 - 0.55 * sc;                 // quieter further down the page
    rockMat.opacity = 0.35 + 0.65 * U.uFade.value;
    // camera: inside the flared outer layer, a little above the midplane
    camera.position.set(mx * 0.4, 2.8 - my * 0.15 + sc * 0.5, R0);
    camera.lookAt(lookAt);
    camera.rotateZ(PHONE ? 0.05 : 0.09);
    BODIES.forEach((B, k) => {
      const th = B.a + dOmega(B.r) * t;
      rocks[k].position.set(B.r * Math.sin(th), 0, B.r * Math.cos(th));
      rocks[k].scale.setScalar(0.012 + 0.08 * p * (0.8 + 0.1 * k));
      rocks[k].rotation.set(t * 0.21 + k, t * 0.13, k * 0.7);
      rocks[k].visible = p > 0.02;
    });
    renderer.render(scene, camera);
  }
  if (reduced) { draw(60); addEventListener("scroll", () => draw(60), { passive: true }); return; }
  let raf = 0; const t0 = performance.now() - 25000;
  const loop = now => { draw((now - t0) / 1000); raf = requestAnimationFrame(loop); };
  const start = () => { if (!raf) raf = requestAnimationFrame(loop); };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());
  start();
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
startDisk().catch(() => root.classList.remove("has-space3d"));

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
