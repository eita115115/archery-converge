const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const compatSrc = fs.readFileSync(path.join(root, "compat.js"), "utf8");
const physicsSrc = fs.readFileSync(path.join(root, "physics.js"), "utf8");
const geometrySrc = fs.readFileSync(path.join(root, "geometry.js"), "utf8");
const beginnerSrc = fs.readFileSync(path.join(root, "beginner.js"), "utf8");
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
  new vm.Script(appSrc);
} catch (e) {
  fail("JavaScript syntax error: " + e.message);
}

const requiredHtml = [
  'src="compat.js"',
  'src="physics.js"',
  'src="geometry.js"',
  'src="beginner.js"',
  'src="app.js"',
  "ConvergeApp.init",
  "coach-card",
  "advice-card",
  "--geo-group",
  ".frame.fit",
  "tgt-stack",
  "geo-legend",
  "sq-fit",
  "touch-action:manipulation",
  "minimum-scale=1",
  "user-scalable=no",
];
requiredHtml.forEach(s => {
  if (!html.includes(s)) fail("missing in index.html: " + s);
});

const forbiddenHtml = ["class=\"slot-ring\"", "class='slot-ring'", ".slot-ring{"];
forbiddenHtml.forEach(s => {
  if (html.includes(s)) fail("deprecated layout still present: " + s);
});

const requiredApp = [
  "ConvergeGeometry required",
  "APP_VER=12",
  "--mark-cur",
  "ConvergeBeginner",
  "begOn",
  "adviceCardHtml",
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

const scriptOrder = ["compat.js", "physics.js", "geometry.js", "beginner.js", "app.js"];
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

const swAssets = ["index.html", "compat.js", "physics.js", "geometry.js", "beginner.js", "app.js"];
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

const calm = Phy.trajectoryModel({ dist: 70 }, { poundage: "38", arrowWeight: "334", arrowDia: "5.5" }, 850);
if (calm.engine !== "RK4-3D" || calm.tof < 0.6 || calm.tof > 1.5) fail("RK4 trajectory failed");

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

const Beg = loadModule(beginnerSrc).ConvergeBeginner;
if (!Beg || typeof Beg.plainGroup !== "function" || !Beg.coachCard("home")) fail("ConvergeBeginner export failed");

console.log("check-app OK");