"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm"), root = path.resolve(__dirname, ".."), testFile = process.argv[2] || "tests/phase4TacticalIntegrationTests.js";
var elements = {};
function element(id) { return elements[id] || (elements[id] = { id:id, innerHTML:"", textContent:"", className:"", children:[], appendChild:function(child){this.children.push(child);}, classList:{add:function(){},remove:function(){}}, setAttribute:function(){}, style:{} }); }
global.window = global; global.addEventListener = function () {};
global.document = { title:"", body:{classList:{add:function(){},remove:function(){}}}, getElementById:element, createElement:function(){return {className:"",innerHTML:"",style:{},classList:{add:function(){},remove:function(){}},setAttribute:function(){},appendChild:function(){}};} };
global.localStorage = { data:{}, setItem:function(key,value){this.data[key]=String(value);}, getItem:function(key){return Object.prototype.hasOwnProperty.call(this.data,key)?this.data[key]:null;}, removeItem:function(key){delete this.data[key];} };
[
  "src/namespace.js","src/config/constants.js","src/config/balance.js","src/data/factions.js","src/data/castles.js","src/data/castleTraits.js","src/data/officers.js","src/data/tactics.js","src/data/unitTypes.js","src/data/events.js","src/data/contentPacks.js","src/data/eventExtensions.js","src/data/difficulties.js","src/data/scenarios.js","src/data/diplomacy.js","src/state/schema.js","src/state/createInitialState.js","src/state/validateState.js","src/state/migrateState.js","src/systems/officerSystem.js","src/systems/unitSystem.js","src/systems/armySystem.js","src/systems/relationshipSystem.js","src/systems/loyaltySystem.js","src/systems/rivalrySystem.js","src/systems/eventSystem.js","src/systems/prisonerSystem.js","src/systems/diplomacySystem.js","src/systems/releaseSystem.js","src/systems/domesticSystem.js","src/systems/victorySystem.js","src/systems/siegeSystem.js","src/systems/battleSystem.js","src/systems/aiSystem.js","src/systems/turnSystem.js","src/systems/battleAdapter.js","src/systems/uxSystem.js","src/save/saveSystem.js","src/ui/uxGuide.js","tests/testRunner.js",testFile
].forEach(function(file){vm.runInThisContext(fs.readFileSync(path.join(root,file),"utf8"),{filename:file});});
elements.results.children.forEach(function(item){if(item.className.indexOf("fail")>=0)process.stderr.write(item.innerHTML.replace(/<[^>]+>/g," ")+"\n");});
process.stdout.write(elements.summary.textContent+"\n");
if(!global.SengokuTestResults||!global.SengokuTestResults.ok)process.exitCode=1;
