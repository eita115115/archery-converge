const fs = require("fs");
const vm = require("vm");
const html = fs.readFileSync(require("path").join(__dirname, "..", "index.html"), "utf8");
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
const lines = script.split("\n");

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

// Find renderRecord bounds
const start = lines.findIndex(l => l.includes("function renderRecord"));
const end = lines.findIndex((l, i) => i > start && l.startsWith("function paintMarks"));
checkSlice(0, start, "before renderRecord");
checkSlice(start, end, "renderRecord");
checkSlice(end, lines.length, "after paintMarks");

try {
  new vm.Script(script);
  console.log("FULL: OK");
} catch (e) {
  console.log("FULL: FAIL", e.message);
}