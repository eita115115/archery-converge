const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const lines = fs.readFileSync(path.join(root, "app.js"), "utf8").split(/\r?\n/);

function slice(a, b) {
  return lines.slice(a - 1, b).join("\n");
}

const appVer = JSON.parse(fs.readFileSync(path.join(root, "version.json"), "utf8")).v;
const stateHead = `/* ConvergeApp — state, persistence, coach */
var Geo=window.ConvergeGeometry;
if(!Geo)throw new Error("ConvergeGeometry required");
var KEY="archeryConverge.v1", APP_VER=${appVer}, EXPORT_VERSION=1;
var COACH_CAP=2;
var CONVERGE_MILESTONES=[25,50,75];
var Cx=window.ConvergeCompat;
var Eng=window.ConvergeEngine;
var Beg=window.ConvergeBeginner;
if(!Eng)throw new Error("ConvergeEngine required");
`;

let state = stateHead + "\n" + slice(14, 129);
state = state.replace("const DISTS=[70,50,30,18];", "var DISTS=[70,50,30,18];");
state = state.replace("let db=load();", "var db=load();");
state = state.replace("const ui={", "var ui={");

fs.mkdirSync(path.join(root, "ui"), { recursive: true });
fs.mkdirSync(path.join(root, "screens"), { recursive: true });
fs.writeFileSync(path.join(root, "app-state.js"), state);

let helpers = "/* ConvergeApp — DOM, shell, shared UI builders */\n" + slice(117, 508) + "\n" + slice(550, 606);
helpers = helpers.replace(
  'function esc(s){return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;");}',
  'function esc(s){return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/\'/g,"&#39;");}'
);
fs.writeFileSync(path.join(root, "ui/helpers.js"), helpers);

const parseImport = `function parseImportPayload(raw){
  if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new Error("invalid");
  const arr=v=>Array.isArray(v)?v:[];
  const obj=v=>v&&typeof v==="object"&&!Array.isArray(v)?v:{};
  const sess=v=>arr(v).filter(s=>s&&typeof s==="object"&&!Array.isArray(s));
  return{
    schemaVersion:typeof raw.schemaVersion==="number"?raw.schemaVersion:1,
    setups:sess(raw.setups),
    sightMarks:arr(raw.sightMarks),
    sessions:sess(raw.sessions),
    active:raw.active&&typeof raw.active==="object"&&!Array.isArray(raw.active)?raw.active:null,
    settings:obj(raw.settings)
  };
}
`;

const storage =
  "/* ConvergeApp — backup / import */\n" +
  slice(509, 538) +
  "\n" +
  parseImport +
  "\n" +
  slice(753, 786);
fs.writeFileSync(path.join(root, "storage.js"), storage);

fs.writeFileSync(
  path.join(root, "screens/home.js"),
  "/* ConvergeApp — home, setup, done, gear */\n" +
    slice(628, 654) +
    "\n" +
    slice(655, 751) +
    "\n" +
    slice(788, 816) +
    "\n" +
    slice(1073, 1101) +
    "\n" +
    slice(1189, 1245)
);

fs.writeFileSync(path.join(root, "screens/record.js"), "/* ConvergeApp — record screen */\n" + slice(818, 1004));
fs.writeFileSync(path.join(root, "screens/return.js"), "/* ConvergeApp — return screen */\n" + slice(1019, 1071));
fs.writeFileSync(path.join(root, "screens/history.js"), "/* ConvergeApp — history */\n" + slice(1103, 1187));

const app = `/* ConvergeApp — router & bootstrap */
function nav(screen){ui.screen=screen;ui.histId=null;ui.adj=false;ui._coachBump={};ui._legendBump={};render();}

function render(){
  syncUpdBar(ui._updAvail);
  try{
    if(db.active&&ui.screen==="home")ui.screen=db.active.phase||"record";
    if(ui.screen==="home")return renderHome();
    if(ui.screen==="setup")return renderSetup();
    if(ui.screen==="record")return renderRecord();
    if(ui.screen==="return")return renderReturn();
    if(ui.screen==="done")return renderDone();
    if(ui.screen==="history")return ui.histId?renderHistDetail():renderHistory();
    if(ui.screen==="gear")return renderGear();
  }catch(e){
    console.error(e);
    shell(-1,"エラー",null,\`<div class="empty">表示エラー: \${esc(e.message)}<br><br>
      <button class="btn hero" id="errReset">練習データをリセット</button></div>\`,"");
    const er=$("#errReset");if(er)er.onclick=()=>{db.active=null;save();ui.screen="home";render();};
    afterRender();
  }
}

${slice(1005, 1017)}

if("serviceWorker"in navigator&&(location.protocol==="https:"||location.hostname==="localhost")){
  navigator.serviceWorker.register("sw.js").catch(()=>{});
}
function checkUp(){if(location.protocol==="file:")return;fetch("version.json?"+Date.now(),{cache:"no-store"}).then(r=>r.json()).then(j=>{ui._updAvail=!!(j&&j.v>APP_VER);syncUpdBar(ui._updAvail);}).catch(()=>{});}
$("#updBar").onclick=()=>location.reload();
document.addEventListener("visibilitychange",()=>{if(!document.hidden)checkUp();});
window.onerror=(msg,src,line)=>{toast("ERR:"+line);console.error(msg,src,line);};
function clearStaticLanding(){const el=$("#staticLanding");if(el)el.remove();}
window.ConvergeApp={init:function(){clearStaticLanding();if(Cx)Cx.init();blockZoom();checkUp();render();}};
`;
fs.writeFileSync(path.join(root, "app.js"), app);
console.log("split-app: ok");