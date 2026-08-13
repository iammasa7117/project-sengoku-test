"use strict";
var fs = require("fs"), path = require("path"), root = path.resolve(__dirname, ".."), failures = [], passed = 0;
function check(name, condition, detail) { if (condition) { passed += 1; process.stdout.write("PASS " + name + "\n"); } else { failures.push(name + (detail ? ": " + detail : "")); process.stderr.write("FAIL " + failures[failures.length - 1] + "\n"); } }
function htmlCheck(file) {
  var absolute = path.join(root, file), html = fs.readFileSync(absolute, "utf8"), directory = path.dirname(absolute), refs = [], match;
  var refPattern = /<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["'][^>]*>/g;
  while ((match = refPattern.exec(html))) if (!/^(?:https?:|data:|#)/.test(match[1])) refs.push(match[1]);
  var missing = refs.filter(function (ref) { return !fs.existsSync(path.resolve(directory, ref)); });
  check(file + " 参照欠損なし", missing.length === 0, missing.join(", "));
  var ids = {}, duplicates = [];
  var idPattern = /\bid=["']([^"']+)["']/g;
  while ((match = idPattern.exec(html))) { if (ids[match[1]]) duplicates.push(match[1]); ids[match[1]] = true; }
  check(file + " 重複DOM IDなし", duplicates.length === 0, duplicates.join(", "));
  check(file + " ES Modulesなし", !/<script\b[^>]*type=["']module["']/i.test(html));
  check(file + " 外部参照なし", !/<(?:script|link)\b[^>]*(?:src|href)=["']https?:/i.test(html));
}
function walk(directory) { return fs.readdirSync(directory, { withFileTypes: true }).reduce(function (files, entry) { var full = path.join(directory, entry.name); return files.concat(entry.isDirectory() ? walk(full) : [full]); }, []); }
htmlCheck("index.html"); htmlCheck("tests/test.html");
var sourceFiles = walk(path.join(root, "src")).filter(function (file) { return file.endsWith(".js"); });
var source = sourceFiles.map(function (file) { return fs.readFileSync(file, "utf8"); }).join("\n");
check("データ読込用fetchなし", !/\bfetch\s*\(/.test(source));
check("import/export構文なし", !/(^|\n)\s*(?:import|export)\s/m.test(source));
check("外部ライブラリ参照なし", !/\b(?:require\s*\(|define\s*\(|React\.|Vue\.|jQuery\b)/.test(source));
check("固定プレイヤー定数なし", source.indexOf("PLAYER_FACTION_ID") < 0);
var relationshipSource = fs.readFileSync(path.join(root, "src/systems/relationshipSystem.js"), "utf8");
var battleSource = fs.readFileSync(path.join(root, "src/systems/battleSystem.js"), "utf8");
var diplomacySource = fs.readFileSync(path.join(root, "src/systems/diplomacySystem.js"), "utf8");
var diplomacyDataSource = fs.readFileSync(path.join(root, "src/data/diplomacy.js"), "utf8");
var eventSource = fs.readFileSync(path.join(root, "src/systems/eventSystem.js"), "utf8");
var renderEventsSource = fs.readFileSync(path.join(root, "src/ui/renderEvents.js"), "utf8");
var renderAppSource = fs.readFileSync(path.join(root, "src/ui/renderApp.js"), "utf8");
check("旧武将関係がdiplomacy.relationsに残っていない", relationshipSource.indexOf("diplomacy.relations") < 0 && relationshipSource.indexOf("relationships.officers") >= 0);
check("Battle開始・解決が外交判定を通る", (battleSource.match(/Diplomacy\.canAttack/g) || []).length >= 3);
check("外交判定無視は明示的デバッグ経路のみ", battleSource.indexOf("debugDiplomacyOverride") >= 0 && battleSource.indexOf("ignoreDiplomacy === true") >= 0);
check("固定勢力外交ロジックなし", !/\b(?:aotsuki|tokizawa|yukishiro|kurogane)\b/.test(diplomacySource));
check("外交自己ペア生成なし", diplomacyDataSource.indexOf("slice(index + 1)") >= 0);
check("全シナリオ外交ペア生成関数あり", diplomacyDataSource.indexOf("createState") >= 0 && diplomacyDataSource.indexOf("relations[key]") >= 0);
check("evalなし", !/\beval\s*\(/.test(source));
check("new Functionなし", !/\bnew\s+Function\b/.test(source));
check("opening council UI hardcodingなし", renderAppSource.indexOf("owari_opening_council") < 0 && renderAppSource.indexOf("最初の一手") < 0);
check("legacy season event直接scanなし", eventSource.indexOf("S.Data.events") < 0);
check("UIがevent effectsを直接適用しない", renderEventsSource.indexOf(".effects") < 0 && renderEventsSource.indexOf("events.flags[") < 0 && renderEventsSource.indexOf("applyEffect") < 0);
global.window = global; global.addEventListener = function () {};
var vm = require("vm");
[
  "src/namespace.js", "src/config/constants.js", "src/config/balance.js", "src/data/factions.js", "src/data/castles.js", "src/data/castleTraits.js", "src/data/officers.js", "src/data/tactics.js", "src/data/unitTypes.js", "src/data/events.js", "src/data/contentPacks.js", "src/data/eventExtensions.js", "src/data/difficulties.js", "src/data/scenarios.js", "src/data/diplomacy.js", "src/state/schema.js", "src/state/createInitialState.js", "src/state/validateState.js", "src/state/migrateState.js", "src/systems/officerSystem.js", "src/systems/unitSystem.js", "src/systems/armySystem.js", "src/systems/relationshipSystem.js", "src/systems/loyaltySystem.js", "src/systems/rivalrySystem.js", "src/systems/eventSystem.js", "src/systems/prisonerSystem.js", "src/systems/diplomacySystem.js", "src/systems/domesticSystem.js", "src/systems/victorySystem.js", "src/systems/siegeSystem.js", "src/systems/battleSystem.js", "src/systems/aiSystem.js", "src/systems/turnSystem.js"
].forEach(function (file) { vm.runInThisContext(fs.readFileSync(path.join(root, file), "utf8"), { filename: file }); });
function hasFunction(value) { if (typeof value === "function") return true; if (!value || typeof value !== "object") return false; return Object.keys(value).some(function (key) { return hasFunction(value[key]); }); }
function hasHtml(value) { if (typeof value === "string" && /<\/?[a-z][^>]*>/i.test(value)) return true; if (!value || typeof value !== "object") return false; return Object.keys(value).some(function (key) { return hasHtml(value[key]); }); }
var registry = Sengoku.Data.ContentPackRegistry, packIds = {}, eventIds = {}, arcIds = {}, duplicatePacks = [], duplicateEvents = [], duplicateArcs = [], references = [];
registry.order.forEach(function (packId) { if (packIds[packId]) duplicatePacks.push(packId); packIds[packId] = true; var pack = registry.packs[packId]; (pack.events || []).forEach(function (definition) { if (eventIds[definition.id]) duplicateEvents.push(definition.id); eventIds[definition.id] = true; (definition.choices || []).forEach(function (choice) { if (choice.nextEventId) references.push(choice.nextEventId); (choice.effects || []).forEach(function (effect) { if (effect.type === "queueEvent") references.push(effect.eventId); }); }); }); (pack.arcs || []).forEach(function (arc) { if (arcIds[arc.id]) duplicateArcs.push(arc.id); arcIds[arc.id] = true; }); });
check("event-data functionsなし", !hasFunction(registry));
check("raw event HTMLなし", !hasHtml(registry));
check("duplicate pack IDsなし", duplicatePacks.length === 0);
check("duplicate event IDsなし", duplicateEvents.length === 0);
check("duplicate arc IDsなし", duplicateArcs.length === 0);
check("全nextEvent参照が解決", references.every(function (id) { return eventIds[id]; }), references.filter(function (id) { return !eventIds[id]; }).join(", "));
var requiredConditions = "all any not scenario difficulty turn year season resource factionAlive factionCastleCount factionTotalTroops factionResource factionRank factionIsPlayer factionWarExhaustion factionReputation factionVassalStatus castleOwner castleTroops castleDefense castleMorale castleDevelopment castleNeighbor castleGovernor officerStatus officerFaction officerCastle officerStat officerLoyalty officerGrievance officerAmbition officerInjury officerLevel officerMerit officerPersonality officerTrait officerTag officerPromiseStatus officerRelationship rivalryRespect rivalryResentment rivalryEncounters diplomacyStatus diplomacyScore diplomacyTrust diplomacyGrievance diplomacyCommonEnemy eventFlag eventVariable eventCounter eventFired arcStatus arcStep eventCooldown".split(" ");
var requiredSelectors = "highestStatOfficer lowestStatOfficer highestLoyaltyOfficer lowestLoyaltyOfficer highestGrievanceOfficer castleGovernor randomPrisoner randomFactionCastle weakestBorderCastle strongestCastle recentlyCapturedCastle factionById strongestFaction weakestFaction randomEnemyFaction diplomaticPartner".split(" ");
var requiredEffects = "setFlag clearFlag setVariable addVariable setCounter addCounter setCooldown clearCooldown queueEvent cancelEvent campaignResource consumeCommand restoreCommand factionResource factionReputation warExhaustion castleTroops castleMorale castleDefense castleDevelopment castleOwner officerStat officerLoyalty officerGrievance officerLordTrust officerMerit officerExperience officerInjury officerRecover officerMove officerAppointGovernor officerStatus officerAddPersonality officerRemovePersonality officerAddTrait officerRemoveTrait officerAddTag officerRemoveTag officerPromise officerRelationship addRelationshipMemory rivalryRespect rivalryResentment rivalryEncounter releasePrisoner recruitPrisoner exchangePrisoner diplomacyScore diplomacyTrust diplomacyGrievance declareWar makePeace createCeasefire createNonAggression createAlliance breakTreaty createVassalage releaseVassal addLog addChronicle addOfficerHistory addDiplomacyHistory addBattleMemory startArc advanceArc setArcStep completeArc failArc requestBattlePlanner requestOfficerSelection requestCastleSelection requestFactionSelection".split(" ");
check("全trigger登録", Object.keys(Sengoku.Config.EVENT_TRIGGERS).every(function (key) { return Sengoku.Systems.Event.TRIGGERS[key] === Sengoku.Config.EVENT_TRIGGERS[key]; }));
check("全condition type登録", requiredConditions.every(function (type) { return Sengoku.Systems.Event.CONDITION_TYPES.indexOf(type) >= 0; }));
check("全selector type登録", requiredSelectors.every(function (type) { return Sengoku.Systems.Event.SELECTOR_TYPES.indexOf(type) >= 0; }));
check("全effect type登録", requiredEffects.every(function (type) { return Sengoku.Systems.Event.EFFECT_TYPES.indexOf(type) >= 0; }));
check("Content Pack Registry検証PASS", Sengoku.Systems.Event.validateContentPackRegistry().ok);
process.stdout.write(passed + " / " + (passed + failures.length) + " static checks PASS\n");
if (failures.length) process.exitCode = 1;
