(function (S) {
  "use strict";
  var A = S.Systems.AI = {};
  A.castlesFor = function (state, factionId) { return Object.keys(state.castles).map(function (id) { return state.castles[id]; }).filter(function (castle) { return castle.factionId === factionId; }); };
  A.officersFor = function (state, factionId) { return Object.keys(state.officers).map(function (id) { return state.officers[id]; }).filter(function (officer) { return officer.factionId === factionId && officer.status === "active"; }); };
  A.ensureAssignments = function (state, factionId) {
    var assigned = [];
    A.castlesFor(state, factionId).forEach(function (castle) {
      if (S.Systems.Officer.domesticOfficerAt(state, castle.id)) return;
      var governorId = castle.governorId;
      var candidate = S.Systems.Officer.atCastle(state, castle.id, factionId).filter(function (officer) {
        return officer.id !== governorId && officer.injury !== "重傷" && S.Systems.Officer.assignment(officer).type !== "army";
      }).sort(function (a, b) { return b.stats.politics - a.stats.politics; })[0];
      if (!candidate) return;
      var result = S.Systems.Officer.assignDomestic(state, candidate.id, castle.id, { consumeCommand: false });
      if (result.ok) assigned.push({ castleId: castle.id, officerId: candidate.id });
    });
    return { ok: true, stateChanges: { assigned: assigned }, messages: [], errors: [] };
  };
  A.recruit = function (state, factionId, castleId, officerId) {
    var faction = state.factions[factionId], castle = state.castles[castleId], officer = state.officers[officerId], difficulty = S.Data.getDifficulty(state.campaign.difficultyId);
    if (!faction || !castle || castle.factionId !== factionId || !officer || officer.factionId !== factionId || officer.status !== "active" || officer.castleId !== castleId) return { ok: false, errors: ["AI徴兵対象が不正です"] };
    if (faction.gold < S.Config.Balance.recruit.gold || faction.food < S.Config.Balance.recruit.food) return { ok: false, errors: ["AI資源が不足しています"] };
    var exhaustion = state.diplomacy.warExhaustion[factionId] || 0;
    var recruitModifier = S.Systems.Release ? S.Systems.Release.aiRecruitMultiplier(state, factionId) : difficulty.aiRecruit;
    var room = S.Systems.Domestic.recruitmentRoom(castle);
    if (room <= 0) return { ok: false, errors: ["AI徴兵上限に達しています"] };
    var requested = Math.max(1, Math.round((S.Config.Balance.aiRecruitBase + officer.stats.leadership / 15) * recruitModifier * (1 - exhaustion / 100 * S.Data.diplomacy.exhaustion.recruitPenaltyMax)));
    var gain = Math.min(requested, room, Math.floor(castle.population / S.Config.Balance.domestic.populationPerRecruit));
    if (gain <= 0) return { ok: false, errors: ["AI徴兵人口が不足しています"] };
    faction.gold -= S.Config.Balance.recruit.gold; faction.food -= S.Config.Balance.recruit.food; castle.population = Math.max(0, castle.population - gain * S.Config.Balance.domestic.populationPerRecruit); S.Systems.Unit.changeGuardTroops(state, castle, gain);
    return { ok: true, action: "recruit", stateChanges: { castleId: castleId, troops: gain, population: castle.population }, messages: [state.factions[factionId].name + "が" + castle.name + "で徴兵しました。"], errors: [] };
  };
  A.develop = function (state, factionId, castleId) { var faction = state.factions[factionId], castle = state.castles[castleId]; if (!faction || !castle || castle.factionId !== factionId) return { ok: false, errors: ["AI内政対象が不正です"] }; castle.income += S.Config.Balance.aiDevelopGain; castle.population += 20; faction.gold += 5; return { ok: true, action: "develop", stateChanges: { castleId: castleId, population: castle.population }, messages: [faction.name + "が" + castle.name + "の内政を進めました。"], errors: [] }; };
  A.train = function (state, factionId, castleId) { var faction = state.factions[factionId], castle = state.castles[castleId]; if (!faction || !castle || castle.factionId !== factionId) return { ok: false, errors: ["AI訓練対象が不正です"] }; if (faction.food >= 5) faction.food -= 5; castle.morale = Math.min(100, castle.morale + 8); return { ok: true, action: "train", stateChanges: { castleId: castleId }, messages: [faction.name + "が" + castle.name + "で訓練しました。"], errors: [] }; };
  A.reinforce = function (state, factionId) {
    var castles = A.castlesFor(state, factionId), border = castles.filter(function (castle) { return castle.neighbors.some(function (id) { return state.castles[id].factionId !== factionId; }); }).sort(function (a, b) { return a.troops - b.troops; });
    var target = border[0], donor = castles.filter(function (castle) { return castle.id !== (target && target.id) && castle.troops > S.Config.MIN_GARRISON + 20; }).sort(function (a, b) { return b.troops - a.troops; })[0];
    if (!target || !donor || target.troops >= 28) return { ok: false, errors: ["補強不要または兵力不足"] };
    var moved = Math.min(12, donor.troops - S.Config.MIN_GARRISON); S.Systems.Unit.changeGuardTroops(state, donor, -moved); S.Systems.Unit.changeGuardTroops(state, target, moved);
    return { ok: true, action: "reinforce", stateChanges: { sourceId: donor.id, targetId: target.id, troops: moved }, messages: [state.factions[factionId].name + "が" + target.name + "を補強しました。"], errors: [] };
  };
  A.attackCandidates = function (state, factionId, targetFactionId, options) {
    options = options || {};
    var list = [];
    A.castlesFor(state, factionId).forEach(function (source) {
      if (!S.Systems.Battle.canAttack(state, source.id)) return;
      var commanders = S.Systems.Officer.atCastle(state, source.id, factionId).filter(function (officer) { return officer.injury !== "重傷"; });
      if (!commanders.length) return;
      source.neighbors.forEach(function (targetId) { var target = state.castles[targetId]; if (!target || target.factionId === factionId || (targetFactionId && target.factionId !== targetFactionId) || (options.avoidFactionId && target.factionId === options.avoidFactionId) || !S.Systems.Diplomacy.canAttack(state, factionId, target.factionId).ok) return;
        var targetProfile = S.Data.getCastleProfile ? S.Data.getCastleProfile(target) : { modifiers: { siegeDefense: 0 } };
        var targetEffects = S.Systems.Domestic && S.Systems.Domestic.assignmentEffects ? S.Systems.Domestic.assignmentEffects(state, target) : { defenseBonus: 0 };
        var strategicDefense = Math.max(0, Number(targetProfile.modifiers && targetProfile.modifiers.siegeDefense) || 0) + Math.max(0, Number(targetEffects.defenseBonus) || 0);
        var effectiveDefense = target.troops * (1 + target.defense * 0.10 + target.morale / 900) + strategicDefense;
        var ratio = BoundedRatio(S.Systems.Battle.maxCommit(state, source.id), effectiveDefense);
        var commander = commanders.slice().sort(function (a, b) { return b.stats.leadership - a.stats.leadership; })[0];
        var score = ratio + commander.stats.leadership / 1000 - target.defense * 0.015;
        list.push({ source: source, target: target, commander: commander, ratio: ratio, score: score }); });
    });
    return list.sort(function (a, b) { return b.score - a.score; });
  };
  function BoundedRatio(attack, defense) { return attack / Math.max(1, defense); }
  function aiUnitType(officer) {
    if (!officer || !officer.stats) return "ashigaru";
    if (officer.stats.intellect >= 78) return "teppo";
    if (officer.stats.leadership >= 82) return "kiba";
    if (officer.stats.might >= 78) return "samurai";
    return "ashigaru";
  }
  function aiUnitSpecs(state, source, officers, total) {
    var chosen = officers.slice(0, Math.min(3, officers.length)), remaining = total;
    return chosen.map(function (officer, index) {
      var slotsLeft = chosen.length - index, troops = index === chosen.length - 1 ? remaining : Math.max(1, Math.floor(remaining / slotsLeft));
      remaining -= troops;
      return { officerId: officer.id, unitType: aiUnitType(officer), troops: troops };
    }).filter(function (spec) { return spec.troops > 0; });
  }
  A.activeFieldArmies = function (state, factionId, mission) {
    return S.Systems.Army.forFaction(state, factionId).filter(function (army) {
      return army.status !== "disbanded" && (!mission || (army.mission || "attack") === mission);
    });
  };
  A.armyAttackCandidates = function (state, factionId, targetFactionId, options) {
    options = options || {}; var list = [];
    A.castlesFor(state, factionId).forEach(function (source) {
      var available = Math.max(0, source.guardTroops - S.Config.MIN_GARRISON);
      if (available < S.Config.MIN_ATTACK_FORCE) return;
      var commanders = S.Systems.Officer.atCastle(state, source.id, factionId).filter(function (officer) { return officer.injury !== "重傷" && S.Systems.Officer.assignment(officer).type !== "army"; }).sort(function (a, b) { return b.stats.leadership - a.stats.leadership || a.id.localeCompare(b.id); });
      if (!commanders.length) return;
      S.Systems.Army.reachableEnemyTargets(state, source.id, factionId, { maxHops: 3 }).forEach(function (item) {
        var target = item.castle;
        if ((targetFactionId && target.factionId !== targetFactionId) || (options.avoidFactionId && target.factionId === options.avoidFactionId)) return;
        var targetProfile = S.Data.getCastleProfile ? S.Data.getCastleProfile(target) : { modifiers: { siegeDefense: 0 } };
        var targetEffects = S.Systems.Domestic && S.Systems.Domestic.assignmentEffects ? S.Systems.Domestic.assignmentEffects(state, target) : { defenseBonus: 0 };
        var strategicDefense = Math.max(0, Number(targetProfile.modifiers && targetProfile.modifiers.siegeDefense) || 0) + Math.max(0, Number(targetEffects.defenseBonus) || 0);
        var effectiveDefense = target.troops * (1 + target.defense * 0.10 + target.morale / 900) + strategicDefense;
        var ratio = BoundedRatio(available, effectiveDefense), commander = commanders[0];
        var score = ratio + commander.stats.leadership / 1000 - item.seasons * 0.05 - target.defense * 0.015;
        list.push({ source: source, target: target, commander: commander, officers: commanders, route: item.route, seasons: item.seasons, ratio: ratio, score: score });
      });
    });
    return list.sort(function (a, b) { return b.score - a.score || a.seasons - b.seasons || a.target.id.localeCompare(b.target.id); });
  };
  A.launchArmyAttack = function (state, factionId, options) {
    options = options || {};
    if (A.activeFieldArmies(state, factionId, "attack").length >= 1) return { ok: false, errors: ["AIは既に侵攻Armyを展開中です"] };
    var candidate = A.armyAttackCandidates(state, factionId, options.targetFactionId, { avoidFactionId: options.avoidFactionId })[0];
    if (!candidate) return { ok: false, errors: ["AI侵攻Army候補がありません"] };
    var difficulty = S.Data.getDifficulty(state.campaign.difficultyId);
    var threshold = S.Systems.Release ? S.Systems.Release.attackThreshold(state, factionId, candidate.target.factionId) : S.Config.Balance.aiAttackThreshold / difficulty.aiAttack;
    // Field Armies take time to arrive and expose their intention, so the AI may commit at a lower
    // ratio than the old instant-resolution attack. The one-offensive-Army cap prevents spam.
    var fieldThreshold = Math.max(0.68, threshold - 0.28);
    if (!options.force && candidate.ratio < fieldThreshold) return { ok: false, errors: ["AIはArmy侵攻の勝算不足と判断しました"] };
    var commitRatio = S.Systems.Release ? S.Systems.Release.commitRatio(state) : 0.68;
    var available = Math.max(0, candidate.source.guardTroops - S.Config.MIN_GARRISON);
    var committed = Math.max(S.Config.MIN_ATTACK_FORCE, Math.min(available, Math.floor(candidate.source.guardTroops * commitRatio)));
    var specs = aiUnitSpecs(state, candidate.source, candidate.officers, committed);
    var result = S.Systems.Army.deployAndMarch(state, candidate.source.id, candidate.target.id, specs, { commanderId: candidate.commander.id, factionId: factionId, consumeCommand: false, maxHops: 3, route: candidate.route, mission: "attack" });
    if (result.ok) {
      result.action = "army_attack";
      result.stateChanges.sourceId = candidate.source.id; result.stateChanges.targetId = candidate.target.id; result.stateChanges.etaSeasons = candidate.seasons;
    }
    return result;
  };
  A.launchReinforcementArmy = function (state, factionId, options) {
    options = options || {};
    if (A.activeFieldArmies(state, factionId, "reinforce").length >= 1) return { ok: false, errors: ["AIは既に援軍を派遣中です"] };
    var threats = S.Systems.Army.threatsAgainstFaction(state, factionId);
    var border = A.castlesFor(state, factionId).filter(function (castle) { return castle.neighbors.some(function (id) { return state.castles[id].factionId !== factionId; }); });
    var target = threats.length ? state.castles[threats[0].destinationCastleId] : border.slice().sort(function (a, b) { return a.guardTroops - b.guardTroops; })[0];
    if (!target || target.guardTroops >= 36 && !threats.length) return { ok: false, errors: ["AI援軍は不要です"] };
    var donors = A.castlesFor(state, factionId).filter(function (castle) { return castle.id !== target.id && castle.guardTroops > S.Config.MIN_GARRISON + 16; }).map(function (castle) {
      var route = S.Systems.Army.findFriendlyRoute(state, factionId, castle.id, target.id, { maxHops: 3 });
      return route ? { castle: castle, route: route, eta: S.Systems.Army.routeEta(state, route, 0) } : null;
    }).filter(Boolean).sort(function (a, b) { return a.eta - b.eta || b.castle.guardTroops - a.castle.guardTroops; });
    if (!donors.length) return { ok: false, errors: ["AI援軍元がありません"] };
    var donor = donors[0], officers = S.Systems.Officer.atCastle(state, donor.castle.id, factionId).filter(function (officer) { return officer.injury !== "重傷" && S.Systems.Officer.assignment(officer).type !== "army"; }).sort(function (a, b) { return b.stats.leadership - a.stats.leadership || a.id.localeCompare(b.id); });
    if (!officers.length) return { ok: false, errors: ["AI援軍武将がいません"] };
    var total = Math.min(20, donor.castle.guardTroops - S.Config.MIN_GARRISON);
    if (total < 6) return { ok: false, errors: ["AI援軍兵力が不足しています"] };
    var deployed = S.Systems.Army.deploy(state, donor.castle.id, aiUnitSpecs(state, donor.castle, officers, total), { commanderId: officers[0].id, factionId: factionId, mission: "reinforce" });
    if (!deployed.ok) return deployed;
    var marched = S.Systems.Army.startTransfer(state, deployed.stateChanges.armyId, target.id, { route: donor.route, maxHops: 3 });
    if (!marched.ok) { S.Systems.Army.disband(state, deployed.stateChanges.armyId, donor.castle.id); return marched; }
    marched.action = "army_reinforce"; marched.stateChanges.sourceId = donor.castle.id; marched.stateChanges.targetId = target.id;
    return marched;
  };
  A.attack = function (state, factionId, options) {
    options = options || {};
    var candidate = A.attackCandidates(state, factionId, options.targetFactionId, { avoidFactionId: options.avoidFactionId })[0];
    if (!candidate) return { ok: false, errors: ["AI侵攻候補がありません"] };
    var difficulty = S.Data.getDifficulty(state.campaign.difficultyId);
    var threshold = S.Systems.Release ? S.Systems.Release.attackThreshold(state, factionId, candidate.target.factionId) : S.Config.Balance.aiAttackThreshold / difficulty.aiAttack;
    if (!options.force && candidate.ratio < threshold) return { ok: false, errors: ["AIは勝算不足と判断しました"] };
    var commitRatio = S.Systems.Release ? S.Systems.Release.commitRatio(state) : 0.68;
    var maxCommit = S.Systems.Battle.maxCommit(state, candidate.source.id), committed = Math.max(S.Config.MIN_ATTACK_FORCE, Math.min(maxCommit, Math.floor(candidate.source.troops * commitRatio)));
    var plan = S.Systems.Battle.plan(state, { attackerFactionId: factionId, defenderFactionId: candidate.target.factionId, sourceId: candidate.source.id, targetId: candidate.target.id, commanderId: candidate.commander.id, committedTroops: committed, tacticId: "standard", decisionId: "trust", controlledByPlayer: false, defensePolicy: candidate.target.factionId === state.campaign.playerFactionId ? "fortify" : "hold" });
    if (!plan.ok) return plan;
    var result = S.Systems.Battle.resolve(state, { random: options.random || Math.random, forceWin: options.forceWin });
    if (result.ok) result.action = "attack";
    return result;
  };
  A.moveOfficer = function (state, factionId) {
    var border = A.castlesFor(state, factionId).filter(function (castle) { return castle.neighbors.some(function (id) { return state.castles[id].factionId !== factionId; }); }).sort(function (a, b) { return S.Systems.Officer.atCastle(state, a.id, factionId).length - S.Systems.Officer.atCastle(state, b.id, factionId).length; })[0];
    if (!border) return { ok: false, errors: ["AI移動先がありません"] };
    var officer = A.officersFor(state, factionId).find(function (item) { return item.castleId !== border.id && item.injury !== "重傷" && S.Systems.Officer.atCastle(state, item.castleId, factionId).length > 1; });
    if (!officer) return { ok: false, errors: ["AI移動可能武将がいません"] };
    var result = S.Systems.Officer.moveOfficer(state, officer.id, border.id, { consumeCommand: false, silent: true }); if (result.ok) result.action = "move"; return result;
  };
  A.takeAction = function (state, factionId, options) {
    options = options || {}; var castles = A.castlesFor(state, factionId), faction = state.factions[factionId];
    if (!faction || !faction.alive || !castles.length) return { ok: false, errors: ["AI勢力が行動できません"] };
    if (options.forceAction === "attack") return A.attack(state, factionId, { force: true, forceWin: options.forceWin, targetFactionId: options.targetFactionId, avoidFactionId: options.avoidFactionId, random: options.random });
    if (options.forceAction === "recruit") { var forcedCastle = castles[0], forcedOfficer = S.Systems.Officer.atCastle(state, forcedCastle.id, factionId)[0]; return forcedOfficer ? A.recruit(state, factionId, forcedCastle.id, forcedOfficer.id) : { ok: false, errors: ["AI徴兵武将がいません"] }; }
    if (options.strategicSimulation && S.Systems.Diplomacy.warsFor(state, factionId).length) { var strategicAttack = A.attack(state, factionId, { force: true, avoidFactionId: options.avoidFactionId, random: options.random }); if (strategicAttack.ok) return strategicAttack; }
    if (!options.strategicSimulation) {
      var fieldReinforced = A.launchReinforcementArmy(state, factionId, { random: options.random }); if (fieldReinforced.ok) return fieldReinforced;
      if (S.Systems.Diplomacy.warsFor(state, factionId).length) { var fieldAttack = A.launchArmyAttack(state, factionId, { avoidFactionId: options.avoidFactionId, random: options.random }); if (fieldAttack.ok) return fieldAttack; }
    }
    var reinforced = options.strategicSimulation ? A.reinforce(state, factionId) : { ok: false, errors: ["field reinforcement preferred"] }; if (reinforced.ok) return reinforced;
    if (faction.gold < 25 || faction.food < 15) return A.develop(state, factionId, castles.slice().sort(function (a, b) { return a.income - b.income; })[0].id);
    var weak = castles.slice().sort(function (a, b) { return a.troops - b.troops; })[0], recruiter = S.Systems.Officer.atCastle(state, weak.id, factionId)[0];
    if (weak.troops < 70 && recruiter) { var recruited = A.recruit(state, factionId, weak.id, recruiter.id); if (recruited.ok) return recruited; }
    var attacked = options.strategicSimulation ? A.attack(state, factionId, { avoidFactionId: options.avoidFactionId, random: options.random }) : A.launchArmyAttack(state, factionId, { avoidFactionId: options.avoidFactionId, random: options.random }); if (attacked.ok) return attacked;
    var moved = A.moveOfficer(state, factionId); if (moved.ok) return moved;
    return A.train(state, factionId, weak.id);
  };
  A.takeDiplomaticAction = function (state, factionId, options) {
    options = options || {}; var rng = options.random || Math.random, diplomacy = S.Systems.Diplomacy, faction = state.factions[factionId];
    if (!faction || !faction.alive) return { ok: false, errors: ["外交行動できない勢力です"] };
    var subject = state.diplomacy.vassalage[factionId];
    if (subject && state.campaign.turn >= subject.independenceAllowedTurn && (state.diplomacy.warExhaustion[subject.overlordFactionId] >= 70 || diplomacy.power(state, factionId) >= diplomacy.power(state, subject.overlordFactionId) * 0.65)) return diplomacy.independence(state, factionId, { forceSuccess: rng() > 0.35 });
    var wars = diplomacy.warsFor(state, factionId), exhausted = state.diplomacy.warExhaustion[factionId] || 0;
    if (wars.length && (exhausted >= 58 || diplomacy.power(state, factionId) < diplomacy.power(state, wars[0]) * 0.62)) return diplomacy.makePeace(state, factionId, wars[0], { random: rng, autoResolvePlayer: options.autoResolvePlayer, forceAccept: options.forceDiplomacy });
    var exchangeTarget = Object.keys(state.factions).find(function (id) { if (id === factionId || !state.factions[id].alive) return false; var ownHeld = state.prisoners.some(function (officerId) { return state.officers[officerId].factionId === factionId && state.officers[officerId].captorFactionId === id; }), theirsHeld = state.prisoners.some(function (officerId) { return state.officers[officerId].factionId === id && state.officers[officerId].captorFactionId === factionId; }); return ownHeld && theirsHeld; });
    if (exchangeTarget && rng() < 0.6) return diplomacy.propose(state, "prisoner_exchange", factionId, exchangeTarget, { random: rng, autoResolvePlayer: options.autoResolvePlayer });
    var surrenderTarget = wars.find(function (id) { return diplomacy.castlesFor(state, id).length <= 1 && diplomacy.power(state, factionId) > diplomacy.power(state, id) * 1.75; });
    if (surrenderTarget && rng() < 0.5) return diplomacy.recommendSurrender(state, factionId, surrenderTarget, { random: rng, autoResolvePlayer: options.autoResolvePlayer });
    var allies = Object.keys(state.factions).filter(function (id) { return id !== factionId && diplomacy.status(state, factionId, id) === "alliance" && state.factions[id].alive; });
    if (allies.length && rng() < 0.22) {
      var recipient = allies[0], source = factionId === state.campaign.playerFactionId ? state.campaign : state.factions[factionId];
      if (source.gold >= 25 && source.food >= 20) return diplomacy.sendAid(state, factionId, recipient, { gold: 10, food: 10 });
    }
    var commonThreat = Object.keys(state.factions).filter(function (id) { return id !== factionId && state.factions[id].alive && ["neutral", "ceasefire", "non_aggression"].indexOf(diplomacy.status(state, factionId, id)) >= 0 && diplomacy.commonEnemies(state, factionId, id).length; })[0];
    if (commonThreat && rng() < 0.45) return diplomacy.makeAlliance(state, factionId, commonThreat, { random: rng, autoResolvePlayer: options.autoResolvePlayer, forceAccept: options.forceDiplomacy });
    var expiring = Object.keys(state.diplomacy.relations).map(function (key) { return state.diplomacy.relations[key]; }).find(function (relation) { return (relation.factionAId === factionId || relation.factionBId === factionId) && S.Data.diplomacy.treatyStatuses.indexOf(relation.status) >= 0 && Number.isInteger(relation.expiresTurn) && relation.expiresTurn - state.campaign.turn <= 2 && relation.lastActionTurn !== state.campaign.turn; });
    if (expiring && rng() < 0.55) { var treatyTarget = expiring.factionAId === factionId ? expiring.factionBId : expiring.factionAId; return diplomacy.propose(state, "extend", factionId, treatyTarget, { random: rng, autoResolvePlayer: options.autoResolvePlayer, forceAccept: options.forceDiplomacy }); }
    var strategic = options.strategicReevaluation || false;
    var neutralTargets = Object.keys(state.factions).filter(function (id) { return id !== factionId && state.factions[id].alive && diplomacy.status(state, factionId, id) === "neutral" && diplomacy.commonBorder(state, factionId, id); }).sort(function (a, b) { return diplomacy.power(state, a) - diplomacy.power(state, b); });
    var weakNeutral = neutralTargets.find(function (id) { return diplomacy.castlesFor(state, id).length <= 1 && diplomacy.power(state, factionId) > diplomacy.power(state, id) * 2; });
    if (!subject && weakNeutral && rng() < 0.35) return diplomacy.proposeVassalage(state, factionId, weakNeutral, { random: rng, autoResolvePlayer: options.autoResolvePlayer });
    if (!subject && wars.length < S.Data.diplomacy.maxConcurrentWars && neutralTargets.length && (strategic || rng() < 0.34)) {
      var targetId = neutralTargets[0], favorable = diplomacy.power(state, factionId) >= diplomacy.power(state, targetId) * 0.78;
      if (favorable || strategic) return diplomacy.declareWar(state, factionId, targetId, {});
    }
    if (wars.length && rng() < 0.18) return diplomacy.makeCeasefire(state, factionId, wars[0], { random: rng, autoResolvePlayer: options.autoResolvePlayer });
    return { ok: false, errors: ["今季は有効な外交行動なし"] };
  };
  A.runDiplomacySeason = function (state, options) {
    options = options || {}; var rng = options.random || Math.random, actions = [], latest = state.diplomacy.history[state.diplomacy.history.length - 1], strategic = latest && latest.type === "strategic_reevaluation" && latest.turn === state.campaign.turn;
    Object.keys(state.factions).filter(function (id) { return state.factions[id].alive && (options.allFactions || id !== state.campaign.playerFactionId); }).forEach(function (factionId) {
      if (state.campaign.gameOver || (!strategic && rng() >= 0.78)) return;
      var action = A.takeDiplomaticAction(state, factionId, { random: rng, autoResolvePlayer: options.allFactions, strategicReevaluation: strategic });
      if (action.ok) actions.push({ factionId: factionId, type: action.stateChanges.status || "diplomacy" });
    });
    return { ok: true, stateChanges: { actions: actions }, messages: [], errors: [] };
  };
  A.runSeason = function (state, options) {
    options = options || {}; var rng = options.random || Math.random, actions = [], playerAttackCount = 0;
    var playerAttackLimit = options.allFactions ? 99 : (S.Systems.Release ? S.Systems.Release.maxPlayerAttacksPerSeason(state) : 99);
    Object.keys(state.factions).filter(function (id) { return state.factions[id].alive && (options.allFactions || id !== state.campaign.playerFactionId); }).forEach(function (factionId) {
      A.ensureAssignments(state, factionId);
      var count = S.Systems.Release ? S.Systems.Release.aiActionCount(state, factionId, rng) : S.Config.Balance.aiActionsMin + Math.floor(rng() * (S.Config.Balance.aiActionsMax - S.Config.Balance.aiActionsMin + 1));
      for (var i = 0; i < count && !state.campaign.gameOver; i += 1) {
        var result = A.takeAction(state, factionId, { random: rng, strategicSimulation: Boolean(options.allFactions || options.simulation), avoidFactionId: playerAttackCount >= playerAttackLimit ? state.campaign.playerFactionId : null });
        if (result.ok) {
          var report = result.stateChanges && result.stateChanges.report;
          if (result.action === "attack" && report && report.defenderFactionId === state.campaign.playerFactionId) playerAttackCount += 1;
          actions.push({ factionId: factionId, action: result.action || "unknown" });
        }
      }
    });
    state.events.aiHistory.push({ turn: state.campaign.turn, actions: actions, playerAttacks: playerAttackCount }); if (state.events.aiHistory.length > 100) state.events.aiHistory.shift();
    return { ok: true, stateChanges: { actions: actions, playerAttacks: playerAttackCount }, messages: [], errors: [] };
  };
  A.simulate = function (state, seasons, random) {
    var rng = random || Math.random, completed = 0, error = null;
    for (var i = 0; i < seasons; i += 1) { completed += 1; if (state.campaign.gameOver) continue; var result = S.Systems.Turn.advance(state, { random: rng, simulation: true }); if (!result.ok) { error = result.errors.join(" / "); break; } }
    var validation = S.State.validateState(state), summary = { requestedSeasons: seasons, completedSeasons: completed, gameOver: state.campaign.gameOver, outcome: state.campaign.outcome, valid: validation.ok, errors: validation.errors, runtimeError: error };
    state.debug.lastSimulation = summary; return { ok: !error && validation.ok, stateChanges: summary, messages: ["シミュレーション" + completed + "季完了"], errors: error ? [error].concat(validation.errors) : validation.errors };
  };
  A.simulateAllFactions = function (state, seasons, random, options) {
    options = options || {}; var rng = random || Math.random, limit = Math.max(seasons, options.terminationLimit || 300), completed = 0, runtimeError = null, startHistory = state.diplomacy.history.length, startBattles = state.campaign.battleCount;
    for (var i = 0; i < limit; i += 1) {
      if (state.campaign.gameOver && i >= seasons) break;
      if (state.campaign.gameOver) { completed += 1; continue; }
      var advanced = S.Systems.Turn.advance(state, { random: rng, simulation: true, allFactionsAI: true }); completed += 1;
      if (!advanced.ok) { runtimeError = advanced.errors.join(" / "); break; }
    }
    var history = state.diplomacy.history.slice(startHistory), validation = S.State.validateState(state), reports = state.events.battleReports, metrics = {
      requestedSeasons: seasons, completedSeasons: completed, terminationLimit: limit, gameOver: state.campaign.gameOver, outcome: state.campaign.outcome,
      diplomacyActions: history.filter(function (item) { return item.type !== "tribute" && item.type !== "proposal"; }).length,
      declarations: history.filter(function (item) { return item.type === "declare_war"; }).length,
      peace: history.filter(function (item) { return item.type === "peace" || item.type === "ceasefire"; }).length,
      alliances: history.filter(function (item) { return item.type === "alliance"; }).length,
      vassalages: history.filter(function (item) { return item.type === "vassalage" || item.type === "surrender"; }).length,
      independences: history.filter(function (item) { return item.type === "independence"; }).length,
      battles: state.campaign.battleCount - startBattles,
      ownershipChanges: reports.filter(function (item) { return item.result === "攻撃側勝利"; }).length,
      maximumStagnation: state.diplomacy.stagnation.maximum,
      treatyViolationAttacks: reports.filter(function (item) { return item.diplomacyLegal !== true && !item.legacyReport && !item.debugDiplomacyOverride; }).length,
      valid: validation.ok, validationErrors: validation.errors, runtimeError: runtimeError
    };
    state.debug.lastSimulation = metrics;
    return { ok: !runtimeError && validation.ok && metrics.treatyViolationAttacks === 0, stateChanges: metrics, messages: ["全勢力AIシミュレーション" + completed + "季完了"], errors: runtimeError ? [runtimeError].concat(validation.errors) : validation.errors };
  };
})(window.Sengoku);
