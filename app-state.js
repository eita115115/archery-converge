/* ConvergeApp — state, persistence, coach */
var Geo=window.ConvergeGeometry;
if(!Geo)throw new Error("ConvergeGeometry required");
var KEY="archeryConverge.v1", APP_VER=83, EXPORT_VERSION=1;
var COACH_CAP=2;
var CONVERGE_MILESTONES=[25,50,75];
var Cx=window.ConvergeCompat;
var Eng=window.ConvergeEngine;
var Beg=window.ConvergeBeginner;
if(!Eng)throw new Error("ConvergeEngine required");

function begOn(){return Beg&&Beg.isOn(db.settings);}
function coachSeenMap(){
  if(!db.settings.coachSeen||typeof db.settings.coachSeen!=="object")db.settings.coachSeen={};
  return db.settings.coachSeen;
}
function coachKey(phase,ctx){
  ctx=ctx||{};
  if(phase==="record"&&ctx.zenkin)return "record-zenkin";
  if(phase==="return"&&ctx.zenkin)return "return-zenkin";
  return phase;
}
function shouldShowCoach(phase,ctx){
  if(!begOn()||!Beg)return false;
  ctx=ctx||{};
  if(phase==="record"&&!ctx.zenkin&&ctx.n>0)return false;
  return (coachSeenMap()[coachKey(phase,ctx)]||0)<COACH_CAP;
}
function bumpCoachSeen(phase,ctx){
  const key=coachKey(phase,ctx);
  const m=coachSeenMap();
  m[key]=(m[key]||0)+1;
  save();
}
function coachCardHtml(phase,ctx){
  ctx=ctx||{};
  if(!shouldShowCoach(phase,ctx))return "";
  const html=Beg.coachCard(phase,ctx);
  if(!html)return "";
  const key=coachKey(phase,ctx);
  if(!ui._coachBump)ui._coachBump={};
  if(!ui._coachBump[key]){ui._coachBump[key]=true;bumpCoachSeen(phase,ctx);}
  return html;
}
function legendKey(kind){return "legend-"+kind;}
function shouldShowLegend(kind){return (coachSeenMap()[legendKey(kind)]||0)<COACH_CAP;}
function bumpLegendSeen(kind){
  const key=legendKey(kind);
  const m=coachSeenMap();
  m[key]=(m[key]||0)+1;
  save();
}
function geoLegendHtml(kind,extra){
  if(!shouldShowLegend(kind))return "";
  const html=geoLegend(kind,extra);
  if(!html)return "";
  const key=legendKey(kind);
  if(!ui._legendBump)ui._legendBump={};
  if(!ui._legendBump[key]){ui._legendBump[key]=true;bumpLegendSeen(kind);}
  return html;
}
var DISTS=[70,50,30,18];
var MISS_REASON_TAGS=[
  {id:"good",label:"良射"},
  {id:"push",label:"押し手"},
  {id:"release",label:"リリース"},
  {id:"clicker",label:"クリッカー"},
  {id:"wind",label:"風"},
  {id:"aim",label:"狙いミス"},
  {id:"unknown",label:"不明"},
  {id:"arrow",label:"矢が怪しい"}
];
var db=load();
var ui={screen:"home",histId:null,adj:false,_dist:70,zoom:1};

function zenkinFxOn(){return db.settings.zenkinFx===true;}
function blankDb(){return{schemaVersion:1,setups:[],sightMarks:[],sessions:[],active:null,settings:{eyeSight:850,beginnerMode:true,zenkinFx:false}};}
function normalizeActive(a){
  if(!a)return null;
  if(!Array.isArray(a.ends))a.ends=[];
  if(!Array.isArray(a.cur))a.cur=[];
  if(!a.sightStart)a.sightStart={v:"",h:""};
  if(!a.sightNow)a.sightNow={...a.sightStart};
  if(!Array.isArray(a.adjLog))a.adjLog=[];
  if(!Array.isArray(a.endsZenkinFaces))a.endsZenkinFaces=[];
  if(!Array.isArray(a.endTags))a.endTags=[];
  if(!a.perEnd)a.perEnd=6;
  if(!a.phase)a.phase="record";
  while(a.endsZenkinFaces.length>a.ends.length)a.endsZenkinFaces.pop();
  while(a.endsZenkinFaces.length<a.ends.length)a.endsZenkinFaces.push(null);
  while(a.endTags.length>a.ends.length)a.endTags.pop();
  while(a.endTags.length<a.ends.length)a.endTags.push([]);
  return a;
}
function zenkinFaceIdx(s,arrows,pe){
  if(!Geo.isZenkinEnd(arrows,pe))return null;
  if(s.zenkinFaceIdx==null)s.zenkinFaceIdx=Geo.pickZenkinFace();
  return s.zenkinFaceIdx;
}
function load(){
  try{
    const d=JSON.parse(localStorage.getItem(KEY));
    if(d){
      let out=Object.assign(blankDb(),d);
      out.settings=Object.assign({eyeSight:850,beginnerMode:true},out.settings||{});
      if(out.settings.beginnerMode===undefined)out.settings.beginnerMode=true;
      out.active=normalizeActive(out.active);
      (out.sessions||[]).forEach(s=>{if(!Array.isArray(s.ends))s.ends=[];});
      if(Eng&&Eng.storage&&Eng.storage.migrateDb)out=Eng.storage.migrateDb(out);
      return out;
    }
  }catch(e){}
  let fresh=blankDb();
  if(Eng&&Eng.storage&&Eng.storage.migrateDb)fresh=Eng.storage.migrateDb(fresh);
  return fresh;
}
function save(){
  try{
    if(Eng&&Eng.storage&&Eng.storage.applyMeta)Eng.storage.applyMeta(db,db.settings);
    localStorage.setItem(KEY,JSON.stringify(db));
  }catch(e){
    const quota=e&&(e.name==="QuotaExceededError"||e.code===22);
    if(quota){
      toast(begOn()?"保存できません。バックアップを取ってください":"Storage full — export backup");
      if(db.settings)db.settings.storageNudge=true;
    }else throw e;
  }
}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function $(s,r){return (r||document).querySelector(s);}
function esc(s){return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;");}
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove("show"),1800);}
function today(){return new Date().toISOString().slice(0,10);}
function fmtD(d){const x=new Date(d+"T12:00:00");return `${x.getMonth()+1}/${x.getDate()}`;}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

function stats(ar){return Eng.grouping.robust(ar);}
function getSetup(){return db.setups[0]||{};}
function sessForPhy(s){return{id:s.id,date:s.date,dist:s.dist,faceD:s.faceD,setupId:s.setupId,windDir:s.windDir,windSpeed:s.windSpeed,sightNow:s.sightNow,sightStart:s.sightStart};}
function endAdvice(s,arrows){return Eng.advice.forEnd(db,db.settings,getSetup(),sessForPhy(s),arrows);}
function engineBump(){if(Eng&&Eng.clearCaches)Eng.clearCaches();}