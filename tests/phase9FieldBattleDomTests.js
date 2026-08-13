(function (S, T) {
  "use strict";
  function fresh() {
    var state = S.State.createInitialState({ scenarioId: "core_campaign", playerFactionId: "aotsuki" });
    state.campaign.status = "playing";
    state.settings.aiEnabled = false;
    return state;
  }
  function war(state, a, b) {
    var relation = S.Systems.Diplomacy.relation(state, a, b);
    relation.status = "war";
    relation.expiresTurn = null;
    relation.sinceTurn = state.campaign.turn;
    relation.lastActionTurn = -1;
  }
  function enemyLaunch(state) {
    return S.Systems.Army.deployAndMarch(state, "narumi", "kiyosu", [
      { officerId: "hiyori", unitType: "ashigaru", troops: 20 }
    ], { commanderId: "hiyori", factionId: "tokizawa", consumeCommand: false, route: ["narumi", "kiyosu"], maxHops: 1, mission: "attack" });
  }

  T.test("Phase9 DOM: 迎撃可能な敵Army詳細に迎撃ボタンを表示", function () {
    var state = fresh();
    war(state, "aotsuki", "tokizawa");
    var launched = enemyLaunch(state);
    T.assert(launched.ok, launched.errors && launched.errors.join(" / "));
    S.State.current = state;
    S.UI.showArmyDetail(launched.stateChanges.armyId);
    var html = S.UI.el("modalContent").innerHTML;
    T.assert(html.indexOf("INTERCEPT / 迎撃可能") >= 0);
    T.assert(html.indexOf("迎撃軍を出す") >= 0);
    T.assert(html.indexOf('data-intercept-army="' + launched.stateChanges.armyId + '"') >= 0);
  });

  T.test("Phase9 DOM: 迎撃圏外の敵Army詳細はエラーなく迎撃不可を表示", function () {
    var state = fresh();
    war(state, "aotsuki", "tokizawa");
    var launched = S.Systems.Army.deployAndMarch(state, "akane", "kiyosu", [
      { officerId: "tokizawa_temp_3", unitType: "ashigaru", troops: 20 }
    ], { commanderId: "tokizawa_temp_3", factionId: "tokizawa", consumeCommand: false, maxHops: 3, mission: "attack" });
    T.assert(launched.ok, launched.errors && launched.errors.join(" / "));
    S.State.current = state;
    S.UI.showArmyDetail(launched.stateChanges.armyId);
    var html = S.UI.el("modalContent").innerHTML;
    T.assert(html.indexOf("現在は迎撃できません") >= 0);
    T.assert(html.indexOf("data-intercept-army") < 0);
  });

  T.run();
})(window.Sengoku, window.SengokuTest);
