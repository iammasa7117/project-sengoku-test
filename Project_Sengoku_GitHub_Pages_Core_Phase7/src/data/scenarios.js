(function (S) {
  "use strict";
  var allCastles = ["kiyosu", "narumi", "suemori", "atsuta", "aonohara", "tsukikage", "akane", "shirakawa", "hakuro", "kurogane", "iwato", "yamashiro"];
  var allOfficers = ["keiketsu", "soma", "kanenobu", "hiyori", "takama", "yukishiro", "aotsuki_temp_4", "tokizawa_temp_3", "tokizawa_temp_4", "yukishiro_temp_2", "yukishiro_temp_3", "yukishiro_temp_4", "kurogane_temp_1", "kurogane_temp_2", "kurogane_temp_3", "kurogane_temp_4"];
  S.Data.scenarios = [
    {
      id: "owari_short", name: "尾張短期戦役", description: "Core v0.7の4城・3勢力短期戦役。既存の導入と初戦を維持します。", estimatedTime: "30〜60分",
      castleIds: ["kiyosu", "narumi", "suemori", "atsuta"], factionIds: ["aotsuki", "tokizawa", "yukishiro"], officerIds: ["keiketsu", "soma", "kanenobu", "hiyori", "takama", "yukishiro"],
      selectableFactionIds: ["aotsuki"], defaultPlayerFactionId: "aotsuki", defaultDifficultyId: "normal", victory: { type: "allCastles" }, opening: { type: "owari_first_battle", sourceId: "kiyosu", targetId: "narumi" }
    },
    {
      // TEMP CONTENT: Core system verification data.
      // Replace during Content Alpha.
      id: "core_campaign", name: "群雄キャンペーン（仮）", description: "12城・4勢力による長期システム検証キャンペーン。固定物語はありません。", estimatedTime: "2〜4時間",
      castleIds: allCastles, factionIds: ["aotsuki", "tokizawa", "yukishiro", "kurogane"], officerIds: allOfficers,
      selectableFactionIds: ["aotsuki", "tokizawa", "yukishiro", "kurogane"], defaultPlayerFactionId: "aotsuki", defaultDifficultyId: "normal", victory: { type: "allCastlesOrElimination" }, opening: { type: "none" },
      officerPlacements: { soma: "aonohara", kanenobu: "kiyosu", aotsuki_temp_4: "tsukikage", tokizawa_temp_4: "narumi", yukishiro_temp_4: "atsuta", kurogane_temp_4: "kurogane" }
    }
  ];
  S.Data.getScenario = function (id) { return S.Data.scenarios.find(function (item) { return item.id === id; }) || S.Data.scenarios[0]; };
})(window.Sengoku);
