(function (S, T) {
  "use strict";
  function fresh(){var s=S.State.createInitialState({scenarioId:"core_campaign",playerFactionId:"aotsuki"});s.campaign.status="playing";s.settings.aiEnabled=false;return s;}
  function war(s,a,b){var r=S.Systems.Diplomacy.relation(s,a,b);r.status="war";r.expiresTurn=null;r.sinceTurn=s.campaign.turn;r.lastActionTurn=-1;}
  function makeRetreat(s){
    war(s,"aotsuki","tokizawa");
    var e=S.Systems.Army.deployAndMarch(s,"narumi","kiyosu",[{officerId:"hiyori",unitType:"ashigaru",troops:10}],{commanderId:"hiyori",factionId:"tokizawa",consumeCommand:false,route:["narumi","kiyosu"],maxHops:1,mission:"attack"});
    var p=S.Systems.Army.deployIntercept(s,"kiyosu",e.stateChanges.armyId,[{officerId:"keiketsu",unitType:"ashigaru",troops:40}],{commanderId:"keiketsu",consumeCommand:false});
    var r=S.Systems.Army.resolveFieldContact(s,p.stateChanges.armyId,e.stateChanges.armyId,{allowTactical:false,random:function(){return .5;}}); T.assert(r.ok); return r.stateChanges.loserArmyId;
  }
  T.test("Phase10 DOM: 地図に『退』旗の敗走Armyが表示される",function(){var s=fresh(),id=makeRetreat(s);S.State.current=s;S.UI.renderMap();var markers=S.UI.el("armyLayer").children;var marker=markers.filter(function(x){return x.dataset.armyId===id;})[0];T.assert(marker,"敗走Army markerがない");T.assert(marker.className.indexOf("returning")>=0);T.assert(marker.innerHTML.indexOf(">退<")>=0);});
  T.test("Phase10 DOM: Army詳細に敗走中・退却路を表示",function(){var s=fresh(),id=makeRetreat(s);S.State.current=s;S.UI.showArmyDetail(id);var html=S.UI.el("modalContent").innerHTML;T.assert(html.indexOf("敗走中")>=0);T.assert(html.indexOf("退却路")>=0);T.assert(html.indexOf("撤退")>=0);});
  T.test("Phase10 DOM: 勝利戦報に追撃/追撃せずボタンを表示",function(){var s=fresh();var id=makeRetreat(s);var report=s.events.battleReports[s.events.battleReports.length-1];S.State.current=s;T.assert(report.pursuitAvailable);S.UI.showBattleReport(report);var html=S.UI.el("modalContent").innerHTML;T.assert(html.indexOf("追撃可能")>=0);T.assert(html.indexOf("data-pursue-battle")>=0);T.assert(html.indexOf("data-decline-pursuit")>=0);T.assert(html.indexOf("data-battle-finish")<0);});
  T.run();
})(window.Sengoku,window.SengokuTest);
