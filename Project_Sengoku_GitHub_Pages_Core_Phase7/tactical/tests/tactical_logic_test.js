const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.join(__dirname, '..');
global.window = {};
[
  'js/core/rng.js', 'js/core/vec.js', 'js/model/unitTypes.js',
  'js/model/battleUnit.js', 'js/model/battleState.js',
  'js/sim/movement.js', 'js/sim/morale.js', 'js/sim/combat.js', 'js/sim/step.js'
].forEach((file) => vm.runInThisContext(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file }));
const T = window.Tactical;
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function giveFixedOrders(state) {
  T.getUnits(state, 'player').forEach((p) => {
    let best = null, dist = Infinity;
    T.getUnits(state, 'enemy').forEach((e) => {
      const d = T.Vec.dist(p.position, e.position);
      if (d < dist) { dist = d; best = e; }
    });
    p.orderType = 'attack'; p.targetUnitId = best.id;
  });
}
function run(seed) {
  const s = T.createBattleState(seed); giveFixedOrders(s);
  while (s.status === 'running' && s.tick < 7000) T.stepSimulation(s);
  s.order.forEach((id) => {
    const u = s.units[id];
    assert(Number.isFinite(u.troops) && Number.isFinite(u.morale), 'NaN/Infinity: ' + id);
    assert(u.troops >= 0, 'negative troops: ' + id);
    assert(u.morale >= 0 && u.morale <= 100, 'morale range: ' + id);
  });
  return {
    winner: s.winner, tick: s.tick,
    units: s.order.map((id) => { const u=s.units[id]; return [id,u.troops,Math.round(u.morale*1000)/1000,u.status,Math.round(u.position.x*100)/100,Math.round(u.position.y*100)/100]; })
  };
}
const initial = T.createBattleState(123);
assert(T.getUnits(initial,'player').length === 7, 'player units != 7');
assert(T.getUnits(initial,'enemy').length === 7, 'enemy units != 7');
assert(T.getUnits(initial,'player').filter(u=>u.isCommander).length === 1, 'player commander != 1');
assert(T.getUnits(initial,'enemy').filter(u=>u.isCommander).length === 1, 'enemy commander != 1');
const moraleState = T.createBattleState(5), routed=moraleState.units.p1, friend=moraleState.units.p2;
routed.position={x:300,y:600}; friend.position={x:340,y:600}; routed.morale=0; T.Morale.rout(moraleState,routed,null);
assert(routed.status==='routed', 'morale 0 did not rout');
assert(friend.morale < 80, 'rout morale propagation missing');
const a = run(1597463007), b = run(1597463007), c = run(1597463008);
assert(a.winner && a.tick > 0, 'battle did not finish');
assert(JSON.stringify(a) === JSON.stringify(b), 'same seed + same commands not deterministic');
assert(JSON.stringify(a) !== JSON.stringify(c), 'different seed produced identical full result');
console.log('Tactical B1-B4 logic tests: 9/9 PASS');
console.log('deterministic sample:', a.winner, 'tick', a.tick);
