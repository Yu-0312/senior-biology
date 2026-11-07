/* 模組六 · 動物的營養與循環 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, CK = window.BioLab, D = PL.draw;
  const { clamp, lerp, TAU } = PL;

  // 穩定偽隨機:同一索引永遠回同一個值,標記點不會每格亂跳
  function rnd(i) { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  // 沿折線取點(pts 為比例座標,f 為 0–1),回傳 [x, y]
  function onPath(pts, f) {
    let tot = 0; const segs = [];
    for (let i = 1; i < pts.length; i++) { tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(tot); }
    const d = clamp(f, 0, 1) * tot;
    for (let i = 0; i < segs.length; i++) {
      const a = i ? segs[i - 1] : 0, b = segs[i];
      if (d <= b || i === segs.length - 1) { const k = b > a ? (d - a) / (b - a) : 0; return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)]; }
    }
    return [pts[0][0], pts[0][1]];
  }
  // 粗管折線(消化道、血管共用)
  function poly(ctx, pts, i0, i1, color, w) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.beginPath();
    for (let i = i0; i <= i1; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke(); ctx.restore();
  }

  /* 消化系統與食物路徑 */
  PL.register("digestive-system", {
    build(root) {
      const ORGANS = {
        mouth:   { name: "口腔", juice: "唾液澱粉酶", work: "咀嚼磨碎食物,澱粉開始分解", stay: 1 },
        eso:     { name: "食道", juice: "黏液(不含消化酶)", work: "蠕動把食團推入胃", stay: 0.1 },
        stomach: { name: "胃", juice: "鹽酸＋胃蛋白酶", work: "攪成食糜、殺菌、分解蛋白質", stay: 180 },
        small:   { name: "小腸", juice: "胰液＋腸液＋膽汁", work: "膽汁乳化脂肪;養分在此吸收", stay: 240 },
        large:   { name: "大腸", juice: "腸道菌發酵", work: "回收水分與鹽分,形成糞便", stay: 900 }
      };
      const ORDER = ["mouth", "eso", "stomach", "small", "large"];
      // 食團航點:口腔→食道→胃(J 形)→小腸(蛇行)→大腸(框架)→直腸
      const PATH = [
        [0.305, 0.105], [0.305, 0.30],
        [0.34, 0.35], [0.425, 0.38], [0.41, 0.45], [0.335, 0.475],
        [0.40, 0.51], [0.19, 0.55], [0.43, 0.59], [0.19, 0.63], [0.43, 0.67], [0.20, 0.705],
        [0.155, 0.76], [0.155, 0.53], [0.475, 0.53], [0.475, 0.76], [0.40, 0.815],
        [0.33, 0.865]
      ];
      const CUM = [0];
      for (let i = 1; i < PATH.length; i++) CUM.push(CUM[i - 1] + Math.hypot(PATH[i][0] - PATH[i - 1][0], PATH[i][1] - PATH[i - 1][1]));
      const TOT = CUM[17], fEso = CUM[1] / TOT, fSto = CUM[5] / TOT, fSm = CUM[11] / TOT;
      const BOUNDS = [0.012, fEso, fSto, fSm, 1];
      const organOf = f => f < BOUNDS[0] ? "mouth" : f < fEso ? "eso" : f < fSto ? "stomach" : f < fSm ? "small" : "large";
      const absorb = f => f < fSto ? 0 : f < fSm ? (f - fSto) / (fSm - fSto) * 90 : 90 + (f - fSm) / (1 - fSm) * 6;
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const f = pushS.get(), peri = periS.get(), zoomKey = orgSel.get(), og = ORGANS[zoomKey];
          const P = PATH.map(p => [p[0] * W, p[1] * H]);
          const cur = organOf(f), HI = PL.col("accent-2"), HL = { eso: [0, 1], small: [5, 11], large: [11, 17] };
          D.disc(ctx, P[0][0], P[0][1], 9, { fill: "rgba(226,160,150,0.5)", stroke: "rgba(150,80,70,0.8)", width: 1.4 });
          poly(ctx, P, 0, 1, "rgba(226,160,150,0.35)", 12);
          ctx.save();
          ctx.beginPath(); ctx.ellipse(W * 0.375, H * 0.405, W * 0.072, H * 0.068, -0.5, 0, TAU);
          ctx.fillStyle = "rgba(226,160,150,0.32)"; ctx.fill(); ctx.strokeStyle = "rgba(160,85,75,0.85)"; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore();
          poly(ctx, P, 5, 11, "rgba(228,170,150,0.42)", 11);
          poly(ctx, P, 11, 17, "rgba(196,146,112,0.5)", 16);
          for (let i = 0; i < 3; i++) D.ring(ctx, P[0][0], lerp(P[0][1], P[1][1], 0.3 + i * 0.22), 7 + peri * 3, "rgba(150,80,70,0.5)", 2);
          [["口腔", 0.305, 0.072], ["食道", 0.355, 0.20], ["胃", 0.462, 0.425], ["小腸", 0.315, 0.61], ["大腸", 0.10, 0.645], ["直腸", 0.375, 0.878]].forEach(lb => D.text(ctx, lb[0], lb[1] * W, lb[2] * H, { color: PL.col("text-dim"), size: 10, align: "center" }));
          if (HL[zoomKey]) poly(ctx, P, HL[zoomKey][0], HL[zoomKey][1], HI, 3);
          if (zoomKey === "stomach") D.ring(ctx, W * 0.375, H * 0.405, W * 0.078, HI, 3, [6, 4]);
          if (zoomKey === "mouth") D.ring(ctx, P[0][0], P[0][1], 13, HI, 2.4);
          const bp = onPath(PATH, f);
          D.disc(ctx, bp[0] * W, bp[1] * H, 6.5, { fill: absorb(f) > 60 ? "rgba(120,100,70,0.95)" : absorb(f) > 5 ? "rgba(195,160,90,0.95)" : "rgba(140,105,80,0.95)", glow: "#ffd54f", glowSize: 10 });
          D.text(ctx, ORGANS[cur].name, bp[0] * W, bp[1] * H - 13, { color: PL.col("text"), size: 10.5, align: "center", weight: "700" });
          CK.panel(ctx, W * 0.62, H * 0.12, W * 0.34, H * 0.62, "器官特寫:" + og.name);
          D.text(ctx, "分泌液:" + og.juice, W * 0.64, H * 0.25, { color: PL.col("text"), size: 11 });
          D.text(ctx, "任務:" + og.work, W * 0.64, H * 0.32, { color: PL.col("text-dim"), size: 10.5 });
          const dwell = og.stay / (0.35 + peri * 1.3);
          D.text(ctx, "停留時間:" + (dwell >= 90 ? PL.fmt(dwell / 60, 1) + " 小時" : PL.fmt(dwell, 0) + " 分"), W * 0.64, H * 0.39, { color: PL.col("text-dim"), size: 10.5 });
          D.text(ctx, zoomKey === "small" ? "皺褶→絨毛→微絨毛:面積放大上千倍" : zoomKey === "stomach" ? "胃酸 pH 約 2,並活化胃蛋白酶" : zoomKey === "large" ? "每天回收約 1.5 L 水分" : zoomKey === "mouth" ? "唾液每天分泌約 1–1.5 L" : "環肌收縮波把食物一節一節往前推", W * 0.64, H * 0.47, { color: PL.col("text-faint"), size: 10 });
          let mins = 0;
          BOUNDS.forEach((b, i) => { const a = i ? BOUNDS[i - 1] : 0, st = ORGANS[ORDER[i]].stay; if (f > b) mins += st; else if (f > a) mins += st * (f - a) / (b - a); });
          rPos.set(ORGANS[cur].name); rAbs.set(absorb(f), 1);
          rState.set(cur === "mouth" || cur === "eso" ? "食團" : cur === "stomach" ? "食糜(pH 約 2)" : cur === "small" ? "乳糜——養分釋出" : "糞便(水分回收中)"); rTime.set(mins / (0.35 + peri * 1.3), 0);
          vd.set(cur === "small" ? "小腸是吸收主場:約 90% 的養分在此進入血液與淋巴" : cur === "stomach" ? "胃負責殺菌與蛋白質分解,幾乎不吸收養分" : cur === "large" ? "養分吸收已結束,大腸只回收水分" : "消化剛開始:目前只有澱粉酵素上工", cur === "small" ? "ok" : "info");
        }
      });
      const orgSel = PL.ui.select(ui.L.controls, { label: "特寫器官", value: "small", options: ORDER.map(k => ({ value: k, label: ORGANS[k].name })) });
      const pushS = PL.ui.slider(ui.L.controls, { label: "消化推進", min: 0, max: 1, step: 0.02, value: 0.42, digits: 2 });
      const periS = PL.ui.slider(ui.L.controls, { label: "蠕動強度", min: 0.2, max: 1, step: 0.05, value: 0.7, digits: 2 });
      PL.ui.note(ui.L.controls, "消化道其實是「體外」的管子:大分子必須被酵素拆成小分子,穿過小腸壁進入血液,才算真正進入體內。");
      PL.ui.procedure(ui.L.controls, { title: "追蹤一頓飯", steps: ["拉動「消化推進」,讀出食團經過的構造與順序。", "停在任一器官,切換「特寫器官」對照它的分泌液與任務。", "把「蠕動強度」調低再看停留時間:蠕動變慢,消化就遲滯。"],
        rule: "膽汁不含消化酶,只把脂肪「乳化」成小滴讓脂肪酶接手——乳化是物理變化,不算化學消化。" });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "剛吞下", apply: () => { pushS.set(0.05); periS.set(0.7); ui.redraw(); } },
        { label: "胃中消化", apply: () => { pushS.set(0.28); ui.redraw(); } },
        { label: "小腸吸收中", apply: () => { pushS.set(0.5); ui.redraw(); } },
        { label: "形成糞便", apply: () => { pushS.set(0.92); ui.redraw(); } }
      ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "階段判定" });
      const rPos = PL.ui.readout(ui.L.readouts, { label: "食團位置" }), rAbs = PL.ui.readout(ui.L.readouts, { label: "累積養分吸收", unit: "%" });
      const rState = PL.ui.readout(ui.L.readouts, { label: "食糜狀態" }), rTime = PL.ui.readout(ui.L.readouts, { label: "推進累計時間", unit: "分" });
      const ch = ui.chart("累積吸收曲線", "胃段幾乎是平的(不吸收),進入小腸後陡升——吸收集中發生在小腸,大腸只剩水分回收。");
      const dc = () => CK.plot(ch, { x0: 0, x1: 1, y0: 0, y1: 100, xlabel: "消化推進", ylabel: "累積吸收 (%)",
        series: [{ pts: [[0, 0], [fEso, 0], [fSto, 0], [fSm, 90], [1, 96]], color: PL.col("accent") }],
        marks: [{ dot: [pushS.get(), absorb(pushS.get())], color: PL.col("accent-2"), label: "目前" }] });
      ch.onResize(dc); dc();
      root.addEventListener("input", dc); root.addEventListener("change", dc);
      return { stop() { ui.stop(); } };
    }
  });

  /* 小腸絨毛與吸收面積 */
  PL.register("absorption-villi", {
    build(root) {
      const ZOOMS = {
        fold:  { name: "腸壁皺褶", note: "黏膜層凹凸起伏,先把管壁面積放大約 3 倍" },
        villus:{ name: "絨毛", note: "指狀突起深入管腔,內含微血管與中央乳糜管" },
        micro: { name: "微絨毛(刷狀緣)", note: "腸細胞膜上的突起,再把面積放大數十倍" }
      };
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const zoom = zoomSel.get(), dens = densS.get(), c = concS.get(), z = ZOOMS[zoom];
          const amp = 3 * (5 + dens * 9) * 25, rate = 100 * c / (0.3 + c) * amp / 1050;
          if (zoom === "fold") {
            D.rect(ctx, W * 0.06, H * 0.64, W * 0.44, H * 0.09, { fill: "rgba(239,152,74,0.25)", stroke: "rgba(190,95,20,0.8)", width: 1.4, r: 6 });
            const nF = 2 + Math.round(dens * 2);
            for (let i = 0; i < nF; i++) {
              const fx = W * 0.13 + (i + 0.5) * (W * 0.30 / nF), fh = H * (0.10 + dens * 0.08);
              ctx.save();
              ctx.beginPath(); ctx.moveTo(fx - W * 0.15 / nF, H * 0.56); ctx.quadraticCurveTo(fx, H * 0.56 - fh * 2, fx + W * 0.15 / nF, H * 0.56); ctx.closePath();
              ctx.fillStyle = "rgba(226,160,150,0.35)"; ctx.fill(); ctx.strokeStyle = "rgba(160,85,75,0.9)"; ctx.lineWidth = 1.8; ctx.stroke(); ctx.restore();
              const nV = Math.round(2 + dens * 4);
              for (let k = 0; k < nV; k++) {
                const vx = fx - W * 0.05 + k * (W * 0.10 / Math.max(1, nV - 1));
                D.line(ctx, vx, H * 0.56 - fh * 1.25, vx, H * 0.56 - fh * 1.25 - H * 0.05, "rgba(160,85,75,0.85)", 3);
              }
            }
          } else if (zoom === "villus") {
            D.rect(ctx, W * 0.06, H * 0.66, W * 0.44, H * 0.07, { fill: "rgba(239,152,74,0.25)", stroke: "rgba(190,95,20,0.8)", width: 1.4, r: 6 });
            for (let v = 0; v < 3; v++) {
              const vx = W * 0.14 + v * W * 0.145, vy = H * 0.40, vh = H * 0.16 * (0.85 + dens * 0.3);
              ctx.save();
              ctx.beginPath(); ctx.moveTo(vx - W * 0.042, vy + vh); ctx.quadraticCurveTo(vx - W * 0.048, vy - vh * 0.6, vx, vy - vh); ctx.quadraticCurveTo(vx + W * 0.048, vy - vh * 0.6, vx + W * 0.042, vy + vh); ctx.closePath();
              ctx.fillStyle = "rgba(226,160,150,0.35)"; ctx.fill(); ctx.strokeStyle = "rgba(160,85,75,0.9)"; ctx.lineWidth = 1.8; ctx.stroke(); ctx.restore();
              D.line(ctx, vx, vy + vh * 0.8, vx, vy - vh * 0.5, "rgba(230,200,90,0.85)", 4);
              ctx.save(); ctx.strokeStyle = "rgba(220,90,80,0.85)"; ctx.lineWidth = 2;
              ctx.beginPath(); ctx.moveTo(vx - W * 0.028, vy + vh * 0.8); ctx.quadraticCurveTo(vx - W * 0.033, vy - vh * 0.2, vx, vy - vh * 0.7); ctx.quadraticCurveTo(vx + W * 0.033, vy - vh * 0.2, vx + W * 0.028, vy + vh * 0.8); ctx.stroke(); ctx.restore();
              for (let i = 0; i < Math.round(clamp(rate / 14, 1, 5)); i++) {
                const p = ((t * 0.10 + i / 5 + v * 0.21) % 1 + 1) % 1;
                D.disc(ctx, vx + (v % 2 ? 1 : -1) * (W * 0.03 - p * W * 0.018), vy + vh * 0.7 - p * vh * 1.4, 2.6, { fill: "#ef8829" });
              }
            }
            D.text(ctx, "黃:乳糜管收脂質→淋巴;紅:微血管收醣與胺基酸→肝門靜脈", W * 0.28, H * 0.12, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          } else {
            const bx = { x: W * 0.10, y: H * 0.46, w: W * 0.38, h: H * 0.14 };
            for (let i = 0; i < 12; i++) { const mx = bx.x + 6 + i * (bx.w - 12) / 11; D.line(ctx, mx, bx.y, mx, bx.y - 8 - dens * 9, "rgba(160,85,75,0.8)", 2.4); }
            CK.bilayer(ctx, bx, { proteins: [{ x: 0.15, channel: true, label: "載運蛋白" }, { x: 0.5, channel: true }, { x: 0.85, label: "鈉鉀幫浦" }] });
            for (let i = 0; i < Math.round(clamp(c * 6, 1, 6)); i++) {
              const p = ((t * 0.12 + i / 6) % 1 + 1) % 1;
              D.disc(ctx, bx.x + bx.w * (0.12 + i * 0.07), bx.y - 14 + p * (bx.h + 22), 2.8, { fill: "#ef8829", glow: "#ffb74d", glowSize: 5 });
            }
            D.text(ctx, "刷狀緣:每個腸細胞約 2000 條微絨毛", bx.x + bx.w / 2, bx.y - 30 - dens * 9, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          }
          CK.panel(ctx, W * 0.56, H * 0.12, W * 0.40, H * 0.62, "放大層級:" + z.name);
          D.text(ctx, z.note, W * 0.58, H * 0.22, { color: PL.col("text-dim"), size: 10.5 });
          D.text(ctx, "三層相乘 ≈ ×" + PL.fmt(amp, 0) + "(皺褶×3 × 絨毛×" + PL.fmt(5 + dens * 9, 1) + " × 微絨毛×25)", W * 0.58, H * 0.30, { color: PL.col("accent"), size: 12, weight: "700" });
          D.text(ctx, "吸收速率 ∝ 濃度 × 面積(載運蛋白飽和前);絨毛擺動加快接觸更新", W * 0.58, H * 0.40, { color: PL.col("text-dim"), size: 10.5 });
          rAmp.set("×" + PL.fmt(amp, 0)); rRate.set(rate, 1);
          rBlood.set(rate * 0.7, 1); rLym.set(rate * 0.3, 1);
          vd.set(dens < 0.3 ? "絨毛萎縮:吸收面積大減,會腹瀉與營養不良(如乳糜瀉)" : c < 0.15 ? "管腔養分太少:面積再大也沒料可吸" : "面積與濃度雙重到位:吸收效率高", dens < 0.3 ? "bad" : "ok");
        }
      });
      const zoomSel = PL.ui.select(ui.L.controls, { label: "放大層級", value: "fold", options: Object.keys(ZOOMS).map(k => ({ value: k, label: ZOOMS[k].name })) });
      const densS = PL.ui.slider(ui.L.controls, { label: "絨毛密度", min: 0.1, max: 1, step: 0.05, value: 0.8, digits: 2 });
      const concS = PL.ui.slider(ui.L.controls, { label: "管腔養分濃度", min: 0, max: 1, step: 0.05, value: 0.5, digits: 2 });
      PL.ui.note(ui.L.controls, "小腸長約 6 公尺,內壁攤平約 30 平方公尺——接近一個羽球場,全靠皺褶、絨毛、微絨毛三層放大疊出來。");
      PL.ui.procedure(ui.L.controls, { title: "看懂面積放大", steps: ["切換三個放大層級,確認每一層的形狀與位置。", "把絨毛密度從 0.1 拉到 1,看面積倍率與吸收速率怎麼變。", "固定密度再拉高養分濃度:速率會飽和,不再是直線上升。"],
        rule: "小腸不靠吸收「快」取勝,靠接觸面「大」:三層放大少掉任何一層,都少一個數量級。" });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "正常腸道", apply: () => { densS.set(0.8); concS.set(0.5); ui.redraw(); } },
        { label: "絨毛萎縮", apply: () => { densS.set(0.15); ui.redraw(); } },
        { label: "高糖餐後", apply: () => { densS.set(0.8); concS.set(0.95); ui.redraw(); } }
      ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "吸收狀態" });
      const rAmp = PL.ui.readout(ui.L.readouts, { label: "有效面積倍率" }), rRate = PL.ui.readout(ui.L.readouts, { label: "相對吸收速率" });
      const rBlood = PL.ui.readout(ui.L.readouts, { label: "入血(醣/胺基酸)" }), rLym = PL.ui.readout(ui.L.readouts, { label: "入淋巴(脂質)" });
      const ch = ui.chart("吸收速率 vs 養分濃度", "飽和曲線:載運蛋白全占滿後,濃度再高速率也不動;絨毛密度拉高,等於把整條曲線抬高。");
      const dc = () => {
        const amp = 3 * (5 + densS.get() * 9) * 25, cs = concS.get();
        CK.plot(ch, { x0: 0, x1: 1, y0: 0, y1: 120, xlabel: "管腔養分濃度", ylabel: "相對吸收速率",
          series: [{ fn: cc => 100 * cc / (0.3 + cc) * amp / 1050, color: PL.col("accent") }],
          marks: [{ dot: [cs, 100 * cs / (0.3 + cs) * amp / 1050], color: PL.col("accent-2"), label: "目前" }] });
      };
      ch.onResize(dc); dc();
      root.addEventListener("input", dc); root.addEventListener("change", dc);
      return { stop() { ui.stop(); } };
    }
  });

  /* 心臟構造與血液循環 */
  PL.register("heart-structure", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const hr = hrS.get(), con = conS.get();
          const ph = (t * hr / 60) % 1, beat = ph < 0.35 ? con * Math.sin(Math.PI * ph / 0.35) : 0;
          const box = { x: W * 0.04, y: H * 0.10, w: W * 0.48, h: H * 0.70 };
          CK.heartFlow(ctx, box, { beat, rate: hr });
          // 瓣膜:房室瓣充填時開、半月瓣射血時開(位置與 heartFlow 腔室幾何一致)
          const hh = box.h * 0.40 * (0.9 + 0.1 * (1 - beat)), top = box.y + box.h * 0.55 - hh * 0.5, chH = hh * 0.52, cx = box.x + box.w / 2, chW = box.w * 0.3024;
          const valve = (x, y, open) => {
            ctx.save(); ctx.strokeStyle = "#f3e5f5"; ctx.lineWidth = 2.6; ctx.lineCap = "round"; ctx.beginPath();
            ctx.moveTo(x - 9, y); ctx.lineTo(x, y + (open ? 8 : 2)); ctx.lineTo(x + 9, y);
            ctx.stroke(); ctx.restore();
          };
          const avOpen = ph > 0.42, slOpen = ph > 0.03 && ph < 0.33;
          valve(cx - chW / 2 - 2, top + chH * 0.95, avOpen); valve(cx + chW / 2 + 2, top + chH * 0.95, avOpen);
          valve(cx - chW / 2 - 2, top + chH * 2.18, slOpen); valve(cx + chW / 2 + 2, top + chH * 2.18, slOpen);
          D.text(ctx, "房室瓣", cx, top + chH * 1.05, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          D.text(ctx, "半月瓣", cx, top + chH * 2.42, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          // 主動脈壓波形:峰隨收縮強度、週期數隨心率變化
          const dias = 70, sys = dias + 30 + con * 40, wx = W * 0.06, wy = H * 0.87, ww = W * 0.40, amp2 = H * 0.055;
          D.line(ctx, wx, wy, wx + ww, wy, PL.col("border"), 1);
          D.line(ctx, wx, wy - amp2 * 0.75, wx + ww, wy - amp2 * 0.75, "rgba(220,90,80,0.4)", 1, [4, 4]);
          D.text(ctx, PL.fmt(sys, 0), wx + ww + 4, wy - amp2 * 0.7, { color: PL.col("text-faint"), size: 9 });
          D.text(ctx, PL.fmt(dias, 0), wx + ww + 4, wy + 3, { color: PL.col("text-faint"), size: 9 });
          ctx.save();
          ctx.strokeStyle = "#d95555"; ctx.lineWidth = 2; ctx.beginPath();
          for (let xx = 0; xx <= ww; xx += 3) {
            const cph = ((xx / ww) * 3 * hr / 60 + t * hr / 60) % 1;
            const pk = cph < 0.35 ? Math.sin(Math.PI * cph / 0.35) : 0.25 * Math.exp(-(cph - 0.35) * 7);
            const py = wy - amp2 * (0.2 + 0.8 * pk);
            xx ? ctx.lineTo(wx + xx, py) : ctx.moveTo(wx + xx, py);
          }
          ctx.stroke(); ctx.restore();
          D.text(ctx, "主動脈壓波形", wx, wy + 12, { color: PL.col("text-faint"), size: 9.5 });
          CK.panel(ctx, W * 0.58, H * 0.12, W * 0.38, H * 0.64, "循環路徑");
          D.text(ctx, "肺循環(小循環)", W * 0.60, H * 0.20, { color: "#4a90d9", size: 11.5, weight: "700" });
          D.text(ctx, "右心室 → 肺動脈 → 肺泡", W * 0.60, H * 0.255, { color: PL.col("text-dim"), size: 10 });
          D.text(ctx, "→ 肺靜脈 → 左心房", W * 0.60, H * 0.305, { color: PL.col("text-dim"), size: 10 });
          D.text(ctx, "體循環(大循環)", W * 0.60, H * 0.385, { color: "#d95555", size: 11.5, weight: "700" });
          D.text(ctx, "左心室 → 主動脈 → 全身微血管", W * 0.60, H * 0.44, { color: PL.col("text-dim"), size: 10 });
          D.text(ctx, "→ 腔靜脈 → 右心房", W * 0.60, H * 0.49, { color: PL.col("text-dim"), size: 10 });
          D.text(ctx, "兩個循環串聯:血先繞肺裝氧,再繞全身卸氧", W * 0.60, H * 0.565, { color: PL.col("text-dim"), size: 10 });
          CK.badge(ctx, W * 0.77, H * 0.60, "冠狀循環:心肌自己的供血", "#b05555");
          D.text(ctx, "左心室壁最厚:要把血一路推到全身", W * 0.60, H * 0.68, { color: PL.col("text-faint"), size: 10 });
          const sv = 50 + con * 50, co = hr * sv / 1000;
          rHR.set(hr, 0); rSV.set(sv, 0); rCO.set(co, 1); rFill.set(0.65 * 60 / hr, 2);
          vd.set(hr < 60 ? "心跳偏慢:運動員常見,靠較大的每跳輸出補足" : hr > 100 ? "心跳偏快:交感神經活化(運動、緊張或發燒)" : "安靜心率 60–100:每分鐘約 5 L 血液流過全身", hr > 100 ? "warn" : hr < 60 ? "info" : "ok");
        }
      });
      const hrS = PL.ui.slider(ui.L.controls, { label: "心跳速率", min: 40, max: 180, step: 2, value: 72, unit: "bpm", digits: 0 });
      const conS = PL.ui.slider(ui.L.controls, { label: "收縮強度", min: 0.3, max: 1, step: 0.05, value: 0.6, digits: 2 });
      PL.ui.note(ui.L.controls, "心臟每天跳約 10 萬下、推送約 7000 L 血液;心肌不吃腔室裡的血,氧氣由冠狀動脈自己供應——冠狀動脈阻塞就是心肌梗塞。");
      PL.ui.procedure(ui.L.controls, { title: "看懂一個心跳週期", steps: ["對照心臟與下方血壓波形:收縮期(峰)與舒張期(谷)交替。", "把心跳速率拉到 180:看舒張充填時間讀數怎麼被壓縮。", "拉高收縮強度:波形峰變高,每跳輸出與心輸出量同步上升。"],
        rule: "心臟是兩個串聯的幫浦:右心送肺、左心送全身,兩邊每分鐘流量必須相等;瓣膜讓血只往前進,逆流就是心雜音。" });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "安靜", apply: () => { hrS.set(72); conS.set(0.6); ui.redraw(); } },
        { label: "輕度運動", apply: () => { hrS.set(105); conS.set(0.75); ui.redraw(); } },
        { label: "劇烈運動", apply: () => { hrS.set(168); conS.set(0.95); ui.redraw(); } }
      ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "心跳狀態" });
      const rHR = PL.ui.readout(ui.L.readouts, { label: "心跳率", unit: "bpm" }), rSV = PL.ui.readout(ui.L.readouts, { label: "每跳輸出", unit: "mL" });
      const rCO = PL.ui.readout(ui.L.readouts, { label: "心輸出量", unit: "L/min" }), rFill = PL.ui.readout(ui.L.readouts, { label: "舒張充填時間", unit: "s" });
      const ch = ui.chart("心輸出量 vs 心跳率", "直線斜率就是每跳輸出:收縮越強、斜率越陡;同樣 180 bpm,輸出量可以差到 1.6 倍——這就是訓練的差別。");
      const dc = () => CK.plot(ch, { x0: 40, x1: 180, y0: 0, y1: 20, xlabel: "心跳率 (bpm)", ylabel: "心輸出量 (L/min)",
        series: [{ fn: h => h * (50 + conS.get() * 50) / 1000, color: PL.col("accent") }],
        marks: [{ dot: [hrS.get(), hrS.get() * (50 + conS.get() * 50) / 1000], color: PL.col("accent-2"), label: "目前" }] });
      ch.onResize(dc); dc();
      root.addEventListener("input", dc); root.addEventListener("change", dc);
      return { stop() { ui.stop(); } };
    }
  });

  /* 血液的組成與功能 */
  PL.register("blood-components", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const hct = hctS.get(), view = viewSel.get();
          const hb = hct * 0.34, o2cap = hb * 1.34, plasma = 100 - hct;
          if (view === "tube") {
            const tx = W * 0.22, tb = H * 0.82, tw = W * 0.07, th = H * 0.56;
            D.rect(ctx, tx - tw / 2, tb - th, tw, th, { fill: "rgba(200,215,230,0.10)", stroke: "rgba(140,160,180,0.9)", width: 2, r: 10 });
            const bh = th - 12, y0 = tb - 6, rbcH = bh * hct / 100, bufH = bh * 0.02, plH = bh - rbcH - bufH;
            D.rect(ctx, tx - tw / 2 + 3, y0 - rbcH - bufH - plH, tw - 6, plH, { fill: "rgba(228,210,140,0.55)" });
            D.rect(ctx, tx - tw / 2 + 3, y0 - rbcH - bufH, tw - 6, bufH, { fill: "rgba(240,240,240,0.85)" });
            D.rect(ctx, tx - tw / 2 + 3, y0 - rbcH, tw - 6, rbcH, { fill: "rgba(200,70,60,0.85)" });
            const tag = (yy, s, c) => { D.line(ctx, tx + tw / 2, yy, tx + tw / 2 + 20, yy, PL.col("border"), 1); D.text(ctx, s, tx + tw / 2 + 24, yy + 3.5, { color: c, size: 10.5 }); };
            tag(y0 - rbcH - bufH - plH / 2, "血漿 " + PL.fmt(plasma, 0) + "%", "#c8a93c");
            tag(y0 - rbcH - bufH / 2, "白血球＋血小板 <1%", PL.col("text-dim"));
            tag(y0 - rbcH / 2, "紅血球 " + hct + "%", "#c05050");
            D.text(ctx, "離心:血比容 = 紅血球柱 ÷ 全柱", tx, tb + 16, { color: PL.col("text-faint"), size: 10, align: "center" });
          } else {
            CK.panel(ctx, W * 0.06, H * 0.16, W * 0.46, H * 0.60, "血球抹片(顯微視野)");
            for (let i = 0; i < 9; i++) CK.cellBody(ctx, W * 0.12 + (i % 3) * W * 0.055, H * 0.34 + Math.floor(i / 3) * H * 0.14 + Math.sin(t * 2 + i) * 2, H * 0.028, { type: "red" });
            CK.cellBody(ctx, W * 0.34, H * 0.36, H * 0.038, { type: "animal", tint: "rgba(179,136,217,0.4)", time: t, labelNucleus: true });
            D.text(ctx, "白血球:有核、防禦", W * 0.34, H * 0.44, { color: PL.col("text-dim"), size: 10, align: "center" });
            for (let i = 0; i < 6; i++) D.disc(ctx, W * 0.30 + rnd(i) * W * 0.14, H * 0.56 + rnd(i + 9) * H * 0.12, 2.6, { fill: "#b0bec5" });
            D.text(ctx, "血小板:碎片、凝血", W * 0.37, H * 0.71, { color: PL.col("text-dim"), size: 10, align: "center" });
          }
          CK.panel(ctx, W * 0.56, H * 0.12, W * 0.40, H * 0.64, "血球的分工");
          const rows = [["紅血球", "雙凹圓盤、無核,壽命約 120 天;血紅素攜氧", "#c05050"], ["白血球", "有核;顆粒性與無顆粒性,對抗病原", "#9575cd"], ["血小板", "巨核細胞的碎片,凝血堵傷口", "#90a4ae"], ["血漿", "九成是水:運養分、廢物、荷爾蒙與 CO₂", "#c8a93c"]];
          rows.forEach((rw, i) => {
            D.disc(ctx, W * 0.60, H * 0.23 + i * H * 0.13, 5, { fill: rw[2] });
            D.text(ctx, rw[0], W * 0.63, H * 0.225 + i * H * 0.13, { color: PL.col("text"), size: 11.5, weight: "700" });
            D.text(ctx, rw[1], W * 0.63, H * 0.265 + i * H * 0.13, { color: PL.col("text-dim"), size: 10 });
          });
          D.text(ctx, "Hb + 4 O₂ ⇌ Hb(O₂)₄(可逆結合)", W * 0.76, H * 0.70, { color: PL.col("accent"), size: 11.5, align: "center", weight: "700" });
          rHct.set(hct, 0); rHb.set(hb, 1); rO2.set(o2cap, 1); rPl.set(plasma, 0);
          vd.set(hb < 12 ? "貧血:攜氧能力不足,容易疲倦、運動會喘" : hct > 52 ? "血液過濃:可能是脫水或高原適應,流動阻力上升" : "血球組成正常:紅血球 " + hct + "%、血漿 " + PL.fmt(plasma, 0) + "%", hb < 12 ? "bad" : hct > 52 ? "warn" : "ok");
        }
      });
      const viewSel = PL.ui.select(ui.L.controls, { label: "檢視方式", value: "tube", options: [{ value: "tube", label: "離心分離" }, { value: "smear", label: "血球抹片" }] });
      const hctS = PL.ui.slider(ui.L.controls, { label: "血比容", min: 25, max: 55, step: 1, value: 45, unit: "%", digits: 0 });
      PL.ui.note(ui.L.controls, "一滴血裡約有 500 萬顆紅血球、1 萬顆白血球、30 萬顆血小板——數量差了兩三個數量級,要靠離心才看得出比例。");
      PL.ui.procedure(ui.L.controls, { title: "讀懂離心管", steps: ["拉動「血比容」:紅血球柱變高,血漿柱等比例變矮。", "盯住血紅素與攜氧量讀數:兩者一起升降。", "切換到「血球抹片」,找出有核的大細胞——那是白血球。"],
        rule: "紅血球成熟後把細胞核丟掉,騰出空間裝血紅素;抹片上看到有核的大細胞是白血球,不是紅血球。" });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "正常成人", apply: () => hctS.set(45) },
        { label: "缺鐵性貧血", apply: () => hctS.set(30) },
        { label: "高原適應", apply: () => hctS.set(52) }
      ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "血液判定" });
      const rHct = PL.ui.readout(ui.L.readouts, { label: "血比容", unit: "%" }), rHb = PL.ui.readout(ui.L.readouts, { label: "血紅素", unit: "g/dL" });
      const rO2 = PL.ui.readout(ui.L.readouts, { label: "攜氧量", unit: "mL O₂/dL" }), rPl = PL.ui.readout(ui.L.readouts, { label: "血漿", unit: "%" });
      const ch = ui.chart("攜氧量 vs 血比容", "攜氧量幾乎與血比容成正比:紅血球少一半、帶氧就少一半——貧血的人運動耐受直接砍半。");
      const dc = () => CK.plot(ch, { x0: 25, x1: 55, y0: 0, y1: 26, xlabel: "血比容 (%)", ylabel: "攜氧量 (mL O₂/dL)",
        series: [{ fn: h => h * 0.34 * 1.34, color: PL.col("accent") }],
        marks: [{ dot: [hctS.get(), hctS.get() * 0.34 * 1.34], color: PL.col("accent-2"), label: "目前" }] });
      ch.onResize(dc); dc();
      root.addEventListener("input", dc); root.addEventListener("change", dc);
      return { stop() { ui.stop(); } };
    }
  });

  /* 血管與血壓 */
  PL.register("blood-vessels", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const sys = sysS.get(), dia = diaS.get(), r = radS.get();
          const pp = sys - dia, mean = dia + pp / 3, res = Math.pow(0.7 / r, 4), flow = mean / 93 * Math.pow(r / 0.7, 4);
          const VS = [
            { y: H * 0.17, nm: "動脈", wall: 4.5 + (sys - 90) * 0.06, lum: 13, wallC: "rgba(190,80,70,0.85)", lumC: "rgba(210,60,50,0.4)", spd: 0.12 * mean / 93, trait: "厚壁、富彈性:承受高壓並整流脈動" },
            { y: H * 0.34, nm: "小動脈", wall: 3, lum: 3 + r * 10, wallC: "rgba(190,90,90,0.8)", lumC: "rgba(210,80,60,0.45)", spd: 0.10 * flow, trait: "平滑肌環:半徑就是血流的水龍頭" },
            { y: H * 0.51, nm: "微血管", wall: 1.2, lum: 4, wallC: "rgba(220,120,110,0.9)", lumC: "rgba(215,90,75,0.5)", spd: 0.05 * flow, trait: "管壁一層內皮細胞:O₂ 出、CO₂ 進的交換場所" },
            { y: H * 0.68, nm: "靜脈", wall: 2.5, lum: 12, wallC: "rgba(100,130,190,0.8)", lumC: "rgba(80,110,180,0.4)", spd: 0.04, trait: "薄壁、有瓣膜:防逆流回心" }
          ];
          VS.forEach((v2, k) => {
            const x0 = W * 0.05, x1 = W * 0.44;
            D.text(ctx, v2.nm + " · " + v2.trait, x0, v2.y - v2.lum / 2 - v2.wall - 7, { color: PL.col("text-dim"), size: 9.5 });
            D.rect(ctx, x0, v2.y - v2.lum / 2 - v2.wall, x1 - x0, v2.lum + v2.wall * 2, { fill: v2.wallC, r: (v2.lum + v2.wall * 2) / 2 });
            D.rect(ctx, x0 + v2.wall, v2.y - v2.lum / 2, x1 - x0 - v2.wall * 2, v2.lum, { fill: v2.lumC, r: v2.lum / 2 });
            for (let i = 0; i < 5; i++) {
              const p = ((t * v2.spd + i / 5) % 1 + 1) % 1;
              D.disc(ctx, lerp(x0 + 6, x1 - 6, p), v2.y + Math.sin(i * 2.1 + k) * v2.lum * 0.18, clamp(v2.lum * 0.3, 1.6, 3.4), { fill: "rgba(225,90,80,0.9)" });
            }
            if (k === 3) [0.35, 0.7].forEach(fv => {
              const vx = x0 + (x1 - x0) * fv;
              ctx.save(); ctx.strokeStyle = "rgba(228,238,248,0.95)"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.beginPath();
              ctx.moveTo(vx, v2.y - v2.lum / 2); ctx.lineTo(vx + 7, v2.y);
              ctx.moveTo(vx, v2.y + v2.lum / 2); ctx.lineTo(vx + 7, v2.y);
              ctx.stroke(); ctx.restore();
              D.text(ctx, "瓣膜", vx + 4, v2.y + v2.lum / 2 + 10, { color: PL.col("text-faint"), size: 8.5, align: "center" });
            });
          });
          CK.panel(ctx, W * 0.55, H * 0.12, W * 0.41, H * 0.62, "血壓階梯");
          const steps = [["動脈", mean, "#d95555"], ["小動脈下游", mean * 0.5 * clamp(flow, 0.2, 2), "#e07060"], ["微血管", mean * 0.32 * clamp(flow, 0.2, 2), "#e07060"], ["靜脈", 5, "#4a90d9"]];
          steps.forEach((st, i) => {
            const yy = H * 0.27 + i * H * 0.115;
            CK.meter(ctx, W * 0.58, yy, W * 0.24, 10, clamp(st[1] / 140, 0, 1), { color: st[2], label: st[0] });
            D.text(ctx, PL.fmt(st[1], 0) + " mmHg", W * 0.85, yy + 8, { color: PL.col("text-dim"), size: 10.5 });
          });
          D.text(ctx, "壓差不滅,血流不止:動脈 ≫ 微血管 ≫ 靜脈", W * 0.755, H * 0.67, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          D.text(ctx, "血壓讀數 " + sys + "/" + dia + " · 脈壓 " + pp + " · 平均 " + PL.fmt(mean, 0), W * 0.755, H * 0.71, { color: PL.col("text"), size: 11, align: "center", weight: "700" });
          rMean.set(mean, 0); rPP.set(pp, 0); rRes.set("×" + PL.fmt(res, 1)); rFlow.set("×" + PL.fmt(flow, 2));
          vd.set(sys >= 140 || dia >= 90 ? "高血壓:心臟負擔加重,血管長期受損" : sys < 90 || dia < 50 ? "血壓偏低:站立時腦部灌注可能不足" : "血壓正常:動脈彈性把脈動血流整成穩定細流", sys >= 140 || dia >= 90 ? "bad" : sys < 90 || dia < 50 ? "warn" : "ok");
        }
      });
      const sysS = PL.ui.slider(ui.L.controls, { label: "心縮壓", min: 90, max: 170, step: 5, value: 120, unit: "mmHg", digits: 0 });
      const diaS = PL.ui.slider(ui.L.controls, { label: "心舒壓", min: 50, max: 110, step: 5, value: 80, unit: "mmHg", digits: 0 });
      const radS = PL.ui.slider(ui.L.controls, { label: "小動脈半徑", min: 0.3, max: 1, step: 0.05, value: 0.7, digits: 2 });
      PL.ui.note(ui.L.controls, "動脈的彈性把心臟的脈動血流「整流」成微血管裡的穩定細流——量血壓,量的是這股脈動在動脈裡的壓力範圍。");
      PL.ui.procedure(ui.L.controls, { title: "比較四種血管", steps: ["從上到下比管壁厚度與管徑:動脈厚、微血管薄、靜脈有瓣膜。", "拉低「小動脈半徑」:下游壓力與血流一起掉,流阻飆升。", "把心縮壓拉到 150:動脈壁變厚,判定徽章轉為高血壓。"],
        rule: "靜脈回心靠肌肉擠壓與瓣膜,不是靠血壓——久站不動,血液會積在下肢靜脈裡。" });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "正常血壓", apply: () => { sysS.set(120); diaS.set(80); radS.set(0.7); ui.redraw(); } },
        { label: "高血壓", apply: () => { sysS.set(150); diaS.set(95); radS.set(0.5); ui.redraw(); } },
        { label: "失血代償(血管收縮)", apply: () => { sysS.set(105); diaS.set(70); radS.set(0.35); ui.redraw(); } }
      ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "血壓判定" });
      const rMean = PL.ui.readout(ui.L.readouts, { label: "平均血壓", unit: "mmHg" }), rPP = PL.ui.readout(ui.L.readouts, { label: "脈壓", unit: "mmHg" });
      const rRes = PL.ui.readout(ui.L.readouts, { label: "相對流阻" }), rFlow = PL.ui.readout(ui.L.readouts, { label: "器官血流" });
      const ch = ui.chart("血流 vs 小動脈半徑", "四次方定律:半徑減半、流阻 ×16、血流剩 1/16——身體就是靠小動脈收縮,把血量分配給不同器官。");
      const dc = () => CK.plot(ch, { x0: 0.3, x1: 1, y0: 0, y1: 4.2, xlabel: "小動脈半徑(相對)", ylabel: "相對血流",
        series: [{ fn: rr => Math.pow(rr / 0.7, 4), color: PL.col("accent") }],
        marks: [{ dot: [radS.get(), Math.pow(radS.get() / 0.7, 4)], color: PL.col("accent-2"), label: "目前" }] });
      ch.onResize(dc); dc();
      root.addEventListener("input", dc); root.addEventListener("change", dc);
      return { stop() { ui.stop(); } };
    }
  });

  /* 呼吸運動與橫膈 */
  PL.register("breathing", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const dia = diaS.get(), rr = rrS.get();
          const V = lerp(2.6, 5.2, dia), dP = (3.9 / V - 1) * 12, tv = Math.max(0, (V - 2.6) * 0.4), ve = tv * rr;
          const box = { x: W * 0.08, y: H * 0.14, w: W * 0.36, h: H * 0.68 };
          D.rect(ctx, box.x - 8, box.y - 4, box.w + 16, box.h + 8, { stroke: PL.col("border"), width: 1.5, r: 22 });
          CK.lungChest(ctx, box, { inflate: dia, diaphragm: dia });
          D.text(ctx, dia > 0.55 ? "橫膈收縮→壓平下降" : dia < 0.45 ? "橫膈放鬆→回彈上升" : "橫膈靜息位", box.x + box.w / 2, box.y + box.h + 16, { color: PL.col("text-dim"), size: 10, align: "center" });
          const cxT = box.x + box.w / 2, topY = H * 0.12;
          for (let i = 0; i < Math.round(2 + Math.abs(dP) * 1.2); i++) {
            const p = ((t * Math.abs(dP) * 0.10 + i / 6) % 1 + 1) % 1;
            D.disc(ctx, cxT, dP < 0 ? lerp(H * 0.42, topY, p) : lerp(topY, H * 0.42, p), 3, { fill: dP < 0 ? "rgba(120,196,240,0.9)" : "rgba(200,210,220,0.8)" });
          }
          CK.arrow(ctx, cxT, dP < 0 ? topY - 20 : H * 0.42 + 22, cxT, dP < 0 ? topY - 5 : H * 0.42 + 7, dP < 0 ? "#4a90d9" : "#ef8829", dP < 0 ? "空氣流入" : "空氣流出");
          const wx = W * 0.06, wy = H * 0.90, ww = W * 0.40, amp = H * 0.035;
          ctx.save();
          ctx.strokeStyle = PL.col("accent"); ctx.lineWidth = 1.8; ctx.beginPath();
          for (let xx = 0; xx <= ww; xx += 3) {
            const yy = wy - amp * (0.5 + 0.5 * Math.sin((xx / ww) * rr * 0.18 * TAU + t * rr * 0.09));
            xx ? ctx.lineTo(wx + xx, yy) : ctx.moveTo(wx + xx, yy);
          }
          ctx.stroke(); ctx.restore();
          D.text(ctx, "呼吸節律 " + rr + " 次/分", wx + ww + 8, wy + 3, { color: PL.col("text-faint"), size: 9.5 });
          CK.panel(ctx, W * 0.52, H * 0.12, W * 0.44, H * 0.56, "呼吸力學:容積與壓力");
          D.text(ctx, "吸氣:橫膈收縮下降＋肋骨上提 → 胸腔變大", W * 0.54, H * 0.22, { color: PL.col("text"), size: 10.5 });
          D.text(ctx, "→ 肺內壓跌破大氣壓 → 空氣被「壓」進來", W * 0.54, H * 0.28, { color: PL.col("text-dim"), size: 10.5 });
          D.text(ctx, "呼氣(平靜):肌肉放鬆,肺彈性回彈 → 壓力回升", W * 0.54, H * 0.36, { color: PL.col("text"), size: 10.5 });
          D.text(ctx, "→ 肺內壓高過大氣壓 → 空氣被擠出去", W * 0.54, H * 0.42, { color: PL.col("text-dim"), size: 10.5 });
          D.text(ctx, "動力是壓力差,不是肺把氣「吸」進來", W * 0.54, H * 0.52, { color: "#ef8829", size: 11, weight: "700" });
          rV.set(V, 2); rP.set(dP, 2);
          rFlow.set(dP < -0.2 ? "流入(吸氣)" : dP > 0.2 ? "流出(呼氣)" : "靜止(內外平衡)"); rVE.set(ve, 1);
          vd.set(dP < -0.2 ? "吸氣中:肺內壓低於大氣壓,空氣流入" : dP > 0.2 ? "呼氣中:肺回彈把氣推出" : "內外壓平衡:吸呼轉換點", dP < -0.2 ? "ok" : "info");
        }
      });
      const diaS = PL.ui.slider(ui.L.controls, { label: "橫膈收縮程度", min: 0, max: 1, step: 0.05, value: 0.5, digits: 2 });
      const rrS = PL.ui.slider(ui.L.controls, { label: "呼吸速率", min: 8, max: 30, step: 1, value: 14, unit: "次/分", digits: 0 });
      PL.ui.note(ui.L.controls, "橫膈是最重要的呼吸肌:下降 1 公分,胸腔就能多容納約 250 mL 空氣;打嗝就是橫膈的不自主抽動。");
      PL.ui.procedure(ui.L.controls, { title: "體驗壓力差驅動氣流", steps: ["把「橫膈收縮程度」拉到 1:肺脹大、壓差轉負、氣流箭頭轉為流入。", "拉回 0:橫膈拱起、壓差轉正,空氣流出。", "停在 0.5 附近找平衡點:內外壓相等,沒有氣流。"],
        rule: "平靜呼氣是被動的:橫膈一放鬆、肺回彈就完成;用力呼氣(吹蠟燭、咳嗽)才需要腹肌與內肋間肌。" });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "深吸氣", apply: () => { diaS.set(1); ui.redraw(); } },
        { label: "平靜呼氣末", apply: () => { diaS.set(0.15); ui.redraw(); } },
        { label: "用力呼氣", apply: () => { diaS.set(0); rrS.set(22); ui.redraw(); } }
      ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "呼吸時相" });
      const rV = PL.ui.readout(ui.L.readouts, { label: "胸腔容積", unit: "L" }), rP = PL.ui.readout(ui.L.readouts, { label: "肺內壓差", unit: "cmH₂O" });
      const rFlow = PL.ui.readout(ui.L.readouts, { label: "氣流" }), rVE = PL.ui.readout(ui.L.readouts, { label: "每分通氣量", unit: "L/min" });
      const ch = ui.chart("肺內壓差 vs 胸腔容積", "反比曲線:容積越大、肺內壓越低;曲線穿過 0 的那一點,就是內外壓平衡的靜息容積。");
      const dc = () => {
        const V2 = lerp(2.6, 5.2, diaS.get());
        CK.plot(ch, { x0: 2.4, x1: 5.4, y0: -6, y1: 8, xlabel: "胸腔容積 (L)", ylabel: "肺內壓差 (cmH₂O)",
          series: [{ fn: v => (3.9 / v - 1) * 12, color: PL.col("accent") }],
          marks: [{ hline: 0, color: PL.col("border") }, { dot: [V2, (3.9 / V2 - 1) * 12], color: PL.col("accent-2"), label: "目前" }] });
      };
      ch.onResize(dc); dc();
      root.addEventListener("input", dc); root.addEventListener("change", dc);
      return { stop() { ui.stop(); } };
    }
  });

  /* 肺泡與氣體交換 */
  PL.register("gas-exchange", {
    build(root) {
      const P50 = Math.pow(26.3, 2.7);
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const alt = altS.get(), vent = venS.get();
          const atm = 760 * Math.exp(-alt / 8000), paO2 = Math.max(12, (atm - 47) * 0.21 - 40 / vent / 0.8);
          const sat = 100 * Math.pow(paO2, 2.7) / (P50 + Math.pow(paO2, 2.7));
          const dP = paO2 - 40;
          const ax = W * 0.26, ay = H * 0.32, ar = H * 0.16;
          D.disc(ctx, ax, ay, ar, { fill: "rgba(160,205,235,0.20)", stroke: "rgba(90,140,175,0.95)", width: 2 });
          D.rect(ctx, ax - 8, ay - ar - 24, 16, 26, { fill: "rgba(150,160,175,0.8)", r: 5 });
          D.text(ctx, "肺泡", ax, ay - ar - 32, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          for (let i = 0; i < Math.round(clamp(paO2 / 14, 1, 9)); i++) {
            D.disc(ctx, ax + (rnd(i) - 0.5) * ar * 1.35, ay + (rnd(i + 40) - 0.5) * ar * 1.35, 3.4, { fill: "#e25555", glow: "#ffb3a0", glowSize: 6 });
          }
          for (let i = 0; i < 3; i++) D.disc(ctx, ax + (rnd(i + 80) - 0.5) * ar * 0.9, ay + ar * 0.45 + rnd(i + 90) * ar * 0.35, 3, { fill: "#9aa8b8" });
          const cy2 = H * 0.68;
          ctx.save(); ctx.strokeStyle = "rgba(200,90,80,0.85)"; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(W * 0.08, cy2 - 13); ctx.quadraticCurveTo(W * 0.28, cy2 - 24, W * 0.50, cy2 - 13); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(W * 0.08, cy2 + 13); ctx.quadraticCurveTo(W * 0.28, cy2 + 24, W * 0.50, cy2 + 13); ctx.stroke(); ctx.restore();
          for (let i = 0; i < 5; i++) {
            const px2 = lerp(W * 0.10, W * 0.48, ((t * 0.06 + i / 5) % 1 + 1) % 1);
            CK.cellBody(ctx, px2, cy2 + Math.sin(px2 * 0.05) * 3, 4 + sat / 100 * 2.4, { type: "red" });
          }
          for (let i = 0; i < Math.round(clamp(dP / 70, 0.2, 1) * 5); i++) {
            const p = ((t * 0.14 + i / 5) % 1 + 1) % 1;
            D.disc(ctx, lerp(ax + ar * 0.55, W * 0.42, p), lerp(ay + ar * 0.55, cy2, p), 2.6, { fill: "#e25555" });
          }
          CK.arrow(ctx, ax + ar * 0.8, ay + ar * 0.85, ax + ar * 1.1, cy2 - 22, "#e25555", "O₂ 進血");
          CK.arrow(ctx, ax - ar * 0.8, cy2 - 18, ax - ar * 0.75, ay + ar * 0.7, "#9aa8b8", "CO₂ 出血");
          D.text(ctx, "氣血屏障:肺泡壁＋微血管壁,各一層細胞", ax, cy2 + 32, { color: PL.col("text-faint"), size: 10, align: "center" });
          CK.badge(ctx, W * 0.5, H * 0.055, "海拔 " + alt + " m · 大氣壓 " + PL.fmt(atm, 0) + " mmHg", "#7986cb");
          CK.panel(ctx, W * 0.58, H * 0.10, W * 0.38, H * 0.66, "分壓與擴散");
          D.text(ctx, "肺泡 O₂ 分壓 " + PL.fmt(paO2, 0) + " mmHg", W * 0.60, H * 0.20, { color: PL.col("text"), size: 11.5, weight: "700" });
          D.text(ctx, "靜脈血 O₂ 約 40 → 驅動力 " + PL.fmt(dP, 0) + " mmHg", W * 0.60, H * 0.27, { color: PL.col("text-dim"), size: 10.5 });
          D.text(ctx, "靜脈 CO₂ 45 vs 肺泡 " + PL.fmt(40 / vent, 0) + " → CO₂ 出血", W * 0.60, H * 0.34, { color: PL.col("text-dim"), size: 10.5 });
          D.text(ctx, "Hb + 4 O₂ ⇌ Hb(O₂)₄", W * 0.60, H * 0.43, { color: PL.col("accent"), size: 12, weight: "700" });
          D.text(ctx, "血紅素在肺「裝氧」、在組織「卸氧」", W * 0.60, H * 0.50, { color: PL.col("text-dim"), size: 10.5 });
          D.text(ctx, "CO₂ 主要以碳酸氫鹽溶在血漿運輸", W * 0.60, H * 0.57, { color: PL.col("text-dim"), size: 10.5 });
          D.text(ctx, vent > 1.2 ? "通氣加深:CO₂ 排更多,肺泡 O₂ 回升" : "拉高「通氣量」可部分補償缺氧", W * 0.60, H * 0.65, { color: PL.col("text-faint"), size: 10 });
          rPA.set(paO2, 0); rSat.set(sat, 1); rDP.set(dP, 0); rCO2.set(vent, 2);
          vd.set(sat < 90 ? "血氧過低(" + PL.fmt(sat, 0) + "%):組織缺氧,心跳呼吸加速代償" : sat < 95 ? "血氧偏低:已進入解離曲線陡段,小變動影響很大" : "血氧飽和充足:肺泡高分壓把血紅素裝滿", sat < 90 ? "bad" : sat < 95 ? "warn" : "ok");
        }
      });
      const altS = PL.ui.slider(ui.L.controls, { label: "海拔高度", min: 0, max: 4000, step: 100, value: 0, unit: "m", digits: 0 });
      const venS = PL.ui.slider(ui.L.controls, { label: "通氣量倍率", min: 0.5, max: 2, step: 0.1, value: 1, unit: "×", digits: 1 });
      PL.ui.note(ui.L.controls, "肺泡約 3 億個、總換氣面積約 70 平方公尺;壁厚不到 1 μm,擴散幾乎瞬間完成——驅動力只有分壓差。");
      PL.ui.procedure(ui.L.controls, { title: "追蹤氧的一趟旅程", steps: ["海平面時記下肺泡分壓與血氧飽和度。", "把海拔拉到 4000 m:看肺泡分壓掉進解離曲線的陡段。", "再拉高「通氣量倍率」:深呼吸能把飽和度救回多少?"],
        rule: "O₂ 與 CO₂ 都靠分壓差擴散且方向相反:肺裡 O₂ 進血、CO₂ 出血;組織微血管剛好顛倒。" });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "海平面靜息", apply: () => { altS.set(0); venS.set(1); ui.redraw(); } },
        { label: "高山 4000 m", apply: () => { altS.set(4000); venS.set(1); ui.redraw(); } },
        { label: "高山＋深呼吸", apply: () => { altS.set(4000); venS.set(1.8); ui.redraw(); } },
        { label: "過度換氣", apply: () => { altS.set(0); venS.set(2); ui.redraw(); } }
      ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "血氧判定" });
      const rPA = PL.ui.readout(ui.L.readouts, { label: "肺泡氧分壓", unit: "mmHg" }), rSat = PL.ui.readout(ui.L.readouts, { label: "血氧飽和度", unit: "%" });
      const rDP = PL.ui.readout(ui.L.readouts, { label: "擴散驅動力", unit: "mmHg" }), rCO2 = PL.ui.readout(ui.L.readouts, { label: "CO₂ 排出倍率" });
      const ch = ui.chart("氧合血紅素解離曲線", "S 形曲線:肺段(高分壓)平緩——裝得滿;組織段(20–40)陡——一點分壓差就大量卸氧。海拔把肺泡分壓拉進陡段,飽和度就崩得很快。");
      const dc = () => {
        const p = Math.max(12, (760 * Math.exp(-altS.get() / 8000) - 47) * 0.21 - 40 / venS.get() / 0.8);
        CK.plot(ch, { x0: 0, x1: 120, y0: 0, y1: 100, xlabel: "氧分壓 (mmHg)", ylabel: "血氧飽和度 (%)",
          series: [{ fn: v => 100 * Math.pow(v, 2.7) / (P50 + Math.pow(v, 2.7)), color: PL.col("accent") }],
          marks: [{ dot: [p, 100 * Math.pow(p, 2.7) / (P50 + Math.pow(p, 2.7))], color: PL.col("accent-2"), label: "肺泡" }, { dot: [40, 100 * Math.pow(40, 2.7) / (P50 + Math.pow(40, 2.7))], color: "#9aa8b8", label: "組織" }] });
      };
      ch.onResize(dc); dc();
      root.addEventListener("input", dc); root.addEventListener("change", dc);
      return { stop() { ui.stop(); } };
    }
  });

  /* 運動與心跳呼吸的反應 */
  PL.register("exercise-response", {
    build(root) {
      const LVL = {
        no:  { name: "未訓練", hr0: 72, hrM: 185, sv0: 70, svM: 95, br0: 14, brM: 38, th: 7 },
        yes: { name: "有訓練", hr0: 55, hrM: 180, sv0: 100, svM: 135, br0: 12, brM: 36, th: 8.5 }
      };
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const I = intS.get(), L = LVL[trSel.get()];
          const hr = lerp(L.hr0, L.hrM, I / 10), sv = L.sv0 + (L.svM - L.sv0) * Math.min(1, I / 6);
          const co = hr * sv / 1000, br = lerp(L.br0, L.brM, Math.pow(I / 10, 1.1)), lac = clamp((I - L.th) / 2.5, 0, 1);
          const rx = W * 0.24, ry = H * 0.42;
          ctx.save();
          ctx.translate(rx, ry); ctx.rotate(I * 0.03);
          ctx.strokeStyle = PL.col("text-dim"); ctx.lineWidth = 3; ctx.lineCap = "round";
          const sw = Math.sin(t * (2 + I * 0.6)) * (0.3 + I * 0.07);
          ctx.beginPath();
          ctx.moveTo(0, -26); ctx.lineTo(0, 8);
          ctx.moveTo(0, -18); ctx.lineTo(-12 - sw * 7, 4);
          ctx.moveTo(0, -18); ctx.lineTo(12 + sw * 7, 4);
          ctx.moveTo(0, 8); ctx.lineTo(-10 + sw * 9, 30);
          ctx.moveTo(0, 8); ctx.lineTo(10 - sw * 9, 30);
          ctx.stroke(); ctx.restore();
          D.disc(ctx, rx, ry - 36, 8, { fill: PL.col("text-dim") });
          for (let i = 0; i < Math.round(I * 0.7); i++) {
            ctx.save(); ctx.strokeStyle = "rgba(150,170,190,0.5)"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(rx - 16 - i * 11, ry + 6, 15, -0.9, 0.9); ctx.stroke(); ctx.restore();
          }
          for (let i = 0; i < Math.round(I * 0.5); i++) D.disc(ctx, rx + 10 + i * 8, ry - 46 - i * 5, 2.2, { fill: "rgba(120,196,240,0.8)" });
          CK.meter(ctx, W * 0.06, H * 0.72, W * 0.28, 10, hr / 190, { color: "#d95555", label: "心跳率" });
          CK.meter(ctx, W * 0.06, H * 0.82, W * 0.28, 10, br / 45, { color: "#4a90d9", label: "呼吸率" });
          CK.meter(ctx, W * 0.40, H * 0.72, W * 0.22, 10, lac, { color: "#c0392b", label: "乳酸堆積" });
          CK.meter(ctx, W * 0.40, H * 0.82, W * 0.22, 10, co / 26, { color: "#ef8829", label: "心輸出量" });
          CK.panel(ctx, W * 0.66, H * 0.14, W * 0.30, H * 0.62, "訓練與不訓練的差別");
          D.text(ctx, "目前:" + L.name, W * 0.81, H * 0.23, { color: PL.col("accent"), size: 13, align: "center", weight: "700" });
          [["安靜心跳", L.hr0 + " bpm"], ["最大心跳", L.hrM + " bpm"], ["每跳輸出", PL.fmt(sv, 0) + " mL"], ["心輸出量", PL.fmt(co, 1) + " L/min"], ["無氧閾", "強度 " + L.th]].forEach((rw, i) => {
            D.text(ctx, rw[0], W * 0.685, H * 0.31 + i * H * 0.085, { color: PL.col("text-dim"), size: 10.5 });
            D.text(ctx, rw[1], W * 0.945, H * 0.31 + i * H * 0.085, { color: PL.col("text"), size: 11, align: "right" });
          });
          D.text(ctx, "心輸出量 = 心跳率 × 每跳輸出", W * 0.81, H * 0.72, { color: PL.col("text-faint"), size: 10, align: "center" });
          rHR.set(hr, 0); rBR.set(br, 0); rSV.set(sv, 0); rCO.set(co, 1);
          vd.set(I >= L.th ? "超過無氧閾:乳酸開始堆積,只能再撐很短的時間" : I < 1 ? "安靜狀態:心跳與呼吸維持基本供應" : "有氧區:心肺同步加速,氧與糖供應充足", I >= L.th ? "warn" : "ok");
        }
      });
      const intS = PL.ui.slider(ui.L.controls, { label: "運動強度", min: 0, max: 10, step: 0.5, value: 3, digits: 1 });
      const trSel = PL.ui.select(ui.L.controls, { label: "訓練狀態", value: "no", options: [{ value: "no", label: "未訓練" }, { value: "yes", label: "有訓練者" }] });
      PL.ui.note(ui.L.controls, "最大心跳率約 220 減年齡,練不太動它;訓練提升的是每跳輸出、乳酸閾與恢復速度——安靜心跳因此變低。");
      PL.ui.procedure(ui.L.controls, { title: "比較兩種體能", steps: ["未訓練狀態把強度拉到 6,記下心跳、呼吸與心輸出量。", "切換成「有訓練者」再比一次:同強度心跳更低、輸出更大。", "把強度拉過無氧閾(7 / 8.5):看乳酸條什麼時候開始漲。"],
        rule: "恢復速度比高峰數字更反映體能:訓練有素者停運動後心跳很快回落,因為每跳輸出大,不必靠心率硬撐。" });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "沙發馬鈴薯", apply: () => { trSel.set("no"); intS.set(2); ui.redraw(); } },
        { label: "路跑 30 分", apply: () => { trSel.set("yes"); intS.set(6); ui.redraw(); } },
        { label: "全力衝刺", apply: () => { trSel.set("no"); intS.set(10); ui.redraw(); } }
      ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "運動狀態" });
      const rHR = PL.ui.readout(ui.L.readouts, { label: "心跳率", unit: "bpm" }), rBR = PL.ui.readout(ui.L.readouts, { label: "呼吸率", unit: "次/分" });
      const rSV = PL.ui.readout(ui.L.readouts, { label: "每跳輸出", unit: "mL" }), rCO = PL.ui.readout(ui.L.readouts, { label: "心輸出量", unit: "L/min" });
      const ch = ui.chart("心跳率 vs 運動強度", "同樣強度,有訓練者心跳較低——因為每跳輸出較大,心臟不必跳那麼快;兩條線的差距就是訓練成效。");
      const dc = () => {
        const L2 = LVL[trSel.get()], I2 = intS.get();
        CK.plot(ch, { x0: 0, x1: 10, y0: 40, y1: 190, xlabel: "運動強度", ylabel: "心跳率 (bpm)",
          series: [{ fn: i => lerp(72, 185, i / 10), color: "#b0bec5" }, { fn: i => lerp(55, 180, i / 10), color: PL.col("accent") }],
          marks: [{ dot: [I2, lerp(L2.hr0, L2.hrM, I2 / 10)], color: PL.col("accent-2"), label: "目前" }] });
      };
      ch.onResize(dc); dc();
      root.addEventListener("input", dc); root.addEventListener("change", dc);
      return { stop() { ui.stop(); } };
    }
  });
})();
