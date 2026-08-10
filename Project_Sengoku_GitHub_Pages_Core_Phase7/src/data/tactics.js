(function (S) {
  "use strict";
  S.Data.tactics = [
    { id: "standard", name: "正攻法", power: 1, loss: 1, description: "統率を活かして正面から崩す。" },
    { id: "night", name: "夜襲", power: 1.08, loss: 0.8, description: "知略で守備の隙を突く。" },
    { id: "assault", name: "強襲", power: 1.16, loss: 1.25, description: "武力で短期決着を狙う。" }
  ];
  S.Data.battleDecisions = [
    { id: "trust", name: "大将の判断を貫く", power: 1.05, loss: 1, relation: 2 },
    { id: "counter", name: "副将の進言を採る", power: 1.02, loss: 0.9, relation: 4 },
    { id: "withdraw", name: "損害を抑えて戦う", power: 0.94, loss: 0.65, relation: 1 }
  ];
})(window.Sengoku);
