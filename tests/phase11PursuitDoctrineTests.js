(function (S, T) {
  "use strict";
  function fresh() { var state=S.State.createInitialState({scenarioId:"core_campaign",playerFactionId:"aotsuki"}); state.campaign.status="playing"; state.settings.aiEnabled=false; return state; }
  function war(state,a,b){ var r=S.Systems.Diplomacy.relation(state,a,b); r.status="war"; r.expiresTurn=null; r.sinceTurn=state.campaign.turn; r.lastActionTurn=-1; }
  function valid(state){ var v=S.State.validateState(state); T.assert(v.ok,v.errors.join(" / ")); }
  function enemyLaunch(state,troops,type){ return S.Systems.Army.deployAndMarch(state,"narumi","kiyosu",[{officerId:"hiyori",unitType:type||"ashigaru",troops:troops||40}],{commanderId:"hiyori",factionId:"tokizawa",consumeCommand:false,route:["narumi","kiyosu"],maxHops:1,mission:"attack"}); }
  function playerIntercept(state,enemyId,troops,type,officerId){ officerId=officerId||"keiketsu"; return S.Systems.Army.deployIntercept(state,"kiyosu",enemyId,[{officerId:officerId,unitType:type||"ashigaru",troops:troops||50}],{commanderId:officerId,consumeCommand:false}); }
  function profileFor(type,officerId){ var s=fresh(), d=S.Systems.Army.deploy(s,"kiyosu",[{officerId:officerId||"keiketsu",unitType:type,troops:40}],{commanderId:officerId||"keiketsu",consumeCommand:false}); T.assert(d.ok,d.errors&&d.errors.join(" / ")); return S.Systems.Army.pursuitProfile(s,d.stateChanges.armyId); }

  T.test("Phase11: 騎馬比率が高いほど追撃率が上がる", function(){
    var foot=profileFor("ashigaru","keiketsu"), horse=profileFor("kiba","keiketsu");
    T.assert(horse.rate>foot.rate,"騎馬編成の追撃率が上がっていない");
    T.assert(horse.cavalryRatio>foot.cavalryRatio); T.assert(horse.fatigueCost<=foot.fatigueCost);
  });

  T.test("Phase11: 総大将能力が追撃率へ反映される", function(){
    var s=fresh(), d=S.Systems.Army.deploy(s,"kiyosu",[{officerId:"keiketsu",unitType:"ashigaru",troops:40}],{commanderId:"keiketsu",consumeCommand:false}); T.assert(d.ok);
    s.officers.keiketsu.stats.leadership=50; s.officers.keiketsu.stats.might=50; var base=S.Systems.Army.pursuitProfile(s,d.stateChanges.armyId);
    s.officers.keiketsu.stats.leadership=85; s.officers.keiketsu.stats.might=90; var elite=S.Systems.Army.pursuitProfile(s,d.stateChanges.armyId);
    T.assert(elite.rate>base.rate,"総大将能力が追撃率へ反映されていない"); T.assert(elite.fatigueCost<base.fatigueCost,"統率が追撃疲労へ反映されていない");
  });

  T.test("Phase11: Player追撃は固定18%ではなく戦後profileを使う", function(){
    var s=fresh(); war(s,"aotsuki","tokizawa");
    var e=enemyLaunch(s,30,"ashigaru"), p=playerIntercept(s,e.stateChanges.armyId,60,"kiba","keiketsu"); T.assert(e.ok&&p.ok);
    var r=S.Systems.Army.resolveFieldContact(s,p.stateChanges.armyId,e.stateChanges.armyId,{allowTactical:false,random:function(){return 0.5;}}); T.assert(r.ok);
    var report=r.stateChanges.report, loser=s.armies[report.loserArmyId]; T.assert(report.pursuitRate>0.24,"騎馬主体なのに追撃率が高判定になっていない");
    var before=S.Systems.Army.totalTroops(s,loser), fatigueBefore=s.officers[report.winnerCommanderId].fatigue, expected=Math.min(before,Math.max(1,Math.round(before*report.pursuitRate)));
    var result=S.Systems.Army.resolvePursuit(s,report.id); T.assert(result.ok,result.errors&&result.errors.join(" / "));
    T.equal(report.pursuitLoss,expected,"追撃profileと実損害が一致しない");
    T.equal(s.officers[report.winnerCommanderId].fatigue,Math.min(100,fatigueBefore+report.pursuitFatigueCost)); valid(s);
  });

  T.test("Phase11: 戦報に騎馬比率・追撃率・疲労コストを保存する", function(){
    var s=fresh(); war(s,"aotsuki","tokizawa");
    var e=enemyLaunch(s,30), p=playerIntercept(s,e.stateChanges.armyId,60,"kiba");
    var r=S.Systems.Army.resolveFieldContact(s,p.stateChanges.armyId,e.stateChanges.armyId,{allowTactical:false,random:function(){return 0.5;}}); T.assert(r.ok);
    var report=r.stateChanges.report; T.assert(Number.isFinite(report.pursuitRate)); T.assert(Number.isFinite(report.pursuitCavalryRatio)); T.assert(Number.isFinite(report.pursuitFatigueCost)); T.assert(report.pursuitEffectLabel); valid(s);
  });

  T.test("Phase11: AI勝利時は条件を満たせば自動追撃する", function(){
    var s=fresh(); war(s,"aotsuki","tokizawa");
    var e=enemyLaunch(s,45,"ashigaru"), p=playerIntercept(s,e.stateChanges.armyId,10,"ashigaru"); T.assert(e.ok&&p.ok);
    var r=S.Systems.Army.resolveFieldContact(s,e.stateChanges.armyId,p.stateChanges.armyId,{allowTactical:false,random:function(){return 0.5;}}); T.assert(r.ok);
    var report=r.stateChanges.report; T.equal(report.winnerFactionId,"tokizawa"); T.assert(report.pursuitResolved); T.assert(report.pursuitByAI); T.assert(report.pursuitLoss>0,"AIが追撃条件を満たすのに追撃していない"); T.assert(report.pursuitResult.indexOf("敵軍の追撃")>=0); valid(s);
  });

  T.test("Phase11: 疲労したAI総大将は深追いを控える", function(){
    var s=fresh(); war(s,"aotsuki","tokizawa"); s.officers.hiyori.fatigue=90;
    var e=enemyLaunch(s,45,"ashigaru"), p=playerIntercept(s,e.stateChanges.armyId,10,"ashigaru");
    var r=S.Systems.Army.resolveFieldContact(s,e.stateChanges.armyId,p.stateChanges.armyId,{allowTactical:false,random:function(){return 0.5;}}); T.assert(r.ok);
    var report=r.stateChanges.report; T.equal(report.winnerFactionId,"tokizawa"); T.assert(report.pursuitResolved&&report.pursuitByAI); T.equal(report.pursuitLoss,0); T.assert(report.pursuitResult.indexOf("深追い")>=0); valid(s);
  });

  T.test("Phase11: AI追撃でも城所有権は変化しない", function(){
    var s=fresh(); war(s,"aotsuki","tokizawa"); var owner=s.castles.kiyosu.factionId;
    var e=enemyLaunch(s,45), p=playerIntercept(s,e.stateChanges.armyId,10);
    var r=S.Systems.Army.resolveFieldContact(s,e.stateChanges.armyId,p.stateChanges.armyId,{allowTactical:false,random:function(){return 0.5;}}); T.assert(r.ok);
    T.equal(s.castles.kiyosu.factionId,owner); valid(s);
  });

  T.test("Phase11: 未解決Player追撃profileはschema12 Save/Loadで保持", function(){
    localStorage.data={}; var s=fresh(); war(s,"aotsuki","tokizawa");
    var e=enemyLaunch(s,30), p=playerIntercept(s,e.stateChanges.armyId,60,"kiba"); var r=S.Systems.Army.resolveFieldContact(s,p.stateChanges.armyId,e.stateChanges.armyId,{allowTactical:false,random:function(){return 0.5;}}); T.assert(r.ok);
    var report=r.stateChanges.report, rate=report.pursuitRate; T.assert(report.pursuitAvailable&&!report.pursuitResolved); T.assert(S.Save.save(s,"manual1").ok);
    var loaded=S.Save.load("manual1"); T.assert(loaded.ok,loaded.errors&&loaded.errors.join(" / ")); T.equal(loaded.state.schemaVersion,12);
    var loadedReport=loaded.state.events.battleReports.find(function(x){return x.id===report.id;}); T.equal(loadedReport.pursuitRate,rate); var check=S.Systems.Army.canPursue(loaded.state,report.id); T.assert(check.ok); T.equal(check.stateChanges.profile.rate,rate); valid(loaded.state); S.Save.remove("manual1");
  });

  T.test("Phase11: Phase10旧戦報に追撃profileがなくても18%/疲労8で後方互換", function(){
    var s=fresh(); war(s,"aotsuki","tokizawa");
    var e=enemyLaunch(s,30), p=playerIntercept(s,e.stateChanges.armyId,60); var r=S.Systems.Army.resolveFieldContact(s,p.stateChanges.armyId,e.stateChanges.armyId,{allowTactical:false,random:function(){return 0.5;}}); T.assert(r.ok);
    var report=r.stateChanges.report; delete report.pursuitRate; delete report.pursuitFatigueCost; delete report.pursuitCavalryRatio; delete report.pursuitEffectLabel; delete report.pursuitLeadership; delete report.pursuitMight;
    var check=S.Systems.Army.canPursue(s,report.id); T.assert(check.ok); T.equal(check.stateChanges.profile.rate,0.18); T.equal(check.stateChanges.profile.fatigueCost,8); valid(s);
  });

  T.run();
})(window.Sengoku, window.SengokuTest);
