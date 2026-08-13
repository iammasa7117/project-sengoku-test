(function (S) {
  "use strict";
  var G = S.Systems.Siege = {};

  function fail(message) { return { ok: false, errors: [message] }; }
  function cfg() {
    return (S.Config.Balance && S.Config.Balance.siege) || {
      tacticalThreshold: 0.9,
      continuationThreshold: 0.78,
      fortificationPerLevel: 12,
      moraleWeight: 0.08,
      attackerMoraleBase: 0.75,
      attackerMoraleDivisor: 400,
      breachTroopRatio: 0.2,
      breachMinDamage: 2,
      moraleDamage: 6,
      defenseDamageEvery: 2
    };
  }
  function seeded(seed) {
    var x = (Number(seed) || 1) >>> 0;
    return function () { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  }
  function avgArmyMorale(state, army) {
    var values = (army.unitIds || []).map(function (unitId) { return S.Systems.Unit.get(state, unitId); }).filter(function (unit) { return unit && unit.status !== "destroyed" && unit.troops > 0; });
    if (!values.length) return 0;
    return values.reduce(function (sum, unit) { return sum + Math.max(0, Math.min(100, unit.morale)); }, 0) / values.length;
  }
  function ensureGovernor(state, castleId, factionId) {
    var castle = state.castles[castleId];
    if (!castle || castle.factionId !== factionId || castle.governorId) return;
    var candidate = S.Systems.Officer.atCastle(state, castleId, factionId).find(function (officer) { return officer.injury !== "重傷"; });
    if (candidate) S.Systems.Officer.assignGovernor(state, candidate.id, castleId, { consumeCommand: false });
  }
  function retreatCastle(state, target, factionId) {
    return target.neighbors.map(function (id) { return state.castles[id]; }).find(function (castle) { return castle && castle.factionId === factionId; }) || null;
  }
  function resolveDefenders(state, target, defenderFactionId, attackerFactionId, seed) {
    var rng = seeded(seed), captured = [], retreated = [];
    S.Systems.Officer.atCastle(state, target.id, defenderFactionId).slice().forEach(function (officer) {
      var retreat = retreatCastle(state, target, defenderFactionId);
      var shouldRetreat = Boolean(retreat && rng() < 0.62);
      if (shouldRetreat) {
        S.Systems.Officer.clearGovernorAssignments(state, officer.id, null);
        officer.castleId = retreat.id;
        officer.assignment = { type: "idle", castleId: retreat.id, armyId: null };
        retreated.push(officer.id);
        S.Systems.Event.addChronicle(state, officer.name + "は" + retreat.name + "へ退却しました。");
      } else {
        S.Systems.Prisoner.capture(state, officer.id, attackerFactionId);
        captured.push(officer.id);
      }
    });
    return { capturedOfficerIds: captured, retreatedOfficerIds: retreated };
  }
  function updateBattleReport(state, siege, captured, preview) {
    if (!siege || !siege.battleReportId) return;
    var report = state.events.battleReports.find(function (item) { return item.id === siege.battleReportId; });
    if (!report) return;
    report.castleCaptured = Boolean(captured);
    report.siegeStatus = captured ? "落城" : "包囲継続";
    if (preview) {
      report.siegeAttackScore = preview.attackScore;
      report.siegeDefenseScore = preview.defenseScore;
      report.siegeRequiredScore = preview.requiredScore;
    }
    if (captured) report.result = "攻撃側勝利・落城";
  }

  G.preview = function (state, armyOrId, castleOrId, threshold) {
    var army = typeof armyOrId === "string" ? S.Systems.Army.get(state, armyOrId) : armyOrId;
    var castle = typeof castleOrId === "string" ? state.castles[castleOrId] : castleOrId;
    if (!army || !castle) return null;
    var c = cfg(), troops = S.Systems.Army.totalTroops(state, army), morale = avgArmyMorale(state, army);
    var profile = S.Data.getCastleProfile ? S.Data.getCastleProfile(castle) : { modifiers: { siegeDefense: 0 } };
    var assignment = S.Systems.Domestic && S.Systems.Domestic.assignmentEffects ? S.Systems.Domestic.assignmentEffects(state, castle) : { defenseBonus: 0 };
    var strategicDefenseBonus = Math.max(0, Number(profile.modifiers && profile.modifiers.siegeDefense) || 0) + Math.max(0, Number(assignment.defenseBonus) || 0);
    var attackScore = Math.max(0, troops * (c.attackerMoraleBase + morale / c.attackerMoraleDivisor));
    var defenseScore = Math.max(1, Math.max(0, castle.guardTroops) + Math.max(0, castle.defense) * c.fortificationPerLevel + Math.max(0, castle.morale) * c.moraleWeight + strategicDefenseBonus);
    var usedThreshold = Number.isFinite(threshold) ? Math.max(0, threshold) : c.tacticalThreshold;
    return {
      attackScore: Math.round(attackScore * 10) / 10,
      defenseScore: Math.round(defenseScore * 10) / 10,
      threshold: usedThreshold,
      requiredScore: Math.round(defenseScore * usedThreshold * 10) / 10,
      attackerTroops: troops,
      attackerMorale: Math.round(morale),
      defenderGuardTroops: castle.guardTroops,
      defenderDefense: castle.defense,
      defenderMorale: castle.morale,
      strategicDefenseBonus: strategicDefenseBonus,
      castleProfileTitle: profile.title || profile.type || "城"
    };
  };

  // Legacy combat keeps the historical "field victory = immediate capture" behavior.
  // The code lives here so Battle.applyOutcome no longer owns castle-transfer responsibility.
  G.resolveLegacy = function (state, plan, outcome, context) {
    context = context || {};
    if (!outcome || !outcome.win) return { ok: true, stateChanges: { attempted: false, captured: false }, messages: [], errors: [] };
    var source = state.castles[plan.sourceId || outcome.sourceId], target = state.castles[plan.targetId || outcome.targetCastleId];
    var commander = context.commander || state.officers[plan.commanderId], deputy = context.deputy || (plan.deputyId ? state.officers[plan.deputyId] : null);
    if (!source || !target || !commander) return fail("Legacy攻城の参照が不正です");
    var oldFactionId = target.factionId;
    target.factionId = plan.attackerFactionId;
    S.Systems.Unit.setGuardTroops(state, target, Math.max(1, outcome.survivors));
    target.morale = Math.max(45, Math.min(72, target.morale - 10));
    S.Systems.Officer.moveOfficer(state, commander.id, target.id, { consumeCommand: false, silent: true });
    if (deputy) S.Systems.Officer.moveOfficer(state, deputy.id, target.id, { consumeCommand: false, silent: true });
    S.Systems.Officer.assignGovernor(state, commander.id, target.id, { consumeCommand: false });
    (outcome.defeatedOfficerResolutions || []).forEach(function (resolution) {
      var officer = state.officers[resolution.officerId];
      if (!officer || officer.factionId !== oldFactionId) return;
      if (resolution.action === "retreat" && resolution.retreatCastleId && state.castles[resolution.retreatCastleId]) {
        S.Systems.Officer.clearGovernorAssignments(state, officer.id, null);
        officer.castleId = resolution.retreatCastleId;
        officer.assignment = { type: "idle", castleId: resolution.retreatCastleId, armyId: null };
        if (resolution.firstHiyoriRetreat) state.events.flags.firstRivalRetreat = true;
        S.Systems.Event.addChronicle(state, officer.name + "は再戦を誓い、" + state.castles[resolution.retreatCastleId].name + "へ退きました。");
      } else S.Systems.Prisoner.capture(state, officer.id, plan.attackerFactionId);
    });
    ensureGovernor(state, source.id, plan.attackerFactionId);
    if (plan.attackerFactionId === state.campaign.playerFactionId) {
      state.campaign.selectedCastleId = target.id;
      S.Systems.Officer.gainMerit(state, commander.id, plan.opening ? 18 : 14, target.name + "攻略戦で総大将を務めた。");
    }
    outcome.castleCaptured = true;
    outcome.siegeStatus = "captured";
    S.Systems.Event.addLog(state, state.factions[plan.attackerFactionId].name + "が" + target.name + "を攻略しました。", "major");
    S.Systems.Event.addChronicle(state, state.factions[plan.attackerFactionId].name + "の" + commander.name + "が" + target.name + "を攻略しました。");
    if (plan.opening && state.campaign.scenarioId === "owari_short") {
      state.events.flags.openingComplete = true;
      state.campaign.status = "playing";
      state.campaign.season = 1;
    }
    return { ok: true, stateChanges: { attempted: true, captured: true, threshold: 0, owner: target.factionId }, messages: [target.name + "が落城しました。"], errors: [] };
  };

  G.captureTactical = function (state, army, target, options) {
    options = options || {};
    var siege = army.siege || options.siege || {}, commander = state.officers[army.commanderId], origin = state.castles[army.originCastleId];
    if (!commander || !origin) return fail("攻城軍の参照が不正です");
    var preview = options.preview || G.preview(state, army, target, 0);
    var defenderFactionId = siege.defenderFactionId || target.factionId;
    var dispositions = resolveDefenders(state, target, defenderFactionId, army.factionId, siege.seed || options.seed || 1);
    target.governorId = null;
    target.factionId = army.factionId;
    S.Systems.Unit.setGuardTroops(state, target, 0);
    target.morale = Math.max(38, Math.min(65, target.morale - 12));
    var disband = S.Systems.Army.disband(state, army.id, target.id);
    if (!disband.ok) return disband;
    if (state.officers[commander.id] && state.officers[commander.id].status === "active") S.Systems.Officer.assignGovernor(state, commander.id, target.id, { consumeCommand: false });
    ensureGovernor(state, origin.id, army.factionId);
    if (army.factionId === state.campaign.playerFactionId) {
      state.campaign.selectedCastleId = target.id;
      S.Systems.Officer.gainMerit(state, commander.id, options.merit === undefined ? 6 : options.merit, target.name + "を攻め落とした。");
    }
    S.Systems.Event.addLog(state, state.factions[army.factionId].name + "が" + target.name + "を攻め落としました。", "major");
    S.Systems.Event.addChronicle(state, commander.name + "が率いる軍勢が" + target.name + "を攻め落としました。");
    updateBattleReport(state, siege, true, preview);
    return {
      ok: true,
      stateChanges: {
        attempted: true,
        captured: true,
        owner: target.factionId,
        targetCastleId: target.id,
        returnedTroops: disband.stateChanges.returnedTroops,
        capturedOfficerIds: dispositions.capturedOfficerIds,
        retreatedOfficerIds: dispositions.retreatedOfficerIds,
        preview: preview
      },
      messages: [target.name + "が落城しました。"],
      errors: []
    };
  };

  G.resolveTactical = function (state, plan, outcome, options) {
    options = options || {};
    var army = S.Systems.Army.get(state, plan.armyId), target = state.castles[plan.targetId || outcome.targetCastleId];
    if (!army || !target) return fail("Tactical攻城の参照が不正です");
    if (outcome.winnerFactionId !== army.factionId) return { ok: true, stateChanges: { attempted: false, captured: false }, messages: [], errors: [] };
    var preview = G.preview(state, army, target, cfg().tacticalThreshold);
    if (!preview) return fail("攻城戦力を評価できません");
    var siege = {
      targetCastleId: target.id,
      defenderFactionId: target.factionId,
      startedTurn: state.campaign.turn,
      fieldBattleId: outcome.battleId || null,
      battleReportId: null,
      seed: (outcome.seed || 1) >>> 0,
      attempts: 0,
      lastAttackScore: preview.attackScore,
      lastDefenseScore: preview.defenseScore
    };
    if (preview.attackScore >= preview.requiredScore) {
      army.siege = siege;
      var captured = G.captureTactical(state, army, target, { siege: siege, seed: outcome.seed, merit: 6, preview: preview });
      if (captured.ok) captured.stateChanges.preview = preview;
      outcome.castleCaptured = Boolean(captured.ok && captured.stateChanges.captured);
      outcome.siegeStatus = outcome.castleCaptured ? "captured" : "failed";
      return captured;
    }
    army.status = "besieging";
    army.currentLocation = { castleId: target.id };
    army.siege = siege;
    target.morale = Math.max(25, target.morale - 4);
    outcome.castleCaptured = false;
    outcome.siegeStatus = "besieging";
    S.Systems.Event.addLog(state, target.name + "は野戦敗北後も籠城。" + state.officers[army.commanderId].name + "隊が包囲を開始しました。", "major");
    S.Systems.Event.addChronicle(state, target.name + "は落城を免れ、" + state.officers[army.commanderId].name + "隊が包囲を続けています。");
    return { ok: true, stateChanges: { attempted: true, captured: false, besieging: true, targetCastleId: target.id, preview: preview }, messages: ["野戦には勝利しましたが、" + target.name + "は持ちこたえています。次の季節も包囲を継続します。"], errors: [] };
  };

  G.continueSiege = function (state, armyId) {
    var army = S.Systems.Army.get(state, armyId);
    if (!army || army.status !== "besieging" || !army.siege) return fail("継続中の包囲軍が見つかりません");
    var target = state.castles[army.siege.targetCastleId || army.destinationCastleId];
    if (!target) return fail("包囲対象の城が見つかりません");
    if (target.factionId === army.factionId) {
      var friendly = S.Systems.Army.disband(state, army.id, target.id);
      if (friendly.ok) friendly.stateChanges.siegeResolved = "friendly";
      return friendly;
    }
    var diplomacy = S.Systems.Diplomacy.canAttack(state, army.factionId, target.factionId);
    if (!diplomacy.ok) {
      var withdrew = S.Systems.Army.cancelMarch(state, army.id);
      if (withdrew.ok) {
        withdrew.stateChanges.siegeResolved = "diplomacy_changed";
        withdrew.messages = ["外交状況が変化したため" + target.name + "の包囲を解きました。"];
      }
      return withdrew;
    }
    if (S.Systems.Army.totalTroops(state, army) < S.Config.MIN_ATTACK_FORCE) {
      var weak = S.Systems.Army.cancelMarch(state, army.id);
      if (weak.ok) {
        weak.stateChanges.siegeResolved = "too_weak";
        weak.messages = ["攻城軍が最低侵攻兵力を下回ったため撤退しました。"];
      }
      return weak;
    }
    army.siege.attempts += 1;
    var c = cfg(), before = G.preview(state, army, target, c.continuationThreshold);
    if (before.attackScore >= before.requiredScore || target.guardTroops <= 0) {
      return G.captureTactical(state, army, target, { siege: army.siege, seed: army.siege.seed + army.siege.attempts, merit: 6, preview: before });
    }
    var guardDamage = Math.min(target.guardTroops, Math.max(c.breachMinDamage, Math.floor(before.attackScore * c.breachTroopRatio)));
    S.Systems.Unit.changeGuardTroops(state, target, -guardDamage);
    target.morale = Math.max(20, target.morale - c.moraleDamage);
    if (c.defenseDamageEvery > 0 && army.siege.attempts % c.defenseDamageEvery === 0 && target.defense > 0) target.defense -= 1;
    var after = G.preview(state, army, target, c.continuationThreshold);
    army.siege.lastAttackScore = after.attackScore;
    army.siege.lastDefenseScore = after.defenseScore;
    if (after.attackScore >= after.requiredScore || target.guardTroops <= 0) {
      return G.captureTactical(state, army, target, { siege: army.siege, seed: army.siege.seed + army.siege.attempts, merit: 6, preview: after });
    }
    updateBattleReport(state, army.siege, false, after);
    S.Systems.Event.addLog(state, target.name + "への攻城を継続。守備兵に" + guardDamage + "の損害を与えました。", "major");
    return {
      ok: true,
      stateChanges: { siegeResolved: "holding", armyId: army.id, targetCastleId: target.id, guardDamage: guardDamage, attempts: army.siege.attempts, preview: after },
      messages: [target.name + "はまだ持ちこたえています。包囲を継続します。"],
      errors: []
    };
  };
})(window.Sengoku);
