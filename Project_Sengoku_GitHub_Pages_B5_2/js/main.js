(function (T) {
  "use strict";
  function outcome(){
    var units=T.getUnits(T.state);var pLoss=0,eLoss=0;
    var list=units.map(function(u){var loss=u.troopsBefore-u.troops;if(u.side==="player")pLoss+=loss;else eLoss+=loss;return{id:u.id,officerId:u.officerId,unitType:u.unitType,troopsBefore:u.troopsBefore,troopsAfter:u.troops,morale:Math.round(u.morale*100)/100,status:u.status,chargeCooldown:u.chargeCooldown};});
    return{win:T.state.winner==="player",winner:T.state.winner,seed:T.state.seed,durationTicks:T.state.tick,attackerLoss:pLoss,defenderLoss:eLoss,units:list};
  }
  T.finishBattle=function(){if(T._finished)return;T._finished=true;T.clock.setSpeed(0);T.HUD.refresh();var r=outcome();T.HUD.showResult(r);console.log("TACTICAL_OUTCOME",JSON.stringify(r));T.HUD.flash(r.winner==="player"?"VICTORY":r.winner==="draw"?"DRAW":"DEFEAT");};
  function restart(){
    var seed=Number(document.getElementById("seedInput").value)||1597463007;T._finished=false;T.state=T.createBattleState(seed);T.clock=new T.Clock();T.HUD.setSpeed(0);T.HUD.setOrderMode(null);T.HUD.els.resultPanel.hidden=true;T.HUD.refresh();
  }
  function loop(ts){T.clock.frame(ts,function(){T.stepSimulation(T.state);});T.Render.render(T.state);T.HUD.refresh();requestAnimationFrame(loop);}
  window.addEventListener("DOMContentLoaded",function(){T.Render.init(document.getElementById("battlefield"));T.HUD.init();T.Input.init(document.getElementById("battlefield"));document.getElementById("restartBtn").addEventListener("click",restart);restart();requestAnimationFrame(loop);});
})(window.Tactical = window.Tactical || {});
