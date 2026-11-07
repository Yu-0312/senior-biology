/* 模組十一 · 生態與環境 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, CK = window.BioLab, D = PL.draw;
  const { clamp, lerp, TAU } = PL;

  /* 族群成長與環境負載力 */
  PL.register("population-growth", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const r = rS.get(), K = kS.get(), tm = tS.get(), n0 = n0S.get();
          const Nof = tt => K / (1 + (K - n0) / n0 * Math.exp(-r * tt));
          const N = Nof(tm), frac = N / K, gr = r * N * (1 - frac);
          // 左:族群盤點(點陣)+ 負載力標尺
          CK.panel(ctx, W * 0.05, H * 0.10, W * 0.46, H * 0.78, "族群盤點(1 點 ≈ " + PL.fmt(K / 60, 0) + " 隻)");
          CK.counter(ctx, W * 0.09, H * 0.22, W * 0.38, Math.round(clamp(frac, 0, 1.05) * 60), { color: frac > 1 ? "#ef8829" : "#7fc8ff", r: 5 });
          CK.meter(ctx, W * 0.09, H * 0.74, W * 0.38, 10, clamp(frac, 0, 1), { color: frac > 1 ? "#e57373" : "#66bb6a", label: "N / K" });
          D.line(ctx, W * 0.09 + W * 0.19, H * 0.74 - 5, W * 0.09 + W * 0.19, H * 0.74 + 15, PL.col("warn"), 2);
          D.text(ctx, "K/2", W * 0.09 + W * 0.19, H * 0.74 + 24, { color: PL.col("warn"), size: 10, align: "center" });
          CK.badge(ctx, W * 0.17, H * 0.18, frac > 1 ? "衰退回 K" : frac > 0.9 ? "S 型後段" : frac < 0.45 ? "近似 J 型" : "S 型中段", frac > 1 ? "#c0392b" : "#5b8def");
          // 右:狀態判讀
          CK.panel(ctx, W * 0.55, H * 0.14, W * 0.40, H * 0.62, "狀態判讀");
          const rows = [
            ["環境負載力 K", PL.fmt(K, 0) + " 隻"],
            ["目前族群 N", PL.fmt(N, 0) + " 隻"],
            ["瞬時成長率 dN/dt", PL.fmt(gr, 1) + " 隻/天"],
            ["距離 K/2", PL.fmt(Math.abs(N - K / 2), 0) + " 隻"]
          ];
          rows.forEach(([k, v], i) => {
            D.text(ctx, k, W * 0.58, H * 0.26 + i * 30, { color: PL.col("text-dim"), size: 10.5 });
            D.text(ctx, v, W * 0.92, H * 0.26 + i * 30 + 1, { color: i >= 1 ? PL.col("accent") : PL.col("text"), size: 12, align: "right" });
          });
          D.text(ctx, frac > 1.02 ? "資源入不敷出:族群將衰退回 K" : frac > 0.96 ? "N ≈ K:出生 ≈ 死亡,成長歸零" : frac > 0.42 && frac < 0.58 ? "N ≈ K/2:此刻成長率最大" : "密度升高 → 阻力增強 → 成長趨緩", W * 0.75, H * 0.62, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          rN.set(N, 0); rG.set(gr, 1); rPct.set(frac * 100, 0);
          vd.set(frac > 1.02 ? "超過負載力:族群衰退(過度成長後崩落)" : frac > 0.96 ? "已達環境負載力,族群穩定" : frac > 0.42 && frac < 0.58 ? "位於 K/2:最大持續產量點" : "S 型成長進行中", frac > 1.02 ? "bad" : frac > 0.96 ? "warn" : frac > 0.42 && frac < 0.58 ? "ok" : "info");
        }
      });
      const rS = PL.ui.slider(ui.L.controls, { label: "內在成長率 r", min: 0.05, max: 1, step: 0.05, value: 0.35, unit: "/天", digits: 2 });
      const kS = PL.ui.slider(ui.L.controls, { label: "環境負載力 K", min: 100, max: 2000, step: 50, value: 800, unit: "隻", digits: 0 });
      const n0S = PL.ui.slider(ui.L.controls, { label: "初始族群 N₀", min: 10, max: 1500, step: 10, value: 10, unit: "隻", digits: 0 });
      const tS = PL.ui.slider(ui.L.controls, { label: "觀察時間", min: 0, max: 60, step: 1, value: 25, unit: "天", digits: 0 });
      PL.ui.note(ui.L.controls, "J 型只在資源無限的理想條件;現實中密度升高讓阻力增強,族群收斂於負載力 K。把 N₀ 拉超過 K,還能看到「衰退回 K」。");
      PL.ui.procedure(ui.L.controls, {
        title: "找出成長最快的時刻",
        steps: [
          "把「觀察時間」從 0 拉到 60,盯住「瞬時成長率」何時最大。",
          "確認:成長率峰值出現在 <b>N ≈ K/2</b>,不是 N 最大的時候。",
          "把 N₀ 調到 1200、K 保持 400:看族群如何衰退回負載力。"
        ],
        rule: "「族群最大」不等於「長得最快」:N = K 時成長率歸零,K/2 才是斜率峰值——漁業的「最大持續產量」就訂在這裡。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "培養皿細菌(近似 J 型)", apply: () => { rS.set(0.9); kS.set(2000); n0S.set(10); tS.set(12); } },
        { label: "K/2 漁業採收點", apply: () => { rS.set(0.4); kS.set(800); n0S.set(10); tS.set(11); } },
        { label: "補入超過負載力", apply: () => { rS.set(0.5); kS.set(400); n0S.set(1200); tS.set(20); } }
      ] });
      const rN = PL.ui.readout(ui.L.readouts, { label: "目前族群量", unit: "隻" });
      const rG = PL.ui.readout(ui.L.readouts, { label: "瞬時成長率", unit: "隻/天" });
      const rPct = PL.ui.readout(ui.L.readouts, { label: "N / K", unit: "%" });
      const vd = PL.ui.verdict(ui.L.controls, { label: "族群判定" });
      const chart = ui.chart("族群成長曲線", "實線是 S 型(logistic),虛線是無限資源的 J 型——兩者只在起步階段重合;棕色橫線是 K。");
      const drawChart = () => {
        const r = rS.get(), K = kS.get(), n0 = n0S.get();
        const Nof = tt => K / (1 + (K - n0) / n0 * Math.exp(-r * tt));
        const cap = Math.max(K, n0) * 1.35, jPts = [];
        for (let i = 0; i <= 150; i++) {
          const tt = i / 150 * 60, j = n0 * Math.exp(r * tt);
          if (j > cap) break;
          jPts.push([tt, j]);
        }
        CK.plot(chart, {
          x0: 0, x1: 60, y0: 0, y1: cap,
          xlabel: "時間 (天)", ylabel: "族群量 (隻)",
          series: [{ fn: Nof, color: PL.col("accent") }, { pts: jPts, color: "#e57373", dash: [5, 4], width: 1.8 }],
          marks: [{ hline: K, color: PL.col("warn"), dash: [3, 3] }, { dot: [tS.get(), Nof(tS.get())], color: PL.col("accent-2"), label: "目前" }]
        });
      };
      chart.onResize(drawChart);
      drawChart();
      root.addEventListener("input", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 種間互動:捕食、競爭與共生 */
  PL.register("population-interaction", {
    build(root) {
      const MODES = {
        pred: { name: "捕食", a: "獵物(兔)", b: "捕食者(猞猁)", ab: "＋ 提供食物", ba: "− 捕食壓力" },
        comp: { name: "競爭", a: "物種 A(原生)", b: "物種 B(入侵)", ab: "− 爭奪資源", ba: "− 爭奪資源" },
        mutual: { name: "互利共生", a: "藻(行光合)", b: "菌(供礦物)", ab: "＋ 供給礦物", ba: "＋ 獲得養分" }
      };
      // 兩族群動態(RK2 積分):捕食用 Lotka–Volterra,競爭用區位重疊 α,共生讓彼此的 K 上升
      const integ = (mode, s, tm) => {
        const dt = 0.04, n = clamp(Math.round(tm / dt), 2, 900);
        let x, y; const A = [], B = [];
        if (mode === "pred") { x = 2; y = 1.4; }
        else if (mode === "comp") { x = 300; y = 300; }
        else { x = 80; y = 80; }
        A.push(x); B.push(y);
        const f = (a, b) => mode === "pred" ? [a * (1 - b), s * b * (a - 1)]
          : mode === "comp" ? [0.45 * a * (1 - (a + s * b) / 620), 0.55 * b * (1 - (b + s * a) / 550)]
            : [0.4 * a * (1 - a / (600 + 700 * s * b / 300)), 0.35 * b * (1 - b / (600 + 700 * s * a / 300))];
        for (let i = 0; i < n; i++) {
          const d1 = f(x, y), d2 = f(x + d1[0] * dt, y + d1[1] * dt);
          x = Math.max(0.2, x + dt * (d1[0] + d2[0]) / 2);
          y = Math.max(0.2, y + dt * (d1[1] + d2[1]) / 2);
          A.push(x); B.push(y);
        }
        return { A, B };
      };
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const key = modeSel.get(), md = MODES[key];
          const s = sS.get(), tm = tS.get();
          const ser = integ(key, s, tm);
          const sc = key === "pred" ? [260, 46] : [1, 1];
          const capA = key === "pred" ? 1000 : key === "comp" ? 650 : 1450;
          const capB = key === "pred" ? 120 : capA;
          const aN = ser.A[ser.A.length - 1] * sc[0], bN = ser.B[ser.B.length - 1] * sc[1];
          const dots = (v, cap) => Math.round(clamp(v / cap, 0, 1) * 40);
          CK.panel(ctx, W * 0.05, H * 0.10, W * 0.46, H * 0.78, "互動示意:" + md.name);
          D.rect(ctx, W * 0.09, H * 0.26, W * 0.14, H * 0.30, { fill: "rgba(102,187,106,0.30)", stroke: "rgba(60,130,70,0.9)", width: 1.6, r: 8 });
          D.rect(ctx, W * 0.33, H * 0.26, W * 0.14, H * 0.30, { fill: "rgba(121,134,203,0.30)", stroke: "rgba(70,80,140,0.9)", width: 1.6, r: 8 });
          D.text(ctx, md.a, W * 0.16, H * 0.31, { color: PL.col("text"), size: 10.5, align: "center" });
          D.text(ctx, md.b, W * 0.40, H * 0.31, { color: PL.col("text"), size: 10.5, align: "center" });
          CK.counter(ctx, W * 0.105, H * 0.62, W * 0.11, dots(aN, capA), { color: "#66bb6a", r: 4 });
          CK.counter(ctx, W * 0.345, H * 0.62, W * 0.11, dots(bN, capB), { color: "#7986cb", r: 4 });
          D.arrow(ctx, W * 0.245, H * 0.34, W * 0.325, H * 0.34, { color: md.ab[0] === "＋" ? "#66bb6a" : "#e57373", width: 1 + s, label: md.ab });
          D.arrow(ctx, W * 0.325, H * 0.48, W * 0.245, H * 0.48, { color: md.ba[0] === "＋" ? "#66bb6a" : "#e57373", width: 1 + s, label: md.ba });
          D.text(ctx, "時間 " + PL.fmt(tm, 0) + " 代", W * 0.28, H * 0.22, { color: PL.col("text-dim"), size: 11, align: "center" });
          CK.panel(ctx, W * 0.55, H * 0.14, W * 0.40, H * 0.62, "現況");
          const MODEL = { pred: "dV/dt = V(1−P)、dP/dt = s·P(V−1)", comp: "dN/dt = rN(1 − (N + α·N′)/K)", mutual: "K_效 = K + m × 對方數量" };
          D.text(ctx, MODEL[key], W * 0.75, H * 0.24, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          D.text(ctx, md.a + " ≈ " + PL.fmt(aN, 0), W * 0.75, H * 0.34, { color: "#66bb6a", size: 12, align: "center", weight: "700" });
          D.text(ctx, md.b + " ≈ " + PL.fmt(bN, 0), W * 0.75, H * 0.42, { color: "#7986cb", size: 12, align: "center", weight: "700" });
          const extinct = ser.A[ser.A.length - 1] < 8 && key === "comp";
          const outcome = key === "pred" ? "兩族群週期性波動:獵物波峰領先捕食者"
            : extinct ? "競爭排除:B 淘汰了 A" : key === "comp" ? "資源分化:兩種共存" : "彼此的負載力都升高";
          D.text(ctx, outcome, W * 0.75, H * 0.52, { color: PL.col("text"), size: 11, align: "center" });
          rA.set(aN, 0); rB.set(bN, 0); rRes.set(outcome);
          vd.set(key === "pred" ? "波動有時間差:先見獵物增,後見捕食者增" : extinct ? "生態區位重疊(α ≥ 1)→ 競爭排除" : key === "comp" ? "區位重疊 α < 1 → 可以共存" : "共生關係:拆開兩敗俱傷", extinct ? "bad" : "info");
        }
      });
      const modeSel = PL.ui.select(ui.L.controls, { label: "互動類型", value: "pred", options: [
        { value: "pred", label: "捕食(兔 ↔ 猞猁)" }, { value: "comp", label: "競爭(區位重疊)" }, { value: "mutual", label: "互利共生(地衣)" }
      ] });
      const sS = PL.ui.slider(ui.L.controls, { label: "互動強度", min: 0.2, max: 1.2, step: 0.05, value: 0.9, digits: 2 });
      const tS = PL.ui.slider(ui.L.controls, { label: "觀察時間", min: 0, max: 30, step: 1, value: 15, unit: "代", digits: 0 });
      PL.ui.note(ui.L.controls, "捕食強度改變波動的形狀;競爭模式裡 α ≥ 1 代表兩種用盡完全相同的資源;共生模式讓彼此的環境負載力一起上升。");
      PL.ui.procedure(ui.L.controls, {
        title: "三種互動各自怎麼看",
        steps: [
          "捕食:拉時間 0→30,注意哪條曲線先到波峰(獵物先、捕食者後)。",
          "競爭:把互動強度拉到 1.0 以上,看 B 是否淘汰 A(<b>競爭排除原理</b>)。",
          "共生:拉高互動強度,兩條曲線應該一起爬升。"
        ],
        rule: "捕食波動裡「獵物多 → 捕食者之後才多」的時間差是模型重點;兩者同時到峰反而是錯的。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "雪兔–猞猁週期", apply: () => { modeSel.set("pred"); sS.set(1); tS.set(24); } },
        { label: "完全重疊 → 排除", apply: () => { modeSel.set("comp"); sS.set(1.1); tS.set(30); } },
        { label: "地衣(藻 + 菌)", apply: () => { modeSel.set("mutual"); sS.set(0.6); tS.set(30); } }
      ] });
      const rA = PL.ui.readout(ui.L.readouts, { label: "物種 A 現量", unit: "隻(示意)" });
      const rB = PL.ui.readout(ui.L.readouts, { label: "物種 B 現量", unit: "隻(示意)" });
      const rRes = PL.ui.readout(ui.L.readouts, { label: "互動結果" });
      const vd = PL.ui.verdict(ui.L.controls, { label: "互動判定" });
      const chart = ui.chart("兩族群消長", "捕食:兩條曲線週期相同、波峰錯開;競爭:重疊越大越快分出勝負;共生:一起上升。");
      const drawChart = () => {
        const key = modeSel.get(), ser = integ(key, sS.get(), tS.get());
        const sc = key === "pred" ? [260, 46] : [1, 1];
        const Apts = ser.A.map((v, i) => [i * 0.04, v * sc[0]]);
        const Bpts = ser.B.map((v, i) => [i * 0.04, v * sc[1]]);
        CK.plot(chart, {
          x0: 0, x1: 30, y0: 0, y1: Math.max(...ser.A) * sc[0] * 1.18,
          xlabel: "時間 (代)", ylabel: "相對量",
          series: [{ pts: Apts, color: "#66bb6a" }, { pts: Bpts, color: "#7986cb" }],
          marks: [{ dot: [tS.get(), Apts[Apts.length - 1][1]], color: PL.col("accent-2"), label: "A" }]
        });
      };
      chart.onResize(drawChart);
      drawChart();
      root.addEventListener("input", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 群集消長與巔峰群集 */
  PL.register("community-succession", {
    build(root) {
      const STAGES = [
        { name: "裸地(物理風化)", t: 0, dom: "無——只有岩塊與風" },
        { name: "地衣與苔蘚", t: 10, dom: "地衣、苔蘚" },
        { name: "草本植物", t: 28, dom: "一年生草類" },
        { name: "灌木", t: 55, dom: "灌木與幼樹" },
        { name: "喬木林(巔峰群集)", t: 100, dom: "闊葉喬木" }
      ];
      const OFFSET = { rock: 0, burn: 35, field: 50 };
      const stageIdx = tt => { let i = 0; STAGES.forEach((s, k) => { if (tt >= s.t) i = k; }); return i; };
      const spOf = tt => 1 + 23 * (1 - Math.exp(-tt / 45));
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const tt = tS.get() + OFFSET[startSel.get()], dist = dS.get();
          const veg = 1 - 0.72 * dist;
          const idx = stageIdx(tt), st = STAGES[idx];
          const prog = idx >= 4 ? 1 : (tt - st.t) / (STAGES[idx + 1].t - st.t);
          const sp = spOf(tt) * (1 - 0.55 * dist);
          const groundY = H * 0.82;
          CK.panel(ctx, W * 0.05, H * 0.08, W * 0.55, H * 0.84, "消長現場:" + st.name);
          D.rect(ctx, W * 0.07, groundY, W * 0.51, H * 0.07, { fill: "rgba(141,138,132,0.5)", stroke: "rgba(90,85,80,0.8)", width: 1, r: 3 });
          for (let i = 0; i < 4; i++) D.rect(ctx, W * (0.10 + i * 0.12), groundY - 10 - (i % 2) * 5, 34, 14, { fill: "#9a968f", stroke: "#6f6a63", width: 1, r: 5 });
          if (idx >= 1) {
            ctx.save(); ctx.globalAlpha = 0.4 + prog * 0.5;
            for (let i = 0; i < 8; i++) D.disc(ctx, W * (0.105 + (i % 4) * 0.12) + (i % 3) * 8, groundY - 4 - Math.floor(i / 4) * 8, 4.5, { fill: "#e8d44d" });
            for (let i = 0; i < 6; i++) D.disc(ctx, W * (0.13 + i * 0.075), groundY - 14, 5, { fill: "#4e8d52" });
            ctx.restore();
          }
          const nG = idx >= 2 ? Math.round((6 + prog * 10) * veg) : 0;
          for (let i = 0; i < nG; i++) {
            const gx = W * (0.085 + (i * 0.051) % 0.47), gh = (10 + (i * 37) % 13) * veg * (idx >= 3 ? 0.7 : 1);
            D.line(ctx, gx, groundY, gx + Math.sin(i * 2.1) * 3, groundY - gh, "#7cb342", 1.8);
          }
          const nS = idx >= 3 ? Math.round(3 + prog * 3) : 0;
          for (let i = 0; i < nS; i++) {
            const sr = (9 + prog * 5) * veg;
            D.disc(ctx, W * (0.12 + i * 0.10), groundY - sr, sr, { fill: "rgba(85,139,47,0.75)" });
          }
          const nT = idx >= 4 ? 3 + Math.round(prog * 2) : 0;
          for (let i = 0; i < nT; i++) {
            const tx = W * (0.13 + i * 0.115), th = (34 + prog * 26) * veg;
            D.rect(ctx, tx - 3, groundY - th, 6, th, { fill: "#795548", r: 2 });
            D.disc(ctx, tx, groundY - th - 12 * veg, 15 * veg + 6, { fill: "rgba(56,142,60,0.8)" });
            D.disc(ctx, tx - 9 * veg, groundY - th - 4, 10 * veg + 4, { fill: "rgba(76,175,80,0.7)" });
          }
          if (dist > 0.25) {
            ctx.save(); ctx.globalAlpha = Math.min(0.55, dist * 0.7);
            D.rect(ctx, W * 0.07, groundY - 78, W * 0.51, 82, { fill: PL.theme.isLight() ? "rgba(96,78,58,0.92)" : "rgba(48,32,22,0.98)" });
            ctx.restore();
            D.text(ctx, dist > 0.6 ? "劇烈干擾:群集退回消長起點附近" : "中度干擾:植被減損", W * 0.325, groundY - 84, { color: PL.col("warn"), size: 11, align: "center" });
          }
          D.text(ctx, "經過 " + PL.fmt(tS.get(), 0) + " 年" + (startSel.get() === "rock" ? "(自裸岩起算)" : "(次級消長:土壤與種子還在,速度快得多)"), W * 0.325, groundY + H * 0.09, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          CK.panel(ctx, W * 0.64, H * 0.14, W * 0.31, H * 0.62, "群集階段");
          D.text(ctx, st.name, W * 0.795, H * 0.24, { color: PL.col("accent"), size: 13.5, align: "center", weight: "700" });
          D.text(ctx, "優勢種:" + st.dom, W * 0.795, H * 0.34, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          CK.meter(ctx, W * 0.67, H * 0.42, W * 0.25, 9, clamp(sp / 24, 0, 1), { color: "#66bb6a", label: "物種數(相對巔峰)" });
          D.text(ctx, "裸地 → 地衣 → 草本 → 灌木 → 喬木", W * 0.795, H * 0.55, { color: PL.col("text-faint"), size: 10, align: "center" });
          D.text(ctx, idx >= 4 ? "已達巔峰群集:仍會因干擾重置" : "距巔峰群集約 " + PL.fmt(Math.max(0, 100 - tt), 0) + " 年", W * 0.795, H * 0.64, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          rStage.set(st.name); rDom.set(st.dom); rSp.set(sp, 0);
          vd.set(dist > 0.55 ? "劇烈干擾:消長退回草本以前(次級消長)" : idx >= 4 ? "巔峰群集:結構穩定但非永久不變" : "消長進行中:物種數隨時間增加", dist > 0.55 ? "bad" : idx >= 4 ? "ok" : "info");
        }
      });
      const startSel = PL.ui.select(ui.L.controls, { label: "起始狀態", value: "rock", options: [
        { value: "rock", label: "裸岩(初級消長)" }, { value: "burn", label: "火燒林地(次級)" }, { value: "field", label: "棄耕農田(次級)" }
      ] });
      const tS = PL.ui.slider(ui.L.controls, { label: "消長時間", min: 0, max: 200, step: 5, value: 60, unit: "年", digits: 0 });
      const dS = PL.ui.slider(ui.L.controls, { label: "干擾強度", min: 0, max: 1, step: 0.05, value: 0, digits: 2 });
      PL.ui.note(ui.L.controls, "先驅物種耐得住惡劣環境,改變環境後讓位給下一批物種;干擾(火燒、砍伐)會把消長拉回較早的階段。");
      PL.ui.procedure(ui.L.controls, {
        title: "初級 vs 次級消長",
        steps: [
          "從裸岩起算,拉時間到 100 年以上,記錄每個階段的優勢種。",
          "切換到「火燒林地」:同樣拉 40 年,比較到達喬木林的速度。",
          "把干擾強度拉高,看群集被退回到哪一個階段。"
        ],
        rule: "初級消長從幾乎沒有土壤的裸地開始、要上百年;次級消長土壤與種子庫還在,快得多——兩者起點不同,不是速度快慢而已。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "裸岩起點", apply: () => { startSel.set("rock"); tS.set(0); dS.set(0); } },
        { label: "火燒後 20 年", apply: () => { startSel.set("burn"); tS.set(20); dS.set(0); } },
        { label: "老林遇大火", apply: () => { startSel.set("rock"); tS.set(110); dS.set(0.85); } }
      ] });
      const rStage = PL.ui.readout(ui.L.readouts, { label: "目前階段" });
      const rDom = PL.ui.readout(ui.L.readouts, { label: "優勢種" });
      const rSp = PL.ui.readout(ui.L.readouts, { label: "群集物種數", unit: "種" });
      const vd = PL.ui.verdict(ui.L.controls, { label: "消長判定" });
      const chart = ui.chart("物種數隨消長時間上升", "先快後慢,最後停在巔峰群集的水準;干擾強度會把整條曲線壓低。");
      const drawChart = () => {
        const dist = dS.get();
        CK.plot(chart, {
          x0: 0, x1: 250, y0: 0, y1: 26, xticks: [0, 50, 100, 150, 200, 250], yticks: [5, 10, 15, 20, 25],
          xlabel: "消長時間 (年)", ylabel: "物種數 (種)",
          series: [{ fn: y => spOf(y) * (1 - 0.55 * dist), color: PL.col("accent") }],
          marks: [{ dot: [tS.get() + OFFSET[startSel.get()], spOf(tS.get() + OFFSET[startSel.get()]) * (1 - 0.55 * dist)], color: PL.col("accent-2"), label: "目前" }]
        });
      };
      chart.onResize(drawChart);
      drawChart();
      root.addEventListener("input", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 能量塔與營養級 */
  PL.register("energy-pyramid", {
    build(root) {
      const NAMES = ["生產者(草)", "初級消費者(蚱蜢)", "次級消費者(蛙)", "三級消費者(蛇)", "第四級(鷹)"];
      const COLS = ["rgba(102,187,106,0.78)", "rgba(121,134,203,0.78)", "rgba(239,136,41,0.78)", "rgba(229,115,115,0.78)", "rgba(149,117,205,0.78)"];
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const P = pS.get(), eff = eS.get() / 100, nLv = +lvSel.get();
          const levels = [];
          for (let i = 0; i < nLv; i++) levels.push({ label: NAMES[i], energy: i ? levels[i - 1].energy * eff : P, color: COLS[i] });
          const topE = levels[levels.length - 1].energy, pct = topE / P * 100, fold = P / topE;
          CK.energyPyramid(ctx, { x: W * 0.32, y: H * 0.12, w: W * 0.32, h: H * 0.76 }, levels, { scale: "sqrt" });
          // 絕對能量條:P 改變時畫面即時變化(0–40000 kJ 量表)
          CK.meter(ctx, W * 0.36, H * 0.92, W * 0.24, 9, P / 40000, { color: "#66bb6a", label: "生產者固定 " + PL.fmt(P, 0) + " kJ(量表上限 40,000)" });
          CK.panel(ctx, W * 0.04, H * 0.14, W * 0.24, H * 0.66, "每一級的能量去哪了");
          const split = [["傳給下一級", eff, "#66bb6a"], ["呼吸散熱(不可回收)", (1 - eff) * 0.6, "#ef8829"], ["糞便殘枝(給分解者)", (1 - eff) * 0.4, "#a1887f"]];
          split.forEach(([lab, f, c], i) => {
            CK.meter(ctx, W * 0.06, H * (0.30 + i * 0.16), W * 0.20, 9, f, { color: c, label: lab + " " + Math.round(f * 100) + "%" });
          });
          D.text(ctx, "能量單向流動、以熱散失,不循環", W * 0.16, H * 0.74, { color: PL.col("text-dim"), size: 10, align: "center" });
          CK.panel(ctx, W * 0.68, H * 0.14, W * 0.28, H * 0.66, "塔的數據");
          const rows = [
            ["生產者固定", PL.fmt(P, 0) + " kJ"],
            ["頂層能量", PL.fmt(topE, 0) + " kJ"],
            ["頂層占比", PL.fmt(pct, pct < 1 ? 2 : 1) + " %"],
            ["縮減倍數", PL.fmt(fold, fold >= 100 ? 0 : 1) + " 倍"]
          ];
          rows.forEach(([k, v], i) => {
            D.text(ctx, k, W * 0.70, H * (0.26 + i * 0.13), { color: PL.col("text-dim"), size: 10.5 });
            D.text(ctx, v, W * 0.94, H * (0.26 + i * 0.13) + 1, { color: i === 1 || i === 3 ? PL.col("accent") : PL.col("text"), size: 12, align: "right" });
          });
          D.text(ctx, "塔形上尖是熱力學的必然", W * 0.82, H * 0.72, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          rTop.set(topE, 0); rPct.set(pct, 2); rFold.set(fold, fold >= 100 ? 0 : 1); rP.set(P, 0);
          vd.set("到第 " + nLv + " 級僅剩 " + PL.fmt(pct, pct < 1 ? 2 : 1) + "% 的能量:頂層掠食者必然稀有", "info");
        }
      });
      const pS = PL.ui.slider(ui.L.controls, { label: "生產者固定能量", min: 2000, max: 40000, step: 1000, value: 20000, unit: "kJ", digits: 0 });
      const eS = PL.ui.slider(ui.L.controls, { label: "級間傳遞效率", min: 5, max: 20, step: 1, value: 10, unit: "%", digits: 0 });
      const lvSel = PL.ui.select(ui.L.controls, { label: "營養級數", value: "4", options: [
        { value: "3", label: "3 級(草→蚱蜢→蛙)" }, { value: "4", label: "4 級(+蛇)" }, { value: "5", label: "5 級(+鷹)" }
      ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "能量判讀" });
      const rP = PL.ui.readout(ui.L.readouts, { label: "生產者能量", unit: "kJ" });
      PL.ui.note(ui.L.controls, "每一級只有約 10% 的能量傳到下一級,其餘以呼吸熱與排泄散失;物質可以循環,能量不行。");
      PL.ui.procedure(ui.L.controls, {
        title: "為什麼塔必然上尖",
        steps: [
          "用預設值算一次:20000 kJ × 0.1 × 0.1 × 0.1 = 頂層多少 kJ?",
          "把效率調到 5% 與 20%,比較塔的「尖度」變化。",
          "把級數加到 5 級,看頂層還剩多少能量撐得住一隻鷹。"
        ],
        rule: "食物鏈很少超過 4–5 級,不是動物打不過,而是能量根本撐不起第五級——每多一級就再砍 90%。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "熱帶雨林(高生產力)", apply: () => { pS.set(40000); eS.set(10); lvSel.set("5"); } },
        { label: "沙漠(低生產力)", apply: () => { pS.set(2000); eS.set(10); lvSel.set("3"); } },
        { label: "富饒海域(效率偏高)", apply: () => { pS.set(30000); eS.set(18); lvSel.set("4"); } }
      ] });
      const rTop = PL.ui.readout(ui.L.readouts, { label: "頂層能量", unit: "kJ" });
      const rPct = PL.ui.readout(ui.L.readouts, { label: "頂層占比", unit: "%" });
      const rFold = PL.ui.readout(ui.L.readouts, { label: "生產者:頂層", unit: "倍" });
      const chart = ui.chart("能量隨營養級下降", "在 log10 尺度上每級掉固定比例 → 直線下降;斜率越陡,塔越尖。");
      const drawChart = () => {
        const P = pS.get(), eff = eS.get() / 100, nLv = +lvSel.get();
        const pts = [];
        for (let i = 0; i < nLv; i++) pts.push([i, Math.log10(P * Math.pow(eff, i))]);
        CK.plot(chart, {
          x0: -0.2, x1: 4.2, y0: Math.max(0, Math.min(2, Math.log10(P * Math.pow(eff, nLv - 1)) - 0.3)), y1: Math.log10(P) + 0.3,
          xlabel: "營養級(0 = 生產者)", ylabel: "log10 能量 (kJ)",
          series: [{ pts, color: PL.col("accent") }],
          marks: [{ dot: [nLv - 1, Math.log10(P * Math.pow(eff, nLv - 1))], color: PL.col("accent-2"), label: "頂層" }]
        });
      };
      chart.onResize(drawChart);
      drawChart();
      root.addEventListener("input", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 食物網與營養級聯動 */
  PL.register("food-web", {
    build(root) {
      const NODES = [
        { id: "grass", label: "草", x: 0.28, y: 0.84, color: "rgba(102,187,106,0.9)" },
        { id: "hopper", label: "蝗蟲", x: 0.10, y: 0.58, color: "rgba(121,134,203,0.9)" },
        { id: "rabbit", label: "兔", x: 0.28, y: 0.60, color: "rgba(121,134,203,0.9)" },
        { id: "frog", label: "蛙", x: 0.12, y: 0.34, color: "rgba(239,136,41,0.9)" },
        { id: "snake", label: "蛇", x: 0.34, y: 0.34, color: "rgba(239,136,41,0.9)" },
        { id: "hawk", label: "鷹", x: 0.23, y: 0.12, color: "rgba(229,115,115,0.9)" },
        { id: "decomp", label: "分解者", x: 0.40, y: 0.82, color: "rgba(161,136,127,0.9)" }
      ];
      const LINKS = [["grass", "hopper"], ["grass", "rabbit"], ["hopper", "frog"], ["frog", "snake"], ["rabbit", "hawk"], ["snake", "hawk"], ["grass", "decomp"]];
      // 移除某物種後各物種的新平衡(相對原本的倍數):營養級聯的教學簡化
      const IMPACT = {
        none: null,
        hawk: { hawk: 0.02, snake: 1.3, frog: 1.6, rabbit: 2.3, hopper: 1.8, grass: 0.45, decomp: 0.9 },
        snake: { snake: 0.02, hawk: 0.45, frog: 1.4, rabbit: 1.2, hopper: 1.15, grass: 0.85, decomp: 1 },
        rabbit: { rabbit: 0.02, hawk: 0.5, snake: 0.7, grass: 1.35, hopper: 1.05, frog: 1, decomp: 1 },
        grass: { grass: 0.05, hopper: 0.08, rabbit: 0.06, frog: 0.03, snake: 0.02, hawk: 0.01, decomp: 0.45 }
      };
      const nodeById = id => NODES.find(n => n.id === id);
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const kill = killSel.get(), tm = tS.get();
          const impact = IMPACT[kill] || {};
          const frac = {};
          NODES.forEach(n => {
            const tgt = impact[n.id] == null ? 1 : impact[n.id];
            // 未移除時也讓時間有可見效應:季節性波動(±4%),對照移除後的趨近行為
            const breathe = kill === "none" ? 1 + 0.04 * Math.sin(tm / 5.7 + NODES.indexOf(n)) : 1;
            frac[n.id] = breathe * (1 + (tgt - 1) * (1 - Math.exp(-tm / 8)));
          });
          D.text(ctx, "箭頭方向 = 能量流動(被吃 → 吃者)", W * 0.26, H * 0.05, { color: PL.col("text-faint"), size: 10, align: "center" });
          LINKS.forEach(([a, b]) => {
            const na = nodeById(a), nb = nodeById(b);
            CK.webLink(ctx, na.x * W, na.y * H, nb.x * W, nb.y * H, {
              color: b === "decomp" ? "rgba(161,136,127,0.7)" : "rgba(140,160,180,0.85)",
              width: clamp(0.8 + frac[a] * 1.6, 0.8, 5), bow: 14
            });
          });
          NODES.forEach(n => {
            const r = 13 * clamp(Math.pow(frac[n.id], 0.4), 0.25, 1.9);
            CK.webNode(ctx, n.x * W, n.y * H, n.label, n.color, r);
            if (kill === n.id) D.ring(ctx, n.x * W, n.y * H, r + 5, "#e57373", 2.4, [4, 3]);
          });
          D.text(ctx, kill === "none" ? "完整食物網:每條路徑都有備援" : "已移除「" + nodeById(kill).label + "」(紅圈):網絡重新洗牌", W * 0.26, H * 0.93, { color: kill === "none" ? PL.col("text-faint") : "#e57373", size: 10.5, align: "center" });
          CK.panel(ctx, W * 0.55, H * 0.10, W * 0.40, H * 0.80, "生物量(相對原本)");
          const meterRows = [["植被(草)", frac.grass, "#66bb6a"], ["草食動物(蝗蟲+兔)", (frac.hopper + frac.rabbit) / 2, "#7986cb"], ["頂層掠食者(鷹)", frac.hawk, "#e57373"]];
          meterRows.forEach(([lab, f, c], i) => {
            CK.meter(ctx, W * 0.57, H * (0.26 + i * 0.17), W * 0.36, 10, clamp(f / 2.5, 0, 1), { color: f < 0.6 ? "#e57373" : c, label: lab });
            D.text(ctx, Math.round(f * 100) + "%", W * 0.93, H * (0.26 + i * 0.17) - 7, { color: PL.col("text"), size: 11, align: "right" });
          });
          D.text(ctx, "分解者回收每一級的屍體與排泄物", W * 0.75, H * 0.76, { color: PL.col("text-faint"), size: 10, align: "center" });
          D.text(ctx, kill === "hawk" ? "鷹消失 → 兔、蝗蟲暴增 → 植被被啃垮" : kill === "grass" ? "生產者崩潰 → 全網跟著塌" : kill === "snake" || kill === "rabbit" ? "單一移除的影響沿多條路徑擴散" : "試著移除一個物種,看連鎖反應", W * 0.75, H * 0.84, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          rGrass.set(frac.grass * 100, 0); rHerb.set((frac.hopper + frac.rabbit) / 2 * 100, 0); rHawk.set(frac.hawk * 100, 0);
          vd.set(frac.grass < 0.6 ? "營養級聯:植被崩壞,整個群集被改變" : kill === "hawk" ? "頂層掠食者是關鍵種:影響不成比例" : kill === "none" ? "食物網平衡:多條路徑提供緩衝" : "影響沿多條路徑擴散中", frac.grass < 0.6 ? "bad" : kill === "none" ? "ok" : "warn");
        }
      });
      const killSel = PL.ui.select(ui.L.controls, { label: "移除物種", value: "none", options: [
        { value: "none", label: "不移除(完整網)" }, { value: "hawk", label: "移除鷹(頂層掠食者)" },
        { value: "snake", label: "移除蛇(次級消費者)" }, { value: "rabbit", label: "移除兔(初級消費者)" },
        { value: "grass", label: "移除草(生產者)" }
      ] });
      const tS = PL.ui.slider(ui.L.controls, { label: "移除後時間", min: 0, max: 36, step: 2, value: 18, unit: "月", digits: 0 });
      const vd = PL.ui.verdict(ui.L.controls, { label: "網絡判定" });
      PL.ui.note(ui.L.controls, "食物網比食物鏈穩定,因為斷一條路徑還有別條;但關鍵種的影響與其數量完全不成比例。");
      PL.ui.procedure(ui.L.controls, {
        title: "重現營養級聯",
        steps: [
          "先記下完整網的三條生物量讀數(植被 / 草食 / 頂層)。",
          "選「移除鷹」,把時間拉到 36 個月:哪一層先變?植被最後如何?",
          "再選「移除草」:比較為什麼生產者一垮,全網都塌。"
        ],
        rule: "「移除頂層掠食者,植被反而變少」——影響沿著鷹→兔→草<b>往下</b>傳,這是營養級聯,不是往上。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "黃石公園:移除狼", apply: () => { killSel.set("hawk"); tS.set(36); } },
        { label: "棲地毀損:植被崩壞", apply: () => { killSel.set("grass"); tS.set(24); } },
        { label: "還原完整網", apply: () => { killSel.set("none"); tS.set(6); } }
      ] });
      const rGrass = PL.ui.readout(ui.L.readouts, { label: "植被生物量", unit: "%" });
      const rHerb = PL.ui.readout(ui.L.readouts, { label: "草食動物量", unit: "%" });
      const rHawk = PL.ui.readout(ui.L.readouts, { label: "頂層掠食者", unit: "%" });
      const chart = ui.chart("三個營養層的反應", "換不同的移除對象,三條曲線的方向完全不同——這就是「網」與「鏈」的差別。");
      const drawChart = () => {
        const kill = killSel.get(), impact = IMPACT[kill] || {};
        const fr = id => { const tgt = impact[id] == null ? 1 : impact[id]; return t => (1 + (tgt - 1) * (1 - Math.exp(-t / 8))) * 100; };
        const herb = t => (fr("hopper")(t) + fr("rabbit")(t)) / 2;
        CK.plot(chart, {
          x0: 0, x1: 36, y0: 0, y1: 250, xticks: [0, 12, 24, 36], yticks: [50, 100, 150, 200, 250],
          xlabel: "移除後時間 (月)", ylabel: "相對生物量 (%)",
          series: [{ fn: fr("grass"), color: "#66bb6a" }, { fn: herb, color: "#7986cb" }, { fn: fr("hawk"), color: "#e57373" }],
          marks: [{ dot: [tS.get(), fr("grass")(tS.get())], color: PL.col("accent-2"), label: "植被" }]
        });
      };
      chart.onResize(drawChart);
      drawChart();
      root.addEventListener("input", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 碳循環 */
  PL.register("carbon-cycle", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const E = eS.get(), F = fS.get(), yr = yS.get();
          const ocean = 0.24 * E, land = 0.22 * E + F, add = E - ocean - land;
          const ppm = 414 + add * (yr - 2020) / 2.12;
          // 大氣庫(填色高度 = 濃度)
          const ax = W * 0.32, ay = H * 0.10, aw = W * 0.30, ah = H * 0.22;
          CK.panel(ctx, ax, ay, aw, ah, "");
          const fill = clamp(ppm / 1000, 0.08, 0.95) * (ah - 14);
          D.rect(ctx, ax + 2, ay + ah - 2 - fill, aw - 4, fill, { fill: "rgba(127,199,255,0.30)", r: 4 });
          D.text(ctx, "大氣 CO₂", ax + aw / 2, ay + 16, { color: PL.col("text"), size: 12, align: "center", weight: "700" });
          D.text(ctx, Math.round(ppm) + " ppm", ax + aw / 2, ay + ah * 0.62, { color: PL.col("accent"), size: 14, align: "center", weight: "700" });
          // 庫:化石燃料 / 植生物 / 海洋
          CK.panel(ctx, W * 0.06, H * 0.58, W * 0.22, H * 0.30, "化石燃料(地質碳)");
          CK.meter(ctx, W * 0.08, H * 0.72, W * 0.18, 9, clamp(1 - E * (yr - 2020) / 5000, 0.05, 1), { color: "#8d6e63", label: "剩餘儲量" });
          CK.panel(ctx, W * 0.72, H * 0.10, W * 0.23, H * 0.28, "植生物(森林碳匯)");
          D.text(ctx, PL.fmt(560 + F * (yr - 2020), 0) + " GtC", W * 0.835, H * 0.28, { color: PL.col("accent"), size: 12, align: "center", weight: "700" });
          CK.panel(ctx, W * 0.72, H * 0.52, W * 0.23, H * 0.30, "海洋(溶解 + 沉積)");
          D.text(ctx, "已吸收 " + PL.fmt(ocean * (yr - 2020), 0) + " GtC", W * 0.835, H * 0.70, { color: PL.col("accent"), size: 12, align: "center", weight: "700" });
          D.text(ctx, "約占排放 1/4", W * 0.835, H * 0.77, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          // 通量箭頭(粗細 = 流量)
          D.arrow(ctx, W * 0.17, H * 0.56, W * 0.34, H * 0.34, { color: "#e57373", width: clamp(1 + E * 0.5, 1, 7), label: "燃燒 " + PL.fmt(E, 1) });
          D.arrow(ctx, W * 0.63, H * 0.30, W * 0.74, H * 0.58, { color: "#64b5f6", width: clamp(1 + ocean * 0.7, 1, 6), label: "海洋吸收 " + PL.fmt(ocean, 1) });
          D.arrow(ctx, W * 0.63, H * 0.16, W * 0.71, H * 0.18, { color: "#66bb6a", width: 2.4, label: "光合 120" });
          D.arrow(ctx, W * 0.71, H * 0.30, W * 0.63, H * 0.22, { color: "#a1887f", width: 2.4, label: "呼吸+分解 118" });
          D.arrow(ctx, W * 0.62, H * 0.24, W * 0.70, H * 0.23, { color: "#4caf50", width: clamp(0.8 + F * 0.9, 0.8, 4.5), label: "造林 +" + PL.fmt(F, 1) });
          // 左:數據卡
          CK.panel(ctx, W * 0.04, H * 0.26, W * 0.24, H * 0.28, "收支(每年)");
          const rows = [["淨累積", PL.fmt(add, 2) + " GtC"], ["空氣殘留占比", PL.fmt(E > 0 ? add / E * 100 : 0, 0) + " %"], ["陸域吸收", PL.fmt(land, 2) + " GtC"]];
          rows.forEach(([k, v], i) => {
            D.text(ctx, k, W * 0.06, H * (0.35 + i * 0.07), { color: PL.col("text-dim"), size: 10.5 });
            D.text(ctx, v, W * 0.26, H * (0.35 + i * 0.07) + 1, { color: i === 0 && add > 0 ? "#e57373" : PL.col("accent"), size: 11.5, align: "right" });
          });
          rPpm.set(ppm, 0); rAdd.set(add, 2); rAir.set(E > 0 ? add / E * 100 : 0, 0);
          vd.set(add > 0.05 ? "淨排放:每年再累積 " + PL.fmt(add, 1) + " GtC,濃度持續上升" : "淨零:排放被海洋與森林吸收,濃度不再上升", add > 0.05 ? "bad" : "ok");
        }
      });
      const eS = PL.ui.slider(ui.L.controls, { label: "化石燃料排放", min: 0, max: 12, step: 0.5, value: 10.5, unit: "GtC/年", digits: 1 });
      const fS = PL.ui.slider(ui.L.controls, { label: "造林吸收", min: 0, max: 4, step: 0.5, value: 1, unit: "GtC/年", digits: 1 });
      const yS = PL.ui.slider(ui.L.controls, { label: "年份", min: 2020, max: 2100, step: 5, value: 2060, digits: 0 });
      const vd = PL.ui.verdict(ui.L.controls, { label: "碳收支判定" });
      PL.ui.note(ui.L.controls, "光合與呼吸是快速循環、大致相抵;化石燃料把封存幾億年的地質碳快速注入大氣,這條新通路打破長期平衡。");
      PL.ui.procedure(ui.L.controls, {
        title: "算一筆碳帳",
        steps: [
          "排放 10.5 GtC:海洋吸走 24%、陸域吸 22%,空氣留下多少?",
          "把年份拉到 2100,看 ppm 如何累積(1 ppm ≈ 2.12 GtC)。",
          "把排放降到 2、造林拉到 4:曲線反轉需要哪些條件?"
        ],
        rule: "海洋「吸收」不是「解決」:溶入的 CO₂ 使海水酸化——碳只是換了個庫,並沒有消失。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "無節制排放", apply: () => { eS.set(12); fS.set(0); yS.set(2100); } },
        { label: "淨零路徑", apply: () => { eS.set(2); fS.set(2); yS.set(2100); } },
        { label: "2020 現況", apply: () => { eS.set(10.5); fS.set(1); yS.set(2025); } }
      ] });
      const rPpm = PL.ui.readout(ui.L.readouts, { label: "大氣 CO₂", unit: "ppm" });
      const rAdd = PL.ui.readout(ui.L.readouts, { label: "每年淨累積", unit: "GtC" });
      const rAir = PL.ui.readout(ui.L.readouts, { label: "空氣殘留占比", unit: "%" });
      const chart = ui.chart("大氣 CO₂ 濃度預估", "斜率就是每年淨累積:排放不歸零,曲線就不會變平;造林只能改變斜率,改變不了方向(除非淨零)。");
      const drawChart = () => {
        const add = eS.get() - 0.24 * eS.get() - (0.22 * eS.get() + fS.get());
        const ppm = y => 414 + add * (y - 2020) / 2.12;
        CK.plot(chart, {
          x0: 2020, x1: 2100, y0: 380, y1: Math.max(560, ppm(2100) + 30), xticks: [2020, 2040, 2060, 2080, 2100], yticks: [420, 480, 540, 600],
          xlabel: "年份", ylabel: "CO₂ (ppm)",
          series: [{ fn: ppm, color: PL.col("accent") }],
          marks: [{ dot: [yS.get(), ppm(yS.get())], color: PL.col("accent-2"), label: "目前" }]
        });
      };
      chart.onResize(drawChart);
      drawChart();
      root.addEventListener("input", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 氮循環與固氮 */
  PL.register("nitrogen-cycle", {
    build(root) {
      const model = () => {
        const a = aS.get(), f = fS.get(), d = dS.get();
        const supply = 0.8 * (a + 0.5 * f) + 0.5 * f;   // 硝化 + 化肥直接的硝酸鹽
        const denit = Math.min(d, supply * 0.55);
        const uptake = Math.min(90, supply - denit);
        const leach = Math.max(0, supply - denit - uptake);
        return { a, f, d, supply, denit, uptake, leach };
      };
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const m = model();
          const wOf = v => clamp(0.8 + v * 0.11, 0.8, 8);
          // 庫
          const box = (x, y, w, h, title, val, c) => {
            CK.panel(ctx, x, y, w, h, "");
            D.text(ctx, title, x + w / 2, y + h * 0.38, { color: PL.col("text"), size: 11.5, align: "center", weight: "700" });
            D.text(ctx, val, x + w / 2, y + h * 0.72, { color: c || PL.col("accent"), size: 11, align: "center" });
          };
          box(W * 0.30, H * 0.06, W * 0.34, H * 0.16, "大氣 N₂(78%)", "生物不能直接利用", "#78909c");
          box(W * 0.20, H * 0.40, W * 0.17, H * 0.15, "銨 NH₄⁺", "由固氮而來", "#66bb6a");
          box(W * 0.52, H * 0.40, W * 0.17, H * 0.15, "硝酸鹽 NO₃⁻", PL.fmt(m.supply, 0) + " kg/ha", "#ef8829");
          box(W * 0.78, H * 0.28, W * 0.19, H * 0.15, "植物體", "吸收 " + PL.fmt(m.uptake, 0), "#4caf50");
          box(W * 0.78, H * 0.66, W * 0.19, H * 0.15, "地下水", "淋洗 " + PL.fmt(m.leach, 0), "#64b5f6");
          box(W * 0.05, H * 0.06, W * 0.16, H * 0.13, "化肥", PL.fmt(m.f, 0) + " kg/ha", "#ffb74d");
          // 通量箭頭(粗細 = 流量)
          D.arrow(ctx, W * 0.40, H * 0.22, W * 0.29, H * 0.40, { color: "#66bb6a", width: wOf(m.a), label: "固氮菌/根瘤菌 " + PL.fmt(m.a, 0) });
          D.arrow(ctx, W * 0.13, H * 0.19, W * 0.24, H * 0.40, { color: "#ffb74d", width: wOf(m.f * 0.5), label: "銨態肥" });
          D.arrow(ctx, W * 0.16, H * 0.19, W * 0.56, H * 0.40, { color: "#ffb74d", width: wOf(m.f * 0.5), label: "硝態肥" });
          D.arrow(ctx, W * 0.37, H * 0.475, W * 0.52, H * 0.475, { color: "#8d6e63", width: wOf(0.8 * (m.a + m.f * 0.5)), label: "硝化菌" });
          D.arrow(ctx, W * 0.69, H * 0.44, W * 0.78, H * 0.34, { color: "#4caf50", width: wOf(m.uptake), label: "吸收" });
          D.arrow(ctx, W * 0.60, H * 0.40, W * 0.52, H * 0.20, { color: "#a1887f", width: wOf(m.denit), dash: [6, 4], label: "脫氮菌 → N₂(含 N₂O)" });
          D.arrow(ctx, W * 0.62, H * 0.55, W * 0.78, H * 0.70, { color: "#64b5f6", width: wOf(m.leach), label: "淋洗" });
          // 底部數據
          CK.panel(ctx, W * 0.05, H * 0.62, W * 0.30, H * 0.24, "年度收支(kg/ha)");
          const rows = [["硝酸鹽總供入", PL.fmt(m.supply, 0)], ["脫氮回收大氣", PL.fmt(m.denit, 0)], ["淋洗流失", PL.fmt(m.leach, 0)]];
          rows.forEach(([k, v], i) => {
            D.text(ctx, k, W * 0.07, H * (0.70 + i * 0.06), { color: PL.col("text-dim"), size: 10.5 });
            D.text(ctx, v, W * 0.33, H * (0.70 + i * 0.06) + 1, { color: i === 2 && m.leach > 40 ? "#e57373" : PL.col("accent"), size: 11.5, align: "right" });
          });
          CK.badge(ctx, W * 0.45, H * 0.92, m.leach > 40 ? "硝酸鹽過剩" : m.leach > 15 ? "接近飽和" : "循環閉合", m.leach > 40 ? "#c0392b" : m.leach > 15 ? "#ef8829" : "#2e7d32");
          rSup.set(m.supply, 0); rUp.set(m.uptake, 0); rDenit.set(m.denit, 0); rLeach.set(m.leach, 0);
          vd.set(m.leach > 40 ? "硝酸鹽過剩:淋洗汙染地下水、優養化風險高" : m.leach > 15 ? "施肥接近作物吸收上限,淋洗開始上升" : "供與收平衡:固氮、硝化、脫氮把循環閉合", m.leach > 40 ? "bad" : m.leach > 15 ? "warn" : "ok");
        }
      });
      const aS = PL.ui.slider(ui.L.controls, { label: "生物固氮", min: 5, max: 100, step: 5, value: 40, unit: "kg/ha", digits: 0 });
      const fS = PL.ui.slider(ui.L.controls, { label: "化肥施用", min: 0, max: 200, step: 10, value: 60, unit: "kg/ha", digits: 0 });
      const dS = PL.ui.slider(ui.L.controls, { label: "脫氮作用", min: 5, max: 80, step: 5, value: 30, unit: "kg/ha", digits: 0 });
      PL.ui.note(ui.L.controls, "N₂ 占空氣 78%,但生物不能直接用:固氮菌轉成銨、硝化菌轉成硝酸鹽、植物吸收後、脫氮菌再還原回 N₂,循環才閉合。");
      PL.ui.procedure(ui.L.controls, {
        title: "找出循環的破口",
        steps: [
          "化肥為 0 時記下供入、吸收與淋洗:自然狀態下循環閉合嗎?",
          "把化肥拉到 180:哪一個通量追不上?多餘的硝酸鹽去哪裡?",
          "把脫氮拉高再拉低:脫氮是「回收」還是「損失」?(它會產生 N₂O 溫室氣體)"
        ],
        rule: "植物吸收有上限(約 90 kg/ha)——超過的部分不會「被吸收更多」,只會脫氮或淋洗;化肥打破平衡正是這個道理。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "自然草原", apply: () => { aS.set(40); fS.set(0); dS.set(30); } },
        { label: "合理施肥", apply: () => { aS.set(40); fS.set(60); dS.set(30); } },
        { label: "過量施肥", apply: () => { aS.set(40); fS.set(180); dS.set(15); } }
      ] });
      const rSup = PL.ui.readout(ui.L.readouts, { label: "硝酸鹽供入", unit: "kg/ha" });
      const rUp = PL.ui.readout(ui.L.readouts, { label: "植物吸收", unit: "kg/ha" });
      const rDenit = PL.ui.readout(ui.L.readouts, { label: "脫氮回收", unit: "kg/ha" });
      const rLeach = PL.ui.readout(ui.L.readouts, { label: "淋洗流失", unit: "kg/ha" });
      const vd = PL.ui.verdict(ui.L.controls, { label: "循環判定" });
      const chart = ui.chart("淋洗流失 vs 施肥量", "施肥未超過吸收上限時淋洗幾乎為零;超過之後,多餘的硝酸鹽直線進入地下水。");
      const drawChart = () => {
        const leach = f => {
          const s = 0.8 * (aS.get() + 0.5 * f) + 0.5 * f;
          return Math.max(0, s - Math.min(dS.get(), s * 0.55) - Math.min(90, s - Math.min(dS.get(), s * 0.55)));
        };
        CK.plot(chart, {
          x0: 0, x1: 200, y0: 0, y1: 110, xticks: [0, 50, 100, 150, 200], yticks: [25, 50, 75, 100],
          xlabel: "化肥施用 (kg/ha)", ylabel: "淋洗 (kg/ha)",
          series: [{ fn: leach, color: "#64b5f6" }],
          marks: [{ dot: [fS.get(), leach(fS.get())], color: PL.col("accent-2"), label: "目前" }]
        });
      };
      chart.onResize(drawChart);
      drawChart();
      root.addEventListener("input", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 生態平衡與外來種 */
  PL.register("ecosystem-balance", {
    build(root) {
      const SPECIES = {
        snail: { name: "福壽螺(水田)", r: 1.8, K: 40000, dot: "#f48fb1", origin: "南美洲,1980 年引入食用" },
        iguana: { name: "綠鬣蜥(溪岸)", r: 0.9, K: 8000, dot: "#a5d6a7", origin: "中南美洲,寵物棄養" },
        tilapia: { name: "吳郭魚(水庫)", r: 1.2, K: 22000, dot: "#90caf9", origin: "非洲,養殖逸出" }
      };
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const key = spSel.get(), sp = SPECIES[key];
          const n0 = n0S.get(), c = cS.get() / 100, yr = yS.get();
          // logistic + 移除:dN/dt = rN(1 − N/K) − cN
          let N = n0; const dt = 0.05;
          for (let i = 0; i < Math.round(yr / dt); i++) N = Math.max(0, N + dt * (sp.r * N * (1 - N / sp.K) - c * N));
          const frac = N / sp.K;
          const natPct = Math.max(4, 100 * (1 - 0.9 * N / (N + 0.22 * sp.K)));
          // 左:族群對比
          CK.panel(ctx, W * 0.05, H * 0.10, W * 0.46, H * 0.78, "族群對比(引入後 " + PL.fmt(yr, 0) + " 年)");
          D.text(ctx, sp.name, W * 0.28, H * 0.20, { color: PL.col("text"), size: 12, align: "center", weight: "700" });
          D.text(ctx, "原產地:" + sp.origin, W * 0.28, H * 0.26, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          CK.counter(ctx, W * 0.09, H * 0.32, W * 0.38, Math.round(clamp(frac, 0, 1) * 50), { color: sp.dot, r: 5 });
          CK.meter(ctx, W * 0.09, H * 0.56, W * 0.38, 10, clamp(frac, 0, 1), { color: frac > 0.5 ? "#e57373" : "#ef8829", label: "入侵種 N / K" });
          CK.counter(ctx, W * 0.09, H * 0.66, W * 0.38, Math.round(natPct / 100 * 40), { color: "#66bb6a", r: 4 });
          CK.meter(ctx, W * 0.09, H * 0.80, W * 0.38, 10, natPct / 100, { color: "#66bb6a", label: "原生種殘存" });
          // 右:防治卡
          CK.panel(ctx, W * 0.55, H * 0.14, W * 0.40, H * 0.62, "防治判讀");
          const rows = [
            ["入侵種族群", PL.fmt(N, 0) + " 隻"],
            ["族群年增幅上限", Math.round(sp.r * 100) + " %/年"],
            ["目前移除率", PL.fmt(cS.get(), 0) + " %/年"],
            ["原生種殘存", PL.fmt(natPct, 0) + " %"]
          ];
          rows.forEach(([k, v], i) => {
            D.text(ctx, k, W * 0.58, H * 0.26 + i * 30, { color: PL.col("text-dim"), size: 10.5 });
            D.text(ctx, v, W * 0.92, H * 0.26 + i * 30 + 1, { color: i === 3 ? PL.col("accent") : PL.col("text"), size: 12, align: "right" });
          });
          D.text(ctx, c * 100 >= sp.r * 100 ? "移除率 ≥ 年增幅:族群被壓向消滅" : "移除率 < 年增幅:族群終究回到上升軌道", W * 0.75, H * 0.62, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          rN.set(N, 0); rNat.set(natPct, 0); rNeed.set(sp.r * 100, 0); rCur.set(cS.get(), 0);
          vd.set(c * 100 >= sp.r * 100 ? "防治有效:族群趨近消滅" : frac > 0.5 ? "族群爆發:入侵成功,原生種被擠壓" : "擴張中:防治強度不足", c * 100 >= sp.r * 100 ? "ok" : frac > 0.5 ? "bad" : "warn");
        }
      });
      const spSel = PL.ui.select(ui.L.controls, { label: "入侵物種", value: "snail", options: [
        { value: "snail", label: "福壽螺(水田)" }, { value: "iguana", label: "綠鬣蜥(溪岸)" }, { value: "tilapia", label: "吳郭魚(水庫)" }
      ] });
      const n0S = PL.ui.slider(ui.L.controls, { label: "引入個體數", min: 2, max: 200, step: 2, value: 20, unit: "隻", digits: 0 });
      const cS = PL.ui.slider(ui.L.controls, { label: "移除率(防治)", min: 0, max: 200, step: 10, value: 30, unit: "%/年", digits: 0 });
      const yS = PL.ui.slider(ui.L.controls, { label: "引入後時間", min: 0, max: 10, step: 1, value: 6, unit: "年", digits: 0 });
      PL.ui.note(ui.L.controls, "外來種不一定入侵:脫離原產地的天敵與競爭後,繁殖快的物種才會擴張成入侵種,擠壓原生種的生態區位。");
      PL.ui.procedure(ui.L.controls, {
        title: "找防治門檻",
        steps: [
          "先看「族群年增幅上限」:福壽螺一年最多能翻幾倍?",
          "把移除率設在年增幅之下,拉時間:族群仍是上升軌道。",
          "把移除率拉到年增幅<b>以上</b>,確認族群被壓向消滅。"
        ],
        rule: "防治強度必須「超過年增幅」才有效——低於門檻的移除只是讓曲線走得慢,不會反轉;所以防堵遠比事後移除便宜。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "剛引入 20 隻", apply: () => { n0S.set(20); cS.set(0); yS.set(2); } },
        { label: "無防治 6 年", apply: () => { cS.set(0); yS.set(6); } },
        { label: "強力防治", apply: () => { n0S.set(200); cS.set(200); yS.set(6); } }
      ] });
      const rN = PL.ui.readout(ui.L.readouts, { label: "入侵種族群", unit: "隻" });
      const rNat = PL.ui.readout(ui.L.readouts, { label: "原生種殘存", unit: "%" });
      const rNeed = PL.ui.readout(ui.L.readouts, { label: "需求移除率", unit: "%/年" });
      const rCur = PL.ui.readout(ui.L.readouts, { label: "目前移除率", unit: "%/年" });
      const vd = PL.ui.verdict(ui.L.controls, { label: "入侵判定" });
      const chart = ui.chart("入侵種族群成長曲線", "移除率低於年增幅時,曲線最終仍回到上升軌道;防治強度必須超過門檻,曲線才會反轉往下。");
      const drawChart = () => {
        const sp = SPECIES[spSel.get()], n0 = n0S.get(), c = cS.get() / 100;
        const pts = [];
        let N = n0; const dt = 0.1;
        for (let i = 0; i <= 100; i++) {
          pts.push([i * 0.1, N]);
          N = Math.max(0, N + dt * (sp.r * N * (1 - N / sp.K) - c * N));
        }
        CK.plot(chart, {
          x0: 0, x1: 10, y0: 0, y1: sp.K * 1.12, xticks: [0, 2, 4, 6, 8, 10],
          xlabel: "引入後年數", ylabel: "族群量 (隻)",
          series: [{ pts, color: PL.col("accent") }],
          marks: [{ hline: sp.K, color: PL.col("warn"), dash: [3, 3] }, { dot: [yS.get(), Math.max(0, pts[Math.round(yS.get() / 0.1)][1])], color: PL.col("accent-2"), label: "目前" }]
        });
      };
      chart.onResize(drawChart);
      drawChart();
      root.addEventListener("input", drawChart);
      return { stop() { ui.stop(); } };
    }
  });
})();
