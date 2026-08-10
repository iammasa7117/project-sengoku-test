(function (global) {
  "use strict";
  var S = global.Sengoku = global.Sengoku || {};
  ["Data", "State", "Systems", "UI", "Save", "Debug", "Util", "Config"].forEach(function (name) {
    S[name] = S[name] || {};
  });
  S.Debug.errors = S.Debug.errors || [];
  S.Util.deepClone = function (value) { return JSON.parse(JSON.stringify(value)); };
  S.Util.clamp = function (value, min, max) { return Math.max(min, Math.min(max, value)); };
  S.Util.assert = function (condition, message) {
    if (!condition) throw new Error(message || "Assertion failed");
    return true;
  };
  S.Util.logError = function (error, context) {
    var item = {
      at: new Date().toISOString(),
      context: context || "unknown",
      message: error && error.message ? error.message : String(error),
      stack: error && error.stack ? error.stack : ""
    };
    S.Debug.errors.push(item);
    if (S.Debug.errors.length > 50) S.Debug.errors.shift();
    if (global.console && console.error) console.error("[Sengoku] " + item.context, error);
    return item;
  };
  S.Util.safeExecute = function (label, callback) {
    try { return callback(); }
    catch (error) {
      S.Util.logError(error, label);
      var recovered = S.Save && S.Save.restoreRuntimeCheckpoint ? S.Save.restoreRuntimeCheckpoint() : null;
      if (S.UI && S.UI.notify) S.UI.notify(recovered && recovered.ok ? "処理エラーを検出し、直前の正常状態へ復旧しました。" : "処理に失敗しました。ゲームは継続できます。", "error");
      return { ok: false, recovered: Boolean(recovered && recovered.ok), errors: [error.message || String(error)] };
    }
  };
  global.addEventListener("error", function (event) { S.Util.logError(event.error || event.message, "window.onerror"); });
  global.addEventListener("unhandledrejection", function (event) { S.Util.logError(event.reason, "unhandledrejection"); });
})(window);
