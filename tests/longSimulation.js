"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm"), root = path.resolve(__dirname, "..");
global.window = global; global.addEventListener = function () {};
[
  "src/namespace.js", "src/config/constants.js", "src/config/balance.js", "src/data/factions.js", "src/data/castles.js", "src/data/castleTraits.js", "src/data/officers.js", "src/data/tactics.js", "src/data/unitTypes.js", "src/data/events.js", "src/data/contentPacks.js", "src/data/eventExtensions.js", "src/data/difficulties.js", "src/data/scenarios.js", "src/data/diplomacy.js", "src/state/schema.js", "src/state/createInitialState.js", "src/state/validateState.js", "src/state/migrateState.js", "src/systems/officerSystem.js", "src/systems/unitSystem.js", "src/systems/armySystem.js", "src/systems/relationshipSystem.js", "src/systems/loyaltySystem.js", "src/systems/rivalrySystem.js", "src/systems/eventSystem.js", "src/systems/prisonerSystem.js", "src/systems/diplomacySystem.js", "src/systems/releaseSystem.js", "src/systems/domesticSystem.js", "src/systems/victorySystem.js", "src/systems/siegeSystem.js", "src/systems/battleSystem.js", "src/systems/aiSystem.js", "src/systems/turnSystem.js"
].forEach(function (file) { vm.runInThisContext(fs.readFileSync(path.join(root, file), "utf8"), { filename: file }); });
function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
function invalidNumbers(value) { var invalid = 0; (function inspect(item) { if (typeof item === "number" && !Number.isFinite(item)) invalid += 1; else if (item && typeof item === "object") Object.keys(item).forEach(function (key) { inspect(item[key]); }); })(value); return invalid; }
var profiles = [
  { seed: 101, playerFactionId: "aotsuki", difficultyId: "easy" },
  { seed: 202, playerFactionId: "tokizawa", difficultyId: "normal" },
  { seed: 303, playerFactionId: "yukishiro", difficultyId: "hard" }
];
var allOk = true, summaries = profiles.map(function (profile, index) {
  var state = Sengoku.State.createInitialState({ scenarioId: "core_campaign", playerFactionId: profile.playerFactionId, difficultyId: profile.difficultyId });
  Sengoku.Systems.Campaign.begin(state);
  var result = Sengoku.Systems.AI.simulate(state, 100, rng(profile.seed)), validation = Sengoku.State.validateState(state), governorIds = Object.keys(state.castles).map(function (id) { return state.castles[id].governorId; }).filter(Boolean), negativeTroops = Object.keys(state.castles).filter(function (id) { return state.castles[id].troops < 0; }).length;
  var summary = { run: index + 1, seed: profile.seed, playerFactionId: profile.playerFactionId, difficultyId: profile.difficultyId, completedSeasons: result.stateChanges.completedSeasons, battles: state.campaign.battleCount, outcome: state.campaign.outcome, validation: validation.ok ? "PASS" : validation.errors, invalidNumbers: invalidNumbers(state), negativeTroops: negativeTroops, duplicateGovernors: governorIds.length - new Set(governorIds).size };
  if (!result.ok || !validation.ok || summary.completedSeasons !== 100 || summary.invalidNumbers || summary.negativeTroops || summary.duplicateGovernors) allOk = false;
  return summary;
});
process.stdout.write(JSON.stringify(summaries, null, 2) + "\n");
if (!allOk) process.exitCode = 1;
