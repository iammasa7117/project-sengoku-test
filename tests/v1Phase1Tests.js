(function (S, T) {
  "use strict";
  function fresh() { return S.State.createInitialState({ scenarioId: "owari_short", playerFactionId: "aotsuki", difficultyId: "normal" }); }
  function clearStorage() { localStorage.data = {}; }
  function raw(slot) { return localStorage.getItem(S.Save.normalizeSlot(slot)); }
  function parsed(slot) { return JSON.parse(raw(slot)); }
  function saveWithGold(slot, gold) { var state = fresh(); state.campaign.gold = gold; var result = S.Save.save(state, slot); T.assert(result.ok, result.errors && result.errors.join(" / ")); return state; }

  T.test("v1 Phase 1: セーブはchecksum付きenvelope", function () {
    clearStorage(); var state = saveWithGold("autosave", 111), envelope = parsed("autosave");
    T.equal(envelope.format, "project-sengoku-save"); T.equal(envelope.envelopeVersion, 1); T.equal(envelope.state.campaign.gold, 111);
    T.equal(envelope.checksum, S.Save.checksum(JSON.stringify(envelope.state))); T.assert(Boolean(state.meta.saveSummary));
  });
  T.test("v1 Phase 1: 正常ロードはenvelopeを検証", function () {
    clearStorage(); saveWithGold("autosave", 112); var loaded = S.Save.load("autosave");
    T.assert(loaded.ok); T.equal(loaded.recovered, false); T.equal(loaded.state.campaign.gold, 112);
  });
  T.test("v1 Phase 1: 旧plain JSONセーブ互換", function () {
    clearStorage(); var state = fresh(); state.campaign.gold = 113; localStorage.setItem(S.Save.normalizeSlot("autosave"), JSON.stringify(state));
    var loaded = S.Save.load("autosave"); T.assert(loaded.ok, loaded.errors && loaded.errors.join(" / ")); T.equal(loaded.state.campaign.gold, 113); T.equal(JSON.parse(raw("autosave")).format, "project-sengoku-save");
  });
  T.test("v1 Phase 1: 保存時に3世代をローテーション", function () {
    clearStorage(); saveWithGold("autosave", 101); saveWithGold("autosave", 102); saveWithGold("autosave", 103); saveWithGold("autosave", 104);
    T.equal(parsed("autosave").state.campaign.gold, 104);
    T.equal(JSON.parse(localStorage.getItem(S.Save.backupKey("autosave", 1))).state.campaign.gold, 103);
    T.equal(JSON.parse(localStorage.getItem(S.Save.backupKey("autosave", 2))).state.campaign.gold, 102);
    T.equal(JSON.parse(localStorage.getItem(S.Save.backupKey("autosave", 3))).state.campaign.gold, 101);
  });
  T.test("v1 Phase 1: checksum破損時にbackupから自動復旧", function () {
    clearStorage(); saveWithGold("autosave", 201); saveWithGold("autosave", 202);
    var envelope = parsed("autosave"); envelope.state.campaign.gold = 999; localStorage.setItem(S.Save.normalizeSlot("autosave"), JSON.stringify(envelope));
    var loaded = S.Save.load("autosave"); T.assert(loaded.ok, loaded.errors && loaded.errors.join(" / ")); T.equal(loaded.recovered, true); T.equal(loaded.recoveredFrom.generation, 1); T.equal(loaded.state.campaign.gold, 201); T.equal(parsed("autosave").state.campaign.gold, 201);
  });
  T.test("v1 Phase 1: 不正JSON時にbackupから自動復旧", function () {
    clearStorage(); saveWithGold("manual1", 301); saveWithGold("manual1", 302); localStorage.setItem(S.Save.normalizeSlot("manual1"), "{broken");
    var loaded = S.Save.load("manual1"); T.assert(loaded.ok); T.equal(loaded.recovered, true); T.equal(loaded.state.campaign.gold, 301);
  });
  T.test("v1 Phase 1: 全世代破損時は現在状態を置換しない", function () {
    clearStorage(); S.State.current = fresh(); S.State.current.campaign.gold = 444; localStorage.setItem(S.Save.normalizeSlot("autosave"), "bad");
    localStorage.setItem(S.Save.backupKey("autosave", 1), "bad2"); var loaded = S.Save.load("autosave");
    T.equal(loaded.ok, false); T.equal(loaded.code, "no_valid_save"); T.equal(S.State.current.campaign.gold, 444);
  });
  T.test("v1 Phase 1: existsは有効backupを検出", function () {
    clearStorage(); saveWithGold("autosave", 501); saveWithGold("autosave", 502); localStorage.setItem(S.Save.normalizeSlot("autosave"), "bad");
    T.equal(S.Save.exists("autosave"), true);
  });
  T.test("v1 Phase 1: peekはbackup概要を返す", function () {
    clearStorage(); saveWithGold("manual2", 601); saveWithGold("manual2", 602); localStorage.setItem(S.Save.normalizeSlot("manual2"), "bad");
    var peek = S.Save.peek("manual2"); T.assert(peek.ok); T.equal(peek.recovered, true); T.equal(peek.recoveredFrom.generation, 1);
  });
  T.test("v1 Phase 1: inspectは破損と復旧可能性を報告", function () {
    clearStorage(); saveWithGold("manual3", 701); saveWithGold("manual3", 702); localStorage.setItem(S.Save.normalizeSlot("manual3"), "bad");
    var inspection = S.Save.inspect("manual3"); T.assert(inspection.ok); T.equal(inspection.primary.status, "corrupt"); T.equal(inspection.recoveryAvailable, true); T.equal(inspection.bestBackup.generation, 1);
  });
  T.test("v1 Phase 1: 手動backup復旧", function () {
    clearStorage(); saveWithGold("manual1", 801); saveWithGold("manual1", 802); var restored = S.Save.restoreBackup("manual1", 1);
    T.assert(restored.ok); T.equal(restored.state.campaign.gold, 801); T.equal(parsed("manual1").state.campaign.gold, 801);
  });
  T.test("v1 Phase 1: 不正backup世代を拒否", function () {
    clearStorage(); var result = S.Save.restoreBackup("autosave", 4); T.equal(result.ok, false); T.equal(result.code, "backup_generation_invalid");
  });
  T.test("v1 Phase 1: removeは主データと全backupを削除", function () {
    clearStorage(); saveWithGold("autosave", 901); saveWithGold("autosave", 902); saveWithGold("autosave", 903); var removed = S.Save.remove("autosave");
    T.assert(removed.ok); T.equal(raw("autosave"), null); T.equal(localStorage.getItem(S.Save.backupKey("autosave", 1)), null); T.equal(localStorage.getItem(S.Save.backupKey("autosave", 2)), null);
  });
  T.test("v1 Phase 1: 成功保存後にstagingを残さない", function () {
    clearStorage(); saveWithGold("autosave", 1001); T.equal(localStorage.getItem(S.Save.normalizeSlot("autosave") + "__staging"), null);
  });
  T.test("v1 Phase 1: 破損primaryを新backupへ複製しない", function () {
    clearStorage(); saveWithGold("autosave", 1101); localStorage.setItem(S.Save.normalizeSlot("autosave"), "bad"); saveWithGold("autosave", 1102);
    T.equal(localStorage.getItem(S.Save.backupKey("autosave", 1)), null);
  });
  T.test("v1 Phase 1: 検証失敗状態を保存しない", function () {
    clearStorage(); var state = fresh(); state.campaign.gold = NaN; var before = state.meta.updatedAt, result = S.Save.save(state, "autosave");
    T.equal(result.ok, false); T.equal(result.code, "validation_failed"); T.equal(raw("autosave"), null); T.equal(state.meta.updatedAt, before);
  });
  T.test("v1 Phase 1: storage書込失敗時にlive metaを変更しない", function () {
    clearStorage(); var state = fresh(), before = state.meta.updatedAt, original = localStorage.setItem;
    localStorage.setItem = function (key, value) { if (key.indexOf("__sengoku_storage_test__") >= 0) { this.data[key] = String(value); return; } if (key.indexOf("__staging") >= 0) throw new Error("quota"); this.data[key] = String(value); };
    var result = S.Save.save(state, "autosave"); localStorage.setItem = original;
    T.equal(result.ok, false); T.equal(result.code, "storage_write_failed"); T.equal(state.meta.updatedAt, before);
  });
  T.test("v1 Phase 1: runtime checkpoint復旧", function () {
    clearStorage(); var state = fresh(); state.campaign.gold = 1201; T.assert(S.Save.captureRuntimeCheckpoint(state, "test").ok);
    S.State.current = fresh(); S.State.current.campaign.gold = 9; var restored = S.Save.restoreRuntimeCheckpoint(); T.assert(restored.ok); T.equal(S.State.current.campaign.gold, 1201); T.equal(restored.label, "test");
  });
  T.test("v1 Phase 1: 不正状態はcheckpoint化しない", function () {
    var state = fresh(); state.campaign.gold = NaN; var result = S.Save.captureRuntimeCheckpoint(state, "invalid"); T.equal(result.ok, false); T.equal(result.code, "validation_failed");
  });
  T.test("v1 Phase 1: JSON import成功でautosave envelope作成", function () {
    clearStorage(); var state = fresh(); state.campaign.gold = 1301; var imported = S.Save.importJSON(JSON.stringify(state));
    T.assert(imported.ok, imported.errors && imported.errors.join(" / ")); T.equal(S.State.current.campaign.gold, 1301); T.equal(parsed("autosave").format, "project-sengoku-save");
  });
  T.test("v1 Phase 1: JSON import失敗で現在状態を維持", function () {
    clearStorage(); S.State.current = fresh(); S.State.current.campaign.gold = 1401; var imported = S.Save.importJSON("not-json");
    T.equal(imported.ok, false); T.equal(S.State.current.campaign.gold, 1401);
  });
  T.test("v1 Phase 1: export JSONは従来plain state形式", function () {
    var state = fresh(), exported = S.Save.exportJSON(state), parsedExport = JSON.parse(exported.json);
    T.assert(exported.ok); T.equal(parsedExport.schemaVersion, 12); T.equal(parsedExport.format, undefined);
  });
  T.test("v1 Phase 1: healthはslot状態と容量を集計", function () {
    clearStorage(); saveWithGold("autosave", 1501); saveWithGold("manual1", 1502); var health = S.Save.health();
    T.assert(health.ok); T.assert(health.bytes > 0); T.equal(health.slots.length, 4); T.equal(health.corruptSlots.length, 0);
  });
  T.test("v1 Phase 1: diagnosticsは復旧を記録", function () {
    clearStorage(); saveWithGold("autosave", 1601); saveWithGold("autosave", 1602); localStorage.setItem(S.Save.normalizeSlot("autosave"), "bad"); S.Save.load("autosave");
    T.assert(S.Save.getDiagnostics().some(function (item) { return item.code === "save_recovered"; }));
  });
  T.test("v1 Phase 1: checksumは同一入力で決定的", function () { T.equal(S.Save.checksum("sengoku"), S.Save.checksum("sengoku")); T.assert(S.Save.checksum("sengoku") !== S.Save.checksum("Sengoku")); });

  T.run();
})(window.Sengoku, window.SengokuTest);
