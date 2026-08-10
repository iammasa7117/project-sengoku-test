(function (S) {
  "use strict";
  var R = S.Systems.Release = {};

  function difficulty(state) { return S.Data.getDifficulty(state.campaign.difficultyId); }
  function clamp(value, minimum, maximum) { return Math.max(minimum, Math.min(maximum, value)); }

  R.castleCounts = function (state) {
    var counts = {};
    Object.keys(state.factions || {}).forEach(function (id) { counts[id] = 0; });
    Object.keys(state.castles || {}).forEach(function (id) {
      var factionId = state.castles[id].factionId;
      if (Object.prototype.hasOwnProperty.call(counts, factionId)) counts[factionId] += 1;
    });
    return counts;
  };

  R.rankings = function (state) {
    var counts = R.castleCounts(state);
    return Object.keys(counts).filter(function (id) {
      return state.factions[id] && state.factions[id].alive;
    }).map(function (id) {
      return { factionId: id, castles: counts[id], power: S.Systems.Diplomacy.power(state, id) };
    }).sort(function (a, b) {
      if (b.castles !== a.castles) return b.castles - a.castles;
      return b.power - a.power;
    });
  };

  R.isDominant = function (state, factionId) {
    var ranking = R.rankings(state), current = ranking.find(function (item) { return item.factionId === factionId; });
    if (!current || current.castles < 4 || ranking.length < 2) return false;
    return current.castles >= Math.ceil(Object.keys(state.castles).length / 2) || current.castles >= ranking[1].castles + 3;
  };

  R.isTrailing = function (state, factionId) {
    var counts = R.castleCounts(state), alive = Object.keys(state.factions).filter(function (id) { return state.factions[id].alive; });
    if (!state.factions[factionId] || !state.factions[factionId].alive || !alive.length) return false;
    var values = alive.map(function (id) { return counts[id]; });
    var minimum = Math.min.apply(null, values), maximum = Math.max.apply(null, values);
    if (minimum === maximum) return false;
    return counts[factionId] <= 1 || counts[factionId] === minimum;
  };

  R.aiEconomyMultiplier = function (state, factionId) {
    var profile = difficulty(state), modifier = profile.aiEconomy;
    if (R.isDominant(state, factionId)) modifier *= profile.dominantEconomyModifier;
    else if (R.isTrailing(state, factionId)) modifier *= profile.trailingEconomyModifier;
    return clamp(modifier, 0.65, 1.45);
  };

  R.aiRecruitMultiplier = function (state, factionId) {
    var profile = difficulty(state), modifier = profile.aiRecruit;
    if (R.isDominant(state, factionId)) modifier *= profile.dominantRecruitModifier;
    else if (R.isTrailing(state, factionId)) modifier *= profile.trailingRecruitModifier;
    return clamp(modifier, 0.70, 1.45);
  };

  R.aiActionCount = function (state, factionId, random) {
    var rng = random || Math.random, profile = difficulty(state);
    var minimum = Number.isInteger(profile.aiActionsMin) ? profile.aiActionsMin : S.Config.Balance.aiActionsMin;
    var maximum = Number.isInteger(profile.aiActionsMax) ? profile.aiActionsMax : S.Config.Balance.aiActionsMax;
    var count = minimum + Math.floor(rng() * (maximum - minimum + 1));
    if (profile.extraActionChance > 0 && rng() < profile.extraActionChance) count += 1;
    if (R.isTrailing(state, factionId) && S.Systems.Diplomacy.warsFor(state, factionId).length) count = Math.max(count, 2);
    if (R.isDominant(state, factionId)) count = Math.min(count, 2);
    return clamp(count, 1, 3);
  };

  R.attackThreshold = function (state, factionId, targetFactionId) {
    var profile = difficulty(state), threshold = S.Config.Balance.aiAttackThreshold / profile.aiAttack;
    var wars = S.Systems.Diplomacy.warsFor(state, factionId);
    if (wars.indexOf(targetFactionId) >= 0) threshold -= 0.035;
    var stagnation = state.diplomacy && state.diplomacy.stagnation ? state.diplomacy.stagnation.seasons : 0;
    threshold -= Math.min(profile.stagnationThresholdReductionMax, stagnation * profile.stagnationThresholdReductionPerSeason);
    if (targetFactionId === state.campaign.playerFactionId && state.campaign.turn <= profile.openingProtectionTurns) threshold += profile.openingAttackThresholdBonus;
    if (R.isDominant(state, factionId)) threshold += 0.045;
    if (R.isTrailing(state, factionId)) threshold -= 0.035;
    var counts = R.castleCounts(state);
    if (counts[targetFactionId] === 1 && counts[factionId] >= 2) threshold -= 0.025;
    return clamp(threshold, profile.minimumAttackThreshold, 1.30);
  };

  R.commitRatio = function (state) {
    return difficulty(state).aiCommitRatio;
  };

  R.maxPlayerAttacksPerSeason = function (state) {
    return difficulty(state).maxPlayerAttacksPerSeason;
  };

  R.battleModifier = function (state, factionId, role, opponentFactionId) {
    var profile = difficulty(state), modifier = 1;
    if (role === "defender" && factionId === state.campaign.playerFactionId && opponentFactionId !== factionId && state.campaign.turn <= profile.openingProtectionTurns) modifier *= profile.openingDefenseModifier;
    if (role === "attacker" && R.isDominant(state, factionId)) modifier *= profile.dominantAttackModifier;
    if (role === "defender" && R.isTrailing(state, factionId)) modifier *= profile.trailingDefenseModifier;
    return modifier;
  };

  R.snapshot = function (state) {
    var profile = difficulty(state), rankings = R.rankings(state), counts = R.castleCounts(state);
    return {
      release: "core-v1.0-rc1",
      difficultyId: profile.id,
      turn: state.campaign.turn,
      openingProtectionRemaining: Math.max(0, profile.openingProtectionTurns - state.campaign.turn),
      stagnationSeasons: state.diplomacy.stagnation.seasons,
      rankings: rankings,
      playerCastles: counts[state.campaign.playerFactionId] || 0,
      dominantFactionId: rankings.length && R.isDominant(state, rankings[0].factionId) ? rankings[0].factionId : null,
      validation: R.validate(state)
    };
  };

  R.validate = function (state) {
    var profile = difficulty(state), errors = [];
    ["aiEconomy", "aiRecruit", "aiAttack", "aiBattle", "minimumAttackThreshold", "aiCommitRatio", "openingDefenseModifier"].forEach(function (key) {
      if (!Number.isFinite(profile[key]) || profile[key] <= 0) errors.push("難易度設定が不正です: " + key);
    });
    if (!Number.isInteger(profile.openingProtectionTurns) || profile.openingProtectionTurns < 0) errors.push("序盤保護期間が不正です");
    if (!Number.isInteger(profile.maxPlayerAttacksPerSeason) || profile.maxPlayerAttacksPerSeason < 1) errors.push("対プレイヤー攻撃上限が不正です");
    var rankings = R.rankings(state);
    if (rankings.some(function (item) { return !Number.isFinite(item.power) || item.castles < 0; })) errors.push("勢力評価が不正です");
    return { ok: errors.length === 0, errors: errors };
  };
})(window.Sengoku);
