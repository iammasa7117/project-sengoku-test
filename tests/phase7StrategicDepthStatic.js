"use strict";
const fs=require("fs"),path=require("path"); const root=path.resolve(__dirname,"..");
function read(f){return fs.readFileSync(path.join(root,f),"utf8");}
function assert(c,m){if(!c)throw new Error(m);} let n=0; function test(c,m){assert(c,m);n++;}
const index=read("index.html"), traits=read("src/data/castleTraits.js"), army=read("src/systems/armySystem.js"), officer=read("src/systems/officerSystem.js"), domestic=read("src/systems/domesticSystem.js"), ai=read("src/systems/aiSystem.js"), siege=read("src/systems/siegeSystem.js"), ui=read("src/ui/renderOfficers.js"), map=read("src/ui/renderMap.js"), mobile=read("src/ui/mobileCampaign.js"), css=read("styles/components.css")+read("styles/responsive.css"), schema=read("src/state/schema.js");
test(index.includes("src/data/castleTraits.js"),"castleTraits script missing");
test((traits.match(/modifiers:/g)||[]).length>=12,"all castle profiles missing");
test(/assignDomesticCommand/.test(officer)&&/setIdleCommand/.test(officer)&&/domesticOfficerAt/.test(officer),"officer role APIs missing");
test(/effectiveGoldYieldForCastle/.test(domestic)&&/assignmentEffects/.test(domestic),"assignment economy missing");
test(/findRoute/.test(army)&&/reachableEnemyTargets/.test(army)&&/remainingEta/.test(army),"strategic route APIs missing");
test(/strategicDefenseBonus/.test(siege)&&/castleProfileTitle/.test(siege),"castle siege identity missing");
test(/ensureAssignments/.test(ai),"AI role compatibility missing");
test(/castle-identity-card/.test(ui)&&/assignment-chip/.test(ui)&&/奉行に任命/.test(ui),"strategic mobile UI missing");
test(/castle-profile-mini/.test(map)&&/profile\.title/.test(mobile),"map/mobile castle identity missing");
test(/castle-identity-card/.test(css)&&/assignment-strip/.test(css)&&/strategic-route-record/.test(css),"Phase7 responsive CSS missing");
test(/version:\s*12/.test(schema)||/schemaVersion[^\n]*12/.test(schema),"schema changed unexpectedly");
console.log("Phase7 Strategic Depth static: "+n+"/"+n+" PASS");
