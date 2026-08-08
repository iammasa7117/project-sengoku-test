(function (T) {
  "use strict";
  var C={};
  var MATCHUP={
    ashigaru:{ashigaru:1.0,samurai:0.9,teppo:1.1,kiba:1.3},
    samurai:{ashigaru:1.3,samurai:1.0,teppo:1.2,kiba:1.0},
    teppo:{ashigaru:1.2,samurai:1.2,teppo:1.0,kiba:0.8},
    kiba:{ashigaru:0.8,samurai:1.1,teppo:1.6,kiba:1.0}
  };
  var DIRECTION={front:{damage:1.0,morale:1.0},flank:{damage:1.5,morale:2.0},rear:{damage:2.2,morale:3.0}};
  var MIN_CHARGE_DISTANCE=70, CHARGE_COOLDOWN=180;
  function living(u){return u && (u.status==="active"||u.status==="routed") && u.troops>0;}
  function angleDiff(a,b){return Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));}
  C.resolveContacts=function(state){
    var units=T.getUnits(state), pairs=[], nearest={};
    units.forEach(function(a){a.engagedWith=null;});
    for(var i=0;i<units.length;i++) for(var j=i+1;j<units.length;j++){
      var a=units[i], b=units[j]; if(a.side===b.side||!living(a)||!living(b)||a.status==="routed"||b.status==="routed") continue;
      var distance=T.Vec.dist(a.position,b.position);
      if(distance <= a.radius+b.radius+5){
        pairs.push([a,b]);
        if(nearest[a.id]===undefined||distance<nearest[a.id]){nearest[a.id]=distance;a.engagedWith=b.id;}
        if(nearest[b.id]===undefined||distance<nearest[b.id]){nearest[b.id]=distance;b.engagedWith=a.id;}
      }
    }
    return pairs;
  };
  C.troopStrengthFactor=function(u){
    var ratio=T.Vec.clamp(u.troops/Math.max(1,u.maxTroops),0,1);
    return Math.sqrt(ratio);
  };
  C.matchupMultiplier=function(attacker,defender){return MATCHUP[attacker.unitType][defender.unitType];};
  C.attackDirection=function(attacker,defender){
    var angleToAttacker=Math.atan2(attacker.position.y-defender.position.y,attacker.position.x-defender.position.x);
    var diff=angleDiff(angleToAttacker,defender.facing);
    if(diff<=Math.PI/3) return "front";
    if(diff<=Math.PI*2/3) return "flank";
    return "rear";
  };
  C.directionModifier=function(direction){return DIRECTION[direction] || DIRECTION.front;};
  C.canCharge=function(u){var type=T.UnitTypes[u.unitType];return !!(type&&type.canCharge&&u.status==="active"&&u.chargeCooldown<=0);};
  C.chargeReadyForImpact=function(u){return C.canCharge(u)&&u.orderType==="charge"&&u.chargeActive&&u.chargeDistance>=MIN_CHARGE_DISTANCE;};
  C.previewLosses=function(state,a,b,context){
    context=context||{};
    var ta=T.UnitTypes[a.unitType], tb=T.UnitTypes[b.unitType];
    var jitterA=0.92+state.rng.float()*0.16, jitterB=0.92+state.rng.float()*0.16;
    var moraleA=Math.max(.25,a.morale/100), moraleB=Math.max(.25,b.morale/100);
    var forceA=C.troopStrengthFactor(a), forceB=C.troopStrengthFactor(b);
    var dirA=context.dirA||C.attackDirection(a,b), dirB=context.dirB||C.attackDirection(b,a);
    var dmA=C.directionModifier(dirA), dmB=C.directionModifier(dirB);
    var attackA=(a.unitType==="teppo"?(ta.meleeAttack||ta.attack):ta.attack);
    var attackB=(b.unitType==="teppo"?(tb.meleeAttack||tb.attack):tb.attack);
    var chargeA=context.chargeA?(ta.chargeMultiplier||1):1;
    var chargeB=context.chargeB?(tb.chargeMultiplier||1):1;
    var rawA=(attackA*moraleA*forceA/tb.defense)*C.matchupMultiplier(a,b)*dmA.damage*chargeA*jitterA*6.0;
    var rawB=(attackB*moraleB*forceB/ta.defense)*C.matchupMultiplier(b,a)*dmB.damage*chargeB*jitterB*6.0;
    return {
      lossA:Math.max(1,Math.round(rawB)), lossB:Math.max(1,Math.round(rawA)),
      dirA:dirA,dirB:dirB,
      moraleToB:dmA.morale*(context.chargeA?(ta.chargeMoraleMultiplier||1):1),
      moraleToA:dmB.morale*(context.chargeB?(tb.chargeMoraleMultiplier||1):1)
    };
  };
  C._announceImpact=function(state,u,target,direction,isCharge){
    var label=isCharge?"CHARGE!":direction==="rear"?"REAR!":direction==="flank"?"FLANK!":null;
    if(!label) return;
    if(u.lastImpactLabel===label && state.tick-u.lastImpactTick<35) return;
    u.lastImpactLabel=label;u.lastImpactTick=state.tick;
    state.visualEffects=state.visualEffects||[];
    state.visualEffects.push({type:"label",text:label,x:target.position.x,y:target.position.y-58,color:label==="REAR!"?"#ff7c67":label==="FLANK!"?"#ffd76a":"#ffb44d",expiresTick:state.tick+14});
    T.Morale.message(state,label+" "+u.officerName+" → "+target.officerName);
  };
  C._consumeCharge=function(u){
    u.chargeActive=false;u.chargeDistance=0;u.chargeCooldown=CHARGE_COOLDOWN;
    if(u.orderType==="charge")u.orderType="attack";
  };
  C.fightPairs=function(state,pairs){
    var pending={}, moraleMult={}, chargeConsumed=[];
    pairs.forEach(function(pair){
      var a=pair[0],b=pair[1]; if(a.status!=="active"||b.status!=="active")return;
      var dirA=C.attackDirection(a,b),dirB=C.attackDirection(b,a);
      var chargeA=C.chargeReadyForImpact(a),chargeB=C.chargeReadyForImpact(b);
      var losses=C.previewLosses(state,a,b,{dirA:dirA,dirB:dirB,chargeA:chargeA,chargeB:chargeB});
      pending[a.id]=(pending[a.id]||0)+losses.lossA;
      pending[b.id]=(pending[b.id]||0)+losses.lossB;
      moraleMult[a.id]=Math.max(moraleMult[a.id]||1,losses.moraleToA);
      moraleMult[b.id]=Math.max(moraleMult[b.id]||1,losses.moraleToB);
      C._announceImpact(state,a,b,dirA,chargeA);C._announceImpact(state,b,a,dirB,chargeB);
      if(chargeA)chargeConsumed.push(a);else if(a.orderType==="charge"&&a.chargeActive&&a.engagedWith===b.id){a.chargeActive=false;a.chargeDistance=0;a.orderType="attack";}
      if(chargeB)chargeConsumed.push(b);else if(b.orderType==="charge"&&b.chargeActive&&b.engagedWith===a.id){b.chargeActive=false;b.chargeDistance=0;b.orderType="attack";}
    });
    Object.keys(pending).forEach(function(id){var u=state.units[id];if(u&&u.status==="active")u.troops=Math.max(0,u.troops-pending[id]);});
    Object.keys(pending).forEach(function(id){var u=state.units[id];if(u&&u.status==="active")T.Morale.applyLoss(state,u,pending[id],null,true,moraleMult[id]||1);});
    chargeConsumed.forEach(function(u){C._consumeCharge(u);});
    Object.keys(pending).forEach(function(id){var u=state.units[id];if(u&&u.status==="active"&&u.troops<=0)T.Morale.destroy(state,u,"壊滅");});
    Object.keys(pending).forEach(function(id){var u=state.units[id];if(u&&u.status==="active"&&u.morale<=0&&u.troops>0)T.Morale.rout(state,u,null);});
  };
  C.fightPair=function(state,a,b){ C.fightPairs(state,[[a,b]]); };
  C.rangedFire=function(state){
    var all=T.getUnits(state);
    all.forEach(function(u){
      if(u.status!=="active")return;
      if(u.reloadRemaining>0){u.reloadRemaining--;return;}
      var type=T.UnitTypes[u.unitType]; if(!type.range||u.engagedWith)return;
      var enemies=T.getUnits(state,u.side==="player"?"enemy":"player").filter(function(e){return e.status==="active";});
      var target=null;
      if(u.targetUnitId){var explicit=state.units[u.targetUnitId];if(explicit&&explicit.status==="active"&&T.Vec.dist(u.position,explicit.position)<=type.range)target=explicit;}
      if(!target){var bd=type.range+1;enemies.forEach(function(e){var d=T.Vec.dist(u.position,e.position);if(d<=type.range&&d<bd){bd=d;target=e;}});}
      if(!target)return;
      var d=T.Vec.sub(target.position,u.position);u.facing=Math.atan2(d.y,d.x);
      var direction=C.attackDirection(u,target),dm=C.directionModifier(direction);
      var jitter=0.9+state.rng.float()*0.2;
      var force=C.troopStrengthFactor(u),morale=Math.max(.25,u.morale/100);
      var raw=(type.attack*morale*force/T.UnitTypes[target.unitType].defense)*C.matchupMultiplier(u,target)*dm.damage*jitter*4.5;
      var loss=Math.max(1,Math.round(raw));
      state.visualEffects=state.visualEffects||[];
      state.visualEffects.push({type:"shot",from:{x:u.position.x,y:u.position.y},to:{x:target.position.x,y:target.position.y},expiresTick:state.tick+8});
      state.visualEffects.push({type:"label",text:"FIRE!",x:u.position.x,y:u.position.y-55,color:"#ffe18a",expiresTick:state.tick+8});
      target.troops=Math.max(0,target.troops-loss);
      T.Morale.applyLoss(state,target,loss,u,true,dm.morale*1.15);
      if(direction!=="front")C._announceImpact(state,u,target,direction,false);
      u.reloadRemaining=type.reloadTicks||24;
      if(target.troops<=0)T.Morale.destroy(state,target,"鉄砲で壊滅");
      else if(target.morale<=0)T.Morale.rout(state,target,u);
    });
  };
  C.constants={MIN_CHARGE_DISTANCE:MIN_CHARGE_DISTANCE,CHARGE_COOLDOWN:CHARGE_COOLDOWN,MATCHUP:MATCHUP,DIRECTION:DIRECTION};
  T.Combat=C;
})(window.Tactical = window.Tactical || {});
