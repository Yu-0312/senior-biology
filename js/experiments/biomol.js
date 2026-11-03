/* 模組四 · 生物體的有機物與檢測 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, CK = window.BioLab, D = PL.draw;
  const { clamp, lerp, TAU } = PL;

  /* 共用:六角形糖環(吡喃糖示意) */
  function sugarRing(ctx, cx, cy, r, o) {
    o = o || {};
    ctx.save(); ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU - Math.PI / 6; i ? ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    ctx.closePath();
    ctx.fillStyle = o.fill || "rgba(255,213,79,0.45)"; ctx.fill(); ctx.strokeStyle = o.stroke || "rgba(170,130,20,0.9)"; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.restore();
    if (o.label) D.text(ctx, o.label, cx, cy + r * 0.34, { color: "#7a5a00", size: Math.max(8, r * 0.62), align: "center", weight: "700" });
  }
  /* 共用:水浴氣泡 */
  function bathBubbles(ctx, x, y, w, n, t) {
    for (let i = 0; i < n; i++) {
      const ph = (t * 0.8 + i * 0.31) % 1;
      D.disc(ctx, x + (i % 5 - 2) * w * 0.09 + Math.sin(ph * 9 + i) * 3, y - ph * 56, 1.4 + (i % 3) * 0.7, { fill: "rgba(255,255,255,0.5)" });
    }
  }

  /* 醣類:單醣、雙醣與多醣 */
  PL.register("carbohydrate", {
    build(root) {
      const KINDS = {
        mono: { name: "單醣(葡萄糖)", absorb: "可直接吸收進細胞,是細胞的第一優先燃料", digest: "不需消化" },
        di: { name: "雙醣(麥芽糖)", absorb: "需麥芽糖酶水解成葡萄糖才能吸收", digest: "小腸可消化" },
        starch: { name: "多醣(澱粉)", absorb: "澱粉酶逐步水解成麥芽糖再吸收", digest: "人類可消化(植物儲存)" },
        glycogen: { name: "多醣(肝醣)", absorb: "分支多、動員快,可快速補血糖", digest: "人類可消化(動物儲存)" },
        cellulose: { name: "多醣(纖維素)", absorb: "人類無法消化,當膳食纖維促進蠕動", digest: "人類沒有纖維素酶" }
      };
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const kd = KINDS[kindSel.get()], n = Math.round(unitS.get());
          const r = Math.min(H * 0.068, W * 0.50 / (n * 2.15 + 1)), gap = n > 1 ? Math.min(r * 2.4, (W * 0.50 - r * 2) / (n - 1)) : 0, cy = H * 0.42, cx0 = W * 0.32 - (n - 1) * gap / 2;
          CK.panel(ctx, W * 0.05, H * 0.11, W * 0.54, H * 0.62, kd.name + " · 脫水縮合示意");
          const mol = kd === KINDS.mono ? n : kd === KINDS.di ? Math.ceil(n / 2) : 1, bonds = kd === KINDS.mono ? 0 : kd === KINDS.di ? Math.floor(n / 2) : n - 1 + (kd === KINDS.glycogen ? 2 : 0);
          for (let i = 0; i < n; i++) {
            const x = cx0 + i * gap, flip = kd === KINDS.cellulose && i % 2 === 1, ry = flip ? cy + r * 0.7 : cy;
            sugarRing(ctx, x, ry, r, { label: "G" });
            if (i < n - 1 && kd !== KINDS.mono && (kd !== KINDS.di || i % 2 === 0)) {
              D.line(ctx, x + r * 0.85, cy, x + gap - r * 0.85, flip ? cy - r * 0.35 : cy, "rgba(170,130,20,0.9)", 2.4);
              D.text(ctx, "-H₂O", x + gap / 2, cy - r * 0.55, { color: "#ef8829", size: 9, align: "center" });
            }
            if (kd === KINDS.glycogen && i === 2) {
              for (let b = 1; b <= 2; b++) {
                const bx = x + r * 1.2, by = cy - r * 2.1 - (b - 1) * r * 1.8;
                D.line(ctx, x, cy - r, bx, by + r, "rgba(170,130,20,0.9)", 2.4);
                sugarRing(ctx, bx, by, r * 0.78, { label: "G" });
              }
              D.text(ctx, "分支", x + r * 2.1, cy - r * 3.6, { color: PL.col("text-dim"), size: 9.5 });
            }
          }
          const cap = kd === KINDS.mono ? n + " 個游離分子:互不相連" : kd === KINDS.di ? "兩兩相連成雙醣" : kd === KINDS.cellulose ? "β 鍵結:相鄰葡萄糖上下顛倒" : "長鏈:單元間以脫水縮合相連";
          D.text(ctx, cap, W * 0.32, H * 0.70, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          CK.panel(ctx, W * 0.63, H * 0.11, W * 0.32, H * 0.62, "性質對照");
          [["分子數", String(mol)], ["脫去的 H₂O", bonds + " 個"], ["人類消化", kd.digest]].forEach(([kk, v], i) => {
            D.text(ctx, kk, W * 0.66, H * 0.22 + i * 40, { color: PL.col("text-faint"), size: 10 });
            D.text(ctx, v, W * 0.66, H * 0.22 + i * 40 + 15, { color: i === 2 ? PL.col("accent") : PL.col("text"), size: 11.5, weight: i === 2 ? "700" : "" });
          });
          rUnit.set(n, 0); rMol.set(mol, 0); rWater.set(bonds, 0); rAbs.set(kd.absorb);
        }
      });
      const kindSel = PL.ui.select(ui.L.controls, { label: "醣類", value: "starch", options: [
        { value: "mono", label: "單醣(葡萄糖)" }, { value: "di", label: "雙醣(麥芽糖)" }, { value: "starch", label: "多醣(澱粉)" },
        { value: "glycogen", label: "多醣(肝醣)" }, { value: "cellulose", label: "多醣(纖維素)" }
      ] });
      const unitS = PL.ui.slider(ui.L.controls, { label: "聚合單元數", min: 1, max: 8, step: 1, value: 6, unit: "個", digits: 0 });
      PL.ui.note(ui.L.controls, "單醣是基本積木;兩個單醣脫去一分子水連成雙醣;大量單醣聚成澱粉、肝醣與纖維素——三者都是葡萄糖聚合物,鍵結方式決定人類能不能消化。");
      PL.ui.procedure(ui.L.controls, {
        title: "看鍵結猜消化",
        steps: [
          "把「聚合單元數」從 1 拉到 8,數一數脫去了幾個水分子。",
          "切到「纖維素」:相鄰葡萄糖上下顛倒(β 鍵結),消化酶認不出來。",
          "比較澱粉與肝醣:肝醣有分支,分解酶可以從多處同時動手。"
        ],
        rule: "澱粉、肝醣、纖維素「都是葡萄糖組成的」——能不能當食物,差別不在單體,而在鍵結方式。"
      });
      const rUnit = PL.ui.readout(ui.L.readouts, { label: "單元數", unit: "個" });
      const rMol = PL.ui.readout(ui.L.readouts, { label: "分子數" });
      const rWater = PL.ui.readout(ui.L.readouts, { label: "脫去 H₂O", unit: "個" });
      const rAbs = PL.ui.readout(ui.L.readouts, { label: "吸收方式" });
      const chart = ui.chart("聚合度與吸收速度", "單元數越多,需要的水解步驟越多,葡萄糖進入血液越慢——單醣最快,多醣最慢。");
      const drawChart = () => CK.plot(chart, {
        x0: 1, x1: 8, y0: 0, y1: 110, xticks: [2, 4, 6, 8], xlabel: "聚合單元數", ylabel: "相對吸收速率 (%)",
        series: [{ fn: n => 100 / n, color: PL.col("accent") }],
        marks: [{ dot: [unitS.get(), 100 / unitS.get()], color: PL.col("accent-2"), label: "目前" }]
      });
      chart.onResize(drawChart); drawChart(); root.addEventListener("input", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 蛋白質與胺基酸 */
  PL.register("protein-structure", {
    build(root) {
      const RCOL = ["#e57373", "#81c784", "#64b5f6", "#ffd54f", "#ba68c8"];
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const n = Math.round(lenS.get()), T = tempS.get();
          const den = clamp((T - 55) / 30, 0, 1); // 變性比例:55°C 起變,85°C 完全變性
          CK.panel(ctx, W * 0.05, H * 0.10, W * 0.55, H * 0.74, den > 0.05 ? "多肽鏈(變性中)" : "多肽鏈(摺疊態)");
          const cx = W * 0.31, cy = H * 0.44, R = H * 0.20;
          const pts = [];
          for (let i = 0; i < n; i++) {
            const f = n === 1 ? 0.5 : i / (n - 1), a = f * TAU * 1.75;
            const fx = cx + Math.cos(a) * R * (0.35 + f * 0.65), fy = cy + Math.sin(a) * R * 0.82;
            const ex = lerp(W * 0.12, W * 0.52, f), ey = cy + Math.sin(f * TAU * 1.5) * H * 0.11;
            pts.push([lerp(fx, ex, den), lerp(fy, ey, den)]);
          }
          for (let i = 1; i < n; i++) {
            D.line(ctx, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], PL.col("text-dim"), 3);
            if (i === 1) D.text(ctx, "胜肽鍵", (pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2 - 12, { color: PL.col("accent"), size: 9.5, align: "center" });
          }
          pts.forEach((p, i) => {
            D.disc(ctx, p[0], p[1], 9, { fill: RCOL[i % 5], stroke: "rgba(0,0,0,0.3)", width: 1 });
            D.text(ctx, "R", p[0], p[1] + 3.2, { color: "#18202b", size: 9, align: "center", weight: "700" });
          });
          D.text(ctx, "N 端", pts[0][0], pts[0][1] + 22, { color: PL.col("text-dim"), size: 9.5, align: "center" }); D.text(ctx, "C 端", pts[n - 1][0], pts[n - 1][1] + 22, { color: PL.col("text-dim"), size: 9.5, align: "center" });
          if (den > 0.6) {
            D.text(ctx, "疏水側鏈互相黏聚 → 凝固(如蛋白煮熟)", cx, H * 0.78, { color: "#e57373", size: 10.5, align: "center", weight: "700" });
            for (let i = 0; i < 5; i++) D.disc(ctx, W * 0.14 + i * W * 0.08, H * 0.85, 6 + (i % 2) * 3, { fill: "rgba(240,235,225,0.85)", stroke: "rgba(180,170,150,0.8)", width: 1.2 });
          }
          CK.panel(ctx, W * 0.64, H * 0.14, W * 0.31, H * 0.58, "溫度效應");
          D.text(ctx, T + " °C", W * 0.795, H * 0.26, { color: den > 0.05 ? "#e57373" : "#66bb6a", size: 15, align: "center", weight: "700" });
          D.text(ctx, den < 0.05 ? "氫鍵穩定,立體形狀完整" : den < 0.6 ? "氫鍵斷裂,形狀開始鬆散" : "三級結構瓦解,功能喪失", W * 0.795, H * 0.36, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          CK.meter(ctx, W * 0.67, H * 0.50, W * 0.25, 9, 1 - den, { color: "#66bb6a", label: "剩餘功能" }); CK.meter(ctx, W * 0.67, H * 0.62, W * 0.25, 9, den, { color: "#e57373", label: "變性程度" });
          rN.set(n, 0); rBond.set(n - 1, 0); rDen.set(Math.round(den * 100), 0);
          rFun.set(den < 0.05 ? "正常" : den < 0.6 ? "下降中" : "喪失(不可逆)");
          verdict.set(den < 0.05 ? "結構完整:形狀決定功能" : den < 0.6 ? "接近變性溫度:功能正在流失" : "已變性:序列沒變,但形狀回不去了", den < 0.05 ? "ok" : den < 0.6 ? "warn" : "bad");
        }
      });
      const lenS = PL.ui.slider(ui.L.controls, { label: "胺基酸數", min: 2, max: 10, step: 1, value: 6, unit: "個", digits: 0 });
      const tempS = PL.ui.slider(ui.L.controls, { label: "環境溫度", min: 25, max: 95, step: 5, value: 37, unit: "°C", digits: 0 });
      PL.ui.note(ui.L.controls, "二十種胺基酸以胜肽鍵串成長鏈,再摺成特定立體形狀才有功能。拉高溫度看它解開——變性改變的是形狀,不是序列。");
      PL.ui.procedure(ui.L.controls, {
        title: "見證變性",
        steps: [
          "胺基酸數 6 時,胜肽鍵是幾個?(鍵數永遠比單元少一)",
          "把溫度從 37°C 慢慢拉到 95°C,盯著「變性程度」。",
          "降回 37°C:鏈會摺回原狀嗎?現實中高溫變性大多<b>不可逆</b>。"
        ],
        rule: "變性不切斷胜肽鍵、不改變序列,只破壞立體形狀——要把胜肽鍵切斷得靠水解(消化)。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "體溫下的酵素", apply: () => { lenS.set(6); tempS.set(37); } },
        { label: "溫泉邊緣 60°C", apply: () => { tempS.set(60); } },
        { label: "煮蛋 95°C", apply: () => { tempS.set(95); } }
      ] });
      const verdict = PL.ui.verdict(ui.L.controls, { label: "判定" });
      const rN = PL.ui.readout(ui.L.readouts, { label: "胺基酸數", unit: "個" }); const rBond = PL.ui.readout(ui.L.readouts, { label: "胜肽鍵數" });
      const rDen = PL.ui.readout(ui.L.readouts, { label: "變性程度", unit: "%" }); const rFun = PL.ui.readout(ui.L.readouts, { label: "功能狀態" });
      const chart = ui.chart("功能與溫度", "功能在約 55°C 之後急墜:S 型曲線。多數蛋白質過了 60°C 就回不去了。");
      const drawChart = () => CK.plot(chart, {
        x0: 25, x1: 95, y0: 0, y1: 1, xticks: [30, 45, 60, 75, 90], xlabel: "溫度 (°C)", ylabel: "相對功能",
        series: [{ fn: T => 1 / (1 + Math.exp((T - 62) / 5)), color: PL.col("accent") }],
        marks: [{ dot: [tempS.get(), 1 / (1 + Math.exp((tempS.get() - 62) / 5))], color: PL.col("accent-2"), label: "目前" }]
      });
      chart.onResize(drawChart); drawChart(); root.addEventListener("input", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 脂質與細胞膜 */
  PL.register("lipid", {
    build(root) {
      const KINDS = {
        fat: { name: "油脂(三酸甘油酯)", role: "儲能:每克約 9 kcal,是醣類的兩倍多", tail: 3, head: "甘油" },
        phospholipid: { name: "磷脂", role: "細胞膜骨架:親水頭朝外、疏水尾朝內", tail: 2, head: "甘油+磷酸" },
        wax: { name: "蠟", role: "防水塗層:葉面角質層、蜂巢", tail: 1, head: "長鏈醇" }
      };
      const ui = CK.scaffold(root, {
        aspect: 0.60,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const key = kindSel.get(), kd = KINDS[key], sat = satS.get();
          const kinks = Math.round((100 - sat) / 100 * 2); // 每條尾鏈的 C=C 彎折數
          const mp = 4 + sat * 0.5, solid = mp > 25;       // 教學估算熔點 4–54°C
          CK.panel(ctx, W * 0.05, H * 0.10, W * 0.54, H * 0.74, kd.name);
          const gx = W * 0.18, gy = H * 0.26, tw = W * 0.055;
          if (key === "phospholipid") {
            D.disc(ctx, gx, gy - H * 0.115, 12, { fill: "#8fa8e8", stroke: "rgba(50,80,160,0.8)", width: 1.2 });
            D.text(ctx, "磷酸根(親水)", gx, gy - H * 0.165, { color: "#5a78c8", size: 9.5, align: "center" });
          }
          for (let i = 0; i < kd.tail; i++) {
            const sy = gy - H * 0.05 + i * H * 0.055;
            D.disc(ctx, gx, sy, 9, { fill: "#e8a0b4", stroke: "rgba(150,60,90,0.8)", width: 1.2 });
            let px = gx + 8, py = sy;
            const ex = px + tw * (kd.tail === 1 ? 2.4 : 1.9), ey = sy + H * 0.16;
            for (let s = 0; s < 4; s++) {
              const nx = lerp(gx + 8, ex, (s + 1) / 4);
              let ny = lerp(sy, ey, (s + 1) / 4) + (s % 2 ? 7 : -7);
              if (kinks > 0) ny += s === 1 ? 8 : s === 2 ? 16 : 0; // C=C 彎折
              D.line(ctx, px, py, nx, ny, "rgba(120,90,40,0.9)", 2.6);
              if (kinks > 0 && s === 1) D.text(ctx, "C=C", (px + nx) / 2, ny + 13, { color: "#ef8829", size: 8.5, align: "center" });
              px = nx; py = ny;
            }
          }
          D.text(ctx, kd.head + "(親水端)", gx, gy + H * 0.14, { color: PL.col("text-dim"), size: 10, align: "center" });
          D.text(ctx, "脂肪酸尾鏈(疏水)" + (kinks ? ":有彎折" : ":直鏈"), W * 0.32, gy + H * 0.24, { color: PL.col("text-dim"), size: 10, align: "center" });
          if (key === "phospholipid") {
            CK.bilayer(ctx, { x: W * 0.08, y: H * 0.60, w: W * 0.46, h: H * 0.20 }, { proteins: [{ x: 0.3, w: 16, channel: true, label: "通道蛋白" }] });
            D.text(ctx, "雙層排布:膜的主角", W * 0.31, H * 0.86, { color: PL.col("text-dim"), size: 10, align: "center" });
          } else {
            for (let i = 0; i < (solid ? 2 : 5); i++) D.disc(ctx, W * 0.14 + i * W * 0.09, H * 0.72, 10 + (i % 3) * 3, { fill: solid ? "rgba(250,240,210,0.9)" : "rgba(240,200,120,0.7)", stroke: "rgba(150,110,50,0.6)", width: 1.2 });
            D.text(ctx, solid ? "直鏈堆得緊 → 常溫固態(脂)" : "彎折使分子鬆散 → 常溫液態(油)", W * 0.31, H * 0.86, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          }
          CK.panel(ctx, W * 0.63, H * 0.14, W * 0.32, H * 0.56, "角色卡");
          D.text(ctx, kd.name, W * 0.79, H * 0.25, { color: PL.col("accent"), size: 12.5, align: "center", weight: "700" });
          D.text(ctx, kd.role, W * 0.79, H * 0.36, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          D.text(ctx, "溶於水?不溶(非極性)", W * 0.79, H * 0.47, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          CK.badge(ctx, W * 0.79, H * 0.58, solid ? "常溫固態" : "常溫液態", solid ? "#b06a3a" : "#c8a028");
          rSat.set(sat, 0); rMP.set(mp, 1); rKink.set(kinks, 0); rState.set(solid ? "固態脂肪" : "液態油(或軟蠟)");
        }
      });
      const kindSel = PL.ui.select(ui.L.controls, { label: "脂質", value: "fat", options: [
        { value: "fat", label: "油脂(三酸甘油酯)" }, { value: "phospholipid", label: "磷脂(細胞膜)" }, { value: "wax", label: "蠟(防水)" }
      ] });
      const satS = PL.ui.slider(ui.L.controls, { label: "飽和脂肪酸比例", min: 0, max: 100, step: 5, value: 60, unit: "%", digits: 0 });
      PL.ui.note(ui.L.controls, "飽和脂肪酸是直鏈,堆得緊、常溫成固態;不飽和有 C=C 彎折,分子鬆散、常溫是液態。油脂、磷脂、蠟都疏水,角色卻完全不同。");
      PL.ui.procedure(ui.L.controls, {
        title: "結構對應性質",
        steps: [
          "飽和度 0%:數數每條尾鏈有幾個 C=C 彎折,看常溫狀態徽章。",
          "拉到 100%:彎折消失,徽章變成「常溫固態」。",
          "切到「磷脂」:兩條尾加上親水頭,正好排成雙層膜。"
        ],
        rule: "「脂肪」與「油」化學上都是三酸甘油酯,差別只是飽和度帶來的常溫狀態——不是兩種不同物質。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "牛油(飽和高)", apply: () => { kindSel.set("fat"); satS.set(85); } },
        { label: "橄欖油(不飽和)", apply: () => { kindSel.set("fat"); satS.set(20); } },
        { label: "細胞膜磷脂", apply: () => { kindSel.set("phospholipid"); satS.set(50); } }
      ] });
      const rSat = PL.ui.readout(ui.L.readouts, { label: "飽和度", unit: "%" }); const rMP = PL.ui.readout(ui.L.readouts, { label: "估計熔點", unit: "°C" });
      const rKink = PL.ui.readout(ui.L.readouts, { label: "每鏈彎折數" }); const rState = PL.ui.readout(ui.L.readouts, { label: "常溫狀態" });
      const chart = ui.chart("熔點與飽和度", "飽和度越高熔點越高:直鏈堆得緊,需要更多熱量才拆得開。橘色虛線是常溫 25°C 的分界。");
      const drawChart = () => CK.plot(chart, {
        x0: 0, x1: 100, y0: 0, y1: 60, xticks: [25, 50, 75], xlabel: "飽和度 (%)", ylabel: "估計熔點 (°C)",
        series: [{ fn: s => 4 + s * 0.5, color: PL.col("accent") }],
        marks: [{ dot: [satS.get(), 4 + satS.get() * 0.5], color: PL.col("accent-2"), label: "目前" }, { hline: 25, color: "#ef8829", dash: [4, 4] }]
      });
      chart.onResize(drawChart); drawChart(); root.addEventListener("input", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 核酸:DNA 與 RNA */
  PL.register("nucleic-acid", {
    build(root) {
      const PAIR = { A: "U", U: "A", G: "C", C: "G" }, TO_RNA = { AT: "A", TA: "U", GC: "G", CG: "C" };
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const isDNA = kindSel.get() === "dna", gc = gcS.get(), open = openS.get();
          const seq = [];
          for (let i = 0; i < 18; i++) { const r = ((i + 1) * 0.61803) % 1; seq.push(r < gc / 100 ? (i % 2 ? "GC" : "CG") : (i % 2 ? "AT" : "TA")); }
          CK.panel(ctx, W * 0.05, H * 0.10, W * 0.55, H * 0.76, isDNA ? "DNA:雙股螺旋" : "RNA:單股(可自身摺疊)");
          if (isDNA) {
            const box = { x: W * 0.18, y: H * 0.16, w: W * 0.28, h: H * 0.66 };
            const r = CK.dnaHelix(ctx, box, { seq, unzip: open / 100, showBases: true, turns: 1.7 });
            D.text(ctx, "A=T  G≡C(互補配對)", W * 0.32, H * 0.13, { color: PL.col("text-dim"), size: 10, align: "center" });
            if (open > 5) { D.line(ctx, W * 0.14, r.cutY, W * 0.52, r.cutY, PL.col("accent"), 1.2, [4, 4]); D.text(ctx, "解開區:兩股分開當模板", W * 0.32, r.cutY + 14, { color: PL.col("accent"), size: 10, align: "center" }); }
          } else {
            const bx = W * 0.28, y0 = H * 0.15, y1 = H * 0.80, fold = open / 100;
            const letters = seq.map(p => TO_RNA[p]), wave = y => bx + Math.sin((y - y0) * 0.09) * 8;
            ctx.save(); ctx.strokeStyle = "rgba(150,100,180,0.95)"; ctx.lineWidth = 3; ctx.beginPath();
            for (let y = y0; y <= y1; y += 4) { const x = wave(y); y === y0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
            ctx.stroke(); ctx.restore();
            for (let i = 0; i < 16; i++) {
              const y = y0 + 8 + i * (y1 - y0 - 18) / 15, x = wave(y) + (i % 2 ? 15 : -15), c = CK.baseColor(letters[i]);
              D.disc(ctx, x, y, 6.5, { fill: c, stroke: "rgba(0,0,0,0.25)", width: 1 });
              D.text(ctx, letters[i], x, y + 3, { color: "#18202b", size: 8.5, align: "center", weight: "700" });
            }
            if (fold > 0.03) { // 髮夾:回摺股與自身配對
              const hy0 = lerp(y1 - 12, y0 + 28, fold), hx = bx + W * 0.09;
              D.line(ctx, wave(y1), y1, hx, y1 - 12, "rgba(150,100,180,0.9)", 3);
              ctx.save(); ctx.strokeStyle = "rgba(90,130,170,0.95)"; ctx.lineWidth = 3; ctx.beginPath();
              for (let y = hy0; y <= y1 - 12; y += 4) { const x = hx + Math.sin(y * 0.1) * 5; y === hy0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
              ctx.stroke(); ctx.restore();
              for (let y = hy0 + 8; y < y1 - 20; y += 13) {
                const L1 = letters[clamp(Math.round((y - y0) / (y1 - y0) * 15), 0, 15)];
                D.line(ctx, wave(y), y, hx, y, CK.baseColor(L1), 3.2);
                D.line(ctx, (wave(y) + hx) / 2, y, hx, y, CK.baseColor(PAIR[L1]), 3.2);
              }
              D.text(ctx, "髮夾:自身鹼基配對(A-U、G-C)", hx + 8, hy0 - 8, { color: PL.col("text-dim"), size: 9.5 });
            }
            D.text(ctx, "五碳醣是核糖,通常單股", W * 0.32, H * 0.88, { color: PL.col("text-dim"), size: 10, align: "center" });
          }
          CK.panel(ctx, W * 0.64, H * 0.14, W * 0.31, H * 0.58, "分子身分證");
          [["股數", isDNA ? "雙股螺旋" : "單股(常摺疊)"], ["五碳醣", isDNA ? "去氧核糖" : "核糖"], ["配對", isDNA ? "A=T、G≡C" : "A=U、G≡C"]].forEach(([kk, v], i) => {
            D.text(ctx, kk, W * 0.67, H * 0.25 + i * 34, { color: PL.col("text-faint"), size: 10 });
            D.text(ctx, v, W * 0.67, H * 0.25 + i * 34 + 14, { color: PL.col("text"), size: 11.5, weight: "700" });
          });
          D.text(ctx, "ATP 也是一種核苷酸", W * 0.795, H * 0.62, { color: PL.col("text-faint"), size: 10, align: "center" });
          rGC.set(gc, 0); rTm.set(40 + gc * 0.5, 1); rKind.set(isDNA ? "DNA" : "RNA"); rStrand.set(isDNA ? "2" : "1(常摺疊)");
        }
      });
      const kindSel = PL.ui.select(ui.L.controls, { label: "分子", value: "dna", options: [
        { value: "dna", label: "DNA(去氧核糖核酸)" }, { value: "rna", label: "RNA(核糖核酸)" }
      ] });
      const gcS = PL.ui.slider(ui.L.controls, { label: "GC 含量", min: 10, max: 90, step: 5, value: 50, unit: "%", digits: 0 });
      const openS = PL.ui.slider(ui.L.controls, { label: "解開/摺疊程度", min: 0, max: 100, step: 5, value: 0, unit: "%", digits: 0 });
      PL.ui.note(ui.L.controls, "核苷酸 = 鹼基 + 五碳醣 + 磷酸。A 只配 T(U)、G 只配 C——拉高 GC 含量,三鍵的 G≡C 變多,分子更耐熱。");
      PL.ui.procedure(ui.L.controls, {
        title: "讀出 GC 的影響",
        steps: [
          "DNA 模式下把解開程度拉到 100%,看兩股分離。",
          "GC 含量 10% 與 90% 各記一次「估算變性溫度」。",
          "切到 RNA:同一支滑桿變成「摺疊」——單股自己摺出髮夾。"
        ],
        rule: "G≡C 有三個氫鍵、A=T 只有兩個:GC 含量高的 DNA 更耐熱,PCR 常因此調高變性溫度。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "人類 DNA(GC 約 40%)", apply: () => { kindSel.set("dna"); gcS.set(40); openS.set(0); } },
        { label: "耐熱菌 DNA(GC 高)", apply: () => { kindSel.set("dna"); gcS.set(70); openS.set(20); } },
        { label: "RNA(摺疊中)", apply: () => { kindSel.set("rna"); openS.set(60); } }
      ] });
      const rKind = PL.ui.readout(ui.L.readouts, { label: "分子" }); const rStrand = PL.ui.readout(ui.L.readouts, { label: "股數" });
      const rGC = PL.ui.readout(ui.L.readouts, { label: "GC 含量", unit: "%" }); const rTm = PL.ui.readout(ui.L.readouts, { label: "估算變性溫度", unit: "°C" });
      const chart = ui.chart("GC 含量與熱穩定性", "GC 越多、氫鍵越多,把雙股拉開需要的溫度越高——直線上升,教學估算值。");
      const drawChart = () => CK.plot(chart, {
        x0: 0, x1: 100, y0: 30, y1: 100, xticks: [25, 50, 75], xlabel: "GC 含量 (%)", ylabel: "變性溫度 Tm (°C)",
        series: [{ fn: g => 40 + g * 0.5, color: PL.col("accent") }],
        marks: [{ dot: [gcS.get(), 40 + gcS.get() * 0.5], color: PL.col("accent-2"), label: "目前" }]
      });
      chart.onResize(drawChart); drawChart(); root.addEventListener("input", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 本氏液檢測還原醣 */
  PL.register("food-test-benedict", {
    build(root) {
      const SAMPLES = {
        glucose: { name: "葡萄糖液", sugar: 0.9 }, sucrose: { name: "蔗糖液", sugar: 0 }, honey: { name: "蜂蜜水", sugar: 0.8 },
        potato: { name: "馬鈴薯汁", sugar: 0.15 }, water: { name: "蒸餾水(對照)", sugar: 0 }
      };
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const s = SAMPLES[sampleSel.get()], time = heatS.get();
          const level = s.sugar * clamp(time / 2, 0, 1);       // 2 分鐘內顯色漸趨完全
          const tubeCol = level > 0.05 ? CK.benedictColor(level) : "#4a90d9", temp = 25 + clamp(time * 18, 0, 72), hot = time > 0;
          const topY = CK.hotplate(ctx, W * 0.27, H * 0.88, W * 0.34, hot ? 0.85 : 0);
          CK.beaker(ctx, W * 0.27, topY, W * 0.30, H * 0.44, 0.68, null);
          CK.testTube(ctx, W * 0.27, topY - 8, 30, H * 0.36, 0.55, tubeCol);
          if (hot) bathBubbles(ctx, W * 0.22, topY - H * 0.05, W * 0.14, 6, t);
          CK.thermometer(ctx, W * 0.45, topY - H * 0.42, topY, (temp - 25) / 72);
          CK.dropper(ctx, W * 0.27, H * 0.06, H * 0.22, { fill: "#4a90d9" }); CK.drop(ctx, W * 0.27, H * 0.26 + Math.sin(t * 2.5) * 2, "#4a90d9");
          D.text(ctx, "滴入本氏液", W * 0.345, H * 0.15, { color: PL.col("text-dim"), size: 10 });
          D.text(ctx, "隔水加熱(水浴)", W * 0.27, H * 0.95, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          CK.panel(ctx, W * 0.56, H * 0.14, W * 0.39, H * 0.56, "顏色階梯(含量由少到多)");
          ["藍(陰性)", "綠(+)", "黃(++)", "橙(+++)", "磚紅(+++++)"].forEach((label, i) => {
            const y = H * 0.22 + i * 30, on = level > 0.05 && Math.round(clamp(level, 0, 1) * 4) === i;
            if (on) D.ring(ctx, W * 0.60, y, 13, PL.col("accent"), 2);
            D.disc(ctx, W * 0.60, y, 10, { fill: CK.benedictColor(i / 4), stroke: PL.col("border"), width: 1 });
            D.text(ctx, label, W * 0.65, y + 4, { color: on ? PL.col("text") : PL.col("text-faint"), size: 11, weight: on ? "700" : "" });
          });
          D.text(ctx, "沉澱物:氧化亞銅 Cu₂O", W * 0.755, H * 0.66, { color: PL.col("text-faint"), size: 10, align: "center" });
          rTemp.set(temp, 0); rSugar.set(Math.round(s.sugar * 100), 0);
          rCol.set(level > 0.6 ? "磚紅色沉澱" : level > 0.3 ? "橙色" : level > 0.05 ? "綠~黃色" : "藍色(原色)");
          verdict.set(sampleSel.get() === "sucrose" ? "蔗糖不是還原醣:需先加酸水解才會變色" : level > 0.05 ? "陽性:還原醣把 Cu²⁺ 還原成 Cu₂O" : "陰性:維持藍色", sampleSel.get() === "sucrose" ? "warn" : level > 0.05 ? "ok" : "info");
        }
      });
      const sampleSel = PL.ui.select(ui.L.controls, { label: "樣品", value: "glucose", options: [
        { value: "glucose", label: "葡萄糖液" }, { value: "sucrose", label: "蔗糖液" }, { value: "honey", label: "蜂蜜水" },
        { value: "potato", label: "馬鈴薯汁" }, { value: "water", label: "蒸餾水(對照)" }
      ] });
      const heatS = PL.ui.slider(ui.L.controls, { label: "隔水加熱時間", min: 0, max: 4, step: 0.5, value: 0, unit: "分", digits: 1 });
      PL.ui.note(ui.L.controls, "本氏液含藍色硫酸銅;還原醣(葡萄糖、果糖、麥芽糖)加熱後把它還原成磚紅色 Cu₂O 沉澱。顏色越紅,還原醣越多。");
      PL.ui.procedure(ui.L.controls, {
        title: "標準流程",
        steps: [
          "取樣品液約 1 mL 入試管,滴入本氏液數滴。",
          "<b>隔水加熱</b>約 2 分鐘,觀察顏色由藍漸變到磚紅。",
          "用蒸餾水做對照:應維持藍色,證明變色來自樣品。"
        ],
        rule: "一定要隔水加熱:直接火烤試管會局部過熱、爆沸噴濺鹼性試液;水浴溫度均勻,結果才好比較。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "標準陽性(葡萄糖)", apply: () => { sampleSel.set("glucose"); heatS.set(3); } },
        { label: "蔗糖陷阱", apply: () => { sampleSel.set("sucrose"); heatS.set(3); } },
        { label: "對照組", apply: () => { sampleSel.set("water"); heatS.set(3); } }
      ] });
      const verdict = PL.ui.verdict(ui.L.controls, { label: "判定" });
      const rTemp = PL.ui.readout(ui.L.readouts, { label: "水浴溫度", unit: "°C" }); const rSugar = PL.ui.readout(ui.L.readouts, { label: "還原醣相對量", unit: "%" });
      const rCol = PL.ui.readout(ui.L.readouts, { label: "顏色結果" });
      const chart = ui.chart("加熱時間與顯色", "顯色程度隨加熱時間上升,約 2 分鐘後到達該樣品的上限——之後再加熱只是維持,不會更紅。");
      const drawChart = () => {
        const s = SAMPLES[sampleSel.get()];
        CK.plot(chart, {
          x0: 0, x1: 4, y0: 0, y1: 100, xticks: [1, 2, 3], xlabel: "加熱時間 (分)", ylabel: "顯色程度 (%)",
          series: [{ fn: x => s.sugar * 100 * clamp(x / 2, 0, 1), color: PL.col("accent") }],
          marks: [{ dot: [heatS.get(), s.sugar * 100 * clamp(heatS.get() / 2, 0, 1)], color: PL.col("accent-2"), label: "目前" }]
        });
      };
      chart.onResize(drawChart); drawChart(); root.addEventListener("input", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 碘液檢測澱粉 */
  PL.register("food-test-iodine", {
    build(root) {
      const SAMPLES = [
        { name: "澱粉液", kind: "starch", amt: 0.9, base: "#e6e3da" }, { name: "肝醣液", kind: "glycogen", base: "#e6e3da" },
        { name: "葡萄糖液", kind: "mono", base: "#dfe8f0" }, { name: "馬鈴薯汁", kind: "starch", amt: 0.7, base: "#e9e2cf" }
      ];
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const si = Math.round(sampSel.get()), drops = Math.round(dropS.get()), depth = clamp(drops / 2, 0, 1);
          const colOf = (s) => drops === 0 ? s.base
            : s.kind === "starch" ? CK.mix("#b98a3c", "#3d3d8f", depth * (s.amt || 1))
            : s.kind === "glycogen" ? CK.mix("#b98a3c", "#8d4f1e", depth) : "#b98a3c"; // 單醣:碘液原色
          const rack = CK.tubeRack(ctx, W * 0.30, H * 0.78, 4, 30, H * 0.36);
          SAMPLES.forEach((s, i) => {
            const x = rack.start + i * rack.gap;
            CK.testTube(ctx, x, H * 0.77, 30, H * 0.36, 0.55, colOf(s));
            if (i === si) {
              D.ring(ctx, x, H * 0.60, 34, PL.col("accent"), 2, [5, 4]);
              CK.dropper(ctx, x, H * 0.10, H * 0.28, { fill: "#b98a3c" });
              for (let k = 0; k < drops; k++) CK.drop(ctx, x + Math.sin(k * 2 + t) * 2, H * 0.30 + ((t * 0.9 + k * 0.4) % 1) * H * 0.10, "#b98a3c");
            }
            D.text(ctx, s.name, x, H * 0.86, { color: PL.col("text-dim"), size: 9.5, align: "center" });
          });
          D.text(ctx, "常溫即可反應,不必加熱", W * 0.30, H * 0.94, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          CK.panel(ctx, W * 0.58, H * 0.14, W * 0.37, H * 0.58, "判定對照");
          const cur = SAMPLES[si];
          const res = drops === 0 ? "尚未滴碘液" : cur.kind === "starch" ? "深藍紫色" : cur.kind === "glycogen" ? "紅棕色" : "黃褐色(原色)";
          CK.badge(ctx, W * 0.765, H * 0.26, res, drops === 0 ? PL.col("border") : colOf(cur));
          [["澱粉", "藍紫色(碘鑽入螺旋)"], ["肝醣", "紅棕色(分支多、螺旋短)"], ["單醣/雙醣", "不變色(鏈太短)"]].forEach(([kk, v], i) => {
            D.text(ctx, kk, W * 0.61, H * 0.36 + i * 38, { color: PL.col("text-faint"), size: 10 });
            D.text(ctx, v, W * 0.61, H * 0.36 + i * 38 + 14, { color: PL.col("text-dim"), size: 10.5 });
          });
          rSamp.set(cur.name); rDrop.set(drops, 0); rRes.set(res);
          verdict.set(drops === 0 ? "把「碘液滴數」拉到 1 以上開始反應" :
            cur.kind === "starch" ? "澱粉陽性:藍紫色來自碘嵌入螺旋結構" : cur.kind === "glycogen" ? "肝醣呈紅棕:不是澱粉的典型陽性" : "陰性:單醣無法捲成螺旋,碘液不變色",
            drops === 0 ? "info" : cur.kind === "starch" ? "ok" : "info");
        }
      });
      const sampSel = PL.ui.slider(ui.L.controls, { label: "受測試管", min: 0, max: 3, step: 1, value: 0, digits: 0 });
      const dropS = PL.ui.slider(ui.L.controls, { label: "碘液滴數", min: 0, max: 5, step: 1, value: 0, unit: "滴", digits: 0 });
      PL.ui.note(ui.L.controls, "碘–碘化鉀液遇澱粉呈深藍紫:碘分子鑽進澱粉的螺旋結構。肝醣分支多、螺旋短,只呈紅棕色;單醣雙醣鏈太短,完全不變色。");
      PL.ui.procedure(ui.L.controls, {
        title: "四管一起比",
        steps: [
          "先用「受測試管」選澱粉液,滴入碘液 2 滴。",
          "逐一換管:葡萄糖液應維持原色,當<b>陰性對照</b>。",
          "注意馬鈴薯汁:澱粉濃度較低,藍紫色較淺但仍是陽性。"
        ],
        rule: "碘液常溫即可反應,加熱反而讓藍紫色消失——螺旋被熱解開,冷卻後又捲回去重新顯色。"
      });
      const verdict = PL.ui.verdict(ui.L.controls, { label: "判定" });
      const rSamp = PL.ui.readout(ui.L.readouts, { label: "受測樣品" }); const rDrop = PL.ui.readout(ui.L.readouts, { label: "碘液滴數", unit: "滴" });
      const rRes = PL.ui.readout(ui.L.readouts, { label: "反應顏色" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 雙縮脲與蘇丹 III 檢測 */
  PL.register("food-test-protein-lipid", {
    build(root) {
      const SAMPLES = {
        albumin: { name: "蛋白液", protein: 0.9, lipid: 0 }, milk: { name: "牛奶", protein: 0.45, lipid: 0.3 },
        oil: { name: "植物油", protein: 0, lipid: 0.9 }, water: { name: "蒸餾水(對照)", protein: 0, lipid: 0 }
      };
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const s = SAMPLES[sampleSel.get()], biuret = reagSel.get() === "biuret";
          const conc = concS.get() / 100, naoh = naohC.get(), cu = cuC.get();
          let col = "#dfe6ee", res = "樣品本色", bad = false, oil = false;
          if (biuret) {
            if (naoh && cu) {
              const lv = s.protein * conc;
              col = lv > 0.05 ? CK.mix("#8fa8c8", "#5a2a82", lv) : "#cfd9e4";
              res = lv > 0.5 ? "深紫紅(蛋白質豐富)" : lv > 0.05 ? "淡紫紅(含蛋白質)" : "維持試劑色(陰性)";
            } else if (!naoh && cu) { col = "#4a90d9"; res = "藍色沉澱(順序錯誤)"; bad = true; }
            else if (naoh) { col = "#cfd9e4"; res = "無色(NaOH 已鹼化,還沒加硫酸銅)"; }
            else { col = "#dfe6ee"; res = "尚未加試劑"; }
          } else {
            const lv = s.lipid * conc;
            if (lv > 0.05) { col = "#e8945a"; res = lv > 0.5 ? "鮮橙紅(油脂豐富)" : "橙紅(含油脂)"; oil = true; }
            else { col = "#e8b46a"; res = "染料層維持原色(陰性)"; }
          }
          const fill = 0.30 + conc * 0.30, surfY = H * 0.80 - H * 0.40 * fill; // 液面隨樣品濃度升降
          CK.testTube(ctx, W * 0.28, H * 0.80, 32, H * 0.40, fill, col);
          if (oil) {
            for (let i = 0; i < 7; i++) D.disc(ctx, W * 0.28 - 9 + (i % 4) * 6, surfY - 8 - Math.floor(i / 4) * 9 + Math.sin(t * 2 + i) * 1.2, 3.2, { fill: "#e2662a" });
            D.text(ctx, "油滴被染成橙紅", W * 0.28, surfY - 34, { color: "#c2542a", size: 9.5, align: "center" });
          }
          const dcol = biuret ? (cu ? "#4a90d9" : "#cfd9e4") : "#e2662a";
          CK.dropper(ctx, W * 0.28, H * 0.06, H * 0.24, { fill: dcol }); CK.drop(ctx, W * 0.28, H * 0.27 + Math.sin(t * 2.5) * 2, dcol);
          D.text(ctx, biuret ? "雙縮脲法:測胜肽鍵" : "蘇丹 III:脂溶性染料", W * 0.28, H * 0.92, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          CK.panel(ctx, W * 0.56, H * 0.14, W * 0.39, H * 0.56, "兩種試劑怎麼用");
          [["雙縮脲", "鹼性下 Cu²⁺ 與胜肽鍵錯合 → 紫紅"], ["順序", "先加 NaOH,再加稀硫酸銅"], ["蘇丹 III", "溶入油滴 → 橙紅(可顯微觀察)"]].forEach(([kk, v], i) => {
            D.text(ctx, kk, W * 0.59, H * 0.24 + i * 42, { color: PL.col("text-faint"), size: 10 });
            D.text(ctx, v, W * 0.59, H * 0.24 + i * 42 + 14, { color: i === 1 ? PL.col("accent") : PL.col("text-dim"), size: 10.5, weight: i === 1 ? "700" : "" });
          });
          CK.meter(ctx, W * 0.59, H * 0.64, W * 0.33, 9, conc, { color: PL.col("accent-2"), label: "樣品濃度" });
          rProt.set(Math.round(s.protein * conc * 100), 0); rLip.set(Math.round(s.lipid * conc * 100), 0);
          rCol.set(res); rReag.set(biuret ? "雙縮脲" : "蘇丹 III");
          verdict.set(bad ? "順序錯誤:沒有鹼性環境,Cu²⁺ 變成藍色沉澱而不是紫紅色" :
            biuret && naoh && cu && s.protein * conc > 0.05 ? "陽性:紫紅色錯合物,顏色越深蛋白質越多" :
            !biuret && oil ? "陽性:蘇丹 III 專染油脂" : "陰性:維持原色", bad ? "bad" : biuret && s.protein * conc > 0.05 || oil ? "ok" : "info");
        }
      });
      const sampleSel = PL.ui.select(ui.L.controls, { label: "樣品", value: "albumin", options: [
        { value: "albumin", label: "蛋白液" }, { value: "milk", label: "牛奶" }, { value: "oil", label: "植物油" }, { value: "water", label: "蒸餾水(對照)" }
      ] });
      const reagSel = PL.ui.select(ui.L.controls, { label: "試劑", value: "biuret", options: [
        { value: "biuret", label: "雙縮脲(測蛋白質)" }, { value: "sudan", label: "蘇丹 III(測油脂)" }
      ] });
      const naohC = PL.ui.checkbox(ui.L.controls, { label: "已加 NaOH(步驟一)", checked: false });
      const cuC = PL.ui.checkbox(ui.L.controls, { label: "已加硫酸銅(步驟二)", checked: false });
      const concS = PL.ui.slider(ui.L.controls, { label: "樣品濃度", min: 10, max: 100, step: 10, value: 80, unit: "%", digits: 0 });
      PL.ui.note(ui.L.controls, "雙縮脲認的是<b>胜肽鍵</b>不是蛋白質名字;蘇丹 III 是脂溶性,專染油滴。切到蘇丹 III 時,NaOH/CuSO₄ 開關不參與反應。");
      PL.ui.procedure(ui.L.controls, {
        title: "順序就是化學",
        steps: [
          "選蛋白液、雙縮脲:先勾「已加 NaOH」,再勾「已加硫酸銅」。",
          "重來一次,但<b>跳過 NaOH</b> 直接加硫酸銅,看判定徽章。",
          "切到蘇丹 III 選植物油:油滴層變橙紅,水層不變。"
        ],
        rule: "雙縮脲的鐵律:先 NaOH 後 CuSO₄。少了鹼性環境,銅離子直接沉澱成藍色氫氧化銅,不會出現紫紅色。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "蛋白液全流程", apply: () => { sampleSel.set("albumin"); reagSel.set("biuret"); naohC.set(true); cuC.set(true); concS.set(90); } },
        { label: "順序錯誤示範", apply: () => { sampleSel.set("albumin"); reagSel.set("biuret"); naohC.set(false); cuC.set(true); } },
        { label: "植物油/蘇丹 III", apply: () => { sampleSel.set("oil"); reagSel.set("sudan"); concS.set(90); } }
      ] });
      const verdict = PL.ui.verdict(ui.L.controls, { label: "判定" });
      const rProt = PL.ui.readout(ui.L.readouts, { label: "胜肽鍵相對量", unit: "%" }); const rLip = PL.ui.readout(ui.L.readouts, { label: "油脂相對量", unit: "%" });
      const rReag = PL.ui.readout(ui.L.readouts, { label: "使用試劑" }); const rCol = PL.ui.readout(ui.L.readouts, { label: "顏色結果" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 消化酵素實驗:澱粉的分解 */
  PL.register("enzyme-digestion", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const time = timeS.get(), T = tempS.get(), iodine = testSel.get() === "iodine";
          const act = T >= 60 ? 0 : Math.exp(-Math.pow((T - 37) / 18, 2)); // 37°C 活性最高,≥60°C 變性
          const k = 0.25 * act, starchA = Math.exp(-k * time), malt = 1 - starchA; // A 管:新鮮唾液
          const colA = iodine ? CK.mix("#b98a3c", "#3d3d8f", starchA) : (malt > 0.05 ? CK.benedictColor(malt) : "#4a90d9"), colB = iodine ? CK.mix("#b98a3c", "#3d3d8f", 1) : "#4a90d9"; // B 管:煮沸唾液,澱粉原封不動
          const topY = CK.hotplate(ctx, W * 0.28, H * 0.88, W * 0.40, T > 30 ? 0.7 : 0);
          CK.beaker(ctx, W * 0.28, topY, W * 0.38, H * 0.46, 0.68, null);
          if (T > 30) { bathBubbles(ctx, W * 0.16, topY - H * 0.05, W * 0.10, 4, t); bathBubbles(ctx, W * 0.40, topY - H * 0.05, W * 0.10, 4, t + 0.5); }
          CK.testTube(ctx, W * 0.21, topY - 8, 26, H * 0.38, 0.55, colA); CK.testTube(ctx, W * 0.35, topY - 8, 26, H * 0.38, 0.55, colB);
          D.text(ctx, "A", W * 0.21, H * 0.33, { color: PL.col("text"), size: 12, align: "center", weight: "700" }); D.text(ctx, "B", W * 0.35, H * 0.33, { color: PL.col("text"), size: 12, align: "center", weight: "700" });
          D.text(ctx, "A:新鮮唾液+澱粉", W * 0.21, H * 0.95, { color: PL.col("text-dim"), size: 9.5, align: "center" }); D.text(ctx, "B:煮沸唾液+澱粉", W * 0.35, H * 0.95, { color: PL.col("text-dim"), size: 9.5, align: "center" });
          CK.thermometer(ctx, W * 0.50, topY - H * 0.44, topY, (T - 10) / 70);
          CK.panel(ctx, W * 0.58, H * 0.14, W * 0.37, H * 0.56, iodine ? "碘液檢測:澱粉還在嗎?" : "本氏液檢測:麥芽糖出現了嗎?");
          const resA = iodine ? (starchA > 0.5 ? "A 管藍紫:澱粉仍多" : starchA > 0.1 ? "A 管轉淡:澱粉減少" : "A 管原色:澱粉已分解") : (malt > 0.05 ? "A 管轉紅:麥芽糖累積" : "A 管藍色:尚未累積");
          D.text(ctx, resA, W * 0.60, H * 0.26, { color: PL.col("text"), size: 11, weight: "700" }); D.text(ctx, "B 管不變:酵素已煮沸失活", W * 0.60, H * 0.36, { color: PL.col("text-dim"), size: 11 });
          D.text(ctx, iodine ? "澱粉消失 + 還原醣出現 = 分解發生" : "兩種檢測互相印證分解產物", W * 0.60, H * 0.60, { color: PL.col("text-faint"), size: 10 });
          rSt.set(Math.round(starchA * 100), 0); rMal.set(Math.round(malt * 100), 0);
          rStB.set(100, 0); rAct.set(Math.round(act * 100), 0);
          verdict.set(T >= 60 ? "唾液澱粉酶已變性:兩管都測得到澱粉" : act < 0.3 ? "低溫:反應非常慢,需延長保溫" : "接近 37°C:活性最高,分解順利", T >= 60 ? "bad" : act < 0.3 ? "warn" : "ok");
        }
      });
      const timeS = PL.ui.slider(ui.L.controls, { label: "保溫時間", min: 0, max: 30, step: 2, value: 0, unit: "分", digits: 0 });
      const tempS = PL.ui.slider(ui.L.controls, { label: "水浴溫度", min: 10, max: 80, step: 5, value: 37, unit: "°C", digits: 0 });
      const testSel = PL.ui.select(ui.L.controls, { label: "檢測試劑", value: "iodine", options: [
        { value: "iodine", label: "碘液(追蹤澱粉)" }, { value: "benedict", label: "本氏液(追蹤麥芽糖)" }
      ] });
      PL.ui.note(ui.L.controls, "唾液澱粉酶把澱粉水解成麥芽糖。對照組 B 用煮沸唾液:同樣保溫、同樣檢測,卻始終陽性——差別只在酵素還活不活著。");
      PL.ui.procedure(ui.L.controls, {
        title: "控制變因讀結果",
        steps: [
          "37°C 下把保溫時間拉到 30 分:碘液檢測的 A 管顏色怎麼走?",
          "切到本氏液:A 管應由藍轉紅——澱粉變成了還原醣。",
          "把水浴溫度拉到 80°C 再保溫 30 分:A、B 兩管還有差別嗎?"
        ],
        rule: "煮沸唾液對照證明「分解者是怕熱的酵素」,不是水、時間或澱粉自己——少了對照組,結論站不住。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "標準體溫 37°C", apply: () => { tempS.set(37); timeS.set(20); } },
        { label: "冰浴 10°C", apply: () => { tempS.set(10); timeS.set(20); } },
        { label: "沸水 80°C(變性)", apply: () => { tempS.set(80); timeS.set(30); } }
      ] });
      const verdict = PL.ui.verdict(ui.L.controls, { label: "判定" });
      const rSt = PL.ui.readout(ui.L.readouts, { label: "A 管澱粉剩餘", unit: "%" }); const rMal = PL.ui.readout(ui.L.readouts, { label: "A 管麥芽糖", unit: "%" });
      const rStB = PL.ui.readout(ui.L.readouts, { label: "B 管澱粉剩餘", unit: "%" }); const rAct = PL.ui.readout(ui.L.readouts, { label: "酵素相對活性", unit: "%" });
      const chart = ui.chart("澱粉剩餘隨保溫時間", "實線是新鮮唾液(隨當前水溫變化),虛線是煮沸唾液:永遠 100%。兩線分得越開,代表酵素越賣力。");
      const drawChart = () => {
        const k = 0.25 * (tempS.get() >= 60 ? 0 : Math.exp(-Math.pow((tempS.get() - 37) / 18, 2)));
        CK.plot(chart, {
          x0: 0, x1: 30, y0: 0, y1: 110, xticks: [10, 20, 30], yticks: [25, 50, 75, 100], xlabel: "保溫時間 (分)", ylabel: "澱粉剩餘 (%)",
          series: [
            { fn: x => 100 * Math.exp(-k * x), color: PL.col("accent") },
            { fn: () => 100, color: "#e57373", dash: [5, 4] }
          ],
          marks: [{ dot: [timeS.get(), 100 * Math.exp(-k * timeS.get())], color: PL.col("accent-2"), label: "A 管" }]
        });
      };
      chart.onResize(drawChart); drawChart(); root.addEventListener("input", drawChart);
      return { stop() { ui.stop(); } };
    }
  });
})();
