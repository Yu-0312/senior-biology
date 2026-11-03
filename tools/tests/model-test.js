/*
 * model-test.js — 科目模型數值檢查
 *
 * 抽查實驗的內建模型是否符合已知結論（數值與方向）。
 * 用 open() 抓建置脈絡，以滑桿寫值、以讀數取值。
 */
require("./harness.js");
const { reporter } = require("./_lib.js");
const PL = window.PhysicsLab;
const R = reporter();
document.documentElement.getAttribute = () => "dark";

let LAST = null;
PL._hooks.onBuilt(c => { LAST = c; });

function open(id) {
  if (!PL.has(id)) return null;
  LAST = null;
  const root = document.createElement("div");
  root.dataset = { simId: id };
  const api = PL.get(id).build(root);
  window.flushFrames(2);
  const ctx = LAST;
  if (!ctx) throw new Error("沒有取得建置脈絡：" + id);
  const set = (label, v) => {
    const s = (ctx.sliders || []).find(x => x.label === label);
    if (!s) throw new Error(id + " 找不到滑桿：" + label);
    s.write(v);
    if (api.rerender) api.rerender();
  };
  const get = label => {
    const r = (ctx.readouts || []).find(x => x.label === label);
    return r ? r.number : null;
  };
  const text = label => {
    const r = (ctx.readouts || []).find(x => x.label === label);
    return r ? r.value : null;
  };
  return { ctx, api, set, get, text, stop: () => api && api.stop && api.stop() };
}
const close = (a, b, tol) => a != null && b != null && Math.abs(a - b) <= Math.abs(b) * (tol || 0.02) + 1e-9;

R.section("生命現象：嬰兒體重隨觀察時間線性增加");
{
  const s = open("life-phenomena");
  R.ok(!!s, "life-phenomena 已提供");
  if (s) {
    s.set("觀察時間", 0);
    const m0 = s.get("質量指標");
    s.set("觀察時間", 10);
    const m10 = s.get("質量指標");
    R.ok(close(m0, 3.2, 0.02) && close(m10, 5.4, 0.02), "3.2 → 5.4（每天 +0.22）",
      "t=0: " + m0 + "、t=10: " + m10);
    s.stop();
  }
}

R.section("細胞尺度：SA:V = 6/L，邊長加倍比值減半");
{
  const s = open("cell-surface");
  R.ok(!!s, "cell-surface 已提供");
  if (s) {
    s.set("細胞邊長", 20);
    const r20 = s.get("SA : V");
    s.set("細胞邊長", 40);
    const r40 = s.get("SA : V");
    R.ok(close(r20, 0.3, 0.02), "L=20 → SA:V = 0.30", "得到 " + r20);
    R.ok(close(r40, 0.15, 0.02), "L=40 → SA:V = 0.15", "得到 " + r40);
    s.stop();
  }
}

R.done();
