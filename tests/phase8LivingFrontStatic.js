"use strict";
var fs = require("fs"), path = require("path"), root = path.resolve(__dirname, "..");
function read(file) { return fs.readFileSync(path.join(root, file), "utf8"); }
var checks = [
  ["タイトルがLiving Front v0.4", /Living Front v0\.4/.test(read("index.html"))],
  ["AI Army侵攻API", /launchArmyAttack/.test(read("src\/systems\/aiSystem.js"))],
  ["AI援軍API", /launchReinforcementArmy/.test(read("src\/systems\/aiSystem.js"))],
  ["自領援軍路API", /findFriendlyRoute/.test(read("src\/systems\/armySystem.js"))],
  ["脅威検出API", /threatsAgainstFaction/.test(read("src\/systems\/armySystem.js"))],
  ["Army missionフィールド", /mission: options\.mission/.test(read("src\/systems\/armySystem.js"))],
  ["敵軍接近表示", /敵軍/.test(read("src\/ui\/renderMap.js"))],
  ["Threat CSS", /army-marker\.enemy\.threat/.test(read("styles\/components.css"))]
];
var fail = checks.filter(function (c) { console.log((c[1] ? "PASS " : "FAIL ") + c[0]); return !c[1]; });
console.log((checks.length - fail.length) + " / " + checks.length + " PASS"); if (fail.length) process.exitCode = 1;
