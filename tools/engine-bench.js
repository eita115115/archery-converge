/**
 * Quick engine bench — trajectory cache + analyzeEnd latency.
 * Run: node tools/engine-bench.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const ctx = {
  window: {},
  Math,
  Array,
  module: { exports: {} },
  globalThis: {},
  navigator: { hardwareConcurrency: 4, deviceMemory: 4 },
  document: { documentElement: { style: { setProperty: () => {} } } },
  matchMedia: () => ({ matches: false }),
};
ctx.window = ctx;
ctx.globalThis = ctx;
["geometry.js", "physics.js", "engine.js"].forEach(f => {
  vm.runInNewContext(fs.readFileSync(path.join(root, f), "utf8"), ctx);
});

const Geo = ctx.ConvergeGeometry;
const Eng = ctx.ConvergeEngine;

if (!Eng) {
  console.error("engine-bench FAIL: ConvergeEngine missing");
  process.exit(1);
}

const fd = Geo.faceDForDist(70);
const arrows = [];
for (let i = 0; i < 6; i++) {
  const x = (Math.random() - 0.5) * fd * 0.08;
  const y = (Math.random() - 0.5) * fd * 0.08;
  const h = Geo.hitAt(x, y, fd);
  arrows.push({ x: h.x, y: h.y, s: h.s, X: h.X });
}

const db = {
  setups: [{ id: "s1", poundage: "36", arrowWeight: "400", arrowDia: "5.7" }],
  sessions: [],
  sightMarks: [],
  settings: { eyeSight: 850, beginnerMode: true },
};
const sess = { id: "a1", dist: 70, faceD: fd, setupId: "s1", windDir: "", windSpeed: 0 };

function bench(label, fn, n) {
  Eng.clearCaches();
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < n; i++) fn();
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  console.log(label + ": " + ms.toFixed(2) + "ms (" + (ms / n).toFixed(3) + "ms/call)");
}

bench("trajectory cold x20", () => Eng.ballistics.trajectory(sess, db.setups[0], 850), 20);
bench("trajectory cached x200", () => Eng.ballistics.trajectory(sess, db.setups[0], 850), 200);
bench("analyzeEnd x50", () => Eng.advice.analyzeEnd(db, db.settings, db.setups[0], sess, arrows), 50);

console.log("engine-bench OK tier=" + Eng.profile.tier + " steps=" + Eng.profile.maxSimSteps);