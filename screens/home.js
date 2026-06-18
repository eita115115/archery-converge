/* ConvergeApp — home, setup, done, gear */
function beginSession(dist,v,h,windDir,windSpd){
  const g=getSetup();
  db.active={
    id:uid(),date:today(),setupId:g?.id||null,dist,faceD:Geo.faceDForDist(dist),perEnd:6,
    sightStart:{v,h},sightNow:{v,h},note:"",
    windDir:windDir??"",windSpeed:windSpd??0,
    phase:"record",ends:[],cur:[],adjLog:[]
  };
  if(g&&(v||h))db.sightMarks.push({id:uid(),setupId:g.id,date:today(),dist,v,h,tag:"start"});
  ui.zoom=1;save();ui.screen="record";render();
}
function quickStartDist(){
  const last=db.sessions[db.sessions.length-1];
  return last?.dist||70;
}
function quickStartSight(dist){
  const g=getSetup();
  const mk=db.sightMarks.filter(m=>g&&m.setupId===g.id&&m.dist===dist).sort((a,b)=>b.date.localeCompare(a.date))[0];
  return {v:mk?.v||"",h:mk?.h||""};
}
function startQuickSession(){
  const dist=quickStartDist(),last=db.sessions[db.sessions.length-1];
  const {v,h}=quickStartSight(dist);
  ui._showQuickGuide=!db.settings.quickGuideSeen;
  beginSession(dist,v,h,last?.windDir??"",last?.windSpeed??0);
  if(ui._showQuickGuide)setTimeout(()=>toast(begOn()?"的をタップ → 6本 → 戻る":"Tap → 6 → Return"),420);
}
function homeFlowHtml(){
  const steps=begOn()?[
    ["準備","距離・サイト"],
    ["記録","的の前で6本"],
    ["確認","集まりを見る"]
  ]:[
    ["Setup","Dist · sight"],
    ["Record","Tap ×6"],
    ["Return","Grouping"]
  ];
  return `<div class="home-flow home-steps">${steps.map(([k,v],i)=>`${i?`<span class="flow-dot" aria-hidden="true"></span>`:""}<div class="flow-item"><span class="flow-k">${k}</span><span class="flow-v">${v}</span></div>`).join("")}</div>`;
}
function homeHeadlineHtml(){
  if(begOn())return `<span class="tile-headline-line home-title-line"><span class="tile-headline-body home-title-body">着弾が</span><span class="tile-headline-punct home-title-punct">、</span></span><span class="tile-headline-line home-title-line"><span class="tile-headline-body home-title-body">収束する</span><span class="tile-headline-punct home-title-punct">。</span></span>`;
  return `<span class="tile-headline-line home-title-line"><span class="tile-headline-body home-title-body">Hits</span></span><span class="tile-headline-line home-title-line"><span class="tile-headline-body home-title-body">converge</span><span class="tile-headline-punct home-title-punct">.</span></span>`;
}
function readinessLinePro(hint){
  if(!hint)return "";
  if(hint.tier==="mature")return "Personal model mature";
  if(hint.tier==="ready")return "Personal model ready";
  if(hint.tier==="warming")return "Trends emerging";
  if(hint.tier==="building"&&hint.sessionsNeeded!=null)return `${hint.sessionsNeeded} more sessions for clearer trends`;
  return "Record sessions to build your model";
}
function homeReadinessChipHtml(){
  const setup=getSetup();
  if(!setup.id)return "";
  const hint=Eng.memory.readinessHint(db,setup.id,db.settings);
  const line=begOn()&&Beg?Beg.readinessLine(hint):readinessLinePro(hint);
  if(!line)return "";
  const tier=hint&&hint.tier?hint.tier:"new";
  return `<p class="home-readiness-chip" data-tier="${esc(tier)}">${esc(line)}</p>`;
}
function gearCalibBarPro(digest,gear){
  const parts=[`inputs ${Math.round((gear.score||0)*100)}%`];
  if(digest&&digest.convergeIndex!=null)parts.push(`model ${digest.convergeIndex}`);
  if(digest&&digest.score!=null)parts.push(`cal ${Math.round(digest.score*100)}%`);
  return parts.join(" · ");
}
function gearCalibBarHtml(g){
  const digest=db.settings.calibrationDigest||Eng.calibration.buildDigest(db,db.settings);
  const gp=Eng.calibration.gear(g);
  const missing=gp.missingFieldHints||[];
  if(begOn()&&Beg){
    const main=Beg.gearCalibSummary(digest,gp);
    const sub=Beg.gearMissingHints(missing);
    return `<div class="gear-calib-bar" data-level="${esc(gp.level||"低")}">
      <p class="gear-calib-main">${esc(main)}</p>
      ${sub?`<p class="gear-calib-sub">${esc(sub)}</p>`:""}
    </div>`;
  }
  const main=gearCalibBarPro(digest,gp);
  const sub=missing.length?`missing: ${missing.slice(0,4).join(", ")}`:"";
  return `<div class="gear-calib-bar" data-level="${esc(gp.level||"低")}">
    <p class="gear-calib-main">${esc(main)}</p>
    ${sub?`<p class="gear-calib-sub">${esc(sub)}</p>`:""}
  </div>`;
}
function renderHome(){
  shell(-1,"",null,`
    <div class="home-wrap">
      <section class="home-tile home-hero section-hero">
        <div class="tile-content">
          <div class="tile-copy-wrapper">
            <div class="home-visual" aria-hidden="true"><svg viewBox="0 0 100 100" role="img" aria-label="的">
              <defs><radialGradient id="hg" cx="50%" cy="45%" r="50%"><stop offset="0%" stop-color="#fff"/><stop offset="70%" stop-color="#f5f3ee"/><stop offset="100%" stop-color="#e8e4dc"/></radialGradient></defs>
              <circle cx="50" cy="50" r="46" fill="url(#hg)" stroke="#d8d5cd" stroke-width=".5"/>
              <circle cx="50" cy="50" r="36" fill="none" stroke="#1c1b19" stroke-width="1.2" opacity=".12"/>
              <circle cx="50" cy="50" r="26" fill="none" stroke="#1c1b19" stroke-width="1.2" opacity=".18"/>
              <circle cx="50" cy="50" r="16" fill="none" stroke="#1c1b19" stroke-width="1.2" opacity=".22"/>
              <circle cx="50" cy="50" r="6" fill="#1c1b19"/>
              <circle cx="50" cy="50" r="2.2" fill="#d4a72c"/>
            </svg></div>
            <h1 class="tile-headline typography-headline home-title${begOn()?" is-ja":" is-en"}">${homeHeadlineHtml()}</h1>
            <p class="tile-subhead typography-subhead home-tag">${begOn()?"6本のあとに、次が見える。":"After six, the next move shows."}</p>
            ${homeReadinessChipHtml()}
          </div>
          <div class="tile-ctas home-start">
            <button type="button" class="btn hero" id="goQuick">${begOn()?"記録を始める":"Start recording"}</button>
            <button type="button" class="btn btn-secondary button-secondary" id="goSetup">${begOn()?"距離・サイトを変更":"Change dist & sight"}</button>
          </div>
          ${db.sessions.length?`<p class="home-prev">${begOn()?"前回":"Last"} · ${fmtD(db.sessions[db.sessions.length-1].date)} · ${db.sessions[db.sessions.length-1].dist}m · <b>${sessTot(db.sessions[db.sessions.length-1])}</b></p>`:""}
        </div>
      </section>
      <footer class="home-foot">
        <nav class="home-foot-nav home-foot-nav-thin">
          <button type="button" id="lnkHist">${begOn()?"履歴":"History"}</button>
          <button type="button" id="lnkGear">${begOn()?"設定":"Settings"}</button>
        </nav>
      </footer>
    </div>`,"");
  const fr=$("#frame");if(fr)fr.classList.add("home-mode");
  $("#goQuick").onclick=()=>startQuickSession();
  $("#goSetup").onclick=()=>nav("setup");
  $("#lnkHist").onclick=()=>nav("history");
  $("#lnkGear").onclick=()=>nav("gear");
}
function renderSetup(){
  const g=getSetup(),last=db.sessions[db.sessions.length-1];
  const dist=ui._dist||(last?.dist||70);
  const wDir=ui._windDir??last?.windDir??"";
  const wSpd=ui._windSpd??last?.windSpeed??0;
  const mk=db.sightMarks.filter(m=>g&&m.setupId===g.id&&m.dist===dist).sort((a,b)=>b.date.localeCompare(a.date))[0];
  shell(0,begOn()?"準備":"Setup",backLbl(),`
    ${coachCardHtml("setup",{sessionCount:db.sessions.length})}
    ${distRings(dist)}
    <div class="setup-mid">
      <div>${windCompass(wDir,wSpd)}</div>
      <div class="sight-x">
        <input class="v-up" id="sv" inputmode="decimal" placeholder="${begOn()?"上下の数字":"上下"}" value="${esc(mk?.v||"")}">
        <div class="core"><svg viewBox="0 0 72 72"><circle cx="36" cy="36" r="34" fill="none" stroke="var(--line)" stroke-width="1"/>
          <line x1="36" y1="4" x2="36" y2="68" stroke="var(--hit)" stroke-width="1" opacity=".5"/>
          <line x1="4" y1="36" x2="68" y2="36" stroke="var(--hit)" stroke-width="1" opacity=".5"/>
          <circle cx="36" cy="36" r="4" fill="var(--red)"/></svg></div>
        <input class="h-l" id="sh" inputmode="decimal" placeholder="${begOn()?"左右の数字":"左右"}" value="${esc(mk?.h||"")}">
      </div>
    </div>`,
    `<button class="btn hero" id="start">${begOn()?"記録を始める（的の前へ）":"射る"}</button>`,"setup");
  document.querySelectorAll(".dist-svg .ring").forEach(c=>c.onclick=()=>{ui._dist=+c.dataset.d;renderSetup();});
  document.querySelectorAll(".wbtn").forEach(c=>c.onclick=()=>{ui._windDir=c.dataset.wd;renderSetup();});
  document.querySelectorAll(".wind-spd button").forEach(c=>c.onclick=()=>{ui._windSpd=+c.dataset.ws;renderSetup();});
  const bb=$("#backBtn");if(bb)bb.onclick=()=>nav("home");
  $("#start").onclick=()=>{
    beginSession(dist,$("#sv").value.trim(),$("#sh").value.trim(),ui._windDir??"",ui._windSpd??0);
  };
}
function renderDone(){
  const s=db.sessions[db.sessions.length-1];
  shell(-1,"",null,s?`
    <div class="app-page app-page-tight">
      <section class="home-tile section-hero done-tile">
        <div class="tile-content tile-card">
          <div class="end-hero">
            <p class="eyebrow">SESSION</p>
            <h2 class="headline">${begOn()?"おつかれさま":"Well done"}</h2>
          </div>
          ${coachCardHtml("done")}
          <div class="end-badge" style="padding:24px 0"><div class="n">${sessTot(s)}</div>
            <div class="s">${begOn()?`${s.ends.length}回（各6本）· ${s.dist}m`:`${s.ends.length}E · ${s.dist}m`}</div>
            ${doneBadgeHintsHtml(s)}</div>
          ${sightDial(s.sightStart||{},s.sightNow||{},null)}
          ${(s.adjLog||[]).length?`<p style="text-align:center;font-size:13px;color:var(--dim);letter-spacing:-.01em">調整 ${s.adjLog.length} 回</p>`:""}
          ${doneBackupPromptHtml(s)}
        </div>
      </section>
    </div>`:
    `<div class="empty">—</div>`,
    s?`<button class="btn ghost" id="undoFin" style="margin-bottom:8px">${begOn()?"終了を取り消す":"練習を続ける"}</button>
    <button class="btn hero" id="home">${begOn()?"ホームへ":"Home"}</button>`:"");
  const uf=$("#undoFin");if(uf)uf.onclick=()=>{if(undoFinishSession()){toast(begOn()?"練習に戻しました":"取り消しました");render();}else toast("戻せません");};
  const homeBtn=$("#home");if(homeBtn)homeBtn.onclick=()=>nav("home");
  const bkDone=$("#bkOutDone");if(bkDone)bkDone.onclick=exportBackup;
  const skipBk=$("#skipDoneBk");if(skipBk)skipBk.onclick=()=>{if(s){db.settings.lastDoneBackupSkip=s.id;save();}render();};
  maybeSessionNudgeToast();
}
function renderGear(){
  const g=getSetup();
  const gp=Eng.calibration.gear(g);
  shell(-1,begOn()?"設定":"Settings",backLbl(),`
    <div class="app-page app-page-tight">
    <div class="tile-card gear-tile">
      <div class="beg-toggle"><label class="beg-lbl"><input type="checkbox" id="begMode" ${db.settings.beginnerMode!==false?"checked":""}> やさしい表示</label>
      <p class="field-hint beg-mode-hint">オフにすると数値・信頼度・図例を表示します</p></div>
      ${gearCalibBarHtml(g)}
    </div>
    <div class="tile-card gear-tile">
    <div class="gear-lbl">名前 / 弓</div>
    <div class="gear-grid">
      <input class="gear-inp" id="gn" placeholder="名前" value="${esc(g.name)}">
      <input class="gear-inp" id="gb" placeholder="弓" value="${esc(g.bow)}">
    </div>
    <div class="phys-traj" style="margin:8px 0">${begOn()?"弓・矢の数値は任意。入れると提案の目安が少し精密になります（なくても使えます）":`Physics inputs ${Math.round(gp.score*100)}% — affects estimate quality`}</div>
    <p class="advice-foot" style="margin:0 0 8px">${begOn()&&Beg?esc(Beg.adviceDisclaimer()):"Estimates only — not a substitute for coaching."}</p>
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
    </div>
    </div>
    </div>`,
    `<button class="btn hero" id="gs">${begOn()?"保存":"Save"}</button>`);
  const bb=$("#backBtn");if(bb)bb.onclick=()=>nav("home");
  const bm=$("#begMode");if(bm)bm.onchange=()=>{
    db.settings.beginnerMode=bm.checked;
    if(bm.checked)db.settings.coachSeen={};
    save();toast(bm.checked?"やさしい説明オン":"上級者表示");ui._coachBump={};ui._legendBump={};render();
  };
  $("#gs").onclick=()=>{
    const d={id:g.id||uid(),name:$("#gn").value.trim()||"main",bow:$("#gb").value.trim(),
      poundage:$("#gp").value.trim(),drawLength:$("#gd").value.trim(),arrowWeight:$("#gw").value.trim(),
      arrowSpeed:$("#gsp").value.trim(),arrowDia:$("#gdi").value.trim(),temperature:$("#gt").value.trim(),
      altitude:$("#ga").value.trim(),humidity:$("#gh").value.trim(),
      calibV70:$("#gcv").value.trim(),calibH70:$("#gch").value.trim()};
    if(db.setups.length)db.setups[0]=d;else db.setups.push(d);
    const eye=parseFloat($("#geye").value);if(isFinite(eye)&&eye>0)db.settings.eyeSight=eye;
    if(Eng.invalidateSetup)Eng.invalidateSetup(d.id);
    save();toast("保存した");
  };
}