(function (T) {
  "use strict";
  var M={};
  M.message=function(state,text){ state.eventMessages.push({tick:state.tick,text:text}); if(state.eventMessages.length>30) state.eventMessages.shift(); if(T.HUD) T.HUD.flash(text); };
  M.applyLoss=function(state,u,loss,enemy,deferRout,moraleMultiplier){
    if(u.status!=="active") return;
    var ratio=loss/Math.max(1,u.maxTroops);
    var moraleLoss=(ratio*210 + (loss>=10?0.4:0)) * (moraleMultiplier || 1);
    u.morale=Math.max(0,u.morale-moraleLoss);
    if(!deferRout && u.morale<=0 && u.troops>0) M.rout(state,u,enemy);
  };
  M.rout=function(state,u,enemy){
    if(u.status!=="active") return;
    u.status="routed"; u.orderType="rout"; u.targetUnitId=null; u.targetPos=null; u.routTicks=0; u.chargeActive=false;
    M.message(state,"ROUT! "+u.officerName);
    T.getUnits(state,u.side).forEach(function(friend){
      if(friend.id===u.id || friend.status!=="active") return;
      var d=T.Vec.dist(friend.position,u.position);
      if(d<140){ friend.morale=Math.max(0,friend.morale-(d<80?12:7)); if(friend.morale<=0) M.rout(state,friend,u); }
    });
  };
  M.destroy=function(state,u,reason){ if(u.status==="destroyed") return; u.status="destroyed"; u.troops=0; u.morale=0; u.chargeActive=false; M.message(state,reason+" "+u.officerName); };
  M.stepRout=function(state,u){
    if(u.status!=="routed") return;
    u.routTicks++;
    var f=T.FIELD||{height:800,margin:10}; var targetY=u.side==="player"?f.height-f.margin:f.margin; var d={x:0,y:targetY-u.position.y}; var dir=T.Vec.norm(d);
    u.facing=Math.atan2(dir.y,dir.x); u.position.y=T.Vec.clamp(u.position.y+dir.y*3.6,f.margin,f.height-f.margin);
    if(u.routTicks%12===0){u.troops=Math.max(0,u.troops-1);}
    if(u.troops<=0) M.destroy(state,u,"敗走中壊滅");
  };
  T.Morale=M;
})(window.Tactical = window.Tactical || {});
