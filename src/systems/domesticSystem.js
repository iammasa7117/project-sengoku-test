(function (S) {
  "use strict";
  var D = S.Systems.Domestic = {};

  function cfg() { return S.Config.Balance.domestic; }
  function validate(state, castleId, officerId) {
    var castle = state.castles[castleId], officer = state.officers[officerId];
    if (!castle || castle.factionId !== state.campaign.playerFactionId) return "自勢力の城を選択してください";
    if (!officer || officer.status !== "active" || officer.factionId !== state.campaign.playerFactionId || officer.castleId !== castleId) return "この城で命令できる武将ではありません";
    if (officer.assignment && officer.assignment.type === "army") return "出陣中の武将は内政命令を実行できません";
    if (state.campaign.commands <= 0) return "命令回数がありません";
    return null;
  }
  function done(state, officer, message, changes) {
    state.campaign.commands -= 1;
    officer.exp += 10;
    officer.fatigue = Math.min(100, officer.fatigue + 10);
    S.Systems.Officer.gainMerit(state, officer.id, 7, message);
    S.Systems.Event.addLog(state, message, "good");
    return { ok: true, stateChanges: Object.assign({ commands: state.campaign.commands }, changes || {}), messages: [message], chronicleEntries: [], errors: [] };
  }
  function accountFor(state, factionId) {
    if (factionId === state.campaign.playerFactionId) return state.campaign;
    return state.factions[factionId];
  }
  function castlesFor(state, factionId) {
    return Object.keys(state.castles).map(function (id) { return state.castles[id]; }).filter(function (castle) { return castle.factionId === factionId; });
  }
  function activeArmiesFor(state, factionId) {
    return Object.keys(state.armies || {}).map(function (id) { return state.armies[id]; }).filter(function (army) { return army && army.factionId === factionId && army.status !== "disbanded"; });
  }


  D.castleProfile = function (castle) {
    return S.Data.getCastleProfile ? S.Data.getCastleProfile(castle) : { type: "城", title: "地方拠点", icon: "城", description: "", tags: [], modifiers: { gold: 1, food: 1, populationGrowth: 1, siegeDefense: 0, march: 1 } };
  };
  D.assignmentEffects = function (state, castle) {
    var governor = castle && castle.governorId ? state.officers[castle.governorId] : null;
    var domesticOfficer = castle && S.Systems.Officer.domesticOfficerAt ? S.Systems.Officer.domesticOfficerAt(state, castle.id) : null;
    var governorPolitics = governor && governor.stats ? governor.stats.politics : 0;
    var governorLeadership = governor && governor.stats ? governor.stats.leadership : 0;
    var domesticPolitics = domesticOfficer && domesticOfficer.stats ? domesticOfficer.stats.politics : 0;
    return {
      governorId: governor && governor.id || null,
      domesticOfficerId: domesticOfficer && domesticOfficer.id || null,
      goldMultiplier: Math.min(1.30, 1 + governorPolitics * 0.00045 + domesticPolitics * 0.00145),
      foodMultiplier: Math.min(1.20, 1 + governorPolitics * 0.00020 + domesticPolitics * 0.00075),
      populationMultiplier: Math.min(1.18, 1 + governorPolitics * 0.00025 + domesticPolitics * 0.00070),
      defenseBonus: Math.max(0, Math.round(governorLeadership / 18))
    };
  };
  D.effectiveGoldYieldForCastle = function (state, castle) {
    var base = D.goldYieldForCastle(castle), profile = D.castleProfile(castle), assignments = D.assignmentEffects(state, castle);
    return Math.max(0, Math.round(base * (profile.modifiers.gold || 1) * assignments.goldMultiplier));
  };
  D.effectiveFoodYieldForCastle = function (state, castle) {
    var base = D.foodYieldForCastle(castle), profile = D.castleProfile(castle), assignments = D.assignmentEffects(state, castle);
    return Math.max(0, Math.round(base * (profile.modifiers.food || 1) * assignments.foodMultiplier));
  };
  D.populationGrowthForCastle = function (state, castle) {
    var profile = D.castleProfile(castle), assignments = D.assignmentEffects(state, castle);
    var base = cfg().populationGrowthBase + Math.floor(castle.population * cfg().populationGrowthRate);
    return Math.max(0, Math.round(base * (profile.modifiers.populationGrowth || 1) * assignments.populationMultiplier));
  };

  D.defaultPopulation = function (castle) {
    var c = cfg(), guard = Number.isFinite(castle.guardTroops) ? castle.guardTroops : castle.troops;
    return Math.max(c.minPopulation, Math.floor((castle.income || 0) * c.populationPerIncome + Math.max(0, guard || 0) * c.populationPerGuardTroop));
  };
  D.defaultAgriculture = function (castle) {
    return Math.max(1, Math.min(cfg().agricultureMax, Math.floor((castle.income || 0) / 4)));
  };
  D.recruitmentCapacity = function (castle) {
    var population = Math.max(0, Math.floor(Number(castle.population) || 0));
    return Math.max(S.Config.MIN_GARRISON, Math.floor(population / cfg().recruitmentPopulationDivisor));
  };
  D.recruitmentRoom = function (castle) {
    var guard = Number.isFinite(castle.guardTroops) ? castle.guardTroops : castle.troops;
    return Math.max(0, D.recruitmentCapacity(castle) - Math.max(0, guard || 0));
  };
  D.goldYieldForCastle = function (castle) {
    return Math.max(0, Math.floor(castle.income || 0)) + Math.floor(Math.max(0, castle.population || 0) / cfg().taxPopulationDivisor);
  };
  D.foodYieldForCastle = function (castle) {
    return cfg().foodBasePerCastle + Math.max(0, Math.floor(castle.agriculture || 0)) * cfg().foodPerAgriculture;
  };
  D.upkeepForArmy = function (state, armyOrId) {
    var army = typeof armyOrId === "string" ? S.Systems.Army.get(state, armyOrId) : armyOrId;
    if (!army || army.status === "disbanded") return { gold: 0, food: 0, troops: 0 };
    var troops = S.Systems.Army.totalTroops(state, army), c = cfg();
    return { troops: troops, gold: troops > 0 ? Math.ceil(troops / c.armyUpkeepGoldDivisor) : 0, food: troops > 0 ? Math.ceil(troops / c.armyUpkeepFoodDivisor) : 0 };
  };
  D.armyUpkeepForFaction = function (state, factionId) {
    return activeArmiesFor(state, factionId).reduce(function (total, army) {
      var cost = D.upkeepForArmy(state, army);
      total.gold += cost.gold; total.food += cost.food; total.troops += cost.troops; total.armies += 1;
      return total;
    }, { gold: 0, food: 0, troops: 0, armies: 0 });
  };
  D.seasonYieldForFaction = function (state, factionId, economyModifier) {
    var modifier = Number.isFinite(economyModifier) ? economyModifier : 1, castles = castlesFor(state, factionId);
    return {
      gold: Math.max(0, Math.round(castles.reduce(function (sum, castle) { return sum + D.effectiveGoldYieldForCastle(state, castle); }, 0) * modifier)),
      food: Math.max(0, Math.round(castles.reduce(function (sum, castle) { return sum + D.effectiveFoodYieldForCastle(state, castle); }, 0) * modifier)),
      castles: castles.length
    };
  };
  D.processFactionSeasonEconomy = function (state, factionId, options) {
    options = options || {};
    var account = accountFor(state, factionId);
    if (!account) return { ok: false, errors: ["勢力資源が見つかりません"] };
    var yieldValue = D.seasonYieldForFaction(state, factionId, options.economyModifier), upkeep = D.armyUpkeepForFaction(state, factionId);
    account.gold += yieldValue.gold;
    account.food += yieldValue.food;
    var goldPaid = Math.min(account.gold, upkeep.gold), foodPaid = Math.min(account.food, upkeep.food);
    account.gold -= goldPaid; account.food -= foodPaid;
    var shortageGold = upkeep.gold - goldPaid, shortageFood = upkeep.food - foodPaid;
    if (shortageGold > 0 || shortageFood > 0) {
      var penalty = (shortageGold > 0 ? cfg().shortageMoraleGold : 0) + (shortageFood > 0 ? cfg().shortageMoraleFood : 0);
      activeArmiesFor(state, factionId).forEach(function (army) {
        (army.unitIds || []).forEach(function (unitId) {
          var unit = S.Systems.Unit.get(state, unitId);
          if (unit && unit.status !== "destroyed") unit.morale = Math.max(0, unit.morale - penalty);
        });
      });
      if (factionId === state.campaign.playerFactionId && S.Systems.Event) S.Systems.Event.addLog(state, "遠征軍の維持物資が不足し、軍勢の士気が低下しました。", "bad");
    }
    castlesFor(state, factionId).forEach(function (castle) {
      var growth = D.populationGrowthForCastle(state, castle);
      castle.population = Math.max(0, Math.floor(castle.population + growth));
    });
    return { ok: true, stateChanges: { factionId: factionId, income: yieldValue, upkeep: upkeep, paid: { gold: goldPaid, food: foodPaid }, shortage: { gold: shortageGold, food: shortageFood }, resources: { gold: account.gold, food: account.food } }, messages: [], errors: [] };
  };
  D.processSeasonEconomy = function (state, options) {
    options = options || {};
    var difficulty = options.difficulty || S.Data.getDifficulty(state.campaign.difficultyId), results = [];
    Object.keys(state.factions).forEach(function (factionId) {
      if (!state.factions[factionId].alive) return;
      var modifier = factionId === state.campaign.playerFactionId ? 1 : (S.Systems.Release ? S.Systems.Release.aiEconomyMultiplier(state, factionId) : difficulty.aiEconomy);
      var result = D.processFactionSeasonEconomy(state, factionId, { economyModifier: modifier });
      results.push(result.stateChanges);
    });
    return { ok: true, stateChanges: { factions: results }, messages: [], errors: [] };
  };

  D.executeDevelopment = function (state, castleId, officerId) {
    var error = validate(state, castleId, officerId), castle = state.castles[castleId], officer = state.officers[officerId];
    if (error) return { ok: false, errors: [error] };
    if (state.campaign.gold < S.Config.Balance.develop.gold) return { ok: false, errors: ["金が不足しています"] };
    var roleBoost = S.Systems.Officer.assignment(officer).type === "domestic" ? 1 : 0;
    var gain = 2 + Math.floor(officer.stats.politics / 35) + roleBoost, populationGain = 15 + Math.floor(officer.stats.politics / 3) + roleBoost * 8;
    state.campaign.gold -= S.Config.Balance.develop.gold;
    castle.income += gain; castle.population += populationGain;
    return done(state, officer, officer.name + "が" + castle.name + "の町を整え、収入が" + gain + "、人口が" + populationGain + "増加しました。", { income: castle.income, population: castle.population, gold: state.campaign.gold });
  };
  D.executeCultivation = function (state, castleId, officerId) {
    var error = validate(state, castleId, officerId), castle = state.castles[castleId], officer = state.officers[officerId];
    if (error) return { ok: false, errors: [error] };
    if (state.campaign.gold < S.Config.Balance.cultivate.gold) return { ok: false, errors: ["金が不足しています"] };
    if (castle.agriculture >= cfg().agricultureMax) return { ok: false, errors: ["農業はこれ以上開発できません"] };
    var roleBoost = S.Systems.Officer.assignment(officer).type === "domestic" ? 10 : 0;
    var populationGain = 20 + Math.floor(officer.stats.politics / 4) + roleBoost;
    state.campaign.gold -= S.Config.Balance.cultivate.gold;
    castle.agriculture = Math.min(cfg().agricultureMax, castle.agriculture + 1);
    castle.population += populationGain;
    return done(state, officer, officer.name + "が" + castle.name + "で開墾を進め、農業が1、人口が" + populationGain + "増加しました。", { agriculture: castle.agriculture, population: castle.population, gold: state.campaign.gold, foodYield: D.foodYieldForCastle(castle) });
  };
  D.executeRecruitment = function (state, castleId, officerId) {
    var error = validate(state, castleId, officerId), castle = state.castles[castleId], officer = state.officers[officerId];
    if (error) return { ok: false, errors: [error] };
    if (state.campaign.gold < S.Config.Balance.recruit.gold || state.campaign.food < S.Config.Balance.recruit.food) return { ok: false, errors: ["金または兵糧が不足しています"] };
    var room = D.recruitmentRoom(castle);
    if (room <= 0) return { ok: false, errors: ["人口に対して守備兵が上限に達しています。町を発展させて人口を増やしてください"] };
    var exhaustion = state.diplomacy.warExhaustion[state.campaign.playerFactionId] || 0;
    var requested = Math.max(1, Math.round((18 + Math.floor(officer.stats.leadership / 12)) * (1 - exhaustion / 100 * S.Data.diplomacy.exhaustion.recruitPenaltyMax)));
    var populationLimit = Math.floor(castle.population / cfg().populationPerRecruit), gain = Math.min(requested, room, populationLimit);
    if (gain <= 0) return { ok: false, errors: ["徴兵できる人口がありません"] };
    state.campaign.gold -= S.Config.Balance.recruit.gold;
    state.campaign.food -= S.Config.Balance.recruit.food;
    castle.population = Math.max(0, castle.population - gain * cfg().populationPerRecruit);
    S.Systems.Unit.changeGuardTroops(state, castle, gain);
    return done(state, officer, officer.name + "が" + castle.name + "で" + gain + "の兵を集めました。人口から兵へ編成されています。", { troops: castle.troops, population: castle.population, recruitmentCapacity: D.recruitmentCapacity(castle) });
  };
  D.executeTraining = function (state, castleId, officerId) {
    var error = validate(state, castleId, officerId), castle = state.castles[castleId], officer = state.officers[officerId];
    if (error) return { ok: false, errors: [error] };
    if (state.campaign.food < S.Config.Balance.train.food) return { ok: false, errors: ["兵糧が不足しています"] };
    var gain = 12 + Math.floor(officer.stats.leadership / 25);
    state.campaign.food -= S.Config.Balance.train.food;
    castle.morale = Math.min(100, castle.morale + gain);
    return done(state, officer, officer.name + "が兵を鍛え、士気が" + gain + "上昇しました。", { morale: castle.morale });
  };
  D.executeRest = function (state, castleId, officerId) {
    var error = validate(state, castleId, officerId), officer = state.officers[officerId];
    if (error) return { ok: false, errors: [error] };
    var result = S.Systems.Officer.rest(state, officerId);
    if (!result.ok) return result;
    state.campaign.commands -= 1;
    S.Systems.Event.addLog(state, officer.name + "が休養しました。", "good");
    return { ok: true, stateChanges: result.stateChanges, messages: [officer.name + "が休養しました。"], errors: [] };
  };
  D.executeScout = function (state, sourceId, targetId, officerId) {
    var error = validate(state, sourceId, officerId), source = state.castles[sourceId], target = state.castles[targetId], officer = state.officers[officerId];
    if (error) return { ok: false, errors: [error] };
    if (!target || source.neighbors.indexOf(targetId) < 0 || target.factionId === state.campaign.playerFactionId) return { ok: false, errors: ["隣接する敵城を選んでください"] };
    if (state.campaign.gold < S.Config.Balance.scout.gold) return { ok: false, errors: ["金が不足しています"] };
    state.campaign.gold -= S.Config.Balance.scout.gold;
    state.events.intel[targetId] = 3;
    if (officer.goal && officer.id === "soma") { officer.goal.flags.scouted = true; officer.goal.progress = Math.max(officer.goal.progress, 1); }
    return done(state, officer, officer.name + "が" + target.name + "の兵力を偵察しました。", { targetId: targetId });
  };
})(window.Sengoku);
