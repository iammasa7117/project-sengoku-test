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
    var officers = S.Systems.Officer.atCastle(state, sourceId, state.campaign.playerFactionId).filter(function (officer) {
      return officer.injury !== "重傷" && (!officer.assignment || officer.assignment.type !== "army");
    });
    var available = Math.max(0, source.guardTroops - S.Config.MIN_GARRISON);
    if (!targetRoutes.length) { U.notify("自領を経由して到達できる侵攻先がありません", "error"); return; }
    if (!officers.length) { U.notify("出陣できる武将がいません", "error"); return; }
    if (available < S.Config.MIN_ATTACK_FORCE) { U.notify("最低守備兵を残すため出陣兵力が不足しています", "error"); return; }

    var firstTroops = Math.max(S.Config.MIN_ATTACK_FORCE, Math.min(available, Math.floor(available * 0.7)));
    var html = '<div class="strategic-visual-screen sv-deploy-screen">' +
      '<header class="sv-screen-header"><div><small>軍団編成 / 出陣準備</small><h2>' + U.escape(source.name) + 'から出陣</h2></div><div class="sv-resource-chips"><span>守備兵<strong>' + source.guardTroops + '</strong></span><span>出陣可能<strong>' + available + '</strong></span><span>命令<strong>' + state.campaign.commands + '</strong></span></div></header>' +
      '<section class="sv-operation-board"><div class="sv-operation-art"><img src="assets/ui/army-camp.svg" alt="出陣準備の仮ビジュアル"><div><small>作戦目標</small><strong>侵攻軍を編成</strong><p>武将・兵種・兵数を選び、敵城へ軍勢を送り出します。</p></div></div>' +
      '<label class="sv-target-select"><span>侵攻先・進軍路</span><select id="armyTarget">' + targetRoutes.map(function (item) { var castle = item.castle, routeNames = item.route.map(function (id) { return state.castles[id].name; }).join("→"); return '<option value="' + U.escape(castle.id) + '">' + U.escape(castle.name) + ' / 約' + item.seasons + '季 / ' + U.escape(routeNames) + ' / 敵兵' + (state.events.intel[castle.id] > 0 ? castle.troops : '?') + '</option>'; }).join('') + '</select></label></section>' +
      '<div class="sv-deploy-grid army-unit-builder">' +
        '<section class="sv-unit-slot commander"><div class="sv-unit-slot-head"><span class="sv-unit-emblem">大</span><div><small>UNIT 1</small><strong>総大将</strong></div></div><label><span>武将</span><select id="armyOfficer1">' + officerOptions(officers, officers[0].id, false) + '</select></label><div class="sv-unit-fields"><label><span>兵種</span><select id="armyType1">' + unitTypeOptions("ashigaru") + '</select></label><label><span>兵数</span><input id="armyTroops1" type="number" min="1" max="' + available + '" value="' + firstTroops + '"></label></div></section>' +
        '<section class="sv-unit-slot"><div class="sv-unit-slot-head"><span class="sv-unit-emblem">副</span><div><small>UNIT 2</small><strong>第二部隊</strong></div></div><label><span>武将</span><select id="armyOfficer2">' + officerOptions(officers, "", true) + '</select></label><div class="sv-unit-fields"><label><span>兵種</span><select id="armyType2">' + unitTypeOptions("kiba") + '</select></label><label><span>兵数</span><input id="armyTroops2" type="number" min="1" max="' + available + '" value="10"></label></div></section>' +
        '<section class="sv-unit-slot"><div class="sv-unit-slot-head"><span class="sv-unit-emblem">遊</span><div><small>UNIT 3</small><strong>第三部隊</strong></div></div><label><span>武将</span><select id="armyOfficer3">' + officerOptions(officers, "", true) + '</select></label><div class="sv-unit-fields"><label><span>兵種</span><select id="armyType3">' + unitTypeOptions("teppo") + '</select></label><label><span>兵数</span><input id="armyTroops3" type="number" min="1" max="' + available + '" value="10"></label></div></section>' +
      '</div>' +
      '<section class="sv-deploy-footer"><div><small>遠征維持費</small><strong>兵' + S.Config.Balance.domestic.armyUpkeepGoldDivisor + '人ごとに金1 / 兵' + S.Config.Balance.domestic.armyUpkeepFoodDivisor + '人ごとに兵糧1</strong><span>出陣すると命令を1消費します。城主・奉行を出すとその役目を離れます。</span></div><button class="button secondary" data-close-modal>戻る</button><button class="button primary sv-deploy-button" data-deploy-army data-army-source="' + U.escape(sourceId) + '">出陣する</button></section>' +
      '</div>';
    U.openModal(html, { modalClass: "strategic-visual-modal" });
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

  U.showInterceptPlanner = function (targetArmyId) {
    var state = S.State.current, enemy = S.Systems.Army.get(state, targetArmyId);
    if (!enemy) { U.notify("迎撃対象が見つかりません", "error"); return; }
    var sourceId = enemy.destinationCastleId, check = S.Systems.Army.canIntercept(state, targetArmyId, sourceId);
    if (!check.ok) { U.notify(check.errors.join(" / "), "error"); return; }
    var source = state.castles[sourceId], enemyCommander = state.officers[enemy.commanderId];
    var officers = S.Systems.Officer.atCastle(state, sourceId, state.campaign.playerFactionId).filter(function (officer) { return officer.injury !== "重傷" && (!officer.assignment || officer.assignment.type !== "army"); });
    var available = Math.max(0, source.guardTroops - S.Config.MIN_GARRISON);
    if (!officers.length || available < S.Config.MIN_ATTACK_FORCE) { U.notify("迎撃軍を編成できる武将または兵力が不足しています", "error"); return; }
    var firstTroops = Math.min(available, Math.max(S.Config.MIN_ATTACK_FORCE, Math.floor(available * 0.55)));
    var html = '<div class="strategic-visual-screen"><header class="sv-screen-header"><div><small>INTERCEPT / 迎撃準備</small><h2>' + U.escape(source.name) + 'から敵軍を迎撃</h2></div><div class="sv-resource-chips"><span>敵軍<strong>' + S.Systems.Army.totalTroops(state, enemy) + '</strong></span><span>守備残し<strong>' + S.Config.MIN_GARRISON + '</strong></span></div></header>' +
      '<section class="sv-operation-board"><div class="sv-operation-art"><img src="assets/ui/army-camp.svg" alt="迎撃準備"><div><small>迎撃目標</small><strong>' + U.escape(enemyCommander ? enemyCommander.name : enemy.id) + '隊</strong><p>' + U.escape(state.castles[enemy.currentLocation.fromCastleId].name) + '―' + U.escape(source.name) + '間の街道で野戦を仕掛けます。</p></div></div></section>' +
      '<div class="sv-deploy-grid army-unit-builder">' +
      '<section class="sv-unit-slot commander"><div class="sv-unit-slot-head"><span class="sv-unit-emblem">大</span><div><small>UNIT 1</small><strong>迎撃総大将</strong></div></div><label><span>武将</span><select id="interceptOfficer1">' + officerOptions(officers, officers[0].id, false) + '</select></label><div class="sv-unit-fields"><label><span>兵種</span><select id="interceptType1">' + unitTypeOptions("ashigaru") + '</select></label><label><span>兵数</span><input id="interceptTroops1" type="number" min="1" max="' + available + '" value="' + firstTroops + '"></label></div></section>' +
      '<section class="sv-unit-slot"><div class="sv-unit-slot-head"><span class="sv-unit-emblem">副</span><div><small>UNIT 2</small><strong>第二部隊</strong></div></div><label><span>武将</span><select id="interceptOfficer2">' + officerOptions(officers, "", true) + '</select></label><div class="sv-unit-fields"><label><span>兵種</span><select id="interceptType2">' + unitTypeOptions("kiba") + '</select></label><label><span>兵数</span><input id="interceptTroops2" type="number" min="1" max="' + available + '" value="10"></label></div></section>' +
      '<section class="sv-unit-slot"><div class="sv-unit-slot-head"><span class="sv-unit-emblem">遊</span><div><small>UNIT 3</small><strong>第三部隊</strong></div></div><label><span>武将</span><select id="interceptOfficer3">' + officerOptions(officers, "", true) + '</select></label><div class="sv-unit-fields"><label><span>兵種</span><select id="interceptType3">' + unitTypeOptions("teppo") + '</select></label><label><span>兵数</span><input id="interceptTroops3" type="number" min="1" max="' + available + '" value="10"></label></div></section></div>' +
      '<section class="sv-deploy-footer"><div><small>迎撃</small><strong>次季、同じ街道区間で接触すると野戦</strong><span>プレイヤー軍が参加する野戦はTactical Battleで直接指揮します。</span></div><button class="button secondary" data-close-modal>戻る</button><button class="button primary" data-deploy-intercept data-target-army="' + U.escape(enemy.id) + '">迎撃に出る</button></section></div>';
    U.openModal(html, { modalClass:"strategic-visual-modal" });
  };
  U.deployInterceptFromModal = function (button) {
    var specs=[], seen={}, error=null;
    for(var i=1;i<=3;i+=1){ var officerId=U.el("interceptOfficer"+i).value; if(!officerId) continue; var troops=Math.floor(Number(U.el("interceptTroops"+i).value)); if(seen[officerId]){error="同じ武将を複数部隊に配置できません";break;} if(!Number.isFinite(troops)||troops<=0){error="兵数を正しく入力してください";break;} seen[officerId]=true; specs.push({officerId:officerId,unitType:U.el("interceptType"+i).value,troops:troops}); }
    if(error){U.notify(error,"error");return;} if(!specs.length){U.notify("最低1部隊を編成してください","error");return;}
    var enemy=S.Systems.Army.get(S.State.current,button.dataset.targetArmy), sourceId=enemy&&enemy.destinationCastleId;
    var result=enemy&&sourceId?S.Systems.Army.deployIntercept(S.State.current,sourceId,enemy.id,specs,{commanderId:specs[0].officerId,consumeCommand:true}):{ok:false,errors:["迎撃対象が見つかりません"]};
    if(U.commit(result)) U.closeModal();
  };

  U.showArmyDetail = function (armyId) {
    var state = S.State.current, army = S.Systems.Army.get(state, armyId);
    if (!army) { U.notify("軍勢が見つかりません", "error"); return; }
    var commander = state.officers[army.commanderId], origin = state.castles[army.originCastleId], target = state.castles[army.destinationCastleId];
    var units = army.unitIds.map(function (unitId) { return S.Systems.Unit.get(state, unitId); }).filter(Boolean);
    var status = army.status === "marching" ? (army.mission === "reinforce" ? "援軍移動中" : army.mission === "intercept" ? "迎撃進軍中" : "進軍中") : army.status === "returning" ? "敗走中" : army.status === "arrived" ? "到着" : army.status === "in_battle" ? "会戦待機" : army.status === "besieging" ? "包囲中" : army.status;
    var upkeep = S.Systems.Domestic.upkeepForArmy(state, army), siegeHtml = "";
    var routeNames = (army.route || []).map(function (id) { return state.castles[id] ? state.castles[id].name : id; });
    var eta = (army.status === "marching" || army.status === "returning") ? S.Systems.Army.remainingEta(state, army) : 0;
    var interceptHtml = "";
    if (army.factionId !== state.campaign.playerFactionId && army.status === "marching") {
      var interceptSourceId = army.destinationCastleId;
      var interceptCheck = interceptSourceId ? S.Systems.Army.canIntercept(state, army.id, interceptSourceId) : { ok: false };
      if (interceptCheck.ok) {
        interceptHtml = "<div class=\"siege-status-card\"><p class=\"kicker\">INTERCEPT / 迎撃可能</p><strong>この敵軍を街道上で迎撃できます</strong><p>防衛城から迎撃軍を出し、次季の街道接触で野戦を仕掛けます。</p><div class=\"modal-actions\"><button class=\"button primary\" data-intercept-army=\"" + U.escape(army.id) + "\">迎撃軍を出す</button></div></div>";
      } else {
        interceptHtml = "<div class=\"record\"><strong>迎撃</strong><p>現在は迎撃できません。敵軍が自城への最終隣接区間に入ると迎撃可能になります。</p></div>";
      }
    }
    if (army.status === "besieging" && target && S.Systems.Siege) {
      var preview = S.Systems.Siege.preview(state, army, target, S.Config.Balance.siege.continuationThreshold);
      var progress = preview ? Math.min(100, Math.round(preview.attackScore / Math.max(1, preview.requiredScore) * 100)) : 0;
      siegeHtml = preview ? "<div class=\"siege-status-card\"><p class=\"kicker\">SIEGE / 包囲中</p><strong>" + U.escape(target.name) + "はまだ落城していません</strong><p>攻城力 " + preview.attackScore + " / 城防御 " + preview.defenseScore + "（必要 " + preview.requiredScore + "）</p><div class=\"siege-meter\"><span style=\"width:" + progress + "%\"></span></div><small>守備兵 " + target.guardTroops + " / 防備Lv." + target.defense + " / 次の季節に自動で攻城を継続</small></div>" : "";
    }
    U.openModal("<p class=\"kicker\">FIELD ARMY</p><h2>" + U.escape(commander ? commander.name : army.id) + "隊</h2>" +
      "<div class=\"army-summary-strip\"><span>任務<strong>" + U.escape(army.status === "returning" ? "撤退" : army.mission === "reinforce" ? "援軍" : army.mission === "intercept" ? "迎撃" : "侵攻") + "</strong></span><span>状態<strong>" + U.escape(status) + "</strong></span><span>総兵力<strong>" + S.Systems.Army.totalTroops(state, army) + "</strong></span><span>部隊数<strong>" + units.length + "</strong></span></div>" +
      "<div class=\"domestic-economy-strip army-cost-strip\"><span>季節維持費<strong>金 " + upkeep.gold + "</strong></span><span>季節兵糧<strong>兵糧 " + upkeep.food + "</strong></span><span>対象兵力<strong>" + upkeep.troops + "</strong></span><span>Clock<strong>1季ごと</strong></span></div>" +
      "<div class=\"record strategic-route-record\"><strong>" + (army.status === "returning" ? "退却路" : "進軍路") + (eta ? " / 残り約" + eta + "季" : "") + "</strong><p>" + U.escape(routeNames.length ? routeNames.join(" → ") : ((origin ? origin.name : "?") + " → " + (target ? target.name : "?"))) + "</p></div>" + siegeHtml +
      interceptHtml + "<div class=\"army-detail-units\">" + units.map(function (unit) { var officer = state.officers[unit.officerId], type = S.Data.getUnitType(unit.unitType); return "<div class=\"record\"><strong>" + U.escape(officer ? officer.name : unit.officerId) + " / " + U.escape(type ? type.name : unit.unitType) + "</strong><p>兵" + unit.troops + " / 士気" + unit.morale + (unit.officerId === army.commanderId ? " / 総大将" : "") + "</p></div>"; }).join("") + "</div>" +
      "<div class=\"modal-actions\">" +
        (army.factionId === state.campaign.playerFactionId && (army.status === "marching" || army.status === "besieging") ? "<button class=\"button secondary\" data-cancel-army=\"" + U.escape(army.id) + "\">" + (army.status === "besieging" ? "包囲を解いて撤退" : "撤兵する") + "</button>" : "") +
        (army.factionId === state.campaign.playerFactionId && army.status === "in_battle" && state.events.pendingTacticalBattle && state.events.pendingTacticalBattle.armyId === army.id ? "<button class=\"button primary\" data-open-tactical>会戦を再開</button>" : "") +
        "<button class=\"button secondary\" data-close-modal>閉じる</button></div>");
  };

  U.showBattleReport = function (report) {
    if (!report) return false;
    var siegeHtml = "", pursuitHtml = "", pursuitCheck = null;
    if (report.mode === "tactical_field") siegeHtml = "<div class=\"siege-result holding\"><strong>⚔️ 街道野戦</strong><p>城に到達する前に敵軍と接触し、野戦で決着しました。城の所有権は変化しません。</p></div>";
    if (report.mode === "tactical") {
      if (report.castleCaptured) siegeHtml = "<div class=\"siege-result captured\"><strong>🏯 落城</strong><p>野戦の勝利をそのまま攻城成功へつなげました。城は自領になりました。</p></div>";
      else if (report.siegeStatus === "besieging") siegeHtml = "<div class=\"siege-result holding\"><strong>🛡️ 包囲継続</strong><p>野戦には勝利しましたが城は持ちこたえています。遠征軍は現地に残り、次の季節に攻城を継続します。</p>" + (report.siegeAttackScore !== null ? "<small>攻城力 " + report.siegeAttackScore + " / 城防御 " + report.siegeDefenseScore + " / 必要 " + report.siegeRequiredScore + "</small>" : "") + "</div>";
    }
    if ((report.mode === "field_legacy" || report.mode === "tactical_field") && S.Systems.Army && S.Systems.Army.canPursue) {
      pursuitCheck = S.Systems.Army.canPursue(S.State.current, report);
      if (pursuitCheck.ok) {
        var profile = pursuitCheck.stateChanges.profile || {}, aftermath = pursuitCheck.stateChanges.aftermath || {}, ratePct = Math.round((profile.rate || 0.18) * 100), cavalryPct = Math.round((profile.cavalryRatio || 0) * 100), fatigueCost = Number.isFinite(profile.fatigueCost) ? profile.fatigueCost : 8;
        var capturePct = Math.round((aftermath.captureChance || 0) * 100), riskPct = Math.round((aftermath.riskChance || 0) * 100);
        pursuitHtml = "<div class=\"siege-result pursuit-card\"><strong>🏇 追撃可能 / 効果 " + U.escape(profile.effectLabel || "中") + "</strong><p>敵軍は敗走中です。追撃すれば追加損害と敵将捕縛を狙えますが、深追いで総大将に負担が出る可能性があります。</p><small>騎馬 " + cavalryPct + "% / 予想追加損害 約" + ratePct + "% / 捕縛見込み 約" + capturePct + "% / 深追いリスク " + U.escape(aftermath.riskLabel || "低") + " 約" + riskPct + "% / 総大将疲労 +" + fatigueCost + "</small><div class=\"modal-actions\"><button class=\"button secondary\" data-decline-pursuit=\"" + U.escape(report.id) + "\">追撃せず戻る</button><button class=\"button primary\" data-pursue-battle=\"" + U.escape(report.id) + "\">追撃する</button></div></div>";
      } else if (report.pursuitResult) {
        var resolvedRate = Number.isFinite(report.pursuitRate) ? Math.round(report.pursuitRate * 100) : 18;
        var aftermathText = report.pursuitCapturedOfficerId && S.State.current.officers[report.pursuitCapturedOfficerId] ? " / 捕縛 " + U.escape(S.State.current.officers[report.pursuitCapturedOfficerId].name) : "";
        aftermathText += report.pursuitIncident ? " / 深追い事故" + (report.pursuitCommanderInjury ? "（" + U.escape(report.pursuitCommanderInjury) + "）" : "") : "";
        pursuitHtml = "<div class=\"siege-result pursuit-card resolved\"><strong>🏇 " + (report.pursuitByAI ? "敵軍の追撃判断" : "戦後処理") + "</strong><p>" + U.escape(report.pursuitResult) + "</p>" + (report.pursuitLoss ? "<small>追加損害 " + report.pursuitLoss + " / 追撃効率 " + resolvedRate + "%" + aftermathText + "</small>" : (aftermathText ? "<small>" + aftermathText.replace(/^ \/ /, "") + "</small>" : "")) + "</div>";
      }
    }
    U.openModal("<p class=\"kicker\">BATTLE REPORT</p><h2>" + U.escape(report.name) + " — " + U.escape(report.result) + "</h2><div class=\"stat-grid\"><div><span>総大将</span><strong>" + U.escape(report.commander) + "</strong></div><div><span>副将</span><strong>" + U.escape(report.deputy) + "</strong></div><div><span>投入兵</span><strong>" + report.committedTroops + "</strong></div><div><span>攻撃側損失</span><strong>" + report.attackerLoss + "</strong></div></div><p>戦術：" + U.escape(report.tactic) + " / 判断：" + U.escape(report.decision) + "</p><p class=\"major\">因縁：" + U.escape(report.rivalry) + (report.injury ? " / 負傷：" + U.escape(report.injury) : "") + "</p>" + siegeHtml + pursuitHtml + (pursuitCheck && pursuitCheck.ok ? "" : "<div class=\"modal-actions\"><button class=\"button secondary\" data-open-rivals>因縁録</button><button class=\"button secondary\" data-open-battles>合戦記録</button><button class=\"button primary\" data-battle-finish>軍議へ戻る</button></div>") + "");
    return true;
  };
})(window.Sengoku);
