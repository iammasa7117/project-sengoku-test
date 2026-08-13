"use strict";
var fs=require("fs"),path=require("path"),root=path.resolve(__dirname,"..");
function read(file){return fs.readFileSync(path.join(root,file),"utf8");}
var army=read("src/systems/armySystem.js"),ui=read("src/ui/renderArmy.js"),index=read("index.html"),bundle=read("01_START_GAME.html");
var checks=[
  ["追撃profile API",/A\.pursuitProfile/.test(army)&&/pursuitProfileSnapshot/.test(army)],
  ["騎馬比率を追撃率へ反映",/unit\.unitType === "kiba"/.test(army)&&/cavalryRatio \* 0\.16/.test(army)],
  ["武将能力を追撃率へ反映",/might - 50/.test(army)&&/leadership - 50/.test(army)],
  ["動的疲労コスト",/pursuitFatigueCost/.test(army)&&/fatigueCost/.test(army)],
  ["AI追撃API",/A\.resolveAIPursuit/.test(army)&&/shouldPursue/.test(army)],
  ["AI深追い抑制",/fatigue <= 82/.test(army)&&/深追いを避け/.test(army)],
  ["Phase10旧戦報fallback",/report && report\.pursuitRate/.test(army)&&/: 0\.18/.test(army)&&/: 8/.test(army)],
  ["追撃UIに予想値",/予想追加損害/.test(ui)&&/騎馬/.test(ui)&&/総大将疲労/.test(ui)],
  ["Phase11以降タイトル",/Phase (?:11|12)/.test(index)&&/PHASE (?:11|12)/.test(index)],
  ["schemaVersion変更なし",!/schemaVersion\s*=\s*13/.test(army)]
];
var pass=0;checks.forEach(function(c){if(c[1])pass++;else process.stderr.write("FAIL: "+c[0]+"\n");});console.log(pass+" / "+checks.length+" PASS");if(pass!==checks.length)process.exitCode=1;
