(function (S) {
  "use strict";
  var T = S.Systems.Turn = {};
  T.dateLabel = function (state) { return "永禄" + state.campaign.year + "年 " + S.Config.SEASONS[state.campaign.season]; };
  T.playerCastles = function (state) { return Object.keys(state.castles).map(function (id) { return state.castles[id]; }).filter(function (castle) { return castle.factionId === state.campaign.playerFactionId; }); };

  function finishSeason(state, options, rng) {
    options = options || {}; rng = rng || options.random || Math.random;
    var aiDiplomacyResult = { ok: true, stateChanges: { actions: [] }, errors: [] }, aiResult = { ok: true, stateChanges: { actions: [] }, errors: [] };
    if (!state.campaign.gameOver && state.settings.aiEnabled && !options.skipAI) {
      aiDiplomacyResult = S.Systems.AI.runDiplomacySeason(state, { random: rng, allFactions: Boolean(options.allFactionsAI) });
      aiResult = S.Systems.AI.runSeason(state, { random: rng, allFactions: Boolean(options.allFactionsAI) });
    }
    state.campaign.season += 1;
    if (state.campaign.season >= 4) { state.campaign.season = 0; state.campaign.year += 1; Object.keys(state.officers).forEach(function (id) { state.officers[id].age += 1; }); }
    state.campaign.commands = state.campaign.maxCommands;
    S.Systems.Event.runSeasonEvents(state, rng);
    Object.keys(state.officers).forEach(function (id) { var officer = state.officers[id]; if (officer.promise && officer.promise.status === "pending" && state.campaign.turn > officer.promise.dueTurn) { officer.promise.status = "broken"; officer.grievance += 18; S.Systems.Loyalty.change(state, id, -12, "城主への約束を破られた。"); S.Systems.Event.addChronicle(state, officer.name + "への城主の約束は果たされませんでした。"); } });
    S.Systems.Loyalty.processDefections(state, rng); S.Systems.Event.addLog(state, S.Config.SEASONS[state.campaign.season] + "の軍議が始まりました。", "major"); S.Systems.Victory.check(state);
    return { ok: aiDiplomacyResult.ok && aiResult.ok, stateChanges: { season: state.campaign.season, year: state.campaign.year, aiDiplomacyActions: aiDiplomacyResult.stateChanges.actions, aiActions: aiResult.stateChanges.actions }, messages: [], errors: (aiDiplomacyResult.errors || []).concat(aiResult.errors || []) };
  }

  T.advance = function (state, options) {
    options = options || {};
    if (state.campaign.gameOver) return { ok: false, errors: ["戦役は終了しています"] };
    if (state.events && state.events.pendingTacticalBattle) return { ok: false, errors: ["会戦中です。先にTactical Battleを完了してください"] };
    var rng = options.random || Math.random, difficulty = S.Data.getDifficulty(state.campaign.difficultyId);
    var economyPhase = S.Systems.Domestic.processSeasonEconomy(state, { difficulty: difficulty });
    state.campaign.turn += 1;
    Object.keys(state.officers).forEach(function (id) { var officer = state.officers[id]; if (officer.status !== "active") return; officer.fatigue = Math.max(0, officer.fatigue - 12); if (officer.fatigue < 25) officer.health = Math.min(100, officer.health + 5); if (officer.injury === "軽傷" && officer.health >= 90) officer.injury = null; if (officer.injury === "重傷" && officer.health >= 75) officer.injury = "軽傷"; if (officer.factionId === state.campaign.playerFactionId) officer.neglect += 1; officer.seasonMerit = 0; });
    Object.keys(state.events.intel).forEach(function (id) { state.events.intel[id] -= 1; if (state.events.intel[id] <= 0) delete state.events.intel[id]; });
    var diplomacyPhase = S.Systems.Diplomacy.processSeasonStart(state);
    var allowTactical = !options.simulation && !options.allFactionsAI && options.allowTactical !== false;
    var armyPhase = S.Systems.Army && S.Systems.Army.advanceSeason ? S.Systems.Army.advanceSeason(state, { random: rng, allowTactical: allowTactical }) : { ok: true, stateChanges: { actions: [] }, errors: [] };
    if (state.events.pendingTacticalBattle) {
      state.events.pendingTacticalBattle.resumeSeason = true;
      return { ok: economyPhase.ok && diplomacyPhase.ok && armyPhase.ok, stateChanges: { interruptedByTactical: true, economyPhase: economyPhase.stateChanges, diplomacyPhase: diplomacyPhase.stateChanges, armyActions: armyPhase.stateChanges.actions, aiDiplomacyActions: [], aiActions: [], season: state.campaign.season, year: state.campaign.year }, messages: ["進軍Armyが敵城へ到着しました。会戦を指揮してください。"], errors: (economyPhase.errors || []).concat(diplomacyPhase.errors || [], armyPhase.errors || []) };
    }
    var finished = finishSeason(state, options, rng);
    return { ok: economyPhase.ok && diplomacyPhase.ok && armyPhase.ok && finished.ok, stateChanges: { season: finished.stateChanges.season, year: finished.stateChanges.year, economyPhase: economyPhase.stateChanges, diplomacyPhase: diplomacyPhase.stateChanges, armyActions: armyPhase.stateChanges.actions, aiDiplomacyActions: finished.stateChanges.aiDiplomacyActions, aiActions: finished.stateChanges.aiActions }, messages: [], errors: (economyPhase.errors || []).concat(diplomacyPhase.errors || [], armyPhase.errors || [], finished.errors || []) };
  };

  T.resumeAfterTactical = function (state, options) {
    options = options || {};
    if (state.events && state.events.pendingTacticalBattle) return { ok: false, errors: ["Tactical Battle結果がまだCoreへ適用されていません"] };
    return finishSeason(state, options, options.random || Math.random);
  };

  S.Systems.Campaign = {
    begin: function (state) { var scenario = S.Data.getScenario(state.campaign.scenarioId); state.campaign.status = scenario.opening.type === "owari_first_battle" ? "opening" : "playing"; state.campaign.gameOver = false; state.campaign.outcome = null; var eventResult = S.Systems.Event.emit(state, S.Config.EVENT_TRIGGERS.CAMPAIGN_START, { scenarioId: scenario.id, factionId: state.campaign.playerFactionId, castleId: state.campaign.selectedCastleId }); return { ok: eventResult.ok, stateChanges: { status: state.campaign.status, activeEvent: eventResult.stateChanges.activeEvent }, messages: eventResult.messages || [], errors: eventResult.errors || [] }; },
    selectCastle: function (state, castleId) { if (!state.castles[castleId]) return { ok: false, errors: ["城が見つかりません"] }; state.campaign.selectedCastleId = castleId; return { ok: true, stateChanges: { selectedCastleId: castleId }, messages: [], errors: [] }; },
    setAI: function (state, enabled) { state.settings.aiEnabled = Boolean(enabled); return { ok: true, stateChanges: { aiEnabled: state.settings.aiEnabled }, messages: [], errors: [] }; },
    recoverCommands: function (state) { state.campaign.commands = state.campaign.maxCommands; return { ok: true, stateChanges: { commands: state.campaign.commands }, messages: [], errors: [] }; },
    transferCastle: function (state, castleId, factionId) {
      var castle = state.castles[castleId], faction = state.factions[factionId]; if (!castle || !faction) return { ok: false, errors: ["移譲対象が不正です"] };
      var oldFactionId = castle.factionId; castle.governorId = null; castle.factionId = factionId;
      S.Systems.Officer.atCastle(state, castleId, oldFactionId).forEach(function (officer) { var fallback = Object.keys(state.castles).find(function (id) { return state.castles[id].factionId === oldFactionId; }); if (fallback) { officer.castleId = fallback; officer.assignment = { type: "idle", castleId: fallback, armyId: null }; } else { officer.status = "ronin"; officer.castleId = null; officer.assignment = { type: "idle", castleId: null, armyId: null }; } });
      S.Systems.Victory.check(state); return { ok: true, stateChanges: { castleId: castleId, oldFactionId: oldFactionId, factionId: factionId }, messages: [castle.name + "を" + faction.name + "へ移譲しました。"], errors: [] };
    }
  };
})(window.Sengoku);