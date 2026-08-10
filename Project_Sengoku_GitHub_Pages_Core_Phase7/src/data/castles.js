(function (S) {
  "use strict";
  S.Data.castles = [
    { id: "kiyosu", name: "清洲城", factionId: "aotsuki", troops: 72, income: 16, defense: 1, morale: 72, x: 20, y: 58, neighbors: ["narumi", "suemori", "aonohara"], governorId: "keiketsu" },
    { id: "narumi", name: "鳴海砦", factionId: "tokizawa", troops: 58, income: 10, defense: 1, morale: 62, x: 43, y: 48, neighbors: ["kiyosu", "suemori", "atsuta", "akane"], governorId: "hiyori" },
    { id: "suemori", name: "末森城", factionId: "tokizawa", troops: 82, income: 15, defense: 2, morale: 76, x: 68, y: 27, neighbors: ["kiyosu", "narumi", "atsuta", "shirakawa"], governorId: "takama" },
    { id: "atsuta", name: "熱田城", factionId: "yukishiro", troops: 68, income: 14, defense: 1, morale: 70, x: 72, y: 70, neighbors: ["narumi", "suemori", "hakuro"], governorId: "yukishiro" },
    // TEMP CONTENT: Core system verification data.
    // Replace during Content Alpha.
    { id: "aonohara", name: "青野原城（仮）", factionId: "aotsuki", troops: 61, income: 12, defense: 1, morale: 68, x: 8, y: 25, neighbors: ["kiyosu", "tsukikage", "iwato"], governorId: "soma" },
    { id: "tsukikage", name: "月影城（仮）", factionId: "aotsuki", troops: 64, income: 13, defense: 2, morale: 70, x: 27, y: 10, neighbors: ["aonohara", "akane", "yamashiro"], governorId: "aotsuki_temp_4" },
    { id: "akane", name: "茜城（仮）", factionId: "tokizawa", troops: 66, income: 13, defense: 1, morale: 70, x: 52, y: 10, neighbors: ["narumi", "tsukikage", "kurogane"], governorId: "tokizawa_temp_3" },
    { id: "shirakawa", name: "白川城（仮）", factionId: "yukishiro", troops: 63, income: 14, defense: 1, morale: 72, x: 90, y: 18, neighbors: ["suemori", "hakuro", "kurogane"], governorId: "yukishiro_temp_2" },
    { id: "hakuro", name: "白狼砦（仮）", factionId: "yukishiro", troops: 60, income: 11, defense: 2, morale: 69, x: 94, y: 58, neighbors: ["atsuta", "shirakawa", "iwato"], governorId: "yukishiro_temp_3" },
    { id: "kurogane", name: "黒鉄城（仮）", factionId: "kurogane", troops: 70, income: 14, defense: 2, morale: 74, x: 72, y: 48, neighbors: ["akane", "shirakawa", "yamashiro"], governorId: "kurogane_temp_1" },
    { id: "iwato", name: "岩戸城（仮）", factionId: "kurogane", troops: 62, income: 12, defense: 2, morale: 71, x: 35, y: 88, neighbors: ["aonohara", "hakuro", "yamashiro"], governorId: "kurogane_temp_2" },
    { id: "yamashiro", name: "山代城（仮）", factionId: "kurogane", troops: 65, income: 13, defense: 1, morale: 70, x: 60, y: 88, neighbors: ["tsukikage", "kurogane", "iwato"], governorId: "kurogane_temp_3" }
  ];
})(window.Sengoku);
