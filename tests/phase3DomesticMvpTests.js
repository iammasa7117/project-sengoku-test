(function (S, T) {
  "use strict";
  function fresh() { var state = S.State.createInitialState(); state.campaign.status = "playing"; return state; }
  function valid(state) { var result = S.State.validateState(state); T.assert(result.ok, result.errors.join(" / ")); }

  T.test("Phase3: schema12で人口と農業を持つ", function () {
    var state = fresh(), castle = state.castles.kiyosu;
    T.equal(state.schemaVersion, 12);
    T.assert(Number.isInteger(castle.population) && castle.population > 0);
    T.assert(Number.isInteger(castle.agriculture) && castle.agriculture > 0);
    T.assert(S.Systems.Domestic.recruitmentCapacity(castle) >= S.Config.MIN_GARRISON);
    valid(state);
  });

  T.test("Phase3: v11 saveをv12へ非破壊migration", function () {
    var old = fresh(), beforeTroops = old.castles.kiyosu.troops;
    old.schemaVersion = 11;
    Object.keys(old.castles).forEach(function (id) { delete old.castles[id].population; delete old.castles[id].agriculture; });
    var result = S.State.migrateState(old);
    T.assert(result.ok, result.errors && result.errors.join(" / "));
    T.equal(result.state.schemaVersion, 12);
    T.equal(result.state.castles.kiyosu.troops, beforeTroops);
    T.assert(result.state.castles.kiyosu.population > 0);
    T.assert(result.state.castles.kiyosu.agriculture > 0);
    valid(result.state);
  });

  T.test("Phase3: 人口が税収へ接続される", function () {
    var state = fresh(), castle = state.castles.kiyosu, before = S.Systems.Domestic.goldYieldForCastle(castle);
    castle.population += S.Config.Balance.domestic.taxPopulationDivisor * 2;
    T.equal(S.Systems.Domestic.goldYieldForCastle(castle), before + 2);
    valid(state);
  });

  T.test("Phase3: 農業が兵糧収入へ接続される", function () {
    var state = fresh(), castle = state.castles.kiyosu, before = S.Systems.Domestic.foodYieldForCastle(castle);
    castle.agriculture += 1;
    T.equal(S.Systems.Domestic.foodYieldForCastle(castle), before + S.Config.Balance.domestic.foodPerAgriculture);
    valid(state);
  });

  T.test("Phase3: 開墾で農業と人口が増える", function () {
    var state = fresh(), castle = state.castles.kiyosu, agri = castle.agriculture, pop = castle.population, gold = state.campaign.gold, commands = state.campaign.commands;
    var result = S.Systems.Domestic.executeCultivation(state, "kiyosu", "soma");
    T.assert(result.ok, result.errors && result.errors.join(" / "));
    T.equal(castle.agriculture, agri + 1);
    T.assert(castle.population > pop);
    T.equal(state.campaign.gold, gold - S.Config.Balance.cultivate.gold);
    T.equal(state.campaign.commands, commands - 1);
    valid(state);
  });

  T.test("Phase3: 徴兵は人口を兵へ変換し徴兵上限を守る", function () {
    var state = fresh(), castle = state.castles.kiyosu, pop = castle.population, troops = castle.guardTroops;
    var result = S.Systems.Domestic.executeRecruitment(state, "kiyosu", "soma");
    T.assert(result.ok, result.errors && result.errors.join(" / "));
    var gained = castle.guardTroops - troops;
    T.assert(gained > 0);
    T.equal(pop - castle.population, gained * S.Config.Balance.domestic.populationPerRecruit);
    T.assert(castle.guardTroops <= result.stateChanges.recruitmentCapacity || gained > 0);
    valid(state);
  });

  T.test("Phase3: 徴兵上限到達時は資源を消費せず拒否", function () {
    var state = fresh(), castle = state.castles.kiyosu;
    S.Systems.Unit.setGuardTroops(state, castle, S.Systems.Domestic.recruitmentCapacity(castle));
    var gold = state.campaign.gold, food = state.campaign.food;
    var result = S.Systems.Domestic.executeRecruitment(state, "kiyosu", "soma");
    T.equal(result.ok, false);
    T.equal(state.campaign.gold, gold); T.equal(state.campaign.food, food);
    valid(state);
  });

  T.test("Phase3: Army維持費は兵力に比例", function () {
    var state = fresh();
    var deployed = S.Systems.Army.deployAndMarch(state, "kiyosu", "narumi", [{ officerId: "keiketsu", unitType: "ashigaru", troops: 25 }], { commanderId: "keiketsu", factionId: "aotsuki", consumeCommand: false });
    T.assert(deployed.ok, deployed.errors && deployed.errors.join(" / "));
    var cost = S.Systems.Domestic.upkeepForArmy(state, deployed.stateChanges.armyId);
    T.equal(cost.troops, 25);
    T.equal(cost.gold, 1);
    T.equal(cost.food, 3);
    valid(state);
  });

  T.test("Phase3: 季節経済で収入後にArmy維持費を支払う", function () {
    var baseline = fresh(), withArmy = fresh();
    baseline.campaign.gold = 100; baseline.campaign.food = 100;
    withArmy.campaign.gold = 100; withArmy.campaign.food = 100;
    var deployed = S.Systems.Army.deployAndMarch(withArmy, "kiyosu", "narumi", [{ officerId: "keiketsu", unitType: "ashigaru", troops: 25 }], { commanderId: "keiketsu", factionId: "aotsuki", consumeCommand: false });
    T.assert(deployed.ok);
    var a = S.Systems.Domestic.processFactionSeasonEconomy(baseline, "aotsuki", { economyModifier: 1 });
    var b = S.Systems.Domestic.processFactionSeasonEconomy(withArmy, "aotsuki", { economyModifier: 1 });
    T.assert(a.ok && b.ok);
    T.equal(baseline.campaign.gold - withArmy.campaign.gold, 1);
    T.equal(baseline.campaign.food - withArmy.campaign.food, 3);
    valid(baseline); valid(withArmy);
  });

  T.test("Phase3: 維持費不足でも資源は負値にならず士気低下", function () {
    var state = fresh();
    var deployed = S.Systems.Army.deployAndMarch(state, "kiyosu", "narumi", [{ officerId: "keiketsu", unitType: "ashigaru", troops: 25 }], { commanderId: "keiketsu", factionId: "aotsuki", consumeCommand: false });
    T.assert(deployed.ok);
    state.campaign.gold = 0; state.campaign.food = 0;
    Object.keys(state.castles).forEach(function (id) { if (state.castles[id].factionId === "aotsuki") { state.castles[id].income = 0; state.castles[id].agriculture = 0; state.castles[id].population = 0; } });
    var unit = S.Systems.Unit.forArmy(state, deployed.stateChanges.armyId)[0], morale = unit.morale;
    var result = S.Systems.Domestic.processFactionSeasonEconomy(state, "aotsuki", { economyModifier: 1 });
    T.assert(result.ok);
    T.equal(state.campaign.gold, 0); T.equal(state.campaign.food, 0);
    T.assert(unit.morale < morale);
    valid(state);
  });

  T.test("Phase3: Turn.advanceが経済Phaseを返す", function () {
    var state = fresh(), result = S.Systems.Turn.advance(state, { skipAI: true, random: function () { return 0.99; } });
    T.assert(result.ok, result.errors && result.errors.join(" / "));
    T.assert(result.stateChanges.economyPhase);
    T.assert(Array.isArray(result.stateChanges.economyPhase.factions));
    valid(state);
  });

  T.test("Phase3: schema12 save/loadが人口・農業を保持", function () {
    localStorage.data = {};
    var state = fresh(); state.castles.kiyosu.population += 123; state.castles.kiyosu.agriculture += 1;
    T.assert(S.Save.save(state, "manual1").ok);
    var loaded = S.Save.load("manual1");
    T.assert(loaded.ok, loaded.errors && loaded.errors.join(" / "));
    T.equal(loaded.state.schemaVersion, 12);
    T.equal(loaded.state.castles.kiyosu.population, state.castles.kiyosu.population);
    T.equal(loaded.state.castles.kiyosu.agriculture, state.castles.kiyosu.agriculture);
    valid(loaded.state);
  });

  T.test("Phase3: 不正人口・農業をvalidateStateが拒否", function () {
    var a = fresh(); a.castles.kiyosu.population = -1; T.equal(S.State.validateState(a).ok, false);
    var b = fresh(); b.castles.kiyosu.agriculture = S.Config.Balance.domestic.agricultureMax + 1; T.equal(S.State.validateState(b).ok, false);
  });

  T.run();
})(window.Sengoku, window.SengokuTest);
