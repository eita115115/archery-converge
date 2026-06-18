/* ConvergeEngine — device-aware runtime + stable API for growing physics
 * UI stays thin; extend ballistics/grouping/advice here or in physics.js. */
(function (root) {
  "use strict";

  var Phy = root.ArcheryPhysics;
  var Geo = root.ConvergeGeometry;
  if (!Phy) throw new Error("ConvergeEngine requires ArcheryPhysics");

  var RUNTIME_VERSION = 2;

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  /** Tiered budget so RK4 + calibration stay smooth on low-RAM phones. */
  function deviceProfile() {
    var nav = root.navigator || {};
    var mem = nav.deviceMemory;
    var cores = nav.hardwareConcurrency || 2;
    var saveData = !!(nav.connection && nav.connection.saveData);
    var reduced = false;
    try {
      reduced = root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {}
    var tier = "mid";
    if (saveData || (mem && mem <= 2) || cores <= 2) tier = "low";
    else if ((mem && mem >= 6) || cores >= 8) tier = "high";
    var steps = tier === "low" ? 2200 : tier === "high" ? 5000 : 3600;
    var cacheSize = tier === "low" ? 8 : tier === "high" ? 24 : 16;
    return {
      tier: tier,
      cores: cores,
      deviceMemory: mem || null,
      saveData: saveData,
      reducedMotion: reduced,
      maxSimSteps: steps,
      trajectoryCacheSize: cacheSize,
      calibrationCacheSize: tier === "low" ? 6 : 12,
      rk4Dt: tier === "low" ? 0.008 : 0.006,
    };
  }

  var profile = deviceProfile();

  function applyProfile(p) {
    profile = p || profile;
    if (typeof Phy.configure === "function") {
      Phy.configure({
        maxSimSteps: profile.maxSimSteps,
        rk4Dt: profile.rk4Dt,
        trajectoryCacheSize: profile.trajectoryCacheSize,
        calibrationCacheSize: profile.calibrationCacheSize,
      });
    }
  }

  applyProfile(profile);

  function slimSession(sess) {
    if (!sess) return null;
    return {
      id: sess.id,
      date: sess.date,
      dist: sess.dist,
      faceD: sess.faceD,
      setupId: sess.setupId,
      windDir: sess.windDir,
      windSpeed: sess.windSpeed,
      sightNow: sess.sightNow,
      sightStart: sess.sightStart,
    };
  }

  function slimSetup(setup) {
    return setup || {};
  }

  /** One call for return screen — grouping + advice + judgement. */
  function analyzeEnd(db, settings, setup, sess, arrows) {
    var s = slimSession(sess);
    var g = slimSetup(setup);
    var st = Phy.robustStats(arrows);
    if (!st || st.n < 1) return { st: st, adv: null, j: null };
    var adv = Phy.adviceForEnd(db, settings, g, s, arrows);
    var j = adv ? Phy.judgementFor(adv, s) : null;
    return { st: st, adv: adv, j: j };
  }

  /** Structured grouping report for history / done (X4). */
  function describeGrouping(st, faceD) {
    if (!st || st.n < 1) return null;
    var shape = ellipseShape(st);
    return {
      center: { mx: st.mx, my: st.my },
      spread: {
        rr: st.rr,
        sx: st.sx,
        sy: st.sy,
        angleDeg: st.angleDeg != null ? st.angleDeg : shape.angleDeg,
        major: st.major,
        minor: st.minor,
        dominant: shape.dominant,
      },
      outliers: (st.excluded && st.excluded.length) || 0,
      method: st.method || "simple",
      confidence: st.confidence,
    };
  }

  function summarizeSessionEnds(ends, faceD) {
    if (!ends.length) return { trend: "none", totalAdj: { h: 0, v: 0 }, bestEnd: null, endCount: 0 };
    var rw = ringW(faceD);
    var mxVals = [];
    var myVals = [];
    ends.forEach(function (e) {
      if (e.st) {
        mxVals.push(e.st.mx);
        myVals.push(e.st.my);
      }
    });
    var trend = "stable";
    if (mxVals.length >= 2) {
      var dm = mxVals[mxVals.length - 1] - mxVals[0];
      var dy = myVals[myVals.length - 1] - myVals[0];
      if (Math.abs(dm) > Math.abs(dy) && Math.abs(dm) > rw * 0.15) trend = dm > 0 ? "right" : "left";
      else if (Math.abs(dy) > rw * 0.15) trend = dy > 0 ? "up" : "down";
    }
    var totalH = 0;
    var totalV = 0;
    ends.forEach(function (e) {
      if (e.adv && e.adv.vector) {
        totalH += e.adv.vector.h || 0;
        totalV += e.adv.vector.v || 0;
      }
    });
    var bestEnd = 0;
    var bestRr = Infinity;
    ends.forEach(function (e, i) {
      if (e.st && e.st.rr < bestRr) {
        bestRr = e.st.rr;
        bestEnd = i;
      }
    });
    return { trend: trend, totalAdj: { h: totalH, v: totalV }, bestEnd: bestEnd, endCount: ends.length };
  }

  /** Multi-end analysis for done / history detail (one call, no N× UI). */
  function analyzeSession(db, settings, setup, session) {
    var g = slimSetup(setup);
    var faceD = (session && session.faceD) || 122;
    var ends = [];
    (session && session.ends ? session.ends : []).forEach(function (arrows, i) {
      if (!arrows || !arrows.length) return;
      var row = analyzeEnd(db, settings, g, session, arrows);
      ends.push({
        index: i,
        st: row.st,
        adv: row.adv,
        j: row.j,
        describe: describeGrouping(row.st, faceD),
      });
    });
    return { ends: ends, summary: summarizeSessionEnds(ends, faceD) };
  }

  function trajectoryFor(db, settings, setup, sess) {
    var s = slimSession(sess);
    var g = slimSetup(setup);
    var eye = (settings && settings.eyeSight) || 850;
    return Phy.trajectoryModel(s, g, eye);
  }

  function clearCaches() {
    if (typeof Phy.clearCaches === "function") Phy.clearCaches();
  }

  function invalidateSetup(setupId) {
    if (typeof Phy.invalidateSetup === "function") Phy.invalidateSetup(setupId);
  }

  var REF_FACE_D = 122;
  var LEGACY_SOFT = 0.35;
  var LEGACY_STRONG = 0.7;

  function ringW(fd) {
    return Geo && Geo.ringW ? Geo.ringW(fd) : Phy.ringW(fd);
  }

  /** Ring-relative offset bands — preserves 0.35/0.7 cm at faceD=122 (70 m). */
  function offsetBands(faceD) {
    var rw = ringW(faceD);
    var kSoft = LEGACY_SOFT / ringW(REF_FACE_D);
    var kStrong = LEGACY_STRONG / ringW(REF_FACE_D);
    return {
      kSoft: kSoft,
      kStrong: kStrong,
      softDist: rw * kSoft,
      strongDist: rw * kStrong,
    };
  }

  function isCentered(mx, my, faceD) {
    var b = offsetBands(faceD);
    return Math.abs(mx) <= b.softDist && Math.abs(my) <= b.softDist;
  }

  function offsetClass(mx, my, faceD) {
    var b = offsetBands(faceD);
    function axisClass(v) {
      var a = Math.abs(v);
      if (a <= b.softDist) return "center";
      if (a <= b.strongDist) return "soft";
      return "strong";
    }
    return { h: axisClass(mx), v: axisClass(my) };
  }

  function ellipseShape(st) {
    if (!st) return { ratio: 1, angleDeg: 0, dominant: "round" };
    var sx = st.sx || 0.01;
    var sy = st.sy || 0.01;
    var ratio = Math.max(sx, sy) / Math.max(0.01, Math.min(sx, sy));
    var dominant = ratio < 1.15 ? "round" : sx > sy ? "h" : "v";
    return { ratio: ratio, angleDeg: sx > sy ? 0 : 90, dominant: dominant };
  }

  function confidenceBand(conf) {
    var c = conf == null ? 0 : conf;
    if (c >= 0.62) return "high";
    if (c >= 0.45) return "mid";
    return "low";
  }

  function personalState(db, sess, setup, st) {
    return Phy.personalModel(db, slimSession(sess), slimSetup(setup), st);
  }

  var SCHEMA_VERSION = 2;

  function migrateDb(d) {
    if (!d) return d;
    var ver = d.schemaVersion || 1;
    if (!d.settings) d.settings = {};
    if (ver < 2) {
      if (d.settings.calibrationDigest === undefined) d.settings.calibrationDigest = null;
      if (d.settings.convergeIndex === undefined) d.settings.convergeIndex = null;
      if (d.settings.engineRuntimeSeen === undefined) d.settings.engineRuntimeSeen = null;
      d.schemaVersion = 2;
    }
    return d;
  }

  function buildDigest(db, settings) {
    var setup = (db.setups || [])[0];
    if (!setup || !setup.id) return null;
    var pcal = Phy.personalPhysicsCalibration(db, setup.id, settings);
    var index = Phy.convergeIndex(db, setup.id, settings);
    return {
      setupId: setup.id,
      score: pcal && pcal.score != null ? pcal.score : 0,
      clickV70: pcal && pcal.click ? pcal.click.v70 : null,
      clickH70: pcal && pcal.click ? pcal.click.h70 : null,
      convergeIndex: index,
      updatedAt: Date.now(),
    };
  }

  function applyMeta(db, settings) {
    if (!db) return db;
    if (!db.settings) db.settings = {};
    var setup = (db.setups || [])[0];
    if (setup && setup.id) {
      db.settings.calibrationDigest = buildDigest(db, settings || db.settings);
      db.settings.convergeIndex = Phy.convergeIndex(db, setup.id, settings || db.settings);
    }
    db.settings.engineRuntimeSeen = RUNTIME_VERSION;
    return db;
  }

  function sessionNudge(db) {
    var n = (db && db.sessions ? db.sessions : []).length;
    if (n >= 200) return { level: "strong", count: n };
    if (n >= 150) return { level: "soft", count: n };
    return { level: "none", count: n };
  }

  function readinessHint(db, setupId, settings) {
    if (!setupId) return null;
    var index = Phy.convergeIndex(db, setupId, settings);
    var n = (db.sessions || []).filter(function (s) {
      return s.setupId === setupId;
    }).length;
    var toPersonal = Math.max(0, 3 - n);
    var toIndex25 = Math.max(0, Math.ceil((25 - index) / 4));
    var tier = "new";
    if (index >= 75) tier = "mature";
    else if (index >= 50) tier = "ready";
    else if (index >= 25) tier = "warming";
    else if (n >= 1) tier = "building";
    var hasRegression = false;
    var dists = [];
    (db.sessions || []).forEach(function (s) {
      if (s.setupId === setupId && s.dist != null && dists.indexOf(s.dist) < 0) dists.push(s.dist);
    });
    dists.forEach(function (d) {
      var reg = Phy.regressionAdvice(db, setupId, d);
      if ((reg.v && (reg.v.quality || reg.v.r2 || 0) > 0.5) || (reg.h && (reg.h.quality || reg.h.r2 || 0) > 0.5))
        hasRegression = true;
    });
    return {
      tier: tier,
      index: index,
      sessionsNeeded: tier === "new" || tier === "building" ? Math.max(toPersonal, toIndex25) : null,
      hasRegression: hasRegression,
    };
  }

  root.ConvergeEngine = Object.freeze({
    runtimeVersion: RUNTIME_VERSION,
    physicsVersion: Phy.version,
    profile: profile,
    deviceProfile: deviceProfile,
    applyProfile: applyProfile,
    clearCaches: clearCaches,
    invalidateSetup: invalidateSetup,
    grouping: Object.freeze({
      robust: Phy.robustStats,
      simple: Phy.groupStats,
      describe: describeGrouping,
    }),
    ballistics: Object.freeze({
      profile: Phy.physicsProfile,
      wind: Phy.windModel,
      simulate: Phy.simulateArrow,
      trajectory: Phy.trajectoryModel,
      trajectoryFor: trajectoryFor,
    }),
    advice: Object.freeze({
      forEnd: Phy.adviceForEnd,
      judgement: Phy.judgementFor,
      quality: Phy.sessionQuality,
      analyzeEnd: analyzeEnd,
      analyzeSession: analyzeSession,
    }),
    calibration: Object.freeze({
      personal: Phy.personalModel,
      regression: Phy.regressionAdvice,
      physics: Phy.personalPhysicsCalibration,
      gear: Phy.gearPrecisionProfile,
      buildDigest: buildDigest,
    }),
    storage: Object.freeze({
      schemaVersion: SCHEMA_VERSION,
      migrateDb: migrateDb,
      applyMeta: applyMeta,
      sessionNudge: sessionNudge,
    }),
    metrics: Object.freeze({
      ringW: ringW,
      offsetBands: offsetBands,
      offsetClass: offsetClass,
      isCentered: isCentered,
      ellipseShape: ellipseShape,
      confidenceBand: confidenceBand,
    }),
    wind: Object.freeze({
      model: Phy.windModel,
      classify: Phy.classifyWind,
      suggestReconfirm: Phy.suggestWindReconfirm,
    }),
    memory: Object.freeze({
      personalState: personalState,
      sessionStreak: Phy.sessionStreak,
      convergeIndex: Phy.convergeIndex,
      readinessHint: readinessHint,
    }),
    ringW: ringW,
  });
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this);