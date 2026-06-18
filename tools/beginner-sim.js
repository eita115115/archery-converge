/**
 * Simulates a novice using the app across many sessions; fails if coaching text is missing.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");

function boot() {
  const ctx = {
    window: {},
    Math,
    Array,
    module: { exports: {} },
    globalThis: {},
    document: { documentElement: { style: { setProperty: () => {} } } },
    navigator: { hardwareConcurrency: 4, deviceMemory: 4 },
    matchMedia: () => ({ matches: false }),
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  ["geometry.js", "physics.js", "engine.js", "beginner.js"].forEach(f => {
    vm.runInNewContext(fs.readFileSync(path.join(root, f), "utf8"), ctx);
  });
  return ctx;
}

const ctx = boot();
const Geo = ctx.ConvergeGeometry;
const Phy = ctx.ArcheryPhysics || ctx.module.exports;
const Eng = ctx.ConvergeEngine;
const Beg = ctx.ConvergeBeginner;

const issues = [];
function fail(msg) {
  issues.push(msg);
}

if (!Eng || !Eng.metrics) fail("ConvergeEngine.metrics required for beginner verbalization");

const settings = { beginnerMode: true, eyeSight: 850 };

// --- Golden parity at faceD=122 (70 m) ---
(function () {
  const stCenter = { n: 6, mx: 0.1, my: 0.1, rr: 0.8 };
  if (Beg.groupDirection(stCenter, 122) !== "中心はだいたい真ん中") fail("golden center direction");
  const stSoft = { n: 6, mx: 0.5, my: 0.4, rr: 1.2 };
  if (Beg.groupDirection(stSoft, 122) !== "中心は少し上右") fail("golden soft direction: " + Beg.groupDirection(stSoft, 122));
  const stStrong = { n: 6, mx: 1.0, my: 0.8, rr: 1.5 };
  if (Beg.groupDirection(stStrong, 122) !== "中心は上右") fail("golden strong direction: " + Beg.groupDirection(stStrong, 122));
  if (!Beg.simpleGroup({ n: 6, mx: 0.2, my: 0.2, rr: 1.0 }, 122).includes("集ま")) fail("golden simpleGroup centered");
})();

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
  const pg = Beg.plainGroup(st, fd);
  if (!pg || pg.length < 4) fail("plainGroup empty for novice end");
  if (/R\d|mx|my/.test(pg)) fail("plainGroup contains jargon: " + pg);
  const sg = Beg.simpleGroup(st, fd);
  if (!sg || sg.length < 3) fail("simpleGroup empty for novice end");
  if (/R\d|mx|my|x|y/.test(sg)) fail("simpleGroup contains jargon: " + sg);
  const gd = Beg.groupDirection(st, fd);
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
  Beg.plainGroup(st, fd);
  Beg.groupDirection(st, fd);
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

// --- Scenario E: return meta verbalization ---
if (Beg.memoryChipLine(3, "u") !== "3回連続・上寄り") fail("memoryChipLine golden: " + Beg.memoryChipLine(3, "u"));
if (Beg.memoryChipLine(2, "c") != null) fail("memoryChipLine should hide center");
if (Beg.confidenceWords("high") !== "信頼度：高い") fail("confidenceWords high");
if (Beg.confidenceWords("mid") !== "信頼度：ふつう") fail("confidenceWords mid");
if (Beg.confidenceWords("low") !== "信頼度：まだ足りない") fail("confidenceWords low");
if (/conf|%|R\d/.test(Beg.confidenceWords("high"))) fail("confidenceWords contains jargon");

// --- Scenario F: X3 wind + milestones ---
if (!Beg.windRecordHint({ windy: true }).includes("風")) fail("windRecordHint empty");
if (!Beg.windRecordHint({ windy: true, lateralDominant: true }).includes("横風"))
  fail("windRecordHint lateral empty");
if (/m\/s|classify|windy/.test(Beg.windRecordHint({ windy: true }))) fail("windRecordHint jargon");
if (Beg.convergeMilestoneLine(25) !== "あなた用の目安が育ってきました") fail("milestone 25");
if (Beg.convergeMilestoneLine(50) !== "あなた用の目安がしっかり育ってきました") fail("milestone 50");
if (!Beg.coachCard("setup", { sessionCount: 5 }).includes("m/s")) fail("setup wind tip at 5 sessions");
if (Beg.coachCard("setup", { sessionCount: 2 }).includes("m/s")) fail("setup wind tip too early");

// --- Scenario G: history end summaries ---
(function () {
  const sessFixture = JSON.parse(
    fs.readFileSync(path.join(root, "tools/fixtures/session-six-ends.json"), "utf8")
  );
  const analysis = Eng.advice.analyzeSession(
    { setups: [{}], sessions: [], sightMarks: [], settings },
    settings,
    {},
    sessFixture.session
  );
  const row = analysis.ends[0];
  const head = Beg.histEndHead(row, 122, 1, 60);
  if (!head.includes("1回目") || !head.includes("中心")) fail("histEndHead golden: " + head);
  const body = Beg.histEndBody(row, 122);
  if (!body || body.length < 3) fail("histEndBody empty");
  if (/mx|my|R\d|conf/.test(body)) fail("histEndBody jargon: " + body);
  if (Beg.histSessionTrend(analysis.summary) !== "右寄りの傾向")
    fail("histSessionTrend: " + Beg.histSessionTrend(analysis.summary));
})();

// --- Scenario H: done streak + storage nudge ---
if (!Beg.sessionNudgeToast({ count: 150 }).includes("バックアップ")) fail("sessionNudgeToast empty");
if (!Beg.storageNudgeBarWarn({ count: 210 }).includes("210")) fail("storageNudgeBarWarn empty");
if (!Beg.storageNudgeBarSub().includes("書き出し")) fail("storageNudgeBarSub empty");

console.log("beginner-sim: " + (issues.length ? issues.length + " issues" : "OK"));
if (issues.length) {
  issues.slice(0, 12).forEach(i => console.log("  -", i));
  process.exit(1);
}