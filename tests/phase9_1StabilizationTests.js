(function (S, T) {
  "use strict";
  function fresh() { var state=S.State.createInitialState({scenarioId:"core_campaign",playerFactionId:"aotsuki"}); state.campaign.status="playing"; state.settings.aiEnabled=false; return state; }
  function war(state,a,b){ var r=S.Systems.Diplomacy.relation(state,a,b); r.status="war"; r.expiresTurn=null; r.sinceTurn=state.campaign.turn; r.lastActionTurn=-1; }
  function valid(state){ var v=S.State.validateState(state); T.assert(v.ok,v.errors.join(" / ")); }
  function attack(state, castleId, targetId, officerId, factionId, troops, route) {
    return S.Systems.Army.deployAndMarch(state,castleId,targetId,[{officerId:officerId,unitType:"ashigaru",troops:troops}],{commanderId:officerId,factionId:factionId,consumeCommand:false,route:route,maxHops:3,mission:"attack"});
  }

  T.test("Phase9.1: 1 Armyは同一seasonにField Battleを1回まで", function(){
    var s=fresh(); war(s,"aotsuki","tokizawa");
    var e1=attack(s,"narumi","kiyosu","hiyori","tokizawa",10,["narumi","kiyosu"]); T.assert(e1.ok,e1.errors&&e1.errors.join(" / "));
    var e2=attack(s,"narumi","kiyosu","tokizawa_temp_4","tokizawa",30,["narumi","kiyosu"]); T.assert(e2.ok,e2.errors&&e2.errors.join(" / "));
    var p=attack(s,"kiyosu","narumi","keiketsu","aotsuki",30,["kiyosu","narumi"]); T.assert(p.ok,p.errors&&p.errors.join(" / "));
    var result=S.Systems.Army.advanceSeason(s,{allowTactical:false,random:function(){return 0.5;}}); T.assert(result.ok,result.errors&&result.errors.join(" / "));
    var fieldActions=(result.stateChanges.actions||[]).filter(function(a){return a.type==="field_contact";});
    var playerBattles=fieldActions.filter(function(a){return a.armyId===p.stateChanges.armyId||a.enemyArmyId===p.stateChanges.armyId;});
    T.equal(playerBattles.length,1,"同じPlayer Armyが同季に複数野戦している");
    var foughtEnemyId=playerBattles[0].armyId===p.stateChanges.armyId?playerBattles[0].enemyArmyId:playerBattles[0].armyId;
    T.equal(foughtEnemyId,e2.stateChanges.armyId,"接触相手がArmy ID順だけで決まっている");
    valid(s);
  });

  T.test("Phase9.1: Tactical割込み後に未処理Armyのseason移動を再開", function(){
    var s=fresh(); war(s,"aotsuki","tokizawa");
    var e=attack(s,"narumi","kiyosu","hiyori","tokizawa",20,["narumi","kiyosu"]); T.assert(e.ok,e.errors&&e.errors.join(" / "));
    var p=S.Systems.Army.deployIntercept(s,"kiyosu",e.stateChanges.armyId,[{officerId:"keiketsu",unitType:"ashigaru",troops:30}],{commanderId:"keiketsu",consumeCommand:false}); T.assert(p.ok,p.errors&&p.errors.join(" / "));
    var transferDeploy=S.Systems.Army.deploy(s,"aonohara",[{officerId:"soma",unitType:"ashigaru",troops:20}],{commanderId:"soma",factionId:"aotsuki",mission:"reinforce"}); T.assert(transferDeploy.ok,transferDeploy.errors&&transferDeploy.errors.join(" / "));
    var transferId=transferDeploy.stateChanges.armyId;
    var transfer=S.Systems.Army.startTransfer(s,transferId,"tsukikage",{route:["aonohara","tsukikage"]}); T.assert(transfer.ok,transfer.errors&&transfer.errors.join(" / "));
    var before=S.Systems.Army.get(s,transferId).currentLocation.hopsRemaining;
    var advanced=S.Systems.Turn.advance(s,{random:function(){return 0.5;},allowTactical:true});
    T.assert(advanced.ok,advanced.errors&&advanced.errors.join(" / "));
    T.assert(s.events.pendingTacticalBattle,"Field Tactical pendingが生成されていない");
    var pending=s.events.pendingTacticalBattle;
    T.assert(pending.resumeArmyState,"Army resume stateが保存されていない");
    var unitResults=[];
    pending.battleSpec.attacker.units.forEach(function(u){unitResults.push({id:u.id,side:"player",officerId:u.officerId,troopsAfter:u.troops,morale:70,status:"active"});});
    pending.battleSpec.defender.units.forEach(function(u){unitResults.push({id:u.id,side:"enemy",officerId:u.officerId,coreOfficerId:u.coreOfficerId,troopsAfter:Math.max(1,Math.floor(u.troops*0.2)),morale:20,status:"routed"});});
    var translated=S.Systems.BattleAdapter.translateResult(s,pending,{seed:pending.seed,winner:"player",units:unitResults,attackerLoss:0,defenderLoss:15,durationTicks:300});
    var applied=S.Systems.Army.applyFieldTacticalOutcome(s,pending,translated); T.assert(applied.ok,applied.errors&&applied.errors.join(" / "));
    s.events.pendingTacticalBattle=null;
    var resumed=S.Systems.Turn.resumeAfterTactical(s,{random:function(){return 0.5;},armyResumeState:pending.resumeArmyState,allowTactical:false});
    T.assert(resumed.ok,resumed.errors&&resumed.errors.join(" / "));
    var after=S.Systems.Army.get(s,transferId);
    T.assert(after,"未処理Armyが消失した");
    T.equal(after.currentLocation.hopsRemaining,before-1,"未処理ArmyがTactical後にseason移動していない");
    valid(s);
  });

  T.test("Phase9.1: BattleAdapter経由でもTactical後にArmy処理を再開", function(){
    var s=fresh(); war(s,"aotsuki","tokizawa");
    var e=attack(s,"narumi","kiyosu","hiyori","tokizawa",20,["narumi","kiyosu"]); T.assert(e.ok,e.errors&&e.errors.join(" / "));
    var p=S.Systems.Army.deployIntercept(s,"kiyosu",e.stateChanges.armyId,[{officerId:"keiketsu",unitType:"ashigaru",troops:30}],{commanderId:"keiketsu",consumeCommand:false}); T.assert(p.ok,p.errors&&p.errors.join(" / "));
    var transferDeploy=S.Systems.Army.deploy(s,"aonohara",[{officerId:"soma",unitType:"ashigaru",troops:20}],{commanderId:"soma",factionId:"aotsuki",mission:"reinforce"}); T.assert(transferDeploy.ok,transferDeploy.errors&&transferDeploy.errors.join(" / "));
    var transferId=transferDeploy.stateChanges.armyId;
    var transfer=S.Systems.Army.startTransfer(s,transferId,"tsukikage",{route:["aonohara","tsukikage"]}); T.assert(transfer.ok,transfer.errors&&transfer.errors.join(" / "));
    var before=S.Systems.Army.get(s,transferId).currentLocation.hopsRemaining;
    S.State.current=s;
    var advanced=S.Systems.Turn.advance(s,{random:function(){return 0.5;},allowTactical:true}); T.assert(advanced.ok,advanced.errors&&advanced.errors.join(" / "));
    var pending=s.events.pendingTacticalBattle; T.assert(pending&&pending.resumeArmyState,"resume state付きTactical pendingが必要");
    var units=[];
    pending.battleSpec.attacker.units.forEach(function(u){units.push({id:u.id,side:"player",officerId:u.officerId,troopsAfter:u.troops,morale:75,status:"active"});});
    pending.battleSpec.defender.units.forEach(function(u){units.push({id:u.id,side:"enemy",officerId:u.officerId,coreOfficerId:u.coreOfficerId,troopsAfter:Math.max(1,Math.floor(u.troops*0.2)),morale:20,status:"routed"});});
    var frame=document.getElementById("tacticalFrame"); frame.contentWindow={};
    var handled=S.Systems.BattleAdapter.receiveMessage({source:frame.contentWindow,origin:"null",data:{type:"PROJECT_SENGOKU_TACTICAL_OUTCOME",battleId:pending.battleId,result:{seed:pending.seed,winner:"player",units:units,attackerLoss:0,defenderLoss:15,durationTicks:300}}});
    T.assert(handled,"Tactical outcome messageが処理されていない");
    T.assert(!s.events.pendingTacticalBattle,"迎撃後に不要なpending Tacticalが残っている");
    T.equal(S.Systems.Army.get(s,transferId).currentLocation.hopsRemaining,before-1,"BattleAdapter経由で未処理Armyが再開されていない");
    valid(s);
  });

  T.test("Phase9.1: Tactical中断位置はschema12 Save/Loadで保持", function(){
    localStorage.data={};
    var s=fresh(); war(s,"aotsuki","tokizawa");
    var e=attack(s,"narumi","kiyosu","hiyori","tokizawa",20,["narumi","kiyosu"]); T.assert(e.ok,e.errors&&e.errors.join(" / "));
    var p=S.Systems.Army.deployIntercept(s,"kiyosu",e.stateChanges.armyId,[{officerId:"keiketsu",unitType:"ashigaru",troops:30}],{commanderId:"keiketsu",consumeCommand:false}); T.assert(p.ok,p.errors&&p.errors.join(" / "));
    var transferDeploy=S.Systems.Army.deploy(s,"aonohara",[{officerId:"soma",unitType:"ashigaru",troops:20}],{commanderId:"soma",factionId:"aotsuki",mission:"reinforce"}); T.assert(transferDeploy.ok);
    var transferId=transferDeploy.stateChanges.armyId; T.assert(S.Systems.Army.startTransfer(s,transferId,"tsukikage",{route:["aonohara","tsukikage"]}).ok);
    var before=S.Systems.Army.get(s,transferId).currentLocation.hopsRemaining;
    var advanced=S.Systems.Turn.advance(s,{random:function(){return 0.5;},allowTactical:true}); T.assert(advanced.ok);
    T.assert(s.events.pendingTacticalBattle&&s.events.pendingTacticalBattle.resumeArmyState);
    T.equal(s.schemaVersion,12);
    T.assert(S.Save.save(s,"manual1").ok);
    var loaded=S.Save.load("manual1"); T.assert(loaded.ok,loaded.errors&&loaded.errors.join(" / "));
    T.equal(loaded.state.schemaVersion,12);
    var pending=loaded.state.events.pendingTacticalBattle; T.assert(pending&&pending.resumeArmyState,"resumeArmyStateがSave/Loadで失われた");
    var units=[];
    pending.battleSpec.attacker.units.forEach(function(u){units.push({id:u.id,side:"player",officerId:u.officerId,troopsAfter:u.troops,morale:75,status:"active"});});
    pending.battleSpec.defender.units.forEach(function(u){units.push({id:u.id,side:"enemy",officerId:u.officerId,coreOfficerId:u.coreOfficerId,troopsAfter:Math.max(1,Math.floor(u.troops*0.2)),morale:20,status:"routed"});});
    var translated=S.Systems.BattleAdapter.translateResult(loaded.state,pending,{seed:pending.seed,winner:"player",units:units,attackerLoss:0,defenderLoss:15,durationTicks:300});
    var applied=S.Systems.Army.applyFieldTacticalOutcome(loaded.state,pending,translated); T.assert(applied.ok);
    loaded.state.events.pendingTacticalBattle=null;
    var resumed=S.Systems.Turn.resumeAfterTactical(loaded.state,{random:function(){return 0.5;},armyResumeState:pending.resumeArmyState,allowTactical:false}); T.assert(resumed.ok,resumed.errors&&resumed.errors.join(" / "));
    T.equal(S.Systems.Army.get(loaded.state,transferId).currentLocation.hopsRemaining,before-1);
    valid(loaded.state);
    S.Save.remove("manual1");
  });

  T.run();
})(window.Sengoku, window.SengokuTest);
