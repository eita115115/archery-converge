/**
 * Engine bench — latency smoke + regression gates (E2+).
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
const windySess = { id: "a2", dist: 70, faceD: fd, setupId: "s1", windDir: "左から", windSpeed: 4 };
const st = Eng.grouping.robust(arrows);

const sixFixture = JSON.parse(fs.readFileSync(path.join(root, "tools/fixtures/session-six-ends.json"), "utf8"));
const sixSession = Object.assign({ setupId: "s1" }, sixFixture.session);

let failed = false;

function bench(label, fn, n, maxMsPerCall) {
  Eng.clearCaches();
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < n; i++) fn();
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  const per = ms / n;
  console.log(label + ": " + ms.toFixed(2) + "ms (" + per.toFixed(3) + "ms/call)");
  if (maxMsPerCall != null && per > maxMsPerCall) {
    console.error("engine-bench FAIL: " + label + " > " + maxMsPerCall + " ms/call (got " + per.toFixed(3) + ")");
    failed = true;
  }
}

function benchOnce(label, fn, maxMs) {
  Eng.clearCaches();
  fn();
  const t0 = process.hrtime.bigint();
  fn();
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  console.log(label + ": " + ms.toFixed(2) + "ms");
  if (maxMs != null && ms > maxMs) {
    console.error("engine-bench FAIL: " + label + " > " + maxMs + " ms (got " + ms.toFixed(2) + ")");
    failed = true;
  }
}

bench("trajectory cold x20", () => Eng.ballistics.trajectory(sess, db.setups[0], 850), 20);
bench("trajectory cached x200", () => Eng.ballistics.trajectory(sess, db.setups[0], 850), 200);
bench("analyzeEnd x50", () => Eng.advice.analyzeEnd(db, db.settings, db.setups[0], sess, arrows), 50);
bench("wind.classify x200", () => Eng.wind.classify(windySess, st), 200, 0.5);
Eng.memory.convergeIndex(db, "s1", db.settings);
bench("convergeIndex x100", () => Eng.memory.convergeIndex(db, "s1", db.settings), 100, 5);
bench("grouping.describe x100", () => Eng.grouping.describe(st, fd), 100, 0.2);
benchOnce(
  "analyzeSession 6 ends",
  () => Eng.advice.analyzeSession(db, db.settings, db.setups[0], sixSession),
  50
);

if (failed) process.exit(1);
console.log("engine-bench OK tier=" + Eng.profile.tier + " steps=" + Eng.profile.maxSimSteps);