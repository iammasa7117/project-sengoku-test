(function (S) {
  "use strict";
  var U = S.UI;
  function factionName(state, id) { return state.factions[id] ? state.factions[id].name : id; }
  function scenarioName(state) { var item = S.Data.getScenario(state.campaign.scenarioId); return item ? item.name : state.campaign.scenarioId; }
  function difficultyName(state) { var item = S.Data.getDifficulty(state.campaign.difficultyId); return item ? item.name : state.campaign.difficultyId; }
  function playerPrisoners(state) {
    return state.prisoners.filter(function (id) { return state.officers[id] && state.officers[id].captorFactionId === state.campaign.playerFactionId; });
  }
  U.showNewGameSetup = function () {
    U.openModal("<p class=\"kicker\">NEW CAMPAIGN</p><h2 id=\"modalHeading\">新規ゲーム</h2>" +
      "<label class=\"field\"><span>シナリオ</span><select id=\"setupScenario\">" + S.Data.scenarios.map(function (item) { return "<option value=\"" + U.escape(item.id) + "\">" + U.escape(item.name) + "</option>"; }).join("") + "</select></label>" +
      "<label class=\"field\"><span>勢力</span><select id=\"setupFaction\"></select></label>" +
      "<label class=\"field\"><span>難易度</span><select id=\"setupDifficulty\">" + S.Data.difficulties.map(function (item) { return "<option value=\"" + U.escape(item.id) + "\"" + (item.id === "normal" ? " selected" : "") + ">" + U.escape(item.name) + "</option>"; }).join("") + "</select></label>" +
      "<label class=\"toggle-row setup-guide-toggle\"><span><strong>初心者ガイドを表示</strong><small>次の一手と基本操作のチェックリストを表示します。</small></span><input id=\"setupTutorial\" type=\"checkbox\" checked></label>" +
      "<div id=\"setupSummary\" class=\"record\"></div><div class=\"modal-actions\"><button class=\"button secondary\" data-open-help>遊び方</button><button class=\"button secondary\" data-close-modal>戻る</button><button class=\"button primary\" data-start-new-game>開始</button></div>", { labelledBy: "modalHeading" });
    U.updateNewGameSetup();
  };
  U.updateNewGameSetup = function () {
    var scenarioEl = U.el("setupScenario"), factionEl = U.el("setupFaction"), difficultyEl = U.el("setupDifficulty");
    if (!scenarioEl || !factionEl || !difficultyEl) return;
    var scenario = S.Data.getScenario(scenarioEl.value) || S.Data.scenarios[0], previous = factionEl.value;
    factionEl.innerHTML = scenario.selectableFactionIds.map(function (id) { var f = S.Data.factions.find(function (item) { return item.id === id; }); return "<option value=\"" + U.escape(id) + "\"" + (id === previous ? " selected" : "") + ">" + U.escape(f ? f.name : id) + "</option>"; }).join("");
    var difficulty = S.Data.getDifficulty(difficultyEl.value) || S.Data.getDifficulty("normal");
    U.el("setupSummary").innerHTML = "<strong>" + U.escape(scenario.name) + "</strong><p>" + U.escape(scenario.description) + "</p><p>" + scenario.castleIds.length + "城 / " + scenario.factionIds.length + "勢力　難易度: " + U.escape(difficulty.description) + "</p>";
  };
  U.showIntro = function () {
    var state = S.State.current, faction = factionName(state, state.campaign.playerFactionId);
    if (state.campaign.scenarioId === "owari_short") {
      U.openModal("<p class=\"kicker\">PROLOGUE</p><h2>永禄元年、春</h2><p>蒼月家は清洲城ただ一城を残し、滅亡の危機にあります。</p><p>味方だけでなく、敵にも名と誇りがあります。因縁と忠誠を見届けながら、尾張四城を統一してください。</p><div class=\"modal-actions\"><button class=\"button primary\" data-close-modal>軍議を始める</button></div>");
      return;
    }
    U.openModal("<p class=\"kicker\">CAMPAIGN</p><h2>" + U.escape(faction) + "、出陣</h2><p>四勢力が十二城を分ける仮想戦役が始まります。</p><p>全城を支配するか、他勢力を滅ぼせば天下統一です。</p><div class=\"modal-actions\"><button class=\"button primary\" data-close-modal>軍議を始める</button></div>");
  };
  U.showMenu = function () {
    var state = S.State.current, faction = factionName(state, state.campaign.playerFactionId), count = playerPrisoners(state).length, pending = state.diplomacy.proposals.filter(function (item) { return item.status === "pending" && item.targetFactionId === state.campaign.playerFactionId; }).length;
    if (U.markGuideMilestone) U.markGuideMilestone("menuOpened");
    U.openModal("<p class=\"kicker\">SYSTEM</p><h2 id=\"modalHeading\">メニュー</h2><p>" + U.escape(faction) + " / " + U.escape(scenarioName(state)) + " / " + U.escape(difficultyName(state)) + "　家名信用 " + state.meta.houseHonor + "</p><div class=\"choices\">" +
      "<button class=\"choice\" data-open-diplomacy><strong>外交" + (pending ? "（提案" + pending + "件）" : "") + "</strong><small>条約・援助・捕虜交換・従属</small></button><button class=\"choice\" data-open-retainers><strong>家臣団・忠誠</strong><small>人物記録、面談、褒賞</small></button><button class=\"choice\" data-open-rivals><strong>因縁録</strong><small>対決・敬意・怨恨</small></button><button class=\"choice\" data-open-battles><strong>合戦記録</strong><small>全勢力の合戦結果</small></button><button class=\"choice\" data-open-event-history><strong>出来事履歴</strong><small>選択と結果の記録</small></button><button class=\"choice\" data-open-chronicle><strong>戦国記</strong><small>戦役の出来事</small></button>" +
      (count ? "<button class=\"choice\" data-open-prisoners><strong>捕虜処遇</strong><small>登用・解放・因縁処遇（" + count + "名）</small></button>" : "") +
      "<button class=\"choice\" data-open-help><strong>遊び方・用語集</strong><small>基本の流れ、用語、キーボード操作</small></button><button class=\"choice\" data-open-ux-settings><strong>操作・表示設定</strong><small>初心者ガイド、文字、コントラスト、動き</small></button><button class=\"choice\" data-download-report><strong>プレイレポート出力</strong><small>戦役の記録をテキスト保存</small></button><button class=\"choice\" data-open-save-menu><strong>セーブ管理</strong><small>手動保存・JSON入出力・削除</small></button></div><div class=\"modal-actions\"><button class=\"button secondary\" data-go-title>タイトルへ</button><button class=\"button primary\" data-close-modal>戻る</button></div>", { labelledBy: "modalHeading" });
  };
  U.showRetainers = function () {
    var state = S.State.current, faction = factionName(state, state.campaign.playerFactionId), list = Object.keys(state.officers).map(function (id) { return state.officers[id]; }).filter(function (officer) { return officer.factionId === state.campaign.playerFactionId && officer.status === "active"; }).sort(function (a, b) { return S.Systems.Loyalty.risk(state, b.id) - S.Systems.Loyalty.risk(state, a.id); });
    U.openModal("<p class=\"kicker\">ALL RETAINERS</p><h2>" + U.escape(faction) + " 家臣団</h2><div class=\"choices\">" + list.map(function (officer) { var risk = S.Systems.Loyalty.risk(state, officer.id); return "<button class=\"choice\" data-officer-id=\"" + U.escape(officer.id) + "\"><strong>" + U.escape(officer.name) + " — " + U.escape(S.Systems.Loyalty.label(risk)) + " " + risk + "</strong><small>忠誠" + officer.loyalty + " / 不満" + officer.grievance + " / 野心" + officer.ambition + " / 勲功" + officer.merit + "</small></button>"; }).join("") + "</div><div class=\"modal-actions\"><button class=\"button primary\" data-close-modal>閉じる</button></div>");
  };
  U.showChronicle = function () {
    var state = S.State.current, entries = state.chronicle.slice().reverse();
    U.openModal("<p class=\"kicker\">SENGOKU CHRONICLE</p><h2>" + U.escape(factionName(state, state.campaign.playerFactionId)) + "戦国記</h2>" + entries.map(function (entry) { return "<div class=\"record\"><strong>" + U.escape(entry.date) + "</strong><p>" + U.escape(entry.text) + "</p></div>"; }).join("") + "<div class=\"modal-actions\"><button class=\"button primary\" data-close-modal>閉じる</button></div>");
  };
  U.showRivals = function () {
    var state = S.State.current, list = Object.keys(state.rivalries).map(function (key) { return state.rivalries[key]; }).filter(function (item) { return state.officers[item.playerId] && state.officers[item.playerId].factionId === state.campaign.playerFactionId; });
    U.openModal("<p class=\"kicker\">RIVALRY ARCHIVE</p><h2>因縁録</h2>" + (list.length ? list.map(function (item) { var player = state.officers[item.playerId], enemy = state.officers[item.enemyId]; return "<div class=\"record\"><strong>" + U.escape(player.name) + " × " + U.escape(enemy.name) + " — " + U.escape(S.Systems.Rivalry.label(item)) + "</strong><p>対決" + item.encounters + "回 / 敬意" + item.respect + " / 怨恨" + item.resentment + "</p></div>"; }).join("") : "<p>まだ因縁はありません。</p>") + "<div class=\"modal-actions\"><button class=\"button primary\" data-close-modal>閉じる</button></div>");
  };
  U.showBattles = function () {
    var reports = S.State.current.events.battleReports.slice().reverse();
    U.openModal("<p class=\"kicker\">BATTLE ARCHIVE</p><h2>合戦記録</h2>" + (reports.length ? reports.map(function (report) { var loss = report.attackerLoss !== undefined ? report.attackerLoss : report.loss; return "<div class=\"record\"><strong>" + U.escape(report.date) + " — " + U.escape(report.name) + " — " + U.escape(report.result) + "</strong><p>大将 " + U.escape(report.commander) + " / 副将 " + U.escape(report.deputy || "なし") + " / 敵将 " + U.escape(report.enemy) + "<br>攻撃側損失" + loss + (report.defenderLoss !== undefined ? " / 防御側損失" + report.defenderLoss : "") + " / " + U.escape(report.rivalry || "") + "</p></div>"; }).join("") : "<p>まだ合戦記録はありません。</p>") + "<div class=\"modal-actions\"><button class=\"button primary\" data-close-modal>閉じる</button></div>");
  };
  U.showPrisoners = function () {
    var state = S.State.current, ids = playerPrisoners(state);
    U.openModal("<p class=\"kicker\">PRISONERS</p><h2>捕虜処遇</h2>" + (ids.length ? ids.map(function (id) { var officer = state.officers[id], rivalry = Object.keys(state.rivalries).map(function (key) { return state.rivalries[key]; }).find(function (item) { return item.enemyId === id && state.officers[item.playerId].factionId === state.campaign.playerFactionId; }); return "<div class=\"record\"><strong>" + U.escape(officer.name) + " — 忠誠" + officer.loyalty + (rivalry ? " / " + U.escape(S.Systems.Rivalry.label(rivalry)) : "") + "</strong><p>" + U.escape(officer.traits.join("・")) + "</p><div class=\"modal-actions\"><button class=\"button secondary\" data-recruit-prisoner=\"" + U.escape(id) + "\">登用</button><button class=\"button secondary\" data-release-prisoner=\"" + U.escape(id) + "\">解放</button>" + (rivalry ? "<button class=\"button secondary\" data-rival-treatment=\"honor\" data-rival-enemy=\"" + U.escape(id) + "\" data-rival-player=\"" + U.escape(rivalry.playerId) + "\">武名を認めて解放</button>" : "") + "</div></div>"; }).join("") : "<p>捕虜はいません。</p>") + "<div class=\"modal-actions\"><button class=\"button primary\" data-close-modal>閉じる</button></div>");
  };
  U.showRecruitNegotiation = function (officerId) {
    var state = S.State.current, officer = state.officers[officerId], recruiters = Object.keys(state.officers).map(function (id) { return state.officers[id]; }).filter(function (item) { return item.factionId === state.campaign.playerFactionId && item.status === "active"; });
    U.openModal("<p class=\"kicker\">RECRUITMENT NEGOTIATION</p><h2>" + U.escape(officer.name) + "を説得する</h2><label class=\"field\"><span>説得役</span><select id=\"recruiterSelect\">" + recruiters.map(function (item) { return "<option value=\"" + U.escape(item.id) + "\">" + U.escape(item.name) + "（知" + item.stats.intellect + "・政" + item.stats.politics + "）</option>"; }).join("") + "</select></label><div class=\"choices\"><button class=\"choice\" data-negotiate=\"sincere\" data-negotiate-officer=\"" + U.escape(officerId) + "\"><strong>誠意を示す</strong></button><button class=\"choice\" data-negotiate=\"promise\" data-negotiate-officer=\"" + U.escape(officerId) + "\"><strong>城主への登用を約束</strong></button><button class=\"choice\" data-negotiate=\"honor\" data-negotiate-officer=\"" + U.escape(officerId) + "\"><strong>武名を称える</strong></button></div>");
  };
  U.showDefenseNotifications = function () {
    var notices = S.Systems.Event.consumeDefenseNotifications(S.State.current);
    if (!notices.length) return false;
    U.openModal("<p class=\"kicker\">DEFENSE REPORT</p><h2>防衛戦報告</h2>" + notices.map(function (item) { return "<div class=\"record\"><strong>" + U.escape(item.date) + " — " + U.escape(item.castleName || item.name) + "</strong><p>" + U.escape(item.summary || (item.result + " / 攻撃側損失" + item.attackerLoss + " / 防御側損失" + item.defenderLoss)) + "</p></div>"; }).join("") + "<div class=\"modal-actions\"><button class=\"button primary\" data-defense-finish>確認</button></div>");
    return true;
  };
  U.downloadPlayReport = function () {
    var state = S.State.current, holdings = S.Systems.Turn.playerCastles(state), total = Object.keys(state.castles).length, lines = ["Project Sengoku Core v1.0 プレイレポート", "", "シナリオ：" + scenarioName(state), "勢力：" + factionName(state, state.campaign.playerFactionId), "難易度：" + difficultyName(state), "進行：" + S.Systems.Turn.dateLabel(state), "所持城：" + holdings.length + "/" + total, "金：" + state.campaign.gold + " / 兵糧：" + state.campaign.food, "戦争疲弊：" + state.diplomacy.warExhaustion[state.campaign.playerFactionId], "合戦数：" + state.campaign.battleCount, "経過季節：" + state.campaign.turn, "結果：" + (state.campaign.outcome || "継続中"), "", "【家臣団と忠誠】"];
    Object.keys(state.officers).map(function (id) { return state.officers[id]; }).filter(function (officer) { return officer.factionId === state.campaign.playerFactionId && officer.status === "active"; }).forEach(function (officer) { lines.push(officer.name + " Lv." + officer.level + " 勲功" + officer.merit + " 忠誠" + officer.loyalty); });
    lines.push("", "【合戦記録】"); state.events.battleReports.forEach(function (report) { lines.push(report.date + " " + report.name + " — " + report.result); });
    lines.push("", "【外交履歴】"); state.diplomacy.history.forEach(function (entry) { lines.push("第" + entry.turn + "季 " + entry.text); });
    lines.push("", "【戦国記】"); state.chronicle.forEach(function (entry) { lines.push(entry.date + " " + entry.text); });
    try { var blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }), url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = "Project_Sengoku_Core_v1_0_PlayReport_" + Date.now() + ".txt"; document.body.appendChild(link); link.click(); link.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000); return { ok: true, errors: [] }; } catch (error) { return { ok: false, errors: ["プレイレポートを出力できません"] }; }
  };
  U.showSaveMenu = function () {
    function summaryText(m) { return U.escape(m.scenarioName) + " / " + U.escape(m.factionName) + " / " + U.escape(m.difficultyName) + "<br>" + m.year + "年 " + U.escape(m.season) + " / " + m.castleCount + "城 / " + U.escape(m.savedAt); }
    function recoveryButton(id, inspection, label) {
      if (!inspection.ok || !inspection.bestBackup) return "";
      return " <button class=\"button secondary\" data-restore-save-slot=\"" + id + "\" data-restore-generation=\"" + inspection.bestBackup.generation + "\">" + U.escape(label || "バックアップ復旧") + "</button>";
    }
    function slot(id, label) {
      var inspection = S.Save.inspect(id), result = S.Save.peek(id);
      if (!result.ok) return "<button class=\"choice\" data-save-slot=\"" + id + "\"><strong>" + label + "</strong><small>空きスロット — ここへ保存</small></button>";
      var status = inspection.ok && inspection.primary.status === "corrupt" ? "<strong>" + label + " — 破損検出・復旧可能</strong><p>" : "<strong>" + label + "</strong><p>";
      var controls = "<button class=\"button secondary\" data-save-slot=\"" + id + "\">上書き保存</button> <button class=\"button secondary\" data-load-slot=\"" + id + "\">ロード</button>";
      if (inspection.ok && inspection.bestBackup) controls += recoveryButton(id, inspection, "前回バックアップへ戻す");
      return "<div class=\"record\">" + status + summaryText(result.summary) + "</p>" + controls + "</div>";
    }
    var autoInspection = S.Save.inspect("autosave"), autoPeek = S.Save.peek("autosave"), health = S.Save.health();
    var autoHtml = "<div class=\"record\"><strong>オートセーブ</strong><p>まだありません。</p></div>";
    if (autoPeek.ok) {
      autoHtml = "<div class=\"record\"><strong>オートセーブ" + (autoInspection.ok && autoInspection.primary.status === "corrupt" ? " — 破損検出" : " — 正常") + "</strong><p>" + summaryText(autoPeek.summary) + "</p><button class=\"button secondary\" data-load-slot=\"autosave\">ロード</button>" + recoveryButton("autosave", autoInspection) + "</div>";
    } else if (autoInspection.ok && autoInspection.primary.status === "corrupt") {
      autoHtml = "<div class=\"record\"><strong>オートセーブ — 復旧不能</strong><p>有効なバックアップがありません。JSONセーブをインポートしてください。</p></div>";
    }
    var storageText = health.ok ? "保存領域: 利用可能 / 使用量 約" + Math.max(1, Math.round(health.bytes / 1024)) + "KB / 3世代バックアップ" : "保存領域: 利用不可";
    U.openModal("<p class=\"kicker\">SAVE MANAGEMENT</p><h2>セーブ管理</h2><p>" + U.escape(storageText) + "</p>" + autoHtml + slot("manual1", "手動セーブ 1") + slot("manual2", "手動セーブ 2") + slot("manual3", "手動セーブ 3") + "<div class=\"choices\"><button class=\"choice\" data-export-save><strong>JSONエクスポート</strong><small>端末外へ安全な控えを保存</small></button><button class=\"choice\" data-import-save><strong>JSONインポート</strong><small>旧形式・現在形式の両方に対応</small></button><button class=\"choice\" data-delete-autosave><strong>オートセーブ削除</strong><small>主データと3世代バックアップを削除</small></button></div><div class=\"modal-actions\"><button class=\"button primary\" data-close-modal>閉じる</button></div>");
  };
  U.showEnding = function () {
    var state = S.State.current, victory = state.campaign.outcome === "victory", faction = factionName(state, state.campaign.playerFactionId), count = S.Systems.Turn.playerCastles(state).length, total = Object.keys(state.castles).length;
    var diplomacyActions = state.diplomacy.history.filter(function (entry) { return entry.major; }).length;
    var html = '<div class="ending-summary"><p class="kicker">' + (victory ? "CAMPAIGN COMPLETE" : "GAME OVER") + '</p><h2 id="modalHeading">' + U.escape(faction) + (victory ? "、天下統一" : "、滅亡") + '</h2><p>' + (victory ? total + "城中" + count + "城を支配し、戦役に勝利しました。" : "すべての城を失いました。") + '</p><div class="ending-stats">' +
      '<div><span>難易度</span><strong>' + U.escape(difficultyName(state)) + '</strong></div>' +
      '<div><span>経過</span><strong>' + state.campaign.turn + '季</strong></div>' +
      '<div><span>合戦</span><strong>' + state.campaign.battleCount + '回</strong></div>' +
      '<div><span>主要外交</span><strong>' + diplomacyActions + '件</strong></div>' +
      '<div><span>支配城</span><strong>' + count + ' / ' + total + '</strong></div>' +
      '<div><span>最終時点</span><strong>' + U.escape(S.Systems.Turn.dateLabel(state)) + '</strong></div></div><p>' + U.escape(scenarioName(state)) + '</p></div>' +
      '<div class="modal-actions"><button class="button secondary" data-download-report>プレイレポート</button><button class="button secondary" data-open-chronicle>戦国記</button><button class="button secondary" data-open-rivals>因縁録</button><button class="button primary" data-new-from-ending>もう一度遊ぶ</button></div>';
    U.openModal(html, { labelledBy: "modalHeading" });
  };
})(window.Sengoku);
