const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const script = html.match(/<script src="physics\.js"><\/script>\s*<script>([\s\S]*)<\/script>/)[1];
const physicsSrc = fs.readFileSync(path.join(root, "physics.js"), "utf8");

function fail(msg) {
  console.error("check-app FAIL:", msg);
  process.exit(1);
}

try {
  new vm.Script(physicsSrc);
  new vm.Script(script);
} catch (e) {
  fail("JavaScript syntax error: " + e.message);
}

const required = [
  "function renderHome",
  "function renderSetup",
  "function renderRecord",
  "function renderReturn",
  "射線に戻った",
  "練習を始める",
  "APP_VER=5",
  "normalizeActive",
  "ArcheryPhysics",
  "endAdvice",
  "windCompass",
  "physBadgeHtml",
];
required.forEach(s => { if (!html.includes(s)) fail("missing: " + s); });

if (/\?\.onclick\s*=/.test(script)) fail("optional chaining assignment found");

if (!fs.existsSync(path.join(root, "physics.js"))) fail("physics.js missing");

const version = JSON.parse(fs.readFileSync(path.join(root, "version.json"), "utf8")).v;
const appVer = +/APP_VER=(\d+)/.exec(html)[1];
const swVer = +/archery-converge-v(\d+)/.exec(fs.readFileSync(path.join(root, "sw.js"), "utf8"))[1];
if (appVer !== version || swVer !== version) fail(`version mismatch app=${appVer} json=${version} sw=${swVer}`);

const Phy = (function() {
  const ctx = { module: { exports: {} }, globalThis: {} };
  vm.runInNewContext(physicsSrc, ctx);
  return ctx.ArcheryPhysics || ctx.module.exports;
})();

const arrows = [
  {x:1,y:1},{x:2,y:1.5},{x:0,y:.5},{x:1.2,y:1.7},{x:.8,y:.9},{x:1.5,y:1.1},
  {x:28,y:-20}
];
const st = Phy.robustStats(arrows);
if (!st || st.excluded.length !== 1 || st.method !== "ellipse-biweight") fail("robustStats failed");

const phys = Phy.physicsProfile({
  poundage: "38", drawLength: "28.5", arrowWeight: "334", arrowDia: "5.5",
  vane: "Spin Wing", temperature: "30", altitude: "500", humidity: "70"
});
if (phys.speedFps < 150 || phys.speedFps > 260) fail("physics speed out of range");

const calm = Phy.trajectoryModel({ dist: 70 }, {
  poundage: "38", drawLength: "28.5", arrowWeight: "334", arrowDia: "5.5", temperature: "30"
}, 850);
const wind = Phy.trajectoryModel({ dist: 70, windDir: "左から", windSpeed: "4" }, {
  poundage: "38", arrowWeight: "334", arrowDia: "5.5"
}, 850);
if (calm.engine !== "RK4-3D" || calm.tof < 0.6 || calm.tof > 1.5) fail("RK4 trajectory failed");
if (!(wind.windDriftCm > 0)) fail("wind drift failed");

const db = {
  setups: [{ id: "main", poundage: "38", arrowWeight: "334", arrowDia: "5.5" }],
  sessions: [], sightMarks: [], settings: { eyeSight: 850 }
};
const sess = { id: "t1", date: "2026-06-17", dist: 70, faceD: 122, setupId: "main", sightNow: { v: "12", h: "5" } };
const end = [
  {x:2.1,y:1.2,s:9},{x:2.4,y:1.0,s:9},{x:1.9,y:1.4,s:10},
  {x:2.2,y:0.9,s:9},{x:2.0,y:1.1,s:10},{x:2.3,y:1.3,s:9}
];
const adv = Phy.adviceForEnd(db, db.settings, db.setups[0], sess, end);
if (!adv || !adv.moves.length || adv.confidence < 0.3) fail("adviceForEnd failed");
const j = Phy.judgementFor(adv, sess);
if (!j || !j.label) fail("judgementFor failed");

console.log("check-app OK");