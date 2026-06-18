/* ConvergeApp — record screen */
function renderRecord(){
  const s=db.active;if(!s){nav("home");return;}
  s.phase="record";save();
  const n=s.cur.length,pe=s.perEnd;
  const zenRec=Geo.isZenkinEnd(s.cur,pe);
  const oiRec=zenkinFaceIdx(s,s.cur,pe);
  const canSetupBack=!n&&!s.ends.length;
  shell(1,recordTitle(s,n,pe)+(zenRec?` <span class="jtag ok">${begOn()?"全金！":"全金"}</span>`:""),canSetupBack?backLbl():"",`
    ${coachCardHtml("record",{n,pe,zenkin:zenRec})}
    ${recordWindHintHtml(s)}
    <div class="zoom-bar">${zoomChipsHtml()}</div>
    <div class="tgt-stage">
      <div class="box sq-fit" id="tgBox">
        <div class="tgt-stack">
          ${Geo.targetSvg(s.faceD,"tg","",targetModeFor(s.cur,pe),oiRec)}
          <div class="lens" id="lens"><svg id="lensSvg" width="120" height="120" xmlns:xlink="http://www.w3.org/1999/xlink"><use href="#tgg" xlink:href="#tgg"/></svg></div>
        </div>
      </div>
    </div>
    <div class="rec-progress" aria-hidden="true">${Array.from({length:pe},(_,i)=>`<span class="dot${i<n?" on":i===n?" cur":""}"></span>`).join("")}</div>
    `,
    `${!n&&s.ends.length?`<div class="foot-undo">${reopenEndBtnHtml("reopenRec")}</div>`:""}
    <div class="rec-thumb-bar">
      <div class="thumb-slot thumb-slot-undo${n?"":" is-idle"}">
        <button class="btn ghost undo-btn" id="undo" type="button"${n?"":" disabled"}>${begOn()?"1本取り消し":"Undo 1"}</button>
      </div>
      <div class="thumb-slot thumb-slot-primary">
        <button class="btn hero" id="backLine" type="button"${n?"":" disabled"}>${begOn()?"6本終わった・戻る":"6 done · return"}</button>
      </div>
    </div>`,true);
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
  bindRecordUndo(s);
  $("#backLine").onclick=()=>{
    if(!s.cur.length)return;
    const t=s.cur.reduce((a,x)=>a+x.s,0);
    const finished=s.cur;
    const zen=Geo.isZenkinEnd(finished,pe);
    s.ends.push(finished);s.cur=[];
    if(!s.endsZenkinFaces)s.endsZenkinFaces=[];
    s.endsZenkinFaces.push(zen?s.zenkinFaceIdx:null);
    s.zenkinFaceIdx=null;
    save();
    endPulse(t,()=>{ui.screen="return";render();},{zenkin:zen});
  };
}

function tapHaptic(opts){
  opts=opts||{};
  if(!navigator.vibrate)return;
  if(opts.zenkin)navigator.vibrate([10,45,18]);
  else if(opts.ten)navigator.vibrate(14);
  else navigator.vibrate(9);
}
function paintMarks(s,popIdx){
  let mh="",i=0;
  s.ends.forEach(e=>e.forEach(a=>{mh+=Geo.dot(a,s.faceD,"var(--mark-past)",Geo.lbl(a));}));
  s.cur.forEach(a=>{
    const pop=popIdx!=null&&i===popIdx;
    const cls=pop?(a.s>=10?"mark-pop mark-ten":"mark-pop"):"";
    mh+=Geo.dot(a,s.faceD,"var(--mark-cur)",Geo.lbl(a),cls);
    i++;
  });
  const mk=$("#tgmarks");if(mk)mk.innerHTML=mh;
}
function updateRecordFace(s){
  const pe=s.perEnd,mode=targetModeFor(s.cur,pe);
  const face=$("#tgface"),svg=$("#tgsvg");
  if(!face||!svg)return;
  const wasCelebration=svg.classList.contains("celebration"),isCelebration=mode==="celebration";
  if(wasCelebration===isCelebration&&!isCelebration)return;
  face.innerHTML=Geo.targetFaceSvg(s.faceD,"tg",mode,zenkinFaceIdx(s,s.cur,pe));
  Geo.applyZenkinFaceClasses(svg,mode,zenkinFaceIdx(s,s.cur,pe));
  if(isCelebration&&!wasCelebration){svg.classList.add("face-reveal");setTimeout(()=>svg.classList.remove("face-reveal"),560);}
}
function updateRecordCoach(s){
  const n=s.cur.length,pe=s.perEnd,zenRec=Geo.isZenkinEnd(s.cur,pe);
  const ctx={n,pe,zenkin:zenRec};
  const card=document.querySelector(".coach-card[data-phase='record']");
  if(!zenRec&&n>0){if(card)card.remove();return;}
  const html=coachCardHtml("record",ctx);
  if(!html){if(card)card.remove();return;}
  const wrap=document.createElement("div");
  wrap.innerHTML=html;
  const neu=wrap.firstElementChild;
  if(!neu)return;
  if(card)card.replaceWith(neu);
  else{const anchor=$(".zoom-bar")||$(".tgt-stage");if(anchor)anchor.insertAdjacentElement("beforebegin",neu);}
}
function bindRecordUndo(s){
  const undo=$("#undo");if(!undo)return;
  undo.onclick=()=>{
    if(!s.cur.length)return;
    s.cur.pop();
    if(!Geo.isZenkinEnd(s.cur,s.perEnd))s.zenkinFaceIdx=null;
    save();renderRecord();
  };
}
function updateRecordChrome(s,justShot){
  const n=s.cur.length,pe=s.perEnd,zenRec=Geo.isZenkinEnd(s.cur,pe);
  const title=recordTitle(s,n,pe)+(zenRec?` <span class="jtag ok">${begOn()?"全金！":"全金"}</span>`:"");
  const ht=$(".hdr .title");if(ht)ht.innerHTML=title;
  const prog=$(".rec-progress");
  if(prog)prog.innerHTML=Array.from({length:pe},(_,i)=>{
    const bump=justShot&&i===n-1?" bump":"";
    return `<span class="dot${i<n?" on":i===n?" cur":""}${bump}"></span>`;
  }).join("");
  const undoSlot=$(".rec-thumb-bar .thumb-slot-undo"),undo=$("#undo");
  if(undoSlot)undoSlot.classList.toggle("is-idle",n===0);
  if(undo){undo.disabled=n===0;bindRecordUndo(s);}
  const bl=$("#backLine");
  if(bl){
    const enable=n>0;
    if(enable&&bl.disabled)bl.classList.add("ready-pulse");
    bl.disabled=!enable;
    if(justShot&&n===pe)setTimeout(()=>{bl.classList.add("ready-pulse");setTimeout(()=>bl.classList.remove("ready-pulse"),560);},80);
    else setTimeout(()=>bl.classList.remove("ready-pulse"),560);
  }
  updateRecordCoach(s);
}
function afterRecordArrow(s,arrow){
  markQuickGuideSeen();
  const idx=s.cur.length-1;
  paintMarks(s,idx);
  updateRecordFace(s);
  updateRecordChrome(s,true);
  const stack=document.querySelector(".tgt-stack");
  if(stack){stack.classList.remove("hit-flash");void stack.offsetWidth;stack.classList.add("hit-flash");setTimeout(()=>stack.classList.remove("hit-flash"),520);}
  tapHaptic({zenkin:Geo.isZenkinEnd(s.cur,s.perEnd),ten:arrow.s>=10});
  if(Geo.isZenkinEnd(s.cur,s.perEnd))flashZenkinConverge(document.querySelector(".tgt-stack"),$(".rec-progress"));
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
  function down(e){if(s.cur.length>=s.perEnd){toast(begOn()?"6本たったので「6本終わった・戻る」を押してください":"6 arrows — tap return");return;}const cp=pt(e);if(!cp)return;e.preventDefault();
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
    if(zen&&s.zenkinFaceIdx==null)s.zenkinFaceIdx=Geo.pickZenkinFace();
    save();
    if(zen){const lb=Geo.zenkinFaceLabel(s.zenkinFaceIdx);toast(begOn()?"全金！！ "+lb:"全金 — "+lb);}
    else if(hint)toast(hint);
    afterRecordArrow(s,h);}
  function cancel(e){const cp=pt(e);if(!drag||!cp||cp.id===drag.id)reset();}
  if(window.PointerEvent){
    svg.addEventListener("pointerdown",down);svg.addEventListener("pointermove",move);
    svg.addEventListener("pointerup",up);svg.addEventListener("pointercancel",cancel);
  }else{
    svg.addEventListener("touchstart",down,{passive:false});svg.addEventListener("touchmove",move,{passive:false});
    svg.addEventListener("touchend",up,{passive:false});svg.addEventListener("touchcancel",cancel,{passive:false});
  }
}