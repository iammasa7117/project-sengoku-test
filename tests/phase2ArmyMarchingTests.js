(function (S, T) {
  "use strict";
  function fresh() { var state = S.State.createInitialState(); state.campaign.status = "playing"; return state; }
  function valid(state) { var result = S.State.validateState(state); T.assert(result.ok, result.errors.join(" / ")); }
  function specs(troops) { return [{ officerId: "keiketsu", unitType: "ashigaru", troops: troops || 20 }]; }
  function rng(value) { return function () { return value; }; }

  T.test("Phase2: Army Marching APIが存在", function () {
    T.equal(typeof S.Systems.Army.deployAndMarch, "function");
    T.equal(typeof S.Systems.Army.startMarch, "function");
    T.equal(typeof S.Systems.Army.advanceSeason, "function");
    T.equal(typeof S.Systems.Army.resolveArrivalLegacy, "function");
  });

  T.test("Phase2: deployAndMarchで1命令消費し進軍状態になる", function () {
    var state = fresh(), before = state.castles.kiyosu.guardTroops, commands = state.campaign.commands;
    var result = S.Systems.Army.deployAndMarch(state, "kiyosu", "narumi", specs(20), { commanderId: "keiketsu", factionId: "aotsuki", consumeCommand: true });
    T.assert(result.ok, result.errors && result.errors.join(" / "));
    var army = state.armies[result.stateChanges.armyId];
    T.equal(state.campaign.commands, commands - 1);
    T.equal(army.status, "marching");
    T.equal(army.destinationCastleId, "narumi");
    T.equal(army.currentLocation.fromCastleId, "kiyosu");
    T.equal(army.currentLocation.toCastleId, "narumi");
    T.equal(army.currentLocation.hopsRemaining, 1);
    T.equal(state.castles.kiyosu.guardTroops, before - 20);
    valid(state);
  });

  T.test("Phase2: 非隣接城への進軍は拒否され兵力も維持", function () {
    var state = fresh(), before = state.castles.kiyosu.guardTroops;
    var result = S.Systems.Army.deployAndMarch(state, "kiyosu", "hakuro", specs(20), { commanderId: "keiketsu", factionId: "aotsuki", consumeCommand: true });
    T.equal(result.ok, false);
    T.equal(Object.keys(state.armies).length, 0);
    T.equal(Object.keys(state.units).length, 0);
    T.equal(state.castles.kiyosu.guardTroops, before);
    valid(state);
  });

  T.test("Phase2: 最低攻撃兵力未満のArmyは出陣不可", function () {
    var state = fresh(), before = state.castles.kiyosu.guardTroops;
    var result = S.Systems.Army.deployAndMarch(state, "kiyosu", "narumi", specs(S.Config.MIN_ATTACK_FORCE - 1), { commanderId: "keiketsu", factionId: "aotsuki", consumeCommand: true });
    T.equal(result.ok, false);
    T.equal(state.castles.kiyosu.guardTroops, before);
    valid(state);
  });

  T.test("Phase2: 撤兵で兵と武将が出陣元へ戻る", function () {
    var state = fresh(), before = state.castles.kiyosu.guardTroops;
    var deployed = S.Systems.Army.deployAndMarch(state, "kiyosu", "narumi", specs(20), { commanderId: "keiketsu", factionId: "aotsuki", consumeCommand: false });
    T.assert(deployed.ok);
    var canceled = S.Systems.Army.cancelMarch(state, deployed.stateChanges.armyId);
    T.assert(canceled.ok, canceled.errors && canceled.errors.join(" / "));
    T.equal(state.castles.kiyosu.guardTroops, before);
    T.equal(state.officers.keiketsu.castleId, "kiyosu");
    T.equal(state.officers.keiketsu.assignment.type, "idle");
    T.equal(Object.keys(state.armies).length, 0);
    valid(state);
  });

  T.test("Phase2: 到着前に和平成立なら戦闘せず撤収", function () {
    var state = fresh(), beforeBattle = state.campaign.battleCount;
    var deployed = S.Systems.Army.deployAndMarch(state, "kiyosu", "narumi", specs(20), { commanderId: "keiketsu", factionId: "aotsuki", consumeCommand: false });
    T.assert(deployed.ok);
    T.assert(S.Systems.Diplomacy.makePeace(state, "aotsuki", "tokizawa", { forceAccept: true }).ok);
    var phase = S.Systems.Army.advanceSeason(state, { random: rng(0.5) });
    T.assert(phase.ok, phase.errors && phase.errors.join(" / "));
    T.equal(state.campaign.battleCount, beforeBattle);
    T.equal(Object.keys(state.armies).length, 0);
    T.equal(state.officers.keiketsu.castleId, "kiyosu");
    valid(state);
  });

  T.test("Phase2: 進軍Armyが次季に到着しLegacy Battleで勝利・占領", function () {
    var state = fresh();
    S.Systems.Unit.setGuardTroops(state, "narumi", 8); state.castles.narumi.defense = 0; state.castles.narumi.morale = 40;
    var deployed = S.Systems.Army.deployAndMarch(state, "kiyosu", "narumi", [{ officerId: "keiketsu", unitType: "ashigaru", troops: 35 }, { officerId: "kanenobu", unitType: "kiba", troops: 20 }], { commanderId: "keiketsu", factionId: "aotsuki", consumeCommand: false });
    T.assert(deployed.ok, deployed.errors && deployed.errors.join(" / "));
    var phase = S.Systems.Army.advanceSeason(state, { random: rng(0.99) });
    T.assert(phase.ok, phase.errors && phase.errors.join(" / "));
    T.equal(state.castles.narumi.factionId, "aotsuki");
    T.equal(Object.keys(state.armies).length, 0);
    T.equal(Object.keys(state.units).length, 0);
    T.equal(state.officers.keiketsu.castleId, "narumi");
    T.assert(phase.stateChanges.actions[0].report);
    T.equal(phase.stateChanges.actions[0].report.targetId, "narumi");
    valid(state);
  });

  T.test("Phase2: 進軍Army敗北時は生存兵と武将が出陣元へ帰還", function () {
    var state = fresh();
    S.Systems.Unit.setGuardTroops(state, "narumi", 500); state.castles.narumi.defense = 5; state.castles.narumi.morale = 100;
    var deployed = S.Systems.Army.deployAndMarch(state, "kiyosu", "narumi", specs(20), { commanderId: "keiketsu", factionId: "aotsuki", consumeCommand: false });
    T.assert(deployed.ok);
    var phase = S.Systems.Army.advanceSeason(state, { random: rng(0) });
    T.assert(phase.ok, phase.errors && phase.errors.join(" / "));
    T.equal(state.castles.narumi.factionId, "tokizawa");
    T.equal(Object.keys(state.armies).length, 0);
    T.equal(Object.keys(state.units).length, 0);
    T.equal(state.officers.keiketsu.castleId, "kiyosu");
    T.assert(state.castles.kiyosu.guardTroops >= S.Config.MIN_GARRISON);
    valid(state);
  });

  T.test("Phase2: Turn.advanceがArmy移動・合戦を季節処理へ統合", function () {
    var state = fresh();
    S.Systems.Unit.setGuardTroops(state, "narumi", 8); state.castles.narumi.defense = 0; state.castles.narumi.morale = 40;
    var deployed = S.Systems.Army.deployAndMarch(state, "kiyosu", "narumi", [{ officerId: "keiketsu", unitType: "ashigaru", troops: 40 }], { commanderId: "keiketsu", factionId: "aotsuki", consumeCommand: false });
    T.assert(deployed.ok);
    var result = S.Systems.Turn.advance(state, { skipAI: true, random: rng(0.99) });
    T.assert(result.ok, result.errors && result.errors.join(" / "));
    T.assert(Array.isArray(result.stateChanges.armyActions));
    T.equal(result.stateChanges.armyActions.length, 1);
    T.assert(result.stateChanges.armyActions[0].report);
    T.equal(state.castles.narumi.factionId, "aotsuki");
    valid(state);
  });

  T.test("Phase2: 進軍中Armyをschema12セーブ/ロード可能", function () {
    localStorage.data = {};
    var state = fresh();
    var deployed = S.Systems.Army.deployAndMarch(state, "kiyosu", "narumi", specs(20), { commanderId: "keiketsu", factionId: "aotsuki", consumeCommand: false });
    T.assert(deployed.ok);
    T.assert(S.Save.save(state, "manual1").ok);
    var loaded = S.Save.load("manual1");
    T.assert(loaded.ok, loaded.errors && loaded.errors.join(" / "));
    var army = loaded.state.armies[deployed.stateChanges.armyId];
    T.equal(army.status, "marching");
    T.equal(army.currentLocation.toCastleId, "narumi");
    valid(loaded.state);
  });

  T.run();
})(window.Sengoku, window.SengokuTest);
