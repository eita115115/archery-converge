/* ConvergeApp — backup / import */
function backupBarHtml(exportId,importId){
  const b=begOn();
  const nudge=Eng.storage.sessionNudge(db);
  const strong=nudge.level==="strong";
  const warn=strong?(b&&Beg?Beg.storageNudgeBarWarn(nudge):`${nudge.count} sessions — export soon`):(b?"記録はこの端末のみ":"Data stays on this device");
  const sub=strong?(b&&Beg?Beg.storageNudgeBarSub():"Export a backup to free device storage"):(b?"書き出しと読み込みで機種をまたいで移せます":"Export and import to move between devices");
  return `<div class="backup-bar${strong?" backup-bar-strong":""}">
    <div class="backup-bar-copy">
      <p class="backup-bar-warn">${esc(warn)}</p>
      <p class="backup-bar-sub">${esc(sub)}</p>
    </div>
    <div class="backup-bar-actions">
      <button type="button" class="btn ghost backup-bar-btn" id="${exportId}">${b?"書き出す":"Export"}</button>
      ${importId?`<button type="button" class="btn button-secondary backup-bar-btn" id="${importId}">${b?"読み込む":"Import"}</button>`:""}
    </div>
  </div>`;
}
function backupPayload(){
  return{
    exportVersion:EXPORT_VERSION,
    appVersion:APP_VER,
    exportedAt:new Date().toISOString(),
    schemaVersion:db.schemaVersion,
    setups:db.setups,
    sightMarks:db.sightMarks,
    sessions:db.sessions,
    active:db.active,
    settings:db.settings
  };
}
function parseImportPayload(raw){
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

function exportBackup(){
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([JSON.stringify(backupPayload(),null,2)],{type:"application/json"}));
  a.download="converge-backup-"+today()+".json";
  a.click();
  db.settings.hasExported=true;
  save();
  const n=db.sessions.length;
  toast(begOn()?`バックアップを保存（${n}件）`:`Exported (${n} sessions)`);
  if(ui.screen==="done")render();
}
function importBackup(){
  const inp=document.createElement("input");
  inp.type="file";inp.accept=".json,application/json";
  inp.onchange=()=>{
    const f=inp.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=()=>{
      try{
        if(!confirm(begOn()?"今のデータを上書きします。よろしいですか？":"Replace all data?"))return;
        const parsed=JSON.parse(r.result);
        db=Object.assign(blankDb(),parseImportPayload(parsed));
        db.settings=Object.assign({eyeSight:850,beginnerMode:true},db.settings||{});
        if(Eng&&Eng.storage&&Eng.storage.migrateDb)db=Eng.storage.migrateDb(db);
        db.active=normalizeActive(db.active);
        (db.sessions||[]).forEach(s=>{if(!Array.isArray(s.ends))s.ends=[];});
        const n=db.sessions.length;
        engineBump();save();toast(begOn()?`${n}件の練習を読み込みました`:`Imported ${n} sessions`);render();
      }catch(e){toast(begOn()?"ファイルが読めません":"Invalid file");}
    };
    r.readAsText(f);
  };
  inp.click();
}