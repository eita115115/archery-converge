/* ArcheryPhysics — RK4-3D ballistics + robust grouping + sight advice */
(function(root){
"use strict";
const VERSION="RK4-3D";

const DEFAULT_CFG={
  maxSimSteps:5000,rk4Dt:.006,
  trajectoryCacheSize:16,calibrationCacheSize:12
};
let CFG=Object.assign({},DEFAULT_CFG);
const trajCache=new Map();
const pcalCache=new Map();
const regCache=new Map();

function configure(opts){
  if(!opts)return Object.assign({},CFG);
  CFG=Object.assign({},CFG,opts);
  trimCache(trajCache,CFG.trajectoryCacheSize);
  trimCache(pcalCache,CFG.calibrationCacheSize);
  return Object.assign({},CFG);
}
function trimCache(map,max){
  while(map.size>max){
    const k=map.keys().next().value;
    map.delete(k);
  }
}
function clearCaches(){trajCache.clear();pcalCache.clear();regCache.clear();}
function invalidateSetup(setupId){
  const p=String(setupId||"");
  [trajCache,pcalCache,regCache].forEach(map=>{
    map.forEach((_,k)=>{if(k.indexOf(p)>=0)map.delete(k);});
  });
}
function cacheKey(parts){return parts.map(v=>v==null?"":String(v)).join("|");}

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function num(v){const n=parseFloat(v);return Number.isFinite(n)?n:null;}
function normGearText(s){return String(s||"").normalize("NFKC").toUpperCase().replace(/[・_/]+/g," ").replace(/\s+/g," ").trim();}
function median(vals){
  const a=vals.filter(Number.isFinite).sort((x,y)=>x-y);
  if(!a.length)return 0;
  const m=Math.floor(a.length/2);
  return a.length%2?a[m]:(a[m-1]+a[m])/2;
}
function pct(v){return `${Math.round(v*100)}%`;}
/** Must match ConvergeGeometry.ringW — checked by tools/check-app.js */
function ringW(fd){return fd/20;}

function momentStats(arrows,weights){
  const n=arrows.length;if(!n)return null;
  weights=weights||arrows.map(()=>1);
  const sw=weights.reduce((a,w)=>a+w,0);
  if(sw<=0)return momentStats(arrows);
  const mx=arrows.reduce((a,p,i)=>a+p.x*weights[i],0)/sw;
  const my=arrows.reduce((a,p,i)=>a+p.y*weights[i],0)/sw;
  let vx=0,vy=0,cov=0;
  arrows.forEach((p,i)=>{const dx=p.x-mx,dy=p.y-my,w=weights[i];vx+=w*dx*dx;vy+=w*dy*dy;cov+=w*dx*dy;});
  vx/=sw;vy/=sw;cov/=sw;
  const rr=Math.sqrt(Math.max(0,vx+vy));
  const sx=Math.sqrt(Math.max(0,vx)),sy=Math.sqrt(Math.max(0,vy));
  const disc=Math.sqrt(Math.max(0,(vx-vy)**2+4*cov*cov));
  const l1=Math.max(0,(vx+vy+disc)/2),l2=Math.max(0,(vx+vy-disc)/2);
  const major=Math.sqrt(l1),minor=Math.sqrt(l2);
  const angleDeg=(0.5*Math.atan2(2*cov,vx-vy))*180/Math.PI;
  const effN=sw*sw/weights.reduce((a,w)=>a+w*w,0);
  return {n,mx,my,rr,sx,sy,cov,major,minor,angleDeg,effN};
}
function groupStats(arrows){return momentStats(arrows);}
function weightedStats(arrows,weights){return momentStats(arrows,weights);}
function robustScale(vals,center,fallback){
  const dev=vals.map(v=>Math.abs(v-center));
  return Math.max(1.4826*median(dev),fallback||0,.01);
}

function robustStats(arrows){
  const total=arrows.length;if(!total)return null;
  if(total<5){
    const st=groupStats(arrows);
    return Object.assign(st,{used:arrows.slice(),excluded:[],total,method:"simple",confidence:total>=3?.55:.35});
  }
  const cx=median(arrows.map(a=>a.x)),cy=median(arrows.map(a=>a.y));
  const ds=arrows.map(a=>Math.hypot(a.x-cx,a.y-cy));
  const md=median(ds),mad=median(ds.map(d=>Math.abs(d-md)));
  const base=groupStats(arrows);
  const sigma=Math.max(1.4826*mad,base.rr*.35,.01);
  const sx0=robustScale(arrows.map(a=>a.x),cx,base.sx*.45);
  const sy0=robustScale(arrows.map(a=>a.y),cy,base.sy*.45);
  const eds=arrows.map(a=>Math.hypot((a.x-cx)/sx0,(a.y-cy)/sy0));
  const em=median(eds),emad=median(eds.map(d=>Math.abs(d-em)));
  const limit=Math.max(md+3*sigma,md*2.2,base.rr*1.65);
  const eLimit=Math.max(3.15,em+3*Math.max(1.4826*emad,.35));
  let used=[],excluded=[];
  const maxExcluded=Math.floor(total*.25);
  arrows.forEach((a,i)=>{
    const radial=ds[i]>limit&&ds[i]>md+2.4*sigma;
    const elliptical=eds[i]>eLimit&&eds[i]>3.15;
    (radial||elliptical)&&excluded.length<maxExcluded?excluded.push(a):used.push(a);
  });
  if(used.length<Math.max(3,total-excluded.length)){used=arrows.slice();excluded=[];}
  const ux=median(used.map(a=>a.x)),uy=median(used.map(a=>a.y));
  const uds=used.map(a=>Math.hypot(a.x-ux,a.y-uy));
  const udm=median(uds);
  const xScale=robustScale(used.map(a=>a.x),ux,base.sx*.55);
  const yScale=robustScale(used.map(a=>a.y),uy,base.sy*.55);
  const scale=Math.max(udm+3*median(uds.map(d=>Math.abs(d-udm))),base.rr,.01);
  const weights=used.map(a=>{
    const radialU=Math.hypot(a.x-ux,a.y-uy)/scale;
    const ellU=Math.hypot((a.x-ux)/xScale,(a.y-uy)/yScale)/3;
    const u=Math.max(radialU,ellU);
    return u>=1?.05:(1-u*u)**2;
  });
  const st=weightedStats(used,weights);
  const outRate=excluded.length/total;
  const sample=clamp((st.effN-2)/10,.35,1);
  const outPenalty=clamp(1-outRate*1.6,.55,1);
  const skewPenalty=st.minor>0?clamp(st.minor/st.major+.35,.55,1):.7;
  return Object.assign(st,{used,excluded,total,method:"ellipse-biweight",confidence:sample*outPenalty*skewPenalty});
}

function estimatedTotalArrowWeight(setup){
  const explicit=num(setup&&setup.arrowWeight);
  if(explicit!=null)return explicit;
  const gpi=num(setup&&setup.shaftGpi),len=num(setup&&setup.arrowLength);
  if(gpi==null||len==null)return null;
  return gpi*len+(num(setup&&setup.pointWeight)||100)+27;
}
function airDensity(setup){
  const temp=num(setup&&setup.temperature);
  const tC=temp==null?15:temp,tK=tC+273.15;
  const alt=clamp(num(setup&&setup.altitude)||0,-200,4000);
  const hum=clamp((num(setup&&setup.humidity)==null?50:num(setup&&setup.humidity))/100,0,1);
  const pressure=101325*Math.pow(Math.max(.2,1-2.25577e-5*alt),5.25588);
  const sat=610.94*Math.exp((17.625*tC)/(tC+243.04));
  const vapor=clamp(hum*sat,0,pressure*.08);
  const dry=pressure-vapor;
  return clamp(dry/(287.05*tK)+vapor/(461.495*tK),.82,1.32);
}
function estimateArrowCd(setup,diaMm){
  const explicit=num(setup&&setup.arrowCd);
  if(explicit!=null)return clamp(explicit,.55,1.9);
  let cd=diaMm<=4.2?1.03:diaMm<=5.5?1.12:diaMm<=7?1.22:1.34;
  const vane=normGearText(setup&&setup.vane);
  if(/FEATHER|羽根|ナチュラル/.test(vane))cd+=.14;
  else if(/SPIN|WING|XS|GAS PRO|KURLY|ELIVANES/.test(vane))cd+=.07;
  else if(/LOW|TINY|1\.5|1 5/.test(vane))cd-=.03;
  const vh=num(setup&&setup.vaneHeight);
  if(vh!=null)cd+=clamp((vh-1.8)*.045,-.05,.12);
  const foc=num(setup&&setup.foc);
  if(foc!=null&&foc>16)cd+=.015;
  return clamp(cd,.75,1.75);
}
function gearVariation(setup){
  const spread=num(setup&&setup.shaftSetWeightSpread);
  const straight=num(setup&&setup.shaftStraightness);
  const foc=num(setup&&setup.foc);
  const nock=normGearText(setup&&setup.nockFit);
  let penalty=0;
  if(spread!=null)penalty+=clamp(spread/10,0,.16);
  if(straight!=null)penalty+=straight<=.002?.01:straight<=.004?.025:.055;
  if(foc!=null&&(foc<9||foc>18))penalty+=.025;
  if(/ゆる|LOOSE/.test(nock))penalty+=.035;
  if(/きつ|TIGHT/.test(nock))penalty+=.02;
  return {penalty:clamp(penalty,0,.28),confidenceFactor:clamp(1-penalty,.72,1)};
}
function physicsProfile(setup){
  const p=num(setup&&setup.poundage);
  const drawIn=num(setup&&setup.drawLength)||28;
  const massGr=estimatedTotalArrowWeight(setup)||(p?clamp(p*8.4,260,520):330);
  const diaMm=num(setup&&setup.arrowDia)||5.7;
  const speedRaw=num(setup&&setup.arrowSpeed);
  const measuredSpeed=speedRaw!=null;
  const massKg=massGr*.00006479891;
  let speedMps;
  if(measuredSpeed)speedMps=speedRaw>100?speedRaw*.3048:speedRaw;
  else{
    const drawN=(p||36)*4.44822,drawM=drawIn*.0254;
    const stored=.5*drawN*drawM;
    const explicitEff=num(setup&&setup.bowEfficiency);
    const eff=explicitEff!=null?clamp(explicitEff/100,.55,.88):(p&&p>=45?.78:.72);
    speedMps=Math.sqrt(Math.max(1,2*stored*eff/massKg));
  }
  speedMps=clamp(speedMps,35,95);
  const cd=estimateArrowCd(setup||{},diaMm);
  const area=Math.PI*(diaMm/1000/2)**2;
  const rho=airDensity(setup||{});
  const variation=gearVariation(setup||{});
  return {pound:p||null,drawIn,massGr,diaMm,speedMps,speedFps:speedMps/.3048,measuredSpeed,cd,area,massKg,rho,variation};
}
function sessionWindSpeed(sess){
  const v=num(sess&&sess.windSpeed);
  if(v!=null)return clamp(v,0,18);
  return sess&&sess.windDir?2.5:0;
}
function windModel(sess){
  const speed=sessionWindSpeed(sess);
  const dir=String(sess&&sess.windDir||"");
  if(speed<=0)return {speed:0,down:0,side:0,variability:0,known:false,label:"無風"};
  let down=0,side=0,variability=.18,known=true,label=dir||"風";
  if(/向かい/.test(dir)){down=-speed;label="向かい風";}
  else if(/追い/.test(dir)){down=speed;label="追い風";}
  else if(/左から/.test(dir)){side=speed;label="左から";}
  else if(/右から/.test(dir)){side=-speed;label="右から";}
  else if(/巻き/.test(dir)){side=speed*.55;down=-speed*.2;variability=.55;label="巻き風";}
  else{side=speed*.35;variability=.45;known=false;}
  return {speed,down,side,variability,known,label};
}
function simulateArrow(distM,angle,phys,wind){
  wind=wind||{down:0,side:0};
  const k=.5*phys.rho*phys.cd*phys.area/phys.massKg,dt=CFG.rk4Dt,g=9.80665;
  const maxSteps=CFG.maxSimSteps;
  let s={x:0,y:0,z:0,t:0,vx:phys.speedMps*Math.cos(angle),vy:phys.speedMps*Math.sin(angle),vz:0};
  const deriv=a=>{
    const rx=a.vx-(wind.down||0),ry=a.vy,rz=a.vz-(wind.side||0),rv=Math.hypot(rx,ry,rz);
    return {x:a.vx,y:a.vy,z:a.vz,t:1,vx:-k*rv*rx,vy:-g-k*rv*ry,vz:-k*rv*rz};
  };
  const add=(a,d,h)=>({x:a.x+d.x*h,y:a.y+d.y*h,z:a.z+d.z*h,t:a.t+d.t*h,vx:a.vx+d.vx*h,vy:a.vy+d.vy*h,vz:a.vz+d.vz*h});
  const mix=(a,k1,k2,k3,k4)=>{
    const h=dt/6;
    return {x:a.x+h*(k1.x+2*k2.x+2*k3.x+k4.x),y:a.y+h*(k1.y+2*k2.y+2*k3.y+k4.y),z:a.z+h*(k1.z+2*k2.z+2*k3.z+k4.z),t:a.t+dt,
      vx:a.vx+h*(k1.vx+2*k2.vx+2*k3.vx+k4.vx),vy:a.vy+h*(k1.vy+2*k2.vy+2*k3.vy+k4.vy),vz:a.vz+h*(k1.vz+2*k2.vz+2*k3.vz+k4.vz)};
  };
  let prev=s;
  for(let i=0;i<maxSteps&&s.x<distM&&s.y>-100;i++){
    prev=s;
    const k1=deriv(s),k2=deriv(add(s,k1,dt/2)),k3=deriv(add(s,k2,dt/2)),k4=deriv(add(s,k3,dt));
    s=mix(s,k1,k2,k3,k4);
  }
  if(s.x>=distM&&s.x!==prev.x){
    const q=(distM-prev.x)/(s.x-prev.x);
    s={x:distM,y:prev.y+(s.y-prev.y)*q,z:prev.z+(s.z-prev.z)*q,t:prev.t+(s.t-prev.t)*q,
      vx:prev.vx+(s.vx-prev.vx)*q,vy:prev.vy+(s.vy-prev.vy)*q,vz:prev.vz+(s.vz-prev.vz)*q};
  }
  return {y:s.y,z:s.z,t:s.t,speed:Math.hypot(s.vx,s.vy,s.vz)};
}
function solveZeroAngle(distM,phys,wind){
  let lo=-.05,hi=.42;
  const yl=simulateArrow(distM,lo,phys,wind).y,yh=simulateArrow(distM,hi,phys,wind).y;
  if(!(yl<=0&&yh>=0)){
    const v=phys.speedMps,g=9.80665;
    return .5*Math.asin(clamp(g*distM/(v*v),-.95,.95));
  }
  for(let i=0;i<32;i++){
    const mid=(lo+hi)/2,ym=simulateArrow(distM,mid,phys,wind).y;
    if(ym>=0)hi=mid;else lo=mid;
  }
  return (lo+hi)/2;
}
function trajectoryModel(sess,setup,eyeMm){
  const distM=Math.max(5,sess.dist||70);
  const sk=cacheKey(["traj",distM,sess.windDir,sess.windSpeed,eyeMm,setup&&setup.id,
    setup&&setup.poundage,setup&&setup.arrowSpeed,setup&&setup.arrowWeight,setup&&setup.arrowDia]);
  if(trajCache.has(sk))return trajCache.get(sk);
  const phys=physicsProfile(setup||{});
  const wind=windModel(sess||{});
  const angle=solveZeroAngle(distM,phys,wind);
  const base=simulateArrow(distM,angle,phys,wind);
  const dth=.0015;
  const up=simulateArrow(distM,angle+dth,phys,wind);
  const dn=simulateArrow(distM,angle-dth,phys,wind);
  const sens=Math.max(distM*.55,(up.y-dn.y)/(2*dth));
  const mmPerCmV=(.01/sens)*eyeMm;
  const mmPerCmH=(.01/distM)*eyeMm;
  const windDriftCm=base.z*100;
  const windUncertaintyCm=Math.abs(windDriftCm)*(wind.variability||0)+(wind.speed?.35:0);
  const has=k=>String((setup||{})[k]||"").trim();
  const modelScore=clamp((phys.measuredSpeed?.2:.08)+(has("arrowWeight")?.13:.06)+(has("arrowDia")?.11:.05)+(has("temperature")?.07:.03)+(wind.speed?(wind.known?.12:.06):.08),0,1);
  const out={phys,wind,angle,tof:base.t,impactSpeed:base.speed,sens,mmPerCmV,mmPerCmH,windDriftCm,windUncertaintyCm,modelScore,engine:"RK4-3D"};
  trajCache.set(sk,out);
  trimCache(trajCache,CFG.trajectoryCacheSize);
  return out;
}

function weightedMedian(items,fallback){
  const a=items.filter(x=>x&&isFinite(x.v)&&isFinite(x.w)&&x.w>0).sort((x,y)=>x.v-y.v);
  if(!a.length)return fallback==null?null:fallback;
  const half=a.reduce((s,x)=>s+x.w,0)/2;
  let c=0;
  for(const x of a){c+=x.w;if(c>=half)return x.v;}
  return a[a.length-1].v;
}
function regress(pts){
  const n=pts.length;if(n<2)return null;
  const xb=pts.reduce((a,p)=>a+p[0],0)/n,yb=pts.reduce((a,p)=>a+p[1],0)/n;
  let vx=0,cv=0;pts.forEach(p=>{vx+=(p[0]-xb)**2;cv+=(p[0]-xb)*(p[1]-yb);});
  if(vx<1e-9)return null;
  const b=cv/vx,a=yb-b*xb;
  let ss=0,se=0;pts.forEach(p=>{ss+=(p[1]-yb)**2;se+=(p[1]-(a+b*p[0]))**2;});
  return {a,b,zero:Math.abs(b)>1e-9?-a/b:null,r2:ss>1e-9?clamp(1-se/ss,0,1):0,kind:"linear"};
}
function robustLine(pts){
  if(pts.length<2)return null;
  const slopes=[];
  for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){
    const dx=pts[j][0]-pts[i][0];
    if(Math.abs(dx)>1e-9)slopes.push((pts[j][1]-pts[i][1])/dx);
  }
  if(!slopes.length)return null;
  const b=median(slopes),a=median(pts.map(p=>p[1]-b*p[0]));
  const yb=pts.reduce((s,p)=>s+p[1],0)/pts.length;
  let ss=0,se=0;pts.forEach(p=>{ss+=(p[1]-yb)**2;se+=(p[1]-(a+b*p[0]))**2;});
  return {a,b,zero:Math.abs(b)>1e-9?-a/b:null,r2:ss>1e-9?clamp(1-se/ss,0,1):0};
}
function weightedLineFit(pts){
  const clean=pts.map(p=>({x:+p[0],y:+p[1],w:clamp(+p[2]||1,.02,2)})).filter(p=>isFinite(p.x)&&isFinite(p.y)&&p.w>0);
  if(clean.length<2)return null;
  const sw=clean.reduce((a,p)=>a+p.w,0);
  const xb=clean.reduce((a,p)=>a+p.x*p.w,0)/sw,yb=clean.reduce((a,p)=>a+p.y*p.w,0)/sw;
  let vx=0,cv=0;clean.forEach(p=>{vx+=(p.x-xb)*(p.x-xb)*p.w;cv+=(p.x-xb)*(p.y-yb)*p.w;});
  if(Math.abs(vx)<1e-9)return null;
  const b=cv/vx,a=yb-b*xb;
  let ss=0,se=0;clean.forEach(p=>{const e=a+b*p.x;ss+=(p.y-yb)*(p.y-yb)*p.w;se+=(p.y-e)*(p.y-e)*p.w;});
  return {a,b,zero:Math.abs(b)>1e-9?-a/b:null,r2:ss>1e-9?clamp(1-se/ss,0,1):0,n:clean.length,scatter:Math.sqrt(Math.max(0,se/sw)),kind:"weighted"};
}
function robustWeightedLine(pts){
  if(pts.length<2)return null;
  const base=robustLine(pts.map(p=>[p[0],p[1]]));if(!base)return null;
  const residuals=pts.map(p=>p[1]-(base.a+base.b*p[0]));
  const center=median(residuals),scale=Math.max(1.4826*median(residuals.map(r=>Math.abs(r-center))),.05);
  const weighted=pts.map((p,i)=>{
    const u=Math.abs(residuals[i]-center)/(scale*2.5),rw=u>=1?.08:(1-u*u)**2;
    return [p[0],p[1],(+p[2]||1)*rw];
  });
  const fit=weightedLineFit(weighted);
  if(!fit||fit.zero==null||!isFinite(fit.zero))return null;
  fit.kind="weighted-robust";
  fit.quality=clamp((fit.r2||0)*.5+clamp((fit.n-1)/5,0,1)*.28+clamp(fit.weight/Math.max(1,fit.n),.1,1)*.22,0,1);
  return fit;
}

function isWindy(sess){const ws=num(sess&&sess.windSpeed);return ws!=null&&ws>=3.5;}
function classifyWind(sess,st,opts){
  opts=opts||{};
  const wm=windModel(sess||{});
  const windy=isWindy(sess);
  const lateralDominant=!!(st&&st.n&&(st.sx||0)>(st.sy||.01)*1.15);
  const traj=opts.traj;
  const driftCm=opts.driftCm!=null?opts.driftCm:(traj&&traj.windDriftCm)||0;
  let trustPenalty=0;
  if(windy&&lateralDominant)trustPenalty=.5;
  else if(windy)trustPenalty=.2;
  if(wm.variability>.35)trustPenalty=Math.max(trustPenalty,clamp((wm.variability-.18)*.55,.15,.45));
  return {windy,lateralDominant,driftCm,trustPenalty,variability:wm.variability,speed:wm.speed,label:wm.label};
}
function suggestWindReconfirm(sess,adv){
  if(!adv||!adv.st)return false;
  const c=classifyWind(sess,adv.st,{traj:adv.model&&adv.model.traj});
  return c.windy&&c.lateralDominant;
}
function gearPrecisionProfile(s){
  const checks=["arrowWeight","arrowDia","poundage","drawLength","arrowSpeed","temperature"];
  const filled=checks.filter(k=>s&&String(s[k]||"").trim()).length;
  return {score:filled/checks.length,level:filled>=4?"高":filled>=2?"中":"低"};
}
function sessionQuality(sess,setup,st){
  if(!st)return {score:.2,label:"低",reasons:["矢数不足"]};
  const w=ringW(sess.faceD),allN=st.n;
  const sample=clamp((allN-3)/33,0,1);
  const group=clamp(1-st.rr/(w*3.2),0,1);
  let score=(st.confidence||.45)*.52+sample*.18+group*.22+(allN>=6?.08:0);
  const reasons=[];
  if(isWindy(sess)){score*=.86;reasons.push("風");}
  if(st.rr>w*2.6){score*=.82;reasons.push("散り大");}
  if(allN<6)reasons.push("本数少");
  if(setup&&gearPrecisionProfile(setup).score<.45){score*=.94;reasons.push("装備未入力");}
  score=clamp(score,.12,1);
  return {score,label:score>=.72?"高":score>=.48?"中":"低",reasons:reasons.length?reasons:["良好"]};
}
function dirAlign(ax,ay,bx,by){
  const am=Math.hypot(ax,ay),bm=Math.hypot(bx,by);
  if(am<.01||bm<.01)return 0;
  return clamp((ax*bx+ay*by)/(am*bm),-1,1);
}
function personalModel(db,sess,setup,currentSt){
  if(!sess||!currentSt||!db)return null;
  const same=(db.sessions||[]).filter(s=>s.id!==sess.id&&(s.setupId||"")===(sess.setupId||"")&&s.dist===sess.dist&&s.faceD===sess.faceD)
    .sort((a,b)=>(a.date||"").localeCompare(b.date||"")).slice(-8);
  const items=same.map(s=>{
    const st=robustStats((s.ends||[]).flat());
    if(!st||st.n<6)return null;
    const q=sessionQuality(s,setup,st);
    return {st,q,w:q.score};
  }).filter(Boolean);
  if(items.length<2)return {sample:items.length,state:"蓄積中",stability:0};
  let sw=0,mx=0,my=0;
  items.forEach((it,i)=>{const w=it.w*(.72+(i+1)/items.length*.28);sw+=w;mx+=it.st.mx*w;my+=it.st.my*w;});
  mx/=sw;my/=sw;
  const ring=ringW(sess.faceD);
  const align=dirAlign(mx,my,currentSt.mx,currentSt.my);
  const histMag=Math.hypot(mx,my),curMag=Math.hypot(currentSt.mx,currentSt.my);
  const support=histMag>ring*.28&&curMag>ring*.28&&align>.42;
  const conflict=histMag>ring*.28&&curMag>ring*.28&&align<-.25;
  return {sample:items.length,state:support?"過去と一致":conflict?"今回だけ": "観察中",stability:clamp(align*.5+.5,0,1),align};
}
function regressionAdvice(db,setupId,dist){
  const rk=cacheKey(["reg",setupId,dist,(db.sessions||[]).length]);
  if(regCache.has(rk))return regCache.get(rk);
  const setup=(db.setups||[]).find(s=>s.id===setupId);
  const ss=(db.sessions||[]).filter(s=>s.setupId===setupId&&s.dist===dist);
  const res={};
  [["sightNow","my","v"],["sightNow","mx","h"]].forEach(([sk,axis,tag])=>{
    const pts=[];
    ss.forEach((s,i)=>{
      const sight=s[sk]||s.sightStart||{};
      const v=parseFloat(tag==="v"?sight.v:sight.h);
      const st=robustStats((s.ends||[]).flat());
      if(isFinite(v)&&st&&st.n>=6){
        const q=sessionQuality(s,setup,st);
        const recency=.72+(i+1)/Math.max(1,ss.length)*.28;
        const w=clamp(q.score*clamp((st.n-4)/14,.55,1)*recency*(isWindy(s)?.82:1),.06,1);
        pts.push([v,st[axis],w]);
      }
    });
    if(pts.length>=2&&new Set(pts.map(p=>p[0])).size>=2){
      const r=robustWeightedLine(pts)||robustLine(pts);
      if(r&&r.zero!=null&&isFinite(r.zero))res[tag]={zero:r.zero,n:pts.length,r2:r.r2,slope:r.b,quality:r.quality||r.r2||0};
    }
  });
  regCache.set(rk,res);
  trimCache(regCache,CFG.calibrationCacheSize*2);
  return res;
}
function personalPhysicsCalibration(db,setupId,settings){
  if(!setupId||!db)return null;
  const pk=cacheKey(["pcal",setupId,(db.sessions||[]).length,(settings&&settings.eyeSight)||850]);
  if(pcalCache.has(pk))return pcalCache.get(pk);
  const setup=(db.setups||[]).find(s=>s.id===setupId);
  if(!setup)return null;
  const eye=(settings&&settings.eyeSight)||850;
  const sessions=(db.sessions||[]).filter(s=>s.setupId===setupId);
  const windRatios=[],clickV=[],clickH=[];
  sessions.forEach((s,i)=>{
    const st=robustStats((s.ends||[]).flat());
    if(!st||st.n<6)return;
    const wm=windModel(s);
    if(wm.speed&&wm.side){
      const traj=trajectoryModel(s,setup,eye);
      if(Math.abs(traj.windDriftCm)>=.6){
        const ratio=st.mx/traj.windDriftCm;
        if(ratio>0&&ratio<2.6)windRatios.push({v:ratio,w:sessionQuality(s,setup,st).score});
      }
    }
  });
  [...new Set(sessions.map(s=>s.dist).filter(Boolean))].forEach(d=>{
    const r=regressionAdvice(db,setupId,d);
    if(r.v&&Math.abs(r.v.slope)>.05)clickV.push({v:Math.abs(r.v.slope)*70/d,w:clamp(r.v.quality,.05,1)});
    if(r.h&&Math.abs(r.h.slope)>.05)clickH.push({v:Math.abs(r.h.slope)*70/d,w:clamp(r.h.quality,.05,1)});
  });
  const score=clamp(Math.min(sessions.length,12)*.04+Math.min(windRatios.length,6)*.06+Math.min(clickV.length+clickH.length,8)*.05,0,1);
  const out={score,windFactor:weightedMedian(windRatios,1),click:{v70:weightedMedian(clickV,null),h70:weightedMedian(clickH,null)}};
  pcalCache.set(pk,out);
  trimCache(pcalCache,CFG.calibrationCacheSize);
  return out;
}

function adviceModel(db,settings,sess,setup,st){
  const dist=sess.dist,w=ringW(sess.faceD);
  const facePenalty=st.rr>w*2.8?.82:st.rr>w*2?.9:1;
  const gear=gearVariation(setup||{});
  let confidence=clamp((st.confidence||.6)*facePenalty*gear.confidenceFactor,.32,1);
  const nudge=clamp(.45+confidence*.55,.52,1);
  const eye=(settings&&settings.eyeSight)||850;
  const traj=trajectoryModel(sess,setup,eye);
  const pcal=personalPhysicsCalibration(db,setup&&setup.id,settings);
  const p=num(setup&&setup.poundage);
  let vFactor=nudge,hFactor=nudge;
  const wm=windModel(sess);
  if(wm.variability>.35)confidence*=clamp(1-(wm.variability-.35)*.25,.88,1);
  if(traj.wind.speed){
    const drift=traj.windDriftCm*(pcal&&pcal.windFactor||1);
    if(Math.abs(drift)>w*.25&&Math.sign(drift)===Math.sign(st.mx)){hFactor*=.78;confidence*=.92;}
  }
  if(isFinite(p)){if(dist>=50&&p<36)vFactor*=.88;else if(dist>=50&&p>=42)vFactor*=1.04;}
  if(setup&&setup.id){
    const reg=regressionAdvice(db,setup.id,dist);
    if(reg.v&&(reg.v.quality||0)>.5)vFactor*=clamp(.98+(reg.v.quality||0)*.08,.98,1.05);
    if(reg.h&&(reg.h.quality||0)>.5)hFactor*=clamp(.98+(reg.h.quality||0)*.08,.98,1.05);
  }
  return {confidence,vFactor:clamp(vFactor,.45,1.1),hFactor:clamp(hFactor,.45,1.05),traj,pcal,nudge};
}

function adviceForEnd(db,settings,setup,sess,arrows){
  const st=robustStats(arrows);
  if(!st||st.n<3)return null;
  const model=adviceModel(db,settings,sess,setup,st);
  const personal=personalModel(db,sess,setup,st);
  const quality=sessionQuality(sess,setup,st);
  const dist=sess.dist;
  const TH=Math.max(ringW(sess.faceD)/8,st.rr*.1);
  const moves=[];
  if(Math.abs(st.my)>TH){
    const adj=Math.abs(st.my)*model.vFactor,mm=adj*model.traj.mmPerCmV;
    let clicks=null;
    if(setup&&setup.calibV70)clicks=adj/(setup.calibV70*dist/70);
    else if(model.pcal&&model.pcal.click.v70)clicks=adj/(model.pcal.click.v70*dist/70);
    moves.push({axis:"v",dir:st.my>0?"上":"下",cm:adj,mm,clicks,sightDelta:st.my>0?adj:-adj});
  }
  if(Math.abs(st.mx)>TH){
    const adj=Math.abs(st.mx)*model.hFactor,mm=adj*model.traj.mmPerCmH;
    let clicks=null;
    if(setup&&setup.calibH70)clicks=adj/(setup.calibH70*dist/70);
    else if(model.pcal&&model.pcal.click.h70)clicks=adj/(model.pcal.click.h70*dist/70);
    moves.push({axis:"h",dir:st.mx>0?"右":"左",cm:adj,mm,clicks,sightDelta:st.mx>0?adj:-adj});
  }
  const vector=sightVector(moves);
  return {st,moves,vector,model,personal,quality,confidence:model.confidence,needsMove:moves.length>0};
}
function sightVector(moves){
  let h=0,v=0,mmH=0,mmV=0,clicksH=null,clicksV=null;
  moves.forEach(m=>{
    if(m.axis==="h"){h=m.sightDelta;mmH=m.mm;clicksH=m.clicks;}
    if(m.axis==="v"){v=-m.sightDelta;mmV=m.mm;clicksV=m.clicks;}
  });
  return {h,v,mmH,mmV,clicksH,clicksV};
}
function judgementFor(adv,sess){
  if(!adv)return null;
  const st=adv.st,w=ringW(sess.faceD);
  if(!adv.needsMove)return {label:"維持",tone:"ok",scale:0,text:"中心は良好。サイトは触らず確認を重ねる。"};
  if(adv.personal&&adv.personal.state==="今回だけ")return {label:"保留",tone:"hold",scale:.35,text:"過去傾向と逆。追加エンドで再現性を確認。"};
  if(st.n<6||(adv.confidence||0)<.45)return {label:"保留",tone:"hold",scale:.4,text:"本数・信頼度が足りない。1エンド追加してから。"};
  if(st.rr>w*2.8)return {label:"射形優先",tone:"warn",scale:.45,text:"散りが大きい。提案量の半分以下で様子見。"};
  if(suggestWindReconfirm(sess,adv))return {label:"風考慮",tone:"hold",scale:.5,text:"横風の影響あり。無風で再確認が理想。"};
  if(adv.personal&&adv.personal.state==="過去と一致"&&(adv.confidence||0)>=.62)return {label:"動かす",tone:"ok",scale:1,text:"過去傾向と一致。提案量で動かす根拠あり。"};
  if((adv.confidence||0)>=.72&&st.rr<=w*2.2)return {label:"動かす",tone:"ok",scale:1,text:"中心と信頼度が揃った。提案通りに動かす。"};
  return {label:"少量",tone:"mid",scale:.65,text:"傾向は見えた。提案の6〜7割で様子見。"};
}

const ArcheryPhysics=Object.freeze({
  version:VERSION,
  configure,clearCaches,invalidateSetup,
  clamp,median,num,ringW,
  robustStats,groupStats,
  physicsProfile,windModel,simulateArrow,solveZeroAngle,trajectoryModel,
  adviceForEnd,judgementFor,sessionQuality,personalModel,regressionAdvice,personalPhysicsCalibration,
  gearPrecisionProfile,classifyWind,suggestWindReconfirm,isWindy
});
if(typeof module!=="undefined"&&module.exports)module.exports=ArcheryPhysics;
root.ArcheryPhysics=ArcheryPhysics;
})(typeof globalThis!=="undefined"?globalThis:typeof window!=="undefined"?window:this);