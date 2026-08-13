(function (S, T) {
  "use strict";
  function fresh(options) { var state = S.State.createInitialState(options || {}); state.campaign.status = "playing"; state.settings.aiEnabled = false; return state; }
  function valid(state) { var result = S.State.validateState(state); T.assert(result.ok, result.errors.join(" / ")); }

  T.test("Phase7: 全12城に静的な城個性プロフィールがある", function () {
    var state = fresh({ scenarioId: "core_campaign", playerFactionId: "aotsuki" });
    Object.keys(state.castles).forEach(function (id) {
      var profile = S.Data.getCastleProfile(id);
      T.assert(profile && profile.title && profile.type && profile.modifiers);
      T.assert(Number.isFinite(profile.modifiers.gold));
      T.assert(Number.isFinite(profile.modifiers.siegeDefense));
    });
    valid(state);
  });

  T.test("Phase7: 奉行任命は城ごとに1人だけで前任者を待機へ戻す", function () {
    var state = fresh();
    var first = S.Systems.Officer.assignDomestic(state, "soma", "kiyosu", { consumeCommand: false });
    T.assert(first.ok);
    var second = S.Systems.Officer.assignDomestic(state, "kanenobu", "kiyosu", { consumeCommand: false });
    T.assert(second.ok);
    T.equal(state.officers.kanenobu.assignment.type, "domestic");
    T.equal(state.officers.soma.assignment.type, "idle");
    T.equal(S.Systems.Officer.domesticOfficerAt(state, "kiyosu").id, "kanenobu");
    valid(state);
  });

  T.test("Phase7: 奉行の政治力が季節金収入を押し上げる", function () {
    var state = fresh(), castle = state.castles.kiyosu;
    var before = S.Systems.Domestic.effectiveGoldYieldForCastle(state, castle);
    var result = S.Systems.Officer.assignDomestic(state, "soma", "kiyosu", { consumeCommand: false });
    T.assert(result.ok);
    var after = S.Systems.Domestic.effectiveGoldYieldForCastle(state, castle);
    T.assert(after > before, "奉行任命後に金収入が増えていません");
    valid(state);
  });

  T.test("Phase7: 奉行を出陣させると内政担当を失う", function () {
    var state = fresh(), castle = state.castles.kiyosu;
    T.assert(S.Systems.Officer.assignDomestic(state, "soma", "kiyosu", { consumeCommand: false }).ok);
    var withSteward = S.Systems.Domestic.effectiveGoldYieldForCastle(state, castle);
    var deployed = S.Systems.Army.deploy(state, "kiyosu", [{ officerId: "soma", unitType: "teppo", troops: 20 }], { commanderId: "soma", factionId: "aotsuki" });
    T.assert(deployed.ok, deployed.errors && deployed.errors.join(" / "));
    T.equal(state.officers.soma.assignment.type, "army");
    T.equal(S.Systems.Officer.domesticOfficerAt(state, "kiyosu"), null);
    T.assert(S.Systems.Domestic.effectiveGoldYieldForCastle(state, castle) < withSteward);
    valid(state);
  });

  T.test("Phase7: 山城と城主統率が攻城防御へ加算される", function () {
    var state = fresh({ scenarioId: "core_campaign", playerFactionId: "aotsuki" });
    S.Systems.Officer.moveOfficer(state, "kanenobu", "tsukikage", { consumeCommand: false, silent: true });
    var deployed = S.Systems.Army.deploy(state, "tsukikage", [{ officerId: "kanenobu", unitType: "ashigaru", troops: 20 }], { commanderId: "kanenobu", factionId: "aotsuki" });
    T.assert(deployed.ok, deployed.errors && deployed.errors.join(" / "));
    var preview = S.Systems.Siege.preview(state, deployed.stateChanges.armyId, "shirakawa", 1);
    T.assert(preview && preview.strategicDefenseBonus >= S.Data.getCastleProfile("shirakawa").modifiers.siegeDefense);
    T.equal(preview.castleProfileTitle, S.Data.getCastleProfile("shirakawa").title);
    valid(state);
  });

  T.test("Phase7: 自領を経由して最大3区間の敵城へ進軍路を検索できる", function () {
    var state = fresh({ scenarioId: "core_campaign", playerFactionId: "aotsuki" });
    var route = S.Systems.Army.findRoute(state, "aotsuki", "aonohara", "narumi", { maxHops: 3 });
    T.assert(Array.isArray(route));
    T.equal(route[0], "aonohara");
    T.equal(route[route.length - 1], "narumi");
    T.assert(route.indexOf("kiyosu") >= 0);
    T.equal(route.length - 1, 2);
    valid(state);
  });

  T.test("Phase7: 多区間Armyは友軍中継城で消えず次区間へ進む", function () {
    var state = fresh({ scenarioId: "core_campaign", playerFactionId: "aotsuki" });
    T.assert(S.Systems.Officer.moveOfficer(state, "kanenobu", "aonohara", { consumeCommand: false, silent: true }).ok);
    var deployed = S.Systems.Army.deployAndMarch(state, "aonohara", "narumi", [{ officerId: "kanenobu", unitType: "ashigaru", troops: 20 }], { commanderId: "kanenobu", factionId: "aotsuki", consumeCommand: false, maxHops: 3 });
    T.assert(deployed.ok, deployed.errors && deployed.errors.join(" / "));
    var armyId = deployed.stateChanges.armyId, army = state.armies[armyId];
    T.equal(army.route.join(">"), "aonohara>kiyosu>narumi");
    var first = S.Systems.Army.advanceSeason(state, { allowTactical: false, random: function () { return 0.99; } });
    T.assert(first.ok, first.errors && first.errors.join(" / "));
    T.assert(state.armies[armyId], "中継城でArmyが消えました");
    T.equal(state.armies[armyId].currentLocation.fromCastleId, "kiyosu");
    T.equal(state.armies[armyId].currentLocation.toCastleId, "narumi");
    valid(state);
  });

  T.test("Phase7: 山道区間は平地より進軍季数が長くなる", function () {
    var state = fresh({ scenarioId: "core_campaign", playerFactionId: "aotsuki" });
    var mountain = S.Systems.Army.segmentSeasons(state, "aonohara", "tsukikage");
    var road = S.Systems.Army.segmentSeasons(state, "kiyosu", "narumi");
    T.assert(mountain > road, "山道と平地の移動時間に差がありません");
    T.equal(mountain, 2);
    T.equal(road, 1);
  });

  T.test("Phase7: AIは余剰武将がいる城へ奉行を自動配置する", function () {
    var state = fresh({ scenarioId: "core_campaign", playerFactionId: "tokizawa" });
    var before = S.Systems.Officer.domesticOfficerAt(state, "atsuta");
    T.equal(before, null);
    var result = S.Systems.AI.ensureAssignments(state, "yukishiro");
    T.assert(result.ok);
    var after = S.Systems.Officer.domesticOfficerAt(state, "atsuta");
    T.assert(after && after.id === "yukishiro_temp_4");
    valid(state);
  });

  T.test("Phase7: schema12のまま保存/移行互換を維持", function () {
    var state = fresh();
    T.assert(S.Systems.Officer.assignDomestic(state, "soma", "kiyosu", { consumeCommand: false }).ok);
    var migrated = S.State.migrateState(S.Util.deepClone(state));
    T.assert(migrated.ok, migrated.errors && migrated.errors.join(" / "));
    T.equal(migrated.state.schemaVersion, 12);
    T.equal(migrated.state.officers.soma.assignment.type, "domestic");
    valid(migrated.state);
  });

  T.run();
})(window.Sengoku, window.SengokuTest);
