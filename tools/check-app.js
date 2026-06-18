const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "style.css"), "utf8");
const surface = html + "\n" + css;
const compatSrc = fs.readFileSync(path.join(root, "compat.js"), "utf8");
const physicsSrc = fs.readFileSync(path.join(root, "physics.js"), "utf8");
const geometrySrc = fs.readFileSync(path.join(root, "geometry.js"), "utf8");
const beginnerSrc = fs.readFileSync(path.join(root, "beginner.js"), "utf8");
const engineSrc = fs.readFileSync(path.join(root, "engine.js"), "utf8");
const appSrc = fs.readFileSync(path.join(root, "app.js"), "utf8");

function fail(msg) {
  console.error("check-app FAIL:", msg);
  process.exit(1);
}

function loadModule(src, extra) {
  const ctx = Object.assign(
    {
      window: {},
      Math: Math,
      Array: Array,
      module: { exports: {} },
      globalThis: {},
      document: { documentElement: { style: { setProperty: () => {} } } },
    },
    extra || {}
  );
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.runInNewContext(src, ctx);
  return ctx;
}

try {
  new vm.Script(compatSrc);
  new vm.Script(physicsSrc);
  new vm.Script(geometrySrc);
  new vm.Script(beginnerSrc);
  new vm.Script(engineSrc);
  new vm.Script(appSrc);
} catch (e) {
  fail("JavaScript syntax error: " + e.message);
}

const requiredHtml = [
  'href="style.css"',
  'src="compat.js"',
  'src="geometry.js"',
  'src="physics.js"',
  'src="engine.js"',
  'src="beginner.js"',
  'src="app.js"',
  "ConvergeApp.init",
  "coach-card",
  "advice-card",
  "--geo-group",
  "--preview-fill",
  ".frame.fit",
  "tgt-stack",
  "geo-legend",
  "sq-fit",
  "touch-action:manipulation",
  "minimum-scale=1",
  "user-scalable=no",
  'meta name="description"',
  'property="og:description"',
  'property="og:title"',
  'property="og:site_name"',
  'name="twitter:image"',
  'application/ld+json',
  'id="updBar" hidden',
  "static-landing",
  "home-steps",
  "home-flow",
  "home-hero",
  ".btn.hero",
  "app-mode",
  "mark-pop",
  "trust-line",
  "btn.ghost.danger",
  ".face.celebration",
  "--ease-spring",
  "prefers-reduced-motion",
  "return-verdict",
  "zenkin-converge",
  "--sk-focus-color",
  "--sk-button-border-radius",
  "btn-secondary",
  "typography-subhead",
  "section-hero",
  "verdict-in",
];
const htmlOnly = new Set([
  'href="style.css"',
  'src="compat.js"',
  'src="geometry.js"',
  'src="physics.js"',
  'src="engine.js"',
  'src="beginner.js"',
  'src="app.js"',
  "ConvergeApp.init",
  'meta name="description"',
  'property="og:description"',
  'property="og:title"',
  'property="og:site_name"',
  'name="twitter:image"',
  'application/ld+json',
  'id="updBar" hidden',
  "static-landing",
]);
requiredHtml.forEach(s => {
  const src = htmlOnly.has(s) ? html : surface;
  if (!src.includes(s)) fail("missing in page: " + s);
});

const bannedPublic = ["oppai", "OPPAI", "endsOppai", "oppaiIdx", "pickOppai", "oppaiLabel", "oppaiImg", "oppaiVariant"];
const swSrc = fs.readFileSync(path.join(root, "sw.js"), "utf8");
[appSrc, geometrySrc, css, html, swSrc, beginnerSrc].forEach((src, i) => {
  const names = ["app.js", "geometry.js", "style.css", "index.html", "sw.js", "beginner.js"];
  bannedPublic.forEach(term => {
    if (src.includes(term)) fail("banned token in " + names[i] + ": " + term);
  });
});

const forbiddenHtml = ["class=\"slot-ring\"", "class='slot-ring'", ".slot-ring{"];
forbiddenHtml.forEach(s => {
  if (html.includes(s)) fail("deprecated layout still present: " + s);
});

const requiredApp = [
  "ConvergeGeometry required",
  "ConvergeEngine required",
  "analyzeEnd",
  "engineBump",
  "APP_VER=74",
  "returnVerdictHtml(st,adv,j,s.faceD)",
  "EXPORT_VERSION=1",
  "exportVersion",
  "backupPayload",
  "bkInHist",
  "bkOutHist",
  "schemaVersion",
  "storageNudge",
  "QuotaExceededError",
  "return-verdict",
  "return-verdict-eyebrow",
  "returnVerdictHtml",
  "returnMetaRowHtml",
  "return-meta",
  "return-memory-chip",
  "return-confidence",
  "memoryChipLine",
  "confidenceWords",
  "windRecordHint",
  "convergeMilestoneLine",
  "recordWindHintHtml",
  "record-wind-hint",
  "maybeConvergeMilestoneToast",
  "CONVERGE_MILESTONES",
  "histEndRowsHtml",
  "histSessionAnalysis",
  "hist-end-list",
  "hist-end-row",
  "histEndHead",
  "histSessionTrend",
  "groupDirection",
  "simpleSightAction",
  "ret-converge",
  "zenkin-dots",
  "flashZenkinConverge",
  "button-secondary",
  "tile-ctas",
  "tile-copy-wrapper",
  "typography-headline",
  "homeHeadlineHtml",
  "zenkin-converge",
  "ret-reveal",
  "page-in",
  "doneBackupPromptHtml",
  "hasExported",
  "startQuickSession",
  "backup-bar",
  "safety-banner",
  "safetyBannerHtml",
  "simpleGroup",
  "goQuick",
  "6本のあとに、次が見える。",
  "zenkinFaceIdx",
  "endsZenkinFaces",
  "pickZenkinFace",
  "exportBackup",
  "importBackup",
  "home-foot-nav",
  "advice-foot",
  "adviceDisclaimer",
  "sessCompareHint",
  "doneBadgeHintsHtml",
  "doneStreakHint",
  "maybeSessionNudgeToast",
  "sessionNudgeToast",
  "backup-bar-strong",
  "homeReadinessChipHtml",
  "home-readiness-chip",
  "gearCalibBarHtml",
  "gear-calib-bar",
  "tile-card",
  "done-tile",
  "gear-tile",
  "readinessLine",
  "gearCalibSummary",
  "gearMissingHints",
  "homeFlowHtml",
  "backLbl",
  "app-mode",
  "afterRecordArrow",
  "coachCardHtml",
  "geoLegendHtml",
  "shouldShowLegend",
  "legendKey",
  "shouldShowCoach",
  "COACH_CAP",
  "coachSeen",
  "trustLineHtml",
  "trustCtx",
  "trustLine",
  "safetyNote",
  "clearStaticLanding",
  "applyRecordZoom",
  "zoomChips",
  "isLineCut",
  "backToSetupFromRecord",
  "canSetupBack",
  "isZenkinEnd",
  "targetModeFor",
  "rec-progress",
  "reopenLastEnd",
  "undoFinishSession",
  "reopen-btn",
  "reopenRec",
  "reopenRet",
  "undoFin",
  "Geo.previewMark",
  "--mark-cur",
  "ConvergeBeginner",
  "begOn",

  "beginnerMode",
  "function renderRecord",
  "function renderReturn",
  "function renderSetup",
  "Geo.targetSvg",
  "Geo.hitAt",
  "Geo.GEO_MARKER_DEFS",
  "afterRender",
  "blockZoom",
];
requiredApp.forEach(s => {
  if (!appSrc.includes(s)) fail("missing in app.js: " + s);
});

if (/\?\.onclick\s*=/.test(appSrc)) fail("optional chaining assignment found");
if (appSrc.includes("function targetSvg(") || appSrc.includes("function hitAt("))
  fail("scoring must live in geometry.js only");
if (!geometrySrc.includes("function slotRadius") || !geometrySrc.includes("var(--geo-group)"))
  fail("geometry grouping/slot tokens missing");
if (!geometrySrc.includes("function previewMark"))
  fail("previewMark missing");
if (!geometrySrc.includes("arrowMarkRadius") || !geometrySrc.includes("archery-note markCircle"))
  fail("archery-note mark import missing");

const scriptOrder = ["compat.js", "geometry.js", "physics.js", "engine.js", "beginner.js", "app.js"];
let last = -1;
scriptOrder.forEach(f => {
  const i = html.indexOf('src="' + f + '"');
  if (i < 0) fail("script missing: " + f);
  if (i < last) fail("script load order wrong at " + f);
  last = i;
});

const version = JSON.parse(fs.readFileSync(path.join(root, "version.json"), "utf8")).v;
const appVer = +/APP_VER=(\d+)/.exec(appSrc)[1];
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const swVer = +/archery-converge-v(\d+)/.exec(sw)[1];
if (appVer !== version || swVer !== version) fail(`version mismatch app=${appVer} json=${version} sw=${swVer}`);

const swAssets = ["index.html", "style.css", "compat.js", "geometry.js", "physics.js", "engine.js", "beginner.js", "app.js"];
swAssets.forEach(a => {
  if (!sw.includes(a)) fail("sw.js missing cache asset: " + a);
});

const compatCtx = loadModule(compatSrc);
const Cx = compatCtx.ConvergeCompat;
if (!Cx || typeof Cx.svgClientToLocal !== "function") fail("ConvergeCompat export failed");
const pt = Cx.svgClientToLocal(
  {
    getScreenCTM: () => ({
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      e: 0,
      f: 0,
      inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    }),
    createSVGPoint: () => ({
      x: 0,
      y: 0,
      matrixTransform: m => ({ x: 10, y: 20 }),
    }),
  },
  10,
  20
);
if (!pt || pt.x !== 10 || pt.y !== -20) fail("svgClientToLocal failed");

const geoCtx = loadModule(geometrySrc);
const Geo = geoCtx.ConvergeGeometry;
if (!Geo) fail("ConvergeGeometry export failed");
const inv = Geo.runInvariants();
if (inv.length) fail("geometry invariants: " + inv.join(", "));

const phyCtx = loadModule(physicsSrc, { ArcheryPhysics: null });
const Phy = phyCtx.ArcheryPhysics || phyCtx.module.exports;
[40, 80, 122].forEach(fd => {
  if (Geo.ringW(fd) !== Phy.ringW(fd)) fail(`ringW mismatch at faceD=${fd}`);
});

const face70 = Geo.faceDForDist(70);
const face18 = Geo.faceDForDist(18);
if (face70 !== 122 || face18 !== 40) fail("faceDForDist mapping wrong");
const vbZ1 = Geo.viewBoxFor(122, 1);
const vbZ3 = Geo.viewBoxFor(122, 3);
if (vbZ3.M >= vbZ1.M - 1e-6) fail("record zoom must shrink viewBox");

const ten = Geo.scoreAt(0, 0, 122);
if (ten.s !== 10 || !ten.X) fail("center score must be X");

const arrows = [
  { x: 1, y: 1 },
  { x: 2, y: 1.5 },
  { x: 0, y: 0.5 },
  { x: 1.2, y: 1.7 },
  { x: 0.8, y: 0.9 },
  { x: 1.5, y: 1.1 },
  { x: 28, y: -20 },
];
const st = Phy.robustStats(arrows);
if (!st || st.excluded.length !== 1 || st.method !== "ellipse-biweight") fail("robustStats failed");

Phy.clearCaches();
const calm = Phy.trajectoryModel({ dist: 70 }, { poundage: "38", arrowWeight: "334", arrowDia: "5.5" }, 850);
if (calm.engine !== "RK4-3D" || calm.tof < 0.6 || calm.tof > 1.5) fail("RK4 trajectory failed");
const calm2 = Phy.trajectoryModel({ dist: 70 }, { poundage: "38", arrowWeight: "334", arrowDia: "5.5" }, 850);
if (calm2 !== calm) fail("trajectory cache miss");

const engCtx = loadModule(engineSrc, {
  ArcheryPhysics: Phy,
  ConvergeGeometry: Geo,
  navigator: { hardwareConcurrency: 4, deviceMemory: 4 },
  matchMedia: () => ({ matches: false }),
});
const Eng = engCtx.ConvergeEngine;
if (!Eng || typeof Eng.advice.analyzeEnd !== "function") fail("ConvergeEngine export failed");
if (!Eng.profile || !Eng.profile.tier) fail("ConvergeEngine deviceProfile missing");
if (!Eng.metrics || typeof Eng.metrics.offsetBands !== "function") fail("Eng.metrics missing");
const bands122 = Eng.metrics.offsetBands(122);
if (Math.abs(bands122.softDist - 0.35) > 0.001) fail("offsetBands(122).softDist != 0.35");
if (Math.abs(bands122.strongDist - 0.7) > 0.001) fail("offsetBands(122).strongDist != 0.7");
const bands40 = Eng.metrics.offsetBands(40);
if (bands40.softDist >= bands122.softDist || bands40.strongDist >= bands122.strongDist)
  fail("offsetBands must shrink on smaller faceD");
if (!Eng.metrics.isCentered(0.2, 0.2, 122)) fail("isCentered should pass inside soft band");
if (Eng.metrics.isCentered(0.5, 0.2, 122)) fail("isCentered should fail outside soft band");
if (Eng.metrics.confidenceBand(0.7) !== "high" || Eng.metrics.confidenceBand(0.5) !== "mid")
  fail("confidenceBand tiers wrong");
if (!Eng.wind || typeof Eng.wind.classify !== "function") fail("Eng.wind.classify missing");
if (Eng.runtimeVersion !== 2) fail("ConvergeEngine runtimeVersion should be 2");
if (!Eng.memory || typeof Eng.memory.convergeIndex !== "function") fail("Eng.memory missing");
const windySess = { dist: 70, faceD: 122, windDir: "左から", windSpeed: 4 };
const stLat = { n: 6, sx: 2.2, sy: 1, mx: 1.2, my: 0.4, rr: 1.8, confidence: 0.72 };
const wc = Eng.wind.classify(windySess, stLat);
if (!wc.windy || !wc.lateralDominant || wc.trustPenalty < 0.4) fail("wind.classify windy lateral");
if (appSrc.includes("Phy.") || /const Phy=/.test(appSrc))
  fail("app.js must route physics through ConvergeEngine only");
if (typeof Phy.configure !== "function" || typeof Phy.clearCaches !== "function") fail("physics configure/clearCaches missing");

const db = {
  setups: [{ id: "main", poundage: "38", arrowWeight: "334", arrowDia: "5.5" }],
  sessions: [],
  sightMarks: [],
  settings: { eyeSight: 850 },
};
const sess = { id: "t1", date: "2026-06-17", dist: 70, faceD: 122, setupId: "main", sightNow: { v: "12", h: "5" } };
const end = [
  { x: 2.1, y: 1.2, s: 9 },
  { x: 2.4, y: 1.0, s: 9 },
  { x: 1.9, y: 1.4, s: 10 },
  { x: 2.2, y: 0.9, s: 9 },
  { x: 2.0, y: 1.1, s: 10 },
  { x: 2.3, y: 1.3, s: 9 },
];
const adv = Phy.adviceForEnd(db, db.settings, db.setups[0], sess, end);
if (!adv || !adv.moves.length) fail("adviceForEnd failed");

const windySession = { id: "w1", date: "2026-06-18", dist: 70, faceD: 122, setupId: "main", windDir: "左から", windSpeed: 4 };
const stWindJudge = { n: 6, sx: 2.2, sy: 1, mx: 1.5, my: 0.8, rr: 1.8, confidence: 0.72 };
const mockWindAdv = {
  st: stWindJudge,
  needsMove: true,
  confidence: 0.65,
  personal: { state: "観察中" },
  model: { traj: Phy.trajectoryModel(windySession, db.setups[0], 850) },
};
if (!Eng.wind.suggestReconfirm(windySession, mockWindAdv)) fail("suggestReconfirm expected true");
const windyJ = Eng.advice.judgement(mockWindAdv, windySession);
if (!windyJ || windyJ.label !== "風考慮") fail("judgement 風考慮 expected for windy lateral end");

const memFixture = JSON.parse(fs.readFileSync(path.join(root, "tools/fixtures/converge-index.json"), "utf8"));
Phy.clearCaches();
const memIdx = Eng.memory.convergeIndex(memFixture.db, memFixture.setupId, memFixture.settings);
if (memIdx !== memFixture.expectedIndex) fail(`convergeIndex fixture: expected ${memFixture.expectedIndex} got ${memIdx}`);
const memHint = Eng.memory.readinessHint(memFixture.db, memFixture.setupId, memFixture.settings);
if (!memHint || memHint.tier !== memFixture.expectedTier || memHint.index !== memFixture.expectedIndex)
  fail("readinessHint fixture mismatch");
const streakEnd = [
  { x: 2.5, y: 1, s: 9 },
  { x: 2.6, y: 1.1, s: 9 },
  { x: 2.4, y: 0.9, s: 10 },
  { x: 2.55, y: 1, s: 9 },
  { x: 2.45, y: 1.05, s: 10 },
  { x: 2.5, y: 1, s: 9 },
];
const streakDb = {
  setups: db.setups,
  sessions: [
    { id: "st1", date: "2026-06-10", dist: 70, faceD: 122, setupId: "main", ends: [streakEnd] },
    { id: "st2", date: "2026-06-11", dist: 70, faceD: 122, setupId: "main", ends: [streakEnd] },
  ],
  sightMarks: [],
  settings: db.settings,
};
if (Eng.memory.sessionStreak(streakDb, "main", 70) < 2) fail("sessionStreak expected >= 2");
if (typeof Eng.memory.endDirectionKey !== "function") fail("endDirectionKey missing");
const streakSt = Eng.grouping.robust(streakEnd);
if (Eng.memory.endDirectionKey(streakSt, 122) !== "r") fail("endDirectionKey expected r");
const activeStreakDb = {
  setups: db.setups,
  sessions: [],
  sightMarks: [],
  settings: db.settings,
};
const activeSess = {
  setupId: "main",
  dist: 70,
  faceD: 122,
  ends: [streakEnd, streakEnd],
};
if (Eng.memory.sessionStreak(activeStreakDb, "main", 70, activeSess) < 2)
  fail("sessionStreak with active session expected >= 2");

if (typeof Eng.grouping.describe !== "function") fail("Eng.grouping.describe missing");
const desc = Eng.grouping.describe(st, 122);
if (!desc || !desc.center || desc.spread.rr == null || !desc.method) fail("grouping.describe shape invalid");

const sessFixture = JSON.parse(fs.readFileSync(path.join(root, "tools/fixtures/session-six-ends.json"), "utf8"));
Phy.clearCaches();
const sessAnalysis = Eng.advice.analyzeSession(db, db.settings, db.setups[0], sessFixture.session);
if (!sessAnalysis.ends || sessAnalysis.ends.length !== sessFixture.expectedEndCount)
  fail("analyzeSession end count mismatch");
if (!sessAnalysis.summary || sessAnalysis.summary.trend !== sessFixture.expectedTrend)
  fail("analyzeSession trend mismatch: " + (sessAnalysis.summary && sessAnalysis.summary.trend));
if (!sessAnalysis.ends[0].describe || sessAnalysis.ends[0].describe.center.mx == null)
  fail("analyzeSession missing per-end describe");

if (!Eng.storage || typeof Eng.storage.migrateDb !== "function") fail("Eng.storage missing");
const legacyV1 = JSON.parse(fs.readFileSync(path.join(root, "tools/fixtures/legacy-v1.json"), "utf8"));
const migrated = Eng.storage.migrateDb(Object.assign({ schemaVersion: 1 }, legacyV1));
if (migrated.schemaVersion !== 2) fail("migrateDb should bump schemaVersion to 2");
if (migrated.settings.calibrationDigest != null) fail("migrateDb should init calibrationDigest null");
const sparse = Eng.calibration.gear({ poundage: "36" });
if (!Array.isArray(sparse.missingFieldHints) || sparse.missingFieldHints.length < 4)
  fail("gearPrecisionProfile missingFieldHints");
const digest = Eng.calibration.buildDigest(db, db.settings);
if (!digest || digest.setupId !== "main" || digest.convergeIndex == null) fail("buildDigest failed");
Eng.storage.applyMeta(db, db.settings);
if (db.settings.calibrationDigest == null || db.settings.engineRuntimeSeen !== 2)
  fail("applyMeta should set digest and engineRuntimeSeen");
const nudge150 = Eng.storage.sessionNudge({ sessions: new Array(150) });
const nudge200 = Eng.storage.sessionNudge({ sessions: new Array(200) });
if (nudge150.level !== "soft" || nudge200.level !== "strong") fail("sessionNudge thresholds");
if (!appSrc.includes("QuotaExceededError")) fail("save() quota handler missing");
if (!appSrc.includes("parseImportPayload")) fail("parseImportPayload missing");
if (!appSrc.includes("Eng.storage.migrateDb")) fail("import should run migrateDb");
const legacyImport = Eng.storage.migrateDb(
  Object.assign(
    { schemaVersion: 1, setups: legacyV1.setups, sightMarks: legacyV1.sightMarks, sessions: legacyV1.sessions, active: null, settings: legacyV1.settings },
    { settings: Object.assign({ eyeSight: 850, beginnerMode: true }, legacyV1.settings) }
  )
);
if (legacyImport.schemaVersion !== 2 || !legacyImport.sessions.length) fail("legacy import migrate failed");

const stack = Geo.targetSvg(
  122,
  "chk",
  Geo.GEO_MARKER_DEFS +
    '<g class="slot-layer">' +
    Geo.slotRingSvg(end, 6, 122) +
    "</g>" +
    '<g class="geo-layer">' +
    Geo.geoSvg(st, 122, { h: 1, v: -0.5 }) +
    "</g>"
);
if (!stack.includes('id="chksvg"') || !stack.includes('id="chkmarks"')) fail("targetSvg structure broken");
if (!stack.includes("slot-layer") || !stack.includes("geo-layer")) fail("target overlays missing");

const zenEnd = end;
if (!Geo.isZenkinEnd(zenEnd, 6)) fail("zenkin end should pass");
if (Geo.isZenkinEnd(zenEnd.slice(0, 5), 6)) fail("incomplete end is not zenkin");
if (Geo.isZenkinEnd(zenEnd.map((a, i) => (i === 0 ? { s: 8 } : a)), 6)) fail("8 ring is not zenkin");
const dot10 = Geo.dot({ x: 2, y: 1, s: 10, X: true }, 122, "#0f766e", "10");
const r122 = 122 / 85;
if (!dot10.includes('opacity=".92"') || !dot10.includes('font-size="' + r122 * 1.2 + '"'))
  fail("archery-note mark sizing");
if (Geo.arrowMarkRadius(122) !== r122) fail("arrowMarkRadius parity");
const dotCut = Geo.dot({ x: 2, y: 1, s: 10, cut: true }, 122, "#0f766e", "10");
if (!dotCut.includes("mark-cut") || !dotCut.includes("stroke-dasharray")) fail("line-cut mark ring");
const dotSolid = Geo.dot({ x: 2, y: 1, s: 10, cut: false }, 122, "#0f766e", "10");
if (!dotSolid.includes("mark-solid") || dotSolid.includes("stroke-dasharray")) fail("solid mark");
if (typeof Geo.isLineCut !== "function") fail("isLineCut export");

const celebration = Geo.targetSvg(122, "chk", "", "celebration");
if (!celebration.includes('class="face celebration"') || !celebration.includes("zenkin/1.jpg"))
  fail("celebration target face missing");
Geo.ZENKIN_FACES.forEach((v) => {
  if (!fs.existsSync(path.join(root, v.file))) fail("zenkin face missing: " + v.file);
});
if (Geo.pickZenkinFace() < 0 || Geo.pickZenkinFace() >= Geo.ZENKIN_FACES.length) fail("pickZenkinFace range");

const Beg = loadModule(beginnerSrc).ConvergeBeginner;
if (!Beg || typeof Beg.plainGroup !== "function" || !Beg.coachCard("home")) fail("ConvergeBeginner export failed");
if (!Beg.zenkinExplain || !Beg.zenkinExplain().includes("金")) fail("zenkinExplain missing");
if (!Beg.adviceDisclaimer || !Beg.adviceDisclaimer().includes("判断補助")) fail("adviceDisclaimer missing");
if (!Beg.trustLine || !Beg.trustLine({ needsMove: true, qualityLabel: "低", conf: 40 }).includes("目安")) fail("trustLine missing");
if (!Beg.safetyNote || !Beg.safetyNote().includes("コーチ")) fail("safetyNote missing");
if (!Beg.memoryChipLine(3, "u") || !Beg.memoryChipLine(3, "u").includes("3回連続"))
  fail("memoryChipLine mismatch");
if (Beg.memoryChipLine(1, "u") != null) fail("memoryChipLine should hide streak 1");
if (Beg.confidenceWords("high") !== "信頼度：高い" || Beg.confidenceWords("low") !== "信頼度：まだ足りない")
  fail("confidenceWords mismatch");
if (!Beg.windRecordHint({ windy: true }) || !Beg.windRecordHint({ windy: true }).includes("風"))
  fail("windRecordHint missing");
if (!Beg.windRecordHint({ windy: true, lateralDominant: true }).includes("横風"))
  fail("windRecordHint lateral");
if (Beg.convergeMilestoneLine(25) !== "あなた用の目安が育ってきました") fail("convergeMilestoneLine 25");
if (Beg.convergeMilestoneLine(75) !== "あなた用の目安がかなり育ちました") fail("convergeMilestoneLine 75");
const setupCoach = Beg.coachCard("setup", { sessionCount: 6 });
if (!setupCoach.includes("m/s")) fail("setup coach advanced wind tip missing");
const histRow = sessAnalysis.ends[0];
if (!Beg.histEndHead(histRow, 122, 1, 60).includes("回目")) fail("histEndHead missing");
if (!Beg.histEndBody(histRow, 122)) fail("histEndBody empty");
if (Beg.histSessionTrend(sessAnalysis.summary) !== "右寄りの傾向") fail("histSessionTrend mismatch");
if (!Beg.histBestEndLine(3).includes("3回目")) fail("histBestEndLine missing");
if (!Beg.sessionNudgeToast({ count: 150 }).includes("150")) fail("sessionNudgeToast missing count");
if (!Beg.storageNudgeBarWarn({ count: 200 }).includes("200")) fail("storageNudgeBarWarn missing");
if (Beg.readinessLine(memHint) !== "あと3回で傾向が見えやすく") fail("readinessLine building mismatch");
if (!Beg.gearCalibSummary({ score: 0.6 }, { level: "高" }).includes("育っ")) fail("gearCalibSummary high");
if (!Beg.gearMissingHints(["poundage", "drawLength"]).includes("ポンド")) fail("gearMissingHints labels");

const skTokens = [
  "--sk-duration-fast",
  "--sk-duration-hero",
  "--sk-duration-zenkin",
  "--sk-tile-radius",
  "--sk-tone-ok",
  "var(--sk-duration-hero)",
  "var(--sk-duration-zenkin)",
];
skTokens.forEach(t => {
  if (!css.includes(t)) fail("missing sk token: " + t);
});
if (!css.includes(".tile-card") || !css.includes(".done-tile")) fail("tile-card styles missing");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
if (!manifest.id || manifest.theme_color !== "#0f766e") fail("manifest polish");
const iconSvg = fs.readFileSync(path.join(root, "icon.svg"), "utf8");
if (!iconSvg.includes('aria-label="Converge"') || iconSvg.includes("breast")) fail("icon.svg polish");

const ogDesc = /property="og:description" content="([^"]+)"/.exec(html);
if (!ogDesc || ogDesc[1].length < 36) fail("og:description too short");
if (!/準備|記録|確認/.test(ogDesc[1])) fail("og:description missing 3-step hint");
if (!html.includes("記録は消えません")) fail("updBar missing data-safety copy");

console.log("check-app OK");