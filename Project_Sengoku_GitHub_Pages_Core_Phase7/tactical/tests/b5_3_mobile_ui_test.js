const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');global.window={};
['js/core/rng.js','js/core/vec.js','js/model/unitTypes.js','js/model/battleUnit.js','js/model/battleState.js','js/sim/movement.js','js/sim/morale.js','js/sim/combat.js','js/ui/input.js'].forEach(f=>vm.runInThisContext(fs.readFileSync(path.join(root,f),'utf8'),{filename:f}));
const T=window.Tactical;function assert(c,m){if(!c)throw new Error(m);}let n=0;function ok(c,m){assert(c,m);n++;}
{
 const s=T.createBattleState(1);ok(Array.isArray(s.selectedUnitIds),'selectedUnitIds architecture missing');ok(s.selectedUnitIds.length===0,'selectedUnitIds default not empty');ok(T.FIELD.width===1600&&T.FIELD.height===760,'landscape battlefield geometry missing');
}
{
 const s=T.createBattleState(2),u=s.units.p4,t=s.units.e1;T.state=s;u.position={x:500,y:500};t.position={x:800,y:500};t.facing=0;
 T.Render={pickUnitNear(){return t;}};
 let r=T.Input.classifyRelease(u,[{x:500,y:500},{x:800,y:500}],{x:800,y:500});ok(r.type==='charge','rear/side cavalry route should propose charge: '+JSON.stringify(r));ok(r.direction!=='front','charge candidate incorrectly front');
 t.facing=Math.PI; r=T.Input.classifyRelease(u,[{x:500,y:500},{x:800,y:500}],{x:800,y:500});ok(r.type==='attack','front cavalry should not auto-charge');ok(r.direction==='front','front classification missing');
}
{
 const s=T.createBattleState(3),u=s.units.p1;T.state=s;T.Render={pickUnitNear(){return null;}};const r=T.Input.classifyRelease(u,[{x:200,y:600},{x:400,y:500}],{x:400,y:500});ok(r.type==='move'&&!r.target,'empty-space drag should move');
}
{
 const s=T.createBattleState(4),u=s.units.p4,t=s.units.e1;u.position={x:300,y:600};t.position={x:900,y:350};T.state=s;T.Render={pickUnitNear(){return t;}};T.HUD={setSpeed(){},refresh(){},flash(){}};
 const committed=T.Input.commitGesture(u,[{x:300,y:600},{x:500,y:600},{x:700,y:500},{x:900,y:350}],{x:900,y:350});ok(committed,'routeAttack gesture did not commit');ok(u.orderType==='routeAttack','attack route not staged');ok(u.targetUnitId===t.id,'attack target missing');ok(u.routePoints.length>=2,'curved attack route missing');
}
{
 const s=T.createBattleState(5),u=s.units.p1;u.position={x:300,y:600};u.facing=0;u.orderType='route';u.routePoints=[{x:300,y:400}];for(let i=0;i<1000&&u.orderType==='route';i++)T.Movement.step(s,u);ok(u.facing<-.9&&u.facing>-2.2,'movement did not auto-face travel direction');ok(u.orderType==='wait','auto-facing route did not finish');
}
console.log('B5.3 mobile command tests: '+n+'/'+n+' PASS');
