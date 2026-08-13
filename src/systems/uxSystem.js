(function (S) {
  "use strict";
  var MILESTONES = ["gameStarted", "castleSelected", "commandUsed", "seasonAdvanced", "menuOpened"];

  function ensure(state) {
    if (!state) return null;
    state.settings = S.State.upgradeUXSettings(state.settings);
    return state.settings;
  }

  S.Systems.UX = {
    ensureSettings: ensure,
    milestoneIds: function () { return MILESTONES.slice(); },
    markMilestone: function (state, key) {
      var settings = ensure(state);
      if (!settings || MILESTONES.indexOf(key) < 0) return { ok: false, completed: false, errors: ["不明なガイド項目です"] };
      settings.tutorial.milestones[key] = true;
      var completed = MILESTONES.every(function (name) { return settings.tutorial.milestones[name]; });
      if (completed) {
        settings.tutorial.completed = true;
        settings.tutorial.dismissed = false;
      }
      return { ok: true, completed: completed, errors: [] };
    },
    restartTutorial: function (state) {
      var settings = ensure(state);
      if (!settings) return { ok: false, errors: ["ゲーム状態がありません"] };
      settings.tutorial = S.Util.deepClone(S.State.createUXSettings().tutorial);
      return { ok: true, errors: [] };
    },
    dismissTutorial: function (state) {
      var settings = ensure(state);
      if (!settings) return { ok: false, errors: ["ゲーム状態がありません"] };
      settings.tutorial.dismissed = true;
      return { ok: true, errors: [] };
    },
    setTutorialEnabled: function (state, enabled) {
      var settings = ensure(state);
      if (!settings) return { ok: false, errors: ["ゲーム状態がありません"] };
      settings.tutorial.enabled = Boolean(enabled);
      settings.tutorial.dismissed = false;
      return { ok: true, errors: [] };
    },
    setPreference: function (state, key, enabled) {
      var settings = ensure(state);
      if (!settings || !Object.prototype.hasOwnProperty.call(settings.ui, key)) return { ok: false, errors: ["不明な表示設定です"] };
      settings.ui[key] = Boolean(enabled);
      return { ok: true, errors: [] };
    }
  };
})(window.Sengoku);
