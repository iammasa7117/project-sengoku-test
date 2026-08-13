(function (S, T) {
  "use strict";
  T.test("Phase3 DOM: 城詳細に人口・農業・季節収支を表示", function () {
    S.State.current = S.State.createInitialState(); S.State.current.campaign.status = "playing";
    S.UI.renderCastleDetail();
    var html = S.UI.el("castleDetail").innerHTML;
    T.assert(html.indexOf("人口") >= 0);
    T.assert(html.indexOf("農業") >= 0);
    T.assert(html.indexOf("徴兵上限") >= 0);
    T.assert(html.indexOf("季節の金") >= 0);
    T.assert(html.indexOf('data-command="cultivate"') >= 0);
  });
  T.test("Phase3 DOM: Army plannerに維持費説明を表示", function () {
    S.UI.showArmyPlanner("kiyosu");
    var html = S.UI.el("modalContent").innerHTML;
    T.assert(html.indexOf("維持費目安") >= 0);
    T.assert(html.indexOf("毎季") >= 0);
  });
  T.test("Phase3 DOM: Army詳細に季節維持費を表示", function () {
    var state = S.State.current;
    var result = S.Systems.Army.deployAndMarch(state, "kiyosu", "narumi", [{ officerId: "keiketsu", unitType: "ashigaru", troops: 20 }], { commanderId: "keiketsu", factionId: "aotsuki", consumeCommand: false });
    T.assert(result.ok);
    S.UI.showArmyDetail(result.stateChanges.armyId);
    var html = S.UI.el("modalContent").innerHTML;
    T.assert(html.indexOf("季節維持費") >= 0);
    T.assert(html.indexOf("季節兵糧") >= 0);
  });
  T.run();
})(window.Sengoku, window.SengokuTest);
