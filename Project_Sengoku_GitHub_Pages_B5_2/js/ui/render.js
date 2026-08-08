(function (T) {
  "use strict";
  var R={canvas:null,ctx:null};
  function field(){return T.FIELD||{width:1200,height:800,enemyBaseDepth:75,playerBaseDepth:75};}
  function col(side){return side==="player"?"#3f8bd7":"#d2524a";}
  function drawGround(ctx){
    var f=field();ctx.fillStyle="#718363";ctx.fillRect(0,0,f.width,f.height);ctx.strokeStyle="rgba(255,255,255,.10)";ctx.lineWidth=2;
    for(var y=100;y<f.height;y+=100){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(f.width,y);ctx.stroke();}
    ctx.fillStyle="rgba(31,45,27,.28)";ctx.fillRect(0,0,f.width,f.enemyBaseDepth);ctx.fillRect(0,f.height-f.playerBaseDepth,f.width,f.playerBaseDepth);
    ctx.fillStyle="rgba(255,255,255,.65)";ctx.font="24px sans-serif";ctx.textAlign="center";ctx.fillText("敵本陣",f.width/2,46);ctx.fillText("自軍本陣",f.width/2,f.height-22);
  }
  function drawBar(ctx,x,y,w,h,value,color){ctx.fillStyle="rgba(0,0,0,.45)";ctx.fillRect(x,y,w,h);ctx.fillStyle=color;ctx.fillRect(x,y,w*T.Vec.clamp(value,0,1),h);}
  function drawPolyline(ctx,points,opts){
    if(!points||points.length<2)return;opts=opts||{};ctx.save();ctx.strokeStyle=opts.color||"#ffe45c";ctx.lineWidth=opts.width||7;ctx.lineCap="round";ctx.lineJoin="round";if(opts.dash)ctx.setLineDash(opts.dash);
    ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(var i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);ctx.stroke();ctx.setLineDash([]);
    if(opts.nodes){ctx.fillStyle=opts.nodeColor||"#42e7ff";for(var j=1;j<points.length-1;j++){ctx.beginPath();ctx.arc(points[j].x,points[j].y,5,0,Math.PI*2);ctx.fill();}}
    var a=points[points.length-2],b=points[points.length-1],ang=Math.atan2(b.y-a.y,b.x-a.x);ctx.translate(b.x,b.y);ctx.rotate(ang);ctx.fillStyle=opts.arrowColor||opts.color||"#ffe45c";ctx.beginPath();ctx.moveTo(17,0);ctx.lineTo(-10,-10);ctx.lineTo(-6,0);ctx.lineTo(-10,10);ctx.closePath();ctx.fill();ctx.restore();
  }
  function drawSelectedRange(ctx,u){
    if(!u)return;var type=T.UnitTypes[u.unitType];
    if(type.range>0){ctx.save();ctx.strokeStyle="rgba(255,222,138,.58)";ctx.fillStyle="rgba(255,222,138,.045)";ctx.lineWidth=3;ctx.setLineDash([12,9]);ctx.beginPath();ctx.arc(u.position.x,u.position.y,type.range,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();}
    if(u.targetUnitId && T.state && T.state.units[u.targetUnitId]){var t=T.state.units[u.targetUnitId];ctx.save();ctx.strokeStyle="rgba(255,255,255,.28)";ctx.lineWidth=2;ctx.setLineDash([8,8]);ctx.beginPath();ctx.moveTo(u.position.x,u.position.y);ctx.lineTo(t.position.x,t.position.y);ctx.stroke();ctx.restore();}
  }
  function drawActiveRoute(ctx,u){
    if(!u||u.orderType!=="route"||!u.routePoints||u.routePoints.length===0)return;var pts=[{x:u.position.x,y:u.position.y}].concat(u.routePoints.slice(u.routeIndex));drawPolyline(ctx,pts,{color:"rgba(69,226,255,.78)",width:5,dash:[13,10],nodes:true,nodeColor:"rgba(255,230,94,.9)"});
  }
  function drawUnit(ctx,u,selected){
    if(u.status==="destroyed") return;var size=Math.max(42,Math.min(84,40+Math.sqrt(u.troops)*1.05)); var hw=size/2,hh=size*.34;
    ctx.save();ctx.translate(u.position.x,u.position.y);ctx.rotate(u.facing+Math.PI/2);ctx.fillStyle=col(u.side);ctx.globalAlpha=u.status==="routed"?.66:1;ctx.lineWidth=selected?6:3;ctx.strokeStyle=selected?"#ffe18a":"rgba(255,255,255,.85)";if(u.status==="routed")ctx.setLineDash([8,6]);ctx.fillRect(-hw,-hh,size,hh*2);ctx.strokeRect(-hw,-hh,size,hh*2);ctx.setLineDash([]);ctx.strokeStyle=u.orderType==="charge"&&u.chargeActive?"#ffb44d":"#ffffff";ctx.lineWidth=u.orderType==="charge"&&u.chargeActive?10:7;ctx.beginPath();ctx.moveTo(-hw,-hh);ctx.lineTo(hw,-hh);ctx.stroke();ctx.fillStyle=u.orderType==="charge"&&u.chargeActive?"#ffb44d":"#fff";ctx.beginPath();ctx.moveTo(0,-hh-13);ctx.lineTo(-7,-hh-2);ctx.lineTo(7,-hh-2);ctx.closePath();ctx.fill();ctx.restore();ctx.globalAlpha=1;
    drawBar(ctx,u.position.x-size/2,u.position.y+hh+7,size,6,u.troops/u.maxTroops,"#e8d17d");drawBar(ctx,u.position.x-size/2,u.position.y+hh+15,size,6,u.morale/100,"#7cc576");ctx.fillStyle="#fff";ctx.font="bold 13px sans-serif";ctx.textAlign="center";ctx.fillText(T.UnitTypes[u.unitType].shortName+" "+u.troops,u.position.x,u.position.y+4);
    if(u.unitType==="teppo"){ctx.fillStyle="#fff0b3";ctx.font="11px sans-serif";ctx.fillText(u.reloadRemaining>0?"装填 "+(u.reloadRemaining/10).toFixed(1)+"s":"射撃可",u.position.x,u.position.y-28);}else if(u.chargeCooldown>0 && T.UnitTypes[u.unitType].canCharge){ctx.fillStyle="rgba(20,20,20,.86)";ctx.font="11px sans-serif";ctx.fillText("突撃 "+(u.chargeCooldown/10).toFixed(1)+"s",u.position.x,u.position.y-28);}
  }
  function drawEffects(ctx,state){(state.visualEffects||[]).forEach(function(v){if(v.type==="shot"){ctx.save();ctx.strokeStyle="rgba(255,242,166,.98)";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(v.from.x,v.from.y);ctx.lineTo(v.to.x,v.to.y);ctx.stroke();ctx.restore();return;}if(v.type==="label"){ctx.save();ctx.textAlign="center";ctx.font="900 28px sans-serif";ctx.lineWidth=6;ctx.strokeStyle="rgba(0,0,0,.72)";ctx.strokeText(v.text,v.x,v.y);ctx.fillStyle=v.color||"#fff7d6";ctx.fillText(v.text,v.x,v.y);ctx.restore();}});}
  function drawGesturePreview(ctx){if(!T.Input||!T.Input.preview||!T.Input.preview.points)return;drawPolyline(ctx,T.Input.preview.points,{color:"#ffe45c",width:8,nodes:true,nodeColor:"#45e8ff",arrowColor:"#ffe45c"});}
  function drawFacingPrompt(ctx,prompt){
    if(!prompt)return;var f=field();ctx.save();ctx.fillStyle="rgba(0,0,0,.58)";ctx.fillRect(0,0,f.width,f.height);drawPolyline(ctx,prompt.routePoints,{color:"#ffe45c",width:8,nodes:true,nodeColor:"#45e8ff"});
    ctx.textAlign="center";ctx.font="900 34px sans-serif";ctx.lineWidth=8;ctx.strokeStyle="rgba(0,0,0,.75)";ctx.strokeText("移動後に向く方向を選んでください",f.width/2,75);ctx.fillStyle="#fff";ctx.fillText("移動後に向く方向を選んでください",f.width/2,75);
    var c=prompt.selectorCenter||prompt.destination;if(T.Vec.dist(c,prompt.destination)>4){ctx.strokeStyle="rgba(255,228,92,.75)";ctx.lineWidth=4;ctx.setLineDash([8,8]);ctx.beginPath();ctx.moveTo(prompt.destination.x,prompt.destination.y);ctx.lineTo(c.x,c.y);ctx.stroke();ctx.setLineDash([]);}
    var centers=[];for(var i=0;i<8;i++){var a=-Math.PI/2+i*Math.PI/4;centers.push({x:c.x+Math.cos(a)*115,y:c.y+Math.sin(a)*115,angle:a});}
    centers.forEach(function(p){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.fillStyle="rgba(13,94,108,.78)";ctx.strokeStyle="#45e8ff";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(30,0);ctx.lineTo(-20,-22);ctx.lineTo(-12,0);ctx.lineTo(-20,22);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();});
    ctx.fillStyle="#45dff4";ctx.strokeStyle="#ffe45c";ctx.lineWidth=6;ctx.beginPath();ctx.arc(c.x,c.y,34,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle="#102026";ctx.font="bold 15px sans-serif";ctx.fillText("取消",c.x,c.y+5);ctx.restore();
  }
  R.init=function(canvas){R.canvas=canvas;R.ctx=canvas.getContext("2d");};
  R.render=function(state){var ctx=R.ctx;drawGround(ctx);var selected=state.units[state.selectedUnitId];drawActiveRoute(ctx,selected);drawSelectedRange(ctx,selected);drawEffects(ctx,state);state.order.forEach(function(id){var u=state.units[id];drawUnit(ctx,u,state.selectedUnitId===id);});drawGesturePreview(ctx);drawFacingPrompt(ctx,state.facingPrompt);};
  R.toWorld=function(clientX,clientY){var rect=R.canvas.getBoundingClientRect(),f=field();return{x:(clientX-rect.left)*f.width/rect.width,y:(clientY-rect.top)*f.height/rect.height};};
  R.pickUnit=function(state,pos){var best=null,bestD=1e9;state.order.forEach(function(id){var u=state.units[id];if(!u||u.status==="destroyed")return;var d=T.Vec.dist(pos,u.position);if(d<Math.max(48,u.radius)&&d<bestD){best=u;bestD=d;}});return best;};
  T.Render=R;
})(window.Tactical = window.Tactical || {});
