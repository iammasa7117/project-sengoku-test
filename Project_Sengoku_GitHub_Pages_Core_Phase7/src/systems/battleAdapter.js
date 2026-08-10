(function (S) {
  "use strict";
  var A = S.Systems.BattleAdapter = {};
  A.runtime = { frame: null };
  // Core troop points are intentionally small strategic units. Tactical B5.x was tuned around hundreds/thousands.
  // The Adapter owns this scale conversion so neither Core nor Tactical needs a balance-breaking rewrite.
  A.TACTICAL_TROOP_SCALE = 25;

  function fail(message) { return { ok: false, errors: [message] }; }
  function fnv1a(text) {
    var hash = 2166136261;
    for (var i = 0; i < text.length; i += 1) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return hash >>> 0;
  }
  function tacticalUnitType(index, officer) {
    if (officer) {
      if (officer.stats && officer.stats.might >= 82) return index % 2 ? "kiba" : "samurai";
      if (officer.stats && officer.stats.intellect >= 82) return "teppo";
    }
    return ["ashigaru", "ashigaru", "teppo", "kiba", "samurai", "ashigaru", "teppo"][index % 7];
  }
  function distribute(total, count) {
    var base = Math.floor(total / count), rest = total - base * count, values = [];
    for (var i = 0; i < count; i += 1) values.push(base + (i < rest ? 1 : 0));
    return values;
  }
  function defenderUnits(state, target) {
    var officers = S.Systems.Officer.atCastle(state, target.id, target.factionId).slice().sort(function (a, b) {
      if (a.id === target.governorId) return -1;
      if (b.id === target.governorId) return 1;
      return (b.stats.leadership + b.stats.might) - (a.stats.leadership + a.stats.might);
    });
    var total = Math.max(1, Math.floor(target.guardTroops));
    // Roughly one Tactical unit per 20 Core troop points, capped at 7. This yields 2-4 readable units for current Core castles.
    var count = Math.max(1, Math.min(7, total, Math.ceil(total / 20)));
    var troops = distribute(total, count), list = [];
    for (var i = 0; i < count; i += 1) {
      var officer = officers[i] || null;
      list.push({
        id: "def_" + target.id + "_" + (i + 1),
        coreUnitId: null,
        coreOfficerId: officer ? officer.id : null,
        officerId: officer ? officer.id : "castle_guard_" + target.id + "_" + (i + 1),
        officerName: officer ? officer.name : target.name + "守備隊" + (i + 1),
        unitType: tacticalUnitType(i, officer),
        coreTroops: troops[i],
        coreMaxTroops: troops[i],
        troops: troops[i] * A.TACTICAL_TROOP_SCALE,
        maxTroops: troops[i] * A.TACTICAL_TROOP_SCALE,
        morale: Math.max(45, Math.min(95, Math.round(target.morale + (officer ? (officer.stats.leadership - 60) * 0.15 : 0)))),
        isCommander: officer ? officer.id === (target.governorId || (officers[0] && officers[0].id)) : (!officers.length && i === 0)
      });
    }
    if (!list.some(function (u) { return u.isCommander; })) list[0].isCommander = true;
    return list;
  }

  A.seedFor = function (state, army, target) {
    return fnv1a([state.campaign.turn, state.campaign.battleCount, army.id, army.factionId, target.id, S.Systems.Army.totalTroops(state, army), target.guardTroops].join("|"));
  };

  A.buildBattleSpec = function (state, armyId) {
    var army = S.Systems.Army.get(state, armyId), target = army && state.castles[army.destinationCastleId];
    if (!army || !target) return null;
    var attacker = army.unitIds.map(function (unitId) {
      var unit = S.Systems.Unit.get(state, unitId), officer = unit && state.officers[unit.officerId];
      if (!unit || !officer) return null;
      return {
        id: unit.id,
        coreUnitId: unit.id,
        coreOfficerId: officer.id,
        officerId: officer.id,
        officerName: officer.name,
        unitType: unit.unitType,
        coreTroops: unit.troops,
        coreMaxTroops: unit.maxTroops,
        troops: unit.troops * A.TACTICAL_TROOP_SCALE,
        maxTroops: unit.maxTroops * A.TACTICAL_TROOP_SCALE,
        morale: unit.morale,
        isCommander: officer.id === army.commanderId
      };
    }).filter(Boolean);
    var defenders = defenderUnits(state, target), seed = A.seedFor(state, army, target);
    return {
      version: 1,
      battleId: "tactical_" + (state.campaign.battleCount + 1) + "_" + army.id,
      seed: seed,
      maxTicks: 7000,
      context: { armyId: army.id, sourceCastleId: army.originCastleId, targetCastleId: target.id, attackerFactionId: army.factionId, defenderFactionId: target.factionId },
      attacker: { factionId: army.factionId, units: attacker },
      defender: { factionId: target.factionId, units: defenders }
    };
  };

  A.prepareTacticalArrival = function (state, armyId) {
    var army = S.Systems.Army.get(state, armyId);
    if (!army) return fail("Tactical会戦のArmyが見つかりません");
    var target = state.castles[army.destinationCastleId];
    if (!target || target.factionId === army.factionId) return fail("Tactical会戦の侵攻先が不正です");
    if (army.factionId !== state.campaign.playerFactionId) return fail("v0.1ではプレイヤー主導攻撃のみTactical会戦を使用します");
    var diplomacy = S.Systems.Diplomacy.canAttack(state, army.factionId, target.factionId);
    if (!diplomacy.ok) return fail("外交状態が変化したためTactical会戦を開始できません: " + diplomacy.reason);
    var spec = A.buildBattleSpec(state, armyId);
    if (!spec || !spec.attacker.units.length || !spec.defender.units.length) return fail("Tactical BattleSpecを生成できません");
    army.status = "in_battle";
    army.currentLocation = { castleId: target.id };
    state.events.pendingTacticalBattle = {
      battleId: spec.battleId,
      armyId: army.id,
      sourceId: army.originCastleId,
      targetId: target.id,
      attackerFactionId: army.factionId,
      defenderFactionId: target.factionId,
      commanderId: army.commanderId,
      enemyId: spec.defender.units.filter(function (u) { return u.isCommander && u.coreOfficerId; }).map(function (u) { return u.coreOfficerId; })[0] || null,
      seed: spec.seed,
      battleSpec: spec,
      createdTurn: state.campaign.turn
    };
    return { ok: true, stateChanges: { arrivalType: "tactical_pending", armyId: army.id, targetCastleId: target.id, pendingTacticalBattle: state.events.pendingTacticalBattle }, messages: [target.name + "へ到着。リアルタイム会戦を開始します。"], errors: [] };
  };

  A.translateResult = function (state, pending, result) {
    if (!pending || !result || result.seed !== pending.seed) return null;
    var attackSpecs = {}, defendSpecs = {};
    (pending.battleSpec.attacker.units || []).forEach(function (u) { attackSpecs[u.id] = u; });
    (pending.battleSpec.defender.units || []).forEach(function (u) { defendSpecs[u.id] = u; });
    var playerUnits = (result.units || []).filter(function (u) { return u.side === "player" || attackSpecs[u.id]; });
    var enemyUnits = (result.units || []).filter(function (u) { return u.side === "enemy" || defendSpecs[u.id]; });
    function coreAfter(raw, spec) {
      if (!spec) return 0;
      var beforeCore = Math.max(0, Math.floor(Number(spec.coreTroops) || 0));
      var beforeTactical = Math.max(1, Math.floor(Number(spec.troops) || 1));
      var afterTactical = Math.max(0, Math.min(beforeTactical, Math.floor(Number(raw.troopsAfter) || 0)));
      return Math.max(0, Math.min(beforeCore, Math.round(beforeCore * afterTactical / beforeTactical)));
    }
    var attackerUnitResults = playerUnits.map(function (u) { var spec = attackSpecs[u.id], after = coreAfter(u, spec); return { unitId: u.id, officerId: u.officerId, troopsAfter: after, moraleAfter: Math.max(0, Math.min(100, Math.round(u.morale))), status: after <= 0 ? "destroyed" : u.status }; });
    var defenderUnitResults = enemyUnits.map(function (u) { var spec = defendSpecs[u.id], after = coreAfter(u, spec); return { tacticalUnitId: u.id, officerId: u.officerId, coreOfficerId: u.coreOfficerId || (spec && spec.coreOfficerId) || null, troopsAfter: after, moraleAfter: Math.max(0, Math.min(100, Math.round(u.morale))), status: after <= 0 ? "destroyed" : u.status }; });
    var attackerBeforeCore = (pending.battleSpec.attacker.units || []).reduce(function (sum, u) { return sum + (Number(u.coreTroops) || 0); }, 0);
    var defenderBeforeCore = (pending.battleSpec.defender.units || []).reduce(function (sum, u) { return sum + (Number(u.coreTroops) || 0); }, 0);
    var attackerAfterCore = attackerUnitResults.reduce(function (sum, u) { return sum + u.troopsAfter; }, 0);
    var defenderAfterCore = defenderUnitResults.reduce(function (sum, u) { return sum + u.troopsAfter; }, 0);
    var winnerFactionId = result.winner === "player" ? pending.attackerFactionId : result.winner === "enemy" ? pending.defenderFactionId : null;
    var loserFactionId = result.winner === "player" ? pending.defenderFactionId : result.winner === "enemy" ? pending.attackerFactionId : null;
    return {
      battleId: pending.battleId,
      mode: "tactical",
      attackerFactionId: pending.attackerFactionId,
      defenderFactionId: pending.defenderFactionId,
      winnerFactionId: winnerFactionId,
      loserFactionId: loserFactionId,
      sourceId: pending.sourceId,
      targetCastleId: pending.targetId,
      castleCaptured: false,
      attackerLosses: Math.max(0, attackerBeforeCore - attackerAfterCore),
      defenderLosses: Math.max(0, defenderBeforeCore - defenderAfterCore),
      tacticalAttackerLosses: Math.max(0, Math.floor(Number(result.attackerLoss) || 0)),
      tacticalDefenderLosses: Math.max(0, Math.floor(Number(result.defenderLoss) || 0)),
      attackerUnitResults: attackerUnitResults,
      defenderUnitResults: defenderUnitResults,
      survivingUnits: attackerUnitResults.filter(function (u) { return u.status !== "destroyed"; }).map(function (u) { return { unitId: u.unitId, officerId: u.officerId, troopsAfter: u.troopsAfter, moraleAfter: u.moraleAfter }; }),
      routedUnits: attackerUnitResults.filter(function (u) { return u.status === "routed"; }).map(function (u) { return u.unitId; }),
      destroyedUnitIds: attackerUnitResults.filter(function (u) { return u.status === "destroyed"; }).map(function (u) { return u.unitId; }),
      capturedOfficerIds: [], killedOfficerIds: [], retreatedOfficerIds: [], commanderDefeated: null,
      merit: [], intelUsed: false,
      durationTicks: Math.max(0, Math.floor(Number(result.durationTicks) || 0)),
      seed: pending.seed,
      win: result.winner === "player",
      draw: result.winner === "draw",
      attackerTroopsBefore: attackerBeforeCore,
      defenderTroopsBefore: defenderBeforeCore
    };
  };

  A.openPending = function () {
    var state = S.State.current, pending = state && state.events && state.events.pendingTacticalBattle;
    var overlay = document.getElementById("tacticalOverlay"), frame = document.getElementById("tacticalFrame");
    if (!pending || !overlay || !frame) return false;
    var specText = encodeURIComponent(JSON.stringify(pending.battleSpec));
    frame.src = "tactical/index.html?integrated=1&spec=" + specText;
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("tactical-open");
    A.runtime.frame = frame;
    return true;
  };

  A.close = function () {
    var overlay = document.getElementById("tacticalOverlay"), frame = document.getElementById("tacticalFrame");
    if (overlay) { overlay.classList.add("hidden"); overlay.setAttribute("aria-hidden", "true"); }
    if (frame) frame.src = "about:blank";
    document.body.classList.remove("tactical-open");
    A.runtime.frame = null;
  };

  A.receiveMessage = function (event) {
    var frame = document.getElementById("tacticalFrame"), data = event && event.data;
    if (!frame || event.source !== frame.contentWindow || !data || data.type !== "PROJECT_SENGOKU_TACTICAL_OUTCOME") return false;
    if (window.location && window.location.origin && window.location.origin !== "null" && event.origin !== window.location.origin) return false;
    var state = S.State.current, pending = state && state.events && state.events.pendingTacticalBattle;
    if (!pending || data.battleId !== pending.battleId) return false;
    var outcome = A.translateResult(state, pending, data.result);
    if (!outcome) { if (S.UI && S.UI.notify) S.UI.notify("会戦結果の検証に失敗しました", "error"); return true; }
    var applied = S.Systems.Battle.applyOutcome(state, pending, outcome);
    if (!applied.ok) { if (S.UI && S.UI.notify) S.UI.notify(applied.errors.join(" / "), "error"); return true; }
    var resumed = S.Systems.Turn.resumeAfterTactical ? S.Systems.Turn.resumeAfterTactical(state, {}) : { ok: true, stateChanges: {}, errors: [] };
    if (!resumed.ok) { if (S.UI && S.UI.notify) S.UI.notify(resumed.errors.join(" / "), "error"); return true; }
    A.close();
    var combined = { ok: true, stateChanges: Object.assign({}, applied.stateChanges, { resumedSeason: resumed.stateChanges }), messages: applied.messages || [], errors: [] };
    if (S.UI && S.UI.commit) S.UI.commit(combined);
    if (S.UI && S.UI.showBattleReport && applied.stateChanges && applied.stateChanges.report) S.UI.showBattleReport(applied.stateChanges.report);
    return true;
  };

  if (window && window.addEventListener) window.addEventListener("message", A.receiveMessage);
})(window.Sengoku);