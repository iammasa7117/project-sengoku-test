(function (S) {
  "use strict";
  function officer(id, name, factionId, castleId, role, age, traits, quote, leadership, might, intellect, politics, loyalty, ambition, trust) {
    return {
      id: id, name: name, factionId: factionId, castleId: castleId, role: role, age: age,
      traits: traits, quote: quote,
      stats: { leadership: leadership, might: might, intellect: intellect, politics: politics },
      loyalty: loyalty, ambition: ambition, lordTrust: trust,
      health: 100, fatigue: 0, exp: 0, level: 1, merit: 0, seasonMerit: 0,
      status: "active", injury: null, grievance: 0, neglect: 0, promise: null,
      assignment: { type: "idle", castleId: castleId, armyId: null },
      history: [], loyaltyHistory: [], battles: 0, rescues: 0,
      extension: { personality: [], relationships: [], storyFlags: {} }
    };
  }
  S.Data.officers = [
    officer("keiketsu", "蒼月景継", "aotsuki", "kiyosu", "総大将候補", 28, ["忠義", "慎重"], "焦りは敗北を招きます。まず、生き残る策を。", 82, 72, 68, 74, 92, 24, 88),
    officer("soma", "朝霧宗真", "aotsuki", "kiyosu", "軍師・内政官", 24, ["策略家", "野心家"], "敵の弱みが見えるなら、使わない理由はありません。", 59, 51, 89, 84, 74, 82, 62),
    officer("kanenobu", "九曜兼信", "aotsuki", "kiyosu", "先陣・猛将", 21, ["勇敢", "短気"], "敵がいるなら攻める。それだけだ。", 70, 91, 47, 42, 81, 58, 72),
    officer("hiyori", "火守兼定", "tokizawa", "narumi", "鳴海守将", 30, ["剛直", "忠義"], "砦を預かった以上、退く道はない。", 71, 84, 57, 48, 78, 46, 68),
    officer("takama", "朱鷺沢隆真", "tokizawa", "suemori", "朱鷺沢家当主", 37, ["威厳", "冷酷"], "弱き家は、強き家の礎となればよい。", 87, 79, 73, 68, 100, 90, 95),
    officer("yukishiro", "雪代景秋", "yukishiro", "atsuta", "雪代家当主", 33, ["慎重", "慈悲"], "戦わず守れる民がいるなら、それに越したことはない。", 80, 68, 84, 78, 100, 38, 84),
    // TEMP CONTENT: Core system verification data.
    // Replace during Content Alpha.
    officer("aotsuki_temp_4", "蒼月家仮武将四", "aotsuki", "tsukikage", "検証用武将", 26, ["仮武将"], "長期戦役の仕組みを確かめます。", 66, 64, 61, 67, 76, 45, 65),
    officer("tokizawa_temp_3", "朱鷺沢家仮武将三", "tokizawa", "akane", "検証用武将", 29, ["仮武将"], "長期戦役の仕組みを確かめます。", 69, 70, 58, 60, 79, 52, 64),
    officer("tokizawa_temp_4", "朱鷺沢家仮武将四", "tokizawa", "narumi", "検証用武将", 25, ["仮武将"], "長期戦役の仕組みを確かめます。", 63, 67, 65, 62, 75, 48, 63),
    officer("yukishiro_temp_2", "雪代家仮武将二", "yukishiro", "shirakawa", "検証用武将", 31, ["仮武将"], "長期戦役の仕組みを確かめます。", 68, 62, 72, 70, 82, 40, 70),
    officer("yukishiro_temp_3", "雪代家仮武将三", "yukishiro", "hakuro", "検証用武将", 27, ["仮武将"], "長期戦役の仕組みを確かめます。", 65, 71, 63, 66, 78, 44, 67),
    officer("yukishiro_temp_4", "雪代家仮武将四", "yukishiro", "atsuta", "検証用武将", 24, ["仮武将"], "長期戦役の仕組みを確かめます。", 62, 60, 70, 73, 77, 46, 65),
    officer("kurogane_temp_1", "黒鉄家仮武将一", "kurogane", "kurogane", "検証用当主", 35, ["仮武将"], "長期戦役の仕組みを確かめます。", 78, 76, 65, 64, 100, 70, 82),
    officer("kurogane_temp_2", "黒鉄家仮武将二", "kurogane", "iwato", "検証用武将", 30, ["仮武将"], "長期戦役の仕組みを確かめます。", 70, 72, 61, 59, 81, 55, 68),
    officer("kurogane_temp_3", "黒鉄家仮武将三", "kurogane", "yamashiro", "検証用武将", 28, ["仮武将"], "長期戦役の仕組みを確かめます。", 67, 66, 72, 68, 79, 50, 67),
    officer("kurogane_temp_4", "黒鉄家仮武将四", "kurogane", "kurogane", "検証用武将", 23, ["仮武将"], "長期戦役の仕組みを確かめます。", 64, 73, 60, 62, 76, 58, 62)
  ];
  S.Data.goals = {
    keiketsu: { title: "守るための勝利", text: "損害12以下で合戦に勝利する。", target: 1, reward: "守護者" },
    soma: { title: "策で城を落とす", text: "偵察後に夜襲で敵城を攻略する。", target: 2, reward: "慧眼" },
    kanenobu: { title: "先陣の証明", text: "強襲で合戦に勝利する。", target: 1, reward: "先駆け" },
    hiyori: { title: "敗北からの再起", text: "新たな主家で功績を立てる。", target: 1, reward: "再起" }
  };
})(window.Sengoku);
