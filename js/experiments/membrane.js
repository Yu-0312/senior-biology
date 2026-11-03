/* 模組二 · 細胞膜與物質運輸 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, CK = window.BioLab, D = PL.draw;
  const { clamp, lerp, TAU } = PL;

  /* 細胞膜與流動鑲嵌模型 */
  PL.register("membrane-structure", {
    build(root) {
      // 流動性模型:溫度越高越流動;膽固醇把兩端往中間拉(高溫收緊、低溫防凍)
      const fluidOf = (T, chN) => {
        const raw = clamp((T - 5) / 45, 0, 1);
        return clamp(raw + (0.25 - 0.55 * raw) * chN, 0.04, 1);
      };
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const T = tempS.get(), chN = cholS.get() / 40;
          const fluid = fluidOf(T, chN);
          const bx = W * 0.05, by = H * 0.36, bw = W * 0.55, bh = H * 0.32;
          D.text(ctx, "細胞外液", bx + bw / 2, by - 12, { color: PL.col("text-dim"), size: 11, align: "center" });
          CK.bilayer(ctx, { x: bx, y: by, w: bw, h: bh }, {
            proteins: [
              { x: 0.16, w: 18, channel: true, label: "通道蛋白" },
              { x: 0.52, w: 15, label: "醣蛋白" },
              { x: 0.86, w: 16, label: "幫浦" }
            ]
          });
          D.text(ctx, "細胞質", bx + bw / 2, by + bh + 16, { color: PL.col("text-dim"), size: 11, align: "center" });
          // 醣鏈:接在醣蛋白外側,是細胞的身分標籤
          for (let i = 0; i < 4; i++) D.disc(ctx, bx + bw * 0.52 + (i - 1.5) * 7, by + bh * 0.14 - 7 - i * 5, 2.5, { fill: "#8ecf6a" });
          // 膽固醇:夾在兩排磷脂尾之間,數量由滑桿決定
          for (let i = 0; i < Math.round(chN * 13); i++) {
            D.rect(ctx, bx + 22 + (bw - 44) * ((i + 0.5) / 13) - 2, by + bh * 0.40, 4, bh * 0.20, { fill: "#f2cf63", r: 2 });
          }
          // 流動性:粉紅標記磷脂的晃動幅度 + 藍色標記蛋白的側向漂移
          for (let i = 0; i < 5; i++) D.disc(ctx, bx + 26 + i * (bw - 52) / 4, by + bh * 0.32 + Math.sin(t * (1 + fluid * 4) + i * 2.3) * fluid * 5, 2.4, { fill: "#ff8ab0" });
          const dxp = bx + bw * (0.30 + 0.16 * Math.sin(t * fluid * 1.8 + 1));
          D.disc(ctx, dxp, by + bh / 2, 5.5, { fill: "rgba(100,181,246,0.95)", glow: "#64b5f6", glowSize: 7 });
          CK.arrow(ctx, dxp + 9, by + bh / 2, dxp + 15 + 30 * fluid, by + bh / 2, "#64b5f6", "側向漂移");
          CK.badge(ctx, bx + bw / 2, by + bh + 40, fluid < 0.22 ? "接近膠狀" : fluid > 0.88 ? "過度流動" : "流動鑲嵌", fluid < 0.22 ? "#8d6e63" : fluid > 0.88 ? "#e57373" : "#5da8dd");
          // 右側:成分卡
          CK.panel(ctx, W * 0.63, H * 0.16, W * 0.32, H * 0.60, "膜的四種成分");
          const comps = [["#e8a0b4", "磷脂雙層", "親水頭朝外、疏水尾相接"], ["#f2cf63", "膽固醇", "高溫收緊、低溫防凍"],
            ["#64b5f6", "膜蛋白", "通道、幫浦、受器的門戶"], ["#8ecf6a", "醣鏈", "位於膜外側的身分標籤"]];
          comps.forEach((c, i) => {
            const y = H * 0.25 + i * 52;
            D.disc(ctx, W * 0.66, y, 5, { fill: c[0] });
            D.text(ctx, c[1], W * 0.69, y + 4, { color: PL.col("text"), size: 11.5, weight: "700" });
            D.text(ctx, c[2], W * 0.66, y + 19, { color: PL.col("text-dim"), size: 9.5 });
          });
          rFluid.set(fluid * 100, 0); rPhase.set(fluid < 0.22 ? "膠狀" : "流動");
          rChol.set(cholS.get(), 0); rRate.set(fluid * 2.4, 2);
          verdict.set(fluid < 0.22 ? "接近膠狀:運輸蛋白難以移動" : fluid > 0.88 ? "過度流動:通透性失控" : "流動鑲嵌:蛋白質可側向移動", fluid < 0.22 || fluid > 0.88 ? "warn" : "ok");
        }
      });
      const tempS = PL.ui.slider(ui.L.controls, { label: "溫度", min: 5, max: 50, step: 1, value: 37, unit: "°C", digits: 0 });
      const cholS = PL.ui.slider(ui.L.controls, { label: "膽固醇含量", min: 0, max: 40, step: 2, value: 10, unit: "%", digits: 0 });
      PL.ui.note(ui.L.controls, "磷脂與蛋白質都在「流動的油脂」上漂移——這就是流動鑲嵌模型;膽固醇則是膜的恆溫管家。");
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "冷藏 5°C", apply: () => { tempS.set(5); cholS.set(20); ui.redraw(); } },
        { label: "體溫 37°C", apply: () => { tempS.set(37); cholS.set(10); ui.redraw(); } },
        { label: "發燒 40°C", apply: () => { tempS.set(40); cholS.set(10); ui.redraw(); } }
      ] });
      const verdict = PL.ui.verdict(ui.L.controls, { label: "膜狀態" });
      const rFluid = PL.ui.readout(ui.L.readouts, { label: "流動性指數", unit: "%" });
      const rPhase = PL.ui.readout(ui.L.readouts, { label: "相態" });
      const rChol = PL.ui.readout(ui.L.readouts, { label: "膽固醇占比", unit: "%" });
      const rRate = PL.ui.readout(ui.L.readouts, { label: "側向漂移速率", unit: "μm/s" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 擴散作用 */
  PL.register("diffusion", {
    build(root) {
      const N = 36;
      const rnd = i => { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const mins = timeS.get(), T = tempS.get();
          const rel = 0.15 + (T - 10) / 70 * 0.85;   // 溫度→相對擴散係數
          const bx = W * 0.07, by = H * 0.18, bw = W * 0.50, bh = H * 0.56, midX = bx + bw / 2;
          D.rect(ctx, bx, by, bw, bh, { fill: "rgba(120,180,220,0.07)", stroke: PL.col("border"), width: 1.4, r: 8 });
          D.text(ctx, "溶質分子由左側高濃度區散開", bx + bw / 2, by - 12, { color: PL.col("text-dim"), size: 11, align: "center" });
          let nL = 0;
          for (let i = 0; i < N; i++) {
            // 每顆粒子由左側群聚位置,以自己的速率走向均勻分布位置
            const p = clamp(1 - Math.exp(-mins / 25 * rel * (0.6 + rnd(i) * 0.9)), 0, 1);
            const hx = bx + 10 + rnd(i + 1) * bw * 0.30, hy = by + 10 + rnd(i + 17) * (bh - 20);
            const tx = bx + 8 + rnd(i + 2) * (bw - 16), ty = by + 8 + rnd(i + 5) * (bh - 16);
            const amp = 2 + rel * 6;
            const x = lerp(hx, tx, p) + Math.sin(t * (0.8 + rel * 2) + i * 3.1) * amp;
            const y = lerp(hy, ty, p) + Math.cos(t * (1 + rel * 1.7) + i * 1.9) * amp;
            if (x < midX) nL++;
            D.disc(ctx, x, y, 4, { fill: "#5fb077" });
          }
          const nR = N - nL, dC = (nL - nR) / N, J = rel * dC;
          D.line(ctx, midX, by, midX, by + bh, PL.col("text-faint"), 1, [4, 4]);
          if (Math.abs(J) > 0.02) {
            const dir = J > 0 ? 1 : -1;
            CK.arrow(ctx, midX - dir * 42, by + bh + 24, midX + dir * 42, by + bh + 24, PL.col("accent"), "淨流量 J");
          } else D.text(ctx, "淨流量 ≈ 0(分子仍在動)", midX, by + bh + 26, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          CK.panel(ctx, W * 0.62, H * 0.18, W * 0.33, H * 0.40, "擴散的兩個推手");
          D.text(ctx, "J = D × 濃度差 ÷ 距離", W * 0.65, H * 0.31, { color: PL.col("text"), size: 12, weight: "700" });
          D.text(ctx, "D 隨溫度升高而變大", W * 0.65, H * 0.39, { color: PL.col("text-dim"), size: 10.5 });
          D.text(ctx, "全程不需要 ATP", W * 0.65, H * 0.47, { color: PL.col("text-dim"), size: 10.5 });
          rL.set(nL / N * 100, 0); rR.set(nR / N * 100, 0);
          rJ.set(J, 2); rT.set(T, 0);
          verdict.set(Math.abs(J) <= 0.02 ? "動態均勻:兩側通量相等,淨流量為零" : "淨移動中:由高濃度往低濃度", Math.abs(J) <= 0.02 ? "ok" : "info");
        }
      });
      const timeS = PL.ui.slider(ui.L.controls, { label: "擴散時間", min: 0, max: 60, step: 2, value: 0, unit: "分", digits: 0 });
      const tempS = PL.ui.slider(ui.L.controls, { label: "溫度", min: 10, max: 80, step: 5, value: 40, unit: "°C", digits: 0 });
      PL.ui.note(ui.L.controls, "把一滴墨汁滴進水裡,不攪拌也會散開——這就是擴散:分子熱運動的統計結果,不需要細胞付出能量。");
      PL.ui.procedure(ui.L.controls, {
        title: "觀察擴散",
        steps: [
          "時間 0 時整團溶質在左側;拉動「擴散時間」看它如何散開。",
          "把「溫度」分別設為 10°C 與 80°C 各跑一次,比較 J 與圖表衰減速度。",
          "盯著左、右濃度:兩側相等時,淨流量 J 變成多少?"
        ],
        rule: "擴散的動力是濃度「差」,不是濃度本身——兩側一樣濃之後淨流動就停了,但單一分子仍在隨機移動。"
      });
      const verdict = PL.ui.verdict(ui.L.controls, { label: "狀態" });
      const rL = PL.ui.readout(ui.L.readouts, { label: "左側濃度", unit: "%" });
      const rR = PL.ui.readout(ui.L.readouts, { label: "右側濃度", unit: "%" });
      const rJ = PL.ui.readout(ui.L.readouts, { label: "淨流量 J", unit: "相對" });
      const rT = PL.ui.readout(ui.L.readouts, { label: "溫度", unit: "°C" });
      const chart = ui.chart("濃度差的衰減", "兩側濃度差以指數衰減:升溫讓曲線掉得更快,但終點都是零——均勻分布。");
      const drawChart = () => {
        const rel = 0.15 + (tempS.get() - 10) / 70 * 0.85;
        CK.plot(chart, {
          x0: 0, x1: 60, y0: 0, y1: 100, xticks: [15, 30, 45], yticks: [25, 50, 75],
          xlabel: "擴散時間 (分)", ylabel: "濃度差 (%)",
          series: [{ fn: m => Math.exp(-rel * m / 22) * 100, color: PL.col("accent") }],
          marks: [{ dot: [timeS.get(), Math.exp(-rel * timeS.get() / 22) * 100], color: PL.col("accent-2"), label: "目前" }]
        });
      };
      chart.onResize(drawChart); drawChart(); root.addEventListener("input", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 滲透作用與半透膜 */
  PL.register("osmosis", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const cL = clS.get(), cR = crS.get(), dc = cL - cR;
          const h = Math.abs(dc) * 5.2 * (1 - Math.exp(-timeS.get() / 2.5)); // 液面差(px,教學尺度)
          const flux = Math.exp(-timeS.get() / 2.5) * Math.abs(dc) / 10;     // 淨水流強度 0–1
          const baseY = H * 0.82, tw = W * 0.13, th = H * 0.50, lx = W * 0.17, rx = W * 0.63, lev = th * 0.55;
          const yL = baseY - lev - (dc > 0 ? h : 0), yR = baseY - lev - (dc < 0 ? h : 0);
          // 兩管:顏色深淺代表溶質濃度
          D.rect(ctx, lx, yL, tw, baseY - yL, { fill: "rgba(150,110,60," + (0.16 + cL * 0.02) + ")", stroke: PL.col("border"), width: 1.6, r: 3 });
          D.rect(ctx, rx, yR, tw, baseY - yR, { fill: "rgba(150,110,60," + (0.16 + cR * 0.02) + ")", stroke: PL.col("border"), width: 1.6, r: 3 });
          D.text(ctx, "左管 " + PL.fmt(cL, 1) + "% 蔗糖", lx + tw / 2, yL - 10, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          D.text(ctx, "右管 " + PL.fmt(cR, 1) + "% 蔗糖", rx + tw / 2, yR - 10, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          // 底部連通管 + 半透膜
          D.rect(ctx, lx, baseY - 16, rx + tw - lx, 16, { fill: "rgba(120,180,220,0.22)", stroke: PL.col("border"), width: 1.4 });
          const mx = (lx + tw + rx) / 2;
          D.line(ctx, mx, baseY - 16, mx, baseY, "rgba(230,120,150,0.95)", 3, [5, 3]);
          D.text(ctx, "半透膜(只讓水過)", mx, baseY + 10, { color: "#e8a0b4", size: 10, align: "center" });
          // 蔗糖分子(過不了膜,留在原側)
          const dots = (c, x0, y0) => {
            for (let i = 0; i < Math.round(c * 1.6); i++) D.disc(ctx, x0 + 8 + (i % 4) * 7 + Math.sin(t * 2 + i) * 1.4, y0 + 20 + Math.floor(i / 4) * 13 + Math.cos(t * 1.6 + i * 2) * 1.4, 2.6, { fill: "#b98a4e" });
          };
          dots(cL, lx, yL); dots(cR, rx, yR);
          // 水的淨移動:由稀側流向濃側
          if (flux > 0.05) {
            const dir = dc > 0 ? -1 : 1, ax = rx + tw / 2 - dir * 20, bx2 = ax + dir * (rx - lx - tw) * 0.55;
            CK.arrow(ctx, ax, yL + 30, bx2, yL + 30, "rgba(90,170,230,0.95)", "H₂O 淨移動");
          }
          CK.panel(ctx, W * 0.63, H * 0.16, W * 0.32, H * 0.44, "滲透三要點");
          D.text(ctx, "半透膜:水能過、蔗糖不能", W * 0.66, H * 0.26, { color: PL.col("text"), size: 10.5 });
          D.text(ctx, "水由「稀」側流向「濃」側", W * 0.66, H * 0.34, { color: PL.col("text"), size: 10.5 });
          D.text(ctx, "靜水壓差 = 滲透壓差時達平衡", W * 0.66, H * 0.42, { color: PL.col("text"), size: 10.5 });
          rDc.set(dc, 1); rH.set(h / 5.2, 1);
          rPi.set(Math.abs(dc) * 72, 0); rFlow.set(flux > 0.5 ? "強" : flux > 0.1 ? "減慢中" : "趨近零");
          verdict.set(Math.abs(dc) < 0.3 ? "兩側等張:沒有淨移動" : flux > 0.1 ? "水正往濃側淨移動,液面差擴大中" : "平衡:靜水壓差恰好抵消滲透壓差", Math.abs(dc) < 0.3 ? "info" : flux > 0.1 ? "info" : "ok");
        }
      });
      const clS = PL.ui.slider(ui.L.controls, { label: "左管蔗糖濃度", min: 0, max: 10, step: 0.5, value: 6, unit: "%", digits: 1 });
      const crS = PL.ui.slider(ui.L.controls, { label: "右管蔗糖濃度", min: 0, max: 10, step: 0.5, value: 0, unit: "%", digits: 1 });
      const timeS = PL.ui.slider(ui.L.controls, { label: "經過時間", min: 0, max: 10, step: 0.5, value: 0, unit: "分", digits: 1 });
      PL.ui.note(ui.L.controls, "滲透就是「水自己的擴散」:同樣不需要 ATP,方向由半透膜兩側的溶質濃度決定——永遠往濃的一側淨移動。");
      PL.ui.procedure(ui.L.controls, {
        title: "找出平衡點",
        steps: [
          "先把兩管濃度都調成 0%,確認液面同高。",
          "左管設 6%,比較時間 0 分與 5 分的液面差與淨水流讀數。",
          "把時間拉長,看淨水流何時趨近零——這就是平衡,不是水停止移動。"
        ],
        rule: "平衡時水分子並沒有停:左→右與右→左的單向通量相等,「淨」流量才是零。"
      });
      const verdict = PL.ui.verdict(ui.L.controls, { label: "狀態" });
      const rDc = PL.ui.readout(ui.L.readouts, { label: "濃度差", unit: "%" });
      const rH = PL.ui.readout(ui.L.readouts, { label: "液面差", unit: "cm" });
      const rPi = PL.ui.readout(ui.L.readouts, { label: "滲透壓差", unit: "kPa" });
      const rFlow = PL.ui.readout(ui.L.readouts, { label: "淨水流" });
      const chart = ui.chart("液面差趨向平衡", "液面差不是無限上升:升到靜水壓差等於滲透壓差就停——濃度差越大,平衡液面差越高。");
      const drawChart = () => {
        const dcAbs = Math.abs(clS.get() - crS.get());
        CK.plot(chart, {
          x0: 0, x1: 10, y0: 0, y1: 11, xticks: [2, 4, 6, 8], yticks: [3, 6, 9],
          xlabel: "經過時間 (分)", ylabel: "液面差 (cm)",
          series: [{ fn: m => dcAbs * (1 - Math.exp(-m / 2.5)), color: PL.col("accent") }],
          marks: [{ dot: [timeS.get(), dcAbs * (1 - Math.exp(-timeS.get() / 2.5))], color: PL.col("accent-2"), label: "目前" }]
        });
      };
      chart.onResize(drawChart); drawChart(); root.addEventListener("input", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 紅血球與溶液張力 */
  PL.register("tonicity", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const c = naS.get();                       // 外液 NaCl 濃度 %
          const vol = c < 0.05 ? 320 : clamp(90 / c, 28, 320);
          const burst = vol > 150, cren = clamp((c - 1.2) / 1.8, 0, 1), sw = clamp((vol - 100) / 120, 0, 1);
          // 外液背景:溶血時染上血紅素色
          D.rect(ctx, W * 0.05, H * 0.12, W * 0.55, H * 0.70, { fill: burst ? "rgba(215,80,70," + (0.10 + sw * 0.22) + ")" : "rgba(120,180,220,0.07)", stroke: PL.col("border"), width: 1.4, r: 10 });
          D.text(ctx, "外液 NaCl " + PL.fmt(c, 1) + "%", W * 0.32, H * 0.19, { color: PL.col("text-dim"), size: 12, align: "center" });
          const cx = W * 0.32, cy = H * 0.47, r = H * 0.15 * Math.sqrt(vol / 100);
          if (burst) {
            // 溶血:破掉的膜殼 + 血紅素散出
            D.ring(ctx, cx, cy, r, "rgba(235,150,140,0.85)", 2, [6, 4]);
            for (let i = 0; i < 22; i++) {
              const a = i * 2.39996 + t * 0.3, rr = r * (0.4 + (i % 5) * 0.22);
              D.disc(ctx, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 3, { fill: "rgba(217,87,87," + (0.45 + 0.4 * Math.abs(Math.sin(t * 3 + i))) + ")" });
            }
            D.text(ctx, "膜破裂,血紅素漏出", cx, cy + r + 22, { color: "#e57373", size: 12, align: "center", weight: "700" });
          } else {
            // 皺縮:邊緣內凹成棘狀;膨脹:接近圓球
            ctx.save();
            ctx.beginPath();
            for (let i = 0; i <= 48; i++) {
              const a = i / 48 * TAU, rr = r * (1 - cren * 0.10 + cren * 0.16 * Math.abs(Math.sin(a * 9)));
              const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * (1 - sw * 0.08);
              i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
            }
            ctx.closePath();
            ctx.fillStyle = "rgba(217,87,87,0.88)"; ctx.fill();
            ctx.strokeStyle = "rgba(120,30,30,0.7)"; ctx.lineWidth = 1.6; ctx.stroke();
            ctx.restore();
            D.disc(ctx, cx, cy, r * 0.42, { fill: "rgba(150,40,40,0.5)" });
            D.text(ctx, cren > 0.25 ? "皺縮:邊緣呈齒狀" : sw > 0.15 ? "膨脹中" : "正常雙凹圓盤", cx, cy + r + 22, { color: PL.col("text-dim"), size: 11.5, align: "center" });
          }
          // 水的淨移動:低張進、高張出
          if (chkW.get()) {
            const inward = c < 0.9, mag = clamp(Math.abs(c - 0.9) / 1.5, 0.12, 1);
            for (let k = 0; k < 4; k++) {
              const a = k * TAU / 4 + 0.6, p1 = inward ? r + 34 : r + 54, p2 = inward ? r + 54 : r + 34;
              ctx.save(); ctx.globalAlpha = 0.3 + mag * 0.7;
              D.arrow(ctx, cx + Math.cos(a) * p1, cy + Math.sin(a) * p1, cx + Math.cos(a) * p2, cy + Math.sin(a) * p2, "#5aa2e0", k === 0 ? "H₂O" : "");
              ctx.restore();
            }
          }
          rTon.set(c < 0.6 ? "低張" : c <= 1.2 ? "等張" : "高張"); rVol.set(vol, 0);
          rSt.set(burst ? "溶血" : cren > 0.25 ? "皺縮" : sw > 0.15 ? "膨脹" : "正常"); rHb.set(burst ? "有(外液變紅)" : "無");
          verdict.set(burst ? "低張溶液:紅血球吸水漲破(溶血)" : cren > 0.25 ? "高張溶液:細胞失水皺縮" : "等張:形狀與體積維持", burst ? "bad" : cren > 0.25 ? "warn" : "ok");
        }
      });
      const naS = PL.ui.slider(ui.L.controls, { label: "外液 NaCl 濃度", min: 0, max: 3, step: 0.1, value: 0.9, unit: "%", digits: 1 });
      const chkW = PL.ui.checkbox(ui.L.controls, { label: "顯示水的淨移動", checked: true });
      PL.ui.note(ui.L.controls, "紅血球沒有細胞壁,張力一失衡就是脹破或皺縮——這是輸液必須配成等張(約 0.9% NaCl)的原因。");
      PL.ui.procedure(ui.L.controls, {
        title: "找出等張點",
        steps: [
          "把濃度設為 0%(蒸餾水),看紅血球的下場。",
          "慢慢升高濃度,找出「不脹不縮」的等張區間(相對體積 100% 附近)。",
          "拉到 1.8% 以上,觀察齒狀的皺縮外形。"
        ],
        rule: "張力由「不能穿膜的溶質」決定:0.9% NaCl ≈ 308 mOsm 才是等張;蒸餾水絕不能直接靜脈注射。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "蒸餾水", apply: () => { naS.set(0); ui.redraw(); } },
        { label: "生理食鹽水", apply: () => { naS.set(0.9); ui.redraw(); } },
        { label: "1.8% 高張", apply: () => { naS.set(1.8); ui.redraw(); } }
      ] });
      const verdict = PL.ui.verdict(ui.L.controls, { label: "判定" });
      const rTon = PL.ui.readout(ui.L.readouts, { label: "張力判定" });
      const rVol = PL.ui.readout(ui.L.readouts, { label: "相對體積", unit: "%" });
      const rSt = PL.ui.readout(ui.L.readouts, { label: "細胞狀態" });
      const rHb = PL.ui.readout(ui.L.readouts, { label: "外液血紅素" });
      const chart = ui.chart("體積對外液濃度", "相對體積 ≈ 0.9 / 濃度:0.6% 以下漲破,1.2% 以上明顯皺縮,0.9% 是等張點。");
      const drawChart = () => {
        const c = naS.get();
        CK.plot(chart, {
          x0: 0, x1: 3, y0: 0, y1: 320, xticks: [0.5, 1, 1.5, 2, 2.5], yticks: [100, 200, 300],
          xlabel: "外液 NaCl (%)", ylabel: "相對體積 (%)",
          series: [{ fn: c2 => c2 < 0.05 ? 320 : clamp(90 / c2, 28, 320), color: PL.col("accent") }],
          marks: [{ vline: 0.9, color: PL.col("text-faint"), dash: [4, 4], label: "等張" },
            { dot: [c, c < 0.05 ? 320 : clamp(90 / c, 28, 320)], color: PL.col("accent-2"), label: "目前" }]
        });
      };
      chart.onResize(drawChart); drawChart(); root.addEventListener("input", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 植物細胞的質離與回復 */
  PL.register("plasmolysis", {
    build(root) {
      const SOL = { water: { name: "清水(回復)", c: 0 }, salt: { name: "0.9% 食鹽水", c: 0.9 }, suc5: { name: "5% 蔗糖液", c: 5 }, suc10: { name: "10% 蔗糖液", c: 10 } };
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const sol = SOL[solSel.get()], mins = timeS.get();
          // 質離程度:在濃液中趨向平衡;移回清水則由 0.85 指數回復(教學流程)
          const plasm = sol.c === 0 ? Math.max(0, 0.85 * Math.exp(-mins / 1.4)) : clamp((sol.c - 0.9) / 4.1, 0, 1) * (1 - Math.exp(-mins / (2.4 - Math.min(sol.c, 5) * 0.18)));
          const P = clamp(1 - plasm * 1.15, 0, 1);
          const cx = W * 0.28, cy = H * 0.46, cw = W * 0.36, ch = H * 0.52;
          // 細胞壁(形狀固定)與壁內的外液
          D.rect(ctx, cx - cw / 2 - 5, cy - ch / 2 - 5, cw + 10, ch + 10, { fill: sol.c === 0 ? "rgba(150,200,235,0.20)" : "rgba(190,160,110," + (0.12 + plasm * 0.14) + ")", stroke: "#5d8a4a", width: 4, r: 10 });
          // 原生質膜與內容物隨失水內縮
          const s = 1 - plasm * 0.45, w2 = (cw - 14) * s, h2 = (ch - 14) * s;
          ctx.save();
          ctx.beginPath(); ctx.ellipse(cx, cy, w2 / 2, h2 / 2, 0, 0, TAU);
          ctx.fillStyle = "rgba(170,215,150,0.32)"; ctx.fill();
          ctx.strokeStyle = "rgba(90,140,70,0.95)"; ctx.lineWidth = 1.8; ctx.stroke();
          ctx.restore();
          D.disc(ctx, cx, cy, Math.min(w2, h2) * 0.40, { fill: "rgba(150,200,235,0.42)", stroke: "rgba(80,130,165,0.7)", width: 1.2 });
          D.disc(ctx, cx + w2 * 0.26, cy - h2 * 0.24, Math.min(w2, h2) * 0.09, { fill: "#b388d9", stroke: "rgba(90,50,130,0.8)", width: 1 });
          D.text(ctx, "細胞壁(形狀不變)", cx - cw / 2 - 5, cy - ch / 2 - 16, { color: "#6a9a56", size: 10.5 });
          D.text(ctx, "原生質膜(內縮)", cx + cw / 2 + 12, cy + ch / 2 + 18, { color: "rgba(90,140,70,1)", size: 10.5 });
          if (plasm > 0.1) D.text(ctx, "質離間隙:充滿外液", cx, cy + ch / 2 + 12, { color: "#b98a4e", size: 10, align: "center" });
          // 水的淨移動:濃液失水外出、清水吸水回來
          if (plasm > 0.04) {
            const out = sol.c > 0.9;
            for (let k = 0; k < 2; k++) {
              const y = cy - 20 + k * 40;
              ctx.save(); ctx.globalAlpha = 0.35 + plasm * 0.6;
              D.arrow(ctx, cx + (out ? w2 / 2 : cw / 2 + 40), y, cx + (out ? cw / 2 + 40 : w2 / 2), y, "#5aa2e0", k === 0 ? "H₂O" : "");
              ctx.restore();
            }
          }
          CK.meter(ctx, W * 0.06, H * 0.90, W * 0.32, 10, P, { color: P > 0.4 ? "#66bb6a" : "#e57373", label: "膨壓 P = 壁壓 − 滲透壓" });
          CK.panel(ctx, W * 0.62, H * 0.16, W * 0.33, H * 0.40, "為什麼植物不怕清水");
          D.text(ctx, "細胞壁:限制膨脹,防爆裂", W * 0.65, H * 0.27, { color: PL.col("text"), size: 10.5 });
          D.text(ctx, "膨壓:讓莖葉挺立的支撐力", W * 0.65, H * 0.36, { color: PL.col("text"), size: 10.5 });
          D.text(ctx, "質離可回復 = 膜仍具選擇性", W * 0.65, H * 0.45, { color: PL.col("text"), size: 10.5 });
          rPl.set(plasm * 100, 0); rP.set(P * 100, 0); rV.set(s * 100, 0); rSt.set(plasm > 0.55 ? "明顯質離" : plasm > 0.05 ? "質離中" : "膨壓飽滿");
          verdict.set(plasm > 0.55 ? "明顯質離:植物軟垂(萎凋)" : plasm > 0.05 ? "質離進行中:膜與壁分離" : "膨壓充足:細胞挺立", plasm > 0.55 ? "bad" : plasm > 0.05 ? "warn" : "ok");
        }
      });
      const solSel = PL.ui.select(ui.L.controls, { label: "外在溶液", value: "suc5", options: Object.keys(SOL).map(k => ({ value: k, label: SOL[k].name })) });
      const timeS = PL.ui.slider(ui.L.controls, { label: "處理時間", min: 0, max: 10, step: 0.5, value: 0, unit: "分", digits: 1 });
      PL.ui.note(ui.L.controls, "先把細胞泡進蔗糖液看質離,再切到「清水」看回復——細胞壁讓植物細胞在清水裡不會脹破,還能撐出膨壓。");
      PL.ui.procedure(ui.L.controls, {
        title: "質離與回復",
        steps: [
          "選「5% 蔗糖液」,把時間拉到 5 分,記下質離程度與膨壓。",
          "改選「10% 蔗糖液」,比較兩者的差別。",
          "最後切到「清水(回復)」,拉動時間看膜如何貼回細胞壁。"
        ],
        rule: "質離是「膜」與「壁」分離,不是細胞死亡;能在清水中回復,正表示細胞膜仍有選擇通透性。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "剛放入 5% 蔗糖", apply: () => { solSel.set("suc5"); timeS.set(0.5); ui.redraw(); } },
        { label: "完全質離", apply: () => { solSel.set("suc10"); timeS.set(8); ui.redraw(); } },
        { label: "移回清水後", apply: () => { solSel.set("water"); timeS.set(4); ui.redraw(); } }
      ] });
      const verdict = PL.ui.verdict(ui.L.controls, { label: "判定" });
      const rPl = PL.ui.readout(ui.L.readouts, { label: "質離程度", unit: "%" });
      const rP = PL.ui.readout(ui.L.readouts, { label: "膨壓", unit: "%" });
      const rV = PL.ui.readout(ui.L.readouts, { label: "原生質體體積", unit: "%" });
      const rSt = PL.ui.readout(ui.L.readouts, { label: "狀態" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 主動運輸與鈉鉀幫浦 */
  PL.register("active-transport", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const eff = inhSel.get() === "none" ? atpS.get() / 100 : 0;
          const NaIn = 145 - 133 * eff, KIn = 4 + 136 * eff, NaOut = 157 - NaIn, KOut = 144 - KIn;
          const memY = H * 0.48;
          // 細胞外(上)/細胞內(下)
          D.rect(ctx, W * 0.04, H * 0.16, W * 0.58, memY - H * 0.16, { fill: "rgba(120,180,220,0.07)", r: 8 });
          D.rect(ctx, W * 0.04, memY + 14, W * 0.58, H * 0.80 - memY - 14, { fill: "rgba(160,120,190,0.09)", r: 8 });
          CK.bilayer(ctx, { x: W * 0.05, y: memY - 14, w: W * 0.56, h: 28 }, {
            proteins: [{ x: 0.38, w: 22, label: "Na⁺/K⁺ 幫浦" }, { x: 0.80, w: 16, channel: true, label: "滲漏通道" }]
          });
          D.text(ctx, "細胞外", W * 0.08, H * 0.22, { color: PL.col("text-dim"), size: 11 });
          D.text(ctx, "細胞內", W * 0.08, H * 0.74, { color: PL.col("text-dim"), size: 11 });
          D.text(ctx, "3 Na⁺(內) + 2 K⁺(外) + ATP → 3 Na⁺(外) + 2 K⁺(內) + ADP + P", W * 0.32, H * 0.135, { color: PL.col("text"), size: 11, align: "center", weight: "700" });
          // 離子點陣(數量對應濃度)
          const ion = (x, y, n, color, label) => {
            D.text(ctx, label, x, y - 10, { color: PL.col("text-dim"), size: 9.5 }); CK.counter(ctx, x, y, W * 0.15, n, { color, r: 3.4 });
          };
          ion(W * 0.07, H * 0.28, Math.round(NaOut / 157 * 12), "#f2b544", "Na⁺ 胞外 " + Math.round(NaOut));
          ion(W * 0.36, H * 0.28, Math.round(KOut / 144 * 12), "#7ea6e0", "K⁺ 胞外 " + Math.round(KOut));
          ion(W * 0.07, H * 0.60, Math.round(NaIn / 157 * 12), "#f2b544", "Na⁺ 胞內 " + Math.round(NaIn));
          ion(W * 0.36, H * 0.60, Math.round(KIn / 144 * 12), "#7ea6e0", "K⁺ 胞內 " + Math.round(KIn));
          // 幫浦箭頭:3 Na⁺ 出、2 K⁺ 進;無 ATP 時離子順梯度漏失
          const px = W * 0.05 + W * 0.56 * 0.38;
          if (eff > 0.05) {
            ctx.save(); ctx.globalAlpha = 0.35 + eff * 0.65;
            D.arrow(ctx, px - 12, memY + 34, px - 12, memY - 36, "#f2b544", "3 Na⁺ 出");
            D.arrow(ctx, px + 12, memY - 36, px + 12, memY + 34, "#7ea6e0", "2 K⁺ 進");
            ctx.restore();
            CK.badge(ctx, px + 64, memY, "ATP → ADP + P", "#ef8829");
          } else {
            const lx = W * 0.05 + W * 0.56 * 0.80;
            D.arrow(ctx, lx, memY - 34, lx, memY + 34, "rgba(242,181,68,0.8)", "Na⁺ 漏入");
            D.arrow(ctx, lx + 26, memY + 34, lx + 26, memY - 34, "rgba(126,166,224,0.8)", "K⁺ 漏出");
            CK.badge(ctx, px + 64, memY, "無 ATP", "#8d8a84");
          }
          CK.meter(ctx, W * 0.06, H * 0.88, W * 0.30, 9, eff, { color: eff > 0.1 ? "#ef8829" : "#8d8a84", label: "ATP 供應" });
          rNa.set(NaIn, 0); rK.set(KIn, 0);
          rVm.set(-70 + 70 * (1 - eff), 0); rUse.set(Math.round(eff * 100), 0);
          verdict.set(eff < 0.08 ? "幫浦停擺:梯度流失,細胞將腫脹" : eff < 0.5 ? "梯度不足:神經興奮性下降" : "梯度維持:膜電位約 −70 mV", eff < 0.08 ? "bad" : eff < 0.5 ? "warn" : "ok");
        }
      });
      const atpS = PL.ui.slider(ui.L.controls, { label: "ATP 供應率", min: 0, max: 100, step: 5, value: 100, unit: "%", digits: 0 });
      const inhSel = PL.ui.select(ui.L.controls, { label: "抑制情境", value: "none", options: [
        { value: "none", label: "無" }, { value: "ouabain", label: "烏本苷(抑制幫浦)" }, { value: "hypoxia", label: "缺氧(ATP 耗盡)" }
      ] });
      PL.ui.note(ui.L.controls, "主動運輸逆著濃度梯度搬運,需要膜蛋白花 ATP;神經細胞約 2/3 的 ATP 都花在鈉鉀幫浦上。");
      PL.ui.procedure(ui.L.controls, {
        title: "看見 ATP 的價值",
        steps: [
          "ATP 供應 100% 時,記下胞內 Na⁺(12 mM)與 K⁺(140 mM)的標準值。",
          "把 ATP 降到 0%,看離子如何順著梯度經滲漏通道流失。",
          "再切到「烏本苷」與「缺氧」,比較膜電位的崩塌。"
        ],
        rule: "「主動」指的是細胞自己花 ATP 把物質推向高濃度一側;擴散永遠往低處走,兩者方向正好相反。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "正常神經元", apply: () => { inhSel.set("none"); atpS.set(100); ui.redraw(); } },
        { label: "烏本苷中毒", apply: () => { inhSel.set("ouabain"); ui.redraw(); } },
        { label: "缺氧", apply: () => { inhSel.set("hypoxia"); ui.redraw(); } }
      ] });
      const verdict = PL.ui.verdict(ui.L.controls, { label: "狀態" });
      const rNa = PL.ui.readout(ui.L.readouts, { label: "胞內 Na⁺", unit: "mM" });
      const rK = PL.ui.readout(ui.L.readouts, { label: "胞內 K⁺", unit: "mM" });
      const rVm = PL.ui.readout(ui.L.readouts, { label: "膜電位", unit: "mV" });
      const rUse = PL.ui.readout(ui.L.readouts, { label: "ATP 消耗率", unit: "%" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 胞吞與胞吐 */
  PL.register("bulk-transport", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const exo = modeSel.get() === "exo", atp = atpS.get() / 100;
          const prog = atp < 0.15 ? Math.min(progS.get() / 100, 0.35) : progS.get() / 100;
          const done = clamp((prog - 0.78) / 0.22, 0, 1), memY = H * 0.30, cx = W * 0.30;
          D.rect(ctx, W * 0.04, H * 0.11, W * 0.56, memY - H * 0.11, { fill: "rgba(120,180,220,0.06)", r: 8 });
          D.rect(ctx, W * 0.04, memY, W * 0.56, H * 0.78 - memY, { fill: "rgba(160,120,190,0.08)", r: 8 });
          D.text(ctx, "細胞外", W * 0.07, H * 0.16, { color: PL.col("text-dim"), size: 11 });
          D.text(ctx, "細胞內", W * 0.07, H * 0.40, { color: PL.col("text-dim"), size: 11 });
          // 膜:胞吐上凸、胞吞下凹,完成後回彈(面積已增減)
          const amp = exo ? (prog < 0.55 ? 0 : -13 * (1 - done)) : 15 * Math.min(prog / 0.6, 1) * (1 - done);
          ctx.save();
          ctx.strokeStyle = "rgba(90,130,170,0.95)"; ctx.lineWidth = 2.4;
          ctx.beginPath();
          for (let x = W * 0.05; x <= W * 0.59; x += 6) {
            const y = memY + amp * Math.exp(-Math.pow((x - cx) / 46, 2));
            x <= W * 0.055 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.stroke(); ctx.restore();
          // 囊泡與內容物
          const cargo = (x, y, a) => { for (let i = 0; i < 5; i++) D.disc(ctx, x + (i % 3 - 1) * 7, y + (Math.floor(i / 3) - 0.5) * 7, 2.6, { fill: "rgba(239,136,41," + (a == null ? 1 : a) + ")" }); };
          const rv = 17;
          if (exo) {
            const vy = lerp(H * 0.64, memY + rv + 1, Math.min(prog / 0.55, 1));
            if (prog < 0.92) {
              ctx.save(); ctx.globalAlpha = 1 - done * 0.9;
              D.disc(ctx, cx, vy, rv, { fill: "rgba(255,190,120,0.30)", stroke: "rgba(200,120,40,0.9)", width: 1.8 });
              ctx.restore();
              cargo(cx, vy, 1 - done * 0.9);
            }
            const k = clamp((prog - 0.80) / 0.20, 0, 1);
            for (let i = 0; i < 5 && k > 0; i++) D.disc(ctx, cx + (i % 3 - 1) * 9 + Math.sin(t * 2 + i) * 2, lerp(memY + rv, memY - 26 - i * 6, k), 2.6, { fill: "rgba(239,136,41," + (0.9 - i * 0.1) + ")" });
          } else {
            if (done < 0.5) cargo(cx, lerp(memY - 40, memY - 6, Math.min(prog / 0.55, 1)), 1);
            if (prog > 0.62) {
              D.disc(ctx, cx, memY + rv + 14, rv, { fill: "rgba(255,190,120,0.30)", stroke: "rgba(200,120,40,0.9)", width: 1.8 });
              cargo(cx, memY + rv + 14, 1);
            }
          }
          // 右側:階段卡與 ATP
          CK.panel(ctx, W * 0.62, H * 0.14, W * 0.33, H * 0.60, exo ? "胞吐(分泌)" : "胞吞(攝取)");
          const steps = exo ? ["囊泡移向細胞膜", "與膜對接", "膜融合、開口", "內容物釋出,膜面積增加"] : ["物質靠近,受器辨識", "膜內陷包圍", "囊泡剪下入胞", "與溶體融合消化"];
          const stage = prog < 0.25 ? 0 : prog < 0.5 ? 1 : prog < 0.78 ? 2 : 3;
          steps.forEach((s, i) => {
            D.disc(ctx, W * 0.65, H * 0.22 + i * 34, 4, { fill: i === stage ? "#ef8829" : i < stage ? "#66bb6a" : PL.theme.shade(0.5) });
            D.text(ctx, s, W * 0.68, H * 0.22 + i * 34 + 4, { color: i === stage ? PL.col("text") : PL.col("text-faint"), size: 10.5, weight: i === stage ? "700" : "" });
          });
          CK.meter(ctx, W * 0.65, H * 0.62, W * 0.27, 9, atp, { color: atp < 0.15 ? "#e57373" : "#ef8829", label: "ATP 供應" });
          rStg.set(steps[stage]); rArea.set((exo ? 1 : -1) * 8 * done, 1);
          rOut.set(done * 100, 0); rAtp.set(atp < 0.15 ? 0 : Math.round(1 + prog), 0);
          verdict.set(atp < 0.15 ? "ATP 不足:囊泡卡住,運輸停擺" : done >= 1 ? (exo ? "胞吐完成:膜面積 +8%,內容物已釋出" : "胞吞完成:物質已包進囊泡") : "進行中:兩者都需消耗 ATP", atp < 0.15 ? "bad" : done >= 1 ? "ok" : "info");
        }
      });
      const modeSel = PL.ui.select(ui.L.controls, { label: "模式", value: "exo", options: [
        { value: "exo", label: "胞吐(送出大分子)" }, { value: "endo", label: "胞吞(攝入大分子)" }
      ] });
      const progS = PL.ui.slider(ui.L.controls, { label: "運輸進度", min: 0, max: 100, step: 5, value: 0, unit: "%", digits: 0 });
      const atpS = PL.ui.slider(ui.L.controls, { label: "ATP 供應", min: 0, max: 100, step: 5, value: 100, unit: "%", digits: 0 });
      PL.ui.note(ui.L.controls, "大分子過不了膜:胰島素與神經傳遞物用胞吐送出,細菌與碎屑用胞吞吃進——膜面積因此一增一減,動態平衡。");
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "突觸釋放傳遞物", apply: () => { modeSel.set("exo"); progS.set(100); atpS.set(100); ui.redraw(); } },
        { label: "白血球吞噬細菌", apply: () => { modeSel.set("endo"); progS.set(100); atpS.set(100); ui.redraw(); } },
        { label: "ATP 耗盡", apply: () => { modeSel.set("exo"); progS.set(90); atpS.set(10); ui.redraw(); } }
      ] });
      const verdict = PL.ui.verdict(ui.L.controls, { label: "狀態" });
      const rStg = PL.ui.readout(ui.L.readouts, { label: "目前階段" });
      const rArea = PL.ui.readout(ui.L.readouts, { label: "膜面積變化", unit: "%" });
      const rOut = PL.ui.readout(ui.L.readouts, { label: "釋出/攝入進度", unit: "%" });
      const rAtp = PL.ui.readout(ui.L.readouts, { label: "累計 ATP", unit: "個" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 透析袋實驗:澱粉與葡萄糖 */
  PL.register("membrane-dialysis", {
    build(root) {
      const TESTS = { outB: { inBag: false, reagent: "本氏液" }, outI: { inBag: false, reagent: "碘液" }, inB: { inBag: true, reagent: "本氏液" }, inI: { inBag: true, reagent: "碘液" } };
      const BEN = ["藍色(陰性)", "綠色(+)", "黃綠色(++)", "橙色(+++)", "磚紅色(強陽性)"];
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const out = 1 - Math.exp(-timeS.get() / 18);  // 葡萄糖漏出比例
          // 燒杯(蒸餾水)+ 透析袋
          CK.beaker(ctx, W * 0.25, H * 0.84, W * 0.36, H * 0.58, 0.72, null);
          const bagX = W * 0.16, bagW = W * 0.18, bagY = H * 0.38, bagH = H * 0.40;
          D.rect(ctx, bagX, bagY, bagW, bagH, { fill: "rgba(235,245,255,0.35)", stroke: "rgba(230,120,150,0.95)", width: 2.4, r: 12 });
          D.text(ctx, "透析袋(半透膜)", bagX + bagW / 2, bagY - 8, { color: "#e8a0b4", size: 10.5, align: "center" });
          // 袋內:澱粉大團(不出袋)+ 剩餘葡萄糖
          for (let i = 0; i < 6; i++) D.disc(ctx, bagX + 16 + (i % 3) * 17 + Math.sin(t * 1.5 + i) * 1.4, bagY + 34 + Math.floor(i / 3) * 17 + Math.cos(t * 1.2 + i * 2) * 1.4, 6, { fill: "rgba(141,110,99,0.85)" });
          for (let i = 0; i < Math.round((1 - out) * 14); i++) D.disc(ctx, bagX + 12 + (i % 7) * 10 + Math.sin(t * 2 + i) * 1.2, bagY + 78 + Math.floor(i / 7) * 11, 2.6, { fill: "#5fb077" });
          // 袋外:漏出的葡萄糖
          for (let i = 0; i < Math.round(out * 22); i++) {
            const a = i * 2.39996, rr = 62 + (i % 4) * 13;
            D.disc(ctx, W * 0.25 + Math.cos(a) * rr, H * 0.62 + Math.sin(a) * rr * 0.62, 2.6, { fill: "rgba(95,176,119,0.85)" });
          }
          // 右側檢測試管
          const tst = TESTS[testSel.get()];
          const level = tst.reagent === "本氏液" ? (tst.inBag ? 1 - out : out) : (tst.inBag ? 1 : 0);
          const col = tst.reagent === "本氏液" ? CK.benedictColor(clamp(level, 0, 1)) : (level > 0.5 ? "#2c2c54" : "#c9a227");
          CK.testTube(ctx, W * 0.56, H * 0.80, 30, H * 0.36, 0.55, col);
          D.text(ctx, "袋" + (tst.inBag ? "內" : "外") + "液 + " + tst.reagent + (tst.reagent === "本氏液" ? "(加熱)" : ""), W * 0.56, H * 0.38, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          const res = tst.reagent === "本氏液" ? BEN[clamp(Math.round(level * 4), 0, 4)] : (level > 0.5 ? "藍黑色(澱粉陽性)" : "黃棕色(澱粉陰性)");
          CK.badge(ctx, W * 0.56, H * 0.30, res, col);
          D.text(ctx, "葡萄糖小分子可以出袋,澱粉大分子被留在袋內", W * 0.28, H * 0.945, { color: PL.col("text-dim"), size: 10, align: "center" });
          rOut.set(out * 100, 0); rStOut.set("陰性(−)"); rStIn.set("陽性(+)"); rRes.set(res);
          verdict.set(timeS.get() < 3 ? "剛開始:袋外還測不到葡萄糖" : "澱粉留袋內、葡萄糖到袋外:通透性與分子大小成反比", timeS.get() < 3 ? "info" : "ok");
        }
      });
      const timeS = PL.ui.slider(ui.L.controls, { label: "透析時間", min: 0, max: 60, step: 3, value: 0, unit: "分", digits: 0 });
      const testSel = PL.ui.select(ui.L.controls, { label: "檢測", value: "outB", options: [
        { value: "outB", label: "袋外液 + 本氏液" }, { value: "outI", label: "袋外液 + 碘液" },
        { value: "inB", label: "袋內液 + 本氏液" }, { value: "inI", label: "袋內液 + 碘液" }
      ] });
      PL.ui.note(ui.L.controls, "透析袋的孔只認「大小」:葡萄糖(小)進出自如,澱粉(大分子)被留在袋內——這就是半透膜的選擇性。");
      PL.ui.procedure(ui.L.controls, {
        title: "用檢測推論通透性",
        steps: [
          "時間 0 分時,袋內外各檢測一次,當作<b>對照組</b>。",
          "透析 30 分後,取袋外液分別加本氏液(加熱)與碘液。",
          "再檢查袋內:碘液應呈藍黑色——澱粉沒有離開。"
        ],
        rule: "沒有「0 分對照」就無法證明葡萄糖是透析後才漏出去的——對照組控制的是時間變因。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "剛裝好", apply: () => { timeS.set(0); ui.redraw(); } },
        { label: "30 分後", apply: () => { timeS.set(30); ui.redraw(); } },
        { label: "隔夜", apply: () => { timeS.set(60); ui.redraw(); } }
      ] });
      const verdict = PL.ui.verdict(ui.L.controls, { label: "結論" });
      const rOut = PL.ui.readout(ui.L.readouts, { label: "葡萄糖漏出", unit: "%" });
      const rStOut = PL.ui.readout(ui.L.readouts, { label: "袋外澱粉(碘液)" });
      const rStIn = PL.ui.readout(ui.L.readouts, { label: "袋內澱粉(碘液)" });
      const rRes = PL.ui.readout(ui.L.readouts, { label: "目前檢測結果" });
      const chart = ui.chart("袋外葡萄糖量", "葡萄糖漸漸漏出並趨飽和;澱粉曲線始終貼在零——分子太大,過不了半透膜。");
      const drawChart = () => {
        CK.plot(chart, {
          x0: 0, x1: 60, y0: 0, y1: 100, xticks: [15, 30, 45], yticks: [25, 50, 75],
          xlabel: "透析時間 (分)", ylabel: "袋外葡萄糖 (相對量 %)",
          series: [
            { fn: m => (1 - Math.exp(-m / 18)) * 100, color: "#5fb077" },
            { fn: () => 0, color: "#8d6e63", dash: [5, 4] }
          ],
          marks: [{ dot: [timeS.get(), (1 - Math.exp(-timeS.get() / 18)) * 100], color: PL.col("accent-2"), label: "目前" }]
        });
      };
      chart.onResize(drawChart); drawChart(); root.addEventListener("input", drawChart);
      return { stop() { ui.stop(); } };
    }
  });
})();
