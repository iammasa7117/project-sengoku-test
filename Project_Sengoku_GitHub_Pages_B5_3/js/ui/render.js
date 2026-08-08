(function (T) {
  "use strict";
  var R={canvas:null,ctx:null};
  function f(){return T.FIELD;}function col(side){return side==="player"?"#3f8bd7":"#d2524a";}
  function drawGround(ctx){var F=f();ctx.fillStyle="#718363";ctx.fillRect(0,0,F.width,F.height);ctx.strokeStyle="rgba(255,255,255,.08)";ctx.lineWidth=2;for(var x=100;x<F.width;x+=100){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,F.height);ctx.stroke();}for(var y=100;y<F.height;y+=100){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(F.width,y);ctx.stroke();}ctx.fillStyle="rgba(30,46,27,.25)";ctx.fillRect(0,0,F.width,F.enemyBaseDepth);ctx.fillRect(0,F.height-F.playerBaseDepth,F.width,F.playerBaseDepth);}
  function drawBar(ctx,x,y,w,h,v,c){ctx.fillStyle="rgba(0,0,0,.5)";ctx.fillRect(x,y,w,h);ctx.fillStyle=c;ctx.fillRect(x,y,w*T.Vec.clamp(v,0,1),h);}
  function drawPolyline(ctx,pts,opts){if(!pts||pts.length<2)return;opts=opts||{};ctx.save();ctx.strokeStyle=opts.color||"#ffe45c";ctx.lineWidth=opts.width||7;ctx.lineCap="round";ctx.lineJoin="round";if(opts.dash)ctx.setLineDash(opts.dash);ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(var i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);ctx.stroke();ctx.setLineDash([]);var a=pts[pts.length-2],b=pts[pts.length-1],ang=Math.atan2(b.y-a.y,b.x-a.x);ctx.translate(b.x,b.y);ctx.rotate(ang);ctx.fillStyle=opts.arrowColor||opts.color||"#ffe45c";ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(-9,-10);ctx.lineTo(-5,0);ctx.lineTo(-9,10);ctx.closePath();ctx.fill();ctx.restore();}
  function drawActiveRoute(ctx,u){if(!u||(u.orderType!=="route"&&u.orderType!=="routeAttack")||!u.routePoints||!u.routePoints.length)return;drawPolyline(ctx,[copy(u.position)].concat(u.routePoints.slice(u.routeIndex)),{color:"rgba(84,225,255,.7)",width:4,dash:[12,9]});}
  function copy(p){return{x:p.x,y:p.y};}
  function sector(ctx,c,r1,r2,a0,a1,color,alpha,stroke){ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.beginPath();ctx.arc(c.x,c.y,r2,a0,a1);ctx.arc(c.x,c.y,r1,a1,a0,true);ctx.closePath();ctx.fill();if(stroke){ctx.globalAlpha=.95;ctx.strokeStyle=color;ctx.lineWidth=4;ctx.stroke();}ctx.restore();}
  function drawAttackZones(ctx,target,active){
    var r1=target.radius+18,r2=r1+62,b=target.facing,pi=Math.PI;
    sector(ctx,target.position,r1,r2,b-pi/3,b+pi/3,"#90a4b9",active==="front"?.30:.10,active==="front");
    sector(ctx,target.position,r1,r2,b+pi/3,b+2*pi/3,"#ffad45",active==="flank"?.40:.14,active==="flank");
    sector(ctx,target.position,r1,r2,b-2*pi/3,b-pi/3,"#ffad45",active==="flank"?.40:.14,active==="flank");
    sector(ctx,target.position,r1,r2,b+2*pi/3,b+4*pi/3,"#ff5e52",active==="rear"?.42:.14,active==="rear");
  }
  function drawUnit(ctx,u,selected){
    if(u.status==="destroyed")return;var size=Math.max(40,Math.min(78,38+Math.sqrt(u.troops)*.92)),hw=size/2,hh=size*.32;
    ctx.save();ctx.translate(u.position.x,u.position.y);ctx.rotate(u.facing+Math.PI/2);ctx.globalAlpha=u.status==="routed"?.58:1;ctx.fillStyle=col(u.side);ctx.strokeStyle=selected?"#ffe173":"rgba(255,255,255,.82)";ctx.lineWidth=selected?6:3;if(u.status==="routed")ctx.setLineDash([7,5]);ctx.fillRect(-hw,-hh,size,hh*2);ctx.strokeRect(-hw,-hh,size,hh*2);ctx.setLineDash([]);ctx.strokeStyle=u.chargeActive?"#ffb44d":"#fff";ctx.lineWidth=u.chargeActive?9:6;ctx.beginPath();ctx.moveTo(-hw,-hh);ctx.lineTo(hw,-hh);ctx.stroke();ctx.fillStyle=u.chargeActive?"#ffb44d":"#fff";ctx.beginPath();ctx.moveTo(0,-hh-12);ctx.lineTo(-7,-hh-2);ctx.lineTo(7,-hh-2);ctx.closePath();ctx.fill();ctx.restore();ctx.globalAlpha=1;
    drawBar(ctx,u.position.x-size/2,u.position.y+hh+6,size,5,u.troops/u.maxTroops,"#f0d878");drawBar(ctx,u.position.x-size/2,u.position.y+hh+13,size,5,u.morale/100,"#75d281");
    ctx.fillStyle="#fff";ctx.font="900 13px sans-serif";ctx.textAlign="center";ctx.fillText(T.UnitTypes[u.unitType].shortName,u.position.x,u.position.y+4);
    if(u.isCommander){ctx.fillStyle="#ffe36b";ctx.font="900 19px sans-serif";ctx.fillText("★",u.position.x+hw*.75,u.position.y-hh-8);}
  }
  function drawEffects(ctx,state){(state.visualEffects||[]).forEach(function(v){if(v.type==="shot"){ctx.save();ctx.strokeStyle="rgba(255,242,166,.98)";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(v.from.x,v.from.y);ctx.lineTo(v.to.x,v.to.y);ctx.stroke();ctx.restore();}else if(v.type==="label"){ctx.save();ctx.textAlign="center";ctx.font="900 27px sans-serif";ctx.lineWidth=6;ctx.strokeStyle="rgba(0,0,0,.7)";ctx.strokeText(v.text,v.x,v.y);ctx.fillStyle=v.color||"#fff7d6";ctx.fillText(v.text,v.x,v.y);ctx.restore();}});}
  function drawGesture(ctx,state){var p=T.Input&&T.Input.preview;if(!p||!p.points)return;if(p.targetId&&state.units[p.targetId])drawAttackZones(ctx,state.units[p.targetId],p.direction);drawPolyline(ctx,p.points,{color:p.chargeCandidate?"#ffd43f":"#ffe45c",width:p.chargeCandidate?9:7});if(p.current){ctx.save();ctx.textAlign="center";ctx.font="900 18px sans-serif";ctx.fillStyle=p.direction==="rear"?"#ff796d":p.direction==="flank"?"#ffc05e":"#fff2a4";var label=p.chargeCandidate?"CHARGE?":p.direction==="rear"?"REAR":p.direction==="flank"?"FLANK":"";if(label){ctx.lineWidth=5;ctx.strokeStyle="rgba(0,0,0,.7)";ctx.strokeText(label,p.current.x,p.current.y-58);ctx.fillText(label,p.current.x,p.current.y-58);}ctx.restore();}}
  function drawFacingPreview(ctx,state){var p=T.Input&&T.Input.facingPreview;if(!p)return;var u=state.units[p.unitId];if(!u)return;ctx.save();ctx.translate(u.position.x,u.position.y);ctx.rotate(p.angle);ctx.strokeStyle="#45e8ff";ctx.fillStyle="#45e8ff";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(100,0);ctx.stroke();ctx.translate(100,0);ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(-10,-11);ctx.lineTo(-5,0);ctx.lineTo(-10,11);ctx.closePath();ctx.fill();ctx.restore();}
  R.init=function(canvas){R.canvas=canvas;R.ctx=canvas.getContext("2d");};
  R.render=function(state){var ctx=R.ctx;drawGround(ctx);var selected=state.units[state.selectedUnitId];drawActiveRoute(ctx,selected);drawEffects(ctx,state);state.order.forEach(function(id){var u=state.units[id];drawUnit(ctx,u,state.selectedUnitId===id);});drawGesture(ctx,state);drawFacingPreview(ctx,state);};
  R.toWorld=function(clientX,clientY){var rect=R.canvas.getBoundingClientRect(),F=f();return{x:(clientX-rect.left)*F.width/rect.width,y:(clientY-rect.top)*F.height/rect.height};};
  R.clientPxToWorld=function(px){var rect=R.canvas.getBoundingClientRect(),F=f();return px*(F.width/rect.width);};
  R.pickUnit=function(state,pos){return R.pickUnitNear(state,pos,null,28);};
  R.pickUnitNear=function(state,pos,side,cssRadius){var best=null,bestD=1e9,hit=R.clientPxToWorld?R.clientPxToWorld(cssRadius||28):50;state.order.forEach(function(id){var u=state.units[id];if(!u||u.status==="destroyed"||(side&&u.side!==side))return;var d=T.Vec.dist(pos,u.position);if(d<Math.max(hit,u.radius)&&d<bestD){best=u;bestD=d;}});return best;};
  T.Render=R;
})(window.Tactical = window.Tactical || {});
