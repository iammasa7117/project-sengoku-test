(function (S) {
  "use strict";
  var V = S.Systems.Victory = {};
  V.castlesFor = function (state, factionId) { return Object.keys(state.castles).filter(function (id) { return state.castles[id].factionId === factionId; }); };
  V.updateEliminations = function (state) {
    var eliminated = [];
    Object.keys(state.factions).forEach(function (id) {
      var faction = state.factions[id], hasCastle = V.castlesFor(state, id).length > 0;
      if (faction.alive && !hasCastle) {
        faction.alive = false; faction.eliminatedTurn = state.campaign.turn; eliminated.push(id);
        if (state.diplomacy.vassalage[id]) { var oldOverlord = state.diplomacy.vassalage[id].overlordFactionId, oldRelation = S.Systems.Diplomacy.relation(state, id, oldOverlord); delete state.diplomacy.vassalage[id]; if (oldRelation) { oldRelation.status = "neutral"; oldRelation.expiresTurn = null; } }
        Object.keys(state.diplomacy.vassalage).forEach(function (subjectId) { if (state.diplomacy.vassalage[subjectId].overlordFactionId === id) { var subjectRelation = S.Systems.Diplomacy.relation(state, subjectId, id); delete state.diplomacy.vassalage[subjectId]; if (subjectRelation) { subjectRelation.status = "neutral"; subjectRelation.expiresTurn = null; } } });
        Object.keys(state.officers).forEach(function (officerId) { var officer = state.officers[officerId]; if (officer.factionId === id && officer.status === "active") { S.Systems.Officer.clearGovernorAssignments(state, officerId, null); officer.status = "ronin"; officer.castleId = null; officer.assignment = { type: "idle", castleId: null, armyId: null }; S.Systems.Officer.remember(state, officerId, faction.name + "の滅亡により浪人となった。", true); } });
        var message = faction.name + "は領国を失い、滅亡しました。"; S.Systems.Event.addChronicle(state, message); S.Systems.Event.addLog(state, message, "major");
      }
    });
    return eliminated;
  };
  V.check = function (state) {
    var eliminated = V.updateEliminations(state), scenario = S.Data.getScenario(state.campaign.scenarioId), playerId = state.campaign.playerFactionId;
    var holdings = V.castlesFor(state, playerId).length, total = scenario.castleIds.length;
    var otherAliveIds = scenario.factionIds.filter(function (id) { return id !== playerId && state.factions[id] && state.factions[id].alive; });
    var otherAlive = otherAliveIds.length > 0, hegemony = otherAlive && !S.Systems.Diplomacy.overlordOf(state, playerId) && otherAliveIds.every(function (id) { return S.Systems.Diplomacy.rootOverlord(state, id) === playerId; });
    if (!state.campaign.gameOver && (holdings === 0 || !state.factions[playerId] || !state.factions[playerId].alive)) { state.campaign.gameOver = true; state.campaign.outcome = "defeat"; S.Systems.Event.addChronicle(state, state.factions[playerId] ? state.factions[playerId].name + "は滅亡しました。" : "プレイヤー勢力は滅亡しました。"); }
    else if (!state.campaign.gameOver && (holdings >= total || !otherAlive || hegemony)) { state.campaign.gameOver = true; state.campaign.outcome = "victory"; S.Systems.Event.addChronicle(state, state.factions[playerId].name + (hegemony ? "は諸勢力を従え、覇権を確立しました。" : "は全" + total + "城を制し、天下統一を成し遂げました。")); }
    return { ok: true, stateChanges: { outcome: state.campaign.outcome, eliminated: eliminated, holdings: holdings, hegemony: hegemony }, messages: [], errors: [] };
  };
})(window.Sengoku);
