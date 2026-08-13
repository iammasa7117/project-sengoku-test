(function (T) {
  "use strict";
  T.FIELD = {width:1600,height:760,margin:42,enemyBaseDepth:78,playerBaseDepth:78};
  function add(state,spec){state.units[spec.id]=T.createUnit(spec);state.order.push(spec.id);}
  T.createBattleState=function(seed){
    var s={seed:Number(seed)>>>0,rng:new T.RNG(seed),tick:0,maxTicks:7000,status:"running",winner:null,units:{},order:[],selectedUnitId:null,selectedUnitIds:[],orderMode:null,facingPrompt:null,eventMessages:[],visualEffects:[],initialTotals:{player:0,enemy:0},ui:{rosterCollapsed:false}};
    var px=[150,365,580,1020,1235,1450,800],ex=px.slice();
    var types=["ashigaru","ashigaru","ashigaru","kiba","kiba","teppo","samurai"],troops=[1000,1000,1000,800,800,600,900];
    for(var i=0;i<7;i++){
      add(s,{id:"p"+(i+1),officerId:"p_officer_"+(i+1),officerName:"自軍武将"+(i+1),side:"player",unitType:types[i],troops:troops[i],morale:80-(i%3)*3,x:px[i],y:i===6?705:690,facing:-Math.PI/2,isCommander:i===6});
      add(s,{id:"e"+(i+1),officerId:"e_officer_"+(i+1),officerName:"敵軍武将"+(i+1),side:"enemy",unitType:types[i],troops:troops[i],morale:80-(i%3)*3,x:ex[i],y:i===6?55:70,facing:Math.PI/2,isCommander:i===6});
      s.initialTotals.player+=troops[i];s.initialTotals.enemy+=troops[i];
    }
    return s;
  };
  T.getUnits=function(state,side){return state.order.map(function(id){return state.units[id];}).filter(function(u){return u&&(!side||u.side===side);});};
})(window.Tactical = window.Tactical || {});
