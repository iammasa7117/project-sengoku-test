(function (S) {
  "use strict";
  var factionMap = { 0: "aotsuki", 1: "tokizawa", 2: "yukishiro", 3: "kurogane" };
  function normalizeOfficer(officer, fallback) {
    var item = Object.assign({}, fallback || {}, officer || {});
    item.history = Array.isArray(item.history) ? item.history : [];
    item.loyaltyHistory = Array.isArray(item.loyaltyHistory) ? item.loyaltyHistory : [];
    item.traits = Array.isArray(item.traits) ? item.traits : [];
    item.extension = item.extension || { personality: [], relationships: [], storyFlags: {} };
    item.status = S.Config.ALLOWED_OFFICER_STATUS.indexOf(item.status) >= 0 ? item.status : "active";
    ["loyalty", "health", "fatigue", "exp", "level", "merit", "seasonMerit", "battles", "rescues", "grievance", "neglect", "ambition", "lordTrust"].forEach(function (key) { if (!Number.isFinite(item[key])) item[key] = key === "health" || key === "loyalty" ? 70 : key === "level" ? 1 : 0; });
    return item;
  }
  function normalizeProfile(officer) {
    var profile = officer.profile && typeof officer.profile === "object" && !Array.isArray(officer.profile) ? officer.profile : {};
    if (!Array.isArray(profile.personalityIds)) profile.personalityIds = typeof profile.personalityId === "string" ? [profile.personalityId] : [];
    delete profile.personalityId;
    if (!Array.isArray(profile.traitIds)) profile.traitIds = [];
    if (!Array.isArray(profile.tags)) profile.tags = [];
    officer.profile = profile;
  }
  function defaultPopulation(castle) {
    var c = S.Config.Balance.domestic, guard = Number.isFinite(castle.guardTroops) ? castle.guardTroops : castle.troops;
    return Math.max(c.minPopulation, Math.floor((castle.income || 0) * c.populationPerIncome + Math.max(0, guard || 0) * c.populationPerGuardTroop));
  }
  function defaultAgriculture(castle) { return Math.max(1, Math.min(S.Config.Balance.domestic.agricultureMax, Math.floor((castle.income || 0) / 4))); }
  function normalizeAssignment(officer, state) {
    var assignment = officer.assignment && typeof officer.assignment === "object" && !Array.isArray(officer.assignment) ? officer.assignment : null;
    var allowed = ["governor", "domestic", "army", "idle"];
    if (officer.status !== "active") { officer.assignment = { type: "idle", castleId: null, armyId: null }; return; }
    if (assignment && assignment.type === "army" && assignment.armyId && state && state.armies && state.armies[assignment.armyId]) {
      officer.castleId = null;
      officer.assignment = { type: "army", castleId: null, armyId: assignment.armyId };
      return;
    }
    var governorCastleId = state && state.castles ? Object.keys(state.castles).find(function (id) { return state.castles[id].governorId === officer.id; }) : null;
    if (governorCastleId) { officer.castleId = governorCastleId; officer.assignment = { type: "governor", castleId: governorCastleId, armyId: null }; return; }
    var type = assignment && allowed.indexOf(assignment.type) >= 0 && assignment.type !== "army" && assignment.type !== "governor" ? assignment.type : "idle";
    officer.assignment = { type: type, castleId: officer.castleId || null, armyId: null };
  }
  function migrateV11(input, sourceLabel) {
    var state = S.Util.deepClone(input), source = sourceLabel || "core-0.95";
    state.schemaVersion = 12;
    state.units = state.units && typeof state.units === "object" && !Array.isArray(state.units) ? state.units : {};
    state.armies = state.armies && typeof state.armies === "object" && !Array.isArray(state.armies) ? state.armies : {};
    Object.keys(state.castles || {}).forEach(function (id) {
      var castle = state.castles[id];
      if (!Number.isFinite(castle.guardTroops)) castle.guardTroops = Number.isFinite(castle.troops) ? castle.troops : 0;
      castle.troops = castle.guardTroops;
      castle.population = Number.isInteger(castle.population) && castle.population >= 0 ? castle.population : defaultPopulation(castle);
      castle.agriculture = Number.isInteger(castle.agriculture) ? Math.max(0, Math.min(S.Config.Balance.domestic.agricultureMax, castle.agriculture)) : defaultAgriculture(castle);
    });
    Object.keys(state.officers || {}).forEach(function (id) { normalizeProfile(state.officers[id]); normalizeAssignment(state.officers[id], state); });
    state.meta = state.meta || {};
    state.meta.schemaMigratedFrom = source;
    state.meta.schemaMigratedAt = new Date().toISOString();
    state.events = state.events || {}; if (state.events.pendingTacticalBattle === undefined) state.events.pendingTacticalBattle = null; state.events.engine = S.State.upgradeEventEngineState(state.events.engine);
    state.settings = S.State.upgradeUXSettings(state.settings);
    if (S.Systems.Event && S.Systems.Event.reconcileInstances) S.Systems.Event.reconcileInstances(state);
    var validation = S.State.validateState(state);
    return validation.ok ? { ok: true, state: state, source: source } : { ok: false, errors: validation.errors };
  }
  function migrateV10(input, sourceLabel) {
    var state = S.Util.deepClone(input), source = sourceLabel || "core-0.95";
    state.schemaVersion = 11;
    state.units = state.units && typeof state.units === "object" && !Array.isArray(state.units) ? state.units : {};
    state.armies = state.armies && typeof state.armies === "object" && !Array.isArray(state.armies) ? state.armies : {};
    Object.keys(state.castles || {}).forEach(function (id) {
      var castle = state.castles[id];
      castle.troops = Number.isFinite(castle.troops) ? Math.max(0, Math.floor(castle.troops)) : 0;
      castle.guardTroops = castle.troops;
    });
    Object.keys(state.officers || {}).forEach(function (id) { normalizeProfile(state.officers[id]); normalizeAssignment(state.officers[id], state); });
    state.meta = state.meta || {};
    state.meta.schemaMigratedFrom = source;
    state.meta.schemaMigratedAt = new Date().toISOString();
    state.events = state.events || {}; if (state.events.pendingTacticalBattle === undefined) state.events.pendingTacticalBattle = null; state.events.engine = S.State.upgradeEventEngineState(state.events.engine);
    state.settings = S.State.upgradeUXSettings(state.settings);
    if (S.Systems.Event && S.Systems.Event.reconcileInstances) S.Systems.Event.reconcileInstances(state);
    return migrateV11(state, source);
  }
  function migrateV09(input, sourceLabel) {
    var state = S.Util.deepClone(input), source = sourceLabel || "core-0.9";
    state.schemaVersion = 10; state.gameVersion = "core-0.95";
    state.meta = state.meta || {};
    if (state.meta.migratedFrom === undefined) state.meta.migratedFrom = null;
    state.meta.schemaMigratedFrom = source;
    state.meta.schemaMigratedAt = new Date().toISOString();
    Object.keys(state.officers || {}).forEach(function (id) {
      normalizeProfile(state.officers[id]);
    });
    state.events = state.events || {};
    state.events.engine = S.State.upgradeEventEngineState(state.events.engine);
    state.settings = S.State.upgradeUXSettings(state.settings);
    if (S.Systems.Event && S.Systems.Event.reconcileInstances) S.Systems.Event.reconcileInstances(state);
    return migrateV10(state, source);
  }
  S.State.repairState = function (state) {
    var changes = [], castles = state.castles || {}, officers = state.officers || {}, seen = {};
    state.units = state.units && typeof state.units === "object" && !Array.isArray(state.units) ? state.units : {};
    state.armies = state.armies && typeof state.armies === "object" && !Array.isArray(state.armies) ? state.armies : {};
    Object.keys(castles).forEach(function (id) {
      var castle = castles[id];
      castle.troops = Number.isFinite(castle.troops) ? Math.max(0, Math.floor(castle.troops)) : 0;
      castle.guardTroops = Number.isFinite(castle.guardTroops) ? Math.max(0, Math.floor(castle.guardTroops)) : castle.troops;
      castle.troops = castle.guardTroops;
      castle.population = Number.isInteger(castle.population) && castle.population >= 0 ? castle.population : defaultPopulation(castle);
      castle.agriculture = Number.isInteger(castle.agriculture) ? Math.max(0, Math.min(S.Config.Balance.domestic.agricultureMax, castle.agriculture)) : defaultAgriculture(castle);
      castle.neighbors = (castle.neighbors || []).filter(function (neighborId) { return neighborId !== id && Boolean(castles[neighborId]); });
      castle.neighbors.forEach(function (neighborId) { castles[neighborId].neighbors = castles[neighborId].neighbors || []; if (castles[neighborId].neighbors.indexOf(id) < 0) { castles[neighborId].neighbors.push(id); changes.push("隣接を修復: " + id + "<->" + neighborId); } });
      if (castle.governorId) {
        var governor = officers[castle.governorId];
        if (!governor || governor.status !== "active" || governor.factionId !== castle.factionId || governor.castleId !== id || seen[governor.id]) { castle.governorId = null; changes.push("城主を解除: " + id); }
        else seen[governor.id] = id;
      }
    });
    Object.keys(officers).forEach(function (id) {
      var officer = officers[id];
      if (officer.status === "prisoner" || officer.status === "ronin") officer.castleId = null;
      if (officer.status === "active" && (!officer.castleId || !castles[officer.castleId] || castles[officer.castleId].factionId !== officer.factionId)) {
        var destination = Object.keys(castles).find(function (castleId) { return castles[castleId].factionId === officer.factionId; });
        if (destination) { officer.castleId = destination; changes.push("配属を修復: " + id); }
        else { officer.status = "ronin"; officer.castleId = null; changes.push("浪人化: " + id); }
      }
    });
    Object.keys(officers).forEach(function (id) { normalizeAssignment(officers[id], state); });
    var domesticSeen = {};
    Object.keys(officers).sort().forEach(function (id) {
      var officer = officers[id], assignment = officer.assignment || {};
      if (officer.status !== "active" || assignment.type !== "domestic" || !officer.castleId) return;
      if (domesticSeen[officer.castleId]) { officer.assignment = { type: "idle", castleId: officer.castleId, armyId: null }; changes.push("重複奉行を解除: " + id); }
      else domesticSeen[officer.castleId] = id;
    });
    Object.keys(castles).forEach(function (id) { var governorId = castles[id].governorId; if (governorId && officers[governorId]) officers[governorId].assignment = { type: "governor", castleId: id, armyId: null }; });
    state.prisoners = Array.from(new Set((state.prisoners || []).filter(function (id) { return Boolean(officers[id]); })));
    state.prisoners.forEach(function (id) { officers[id].status = "prisoner"; officers[id].castleId = null; officers[id].assignment = { type: "idle", castleId: null, armyId: null }; });
    Object.keys(officers).forEach(function (id) { if (officers[id].status === "prisoner" && state.prisoners.indexOf(id) < 0) state.prisoners.push(id); });
    if (state.events && state.events.pendingBattle) state.events.pendingBattle = null;
    state.relationships = state.relationships || { officers: {}, memories: [] };
    state.relationships.officers = state.relationships.officers || {};
    state.relationships.memories = Array.isArray(state.relationships.memories) ? state.relationships.memories : [];
    var scenario = S.Data.getScenario(state.campaign.scenarioId || "owari_short"), baseDiplomacy = S.Data.diplomacy.createState(scenario.id, Object.keys(state.factions || {}));
    if (!state.diplomacy || !state.diplomacy.warExhaustion) state.diplomacy = baseDiplomacy;
    else {
      state.diplomacy.relations = state.diplomacy.relations || {};
      Object.keys(baseDiplomacy.relations).forEach(function (key) {
        var relation = state.diplomacy.relations[key];
        if (!relation || typeof relation !== "object") { state.diplomacy.relations[key] = baseDiplomacy.relations[key]; changes.push("外交ペアを修復: " + key); return; }
        ["score", "trust", "grievance"].forEach(function (field) { relation[field] = Number.isFinite(relation[field]) ? S.Util.clamp(Math.round(relation[field]), 0, 100) : baseDiplomacy.relations[key][field]; });
        if (S.Data.diplomacy.statuses.indexOf(relation.status) < 0) { relation.status = "neutral"; relation.expiresTurn = null; changes.push("外交状態を修復: " + key); }
      });
      Object.keys(state.diplomacy.relations).forEach(function (key) { if (!baseDiplomacy.relations[key]) { delete state.diplomacy.relations[key]; changes.push("余分な外交ペアを除去: " + key); } });
      state.diplomacy.proposals = Array.isArray(state.diplomacy.proposals) ? state.diplomacy.proposals.filter(function (item) { return item && state.factions[item.actorFactionId] && state.factions[item.targetFactionId] && item.actorFactionId !== item.targetFactionId; }) : [];
      state.diplomacy.history = Array.isArray(state.diplomacy.history) ? state.diplomacy.history : [];
      state.diplomacy.vassalage = state.diplomacy.vassalage && typeof state.diplomacy.vassalage === "object" ? state.diplomacy.vassalage : {};
      state.diplomacy.warExhaustion = state.diplomacy.warExhaustion || {}; state.diplomacy.reputation = state.diplomacy.reputation || {};
      Object.keys(state.factions).forEach(function (id) { state.diplomacy.warExhaustion[id] = Number.isFinite(state.diplomacy.warExhaustion[id]) ? S.Util.clamp(Math.round(state.diplomacy.warExhaustion[id]), 0, 100) : 0; state.diplomacy.reputation[id] = Number.isFinite(state.diplomacy.reputation[id]) ? S.Util.clamp(Math.round(state.diplomacy.reputation[id]), 0, 100) : 50; });
      state.diplomacy.nextProposalId = Number.isInteger(state.diplomacy.nextProposalId) ? state.diplomacy.nextProposalId : 1; state.diplomacy.processedTurn = Number.isInteger(state.diplomacy.processedTurn) ? state.diplomacy.processedTurn : -1; state.diplomacy.stagnation = state.diplomacy.stagnation || baseDiplomacy.stagnation;
    }
    return { ok: true, changes: changes, state: state };
  };
  function migrateV08(input, sourceLabel) {
    var state = S.Util.deepClone(input), scenarioId = state.campaign.scenarioId || "owari_short", scenario = S.Data.getScenario(scenarioId);
    var officerRelations = S.Util.deepClone((state.diplomacy && state.diplomacy.relations) || (state.relationships && state.relationships.officers) || {});
    state.relationships = { officers: officerRelations, memories: S.Util.deepClone((state.relationships && state.relationships.memories) || []) };
    state.diplomacy = S.Data.diplomacy.createState(scenario.id, Object.keys(state.factions || {}).filter(function (id) { return scenario.factionIds.indexOf(id) >= 0; }));
    state.schemaVersion = 9; state.gameVersion = "core-0.9"; state.meta = state.meta || {}; state.meta.migratedFrom = sourceLabel || "core-0.8"; state.meta.updatedAt = new Date().toISOString(); state.meta.saveSummary = null;
    state.events = state.events || {}; state.events.battleReports = state.events.battleReports || []; state.events.battleReports.forEach(function (report) { if (report.diplomacyLegal === undefined) { report.diplomacyLegal = true; report.legacyReport = true; } });
    S.State.repairState(state);
    return migrateV09(state, sourceLabel || "core-0.8");
  }
  function migrateV07(input) {
    var state = S.Util.deepClone(input), legacyOfficerRelations = S.Util.deepClone((input.relationships && input.relationships.officers) || (input.diplomacy && input.diplomacy.relations) || {});
    state.schemaVersion = 8; state.gameVersion = "core-0.8";
    state.meta = state.meta || {}; state.meta.migratedFrom = "core-0.7"; state.meta.updatedAt = new Date().toISOString(); state.meta.saveSummary = null;
    state.campaign.scenarioId = "owari_short"; state.campaign.difficultyId = "normal"; state.campaign.playerFactionId = state.campaign.playerFactionId || "aotsuki";
    Object.keys(state.factions || {}).forEach(function (id) { var base = S.Data.factions.find(function (item) { return item.id === id; }); state.factions[id].color = state.factions[id].color || (base && base.color); state.factions[id].gold = Number.isFinite(state.factions[id].gold) ? state.factions[id].gold : (base ? base.initialGold : 100); state.factions[id].food = Number.isFinite(state.factions[id].food) ? state.factions[id].food : (base ? base.initialFood : 100); });
    state.events = state.events || {}; state.events.triggeredIds = state.events.triggeredIds || []; state.events.defenseNotifications = state.events.defenseNotifications || []; state.events.aiHistory = state.events.aiHistory || []; state.events.pendingBattle = null; if (state.events.pendingTacticalBattle === undefined) state.events.pendingTacticalBattle = null;
    state.debug = state.debug || {}; state.debug.lastSimulation = null;
    S.State.repairState(state);
    state.diplomacy = { relations: legacyOfficerRelations };
    return migrateV08(state, "core-0.7");
  }
  function migrateLegacy(legacy) {
    if (!legacy || !Array.isArray(legacy.castles) || !Array.isArray(legacy.officers)) return { ok: false, errors: ["v0.6互換形式ではありません"] };
    var state = S.State.createInitialState({ scenarioId: "owari_short", playerFactionId: "aotsuki", difficultyId: "normal" });
    state.meta.migratedFrom = legacy.gameVersion || "rebuild-alpha-v0.6-or-earlier";
    state.meta.legacySnapshot = { mode: legacy.mode || null, reviewCount: legacy.reviewCount || 0 };
    state.meta.favoriteOfficerId = legacy.favoriteOfficerId || null; state.meta.houseHonor = Number.isFinite(legacy.houseHonor) ? legacy.houseHonor : 50;
    state.campaign.status = legacy.mode === "opening" ? "opening" : "playing"; state.campaign.year = Number(legacy.year) || 1; state.campaign.season = Number(legacy.season) || 0; state.campaign.turn = Number(legacy.turnCount) || 0;
    ["gold", "food", "commands", "maxCommands", "battleCount"].forEach(function (key) { if (Number.isFinite(legacy[key])) state.campaign[key] = legacy[key]; });
    state.campaign.selectedCastleId = legacy.selectedCastleId || "kiyosu"; state.campaign.gameOver = Boolean(legacy.gameOver);
    legacy.castles.forEach(function (oldCastle) { var castle = S.Util.deepClone(oldCastle); castle.factionId = oldCastle.factionId || factionMap[oldCastle.owner]; delete castle.owner; if (castle.id && state.castles[castle.id]) state.castles[castle.id] = castle; });
    legacy.officers.forEach(function (oldOfficer) { var current = state.officers[oldOfficer.id]; if (!current) return; var officer = S.Util.deepClone(oldOfficer); officer.factionId = oldOfficer.factionId || factionMap[oldOfficer.faction]; delete officer.faction; state.officers[officer.id] = normalizeOfficer(officer, current); });
    state.relationships.officers = legacy.relations || state.relationships.officers; state.prisoners = (legacy.prisoners || []).slice(); state.rivalries = legacy.rivalries || {};
    state.events.intel = legacy.intel || {}; state.events.log = legacy.log || state.events.log; state.events.battleReports = legacy.battleReports || []; state.events.loyaltyEvents = legacy.loyaltyEvents || []; state.events.rivalEvents = legacy.rivalEvents || []; state.chronicle = legacy.chronicle || state.chronicle;
    S.State.repairState(state);
    var validation = S.State.validateState(state);
    return validation.ok ? { ok: true, state: state, source: state.meta.migratedFrom } : { ok: false, errors: validation.errors };
  }
  S.State.migrateState = function (input) {
    if (!input || typeof input !== "object") return { ok: false, errors: ["セーブデータが空か不正です"] };
    if (input.schemaVersion === 12) { var clone = S.Util.deepClone(input); clone.units = clone.units || {}; clone.armies = clone.armies || {}; Object.keys(clone.castles || {}).forEach(function (id) { var castle = clone.castles[id]; if (!Number.isFinite(castle.guardTroops)) castle.guardTroops = castle.troops; castle.troops = castle.guardTroops; if (!Number.isInteger(castle.population)) castle.population = defaultPopulation(castle); if (!Number.isInteger(castle.agriculture)) castle.agriculture = defaultAgriculture(castle); }); Object.keys(clone.officers || {}).forEach(function (id) { normalizeProfile(clone.officers[id]); normalizeAssignment(clone.officers[id], clone); }); clone.events = clone.events || {}; clone.events.engine = S.State.upgradeEventEngineState(clone.events.engine); clone.settings = S.State.upgradeUXSettings(clone.settings); if (S.Systems.Event && S.Systems.Event.reconcileInstances) S.Systems.Event.reconcileInstances(clone); S.State.repairState(clone); var validation = S.State.validateState(clone); return validation.ok ? { ok: true, state: clone, source: "core-0.95" } : { ok: false, errors: validation.errors }; }
    if (input.schemaVersion === 11) return migrateV11(input, "core-0.95");
    if (input.schemaVersion === 10) return migrateV10(input, "core-0.95");
    if (input.schemaVersion === 9) return migrateV09(input, "core-0.9");
    if (input.schemaVersion === 8) return migrateV08(input, "core-0.8");
    if (input.schemaVersion === 7) return migrateV07(input);
    return migrateLegacy(input);
  };
})(window.Sengoku);
