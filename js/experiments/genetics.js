/* 模組八 · 生殖與遺傳 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, CK = window.BioLab, D = PL.draw;
  const { clamp, lerp, TAU } = PL;

  // 可重現的隨機抽樣：同參數重畫結果一致，方便觀察「只改一個變因」的效果
  function seeded(seed) {
    let s = (seed >>> 0) || 1;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let z = s;
      z = Math.imul(z ^ (z >>> 15), z | 1);
      z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
      return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* 減數分裂與染色體數目 */
  PL.register("meiosis", {
    build(root) {
      const RED = "#e57373", BLU = "#5b8def";
      const STAGES = [
        { name: "前期 I（聯會）", cells: 1, dna: 4, hint: "同源染色體兩兩配對聯會，交叉互換在此發生" },
        { name: "中期 I", cells: 1, dna: 4, hint: "四分體排成兩列，紡錘絲附著在著絲點上" },
        { name: "後期 I", cells: 1, dna: 4, hint: "同源染色體分離，姊妹染色單體不分開" },
        { name: "末期 I", cells: 2, dna: 2, hint: "細胞一分為二：染色體數目在第一次分裂就減半" },
        { name: "中期 II", cells: 2, dna: 2, hint: "兩個細胞同步進入第二次分裂" },
        { name: "後期 II", cells: 2, dna: 2, hint: "著絲點分裂，姊妹染色單體分離成兩條染色體" },
        { name: "四個配子", cells: 4, dna: 1, hint: "四個單套（n）配子，染色體組合各不相同" }
      ];
      const ui = CK.scaffold(root, {
        aspect: 0.60,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const stg = +stageSel.get(), st = STAGES[stg], adv = advS.get(), xo = Math.round(xoS.get());
          const cc = { x: W * 0.30, y: H * 0.46 }, r1 = H * 0.29;
          const cellPos = i => st.cells === 1 ? [{ x: cc.x, y: cc.y }, r1]
            : st.cells === 2 ? [{ x: cc.x + (i ? 1 : -1) * r1 * 0.66, y: cc.y }, r1 * 0.58]
              : [{ x: cc.x + (i % 2 ? 1 : -1) * r1 * 0.66, y: cc.y + (i < 2 ? -1 : 1) * r1 * 0.58 }, r1 * 0.50];
          const chrom = (x, y, s, col, other, single) => { // X 形染色體＋互換色帶
            CK.chromosome(ctx, x, y, s, { color: col, single: !!single });
            if (other && xo > 0) for (let k = 0; k < xo; k++) {
              const t1 = 0.42 + k * 0.15, v = single ? { x: -0.35 * s, y: -s } : { x: -0.5 * s, y: -s };
              ctx.save(); ctx.lineCap = "round";
              D.line(ctx, x + v.x * t1, y + v.y * t1, x + v.x * (t1 + 0.1), y + v.y * (t1 + 0.1), other, 7); ctx.restore();
            }
          };
          const cells = [];
          for (let i = 0; i < st.cells; i++) {
            const [c, r] = cellPos(i); ctx.save(); ctx.beginPath();
            for (let k = 0; k <= 36; k++) { const a = k / 36 * TAU; ctx.lineTo(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r); }
            ctx.closePath(); ctx.fillStyle = "rgba(160,205,228,0.22)"; ctx.fill();
            ctx.strokeStyle = "rgba(80,120,150,0.9)"; ctx.lineWidth = 1.8; ctx.stroke(); ctx.restore();
            cells.push([c, r]);
          }
          const s1 = r1 * 0.24, s2 = r1 * 0.15;
          if (st.cells === 1) { // 一個細胞：長、短兩對同源染色體
            const pair = stg === 0 ? lerp(26, 7, adv) : 12, pull = stg === 2 ? lerp(14, r1 * 0.62, adv) : 12;
            const lY = stg === 0 ? cc.y : cc.y - r1 * 0.22, sY = stg === 0 ? cc.y : cc.y + r1 * 0.22;
            const lX = stg === 0 ? cc.x - r1 * 0.26 : cc.x, sX = stg === 0 ? cc.x + r1 * 0.26 : cc.x;
            chrom(lX - pair, lY, s1, RED, BLU); chrom(lX + pair, lY, s1, BLU, RED);
            chrom(sX - pair, sY, s2, RED, BLU); chrom(sX + pair, sY, s2, BLU, RED);
          } else if (st.cells === 2) { // 兩個細胞：各得一長一短（組合不同 → 獨立分配）
            cells.forEach(([c, r], i) => {
              const ca = i ? BLU : RED, cb = i ? RED : BLU, d = lerp(7, r * 0.55, adv);
              if (stg === 5) { // 後期 II：姊妹染色單體分離
                chrom(c.x - d, c.y, r * 0.30, ca, cb, 1); chrom(c.x + d, c.y, r * 0.30, ca, cb, 1);
                chrom(c.x - d, c.y + r * 0.34, r * 0.19, cb, ca, 1); chrom(c.x + d, c.y + r * 0.34, r * 0.19, cb, ca, 1);
              } else {
                chrom(c.x - r * 0.22, c.y - r * 0.14, r * 0.30, ca, cb); chrom(c.x + r * 0.22, c.y + r * 0.14, r * 0.19, cb, ca);
              }
            });
          } else cells.forEach(([c, r], i) => { // 四個配子：2² 種組合
            const mix = [[RED, RED], [RED, BLU], [BLU, RED], [BLU, BLU]][i];
            chrom(c.x - r * 0.2, c.y, r * 0.30, mix[0], mix[0] === RED ? BLU : RED, 1);
            chrom(c.x + r * 0.2, c.y, r * 0.19, mix[1], mix[1] === RED ? BLU : RED, 1);
          });
          if (stg === 1 || stg === 4) cells.forEach(([c, r]) =>
            D.line(ctx, c.x - r * 0.9, c.y, c.x + r * 0.9, c.y, PL.col("text-faint"), 1, [4, 4]));
          CK.badge(ctx, W * 0.30, H * 0.86, stg < 3 ? "2n = 4" : "n = 2", stg < 3 ? "#ef8829" : "#66bb6a");
          CK.panel(ctx, W * 0.64, H * 0.13, W * 0.32, H * 0.44, "階段資訊");
          D.text(ctx, st.name, W * 0.80, H * 0.26, { color: PL.col("accent"), size: 14, align: "center", weight: "700" });
          CK.meter(ctx, W * 0.68, H * 0.36, W * 0.24, 9, st.dna / 4, { color: "#ef8829", label: "DNA 含量 " + st.dna + "c" });
          D.text(ctx, stg < 5 ? "每條染色體含 2 個染色單體" : "每條染色體含 1 個染色單體", W * 0.80, H * 0.48, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          CK.legend(ctx, W * 0.68, H * 0.53, [{ color: RED, label: "父源染色體" }, { color: BLU, label: "母源染色體" }], 17);
          D.text(ctx, st.hint, W * 0.44, H * 0.94, { color: PL.col("text-dim"), size: 11, align: "center" });
          rCells.set(st.cells, 0); rDNA.set(st.dna, 0); rXo.set(xo, 0); rAdv.set(adv * 100, 0);
        }
      });
      const stageSel = PL.ui.select(ui.L.controls, { label: "分裂階段", value: "0", options: STAGES.map((s, i) => ({ value: String(i), label: s.name })) });
      const advS = PL.ui.slider(ui.L.controls, { label: "階段推進", min: 0, max: 1, step: 0.02, value: 0.5, digits: 2 });
      const xoS = PL.ui.slider(ui.L.controls, { label: "交叉互換", min: 0, max: 3, step: 1, value: 1, unit: "次", digits: 0 });
      PL.ui.note(ui.L.controls, "人類 23 對染色體：2 的 23 次方約 838 萬種配子組合，再加上交叉互換，配子的多樣性幾乎無限——這是有性生殖的價值。");
      PL.ui.procedure(ui.L.controls, {
        title: "追蹤染色體數目",
        steps: [
          "在「前期 I」推進滑桿：紅（父源）與藍（母源）染色體靠攏聯會，色帶是互換片段。",
          "看「後期 I」：分開的是<b>同源染色體</b>；末期 I 時每細胞只剩 2 條——減半已經發生。",
          "後期 II 分開的是<b>姊妹染色單體</b>；四個配子的紅藍組合各不相同。"
        ],
        rule: "染色體數目減半發生在第一次分裂（同源分離），第二次分裂只分開姊妹染色單體、數目不變——「減半在第二次分裂」是常見錯誤。"
      });
      PL.ui.presets(ui.L.controls, { label: "跳到", options: [
        { label: "聯會（前期 I）", apply: () => { stageSel.set("0"); advS.set(1); } },
        { label: "末期 I", apply: () => { stageSel.set("3"); advS.set(1); } },
        { label: "四個配子", apply: () => { stageSel.set("6"); advS.set(1); } }] });
      const rCells = PL.ui.readout(ui.L.readouts, { label: "細胞數" }), rDNA = PL.ui.readout(ui.L.readouts, { label: "DNA 含量", unit: "c" });
      const rXo = PL.ui.readout(ui.L.readouts, { label: "交叉互換", unit: "次" }), rAdv = PL.ui.readout(ui.L.readouts, { label: "階段完成度", unit: "%" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 配子形成與受精 */
  PL.register("sperm-egg", {
    build(root) {
      const RND = []; { const r = seeded(9137); for (let i = 0; i < 220; i++) RND.push([r(), r(), r()]); }
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const mode = modeSel.get(), prog = progS.get(), ns = Math.round(nS.get());
          const ex = W * 0.72, ey = H * 0.47, er = H * 0.21;
          const fused = mode !== "compare" && prog > 0.6;
          const sperm = (x, y, ph, sz) => { // 精子：頭部＋擺動的尾部
            D.disc(ctx, x, y, sz, { fill: "rgba(120,160,200,0.95)" });
            ctx.save(); ctx.beginPath();
            for (let k = 0; k <= 12; k++) { const u = k / 12; ctx.lineTo(x - sz - u * sz * 8, y + Math.sin(u * 8 + t * 6 + ph) * sz * 1.5 * u); }
            ctx.strokeStyle = "rgba(90,115,145,0.8)"; ctx.lineWidth = 1.1; ctx.stroke(); ctx.restore();
          };
          if (mode === "compare") { // 配子大小比較（同一比例尺）
            CK.panel(ctx, W * 0.05, H * 0.12, W * 0.90, H * 0.68, "配子大小比較（同一比例尺）");
            const cy2 = H * 0.44;
            D.disc(ctx, W * 0.26, cy2, H * 0.19, { fill: "rgba(255,214,165,0.9)", stroke: "rgba(190,120,60,0.9)", width: 2 });
            D.disc(ctx, W * 0.26, cy2, H * 0.065, { fill: "rgba(120,70,140,0.7)" });
            D.text(ctx, "卵：直徑約 0.12 mm，含大量細胞質與養分", W * 0.26, cy2 + H * 0.26, { color: PL.col("text-dim"), size: 11, align: "center" });
            for (let i = 0; i < Math.min(ns, 24); i++) sperm(W * 0.55 + (i % 8) * 26, cy2 - H * 0.08 + Math.floor(i / 8) * 26, RND[i][0] * 9, 3);
            D.text(ctx, "精子：頭部約 5 μm，靠尾部擺動前進", W * 0.72, cy2 + H * 0.20, { color: PL.col("text-dim"), size: 11, align: "center" });
            D.text(ctx, "體積比約 8000 : 1", W * 0.26, cy2 - H * 0.27, { color: PL.col("accent-2"), size: 13, align: "center", weight: "700" });
            rNear.set(Math.min(ns, 24), 0); rIn.set("—"); rZyg.set("n + n → 2n"); rProg.set(0, 0);
            return;
          }
          ctx.save(); // 輸卵管壁
          ctx.strokeStyle = "rgba(214,120,110,0.5)"; ctx.lineWidth = 13;
          ctx.beginPath(); ctx.moveTo(W * 0.02, H * 0.13); ctx.quadraticCurveTo(W * 0.4, H * 0.06, W * 0.98, H * 0.19); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(W * 0.02, H * 0.87); ctx.quadraticCurveTo(W * 0.4, H * 0.94, W * 0.98, H * 0.81); ctx.stroke();
          ctx.restore();
          D.text(ctx, "輸卵管壺腹部（受精發生處）", W * 0.22, H * 0.93, { color: PL.col("text-dim"), size: 11 });
          D.ring(ctx, ex, ey, er * 1.24, "rgba(240,170,110,0.45)", 2, [4, 6]); // 放射冠
          D.disc(ctx, ex, ey, er, { fill: "rgba(255,214,165,0.9)", stroke: "rgba(190,120,60,0.9)", width: 2 });
          D.disc(ctx, ex, ey, er * 0.30, { fill: "rgba(120,70,140,0.7)" });
          D.text(ctx, "卵（次級卵母細胞）", ex, ey - er - 14, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          let near = 0;
          for (let i = 0; i < ns; i++) {
            const u = RND[i], yj = ey + (u[0] - 0.5) * H * 0.52;
            const target = fused && i > 0 ? ex - er * 1.42 : ex - er * 0.92;
            const xj = lerp(W * 0.05 + u[1] * 40, target, clamp(prog * 1.3 - u[2] * 0.22, 0, 1));
            if (xj > ex - er * 2.2) near++;
            sperm(xj, yj, u[0] * 9, 3.2);
          }
          if (fused) { // 卵膜封鎖＋雄原核
            D.ring(ctx, ex, ey, er + 2, "rgba(224,92,82,0.9)", 3.4);
            const mx = lerp(ex - er * 0.7, ex - 9, clamp((prog - 0.6) / 0.4, 0, 1));
            D.disc(ctx, mx, ey + 7, 6, { fill: "rgba(90,130,190,0.95)" });
            D.text(ctx, "雄原核", mx, ey + 20, { color: PL.col("text-dim"), size: 9, align: "center" });
            CK.badge(ctx, W * 0.40, H * 0.18, "卵膜變化：阻止多精入卵", "#e05c52");
          }
          rNear.set(near, 0); rIn.set(fused ? 1 : 0, 0);
          rZyg.set(fused ? "2n（46 條）" : "n + n → 2n"); rProg.set(prog * 100, 0);
        }
      });
      const modeSel = PL.ui.select(ui.L.controls, { label: "場景", value: "fertilize", options: [
        { value: "fertilize", label: "輸卵管受精" }, { value: "compare", label: "配子大小比較" }] });
      const progS = PL.ui.slider(ui.L.controls, { label: "受精進度", min: 0, max: 1, step: 0.02, value: 0.3, digits: 2 });
      const nS = PL.ui.slider(ui.L.controls, { label: "精子數量", min: 20, max: 200, step: 10, value: 60, unit: "隻", digits: 0 });
      PL.ui.note(ui.L.controls, "男性的精子製造不停歇；女性的卵在出生前已形成，青春期後約每月釋放一顆。卵排出後約 12–24 小時內最容易被受精。");
      PL.ui.procedure(ui.L.controls, {
        title: "看一次受精",
        steps: [
          "先把「受精進度」拉到 0：數百萬顆精子只有少數抵達輸卵管上端。",
          "慢慢推進：精子競爭游向卵，注意體積懸殊的對比。",
          "進度超過 0.6：第一顆精子進入後，卵膜立刻封鎖，其他精子被擋在外側。",
          "切到「配子大小比較」，體會卵為什麼幾乎捐出所有細胞質。"
        ],
        rule: "阻止多精入卵靠的是卵膜變化（皮質顆粒反應），不是精子「排隊禮讓」——多精入卵的胚胎無法正常發育。"
      });
      const rNear = PL.ui.readout(ui.L.readouts, { label: "卵周精子數" }), rIn = PL.ui.readout(ui.L.readouts, { label: "已入卵精子數" });
      const rZyg = PL.ui.readout(ui.L.readouts, { label: "合子染色體數" }), rProg = PL.ui.readout(ui.L.readouts, { label: "受精進度", unit: "%" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 單性雜交與分離律 */
  PL.register("mendel-one", {
    build(root) {
      const CROSSES = [
        { name: "Aa × Aa（自交）", m: ["A", "a"], f: ["A", "a"], verdict: "自交出現 3:1：兩親皆異型，隱性性狀重現", tone: "info" },
        { name: "Aa × aa（測交）", m: ["A", "a"], f: ["a"], verdict: "後代 1:1 → 待測的顯性個體是異型（Aa）", tone: "ok" },
        { name: "AA × aa", m: ["A"], f: ["a"], verdict: "後代全顯性：親代皆純合，子代全為 Aa", tone: "info" },
        { name: "AA × Aa", m: ["A"], f: ["A", "a"], verdict: "後代全顯性，但一半是帶隱性基因的 Aa", tone: "info" }
      ];
      // P(顯性) = 1 − P(兩配子都帶 a)
      const pDomOf = cr => 1 - (cr.m.filter(g => g === "a").length / cr.m.length) * (cr.f.filter(g => g === "a").length / cr.f.length);
      let lastObs = 0.5;
      const ui = CK.scaffold(root, {
        aspect: 0.60,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const cr = CROSSES[crSel.get()], n = Math.round(nS.get()), tot = cr.m.length * cr.f.length;
          CK.panel(ctx, W * 0.05, H * 0.12, W * 0.42, H * 0.60, "棋盤方格（列＝母配子，行＝父配子）");
          const cnt = CK.punnett(ctx, { x: W * 0.08, y: H * 0.20, w: W * 0.36, h: H * 0.44 }, cr.m, cr.f, {});
          const pDom = Object.keys(cnt).reduce((a, k) => a + (k[0] === "A" ? cnt[k] : 0), 0) / tot;
          const r = seeded(n * 17 + crSel.get() * 101 + 3);
          let dom = 0; for (let i = 0; i < n; i++) if (r() < pDom) dom++;
          const obs = n ? dom / n : 0; lastObs = obs;
          CK.panel(ctx, W * 0.51, H * 0.12, W * 0.44, H * 0.60, "表現型統計（高莖為顯性）");
          const ccx = W * 0.56, ccw = W * 0.34;
          CK.counter(ctx, ccx, H * 0.24, ccw, Math.min(dom, 80), { color: "#7cb342" });
          D.text(ctx, "顯性（高莖）" + dom + " 個", ccx, H * 0.40, { color: PL.col("text-dim"), size: 11 });
          CK.counter(ctx, ccx, H * 0.46, ccw, Math.min(n - dom, 80), { color: "#e8d44d" });
          D.text(ctx, "隱性（矮莖）" + (n - dom) + " 個", ccx, H * 0.62, { color: PL.col("text-dim"), size: 11 });
          const my = H * 0.66, mx = W * 0.55, mw = W * 0.36, tx = mx + mw * pDom;
          CK.meter(ctx, mx, my, mw, 9, obs, { color: "#7cb342", label: "模擬顯性 " + PL.fmt(obs * 100, 1) + "%" });
          D.line(ctx, tx, my - 4, tx, my + 13, "#e57373", 2);
          D.text(ctx, "理論 " + PL.fmt(pDom * 100, 0) + "%", tx, my + 21, { color: "#e57373", size: 9.5, align: "center" });
          rTheo.set(pDom >= 0.999 ? "全部顯性" : (Math.abs(pDom / (1 - pDom) - Math.round(pDom / (1 - pDom))) < 0.01
            ? Math.round(pDom / (1 - pDom)) + " : 1" : PL.fmt(pDom / (1 - pDom), 2) + " : 1"));
          rGeno.set(Object.keys(cnt).sort().map(k => k + " " + cnt[k] + " 格").join("、"));
          rObs.set(obs * 100, 1); rN.set(n, 0); vr.set(cr.verdict, cr.tone);
        }
      });
      const crSel = PL.ui.select(ui.L.controls, { label: "親代組合", value: "0", options: CROSSES.map((c, i) => ({ value: String(i), label: c.name })) });
      const nS = PL.ui.slider(ui.L.controls, { label: "模擬子代數", min: 20, max: 2000, step: 10, value: 200, unit: "株", digits: 0 });
      PL.ui.note(ui.L.controls, "顯性個體的基因型可能是 AA 或 Aa——表現型看不出來，要用測交（與隱性 aa 交配）來檢驗。");
      PL.ui.procedure(ui.L.controls, {
        title: "驗證分離律",
        steps: [
          "先看棋盤方格：每格機率相等，數出 AA、Aa、aa 各占幾格。",
          "拉動「模擬子代數」從 20 到 2000，盯著「模擬顯性比例」讀數。",
          "對照圖表：樣本小時落點常偏離理論線，但不會超出 ±2σ 太多。",
          "切到「測交」：1:1 的結果是判定 Aa 的證據。"
        ],
        rule: "「3:1」是每一代的機率，不是保證——生 4 株剛好 3 顯 1 隱的機率其實只有約 42%，小樣本偏離是正常的。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "自交 3:1", apply: () => { crSel.set("0"); nS.set(200); } },
        { label: "測交 1:1", apply: () => crSel.set("1") },
        { label: "大樣本", apply: () => { crSel.set("0"); nS.set(2000); } }] });
      const rTheo = PL.ui.readout(ui.L.readouts, { label: "理論表現型比" }), rGeno = PL.ui.readout(ui.L.readouts, { label: "基因型格數" });
      const rObs = PL.ui.readout(ui.L.readouts, { label: "模擬顯性比例", unit: "%" }), rN = PL.ui.readout(ui.L.readouts, { label: "模擬樣本數", unit: "株" });
      const vr = PL.ui.verdict(ui.L.readouts, { label: "判定" });
      const chart = ui.chart("樣本數與機率偏離", "虛線是理論值 ±2σ（約 95% 落點範圍）。樣本越大範圍越窄——小樣本偏離理論是正常的機率波動。");
      const drawChart = () => {
        const pd = pDomOf(CROSSES[crSel.get()]), sd = Math.sqrt(Math.max(pd * (1 - pd), 1e-6));
        CK.plot(chart, {
          x0: 20, x1: 2000, y0: 0, y1: 1, xlabel: "模擬子代數（株）", ylabel: "顯性比例",
          series: [
            { fn: nn => Math.min(1, pd + 2 * sd / Math.sqrt(nn)), color: "#e57373", dash: [6, 4] },
            { fn: nn => Math.max(0, pd - 2 * sd / Math.sqrt(nn)), color: "#e57373", dash: [6, 4] }],
          marks: [{ hline: pd, color: PL.col("text-faint"), dash: [2, 3] },
                  { dot: [Math.max(20, nS.get()), clamp(lastObs, 0, 1)], color: PL.col("accent-2"), label: "目前" }]
        });
      };
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart);
      root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 兩性雜交與獨立分配律 */
  PL.register("mendel-two", {
    build(root) {
      const NAMES = ["皺綠", "皺黃", "圓綠", "圓黃"], COLS = ["#557a3a", "#c9962e", "#7cb342", "#e8c34d"];
      const phx = gt => (gt[0] === "A" || gt[2] === "A" ? 2 : 0) + (gt[1] === "B" || gt[3] === "B" ? 1 : 0);
      const gamOf = r => [["AB", (1 - r) / 2], ["Ab", r / 2], ["aB", r / 2], ["ab", (1 - r) / 2]];
      const expOf = r => { const g = gamOf(r), e = [0, 0, 0, 0];
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) e[phx(g[i][0] + g[j][0])] += g[i][1] * g[j][1];
        return e; };
      const ui = CK.scaffold(root, {
        aspect: 0.60,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const rv = rS.get(), r = rv / 100, n = Math.round(nS.get());
          const gam = gamOf(r), exp = expOf(r);
          CK.panel(ctx, W * 0.04, H * 0.11, W * 0.38, H * 0.56, "基因位置（聯鎖群）");
          const chx = W * 0.13, chy = H * 0.28, cs = 24;
          CK.chromosome(ctx, chx, chy, cs, { color: "#e57373" });   // A 與 B 在同一條上（連鎖）
          CK.chromosome(ctx, chx + 40, chy, cs, { color: "#5b8def" });
          if (r > 0) { ctx.save(); ctx.lineCap = "round"; const t1 = 0.35, t2 = 0.35 + r * 1.1;
            D.line(ctx, chx - 0.5 * cs * t1, chy - cs * t1, chx - 0.5 * cs * t2, chy - cs * t2, "#5b8def", 7); ctx.restore(); }
          [["A", chx, -1, "#e57373"], ["B", chx, 1, "#e57373"], ["a", chx + 40, -1, "#5b8def"], ["b", chx + 40, 1, "#5b8def"]]
            .forEach(([g, xx, sd, col]) => D.text(ctx, g, xx + cs * 0.55, chy + sd * (cs + 9), { color: col, size: 12, align: "center", weight: "700" }));
          D.text(ctx, "A、B 位在同一條染色體上（連鎖）", W * 0.23, H * 0.16, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          gam.forEach(([gname, p], i) => {
            const gy = H * 0.44 + i * 20;
            D.text(ctx, gname, W * 0.09, gy + 7, { color: PL.col("text"), size: 11, weight: "700" });
            CK.meter(ctx, W * 0.12, gy, W * 0.17, 8, p * 2, { color: i % 3 ? "#8fb7d9" : "#e0a33a" });
            D.text(ctx, PL.fmt(p * 100, 0) + "%", W * 0.31, gy + 7, { color: PL.col("text-dim"), size: 10 });
          });
          D.text(ctx, "配子頻率（由互換率 r 決定）", W * 0.23, H * 0.64, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          // 4×4 機率方格：格深＝該組合的機率
          CK.panel(ctx, W * 0.44, H * 0.11, W * 0.52, H * 0.56, "機率方格（格深＝該組合的機率）");
          const gx = W * 0.47, gy0 = H * 0.16, labW = 40, labH = 22;
          const cw = (W * 0.46 - labW) / 4, chh = (H * 0.46 - labH) / 4;
          for (let j = 0; j < 4; j++) D.text(ctx, gam[j][0], gx + labW + cw * (j + 0.5), gy0 + 13, { color: PL.col("text-dim"), size: 11, align: "center", weight: "700" });
          for (let i = 0; i < 4; i++) {
            D.text(ctx, gam[i][0], gx + labW / 2, gy0 + labH + chh * (i + 0.5) + 5, { color: PL.col("text-dim"), size: 11, align: "center", weight: "700" });
            for (let j = 0; j < 4; j++) {
              const p = gam[i][1] * gam[j][1], gt = gam[i][0] + gam[j][0], cx0 = gx + labW + j * cw + 1, cy0 = gy0 + labH + i * chh + 1;
              D.rect(ctx, cx0, cy0, cw - 2, chh - 2, { stroke: PL.col("border"), width: 1, r: 3 });
              ctx.save(); ctx.globalAlpha = 0.05 + p * 2.5;
              D.rect(ctx, cx0, cy0, cw - 2, chh - 2, { fill: COLS[phx(gt)], r: 3 });
              ctx.restore();
              D.text(ctx, gt, cx0 + cw / 2 - 1, cy0 + chh / 2 + 3, { color: PL.col("text"), size: 9.5, align: "center" });
            }
          }
          const rr = seeded(n * 29 + rv * 13 + 1), obs = [0, 0, 0, 0];
          const pick = rnd => { let u = rnd(), k = 0; while (k < 3 && u > gam[k][1]) { u -= gam[k][1]; k++; } return gam[k][0]; };
          for (let i = 0; i < n; i++) obs[phx(pick(rr) + pick(rr))]++;
          for (let k = 0; k < 4; k++) {
            const bx = W * 0.05 + k * W * 0.235;
            CK.meter(ctx, bx, H * 0.78, W * 0.19, 9, obs[k] / n, { color: COLS[k], label: NAMES[k] + " 觀察 " + PL.fmt(obs[k] / n * 100, 1) + "%" });
            D.line(ctx, bx + W * 0.19 * exp[k], H * 0.78 - 4, bx + W * 0.19 * exp[k], H * 0.78 + 13, PL.col("text"), 1.6);
            D.text(ctx, "理論 " + PL.fmt(exp[k] * 100, 1) + "%", bx + W * 0.095, H * 0.86, { color: PL.col("text-faint"), size: 9, align: "center" });
          }
          rR.set(rv, 0); rPar.set((obs[3] + obs[0]) / n * 100, 1);
          rDev.set(Math.max(...[1, 3, 3, 9].map((e, i) => Math.abs(obs[i] / n * 100 - e / 16 * 100))), 1);
          rN.set(n, 0);
          if (rv === 0) vr.set("完全連鎖：只有親本型組合（圓黃、皺綠），看不到 9:3:3:1", "warn");
          else if (rv === 50) vr.set("獨立分配：兩對基因在不同染色體，接近 9:3:3:1", "ok");
          else vr.set("部分連鎖：重組率越低，親本型越多、偏離越大", "info");
        }
      });
      const rS = PL.ui.slider(ui.L.controls, { label: "互換率 r", min: 0, max: 50, step: 5, value: 50, unit: "%", digits: 0 });
      const nS = PL.ui.slider(ui.L.controls, { label: "模擬子代數", min: 200, max: 4000, step: 100, value: 1000, unit: "株", digits: 0 });
      PL.ui.note(ui.L.controls, "9:3:3:1 來自機率乘法：P(A_B_) = 9/16。基因連鎖時，親本型配子偏多，比率就會偏離——重組率可拿來估算基因間的距離。");
      PL.ui.procedure(ui.L.controls, {
        title: "看連鎖怎麼扭曲比率",
        steps: [
          "互換率 50%（獨立分配）：四種配子各 25%，方格顏色均勻。",
          "把互換率拉到 0：AB、ab 各半——方格只剩對角線有色。",
          "對照底部四條計量條：觀察值（綠條）與理論刻度的差距。",
          "中間值（如 20%）：介於兩者之間，重組型配子少量出現。"
        ],
        rule: "比率偏離 9:3:3:1 時，先想「連鎖與互換」，再想「樣本誤差」——兩對基因在同一條染色體上就不會有獨立分配。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "完全連鎖", apply: () => rS.set(0) },
        { label: "部分連鎖", apply: () => rS.set(20) },
        { label: "獨立分配", apply: () => rS.set(50) }] });
      const rR = PL.ui.readout(ui.L.readouts, { label: "互換率", unit: "%" }), rPar = PL.ui.readout(ui.L.readouts, { label: "親本型觀察比例", unit: "%" });
      const rDev = PL.ui.readout(ui.L.readouts, { label: "與 9:3:3:1 最大偏差", unit: "百分點" }), rN = PL.ui.readout(ui.L.readouts, { label: "模擬樣本數", unit: "株" });
      const vr = PL.ui.verdict(ui.L.readouts, { label: "判定" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 棋盤方格與遺傳機率 */
  PL.register("punnett-square", {
    build(root) {
      const GEN = { AA: ["A"], Aa: ["A", "a"], aa: ["a"] };
      const hashKey = (a, b, n) => n * 23 + (a.charCodeAt(0) * 31 + b.charCodeAt(0) * 7 + a.charCodeAt(1) * 3);
      const ui = CK.scaffold(root, {
        aspect: 0.60,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const g1 = GEN[p1Sel.get()], g2 = GEN[p2Sel.get()], n = Math.round(nS.get());
          const tot = g1.length * g2.length;
          CK.panel(ctx, W * 0.05, H * 0.12, W * 0.40, H * 0.62, "棋盤方格（列＝親代1，行＝親代2）");
          const cnt = CK.punnett(ctx, { x: W * 0.09, y: H * 0.21, w: W * 0.36, h: H * 0.44 }, g1, g2, {});
          D.text(ctx, "每格機率 = " + PL.fmt(100 / tot, 0) + "%（每格等機率）", W * 0.25, H * 0.72, { color: PL.col("text-faint"), size: 10, align: "center" });
          D.text(ctx, "P(格) = P(配子₁) × P(配子₂)", W * 0.25, H * 0.77, { color: PL.col("accent-2"), size: 11, align: "center", weight: "700" });
          const pAA = (cnt.AA || 0) / tot, pAa = (cnt.Aa || 0) / tot, paa = (cnt.aa || 0) / tot;
          const r = seeded(hashKey(p1Sel.get(), p2Sel.get(), n)), obs = { AA: 0, Aa: 0, aa: 0 };
          for (let i = 0; i < n; i++) { const u = r(); obs[u < pAA ? "AA" : u < pAA + pAa ? "Aa" : "aa"]++; }
          CK.panel(ctx, W * 0.49, H * 0.12, W * 0.46, H * 0.62, "機率與模擬（條上刻度＝理論值）");
          [["AA", pAA, "#7cb342"], ["Aa", pAa, "#5b8def"], ["aa", paa, "#e57373"]].forEach(([gname, p, col], i) => {
            const ry = H * 0.24 + i * 42, mx = W * 0.58, mw = W * 0.30;
            D.text(ctx, gname, W * 0.53, ry + 8, { color: PL.col("text"), size: 12, weight: "700" });
            CK.meter(ctx, mx, ry, mw, 9, n ? obs[gname] / n : 0, { color: col, label: "模擬 " + (n ? PL.fmt(obs[gname] / n * 100, 1) : "—") + "%" });
            if (p > 0) {
              const tx = mx + mw * p;
              D.line(ctx, tx, ry - 4, tx, ry + 13, PL.col("warn"), 1.8);
              D.text(ctx, "P=" + PL.fmt(p * 100, 0) + "%", tx, ry + 21, { color: PL.col("warn"), size: 9, align: "center" });
            }
            D.text(ctx, "理論 " + p + "/" + tot + " 格", W * 0.90, ry + 8, { color: PL.col("text-faint"), size: 9.5 });
          });
          D.text(ctx, "表現型：顯性 = AA + Aa = " + PL.fmt((pAA + pAa) * 100, 0) + "%", W * 0.72, H * 0.60, { color: PL.col("text"), size: 12, align: "center", weight: "700" });
          D.text(ctx, "多對基因時方格會爆量（兩對＝4×4），改用乘法法則逐一獨立計算更快", W * 0.72, H * 0.70, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          rPD.set((pAA + pAa) * 100, 1); rOD.set(n ? (obs.AA + obs.Aa) / n * 100 : 0, 1);
          rPH.set(pAa * 100, 1); rOH.set(n ? obs.Aa / n * 100 : 0, 1);
        }
      });
      const OPTS = [{ value: "AA", label: "AA（同型顯性）" }, { value: "Aa", label: "Aa（異型）" }, { value: "aa", label: "aa（同型隱性）" }];
      const p1Sel = PL.ui.select(ui.L.controls, { label: "親代 1 基因型", value: "Aa", options: OPTS });
      const p2Sel = PL.ui.select(ui.L.controls, { label: "親代 2 基因型", value: "Aa", options: OPTS });
      const nS = PL.ui.slider(ui.L.controls, { label: "模擬次數", min: 0, max: 1000, step: 10, value: 200, unit: "次", digits: 0 });
      PL.ui.note(ui.L.controls, "方格法的心臟是「每一格機率相等」：先數格數得基因型比率，再按顯隱合併得表現型比率——合併順序不能倒。");
      PL.ui.procedure(ui.L.controls, {
        title: "讀懂棋盤方格",
        steps: [
          "Aa × Aa：數格數得 1 AA : 2 Aa : 1 aa，表現型 3:1。",
          "拉動「模擬次數」：模擬條逐漸貼近理論刻度（大數法則）。",
          "切到 Aa × aa：格子只剩 Aa、aa 各半——這就是測交的方格。",
          "對照右下公式：每格機率＝兩個配子機率的乘積。"
        ],
        rule: "基因型比率要「按格數合併」（1:2:1），表現型再按顯隱合併（3:1）——直接把 3:1 當基因型比率是最常見的錯。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "測交方格", apply: () => { p1Sel.set("Aa"); p2Sel.set("aa"); } },
        { label: "AA × Aa", apply: () => { p1Sel.set("AA"); p2Sel.set("Aa"); } }] });
      const rPD = PL.ui.readout(ui.L.readouts, { label: "P(顯性表現型)", unit: "%" }), rOD = PL.ui.readout(ui.L.readouts, { label: "模擬顯性", unit: "%" });
      const rPH = PL.ui.readout(ui.L.readouts, { label: "P(異型 Aa)", unit: "%" }), rOH = PL.ui.readout(ui.L.readouts, { label: "模擬異型", unit: "%" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 血型遺傳（ABO） */
  PL.register("blood-type", {
    build(root) {
      const GEN = {
        IAIA: { label: "A 型（IᴬIᴬ）", g: ["Iᴬ"] }, IAi: { label: "A 型（Iᴬi）", g: ["Iᴬ", "i"] },
        IBIB: { label: "B 型（IᴮIᴮ）", g: ["Iᴮ"] }, IBi: { label: "B 型（Iᴮi）", g: ["Iᴮ", "i"] },
        IAIB: { label: "AB 型（IᴬIᴮ）", g: ["Iᴬ", "Iᴮ"] }, ii: { label: "O 型（ii）", g: ["i"] }
      };
      const PH = ["A", "B", "AB", "O"], PCOL = { A: "#e05c52", B: "#4f8fe0", AB: "#9575cd", O: "#66a86b" };
      const GTXT = { A: "IᴬIᴬ / Iᴬi", B: "IᴮIᴮ / Iᴮi", AB: "IᴬIᴮ", O: "ii" };
      const phOf = k => k.includes("Iᴬ") ? (k.includes("Iᴮ") ? "AB" : "A") : (k.includes("Iᴮ") ? "B" : "O");
      const ui = CK.scaffold(root, {
        aspect: 0.60,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const mo = GEN[mSel.get()], fa = GEN[fSel.get()], tot = mo.g.length * fa.g.length;
          CK.panel(ctx, W * 0.05, H * 0.12, W * 0.40, H * 0.58, "棋盤方格（列＝母親配子，行＝父親配子）");
          const raw = CK.punnett(ctx, { x: W * 0.09, y: H * 0.22, w: W * 0.36, h: H * 0.40 }, mo.g, fa.g, {});
          const prob = { A: 0, B: 0, AB: 0, O: 0 };
          Object.keys(raw).forEach(k => { prob[phOf(k)] += raw[k] / tot; });
          D.text(ctx, "A 與 B 共顯性（IᴬIᴮ = AB 型）；i 為隱性", W * 0.25, H * 0.75, { color: PL.col("text-faint"), size: 10, align: "center" });
          const rbc = (x, y, kind) => { // 紅血球與表面抗原
            D.disc(ctx, x, y, 13, { fill: "rgba(224,92,82,0.9)" });
            const nub = (dx, dy, c) => D.disc(ctx, x + dx, y + dy, 2.6, { fill: c });
            if (kind === "A" || kind === "AB") { nub(-5, -4, "#ffd54f"); nub(5, -4, "#ffd54f"); }
            if (kind === "B" || kind === "AB") { nub(-5, 5, "#4fa8e0"); nub(5, 5, "#4fa8e0"); }
          };
          const poss = [];
          PH.forEach((k, i) => {
            const x = W * 0.56 + i * W * 0.11, y = H * 0.22, on = prob[k] > 0;
            if (on) poss.push(k);
            D.rect(ctx, x - W * 0.05, y - H * 0.05, W * 0.10, H * 0.40,
              { fill: PL.theme.shade(on ? 0.55 : 0.72), stroke: on ? PCOL[k] : PL.col("border"), width: on ? 1.6 : 1, r: 6 });
            rbc(x, y + H * 0.04, k);
            D.text(ctx, k + " 型", x, y + H * 0.16, { color: on ? PL.col("text") : PL.col("text-faint"), size: 13, align: "center", weight: "700" });
            D.text(ctx, on ? PL.fmt(prob[k] * 100, 0) + "%" : "0%", x, y + H * 0.235, { color: on ? PCOL[k] : PL.col("text-faint"), size: 15, align: "center", weight: "700" });
            D.text(ctx, on ? GTXT[k] : "不會出現", x, y + H * 0.30, { color: on ? PL.col("text-dim") : PL.col("text-faint"), size: 9, align: "center" });
          });
          D.text(ctx, "紅血球上的小點＝抗原（金＝A 抗原、藍＝B 抗原）", W * 0.75, H * 0.66, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          D.text(ctx, "血漿抗體：A 型有抗 B、B 型有抗 A、O 型兩者皆有、AB 型皆無", W * 0.75, H * 0.74, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          rPoss.set(poss.join("、")); rAB.set(prob.AB * 100, 0); rO.set(prob.O * 100, 0);
          rImp.set(PH.filter(k => prob[k] === 0).join("、") || "—");
          const mk = mSel.get(), fk = fSel.get();
          if ((mk === "IAIB" && fk === "ii") || (fk === "IAIB" && mk === "ii"))
            vr.set("AB × O：子女只可能是 A 或 B 型——不會有 AB，也不會有 O", "warn");
          else if (mk === "ii" && fk === "ii") vr.set("O × O：子女全部是 O 型", "ok");
          else if (mk === "IAIB" && fk === "IAIB") vr.set("AB × AB：可能出 A、B、AB，不會有 O 型", "info");
          else vr.set("表現型無法直接推定基因型：A 型可能是 IᴬIᴬ 或 Iᴬi", "info");
        }
      });
      const OPTS = Object.keys(GEN).map(k => ({ value: k, label: GEN[k].label }));
      const mSel = PL.ui.select(ui.L.controls, { label: "母親基因型", value: "IAi", options: OPTS });
      const fSel = PL.ui.select(ui.L.controls, { label: "父親基因型", value: "IBi", options: OPTS });
      PL.ui.note(ui.L.controls, "親代的表現型不能直接推出基因型：A 型可能是 IᴬIᴬ（純合）或 Iᴬi（異型），這是 ABO 題目最容易出錯的地方。");
      PL.ui.procedure(ui.L.controls, {
        title: "ABO 判讀三步",
        steps: [
          "把表現型換成「所有可能」的基因型（A 型有兩種可能）。",
          "寫出雙親配子，填入棋盤方格。",
          "按共顯性規則讀出表現型：IᴬIᴮ 同時表現 A 與 B。"
        ],
        rule: "兩個 A 型父母可以生出 O 型子女（各帶一個 i），但絕不可能生出 AB 型子女——用「不可能出現的血型」排除法最穩。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "A×B 生出四種", apply: () => { mSel.set("IAi"); fSel.set("IBi"); } },
        { label: "AB × O（誤解情境）", apply: () => { mSel.set("IAIB"); fSel.set("ii"); } },
        { label: "O × O", apply: () => { mSel.set("ii"); fSel.set("ii"); } }] });
      const rPoss = PL.ui.readout(ui.L.readouts, { label: "子代可能血型" }), rImp = PL.ui.readout(ui.L.readouts, { label: "不可能出現的血型" });
      const rAB = PL.ui.readout(ui.L.readouts, { label: "AB 型機率", unit: "%" }), rO = PL.ui.readout(ui.L.readouts, { label: "O 型機率", unit: "%" });
      const vr = PL.ui.verdict(ui.L.readouts, { label: "判定" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 性聯遺傳與色盲 */
  PL.register("sex-linked", {
    build(root) {
      const MOM = {
        XBXB: { label: "XᴮXᴮ（正常）", g: ["Xᴮ"] }, XBXb: { label: "XᴮXᵇ（帶因）", g: ["Xᴮ", "Xᵇ"] },
        XbXb: { label: "XᵇXᵇ（色盲）", g: ["Xᵇ", "Xᵇ"] }
      };
      const DAD = { XBY: { label: "XᴮY（正常）", g: ["Xᴮ", "Y"] }, XbY: { label: "XᵇY（色盲）", g: ["Xᵇ", "Y"] } };
      const hashKey = (a, b, n) => n * 31 + (a.charCodeAt(0) * 17 + b.charCodeAt(1) * 7);
      const ui = CK.scaffold(root, {
        aspect: 0.60,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const mk = mSel.get(), fk = fSel.get(), n = Math.round(nS.get());
          const mo = MOM[mk], fa = DAD[fk], tot = mo.g.length * fa.g.length;
          CK.panel(ctx, W * 0.05, H * 0.12, W * 0.42, H * 0.56, "棋盤方格（列＝母親配子，行＝父親配子）");
          const raw = CK.punnett(ctx, { x: W * 0.09, y: H * 0.21, w: W * 0.38, h: H * 0.40 }, mo.g, fa.g, {});
          const cnt = {};
          Object.keys(raw).forEach(k => { const q = k[0] === "Y" ? k.slice(1) + "Y" : k; cnt[q] = (cnt[q] || 0) + raw[k]; });
          let pSon = 0, pCbSon = 0, pDau = 0, pCbDau = 0, pCarDau = 0;
          Object.keys(cnt).forEach(k => {
            const p = cnt[k] / tot;
            if (k.includes("Y")) { pSon += p; if (k.includes("Xᵇ")) pCbSon += p; }
            else { pDau += p; if (k === "XᵇXᵇ") pCbDau += p; else if (k.includes("Xᵇ")) pCarDau += p; }
          });
          const OUT = [["正常男", pSon - pCbSon], ["色盲男", pCbSon], ["正常女", pDau - pCbDau - pCarDau], ["帶因女", pCarDau], ["色盲女", pCbDau]];
          const rr = seeded(hashKey(mk, fk, n)), ncb = { m: 0, f: 0 };
          for (let i = 0; i < n; i++) {
            let u = rr(), k = 0, acc = 0;
            while (k < 4 && u > acc + OUT[k][1]) { acc += OUT[k][1]; k++; }
            if (k <= 1) ncb.m++; else if (k === 4) ncb.f++;
          }
          CK.panel(ctx, W * 0.51, H * 0.12, W * 0.44, H * 0.56, "子代結果（紅＝色盲、橙框＝帶因）");
          D.text(ctx, "兒子（Y 來自父親）", W * 0.58, H * 0.20, { color: PL.col("text-dim"), size: 11, weight: "700" });
          CK.pedigreePerson(ctx, W * 0.58, H * 0.30, "male", 0, { s: 11 });
          CK.pedigreePerson(ctx, W * 0.74, H * 0.30, "male", 1, { s: 11 });
          D.text(ctx, "正常 " + PL.fmt((pSon - pCbSon) * 100, 0) + "%", W * 0.58, H * 0.37, { color: PL.col("text-dim"), size: 10, align: "center" });
          D.text(ctx, "色盲 " + PL.fmt(pCbSon * 100, 0) + "%", W * 0.74, H * 0.37, { color: "#e57373", size: 10, align: "center" });
          D.text(ctx, "女兒（X 來自父親與母親）", W * 0.62, H * 0.46, { color: PL.col("text-dim"), size: 11, weight: "700" });
          CK.pedigreePerson(ctx, W * 0.55, H * 0.56, "female", 0, { s: 11 });
          CK.pedigreePerson(ctx, W * 0.70, H * 0.56, "female", 0, { s: 11, carrier: 1 });
          CK.pedigreePerson(ctx, W * 0.85, H * 0.56, "female", 1, { s: 11 });
          D.text(ctx, "正常 " + PL.fmt((pDau - pCbDau - pCarDau) * 100, 0) + "%", W * 0.55, H * 0.63, { color: PL.col("text-dim"), size: 10, align: "center" });
          D.text(ctx, "帶因 " + PL.fmt(pCarDau * 100, 0) + "%", W * 0.70, H * 0.63, { color: "#ffb74d", size: 10, align: "center" });
          D.text(ctx, "色盲 " + PL.fmt(pCbDau * 100, 0) + "%", W * 0.85, H * 0.63, { color: "#e57373", size: 10, align: "center" });
          D.text(ctx, "模擬 " + n + " 名子女", W * 0.73, H * 0.70, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          CK.counter(ctx, W * 0.55, H * 0.75, W * 0.17, Math.min(ncb.m + ncb.f, 48), { color: "#e57373", r: 3.2 });
          CK.counter(ctx, W * 0.76, H * 0.75, W * 0.17, Math.min(n - ncb.m - ncb.f, 48), { color: "#5b8def", r: 3.2 });
          D.text(ctx, "色盲 " + (ncb.m + ncb.f) + " 人（紅點）／正常 " + (n - ncb.m - ncb.f) + " 人（藍點）", W * 0.73, H * 0.82, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          CK.legend(ctx, W * 0.09, H * 0.75, [{ color: "#5b8def", label: "Xᴮ（正常等位基因）" }, { color: "#e57373", label: "Xᵇ（色盲等位基因）" }], 16);
          rBS.set(pCbSon * 100, 0); rBD.set(pCbDau * 100, 0); rCD.set(pCarDau * 100, 0);
          rSim.set(n ? (ncb.m + ncb.f) / n * 100 : 0, 1);
          if (mk === "XBXb" && fk === "XBY") vr.set("帶因母 × 正常父：兒子 1/2 色盲——兒子的 X 一定來自母親", "warn");
          else if (fk === "XbY" && mk === "XBXB") vr.set("色盲父 × 正常母：子女全正常，女兒全帶因（父的 X 只傳女兒）", "info");
          else if (mk === "XbXb") vr.set("色盲母親：所有兒子都色盲——兒子的 X 只能來自母親", "bad");
          else vr.set("女兒要色盲，必須父親色盲且母親至少帶因——所以女性患者罕見", "info");
        }
      });
      const mSel = PL.ui.select(ui.L.controls, { label: "母親基因型", value: "XBXb", options: Object.keys(MOM).map(k => ({ value: k, label: MOM[k].label })) });
      const fSel = PL.ui.select(ui.L.controls, { label: "父親基因型", value: "XBY", options: Object.keys(DAD).map(k => ({ value: k, label: DAD[k].label })) });
      const nS = PL.ui.slider(ui.L.controls, { label: "模擬子女數", min: 20, max: 500, step: 10, value: 100, unit: "人", digits: 0 });
      PL.ui.note(ui.L.controls, "血友病與紅綠色盲都是 X 染色體上的隱性基因：男性只需一個等位基因就表現，所以患者大多是男性。");
      PL.ui.procedure(ui.L.controls, {
        title: "性聯遺傳判讀",
        steps: [
          "帶因母 × 正常父：看兒子——色盲機率 1/2。",
          "色盲父 × 正常母：女兒全部帶因，兒子全部正常。",
          "拉動「模擬子女數」：小家庭裡「剛好沒生到」很常見，樣本大才貼近理論。"
        ],
        rule: "父親把 X 傳給女兒、Y 傳給兒子——「色盲父親生出色盲兒子」不成立；色盲基因要靠女兒帶因，才傳得到孫子。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "帶因母×正常父", apply: () => { mSel.set("XBXb"); fSel.set("XBY"); } },
        { label: "色盲父×正常母", apply: () => { mSel.set("XBXB"); fSel.set("XbY"); } },
        { label: "色盲母×正常父", apply: () => { mSel.set("XbXb"); fSel.set("XBY"); } }] });
      const rBS = PL.ui.readout(ui.L.readouts, { label: "色盲兒子機率", unit: "%" }), rBD = PL.ui.readout(ui.L.readouts, { label: "色盲女兒機率", unit: "%" });
      const rCD = PL.ui.readout(ui.L.readouts, { label: "帶因女兒機率", unit: "%" }), rSim = PL.ui.readout(ui.L.readouts, { label: "模擬色盲子女", unit: "%" });
      const vr = PL.ui.verdict(ui.L.readouts, { label: "判定" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 譜系圖與遺傳模式 */
  PL.register("pedigree", {
    build(root) {
      const CASES = {
        ar: { name: "案例一", ans: "體染色體隱性",
          I: [{ s: "male", a: 0, c: 1 }, { s: "female", a: 0, c: 1 }],
          II: [{ s: "male", a: 0, c: 1 }, { s: "female", a: 1 }, { s: "male", a: 0 }, { s: "female", a: 0 }],
          sp: { after: 3, s: "male", a: 0 },
          III: [{ s: "female", a: 0, c: 1 }, { s: "male", a: 0 }, { s: "female", a: 0 }],
          clues: ["患病女兒的雙親表現正常 → 隱性", "若是性聯隱性，患病女兒的父親必患病——但父親正常 → 排除性聯", "帶因者外觀正常，只把基因傳下去"],
          why: "父母正常有患者 → 隱性；女患者的父親正常 → 不是性聯", kind: "隔代跳現", par: "雙親皆正常" },
        ad: { name: "案例二", ans: "體染色體顯性",
          I: [{ s: "male", a: 1 }, { s: "female", a: 0 }],
          II: [{ s: "male", a: 1 }, { s: "female", a: 0 }, { s: "female", a: 1 }, { s: "male", a: 0 }],
          sp: { after: 2, s: "male", a: 0 },
          III: [{ s: "male", a: 1 }, { s: "female", a: 0 }, { s: "female", a: 1 }],
          clues: ["每一代都有患者 → 顯性", "每位患者的雙親至少一位患病", "患病父親把病傳給兒子（父→子）→ 排除性聯顯性"],
          why: "代代出現且父傳子 → 體染色體顯性", kind: "代代出現", par: "至少一位患病" },
        xr: { name: "案例三", ans: "性聯隱性",
          I: [{ s: "male", a: 0 }, { s: "female", a: 0, c: 1 }],
          II: [{ s: "male", a: 1 }, { s: "female", a: 0, c: 1 }, { s: "male", a: 0 }, { s: "female", a: 0 }],
          sp: { after: 0, s: "female", a: 0 },
          III: [{ s: "female", a: 0, c: 1 }, { s: "male", a: 0 }, { s: "female", a: 0 }],
          clues: ["患者都是男性，母親外表正常 → 母親帶因", "患病兒子的父親正常 → 不可能由父親直接遺傳", "色盲父親的女兒全部帶因（父 X 傳女）"],
          why: "母帶因傳子、患者皆男性 → X 連鎖隱性", kind: "隔代跳現", par: "雙親皆正常" },
        xd: { name: "案例四", ans: "性聯顯性",
          I: [{ s: "male", a: 1 }, { s: "female", a: 0 }],
          II: [{ s: "female", a: 1 }, { s: "female", a: 1 }, { s: "male", a: 0 }, { s: "male", a: 0 }],
          sp: { after: 0, s: "male", a: 0 },
          III: [{ s: "female", a: 1 }, { s: "male", a: 1 }, { s: "female", a: 0 }],
          clues: ["患病父親的女兒全部患病、兒子全部正常", "代代出現，且男女都有患者", "對照案例二：那裡父→子有傳遞，這裡沒有"],
          why: "患病父親女兒全病、兒子全正常 → X 連鎖顯性", kind: "代代出現", par: "至少一位患病" }
      };
      const ui = CK.scaffold(root, {
        aspect: 0.60,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const cs = CASES[caseSel.get()], show = showCar.get();
          const x0 = W * 0.06, x1 = W * 0.62, yI = H * 0.22, yII = H * 0.52, yIII = H * 0.80;
          const i1 = CK.pedigreePerson(ctx, x0 + (x1 - x0) * 0.20, yI, cs.I[0].s, cs.I[0].a, { s: 11, carrier: show && cs.I[0].c, label: "I-1" });
          const i2 = CK.pedigreePerson(ctx, x0 + (x1 - x0) * 0.42, yI, cs.I[1].s, cs.I[1].a, { s: 11, carrier: show && cs.I[1].c, label: "I-2" });
          const j1 = CK.pedigreeLink(ctx, i1, i2, yI + 26);
          // 第二代：家族成員，配偶插在正確位置
          const row = cs.II.map((m, i) => ({ m, label: "II-" + (i + 1) }));
          if (cs.sp) row.splice(cs.sp.after + 1, 0, { m: cs.sp, label: "配偶" });
          const xsII = row.map((r2, i) => x0 + (x1 - x0) * i / (row.length - 1));
          const ps = row.map((r2, i) => CK.pedigreePerson(ctx, xsII[i], yII, r2.m.s, r2.m.a, { s: 11, carrier: show && r2.m.c, label: r2.label }));
          CK.pedigreeDrop(ctx, j1, yII - 14, xsII);
          if (cs.sp) {
            const j2 = CK.pedigreeLink(ctx, ps[cs.sp.after], ps[cs.sp.after + 1], yII + 24);
            const kxs = cs.III.map((m, i) => xsII[cs.sp.after + 1] - 44 + i * 44);
            CK.pedigreeDrop(ctx, j2, yIII - 13, kxs);
            cs.III.forEach((m, i) => CK.pedigreePerson(ctx, kxs[i], yIII, m.s, m.a, { s: 10, carrier: show && m.c, label: "III-" + (i + 1) }));
          }
          CK.legend(ctx, W * 0.06, H * 0.09, [{ color: "#e57373", label: "患者（紅）" },
            { color: "#ffb74d", label: "帶因（橙框，勾選顯示）" }, { color: PL.theme.shade(0.6), label: "正常（方形男、圓形女）" }], 15);
          CK.panel(ctx, W * 0.66, H * 0.12, W * 0.30, H * 0.46, "判讀線索");
          cs.clues.forEach((c, i) => {
            D.disc(ctx, W * 0.69, H * 0.20 + i * 44, 3.5, { fill: PL.col("accent") });
            D.text(ctx, c, W * 0.72, H * 0.20 + i * 44 + 4, { color: PL.col("text-dim"), size: 10 });
          });
          rPar.set(cs.par); rGen.set(cs.kind); rGuess.set(guessSel.get());
          if (guessSel.get() === cs.ans) vr.set("判斷正確：" + cs.why, "ok");
          else vr.set("再想想：" + cs.clues[0], "bad");
        }
      });
      const caseSel = PL.ui.select(ui.L.controls, { label: "譜系案例", value: "ar", options: [
        { value: "ar", label: "案例一（家系 A）" }, { value: "ad", label: "案例二（家系 B）" },
        { value: "xr", label: "案例三（家系 C）" }, { value: "xd", label: "案例四（家系 D）" }] });
      const guessSel = PL.ui.select(ui.L.controls, { label: "你的推論", value: "體染色體顯性", options: [
        { value: "體染色體隱性", label: "體染色體隱性遺傳" }, { value: "體染色體顯性", label: "體染色體顯性遺傳" },
        { value: "性聯隱性", label: "性聯（X 連鎖）隱性遺傳" }, { value: "性聯顯性", label: "性聯（X 連鎖）顯性遺傳" }] });
      const showCar = PL.ui.checkbox(ui.L.controls, { label: "標示帶因者", checked: false });
      PL.ui.note(ui.L.controls, "判讀三步：先看隱顯（患者的父母表現型），再看是否性聯（男女分布、父→子傳遞），最後用基因型機率檢查整個家系。");
      PL.ui.procedure(ui.L.controls, {
        title: "譜系判讀流程",
        steps: [
          "找「患者與雙親」：雙親正常 → 隱性；至少一位患病 → 顯性。",
          "隱性時檢查女患者：父親正常 → 不是性聯（否則父必患病）。",
          "顯性時看父→子：有傳遞 → 體染色體；患病父親女兒全病、兒子全正常 → 性聯顯性。",
          "切換案例重練，勾選「標示帶因者」驗證你的基因型假設。"
        ],
        rule: "「女生患病但父親正常」直接排除性聯隱性——這一條是譜系題最快的一刀，考試先找它。"
      });
      const rPar = PL.ui.readout(ui.L.readouts, { label: "患者雙親表現型" }), rGen = PL.ui.readout(ui.L.readouts, { label: "出現方式" });
      const rGuess = PL.ui.readout(ui.L.readouts, { label: "你的推論" });
      const vr = PL.ui.verdict(ui.L.readouts, { label: "判定" });
      return { stop() { ui.stop(); } };
    }
  });
})();
