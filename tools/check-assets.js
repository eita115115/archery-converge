/**
 * Celebration face assets + lazy-load contract (no SW preload of JPGs).
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const faces = require("./face-paths.js");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");

function fail(msg) {
  console.error("check-assets FAIL:", msg);
  process.exit(1);
}

let total = 0;
faces.files.forEach((name) => {
  const p = path.join(root, faces.base, name);
  if (!fs.existsSync(p)) fail("missing face: " + faces.base + name);
  const kb = fs.statSync(p).size / 1024;
  total += kb;
  if (kb < 50 || kb > 900) fail("unexpected face size " + name + ": " + kb.toFixed(1) + " KB");
});

faces.files.forEach((name) => {
  if (sw.includes(name)) fail("sw.js must not preload celebration JPG: " + name);
});

const helpers = fs.readFileSync(path.join(root, "ui", "helpers.js"), "utf8");
if (!helpers.includes("prefetchCelebrationFace") || !helpers.includes("warmupCelebrationFaces"))
  fail("helpers.js missing celebration prefetch");

console.log(
  "check-assets OK (" +
    faces.files.length +
    " faces, " +
    (total / 1024).toFixed(2) +
    " MB total, lazy SW)"
);