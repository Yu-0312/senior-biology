/*
 * bio-kit.js — 生物實驗室共用繪圖與場景工具
 *
 * 與化學版的 chem-kit.js 同一個介面：scaffold、bench、panel、badge、plot、
 * meter、counter、particleBox……全部同名同參數，因此實驗台的版面、控制項、
 * 讀數與圖表的行為和化學版完全一致。差別只在器材層：
 * 顯微鏡、細胞、細胞膜、DNA、洋菜膠、培養皿、葉片橫切、心臟與肺臟。
 *
 * 這個檔案只放「畫得出來」與「版面接得起來」的共用零件，
 * 每個實驗自己的生物模型仍寫在 js/experiments/*.js，不藏在這裡。
 */
(function () {
  "use strict";
  const PL = window.PhysicsLab;
  if (!PL) return;
  const D = PL.draw, TAU = PL.TAU;
  const clamp = PL.clamp, lerp = PL.lerp;

  /* ------------------------------ 色彩 ------------------------------ */
  // 生物常用的原子配色（與化學版同一套，生物分子模型直接沿用）
  const ELEMENT_COLORS = {
    H: "#e8eef7", C: "#3b4654", N: "#5b8def", O: "#e25555", P: "#ff9f43",
    S: "#f2c94c", Na: "#b07cf0", K: "#c471ed", Ca: "#ffb36b", Fe: "#c97b4a",
    Mg: "#7fbf6a", Cl: "#6fcf97", I: "#6e3fa3", Cu: "#c77b3f", Zn: "#9aa8b8"
  };
  function elementColor(el) { return ELEMENT_COLORS[el] || "#9aa8b8"; }
  // 鹼基配色：A 紅、T 黃、G 綠、C 藍（教科書慣例的簡化版）
  const BASE_COLORS = { A: "#e57373", T: "#ffd54f", G: "#81c784", C: "#64b5f6", U: "#ffd54f" };
  function baseColor(b) { return BASE_COLORS[b] || "#9aa8b8"; }

  function phColor(ph) {
    const stops = [
      [0, "#d32f2f"], [2, "#f4511e"], [4, "#fb8c00"], [6, "#fdd835"],
      [7, "#66bb6a"], [8, "#26a69a"], [10, "#1e88e5"], [12, "#5e35b1"], [14, "#311b92"]
    ];
    const v = clamp(ph, 0, 14);
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i], b = stops[i + 1];
      if (v <= b[0]) {
        const f = (v - a[0]) / (b[0] - a[0] || 1);
        const ca = hex(a[1]), cb = hex(b[1]);
        return "rgb(" + ca.map((c, k) => Math.round(lerp(c, cb[k], f))).join(",") + ")";
      }
    }
    return stops[stops.length - 1][1];
  }
  function hex(h) {
    const s = String(h).replace("#", "");
    return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16));
  }
  function mix(a, b, f) {
    const ca = hex(a), cb = hex(b);
    return "rgb(" + ca.map((c, i) => Math.round(lerp(c, cb[i], f))).join(",") + ")";
  }
  function tintAlpha(c, a) {
    const rgb = hex(c);
    return "rgba(" + rgb.join(",") + "," + a + ")";
  }
  // 檢測結果的顏色階梯（本氏液：藍 → 綠 → 黃 → 橙 → 磚紅）
  function benedictColor(level) {
    const stops = ["#4a90d9", "#5fb077", "#e8d44d", "#ef8829", "#c0392b"];
    return stops[clamp(Math.round(level * (stops.length - 1)), 0, stops.length - 1)];
  }

  /* ------------------------------ 骨架 ------------------------------ */
  function scaffold(root, o) {
    o = o || {};
    // 標記「這是本站實驗台」，讓建置後的教學鷹架保險只作用在本站的實驗。
    if (root.dataset) root.dataset.labScaffold = "1";
    const L = PL.ui.layout(root, {
      chrome: o.chrome || "quiet",
      brief: o.brief,
      procedure: o.procedure,
      instrument: o.instrument
    });
    const cv = PL.canvas.create(L.canvasWrap, o.aspect || 0.64);
    /*
     * draw() 會讀取滑桿與讀數，而這些控制項是在 scaffold() 回傳後才建立的。
     * 建置期間若同步畫第一格，會撞上 const 的暫時性死區；因此先標記「尚未就緒」，
     * 等 build() 整個跑完（微任務），控制項都就位後再畫第一格。
     */
    const state = { t: 0, running: false, ready: false };
    const paint = (dt, t) => {
      if (!state.ready) return;
      state.running = true;
      o.draw(dt || 0, t == null ? state.t : t);
      state.running = false;
    };
    let anim = null;
    if (o.animate) {
      anim = PL.loop((dt, t) => { state.t = t; paint(dt, t); }, { ambient: o.ambient !== false, fps: o.fps });
      anim.start();
    }
    const redraw = () => { if (!anim || !anim.running) paint(0, state.t); };
    root.addEventListener("input", redraw);
    root.addEventListener("change", redraw);
    const rerender = () => { state.ready = true; paint(0, state.t); };
    const bc = PL._hooks && typeof PL._hooks.current === "function" ? PL._hooks.current() : null;
    if (bc) bc.rerender = rerender;
    cv.onResize(() => paint(0, state.t));
    const firstPaint = () => { state.ready = true; paint(0, state.t); };
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(firstPaint);
    else if (typeof queueMicrotask === "function") queueMicrotask(firstPaint);
    else Promise.resolve().then(firstPaint);
    return {
      L, cv, anim, state, redraw,
      charts: PL.ui.charts(root),
      chart(title, cap, aspect) {
        const c = PL.ui.chart(PL.ui.charts(root), { title, cap, aspect: aspect || 0.52 });
        return c;
      },
      rerender,
      stop() { if (anim) anim.stop(); cv.destroy(); }
    };
  }

  /* ------------------------------ 器材 ------------------------------ */
  function bench(cv) {
    const ctx = cv.ctx, W = cv.W, H = cv.H;
    D.bg(cv);
    PL.apparatus.benchTop ? PL.apparatus.benchTop(ctx, W, H, H - 26) : null;
    return { ctx, W, H, floor: H - 26 };
  }

  // 燒杯（水浴加熱、配製溶液都用得到）
  function beaker(ctx, cx, baseY, w, h, level, tint) {
    return PL.apparatus.beaker(ctx, cx, baseY, w, h, level, tint);
  }

  // 直立試管（檢測反應的主力器材）
  function testTube(ctx, cx, baseY, w, h, level, tint) {
    ctx.save();
    ctx.translate(cx, baseY);
    PL.apparatus.testTube(ctx, w, h, level == null ? h * 0.4 : h * level, { tint: tint || "#5aa2e0" });
    ctx.restore();
  }

  // 試管架（食物檢測一次排四管）
  function tubeRack(ctx, cx, baseY, n, w, h) {
    const gap = w + 14, start = cx - (n - 1) * gap / 2;
    D.rect(ctx, start - w / 2 - 20, baseY - 10, (n - 1) * gap + w + 40, 10, { fill: "#8a6a4c", r: 3 });
    for (let i = 0; i < n; i++) {
      const x = start + i * gap;
      D.rect(ctx, x - w / 2 - 2, baseY - h * 0.58, w + 4, 7, { fill: "#9c7a58", r: 2 });
    }
    return { start, gap };
  }

  // 滴管：管身與擠壓頭，滴一滴時可畫 drop()
  function dropper(ctx, cx, top, bottom, o) {
    o = o || {};
    const tipW = 5;
    D.rect(ctx, cx - 8, top, 16, (bottom - top) * 0.4, { fill: "#c9d6e2", r: 6 });
    D.rect(ctx, cx - 10, top - 12, 20, 12, { fill: o.bulb || "#7f8fa1", r: 5 });
    ctx.save();
    ctx.strokeStyle = PL.theme.isLight() ? "rgba(84,124,152,0.8)" : "rgba(206,232,244,0.75)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx - 6, top + (bottom - top) * 0.4);
    ctx.lineTo(cx - tipW / 2, bottom);
    ctx.moveTo(cx + 6, top + (bottom - top) * 0.4);
    ctx.lineTo(cx + tipW / 2, bottom);
    ctx.stroke();
    if (o.fill) {
      ctx.fillStyle = tintAlpha(o.fill, 0.75);
      ctx.beginPath();
      ctx.moveTo(cx - tipW / 2, bottom);
      ctx.lineTo(cx + tipW / 2, bottom);
      ctx.lineTo(cx + tipW / 2, top + (bottom - top) * 0.45);
      ctx.lineTo(cx - tipW / 2, top + (bottom - top) * 0.45);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drop(ctx, x, y, color) {
    D.disc(ctx, x, y, 3.2, { fill: color || "#7ec8ff" });
    D.disc(ctx, x - 1, y - 1, 1, { fill: "rgba(255,255,255,0.8)" });
  }

  // 電子天平（秤食物樣品）
  function balance(ctx, cx, baseY, reading, unit) {
    const w = 190, h = 58;
    D.rect(ctx, cx - w / 2, baseY - h, w, h, { fill: PL.theme.isLight() ? "#eef2f7" : "#1b2530", stroke: "#7a8a9c", r: 8 });
    D.rect(ctx, cx - w / 2 + 8, baseY - h - 10, w - 16, 12, { fill: "#b8c4d0", r: 3 });
    D.rect(ctx, cx - w / 2 + 18, baseY - h + 12, 90, 26, { fill: "#0c1a16", r: 4 });
    D.text(ctx, reading == null ? "0.000" : reading, cx - w / 2 + 63, baseY - h + 31, { color: "#65e6a8", size: 18, align: "center", weight: "700" });
    D.text(ctx, unit || "g", cx + 28, baseY - h + 31, { color: PL.col("text-dim"), size: 11, align: "left" });
    const num = typeof reading === "number" ? reading : parseFloat(reading);
    if (isFinite(num) && num >= 0) {
      const f = clamp(num / (num + 50), 0, 0.96);
      D.rect(ctx, cx - w / 2 + 18, baseY - h + 42, 96, 4, { fill: PL.theme.shade(0.5), r: 2 });
      D.rect(ctx, cx - w / 2 + 18, baseY - h + 42, Math.max(2, 96 * f), 4, { fill: "#43d18a", r: 2 });
    }
    D.disc(ctx, cx + w / 2 - 22, baseY - 20, 6, { fill: "#5d6b7a" });
  }

  // 加熱板與酒精燈（本氏液隔水加熱）
  function hotplate(ctx, cx, baseY, w, heat) {
    return PL.apparatus.hotPlate(ctx, cx, baseY, w, heat);
  }
  function burner(ctx, cx, baseY, lit) {
    PL.apparatus.alcoholLamp(ctx, cx, baseY, 1, lit);
  }

  // 溫度計（水浴溫度）
  function thermometer(ctx, x, yTop, yBot, frac) {
    PL.apparatus.thermometer(ctx, x, yTop, yBot, 9, clamp(frac == null ? 0.5 : frac, 0.02, 0.98));
  }

  // 讀數盤（pH 計、心率計等）
  function meter(ctx, cx, cy, value, label, unit) {
    D.disc(ctx, cx, cy, 26, { fill: PL.theme.isLight() ? "#f5f8fb" : "#101821", stroke: "#7f8fa1", width: 2 });
    D.text(ctx, label || "V", cx, cy - 7, { color: PL.col("text-faint"), size: 10, align: "center" });
    D.text(ctx, value == null ? "—" : value, cx, cy + 12, { color: PL.col("accent"), size: 13, align: "center", weight: "700" });
    if (unit) D.text(ctx, unit, cx + 17, cy + 15, { color: PL.col("text-faint"), size: 8 });
  }

  function wire(ctx, pts, color, w) {
    ctx.save(); ctx.strokeStyle = color || "#d07a4a"; ctx.lineWidth = w || 2.2; ctx.lineJoin = "round";
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.stroke(); ctx.restore();
  }

  function electrode(ctx, x, yTop, yBot, color, label) {
    D.rect(ctx, x - 7, yTop, 14, yBot - yTop, { fill: color, stroke: "rgba(255,255,255,0.35)", r: 2 });
    if (label) D.text(ctx, label, x, yTop - 8, { color: PL.col("text-dim"), size: 11, align: "center" });
  }

  /* ------------------------------ 顯微鏡與玻片 ------------------------------ */
  /*
   * 複式顯微鏡（側視線稿）：鏡座、鏡臂、鏡筒、物鏡轉盤、載物台與反光鏡。
   * o.mag 會以徽章顯示總放大率；o.revolve 0–1 表示轉盤旋轉角度。
   */
  function microscope(ctx, cx, baseY, s, o) {
    o = o || {};
    const w = 150 * s, h = 210 * s;
    const top = baseY - h;
    // 鏡座
    D.rect(ctx, cx - w * 0.42, baseY - 14 * s, w * 0.84, 14 * s, { fill: "#8a94a2", r: 6 * s });
    // 鏡臂
    ctx.save();
    ctx.strokeStyle = "#7a8a9c"; ctx.lineWidth = 9 * s; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.18, baseY - 14 * s);
    ctx.bezierCurveTo(cx - w * 0.42, baseY - h * 0.42, cx - w * 0.30, top + h * 0.16, cx - w * 0.06, top + h * 0.10);
    ctx.stroke(); ctx.restore();
    // 鏡筒
    D.rect(ctx, cx - 9 * s, top, 18 * s, 34 * s, { fill: "#9aa5b3", r: 3 * s });
    D.rect(ctx, cx - 6 * s, top - 10 * s, 12 * s, 10 * s, { fill: "#8a94a2", r: 2 * s });
    // 物鏡轉盤與物鏡
    const turretY = top + 40 * s;
    D.disc(ctx, cx, turretY, 12 * s, { fill: "#8a94a2" });
    const mags = [4, 10, 40];
    mags.forEach((m, i) => {
      const ang = -Math.PI / 2 + (i - 1) * 0.7 + (o.revolve || 0) * 0.7;
      const ox = cx + Math.cos(ang) * 13 * s, oy = turretY + Math.sin(ang) * 13 * s;
      const len = m === 40 ? 30 * s : m === 10 ? 24 * s : 18 * s;
      D.rect(ctx, ox - 4 * s, oy, 8 * s, len, { fill: "#b6bfcb", r: 2 * s });
      if (o.activeMag === m) badge(ctx, ox, oy + len + 10 * s, m + "×", PL.col("accent"));
    });
    // 載物台與玻片
    const stageY = baseY - h * 0.38;
    D.rect(ctx, cx - w * 0.38, stageY, w * 0.76, 8 * s, { fill: "#8a94a2", r: 3 * s });
    slide(ctx, cx - w * 0.05, stageY - 4 * s, w * 0.42, o.slideLabel);
    // 光圈與反光鏡
    D.disc(ctx, cx, stageY + 22 * s, 8 * s, { stroke: "#7a8a9c", width: 2 });
    D.disc(ctx, cx, stageY + 38 * s, 12 * s, { fill: "#c8d2dc", stroke: "#7a8a9c" });
    // 粗細調節輪
    D.disc(ctx, cx - w * 0.24, top + h * 0.24, 10 * s, { fill: "#6f7b8a" });
    D.disc(ctx, cx - w * 0.24, top + h * 0.31, 6 * s, { fill: "#8a94a2" });
    if (o.mag != null) badge(ctx, cx + w * 0.42, top + h * 0.06, "總放大 " + o.mag + "×", PL.col("accent"));
    return { stageY, turretY };
  }

  // 載玻片（可附標本與標籤）
  function slide(ctx, cx, cy, w, label) {
    const h = w * 0.28;
    D.rect(ctx, cx - w / 2, cy - h / 2, w, h, { fill: "rgba(210,232,244,0.5)", stroke: "rgba(140,180,205,0.9)", r: 2 });
    if (label) D.text(ctx, label, cx, cy + h / 2 + 12, { color: PL.col("text-dim"), size: 10, align: "center" });
    return { x: cx - w / 2, y: cy - h / 2, w, h };
  }

  /* ------------------------------ 細胞 ------------------------------ */
  /*
   * 細胞本體。
   * type: "animal"（圓形）|"plant"（圓角矩形＋細胞壁）|"bacteria"（膠囊＋鞭毛）
   *       |"red"（雙凹圓盤，無核）。
   * organelles: {mito, chloro, ribosome, vacuole} 各胞器數量。
   * fluid = true 時膜緣微幅擺動（流動性）；label 顯示於下方。
   */
  function cellBody(ctx, cx, cy, r, o) {
    o = o || {};
    const t = o.time || 0;
    const type = o.type || "animal";
    const wob = o.fluid ? Math.sin(t * 2.1) * r * 0.02 : 0;
    const og = o.organelles || {};
    if (type === "plant") {
      const w2 = r * 1.35, h2 = r * 1.05;
      D.rect(ctx, cx - w2 / 2 - 4, cy - h2 / 2 - 4, w2 + 8, h2 + 8, { fill: "rgba(140,190,120,0.35)", stroke: "#5d8a4a", width: 3, r: 10 });
      D.rect(ctx, cx - w2 / 2 + wob, cy - h2 / 2 + wob, w2, h2, { fill: o.tint || "rgba(170,215,150,0.30)", stroke: "rgba(90,140,70,0.9)", width: 1.6, r: 8 });
    } else if (type === "bacteria") {
      const w2 = r * 1.9, h2 = r * 0.95;
      D.rect(ctx, cx - w2 / 2, cy - h2 / 2, w2, h2, { fill: o.tint || "rgba(150,200,220,0.32)", stroke: "rgba(70,120,145,0.9)", width: 1.6, r: h2 / 2 });
      // 鞭毛
      ctx.save();
      ctx.strokeStyle = "rgba(90,140,165,0.9)"; ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const fx = cx + w2 / 2 + i * 4, fy = cy + Math.sin(t * 8 + i * 0.8) * 5;
        i ? ctx.lineTo(fx, fy) : ctx.moveTo(fx, fy);
      }
      ctx.stroke(); ctx.restore();
    } else if (type === "red") {
      D.disc(ctx, cx, cy, r, { fill: "#d95757", stroke: "rgba(120,30,30,0.6)", width: 1.4 });
      D.disc(ctx, cx, cy, r * 0.42, { fill: "rgba(150,40,40,0.55)" });
      return;
    } else {
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const a = i / 40 * TAU;
        const rr = r + (o.fluid ? Math.sin(a * 5 + t * 2) * r * 0.03 : 0);
        const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = o.tint || "rgba(160,200,225,0.30)";
      ctx.fill();
      ctx.strokeStyle = "rgba(80,120,150,0.95)"; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.restore();
    }
    // 細胞核
    if (o.nucleus !== false && type !== "bacteria") {
      const nR = r * (type === "plant" ? 0.24 : 0.34);
      D.disc(ctx, cx + r * 0.08, cy - r * 0.05, nR, { fill: "#b388d9", stroke: "rgba(90,50,130,0.8)", width: 1.4 });
      D.disc(ctx, cx + r * 0.08, cy - r * 0.05, nR * 0.35, { fill: "rgba(90,50,130,0.75)" });
      if (o.labelNucleus) D.text(ctx, "核", cx + r * 0.08, cy - r * 0.05 + 3.5, { color: "#fff", size: 9, align: "center", weight: "700" });
    }
    // 粒線體
    for (let i = 0; i < (og.mito || 0); i++) {
      const a = i * 2.4 + 0.7, rr = r * 0.62;
      mitochondrion(ctx, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, r * 0.11, {});
    }
    // 葉綠體
    for (let i = 0; i < (og.chloro || 0); i++) {
      const a = i * 2.4 + 1.9, rr = r * 0.66;
      chloroplast(ctx, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, r * 0.13, { time: t });
    }
    // 核糖體
    for (let i = 0; i < (og.ribosome || 0); i++) {
      const a = i * 2.7 + 0.3, rr = r * 0.72;
      D.disc(ctx, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 1.6, { fill: "#5b8def" });
    }
    // 液泡
    if (og.vacuole) {
      D.disc(ctx, cx - r * 0.05, cy + r * 0.1, r * (type === "plant" ? 0.42 : 0.2), { fill: "rgba(150,200,235,0.35)", stroke: "rgba(80,130,165,0.7)", width: 1.2 });
    }
    if (o.label) D.text(ctx, o.label, cx, cy + r * 1.4 + 12, { color: PL.col("text-dim"), size: 11, align: "center" });
  }

  // 粒線體：外膜橢圓＋內褶（cristae）
  function mitochondrion(ctx, cx, cy, r, o) {
    const rx = r * 1.7, ry = r;
    ctx.save();
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
    ctx.fillStyle = "rgba(239,136,41,0.35)"; ctx.fill();
    ctx.strokeStyle = "rgba(190,95,20,0.95)"; ctx.lineWidth = 1.4; ctx.stroke();
    // 內褶
    ctx.strokeStyle = "rgba(190,95,20,0.8)"; ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const x = cx - rx + (rx * 2) * i / 5;
      ctx.beginPath();
      ctx.moveTo(x, cy - ry * 0.8);
      ctx.quadraticCurveTo(x + 2, cy, x, cy + ry * 0.8);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 葉綠體：綠色橢圓＋基粒（grana）疊盤
  function chloroplast(ctx, cx, cy, r, o) {
    const rx = r * 1.9, ry = r;
    ctx.save();
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0.3, 0, TAU);
    ctx.fillStyle = "rgba(76,175,80,0.42)"; ctx.fill();
    ctx.strokeStyle = "rgba(40,110,45,0.95)"; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.save(); ctx.clip();
    for (let i = 0; i < 4; i++) {
      const gx = cx - rx * 0.5 + i * rx * 0.35, gy = cy - ry * 0.15 + (i % 2) * 3;
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = o.excited ? "#ffee58" : "rgba(30,95,40,0.85)";
        ctx.fillRect(gx - 3, gy + k * 2.6 - 1, 6, 1.8);
      }
    }
    ctx.restore(); ctx.restore();
    if (o.label) D.text(ctx, o.label, cx, cy + ry + 10, { color: PL.col("text-dim"), size: 9, align: "center" });
  }

  /* ------------------------------ 細胞膜 ------------------------------ */
  /*
   * 磷脂雙層：兩排磷脂（親水頭＋兩條尾巴），蛋白質鑲嵌其中。
   * o.proteins = [{x（0–1）, w, channel, label}]；channel 為通道蛋白（有孔隙）。
   */
  function bilayer(ctx, box, o) {
    o = o || {};
    const gap = 13;
    const n = Math.floor(box.w / gap);
    const headY1 = box.y + box.h * 0.32, headY2 = box.y + box.h * 0.68;
    const headR = 4;
    const drawLeaflet = (y, flip) => {
      for (let i = 0; i <= n; i++) {
        const x = box.x + gap * i + (flip ? gap / 2 : 0);
        if (x > box.x + box.w) break;
        D.disc(ctx, x, y, headR, { fill: "#e8a0b4", stroke: "rgba(150,60,90,0.7)", width: 0.8 });
        ctx.save();
        ctx.strokeStyle = "rgba(150,110,130,0.85)"; ctx.lineWidth = 1;
        for (let k = -1; k <= 1; k += 2) {
          ctx.beginPath();
          ctx.moveTo(x + k * 1.5, y + (flip ? -headR : headR));
          ctx.quadraticCurveTo(x + k * 2.5, y + (flip ? -headR - 5 : headR + 5), x + k * 1.2, y + (flip ? -headR - 10 : headR + 10));
          ctx.stroke();
        }
        ctx.restore();
      }
    };
    drawLeaflet(headY1, false);
    drawLeaflet(headY2, true);
    // 膜蛋白
    (o.proteins || []).forEach(p => {
      const x = box.x + box.w * clamp(p.x, 0.02, 0.98);
      const pw = p.w || 16, top = box.y + box.h * 0.14, bot = box.y + box.h * 0.86;
      if (p.channel) {
        D.rect(ctx, x - pw / 2, top, pw, bot - top, { fill: "rgba(100,181,246,0.85)", stroke: "rgba(30,90,150,0.9)", width: 1.4, r: 4 });
        D.rect(ctx, x - 2.5, top + 3, 5, bot - top - 6, { fill: "rgba(10,30,55,0.55)", r: 2 });
      } else {
        D.rect(ctx, x - pw / 2, top, pw, bot - top, { fill: "rgba(255,167,38,0.85)", stroke: "rgba(170,100,10,0.9)", width: 1.4, r: 5 });
      }
      if (p.label) D.text(ctx, p.label, x, top - 7, { color: PL.col("text-dim"), size: 9.5, align: "center" });
    });
    return { headY1, headY2 };
  }

  /* ------------------------------ DNA ------------------------------ */
  /*
   * 雙螺旋。o.seq 是鹼基對陣列，例如 ["AT","GC","CG",...]，循環使用；
   * o.unzip（0–1）從底部解開雙股（複製叉）。回傳兩股的取樣點，供實驗加標註。
   */
  function dnaHelix(ctx, box, o) {
    o = o || {};
    const amp = box.w * 0.26, cx = box.x + box.w / 2;
    const k = TAU / (box.h / (o.turns || 1.6));
    const rungGap = 9;
    const strand = (phase) => {
      const pts = [];
      for (let y = box.y; y <= box.y + box.h; y += 3) {
        pts.push([cx + Math.sin((y - box.y) * k + phase) * amp, y]);
      }
      return pts;
    };
    const A = strand(0), B = strand(Math.PI);
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = o.strandColor || "rgba(90,130,170,0.95)";
    ctx.beginPath(); A.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
    ctx.strokeStyle = o.strandColor2 || "rgba(150,100,180,0.95)";
    ctx.beginPath(); B.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
    // 鹼基對
    const seq = o.seq && o.seq.length ? o.seq : ["AT", "GC", "CG", "TA"];
    const cutY = box.y + box.h * (1 - clamp(o.unzip == null ? 0 : o.unzip, 0, 1));
    for (let y = box.y + 5, i = 0; y < box.y + box.h - 4; y += rungGap, i++) {
      if (y > cutY) continue;
      const ya = box.y + (y - box.y);
      const xa = cx + Math.sin((y - box.y) * k) * amp;
      const xb = cx + Math.sin((y - box.y) * k + Math.PI) * amp;
      const pair = seq[i % seq.length];
      const c1 = baseColor(pair[0]), c2 = baseColor(pair[1]);
      D.line(ctx, xa, ya, (xa + xb) / 2, ya, c1, 3.4);
      D.line(ctx, (xa + xb) / 2, ya, xb, ya, c2, 3.4);
      if (o.showBases && box.h > 180) {
        D.text(ctx, pair[0], (xa + (xa + xb) / 2) / 2, ya - 3, { color: c1, size: 8, align: "center", weight: "700" });
        D.text(ctx, pair[1], (xb + (xa + xb) / 2) / 2, ya - 3, { color: c2, size: 8, align: "center", weight: "700" });
      }
    }
    ctx.restore();
    return { strandA: A, strandB: B, cutY };
  }

  // 染色體：X 形（兩條姊妹染色單體）或 I 形（單條）
  function chromosome(ctx, cx, cy, s, o) {
    o = o || {};
    const col = o.color || "#b388ff";
    const arm = (dx, dy) => {
      D.line(ctx, cx, cy, cx + dx * s, cy + dy * s, col, 7, null);
    };
    ctx.save();
    ctx.lineCap = "round";
    if (o.single) {
      arm(-0.35, -1); arm(0.35, -1);
    } else {
      arm(-0.5, -1); arm(0.5, -1); arm(-0.5, 1); arm(0.5, 1);
      // 著絲點
      D.disc(ctx, cx, cy, s * 0.16, { fill: "rgba(60,30,90,0.8)" });
    }
    ctx.restore();
    if (o.label) D.text(ctx, o.label, cx, cy + s * 1.4, { color: PL.col("text-dim"), size: 10, align: "center" });
  }

  /* ------------------------------ 遺傳 ------------------------------ */
  /*
   * 棋盤方格：a、b 是兩親的等位基因陣列（如 ["A","a"]）。
   * 回傳各基因型計數 {AA:1, Aa:2, aa:1}，供實驗顯示比率。
   */
  function punnett(ctx, box, a, b, o) {
    o = o || {};
    const rows = a.length, cols = b.length;
    const labelH = 22, cellW = (box.w - labelH) / cols, cellH = (box.h - labelH) / rows;
    const counts = {};
    // 親代配子
    for (let c = 0; c < cols; c++) {
      D.text(ctx, b[c], box.x + labelH + cellW * (c + 0.5), box.y + 14, { color: PL.col("text-dim"), size: 14, align: "center", weight: "700" });
    }
    for (let r = 0; r < rows; r++) {
      D.text(ctx, a[r], box.x + labelH / 2, box.y + labelH + cellH * (r + 0.5) + 5, { color: PL.col("text-dim"), size: 14, align: "center", weight: "700" });
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = box.x + labelH + c * cellW, y = box.y + labelH + r * cellH;
        const g1 = a[r], g2 = b[c];
        const gt = orderGenes(g1, g2);
        counts[gt] = (counts[gt] || 0) + 1;
        const hi = o.highlight && o.highlight.includes(gt);
        D.rect(ctx, x + 1, y + 1, cellW - 2, cellH - 2, {
          fill: hi ? "rgba(102,187,106,0.30)" : PL.theme.shade(0.5),
          stroke: hi ? "#66bb6a" : PL.col("border"), width: hi ? 2 : 1, r: 4
        });
        D.text(ctx, gt, x + cellW / 2, y + cellH / 2 + 6, { color: PL.col("text"), size: Math.min(18, cellH * 0.42), align: "center", weight: "700" });
      }
    }
    return counts;
  }
  function orderGenes(g1, g2) {
    const up = g => g === g.toUpperCase();
    if (up(g1) === up(g2)) return up(g1) ? g1 + g2 : g1 + g2;
    return up(g1) ? g1 + g2 : g2 + g1;
  }

  /*
   * 譜系圖的積木：person、marriage、descent。
   * 行：rows = [{y, members:[{x, sex, affected, carrier, label}]}]，
   * 再由實驗用 marriage/descent 連線。
   */
  function pedigreePerson(ctx, x, y, sex, affected, o) {
    o = o || {};
    const s = o.s || 11;
    const fill = affected ? "#e57373" : PL.theme.shade(0.6);
    const stroke = o.carrier ? "#ffb74d" : PL.col("text-dim");
    if (sex === "female") {
      D.disc(ctx, x, y, s, { fill, stroke, width: o.carrier ? 2.4 : 1.4 });
    } else {
      D.rect(ctx, x - s, y - s, s * 2, s * 2, { fill, stroke, width: o.carrier ? 2.4 : 1.4, r: 2 });
    }
    if (o.label) D.text(ctx, o.label, x, y + s + 12, { color: PL.col("text-dim"), size: 9, align: "center" });
    return { x, y };
  }
  function pedigreeLink(ctx, a, b, midY) {
    const mx = (a.x + b.x) / 2;
    D.line(ctx, a.x, a.y, a.x, midY, PL.col("text-dim"), 1.4);
    D.line(ctx, b.x, b.y, b.x, midY, PL.col("text-dim"), 1.4);
    D.line(ctx, a.x, midY, b.x, midY, PL.col("text-dim"), 1.4);
    return { x: mx, y: midY };
  }
  function pedigreeDrop(ctx, from, toY, xs) {
    D.line(ctx, from.x, from.y, from.x, toY, PL.col("text-dim"), 1.4);
    D.line(ctx, xs[0], toY, xs[xs.length - 1], toY, PL.col("text-dim"), 1.4);
    xs.forEach(x => D.line(ctx, x, toY, x, toY + 10, PL.col("text-dim"), 1.4));
  }

  /*
   * 電泳膠體：lanes = [{label, bands:[bp,...]}]。
   * 帶的縱向位置由 log(長度) 內插：小的跑得遠（下方）。
   * o.running 0–1 讓帶從檢體槽漂到定位（動畫用）。
   */
  function gelBox(ctx, box, lanes, o) {
    o = o || {};
    const run = clamp(o.running == null ? 1 : o.running, 0, 1);
    // 膠體底板
    D.rect(ctx, box.x, box.y, box.w, box.h, { fill: "rgba(150,180,205,0.22)", stroke: "rgba(120,150,175,0.8)", r: 3 });
    // 電極
    D.line(ctx, box.x - 8, box.y - 12, box.x + box.w + 8, box.y - 12, "#5d6b7a", 5);
    D.line(ctx, box.x - 8, box.y + box.h + 12, box.x + box.w + 8, box.y + box.h + 12, "#c0392b", 5);
    D.text(ctx, "−", box.x - 16, box.y - 8, { color: PL.col("text-dim"), size: 13, align: "center", weight: "700" });
    D.text(ctx, "+", box.x - 16, box.y + box.h + 16, { color: PL.col("text-dim"), size: 13, align: "center", weight: "700" });
    const laneW = box.w / lanes.length;
    const sizeMin = o.sizeMin || 100, sizeMax = o.sizeMax || 10000;
    const yOf = bp => box.y + 26 + run * (Math.log(sizeMax / bp) / Math.log(sizeMax / sizeMin)) * (box.h - 44);
    lanes.forEach((lane, i) => {
      const cx = box.x + laneW * (i + 0.5);
      // 檢體槽
      D.rect(ctx, cx - laneW * 0.3, box.y + 6, laneW * 0.6, 8, { fill: "rgba(30,50,70,0.8)", r: 2 });
      (lane.bands || []).forEach(bp => {
        const y = yOf(bp);
        const w = laneW * 0.5;
        ctx.save();
        ctx.shadowColor = "rgba(120,220,255,0.9)"; ctx.shadowBlur = 5;
        D.rect(ctx, cx - w / 2, y - 2.2, w, 4.4, { fill: "rgba(140,225,255,0.95)", r: 2 });
        ctx.restore();
      });
      if (lane.label) D.text(ctx, lane.label, cx, box.y + box.h + 24, { color: PL.col("text-dim"), size: 10, align: "center" });
    });
    return { yOf, laneW };
  }

  // 培養皿（俯視）：agar 底 + 菌落
  function petri(ctx, cx, cy, r, o) {
    o = o || {};
    D.disc(ctx, cx, cy, r, { fill: "rgba(225,215,180,0.55)", stroke: "rgba(150,140,110,0.9)", width: 2 });
    D.disc(ctx, cx, cy, r * 0.92, { stroke: "rgba(255,255,255,0.35)", width: 1 });
    const rnd = rng(o.seed || 3);
    const n = o.colonies == null ? 0 : o.colonies;
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU, rr = Math.sqrt(rnd()) * r * 0.8;
      const cr = r * (0.04 + rnd() * 0.05);
      D.disc(ctx, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, cr, { fill: o.color || "rgba(120,90,60,0.85)" });
    }
    if (o.label) D.text(ctx, o.label, cx, cy + r + 16, { color: PL.col("text-dim"), size: 10, align: "center" });
  }

  // 病毒：蛋白外殼＋棘突
  function virusShape(ctx, cx, cy, r, o) {
    o = o || {};
    D.disc(ctx, cx, cy, r, { fill: o.fill || "rgba(149,117,205,0.75)", stroke: "rgba(80,50,130,0.9)", width: 1.6 });
    const nSpikes = o.spikes == null ? 10 : o.spikes;
    for (let i = 0; i < nSpikes; i++) {
      const a = i / nSpikes * TAU + (o.time || 0) * 0.3;
      const x1 = cx + Math.cos(a) * r, y1 = cy + Math.sin(a) * r;
      const x2 = cx + Math.cos(a) * r * 1.28, y2 = cy + Math.sin(a) * r * 1.28;
      D.line(ctx, x1, y1, x2, y2, "rgba(80,50,130,0.9)", 2);
      D.disc(ctx, x2, y2, 2.4, { fill: "rgba(80,50,130,0.9)" });
    }
    if (o.rna) {
      ctx.save();
      ctx.strokeStyle = "rgba(255,213,79,0.95)"; ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let i = 0; i <= 24; i++) {
        const a = i / 24 * TAU * 1.5, rr = r * 0.5 * (i / 24);
        const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke(); ctx.restore();
    }
    if (o.label) D.text(ctx, o.label, cx, cy + r * 1.5 + 8, { color: PL.col("text-dim"), size: 10, align: "center" });
  }

  // 抗體：Y 形分子
  function antibodyY(ctx, cx, cy, s, color) {
    const c = color || "#64b5f6";
    const pt = (dx, dy) => [cx + dx * s, cy + dy * s];
    const stem = pt(0, 0.9), mid = pt(0, -0.1);
    D.line(ctx, stem[0], stem[1], mid[0], mid[1], c, 4);
    D.line(ctx, mid[0], mid[1], pt(-0.55, -0.9)[0], pt(-0.55, -0.9)[1], c, 4);
    D.line(ctx, mid[0], mid[1], pt(0.55, -0.9)[0], pt(0.55, -0.9)[1], c, 4);
    D.disc(ctx, pt(-0.55, -0.9)[0], pt(-0.55, -0.9)[1], s * 0.16, { fill: c });
    D.disc(ctx, pt(0.55, -0.9)[0], pt(0.55, -0.9)[1], s * 0.16, { fill: c });
  }

  /* ------------------------------ 植物 ------------------------------ */
  /*
   * 葉片橫切：角質層、上下表皮、柵狀與海綿組織、葉脈、氣孔。
   * o.open（0–1）控制氣孔開度；回傳氣孔位置。
   */
  function leafCross(ctx, box, o) {
    o = o || {};
    const top = box.y, h = box.h, w = box.w;
    const epH = h * 0.12, palH = h * 0.34, spoH = h * 0.34;
    const yCut = top + 2, yUp = yCut + 3, yPal = yUp + epH, ySpo = yPal + palH, yLow = ySpo + spoH;
    // 角質層
    D.rect(ctx, box.x, yCut, w, 3, { fill: "rgba(255,241,180,0.85)" });
    // 上表皮
    D.rect(ctx, box.x, yUp, w, epH, { fill: "rgba(180,215,160,0.35)", stroke: "rgba(90,140,80,0.7)", width: 1 });
    // 柵狀組織
    D.rect(ctx, box.x, yPal, w, palH, { fill: "rgba(120,180,110,0.30)" });
    const palW = 14;
    for (let x = box.x + 6; x < box.x + w - palW; x += palW + 3) {
      D.rect(ctx, x, yPal + 3, palW, palH - 8, { fill: "rgba(76,175,80,0.55)", stroke: "rgba(40,110,45,0.6)", width: 1, r: 4 });
      D.disc(ctx, x + palW / 2 - 3, yPal + palH * 0.3, 2.2, { fill: "#2e7d32" });
      D.disc(ctx, x + palW / 2 + 2, yPal + palH * 0.6, 2.2, { fill: "#2e7d32" });
    }
    // 海綿組織
    D.rect(ctx, box.x, ySpo, w, spoH, { fill: "rgba(140,190,130,0.22)" });
    const rnd = rng(o.seed || 5);
    for (let i = 0; i < Math.floor(w / 18); i++) {
      const x = box.x + 8 + rnd() * (w - 16), y = ySpo + 8 + rnd() * (spoH - 16), r = 4 + rnd() * 3;
      D.disc(ctx, x, y, r, { fill: "rgba(100,165,95,0.55)", stroke: "rgba(40,110,45,0.5)", width: 1 });
    }
    // 葉脈（中間）
    const midY = yPal + palH * 0.55;
    D.rect(ctx, box.x + w * 0.32, midY - 7, w * 0.36, 14, { fill: "rgba(210,225,235,0.5)", stroke: "rgba(90,130,160,0.9)", width: 1.4, r: 6 });
    D.disc(ctx, box.x + w * 0.38, midY - 2.5, 2.6, { stroke: "rgba(70,120,150,0.9)", width: 1.2 });
    D.disc(ctx, box.x + w * 0.5, midY - 2.5, 2.6, { stroke: "rgba(70,120,150,0.9)", width: 1.2 });
    D.disc(ctx, box.x + w * 0.62, midY - 2.5, 2.6, { stroke: "rgba(70,120,150,0.9)", width: 1.2 });
    D.disc(ctx, box.x + w * 0.44, midY + 3.5, 2.2, { fill: "rgba(90,150,90,0.8)" });
    D.disc(ctx, box.x + w * 0.56, midY + 3.5, 2.2, { fill: "rgba(90,150,90,0.8)" });
    // 下表皮與氣孔
    D.rect(ctx, box.x, yLow, w, epH, { fill: "rgba(180,215,160,0.35)", stroke: "rgba(90,140,80,0.7)", width: 1 });
    const stomata = [];
    const nSt = o.stomata == null ? 3 : o.stomata;
    const open = clamp(o.open == null ? 0.7 : o.open, 0, 1);
    for (let i = 0; i < nSt; i++) {
      const x = box.x + w * (i + 0.5) / nSt;
      const poreW = 4 + open * 6;
      D.rect(ctx, x - poreW / 2, yLow + epH * 0.3, poreW, epH * 0.4, { fill: "rgba(20,40,25,0.75)", r: 2 });
      // 保衛細胞：兩枚腎形
      ctx.save();
      ctx.strokeStyle = "#2e7d32"; ctx.lineWidth = 2.4; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(x - poreW / 2 - 2, yLow + epH * 0.5, epH * 0.42, -Math.PI / 2 - 0.9, Math.PI / 2 + 0.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + poreW / 2 + 2, yLow + epH * 0.5, epH * 0.42, Math.PI / 2 - 0.9, Math.PI * 1.5 + 0.9);
      ctx.stroke();
      ctx.restore();
      stomata.push({ x, y: yLow + epH * 0.5 });
    }
    if (o.label) {
      const rows = [["角質層", yCut + 1], ["柵狀組織", yPal + palH * 0.4], ["海綿組織", ySpo + spoH * 0.5]];
      rows.forEach(([txt, y]) => D.text(ctx, txt, box.x + w + 8, y + 3, { color: PL.col("text-faint"), size: 9 }));
    }
    return { stomata, yLow };
  }

  // 水蘊草（光合速率實驗）：莖＋對生葉，sway 擺動
  function waterWeed(ctx, cx, baseY, h, o) {
    o = o || {};
    const t = o.time || 0;
    const seg = 8;
    ctx.save();
    ctx.strokeStyle = "#3f9142"; ctx.lineWidth = 3; ctx.lineCap = "round";
    let x = cx, y = baseY;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let i = 1; i <= seg; i++) {
      const sy = baseY - h * i / seg;
      const sx = cx + Math.sin(t * 1.5 + i * 0.6) * h * 0.02 * i;
      ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    for (let i = 2; i <= seg; i += 1) {
      const sy = baseY - h * i / seg;
      const sx = cx + Math.sin(t * 1.5 + i * 0.6) * h * 0.02 * i;
      const lw = h * 0.09;
      ctx.fillStyle = i % 2 ? "rgba(76,175,80,0.85)" : "rgba(56,142,60,0.85)";
      ctx.beginPath(); ctx.ellipse(sx - lw, sy - 2, lw * 0.8, lw * 0.28, -0.5, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(sx + lw, sy - 2, lw * 0.8, lw * 0.28, 0.5, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // 花（植物生殖）：花瓣、雄蕊、雌蕊
  function flower(ctx, cx, cy, s, o) {
    o = o || {};
    const petals = o.petals || 6;
    for (let i = 0; i < petals; i++) {
      const a = i / petals * TAU + (o.time || 0) * 0.1;
      ctx.save();
      ctx.fillStyle = o.petal || "rgba(240,98,146,0.75)";
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * s * 0.75, cy + Math.sin(a) * s * 0.75, s * 0.5, s * 0.26, a, 0, TAU);
      ctx.fill(); ctx.restore();
    }
    D.disc(ctx, cx, cy, s * 0.3, { fill: "rgba(255,213,79,0.95)", stroke: "rgba(180,140,20,0.8)", width: 1.2 });
    // 雄蕊
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * TAU + 0.6;
      D.line(ctx, cx + Math.cos(a) * s * 0.3, cy + Math.sin(a) * s * 0.3, cx + Math.cos(a) * s * 0.55, cy + Math.sin(a) * s * 0.55, "#c9a24a", 1.6);
      D.disc(ctx, cx + Math.cos(a) * s * 0.58, cy + Math.sin(a) * s * 0.58, s * 0.08, { fill: "#ffd54f" });
    }
  }

  /* ------------------------------ 動物生理 ------------------------------ */
  /*
   * 心臟血流示意：四腔＋瓣膜＋血流方向。
   * o.beat（0–1）心室收縮程度；o.rate 顯示心率徽章。
   */
  function heartFlow(ctx, box, o) {
    o = o || {};
    const beat = clamp(o.beat == null ? 0.5 : o.beat, 0, 1);
    const cx = box.x + box.w / 2, cy = box.y + box.h * 0.55;
    const hw = box.w * 0.42, hh = box.h * 0.40 * (0.9 + 0.1 * (1 - beat));
    // 心外形
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy + hh * 1.05);
    ctx.bezierCurveTo(cx - hw * 1.5, cy + hh * 0.2, cx - hw * 0.9, cy - hh * 1.05, cx, cy - hh * 0.42);
    ctx.bezierCurveTo(cx + hw * 0.9, cy - hh * 1.05, cx + hw * 1.5, cy + hh * 0.2, cx, cy + hh * 1.05);
    ctx.closePath();
    ctx.fillStyle = "rgba(180,60,60,0.25)"; ctx.fill();
    ctx.strokeStyle = "rgba(140,40,40,0.9)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    const chW = hw * 0.72, chH = hh * 0.52;
    const top = cy - hh * 0.5, sep = cx;
    // 四腔：右上心房、右下心室（藍＝缺氧血）、左上心房、左下心室（紅＝充氧血）
    const cham = (x, y, w, h, color, label) => {
      D.rect(ctx, x - w / 2, y - h / 2, w, h, { fill: color, stroke: "rgba(40,20,20,0.7)", width: 1.4, r: 5 });
      if (label) D.text(ctx, label, x, y + 3.5, { color: "#fff", size: 10, align: "center", weight: "700" });
    };
    cham(cx - chW / 2 - 2, top + chH * 0.5, chW, chH * 0.7, "rgba(70,130,180,0.55)", "右心房");
    cham(cx - chW / 2 - 2, top + chH * 1.6 + beat * 3, chW, chH * 1.1, "rgba(70,130,180,0.65)", "右心室");
    cham(cx + chW / 2 + 2, top + chH * 0.5, chW, chH * 0.7, "rgba(220,90,80,0.55)", "左心房");
    cham(cx + chW / 2 + 2, top + chH * 1.6 + beat * 3, chW, chH * 1.1, "rgba(220,90,80,0.65)", "左心室");
    // 血流箭頭
    const blue = "#4a90d9", red = "#d95555";
    D.arrow(ctx, box.x + box.w * 0.10, top + chH * 0.5, cx - chW * 0.9, top + chH * 0.5, { color: blue, width: 2.4, label: "體循環回血" });
    D.arrow(ctx, cx - chW / 2 - 2, top + chH * 2.3, box.x + box.w * 0.10, top + chH * 2.3, { color: blue, width: 2.4, label: "→ 肺動脈" });
    D.arrow(ctx, box.x + box.w * 0.90, top + chH * 0.5, cx + chW * 0.9, top + chH * 0.5, { color: red, width: 2.4, label: "肺靜脈" });
    D.arrow(ctx, cx + chW / 2 + 2, top + chH * 2.3, box.x + box.w * 0.90, top + chH * 2.3, { color: red, width: 2.4, label: "主動脈 →" });
    if (o.rate != null) badge(ctx, cx, box.y + box.h - 10, "心率 " + o.rate + " bpm", PL.col("accent"));
    return { cx, cy, top };
  }

  /*
   * 胸腔與呼吸：肋骨、兩葉肺、橫膈。
   * o.inflate（0–1）肺脹程度；o.diaphragm（0–1）橫膈收縮壓平程度。
   */
  function lungChest(ctx, box, o) {
    o = o || {};
    const inflate = clamp(o.inflate == null ? 0.5 : o.inflate, 0, 1);
    const dia = clamp(o.diaphragm == null ? 0.5 : o.diaphragm, 0, 1);
    const cx = box.x + box.w / 2;
    const baseY = box.y + box.h * 0.92;
    const chestTop = box.y + box.h * 0.06;
    // 肋骨
    ctx.save();
    ctx.strokeStyle = "rgba(150,160,175,0.8)"; ctx.lineWidth = 2.4;
    for (let i = 0; i < 5; i++) {
      const y = chestTop + 14 + i * (baseY - chestTop - 30) / 5;
      ctx.beginPath();
      ctx.moveTo(cx - box.w * 0.30, y);
      ctx.quadraticCurveTo(cx - box.w * 0.42, y - 8, cx - box.w * 0.34, y - 16);
      ctx.moveTo(cx + box.w * 0.30, y);
      ctx.quadraticCurveTo(cx + box.w * 0.42, y - 8, cx + box.w * 0.34, y - 16);
      ctx.stroke();
    }
    ctx.restore();
    // 肺
    const lungH = (baseY - chestTop - 20) * (0.55 + inflate * 0.42);
    const lungTop = baseY - 8 - lungH;
    const lung = (side) => {
      const lx = cx + side * box.w * 0.17;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(lx - box.w * 0.13, lungTop);
      ctx.bezierCurveTo(lx - box.w * 0.19, lungTop + lungH * 0.4, lx - box.w * 0.16, baseY - 14, lx - box.w * 0.02, baseY - 8);
      ctx.lineTo(lx + box.w * 0.05, baseY - 8);
      ctx.bezierCurveTo(lx + box.w * 0.10, baseY - 20, lx + box.w * 0.10, lungTop + lungH * 0.3, lx + box.w * 0.02, lungTop);
      ctx.closePath();
      ctx.fillStyle = "rgba(120,180,220,0.35)"; ctx.fill();
      ctx.strokeStyle = "rgba(70,120,160,0.9)"; ctx.lineWidth = 1.6; ctx.stroke();
      // 支氣管
      ctx.strokeStyle = "rgba(70,120,160,0.8)"; ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(lx, lungTop + 6);
      ctx.lineTo(lx - side * 4, lungTop + lungH * 0.35);
      ctx.moveTo(lx, lungTop + 6);
      ctx.lineTo(lx + side * 2, lungTop + lungH * 0.4);
      ctx.stroke();
      ctx.restore();
    };
    lung(-1); lung(1);
    // 氣管
    D.rect(ctx, cx - 5, chestTop - 6, 10, lungTop - chestTop + 18, { fill: "rgba(150,160,175,0.8)", r: 4 });
    // 橫膈
    const diaY = baseY - 14 - (1 - dia) * (baseY - chestTop) * 0.22;
    ctx.save();
    ctx.strokeStyle = "#c96a4a"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx - box.w * 0.36, diaY + 6);
    ctx.quadraticCurveTo(cx, diaY - 18 - dia * 6, cx + box.w * 0.36, diaY + 6);
    ctx.stroke();
    ctx.restore();
    D.text(ctx, "橫膈", cx + box.w * 0.38, diaY + 10, { color: PL.col("text-dim"), size: 10 });
    return { lungTop, diaY };
  }

  /*
   * 神經元：樹突 → 本體 → 軸突（髓鞘節段）→ 末梢。
   * o.pulse（0–1）動作電位沿軸突的位置。
   */
  function neuron(ctx, x1, x2, y, o) {
    o = o || {};
    const somaX = x1 + (x2 - x1) * 0.14, somaR = 14;
    // 樹突
    ctx.save();
    ctx.strokeStyle = "rgba(120,150,180,0.95)"; ctx.lineWidth = 2; ctx.lineCap = "round";
    for (let i = -2; i <= 2; i++) {
      if (!i) continue;
      ctx.beginPath();
      ctx.moveTo(somaX - somaR * 0.6, y);
      ctx.quadraticCurveTo(somaX - somaR * 2.2, y + i * 14, somaX - somaR * 3.2, y + i * 22);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(somaX - somaR * 1.8, y + i * 10);
      ctx.lineTo(somaX - somaR * 2.6, y + i * 20 + 4);
      ctx.stroke();
    }
    ctx.restore();
    // 本體
    D.disc(ctx, somaX, y, somaR, { fill: "rgba(240,98,146,0.4)", stroke: "rgba(150,60,90,0.95)", width: 1.8 });
    D.disc(ctx, somaX, y, somaR * 0.38, { fill: "rgba(150,60,90,0.8)" });
    // 軸突
    const axonX1 = somaX + somaR, axonX2 = x2 - 26;
    D.line(ctx, axonX1, y, axonX2, y, "rgba(120,150,180,0.95)", 3);
    // 髓鞘
    const nSeg = Math.max(3, Math.floor((axonX2 - axonX1) / 34));
    for (let i = 0; i < nSeg; i++) {
      const sx = axonX1 + (axonX2 - axonX1) * (i + 0.12) / nSeg;
      const sw = (axonX2 - axonX1) / nSeg * 0.72;
      D.rect(ctx, sx, y - 6.5, sw, 13, { fill: "rgba(255,213,79,0.6)", stroke: "rgba(170,130,30,0.85)", width: 1.2, r: 6 });
    }
    // 脈衝
    if (o.pulse != null && o.pulse >= 0) {
      const px = axonX1 + clamp(o.pulse, 0, 1) * (axonX2 - axonX1);
      D.disc(ctx, px, y, 5.5, { fill: "#fff176", glow: "#ffd54f", glowSize: 12 });
      D.disc(ctx, px, y, 2.2, { fill: "#fff" });
    }
    // 末梢
    ctx.save();
    ctx.strokeStyle = "rgba(120,150,180,0.95)"; ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(axonX2, y);
      ctx.quadraticCurveTo(axonX2 + 16, y + i * 10, axonX2 + 26, y + i * 16);
      ctx.stroke();
      D.disc(ctx, axonX2 + 27, y + i * 16, 3.4, { fill: "rgba(240,98,146,0.75)" });
    }
    ctx.restore();
    return { axonX1, axonX2 };
  }

  /*
   * 突觸放大圖：突觸前末梢（囊泡）→ 間隙 → 突觸後膜（受器）。
   * o.release（0–1）囊泡釋放進度；o.bound（0–1）傳遞物與受器結合比例。
   */
  function synapseZoom(ctx, box, o) {
    o = o || {};
    const release = clamp(o.release == null ? 0 : o.release, 0, 1);
    const bound = clamp(o.bound == null ? 0 : o.bound, 0, 1);
    const preW = box.w * 0.34, preH = box.h * 0.62;
    const preX = box.x + box.w * 0.10, preY = box.y + box.h * 0.06;
    // 突觸前末梢
    D.rect(ctx, preX, preY, preW, preH, { fill: "rgba(240,98,146,0.28)", stroke: "rgba(150,60,90,0.9)", width: 1.6, r: preH * 0.45 });
    // 軸突進入
    D.rect(ctx, box.x - 6, preY + preH * 0.35, preX - box.x + 6, 14, { fill: "rgba(120,150,180,0.85)", r: 6 });
    // 囊泡
    const rnd = rng(9);
    for (let i = 0; i < 6; i++) {
      const vx = preX + 10 + rnd() * (preW - 26), vy = preY + 10 + rnd() * (preH - 26);
      D.disc(ctx, vx, vy, 5, { fill: "rgba(255,213,79,0.85)", stroke: "rgba(170,130,30,0.9)", width: 1 });
      D.disc(ctx, vx, vy, 1.8, { fill: "#a07820" });
    }
    // 釋放的傳遞物
    const gapY = preY + preH;
    for (let i = 0; i < 5; i++) {
      const fx = preX + preW * 0.3 + i * 7;
      const fy = gapY + 4 + release * (box.h * 0.72 - 14) * (0.7 + i * 0.08);
      if (fy < box.y + box.h * 0.84) D.disc(ctx, fx, fy, 2.6, { fill: "#ffd54f", glow: "#ffd54f", glowSize: 5 });
    }
    // 突觸後膜
    const postY = box.y + box.h * 0.84;
    ctx.save();
    ctx.strokeStyle = "rgba(100,181,246,0.95)"; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(box.x + box.w * 0.42, postY);
    ctx.lineTo(box.x + box.w * 0.98, postY);
    ctx.stroke(); ctx.restore();
    // 受器
    const nRec = 4;
    for (let i = 0; i < nRec; i++) {
      const rx = box.x + box.w * (0.5 + i * 0.13);
      D.rect(ctx, rx - 5, postY - 8, 10, 8, { fill: i / nRec < bound ? "rgba(102,187,106,0.9)" : "rgba(100,181,246,0.55)", r: 2 });
    }
    D.text(ctx, "突觸前末梢", preX + preW / 2, preY - 6, { color: PL.col("text-dim"), size: 10, align: "center" });
    D.text(ctx, "突觸後膜", box.x + box.w * 0.70, postY + 14, { color: PL.col("text-dim"), size: 10, align: "center" });
    return { gapY, postY };
  }

  /* ------------------------------ 生態 ------------------------------ */
  /*
   * 能量塔：levels 由底到頂 = [{label, energy}]。
   * 寬度依 o.scale（"sqrt"|"linear"）壓縮，回傳每層中心。
   */
  function energyPyramid(ctx, box, levels, o) {
    o = o || {};
    const scale = o.scale || "sqrt";
    const maxV = Math.max(...levels.map(l => l.energy));
    const n = levels.length;
    const segH = box.h / n;
    const centers = [];
    const widthOf = v => box.w * (scale === "sqrt" ? Math.sqrt(v / maxV) : v / maxV) * 0.96;
    levels.forEach((l, i) => {
      const y1 = box.y + box.h - (i + 1) * segH;
      const w1 = widthOf(l.energy), w0 = widthOf(levels[i - 1] ? levels[i - 1].energy : l.energy * 1.4);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(box.x + box.w / 2 - w0 / 2, y1 + segH);
      ctx.lineTo(box.x + box.w / 2 + w0 / 2, y1 + segH);
      ctx.lineTo(box.x + box.w / 2 + w1 / 2, y1 + 2);
      ctx.lineTo(box.x + box.w / 2 - w1 / 2, y1 + 2);
      ctx.closePath();
      ctx.fillStyle = l.color || "rgba(102,187,106,0.5)";
      ctx.fill();
      ctx.strokeStyle = "rgba(30,80,40,0.6)"; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.restore();
      D.text(ctx, l.label + "　" + PL.fmt(l.energy, 0) + (o.unit || " kJ"), box.x + box.w / 2, y1 + segH * 0.58, { color: "#fff", size: 11, align: "center", weight: "700" });
      centers.push({ y: y1 + segH / 2, w: w1 });
    });
    return { centers };
  }

  // 食物網節點與連結
  function webNode(ctx, cx, cy, label, color, r) {
    D.disc(ctx, cx, cy, r || 22, { fill: color || "rgba(121,134,203,0.55)", stroke: "rgba(60,70,120,0.8)", width: 1.4 });
    D.text(ctx, label, cx, cy + 3.5, { color: "#fff", size: 10.5, align: "center", weight: "700" });
  }
  function webLink(ctx, x1, y1, x2, y2, o) {
    o = o || {};
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - (o.bow || 18);
    ctx.save();
    ctx.strokeStyle = o.color || "rgba(140,160,180,0.85)"; ctx.lineWidth = o.width || 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(mx, my, x2, y2);
    ctx.stroke();
    const a = Math.atan2(y2 - my, x2 - mx);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 8 * Math.cos(a - 0.4), y2 - 8 * Math.sin(a - 0.4));
    ctx.lineTo(x2 - 8 * Math.cos(a + 0.4), y2 - 8 * Math.sin(a + 0.4));
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  /* ------------------------------ 粒子 ------------------------------ */
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }
  /*
   * 粒子盒：state = solid / liquid / gas。
   * 生物版用來表現水分子運動、擴散、氣體交換等。
   */
  function particleBox(ctx, box, o) {
    o = o || {};
    const state = o.state || "gas", tempN = clamp(o.temp == null ? 0.5 : o.temp, 0, 1);
    const n = o.count || 42, rnd = rng(o.seed || 7);
    const cols = Math.ceil(Math.sqrt(n * box.w / box.h)), rows = Math.ceil(n / cols);
    const cellW = box.w / cols, cellH = box.h / rows;
    const color = o.color || "#7fc8ff";
    const t = o.time || 0;
    D.rect(ctx, box.x, box.y, box.w, box.h, { stroke: PL.col("border"), width: 1.4, r: 8, fill: o.bg || "rgba(120,180,220,0.05)" });
    for (let i = 0; i < n; i++) {
      const baseX = box.x + cellW * ((i % cols) + 0.5), baseY = box.y + cellH * (Math.floor(i / cols) + 0.5);
      const jx = (rnd() - 0.5) * cellW * 0.55, jy = (rnd() - 0.5) * cellH * 0.55;
      let x = baseX + jx, y = baseY + jy, r = o.radius || 5;
      if (state === "solid") {
        x += Math.sin(t * 6 + i) * 0.7 * (0.4 + tempN);
        y += Math.cos(t * 7 + i * 1.7) * 0.7 * (0.4 + tempN);
      } else if (state === "liquid") {
        x += Math.sin(t * (1.1 + tempN) + i * 1.3) * cellW * 0.22;
        y += Math.cos(t * (1.4 + tempN) + i * 0.9) * cellH * 0.22;
      } else {
        const sp = 0.5 + tempN * 1.6;
        x += Math.sin(t * sp + i * 2.1) * cellW * 0.42;
        y += Math.cos(t * sp * 1.23 + i * 1.7) * cellH * 0.42;
      }
      if (x < box.x + r) x = box.x + r; if (x > box.x + box.w - r) x = box.x + box.w - r;
      if (y < box.y + r) y = box.y + r; if (y > box.y + box.h - r) y = box.y + box.h - r;
      D.disc(ctx, x, y, r, { fill: color, glow: o.glow || null, glowSize: 6 });
      D.disc(ctx, x - r * 0.3, y - r * 0.3, r * 0.32, { fill: "rgba(255,255,255,0.55)" });
    }
    D.text(ctx, o.label || "", box.x + 6, box.y + 14, { color: PL.col("text-dim"), size: 10 });
  }

  // 分子模型（沿用化學版同一套：atoms = [{el,x,y,r}]，bonds = [[i,j,order]]）
  function molecule(ctx, cx, cy, atoms, bonds, scale, angle) {
    const ca = Math.cos(angle || 0), sa = Math.sin(angle || 0);
    const P = atoms.map(a => ({
      x: cx + (a.x * ca - a.y * sa) * scale,
      y: cy + (a.x * sa + a.y * ca) * scale,
      r: (a.r || 0.34) * scale,
      el: a.el, label: a.label
    }));
    (bonds || []).forEach(b => {
      const A = P[b[0]], B = P[b[1]], order = b[2] || 1;
      const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      for (let k = 0; k < order; k++) {
        const off = (k - (order - 1) / 2) * 4.4;
        D.line(ctx, A.x + nx * off, A.y + ny * off, B.x + nx * off, B.y + ny * off, PL.col("text-dim"), order === 1 ? 3.4 : 2.2);
      }
    });
    P.forEach(p => {
      D.disc(ctx, p.x, p.y, p.r, { fill: p.color || elementColor(p.el), stroke: "rgba(0,0,0,0.25)", width: 1 });
      D.text(ctx, p.label || p.el, p.x, p.y + p.r * 0.34, {
        color: p.el === "C" ? "#fff" : "#18202b",
        size: Math.max(9, Math.round(p.r * 0.9)), align: "center", weight: "700"
      });
    });
    return P;
  }
  const MOLECULES = {
    H2O: { atoms: [{ el: "O", x: 0, y: 0, r: 0.42 }, { el: "H", x: -0.58, y: 0.42, r: 0.26 }, { el: "H", x: 0.58, y: 0.42, r: 0.26 }], bonds: [[0, 1], [0, 2]] },
    CO2: { atoms: [{ el: "C", x: 0, y: 0, r: 0.38 }, { el: "O", x: -0.78, y: 0, r: 0.4 }, { el: "O", x: 0.78, y: 0, r: 0.4 }], bonds: [[0, 1, 2], [0, 2, 2]] },
    O2: { atoms: [{ el: "O", x: -0.42, y: 0, r: 0.4 }, { el: "O", x: 0.42, y: 0, r: 0.4 }], bonds: [[0, 1, 2]] },
    glucose: {
      atoms: [{ el: "C", x: -0.6, y: -0.35, r: 0.34 }, { el: "C", x: -0.6, y: 0.35, r: 0.34 }, { el: "C", x: 0, y: 0.7, r: 0.34 }, { el: "C", x: 0.6, y: 0.35, r: 0.34 }, { el: "C", x: 0.6, y: -0.35, r: 0.34 }, { el: "C", x: 0, y: -0.7, r: 0.34 },
        { el: "O", x: -1.15, y: 0, r: 0.3 }, { el: "O", x: 1.15, y: 0, r: 0.3 }],
      bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [1, 6], [4, 7]]
    }
  };
  function moleculeByName(ctx, cx, cy, name, scale, angle) {
    const m = MOLECULES[name];
    if (!m) return null;
    return molecule(ctx, cx, cy, m.atoms, m.bonds, scale, angle);
  }

  /* ------------------------------ 圖表與小工具 ------------------------------ */
  function plot(cv, o) {
    cv.clear();
    const ctx = cv.ctx, W = cv.W, H = cv.H;
    const box = o.box || { x: 52, y: 18, w: W - 68, h: H - 48 };
    const g = PL.graph(cv, box, { x0: o.x0, x1: o.x1, y0: o.y0, y1: o.y1 });
    g.frame({ xlabel: o.xlabel, ylabel: o.ylabel, title: o.title, xticks: o.xticks, yticks: o.yticks });
    g.grid(o.xticks || 4, o.yticks || 4);
    (o.series || []).forEach(s => {
      if (typeof s.fn === "function") g.fn(s.fn, { color: s.color, width: s.width || 2.2, dash: s.dash });
      else if (s.pts) g.curve(s.pts, { color: s.color, width: s.width || 2.2, dash: s.dash });
    });
    (o.marks || []).forEach(m => {
      if (m.vline != null) g.vline(m.vline, { color: m.color, label: m.label, dash: m.dash });
      if (m.hline != null) g.hline(m.hline, { color: m.color, dash: m.dash });
      if (m.dot) g.dot(m.dot[0], m.dot[1], { color: m.color, r: m.r, label: m.label });
    });
    return g;
  }

  function badge(ctx, x, y, text, color) {
    const w = Math.max(44, String(text).length * 12 + 14);
    D.rect(ctx, x - w / 2, y - 11, w, 22, { fill: color || PL.col("accent"), r: 11 });
    D.text(ctx, text, x, y + 4, { color: "#fff", size: 11, align: "center", weight: "700" });
  }
  function panel(ctx, x, y, w, h, title) {
    D.rect(ctx, x, y, w, h, { fill: PL.theme.shade(0.55), stroke: PL.col("border"), r: 8 });
    if (title) D.text(ctx, title, x + 10, y + 17, { color: PL.col("text-dim"), size: 11, weight: "700" });
  }
  function arrow(ctx, x1, y1, x2, y2, color, label) {
    D.arrow(ctx, x1, y1, x2, y2, { color: color || PL.col("accent"), width: 2.2, label });
  }
  function legend(ctx, x, y, items, gap) {
    let cy = y;
    (items || []).forEach(it => {
      D.disc(ctx, x + 5, cy - 4, 4, { fill: it.color });
      D.text(ctx, it.label, x + 15, cy, { color: PL.col("text-dim"), size: 10 });
      cy += gap || 18;
    });
  }
  function meter(ctx, x, y, w, h, frac, o) {
    o = o || {};
    const f = clamp(frac == null ? 0 : frac, 0, 1);
    D.rect(ctx, x, y, w, h, { fill: PL.theme.shade(0.5), stroke: PL.col("border"), r: h / 2 });
    if (f > 0) D.rect(ctx, x + 1, y + 1, Math.max(2, (w - 2) * f), h - 2, { fill: o.color || PL.col("accent"), r: (h - 2) / 2 });
    if (o.label) D.text(ctx, o.label, x, y - 7, { color: PL.col("text-faint"), size: 9 });
    return f;
  }
  function counter(ctx, x, y, w, count, o) {
    o = o || {};
    const r = o.r || 4, gap = r * 3;
    const perRow = Math.max(1, Math.floor(w / gap));
    for (let i = 0; i < Math.max(0, count); i++) {
      const px = x + (i % perRow) * gap, py = y + Math.floor(i / perRow) * gap;
      D.disc(ctx, px, py, r, { fill: o.color || PL.col("accent"), stroke: o.stroke });
    }
  }

  /* ------------------------------ 教學鷹架保險 ------------------------------ */
  function hasTeachingScaffold(root) {
    return [".sim-verdict", ".sim-causality", ".sim-procedure-card", ".sim-derived",
            ".sim-presets", ".sim-relations", ".sim-challenge", ".sim-poe"]
      .some(sel => root.querySelectorAll(sel).length > 0);
  }
  PL._hooks.onBuilt(context => {
    const root = context.root;
    if (!root || !root.dataset || root.dataset.labScaffold !== "1") return;
    if (hasTeachingScaffold(root)) return;
    const host = root.querySelector(".sim-control-deck .sim-controls") || root.querySelector(".sim-controls");
    const readouts = context.readouts || [];
    if (!host || !readouts.length) return;
    const sliders = context.sliders || [];
    const first = readouts[0], second = readouts[1];
    const s1 = sliders[0], s2 = sliders[1];
    const steps = [];
    if (s1) {
      steps.push("先只動「" + s1.label + "」這一個滑桿，其他控制項保持不變。");
      steps.push("盯住讀數「" + first.label + "」，把「" + s1.label + "」從最小拉到最大，記下兩端的值。");
    } else {
      steps.push("切換上方的選項，觀察畫面與讀數哪裡跟著變。");
      steps.push("盯住讀數「" + first.label + "」，把每個選項都看過一次並記錄。");
    }
    if (s2) {
      steps.push("再單獨動「" + s2.label + "」，比較它和「" + s1.label + "」哪一個影響比較大。");
    } else if (second) {
      steps.push("再看讀數「" + second.label + "」，確認它和「" + first.label + "」是不是同步變化。");
    }
    steps.push("用一句話寫下量到的關係：「＿＿變大時，「" + first.label + "」＿＿」。");
    PL.ui.procedure(host, {
      title: "怎麼做這個實驗",
      steps,
      rule: "一次只改一個變因；同時動兩個控制項，就分不出是哪一個造成讀數改變。"
    });
  });

  window.BioLab = {
    ELEMENT_COLORS, MOLECULES, BASE_COLORS,
    elementColor, baseColor, phColor, mix, tintAlpha, benedictColor,
    scaffold, bench,
    beaker, testTube, tubeRack, dropper, drop, balance, hotplate, burner, thermometer,
    meter, wire, electrode,
    microscope, slide, cellBody, mitochondrion, chloroplast,
    bilayer, dnaHelix, chromosome, punnett, pedigreePerson, pedigreeLink, pedigreeDrop,
    gelBox, petri, virusShape, antibodyY,
    leafCross, waterWeed, flower,
    heartFlow, lungChest, neuron, synapseZoom,
    energyPyramid, webNode, webLink,
    particleBox, molecule, moleculeByName,
    plot, badge, panel, arrow, legend, meter, counter,
    clamp, lerp, fmt: PL.fmt
  };
})();
