(function (S) {
  "use strict";
  var ENVELOPE_FORMAT = "project-sengoku-save";
  var ENVELOPE_VERSION = 1;
  var BACKUP_GENERATIONS = 3;
  var runtimeCheckpoint = null;
  var runtimeCheckpointLabel = null;
  var diagnostics = [];

  function recordDiagnostic(code, message, details) {
    diagnostics.push({ at: new Date().toISOString(), code: code, message: message, details: details || null });
    if (diagnostics.length > 50) diagnostics.shift();
  }
  function resultError(code, errors, extra) {
    return Object.assign({ ok: false, code: code, errors: Array.isArray(errors) ? errors : [errors] }, extra || {});
  }
  function storage() {
    try {
      var testKey = "__sengoku_storage_test__";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    } catch (error) {
      S.Util.logError(error, "localStorage access");
      recordDiagnostic("storage_unavailable", "ブラウザの保存領域を利用できません", error.message);
      return null;
    }
  }
  function normalizeSlot(slot) {
    if (!slot || slot === "autosave") return S.Config.SAVE_KEYS.autosave;
    return S.Config.SAVE_KEYS[slot] || slot;
  }
  function backupKey(target, generation) { return target + "__backup_" + generation; }
  function stagingKey(target) { return target + "__staging"; }
  function isManualSlot(slot) { return /^manual[123]$/.test(slot || ""); }
  function checksum(text) {
    var hash = 2166136261;
    for (var i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return ("00000000" + (hash >>> 0).toString(16)).slice(-8);
  }
  function summaryFor(state, savedAt) {
    var scenario = S.Data.getScenario(state.campaign.scenarioId);
    var difficulty = S.Data.getDifficulty(state.campaign.difficultyId);
    var faction = state.factions[state.campaign.playerFactionId];
    if (!scenario || !difficulty || !faction) throw new Error("セーブ概要の参照が不正です");
    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      factionId: faction.id,
      factionName: faction.name,
      difficultyId: difficulty.id,
      difficultyName: difficulty.name,
      year: state.campaign.year,
      season: state.campaign.season,
      castleCount: Object.keys(state.castles).filter(function (id) { return state.castles[id].factionId === faction.id; }).length,
      savedAt: savedAt
    };
  }
  function prepareState(state) {
    var validation = S.State.validateState(state);
    if (!validation.ok) return resultError("validation_failed", validation.errors);
    try {
      var clone = S.Util.deepClone(state), savedAt = new Date().toISOString();
      clone.meta = clone.meta || {};
      clone.meta.updatedAt = savedAt;
      clone.meta.saveSummary = summaryFor(clone, savedAt);
      var finalValidation = S.State.validateState(clone);
      if (!finalValidation.ok) return resultError("validation_failed", finalValidation.errors);
      return { ok: true, state: clone, savedAt: savedAt, errors: [] };
    } catch (error) {
      S.Util.logError(error, "prepare save");
      return resultError("prepare_failed", "保存データを準備できません: " + error.message);
    }
  }
  function encodeState(state, target) {
    var payload = JSON.stringify(state);
    return JSON.stringify({
      format: ENVELOPE_FORMAT,
      envelopeVersion: ENVELOPE_VERSION,
      slot: target,
      savedAt: state.meta && state.meta.updatedAt || new Date().toISOString(),
      checksumAlgorithm: "fnv1a32",
      checksum: checksum(payload),
      state: state
    });
  }
  function decodeRaw(raw) {
    if (typeof raw !== "string" || !raw) return resultError("empty_save", "セーブデータが空です");
    try {
      var parsed = JSON.parse(raw);
      if (parsed && parsed.format === ENVELOPE_FORMAT) {
        if (parsed.envelopeVersion !== ENVELOPE_VERSION || !parsed.state || typeof parsed.state !== "object") return resultError("envelope_invalid", "セーブ形式が不正です");
        var actual = checksum(JSON.stringify(parsed.state));
        if (actual !== parsed.checksum) return resultError("checksum_mismatch", "セーブデータの整合性チェックに失敗しました", { expectedChecksum: parsed.checksum, actualChecksum: actual });
        return { ok: true, state: parsed.state, envelope: true, savedAt: parsed.savedAt || null, errors: [] };
      }
      return { ok: true, state: parsed, envelope: false, savedAt: parsed && parsed.meta && parsed.meta.updatedAt || null, errors: [] };
    } catch (error) {
      return resultError("json_invalid", "セーブデータのJSONが不正です: " + error.message);
    }
  }
  function migrateDecoded(decoded) {
    if (!decoded.ok) return decoded;
    var migrated = S.State.migrateState(decoded.state);
    if (!migrated.ok) return resultError("migration_failed", migrated.errors);
    return { ok: true, state: migrated.state, source: migrated.source, envelope: decoded.envelope, savedAt: decoded.savedAt, errors: [] };
  }
  function inspectRaw(raw) { return migrateDecoded(decodeRaw(raw)); }
  function verifyWrite(store, key, raw) {
    try {
      store.setItem(key, raw);
      var readBack = store.getItem(key);
      if (readBack !== raw) return resultError("verification_failed", "保存後の読戻しが一致しません");
      var decoded = decodeRaw(readBack);
      if (!decoded.ok) return resultError("verification_failed", decoded.errors);
      return { ok: true, errors: [] };
    } catch (error) {
      S.Util.logError(error, "write save " + key);
      return resultError("storage_write_failed", "保存領域への書込みに失敗しました: " + error.message);
    }
  }
  function copyMetaToLive(source, target) {
    if (!source || !target || !source.meta || !target.meta) return;
    target.meta.updatedAt = source.meta.updatedAt;
    target.meta.saveSummary = S.Util.deepClone(source.meta.saveSummary);
  }
  function rotateBackups(store, target) {
    try {
      for (var generation = BACKUP_GENERATIONS; generation >= 2; generation -= 1) {
        var previous = store.getItem(backupKey(target, generation - 1));
        if (previous) store.setItem(backupKey(target, generation), previous);
        else store.removeItem(backupKey(target, generation));
      }
      var current = store.getItem(target);
      if (current) {
        var inspected = inspectRaw(current);
        if (inspected.ok) store.setItem(backupKey(target, 1), current);
        else recordDiagnostic("corrupt_primary_not_rotated", "破損した主セーブをバックアップへ複製しませんでした", { key: target, code: inspected.code });
      }
      return { ok: true, errors: [] };
    } catch (error) {
      S.Util.logError(error, "rotate backups");
      return resultError("backup_rotation_failed", "バックアップ作成に失敗しました: " + error.message);
    }
  }
  function candidateKeys(slot, target) {
    var keys = [{ key: target, kind: "primary", generation: 0 }];
    for (var generation = 1; generation <= BACKUP_GENERATIONS; generation += 1) keys.push({ key: backupKey(target, generation), kind: "backup", generation: generation });
    if (!slot || slot === "autosave") {
      S.Config.LEGACY_SAVE_KEYS.forEach(function (key) { keys.push({ key: key, kind: "legacy", generation: null }); });
    } else if (isManualSlot(slot)) {
      var suffix = slot.slice(-1);
      ["project_sengoku_core_v09_manual_", "project_sengoku_core_v08_manual_", "project_sengoku_core_manual_"].forEach(function (prefix) { keys.push({ key: prefix + suffix, kind: "legacy", generation: null }); });
    }
    return keys;
  }
  function findValidCandidate(store, slot, target) {
    var attempts = [], keys = candidateKeys(slot, target);
    for (var i = 0; i < keys.length; i += 1) {
      var candidate = keys[i], raw = store.getItem(candidate.key);
      if (!raw) continue;
      var inspected = inspectRaw(raw);
      if (inspected.ok) return { ok: true, candidate: candidate, raw: raw, inspected: inspected, attempts: attempts, errors: [] };
      attempts.push({ key: candidate.key, kind: candidate.kind, generation: candidate.generation, code: inspected.code || "invalid", errors: inspected.errors || [] });
    }
    return resultError("no_valid_save", attempts.length ? "有効なセーブデータが見つかりません" : "セーブデータがありません", { attempts: attempts });
  }
  function writeRecoveredPrimary(store, target, state) {
    var prepared = prepareState(state);
    if (!prepared.ok) return prepared;
    var raw = encodeState(prepared.state, target), staged = verifyWrite(store, stagingKey(target), raw);
    if (!staged.ok) return staged;
    try {
      var committed = verifyWrite(store, target, raw);
      store.removeItem(stagingKey(target));
      return committed.ok ? { ok: true, state: prepared.state, errors: [] } : committed;
    } catch (error) {
      try { store.removeItem(stagingKey(target)); } catch (ignored) {}
      return resultError("recovery_write_failed", "復旧セーブを書き戻せません: " + error.message);
    }
  }

  S.Save.checksum = checksum;
  S.Save.normalizeSlot = normalizeSlot;
  S.Save.backupKey = function (slot, generation) { return backupKey(normalizeSlot(slot), generation); };
  S.Save.getDiagnostics = function () { return diagnostics.slice(); };
  S.Save.captureRuntimeCheckpoint = function (state, label) {
    var validation = S.State.validateState(state);
    if (!validation.ok) return resultError("validation_failed", validation.errors);
    runtimeCheckpoint = S.Util.deepClone(state);
    runtimeCheckpointLabel = label || "checkpoint";
    return { ok: true, label: runtimeCheckpointLabel, errors: [] };
  };
  S.Save.hasRuntimeCheckpoint = function () { return Boolean(runtimeCheckpoint); };
  S.Save.restoreRuntimeCheckpoint = function () {
    if (!runtimeCheckpoint) return resultError("checkpoint_missing", "復旧できる直前状態がありません");
    var validation = S.State.validateState(runtimeCheckpoint);
    if (!validation.ok) return resultError("checkpoint_invalid", validation.errors);
    S.State.current = S.Util.deepClone(runtimeCheckpoint);
    recordDiagnostic("runtime_recovered", "直前の正常状態へ復旧しました", { label: runtimeCheckpointLabel });
    return { ok: true, state: S.State.current, label: runtimeCheckpointLabel, errors: [] };
  };
  S.Save.save = function (state, slot) {
    var target = normalizeSlot(slot), store = storage(), prepared = prepareState(state);
    if (!prepared.ok) {
      recordDiagnostic(prepared.code, prepared.errors.join(" / "), { slot: target });
      return prepared;
    }
    if (!store) return resultError("storage_unavailable", "ブラウザの保存領域を利用できません");
    var raw = encodeState(prepared.state, target), stageKey = stagingKey(target);
    var staged = verifyWrite(store, stageKey, raw);
    if (!staged.ok) return staged;
    var rotated = rotateBackups(store, target);
    if (!rotated.ok) { try { store.removeItem(stageKey); } catch (ignored) {} return rotated; }
    var committed = verifyWrite(store, target, raw);
    try { store.removeItem(stageKey); } catch (cleanupError) { recordDiagnostic("staging_cleanup_failed", "一時保存データを削除できません", cleanupError.message); }
    if (!committed.ok) return committed;
    copyMetaToLive(prepared.state, state);
    S.Save.captureRuntimeCheckpoint(state, "save:" + target);
    return { ok: true, key: target, checksum: checksum(JSON.stringify(prepared.state)), errors: [] };
  };
  S.Save.autosave = function (state) { return S.Save.save(state, "autosave"); };
  S.Save.load = function (slot) {
    var store = storage(), target = normalizeSlot(slot);
    if (!store) return resultError("storage_unavailable", "ブラウザの保存領域を利用できません");
    var found = findValidCandidate(store, slot, target);
    if (!found.ok) {
      recordDiagnostic(found.code, found.errors.join(" / "), { slot: target, attempts: found.attempts || [] });
      return found;
    }
    var state = found.inspected.state, recovered = found.candidate.kind !== "primary";
    if (recovered || !found.inspected.envelope) {
      var rewrite = writeRecoveredPrimary(store, target, state);
      if (!rewrite.ok) return rewrite;
      state = rewrite.state;
    }
    S.State.current = state;
    S.Save.captureRuntimeCheckpoint(state, recovered ? "recovered:" + found.candidate.key : "load:" + target);
    if (recovered) recordDiagnostic("save_recovered", "バックアップからセーブを復旧しました", { slot: target, sourceKey: found.candidate.key, generation: found.candidate.generation });
    return {
      ok: true,
      state: state,
      source: found.inspected.source,
      recovered: recovered,
      recoveredFrom: recovered ? { key: found.candidate.key, kind: found.candidate.kind, generation: found.candidate.generation } : null,
      warnings: found.attempts.length ? found.attempts.map(function (attempt) { return attempt.key + ": " + attempt.code; }) : [],
      errors: []
    };
  };
  S.Save.inspect = function (slot) {
    var store = storage(), target = normalizeSlot(slot);
    if (!store) return resultError("storage_unavailable", "ブラウザの保存領域を利用できません");
    function inspectKey(key, kind, generation) {
      var raw = store.getItem(key);
      if (!raw) return { key: key, kind: kind, generation: generation, status: "missing", ok: false };
      var checked = inspectRaw(raw);
      return checked.ok ? { key: key, kind: kind, generation: generation, status: "valid", ok: true, summary: checked.state.meta && checked.state.meta.saveSummary || summaryFor(checked.state, checked.state.meta && checked.state.meta.updatedAt), source: checked.source, envelope: checked.envelope, bytes: raw.length * 2 } : { key: key, kind: kind, generation: generation, status: "corrupt", ok: false, code: checked.code, errors: checked.errors, bytes: raw.length * 2 };
    }
    var primary = inspectKey(target, "primary", 0), backups = [];
    for (var generation = 1; generation <= BACKUP_GENERATIONS; generation += 1) backups.push(inspectKey(backupKey(target, generation), "backup", generation));
    var bestBackup = backups.find(function (item) { return item.ok; }) || null;
    return { ok: true, slot: slot || "autosave", key: target, primary: primary, backups: backups, bestBackup: bestBackup, recoveryAvailable: !primary.ok && Boolean(bestBackup), errors: [] };
  };
  S.Save.health = function () {
    var store = storage();
    if (!store) return resultError("storage_unavailable", "ブラウザの保存領域を利用できません");
    var slots = ["autosave", "manual1", "manual2", "manual3"].map(function (slot) { return S.Save.inspect(slot); });
    var bytes = slots.reduce(function (total, item) {
      if (!item.ok) return total;
      return total + (item.primary.bytes || 0) + item.backups.reduce(function (sum, backup) { return sum + (backup.bytes || 0); }, 0);
    }, 0);
    return { ok: true, available: true, bytes: bytes, slots: slots, corruptSlots: slots.filter(function (item) { return item.ok && item.primary.status === "corrupt"; }).map(function (item) { return item.slot; }), recoverableSlots: slots.filter(function (item) { return item.ok && item.recoveryAvailable; }).map(function (item) { return item.slot; }), errors: [] };
  };
  S.Save.exists = function (slot) {
    var store = storage(), target = normalizeSlot(slot);
    if (!store) return false;
    return findValidCandidate(store, slot, target).ok;
  };
  S.Save.remove = function (slot) {
    var store = storage(), target = normalizeSlot(slot);
    if (!store) return resultError("storage_unavailable", "ブラウザの保存領域を利用できません");
    try {
      store.removeItem(target); store.removeItem(stagingKey(target));
      for (var generation = 1; generation <= BACKUP_GENERATIONS; generation += 1) store.removeItem(backupKey(target, generation));
      return { ok: true, errors: [] };
    } catch (error) {
      S.Util.logError(error, "remove save");
      return resultError("remove_failed", "削除に失敗しました: " + error.message);
    }
  };
  S.Save.peek = function (slot) {
    var store = storage(), target = normalizeSlot(slot);
    if (!store) return resultError("storage_unavailable", "ブラウザの保存領域を利用できません");
    var found = findValidCandidate(store, slot, target);
    if (!found.ok) return found;
    var state = found.inspected.state, scenario = S.Data.getScenario(state.campaign.scenarioId), difficulty = S.Data.getDifficulty(state.campaign.difficultyId), faction = state.factions[state.campaign.playerFactionId];
    return { ok: true, summary: state.meta.saveSummary || { scenarioName: scenario.name, factionName: faction.name, difficultyName: difficulty.name, year: state.campaign.year, season: state.campaign.season, castleCount: Object.keys(state.castles).filter(function (id) { return state.castles[id].factionId === faction.id; }).length, savedAt: state.meta.updatedAt }, recovered: found.candidate.kind !== "primary", recoveredFrom: found.candidate, errors: [] };
  };
  S.Save.restoreBackup = function (slot, generation) {
    var store = storage(), target = normalizeSlot(slot), number = Number(generation);
    if (!store) return resultError("storage_unavailable", "ブラウザの保存領域を利用できません");
    if (!Number.isInteger(number) || number < 1 || number > BACKUP_GENERATIONS) return resultError("backup_generation_invalid", "バックアップ世代が不正です");
    var raw = store.getItem(backupKey(target, number));
    if (!raw) return resultError("backup_missing", "指定したバックアップがありません");
    var inspected = inspectRaw(raw);
    if (!inspected.ok) return inspected;
    var written = writeRecoveredPrimary(store, target, inspected.state);
    if (!written.ok) return written;
    S.State.current = written.state;
    S.Save.captureRuntimeCheckpoint(written.state, "manual-recovery:" + target + ":" + number);
    recordDiagnostic("manual_backup_restored", "バックアップを手動復旧しました", { slot: target, generation: number });
    return { ok: true, state: written.state, generation: number, errors: [] };
  };
  S.Save.exportJSON = function (state) {
    var validation = S.State.validateState(state);
    if (!validation.ok) return resultError("validation_failed", validation.errors);
    return { ok: true, json: JSON.stringify(state, null, 2), errors: [] };
  };
  S.Save.downloadJSON = function (state) {
    var result = S.Save.exportJSON(state);
    if (!result.ok) return result;
    try {
      var blob = new Blob([result.json], { type: "application/json;charset=utf-8" });
      var url = URL.createObjectURL(blob), link = document.createElement("a");
      link.href = url;
      link.download = "Project_Sengoku_Core_v1_0_Phase2_Save_" + Date.now() + ".json";
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      return { ok: true, errors: [] };
    } catch (error) { return resultError("export_failed", "JSON出力に失敗しました"); }
  };
  S.Save.importJSON = function (json) {
    var previous = S.State.current;
    try {
      var decoded = decodeRaw(json), migrated = decoded.ok ? S.State.migrateState(decoded.state) : decoded;
      if (!migrated.ok) return migrated;
      var saved = S.Save.autosave(migrated.state);
      if (!saved.ok) { S.State.current = previous; return saved; }
      S.State.current = migrated.state;
      S.Save.captureRuntimeCheckpoint(migrated.state, "import");
      return { ok: true, state: migrated.state, source: migrated.source, errors: [] };
    } catch (error) {
      S.State.current = previous;
      return resultError("import_invalid", "JSONが不正です: " + error.message);
    }
  };
})(window.Sengoku);
