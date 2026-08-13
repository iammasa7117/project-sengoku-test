(function (T) {
  "use strict";
  var H={els:{},flashTimer:null,rosterBuilt:false};
  function E(id){return document.getElementById(id);}
  H.init=function(){
    ["battleStatus","timeStatus","playerAlive","enemyAlive","selectedPanel","selectedIcon","detailOfficer","detailType","detailTroops","detailMorale","detailFatigue","chargeSuggestion","waitBtn","retreatBtn","roster","rosterToggle","menuBtn","menuPanel","menuCloseBtn","seedInput","restartBtn","resultPanel","resultJson","floatingMessage","gestureBadge"].forEach(function(id){H.els[id]=E(id);});
    document.querySelectorAll('.speed-btn').forEach(function(b){b.addEventListener('click',function(){H.setSpeed(Number(b.dataset.speed));});});
    H.els.waitBtn.addEventListener('click',function(){var u=T.state&&T.state.units[T.state.selectedUnitId];if(!u||u.status!=="active")return;T.Movement.clearRoute(u);u.orderType="wait";u.targetPos=null;u.targetUnitId=null;u.chargeActive=false;u.chargeDistance=0;H.flash("待機");H.refresh();});
    H.els.retreatBtn.addEventListener('click',function(){var u=T.state&&T.state.units[T.state.selectedUnitId];if(!u||u.status!=="active")return;T.Movement.clearRoute(u);var F=T.FIELD;u.orderType="route";u.routePoints=[{x:u.position.x,y:F.height-F.margin}];u.routeIndex=0;u.targetUnitId=null;u.chargeActive=false;u.chargeDistance=0;H.setSpeed(1);H.flash("後退");});
    H.els.rosterToggle.addEventListener('click',function(){if(!T.state)return;T.state.ui.rosterCollapsed=!T.state.ui.rosterCollapsed;H.refresh();});
    H.els.menuBtn.addEventListener('click',function(){H.els.menuPanel.hidden=!H.els.menuPanel.hidden;});
    H.els.menuCloseBtn.addEventListener('click',function(){H.els.menuPanel.hidden=true;});
  };
  H.buildRoster=function(){
    if(!T.state)return;var nav=H.els.roster;nav.innerHTML='';T.getUnits(T.state,'player').forEach(function(u){var b=document.createElement('button');b.type='button';b.className='roster-card';b.dataset.unitId=u.id;b.innerHTML='<span class="roster-icon">'+T.UnitTypes[u.unitType].shortName+'</span><span class="r-name">'+u.officerName.replace('自軍','')+'</span><span class="roster-bars"><span class="r-bar troop"><i></i></span><span class="r-bar morale"><i></i></span></span>'+(u.isCommander?'<span class="commander-mark">★</span>':'');b.addEventListener('click',function(){if(T.Input&&T.Input.selectUnit)T.Input.selectUnit(T.state.units[u.id]);});nav.appendChild(b);});H.rosterBuilt=true;
  };
  H.setSpeed=function(v){if(!T.clock)return;T.clock.setSpeed(v);document.querySelectorAll('.speed-btn').forEach(function(b){b.classList.toggle('active',Number(b.dataset.speed)===v);});if(H.els.timeStatus)H.els.timeStatus.textContent=v===0?'停止':v===1?'通常':'3倍';};
  H.setOrderMode=function(){/* B5.3 compatibility: command-bar order modes were intentionally removed. */};
  H.showHint=function(){};
  H.setGestureBadge=function(data){var el=H.els.gestureBadge;if(!el)return;if(!data){el.hidden=true;el.className='gesture-badge';return;}var rect=T.Render.canvas.getBoundingClientRect(),F=T.FIELD,px=rect.left+data.pos.x/F.width*rect.width,py=rect.top+data.pos.y/F.height*rect.height;el.hidden=false;el.textContent=data.text;el.style.left=px+'px';el.style.top=py+'px';el.className='gesture-badge '+(data.kind||'');};
  H.refresh=function(){
    if(!T.state)return;if(!H.rosterBuilt)H.buildRoster();var state=T.state,u=state.units[state.selectedUnitId];
    var pa=T.getUnits(state,'player').filter(function(x){return x.status==='active';}).length,ea=T.getUnits(state,'enemy').filter(function(x){return x.status==='active';}).length;
    H.els.playerAlive.textContent=pa;H.els.enemyAlive.textContent=ea;H.els.battleStatus.textContent=state.status==='running'?'Tick '+state.tick:(state.winner==='player'?'勝利':state.winner==='draw'?'引分':'敗北');
    if(!u){H.els.selectedPanel.hidden=true;}else{
      H.els.selectedPanel.hidden=false;var type=T.UnitTypes[u.unitType];H.els.selectedIcon.textContent=type.shortName;H.els.detailOfficer.textContent=u.officerName;H.els.detailType.textContent=type.name;H.els.detailTroops.textContent=u.troops+'/'+u.maxTroops;H.els.detailMorale.textContent=Math.round(u.morale);H.els.detailFatigue.textContent='速 '+type.speed;
      var candidate=T.Input&&T.Input.preview&&T.Input.preview.unitId===u.id&&T.Input.preview.chargeCandidate;H.els.chargeSuggestion.hidden=!candidate;
      H.els.waitBtn.disabled=u.status!=='active';H.els.retreatBtn.disabled=u.status!=='active';
    }
    H.els.roster.classList.toggle('collapsed',!!state.ui.rosterCollapsed);H.els.rosterToggle.classList.toggle('up',!!state.ui.rosterCollapsed);H.els.rosterToggle.textContent=state.ui.rosterCollapsed?'⌃':'⌄';
    H.els.roster.querySelectorAll('.roster-card').forEach(function(card){var ru=state.units[card.dataset.unitId];card.classList.toggle('selected',state.selectedUnitId===ru.id);card.classList.toggle('routed',ru.status==='routed');card.classList.toggle('destroyed',ru.status==='destroyed');var bars=card.querySelectorAll('.r-bar i');if(bars[0])bars[0].style.width=Math.max(0,ru.troops/ru.maxTroops*100)+'%';if(bars[1])bars[1].style.width=Math.max(0,ru.morale)+'%';});
  };
  H.flash=function(text){clearTimeout(H.flashTimer);var el=H.els.floatingMessage;el.textContent=text;el.classList.add('show');H.flashTimer=setTimeout(function(){el.classList.remove('show');},850);};
  H.showResult=function(result){H.els.resultPanel.hidden=false;H.els.resultJson.textContent=JSON.stringify(result,null,2);H.els.menuPanel.hidden=false;};
  T.HUD=H;
})(window.Tactical = window.Tactical || {});
