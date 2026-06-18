/* ConvergeApp — DOM, shell, shared UI builders */
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function $(s,r){return (r||document).querySelector(s);}
function esc(s){return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove("show"),1800);}
function today(){return new Date().toISOString().slice(0,10);}
function fmtD(d){const x=new Date(d+"T12:00:00");return `${x.getMonth()+1}/${x.getDate()}`;}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

function stats(ar){return Eng.grouping.robust(ar);}
function getSetup(){return db.setups[0]||{};}
function sessForPhy(s){return{id:s.id,date:s.date,dist:s.dist,faceD:s.faceD,setupId:s.setupId,windDir:s.windDir,windSpeed:s.windSpeed,sightNow:s.sightNow,sightStart:s.sightStart};}
function endAdvice(s,arrows){return Eng.advice.forEnd(db,db.settings,getSetup(),sessForPhy(s),arrows);}
function engineBump(){if(Eng&&Eng.clearCaches)Eng.clearCaches();}
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

function distRings(dist){
  const cx=100,cy=100,radii=[88,66,44,22];
  let rings="";
  DISTS.forEach((d,i)=>{
    const r=radii[i],on=d===dist;
    rings+=`<circle class="ring${on?" on":""}" data-d="${d}" cx="${cx}" cy="${cy}" r="${r}"/>`;
    rings+=`<text class="ring lab" x="${cx}" y="${cy-r+5}" font-size="10" fill="${on?"var(--ink)":"var(--dim)"}">${d}</text>`;
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
      {svg:'<circle cx="9" cy="13" r="3" fill="var(--dim)"/><circle cx="17" cy="13" r="4" fill="var(--sight)" stroke="#fff" stroke-width="1"/>',t:"灰=開始·緑=今"}
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
  setTimeout(()=>{p.classList.remove("on","zenkin");setTimeout(cb,200);},opts.zenkin?1050:580);
}
function targetModeFor(arrows,pe){return Geo.isZenkinEnd(arrows,pe)?"celebration":"sport";}
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
  if(!s.endsZenkinFaces)s.endsZenkinFaces=[];
  const oi=s.endsZenkinFaces.pop();
  s.cur=s.ends.pop();
  s.zenkinFaceIdx=oi!=null?oi:null;
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

function backLbl(){return begOn()?"戻る":"Back";}
function shell(phaseIdx,title,back,bodyHtml,footHtml,fit){
  const el=$("#frame");
  const fitOn=!!fit;
  if(el){
    el.className=fitOn?"frame fit"+(fit==="setup"?" setup-fit":""):"frame";
    el.classList.remove("home-mode","app-mode");
    if(phaseIdx>=0||title||back)el.classList.add("app-mode");
  }
  document.body.classList.toggle("noflow",fitOn&&fit!=="setup");
  el.innerHTML=`
    ${title||back?`<div class="hdr">
      ${back?`<button class="back" id="backBtn">${back}</button>`:`<span class="gap"></span>`}
      <div class="title">${title||""}</div>
      <span class="gap"></span>
    </div>`:""}
    ${fit?`<div class="main"><div class="body" id="body">${bodyHtml}</div>${footHtml?`<div class="foot" id="foot">${footHtml}</div>`:""}</div>`
      :`<div class="body" id="body">${bodyHtml}</div>${footHtml?`<div class="foot" id="foot">${footHtml}</div>`:""}`}`;
  const bb=$("#backBtn");if(bb)bb.onclick=()=>nav("home");
  afterRender();
}
function afterRender(){
  if(Cx)Cx.setViewportVars();
  const body=$("#body");
  if(body){
    body.classList.remove("page-in");
    requestAnimationFrame(()=>{
      body.classList.add("page-in");
      if(Cx)Cx.layoutFit();
    });
  }else if(Cx)requestAnimationFrame(()=>Cx.layoutFit());
}
function jtagHtml(j){
  if(!j)return "";
  const cls=j.tone==="ok"?"ok":j.tone==="warn"?"warn":j.tone==="hold"?"hold":"mid";
  return `<span class="jtag ${cls}">${esc(j.label)}</span>`;
}
function trustCtx(adv,s){
  const setup=getSetup(),gear=Eng.calibration.gear(setup);
  const st=adv&&adv.st;
  const quality=adv&&adv.quality?adv.quality:(st?Eng.advice.quality(sessForPhy(s),setup,st):{label:"低",score:.2});
  return{
    needsMove:!!(adv&&adv.needsMove),
    qualityLabel:quality.label,
    qualityScore:quality.score,
    conf:adv?Math.round((adv.confidence||0)*100):0,
    gearLevel:gear.level,
    gearScore:gear.score,
    hasCalib:!!(String(setup.calibV70||"").trim()||String(setup.calibH70||"").trim()),
    personal:adv&&adv.personal?adv.personal.state:""
  };
}
function trustLineHtml(adv,s){
  if(!adv)return "";
  const ctx=trustCtx(adv,s);
  const refine=ctx.gearLevel==="低"&&!ctx.hasCalib;
  let text;
  if(begOn()&&Beg)text=Beg.trustLine(ctx);
  else{
    const parts=["Estimate from grouping"];
    parts.push(ctx.qualityLabel+" quality");
    if(ctx.conf)parts.push("conf "+ctx.conf+"%");
    if(ctx.hasCalib)parts.push("calib on");
    else if(ctx.gearScore<.45)parts.push("add gear in Settings");
    text=parts.join(" · ");
  }
  const link=refine&&ctx.needsMove?` <button type="button" class="trust-link" id="trustGear">${begOn()?"設定で精密化":"Refine in Settings"}</button>`:"";
  return `<p class="trust-line">${esc(text)}${link}</p>`;
}
function returnVerdictHtml(st,adv,j,faceD){
  if(!begOn()||!Beg)return "";
  const dir=Beg.groupDirection(st,faceD);
  const action=Beg.simpleSightAction(adv,j);
  const quality=Beg.simpleGroup(st,faceD);
  const detail=quality&&quality!=="記録しよう"&&!dir.includes(quality)?quality:"";
  return `<section class="return-verdict" aria-label="${begOn()?"今回の集まり":"Grouping"}">
    <p class="return-verdict-eyebrow">${begOn()?"今日の6本":"This end"}</p>
    <p class="return-verdict-main">${esc(dir)}</p>
    <p class="return-verdict-action">${esc(action)}</p>
    ${detail?`<p class="return-verdict-detail">${esc(detail)}</p>`:""}</section>`;
}
function memoryChipLinePro(streak,dirKey){
  if(streak<2||!dirKey||dirKey==="c")return "";
  const bias={u:"high",d:"low",r:"right",l:"left",ur:"high-right",ru:"high-right",ul:"high-left",lu:"high-left",dr:"low-right",rd:"low-right",dl:"low-left",ld:"low-left"}[dirKey]||dirKey;
  return `${streak} in a row · ${bias}`;
}
function convergeMilestonesSeen(){
  if(!Array.isArray(db.settings.convergeMilestonesSeen))db.settings.convergeMilestonesSeen=[];
  return db.settings.convergeMilestonesSeen;
}
function maybeConvergeMilestoneToast(){
  const setup=getSetup();
  if(!setup.id)return;
  const index=Eng.memory.convergeIndex(db,setup.id,db.settings);
  db.settings.convergeIndex=index;
  const seen=convergeMilestonesSeen();
  let hit=null;
  CONVERGE_MILESTONES.forEach(m=>{
    if(index>=m&&seen.indexOf(m)<0){
      if(!hit||m>hit)hit=m;
    }
  });
  if(!hit)return;
  seen.push(hit);
  save();
  const msg=begOn()&&Beg?Beg.convergeMilestoneLine(hit):`Personal model milestone (${hit})`;
  setTimeout(()=>toast(msg),480);
}
function windRecordHintPro(wc){
  wc=wc||{};
  if(wc.lateralDominant)return "Strong crosswind — grouping may drift sideways.";
  return "Windy conditions — treat return advice as approximate.";
}
function recordWindHintHtml(s){
  if(!s)return "";
  const st=s.cur.length?stats(s.cur):null;
  const wc=Eng.wind.classify(sessForPhy(s),st);
  if(!wc.windy)return "";
  const text=begOn()&&Beg?Beg.windRecordHint(wc):windRecordHintPro(wc);
  return `<p class="record-wind-hint" role="status">${esc(text)}</p>`;
}
function returnMetaRowHtml(st,adv,s){
  if(!st||!s)return "";
  const setup=getSetup();
  const streak=Eng.memory.sessionStreak(db,setup.id,s.dist,s);
  const dirKey=Eng.memory.endDirectionKey(st,s.faceD);
  const chipText=begOn()&&Beg?Beg.memoryChipLine(streak,dirKey):memoryChipLinePro(streak,dirKey);
  const conf=adv&&adv.confidence!=null?adv.confidence:(st.confidence||0);
  const band=Eng.metrics.confidenceBand(conf);
  const confPct=Math.round(conf*100);
  const confLabel=begOn()&&Beg?Beg.confidenceWords(band):`${confPct}%`;
  const chip=chipText?`<span class="return-memory-chip">${esc(chipText)}</span>`:"";
  const meter=`<div class="return-confidence" data-band="${esc(band)}">
    <span class="return-confidence-label">${esc(confLabel)}</span>
    <div class="return-confidence-track" role="meter" aria-valuenow="${confPct}" aria-valuemin="0" aria-valuemax="100" aria-label="${begOn()?"信頼度":"Confidence"}">
      <div class="return-confidence-fill" style="width:${confPct}%"></div>
    </div>
  </div>`;
  return `<div class="return-meta">${chip}${meter}</div>`;
}
function zenkinDotsHtml(){
  return `<div class="zenkin-dots" aria-hidden="true">${"<span></span>".repeat(6)}</div>`;
}
function flashZenkinConverge(stack,prog){
  if(stack){
    stack.classList.remove("zenkin-converge");
    void stack.offsetWidth;
    stack.classList.add("zenkin-converge");
    const old=stack.querySelector(".zenkin-dots");
    if(old)old.remove();
    stack.insertAdjacentHTML("beforeend",zenkinDotsHtml());
    setTimeout(()=>{stack.classList.remove("zenkin-converge");const d=stack.querySelector(".zenkin-dots");if(d)d.remove();},1150);
  }
  if(prog){
    prog.classList.remove("converge-dots");
    void prog.offsetWidth;
    prog.classList.add("converge-dots");
    setTimeout(()=>prog.classList.remove("converge-dots"),1000);
  }
}
function adviceTechHtml(st,adv,j){
  if(begOn()||!st)return "";
  const parts=[`${mono(st.mx,"x")} ${mono(st.my,"y")} R${st.rr.toFixed(1)}`];
  if(adv&&adv.moves.length)parts.push(adv.moves.map(m=>`${m.dir}${m.cm.toFixed(1)}cm`).join(" · "));
  else if(j&&j.label==="維持")parts.push("調整不要");
  return `<div class="advice-tech">${parts.map(p=>`<span>${esc(p)}</span>`).join(" · ")}</div>`;
}
function safetyBannerHtml(){
  const t=begOn()&&Beg?Beg.safetyBanner():"Estimate only — coach, safety, and range rules come first.";
  return `<div class="safety-banner">${esc(t)}</div>`;
}
function adviceFootHtml(){
  const t=begOn()&&Beg?Beg.safetyNote():"Follow coach, safety, and range rules before adjusting sight.";
  return `<p class="advice-foot">${esc(t)}</p>`;
}
function shouldShowDoneBackup(s){
  if(db.settings.hasExported)return false;
  if(s&&db.settings.lastDoneBackupSkip===s.id)return false;
  return true;
}
function doneBackupPromptHtml(s){
  if(!shouldShowDoneBackup(s))return "";
  const b=begOn();
  return `<div class="done-backup-prompt">
    <p class="done-backup-warn">${b?"記録はこの端末のみです":"Data stays on this device"}</p>
    <p class="done-backup-sub">${b?"今のうちに書き出ししておくと安心です":"Export a backup file while you are here"}</p>
    <button type="button" class="btn ghost done-backup-btn" id="bkOutDone">${b?"書き出しする":"Export now"}</button>
    <button type="button" class="done-backup-skip" id="skipDoneBk">${b?"あとで":"Later"}</button>
  </div>`;
}
function markQuickGuideSeen(){
  if(!ui._showQuickGuide)return;
  ui._showQuickGuide=false;
  db.settings.quickGuideSeen=true;
  save();
}
function sessCompareHint(s){
  if(!s||db.sessions.length<2)return "";
  const prev=db.sessions[db.sessions.length-2];
  if(prev.dist!==s.dist)return "";
  const d=sessTot(s)-sessTot(prev);
  if(!d)return begOn()?"前回と同じ距離で同点":"Same dist as prior session";
  return begOn()?(d>0?`前回（${prev.dist}m）より +${d}点`:`前回（${prev.dist}m）より ${d}点`):(d>0?`+${d} vs prior`:`${d} vs prior`);
}
function doneStreakHint(s){
  if(!s||!s.ends||!s.ends.length)return "";
  const setupId=s.setupId||getSetup().id;
  if(!setupId)return "";
  const streak=Eng.memory.sessionStreak(db,setupId,s.dist);
  if(streak<2)return "";
  const lastEnd=s.ends[s.ends.length-1],st=stats(lastEnd);
  if(!st||st.n<6)return "";
  const dirKey=Eng.memory.endDirectionKey(st,s.faceD);
  if(begOn()&&Beg){
    const line=Beg.memoryChipLine(streak,dirKey);
    return line||"";
  }
  return memoryChipLinePro(streak,dirKey);
}
function doneBadgeHintsHtml(s){
  const hints=[];
  const cmp=sessCompareHint(s);
  if(cmp)hints.push(cmp);
  const streak=doneStreakHint(s);
  if(streak)hints.push(streak);
  if(!hints.length)return "";
  return hints.map(h=>`<div class="s cmp">${esc(h)}</div>`).join("");
}
function maybeSessionNudgeToast(){
  const nudge=Eng.storage.sessionNudge(db);
  if(nudge.level!=="soft"||db.settings.sessionNudge150Seen)return;
  db.settings.sessionNudge150Seen=true;
  save();
  const msg=begOn()&&Beg?Beg.sessionNudgeToast(nudge):`Many sessions (${nudge.count}) — export a backup`;
  setTimeout(()=>toast(msg),520);
}
function retBarHtml(st,adv,j){
  if(begOn())return "";
  const parts=[];
  if(st)parts.push(`${mono(st.mx,"x")} ${mono(st.my,"y")} R${st.rr.toFixed(1)}`);
  if(adv&&adv.moves.length)parts.push(adv.moves.map(m=>`${m.dir}${m.cm.toFixed(1)}cm`).join("·"));
  else if(j&&j.label==="維持")parts.push("調整不要");
  return parts.length?`<div class="ret-bar">${parts.map(p=>`<span>${esc(p)}</span>`).join(" · ")}</div>`:"";
}
function recordTitle(s,n,pe){
  const core=begOn()?`${Beg.endLabel(s.ends.length+1)} · ${Beg.arrowProgress(n,pe)}`:`E${s.ends.length+1} · ${n}/${pe}`;
  return begOn()?`記録 · ${core}`:core;
}
function returnTitle(s,tot,j){
  if(begOn())return `確認 · ${Beg.endLabel(s.ends.length)}`;
  return `Return · E${s.ends.length} · ${tot}pt ${jtagHtml(j)}`;
}
