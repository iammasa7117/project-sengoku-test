(function (S) {
  "use strict";
  var U = S.UI;
  var MILESTONE_LABELS = {
    gameStarted: "戦役画面を確認する",
    castleSelected: "自勢力の城を選ぶ",
    commandUsed: "家臣に命令を出す",
    seasonAdvanced: "季節を一度進める",
    menuOpened: "メニューを開く"
  };
  function ensure(state) { return S.Systems.UX.ensureSettings(state); }
  function friendlyCastle(state) {
    var selected = state.castles[state.campaign.selectedCastleId];
    if (selected && selected.factionId === state.campaign.playerFactionId) return selected;
    return S.Systems.Turn.playerCastles(state)[0] || null;
  }
  function availableAttack(state, castle) {
    if (!castle || state.campaign.status === "opening") return false;
    if (castle.troops < S.Config.MIN_GARRISON + S.Config.MIN_ATTACK_FORCE) return false;
    return S.Systems.Battle.availableTargets(state, castle.id, state.campaign.playerFactionId, {}).length > 0;
  }
  U.ensureUXSettings = ensure;
  U.applyPreferences = function (state) {
    var settings = ensure(state || S.State.current), body = document.body;
    if (!settings || !body || !body.classList) return;
    body.classList.toggle("large-text", settings.ui.largeText);
    body.classList.toggle("high-contrast", settings.ui.highContrast);
    body.classList.toggle("reduced-motion", settings.ui.reducedMotion);
  };
  U.markGuideMilestone = function (key) {
    var result = S.Systems.UX.markMilestone(S.State.current, key);
    return Boolean(result.ok && result.completed);
  };
  U.restartTutorial = function () {
    var result = S.Systems.UX.restartTutorial(S.State.current);
    if (result.ok && U.el) U.renderGuidePanel();
    return result;
  };
  U.dismissTutorial = function () {
    var result = S.Systems.UX.dismissTutorial(S.State.current);
    if (result.ok && U.el) U.renderGuidePanel();
    return result;
  };
  U.setTutorialEnabled = function (enabled) {
    var result = S.Systems.UX.setTutorialEnabled(S.State.current, enabled);
    if (result.ok && U.el) U.renderGuidePanel();
    return result;
  };
  U.setPreference = function (key, enabled) {
    var result = S.Systems.UX.setPreference(S.State.current, key, enabled);
    if (result.ok) U.applyPreferences(S.State.current);
    return result;
  };
  U.getGuideRecommendation = function (state) {
    state = state || S.State.current;
    if (!state || !state.campaign) return { id: "none", title: "戦役を開始してください", detail: "新しい戦を始めると、次の行動を案内します。", action: "new-game", label: "新規ゲーム" };
    if (state.campaign.gameOver) return { id: "ending", title: "戦役は決着しました", detail: "戦国記や合戦記録を確認できます。", action: "menu", label: "記録を見る" };
    if (S.Systems.Event && S.Systems.Event.hasBlockingEvent(state)) return { id: "event", title: "重要な出来事を決める", detail: "選択待ちの出来事があります。先に判断を下してください。", action: "event", label: "出来事を開く" };
    if (S.Systems.Event && S.Systems.Event.getPendingInteraction(state)) return { id: "interaction", title: "イベント操作を続ける", detail: "軍議から始めた操作が途中です。", action: "interaction", label: "操作を再開" };
    var pending = state.diplomacy && state.diplomacy.proposals && state.diplomacy.proposals.some(function (item) { return item.status === "pending" && item.targetFactionId === state.campaign.playerFactionId; });
    if (pending) return { id: "proposal", title: "外交提案へ返答する", detail: "他勢力から未回答の提案が届いています。", action: "proposals", label: "提案を見る" };
    if (state.campaign.status === "opening") return { id: "opening", title: "初陣軍議を進める", detail: "軍議の三案から方針を選び、最初の戦へ進みます。", action: "event", label: "初陣軍議を開く" };
    if (state.campaign.commands <= 0) return { id: "season", title: "季節を進める", detail: "今季の命令を使い切りました。収入・AI行動・外交が処理されます。", action: "end-turn", label: "季節ボタンへ" };
    var castle = friendlyCastle(state);
    if (!castle) return { id: "lost", title: "領地を確認する", detail: "現在の支配城を確認してください。", action: "map", label: "地図を見る" };
    if (state.campaign.selectedCastleId !== castle.id) return { id: "select", title: "自勢力の城を選ぶ", detail: "命令は自勢力の城から実行します。", action: "friendly-castle", label: castle.name + "を選ぶ" };
    if (castle.troops < 90 && state.campaign.gold >= S.Config.Balance.recruit.gold && state.campaign.food >= S.Config.Balance.recruit.food) return { id: "recruit", title: castle.name + "で徴兵する", detail: "守備兵が少なめです。統率の高い家臣を担当にすると効果が上がります。", action: "recruit", label: "徴兵を開く" };
    if (availableAttack(state, castle)) return { id: "attack", title: "戦線を前へ進める", detail: "侵攻可能な隣接敵城があります。偵察後に攻めると兵力を確認できます。", action: "attack", label: "出陣軍議" };
    if (state.campaign.gold >= S.Config.Balance.develop.gold) return { id: "develop", title: castle.name + "の内政を整える", detail: "政治の高い家臣を選ぶと収入の伸びが大きくなります。", action: "develop", label: "内政を開く" };
    return { id: "rest", title: "家臣を休ませる", detail: "資源を使わず、疲労と体力を回復できます。", action: "rest", label: "休養を開く" };
  };
  U.guideChecklist = function (state) {
    var settings = ensure(state || S.State.current);
    return Object.keys(MILESTONE_LABELS).map(function (key) { return { id: key, label: MILESTONE_LABELS[key], done: settings.tutorial.milestones[key] }; });
  };
  U.renderGuidePanel = function () {
    var root = U.el("guidePanel"), state = S.State.current;
    if (!root || !state || !state.campaign || state.campaign.status === "title") { if (root) root.classList.add("hidden"); return; }
    var settings = ensure(state), recommendation = U.getGuideRecommendation(state), checklist = U.guideChecklist(state), showTutorial = settings.tutorial.enabled && !settings.tutorial.completed && !settings.tutorial.dismissed;
    root.classList.remove("hidden");
    root.innerHTML = "<div class=\"guide-primary\"><div><p class=\"kicker\">NEXT ACTION</p><strong>" + U.escape(recommendation.title) + "</strong><p>" + U.escape(recommendation.detail) + "</p></div><div class=\"guide-actions\"><button class=\"button primary\" data-guide-action=\"" + U.escape(recommendation.action) + "\">" + U.escape(recommendation.label) + "</button><button class=\"button secondary\" data-open-help>遊び方</button></div></div>" +
      (showTutorial ? "<div class=\"tutorial-checklist\"><div><p class=\"kicker\">FIRST CAMPAIGN GUIDE</p><strong>最初の5つ</strong></div><ol>" + checklist.map(function (item) { return "<li class=\"" + (item.done ? "done" : "") + "\"><span aria-hidden=\"true\">" + (item.done ? "✓" : "○") + "</span>" + U.escape(item.label) + "</li>"; }).join("") + "</ol><button class=\"text-button\" data-dismiss-tutorial>ガイドを閉じる</button></div>" : "");
  };
  U.showHelpCenter = function () {
    var state = S.State.current, canRestart = state && state.campaign && state.campaign.status !== "title";
    var restart = canRestart ? "<button class=\"button secondary\" data-restart-tutorial>初心者ガイドを再開</button>" : "";
    U.openModal("<p class=\"kicker\">HOW TO PLAY</p><h2 id=\"modalHeading\">遊び方・用語集</h2><div class=\"help-grid\"><section><h3>基本の流れ</h3><ol><li>地図で自勢力の城を選ぶ</li><li>内政・徴兵・訓練などで国力を整える</li><li>戦争中の隣接勢力へ侵攻する</li><li>命令を使ったら季節を進める</li><li>全城支配または覇権を目指す</li></ol></section><section><h3>重要な考え方</h3><p><strong>命令</strong>は今季に実行できる行動数です。<strong>金</strong>と<strong>兵糧</strong>は内政・軍事・外交で消費します。<strong>忠誠</strong>が低い家臣は離反の危険が高まります。</p></section></div><details open><summary>用語集</summary><dl class=\"glossary\"><dt>士気</dt><dd>城兵の戦意。訓練で上昇し、合戦結果に影響します。</dd><dt>防備</dt><dd>城の守り。攻城側に不利な補正を与えます。</dd><dt>戦争疲弊</dt><dd>長期戦や敗北で増え、徴兵や士気、外交判断へ影響します。</dd><dt>不戦・停戦・同盟</dt><dd>有効期間中は通常の侵攻ができません。侵攻には宣戦が必要です。</dd><dt>従属</dt><dd>弱い勢力が宗主の下に入る外交状態です。覇権勝利にも関係します。</dd></dl></details><details><summary>キーボード操作</summary><p><kbd>M</kbd> メニュー　<kbd>?</kbd> 遊び方　<kbd>G</kbd> 次の一手へ移動　<kbd>Esc</kbd> 閉じる　<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd> デバッグ</p></details><div class=\"modal-actions\">" + restart + "<button class=\"button primary\" data-close-modal>閉じる</button></div>", { labelledBy: "modalHeading" });
  };
  U.showUXSettings = function () {
    var settings = ensure(S.State.current);
    function checked(value) { return value ? " checked" : ""; }
    U.openModal("<p class=\"kicker\">ACCESSIBILITY & GUIDE</p><h2 id=\"modalHeading\">操作・表示設定</h2><div class=\"settings-list\"><label class=\"toggle-row\"><span><strong>初心者ガイド</strong><small>次の行動と最初の5つを表示します。</small></span><input type=\"checkbox\" data-tutorial-toggle" + checked(settings.tutorial.enabled) + "></label><label class=\"toggle-row\"><span><strong>文字を大きくする</strong><small>本文と操作ボタンを拡大します。</small></span><input type=\"checkbox\" data-ui-setting=\"largeText\"" + checked(settings.ui.largeText) + "></label><label class=\"toggle-row\"><span><strong>高コントラスト</strong><small>枠線と文字の差を強めます。</small></span><input type=\"checkbox\" data-ui-setting=\"highContrast\"" + checked(settings.ui.highContrast) + "></label><label class=\"toggle-row\"><span><strong>動きを減らす</strong><small>画面のアニメーションを停止します。</small></span><input type=\"checkbox\" data-ui-setting=\"reducedMotion\"" + checked(settings.ui.reducedMotion) + "></label></div><div class=\"modal-actions\"><button class=\"button secondary\" data-open-help>遊び方</button><button class=\"button primary\" data-close-modal>閉じる</button></div>", { labelledBy: "modalHeading" });
  };
  U.scrollToSection = function (section) {
    var ids = { map: "mapPanel", side: "sidePanel", council: "councilPanel", guide: "guidePanel" }, target = U.el(ids[section] || section);
    if (U.isMobileCampaignLayout && U.isMobileCampaignLayout() && ["map", "side", "council"].indexOf(section) >= 0) return U.setMobileCampaignView(section, { focus: false });
    if (target && target.scrollIntoView) target.scrollIntoView({ behavior: ensure(S.State.current).ui.reducedMotion ? "auto" : "smooth", block: "start" });
    var nav = U.el("mobileNav");
    if (nav && nav.querySelectorAll) Array.prototype.forEach.call(nav.querySelectorAll("button"), function (button) { button.setAttribute("aria-current", button.dataset.mobileNav === section ? "page" : "false"); });
    return Boolean(target);
  };
  U.handleGuideAction = function (action) {
    var state = S.State.current, castle;
    if (action === "new-game") { U.showNewGameSetup(); return true; }
    if (action === "event") return Boolean(U.showActiveEvent && U.showActiveEvent());
    if (action === "interaction") return Boolean(U.openEventInteraction && U.openEventInteraction());
    if (action === "proposals") { U.showPendingProposals(); return true; }
    if (action === "menu") { U.showMenu(); return true; }
    if (action === "map") return U.scrollToSection("map");
    if (action === "end-turn") { U.scrollToSection("side"); var end = U.el("nextSeasonButton"); if (end && end.focus) end.focus(); return true; }
    if (action === "friendly-castle") { castle = friendlyCastle(state); if (!castle) return false; var selected = S.Systems.Campaign.selectCastle(state, castle.id); if (selected.ok) U.markGuideMilestone("castleSelected"); U.commit(selected, { autosave: false }); U.scrollToSection("side"); return true; }
    castle = friendlyCastle(state);
    if (castle && state.campaign.selectedCastleId !== castle.id) U.commit(S.Systems.Campaign.selectCastle(state, castle.id), { autosave: false });
    if (action === "attack") { U.showBattlePlanner(castle.id, false); return true; }
    if (["develop", "recruit", "train", "rest", "scout"].indexOf(action) >= 0) { U.showOfficerChoice(action); return true; }
    return false;
  };
})(window.Sengoku);
