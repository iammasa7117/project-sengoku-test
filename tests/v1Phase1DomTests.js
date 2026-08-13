(function (S, T) {
  "use strict";
  var U = S.UI;
  function fresh() { return S.State.createInitialState({ scenarioId: "owari_short", playerFactionId: "aotsuki", difficultyId: "normal" }); }
  function clearStorage() { localStorage.data = {}; }
  function saveGold(value) { var state = fresh(); state.campaign.gold = value; var result = S.Save.save(state, "autosave"); T.assert(result.ok, result.errors && result.errors.join(" / ")); return state; }

  T.test("v1 Phase 1 DOM: 空のセーブ管理画面", function () {
    clearStorage(); U.showSaveMenu(); var html = U.el("modalContent").innerHTML;
    T.assert(html.indexOf("3世代バックアップ") >= 0); T.assert(html.indexOf("手動セーブ 1") >= 0); T.assert(html.indexOf("空きスロット") >= 0);
  });
  T.test("v1 Phase 1 DOM: 正常オートセーブ表示", function () {
    clearStorage(); saveGold(111); U.showSaveMenu(); var html = U.el("modalContent").innerHTML;
    T.assert(html.indexOf("オートセーブ — 正常") >= 0); T.assert(html.indexOf('data-load-slot="autosave"') >= 0);
  });
  T.test("v1 Phase 1 DOM: 破損時に復旧ボタン表示", function () {
    clearStorage(); saveGold(121); saveGold(122); localStorage.setItem(S.Save.normalizeSlot("autosave"), "bad"); U.showSaveMenu(); var html = U.el("modalContent").innerHTML;
    T.assert(html.indexOf("オートセーブ — 破損検出") >= 0); T.assert(html.indexOf('data-restore-save-slot="autosave"') >= 0); T.assert(html.indexOf('data-restore-generation="1"') >= 0);
  });
  T.test("v1 Phase 1 DOM: backupだけでも続きから有効", function () {
    clearStorage(); saveGold(131); saveGold(132); localStorage.setItem(S.Save.normalizeSlot("autosave"), "bad"); U.showTitle();
    T.equal(U.el("continueButton").disabled, false);
  });
  T.test("v1 Phase 1 DOM: autosave検証失敗でruntime復旧", function () {
    clearStorage(); var checkpoint = fresh(); checkpoint.campaign.gold = 141; S.State.current = checkpoint; T.assert(S.Save.captureRuntimeCheckpoint(checkpoint, "dom-test").ok);
    S.State.current = S.Util.deepClone(checkpoint); S.State.current.campaign.gold = NaN; var committed = U.commit({ ok: true, errors: [] }, { render: false });
    T.equal(committed, true); T.equal(S.State.current.campaign.gold, 141); T.assert(U.el("toast").textContent.indexOf("復旧") >= 0);
  });

  T.run();
})(window.Sengoku, window.SengokuTest);
