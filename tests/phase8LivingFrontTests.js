(function (S, T) {
  "use strict";
  function fresh(player) {
    var state = S.State.createInitialState({ scenarioId: "core_campaign", playerFactionId: player || "aotsuki" });
    state.campaign.status = "playing"; state.settings.aiEnabled = false; return state;
  }
  function valid(state) { var result = S.State.validateState(state); T.assert(result.ok, result.errors.join(" / ")); }
  function war(state, a, b) { var relation = S.Systems.Diplomacy.relation(state, a, b); T.assert(Boolean(relation), "外交関係がありません"); relation.status = "war"; relation.expiresTurn = null; relation.sinceTurn = state.campaign.turn; relation.lastActionTurn = -1; }

  T.test("Phase8: 自領内の援軍路だけを検索できる", function () {
    var state = fresh();
    var route = S.Systems.Army.findFriendlyRoute(state, "aotsuki", "aonohara", "kiyosu", { maxHops: 3 });
    T.assert(Array.isArray(route));
    T.equal(route.join(">"), "aonohara>kiyosu");
    T.equal(S.Systems.Army.findFriendlyRoute(state, "aotsuki", "kiyosu", "narumi", { maxHops: 3 }), null);
    valid(state);
  });

  T.test("Phase8: AI侵攻は即時決着せずArmy Entityとして出陣する", function () {
    var state = fresh("yukishiro"), beforeBattles = state.campaign.battleCount;
    war(state, "aotsuki", "tokizawa");
    var result = S.Systems.AI.launchArmyAttack(state, "aotsuki", { force: true, random: function () { return 0.5; } });
    T.assert(result.ok, result.errors && result.errors.join(" / "));
    T.equal(result.action, "army_attack");
    var army = state.armies[result.stateChanges.armyId];
    T.assert(army && army.status === "marching");
    T.equal(army.mission, "attack");
    T.equal(state.campaign.battleCount, beforeBattles);
    T.assert(S.Systems.Army.totalTroops(state, army) >= S.Config.MIN_ATTACK_FORCE);
    valid(state);
  });

  T.test("Phase8: 敵Army接近をプレイヤー脅威として取得できる", function () {
    var state = fresh("tokizawa");
    war(state, "aotsuki", "tokizawa");
    var launched = S.Systems.AI.launchArmyAttack(state, "aotsuki", { force: true, targetFactionId: "tokizawa", random: function () { return 0.5; } });
    T.assert(launched.ok, launched.errors && launched.errors.join(" / "));
    var threats = S.Systems.Army.threatsAgainstFaction(state, "tokizawa");
    T.assert(threats.length >= 1);
    T.equal(threats[0].id, launched.stateChanges.armyId);
    T.assert(state.castles[threats[0].destinationCastleId].factionId === "tokizawa");
    valid(state);
  });

  T.test("Phase8: AI援軍は物理Armyとして味方城へ向かう", function () {
    var state = fresh("aotsuki");
    war(state, "aotsuki", "tokizawa");
    T.assert(S.Systems.Officer.moveOfficer(state, "soma", "aonohara", { consumeCommand: false, silent: true }).ok || state.officers.soma.castleId === "aonohara");
    var invader = S.Systems.Army.deployAndMarch(state, "aonohara", "akane", [{ officerId: "soma", unitType: "ashigaru", troops: 20 }], { commanderId: "soma", factionId: "aotsuki", consumeCommand: false, maxHops: 3 });
    T.assert(invader.ok, invader.errors && invader.errors.join(" / "));
    var result = S.Systems.AI.launchReinforcementArmy(state, "tokizawa", {});
    T.assert(result.ok, result.errors && result.errors.join(" / "));
    T.equal(result.action, "army_reinforce");
    var army = state.armies[result.stateChanges.armyId];
    T.assert(army && army.status === "marching");
    T.equal(army.mission, "reinforce");
    T.equal(army.destinationCastleId, "akane");
    valid(state);
  });

  T.test("Phase8: 援軍Armyは味方城到着時に守備兵へ合流する", function () {
    var state = fresh("aotsuki");
    war(state, "aotsuki", "tokizawa");
    var invader = S.Systems.Army.deployAndMarch(state, "aonohara", "akane", [{ officerId: "soma", unitType: "ashigaru", troops: 20 }], { commanderId: "soma", factionId: "aotsuki", consumeCommand: false, maxHops: 3 });
    T.assert(invader.ok);
    var before = state.castles.akane.guardTroops;
    var reinforcement = S.Systems.AI.launchReinforcementArmy(state, "tokizawa", {});
    T.assert(reinforcement.ok, reinforcement.errors && reinforcement.errors.join(" / "));
    var reinforcementId = reinforcement.stateChanges.armyId, sent = S.Systems.Army.totalTroops(state, reinforcementId);
    var advanced = S.Systems.Army.advanceSeason(state, { allowTactical: false, random: function () { return 0.99; } });
    T.assert(advanced.ok, advanced.errors && advanced.errors.join(" / "));
    T.assert(!state.armies[reinforcementId], "到着済み援軍Armyが解散されていません");
    T.equal(state.castles.akane.guardTroops, before + sent);
    valid(state);
  });

  T.test("Phase8: 1勢力の同時侵攻Armyは1隊に制限される", function () {
    var state = fresh("yukishiro");
    war(state, "aotsuki", "tokizawa");
    var first = S.Systems.AI.launchArmyAttack(state, "aotsuki", { force: true });
    T.assert(first.ok);
    var second = S.Systems.AI.launchArmyAttack(state, "aotsuki", { force: true });
    T.assert(!second.ok);
    T.equal(S.Systems.AI.activeFieldArmies(state, "aotsuki", "attack").length, 1);
    valid(state);
  });

  T.run();
})(window.Sengoku, window.SengokuTest);
