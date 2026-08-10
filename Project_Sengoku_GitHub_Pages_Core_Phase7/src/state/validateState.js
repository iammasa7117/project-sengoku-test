(function (S) {
  "use strict";
  function finite(value) { return typeof value === "number" && Number.isFinite(value); }
  function plainObject(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
  function stringArray(value) { return Array.isArray(value) && value.every(function (item) { return typeof item === "string"; }); }
  S.State.validateState = function (state) {
    var errors = [], governorSeen = {}, domesticSeen = {}, prisonerSeen = {}, unitOfficerSeen = {};
    if (!state || typeof state !== "object" || Array.isArray(state)) return { ok: false, errors: ["状態がオブジェクトではありません"] };
    if (state.schemaVersion !== S.Config.SCHEMA_VERSION) errors.push("schemaVersion が " + S.Config.SCHEMA_VERSION + " ではありません");
    if (state.gameVersion !== S.Config.GAME_VERSION) errors.push("gameVersion が " + S.Config.GAME_VERSION + " ではありません");
    S.State.schema.required.forEach(function (key) { if (state[key] === undefined || state[key] === null) errors.push("必須項目がありません: " + key); });
    var campaign = state.campaign || {}, factions = state.factions || {}, castles = state.castles || {}, officers = state.officers || {}, units = state.units || {}, armies = state.armies || {};
    var scenario = S.Data.scenarios && S.Data.scenarios.find(function (item) { return item.id === campaign.scenarioId; });
    var difficulty = S.Data.difficulties && S.Data.difficulties.find(function (item) { return item.id === campaign.difficultyId; });
    if (!scenario) errors.push("scenarioIdが未定義です");
    if (!difficulty) errors.push("difficultyIdが未定義です");
    if (scenario) {
      scenario.castleIds.forEach(function (id) { if (!castles[id]) errors.push("シナリオ必須城がありません: " + id); });
      scenario.factionIds.forEach(function (id) { if (!factions[id]) errors.push("シナリオ必須勢力がありません: " + id); });
    }
    if (!factions[campaign.playerFactionId]) errors.push("プレイヤー勢力が存在しません");
    if (!castles[campaign.selectedCastleId]) errors.push("選択城が存在しません");
    if (!Number.isInteger(campaign.season) || campaign.season < 0 || campaign.season > 3) errors.push("季節が範囲外です");
    if (!finite(campaign.gold) || campaign.gold < 0) errors.push("金の値が不正です");
    if (!finite(campaign.food) || campaign.food < 0) errors.push("兵糧の値が不正です");
    if (!Number.isInteger(campaign.maxCommands) || !Number.isInteger(campaign.commands) || campaign.maxCommands < 0 || campaign.commands < 0 || campaign.commands > campaign.maxCommands) errors.push("命令回数が不正です");
    if (factions[campaign.playerFactionId] && factions[campaign.playerFactionId].alive && !Object.keys(castles).some(function (id) { return castles[id].factionId === campaign.playerFactionId; })) errors.push("存続中のプレイヤー勢力に城がありません");
    Object.keys(factions).forEach(function (id) {
      var faction = factions[id];
      if (!faction || faction.id !== id) errors.push("勢力IDが一致しません: " + id);
      if (!finite(faction.gold) || faction.gold < 0 || !finite(faction.food) || faction.food < 0) errors.push("勢力資源が不正です: " + id);
    });
    Object.keys(castles).forEach(function (id) {
      var castle = castles[id];
      if (!castle || typeof castle !== "object") { errors.push("城データが不正です: " + id); return; }
      if (castle.id !== id) errors.push("城IDが一致しません: " + id);
      if (!factions[castle.factionId]) errors.push("城の勢力が存在しません: " + id);
      if (!finite(castle.troops) || castle.troops < 0) errors.push("城兵力が不正です: " + id);
      if (!finite(castle.guardTroops) || castle.guardTroops < 0) errors.push("城守備兵が不正です: " + id);
      if (finite(castle.troops) && finite(castle.guardTroops) && castle.troops !== castle.guardTroops) errors.push("城兵力ミラーが不一致です: " + id);
      if (!finite(castle.morale) || castle.morale < 0 || castle.morale > 100) errors.push("城士気が不正です: " + id);
      if (!finite(castle.defense) || castle.defense < 0 || !finite(castle.income) || castle.income < 0) errors.push("城能力が不正です: " + id);
      if (!Number.isInteger(castle.population) || castle.population < 0) errors.push("城人口が不正です: " + id);
      if (!Number.isInteger(castle.agriculture) || castle.agriculture < 0 || castle.agriculture > S.Config.Balance.domestic.agricultureMax) errors.push("城農業が不正です: " + id);
      if (!Array.isArray(castle.neighbors)) errors.push("隣接城データが不正です: " + id);
      else {
        var neighborSeen = {};
        castle.neighbors.forEach(function (neighborId) {
        if (neighborSeen[neighborId]) errors.push("隣接城参照が重複しています: " + id + "->" + neighborId);
        neighborSeen[neighborId] = true;
        if (neighborId === id) errors.push("城が自分自身へ隣接しています: " + id);
        if (!castles[neighborId]) errors.push("隣接城が存在しません: " + id + "->" + neighborId);
        else if (!Array.isArray(castles[neighborId].neighbors) || castles[neighborId].neighbors.indexOf(id) < 0) errors.push("隣接関係が双方向ではありません: " + id + "<->" + neighborId);
        });
      }
      if (castle.governorId !== null && castle.governorId !== undefined) {
        var governor = officers[castle.governorId];
        if (!governor) errors.push("城主が存在しません: " + id);
        else {
          if (governor.factionId !== castle.factionId) errors.push("城主の勢力が城と一致しません: " + id);
          if (governor.castleId !== id) errors.push("城主の配属が城と一致しません: " + id);
          if (governor.status !== "active") errors.push("城主がactiveではありません: " + id);
          if (!plainObject(governor.assignment) || governor.assignment.type !== "governor" || governor.assignment.castleId !== id || governor.assignment.armyId !== null) errors.push("城主assignmentが一致しません: " + id);
          if (governorSeen[governor.id]) errors.push("同一武将が複数城の城主です: " + governor.id);
          governorSeen[governor.id] = id;
        }
      }
    });
    Object.keys(officers).forEach(function (id) {
      var officer = officers[id];
      if (!officer || typeof officer !== "object") { errors.push("武将データが不正です: " + id); return; }
      if (officer.id !== id) errors.push("武将IDが一致しません: " + id);
      if (!factions[officer.factionId]) errors.push("武将の勢力が存在しません: " + id);
      if (officer.castleId !== null && !castles[officer.castleId]) errors.push("武将の配属城が存在しません: " + id);
      if (S.Config.ALLOWED_OFFICER_STATUS.indexOf(officer.status) < 0) errors.push("武将statusが不正です: " + id);
      var assignment = officer.assignment, assignmentTypes = ["governor", "domestic", "army", "idle"];
      if (!plainObject(assignment) || assignmentTypes.indexOf(assignment.type) < 0) errors.push("武将assignmentが不正です: " + id);
      if (officer.status === "active") {
        if (plainObject(assignment) && assignment.type === "army") {
          if (officer.castleId !== null) errors.push("Army所属武将が城にも配属されています: " + id);
          if (!assignment.armyId || !armies[assignment.armyId]) errors.push("Army所属武将のArmy参照が不正です: " + id);
          if (assignment.castleId !== null) errors.push("Army所属武将assignmentに城参照があります: " + id);
        } else {
          if (!officer.castleId || !castles[officer.castleId]) errors.push("active武将に有効な配属城がありません: " + id);
          else if (castles[officer.castleId].factionId !== officer.factionId) errors.push("active武将の所属と配属城勢力が一致しません: " + id);
          if (plainObject(assignment) && assignment.castleId !== officer.castleId) errors.push("武将assignmentの城参照が不一致です: " + id);
          if (plainObject(assignment) && assignment.armyId !== null) errors.push("非Army武将にArmy参照があります: " + id);
          if (plainObject(assignment) && assignment.type === "governor" && (!castles[officer.castleId] || castles[officer.castleId].governorId !== id)) errors.push("governor assignmentと城主参照が不一致です: " + id);
          if (plainObject(assignment) && assignment.type === "domestic") {
            if (domesticSeen[officer.castleId]) errors.push("同一城に奉行が複数います: " + officer.castleId);
            domesticSeen[officer.castleId] = id;
          }
        }
      }
      if (officer.status === "prisoner" || officer.status === "ronin") {
        if (officer.castleId !== null) errors.push("非active武将が城へ配属されています: " + id);
        if (plainObject(assignment) && (assignment.type !== "idle" || assignment.castleId !== null || assignment.armyId !== null)) errors.push("非active武将assignmentが不正です: " + id);
      }
      ["loyalty", "health", "fatigue", "exp", "level", "merit"].forEach(function (key) { if (!finite(officer[key])) errors.push("武将数値が不正です: " + id + "." + key); });
      if (!officer.stats || ["leadership", "might", "intellect", "politics"].some(function (key) { return !finite(officer.stats[key]); })) errors.push("武将能力が不正です: " + id);
      if (!plainObject(officer.profile) || !stringArray(officer.profile.personalityIds) || !stringArray(officer.profile.traitIds) || !stringArray(officer.profile.tags) || new Set(officer.profile.personalityIds || []).size !== (officer.profile.personalityIds || []).length || new Set(officer.profile.traitIds || []).size !== (officer.profile.traitIds || []).length || new Set(officer.profile.tags || []).size !== (officer.profile.tags || []).length) errors.push("武将profileが不正です: " + id);
      else {
        officer.profile.personalityIds.forEach(function (profileId) { if (!S.Data.PersonalityRegistry.definitions[profileId]) errors.push("未登録personality参照です: " + id + "." + profileId); });
        officer.profile.traitIds.forEach(function (profileId) { if (!S.Data.TraitRegistry.definitions[profileId]) errors.push("未登録trait参照です: " + id + "." + profileId); });
      }
    });
    if (!plainObject(units)) errors.push("Unitデータが不正です");
    else Object.keys(units).forEach(function (id) {
      var unit = units[id];
      if (!plainObject(unit) || unit.id !== id) { errors.push("Unit IDが不正です: " + id); return; }
      if (!factions[unit.factionId]) errors.push("Unit勢力が不正です: " + id);
      if (!officers[unit.officerId]) errors.push("Unit武将参照が不正です: " + id);
      if (!S.Data.getUnitType || !S.Data.getUnitType(unit.unitType)) errors.push("Unit兵種が不正です: " + id);
      if (!finite(unit.troops) || !finite(unit.maxTroops) || unit.troops < 0 || unit.maxTroops <= 0 || unit.troops > unit.maxTroops) errors.push("Unit兵力が不正です: " + id);
      if (!finite(unit.morale) || unit.morale < 0 || unit.morale > 100 || !finite(unit.experience) || unit.experience < 0) errors.push("Unit能力が不正です: " + id);
      if (["active", "routed", "destroyed"].indexOf(unit.status) < 0) errors.push("Unit statusが不正です: " + id);
      if (!armies[unit.armyId]) errors.push("Unit所属Armyが存在しません: " + id);
      if (unitOfficerSeen[unit.officerId]) errors.push("同一武将が複数Unitへ所属しています: " + unit.officerId);
      unitOfficerSeen[unit.officerId] = id;
      if (officers[unit.officerId]) {
        var unitOfficer = officers[unit.officerId];
        if (unitOfficer.factionId !== unit.factionId || unitOfficer.status !== "active" || !plainObject(unitOfficer.assignment) || unitOfficer.assignment.type !== "army" || unitOfficer.assignment.armyId !== unit.armyId) errors.push("Unit武将assignmentが不一致です: " + id);
      }
    });
    if (!plainObject(armies)) errors.push("Armyデータが不正です");
    else Object.keys(armies).forEach(function (id) {
      var army = armies[id], seenUnitIds = {};
      if (!plainObject(army) || army.id !== id) { errors.push("Army IDが不正です: " + id); return; }
      if (!factions[army.factionId]) errors.push("Army勢力が不正です: " + id);
      if (!officers[army.commanderId]) errors.push("Army総大将が存在しません: " + id);
      if (!Array.isArray(army.unitIds) || !army.unitIds.length) errors.push("Army Unit一覧が不正です: " + id);
      else army.unitIds.forEach(function (unitId) {
        if (seenUnitIds[unitId]) errors.push("Army Unit参照が重複しています: " + id + "." + unitId);
        seenUnitIds[unitId] = true;
        var unit = units[unitId];
        if (!unit) errors.push("Army Unit参照が存在しません: " + id + "." + unitId);
        else if (unit.armyId !== id || unit.factionId !== army.factionId) errors.push("ArmyとUnitの参照が不一致です: " + id + "." + unitId);
      });
      if (officers[army.commanderId]) {
        var commanderUnit = army.unitIds && army.unitIds.some(function (unitId) { return units[unitId] && units[unitId].officerId === army.commanderId; });
        if (!commanderUnit) errors.push("Army総大将がUnitに含まれていません: " + id);
      }
      if (!castles[army.originCastleId] || !castles[army.destinationCastleId]) errors.push("Army城参照が不正です: " + id);
      if (!stringArray(army.route) || !army.route.length || army.route.some(function (castleId) { return !castles[castleId]; })) errors.push("Army routeが不正です: " + id);
      if (!plainObject(army.currentLocation) || (army.currentLocation.castleId && !castles[army.currentLocation.castleId])) errors.push("Army現在地が不正です: " + id);
      if (plainObject(army.currentLocation) && army.currentLocation.fromCastleId) {
        if (!castles[army.currentLocation.fromCastleId] || !castles[army.currentLocation.toCastleId]) errors.push("Army進軍区間が不正です: " + id);
        else if (castles[army.currentLocation.fromCastleId].neighbors.indexOf(army.currentLocation.toCastleId) < 0) errors.push("Army進軍区間が隣接していません: " + id);
        if (!Number.isInteger(army.currentLocation.hopsRemaining) || army.currentLocation.hopsRemaining < 0) errors.push("Army残りhopが不正です: " + id);
      }
      if (["marching", "arrived", "in_battle", "besieging", "returning", "disbanded"].indexOf(army.status) < 0) errors.push("Army statusが不正です: " + id);
      if (army.status === "marching" && (!army.currentLocation.fromCastleId || !army.currentLocation.toCastleId)) errors.push("進軍中Armyの現在地形式が不正です: " + id);
      if ((army.status === "arrived" || army.status === "besieging") && !army.currentLocation.castleId) errors.push("到着/包囲Armyの現在地形式が不正です: " + id);
      if (army.status === "besieging" && (!plainObject(army.siege) || army.siege.targetCastleId !== army.destinationCastleId || !castles[army.siege.targetCastleId] || !Number.isInteger(army.siege.attempts) || army.siege.attempts < 0)) errors.push("包囲Armyの攻城状態が不正です: " + id);
    });
    if (!Array.isArray(state.prisoners)) errors.push("捕虜データが配列ではありません");
    else state.prisoners.forEach(function (id) {
      if (prisonerSeen[id]) errors.push("捕虜IDが重複しています: " + id);
      prisonerSeen[id] = true;
      if (!officers[id]) errors.push("捕虜武将が存在しません: " + id);
      else {
        if (officers[id].status !== "prisoner" || officers[id].castleId !== null) errors.push("捕虜状態が一致しません: " + id);
        if (!factions[officers[id].captorFactionId]) errors.push("捕虜の捕獲勢力が存在しません: " + id);
      }
    });
    Object.keys(officers).forEach(function (id) { if (officers[id].status === "prisoner" && !prisonerSeen[id]) errors.push("捕虜一覧に武将がありません: " + id); });
    Object.keys(state.rivalries || {}).forEach(function (key) { var item = state.rivalries[key]; if (!item || !officers[item.playerId] || !officers[item.enemyId]) errors.push("因縁参照が不正です: " + key); });
    var officerRelationships = state.relationships && state.relationships.officers;
    if (!officerRelationships || typeof officerRelationships !== "object" || Array.isArray(officerRelationships)) errors.push("武将関係データが不正です");
    else Object.keys(officerRelationships).forEach(function (key) { var ids = key.split("|"), value = officerRelationships[key]; if (ids.length !== 2 || ids[0] >= ids[1] || !officers[ids[0]] || !officers[ids[1]] || !finite(value) || value < -100 || value > 100) errors.push("武将関係参照が不正です: " + key); });
    var diplomacy = state.diplomacy || {}, factionRelations = diplomacy.relations;
    if (!factionRelations || typeof factionRelations !== "object" || Array.isArray(factionRelations)) errors.push("勢力外交関係が不正です");
    else {
      var factionIds = Object.keys(factions).sort();
      factionIds.forEach(function (a, index) { factionIds.slice(index + 1).forEach(function (b) { var key = S.Data.diplomacy.pairKey(a, b); if (!factionRelations[key]) errors.push("勢力外交ペアが不足しています: " + key); }); });
      Object.keys(factionRelations).forEach(function (key) {
        var relation = factionRelations[key], ids = key.split("|");
        if (ids.length !== 2 || ids[0] >= ids[1] || !factions[ids[0]] || !factions[ids[1]]) { errors.push("勢力外交ペアが不正です: " + key); return; }
        if (!relation || relation.factionAId !== ids[0] || relation.factionBId !== ids[1]) errors.push("勢力外交IDが一致しません: " + key);
        if (!relation || S.Data.diplomacy.statuses.indexOf(relation.status) < 0) errors.push("外交statusが不正です: " + key);
        ["score", "trust", "grievance"].forEach(function (field) { if (!relation || !finite(relation[field]) || relation[field] < 0 || relation[field] > 100) errors.push("外交値が範囲外です: " + key + "." + field); });
        if (!relation || !Number.isInteger(relation.sinceTurn) || !Number.isInteger(relation.lastActionTurn) || !Number.isInteger(relation.redeclareAfterTurn) || !Number.isInteger(relation.brokenTreaties) || relation.brokenTreaties < 0) errors.push("外交ターン情報が不正です: " + key);
        var isVassalPair = diplomacy.vassalage && ((diplomacy.vassalage[ids[0]] && diplomacy.vassalage[ids[0]].overlordFactionId === ids[1]) || (diplomacy.vassalage[ids[1]] && diplomacy.vassalage[ids[1]].overlordFactionId === ids[0]));
        if (relation && S.Data.diplomacy.treatyStatuses.indexOf(relation.status) >= 0 && !Number.isInteger(relation.expiresTurn) && !isVassalPair) errors.push("条約期限が不正です: " + key);
        if (relation && S.Data.diplomacy.treatyStatuses.indexOf(relation.status) < 0 && relation.expiresTurn !== null) errors.push("非条約に期限があります: " + key);
      });
    }
    if (!diplomacy.warExhaustion || !diplomacy.reputation) errors.push("外交勢力値がありません");
    else Object.keys(factions).forEach(function (id) { if (!finite(diplomacy.warExhaustion[id]) || diplomacy.warExhaustion[id] < 0 || diplomacy.warExhaustion[id] > 100) errors.push("戦争疲弊が範囲外です: " + id); if (!finite(diplomacy.reputation[id]) || diplomacy.reputation[id] < 0 || diplomacy.reputation[id] > 100) errors.push("評判が範囲外です: " + id); });
    if (!Array.isArray(diplomacy.proposals)) errors.push("外交提案が配列ではありません");
    else diplomacy.proposals.forEach(function (proposal) { if (!proposal || !proposal.id || S.Data.diplomacy.proposalTypes.indexOf(proposal.type) < 0 || !factions[proposal.actorFactionId] || !factions[proposal.targetFactionId] || proposal.actorFactionId === proposal.targetFactionId || ["pending", "accepted", "rejected", "expired", "failed"].indexOf(proposal.status) < 0 || !Number.isInteger(proposal.createdTurn) || !Number.isInteger(proposal.expiresTurn) || proposal.expiresTurn < proposal.createdTurn || (proposal.messengerId && !officers[proposal.messengerId]) || (proposal.sourceCastleId && !castles[proposal.sourceCastleId]) || (proposal.targetCastleId && !castles[proposal.targetCastleId]) || (proposal.troops !== null && (!finite(proposal.troops) || proposal.troops <= 0))) errors.push("外交提案が不正です: " + (proposal && proposal.id)); });
    if (!Array.isArray(diplomacy.history)) errors.push("外交履歴が配列ではありません");
    if (!Number.isInteger(diplomacy.nextProposalId) || diplomacy.nextProposalId < 1 || !Number.isInteger(diplomacy.processedTurn)) errors.push("外交処理カウンタが不正です");
    if (!diplomacy.stagnation || !Number.isInteger(diplomacy.stagnation.seasons) || diplomacy.stagnation.seasons < 0 || !Number.isInteger(diplomacy.stagnation.maximum) || diplomacy.stagnation.maximum < 0 || !Number.isInteger(diplomacy.stagnation.reevaluations) || diplomacy.stagnation.reevaluations < 0) errors.push("停滞監視状態が不正です");
    if (!diplomacy.vassalage || typeof diplomacy.vassalage !== "object" || Array.isArray(diplomacy.vassalage)) errors.push("従属データが不正です");
    else Object.keys(diplomacy.vassalage).forEach(function (subjectId) {
      var item = diplomacy.vassalage[subjectId]; if (!item || item.subjectFactionId !== subjectId || !factions[subjectId] || !factions[item.overlordFactionId] || item.overlordFactionId === subjectId || !Number.isInteger(item.sinceTurn) || !Number.isInteger(item.independenceAllowedTurn) || item.independenceAllowedTurn < item.sinceTurn || !item.tribute || !finite(item.tribute.goldRate) || !finite(item.tribute.foodRate) || item.tribute.goldRate < 0 || item.tribute.goldRate > 1 || item.tribute.foodRate < 0 || item.tribute.foodRate > 1) { errors.push("従属参照が不正です: " + subjectId); return; }
      var seen = {}, current = subjectId; while (diplomacy.vassalage[current]) { if (seen[current]) { errors.push("従属関係が循環しています: " + subjectId); break; } seen[current] = true; current = diplomacy.vassalage[current].overlordFactionId; }
    });
    var pending = state.events && state.events.pendingBattle;
    if (pending) {
      if (!castles[pending.sourceId] || !castles[pending.targetId]) errors.push("pendingBattleの城参照が不正です");
      if (!officers[pending.commanderId] || (pending.deputyId && !officers[pending.deputyId]) || (pending.enemyId && !officers[pending.enemyId])) errors.push("pendingBattleの武将参照が不正です");
      if (!factions[pending.attackerFactionId] || !factions[pending.defenderFactionId]) errors.push("pendingBattleの勢力参照が不正です");
      if (castles[pending.sourceId] && castles[pending.targetId]) {
        if (castles[pending.sourceId].neighbors.indexOf(pending.targetId) < 0) errors.push("pendingBattleの城が隣接していません");
        if (castles[pending.sourceId].factionId !== pending.attackerFactionId || castles[pending.targetId].factionId !== pending.defenderFactionId) errors.push("pendingBattleの城所有勢力が一致しません");
      }
      if (officers[pending.commanderId] && (officers[pending.commanderId].status !== "active" || officers[pending.commanderId].factionId !== pending.attackerFactionId || officers[pending.commanderId].castleId !== pending.sourceId)) errors.push("pendingBattleの総大将状態が不正です");
      if (pending.deputyId && (pending.deputyId === pending.commanderId || (officers[pending.deputyId] && (officers[pending.deputyId].status !== "active" || officers[pending.deputyId].factionId !== pending.attackerFactionId || officers[pending.deputyId].castleId !== pending.sourceId)))) errors.push("pendingBattleの副将状態が不正です");
      if (!finite(pending.committedTroops) || pending.committedTroops < S.Config.MIN_ATTACK_FORCE) errors.push("pendingBattleの投入兵力が不正です");
      if (castles[pending.sourceId] && pending.committedTroops > castles[pending.sourceId].troops - S.Config.MIN_GARRISON) errors.push("pendingBattleが実兵力を超えています");
      if (!pending.debugDiplomacyOverride && S.Systems.Diplomacy && !S.Systems.Diplomacy.canAttack(state, pending.attackerFactionId, pending.defenderFactionId).ok) errors.push("pendingBattleが外交上不正です");
    }

    var pendingTactical = state.events && state.events.pendingTacticalBattle;
    if (pendingTactical) {
      if (!plainObject(pendingTactical) || typeof pendingTactical.battleId !== "string") errors.push("pendingTacticalBattleが不正です");
      else {
        var tacticalArmy = armies[pendingTactical.armyId], tacticalTarget = castles[pendingTactical.targetId];
        if (!tacticalArmy || tacticalArmy.status !== "in_battle") errors.push("pendingTacticalBattleのArmyが不正です");
        if (!tacticalTarget || tacticalTarget.factionId !== pendingTactical.defenderFactionId) errors.push("pendingTacticalBattleの侵攻先が不正です");
        if (tacticalArmy && tacticalArmy.factionId !== pendingTactical.attackerFactionId) errors.push("pendingTacticalBattleの攻撃勢力が不正です");
        if (!Number.isInteger(pendingTactical.seed) || pendingTactical.seed < 0 || pendingTactical.seed > 4294967295) errors.push("pendingTacticalBattleのseedが不正です");
        if (!plainObject(pendingTactical.battleSpec) || !pendingTactical.battleSpec.attacker || !Array.isArray(pendingTactical.battleSpec.attacker.units) || !pendingTactical.battleSpec.attacker.units.length) errors.push("pendingTacticalBattleのBattleSpecが不正です");
      }
    }

    if (!state.events || !Array.isArray(state.events.log) || !Array.isArray(state.events.battleReports) || !Array.isArray(state.events.triggeredIds)) errors.push("イベント状態が不正です");
    else {
      state.events.battleReports.forEach(function (report) { if (report.diplomacyLegal === false && !report.debugDiplomacyOverride) errors.push("合戦記録に条約違反攻撃があります: " + report.id); if (!report.legacyReport && report.diplomacyLegal !== true) errors.push("合戦記録の外交合法性がありません: " + report.id); });
      var engine = state.events.engine, registry = S.Data.ContentPackRegistry || { packs: {} }, enabledSeen = {};
      if (!plainObject(engine)) errors.push("イベントengineが不正です");
      else {
        if (!stringArray(engine.enabledPackIds)) errors.push("有効Content Pack一覧が不正です");
        else engine.enabledPackIds.forEach(function (packId) { if (enabledSeen[packId]) errors.push("有効Content Packが重複しています: " + packId); enabledSeen[packId] = true; if (!registry.packs[packId]) errors.push("有効Content Packが存在しません: " + packId); });
        if (!plainObject(engine.onceKeys) || Object.keys(engine.onceKeys || {}).some(function (key) { return engine.onceKeys[key] !== true; })) errors.push("イベントonceKeysが不正です");
        if (!plainObject(engine.cooldowns) || Object.keys(engine.cooldowns || {}).some(function (key) { return !Number.isInteger(engine.cooldowns[key]) || engine.cooldowns[key] < 0; })) errors.push("イベントcooldownsが不正です");
        if (!plainObject(engine.firedEventIds) || Object.keys(engine.firedEventIds || {}).some(function (key) { return !Number.isInteger(engine.firedEventIds[key]) || engine.firedEventIds[key] < 1; })) errors.push("イベント発火回数が不正です");
        if (!plainObject(engine.instanceKeys) || Object.keys(engine.instanceKeys || {}).some(function (key) { return typeof engine.instanceKeys[key] !== "string"; })) errors.push("イベントinstanceKeysが不正です");
        if (!Number.isInteger(engine.nextInstanceId) || engine.nextInstanceId < 1) errors.push("イベントnextInstanceIdが不正です");
        if (!plainObject(engine.counters) || Object.keys(engine.counters || {}).some(function (key) { return !finite(engine.counters[key]); })) errors.push("イベントcounterが不正です");
        if (!plainObject(engine.variables)) errors.push("イベントvariableが不正です");
        if (!plainObject(engine.arcs)) errors.push("Story Arc状態が不正です");
        else Object.keys(engine.arcs).forEach(function (arcId) { var arc = engine.arcs[arcId], definition = S.Data.StoryArcRegistry.definitions[arcId]; if (!definition || !plainObject(arc) || arc.arcId !== arcId || ["inactive", "active", "completed", "failed"].indexOf(arc.status) < 0 || !Array.isArray(arc.completedSteps) || (arc.currentStep !== null && !definition.steps[arc.currentStep]) || !Number.isInteger(arc.startedTurn) || !Number.isInteger(arc.updatedTurn) || (arc.completedTurn !== null && !Number.isInteger(arc.completedTurn)) || (arc.failedTurn !== null && !Number.isInteger(arc.failedTurn))) errors.push("Story Arc状態が不正です: " + arcId); });
        if (!plainObject(engine.metrics) || ["matchedEvents", "queuedEvents", "automaticResolutions", "arcStarts", "arcCompletions", "maxQueueLength", "maxChainDepth"].some(function (key) { return !Number.isInteger(engine.metrics[key]) || engine.metrics[key] < 0; }) || !plainObject(engine.metrics.aiChoiceDistribution)) errors.push("イベントmetricsが不正です");
        if (!Number.isInteger(engine.emissionCount) || engine.emissionCount < 0) errors.push("イベントemissionCountが不正です");
        var triggerValues = Object.keys(S.Config.EVENT_TRIGGERS).map(function (key) { return S.Config.EVENT_TRIGGERS[key]; });
        if (engine.lastTrigger !== null && triggerValues.indexOf(engine.lastTrigger) < 0) errors.push("イベントlastTriggerが不正です");
        if (!Array.isArray(engine.emissions) || engine.emissions.some(function (item) { return !plainObject(item) || !Number.isInteger(item.sequence) || item.sequence < 1 || triggerValues.indexOf(item.trigger) < 0 || !Number.isInteger(item.turn) || !stringArray(item.eventIds) || (item.instanceIds !== undefined && !stringArray(item.instanceIds)); })) errors.push("イベントemit履歴が不正です");
        if (!Array.isArray(engine.history) || engine.history.length > 500 || engine.history.some(function (item) { return !plainObject(item) || typeof item.instanceId !== "string" || typeof item.eventId !== "string" || typeof item.packId !== "string" || typeof item.title !== "string" || !Number.isInteger(item.turn) || typeof item.date !== "string" || !plainObject(item.targets) || ["resolved", "cancelled"].indexOf(item.status) < 0; })) errors.push("イベント履歴が不正です");
        if (!Array.isArray(engine.diagnostics) || engine.diagnostics.length > 200 || engine.diagnostics.some(function (item) { return !plainObject(item) || !Number.isInteger(item.turn) || typeof item.code !== "string" || typeof item.message !== "string"; })) errors.push("イベントdiagnosticsが不正です");
        function validInstance(instance, expectedStatus) { return plainObject(instance) && typeof instance.instanceId === "string" && typeof instance.eventId === "string" && typeof instance.packId === "string" && triggerValues.indexOf(instance.trigger) >= 0 && Number.isInteger(instance.createdTurn) && Number.isInteger(instance.chainDepth) && instance.chainDepth >= 1 && instance.chainDepth <= 12 && plainObject(instance.targets) && plainObject(instance.payloadSnapshot) && Array.isArray(instance.availableChoices) && instance.status === expectedStatus && instance.blocking === true && typeof instance.dedupeKey === "string"; }
        var instanceSeen = {}, dedupeSeen = {};
        if (engine.activeEvent !== null && !validInstance(engine.activeEvent, "active")) errors.push("active eventが不正です");
        if (engine.activeEvent && validInstance(engine.activeEvent, "active")) { instanceSeen[engine.activeEvent.instanceId] = true; dedupeSeen[engine.activeEvent.dedupeKey] = true; if (S.Systems.Event && !S.Systems.Event.findDefinition(engine.activeEvent.eventId)) errors.push("active event定義が存在しません"); }
        if (!Array.isArray(engine.queue) || engine.queue.length > 50) errors.push("イベントqueueが不正です");
        else engine.queue.forEach(function (instance) { if (!validInstance(instance, "queued")) { errors.push("queued eventが不正です"); return; } if (instanceSeen[instance.instanceId] || dedupeSeen[instance.dedupeKey]) errors.push("イベントinstanceが重複しています: " + instance.instanceId); instanceSeen[instance.instanceId] = true; dedupeSeen[instance.dedupeKey] = true; if (S.Systems.Event && !S.Systems.Event.findDefinition(instance.eventId)) errors.push("queued event定義が存在しません: " + instance.eventId); });
        if (engine.pendingInteraction !== null && (!plainObject(engine.pendingInteraction) || ["requestBattlePlanner", "requestOfficerSelection", "requestCastleSelection", "requestFactionSelection"].indexOf(engine.pendingInteraction.type) < 0 || (engine.pendingInteraction.type === "requestBattlePlanner" && (!castles[engine.pendingInteraction.sourceId] || !castles[engine.pendingInteraction.targetId] || !plainObject(engine.pendingInteraction.preset))))) errors.push("イベントinteractionが不正です");
        if (!plainObject(engine.rng) || !Number.isInteger(engine.rng.seed) || engine.rng.seed < 0 || engine.rng.seed > 4294967295 || !Number.isInteger(engine.rng.state) || engine.rng.state < 0 || engine.rng.state > 4294967295 || !Number.isInteger(engine.rng.calls) || engine.rng.calls < 0) errors.push("イベントRNG状態が不正です");
      }
    }
    var settings = state.settings;
    if (!plainObject(settings) || typeof settings.aiEnabled !== "boolean" || typeof settings.autosave !== "boolean" || typeof settings.sound !== "boolean") errors.push("設定状態が不正です");
    else {
      var tutorial = settings.tutorial, ui = settings.ui;
      if (!plainObject(tutorial) || typeof tutorial.enabled !== "boolean" || typeof tutorial.completed !== "boolean" || typeof tutorial.dismissed !== "boolean" || !plainObject(tutorial.milestones)) errors.push("チュートリアル設定が不正です");
      else if (["gameStarted", "castleSelected", "commandUsed", "seasonAdvanced", "menuOpened"].some(function (key) { return typeof tutorial.milestones[key] !== "boolean"; })) errors.push("チュートリアル進行が不正です");
      if (!plainObject(ui) || ["largeText", "highContrast", "reducedMotion"].some(function (key) { return typeof ui[key] !== "boolean"; })) errors.push("表示設定が不正です");
    }
    if (!Array.isArray(state.chronicle)) errors.push("戦国記が配列ではありません");
    return { ok: errors.length === 0, errors: errors };
  };
})(window.Sengoku);
