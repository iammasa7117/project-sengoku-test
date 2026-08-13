(function (T) {
  "use strict";
  T.Movement={};
  T.Movement.clearRoute=function(u){if(!u)return;u.routePoints=[];u.routeIndex=0;u.finalFacing=null;u.plannedOrder=null;};
  function finishRoute(state,u){
    var planned=u.plannedOrder,target=u.targetUnitId?state.units[u.targetUnitId]:null;
    u.routePoints=[];u.routeIndex=0;u.finalFacing=null;u.plannedOrder=null;u.targetPos=null;
    if((planned==="attack"||planned==="charge")&&target&&target.status==="active"){
      u.orderType=planned;u.chargeActive=planned==="charge";return;
    }
    u.orderType="wait";u.targetUnitId=null;u.chargeActive=false;u.chargeDistance=0;
  }
  T.Movement.step=function(state,u){
    if(!u||u.status!=="active")return;
    if(u.engagedWith&&(u.orderType==="attack"||u.orderType==="charge"||u.orderType==="route"||u.orderType==="routeAttack"))return;
    var dest=null,target=null;
    if(u.orderType==="route"||u.orderType==="routeAttack"){
      if(!u.routePoints||u.routePoints.length===0||u.routeIndex>=u.routePoints.length){finishRoute(state,u);return;}
      dest=u.routePoints[u.routeIndex];
    }
    if(u.orderType==="move"&&u.targetPos)dest=u.targetPos;
    if((u.orderType==="attack"||u.orderType==="charge")&&u.targetUnitId){
      target=state.units[u.targetUnitId];
      if(target&&target.status!=="destroyed"&&target.status!=="routed")dest=target.position;
      else{u.orderType="wait";u.targetUnitId=null;u.chargeActive=false;u.chargeDistance=0;}
    }
    if(!dest)return;
    var d=T.Vec.sub(dest,u.position),dist=T.Vec.len(d),type=T.UnitTypes[u.unitType];
    if(target&&type.range>0&&u.orderType==="attack"&&dist<=type.range*.88){var aim=T.Vec.norm(d);if(T.Vec.len(aim)>0)u.facing=Math.atan2(aim.y,aim.x);return;}
    if(dist<6){
      if(u.orderType==="route"||u.orderType==="routeAttack"){u.position.x=dest.x;u.position.y=dest.y;u.routeIndex++;if(u.routeIndex>=u.routePoints.length)finishRoute(state,u);}
      else if(u.orderType==="move"){u.orderType="wait";u.targetPos=null;}
      return;
    }
    var dir=T.Vec.norm(d);u.facing=Math.atan2(dir.y,dir.x);
    var isCharging=u.orderType==="charge"||(u.orderType==="routeAttack"&&u.plannedOrder==="charge"&&u.chargeActive);
    var speed=type.speed*(isCharging?1.22:1),step=Math.min(dist,speed*.1),f=T.FIELD;
    u.position.x=T.Vec.clamp(u.position.x+dir.x*step,f.margin,f.width-f.margin);u.position.y=T.Vec.clamp(u.position.y+dir.y*step,f.margin,f.height-f.margin);
    if(isCharging)u.chargeDistance+=step;
  };
})(window.Tactical = window.Tactical || {});
