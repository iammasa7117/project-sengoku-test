(function (S) {
  "use strict";
  var D = S.Data.diplomacy = {
    statuses: ["neutral", "war", "ceasefire", "non_aggression", "alliance"],
    treatyStatuses: ["ceasefire", "non_aggression", "alliance"],
    statusLabels: { neutral: "中立", war: "戦争", ceasefire: "停戦", non_aggression: "不戦条約", alliance: "同盟" },
    proposalTypes: ["peace", "ceasefire", "non_aggression", "alliance", "extend", "aid", "reinforcement", "prisoner_exchange", "surrender", "vassalage", "release_vassal", "independence"],
    durations: { ceasefire: 4, non_aggression: 8, alliance: 8 },
    proposalLifetime: 2,
    declarationCooldown: 3,
    independenceCooldown: 8,
    maxConcurrentWars: 2,
    relationImprove: { gold: 12, score: 9, trust: 6, grievance: -5 },
    treatyBreak: { score: -24, trust: -28, grievance: 25, reputation: -12 },
    aid: { minimum: 10, scoreDivisor: 5, exhaustionDivisor: 12 },
    tribute: { goldRate: 0.10, foodRate: 0.08, minimumGold: 2, minimumFood: 2 },
    exhaustion: { battle: 5, defeat: 5, castleLoss: 9, longWar: 2, peaceRecovery: 4, ceasefireRecovery: 3, aidRecovery: 2, moralePenaltyMax: 0.08, recruitPenaltyMax: 0.18 },
    evaluation: { score: 0.34, trust: 0.22, grievance: -0.27, reputation: 0.15, powerRatio: 14, commonBorder: 4, commonEnemy: 9, exhaustion: 0.18, messengerPolitics: 0.16, brokenTreaties: -7, offeredResources: 0.08, randomRange: 8 },
    difficultyEvaluation: { easy: 6, normal: 0, hard: -6 },
    initialStatus: {
      owari_short: { "aotsuki|tokizawa": "war" },
      // TEMP CONTENT: Core system verification data.
      // Replace during Content Alpha.
      core_campaign: { "aotsuki|tokizawa": "war", "kurogane|yukishiro": "war" }
    }
  };
  D.pairKey = function (a, b) { return [a, b].sort().join("|"); };
  D.createState = function (scenarioId, factionIds) {
    var relations = {}, warExhaustion = {}, reputation = {}, initial = D.initialStatus[scenarioId] || {};
    factionIds.forEach(function (id) { warExhaustion[id] = 0; reputation[id] = 50; });
    factionIds.forEach(function (a, index) {
      factionIds.slice(index + 1).forEach(function (b) {
        var key = D.pairKey(a, b), status = initial[key] || "neutral";
        relations[key] = { factionAId: key.split("|")[0], factionBId: key.split("|")[1], status: status, score: status === "war" ? 15 : 50, trust: status === "war" ? 20 : 50, grievance: status === "war" ? 30 : 0, sinceTurn: 0, expiresTurn: null, lastActionTurn: -99, redeclareAfterTurn: status === "war" ? 0 : -99, brokenTreaties: 0 };
      });
    });
    return {
      relations: relations,
      proposals: [],
      history: [],
      warExhaustion: warExhaustion,
      reputation: reputation,
      vassalage: {},
      nextProposalId: 1,
      processedTurn: -1,
      stagnation: { seasons: 0, maximum: 0, lastBattleCount: 0, lastOwnership: "", lastMajorDiplomacyCount: 0, reevaluations: 0 }
    };
  };
})(window.Sengoku);
