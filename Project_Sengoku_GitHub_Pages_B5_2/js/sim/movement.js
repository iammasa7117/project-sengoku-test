(function (T) {
  "use strict";
  T.Movement = {};
  T.Movement.clearRoute=function(u){
    if(!u)return;
    u.routePoints=[];u.routeIndex=0;u.finalFacing=null;
  };
  function finishRoute(u){
    var face=u.finalFacing;
    u.orderType="wait";u.targetPos=null;u.targetUnitId=null;u.routePoints=[];u.routeIndex=0;u.finalFacing=null;
    if(Number.isFinite(face))u.facing=face;
  }
  T.Movement.step=function(state,u){
    if(!u || u.status!=="active") return;
    if(u.engagedWith && (u.orderType==="attack" || u.orderType==="charge" || u.orderType==="route")) return;
    var dest=null, target=null;
    if(u.orderType==="route"){
      if(!u.routePoints || u.routePoints.length===0){finishRoute(u);return;}
      if(u.routeIndex>=u.routePoints.length){finishRoute(u);return;}
      dest=u.routePoints[u.routeIndex];
    }
    if(u.orderType==="move" && u.targetPos) dest=u.targetPos;
    if((u.orderType==="attack" || u.orderType==="charge") && u.targetUnitId){
      target=state.units[u.targetUnitId];
      if(target && target.status!=="destroyed" && target.status!=="routed") dest=target.position;
      else {u.orderType="wait";u.targetUnitId=null;u.chargeActive=false;}
    }
    if(!dest) return;
    var d=T.Vec.sub(dest,u.position), dist=T.Vec.len(d);
    var type=T.UnitTypes[u.unitType];
    if(target && type.range>0 && u.orderType==="attack" && dist<=type.range*0.88){
      var aim=T.Vec.norm(d); if(T.Vec.len(aim)>0) u.facing=Math.atan2(aim.y,aim.x); return;
    }
    if(dist<6){
      if(u.orderType==="route"){
        u.position.x=dest.x;u.position.y=dest.y;u.routeIndex++;
        if(u.routeIndex>=u.routePoints.length)finishRoute(u);
      }else if(u.orderType==="move"){
        u.orderType="wait";u.targetPos=null;
      }
      return;
    }
    var dir=T.Vec.norm(d); u.facing=Math.atan2(dir.y,dir.x);
    var speed=type.speed * (u.orderType==="charge" ? 1.22 : 1);
    var step=Math.min(dist,speed*0.1);
    var f=T.FIELD||{width:1200,height:800,margin:35};
    u.position.x=T.Vec.clamp(u.position.x+dir.x*step,f.margin,f.width-f.margin);
    u.position.y=T.Vec.clamp(u.position.y+dir.y*step,f.margin,f.height-f.margin);
    if(u.orderType==="charge" && u.chargeActive) u.chargeDistance += step;
  };
})(window.Tactical = window.Tactical || {});
