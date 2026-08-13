"use strict";
var fs=require("fs"),path=require("path"),root=path.resolve(__dirname,"..");
function read(f){return fs.readFileSync(path.join(root,f),"utf8")} function exists(f){return fs.existsSync(path.join(root,f))}
var html=read("index.html"), army=read("src/ui/renderArmy.js"), dip=read("src/ui/renderDiplomacy.js"), council=read("src/ui/commandVisual.js"), css=read("styles/strategicVisual.css"), main=read("src/main.js");
var checks=[
 ["UI-2 title marker",/Strategic Visual UI-2/.test(html)],
 ["command visual module loaded",/src\/ui\/commandVisual\.js/.test(html)],
 ["army planner is strategic visual modal",/sv-deploy-screen/.test(army)&&/strategic-visual-modal/.test(army)],
 ["army planner preserves required deployment ids",["armyTarget","armyOfficer1","armyType1","armyTroops1"].every(function(x){return army.indexOf(x)>=0})],
 ["diplomacy overview cards exist",/sv-diplomacy-card/.test(dip)],
 ["diplomacy action grid exists",/sv-diplomacy-actions/.test(dip)],
 ["council full-screen visual exists",/U\.showCouncilVisual/.test(council)],
 ["main routes council to visual",/showCouncilVisual/.test(main)],
 ["army placeholder art exists",exists("assets/ui/army-camp.svg")],
 ["diplomacy placeholder art exists",exists("assets/ui/diplomacy-scroll.svg")],
 ["council placeholder art exists",exists("assets/ui/council-hall.svg")],
 ["mobile UI-2 rules exist",/sv-deploy-grid/.test(css)&&/sv-diplomacy-grid/.test(css)&&/sv-council-grid/.test(css)&&/orientation:landscape/.test(css)]
];
var fail=checks.filter(function(c){console.log((c[1]?"PASS ":"FAIL ")+c[0]);return !c[1]});console.log((checks.length-fail.length)+" / "+checks.length+" PASS");if(fail.length)process.exitCode=1;
