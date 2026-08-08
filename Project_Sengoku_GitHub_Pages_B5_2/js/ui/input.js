(function (T) {
  "use strict";
  var I={preview:null,gesture:null};
  var DRAG_THRESHOLD_PX=12, WAYPOINT_GAP=28, MAX_POINTS=64, SELECTOR_RADIUS=115, SELECTOR_HIT=42;
  function clampWorld(p){
    var f=T.FIELD||{width:1200,height:800,margin:35};
    return{x:T.Vec.clamp(p.x,f.margin,f.width-f.margin),y:T.Vec.clamp(p.y,f.margin,f.height-f.margin)};
  }
  function clientDistance(a,b){var dx=a.x-b.x,dy=a.y-b.y;return Math.sqrt(dx*dx+dy*dy);}
  function copyPoint(p){return{x:p.x,y:p.y};}
  function clearGesture(canvas,pointerId){
    if(canvas&&pointerId!=null&&canvas.hasPointerCapture&&canvas.hasPointerCapture(pointerId)){try{canvas.releasePointerCapture(pointerId);}catch(e){}}
    I.gesture=null;I.preview=null;
  }
  function clearRoute(u){if(T.Movement&&T.Movement.clearRoute)T.Movement.clearRoute(u);else{u.routePoints=[];u.routeIndex=0;u.finalFacing=null;}}
  I.facingAngle=function(index){return -Math.PI/2 + index*(Math.PI/4);};
  I.facingCenters=function(prompt){
    var c=prompt.selectorCenter||prompt.destination,out=[];
    for(var i=0;i<8;i++){var a=I.facingAngle(i);out.push({index:i,angle:a,x:c.x+Math.cos(a)*SELECTOR_RADIUS,y:c.y+Math.sin(a)*SELECTOR_RADIUS});}
    return out;
  };
  I.pickFacingDirection=function(prompt,pos){
    var centers=I.facingCenters(prompt),best=-1,bestD=Infinity;
    centers.forEach(function(c){var d=T.Vec.dist(c,pos);if(d<SELECTOR_HIT&&d<bestD){best=c.index;bestD=d;}});
    return best;
  };
  I.simplifyRoute=function(points){
    if(!points||points.length<2)return points||[];
    var out=[copyPoint(points[0])];
    for(var i=1;i<points.length-1;i++){
      if(T.Vec.dist(points[i],out[out.length-1])>=WAYPOINT_GAP)out.push(copyPoint(points[i]));
      if(out.length>=MAX_POINTS-1)break;
    }
    var last=copyPoint(points[points.length-1]);
    if(T.Vec.dist(last,out[out.length-1])>=8)out.push(last);else out[out.length-1]=last;
    return out;
  };
  I.beginFacingPrompt=function(unit,points){
    if(!unit||!points||points.length<2)return false;
    var route=I.simplifyRoute(points).map(clampWorld),destination=route[route.length-1],f=T.FIELD||{width:1200,height:800};
    if(T.Vec.dist(route[0],destination)<40)return false;
    T.state.facingPrompt={unitId:unit.id,routePoints:route,destination:copyPoint(destination),selectorCenter:{x:T.Vec.clamp(destination.x,175,f.width-175),y:T.Vec.clamp(destination.y,175,f.height-175)}};
    T.state.orderMode=null;T.HUD.setOrderMode(null);T.HUD.setSpeed(0);T.HUD.showHint("経路を確定しました。移動後に部隊が向く方向を8方向から選んでください。");
    return true;
  };
  I.commitFacing=function(index){
    var prompt=T.state&&T.state.facingPrompt;if(!prompt)return false;
    var u=T.state.units[prompt.unitId];if(!u||u.status!=="active"){T.state.facingPrompt=null;return false;}
    clearRoute(u);u.orderType="route";u.routePoints=prompt.routePoints.slice(1).map(copyPoint);u.routeIndex=0;u.finalFacing=I.facingAngle(index);u.targetPos=null;u.targetUnitId=null;u.chargeActive=false;u.chargeDistance=0;
    T.state.facingPrompt=null;T.HUD.showHint("経路移動を開始。黄色い線に沿って進み、到着後は指定した方向を向きます。");T.HUD.setSpeed(1);T.HUD.refresh();return true;
  };
  I.cancelFacing=function(){if(T.state)T.state.facingPrompt=null;T.HUD.showHint("経路指定をキャンセルしました。");T.HUD.refresh();};
  function handleFacingPointer(pos){
    var prompt=T.state&&T.state.facingPrompt;if(!prompt)return false;
    var center=prompt.selectorCenter||prompt.destination;
    if(T.Vec.dist(pos,center)<38){I.cancelFacing();return true;}
    var index=I.pickFacingDirection(prompt,pos);if(index>=0){I.commitFacing(index);return true;}
    T.HUD.flash("8方向の矢印を選んでください");return true;
  }
  I.init=function(canvas){
    canvas.addEventListener("pointerdown",function(ev){
      ev.preventDefault(); if(!T.state||T.state.status!=="running") return;
      var pos=T.Render.toWorld(ev.clientX,ev.clientY);
      if(T.state.facingPrompt){handleFacingPointer(pos);return;}
      var picked=T.Render.pickUnit(T.state,pos);var selected=T.state.units[T.state.selectedUnitId];
      if(T.state.orderMode==="move" && selected && selected.side==="player" && selected.status==="active" && (!picked || picked.id!==selected.id)){
        clearRoute(selected);selected.orderType="move"; selected.targetPos=clampWorld(pos); selected.targetUnitId=null;selected.chargeActive=false;selected.chargeDistance=0; T.state.orderMode=null; T.HUD.setOrderMode(null); T.HUD.setSpeed(1); return;
      }
      if((T.state.orderMode==="attack"||T.state.orderMode==="charge") && selected && picked && picked.side==="enemy" && picked.status==="active"){
        var mode=T.state.orderMode;if(mode==="charge"&&!T.Combat.canCharge(selected)){T.HUD.flash("突撃はまだ使えません");return;}
        clearRoute(selected);selected.orderType=mode;selected.targetUnitId=picked.id;selected.targetPos=null;selected.chargeActive=mode==="charge";selected.chargeDistance=0;T.state.orderMode=null;T.HUD.setOrderMode(null);T.HUD.setSpeed(1);return;
      }
      if(picked && picked.side==="player" && picked.status==="active"){
        T.state.selectedUnitId=picked.id;T.state.orderMode=null;T.HUD.setOrderMode(null);T.HUD.setSpeed(0);T.HUD.refresh();
        I.gesture={pointerId:ev.pointerId,unitId:picked.id,startClient:{x:ev.clientX,y:ev.clientY},points:[copyPoint(picked.position)],current:copyPoint(picked.position),dragging:false};I.preview={unitId:picked.id,points:I.gesture.points};
        if(canvas.setPointerCapture)try{canvas.setPointerCapture(ev.pointerId);}catch(e){}
      }
    },{passive:false});
    canvas.addEventListener("pointermove",function(ev){
      if(!I.gesture||I.gesture.pointerId!==ev.pointerId)return;ev.preventDefault();
      var g=I.gesture;if(!g.dragging&&clientDistance(g.startClient,{x:ev.clientX,y:ev.clientY})>=DRAG_THRESHOLD_PX){g.dragging=true;T.HUD.showHint("そのまま指で移動経路をなぞってください。指を離すと移動後の向きを選べます。");}
      if(!g.dragging)return;
      var pos=clampWorld(T.Render.toWorld(ev.clientX,ev.clientY)),last=g.points[g.points.length-1];g.current=pos;
      if(T.Vec.dist(pos,last)>=WAYPOINT_GAP&&g.points.length<MAX_POINTS)g.points.push(copyPoint(pos));
      var preview=g.points.map(copyPoint);if(T.Vec.dist(pos,preview[preview.length-1])>3)preview.push(copyPoint(pos));
      I.preview={unitId:g.unitId,points:preview};
    },{passive:false});
    canvas.addEventListener("pointerup",function(ev){
      if(!I.gesture||I.gesture.pointerId!==ev.pointerId)return;ev.preventDefault();var g=I.gesture,u=T.state.units[g.unitId];
      if(g.dragging){var pos=clampWorld(T.Render.toWorld(ev.clientX,ev.clientY));if(T.Vec.dist(pos,g.points[g.points.length-1])>=8)g.points.push(copyPoint(pos));var ok=I.beginFacingPrompt(u,g.points);if(!ok)T.HUD.flash("もう少し長く経路をなぞってください");}
      clearGesture(canvas,ev.pointerId);T.HUD.refresh();
    },{passive:false});
    canvas.addEventListener("pointercancel",function(ev){if(I.gesture&&I.gesture.pointerId===ev.pointerId){clearGesture(canvas,ev.pointerId);T.HUD.showHint("経路指定をキャンセルしました。");}},{passive:false});
  };
  T.Input=I;
})(window.Tactical = window.Tactical || {});
