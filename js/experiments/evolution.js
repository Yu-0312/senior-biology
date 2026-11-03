/* 模組十 · 演化與生物多樣性 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, CK = window.BioLab, D = PL.draw;
  const { clamp, lerp, TAU } = PL;

  /* 共用:穩定假隨機(序號 → 0–1),重畫時個體位置不會跳動 */
  function rnd(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  /* 化石剪影:0 三葉蟲、1 魚類、2 蕨葉、3 足跡、4 骨頭 */
  function fossil(ctx, x, y, kind, s) {
    s = s || 1;
    const ink = "rgba(64,48,30,0.85)", fill = "rgba(64,48,30,0.5)";
    if (kind === 0) {
      ctx.save(); ctx.fillStyle = fill; ctx.strokeStyle = ink; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(x, y, 9 * s, 5.5 * s, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
      for (let k = -2; k <= 2; k++) D.line(ctx, x - 7 * s, y + k * 1.8 * s, x + 7 * s, y + k * 1.8 * s, "rgba(64,48,30,0.5)", 1);
    } else if (kind === 1) {
      ctx.save(); ctx.fillStyle = fill; ctx.strokeStyle = ink; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(x, y, 10 * s, 4.2 * s, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 9 * s, y); ctx.lineTo(x + 15 * s, y - 5 * s); ctx.lineTo(x + 15 * s, y + 5 * s); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    } else if (kind === 2) {
      D.line(ctx, x, y + 9 * s, x, y - 9 * s, ink, 1.6);
      for (let k = -3; k <= 3; k++) D.line(ctx, x, y + k * 2.6 * s, x + 7 * s, y + k * 2.6 * s - 2.6 * s, "rgba(64,48,30,0.6)", 1.2);
    } else if (kind === 3) {
      D.disc(ctx, x, y, 4 * s, { fill: fill });
      for (let k = -1; k <= 1; k++) D.line(ctx, x, y + 2 * s, x + k * 5.5 * s, y - 8 * s, ink, 2.2);
    } else {
      D.line(ctx, x - 8 * s, y, x + 8 * s, y, "rgba(64,48,30,0.6)", 4 * s);
      D.disc(ctx, x - 8 * s, y, 3.2 * s, { fill: "rgba(64,48,30,0.7)" });
      D.disc(ctx, x + 8 * s, y, 3.2 * s, { fill: "rgba(64,48,30,0.7)" });
    }
  }

  /* 椒花蛾:橢圓翅與小驅幹 */
  function moth(ctx, x, y, color, t) {
    ctx.save(); ctx.fillStyle = color; ctx.strokeStyle = "rgba(20,20,20,0.45)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(x, y, 9, 5.4, Math.sin(t * 2) * 0.25, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
    D.disc(ctx, x - 6, y - 1, 2.4, { fill: "#3a3226" });
  }

  /* 化石與地層中的證據 */
  PL.register("fossil-evidence", {
    build(root) {
      const LAYERS = [ // 淺 → 深
        { name: "表土與近期沉積", ma: 0.02, life: "現生植物與軟體動物", trend: "陸生開花植物" },
        { name: "新生代地層", ma: 50, life: "哺乳類與大型貝類", trend: "陸生、恆溫動物興起" },
        { name: "中生代地層", ma: 120, life: "恐龍與菊石", trend: "大型陸生爬蟲類" },
        { name: "古生代晚期", ma: 300, life: "兩生類與羊齒植物", trend: "脊椎動物登陸的關鍵" },
        { name: "古生代早期", ma: 520, life: "三葉蟲與海蠍", trend: "全為水生" }
      ];
      const COLS = ["#c9b283", "#b0976c", "#9a7f55", "#836b47", "#6b5638"];
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const depth = digS.get(), mode = modeSel.get();
          const idx = Math.min(4, Math.floor(depth * 5));
          const layer = LAYERS[idx];
          // 地層柱:五層沉積,越深顏色越暗,每層放化石剪影
          const x0 = W * 0.06, w0 = W * 0.32, top = H * 0.18, bh = H * 0.66 / 5;
          LAYERS.forEach((L, i) => {
            const y = top + i * bh;
            D.rect(ctx, x0, y, w0, bh - 3, { fill: COLS[i], r: 3 });
            ctx.save(); ctx.globalAlpha = i === idx ? 1 : 0.5;
            fossil(ctx, x0 + w0 * (0.22 + rnd(i) * 0.5), y + bh * 0.5, i);
            fossil(ctx, x0 + w0 * (0.15 + rnd(i + 9) * 0.68), y + bh * 0.82, (i + 2) % 5, 0.7);
            ctx.restore();
          });
          // 挖掘線與當前層高亮框
          const digY = top + depth * 5 * bh;
          D.line(ctx, x0 - 10, digY, x0 + w0 + 10, digY, PL.col("accent"), 2, [6, 4]);
          D.rect(ctx, x0 - 3, top + idx * bh - 1, w0 + 6, bh - 1, { fill: null, stroke: PL.col("accent"), width: 2, r: 4 });
          if (mode === "relative") D.arrow(ctx, x0 + w0, top - 14, x0, top - 14, PL.col("text-faint"), "相對年代:越深越古老");
          else D.text(ctx, "放射性定年(百萬年 Ma)", x0 + w0 / 2, top - 14, { color: PL.col("text-faint"), size: 10.5, align: "center" });
          LAYERS.forEach((L, i) => {
            const on = i === idx;
            D.text(ctx, L.name + (mode === "radiometric" ? " · " + PL.fmt(L.ma, L.ma < 1 ? 2 : 0) + " Ma" : ""),
              x0 + w0 + 12, top + i * bh + bh / 2 + 4, { color: on ? PL.col("accent") : PL.col("text-faint"), size: on ? 11.5 : 10, weight: on ? "700" : "" });
          });
          // 右側資料卡
          CK.panel(ctx, W * 0.62, H * 0.14, W * 0.33, H * 0.72, "化石紀錄怎麼讀");
          const rows = [["目前層位", layer.name], ["推估年代", mode === "radiometric" ? PL.fmt(layer.ma, layer.ma < 1 ? 2 : 0) + " Ma" : "第 " + (idx + 1) + " 層 / 5"],
            ["化石組合", layer.life], ["演化趨勢", layer.trend]];
          rows.forEach((r, i) => {
            D.text(ctx, r[0], W * 0.65, H * 0.24 + i * 46, { color: PL.col("text-faint"), size: 10 });
            D.text(ctx, r[1], W * 0.65, H * 0.24 + i * 46 + 17, { color: i === 0 ? PL.col("accent") : PL.col("text"), size: 11.5, weight: i === 0 ? "700" : "" });
          });
          D.text(ctx, "由水生到陸生、由簡單到複雜", W * 0.785, H * 0.78, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          rLayer.set(layer.name);
          rYear.set(mode === "radiometric" ? PL.fmt(layer.ma, layer.ma < 1 ? 2 : 0) + " Ma" : "第 " + (idx + 1) + " 層 / 5(上層較年輕)");
          rLife.set(layer.life); rTrend.set(layer.trend);
        }
      });
      const digS = PL.ui.slider(ui.L.controls, { label: "挖掘深度", min: 0, max: 1, step: 0.02, value: 0.35, digits: 2 });
      const modeSel = PL.ui.select(ui.L.controls, { label: "定年方式", value: "relative", options: [
        { value: "relative", label: "疊積法(相對年代)" }, { value: "radiometric", label: "放射性定年(絕對年代)" }
      ] });
      PL.ui.note(ui.L.controls, "化石形成需要硬組織加上快速掩埋,軟體動物與小族群很難留紀錄——化石序列必然有缺口,缺口不是反例。");
      PL.ui.procedure(ui.L.controls, {
        title: "從地層讀出演化史",
        steps: ["拉動「挖掘深度」,每停一層記下化石組合與推估年代。", "比較第 1 層與第 5 層:哪些是水生?哪些是陸生?",
          "切換定年方式:相對年代只能比順序,放射性定年才給得出 Ma。"],
        rule: "「越深越古老」只在沒有地層倒轉的地點成立;化石缺一層代表當時沒有沉積,不代表演化中斷。"
      });
      const rLayer = PL.ui.readout(ui.L.readouts, { label: "目前層位" }), rYear = PL.ui.readout(ui.L.readouts, { label: "推估年代" });
      const rLife = PL.ui.readout(ui.L.readouts, { label: "化石組合" }), rTrend = PL.ui.readout(ui.L.readouts, { label: "演化趨勢" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 天擇與工業黑化 */
  PL.register("natural-selection", {
    build(root) {
      // 天擇模型:與環境衝突的表現型適應度 1 - s,遞迴 p' = p·w ÷ 平均適應度
      const mkCurve = (e, s) => {
        const wd = e === "sooty" ? 1 : 1 - s, wl = e === "sooty" ? 1 - s : 1;
        const c = []; let p = 0.05;
        for (let g = 0; g <= 30; g++) { c.push([g, p]); const m = p * wd + (1 - p) * wl; p = clamp(p * wd / Math.max(m, 1e-9), 0.001, 0.999); }
        return c;
      };
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const env = envSel.get(), s = pressS.get(), gens = Math.round(genS.get());
          const curve = mkCurve(env, s), pNow = curve[gens][1];
          // 樹幹與椒花蛾:與樹幹同色的個體不透明=偽裝良好
          const tx = W * 0.09, ty = H * 0.16, tw = W * 0.12, th = H * 0.70;
          D.disc(ctx, tx + tw / 2, ty - 10, tw * 0.62, { fill: env === "sooty" ? "rgba(90,96,88,0.5)" : "rgba(110,150,90,0.45)" });
          D.rect(ctx, tx, ty, tw, th, { fill: env === "sooty" ? "#503522" : "#a0805a", r: 6 });
          const nDark = Math.round(pNow * 8);
          for (let i = 0; i < 8; i++) {
            const mx = tx + tw * (0.18 + rnd(i) * 0.64), my = ty + th * (0.06 + rnd(i + 20) * 0.86) + Math.sin(t * 1.8 + i * 2.2) * 2;
            const dark = i < nDark, camo = (env === "sooty") === dark;
            ctx.save(); ctx.globalAlpha = camo ? 0.95 : 0.5;
            moth(ctx, mx, my, dark ? "#2e2e34" : "#ece7d4", t + i);
            ctx.restore();
          }
          CK.legend(ctx, tx + tw + 20, H * 0.20, [{ color: "#2e2e34", label: "深色型" }, { color: "#ece7d4", label: "淺色型" },
            { color: env === "sooty" ? "#503522" : "#a0805a", label: env === "sooty" ? "煤煙樹幹" : "乾淨樹幹" }], 19);
          D.text(ctx, "半透明=易被捕食", tx + tw + 20, H * 0.36, { color: PL.col("text-faint"), size: 10 });
          CK.panel(ctx, W * 0.44, H * 0.16, W * 0.28, H * 0.50, "天擇四要件");
          ["變異:深淺兩型並存", "遺傳:體色由基因決定", "過度繁殖:子代多於承載", "生存競爭:被捕食壓力篩選"].forEach((c, i) => {
            D.disc(ctx, W * 0.475, H * 0.26 + i * 40, 5, { fill: "#66bb6a" });
            D.text(ctx, c, W * 0.50, H * 0.26 + i * 40 + 4, { color: PL.col("text-dim"), size: 10.5 });
          });
          D.text(ctx, "環境決定誰是「適應」", W * 0.58, H * 0.60, { color: PL.col("accent"), size: 11, align: "center", weight: "700" });
          const dP = gens > 0 ? pNow - curve[gens - 1][1] : 0;
          rP.set(pNow, 2); rL.set(1 - pNow, 2); rDp.set((dP >= 0 ? "+" : "") + PL.fmt(dP, 3));
          rW.set(env === "sooty" ? 1 : 1 - s, 2);
          vr.set(env === "sooty" ? "工業黑化:深色型頻率上升" : dP < 0 ? "環境恢復:深色型頻率下降" : "頻率穩定:無選擇壓力",
            env === "sooty" ? "ok" : dP < 0 ? "info" : "warn");
        }
      });
      const envSel = PL.ui.select(ui.L.controls, { label: "樹幹環境", value: "sooty", options: [
        { value: "clean", label: "未污染(淺色地衣)" }, { value: "sooty", label: "工業煤煙(黑樹幹)" }
      ] });
      const pressS = PL.ui.slider(ui.L.controls, { label: "天擇強度", min: 0, max: 1, step: 0.05, value: 0.6, digits: 2 });
      const genS = PL.ui.slider(ui.L.controls, { label: "世代", min: 0, max: 30, step: 1, value: 14, unit: "代", digits: 0 });
      PL.ui.note(ui.L.controls, "天擇作用在表現型(看得見的體色),改變的是族群裡的基因頻率——頻率變了,就是演化發生了。");
      PL.ui.procedure(ui.L.controls, {
        title: "重演椒花蛾事件",
        steps: ["先設「未污染」,記下深色型頻率的走勢。", "切到「工業煤煙」看 30 代:曲線方向翻轉了嗎?",
          "把天擇強度降到 0.1:方向不變,但變慢了。"],
        rule: "天擇不能無中生有:深色突變本來就存在,環境只是決定哪一型活得下去。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "1895 工業區", apply: () => { envSel.set("sooty"); pressS.set(0.7); genS.set(18); } },
        { label: "1980 污染管制後", apply: () => { envSel.set("clean"); pressS.set(0.5); genS.set(24); } },
        { label: "天擇微弱", apply: () => { envSel.set("sooty"); pressS.set(0.15); genS.set(20); } }
      ] });
      const rP = PL.ui.readout(ui.L.readouts, { label: "深色型頻率 p" }), rL = PL.ui.readout(ui.L.readouts, { label: "淺色型頻率" });
      const rDp = PL.ui.readout(ui.L.readouts, { label: "每代變化 Δp" }), rW = PL.ui.readout(ui.L.readouts, { label: "深色型適應度" });
      const vr = PL.ui.verdict(ui.L.readouts, { label: "趨勢判定" });
      const chart = ui.chart("深色型頻率隨世代變化", "實線是目前環境下的頻率曲線,虛線是另一種環境的對照。頻率改變=演化,環境恢復時曲線會翻轉回去。");
      const drawChart = () => {
        const env = envSel.get(), gens = Math.round(genS.get());
        CK.plot(chart, {
          x0: 0, x1: 30, y0: 0, y1: 1, xticks: [0, 10, 20, 30], yticks: [0.25, 0.5, 0.75, 1],
          xlabel: "世代", ylabel: "深色型頻率",
          series: [{ pts: mkCurve(env, pressS.get()), color: PL.col("accent"), width: 2.6 },
            { pts: mkCurve(env === "sooty" ? "clean" : "sooty", pressS.get()), color: PL.col("text-faint"), width: 1.3, dash: [5, 4] }],
          marks: [{ dot: [gens, mkCurve(env, pressS.get())[gens][1]], color: PL.col("accent-2") }]
        });
      };
      chart.onResize(drawChart);
      drawChart();
      root.addEventListener("input", drawChart);
      root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 變異、競爭與適應 */
  PL.register("variation-competition", {
    build(root) {
      const N = 48;
      const IND = []; // 固定取樣的性狀值(0–1,近常態分配)
      for (let i = 0; i < N; i++) IND.push((rnd(i * 3.7) + rnd(i * 9.1 + 5) + rnd(i * 1.3 + 11)) / 3);
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const opt = optS.get(), sig = sigS.get(), q = qS.get();
          const w = x => Math.exp(-Math.pow(x - opt, 2) / (2 * 9 * 9));
          // 適應度曲線(內嵌圖)+ 生存門檻
          const g = PL.graph(ui.cv, { x: W * 0.07, y: H * 0.12, w: W * 0.50, h: H * 0.34 }, { x0: 30, x1: 70, y0: 0, y1: 1.08 });
          g.frame({ xlabel: "性狀值(喙長 mm)", ylabel: "適應度 w", yticks: [0.5, 1] });
          g.grid(4, 2);
          g.fn(w, { color: PL.col("accent") });
          g.vline(opt, { color: PL.col("text-faint"), dash: [5, 4] });
          g.hline(q, { color: "#c65b4e", dash: [5, 4] });
          D.text(ctx, "生存門檻", W * 0.57 - 4, H * 0.12 + H * 0.34 * (1 - q / 1.08) - 8, { color: "#c65b4e", size: 9.5, align: "right" });
          // 個體:帶性狀的點,適應度達門檻者存活
          const gx0 = W * 0.07, gw = W * 0.50, gy = H * 0.86;
          let surv = 0, sumS = 0, sumAll = 0;
          IND.forEach((v, i) => {
            const x = 50 + (v * 2 - 1) * sig, ok = w(x) >= q;
            sumAll += x;
            if (ok) { surv++; sumS += x; }
            const px = gx0 + (x - 30) / 40 * gw, py = gy - 16 - (i % 4) * 13 - rnd(i + 40) * 5;
            if (ok) D.disc(ctx, px, py, 5, { fill: "#66bb6a", stroke: "rgba(30,90,40,0.8)", width: 1.2 });
            else {
              D.disc(ctx, px, py, 5, { fill: PL.theme.shade(0.8), stroke: PL.col("border"), width: 1 });
              D.line(ctx, px - 4, py - 4, px + 4, py + 4, "#c65b4e", 2);
            }
          });
          D.line(ctx, gx0, gy, gx0 + gw, gy, PL.col("border"), 1.6);
          [30, 40, 50, 60, 70].forEach(v => {
            const px = gx0 + (v - 30) / 40 * gw;
            D.line(ctx, px, gy, px, gy + 5, PL.col("text-faint"), 1.2);
            D.text(ctx, String(v), px, gy + 17, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          });
          // 因果鏈資料卡
          CK.panel(ctx, W * 0.62, H * 0.14, W * 0.32, H * 0.66, "天擇怎麼運作");
          ["變異:突變與重組產生差異", "競爭:資源有限,有人活不下來", "適應度:留下可育後代的能力", "結果:有利基因頻率上升"].forEach((c, i) => {
            D.text(ctx, (i + 1) + ". " + c, W * 0.655, H * 0.24 + i * 40, { color: PL.col("text-dim"), size: 10.5 });
            if (i < 3) CK.arrow(ctx, W * 0.665, H * 0.245 + i * 40, W * 0.665, H * 0.262 + i * 40, PL.col("text-faint"));
          });
          D.text(ctx, "w = 留下的可育後代 ÷ 族群平均", W * 0.78, H * 0.72, { color: PL.col("accent"), size: 10.5, align: "center", weight: "700" });
          const meanS = surv ? sumS / surv : 0;
          rAlive.set(surv, 0); rMean.set(meanS, 1); rS.set(meanS - sumAll / N, 2); rDead.set(Math.round((1 - surv / N) * 100), 0);
        }
      });
      const optS = PL.ui.slider(ui.L.controls, { label: "環境最佳性狀", min: 36, max: 64, step: 1, value: 50, unit: "mm", digits: 0 });
      const sigS = PL.ui.slider(ui.L.controls, { label: "變異幅度", min: 3, max: 14, step: 0.5, value: 8, unit: "mm", digits: 1 });
      const qS = PL.ui.slider(ui.L.controls, { label: "生存門檻(競爭強度)", min: 0.15, max: 0.85, step: 0.05, value: 0.4, digits: 2 });
      PL.ui.note(ui.L.controls, "綠點=適應度達門檻、能留下後代;打叉的個體被競爭淘汰。存活的平均性狀會偏向環境最佳值。");
      PL.ui.procedure(ui.L.controls, {
        title: "量出選擇差",
        steps: ["正常設定下記下「存活者平均性狀」與全體平均 50 的差(選擇差)。",
          "把環境最佳性狀調到 60(乾旱、種子變硬),看綠點往哪邊集中。",
          "把變異幅度縮到 3 mm 再調環境:極端性狀根本不存在,誰也選不出來。"],
        rule: "天擇只能在既有變異裡挑選,不能憑空造出新性狀——變異幅度小的族群,再強的壓力也適應不過劇變。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "正常年份", apply: () => { optS.set(50); sigS.set(8); qS.set(0.4); } },
        { label: "乾旱(大種子)", apply: () => { optS.set(60); sigS.set(8); qS.set(0.55); } },
        { label: "環境劇變", apply: () => { optS.set(40); sigS.set(6); qS.set(0.7); } }
      ] });
      const rAlive = PL.ui.readout(ui.L.readouts, { label: "存活個體數" }), rMean = PL.ui.readout(ui.L.readouts, { label: "存活者平均性狀", unit: "mm" });
      const rS = PL.ui.readout(ui.L.readouts, { label: "選擇差 S", unit: "mm" }), rDead = PL.ui.readout(ui.L.readouts, { label: "淘汰比例", unit: "%" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 基因頻率與哈溫平衡 */
  PL.register("hardy-weinberg", {
    build(root) {
      const GT = [["AA", "#5b8def"], ["Aa", "#66bb6a"], ["aa", "#e57373"]];
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const p = pS.get(), q = 1 - p;
          const f = [p * p, 2 * p * q, q * q];
          // 族群抽樣:100 個體依哈溫比例著色
          const gx0 = W * 0.07, gy0 = H * 0.15, gap = W * 0.023;
          for (let i = 0; i < 100; i++) {
            const r = rnd(i);
            const k = r < f[0] ? 0 : r < f[0] + f[1] ? 1 : 2;
            D.disc(ctx, gx0 + (i % 10) * gap, gy0 + Math.floor(i / 10) * gap, gap * 0.42, { fill: GT[k][1], stroke: "rgba(0,0,0,0.25)", width: 1 });
          }
          D.text(ctx, "族群抽樣 100 例(依 p²:2pq:q²)", gx0, gy0 - 10, { color: PL.col("text-faint"), size: 10 });
          CK.legend(ctx, W * 0.33, gy0 + 14, [{ color: "#5b8def", label: "AA 同型顯性" },
            { color: "#66bb6a", label: "Aa 異型帶因" }, { color: "#e57373", label: "aa 隱性性狀" }], 18);
          // 疊積比例條
          const bx = W * 0.07, bw = W * 0.46, by = H * 0.72;
          D.text(ctx, "p² + 2pq + q² = 1", bx, by - 10, { color: PL.col("text-dim"), size: 11 });
          let ax = bx;
          GT.forEach((g2, k) => {
            const w2 = bw * f[k];
            D.rect(ctx, ax, by, Math.max(2, w2), 26, { fill: g2[1] });
            if (f[k] > 0.09) D.text(ctx, Math.round(f[k] * 100) + "%", ax + w2 / 2, by + 17, { color: "#fff", size: 10.5, align: "center", weight: "700" });
            ax += w2;
          });
          // 理想條件檢核
          CK.panel(ctx, W * 0.60, H * 0.14, W * 0.34, H * 0.46, "哈溫平衡的「五無」條件");
          ["無突變", "無遷移(基因流)", "族群極大(無漂變)", "隨機交配", "無天擇"].forEach((c, i) => {
            D.disc(ctx, W * 0.635, H * 0.235 + i * 30, 5, { fill: "#66bb6a" });
            D.text(ctx, c, W * 0.665, H * 0.235 + i * 30 + 4, { color: PL.col("text-dim"), size: 11.5 });
          });
          D.text(ctx, "成立 → 基因頻率世代不變", W * 0.77, H * 0.55, { color: "#66bb6a", size: 11, align: "center", weight: "700" });
          D.text(ctx, "偏離 → 有演化力量作用中", W * 0.77, H * 0.63, { color: PL.col("warn"), size: 11, align: "center" });
          rP.set(p, 2); rQ.set(q, 2); rHet.set(f[1] * 100, 1); rRec.set(f[2] * 100, 2);
          const ratio = q > 0.001 ? Math.round(f[1] / f[2]) : 0;
          vr.set(p < 0.5 ? "q² 很大:隱性性狀常見,帶因者未必多" : "帶因者(Aa)是患者(aa)的約 " + ratio + " 倍", "info");
        }
      });
      const pS = PL.ui.slider(ui.L.controls, { label: "對立基因 A 頻率 p", min: 0.05, max: 0.95, step: 0.01, value: 0.6, digits: 2 });
      PL.ui.note(ui.L.controls, "p、q 是配子裡的基因頻率;p²、2pq、q² 是隨機交配後下一代的基因型頻率。知道一個頻率,其餘全部可算。");
      PL.ui.procedure(ui.L.controls, {
        title: "反推帶因者比例",
        steps: ["隱性遺傳病約每 2500 人有 1 人患病,即 q² = 1/2500,q ≈ 0.02。",
          "把 p 拉到 0.98,讀出異型頻率 2pq ≈ 3.9%。",
          "比較:帶因者約是患者的 98 倍——隱性病藏在帶因者裡。"],
        rule: "哈溫平衡不是「健康」的狀態,而是「沒有演化力量」的基準線;實際族群一定偏離它。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "罕見隱性病(q=0.02)", apply: () => pS.set(0.98) },
        { label: "最大異型(p=0.5)", apply: () => pS.set(0.5) },
        { label: "顯性普遍(p=0.9)", apply: () => pS.set(0.9) }
      ] });
      const rP = PL.ui.readout(ui.L.readouts, { label: "基因頻率 p" }), rQ = PL.ui.readout(ui.L.readouts, { label: "基因頻率 q" });
      const rHet = PL.ui.readout(ui.L.readouts, { label: "異型帶因 2pq", unit: "%" }), rRec = PL.ui.readout(ui.L.readouts, { label: "隱性性狀 q²", unit: "%" });
      const vr = PL.ui.verdict(ui.L.readouts, { label: "帶因者警示" });
      const chart = ui.chart("基因型頻率曲線", "三條曲線只由 p 決定:2pq 在 p=0.5 最大;q² 很小時,帶因者仍可能有幾十倍之多。");
      const drawChart = () => {
        const p = pS.get();
        CK.plot(chart, {
          x0: 0, x1: 1, y0: 0, y1: 1, xticks: [0, 0.25, 0.5, 0.75, 1], yticks: [0.25, 0.5, 0.75, 1],
          xlabel: "A 頻率 p", ylabel: "基因型頻率",
          series: [{ fn: x => x * x, color: "#5b8def" }, { fn: x => 2 * x * (1 - x), color: "#66bb6a" }, { fn: x => (1 - x) * (1 - x), color: "#e57373" }],
          marks: [{ vline: p, color: PL.col("text-faint"), dash: [4, 4] },
            { dot: [p, p * p], color: "#5b8def" }, { dot: [p, 2 * p * (1 - p)], color: "#66bb6a" }, { dot: [p, (1 - p) * (1 - p)], color: "#e57373" }]
        });
      };
      chart.onResize(drawChart);
      drawChart();
      root.addEventListener("input", drawChart);
      root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 種化與隔離機制 */
  PL.register("speciation", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const gens = genS.get(), diff = diffS.get(), barrier = barCk.get();
          // 分化模型:隔離世代 × 環境差 → 兩族平均性狀拉開
          const drift = gens / 200 * (5 + diff * 12);
          const meanL = 50 - drift, meanR = 50 + drift, gap = meanR - meanL;
          const mate = clamp(1 - gap / 16, 0, 1), newSpec = gap >= 14;
          // 性狀軸
          const gx0 = W * 0.07, gw = W * 0.55, gy = H * 0.72;
          D.line(ctx, gx0, gy, gx0 + gw, gy, PL.col("border"), 1.6);
          for (let v = 30; v <= 70; v += 10) {
            const px = gx0 + (v - 30) / 40 * gw;
            D.line(ctx, px, gy, px, gy + 6, PL.col("text-faint"), 1.2);
            D.text(ctx, String(v), px, gy + 18, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          }
          D.text(ctx, "性狀值(如喙長 mm)", gx0 + gw / 2, gy + 34, { color: PL.col("text-faint"), size: 10, align: "center" });
          // 兩族:各 14 隻,散布在各自平均附近,顏色隨性狀由藍漸變到橙
          [meanL, meanR].forEach((mean, off) => {
            for (let i = 0; i < 14; i++) {
              const v = clamp(mean + (rnd(i + off * 100) * 2 - 1) * 4.5, 29, 71);
              const px = gx0 + (v - 30) / 40 * gw, py = gy - 20 - (i % 3) * 16 - rnd(i + off * 100 + 31) * H * 0.22;
              D.disc(ctx, px, py, 6, { fill: CK.mix("#5b8def", "#ef8829", (v - 30) / 40), stroke: "rgba(0,0,0,0.3)", width: 1 });
            }
          });
          // 屏障與基因流
          const bx = gx0 + (50 - 30) / 40 * gw;
          if (barrier) {
            D.rect(ctx, bx - 7, gy - H * 0.58, 14, H * 0.58, { fill: "rgba(95,168,201,0.35)", stroke: "rgba(70,120,150,0.8)", width: 1.5, r: 6 });
            D.text(ctx, "河谷隔離", bx, gy - H * 0.58 - 8, { color: "#5aa2c9", size: 10, align: "center" });
          } else if (!newSpec) {
            CK.arrow(ctx, bx - 40, gy - H * 0.30, bx + 40, gy - H * 0.30, "#66bb6a", "基因流把兩族拉回同種");
            CK.arrow(ctx, bx + 40, gy - H * 0.38, bx - 40, gy - H * 0.38, "#66bb6a");
          } else D.text(ctx, "屏障已消失,但兩族已無法交配", bx, gy - H * 0.34, { color: PL.col("warn"), size: 10.5, align: "center" });
          if (newSpec) CK.badge(ctx, W * 0.32, H * 0.14, "生殖隔離:新種形成", "#66bb6a");
          CK.panel(ctx, W * 0.66, H * 0.14, W * 0.30, H * 0.60, "種化三步驟");
          ["地理隔離:族群被屏障分開", "各自累積變異:兩岸環境不同", "生殖隔離:相遇也無法交配"].forEach((c, i) => {
            D.text(ctx, c, W * 0.685, H * 0.24 + i * 42, { color: PL.col("text-dim"), size: 10.5 });
            if (i < 2) CK.arrow(ctx, W * 0.695, H * 0.25 + i * 42, W * 0.695, H * 0.268 + i * 42, PL.col("text-faint"));
          });
          D.text(ctx, "加拉巴哥群島的雀鳥", W * 0.81, H * 0.68, { color: PL.col("text-faint"), size: 10, align: "center" });
          rL.set(meanL, 1); rR.set(meanR, 1); rGap.set(gap, 1); rMate.set(mate * 100, 0);
          vr.set(newSpec ? "生殖隔離形成:新種" : gap >= 8 ? "亞種:雜交後代生育力下降" : "仍屬同種,可以互相交配", newSpec ? "ok" : gap >= 8 ? "warn" : "info");
        }
      });
      const genS = PL.ui.slider(ui.L.controls, { label: "隔離世代", min: 0, max: 200, step: 5, value: 80, unit: "代", digits: 0 });
      const diffS = PL.ui.slider(ui.L.controls, { label: "兩岸環境差", min: 0, max: 1, step: 0.05, value: 0.5, digits: 2 });
      const barCk = PL.ui.checkbox(ui.L.controls, { label: "地理屏障存在", checked: true });
      PL.ui.note(ui.L.controls, "種的定義不是長得像,而是能否交配出可育後代;植物多倍體甚至能一夜種化,動物通常要等屏障累積變異。");
      PL.ui.procedure(ui.L.controls, {
        title: "看族群怎麼一分為二",
        steps: ["屏障打開、世代 0:兩族平均相同,交配成功率 100%。",
          "關上屏障把世代拉到 200:性狀差多少時成功率歸零?",
          "移除屏障但性狀差已超過 14 mm:基因流箭頭消失——這才是生殖隔離。"],
        rule: "地理隔離只是第一步,生殖隔離才是種化的判準;已形成新種後,屏障拿掉也不會再混回來。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "河谷剛形成", apply: () => { genS.set(20); diffS.set(0.5); barCk.set(true); } },
        { label: "隔離一百萬年", apply: () => { genS.set(180); diffS.set(0.7); barCk.set(true); } },
        { label: "屏障消失(同種)", apply: () => { genS.set(30); diffS.set(0.3); barCk.set(false); } }
      ] });
      const rL = PL.ui.readout(ui.L.readouts, { label: "左族平均性狀", unit: "mm" }), rR = PL.ui.readout(ui.L.readouts, { label: "右族平均性狀", unit: "mm" });
      const rGap = PL.ui.readout(ui.L.readouts, { label: "性狀差", unit: "mm" }), rMate = PL.ui.readout(ui.L.readouts, { label: "交配成功率", unit: "%" });
      const vr = PL.ui.verdict(ui.L.readouts, { label: "種化判定" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 同源構造與演化親緣 */
  PL.register("homologous-structures", {
    build(root) {
      const SEG_NAMES = ["肱骨", "橈骨與尺骨", "腕骨", "掌骨與指骨"];
      const SP = { // dir:各段走向(度,90=向下);len:各段相對長度
        human: { name: "人類", job: "操作器具", len: [1.0, 1.0, 0.7, 0.9], dir: [100, 10, 80, 45], fingers: 5, wing: false },
        cat: { name: "貓", job: "奔跑與跳躍", len: [1.15, 1.0, 0.6, 1.25], dir: [115, 72, 85, 75], fingers: 4, wing: false },
        whale: { name: "鯨", job: "划水與轉向", len: [1.3, 0.9, 0.95, 0.8], dir: [95, 55, 40, 22], fingers: 5, wing: false },
        bat: { name: "蝙蝠", job: "飛行(翼膜)", len: [0.7, 0.95, 0.6, 2.1], dir: [58, 20, 8, -8], fingers: 5, wing: true },
        bird: { name: "鳥", job: "飛行(翅)", len: [0.8, 1.3, 0.85, 0.6], dir: [55, 15, 5, -15], fingers: 3, wing: true },
        insect: { name: "昆蟲", job: "飛行(幾丁質翅)", len: null, fingers: 0, wing: false }
      };
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const key = spSel.get(), sp = SP[key], seg = Math.round(segS.get());
          const boneCol = "#c8b48e", hiCol = PL.col("accent");
          const membrane = [];
          // 前肢:四段骨,依物種改變長度與走向;昆蟲以翅脈對照
          const drawLimb = (sx, sy, scale, label) => {
            if (!sp.len) {
              const wr = 62 * scale;
              ctx.save(); ctx.fillStyle = "rgba(170,190,205,0.30)"; ctx.strokeStyle = "rgba(90,110,125,0.9)"; ctx.lineWidth = 1.6;
              ctx.beginPath(); ctx.ellipse(sx + wr * 0.5, sy - wr * 0.35, wr, wr * 0.42, -0.5, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
              for (let i = 0; i < 4; i++) {
                const a = -0.9 - i * 0.42;
                D.line(ctx, sx, sy, sx + Math.cos(a) * wr * 1.3, sy + Math.sin(a) * wr * 1.3,
                  i === seg ? hiCol : "rgba(90,110,125,0.7)", i === seg ? 2.6 : 1.6);
              }
              D.text(ctx, label + ":翅脈 " + (seg + 1) + " 標示(無骨骼)", sx + wr * 0.5, sy + 40, { color: PL.col("text-faint"), size: 10, align: "center" });
              return;
            }
            let x = sx, y = sy;
            const pts = [[x, y]];
            for (let i = 0; i < 4; i++) {
              const a = sp.dir[i] * Math.PI / 180;
              const L = H * 0.085 * scale * sp.len[i];
              x += Math.cos(a) * L; y += Math.sin(a) * L;
              D.line(ctx, pts[i][0], pts[i][1], x, y, i === seg ? hiCol : boneCol, (i === seg ? 11 : 9) - i);
              pts.push([x, y]);
            }
            if (sp.wing) membrane.push(pts[0], pts[1], pts[2]);
            for (let f = 0; f < sp.fingers; f++) {
              const fa = sp.dir[3] * Math.PI / 180 - 0.55 + f * (1.1 / Math.max(1, sp.fingers - 1));
              D.line(ctx, x, y, x + Math.cos(fa) * H * 0.075, y + Math.sin(fa) * H * 0.075,
                seg === 3 ? hiCol : boneCol, seg === 3 ? 5 : 3.6);
              if (sp.wing) membrane.push([x + Math.cos(fa) * H * 0.075, y + Math.sin(fa) * H * 0.075]);
            }
            pts.forEach((p, i) => { if (i === seg) D.disc(ctx, p[0], p[1], 4.5, { fill: hiCol }); });
            D.text(ctx, label, sx, sy - 22, { color: PL.col("text-dim"), size: 11.5, align: "center", weight: "700" });
          };
          drawLimb(W * 0.20, H * 0.24, 1.0, sp.name + "前肢");
          if (membrane.length >= 3) {
            ctx.save(); ctx.fillStyle = "rgba(140,110,170,0.28)"; ctx.strokeStyle = "rgba(100,80,130,0.8)";
            ctx.beginPath(); membrane.forEach((p, i) => { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
            ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
          }
          // 右側:骨段對照與判定
          CK.panel(ctx, W * 0.56, H * 0.14, W * 0.38, H * 0.74, "對照與判定");
          SEG_NAMES.forEach((nm, i) => {
            D.text(ctx, nm, W * 0.60, H * 0.235 + i * 34, { color: i === seg ? PL.col("accent") : PL.col("text-faint"), size: 11, weight: i === seg ? "700" : "" });
            D.text(ctx, ["上臂", "前臂", "手腕", "手掌與手指"][i], W * 0.60, H * 0.235 + i * 34 + 15, { color: PL.col("text-faint"), size: 9 });
          });
          const rows = [["前肢功能", sp.job], ["同源判定", sp.len ? "同源(結構同、功能異)" : "同功(功能同、結構異)"],
            ["演化意義", key === "insect" ? "鳥翅與蟲翅是趨同演化" : sp.wing ? "骨骼同源、翅膀趨同" : "源自共同祖先的前肢"]];
          rows.forEach((r, i) => {
            D.text(ctx, r[0], W * 0.72, H * 0.235 + i * 56, { color: PL.col("text-faint"), size: 10 });
            D.text(ctx, r[1], W * 0.72, H * 0.235 + i * 56 + 17, { color: PL.col("text"), size: 10.5 });
          });
          rSp.set(sp.name); rJob.set(sp.job); rSeg.set(sp.len ? SEG_NAMES[seg] : "翅脈(無骨骼)");
          rHomol.set(sp.len ? "同源構造" : "同功構造");
          vr.set(key === "insect" ? "鳥翅 vs 蟲翅:同功構造" : sp.wing ? "鳥與蝙蝠:骨骼同源、翅膀同功" : "哺乳類前肢:同源構造", key === "insect" ? "warn" : "info");
        }
      });
      const spSel = PL.ui.select(ui.L.controls, { label: "動物", value: "human", options: Object.keys(SP).map(k => ({ value: k, label: SP[k].name })) });
      const segS = PL.ui.slider(ui.L.controls, { label: "骨段標示", min: 0, max: 3, step: 1, value: 1, digits: 0 });
      PL.ui.note(ui.L.controls, "同源看結構、同功看功能。把骨段滑桿從 0 移到 3,四種動物的同一根骨頭被輪流點亮——這就是共同祖先的印記。");
      const rSp = PL.ui.readout(ui.L.readouts, { label: "動物" }), rJob = PL.ui.readout(ui.L.readouts, { label: "前肢功能" });
      const rSeg = PL.ui.readout(ui.L.readouts, { label: "標示構造" }), rHomol = PL.ui.readout(ui.L.readouts, { label: "判定" });
      const vr = PL.ui.verdict(ui.L.readouts, { label: "親緣判定" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 親緣關係樹的判讀 */
  PL.register("phylogenetic-tree", {
    build(root) {
      const NODE_NAMES = { root: "昆蟲與脊椎動物的共同祖先", vert: "脊椎動物", tetra: "四足類", amni: "羊膜動物", dragon: "主龍類(爬蟲+鳥)" };
      const mkTree = dna => ({
        x: 1, name: NODE_NAMES.root, kids: [
          { leaf: "昆蟲" },
          { x: 0.82, name: NODE_NAMES.vert, kids: [
            { leaf: "魚類" },
            { x: 0.60, name: NODE_NAMES.tetra, kids: [
              { leaf: "兩生類" },
              dna
                ? { x: 0.44, name: NODE_NAMES.amni, kids: [{ leaf: "哺乳類" }, { x: 0.24, name: NODE_NAMES.dragon, kids: [{ leaf: "爬蟲類" }, { leaf: "鳥類" }] }] }
                : { x: 0.30, name: NODE_NAMES.amni + "(形態難解析先後)", kids: [{ leaf: "哺乳類" }, { leaf: "爬蟲類" }, { leaf: "鳥類" }] }
            ] }] }] });
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const tc = tcS.get(), dna = modeSel.get() === "dna";
          const tree = mkTree(dna);
          const rootX = W * 0.08, tipX = W * 0.66, span = tipX - rootX;
          const pxOf = x => rootX + (1 - x) * span;
          // 配置葉端 y(依走訪順序均分)
          let li = 0;
          const walk = node => {
            if (node.leaf) { node.y = H * (0.20 + li++ * 0.115); return node.y; }
            const ys = node.kids.map(walk);
            node.y = (ys[0] + ys[ys.length - 1]) / 2;
            return node.y;
          };
          walk(tree);
          // 畫枝:內部節點畫垂直連接線,葉端畫水平線到標籤
          const branch = "rgba(110,150,130,0.9)";
          const drawNode = (node, pxFrom) => {
            const px = node.leaf ? tipX : pxOf(node.x);
            if (node.leaf) {
              D.line(ctx, pxFrom, node.y, px, node.y, branch, 2.2);
              D.text(ctx, node.leaf, px + 10, node.y + 4, { color: PL.col("text"), size: 11.5 });
              return node.y;
            }
            const kys = node.kids.map(k => drawNode(k, px));
            D.line(ctx, px, Math.min.apply(null, kys), px, Math.max.apply(null, kys), branch, 2.2);
            if (pxFrom != null) D.line(ctx, pxFrom, node.y, px, node.y, branch, 2.2);
            return node.y;
          };
          drawNode(tree, null);
          // 時間游標:越往左越古老
          const cx = rootX + (1 - tc) * span;
          D.line(ctx, cx, H * 0.14, cx, H * 0.82, PL.col("accent-2"), 1.8, [6, 4]);
          D.text(ctx, "現在", tipX + 62, H * 0.14 - 8, { color: PL.col("text-faint"), size: 9.5 });
          D.text(ctx, Math.round(tc * 600) + " Ma 前", cx, H * 0.14 - 8, { color: PL.col("accent-2"), size: 10, align: "center" });
          // 最近共同祖先 = 比游標更早(更深)的最新節點
          const internals = [];
          (function collect(node) {
            if (!node.leaf) { internals.push(node); node.kids.forEach(collect); }
          })(tree);
          const passed = internals.filter(n => n.x >= tc);
          const mrca = passed.length ? passed.reduce((a, b) => (a.x < b.x ? a : b)) : null;
          internals.forEach(n => {
            const on = passed.includes(n);
            D.disc(ctx, pxOf(n.x), n.y, on ? 5 : 3.5, { fill: on ? (n === mrca ? PL.col("accent-2") : PL.col("accent")) : PL.theme.shade(0.7), stroke: PL.col("border"), width: 1 });
          });
          if (mrca) CK.badge(ctx, clamp(pxOf(mrca.x), W * 0.22, W * 0.5), mrca.y - 18, mrca.name, PL.col("accent"));
          rTime.set(Math.round(tc * 600), 0); rNodes.set(passed.length, 0);
          rAnce.set(mrca ? mrca.name : "尚未分化");
          rMode.set(dna ? "DNA 序列:分歧先後明確" : "形態特徵:三分岔待解析");
        }
      });
      const tcS = PL.ui.slider(ui.L.controls, { label: "回溯時間", min: 0, max: 1, step: 0.02, value: 0.35, digits: 2 });
      const modeSel = PL.ui.select(ui.L.controls, { label: "建樹資料", value: "dna", options: [
        { value: "morph", label: "形態特徵" }, { value: "dna", label: "DNA 序列" }
      ] });
      PL.ui.note(ui.L.controls, "分岔點代表共同祖先:兩類群分岔點越近、親緣越近。虛線游標往左推,就是在問「那個年代大家共同的祖先是誰」。");
      PL.ui.procedure(ui.L.controls, {
        title: "讀懂一棵親緣樹",
        steps: ["把游標放在 0.24:主龍類剛分出,鱷魚與鳥的親緣最近。",
          "切到「形態特徵」:哺乳、爬蟲、鳥變成三分岔,先後無法解析。",
          "切回「DNA 序列」:分子資料把順序解開——這是分子資料的價值。"],
        rule: "支序圖上分支的「長度」不代表時間,先後只看分岔點位置;要用序列差異(分子時鐘)才能估算年代。"
      });
      const rTime = PL.ui.readout(ui.L.readouts, { label: "游標推估時間", unit: "Ma" }), rNodes = PL.ui.readout(ui.L.readouts, { label: "已分化節點數" });
      const rAnce = PL.ui.readout(ui.L.readouts, { label: "最近共同祖先" }), rMode = PL.ui.readout(ui.L.readouts, { label: "建樹依據" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 生物多樣性的三個層次 */
  PL.register("biodiversity", {
    build(root) {
      const SPECIES = [ // n 名稱、c 顏色、base 基準數量、k 對棲地流失的敏感度
        { n: "獼猴", c: "#8d6e63", base: 14, k: 1.2 }, { n: "藍鵲", c: "#5b8def", base: 10, k: 1.5 }, { n: "鱒魚", c: "#64b5f6", base: 8, k: 2.2 },
        { n: "樹蛙", c: "#66bb6a", base: 16, k: 1.6 }, { n: "蝴蝶", c: "#ef8829", base: 20, k: 1.0 }, { n: "山椒魚", c: "#b388ff", base: 5, k: 2.8 },
        { n: "穿山甲", c: "#a1887f", base: 6, k: 1.8 }, { n: "帝雉", c: "#90a4ae", base: 7, k: 2.0 }
      ];
      const HAB = [{ n: "森林", c: "#7fae6b" }, { n: "溪流", c: "#6fa8c9" }, { n: "濕地", c: "#7fb5a8" }];
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const d = dS.get(), mode = modeSel.get();
          // 棲地嵌塊:32 塊,棲地破壞時依干擾強度灰化
          const gx0 = W * 0.07, gy0 = H * 0.15, cs = W * 0.032, gp = 4;
          const rem = { 0: 0, 1: 0, 2: 0 };
          for (let i = 0; i < 32; i++) {
            const kind = Math.floor(rnd(i * 7.3) * 3);
            const gone = mode === "habitat" && rnd(i * 3.1 + 60) < d;
            if (!gone) rem[kind]++;
            D.rect(ctx, gx0 + (i % 8) * (cs + gp), gy0 + Math.floor(i / 8) * (cs + gp), cs, cs,
              { fill: gone ? "rgba(120,115,110,0.3)" : HAB[kind].c, r: 4, stroke: gone ? PL.col("border") : null, width: 1 });
          }
          const types = [0, 1, 2].filter(k => rem[k] >= 2).length;
          D.text(ctx, "棲地嵌塊:" + HAB.map((h2, k) => h2.n + " " + rem[k]).join(" / "), gx0, gy0 + 4 * (cs + gp) + 8, { color: PL.col("text-faint"), size: 10 });
          // 物種數量:棲地破壞依敏感度流失;外來種直接排擠原生種
          const ab = SPECIES.map(sp => Math.round(sp.base * (mode === "habitat" ? Math.pow(1 - d, sp.k) : Math.pow(Math.max(0, 1 - d * 1.5), 1.4))));
          const inv = mode === "invader" ? Math.round(30 * d) : 0;
          const alive = ab.filter(a => a >= 2);
          if (inv >= 2) alive.push(inv);
          const total = alive.reduce((s2, a) => s2 + a, 0) || 1;
          let Hp = 0;
          alive.forEach(a => { const pp = a / total; Hp -= pp * Math.log(pp); });
          const S = alive.length, E = S > 1 ? Hp / Math.log(S) : 1;
          // 物種列:圓半徑隨數量,消失的畫灰底打叉
          const sy = H * 0.56, sx0 = W * 0.08;
          SPECIES.forEach((sp, i) => {
            const a = ab[i], px = sx0 + i * W * 0.052;
            if (a >= 2) D.disc(ctx, px, sy, 4 + Math.sqrt(a) * 1.6, { fill: sp.c, stroke: "rgba(0,0,0,0.25)", width: 1 });
            else {
              D.disc(ctx, px, sy, 6, { fill: PL.theme.shade(0.8), stroke: PL.col("border"), width: 1 });
              D.line(ctx, px - 4, sy - 4, px + 4, sy + 4, "#c65b4e", 2);
            }
            D.text(ctx, sp.n, px, sy + 20, { color: a >= 2 ? PL.col("text-dim") : PL.col("text-faint"), size: 9, align: "center" });
            D.text(ctx, a >= 2 ? String(a) : "消失", px, sy + 32, { color: a >= 2 ? PL.col("text-faint") : "#c65b4e", size: 9, align: "center" });
          });
          if (inv >= 2) {
            D.disc(ctx, sx0 + 8 * W * 0.052, sy, 4 + Math.sqrt(inv) * 1.6, { fill: "#9575cd", stroke: "rgba(0,0,0,0.25)", width: 1 });
            D.text(ctx, "入侵種", sx0 + 8 * W * 0.052, sy + 20, { color: "#b39ddb", size: 9, align: "center" });
          }
          // 右側:三層次量表
          CK.panel(ctx, W * 0.62, H * 0.14, W * 0.32, H * 0.66, "三個層次的現況");
          const gene = clamp(1 - d * (mode === "habitat" ? 0.8 : 0.5), 0, 1);
          CK.meter(ctx, W * 0.655, H * 0.27, W * 0.24, 10, gene, { color: "#b388ff", label: "基因多樣性(適應的本錢)" });
          CK.meter(ctx, W * 0.655, H * 0.40, W * 0.24, 10, S / 8, { color: "#5b8def", label: "物種多樣性(" + S + " / 8 種)" });
          CK.meter(ctx, W * 0.655, H * 0.53, W * 0.24, 10, types / 3, { color: "#7fb5a8", label: "生態系多樣性(" + types + " / 3 類)" });
          D.text(ctx, mode === "habitat" ? "棲地破壞:三個層次一起流失" : "外來種:棲地完好,但原生種被排擠", W * 0.78, H * 0.72, { color: PL.col("warn"), size: 10, align: "center" });
          rS.set(S, 0); rH.set(Hp, 2); rE.set(E, 2); rLost.set(8 - SPECIES.filter((sp, i) => ab[i] >= 2).length, 0);
          vr.set(S >= 7 ? "多樣性高:系統穩定、抵抗干擾" : S >= 4 ? "多樣性下降:系統變得脆弱" : "多樣性崩落:復原非常困難", S >= 7 ? "ok" : S >= 4 ? "warn" : "bad");
        }
      });
      const modeSel = PL.ui.select(ui.L.controls, { label: "干擾型態", value: "habitat", options: [
        { value: "habitat", label: "棲地破壞" }, { value: "invader", label: "外來種入侵" }
      ] });
      const dS = PL.ui.slider(ui.L.controls, { label: "干擾強度", min: 0, max: 1, step: 0.05, value: 0.25, digits: 2 });
      PL.ui.note(ui.L.controls, "多樣性 = 豐富度(有幾種)+ 均勻度(數量分不均)。族群縮小時基因變異先流失,下一次干擾來臨就更難適應。");
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "原始林", apply: () => { modeSel.set("habitat"); dS.set(0.05); } },
        { label: "中度開發 45%", apply: () => { modeSel.set("habitat"); dS.set(0.45); } },
        { label: "外來種入侵", apply: () => { modeSel.set("invader"); dS.set(0.5); } }
      ] });
      const rS = PL.ui.readout(ui.L.readouts, { label: "物種數 S" }), rH = PL.ui.readout(ui.L.readouts, { label: "多樣性指數 H'" });
      const rE = PL.ui.readout(ui.L.readouts, { label: "均勻度 E" }), rLost = PL.ui.readout(ui.L.readouts, { label: "消失物種數" });
      const vr = PL.ui.verdict(ui.L.readouts, { label: "多樣性狀態" });
      return { stop() { ui.stop(); } };
    }
  });
})();
