/* ConvergeCompat — viewport, layout, SVG, polyfills */
(function(root){
"use strict";
if(!Math.hypot){
  Math.hypot=function(){var s=0,i;for(i=0;i<arguments.length;i++)s+=arguments[i]*arguments[i];return Math.sqrt(s);};
}
if(!Array.prototype.flat){
  Array.prototype.flat=function(depth){
    depth=depth===undefined?1:depth;
    var out=[];
    (function flat(a,d){
      for(var i=0;i<a.length;i++){
        if(d>0&&Array.isArray(a[i]))flat(a[i],d-1);else out.push(a[i]);
      }
    })(this,depth);
    return out;
  };
}

function appHeight(){
  var vv=root.visualViewport;
  return vv&&vv.height?vv.height:root.innerHeight||document.documentElement.clientHeight||0;
}
function setViewportVars(){
  var h=appHeight(),doc=document.documentElement;
  if(h>0){
    doc.style.setProperty("--app-h",h+"px");
    doc.style.setProperty("--vh",h*0.01+"px");
  }
}
function debounce(fn,ms){
  var t;return function(){clearTimeout(t);t=setTimeout(fn,ms);};
}
function svgClientToLocal(svg,x,y){
  if(!svg)return{x:0,y:0};
  var ctm=svg.getScreenCTM&&svg.getScreenCTM();
  if(!ctm)return{x:0,y:0};
  if(svg.createSVGPoint&&ctm.inverse){
    try{
      var p=svg.createSVGPoint();p.x=x;p.y=y;
      var r=p.matrixTransform(ctm.inverse());
      return{x:r.x,y:-r.y};
    }catch(e){}
  }
  var a=ctm.a,b=ctm.b,c=ctm.c,d=ctm.d,e=ctm.e,f=ctm.f;
  var det=a*d-b*c;
  if(Math.abs(det)<1e-12)return{x:0,y:0};
  var ia=d/det,ib=-b/det,ic=-c/det,id=a/det;
  var ie=(c*f-d*e)/det,ifv=(b*e-a*f)/det;
  return{x:ia*x+ic*y+ie,y:-(ib*x+id*y+ifv)};
}
function sizeSquare(box,host,maxSide){
  if(!box||!host)return;
  var w=host.clientWidth,h=host.clientHeight;
  if(w<40||h<40)return;
  var lim=maxSide||Math.min(root.innerWidth||w,w);
  var s=Math.floor(Math.min(w,h,lim)*0.96);
  if(s<72)return;
  box.style.width=s+"px";
  box.style.height=s+"px";
  box.style.maxWidth=s+"px";
  box.style.maxHeight=s+"px";
}
function layoutFit(){
  var i,box,host,dist,wrap,ds,dials,dial,cell,stage;
  var setupBody=document.querySelector(".frame.fit.setup-fit #body");
  var setupScroll=setupBody?setupBody.scrollTop:0;
  var squares=document.querySelectorAll(".sq-fit");
  for(i=0;i<squares.length;i++){
    box=squares[i];
    stage=box.closest(".tgt-stage");
    host=stage||box.closest(".ret-split .cell")||box.parentElement;
    sizeSquare(box,host,stage?Math.min((root.innerWidth||480)-12,500):undefined);
  }
  dials=document.querySelectorAll(".frame.fit .sight-dial svg");
  for(i=0;i<dials.length;i++){
    dial=dials[i];cell=dial.closest(".cell");
    if(cell&&cell.clientHeight>48)dial.style.maxHeight=Math.floor(cell.clientHeight*0.92)+"px";
  }
  dist=document.querySelector(".frame.fit .dist-svg");
  if(dist){
    wrap=dist.closest(".dist-wrap");
    if(wrap){
      ds=Math.floor(Math.min(wrap.clientWidth,wrap.clientHeight,300));
      if(ds>100){dist.style.width=ds+"px";dist.style.height=ds+"px";}
    }
  }
  if(setupBody&&setupScroll>0)setupBody.scrollTop=setupScroll;
}
var debounced=debounce(function(){setViewportVars();layoutFit();},60);
function initCompat(){
  setViewportVars();
  root.addEventListener("resize",debounced,false);
  root.addEventListener("orientationchange",debounced,false);
  if(root.visualViewport)root.visualViewport.addEventListener("resize",debounced);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(layoutFit).catch(function(){});
}
root.ConvergeCompat={
  init:initCompat,
  setViewportVars:setViewportVars,
  layoutFit:layoutFit,
  svgClientToLocal:svgClientToLocal,
  appHeight:appHeight
};
})(typeof window!=="undefined"?window:this);