"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm"), root = path.resolve(__dirname, ".."), elements = {};
function classList(owner) { return { add: function (name) { var list = owner.className.split(/\s+/).filter(Boolean); if (list.indexOf(name) < 0) list.push(name); owner.className = list.join(" "); }, remove: function (name) { owner.className = owner.className.split(/\s+/).filter(function (item) { return item && item !== name; }).join(" "); }, contains: function (name) { return owner.className.split(/\s+/).indexOf(name) >= 0; }, toggle: function (name, force) { var add = force === undefined ? !this.contains(name) : Boolean(force); if (add) this.add(name); else this.remove(name); return add; } }; }
function element(id) {
  if (elements[id]) return elements[id];
  var item = { id: id, innerHTML: "", textContent: "", value: "", className: id === "modalBackdrop" ? "modal-backdrop hidden" : (id === "debugPanel" ? "debug-panel hidden" : ""), children: [], disabled: false, attributes: {}, dataset: {}, focused: false, scrolled: false,
    appendChild: function (child) { this.children.push(child); }, addEventListener: function () {}, setAttribute: function (name, value) { this.attributes[name] = String(value); }, getAttribute: function (name) { return this.attributes[name]; }, focus: function () { this.focused = true; document.activeElement = this; }, scrollIntoView: function () { this.scrolled = true; }, click: function () {}, remove: function () {},
    querySelector: function (selector) { if (id === "modalBackdrop" && selector === ".modal") return element("modalDialog"); if (/h1|h2|h3/.test(selector)) return element("modalHeadingElement"); if (/button|select|input|textarea/.test(selector)) return element("modalFocusable"); return null; },
    querySelectorAll: function () { return []; }
  };
  item.classList = classList(item); elements[id] = item; return item;
}
global.window = global; global.addEventListener = function () {};
global.document = { title: "", activeElement: null, body: element("body"), getElementById: element, createElement: function () { return element("created-" + Math.random()); } };
global.localStorage = { data: {}, setItem: function (key, value) { this.data[key] = String(value); }, getItem: function (key) { return Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key] : null; }, removeItem: function (key) { delete this.data[key]; } };
[
  "src/namespace.js", "src/config/constants.js", "src/config/balance.js", "src/data/factions.js", "src/data/castles.js", "src/data/castleTraits.js", "src/data/officers.js", "src/data/tactics.js", "src/data/unitTypes.js", "src/data/events.js", "src/data/contentPacks.js", "src/data/eventExtensions.js", "src/data/difficulties.js", "src/data/scenarios.js", "src/data/diplomacy.js", "src/state/schema.js", "src/state/createInitialState.js", "src/state/validateState.js", "src/state/migrateState.js", "src/systems/officerSystem.js", "src/systems/unitSystem.js", "src/systems/armySystem.js", "src/systems/relationshipSystem.js", "src/systems/loyaltySystem.js", "src/systems/rivalrySystem.js", "src/systems/eventSystem.js", "src/systems/prisonerSystem.js", "src/systems/diplomacySystem.js", "src/systems/releaseSystem.js", "src/systems/domesticSystem.js", "src/systems/victorySystem.js", "src/systems/siegeSystem.js", "src/systems/battleSystem.js", "src/systems/aiSystem.js", "src/systems/turnSystem.js", "src/systems/uxSystem.js", "src/save/saveSystem.js", "src/ui/dom.js", "src/ui/uxGuide.js", "src/ui/renderModals.js", "src/ui/debugPanel.js", "tests/testRunner.js", "tests/v1Phase3DomTests.js"
].forEach(function (file) { vm.runInThisContext(fs.readFileSync(path.join(root, file), "utf8"), { filename: file }); });
elements.results.children.forEach(function (item) { if (item.className.indexOf("fail") >= 0) process.stderr.write(item.innerHTML.replace(/<[^>]+>/g, " ") + "\n"); });
process.stdout.write(elements.summary.textContent + "\n");
if (!global.SengokuTestResults || !global.SengokuTestResults.ok) process.exitCode = 1;
