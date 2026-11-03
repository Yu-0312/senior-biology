/* 模組一 · 生命現象與細胞 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, CK = window.BioLab, D = PL.draw;
  const { clamp, lerp, TAU } = PL;

  /* 生命現象與生命特徵 */
  PL.register("life-phenomena", {
    build(root) {
      const SCENARIOS = {
        baby: { name: "嬰兒成長", mass0: 3.2, massK: 0.22, events: ["代謝", "生長", "生殖"], desc: "細胞分裂與新陳代謝讓體重上升", life: true },
        mimosa: { name: "含羞草閉合", mass0: 0.0, massK: 0, events: ["感應", "運動"], desc: "葉枕細胞膨壓變化，是可逆的傾量反應", life: true },
        bacteria: { name: "細菌繁殖", mass0: 1, massK: 1.9, events: ["代謝", "生殖", "生長"], desc: "二分法分裂，族群呈指數成長", life: true },
        virus: { name: "病毒結晶", mass0: 1, massK: 0, events: [], desc: "離開宿主後不代謝、不成長，可結晶保存", life: false },
        bear: { name: "北極熊冬眠", mass0: 300, massK: -0.35, events: ["代謝", "恆定", "適應"], desc: "降低代謝率以度過食物短缺，仍維持核心體溫", life: true },
        rock: { name: "風化的石頭", mass0: 800, massK: -0.4, events: [], desc: "質量減少是物理崩解，沒有代謝與生殖", life: false }
      };
      const ui = CK.scaffold(root, {
        aspect: 0.62, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const key = sceneSel.get(), sc = SCENARIOS[key];
          const days = daysS.get();
          // 情境插畫：以質量變化代表「有沒有代謝與成長」
          const mass = Math.max(0.05, sc.mass0 + sc.massK * days);
          const frac = clamp(mass / Math.max(1, sc.mass0), 0, 2) / 2;
          const cx = W * 0.28, baseY = H * 0.80;
          if (key === "bacteria") {
            // 細菌族群點陣
            CK.panel(ctx, W * 0.06, H * 0.14, W * 0.44, H * 0.62, sc.name);
            const n = Math.min(60, Math.round(mass * 6));
            CK.counter(ctx, W * 0.10, H * 0.30, W * 0.36, n, { color: "#7fc8ff", r: 5 });
            D.text(ctx, "族群 " + PL.fmt(mass, 0) + " ×10⁶", W * 0.28, H * 0.70, { color: PL.col("text-dim"), size: 11, align: "center" });
          } else if (key === "virus") {
            CK.panel(ctx, W * 0.06, H * 0.14, W * 0.44, H * 0.62, sc.name);
            CK.virusShape(ctx, W * 0.28, H * 0.42, 30, { time: t });
            D.text(ctx, "靜置培養液中：不攝食、不成長", W * 0.28, H * 0.66, { color: PL.col("text-dim"), size: 11, align: "center" });
          } else if (key === "rock") {
            ctx.save();
            ctx.fillStyle = "#8d8a84";
            ctx.beginPath();
            ctx.moveTo(cx - 60 * frac - 10, baseY); ctx.lineTo(cx - 40 * frac, baseY - 60 * frac - 6);
            ctx.lineTo(cx + 30 * frac, baseY - 74 * frac - 4); ctx.lineTo(cx + 58 * frac, baseY);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = "rgba(60,60,60,0.5)"; ctx.lineWidth = 1.4; ctx.stroke();
            ctx.restore();
            D.text(ctx, "崩解：物理變化，質量減少", cx, baseY + 18, { color: PL.col("text-dim"), size: 11, align: "center" });
          } else {
            // 生物剪影：以尺寸表現成長或消耗
            const s = 0.5 + frac;
            CK.cellBody(ctx, cx, baseY - 60 * s, 34 * s, { type: key === "bear" ? "animal" : "animal", fluid: true, time: t, organelles: { mito: 3 } });
            D.text(ctx, sc.name + " · " + PL.fmt(mass, 1) + (key === "baby" ? " kg" : " g"), cx, baseY + 18, { color: PL.col("text-dim"), size: 11, align: "center" });
          }
          // 右側：現象檢核
          CK.panel(ctx, W * 0.54, H * 0.14, W * 0.40, H * 0.62, "生命現象檢核");
          const ALL = ["代謝", "生長", "生殖", "感應", "運動", "恆定", "適應"];
          ALL.forEach((p, i) => {
            const y = H * 0.24 + i * 22;
            const on = sc.events.includes(p);
            D.disc(ctx, W * 0.58, y, 7, { fill: on ? "#66bb6a" : PL.theme.shade(0.6), stroke: on ? "#2e7d32" : PL.col("border"), width: 1.2 });
            if (on) D.text(ctx, "✓", W * 0.58, y + 3.5, { color: "#fff", size: 10, align: "center", weight: "700" });
            D.text(ctx, p, W * 0.60, y + 4, { color: on ? PL.col("text") : PL.col("text-faint"), size: 12 });
          });
          rPhen.set(sc.events.length ? sc.events.join("、") : "（無）");
          rMass.set(mass, 2);
          rVerdict.set(sc.life ? "是生命（族群層次）" : "不是生命");
          rNote.set(sc.desc);
        }
      });
      const sceneSel = PL.ui.select(ui.L.controls, { label: "情境", value: "baby", options: [
        { value: "baby", label: "嬰兒成長" }, { value: "mimosa", label: "含羞草閉合" },
        { value: "bacteria", label: "細菌繁殖" }, { value: "virus", label: "病毒結晶" },
        { value: "bear", label: "北極熊冬眠" }, { value: "rock", label: "風化的石頭" }
      ] });
      const daysS = PL.ui.slider(ui.L.controls, { label: "觀察時間", min: 0, max: 10, step: 1, value: 3, unit: "天", digits: 0 });
      PL.ui.note(ui.L.controls, "不是每一個體都要展現全部現象；病毒在宿主外不表現任何生命現象，判斷「是不是生命」要看整體族群。");
      PL.ui.procedure(ui.L.controls, {
        title: "怎麼判斷生命現象",
        steps: [
          "選一個情境，先猜它展現哪些現象，再看右側檢核。",
          "拉動「觀察時間」，看質量是否隨時間有意義的變化。",
          "比較「病毒結晶」與「細菌繁殖」：哪一個能獨立代謝與生殖？"
        ],
        rule: "「會動」不等於生命（石頭會崩落）、「不動」也不等於沒生命（植物會感應與生長）。"
      });
      const rPhen = PL.ui.readout(ui.L.readouts, { label: "展現的現象" });
      const rMass = PL.ui.readout(ui.L.readouts, { label: "質量指標", unit: "任意單位" });
      const rVerdict = PL.ui.readout(ui.L.readouts, { label: "判斷" });
      const rNote = PL.ui.readout(ui.L.readouts, { label: "關鍵差異" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 顯微鏡操作與成像 */
  PL.register("microscope", {
    build(root) {
      const OBJ_Mags = [40, 100, 400];
      const ui = CK.scaffold(root, {
        aspect: 0.60,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const obj = objSel.get(), mag = OBJ_Mags[obj];
          const focus = focusS.get();
          // 對焦平面：前後兩層細胞，對焦輪決定哪一層清楚（0→前層、1→後層）
          const frontA = Math.max(0, 1 - Math.abs(focus - 0.30) * 2.6);
          const backA = Math.max(0, 1 - Math.abs(focus - 0.78) * 2.6);
          const clarity = Math.max(frontA, backA);
          const viewD = 18 - Math.log10(mag) * 3.4; // 視野直徑（mm，示意）
          // 顯微鏡
          CK.microscope(ctx, W * 0.24, H * 0.80, H * 0.0042, {
            activeMag: [40, 100, 400][obj] === 40 ? 4 : [40, 100, 400][obj] === 100 ? 10 : 40,
            revolve: obj * 0.4, mag: mag, slideLabel: "洋蔥表皮"
          });
          // 視野（右側圓形）
          const vx = W * 0.66, vy = H * 0.44, vr = H * 0.30;
          D.disc(ctx, vx, vy, vr, { fill: clarity > 0.5 ? "rgba(235,244,238,0.9)" : "rgba(200,210,205,0.85)", stroke: PL.col("border"), width: 2 });
          // 細胞排布：放大率越高細胞越大、顆數越少
          const cells = Math.round(140 / mag * 20);
          const cellR = vr * (0.06 + mag / 400 * 0.16);
          const n = Math.max(4, Math.min(24, cells));
          // 前層：表皮細胞（對焦 0.30）；後層：下方海綿組織（對焦 0.78）
          const layer = (alpha, dy, stroke, fill) => {
            if (alpha < 0.06) return;
            for (let i = 0; i < n; i++) {
              const a = i * 2.39996, rr = vr * 0.72 * Math.sqrt((i + 0.5) / n);
              const x = vx + Math.cos(a) * rr + (dy ? 6 : 0), y = vy + Math.sin(a) * rr + dy;
              ctx.save();
              ctx.globalAlpha = 0.2 + alpha * 0.75;
              D.rect(ctx, x - cellR * 1.4, y - cellR, cellR * 2.8, cellR * 2, { stroke, width: 1.4, r: cellR * 0.4 });
              D.disc(ctx, x, y, cellR * 0.32, { fill });
              ctx.restore();
            }
          };
          layer(frontA, -4, "rgba(70,110,80,0.9)", "rgba(120,80,160,0.5)");
          layer(backA, 10, "rgba(60,95,120,0.9)", "rgba(90,130,180,0.45)");
          if (clarity < 0.45) D.text(ctx, "未對焦：旋轉細調節輪", vx, vy + vr + 18, { color: PL.col("warn"), size: 11, align: "center" });
          else if (backA > frontA) D.text(ctx, "對焦到下層海綿組織", vx, vy + vr + 18, { color: PL.col("text-faint"), size: 10.5, align: "center" });
          D.text(ctx, "目鏡 10×  物鏡 " + (mag / 10) + "×", vx, vy - vr - 10, { color: PL.col("text-dim"), size: 11, align: "center" });
          rMag.set(mag, 0); rView.set(viewD, 1); rClarity.set(clarity, 2);
          rCells.set(n, 0);
        }
      });
      const objSel = PL.ui.select(ui.L.controls, { label: "物鏡", value: "0", options: [
        { value: "0", label: "4×（低倍）" }, { value: "1", label: "10×（中倍）" }, { value: "2", label: "40×（高倍）" }
      ], onChange: v => { focusS.set(0.55); } });
      const focusS = PL.ui.slider(ui.L.controls, { label: "細調節輪", min: 0, max: 1, step: 0.05, value: 0.55, digits: 2 });
      PL.ui.note(ui.L.controls, "先用低倍找到標本並置中，再換高倍：視野會變暗、變小，這時只能用細調節輪對焦。");
      PL.ui.procedure(ui.L.controls, {
        title: "正確操作順序",
        steps: [
          "低倍物鏡對準，調整反光鏡讓視野明亮。",
          "放玻片後用<b>粗調節輪</b>降下鏡筒，直到看到輪廓。",
          "把目標移到視野中央，換高倍物鏡。",
          "換高倍後<b>只能用細調節輪</b>微調，並加大光圈補償變暗的視野。"
        ],
        rule: "顯微鏡下的像是上下、左右都顛倒的：把玻片往左推，看到的像會往右跑。"
      });
      const rMag = PL.ui.readout(ui.L.readouts, { label: "總放大率", unit: "×" });
      const rView = PL.ui.readout(ui.L.readouts, { label: "視野直徑", unit: "mm" });
      const rClarity = PL.ui.readout(ui.L.readouts, { label: "對焦清晰度" });
      const rCells = PL.ui.readout(ui.L.readouts, { label: "可見細胞數" });
      const chart = ui.chart("放大率與視野", "總放大率越高，能看到的範圍越小、細節越多——視野直徑大約與放大率成反比。");
      const drawChart = () => {
        CK.plot(chart, {
          x0: 40, x1: 400, y0: 0, y1: 20,
          xlabel: "總放大率 (×)", ylabel: "視野直徑 (mm)",
          series: [{ fn: m => Math.max(0, 18 - Math.log10(m) * 3.4), color: PL.col("accent") }],
          marks: [{ dot: [OBJ_Mags[objSel.get()], 18 - Math.log10(OBJ_Mags[objSel.get()]) * 3.4], color: PL.col("accent-2"), label: "目前" }]
        });
      };
      chart.onResize(drawChart);
      drawChart();
      root.addEventListener("input", drawChart);
      root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 細胞觀察與細胞學說 */
  PL.register("cell-observation", {
    build(root) {
      const SPECIMENS = {
        cheek: { name: "口腔皮膜細胞", type: "animal", stain: "亞甲藍", parts: ["細胞膜", "細胞質", "細胞核"], shape: "扁平多角形" },
        onion: { name: "洋蔥表皮細胞", type: "plant", stain: "碘液", parts: ["細胞壁", "細胞膜", "細胞核", "液泡"], shape: "磚塊狀長方形" },
        leaf: { name: "葉下表皮細胞", type: "plant", stain: "不必染色", parts: ["細胞壁", "保衛細胞", "氣孔"], shape: "不規則腎形相鄰" }
      };
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const key = specSel.get(), sp = SPECIMENS[key];
          const light = lightS.get();
          // 視野圓：亮度直接改變底色與標本可見度
          const vx = W * 0.50, vy = H * 0.46, vr = H * 0.34;
          const vis = 0.25 + light * 0.75;
          D.disc(ctx, vx, vy, vr, { fill: "rgba(225,238,230," + (0.35 + light * 0.6) + ")", stroke: PL.col("border"), width: 2 });
          if (key === "cheek") {
            for (let i = 0; i < 7; i++) {
              const a = i * 2.39996, rr = vr * 0.68 * Math.sqrt((i + 0.5) / 7);
              ctx.save(); ctx.globalAlpha = vis;
              CK.cellBody(ctx, vx + Math.cos(a) * rr, vy + Math.sin(a) * rr, vr * 0.16, {
                type: "animal", fluid: true, time: t, organelles: { mito: 1 }, labelNucleus: true
              });
              ctx.restore();
            }
          } else if (key === "onion") {
            for (let row = 0; row < 4; row++) {
              for (let col = 0; col < 6; col++) {
                const x = vx - vr * 0.8 + col * vr * 0.34 + (row % 2) * vr * 0.1;
                const y = vy - vr * 0.6 + row * vr * 0.4;
                const w2 = vr * 0.15, h2 = vr * 0.18;
                ctx.save(); ctx.globalAlpha = vis;
                D.rect(ctx, x - w2, y - h2, w2 * 2, h2 * 2, { fill: "rgba(170,215,150,0.30)", stroke: "rgba(90,140,70,0.9)", width: 1.6, r: 4 });
                D.disc(ctx, x, y, h2 * 0.35, { fill: "rgba(120,80,160,0.55)" });
                ctx.restore();
              }
            }
          } else {
            // 氣孔與保衛細胞
            for (let i = 0; i < 3; i++) {
              const x = vx - vr * 0.5 + i * vr * 0.5, y = vy + (i % 2 - 0.5) * vr * 0.4;
              ctx.save(); ctx.globalAlpha = vis;
              CK.cellBody(ctx, x, y, vr * 0.14, { type: "plant", time: t });
              ctx.restore();
            }
            D.text(ctx, "彎月形保衛細胞圍出氣孔", vx, vy + vr * 0.85, { color: PL.col("text-dim"), size: 11, align: "center" });
          }
          // 光圈太小：整個視野罩上暗層，明確可見
          if (light < 0.55) {
            D.disc(ctx, vx, vy, vr, { fill: "rgba(10,16,24," + (0.55 - light) * 1.1 + ")" });
          }
          CK.panel(ctx, W * 0.06, H * 0.10, W * 0.30, H * 0.80, "標本資訊");
          D.text(ctx, sp.name, W * 0.21, H * 0.22, { color: PL.col("text"), size: 13, align: "center", weight: "700" });
          D.text(ctx, "染色：" + sp.stain, W * 0.21, H * 0.30, { color: PL.col("text-dim"), size: 11, align: "center" });
          D.text(ctx, "形狀：" + sp.shape, W * 0.21, H * 0.38, { color: PL.col("text-dim"), size: 11, align: "center" });
          sp.parts.forEach((p, i) => {
            D.disc(ctx, W * 0.12, H * 0.50 + i * 26, 4, { fill: PL.col("accent") });
            D.text(ctx, p, W * 0.15, H * 0.50 + i * 26 + 4, { color: PL.col("text-dim"), size: 11.5 });
          });
          rName.set(sp.name); rParts.set(sp.parts.join("、"));
          rMembrane.set("有"); rWall.set(sp.type === "plant" ? "有（植物特有）" : "無");
          rLight.set(light, 2); rVis.set(vis > 0.8 ? "清晰" : vis > 0.45 ? "尚可" : "昏暗");
        }
      });
      const specSel = PL.ui.select(ui.L.controls, { label: "標本", value: "cheek", options: [
        { value: "cheek", label: "口腔皮膜（動物）" }, { value: "onion", label: "洋蔥表皮（植物）" }, { value: "leaf", label: "葉下表皮（植物）" }
      ] });
      const lightS = PL.ui.slider(ui.L.controls, { label: "光圈大小", min: 0.1, max: 1, step: 0.05, value: 0.6, digits: 2 });
      PL.ui.note(ui.L.controls, "動植物細胞都有膜、質、核；植物多出細胞壁。口腔皮膜要染亞甲藍才看得清細胞核。");
      PL.ui.procedure(ui.L.controls, {
        title: "比較兩種細胞",
        steps: [
          "先看口腔皮膜：找橢圓形外框（膜）與內部深色的核。",
          "再看洋蔥表皮：注意外層較厚的<b>細胞壁</b>與規則排列。",
          "拉動光圈，觀察過亮或過暗時哪些構造會看不清。"
        ],
        rule: "看不清楚時先調光圈與對焦，不要急著換高倍——光圈太小會出現繞射條紋，太大會降低對比。"
      });
      const rName = PL.ui.readout(ui.L.readouts, { label: "標本" });
      const rParts = PL.ui.readout(ui.L.readouts, { label: "可見構造" });
      const rMembrane = PL.ui.readout(ui.L.readouts, { label: "細胞膜" });
      const rWall = PL.ui.readout(ui.L.readouts, { label: "細胞壁" });
      const rLight = PL.ui.readout(ui.L.readouts, { label: "光圈開度" });
      const rVis = PL.ui.readout(ui.L.readouts, { label: "標本可見度" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 細胞構造與胞器分工 */
  PL.register("cell-organelles", {
    build(root) {
      const ORGANELLES = {
        nucleus: { name: "細胞核", job: "儲存 DNA，指揮代謝與生殖", membrane: "雙層核膜", x: 0.5, y: 0.42 },
        mitochondrion: { name: "粒線體", job: "呼吸作用產生 ATP", membrane: "雙層膜", x: 0.32, y: 0.66 },
        chloroplast: { name: "葉綠體", job: "光合作用把光能轉成化學能", membrane: "雙層膜", x: 0.70, y: 0.64 },
        ribosome: { name: "核糖體", job: "合成蛋白質", membrane: "無膜", x: 0.40, y: 0.28 },
        vacuole: { name: "液泡", job: "儲水與維持膨壓", membrane: "單層膜", x: 0.66, y: 0.30 },
        lysosome: { name: "溶體", job: "分解老舊胞器與吞噬物", membrane: "單層膜", x: 0.80, y: 0.46 }
      };
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const key = orgSel.get(), o = ORGANELLES[key];
          const act = actS.get();
          // 大細胞
          const cx = W * 0.38, cy = H * 0.50, r = H * 0.30;
          ctx.save();
          ctx.beginPath();
          for (let i = 0; i <= 40; i++) {
            const a = i / 40 * TAU;
            ctx.lineTo(cx + Math.cos(a) * (r + Math.sin(a * 5 + t * 1.5) * r * 0.02), cy + Math.sin(a) * (r + Math.cos(a * 4 + t) * r * 0.02));
          }
          ctx.closePath();
          ctx.fillStyle = "rgba(160,205,228,0.30)"; ctx.fill();
          ctx.strokeStyle = "rgba(80,120,150,0.95)"; ctx.lineWidth = 2; ctx.stroke();
          ctx.restore();
          D.text(ctx, "細胞膜（流動鑲嵌）", cx, cy + r + 20, { color: PL.col("text-dim"), size: 11, align: "center" });
          // 各胞器
          const hi = o;
          const put = (x, y, drawFn, label, isHi) => {
            drawFn();
            D.line(ctx, x + 14, y - 10, x + 40, y - 26, isHi ? PL.col("accent") : PL.col("text-faint"), isHi ? 1.6 : 1);
            D.text(ctx, label, x + 44, y - 26, { color: isHi ? PL.col("accent") : PL.col("text-faint"), size: isHi ? 12 : 10, weight: isHi ? "700" : "" });
          };
          put(cx + r * 0.05, cy - r * 0.06, () => {
            D.disc(ctx, cx + r * 0.05, cy - r * 0.06, r * 0.3, { fill: hi === "nucleus" ? "rgba(179,136,217,0.85)" : "rgba(179,136,217,0.45)", stroke: "rgba(90,50,130,0.9)", width: 1.6 });
            D.disc(ctx, cx + r * 0.05, cy - r * 0.06, r * 0.1, { fill: "rgba(90,50,130,0.8)" });
          }, "核", key === "nucleus");
          for (let i = 0; i < 3; i++) {
            const mx = cx - r * 0.5 + i * r * 0.32, my = cy + r * 0.55;
            put(mx, my, () => {
              if (act > 0.35) D.disc(ctx, mx, my, r * 0.16 * act, { fill: "rgba(239,136,41," + act * 0.35 + ")" });
              CK.mitochondrion(ctx, mx, my, r * 0.09, { time: t });
            }, "粒線體", key === "mitochondrion");
          }
          for (let i = 0; i < 2; i++) {
            const mx = cx + r * 0.42 + i * r * 0.3, my = cy + r * 0.52;
            put(mx, my, () => CK.chloroplast(ctx, mx, my, r * 0.10, { time: t, excited: key === "chloroplast" && act > 0.4 }), "葉綠體", key === "chloroplast");
          }
          for (let i = 0; i < 5; i++) {
            const a = i * 1.7 + 0.4;
            put(cx + Math.cos(a) * r * 0.7, cy + Math.sin(a) * r * 0.7, () => {
              D.disc(ctx, cx + Math.cos(a) * r * 0.7, cy + Math.sin(a) * r * 0.7, 3, { fill: key === "ribosome" ? "#e57373" : "#5b8def" });
            }, i === 0 ? "核糖體" : "", key === "ribosome" && i === 0);
          }
          put(cx - r * 0.55, cy - r * 0.5, () => {
            D.disc(ctx, cx - r * 0.55, cy - r * 0.5, r * 0.16, { fill: key === "vacuole" ? "rgba(150,200,235,0.6)" : "rgba(150,200,235,0.35)", stroke: "rgba(80,130,165,0.8)", width: 1.2 });
          }, "液泡", key === "vacuole");
          put(cx + r * 0.62, cy - r * 0.42, () => {
            D.disc(ctx, cx + r * 0.62, cy - r * 0.42, r * 0.09, { fill: key === "lysosome" ? "rgba(255,167,38,0.7)" : "rgba(255,167,38,0.4)", stroke: "rgba(170,100,10,0.8)", width: 1.2 });
          }, "溶體", key === "lysosome");
          // 功能卡
          CK.panel(ctx, W * 0.70, H * 0.16, W * 0.24, H * 0.56, "焦點胞器");
          D.text(ctx, o.name, W * 0.82, H * 0.28, { color: PL.col("accent"), size: 15, align: "center", weight: "700" });
          D.text(ctx, o.job, W * 0.82, H * 0.38, { color: PL.col("text-dim"), size: 11, align: "center" });
          D.text(ctx, "膜構造：" + o.membrane, W * 0.82, H * 0.48, { color: PL.col("text-dim"), size: 11, align: "center" });
          if (key === "mitochondrion" || key === "chloroplast") {
            CK.meter(ctx, W * 0.74, H * 0.56, W * 0.16, 8, act, { color: key === "chloroplast" ? "#66bb6a" : "#ef8829", label: "活動量" });
          }
          rName.set(o.name); rJob.set(o.job); rMem.set(o.membrane);
          rAct.set(Math.round(act * 100), 0); rATP.set(key === "mitochondrion" || key === "chloroplast" ? Math.round(act * 38) : Math.round(act * 6), 0);
          rTip.set(key === "chloroplast" ? "只在植物與藻類細胞" : key === "mitochondrion" ? "動植物細胞都有，肌肉細胞特別多" : key === "nucleus" ? "遺傳物質的控制中心" : "依功能分布在細胞質");
        }
      });
      const orgSel = PL.ui.select(ui.L.controls, { label: "胞器", value: "nucleus", options: Object.keys(ORGANELLES).map(k => ({ value: k, label: ORGANELLES[k].name })) });
      const actS = PL.ui.slider(ui.L.controls, { label: "細胞活動量", min: 0, max: 1, step: 0.05, value: 0.5, digits: 2 });
      PL.ui.note(ui.L.controls, "把每個胞器都點一輪：注意哪些有膜包覆。有膜的胞器把化學反應隔開，這是真核細胞的核心特色。");
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "葉肉細胞（白天）", apply: () => { orgSel.set("chloroplast"); actS.set(0.9); } },
        { label: "肌肉細胞", apply: () => { orgSel.set("mitochondrion"); actS.set(0.85); } },
        { label: "靜止細胞", apply: () => { orgSel.set("nucleus"); actS.set(0.2); } }
      ] });
      const rName = PL.ui.readout(ui.L.readouts, { label: "胞器" });
      const rJob = PL.ui.readout(ui.L.readouts, { label: "主要功能" });
      const rMem = PL.ui.readout(ui.L.readouts, { label: "膜構造" });
      const rTip = PL.ui.readout(ui.L.readouts, { label: "分布提示" });
      const rAct = PL.ui.readout(ui.L.readouts, { label: "活動量", unit: "%" });
      const rATP = PL.ui.readout(ui.L.readouts, { label: "相對產能", unit: "ATP" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 原核與真核細胞 */
  PL.register("prokaryote-eukaryote", {
    build(root) {
      const CELLS = {
        ecoli: { name: "大腸桿菌（原核）", d: 2.0, type: "bacteria", nuc: "環狀 DNA，無核膜", organelles: "只有核糖體，無膜狀胞器" },
        yeast: { name: "酵母菌（真核）", d: 8, type: "plant", nuc: "有核膜包圍的細胞核", organelles: "粒線體、液泡等膜狀胞器" },
        onion: { name: "洋蔥表皮（真核）", d: 60, type: "plant", nuc: "有核膜包圍的細胞核", organelles: "葉綠體以外的多種胞器" },
        cheek: { name: "口腔皮膜（真核）", d: 45, type: "animal", nuc: "有核膜包圍的細胞核", organelles: "粒線體、溶體等" }
      };
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const key = cellSel.get(), c = CELLS[key];
          const mag = magS.get();
          const pxPerUm = Math.pow(10, mag / 500) * 2; // 示意尺度
          const rPx = clamp(c.d / 2 * pxPerUm, 6, H * 0.26);
          // 繪圖區
          CK.panel(ctx, W * 0.05, H * 0.10, W * 0.55, H * 0.76, "顯微視野（尺度示意）");
          const cx = W * 0.32, cy = H * 0.48;
          if (key === "ecoli") {
            CK.cellBody(ctx, cx, cy, rPx, { type: "bacteria", time: t });
          } else {
            CK.cellBody(ctx, cx, cy, rPx, { type: c.type, time: t, organelles: key === "yeast" ? { vacuole: 1 } : { mito: 2, vacuole: 1 }, fluid: true });
          }
          // 比例尺
          const barUm = c.d;
          const barPx = clamp(barUm * pxPerUm, 30, W * 0.3);
          D.line(ctx, W * 0.10, H * 0.80, W * 0.10 + barPx, H * 0.80, PL.col("accent-2"), 2.4);
          D.text(ctx, barUm + " μm", W * 0.10 + barPx / 2, H * 0.84, { color: PL.col("accent-2"), size: 10, align: "center" });
          // 比較卡
          CK.panel(ctx, W * 0.64, H * 0.16, W * 0.30, H * 0.62, "構造比較");
          D.text(ctx, c.name, W * 0.79, H * 0.26, { color: PL.col("text"), size: 12.5, align: "center", weight: "700" });
          D.text(ctx, "直徑約 " + c.d + " μm", W * 0.79, H * 0.34, { color: PL.col("text-dim"), size: 11, align: "center" });
          D.text(ctx, "核區：" + c.nuc, W * 0.79, H * 0.44, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          D.text(ctx, "胞器：" + c.organelles, W * 0.79, H * 0.54, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          D.text(ctx, key === "ecoli" ? "原核細胞：小、簡單、繁殖快" : "真核細胞：大、胞器分工", W * 0.79, H * 0.66, { color: key === "ecoli" ? "#ef8829" : "#66bb6a", size: 11, align: "center", weight: "700" });
          rName.set(c.name); rD.set(c.d, 1); rNuc.set(c.nuc); rMag.set(mag, 0);
        }
      });
      const cellSel = PL.ui.select(ui.L.controls, { label: "細胞", value: "ecoli", options: Object.keys(CELLS).map(k => ({ value: k, label: CELLS[k].name })) });
      const magS = PL.ui.slider(ui.L.controls, { label: "顯微放大", min: 100, max: 1000, step: 50, value: 400, unit: "×", digits: 0 });
      PL.ui.note(ui.L.controls, "原核細胞只有細菌那麼大，要 1000 倍才看得清；洋蔥表皮細胞在 100 倍下就很清楚了。");
      PL.ui.procedure(ui.L.controls, {
        title: "分辨原核與真核",
        steps: [
          "先看尺度：原核細胞直徑約 1–5 μm，真核 10–100 μm。",
          "找核膜：原核只有一團環狀 DNA，沒有核膜包圍。",
          "找膜狀胞器：原核只有核糖體，沒有粒線體、葉綠體。"
        ],
        rule: "兩者都有細胞膜、細胞質與核糖體——「沒有核膜」才是原核的定義特徵，不是「沒有 DNA」。"
      });
      const rName = PL.ui.readout(ui.L.readouts, { label: "細胞" });
      const rD = PL.ui.readout(ui.L.readouts, { label: "直徑", unit: "μm" });
      const rNuc = PL.ui.readout(ui.L.readouts, { label: "核區" });
      const rMag = PL.ui.readout(ui.L.readouts, { label: "放大倍率", unit: "×" });
      const chart = ui.chart("細胞尺度", "細胞大小橫跨兩個數量級，這是為什麼細菌要用油鏡、植物細胞低倍就夠。");
      const drawChart = () => {
        CK.plot(chart, {
          x0: 0, x1: 4, y0: 0, y1: 4, xticks: [1, 2, 3], yticks: [1, 2, 3],
          xlabel: "log10 直徑 (μm)", ylabel: "log10 放大需求",
          series: [{ pts: [[0.3, 3], [1, 2.4], [1.6, 1.2]], color: PL.col("accent") }],
          marks: [{ dot: [Math.log10(CELLS[cellSel.get()].d), 3.2 - Math.log10(CELLS[cellSel.get()].d)], color: PL.col("accent-2"), label: "目前" }]
        });
      };
      chart.onResize(drawChart);
      drawChart();
      root.addEventListener("input", drawChart);
      root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 細胞尺度與表面積效應 */
  PL.register("cell-surface", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const L = lenS.get();
          const sa = 6 * L * L, vol = L * L * L, ratio = sa / vol;
          // 擴散時間 ∝ L²（分鐘，教學尺度）
          const diffMin = L * L / 900;
          // 細胞
          const cx = W * 0.27, cy = H * 0.46, r = L / 100 * H * 0.26 + H * 0.06;
          ctx.save();
          D.rect(ctx, cx - r, cy - r, r * 2, r * 2, { fill: "rgba(160,205,228,0.30)", stroke: "rgba(80,120,150,0.95)", width: 2, r: 10 });
          // 擴染深度示意（氧氣從表面擴入）
          const depth = Math.min(r * 0.9, r * (10 / L) * 2);
          D.rect(ctx, cx - r + 4, cy - r + 4, r * 2 - 8, r * 2 - 8, { fill: null });
          D.ring(ctx, cx, cy, Math.max(0, r - depth), "rgba(255,138,101,0.75)", 2, [5, 4]);
          ctx.restore();
          D.text(ctx, "邊長 " + L + " μm", cx, cy + r + 18, { color: PL.col("text-dim"), size: 11, align: "center" });
          D.text(ctx, depth < r ? "氧能擴散到全體" : "中心缺氧！", cx, cy, { color: depth < r ? "#66bb6a" : "#e57373", size: 12, align: "center", weight: "700" });
          // 數值卡
          CK.panel(ctx, W * 0.54, H * 0.16, W * 0.38, H * 0.60, "尺度計算");
          const rows = [["表面積 SA = 6L²", PL.fmt(sa, 0) + " μm²"], ["體積 V = L³", PL.fmt(vol, 0) + " μm³"], ["SA : V 比", PL.fmt(ratio, 2) + " μm⁻¹"], ["擴散到中心時間", PL.fmt(diffMin, 2) + " 分"]];
          rows.forEach(([k, v], i) => {
            D.text(ctx, k, W * 0.57, H * 0.28 + i * 30, { color: PL.col("text-dim"), size: 11 });
            D.text(ctx, v, W * 0.88, H * 0.28 + i * 30, { color: i === 2 || i === 3 ? PL.col("accent") : PL.col("text"), size: 12, align: "right", weight: i === 2 ? "700" : "" });
          });
          D.text(ctx, "結論：細胞變大 10 倍，交換效率只剩 1/10", W * 0.73, H * 0.70, { color: PL.col("warn"), size: 11, align: "center" });
          rSA.set(sa, 0); rV.set(vol, 0); rRatio.set(ratio, 2); rT.set(diffMin, 2);
        }
      });
      const lenS = PL.ui.slider(ui.L.controls, { label: "細胞邊長", min: 10, max: 100, step: 5, value: 20, unit: "μm", digits: 0 });
      PL.ui.note(ui.L.controls, "把邊長慢慢拉大：表面積比下降得很快，擴散時間以平方成長——這就是細胞必須微小的原因。");
      PL.ui.procedure(ui.L.controls, {
        title: "讀懂 SA : V",
        steps: [
          "邊長 10 μm 時記下 SA:V 與擴散時間。",
          "把邊長調到 50、100 μm，比較兩個讀數的變化幅度。",
          "確認：體積漲得比表面積快，比值因此下降。"
        ],
        rule: "細胞不會靠「變大」解決交換問題，只會靠「增加表面積」（根毛、絨毛、微絨毛）或「維持微小」。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "細菌尺度", apply: () => lenS.set(10) },
        { label: "一般細胞", apply: () => lenS.set(30) },
        { label: "大型細胞（卵）", apply: () => lenS.set(100) }
      ] });
      const rSA = PL.ui.readout(ui.L.readouts, { label: "表面積", unit: "μm²" });
      const rV = PL.ui.readout(ui.L.readouts, { label: "體積", unit: "μm³" });
      const rRatio = PL.ui.readout(ui.L.readouts, { label: "SA : V", unit: "μm⁻¹" });
      const rT = PL.ui.readout(ui.L.readouts, { label: "擴散到中心", unit: "分" });
      const chart = ui.chart("SA : V 隨尺度下降", "雙曲線下降：邊長加倍，比值減半。紅色虛線是氧氣擴散約 10 μm 的實用上限。");
      const drawChart = () => {
        CK.plot(chart, {
          x0: 10, x1: 100, y0: 0, y1: 0.7,
          xlabel: "邊長 L (μm)", ylabel: "SA:V (μm⁻¹)",
          series: [{ fn: L => 6 / L, color: PL.col("accent") }],
          marks: [{ dot: [lenS.get(), 6 / lenS.get()], color: PL.col("accent-2"), label: "目前" }]
        });
      };
      chart.onResize(drawChart);
      drawChart();
      root.addEventListener("input", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 細胞分化與組織層次 */
  PL.register("specialized-cells", {
    build(root) {
      const TYPES = {
        red: { name: "紅血球", feature: "雙凹圓盤、成熟後無核", job: "攜帶氧氣（血紅素）", fit: "沒有核→更多空間裝血紅素；雙凹→表面積大、擴散快" },
        neuron: { name: "神經元", feature: "長軸突＋髓鞘＋樹突", job: "長距離快速傳遞訊號", fit: "髓鞘讓傳導跳躍加速；長軸突直達目標" },
        muscle: { name: "肌肉細胞", feature: "長條形、富含粒線體與收縮蛋白", job: "收縮產生力量", fit: "大量粒線體供應收縮所需的 ATP" },
        palisade: { name: "葉肉細胞", feature: "柱狀、填滿葉綠體", job: "行光合作用", fit: "柱狀排列讓光能被上層充分吸收" },
        roothair: { name: "根毛細胞", feature: "向外突出細長管狀", job: "吸收水分與無機鹽", fit: "突出大幅增加與土壤接觸的表面積" }
      };
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const key = typeSel.get(), c = TYPES[key];
          const mag = magS.get();
          const zoom = 0.6 + mag / 500;
          CK.panel(ctx, W * 0.04, H * 0.10, W * 0.52, H * 0.76, c.name + "（放大示意）");
          const cx = W * 0.30, cy = H * 0.48;
          if (key === "red") {
            for (let i = 0; i < 3; i++) CK.cellBody(ctx, cx - 40 * i * zoom * 0.5 + 30, cy + (i % 2 - 1) * 24, 30 * zoom, { type: "red" });
          } else if (key === "neuron") {
            CK.neuron(ctx, W * 0.10, W * 0.50, cy, { pulse: (t * 0.25) % 1.4 - 0.2 });
          } else if (key === "muscle") {
            for (let i = 0; i < 3; i++) {
              D.rect(ctx, W * 0.10, cy - 34 + i * 26, W * 0.40, 16, { fill: "rgba(220,90,80,0.45)", stroke: "rgba(150,40,40,0.8)", width: 1.4, r: 8 });
              for (let k = 0; k < 10; k++) D.disc(ctx, W * 0.12 + k * 20, cy - 26 + i * 26, 2.4, { fill: "#ef8829" });
            }
            D.text(ctx, "橫紋＝收縮蛋白整齊排列", W * 0.30, cy + 44, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          } else if (key === "palisade") {
            for (let i = 0; i < 4; i++) {
              const x = W * 0.14 + i * 34 * zoom * 0.8;
              D.rect(ctx, x, cy - 46, 22 * zoom, 92, { fill: "rgba(76,175,80,0.5)", stroke: "rgba(40,110,45,0.7)", width: 1.4, r: 8 });
              CK.chloroplast(ctx, x + 8 * zoom, cy - 20, 7 * zoom, { time: t, excited: true });
              CK.chloroplast(ctx, x + 14 * zoom, cy + 14, 7 * zoom, { time: t, excited: true });
            }
          } else {
            D.rect(ctx, W * 0.10, cy - 8, W * 0.34, 16, { fill: "rgba(150,200,220,0.3)", stroke: "rgba(80,120,150,0.9)", width: 1.6, r: 4 });
            for (let i = 0; i < 4; i++) {
              const x = W * 0.14 + i * 40;
              D.rect(ctx, x, cy + 6, 6, 60 * zoom, { fill: "rgba(150,200,220,0.35)", stroke: "rgba(80,120,150,0.9)", width: 1.4, r: 3 });
            }
            D.text(ctx, "突出物＝根毛", W * 0.30, cy + 86, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          }
          CK.panel(ctx, W * 0.60, H * 0.16, W * 0.34, H * 0.62, "形態與功能");
          D.text(ctx, c.name, W * 0.77, H * 0.26, { color: PL.col("accent"), size: 14, align: "center", weight: "700" });
          D.text(ctx, "特徵：" + c.feature, W * 0.77, H * 0.36, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          D.text(ctx, "功能：" + c.job, W * 0.77, H * 0.46, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          D.text(ctx, "適應：" + c.fit, W * 0.77, H * 0.58, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          rName.set(c.name); rFeat.set(c.feature); rJob.set(c.job);
        }
      });
      const typeSel = PL.ui.select(ui.L.controls, { label: "特化細胞", value: "red", options: Object.keys(TYPES).map(k => ({ value: k, label: TYPES[k].name })) });
      const magS = PL.ui.slider(ui.L.controls, { label: "放大倍率", min: 100, max: 600, step: 50, value: 200, unit: "×", digits: 0 });
      PL.ui.note(ui.L.controls, "分化不是基因改變，而是基因選擇性表現：每種細胞都有全套基因，只是開啟的部分不同。");
      PL.ui.procedure(ui.L.controls, {
        title: "從形態推功能",
        steps: [
          "先描述形狀與內部構造（有沒有核、什麼胞器多）。",
          "再猜它的功能，最後用右側資料驗證。",
          "歸納一句：形態與功能是互相配合的。"
        ],
        rule: "看形態猜功能是生物學的基本功：表面積大→交換或吸收；體積大→儲存；形狀長→傳導或支撐。"
      });
      const rName = PL.ui.readout(ui.L.readouts, { label: "細胞類型" });
      const rFeat = PL.ui.readout(ui.L.readouts, { label: "形態特徵" });
      const rJob = PL.ui.readout(ui.L.readouts, { label: "對應功能" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 細胞週期與有絲分裂 */
  PL.register("cell-cycle", {
    build(root) {
      const STAGES = {
        g1: { name: "G1（生長）", dna: 2, chrom: 4, prog: 0, desc: "細胞成長，蛋白質與胞器複製" },
        s: { name: "S（複製）", dna: 4, chrom: 4, prog: 0.5, desc: "DNA 複製：染色質完成半保留複製" },
        g2: { name: "G2（準備）", dna: 4, chrom: 4, prog: 0, desc: "確認複製無誤，合成分裂所需蛋白" },
        prophase: { name: "前期", dna: 4, chrom: 4, prog: 1, desc: "染色質凝縮成染色體、紡錘絲形成、核膜消失" },
        metaphase: { name: "中期", dna: 4, chrom: 4, prog: 1, desc: "染色體排在赤道板，著絲點連紡錘絲" },
        anaphase: { name: "後期", dna: 4, chrom: 8, prog: 1, desc: "姊妹染色體分離，被拉向兩極" },
        telophase: { name: "末期", dna: 2, chrom: 8, prog: 1, desc: "核膜重建、細胞膜凹陷，兩個子細胞形成" }
      };
      const ORDER = ["g1", "s", "g2", "prophase", "metaphase", "anaphase", "telophase"];
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const stage = stageSel.get(), st = STAGES[stage];
          const adv = advS.get();
          CK.panel(ctx, W * 0.05, H * 0.10, W * 0.52, H * 0.76, st.name);
          const cx = W * 0.31, cy = H * 0.48, r = H * 0.30;
          const dividing = stage === "telophase";
          const sep = dividing ? adv * r * 0.9 : 0;
          // 細胞（末期畫兩顆）
          for (const s of [-1, 1]) {
            const ox = cx + s * sep / 2;
            ctx.save();
            ctx.beginPath();
            for (let i = 0; i <= 40; i++) {
              const a = i / 40 * TAU;
              const sq = dividing ? 0.75 : 1;
              ctx.lineTo(ox + Math.cos(a) * r, cy + Math.sin(a) * r * sq);
            }
            ctx.closePath();
            ctx.fillStyle = "rgba(160,205,228,0.28)"; ctx.fill();
            ctx.strokeStyle = "rgba(80,120,150,0.95)"; ctx.lineWidth = 1.8; ctx.stroke();
            ctx.restore();
          }
          // 染色體
          const nChrom = st.prog ? 4 : 4;
          const twoSisters = st.prog === 1 && stage !== "telophase";
          const positions = stage === "metaphase"
            ? [-0.5, -0.2, 0.2, 0.5].map(f => [cx + f * r, cy])
            : [[cx - r * 0.4, cy - r * 0.3], [cx + r * 0.35, cy - r * 0.25], [cx - r * 0.35, cy + r * 0.3], [cx + r * 0.4, cy + r * 0.28]];
          // 紡錘絲：隨階段推進從兩極長出
          ctx.save();
          ctx.strokeStyle = "rgba(140,170,200," + 0.15 + adv * 0.75 + ")"; ctx.lineWidth = 1.4;
          [-1, 1].forEach(side => positions.forEach(p => {
            ctx.beginPath();
            ctx.moveTo(cx + side * r * 0.95, cy);
            ctx.lineTo(p[0] + (stage === "anaphase" ? (p[0] > cx ? 1 : -1) * adv * r * 0.55 : 0), p[1]);
            ctx.stroke();
          }));
          ctx.restore();
          positions.forEach((p, i) => {
            const pull = stage === "anaphase" ? (i % 2 ? 1 : -1) * adv * r * 0.55 : 0;
            CK.chromosome(ctx, p[0] + pull, p[1], r * 0.16 * (0.82 + adv * 0.28), { color: i % 2 ? "#b388ff" : "#7c9cff", single: st.prog === 0 });
          });
          if (stage === "prophase") D.text(ctx, "紡錘絲開始形成", cx, cy + r + 16, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          if (dividing) D.text(ctx, "兩個子細胞，遺傳物質各 2n", cx, cy + r + 16, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          // 狀態卡
          CK.panel(ctx, W * 0.61, H * 0.16, W * 0.33, H * 0.60, "階段資訊");
          D.text(ctx, st.name, W * 0.775, H * 0.26, { color: PL.col("accent"), size: 14, align: "center", weight: "700" });
          D.text(ctx, st.desc, W * 0.775, H * 0.36, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          D.text(ctx, "DNA 含量 " + st.dna + "c", W * 0.775, H * 0.47, { color: st.dna === 4 ? "#ef8829" : "#66bb6a", size: 12, align: "center", weight: "700" });
          D.text(ctx, "染色體（著絲點）數 " + st.chrom, W * 0.775, H * 0.55, { color: PL.col("text-dim"), size: 11, align: "center" });
          rStage.set(st.name); rDNA.set(st.dna, 0); rChrom.set(st.chrom, 0);
          rEvent.set(st.desc);
          rProg.set(Math.round(adv * 100), 0);
          rSpindle.set(adv < 0.2 ? "未成形" : adv < 0.7 ? "延伸中" : "完整");
        }
      });
      const stageSel = PL.ui.select(ui.L.controls, { label: "階段", value: "g1", options: ORDER.map(k => ({ value: k, label: STAGES[k].name })) });
      const advS = PL.ui.slider(ui.L.controls, { label: "階段推進", min: 0, max: 1, step: 0.05, value: 0.5, digits: 2 });
      PL.ui.note(ui.L.controls, "間期（G1、S、G2）細胞看起來平靜，其實 S 期正在複製 DNA——前期之前 DNA 含量就加倍了。");
      PL.ui.procedure(ui.L.controls, {
        title: "追蹤 DNA 與染色體",
        steps: [
          "從 G1 推進到 S：DNA 含量從 2c 變 4c，但染色體數不變。",
          "在前期：染色質凝縮成可見的 X 形染色體（兩條姊妹染色單體）。",
          "中期排在赤道板，後期姊妹分離——<b>此時</b>染色體數才加倍。",
          "末期細胞一分為二，每個子細胞回到 2n、2c。"
        ],
        rule: "染色體數目數的是「著絲點」：複製後著絲點未分開仍算 4 條，後期分離後才是 8 條。"
      });
      PL.ui.presets(ui.L.controls, { label: "跳到", options: [
        { label: "S 期", apply: () => { stageSel.set("s"); advS.set(0.5); } },
        { label: "中期", apply: () => { stageSel.set("metaphase"); advS.set(1); } },
        { label: "末期", apply: () => { stageSel.set("telophase"); advS.set(1); } }
      ] });
      const rStage = PL.ui.readout(ui.L.readouts, { label: "階段" });
      const rDNA = PL.ui.readout(ui.L.readouts, { label: "DNA 含量", unit: "c" });
      const rChrom = PL.ui.readout(ui.L.readouts, { label: "染色體數" });
      const rEvent = PL.ui.readout(ui.L.readouts, { label: "階段事件" });
      const rProg = PL.ui.readout(ui.L.readouts, { label: "階段完成度", unit: "%" });
      const rSpindle = PL.ui.readout(ui.L.readouts, { label: "紡錘絲" });
      const chart = ui.chart("DNA 含量與染色體數", "階梯狀的 DNA 曲線：S 期倍增、末期分家。染色體數只在後期突然加倍。");
      const drawChart = () => {
        const idx = ORDER.indexOf(stageSel.get());
        const pts = [];
        ORDER.forEach((k, i) => {
          pts.push([i, STAGES[k].dna]);
          if (i < ORDER.length - 1) pts.push([i + 1, STAGES[k].dna]);
        });
        CK.plot(chart, {
          x0: -0.2, x1: 6.2, y0: 0, y1: 10, xticks: [0, 1, 2, 3, 4, 5, 6], yticks: [2, 4, 6, 8],
          xlabel: "階段順序", ylabel: "DNA (c) / 染色體數",
          series: [{ pts, color: PL.col("accent") }],
          marks: [{ dot: [idx, STAGES[stageSel.get()].dna], color: PL.col("accent-2"), label: "目前" }]
        });
      };
      chart.onResize(drawChart);
      drawChart();
      root.addEventListener("input", drawChart);
      root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });
})();
