(function (S, T) {
  "use strict";
  function fresh() { var state=S.State.createInitialState({scenarioId:"core_campaign",playerFactionId:"aotsuki"}); state.campaign.status="playing"; state.settings.aiEnabled=false; return state; }
  function war(state){ var r=S.Systems.Diplomacy.relation(state,"aotsuki","tokizawa"); r.status="war"; r.expiresTurn=null; r.sinceTurn=state.campaign.turn; r.lastActionTurn=-1; }
  function valid(state){ var v=S.State.validateState(state); T.assert(v.ok,v.errors.join(" / ")); }
  function makeWin(options){ options=options||{}; var s=fresh(); war(s); if(Number.isFinite(options.enemyMight)) s.officers.hiyori.stats.might=options.enemyMight; if(Number.isFinite(options.playerFatigue)) s.officers.keiketsu.fatigue=options.playerFatigue;
    var e=S.Systems.Army.deployAndMarch(s,"narumi","kiyosu",[{officerId:"hiyori",unitType:"ashigaru",troops:30}],{commanderId:"hiyori",factionId:"tokizawa",consumeCommand:false,route:["narumi","kiyosu"],maxHops:1,mission:"attack"});
    var p=S.Systems.Army.deployIntercept(s,"kiyosu",e.stateChanges.armyId,[{officerId:"keiketsu",unitType:options.type||"kiba",troops:60}],{commanderId:"keiketsu",consumeCommand:false});
    T.assert(e.ok&&p.ok,"追撃テスト用Army作成失敗");
    var battle=S.Systems.Army.resolveFieldContact(s,p.stateChanges.armyId,e.stateChanges.armyId,{allowTactical:false,random:function(){return 0.5;}}); T.assert(battle.ok,battle.errors&&battle.errors.join(" / "));
    T.equal(battle.stateChanges.report.winnerFactionId,"aotsuki"); return {state:s,report:battle.stateChanges.report};
  }
  function seq(values){ var i=0; return function(){var v=values[Math.min(i,values.length-1)]; i+=1; return v;}; }

  T.test("Phase12: 追撃前に捕縛見込みと深追いリスクを計算する", function(){
    var a=makeWin({type:"ashigaru",enemyMight:90}), b=makeWin({type:"kiba",enemyMight:40});
    var ca=S.Systems.Army.canPursue(a.state,a.report.id), cb=S.Systems.Army.canPursue(b.state,b.report.id); T.assert(ca.ok&&cb.ok);
    T.assert(Number.isFinite(cb.stateChanges.aftermath.captureChance)); T.assert(Number.isFinite(cb.stateChanges.aftermath.riskChance));
    T.assert(cb.stateChanges.aftermath.captureChance>ca.stateChanges.aftermath.captureChance,"騎馬/敵将武力差が捕縛見込みへ反映されていない");
    T.assert(cb.stateChanges.aftermath.riskLabel); valid(b.state);
  });

  T.test("Phase12: 追撃成功時に敵総大将を既存捕虜システムへ送れる", function(){
    var x=makeWin(), s=x.state, report=x.report; report.pursuitCaptureChance=1; report.pursuitRiskChance=0;
    var result=S.Systems.Army.resolvePursuit(s,report.id,{random:function(){return 0.5;}}); T.assert(result.ok);
    T.equal(result.stateChanges.pursuitCapturedOfficerId,"hiyori"); T.equal(s.officers.hiyori.status,"prisoner"); T.equal(s.officers.hiyori.captorFactionId,"aotsuki"); T.assert(s.prisoners.indexOf("hiyori")>=0); T.assert(report.pursuitResult.indexOf("捕縛")>=0); valid(s);
  });

  T.test("Phase12: 捕縛失敗時は敵総大将が逃げ切る", function(){
    var x=makeWin(), s=x.state, report=x.report; report.pursuitCaptureChance=0.01; report.pursuitRiskChance=0;
    var result=S.Systems.Army.resolvePursuit(s,report.id,{random:function(){return 0.99;}}); T.assert(result.ok); T.equal(result.stateChanges.pursuitCapturedOfficerId,null); T.equal(s.officers.hiyori.status,"active"); T.assert(report.pursuitResult.indexOf("逃げ切った")>=0); valid(s);
  });

  T.test("Phase12: 深追い事故で勝者総大将に追加疲労と体力損耗", function(){
    var x=makeWin(), s=x.state, report=x.report; report.pursuitCaptureChance=0; report.pursuitRiskChance=1; var c=s.officers.keiketsu, fatigue=c.fatigue, health=c.health;
    var result=S.Systems.Army.resolvePursuit(s,report.id,{random:seq([0,1])}); T.assert(result.ok); T.assert(report.pursuitIncident); T.equal(report.pursuitExtraFatigue,6); T.equal(c.fatigue,Math.min(100,fatigue+report.pursuitFatigueCost+6)); T.equal(c.health,Math.max(1,health-8)); T.equal(report.pursuitCommanderInjury,null); valid(s);
  });

  T.test("Phase12: 深追い事故で軽傷が発生しうる", function(){
    var x=makeWin(), s=x.state, report=x.report; report.pursuitCaptureChance=0; report.pursuitRiskChance=1;
    var result=S.Systems.Army.resolvePursuit(s,report.id,{random:seq([0,0])}); T.assert(result.ok); T.equal(report.pursuitCommanderInjury,"軽傷"); T.equal(s.officers.keiketsu.injury,"軽傷"); T.assert(s.officers.keiketsu.health<=78); valid(s);
  });

  T.test("Phase12: 捕縛された総大将がいても敗走ArmyとStateは整合する", function(){
    var x=makeWin(), s=x.state, report=x.report; report.pursuitCaptureChance=1; report.pursuitRiskChance=0; T.assert(S.Systems.Army.resolvePursuit(s,report.id,{random:function(){return 0.5;}}).ok); valid(s);
    T.assert(!s.armies[report.loserArmyId],"総大将捕縛後も指揮崩壊Armyが残っている"); T.assert(report.pursuitRetreatDisbanded,"捕縛後の敗走軍散開が記録されていない"); T.equal(s.officers.hiyori.status,"prisoner"); valid(s);
  });

  T.test("Phase12: 追撃結果はSave/Loadで捕縛・事故fieldを維持", function(){
    localStorage.data={}; var x=makeWin(), s=x.state, report=x.report; report.pursuitCaptureChance=1; report.pursuitRiskChance=1; T.assert(S.Systems.Army.resolvePursuit(s,report.id,{random:seq([0,0,1])}).ok); T.assert(S.Save.save(s,"manual1").ok); var loaded=S.Save.load("manual1"); T.assert(loaded.ok); var r=loaded.state.events.battleReports.find(function(z){return z.id===report.id;}); T.equal(loaded.state.schemaVersion,12); T.equal(r.pursuitCapturedOfficerId,"hiyori"); T.assert(r.pursuitIncident); T.equal(loaded.state.officers.hiyori.status,"prisoner"); valid(loaded.state); S.Save.remove("manual1");
  });

  T.test("Phase12: Player追撃の決着はSaveリロードで再抽選されない", function(){
    localStorage.data={}; var x=makeWin(), s=x.state, report=x.report; T.assert(S.Save.save(s,"manual1").ok); var loaded=S.Save.load("manual1"); T.assert(loaded.ok); var a=S.Systems.Army.resolvePursuit(s,report.id), b=S.Systems.Army.resolvePursuit(loaded.state,report.id); T.assert(a.ok&&b.ok); var br=loaded.state.events.battleReports.find(function(z){return z.id===report.id;}); T.equal(report.pursuitCapturedOfficerId,br.pursuitCapturedOfficerId); T.equal(report.pursuitIncident,br.pursuitIncident); T.equal(report.pursuitCommanderInjury,br.pursuitCommanderInjury); T.equal(report.pursuitLoss,br.pursuitLoss); S.Save.remove("manual1");
  });

  T.test("Phase12: 追撃捕縛でも城所有権は変化しない", function(){
    var x=makeWin(), s=x.state, report=x.report, owner=s.castles.kiyosu.factionId; report.pursuitCaptureChance=1; report.pursuitRiskChance=0; T.assert(S.Systems.Army.resolvePursuit(s,report.id,{random:function(){return 0.5;}}).ok); T.equal(s.castles.kiyosu.factionId,owner); valid(s);
  });

  T.test("Phase12: Phase11未解決戦報に新fieldがなくても追撃可能", function(){
    var x=makeWin(), s=x.state, report=x.report; delete report.pursuitCaptureChance; delete report.pursuitRiskChance; delete report.pursuitRiskLabel; delete report.pursuitLoserCommanderId; delete report.pursuitLoserCommanderMight; var check=S.Systems.Army.canPursue(s,report.id); T.assert(check.ok); T.assert(Number.isFinite(check.stateChanges.aftermath.captureChance)); T.assert(Number.isFinite(check.stateChanges.aftermath.riskChance)); valid(s);
  });

  T.run();
})(window.Sengoku, window.SengokuTest);
