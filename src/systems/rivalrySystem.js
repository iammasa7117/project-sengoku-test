(function (S) {
  "use strict";
  var R = S.Systems.Rivalry = {};
  R.key = function (playerId, enemyId) { return playerId + ">" + enemyId; };
  R.get = function (state, playerId, enemyId, create) {
    var key = R.key(playerId, enemyId), item = state.rivalries[key];
    if (!item && create) {
      item = state.rivalries[key] = { playerId: playerId, enemyId: enemyId, encounters: 0, playerWins: 0, enemyWins: 0, respect: 0, resentment: 0, vengeance: 0, status: "active", treatment: null, memories: [] };
    }
    return item || null;
  };
  R.label = function (item) {
    if (!item) return "因縁なし";
    if (item.status === "allied") return "旧敵の盟約";
    if (item.resentment >= 38 && item.respect >= 24) return "宿命の敵";
    if (item.resentment >= 30) return "仇敵";
    if (item.respect >= 32) return "敬敵";
    if (item.encounters >= 2) return "宿敵";
    return "因縁";
  };
  R.recordBattle = function (state, playerId, enemyId, playerWon) {
    var item = R.get(state, playerId, enemyId, true);
    item.encounters += 1;
    if (playerWon) item.playerWins += 1; else item.enemyWins += 1;
    item.respect = S.Util.clamp(item.respect + (playerWon ? 7 : 4), 0, 100);
    item.resentment = S.Util.clamp(item.resentment + (playerWon ? 3 : 1), 0, 100);
    var player = state.officers[playerId], enemy = state.officers[enemyId];
    var text = playerWon ? player.name + "は" + enemy.name + "との対決に勝利した。" : enemy.name + "は" + player.name + "の軍を退けた。";
    var memory = { date: S.Systems.Turn.dateLabel(state), text: text, type: "battle" };
    item.memories.push(memory);
    state.events.rivalEvents.push({ date: memory.date, player: player.name, enemy: enemy.name, text: text });
    return item;
  };
  R.treat = function (state, playerId, enemyId, treatment) {
    var item = R.get(state, playerId, enemyId, true), enemy = state.officers[enemyId];
    if (!enemy || enemy.status !== "prisoner") return { ok: false, errors: ["対象は捕虜ではありません"] };
    item.treatment = treatment;
    if (treatment === "honor") {
      item.respect = S.Util.clamp(item.respect + 18, 0, 100);
      state.meta.houseHonor = S.Util.clamp(state.meta.houseHonor + 8, 0, 100);
      return S.Systems.Prisoner.release(state, enemyId, "名誉ある解放");
    }
    if (treatment === "humiliate") {
      item.resentment = S.Util.clamp(item.resentment + 25, 0, 100);
      item.vengeance += 2;
      return S.Systems.Prisoner.release(state, enemyId, "屈辱を与えて解放");
    }
    if (treatment === "oath") {
      var result = S.Systems.Prisoner.recruit(state, enemyId, playerId, true);
      if (result.ok) item.status = "allied";
      return result;
    }
    return { ok: false, errors: ["不明な因縁処遇です"] };
  };
})(window.Sengoku);
