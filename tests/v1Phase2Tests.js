(function (S, T) {
  "use strict";
  function fresh(options) { return S.State.createInitialState(Object.assign({ scenarioId: "owari_short", playerFactionId: "aotsuki", difficultyId: "normal" }, options || {})); }
  function playing() { var state = fresh(); state.campaign.status = "playing"; state.events.engine.activeEvent = null; state.events.engine.queue = []; return state; }
  T.test("v1 Phase 2: 新規状態にUX設定がある", function () {
    var state = fresh(); T.equal(state.settings.tutorial.enabled, true); T.equal(state.settings.ui.largeText, false); T.equal(state.settings.tutorial.milestones.gameStarted, false);
  });
  T.test("v1 Phase 2: 新規ゲームで初心者ガイドを無効化できる", function () {
    var state = fresh({ tutorialEnabled: false }); T.equal(state.settings.tutorial.enabled, false);
  });
  T.test("v1 Phase 2: schema10旧セーブへUX設定を補完", function () {
    var state = fresh(); state.settings = { aiEnabled: true, autosave: true, sound: false }; var migrated = S.State.migrateState(state);
    T.assert(migrated.ok, migrated.errors && migrated.errors.join(" / ")); T.equal(migrated.state.settings.tutorial.enabled, true); T.equal(migrated.state.settings.ui.reducedMotion, false);
  });
  T.test("v1 Phase 2: 不正な表示設定を検出", function () {
    var state = fresh(); state.settings.ui.largeText = "yes"; var validation = S.State.validateState(state); T.equal(validation.ok, false); T.assert(validation.errors.some(function (error) { return error.indexOf("表示設定") >= 0; }));
  });
  T.test("v1 Phase 2: openingでは重要イベントを推奨", function () {
    var state = fresh(); S.State.current = state; T.assert(S.Systems.Campaign.begin(state).ok); var recommendation = S.UI.getGuideRecommendation(state); T.equal(recommendation.action, "event");
  });
  T.test("v1 Phase 2: 命令0では季節進行を推奨", function () {
    var state = playing(); state.campaign.commands = 0; S.State.current = state; var recommendation = S.UI.getGuideRecommendation(state); T.equal(recommendation.action, "end-turn");
  });
  T.test("v1 Phase 2: 外交提案を優先して推奨", function () {
    var state = playing(); state.diplomacy.proposals.push({ id: "p1", status: "pending", actorFactionId: "tokizawa", targetFactionId: "aotsuki" }); S.State.current = state; var recommendation = S.UI.getGuideRecommendation(state); T.equal(recommendation.action, "proposals");
  });
  T.test("v1 Phase 2: 敵城選択時は自城選択を推奨", function () {
    var state = playing(); state.campaign.selectedCastleId = "narumi"; S.State.current = state; var recommendation = S.UI.getGuideRecommendation(state); T.equal(recommendation.action, "friendly-castle");
  });
  T.test("v1 Phase 2: 低兵力では徴兵を推奨", function () {
    var state = playing(), castle = state.castles[state.campaign.selectedCastleId]; castle.troops = 50; state.campaign.gold = 200; state.campaign.food = 200; S.State.current = state; var recommendation = S.UI.getGuideRecommendation(state); T.equal(recommendation.action, "recruit");
  });
  T.test("v1 Phase 2: 全milestoneでガイド完了", function () {
    var state = fresh(); S.State.current = state; ["gameStarted", "castleSelected", "commandUsed", "seasonAdvanced", "menuOpened"].forEach(S.UI.markGuideMilestone); T.equal(state.settings.tutorial.completed, true);
  });
  T.test("v1 Phase 2: ガイド再開で進行を初期化", function () {
    var state = fresh(); S.State.current = state; S.UI.markGuideMilestone("gameStarted"); S.UI.dismissTutorial(); S.UI.restartTutorial(); T.equal(state.settings.tutorial.milestones.gameStarted, false); T.equal(state.settings.tutorial.dismissed, false);
  });
  T.test("v1 Phase 2: ガイド表示切替", function () {
    var state = fresh(); S.State.current = state; S.UI.setTutorialEnabled(false); T.equal(state.settings.tutorial.enabled, false); S.UI.setTutorialEnabled(true); T.equal(state.settings.tutorial.enabled, true);
  });
  T.test("v1 Phase 2: 表示設定を更新", function () {
    var state = fresh(); S.State.current = state; T.assert(S.UI.setPreference("largeText", true).ok); T.equal(state.settings.ui.largeText, true);
  });
  T.test("v1 Phase 2: 不明な表示設定を拒否", function () {
    var state = fresh(); S.State.current = state; var result = S.UI.setPreference("unknown", true); T.equal(result.ok, false);
  });
  T.test("v1 Phase 2: チェックリストは5項目", function () {
    var state = fresh(); S.State.current = state; var list = S.UI.guideChecklist(state); T.equal(list.length, 5); T.equal(list.filter(function (item) { return item.done; }).length, 0);
  });
  T.test("v1 Phase 2: 推奨は決定的", function () {
    var state = playing(); S.State.current = state; var first = S.UI.getGuideRecommendation(state), second = S.UI.getGuideRecommendation(state); T.equal(first.id, second.id); T.equal(first.action, second.action);
  });
  T.test("v1 Phase 2: UX設定を含むsave round trip", function () {
    localStorage.data = {}; var state = fresh(); state.settings.ui.highContrast = true; state.settings.tutorial.milestones.gameStarted = true; T.assert(S.Save.save(state, "manual1").ok); var loaded = S.Save.load("manual1"); T.assert(loaded.ok); T.equal(loaded.state.settings.ui.highContrast, true); T.equal(loaded.state.settings.tutorial.milestones.gameStarted, true);
  });
  T.test("v1 Phase 2: UX設定付き状態は厳格検証PASS", function () {
    var validation = S.State.validateState(fresh()); T.assert(validation.ok, validation.errors.join(" / "));
  });
  T.run();
})(window.Sengoku, window.SengokuTest);
