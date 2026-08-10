(function (S) {
  "use strict";
  var R = S.Systems.Relationship = {};
  R.key = function (a, b) { return [a, b].sort().join("|"); };
  R.value = function (state, a, b) { return (state.relationships.officers[R.key(a, b)] || 0); };
  R.label = function (value) { return value >= 35 ? "盟友" : value >= 20 ? "認め合う" : value >= 8 ? "不信" : value >= 0 ? "距離がある" : "反目"; };
  R.change = function (state, a, b, amount, memory) {
    var key = R.key(a, b);
    state.relationships.officers[key] = S.Util.clamp((state.relationships.officers[key] || 0) + amount, -100, 100);
    if (memory) {
      S.Systems.Officer.remember(state, a, memory, true);
      S.Systems.Officer.remember(state, b, memory, true);
    }
    return { ok: true, stateChanges: { relation: state.relationships.officers[key] }, messages: [], errors: [] };
  };
})(window.Sengoku);
