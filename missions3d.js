/* =====================================================================
   missions3d.js: "Sample-return missions", a 3D inner Solar System (Three.js,
   self-hosted) with the asteroids and the comet that missions brought samples
   back from (data/missions.json). Orbits come from their orbital elements and
   move with time (positions approximate); distances are compressed so the
   inner planets and Jupiter fit together. Drag to turn; pick a mission to read
   about it. Loaded only when the section comes near the screen, paused when it
   is not visible; "reduce motion" shows one still frame.
   ===================================================================== */
const stage = document.getElementById("msStage");
if (stage && !stage.__wired) {
  stage.__wired = true;
  const canvas = document.getElementById("msCanvas"), labels = document.getElementById("msLabels");
  const tabs = document.getElementById("msTabs"), card = document.getElementById("msCard");
  const dateEl = document.getElementById("msDate"), playBtn = document.getElementById("msPlay");
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lang = () => { const l = root.getAttribute("lang"); return ["pt", "fr", "ja"].includes(l) ? l : "en"; };
  const tx = v => (v && typeof v === "object" ? (v[lang()] || v.en) : v) || "";
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const NAMES = { Mercury: { fr: "Mercure", ja: "水星" }, Venus: { fr: "Vénus", ja: "金星" }, Earth: { fr: "Terre", ja: "地球" }, Mars: { fr: "Mars", ja: "火星" }, Jupiter: { fr: "Jupiter", ja: "木星" }, Sun: { pt: "Sol", fr: "Soleil", ja: "太陽" } };
  const pname = n => (n.en && NAMES[n.en] && NAMES[n.en][lang()]) || tx(n);
  const L = {
    target: { en: "Target", pt: "Alvo", fr: "Cible", ja: "目標" }, launch: { en: "Launched", pt: "Lançamento", fr: "Lancement", ja: "打ち上げ" },
    back: { en: "Sample landed", pt: "Amostra na Terra", fr: "Retour de l'échantillon", ja: "試料の帰還" }, sample: { en: "Sample", pt: "Amostra", fr: "Échantillon", ja: "試料" },
    found: { en: "What it found", pt: "O que revelou", fr: "Ce qu'il a révélé", ja: "わかったこと" }, why: { en: "Why it matters for my research", pt: "Porque importa para a minha investigação", fr: "Pourquoi c'est important pour mes recherches", ja: "私の研究との関係" },
    more: { en: "Mission page", pt: "Página da missão", fr: "Page de la mission", ja: "ミッションのページ" }
  };
  const lt = k => L[k][lang()] || L[k].en;

  let data = null, sel = 0;
  function renderCard() {
    if (!data) return;
    const m = data.missions[sel];
    tabs.querySelectorAll(".ms-tab").forEach((b, i) => { b.setAttribute("aria-selected", i === sel ? "true" : "false"); b.tabIndex = i === sel ? 0 : -1; });
    card.innerHTML = '<p class="ms-agency">' + esc(m.agency) + '</p><h3 class="ms-title">' + esc(m.mission) + "</h3>" +
      '<dl class="ms-facts"><div><dt>' + lt("target") + "</dt><dd>" + esc(tx(m.target)) + "</dd></div>" +
      "<div><dt>" + lt("launch") + "</dt><dd>" + esc(m.launch) + "</dd></div>" +
      "<div><dt>" + lt("back") + "</dt><dd>" + esc(tx(m.returned)) + "</dd></div>" +
      "<div><dt>" + lt("sample") + "</dt><dd>" + esc(tx(m.sample)) + "</dd></div></dl>" +
      '<h4 class="ms-h">' + lt("found") + "</h4><p>" + esc(tx(m.found)) + "</p>" +
      '<h4 class="ms-h">' + lt("why") + "</h4><p>" + esc(tx(m.why)) + "</p>" +
      '<a class="ms-link" href="' + esc(m.url) + '" target="_blank" rel="noopener noreferrer">' + lt("more") + " ↗</a>";
    if (scene) scene.select(sel);
  }
  function renderTabs() {
    tabs.innerHTML = data.missions.map((m, i) => '<button type="button" class="ms-tab" role="tab" id="ms-tab-' + i + '" aria-controls="msCard" data-i="' + i + '">' +
      '<span class="ms-tab-m">' + esc(m.mission) + '</span><span class="ms-tab-t">' + esc(m.body.name) + "</span></button>").join("");
    card.setAttribute("aria-labelledby", "ms-tab-0");
  }
  tabs.addEventListener("click", e => { const b = e.target.closest(".ms-tab"); if (!b) return; sel = +b.dataset.i; card.setAttribute("aria-labelledby", b.id); renderCard(); });
  tabs.addEventListener("keydown", e => {
    if (!data || !/^Arrow(Left|Right|Up|Down)$/.test(e.key)) return;
    e.preventDefault(); sel = (sel + (/Right|Down/.test(e.key) ? 1 : -1) + data.missions.length) % data.missions.length;
    renderCard(); tabs.querySelectorAll(".ms-tab")[sel].focus();
  });
  new MutationObserver(() => { renderCard(); if (scene) scene.relabel(); }).observe(root, { attributes: true, attributeFilter: ["lang"] });

  // ------------------------------------------------------------------ orbits
  const J2000 = Date.UTC(2000, 0, 1, 12);
  const RAD = Math.PI / 180;
  function kepler(o, days) {           // heliocentric ecliptic position (AU)
    const n = 0.9856076686 / Math.pow(o.a, 1.5);       // deg/day
    let M = ((o.M0 + n * days) % 360) * RAD, E = M;
    for (let k = 0; k < 8; k++) E = E - (E - o.e * Math.sin(E) - M) / (1 - o.e * Math.cos(E));
    const xp = o.a * (Math.cos(E) - o.e), yp = o.a * Math.sqrt(1 - o.e * o.e) * Math.sin(E);
    return rotate(o, xp, yp);
  }
  function rotate(o, xp, yp) {
    const w = o.peri * RAD, N = o.node * RAD, i = o.i * RAD;
    const cw = Math.cos(w), sw = Math.sin(w), cN = Math.cos(N), sN = Math.sin(N), ci = Math.cos(i), si = Math.sin(i);
    return [(cw * cN - sw * sN * ci) * xp + (-sw * cN - cw * sN * ci) * yp,
            (cw * sN + sw * cN * ci) * xp + (-sw * sN + cw * cN * ci) * yp,
            (sw * si) * xp + (cw * si) * yp];
  }
  const squash = p => { const r = Math.hypot(p[0], p[1], p[2]) || 1e-9, k = Math.pow(r, 0.55) / r * 2.2; return [p[0] * k, p[2] * k, -p[1] * k]; };  // to scene (y up)

  let scene = null;
  async function start() {
    try { data = await (await fetch("data/missions.json", { cache: "no-cache" })).json(); } catch (e) { return; }
    renderTabs(); renderCard();
    let THREE;
    try { THREE = await import("./vendor/three-0.160.0.module.min.js"); } catch (e) { stage.classList.add("ms-noweb"); return; }
    const gl = (() => { try { return !!(document.createElement("canvas").getContext("webgl2")); } catch (e) { return false; } })();
    if (!gl) { stage.classList.add("ms-noweb"); return; }
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(38, 1, 0.05, 200);
    const light = () => root.getAttribute("data-theme") === "light";
    sc.add(new THREE.AmbientLight(0xffffff, 0.35));
    const sunLight = new THREE.PointLight(0xfff2d8, 3.2, 0, 0); sc.add(sunLight);
    // Sun with a soft glow
    const sun = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 16), new THREE.MeshBasicMaterial({ color: 0xffd27a }));
    sc.add(sun);
    const gc = document.createElement("canvas"); gc.width = gc.height = 128;
    const g = gc.getContext("2d"), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(255,214,140,0.9)"); grd.addColorStop(0.25, "rgba(255,180,90,0.35)"); grd.addColorStop(1, "rgba(255,160,60,0)");
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.set(1.3, 1.3, 1); sc.add(glow);

    const bodies = [];
    function orbitLine(o, color, opacity) {
      const pts = [];
      for (let k = 0; k <= 256; k++) { const E = k / 256 * Math.PI * 2; pts.push(new THREE.Vector3(...squash(rotate(o, o.a * (Math.cos(E) - o.e), o.a * Math.sqrt(1 - o.e * o.e) * Math.sin(E))))); }
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
      sc.add(line); return line;
    }
    data.planets.forEach(p => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.size, 24, 12), new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.8, metalness: 0 }));
      sc.add(mesh);
      bodies.push({ o: p, mesh, line: orbitLine(p, 0x8fa6c8, 0.28), label: p.name, kind: "planet" });
    });
    data.missions.forEach((m, i) => {
      const b = m.body, geo = new THREE.IcosahedronGeometry(b.kind === "comet" ? 0.03 : 0.035, 1);
      const pos = geo.attributes.position;                 // lumpy rock
      for (let k = 0; k < pos.count; k++) { const s = 0.75 + 0.5 * Math.abs(Math.sin(k * 12.9898 + i * 78.233) * 43758.5453 % 1); pos.setXYZ(k, pos.getX(k) * s, pos.getY(k) * s * 0.85, pos.getZ(k) * s); }
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: b.color, roughness: 1, flatShading: true, emissive: b.kind === "comet" ? 0x4a7ea8 : 0x000000 }));
      sc.add(mesh);
      bodies.push({ o: b, mesh, line: orbitLine(b, 0xffb35c, 0.35), label: b.name, kind: b.kind, mi: i });
    });
    labels.innerHTML = '<span class="ms-lab ms-lab--sun" data-k="sun"></span>' + bodies.map((b, i) => '<span class="ms-lab ms-lab--' + b.kind + '" data-k="' + i + '"></span>').join("");
    const labEls = [...labels.querySelectorAll(".ms-lab")];
    const relabel = () => {
      labEls[0].textContent = pname({ en: "Sun", pt: "Sol" });
      bodies.forEach((b, i) => { labEls[i + 1].textContent = typeof b.label === "object" ? pname(b.label) : b.label; });
    };
    relabel();
    const select = i => bodies.forEach((b, k) => {
      if (b.mi === undefined) return;
      const on = b.mi === i;
      b.line.material.color.set(on ? 0xffb35c : 0xb9a07a); b.line.material.opacity = on ? 0.95 : 0.22;
      b.mesh.scale.setScalar(on ? 1.9 : 1); labEls[k + 1].classList.toggle("is-on", on);
    });
    select(sel);

    // camera: drag to turn, gentle drift
    let az = -0.6, el = 0.62, dist = 9.2, drag = null, t0 = performance.now(), days = (Date.now() - J2000) / 864e5, playing = !reduced, visible = false, raf = 0;
    canvas.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY, az, el }; canvas.setPointerCapture(e.pointerId); stage.classList.add("is-dragging"); });
    canvas.addEventListener("pointermove", e => { if (!drag) return; az = drag.az - (e.clientX - drag.x) * 0.008; el = Math.max(0.08, Math.min(1.45, drag.el + (e.clientY - drag.y) * 0.006)); if (!raf) frame(); });
    const end = () => { drag = null; stage.classList.remove("is-dragging"); };
    canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end);
    playBtn.addEventListener("click", () => {
      playing = !playing; playBtn.setAttribute("aria-pressed", playing ? "true" : "false");
      const i = playBtn.querySelector("[data-lucide], svg"); if (i) { const n = document.createElement("i"); n.setAttribute("data-lucide", playing ? "pause" : "play"); i.replaceWith(n); if (window.lucide) lucide.createIcons(); }
      if (playing) loop();
    });
    if (reduced) playBtn.hidden = true;

    const v = new THREE.Vector3();
    function size() {
      const w = stage.clientWidth, h = stage.clientHeight;
      renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
      dist = w < 520 ? 11.5 : 9.2;
    }
    function frame() {
      raf = 0;
      const now = performance.now(), dt = Math.min(0.1, (now - t0) / 1000); t0 = now;
      if (playing) { days += dt * 12; if (!drag) az += dt * 0.03; }
      cam.position.set(Math.cos(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.sin(az) * Math.cos(el) * dist);
      cam.lookAt(0, 0, 0);
      const W = stage.clientWidth, H = stage.clientHeight;
      v.set(0, 0, 0).project(cam);
      labEls[0].style.transform = "translate(" + ((v.x + 1) / 2 * W).toFixed(1) + "px," + ((1 - v.y) / 2 * H + 16).toFixed(1) + "px)";
      bodies.forEach((b, k) => {
        const p = squash(kepler(b.o, days)); b.mesh.position.set(p[0], p[1], p[2]); b.mesh.rotation.y += dt * 0.6;
        v.copy(b.mesh.position).project(cam);
        labEls[k + 1].style.transform = "translate(" + ((v.x + 1) / 2 * W).toFixed(1) + "px," + ((1 - v.y) / 2 * H - 12).toFixed(1) + "px)";
      });
      const d = new Date(J2000 + days * 864e5);
      dateEl.textContent = d.toLocaleDateString(lang() === "en" ? "en-GB" : lang(), { year: "numeric", month: "short", day: "numeric" });
      const lightTheme = light();
      sunLight.intensity = lightTheme ? 2.6 : 3.2;
      renderer.render(sc, cam);
      if (playing && visible && !document.hidden) loop();
    }
    const loop = () => { if (!raf) raf = requestAnimationFrame(frame); };
    new ResizeObserver(() => { size(); loop(); }).observe(stage);
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) { t0 = performance.now(); loop(); } }, { rootMargin: "100px" }).observe(stage);
    document.addEventListener("visibilitychange", () => { if (!document.hidden && visible) { t0 = performance.now(); loop(); } });
    size(); frame();
    scene = { select, relabel };
  }

  // start when the section comes near the screen
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); start(); } }, { rootMargin: "600px" });
  io.observe(stage);
}
