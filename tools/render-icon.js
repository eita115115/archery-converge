/**
 * Renders icon.svg → apple-touch-icon.png (180×180).
 * Requires: npm install --save-dev sharp
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const svgPath = path.join(root, "icon.svg");
const outPath = path.join(root, "apple-touch-icon.png");

let sharp;
try {
  sharp = require("sharp");
} catch (e) {
  console.error("render-icon: install sharp first — npm install --save-dev sharp");
  process.exit(1);
}

const svg = fs.readFileSync(svgPath);
sharp(svg, { density: 384 })
  .resize(180, 180)
  .png({ compressionLevel: 9, palette: false })
  .toFile(outPath)
  .then(info => {
    console.log("render-icon OK:", outPath, info.width + "x" + info.height, info.size + " bytes");
  })
  .catch(err => {
    console.error("render-icon FAIL:", err.message);
    process.exit(1);
  });