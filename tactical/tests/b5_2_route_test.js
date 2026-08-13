const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');global.window={};
['js/core/rng.js','js/core/vec.js','js/model/unitTypes.js','js/model/battleUnit.js','js/model/battleState.js','js/sim/movement.js','js/sim/morale.js','js/sim/combat.js','js/ui/input.js'].forEach(f=>vm.runInThisContext(fs.readFileSync(path.join(root,f),'utf8'),{filename:f}));
const T=window.Tactical;function assert(c,m){if(!c)throw new Error(m);}let passed=0;function check(c,m){assert(c,m);passed++;}
{
 const pts=[{x:100,y:100},{x:140,y:100},{x:180,y:130},{x:220,y:180},{x:260,y:250}],out=T.Input.simplifyRoute(pts);
 check(out.length>=4,'route simplification too aggressive');check(out[0].x===100&&out[0].y===100,'route start changed');check(out.at(-1).x===260&&out.at(-1).y===250,'route end changed');
}
{
 const s=T.createBattleState(11),u=s.units.p1;u.position={x:300,y:600};u.orderType='route';u.routePoints=[{x:450,y:600},{x:520,y:520},{x:600,y:470}];
 for(let i=0;i<1600&&u.orderType==='route';i++)T.Movement.step(s,u);
 check(u.orderType==='wait','route did not finish');check(T.Vec.dist(u.position,{x:600,y:470})<7,'route endpoint mismatch');check(u.routePoints.length===0,'route not cleared');
}
check(T.createBattleState(12).facingPrompt===null,'legacy facing prompt should remain null');
console.log('B5.2 route compatibility tests: '+passed+'/'+passed+' PASS');
