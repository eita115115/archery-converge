/* ConvergeGeometry — scoring + target coordinate system (single source of truth for UI layers)
 * Change here: ring size, viewBox, marks/slots/geo alignment, faceD mapping.
 * Run: npm run check:app — invariants + ringW parity with physics.js are enforced. */
(function (root) {
  "use strict";

  /** All target SVG layers MUST share this viewBox (marks, slots, geo overlays). */
  var VIEW_MARGIN = 1.18;
  /** Outer progress ring sits just outside the scoring face (not viewBox margin). */
  var SLOT_OUTER_PAD = 0.55;

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }
  function ringW(fd) {
    return fd / 20;
  }
  function arrR(fd) {
    return fd / 85;
  }
  function lineR(fd) {
    return arrR(fd) + fd / 1200;
  }
  function marginRadius(fd) {
    return (fd / 2) * VIEW_MARGIN;
  }
  function slotRadius(fd) {
    return fd / 2 + ringW(fd) * SLOT_OUTER_PAD;
  }
  function viewBoxFor(fd, zoom) {
    var M = marginRadius(fd) / (zoom == null || zoom < 1 ? 1 : zoom);
    return { M: M, minX: -M, minY: -M, width: 2 * M, height: 2 * M, str: -M + " " + -M + " " + 2 * M + " " + 2 * M };
  }
  function faceDForDist(dist) {
    return dist >= 60 ? 122 : dist <= 18 ? 40 : 80;
  }
  function mathToSvg(x, y) {
    return { x: x, y: -y };
  }
  function svgToMath(x, y) {
    return { x: x, y: -y };
  }
  function clampMathXY(fd, x, y) {
    var M = marginRadius(fd);
    return { x: clamp(x, -M, M), y: clamp(y, -M, M) };
  }

  function scoreAt(x, y, fd, t) {
    var w = ringW(fd),
      r = Math.max(0, Math.hypot(x, y) - (t != null ? t : lineR(fd)));
    if (r <= w / 2) return { s: 10, X: true };
    var s = 11 - Math.ceil(r / w);
    return { s: clamp(s, 0, 10), X: false };
  }
  function rank(h) {
    return h.s * 2 + (h.X ? 1 : 0);
  }
  function lineCut(x, y, fd) {
    return rank(scoreAt(x, y, fd, lineR(fd))) > rank(scoreAt(x, y, fd, 0));
  }
  function hitAt(x, y, fd) {
    return Object.assign({ x: x, y: y }, scoreAt(x, y, fd, lineR(fd)));
  }
  function lbl(a) {
    return a.s === 0 ? "M" : a.X ? "X" : String(a.s);
  }

  var GEO_MARKER_DEFS =
    '<defs><marker id="geoArr" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">' +
    '<path d="M0,0 L5,2.5 L0,5 Z" fill="var(--sight)"/></marker></defs>';

  /** WA的の金ゾーン（9・10）だけで6本そろい = 全金 */
  function isZenkinEnd(arrows, pe) {
    pe = pe == null ? 6 : pe;
    if (!arrows || arrows.length !== pe) return false;
    for (var i = 0; i < arrows.length; i++) if (arrows[i].s < 9) return false;
    return true;
  }

  var SPORT_FACE = [
    [10, "#f5f3ee", "#222"],
    [9, "#f5f3ee", "#222"],
    [8, "#222", "#3a3a32"],
    [7, "#222", "#3a3a32"],
    [6, "#3d8fd4", "#222"],
    [5, "#3d8fd4", "#222"],
    [4, "#c73e3a", "#222"],
    [3, "#c73e3a", "#222"],
    [2, "#d4a72c", "#222"],
    [1, "#d4a72c", "#222"],
  ];

  /** Ref-driven palette: creamy outer skin → glossy pink areola (refs/oppai) */
  var OPPAI_FACE = [
    [10, "#FFF5F0", "#f0d4c8"],
    [9, "#FEE7D9", "#e8c8b8"],
    [8, "#FDD8CC", "#e0b8a8"],
    [7, "#FCC8BE", "#d8a898"],
    [6, "#F5B8B0", "#d09890"],
    [5, "#ECA8A8", "#c88888"],
    [4, "#E4989C", "#c07880"],
    [3, "#D88890", "#b07078"],
    [2, "#CC7888", "#a86872"],
    [1, "#C06878", "#a05868"],
  ];

  function targetFaceSvg(fd, id, mode) {
    var w = ringW(fd),
      R = fd / 2,
      sw = R / 280,
      rings = mode === "oppai" ? OPPAI_FACE : SPORT_FACE,
      g = "",
      i,
      pair,
      k,
      f,
      st;
    if (mode === "oppai") {
      g +=
        "<defs>" +
        '<radialGradient id="' +
        id +
        'are" cx="50%" cy="44%" r="58%">' +
        '<stop offset="0%" stop-color="#b86878"/>' +
        '<stop offset="34%" stop-color="#d08088"/>' +
        '<stop offset="70%" stop-color="#e8a8a8" stop-opacity=".88"/>' +
        '<stop offset="100%" stop-color="#f5c8c8" stop-opacity=".22"/>' +
        "</radialGradient>" +
        '<radialGradient id="' +
        id +
        'nip" cx="48%" cy="36%" r="68%">' +
        '<stop offset="0%" stop-color="#9a5060"/>' +
        '<stop offset="42%" stop-color="#b86878"/>' +
        '<stop offset="100%" stop-color="#8f4858"/>' +
        "</radialGradient>" +
        '<radialGradient id="' +
        id +
        'vol" cx="62%" cy="26%" r="80%">' +
        '<stop offset="0%" stop-color="#fff" stop-opacity=".5"/>' +
        '<stop offset="26%" stop-color="#fff" stop-opacity=".16"/>' +
        '<stop offset="52%" stop-color="#fff" stop-opacity=".04"/>' +
        '<stop offset="100%" stop-color="#c87878" stop-opacity=".14"/>' +
        "</radialGradient>" +
        '<radialGradient id="' +
        id +
        'shd" cx="50%" cy="90%" r="46%">' +
        '<stop offset="0%" stop-color="#8a5868" stop-opacity=".2"/>' +
        '<stop offset="100%" stop-color="#8a5868" stop-opacity="0"/>' +
        "</radialGradient></defs>";
    }
    for (i = 0; i < rings.length; i++) {
      pair = rings[i];
      k = pair[0];
      f = pair[1];
      st = pair[2];
      g +=
        '<circle cx="0" cy="0" r="' +
        k * w +
        '" fill="' +
        f +
        '" stroke="' +
        st +
        '" stroke-width="' +
        (mode === "oppai" ? sw * 0.42 : sw) +
        '"/>';
    }
    if (mode === "oppai") {
      var ar = w * 2.85;
      g +=
        '<circle cx="0" cy="0" r="' +
        10 * w +
        '" fill="url(#' +
        id +
        'shd)" pointer-events="none"/>' +
        '<circle cx="0" cy="0" r="' +
        ar +
        '" fill="url(#' +
        id +
        'are)" opacity=".93" pointer-events="none"/>' +
        '<circle cx="0" cy="0" r="' +
        ar +
        '" fill="none" stroke="#a06068" stroke-width="' +
        sw * 0.45 +
        '" opacity=".32" pointer-events="none"/>' +
        '<ellipse cx="0" cy="' +
        -w * 0.06 +
        '" rx="' +
        w * 0.34 +
        '" ry="' +
        w * 0.5 +
        '" fill="url(#' +
        id +
        'nip)" stroke="#7a3848" stroke-width="' +
        sw * 0.6 +
        '"/>' +
        '<ellipse cx="' +
        w * 0.07 +
        '" cy="' +
        -w * 0.21 +
        '" rx="' +
        w * 0.1 +
        '" ry="' +
        w * 0.07 +
        '" fill="#fff" opacity=".58" pointer-events="none"/>' +
        '<circle cx="0" cy="0" r="' +
        10 * w +
        '" fill="url(#' +
        id +
        'vol)" pointer-events="none"/>' +
        '<ellipse cx="' +
        w * 2.8 +
        '" cy="' +
        -w * 4.2 +
        '" rx="' +
        w * 2.5 +
        '" ry="' +
        w * 1.7 +
        '" fill="#fff" opacity=".36" pointer-events="none"/>' +
        '<ellipse cx="' +
        w * 0.35 +
        '" cy="' +
        -w * 3.2 +
        '" rx="' +
        w * 0.2 +
        '" ry="' +
        w * 2.9 +
        '" fill="#fff" opacity=".2" pointer-events="none"/>' +
        '<ellipse cx="' +
        -w * 0.9 +
        '" cy="' +
        -w * 3.8 +
        '" rx="' +
        w * 1.9 +
        '" ry="' +
        w * 1.15 +
        '" fill="#fff" opacity=".3" pointer-events="none"/>' +
        '<circle cx="' +
        w * 0.09 +
        '" cy="' +
        -w * 0.3 +
        '" r="' +
        w * 0.11 +
        '" fill="#fff" opacity=".48" pointer-events="none"/>' +
        '<circle cx="' +
        w * 0.11 +
        '" cy="' +
        -w * 0.33 +
        '" r="' +
        w * 0.04 +
        '" fill="#fff" opacity=".82" pointer-events="none"/>' +
        '<circle cx="' +
        -w * 2.1 +
        '" cy="' +
        -w * 3.5 +
        '" r="' +
        w * 0.14 +
        '" fill="#fff" opacity=".38" pointer-events="none"/>' +
        '<circle cx="' +
        -w * 1.94 +
        '" cy="' +
        -w * 3.62 +
        '" r="' +
        w * 0.05 +
        '" fill="#fff" opacity=".72" pointer-events="none"/>' +
        '<circle cx="' +
        w * 3.2 +
        '" cy="' +
        -w * 2.4 +
        '" r="' +
        w * 0.11 +
        '" fill="#fff" opacity=".32" pointer-events="none"/>' +
        '<circle cx="' +
        w * 3.29 +
        '" cy="' +
        -w * 2.49 +
        '" r="' +
        w * 0.04 +
        '" fill="#fff" opacity=".68" pointer-events="none"/>';
    } else {
      g += '<circle cx="0" cy="0" r="' + w / 2 + '" fill="none" stroke="#222" stroke-width="' + sw + '"/>';
      g +=
        '<line x1="' +
        -w / 5 +
        '" y1="0" x2="' +
        w / 5 +
        '" y2="0" stroke="#222" stroke-width="' +
        sw +
        '"/>';
      g +=
        '<line x1="0" y1="' +
        -w / 5 +
        '" x2="0" y2="' +
        w / 5 +
        '" stroke="#222" stroke-width="' +
        sw +
        '"/>';
    }
    return g;
  }

  function targetSvg(fd, id, overlays, mode) {
    var vb = viewBoxFor(fd),
      face = mode === "oppai" ? "oppai" : "sport";
    return (
      '<svg class="face' +
      (face === "oppai" ? " oppai" : "") +
      '" id="' +
      id +
      'svg" viewBox="' +
      vb.str +
      '" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">' +
      '<g id="' +
      id +
      'g"><g id="' +
      id +
      'face">' +
      targetFaceSvg(fd, id, face) +
      "</g>" +
      (overlays || "") +
      '<g id="' +
      id +
      'marks"></g><g id="' +
      id +
      'cur"></g></g></svg>'
    );
  }

  /** archery-note markCircle — arrowMarkRadius = faceD/85 (= arrR) */
  function arrowMarkRadius(fd) {
    return arrR(fd);
  }

  function isLineCut(x, y, fd) {
    return lineCut(x, y, fd);
  }

  function dotCutRing(p, r, sw) {
    return (
      '<circle class="cut-ring" cx="' +
      p.x +
      '" cy="' +
      p.y +
      '" r="' +
      (r + sw * 0.65) +
      '" fill="none" stroke="var(--gold)" stroke-width="' +
      (sw * 0.95) +
      '" stroke-dasharray="' +
      (r * 0.42) +
      " " +
      (r * 0.28) +
      '" opacity=".95"/>'
    );
  }

  function dot(a, fd, c, l) {
    var r = arrowMarkRadius(fd),
      p = mathToSvg(a.x, a.y),
      sw = r / 4,
      cut = a.cut != null ? !!a.cut : lineCut(a.x, a.y, fd);
    return (
      '<g class="mark-scored' +
      (cut ? " mark-cut" : " mark-solid") +
      '" opacity=".92">' +
      (cut ? dotCutRing(p, r, sw) : "") +
      '<circle cx="' +
      p.x +
      '" cy="' +
      p.y +
      '" r="' +
      r +
      '" fill="' +
      c +
      '" stroke="' +
      (cut ? "var(--gold)" : "#fff") +
      '" stroke-width="' +
      sw +
      '"/>' +
      (l
        ? '<text x="' +
          p.x +
          '" y="' +
          p.y +
          '" font-size="' +
          r * 1.2 +
          '" fill="#fff" text-anchor="middle" dominant-baseline="central" font-weight="bold">' +
          l +
          "</text>"
        : "") +
      "</g>"
    );
  }

  /** Live preview while dragging — same footprint as dot(); fine+cut colors like archery-note. */
  function previewMark(x, y, fd, fine, cut) {
    var h = hitAt(x, y, fd),
      p = mathToSvg(x, y),
      r = arrowMarkRadius(fd),
      sw = r / 4,
      lab = lbl(h),
      inner = fine ? "var(--preview-fine)" : "var(--preview-fill)",
      edge = fine ? (cut ? "var(--cut-ok)" : "var(--cut-miss)") : cut ? "var(--gold)" : "#fff";
    return (
      '<g class="preview-mark' +
      (cut ? " preview-cut" : " preview-solid") +
      '" pointer-events="none" opacity=".92">' +
      (cut ? dotCutRing(p, r, sw) : "") +
      '<circle cx="' +
      p.x +
      '" cy="' +
      p.y +
      '" r="' +
      r +
      '" fill="' +
      inner +
      '" stroke="' +
      edge +
      '" stroke-width="' +
      (fine ? sw * 1.15 : sw) +
      '"/>' +
      '<text x="' +
      p.x +
      '" y="' +
      p.y +
      '" font-size="' +
      r * 1.2 +
      '" fill="#fff" text-anchor="middle" dominant-baseline="central" font-weight="bold">' +
      lab +
      "</text></g>"
    );
  }

  function geoSvg(st, fd, sug) {
    if (!st) return "";
    var M = marginRadius(fd),
      w = fd / 500,
      h = "";
    h +=
      '<line x1="' +
      -M +
      '" y1="0" x2="' +
      M +
      '" y2="0" stroke="var(--geo-axis)" stroke-width="' +
      w +
      '" opacity=".35"/>';
    h +=
      '<line x1="0" y1="' +
      -M +
      '" x2="0" y2="' +
      M +
      '" stroke="var(--geo-axis)" stroke-width="' +
      w +
      '" opacity=".35"/>';
    if (st.major && st.minor) {
      var sp = mathToSvg(st.mx, st.my);
      h +=
        '<ellipse cx="' +
        sp.x +
        '" cy="' +
        sp.y +
        '" rx="' +
        st.major +
        '" ry="' +
        st.minor +
        '" transform="rotate(' +
        -st.angleDeg +
        " " +
        sp.x +
        " " +
        sp.y +
        ')" fill="var(--geo-fill)" stroke="var(--geo-group)" stroke-width="' +
        fd / 380 +
        '" opacity="1" stroke-dasharray="' +
        fd / 40 +
        " " +
        fd / 55 +
        '"/>';
    }
    var cp = mathToSvg(st.mx, st.my);
    h +=
      '<circle cx="' +
      cp.x +
      '" cy="' +
      cp.y +
      '" r="' +
      st.rr +
      '" fill="none" stroke="var(--geo-group)" stroke-width="' +
      fd / 340 +
      '" opacity=".95" stroke-dasharray="' +
      fd / 35 +
      " " +
      fd / 50 +
      '"/>';
    h +=
      '<circle cx="' +
      cp.x +
      '" cy="' +
      cp.y +
      '" r="' +
      fd / 90 +
      '" fill="var(--geo-center)" stroke="#fff" stroke-width="' +
      fd / 700 +
      '"/>';
    if (sug && (sug.h || sug.v)) {
      var L = Math.min(M * 0.38, Math.hypot(sug.h, sug.v) * 0.16 + 6);
      var ang = Math.atan2(-sug.v, sug.h),
        ex = Math.cos(ang) * L,
        ey = Math.sin(ang) * L;
      h +=
        '<line x1="0" y1="0" x2="' +
        ex +
        '" y2="' +
        ey +
        '" stroke="var(--sight)" stroke-width="' +
        fd / 320 +
        '" marker-end="url(#geoArr)"/>';
    }
    return h;
  }

  function slotRingSvg(cur, pe, fd) {
    var R = slotRadius(fd),
      seg = 360 / pe,
      gap = 4,
      sw = fd / 100,
      fs = fd / 19,
      s = "",
      i;
    for (i = 0; i < pe; i++) {
      var a0 = ((i * seg - 90 + gap / 2) * Math.PI) / 180,
        a1 = (((i + 1) * seg - 90 - gap / 2) * Math.PI) / 180;
      var x1 = R * Math.cos(a0),
        y1 = -R * Math.sin(a0),
        x2 = R * Math.cos(a1),
        y2 = -R * Math.sin(a1);
      var hit = cur[i],
        active = i === cur.length;
      var col = hit ? "var(--slot-done)" : active ? "var(--slot-active)" : "var(--slot-idle)";
      var op = hit ? 0.9 : active ? 0.55 : 0.28;
      s +=
        '<path d="M' +
        x1 +
        " " +
        y1 +
        " A " +
        R +
        " " +
        R +
        ' 0 0 1 ' +
        x2 +
        " " +
        y2 +
        '" fill="none" stroke="' +
        col +
        '" stroke-width="' +
        (active ? sw * 1.35 : sw) +
        '" opacity="' +
        op +
        '" stroke-linecap="round"/>';
      if (active && !hit) {
        var mid = (a0 + a1) / 2,
          tx = (R + ringW(fd) * 0.15) * Math.cos(mid),
          ty = -(R + ringW(fd) * 0.15) * Math.sin(mid);
        s +=
          '<text x="' +
          tx +
          '" y="' +
          ty +
          '" font-size="' +
          fs +
          '" fill="var(--slot-active)" text-anchor="middle" dominant-baseline="central" font-weight="600">' +
          (i + 1) +
          "</text>";
      }
    }
    return s;
  }

  function recordGuideSvg(fd, n, pe) {
    if (n >= pe) return "";
    var M = marginRadius(fd),
      y = M * 0.62,
      s = fd / 22,
      g = fd / 14;
    return (
      '<g class="rec-guide" opacity=".82" pointer-events="none">' +
      '<g transform="translate(' +
      -g * 2.2 +
      "," +
      y +
      ')"><circle r="' +
      s +
      '" fill="none" stroke="var(--hit)" stroke-width="' +
      fd / 500 +
      '"/>' +
      '<circle r="' +
      s * 0.32 +
      '" fill="var(--hit)"/><text y="' +
      s * 1.65 +
      '" font-size="' +
      fd / 34 +
      '" fill="var(--dim)" text-anchor="middle">タップ</text></g>' +
      '<g transform="translate(0,' +
      y +
      ')"><circle r="' +
      s +
      '" fill="none" stroke="var(--warn)" stroke-width="' +
      fd / 500 +
      '" stroke-dasharray="' +
      fd / 70 +
      " " +
      fd / 50 +
      '"/>' +
      '<circle r="' +
      s * 0.55 +
      '" fill="none" stroke="var(--warn)" stroke-width="' +
      fd / 600 +
      '"/><text y="' +
      s * 1.65 +
      '" font-size="' +
      fd / 34 +
      '" fill="var(--dim)" text-anchor="middle">長押し</text></g>' +
      '<g transform="translate(' +
      g * 2.2 +
      "," +
      y +
      ')"><path d="M' +
      -s * 0.7 +
      " 0 A" +
      s * 0.7 +
      " " +
      s * 0.7 +
      ' 0 0 1 ' +
      s * 0.7 +
      ' 0" fill="none" stroke="var(--text)" stroke-width="' +
      fd / 450 +
      '" opacity=".6"/>' +
      '<text y="' +
      s * 1.65 +
      '" font-size="' +
      fd / 34 +
      '" fill="var(--dim)" text-anchor="middle">射順</text></g>' +
      "</g>"
    );
  }

  function runInvariants() {
    var errs = [],
      fd = 122,
      vb,
      c,
      p,
      back;
    vb = viewBoxFor(fd);
    if (Math.abs(vb.minX + vb.M) > 1e-9 || Math.abs(vb.width - 2 * vb.M) > 1e-9) errs.push("viewBox symmetric");
    if (Math.abs(marginRadius(fd) - vb.M) > 1e-9) errs.push("marginRadius matches viewBox");
    c = hitAt(0, 0, fd);
    if (c.s !== 10 || !c.X) errs.push("center is X");
    p = mathToSvg(3.5, -2.1);
    back = svgToMath(p.x, p.y);
    if (back.x !== 3.5 || back.y !== -2.1) errs.push("math/svg roundtrip");
    var stack = targetSvg(fd, "inv", "<g>" + slotRingSvg([], 6, fd) + "</g>");
    if (stack.split('viewBox="')[1].split('"')[0] !== vb.str) errs.push("layers share viewBox");
    if (slotRadius(fd) <= fd / 2) errs.push("slot ring inside face");
    return errs;
  }

  root.ConvergeGeometry = {
    VERSION: 1,
    VIEW_MARGIN: VIEW_MARGIN,
    SLOT_OUTER_PAD: SLOT_OUTER_PAD,
    slotRadius: slotRadius,
    GEO_MARKER_DEFS: GEO_MARKER_DEFS,
    clamp: clamp,
    ringW: ringW,
    arrR: arrR,
    lineR: lineR,
    marginRadius: marginRadius,
    viewBoxFor: viewBoxFor,
    faceDForDist: faceDForDist,
    mathToSvg: mathToSvg,
    svgToMath: svgToMath,
    clampMathXY: clampMathXY,
    scoreAt: scoreAt,
    rank: rank,
    lineCut: lineCut,
    isLineCut: isLineCut,
    hitAt: hitAt,
    lbl: lbl,
    isZenkinEnd: isZenkinEnd,
    targetSvg: targetSvg,
    targetFaceSvg: targetFaceSvg,
    dot: dot,
    previewMark: previewMark,
    arrowMarkRadius: arrowMarkRadius,
    geoSvg: geoSvg,
    slotRingSvg: slotRingSvg,
    recordGuideSvg: recordGuideSvg,
    runInvariants: runInvariants,
  };
})(typeof window !== "undefined" ? window : this);