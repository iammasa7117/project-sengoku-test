(function (S) {
  "use strict";
  var U = S.UI;
  function targetName(state, target) { var item = target && (target.type === "officer" ? state.officers[target.id] : target.type === "castle" ? state.castles[target.id] : state.factions[target.id]); return item ? item.name : ""; }
  U.showActiveEvent = function () {
    var state = S.State.current; S.Systems.Event.reconcileInstances(state);
    var instance = S.Systems.Event.getActiveEvent(state); if (!instance) return false;
    var model = S.Systems.Event.renderEvent(state, instance); if (!model) return false;
    var targetInfo = Object.keys(model.targets).map(function (name) { var label = targetName(state, model.targets[name]); return label ? U.escape(label) : ""; }).filter(Boolean).join(" / ");
    var choices = model.choices.map(function (choice) {
      var speaker = choice.speakerTarget && model.targets[choice.speakerTarget] ? targetName(state, model.targets[choice.speakerTarget]) : "";
      return "<button class=\"choice event-choice\" data-event-choice=\"" + U.escape(choice.id) + "\" data-instance-id=\"" + U.escape(model.instanceId) + "\"" + (choice.enabled ? "" : " disabled aria-disabled=\"true\"") + "><strong>" + choice.label + "</strong>" + (speaker ? "<small>提案者: " + U.escape(speaker) + "</small>" : "") + (choice.costs ? "<small>費用: " + U.escape(choice.costs) + "</small>" : "") + (!choice.enabled ? "<small class=\"bad\">" + choice.disabledReason + "</small>" : "") + "</button>";
    }).join("");
    U.openModal("<div class=\"event-view\" data-event-modal><p class=\"kicker\">" + model.kicker + "</p><h2>" + model.title + "</h2><p>" + model.body + "</p>" + (targetInfo ? "<p class=\"muted\">対象: " + targetInfo + "</p>" : "") + "<div class=\"choices event-choices\">" + choices + "</div></div>", { event: true });
    return true;
  };
  U.showEventResult = function (historyEntry) {
    U.openModal("<div class=\"event-view\" data-event-modal><p class=\"kicker\">EVENT RESULT</p><h2>" + U.escape(historyEntry.title) + "</h2><p>" + U.escape(historyEntry.result) + "</p><div class=\"modal-actions\"><button class=\"button primary\" data-event-next>次へ</button></div></div>", { event: true });
  };
  U.eventChoiceLocks = {};
  U.resolveEventChoice = function (instanceId, choiceId) {
    if (U.eventChoiceLockState !== S.State.current) { U.eventChoiceLocks = {}; U.eventChoiceLockState = S.State.current; }
    var lockKey = instanceId + ":" + choiceId;
    if (U.eventChoiceLocks[lockKey]) return { ok: false, errors: ["このイベント選択は処理中です"] };
    U.eventChoiceLocks[lockKey] = true;
    var result = S.Systems.Event.resolveChoice(S.State.current, instanceId, choiceId);
    if (!result.ok) { delete U.eventChoiceLocks[lockKey]; return result; }
    if (U.commit(result, { render: false })) U.showEventResult(result.stateChanges.historyEntry);
    return result;
  };
  U.activateEventChoice = function (key, instanceId, choiceId) {
    if (key !== "Enter" && key !== " ") return { ok: false, errors: ["未対応のキーです"] };
    return U.resolveEventChoice(instanceId, choiceId);
  };
  U.showEventHistory = function () {
    var entries = S.State.current.events.engine.history.slice().reverse();
    U.openModal("<p class=\"kicker\">EVENT HISTORY</p><h2>出来事履歴</h2>" + (entries.length ? entries.map(function (entry) { return "<div class=\"record\"><strong>" + U.escape(entry.date) + " — " + U.escape(entry.title) + "</strong><p>" + U.escape(entry.selectedChoiceLabel || "取消") + " / " + U.escape(entry.result) + "</p></div>"; }).join("") : "<p>まだ出来事履歴はありません。</p>") + "<div class=\"modal-actions\"><button class=\"button primary\" data-close-modal>閉じる</button></div>");
  };
  U.showArcStatus = function () {
    var arcs = S.State.current.events.engine.arcs, ids = Object.keys(arcs);
    U.openModal("<p class=\"kicker\">STORY ARC STATUS</p><h2>進行状況</h2>" + (ids.length ? ids.map(function (id) { var arc = arcs[id], definition = S.Data.StoryArcRegistry.definitions[id] || {}; return "<div class=\"record arc-status\"><strong>" + U.escape(definition.name || id) + "</strong><p>" + U.escape(arc.status) + " / " + U.escape(arc.currentStep || "-") + "</p></div>"; }).join("") : "<p>進行中のStory Arcはありません。</p>") + "<div class=\"modal-actions\"><button class=\"button primary\" data-close-modal>閉じる</button></div>");
  };
  U.eventDebugSnapshot = function () {
    var engine = S.State.current.events.engine;
    return { activeEvent: engine.activeEvent, queue: engine.queue, flags: S.State.current.events.flags, variables: engine.variables, counters: engine.counters, cooldowns: engine.cooldowns, arcs: engine.arcs, history: engine.history, diagnostics: engine.diagnostics };
  };
  U.openEventInteraction = function () {
    var interaction = S.Systems.Event.getPendingInteraction(S.State.current); if (!interaction) return false;
    U.showBattlePlanner(interaction.sourceId, interaction.opening, false, Object.assign({ targetId: interaction.targetId }, interaction.preset)); return true;
  };
})(window.Sengoku);
