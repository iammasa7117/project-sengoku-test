(function (S, T) {
  "use strict";
  function fresh() { var state = S.State.createInitialState(); state.campaign.status = "playing"; state.settings.aiEnabled = false; return state; }
  function rng(v) { return function () { return v; }; }
  function deploy(state, troopsA, troopsB) {
    return S.Systems.Army.deployAndMarch(state, "kiyosu", "narumi", [
      { officerId: "keiketsu", unitType: "ashigaru", troops: troopsA || 40 },
      { officerId: "kanenobu", unitType: "kiba", troops: troopsB || 20 }
    ], { commanderId: "keiketsu", factionId: "aotsuki", consumeCommand: false });
  }
  function resultFor(pending, winner, playerRatio, enemyRatio) {
    var units = [], attackerLoss = 0, defenderLoss = 0;
    pending.battleSpec.attacker.units.forEach(function (u) {
      var after = Math.max(0, Math.floor(u.troops * playerRatio)); attackerLoss += u.troops - after;
      units.push({ id: u.id, officerId: u.officerId, coreOfficerId: u.coreOfficerId, side: "player", troopsBefore: u.troops, troopsAfter: after, morale: after ? 70 : 0, status: after ? "active" : "destroyed" });
    });
    pending.battleSpec.defender.units.forEach(function (u) {
      var after = Math.max(0, Math.floor(u.troops * enemyRatio)); defenderLoss += u.troops - after;
      units.push({ id: u.id, officerId: u.officerId, coreOfficerId: u.coreOfficerId, side: "enemy", troopsBefore: u.troops, troopsAfter: after, morale: after ? 48 : 0, status: after ? "active" : "destroyed" });
    });
    return { winner: winner, seed: pending.seed, durationTicks: 400, attackerLoss: attackerLoss, defenderLoss: defenderLoss, units: units };
  }
  function prepareTactical(state) {
    var d = deploy(state, 40, 20); T.assert(d.ok, d.errors && d.errors.join(" / "));
    var phase = S.Systems.Army.advanceSeason(state, { random: rng(.5), allowTactical: true });
    T.assert(phase.ok, phase.errors && phase.errors.join(" / "));
    T.assert(state.events.pendingTacticalBattle);
    return { armyId: d.stateChanges.armyId, pending: state.events.pendingTacticalBattle };
  }
  function applySynthetic(state, prep, playerRatio, enemyRatio) {
    var translated = S.Systems.BattleAdapter.translateResult(state, prep.pending, resultFor(prep.pending, "player", playerRatio, enemyRatio));
    T.assert(translated, "translateResult failed");
    var applied = S.Systems.Battle.applyOutcome(state, prep.pending, translated);
    T.assert(applied.ok, applied.errors && applied.errors.join(" / "));
    return applied;
  }
  function valid(state) { var v = S.State.validateState(state); T.assert(v.ok, v.errors.join(" / ")); }

  T.test("Phase5: Siege APIと非ゼロTactical thresholdが存在", function () {
    T.equal(typeof S.Systems.Siege.preview, "function");
    T.equal(typeof S.Systems.Siege.resolveTactical, "function");
    T.equal(typeof S.Systems.Siege.continueSiege, "function");
    T.assert(S.Config.Balance.siege.tacticalThreshold > 0);
  });

  T.test("Phase5: 圧勝Tacticalは野戦勝利から即落城まで一続き", function () {
    var state = fresh(), prep = prepareTactical(state), applied = applySynthetic(state, prep, .8, .1);
    T.equal(applied.stateChanges.castleCaptured, true);
    T.equal(state.castles.narumi.factionId, "aotsuki");
    T.equal(Object.keys(state.armies).length, 0);
    T.equal(applied.stateChanges.report.siegeStatus, "captured");
    valid(state);
  });

  T.test("Phase5: 僅差の野戦勝利では城が落ちず包囲状態になる", function () {
    var state = fresh(), prep = prepareTactical(state), applied = applySynthetic(state, prep, .45, .60);
    var army = state.armies[prep.armyId];
    T.equal(applied.stateChanges.win, true);
    T.equal(applied.stateChanges.castleCaptured, false);
    T.equal(state.castles.narumi.factionId, "tokizawa");
    T.assert(army && army.status === "besieging");
    T.equal(army.siege.targetCastleId, "narumi");
    T.equal(applied.stateChanges.report.siegeStatus, "besieging");
    valid(state);
  });

  T.test("Phase5: 包囲継続で守備兵または防備が削られる", function () {
    var state = fresh(), prep = prepareTactical(state); applySynthetic(state, prep, .45, .60);
    var beforeGuard = state.castles.narumi.guardTroops, beforeDefense = state.castles.narumi.defense;
    var continued = S.Systems.Siege.continueSiege(state, prep.armyId);
    T.assert(continued.ok, continued.errors && continued.errors.join(" / "));
    if (state.armies[prep.armyId]) T.assert(state.castles.narumi.guardTroops < beforeGuard || state.castles.narumi.defense < beforeDefense);
    valid(state);
  });

  T.test("Phase5: 包囲は有限回の季節攻城で落城まで到達できる", function () {
    var state = fresh(), prep = prepareTactical(state); applySynthetic(state, prep, .45, .60);
    var attempts = 0;
    while (state.armies[prep.armyId] && attempts < 20) { var r = S.Systems.Siege.continueSiege(state, prep.armyId); T.assert(r.ok, r.errors && r.errors.join(" / ")); attempts += 1; }
    T.equal(state.castles.narumi.factionId, "aotsuki");
    T.equal(Boolean(state.armies[prep.armyId]), false);
    var report = state.events.battleReports[state.events.battleReports.length - 1];
    T.equal(report.castleCaptured, true);
    T.equal(report.siegeStatus, "落城");
    valid(state);
  });

  T.test("Phase5: 包囲Armyも遠征維持費の対象", function () {
    var state = fresh(), prep = prepareTactical(state); applySynthetic(state, prep, .45, .60);
    var upkeep = S.Systems.Domestic.armyUpkeepForFaction(state, "aotsuki");
    T.equal(upkeep.armies, 1);
    T.assert(upkeep.gold > 0 && upkeep.food > 0);
  });

  T.test("Phase5: 包囲状態はschema12のまま保存復元可能", function () {
    localStorage.data = {};
    var state = fresh(), prep = prepareTactical(state); applySynthetic(state, prep, .45, .60);
    T.assert(S.Save.save(state, "manual1").ok);
    var loaded = S.Save.load("manual1");
    T.assert(loaded.ok, loaded.errors && loaded.errors.join(" / "));
    var army = loaded.state.armies[prep.armyId];
    T.assert(army && army.status === "besieging" && army.siege);
    T.equal(loaded.state.schemaVersion, 12);
    valid(loaded.state);
  });

  T.test("Phase5: 包囲中でも撤退すれば生存兵と武将が出陣元へ戻る", function () {
    var state = fresh(), prep = prepareTactical(state); applySynthetic(state, prep, .45, .60);
    var r = S.Systems.Army.cancelMarch(state, prep.armyId);
    T.assert(r.ok, r.errors && r.errors.join(" / "));
    T.equal(Boolean(state.armies[prep.armyId]), false);
    T.equal(state.officers.keiketsu.castleId, "kiyosu");
    T.equal(state.castles.narumi.factionId, "tokizawa");
    valid(state);
  });

  T.test("Phase5: Legacy Battleはthreshold=0相当で従来通り即落城", function () {
    var state = fresh();
    var plan = S.Systems.Battle.plan(state, { sourceId: "kiyosu", targetId: "narumi", commanderId: "keiketsu", deputyId: "soma", tacticId: "standard", decisionId: "trust", committedTroops: 40, attackerFactionId: "aotsuki", defenderFactionId: "tokizawa" });
    T.assert(plan.ok, plan.errors && plan.errors.join(" / "));
    var result = S.Systems.Battle.resolve(state, { forceWin: true, random: rng(.9) });
    T.assert(result.ok, result.errors && result.errors.join(" / "));
    T.equal(state.castles.narumi.factionId, "aotsuki");
    T.equal(result.stateChanges.report.castleCaptured, true);
    T.equal(result.stateChanges.report.siegeStatus, "captured");
    valid(state);
  });

  T.run();
})(window.Sengoku, window.SengokuTest);
