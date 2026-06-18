/**
 * Keep version.json, app-state.js (APP_VER), and sw.js (CACHE) in sync.
 *
 *   npm run version:sync   — write APP_VER + CACHE from version.json
 *   npm run version:check  — fail if any of the three drift
 *   npm run version:bump   — increment version.json then sync
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const versionPath = path.join(root, "version.json");
const appStatePath = path.join(root, "app-state.js");
const swPath = path.join(root, "sw.js");

function readVersion() {
  const raw = JSON.parse(fs.readFileSync(versionPath, "utf8"));
  const v = raw && raw.v;
  if (!Number.isInteger(v) || v < 1) {
    throw new Error("version.json must contain { \"v\": <positive integer> }");
  }
  return v;
}

function writeVersion(v) {
  fs.writeFileSync(versionPath, JSON.stringify({ v }, null, 2) + "\n");
}

function syncAppState(v) {
  const src = fs.readFileSync(appStatePath, "utf8");
  const next = src.replace(/APP_VER=\d+/, `APP_VER=${v}`);
  if (next === src) throw new Error("app-state.js: APP_VER= pattern not found");
  fs.writeFileSync(appStatePath, next);
}

function syncSw(v) {
  const src = fs.readFileSync(swPath, "utf8");
  const next = src.replace(/archery-converge-v\d+/, `archery-converge-v${v}`);
  if (next === src) throw new Error("sw.js: archery-converge-v pattern not found");
  fs.writeFileSync(swPath, next);
}

function versions() {
  const json = readVersion();
  const appState = fs.readFileSync(appStatePath, "utf8");
  const sw = fs.readFileSync(swPath, "utf8");
  const appMatch = /APP_VER=(\d+)/.exec(appState);
  const swMatch = /archery-converge-v(\d+)/.exec(sw);
  return {
    json,
    app: appMatch ? +appMatch[1] : null,
    sw: swMatch ? +swMatch[1] : null,
  };
}

function check() {
  const v = versions();
  if (v.app == null) throw new Error("app-state.js: APP_VER missing");
  if (v.sw == null) throw new Error("sw.js: CACHE version missing");
  if (v.json !== v.app || v.json !== v.sw) {
    console.error(`sync-version FAIL: drift json=v${v.json} app-state=v${v.app} sw=v${v.sw}`);
    console.error("Fix: npm run version:sync");
    process.exit(1);
  }
  console.log(`version:check OK (v${v.json})`);
}

function sync() {
  const v = readVersion();
  syncAppState(v);
  syncSw(v);
  console.log(`version:sync OK (v${v})`);
}

function bump() {
  const v = readVersion() + 1;
  writeVersion(v);
  syncAppState(v);
  syncSw(v);
  console.log(`version:bump OK (v${v})`);
}

const arg = process.argv[2];
if (arg === "--check") check();
else if (arg === "--bump") bump();
else if (arg === undefined) sync();
else {
  console.error("Usage: node tools/sync-version.js [--check|--bump]");
  process.exit(1);
}