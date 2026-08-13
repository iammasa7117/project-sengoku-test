(function (S, T) {
  "use strict";
  function fresh(difficultyId) {
    var state = S.State.createInitialState({ scenarioId: "core_campaign", playerFactionId: "aotsuki", difficultyId: difficultyId || "normal" });
    state.campaign.status = "playing";
    state.events.engine.activeEvent = null;
    state.events.engine.queue = [];
    S.State.current = state;
    return state;
  }
  T.test("v1 Phase 3 DOM: 勝利画面に最終統計", function () {
    var state = fresh("normal");
    state.campaign.outcome = "victory"; state.campaign.gameOver = true; state.campaign.turn = 24; state.campaign.battleCount = 9;
    Object.keys(state.castles).forEach(function (id) { state.castles[id].factionId = state.campaign.playerFactionId; });
    S.UI.showEnding();
    var html = S.UI.el("modalContent").innerHTML;
    T.assert(html.indexOf("CAMPAIGN COMPLETE") >= 0);
    T.assert(html.indexOf("ending-stats") >= 0);
    T.assert(html.indexOf("24季") >= 0);
    T.assert(html.indexOf("9回") >= 0);
    T.assert(html.indexOf("data-download-report") >= 0);
  });
  T.test("v1 Phase 3 DOM: 敗北画面にGAME OVER", function () {
    var state = fresh("hard");
    state.campaign.outcome = "defeat"; state.campaign.gameOver = true;
    Object.keys(state.castles).forEach(function (id) { if (state.castles[id].factionId === state.campaign.playerFactionId) state.castles[id].factionId = "tokizawa"; });
    S.UI.showEnding();
    var html = S.UI.el("modalContent").innerHTML;
    T.assert(html.indexOf("GAME OVER") >= 0);
    T.assert(html.indexOf("滅亡") >= 0);
    T.assert(html.indexOf("難しい") >= 0);
  });
  T.test("v1 Phase 3 DOM: 終了modalは見出しを関連付け", function () {
    var state = fresh(); state.campaign.outcome = "victory";
    S.UI.showEnding();
    T.equal(S.UI.el("modalDialog").attributes["aria-labelledby"], "modalHeading");
  });
  T.test("v1 Phase 3 DOM: デバッグにRelease Balance", function () {
    fresh();
    S.UI.renderDebugPanel();
    var html = S.UI.el("debugPanel").innerHTML;
    T.assert(html.indexOf("Core v1.0 Debug") >= 0);
    T.assert(html.indexOf("RELEASE BALANCE") >= 0);
    T.assert(html.indexOf("data-release-balance-inspection") >= 0);
    T.assert(html.indexOf("core-v1.0-rc1") >= 0);
  });
  T.test("v1 Phase 3 DOM: Easyの説明を新規ゲームに表示", function () {
    fresh();
    S.UI.el("setupScenario").value = "core_campaign";
    S.UI.el("setupDifficulty").value = "easy";
    S.UI.updateNewGameSetup();
    var html = S.UI.el("setupSummary").innerHTML;
    T.assert(html.indexOf("初期資源+25%") >= 0);
    T.assert(html.indexOf("序盤4季") >= 0);
  });
  T.test("v1 Phase 3 DOM: Hardの説明を新規ゲームに表示", function () {
    fresh();
    S.UI.el("setupScenario").value = "core_campaign";
    S.UI.el("setupDifficulty").value = "hard";
    S.UI.updateNewGameSetup();
    var html = S.UI.el("setupSummary").innerHTML;
    T.assert(html.indexOf("初期資源-12%") >= 0);
    T.assert(html.indexOf("序盤保護はありません") >= 0);
  });
  T.test("v1 Phase 3 DOM: メニューに保存・報告・遊び方", function () {
    fresh(); S.UI.showMenu();
    var html = S.UI.el("modalContent").innerHTML;
    T.assert(html.indexOf("プレイレポート出力") >= 0);
    T.assert(html.indexOf("セーブ管理") >= 0);
    T.assert(html.indexOf("遊び方・用語集") >= 0);
  });
  T.test("v1 Phase 3 DOM: Release snapshotを表示可能", function () {
    var state = fresh("normal"), snapshot = S.Systems.Release.snapshot(state);
    T.equal(snapshot.release, "core-v1.0-rc1");
    T.equal(snapshot.difficultyId, "normal");
    T.assert(Array.isArray(snapshot.rankings));
  });
  T.run();
})(window.Sengoku, window.SengokuTest);
