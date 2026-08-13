(function (S) {
  "use strict";
  var U = S.UI, D = S.Debug.Actions = {};
  D.setResources = function (state, gold, food, troops) {
    if (Number.isFinite(gold)) state.campaign.gold = Math.max(0, gold);
    if (Number.isFinite(food)) state.campaign.food = Math.max(0, food);
    if (Number.isFinite(troops)) { var castle = state.castles[state.campaign.selectedCastleId]; if (castle) S.Systems.Unit.setGuardTroops(state, castle, Math.max(0, troops)); }
    return { ok: true, stateChanges: {}, messages: ["資源を変更しました。"], errors: [] };
  };
  D.forceVictory = function (state) {
    Object.keys(state.castles).forEach(function (id) { state.castles[id].factionId = state.campaign.playerFactionId; state.castles[id].governorId = null; });
    S.State.repairState(state); return S.Systems.Victory.check(state);
  };
  D.reset = function () {
    var old = S.State.current, options = { scenarioId: old.campaign.scenarioId, playerFactionId: old.campaign.playerFactionId, difficultyId: old.campaign.difficultyId };
    S.State.current = S.State.createInitialState(options); S.Systems.Campaign.begin(S.State.current);
    return { ok: true, stateChanges: {}, messages: ["同じ設定の初期状態へ戻しました。"], errors: [] };
  };
  D.transferCastle = function (state, castleId, factionId) { return S.Systems.Campaign.transferCastle(state, castleId, factionId); };
  D.moveOfficer = function (state, officerId, castleId) { return S.Systems.Officer.moveOfficer(state, officerId, castleId, { consumeCommand: false, silent: false }); };
  D.runAI = function (state, seasons, random) {
    var completed = 0, actions = 0, rng = random || Math.random;
    for (var i = 0; i < seasons && !state.campaign.gameOver; i += 1) { var result = S.Systems.Turn.advance(state, { random: rng }); if (!result.ok) return result; completed += 1; actions += result.stateChanges.aiActions.length + result.stateChanges.aiDiplomacyActions.length; }
    return { ok: true, stateChanges: { completed: completed, actions: actions }, messages: ["AIを" + completed + "季実行（" + actions + "行動）しました。"], errors: [] };
  };
  D.simulate100 = function (state) { return S.Systems.AI.simulate(state, 100, Math.random); };
  D.simulateAll = function (state) { return S.Systems.AI.simulateAllFactions(state, 200, Math.random, { terminationLimit: 300 }); };
  D.repair = function (state) { var result = S.State.repairState(state); return { ok: true, stateChanges: { changes: result.changes }, messages: ["整合性修復: " + result.changes.length + "件"], errors: [] }; };
  D.enableEventPack = function (state, packId, enabled) { return S.Systems.Event.enablePack(state, packId, enabled); };
  D.validateEventPacks = function () { var result = S.Systems.Event.validateContentPackRegistry(); return { ok: result.ok, stateChanges: {}, messages: [result.ok ? "Content Pack検証 PASS" : result.errors.join(" / ")], errors: result.ok ? [] : result.errors }; };
  D.validateEvents = function () { var errors = []; S.Data.ContentPackRegistry.order.forEach(function (packId) { S.Data.ContentPackRegistry.packs[packId].events.forEach(function (definition) { errors = errors.concat(S.Systems.Event.validateDefinition(definition).errors); }); }); return { ok: errors.length === 0, stateChanges: {}, messages: [errors.length ? errors.join(" / ") : "イベント定義検証 PASS"], errors: errors }; };
  D.emitEventTrigger = function (state, trigger) { return S.Systems.Event.emit(state, trigger, { factionId: state.campaign.playerFactionId, castleId: state.campaign.selectedCastleId }); };
  D.queueEvent = function (state, eventId) { return S.Systems.Event.queueEvent(state, eventId, { debug: true }); };
  D.clearEventQueue = function (state) { return S.Systems.Event.clearQueue(state); };
  D.editOfficerProfile = function (state, officerId, kind, id, add) { var method = (add ? "add" : "remove") + kind.charAt(0).toUpperCase() + kind.slice(1); return S.Systems.Event.Profile[method] ? S.Systems.Event.Profile[method](state, officerId, id) : { ok: false, errors: ["profile操作が不正です"] }; };
  D.eventStress = function (state, count, trigger) { var completed = 0, total = Math.max(1, Math.min(10000, Math.floor(count || 100))); for (var i = 0; i < total; i += 1) { var result = S.Systems.Event.emit(state, trigger, { debugSequence: i }, { random: function () { return 0.99; } }); if (!result.ok) return result; completed += 1; } return { ok: true, stateChanges: { completed: completed }, messages: ["Event.emitを" + completed + "回実行しました。"], errors: [] }; };
  U.toggleDebug = function (force) { var panel = U.el("debugPanel"), show = force === undefined ? panel.classList.contains("hidden") : Boolean(force); panel.classList.toggle("hidden", !show); if (show) U.renderDebugPanel(); };
  U.renderDebugPanel = function () {
    var panel = U.el("debugPanel"), state = S.State.current;
    if (!state) { panel.innerHTML = "<h3>Debug</h3><p>ゲーム状態がありません。</p>"; return; }
    var castle = state.castles[state.campaign.selectedCastleId], validation = S.State.validateState(state);
    var castleOptions = Object.keys(state.castles).map(function (id) { return "<option value=\"" + U.escape(id) + "\">" + U.escape(state.castles[id].name) + "</option>"; }).join("");
    var factionOptions = Object.keys(state.factions).map(function (id) { return "<option value=\"" + U.escape(id) + "\">" + U.escape(state.factions[id].name) + "</option>"; }).join("");
    var officerOptions = Object.keys(state.officers).filter(function (id) { return state.officers[id].status === "active"; }).map(function (id) { return "<option value=\"" + U.escape(id) + "\">" + U.escape(state.officers[id].name) + "</option>"; }).join("");
    var packOptions = S.Data.ContentPackRegistry.order.map(function (id) { return "<option value=\"" + U.escape(id) + "\">" + U.escape(id) + (state.events.engine.enabledPackIds.indexOf(id) >= 0 ? " [ON]" : " [OFF]") + "</option>"; }).join("");
    var eventOptions = S.Data.ContentPackRegistry.order.reduce(function (items, packId) { return items.concat(S.Data.ContentPackRegistry.packs[packId].events); }, []).map(function (definition) { return "<option value=\"" + U.escape(definition.id) + "\">" + U.escape(definition.id) + "</option>"; }).join("");
    var triggerOptions = Object.keys(S.Config.EVENT_TRIGGERS).map(function (key) { return "<option value=\"" + U.escape(S.Config.EVENT_TRIGGERS[key]) + "\">" + U.escape(S.Config.EVENT_TRIGGERS[key]) + "</option>"; }).join("");
    var releaseSnapshot = S.Systems.Release ? S.Systems.Release.snapshot(state) : null;
    var engineSnapshot = { activeEvent: state.events.engine.activeEvent, queue: state.events.engine.queue, flags: state.events.flags, variables: state.events.engine.variables, counters: state.events.engine.counters, cooldowns: state.events.engine.cooldowns, arcs: state.events.engine.arcs, history: state.events.engine.history, diagnostics: state.events.engine.diagnostics };
    panel.innerHTML = "<h3>Core v1.0 Debug</h3><p class=\"kicker\">" + U.escape(state.campaign.scenarioId) + " / " + U.escape(state.campaign.difficultyId) + " / " + U.escape(state.campaign.playerFactionId) + "</p>" +
      "<label class=\"field\"><span>金</span><input id=\"debugGold\" type=\"number\" value=\"" + state.campaign.gold + "\"></label><label class=\"field\"><span>兵糧</span><input id=\"debugFood\" type=\"number\" value=\"" + state.campaign.food + "\"></label><label class=\"field\"><span>選択城の兵力</span><input id=\"debugTroops\" type=\"number\" value=\"" + (castle ? castle.troops : 0) + "\"></label>" +
      "<div class=\"debug-actions\"><button class=\"button secondary\" data-debug=\"resources\">資源を反映</button><button class=\"button secondary\" data-debug=\"season\">季節進行</button><button class=\"button secondary\" data-debug=\"commands\">命令回復</button><button class=\"button secondary\" data-debug=\"ai-toggle\">AI " + (state.settings.aiEnabled ? "OFF" : "ON") + "</button><button class=\"button secondary\" data-debug=\"battle\">任意戦闘開始</button></div>" +
      "<label class=\"field\"><span>城移譲</span><select id=\"debugTransferCastle\">" + castleOptions + "</select><select id=\"debugTransferFaction\">" + factionOptions + "</select></label><button class=\"button secondary\" data-debug=\"transfer\">指定勢力へ移譲</button>" +
      "<label class=\"field\"><span>武将移動</span><select id=\"debugMoveOfficer\">" + officerOptions + "</select><select id=\"debugMoveCastle\">" + castleOptions + "</select></label><button class=\"button secondary\" data-debug=\"move\">指定武将を移動</button>" +
      "<p class=\"kicker\">RELEASE BALANCE</p><pre data-release-balance-inspection>" + U.escape(JSON.stringify(releaseSnapshot, null, 2)) + "</pre><p class=\"kicker\">EVENT ENGINE</p><label class=\"field\"><span>Content Pack</span><select id=\"debugEventPack\">" + packOptions + "</select></label><div class=\"debug-actions\"><button class=\"button secondary\" data-debug=\"event-pack-on\">有効化</button><button class=\"button secondary\" data-debug=\"event-pack-off\">無効化</button><button class=\"button secondary\" data-debug=\"event-validate-packs\">Pack検証</button><button class=\"button secondary\" data-debug=\"event-validate-defs\">Event検証</button></div>" +
      "<label class=\"field\"><span>Trigger</span><select id=\"debugEventTrigger\">" + triggerOptions + "</select></label><button class=\"button secondary\" data-debug=\"event-emit\">手動emit</button><label class=\"field\"><span>Event ID</span><select id=\"debugEventId\">" + eventOptions + "</select></label><div class=\"debug-actions\"><button class=\"button secondary\" data-debug=\"event-queue\">queueへ追加</button><button class=\"button secondary\" data-debug=\"event-clear\">queue消去</button></div>" +
      "<label class=\"field\"><span>武将profile</span><select id=\"debugProfileOfficer\">" + officerOptions + "</select><select id=\"debugProfileKind\"><option value=\"personality\">personality</option><option value=\"trait\">trait</option><option value=\"tag\">tag</option></select><input id=\"debugProfileId\" placeholder=\"登録済みID / tag\"></label><div class=\"debug-actions\"><button class=\"button secondary\" data-debug=\"event-profile-add\">追加</button><button class=\"button secondary\" data-debug=\"event-profile-remove\">削除</button></div>" +
      "<label class=\"field\"><span>Stress回数</span><input id=\"debugEventStressCount\" type=\"number\" min=\"1\" max=\"10000\" value=\"100\"></label><button class=\"button secondary\" data-debug=\"event-stress\">Event stress</button><pre data-event-debug-inspection>" + U.escape(JSON.stringify(engineSnapshot, null, 2)) + "</pre>" +
      "<div class=\"debug-actions\"><button class=\"button secondary\" data-debug=\"ai1\">AIを1季実行</button><button class=\"button secondary\" data-debug=\"ai10\">AIを10季実行</button><button class=\"button secondary\" data-debug=\"sim100\">100季節シミュレーション</button><button class=\"button secondary\" data-debug=\"simall\">全AI 200〜300季</button><button class=\"button secondary\" data-debug=\"validate\">終了状態を検証</button><button class=\"button secondary\" data-debug=\"repair\">明示的な整合性修復</button><button class=\"button secondary\" data-debug=\"victory\">勝利状態</button><button class=\"button danger\" data-debug=\"reset\">初期化</button><button class=\"button primary\" data-debug=\"close\">閉じる</button></div>" +
      "<p>検証: <strong class=\"" + (validation.ok ? "good" : "bad") + "\">" + (validation.ok ? "PASS" : "FAIL: " + U.escape(validation.errors.join(" / "))) + "</strong></p>" +
      (state.debug.lastSimulation ? "<p class=\"kicker\">LAST SIMULATION</p><pre>" + U.escape(JSON.stringify(state.debug.lastSimulation, null, 2)) + "</pre>" : "") +
      "<p class=\"kicker\">ERROR LOG</p><pre>" + U.escape(JSON.stringify(S.Debug.errors, null, 2)) + "</pre><p class=\"kicker\">CURRENT STATE</p><pre>" + U.escape(JSON.stringify(state, null, 2)) + "</pre>";
  };
})(window.Sengoku);
