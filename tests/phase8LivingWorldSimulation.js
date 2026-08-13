"use strict";
var fs=require("fs"),path=require("path"),vm=require("vm"),root=path.resolve(__dirname,"..");
global.window=global; global.addEventListener=function(){};
[
"src/namespace.js","src/config/constants.js","src/config/balance.js","src/data/factions.js","src/data/castles.js","src/data/castleTraits.js","src/data/officers.js","src/data/tactics.js","src/data/unitTypes.js","src/data/events.js","src/data/contentPacks.js","src/data/eventExtensions.js","src/data/difficulties.js","src/data/scenarios.js","src/data/diplomacy.js","src/state/schema.js","src/state/createInitialState.js","src/state/validateState.js","src/state/migrateState.js","src/systems/officerSystem.js","src/systems/unitSystem.js","src/systems/armySystem.js","src/systems/relationshipSystem.js","src/systems/loyaltySystem.js","src/systems/rivalrySystem.js","src/systems/eventSystem.js","src/systems/prisonerSystem.js","src/systems/diplomacySystem.js","src/systems/releaseSystem.js","src/systems/domesticSystem.js","src/systems/victorySystem.js","src/systems/siegeSystem.js","src/systems/battleSystem.js","src/systems/aiSystem.js","src/systems/turnSystem.js"
].forEach(function(f){vm.runInThisContext(fs.readFileSync(path.join(root,f),"utf8"),{filename:f});});
function rng(seed){return function(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function setWar(state,a,b){var r=Sengoku.Systems.Diplomacy.relation(state,a,b);r.status="war";r.expiresTurn=null;r.lastActionTurn=-1;r.sinceTurn=state.campaign.turn;}
var state=Sengoku.State.createInitialState({scenarioId:"core_campaign",playerFactionId:"yukishiro",difficultyId:"normal"}); state.campaign.status="playing"; state.settings.aiEnabled=true;
setWar(state,"aotsuki","tokizawa"); setWar(state,"tokizawa","yukishiro"); setWar(state,"kurogane","aotsuki");
var random=rng(8128), maxArmies=0, sawEnemyArmy=false, sawReinforce=false, errors=[];
for(var i=0;i<24&&!state.campaign.gameOver;i++){
  var result=Sengoku.Systems.Turn.advance(state,{random:random,allowTactical:false});
  if(!result.ok){errors=errors.concat(result.errors||[]);break;}
  var armies=Sengoku.Systems.Army.all(state); maxArmies=Math.max(maxArmies,armies.length);
  if(armies.some(function(a){return a.factionId!==state.campaign.playerFactionId && (a.mission||"attack")==="attack";})) sawEnemyArmy=true;
  if(armies.some(function(a){return a.mission==="reinforce";})) sawReinforce=true;
  var valid=Sengoku.State.validateState(state); if(!valid.ok){errors=errors.concat(valid.errors);break;}
}
var out={result:errors.length?"FAIL":"PASS",maxArmies:maxArmies,sawEnemyArmy:sawEnemyArmy,sawReinforce:sawReinforce,battles:state.campaign.battleCount,turn:state.campaign.turn,validation:Sengoku.State.validateState(state).ok,errors:errors};
if(!out.validation||!sawEnemyArmy) out.result="FAIL";
console.log(JSON.stringify(out,null,2)); if(out.result!=="PASS") process.exitCode=1;
