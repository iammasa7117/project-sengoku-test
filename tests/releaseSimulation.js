"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm"), root = path.resolve(__dirname, "..");
global.window = global; global.addEventListener = function () {};
[
  "src/namespace.js", "src/config/constants.js", "src/config/balance.js", "src/data/factions.js", "src/data/castles.js", "src/data/castleTraits.js", "src/data/officers.js", "src/data/tactics.js", "src/data/unitTypes.js", "src/data/events.js", "src/data/contentPacks.js", "src/data/eventExtensions.js", "src/data/difficulties.js", "src/data/scenarios.js", "src/data/diplomacy.js", "src/state/schema.js", "src/state/createInitialState.js", "src/state/validateState.js", "src/state/migrateState.js", "src/systems/officerSystem.js", "src/systems/unitSystem.js", "src/systems/armySystem.js", "src/systems/relationshipSystem.js", "src/systems/loyaltySystem.js", "src/systems/rivalrySystem.js", "src/systems/eventSystem.js", "src/systems/prisonerSystem.js", "src/systems/diplomacySystem.js", "src/systems/releaseSystem.js", "src/systems/domesticSystem.js", "src/systems/victorySystem.js", "src/systems/siegeSystem.js", "src/systems/battleSystem.js", "src/systems/aiSystem.js", "src/systems/turnSystem.js"
].forEach(function (file) { vm.runInThisContext(fs.readFileSync(path.join(root, file), "utf8"), { filename: file }); });
function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
function invalidNumbers(value) { var count = 0; (function inspect(item) { if (typeof item === "number" && !Number.isFinite(item)) count += 1; else if (item && typeof item === "object") Object.keys(item).forEach(function (key) { inspect(item[key]); }); })(value); return count; }
function run(profile) {
  var state = Sengoku.State.createInitialState({ scenarioId: "core_campaign", playerFactionId: profile.playerFactionId, difficultyId: profile.difficultyId });
  Sengoku.Systems.Campaign.begin(state);
  var result = Sengoku.Systems.AI.simulateAllFactions(state, 240, rng(profile.seed), { terminationLimit: 360 });
  var validation = Sengoku.State.validateState(state), releaseValidation = Sengoku.Systems.Release.validate(state), reports = state.events.battleReports;
  var governors = Object.keys(state.castles).map(function (id) { return state.castles[id].governorId; }).filter(Boolean);
  return {
    seed: profile.seed, playerFactionId: profile.playerFactionId, difficultyId: profile.difficultyId,
    completedSeasons: result.stateChanges.completedSeasons, outcome: state.campaign.outcome,
    battles: result.stateChanges.battles, ownershipChanges: result.stateChanges.ownershipChanges,
    diplomacyActions: result.stateChanges.diplomacyActions, maximumStagnation: result.stateChanges.maximumStagnation,
    treatyViolationAttacks: result.stateChanges.treatyViolationAttacks,
    invalidNumbers: invalidNumbers(state), negativeTroops: Object.keys(state.castles).filter(function (id) { return state.castles[id].troops < 0; }).length,
    duplicateGovernors: governors.length - new Set(governors).size, unresolvedBattle: Boolean(state.events.pendingBattle),
    validation: validation.ok, releaseValidation: releaseValidation.ok,
    finalOwnership: Object.keys(state.castles).sort().map(function (id) { return id + ":" + state.castles[id].factionId; }).join("|"),
    battleSignature: reports.map(function (item) { return [item.id, item.attackerFactionId, item.defenderFactionId, item.result].join(":"); }).join("|")
  };
}
var factions = ["aotsuki", "tokizawa", "yukishiro", "kurogane"], difficulties = ["easy", "normal", "hard"], profiles = [], seed = 1701;
difficulties.forEach(function (difficultyId, di) { factions.forEach(function (playerFactionId, fi) { profiles.push({ seed: seed + di * 701 + fi * 137, playerFactionId: playerFactionId, difficultyId: difficultyId }); }); });
var runs = profiles.map(run), ended = runs.filter(function (item) { return item.outcome; }).length;
var replayA = run(profiles[0]), replayB = run(profiles[0]);
var deterministic = replayA.finalOwnership === replayB.finalOwnership && replayA.battleSignature === replayB.battleSignature && replayA.completedSeasons === replayB.completedSeasons;
var allOk = runs.every(function (item) { return item.validation && item.releaseValidation && item.invalidNumbers === 0 && item.negativeTroops === 0 && item.duplicateGovernors === 0 && item.treatyViolationAttacks === 0 && !item.unresolvedBattle && item.maximumStagnation <= 16 && item.battles >= 1; });
if (ended < 4 || !deterministic) allOk = false;
var output = { runs: runs.map(function (item) { var copy = Object.assign({}, item); delete copy.finalOwnership; delete copy.battleSignature; return copy; }), endedWithin360: ended, deterministicReplay: deterministic ? "PASS" : "FAIL", result: allOk ? "PASS" : "FAIL" };
process.stdout.write(JSON.stringify(output, null, 2) + "\n");
if (!allOk) process.exitCode = 1;
