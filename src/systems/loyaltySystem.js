(function (S) {
  "use strict";
  var L = S.Systems.Loyalty = {};
  L.change = function (state, officerId, amount, reason) {
    var officer = state.officers[officerId];
    if (!officer) return { ok: false, errors: ["武将が見つかりません"] };
    var before = officer.loyalty;
    officer.loyalty = S.Util.clamp(officer.loyalty + amount, 0, 100);
    officer.loyaltyHistory = officer.loyaltyHistory || [];
    if (reason) officer.loyaltyHistory.push({ date: S.Systems.Turn ? S.Systems.Turn.dateLabel(state) : "", before: before, after: officer.loyalty, reason: reason });
    return { ok: true, stateChanges: { loyalty: officer.loyalty }, messages: [], errors: [] };
  };
  L.risk = function (state, officerId) {
    var officer = state.officers[officerId];
    if (!officer) return 0;
    var score = (100 - officer.loyalty) * 0.82 + (officer.grievance || 0) * 0.72 + (officer.ambition || 0) * 0.22 + (officer.neglect || 0) * 5 - (officer.lordTrust || 0) * 0.12;
    if (officer.promise && officer.promise.status === "broken") score += 28;
    return S.Util.clamp(Math.round(score), 0, 100);
  };
  L.label = function (score) { return score >= 75 ? "離反寸前" : score >= 55 ? "危険" : score >= 35 ? "注視" : "安定"; };
  L.privateAudience = function (state, officerId) {
    var officer = state.officers[officerId];
    if (!officer || officer.factionId !== state.campaign.playerFactionId) return { ok: false, errors: ["面談対象が不正です"] };
    if (state.campaign.commands <= 0) return { ok: false, errors: ["命令回数がありません"] };
    state.campaign.commands -= 1;
    officer.grievance = Math.max(0, (officer.grievance || 0) - 7);
    officer.lordTrust = S.Util.clamp((officer.lordTrust || 0) + 7, 0, 100);
    officer.neglect = 0;
    L.change(state, officerId, 3, "主君との私的面談で考えを聞いてもらった。");
    state.events.loyaltyEvents.push({ date: S.Systems.Turn.dateLabel(state), officerId: officerId, type: "面談", text: "野心と不満を話した。" });
    return { ok: true, stateChanges: { commands: state.campaign.commands }, messages: [officer.name + "と面談しました。"], errors: [] };
  };
  L.reward = function (state, officerId) {
    var officer = state.officers[officerId];
    if (!officer || officer.factionId !== state.campaign.playerFactionId) return { ok: false, errors: ["褒賞対象が不正です"] };
    if (state.campaign.gold < S.Config.Balance.reward.gold) return { ok: false, errors: ["金が不足しています"] };
    state.campaign.gold -= S.Config.Balance.reward.gold;
    officer.grievance = Math.max(0, (officer.grievance || 0) - 10);
    officer.lordTrust = S.Util.clamp((officer.lordTrust || 0) + 4, 0, 100);
    officer.neglect = 0;
    L.change(state, officerId, 8, "主君から直接褒賞を受けた。");
    state.meta.houseHonor = S.Util.clamp(state.meta.houseHonor + 1, 0, 100);
    return { ok: true, stateChanges: { gold: state.campaign.gold }, messages: [officer.name + "に褒賞を与えました。"], errors: [] };
  };
  L.defectOfficer = function (state, officerId, destinationFactionId) {
    var officer = state.officers[officerId], destinationFaction = state.factions[destinationFactionId];
    if (!officer || officer.status !== "active") return { ok: false, errors: ["離反対象が不正です"] };
    var destinationCastleId = Object.keys(state.castles).find(function (id) { return state.castles[id].factionId === destinationFactionId; });
    if (!destinationFaction || !destinationFaction.alive || !destinationCastleId || destinationFactionId === officer.factionId) return { ok: false, errors: ["移籍先勢力に有効な城がありません"] };
    var oldFactionId = officer.factionId, oldFactionName = state.factions[oldFactionId].name;
    S.Systems.Officer.clearGovernorAssignments(state, officerId, null);
    officer.factionId = destinationFactionId; officer.castleId = destinationCastleId; officer.assignment = { type: "idle", castleId: destinationCastleId, armyId: null }; officer.loyalty = Math.max(45, officer.loyalty); officer.grievance = 0;
    var text = officer.name + "は" + oldFactionName + "を離れ、" + destinationFaction.name + "へ離反しました。";
    state.events.loyaltyEvents.push({ date: S.Systems.Turn.dateLabel(state), officerId: officerId, type: "離反", text: text, oldFactionId: oldFactionId, newFactionId: destinationFactionId });
    S.Systems.Event.addChronicle(state, text); S.Systems.Event.addLog(state, text, "bad"); S.Systems.Officer.remember(state, officerId, text, true);
    return { ok: true, stateChanges: { officerId: officerId, oldFactionId: oldFactionId, newFactionId: destinationFactionId, castleId: destinationCastleId }, messages: [text], errors: [] };
  };
  L.processDefections = function (state, random) {
    var rng = random || Math.random, defected = [];
    Object.keys(state.officers).forEach(function (id) {
      var officer = state.officers[id], risk = L.risk(state, id);
      if (officer.factionId === state.campaign.playerFactionId && officer.status === "active" && risk >= 75 && rng() < (risk - 65) / 100) {
        var candidates = Object.keys(state.factions).filter(function (fid) { return fid !== officer.factionId && state.factions[fid].alive && Object.keys(state.castles).some(function (cid) { return state.castles[cid].factionId === fid; }); });
        if (candidates.length) { var destination = candidates[Math.floor(rng() * candidates.length)], result = L.defectOfficer(state, id, destination); if (result.ok) defected.push(id); }
      }
    });
    return { ok: true, stateChanges: { defected: defected }, messages: defected.map(function (id) { return state.officers[id].name + "が離反しました。"; }), errors: [] };
  };
})(window.Sengoku);
