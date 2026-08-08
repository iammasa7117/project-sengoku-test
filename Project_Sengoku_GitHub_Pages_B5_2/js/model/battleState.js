(function (T) {
  "use strict";
  T.FIELD = T.FIELD || {width:1500,height:1000,margin:45,enemyBaseDepth:95,playerBaseDepth:95};
  function add(state, spec){ state.units[spec.id]=T.createUnit(spec); state.order.push(spec.id); }
  T.createBattleState = function(seed){
    var s={seed:Number(seed)>>>0,rng:new T.RNG(seed),tick:0,maxTicks:7000,status:"running",winner:null,units:{},order:[],selectedUnitId:null,orderMode:null,facingPrompt:null,eventMessages:[],visualEffects:[],initialTotals:{player:0,enemy:0}};
    var px=[180,390,600,900,1110,1320,750];
    var ex=[180,390,600,900,1110,1320,750];
    var ptypes=["ashigaru","ashigaru","ashigaru","kiba","kiba","teppo","samurai"];
    var etypes=["ashigaru","ashigaru","ashigaru","kiba","kiba","teppo","samurai"];
    var pt=[1000,1000,1000,800,800,600,900];
    var et=[1000,1000,1000,800,800,600,900];
    for(var i=0;i<7;i++){
      add(s,{id:"p"+(i+1),officerId:"p_officer_"+(i+1),officerName:"自軍武将"+(i+1),side:"player",unitType:ptypes[i],troops:pt[i],morale:80-(i%3)*3,x:px[i],y:i===6?930:860,facing:-Math.PI/2,isCommander:i===6});
      add(s,{id:"e"+(i+1),officerId:"e_officer_"+(i+1),officerName:"敵軍武将"+(i+1),side:"enemy",unitType:etypes[i],troops:et[i],morale:80-(i%3)*3,x:ex[i],y:i===6?70:140,facing:Math.PI/2,isCommander:i===6});
      s.initialTotals.player+=pt[i]; s.initialTotals.enemy+=et[i];
    }
    return s;
  };
  T.getUnits=function(state,side){ return state.order.map(function(id){return state.units[id];}).filter(function(u){return u && (!side||u.side===side);}); };
})(window.Tactical = window.Tactical || {});
