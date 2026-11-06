// Esfera de partículas que gira y reacciona a la voz.
class ParticleOrb {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.mode = "idle";
    this.level = 0;     // nivel del micrófono (0-1), lo pone jarvis.js
    this.lv = 0;        // nivel suavizado
    this.speed = 0.15;
    this.rotY = 0;
    this.t = 0;
    this.last = performance.now();

    // Puntos repartidos por la esfera (espiral de Fibonacci)
    const N = 760, ga = Math.PI * (3 - Math.sqrt(5));
    this.pts = [];
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = ga * i;
      this.pts.push({ x: Math.cos(th) * r, y, z: Math.sin(th) * r, ph: Math.random() * 6.283, sp: 0.6 + Math.random() * 0.9 });
    }

    // Anillos de puntos que orbitan alrededor
    this.rings = [
      { tilt: 1.15, n: 110, r: 1.38, sp: 0.55, off: 0 },
      { tilt: -0.75, n: 80, r: 1.58, sp: -0.38, off: 1.7 },
      { tilt: 0.25, n: 60, r: 1.78, sp: 0.22, off: 3.1 }
    ];

    this.colA = [94, 231, 255];
    this.colB = [139, 123, 255];

    this.resize();
    if ("ResizeObserver" in window) new ResizeObserver(() => this.resize()).observe(canvas);
    window.addEventListener("resize", () => this.resize());
    requestAnimationFrame((n) => this.frame(n));
  }

  resize() {
    const d = window.devicePixelRatio || 1;
    this.w = this.c.clientWidth || 300;
    this.h = this.c.clientHeight || 300;
    this.c.width = this.w * d;
    this.c.height = this.h * d;
    this.ctx.setTransform(d, 0, 0, d, 0, 0);
  }

  setMode(m) { this.mode = m; }
  // Cambia el color un rato (por ejemplo, verde con el mapa)
  setTinte(hex, ms) {
    const n = parseInt(hex.replace("#", ""), 16);
    this.tinte = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    this.tinteHasta = performance.now() + (ms || 6000);
  }

  frame(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.t += dt;
    const t = this.t, ctx = this.ctx, w = this.w, h = this.h;

    // Velocidad y colores según el estado
    let cfg = {
      idle:      { sp: 0.18, a: [94, 231, 255],  b: [139, 123, 255] },
      listening: { sp: 0.55, a: [94, 231, 255],  b: [120, 160, 255] },
      thinking:  { sp: 1.6,  a: [180, 245, 255], b: [94, 231, 255]  },
      speaking:  { sp: 0.45, a: [139, 123, 255], b: [255, 94, 138]  }
    }[this.mode] || { sp: 0.18, a: [94, 231, 255], b: [139, 123, 255] };

    if (this.tinte && now < this.tinteHasta && this.mode !== "listening") {
      const tt = this.tinte;
      cfg = { sp: cfg.sp, a: tt, b: [tt[0] * 0.6 + cfg.b[0] * 0.4, tt[1] * 0.6 + cfg.b[1] * 0.4, tt[2] * 0.6 + cfg.b[2] * 0.4] };
    }
    this.speed += (cfg.sp - this.speed) * 0.05;
    this.rotY += this.speed * dt;
    for (let i = 0; i < 3; i++) {
      this.colA[i] += (cfg.a[i] - this.colA[i]) * 0.06;
      this.colB[i] += (cfg.b[i] - this.colB[i]) * 0.06;
    }

    let target = 0;
    if (this.mode === "listening") target = this.level;
    else if (this.mode === "speaking") target = 0.3 + 0.3 * Math.abs(Math.sin(t * 8.5) * Math.sin(t * 3.1));
    else if (this.mode === "thinking") target = 0.12;
    this.lv += (target - this.lv) * 0.15;
    const lv = this.lv;

    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const R = Math.min(w, h) * 0.26 * (1 + lv * 0.2 + 0.015 * Math.sin(t * 1.4));

    // Brillo de fondo
    const [ar, ag, ab] = this.colA.map(Math.round);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 2.1);
    g.addColorStop(0, `rgba(${ar},${ag},${ab},${0.16 + lv * 0.25})`);
    g.addColorStop(0.45, `rgba(${ar},${ag},${ab},${0.05 + lv * 0.08})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = "lighter";

    const cosY = Math.cos(this.rotY), sinY = Math.sin(this.rotY);
    const tiltX = 0.38 + Math.sin(t * 0.3) * 0.08;
    const cosX = Math.cos(tiltX), sinX = Math.sin(tiltX);
    const amp = 0.025 + lv * 0.16 + (this.mode === "thinking" ? 0.05 : 0);

    // Esfera
    for (const p of this.pts) {
      const wob = 1 + amp * Math.sin(t * 2.2 * p.sp + p.ph);
      let x = p.x * wob, y = p.y * wob, z = p.z * wob;
      let x1 = x * cosY - z * sinY, z1 = x * sinY + z * cosY;
      let y1 = y * cosX - z1 * sinX, z2 = y * sinX + z1 * cosX;
      const persp = 2.4 / (2.4 - z2);
      const sx = cx + x1 * R * persp, sy = cy + y1 * R * persp;
      const depth = (z2 + 1) / 2;
      const k = (p.y + 1) / 2;
      const r = this.colA[0] * (1 - k) + this.colB[0] * k;
      const gg = this.colA[1] * (1 - k) + this.colB[1] * k;
      const b = this.colA[2] * (1 - k) + this.colB[2] * k;
      ctx.fillStyle = `rgba(${r | 0},${gg | 0},${b | 0},${0.12 + depth * 0.85})`;
      const s = (0.5 + depth * 1.5) * (1 + lv * 0.4);
      ctx.beginPath();
      ctx.arc(sx, sy, s, 0, 6.283);
      ctx.fill();
    }

    // Anillos
    for (const ring of this.rings) {
      const ct = Math.cos(ring.tilt), st = Math.sin(ring.tilt);
      for (let i = 0; i < ring.n; i++) {
        const a = ring.off + (i / ring.n) * 6.283 + t * ring.sp * (1 + this.speed);
        let x = Math.cos(a) * ring.r, z = Math.sin(a) * ring.r, y = 0;
        // inclinar el anillo
        let y1 = y * ct - z * st, z1 = y * st + z * ct;
        // girar con la esfera (más despacio)
        const ry = this.rotY * 0.4;
        let x2 = x * Math.cos(ry) - z1 * Math.sin(ry), z2 = x * Math.sin(ry) + z1 * Math.cos(ry);
        const persp = 2.8 / (2.8 - z2 / ring.r);
        const sx = cx + x2 * R * persp, sy = cy + y1 * R * persp;
        const depth = (z2 / ring.r + 1) / 2;
        const big = i % 18 === 0;
        ctx.fillStyle = big
          ? `rgba(255,255,255,${0.35 + depth * 0.6})`
          : `rgba(${ar},${ag},${ab},${0.05 + depth * 0.4})`;
        ctx.beginPath();
        ctx.arc(sx, sy, big ? 1.8 + depth : 0.6 + depth * 0.7, 0, 6.283);
        ctx.fill();
      }
    }

    ctx.globalCompositeOperation = "source-over";
    requestAnimationFrame((n) => this.frame(n));
  }
}
