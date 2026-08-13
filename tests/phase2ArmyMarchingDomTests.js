(function (S, T) {
  "use strict";
  T.test("Phase2 DOM: Army plannerがモバイル向けUnitカードを表示", function () {
    S.State.current = S.State.createInitialState(); S.State.current.campaign.status = "playing";
    S.UI.showArmyPlanner("kiyosu");
    var html = S.UI.el("modalContent").innerHTML;
    T.assert(html.indexOf("軍勢を編成して出陣") >= 0);
    T.assert(html.indexOf("UNIT 1 / COMMANDER") >= 0);
    T.assert(html.indexOf("army-unit-builder") >= 0);
    T.assert(html.indexOf("data-deploy-army") >= 0);
  });
  T.test("Phase2 DOM: Army detailに進軍先と撤兵操作を表示", function () {
    var state = S.State.current;
    var result = S.Systems.Army.deployAndMarch(state, "kiyosu", "narumi", [{ officerId: "keiketsu", unitType: "ashigaru", troops: 20 }], { commanderId: "keiketsu", factionId: "aotsuki", consumeCommand: false });
    T.assert(result.ok);
    S.UI.showArmyDetail(result.stateChanges.armyId);
    var html = S.UI.el("modalContent").innerHTML;
    T.assert(html.indexOf("進軍路") >= 0);
    T.assert(html.indexOf("鳴海砦") >= 0);
    T.assert(html.indexOf("撤兵する") >= 0);
  });
  T.test("Phase2 DOM: Battle report共通表示関数", function () {
    S.UI.showBattleReport({ name: "鳴海砦攻略戦", result: "攻撃側勝利", commander: "景傑", deputy: "なし", committedTroops: 20, attackerLoss: 4, tactic: "標準", decision: "信頼", rivalry: "因縁なし", injury: null });
    T.assert(S.UI.el("modalContent").innerHTML.indexOf("BATTLE REPORT") >= 0);
  });
  T.run();
})(window.Sengoku, window.SengokuTest);
