(function (S) {
  "use strict";
  S.Data.difficulties = [
    {
      id: "easy", name: "易しい",
      description: "初期資源+25%、自軍兵力+15%、自軍合戦+10%。AIは成長と攻勢が控えめで、序盤4季は防衛支援があります。",
      playerResource: 1.25, playerTroops: 1.15, playerBattle: 1.10,
      aiEconomy: 0.84, aiRecruit: 0.88, aiAttack: 0.90, aiBattle: 0.90,
      aiActionsMin: 1, aiActionsMax: 2, extraActionChance: 0, aiCommitRatio: 0.65,
      openingProtectionTurns: 4, openingDefenseModifier: 1.08, openingAttackThresholdBonus: 0.12, maxPlayerAttacksPerSeason: 1,
      minimumAttackThreshold: 0.93, stagnationThresholdReductionPerSeason: 0.008, stagnationThresholdReductionMax: 0.08,
      dominantEconomyModifier: 0.90, dominantRecruitModifier: 0.92, dominantAttackModifier: 0.97,
      trailingEconomyModifier: 1.08, trailingRecruitModifier: 1.12, trailingDefenseModifier: 1.04
    },
    {
      id: "normal", name: "普通",
      description: "標準補正。序盤2季は小さな防衛支援があり、停滞時はAIが段階的に攻勢判断を強めます。",
      playerResource: 1.00, playerTroops: 1.00, playerBattle: 1.00,
      aiEconomy: 1.00, aiRecruit: 1.00, aiAttack: 1.00, aiBattle: 1.00,
      aiActionsMin: 1, aiActionsMax: 2, extraActionChance: 0.08, aiCommitRatio: 0.68,
      openingProtectionTurns: 2, openingDefenseModifier: 1.04, openingAttackThresholdBonus: 0.06, maxPlayerAttacksPerSeason: 2,
      minimumAttackThreshold: 0.90, stagnationThresholdReductionPerSeason: 0.010, stagnationThresholdReductionMax: 0.10,
      dominantEconomyModifier: 0.93, dominantRecruitModifier: 0.95, dominantAttackModifier: 0.97,
      trailingEconomyModifier: 1.06, trailingRecruitModifier: 1.10, trailingDefenseModifier: 1.03
    },
    {
      id: "hard", name: "難しい",
      description: "初期資源-12%、自軍兵力-8%、自軍合戦-5%。AIは経済・徴兵・攻勢に優れ、序盤保護はありません。",
      playerResource: 0.88, playerTroops: 0.92, playerBattle: 0.95,
      aiEconomy: 1.16, aiRecruit: 1.13, aiAttack: 1.10, aiBattle: 1.08,
      aiActionsMin: 1, aiActionsMax: 2, extraActionChance: 0.35, aiCommitRatio: 0.72,
      openingProtectionTurns: 0, openingDefenseModifier: 1.00, openingAttackThresholdBonus: 0, maxPlayerAttacksPerSeason: 3,
      minimumAttackThreshold: 0.86, stagnationThresholdReductionPerSeason: 0.012, stagnationThresholdReductionMax: 0.12,
      dominantEconomyModifier: 0.95, dominantRecruitModifier: 0.97, dominantAttackModifier: 0.98,
      trailingEconomyModifier: 1.04, trailingRecruitModifier: 1.07, trailingDefenseModifier: 1.02
    }
  ];
  S.Data.getDifficulty = function (id) { return S.Data.difficulties.find(function (item) { return item.id === id; }) || S.Data.difficulties[1]; };
})(window.Sengoku);
