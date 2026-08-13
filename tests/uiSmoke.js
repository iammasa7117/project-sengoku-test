"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm"), root = path.resolve(__dirname, ".."), elements = {}, failures = [], passed = 0;
function classList() { var values = {}; return { add: function (name) { values[name] = true; }, remove: function (name) { delete values[name]; }, contains: function (name) { return Boolean(values[name]); } }; }
function element(id) { return elements[id] || (elements[id] = { id: id, innerHTML: "", textContent: "", className: "", disabled: false, value: "", classList: classList(), querySelector: function () { return null; } }); }
function check(name, condition) { if (condition) { passed += 1; process.stdout.write("PASS " + name + "\n"); } else { failures.push(name); process.stderr.write("FAIL " + name + "\n"); } }
global.window = global; global.addEventListener = function () {}; global.document = { getElementById: element, createElement: function () { return element("created"); } };
[
  "src/namespace.js", "src/config/constants.js", "src/config/balance.js", "src/data/factions.js", "src/data/castles.js", "src/data/castleTraits.js", "src/data/officers.js", "src/data/tactics.js", "src/data/unitTypes.js", "src/data/events.js", "src/data/contentPacks.js", "src/data/eventExtensions.js", "src/data/difficulties.js", "src/data/scenarios.js", "src/data/diplomacy.js", "src/state/schema.js", "src/state/createInitialState.js", "src/state/validateState.js", "src/state/migrateState.js", "src/systems/officerSystem.js", "src/systems/unitSystem.js", "src/systems/armySystem.js", "src/systems/relationshipSystem.js", "src/systems/loyaltySystem.js", "src/systems/rivalrySystem.js", "src/systems/eventSystem.js", "src/systems/prisonerSystem.js", "src/systems/diplomacySystem.js", "src/systems/releaseSystem.js", "src/systems/domesticSystem.js", "src/systems/victorySystem.js", "src/systems/siegeSystem.js", "src/systems/battleSystem.js", "src/systems/aiSystem.js", "src/systems/turnSystem.js", "src/ui/dom.js", "src/ui/renderDiplomacy.js"
].forEach(function (file) { vm.runInThisContext(fs.readFileSync(path.join(root, file), "utf8"), { filename: file }); });
Sengoku.State.current = Sengoku.State.createInitialState({ scenarioId: "core_campaign", playerFactionId: "aotsuki", difficultyId: "normal" });
Sengoku.UI.showDiplomacy();
check("外交一覧モーダル", elements.modalContent.innerHTML.indexOf("FACTION DIPLOMACY") >= 0 && (elements.modalContent.innerHTML.match(/data-diplomacy-target/g) || []).length === 3);
check("外交一覧の主要指標", ["関係", "信頼", "遺恨", "評判", "疲弊", "国力", "残り"].every(function (label) { return elements.modalContent.innerHTML.indexOf(label) >= 0; }));
Sengoku.UI.showDiplomacyDetail("yukishiro");
check("外交詳細と使者選択", elements.modalContent.innerHTML.indexOf("DIPLOMACY DETAIL") >= 0 && elements.modalContent.innerHTML.indexOf("diplomacyMessenger") >= 0);
check("外交アクションと不能理由", (elements.modalContent.innerHTML.match(/data-diplomacy-action/g) || []).length >= 12 && elements.modalContent.innerHTML.indexOf("実行可能") >= 0);
check("援助と援軍入力", elements.modalContent.innerHTML.indexOf("diplomacyAidGold") >= 0 && elements.modalContent.innerHTML.indexOf("diplomacyReinforceTroops") >= 0);
var proposal = Sengoku.Systems.Diplomacy.propose(Sengoku.State.current, "alliance", "yukishiro", "aotsuki", {});
check("AI提案をpending保存", proposal.ok && proposal.stateChanges.pending === true);
Sengoku.UI.showPendingProposals();
check("AI提案受諾拒否UI", elements.modalContent.innerHTML.indexOf("data-respond-proposal=\"accept\"") >= 0 && elements.modalContent.innerHTML.indexOf("data-respond-proposal=\"reject\"") >= 0);
Sengoku.UI.showDiplomacyHistory();
check("外交履歴UI", elements.modalContent.innerHTML.indexOf("DIPLOMACY HISTORY") >= 0 && elements.modalContent.innerHTML.indexOf("同盟") >= 0);
process.stdout.write(passed + " / " + (passed + failures.length) + " UI smoke checks PASS\n");
if (failures.length) process.exitCode = 1;
