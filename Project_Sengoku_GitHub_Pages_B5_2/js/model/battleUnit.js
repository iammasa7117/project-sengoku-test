(function (T) {
  "use strict";
  T.createUnit = function(spec){
    return {
      id:spec.id, officerId:spec.officerId, officerName:spec.officerName,
      side:spec.side, unitType:spec.unitType, troops:spec.troops, troopsBefore:spec.troops,
      maxTroops:spec.troops, morale:spec.morale || 80, isCommander:!!spec.isCommander,
      position:{x:spec.x,y:spec.y}, facing:spec.facing || (spec.side==="player"? -Math.PI/2 : Math.PI/2),
      radius:30 + Math.sqrt(spec.troops)*0.35,
      status:"active", orderType:"wait", targetPos:null, targetUnitId:null,
      routePoints:[], routeIndex:0, finalFacing:null,
      engagedWith:null, routTicks:0,
      reloadRemaining:0,
      chargeActive:false, chargeDistance:0, chargeCooldown:0,
      lastImpactLabel:null, lastImpactTick:-9999
    };
  };
})(window.Tactical = window.Tactical || {});
