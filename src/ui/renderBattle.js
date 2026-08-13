(function (S) {
  "use strict";
  var U = S.UI;
  U.showScoutTargets = function (sourceId, officerId) {
    var state = S.State.current, source = state.castles[sourceId];
    var targets = source.neighbors.map(function (id) { return state.castles[id]; }).filter(function (castle) { return castle.factionId !== state.campaign.playerFactionId; });
    if (!targets.length) { U.notify("偵察できる隣接敵城がありません", "error"); return; }
    U.openModal("<p class=\"kicker\">SCOUT</p><h2>偵察先を選ぶ</h2><div class=\"choices\">" + targets.map(function (castle) { return "<button class=\"choice\" data-scout-target=\"" + U.escape(castle.id) + "\" data-scout-source=\"" + U.escape(sourceId) + "\" data-scout-officer=\"" + U.escape(officerId) + "\"><strong>" + U.escape(castle.name) + "</strong><small>敵情報を3季の間表示します。</small></button>"; }).join("") + "</div>");
  };
  U.showBattlePlanner = function (sourceId, opening, debugDiplomacyOverride, preset) {
    preset = preset || {};
    var state = S.State.current, source = state.castles[sourceId], targets = S.Systems.Battle.availableTargets(state, sourceId, state.campaign.playerFactionId, { ignoreDiplomacy: Boolean(debugDiplomacyOverride) }), officers = S.Systems.Officer.atCastle(state, sourceId, state.campaign.playerFactionId).filter(function (officer) { return officer.injury !== "重傷"; }), maxCommit = S.Systems.Battle.maxCommit(state, sourceId);
    if (!targets.length) { U.notify("侵攻できる隣接敵城がありません", "error"); return; }
    if (!officers.length) { U.notify("出陣できる武将がいません", "error"); return; }
    if (maxCommit < S.Config.MIN_ATTACK_FORCE) { U.notify("最低守備兵" + S.Config.MIN_GARRISON + "を残すため、侵攻兵力が不足しています", "error"); return; }
    var selectedTarget = preset.targetId && state.castles[preset.targetId] ? preset.targetId : opening && state.castles.narumi ? "narumi" : targets[0].id;
    U.openModal("<p class=\"kicker\">WAR COUNCIL</p><h2>出陣軍議</h2><p>総大将・副将・戦術・戦場判断を選んでください。</p>" +
      "<label class=\"field\"><span>侵攻先</span><select id=\"battleTarget\">" + targets.map(function (castle) { return "<option value=\"" + U.escape(castle.id) + "\"" + (castle.id === selectedTarget ? " selected" : "") + ">" + U.escape(castle.name) + "（兵" + (state.events.intel[castle.id] > 0 || opening ? castle.troops : "?") + "・防備" + castle.defense + "）</option>"; }).join("") + "</select></label>" +
      "<label class=\"field\"><span>総大将</span><select id=\"battleCommander\">" + officers.map(function (officer) { return "<option value=\"" + U.escape(officer.id) + "\"" + (officer.id === preset.commanderId ? " selected" : "") + ">" + U.escape(officer.name) + "（統" + officer.stats.leadership + "・武" + officer.stats.might + "）</option>"; }).join("") + "</select></label>" +
      "<label class=\"field\"><span>副将</span><select id=\"battleDeputy\"><option value=\"\">なし</option>" + officers.map(function (officer) { return "<option value=\"" + U.escape(officer.id) + "\">" + U.escape(officer.name) + "</option>"; }).join("") + "</select></label>" +
      "<label class=\"field\"><span>投入兵力（" + S.Config.MIN_ATTACK_FORCE + "〜" + maxCommit + "、守備兵" + S.Config.MIN_GARRISON + "を残す）</span><input id=\"battleCommitted\" type=\"number\" min=\"" + S.Config.MIN_ATTACK_FORCE + "\" max=\"" + maxCommit + "\" value=\"" + Math.max(S.Config.MIN_ATTACK_FORCE, Math.min(maxCommit, Math.floor(source.troops * S.Config.DEFAULT_COMMIT_RATIO))) + "\"></label>" +
      "<label class=\"field\"><span>戦術</span><select id=\"battleTactic\">" + S.Data.tactics.map(function (item) { return "<option value=\"" + U.escape(item.id) + "\"" + (item.id === preset.tacticId ? " selected" : "") + ">" + U.escape(item.name) + " — " + U.escape(item.description) + "</option>"; }).join("") + "</select></label>" +
      "<label class=\"field\"><span>戦場判断</span><select id=\"battleDecision\">" + S.Data.battleDecisions.map(function (item) { return "<option value=\"" + U.escape(item.id) + "\">" + U.escape(item.name) + "</option>"; }).join("") + "</select></label>" +
      (debugDiplomacyOverride ? "<p class=\"bad\">DEBUG: 外交合法性を明示的に無視します。</p>" : "") + "<div class=\"modal-actions\"><button class=\"button secondary\" data-close-modal>戻る</button><button class=\"button primary\" data-resolve-battle data-battle-source=\"" + U.escape(sourceId) + "\" data-opening=\"" + (opening ? "1" : "0") + "\" data-debug-diplomacy=\"" + (debugDiplomacyOverride ? "1" : "0") + "\">出陣する</button></div>");
  };
  U.resolveBattleFromModal = function (button) {
    var state = S.State.current, commanderId = U.el("battleCommander").value, deputyId = U.el("battleDeputy").value;
    if (commanderId === deputyId) { U.notify("総大将と副将は別の武将を選んでください", "error"); return; }
    var options = {
      sourceId: button.dataset.battleSource,
      targetId: U.el("battleTarget").value,
      commanderId: commanderId,
      deputyId: deputyId || null,
      tacticId: U.el("battleTactic").value,
      decisionId: U.el("battleDecision").value,
      committedTroops: Number(U.el("battleCommitted").value),
      attackerFactionId: state.campaign.playerFactionId,
      defenderFactionId: state.castles[U.el("battleTarget").value].factionId,
      controlledByPlayer: true,
      opening: button.dataset.opening === "1",
      ignoreDiplomacy: button.dataset.debugDiplomacy === "1"
    };
    var started = S.Systems.Battle.start(state, options);
    if (!started.ok) { U.commit(started, { autosave: false }); return; }
    if (S.Systems.Event.getPendingInteraction(state)) S.Systems.Event.completeInteraction(state, "requestBattlePlanner");
    var result = S.Systems.Battle.resolve(state, {});
    if (!result.ok) { U.commit(result, { autosave: false }); return; }
    S.Save.autosave(state);
    var report = result.stateChanges.report;
    if (U.showBattleReport) U.showBattleReport(report);
  };
})(window.Sengoku);
