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
    }),
    calibration: Object.freeze({
      personal: Phy.personalModel,
      regression: Phy.regressionAdvice,
      physics: Phy.personalPhysicsCalibration,
      gear: Phy.gearPrecisionProfile,
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