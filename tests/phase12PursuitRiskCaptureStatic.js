"use strict";
var fs=require("fs"),path=require("path"),root=path.resolve(__dirname,"..");
function read(file){return fs.readFileSync(path.join(root,file),"utf8");}
var army=read("src/systems/armySystem.js"),prisoner=read("src/systems/prisonerSystem.js"),ui=read("src/ui/renderArmy.js");
var checks=[
  ["追撃戦後profile",/pursuitAftermathSnapshot/.test(army)&&/pursuitAftermathFromReport/.test(army)],
  ["捕縛率",/pursuitCaptureChance/.test(army)&&/captureChance/.test(army)],
  ["深追いリスク",/pursuitRiskChance/.test(army)&&/riskChance/.test(army)],
  ["既存Prisonerへ接続",/S\.Systems\.Prisoner\.capture/.test(army)],
  ["捕虜silent対応",/options\.silent/.test(prisoner)],
  ["総大将軽傷risk",/pursuitCommanderInjury/.test(army)&&/"軽傷"/.test(army)],
  ["追加疲労risk",/pursuitExtraFatigue/.test(army)&&/extraFatigue = 6/.test(army)],
  ["Save scum抑制のstable roll",/pursuitStableRoll/.test(army)&&/Math\.imul/.test(army)],
  ["追撃UIに捕縛見込み",/捕縛見込み/.test(ui)],
  ["追撃UIに深追いリスク",/深追いリスク/.test(ui)],
  ["schemaVersion変更なし",!/schemaVersion\s*=\s*13/.test(army)]
];
var pass=0;checks.forEach(function(c){if(c[1])pass++;else process.stderr.write("FAIL: "+c[0]+"\n");});console.log(pass+" / "+checks.length+" PASS");if(pass!==checks.length)process.exitCode=1;
