const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];

function fail(msg) {
  console.error("check-app FAIL:", msg);
  process.exit(1);
}

try {
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
  "APP_VER=4",
  "normalizeActive",
];
required.forEach(s => { if (!html.includes(s)) fail("missing: " + s); });

if (/\?\.onclick\s*=/.test(script)) fail("optional chaining assignment found");

console.log("check-app OK");