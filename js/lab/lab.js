/*
 * lab.js — 食物檢測實驗室
 *
 * 這不是「把器材拖來拖去」的沙盒，而是生物課真正會做的一件事：
 * 挑一種食物樣品，對四支試管分別滴入檢測試劑，需要時隔水加熱，
 * 看顏色怎麼變，再由顏色反推樣品裡有哪些有機物。
 *
 * 模型刻意保持可解釋：
 *   · 每種樣品登記四種成分的含量（還原醣、澱粉、蛋白質、脂質，0–1）
 *   · 本氏液：還原醣把 Cu²⁺ 還原成 Cu₂O，顏色隨含量由藍漸變到磚紅，需隔水加熱
 *   · 碘液：碘分子嵌入澱粉螺旋，常溫呈藍紫；對肝醣呈紅棕、對單醣不變色
 *   · 雙縮脲：鹼性下 Cu²⁺ 與胜肽鍵形成紫紅色錯合物，蛋白質越多越深
 *   · 蘇丹 III：脂溶性染料溶入油滴，呈橙紅色
 * 目的不是取代儀器分析，而是讓學生看見「滴什麼、有什麼」如何對應「顏色變成什麼」。
 */
(function () {
  "use strict";

  const $ = sel => document.querySelector(sel);
  const BUILD = (window.PhysicsLabSite && window.PhysicsLabSite.build) || "";
  const SAVE_KEY = "bio-lab-v1";

  /* ------------------------------ 樣品 ------------------------------ */
  /* 成分含量以 0–1 的相對濃度登記，用來決定顯色的「深淺」而非絕對數值。 */
  const SAMPLES = {
    glucose: { name: "葡萄糖水", cat: "單醣", comp: { sugar: 0.9, starch: 0, protein: 0, lipid: 0 },
      note: "還原醣的標準陽性對照：本氏液加熱後應出現明顯的磚紅色沉澱。" },
    sucrose: { name: "蔗糖水", cat: "雙醣", comp: { sugar: 0, starch: 0, protein: 0, lipid: 0 },
      note: "蔗糖不是還原醣——本氏液不變色；要先加酸水解成葡萄糖與果糖才呈陽性。" },
    starch: { name: "澱粉液", cat: "多醣", comp: { sugar: 0, starch: 0.9, protein: 0, lipid: 0 },
      note: "碘液專測澱粉：藍紫色來自碘嵌入澱粉的螺旋結構，常溫即可反應。" },
    albumin: { name: "蛋白液", cat: "蛋白質", comp: { sugar: 0, starch: 0, protein: 0.9, lipid: 0 },
      note: "雙縮脲試劑與胜肽鍵反應呈紫紅色；蛋白質濃度越高顏色越深。" },
    oil: { name: "植物油", cat: "脂質", comp: { sugar: 0, starch: 0, protein: 0, lipid: 0.9 },
      note: "蘇丹 III 是脂溶性染料，會溶入油滴染成橙紅色；水層仍為試劑原色。" },
    potato: { name: "馬鈴薯汁", cat: "混合", comp: { sugar: 0.1, starch: 0.7, protein: 0.05, lipid: 0 },
      note: "澱粉為主、含少量還原醣：碘液深藍紫，本氏液加熱只轉綠黃。" },
    honey: { name: "蜂蜜水", cat: "混合", comp: { sugar: 0.8, starch: 0, protein: 0, lipid: 0 },
      note: "蜂蜜以葡萄糖與果糖為主：本氏液加熱呈橙紅，碘液不變色。" },
    milk: { name: "牛奶", cat: "混合", comp: { sugar: 0.15, starch: 0, protein: 0.45, lipid: 0.3 },
      note: "乳糖是還原醣、酪蛋白是蛋白質、含乳脂肪：四管都會有不同程度的陽性。" },
    water: { name: "蒸餾水", cat: "對照組", comp: { sugar: 0, starch: 0, protein: 0, lipid: 0 },
      note: "對照組應該全部維持試劑原色——若變色，代表器材被汙染。" }
  };

  /* ------------------------------ 試劑 ------------------------------ */
  const REAGENTS = {
    benedict: { name: "本氏液", short: "本", tube: 0, needsHeat: true, base: "#4a90d9",
      note: "藍色硫酸銅溶液；與還原醣加熱後轉為綠、黃、橙、磚紅。" },
    iodine: { name: "碘液", short: "碘", tube: 1, needsHeat: false, base: "#b98a3c",
      note: "碘–碘化鉀溶液；遇澱粉呈藍紫色、遇肝醣呈紅棕色。" },
    biuret: { name: "雙縮脲", short: "雙", tube: 2, needsHeat: false, base: "#8fa8c8",
      note: "先加 NaOH 再加稀硫酸銅；與胜肽鍵呈紫紅色。" },
    sudan: { name: "蘇丹 III", short: "蘇", tube: 3, needsHeat: false, base: "#e8b46a",
      note: "脂溶性染料；能把油脂染成橙紅色，常用顯微鏡觀察油滴。" }
  };
  const TUBE_ORDER = ["benedict", "iodine", "biuret", "sudan"];

  /* 本氏液色階：0 藍 → 1 磚紅 */
  function benedictColor(level) {
    const stops = ["#4a90d9", "#5fb077", "#e8d44d", "#ef8829", "#c0392b"];
    return stops[Math.max(0, Math.min(stops.length - 1, Math.round(level * (stops.length - 1))))];
  }

  /* 反應模型：回傳 {color, level 0–1, verdict, explain} */
  function react(reagentId, sample) {
    const c = sample.comp;
    if (reagentId === "benedict") {
      const lv = c.sugar;
      return lv > 0.05
        ? { color: benedictColor(lv), level: lv, verdict: lv > 0.6 ? "磚紅——大量還原醣" : lv > 0.3 ? "橙——中量還原醣" : "綠黃——少量還原醣",
            explain: "還原醣把 Cu²⁺ 還原成 Cu₂O，含量越多顏色越紅。" }
        : { color: "#4a90d9", level: 0, verdict: "維持藍色——無還原醣", explain: "沒有還原醣可以還原銅離子，本氏液保持原色。" };
    }
    if (reagentId === "iodine") {
      const lv = c.starch;
      return lv > 0.05
        ? { color: lv > 0.5 ? "#3d3d8f" : "#6a5fa8", level: lv, verdict: lv > 0.5 ? "深藍紫——澱粉豐富" : "藍紫——含澱粉",
            explain: "碘分子嵌入澱粉螺旋結構，吸收光譜改變而呈藍紫色。" }
        : { color: "#b98a3c", level: 0, verdict: "碘液原色——無澱粉", explain: "單醣與雙醣的分子不夠長，無法捲成螺旋，碘液不變色。" };
    }
    if (reagentId === "biuret") {
      const lv = c.protein;
      return lv > 0.05
        ? { color: lv > 0.5 ? "#7a4a9c" : "#9a6ab8", level: lv, verdict: lv > 0.5 ? "深紫紅——蛋白質豐富" : "紫紅——含蛋白質",
            explain: "鹼性環境中 Cu²⁺ 與胜肽鍵形成紫紅色錯合物；键越多顏色越深。" }
        : { color: "#8fa8c8", level: 0, verdict: "維持藍色——無蛋白質", explain: "沒有足夠的胜肽鍵與銅離子錯合。" };
    }
    const lv = c.lipid;
    return lv > 0.05
      ? { color: lv > 0.5 ? "#e2662a" : "#e8945a", level: lv, verdict: lv > 0.5 ? "鮮橙紅——油脂豐富" : "橙紅——含油脂",
          explain: "蘇丹 III 溶入脂滴（同為非極性），把油脂染成橙紅。" }
      : { color: "#e8b46a", level: 0, verdict: "維持原色——無油脂", explain: "沒有脂滴可以溶入，染料留在試劑層。" };
  }

  /* ------------------------------ 狀態 ------------------------------ */
  const state = { sample: null, reagents: [], heated: false, t: 0 };
  const undoStack = [];
  function pushUndo() {
    undoStack.push(JSON.stringify({ sample: state.sample, reagents: state.reagents.slice(), heated: state.heated }));
    if (undoStack.length > 60) undoStack.shift();
  }
  function popUndo() {
    const s = undoStack.pop();
    if (!s) return false;
    const o = JSON.parse(s);
    state.sample = o.sample; state.reagents = o.reagents; state.heated = o.heated;
    return true;
  }

  /* ------------------------------ 畫布 ------------------------------ */
  const cv = $("#lab-canvas");
  const ctx = cv.getContext("2d");
  let W = 0, H = 0, dpr = 1;
  function isLight() { return document.documentElement.getAttribute("data-theme") === "light"; }
  function col(name) {
    const light = isLight();
    const map = {
      text: light ? "#1c2530" : "#e6edf3", dim: light ? "#5a6a7a" : "#9fb0c0",
      faint: light ? "#8494a4" : "#62707f", border: light ? "#c9d5e2" : "#26303d",
      accent: light ? "#0f766e" : "#5eead4", benchTop: light ? "#eef2f7" : "#1a222c",
      benchFront: light ? "#d8e2ec" : "#141b24"
    };
    return map[name] || "#888";
  }
  function resize() {
    const r = cv.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  function rect(x, y, w, h, fill, stroke, r) {
    ctx.beginPath();
    if (r) { ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
    else ctx.rect(x, y, w, h);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.4; ctx.stroke(); }
  }
  function text(str, x, y, o) {
    o = o || {};
    ctx.fillStyle = o.color || col("dim");
    ctx.font = (o.weight || "") + " " + (o.size || 12) + "px system-ui,'PingFang TC','Microsoft JhengHei',sans-serif";
    ctx.textAlign = o.align || "left";
    ctx.textBaseline = o.baseline || "alphabetic";
    ctx.fillText(str, x, y);
  }
  function disc(x, y, r, fill, stroke) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.4; ctx.stroke(); }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // 實驗檯
    rect(0, H - 26, W, 26, col("benchFront"));
    rect(0, H - 30, W, 6, col("benchTop"));
    // 水浴（加熱時出現）
    const heat = state.heated && state.reagents.includes("benedict");
    if (heat) {
      const bx = W * 0.30, by = H - 30;
      rect(bx - 70, by - 92, 140, 92, "rgba(120,180,220,0.30)", isLight() ? "rgba(90,130,165,0.8)" : "rgba(160,205,235,0.8)", 8);
      rect(bx - 66, by - 78, 132, 74, "rgba(90,170,220,0.35)");
      // 加熱板
      rect(bx - 84, by - 8, 168, 12, "#5d6b7a", null, 3);
      // 氣泡
      for (let i = 0; i < 7; i++) {
        const f = ((state.t * 0.6 + i / 7) % 1);
        disc(bx - 50 + (i * 23 % 110), by - 10 - f * 60, 2.6 - f, "rgba(255,255,255," + (0.7 - f * 0.5) + ")");
      }
      text("隔水加熱中（水浴約 60 °C）", bx, by - 104, { align: "center", color: col("accent"), size: 12, weight: "700" });
    }
    // 四支試管
    const rackY = H - 30;
    const tubeW = 34, tubeH = 120;
    const startX = W * 0.5 - (tubeW * 4 + 60) / 2;
    // 試管架
    rect(startX - 24, rackY - 10, tubeW * 4 + 60 + 48, 10, "#8a6a4c", null, 3);
    TUBE_ORDER.forEach((rid, i) => {
      const x = startX + i * (tubeW + 20);
      const hasR = state.reagents.includes(rid);
      let fill = "rgba(210,232,244,0.30)";
      let verdict = "未滴試劑";
      if (state.sample && hasR) {
        const r = react(rid, SAMPLES[state.sample]);
        fill = r.color;
        verdict = r.verdict;
      } else if (state.sample) {
        fill = "rgba(230,225,205,0.5)";
        verdict = "只有樣品";
      }
      const baseY = rackY - 10;
      // 玻管
      rect(x, baseY - tubeH, tubeW, tubeH, fill, isLight() ? "rgba(84,124,152,0.85)" : "rgba(206,232,244,0.8)", 6);
      // 液面
      if (hasR || state.sample) {
        rect(x + 2.5, baseY - tubeH * 0.62, tubeW - 5, tubeH * 0.62 - 3, fill, null, 4);
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.beginPath(); ctx.ellipse(x + tubeW / 2, baseY - tubeH * 0.62, tubeW / 2 - 3, 2.6, 0, 0, Math.PI * 2); ctx.fill();
      }
      // 標籤
      text(REAGENTS[rid].name, x + tubeW / 2, rackY + 14, { align: "center", size: 11 });
      text(verdict, x + tubeW / 2, rackY + 30, { align: "center", size: 10, color: state.sample && hasR ? col("accent") : col("faint") });
      // 試劑編號
      text(String(i + 1), x + tubeW / 2, baseY - tubeH - 10, { align: "center", size: 11, color: col("faint"), weight: "700" });
    });
    // 滴管（最近加入的試劑）
    const last = state.reagents[state.reagents.length - 1];
    if (last && state.reagents.includes(last)) {
      const i = TUBE_ORDER.indexOf(last);
      const x = startX + i * (tubeW + 20) + tubeW / 2;
      const topY = H * 0.10;
      rect(x - 9, topY, 18, 26, "#c9d6e2", null, 6);
      rect(x - 11, topY - 12, 22, 12, "#7f8fa1", null, 5);
      ctx.strokeStyle = isLight() ? "rgba(84,124,152,0.85)" : "rgba(206,232,244,0.8)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x - 6, topY + 26); ctx.lineTo(x - 2, topY + 66);
      ctx.moveTo(x + 6, topY + 26); ctx.lineTo(x + 2, topY + 66);
      ctx.stroke();
      const f = (state.t % 1);
      if (f < 0.5) disc(x, topY + 78 + f * 40, 3, REAGENTS[last].base);
    }
    // 樣品標示
    text(state.sample ? "樣品：" + SAMPLES[state.sample].name : "未選樣品", W * 0.06, H - 44,
      { size: 13, weight: "700", color: col("text") });
    if (state.sample) text(SAMPLES[state.sample].cat, W * 0.06 + 120, H - 44, { size: 11, color: col("faint") });
  }

  function loop() {
    state.t += 1 / 60;
    draw();
    requestAnimationFrame(loop);
  }

  /* ------------------------------ 介面 ------------------------------ */
  const tabs = $("#lab-tabs"), tiles = $("#lab-tiles");
  const inspector = $("#lab-inspector");
  const statusEl = $("#lab-status"), toastEl = $("#lab-toast");
  let toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2600);
  }
  function status(msg) { statusEl.textContent = msg; }

  const CATS = [
    { id: "sample", label: "樣品" },
    { id: "reagent", label: "試劑" },
    { id: "action", label: "操作" }
  ];
  let activeCat = "sample";
  function buildTabs() {
    tabs.innerHTML = "";
    CATS.forEach(c => {
      const b = document.createElement("button");
      b.className = "lab-tab" + (c.id === activeCat ? " is-active" : "");
      b.type = "button"; b.textContent = c.label;
      b.setAttribute("role", "tab");
      b.addEventListener("click", () => { activeCat = c.id; buildTabs(); buildTiles(); });
      tabs.appendChild(b);
    });
  }
  function buildTiles() {
    tiles.innerHTML = "";
    if (activeCat === "sample") {
      Object.keys(SAMPLES).forEach(id => {
        const s = SAMPLES[id];
        const b = document.createElement("button");
        b.className = "lab-tile" + (state.sample === id ? " is-active" : "");
        b.type = "button";
        b.innerHTML = "<b>" + s.name + "</b><span>" + s.cat + "</span>";
        b.title = s.note;
        b.addEventListener("click", () => {
          pushUndo();
          state.sample = id;
          status("已裝入「" + s.name + "」，共四支試管各滴入少量樣品。");
          toast(s.note);
          refresh();
        });
        tiles.appendChild(b);
      });
    } else if (activeCat === "reagent") {
      TUBE_ORDER.forEach(id => {
        const r = REAGENTS[id];
        const added = state.reagents.includes(id);
        const b = document.createElement("button");
        b.className = "lab-tile" + (added ? " is-active" : "");
        b.type = "button";
        b.innerHTML = "<b>" + r.name + (r.needsHeat ? "（需加熱）" : "") + "</b><span>" + (added ? "已滴入" : "點擊滴入") + "</span>";
        b.title = r.note;
        b.addEventListener("click", () => {
          if (!state.sample) { toast("先從「樣品」分頁挑一種食物。"); return; }
          if (added) return;
          pushUndo();
          state.reagents.push(id);
          status("已對第 " + (TUBE_ORDER.indexOf(id) + 1) + " 管滴入" + r.name + "。");
          toast(r.note);
          refresh();
        });
        tiles.appendChild(b);
      });
    } else {
      const actions = [
        { label: state.heated ? "停止加熱" : "隔水加熱", hint: "本氏液需要加熱才會顯色", on: () => {
            if (!state.reagents.includes("benedict")) { toast("先滴入本氏液再加熱。"); return; }
            pushUndo();
            state.heated = !state.heated;
            status(state.heated ? "水浴加熱中——觀察第 1 管。" : "已停止加熱。");
            refresh();
          } },
        { label: "全部重來", hint: "清空樣品與試劑", on: () => {
            pushUndo();
            state.sample = null; state.reagents = []; state.heated = false;
            status("實驗台已清空。");
            refresh();
          } }
      ];
      actions.forEach(a => {
        const b = document.createElement("button");
        b.className = "lab-tile"; b.type = "button";
        b.innerHTML = "<b>" + a.label + "</b><span>" + a.hint + "</span>";
        b.addEventListener("click", a.on);
        tiles.appendChild(b);
      });
    }
  }

  /* 讀數列 */
  const chipSample = $("#lab-sample"), chipDetect = $("#lab-detect"), chipHeat = $("#lab-heat");

  function buildInspector() {
    inspector.innerHTML = "";
    const h = document.createElement("div");
    h.className = "lab-insp";
    h.innerHTML = "<h2>檢測結果</h2>";
    inspector.appendChild(h);
    if (!state.sample) {
      const p = document.createElement("p");
      p.style.cssText = "color:var(--text-dim, #9fb0c0); font-size:13px;";
      p.textContent = "先選一種樣品。右側會列出四支試管的反應與對應成分。";
      inspector.appendChild(p);
      return;
    }
    const s = SAMPLES[state.sample];
    const detected = [];
    TUBE_ORDER.forEach((rid, i) => {
      const r = REAGENTS[rid];
      const row = document.createElement("div");
      row.className = "lab-insp";
      let body;
      if (!state.reagents.includes(rid)) {
        body = "<b>" + (i + 1) + ". " + r.name + "</b><span>尚未滴入" + (r.needsHeat ? "（需加熱）" : "") + "</span>";
      } else {
        const res = react(rid, s);
        body = "<b>" + (i + 1) + ". " + r.name + "：</b><span style=\"color:" + res.color + ";font-weight:700\">" + res.verdict + "</span>" +
          "<small style=\"display:block;opacity:.75;margin-top:2px\">" + res.explain + "</small>";
        if (res.level > 0.05 && !detected.includes(r.name)) detected.push(r.name);
      }
      row.innerHTML = body;
      inspector.appendChild(row);
    });
    const sum = document.createElement("div");
    sum.className = "lab-insp";
    const truth = [];
    if (s.comp.sugar > 0.05) truth.push("還原醣");
    if (s.comp.starch > 0.05) truth.push("澱粉");
    if (s.comp.protein > 0.05) truth.push("蛋白質");
    if (s.comp.lipid > 0.05) truth.push("脂質");
    const hit = TUBE_ORDER.every(rid => state.reagents.includes(rid));
    sum.innerHTML = "<h2>樣品成分推論" + (hit ? "（四管皆已檢測）" : "（尚未檢完）") + "</h2>" +
      "<span>成分指標（示意）：" + (truth.length ? truth.join("、") : "皆未檢出") + "</span>";
    inspector.appendChild(sum);
  }

  function refresh() {
    chipSample.textContent = state.sample ? SAMPLES[state.sample].name : "—";
    chipHeat.textContent = state.heated && state.reagents.includes("benedict") ? "加熱中" : "未加熱";
    const s = state.sample ? SAMPLES[state.sample] : null;
    chipDetect.textContent = s
      ? [s.comp.sugar > 0.05 && "還原醣", s.comp.starch > 0.05 && "澱粉", s.comp.protein > 0.05 && "蛋白質", s.comp.lipid > 0.05 && "脂質"].filter(Boolean).join("、") || "—"
      : "—";
    buildTiles();
    buildInspector();
    save();
    draw();
  }

  /* 持久化 */
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* 隱私模式就算了 */ }
  }
  function load() {
    try {
      const o = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (o && typeof o === "object") { state.sample = o.sample || null; state.reagents = o.reagents || []; state.heated = !!o.heated; }
    } catch (e) { /* 壞資料直接忽略 */ }
  }

  /* 範例 */
  const EXAMPLES = [
    { name: "還原醣陽性", apply: () => { state.sample = "glucose"; state.reagents = ["benedict"]; state.heated = true; } },
    { name: "澱粉陽性", apply: () => { state.sample = "potato"; state.reagents = ["iodine"]; state.heated = false; } },
    { name: "牛奶四管", apply: () => { state.sample = "milk"; state.reagents = TUBE_ORDER.slice(); state.heated = true; } },
    { name: "對照組", apply: () => { state.sample = "water"; state.reagents = TUBE_ORDER.slice(); state.heated = false; } }
  ];
  const examplesBtn = $("#lab-examples-btn"), examplesPop = $("#lab-examples");
  if (examplesBtn && examplesPop) {
    EXAMPLES.forEach(ex => {
      const b = document.createElement("button");
      b.type = "button"; b.setAttribute("role", "menuitem");
      b.textContent = ex.name;
      b.addEventListener("click", () => {
        pushUndo();
        ex.apply();
        status("已載入範例：" + ex.name);
        examplesPop.hidden = true;
        refresh();
      });
      examplesPop.appendChild(b);
    });
    examplesBtn.addEventListener("click", () => {
      examplesPop.hidden = !examplesPop.hidden;
      examplesBtn.setAttribute("aria-expanded", String(!examplesPop.hidden));
    });
    document.addEventListener("click", e => {
      if (!examplesPop.hidden && !examplesPop.contains(e.target) && e.target !== examplesBtn) examplesPop.hidden = true;
    });
  }

  /* 檔案選單：清空 */
  const fileBtn = $("#lab-file-btn"), filePop = $("#lab-file");
  if (fileBtn && filePop) {
    filePop.querySelectorAll("[data-act]").forEach(b => {
      b.addEventListener("click", () => {
        filePop.hidden = true;
        if (b.dataset.act === "clear") {
          pushUndo();
          state.sample = null; state.reagents = []; state.heated = false;
          status("實驗台已清空。");
          refresh();
        }
      });
    });
    fileBtn.addEventListener("click", () => {
      filePop.hidden = !filePop.hidden;
      fileBtn.setAttribute("aria-expanded", String(!filePop.hidden));
    });
    document.addEventListener("click", e => {
      if (!filePop.hidden && !filePop.contains(e.target) && e.target !== fileBtn) filePop.hidden = true;
    });
  }

  /* 復原／重做 */
  $("#lab-undo").addEventListener("click", () => { if (popUndo()) { status("已復原。"); refresh(); } });
  $("#lab-redo").addEventListener("click", () => { toast("這個版本先支援復原。"); });

  /* 主題 */
  $("#lab-theme").addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    const next = cur === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("pl-theme", JSON.stringify(next)); } catch (e) {}
    draw();
  });

  load();
  buildTabs();
  buildTiles();
  buildInspector();
  refresh();
  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(loop);
})();
