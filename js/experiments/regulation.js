/* 模組七 · 神經與內分泌 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, CK = window.BioLab, D = PL.draw;
  const { clamp, lerp, TAU } = PL;

  /* 神經元的構造 */
  PL.register("neuron-structure", {
    build(root) {
      const ROLES = {
        sensory: { name: "感覺神經元", dir: "受器 → 中樞", job: "把皮膚、肌肉、內臟的訊息傳進中樞", tip: "細胞本體位於脊髓旁的背根神經節" },
        inter: { name: "聯絡神經元", dir: "中樞內整合", job: "在腦與脊髓中轉運、整合與決策", tip: "數量最多,構成中樞神經的處理網" },
        motor: { name: "運動神經元", dir: "中樞 → 動作器", job: "把中樞的指令送到肌肉與腺體", tip: "末梢接在神經肌肉接點(一種突觸)" }
      };
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const r = ROLES[roleSel.get()], health = myelinS.get();
          const y = H * 0.46;
          CK.panel(ctx, W * 0.05, H * 0.12, W * 0.55, H * 0.68, r.name + " · 構造示意");
          const ax = CK.neuron(ctx, W * 0.09, W * 0.50, y, { pulse: (t * 0.22) % 1.3 - 0.15 });
          D.text(ctx, "樹突(接收)", W * 0.13, y + H * 0.15, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          D.text(ctx, "細胞本體(整合)", ax.axonX1 + 6, y - H * 0.105, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          D.text(ctx, "軸突(輸出)", (ax.axonX1 + ax.axonX2) / 2, y - H * 0.13, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          D.text(ctx, "末梢→突觸", ax.axonX2 + W * 0.018, y - H * 0.10, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          // 髓鞘損傷覆蓋:沿用 kit 的節段公式,健康度以下畫紅色脫髓鞘區
          const nSeg = Math.max(3, Math.floor((ax.axonX2 - ax.axonX1) / 34));
          const keep = Math.round(health * nSeg);
          for (let i = keep; i < nSeg; i++) {
            const sx = ax.axonX1 + (ax.axonX2 - ax.axonX1) * (i + 0.12) / nSeg, sw = (ax.axonX2 - ax.axonX1) / nSeg * 0.72;
            D.rect(ctx, sx, y - 6.5, sw, 13, { fill: "rgba(150,50,50,0.6)", stroke: "rgba(220,90,90,0.95)", width: 1, r: 6 });
          }
          if (health < 0.95) D.text(ctx, "脫髓鞘區:衝動失去跳躍通道,只能連續慢行", W * 0.32, H * 0.72, { color: "#e57373", size: 11, align: "center" });
          CK.panel(ctx, W * 0.63, H * 0.12, W * 0.32, H * 0.68, "神經元檔案");
          D.text(ctx, r.name, W * 0.79, H * 0.22, { color: PL.col("accent"), size: 14, align: "center", weight: "700" });
          D.text(ctx, "訊息方向:" + r.dir, W * 0.79, H * 0.30, { color: PL.col("text-dim"), size: 11, align: "center" });
          D.text(ctx, "任務:" + r.job, W * 0.79, H * 0.37, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          D.text(ctx, r.tip, W * 0.79, H * 0.44, { color: PL.col("text-faint"), size: 10.5, align: "center" });
          const v = 1.5 + 118.5 * health;
          D.text(ctx, "傳導速度 " + PL.fmt(v, 1) + " m/s", W * 0.79, H * 0.54, { color: PL.col("text"), size: 12.5, align: "center", weight: "700" });
          CK.meter(ctx, W * 0.67, H * 0.60, W * 0.24, 9, health, { color: "#ffd54f", label: "髓鞘健康度" });
          D.text(ctx, health > 0.6 ? "跳躍式傳導(朗氏節間跳躍)" : "連續式傳導(全程慢速)", W * 0.79, H * 0.69, { color: health > 0.6 ? "#66bb6a" : "#e57373", size: 11, align: "center" });
          rSpeed.set(v, 1); rTime.set(1000 / v, 1); rMode.set(health > 0.6 ? "跳躍式" : "連續式"); rDir.set(r.dir);
          vd.set(health > 0.6 ? "髓鞘完整:以約 " + Math.round(v) + " m/s 跳躍前進" : health > 0.3 ? "髓鞘受損:傳導速度大幅下降" : "嚴重脫髓鞘(如多發性硬化症):傳導近乎失敗", health > 0.6 ? "ok" : health > 0.3 ? "warn" : "bad");
        }
      });
      const roleSel = PL.ui.select(ui.L.controls, { label: "神經元角色", value: "sensory", options: [
        { value: "sensory", label: "感覺神經元" }, { value: "inter", label: "聯絡神經元" }, { value: "motor", label: "運動神經元" } ] });
      const myelinS = PL.ui.slider(ui.L.controls, { label: "髓鞘健康度", min: 0.05, max: 1, step: 0.05, value: 1, digits: 2 });
      PL.ui.note(ui.L.controls, "髓鞘由許旺細胞纏繞軸突形成,節段之間的缺口就是朗氏節;衝動在節間跳躍,比無髓鞘纖維快上百倍。");
      PL.ui.procedure(ui.L.controls, {
        title: "從構造推傳導",
        steps: [
          "沿著神經元找出<b>樹突、本體、軸突、末梢</b>四段,確認訊息只往一個方向走。",
          "把髓鞘健康度調到 0.05,看紅色脫髓鞘區如何吃掉跳躍通道。",
          "對照讀數:健康時通過 1 m 約 8 ms,嚴重脫髓鞘要 600 ms 以上。"
        ],
        rule: "髓鞘讓速度變快,但「訊息方向」是突觸決定的:突觸只能由前膜傳向後膜,不可逆行。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "完整髓鞘", apply: () => myelinS.set(1) },
        { label: "局部脫髓鞘", apply: () => myelinS.set(0.5) },
        { label: "無髓鞘 C 纖維", apply: () => myelinS.set(0.05) }
      ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "傳導判定" });
      const rSpeed = PL.ui.readout(ui.L.readouts, { label: "傳導速度", unit: "m/s" });
      const rTime = PL.ui.readout(ui.L.readouts, { label: "通過 1 m 需時", unit: "ms" });
      const rMode = PL.ui.readout(ui.L.readouts, { label: "傳導方式" });
      const rDir = PL.ui.readout(ui.L.readouts, { label: "訊息方向" });
      const chart = ui.chart("髓鞘與傳導速度", "髓鞘健康度越高速度越快;健康度歸零只剩約 1.5 m/s 的連續傳導——差了近兩個數量級,這就是脫髓鞘疾病可怕的地方。");
      const drawChart = () => {
        CK.plot(chart, {
          x0: 0, x1: 1, y0: 0, y1: 130, xticks: [0.25, 0.5, 0.75], yticks: [30, 60, 90, 120], xlabel: "髓鞘健康度", ylabel: "傳導速度 (m/s)",
          series: [{ fn: h => 1.5 + 118.5 * h, color: PL.col("accent") }],
          marks: [{ dot: [myelinS.get(), 1.5 + 118.5 * myelinS.get()], color: PL.col("accent-2"), label: "目前" }]
        });
      };
      chart.onResize(drawChart); drawChart(); root.addEventListener("input", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 神經衝動與膜電位 */
  PL.register("action-potential", {
    build(root) {
      let ph = 0.22;
      // 全有全無模型:刺激達閾值才給完整波形;TTX 鎖 Na⁺ 通道、TEA 擋 K⁺ 通道
      const apV = (p, stim, drug) => {
        if (drug === "ttx" || stim < 0.3) return -70 + stim * (drug === "ttx" ? 4 : 9) * Math.exp(-Math.pow((p - 0.24) / 0.06, 2));
        if (p < 0.20) return -70;
        if (p < 0.35) return -70 + 100 * (1 - Math.cos(Math.PI * (p - 0.20) / 0.15)) / 2;
        const repEnd = drug === "tea" ? 0.85 : 0.60;
        if (p < repEnd) return 30 - 115 * (1 - Math.cos(Math.PI * (p - 0.35) / (repEnd - 0.35))) / 2;
        return -85 + 15 * (1 - Math.cos(Math.PI * (p - repEnd) / (1 - repEnd))) / 2;
      };
      const gates = (p, stim, drug) => {
        if (drug === "ttx" || stim < 0.3) return { na: 0, k: 0 };
        return { na: clamp(Math.sin(Math.PI * (p - 0.18) / 0.34), 0, 1), k: clamp(Math.sin(Math.PI * (p - 0.34) / 0.55), 0, 1) };
      };
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt) {
          ph = (ph + dt * 0.25) % 1;
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const stim = stimS.get(), drug = drugSel.get();
          const v = apV(ph, stim, drug), g = gates(ph, stim, drug);
          CK.panel(ctx, W * 0.05, H * 0.10, W * 0.52, H * 0.80, "細胞膜上的離子通道");
          D.rect(ctx, W * 0.08, H * 0.44, W * 0.46, 10, { fill: "rgba(150,170,190,0.5)", stroke: "rgba(100,120,140,0.9)", width: 1.2, r: 5 });
          D.text(ctx, "膜外(Na⁺ 多)", W * 0.10, H * 0.20, { color: PL.col("text-dim"), size: 10.5 });
          D.text(ctx, "膜內(K⁺ 多)", W * 0.10, H * 0.74, { color: PL.col("text-dim"), size: 10.5 });
          const ch = (cx, open, inword, label) => {
            D.rect(ctx, cx - 13, H * 0.44 - 18, 26, 46, { fill: "rgba(102,187,106," + (0.25 + open * 0.55) + ")", stroke: PL.col("border"), width: 1.2, r: 4 });
            D.line(ctx, cx - 8, H * 0.44 - 18 + open * 10, cx + 8, H * 0.44 - 18 + open * 10, "#2e7d32", 2.5);
            for (let i = 0; i < 3; i++) {
              const k = (ph * 6 + i * 0.33) % 1;
              if (open > 0.35) D.disc(ctx, cx, H * 0.44 - 32 + k * 64 * (inword ? 1 : -1), 3, { fill: inword ? "#5da8dd" : "#ef8829" });
            }
            D.text(ctx, label, cx, H * 0.44 + 44, { color: PL.col("text-dim"), size: 10, align: "center" });
          };
          ch(W * 0.22, g.na, true, "Na⁺ 通道(開 " + Math.round(g.na * 100) + "%)");
          ch(W * 0.38, g.k, false, "K⁺ 通道(開 " + Math.round(g.k * 100) + "%)");
          D.disc(ctx, W * 0.485, H * 0.44, 12, { fill: "rgba(239,136,41,0.5)", stroke: "rgba(170,100,10,0.9)", width: 1.4 });
          D.text(ctx, "鈉鉀幫浦(持續運作)", W * 0.485, H * 0.44 + 44, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          CK.arrow(ctx, W * 0.075, H * 0.86, W * (0.075 + 0.10 * stim), H * 0.86, PL.col("accent"), "刺激強度");
          CK.badge(ctx, W * 0.30, H * 0.16, "膜電位 " + PL.fmt(v, 1) + " mV", v > -50 ? "#e57373" : v > -60 ? "#ef8829" : PL.col("accent"));
          const stage = drug === "ttx" ? "Na⁺ 通道被封鎖" : stim < 0.3 ? (Math.abs(ph - 0.24) < 0.06 ? "局部電位(未達閾值)" : "靜息") : ph < 0.20 ? "靜息(−70 mV)" : ph < 0.35 ? "去極化:Na⁺ 內流" : ph < (drug === "tea" ? 0.85 : 0.60) ? "再極化:K⁺ 外流" : "過極化後恢復";
          rV.set(v, 1); rStage.set(stage); rNa.set(Math.round(g.na * 100), 0); rK.set(Math.round(g.k * 100), 0);
          vd.set(drug === "ttx" ? "河魨毒把 Na⁺ 通道鎖死:超過閾值也起不了去極化" : drug === "tea" ? "四乙胺擋住 K⁺ 通道:再極化拖長,落入不反應期" : stim < 0.3 ? "低於閾值:只有局部電位,不會產生動作電位" : "全有全無:動作電位以固定幅度出發,強度靠頻率編碼", drug === "ttx" ? "bad" : drug === "tea" || stim < 0.3 ? "warn" : "ok");
        }
      });
      const stimS = PL.ui.slider(ui.L.controls, { label: "刺激強度", min: 0, max: 1, step: 0.05, value: 0.6, digits: 2 });
      const drugSel = PL.ui.select(ui.L.controls, { label: "離子通道阻斷", value: "none", options: [
        { value: "none", label: "無" }, { value: "ttx", label: "河魨毒(TTX,阻 Na⁺)" }, { value: "tea", label: "四乙胺(TEA,阻 K⁺)" } ] });
      PL.ui.note(ui.L.controls, "靜息膜電位約 −70 mV:膜外 Na⁺ 多、膜內 K⁺ 多。刺激先開 Na⁺ 通道,達到閾值 −55 mV 就「全有全無」地爆發動作電位。");
      PL.ui.procedure(ui.L.controls, {
        title: "親手驗證全有全無",
        steps: [
          "把刺激強度拉到 0.2:看膜電位只小幅起伏,讀數停在 −70 附近。",
          "調過 0.3(閾值):膜電位衝上 +30 mV,Na⁺ 通道全開。",
          "比較刺激 0.3 與 0.9 的峰值:一樣都是 +30 mV——強度不改變振幅。",
          "加上河魨毒再給強刺激:去極化徹底消失。"
        ],
        rule: "動作電位「全有全無」:刺激再強也只到 +30 mV,神經靠發射頻率編碼強度,不靠振幅。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "閾下刺激", apply: () => stimS.set(0.15) },
        { label: "剛好達閾", apply: () => stimS.set(0.3) },
        { label: "強刺激", apply: () => stimS.set(0.9) }
      ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "膜電位判定" });
      const rV = PL.ui.readout(ui.L.readouts, { label: "膜電位", unit: "mV" });
      const rStage = PL.ui.readout(ui.L.readouts, { label: "目前階段" });
      const rNa = PL.ui.readout(ui.L.readouts, { label: "Na⁺ 通道開度", unit: "%" });
      const rK = PL.ui.readout(ui.L.readouts, { label: "K⁺ 通道開度", unit: "%" });
      const chart = ui.chart("動作電位曲線", "達到閾值 −55 mV 就全有全無地衝上 +30 mV;河魨毒讓曲線永遠起不來,四乙胺讓下降段拖成緩坡。");
      const drawChart = () => {
        const stim = stimS.get(), drug = drugSel.get(), pts = [];
        for (let i = 0; i <= 120; i++) { const tm = i / 120 * 6; pts.push([tm, apV(tm / 6, stim, drug)]); }
        CK.plot(chart, {
          x0: 0, x1: 6, y0: -95, y1: 45, xticks: [1, 2, 3, 4, 5], yticks: [-70, -55, 0, 30], xlabel: "時間 (ms)", ylabel: "膜電位 (mV)",
          series: [{ pts, color: PL.col("accent") }],
          marks: [{ hline: -55, color: "rgba(239,136,41,0.8)" }, { dot: [ph * 6, apV(ph, stim, drug)], color: PL.col("accent-2"), label: "現在" }]
        });
      };
      chart.onResize(drawChart); drawChart(); root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 突觸與神經傳遞物 */
  PL.register("synapse", {
    build(root) {
      const TOX = {
        none: { name: "無", note: "正常傳遞:釋放、結合、由酵素分解終止" },
        nerve: { name: "神經毒氣", note: "抑制乙醯膽鹼酶:傳遞物清不掉,肌肉持續收縮痙攣" },
        botox: { name: "肉毒桿菌毒素", note: "阻斷囊泡胞吐:傳遞物出不來,肌肉鬆弛無力" },
        curare: { name: "箭毒", note: "佔住受器:傳遞物進得來卻接不上,肌肉麻痺" }
      };
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const tox = toxSel.get(), x = TOX[tox];
          const enz = enzS.get() * (tox === "nerve" ? 0.05 : 1);
          const release = clamp((caS.get() - 0.15) / 0.85, 0, 1) * (tox === "botox" ? 0.05 : 1);
          const bound = release * (tox === "curare" ? 0.15 : 1);
          const leftover = release * (1 - 0.9 * enz);
          CK.panel(ctx, W * 0.05, H * 0.10, W * 0.55, H * 0.80, "突觸間隙放大:電訊 → 化學 → 電訊");
          const box = { x: W * 0.09, y: H * 0.16, w: W * 0.47, h: H * 0.62 };
          const geo = CK.synapseZoom(ctx, box, { release, bound });
          for (let i = 0; i < 3; i++) {
            const ex = W * (0.30 + i * 0.09), ey = geo.gapY + H * 0.055;
            D.disc(ctx, ex, ey, 7, { fill: enz > 0.4 ? "rgba(102,187,106,0.85)" : "rgba(150,80,80,0.5)", stroke: "rgba(60,110,60,0.9)", width: 1.2 });
            D.text(ctx, "酶", ex, ey + 3.5, { color: "#fff", size: 9, align: "center", weight: "700" });
          }
          D.text(ctx, "分解酵素活性 " + Math.round(enzS.get() * 100) + "%", W * 0.325, geo.gapY + H * 0.115, { color: PL.col("text-dim"), size: 10, align: "center" });
          const nl = Math.round(leftover * 9);
          for (let i = 0; i < nl; i++) {
            const jx = Math.sin(t * 2.2 + i * 2.1) * 5, jy = Math.cos(t * 1.7 + i * 1.3) * 4;
            D.disc(ctx, box.x + box.w * (0.30 + (i % 5) * 0.09) + jx, (geo.gapY + geo.postY) / 2 + jy, 2.8, { fill: "#ffd54f", glow: "#ffd54f", glowSize: 5 });
          }
          if (leftover > 0.3) D.text(ctx, "殘留傳遞物:訊號關不掉", box.x + box.w * 0.5, geo.postY - H * 0.05, { color: "#e57373", size: 11, align: "center" });
          CK.panel(ctx, W * 0.63, H * 0.12, W * 0.32, H * 0.76, "干擾因素:" + x.name);
          D.text(ctx, x.note, W * 0.79, H * 0.24, { color: PL.col("text-dim"), size: 11, align: "center" });
          const rows = [["Ca²⁺ 內流", Math.round(caS.get() * 100) + "%"], ["傳遞物釋放", Math.round(release * 100) + "%"], ["受器結合", Math.round(bound * 100) + "%"], ["間隙殘留", Math.round(leftover * 100) + "%"]];
          rows.forEach((row, i) => {
            D.text(ctx, row[0], W * 0.66, H * 0.36 + i * 26, { color: PL.col("text-dim"), size: 11 });
            D.text(ctx, row[1], W * 0.92, H * 0.36 + i * 26, { color: i === 3 && leftover > 0.3 ? "#e57373" : PL.col("text"), size: 11.5, align: "right" });
          });
          rRel.set(Math.round(release * 100), 0); rBound.set(Math.round(bound * 100), 0); rLeft.set(Math.round(leftover * 100), 0); rDur.set(2 / Math.max(0.05, enz), 1);
          vd.set(tox === "nerve" ? "神經毒氣:酵素被抑制 → 傳遞物堆積,肌肉痙攣、呼吸衰竭" : tox === "botox" ? "肉毒桿菌毒素:囊泡無法胞吐 → 肌肉鬆弛性麻痺" : tox === "curare" ? "箭毒:受器被佔據 → 訊號進不來,肌肉麻痺" : bound > 0.5 ? "正常傳遞:釋放、結合、分解,訊號乾淨利落" : "Ca²⁺ 不足:後膜受器沒接滿,可能不產生新訊號", tox === "none" ? (bound > 0.5 ? "ok" : "info") : "bad");
        }
      });
      const toxSel = PL.ui.select(ui.L.controls, { label: "干擾因素", value: "none", options: [
        { value: "none", label: "無(正常)" }, { value: "nerve", label: "神經毒氣" }, { value: "botox", label: "肉毒桿菌毒素" }, { value: "curare", label: "箭毒" }
      ] });
      const caS = PL.ui.slider(ui.L.controls, { label: "Ca²⁺ 內流", min: 0, max: 1, step: 0.05, value: 0.8, digits: 2 });
      const enzS = PL.ui.slider(ui.L.controls, { label: "酵素活性", min: 0.05, max: 1, step: 0.05, value: 1, digits: 2 });
      PL.ui.note(ui.L.controls, "突觸把電訊換成化學訊:Ca²⁺ 內流讓囊泡胞吐釋出傳遞物,與後膜受體專一性結合;酵素隨後分解傳遞物,訊號才會終止——每一步都能被藥物打斷。");
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "正常傳遞", apply: () => { toxSel.set("none"); caS.set(0.8); enzS.set(1); } }, { label: "神經毒氣中毒", apply: () => { toxSel.set("nerve"); caS.set(0.8); enzS.set(1); } },
        { label: "肉毒桿菌中毒", apply: () => { toxSel.set("botox"); caS.set(0.8); enzS.set(1); } } ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "突觸狀態" });
      const rRel = PL.ui.readout(ui.L.readouts, { label: "傳遞物釋放量", unit: "%" });
      const rBound = PL.ui.readout(ui.L.readouts, { label: "受器結合率", unit: "%" });
      const rLeft = PL.ui.readout(ui.L.readouts, { label: "間隙殘留量", unit: "%" });
      const rDur = PL.ui.readout(ui.L.readouts, { label: "訊號持續時間", unit: "ms" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 反射與反射弧 */
  PL.register("reflex-arc", {
    build(root) {
      const KIND = {
        knee: { name: "膝跳反射", rec: "受器:肌梭(股四頭肌)", mus: "股四頭肌", n: 2, syn: 1, base: 45, extra: 15, perc: 0 },
        hand: { name: "縮手反射", rec: "受器:皮膚痛覺受器", mus: "屈肌", n: 3, syn: 2, base: 140, extra: 30, perc: 400 }
      };
      const ui = CK.scaffold(root, {
        aspect: 0.62, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const kind = kindSel.get(), k = KIND[kind], stim = stimS.get();
          const fired = stim >= 0.12;
          const rt = k.base + (1 - stim) * k.extra;
          CK.panel(ctx, W * 0.04, H * 0.10, W * 0.92, H * 0.78, "脊髓反射弧 · " + k.name);
          D.rect(ctx, W * 0.44, H * 0.20, W * 0.18, H * 0.40, { fill: "rgba(190,180,210,0.25)", stroke: "rgba(120,110,150,0.9)", width: 1.6, r: 12 });
          D.text(ctx, "脊髓(反射中樞)", W * 0.53, H * 0.635, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          D.rect(ctx, W * 0.74, H * 0.13, W * 0.20, H * 0.11, { fill: PL.theme.shade(0.5), stroke: PL.col("border"), width: 1.2, r: 8 });
          D.text(ctx, "大腦(知覺,較慢)", W * 0.84, H * 0.19, { color: PL.col("text-dim"), size: 10, align: "center" });
          D.arrow(ctx, W * 0.60, H * 0.23, W * 0.74, H * 0.19, { color: PL.col("text-faint"), width: 1.6, dash: [5, 4], label: kind === "hand" ? "同時上傳" : "" });
          const y = H * 0.34, cyc = (t * 0.4) % 1.6;
          const sp = fired && cyc >= 0.05 && cyc <= 0.35 ? (cyc - 0.05) / 0.30 : -1;
          const mp = fired && cyc >= 0.50 && cyc <= 0.85 ? (cyc - 0.50) / 0.35 : -1;
          CK.neuron(ctx, W * 0.05, W * 0.46, y, { pulse: sp });
          CK.neuron(ctx, W * 0.54, W * 0.95, y, { pulse: mp });
          if (kind === "hand") {
            D.disc(ctx, W * 0.50, y, 8, { fill: "rgba(121,134,203,0.85)", stroke: "rgba(60,70,120,0.9)", width: 1.4 });
            D.text(ctx, "聯絡神經元", W * 0.50, y - 14, { color: PL.col("text-dim"), size: 9.5, align: "center" });
          }
          if (fired && cyc >= 0.36 && cyc <= 0.50) D.disc(ctx, kind === "hand" ? W * 0.50 : W * 0.52, y, 9, { fill: "rgba(255,213,79,0.5)", glow: "#ffd54f", glowSize: 14 });
          D.text(ctx, "突觸", kind === "hand" ? W * 0.50 : W * 0.52, y + 24, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          CK.arrow(ctx, W * 0.03, y - 34, W * (0.03 + 0.07 * stim), y - 34, PL.col("accent"), "刺激");
          D.disc(ctx, W * 0.06, y - 16, 6 + stim * 4, { fill: "#5da8dd", glow: "#5da8dd", glowSize: stim * 14 });
          D.text(ctx, k.rec, W * 0.085, y - 42, { color: PL.col("text-dim"), size: 10 });
          const bulge = fired && cyc > 0.85 ? Math.sin((cyc - 0.85) / 0.35 * Math.PI) * stim : 0;
          D.rect(ctx, W * 0.885, y - 18 - bulge * 10, W * 0.07, 36 + bulge * 20, { fill: "rgba(220,90,80,0.5)", stroke: "rgba(150,40,40,0.9)", width: 1.4, r: 6 });
          D.text(ctx, "動作器:" + k.mus, W * 0.92, y + 44, { color: PL.col("text-dim"), size: 10, align: "center" });
          const seq = ["① 受器", "② 感覺神經元", "③ 脊髓" + (kind === "hand" ? "+聯絡" : ""), "④ 運動神經元", "⑤ 動作器"];
          seq.forEach((s, i) => {
            D.text(ctx, s, W * (0.10 + i * 0.20), H * 0.82, { color: i === 2 ? PL.col("accent") : PL.col("text-dim"), size: 11, align: "center", weight: i === 2 ? "700" : "" });
            if (i < 4) D.arrow(ctx, W * (0.10 + i * 0.20) + W * 0.055, H * 0.82, W * (0.30 + i * 0.20) - W * 0.055, H * 0.82, { color: PL.col("text-faint"), width: 1.4 });
          });
          rN.set(k.n, 0); rSyn.set(k.syn, 0); rRT.set(fired ? rt : "未引發"); rPerc.set(fired ? rt + k.perc : "未引發");
          vd.set(!fired ? "刺激低於閾值:受器沒有產生動作電位,反射不發生" : kind === "knee" ? "單突觸反射:2 個神經元、1 個突觸,反應最快" : "多突觸反射:經聯絡神經元轉手,慢約 0.1 秒,但同時上傳大腦產生知覺", !fired ? "info" : kind === "knee" ? "ok" : "info");
        }
      });
      const kindSel = PL.ui.select(ui.L.controls, { label: "反射類型", value: "knee", options: [
        { value: "knee", label: "膝跳反射(單突觸)" }, { value: "hand", label: "縮手反射(多突觸)" } ] });
      const stimS = PL.ui.slider(ui.L.controls, { label: "刺激強度", min: 0, max: 1, step: 0.05, value: 0.6, digits: 2 });
      PL.ui.note(ui.L.controls, "反射不走大腦:感覺神經元把訊號送進脊髓,脊髓直接命令運動神經元,所以膝跳從敲擊到踢出只要約 50 毫秒。");
      PL.ui.procedure(ui.L.controls, {
        title: "比較兩種反射",
        steps: [
          "把刺激強度拉到 0.1 以下:確認閾值之下連反射都不發生。",
          "選膝跳反射:數一數神經元與突觸,記下反應時間。",
          "選縮手反射:多了聯絡神經元,注意右上方同時上傳大腦的虛線。",
          "比較讀數:動作永遠比知覺早——手已經縮回來,你才感覺到痛。"
        ],
        rule: "反射快,是因為路徑短、突觸少;知覺走的是另一條慢路,反射動作不等知覺。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "膝跳反射", apply: () => { kindSel.set("knee"); stimS.set(0.6); } },
        { label: "縮手反射", apply: () => { kindSel.set("hand"); stimS.set(0.8); } },
        { label: "微弱刺激", apply: () => stimS.set(0.08) }
      ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "反射判定" });
      const rN = PL.ui.readout(ui.L.readouts, { label: "參與神經元數" });
      const rSyn = PL.ui.readout(ui.L.readouts, { label: "突觸數" });
      const rRT = PL.ui.readout(ui.L.readouts, { label: "反應時間", unit: "ms" });
      const rPerc = PL.ui.readout(ui.L.readouts, { label: "知覺到達時間", unit: "ms" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 中樞神經:腦與脊髓 */
  PL.register("cns", {
    build(root) {
      const REG = {
        cortex: { name: "大腦皮質", job: "知覺、思考、語言與自主動作", w: "約 80%", dmg: "認知與精細動作喪失" },
        cereb: { name: "小腦", job: "平衡、姿勢與動作協調", w: "約 10%", dmg: "動作不協調(共濟失調)" },
        hypo: { name: "下視丘", job: "恆定總指揮:體溫、血糖、口渴與內分泌", w: "約 1%", dmg: "體溫與食慾失調" },
        stem: { name: "腦幹", job: "呼吸、心跳、血壓——生命中樞", w: "約 2%", dmg: "呼吸心跳停止,致命" },
        cord: { name: "脊髓", job: "上行下行傳導道,兼反射中樞", w: "延伸到腰部", dmg: "反射消失、損傷處以下癱瘓" }
      };
      const ui = CK.scaffold(root, {
        aspect: 0.60,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const key = regSel.get(), rg = REG[key], act = actS.get();
          const px = f => W * f, py = f => H * f;
          CK.panel(ctx, W * 0.04, H * 0.10, W * 0.56, H * 0.82, "腦與脊髓(正切面示意)");
          const blob = (cx, cy, rx, ry, on, extra) => {
            ctx.save(); ctx.globalAlpha = on ? 1 : 0.4;
            if (on && act > 0.15) D.disc(ctx, cx, cy, Math.max(rx, ry) + 6 + act * 10, { fill: "rgba(240,98,146," + act * 0.22 + ")", glow: "#f06292", glowSize: 18 * act });
            ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
            ctx.fillStyle = on ? "rgba(240,98,146,0.35)" : "rgba(160,150,175,0.22)";
            ctx.fill(); ctx.strokeStyle = on ? "rgba(150,60,90,0.95)" : "rgba(110,100,130,0.7)"; ctx.lineWidth = on ? 2 : 1.3; ctx.stroke();
            if (extra) { extra(); }
            ctx.restore();
          };
          blob(px(0.32), py(0.36), px(0.19), py(0.22), key === "cortex", () => {
            ctx.strokeStyle = "rgba(150,60,90,0.5)"; ctx.lineWidth = 1;
            for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(px(0.245 + i * 0.042), py(0.29 + (i % 2) * 0.09), px(0.028), 0.6, 2.5); ctx.stroke(); }
          });
          blob(px(0.44), py(0.58), px(0.075), py(0.075), key === "cereb", () => {
            for (let i = -1; i <= 1; i++) D.line(ctx, px(0.40), py(0.58) + i * py(0.024), px(0.48), py(0.58) + i * py(0.024), "rgba(150,60,90,0.5)", 1);
          });
          blob(px(0.33), py(0.475), px(0.030), py(0.032), key === "hypo");
          D.disc(ctx, px(0.33), py(0.53), 4.5, { fill: "rgba(240,98,146,0.6)", stroke: "rgba(150,60,90,0.8)", width: 1 });
          D.text(ctx, "腦垂腺", px(0.355), py(0.535), { color: PL.col("text-faint"), size: 9 });
          blob(px(0.385), py(0.62), px(0.028), py(0.10), key === "stem");
          D.line(ctx, px(0.40), py(0.72), px(0.40), py(0.88), key === "cord" ? "rgba(150,60,90,0.95)" : "rgba(110,100,130,0.7)", key === "cord" ? 7 : 4.5);
          if (key === "cord" && act > 0.15) D.disc(ctx, px(0.40), py(0.80), 10 + act * 8, { fill: "rgba(240,98,146," + act * 0.2 + ")", glow: "#f06292", glowSize: 16 * act });
          const tag = (label, x, yy, on) => D.text(ctx, label, x, yy, { color: on ? PL.col("accent") : PL.col("text-faint"), size: 11, weight: on ? "700" : "" });
          tag("大腦皮質", px(0.15), py(0.17), key === "cortex");
          tag("小腦", px(0.445), py(0.68), key === "cereb");
          tag("下視丘", px(0.245), py(0.44), key === "hypo");
          tag("腦幹", px(0.425), py(0.60), key === "stem");
          tag("脊髓", px(0.43), py(0.85), key === "cord");
          CK.panel(ctx, W * 0.62, H * 0.10, W * 0.33, H * 0.82, "腦區檔案");
          D.text(ctx, rg.name, W * 0.785, H * 0.20, { color: PL.col("accent"), size: 15, align: "center", weight: "700" });
          D.text(ctx, "任務:" + rg.job, W * 0.785, H * 0.29, { color: PL.col("text-dim"), size: 11, align: "center" });
          D.text(ctx, "占腦重量:" + rg.w, W * 0.785, H * 0.37, { color: PL.col("text-dim"), size: 11, align: "center" });
          D.text(ctx, "受損:" + rg.dmg, W * 0.785, H * 0.44, { color: key === "stem" ? "#e57373" : PL.col("text-faint"), size: 10.5, align: "center" });
          CK.meter(ctx, W * 0.66, H * 0.56, W * 0.25, 9, act, { color: "#f06292", label: "腦區活動量" });
          D.text(ctx, "活動時,該區血流與耗氧同步上升", W * 0.785, H * 0.62, { color: PL.col("text-faint"), size: 10, align: "center" });
          D.text(ctx, "腦只占體重 2%,卻消耗全身約 20% 的氧與葡萄糖", W * 0.785, H * 0.72, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          rName.set(rg.name); rJob.set(rg.job); rW.set(rg.w); rFlow.set(1 + act * 0.9, 2);
          vd.set(key === "stem" ? "腦幹受損即致命:呼吸心跳不受意志控制" : key === "hypo" ? "下視丘是神經與內分泌的總橋樑:直接控制腦垂腺" : key === "cortex" ? "皮質分區分工:額葉動作、頂葉感覺、枕葉視覺" : key === "cereb" ? "小腦比對「想做」與「做到」,即時修正動作" : "脊髓是高速公路兼地方裁判:反射在此先斬後奏", key === "stem" ? "warn" : "info");
        }
      });
      const regSel = PL.ui.select(ui.L.controls, { label: "腦區", value: "cortex", options: Object.keys(REG).map(k => ({ value: k, label: REG[k].name })) });
      const actS = PL.ui.slider(ui.L.controls, { label: "腦區活動量", min: 0, max: 1, step: 0.05, value: 0.5, digits: 2 });
      PL.ui.note(ui.L.controls, "腦分為大腦、小腦、間腦(含下視丘)與腦幹;脊髓是傳導通道兼反射中樞。各區分工,但彼此用神經纖維緊密連線。");
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "騎腳踏車(小腦)", apply: () => { regSel.set("cereb"); actS.set(0.85); } }, { label: "跑步中(腦幹)", apply: () => { regSel.set("stem"); actS.set(0.8); } },
        { label: "天熱想喝水(下視丘)", apply: () => { regSel.set("hypo"); actS.set(0.9); } } ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "功能重點" });
      const rName = PL.ui.readout(ui.L.readouts, { label: "腦區" });
      const rJob = PL.ui.readout(ui.L.readouts, { label: "核心任務" });
      const rW = PL.ui.readout(ui.L.readouts, { label: "占腦重量" });
      const rFlow = PL.ui.readout(ui.L.readouts, { label: "區域血流倍率", unit: "×" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 內分泌腺與荷爾蒙 */
  PL.register("endocrine-glands", {
    build(root) {
      const GL = {
        pit: { name: "腦垂腺", h: "生長激素等多種指示荷爾蒙", target: "骨骼、肌肉與其他內分泌腺", effect: "總指揮:受下視丘調控,指揮其他腺體", half: "約 20 分", pos: [0.28, 0.215], msg: "指揮官出錯,全身跟著錯" },
        thyroid: { name: "甲狀腺", h: "甲狀腺素", target: "幾乎全身細胞", effect: "提高基礎代謝率,促進發育", half: "約 7 天", pos: [0.28, 0.29], msg: "最長效的荷爾蒙:一次分泌,作用一週" },
        panc: { name: "胰島", h: "胰島素、升糖素", target: "肝臟與全身細胞", effect: "降血糖與升血糖,兩者拮抗", half: "約 5–10 分", pos: [0.265, 0.50], msg: "血糖的雙向開關,下一個實驗詳談" },
        adr: { name: "腎上腺", h: "腎上腺素", target: "心臟、血管、肝臟", effect: "應急:心跳加速、升血糖、瞳孔放大", half: "約 2 分", pos: [0.235, 0.415], msg: "戰或逃:幾秒內把全身調到備戰" },
        gon: { name: "性腺", h: "睪固酮、動情激素", target: "生殖器官與全身", effect: "促進第二性徵與生殖細胞成熟", half: "約 1 小時–數天", pos: [0.28, 0.62], msg: "青春期一啟動,就是好幾年的工程" }
      };
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const key = glSel.get(), g = GL[key], sec = secS.get();
          CK.panel(ctx, W * 0.06, H * 0.10, W * 0.44, H * 0.82, "人體內分泌腺(示意)");
          D.disc(ctx, W * 0.28, H * 0.16, H * 0.055, { fill: "rgba(150,170,200,0.25)", stroke: "rgba(110,130,160,0.8)", width: 1.4 });
          D.rect(ctx, W * 0.20, H * 0.225, W * 0.16, H * 0.52, { fill: "rgba(150,170,200,0.18)", stroke: "rgba(110,130,160,0.8)", width: 1.4, r: 14 });
          D.line(ctx, W * 0.24, H * 0.745, W * 0.24, H * 0.90, "rgba(110,130,160,0.8)", 7);
          D.line(ctx, W * 0.32, H * 0.745, W * 0.32, H * 0.90, "rgba(110,130,160,0.8)", 7);
          D.line(ctx, W * 0.30, H * 0.30, W * 0.30, H * 0.70, "rgba(220,90,80,0.55)", 5);
          D.text(ctx, "血液循環", W * 0.345, H * 0.70, { color: "rgba(220,90,80,0.95)", size: 9.5 });
          Object.keys(GL).forEach(kk => {
            const on = kk === key, gx = W * GL[kk].pos[0], gy = H * GL[kk].pos[1];
            if (on && sec > 0.1) D.disc(ctx, gx, gy, 8 + sec * 8, { fill: "rgba(240,98,146," + (0.15 + sec * 0.25) + ")", glow: "#f06292", glowSize: 20 * sec });
            D.disc(ctx, gx, gy, on ? 7.5 : 5.5, { fill: on ? "rgba(240,98,146,0.9)" : "rgba(150,120,150,0.5)", stroke: "rgba(90,50,80,0.9)", width: 1.2 });
          });
          D.text(ctx, g.name, W * g.pos[0], H * g.pos[1] - 16, { color: PL.col("accent"), size: 11.5, align: "center", weight: "700" });
          for (let i = 0; i < 7; i++) {
            const k = (t * 0.10 + i / 7) % 1;
            if (i / 7 < sec) {
              const hx = lerp(W * g.pos[0] + 10, W * 0.30, k), hy = lerp(H * g.pos[1], H * 0.46, k) + Math.sin(k * Math.PI * 2 + i) * 4;
              D.disc(ctx, hx, hy, 2.6, { fill: "#f8bbd0", stroke: "rgba(200,90,130,0.9)", width: 0.8 });
            }
          }
          D.disc(ctx, W * 0.30, H * 0.46, 12, { fill: "rgba(121,134,203,0.4)", stroke: "rgba(60,70,120,0.9)", width: 1.4 });
          D.text(ctx, "標的細胞(有受體)", W * 0.30, H * 0.46 + 24, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          D.arrow(ctx, W * 0.30 + 22, H * 0.44, W * g.pos[0] + 16, H * g.pos[1] + 8, { color: "rgba(102,187,106," + (0.25 + sec * 0.6) + ")", width: 1.8, dash: [5, 4], label: "負回饋:濃度夠了就踩煞車" });
          CK.panel(ctx, W * 0.52, H * 0.10, W * 0.43, H * 0.82, g.name + " · 荷爾蒙檔案");
          D.text(ctx, g.h, W * 0.735, H * 0.20, { color: PL.col("accent"), size: 13, align: "center", weight: "700" });
          D.text(ctx, "標的:" + g.target, W * 0.735, H * 0.29, { color: PL.col("text-dim"), size: 11, align: "center" });
          D.text(ctx, "作用:" + g.effect, W * 0.735, H * 0.36, { color: PL.col("text-dim"), size: 11, align: "center" });
          D.text(ctx, "血中半衰期:" + g.half, W * 0.735, H * 0.43, { color: PL.col("text-dim"), size: 11, align: "center" });
          D.text(ctx, g.msg, W * 0.735, H * 0.51, { color: PL.col("text-faint"), size: 10.5, align: "center" });
          CK.meter(ctx, W * 0.56, H * 0.60, W * 0.35, 9, sec, { color: "#f06292", label: "分泌速率" });
          D.text(ctx, "荷爾蒙微量高效(血中濃度約 10⁻⁸ M),全靠受體專一性辨識", W * 0.735, H * 0.70, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          rH.set(g.h); rT.set(g.target); rHalf.set(g.half); rC.set(Math.round(sec * 100), 0);
          vd.set(key === "adr" ? "應急分工:神經(秒級)先到,腎上腺素(分鐘級)接手續航" : key === "pit" ? "腦垂腺是總指揮,但聽命於下視丘" : key === "thyroid" ? "甲狀腺素調代謝:過多則心悸、體重下降(機能亢進)" : key === "panc" ? "胰島一次出兩種拮抗荷爾蒙:胰島素降、升糖素升" : "性荷爾蒙由腦垂腺的指示荷爾蒙啟動,受負回饋約束", "info");
        }
      });
      const glSel = PL.ui.select(ui.L.controls, { label: "內分泌腺", value: "pit", options: Object.keys(GL).map(kk => ({ value: kk, label: GL[kk].name })) });
      const secS = PL.ui.slider(ui.L.controls, { label: "分泌速率", min: 0, max: 1, step: 0.05, value: 0.5, digits: 2 });
      PL.ui.note(ui.L.controls, "內分泌腺沒有導管,荷爾蒙直接進血液:神經像電話(秒級、點對點),內分泌像廣播(分鐘級、全體收聽,但只有帶受體的細胞聽得懂)。");
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "應急狀態", apply: () => { glSel.set("adr"); secS.set(0.95); } }, { label: "生長發育期", apply: () => { glSel.set("pit"); secS.set(0.85); } },
        { label: "餐後", apply: () => { glSel.set("panc"); secS.set(0.7); } } ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "調控重點" });
      const rH = PL.ui.readout(ui.L.readouts, { label: "荷爾蒙" });
      const rT = PL.ui.readout(ui.L.readouts, { label: "標的細胞" });
      const rHalf = PL.ui.readout(ui.L.readouts, { label: "血中半衰期" });
      const rC = PL.ui.readout(ui.L.readouts, { label: "相對血中濃度", unit: "%" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 血糖恆定與胰島素 */
  PL.register("blood-sugar", {
    build(root) {
      const SCEN = {
        healthy: { name: "健康", s: 1, basal: 0.010, desc: "β 細胞即時反應:血糖被壓回 70–100" },
        t1: { name: "第 1 型糖尿病", s: 0, basal: 0.002, desc: "β 細胞被破壞,沒有胰島素:血糖降不下來" },
        t2: { name: "第 2 型糖尿病", s: 0.35, basal: 0.006, desc: "細胞對胰島素抗性:要更高的胰島素才做同樣的事" } };
      const simGlucose = (g0, scen) => {
        let g = g0, I = 0, A = 0; const pts = [[0, g]];
        for (let m = 1; m <= 240; m++) {
          I = scen.s * clamp((g - 95) / 40, 0, 2);
          A = I < 0.4 ? clamp((75 - g) / 15, 0, 2) : 0;
          g = clamp(g + 0.6 + 1.4 * A - (scen.basal + 0.018 * I) * (g - 45), 40, 400);
          pts.push([m, g]);
        }
        return { pts, g120: pts[120][1], I, A };
      };
      const ui = CK.scaffold(root, {
        aspect: 0.60,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const scen = SCEN[scenSel.get()], sim = simGlucose(startS.get(), scen);
          const g = sim.g120;
          CK.panel(ctx, W * 0.05, H * 0.10, W * 0.54, H * 0.78, "蘭氏小島 → 肝臟與全身細胞");
          D.disc(ctx, W * 0.17, H * 0.30, H * 0.13, { fill: "rgba(240,230,190,0.30)", stroke: "rgba(150,130,80,0.9)", width: 1.5 });
          D.text(ctx, "胰島(蘭氏小島)", W * 0.17, H * 0.155, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          D.disc(ctx, W * 0.145, H * 0.30, H * 0.042 + H * 0.028 * clamp(sim.I / 2, 0, 1), { fill: "rgba(100,160,220,0.8)", stroke: "rgba(50,90,140,0.9)", width: 1.2 });
          D.disc(ctx, W * 0.20, H * 0.30, H * 0.032 + H * 0.024 * clamp(sim.A, 0, 1), { fill: "rgba(239,136,41,0.8)", stroke: "rgba(170,100,10,0.9)", width: 1.2 });
          D.text(ctx, "β", W * 0.145, H * 0.30 + 3.5, { color: "#fff", size: 10, align: "center", weight: "700" });
          D.text(ctx, "α", W * 0.20, H * 0.30 + 3.5, { color: "#fff", size: 10, align: "center", weight: "700" });
          D.text(ctx, "胰島素", W * 0.115, H * 0.455, { color: "#5da8dd", size: 9.5 });
          for (let i = 0; i < Math.round(clamp(sim.I, 0, 2) * 4); i++) D.disc(ctx, W * 0.155 + i * 8, H * 0.455, 2.6, { fill: "#5da8dd" });
          D.text(ctx, "升糖素", W * 0.115, H * 0.505, { color: "#ef8829", size: 9.5 });
          for (let i = 0; i < Math.round(sim.A * 4); i++) D.disc(ctx, W * 0.155 + i * 8, H * 0.505, 2.6, { fill: "#ef8829" });
          D.rect(ctx, W * 0.30, H * 0.50, W * 0.24, H * 0.18, { fill: "rgba(170,120,90,0.30)", stroke: "rgba(110,70,50,0.9)", width: 1.5, r: 8 });
          D.text(ctx, "肝臟(血糖緩衝庫)", W * 0.42, H * 0.545, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          CK.meter(ctx, W * 0.33, H * 0.72, W * 0.18, 9, clamp(sim.I / 2, 0, 1), { color: "#5da8dd", label: "合成肝醣(胰島素)" });
          CK.meter(ctx, W * 0.33, H * 0.80, W * 0.18, 9, clamp(sim.A, 0, 1), { color: "#ef8829", label: "分解肝醣(升糖素)" });
          CK.panel(ctx, W * 0.62, H * 0.10, W * 0.33, H * 0.78, "情境:" + scen.name);
          D.text(ctx, scen.desc, W * 0.785, H * 0.21, { color: PL.col("text-dim"), size: 11, align: "center" });
          D.text(ctx, "2 小時後血糖 " + PL.fmt(g, 0) + " mg/dL", W * 0.785, H * 0.31, { color: g > 180 ? "#e57373" : g >= 70 && g <= 110 ? "#66bb6a" : "#ef8829", size: 13, align: "center", weight: "700" });
          D.text(ctx, "空腹正常 70–100 · 腎糖閾約 180", W * 0.785, H * 0.38, { color: PL.col("text-faint"), size: 10, align: "center" });
          CK.meter(ctx, W * 0.65, H * 0.46, W * 0.27, 9, clamp((g - 40) / 310, 0, 1), { color: g > 180 ? "#e57373" : "#5da8dd", label: "血糖位置(40–350)" });
          rG.set(g, 0); rI.set(Math.round(clamp(sim.I, 0, 2) * 50), 0); rA.set(Math.round(sim.A * 50), 0); rUrine.set(g > 180 ? "有尿糖" : "無");
          vd.set(g > 180 ? "超過腎糖閾:葡萄糖從尿流失——糖尿病命名的由來" : g >= 115 ? "偏高:胰島素反應不足,屬葡萄糖耐量異常" : g >= 70 ? "正常:胰島素與升糖素的拮抗把血糖壓在範圍內" : "低血糖:升糖素(與腎上腺素)正把肝醣分解回血糖", g > 180 || g < 70 ? "bad" : g >= 115 ? "warn" : "ok");
        }
      });
      const scenSel = PL.ui.select(ui.L.controls, { label: "情境", value: "healthy", options: Object.keys(SCEN).map(k => ({ value: k, label: SCEN[k].name })) });
      const startS = PL.ui.slider(ui.L.controls, { label: "起始血糖", min: 55, max: 300, step: 5, value: 160, unit: "mg/dL", digits: 0 });
      PL.ui.note(ui.L.controls, "胰島素是體內唯一降血糖的荷爾蒙;升糖素、腎上腺素都負責升血糖——降只有一條路、升有後備好幾條,所以低血糖比高血糖更急。");
      PL.ui.procedure(ui.L.controls, {
        title: "看負回饋怎麼接手",
        steps: [
          "選「健康」,起始血糖 160:看曲線在一小時內被壓回 100 附近。",
          "切到「第 1 型糖尿病」:同樣起點,曲線反而緩緩爬高停不住。",
          "把起始血糖拉到 60:α 細胞的升糖素接手,把血糖抬回來。",
          "比較三種情境的「2 小時後血糖」與尿糖欄。"
        ],
        rule: "低於 70 mg/dL 腦就缺糖、高於 180 超過腎糖閾出現尿糖——「尿中有糖」正是糖尿病命名的由來。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "餐後(健康)", apply: () => { scenSel.set("healthy"); startS.set(160); } }, { label: "第 1 型糖尿病", apply: () => { scenSel.set("t1"); startS.set(160); } },
        { label: "運動後低血糖", apply: () => { scenSel.set("healthy"); startS.set(55); } } ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "血糖判定" });
      const rG = PL.ui.readout(ui.L.readouts, { label: "2 小時後血糖", unit: "mg/dL" }), rI = PL.ui.readout(ui.L.readouts, { label: "胰島素強度", unit: "%" });
      const rA = PL.ui.readout(ui.L.readouts, { label: "升糖素強度", unit: "%" }), rUrine = PL.ui.readout(ui.L.readouts, { label: "尿糖" });
      const chart = ui.chart("血糖的負回饋曲線", "綠線 100、紅線 180:健康情境被胰島素壓回 70–100;第 1 型糖尿病沒有這隻手,血糖一直停在高位——負回饋壞掉的樣子。");
      const drawChart = () => {
        const sim = simGlucose(startS.get(), SCEN[scenSel.get()]);
        CK.plot(chart, {
          x0: 0, x1: 240, y0: 40, y1: 350, xticks: [60, 120, 180, 240], yticks: [70, 100, 180, 300], xlabel: "時間 (分)", ylabel: "血糖 (mg/dL)",
          series: [{ pts: sim.pts, color: PL.col("accent") }],
          marks: [
            { hline: 100, color: "rgba(102,187,106,0.7)" }, { hline: 180, color: "rgba(229,115,115,0.7)" },
            { dot: [120, sim.g120], color: PL.col("accent-2"), label: "2 小時" }
          ]
        });
      };
      chart.onResize(drawChart); drawChart(); root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 體溫恆定與調節 */
  PL.register("thermoregulation", {
    build(root) {
      const ACT = { rest: { name: "安靜", base: 85 }, walk: { name: "走路", base: 180 }, hard: { name: "劇烈運動", base: 450 } };
      // 穩態求解:產熱(代謝+顫抖)+環境熱交換 = 蒸發散熱;血管擴張決定導熱係數
      const solveTc = (Te, B) => {
        let Tc = 36.9, S = 0, E = 0, dil = 0;
        for (let i = 0; i < 30; i++) {
          dil = clamp((Te - 16) / 20, 0, 1);
          const K = 5 + 10 * dil, gain = K * (Te - Tc);
          S = clamp((36.6 - Tc) * 220, 0, 300); E = clamp((Tc - 36.9) * 110, 0, 520) + 12;
          Tc = clamp(Tc + (B + S + gain - E) / (K + 330), 30, 42.5);
        }
        return { Tc, S, E, dil };
      };
      const ui = CK.scaffold(root, {
        aspect: 0.60,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const Te = envS.get(), act = ACT[actSel.get()];
          const s = solveTc(Te, act.base), Tc = s.Tc;
          CK.panel(ctx, W * 0.05, H * 0.10, W * 0.50, H * 0.78, "人體的產熱與散熱");
          const bx = W * 0.24, by = H * 0.30;
          D.disc(ctx, bx, by - H * 0.10, H * 0.045, { fill: "rgba(220,170,140,0.45)", stroke: "rgba(150,110,80,0.9)", width: 1.4 });
          D.rect(ctx, bx - W * 0.06, by - H * 0.045, W * 0.12, H * 0.34, { fill: "rgba(220,170,140,0.30)", stroke: "rgba(150,110,80,0.9)", width: 1.4, r: 12 });
          const vC = s.dil > 0.5 ? "rgba(220,90,80,0.85)" : "rgba(90,120,160,0.85)";
          [-W * 0.04, W * 0.04].forEach(o => D.line(ctx, bx + o, by, bx + o, by + H * 0.26, vC, 1.5 + s.dil * 4.5));
          D.text(ctx, s.dil > 0.5 ? "皮膚血管擴張:把熱帶到表面放掉" : "皮膚血管收縮:留住核心的熱", bx, by + H * 0.335, { color: PL.col("text-dim"), size: 10, align: "center" });
          for (let i = 0; i < Math.min(8, Math.round(s.E / 70)); i++) CK.drop(ctx, bx - W * 0.05 + i * W * 0.015, by + H * 0.42 + (i % 3) * 8, "#7ec8ff");
          D.text(ctx, "流汗蒸發散熱 " + PL.fmt(s.E, 0) + " W", bx, by + H * 0.52, { color: "#4a90d9", size: 10.5, align: "center" });
          if (s.S > 10) {
            for (let i = 0; i < 3; i++) {
              const sx = bx - W * 0.08 + i * W * 0.08, sy = by - H * 0.015;
              D.line(ctx, sx, sy, sx + 6, sy - 6, "#ef8829", 1.4); D.line(ctx, sx + 6, sy - 6, sx + 12, sy, "#ef8829", 1.4);
            }
            D.text(ctx, "顫抖產熱 " + PL.fmt(s.S, 0) + " W", bx, by - H * 0.085, { color: "#ef8829", size: 10.5, align: "center" });
          }
          CK.thermometer(ctx, W * 0.475, H * 0.16, H * 0.70, clamp((Tc - 33) / 10, 0.02, 0.98));
          CK.badge(ctx, W * 0.475, H * 0.125, PL.fmt(Tc, 1) + " °C", Tc > 38 ? "#e57373" : Tc < 36 ? "#5da8dd" : "#66bb6a");
          CK.panel(ctx, W * 0.58, H * 0.10, W * 0.37, H * 0.78, "熱收支(穩定狀態)");
          const rows = [
            ["產熱(代謝+顫抖)", PL.fmt(act.base + s.S, 0) + " W"], ["環境熱交換(負=散熱)", PL.fmt(act.base + s.S - s.E, 0) + " W"],
            ["蒸發散熱(含排汗)", PL.fmt(s.E, 0) + " W"], ["排汗速率", PL.fmt(s.E * 1.5, 0) + " mL/hr"]];
          rows.forEach((row, i) => {
            D.text(ctx, row[0], W * 0.61, H * 0.24 + i * 30, { color: PL.col("text-dim"), size: 10.5 });
            D.text(ctx, row[1], W * 0.92, H * 0.24 + i * 30, { color: i === 3 && s.E > 300 ? "#e57373" : PL.col("text"), size: 11.5, align: "right" });
          });
          D.text(ctx, "平衡式:產熱 + 環境熱交換 = 蒸發散熱", W * 0.765, H * 0.42, { color: PL.col("text-faint"), size: 10, align: "center" });
          D.text(ctx, "下視丘比對設定點 37 °C,指揮血管、汗腺與肌肉", W * 0.765, H * 0.68, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          D.text(ctx, "濕度高時蒸發變差,同樣溫度更危險(體感溫度)", W * 0.765, H * 0.75, { color: PL.col("text-faint"), size: 10, align: "center" });
          rTc.set(Tc, 1); rProd.set(act.base + s.S, 0); rEvap.set(s.E, 0); rSweat.set(s.E * 1.5, 0);
          vd.set(Tc >= 39 ? "中暑風險:散熱跟不上產熱,體溫調節失控" : Tc >= 38 ? "體溫偏高:排汗全開,應補水並降溫" : Tc <= 35 ? "失溫:產熱不足以抵擋流失,立即保暖" : Tc <= 36 ? "體溫偏低:顫抖與血管收縮已全力啟動" : "恆定:產熱與散熱平衡,核心溫度壓在 37 °C 附近", Tc >= 39 || Tc <= 35 ? "bad" : Tc >= 38 || Tc <= 36 ? "warn" : "ok");
        }
      });
      const envS = PL.ui.slider(ui.L.controls, { label: "環境溫度", min: -5, max: 42, step: 1, value: 25, unit: "°C", digits: 0 });
      const actSel = PL.ui.select(ui.L.controls, { label: "活動狀態", value: "rest", options: Object.keys(ACT).map(k => ({ value: k, label: ACT[k].name + "(" + ACT[k].base + " W)" })) });
      PL.ui.note(ui.L.controls, "下視丘是恆溫器:過熱時靠血管擴張與流汗散熱,過冷時靠顫抖產熱與血管收縮保溫——產熱與散熱的平衡把核心溫度鎖在 37 °C。");
      PL.ui.procedure(ui.L.controls, {
        title: "找出恆定的邊界",
        steps: [
          "把環境溫度從 25 慢慢拉到 0:看顫抖產熱如何接手,核心溫度幾乎不變。",
          "再拉到 42:排汗全開,核心溫度開始上飄——散熱手段有其上限。",
          "切到「劇烈運動」再拉環境溫度:產熱大增,恆定範圍立刻變窄。",
          "對照下圖:平台越寬,代表調節手段越多。"
        ],
        rule: "流汗降溫靠「蒸發」而非流汗本身:濕度高的天氣汗蒸不出去,同樣 35 °C 卻更容易中暑。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "舒適室溫", apply: () => { envS.set(25); actSel.set("rest"); } }, { label: "寒流(−5 °C)", apply: () => { envS.set(-5); actSel.set("rest"); } },
        { label: "酷熱(42 °C)", apply: () => { envS.set(42); actSel.set("rest"); } }, { label: "夏日路跑", apply: () => { envS.set(33); actSel.set("hard"); } }
      ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "體溫判定" });
      const rTc = PL.ui.readout(ui.L.readouts, { label: "核心體溫", unit: "°C" }), rProd = PL.ui.readout(ui.L.readouts, { label: "產熱功率", unit: "W" });
      const rEvap = PL.ui.readout(ui.L.readouts, { label: "蒸發散熱", unit: "W" }), rSweat = PL.ui.readout(ui.L.readouts, { label: "排汗速率", unit: "mL/hr" });
      const chart = ui.chart("核心體溫 vs 環境溫度", "中央的平台期就是恆定:下視丘用顫抖與排汗把體溫壓在 37 °C 附近;平台兩端崩落,代表調節手段已經用盡。");
      const drawChart = () => {
        const B = ACT[actSel.get()].base;
        CK.plot(chart, {
          x0: -5, x1: 42, y0: 33, y1: 42, xticks: [0, 10, 20, 30, 40], yticks: [35, 37, 39, 41], xlabel: "環境溫度 (°C)", ylabel: "核心體溫 (°C)",
          series: [{ fn: te => solveTc(te, B).Tc, color: PL.col("accent") }],
          marks: [{ hline: 37, color: "rgba(102,187,106,0.7)" }, { dot: [envS.get(), solveTc(envS.get(), B).Tc], color: PL.col("accent-2"), label: "現在" }]
        });
      };
      chart.onResize(drawChart); drawChart(); root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });
})();
