/* 3D scene (Three.js, self-hosted in vendor/, loaded only when needed):

   "Where I have been": an interactive Earth (NASA Blue Marble colour map) with the places from
      script.js (window.SiteGlobeData) and arcs along the career path. Replaces
      the Leaflet map and its external map tiles.

   Fallbacks: no WebGL -> a plain list of places; "reduce motion" -> one still
   frame, no animation. The globe pauses when not visible. */
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
