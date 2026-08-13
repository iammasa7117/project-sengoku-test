(function (S) {
  "use strict";
  function indexById(items, mapper) {
    var result = {};
    items.forEach(function (item) { result[item.id] = mapper ? mapper(item) : S.Util.deepClone(item); });
    return result;
  }
  S.State.createInitialState = function (options) {
    options = options || {};
    var scenario = S.Data.getScenario(options.scenarioId || "owari_short");
    var difficulty = S.Data.getDifficulty(options.difficultyId || scenario.defaultDifficultyId);
    var playerFactionId = scenario.selectableFactionIds.indexOf(options.playerFactionId) >= 0 ? options.playerFactionId : scenario.defaultPlayerFactionId;
    var factionData = S.Data.factions.filter(function (item) { return scenario.factionIds.indexOf(item.id) >= 0; });
    var castleData = S.Data.castles.filter(function (item) { return scenario.castleIds.indexOf(item.id) >= 0; });
    var officerData = S.Data.officers.filter(function (item) { return scenario.officerIds.indexOf(item.id) >= 0; });
    var factions = indexById(factionData, function (base) {
      return { id: base.id, name: base.name, color: base.color, alive: true, eliminatedTurn: null, gold: base.initialGold, food: base.initialFood };
    });
    var castles = indexById(castleData, function (base) {
      var castle = S.Util.deepClone(base);
      castle.neighbors = castle.neighbors.filter(function (id) { return scenario.castleIds.indexOf(id) >= 0; });
      if (castle.factionId === playerFactionId) castle.troops = Math.max(1, Math.round(castle.troops * difficulty.playerTroops));
      castle.guardTroops = castle.troops;
      var domestic = S.Config.Balance.domestic;
      castle.population = Math.max(domestic.minPopulation, Math.floor(castle.income * domestic.populationPerIncome + castle.guardTroops * domestic.populationPerGuardTroop));
      castle.agriculture = Math.max(1, Math.min(domestic.agricultureMax, Math.floor(castle.income / 4)));
      return castle;
    });
    var officers = indexById(officerData, function (base) {
      var officer = S.Util.deepClone(base);
      var goal = S.Data.goals[officer.id] || { title: "戦国の道", text: "この戦役で役割を果たす。", target: 1, reward: "奮起" };
      officer.goal = S.Util.deepClone(goal); officer.goal.progress = 0; officer.goal.completed = false; officer.goal.flags = {};
      officer.profile = S.State.createOfficerProfile();
      if (scenario.officerPlacements && scenario.officerPlacements[officer.id]) officer.castleId = scenario.officerPlacements[officer.id];
      officer.assignment = { type: "idle", castleId: officer.castleId || null, armyId: null };
      return officer;
    });
    Object.keys(castles).forEach(function (id) {
      var castle = castles[id], governor = castle.governorId ? officers[castle.governorId] : null;
      if (!governor || governor.factionId !== castle.factionId) castle.governorId = null;
      else { governor.castleId = castle.id; governor.assignment = { type: "governor", castleId: castle.id, armyId: null }; }
    });
    var playerBase = factions[playerFactionId];
    var initialGold = Math.round((playerBase ? playerBase.gold : S.Config.Balance.initialGold) * difficulty.playerResource);
    var initialFood = Math.round((playerBase ? playerBase.food : S.Config.Balance.initialFood) * difficulty.playerResource);
    var selectedCastleId = scenario.castleIds.find(function (id) { return castles[id] && castles[id].factionId === playerFactionId; }) || scenario.castleIds[0];
    var state = {
      schemaVersion: S.Config.SCHEMA_VERSION,
      gameVersion: S.Config.GAME_VERSION,
      meta: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), migratedFrom: null, favoriteOfficerId: null, houseHonor: 50, saveSummary: null },
      campaign: {
        status: "title", scenarioId: scenario.id, difficultyId: difficulty.id, playerFactionId: playerFactionId,
        year: 1, season: 0, turn: 0, gold: initialGold, food: initialFood,
        commands: S.Config.Balance.maxCommands, maxCommands: S.Config.Balance.maxCommands,
        selectedCastleId: selectedCastleId, gameOver: false, outcome: null, battleCount: 0
      },
      factions: factions,
      castles: castles,
      officers: officers,
      units: {},
      armies: {},
      relationships: { officers: { "kanenobu|keiketsu": 8, "keiketsu|soma": 16, "kanenobu|soma": 4 }, memories: [] },
      diplomacy: S.Data.diplomacy.createState(scenario.id, scenario.factionIds),
      prisoners: [], rivalries: {},
      events: {
        intel: {}, flags: { openingComplete: false, firstRivalRetreat: false }, triggeredIds: [],
        engine: S.State.createEventEngineState(options.eventSeed),
        log: [{ text: scenario.id === "owari_short" ? "三人の家臣が、最初の軍議に集まりました。" : factions[playerFactionId].name + "の長期軍議が始まりました。", type: "major" }],
        battleReports: [], loyaltyEvents: [], rivalEvents: [], pendingBattle: null, pendingTacticalBattle: null, defenseNotifications: [], aiHistory: []
      },
      chronicle: [{ date: "永禄元年 春", text: scenario.id === "owari_short" ? "蒼月家は清洲城ただ一城を残し、滅亡の危機を迎えた。" : factions[playerFactionId].name + "は群雄キャンペーン（仮）を開始しました。" }],
      settings: S.State.upgradeUXSettings({ aiEnabled: true, autosave: true, sound: false, tutorial: { enabled: options.tutorialEnabled !== false } }),
      debug: { lastValidation: null, lastSimulation: null }
    };
    return state;
  };
})(window.Sengoku);
