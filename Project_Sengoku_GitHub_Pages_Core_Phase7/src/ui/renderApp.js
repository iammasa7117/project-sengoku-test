(function (S) {
  "use strict";
  var U = S.UI;
  U.renderApp = function () {
    var state = S.State.current;
    if (!state) return;
    var holdings = S.Systems.Turn.playerCastles(state), totalArmy = S.Systems.Unit && S.Systems.Unit.totalFactionTroops ? S.Systems.Unit.totalFactionTroops(state, state.campaign.playerFactionId) : holdings.reduce(function (sum, castle) { return sum + castle.troops; }, 0), scenario = S.Data.getScenario(state.campaign.scenarioId), faction = state.factions[state.campaign.playerFactionId];
    U.el("dateLabel").textContent = "永禄" + state.campaign.year + "年";
    U.el("seasonLabel").textContent = S.Config.SEASONS[state.campaign.season] + "・" + (state.campaign.status === "opening" ? "初陣軍議" : "軍議");
    U.el("resourceBar").innerHTML = [
      ["faction", "勢力", faction.name], ["castles", "所持城", holdings.length + " / " + scenario.castleIds.length], ["gold", "金", state.campaign.gold], ["food", "兵糧", state.campaign.food], ["army", "総兵力", totalArmy], ["commands", "命令", state.campaign.commands + " / " + state.campaign.maxCommands]
    ].map(function (item) { return "<div class=\"resource resource-" + item[0] + "\"><span>" + item[1] + "</span><strong>" + item[2] + "</strong></div>"; }).join("");
    U.el("campaignMapTitle").textContent = scenario.name;
    var openingTarget = scenario.opening && state.castles[scenario.opening.targetId];
    U.el("victoryGoal").textContent = state.campaign.status === "opening" && openingTarget ? openingTarget.name + "を攻略する" : "全" + scenario.castleIds.length + "城を支配する";
    U.el("nextSeasonButton").disabled = state.campaign.status === "opening" || state.campaign.gameOver;
    var mobileEndTurn = U.el("mobileNav") && U.el("mobileNav").querySelector ? U.el("mobileNav").querySelector("[data-mobile-end-turn]") : null;
    if (mobileEndTurn) mobileEndTurn.disabled = state.campaign.status === "opening" || state.campaign.gameOver;
    if (U.updateMobileCampaignMode) U.updateMobileCampaignMode();
    U.renderMap();
    U.renderCastleDetail();
    if (U.renderMobileSelectionDock) U.renderMobileSelectionDock();
    U.el("eventLog").innerHTML = state.events.log.slice(-30).map(function (entry) { return "<div class=\"" + U.escape(entry.type || "") + "\">・" + U.escape(entry.text) + "</div>"; }).join("");
    U.el("eventLog").scrollTop = U.el("eventLog").scrollHeight;
    U.renderCouncil();
    if (U.applyPreferences) U.applyPreferences(state);
    if (U.renderGuidePanel) U.renderGuidePanel();
    if (!U.el("debugPanel").classList.contains("hidden")) U.renderDebugPanel();
  };
  U.renderCouncil = function () {
    var state = S.State.current, root = U.el("proposalList");
    if (state.campaign.status === "opening") {
      var active = S.Systems.Event.getActiveEvent(state), interaction = S.Systems.Event.getPendingInteraction(state), model = active && S.Systems.Event.renderEvent(state, active);
      U.el("councilTitle").textContent = model ? model.title : "イベント進行"; U.el("phaseBadge").textContent = model ? model.kicker : "準備中";
      if (model) root.innerHTML = "<article class=\"proposal\"><p class=\"kicker\">" + model.kicker + "</p><h4>" + model.title + "</h4><p>" + model.body + "</p><button class=\"button secondary\" data-show-active-event>イベントを開く</button></article>";
      else if (interaction) root.innerHTML = "<article class=\"proposal\"><p class=\"kicker\">EVENT INTERACTION</p><h4>選択を続ける</h4><p>イベントから開始した操作を再開します。</p><button class=\"button secondary\" data-resume-event-interaction>操作を開く</button></article>";
      else root.innerHTML = "<p class=\"muted\">イベントを準備しています。</p>";
      return;
    }
    var pendingDiplomacy = state.diplomacy.proposals.filter(function (item) { return item.status === "pending" && item.targetFactionId === state.campaign.playerFactionId; }).length;
    U.el("councilTitle").textContent = "今季の家臣提案"; U.el("phaseBadge").textContent = S.Config.SEASONS[state.campaign.season] + "・命令" + state.campaign.commands + (pendingDiplomacy ? "・外交提案" + pendingDiplomacy : "");
    var holdings = S.Systems.Turn.playerCastles(state), selected = state.castles[state.campaign.selectedCastleId], playerOfficers = Object.keys(state.officers).map(function (id) { return state.officers[id]; }).filter(function (officer) { return officer.factionId === state.campaign.playerFactionId && officer.status === "active"; });
    if (!selected || selected.factionId !== state.campaign.playerFactionId) selected = holdings[0];
    if (!selected) { root.innerHTML = "<p class=\"muted\">領地がありません。</p>"; return; }
    var leader = playerOfficers.slice().sort(function (a, b) { return b.stats.leadership - a.stats.leadership; })[0], strategist = playerOfficers.slice().sort(function (a, b) { return b.stats.intellect - a.stats.intellect; })[0], warrior = playerOfficers.slice().sort(function (a, b) { return b.stats.might - a.stats.might; })[0];
    root.innerHTML = "<article class=\"proposal sv-council-panel-card\"><span class=\"sv-council-panel-icon\">守</span><p class=\"kicker\">" + U.escape(leader ? leader.name : "家臣") + "の提案</p><h4>" + U.escape(selected.name) + "の守りを整える</h4><p>徴兵して次の敵襲へ備えます。</p><button class=\"button secondary\" data-command=\"recruit\">徴兵する</button></article><article class=\"proposal sv-council-panel-card\"><span class=\"sv-council-panel-icon\">策</span><p class=\"kicker\">" + U.escape(strategist ? strategist.name : "家臣") + "の提案</p><h4>敵情を探る</h4><p>隣接敵城を偵察し、兵力を把握します。</p><button class=\"button secondary\" data-command=\"scout\">偵察する</button></article><article class=\"proposal sv-council-panel-card\"><span class=\"sv-council-panel-icon\">戦</span><p class=\"kicker\">" + U.escape(warrior ? warrior.name : "家臣") + "の提案</p><h4>攻勢へ出る</h4><p>敵城へ軍を送り、戦線の主導権を握ります。</p><button class=\"button secondary\" data-command=\"attack\">出陣準備</button></article>";
  };
})(window.Sengoku);
