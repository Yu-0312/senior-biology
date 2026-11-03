/* 模組十二 · 選修：健康與應用生物 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, CK = window.BioLab, D = PL.draw;
  const { clamp, lerp, TAU } = PL;

  /* 固定種子亂數：同一組參數每次重繪長相一致，測試與情境再現才比得出差異 */
  function rng(seed) {
    let s = (seed * 2654435761) >>> 0;
    return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }

  /* 免疫系統的三道防線 */
  PL.register("immune-system", {
    build(root) {
      const LINES = [
        { name: "第一道・皮膚與黏膜", info: "即時・非專一・傷口會讓它失效", detail: "角質層、黏膜纖毛與胃酸把大多數病原擋在體外——傷口就是這道牆的破口。" },
        { name: "第二道・先天免疫", info: "數分鐘～數小時・非專一・病原量大時吃力", detail: "發炎反應把吞噬細胞召到現場，無差別吞噬病原；反應快，但認不出特定敵人。" },
        { name: "第三道・適應性免疫", info: "數天達高峰・高度專一・疫苗先行訓練", detail: "B 細胞產生專一抗體、T 細胞毒殺受感染細胞，並留下記憶細胞備戰下次。" }];
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const n = nInS.get(), skin = skinS.get(), focus = focusSel.get();
          const b1 = lerp(0.55, 0.985, skin);
          const n1 = Math.round(n * (1 - b1)), n2 = Math.round(n1 * 0.32), n3 = Math.round(n2 * 0.06);
          const px = W * 0.03, py = H * 0.18, pw = W * 0.70, ph = H * 0.44;
          CK.panel(ctx, px, py, pw, ph, "病原入侵路徑（由左至右，圓點數量＝病原數）");
          const cxs = [px + pw * 0.10, px + pw * 0.36, px + pw * 0.62, px + pw * 0.89];
          const wx = [px + pw * 0.23, px + pw * 0.49, px + pw * 0.75];
          [[n, "#b07cf0", "入侵"], [n1, "#e5a35a", "殘存"], [n2, "#ef8829", "殘存"], [n3, "#e57373", "突破"]].forEach((s, i) => {
            const w = i === 3 ? pw * 0.12 : pw * 0.17;
            CK.counter(ctx, cxs[i] - w / 2, py + ph * 0.50, w, Math.min(s[0], 24), { color: s[1], r: 3.2 });
            D.text(ctx, s[2] + " " + s[0], cxs[i], py + ph * 0.72, { color: i === 3 && s[0] ? "#e57373" : PL.col("text-dim"), size: 10.5, align: "center", weight: i === 3 ? "700" : "" });
          });
          const gapH = (1 - skin) * ph * 0.40, seg = (ph - 26) / 2, wallH = seg - gapH / 2;
          D.rect(ctx, wx[0] - 5, py + 10, 10, wallH, { fill: "rgba(214,178,138,0.95)", r: 4 });
          D.rect(ctx, wx[0] - 5, py + ph - 10 - wallH, 10, wallH, { fill: "rgba(214,178,138,0.95)", r: 4 });
          if (gapH > 8) {
            D.line(ctx, wx[0], py + 10 + wallH + 2, wx[0], py + 10 + wallH + gapH - 2, "#c0392b", 5);
            D.text(ctx, "傷口", wx[0] + 20, py + 10 + seg + 4, { color: "#e57373", size: 10 });
          }
          D.text(ctx, "皮膚・黏膜", wx[0], py + 24, { color: PL.col("text-dim"), size: 10, align: "center" });
          CK.cellBody(ctx, wx[1] - 16, py + ph * 0.30, 12, { type: "animal", time: t, nucleus: false });
          CK.cellBody(ctx, wx[1] + 14, py + ph * 0.62, 10, { type: "animal", time: t, nucleus: false });
          D.text(ctx, "吞噬細胞", wx[1], py + 24, { color: PL.col("text-dim"), size: 10, align: "center" });
          CK.antibodyY(ctx, wx[2] - 13, py + ph * 0.32, 11, "#64b5f6");
          CK.antibodyY(ctx, wx[2] + 13, py + ph * 0.64, 11, "#64b5f6");
          D.text(ctx, "專一抗體", wx[2], py + 24, { color: PL.col("text-dim"), size: 10, align: "center" });
          CK.badge(ctx, wx[0], py + ph - 12, "擋下 " + Math.round(b1 * 100) + "%", "#66bb6a");
          CK.badge(ctx, wx[1], py + ph - 12, "吞掉 68%", "#e5a35a");
          CK.badge(ctx, wx[2], py + ph - 12, "清除 94%", "#64b5f6");
          const ln = LINES[Number(focus[1]) - 1];
          D.text(ctx, ln.name + "｜" + ln.info, px, py + ph + 26, { color: PL.col("accent"), size: 11.5, weight: "700" });
          D.text(ctx, ln.detail, px, py + ph + 44, { color: PL.col("text-dim"), size: 10.5 });
          r1.set(n1, 0); r2.set(n2, 0); r3.set(n3, 0);
          verdict.set(n3 === 0 ? "病原全數清除（沒有症狀）" : n3 < 3 ? "局部感染：發炎與吞噬接手中" : "感染擴散：需要醫療介入",
            n3 === 0 ? "ok" : n3 < 3 ? "warn" : "bad");
        }
      });
      const nInS = PL.ui.slider(ui.L.controls, { label: "病原入侵量", min: 20, max: 500, step: 10, value: 200, unit: "個", digits: 0 });
      const skinS = PL.ui.slider(ui.L.controls, { label: "皮膚完整度（0＝大傷口）", min: 0, max: 1, step: 0.05, value: 0.95, digits: 2 });
      const focusSel = PL.ui.select(ui.L.controls, { label: "焦點防線", value: "l1", options: [
        { value: "l1", label: "第一道：屏障" }, { value: "l2", label: "第二道：先天免疫" }, { value: "l3", label: "第三道：適應性免疫" }
      ] });
      PL.ui.note(ui.L.controls, "三道防線是「加成」不是「替換」：每一道把剩下的病原再砍掉一大截，所以健康的人通常到不了第三道。");
      PL.ui.procedure(ui.L.controls, {
        title: "看懂三道防線的分工",
        steps: [
          "皮膚完整度保持 0.95：大部分病原根本進不了身體。",
          "把完整度拉到 0.5 以下（模擬傷口），比較「突破防線」讀數的變化。",
          "切換焦點到第三道：它要數天才達高峰——這正是疫苗要預先建立的防線。"
        ],
        rule: "發炎的紅腫熱痛不是「感染惡化」，而是第二道防線正在部署吞噬細胞與血漿。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "皮膚完好", apply: () => { skinS.set(0.95); nInS.set(200); ui.redraw(); } },
        { label: "擦傷", apply: () => { skinS.set(0.55); nInS.set(300); ui.redraw(); } },
        { label: "大面積燒燙傷", apply: () => { skinS.set(0.15); nInS.set(500); ui.redraw(); } }
      ] });
      const verdict = PL.ui.verdict(ui.L.controls, { label: "防禦判定", tone: "info" });
      const r1 = PL.ui.readout(ui.L.readouts, { label: "進入第二道", unit: "個" });
      const r2 = PL.ui.readout(ui.L.readouts, { label: "進入第三道", unit: "個" });
      const r3 = PL.ui.readout(ui.L.readouts, { label: "突破防線", unit: "個" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 抗原抗體反應 */
  PL.register("antibody-antigen", {
    build(root) {
      const rnd = rng(7);
      const POS = [], FAB = [];
      for (let i = 0; i < 30; i++) { POS.push({ x: 0.08 + rnd() * 0.84, y: 0.10 + rnd() * 0.64 }); FAB.push({ x: 0.06 + rnd() * 0.88, y: 0.82 + rnd() * 0.12 }); }
      const BLOOD = [
        ["A 型", "有 A 抗原", "血漿含抗 B 抗體", "不可收 B、AB 的血"],
        ["B 型", "有 B 抗原", "血漿含抗 A 抗體", "不可收 A、AB 的血"],
        ["AB 型", "有 A＋B 抗原", "血漿無抗體", "只能給 AB 型"],
        ["O 型", "無抗原", "血漿含抗 A＋抗 B", "只能收 O 型的血"]
      ];
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const ag = agS.get(), ab = abS.get();
          const boundAg = Math.min(ag, ab * 2), pairs = Math.floor(boundAg / 2);
          const fx = W * 0.04, fy = H * 0.14, fw = W * 0.57, fh = H * 0.72;
          CK.panel(ctx, fx, fy, fw, fh, "顯微視野：抗原（紫）與抗體（藍 Y）");
          for (let i = 0; i < pairs; i++) {
            const a = POS[2 * i], b = POS[2 * i + 1];
            const mx = fx + (a.x + b.x) / 2 * fw, my = fy + (a.y + b.y) / 2 * fh;
            const ax = lerp(fx + a.x * fw, mx, 0.55), ay = lerp(fy + a.y * fh, my, 0.55);
            const bx = lerp(fx + b.x * fw, mx, 0.55), by = lerp(fy + b.y * fh, my, 0.55);
            D.line(ctx, ax, ay, bx, by, "rgba(100,181,246,0.35)", 1.5);
            CK.virusShape(ctx, ax, ay, 7, { spikes: 6, fill: "rgba(149,117,205,0.8)" });
            CK.virusShape(ctx, bx, by, 7, { spikes: 6, fill: "rgba(149,117,205,0.8)" });
            CK.antibodyY(ctx, mx, my, 10, "#64b5f6");
          }
          for (let i = boundAg; i < ag; i++) CK.virusShape(ctx, fx + POS[i].x * fw, fy + POS[i].y * fh, 7, { spikes: 6, fill: "rgba(149,117,205,0.8)" });
          for (let i = pairs; i < ab; i++) CK.antibodyY(ctx, fx + FAB[i].x * fw, fy + FAB[i].y * fh, 8, "rgba(100,181,246,0.5)");
          D.text(ctx, "Y 的兩臂各抓一個抗原 → 把病原串成塊（凝集）", fx + fw / 2, fy + fh + 18, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          CK.panel(ctx, W * 0.64, H * 0.14, W * 0.32, H * 0.72, "血型速查（輸血錯型＝全身凝集）");
          BLOOD.forEach((row, i) => {
            const y = H * 0.24 + i * 40;
            D.text(ctx, row[0], W * 0.66, y, { color: PL.col("accent-2"), size: 11.5, weight: "700" });
            D.text(ctx, "紅血球：" + row[1], W * 0.66, y + 14, { color: PL.col("text-dim"), size: 9.5 });
            D.text(ctx, row[2] + "；" + row[3], W * 0.66, y + 26, { color: PL.col("text-faint"), size: 9.5 });
          });
          rMark.set(ag ? Math.round(boundAg / ag * 100) : 0, 0);
          rBridge.set(pairs, 0);
          rFree.set(ag - boundAg, 0);
          verdict.set(pairs === 0 ? "抗體不足：病原游離，清除很慢" : pairs < 4 ? "標記中：吞噬效率有限" : "凝集明顯：吞噬細胞容易整塊清除",
            pairs === 0 ? "bad" : pairs < 4 ? "warn" : "ok");
        }
      });
      const agS = PL.ui.slider(ui.L.controls, { label: "抗原數量", min: 2, max: 30, step: 1, value: 12, unit: "顆", digits: 0 });
      const abS = PL.ui.slider(ui.L.controls, { label: "抗體數量", min: 0, max: 30, step: 1, value: 8, unit: "支", digits: 0 });
      PL.ui.note(ui.L.controls, "抗體不直接殺菌：它用兩臂「標記」病原，讓吞噬細胞與補體動手。血型不合的輸血就是同一套反應在紅血球上發生。");
      PL.ui.procedure(ui.L.controls, {
        title: "觀察凝集怎麼形成",
        steps: [
          "抗體調到 0：所有病原游離，沒有橋、沒有凝集。",
          "慢慢拉高抗體：每支 Y 抓兩顆抗原，病原開始串成塊。",
          "對照右表：A 型的人輸了 B 型血，血漿的抗 B 抗體會把整袋紅血球凝集——錯型輸血的危險就在這裡。"
        ],
        rule: "凝集不是「殺死」，而是「集中管理」——真正的清除仍要靠吞噬細胞與補體系統。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "剛感染（無抗體）", apply: () => { agS.set(30); abS.set(0); ui.redraw(); } },
        { label: "免疫後（抗體充足）", apply: () => { agS.set(30); abS.set(20); ui.redraw(); } }
      ] });
      const verdict = PL.ui.verdict(ui.L.controls, { label: "反應判定", tone: "info" });
      const rMark = PL.ui.readout(ui.L.readouts, { label: "被標記抗原", unit: "%" });
      const rBridge = PL.ui.readout(ui.L.readouts, { label: "凝集橋數", unit: "座" });
      const rFree = PL.ui.readout(ui.L.readouts, { label: "游離抗原", unit: "顆" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 疫苗與群體免疫 */
  PL.register("vaccine-herd", {
    build(root) {
      const DIS = { measles: { name: "麻疹", R0: 15 }, rubella: { name: "德國麻疹", R0: 6 },
        covid: { name: "COVID-19 原始株", R0: 3 }, flu: { name: "季節性流感", R0: 1.5 } };
      const COLS = 15, ROWS = 13, TOTAL = COLS * ROWS;
      const shuf = rng(11), ORDER = [];
      for (let i = 0; i < TOTAL; i++) ORDER.push([i % COLS, Math.floor(i / COLS)]);
      for (let i = TOTAL - 1; i > 0; i--) { const j = Math.floor(shuf() * (i + 1)), tmp = ORDER[i]; ORDER[i] = ORDER[j]; ORDER[j] = tmp; }
      function simulate(pv, beta) {
        const vax = new Set();
        for (let i = 0; i < Math.round(pv * TOTAL); i++) vax.add(ORDER[i][0] + "_" + ORDER[i][1]);
        const rr = rng(23), inf = new Set([(COLS >> 1) + "_" + (ROWS >> 1)]);
        let frontier = [[COLS >> 1, ROWS >> 1]];
        while (frontier.length) {
          const next = [];
          frontier.forEach(c => [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(dv => {
            const nx = c[0] + dv[0], ny = c[1] + dv[1], k = nx + "_" + ny;
            if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || vax.has(k) || inf.has(k) || rr() >= beta) return;
            inf.add(k); next.push([nx, ny]);
          }));
          frontier = next;
        }
        return inf;
      }
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const p = pS.get() / 100, dis = disSel.get(), d = DIS[dis];
          const beta = clamp(0.3 + d.R0 * 0.05, 0.3, 0.92), inf = simulate(p, beta), nv = Math.round(p * TOTAL);
          const cw = Math.min(W * 0.54 / COLS, H * 0.56 / ROWS);
          const gx = W * 0.04 + (W * 0.56 - cw * COLS) / 2, gy = H * 0.18 + (H * 0.56 - cw * ROWS) / 2;
          CK.panel(ctx, W * 0.03, H * 0.13, W * 0.60, H * 0.70, d.name + "：195 人社區（藍＝已接種、紅＝被感染、灰＝易感）");
          for (let i = 0; i < TOTAL; i++) {
            const c = ORDER[i], k = c[0] + "_" + c[1], x = gx + c[0] * cw + cw / 2, y = gy + c[1] * cw + cw / 2;
            if (inf.has(k)) D.disc(ctx, x, y, cw * 0.36, { fill: "#e57373", glow: "rgba(229,115,115,0.8)", glowSize: cw * 0.7 });
            else D.disc(ctx, x, y, cw * 0.30, { fill: i < nv ? "#64b5f6" : PL.theme.shade(0.6), stroke: PL.col("border"), width: 1 });
          }
          CK.panel(ctx, W * 0.65, H * 0.13, W * 0.31, H * 0.70, "群體免疫門檻");
          const rows = [["基本再生數 R0", PL.fmt(d.R0, 1)], ["門檻 1−1/R0", PL.fmt((1 - 1 / d.R0) * 100, 1) + " %"], ["有效再生數", PL.fmt(d.R0 * (1 - p), 2)]];
          rows.forEach((r, i) => {
            D.text(ctx, r[0], W * 0.67, H * 0.26 + i * 40, { color: PL.col("text-dim"), size: 10.5 });
            D.text(ctx, r[1], W * 0.94, H * 0.26 + i * 40, { color: i === 2 ? PL.col("accent") : PL.col("text"), size: 12, align: "right", weight: i === 2 ? "700" : "" });
          });
          const reff = d.R0 * (1 - p);
          rReff.set(reff, 2); rThr.set((1 - 1 / d.R0) * 100, 1); rOut.set(inf.size, 0);
          verdict.set(reff < 1 ? "疫情消退：連未接種者也受保護" : reff < 2 ? "傳播減緩，仍會零星群聚" : "疫情爆發：感染人數指數成長", reff < 1 ? "ok" : reff < 2 ? "warn" : "bad");
        }
      });
      const pS = PL.ui.slider(ui.L.controls, { label: "接種率", min: 0, max: 100, step: 1, value: 50, unit: "%", digits: 0 });
      const disSel = PL.ui.select(ui.L.controls, { label: "疾病", value: "covid", options: [
        { value: "measles", label: "麻疹（R0＝15）" }, { value: "rubella", label: "德國麻疹（R0＝6）" },
        { value: "covid", label: "COVID-19 原始株（R0＝3）" }, { value: "flu", label: "季節性流感（R0＝1.5）" } ] });
      PL.ui.note(ui.L.controls, "R0 是「一個病人平均傳幾個人」。群體免疫門檻＝1−1/R0：R0 越大，要擋住疫情需要接種的人就越多。");
      PL.ui.procedure(ui.L.controls, {
        title: "找出疫情熄火的那一點",
        steps: [
          "選麻疹（R0＝15），把接種率從 0 慢慢拉高，看紅點怎麼縮回去。",
          "盯著讀數：R_eff 掉到 1 以下時疫情才真正消退——這時接種率正好越過門檻。",
          "換成流感（R0＝1.5）：門檻低很多，這就是流感疫苗不用全民都打也能壓平疫情的原因。"
        ],
        rule: "接種率越過門檻＝R_eff＜1、傳播鏈被切斷——未接種的弱勢者也一起受保護。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "未接種社區", apply: () => { pS.set(10); ui.redraw(); } },
        { label: "麻疹達標（95%）", apply: () => { disSel.set("measles"); pS.set(95); ui.redraw(); } },
        { label: "麻疹不足（85%）", apply: () => { disSel.set("measles"); pS.set(85); ui.redraw(); } }
      ] });
      const verdict = PL.ui.verdict(ui.L.controls, { label: "疫情判定", tone: "info" });
      const rReff = PL.ui.readout(ui.L.readouts, { label: "有效再生數 R_eff" });
      const rThr = PL.ui.readout(ui.L.readouts, { label: "群體門檻", unit: "%" });
      const rOut = PL.ui.readout(ui.L.readouts, { label: "模擬感染人數", unit: "人" });
      const chart = ui.chart("爆發規模 vs 接種率", "曲線在門檻附近陡降：過了門檻，感染人數斷崖式減少——這就是群體免疫的拐點。");
      const drawChart = () => {
        const d = DIS[disSel.get()], beta = clamp(0.3 + d.R0 * 0.05, 0.3, 0.92), pts = [];
        for (let pv = 0; pv <= 100; pv += 10) pts.push([pv, simulate(pv / 100, beta).size]);
        CK.plot(chart, {
          x0: 0, x1: 100, y0: 0, y1: TOTAL, xticks: [25, 50, 75], yticks: [65, 130, 195],
          xlabel: "接種率（%）", ylabel: "最終感染人數",
          series: [{ pts, color: PL.col("accent") }],
          marks: [{ vline: (1 - 1 / d.R0) * 100, color: "#e57373", label: "門檻", dash: [5, 4] }, { dot: [pS.get(), simulate(pS.get() / 100, beta).size], color: PL.col("accent-2"), label: "目前" }]
        });
      };
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart);
      root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 細菌與病毒的結構比較 */
  PL.register("microbes", {
    build(root) {
      const BUGS = {
        ecoli: { name: "大腸桿菌", kind: "bacteria", um: 2.0, struct: "完整細胞：壁、膜、細胞質", meta: "可（自己有核糖體）", copy: "二分法分裂，約 20 分鐘", drug: "有效", hit: "細胞壁、核糖體" },
        flu: { name: "流感病毒", kind: "virus", um: 0.1, struct: "核酸＋蛋白外殼（非細胞）", meta: "不可（沒有核糖體）", copy: "強迫宿主細胞幫它複製", drug: "無效", hit: "沒有可作用的構造" },
        phage: { name: "T4 噬菌體", kind: "phage", um: 0.2, struct: "核酸＋蛋白外殼（感染細菌）", meta: "不可", copy: "吸附細菌後注入核酸", drug: "無效", hit: "沒有可作用的構造" }
      };
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const key = bugSel.get(), b = BUGS[key], mag = magS.get(), drug = drugChk.get();
          const r = clamp(b.um * 80 * Math.log10(mag / 500), 5, H * 0.26);
          CK.panel(ctx, W * 0.04, H * 0.13, W * 0.55, H * 0.74, "顯微視野：" + b.name);
          const cx = W * 0.27, cy = H * 0.46;
          const tag = (txt, lx, ly) => D.text(ctx, txt, lx, ly, { color: PL.col("text-dim"), size: 10 });
          if (key === "ecoli") {
            CK.cellBody(ctx, cx, cy, r, { type: "bacteria", time: t, organelles: { ribosome: 5 } });
            D.ring(ctx, cx - r * 0.15, cy, Math.max(4, r * 0.28), "rgba(255,213,79,0.95)", 2, [4, 3]);
            tag("細胞壁＋細胞膜", cx + r * 1.1, cy - r * 0.8);
            tag("環狀 DNA", cx + r * 0.55, cy + r * 0.95);
            tag("核糖體", cx - r * 0.5, cy + r * 1.25);
          } else if (key === "flu") {
            CK.virusShape(ctx, cx, cy, r, { rna: true, time: t, spikes: 12 });
            tag("蛋白質外殼", cx + r * 1.5, cy - r * 1.1);
            tag("RNA 核酸", cx + r * 1.5, cy + r * 0.2);
            tag("棘突：辨識並鑽入宿主", cx + r * 1.5, cy + r * 1.4);
          } else {
            const hr = Math.max(5, r * 0.55);
            D.disc(ctx, cx, cy - hr * 0.7, hr, { fill: "rgba(149,117,205,0.7)", stroke: "rgba(80,50,130,0.9)", width: 1.6 });
            D.rect(ctx, cx - 3, cy - hr * 0.7 + hr, 6, hr * 0.9, { fill: "rgba(80,50,130,0.85)" });
            D.rect(ctx, cx - 13, cy + hr * 0.33, 26, 5, { fill: "rgba(80,50,130,0.85)", r: 2 });
            for (let i = -1; i <= 1; i++) D.line(ctx, cx + i * 9, cy + hr * 0.45, cx + i * 20, cy + hr * 1.1, "rgba(80,50,130,0.8)", 1.8);
            tag("頭部：DNA", cx + hr * 1.6, cy - hr * 1.4);
            tag("尾鞘＋尾纖維：吸附細菌", cx + hr * 1.6, cy + hr * 0.9);
          }
          if (r < 9) D.text(ctx, "太小了看不見——把放大倍率拉高！", cx, cy + r * 2.8 + 14, { color: PL.col("warn"), size: 11, align: "center" });
          if (drug) CK.badge(ctx, cx, H * 0.80, b.kind === "bacteria" ? "抗生素：細胞壁合成受阻 → 菌體破裂" : "抗生素無處作用：沒有細胞壁與核糖體", b.kind === "bacteria" ? "#2e7d32" : "#c62828");
          CK.panel(ctx, W * 0.62, H * 0.13, W * 0.34, H * 0.74, "結構比較");
          [["構造", "struct"], ["大小", "size"], ["獨立代謝", "meta"], ["複製方式", "copy"], ["抗生素", "drug"], ["靶點", "hit"]].forEach((f, i) => {
            D.text(ctx, f[0], W * 0.64, H * 0.24 + i * 34, { color: PL.col("text-faint"), size: 10 });
            D.text(ctx, b[f[1]], W * 0.64, H * 0.24 + i * 34 + 13, { color: i === 4 ? (b.drug === "有效" ? "#2e7d32" : "#c62828") : PL.col("text"), size: 10.5, weight: i === 4 ? "700" : "" });
          });
          rSize.set(b.um, 1); rFov.set(180000 / mag, 0); rMeta.set(b.meta); rDrug.set(drug ? "已投藥：" + b.drug : "未用藥");
          verdict.set(!drug ? "未用藥：觀察自然狀態" : b.kind === "bacteria" ? "抗生素有效：破壞細菌特有構造" : "抗生素對病毒無效——感冒吃抗生素只會養出抗藥性",
            !drug ? "info" : b.kind === "bacteria" ? "ok" : "bad");
        }
      });
      const bugSel = PL.ui.select(ui.L.controls, { label: "病原", value: "ecoli", options: [
        { value: "ecoli", label: "大腸桿菌（細菌）" }, { value: "flu", label: "流感病毒" }, { value: "phage", label: "T4 噬菌體" }
      ] });
      const magS = PL.ui.slider(ui.L.controls, { label: "放大倍率", min: 1000, max: 50000, step: 1000, value: 5000, unit: "×", digits: 0 });
      const drugChk = PL.ui.checkbox(ui.L.controls, { label: "施加抗生素", checked: false });
      PL.ui.note(ui.L.controls, "抗生素的靶點（細胞壁、核糖體）是細菌特有的構造；病毒連核糖體都沒有，必須寄生在活細胞裡才能複製。");
      PL.ui.procedure(ui.L.controls, {
        title: "比較兩種「病原」",
        steps: [
          "看大腸桿菌：找細胞壁、環狀 DNA 與核糖體——它是能獨立代謝的完整細胞。",
          "換成流感病毒：只剩核酸與蛋白外殼，勾選抗生素也不會有任何變化。",
          "噬菌體是感染細菌的病毒：複習「病毒靠宿主複製」這句話。"
        ],
        rule: "病毒不是「比較小的細菌」——它沒有代謝結構，離開宿主就只是一團化學分子，這也是它可以結晶保存的原因。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "細菌感染＋投藥", apply: () => { bugSel.set("ecoli"); magS.set(5000); drugChk.set(true); ui.redraw(); } },
        { label: "病毒感冒＋投藥", apply: () => { bugSel.set("flu"); magS.set(20000); drugChk.set(true); ui.redraw(); } },
        { label: "噬菌體（侵染細菌）", apply: () => { bugSel.set("phage"); magS.set(20000); drugChk.set(false); ui.redraw(); } }
      ] });
      const verdict = PL.ui.verdict(ui.L.controls, { label: "用藥判定", tone: "info" });
      const rSize = PL.ui.readout(ui.L.readouts, { label: "病原大小", unit: "μm" });
      const rFov = PL.ui.readout(ui.L.readouts, { label: "視野寬度", unit: "μm" });
      const rMeta = PL.ui.readout(ui.L.readouts, { label: "獨立代謝" });
      const rDrug = PL.ui.readout(ui.L.readouts, { label: "抗生素效果" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 抗生素與抗藥性演化 */
  PL.register("antibiotics", {
    build(root) {
      const PLANS = { full: { name: "服滿 7 天", days: 7 }, stop: { name: "自行停藥（第 3 天）", days: 3 }, none: { name: "沒吃藥", days: 0 } };
      const POS = [];
      { const rr = rng(5); for (let i = 0; i < 30; i++) POS.push([rr() * TAU, Math.sqrt(rr()), 0.05 + rr() * 0.04]); }
      function evolve(drugDays, f0) {
        let S = 1 - f0 / 100, R = f0 / 100;
        const f = [], lgN = [];
        for (let d = 0; d <= 14; d++) {
          const tot = Math.max(1e-12, S + R);
          f.push(R / tot * 100); lgN.push(Math.log10(Math.max(1e-3, tot)));
          S *= d < drugDays ? 0.05 : 1.9; R *= d < drugDays ? 0.90 : 1.7;
          const t2 = S + R;
          if (t2 > 1e6) { S *= 1e6 / t2; R *= 1e6 / t2; }
        }
        return { f, lgN };
      }
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const f0 = f0S.get(), day = dayS.get(), plan = planSel.get();
          const cur = evolve(PLANS[plan].days, f0), full = evolve(7, f0);
          const drawDish = (cx, cy, r, data, title) => {
            CK.petri(ctx, cx, cy, r, { colonies: 0 });
            const nCol = clamp(Math.round(7 * (data.lgN[day] + 1)), 0, 30), nR = Math.round(nCol * data.f[day] / 100);
            for (let i = 0; i < nCol; i++) {
              const pt = POS[i];
              D.disc(ctx, cx + Math.cos(pt[0]) * pt[1] * r * 0.78, cy + Math.sin(pt[0]) * pt[1] * r * 0.78, r * pt[2], { fill: i < nR ? "#c62828" : "#3d6fb4" });
            }
            D.text(ctx, title + "・紅＝抗藥 " + PL.fmt(data.f[day], 1) + "%、藍＝敏感菌", cx, cy + r + 18, { color: PL.col("text-dim"), size: 10, align: "center" });
          };
          drawDish(W * 0.24, H * 0.42, H * 0.19, cur, "目前療程：" + PLANS[plan].name + "（第 " + day + " 天）");
          drawDish(W * 0.58, H * 0.42, H * 0.19, full, "對照組：服滿 7 天");
          CK.panel(ctx, W * 0.71, H * 0.16, W * 0.25, H * 0.56, "為什麼要服滿？");
          [["用藥壓力下：敏感菌死、抗藥株留下"], ["症狀消失時：菌少但幾乎全是抗藥株"], ["停藥之後：抗藥株長回整個菌落"]].forEach((r, i) => {
            D.text(ctx, r[0], W * 0.73, H * 0.30 + i * 56, { color: PL.col("text-dim"), size: 10 });
          });
          D.text(ctx, "抗藥性＝天擇在用藥壓力下的即時上演", W * 0.835, H * 0.64, { color: PL.col("warn"), size: 9.5, align: "center", weight: "700" });
          const f = cur.f[day], lg = cur.lgN[day];
          rFreq.set(f, 1); rN.set("10^" + PL.fmt(lg, 1));
          rEnd.set(lg < 0 ? "感染清除（菌量＜1）" : f > 90 ? "復發：菌落幾乎全是抗藥株" : "感染持續");
          verdict.set(plan === "full" ? "服滿療程：病原清空，抗藥株沒有機會擴張" : plan === "stop" ? "停藥後復發：留下來的全是抗藥株" : "未治療：感染持續（抗藥性演化較慢）", plan === "full" ? "ok" : plan === "stop" ? "bad" : "warn");
        }
      });
      const f0S = PL.ui.slider(ui.L.controls, { label: "初始抗藥比例", min: 0.5, max: 20, step: 0.5, value: 2, unit: "%", digits: 1 });
      const dayS = PL.ui.slider(ui.L.controls, { label: "觀察天數", min: 0, max: 14, step: 1, value: 7, unit: "天", digits: 0 });
      const planSel = PL.ui.select(ui.L.controls, { label: "療程", value: "full", options: [
        { value: "full", label: "服滿 7 天" }, { value: "stop", label: "自行停藥（第 3 天）" }, { value: "none", label: "沒吃藥" }
      ] });
      PL.ui.note(ui.L.controls, "抗生素殺的是「敏感菌」；本來就帶著抗藥突變的少數個體活下來，之後每次分裂都在替抗藥性擴大版圖。");
      PL.ui.procedure(ui.L.controls, {
        title: "重演一次抗藥性演化",
        steps: [
          "選「服滿 7 天」，把觀察天數從 0 拉到 14：菌量歸零，感染清除。",
          "改選「自行停藥」，再拉一次天數：第 3 天後菌量反彈，紅色菌落占滿培養皿。",
          "把初始抗藥比例拉到 15%：還沒吃藥，抗藥株就已經是大戶——濫用會累積。"
        ],
        rule: "「症狀好了」不等於「細菌清完了」：停藥留下的空位，正好讓最耐藥的那批長回去。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "服滿 7 天", apply: () => { planSel.set("full"); dayS.set(14); ui.redraw(); } },
        { label: "第 3 天自行停藥", apply: () => { planSel.set("stop"); dayS.set(14); ui.redraw(); } },
        { label: "重複用舊藥的病人", apply: () => { planSel.set("none"); f0S.set(15); dayS.set(7); ui.redraw(); } }
      ] });
      const verdict = PL.ui.verdict(ui.L.controls, { label: "療程判定", tone: "info" });
      const rFreq = PL.ui.readout(ui.L.readouts, { label: "抗藥頻率", unit: "%" });
      const rN = PL.ui.readout(ui.L.readouts, { label: "相對菌量（10 的次方）" });
      const rEnd = PL.ui.readout(ui.L.readouts, { label: "結局" });
      const chart = ui.chart("抗藥頻率隨天數變化", "綠線（服滿）末段雖高、但菌已清空；紅線（停藥）三天內衝高——之後每次感染都從高頻率起跑。");
      const drawChart = () => {
        const f0 = f0S.get();
        const mk = (days, color, dash) => {
          const d = evolve(days, f0), pts = [];
          for (let i = 0; i <= 14; i++) pts.push([i, d.f[i]]);
          return { pts, color, dash }; };
        CK.plot(chart, {
          x0: 0, x1: 14, y0: 0, y1: 100, xticks: [7, 14], yticks: [25, 50, 75],
          xlabel: "天數", ylabel: "抗藥頻率（%）",
          series: [mk(7, "#66bb6a"), mk(3, "#e57373"), mk(0, PL.col("text-faint"), [5, 4])],
          marks: [{ dot: [dayS.get(), evolve(PLANS[planSel.get()].days, f0).f[dayS.get()]], color: PL.col("accent-2"), label: "目前" }]
        });
      };
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart);
      root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 腎臟與排泄恆定 */
  PL.register("homeostasis-kidney", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const adh = adhS.get() / 100, eff = respSel.get() === "normal" ? 1 : 0;
          const u = eff ? 0.8 + 14.2 * Math.pow(1 - adh, 2.6) : 15;
          const reabs = 15 - u, conc = clamp((u - 0.8) / 14.2, 0, 1);
          const px = W * 0.04, py = H * 0.13, pw = W * 0.58, ph = H * 0.74;
          CK.panel(ctx, px, py, pw, ph, "腎元：過濾 → 再吸收 → ADH 決定最後的水");
          const gx = px + pw * 0.14, gy = py + ph * 0.16;
          CK.arrow(ctx, gx - 52, gy, gx - 14, gy, "#d95555", "入球小動脈");
          for (let i = 0; i < 4; i++) D.disc(ctx, gx + Math.cos(i * 1.9) * 7, gy + Math.sin(i * 1.9) * 7, 5.5, { fill: "rgba(200,80,80,0.8)" });
          D.text(ctx, "腎小球：過濾 180 L/天", gx - 8, gy + 24, { color: PL.col("text-dim"), size: 10 });
          ctx.save();
          ctx.strokeStyle = "rgba(140,180,205,0.95)"; ctx.lineWidth = 4; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(gx + 8, gy + 4);
          ctx.lineTo(px + pw * 0.34, gy + 14); ctx.lineTo(px + pw * 0.34, gy + 58); ctx.lineTo(px + pw * 0.16, gy + 58);
          ctx.stroke(); ctx.restore();
          D.text(ctx, "腎小管：固定再吸收 165 L/天", px + pw * 0.20, gy + 80, { color: PL.col("text-dim"), size: 10 });
          const capY = gy + 102;
          D.line(ctx, px + pw * 0.10, capY, px + pw * 0.38, capY, "rgba(220,120,120,0.55)", 5);
          [0.20, 0.30].forEach((f, i) => CK.arrow(ctx, px + pw * f, gy + 62, px + pw * f, capY - 4, "#e5a35a", i ? "回收水與養分" : ""));
          const dx = px + pw * 0.66, top = py + ph * 0.12, bot = py + ph * 0.80;
          const gap = lerp(16, 7, eff * adh), vx = dx + 40;
          D.line(ctx, dx - gap / 2, top, dx - gap / 2, bot, "rgba(140,180,205,0.95)", 3);
          D.line(ctx, dx + gap / 2, top, dx + gap / 2, bot, "rgba(140,180,205,0.95)", 3);
          D.line(ctx, vx, top, vx, bot + 8, "rgba(220,120,120,0.5)", 6);
          D.text(ctx, "集尿管", dx, top - 12, { color: PL.col("text-dim"), size: 10, align: "center" }); D.text(ctx, "腎靜脈", vx + 4, top - 12, { color: PL.col("text-faint"), size: 9.5 });
          const nD = Math.round(eff * adh * 8);
          for (let i = 0; i < nD; i++) {
            const yd = top + 14 + (i + 0.5) / Math.max(1, nD) * (bot - top - 28);
            CK.drop(ctx, dx + gap / 2 + 10, yd, "#7ec8ff");
            CK.arrow(ctx, dx + gap / 2 + 4, yd, vx - 4, yd, "rgba(126,200,255,0.7)", "");
          }
          if (!nD) D.text(ctx, "水沒有被回收", dx, top + 20, { color: "#e57373", size: 10, align: "center" });
          CK.badge(ctx, dx, top - 30, eff ? "ADH " + Math.round(adh * 100) + "%" : "ADH 無效（受體無反應）", eff ? "#7c9cff" : "#c62828");
          CK.arrow(ctx, dx, bot + 4, dx, bot + 18, PL.col("text-dim"), "");
          D.disc(ctx, dx, bot + 28, 7, { fill: "rgba(224,178,46," + (0.30 + 0.65 * conc) + ")", stroke: "rgba(180,140,30,0.7)", width: 1.2 });
          D.text(ctx, "尿液 " + PL.fmt(u, 1) + " L/天", dx, bot + 48, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          CK.panel(ctx, W * 0.65, py, W * 0.31, H * 0.74, "每日水平衡");
          [["腎小球過濾量", "180 L"], ["固定再吸收", "165 L"], ["ADH 調控再吸收", PL.fmt(reabs, 1) + " L"], ["最終尿量", PL.fmt(u, 1) + " L"], ["尿比重", PL.fmt(1.030 - 0.027 * conc, 3)]].forEach((r, i) => {
            D.text(ctx, r[0], W * 0.67, py + 46 + i * 40, { color: PL.col("text-dim"), size: 10.5 });
            D.text(ctx, r[1], W * 0.94, py + 46 + i * 40, { color: i >= 2 ? PL.col("accent") : PL.col("text"), size: 12, align: "right", weight: i === 3 ? "700" : "" });
          });
          rGFR.set(180, 0); rRe.set(reabs, 1); rU.set(u, 1); rSG.set(1.030 - 0.027 * conc, 3);
          verdict.set(!eff ? "腎源性尿崩症：ADH 無效，每天約 15 L 稀尿" : u > 5 ? "多尿（＞5 L/天）：注意脫水與電解質" : u <= 2.5 ? "尿量正常（0.8–2.5 L/天）" : "尿量偏多", !eff ? "bad" : u > 5 ? "warn" : u <= 2.5 ? "ok" : "info");
        }
      });
      const adhS = PL.ui.slider(ui.L.controls, { label: "ADH 分泌量", min: 0, max: 100, step: 5, value: 50, unit: "%", digits: 0 });
      const respSel = PL.ui.select(ui.L.controls, { label: "集尿管對 ADH 的反應", value: "normal", options: [
        { value: "normal", label: "正常" }, { value: "resist", label: "無反應（腎源性尿崩症）" }
      ] });
      PL.ui.note(ui.L.controls, "血液變濃 → 下視丘偵測 → 腦下垂體釋出 ADH → 集尿管打開水通道。ADH 不製造水，只是決定最後一段水回不回收。");
      PL.ui.procedure(ui.L.controls, {
        title: "追蹤一滴水的旅程",
        steps: [
          "過濾量固定 180 L/天，其中 165 L 在腎小管被固定回收——這一步不受 ADH 控制。",
          "拉高 ADH：集尿管變「透水」，藍色水滴流回腎靜脈，尿量降到約 1 L。",
          "把 ADH 歸零（模擬喝下大量清水）：水滴消失，尿量衝到 15 L、顏色變淡。",
          "切換成「無反應（尿崩症）」：ADH 再高、集尿管也不透水——每天約 15 L 稀尿。"
        ],
        rule: "ADH 作用在「集尿管」這最後一段，調控的是不到 10% 的水——過濾與大部分再吸收它都管不著。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "劇烈運動後缺水", apply: () => { adhS.set(95); respSel.set("normal"); ui.redraw(); } },
        { label: "喝下 2 L 水", apply: () => { adhS.set(10); respSel.set("normal"); ui.redraw(); } },
        { label: "腎源性尿崩症", apply: () => { adhS.set(80); respSel.set("resist"); ui.redraw(); } } ] });
      const verdict = PL.ui.verdict(ui.L.controls, { label: "恆定判定", tone: "info" });
      const rGFR = PL.ui.readout(ui.L.readouts, { label: "每日過濾量", unit: "L" });
      const rRe = PL.ui.readout(ui.L.readouts, { label: "ADH 段再吸收", unit: "L" });
      const rU = PL.ui.readout(ui.L.readouts, { label: "尿量", unit: "L/天" });
      const rSG = PL.ui.readout(ui.L.readouts, { label: "尿比重" });
      const chart = ui.chart("尿量 vs ADH", "ADH 越高尿越少：正常腎臟這條曲線陡降；尿崩症患者的腎臟對 ADH 沒反應，曲線是平的 15 L。");
      const drawChart = () => {
        const eff = respSel.get() === "normal" ? 1 : 0;
        CK.plot(chart, {
          x0: 0, x1: 1, y0: 0, y1: 16, xticks: [0.25, 0.5, 0.75], yticks: [5, 10, 15],
          xlabel: "ADH 分泌量（0–1）", ylabel: "尿量（L/天）",
          series: [{ fn: a => eff ? 0.8 + 14.2 * Math.pow(1 - a, 2.6) : 15, color: eff ? PL.col("accent") : "#e57373" }],
          marks: [{ dot: [adhS.get() / 100, eff ? 0.8 + 14.2 * Math.pow(1 - adhS.get() / 100, 2.6) : 15], color: PL.col("accent-2"), label: "目前" }]
        });
      };
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart);
      root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 應用植物與農業技術 */
  PL.register("plant-application", {
    build(root) {
      const TECHS = { breed: "選育與雜交", graft: "嫁接", tissue: "組織培養" };
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const mode = techSel.get(), v = progS.get();
          const px = W * 0.04, py = H * 0.13, pw = W * 0.60, ph = H * 0.74;
          CK.panel(ctx, px, py, pw, ph, TECHS[mode]);
          let scale;
          if (mode === "breed") {
            const mean = 5 + 4.5 * (1 - Math.pow(0.62, v));
            scale = mean;
            CK.flower(ctx, px + pw * 0.16, py + ph * 0.30, 16, { petal: "rgba(240,98,146,0.75)" });
            CK.flower(ctx, px + pw * 0.16, py + ph * 0.62, 16, { petal: "rgba(240,98,146,0.45)" });
            D.text(ctx, "親代 甜度 5", px + pw * 0.16, py + ph * 0.30 + 34, { color: PL.col("text-dim"), size: 9.5, align: "center" });
            D.text(ctx, "親代 甜度 7", px + pw * 0.16, py + ph * 0.62 + 34, { color: PL.col("text-dim"), size: 9.5, align: "center" });
            CK.arrow(ctx, px + pw * 0.26, py + ph * 0.46, px + pw * 0.42, py + ph * 0.46, "#66bb6a", "選最甜的留種 × " + v + " 代");
            for (let i = 0; i < 5; i++) {
              D.disc(ctx, px + pw * 0.55 + i * pw * 0.09, py + ph * 0.46, 7 + mean * 1.1, { fill: mean > 8 ? "rgba(229,57,53,0.85)" : mean > 6.5 ? "rgba(251,140,0,0.85)" : "rgba(156,204,101,0.85)" });
            }
            D.text(ctx, "第 " + v + " 代平均甜度 " + PL.fmt(mean, 1) + "／10", px + pw * 0.70, py + ph * 0.70, { color: PL.col("text"), size: 11, align: "center", weight: "700" });
            CK.meter(ctx, px + pw * 0.30, py + ph * 0.80, pw * 0.5, 10, mean / 10, { color: "#e53935", label: "甜度累積（上限 10）" });
          } else if (mode === "graft") {
            scale = 0.6 + v * 0.07;
            const soilY = py + ph * 0.78, baseX = px + pw * 0.40;
            const graftY = soilY - (soilY - py - 16) * 0.52 * scale;
            D.line(ctx, px + 10, soilY, px + pw - 10, soilY, "rgba(140,110,80,0.9)", 3);
            for (let i = -1; i <= 1; i++) D.line(ctx, baseX, soilY, baseX + i * 26 * scale, soilY + 20 * scale, "rgba(120,95,65,0.9)", 3);
            D.rect(ctx, baseX - 4, graftY, 8, soilY - graftY, { fill: "rgba(150,120,80,0.9)", r: 3 });
            D.line(ctx, baseX, graftY, baseX - 34, graftY - 30 * scale, "rgba(110,150,85,0.95)", 4);
            D.line(ctx, baseX, graftY, baseX + 34, graftY - 38 * scale, "rgba(110,150,85,0.95)", 4);
            D.disc(ctx, baseX - 34, graftY - 34 * scale, 8, { fill: "rgba(229,57,53,0.9)" });
            D.disc(ctx, baseX + 34, graftY - 42 * scale, 8, { fill: "rgba(229,57,53,0.9)" });
            D.ring(ctx, baseX, graftY, 12, "#66bb6a", 2.5, [4, 3]);
            D.text(ctx, "癒合組織", baseX + 48, graftY + 4, { color: "#66bb6a", size: 10 });
            D.text(ctx, "砧木：耐病根系", baseX - 8, soilY + 40, { color: PL.col("text-dim"), size: 10, align: "center" });
            D.text(ctx, "接穗：甜果基因型（甜度 8.5 不變）", baseX + 10, graftY - 56 * scale, { color: PL.col("accent-2"), size: 10.5 });
            D.text(ctx, "果實甜度由接穗決定，砧木只影響樹勢與抗病", baseX + 60, soilY + 56, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          } else {
            scale = 4 * Math.pow(2, v);
            const baseY = py + ph * 0.78, cx = px + pw * 0.42;
            D.rect(ctx, cx - 60, baseY - 70, 120, 6, { fill: "rgba(180,205,180,0.5)", r: 3 });
            for (let i = 0; i < 4; i++) {
              const tx = cx - 45 + i * 30;
              D.rect(ctx, tx - 6, baseY - 62, 12, 58, { fill: "rgba(200,225,240,0.45)", stroke: "rgba(120,160,185,0.9)", width: 1.4, r: 5 });
              D.line(ctx, tx, baseY - 8, tx, baseY - 40, "#3f9142", 2);
              ctx.fillStyle = "rgba(76,175,80,0.9)";
              ctx.beginPath(); ctx.ellipse(tx - 5, baseY - 40, 5, 2.4, -0.5, 0, TAU); ctx.fill();
              ctx.beginPath(); ctx.ellipse(tx + 5, baseY - 34, 5, 2.4, 0.5, 0, TAU); ctx.fill();
            }
            D.text(ctx, "4 個培養瓶，各養 1 株苗", cx, baseY + 16, { color: PL.col("text-dim"), size: 10, align: "center" });
            CK.arrow(ctx, px + pw * 0.16, baseY - 34, cx - 70, baseY - 34, "#66bb6a", "切 4 片葉片（外植體）");
            CK.badge(ctx, cx, py + ph * 0.22, "繼代 " + v + " 次 → 苗數 " + scale + " 株", "#66bb6a");
            D.text(ctx, "每繼代一次數量翻倍，且全部都是同一個基因型", cx, py + ph * 0.30, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          }
          rTech.set(TECHS[mode]);
          rOut.set(mode === "breed" ? "平均甜度 " + PL.fmt(scale, 1) + "／10" : mode === "graft" ? "樹勢 +" + Math.round((scale - 0.6) * 100) + "%" : scale + " 株苗");
          rSrc.set(mode === "breed" ? "親代選種（逐代累積）" : mode === "graft" ? "接穗基因型（砧木不影響果實）" : "母株（無性複製）");
          rDiv.set(mode === "breed" ? "逐代收窄" : mode === "graft" ? "與接穗相同" : "極低（單一基因型）");
          verdict.set(mode === "graft" ? "易誤解：嫁接「不會」改變接穗的基因型或果實甜度" : mode === "tissue" ? "大量複製＝整片田基因型相同，病害一來可能全倒" : "選育靠雜交＋選種逐代累積，不是改造單一個體", mode === "graft" ? "warn" : "info");
        }
      });
      const techSel = PL.ui.select(ui.L.controls, { label: "技術", value: "breed", options: [
        { value: "breed", label: "選育與雜交" }, { value: "graft", label: "嫁接" }, { value: "tissue", label: "組織培養" }
      ], onChange: k => {
        if (k === "breed") { progS.setRange(1, 10, 1); progS.set(3); progS.label.textContent = "選育世代（代）"; }
        else if (k === "graft") { progS.setRange(0, 10, 1); progS.set(6); progS.label.textContent = "砧木活力（0–10）"; }
        else { progS.setRange(0, 8, 1); progS.set(4); progS.label.textContent = "繼代週期（次）"; }
      } });
      const progS = PL.ui.slider(ui.L.controls, { label: "選育世代（代）", min: 1, max: 10, step: 1, value: 3, digits: 0 });
      PL.ui.note(ui.L.controls, "選育累積性狀要靠多代；嫁接結合兩株的優點但不改變基因；組織培養能在短時間內大量複製同一基因型。");
      PL.ui.procedure(ui.L.controls, {
        title: "三種技術三種目的",
        steps: [
          "選育：拉動世代數，看甜度怎麼逐代逼近上限。",
          "嫁接：拉動砧木活力——樹變大了，果實甜度仍是接穗的 8.5。",
          "組織培養：每繼代一次苗數翻倍，4 次就有 64 株一模一樣的苗。"
        ],
        rule: "嫁接改變的是「樹」，不是「果實的基因」：果實性狀永遠跟著接穗走。"
      });
      const verdict = PL.ui.verdict(ui.L.controls, { label: "重點提醒", tone: "info" });
      const rTech = PL.ui.readout(ui.L.readouts, { label: "技術" });
      const rOut = PL.ui.readout(ui.L.readouts, { label: "成果規模" });
      const rSrc = PL.ui.readout(ui.L.readouts, { label: "性狀來源" });
      const rDiv = PL.ui.readout(ui.L.readouts, { label: "遺傳多樣性" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 生物技術應用與倫理 */
  PL.register("biotech-application", {
    build(root) {
      const TECHS = { gmo: "基因改造作物", clone: "複製動物", therapy: "基因治療" };
      const CELLS = [];
      { const rr = rng(13); for (let i = 0; i < 12; i++) CELLS.push([0.06 + (i % 4) * 0.24 + (rr() - 0.5) * 0.04, 0.16 + Math.floor(i / 4) * 0.26 + (rr() - 0.5) * 0.03]); }
      function applyTech(k) {
        if (k === "gmo") { sS.setRange(5, 200, 5); sS.set(50); sS.label.textContent = "隔離距離（m）"; chk.el.parentNode.querySelector("span").textContent = "加設防蟲緩衝帶"; }
        else if (k === "clone") { sS.setRange(1, 100, 1); sS.set(40); sS.label.textContent = "植入胚胎數（顆）"; chk.el.parentNode.querySelector("span").textContent = "僅供種源保存（非食用）"; }
        else { sS.setRange(1, 100, 5); sS.set(60); sS.label.textContent = "目標細胞編輯比例（%）"; chk.el.parentNode.querySelector("span").textContent = "限定體細胞（不改生殖細胞）"; }
      }
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const mode = techSel.get(), v = sS.get(), safe = chk.get();
          const px = W * 0.04, py = H * 0.13, pw = W * 0.60, ph = H * 0.74;
          CK.panel(ctx, px, py, pw, ph, TECHS[mode]);
          let bene, risk, law;
          if (mode === "gmo") {
            const drift = 100 * Math.exp(-v / 20) * (safe ? 0.3 : 1);
            const x0 = px + pw * 0.10, y0 = py + ph * 0.30, gap = 20 + v * 0.42, x1 = x0 + 108 + gap;
            for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) D.disc(ctx, x0 + c * 17, y0 + r * 20, 6, { fill: "rgba(102,187,106,0.9)" });
            if (safe) D.rect(ctx, x0 + 108, y0 - 14, gap - 8, 74, { fill: "rgba(255,241,180,0.35)", stroke: "rgba(200,170,60,0.6)", r: 4 });
            for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) D.disc(ctx, x1 + c * 15, y0 + 10 + r * 22, 5.5, { fill: "rgba(140,155,95,0.85)" });
            ctx.save(); ctx.globalAlpha = clamp(drift / 40, 0.12, 0.9); ctx.setLineDash([4, 4]);
            CK.arrow(ctx, x0 + 104, y0 + 14, x1 - 6, y0 + 18, "#e5a35a", "");
            CK.arrow(ctx, x0 + 104, y0 + 48, x1 - 6, y0 + 52, "#e5a35a", "");
            ctx.restore();
            D.text(ctx, "基改作物田", x0 + 42, y0 + 78, { color: PL.col("text-dim"), size: 10, align: "center" });
            D.text(ctx, (safe ? "緩衝帶　　" : "") + "　　野生近緣種", x0 + 104 + gap / 2, y0 + 78, { color: PL.col("text-faint"), size: 9.5, align: "center" });
            D.text(ctx, "花粉隨風漂流（虛線濃淡＝漂流強度）", x0 + 104 + (x1 - x0 - 104) / 2, y0 - 28, { color: "#e5a35a", size: 10, align: "center" });
            CK.badge(ctx, px + pw * 0.5, py + ph * 0.84, "基因漂流率 " + PL.fmt(drift, 1) + "%", drift < 1 ? "#2e7d32" : drift < 5 ? "#ef8829" : "#c62828");
            bene = "產量 +15%、農藥用量 −40%（Bt 作物常見量級）"; risk = "花粉漂流到野生近緣種：約 " + PL.fmt(drift, 1) + "%"; law = "上市前需環境釋放許可與標示";
            verdict.set(drift < 1 ? "漂流低於關注值：隔離措施足夠" : drift < 5 ? "建議再加大隔離距離或緩衝帶" : "高風險：抗蟲基因可能擴散到野外族群", drift < 1 ? "ok" : drift < 5 ? "warn" : "bad");
          } else if (mode === "clone") {
            const succ = Math.round(v * 0.03);
            D.disc(ctx, px + pw * 0.15, py + ph * 0.32, 22, { fill: "rgba(160,200,225,0.35)", stroke: "rgba(80,120,150,0.9)", width: 1.6 });
            D.disc(ctx, px + pw * 0.15, py + ph * 0.32, 8, { fill: "#b388d9" });
            D.text(ctx, "捐贈者體細胞", px + pw * 0.15, py + ph * 0.32 + 34, { color: PL.col("text-dim"), size: 10, align: "center" });
            CK.arrow(ctx, px + pw * 0.23, py + ph * 0.32, px + pw * 0.35, py + ph * 0.32, "#66bb6a", "核植入去核卵");
            for (let i = 0; i < Math.min(v, 30); i++) {
              D.disc(ctx, px + pw * 0.42 + (i % 6) * 24, py + ph * 0.20 + Math.floor(i / 6) * 24, 8, { fill: i < succ ? "rgba(102,187,106,0.85)" : PL.theme.shade(0.6), stroke: PL.col("border"), width: 1 });
            }
            D.text(ctx, "胚胎（僅顯示前 30 顆，綠＝成功著床）", px + pw * 0.56, py + ph * 0.68, { color: PL.col("text-faint"), size: 9.5 });
            CK.badge(ctx, px + pw * 0.5, py + ph * 0.84, "成功 " + succ + " 隻（成功率約 3%）", succ ? "#2e7d32" : "#c62828");
            bene = "保存優良種源、快速擴增優秀個體"; risk = "每 100 顆胚胎約 97 顆損耗"; law = "食用與醫療應用需個案倫理審查";
            verdict.set(safe ? "種源保存用途：個體隔離管理，爭議較低" : "成功率低且胚胎損耗大——需要倫理把關", safe ? "info" : "warn");
          } else {
            const k = Math.round(v / 100 * 12);
            CELLS.forEach((c, i) => {
              const cx2 = px + pw * 0.14 + c[0] * pw * 0.72, cy2 = py + ph * 0.16 + c[1] * ph * 0.44;
              const fixed = i < k, germ = !safe && i >= 9;
              D.disc(ctx, cx2, cy2, 14, { fill: fixed ? "rgba(102,187,106,0.5)" : germ ? "rgba(229,115,115,0.45)" : PL.theme.shade(0.6), stroke: PL.col("border"), width: 1.2 });
              D.disc(ctx, cx2, cy2, 5, { fill: fixed ? "rgba(46,125,50,0.9)" : germ ? "rgba(198,40,40,0.9)" : PL.theme.shade(0.35) });
            });
            D.text(ctx, "綠核＝已修復 " + k + "／12 個目標細胞", px + pw * 0.32, py + ph * 0.70, { color: PL.col("text-dim"), size: 10 });
            if (!safe) D.text(ctx, "紅核＝生殖細胞也被編輯：改變會遺傳給後代", px + pw * 0.32, py + ph * 0.78, { color: "#e57373", size: 10, weight: "700" });
            bene = "修復缺陷基因，治療傳統無藥可醫的遺傳疾病"; risk = "脫靶突變約 " + PL.fmt(0.5 + v * 0.04, 1) + "%，編輯比例越高越大"; law = safe ? "國際共識：僅限體細胞治療" : "生殖種系編輯：現行法規禁止";
            verdict.set(!safe ? "紅線：編輯生殖細胞會改變後代基因庫，法規禁止" : v > 60 ? "高比例編輯提高脫靶風險，需嚴格篩檢" : "體細胞治療：倫理上可接受，仍在臨床試驗階段", !safe ? "bad" : v > 60 ? "warn" : "ok");
          }
          rBene.set(bene); rRisk.set(risk); rLaw.set(law);
        }
      });
      const techSel = PL.ui.select(ui.L.controls, { label: "技術", value: "gmo", options: [
        { value: "gmo", label: "基因改造作物" }, { value: "clone", label: "複製動物" }, { value: "therapy", label: "基因治療" }
      ], onChange: k => applyTech(k) });
      const sS = PL.ui.slider(ui.L.controls, { label: "隔離距離（m）", min: 5, max: 200, step: 5, value: 50, digits: 0 });
      const chk = PL.ui.checkbox(ui.L.controls, { label: "加設防蟲緩衝帶", checked: true });
      PL.ui.note(ui.L.controls, "技術越強大，風險與倫理議題越複雜：基因漂流、胚胎損耗、脫靶突變——每項都要靠證據評估與社會對話來把關。");
      PL.ui.procedure(ui.L.controls, {
        title: "效益與風險一起看",
        steps: [
          "基因改造：把隔離距離從 5 m 拉到 200 m，看漂流率怎麼掉——距離就是隔離。",
          "複製動物：胚胎數拉到 100，成功也只約 3 隻——「複製成功」其實非常稀有。",
          "基因治療：取消「限定體細胞」，看紅核出現——生殖種系編輯是目前的倫理紅線。"
        ],
        rule: "「做得到」不等於「該做」：生物技術的每一步都要同時通過科學證據與倫理審查兩道關卡。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "Bt 棉花田", apply: () => { techSel.set("gmo"); sS.set(80); chk.set(true); ui.redraw(); } },
        { label: "複製冠軍乳牛", apply: () => { techSel.set("clone"); sS.set(70); chk.set(true); ui.redraw(); } },
        { label: "遺傳疾病基因治療", apply: () => { techSel.set("therapy"); sS.set(40); chk.set(true); ui.redraw(); } } ] });
      const verdict = PL.ui.verdict(ui.L.controls, { label: "倫理判定", tone: "info" });
      const rBene = PL.ui.readout(ui.L.readouts, { label: "效益指標" });
      const rRisk = PL.ui.readout(ui.L.readouts, { label: "風險量化" });
      const rLaw = PL.ui.readout(ui.L.readouts, { label: "現行規範" });
      applyTech("gmo");
      return { stop() { ui.stop(); } };
    }
  });
})();
