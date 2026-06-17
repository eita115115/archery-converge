/* ConvergeApp — screens, state, interaction. Geometry/scoring lives in geometry.js. */
"use strict";
const Geo=window.ConvergeGeometry;
if(!Geo)throw new Error("ConvergeGeometry required");

const KEY="archeryConverge.v1", APP_VER=29;
const Cx=window.ConvergeCompat;
const Phy=window.ArcheryPhysics;
const Beg=window.ConvergeBeginner;
const PHASES=["準備","記録","確認"];
function begOn(){return Beg&&Beg.isOn(db.settings);}
const DISTS=[70,50,30,18];
let db=load();
const ui={screen:"home",histId:null,adj:false,_dist:70,zoom:1};

function blankDb(){return{setups:[],sightMarks:[],sessions:[],active:null,settings:{eyeSight:850,beginnerMode:true}};}
function normalizeActive(a){
  if(!a)return null;
  if(!Array.isArray(a.ends))a.ends=[];
  if(!Array.isArray(a.cur))a.cur=[];
  if(!a.sightStart)a.sightStart={v:"",h:""};
  if(!a.sightNow)a.sightNow={...a.sightStart};
  if(!Array.isArray(a.adjLog))a.adjLog=[];
  if(!a.perEnd)a.perEnd=6;
  if(!a.phase)a.phase="record";
  return a;
}
function load(){
  try{
    const d=JSON.parse(localStorage.getItem(KEY));
    if(d){
      const out=Object.assign(blankDb(),d);
      out.settings=Object.assign({eyeSight:850,beginnerMode:true},out.settings||{});
      if(out.settings.beginnerMode===undefined)out.settings.beginnerMode=true;
      out.active=normalizeActive(out.active);
      (out.sessions||[]).forEach(s=>{if(!Array.isArray(s.ends))s.ends=[];});
      return out;
    }
  }catch(e){}
  return blankDb();
}
function save(){localStorage.setItem(KEY,JSON.stringify(db));}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function $(s,r){return (r||document).querySelector(s);}
function esc(s){return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;");}
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove("show"),1800);}
function today(){return new Date().toISOString().slice(0,10);}
function fmtD(d){const x=new Date(d+"T12:00:00");return `${x.getMonth()+1}/${x.getDate()}`;}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

function stats(ar){return Phy.robustStats(ar);}
function getSetup(){return db.setups[0]||{};}
function sessForPhy(s){return{id:s.id,date:s.date,dist:s.dist,faceD:s.faceD,setupId:s.setupId,windDir:s.windDir,windSpeed:s.windSpeed,sightNow:s.sightNow,sightStart:s.sightStart};}
function endAdvice(s,arrows){return Phy.adviceForEnd(db,db.settings,getSetup(),sessForPhy(s),arrows);}
function sugFromAdv(adv,j){
  if(!adv||!adv.vector)return null;
  const sc=j&&j.scale!=null?j.scale:1;
  return{h:adv.vector.h*sc,v:adv.vector.v*sc,mmH:adv.vector.mmH*sc,mmV:adv.vector.mmV*sc};
}
function mono(v,ax){const a=Math.abs(v).toFixed(1);return ax==="x"?(v>0?`+${a}`:v<0?`-${a}`:"0"):(v>0?`↑${a}`:v<0?`↓${a}`:"—");}


const WIND_DIRS=[{id:"",lbl:"無風",a:0},{id:"向かい風",lbl:"向かい",a:-90},{id:"追い風",lbl:"追い",a:90},{id:"左から",lbl:"左",a:180},{id:"右から",lbl:"右",a:0}];
const WIND_SPD=[0,2,4,6];
function windCompass(dir,spd){
  const cx=50,cy=50,R=38;
  let btns="";
  [{id:"向かい風",a:0},{id:"追い風",a:180},{id:"左から",a:270},{id:"右から",a:90}].forEach(w=>{
    const rad=w.a*Math.PI/180,x=cx+R*Math.sin(rad),y=cy-R*Math.cos(rad);
    const on=dir===w.id;
    btns+=`<circle class="wbtn${on?" on":""}" data-wd="${w.id}" cx="${x}" cy="${y}" r="11"/>`;
    btns+=`<text class="wlbl${on?" on":""}" x="${x}" y="${y+3}">${w.id==="向かい風"?"向":w.id==="追い風"?"追":w.id==="左から"?"左":"右"}</text>`;
  });
  btns+=`<circle class="wbtn${!dir?" on":""}" data-wd="" cx="${cx}" cy="${cy}" r="9" opacity="${dir?"":".9"}"/>`;
  btns+=`<text class="wlbl${!dir?" on":""}" x="${cx}" y="${cy+3}">無</text>`;
  const spdBtns=WIND_SPD.map(v=>`<button type="button" class="ws${v===spd?" on":""}" data-ws="${v}">${v||"—"}</button>`).join("");
  return `<div class="wind-compass"><svg viewBox="0 0 100 100">
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="var(--line)" stroke-width="1"/>
    <line x1="${cx}" y1="${cy-R}" x2="${cx}" y2="${cy+R}" stroke="var(--line)" stroke-width=".5" opacity=".5"/>
    <line x1="${cx-R}" y1="${cy}" x2="${cx+R}" y2="${cy}" stroke="var(--line)" stroke-width=".5" opacity=".5"/>
    ${btns}</svg></div>
    <div class="wind-spd">${spdBtns}<span style="font-size:11px;color:var(--dim);align-self:center">m/s</span></div>`;
}

function phaseArc(cur){
  const w=360;
  const segs=PHASES.map((p,i)=>{
    const x1=20+i*(w-40)/3,x2=20+(i+1)*(w-40)/3,mid=(x1+x2)/2;
    const on=i<=cur,active=i===cur;
    return `<path class="seg${on?" on":""}${active?" cur":""}" d="M${x1+8} 22 A 40 40 0 0 1 ${x2-8} 22"/>
      <text class="lbl${active?" on":""}" x="${mid}" y="14" text-anchor="middle">${p}</text>`;
  }).join("");
  const sub=begOn()&&Beg?`<div class="phase-sub"><span class="on">${esc(Beg.phaseSubtitles()[cur]||"")}</span></div>`:"";
  return `<div class="phase-arc"><svg viewBox="0 0 ${w} 36" xmlns="http://www.w3.org/2000/svg">${segs}</svg>${sub}</div>`;
}

function distRings(dist){
  const cx=100,cy=100,radii=[88,66,44,22];
  let rings="";
  DISTS.forEach((d,i)=>{
    const r=radii[i],on=d===dist;
    rings+=`<circle class="ring${on?" on":""}" data-d="${d}" cx="${cx}" cy="${cy}" r="${r}"/>`;
    rings+=`<text class="ring lab" x="${cx}" y="${cy-r+5}" font-size="10" fill="${on?"var(--hit)":"var(--dim)"}">${d}</text>`;
  });
  rings+=`<circle class="center" cx="${cx}" cy="${cy}" r="6"/>`;
  rings+=`<text x="${cx}" y="${cy+6}" text-anchor="middle" font-size="28" font-weight="700" fill="var(--text)">${dist}</text>`;
  rings+=`<text x="${cx}" y="${cy+22}" text-anchor="middle" font-size="12" fill="var(--mute)">m</text>`;
  return `<div class="dist-wrap"><svg class="dist-svg" viewBox="0 0 200 200">${rings}</svg></div>`;
}

function geoLegend(kind,extra){
  const b=begOn();
  const items={
    record:b?[
      {svg:'<circle cx="13" cy="13" r="9" fill="none" stroke="var(--hit)" stroke-width="2"/><circle cx="13" cy="13" r="3.5" fill="var(--hit)"/>',t:"刺さった所をタップ"},
      {svg:'<circle cx="13" cy="13" r="9" fill="none" stroke="var(--warn)" stroke-width="1.5" stroke-dasharray="3 2"/>',t:"長押しで位置を直す"},
      {svg:'<circle cx="13" cy="13" r="7" fill="var(--hit)"/><text x="13" y="16" font-size="9" fill="#fff" text-anchor="middle" font-weight="700">10</text>',t:"丸の数字=得点"},
      {svg:'<circle cx="13" cy="13" r="6" fill="var(--hit)"/><circle cx="13" cy="13" r="9" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-dasharray="2.5 2"/>',t:"点線=線かみ"}
    ]:[
      {svg:'<circle cx="13" cy="13" r="9" fill="none" stroke="var(--hit)" stroke-width="2"/><circle cx="13" cy="13" r="3.5" fill="var(--hit)"/>',t:"タップで着弾"},
      {svg:'<circle cx="13" cy="13" r="9" fill="none" stroke="var(--warn)" stroke-width="1.5" stroke-dasharray="3 2"/><circle cx="13" cy="13" r="5" fill="none" stroke="var(--warn)"/>',t:"長押しで微調整"},
      {svg:'<circle cx="13" cy="13" r="7" fill="var(--hit)"/><text x="13" y="16" font-size="9" fill="#fff" text-anchor="middle" font-weight="700">10</text>',t:"丸の数字=得点"},
      {svg:'<circle cx="13" cy="13" r="6" fill="var(--hit)"/><circle cx="13" cy="13" r="9" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-dasharray="2.5 2"/>',t:"点線=線かみ"},
      {svg:'<circle cx="13" cy="13" r="7" fill="none" stroke="var(--cut-ok)" stroke-width="2"/>',t:"長押し·緑縁=かみ"}
    ],
    return:b?[
      {svg:'<circle cx="13" cy="13" r="4" fill="var(--warn)"/>',t:"黄点=集まった中心"},
      {svg:'<circle cx="9" cy="13" r="3" fill="var(--dim)"/><circle cx="17" cy="13" r="4" fill="var(--sight)"/>',t:"サイトの位置"},
      {svg:'<line x1="5" y1="21" x2="21" y2="5" stroke="var(--warn)" stroke-width="2.5"/>',t:"黄線=動かす方向"}
    ]:[
      {svg:'<ellipse cx="13" cy="13" rx="10" ry="6.5" fill="none" stroke="var(--hit)" stroke-width="1.5" stroke-dasharray="3 2"/>',t:"散布"},
      {svg:'<circle cx="13" cy="13" r="4" fill="var(--warn)" stroke="#fff" stroke-width="1"/>',t:"中心"},
      {svg:'<line x1="5" y1="21" x2="21" y2="5" stroke="var(--sight)" stroke-width="2.5"/>',t:"サイト方向"},
      {svg:'<circle cx="9" cy="13" r="3" fill="var(--dim)"/><circle cx="17" cy="13" r="4" fill="var(--sight)" stroke="#fff" stroke-width="1"/>',t:"灰=開始·紫=今"}
    ],
    setup:b?[
      {svg:'<circle cx="13" cy="13" r="10" fill="none" stroke="var(--line2)" stroke-width="3"/>',t:"タップで距離を選ぶ"},
      {svg:'<circle cx="13" cy="13" r="4" fill="var(--hit)"/>',t:"真ん中=無風でOK"}
    ]:[
      {svg:'<circle cx="13" cy="13" r="10" fill="none" stroke="var(--line2)" stroke-width="3"/><circle cx="13" cy="13" r="4" fill="var(--hit)"/>',t:"リング=距離"},
      {svg:'<circle cx="13" cy="13" r="10" fill="none" stroke="var(--line)"/><line x1="13" y1="3" x2="13" y2="23" stroke="var(--line)"/><circle cx="13" cy="5" r="2.5" fill="var(--hit)"/>',t:"コンパス=風"}
    ]
  };
  let list=items[kind]||[];
  if(extra&&extra.j){
    const c=extra.j.tone==="ok"?"var(--hit)":extra.j.tone==="warn"?"var(--beat)":extra.j.tone==="hold"?"var(--sight)":"var(--warn)";
    list=[{svg:`<rect x="4" y="8" width="18" height="10" rx="5" fill="${c}" opacity=".25"/><text x="13" y="16" font-size="9" fill="${c}" text-anchor="middle" font-weight="700">${esc(extra.j.label).slice(0,4)}</text>`,t:extra.j.label},...list];
  }
  return `<div class="geo-legend">${list.map(it=>`<span class="gl"><svg viewBox="0 0 26 26">${it.svg}</svg>${it.t}</span>`).join("")}</div>`;
}

function sightDial(s0,now,sug,adv){
  const cx=80,cy=80,R=55;
  let ticks="";
  for(let i=0;i<24;i++){const a=i*15*Math.PI/180,x1=cx+(R-4)*Math.cos(a),y1=cy+(R-4)*Math.sin(a),x2=cx+R*Math.cos(a),y2=cy+R*Math.sin(a);
    ticks+=`<line class="tick" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;}
  const parse=n=>{const v=parseFloat(String(n).replace(/[^\d.-]/g,""));return isNaN(v)?0:clamp(v,-20,20);};
  const sv=parse(s0.v),sh=parse(s0.h),nv=parse(now.v),nh=parse(now.h);
  const scale=2.2;
  const sx=cx+sh*scale,sy=cy-sv*scale,nx=cx+nh*scale,ny=cy-nv*scale;
  let sugLine="",sugDot="";
  if(sug&&(sug.h||sug.v)){
    const ex=cx+sug.h*scale*.85,ey=cy-sug.v*scale*.85;
    sugLine=`<line class="sug" x1="${nx}" y1="${ny}" x2="${ex}" y2="${ey}"/>`;
    sugDot=`<circle cx="${ex}" cy="${ey}" r="5" fill="none" stroke="var(--warn)" stroke-width="2" stroke-dasharray="2 2"/>`;
  }
  const rec=adv&&adv.moves.length?`<text class="lbl" x="${cx}" y="152" text-anchor="middle">→ ${adv.moves.map(m=>m.dir+m.cm.toFixed(1)+"cm").join(" · ")}</text>`:
    `<text class="lbl" x="${cx}" y="152" text-anchor="middle">調整不要</text>`;
  return `<div class="sight-dial"><svg viewBox="0 0 160 168" xmlns="http://www.w3.org/2000/svg">
    <defs><marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--warn)"/></marker></defs>
    ${ticks}
    <line class="axis" x1="${cx-R}" y1="${cy}" x2="${cx+R}" y2="${cy}"/>
    <line class="axis" x1="${cx}" y1="${cy-R}" x2="${cx}" y2="${cy+R}"/>
    <circle class="start" cx="${sx}" cy="${sy}" r="5"/>
    <circle class="now" cx="${nx}" cy="${ny}" r="7"/>
    ${sugLine}${sugDot}
    <g class="lbl" transform="translate(18,158)"><circle r="4" fill="var(--dim)"/><text x="10" y="4" font-size="9" fill="var(--dim)">開始</text></g>
    <g class="lbl" transform="translate(58,158)"><circle r="5" fill="var(--sight)" stroke="#fff" stroke-width="1"/><text x="12" y="4" font-size="9" fill="var(--dim)">今</text></g>
    <g class="lbl" transform="translate(92,158)"><line x1="0" y1="0" x2="10" y2="0" stroke="var(--warn)" stroke-width="2.5"/><text x="14" y="4" font-size="9" fill="var(--dim)">推奨</text></g>
    ${rec}
  </svg></div>`;
}

function sessArr(s){return [...s.ends.flat(),...s.cur];}
function sessTot(s){return sessArr(s).reduce((a,x)=>a+x.s,0);}

function endPulse(n,cb,opts){
  opts=opts||{};
  const p=$("#pulse"),pn=$("#pulseN");
  pn.textContent=opts.zenkin?"全金":n;
  p.classList.toggle("zenkin",!!opts.zenkin);
  p.classList.add("on");
  setTimeout(()=>{p.classList.remove("on","zenkin");setTimeout(cb,200);},opts.zenkin?820:520);
}
function targetModeFor(arrows,pe){return Geo.isZenkinEnd(arrows,pe)?"oppai":"sport";}
function backToSetupFromRecord(s){
  ui._dist=s.dist;
  ui._windDir=s.windDir??"";
  ui._windSpd=s.windSpeed??0;
  ui.zoom=1;
  delete db.active;
  save();
  ui.screen="setup";
  render();
}
function zoomChipsHtml(){
  const z=ui.zoom||1;
  const labs=begOn()?[[1,"全体"],[2,"×2"],[3,"×3"]]:[[1,"1×"],[2,"2×"],[3,"3×"]];
  return `<div class="zoom-chips" id="zoomChips">${labs.map(([n,lb])=>`<button type="button" class="zoom-chip${z===n?" on":""}" data-z="${n}">${lb}</button>`).join("")}</div>`;
}
function applyRecordZoom(s){
  const svg=$("#tgsvg");if(!svg)return;
  const vb=Geo.viewBoxFor(s.faceD,ui.zoom||1);
  svg.setAttribute("viewBox",vb.str);
}

function reopenLastEnd(s){
  if(!s||!s.ends.length||s.cur.length)return false;
  s.cur=s.ends.pop();
  s.phase="record";
  ui.adj=false;
  save();
  return true;
}
function undoFinishSession(){
  if(db.active||!db.sessions.length)return false;
  const last=db.sessions[db.sessions.length-1];
  db.active=normalizeActive(Object.assign({},last,{cur:[]}));
  db.sessions.pop();
  save();
  ui.screen=db.active.phase||"return";
  ui.adj=false;
  return true;
}
function reopenEndBtnHtml(id){
  const t=begOn()?"間違えた・記録に戻る":"記録を直す";
  return `<button type="button" class="btn ghost reopen-btn" id="${id}">${t}</button>`;
}
function bindReopenEnd(s,id,then){
  const el=$(id);if(!el)return;
  el.onclick=()=>{
    if(!reopenLastEnd(s)){toast("戻せません");return;}
    toast(begOn()?"記録に戻しました":"直前のエンドを再開");(then||(()=>render()))();
  };
}

function shell(phaseIdx,title,back,bodyHtml,footHtml,fit){
  const el=$("#frame");
  const fitOn=!!fit;
  if(el)el.className=fitOn?"frame fit"+(fit==="setup"?" setup-fit":""):"frame";
  document.body.classList.toggle("noflow",fitOn&&fit!=="setup");
  el.innerHTML=`
    ${phaseIdx>=0?phaseArc(phaseIdx):""}
    <div class="hdr">
      ${back?`<button class="back" id="backBtn">${back}</button>`:`<span class="gap"></span>`}
      <div class="title">${title||""}</div>
      <span class="gap"></span>
    </div>
    ${fit?`<div class="main"><div class="body" id="body">${bodyHtml}</div>${footHtml?`<div class="foot" id="foot">${footHtml}</div>`:""}</div>`
      :`<div class="body" id="body">${bodyHtml}</div>${footHtml?`<div class="foot" id="foot">${footHtml}</div>`:""}`}`;
  const bb=$("#backBtn");if(bb)bb.onclick=()=>nav("home");
  afterRender();
}
function afterRender(){
  if(Cx){Cx.setViewportVars();requestAnimationFrame(function(){Cx.layoutFit();});}
}
function jtagHtml(j){
  if(!j)return "";
  const cls=j.tone==="ok"?"ok":j.tone==="warn"?"warn":j.tone==="hold"?"hold":"mid";
  return `<span class="jtag ${cls}">${esc(j.label)}</span>`;
}
function adviceCardHtml(st,adv,j){
  if(!begOn()||!Beg)return "";
  const pj=Beg.plainJudgement(j)||{title:"",body:""};
  const moves=Beg.plainMoves(adv);
  return `<div class="advice-card${j?" tone-"+j.tone:""}">
    <div class="advice-title">${esc(pj.title)}</div>
    <div class="advice-group">矢の集まり：<b>${esc(Beg.plainGroup(st))}</b></div>
    ${moves.map(m=>`<div class="advice-move">${esc(m)}</div>`).join("")}
    <div class="advice-note">${esc(pj.body)}</div></div>`;
}
function retBarHtml(st,adv,j){
  if(begOn())return "";
  const parts=[];
  if(st)parts.push(`${mono(st.mx,"x")} ${mono(st.my,"y")} R${st.rr.toFixed(1)}`);
  if(adv&&adv.moves.length)parts.push(adv.moves.map(m=>`${m.dir}${m.cm.toFixed(1)}cm`).join("·"));
  else if(j&&j.label==="維持")parts.push("調整不要");
  return parts.length?`<div class="ret-bar">${parts.map(p=>`<span>${esc(p)}</span>`).join(" · ")}</div>`:"";
}
function recordTitle(s,n,pe){return begOn()?`${Beg.endLabel(s.ends.length+1)} · ${Beg.arrowProgress(n,pe)}`:`E${s.ends.length+1} · ${n}/${pe}`;}
function returnTitle(s,tot,j){return begOn()?`${Beg.endLabel(s.ends.length)} · ${tot}点`:`E${s.ends.length} · ${tot}点 ${jtagHtml(j)}`;}

function nav(screen){ui.screen=screen;ui.histId=null;ui.adj=false;render();}

function render(){
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
    shell(-1,"エラー",null,`<div class="empty">表示エラー: ${esc(e.message)}<br><br>
      <button class="btn hit" id="errReset">練習データをリセット</button></div>`,"");
    const er=$("#errReset");if(er)er.onclick=()=>{db.active=null;save();ui.screen="home";render();};
    afterRender();
  }
}

function homeStepsHtml(){
  const steps=begOn()?[
    ["1","距離とサイトを決める","リングでメートルを選び、照準の数字をメモ"],
    ["2","的の前で6本タップ","刺さった場所をタップ。長押しで微調整"],
    ["3","戻ってサイトを確認","集まりと「動かす方向」を見る"]
  ]:[
    ["1","Setup","距離・風・サイト"],
    ["2","Record","着弾タップ ×6"],
    ["3","Return","散布 & サイト提案"]
  ];
  return `<ol class="home-steps">${steps.map(([n,t,d])=>`<li><b>${n}</b><span><strong>${t}</strong> — ${d}</span></li>`).join("")}</ol>`;
}
function renderHome(){
  shell(-1,"",null,`
    <div class="home-wrap">
      <div class="home-rings"><svg viewBox="0 0 100 100" role="img" aria-label="的">
        <circle cx="50" cy="50" r="44" fill="none" stroke="var(--line2)" stroke-width="2"/>
        <circle cx="50" cy="50" r="32" fill="none" stroke="var(--line2)" stroke-width="2"/>
        <circle cx="50" cy="50" r="20" fill="none" stroke="var(--line2)" stroke-width="2"/>
        <circle cx="50" cy="50" r="8" fill="var(--red)"/>
        <line x1="50" y1="6" x2="50" y2="94" stroke="var(--hit)" stroke-width=".5" opacity=".4"/>
        <line x1="6" y1="50" x2="94" y2="50" stroke="var(--hit)" stroke-width=".5" opacity=".4"/>
      </svg></div>
      <h1 class="home-title">Converge</h1>
      <p class="home-tag">${begOn()?"的で記録して、戻ったらサイトの直し方がわかる練習帳":"Tap at the face, return to see grouping & sight moves"}</p>
      ${homeStepsHtml()}
      <button class="btn hit" id="goSetup" style="max-width:280px">${begOn()?"練習を始める":"Start"}</button>
      ${begOn()&&Beg?Beg.coachCard("home"):""}
      ${db.sessions.length?`<p class="home-prev">前回 ${fmtD(db.sessions[db.sessions.length-1].date)} · ${db.sessions[db.sessions.length-1].dist}m · ${sessTot(db.sessions[db.sessions.length-1])}点</p>`:""}
      <div class="home-links">
        <button id="lnkHist">過去</button>
        <button id="lnkGear">装備</button>
        <button id="lnkBk">バックアップ</button>
      </div>
    </div>`,"");
  $("#goSetup").onclick=()=>nav("setup");
  $("#lnkHist").onclick=()=>nav("history");
  $("#lnkGear").onclick=()=>nav("gear");
  if(begOn()){const lg=$("#lnkGear");if(lg)lg.textContent="設定";}
  $("#lnkBk").onclick=exportImport;
}

function exportImport(){
  const m=prompt("export と入力で保存、import で復元","export");
  if(m==="export"){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(db)]));a.download="converge-backup.json";a.click();}
  if(m==="import"){const inp=document.createElement("input");inp.type="file";inp.accept=".json";inp.onchange=()=>{const f=inp.files[0];if(!f)return;
    const r=new FileReader();r.onload=()=>{try{db=Object.assign(blankDb(),JSON.parse(r.result));save();toast("ok");render();}catch(e){toast("error");}};r.readAsText(f);};inp.click();}
}

function renderSetup(){
  const g=getSetup(),last=db.sessions[db.sessions.length-1];
  const dist=ui._dist||(last?.dist||70);
  const wDir=ui._windDir??last?.windDir??"";
  const wSpd=ui._windSpd??last?.windSpeed??0;
  const mk=db.sightMarks.filter(m=>g&&m.setupId===g.id&&m.dist===dist).sort((a,b)=>b.date.localeCompare(a.date))[0];
  shell(0,begOn()?`距離 ${dist}m`:`${dist}m`,"←",`
    ${begOn()&&Beg?Beg.coachCard("setup"):""}
    ${distRings(dist)}
    <p class="field-hint">${begOn()?"的までの距離（メートル）をタップで選びます":""}</p>
    <div class="setup-mid">
      <div>${windCompass(wDir,wSpd)}${begOn()?`<p class="field-hint">風がわからなければ真ん中「無」でOK</p>`:""}</div>
      <div class="sight-x">
        <p class="field-hint sight-lbl">${begOn()?"サイト（照準）の目盛り":""}</p>
        <input class="v-up" id="sv" inputmode="decimal" placeholder="${begOn()?"上下の数字":"上下"}" value="${esc(mk?.v||"")}">
        <div class="core"><svg viewBox="0 0 72 72"><circle cx="36" cy="36" r="34" fill="none" stroke="var(--line)" stroke-width="1"/>
          <line x1="36" y1="4" x2="36" y2="68" stroke="var(--hit)" stroke-width="1" opacity=".5"/>
          <line x1="4" y1="36" x2="68" y2="36" stroke="var(--hit)" stroke-width="1" opacity=".5"/>
          <circle cx="36" cy="36" r="4" fill="var(--red)"/></svg></div>
        <input class="h-l" id="sh" inputmode="decimal" placeholder="${begOn()?"左右の数字":"左右"}" value="${esc(mk?.h||"")}">
        ${begOn()?`<p class="field-hint full">今見ている数字でOK。空欄でも始められます</p>`:""}
      </div>
    </div>`,
    `${geoLegend("setup")}<button class="btn hit" id="start">${begOn()?"記録を始める（的の前へ）":"射る"}</button>`,"setup");
  document.querySelectorAll(".dist-svg .ring").forEach(c=>c.onclick=()=>{ui._dist=+c.dataset.d;renderSetup();});
  document.querySelectorAll(".wbtn").forEach(c=>c.onclick=()=>{ui._windDir=c.dataset.wd;renderSetup();});
  document.querySelectorAll(".wind-spd button").forEach(c=>c.onclick=()=>{ui._windSpd=+c.dataset.ws;renderSetup();});
  const bb=$("#backBtn");if(bb)bb.onclick=()=>nav("home");
  $("#start").onclick=()=>{
    const v=$("#sv").value.trim(),h=$("#sh").value.trim();
    db.active={
      id:uid(),date:today(),setupId:g?.id||null,dist,faceD:Geo.faceDForDist(dist),perEnd:6,
      sightStart:{v,h},sightNow:{v,h},note:"",
      windDir:ui._windDir??"",windSpeed:ui._windSpd??0,
      phase:"record",ends:[],cur:[],adjLog:[]
    };
    if(g&&(v||h))db.sightMarks.push({id:uid(),setupId:g.id,date:today(),dist,v,h,tag:"start"});
    ui.zoom=1;save();ui.screen="record";render();
  };
}

function renderRecord(){
  const s=db.active;if(!s){nav("home");return;}
  s.phase="record";save();
  const n=s.cur.length,pe=s.perEnd;
  const zenRec=Geo.isZenkinEnd(s.cur,pe);
  const canSetupBack=!n&&!s.ends.length;
  shell(1,recordTitle(s,n,pe)+(zenRec?` <span class="jtag ok">${begOn()?"全金！":"全金"}</span>`:""),canSetupBack?(begOn()?"← 準備":"← 準備"):"",`
    ${begOn()&&Beg?Beg.coachCard("record",{n,pe,zenkin:zenRec}):""}
    <div class="zoom-bar">${zoomChipsHtml()}</div>
    <div class="tgt-stage">
      <div class="box sq-fit" id="tgBox">
        <div class="tgt-stack">
          ${Geo.targetSvg(s.faceD,"tg","",targetModeFor(s.cur,pe))}
          <div class="lens" id="lens"><svg id="lensSvg" width="120" height="120" xmlns:xlink="http://www.w3.org/1999/xlink"><use href="#tgg" xlink:href="#tgg"/></svg></div>
        </div>
      </div>
    </div>
    <div class="rec-progress" aria-hidden="true">${Array.from({length:pe},(_,i)=>`<span class="dot${i<n?" on":i===n?" cur":""}"></span>`).join("")}</div>
    ${geoLegend("record")}`,
    `${!n&&s.ends.length?`<div class="foot-undo">${reopenEndBtnHtml("reopenRec")}</div>`:""}
    <div class="row">${n?`<button class="btn ghost sm" id="undo">1本戻す</button>`:`<span class="gap-btn"></span>`}
      <button class="btn beat" id="backLine"${n?"":" disabled"}>${begOn()?"6本終わった・戻る":"射線に戻った"}</button></div>`,true);
  paintMarks(s);
  applyRecordZoom(s);
  bindTarget(s);
  document.querySelectorAll("#zoomChips .zoom-chip").forEach(c=>c.onclick=()=>{
    ui.zoom=+c.dataset.z||1;
    document.querySelectorAll("#zoomChips .zoom-chip").forEach(x=>x.classList.toggle("on",x===c));
    applyRecordZoom(s);
  });
  if(canSetupBack){const bb=$("#backBtn");if(bb)bb.onclick=()=>backToSetupFromRecord(s);}
  bindReopenEnd(s,"#reopenRec",renderRecord);
  const undoBtn=$("#undo");if(undoBtn)undoBtn.onclick=()=>{if(s.cur.length){s.cur.pop();save();renderRecord();}};
  $("#backLine").onclick=()=>{
    if(!s.cur.length)return;
    const t=s.cur.reduce((a,x)=>a+x.s,0);
    s.ends.push(s.cur);s.cur=[];
    save();
    const zen=Geo.isZenkinEnd(s.ends[s.ends.length-1],pe);
    endPulse(t,()=>{ui.screen="return";render();},{zenkin:zen});
  };
}

function paintMarks(s){
  let mh="";
  s.ends.forEach(e=>e.forEach(a=>{mh+=Geo.dot(a,s.faceD,"var(--mark-past)",Geo.lbl(a));}));
  s.cur.forEach(a=>{mh+=Geo.dot(a,s.faceD,"var(--mark-cur)",Geo.lbl(a));});
  const mk=$("#tgmarks");if(mk)mk.innerHTML=mh;
}

function bindTarget(s){
  const svg=$("#tgsvg"),lens=$("#lens"),lensSvg=$("#lensSvg"),cur=$("#tgcur");
  let drag=null;
  function pt(e){const t=e.changedTouches?.[0]||e.touches?.[0]||e;return t?.clientX!=null?{x:t.clientX,y:t.clientY,id:e.pointerId??t.identifier??"m"}:null;}
  function toS(x,y){return Cx?Cx.svgClientToLocal(svg,x,y):{x:0,y:0};}
  function draw(p){
    const fine=!!drag?.fine;
    const cut=Geo.isLineCut(p.x,p.y,s.faceD);
    lens.classList.toggle("fine",fine);
    lens.classList.toggle("cut",fine&&cut);
    lens.classList.toggle("miss",fine&&!cut);
    cur.innerHTML=Geo.previewMark(p.x,p.y,s.faceD,fine,cut);
    const sp=Geo.mathToSvg(p.x,p.y);
    const z=Geo.ringW(s.faceD)*2.4;
    lensSvg.setAttribute("viewBox",`${sp.x-z} ${sp.y-z} ${2*z} ${2*z}`);
    lens.style.left=p.x<0?"auto":"6px";lens.style.right=p.x<0?"6px":"auto";}
  function reset(){if(drag?.tm)clearTimeout(drag.tm);drag=null;cur.innerHTML="";lens.style.display="none";lens.classList.remove("fine","cut","miss");}
  svg.oncontextmenu=e=>e.preventDefault();
  svg.addEventListener("selectstart",e=>e.preventDefault());
  function down(e){if(s.cur.length>=s.perEnd){toast(begOn()?"6本たったので射線に戻ってください":"6本 — 戻る");return;}const cp=pt(e);if(!cp)return;e.preventDefault();
    if(e.pointerId!=null){try{svg.setPointerCapture(e.pointerId);}catch(_){}}
    const p=toS(cp.x,cp.y);
    drag={p,raw:{x:cp.x,y:cp.y},fine:false,id:cp.id,tm:setTimeout(()=>{if(drag){drag.fine=true;draw(drag.p);}},400)};
    lens.style.display="block";draw(p);}
  function move(e){const cp=pt(e);if(!drag||cp.id!==drag.id)return;e.preventDefault();
    const a=toS(cp.x,cp.y),b=toS(drag.raw.x,drag.raw.y),k=drag.fine?.25:1;
    drag.p={x:drag.p.x+(a.x-b.x)*k,y:drag.p.y+(a.y-b.y)*k};drag.raw={x:cp.x,y:cp.y};draw(drag.p);}
  function up(e){const cp=pt(e);if(!drag||cp.id!==drag.id)return;e.preventDefault();clearTimeout(drag.tm);
    const p=Geo.clampMathXY(s.faceD,drag.p.x,drag.p.y);reset();
    const h=Geo.hitAt(p.x,p.y,s.faceD),cut=Geo.isLineCut(p.x,p.y,s.faceD);
    s.cur.push({x:+h.x.toFixed(2),y:+h.y.toFixed(2),s:h.s,X:h.X,cut});
    const hint=begOn()&&Beg?Beg.firstArrowToast(s.cur.length,s.perEnd,h.s):null;
    const zen=Geo.isZenkinEnd(s.cur,s.perEnd);
    save();
    if(zen)toast(begOn()?"全金！！おめでとう！":"全金 — 金ゾーン6本");
    else if(hint)toast(hint);
    renderRecord();}
  function cancel(e){const cp=pt(e);if(!drag||!cp||cp.id===drag.id)reset();}
  if(window.PointerEvent){
    svg.addEventListener("pointerdown",down);svg.addEventListener("pointermove",move);
    svg.addEventListener("pointerup",up);svg.addEventListener("pointercancel",cancel);
  }else{
    svg.addEventListener("touchstart",down,{passive:false});svg.addEventListener("touchmove",move,{passive:false});
    svg.addEventListener("touchend",up,{passive:false});svg.addEventListener("touchcancel",cancel,{passive:false});
  }
}
function blockZoom(){
  let last=0;
  document.addEventListener("touchend",e=>{
    const tag=e.target&&e.target.tagName;
    if(tag&&/^(INPUT|TEXTAREA|SELECT)$/.test(tag))return;
    const now=Date.now();
    if(now-last<320)e.preventDefault();
    last=now;
  },{passive:false,capture:true});
  ["gesturestart","gesturechange","gestureend"].forEach(ev=>{
    document.addEventListener(ev,e=>e.preventDefault(),{passive:false});
  });
}

function renderReturn(){
  const s=db.active;if(!s){nav("home");return;}
  s.phase="return";save();
  const end=s.ends[s.ends.length-1]||[],pe=s.perEnd||6;
  const zenRet=Geo.isZenkinEnd(end,pe);
  const st=stats(end);
  const tot=end.reduce((a,x)=>a+x.s,0);
  const adv=endAdvice(s,end);
  const j=Phy.judgementFor(adv,s);
  const sug=sugFromAdv(adv,j);
  const sv=s.sightNow?.v??"",sh=s.sightNow?.h??"";
  const s0=s.sightStart||{};
  const geoDefs=Geo.GEO_MARKER_DEFS;
  const rtOver=geoDefs+(st?`<g class="geo-layer" pointer-events="none">${Geo.geoSvg(st,s.faceD,sug)}</g>`:"");
  const moveLine=adv&&adv.moves.length&&Beg?Beg.plainSightMove(adv.moves[0]):"";
  shell(2,returnTitle(s,tot,j)+(zenRet?` <span class="jtag ok">${begOn()?"全金！":"全金"}</span>`:"")+(begOn()&&j&&!zenRet?` <span class="jtag ${j.tone==="ok"?"ok":j.tone==="warn"?"warn":j.tone==="hold"?"hold":"mid"}">${esc((Beg.plainJudgement(j)||{}).title||j.label)}</span>`:""),"",`
    ${begOn()&&Beg?Beg.coachCard("return",{plainGroup:Beg.plainGroup(st),moveLine,zenkin:zenRet}):""}
    ${adviceCardHtml(st,adv,j)}
    <div class="ret-split">
      <div class="cell"><div class="box sq-fit"><div class="tgt-stack">${Geo.targetSvg(s.faceD,"rt",rtOver,targetModeFor(end,pe))}</div></div></div>
      <div class="cell">${ui.adj?`<div class="sight-adj" style="width:100%;margin:0">
        <input id="nv" inputmode="decimal" placeholder="上下" value="${esc(sv)}">
        <input id="nh" inputmode="decimal" placeholder="左右" value="${esc(sh)}">
      </div>`:sightDial(s0,{v:sv,h:sh},sug,adv)}</div>
    </div>
    ${geoLegend("return",{j})}
    ${retBarHtml(st,adv,j)}`,`
    <div class="foot-undo">${reopenEndBtnHtml("reopenRet")}</div>
    <div class="row3">
      <button class="btn ghost" id="adjBtn">${ui.adj?"保存":begOn()?"サイトを直す":"調整"}</button>
      <button class="btn hit" id="next">${begOn()?"もう6本打つ":"次へ"}</button>
      <button class="btn ghost" id="fin">${begOn()?"今日は終わり":"終了"}</button>
    </div>`,true);
  bindReopenEnd(s,"#reopenRet",renderRecord);
  let mh="";end.forEach(a=>{mh+=Geo.dot(a,s.faceD,"var(--mark-cur)",Geo.lbl(a));});const rm=$("#rtmarks");if(rm)rm.innerHTML=mh;
  $("#adjBtn").onclick=()=>{
    if(!ui.adj){ui.adj=true;renderReturn();return;}
    const nv=$("#nv").value.trim(),nh=$("#nh").value.trim();
    s.sightNow={v:nv,h:nh};
    s.adjLog.push({end:s.ends.length,date:Date.now(),v:nv,h:nh,note:""});
    const g=db.setups[0];
    if(g)db.sightMarks.push({id:uid(),setupId:g.id,date:today(),dist:s.dist,v:nv,h:nh,tag:"adj"});
    ui.adj=false;save();toast("記録した");renderReturn();
  };
  $("#next").onclick=()=>{ui.screen="record";ui.adj=false;render();};
  $("#fin").onclick=()=>{
    db.sessions.push({...s,cur:[],total:sessTot(s)});delete db.active;save();ui.screen="done";render();
  };
}

function renderDone(){
  const s=db.sessions[db.sessions.length-1];
  shell(-1,"おつかれさま",null,s?`
    ${begOn()&&Beg?Beg.coachCard("done"):""}
    <div class="end-badge" style="padding:32px 0"><div class="n">${sessTot(s)}</div>
      <div class="s">${begOn()?`${s.ends.length}回（各6本）· ${s.dist}m`:`${s.ends.length}E · ${s.dist}m`}</div></div>
    ${sightDial(s.sightStart||{},s.sightNow||{},null)}
    ${(s.adjLog||[]).length?`<p style="text-align:center;font-size:12px;color:var(--dim)">調整 ${s.adjLog.length} 回</p>`:""}`:
    `<div class="empty">—</div>`,
    s?`<button class="btn ghost" id="undoFin" style="margin-bottom:8px">${begOn()?"終了を取り消す":"練習を続ける"}</button>
    <button class="btn hit" id="home">ホームへ</button>`:"");
  const uf=$("#undoFin");if(uf)uf.onclick=()=>{if(undoFinishSession()){toast(begOn()?"練習に戻しました":"取り消しました");render();}else toast("戻せません");};
  const homeBtn=$("#home");if(homeBtn)homeBtn.onclick=()=>nav("home");
}

function renderHistory(){
  shell(-1,"過去","←",(()=>{
    const ss=[...db.sessions].reverse();
    return ss.length?ss.map(s=>`
      <div class="hist-row" data-id="${s.id}"><div><div class="d">${fmtD(s.date)} · ${s.dist}m</div>
        <div class="m">${begOn()?s.ends.length+"回":s.ends.length+"E"}${s.note?" · "+esc(s.note):""}</div></div><div class="pts">${sessTot(s)}</div></div>`).join("")
      :`<div class="empty">なし</div>`;
  })(),"");
  const bb=$("#backBtn");if(bb)bb.onclick=()=>nav("home");
  $("#body").querySelectorAll(".hist-row").forEach(r=>r.onclick=()=>{ui.histId=r.dataset.id;render();});
}

function renderHistDetail(){
  const s=db.sessions.find(x=>x.id===ui.histId);
  if(!s){ui.histId=null;return renderHistory();}
  const st=stats(sessArr(s));
  const geoDefs=Geo.GEO_MARKER_DEFS;
  const hsOver=geoDefs+(st?`<g class="geo-layer" pointer-events="none">${Geo.geoSvg(st,s.faceD,null)}</g>`:"");
  shell(-1,`${fmtD(s.date)} · ${s.dist}m`,"←",`
    <div class="tgt-stage" style="min-height:300px"><div class="box sq-fit"><div class="tgt-stack">${Geo.targetSvg(s.faceD,"hs",hsOver)}</div></div></div>
    ${st?`<div class="geo-nums" style="position:static;justify-content:center"><span>${mono(st.mx,"x")}</span><span>${mono(st.my,"y")}</span><span>R<b>${st.rr.toFixed(1)}</b></span></div>`:""}`,
    `<button class="btn ghost" id="del">削除</button>`);
  const bb=$("#backBtn");if(bb)bb.onclick=()=>{ui.histId=null;render();};
  let mh="";s.ends.forEach((e,i)=>e.forEach(a=>{mh+=Geo.dot(a,s.faceD,`hsl(${120+i*30},50%,45%)`);}));const hm=$("#hsmarks");if(hm)hm.innerHTML=mh;
  $("#del").onclick=()=>{if(confirm("削除？")){db.sessions=db.sessions.filter(x=>x.id!==s.id);save();ui.histId=null;render();}};
}

function renderGear(){
  const g=getSetup();
  const gp=Phy.gearPrecisionProfile(g);
  shell(-1,"設定","←",`
    <div class="beg-toggle"><label class="beg-lbl"><input type="checkbox" id="begMode" ${db.settings.beginnerMode!==false?"checked":""}> やさしい説明（初心者向け）</label></div>
    <div class="gear-lbl">名前 / 弓</div>
    <div class="gear-grid">
      <input class="gear-inp" id="gn" placeholder="名前" value="${esc(g.name)}">
      <input class="gear-inp" id="gb" placeholder="弓" value="${esc(g.bow)}">
    </div>
    <div class="phys-traj" style="margin:8px 0">${begOn()?"詳しく入れると提案がより正確に（なくても使えます）":`物理入力 ${Math.round(gp.score*100)}% — RK4精度に影響`}</div>
    <div class="gear-sep"></div>
    <div class="gear-lbl">${begOn()?"弓・矢（任意）":"弓・矢（物理エンジン）"}</div>
    <div class="gear-grid">
      <input class="gear-inp" id="gp" inputmode="decimal" placeholder="ポンド" value="${esc(g.poundage||"")}">
      <input class="gear-inp" id="gd" inputmode="decimal" placeholder="引き尺" value="${esc(g.drawLength||"")}">
      <input class="gear-inp" id="gw" inputmode="decimal" placeholder="矢重量gr" value="${esc(g.arrowWeight||"")}">
      <input class="gear-inp" id="gsp" inputmode="decimal" placeholder="初速fps" value="${esc(g.arrowSpeed||"")}">
      <input class="gear-inp" id="gdi" inputmode="decimal" placeholder="矢径mm" value="${esc(g.arrowDia||"")}">
      <input class="gear-inp" id="gt" inputmode="decimal" placeholder="気温℃" value="${esc(g.temperature||"")}">
      <input class="gear-inp" id="ga" inputmode="decimal" placeholder="標高m" value="${esc(g.altitude||"")}">
      <input class="gear-inp" id="gh" inputmode="decimal" placeholder="湿度%" value="${esc(g.humidity||"")}">
    </div>
    <div class="gear-lbl">サイト目盛り @70m（cm/クリック）</div>
    <div class="gear-grid">
      <input class="gear-inp" id="gcv" inputmode="decimal" placeholder="上下" value="${esc(g.calibV70||"")}">
      <input class="gear-inp" id="gch" inputmode="decimal" placeholder="左右" value="${esc(g.calibH70||"")}">
      <input class="gear-inp full" id="geye" inputmode="decimal" placeholder="アイサイト距離mm（850）" value="${esc(db.settings.eyeSight||850)}">
    </div>`,
    `<button class="btn hit" id="gs">保存</button>`);
  const bb=$("#backBtn");if(bb)bb.onclick=()=>nav("home");
  const bm=$("#begMode");if(bm)bm.onchange=()=>{db.settings.beginnerMode=bm.checked;save();toast(bm.checked?"やさしい説明オン":"上級者表示");render();};
  $("#gs").onclick=()=>{
    const d={id:g.id||uid(),name:$("#gn").value.trim()||"main",bow:$("#gb").value.trim(),
      poundage:$("#gp").value.trim(),drawLength:$("#gd").value.trim(),arrowWeight:$("#gw").value.trim(),
      arrowSpeed:$("#gsp").value.trim(),arrowDia:$("#gdi").value.trim(),temperature:$("#gt").value.trim(),
      altitude:$("#ga").value.trim(),humidity:$("#gh").value.trim(),
      calibV70:$("#gcv").value.trim(),calibH70:$("#gch").value.trim()};
    if(db.setups.length)db.setups[0]=d;else db.setups.push(d);
    const eye=parseFloat($("#geye").value);if(isFinite(eye)&&eye>0)db.settings.eyeSight=eye;
    save();toast("保存した");
  };
}

if("serviceWorker"in navigator&&(location.protocol==="https:"||location.hostname==="localhost")){
  navigator.serviceWorker.register("sw.js").catch(()=>{});
}
function checkUp(){if(location.protocol==="file:")return;fetch("version.json?"+Date.now(),{cache:"no-store"}).then(r=>r.json()).then(j=>{if(j?.v>APP_VER)$("#updBar").style.display="block";}).catch(()=>{});}
$("#updBar").onclick=()=>location.reload();
document.addEventListener("visibilitychange",()=>{if(!document.hidden)checkUp();});
window.onerror=(msg,src,line)=>{toast("ERR:"+line);console.error(msg,src,line);};
function clearStaticLanding(){const el=$("#staticLanding");if(el)el.remove();}
window.ConvergeApp={init:function(){clearStaticLanding();if(Cx)Cx.init();blockZoom();checkUp();render();}};
