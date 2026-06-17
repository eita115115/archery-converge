/**
 * Archery practice flow simulation — no browser, exercises geometry + physics + data shape.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
function load(name) {
  const src = fs.readFileSync(path.join(root, name), "utf8");
  const ctx = {
    window: {},
    Math,
    Array,
    module: { exports: {} },
    globalThis: {},
    document: { documentElement: { style: { setProperty: () => {} } } },
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.runInNewContext(src, ctx);
  return ctx;
}

const geoCtx = load("geometry.js");
const phyCtx = load("physics.js");
const Geo = geoCtx.ConvergeGeometry;
const Phy = phyCtx.ArcheryPhysics || phyCtx.module.exports;

const issues = [];
function note(sev, msg) {
  issues.push({ sev, msg });
}

// --- Realistic 70m outdoor end: slight high-right group + one flyer ---
const faceD = Geo.faceDForDist(70);
const dist = 70;
const arrows = [
  { x: 1.8, y: 2.1, s: 9, X: false },
  { x: 2.2, y: 1.9, s: 9, X: false },
  { x: 1.5, y: 2.4, s: 10, X: false },
  { x: 2.0, y: 2.0, s: 9, X: false },
  { x: 1.9, y: 2.2, s: 9, X: false },
  { x: 18, y: -12, s: 6, X: false },
];

// Re-score from coords (what tap recording does)
arrows.forEach((a, i) => {
  const h = Geo.hitAt(a.x, a.y, faceD);
  if (h.s !== a.s) note("warn", `arrow ${i + 1}: stored s=${a.s} but hitAt=${h.s}`);
});

const st = Phy.robustStats(arrows);
if (!st || st.excluded.length !== 1) note("error", "flyer should be excluded from robust stats");
if (st.my < 0) note("error", "stats Y should be math-up-positive for high group");

const db = {
  setups: [
    {
      id: "main",
      poundage: "38",
      arrowWeight: "334",
      arrowDia: "5.5",
      calibV70: "0.15",
      calibH70: "0.12",
    },
  ],
  sessions: [],
  sightMarks: [],
  settings: { eyeSight: 850 },
};
const sess = {
  id: "sim1",
  date: "2026-06-17",
  dist,
  faceD,
  setupId: "main",
  sightNow: { v: "12.0", h: "5.0" },
  sightStart: { v: "12.0", h: "5.0" },
  windDir: "左から",
  windSpeed: 2,
};

const adv = Phy.adviceForEnd(db, db.settings, db.setups[0], sess, arrows);
if (!adv || !adv.moves.length) note("error", "high-right group should suggest sight move");
else {
  const hasDown = adv.moves.some(m => m.dir === "下" || m.axis === "v");
  const hasLeft = adv.moves.some(m => m.dir === "左" || m.axis === "h");
  if (!hasDown) note("warn", `high group but no down move: ${JSON.stringify(adv.moves)}`);
  if (!hasLeft) note("warn", `right group but no left move: ${JSON.stringify(adv.moves)}`);
}

const j = Phy.judgementFor(adv, sess);
if (!j || !j.label) note("error", "judgement missing");

// SVG stack must render without throwing
const stack = Geo.targetSvg(
  faceD,
  "sim",
  Geo.GEO_MARKER_DEFS +
    '<g class="slot-layer">' +
    Geo.slotRingSvg(arrows, 6, faceD) +
    "</g>" +
    '<g class="geo-layer">' +
    Geo.geoSvg(st, faceD, adv.vector ? { h: adv.vector.h, v: adv.vector.v } : null) +
    "</g>"
);
if (!stack.includes("10") && !stack.includes("9")) note("warn", "slot ring may not show scores");

// Archery UX checks from constants
if (Geo.marginRadius(faceD) <= faceD / 2) note("error", "slot ring radius inside face — scores overlap rings");
const guide = Geo.recordGuideSvg(faceD, 0, 6);
if (guide && guide.includes("タップ")) {
  const vb = Geo.viewBoxFor(faceD);
  if (guide.indexOf(String(vb.M * 0.62)) < 0) note("warn", "guide Y may clip on small screens");
}

// 30m face
const face30 = Geo.faceDForDist(30);
if (face30 !== 80) note("error", "30m should use 80cm face per WA");

console.log("=== Archery use simulation ===");
console.log(`70m face ${faceD}cm | group center (${st.mx.toFixed(1)}, ${st.my.toFixed(1)}) R${st.rr.toFixed(1)}`);
console.log(`Advice: ${adv.moves.map(m => m.dir + m.cm.toFixed(1) + "cm").join(", ")} | ${j.label}`);
console.log(`Excluded: ${st.excluded.length} flyer(s)`);
if (issues.length) {
  console.log("\nIssues:");
  issues.forEach(i => console.log(`  [${i.sev}] ${i.msg}`));
  process.exit(issues.some(i => i.sev === "error") ? 1 : 0);
}
console.log("\nuse-sim OK");