/* ConvergeEngine — device-aware runtime + stable API for growing physics
 * UI stays thin; extend ballistics/grouping/advice here or in physics.js. */
(function (root) {
  "use strict";

  var Phy = root.ArcheryPhysics;
  var Geo = root.ConvergeGeometry;
  if (!Phy) throw new Error("ConvergeEngine requires ArcheryPhysics");

  var RUNTIME_VERSION = 1;

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
    ringW: Geo && Geo.ringW ? Geo.ringW : Phy.ringW,
  });
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this);