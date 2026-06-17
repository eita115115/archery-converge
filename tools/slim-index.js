const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "index.html");
let h = fs.readFileSync(file, "utf8");
const start = h.indexOf('<script>\n"use strict";');
const end = h.indexOf("</script>\n</body>");
if (start < 0 || end < 0) {
  console.error("markers not found", start, end);
  process.exit(1);
}
h =
  h.slice(0, start) +
  "<script>\nif(window.ConvergeApp)ConvergeApp.init();\nelse console.error(\"ConvergeApp missing\");\n</script>\n" +
  h.slice(end + "</script>\n".length);
fs.writeFileSync(file, h);
console.log("slimmed index.html");