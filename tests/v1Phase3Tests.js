(function (S, T) {
  "use strict";
  function campaign(difficultyId, playerFactionId) {
    var state = S.State.createInitialState({ scenarioId: "core_campaign", playerFactionId: playerFactionId || "aotsuki", difficultyId: difficultyId || "normal" });
    state.campaign.status = "playing";
    state.events.engine.activeEvent = null;
    state.events.engine.queue = [];
    return state;
  }
  function shortState(difficultyId) {
    var state = S.State.createInitialState({ scenarioId: "owari_short", playerFactionId: "aotsuki", difficultyId: difficultyId || "normal" });
    state.campaign.status = "playing";
    state.events.engine.activeEvent = null;
    state.events.engine.queue = [];
    return state;
  }
  function sequence(values) { var index = 0; return function () { var value = values[index % values.length]; index += 1; return value; }; }
  function setDominant(state, factionId) {
    var ids = Object.keys(state.castles);
    ids.slice(0, 7).forEach(function (id) { state.castles[id].factionId = factionId; state.castles[id].governorId = null; });
  }

  T.test("v1 Phase 3: release balance system exists", function () {
    T.assert(S.Systems.Release && typeof S.Systems.Release.snapshot === "function");
  });
  T.test("v1 Phase 3: three difficulty profiles are complete", function () {
    T.equal(S.Data.difficulties.length, 3);
    S.Data.difficulties.forEach(function (item) {
      ["openingProtectionTurns", "openingDefenseModifier", "minimumAttackThreshold", "aiCommitRatio", "maxPlayerAttacksPerSeason"].forEach(function (key) { T.assert(Number.isFinite(item[key]), item.id + ":" + key); });
    });
  });
  T.test("v1 Phase 3: initial resources separate easy normal hard", function () {
    var easy = campaign("easy"), normal = campaign("normal"), hard = campaign("hard");
    T.assert(easy.campaign.gold > normal.campaign.gold); T.assert(normal.campaign.gold > hard.campaign.gold);
    T.assert(easy.castles.kiyosu.troops > normal.castles.kiyosu.troops); T.assert(normal.castles.kiyosu.troops > hard.castles.kiyosu.troops);
  });
  T.test("v1 Phase 3: easy has four-turn opening protection", function () {
    var state = campaign("easy"); T.equal(S.Data.getDifficulty("easy").openingProtectionTurns, 4); T.assert(S.Systems.Release.battleModifier(state, "aotsuki", "defender", "tokizawa") > 1);
  });
  T.test("v1 Phase 3: hard has no opening protection", function () {
    var state = campaign("hard"); T.equal(S.Data.getDifficulty("hard").openingProtectionTurns, 0); state.campaign.turn = 1; T.equal(S.Systems.Release.battleModifier(state, "aotsuki", "defender", "tokizawa"), 1);
  });
  T.test("v1 Phase 3: opening attack threshold falls after protection", function () {
    var state = campaign("easy"); state.campaign.turn = 1; var protectedValue = S.Systems.Release.attackThreshold(state, "tokizawa", "aotsuki"); state.campaign.turn = 6; var normalValue = S.Systems.Release.attackThreshold(state, "tokizawa", "aotsuki"); T.assert(protectedValue > normalValue);
  });
  T.test("v1 Phase 3: stagnation gradually lowers attack threshold", function () {
    var state = campaign("normal"); state.campaign.turn = 10; state.diplomacy.stagnation.seasons = 0; var before = S.Systems.Release.attackThreshold(state, "tokizawa", "aotsuki"); state.diplomacy.stagnation.seasons = 10; var after = S.Systems.Release.attackThreshold(state, "tokizawa", "aotsuki"); T.assert(after < before);
  });
  T.test("v1 Phase 3: attack threshold respects minimum floor", function () {
    var state = campaign("hard"); state.campaign.turn = 100; state.diplomacy.stagnation.seasons = 999; var value = S.Systems.Release.attackThreshold(state, "tokizawa", "aotsuki"); T.assert(value >= S.Data.getDifficulty("hard").minimumAttackThreshold);
  });
  T.test("v1 Phase 3: dominant faction is detected", function () {
    var state = campaign("normal"); setDominant(state, "aotsuki"); T.equal(S.Systems.Release.isDominant(state, "aotsuki"), true);
  });
  T.test("v1 Phase 3: dominant AI economy is restrained", function () {
    var state = campaign("normal"); setDominant(state, "tokizawa"); T.assert(S.Systems.Release.aiEconomyMultiplier(state, "tokizawa") < S.Data.getDifficulty("normal").aiEconomy);
  });
  T.test("v1 Phase 3: trailing faction receives recovery support", function () {
    var state = campaign("normal"), kuroganeCastles = Object.keys(state.castles).filter(function (id) { return state.castles[id].factionId === "kurogane"; });
    kuroganeCastles.slice(1).forEach(function (id) { state.castles[id].factionId = "tokizawa"; state.castles[id].governorId = null; });
    T.assert(S.Systems.Release.isTrailing(state, "kurogane")); T.assert(S.Systems.Release.aiRecruitMultiplier(state, "kurogane") > S.Data.getDifficulty("normal").aiRecruit);
  });
  T.test("v1 Phase 3: dominant attack receives small overextension penalty", function () {
    var state = campaign("normal"); setDominant(state, "tokizawa"); T.assert(S.Systems.Release.battleModifier(state, "tokizawa", "attacker", "aotsuki") < 1);
  });
  T.test("v1 Phase 3: easy action count stays at two or less", function () {
    var state = campaign("easy"); T.assert(S.Systems.Release.aiActionCount(state, "tokizawa", sequence([0.99])) <= 2);
  });
  T.test("v1 Phase 3: hard can take a third action", function () {
    var state = campaign("hard"); var count = S.Systems.Release.aiActionCount(state, "tokizawa", sequence([0.99, 0.1])); T.equal(count, 3);
  });
  T.test("v1 Phase 3: attack commit ratio rises by difficulty", function () {
    T.assert(S.Systems.Release.commitRatio(campaign("easy")) < S.Systems.Release.commitRatio(campaign("normal")));
    T.assert(S.Systems.Release.commitRatio(campaign("normal")) < S.Systems.Release.commitRatio(campaign("hard")));
  });
  T.test("v1 Phase 3: player attack limits differ by difficulty", function () {
    T.equal(S.Systems.Release.maxPlayerAttacksPerSeason(campaign("easy")), 1);
    T.equal(S.Systems.Release.maxPlayerAttacksPerSeason(campaign("normal")), 2);
    T.equal(S.Systems.Release.maxPlayerAttacksPerSeason(campaign("hard")), 3);
  });
  T.test("v1 Phase 3: AI candidate can exclude player target", function () {
    var state = campaign("normal"); state.castles.narumi.troops = 180; state.castles.kiyosu.troops = 20;
    var candidates = S.Systems.AI.attackCandidates(state, "tokizawa", null, { avoidFactionId: "aotsuki" });
    T.equal(candidates.some(function (item) { return item.target.factionId === "aotsuki"; }), false);
  });
  T.test("v1 Phase 3: per-season player attack cap is propagated", function () {
    var state = campaign("easy"), original = S.Systems.AI.takeAction, observed = [];
    S.Systems.AI.takeAction = function (targetState, factionId, options) { observed.push(options.avoidFactionId || null); return { ok: true, action: "attack", stateChanges: { report: { defenderFactionId: targetState.campaign.playerFactionId } }, messages: [], errors: [] }; };
    try { S.Systems.AI.runSeason(state, { random: sequence([0]), allFactions: false }); } finally { S.Systems.AI.takeAction = original; }
    T.equal(observed[0], null); T.assert(observed.slice(1).every(function (value) { return value === "aotsuki"; }));
  });
  T.test("v1 Phase 3: recruit output differs by difficulty", function () {
    var easy = campaign("easy"), hard = campaign("hard");
    easy.factions.tokizawa.gold = hard.factions.tokizawa.gold = 999; easy.factions.tokizawa.food = hard.factions.tokizawa.food = 999;
    var easyBefore = easy.castles.narumi.troops, hardBefore = hard.castles.narumi.troops;
    T.assert(S.Systems.AI.recruit(easy, "tokizawa", "narumi", "hiyori").ok); T.assert(S.Systems.AI.recruit(hard, "tokizawa", "narumi", "hiyori").ok);
    T.assert(hard.castles.narumi.troops - hardBefore > easy.castles.narumi.troops - easyBefore);
  });
  T.test("v1 Phase 3: captured castle morale is stabilized", function () {
    var state = shortState("normal"), before = state.castles.narumi.morale;
    var plan = S.Systems.Battle.plan(state, { sourceId: "kiyosu", targetId: "narumi", commanderId: "keiketsu", deputyId: "soma", tacticId: "standard", decisionId: "trust", committedTroops: 40, attackerFactionId: "aotsuki", defenderFactionId: "tokizawa" });
    T.assert(plan.ok, plan.errors && plan.errors.join(" / ")); T.assert(S.Systems.Battle.resolve(state, { forceWin: true, random: function () { return 0.99; } }).ok); T.assert(state.castles.narumi.morale <= before - 10); T.assert(state.castles.narumi.morale >= 45);
  });
  T.test("v1 Phase 3: release snapshot is stable and serializable", function () {
    var state = campaign("normal"), snapshot = S.Systems.Release.snapshot(state); T.equal(snapshot.release, "core-v1.0-rc1"); T.assert(snapshot.validation.ok); T.equal(JSON.parse(JSON.stringify(snapshot)).difficultyId, "normal");
  });
  T.test("v1 Phase 3: release validator rejects bad profile", function () {
    var state = campaign("normal"), profile = S.Data.getDifficulty("normal"), previous = profile.aiCommitRatio; profile.aiCommitRatio = 0;
    try { T.equal(S.Systems.Release.validate(state).ok, false); } finally { profile.aiCommitRatio = previous; }
  });
  T.test("v1 Phase 3: save round trip preserves RC1-compatible state", function () {
    localStorage.data = {}; var state = campaign("normal"); state.campaign.turn = 9; T.assert(S.Save.save(state, "manual1").ok); var loaded = S.Save.load("manual1"); T.assert(loaded.ok); T.equal(loaded.state.campaign.turn, 9); T.equal(loaded.state.schemaVersion, 12); T.equal(loaded.state.gameVersion, "core-0.95");
  });
  T.test("v1 Phase 3: schema and game version remain compatible", function () {
    var state = campaign("normal"); T.equal(state.schemaVersion, 12); T.equal(state.gameVersion, "core-0.95");
  });
  T.test("v1 Phase 3: final state validation passes", function () {
    var state = campaign("normal"), validation = S.State.validateState(state), release = S.Systems.Release.validate(state); T.assert(validation.ok, validation.errors.join(" / ")); T.assert(release.ok, release.errors.join(" / "));
  });
  T.run();
})(window.Sengoku, window.SengokuTest);
