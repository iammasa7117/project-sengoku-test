"use strict";
var fs=require("fs"),path=require("path"),root=path.resolve(__dirname,"..");
function read(file){return fs.readFileSync(path.join(root,file),"utf8");}
var army=read("src/systems/armySystem.js"),map=read("src/ui/renderMap.js"),ui=read("src/ui/renderArmy.js"),main=read("src/main.js"),validate=read("src/state/validateState.js"),css=read("styles/components.css"),bundle=read("01_START_GAME.html");
var checks=[
  ["敗走開始API",/A\.beginFieldRetreat/.test(army)&&/status = "returning"/.test(army)],
  ["敗走は次季帰還",/army\.status === "returning"[\s\S]*retreat_arrival/.test(army)],
  ["returning ETA",/army\.status === "returning"\) return currentSegment/.test(army)],
  ["敗走State validation",/敗走中Armyの退却状態/.test(validate)],
  ["地図に敗走Armyを表示",/army\.status !== "returning"/.test(map)&&/\? "退"/.test(map)],
  ["Army詳細に敗走表示",/\? "敗走中"/.test(ui)&&/\? "撤退"/.test(ui)],
  ["敗走marker CSS",/\.army-marker\.returning/.test(css)],
  ["追撃API",/A\.canPursue/.test(army)&&/A\.resolvePursuit/.test(army)&&/A\.declinePursuit/.test(army)],
  ["追撃戦報メタデータ",/pursuitAvailable/.test(army)&&/pursuitResolved/.test(army)&&/battleTurn/.test(army)],
  ["追撃UI",/data-pursue-battle/.test(ui)&&/data-decline-pursuit/.test(ui)],
  ["追撃click handler",/dataset\.pursueBattle/.test(main)&&/dataset\.declinePursuit/.test(main)],
  ["bundle同期",[army,map,ui,main,validate,css].every(function(source){return bundle.indexOf(source.trim())>=0;})]
];
var fail=checks.filter(function(c){console.log((c[1]?"PASS ":"FAIL ")+c[0]);return !c[1];});
console.log((checks.length-fail.length)+" / "+checks.length+" PASS"); if(fail.length)process.exitCode=1;
