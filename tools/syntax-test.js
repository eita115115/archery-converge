const n = 0;
try {
  eval('const html = `<button ${n?``:`disabled`}>x</button>`;');
  console.log("line303 pattern: OK");
} catch (e) {
  console.log("line303 pattern: FAIL", e.message);
}
try {
  const s = { note: "hi", ends: [1] };
  const html = `<div>${s.ends.length}E${s.note ? ` · ${s.note}` : ""}</div>`;
  console.log("line293 pattern: OK", html);
} catch (e) {
  console.log("line293 pattern: FAIL", e.message);
}