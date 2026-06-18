/* ConvergeApp — return screen */
function renderReturn(){
  const s=db.active;if(!s){nav("home");return;}
  s.phase="return";save();
  const end=s.ends[s.ends.length-1]||[],pe=s.perEnd||6;
  const zenRet=Geo.isZenkinEnd(end,pe);
  const oiRet=zenRet?(s.endsZenkinFaces||[])[s.ends.length-1]:null;
  const tot=end.reduce((a,x)=>a+x.s,0);
  const analysis=Eng.advice.analyzeEnd(db,db.settings,getSetup(),sessForPhy(s),end);
  const st=analysis.st;
  const adv=analysis.adv;
  const j=analysis.j;
  const sug=sugFromAdv(adv,j);
  const sv=s.sightNow?.v??"",sh=s.sightNow?.h??"";
  const s0=s.sightStart||{};
  const geoDefs=Geo.GEO_MARKER_DEFS;
  const rtOver=geoDefs+(st?`<g class="geo-layer" pointer-events="none">${Geo.geoSvg(st,s.faceD,sug)}</g>`:"");
  const moveLine=adv&&adv.moves.length&&Beg?Beg.plainSightMove(adv.moves[0]):"";
  shell(2,returnTitle(s,tot,j)+(zenRet?` <span class="jtag ok">${begOn()?"全金！":"全金"}</span>`:"")+(!begOn()&&j?` ${jtagHtml(j)}`:""),"",`
    ${begOn()?returnVerdictHtml(st,adv,j,s.faceD):`${trustLineHtml(adv,s)}${adviceTechHtml(st,adv,j)}`}
    ${returnMetaRowHtml(st,adv,s)}
    <div class="ret-split ret-reveal">
      <div class="cell"><div class="box sq-fit"><div class="tgt-stack ret-converge">${Geo.targetSvg(s.faceD,"rt",rtOver,targetModeFor(end,pe),oiRet)}</div></div></div>
      <div class="cell">${ui.adj?`<div class="sight-adj" style="width:100%;margin:0">
        <input id="nv" inputmode="decimal" placeholder="上下" value="${esc(sv)}">
        <input id="nh" inputmode="decimal" placeholder="左右" value="${esc(sh)}">
      </div>`:sightDial(s0,{v:sv,h:sh},sug,adv)}</div>
    </div>
    ${begOn()?"":geoLegendHtml("return",{j})}`,`
    <div class="foot-undo">${reopenEndBtnHtml("reopenRet")}</div>
    <div class="row3">
      <button class="btn ghost" id="adjBtn">${ui.adj?"保存":begOn()?"サイトを直す":"調整"}</button>
      <button class="btn hero" id="next">${begOn()?"もう6本打つ":"次へ"}</button>
      <button class="btn ghost" id="fin">${begOn()?"今日は終わり":"終了"}</button>
    </div>`,true);
  bindReopenEnd(s,"#reopenRet",renderRecord);
  maybeConvergeMilestoneToast();
  const tg=$("#trustGear");if(tg)tg.onclick=()=>nav("gear");
  let mh="";end.forEach(a=>{mh+=Geo.dot(a,s.faceD,"var(--mark-cur)",Geo.lbl(a),"ret-mark-in");});const rm=$("#rtmarks");if(rm)rm.innerHTML=mh;
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
    const endMeta=Eng.advice.sessionEndMeta(db,db.settings,getSetup(),s);
    db.sessions.push({...s,cur:[],total:sessTot(s),endMeta});delete db.active;save();ui.screen="done";render();
  };
}