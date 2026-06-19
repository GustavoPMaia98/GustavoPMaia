/* Animated starfield — drifting stars + occasional meteor, drawn on a
   fixed full-viewport canvas behind all content. Recolours with theme. */
(function () {
  const canvas = document.getElementById('starfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, stars, meteors, raf;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function accent() {
    return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7dd3fc';
  }
  function resize() {
    w = canvas.width = innerWidth * devicePixelRatio;
    h = canvas.height = innerHeight * devicePixelRatio;
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    const count = Math.min(220, Math.round((innerWidth * innerHeight) / 9000));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: (Math.random() * 1.2 + 0.3) * devicePixelRatio,
      a: Math.random() * 0.6 + 0.2,
      tw: Math.random() * 0.02 + 0.004,
      dir: Math.random() > 0.5 ? 1 : -1,
      vy: (Math.random() * 0.12 + 0.02) * devicePixelRatio,
    }));
    meteors = [];
  }
  function spawnMeteor() {
    if (reduce) return;
    meteors.push({
      x: Math.random() * w * 0.7,
      y: Math.random() * h * 0.3,
      len: (Math.random() * 120 + 80) * devicePixelRatio,
      sp: (Math.random() * 6 + 6) * devicePixelRatio,
      life: 1,
    });
  }
  function draw() {
    ctx.clearRect(0, 0, w, h);
    const col = accent();
    for (const s of stars) {
      s.a += s.tw * s.dir;
      if (s.a > 0.85 || s.a < 0.15) s.dir *= -1;
      s.y += s.vy;
      if (s.y > h) { s.y = 0; s.x = Math.random() * w; }
      ctx.globalAlpha = s.a;
      ctx.fillStyle = Math.random() > 0.985 ? col : '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.x += m.sp; m.y += m.sp * 0.5; m.life -= 0.012;
      if (m.life <= 0) { meteors.splice(i, 1); continue; }
      const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.len, m.y - m.len * 0.5);
      grad.addColorStop(0, col);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = m.life;
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.6 * devicePixelRatio;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - m.len, m.y - m.len * 0.5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(draw);
  }
  resize();
  addEventListener('resize', resize);
  if (!reduce) {
    draw();
    setInterval(() => { if (Math.random() > 0.55) spawnMeteor(); }, 2600);
  } else {
    // static field
    const col = accent();
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) { ctx.globalAlpha = s.a; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); }
  }
})();
