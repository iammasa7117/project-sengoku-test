(function (S) {
  "use strict";
  S.UI.renderMap = function () {
    var state = S.State.current, layer = S.UI.el("castleLayer"), armyLayer = S.UI.el("armyLayer"), roads = S.UI.el("roadLayer"), seen = {};
    layer.innerHTML = ""; if (armyLayer) armyLayer.innerHTML = ""; roads.innerHTML = "";
    Object.keys(state.castles).forEach(function (id) {
      var castle = state.castles[id];
      castle.neighbors.forEach(function (neighborId) {
        var key = [id, neighborId].sort().join("|");
        if (seen[key]) return;
        seen[key] = true;
        var neighbor = state.castles[neighborId], line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", castle.x * 10); line.setAttribute("y1", castle.y * 4.8);
        line.setAttribute("x2", neighbor.x * 10); line.setAttribute("y2", neighbor.y * 4.8);
        if (castle.factionId !== neighbor.factionId) line.classList.add("front");
        roads.appendChild(line);
      });
    });
    Object.keys(state.castles).forEach(function (id) {
      var castle = state.castles[id], faction = state.factions[castle.factionId], known = castle.factionId === state.campaign.playerFactionId || state.events.intel[id] > 0, profile = S.Data && S.Data.getCastleProfile ? S.Data.getCastleProfile(castle) : { icon: "城", title: "城郭" };
      var button = document.createElement("button");
      button.className = "castle f-" + castle.factionId + (id === state.campaign.selectedCastleId ? " selected" : "") + (state.events.intel[id] > 0 ? " scouted" : "");
      button.type = "button";
      button.style.left = castle.x + "%"; button.style.top = castle.y + "%"; button.dataset.castleId = id;
      button.setAttribute("aria-pressed", id === state.campaign.selectedCastleId ? "true" : "false");
      button.setAttribute("aria-label", castle.name + "、" + faction.name + "、" + (known ? "兵力" + castle.troops : "兵力不詳"));
      button.innerHTML = "<em class=\"castle-profile-mini\" aria-hidden=\"true\">" + S.UI.escape(profile.icon) + "</em><strong>" + S.UI.escape(castle.name) + "</strong><small>" + S.UI.escape(profile.title) + "・" + (known ? "兵" + castle.troops : "兵力不詳") + "</small>";
      layer.appendChild(button);
    });

    if (armyLayer && S.Systems.Army) {
      S.Systems.Army.all(state).forEach(function (army) {
        if (army.status !== "marching" && army.status !== "in_battle" && army.status !== "besieging") return;
        var loc = army.currentLocation || {}, from = state.castles[loc.fromCastleId || army.originCastleId], to = state.castles[loc.toCastleId || army.destinationCastleId];
        if (!from || !to) return;
        var fixedAtTarget = army.status === "in_battle" || army.status === "besieging";
        var x = fixedAtTarget ? to.x : (from.x + to.x) / 2, y = fixedAtTarget ? to.y : (from.y + to.y) / 2;
        var commander = state.officers[army.commanderId], marker = document.createElement("button");
        marker.type = "button";
        marker.className = "army-marker" + (army.factionId === state.campaign.playerFactionId ? " player" : " enemy") + (army.status === "in_battle" ? " in-battle" : "") + (army.status === "besieging" ? " besieging" : "");
        marker.style.left = x + "%"; marker.style.top = y + "%";
        marker.dataset.armyId = army.id;
        var eta = army.status === "marching" && S.Systems.Army.remainingEta ? S.Systems.Army.remainingEta(state, army) : 0;
        var statusText = army.status === "in_battle" ? to.name + "で会戦待機" : army.status === "besieging" ? to.name + "を包囲中" : to.name + "へ進軍中（残り約" + eta + "季）";
        marker.setAttribute("aria-label", (commander ? commander.name : army.id) + "隊、" + statusText + "、兵力" + S.Systems.Army.totalTroops(state, army));
        marker.innerHTML = "<span class=\"army-flag\">" + (army.status === "in_battle" ? "戦" : army.status === "besieging" ? "囲" : "軍") + "</span><strong>" + S.UI.escape(commander ? commander.name : "軍勢") + "隊</strong><small>兵" + S.Systems.Army.totalTroops(state, army) + (army.status === "in_battle" ? " / 会戦待機" : army.status === "besieging" ? " / 包囲中" : " → " + S.UI.escape(to.name) + " / 約" + eta + "季") + "</small>";
        armyLayer.appendChild(marker);
      });
    }

    var selected = state.castles[state.campaign.selectedCastleId];
    if (selected) {
      var isFriendly = selected.factionId === state.campaign.playerFactionId, hasIntel = state.events.intel[selected.id] > 0;
      var fieldArmies = S.Systems.Army ? S.Systems.Army.forFaction(state, state.campaign.playerFactionId).filter(function (army) { return army.originCastleId === selected.id || army.destinationCastleId === selected.id; }) : [];
      var armyText = fieldArmies.length ? " 進軍中軍勢" + fieldArmies.length + "。" : "";
      var selectedProfile = S.Data && S.Data.getCastleProfile ? S.Data.getCastleProfile(selected) : { title: "城郭" };
      S.UI.el("mapNote").textContent = isFriendly ? selected.name + "［" + selectedProfile.title + "］は" + state.factions[state.campaign.playerFactionId].name + "の領地です。守備兵" + selected.troops + "、士気" + selected.morale + "。" + armyText : hasIntel ? selected.name + "［" + selectedProfile.title + "］の兵力は" + selected.troops + "、防備Lv." + selected.defense + "。" : selected.name + "［" + selectedProfile.title + "］の詳しい兵力は不明です。偵察で情報を得られます。";
    }
  };
})(window.Sengoku);
