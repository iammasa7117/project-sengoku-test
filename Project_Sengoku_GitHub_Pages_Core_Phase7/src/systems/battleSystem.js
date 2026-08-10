(function (S) {
  "use strict";
  var B = S.Systems.Battle = {};
  function tactic(id) { return S.Data.tactics.find(function (item) { return item.id === id; }) || S.Data.tactics[0]; }
  function decision(id) { return S.Data.battleDecisions.find(function (item) { return item.id === id; }) || S.Data.battleDecisions[0]; }
  B.maxCommit = function (state, sourceId) { var source = state.castles[sourceId]; return source ? Math.max(0, Math.floor(source.troops - S.Config.MIN_GARRISON)) : 0; };
  B.canAttack = function (state, sourceId) { return B.maxCommit(state, sourceId) >= S.Config.MIN_ATTACK_FORCE; };
  B.availableTargets = function (state, sourceId, attackerFactionId, options) { var source = state.castles[sourceId]; if (!source) return []; var factionId = attackerFactionId || source.factionId; options = options || {}; return source.neighbors.map(function (id) { return state.castles[id]; }).filter(function (castle) { return castle && castle.factionId !== factionId && (options.ignoreDiplomacy === true || S.Systems.Diplomacy.canAttack(state, factionId, castle.factionId).ok); }); };
  B.plan = function (state, options) {
    options = options || {};
    var source = state.castles[options.sourceId], target = state.castles[options.targetId];
    var attackerFactionId = options.attackerFactionId || (source && source.factionId), defenderFactionId = options.defenderFactionId || (target && target.factionId);
    var commander = state.officers[options.commanderId], deputy = options.deputyId ? state.officers[options.deputyId] : null;
    var controlledByPlayer = options.controlledByPlayer !== undefined ? Boolean(options.controlledByPlayer) : attackerFactionId === state.campaign.playerFactionId;
    if (!source || source.factionId !== attackerFactionId) return { ok: false, errors: ["出陣元と攻撃勢力が一致しません"] };
    if (!target || target.factionId !== defenderFactionId || source.neighbors.indexOf(target.id) < 0 || attackerFactionId === defenderFactionId) return { ok: false, errors: ["侵攻先が不正です"] };
    var diplomacyCheck = S.Systems.Diplomacy.canAttack(state, attackerFactionId, defenderFactionId);
    if (!diplomacyCheck.ok && options.ignoreDiplomacy !== true) return { ok: false, errors: ["外交上侵攻できません: " + diplomacyCheck.reason] };
    if (!commander || commander.status !== "active" || commander.injury === "重傷" || commander.factionId !== attackerFactionId || commander.castleId !== source.id) return { ok: false, errors: ["総大将が不正です"] };
    if (deputy && (deputy.id === commander.id || deputy.status !== "active" || deputy.injury === "重傷" || deputy.factionId !== attackerFactionId || deputy.castleId !== source.id)) return { ok: false, errors: ["副将が不正です"] };
    if (controlledByPlayer && state.campaign.commands <= 0 && !options.opening) return { ok: false, errors: ["命令回数がありません"] };
    var maxCommit = B.maxCommit(state, source.id);
    if (maxCommit < S.Config.MIN_ATTACK_FORCE) return { ok: false, errors: ["最低守備兵を残すと侵攻兵力が不足します"] };
    var committed = options.committedTroops === undefined ? Math.floor(source.troops * S.Config.DEFAULT_COMMIT_RATIO) : Math.floor(Number(options.committedTroops));
    if (!Number.isFinite(committed) || committed < S.Config.MIN_ATTACK_FORCE || committed > maxCommit) return { ok: false, errors: ["投入兵力は" + S.Config.MIN_ATTACK_FORCE + "〜" + maxCommit + "で指定してください"] };
    var enemy = S.Systems.Officer.atCastle(state, target.id, defenderFactionId).sort(function (a, b) { return (b.stats.leadership + b.stats.might) - (a.stats.leadership + a.stats.might); })[0] || null;
    state.events.pendingBattle = { attackerFactionId: attackerFactionId, defenderFactionId: defenderFactionId, sourceId: source.id, targetId: target.id, commanderId: commander.id, deputyId: deputy ? deputy.id : null, enemyId: enemy ? enemy.id : null, tacticId: options.tacticId || "standard", decisionId: options.decisionId || "trust", committedTroops: committed, controlledByPlayer: controlledByPlayer, opening: Boolean(options.opening), defensePolicy: options.defensePolicy || "hold", diplomacyStatusAtStart: S.Systems.Diplomacy.status(state, attackerFactionId, defenderFactionId), diplomacyLegal: diplomacyCheck.ok, debugDiplomacyOverride: options.ignoreDiplomacy === true };
    return { ok: true, stateChanges: { pendingBattle: state.events.pendingBattle, maxCommit: maxCommit }, messages: [target.name + "へ" + committed + "の兵で出陣準備を整えました。"], errors: [] };
  };
  B.start = B.plan;
  B.resolveLegacy = function (state, options) {
    options = options || {};
    var planOverrides = Object.assign({}, options); delete planOverrides.random; delete planOverrides.forceWin;
    var plan = Object.assign({}, state.events.pendingBattle || {}, planOverrides), source = state.castles[plan.sourceId], target = state.castles[plan.targetId];
    var commander = state.officers[plan.commanderId], deputy = plan.deputyId ? state.officers[plan.deputyId] : null, enemy = plan.enemyId ? state.officers[plan.enemyId] : null;
    if (!source || !target || !commander) return { ok: false, errors: ["合戦計画がありません"] };
    var diplomacyCheck = S.Systems.Diplomacy.canAttack(state, plan.attackerFactionId, plan.defenderFactionId);
    if (!diplomacyCheck.ok && !plan.debugDiplomacyOverride) return { ok: false, clearPendingBattle: true, errors: ["合戦解決時に外交状態が変化しました: " + diplomacyCheck.reason] };
    var committed = Math.floor(Number(plan.committedTroops)), maxCommit = B.maxCommit(state, source.id);
    if (!Number.isFinite(committed) || committed < S.Config.MIN_ATTACK_FORCE || committed > maxCommit) return { ok: false, errors: ["解決時の投入兵力が不正です"] };

    var rng = options.random || Math.random, chosenTactic = tactic(plan.tacticId), chosenDecision = decision(plan.decisionId), difficulty = S.Data.getDifficulty(state.campaign.difficultyId);
    var attackerExhaustion = state.diplomacy.warExhaustion[plan.attackerFactionId] || 0, defenderExhaustion = state.diplomacy.warExhaustion[plan.defenderFactionId] || 0;
    var attackerModifier = (plan.attackerFactionId === state.campaign.playerFactionId ? difficulty.playerBattle : difficulty.aiBattle) * (1 - attackerExhaustion / 100 * S.Data.diplomacy.exhaustion.moralePenaltyMax);
    var defenderModifier = (plan.defenderFactionId === state.campaign.playerFactionId ? difficulty.playerBattle : difficulty.aiBattle) * (1 - defenderExhaustion / 100 * S.Data.diplomacy.exhaustion.moralePenaltyMax);
    if (S.Systems.Release) {
      attackerModifier *= S.Systems.Release.battleModifier(state, plan.attackerFactionId, "attacker", plan.defenderFactionId);
      defenderModifier *= S.Systems.Release.battleModifier(state, plan.defenderFactionId, "defender", plan.attackerFactionId);
    }
    var commandPower = commander.stats.leadership * 0.55 + commander.stats.might * 0.25 + commander.stats.intellect * 0.2;
    var deputyPower = deputy ? (deputy.stats.leadership + deputy.stats.might + deputy.stats.intellect) / 12 : 0;
    var intelBonus = state.events.intel[target.id] > 0 ? 1.1 : 1;
    var defensePolicy = plan.defensePolicy === "fortify" ? 1.1 : plan.defensePolicy === "counter" ? 1.04 : plan.defensePolicy === "retreat" ? 0.93 : 1;
    var attack = committed * (0.72 + commandPower / 260 + deputyPower / 100) * chosenTactic.power * chosenDecision.power * intelBonus * attackerModifier * (0.94 + rng() * 0.12);
    var defense = target.troops * (0.9 + target.defense * 0.13 + target.morale / 600) * defenderModifier * defensePolicy;
    var win = options.forceWin === true ? true : options.forceWin === false ? false : attack >= defense;
    var attackLossRate = (win ? 0.16 : 0.36) * chosenTactic.loss * chosenDecision.loss;
    var attackerLoss = Math.min(committed - 1, Math.max(1, Math.floor(committed * attackLossRate)));
    var defenderLoss = Math.min(target.troops, Math.max(1, Math.floor(committed * (win ? 0.48 : 0.23))));
    var survivors = committed - attackerLoss, targetTroopsBefore = target.troops, sourceTroopsBefore = source.troops;

    var commanderInjury = commander.injury, commanderHealth = commander.health;
    if (plan.controlledByPlayer && rng() < (chosenTactic.id === "assault" ? 0.28 : 0.12)) {
      commanderInjury = rng() < 0.25 ? "重傷" : "軽傷";
      commanderHealth = commanderInjury === "重傷" ? 55 : 78;
    }

    var projectedRivalryEncounters = 0;
    if (plan.attackerFactionId === state.campaign.playerFactionId && enemy) {
      var existingRivalry = S.Systems.Rivalry.get(state, commander.id, enemy.id, false);
      projectedRivalryEncounters = (existingRivalry ? existingRivalry.encounters : 0) + 1;
    }

    var capturedOfficerIds = [], retreatedOfficerIds = [], defeatedOfficerResolutions = [];
    if (win) {
      var oldFactionId = target.factionId;
      S.Systems.Officer.atCastle(state, target.id, oldFactionId).slice().forEach(function (officer) {
        var retreat = target.neighbors.map(function (id) { return state.castles[id]; }).find(function (castle) { return castle && castle.factionId === oldFactionId; });
        var firstHiyoriRetreat = state.campaign.scenarioId === "owari_short" && plan.opening && officer.id === "hiyori" && retreat;
        var rematch = projectedRivalryEncounters >= 2 && officer.id === plan.enemyId;
        var shouldRetreat = Boolean(retreat && (firstHiyoriRetreat || (!rematch && rng() < 0.62)));
        if (shouldRetreat) retreatedOfficerIds.push(officer.id); else capturedOfficerIds.push(officer.id);
        defeatedOfficerResolutions.push({ officerId: officer.id, action: shouldRetreat ? "retreat" : "capture", retreatCastleId: shouldRetreat ? retreat.id : null, firstHiyoriRetreat: Boolean(firstHiyoriRetreat) });
      });
    }

    var commanderDefeated = null;
    if (win && plan.enemyId) {
      var enemyResolution = defeatedOfficerResolutions.find(function (item) { return item.officerId === plan.enemyId; });
      if (enemyResolution) commanderDefeated = { officerId: plan.enemyId, resolution: enemyResolution.action === "capture" ? "captured" : "retreated" };
    }

    var outcome = {
      battleId: "battle_" + (state.campaign.battleCount + 1),
      mode: "legacy",
      attackerFactionId: plan.attackerFactionId,
      defenderFactionId: plan.defenderFactionId,
      winnerFactionId: win ? plan.attackerFactionId : plan.defenderFactionId,
      loserFactionId: win ? plan.defenderFactionId : plan.attackerFactionId,
      sourceId: source.id,
      targetCastleId: target.id,
      castleCaptured: win,
      attackerLosses: attackerLoss,
      defenderLosses: win ? targetTroopsBefore : defenderLoss,
      survivingUnits: [],
      routedUnits: [],
      destroyedUnitIds: [],
      capturedOfficerIds: capturedOfficerIds,
      killedOfficerIds: [],
      retreatedOfficerIds: retreatedOfficerIds,
      commanderDefeated: commanderDefeated,
      merit: [{ officerId: commander.id, amount: win ? (plan.opening ? 18 : 14) : 5 }],
      intelUsed: intelBonus > 1,
      durationTicks: 0,
      seed: null,
      win: win,
      committedTroops: committed,
      survivors: survivors,
      rawDefenderLoss: defenderLoss,
      sourceTroopsBefore: sourceTroopsBefore,
      targetTroopsBefore: targetTroopsBefore,
      commanderInjury: commanderInjury,
      commanderHealth: commanderHealth,
      defeatedOfficerResolutions: defeatedOfficerResolutions,
      tacticId: chosenTactic.id,
      tacticName: chosenTactic.name,
      decisionId: chosenDecision.id,
      decisionName: chosenDecision.name,
      diplomacyLegal: diplomacyCheck.ok,
      diplomacyStatusAtStart: plan.diplomacyStatusAtStart,
      debugDiplomacyOverride: Boolean(plan.debugDiplomacyOverride)
    };
    return { ok: true, plan: plan, outcome: outcome, stateChanges: { outcome: outcome }, messages: [target.name + "攻略戦の解決結果を計算しました。"], errors: [] };
  };

  B.applyOutcome = function (state, plan, outcome) {
    plan = plan || {};
    outcome = outcome || {};
    var source = state.castles[plan.sourceId || outcome.sourceId], target = state.castles[plan.targetId || outcome.targetCastleId];
    if (outcome.mode === "tactical") return B.applyTacticalOutcome(state, plan, outcome);
    var commander = state.officers[plan.commanderId], deputy = plan.deputyId ? state.officers[plan.deputyId] : null, enemy = plan.enemyId ? state.officers[plan.enemyId] : null;
    if (!source || !target || !commander || outcome.mode !== "legacy") return { ok: false, errors: ["合戦結果を適用できません"] };

    var win = Boolean(outcome.win), committed = outcome.committedTroops, survivors = outcome.survivors;
    var chosenTactic = tactic(outcome.tacticId || plan.tacticId), chosenDecision = decision(outcome.decisionId || plan.decisionId);
    S.Systems.Unit.changeGuardTroops(state, source, -committed);
    commander.battles += 1; commander.fatigue = Math.min(100, commander.fatigue + 24); commander.exp += win ? 22 : 14;
    commander.injury = outcome.commanderInjury; commander.health = outcome.commanderHealth;
    if (deputy) {
      deputy.battles += 1; deputy.fatigue = Math.min(100, deputy.fatigue + 17); deputy.exp += win ? 14 : 8;
      if (plan.attackerFactionId === state.campaign.playerFactionId) S.Systems.Relationship.change(state, commander.id, deputy.id, win ? chosenDecision.relation : -1, target.name + "攻略戦をともに戦った。");
    }

    var rivalry = plan.attackerFactionId === state.campaign.playerFactionId && enemy ? S.Systems.Rivalry.recordBattle(state, commander.id, enemy.id, win) : null;
    if (win) {
      var siegeLegacy = S.Systems.Siege.resolveLegacy(state, plan, outcome, { commander: commander, deputy: deputy });
      if (!siegeLegacy.ok) return siegeLegacy;
    } else {
      S.Systems.Unit.changeGuardTroops(state, source, survivors); S.Systems.Unit.setGuardTroops(state, target, Math.max(1, target.troops - outcome.rawDefenderLoss));
      outcome.castleCaptured = false;
      outcome.siegeStatus = "not_attempted";
      if (plan.attackerFactionId === state.campaign.playerFactionId) S.Systems.Officer.gainMerit(state, commander.id, 5, target.name + "攻略戦から退却した。");
      S.Systems.Event.addLog(state, state.factions[plan.attackerFactionId].name + "の" + target.name + "侵攻は失敗しました。", "bad");
      S.Systems.Event.addChronicle(state, commander.name + "が率いた" + target.name + "攻略戦は失敗しました。");
    }
    if (plan.controlledByPlayer && !plan.opening) state.campaign.commands = Math.max(0, state.campaign.commands - 1);
    state.campaign.battleCount += 1;
    S.Systems.Diplomacy.recordBattle(state, plan.attackerFactionId, plan.defenderFactionId, win, Boolean(outcome.castleCaptured));
    var report = {
      id: "battle_" + state.campaign.battleCount,
      date: S.Systems.Turn.dateLabel(state),
      name: target.name + "攻略戦",
      result: win ? "攻撃側勝利" : "防御側勝利",
      attackerFactionId: plan.attackerFactionId,
      defenderFactionId: plan.defenderFactionId,
      sourceId: source.id,
      targetId: target.id,
      commander: commander.name,
      deputy: deputy ? deputy.name : "なし",
      enemy: enemy ? enemy.name : "不明",
      tactic: chosenTactic.name,
      decision: chosenDecision.name,
      committedTroops: committed,
      attackerLoss: outcome.attackerLosses,
      defenderLoss: outcome.defenderLosses,
      sourceTroopsBefore: outcome.sourceTroopsBefore,
      sourceTroopsAfter: source.troops,
      injury: commander.injury,
      rivalry: rivalry ? S.Systems.Rivalry.label(rivalry) : "因縁なし",
      diplomacyStatusAtStart: outcome.diplomacyStatusAtStart,
      diplomacyLegal: outcome.diplomacyLegal,
      debugDiplomacyOverride: outcome.debugDiplomacyOverride,
      castleCaptured: Boolean(outcome.castleCaptured),
      siegeStatus: outcome.siegeStatus || (outcome.castleCaptured ? "captured" : "not_attempted")
    };
    state.events.battleReports.push(report); if (state.events.battleReports.length > 80) state.events.battleReports.shift();
    if (plan.defenderFactionId === state.campaign.playerFactionId && plan.attackerFactionId !== state.campaign.playerFactionId) state.events.defenseNotifications.push(report);
    state.events.pendingBattle = null; S.Systems.Victory.check(state);
    return { ok: true, stateChanges: { win: win, owner: target.factionId, attackerLoss: outcome.attackerLosses, defenderLoss: report.defenderLoss, report: report }, messages: [report.name + "：" + report.result], errors: [] };
  };

  B.applyTacticalOutcome = function (state, plan, outcome) {
    plan = plan || {}; outcome = outcome || {};
    var army = state.armies && state.armies[plan.armyId], target = state.castles[plan.targetId || outcome.targetCastleId];
    if (!army || !target || army.status !== "in_battle") return { ok: false, errors: ["Tactical会戦のArmy状態が不正です"] };
    if (outcome.seed !== plan.seed || outcome.attackerFactionId !== army.factionId || outcome.defenderFactionId !== target.factionId) return { ok: false, errors: ["Tactical会戦結果の整合性が取れません"] };
    var origin = state.castles[army.originCastleId], commander = state.officers[army.commanderId], enemy = plan.enemyId ? state.officers[plan.enemyId] : null;
    if (!origin || !commander) return { ok: false, errors: ["Tactical会戦のCore参照が不正です"] };
    var playerWon = outcome.winnerFactionId === army.factionId, draw = outcome.winnerFactionId === null;
    var attackerBefore = outcome.attackerTroopsBefore || S.Systems.Army.totalTroops(state, army), defenderBefore = Number.isFinite(outcome.defenderTroopsBefore) ? outcome.defenderTroopsBefore : target.guardTroops;
    var unitResultById = {};
    (outcome.attackerUnitResults || []).forEach(function (item) { unitResultById[item.unitId] = item; });
    army.unitIds.slice().forEach(function (unitId) {
      var unit = S.Systems.Unit.get(state, unitId), result = unitResultById[unitId];
      if (!unit || !result) return;
      unit.troops = Math.max(0, Math.min(unit.maxTroops, Math.floor(result.troopsAfter)));
      unit.morale = Math.max(0, Math.min(100, Math.round(result.moraleAfter)));
      unit.status = result.status === "destroyed" || unit.troops <= 0 ? "destroyed" : result.status === "routed" ? "routed" : "active";
    });
    var defenderSurvivors = Math.max(0, Math.floor(defenderBefore - outcome.defenderLosses));
    S.Systems.Unit.setGuardTroops(state, target, defenderSurvivors);
    commander.battles += 1; commander.fatigue = Math.min(100, commander.fatigue + 24); commander.exp += playerWon ? 22 : 14;
    army.unitIds.forEach(function (unitId) { var unit = S.Systems.Unit.get(state, unitId), officer = unit && state.officers[unit.officerId]; if (officer && officer.id !== commander.id) { officer.battles += 1; officer.fatigue = Math.min(100, officer.fatigue + 17); officer.exp += playerWon ? 14 : 8; } });
    var rivalry = plan.attackerFactionId === state.campaign.playerFactionId && enemy ? S.Systems.Rivalry.recordBattle(state, commander.id, enemy.id, playerWon) : null;
    var siegeResult = { ok: true, stateChanges: { attempted: false, captured: false }, messages: [], errors: [] };
    if (playerWon) {
      if (army.factionId === state.campaign.playerFactionId) S.Systems.Officer.gainMerit(state, commander.id, 8, target.name + "野戦で勝利した。");
      siegeResult = S.Systems.Siege.resolveTactical(state, plan, outcome, {});
      if (!siegeResult.ok) return siegeResult;
    } else {
      outcome.castleCaptured = false;
      outcome.siegeStatus = "not_attempted";
      var disbandLoss = S.Systems.Army.disband(state, army.id, origin.id);
      if (!disbandLoss.ok) return disbandLoss;
      var sourceOfficers = S.Systems.Officer.atCastle(state, origin.id, army.factionId); if (!origin.governorId && sourceOfficers.length) S.Systems.Officer.assignGovernor(state, sourceOfficers[0].id, origin.id, { consumeCommand: false });
      if (army.factionId === state.campaign.playerFactionId) S.Systems.Officer.gainMerit(state, commander.id, draw ? 7 : 5, target.name + (draw ? "会戦を引き分けた。" : "会戦から退却した。"));
      S.Systems.Event.addLog(state, commander.name + "隊の" + target.name + "侵攻は" + (draw ? "引き分け" : "失敗") + "となりました。", draw ? "major" : "bad");
      S.Systems.Event.addChronicle(state, commander.name + "が率いた" + target.name + "会戦は" + (draw ? "決着せず" : "敗北し") + "、軍勢は帰還しました。");
    }
    state.campaign.battleCount += 1;
    S.Systems.Diplomacy.recordBattle(state, outcome.attackerFactionId, outcome.defenderFactionId, playerWon, Boolean(outcome.castleCaptured));
    var siegePreview = siegeResult.stateChanges && siegeResult.stateChanges.preview;
    var resultLabel = playerWon ? (outcome.castleCaptured ? "攻撃側勝利・落城" : "攻撃側勝利・包囲継続") : draw ? "引き分け" : "防御側勝利";
    var report = {
      id: "battle_" + state.campaign.battleCount,
      date: S.Systems.Turn.dateLabel(state), name: target.name + "攻略戦",
      result: resultLabel,
      mode: "tactical",
      attackerFactionId: outcome.attackerFactionId, defenderFactionId: outcome.defenderFactionId,
      sourceId: origin.id, targetId: target.id,
      commander: commander.name, deputy: "Army編成", enemy: enemy ? enemy.name : "城守備隊",
      tactic: "リアルタイム会戦", decision: "直接指揮",
      committedTroops: attackerBefore, attackerLoss: outcome.attackerLosses, defenderLoss: outcome.defenderLosses,
      sourceTroopsBefore: origin.troops, sourceTroopsAfter: origin.troops,
      injury: commander.injury, rivalry: rivalry ? S.Systems.Rivalry.label(rivalry) : "因縁なし",
      diplomacyStatusAtStart: S.Systems.Diplomacy.status(state, outcome.attackerFactionId, outcome.defenderFactionId), diplomacyLegal: true, debugDiplomacyOverride: false,
      durationTicks: outcome.durationTicks, seed: outcome.seed,
      capturedOfficerIds: siegeResult.stateChanges && siegeResult.stateChanges.capturedOfficerIds || [],
      retreatedOfficerIds: siegeResult.stateChanges && siegeResult.stateChanges.retreatedOfficerIds || [],
      castleCaptured: Boolean(outcome.castleCaptured),
      siegeStatus: outcome.siegeStatus || "not_attempted",
      siegeAttackScore: siegePreview ? siegePreview.attackScore : null,
      siegeDefenseScore: siegePreview ? siegePreview.defenseScore : null,
      siegeRequiredScore: siegePreview ? siegePreview.requiredScore : null
    };
    state.events.battleReports.push(report); if (state.events.battleReports.length > 80) state.events.battleReports.shift();
    if (state.armies[plan.armyId] && state.armies[plan.armyId].status === "besieging" && state.armies[plan.armyId].siege) state.armies[plan.armyId].siege.battleReportId = report.id;
    state.events.pendingTacticalBattle = null; S.Systems.Victory.check(state);
    return {
      ok: true,
      stateChanges: {
        win: playerWon, draw: draw, owner: target.factionId,
        attackerLoss: outcome.attackerLosses, defenderLoss: outcome.defenderLosses,
        report: report, castleCaptured: Boolean(outcome.castleCaptured),
        besieging: Boolean(state.armies[plan.armyId] && state.armies[plan.armyId].status === "besieging"),
        siege: siegeResult.stateChanges || null
      },
      messages: [report.name + "：" + report.result].concat(siegeResult.messages || []), errors: []
    };
  };

  B.resolve = function (state, options) {
    var resolved = B.resolveLegacy(state, options || {});
    if (!resolved.ok) {
      if (resolved.clearPendingBattle) state.events.pendingBattle = null;
      return { ok: false, errors: resolved.errors || ["合戦を解決できません"] };
    }
    return B.applyOutcome(state, resolved.plan, resolved.outcome);
  };
})(window.Sengoku);
