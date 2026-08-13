(function (S) {
  "use strict";
  var A = S.Systems.Army = {};

  function nextId(state) {
    var index = 1, armies = state.armies || {};
    while (armies["army_" + index]) index += 1;
    return "army_" + index;
  }
  function fail(message) { return { ok: false, errors: [message] }; }
  function unitTroops(state, army) {
    return (army.unitIds || []).reduce(function (sum, unitId) {
      var unit = S.Systems.Unit.get(state, unitId);
      return sum + (unit && unit.status !== "destroyed" ? Math.max(0, unit.troops) : 0);
    }, 0);
  }
  function unitOfficerIds(state, army) {
    return (army.unitIds || []).map(function (unitId) {
      var unit = S.Systems.Unit.get(state, unitId);
      return unit && unit.officerId;
    }).filter(Boolean);
  }
  function friendlyReturnCastle(state, army) {
    var recent = army && army.lastFriendlyCastleId ? state.castles[army.lastFriendlyCastleId] : null;
    if (recent && recent.factionId === army.factionId) return recent;
    var origin = state.castles[army.originCastleId];
    if (origin && origin.factionId === army.factionId) return origin;
    var destination = state.castles[army.destinationCastleId];
    if (destination && destination.factionId === army.factionId) return destination;
    return Object.keys(state.castles).map(function (id) { return state.castles[id]; }).find(function (castle) { return castle.factionId === army.factionId; }) || null;
  }
  function ensureGovernor(state, castleId, factionId) {
    var castle = state.castles[castleId];
    if (!castle || castle.factionId !== factionId || castle.governorId) return;
    var candidate = S.Systems.Officer.atCastle(state, castleId, factionId).find(function (officer) { return officer.injury !== "重傷"; });
    if (candidate) S.Systems.Officer.assignGovernor(state, candidate.id, castleId, { consumeCommand: false });
  }

  A.get = function (state, id) { return state.armies && state.armies[id] || null; };
  A.all = function (state) { return Object.keys(state.armies || {}).map(function (id) { return state.armies[id]; }); };
  A.forFaction = function (state, factionId) { return A.all(state).filter(function (army) { return army.factionId === factionId; }); };
  A.totalTroops = function (state, armyOrId) {
    var army = typeof armyOrId === "string" ? A.get(state, armyOrId) : armyOrId;
    return army ? unitTroops(state, army) : 0;
  };
  A.segmentSeasons = function (state, fromCastleId, toCastleId) {
    var fromProfile = S.Data.getCastleProfile ? S.Data.getCastleProfile(fromCastleId) : { modifiers: { march: 1 } };
    var toProfile = S.Data.getCastleProfile ? S.Data.getCastleProfile(toCastleId) : { modifiers: { march: 1 } };
    var pace = ((fromProfile.modifiers && fromProfile.modifiers.march) || 1) * 0.45 + ((toProfile.modifiers && toProfile.modifiers.march) || 1) * 0.55;
    return pace < 0.97 ? 2 : 1;
  };
  A.findRoute = function (state, factionId, originCastleId, destinationCastleId, options) {
    options = options || {};
    var maxHops = Math.max(1, Math.floor(Number(options.maxHops) || 3));
    if (!state.castles[originCastleId] || !state.castles[destinationCastleId] || originCastleId === destinationCastleId) return null;
    var queue = [{ id: originCastleId, route: [originCastleId] }], seen = {}; seen[originCastleId] = true;
    while (queue.length) {
      var current = queue.shift();
      if (current.route.length - 1 >= maxHops) continue;
      var castle = state.castles[current.id];
      var neighbors = (castle.neighbors || []).slice().sort();
      for (var i = 0; i < neighbors.length; i += 1) {
        var nextId = neighbors[i], next = state.castles[nextId];
        if (!next) continue;
        var route = current.route.concat(nextId);
        if (nextId === destinationCastleId) return route;
        if (seen[nextId] || next.factionId !== factionId) continue;
        seen[nextId] = true; queue.push({ id: nextId, route: route });
      }
    }
    return null;
  };
  A.routeEta = function (state, route, startIndex) {
    route = Array.isArray(route) ? route : [];
    var index = Math.max(0, Math.floor(Number(startIndex) || 0)), seasons = 0;
    for (var i = index; i < route.length - 1; i += 1) seasons += A.segmentSeasons(state, route[i], route[i + 1]);
    return seasons;
  };
  A.reachableEnemyTargets = function (state, sourceCastleId, factionId, options) {
    options = options || {}; factionId = factionId || (state.castles[sourceCastleId] && state.castles[sourceCastleId].factionId);
    var maxHops = Math.max(1, Math.floor(Number(options.maxHops) || 3));
    return Object.keys(state.castles).map(function (id) {
      var target = state.castles[id];
      if (!target || target.factionId === factionId || !S.Systems.Diplomacy.canAttack(state, factionId, target.factionId).ok) return null;
      var route = A.findRoute(state, factionId, sourceCastleId, id, { maxHops: maxHops });
      if (!route) return null;
      return { castle: target, route: route, hops: route.length - 1, seasons: A.routeEta(state, route, 0) };
    }).filter(Boolean).sort(function (a, b) { return a.seasons - b.seasons || a.hops - b.hops || a.castle.name.localeCompare(b.castle.name); });
  };
  A.remainingEta = function (state, armyOrId) {
    var army = typeof armyOrId === "string" ? A.get(state, armyOrId) : armyOrId;
    if (!army || (army.status !== "marching" && army.status !== "returning")) return 0;
    var loc = army.currentLocation || {}, currentSegment = Math.max(0, Math.floor(Number(loc.hopsRemaining) || 0));
    if (army.status === "returning") return currentSegment;
    var index = Math.max(0, Math.floor(Number(loc.routeIndex) || 0));
    var later = 0;
    for (var i = index + 1; i < (army.route || []).length - 1; i += 1) later += A.segmentSeasons(state, army.route[i], army.route[i + 1]);
    return currentSegment + later;
  };


  A.findFriendlyRoute = function (state, factionId, originCastleId, destinationCastleId, options) {
    options = options || {};
    var maxHops = Math.max(1, Math.floor(Number(options.maxHops) || 3));
    if (!state.castles[originCastleId] || !state.castles[destinationCastleId] || originCastleId === destinationCastleId) return null;
    if (state.castles[originCastleId].factionId !== factionId || state.castles[destinationCastleId].factionId !== factionId) return null;
    var queue = [{ id: originCastleId, route: [originCastleId] }], seen = {}; seen[originCastleId] = true;
    while (queue.length) {
      var current = queue.shift();
      if (current.route.length - 1 >= maxHops) continue;
      var castle = state.castles[current.id], neighbors = (castle.neighbors || []).slice().sort();
      for (var i = 0; i < neighbors.length; i += 1) {
        var nextId = neighbors[i], next = state.castles[nextId];
        if (!next || next.factionId !== factionId) continue;
        var route = current.route.concat(nextId);
        if (nextId === destinationCastleId) return route;
        if (seen[nextId]) continue;
        seen[nextId] = true; queue.push({ id: nextId, route: route });
      }
    }
    return null;
  };
  A.threatsAgainstFaction = function (state, factionId) {
    return A.all(state).filter(function (army) {
      if (!army || army.factionId === factionId || ["marching", "in_battle", "besieging"].indexOf(army.status) < 0) return false;
      var target = state.castles[army.destinationCastleId];
      return Boolean(target && target.factionId === factionId);
    }).sort(function (a, b) {
      var ea = A.remainingEta(state, a), eb = A.remainingEta(state, b);
      return ea - eb || A.totalTroops(state, b) - A.totalTroops(state, a) || a.id.localeCompare(b.id);
    });
  };


  A.currentSegment = function (armyOrId, state) {
    var army = typeof armyOrId === "string" ? A.get(state, armyOrId) : armyOrId;
    if (!army || army.status !== "marching" || !army.currentLocation || !army.currentLocation.fromCastleId || !army.currentLocation.toCastleId) return null;
    return { fromCastleId: army.currentLocation.fromCastleId, toCastleId: army.currentLocation.toCastleId };
  };
  A.sameSegment = function (left, right) {
    if (!left || !right) return false;
    return (left.fromCastleId === right.fromCastleId && left.toCastleId === right.toCastleId) ||
      (left.fromCastleId === right.toCastleId && left.toCastleId === right.fromCastleId);
  };
  A.findEnemyContact = function (state, armyOrId, options) {
    options = options || {};
    var army = typeof armyOrId === "string" ? A.get(state, armyOrId) : armyOrId, segment = A.currentSegment(army, state);
    var excluded = options.excludeArmyIds || {};
    if (!army || !segment || excluded[army.id]) return null;
    return A.all(state).filter(function (other) {
      return other && !excluded[other.id] && other.id !== army.id && other.factionId !== army.factionId && other.status === "marching" && A.sameSegment(segment, A.currentSegment(other, state));
    }).sort(function (a, b) {
      var ap = a.factionId === state.campaign.playerFactionId ? -1 : 0, bp = b.factionId === state.campaign.playerFactionId ? -1 : 0;
      return ap - bp || A.totalTroops(state, b) - A.totalTroops(state, a) || a.id.localeCompare(b.id);
    })[0] || null;
  };
  A.canIntercept = function (state, targetArmyId, sourceCastleId) {
    var enemy = A.get(state, targetArmyId), source = state.castles[sourceCastleId], playerId = state.campaign.playerFactionId;
    if (!enemy || enemy.factionId === playerId || enemy.status !== "marching") return fail("迎撃対象の敵軍が進軍中ではありません");
    if (!source || source.factionId !== playerId) return fail("迎撃元は自勢力城に限られます");
    var loc = enemy.currentLocation || {};
    if (loc.toCastleId !== source.id || !loc.fromCastleId) return fail("敵軍がまだこの城の迎撃圏に入っていません");
    var enemySide = state.castles[loc.fromCastleId];
    if (!enemySide || enemySide.factionId === playerId || source.neighbors.indexOf(enemySide.id) < 0) return fail("迎撃できる隣接区間ではありません");
    var legal = S.Systems.Diplomacy.canAttack(state, playerId, enemy.factionId);
    if (!legal.ok) return fail("外交上迎撃できません: " + legal.reason);
    return { ok: true, stateChanges: { sourceCastleId: source.id, targetArmyId: enemy.id, enemyFromCastleId: enemySide.id, defendedCastleId: source.id, route: [source.id, enemySide.id], etaSeasons: A.segmentSeasons(state, source.id, enemySide.id) }, messages: [], errors: [] };
  };
  A.deployIntercept = function (state, sourceCastleId, targetArmyId, unitSpecs, options) {
    options = options || {};
    if (options.consumeCommand !== false && state.campaign.commands <= 0) return fail("命令回数がありません");
    var check = A.canIntercept(state, targetArmyId, sourceCastleId);
    if (!check.ok) return check;
    var total = (unitSpecs || []).reduce(function (sum, spec) { return sum + Math.max(0, Math.floor(Number(spec && spec.troops) || 0)); }, 0);
    if (total < S.Config.MIN_ATTACK_FORCE) return fail("迎撃軍総兵力は最低" + S.Config.MIN_ATTACK_FORCE + "必要です");
    var deployed = A.deploy(state, sourceCastleId, unitSpecs, { commanderId: options.commanderId || unitSpecs[0].officerId, factionId: state.campaign.playerFactionId, mission: "intercept" });
    if (!deployed.ok) return deployed;
    var army = A.get(state, deployed.stateChanges.armyId), enemy = A.get(state, targetArmyId), info = check.stateChanges;
    var marched = A.startMarch(state, army.id, info.enemyFromCastleId, { route: info.route, maxHops: 1, mission: "intercept" });
    if (!marched.ok) { A.disband(state, army.id, sourceCastleId); return marched; }
    army.targetArmyId = enemy.id;
    army.defendedCastleId = sourceCastleId;
    if (options.consumeCommand !== false) state.campaign.commands = Math.max(0, state.campaign.commands - 1);
    var commander = state.officers[army.commanderId];
    if (S.Systems.Event) S.Systems.Event.addLog(state, (commander ? commander.name : "迎撃軍") + "隊が" + state.officers[enemy.commanderId].name + "隊の迎撃へ出陣しました。", "major");
    return { ok: true, stateChanges: { armyId: army.id, targetArmyId: enemy.id, defendedCastleId: sourceCastleId, route: info.route.slice(), status: army.status, mission: army.mission }, messages: [(commander ? commander.name : "迎撃軍") + "隊が敵軍の迎撃へ向かいました。"], errors: [] };
  };

  function applyFieldLosses(state, army, losses) {
    var active = (army.unitIds || []).map(function (id) { return S.Systems.Unit.get(state, id); }).filter(function (u) { return u && u.status !== "destroyed" && u.troops > 0; });
    var remaining = Math.max(0, Math.floor(losses));
    active.sort(function (a, b) { return b.troops - a.troops || a.id.localeCompare(b.id); });
    while (remaining > 0 && active.length) {
      var changed = false;
      for (var i = 0; i < active.length && remaining > 0; i += 1) {
        var unit = active[i]; if (unit.troops <= 0) continue;
        unit.troops -= 1; remaining -= 1; changed = true;
        if (unit.troops <= 0) { unit.troops = 0; unit.status = "destroyed"; unit.morale = 0; }
        else unit.morale = Math.max(20, unit.morale - 8);
      }
      if (!changed) break;
    }
  }
  function fieldStrength(state, army) {
    var commander = state.officers[army.commanderId], troops = A.totalTroops(state, army);
    var leadership = commander && commander.stats ? commander.stats.leadership : 50;
    var might = commander && commander.stats ? commander.stats.might : 50;
    return troops * (0.72 + leadership / 220 + might / 500);
  }
  function pursuitProfileSnapshot(state, army) {
    var commander = army && state.officers[army.commanderId], leadership = commander && commander.stats ? commander.stats.leadership : 50, might = commander && commander.stats ? commander.stats.might : 50;
    var units = army ? (army.unitIds || []).map(function (id) { return S.Systems.Unit.get(state, id); }).filter(function (unit) { return unit && unit.status !== "destroyed" && unit.troops > 0; }) : [];
    var total = units.reduce(function (sum, unit) { return sum + Math.max(0, unit.troops); }, 0);
    var cavalry = units.reduce(function (sum, unit) { return sum + (unit.unitType === "kiba" ? Math.max(0, unit.troops) : 0); }, 0);
    var cavalryRatio = total > 0 ? cavalry / total : 0;
    var rate = S.Util.clamp(0.10 + cavalryRatio * 0.16 + (might - 50) * 0.001 + (leadership - 50) * 0.0007, 0.08, 0.32);
    var fatigueCost = S.Util.clamp(Math.round(10 - cavalryRatio * 4 - (leadership - 50) / 20), 5, 12);
    return {
      cavalryRatio: cavalryRatio,
      rate: rate,
      fatigueCost: fatigueCost,
      leadership: leadership,
      might: might,
      effectLabel: rate >= 0.24 ? "高" : rate >= 0.16 ? "中" : "低"
    };
  }
  A.pursuitProfile = function (state, armyOrId) {
    var army = typeof armyOrId === "string" ? A.get(state, armyOrId) : armyOrId;
    return army ? pursuitProfileSnapshot(state, army) : null;
  };
  function attachPursuitProfile(report, profile) {
    if (!report || !profile) return;
    report.pursuitRate = profile.rate;
    report.pursuitFatigueCost = profile.fatigueCost;
    report.pursuitCavalryRatio = profile.cavalryRatio;
    report.pursuitEffectLabel = profile.effectLabel;
    report.pursuitLeadership = profile.leadership;
    report.pursuitMight = profile.might;
  }
  function pursuitProfileFromReport(report) {
    var rate = Number.isFinite(report && report.pursuitRate) ? report.pursuitRate : 0.18;
    return {
      rate: rate,
      fatigueCost: Number.isFinite(report && report.pursuitFatigueCost) ? report.pursuitFatigueCost : 8,
      cavalryRatio: Number.isFinite(report && report.pursuitCavalryRatio) ? report.pursuitCavalryRatio : 0,
      effectLabel: report && report.pursuitEffectLabel ? report.pursuitEffectLabel : (rate >= 0.24 ? "高" : rate >= 0.16 ? "中" : "低"),
      leadership: Number.isFinite(report && report.pursuitLeadership) ? report.pursuitLeadership : 50,
      might: Number.isFinite(report && report.pursuitMight) ? report.pursuitMight : 50
    };
  }
  function pursuitAftermathSnapshot(state, winner, loser, profile) {
    profile = profile || pursuitProfileSnapshot(state, winner);
    var winnerCommander = winner && state.officers[winner.commanderId], loserCommander = loser && state.officers[loser.commanderId];
    var winnerFatigue = winnerCommander && Number.isFinite(winnerCommander.fatigue) ? winnerCommander.fatigue : 50;
    var loserFatigue = loserCommander && Number.isFinite(loserCommander.fatigue) ? loserCommander.fatigue : 50;
    var loserMight = loserCommander && loserCommander.stats ? loserCommander.stats.might : 50;
    var captureChance = loserCommander && loserCommander.status === "active" ? S.Util.clamp(0.08 + profile.cavalryRatio * 0.12 + (profile.might - 50) * 0.0012 + (profile.leadership - 50) * 0.0006 - (loserMight - 50) * 0.0014 + Math.max(0, loserFatigue - 50) * 0.0012, 0.03, 0.28) : 0;
    var riskChance = S.Util.clamp(0.12 - profile.cavalryRatio * 0.05 - (profile.leadership - 50) * 0.001 + Math.max(0, winnerFatigue - 50) * 0.0022, 0.04, 0.25);
    return {
      captureChance: captureChance,
      riskChance: riskChance,
      riskLabel: riskChance >= 0.18 ? "高" : riskChance >= 0.10 ? "中" : "低",
      loserCommanderId: loserCommander ? loserCommander.id : null,
      loserCommanderMight: loserMight,
      winnerFatigue: winnerFatigue
    };
  }
  function attachPursuitAftermath(report, aftermath) {
    if (!report || !aftermath) return;
    report.pursuitCaptureChance = aftermath.captureChance;
    report.pursuitRiskChance = aftermath.riskChance;
    report.pursuitRiskLabel = aftermath.riskLabel;
    report.pursuitLoserCommanderId = aftermath.loserCommanderId;
    report.pursuitLoserCommanderMight = aftermath.loserCommanderMight;
  }
  function pursuitAftermathFromReport(state, report) {
    var loser = A.get(state, report && report.loserArmyId), loserCommander = state.officers[report && (report.pursuitLoserCommanderId || (loser && loser.commanderId))];
    var profile = pursuitProfileFromReport(report);
    if (Number.isFinite(report && report.pursuitCaptureChance) && Number.isFinite(report && report.pursuitRiskChance)) {
      return { captureChance: report.pursuitCaptureChance, riskChance: report.pursuitRiskChance, riskLabel: report.pursuitRiskLabel || (report.pursuitRiskChance >= 0.18 ? "高" : report.pursuitRiskChance >= 0.10 ? "中" : "低"), loserCommanderId: report.pursuitLoserCommanderId || (loserCommander && loserCommander.id) || null, loserCommanderMight: Number.isFinite(report.pursuitLoserCommanderMight) ? report.pursuitLoserCommanderMight : (loserCommander && loserCommander.stats ? loserCommander.stats.might : 50) };
    }
    var winnerCommander = state.officers[report && report.winnerCommanderId];
    var winnerFatigue = winnerCommander && Number.isFinite(winnerCommander.fatigue) ? winnerCommander.fatigue : 50;
    var loserFatigue = loserCommander && Number.isFinite(loserCommander.fatigue) ? loserCommander.fatigue : 50;
    var loserMight = loserCommander && loserCommander.stats ? loserCommander.stats.might : 50;
    var captureChance = loserCommander && loserCommander.status === "active" ? S.Util.clamp(0.08 + profile.cavalryRatio * 0.12 + (profile.might - 50) * 0.0012 + (profile.leadership - 50) * 0.0006 - (loserMight - 50) * 0.0014 + Math.max(0, loserFatigue - 50) * 0.0012, 0.03, 0.28) : 0;
    var riskChance = S.Util.clamp(0.12 - profile.cavalryRatio * 0.05 - (profile.leadership - 50) * 0.001 + Math.max(0, winnerFatigue - 50) * 0.0022, 0.04, 0.25);
    return { captureChance: captureChance, riskChance: riskChance, riskLabel: riskChance >= 0.18 ? "高" : riskChance >= 0.10 ? "中" : "低", loserCommanderId: loserCommander ? loserCommander.id : null, loserCommanderMight: loserMight };
  }
  function pursuitStableRoll(report, salt) {
    var text = [report && report.id, report && report.battleTurn, report && report.winnerArmyId, report && report.loserArmyId, salt].join("|");
    var hash = 2166136261;
    for (var i = 0; i < text.length; i += 1) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return (hash >>> 0) / 4294967296;
  }
  function resumeWinnerAfterField(state, army, savedLocation) {
    if (!army || !state.armies[army.id]) return;
    if (army.mission === "intercept") {
      var home = state.castles[army.defendedCastleId || army.originCastleId];
      if (home && home.factionId === army.factionId) { A.disband(state, army.id, home.id); return; }
    }
    army.status = "marching";
    army.currentLocation = savedLocation || army.currentLocation;
  }
  function retreatEndpointCastle(state, army, savedLocation) {
    var loc = savedLocation || army.currentLocation || {}, ids = [loc.fromCastleId, loc.toCastleId];
    var preferred = [army.lastFriendlyCastleId, army.originCastleId, army.destinationCastleId];
    for (var p = 0; p < preferred.length; p += 1) {
      if (ids.indexOf(preferred[p]) >= 0 && state.castles[preferred[p]] && state.castles[preferred[p]].factionId === army.factionId) return state.castles[preferred[p]];
    }
    for (var i = 0; i < ids.length; i += 1) {
      if (state.castles[ids[i]] && state.castles[ids[i]].factionId === army.factionId) return state.castles[ids[i]];
    }
    return friendlyReturnCastle(state, army);
  }
  A.beginFieldRetreat = function (state, armyOrId, savedLocation) {
    var army = typeof armyOrId === "string" ? A.get(state, armyOrId) : armyOrId;
    if (!army || !state.armies[army.id]) return fail("敗走Armyが見つかりません");
    var loc = S.Util.deepClone(savedLocation || army.currentLocation || {}), target = retreatEndpointCastle(state, army, loc);
    if (!target) return fail("敗走先の自勢力城がありません");
    if (loc.castleId === target.id) return A.disband(state, army.id, target.id);
    var fromId = null;
    if (loc.fromCastleId === target.id) fromId = loc.toCastleId;
    else if (loc.toCastleId === target.id) fromId = loc.fromCastleId;
    if (!fromId || !state.castles[fromId] || state.castles[target.id].neighbors.indexOf(fromId) < 0) {
      return A.disband(state, army.id, target.id);
    }
    army.status = "returning";
    army.mission = "retreat";
    army.destinationCastleId = target.id;
    army.route = [fromId, target.id];
    army.currentLocation = { fromCastleId: fromId, toCastleId: target.id, hopsRemaining: 1, routeIndex: 0 };
    army.retreatCastleId = target.id;
    army.retreatStartedTurn = state.campaign.turn;
    army.targetArmyId = null;
    if (S.Systems.Event) S.Systems.Event.addLog(state, (state.officers[army.commanderId] ? state.officers[army.commanderId].name : army.id) + "隊が" + target.name + "へ敗走しています。", "major");
    return { ok: true, action: "field_retreat", stateChanges: { armyId: army.id, retreatCastleId: target.id, status: army.status, etaSeasons: 1 }, messages: [target.name + "へ敗走を開始しました。"], errors: [] };
  };
  A.resolveFieldBattleLegacy = function (state, leftArmyId, rightArmyId, options) {
    options = options || {}; var rng = options.random || Math.random;
    var left = A.get(state, leftArmyId), right = A.get(state, rightArmyId);
    if (!left || !right || left.factionId === right.factionId) return fail("野戦Army参照が不正です");
    var leftLoc = S.Util.deepClone(left.currentLocation), rightLoc = S.Util.deepClone(right.currentLocation);
    var leftBefore = A.totalTroops(state, left), rightBefore = A.totalTroops(state, right);
    var ls = fieldStrength(state, left) * (0.92 + rng() * 0.16), rs = fieldStrength(state, right) * (0.92 + rng() * 0.16);
    var leftWon = ls >= rs;
    var winner = leftWon ? left : right, loser = leftWon ? right : left;
    var winnerBefore = leftWon ? leftBefore : rightBefore, loserBefore = leftWon ? rightBefore : leftBefore;
    var winnerLoss = Math.min(winnerBefore, Math.max(1, Math.round(winnerBefore * (0.20 + rng() * 0.18))));
    var loserLoss = Math.min(loserBefore, Math.max(1, Math.round(loserBefore * (0.52 + rng() * 0.28))));
    applyFieldLosses(state, winner, winnerLoss); applyFieldLosses(state, loser, loserLoss);
    var loserCommander = state.officers[loser.commanderId], winnerCommander = state.officers[winner.commanderId];
    var pursuitProfile = pursuitProfileSnapshot(state, winner);
    var loserRetreat = A.beginFieldRetreat(state, loser, leftWon ? rightLoc : leftLoc);
    resumeWinnerAfterField(state, winner, leftWon ? leftLoc : rightLoc);
    if (winnerCommander) { winnerCommander.battles += 1; winnerCommander.exp += 14; winnerCommander.fatigue = Math.min(100, winnerCommander.fatigue + 16); }
    if (loserCommander) { loserCommander.battles += 1; loserCommander.exp += 7; loserCommander.fatigue = Math.min(100, loserCommander.fatigue + 20); }
    state.campaign.battleCount += 1;
    S.Systems.Diplomacy.recordBattle(state, left.factionId, right.factionId, leftWon, false);
    var report = { id: "battle_" + state.campaign.battleCount, date: S.Systems.Turn.dateLabel(state), name: "街道野戦", result: (winnerCommander ? winnerCommander.name : winner.id) + "隊勝利", mode: "field_legacy", legacyReport: true, attackerFactionId: left.factionId, defenderFactionId: right.factionId, sourceId: left.originCastleId, targetId: right.originCastleId, commander: state.officers[left.commanderId] ? state.officers[left.commanderId].name : left.id, deputy: "Army編成", enemy: state.officers[right.commanderId] ? state.officers[right.commanderId].name : right.id, tactic: "遭遇戦", decision: "野戦", committedTroops: leftBefore, attackerLoss: leftWon ? winnerLoss : loserLoss, defenderLoss: leftWon ? loserLoss : winnerLoss, sourceTroopsBefore: leftBefore, sourceTroopsAfter: state.armies[left.id] ? A.totalTroops(state, left) : 0, injury: null, rivalry: "野戦", diplomacyStatusAtStart: S.Systems.Diplomacy.status(state, left.factionId, right.factionId), diplomacyLegal: true, debugDiplomacyOverride: false, castleCaptured: false, siegeStatus: "not_attempted" };
    report.winnerArmyId = winner.id; report.loserArmyId = loser.id; report.winnerFactionId = winner.factionId; report.winnerCommanderId = winner.commanderId; report.battleTurn = state.campaign.turn;
    attachPursuitProfile(report, pursuitProfile);
    attachPursuitAftermath(report, pursuitAftermathSnapshot(state, winner, loser, pursuitProfile));
    var retreatExists = Boolean(state.armies[loser.id] && state.armies[loser.id].status === "returning");
    report.pursuitAvailable = winner.factionId === state.campaign.playerFactionId && retreatExists; report.pursuitResolved = !retreatExists; report.pursuitLoss = 0; report.pursuitResult = null; report.pursuitByAI = false;
    state.events.battleReports.push(report); if (state.events.battleReports.length > 80) state.events.battleReports.shift();
    S.Systems.Event.addLog(state, "街道で" + (winnerCommander ? winnerCommander.name : winner.id) + "隊が敵軍を撃退しました。", "major");
    S.Systems.Event.addChronicle(state, "街道野戦で" + (winnerCommander ? winnerCommander.name : winner.id) + "隊が勝利した。");
    if (retreatExists && winner.factionId !== state.campaign.playerFactionId) A.resolveAIPursuit(state, report.id);
    return { ok: true, action: "field_battle", stateChanges: { winnerArmyId: winner.id, loserArmyId: loser.id, winnerFactionId: winner.factionId, loserRetreat: loserRetreat.ok ? loserRetreat.stateChanges : null, leftLosses: leftWon ? winnerLoss : loserLoss, rightLosses: leftWon ? loserLoss : winnerLoss, report: report }, messages: [report.name + "：" + report.result], errors: loserRetreat.ok ? [] : loserRetreat.errors || [] };
  };
  A.resolveFieldContact = function (state, armyId, enemyArmyId, options) {
    options = options || {}; var army = A.get(state, armyId), enemy = A.get(state, enemyArmyId);
    if (!army || !enemy || army.factionId === enemy.factionId) return fail("野戦接触が不正です");
    var playerId = state.campaign.playerFactionId, playerArmy = army.factionId === playerId ? army : enemy.factionId === playerId ? enemy : null;
    var hostileArmy = playerArmy ? (playerArmy.id === army.id ? enemy : army) : null;
    if (playerArmy && options.allowTactical !== false && S.Systems.BattleAdapter && S.Systems.BattleAdapter.prepareTacticalFieldBattle) return S.Systems.BattleAdapter.prepareTacticalFieldBattle(state, playerArmy.id, hostileArmy.id);
    return A.resolveFieldBattleLegacy(state, army.id, enemy.id, options);
  };
  A.applyFieldTacticalOutcome = function (state, pending, outcome) {
    var playerArmy = A.get(state, pending.armyId), enemyArmy = A.get(state, pending.enemyArmyId);
    if (!playerArmy || !enemyArmy) return fail("野戦会戦のArmyが見つかりません");
    var playerLoc = pending.playerLocation, enemyLoc = pending.enemyLocation;
    var playerResults = {}, enemyResults = {};
    (outcome.attackerUnitResults || []).forEach(function (r) { playerResults[r.unitId] = r; });
    (outcome.defenderUnitResults || []).forEach(function (r) { if (r.unitId) enemyResults[r.unitId] = r; });
    playerArmy.unitIds.forEach(function (id) { var unit = S.Systems.Unit.get(state,id), r = playerResults[id]; if (!unit || !r) return; unit.troops = Math.max(0, Math.min(unit.maxTroops, Math.floor(r.troopsAfter))); unit.morale = Math.max(0, Math.min(100, Math.round(r.moraleAfter))); unit.status = unit.troops <= 0 || r.status === "destroyed" ? "destroyed" : r.status === "routed" ? "routed" : "active"; });
    enemyArmy.unitIds.forEach(function (id) { var unit = S.Systems.Unit.get(state,id), r = enemyResults[id]; if (!unit || !r) return; unit.troops = Math.max(0, Math.min(unit.maxTroops, Math.floor(r.troopsAfter))); unit.morale = Math.max(0, Math.min(100, Math.round(r.moraleAfter))); unit.status = unit.troops <= 0 || r.status === "destroyed" ? "destroyed" : r.status === "routed" ? "routed" : "active"; });
    var playerWon = outcome.winnerFactionId === playerArmy.factionId, enemyWon = outcome.winnerFactionId === enemyArmy.factionId, draw = !playerWon && !enemyWon;
    var playerCommander = state.officers[playerArmy.commanderId], enemyCommander = state.officers[enemyArmy.commanderId];
    var tacticalPursuitProfile = playerWon ? pursuitProfileSnapshot(state, playerArmy) : enemyWon ? pursuitProfileSnapshot(state, enemyArmy) : null;
    if (playerCommander) { playerCommander.battles += 1; playerCommander.exp += playerWon ? 18 : 9; playerCommander.fatigue = Math.min(100, playerCommander.fatigue + 20); }
    if (enemyCommander) { enemyCommander.battles += 1; enemyCommander.exp += enemyWon ? 18 : 9; enemyCommander.fatigue = Math.min(100, enemyCommander.fatigue + 20); }
    var playerRetreat = null, enemyRetreat = null;
    if (playerWon) { enemyRetreat = A.beginFieldRetreat(state, enemyArmy, enemyLoc); resumeWinnerAfterField(state, playerArmy, playerLoc); }
    else if (enemyWon) { playerRetreat = A.beginFieldRetreat(state, playerArmy, playerLoc); resumeWinnerAfterField(state, enemyArmy, enemyLoc); }
    else { playerRetreat = A.beginFieldRetreat(state, playerArmy, playerLoc); enemyRetreat = A.beginFieldRetreat(state, enemyArmy, enemyLoc); }
    state.campaign.battleCount += 1; S.Systems.Diplomacy.recordBattle(state, playerArmy.factionId, enemyArmy.factionId, playerWon, false);
    var report = { id:"battle_"+state.campaign.battleCount, date:S.Systems.Turn.dateLabel(state), name:"迎撃野戦", result: playerWon ? "迎撃成功" : enemyWon ? "迎撃失敗" : "引き分け", mode:"tactical_field", attackerFactionId:playerArmy.factionId, defenderFactionId:enemyArmy.factionId, sourceId:playerArmy.originCastleId, targetId:enemyArmy.originCastleId, commander:playerCommander?playerCommander.name:playerArmy.id, deputy:"Army編成", enemy:enemyCommander?enemyCommander.name:enemyArmy.id, tactic:"リアルタイム野戦", decision:"迎撃", committedTroops:outcome.attackerTroopsBefore, attackerLoss:outcome.attackerLosses, defenderLoss:outcome.defenderLosses, sourceTroopsBefore:outcome.attackerTroopsBefore, sourceTroopsAfter:state.armies[playerArmy.id]?A.totalTroops(state,playerArmy):0, injury:playerCommander?playerCommander.injury:null, rivalry:"野戦", diplomacyStatusAtStart:S.Systems.Diplomacy.status(state,playerArmy.factionId,enemyArmy.factionId), diplomacyLegal:true, debugDiplomacyOverride:false, castleCaptured:false, siegeStatus:"not_attempted", durationTicks:outcome.durationTicks, seed:outcome.seed };
    report.winnerArmyId = playerWon ? playerArmy.id : enemyWon ? enemyArmy.id : null; report.loserArmyId = playerWon ? enemyArmy.id : enemyWon ? playerArmy.id : null; report.winnerFactionId = playerWon ? playerArmy.factionId : enemyWon ? enemyArmy.factionId : null; report.winnerCommanderId = playerWon ? playerArmy.commanderId : enemyWon ? enemyArmy.commanderId : null; report.battleTurn = state.campaign.turn;
    attachPursuitProfile(report, tacticalPursuitProfile);
    if (report.winnerArmyId && report.loserArmyId) attachPursuitAftermath(report, pursuitAftermathSnapshot(state, state.armies[report.winnerArmyId] || (playerWon ? playerArmy : enemyArmy), state.armies[report.loserArmyId] || (playerWon ? enemyArmy : playerArmy), tacticalPursuitProfile));
    var tacticalRetreatExists = Boolean(report.loserArmyId && state.armies[report.loserArmyId] && state.armies[report.loserArmyId].status === "returning");
    report.pursuitAvailable = playerWon && tacticalRetreatExists; report.pursuitResolved = !tacticalRetreatExists; report.pursuitLoss = 0; report.pursuitResult = null; report.pursuitByAI = false;
    state.events.battleReports.push(report); if(state.events.battleReports.length>80) state.events.battleReports.shift();
    S.Systems.Event.addLog(state, "迎撃野戦：" + report.result, playerWon ? "major" : enemyWon ? "bad" : "major");
    if (enemyWon && tacticalRetreatExists) A.resolveAIPursuit(state, report.id);
    return { ok:true, action:"tactical_field_battle", stateChanges:{ win:playerWon, draw:draw, playerRetreat:playerRetreat&&playerRetreat.ok?playerRetreat.stateChanges:null, enemyRetreat:enemyRetreat&&enemyRetreat.ok?enemyRetreat.stateChanges:null, report:report }, messages:["迎撃野戦："+report.result], errors:[] };
  };

  function fieldReportById(state, reportId) {
    return (state.events && state.events.battleReports || []).find(function (report) { return report && report.id === reportId; }) || null;
  }
  A.canPursue = function (state, reportOrId) {
    var report = typeof reportOrId === "string" ? fieldReportById(state, reportOrId) : reportOrId;
    if (!report || (report.mode !== "field_legacy" && report.mode !== "tactical_field")) return fail("追撃できる野戦記録ではありません");
    if (!report.pursuitAvailable || report.pursuitResolved) return fail("この野戦では追撃できません");
    if (report.winnerFactionId !== state.campaign.playerFactionId) return fail("自軍勝利時のみ追撃を指示できます");
    if (report.battleTurn !== state.campaign.turn) return fail("追撃の機会はすでに失われています");
    var loser = A.get(state, report.loserArmyId);
    if (!loser || loser.status !== "returning") return fail("追撃対象の敗走軍がいません");
    return { ok: true, stateChanges: { reportId: report.id, loserArmyId: loser.id, currentTroops: A.totalTroops(state, loser), profile: pursuitProfileFromReport(report), aftermath: pursuitAftermathFromReport(state, report) }, messages: [], errors: [] };
  };
  function applyPursuitResult(state, report, options) {
    options = options || {};
    var loser = A.get(state, report && report.loserArmyId);
    if (!report || !loser || loser.status !== "returning") return fail("追撃対象の敗走軍がいません");
    var profile = pursuitProfileFromReport(report), aftermath = pursuitAftermathFromReport(state, report), before = A.totalTroops(state, loser);
    var requested = before > 0 ? Math.max(1, Math.round(before * profile.rate)) : 0;
    if (requested > 0) applyFieldLosses(state, loser, requested);
    var loss = Math.max(0, before - A.totalTroops(state, loser)), commander = state.officers[report.winnerCommanderId];
    if (commander && commander.status === "active") commander.fatigue = Math.min(100, commander.fatigue + profile.fatigueCost);

    var rng = typeof options.random === "function" ? options.random : null;
    function roll(salt) { return rng ? rng() : pursuitStableRoll(report, salt); }
    var loserCommander = state.officers[aftermath.loserCommanderId], capturedOfficerId = null, retreatDisbanded = false, retreatReturnedTroops = 0;
    if (loserCommander && loserCommander.status === "active" && aftermath.captureChance > 0 && roll("capture") < aftermath.captureChance && S.Systems.Prisoner && S.Systems.Prisoner.capture) {
      var retreatCastleId = loser.retreatCastleId || loser.destinationCastleId;
      var capture = S.Systems.Prisoner.capture(state, loserCommander.id, report.winnerFactionId, { silent: true });
      if (capture.ok) {
        capturedOfficerId = loserCommander.id;
        var dispersed = state.armies[loser.id] && state.castles[retreatCastleId] && state.castles[retreatCastleId].factionId === loser.factionId ? A.disband(state, loser.id, retreatCastleId) : null;
        if (dispersed && dispersed.ok) { retreatDisbanded = true; retreatReturnedTroops = dispersed.stateChanges.returnedTroops || 0; }
      }
    }

    var incident = Boolean(commander && commander.status === "active" && roll("risk") < aftermath.riskChance);
    var injury = null, extraFatigue = 0;
    if (incident && commander && commander.status === "active") {
      extraFatigue = 6;
      commander.fatigue = Math.min(100, commander.fatigue + extraFatigue);
      commander.health = Math.max(1, commander.health - 8);
      if (commander.injury !== "重傷" && roll("injury") < 0.35) { commander.injury = "軽傷"; commander.health = Math.min(commander.health, 78); injury = "軽傷"; }
    }

    report.pursuitResolved = true;
    report.pursuitLoss = loss;
    report.pursuitByAI = Boolean(options.byAI);
    report.pursuitCapturedOfficerId = capturedOfficerId;
    report.pursuitRetreatDisbanded = retreatDisbanded;
    report.pursuitRetreatReturnedTroops = retreatReturnedTroops;
    report.pursuitCaptureResult = capturedOfficerId ? (state.officers[capturedOfficerId] ? state.officers[capturedOfficerId].name : capturedOfficerId) + "を捕縛" : (aftermath.loserCommanderId ? "敵将は逃亡" : null);
    report.pursuitIncident = incident;
    report.pursuitExtraFatigue = extraFatigue;
    report.pursuitCommanderInjury = injury;
    var baseText = options.byAI ? (loss > 0 ? "敵軍の追撃：敗走軍に追加" + loss + "兵の損害" : "敵軍が追撃したが追加損害はなかった") : (loss > 0 ? "追撃成功：敗走軍に追加" + loss + "兵の損害" : "追撃したが追加損害を与えられなかった");
    var details = [];
    if (capturedOfficerId) details.push((state.officers[capturedOfficerId] ? state.officers[capturedOfficerId].name : capturedOfficerId) + (options.byAI ? "が捕虜となった" : "を捕縛した") + (retreatDisbanded ? "・敗走軍は散開" : ""));
    else if (aftermath.loserCommanderId) details.push("敵総大将は逃げ切った");
    if (incident) details.push("深追いで" + (commander ? commander.name : "総大将") + "に負担" + (injury ? "・" + injury : ""));
    report.pursuitResult = baseText + (details.length ? " / " + details.join(" / ") : "");
    if (S.Systems.Event) {
      S.Systems.Event.addLog(state, report.pursuitResult, options.byAI ? "bad" : "major");
      if (capturedOfficerId) S.Systems.Event.addChronicle(state, (state.officers[capturedOfficerId] ? state.officers[capturedOfficerId].name : capturedOfficerId) + "は追撃の混乱で捕らえられた。");
      S.Systems.Event.addChronicle(state, report.name + "の勝利後、" + (options.byAI ? "敵軍が" : "勝者が") + "敗走軍を追撃した。");
    }
    return { ok: true, action: options.byAI ? "ai_pursuit" : "pursuit", stateChanges: { reportId: report.id, loserArmyId: loser.id, pursuitLoss: loss, pursuitRate: profile.rate, pursuitFatigueCost: profile.fatigueCost, pursuitCapturedOfficerId: capturedOfficerId, pursuitRetreatDisbanded: retreatDisbanded, pursuitRetreatReturnedTroops: retreatReturnedTroops, pursuitIncident: incident, pursuitExtraFatigue: extraFatigue, report: report }, messages: [report.pursuitResult], errors: [] };
  }
  A.resolvePursuit = function (state, reportId, options) {
    var check = A.canPursue(state, reportId); if (!check.ok) return check;
    var report = fieldReportById(state, reportId);
    options = options || {}; options.byAI = false;
    return applyPursuitResult(state, report, options);
  };
  A.resolveAIPursuit = function (state, reportId, options) {
    options = options || {};
    var report = fieldReportById(state, reportId);
    if (!report || (report.mode !== "field_legacy" && report.mode !== "tactical_field")) return fail("AI追撃対象の野戦記録がありません");
    if (report.winnerFactionId === state.campaign.playerFactionId) return fail("プレイヤー勝利の追撃判断は自動化しません");
    if (report.pursuitResolved) return { ok: true, action: "ai_pursuit_resolved", stateChanges: { reportId: report.id, report: report }, messages: [], errors: [] };
    var loser = A.get(state, report.loserArmyId), profile = pursuitProfileFromReport(report), aftermath = pursuitAftermathFromReport(state, report), commander = state.officers[report.winnerCommanderId];
    if (!loser || loser.status !== "returning") { report.pursuitResolved = true; return fail("AI追撃対象の敗走軍がいません"); }
    var fatigue = commander && Number.isFinite(commander.fatigue) ? commander.fatigue : 100;
    var shouldPursue = profile.rate >= 0.145 && fatigue <= 82 && aftermath.riskChance <= 0.22 && A.totalTroops(state, loser) > 0;
    if (shouldPursue) { options.byAI = true; return applyPursuitResult(state, report, options); }
    report.pursuitResolved = true; report.pursuitByAI = true; report.pursuitLoss = 0; report.pursuitResult = "敵軍は深追いを避け、追撃を控えた";
    if (S.Systems.Event) S.Systems.Event.addLog(state, report.pursuitResult, "major");
    return { ok: true, action: "ai_pursuit_declined", stateChanges: { reportId: report.id, report: report }, messages: [report.pursuitResult], errors: [] };
  };
  A.declinePursuit = function (state, reportId) {
    var report = fieldReportById(state, reportId);
    if (!report) return fail("合戦記録が見つかりません");
    if (!report.pursuitAvailable || report.pursuitResolved) return { ok: true, action: "pursuit_declined", stateChanges: { reportId: report.id, report: report }, messages: [], errors: [] };
    report.pursuitResolved = true; report.pursuitLoss = 0; report.pursuitByAI = false; report.pursuitResult = "追撃せず、軍勢を立て直した";
    return { ok: true, action: "pursuit_declined", stateChanges: { reportId: report.id, report: report }, messages: [], errors: [] };
  };

  A.deploy = function (state, castleId, unitSpecs, options) {
    options = options || {};
    state.units = state.units || {};
    state.armies = state.armies || {};
    var castle = state.castles[castleId];
    if (!castle) return fail("出陣元の城が見つかりません");
    if (!Array.isArray(unitSpecs) || !unitSpecs.length) return fail("出陣Unitがありません");
    var factionId = options.factionId || castle.factionId, commanderId = options.commanderId || unitSpecs[0].officerId;
    if (castle.factionId !== factionId) return fail("出陣元とArmyの勢力が一致しません");
    var officerSeen = {}, total = 0, normalizedSpecs = [], error = null;
    unitSpecs.forEach(function (spec) {
      if (error) return;
      spec = spec || {};
      var officer = state.officers[spec.officerId], type = S.Data.getUnitType(spec.unitType);
      var troops = Math.floor(Number(spec.troops)), maxTroops = spec.maxTroops === undefined ? Math.max(troops, type ? type.defaultMaxTroops : 0) : Math.floor(Number(spec.maxTroops));
      if (!officer || officer.status !== "active" || officer.factionId !== factionId || officer.castleId !== castleId) error = "出陣武将が不正です";
      else if (officer.assignment && officer.assignment.type === "army") error = "すでにArmy所属の武将です";
      else if (officerSeen[officer.id]) error = "同一武将を複数Unitへ割り当てられません";
      else if (!type) error = "Unit兵種が不正です";
      else if (!Number.isFinite(troops) || troops <= 0 || !Number.isFinite(maxTroops) || maxTroops <= 0 || troops > maxTroops) error = "出陣兵力が不正です";
      else {
        officerSeen[officer.id] = true;
        total += troops;
        normalizedSpecs.push({ officerId: officer.id, unitType: type.id, troops: troops, maxTroops: maxTroops, morale: spec.morale, experience: spec.experience });
      }
    });
    if (error) return fail(error);
    if (!officerSeen[commanderId]) return fail("総大将は出陣Unitの武将から選んでください");
    var guard = Number.isFinite(castle.guardTroops) ? castle.guardTroops : castle.troops;
    if (total > Math.max(0, guard - S.Config.MIN_GARRISON)) return fail("最低守備兵を残すと出陣兵力が不足します");

    var armyId = options.id || nextId(state);
    if (state.armies[armyId]) return fail("Army IDが重複しています");
    var army = {
      id: armyId,
      factionId: factionId,
      commanderId: commanderId,
      unitIds: [],
      originCastleId: castleId,
      destinationCastleId: castleId,
      route: [castleId],
      currentLocation: { castleId: castleId },
      lastFriendlyCastleId: castleId,
      status: "arrived",
      mission: options.mission || "attack"
    };
    state.armies[armyId] = army;
    S.Systems.Unit.changeGuardTroops(state, castle, -total);

    for (var i = 0; i < normalizedSpecs.length; i += 1) {
      var spec = normalizedSpecs[i], create = S.Systems.Unit.create(state, Object.assign({}, spec, { armyId: armyId }));
      if (!create.ok) {
        army.unitIds.forEach(function (unitId) { S.Systems.Unit.remove(state, unitId); });
        delete state.armies[armyId];
        S.Systems.Unit.changeGuardTroops(state, castle, total);
        return create;
      }
      army.unitIds.push(create.stateChanges.unitId);
      var assigned = S.Systems.Officer.assignToArmy(state, spec.officerId, armyId);
      if (!assigned.ok) {
        army.unitIds.forEach(function (unitId) { S.Systems.Unit.remove(state, unitId); });
        delete state.armies[armyId];
        S.Systems.Unit.changeGuardTroops(state, castle, total);
        normalizedSpecs.forEach(function (rollbackSpec) {
          var officer = state.officers[rollbackSpec.officerId];
          if (officer && officer.status === "active") S.Systems.Officer.setIdleAtCastle(state, officer.id, castleId);
        });
        return assigned;
      }
    }
    return { ok: true, stateChanges: { armyId: armyId, unitIds: army.unitIds.slice(), deployedTroops: total }, messages: [castle.name + "から" + total + "の兵をArmyとして編成しました。"], errors: [] };
  };

  A.startMarch = function (state, armyId, destinationCastleId, options) {
    options = options || {};
    var army = A.get(state, armyId), destination = state.castles[destinationCastleId];
    if (!army) return fail("Armyが見つかりません");
    if (!destination) return fail("進軍先の城が見つかりません");
    if (army.status !== "arrived" || !army.currentLocation || !army.currentLocation.castleId) return fail("現在のArmy状態では進軍できません");
    var origin = state.castles[army.currentLocation.castleId];
    if (!origin) return fail("Armyの出陣位置が不正です");
    if (destination.factionId === army.factionId) return fail("自勢力城は侵攻先に選べません");
    var diplomacy = S.Systems.Diplomacy.canAttack(state, army.factionId, destination.factionId);
    if (!diplomacy.ok) return fail("外交上侵攻できません: " + diplomacy.reason);
    var route = Array.isArray(options.route) ? options.route.slice() : A.findRoute(state, army.factionId, origin.id, destinationCastleId, { maxHops: options.maxHops || 3 });
    if (!route || route.length < 2 || route[0] !== origin.id || route[route.length - 1] !== destinationCastleId) return fail("自領を経由する進軍路がありません");
    for (var i = 1; i < route.length - 1; i += 1) if (!state.castles[route[i]] || state.castles[route[i]].factionId !== army.factionId) return fail("進軍路の途中に敵領があります");
    army.originCastleId = origin.id;
    army.destinationCastleId = destinationCastleId;
    army.route = route;
    army.lastFriendlyCastleId = origin.id;
    army.currentLocation = { fromCastleId: route[0], toCastleId: route[1], hopsRemaining: A.segmentSeasons(state, route[0], route[1]), routeIndex: 0 };
    army.status = "marching";
    army.mission = options.mission || army.mission || "attack";
    return { ok: true, stateChanges: { armyId: armyId, destinationCastleId: destinationCastleId, route: route.slice(), etaSeasons: A.routeEta(state, route, 0), status: army.status }, messages: [state.officers[army.commanderId].name + "の軍勢が" + destination.name + "へ進軍を開始しました。"], errors: [] };
  };

  A.startTransfer = function (state, armyId, destinationCastleId, options) {
    options = options || {};
    var army = A.get(state, armyId), destination = state.castles[destinationCastleId];
    if (!army) return fail("Armyが見つかりません");
    if (!destination || destination.factionId !== army.factionId) return fail("援軍先は自勢力城に限られます");
    if (army.status !== "arrived" || !army.currentLocation || !army.currentLocation.castleId) return fail("現在のArmy状態では援軍移動できません");
    var origin = state.castles[army.currentLocation.castleId];
    var route = Array.isArray(options.route) ? options.route.slice() : A.findFriendlyRoute(state, army.factionId, origin.id, destinationCastleId, { maxHops: options.maxHops || 3 });
    if (!route || route.length < 2) return fail("自領内の援軍路がありません");
    army.originCastleId = origin.id;
    army.destinationCastleId = destinationCastleId;
    army.route = route;
    army.lastFriendlyCastleId = origin.id;
    army.currentLocation = { fromCastleId: route[0], toCastleId: route[1], hopsRemaining: A.segmentSeasons(state, route[0], route[1]), routeIndex: 0 };
    army.status = "marching";
    army.mission = "reinforce";
    return { ok: true, stateChanges: { armyId: armyId, destinationCastleId: destinationCastleId, route: route.slice(), etaSeasons: A.routeEta(state, route, 0), status: army.status, mission: army.mission }, messages: [state.officers[army.commanderId].name + "の援軍が" + destination.name + "へ向かいました。"], errors: [] };
  };

  A.deployAndMarch = function (state, castleId, destinationCastleId, unitSpecs, options) {
    options = options || {};
    if (options.consumeCommand && state.campaign.commands <= 0) return fail("命令回数がありません");
    var total = (unitSpecs || []).reduce(function (sum, spec) { return sum + Math.max(0, Math.floor(Number(spec && spec.troops) || 0)); }, 0);
    if (total < S.Config.MIN_ATTACK_FORCE) return fail("Army総兵力は最低" + S.Config.MIN_ATTACK_FORCE + "必要です");
    var deployed = A.deploy(state, castleId, unitSpecs, options);
    if (!deployed.ok) return deployed;
    var marched = A.startMarch(state, deployed.stateChanges.armyId, destinationCastleId, { maxHops: options.maxHops || 3, route: options.route, mission: options.mission || "attack" });
    if (!marched.ok) {
      A.disband(state, deployed.stateChanges.armyId, castleId);
      return marched;
    }
    if (options.consumeCommand) state.campaign.commands = Math.max(0, state.campaign.commands - 1);
    if (S.Systems.Event) S.Systems.Event.addLog(state, state.officers[options.commanderId || unitSpecs[0].officerId].name + "隊が" + state.castles[destinationCastleId].name + "へ出陣しました。", "major");
    return { ok: true, stateChanges: { armyId: deployed.stateChanges.armyId, unitIds: deployed.stateChanges.unitIds, deployedTroops: deployed.stateChanges.deployedTroops, destinationCastleId: destinationCastleId, status: "marching" }, messages: marched.messages, errors: [] };
  };

  A.disband = function (state, armyId, castleId) {
    var army = A.get(state, armyId), castle = state.castles[castleId || (army && army.currentLocation && army.currentLocation.castleId)];
    if (!army) return fail("Armyが見つかりません");
    if (!castle || castle.factionId !== army.factionId) return fail("Armyを解散できる自勢力城がありません");
    var unitIds = army.unitIds.slice(), returned = 0;
    unitIds.forEach(function (unitId) {
      var unit = S.Systems.Unit.get(state, unitId);
      if (!unit) return;
      if (unit.status !== "destroyed") returned += Math.max(0, unit.troops);
      var officer = state.officers[unit.officerId];
      if (officer && officer.status === "active") S.Systems.Officer.setIdleAtCastle(state, officer.id, castle.id);
      S.Systems.Unit.remove(state, unitId);
    });
    S.Systems.Unit.changeGuardTroops(state, castle, returned);
    army.status = "disbanded";
    delete state.armies[armyId];
    return { ok: true, stateChanges: { armyId: armyId, castleId: castle.id, returnedTroops: returned }, messages: [armyId + "を解散し" + returned + "の兵を" + castle.name + "へ戻しました。"], errors: [] };
  };

  A.cancelMarch = function (state, armyId) {
    var army = A.get(state, armyId);
    if (!army) return fail("Armyが見つかりません");
    var castle = friendlyReturnCastle(state, army);
    if (!castle) return fail("撤兵先の自勢力城がありません");
    var result = A.disband(state, armyId, castle.id);
    if (result.ok && S.Systems.Event) S.Systems.Event.addLog(state, castle.name + "へ軍勢を撤収しました。", "major");
    return result;
  };

  A.resolveArrivalLegacy = function (state, armyId, options) {
    options = options || {};
    var army = A.get(state, armyId);
    if (!army) return fail("到着Armyが見つかりません");
    var target = state.castles[army.destinationCastleId], returnCastle = friendlyReturnCastle(state, army);
    if (!target || !returnCastle) return fail("Army到着処理の城参照が不正です");
    if (target.factionId === army.factionId) {
      var friendly = A.disband(state, armyId, target.id);
      if (friendly.ok) friendly.stateChanges.arrivalType = "friendly";
      return friendly;
    }
    var diplomacy = S.Systems.Diplomacy.canAttack(state, army.factionId, target.factionId);
    if (!diplomacy.ok) {
      var canceled = A.disband(state, armyId, returnCastle.id);
      if (canceled.ok) {
        canceled.stateChanges.arrivalType = "canceled";
        canceled.messages = ["外交状況が変わったため" + target.name + "への侵攻を中止し、" + returnCastle.name + "へ撤収しました。"];
        if (S.Systems.Event) S.Systems.Event.addLog(state, canceled.messages[0], "major");
      }
      return canceled;
    }

    if (options.allowTactical !== false && army.factionId === state.campaign.playerFactionId && S.Systems.BattleAdapter && S.Systems.BattleAdapter.prepareTacticalArrival) {
      return S.Systems.BattleAdapter.prepareTacticalArrival(state, armyId);
    }

    var commanderId = army.commanderId, officerIds = unitOfficerIds(state, army), troops = unitTroops(state, army);
    var deputyId = officerIds.find(function (id) { return id !== commanderId; }) || null;
    var originId = returnCastle.id;
    var returned = A.disband(state, armyId, originId);
    if (!returned.ok) return returned;
    if (troops < S.Config.MIN_ATTACK_FORCE) return { ok: true, stateChanges: { arrivalType: "too_weak", armyId: armyId, returnedTroops: troops }, messages: ["軍勢が損耗し、侵攻に必要な兵力を下回ったため" + originId + "へ撤収しました。"], errors: [] };

    var planned = S.Systems.Battle.plan(state, {
      attackerFactionId: army.factionId,
      defenderFactionId: target.factionId,
      sourceId: originId,
      targetId: target.id,
      commanderId: commanderId,
      deputyId: deputyId,
      committedTroops: troops,
      tacticId: "standard",
      decisionId: "trust",
      controlledByPlayer: false,
      defensePolicy: target.factionId === state.campaign.playerFactionId ? "fortify" : "hold"
    });
    if (!planned.ok) {
      if (S.Systems.Event) S.Systems.Event.addLog(state, target.name + "到着後の合戦準備に失敗しました。", "bad");
      return { ok: false, errors: planned.errors || ["Army到着後の合戦準備に失敗しました"] };
    }
    var battle = S.Systems.Battle.resolve(state, { random: options.random || Math.random });
    if (!battle.ok) return battle;

    var report = battle.stateChanges.report, win = Boolean(battle.stateChanges.win);
    if (win) {
      officerIds.forEach(function (officerId) {
        if (officerId === commanderId || officerId === deputyId) return;
        var officer = state.officers[officerId];
        if (officer && officer.status === "active" && officer.factionId === army.factionId) S.Systems.Officer.moveOfficer(state, officer.id, target.id, { consumeCommand: false, silent: true });
      });
    } else ensureGovernor(state, originId, army.factionId);

    return {
      ok: true,
      action: "army_battle",
      stateChanges: { arrivalType: "battle", armyId: armyId, targetCastleId: target.id, win: win, report: report },
      messages: [target.name + "へ到着し、" + report.result + "となりました。"],
      errors: []
    };
  };

  A.advanceSeason = function (state, options) {
    options = options || {};
    var actions = [], resume = options.resumeState || null;
    var phase = resume && resume.phase === "movement" ? "movement" : "contacts";
    var ids = resume && Array.isArray(resume.ids) ? resume.ids.slice() : Object.keys(state.armies || {}).sort(function (leftId, rightId) {
      var left = A.get(state, leftId), right = A.get(state, rightId);
      var leftPlayer = left && left.factionId === state.campaign.playerFactionId ? -1 : 0, rightPlayer = right && right.factionId === state.campaign.playerFactionId ? -1 : 0;
      return leftPlayer - rightPlayer || A.totalTroops(state, right) - A.totalTroops(state, left) || leftId.localeCompare(rightId);
    });
    var startIndex = resume && Number.isInteger(resume.index) && resume.index >= 0 ? resume.index : 0;
    var handledContacts = resume && resume.handledContacts ? Object.assign({}, resume.handledContacts) : {};
    var engagedArmies = resume && resume.engagedArmies ? Object.assign({}, resume.engagedArmies) : {};
    function makeResumeState(nextPhase, nextIndex, nextIds) {
      return { phase: nextPhase, index: nextIndex, ids: (nextIds || []).slice(), handledContacts: Object.assign({}, handledContacts), engagedArmies: Object.assign({}, engagedArmies) };
    }
    function contactFor(army) {
      if (!army || engagedArmies[army.id]) return null;
      var enemy = A.findEnemyContact(state, army, { excludeArmyIds: engagedArmies });
      if (!enemy) return null;
      var key = [army.id, enemy.id].sort().join("|");
      if (handledContacts[key]) return null;
      handledContacts[key] = true;
      engagedArmies[army.id] = true;
      engagedArmies[enemy.id] = true;
      return { key: key, enemy: enemy };
    }
    if (phase === "contacts") {
      for (var ci = startIndex; ci < ids.length; ci += 1) {
        var contactArmy = A.get(state, ids[ci]);
        if (!contactArmy || contactArmy.status !== "marching") continue;
        var earlyContact = contactFor(contactArmy);
        if (!earlyContact) continue;
        var earlyBattle = A.resolveFieldContact(state, contactArmy.id, earlyContact.enemy.id, { random: options.random || Math.random, allowTactical: options.allowTactical !== false });
        actions.push({ type: "field_contact", armyId: contactArmy.id, enemyArmyId: earlyContact.enemy.id, result: earlyBattle, report: earlyBattle.ok && earlyBattle.stateChanges && earlyBattle.stateChanges.report || null });
        if (state.events && state.events.pendingTacticalBattle) return { ok: earlyBattle.ok, stateChanges: { actions: actions, resumeState: makeResumeState("contacts", ci + 1, ids) }, messages: earlyBattle.messages || [], errors: earlyBattle.errors || [] };
      }
      phase = "movement";
      ids = Object.keys(state.armies || {}).sort();
      startIndex = 0;
    }
    for (var i = startIndex; i < ids.length; i += 1) {
      var armyId = ids[i], army = A.get(state, armyId);
      if (!army) continue;
      if (army.status === "returning") {
        if (Number.isInteger(army.retreatStartedTurn) && army.retreatStartedTurn === state.campaign.turn) {
          actions.push({ type: "retreat_hold", armyId: armyId, retreatCastleId: army.retreatCastleId || army.destinationCastleId, hopsRemaining: Math.max(0, Math.floor(Number(army.currentLocation && army.currentLocation.hopsRemaining) || 0)) });
          continue;
        }
        var retreatTarget = state.castles[army.retreatCastleId || army.destinationCastleId];
        var retreatHops = Math.max(0, Math.floor(Number(army.currentLocation && army.currentLocation.hopsRemaining) || 0));
        if (retreatHops > 1) {
          army.currentLocation.hopsRemaining = retreatHops - 1;
          actions.push({ type: "retreat", armyId: armyId, retreatCastleId: retreatTarget && retreatTarget.id, hopsRemaining: retreatHops - 1 });
        } else {
          if (!retreatTarget || retreatTarget.factionId !== army.factionId) retreatTarget = friendlyReturnCastle(state, army);
          var retreatArrival = retreatTarget ? A.disband(state, armyId, retreatTarget.id) : fail("敗走先の自勢力城がありません");
          if (retreatArrival.ok && S.Systems.Event) S.Systems.Event.addLog(state, retreatTarget.name + "へ敗走軍が帰還しました。", "major");
          actions.push({ type: "retreat_arrival", armyId: armyId, retreatCastleId: retreatTarget && retreatTarget.id, result: retreatArrival });
        }
        continue;
      }
      if (army.status === "besieging") {
        var siege = S.Systems.Siege && S.Systems.Siege.continueSiege ? S.Systems.Siege.continueSiege(state, armyId) : fail("攻城システムがありません");
        actions.push({ type: "siege", armyId: armyId, result: siege, report: null });
        continue;
      }
      if (army.status !== "marching") continue;
      var location = army.currentLocation || {};
      var hops = Math.max(0, Math.floor(Number(location.hopsRemaining) || 0));
      if (hops > 1) {
        army.currentLocation.hopsRemaining = hops - 1;
        actions.push({ type: "march", armyId: armyId, destinationCastleId: army.destinationCastleId, hopsRemaining: hops - 1, etaSeasons: A.remainingEta(state, army) });
        var midContact = contactFor(army);
        if (midContact) {
          var midBattle = A.resolveFieldContact(state, army.id, midContact.enemy.id, { random: options.random || Math.random, allowTactical: options.allowTactical !== false });
          actions.push({ type: "field_contact", armyId: army.id, enemyArmyId: midContact.enemy.id, result: midBattle, report: midBattle.ok && midBattle.stateChanges && midBattle.stateChanges.report || null });
          if (state.events && state.events.pendingTacticalBattle) return { ok: midBattle.ok, stateChanges: { actions: actions, resumeState: makeResumeState("movement", i + 1, ids) }, messages: midBattle.messages || [], errors: midBattle.errors || [] };
        }
        continue;
      }
      var reachedId = location.toCastleId || army.destinationCastleId, reached = state.castles[reachedId];
      var routeIndex = Math.max(0, Math.floor(Number(location.routeIndex) || 0)), finalIndex = Math.max(0, (army.route || []).length - 1);
      if (!reached) { actions.push({ type: "route_error", armyId: armyId, result: fail("進軍路の城が消失しました") }); continue; }
      if (routeIndex + 1 < finalIndex) {
        if (reached.factionId !== army.factionId) {
          var blocked = A.cancelMarch(state, armyId);
          if (blocked.ok) blocked.messages = [reached.name + "が敵勢力となり進軍路が遮断されたため撤兵しました。"];
          actions.push({ type: "route_blocked", armyId: armyId, result: blocked });
          continue;
        }
        army.lastFriendlyCastleId = reached.id;
        var nextIndex = routeIndex + 1, nextId = army.route[nextIndex + 1];
        army.currentLocation = { fromCastleId: reached.id, toCastleId: nextId, hopsRemaining: A.segmentSeasons(state, reached.id, nextId), routeIndex: nextIndex };
        actions.push({ type: "waypoint", armyId: armyId, castleId: reached.id, nextCastleId: nextId, etaSeasons: A.remainingEta(state, army) });
        var waypointContact = contactFor(army);
        if (waypointContact) {
          var waypointBattle = A.resolveFieldContact(state, army.id, waypointContact.enemy.id, { random: options.random || Math.random, allowTactical: options.allowTactical !== false });
          actions.push({ type: "field_contact", armyId: army.id, enemyArmyId: waypointContact.enemy.id, result: waypointBattle, report: waypointBattle.ok && waypointBattle.stateChanges && waypointBattle.stateChanges.report || null });
          if (state.events && state.events.pendingTacticalBattle) return { ok: waypointBattle.ok, stateChanges: { actions: actions, resumeState: makeResumeState("movement", i + 1, ids) }, messages: waypointBattle.messages || [], errors: waypointBattle.errors || [] };
        }
        continue;
      }
      army.currentLocation = { castleId: army.destinationCastleId };
      army.status = "arrived";
      var arrival = A.resolveArrivalLegacy(state, armyId, { random: options.random || Math.random, allowTactical: options.allowTactical !== false });
      actions.push({ type: "arrival", armyId: armyId, result: arrival, report: arrival.ok && arrival.stateChanges && arrival.stateChanges.report || null });
      if (state.events && state.events.pendingTacticalBattle) return { ok: arrival.ok, stateChanges: { actions: actions, resumeState: makeResumeState("movement", i + 1, ids) }, messages: arrival.messages || [], errors: arrival.errors || [] };
    }
    return { ok: actions.every(function (item) { return !item.result || item.result.ok; }), stateChanges: { actions: actions, resumeState: null }, messages: [], errors: actions.reduce(function (errors, item) { return errors.concat(item.result && item.result.errors || []); }, []) };
  };

  A.arriveAndGarrison = A.disband;
})(window.Sengoku);
