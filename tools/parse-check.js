const fs = require("fs");
const vm = require("vm");
const path = require("path");

const root = path.join(__dirname, "..");
const appSrc = fs.readFileSync(path.join(root, "app.js"), "utf8");
const lines = appSrc.split("\n");

function checkSlice(start, end, label) {
  const chunk = lines.slice(start, end).join("\n");
  try {
    new vm.Script(chunk);
    console.log(`OK ${label} (${start}-${end})`);
    return true;
  } catch (e) {
    console.log(`FAIL ${label} (${start}-${end}): ${e.message}`);
    return false;
  }
}

const start = lines.findIndex(l => l.includes("function renderRecord"));
const end = lines.findIndex((l, i) => i > start && l.startsWith("function paintMarks"));
checkSlice(0, start, "before renderRecord");
checkSlice(start, end, "renderRecord");
checkSlice(end, lines.length, "after paintMarks");

try {
  new vm.Script(appSrc);
  console.log("FULL app.js: OK");
} catch (e) {
  console.log("FULL app.js: FAIL", e.message);
}