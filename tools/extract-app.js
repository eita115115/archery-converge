const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const m = html.match(/<script>\s*"use strict";([\s\S]*)<\/script>\s*<\/body>/);
if (!m) {
  console.error("inline script not found");
  process.exit(1);
}
let s =
  '"use strict";\nconst Geo=window.ConvergeGeometry;\nif(!Geo)throw new Error("ConvergeGeometry required");\n' +
  m[1];

s = s.replace(/const KEY="archeryConverge\.v1", APP_VER=\d+;/, 'const KEY="archeryConverge.v1", APP_VER=10;');

const strip = [
  /function ringW\(fd\)\{return fd\/20;\}\n/,
  /function arrR\(fd\)\{return fd\/85;\}\n/,
  /function lineR\(fd\)\{return arrR\(fd\)\+fd\/1200;\}\n/,
  /function scoreAt\(x,y,fd,t\)\{[\s\S]*?\}\n/,
  /function rank\(h\)\{return h\.s\*2\+\(h\.X\?1:0\);\}\n/,
  /function lineCut\(x,y,fd\)\{return rank\(scoreAt\(x,y,fd,lineR\(fd\)\)\)>rank\(scoreAt\(x,y,fd,0\)\);\}\n/,
  /function hitAt\(x,y,fd\)\{return Object\.assign\(\{x,y\},scoreAt\(x,y,fd,lineR\(fd\)\)\);\}\n/,
  /function lbl\(a\)\{return a\.s===0\?"M":a\.X\?"X":String\(a\.s\);\}\n/,
  /function targetSvg\(fd,id,overlays\)\{[\s\S]*?\}\n/,
  /function dot\(a,fd,c,l\)\{[\s\S]*?\+`\<\/g>`;\}\n/,
  /function geoSvg\(st,fd,sug\)\{[\s\S]*?return h;\n\}\n/,
  /function slotRingSvg\(cur,pe,fd\)\{[\s\S]*?return s;\n\}\n/,
  /function recordGuideSvg\(fd,n,pe\)\{[\s\S]*?`<\/g>`;\n\}\n/,
  /function physBadgeHtml\(j\)\{[\s\S]*?\}\n/,
  /function moveHintHtml\(adv\)\{[\s\S]*?\}\n/,
  /function trajHintHtml\(adv\)\{[\s\S]*?\}\n/,
];

strip.forEach(re => {
  s = s.replace(re, "");
});

s = s.replace(
  /\b(ringW|arrR|lineR|hitAt|lineCut|lbl|targetSvg|dot|geoSvg|slotRingSvg)\(/g,
  "Geo.$1("
);
s = s.replace(/\brecordGuideSvg\(/g, "Geo.recordGuideSvg(");
s = s.replace(/faceD:dist>=60\?122:dist<=18\?40:80/g, "faceD:Geo.faceDForDist(dist)");
s = s.replace(/const M=s\.faceD\/2\*1\.18/g, "const M=Geo.marginRadius(s.faceD)");
s = s.replace(
  /const geoDefs=`<defs><marker id="geoArr"[\s\S]*?<\/defs>`;/g,
  "const geoDefs=Geo.GEO_MARKER_DEFS;"
);

s = s.replace(
  /if\(Cx\)Cx\.init\(\);\nblockZoom\(\);checkUp\(\);render\(\);/,
  "window.ConvergeApp={init:function(){if(Cx)Cx.init();blockZoom();checkUp();render();}};"
);

fs.writeFileSync(path.join(__dirname, "..", "app.js"), s);
console.log("wrote app.js", s.length, "bytes");