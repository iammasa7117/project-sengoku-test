(function (S, T) {
  "use strict";
  function fresh() { var state = S.State.createInitialState({ scenarioId: "owari_short", playerFactionId: "aotsuki", difficultyId: "normal" }); state.campaign.status = "playing"; state.events.engine.activeEvent = null; state.events.engine.queue = []; S.State.current = state; return state; }
  T.test("v1 Phase 2 DOM: 次の一手を表示", function () {
    fresh(); S.UI.renderGuidePanel(); T.assert(!S.UI.el("guidePanel").classList.contains("hidden")); T.assert(S.UI.el("guidePanel").innerHTML.indexOf("NEXT ACTION") >= 0); T.assert(S.UI.el("guidePanel").innerHTML.indexOf("遊び方") >= 0);
  });
  T.test("v1 Phase 2 DOM: 初心者チェックリストを表示", function () {
    fresh(); S.UI.renderGuidePanel(); T.assert(S.UI.el("guidePanel").innerHTML.indexOf("最初の5つ") >= 0); T.assert(S.UI.el("guidePanel").innerHTML.indexOf("自勢力の城を選ぶ") >= 0);
  });
  T.test("v1 Phase 2 DOM: 閉じた初心者チェックリストを隠す", function () {
    var state = fresh(); state.settings.tutorial.dismissed = true; S.UI.renderGuidePanel(); T.assert(S.UI.el("guidePanel").innerHTML.indexOf("最初の5つ") < 0); T.assert(S.UI.el("guidePanel").innerHTML.indexOf("NEXT ACTION") >= 0);
  });
  T.test("v1 Phase 2 DOM: 遊び方に基本・用語・ショートカット", function () {
    fresh(); S.UI.showHelpCenter(); var html = S.UI.el("modalContent").innerHTML; T.assert(html.indexOf("基本の流れ") >= 0); T.assert(html.indexOf("戦争疲弊") >= 0); T.assert(html.indexOf("キーボード操作") >= 0); T.assert(html.indexOf("data-restart-tutorial") >= 0);
    var title = fresh(); title.campaign.status = "title"; S.UI.showHelpCenter(); T.assert(S.UI.el("modalContent").innerHTML.indexOf("data-restart-tutorial") < 0);
  });
  T.test("v1 Phase 2 DOM: 表示設定を描画", function () {
    var state = fresh(); state.settings.ui.largeText = true; S.UI.showUXSettings(); var html = S.UI.el("modalContent").innerHTML; T.assert(html.indexOf('data-ui-setting="largeText" checked') >= 0); T.assert(html.indexOf("高コントラスト") >= 0);
  });
  T.test("v1 Phase 2 DOM: 文字拡大class", function () {
    var state = fresh(); state.settings.ui.largeText = true; S.UI.applyPreferences(state); T.assert(document.body.classList.contains("large-text"));
  });
  T.test("v1 Phase 2 DOM: 高コントラストclass", function () {
    var state = fresh(); state.settings.ui.highContrast = true; S.UI.applyPreferences(state); T.assert(document.body.classList.contains("high-contrast"));
  });
  T.test("v1 Phase 2 DOM: reduced motion class", function () {
    var state = fresh(); state.settings.ui.reducedMotion = true; S.UI.applyPreferences(state); T.assert(document.body.classList.contains("reduced-motion"));
  });
  T.test("v1 Phase 2 DOM: section navigation scroll", function () {
    fresh(); var target = S.UI.el("mapPanel"); target.scrolled = false; T.assert(S.UI.scrollToSection("map")); T.equal(target.scrolled, true);
  });
  T.test("v1 Phase 2 DOM: 自城案内actionで城を選択", function () {
    var state = fresh(); state.campaign.selectedCastleId = "narumi"; T.assert(S.UI.handleGuideAction("friendly-castle")); T.equal(state.castles[state.campaign.selectedCastleId].factionId, state.campaign.playerFactionId);
  });
  T.test("v1 Phase 2 DOM: modalが見出しを関連付け", function () {
    fresh(); S.UI.openModal("<h2>確認</h2><button>OK</button>"); T.equal(S.UI.el("modalDialog").attributes["aria-labelledby"], "modalHeading"); T.assert(!S.UI.el("modalBackdrop").classList.contains("hidden"));
  });
  T.test("v1 Phase 2 DOM: modal closeで元focusへ戻す", function () {
    fresh(); var origin = S.UI.el("originButton"); document.activeElement = origin; S.UI.openModal("<h2>確認</h2><button>OK</button>"); origin.focused = false; S.UI.closeModal(true); T.equal(origin.focused, true);
  });
  T.test("v1 Phase 2 DOM: focus trapで末尾から先頭へ", function () {
    fresh(); var first = S.UI.el("firstFocus"), last = S.UI.el("lastFocus"), content = S.UI.el("modalContent"); S.UI.openModal("<h2>確認</h2>"); content.querySelectorAll = function () { return [first, last]; }; document.activeElement = last; var prevented = false, result = S.UI.handleModalKeydown({ key: "Tab", shiftKey: false, preventDefault: function () { prevented = true; } }); T.assert(result); T.assert(prevented); T.equal(first.focused, true);
  });
  T.test("v1 Phase 2 DOM: ガイド完了後はchecklist非表示", function () {
    var state = fresh(); Object.keys(state.settings.tutorial.milestones).forEach(function (key) { state.settings.tutorial.milestones[key] = true; }); state.settings.tutorial.completed = true; S.UI.renderGuidePanel(); T.assert(S.UI.el("guidePanel").innerHTML.indexOf("最初の5つ") < 0);
  });
  T.test("v1 Phase 2 DOM: 設定とガイド文字をHTML escape", function () {
    var state = fresh(); state.castles[state.campaign.selectedCastleId].name = "<script>x</script>"; S.UI.renderGuidePanel(); T.assert(S.UI.el("guidePanel").innerHTML.indexOf("<script>") < 0); T.assert(S.UI.el("guidePanel").innerHTML.indexOf("&lt;script&gt;") >= 0);
  });
  T.test("v1.0.1 DOM: modal open中はbodyへmodal-open class", function () {
    fresh(); document.body.classList.remove("modal-open"); S.UI.openModal("<h2>確認</h2><button>OK</button>"); T.assert(document.body.classList.contains("modal-open"));
  });
  T.test("v1.0.1 DOM: modal closeでmodal-open class解除", function () {
    fresh(); S.UI.openModal("<h2>確認</h2><button>OK</button>"); S.UI.closeModal(true); T.assert(!document.body.classList.contains("modal-open"));
  });
  T.run();
})(window.Sengoku, window.SengokuTest);
