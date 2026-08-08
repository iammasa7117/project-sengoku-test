(function (T) {
  "use strict";
  function activeCount(state,side){ return T.getUnits(state,side).filter(function(u){return u.status==="active";}).length; }
  function brokenCount(state,side){ return T.getUnits(state,side).filter(function(u){return u.status==="routed"||u.status==="destroyed";}).length; }
  function enemyAutoOrders(state){
    if(state.tick%12!==0) return;
    var players=T.getUnits(state,"player").filter(function(u){return u.status==="active";});
    T.getUnits(state,"enemy").forEach(function(u){
      if(u.status!=="active" || u.engagedWith) return;
      var current=u.targetUnitId?state.units[u.targetUnitId]:null;
      // B5.1: once an enemy chooses a valid target it keeps that target.
      // This prevents instant retarget/facing snaps that made player flanking unreadable.
      if(current && current.status==="active"){
        u.orderType="attack";u.targetPos=null;u.chargeActive=false;return;
      }
      var best=null,bestD=1e9; players.forEach(function(p){var d=T.Vec.dist(u.position,p.position);if(d<bestD){best=p;bestD=d;}});
      if(best){u.orderType="attack";u.targetUnitId=best.id;u.targetPos=null;u.chargeActive=false;}
    });
  }
  T.stepSimulation=function(state){
    if(state.status!=="running") return;
    state.tick++;
    state.visualEffects=(state.visualEffects||[]).filter(function(v){return v.expiresTick>=state.tick;});
    T.getUnits(state).forEach(function(u){if(u.chargeCooldown>0)u.chargeCooldown--;});
    enemyAutoOrders(state);
    T.getUnits(state).forEach(function(u){ if(u.status==="routed") T.Morale.stepRout(state,u); else T.Movement.step(state,u); });
    var pairs=T.Combat.resolveContacts(state);
    T.Combat.rangedFire(state);
    T.Combat.fightPairs(state,pairs);
    var eBroken=brokenCount(state,"enemy"), pBroken=brokenCount(state,"player");
    var playerCommander=T.getUnits(state,"player").filter(function(u){return u.isCommander;})[0];
    var enemyCommander=T.getUnits(state,"enemy").filter(function(u){return u.isCommander;})[0];
    var playerDefeated=pBroken>=5 || !playerCommander || playerCommander.status==="destroyed" || activeCount(state,"player")===0;
    var enemyDefeated=eBroken>=5 || !enemyCommander || enemyCommander.status==="destroyed" || activeCount(state,"enemy")===0;
    if(playerDefeated && enemyDefeated){
      var pTroops=T.getUnits(state,"player").reduce(function(sum,u){return sum+u.troops;},0);
      var eTroops=T.getUnits(state,"enemy").reduce(function(sum,u){return sum+u.troops;},0);
      state.status="finished"; state.winner=pTroops===eTroops?"draw":(pTroops>eTroops?"player":"enemy");
    }
    else if(enemyDefeated){state.status="finished";state.winner="player";}
    else if(playerDefeated){state.status="finished";state.winner="enemy";}
    else if(state.tick>=state.maxTicks){
      var pRemain=T.getUnits(state,"player").reduce(function(sum,u){return sum+u.troops;},0);
      var eRemain=T.getUnits(state,"enemy").reduce(function(sum,u){return sum+u.troops;},0);
      state.status="finished"; state.winner=pRemain===eRemain?"draw":(pRemain>eRemain?"player":"enemy"); state.timeout=true;
    }
    if(state.status==="finished" && T.finishBattle) T.finishBattle();
  };
})(window.Tactical = window.Tactical || {});
