"use strict";
/**
 * Copy refs/source → assets/.cache/f/*.jpg (難読化ファイル名)
 * Run: node tools/build-faces.js
 */
const fs = require("fs");
const path = require("path");
const facePaths = require("./face-paths");

const root = path.join(__dirname, "..");
const refsDir = path.join(root, "refs", "source");
const legacyRefs = path.join(root, "refs", "oppai");
const outDir = path.join(root, facePaths.base);

const ORDER = [
  "1dd012fa-043b-413b-a65e-043a6eb10543.jpg",
  "268ff314-421d-44c5-a7ea-72ff8cf3b2c4.jpg",
  "b8694fe9-3be9-4147-9032-a7ef49a94bea.jpg",
  "910a446b-072a-4e26-848b-59296e656a52.jpg",
  "354e1f4e-09d0-4a55-884c-82f8f1dd888e.jpg",
  "800d8341-3621-46d4-92c5-81c164e9aa35.jpg",
  "4373987d-321b-4da3-a98e-0d665eac1b9f.jpg",
  "1ec5b3dd-8a1b-46c5-9be4-a791cb27b7e3.jpg",
  "7009d7dc-d84a-4da8-9951-ac7d35e71947.jpg",
];

const srcRoot = fs.existsSync(refsDir) ? refsDir : legacyRefs;
if (!fs.existsSync(srcRoot)) {
  console.error("build-faces FAIL: refs/source (or refs/oppai) missing");
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

ORDER.forEach((name, i) => {
  const src = path.join(srcRoot, name);
  const dest = path.join(outDir, facePaths.files[i]);
  if (!fs.existsSync(src)) {
    console.error("build-faces FAIL: missing " + name);
    process.exit(1);
  }
  fs.copyFileSync(src, dest);
  console.log(facePaths.base + facePaths.files[i] + " ← " + name);
});
console.log("build-faces OK (" + ORDER.length + " faces)");