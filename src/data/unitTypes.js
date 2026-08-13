(function (S) {
  "use strict";
  var types = {
    ashigaru: { id: "ashigaru", name: "足軽", tacticalKey: "ashigaru", defaultMaxTroops: 1000 },
    samurai: { id: "samurai", name: "侍", tacticalKey: "samurai", defaultMaxTroops: 900 },
    teppo: { id: "teppo", name: "鉄砲", tacticalKey: "teppo", defaultMaxTroops: 600 },
    kiba: { id: "kiba", name: "騎馬", tacticalKey: "kiba", defaultMaxTroops: 800 }
  };
  S.Data.unitTypes = Object.freeze(types);
  S.Data.getUnitType = function (id) { return S.Data.unitTypes[id] || null; };
})(window.Sengoku);
