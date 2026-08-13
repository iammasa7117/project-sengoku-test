"use strict";
var fs=require("fs"),path=require("path"),root=path.resolve(__dirname,"..");
function read(p){return fs.readFileSync(path.join(root,p),"utf8");}
var tests=[];function test(name,fn){try{fn();tests.push([name,true]);}catch(e){tests.push([name,false,e.message]);}}function assert(v,m){if(!v)throw new Error(m||"assert");}
var index=read("index.html"),adapter=read("src/systems/battleAdapter.js"),tIndex=read("tactical/index.html"),bridge=read("tactical/js/integration/coreBridge.js"),tMain=read("tactical/js/main.js"),step=read("tactical/js/sim/step.js"),main=read("src/main.js"),css=read("styles/components.css"),tcss=read("tactical/css/battle.css");
test("Core loads BattleAdapter",function(){assert(index.indexOf('src/systems/battleAdapter.js')>=0);});
test("Core has full-screen Tactical iframe",function(){assert(index.indexOf('id="tacticalOverlay"')>=0&&index.indexOf('id="tacticalFrame"')>=0&&css.indexOf('.tactical-overlay')>=0);});
test("Core receives Tactical by postMessage boundary",function(){assert(adapter.indexOf('PROJECT_SENGOKU_TACTICAL_OUTCOME')>=0&&adapter.indexOf('event.source !== frame.contentWindow')>=0);});
test("Core never passes live state into iframe",function(){assert(adapter.indexOf('JSON.stringify(pending.battleSpec)')>=0&&adapter.indexOf('JSON.stringify(state)')<0);});
test("Tactical has no Sengoku namespace dependency",function(){var files=[];function walk(d){fs.readdirSync(d,{withFileTypes:true}).forEach(function(e){var p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.js$/.test(e.name))files.push(p);});}walk(path.join(root,'tactical/js'));var text=files.map(function(f){return fs.readFileSync(f,'utf8');}).join('\n');assert(text.indexOf('window.Sengoku')<0&&text.indexOf('S.Systems')<0);});
test("Tactical accepts BattleSpec bridge",function(){assert(tIndex.indexOf('js/integration/coreBridge.js')>=0&&bridge.indexOf('T.createBattleState = createFromSpec')>=0);});
test("Tactical outcome includes side/core IDs",function(){assert(tMain.indexOf('coreOfficerId')>=0&&tMain.indexOf('side:u.side')>=0);});
test("Variable unit defeat threshold preserves 7v7=5",function(){assert(step.indexOf('Math.ceil(playerUnits.length*5/7)')>=0);});
test("Mobile return button exists",function(){assert(bridge.indexOf('戦略画面へ結果を戻す')>=0&&tcss.indexOf('.bridge-return-btn')>=0);});
test("Season interruption opens Tactical",function(){assert(main.indexOf('interruptedByTactical')>=0&&main.indexOf('BattleAdapter.openPending')>=0);});
var pass=tests.filter(function(x){return x[1];}).length;tests.forEach(function(x){console.log((x[1]?'PASS ':'FAIL ')+x[0]+(x[2]?' :: '+x[2]:''));});console.log(pass+' / '+tests.length+' PASS');if(pass!==tests.length)process.exitCode=1;
