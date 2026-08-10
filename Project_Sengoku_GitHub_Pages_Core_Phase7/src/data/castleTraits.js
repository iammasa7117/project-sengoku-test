(function (S) {
  "use strict";
  var profiles = {
    kiyosu: {
      type: "平城",
      title: "街道商都",
      icon: "商",
      description: "街道と城下町が栄え、金収入と内政に優れる。",
      tags: ["街道", "商都"],
      modifiers: { gold: 1.15, food: 1.00, populationGrowth: 1.08, siegeDefense: 0, march: 1.00 }
    },
    narumi: {
      type: "砦",
      title: "街道の関門",
      icon: "関",
      description: "狭い街道を押さえる砦。攻城側にとって厄介な関門となる。",
      tags: ["砦", "関門"],
      modifiers: { gold: 0.96, food: 1.00, populationGrowth: 0.98, siegeDefense: 7, march: 1.00 }
    },
    suemori: {
      type: "丘城",
      title: "高地要塞",
      icon: "高",
      description: "高地に築かれた守りの城。防備を活かした籠城に強い。",
      tags: ["高地", "要害"],
      modifiers: { gold: 1.00, food: 1.02, populationGrowth: 0.98, siegeDefense: 10, march: 0.95 }
    },
    atsuta: {
      type: "港城",
      title: "湊の交易地",
      icon: "港",
      description: "水運と市で富を集める港城。金と兵糧の双方を得やすい。",
      tags: ["港", "交易"],
      modifiers: { gold: 1.10, food: 1.10, populationGrowth: 1.04, siegeDefense: 2, march: 1.00 }
    },
    aonohara: {
      type: "平城",
      title: "沃野の城",
      icon: "農",
      description: "田畑に恵まれた城。兵糧生産に向く。",
      tags: ["農村", "平野"],
      modifiers: { gold: 0.98, food: 1.14, populationGrowth: 1.06, siegeDefense: 0, march: 1.05 }
    },
    tsukikage: {
      type: "山城",
      title: "山道の要衝",
      icon: "山",
      description: "山道を押さえる堅城。守りは強いが進軍には時間がかかる。",
      tags: ["山城", "要害"],
      modifiers: { gold: 0.94, food: 1.00, populationGrowth: 0.96, siegeDefense: 12, march: 0.85 }
    },
    akane: {
      type: "平城",
      title: "街道宿",
      icon: "道",
      description: "街道沿いの宿場を抱え、軍勢の通過と商いに向く。",
      tags: ["街道", "宿場"],
      modifiers: { gold: 1.08, food: 1.00, populationGrowth: 1.03, siegeDefense: 1, march: 1.12 }
    },
    shirakawa: {
      type: "山城",
      title: "白川の堅城",
      icon: "堅",
      description: "地形を活かした堅城。正面からの攻略には兵力を要する。",
      tags: ["山城", "堅城"],
      modifiers: { gold: 0.96, food: 1.02, populationGrowth: 0.97, siegeDefense: 13, march: 0.88 }
    },
    hakuro: {
      type: "砦",
      title: "白狼の監視所",
      icon: "見",
      description: "周囲を見渡す砦。守備に適する。",
      tags: ["砦", "監視"],
      modifiers: { gold: 0.95, food: 1.00, populationGrowth: 0.98, siegeDefense: 8, march: 1.02 }
    },
    kurogane: {
      type: "平城",
      title: "鍛冶の城下",
      icon: "鉄",
      description: "職人が集う城下。金収入と軍備の維持に強い。",
      tags: ["鍛冶", "商業"],
      modifiers: { gold: 1.11, food: 0.98, populationGrowth: 1.02, siegeDefense: 5, march: 1.00 }
    },
    iwato: {
      type: "山城",
      title: "岩山の砦",
      icon: "岩",
      description: "岩山に守られた天然の要害。",
      tags: ["山城", "岩山"],
      modifiers: { gold: 0.93, food: 1.00, populationGrowth: 0.95, siegeDefense: 14, march: 0.82 }
    },
    yamashiro: {
      type: "丘城",
      title: "峠の城",
      icon: "峠",
      description: "複数の道が交わる峠を押さえ、軍勢移動に価値がある。",
      tags: ["峠", "街道"],
      modifiers: { gold: 1.02, food: 1.00, populationGrowth: 1.00, siegeDefense: 6, march: 1.08 }
    }
  };
  var fallback = {
    type: "城",
    title: "地方拠点",
    icon: "城",
    description: "領国を支える標準的な城。",
    tags: [],
    modifiers: { gold: 1, food: 1, populationGrowth: 1, siegeDefense: 0, march: 1 }
  };
  S.Data.castleProfiles = profiles;
  S.Data.getCastleProfile = function (castleOrId) {
    var id = typeof castleOrId === "string" ? castleOrId : castleOrId && castleOrId.id;
    return profiles[id] || fallback;
  };
})(window.Sengoku);
