"use strict";
const fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, "..");
function read(f){return fs.readFileSync(path.join(root,f),"utf8");}
function assert(c,m){if(!c)throw new Error(m);}
let n=0; function test(c,m){assert(c,m);n++;}
const index=read("index.html"), siege=read("src/systems/siegeSystem.js"), battle=read("src/systems/battleSystem.js"), army=read("src/systems/armySystem.js"), valid=read("src/state/validateState.js"), map=read("src/ui/renderMap.js"), ui=read("src/ui/renderArmy.js"), css=read("styles/components.css"), schema=read("src/state/schema.js");
test(index.indexOf("siegeSystem.js")>=0 && index.indexOf("siegeSystem.js")<index.indexOf("battleSystem.js"),"siegeSystem script order");
test(/resolveLegacy/.test(siege)&&/resolveTactical/.test(siege)&&/continueSiege/.test(siege),"siege APIs");
test(/S\.Systems\.Siege\.resolveLegacy/.test(battle)&&/S\.Systems\.Siege\.resolveTactical/.test(battle),"battle delegates siege");
test(/besieging/.test(army)&&/continueSiege/.test(army),"army siege season path");
test(/besieging/.test(valid)&&/包囲Army/.test(valid),"validate siege state");
test(/besieging/.test(map)&&/包囲中/.test(map),"map siege marker");
test(/siege-status-card/.test(ui)&&/包囲継続/.test(ui),"mobile siege UI");
test(/army-marker\.besieging/.test(css)&&/siege-meter/.test(css),"siege CSS");
test(/version: 12/.test(schema)||/schemaVersion[^\n]*12/.test(schema),"schema remains 12");
console.log("Phase5 Siege static: "+n+"/"+n+" PASS");
