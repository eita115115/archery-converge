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

  /** Zenkin face rasters — 新規4枚クローズアップ（fx/fy=焦点, zoom=拡大） */
  var OPPAI_VARIANTS = [
    { id: "v1", file: "oppai/1.jpg", label: "①", fx: 0.52, fy: 0.46, zoom: 1.08 },
    { id: "v2", file: "oppai/2.jpg", label: "②", fx: 0.5, fy: 0.44, zoom: 1.06 },
    { id: "v3", file: "oppai/3.jpg", label: "③", fx: 0.56, fy: 0.45, zoom: 1.1 },
    { id: "v4", file: "oppai/4.jpg", label: "④", fx: 0.5, fy: 0.42, zoom: 1.08 },
  ];

  function oppaiVariantAt(idx) {
    return OPPAI_VARIANTS[idx == null ? 0 : ((idx % OPPAI_VARIANTS.length) + OPPAI_VARIANTS.length) % OPPAI_VARIANTS.length];
  }
  function pickOppaiIdx() {
    return Math.floor(Math.random() * OPPAI_VARIANTS.length);
  }
  function oppaiImgAt(idx) {
    return oppaiVariantAt(idx).file;
  }
  function oppaiLabelAt(idx) {
    return oppaiVariantAt(idx).label;
  }

  function targetFaceSvg(fd, id, mode, oppaiIdx) {
    var w = ringW(fd),
      R = fd / 2,
      sw = R / 280,
      g = "",
      i,
      pair,
      k,
      f,
      st;
    if (mode === "oppai") {
      var ov = oppaiVariantAt(oppaiIdx),
        fx = ov.fx == null ? 0.5 : ov.fx,
        fy = ov.fy == null ? 0.5 : ov.fy,
        oz = ov.zoom == null ? 1.15 : ov.zoom,
        iw = fd * oz,
        ih = fd * oz,
        ix = -fx * iw,
        iy = -fy * ih;
      return (
        "<defs><clipPath id=\"" +
        id +
        'clip"><circle cx="0" cy="0" r="' +
        R +
        '"/></clipPath></defs><image href="' +
        ov.file +
        '" x="' +
        ix +
        '" y="' +
        iy +
        '" width="' +
        iw +
        '" height="' +
        ih +
        '" preserveAspectRatio="xMidYMid slice" clip-path="url(#' +
        id +
        'clip)"/>'
      );
    }
    for (i = 0; i < SPORT_FACE.length; i++) {
      pair = SPORT_FACE[i];
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
        sw +
        '"/>';
    }
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
    return g;
  }

  function targetSvg(fd, id, overlays, mode, oppaiIdx) {
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
      targetFaceSvg(fd, id, face, oppaiIdx) +
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

  function dot(a, fd, c, l, extraCls) {
    var r = arrowMarkRadius(fd),
      p = mathToSvg(a.x, a.y),
      sw = r / 4,
      cut = a.cut != null ? !!a.cut : lineCut(a.x, a.y, fd);
    return (
      '<g class="mark-scored' +
      (cut ? " mark-cut" : " mark-solid") +
      (extraCls ? " " + extraCls : "") +
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
    OPPAI_VARIANTS: OPPAI_VARIANTS,
    pickOppaiIdx: pickOppaiIdx,
    oppaiImgAt: oppaiImgAt,
    oppaiLabelAt: oppaiLabelAt,
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