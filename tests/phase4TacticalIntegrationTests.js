(function(S,T){
  "use strict";
  function fresh(){var state=S.State.createInitialState();state.campaign.status="playing";state.settings.aiEnabled=false;return state;}
  function rng(v){return function(){return v;};}
  function deploy(state,troops){return S.Systems.Army.deployAndMarch(state,"kiyosu","narumi",[{officerId:"keiketsu",unitType:"ashigaru",troops:troops||40},{officerId:"kanenobu",unitType:"kiba",troops:Math.max(10,Math.floor((troops||40)/2))}],{commanderId:"keiketsu",factionId:"aotsuki",consumeCommand:false});}
  function valid(state){var v=S.State.validateState(state);T.assert(v.ok,v.errors.join(" / "));}
  function resultFor(pending,winner,playerRatio,enemyRatio){
    var units=[];playerRatio=playerRatio===undefined?.8:playerRatio;enemyRatio=enemyRatio===undefined?.35:enemyRatio;
    pending.battleSpec.attacker.units.forEach(function(u){var after=Math.max(0,Math.floor(u.troops*playerRatio));units.push({id:u.id,officerId:u.officerId,coreOfficerId:u.coreOfficerId,side:"player",troopsBefore:u.troops,troopsAfter:after,morale:after?70:0,status:after?"active":"destroyed"});});
    pending.battleSpec.defender.units.forEach(function(u){var after=Math.max(0,Math.floor(u.troops*enemyRatio));units.push({id:u.id,officerId:u.officerId,coreOfficerId:u.coreOfficerId,side:"enemy",troopsBefore:u.troops,troopsAfter:after,morale:after?45:0,status:after?"active":"destroyed"});});
    return {winner:winner,seed:pending.seed,durationTicks:321,attackerLoss:pending.battleSpec.attacker.units.reduce(function(s,u,i){return s+u.troops-units[i].troopsAfter;},0),defenderLoss:pending.battleSpec.defender.units.reduce(function(s,u){return s+Math.floor(u.troops*(1-enemyRatio));},0),units:units};
  }

  T.test("Phase4: BattleAdapter APIが存在",function(){T.equal(typeof S.Systems.BattleAdapter.buildBattleSpec,"function");T.equal(typeof S.Systems.BattleAdapter.translateResult,"function");});

  T.test("Phase4: BattleSpecはCore state参照ではなくplain dataを生成",function(){var state=fresh(),d=deploy(state,40);T.assert(d.ok);var spec=S.Systems.BattleAdapter.buildBattleSpec(state,d.stateChanges.armyId);T.assert(spec&&spec.attacker.units.length===2);T.equal(spec.context.armyId,d.stateChanges.armyId);T.equal(spec.attacker.units[0].id,Object.keys(state.units)[0]);T.equal(spec.state,undefined);T.equal(JSON.parse(JSON.stringify(spec)).battleId,spec.battleId);});

  T.test("Phase4: プレイヤーArmy到着でLegacy解決せずTactical待機",function(){var state=fresh(),d=deploy(state,40);T.assert(d.ok);var phase=S.Systems.Army.advanceSeason(state,{random:rng(.9),allowTactical:true});T.assert(phase.ok,phase.errors.join(" / "));var army=state.armies[d.stateChanges.armyId];T.equal(army.status,"in_battle");T.assert(state.events.pendingTacticalBattle);T.equal(state.campaign.battleCount,0);valid(state);});

  T.test("Phase4: allowTactical=falseでは従来Legacy Battleを維持",function(){var state=fresh();S.Systems.Unit.setGuardTroops(state,"narumi",8);state.castles.narumi.defense=0;state.castles.narumi.morale=40;var d=deploy(state,40);T.assert(d.ok);var phase=S.Systems.Army.advanceSeason(state,{random:rng(.99),allowTactical:false});T.assert(phase.ok,phase.errors.join(" / "));T.equal(state.events.pendingTacticalBattle,null);T.equal(Object.keys(state.armies).length,0);T.assert(state.campaign.battleCount>=1);valid(state);});

  T.test("Phase4: Turn.advanceはTactical到着時に季節後半を停止",function(){var state=fresh(),season=state.campaign.season,turn=state.campaign.turn,d=deploy(state,40);T.assert(d.ok);var r=S.Systems.Turn.advance(state,{skipAI:true,random:rng(.9)});T.assert(r.ok,r.errors.join(" / "));T.equal(r.stateChanges.interruptedByTactical,true);T.equal(state.campaign.season,season);T.equal(state.campaign.turn,turn+1);T.assert(state.events.pendingTacticalBattle.resumeSeason);valid(state);});

  T.test("Phase4: Tactical勝利結果をCoreへ適用し占領後に季節再開",function(){var state=fresh(),d=deploy(state,40);T.assert(d.ok);var advance=S.Systems.Turn.advance(state,{skipAI:true,random:rng(.9)});T.assert(advance.stateChanges.interruptedByTactical);var pending=state.events.pendingTacticalBattle,res=S.Systems.BattleAdapter.translateResult(state,pending,resultFor(pending,"player",.8,.1));T.assert(res);var applied=S.Systems.Battle.applyOutcome(state,pending,res);T.assert(applied.ok,applied.errors.join(" / "));T.equal(state.castles.narumi.factionId,"aotsuki");T.equal(state.events.pendingTacticalBattle,null);T.equal(Object.keys(state.armies).length,0);var resumed=S.Systems.Turn.resumeAfterTactical(state,{skipAI:true,random:rng(.9)});T.assert(resumed.ok);T.equal(state.campaign.season,1);T.equal(state.campaign.battleCount,1);valid(state);});

  T.test("Phase4: Tactical敗北でArmy生存兵と武将が出陣元へ帰還",function(){var state=fresh(),before=state.castles.kiyosu.guardTroops,d=deploy(state,40);T.assert(d.ok);var phase=S.Systems.Army.advanceSeason(state,{random:rng(.2),allowTactical:true});T.assert(phase.ok);var pending=state.events.pendingTacticalBattle,res=S.Systems.BattleAdapter.translateResult(state,pending,resultFor(pending,"enemy",.35,.8));var applied=S.Systems.Battle.applyOutcome(state,pending,res);T.assert(applied.ok,applied.errors.join(" / "));T.equal(state.castles.narumi.factionId,"tokizawa");T.equal(Object.keys(state.armies).length,0);T.equal(state.officers.keiketsu.castleId,"kiyosu");T.assert(state.castles.kiyosu.guardTroops<before);valid(state);});

  T.test("Phase4: Tactical引き分けは勝者なしとして双方損耗後に帰還",function(){var state=fresh(),d=deploy(state,40);T.assert(d.ok);S.Systems.Army.advanceSeason(state,{allowTactical:true,random:rng(.5)});var pending=state.events.pendingTacticalBattle,res=S.Systems.BattleAdapter.translateResult(state,pending,resultFor(pending,"draw",.55,.55));T.equal(res.winnerFactionId,null);T.equal(res.draw,true);var applied=S.Systems.Battle.applyOutcome(state,pending,res);T.assert(applied.ok,applied.errors.join(" / "));T.equal(applied.stateChanges.draw,true);T.equal(state.castles.narumi.factionId,"tokizawa");T.equal(state.officers.keiketsu.castleId,"kiyosu");valid(state);});

  T.test("Phase4: seed不一致のTactical結果は拒否",function(){var state=fresh(),d=deploy(state,40);T.assert(d.ok);S.Systems.Army.advanceSeason(state,{allowTactical:true,random:rng(.5)});var pending=state.events.pendingTacticalBattle,bad=resultFor(pending,"player",.8,.2);bad.seed=(bad.seed+1)>>>0;T.equal(S.Systems.BattleAdapter.translateResult(state,pending,bad),null);});

  T.test("Phase4: pending Tactical Battleをschema12のまま保存復元可能",function(){localStorage.data={};var state=fresh(),d=deploy(state,40);T.assert(d.ok);S.Systems.Army.advanceSeason(state,{allowTactical:true,random:rng(.5)});T.assert(state.events.pendingTacticalBattle);T.assert(S.Save.save(state,"manual1").ok);var loaded=S.Save.load("manual1");T.assert(loaded.ok,loaded.errors&&loaded.errors.join(" / "));T.assert(loaded.state.events.pendingTacticalBattle);T.equal(loaded.state.armies[d.stateChanges.armyId].status,"in_battle");valid(loaded.state);});

  T.test("Phase4: 同一stateからBattleSpec seedは決定論的",function(){var a=fresh(),b=fresh(),da=deploy(a,40),db=deploy(b,40);var sa=S.Systems.BattleAdapter.buildBattleSpec(a,da.stateChanges.armyId),sb=S.Systems.BattleAdapter.buildBattleSpec(b,db.stateChanges.armyId);T.equal(sa.seed,sb.seed);T.equal(JSON.stringify(sa.attacker.units),JSON.stringify(sb.attacker.units));});

  T.run();
})(window.Sengoku,window.SengokuTest);
