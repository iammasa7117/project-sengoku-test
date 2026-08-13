(function (S, T) {
  "use strict";
  function fresh() { var state=S.State.createInitialState({scenarioId:"core_campaign",playerFactionId:"aotsuki"}); state.campaign.status="playing"; state.settings.aiEnabled=false; return state; }
  function war(state,a,b){ var r=S.Systems.Diplomacy.relation(state,a,b); r.status="war"; r.expiresTurn=null; r.sinceTurn=state.campaign.turn; r.lastActionTurn=-1; }
  function valid(state){ var v=S.State.validateState(state); T.assert(v.ok,v.errors.join(" / ")); }
  function enemyLaunch(state,troops){ return S.Systems.Army.deployAndMarch(state,"narumi","kiyosu",[{officerId:"hiyori",unitType:"ashigaru",troops:troops||20}],{commanderId:"hiyori",factionId:"tokizawa",consumeCommand:false,route:["narumi","kiyosu"],maxHops:1,mission:"attack"}); }
  function playerIntercept(state,enemyId,troops){ return S.Systems.Army.deployIntercept(state,"kiyosu",enemyId,[{officerId:"keiketsu",unitType:"ashigaru",troops:troops||30}],{commanderId:"keiketsu",consumeCommand:false}); }

  T.test("Phase10: Legacy野戦の敗軍は即消滅せず敗走Armyになる", function(){
    var s=fresh(); war(s,"aotsuki","tokizawa");
    var e=enemyLaunch(s,10); T.assert(e.ok); var p=playerIntercept(s,e.stateChanges.armyId,40); T.assert(p.ok);
    var enemyId=e.stateChanges.armyId, playerId=p.stateChanges.armyId;
    var r=S.Systems.Army.resolveFieldContact(s,playerId,enemyId,{allowTactical:false,random:function(){return 0.5;}}); T.assert(r.ok,r.errors&&r.errors.join(" / "));
    var loserId=r.stateChanges.loserArmyId, loser=s.armies[loserId];
    T.assert(loser,"敗軍Armyが即座に消えている"); T.equal(loser.status,"returning"); T.equal(loser.mission,"retreat"); T.equal(S.Systems.Army.remainingEta(s,loser),1); T.assert(loser.retreatCastleId); valid(s);
  });

  T.test("Phase10: 敗走Armyは次季に自城へ帰還して解散する", function(){
    var s=fresh(); war(s,"aotsuki","tokizawa");
    var e=enemyLaunch(s,10); var p=playerIntercept(s,e.stateChanges.armyId,40); var enemyId=e.stateChanges.armyId;
    var r=S.Systems.Army.resolveFieldContact(s,p.stateChanges.armyId,enemyId,{allowTactical:false,random:function(){return 0.5;}}); T.assert(r.ok);
    var retreat=s.armies[enemyId]; T.assert(retreat&&retreat.status==="returning"); var survivors=S.Systems.Army.totalTroops(s,retreat), targetId=retreat.retreatCastleId, guardBefore=s.castles[targetId].guardTroops;
    var sameTurn=S.Systems.Army.advanceSeason(s,{allowTactical:false,random:function(){return 0.5;}}); T.assert(sameTurn.ok); T.assert(s.armies[enemyId]&&s.armies[enemyId].status==="returning","敗走開始と同じseason内に即帰城している");
    var advanced=S.Systems.Turn.advance(s,{allowTactical:false,skipAI:true,random:function(){return 0.5;}}); T.assert(advanced.ok,advanced.errors&&advanced.errors.join(" / "));
    T.assert(!s.armies[enemyId],"敗走Armyが次季帰城後も残っている"); T.equal(s.castles[targetId].guardTroops,guardBefore+survivors,"敗走生存兵が帰還先へ戻っていない"); valid(s);
  });

  T.test("Phase10: Tactical野戦の敗軍も敗走Armyとして残る", function(){
    var s=fresh(); war(s,"aotsuki","tokizawa");
    var e=enemyLaunch(s,20), enemyId=e.stateChanges.armyId, p=playerIntercept(s,enemyId,30), playerId=p.stateChanges.armyId;
    var prep=S.Systems.Army.resolveFieldContact(s,playerId,enemyId,{allowTactical:true}); T.assert(prep.ok);
    var pending=s.events.pendingTacticalBattle, units=[];
    pending.battleSpec.attacker.units.forEach(function(u){units.push({id:u.id,side:"player",officerId:u.officerId,troopsAfter:u.troops,morale:75,status:"active"});});
    pending.battleSpec.defender.units.forEach(function(u){units.push({id:u.id,side:"enemy",officerId:u.officerId,coreOfficerId:u.coreOfficerId,troopsAfter:Math.max(1,Math.floor(u.troops*0.25)),morale:20,status:"routed"});});
    var outcome=S.Systems.BattleAdapter.translateResult(s,pending,{seed:pending.seed,winner:"player",units:units,attackerLoss:0,defenderLoss:15,durationTicks:300});
    var applied=S.Systems.Army.applyFieldTacticalOutcome(s,pending,outcome); T.assert(applied.ok,applied.errors&&applied.errors.join(" / "));
    s.events.pendingTacticalBattle=null;
    T.assert(s.armies[enemyId]&&s.armies[enemyId].status==="returning"); T.assert(!s.armies[playerId],"勝利した迎撃軍は従来どおり帰城解散する"); T.equal(s.castles.narumi.factionId,"tokizawa"); valid(s);
  });

  T.test("Phase10: 敗走Armyは接触・迎撃・脅威判定の対象外", function(){
    var s=fresh(); war(s,"aotsuki","tokizawa");
    var e=enemyLaunch(s,10), p=playerIntercept(s,e.stateChanges.armyId,40);
    var r=S.Systems.Army.resolveFieldContact(s,p.stateChanges.armyId,e.stateChanges.armyId,{allowTactical:false,random:function(){return 0.5;}}); T.assert(r.ok);
    var loser=s.armies[r.stateChanges.loserArmyId]; T.assert(loser&&loser.status==="returning");
    T.assert(!S.Systems.Army.currentSegment(loser,s),"敗走Armyが通常marching接触segmentとして扱われている");
    T.assert(!S.Systems.Army.canIntercept(s,loser.id,loser.destinationCastleId).ok,"敗走Armyを迎撃できてしまう");
    T.assert(S.Systems.Army.threatsAgainstFaction(s,loser.factionId).every(function(a){return a.id!==loser.id;})); valid(s);
  });

  T.test("Phase10: 敗走状態はschema12 Save/Loadで保持できる", function(){
    localStorage.data={}; var s=fresh(); war(s,"aotsuki","tokizawa");
    var e=enemyLaunch(s,10), p=playerIntercept(s,e.stateChanges.armyId,40);
    var r=S.Systems.Army.resolveFieldContact(s,p.stateChanges.armyId,e.stateChanges.armyId,{allowTactical:false,random:function(){return 0.5;}}); T.assert(r.ok);
    var loserId=r.stateChanges.loserArmyId; T.assert(s.armies[loserId]&&s.armies[loserId].status==="returning"); T.equal(s.schemaVersion,12); T.assert(S.Save.save(s,"manual1").ok);
    var loaded=S.Save.load("manual1"); T.assert(loaded.ok,loaded.errors&&loaded.errors.join(" / ")); T.equal(loaded.state.schemaVersion,12); T.equal(loaded.state.armies[loserId].status,"returning"); T.equal(loaded.state.armies[loserId].retreatCastleId,s.armies[loserId].retreatCastleId); valid(loaded.state); S.Save.remove("manual1");
  });

  T.test("Phase10: プレイヤー勝利野戦では同Turnに追撃を選べる", function(){
    var s=fresh(); war(s,"aotsuki","tokizawa");
    var e=enemyLaunch(s,12), p=playerIntercept(s,e.stateChanges.armyId,40);
    var r=S.Systems.Army.resolveFieldContact(s,p.stateChanges.armyId,e.stateChanges.armyId,{allowTactical:false,random:function(){return 0.5;}}); T.assert(r.ok);
    var report=r.stateChanges.report; T.assert(report.pursuitAvailable,"追撃可能フラグがない"); T.assert(!report.pursuitResolved);
    var check=S.Systems.Army.canPursue(s,report.id); T.assert(check.ok,check.errors&&check.errors.join(" / ")); valid(s);
  });

  T.test("Phase10: 追撃は敗走兵へ追加損害を与え総大将疲労を増やす", function(){
    var s=fresh(); war(s,"aotsuki","tokizawa");
    var e=enemyLaunch(s,16), p=playerIntercept(s,e.stateChanges.armyId,45);
    var r=S.Systems.Army.resolveFieldContact(s,p.stateChanges.armyId,e.stateChanges.armyId,{allowTactical:false,random:function(){return 0.5;}}); T.assert(r.ok);
    var report=r.stateChanges.report, loser=s.armies[report.loserArmyId], before=S.Systems.Army.totalTroops(s,loser), fatigueBefore=s.officers[report.winnerCommanderId].fatigue;
    var pursuit=S.Systems.Army.resolvePursuit(s,report.id); T.assert(pursuit.ok,pursuit.errors&&pursuit.errors.join(" / "));
    T.assert(S.Systems.Army.totalTroops(s,loser)<before,"追撃で追加損害が出ていない"); T.equal(report.pursuitResolved,true); T.assert(report.pursuitLoss>0); T.equal(s.officers[report.winnerCommanderId].fatigue,Math.min(100,fatigueBefore+8));
    T.assert(!S.Systems.Army.resolvePursuit(s,report.id).ok,"同じ野戦を二重追撃できる"); valid(s);
  });

  T.test("Phase10: 追撃しない選択では兵力を減らさない", function(){
    var s=fresh(); war(s,"aotsuki","tokizawa");
    var e=enemyLaunch(s,16), p=playerIntercept(s,e.stateChanges.armyId,45);
    var r=S.Systems.Army.resolveFieldContact(s,p.stateChanges.armyId,e.stateChanges.armyId,{allowTactical:false,random:function(){return 0.5;}}); T.assert(r.ok);
    var report=r.stateChanges.report, loser=s.armies[report.loserArmyId], before=S.Systems.Army.totalTroops(s,loser);
    var declined=S.Systems.Army.declinePursuit(s,report.id); T.assert(declined.ok); T.equal(report.pursuitResolved,true); T.equal(report.pursuitLoss,0); T.equal(S.Systems.Army.totalTroops(s,loser),before); valid(s);
  });

  T.test("Phase10: 次Turnへ進んだ後は追撃できない", function(){
    var s=fresh(); war(s,"aotsuki","tokizawa");
    var e=enemyLaunch(s,16), p=playerIntercept(s,e.stateChanges.armyId,45);
    var r=S.Systems.Army.resolveFieldContact(s,p.stateChanges.armyId,e.stateChanges.armyId,{allowTactical:false,random:function(){return 0.5;}}); T.assert(r.ok);
    var report=r.stateChanges.report; s.campaign.turn += 1; T.assert(!S.Systems.Army.canPursue(s,report.id).ok,"追撃期限を越えている"); valid(s);
  });

  T.test("Phase10: Tactical迎撃勝利の戦報でも追撃可能", function(){
    var s=fresh(); war(s,"aotsuki","tokizawa");
    var e=enemyLaunch(s,20), enemyId=e.stateChanges.armyId, p=playerIntercept(s,enemyId,35), playerId=p.stateChanges.armyId;
    T.assert(S.Systems.Army.resolveFieldContact(s,playerId,enemyId,{allowTactical:true}).ok); var pending=s.events.pendingTacticalBattle, units=[];
    pending.battleSpec.attacker.units.forEach(function(u){units.push({id:u.id,side:"player",officerId:u.officerId,troopsAfter:u.troops,morale:75,status:"active"});});
    pending.battleSpec.defender.units.forEach(function(u){units.push({id:u.id,side:"enemy",officerId:u.officerId,coreOfficerId:u.coreOfficerId,troopsAfter:Math.max(2,Math.floor(u.troops*0.35)),morale:20,status:"routed"});});
    var outcome=S.Systems.BattleAdapter.translateResult(s,pending,{seed:pending.seed,winner:"player",units:units,attackerLoss:0,defenderLoss:12,durationTicks:300}); var applied=S.Systems.Army.applyFieldTacticalOutcome(s,pending,outcome); T.assert(applied.ok);
    var report=applied.stateChanges.report; s.events.pendingTacticalBattle=null; T.assert(report.pursuitAvailable); T.assert(S.Systems.Army.canPursue(s,report.id).ok); valid(s);
  });

  T.test("Phase10: Turn.advance内で発生した敗走軍は同季に即帰城しない", function(){
    var s=fresh(); war(s,"aotsuki","tokizawa");
    var e=enemyLaunch(s,12), enemyId=e.stateChanges.armyId, p=playerIntercept(s,enemyId,40); T.assert(p.ok);
    var advanced=S.Systems.Turn.advance(s,{allowTactical:false,skipAI:true,random:function(){return 0.5;}}); T.assert(advanced.ok,advanced.errors&&advanced.errors.join(" / "));
    var report=s.events.battleReports[s.events.battleReports.length-1]; T.assert(report&&report.mode==="field_legacy"); var loser=s.armies[report.loserArmyId]; T.assert(loser&&loser.status==="returning","同一Turnのmovement phaseで敗走軍が即帰城した"); T.assert(report.pursuitAvailable); valid(s);
  });

  T.test("Phase10: Tactical後のseason resumeでも敗走軍を追撃前に保持", function(){
    var s=fresh(); war(s,"aotsuki","tokizawa");
    var e=enemyLaunch(s,20), enemyId=e.stateChanges.armyId, p=playerIntercept(s,enemyId,35), playerId=p.stateChanges.armyId;
    var advanced=S.Systems.Turn.advance(s,{allowTactical:true,skipAI:true,random:function(){return 0.5;}}); T.assert(advanced.ok); var pending=s.events.pendingTacticalBattle; T.assert(pending&&pending.resumeArmyState); var units=[];
    pending.battleSpec.attacker.units.forEach(function(u){units.push({id:u.id,side:"player",officerId:u.officerId,troopsAfter:u.troops,morale:75,status:"active"});}); pending.battleSpec.defender.units.forEach(function(u){units.push({id:u.id,side:"enemy",officerId:u.officerId,coreOfficerId:u.coreOfficerId,troopsAfter:Math.max(2,Math.floor(u.troops*0.35)),morale:20,status:"routed"});});
    var outcome=S.Systems.BattleAdapter.translateResult(s,pending,{seed:pending.seed,winner:"player",units:units,attackerLoss:0,defenderLoss:12,durationTicks:300}); var applied=S.Systems.Army.applyFieldTacticalOutcome(s,pending,outcome); T.assert(applied.ok); s.events.pendingTacticalBattle=null;
    var resumed=S.Systems.Turn.resumeAfterTactical(s,{armyResumeState:pending.resumeArmyState,allowTactical:false,skipAI:true,random:function(){return 0.5;}}); T.assert(resumed.ok,resumed.errors&&resumed.errors.join(" / ")); var report=applied.stateChanges.report; T.assert(s.armies[enemyId]&&s.armies[enemyId].status==="returning","Tactical resume中に敗走軍が消えた"); T.assert(S.Systems.Army.canPursue(s,report.id).ok); valid(s);
  });

  T.test("Phase10: 未選択の追撃機会はschema12 Save/Load後も保持", function(){
    localStorage.data={}; var s=fresh(); war(s,"aotsuki","tokizawa");
    var e=enemyLaunch(s,16), p=playerIntercept(s,e.stateChanges.armyId,45); var r=S.Systems.Army.resolveFieldContact(s,p.stateChanges.armyId,e.stateChanges.armyId,{allowTactical:false,random:function(){return 0.5;}}); T.assert(r.ok);
    var report=r.stateChanges.report; T.assert(report.pursuitAvailable&&!report.pursuitResolved); T.assert(S.Save.save(s,"manual1").ok); var loaded=S.Save.load("manual1"); T.assert(loaded.ok,loaded.errors&&loaded.errors.join(" / "));
    T.equal(loaded.state.schemaVersion,12); T.assert(S.Systems.Army.canPursue(loaded.state,report.id).ok,"Save/Loadで追撃機会が失われた"); var pursued=S.Systems.Army.resolvePursuit(loaded.state,report.id); T.assert(pursued.ok); valid(loaded.state); S.Save.remove("manual1");
  });

  T.run();
})(window.Sengoku, window.SengokuTest);
