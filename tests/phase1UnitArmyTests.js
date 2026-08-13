(function (S, T) {
  "use strict";
  function fresh() { return S.State.createInitialState(); }
  function valid(state) { var result = S.State.validateState(state); T.assert(result.ok, result.errors.join(" / ")); }

  T.test("Phase1: schemaVersion 12と新規state領域", function () {
    var state = fresh();
    T.equal(state.schemaVersion, 12);
    T.assert(state.units && typeof state.units === "object");
    T.assert(state.armies && typeof state.armies === "object");
    Object.keys(state.castles).forEach(function (id) { T.equal(state.castles[id].guardTroops, state.castles[id].troops); });
    valid(state);
  });

  T.test("Phase1: v10 saveを非破壊的にv11へ移行", function () {
    var old = fresh();
    old.schemaVersion = 10;
    delete old.units; delete old.armies;
    Object.keys(old.castles).forEach(function (id) { delete old.castles[id].guardTroops; });
    Object.keys(old.officers).forEach(function (id) { delete old.officers[id].assignment; });
    var beforeTroops = old.castles.kiyosu.troops;
    var result = S.State.migrateState(old);
    T.assert(result.ok, result.errors && result.errors.join(" / "));
    T.equal(result.state.schemaVersion, 12);
    T.equal(result.state.castles.kiyosu.guardTroops, beforeTroops);
    T.equal(result.state.castles.kiyosu.troops, beforeTroops);
    T.equal(Object.keys(result.state.units).length, 0);
    T.equal(Object.keys(result.state.armies).length, 0);
    valid(result.state);
  });

  T.test("Phase1: guardTroopsとtroopsは専用関数で常に同期", function () {
    var state = fresh(), castle = state.castles.kiyosu;
    T.assert(S.Systems.Unit.setGuardTroops(state, castle, 50).ok);
    T.equal(castle.guardTroops, 50); T.equal(castle.troops, 50);
    T.assert(S.Systems.Unit.changeGuardTroops(state, castle, 7).ok);
    T.equal(castle.guardTroops, 57); T.equal(castle.troops, 57);
    valid(state);
  });

  T.test("Phase1: mirror不一致をvalidateStateが検出", function () {
    var state = fresh(); state.castles.kiyosu.guardTroops += 1;
    var result = S.State.validateState(state);
    T.equal(result.ok, false);
    T.assert(result.errors.some(function (item) { return item.indexOf("城兵力ミラー") >= 0; }));
  });

  T.test("Phase1: Army.deployで守備兵→Unitへ離散的に移す", function () {
    var state = fresh(), before = state.castles.kiyosu.guardTroops;
    var result = S.Systems.Army.deploy(state, "kiyosu", [
      { officerId: "soma", unitType: "teppo", troops: 15, maxTroops: 600 },
      { officerId: "kanenobu", unitType: "kiba", troops: 15, maxTroops: 800 }
    ], { commanderId: "soma" });
    T.assert(result.ok, result.errors && result.errors.join(" / "));
    T.equal(state.castles.kiyosu.guardTroops, before - 30);
    T.equal(state.castles.kiyosu.troops, before - 30);
    T.equal(Object.keys(state.units).length, 2);
    T.equal(Object.keys(state.armies).length, 1);
    T.equal(state.officers.soma.assignment.type, "army");
    T.equal(state.officers.soma.castleId, null);
    T.equal(state.officers.kanenobu.assignment.armyId, result.stateChanges.armyId);
    valid(state);
  });

  T.test("Phase1: Army.disbandで生存兵を城へ戻す", function () {
    var state = fresh(), before = state.castles.kiyosu.guardTroops;
    var deployed = S.Systems.Army.deploy(state, "kiyosu", [
      { officerId: "soma", unitType: "teppo", troops: 12 },
      { officerId: "kanenobu", unitType: "kiba", troops: 18 }
    ], { commanderId: "kanenobu" });
    T.assert(deployed.ok);
    var disband = S.Systems.Army.disband(state, deployed.stateChanges.armyId, "kiyosu");
    T.assert(disband.ok, disband.errors && disband.errors.join(" / "));
    T.equal(disband.stateChanges.returnedTroops, 30);
    T.equal(state.castles.kiyosu.guardTroops, before);
    T.equal(state.castles.kiyosu.troops, before);
    T.equal(Object.keys(state.units).length, 0);
    T.equal(Object.keys(state.armies).length, 0);
    T.equal(state.officers.soma.assignment.type, "idle");
    T.equal(state.officers.soma.castleId, "kiyosu");
    valid(state);
  });

  T.test("Phase1: 同一武将を複数Unitへ配置できない", function () {
    var state = fresh();
    var result = S.Systems.Army.deploy(state, "kiyosu", [
      { officerId: "soma", unitType: "teppo", troops: 10 },
      { officerId: "soma", unitType: "ashigaru", troops: 10 }
    ], { commanderId: "soma" });
    T.equal(result.ok, false);
    T.equal(Object.keys(state.units).length, 0);
    T.equal(Object.keys(state.armies).length, 0);
    valid(state);
  });

  T.test("Phase1: 最低守備兵を割るArmy編成は拒否", function () {
    var state = fresh(), before = state.castles.kiyosu.guardTroops;
    var result = S.Systems.Army.deploy(state, "kiyosu", [
      { officerId: "soma", unitType: "ashigaru", troops: before }
    ], { commanderId: "soma" });
    T.equal(result.ok, false);
    T.equal(state.castles.kiyosu.guardTroops, before);
    valid(state);
  });

  T.test("Phase1: governor assignmentは既存城主と同期", function () {
    var state = fresh();
    T.equal(state.officers.keiketsu.assignment.type, "governor");
    T.equal(state.officers.keiketsu.assignment.castleId, "kiyosu");
    T.assert(S.Systems.Officer.assignGovernor(state, "soma", "kiyosu", { consumeCommand: false }).ok);
    T.equal(state.castles.kiyosu.governorId, "soma");
    T.equal(state.officers.soma.assignment.type, "governor");
    T.equal(state.officers.keiketsu.assignment.type, "idle");
    valid(state);
  });

  T.test("Phase1: Army所属武将は通常の城間移動を拒否", function () {
    var state = fresh();
    var deployed = S.Systems.Army.deploy(state, "kiyosu", [{ officerId: "soma", unitType: "teppo", troops: 10 }], { commanderId: "soma" });
    T.assert(deployed.ok);
    var move = S.Systems.Officer.moveOfficer(state, "soma", "aonohara", { consumeCommand: false });
    T.equal(move.ok, false);
    valid(state);
  });

  T.test("Phase1: 既存徴兵処理もguardTroopsミラーを維持", function () {
    var state = fresh(); state.campaign.status = "playing";
    var before = state.castles.kiyosu.troops;
    var result = S.Systems.Domestic.executeRecruitment(state, "kiyosu", "soma");
    T.assert(result.ok, result.errors && result.errors.join(" / "));
    T.assert(state.castles.kiyosu.troops > before);
    T.equal(state.castles.kiyosu.guardTroops, state.castles.kiyosu.troops);
    valid(state);
  });

  T.test("Phase1: Faction総兵力は城守備兵+出陣Unitを保存", function () {
    var state = fresh(), before = S.Systems.Unit.totalFactionTroops(state, "aotsuki");
    var deployed = S.Systems.Army.deploy(state, "kiyosu", [{ officerId: "soma", unitType: "teppo", troops: 20 }], { commanderId: "soma" });
    T.assert(deployed.ok);
    T.equal(S.Systems.Unit.totalFactionTroops(state, "aotsuki"), before);
    valid(state);
  });

  T.test("Phase1: Unit/Armyを含むschema12 save/loadが往復", function () {
    localStorage.data = {};
    var state = fresh();
    var deployed = S.Systems.Army.deploy(state, "kiyosu", [{ officerId: "soma", unitType: "teppo", troops: 20 }], { commanderId: "soma" });
    T.assert(deployed.ok);
    T.assert(S.Save.save(state, "manual1").ok);
    var loaded = S.Save.load("manual1");
    T.assert(loaded.ok, loaded.errors && loaded.errors.join(" / "));
    T.equal(loaded.state.schemaVersion, 12);
    T.equal(Object.keys(loaded.state.armies).length, 1);
    T.equal(Object.keys(loaded.state.units).length, 1);
    T.equal(loaded.state.officers.soma.assignment.type, "army");
    valid(loaded.state);
  });

  T.run();
})(window.Sengoku, window.SengokuTest);
