/**
 * Simulates a novice using the app across many sessions; fails if coaching text is missing.
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

const Geo = load("geometry.js").ConvergeGeometry;
const Phy = load("physics.js").ArcheryPhysics || load("physics.js").module.exports;
const Beg = load("beginner.js").ConvergeBeginner;

const issues = [];
function fail(msg) {
  issues.push(msg);
}

const settings = { beginnerMode: true, eyeSight: 850 };

// --- Scenario A: complete novice, first end, scattered shots ---
(function () {
  const fd = Geo.faceDForDist(30);
  const taps = [
    [0, 0],
    [2, 3],
    [-1, 2],
    [1, -2],
    [3, 1],
    [-2, -1],
  ];
  const arrows = taps.map(([x, y]) => {
    const h = Geo.hitAt(x, y, fd);
    return { x: h.x, y: h.y, s: h.s, X: h.X };
  });
  const st = Phy.robustStats(arrows);
  const pg = Beg.plainGroup(st);
  if (!pg || pg.length < 4) fail("plainGroup empty for novice end");
  if (/R\d|mx|my/.test(pg)) fail("plainGroup contains jargon: " + pg);
  const sg = Beg.simpleGroup(st);
  if (!sg || sg.length < 3) fail("simpleGroup empty for novice end");
  if (/R\d|mx|my|x|y/.test(sg)) fail("simpleGroup contains jargon: " + sg);
  const gd = Beg.groupDirection(st);
  if (!gd || gd.length < 3) fail("groupDirection empty for novice end");
  if (/R\d|mx|my|x|y/.test(gd)) fail("groupDirection contains jargon: " + gd);
  if (!gd.includes("中心")) fail("groupDirection should mention 中心: " + gd);

  const db = { setups: [{}], sessions: [], sightMarks: [], settings };
  const sess = { dist: 30, faceD: fd, setupId: null, sightNow: { v: "", h: "" } };
  const adv = Phy.adviceForEnd(db, settings, {}, sess, arrows);
  const moves = Beg.plainMoves(adv);
  if (!moves.length) fail("plainMoves empty");
  moves.forEach(m => {
    if (!m.includes("サイト")) fail("plainMoves should mention サイト: " + m);
    if (/TH|vector|ellipse/.test(m)) fail("jargon in plainMoves: " + m);
  });

  const j = Phy.judgementFor(adv, sess);
  const sa = Beg.simpleSightAction(adv, j);
  if (!sa || sa.length < 4) fail("simpleSightAction empty");
  if (/cm|TH|vector/.test(sa)) fail("jargon in simpleSightAction: " + sa);
  const pj = Beg.plainJudgement(j);
  if (!pj || !pj.title) fail("plainJudgement missing");
})();

// --- Scenario B: many random ends (stress) ---
for (let run = 0; run < 96; run++) {
  const dist = [18, 30, 50, 70][run % 4];
  const fd = Geo.faceDForDist(dist);
  const arrows = [];
  for (let i = 0; i < 6; i++) {
    const x = (Math.random() - 0.5) * fd * 0.12;
    const y = (Math.random() - 0.5) * fd * 0.12;
    const h = Geo.hitAt(x, y, fd);
    arrows.push({ x: h.x, y: h.y, s: h.s, X: h.X });
  }
  const st = Phy.robustStats(arrows);
  Beg.plainGroup(st);
  const adv = Phy.adviceForEnd(
    { setups: [{}], sessions: [], sightMarks: [], settings },
    settings,
    {},
    { dist, faceD: fd },
    arrows
  );
  if (adv) {
    Beg.plainMoves(adv).forEach(m => {
      if (m.length < 8) fail("plain move too short run " + run);
    });
    Beg.plainJudgement(Phy.judgementFor(adv, { dist, faceD: fd }));
  }
  const toast = Beg.firstArrowToast(1, 6, 10);
  if (!toast || !toast.includes("あと")) fail("first arrow toast missing");
}

// --- Scenario C: coach cards render HTML ---
["home", "setup", "record", "return"].forEach(ph => {
  const html = Beg.coachCard(ph, { n: 2, pe: 6, plainGroup: "中心より上" });
  if (!html.includes("coach-card")) fail("coachCard html broken: " + ph);
  if (html.includes("<script")) fail("xss in coach");
});

// --- Scenario D: labels ---
if (Beg.endLabel(1) !== "1回目（6本ずつ）") fail("endLabel wrong");
if (!Beg.arrowProgress(3, 6).includes("3本目")) fail("arrowProgress wrong");

console.log("beginner-sim: " + (issues.length ? issues.length + " issues" : "OK"));
if (issues.length) {
  issues.slice(0, 12).forEach(i => console.log("  -", i));
  process.exit(1);
}