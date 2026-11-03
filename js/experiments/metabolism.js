/* 模組三 · 代謝與能量轉換 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, CK = window.BioLab, D = PL.draw;
  const { clamp, lerp, TAU } = PL;

  // 穩定偽隨機:同一索引每次回同一值,氣泡與粒子才不會每格亂跳
  function rnd(i) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  /* 酵素與受質的專一性 */
  PL.register("enzyme-action", {
    build(root) {
      let made = 0;
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const S = subS.get(), fit = subSel.get() === "fit";
          const v = fit ? 60 * S / (2 + S) : 0, occ = fit ? S / (2 + S) : 0;   // 米氏動力學;occ=活性區佔用率
          made = Math.min(9999, made + v * dt * 0.08);
          // 酵素本體:圓球留一個開口當活性區
          const ex = W * 0.26, ey = H * 0.46, er = H * 0.19;
          ctx.save();
          ctx.beginPath();
          ctx.arc(ex, ey, er, 0.55, TAU - 0.55);
          ctx.lineTo(ex + er * 0.5, ey + er * 0.34);
          ctx.lineTo(ex + er * 0.5, ey - er * 0.34);
          ctx.closePath();
          ctx.fillStyle = "rgba(126,148,214," + (0.22 + occ * 0.3) + ")"; ctx.fill();
          ctx.strokeStyle = "rgba(78,104,168,0.95)"; ctx.lineWidth = 2.2; ctx.stroke();
          ctx.restore();
          D.text(ctx, "酵素 E(麥芽糖酶)", ex, ey + er + 18, { color: PL.col("text-dim"), size: 11, align: "center" });
          if (fit && S > 0.05) {
            D.disc(ctx, ex + er * 0.7, ey, er * 0.27, { fill: "#ffd54f", stroke: "rgba(150,110,15,0.95)", width: 1.4 });
            D.text(ctx, "ES", ex + er * 0.7, ey + 3.5, { color: "#4a3a00", size: 9.5, align: "center", weight: "700" });
          } else if (!fit) D.text(ctx, "活性區不合 ✕", ex + er * 1.5, ey, { color: "#e57373", size: 11, align: "center", weight: "700" });
          // 漂浮受質:契合=圓(麥芽糖),不合=方(蔗糖);顆數隨濃度增加
          const n = clamp(Math.round(S * 1.6), 0, 14);
          for (let i = 0; i < n; i++) {
            const px = W * 0.47 + rnd(i) * W * 0.16 + Math.sin(t * 1.2 + i) * 7;
            const py = H * 0.17 + rnd(i + 40) * H * 0.56 + Math.cos(t + i * 1.7) * 7;
            if (fit) D.disc(ctx, px, py, 6.5, { fill: "rgba(255,213,79,0.9)", stroke: "rgba(150,110,15,0.8)", width: 1 });
            else D.rect(ctx, px - 6, py - 6, 12, 12, { fill: "rgba(144,164,184,0.85)", stroke: "rgba(80,100,120,0.8)", width: 1, r: 2.5 });
          }
          D.text(ctx, fit ? "受質 S:麥芽糖(契合)" : "受質 S:蔗糖(不合)", W * 0.55, H * 0.11, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          // 產物:兩顆葡萄糖成對向右漂出
          if (fit && v > 1) {
            const k = clamp(Math.round(v / 10), 1, 6);
            for (let i = 0; i < k; i++) {
              const p = ((t * 0.22 + i * 0.37) % 1 + 1) % 1, px = ex + er + 18 + p * W * 0.18;
              ctx.save(); ctx.globalAlpha = 1 - p;
              D.disc(ctx, px, H * 0.50 + Math.sin(i * 2.4) * 12, 4.6, { fill: "#a5d6a7", stroke: "rgba(46,125,50,0.9)", width: 1 });
              D.disc(ctx, px + 9, H * 0.50 + Math.sin(i * 2.4) * 12, 4.6, { fill: "#a5d6a7", stroke: "rgba(46,125,50,0.9)", width: 1 });
              ctx.restore();
            }
          }
          CK.arrow(ctx, W * 0.36, H * 0.86, W * 0.60, H * 0.86, PL.col("accent"), "E + S ⇌ ES → E + P(酵素回收再用)");
          CK.meter(ctx, W * 0.66, H * 0.74, W * 0.26, 10, occ, { color: "#ffd54f", label: "活性區佔用率" });
          CK.panel(ctx, W * 0.66, H * 0.14, W * 0.30, H * 0.52, "專一性檢核");
          const rows = [["鎖鑰模型", fit ? "活性區形狀契合 → 可催化" : "形狀不合 → 完全不反應"], ["產物", "麥芽糖 → 2 個葡萄糖"], ["酵素去向", "反應後恢復原狀,可重複用"], ["催化本質", "降低活化能,不改變平衡"]];
          rows.forEach(([k2, d2], i) => {
            D.text(ctx, k2, W * 0.685, H * 0.235 + i * H * 0.105, { color: PL.col("text"), size: 11, weight: "700" });
            D.text(ctx, d2, W * 0.685, H * 0.235 + i * H * 0.105 + 13, { color: PL.col("text-dim"), size: 9.8 });
          });
          rV.set(v, 1); rOcc.set(occ * 100, 0); rMade.set(Math.floor(made), 0);
          vd.set(!fit ? "專一性不合:速率為 0" : occ > 0.85 ? "近飽和:再加受質幫助有限" : "速率隨受質濃度上升", !fit ? "bad" : occ > 0.85 ? "info" : "ok");
        }
      });
      const subSel = PL.ui.select(ui.L.controls, { label: "受質種類", value: "fit", options: [{ value: "fit", label: "麥芽糖(契合)" }, { value: "nofit", label: "蔗糖(不契合)" }] });
      const subS = PL.ui.slider(ui.L.controls, { label: "受質濃度", min: 0, max: 10, step: 0.5, value: 2, unit: "%", digits: 1 });
      PL.ui.note(ui.L.controls, "酵素像鎖,受質像鑰匙:換一把形狀不同的鑰匙(蔗糖),活性區抓不住,速率就是 0——這就是專一性。");
      PL.ui.procedure(ui.L.controls, { title: "量出飽和曲線", steps: ["受質濃度從 0% 慢慢拉到 10%,盯著「反應速率」讀數。",
        "低濃度時速率大約正比於濃度;超過約 4% 之後還會翻倍嗎?", "換成蔗糖再拉一次濃度:曲線整條趴在地上。"],
        rule: "速率封頂不是酵素「累了」,是所有活性區都被占滿;再加受質只能排隊,不能加速。" });
      const vd = PL.ui.verdict(ui.L.controls, { label: "判定" });
      const rV = PL.ui.readout(ui.L.readouts, { label: "反應速率", unit: "受質/分" }), rOcc = PL.ui.readout(ui.L.readouts, { label: "活性區佔用率", unit: "%" });
      const rMade = PL.ui.readout(ui.L.readouts, { label: "累積產物", unit: "分子" });
      const chart = ui.chart("受質濃度-速率曲線", "先陡後平的米氏曲線:低濃度時速率正比於受質,接近 Vmax 後變平——瓶頸從「受質不夠」換成「活性區全滿」。");
      const drawChart = () => {
        const fit = subSel.get() === "fit", S = subS.get();
        CK.plot(chart, { x0: 0, x1: 10, y0: 0, y1: 70, xticks: [2, 4, 6, 8], yticks: [20, 40, 60], xlabel: "受質濃度 (%)", ylabel: "反應速率 (受質/分)",
          series: [{ fn: s => (fit ? 60 * s / (2 + s) : 0), color: PL.col("accent") }],
          marks: [{ dot: [S, fit ? 60 * S / (2 + S) : 0], color: PL.col("accent-2"), label: "目前" }] });
      };
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 影響酵素活性的因素 */
  PL.register("enzyme-factors", {
    build(root) {
      const ENZ = {
        saliva: { name: "唾液澱粉酶", Topt: 37, pHopt: 7, Tden: 52, where: "口腔:分解澱粉 → 麥芽糖" }, pepsin: { name: "胃蛋白酶", Topt: 37, pHopt: 2, Tden: 52, where: "胃:強酸中分解蛋白質" },
        plant: { name: "植物澱粉酶", Topt: 25, pHopt: 6.5, Tden: 45, where: "發芽種子:動員儲存澱粉" }
      };
      let denatured = false;
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const enz = ENZ[enzSel.get()], T = tempS.get(), pH = phS.get(); if (T >= enz.Tden) denatured = true;
          const act = denatured ? 0 : 100 * Math.exp(-Math.pow(T - enz.Topt, 2) / 162) * Math.exp(-Math.pow(pH - enz.pHopt, 2) / 2.9);
          const ex = W * 0.30, ey = H * 0.40;
          if (denatured) {  // 變性:摺疊散開成一團亂線
            ctx.save();
            ctx.strokeStyle = "rgba(126,148,214,0.9)"; ctx.lineWidth = 3; ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(ex - 48, ey - 10);
            for (let i = 1; i <= 12; i++) ctx.lineTo(ex - 48 + i * 8, ey - 10 + Math.sin(i * 2.1) * 16);
            ctx.stroke(); ctx.restore();
            CK.badge(ctx, ex, ey + 46, "變性:不可逆", "#c0392b");
          } else {
            const r = 34;
            ctx.save();
            ctx.beginPath(); ctx.arc(ex, ey, r, 0.55, TAU - 0.55);
            ctx.lineTo(ex + r * 0.5, ey + r * 0.34); ctx.lineTo(ex + r * 0.5, ey - r * 0.34); ctx.closePath();
            ctx.fillStyle = "rgba(126,148,214," + (0.20 + act / 100 * 0.35) + ")"; ctx.fill();
            ctx.strokeStyle = "rgba(78,104,168,0.95)"; ctx.lineWidth = 2.2; ctx.stroke();
            if (act > 5) D.disc(ctx, ex, ey, r + 10, { fill: "rgba(255,213,79," + act / 100 * 0.28 + ")" });
            ctx.restore();
          }
          D.text(ctx, enz.name + "(最適 " + enz.Topt + "°C・pH " + enz.pHopt + ")", ex, H * 0.66, { color: PL.col("text-dim"), size: 11, align: "center" });
          // 溫度計與 pH 色條
          CK.thermometer(ctx, W * 0.05, H * 0.20, H * 0.76, T / 60);
          D.text(ctx, T + " °C", W * 0.05, H * 0.16, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          const bx = W * 0.12, bw = W * 0.36, by = H * 0.84;
          for (let i = 0; i <= 42; i++) D.rect(ctx, bx + i * bw / 42, by, bw / 42 + 0.6, 9, { fill: CK.phColor(i / 42 * 14) });
          D.ring(ctx, bx + pH / 14 * bw, by + 4.5, 8, PL.col("text"), 2);
          D.text(ctx, "pH " + PL.fmt(pH, 1), bx + pH / 14 * bw, by - 10, { color: PL.col("text"), size: 10.5, align: "center" });
          D.text(ctx, "0(酸)", bx, by + 20, { color: PL.col("text-faint"), size: 9 });
          D.text(ctx, "14(鹼)", bx + bw, by + 20, { color: PL.col("text-faint"), size: 9, align: "right" });
          CK.meter(ctx, W * 0.56, H * 0.26, W * 0.30, 12, act / 100, { color: act > 55 ? "#66bb6a" : "#ef8829", label: "相對活性" });
          CK.panel(ctx, W * 0.56, H * 0.36, W * 0.36, H * 0.42, "狀態診斷");
          const st = denatured ? "形狀被破壞,冷卻也不復原" : T < 15 ? "低溫抑制:減速但可恢復" : act > 60 ? "接近最適條件:反應最快" : "偏離最適溫度或 pH:活性下降";
          [["酵素", enz.name], ["分布", enz.where], ["狀態", st]].forEach(([k2, d2], i) => {
            D.text(ctx, k2, W * 0.585, H * 0.455 + i * H * 0.095, { color: PL.col("text"), size: 11, weight: "700" });
            D.text(ctx, d2, W * 0.585, H * 0.455 + i * H * 0.095 + 13, { color: PL.col("text-dim"), size: 9.8 });
          });
          rAct.set(act, 0); rStatus.set(denatured ? "變性" : T < 15 ? "低溫抑制" : act > 60 ? "最適區" : "活性偏低");
          rOpt.set(enz.Topt + "°C / pH " + enz.pHopt); rTP.set(T + "°C・pH " + PL.fmt(pH, 1));
          vd.set(denatured ? "變性是不可逆破壞——降溫不會復活" : act < 20 ? "離最適值太遠,反應近乎停擺" : "活性正常,形狀完整", denatured ? "bad" : act < 20 ? "warn" : "ok");
        }
      });
      const enzSel = PL.ui.select(ui.L.controls, { label: "酵素", value: "saliva", options: Object.keys(ENZ).map(k => ({ value: k, label: ENZ[k].name })), onChange: () => { denatured = false; } });
      const tempS = PL.ui.slider(ui.L.controls, { label: "溫度", min: 0, max: 60, step: 1, value: 37, unit: "°C", digits: 0 });
      const phS = PL.ui.slider(ui.L.controls, { label: "pH", min: 0, max: 14, step: 0.5, value: 7, digits: 1 });
      PL.ui.note(ui.L.controls, "每種酵素都有最適溫度與最適 pH:偏離一側活性就掉;超過臨界溫度整個形狀垮掉,那叫變性,回不來。");
      PL.ui.procedure(ui.L.controls, { title: "分「抑制」與「變性」", steps: ["把唾液澱粉酶降到 5°C:活性掉到很低,再拉回 37°C 活性回來了嗎?",
        "拉到 52°C 以上:徽章變成「變性」,再拉回 37°C——活性回得來嗎?", "換胃蛋白酶,把 pH 拉到 7:放到中性反而沒活性。"],
        rule: "低溫只是分子動得慢,形狀還在;高溫與極端 pH 破壞的是形狀本身——冰過的酵素能復活,煮過的不能。" });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "胃裡的胃蛋白酶", apply: () => { enzSel.set("pepsin"); tempS.set(37); phS.set(2); denatured = false; ui.redraw(); } }, { label: "發燒 39°C", apply: () => { enzSel.set("saliva"); tempS.set(39); phS.set(7); denatured = false; ui.redraw(); } },
        { label: "煮沸(變性)", apply: () => { tempS.set(60); ui.redraw(); } }, { label: "重置(恢復活性)", apply: () => { enzSel.set("saliva"); tempS.set(37); phS.set(7); denatured = false; ui.redraw(); } }
      ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "判定" });
      const rAct = PL.ui.readout(ui.L.readouts, { label: "相對活性", unit: "%" }), rStatus = PL.ui.readout(ui.L.readouts, { label: "狀態" });
      const rOpt = PL.ui.readout(ui.L.readouts, { label: "最適條件" }), rTP = PL.ui.readout(ui.L.readouts, { label: "目前條件" });
      const chart = ui.chart("溫度-活性曲線", "鐘形曲線在臨界溫度直接斷崖歸零:那不是「變慢」,是變性;低溫端則是平滑下降、可恢復。紅虛線是變性溫度。");
      const drawChart = () => {
        const enz = ENZ[enzSel.get()], T = tempS.get(), fP = Math.exp(-Math.pow(phS.get() - enz.pHopt, 2) / 2.9);
        const at = Tv => (Tv >= enz.Tden ? 0 : 100 * Math.exp(-Math.pow(Tv - enz.Topt, 2) / 162) * fP);
        CK.plot(chart, { x0: 0, x1: 60, y0: 0, y1: 100, xticks: [10, 20, 30, 40, 50], yticks: [25, 50, 75], xlabel: "溫度 (°C)", ylabel: "相對活性 (%)",
          series: [{ fn: at, color: PL.col("accent") }],
          marks: [{ dot: [T, at(T)], color: PL.col("accent-2"), label: "目前" }, { vline: enz.Tden, color: "#c0392b", label: "變性" }] });
      };
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 光合作用總覽 */
  PL.register("photosynthesis-overview", {
    build(root) {
      let sugar = 0;
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const L = lightS.get(), C = co2S.get();
          const fL = 1 - Math.exp(-L / 28), fC = C / (C + 0.28);
          const rate = 90 * fL * fC;                        // 相對光合速率(= O₂ 氣泡/分)
          const lim = fL < fC ? "光照" : "CO₂";
          sugar = Math.min(999, sugar + rate * dt * 0.012);
          // 太陽與光線
          const sx = W * 0.09, sy = H * 0.15;
          D.disc(ctx, sx, sy, 13, { fill: L > 2 ? "#ffe082" : "#8a94a3", glow: "rgba(255,224,130," + L / 100 * 0.9 + ")", glowSize: 20 + L * 0.9 });
          for (let i = 0; i < 5; i++) {
            const a = 0.5 + i * 0.32;
            D.line(ctx, sx + Math.cos(a) * 20, sy + Math.sin(a) * 20, sx + Math.cos(a) * (26 + L * 0.42), sy + Math.sin(a) * (26 + L * 0.42), "rgba(255,224,130," + (0.15 + L / 100 * 0.8) + ")", 2, [4, 3]);
          }
          D.text(ctx, "光照 " + PL.fmt(L, 0) + "%", sx, sy - 22, { color: PL.col("text-dim"), size: 10, align: "center" });
          // 葉綠體:光反應 + 碳反應的廠房
          const cx = W * 0.34, cy = H * 0.50, cr = H * 0.17;
          CK.chloroplast(ctx, cx, cy, cr, { time: t, excited: L > 15 && rate > 8 });
          D.text(ctx, "葉綠體:光反應(囊膜)+ 碳反應(基質)", cx, cy + cr + 16, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          // 原料:H₂O 與 CO₂;產物:O₂ 氣泡與葡萄糖
          CK.moleculeByName(ctx, W * 0.09, H * 0.42, "H2O", 9); CK.moleculeByName(ctx, W * 0.09, H * 0.56, "H2O", 9);
          CK.arrow(ctx, W * 0.12, H * 0.49, cx - cr * 1.25, cy, "#4fc3f7", "6H₂O");
          const nC = clamp(Math.round(C * 4), 1, 4);
          for (let i = 0; i < nC; i++) CK.moleculeByName(ctx, W * 0.16 + i * 32, H * 0.12, "CO2", 7);
          CK.arrow(ctx, W * 0.26, H * 0.16, cx - cr * 0.4, cy - cr * 0.95, "#b0bec5", "6CO₂");
          const nB = clamp(Math.round(rate / 7), 0, 13);
          for (let i = 0; i < nB; i++) {
            const p = ((t * (0.10 + rate * 0.004) + rnd(i) * 2) % 1 + 1) % 1;
            D.disc(ctx, cx + cr * 1.5 + Math.sin(t * 2 + i) * 6, lerp(cy, H * 0.10, p), 2.6 + rnd(i + 9) * 2, { fill: "rgba(180,240,255,0.9)", stroke: "rgba(110,180,210,0.8)", width: 1 });
          }
          CK.moleculeByName(ctx, W * 0.80, H * 0.34, "O2", 8);
          CK.arrow(ctx, cx + cr * 1.15, cy - 8, W * 0.76, H * 0.34, "#4dd0e1", "6O₂");
          CK.moleculeByName(ctx, W * 0.70, H * 0.76, "glucose", 10);
          CK.arrow(ctx, cx + cr * 0.6, cy + cr * 0.95, W * 0.68, H * 0.76, "#a5d6a7", "C₆H₁₂O₆");
          CK.counter(ctx, W * 0.80, H * 0.60, W * 0.14, Math.min(45, Math.round(sugar)), { color: "#81c784", r: 3.4 });
          D.text(ctx, "葡萄糖累積(點陣)", W * 0.87, H * 0.70, { color: PL.col("text-faint"), size: 9, align: "center" });
          D.text(ctx, "6CO₂ + 6H₂O ─光能→ C₆H₁₂O₆ + 6O₂", W * 0.50, H * 0.92, { color: PL.col("text"), size: 12, align: "center", weight: "700" });
          CK.panel(ctx, W * 0.60, H * 0.14, W * 0.36, H * 0.24, "兩個階段");
          D.text(ctx, "光反應:囊膜上,H₂O → O₂ + ATP + NADPH", W * 0.62, H * 0.235, { color: PL.col("text-dim"), size: 10 });
          D.text(ctx, "碳反應:基質中,CO₂ → 葡萄糖(用 ATP、NADPH)", W * 0.62, H * 0.30, { color: PL.col("text-dim"), size: 10 });
          rRate.set(rate / 90 * 100, 0); rO2.set(rate, 0); rSugar.set(sugar, 1); rLim.set("最弱因子:" + lim);
          vd.set(L < 3 ? "夜間:光反應停止,碳反應也停" : fL < fC ? "限制因子是光照:再加 CO₂ 沒用" : "限制因子是 CO₂:再加光幫助有限", L < 3 ? "warn" : "info");
        }
      });
      const lightS = PL.ui.slider(ui.L.controls, { label: "光照強度", min: 0, max: 100, step: 5, value: 60, unit: "%", digits: 0 });
      const co2S = PL.ui.slider(ui.L.controls, { label: "CO₂ 濃度", min: 0.05, max: 1, step: 0.05, value: 0.4, digits: 2 });
      PL.ui.note(ui.L.controls, "光合作用是一條生產線:光反應把光能換成 ATP 與 NADPH,碳反應再用它們把 CO₂ 拼成葡萄糖。釋出的氧來自水的裂解。");
      PL.ui.procedure(ui.L.controls, { title: "找出限制因子", steps: ["固定 CO₂ 0.4,把光照 0→100%:速率何時開始變平?",
        "在變平處把 CO₂ 拉到 1:速率回升,代表限制因子換人了。", "把光照歸零:整條生產線停擺——光反應是總開關。"],
        rule: "氧不是從 CO₂ 來的,是把 H₂O 拆開時放出來的;同位素追蹤實驗驗證了這件事。" });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "正午晴天", apply: () => { lightS.set(95); co2S.set(0.45); ui.redraw(); } }, { label: "夜間", apply: () => { lightS.set(0); co2S.set(0.4); ui.redraw(); } },
        { label: "溫室補 CO₂", apply: () => { lightS.set(70); co2S.set(1); ui.redraw(); } }
      ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "限制因子" });
      const rRate = PL.ui.readout(ui.L.readouts, { label: "光合速率", unit: "%" }), rO2 = PL.ui.readout(ui.L.readouts, { label: "O₂ 釋出", unit: "個/分" });
      const rSugar = PL.ui.readout(ui.L.readouts, { label: "葡萄糖累積", unit: "mg" }), rLim = PL.ui.readout(ui.L.readouts, { label: "判讀" });
      const chart = ui.chart("光照-光合速率曲線", "先陡後平:高原區表示光已足夠,想再快得加 CO₂ 或調溫度。橘點為目前狀態。");
      const drawChart = () => {
        const fC = co2S.get() / (co2S.get() + 0.28), Lv = lightS.get();
        CK.plot(chart, { x0: 0, x1: 100, y0: 0, y1: 90, xticks: [20, 40, 60, 80], yticks: [20, 40, 60, 80], xlabel: "光照強度 (%)", ylabel: "光合速率 (相對)",
          series: [{ fn: x => 90 * (1 - Math.exp(-x / 28)) * fC, color: "#66bb6a" }],
          marks: [{ dot: [Lv, 90 * (1 - Math.exp(-Lv / 28)) * fC], color: PL.col("accent-2"), label: "目前" }] });
      };
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 光反應與電子傳遞鏈 */
  PL.register("light-reaction", {
    build(root) {
      const LIGHTS = {
        red: { label: "紅光 660nm", color: "#ff8a80", eff: 0.85 }, blue: { label: "藍光 450nm", color: "#82b1ff", eff: 1.0 },
        green: { label: "綠光 530nm", color: "#81c784", eff: 0.15 }
      };
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const L = lightS.get(), key = colorSel.get(), lc = LIGHTS[key];
          const rate = L * lc.eff;                          // 電子傳遞相對速率 0–100
          const atp = rate * 0.6, nadph = rate * 0.4, hplus = Math.round(rate * 0.35);
          const my = H * 0.44;
          D.text(ctx, "基質:等著收 ATP 與 NADPH", W * 0.28, my - 64, { color: PL.col("text-faint"), size: 10, align: "center" });
          D.rect(ctx, W * 0.05, my, W * 0.66, 20, { fill: "rgba(184,152,112,0.35)", stroke: "rgba(140,110,70,0.9)", width: 1.6, r: 6 });
          D.text(ctx, "類囊體囊膜(下:囊腔)", W * 0.06, my + 32, { color: PL.col("text-faint"), size: 9.5 });
          const ps2 = W * 0.12, psi = W * 0.38, nadpX = W * 0.56;
          D.disc(ctx, ps2, my + 10, 14, { fill: "rgba(239,136,41,0.85)", stroke: "rgba(150,70,10,0.9)", width: 1.5 });
          D.disc(ctx, psi, my + 10, 14, { fill: "rgba(149,117,205,0.85)", stroke: "rgba(80,50,130,0.9)", width: 1.5 });
          D.line(ctx, ps2 + 14, my + 10, psi - 14, my + 10, "rgba(120,150,180,0.9)", 2.2);
          D.text(ctx, "光系統 II", ps2, my + 40, { color: PL.col("text-dim"), size: 10, align: "center" });
          D.text(ctx, "光系統 I", psi, my + 40, { color: PL.col("text-dim"), size: 10, align: "center" });
          D.text(ctx, "電子傳遞鏈", (ps2 + psi) / 2, my - 10, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          // 光子:顏色隨光色、亮度與顆數隨光照
          [ps2, psi].forEach((px, i) => {
            const nP = L > 50 ? 2 : L > 10 ? 1 : 0;
            for (let k = 0; k < nP; k++) {
              ctx.save(); ctx.globalAlpha = clamp(L / 100 * lc.eff * 1.5 - k * 0.35, 0, 1);
              D.arrow(ctx, px + 30 - k * 12, H * 0.10 + k * 16, px + 4, my - 2, lc.color, null);
              ctx.restore();
            }
          });
          D.text(ctx, lc.label + "・葉綠素吸收效率 " + PL.fmt(lc.eff * 100, 0) + "%", W * 0.32, H * 0.06, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          // 水裂解:電子的來源
          CK.moleculeByName(ctx, W * 0.045, my + 58, "H2O", 6);
          CK.arrow(ctx, W * 0.07, my + 58, ps2 - 8, my + 24, "#4fc3f7", "裂解:½O₂+2H⁺");
          // 電子黃點沿膜移動,顆數與速度隨速率
          const nE = clamp(Math.round(rate / 16), 0, 5);
          for (let i = 0; i < nE; i++) {
            const p = ((t * (0.10 + rate * 0.004) + i / 5) % 1 + 1) % 1;
            D.disc(ctx, lerp(ps2 + 14, nadpX, p), my + 10 + Math.sin(p * TAU) * 4, 3.4, { fill: "#ffee58", glow: "rgba(255,238,88,0.85)", glowSize: 8 });
          }
          CK.badge(ctx, nadpX + 52, my + 10, "終點:NADPH", "#7e57c2");
          // ATP 合成酶:H⁺ 由囊腔回流基質,轉出 ATP
          const atpX = W * 0.47;
          D.rect(ctx, atpX - 5, my + 16, 10, 30, { fill: "rgba(120,150,180,0.9)", r: 3 });
          ctx.save();
          ctx.translate(atpX, my + 8);
          ctx.rotate(t * (0.3 + rate * 0.02));
          ctx.beginPath(); ctx.ellipse(0, 0, 14, 8, 0, 0, TAU);
          ctx.fillStyle = "rgba(102,187,106,0.92)"; ctx.fill(); ctx.restore();
          D.text(ctx, "ATP 合成酶", atpX, my + 58, { color: PL.col("text-dim"), size: 10, align: "center" });
          CK.counter(ctx, W * 0.08, my + 92, W * 0.30, hplus, { color: "#4fc3f7", r: 3.4 });
          D.text(ctx, "囊腔累積 H⁺:濃度梯度是推動合成酶的水位差", W * 0.23, my + 74, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          CK.badge(ctx, atpX + 12, my + 92, "ADP+Pi → ATP", "#43a047");
          CK.panel(ctx, W * 0.74, H * 0.12, W * 0.23, H * 0.56, "光反應記帳");
          [["原料", "H₂O、光、ADP、NADP⁺"], ["產品", "ATP、NADPH、O₂(副產品)"], ["關鍵", "H⁺ 梯度→ATP;電子末端→NADPH"], ["去向", "兩者都送進碳反應(基質)"]].forEach(([k2, d2], i) => {
            D.text(ctx, k2, W * 0.755, H * 0.21 + i * H * 0.115, { color: PL.col("text"), size: 11, weight: "700" });
            D.text(ctx, d2, W * 0.755, H * 0.21 + i * H * 0.115 + 13, { color: PL.col("text-dim"), size: 9.6 });
          });
          rE.set(rate, 0); rATP.set(atp, 0); rNADP.set(nadph, 0); rH.set(hplus, 0);
          vd.set(L < 3 ? "沒有光:電子不動,ATP 與 NADPH 歸零" : key === "green" ? "綠光幾乎不被吸收、直接反射——葉子才呈綠色" : "光能充足:質子梯度建立,ATP 穩定輸出", L < 3 ? "warn" : key === "green" ? "bad" : "ok");
        }
      });
      const colorSel = PL.ui.select(ui.L.controls, { label: "光色", value: "red", options: [{ value: "red", label: "紅光 660nm" }, { value: "blue", label: "藍光 450nm" }, { value: "green", label: "綠光 530nm" }] });
      const lightS = PL.ui.slider(ui.L.controls, { label: "光照強度", min: 0, max: 100, step: 5, value: 60, unit: "%", digits: 0 });
      PL.ui.note(ui.L.controls, "把光反應想成接力賽:水在光系統 II 交出電子,電子沿傳遞鏈跑到光系統 I 再被補充能量,最後交給 NADP⁺;沿途把 H⁺ 泵進囊腔,梯度推動 ATP 合成酶。");
      PL.ui.procedure(ui.L.controls, { title: "追蹤一顆電子", steps: ["60% 藍光下,數囊腔裡的 H⁺ 點陣並記下 ATP 產率。",
        "把光色換成綠光:效率只剩 15%,H⁺ 與 ATP 讀數一起跳水。", "光照歸零再拉回:電子流重啟——光才是這條線的電源。"],
        rule: "光反應不產葡萄糖——它只生產 ATP 與 NADPH;葡萄糖是碳反應用這兩筆「現金」拼出來的。" });
      const vd = PL.ui.verdict(ui.L.controls, { label: "判定" });
      const rE = PL.ui.readout(ui.L.readouts, { label: "電子流", unit: "相對" }), rATP = PL.ui.readout(ui.L.readouts, { label: "ATP 產率", unit: "單位/分" });
      const rNADP = PL.ui.readout(ui.L.readouts, { label: "NADPH 產率", unit: "單位/分" }), rH = PL.ui.readout(ui.L.readouts, { label: "囊腔 H⁺", unit: "個" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 卡爾文循環與 CO₂ 固定 */
  PL.register("calvin-cycle", {
    build(root) {
      let accG = 0;
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const C = co2S.get(), L = lightS.get();
          const rate = 100 * Math.min(C / 100, L / 100);    // 瓶頸:兩個供應取較小的
          const turns = rate / 10, limTxt = C / 100 < L / 100 ? "CO₂ 供應" : "光反應供能";
          accG = Math.min(999, accG + turns * dt * 0.008);
          const cx = W * 0.30, cy = H * 0.46, r = H * 0.20;
          D.ring(ctx, cx, cy, r, "rgba(140,170,140,0.7)", 2, [6, 5]);
          [{ a: -Math.PI / 2, t1: "① CO₂ 固定", t2: "RuBisCO" }, { a: Math.PI / 6, t1: "② 還原", t2: "用 ATP+NADPH" }, { a: Math.PI * 5 / 6, t1: "③ 再生 RuBP", t2: "用 ATP" }].forEach(nd => {
            const nx = cx + Math.cos(nd.a) * r, ny = cy + Math.sin(nd.a) * r;
            D.disc(ctx, nx, ny, 16, { fill: "rgba(102,187,106,0.30)", stroke: "rgba(46,125,50,0.9)", width: 1.6 });
            D.text(ctx, nd.t1, nx, ny - 24, { color: PL.col("text"), size: 10.5, align: "center", weight: "700" });
            D.text(ctx, nd.t2, nx, ny + 32, { color: PL.col("text-faint"), size: 9, align: "center" });
          });
          // 循環中的三碳分子:顆數與角速度隨速率
          const nM = clamp(Math.round(rate / 9), 0, 11);
          for (let i = 0; i < nM; i++) {
            const a = i * TAU / Math.max(1, nM) + t * (0.1 + rate * 0.008);
            D.disc(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 4.6, { fill: "#81c784", stroke: "rgba(30,90,40,0.8)", width: 1 });
          }
          D.text(ctx, "每轉一圈固定 1 個 CO₂", cx, cy - 4, { color: PL.col("text"), size: 11, align: "center", weight: "700" });
          D.text(ctx, "3 轉 → 1 個三碳醣", cx, cy + 14, { color: PL.col("text-dim"), size: 10, align: "center" });
          // 進出物流
          if (C > 3) CK.arrow(ctx, cx, H * 0.09, cx, cy - r - 18, "#b0bec5", "CO₂ 進");
          if (L > 3) CK.arrow(ctx, W * 0.58, cy + r * 0.75, cx + r + 18, cy + r * 0.5, "#ffcc80", "ATP+NADPH 進");
          CK.arrow(ctx, cx - r - 18, cy + r * 0.5, W * 0.05, cy + r * 0.75, "#a5d6a7", "三碳醣 → 葡萄糖");
          D.line(ctx, W * 0.56, cy + r * 1.0, cx + r * 0.72, cy + r * 0.66, PL.col("text-faint"), 1.4, [4, 4]);
          D.text(ctx, "ADP、NADP⁺ 送回光反應", W * 0.60, cy + r * 1.18, { color: PL.col("text-faint"), size: 9.5 });
          if (rate < 35) CK.badge(ctx, cx, cy + r + 46, "卡在:" + limTxt, "#ef8829");
          CK.panel(ctx, W * 0.66, H * 0.12, W * 0.30, H * 0.58, "循環記帳");
          [["每輪", "固定 1 CO₂,耗 3 ATP + 2 NADPH"], ["每 3 輪", "淨得 1 個三碳醣(G3P)"], ["每 6 輪", "1 葡萄糖:18 ATP + 12 NADPH"], ["RuBisCO", "全世界含量最高的酵素"]].forEach(([k2, d2], i) => {
            D.text(ctx, k2, W * 0.68, H * 0.22 + i * H * 0.115, { color: PL.col("text"), size: 11, weight: "700" });
            D.text(ctx, d2, W * 0.68, H * 0.22 + i * H * 0.115 + 13, { color: PL.col("text-dim"), size: 9.6 });
          });
          rT.set(turns, 1); rG3P.set(turns / 3, 2); rAcc.set(Math.floor(accG), 0); rLim.set(limTxt);
          vd.set(rate < 35 ? "瓶頸在「" + limTxt + "」:單獨加另一個不會變快" : "兩個供應都充足,循環全速運轉", rate < 35 ? "warn" : "ok");
        }
      });
      const co2S = PL.ui.slider(ui.L.controls, { label: "CO₂ 供應", min: 0, max: 100, step: 5, value: 60, unit: "%", digits: 0 });
      const lightS = PL.ui.slider(ui.L.controls, { label: "光反應供能(ATP/NADPH)", min: 0, max: 100, step: 5, value: 60, unit: "%", digits: 0 });
      PL.ui.note(ui.L.controls, "碳反應不是直線而是一個迴圈:CO₂ 進來、三碳醣出去,大部分中間產物用來再生 RuBP,只有 1/6 拿去合成葡萄糖。");
      PL.ui.procedure(ui.L.controls, { title: "找出瓶頸", steps: ["固定光反應供能 100%,拉 CO₂:速率什麼時候封頂?",
        "反過來固定 CO₂ 100%,把光反應供能拉低:曲線被誰壓住?", "兩個都設 50%:速率只由較小的那個決定——這叫限制因子。"],
        rule: "「暗反應」不是只能在黑暗進行——它不需要光子,但需要光反應剛生產的 ATP 與 NADPH;長期黑暗一樣停擺。" });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "正午全開", apply: () => { co2S.set(100); lightS.set(100); ui.redraw(); } }, { label: "乾旱氣孔關閉", apply: () => { co2S.set(15); lightS.set(90); ui.redraw(); } },
        { label: "傍晚光弱", apply: () => { co2S.set(80); lightS.set(30); ui.redraw(); } }
      ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "判定" });
      const rT = PL.ui.readout(ui.L.readouts, { label: "循環輪速", unit: "輪/分" }), rG3P = PL.ui.readout(ui.L.readouts, { label: "三碳醣產率", unit: "個/分" });
      const rAcc = PL.ui.readout(ui.L.readouts, { label: "葡萄糖累積", unit: "分子" }), rLim = PL.ui.readout(ui.L.readouts, { label: "瓶頸因子" });
      const chart = ui.chart("CO₂ 供應與循環速率", "綠線是光能充足、橘虛線是光能只有 40%:光弱時曲線提早變平——加 CO₂ 沒用,瓶頸在光反應。橘點為目前狀態。");
      const drawChart = () => {
        const Lv = lightS.get(), C = co2S.get();
        CK.plot(chart, { x0: 0, x1: 100, y0: 0, y1: 100, xticks: [20, 40, 60, 80], yticks: [25, 50, 75], xlabel: "CO₂ 供應 (%)", ylabel: "循環速率 (相對)",
          series: [{ fn: x => 100 * Math.min(x / 100, 1), color: "#66bb6a" }, { fn: x => 100 * Math.min(x / 100, 0.4), color: "#ffb74d", dash: [5, 4] }],
          marks: [{ dot: [C, 100 * Math.min(C / 100, Lv / 100)], color: PL.col("accent-2"), label: "目前" }] });
      };
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 細胞呼吸與 ATP */
  PL.register("respiration-overview", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const glu = gluS.get(), O2 = o2S.get();
          const o2f = clamp(O2 / 21, 0, 1);
          const apg = 2 + 28 * o2f;                          // 每葡萄糖 ATP:無氧只剩糖解的 2
          const gf = 3 * glu / 100;                          // 葡萄糖流量(個/分)
          const atpR = gf * apg, co2R = gf * 6 * clamp(O2 / 8, 0, 1), o2R = gf * 6 * o2f;
          // 細胞(虛線)與粒線體
          const cx = W * 0.28, cy = H * 0.36, r = H * 0.225;
          ctx.save();
          ctx.setLineDash([7, 5]);
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU);
          ctx.strokeStyle = "rgba(90,120,150,0.9)"; ctx.lineWidth = 1.8; ctx.stroke();
          ctx.restore();
          D.text(ctx, "細胞(糖解在細胞質)", cx, cy + r + 16, { color: PL.col("text-dim"), size: 10, align: "center" });
          CK.mitochondrion(ctx, cx, cy, H * 0.082, {});
          D.text(ctx, "粒線體:檸檬酸循環 + 電子傳遞鏈", cx, cy + H * 0.125, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          // 葡萄糖流入
          const nG = clamp(Math.round(glu / 15), 0, 7);
          for (let i = 0; i < nG; i++) {
            const p = ((t * 0.12 + i / 7) % 1 + 1) % 1;
            ctx.save(); ctx.globalAlpha = 1 - p * 0.5;
            CK.moleculeByName(ctx, lerp(W * 0.05, cx - r * 0.5, p), cy - r * 0.55 + Math.sin(t * 2 + i) * 5, "glucose", 6);
            ctx.restore();
          }
          D.text(ctx, "葡萄糖 " + PL.fmt(gf, 1) + " 個/分", W * 0.10, cy - r - 8, { color: PL.col("text-dim"), size: 10 });
          // O₂ 進、CO₂ 出
          ctx.save(); ctx.globalAlpha = 0.25 + o2f * 0.75;
          CK.moleculeByName(ctx, W * 0.50, H * 0.13, "O2", 7);
          CK.arrow(ctx, W * 0.49, H * 0.17, cx + r * 0.5, cy - r * 0.65, "#4dd0e1", "O₂(最終電子接受者)");
          ctx.restore();
          if (co2R > 0.3) CK.arrow(ctx, cx + r * 0.55, cy + r * 0.6, W * 0.50, H * 0.58, "#b0bec5", "6CO₂ + 6H₂O");
          // ATP 點陣
          CK.counter(ctx, W * 0.60, H * 0.28, W * 0.30, Math.min(40, Math.round(atpR / 2.5)), { color: "#ef8829", r: 4 });
          D.text(ctx, "ATP 產出(每點 ≈ 2.5 ATP)", W * 0.75, H * 0.325, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          // 三階段流程條
          [["糖解", "細胞質・+2 ATP", glu / 100], ["檸檬酸循環", "基質・+2 ATP", o2f * glu / 100], ["電子傳遞鏈", "內膜・+26 ATP", o2f * glu / 100]].forEach((st, i) => {
            const bx = W * 0.05 + i * W * 0.185;
            D.rect(ctx, bx, H * 0.74, W * 0.155, H * 0.14, { fill: "rgba(239,136,41," + (0.10 + st[2] * 0.5) + ")", stroke: "rgba(160,90,20,0.85)", width: 1.4, r: 7 });
            D.text(ctx, st[0], bx + W * 0.0775, H * 0.775, { color: PL.col("text"), size: 10.5, align: "center", weight: "700" });
            D.text(ctx, st[1], bx + W * 0.0775, H * 0.805, { color: PL.col("text-dim"), size: 9.5, align: "center" });
            if (i < 2) CK.arrow(ctx, bx + W * 0.157, H * 0.81, bx + W * 0.183, H * 0.81, PL.col("text-faint"), null);
          });
          CK.panel(ctx, W * 0.60, H * 0.38, W * 0.36, H * 0.30, "能量帳");
          [["葡萄糖化學能", "100%"], ["轉存進 ATP", "約 34%"], ["其餘", "以熱散失(幫你保溫)"], ["氧的角色", "在鏈末端收電子,堵住就罷工"]].forEach(([k2, d2], i) => {
            D.text(ctx, k2, W * 0.62, H * 0.45 + i * 22, { color: PL.col("text-dim"), size: 10 });
            D.text(ctx, d2, W * 0.94, H * 0.45 + i * 22, { color: PL.col("text"), size: 10, align: "right" });
          });
          rATP.set(atpR, 1); rAPG.set(apg, 0); rO2.set(o2R, 1); rCO2.set(co2R, 1);
          vd.set(O2 === 0 ? "無氧:只剩糖解,每葡萄糖 2 ATP" : O2 < 21 ? "氧不足:電子傳遞鏈降速,ATP 打折" : "有氧全開:每葡萄糖約 30 ATP", O2 === 0 ? "bad" : O2 < 21 ? "warn" : "ok");
        }
      });
      const gluS = PL.ui.slider(ui.L.controls, { label: "葡萄糖供應", min: 0, max: 100, step: 5, value: 70, unit: "%", digits: 0 });
      const o2S = PL.ui.slider(ui.L.controls, { label: "氧氣濃度", min: 0, max: 100, step: 1, value: 21, unit: "%", digits: 0 });
      PL.ui.note(ui.L.controls, "呼吸作用不是在肺,而是在每一顆細胞裡:葡萄糖逐步氧化,能量先存進 ATP 再花用。氧只是站在電子傳遞鏈末端收尾的接受者。");
      PL.ui.procedure(ui.L.controls, { title: "看氧如何決定產能", steps: ["氧 21%、葡萄糖 100%:記下 ATP 產率與每葡萄糖 ATP。",
        "把氧拉到 0:後兩個階段熄燈,ATP 崩到每葡萄糖 2。", "把氧拉回 10%:讀數介在中間——鏈的速率跟著氧走。"],
        rule: "糖解不需要氧,所以缺氧時細胞不會立刻斷電;真正卡住的是「電子沒人收」的電子傳遞鏈。" });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "靜息細胞", apply: () => { gluS.set(40); o2S.set(21); ui.redraw(); } }, { label: "劇烈運動(缺氧)", apply: () => { gluS.set(100); o2S.set(8); ui.redraw(); } },
        { label: "完全缺氧", apply: () => { gluS.set(80); o2S.set(0); ui.redraw(); } }
      ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "判定" });
      const rATP = PL.ui.readout(ui.L.readouts, { label: "ATP 產率", unit: "ATP/分" }), rAPG = PL.ui.readout(ui.L.readouts, { label: "每葡萄糖 ATP", unit: "ATP" });
      const rO2 = PL.ui.readout(ui.L.readouts, { label: "O₂ 消耗", unit: "相對" }), rCO2 = PL.ui.readout(ui.L.readouts, { label: "CO₂ 釋出", unit: "相對" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 發酵作用:酒精與乳酸 */
  PL.register("fermentation", {
    build(root) {
      let accProd = 0, accCO2 = 0;
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const cell = cellSel.get(), sugar = sugarS.get(), O2 = o2S.get();
          const aerobic = O2 >= 5;
          const fermRate = aerobic ? 0 : (cell === "yeast" ? 6 : 8) * sugar / 100;   // 產物生成速率
          accProd = Math.min(100, accProd + (aerobic ? 0 : fermRate) * dt * 0.03);
          accCO2 = Math.min(80, accCO2 + (cell === "yeast" && !aerobic ? fermRate : 0) * dt * 0.02);
          // 左:酵母菌試管或肌肉纖維
          if (cell === "yeast") {
            const bx = W * 0.20, baseY = H * 0.86, bw = W * 0.10, bh = H * 0.42;
            CK.testTube(ctx, bx, baseY, bw, bh, 0.55, "#d7a86a");
            if (!aerobic) {
              const nB = clamp(Math.round(fermRate / 2.5), 0, 10);
              for (let i = 0; i < nB; i++) {
                const p = ((t * (0.18 + fermRate * 0.02) + rnd(i + 3)) % 1 + 1) % 1;
                D.disc(ctx, bx + Math.sin(t * 3 + i * 2) * bw * 0.22, lerp(baseY - 8, baseY - bh * 0.58, p), 1.8 + rnd(i + 11) * 2, { fill: "rgba(235,246,255,0.95)", stroke: "rgba(150,190,220,0.9)", width: 1 });
              }
            }
            // 套在管口的氣球:CO₂ 越多越脹
            ctx.save();
            ctx.beginPath(); ctx.ellipse(bx, baseY - bh - 14 - accCO2 * 0.25, 13 + accCO2 * 0.45, 10 + accCO2 * 0.28, 0, 0, TAU);
            ctx.fillStyle = "rgba(200,225,245,0.55)"; ctx.fill();
            ctx.strokeStyle = "rgba(110,150,185,0.95)"; ctx.lineWidth = 1.6; ctx.stroke();
            ctx.restore();
            D.text(ctx, "酵母菌 + 糖水", bx, baseY + 14, { color: PL.col("text-dim"), size: 10.5, align: "center" });
            CK.badge(ctx, bx + bw + 40, baseY - bh * 0.3, aerobic ? "行呼吸:無酒精" : "酒精 + CO₂", aerobic ? "#43a047" : "#ef8829");
          } else {
            const mx = W * 0.06, my = H * 0.28;
            for (let i = 0; i < 3; i++) {
              D.rect(ctx, mx, my + i * 30, W * 0.34, 18, { fill: "rgba(220,90,80," + (0.28 + (aerobic ? 0 : accProd / 100) * 0.35) + ")", stroke: "rgba(150,40,40,0.8)", width: 1.4, r: 9 });
              for (let k = 0; k < 9; k++) D.disc(ctx, mx + 14 + k * 15, my + i * 30 + 9, 2.2, { fill: "#ef8829" });
            }
            D.text(ctx, "肌肉細胞(缺氧就痠)", mx + W * 0.17, my + 96, { color: PL.col("text-dim"), size: 10.5, align: "center" });
            CK.badge(ctx, mx + W * 0.17, my - 16, aerobic ? "氧足:正常收縮" : "乳酸累積中", aerobic ? "#43a047" : "#e57373");
          }
          // 右:有氧 vs 發酵 對照
          CK.panel(ctx, W * 0.52, H * 0.12, W * 0.44, H * 0.56, "有氧 vs 發酵");
          D.text(ctx, "有氧呼吸:每葡萄糖 30 ATP", W * 0.55, H * 0.22, { color: PL.col("text"), size: 11, weight: "700" });
          CK.counter(ctx, W * 0.55, H * 0.265, W * 0.38, 30, { color: "#66bb6a", r: 3.4 });
          D.text(ctx, "發酵(只有糖解):每葡萄糖 2 ATP", W * 0.55, H * 0.39, { color: PL.col("text"), size: 11, weight: "700" });
          CK.counter(ctx, W * 0.55, H * 0.435, W * 0.38, 2, { color: "#ef8829", r: 3.4 });
          D.text(ctx, cell === "yeast" ? "產物:2 乙醇 + 2 CO₂(釀酒、麵包膨發)" : "產物:2 乳酸(優格、肌肉痠痛)", W * 0.55, H * 0.50, { color: PL.col("text-dim"), size: 10 });
          D.text(ctx, "發酵的任務:把 NADH 轉回 NAD⁺,讓糖解能繼續跑", W * 0.55, H * 0.56, { color: PL.col("text-dim"), size: 10 });
          rATP.set(aerobic ? 30 : 2, 0); rBub.set(cell === "yeast" ? fermRate : 0, 1);
          rProd.set(Math.round(accProd), 0); rPH.set(cell === "muscle" ? (aerobic ? 7.4 : 7.4 - accProd * 0.008) : null, 2);
          vd.set(aerobic ? "有氧:產能正常,發酵關閉" : "發酵中:ATP 效率只有 2/30,靠加快糖解補償", aerobic ? "ok" : "warn");
        }
      });
      const cellSel = PL.ui.select(ui.L.controls, { label: "材料", value: "yeast", options: [{ value: "yeast", label: "酵母菌(釀酒)" }, { value: "muscle", label: "肌肉細胞" }] });
      const sugarS = PL.ui.slider(ui.L.controls, { label: "糖分供應", min: 0, max: 100, step: 5, value: 70, unit: "%", digits: 0 });
      const o2S = PL.ui.slider(ui.L.controls, { label: "氧氣供應", min: 0, max: 20, step: 1, value: 0, unit: "%", digits: 0 });
      PL.ui.note(ui.L.controls, "缺氧時細胞只靠糖解賺 2 個 ATP,發酵本身不產能——它是把 NADH 轉回 NAD⁺ 的回收程序,讓糖解這台小機器不斷電。");
      PL.ui.procedure(ui.L.controls, { title: "比較兩種細胞的缺氧反應", steps: ["酵母菌 + 氧 0%:看氣泡與氣球脹大,產物是酒精與 CO₂。",
        "換肌肉細胞 + 氧 2%:乳酸累積,pH 讀數緩緩下降。", "把氧拉到 5% 以上:發酵關閉,每葡萄糖 ATP 跳回 30。"],
        rule: "發酵不等於「呼吸的劣質版」——它根本不做呼吸的後兩步;它存在的目的是回收 NAD⁺,附帶只賺到糖解的 2 個 ATP。" });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "釀酒(密封桶)", apply: () => { cellSel.set("yeast"); sugarS.set(80); o2S.set(0); ui.redraw(); } }, { label: "麵團膨發", apply: () => { cellSel.set("yeast"); sugarS.set(50); o2S.set(1); ui.redraw(); } },
        { label: "劇烈運動", apply: () => { cellSel.set("muscle"); sugarS.set(90); o2S.set(2); ui.redraw(); } }, { label: "恢復供氧", apply: () => { cellSel.set("muscle"); sugarS.set(70); o2S.set(20); ui.redraw(); } }
      ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "判定" });
      const rATP = PL.ui.readout(ui.L.readouts, { label: "每葡萄糖 ATP", unit: "ATP" }), rBub = PL.ui.readout(ui.L.readouts, { label: "CO₂ 氣泡", unit: "個/分" });
      const rProd = PL.ui.readout(ui.L.readouts, { label: "產物累積", unit: "相對" }), rPH = PL.ui.readout(ui.L.readouts, { label: "肌肉 pH" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 光合與呼吸的平衡 */
  PL.register("metabolism-balance", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const L = lightS.get(), T = tempS.get();
          const fTp = Math.exp(-Math.pow(T - 28, 2) / 180);
          const P = 100 * (1 - Math.exp(-L / 25)) * fTp;     // 光合速率
          const R = 12 * Math.pow(2, (T - 20) / 10);         // 呼吸速率(Q10 = 2)
          const net = P - R, Pmax = 100 * fTp;
          const Lc = R < Pmax ? -25 * Math.log(1 - R / Pmax) : null;   // 光補償點
          // 白天/夜間指示
          const sx = W * 0.10, sy = H * 0.14;
          if (L > 3) {
            D.disc(ctx, sx, sy, 12, { fill: "#ffe082", glow: "rgba(255,224,130," + L / 100 * 0.9 + ")", glowSize: 18 + L * 0.8 });
            for (let i = 0; i < 4; i++) { const a = 0.6 + i * 0.5; D.line(ctx, sx + Math.cos(a) * 18, sy + Math.sin(a) * 18, sx + Math.cos(a) * 26, sy + Math.sin(a) * 26, "rgba(255,224,130,0.8)", 2); }
            D.text(ctx, "白天:光合 + 呼吸", sx, sy - 22, { color: PL.col("text-dim"), size: 10, align: "center" });
          } else {
            D.disc(ctx, sx, sy, 11, { fill: "#b8c4d0" });
            D.disc(ctx, sx + 5, sy - 3, 9, { fill: PL.theme.isLight() ? "#dfe7ee" : "#18202b" });
            D.text(ctx, "夜間:只剩呼吸", sx, sy - 22, { color: PL.col("text-dim"), size: 10, align: "center" });
          }
          // 燒杯與水蘊草
          const bx = W * 0.30, baseY = H * 0.86, bw = W * 0.24, bh = H * 0.60;
          const bk = CK.beaker(ctx, bx, baseY, bw, bh, 0.8);
          CK.waterWeed(ctx, bx, baseY - 4, bh * 0.5, { time: t });
          CK.thermometer(ctx, bx - bw * 0.44, H * 0.26, baseY - 4, (T - 5) / 35);
          D.text(ctx, T + " °C", bx - bw * 0.44, H * 0.22, { color: PL.col("text-dim"), size: 10, align: "center" });
          // 淨氣體交換:光合優勢冒 O₂ 氣泡
          if (net > 1) {
            const nB = clamp(Math.round(net / 7), 1, 12);
            for (let i = 0; i < nB; i++) {
              const p = ((t * (0.10 + net * 0.004) + rnd(i) * 2) % 1 + 1) % 1;
              D.disc(ctx, bx + bw * 0.08 + Math.sin(t * 2 + i * 1.7) * 7, lerp(baseY - 12, bk.waterY, p), 1.8 + rnd(i + 5) * 2, { fill: "rgba(180,240,255,0.95)", stroke: "rgba(110,180,210,0.85)", width: 1 });
            }
          }
          CK.arrow(ctx, bx + bw * 0.62, H * 0.42, bx + bw * 0.62, H * 0.20, net > 1 ? "#4dd0e1" : net < -1 ? "#90a4ae" : PL.col("text-faint"),
            net > 1 ? "淨釋 O₂" : net < -1 ? "淨釋 CO₂" : "淨交換 ≈ 0");
          CK.panel(ctx, W * 0.60, H * 0.12, W * 0.36, H * 0.54, "一天的能量帳");
          [["光合速率", PL.fmt(P, 0) + "(綠線)"], ["呼吸速率", PL.fmt(R, 0) + "(橘線)"], ["淨氣體交換", (net >= 0 ? "+" : "") + PL.fmt(net, 0)], ["光補償點", Lc == null ? "無法達到" : "光照約 " + PL.fmt(Lc, 1) + "%"]].forEach(([k2, d2], i) => {
            D.text(ctx, k2, W * 0.63, H * 0.21 + i * H * 0.11, { color: PL.col("text"), size: 11, weight: "700" });
            D.text(ctx, d2, W * 0.63, H * 0.21 + i * H * 0.11 + 14, { color: PL.col("text-dim"), size: 10 });
          });
          rP.set(P, 0); rR.set(R, 0); rNet.set(net, 0); rLc.set(Lc == null ? "—" : PL.fmt(Lc, 1));
          vd.set(Lc == null ? "此溫度下呼吸永遠大於光合:植物無法生存" : Math.abs(net) <= 2 ? "正好在光補償點:淨交換為零" : net > 0 ? "光合 > 呼吸:有剩餘,可以生長" : "呼吸 > 光合:正在燒庫存的澱粉", Lc == null ? "bad" : Math.abs(net) <= 2 ? "info" : net > 0 ? "ok" : "warn");
        }
      });
      const lightS = PL.ui.slider(ui.L.controls, { label: "光照強度", min: 0, max: 100, step: 1, value: 30, unit: "%", digits: 0 });
      const tempS = PL.ui.slider(ui.L.controls, { label: "溫度", min: 5, max: 40, step: 1, value: 22, unit: "°C", digits: 0 });
      PL.ui.note(ui.L.controls, "白天植物兩件事同時做:光合把 CO₂ 變醣,呼吸把醣燒成 ATP。哪一個比較強決定這株植物是賺是賠——交界處就是光補償點。");
      PL.ui.procedure(ui.L.controls, { title: "找到光補償點", steps: ["22°C 下把光照從 0 慢慢往上拉,找「淨氣體交換」由負轉正的位置。",
        "把溫度拉到 32°C:呼吸變快近一倍,補償點往哪邊跑?", "降到 10°C:呼吸變小,弱光也能活——這是耐陰植物的生存策略。"],
        rule: "補償點不是「光合停止」,而是「光合 = 呼吸」;長期低於補償點,植物在消耗昨天存的澱粉,遲早餓死。" });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "正午", apply: () => { lightS.set(90); tempS.set(28); ui.redraw(); } }, { label: "夜間", apply: () => { lightS.set(0); tempS.set(18); ui.redraw(); } },
        { label: "密林底層", apply: () => { lightS.set(6); tempS.set(24); ui.redraw(); } }, { label: "熱夜(呼吸暴衝)", apply: () => { lightS.set(0); tempS.set(36); ui.redraw(); } }
      ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "判定" });
      const rP = PL.ui.readout(ui.L.readouts, { label: "光合速率", unit: "相對" }), rR = PL.ui.readout(ui.L.readouts, { label: "呼吸速率", unit: "相對" });
      const rNet = PL.ui.readout(ui.L.readouts, { label: "淨氣體交換", unit: "相對" }), rLc = PL.ui.readout(ui.L.readouts, { label: "光補償點", unit: "% 光" });
      const chart = ui.chart("光合與呼吸的交會", "綠線(光合)從 0 起爬、橘線(呼吸)幾乎水平:交點就是光補償點;夜裡只剩橘線,植物純支出。橘點為目前光照。");
      const drawChart = () => {
        const T = tempS.get(), Lv = lightS.get();
        const fTp = Math.exp(-Math.pow(T - 28, 2) / 180), Rv = 12 * Math.pow(2, (T - 20) / 10);
        const Pm = 100 * fTp, Lc = Rv < Pm ? -25 * Math.log(1 - Rv / Pm) : null;
        const marks = [{ dot: [Lv, 100 * (1 - Math.exp(-Lv / 25)) * fTp], color: PL.col("accent-2"), label: "光合" }];
        if (Lc != null) marks.push({ vline: Lc, color: "#43a047", label: "補償點" });
        CK.plot(chart, { x0: 0, x1: 100, y0: 0, y1: 110, xticks: [20, 40, 60, 80], yticks: [25, 50, 75, 100], xlabel: "光照強度 (%)", ylabel: "速率 (相對)",
          series: [{ fn: x => 100 * (1 - Math.exp(-x / 25)) * fTp, color: "#66bb6a" }, { fn: () => Rv, color: "#ef8829" }],
          marks: marks });
      };
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });
})();
