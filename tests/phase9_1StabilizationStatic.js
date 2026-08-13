"use strict";
var fs=require("fs"),path=require("path"),root=path.resolve(__dirname,"..");
function read(file){return fs.readFileSync(path.join(root,file),"utf8");}
var army=read("src/systems/armySystem.js"),turn=read("src/systems/turnSystem.js"),adapter=read("src/systems/battleAdapter.js"),ui=read("src/ui/renderArmy.js"),main=read("src/main.js"),bundle=read("01_START_GAME.html");
var checks=[
  ["Army detail interceptHtml定義",/var interceptHtml = ""/.test(ui)],
  ["迎撃ボタン生成",/data-intercept-army/.test(ui)],
  ["同季Field Battle除外追跡",/engagedArmies/.test(army)&&/excludeArmyIds/.test(army)],
  ["Army season resume state",/makeResumeState/.test(army)&&/resumeState/.test(army)],
  ["TurnがresumeArmyState保存",/pendingTacticalBattle\.resumeArmyState/.test(turn)],
  ["BattleAdapterがArmy resumeを引継ぐ",/armyResumeState: resumeArmyState/.test(adapter)],
  ["連続Tacticalを戦報後に再開可能",/battleFinish[\s\S]*pendingTacticalBattle[\s\S]*BattleAdapter\.openPending/.test(main)],
  ["bundleにPhase9.1変更を反映",[ui,army,turn,adapter,main].every(function(source){return bundle.indexOf(source.trim())>=0;})]
];
var fail=checks.filter(function(c){console.log((c[1]?"PASS ":"FAIL ")+c[0]);return !c[1];});
console.log((checks.length-fail.length)+" / "+checks.length+" PASS");
if(fail.length)process.exitCode=1;
