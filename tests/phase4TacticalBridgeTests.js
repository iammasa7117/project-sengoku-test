"use strict";
const fs=require('fs'),vm=require('vm'),path=require('path');const root=path.resolve(__dirname,'..','tactical');
function assert(c,m){if(!c)throw new Error(m||'assert');}
const spec={version:1,battleId:'bridge_test',seed:123456,maxTicks:999,attacker:{units:[{id:'core_u1',coreUnitId:'core_u1',coreOfficerId:'o1',officerId:'o1',officerName:'武将一',unitType:'kiba',troops:750,maxTroops:1000,morale:75,isCommander:true},{id:'core_u2',coreUnitId:'core_u2',coreOfficerId:'o2',officerId:'o2',officerName:'武将二',unitType:'teppo',troops:500,maxTroops:500,morale:68}]},defender:{units:[{id:'d1',officerId:'d1',officerName:'守備一',unitType:'ashigaru',troops:500,maxTroops:500,morale:70,isCommander:true},{id:'d2',officerId:'d2',officerName:'守備二',unitType:'ashigaru',troops:500,maxTroops:500,morale:70},{id:'d3',officerId:'d3',officerName:'守備三',unitType:'samurai',troops:250,maxTroops:250,morale:70}]}};
global.window={location:{search:'?integrated=1&spec='+encodeURIComponent(JSON.stringify(spec))},addEventListener:function(){}};
['js/core/rng.js','js/core/vec.js','js/model/unitTypes.js','js/model/battleUnit.js','js/model/battleState.js','js/integration/coreBridge.js'].forEach(f=>vm.runInThisContext(fs.readFileSync(path.join(root,f),'utf8'),{filename:f}));
const T=window.Tactical,state=T.createBattleState(123456);
assert(T.Integration.integrated,'bridge did not activate');
assert(T.getUnits(state,'player').length===2,'player count');assert(T.getUnits(state,'enemy').length===3,'enemy count');
assert(state.units.core_u1.troops===750&&state.units.core_u1.maxTroops===1000,'troops/max not preserved');
assert(state.units.core_u1.coreOfficerId==='o1'&&state.units.core_u1.coreUnitId==='core_u1','core refs not preserved');
assert(state.maxTicks===999&&state.seed===123456,'battle metadata not preserved');
assert(T.getUnits(state,'player').filter(u=>u.isCommander).length===1,'player commander missing');
assert(T.getUnits(state,'enemy').filter(u=>u.isCommander).length===1,'enemy commander missing');
console.log('Phase4 Tactical BattleSpec bridge: 7/7 PASS');
