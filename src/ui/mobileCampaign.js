(function (S) {
  "use strict";
  var U = S.UI;
  var VIEWS = { map: "mapPanel", side: "sidePanel", council: "councilPanel" };

  U.isMobileCampaignLayout = function () {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(max-width: 950px) and (orientation: landscape)").matches;
  };

  U.setMobileCampaignView = function (view, options) {
    options = options || {};
    if (!VIEWS[view]) return false;
    if (document.body && document.body.dataset) document.body.dataset.mobileView = view;
    var nav = U.el("mobileNav");
    if (nav && nav.querySelectorAll) Array.prototype.forEach.call(nav.querySelectorAll("[data-mobile-nav]"), function (button) {
      var active = button.dataset.mobileNav === view;
      button.setAttribute("aria-current", active ? "page" : "false");
    });
    if (options.focus) {
      var target = U.el(VIEWS[view]);
      if (target && target.focus) { if (!target.hasAttribute || !target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1"); target.focus(); }
    }
    return true;
  };

  U.updateMobileCampaignMode = function () {
    var mobile = U.isMobileCampaignLayout();
    if (document.body && document.body.classList) document.body.classList.toggle("mobile-campaign", mobile);
    if (mobile && document.body && document.body.dataset && !VIEWS[document.body.dataset.mobileView]) U.setMobileCampaignView("map");
    return mobile;
  };

  U.renderMobileSelectionDock = function () {
    var root = U.el("mobileSelectionDock"), state = S.State.current;
    if (!root || !state || !state.campaign) return;
    var castle = state.castles[state.campaign.selectedCastleId];
    if (!castle) { root.innerHTML = "<span class=\"muted\">城を選択してください</span>"; return; }
    var friendly = castle.factionId === state.campaign.playerFactionId;
    var known = friendly || (state.events && state.events.intel && state.events.intel[castle.id] > 0);
    var faction = state.factions[castle.factionId];
    var profile = S.Data && S.Data.getCastleProfile ? S.Data.getCastleProfile(castle) : { icon: "城", title: "城郭" };
    var canDeploy = friendly && state.campaign.status !== "opening" && !state.campaign.gameOver && state.campaign.commands > 0;
    root.innerHTML = "<div class=\"mobile-selection-copy\"><span class=\"mobile-selection-seal " + (friendly ? "friendly" : "enemy") + "\" aria-hidden=\"true\">" + U.escape(profile.icon) + "</span><div><small>" + U.escape((faction ? faction.name : "") + " / " + profile.title) + "</small><strong>" + U.escape(castle.name) + "</strong><span>守備 " + (known ? castle.guardTroops : "?") + " ・ 防備 " + (known ? castle.defense : "?") + "</span></div></div>" +
      "<div class=\"mobile-selection-actions\"><button type=\"button\" class=\"button secondary\" data-mobile-nav=\"side\">詳細</button>" +
      (canDeploy ? "<button type=\"button\" class=\"button primary\" data-command=\"attack\">出陣</button>" : "") + "</div>";
  };
})(window.Sengoku);
