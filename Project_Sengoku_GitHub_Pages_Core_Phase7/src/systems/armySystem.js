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
    if (!army || army.status !== "marching") return 0;
    var loc = army.currentLocation || {}, currentSegment = Math.max(0, Math.floor(Number(loc.hopsRemaining) || 0));
    var index = Math.max(0, Math.floor(Number(loc.routeIndex) || 0));
    var later = 0;
    for (var i = index + 1; i < (army.route || []).length - 1; i += 1) later += A.segmentSeasons(state, army.route[i], army.route[i + 1]);
    return currentSegment + later;
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
      status: "arrived"
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
    return { ok: true, stateChanges: { armyId: armyId, destinationCastleId: destinationCastleId, route: route.slice(), etaSeasons: A.routeEta(state, route, 0), status: army.status }, messages: [state.officers[army.commanderId].name + "の軍勢が" + destination.name + "へ進軍を開始しました。"], errors: [] };
  };

  A.deployAndMarch = function (state, castleId, destinationCastleId, unitSpecs, options) {
    options = options || {};
    if (options.consumeCommand && state.campaign.commands <= 0) return fail("命令回数がありません");
    var total = (unitSpecs || []).reduce(function (sum, spec) { return sum + Math.max(0, Math.floor(Number(spec && spec.troops) || 0)); }, 0);
    if (total < S.Config.MIN_ATTACK_FORCE) return fail("Army総兵力は最低" + S.Config.MIN_ATTACK_FORCE + "必要です");
    var deployed = A.deploy(state, castleId, unitSpecs, options);
    if (!deployed.ok) return deployed;
    var marched = A.startMarch(state, deployed.stateChanges.armyId, destinationCastleId, { maxHops: options.maxHops || 3, route: options.route });
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
    var actions = [], ids = Object.keys(state.armies || {}).sort();
    for (var i = 0; i < ids.length; i += 1) {
      var armyId = ids[i], army = A.get(state, armyId);
      if (!army) continue;
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
        continue;
      }
      army.currentLocation = { castleId: army.destinationCastleId };
      army.status = "arrived";
      var arrival = A.resolveArrivalLegacy(state, armyId, { random: options.random || Math.random, allowTactical: options.allowTactical !== false });
      actions.push({ type: "arrival", armyId: armyId, result: arrival, report: arrival.ok && arrival.stateChanges && arrival.stateChanges.report || null });
      // World processing pauses at the first player Tactical Battle. Remaining Armies wait until a later season.
      if (state.events && state.events.pendingTacticalBattle) break;
    }
    return { ok: actions.every(function (item) { return !item.result || item.result.ok; }), stateChanges: { actions: actions }, messages: [], errors: actions.reduce(function (errors, item) { return errors.concat(item.result && item.result.errors || []); }, []) };
  };

  A.arriveAndGarrison = A.disband;
})(window.Sengoku);
