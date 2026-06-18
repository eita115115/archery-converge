/* ConvergeApp — history */
function endTot(arrows){return (arrows||[]).reduce((a,x)=>a+x.s,0);}
function hasValidEndMeta(s){
  return !!(s&&Array.isArray(s.ends)&&Array.isArray(s.endMeta)&&s.endMeta.length===s.ends.length&&s.endMeta.length>0);
}
function histSessionAnalysis(s){
  if(hasValidEndMeta(s))return Eng.advice.analysisFromEndMeta(s);
  return Eng.advice.analyzeSession(db,db.settings,getSetup(),s);
}
function histSessionSummaryHtml(s,analysis){
  const sum=analysis&&analysis.summary;
  if(!sum||sum.endCount<2)return "";
  if(begOn()&&Beg){
    const parts=[];
    const trend=Beg.histSessionTrend(sum);
    if(trend)parts.push(trend);
    if(sum.bestEnd!=null)parts.push(Beg.histBestEndLine(sum.bestEnd+1));
    if(!parts.length)return "";
    return `<p class="hist-detail-meta">${parts.map(p=>esc(p)).join(" · ")}</p>`;
  }
  const parts=[];
  if(sum.trend&&sum.trend!=="stable"&&sum.trend!=="none")parts.push(`trend ${sum.trend}`);
  if(sum.bestEnd!=null)parts.push(`tightest E${sum.bestEnd+1}`);
  if(!parts.length)return "";
  return `<p class="hist-detail-meta">${parts.map(p=>`<span>${esc(p)}</span>`).join(" · ")}</p>`;
}
function histEndHeadPro(row,endNum,pts){
  if(!row||!row.st)return `E${endNum} · ${pts}pt`;
  const st=row.st,j=row.j;
  let t=`E${endNum} · ${mono(st.mx,"x")} ${mono(st.my,"y")} R${st.rr.toFixed(1)} · ${pts}pt`;
  if(j&&j.label)t+=` · ${j.label}`;
  return t;
}
function histEndBodyPro(row){
  if(!row||!row.describe)return "";
  const d=row.describe,sp=d.spread,parts=[`sx ${sp.sx.toFixed(1)} sy ${sp.sy.toFixed(1)}`];
  if(d.outliers)parts.push(`${d.outliers} outlier${d.outliers>1?"s":""}`);
  if(d.confidence!=null)parts.push(`conf ${Math.round(d.confidence*100)}%`);
  return parts.join(" · ");
}
function histEndRowsHtml(s,analysis){
  if(!analysis||!analysis.ends||!analysis.ends.length)return "";
  const faceD=s.faceD||122;
  const rows=analysis.ends.map((row,i)=>{
    const arrows=s.ends[row.index]!=null?s.ends[row.index]:s.ends[i]||[];
    const pts=endTot(arrows);
    const head=begOn()&&Beg?Beg.histEndHead(row,faceD,i+1,pts):histEndHeadPro(row,i+1,pts);
    const body=begOn()&&Beg?Beg.histEndBody(row,faceD):histEndBodyPro(row);
    return `<details class="hist-end-row">
      <summary class="hist-end-sum">${esc(head)}</summary>
      ${body?`<div class="hist-end-body">${esc(body)}</div>`:""}
    </details>`;
  }).join("");
  return `<div class="hist-end-list" aria-label="${begOn()?"エンド別の集まり":"End summaries"}">${rows}</div>`;
}
function renderHistory(){
  shell(-1,begOn()?"履歴":"History",backLbl(),(()=>{
    const ss=[...db.sessions].reverse();
    return `${backupBarHtml("bkOutHist","bkInHist")}<div class="app-page">${ss.length?ss.map(s=>`
      <div class="hist-row" data-id="${s.id}"><div><div class="d">${fmtD(s.date)} · ${s.dist}m</div>
        <div class="m">${begOn()?s.ends.length+"回":s.ends.length+"E"}${s.note?" · "+esc(s.note):""}</div></div><div class="pts">${sessTot(s)}</div></div>`).join("")
      :`<div class="empty">${begOn()?"まだ記録がありません":"No sessions yet"}</div>`}</div>`;
  })(),"");
  const bb=$("#backBtn");if(bb)bb.onclick=()=>nav("home");
  const bkHist=$("#bkOutHist");if(bkHist)bkHist.onclick=exportBackup;
  const bkIn=$("#bkInHist");if(bkIn)bkIn.onclick=importBackup;
  $("#body").querySelectorAll(".hist-row").forEach(r=>r.onclick=()=>{ui.histId=r.dataset.id;render();});
}

function renderHistDetail(){
  const s=db.sessions.find(x=>x.id===ui.histId);
  if(!s){ui.histId=null;return renderHistory();}
  const analysis=histSessionAnalysis(s);
  const st=stats(sessArr(s));
  const geoDefs=Geo.GEO_MARKER_DEFS;
  const hsOver=geoDefs+(st?`<g class="geo-layer" pointer-events="none">${Geo.geoSvg(st,s.faceD,null)}</g>`:"");
  shell(-1,`${fmtD(s.date)} · ${s.dist}m · ${sessTot(s)}pt`,backLbl(),`
    ${histSessionSummaryHtml(s,analysis)}
    <div class="tgt-stage hist-detail-target" style="min-height:300px"><div class="box sq-fit"><div class="tgt-stack">${Geo.targetSvg(s.faceD,"hs",hsOver)}</div></div></div>
    ${st&&!begOn()?`<div class="geo-nums" style="position:static;justify-content:center"><span>${mono(st.mx,"x")}</span><span>${mono(st.my,"y")}</span><span>R<b>${st.rr.toFixed(1)}</b></span></div>`:""}
    ${histEndRowsHtml(s,analysis)}`,
    `<button class="btn ghost danger" id="del">削除</button>`);
  const bb=$("#backBtn");if(bb)bb.onclick=()=>{ui.histId=null;render();};
  let mh="";s.ends.forEach((e,i)=>e.forEach(a=>{mh+=Geo.dot(a,s.faceD,`hsl(${120+i*30},50%,45%)`);}));const hm=$("#hsmarks");if(hm)hm.innerHTML=mh;
  $("#del").onclick=()=>{if(confirm("削除？")){db.sessions=db.sessions.filter(x=>x.id!==s.id);save();ui.histId=null;render();}};
}