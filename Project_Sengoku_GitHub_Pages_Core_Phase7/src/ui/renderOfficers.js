(function (S) {
  "use strict";
  var U = S.UI;

  function assignmentClass(officer) {
    var type = S.Systems.Officer.assignment(officer).type;
    return "assignment-" + type;
  }

  function officerLine(officer) {
    var assignment = S.Systems.Officer.assignmentLabel(officer);
    return '<button type="button" class="officer-line" data-officer-id="' + U.escape(officer.id) + '" aria-label="' + U.escape(officer.name + 'の詳細を開く') + '">' +
      '<span class="officer-seal" aria-hidden="true">将</span><span><strong>' + (S.State.current.meta.favoriteOfficerId === officer.id ? '★ ' : '') + U.escape(officer.name) +
      '<em class="assignment-chip ' + assignmentClass(officer) + '">' + U.escape(assignment) + '</em></strong>' +
      '<small>' + U.escape(officer.traits.join('・')) + ' / 忠誠' + officer.loyalty + ' / 体力' + officer.health + (officer.injury ? ' / ' + U.escape(officer.injury) : '') + '</small></span></button>';
  }

  function roleSummary(state, castle, domestic) {
    var governor = castle.governorId ? state.officers[castle.governorId] : null;
    var steward = S.Systems.Officer.domesticOfficerAt(state, castle.id);
    var effects = domestic.assignmentEffects(state, castle);
    return '<div class="assignment-strip">' +
      '<span><small>城主</small><strong>' + U.escape(governor ? governor.name : '未任命') + '</strong></span>' +
      '<span><small>奉行</small><strong>' + U.escape(steward ? steward.name : '未任命') + '</strong></span>' +
      '<span><small>統治補正</small><strong>+' + Math.round((effects.goldMultiplier - 1) * 100) + '%</strong></span>' +
      '<span><small>守備補正</small><strong>+' + effects.defenseBonus + '</strong></span>' +
      '</div>';
  }

  U.renderCastleDetail = function () {
    var state = S.State.current, castle = state.castles[state.campaign.selectedCastleId], root = U.el("castleDetail");
    if (!castle) { root.innerHTML = "<div class=\"castle-detail muted\">城を選択してください。</div>"; return; }
    var friendly = castle.factionId === state.campaign.playerFactionId, known = friendly || state.events.intel[castle.id] > 0;
    var officers = S.Systems.Officer.atCastle(state, castle.id, friendly ? state.campaign.playerFactionId : null);
    var domestic = S.Systems.Domestic, recruitCapacity = domestic.recruitmentCapacity(castle), recruitRoom = domestic.recruitmentRoom(castle);
    var goldYield = domestic.effectiveGoldYieldForCastle(state, castle), foodYield = domestic.effectiveFoodYieldForCastle(state, castle), upkeep = friendly ? domestic.armyUpkeepForFaction(state, castle.factionId) : { gold: 0, food: 0 };
    var profile = domestic.castleProfile(castle), modifiers = profile.modifiers || {};
    root.innerHTML = "<div class=\"castle-detail\"><div class=\"castle-title\"><div><p class=\"kicker\">" + U.escape(state.factions[castle.factionId].name) + "</p><h3>" + U.escape(castle.name) + "</h3></div><span class=\"badge\">" + (friendly ? "自勢力" : "敵勢力") + "</span></div>" +
      "<div class=\"castle-identity-card\"><span class=\"castle-identity-icon\" aria-hidden=\"true\">" + U.escape(profile.icon) + "</span><div><small>" + U.escape(profile.type) + "</small><strong>" + U.escape(profile.title) + "</strong><p>" + U.escape(profile.description) + "</p><div class=\"castle-trait-tags\">" + (profile.tags || []).map(function (tag) { return "<em>" + U.escape(tag) + "</em>"; }).join("") + "</div></div></div>" +
      "<div class=\"stat-grid domestic-stats\"><div><span>人口</span><strong>" + (known ? castle.population.toLocaleString() : "?") + "</strong></div><div><span>守備兵</span><strong>" + (known ? castle.guardTroops : "?") + "</strong></div><div><span>徴兵上限</span><strong>" + (known ? recruitCapacity : "?") + "</strong></div><div><span>収入基盤</span><strong>" + (known ? castle.income : "?") + "</strong></div><div><span>農業</span><strong>" + (known ? "Lv." + castle.agriculture : "?") + "</strong></div><div><span>防備</span><strong>Lv." + (known ? castle.defense : "?") + "</strong></div><div><span>士気</span><strong>" + (known ? castle.morale : "?") + "</strong></div><div><span>徴兵余地</span><strong>" + (known ? recruitRoom : "?") + "</strong></div></div>" +
      (friendly ? roleSummary(state, castle, domestic) : "") +
      (friendly ? "<div class=\"domestic-economy-strip\"><span>季節の金<strong>+" + goldYield + "</strong></span><span>季節の兵糧<strong>+" + foodYield + "</strong></span><span>城特性<strong>金×" + (modifiers.gold || 1).toFixed(2) + "</strong></span><span>遠征維持<strong>金-" + upkeep.gold + " / 糧-" + upkeep.food + "</strong></span></div>" : "") +
      (friendly ? officers.map(officerLine).join("") : "") +
      (friendly && state.campaign.status !== "opening" ? "<div class=\"command-grid\"><button class=\"command\" data-command=\"develop\"><strong>町づくり</strong><small>金" + S.Config.Balance.develop.gold + " / 収入・人口</small></button><button class=\"command\" data-command=\"cultivate\"><strong>開墾</strong><small>金" + S.Config.Balance.cultivate.gold + " / 農業・人口</small></button><button class=\"command\" data-command=\"recruit\"><strong>徴兵</strong><small>金" + S.Config.Balance.recruit.gold + "・兵糧" + S.Config.Balance.recruit.food + " / 残" + recruitRoom + "</small></button><button class=\"command\" data-command=\"train\"><strong>訓練</strong><small>兵糧" + S.Config.Balance.train.food + " / 士気増加</small></button><button class=\"command\" data-command=\"rest\"><strong>休養</strong><small>体力・疲労回復</small></button><button class=\"command\" data-command=\"scout\"><strong>偵察</strong><small>金" + S.Config.Balance.scout.gold + " / 敵情報</small></button><button class=\"command attack\" data-command=\"attack\"><strong>軍勢出陣</strong><small>最大3区間の進軍路を選択</small></button><button class=\"command\" data-open-move><strong>武将移動</strong><small>命令1 / 自勢力城へ</small></button></div>" : "") +
      (state.prisoners.length ? "<button class=\"button secondary wide\" data-open-prisoners style=\"margin-top:9px\">捕虜処遇</button>" : "") + "</div>";
  };

  U.showOfficerDetail = function (officerId) {
    var state = S.State.current, officer = state.officers[officerId];
    if (!officer) return;
    var risk = S.Systems.Loyalty.risk(state, officerId), history = (officer.history || []).slice().reverse();
    var rivalries = Object.keys(state.rivalries).map(function (key) { return state.rivalries[key]; }).filter(function (item) { return item.playerId === officerId || item.enemyId === officerId; });
    var assignment = S.Systems.Officer.assignment(officer), assignmentLabel = S.Systems.Officer.assignmentLabel(officer), castleName = assignment.castleId && state.castles[assignment.castleId] ? state.castles[assignment.castleId].name : null;
    var activePlayer = officer.factionId === state.campaign.playerFactionId && officer.status === "active";
    U.openModal("<p class=\"kicker\">RETAINER RECORD</p><h2>" + U.escape(officer.name) + "</h2><p>" + U.escape(officer.age) + "歳・" + U.escape(officer.role) + "・" + U.escape(officer.traits.join(" / ")) + "</p><blockquote>「" + U.escape(officer.quote) + "」</blockquote>" +
      "<div class=\"assignment-record " + assignmentClass(officer) + "\"><span>現在の役目</span><strong>" + U.escape(assignmentLabel) + "</strong><small>" + U.escape(castleName || (assignment.armyId ? "軍勢所属" : "配属なし")) + "</small></div>" +
      "<div class=\"stat-grid\"><div><span>統率</span><strong>" + officer.stats.leadership + "</strong></div><div><span>武力</span><strong>" + officer.stats.might + "</strong></div><div><span>知略</span><strong>" + officer.stats.intellect + "</strong></div><div><span>政治</span><strong>" + officer.stats.politics + "</strong></div><div><span>忠誠</span><strong>" + officer.loyalty + "</strong></div><div><span>勲功</span><strong>" + officer.merit + "</strong></div></div>" +
      "<div class=\"record\"><strong>離反危険：" + U.escape(S.Systems.Loyalty.label(risk)) + " " + risk + "</strong><div class=\"loyalty-meter\"><i style=\"width:" + officer.loyalty + "%\"></i></div><small>不満" + officer.grievance + " / 野心" + officer.ambition + " / 主君への信頼" + officer.lordTrust + (officer.promise ? "<br>約束：" + U.escape(officer.promise.text) + "（" + U.escape(officer.promise.status) + "）" : "") + "</small></div>" +
      (officer.goal ? "<div class=\"record\"><strong>個人目標：" + U.escape(officer.goal.title) + "</strong><p>" + U.escape(officer.goal.text) + "（" + officer.goal.progress + "/" + officer.goal.target + "）</p></div>" : "") +
      (rivalries.length ? "<div class=\"record\"><strong>因縁</strong>" + rivalries.map(function (item) { var otherId = item.playerId === officerId ? item.enemyId : item.playerId; return "<p>" + U.escape(state.officers[otherId].name) + "：" + U.escape(S.Systems.Rivalry.label(item)) + " / 対決" + item.encounters + "回</p>"; }).join("") + "</div>" : "") +
      "<div class=\"record\"><strong>生涯記録</strong>" + (history.length ? history.map(function (item) { return "<p>" + U.escape(item.date) + " — " + U.escape(item.text) + "</p>"; }).join("") : "<p>まだ記録はありません。</p>") + "</div>" +
      "<div class=\"modal-actions\"><button class=\"button secondary\" data-favorite-officer=\"" + U.escape(officerId) + "\">" + (state.meta.favoriteOfficerId === officerId ? "お気に入りを外す" : "お気に入りにする") + "</button>" +
      (activePlayer ? "<button class=\"button secondary\" data-audience=\"" + U.escape(officerId) + "\">面談</button><button class=\"button secondary\" data-reward=\"" + U.escape(officerId) + "\">褒賞</button>" : "") +
      (activePlayer && assignment.type !== "army" ? "<button class=\"button secondary\" data-appoint=\"" + U.escape(officerId) + "\">城主に任命</button>" : "") +
      (activePlayer && assignment.type === "idle" && officer.castleId ? "<button class=\"button primary\" data-assign-domestic=\"" + U.escape(officerId) + "\">奉行に任命</button>" : "") +
      (activePlayer && assignment.type === "domestic" ? "<button class=\"button secondary\" data-set-officer-idle=\"" + U.escape(officerId) + "\">奉行を解く</button>" : "") +
      "<button class=\"button primary\" data-close-modal>閉じる</button></div>");
  };

  U.showAppointment = function (officerId) {
    var state = S.State.current, officer = state.officers[officerId], castles = S.Systems.Turn.playerCastles(state);
    U.openModal("<p class=\"kicker\">APPOINTMENT</p><h2>" + U.escape(officer.name) + "を城主に任じる</h2><p>城主任命は命令を1消費します。約束がある場合は履行されます。</p><div class=\"choices\">" + castles.map(function (castle) { var governor = state.officers[castle.governorId]; return "<button class=\"choice\" data-appoint-castle=\"" + U.escape(castle.id) + "\" data-appoint-officer=\"" + U.escape(officerId) + "\"><strong>" + U.escape(castle.name) + "</strong><small>現在の城主：" + U.escape(governor ? governor.name : "未設定") + "</small></button>"; }).join("") + "</div>");
  };

  U.showOfficerChoice = function (action) {
    var state = S.State.current, castle = state.castles[state.campaign.selectedCastleId], officers = S.Systems.Officer.atCastle(state, castle.id, state.campaign.playerFactionId);
    if (!officers.length) { U.notify("この城に命令できる武将がいません", "error"); return; }
    var statKey = action === "develop" || action === "cultivate" ? "politics" : action === "recruit" || action === "train" ? "leadership" : action === "scout" ? "intellect" : "health";
    officers = officers.slice().sort(function (a, b) { var av = statKey === "health" ? a.health : a.stats[statKey], bv = statKey === "health" ? b.health : b.stats[statKey]; return bv - av; });
    U.openModal("<p class=\"kicker\">ASSIGN RETAINER</p><h2>担当武将を選ぶ</h2><div class=\"choices\">" + officers.map(function (officer) { return "<button class=\"choice\" data-run-command=\"" + U.escape(action) + "\" data-command-officer=\"" + U.escape(officer.id) + "\"><strong>" + U.escape(officer.name) + " <em class=\"assignment-chip " + assignmentClass(officer) + "\">" + U.escape(S.Systems.Officer.assignmentLabel(officer)) + "</em></strong><small>統" + officer.stats.leadership + " 武" + officer.stats.might + " 知" + officer.stats.intellect + " 政" + officer.stats.politics + " / 疲労" + officer.fatigue + "</small></button>"; }).join("") + "</div>");
  };

  U.showMoveSetup = function () {
    var state = S.State.current, officers = Object.keys(state.officers).map(function (id) { return state.officers[id]; }).filter(function (officer) { return officer.factionId === state.campaign.playerFactionId && officer.status === "active" && officer.injury !== "重傷" && S.Systems.Officer.assignment(officer).type !== "army"; }), castles = S.Systems.Turn.playerCastles(state);
    U.openModal("<p class=\"kicker\">OFFICER TRANSFER</p><h2>武将移動</h2><p>自勢力の城へ武将を移動します。城主が移動する場合は城主欄を解除します。</p><label class=\"field\"><span>武将</span><select id=\"moveOfficerSelect\">" + officers.map(function (officer) { return "<option value=\"" + U.escape(officer.id) + "\">" + U.escape(officer.name) + "（" + U.escape(state.castles[officer.castleId].name) + " / " + U.escape(S.Systems.Officer.assignmentLabel(officer)) + "）</option>"; }).join("") + "</select></label><label class=\"field\"><span>移動先</span><select id=\"moveCastleSelect\">" + castles.map(function (castle) { return "<option value=\"" + U.escape(castle.id) + "\">" + U.escape(castle.name) + "</option>"; }).join("") + "</select></label><div class=\"modal-actions\"><button class=\"button secondary\" data-close-modal>戻る</button><button class=\"button primary\" data-move-officer>移動する</button></div>");
  };
})(window.Sengoku);
