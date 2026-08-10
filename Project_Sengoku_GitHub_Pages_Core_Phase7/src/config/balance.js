(function (S) {
  "use strict";
  S.Config.Balance = {
    maxCommands: 2,
    initialGold: 120,
    initialFood: 100,
    develop: { gold: 15 },
    recruit: { gold: 20, food: 10 },
    train: { food: 5 },
    scout: { gold: 10 },
    reward: { gold: 10 },
    cultivate: { gold: 12 },
    domestic: {
      minPopulation: 1500,
      populationPerIncome: 250,
      populationPerGuardTroop: 25,
      recruitmentPopulationDivisor: 50,
      populationPerRecruit: 1,
      taxPopulationDivisor: 2500,
      foodBasePerCastle: 3,
      foodPerAgriculture: 2,
      agricultureMax: 12,
      populationGrowthBase: 10,
      populationGrowthRate: 0.002,
      armyUpkeepGoldDivisor: 25,
      armyUpkeepFoodDivisor: 12,
      shortageMoraleGold: 4,
      shortageMoraleFood: 8
    },
    siege: {
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
    },
    seasonFoodPerCastle: 7,
    aiGrowthMin: 4,
    aiGrowthRange: 6,
    aiActionsMin: 1,
    aiActionsMax: 2,
    aiRecruitBase: 16,
    aiDevelopGain: 2,
    aiAttackThreshold: 1.05
  };
})(window.Sengoku);
