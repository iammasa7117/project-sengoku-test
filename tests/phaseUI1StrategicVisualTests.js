"use strict";
var fs=require("fs"),path=require("path"),vm=require("vm"),root=path.resolve(__dirname,"..");
global.window=global; global.addEventListener=function(){};
var elements={castleDetail:{innerHTML:""}};
global.document={getElementById:function(id){return elements[id]||(elements[id]={innerHTML:"",classList:{add:function(){},remove:function(){},contains:function(){return false;}}});},body:{classList:{add:function(){},remove:function(){}}}};
global.localStorage={data:{},setItem:function(k,v){this.data[k]=String(v)},getItem:function(k){return this.data[k]||null},removeItem:function(k){delete this.data[k]}};
[
"src/namespace.js","src/config/constants.js","src/config/balance.js","src/data/factions.js","src/data/castles.js","src/data/castleTraits.js","src/data/officers.js","src/data/tactics.js","src/data/unitTypes.js","src/data/events.js","src/data/contentPacks.js","src/data/eventExtensions.js","src/data/difficulties.js","src/data/scenarios.js","src/data/diplomacy.js","src/state/schema.js","src/state/createInitialState.js","src/state/validateState.js","src/state/migrateState.js","src/systems/officerSystem.js","src/systems/unitSystem.js","src/systems/armySystem.js","src/systems/relationshipSystem.js","src/systems/loyaltySystem.js","src/systems/rivalrySystem.js","src/systems/eventSystem.js","src/systems/prisonerSystem.js","src/systems/diplomacySystem.js","src/systems/releaseSystem.js","src/systems/domesticSystem.js","src/systems/victorySystem.js","src/systems/siegeSystem.js","src/systems/battleSystem.js","src/systems/aiSystem.js","src/systems/turnSystem.js","src/systems/uxSystem.js","src/save/saveSystem.js","src/ui/dom.js","src/ui/renderOfficers.js","src/ui/strategicVisual.js"
].forEach(function(f){vm.runInThisContext(fs.readFileSync(path.join(root,f),"utf8"),{filename:f});});
var S=global.Sengoku, U=S.UI, passes=0,total=0;
function test(name,fn){total++;try{fn();passes++;console.log("PASS "+name)}catch(e){console.error("FAIL "+name+" — "+e.message);process.exitCode=1}}
function ok(c,m){if(!c)throw new Error(m||"assert")}
S.State.current=S.State.createInitialState({scenarioId:"core_campaign",playerFactionId:"aotsuki"}); S.State.current.campaign.status="playing"; S.State.current.campaign.selectedCastleId="kiyosu";
var opened=""; U.openModal=function(html){opened=html;};
test("城詳細がゲーム画面風heroを描画",function(){U.renderCastleDetail();ok(/sv-castle-hero/.test(elements.castleDetail.innerHTML));ok(/清洲城/.test(elements.castleDetail.innerHTML));});
test("城詳細に4つの主要導線",function(){var h=elements.castleDetail.innerHTML;["内政","家臣一覧","人材登用","出陣"].forEach(function(x){ok(h.indexOf(x)>=0,x)});});
test("内政画面が主要コマンドを描画",function(){opened="";U.showDomesticVisual();["新田開発","商業投資","城の強化","軍事訓練","人材登用","外交","出兵依頼"].forEach(function(x){ok(opened.indexOf(x)>=0,x)});});
test("家臣一覧が実データの武将を描画",function(){opened="";U.showRetainers();ok(/sv-retainer-row/.test(opened));ok(opened.indexOf("蒼月景継")>=0);});
test("在野候補がいない時は明確な空状態",function(){opened="";U.showRecruitmentVisual();ok(opened.indexOf("現在、登用できる在野武将はいません")>=0);});
test("在野武将が発生するとカード表示",function(){var o=S.State.current.officers.kanenobu;o.status="ronin";o.castleId=null;o.assignment={type:"idle",castleId:null,armyId:null};opened="";U.showRecruitmentVisual();ok(/sv-recruit-card/.test(opened));ok(opened.indexOf("九曜兼信")>=0);});
console.log(passes+" / "+total+" PASS");
if(passes!==total)process.exitCode=1;
