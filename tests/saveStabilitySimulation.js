"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm"), root = path.resolve(__dirname, "..");
global.window = global; global.addEventListener = function () {};
global.localStorage = { data: {}, setItem: function (key, value) { this.data[key] = String(value); }, getItem: function (key) { return Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key] : null; }, removeItem: function (key) { delete this.data[key]; } };
[
  "src/namespace.js", "src/config/constants.js", "src/config/balance.js", "src/data/factions.js", "src/data/castles.js", "src/data/castleTraits.js", "src/data/officers.js", "src/data/tactics.js", "src/data/unitTypes.js", "src/data/events.js", "src/data/contentPacks.js", "src/data/eventExtensions.js", "src/data/difficulties.js", "src/data/scenarios.js", "src/data/diplomacy.js", "src/state/schema.js", "src/state/createInitialState.js", "src/state/validateState.js", "src/state/migrateState.js", "src/systems/officerSystem.js", "src/systems/unitSystem.js", "src/systems/armySystem.js", "src/systems/relationshipSystem.js", "src/systems/loyaltySystem.js", "src/systems/rivalrySystem.js", "src/systems/eventSystem.js", "src/systems/prisonerSystem.js", "src/systems/diplomacySystem.js", "src/systems/domesticSystem.js", "src/systems/victorySystem.js", "src/systems/siegeSystem.js", "src/systems/battleSystem.js", "src/systems/aiSystem.js", "src/systems/turnSystem.js", "src/save/saveSystem.js"
].forEach(function (file) { vm.runInThisContext(fs.readFileSync(path.join(root, file), "utf8"), { filename: file }); });
var state = Sengoku.State.createInitialState({ scenarioId: "core_campaign", playerFactionId: "aotsuki", difficultyId: "normal", eventSeed: 4242 });
Sengoku.Systems.Campaign.begin(state); var recoveries = 0, failures = [], cycles = 200;
for (var i = 1; i <= cycles; i += 1) {
  state.campaign.gold = 1000 + i; state.meta.stabilityCycle = i;
  var saved = Sengoku.Save.autosave(state); if (!saved.ok) { failures.push("save:" + i + ":" + saved.errors.join("/")); break; }
  if (i === 50 || i === 100 || i === 150) {
    var key = Sengoku.Save.normalizeSlot("autosave"), envelope = JSON.parse(localStorage.getItem(key)); envelope.state.campaign.gold += 999; localStorage.setItem(key, JSON.stringify(envelope));
  }
  var loaded = Sengoku.Save.load("autosave"); if (!loaded.ok) { failures.push("load:" + i + ":" + loaded.errors.join("/")); break; }
  if (loaded.recovered) recoveries += 1;
  state = loaded.state;
  var validation = Sengoku.State.validateState(state); if (!validation.ok) { failures.push("validate:" + i + ":" + validation.errors.join("/")); break; }
}
var inspection = Sengoku.Save.inspect("autosave"), health = Sengoku.Save.health();
var summary = { cycles: cycles, recoveries: recoveries, failures: failures, primary: inspection.primary.status, validBackups: inspection.backups.filter(function (item) { return item.ok; }).length, storageBytes: health.bytes, finalValidation: Sengoku.State.validateState(state).ok };
process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
if (failures.length || recoveries !== 3 || inspection.primary.status !== "valid" || !summary.finalValidation || inspection.backups.filter(function (item) { return item.ok; }).length !== 3) process.exitCode = 1;
