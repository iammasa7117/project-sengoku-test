(function (S) {
  "use strict";
  var U = S.UI;

  function unitTypeOptions(selected) {
    return Object.keys(S.Data.unitTypes).map(function (id) {
      var type = S.Data.unitTypes[id];
      return "<option value=\"" + U.escape(id) + "\"" + (id === selected ? " selected" : "") + ">" + U.escape(type.name) + "</option>";
    }).join("");
  }
  function officerOptions(officers, selected, allowBlank) {
    return (allowBlank ? "<option value=\"\">使用しない</option>" : "") + officers.map(function (officer) {
      var role = S.Systems.Officer.assignmentLabel ? S.Systems.Officer.assignmentLabel(officer) : "待機";
      return "<option value=\"" + U.escape(officer.id) + "\"" + (officer.id === selected ? " selected" : "") + ">" + U.escape(officer.name) + "［" + U.escape(role) + "］（統" + officer.stats.leadership + " 武" + officer.stats.might + "）</option>";
    }).join("");
  }

  U.showArmyPlanner = function (sourceId) {
    var state = S.State.current, source = state.castles[sourceId];
    if (!source || source.factionId !== state.campaign.playerFactionId) { U.notify("自勢力の城を選んでください", "error"); return; }
    if (state.campaign.commands <= 0) { U.notify("命令回数がありません", "error"); return; }
    var targetRoutes = S.Systems.Army.reachableEnemyTargets(state, sourceId, state.campaign.playerFactionId, { maxHops: 3 });
    var targets = targetRoutes.map(function (item) { return item.castle; });
    var officers = S.Systems.Officer.atCastle(state, sourceId, state.campaign.playerFactionId).filter(function (officer) {
      return officer.injury !== "重傷" && (!officer.assignment || officer.assignment.type !== "army");
    });
    var available = Math.max(0, source.guardTroops - S.Config.MIN_GARRISON);
    if (!targets.length) { U.notify("自領を経由して到達できる侵攻先がありません", "error"); return; }
    if (!officers.length) { U.notify("出陣できる武将がいません", "error"); return; }
    if (available < S.Config.MIN_ATTACK_FORCE) { U.notify("最低守備兵を残すため出陣兵力が不足しています", "error"); return; }

    var firstTroops = Math.max(S.Config.MIN_ATTACK_FORCE, Math.min(available, Math.floor(available * 0.7)));
    var html = "<p class=\"kicker\">ARMY DEPLOYMENT</p><h2>軍勢を編成して出陣</h2>" +
      "<p>自領の城を経由して最大3区間先まで進軍できます。山道は通常より時間がかかります。城主・奉行を出陣させると、その役目を離れて軍勢所属になります。</p>" +
      "<div class=\"army-summary-strip\"><span>出陣元<strong>" + U.escape(source.name) + "</strong></span><span>守備兵<strong>" + source.guardTroops + "</strong></span><span>出陣可能<strong>" + available + "</strong></span></div>" +
      "<label class=\"field\"><span>侵攻先</span><select id=\"armyTarget\">" + targetRoutes.map(function (item) { var castle = item.castle, routeNames = item.route.map(function (id) { return state.castles[id].name; }).join("→"); return "<option value=\"" + U.escape(castle.id) + "\">" + U.escape(castle.name) + " / 約" + item.seasons + "季（" + U.escape(routeNames) + "）・兵" + (state.events.intel[castle.id] > 0 ? castle.troops : "?") + "</option>"; }).join("") + "</select></label>" +
      "<div class=\"army-unit-builder\">" +
        "<section class=\"army-unit-card commander\"><p class=\"kicker\">UNIT 1 / COMMANDER</p><label class=\"field\"><span>総大将</span><select id=\"armyOfficer1\">" + officerOptions(officers, officers[0].id, false) + "</select></label><div class=\"army-unit-row\"><label class=\"field\"><span>兵種</span><select id=\"armyType1\">" + unitTypeOptions("ashigaru") + "</select></label><label class=\"field\"><span>兵数</span><input id=\"armyTroops1\" type=\"number\" min=\"1\" max=\"" + available + "\" value=\"" + firstTroops + "\"></label></div></section>" +
        "<section class=\"army-unit-card\"><p class=\"kicker\">UNIT 2 / OPTIONAL</p><label class=\"field\"><span>武将</span><select id=\"armyOfficer2\">" + officerOptions(officers, "", true) + "</select></label><div class=\"army-unit-row\"><label class=\"field\"><span>兵種</span><select id=\"armyType2\">" + unitTypeOptions("kiba") + "</select></label><label class=\"field\"><span>兵数</span><input id=\"armyTroops2\" type=\"number\" min=\"1\" max=\"" + available + "\" value=\"10\"></label></div></section>" +
        "<section class=\"army-unit-card\"><p class=\"kicker\">UNIT 3 / OPTIONAL</p><label class=\"field\"><span>武将</span><select id=\"armyOfficer3\">" + officerOptions(officers, "", true) + "</select></label><div class=\"army-unit-row\"><label class=\"field\"><span>兵種</span><select id=\"armyType3\">" + unitTypeOptions("teppo") + "</select></label><label class=\"field\"><span>兵数</span><input id=\"armyTroops3\" type=\"number\" min=\"1\" max=\"" + available + "\" value=\"10\"></label></div></section>" +
      "</div>" +
      "<p class=\"muted army-upkeep-hint\">維持費目安：遠征兵" + S.Config.Balance.domestic.armyUpkeepGoldDivisor + "人ごとに金1、" + S.Config.Balance.domestic.armyUpkeepFoodDivisor + "人ごとに兵糧1 / 毎季。出陣すると命令を1消費します。</p>" +
      "<div class=\"modal-actions\"><button class=\"button secondary\" data-close-modal>戻る</button><button class=\"button primary\" data-deploy-army data-army-source=\"" + U.escape(sourceId) + "\">軍勢を出陣させる</button></div>";
    U.openModal(html);
  };

  U.deployArmyFromModal = function (button) {
    var state = S.State.current, specs = [], seen = {}, error = null;
    for (var i = 1; i <= 3; i += 1) {
      var officerId = U.el("armyOfficer" + i).value;
      if (!officerId) continue;
      var troops = Math.floor(Number(U.el("armyTroops" + i).value));
      if (seen[officerId]) { error = "同じ武将を複数部隊に配置できません"; break; }
      if (!Number.isFinite(troops) || troops <= 0) { error = "兵数を正しく入力してください"; break; }
      seen[officerId] = true;
      specs.push({ officerId: officerId, unitType: U.el("armyType" + i).value, troops: troops });
    }
    if (error) { U.notify(error, "error"); return; }
    if (!specs.length) { U.notify("最低1部隊を編成してください", "error"); return; }
    var result = S.Systems.Army.deployAndMarch(state, button.dataset.armySource, U.el("armyTarget").value, specs, { commanderId: specs[0].officerId, factionId: state.campaign.playerFactionId, consumeCommand: true, maxHops: 3 });
    if (U.commit(result)) U.closeModal();
  };

  U.showArmyDetail = function (armyId) {
    var state = S.State.current, army = S.Systems.Army.get(state, armyId);
    if (!army) { U.notify("軍勢が見つかりません", "error"); return; }
    var commander = state.officers[army.commanderId], origin = state.castles[army.originCastleId], target = state.castles[army.destinationCastleId];
    var units = army.unitIds.map(function (unitId) { return S.Systems.Unit.get(state, unitId); }).filter(Boolean);
    var status = army.status === "marching" ? "進軍中" : army.status === "arrived" ? "到着" : army.status === "in_battle" ? "会戦待機" : army.status === "besieging" ? "包囲中" : army.status;
    var upkeep = S.Systems.Domestic.upkeepForArmy(state, army), siegeHtml = "";
    var routeNames = (army.route || []).map(function (id) { return state.castles[id] ? state.castles[id].name : id; });
    var eta = army.status === "marching" ? S.Systems.Army.remainingEta(state, army) : 0;
    if (army.status === "besieging" && target && S.Systems.Siege) {
      var preview = S.Systems.Siege.preview(state, army, target, S.Config.Balance.siege.continuationThreshold);
      var progress = preview ? Math.min(100, Math.round(preview.attackScore / Math.max(1, preview.requiredScore) * 100)) : 0;
      siegeHtml = preview ? "<div class=\"siege-status-card\"><p class=\"kicker\">SIEGE / 包囲中</p><strong>" + U.escape(target.name) + "はまだ落城していません</strong><p>攻城力 " + preview.attackScore + " / 城防御 " + preview.defenseScore + "（必要 " + preview.requiredScore + "）</p><div class=\"siege-meter\"><span style=\"width:" + progress + "%\"></span></div><small>守備兵 " + target.guardTroops + " / 防備Lv." + target.defense + " / 次の季節に自動で攻城を継続</small></div>" : "";
    }
    U.openModal("<p class=\"kicker\">FIELD ARMY</p><h2>" + U.escape(commander ? commander.name : army.id) + "隊</h2>" +
      "<div class=\"army-summary-strip\"><span>状態<strong>" + U.escape(status) + "</strong></span><span>総兵力<strong>" + S.Systems.Army.totalTroops(state, army) + "</strong></span><span>部隊数<strong>" + units.length + "</strong></span></div>" +
      "<div class=\"domestic-economy-strip army-cost-strip\"><span>季節維持費<strong>金 " + upkeep.gold + "</strong></span><span>季節兵糧<strong>兵糧 " + upkeep.food + "</strong></span><span>対象兵力<strong>" + upkeep.troops + "</strong></span><span>Clock<strong>1季ごと</strong></span></div>" +
      "<div class=\"record strategic-route-record\"><strong>進軍路" + (eta ? " / 残り約" + eta + "季" : "") + "</strong><p>" + U.escape(routeNames.length ? routeNames.join(" → ") : ((origin ? origin.name : "?") + " → " + (target ? target.name : "?"))) + "</p></div>" + siegeHtml +
      "<div class=\"army-detail-units\">" + units.map(function (unit) { var officer = state.officers[unit.officerId], type = S.Data.getUnitType(unit.unitType); return "<div class=\"record\"><strong>" + U.escape(officer ? officer.name : unit.officerId) + " / " + U.escape(type ? type.name : unit.unitType) + "</strong><p>兵" + unit.troops + " / 士気" + unit.morale + (unit.officerId === army.commanderId ? " / 総大将" : "") + "</p></div>"; }).join("") + "</div>" +
      "<div class=\"modal-actions\">" +
        (army.factionId === state.campaign.playerFactionId && (army.status === "marching" || army.status === "besieging") ? "<button class=\"button secondary\" data-cancel-army=\"" + U.escape(army.id) + "\">" + (army.status === "besieging" ? "包囲を解いて撤退" : "撤兵する") + "</button>" : "") +
        (army.factionId === state.campaign.playerFactionId && army.status === "in_battle" && state.events.pendingTacticalBattle && state.events.pendingTacticalBattle.armyId === army.id ? "<button class=\"button primary\" data-open-tactical>会戦を再開</button>" : "") +
        "<button class=\"button secondary\" data-close-modal>閉じる</button></div>");
  };

  U.showBattleReport = function (report) {
    if (!report) return false;
    var siegeHtml = "";
    if (report.mode === "tactical") {
      if (report.castleCaptured) siegeHtml = "<div class=\"siege-result captured\"><strong>🏯 落城</strong><p>野戦の勝利をそのまま攻城成功へつなげました。城は自領になりました。</p></div>";
      else if (report.siegeStatus === "besieging") siegeHtml = "<div class=\"siege-result holding\"><strong>🛡️ 包囲継続</strong><p>野戦には勝利しましたが城は持ちこたえています。遠征軍は現地に残り、次の季節に攻城を継続します。</p>" + (report.siegeAttackScore !== null ? "<small>攻城力 " + report.siegeAttackScore + " / 城防御 " + report.siegeDefenseScore + " / 必要 " + report.siegeRequiredScore + "</small>" : "") + "</div>";
    }
    U.openModal("<p class=\"kicker\">BATTLE REPORT</p><h2>" + U.escape(report.name) + " — " + U.escape(report.result) + "</h2><div class=\"stat-grid\"><div><span>総大将</span><strong>" + U.escape(report.commander) + "</strong></div><div><span>副将</span><strong>" + U.escape(report.deputy) + "</strong></div><div><span>投入兵</span><strong>" + report.committedTroops + "</strong></div><div><span>攻撃側損失</span><strong>" + report.attackerLoss + "</strong></div></div><p>戦術：" + U.escape(report.tactic) + " / 判断：" + U.escape(report.decision) + "</p><p class=\"major\">因縁：" + U.escape(report.rivalry) + (report.injury ? " / 負傷：" + U.escape(report.injury) : "") + "</p>" + siegeHtml + "<div class=\"modal-actions\"><button class=\"button secondary\" data-open-rivals>因縁録</button><button class=\"button secondary\" data-open-battles>合戦記録</button><button class=\"button primary\" data-battle-finish>軍議へ戻る</button></div>");
    return true;
  };
})(window.Sengoku);
