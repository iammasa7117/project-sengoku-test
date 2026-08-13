"use strict";
var fs=require("fs"),path=require("path"),root=path.resolve(__dirname,".."); function read(f){return fs.readFileSync(path.join(root,f),"utf8");}
var checks=[
 ["迎撃判定API",/A\.canIntercept/.test(read("src/systems/armySystem.js"))],
 ["迎撃出陣API",/A\.deployIntercept/.test(read("src/systems/armySystem.js"))],
 ["Army接触検出API",/A\.findEnemyContact/.test(read("src/systems/armySystem.js"))],
 ["野戦自動解決API",/resolveFieldBattleLegacy/.test(read("src/systems/armySystem.js"))],
 ["Tactical野戦Spec",/buildArmyBattleSpec/.test(read("src/systems/battleAdapter.js"))],
 ["Tactical野戦pending",/kind:\s*"field_battle"/.test(read("src/systems/battleAdapter.js"))],
 ["迎撃UI",/showInterceptPlanner/.test(read("src/ui/renderArmy.js"))],
 ["迎撃ボタンhandler",/dataset\.interceptArmy/.test(read("src/main.js"))],
 ["野戦会戦結果分岐",/pending\.kind === "field_battle"/.test(read("src/systems/battleAdapter.js"))]
];
var fail=checks.filter(function(c){console.log((c[1]?"PASS ":"FAIL ")+c[0]);return !c[1];}); console.log((checks.length-fail.length)+" / "+checks.length+" PASS"); if(fail.length)process.exitCode=1;
