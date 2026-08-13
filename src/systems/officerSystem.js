(function (S) {
  "use strict";
  var O = S.Systems.Officer = {};
  O.get = function (state, id) { return state.officers[id] || null; };

  O.assignment = function (officer) {
    return officer && officer.assignment && typeof officer.assignment === "object" ? officer.assignment : { type: "idle", castleId: officer && officer.castleId || null, armyId: null };
  };
  O.setIdleAtCastle = function (state, officerId, castleId) {
    var officer = O.get(state, officerId), castle = state.castles[castleId];
    if (!officer || !castle || officer.status !== "active" || officer.factionId !== castle.factionId) return { ok: false, errors: ["武将の待機配属が不正です"] };
    O.clearGovernorAssignments(state, officerId, null);
    officer.castleId = castleId;
    officer.assignment = { type: "idle", castleId: castleId, armyId: null };
    return { ok: true, stateChanges: { officerId: officerId, assignment: officer.assignment }, messages: [], errors: [] };
  };
  O.domesticOfficerAt = function (state, castleId) {
    return O.atCastle(state, castleId).find(function (officer) { return O.assignment(officer).type === "domestic"; }) || null;
  };
  O.assignmentLabel = function (officer) {
    var type = O.assignment(officer).type;
    return type === "governor" ? "城主" : type === "domestic" ? "奉行" : type === "army" ? "出陣中" : "待機";
  };
  O.assignDomestic = function (state, officerId, castleId, options) {
    options = options || {};
    var officer = O.get(state, officerId), castle = state.castles[castleId];
    if (!officer || !castle || officer.status !== "active" || officer.injury === "重傷" || officer.factionId !== castle.factionId) return { ok: false, errors: ["内政担当の配属が不正です"] };
    if (O.assignment(officer).type === "governor") return { ok: false, errors: ["城主を奉行へ変更する場合は先に別の城主を任命してください"] };
    if (O.assignment(officer).type === "army") return { ok: false, errors: ["出陣中の武将は奉行に任命できません"] };
    if (options.consumeCommand && officer.factionId === state.campaign.playerFactionId && state.campaign.commands <= 0) return { ok: false, errors: ["命令回数がありません"] };
    var previous = O.domesticOfficerAt(state, castleId);
    if (previous && previous.id !== officerId) previous.assignment = { type: "idle", castleId: castleId, armyId: null };
    O.clearGovernorAssignments(state, officerId, null);
    officer.castleId = castleId;
    officer.assignment = { type: "domestic", castleId: castleId, armyId: null };
    if (options.consumeCommand && officer.factionId === state.campaign.playerFactionId) state.campaign.commands -= 1;
    return { ok: true, stateChanges: { officerId: officerId, assignment: officer.assignment, previousDomesticOfficerId: previous && previous.id !== officerId ? previous.id : null }, messages: [officer.name + "を" + castle.name + "の奉行に任じました。"], errors: [] };
  };
  O.assignDomesticCommand = function (state, officerId, castleId) {
    var result = O.assignDomestic(state, officerId, castleId, { consumeCommand: true });
    if (result.ok) {
      O.remember(state, officerId, state.castles[castleId].name + "の奉行に任じられた。", false);
      if (S.Systems.Event) S.Systems.Event.addLog(state, state.officers[officerId].name + "を" + state.castles[castleId].name + "の奉行に任じました。", "good");
    }
    return result;
  };
  O.setIdleCommand = function (state, officerId) {
    var officer = O.get(state, officerId);
    if (!officer || officer.status !== "active" || !officer.castleId || O.assignment(officer).type === "army") return { ok: false, errors: ["待機へ戻せない武将です"] };
    if (officer.factionId === state.campaign.playerFactionId && state.campaign.commands <= 0) return { ok: false, errors: ["命令回数がありません"] };
    var castleId = officer.castleId;
    if (O.assignment(officer).type === "governor") return { ok: false, errors: ["城主は先に別の城主を任命してください"] };
    officer.assignment = { type: "idle", castleId: castleId, armyId: null };
    if (officer.factionId === state.campaign.playerFactionId) state.campaign.commands -= 1;
    if (S.Systems.Event) S.Systems.Event.addLog(state, officer.name + "を待機に戻しました。", "good");
    return { ok: true, stateChanges: { officerId: officerId, assignment: officer.assignment }, messages: [officer.name + "を待機に戻しました。"], errors: [] };
  };
  O.assignToArmy = function (state, officerId, armyId) {
    var officer = O.get(state, officerId), army = state.armies && state.armies[armyId];
    if (!officer || !army || officer.status !== "active" || officer.factionId !== army.factionId) return { ok: false, errors: ["Army配属が不正です"] };
    O.clearGovernorAssignments(state, officerId, null);
    officer.castleId = null;
    officer.assignment = { type: "army", castleId: null, armyId: armyId };
    return { ok: true, stateChanges: { officerId: officerId, assignment: officer.assignment }, messages: [], errors: [] };
  };
  O.clearAssignment = function (state, officerId) {
    var officer = O.get(state, officerId);
    if (!officer) return { ok: false, errors: ["武将が見つかりません"] };
    O.clearGovernorAssignments(state, officerId, null);
    officer.assignment = { type: "idle", castleId: null, armyId: null };
    return { ok: true, stateChanges: { officerId: officerId, assignment: officer.assignment }, messages: [], errors: [] };
  };
  O.atCastle = function (state, castleId, factionId) { return Object.keys(state.officers).map(function (id) { return state.officers[id]; }).filter(function (officer) { return officer.status === "active" && officer.castleId === castleId && (!factionId || officer.factionId === factionId); }); };
  O.remember = function (state, officerId, text, important) { var officer = O.get(state, officerId); if (!officer) return false; officer.history = officer.history || []; officer.history.push({ date: S.Systems.Turn ? S.Systems.Turn.dateLabel(state) : "", text: text, important: Boolean(important) }); if (officer.history.length > 30) officer.history.shift(); return true; };
  O.gainMerit = function (state, officerId, amount, text) { var officer = O.get(state, officerId); if (!officer) return { ok: false, errors: ["武将が見つかりません"] }; officer.merit += amount; officer.seasonMerit += amount; if (text) O.remember(state, officerId, text, false); while (officer.exp >= 40) { officer.exp -= 40; officer.level += 1; officer.stats.leadership += 1; } return { ok: true, stateChanges: { officerId: officerId, merit: officer.merit }, messages: [], errors: [] }; };
  O.rest = function (state, officerId) { var officer = O.get(state, officerId); if (!officer) return { ok: false, errors: ["武将が見つかりません"] }; officer.fatigue = Math.max(0, officer.fatigue - 35); officer.health = Math.min(100, officer.health + 20); if (officer.injury === "重傷" && officer.health >= 70) officer.injury = "軽傷"; else if (officer.injury === "軽傷" && officer.health >= 90) officer.injury = null; return { ok: true, stateChanges: { health: officer.health, fatigue: officer.fatigue }, messages: [officer.name + "が休養しました。"], errors: [] }; };
  O.clearGovernorAssignments = function (state, officerId, exceptCastleId) {
    var cleared = [], officer = O.get(state, officerId);
    Object.keys(state.castles).forEach(function (id) { if (id !== exceptCastleId && state.castles[id].governorId === officerId) { state.castles[id].governorId = null; cleared.push(id); } });
    if (officer && officer.assignment && officer.assignment.type === "governor" && (!exceptCastleId || officer.assignment.castleId !== exceptCastleId)) {
      officer.assignment = { type: officer.status === "active" && officer.castleId ? "idle" : "idle", castleId: officer.status === "active" ? officer.castleId : null, armyId: null };
    }
    return { ok: true, stateChanges: { clearedCastleIds: cleared }, messages: [], errors: [] };
  };
  O.assignGovernor = function (state, officerId, castleId, options) {
    options = options || {};
    var officer = O.get(state, officerId), castle = state.castles[castleId];
    if (!officer || !castle) return { ok: false, errors: ["任命対象が不正です"] };
    if (officer.status !== "active" || officer.injury === "重傷") return { ok: false, errors: ["任命できない武将状態です"] };
    if (officer.factionId !== castle.factionId) return { ok: false, errors: ["武将と城の勢力が一致しません"] };
    if (options.consumeCommand && state.campaign.commands <= 0) return { ok: false, errors: ["命令回数がありません"] };
    var previous = castle.governorId ? O.get(state, castle.governorId) : null;
    O.clearGovernorAssignments(state, officerId, castleId);
    if (previous && previous.id !== officerId && previous.status === "active") previous.assignment = { type: "idle", castleId: previous.castleId || castleId, armyId: null };
    castle.governorId = officerId; officer.castleId = castleId; officer.assignment = { type: "governor", castleId: castleId, armyId: null };
    if (options.consumeCommand) state.campaign.commands -= 1;
    return { ok: true, stateChanges: { governorId: officerId, previousGovernorId: previous && previous.id !== officerId ? previous.id : null }, messages: [officer.name + "を" + castle.name + "の城主に任じました。"], errors: [] };
  };
  O.appointGovernor = function (state, officerId, castleId) {
    var castle = state.castles[castleId], previous = castle && castle.governorId ? O.get(state, castle.governorId) : null;
    if (!castle || castle.factionId !== state.campaign.playerFactionId) return { ok: false, errors: ["自勢力の城ではありません"] };
    var result = O.assignGovernor(state, officerId, castleId, { consumeCommand: true });
    if (!result.ok) return result;
    var officer = O.get(state, officerId);
    if (previous && previous.id !== officerId) { previous.grievance += 5; S.Systems.Loyalty.change(state, previous.id, -2, castle.name + "の城主を解かれた。"); }
    officer.role = castle.name + "城主"; officer.grievance = Math.max(0, officer.grievance - 12); officer.lordTrust = S.Util.clamp(officer.lordTrust + 10, 0, 100); S.Systems.Loyalty.change(state, officerId, 10, castle.name + "の城主に任じられた。");
    if (officer.promise && officer.promise.status === "pending") officer.promise.status = "fulfilled";
    O.remember(state, officerId, castle.name + "の城主に任じられた。", true); S.Systems.Event.addChronicle(state, officer.name + "を" + castle.name + "の城主に任じました。");
    return result;
  };
  O.moveOfficer = function (state, officerId, targetCastleId, options) {
    options = options || {};
    var officer = O.get(state, officerId), target = state.castles[targetCastleId];
    if (!officer || !target) return { ok: false, errors: ["移動対象が不正です"] };
    if (officer.status !== "active" || officer.injury === "重傷") return { ok: false, errors: ["捕虜・浪人・重傷の武将は移動できません"] };
    if (officer.assignment && officer.assignment.type === "army") return { ok: false, errors: ["Army所属中の武将は城間移動できません"] };
    if (officer.factionId !== target.factionId) return { ok: false, errors: ["自勢力の城へだけ移動できます"] };
    if (officer.castleId === targetCastleId) return { ok: false, errors: ["すでにその城へ配属されています"] };
    if (options.consumeCommand !== false && officer.factionId === state.campaign.playerFactionId && state.campaign.commands <= 0) return { ok: false, errors: ["命令回数がありません"] };
    var oldCastleId = officer.castleId;
    O.clearGovernorAssignments(state, officerId, null); officer.castleId = targetCastleId; officer.assignment = { type: "idle", castleId: targetCastleId, armyId: null };
    if (options.consumeCommand !== false && officer.factionId === state.campaign.playerFactionId) state.campaign.commands -= 1;
    O.remember(state, officerId, (oldCastleId && state.castles[oldCastleId] ? state.castles[oldCastleId].name : "配属なし") + "から" + target.name + "へ移動した。", false);
    if (!options.silent) S.Systems.Event.addLog(state, officer.name + "を" + target.name + "へ移動しました。", "good");
    return { ok: true, stateChanges: { officerId: officerId, oldCastleId: oldCastleId, targetCastleId: targetCastleId }, messages: [officer.name + "が" + target.name + "へ移動しました。"], errors: [] };
  };
  O.toggleFavorite = function (state, officerId) { if (!state.officers[officerId]) return { ok: false, errors: ["武将が見つかりません"] }; state.meta.favoriteOfficerId = state.meta.favoriteOfficerId === officerId ? null : officerId; return { ok: true, stateChanges: { favoriteOfficerId: state.meta.favoriteOfficerId }, messages: [], errors: [] }; };
})(window.Sengoku);
