(function (T) {
  "use strict";
  T.UnitTypes = {
    ashigaru:{id:"ashigaru",name:"足軽",shortName:"足",speed:13,attack:0.8,defense:1.4,range:0,canCharge:false,role:"正面防御 / 対騎馬"},
    samurai:{id:"samurai",name:"侍",shortName:"侍",speed:15,attack:1.5,defense:0.9,range:0,canCharge:true,chargeMultiplier:1.35,chargeMoraleMultiplier:1.4,role:"高近接 / 突撃"},
    teppo:{id:"teppo",name:"鉄砲",shortName:"鉄",speed:10,attack:2.2,meleeAttack:0.45,defense:0.4,range:200,reloadTicks:24,canCharge:false,role:"射程200 / 自動射撃"},
    kiba:{id:"kiba",name:"騎馬",shortName:"馬",speed:32,attack:1.2,defense:0.7,range:0,canCharge:true,chargeMultiplier:1.7,chargeMoraleMultiplier:1.9,role:"高速機動 / 側背面 / 突撃"}
  };
})(window.Tactical = window.Tactical || {});
