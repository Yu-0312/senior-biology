/* 模組九 · 分子遺傳與生物技術 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, CK = window.BioLab, D = PL.draw;
  const { clamp, lerp, TAU } = PL;

  /* 共用:標準遺傳密碼(mRNA 密碼子 → 胺基酸三字母縮寫;Stop 為終止密碼子) */
  const CODON = (function () {
    const m = {};
    ("UUU-Phe UUC-Phe UUA-Leu UUG-Leu CUU-Leu CUC-Leu CUA-Leu CUG-Leu AUU-Ile AUC-Ile AUA-Ile AUG-Met GUU-Val GUC-Val GUA-Val GUG-Val " +
     "UCU-Ser UCC-Ser UCA-Ser UCG-Ser CCU-Pro CCC-Pro CCA-Pro CCG-Pro ACU-Thr ACC-Thr ACA-Thr ACG-Thr GCU-Ala GCC-Ala GCA-Ala GCG-Ala " +
     "UAU-Tyr UAC-Tyr UAA-Stop UAG-Stop CAU-His CAC-His CAA-Gln CAG-Gln AAU-Asn AAC-Asn AAA-Lys AAG-Lys GAU-Asp GAC-Asp GAA-Glu GAG-Glu " +
     "UGU-Cys UGC-Cys UGA-Stop UGG-Trp CGU-Arg CGC-Arg CGA-Arg CGG-Arg AGU-Ser AGC-Ser AGA-Arg AGG-Arg GGU-Gly GGC-Gly GGA-Gly GGG-Gly")
      .split(" ").forEach(kv => { const p = kv.split("-"); m[p[0]] = p[1]; });
    return m;
  })();

  /* 共用:胺基酸配色(以名稱取穩定色) */
  const AA_PAL = ["#e57373", "#64b5f6", "#81c784", "#ffd54f", "#b388ff", "#ef8829", "#4db6ac", "#ffb74d"];
  const aaCol = a => AA_PAL[(a.charCodeAt(0) + a.charCodeAt(1) + (a.charCodeAt(2) || 0)) % AA_PAL.length]; // 穩定雜湊色

  /* 共用:一排鹼基方塊(以 CK.baseColor 上色;hi 可指定強調的索引或索引陣列) */
  function baseRow(ctx, x, y, cw, letters, o) {
    o = o || {};
    const his = o.hi == null ? [] : (Array.isArray(o.hi) ? o.hi : [o.hi]);
    letters.forEach((b, i) => {
      const s = cw - 5, bx = x + i * cw;
      ctx.save(); ctx.globalAlpha = o.dim ? 0.4 : 1;
      D.rect(ctx, bx, y, s, s, { fill: CK.tintAlpha(CK.baseColor(b), 0.75), stroke: his.includes(i) ? PL.col("accent") : PL.col("border"), width: his.includes(i) ? 2.2 : 1, r: 3 });
      D.text(ctx, b, bx + s / 2, y + s / 2 + 4, { color: "#101820", size: 11, align: "center", weight: "700" });
      ctx.restore();
    });
  }

  /* DNA 雙螺旋結構 */
  PL.register("dna-structure", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.60,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const gc = gcS.get(), force = forceS.get() / 100, labels = labC.get();
          const seq = [];
          for (let i = 0; i < 16; i++) { const r = ((i + 1) * 0.61803) % 1; seq.push(r < gc / 100 ? (i % 2 ? "GC" : "CG") : (i % 2 ? "AT" : "TA")); }
          // 左:雙螺旋本體(拉力把雙股像拉鏈一樣從底端拉開)
          const box = { x: W * 0.15, y: H * 0.15, w: W * 0.30, h: H * 0.68 };
          const hel = CK.dnaHelix(ctx, box, { seq, unzip: force * 0.85, showBases: labels, turns: 1.9 });
          D.arrow(ctx, box.x - 10, box.y, box.x - 10, box.y + box.h, { color: PL.col("text-faint"), width: 1.5, label: "5'→3'" });
          D.arrow(ctx, box.x + box.w + 10, box.y + box.h, box.x + box.w + 10, box.y, { color: PL.col("text-faint"), width: 1.5, label: "3'→5'" }); // 反向平行
          if (force > 0.08) CK.badge(ctx, box.x + box.w / 2, Math.min(box.y + box.h - 10, hel.cutY + 16), "氫鍵斷開中", "#e57373");
          // 右:鹼基對特寫——2 個氫鍵與 3 個氫鍵誰先斷?
          CK.panel(ctx, W * 0.55, H * 0.12, W * 0.41, H * 0.60, "鹼基對特寫(拉力測試)");
          const pairDemo = (py, Lb, Rb, nHB) => {
            const brk = force > (nHB === 2 ? 0.45 : 0.72), sep = brk ? 30 : 0, cL = CK.baseColor(Lb), cR = CK.baseColor(Rb), cx2 = W * 0.755;
            D.rect(ctx, cx2 - 58 - sep, py - 13, 26, 26, { fill: CK.tintAlpha(cL, 0.85), r: 4 });
            D.text(ctx, Lb, cx2 - 45 - sep, py + 4, { color: "#101820", size: 13, align: "center", weight: "700" });
            D.rect(ctx, cx2 + 32 + sep, py - 13, 26, 26, { fill: CK.tintAlpha(cR, 0.85), r: 4 });
            D.text(ctx, Rb, cx2 + 45 + sep, py + 4, { color: "#101820", size: 13, align: "center", weight: "700" });
            for (let k = 0; k < nHB; k++) {
              const dy = (k - (nHB - 1) / 2) * 7;
              if (brk) { D.line(ctx, cx2 - 26, py + dy, cx2 - 16, py + dy, cL, 1.6, [2, 3]); D.line(ctx, cx2 + 16, py + dy, cx2 + 26, py + dy, cR, 1.6, [2, 3]); }
              else D.disc(ctx, cx2, py + dy, 2.2, { fill: PL.col("text-dim") });
            }
            D.text(ctx, (nHB === 2 ? "A=T:2 個氫鍵" : "G≡C:3 個氫鍵") + (brk ? " → 已斷" : ""), cx2, py + 27, { color: brk ? "#e57373" : PL.col("text-dim"), size: 10, align: "center" });
          };
          pairDemo(H * 0.28, "A", "T", 2); pairDemo(H * 0.47, "G", "C", 3);
          CK.legend(ctx, W * 0.575, H * 0.62, [{ color: "#e57373", label: "A 與 T 先分開(鍵少)" }, { color: "#81c784", label: "G 與 C 撐得久(鍵多)" }], 17);
          // 讀數
          const nHB = seq.reduce((s, pr) => s + (pr[0] === "G" || pr[0] === "C" ? 3 : 2), 0);
          rGC.set(gc, 0); rHB.set(nHB, 0); rBroken.set(Math.round(force * 0.85 * 16), 0); rState.set(force > 0.9 ? "完全變性(兩股分離)" : force > 0.08 ? "局部解開" : "雙股完整");
        }
      });
      const gcS = PL.ui.slider(ui.L.controls, { label: "GC 含量", min: 10, max: 90, step: 5, value: 50, unit: "%", digits: 0 });
      const forceS = PL.ui.slider(ui.L.controls, { label: "拉開力道", min: 0, max: 100, step: 5, value: 0, unit: "%", digits: 0 });
      const labC = PL.ui.checkbox(ui.L.controls, { label: "在螺旋上標示鹼基字母", checked: true });
      PL.ui.note(ui.L.controls, "兩股反向平行、A-T 與 G-C 互補,所以任一股都帶著完整訊息;氫鍵弱是設計,讓雙股拉得開才能複製。");
      PL.ui.procedure(ui.L.controls, {
        title: "誰先被拉開?",
        steps: [
          "拉力 30% 以下:雙股仍完整,先記下氫鍵總數。",
          "拉到 50%:A=T 區先斷開——它只有 2 個氫鍵。",
          "拉到 75% 以上:G≡C 也斷了,整條 DNA 變性。",
          "調高 GC 含量再拉一次:斷開需要的力道變大。"
        ],
        rule: "「氫鍵弱」不是缺陷:骨架的共價鍵把每條股串牢,氫鍵專門負責讓兩股能分開——複製與轉錄都靠這一步。"
      });
      const rGC = PL.ui.readout(ui.L.readouts, { label: "GC 含量", unit: "%" }), rHB = PL.ui.readout(ui.L.readouts, { label: "氫鍵總數" });
      const rBroken = PL.ui.readout(ui.L.readouts, { label: "已斷開鹼基對" }), rState = PL.ui.readout(ui.L.readouts, { label: "結構狀態" });
      const chart = ui.chart("GC 含量與氫鍵密度", "GC 越多,平均每個鹼基對的氫鍵從 2.0 升到 3.0——雙股更耐熱、更難拉開。");
      const drawChart = () => CK.plot(chart, {
        x0: 0, x1: 100, y0: 2, y1: 3, xticks: [25, 50, 75], yticks: [2.2, 2.6, 3.0],
        xlabel: "GC 含量 (%)", ylabel: "平均每 bp 氫鍵數",
        series: [{ fn: g => 2 + g / 100, color: PL.col("accent") }],
        marks: [{ dot: [gcS.get(), 2 + gcS.get() / 100], color: PL.col("accent-2"), label: "目前" }]
      });
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* DNA 複製與半保留 */
  PL.register("dna-replication", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const p = progS.get() / 100;
          const seq = ["AT", "GC", "TA", "CG", "GC", "AT", "TA", "GC", "CG", "TA", "AT", "GC"];
          // 左:複製叉——上方雙股保留,下方解開並合成新股(綠)
          const box = { x: W * 0.09, y: H * 0.10, w: W * 0.26, h: H * 0.58 };
          const hel = CK.dnaHelix(ctx, box, { seq, unzip: p, turns: 1.6 });
          const cutY = hel.cutY;
          CK.badge(ctx, box.x + box.w / 2, Math.min(box.y + box.h - 10, cutY + 14), "解旋酶", "#ef8829");
          // 前導股:沿左模板連續合成
          const lead = hel.strandA.filter(pt => pt[1] >= cutY);
          if (lead.length > 1) {
            ctx.save(); ctx.strokeStyle = "#43d18a"; ctx.lineWidth = 2.6; ctx.beginPath();
            lead.forEach((pt, i) => { const x = pt[0] - 6; i ? ctx.lineTo(x, pt[1]) : ctx.moveTo(x, pt[1]); });
            ctx.stroke(); ctx.restore();
          }
          // 落後股:沿右模板分段合成(岡崎片段)
          const lag = hel.strandB.filter(pt => pt[1] >= cutY);
          const nFrag = clamp(1 + Math.floor(p * 3), 1, 4), per = Math.ceil(lag.length / nFrag);
          for (let k = 0; k < nFrag && lag.length; k++) {
            const seg = lag.slice(k * per, (k + 1) * per - (k < nFrag - 1 ? 4 : 0));
            if (seg.length < 2) continue;
            ctx.save(); ctx.strokeStyle = "#43d18a"; ctx.lineWidth = 2.6; ctx.beginPath();
            seg.forEach((pt, i) => { const x = pt[0] + 6; i ? ctx.lineTo(x, pt[1]) : ctx.moveTo(x, pt[1]); });
            ctx.stroke(); ctx.restore();
          }
          D.text(ctx, "前導股:連續合成", box.x + box.w * 0.30, box.y + box.h + 16, { color: PL.col("text-dim"), size: 9.5, align: "center" });
          D.text(ctx, "落後股:岡崎片段", box.x + box.w * 0.74, box.y + box.h + 16, { color: PL.col("text-dim"), size: 9.5, align: "center" });
          // 右:兩個子分子都是「一舊一新」
          CK.panel(ctx, W * 0.44, H * 0.10, W * 0.52, H * 0.58, "結果:半保留(一舊一新)");
          CK.legend(ctx, W * 0.47, H * 0.17, [{ color: "rgba(90,130,170,0.95)", label: "模板舊股" }, { color: "#43d18a", label: "新生股" }], 16);
          for (let d = 0; d < 2; d++) {
            const lx = W * 0.53 + d * W * 0.22, ly = H * 0.24, lw = 16, lh = H * 0.34;
            D.line(ctx, lx, ly, lx, ly + lh, "rgba(90,130,170,0.95)", 3.2);
            ctx.save(); ctx.globalAlpha = p < 0.03 ? 0.12 : 0.15 + 0.85 * p; D.line(ctx, lx + lw, ly, lx + lw, ly + lh, "#43d18a", 3.2); ctx.restore();
            for (let k = 0; k < 6; k++) {
              const yy = ly + lh * (k + 0.5) / 6, pr = seq[(k + d * 3) % seq.length];
              D.line(ctx, lx, yy, lx + lw, yy, CK.baseColor(pr[0]), 3);
            }
            D.text(ctx, "子分子 " + (d + 1), lx + lw / 2, ly + lh + 16, { color: PL.col("text-dim"), size: 10, align: "center" });
            D.text(ctx, "舊", lx - 10, ly + lh / 2 + 3, { color: PL.col("text-faint"), size: 9.5, align: "center" });
            D.text(ctx, "新", lx + lw + 10, ly + lh / 2 + 3, { color: "#43a047", size: 9.5, align: "center" });
          }
          rProg.set(progS.get(), 0); rFrag.set(nFrag, 0); rNt.set(Math.round(p * 24), 0); rDau.set(p > 0.97 ? "2 個(完成)" : "1 個(複製中)");
        }
      });
      const progS = PL.ui.slider(ui.L.controls, { label: "複製進度", min: 0, max: 100, step: 5, value: 35, unit: "%", digits: 0 });
      PL.ui.note(ui.L.controls, "解旋酶把雙股拉開,聚合酶以每股為模板做出互補新股:產物是兩個「一舊一新」的分子——這就是半保留複製。");
      PL.ui.procedure(ui.L.controls, {
        title: "驗證半保留",
        steps: [
          "進度 30%:看複製叉下方,左股連續、右股一段一段。",
          "比較兩股:<b>聚合酶只能沿 5'→3' 合成</b>,落後股只能倒著分段做。",
          "進度 100%:右側兩個子分子各有一條藍(舊)一條綠(新)。"
        ],
        rule: "若是「全保留」複製,會出現一條全舊與一條全新的分子;梅塞爾森-史達實驗用氮同位素證明不是這樣。"
      });
      PL.ui.presets(ui.L.controls, { label: "跳到", options: [
        { label: "剛起始", apply: () => progS.set(10) }, { label: "複製叉中段", apply: () => progS.set(50) },
        { label: "即將完成", apply: () => progS.set(95) }
      ] });
      const rProg = PL.ui.readout(ui.L.readouts, { label: "複製進度", unit: "%" }), rFrag = PL.ui.readout(ui.L.readouts, { label: "岡崎片段數" });
      const rNt = PL.ui.readout(ui.L.readouts, { label: "新合成核苷酸" }), rDau = PL.ui.readout(ui.L.readouts, { label: "DNA 分子數" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 轉錄:DNA 到 mRNA */
  PL.register("transcription", {
    build(root) {
      const EXON = ["ATG", "GGC", "TAC", "AAA", "CGC"], INTRON = ["GTA", "AGT"];
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const p = progS.get() / 100, euk = spSel.get() === "euk", keep = keepC.get();
          const blocks = euk ? [EXON[0], EXON[1], INTRON[0], INTRON[1], EXON[2], EXON[3], EXON[4]] : EXON;
          const dna = blocks.join("").split(""), n = dna.length;
          const cw = Math.min(W * 0.05, (W * 0.84) / n), x0 = W * 0.085, yD = H * 0.20;
          const cur = clamp(Math.round(p * (n - 1)), 0, n - 1);
          // 編碼股(上)與模板股(下);mRNA 由編碼股序列而來(T 換 U)
          baseRow(ctx, x0, yD, cw, dna, { hi: cur });
          baseRow(ctx, x0, yD + cw + 2, cw, dna.map(b => ({ A: "T", T: "A", G: "C", C: "G" }[b])), { dim: true });
          D.text(ctx, "編碼股", x0 - 8, yD + cw / 2 + 4, { color: PL.col("text-dim"), size: 10, align: "right" });
          D.text(ctx, "模板股", x0 - 8, yD + cw * 1.5 + 6, { color: PL.col("text-faint"), size: 10, align: "right" });
          // 啟動子與 RNA 聚合酶
          D.arrow(ctx, x0 + 2, yD - 16, x0 + cw * 2.6, yD - 16, { color: PL.col("accent"), width: 1.8, label: "啟動子" });
          const px = x0 + cur * cw + cw / 2;
          D.rect(ctx, px - cw * 0.8, yD - 10, cw * 1.6, cw * 2 + 14, { fill: "rgba(239,136,41,0.22)", stroke: "#ef8829", width: 2, r: 6 });
          D.text(ctx, "RNA 聚合酶", px, yD - 14, { color: "#ef8829", size: 10.5, align: "center", weight: "700" });
          // mRNA:編碼股的序列,T 換 U;真核在完成後剪除內含子
          const all = dna.map(b => b === "T" ? "U" : b), m = Math.round(clamp(p, 0, 1) * n);
          const mature = euk && !keep && p >= 0.999;
          const shown = mature ? all.slice(0, 6).concat(all.slice(12)) : all.slice(0, m);
          const yM = yD + cw * 2 + 40;
          baseRow(ctx, x0, yM, cw, shown);
          D.text(ctx, "mRNA 5'→3'", x0 - 8, yM + cw / 2 + 4, { color: PL.col("text-dim"), size: 10, align: "right" });
          if (euk && !mature && m > 8) { // 內含子:紅線標示,成熟時剪除
            D.line(ctx, x0 + 6 * cw, yM + cw - 1, x0 + 12 * cw, yM + cw - 1, "#e57373", 2.4);
            D.text(ctx, "內含子(將被剪除)", x0 + 9 * cw, yM + cw + 12, { color: "#e57373", size: 9.5, align: "center" });
          }
          if (mature) CK.badge(ctx, x0 + 7.5 * cw, yM + cw + 18, "剪接完成:內含子已移除", "#43a047");
          // 讀數
          const len = mature ? 15 : m;
          rNt.set(m, 0); rLen.set(len, 0); rCodon.set(Math.floor(len / 3), 0);
          rSplice.set(euk ? (mature ? "已剪除" : keep && p >= 0.999 ? "保留(前驅 mRNA)" : "待剪除") : "原核:無內含子");
        }
      });
      const spSel = PL.ui.select(ui.L.controls, { label: "基因型式", value: "prok", options: [
        { value: "prok", label: "原核基因(無內含子)" }, { value: "euk", label: "真核基因(有內含子)" }
      ] });
      const progS = PL.ui.slider(ui.L.controls, { label: "轉錄進度", min: 0, max: 100, step: 5, value: 40, unit: "%", digits: 0 });
      const keepC = PL.ui.checkbox(ui.L.controls, { label: "保留內含子(看前驅 mRNA)", checked: false });
      PL.ui.note(ui.L.controls, "mRNA 的序列和編碼股相同、只是 U 代替 T;真正被聚合酶讀的是下面的模板股。");
      PL.ui.procedure(ui.L.controls, {
        title: "跟著聚合酶走一次",
        steps: [
          "從 0% 拉進度:聚合酶經過的鹼基,下方就多一顆 mRNA 字母。",
          "對照兩行:上排與 mRNA 同序?下排才是互補的模板股。",
          "切到真核基因:mRNA 中間出現紅色內含子。",
          "100% 時紅段被剪除——成熟 mRNA 只剩 15 個核苷酸。"
        ],
        rule: "RNA 聚合酶不需要引子就能從啟動子開始;需要引子的是 DNA 聚合酶——別把兩種酶的習性混在一起。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "原核基因", apply: () => { spSel.set("prok"); progS.set(100); } },
        { label: "真核:成熟 mRNA", apply: () => { spSel.set("euk"); keepC.set(false); progS.set(100); } }, { label: "真核:前驅 mRNA", apply: () => { spSel.set("euk"); keepC.set(true); progS.set(100); } }
      ] });
      const rNt = PL.ui.readout(ui.L.readouts, { label: "已轉錄核苷酸" }), rLen = PL.ui.readout(ui.L.readouts, { label: "mRNA 長度" });
      const rCodon = PL.ui.readout(ui.L.readouts, { label: "密碼子數" }), rSplice = PL.ui.readout(ui.L.readouts, { label: "內含子" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 轉譯與遺傳密碼 */
  PL.register("translation", {
    build(root) {
      const SAMPLES = {
        a: { name: "樣本 A:酵素片段", mrna: "AUG GCU UAC CGG AAA UGA" }, b: { name: "樣本 B:勝肽荷爾蒙", mrna: "AUG UGG GCA CCC UAA" },
        c: { name: "樣本 C:結構蛋白", mrna: "AUG CCC GAG UAC UAG" }
      };
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const sm = SAMPLES[sSel.get()], p = progS.get() / 100, showAc = acC.get();
          const codons = sm.mrna.split(" "), n = codons.length;
          const done = clamp(Math.floor(p * n), 0, n), cur = Math.min(done, n - 1), aa = CODON[codons[cur]];
          // mRNA 條與密碼子
          const x0 = W * 0.10, yM = H * 0.22, cw2 = (W * 0.56) / n, hM = H * 0.11;
          D.rect(ctx, x0, yM, cw2 * n, hM, { fill: "rgba(150,100,180,0.22)", stroke: "rgba(150,100,180,0.85)", r: 6 });
          codons.forEach((c, i) => D.text(ctx, c, x0 + cw2 * (i + 0.5), yM + hM / 2 + 4, { color: i < done ? PL.col("text") : PL.col("text-faint"), size: 11.5, align: "center", weight: "700" }));
          // 核糖體:大、小次單位夾住目前的密碼子
          const rx = x0 + cw2 * (cur + 0.5);
          D.rect(ctx, rx - cw2 * 0.75, yM - hM * 0.62, cw2 * 1.5, hM * 0.66, { fill: "rgba(239,136,41,0.30)", stroke: "#ef8829", width: 1.8, r: 7 });
          D.rect(ctx, rx - cw2 * 0.75, yM + hM * 0.96, cw2 * 1.5, hM * 0.62, { fill: "rgba(239,136,41,0.22)", stroke: "#ef8829", width: 1.8, r: 7 });
          D.text(ctx, "核糖體", rx, yM - hM * 0.62 - 6, { color: "#ef8829", size: 10, align: "center", weight: "700" });
          // tRNA:反密碼子與密碼子互補,帶著胺基酸進場
          const anti = codons[cur].split("").map(b => ({ A: "U", U: "A", G: "C", C: "G" }[b])).join(""), ty = yM + hM * 1.62 + Math.sin(t * 2.2) * 2.5;
          D.line(ctx, rx, ty - 16, rx, ty + 12, "rgba(90,130,170,0.9)", 3); D.line(ctx, rx, ty + 12, rx + 14, ty + 12, "rgba(90,130,170,0.9)", 3);
          D.disc(ctx, rx, ty - 24, 8, { fill: aa === "Stop" ? "rgba(120,120,120,0.35)" : CK.tintAlpha(aaCol(aa), 0.9) });
          if (showAc) D.text(ctx, anti, rx, ty + 28, { color: PL.col("accent"), size: 10, align: "center", weight: "700" });
          D.text(ctx, "tRNA", rx + 24, ty + 12, { color: PL.col("text-faint"), size: 9 });
          // 已完成的胜肽鏈(往左下延伸)
          const made = codons.slice(0, done).map(c => CODON[c]).filter(x => x !== "Stop");
          made.forEach((a2, i) => {
            const ax = x0 - 26, ay = yM + 8 + i * 24;
            if (i) D.line(ctx, ax, ay - 24, ax, ay, PL.col("text-faint"), 1.6);
            D.disc(ctx, ax, ay, 9, { fill: CK.tintAlpha(aaCol(a2), 0.9) });
          });
          if (made.length) D.text(ctx, "胜肽鏈", x0 - 26, yM - 12, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          // 右側:遺傳密碼重點
          CK.panel(ctx, W * 0.70, H * 0.10, W * 0.26, H * 0.66, "遺傳密碼小卡");
          D.text(ctx, "目前密碼子", W * 0.83, H * 0.19, { color: PL.col("text-faint"), size: 10 }); D.text(ctx, codons[cur], W * 0.83, H * 0.27, { color: PL.col("accent"), size: 20, align: "center", weight: "700" });
          D.text(ctx, aa === "Stop" ? "終止:不帶胺基酸" : "→ " + aa, W * 0.83, H * 0.34, { color: aa === "Stop" ? "#e57373" : PL.col("text"), size: 11.5, align: "center", weight: "700" });
          [["密碼子共 64 種", "3 個鹼基一組"], ["起始:AUG", "編碼甲硫胺酸"], ["終止:UAA UAG UGA", "共 3 種"], ["簡併", "多個密碼子對應同一胺基酸"]].forEach((row, i) => {
            D.text(ctx, row[0], W * 0.72, H * 0.42 + i * 30, { color: PL.col("text-dim"), size: 10 });
            D.text(ctx, row[1], W * 0.72, H * 0.42 + i * 30 + 13, { color: PL.col("text-faint"), size: 9.5 });
          });
          // 讀數與判定
          rAA.set(made.length, 0); rCodon2.set(codons[cur]); rAA2.set(aa === "Stop" ? "—(終止)" : aa); rAc.set(anti);
          vd.set(done === 0 ? "拉動進度,核糖體就開始讀碼" : aa === "Stop" ? "終止密碼子到站:沒有 tRNA 帶胺基酸進來,胜肽鏈釋出" : "轉譯中:每次讀 3 個鹼基,胜肽鏈加長一個胺基酸", aa === "Stop" && done > 0 ? "ok" : "info");
        }
      });
      const sSel = PL.ui.select(ui.L.controls, { label: "mRNA 樣本", value: "a", options: Object.keys(SAMPLES).map(k => ({ value: k, label: SAMPLES[k].name })) });
      const progS = PL.ui.slider(ui.L.controls, { label: "轉譯進度", min: 0, max: 100, step: 5, value: 40, unit: "%", digits: 0 });
      const acC = PL.ui.checkbox(ui.L.controls, { label: "標示 tRNA 反密碼子", checked: true });
      PL.ui.note(ui.L.controls, "核糖體不認得胺基酸,只認得密碼子與反密碼子的配對——帶對 tRNA 才能進來,這是轉譯準確度的來源。");
      PL.ui.procedure(ui.L.controls, {
        title: "讀一次密碼子",
        steps: [
          "進度 0→100%:核糖體每移一格,左邊胜肽鏈多一顆。",
          "核對:tRNA 的反密碼子是否與密碼子互補(A-U、G-C)。",
          "拉到終止密碼子:沒有對應的 tRNA,鏈子就此釋出。"
        ],
        rule: "AUG 不只是「起始」,它也編碼甲硫胺酸:每條蛋白質的第一個胺基酸都從它來(之後可能被切掉)。"
      });
      const vd = PL.ui.verdict(ui.L.controls, { label: "轉譯狀態" });
      const rAA = PL.ui.readout(ui.L.readouts, { label: "已合成胺基酸" }), rCodon2 = PL.ui.readout(ui.L.readouts, { label: "目前密碼子" });
      const rAA2 = PL.ui.readout(ui.L.readouts, { label: "對應胺基酸" }), rAc = PL.ui.readout(ui.L.readouts, { label: "反密碼子" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 基因表現與性狀 */
  PL.register("gene-expression", {
    build(root) {
      const MODES = {
        base: { name: "基礎表現", mult: 1.0 }, induce: { name: "誘導:紫外線啟動", mult: 1.8 },
        repress: { name: "抑制:阻遏蛋白", mult: 0.35 }
      };
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const prom = promS.get(), md = MODES[modeSel.get()];
          const mRNA = Math.round(prom * md.mult * 0.4), protein = Math.round(mRNA * 2.2), pig = clamp(protein / 160, 0, 1);
          // 中心法則四站:基因 → mRNA → 蛋白質 → 性狀
          const stages = [
            { name: "基因(DNA)", count: 1, max: 1, col: "rgba(90,130,170,0.95)", unit: "段" },
            { name: "mRNA", count: mRNA, max: 72, col: "rgba(150,100,180,0.95)", unit: "條" },
            { name: "蛋白質:酪胺酸酶", count: protein, max: 158, col: "#ef8829", unit: "顆" },
            { name: "性狀:黑色素", count: Math.round(pig * 100), max: 100, col: "#6d4c41", unit: "%" }
          ];
          const fy = H * 0.14, fw = W * 0.205, fh = H * 0.40;
          stages.forEach((st, i) => {
            const x = W * 0.035 + i * (fw + W * 0.025);
            CK.panel(ctx, x, fy, fw, fh, st.name); const frac = clamp(st.count / st.max, 0, 1);
            D.rect(ctx, x + fw * 0.24, fy + fh * 0.30, fw * 0.2, fh * 0.5, { fill: PL.theme.shade(0.5), stroke: PL.col("border"), r: 4 });
            D.rect(ctx, x + fw * 0.24, fy + fh * 0.30 + fh * 0.5 * (1 - frac), fw * 0.2, Math.max(1, fh * 0.5 * frac), { fill: st.col, r: 3 });
            D.text(ctx, st.count + " " + st.unit, x + fw * 0.34, fy + fh * 0.88, { color: PL.col("text"), size: 11, align: "center", weight: "700" });
            if (i < 3) CK.arrow(ctx, x + fw + 1, fy + fh / 2, x + fw + W * 0.025 - 1, fy + fh / 2, PL.col("text-dim"));
          });
          // 性狀表現:膚色深淺隨色素量
          const cx2 = W * 0.5, cy2 = H * 0.78;
          D.disc(ctx, cx2, cy2, H * 0.075, { fill: CK.mix("#f3e2d4", "#6d4c41", pig), stroke: PL.col("border"), width: 1.6 });
          D.text(ctx, "性狀表現:黑色素沉積(示意)", cx2, cy2 + H * 0.075 + 16, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          // 讀數與判定
          rRNA.set(mRNA, 0); rProt.set(protein, 0); rPig.set(pig * 100, 0);
          vd.set(prom < 5 ? "基因幾乎不表現:沒有蛋白質就沒有性狀——基因要有表現量才算數" : pig < 0.2 ? "表現量偏低:性狀微弱" : pig > 0.9 ? "表現量很高:性狀明顯" : "表現量適中:性狀穩定呈現", prom < 5 ? "warn" : "ok");
        }
      });
      const modeSel = PL.ui.select(ui.L.controls, { label: "調節情境", value: "base", options: Object.keys(MODES).map(k => ({ value: k, label: MODES[k].name })) });
      const promS = PL.ui.slider(ui.L.controls, { label: "啟動子活性", min: 0, max: 100, step: 5, value: 50, unit: "%", digits: 0 });
      PL.ui.note(ui.L.controls, "中心法則是訊息流向:DNA → mRNA → 蛋白質 → 性狀。調節序列(啟動子)決定表現「量」,不改變訊息本身。");
      PL.ui.procedure(ui.L.controls, {
        title: "看表現量如何流動",
        steps: [
          "拉動啟動子活性:四站的量一起變、方向一致。",
          "切到「抑制」:同一個基因,性狀只剩兩成——調控不改變 DNA。",
          "注意蛋白質站:mRNA 越多蛋白質越多——一條 mRNA 可被轉譯多次。"
        ],
        rule: "一條 mRNA 可轉譯出很多條蛋白質,所以蛋白質量通常遠大於 mRNA 量——中心法則是「流向」,不是「守恆」。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "防曬前(基礎)", apply: () => { modeSel.set("base"); promS.set(50); } }, { label: "曝曬後(誘導)", apply: () => { modeSel.set("induce"); promS.set(90); } },
        { label: "阻遏抑制", apply: () => { modeSel.set("repress"); promS.set(60); } }
      ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "表現判定" });
      const rRNA = PL.ui.readout(ui.L.readouts, { label: "mRNA 相對量" }), rProt = PL.ui.readout(ui.L.readouts, { label: "蛋白質相對量" });
      const rPig = PL.ui.readout(ui.L.readouts, { label: "黑色素量", unit: "%" });
      const chart = ui.chart("啟動子活性與性狀強度", "同一個基因,調節情境不同,性狀強度就不同(綠:誘導、藍:基礎、橙:抑制)——性狀由基因與調控共同決定。");
      const drawChart = () => CK.plot(chart, {
        x0: 0, x1: 100, y0: 0, y1: 100, xlabel: "啟動子活性 (%)", ylabel: "黑色素量 (%)",
        series: [
          { fn: v => clamp(v * 1.8 * 0.55, 0, 1) * 100, color: "#66bb6a" },
          { fn: v => clamp(v * 0.55, 0, 1) * 100, color: PL.col("accent") },
          { fn: v => clamp(v * 0.35 * 0.55, 0, 1) * 100, color: "#ef8829" }
        ],
        marks: [{ dot: [promS.get(), clamp(promS.get() * MODES[modeSel.get()].mult * 0.55, 0, 1) * 100], color: PL.col("accent-2"), label: "目前" }]
      });
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 基因突變的類型 */
  PL.register("mutation", {
    build(root) {
      const ORIG = "ATGCCCGAGTTTGGC".split("");
      const ORIG_AA = ["Met", "Pro", "Glu", "Phe", "Gly"];
      const KINDS = { none: "原序列(對照)", sub: "置換一個鹼基", ins: "插入一個鹼基", del: "刪除一個鹼基", del3: "刪除三個鹼基" };
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const kind = kindSel.get(), pos = Math.round(posS.get()) - 1;
          const dna = ORIG.slice();
          if (kind === "sub") dna[pos] = { A: "T", T: "A", G: "C", C: "G" }[dna[pos]];
          else if (kind === "ins") dna.splice(pos, 0, "A");
          else if (kind === "del") dna.splice(pos, 1);
          else if (kind === "del3") dna.splice(clamp(pos, 0, ORIG.length - 3), 3);
          const changed = kind !== "none", fs = kind === "ins" || kind === "del";
          // 轉成 mRNA 密碼子並轉譯
          const rna = dna.join("").replace(/T/g, "U");
          const cods = []; for (let i = 0; i + 2 < rna.length; i += 3) cods.push(rna.slice(i, i + 3));
          const aas = cods.map(c => CODON[c] || "?"), n = dna.length;
          // 版面:原序列 / 突變後 / 胺基酸
          const cw = Math.min(W * 0.05, (W * 0.80) / Math.max(n, ORIG.length)), x0 = W * 0.09, y0 = H * 0.18;
          baseRow(ctx, x0, y0, cw, ORIG, { dim: !changed });
          D.text(ctx, "原序列", x0 - 8, y0 + cw / 2 + 4, { color: PL.col("text-dim"), size: 10, align: "right" });
          const hi = changed ? Array.from({ length: n }, (_, i) => i).filter(i => kind === "sub" ? ORIG[i] !== dna[i] : i >= pos) : [];
          baseRow(ctx, x0, y0 + cw + 26, cw, dna, { hi });
          D.text(ctx, "突變後", x0 - 8, y0 + cw + 26 + cw / 2 + 4, { color: PL.col("text-dim"), size: 10, align: "right" });
          if (fs) D.text(ctx, "→ 讀碼框向後全錯", x0 + n * cw + 4, y0 + cw + 26 + cw / 2 + 4, { color: "#e57373", size: 10, weight: "700" });
          // 轉譯出的胺基酸鏈
          const yAA = y0 + cw * 2 + 58;
          const del3Idx = kind === "del3" ? Math.floor(clamp(pos, 0, ORIG.length - 3) / 3) : -1, origAt = i => del3Idx >= 0 && i >= del3Idx ? ORIG_AA[i + 1] : ORIG_AA[i];
          aas.forEach((a, i) => {
            const x = x0 + i * cw * 3 + cw * 1.5;
            const diff = changed && a !== origAt(i);
            D.disc(ctx, x, yAA, 15, { fill: diff ? CK.tintAlpha(aaCol(a), 0.95) : PL.theme.shade(0.6), stroke: diff ? PL.col("accent") : PL.col("border"), width: diff ? 2 : 1 });
            D.text(ctx, a, x, yAA + 4, { color: diff ? "#101820" : PL.col("text-dim"), size: 8.5, align: "center", weight: "700" });
          });
          D.text(ctx, changed ? "轉譯出的胺基酸(改變處亮色)" : "轉譯出的胺基酸(與原序列相同)", x0, yAA + 30, { color: PL.col("text-faint"), size: 9.5 });
          // 讀數與判定
          const nDiff = aas.filter((a, i) => a !== origAt(i)).length;
          rKind.set(KINDS[kind]); rChg.set(kind === "del3" ? nDiff + 1 : nDiff, 0); rFrame.set(fs ? "位移" : "正常"); rLen.set(n, 0);
          vd.set(!changed ? "對照組:序列未變,可當比較基準" : fs ? "框架位移:插入/刪除不是 3 的倍數,下游胺基酸全部讀錯——影響最大" : kind === "del3" ? "刪除三個鹼基:整組摘掉一個胺基酸,其餘不變——比框架位移溫和" : nDiff === 0 ? "同義置換:密碼簡併吸收了改變,胺基酸不變" : "錯義置換:只換掉一個胺基酸(鐮刀型貧血就是這種)", fs ? "bad" : "warn");
        }
      });
      const kindSel = PL.ui.select(ui.L.controls, { label: "突變類型", value: "sub", options: Object.keys(KINDS).map(k => ({ value: k, label: KINDS[k] })) });
      const posS = PL.ui.slider(ui.L.controls, { label: "突變位置", min: 1, max: 15, step: 1, value: 8, unit: "號鹼基", digits: 0 });
      PL.ui.note(ui.L.controls, "突變就是 DNA 序列改變:置換只動一個字母;插入與刪除會把後面的讀碼框整組推移,影響通常是毀滅性的。");
      PL.ui.procedure(ui.L.controls, {
        title: "三種突變比一比",
        steps: [
          "選「置換」拉位置:多數只換一個胺基酸,有些完全不換。",
          "選「插入」:從突變點之後,胺基酸全部變臉——框架位移。",
          "選「刪除三個鹼基」:剛好少一個胺基酸,讀碼框保住了。"
        ],
        rule: "突變要發生在<b>生殖細胞</b>才會傳給下一代;體細胞突變只影響那顆細胞本身(癌變是體細胞突變的累積)。"
      });
      PL.ui.presets(ui.L.controls, { label: "經典案例", options: [
        { label: "鐮刀型紅血球(GAG→GTG)", apply: () => { kindSel.set("sub"); posS.set(8); } }, { label: "同義置換(GGC→GGG)", apply: () => { kindSel.set("sub"); posS.set(15); } },
        { label: "框架位移(插入)", apply: () => { kindSel.set("ins"); posS.set(4); } }
      ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "影響判定" });
      const rKind = PL.ui.readout(ui.L.readouts, { label: "突變類型" }), rChg = PL.ui.readout(ui.L.readouts, { label: "受影響胺基酸" });
      const rFrame = PL.ui.readout(ui.L.readouts, { label: "讀碼框" }), rLen = PL.ui.readout(ui.L.readouts, { label: "序列長度" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 電泳與 DNA 指紋 */
  PL.register("gel-electrophoresis", {
    build(root) {
      // lanes: [名稱, 片段長度(bp) 陣列];notes: 對應每個非標記 lane 的判讀
      const CASES = {
        crime: {
          name: "刑事鑑識", done: "嫌疑人乙與現場檢體條帶完全吻合(520、240 bp),甲與丙可排除",
          lanes: [["M 標記", [1000, 700, 500, 300, 200, 100]], ["現場檢體", [520, 240]], ["嫌疑人甲", [480, 260]], ["嫌疑人乙", [520, 240]], ["嫌疑人丙", [600, 300]]],
          notes: ["現場檢體:比對基準", "與現場不同 ✗", "與現場完全吻合 ✓", "與現場不同 ✗"]
        },
        paternity: {
          name: "親子鑑定", done: "孩子的 260 bp 帶必來自生父:父候選一有此帶,父候選二可排除",
          lanes: [["M 標記", [1000, 700, 500, 300, 200, 100]], ["母親", [450, 300]], ["孩子", [450, 260]], ["父候選一", [260, 700]], ["父候選二", [300, 520]]],
          notes: ["孩子的 450 bp 來自母親", "孩子的 260 bp 需來自生父", "有 260 bp:可能是生父 ✓", "沒有 260 bp:排除 ✗"]
        },
        enzyme: {
          name: "限制酶切確認", done: "EcoRI 切出 1800+1200 bp,與預期相符:選殖成功",
          lanes: [["M 標記", [3000, 2000, 1500, 1000, 500]], ["未切割", [3000]], ["EcoRI", [1800, 1200]], ["BamHI", [2100, 900]]],
          notes: ["完整質體 3000 bp", "切成 1800+1200:符合預期 ✓", "切成 2100+900:另一種切法"]
        }
      };
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const cs = CASES[caseSel.get()];
          const run = clamp(timeS.get() / 100 * (0.3 + voltS.get() / 150 * 0.7), 0, 1);
          const lanes = cs.lanes.map(l => ({ label: l[0], bands: l[1] }));
          D.text(ctx, "DNA 帶負電:由負極往正極(下)跑", W * 0.07, H * 0.12, { color: PL.col("text-dim"), size: 10 });
          // 膠體本體
          CK.gelBox(ctx, { x: W * 0.07, y: H * 0.16, w: W * 0.52, h: H * 0.58 }, lanes, { running: run });
          // 右側:比對資訊
          CK.panel(ctx, W * 0.63, H * 0.12, W * 0.33, H * 0.62, cs.name);
          D.text(ctx, "條帶圖形相同 = 片段組成相同", W * 0.795, H * 0.21, { color: PL.col("text-dim"), size: 10, align: "center" });
          lanes.forEach((ln, i) => {
            if (i === 0) return;
            const y = H * 0.28 + i * 32;
            const note = cs.notes[i - 1];
            D.disc(ctx, W * 0.655, y - 4, 4, { fill: note.includes("✓") ? "#43a047" : note.includes("✗") ? "#c0392b" : PL.col("accent") });
            D.text(ctx, ln.label, W * 0.67, y, { color: PL.col("text"), size: 10.5, weight: "700" });
            D.text(ctx, note, W * 0.67, y + 13, { color: PL.col("text-faint"), size: 9 });
          });
          // 讀數與判定
          const nBands = lanes.reduce((s, ln) => s + ln.bands.length, 0);
          rTime.set(timeS.get(), 0); rVolt.set(voltS.get(), 0); rMig.set(run * 100, 0); rBands.set(nBands, 0);
          vd.set(run < 0.95 ? "電泳還在跑(遷移 " + Math.round(run * 100) + "%):條帶未到位,先別急著比對" : cs.done, run < 0.95 ? "info" : "ok");
        }
      });
      const caseSel = PL.ui.select(ui.L.controls, { label: "案例", value: "crime", options: Object.keys(CASES).map(k => ({ value: k, label: CASES[k].name })) });
      const timeS = PL.ui.slider(ui.L.controls, { label: "電泳時間", min: 0, max: 100, step: 5, value: 60, unit: "%", digits: 0 });
      const voltS = PL.ui.slider(ui.L.controls, { label: "電壓", min: 20, max: 150, step: 10, value: 100, unit: "V", digits: 0 });
      PL.ui.note(ui.L.controls, "限制酶把 DNA 切成長短不一的片段:小的在電場中跑得快、停在膠的下方。條帶圖形就像指紋,可用於鑑識與親子鑑定。");
      PL.ui.procedure(ui.L.controls, {
        title: "怎麼比對指紋",
        steps: [
          "先看 M 標記:它把膠面變成一把「長度尺」。",
          "把時間拉滿,再看現場檢體與三位嫌疑人的帶。",
          "只調電壓:跑得快慢會變,<b>最終位置不變</b>。"
        ],
        rule: "電壓只改變遷移速度,不改變條帶位置——位置由片段長度決定;時間不夠就還沒到位,這是判讀時最常犯的錯。"
      });
      PL.ui.presets(ui.L.controls, { label: "案例", options: [
        { label: "刑事鑑識", apply: () => { caseSel.set("crime"); timeS.set(100); voltS.set(100); } }, { label: "親子鑑定", apply: () => { caseSel.set("paternity"); timeS.set(100); voltS.set(100); } },
        { label: "限制酶切確認", apply: () => { caseSel.set("enzyme"); timeS.set(100); voltS.set(100); } }
      ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "比對結論" });
      const rTime = PL.ui.readout(ui.L.readouts, { label: "電泳時間", unit: "%" }), rVolt = PL.ui.readout(ui.L.readouts, { label: "電壓", unit: "V" });
      const rMig = PL.ui.readout(ui.L.readouts, { label: "遷移進度", unit: "%" }), rBands = PL.ui.readout(ui.L.readouts, { label: "條帶總數" });
      const chart = ui.chart("片段長度與遷移距離", "橫軸取 log 後是一條直線:小片段跑下方、大片段留在上方——M 標記就是這把「長度尺」。");
      const drawChart = () => CK.plot(chart, {
        x0: 2, x1: 4, y0: 0, y1: 1, xticks: [2, 2.5, 3, 3.5, 4], yticks: [0.25, 0.5, 0.75],
        xlabel: "log10 片段長度 (bp)", ylabel: "相對遷移距離",
        series: [{ fn: lx => (4 - lx) / 2, color: PL.col("accent") }],
        marks: [{ dot: [Math.log10(520), (4 - Math.log10(520)) / 2], color: PL.col("accent-2"), label: "520 bp" }]
      });
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 基因工程與重組 DNA */
  PL.register("genetic-engineering", {
    build(root) {
      const STEPS = ["切割:限制酶剪出黏末端", "縫合:連接酶接上質體", "轉形:送入細菌", "量產:發酵槽生產蛋白質"];
      const DESC = [
        "同一種限制酶認得特定序列,把質體與目標基因剪出互補的黏末端。", "黏末端互補配對後,連接酶把骨架的缺口縫起來,變成重組質體。",
        "用 CaCl₂ 與熱休克讓細菌吸收重組質體,篩選出轉殖菌。", "轉殖菌大量繁殖,照著質體上的基因生產人類蛋白質(如胰島素)。"
      ];
      // 環狀質體:gap>0 時在正上方張開一個缺口
      const plasmid = (ctx, cx, cy, R, gap) => {
        ctx.save(); ctx.strokeStyle = "rgba(90,130,170,0.95)"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2 + gap, -Math.PI / 2 - gap + TAU); ctx.stroke(); ctx.restore();
      };
      const geneBox = (ctx, cx, cy, w) => {
        D.line(ctx, cx - w / 2, cy, cx + w / 2, cy, "rgba(129,199,132,0.95)", 4);
        D.rect(ctx, cx - w * 0.25, cy - 12, w * 0.5, 24, { fill: "rgba(129,199,132,0.30)", stroke: "rgba(60,140,70,0.9)", width: 1.4, r: 4 });
        D.text(ctx, "目標基因", cx, cy + 4, { color: PL.col("text"), size: 9.5, align: "center", weight: "700" });
      };
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const st = Number(stepSel.get()), p = progS.get() / 100, good = enzSel.get() === "eco";
          const cx2 = W * 0.28, cy2 = H * 0.48, R = H * 0.20;
          if (st === 0) { // 切割:質體張口、基因片段露出黏末端
            plasmid(ctx, cx2, cy2, R, p * 0.5); D.text(ctx, "質體(環狀 DNA)", cx2, cy2 + R + 18, { color: PL.col("text-dim"), size: 10.5, align: "center" });
            const gx = W * 0.58, gy = H * 0.20, gw = W * 0.32, dx = Math.max(0, p - 0.3) * 26;
            geneBox(ctx, gx + gw / 2, gy, gw);
            if (dx > 0) {
              [gx + gw * 0.08 - dx, gx + gw * 0.92 + dx].forEach(x => D.line(ctx, x, gy - 14, x, gy + 14, "#c0392b", 2));
              D.text(ctx, "黏末端", gx + gw * 0.08 - dx, gy - 20, { color: "#c0392b", size: 9.5, align: "center" });
            }
            CK.badge(ctx, cx2, cy2 - R - 16, "限制酶:專一性切口", "#ef8829");
          } else if (st === 1) { // 縫合:基因飛向缺口,連接酶收尾
            const eff = good ? p : Math.min(p, 0.25);
            plasmid(ctx, cx2, cy2, R, 0.5 * (1 - eff)); geneBox(ctx, cx2, cy2 - R - 46 - (1 - eff) * 22, 80);
            geneBox(ctx, cx2, cy2 - R - 46 - (1 - eff) * 22, 80);
            if (eff > 0.85) {
              CK.badge(ctx, cx2, cy2, "連接酶縫合 ✓", "#43a047"); D.text(ctx, "重組 DNA 完成", cx2, cy2 + R + 18, { color: "#43a047", size: 11, align: "center", weight: "700" });
            } else D.text(ctx, good ? "黏末端互補 → 可縫合" : "黏末端不相容 → 縫不起來", cx2, cy2 + R + 18, { color: good ? PL.col("text-dim") : "#c0392b", size: 10.5, align: "center" });
          } else if (st === 2) { // 轉形:細菌吸收重組質體
            const taken = Math.round(p * 2);
            for (let i = 0; i < 3; i++) {
              const bx = W * 0.13 + i * W * 0.15;
              CK.cellBody(ctx, bx, H * 0.48, H * 0.09, { type: "bacteria", time: t });
              if (i < taken) D.disc(ctx, bx, H * 0.48, 5.5, { fill: "#43a047", stroke: "rgba(30,90,40,0.8)" });
            }
            for (let k = 0; k < 2 - taken; k++) D.disc(ctx, W * 0.60 + k * 26, H * 0.22, 5.5, { fill: "rgba(67,160,71,0.45)", stroke: "rgba(30,90,40,0.8)" });
            D.text(ctx, "CaCl₂ + 熱休克:細菌吸收重組質體(綠點)", W * 0.30, H * 0.76, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          } else { // 量產:發酵槽
            D.rect(ctx, W * 0.08, H * 0.14, W * 0.44, H * 0.62, { fill: "rgba(150,190,215,0.25)", stroke: "rgba(90,120,150,0.9)", width: 2, r: 10 });
            CK.counter(ctx, W * 0.11, H * 0.22, W * 0.38, Math.round(10 + p * 26), { color: "#7fc8ff", r: 5 });
            CK.counter(ctx, W * 0.11, H * 0.48, W * 0.38, Math.round(p * 30), { color: "#ef8829", r: 4 });
            D.text(ctx, "轉殖菌", W * 0.11, H * 0.455, { color: PL.col("text-dim"), size: 10 }); D.text(ctx, "胰島素", W * 0.11, H * 0.715, { color: PL.col("text-dim"), size: 10 });
            CK.meter(ctx, W * 0.56, H * 0.34, W * 0.34, 12, p, { color: "#ef8829", label: "累積產量" });
          }
          // 右側:步驟說明卡 + 讀數 + 判定
          CK.panel(ctx, W * 0.62, H * 0.10, W * 0.34, H * 0.30, "步驟 " + (st + 1) + " / 4");
          D.text(ctx, STEPS[st], W * 0.79, H * 0.22, { color: PL.col("accent"), size: 12, align: "center", weight: "700" });
          D.text(ctx, DESC[st], W * 0.79, H * 0.32, { color: PL.col("text-dim"), size: 9.8, align: "center" });
          rStep.set(STEPS[st].split(":")[0]); rEnz.set(good ? "EcoRI(切點正確)" : "切口序列不對");
          rYield.set(st === 3 ? Math.round(p * 100) : 0, 0); rRecomb.set(st >= 1 ? (good ? "已建成" : "縫合失敗") : "尚未縫合");
          vd.set(!good && st >= 1 ? "限制酶切錯位置:黏末端不相容,連接酶無法縫合——實驗卡在步驟 2" : ["切口完成,準備縫合", "重組質體已建成", "部分細菌已帶重組質體", "轉殖菌正在量產目標蛋白"][st], !good && st >= 1 ? "bad" : "ok");
        }
      });
      const stepSel = PL.ui.select(ui.L.controls, { label: "步驟", value: "0", options: STEPS.map((s, i) => ({ value: String(i), label: "步驟 " + (i + 1) })) });
      const enzSel = PL.ui.select(ui.L.controls, { label: "限制酶", value: "eco", options: [
        { value: "eco", label: "EcoRI(切點正確)" }, { value: "bad", label: "切口序列不對" }
      ] });
      const progS = PL.ui.slider(ui.L.controls, { label: "步驟進度", min: 0, max: 100, step: 5, value: 40, unit: "%", digits: 0 });
      PL.ui.note(ui.L.controls, "基因工程四步:切、縫、送、產。限制酶的專一性讓切口可預期,黏末端互補才能縫——這是重組 DNA 的成敗關鍵。");
      PL.ui.procedure(ui.L.controls, {
        title: "走完一輪基因工程",
        steps: [
          "步驟一拉進度:質體張口、基因片段兩端露出黏末端。",
          "步驟二:基因飛向缺口,連接酶縫合成重組質體。",
          "故意選「切口序列不對」再縫一次:實驗卡住——黏末端不相容。",
          "步驟四:發酵槽裡細菌一變二,胰島素累積。"
        ],
        rule: "限制酶切出的「黏末端」要互補才能接起來——不是任意兩段 DNA 剪一剪都縫得起來。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "質體選殖", apply: () => { enzSel.set("eco"); stepSel.set("1"); progS.set(60); } }, { label: "切錯限制酶", apply: () => { enzSel.set("bad"); stepSel.set("1"); progS.set(80); } },
        { label: "胰島素量產", apply: () => { enzSel.set("eco"); stepSel.set("3"); progS.set(100); } }
      ] });
      const vd = PL.ui.verdict(ui.L.controls, { label: "流程判定" });
      const rStep = PL.ui.readout(ui.L.readouts, { label: "目前步驟" }), rEnz = PL.ui.readout(ui.L.readouts, { label: "限制酶" });
      const rRecomb = PL.ui.readout(ui.L.readouts, { label: "重組質體" }), rYield = PL.ui.readout(ui.L.readouts, { label: "相對產量", unit: "%" });
      return { stop() { ui.stop(); } };
    }
  });
})();
