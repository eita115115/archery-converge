/* ConvergeApp — router & bootstrap */
function nav(screen){ui.screen=screen;ui.histId=null;ui.adj=false;ui._coachBump={};ui._legendBump={};render();}

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
      <button class="btn hero" id="errReset">練習データをリセット</button></div>`,"");
    const er=$("#errReset");if(er)er.onclick=()=>{db.active=null;save();ui.screen="home";render();};
    afterRender();
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

if("serviceWorker"in navigator&&(location.protocol==="https:"||location.hostname==="localhost")){
  navigator.serviceWorker.register("sw.js").catch(()=>{});
}
function checkUp(){if(location.protocol==="file:")return;fetch("version.json?"+Date.now(),{cache:"no-store"}).then(r=>r.json()).then(j=>{const b=$("#updBar");if(b&&j?.v>APP_VER)b.hidden=false;}).catch(()=>{});}
$("#updBar").onclick=()=>location.reload();
document.addEventListener("visibilitychange",()=>{if(!document.hidden)checkUp();});
window.onerror=(msg,src,line)=>{toast("ERR:"+line);console.error(msg,src,line);};
function clearStaticLanding(){const el=$("#staticLanding");if(el)el.remove();}
window.ConvergeApp={init:function(){clearStaticLanding();if(Cx)Cx.init();blockZoom();checkUp();render();}};
