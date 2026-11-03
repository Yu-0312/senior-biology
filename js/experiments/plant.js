/* 模組五 · 植物的構造與生理 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, CK = window.BioLab, D = PL.draw;
  const { clamp, lerp, TAU } = PL;

  // 穩定偽隨機:同一個索引每次都回同一個值,粒子才不會每格亂跳
  function rnd(i) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  /* 根的構造與水分吸收 */
  PL.register("root-structure", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const hair = hairS.get(), soil = soilS.get();
          const area = 1 + hair * 11, flux = (soil - 0.2) * (0.5 + hair * 0.9), rate = Math.max(0, flux) * 36;
          const x0 = W * 0.31, x1 = W * 0.47, y0 = H * 0.16, y1 = H * 0.84, xc = (x0 + x1) / 2;
          [[W * 0.04, x0], [x1, W * 0.60]].forEach(([sx, ex], side) => {
            D.rect(ctx, sx, y0 * 0.82, ex - sx, y1 - y0 * 0.82, { fill: "rgba(122,92,62," + (0.20 + soil * 0.28) + ")", stroke: "rgba(110,82,52,0.55)", r: 8 });
            for (let i = 0; i < 30; i++) {
              const px = sx + 8 + rnd(i * 3 + side * 91) * (ex - sx - 16), py = y0 * 0.82 + 10 + rnd(i * 7 + side * 37) * (y1 - y0 * 0.82 - 20);
              D.disc(ctx, px, py, 2 + rnd(i + 5) * 2.4, { fill: soil > 0.35 ? "rgba(88,64,40,0.65)" : "rgba(130,110,90,0.5)" });
            }
          });
          // 根的同心帶:表皮 → 皮層 → 內鞘(卡氏帶) → 木質部
          D.rect(ctx, x0, y0, x1 - x0, y1 - y0, { fill: "rgba(214,188,150,0.5)", stroke: "rgba(122,88,50,0.95)", width: 2, r: 10 });
          D.rect(ctx, x0 + 8, y0 + 6, x1 - x0 - 16, y1 - y0 - 12, { fill: "rgba(168,196,140,0.42)", r: 8 });
          D.rect(ctx, x0 + 26, y0 + 12, x1 - x0 - 52, y1 - y0 - 24, { stroke: "rgba(196,150,40,0.95)", width: 2, dash: [5, 3], r: 6 });
          D.rect(ctx, xc - 9, y0 + 4, 18, y1 - y0 - 8, { fill: "rgba(126,166,190,0.75)", stroke: "rgba(70,110,140,0.9)", width: 1.4, r: 8 });
          // 根毛:密度與長度都由滑桿驅動
          const n = Math.round(hair * 11), hl = 8 + hair * 22;
          for (let i = 0; i < n; i++) {
            const hy = y0 + 18 + i * (y1 - y0 - 34) / Math.max(1, n - 1);
            D.line(ctx, x0, hy, x0 - hl, hy - 4, "rgba(206,178,132,0.95)", 1.8);
            D.line(ctx, x1, hy + 9, x1 + hl, hy + 13, "rgba(206,178,132,0.95)", 1.8);
          }
          // 水分子:先橫向進根,再沿木質部往上;土壤太乾時流向反轉
          const flow = clamp(flux * 1.4, -1, 1), up = flux > 0.005;
          for (let i = 0; i < 8; i++) {
            const p = ((t * 0.35 * flow + i / 8) % 1 + 1) % 1, ry = y0 + 26 + i * (y1 - y0 - 52) / 7;
            const tipX = i % 2 ? x1 + hl : x0 - hl;
            if (p < 0.42) D.disc(ctx, lerp(tipX, xc, p / 0.42), ry, 2.6, { fill: "rgba(90,170,230,0.9)" });
            else D.disc(ctx, xc, lerp(ry, y0 - 4, (p - 0.42) / 0.58), 2.6, { fill: "rgba(90,170,230,0.9)" });
          }
          CK.arrow(ctx, xc, y0 - (up ? 12 : 16 + Math.abs(flux) * 30), xc, y0 - (up ? 16 + flux * 30 : 12), up ? "#5aa2e0" : "#e57373", up ? "往上送給莖" : "水分倒流!");
          D.text(ctx, "木質部", xc, y0 - 6, { color: "#4a88ad", size: 9.5, align: "center" });
          D.text(ctx, "卡氏帶", x0 + 30, y0 + 26, { color: "rgba(150,115,25,0.95)", size: 9.5 });
          CK.meter(ctx, W * 0.05, H * 0.885, W * 0.24, 9, soil, { color: "#5aa2e0", label: "土壤含水量" });
          CK.meter(ctx, W * 0.34, H * 0.885, W * 0.24, 9, hair, { color: "#8bc34a", label: "根毛密度(相對)" });
          CK.panel(ctx, W * 0.64, H * 0.14, W * 0.33, H * 0.66, "水分進根的路徑");
          const steps = [["1", "表皮(根毛)", "滲透進入:根細胞液比土壤濃"], ["2", "皮層", "經細胞壁與細胞間隙接力"],
            ["3", "內鞘", "卡氏帶擋住壁內路,改走共質體"], ["4", "木質部", "導管接手,靠蒸散拉力往上"]];
          steps.forEach(([no, nm, de], i) => {
            const yy = H * 0.25 + i * H * 0.115;
            D.disc(ctx, W * 0.68, yy, 8, { fill: PL.col("accent") });
            D.text(ctx, no, W * 0.68, yy + 3.5, { color: "#fff", size: 10, align: "center", weight: "700" });
            D.text(ctx, nm, W * 0.715, yy - 2, { color: PL.col("text"), size: 11.5, weight: "700" });
            D.text(ctx, de, W * 0.715, yy + 11, { color: PL.col("text-dim"), size: 9.5 });
          });
          CK.badge(ctx, W * 0.805, H * 0.71, "根毛把吸收面積放大 " + PL.fmt(area, 1) + " 倍", "#5f9e50");
          rArea.set(area, 1); rFlux.set(rate, 1);
          rDir.set(flux > 0.005 ? "土壤 → 根(吸水)" : flux < -0.005 ? "根 → 土壤(失水!)" : "進出平衡");
          rLim.set(soil < 0.2 ? "土壤水勢太低" : hair < 0.2 ? "根毛太少,接觸面不足" : "通暢");
          vd.set(flux > 0.005 ? "根部滲壓高於土壤:淨吸水,蒸散再把水往上拉" : flux < -0.005 ? "土壤太乾:根反而失水,植株萎凋" : "水分進出平衡",
            flux > 0.005 ? "ok" : flux < -0.005 ? "bad" : "info");
        }
      });
      const hairS = PL.ui.slider(ui.L.controls, { label: "根毛密度", min: 0, max: 1, step: 0.05, value: 0.7, digits: 2 });
      const soilS = PL.ui.slider(ui.L.controls, { label: "土壤含水量", min: 0, max: 1, step: 0.05, value: 0.65, digits: 2 });
      PL.ui.note(ui.L.controls, "根毛長在成熟部的表皮,不是根尖;吸水靠「根部滲壓 > 土壤水勢」,把水送上樹則靠蒸散拉力。");
      PL.ui.procedure(ui.L.controls, { title: "看懂水分怎麼進根",
        steps: ["把根毛密度歸零,記下面積倍率與吸水速率,再拉回 0.7 比較。", "土壤含水量拉到 0.1:注意箭頭反轉、水分開始倒流。", "對照右側路徑圖,說出水經過的四個構造與各自的角色。"],
        rule: "拔種苗時扯斷的是根毛——吸水能力立刻大減,這就是移植後要遮陰並充分澆水的原因。" });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "剛發芽", apply: () => { hairS.set(0.15); soilS.set(0.75); ui.redraw(); } },
        { label: "成熟植株", apply: () => { hairS.set(0.85); soilS.set(0.6); ui.redraw(); } },
        { label: "乾旱土壤", apply: () => { hairS.set(0.8); soilS.set(0.1); ui.redraw(); } }
      ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "水分收支" });
      const rArea = PL.ui.readout(ui.L.readouts, { label: "相對吸收面積", unit: "×" }), rFlux = PL.ui.readout(ui.L.readouts, { label: "淨吸水速率", unit: "g/h" });
      const rDir = PL.ui.readout(ui.L.readouts, { label: "水分流向" }), rLim = PL.ui.readout(ui.L.readouts, { label: "目前限制" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 莖的運輸:木質部與韌皮部 */
  PL.register("stem-transport", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const trans = transS.get(), hrs = timeS.get(), girdle = girdleC.get();
          const xylX = W * 0.21, phlX = W * 0.34, tw = W * 0.05, yT = H * 0.20, yB = H * 0.78, yCut = (yT + yB) / 2;
          // 葉(源)與根(庫)
          ctx.save();
          ctx.fillStyle = "rgba(76,175,80,0.75)";
          ctx.beginPath(); ctx.ellipse(W * 0.275, H * 0.115, W * 0.18, H * 0.075, 0, 0, TAU); ctx.fill();
          ctx.strokeStyle = "rgba(40,110,45,0.9)"; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore();
          D.text(ctx, "葉(源):光合造糖", W * 0.275, H * 0.028, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          ctx.save();
          ctx.fillStyle = "rgba(206,178,132,0.75)";
          ctx.beginPath(); ctx.ellipse(W * 0.275, H * 0.87, W * 0.13, H * 0.06, 0, 0, TAU); ctx.fill();
          ctx.strokeStyle = "rgba(122,88,50,0.95)"; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore();
          D.text(ctx, "根(庫):儲存與消耗糖", W * 0.275, H * 0.955, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          // 兩條運輸管與方向箭頭
          D.rect(ctx, xylX - tw / 2, yT, tw, yB - yT, { fill: "rgba(126,166,190,0.45)", stroke: "rgba(70,110,140,0.9)", width: 1.6, r: 8 });
          D.rect(ctx, phlX - tw / 2, yT, tw, yB - yT, { fill: "rgba(239,152,74,0.35)", stroke: "rgba(170,100,20,0.9)", width: 1.6, r: 8 });
          CK.arrow(ctx, xylX - tw / 2 - 12, H * 0.70, xylX - tw / 2 - 12, H * 0.70 - (18 + trans * 40), "#5aa2e0", "");
          D.text(ctx, "水↑", xylX - tw / 2 - 12, H * 0.745, { color: "#4a88ad", size: 9.5, align: "center" });
          CK.arrow(ctx, phlX + tw / 2 + 12, yT + (girdle ? 24 : 54), phlX + tw / 2 + 12, yT + 14, girdle ? "#c0392b" : "#ef8829", "");
          D.text(ctx, girdle ? "糖 ✕" : "糖↓", phlX + tw / 2 + 12, yT + 8, { color: girdle ? "#c0392b" : "#b06a14", size: 9.5, align: "center" });
          // 導管水流(上)、篩管糖流(下;環剝時在切口上方打轉)
          for (let i = 0; i < 7; i++) {
            const p = ((t * (0.10 + trans * 0.3) + i / 7) % 1 + 1) % 1;
            D.disc(ctx, xylX + Math.sin(t * 2.4 + i * 2.1) * 3, lerp(yB - 6, yT + 6, p), 2.8, { fill: "rgba(120,196,240,0.95)" });
          }
          for (let i = 0; i < 6; i++) {
            const raw = ((t * 0.10 + i / 6) % 1 + 1) % 1, f = girdle ? (raw < 0.5 ? raw * 2 : 2 - raw * 2) : raw;
            D.disc(ctx, phlX + Math.sin(t * 2 + i * 1.9) * 3, lerp(yT + 6, girdle ? yCut - 6 : yB - 6, f), 2.8, { fill: "rgba(255,183,77,0.95)" });
          }
          if (girdle) {
            ctx.save();
            ctx.strokeStyle = "#c0392b"; ctx.lineWidth = 2.6; ctx.lineCap = "round";
            ctx.beginPath();
            for (let i = 0; i <= 6; i++) ctx.lineTo(phlX - tw / 2 - 2 + i * (tw + 4) / 6, yCut + (i % 2 ? -5 : 5));
            ctx.stroke(); ctx.restore();
            const pile = Math.min(14, Math.floor(hrs * 2));
            for (let i = 0; i < pile; i++) D.disc(ctx, phlX + (i % 2 ? 6 : -6), yCut - 12 - Math.floor(i / 2) * 6, 2.8, { fill: "rgba(255,183,77,0.95)" });
            CK.badge(ctx, phlX + tw, yCut - 12, "環剝", "#c0392b");
          }
          CK.meter(ctx, W * 0.045, H * 0.30, W * 0.10, 8, clamp(trans * hrs * 0.3, 0, 1), { color: "#5aa2e0", label: "已送達的水" });
          const rootSugar = girdle ? 0.05 : clamp(hrs * 0.18, 0, 1);
          CK.meter(ctx, W * 0.46, H * 0.885, W * 0.30, 9, rootSugar, { color: "#ef8829", label: "根部糖分存量" });
          // 右側:兩套系統對照
          CK.panel(ctx, W * 0.44, H * 0.14, W * 0.53, H * 0.62, "兩套運輸系統,方向與構造都不同");
          const rows = [
            ["導管(木質部)", "死細胞連成的空管;水與無機鹽「由根往上」單向送,靠蒸散拉力", "#5aa2e0"],
            ["篩管(韌皮部)", "活細胞,需伴細胞供能;有機養分「雙向」,從源送到庫", "#ef8829"],
            ["形成層", "向外長出新韌皮部、向內長新木質部,莖才能逐年變粗", "#81c784"],
            ["年輪", "形成層季節性活動的紀錄:春材寬疏、秋材窄密,一圈一年", "#bcaaa4"]
          ];
          rows.forEach(([nm, de, c], i) => {
            const yy = H * 0.235 + i * H * 0.125;
            D.disc(ctx, W * 0.475, yy, 5, { fill: c });
            D.text(ctx, nm, W * 0.50, yy - 1, { color: PL.col("text"), size: 11.5, weight: "700" });
            D.text(ctx, de, W * 0.50, yy + 13, { color: PL.col("text-dim"), size: 9.5 });
          });
          rWater.set(trans * 85, 0); rSugar.set(girdle ? "中斷(切口上方堆積)" : "葉 → 根");
          rPile.set(girdle ? hrs * 1.6 : 0, 1); rRoot.set(Math.round(rootSugar * 100), 0);
          vd.set(girdle ? "環剝切斷韌皮部:糖堆在切口上方,根得不到養分會先餓死" : "木質部往上送水、韌皮部把糖送往庫,雙系統各司其職", girdle ? "bad" : "ok");
        }
      });
      const transS = PL.ui.slider(ui.L.controls, { label: "蒸散拉力", min: 0, max: 1, step: 0.05, value: 0.7, digits: 2 });
      const timeS = PL.ui.slider(ui.L.controls, { label: "觀察時間", min: 0, max: 8, step: 0.5, value: 2, unit: "小時", digits: 1 });
      const girdleC = PL.ui.checkbox(ui.L.controls, { label: "環剝實驗(切斷韌皮部)", checked: false, onChange: () => ui.redraw() });
      PL.ui.note(ui.L.controls, "導管是死細胞連成的空心管,水靠蒸散拉力被動上升;篩管是活細胞,糖的裝卸需要伴細胞供能。");
      PL.ui.procedure(ui.L.controls, { title: "分清楚兩條路",
        steps: ["正常狀態:確認藍色水往上、橘色糖往下,方向相反。", "只拉「蒸散拉力」,看水流速率與「已送達的水」怎麼變。", "勾選「環剝實驗」再拉「觀察時間」:糖粒堆積在哪一側?根部糖分呢?"],
        rule: "環剝後樹不會立刻死(木質部還在送水),但根會先餓死——「往上送水」和「往下送糖」走的是兩條不同的路。" });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "正午強蒸散", apply: () => { transS.set(0.95); timeS.set(2); girdleC.set(false); ui.redraw(); } },
        { label: "夜間低蒸散", apply: () => { transS.set(0.12); timeS.set(2); girdleC.set(false); ui.redraw(); } },
        { label: "環剝 6 小時", apply: () => { girdleC.set(true); timeS.set(6); ui.redraw(); } }
      ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "運輸狀態" });
      const rWater = PL.ui.readout(ui.L.readouts, { label: "水流速率", unit: "cm/h" }), rSugar = PL.ui.readout(ui.L.readouts, { label: "糖的運輸" });
      const rPile = PL.ui.readout(ui.L.readouts, { label: "環剝上方堆積", unit: "g" }), rRoot = PL.ui.readout(ui.L.readouts, { label: "根部糖分", unit: "%" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 蒸散作用與氣孔調節 */
  PL.register("transpiration", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const light = lightS.get(), hum = humS.get(), soil = soilS.get();
          const open = clamp(light * lerp(0.35, 1.25, soil), 0, 1);
          const rate = open * (1 - hum) * 46, bal = soil * 30 - rate;   // 蒸散速率與(吸水−失水)
          const leaf = CK.leafCross(ctx, { x: W * 0.06, y: H * 0.18, w: W * 0.56, h: H * 0.56 }, { open, stomata: 4, seed: 7 });
          const sx = W * 0.87, sy = H * 0.10;
          D.disc(ctx, sx, sy, 10 + light * 7, { fill: "#ffd54f", glow: "rgba(255,213,79," + (0.2 + light * 0.5) + ")", glowSize: 24 + light * 40 });
          for (let i = 0; i < 3; i++) {
            D.line(ctx, sx - 8 - i * 10, sy + 10, sx - 8 - i * 10 - light * 70, sy + 10 + light * 34, "rgba(255,213,79," + (0.25 + light * 0.55) + ")", 1.6, [6, 5]);
          }
          // 水蒸氣由下表皮的氣孔散出(氣孔本來就多在下表皮)
          const nV = Math.round(clamp(rate / 4, 0, 9));
          leaf.stomata.forEach((st, si) => {
            for (let i = 0; i < nV; i++) {
              const p = ((t * (0.25 + rate * 0.012) + i * 0.21 + si * 0.37) % 1 + 1) % 1;
              D.disc(ctx, st.x + Math.sin(p * 7 + i) * 5, st.y + 6 + p * H * 0.13, 1.8 + p * 2.6, { fill: "rgba(160,210,240," + (0.7 - p * 0.5) + ")" });
            }
          });
          CK.arrow(ctx, W * 0.035, H * 0.88, W * 0.035, H * 0.76, "#5aa2e0", "");
          D.text(ctx, "來自根的水", W * 0.035, H * 0.93, { color: "#4a88ad", size: 9.5, align: "center" });
          CK.meter(ctx, W * 0.06, H * 0.905, W * 0.24, 9, open, { color: "#66bb6a", label: "氣孔開度" });
          CK.meter(ctx, W * 0.36, H * 0.905, W * 0.24, 9, rate / 46, { color: "#4fc3f7", label: "蒸散相對速率" });
          CK.panel(ctx, W * 0.66, H * 0.14, W * 0.31, H * 0.64, "氣孔怎麼調");
          const rows = [["吸水膨脹", "保衛細胞吸水 → 氣孔張開", "#66bb6a"], ["缺水關閉", "根部缺水 → ABA(保水素) → 關閉", "#e57373"],
            ["夜間多半關", "沒有光,CO₂ 用不到,順便保水", "#9575cd"], ["分布原則", "氣孔集中在葉下表皮,減少直射失水", "#4fc3f7"]];
          rows.forEach(([nm, de, c], i) => {
            const yy = H * 0.245 + i * H * 0.125;
            D.disc(ctx, W * 0.695, yy, 5, { fill: c });
            D.text(ctx, nm, W * 0.72, yy - 1, { color: PL.col("text"), size: 11.5, weight: "700" });
            D.text(ctx, de, W * 0.72, yy + 13, { color: PL.col("text-dim"), size: 9.5 });
          });
          rOpen.set(open * 100, 0); rRate.set(rate, 1); rBal.set(bal, 1);
          rGuard.set(open > 0.3 ? "膨壓高,撐開氣孔" : open > 0.1 ? "半失水,氣孔半開" : "失水皺縮,氣孔關閉");
          const dry = bal < -3, dark = open < 0.15 && light > 0.5;
          vd.set(dry ? "失水 > 吸水:植株開始萎凋,氣孔被迫關閉" : dark ? "氣孔幾乎全閉:保住了水,但 CO₂ 也進不來" : "得失平衡:蒸散拉力持續把整株水柱往上拉", dry ? "bad" : dark ? "warn" : "ok");
        }
      });
      const lightS = PL.ui.slider(ui.L.controls, { label: "光照強度", min: 0, max: 1, step: 0.05, value: 0.75, digits: 2 });
      const humS = PL.ui.slider(ui.L.controls, { label: "相對濕度", min: 0.1, max: 0.95, step: 0.05, value: 0.5, digits: 2 });
      const soilS = PL.ui.slider(ui.L.controls, { label: "土壤水分", min: 0, max: 1, step: 0.05, value: 0.7, digits: 2 });
      PL.ui.note(ui.L.controls, "蒸散速率 ∝ 氣孔開度 ×(葉內濕 − 葉外濕):開度由光與水共同決定,內外濕度差是擴散的動力。");
      PL.ui.procedure(ui.L.controls, { title: "兩難的門",
        steps: ["光照歸零(模擬夜晚):氣孔開度變多少?蒸散呢?", "把土壤水分拉到 0.15:看保衛細胞讀數與開度怎麼被逼著關閉。", "固定光照與土壤水分,把濕度由 0.9 降到 0.3,比較蒸散速率。"],
        rule: "缺水時關閉氣孔是兩難:保水成功,光合卻停擺——因為 CO₂ 和水汽走同一扇門。" });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "正午乾燥", apply: () => { lightS.set(1); humS.set(0.25); soilS.set(0.5); ui.redraw(); } },
        { label: "陰雨高濕", apply: () => { lightS.set(0.25); humS.set(0.9); soilS.set(0.9); ui.redraw(); } },
        { label: "乾旱警報", apply: () => { lightS.set(0.85); humS.set(0.4); soilS.set(0.12); ui.redraw(); } }
      ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "水分平衡" });
      const rOpen = PL.ui.readout(ui.L.readouts, { label: "氣孔開度", unit: "%" }), rRate = PL.ui.readout(ui.L.readouts, { label: "蒸散速率", unit: "g/h" });
      const rBal = PL.ui.readout(ui.L.readouts, { label: "吸水 − 失水", unit: "g/h" }), rGuard = PL.ui.readout(ui.L.readouts, { label: "保衛細胞" });
      const chart = ui.chart("光照與蒸散", "橘線:濕度 40%、藍線:濕度 85%(土壤水分同為目前值)。濕度越低、同樣光照蒸散越快。");
      const drawChart = () => {
        const soil = soilS.get(), hum = humS.get();
        CK.plot(chart, {
          x0: 0, x1: 1, y0: 0, y1: 46, xticks: [0.25, 0.5, 0.75, 1], yticks: [10, 20, 30, 40],
          xlabel: "光照強度", ylabel: "蒸散速率 (g/h)",
          series: [
            { fn: x => clamp(x * lerp(0.35, 1.25, soil), 0, 1) * 0.6 * 46, color: "#ef8829" },
            { fn: x => clamp(x * lerp(0.35, 1.25, soil), 0, 1) * 0.15 * 46, color: "#5aa2e0" }
          ],
          marks: [{ dot: [lightS.get(), clamp(lightS.get() * lerp(0.35, 1.25, soil), 0, 1) * (1 - hum) * 46], color: PL.col("accent-2"), label: "目前" }]
        });
      };
      chart.onResize(drawChart);
      drawChart();
      root.addEventListener("input", drawChart);
      root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 葉的構造與光合適應 */
  PL.register("leaf-structure", {
    build(root) {
      const FOCUS = {
        palisade: ["柵狀組織", "光合主場:細胞緊密如柱、葉綠體最多,搶先吸收上層陽光"],
        spongy: ["海綿組織", "氣體交換:細胞疏鬆、空隙多,CO₂ 在細胞間自由擴散"],
        epidermis: ["表皮與角質層", "最外層防水防傷:角質層減少失水,氣孔是唯一門戶"],
        vein: ["葉脈", "運輸幹道:木質部把水送進葉,韌皮部把糖運走"],
        stoma: ["氣孔與保衛細胞", "可開關的門:保衛細胞吸水→開,失水→關"]
      };
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const light = lightS.get(), open = openS.get(), key = focusSel.get();
          const box = { x: W * 0.08, y: H * 0.20, w: W * 0.54, h: H * 0.60 };
          const photo = clamp(Math.min(light * 1.15, open * 0.9 + 0.06), 0, 1);
          const leaf = CK.leafCross(ctx, box, { open, stomata: 3, seed: 5 });
          const epH = box.h * 0.12, palH = box.h * 0.34, spoH = box.h * 0.34;
          const yCut = box.y + 2, yUp = yCut + 3, yPal = yUp + epH, ySpo = yPal + palH, yLow = ySpo + spoH;
          // 光線:大部分被柵狀組織攔下;葉綠體在強光下發亮
          for (let i = 0; i < 4; i++) {
            const lx = box.x + box.w * (0.16 + i * 0.22);
            D.line(ctx, lx, H * 0.06, lx, lerp(box.y, yPal + palH * 0.75, 0.3 + light * 0.65), "rgba(255,213,79," + (0.2 + light * 0.6) + ")", 1.6 + light * 1.8, [7, 5]);
          }
          if (light > 0.15) for (let i = 0; i < 6; i++) {
            D.disc(ctx, box.x + box.w * (0.09 + i * 0.165), yPal + palH * (0.32 + (i % 2) * 0.3), 3.5 + light * 3.5, { fill: "rgba(255,241,118," + light * 0.32 + ")" });
          }
          // CO₂ 進、O₂ 出:都走下表皮的氣孔
          leaf.stomata.forEach((st, i) => {
            if (open > 0.08) CK.arrow(ctx, st.x, st.y + 30, st.x, st.y + 10, "#64b5f6", i === 0 ? "CO₂ 進" : "");
            if (photo > 0.12) CK.arrow(ctx, st.x + 11, st.y + 10, st.x + 11, st.y + 30, "#e57373", i === 0 ? "O₂ 出" : "");
          });
          // 焦點層框選
          if (key === "epidermis") {
            D.rect(ctx, box.x + 2, yUp, box.w - 4, epH, { stroke: PL.col("accent"), width: 2, r: 3 });
            D.rect(ctx, box.x + 2, yLow, box.w - 4, epH, { stroke: PL.col("accent"), width: 2, r: 3 });
          } else if (key === "stoma") leaf.stomata.forEach(st => D.ring(ctx, st.x, st.y, 11, PL.col("accent"), 2));
          else if (key === "palisade") D.rect(ctx, box.x + 2, yPal, box.w - 4, palH, { stroke: PL.col("accent"), width: 2, r: 4 });
          else if (key === "spongy") D.rect(ctx, box.x + 2, ySpo, box.w - 4, spoH, { stroke: PL.col("accent"), width: 2, r: 4 });
          else D.rect(ctx, box.x + box.w * 0.28, yPal + palH * 0.55 - 11, box.w * 0.44, 22, { stroke: PL.col("accent"), width: 2, r: 6 });
          // 構造標籤
          D.text(ctx, "角質層", box.x + 4, yCut - 5, { color: "rgba(160,125,25,0.95)", size: 9 });
          D.text(ctx, "上表皮(透明)", box.x + box.w - 6, yUp + epH * 0.5 + 3, { color: "rgba(60,92,52,0.95)", size: 9, align: "right" });
          D.text(ctx, "柵狀組織(光合主場)", box.x + box.w - 6, yPal + palH * 0.35, { color: "rgba(27,94,32,0.95)", size: 9.5, align: "right" });
          D.text(ctx, "海綿組織(氣體交換)", box.x + box.w - 6, ySpo + spoH * 0.45, { color: "rgba(27,94,32,0.9)", size: 9.5, align: "right" });
          D.text(ctx, "下表皮:氣孔多", box.x + box.w - 6, yLow + epH + 11, { color: "rgba(60,92,52,0.95)", size: 9.5, align: "right" });
          D.text(ctx, "葉脈", box.x + box.w * 0.5, yPal + palH * 0.55 + 24, { color: "rgba(70,120,150,0.95)", size: 9.5, align: "center" });
          // 右側:分層功能表
          CK.panel(ctx, W * 0.67, H * 0.14, W * 0.30, H * 0.68, "一張切片,四種分工");
          const rows = [["角質層", "蠟質薄膜:防止過度失水"], ["柵狀組織", "柱狀細胞緊密、葉綠體最多"], ["海綿組織", "疏鬆多空隙:氣體擴散走廊"],
            ["氣孔", "保衛細胞包圍的門,開關可調"], ["葉脈", "木質部送水進、韌皮部送糖出"]];
          rows.forEach(([nm, de], i) => {
            const yy = H * 0.235 + i * H * 0.105;
            D.text(ctx, nm, W * 0.70, yy, { color: PL.col("text"), size: 11, weight: "700" });
            D.text(ctx, de, W * 0.70, yy + 13, { color: PL.col("text-dim"), size: 9.5 });
          });
          const info = FOCUS[key];
          rFocus.set(info[0]); rJob.set(info[1]);
          rPhoto.set(photo * 100, 0); rCO2.set(open > 0.35 ? "充足" : open > 0.12 ? "勉強夠用" : "不足!");
          const co2Low = open < 0.2 && light > 0.5;
          vd.set(co2Low ? "光很強但 CO₂ 進不來:光合被氣孔卡住" : photo > 0.75 ? "光與 CO₂ 都充足:光合全速運轉" : "光合速率中等:還有提升空間", co2Low ? "warn" : photo > 0.75 ? "ok" : "info");
        }
      });
      const focusSel = PL.ui.select(ui.L.controls, { label: "焦點層", value: "palisade", options: [
        { value: "palisade", label: "柵狀組織" }, { value: "spongy", label: "海綿組織" }, { value: "epidermis", label: "表皮與角質層" },
        { value: "vein", label: "葉脈" }, { value: "stoma", label: "氣孔與保衛細胞" }
      ] });
      const lightS = PL.ui.slider(ui.L.controls, { label: "光照強度", min: 0, max: 1, step: 0.05, value: 0.75, digits: 2 });
      const openS = PL.ui.slider(ui.L.controls, { label: "氣孔開度", min: 0, max: 1, step: 0.05, value: 0.7, digits: 2 });
      PL.ui.note(ui.L.controls, "把葉片翻過來看:氣孔幾乎都在下表皮——上面曬得到太陽,開在那裡失水會很快。");
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "豔陽正午", apply: () => { focusSel.set("palisade"); lightS.set(1); openS.set(0.9); ui.redraw(); } },
        { label: "陰天", apply: () => { lightS.set(0.3); openS.set(0.7); ui.redraw(); } },
        { label: "乾旱半閉", apply: () => { focusSel.set("stoma"); lightS.set(0.8); openS.set(0.2); ui.redraw(); } }
      ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "光合狀態" });
      const rFocus = PL.ui.readout(ui.L.readouts, { label: "焦點層" }), rJob = PL.ui.readout(ui.L.readouts, { label: "主要功能" });
      const rPhoto = PL.ui.readout(ui.L.readouts, { label: "光合效率", unit: "%" }), rCO2 = PL.ui.readout(ui.L.readouts, { label: "CO₂ 供應" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 生長素與向光性 */
  PL.register("plant-hormone", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const ang = angS.get(), ext = extS.get(), tip = tipC.get();
          const A = (tip ? 0.9 : 0) + ext * 0.75, shFrac = tip ? 0.5 + 0.35 * Math.abs(ang) / 80 : 0.5; // 頂端總量;沒頂芽無法不均勻分配
          const cSh = A * shFrac, cLit = A * (1 - shFrac);
          const effect = c => c * Math.exp(-c / 1.1) / 0.42;           // 莖的伸長促進(峰值 1)
          const bend = tip ? clamp(effect(A), 0, 1) * (ang / 80) * 40 : 0;
          const sunX = W * (0.30 + ang / 80 * 0.24), sunY = H * 0.09;
          D.disc(ctx, sunX, sunY, 9, { fill: "#ffd54f", glow: "rgba(255,213,79,0.5)", glowSize: 26 });
          const bx = W * 0.30, by = H * 0.88, segs = 14, L = H * 0.52 / segs;  // 盆與莖:彎曲集中在莖上半段
          D.rect(ctx, bx - 24, by - 4, 48, 18, { fill: "rgba(176,116,66,0.9)", stroke: "rgba(110,70,40,0.95)", width: 1.5, r: 3 });
          let px = bx, py = by - 4; const pts = [[px, py]];
          for (let i = 1; i <= segs; i++) {
            const dir = -Math.PI / 2 + bend * Math.PI / 180 * Math.pow(i / segs, 1.6);
            px += Math.cos(dir) * L; py += Math.sin(dir) * L; pts.push([px, py]);
          }
          ctx.save();
          ctx.strokeStyle = "#43a047"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.lineJoin = "round";
          ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); ctx.restore();
          [[4, 1], [8, -1]].forEach(([idx, s]) => { const p = pts[idx];
            ctx.save(); ctx.fillStyle = "rgba(102,187,106,0.9)"; ctx.beginPath();
            ctx.ellipse(p[0] + s * 9, p[1], 10, 3.6, s * 0.5, 0, TAU); ctx.fill(); ctx.restore();
          });
          const top = pts[segs];
          if (tip) {
            D.disc(ctx, top[0], top[1], 4.5, { fill: "#a5d6a7", stroke: "#2e7d32", width: 1.4 });
            D.text(ctx, "頂芽(生長素工廠)", top[0] - 10, top[1] - 8, { color: PL.col("text-dim"), size: 9.5, align: "right" });
          } else {
            D.line(ctx, top[0] - 6, top[1] - 6, top[0] + 6, top[1] + 6, "#c0392b", 2.4); D.line(ctx, top[0] + 6, top[1] - 6, top[0] - 6, top[1] + 6, "#c0392b", 2.4);
            D.text(ctx, "頂芽已摘除", top[0] + 12, top[1] - 6, { color: "#c0392b", size: 9.5 });
          }
          // 側芽:頂芽在→被抑制;摘除→隨時間萌發
          const budLen = tip ? 4 : Math.min(36, 6 + t * 9);
          [pts[4], pts[6]].forEach((p, i) => {
            const s = i ? 1 : -1, ex2 = p[0] + s * budLen * 0.8, ey2 = p[1] - budLen * 0.7;
            D.line(ctx, p[0], p[1], ex2, ey2, "#66bb6a", 3.4); D.disc(ctx, ex2, ey2, 3, { fill: "#a5d6a7" });
          });
          D.text(ctx, "側芽", pts[4][0] - 26, pts[4][1] + 14, { color: PL.col("text-dim"), size: 9.5 });
          for (let i = -1; i <= 1; i++) D.line(ctx, sunX + i * 8, sunY + 8, top[0] + i * 8, top[1] + 8,
            "rgba(255,213,79," + (Math.abs(ang) > 3 ? 0.5 : 0.22) + ")", 1.5, [6, 5]);
          // 右側:濃度分配與結果
          CK.panel(ctx, W * 0.56, H * 0.14, W * 0.41, H * 0.62, "生長素怎麼把莖推彎");
          CK.meter(ctx, W * 0.60, H * 0.30, W * 0.33, 10, clamp(cSh / 4, 0, 1), { color: "#7cb342", label: "背光側濃度(伸長快)" });
          CK.meter(ctx, W * 0.60, H * 0.42, W * 0.33, 10, clamp(cLit / 4, 0, 1), { color: "#ffb74d", label: "照光側濃度(伸長慢)" });
          CK.arrow(ctx, W * 0.60, H * 0.54, W * 0.60 + (bend >= 0 ? 66 : -66), H * 0.54, PL.col("accent"), "莖彎向光 " + PL.fmt(Math.abs(bend), 0) + "°");
          D.text(ctx, "頂芽優勢:頂芽的生長素抑制側芽", W * 0.765, H * 0.63, { color: PL.col("text-dim"), size: 10, align: "center" });
          D.text(ctx, "根對生長素敏感 3 倍以上(見下圖)", W * 0.765, H * 0.69, { color: PL.col("text-dim"), size: 10, align: "center" });
          rSh.set(cSh, 2); rLit.set(cLit, 2); rBend.set(bend, 1);
          rBud.set(tip ? "被頂芽抑制" : "萌發中(長 " + PL.fmt(budLen, 0) + " px)");
          vd.set(!tip ? "頂芽摘除:沒有生長素來源,莖不彎、頂芽優勢解除" : Math.abs(ang) < 5 ? "光均勻:生長素平均分配,莖直直長" : "背光側伸長較快,把莖推彎向光源",
            !tip ? "info" : Math.abs(ang) < 5 ? "info" : "ok");
        }
      });
      const angS = PL.ui.slider(ui.L.controls, { label: "光源方向", min: -80, max: 80, step: 5, value: 55, unit: "°", digits: 0 });
      const extS = PL.ui.slider(ui.L.controls, { label: "外加生長素", min: 0, max: 4, step: 0.1, value: 0, digits: 1 });
      const tipC = PL.ui.checkbox(ui.L.controls, { label: "摘除頂芽", checked: false, onChange: () => ui.redraw() });
      PL.ui.note(ui.L.controls, "向光性不是「光把莖曬彎」:生長素被運到背光側,那一側細胞伸長更快,莖就被推彎。低濃度促進、高濃度抑制。");
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "單側強光", apply: () => { angS.set(70); extS.set(0); tipC.set(false); ui.redraw(); } },
        { label: "均勻光照", apply: () => { angS.set(0); ui.redraw(); } }, { label: "摘心(促側枝)", apply: () => { tipC.set(true); ui.redraw(); } },
        { label: "高濃度抑制", apply: () => { extS.set(3.5); angS.set(55); ui.redraw(); } }
      ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "判定" });
      const rSh = PL.ui.readout(ui.L.readouts, { label: "背光側生長素", unit: "相對" }), rLit = PL.ui.readout(ui.L.readouts, { label: "照光側生長素", unit: "相對" });
      const rBend = PL.ui.readout(ui.L.readouts, { label: "彎曲角度", unit: "°" }), rBud = PL.ui.readout(ui.L.readouts, { label: "側芽狀態" });
      const chart = ui.chart("生長素劑量反應", "綠線:莖(最適濃度約 1);棕線:根(最適約 0.3)。同一濃度對莖是促進,對根可能已經是抑制。");
      const drawChart = () => {
        const A = (tipC.get() ? 0.9 : 0) + extS.get() * 0.75;
        const cSh = A * (tipC.get() ? 0.5 + 0.35 * Math.abs(angS.get()) / 80 : 0.5);
        CK.plot(chart, {
          x0: 0, x1: 4, y0: 0, y1: 1.1, xticks: [1, 2, 3, 4], yticks: [0.5, 1],
          xlabel: "生長素濃度(相對)", ylabel: "促進效果(相對)",
          series: [{ fn: c => c * Math.exp(-c / 1.1) / 0.42, color: "#66bb6a" }, { fn: c => c * Math.exp(-c / 0.32) / 0.12, color: "#8d6e63" }],
          marks: [{ dot: [cSh, cSh * Math.exp(-cSh / 1.1) / 0.42], color: "#2e7d32", label: "莖" },
            { dot: [cSh, cSh * Math.exp(-cSh / 0.32) / 0.12], color: "#6d4c41", label: "根" }]
        });
      };
      chart.onResize(drawChart);
      drawChart();
      root.addEventListener("input", drawChart);
      root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 植物的向性反應 */
  PL.register("tropism", {
    build(root) {
      // 一段會「逐段轉向目標」的肢:莖與根共用;tgt 為 null 表示沿原方向直直長
      function limb(c2, x, y, d0, tgt, len, wid, col, leaves, bendF) {
        const N = 10, L = len / N, pts = [[x, y]]; let dx = d0[0], dy = d0[1];
        for (let i = 1; i <= N; i++) {
          const f = (tgt ? bendF : 0) * Math.pow(i / N, 1.4);
          const tx = lerp(dx, tgt ? tgt[0] : dx, f), ty = lerp(dy, tgt ? tgt[1] : dy, f);
          const m = Math.hypot(tx, ty) || 1;
          dx = tx / m; dy = ty / m;
          x += dx * L; y += dy * L;
          pts.push([x, y]);
        }
        c2.strokeStyle = col; c2.lineWidth = wid; c2.lineCap = "round"; c2.lineJoin = "round";
        c2.beginPath(); pts.forEach((p, i) => i ? c2.lineTo(p[0], p[1]) : c2.moveTo(p[0], p[1])); c2.stroke();
        if (leaves) pts.slice(3, 9).forEach((p, i) => { if (i % 2 === 0) D.disc(c2, p[0], p[1], 5, { fill: "rgba(102,187,106,0.9)" }); });
        return pts;
      }
      const SCENES = {
        upright: { name: "正常站立", rot: 0, shoot: [0, -1], root: [0, 1], sTxt: "向上(負向地性)", rTxt: "向下(正向地性)", desc: "莖往上、根往下,天經地義。" },
        tipped: { name: "盆栽橫放", rot: Math.PI / 2, shoot: [0, -1], root: [0, 1], sTxt: "彎回向上", rTxt: "彎回向下", desc: "幾天後莖向上、根向下——重力方向才是刺激。" },
        space: { name: "太空無重力", rot: Math.PI / 2, shoot: null, root: null, sTxt: "沿原方向(水平)", rTxt: "沿原方向(水平)", desc: "沒有上下可循,莖根直直長。" },
        water: { name: "單側澆水", rot: 0, shoot: [0, -1], root: [0.62, 0.78], sTxt: "向上(不變)", rTxt: "彎向水多側(向水性)", desc: "根同時對重力與水分反應。" },
        mimosa: { name: "含羞草觸碰", rot: 0, shoot: null, root: null, sTxt: "葉子閉合再張開", rTxt: "—", desc: "閉合後約 2 分鐘恢復,可反覆。" }
      };
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: false,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const key = sceneSel.get(), sc = SCENES[key];
          const grow = clamp(dayS.get() / 5, 0, 1), bend = clamp(dayS.get() / 4, 0, 1);
          const gx = W * 0.24, gy = H * 0.62;
          D.rect(ctx, W * 0.03, gy, W * 0.58, H * 0.30, { fill: "rgba(122,92,62,0.25)", stroke: "rgba(110,82,52,0.5)", r: 6 });
          D.line(ctx, W * 0.03, gy, W * 0.61, gy, "rgba(110,82,52,0.7)", 2);
          if (key === "water") {
            D.rect(ctx, W * 0.38, gy + 4, W * 0.20, H * 0.26, { fill: "rgba(90,162,224,0.35)" });
            D.text(ctx, "水分多的土壤", W * 0.48, H * 0.945, { color: "#4a88ad", size: 10, align: "center" });
          }
          // 盆栽(可旋轉:橫放與太空情境)
          ctx.save();
          ctx.translate(gx, gy - 2);
          ctx.rotate(sc.rot);
          ctx.fillStyle = "rgba(176,116,66,0.9)";
          ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(30, 0); ctx.lineTo(22, -26); ctx.lineTo(-22, -26); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = "rgba(110,70,40,0.95)"; ctx.lineWidth = 1.6; ctx.stroke();
          D.rect(ctx, -34, -33, 68, 8, { fill: "rgba(120,90,60,0.85)", r: 2 });
          ctx.restore();
          // 莖與根:初方向隨盆轉,再逐段彎向目標方向
          const rot = sc.rot, d0 = [Math.sin(rot), -Math.cos(rot)];
          const base = [gx + Math.sin(rot) * 28, gy - 2 - Math.cos(rot) * 28];
          limb(ctx, base[0], base[1], d0, sc.shoot, H * (0.08 + grow * 0.30), 5.5, "#43a047", true, bend);
          limb(ctx, gx + Math.sin(rot) * 20, gy - 2 - Math.cos(rot) * 20 + 7, d0, sc.root, H * (0.06 + grow * 0.24), 4, "rgba(206,178,132,0.95)", false, bend);
          if (key === "mimosa") {
            // 含羞草:複葉,葉枕控制開闔(傾量)
            const fold = clamp(1 - dayS.get() / 2, 0, 1);
            for (let li = 0; li < 4; li++) {
              const ly = gy - 30 - li * 22, lx = gx + li * 6;
              D.line(ctx, lx, ly, lx + 44, ly - 8, "#66bb6a", 2.4);
              for (let k = 0; k < 5; k++) {
                const q = k / 4, mx = lerp(lx, lx + 44, q), my = lerp(ly, ly - 8, q), la = lerp(1.15, 0.12, fold);
                [-1, 1].forEach(s => D.line(ctx, mx, my, mx + Math.cos(la) * 9 * s, my - Math.sin(la) * 8, "#81c784", 2));
              }
            }  // 複葉:葉枕控制小葉開闔
            D.text(ctx, dayS.get() < 0.2 ? "碰觸!" : "葉枕細胞失水 → 葉子閉合 → 慢慢恢復", gx + 34, gy - 128, { color: PL.col("text-dim"), size: 10.5 });
          } else CK.badge(ctx, W * 0.24, H * 0.075, sc.name, PL.col("accent"));
          // 右側:情境解讀
          CK.panel(ctx, W * 0.64, H * 0.14, W * 0.33, H * 0.62, "這個反應是什麼?");
          D.text(ctx, sc.name, W * 0.805, H * 0.225, { color: PL.col("accent"), size: 13, align: "center", weight: "700" });
          D.text(ctx, sc.desc, W * 0.805, H * 0.30, { color: PL.col("text-dim"), size: 10, align: "center" });
          rShoot.set(sc.sTxt); rRoot.set(sc.rTxt);
          rType.set(key === "mimosa" ? "傾量(可逆、不需生長)" : "向性(生長反應,不可逆)");
          rMech.set(key === "mimosa" ? "葉枕細胞的膨壓變化" : "生長素在莖與根重新分配");
          vd.set(key === "mimosa" ? "含羞草閉合是傾量不是向性:可逆、方向固定不住" : key === "space" ? "無重力:沒有上下可循,莖根沿原方向直直長" : "莖背地生長、根向地生長:方向由生長素分配決定",
            key === "mimosa" || key === "space" ? "info" : "ok");
        }
      });
      const sceneSel = PL.ui.select(ui.L.controls, { label: "環境情境", value: "upright", options: Object.keys(SCENES).map(k => ({ value: k, label: SCENES[k].name })) });
      const dayS = PL.ui.slider(ui.L.controls, { label: "觀察時間", min: 0, max: 10, step: 0.5, value: 2, unit: "天", digits: 1 });
      PL.ui.note(ui.L.controls, "向性 = 朝(或背)刺激方向的「生長」反應,方向一旦固定就不可逆;傾量是膨壓變化,快、可逆、不生長。");
      PL.ui.procedure(ui.L.controls, { title: "三個對照,一個陷阱",
        steps: ["正常站立:記下莖與根的方向。", "切到「盆栽橫放」並拉動時間:莖與根各自怎麼彎?", "切到「太空無重力」:還會彎嗎?最後對照含羞草。"],
        rule: "盆栽橫放後根總是往下彎、莖往上彎——刺激是重力的「方向」,跟盆栽怎麼擺無關。" });
      const vd = PL.ui.verdict(ui.L.controls, { label: "反應類型" });
      const rShoot = PL.ui.readout(ui.L.readouts, { label: "莖的生長方向" }), rRoot = PL.ui.readout(ui.L.readouts, { label: "根的生長方向" });
      const rType = PL.ui.readout(ui.L.readouts, { label: "反應分類" }), rMech = PL.ui.readout(ui.L.readouts, { label: "機制" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 光合速率測定:水蘊草氣泡法 */
  PL.register("photosynthesis-measure", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const light = lightS.get() / 100, co2 = co2S.get(), temp = tempS.get();
          const fL = 1 - Math.exp(-light * 100 / 28), fC = co2 / (co2 + 0.28), fT = Math.exp(-Math.pow(temp - 28, 2) / 200);
          const rate = 90 * fL * fC * fT;                     // 氣泡數/分
          const lim = [["光照", fL], ["CO₂", fC], ["溫度", fT]].reduce((a, b) => (b[1] < a[1] ? b : a));
          // 器材:燒杯 + 水蘊草 + 溫度計 + 檯燈
          const bx = W * 0.29, baseY = H * 0.84, bw = W * 0.30, bh = H * 0.64;
          const bk = CK.beaker(ctx, bx, baseY, bw, bh, 0.82);
          CK.waterWeed(ctx, bx + bw * 0.04, baseY - 5, bh * 0.52, { time: t });
          CK.thermometer(ctx, bx - bw * 0.30, H * 0.28, baseY - 4, (temp - 5) / 35);
          D.text(ctx, temp + " °C", bx - bw * 0.30, H * 0.24, { color: PL.col("text-dim"), size: 10, align: "center" });
          const lampX = W * 0.565;
          D.rect(ctx, lampX - 10, H * 0.82, 20, 7, { fill: "#6f7b8a", r: 2 });
          D.line(ctx, lampX, H * 0.82, lampX, H * 0.28, "#6f7b8a", 5);
          D.line(ctx, lampX, H * 0.30, lampX - 36, H * 0.30, "#6f7b8a", 5);
          D.disc(ctx, lampX - 42, H * 0.315, 8 + light * 3, { fill: light > 0.03 ? "#ffe082" : "#9aa5b3", glow: "rgba(255,224,130," + light * 0.8 + ")", glowSize: 18 + light * 70 });
          for (let i = 0; i < 3; i++) {
            D.line(ctx, lampX - 46, H * 0.36 + i * 9, lampX - 46 - light * 62, H * 0.40 + i * 9 + light * 16, "rgba(255,224,130," + (0.2 + light * 0.6) + ")", 1.6, [5, 4]);
          }
          D.text(ctx, "光照 " + PL.fmt(light * 100, 0) + "%", lampX, H * 0.22, { color: PL.col("text-dim"), size: 10, align: "center" });
          // 氣泡:速率越快顆數越多、上升越快
          const nB = clamp(Math.round(rate / 6), 1, 13);
          for (let i = 0; i < nB; i++) {
            const y0 = baseY - 14 - rnd(i) * bh * 0.52, p = ((t * (0.16 + rate * 0.005) + rnd(i + 40)) % 1 + 1) % 1;
            D.disc(ctx, bx + bw * 0.04 + Math.sin(t * 2 + i * 1.7) * 5 + (rnd(i + 80) - 0.5) * 20, lerp(y0, bk.waterY + 5, p),
              1.6 + rnd(i + 20) * 2.2, { fill: "rgba(230,246,255,0.9)", stroke: "rgba(150,195,225,0.8)", width: 1 });
          }
          CK.badge(ctx, bx, H * 0.115, "水中加 NaHCO₃:CO₂ " + PL.fmt(co2 * 100, 0) + "%", "#4a88ad");
          CK.counter(ctx, W * 0.50, H * 0.80, W * 0.16, Math.min(40, Math.round(rate)), { color: "#4fc3f7", r: 3.5 });
          D.text(ctx, "每分鐘氣泡(點陣示意)", W * 0.58, H * 0.92, { color: PL.col("text-dim"), size: 9.5, align: "center" });
          CK.panel(ctx, W * 0.70, H * 0.14, W * 0.27, H * 0.60, "氣泡法怎麼讀");
          const rows = [["氣泡是什麼", "光反應釋出的 O₂"], ["光越強", "光反應越快,但會飽和"], ["CO₂ 越多", "暗反應(碳反應)越快"], ["溫度", "酵素效率:28 °C 附近最好"]];
          rows.forEach(([nm, de], i) => {
            const yy = H * 0.245 + i * H * 0.115;
            D.text(ctx, nm, W * 0.725, yy, { color: PL.col("text"), size: 11, weight: "700" });
            D.text(ctx, de, W * 0.725, yy + 13, { color: PL.col("text-dim"), size: 9.5 });
          });
          rRate.set(rate, 0); rCum.set(rate * 10, 0);
          rLim.set(lim[1] < 0.4 ? "限制因子:" + lim[0] : "尚可,最弱是" + lim[0]);
          rTempF.set(fT * 100, 0);
          vd.set(lim[1] < 0.4 ? "限制因子是「" + lim[0] + "」:單獨加強它才會再變快" : "三個因子都充足,速率已接近此溫度的上限", lim[1] < 0.4 ? "warn" : "ok");
        }
      });
      const lightS = PL.ui.slider(ui.L.controls, { label: "光照強度", min: 5, max: 100, step: 5, value: 60, unit: "%", digits: 0 });
      const co2S = PL.ui.slider(ui.L.controls, { label: "CO₂ 濃度(相對)", min: 0.05, max: 1, step: 0.05, value: 0.4, digits: 2 });
      const tempS = PL.ui.slider(ui.L.controls, { label: "水溫", min: 5, max: 40, step: 1, value: 24, unit: "°C", digits: 0 });
      PL.ui.note(ui.L.controls, "把水蘊草剪一段放入水中,亮燈後數氣泡:每分鐘氣泡數 ≈ 光合速率。水溫與 CO₂ 要控制一致才能比較光照。");
      PL.ui.procedure(ui.L.controls, { title: "找出限制因子",
        steps: ["固定 CO₂ 與水溫,把光照由 5% 拉到 100%:速率什麼時候開始「懶得變快」?", "在高原區把 CO₂ 拉高:速率回升了嗎?限制因子換人了。", "把水溫拉到 5 °C 或 40 °C:酵素效率下滑,氣泡變少。"],
        rule: "氣泡法量的是「相對速率」,不是絕對產量;同一組比較必須控制其他變因,否則氣泡數不能歸因給光照。" });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "陰天早晨", apply: () => { lightS.set(15); co2S.set(0.4); tempS.set(19); ui.redraw(); } },
        { label: "正午強光", apply: () => { lightS.set(95); co2S.set(0.45); tempS.set(29); ui.redraw(); } },
        { label: "加小蘇打", apply: () => { lightS.set(70); co2S.set(1); tempS.set(26); ui.redraw(); } }
      ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "限制因子" });
      const rRate = PL.ui.readout(ui.L.readouts, { label: "氣泡速率", unit: "個/分" }), rCum = PL.ui.readout(ui.L.readouts, { label: "10 分鐘累計", unit: "個" });
      const rLim = PL.ui.readout(ui.L.readouts, { label: "判讀" }), rTempF = PL.ui.readout(ui.L.readouts, { label: "溫度效率", unit: "%" });
      const chart = ui.chart("光照反應曲線", "曲線先陡後平:進入高原後再加強光照也沒用——限制因子已換成 CO₂ 或溫度。橘點為目前狀態。");
      const drawChart = () => {
        const fC = co2S.get() / (co2S.get() + 0.28), fT = Math.exp(-Math.pow(tempS.get() - 28, 2) / 200);
        CK.plot(chart, {
          x0: 0, x1: 100, y0: 0, y1: 90, xticks: [20, 40, 60, 80], yticks: [20, 40, 60, 80],
          xlabel: "光照強度 (%)", ylabel: "氣泡速率 (個/分)",
          series: [{ fn: x => 90 * (1 - Math.exp(-x / 28)) * fC * fT, color: "#66bb6a" }],
          marks: [{ dot: [lightS.get(), 90 * (1 - Math.exp(-lightS.get() / 28)) * fC * fT], color: PL.col("accent-2"), label: "目前" }]
        });
      };
      chart.onResize(drawChart);
      drawChart();
      root.addEventListener("input", drawChart);
      root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 花的構造與果實的形成 */
  PL.register("plant-reproduction", {
    build(root) {
      const MODES = {
        insect: { name: "蟲媒花", eff: 1.0, size: 1.0, petal: "rgba(240,98,146,0.8)", pollen: 6, note: "瓣大色豔、有蜜;花粉少而黏" },
        wind: { name: "風媒花", eff: 0.7, size: 0.55, petal: "rgba(196,206,178,0.75)", pollen: 14, note: "瓣小不顯眼;花粉多而輕" },
        self: { name: "自花授粉", eff: 0.85, size: 0.9, petal: "rgba(206,147,216,0.8)", pollen: 8, note: "雄蕊花粉落在自家柱頭" }
      };
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: false,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const days = dayS.get(), m = MODES[pollSel.get()];
          const pol = days > 0.5, tube = pol ? clamp((days - 0.5) / 5, 0, 1) : 0, fert = tube >= 1;
          const fruitF = fert ? clamp((days - 6.5) / 7, 0, 1) : 0, seedN = Math.round(6 * m.eff);
          // 左:整朵花(正面)與花莖
          const fx = W * 0.24, fy = H * 0.40;
          D.line(ctx, fx, fy + H * 0.13, fx - 6, H * 0.84, "#43a047", 5);
          ctx.save();
          ctx.globalAlpha = 1 - fruitF * 0.85;
          CK.flower(ctx, fx, fy, H * 0.16 * m.size, { petals: 6, petal: m.petal });
          ctx.restore();
          if (fruitF > 0.3) D.disc(ctx, fx, fy, H * 0.13 * fruitF, { fill: "rgba(230,126,60," + fruitF * 0.85 + ")", stroke: "rgba(180,90,30,0.95)", width: 2 });
          for (let i = 0; i < m.pollen; i++) {
            const a = i / m.pollen * TAU, rr = H * 0.16 * m.size * 0.66;
            D.disc(ctx, fx + Math.cos(a) * rr, fy + Math.sin(a) * rr, 2.2, { fill: "#ffd54f" });
          }
          D.text(ctx, m.name, fx, H * 0.075, { color: PL.col("text"), size: 12.5, align: "center", weight: "700" });
          D.text(ctx, m.note, fx, H * 0.135, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          D.text(ctx, fruitF > 0.3 ? "花瓣凋謝,子房長成果實" : "花冠:吸引授粉者", fx, H * 0.905, { color: PL.col("text-dim"), size: 10, align: "center" });
          // 右:雌蕊剖面(放大)
          CK.panel(ctx, W * 0.48, H * 0.12, W * 0.49, H * 0.76, "雌蕊剖面(放大)");
          const px = W * 0.63, pTop = H * 0.19;
          if (pol) D.disc(ctx, px, pTop - 9, 3, { fill: "#ffd54f" });
          D.disc(ctx, px, pTop, 7, { fill: "rgba(129,199,132,0.95)", stroke: "rgba(56,142,60,0.9)", width: 1.5 });
          D.text(ctx, "柱頭(接住花粉)", px + 13, pTop, { color: PL.col("text-dim"), size: 9.5 });
          D.rect(ctx, px - 4, pTop + 7, 8, H * 0.22, { fill: "rgba(165,214,167,0.55)", stroke: "rgba(56,142,60,0.7)", width: 1.2, r: 4 });
          D.text(ctx, "花柱", px + 13, pTop + H * 0.12, { color: PL.col("text-dim"), size: 9.5 });
          if (pol) D.line(ctx, px, pTop + 5, px, pTop + 7 + H * 0.22 * tube, "#c9a24a", 2.4, [4, 3]);
          const oy = pTop + 7 + H * 0.22 + H * 0.09, orr = H * (0.075 + fruitF * 0.075);
          ctx.save();
          ctx.fillStyle = fert ? "rgba(230,126,60," + (0.35 + fruitF * 0.5) + ")" : "rgba(165,214,167,0.4)";
          ctx.beginPath(); ctx.ellipse(px, oy, orr * 1.3, orr, 0, 0, TAU); ctx.fill();
          ctx.strokeStyle = "rgba(56,142,60,0.9)"; ctx.lineWidth = 1.6; ctx.stroke();
          ctx.restore();
          for (let i = 0; i < 2; i++) {
            D.disc(ctx, px - 7 + i * 14, oy, fert ? 4.5 : 3, { fill: fert ? "#8bc34a" : "rgba(255,213,79,0.95)", stroke: "rgba(80,110,40,0.85)", width: 1 });
          }
          D.text(ctx, fert ? "胚珠 → 種子" : "胚珠(等待受精)", px + orr * 1.3 + 10, oy + 3, { color: PL.col("text-dim"), size: 9.5 });
          D.text(ctx, fruitF > 0.5 ? "子房 → 果實" : "子房", px + orr * 1.3 + 10, oy + orr + 13, { color: PL.col("text-dim"), size: 9.5 });
          D.text(ctx, fert ? "花粉管已到達胚囊,完成受精" : pol ? "花粉管沿花柱向下生長…" : "尚未授粉:子房保持原樣", W * 0.725, H * 0.775,
            { color: fert ? "#2e7d32" : PL.col("text-dim"), size: 10.5, align: "center" });
          D.text(ctx, "胚珠→種子 · 子房→果實 · 花藥→花粉 · 胚乳→養分", W * 0.725, H * 0.835, { color: PL.col("text-faint"), size: 9, align: "center" });
          rTube.set(tube * 100, 0); rFert.set(fert ? "已受精" : pol ? "花粉管輸送中" : "未授粉");
          rOvary.set(fruitF >= 1 ? "果實成熟" : fruitF > 0 ? "膨大中" : "原樣");
          rSeed.set(fert ? seedN + " 顆(" + m.name + "效率 " + PL.fmt(m.eff * 100, 0) + "%)" : "—");
          vd.set(!pol ? "沒有授粉就沒有受精:子房不會發育" : fert ? "受精成功:胚珠→種子、子房→果實" : "花粉管正把精核送往胚囊…", !pol ? "info" : fert ? "ok" : "info");
        }
      });
      const pollSel = PL.ui.select(ui.L.controls, { label: "花的類型", value: "insect", options: Object.keys(MODES).map(k => ({ value: k, label: MODES[k].name })) });
      const dayS = PL.ui.slider(ui.L.controls, { label: "授粉後天數", min: 0, max: 14, step: 0.5, value: 0, unit: "天", digits: 1 });
      PL.ui.note(ui.L.controls, "花的功能就是製造下一代:花瓣是廣告、花藥出貨、柱頭收貨;受精成功後,胚珠變種子、子房變果實。");
      PL.ui.procedure(ui.L.controls, { title: "追蹤一趟生殖之旅",
        steps: ["切換花的類型:花瓣大小、花粉量與授粉效率有什麼對應?", "拉動天數:花粉管何時到達胚囊?胚珠何時變色?", "繼續拉到 14 天:花瓣與子房各變成什麼?"],
        rule: "果實是「子房」發育來的:胚珠→種子、子房壁→果皮,兩件事不要混為一談。" });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "剛授粉", apply: () => { dayS.set(1); ui.redraw(); } },
        { label: "受精完成", apply: () => { dayS.set(6); ui.redraw(); } },
        { label: "果實成熟", apply: () => { dayS.set(14); ui.redraw(); } }
      ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "生殖進度" });
      const rTube = PL.ui.readout(ui.L.readouts, { label: "花粉管進度", unit: "%" }), rFert = PL.ui.readout(ui.L.readouts, { label: "受精狀態" });
      const rOvary = PL.ui.readout(ui.L.readouts, { label: "子房發育" }), rSeed = PL.ui.readout(ui.L.readouts, { label: "預計種子數" });
      return { stop() { ui.stop(); } };
    }
  });
})();
