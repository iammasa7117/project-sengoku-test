(function(S,T){
  "use strict";
  function fresh(){var s=S.State.createInitialState({scenarioId:"core_campaign",playerFactionId:"aotsuki"});s.campaign.status="playing";s.settings.aiEnabled=false;return s;}
  function war(s){var r=S.Systems.Diplomacy.relation(s,"aotsuki","tokizawa");r.status="war";r.expiresTurn=null;r.sinceTurn=s.campaign.turn;r.lastActionTurn=-1;}
  function makeWin(s){war(s);var e=S.Systems.Army.deployAndMarch(s,"narumi","kiyosu",[{officerId:"hiyori",unitType:"ashigaru",troops:30}],{commanderId:"hiyori",factionId:"tokizawa",consumeCommand:false,route:["narumi","kiyosu"],maxHops:1,mission:"attack"});var p=S.Systems.Army.deployIntercept(s,"kiyosu",e.stateChanges.armyId,[{officerId:"keiketsu",unitType:"kiba",troops:60}],{commanderId:"keiketsu",consumeCommand:false});return S.Systems.Army.resolveFieldContact(s,p.stateChanges.armyId,e.stateChanges.armyId,{allowTactical:false,random:function(){return 0.5;}}).stateChanges.report;}
  T.test("Phase12 DOM: 追撃前に捕縛見込みと深追いリスクを表示",function(){var s=fresh(),report=makeWin(s);S.State.current=s;S.UI.showBattleReport(report);var html=S.UI.el("modalContent").innerHTML;T.assert(html.indexOf("捕縛見込み")>=0);T.assert(html.indexOf("深追いリスク")>=0);T.assert(html.indexOf("追撃する")>=0);});
  T.test("Phase12 DOM: 捕縛・深追い事故を戦報に表示",function(){var s=fresh(),report=makeWin(s);report.pursuitCaptureChance=1;report.pursuitRiskChance=1;S.Systems.Army.resolvePursuit(s,report.id,{random:(function(){var a=[0,0,0],i=0;return function(){return a[i++]||0;};})()});S.State.current=s;S.UI.showBattleReport(report);var html=S.UI.el("modalContent").innerHTML;T.assert(html.indexOf("捕縛")>=0);T.assert(html.indexOf("深追い事故")>=0);T.assert(html.indexOf("軽傷")>=0);});
  T.run();
})(window.Sengoku,window.SengokuTest);
