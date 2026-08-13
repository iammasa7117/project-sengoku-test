const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
global.window={};
['js/core/rng.js','js/core/vec.js','js/model/unitTypes.js','js/model/battleUnit.js','js/model/battleState.js','js/sim/movement.js','js/sim/morale.js','js/sim/combat.js','js/sim/step.js'].forEach(f=>vm.runInThisContext(fs.readFileSync(path.join(root,f),'utf8'),{filename:f}));
const T=window.Tactical;
function assert(c,m){if(!c)throw new Error(m);}
const full=T.createBattleState(100), weak=T.createBattleState(100);
const fa=full.units.p1, fb=full.units.e1, wa=weak.units.p1, wb=weak.units.e1;
fa.troops=fa.maxTroops=1000; fb.troops=fb.maxTroops=1000;
wa.troops=20; wa.maxTroops=1000; wb.troops=wb.maxTroops=1000;
assert(Math.abs(T.Combat.troopStrengthFactor(fa)-1)<1e-12,'full factor != 1');
assert(T.Combat.troopStrengthFactor(wa)<0.2,'20/1000 factor not sufficiently reduced');
const fullLoss=T.Combat.previewLosses(full,fa,fb);
const weakLoss=T.Combat.previewLosses(weak,wa,wb);
assert(fullLoss.lossB>weakLoss.lossB,'full and weak attacker deal same/non-decreasing damage: '+JSON.stringify({fullLoss,weakLoss}));
// damaged defender may still hit normally; only attacker manpower scales its own output.
assert(fullLoss.lossA===weakLoss.lossA,'defender output changed despite same defender state and seed');
console.log('Troop strength tests: 4/4 PASS', {fullAttackerDamage:fullLoss.lossB, weakAttackerDamage:weakLoss.lossB, weakFactor:T.Combat.troopStrengthFactor(wa)});
