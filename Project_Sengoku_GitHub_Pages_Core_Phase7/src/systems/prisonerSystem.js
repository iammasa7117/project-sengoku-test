(function (S) {
  "use strict";
  var P = S.Systems.Prisoner = {};
  P.capture = function (state, officerId, captorFactionId) {
    var officer = state.officers[officerId];
    if (!officer) return { ok: false, errors: ["捕虜対象が見つかりません"] };
    S.Systems.Officer.clearGovernorAssignments(state, officerId, null);
    officer.status = "prisoner";
    officer.castleId = null;
    officer.assignment = { type: "idle", castleId: null, armyId: null };
    officer.captorFactionId = captorFactionId;
    if (state.prisoners.indexOf(officerId) < 0) state.prisoners.push(officerId);
    S.Systems.Event.addLog(state, officer.name + "を捕らえました。", "major");
    return { ok: true, stateChanges: { prisonerId: officerId }, messages: [officer.name + "を捕らえました。"], errors: [] };
  };
  P.release = function (state, officerId, reason) {
    var officer = state.officers[officerId];
    if (!officer || state.prisoners.indexOf(officerId) < 0) return { ok: false, errors: ["捕虜が見つかりません"] };
    var destination = Object.keys(state.castles).find(function (id) { return state.castles[id].factionId === officer.factionId; }) || null;
    officer.status = destination ? "active" : "ronin";
    officer.captorFactionId = null;
    officer.castleId = destination;
    officer.assignment = { type: "idle", castleId: destination, armyId: null };
    state.prisoners = state.prisoners.filter(function (id) { return id !== officerId; });
    S.Systems.Event.addChronicle(state, officer.name + "を捕虜から解放しました。" + (reason ? "（" + reason + "）" : ""));
    return { ok: true, stateChanges: { released: officerId }, messages: [officer.name + "を解放しました。"], errors: [] };
  };
  P.recruit = function (state, officerId, recruiterId, forceSuccess, random, method) {
    var officer = state.officers[officerId], recruiter = state.officers[recruiterId], rng = random || Math.random;
    if (!officer || state.prisoners.indexOf(officerId) < 0 || !recruiter) return { ok: false, errors: ["登用対象または説得役が不正です"] };
    method = method || "sincere";
    var chance = 0.24 + (recruiter.stats.politics + recruiter.stats.intellect) / 420 - officer.loyalty / 360;
    if (method === "promise") chance += 0.28;
    if (method === "honor" && recruiter.stats.might >= 75) chance += 0.16;
    chance = S.Util.clamp(chance, 0.12, 0.9);
    if (!forceSuccess && rng() >= chance) {
      officer.loyalty = Math.max(20, officer.loyalty - 4);
      return { ok: false, errors: [officer.name + "は登用を拒みました"] };
    }
    var playerName = state.factions[state.campaign.playerFactionId].name;
    officer.status = "active";
    officer.factionId = state.campaign.playerFactionId;
    officer.captorFactionId = null;
    officer.castleId = Object.keys(state.castles).find(function (id) { return state.castles[id].factionId === state.campaign.playerFactionId; });
    officer.assignment = { type: "idle", castleId: officer.castleId || null, armyId: null };
    officer.loyalty = 58;
    officer.grievance = 0;
    if (officer.traits.indexOf("旧敵の誓い") < 0) officer.traits.push("旧敵の誓い");
    if (method === "promise") officer.promise = { type: "castle", text: "二季以内に城主へ取り立てる", madeTurn: state.campaign.turn, dueTurn: state.campaign.turn + 2, status: "pending" };
    state.prisoners = state.prisoners.filter(function (id) { return id !== officerId; });
    S.Systems.Event.addChronicle(state, officer.name + "は旧敵から" + playerName + "の家臣となりました。");
    return { ok: true, stateChanges: { recruited: officerId }, messages: [officer.name + "の登用に成功しました。"], errors: [] };
  };
})(window.Sengoku);
