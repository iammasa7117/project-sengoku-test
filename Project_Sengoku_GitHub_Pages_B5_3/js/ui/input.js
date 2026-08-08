(function (T) {
  "use strict";
  var I={preview:null,gesture:null,manualFacing:null,facingPreview:null,longPressTimer:null};
  var DRAG_THRESHOLD_PX=11,WAYPOINT_GAP=26,MAX_POINTS=56,LONG_PRESS_MS=480,TARGET_SNAP_PX=42;
  function copyPoint(p){return{x:p.x,y:p.y};}
  function clientDistance(a,b){var dx=a.x-b.x,dy=a.y-b.y;return Math.sqrt(dx*dx+dy*dy);}
  function clampWorld(p){var f=T.FIELD;return{x:T.Vec.clamp(p.x,f.margin,f.width-f.margin),y:T.Vec.clamp(p.y,f.margin,f.height-f.margin)};}
  function clearTimer(){if(I.longPressTimer){clearTimeout(I.longPressTimer);I.longPressTimer=null;}}
  function clearGesture(canvas,pointerId){clearTimer();if(canvas&&pointerId!=null&&canvas.hasPointerCapture&&canvas.hasPointerCapture(pointerId)){try{canvas.releasePointerCapture(pointerId);}catch(e){}}I.gesture=null;I.preview=null;I.manualFacing=null;I.facingPreview=null;if(T.HUD&&T.HUD.setGestureBadge)T.HUD.setGestureBadge(null);}
  function clearRoute(u){if(T.Movement&&T.Movement.clearRoute)T.Movement.clearRoute(u);else{u.routePoints=[];u.routeIndex=0;u.finalFacing=null;u.plannedOrder=null;}}
  function routeLength(points){var n=0;for(var i=1;i<points.length;i++)n+=T.Vec.dist(points[i-1],points[i]);return n;}
  I.simplifyRoute=function(points){
    if(!points||points.length<2)return points||[];var out=[copyPoint(points[0])];
    for(var i=1;i<points.length-1;i++){if(T.Vec.dist(points[i],out[out.length-1])>=WAYPOINT_GAP)out.push(copyPoint(points[i]));if(out.length>=MAX_POINTS-1)break;}
    var last=copyPoint(points[points.length-1]);if(T.Vec.dist(last,out[out.length-1])>=8)out.push(last);else out[out.length-1]=last;return out;
  };
  I.selectUnit=function(unit){
    if(!T.state||!unit||unit.side!=="player"||unit.status!=="active")return false;
    T.state.selectedUnitId=unit.id;T.state.selectedUnitIds=[unit.id];T.state.orderMode=null;if(T.HUD){T.HUD.setSpeed(0);T.HUD.refresh();}return true;
  };
  function targetNear(pos){return T.Render.pickUnitNear?T.Render.pickUnitNear(T.state,pos,"enemy",TARGET_SNAP_PX):null;}
  function approachDirection(target,fromPoint){
    var ghost={position:fromPoint};return T.Combat.attackDirection(ghost,target);
  }
  function chargeCandidate(unit,target,points,direction){
    return !!(unit&&target&&T.Combat.canCharge(unit)&&direction!=="front"&&routeLength(points)>=T.Combat.constants.MIN_CHARGE_DISTANCE);
  }
  I.classifyRelease=function(unit,points,pos){
    var target=targetNear(pos);if(!target)return{type:"move",target:null,direction:null,charge:false};
    var approach=points.length>=2?points[points.length-2]:unit.position,dir=approachDirection(target,approach),charge=chargeCandidate(unit,target,points,dir);
    return{type:charge?"charge":"attack",target:target,direction:dir,charge:charge};
  };
  function standoffPoint(unit,target,from){
    var v=T.Vec.sub(from,target.position),n=T.Vec.norm(v);if(T.Vec.len(n)===0)n={x:0,y:1};var d=unit.radius+target.radius+8;
    return clampWorld({x:target.position.x+n.x*d,y:target.position.y+n.y*d});
  }
  I.commitGesture=function(unit,points,pos){
    var route=I.simplifyRoute(points).map(clampWorld);if(route.length<2||T.Vec.dist(route[0],route[route.length-1])<24)return false;
    var release=I.classifyRelease(unit,route,pos);clearRoute(unit);unit.targetPos=null;unit.targetUnitId=null;unit.chargeActive=false;unit.chargeDistance=0;
    if(release.target){
      var from=route.length>=2?route[route.length-2]:unit.position,approach=standoffPoint(unit,release.target,from);
      route[route.length-1]=approach;unit.targetUnitId=release.target.id;unit.plannedOrder=release.type;unit.orderType="routeAttack";unit.routePoints=route.slice(1);unit.routeIndex=0;unit.chargeActive=release.charge;
      if(T.HUD)T.HUD.flash(release.charge?"CHARGE READY":"攻撃命令");
    }else{
      unit.orderType="route";unit.routePoints=route.slice(1);unit.routeIndex=0;
    }
    if(T.HUD){T.HUD.setSpeed(1);T.HUD.refresh();}return true;
  };
  function beginManualFacing(unit,g){
    if(!I.gesture||I.gesture!==g||g.dragging)return;I.manualFacing={unitId:unit.id,origin:copyPoint(unit.position),angle:unit.facing};I.facingPreview={unitId:unit.id,angle:unit.facing};if(T.HUD)T.HUD.flash("向きを指定");
  }
  function updatePreview(unit,g,pos){
    var pts=g.points.map(copyPoint);if(T.Vec.dist(pos,pts[pts.length-1])>3)pts.push(copyPoint(pos));var release=I.classifyRelease(unit,pts,pos);
    I.preview={unitId:unit.id,points:pts,targetId:release.target?release.target.id:null,direction:release.direction,releaseType:release.type,chargeCandidate:release.charge,current:copyPoint(pos)};
    if(T.HUD&&T.HUD.setGestureBadge){var label=release.type==="move"?"移動":release.charge?"突撃候補":release.direction==="rear"?"REAR 攻撃":release.direction==="flank"?"FLANK 攻撃":"攻撃";T.HUD.setGestureBadge({text:label,pos:pos,kind:release.charge?"charge":release.direction||"move"});}
  }
  I.init=function(canvas){
    canvas.addEventListener("pointerdown",function(ev){
      ev.preventDefault();if(!T.state||T.state.status!=="running")return;var pos=T.Render.toWorld(ev.clientX,ev.clientY),picked=T.Render.pickUnit(T.state,pos);
      if(picked&&picked.side==="player"&&picked.status==="active"){
        I.selectUnit(picked);I.gesture={pointerId:ev.pointerId,unitId:picked.id,startClient:{x:ev.clientX,y:ev.clientY},points:[copyPoint(picked.position)],dragging:false};
        if(canvas.setPointerCapture)try{canvas.setPointerCapture(ev.pointerId);}catch(e){}
        clearTimer();I.longPressTimer=setTimeout(function(){beginManualFacing(picked,I.gesture);},LONG_PRESS_MS);return;
      }
      if(picked&&picked.side==="enemy"){
        if(T.HUD)T.HUD.flash("自軍部隊を選んでドラッグ");return;
      }
      T.state.selectedUnitId=null;T.state.selectedUnitIds=[];if(T.HUD)T.HUD.refresh();
    },{passive:false});
    canvas.addEventListener("pointermove",function(ev){
      if(!I.gesture||I.gesture.pointerId!==ev.pointerId)return;ev.preventDefault();var g=I.gesture,u=T.state.units[g.unitId],pos=clampWorld(T.Render.toWorld(ev.clientX,ev.clientY));
      if(I.manualFacing){var d=T.Vec.sub(pos,u.position);if(T.Vec.len(d)>10){I.manualFacing.angle=Math.atan2(d.y,d.x);I.facingPreview={unitId:u.id,angle:I.manualFacing.angle};}return;}
      if(!g.dragging&&clientDistance(g.startClient,{x:ev.clientX,y:ev.clientY})>=DRAG_THRESHOLD_PX){g.dragging=true;clearTimer();}
      if(!g.dragging)return;var last=g.points[g.points.length-1];if(T.Vec.dist(pos,last)>=WAYPOINT_GAP&&g.points.length<MAX_POINTS)g.points.push(copyPoint(pos));updatePreview(u,g,pos);
    },{passive:false});
    canvas.addEventListener("pointerup",function(ev){
      if(!I.gesture||I.gesture.pointerId!==ev.pointerId)return;ev.preventDefault();var g=I.gesture,u=T.state.units[g.unitId],pos=clampWorld(T.Render.toWorld(ev.clientX,ev.clientY));
      if(I.manualFacing){var d=T.Vec.sub(pos,u.position);if(T.Vec.len(d)>12){u.facing=I.manualFacing.angle;if(T.HUD)T.HUD.flash("向きを固定");}clearGesture(canvas,ev.pointerId);if(T.HUD)T.HUD.refresh();return;}
      if(g.dragging){if(T.Vec.dist(pos,g.points[g.points.length-1])>=8)g.points.push(copyPoint(pos));if(!I.commitGesture(u,g.points,pos)&&T.HUD)T.HUD.flash("もう少し長くドラッグ");}
      clearGesture(canvas,ev.pointerId);if(T.HUD)T.HUD.refresh();
    },{passive:false});
    canvas.addEventListener("pointercancel",function(ev){if(I.gesture&&I.gesture.pointerId===ev.pointerId){clearGesture(canvas,ev.pointerId);if(T.HUD)T.HUD.flash("命令をキャンセル");}},{passive:false});
  };
  I.constants={DRAG_THRESHOLD_PX:DRAG_THRESHOLD_PX,LONG_PRESS_MS:LONG_PRESS_MS,TARGET_SNAP_PX:TARGET_SNAP_PX};
  T.Input=I;
})(window.Tactical = window.Tactical || {});
