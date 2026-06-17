const fs = require("fs");
const vm = require("vm");
const lines = fs.readFileSync(require("path").join(__dirname, "..", "index.html"), "utf8")
  .match(/<script>([\s\S]*)<\/script>/)[1].split("\n");

const start = lines.findIndex(l => l.includes("function renderDone"));
const end = lines.findIndex((l, i) => i > start && l.includes("function renderHistory"));
const chunk = lines.slice(start, end).join("\n");
console.log("renderDone lines", start + 1, end);
try {
  new vm.Script(chunk);
  console.log("renderDone alone: OK");
} catch (e) {
  console.log("renderDone alone: FAIL", e.message);
}

const prefix = lines.slice(0, start).join("\n");
try {
  new vm.Script(prefix + "\n" + chunk);
  console.log("prefix+renderDone: OK");
} catch (e) {
  console.log("prefix+renderDone: FAIL", e.message);
}

// Test simplified renderDone innerHTML
const test = `
function esc(s){return String(s??"");}
function sessTot(){return 0;}
function setTop(){}
const s={ends:[1],dist:70,sightStart:{v:1,h:2},sightNow:{v:3,h:4},adjLog:[1]};
const $ = () => ({ innerHTML: "", className: "", onclick: null });
$("#main").innerHTML=s?\`
  <div>\${(s.adjLog||[]).length?\`<div>調整 \${s.adjLog.length} 回</div>\`:""}</div>
  <button>home</button>\`:\`<div>—</div>\`;
`;
try {
  new vm.Script(test);
  console.log("simplified template: OK");
} catch (e) {
  console.log("simplified template: FAIL", e.message);
}