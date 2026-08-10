(function (S) {
  "use strict";
  var U = S.UI;
  function startNewGame(options) {
    S.State.current = S.State.createInitialState(options || {});
    var begun = S.Systems.Campaign.begin(S.State.current); if (!begun.ok) { U.notify(begun.errors.join(" / "), "error"); return; }
    if (U.markGuideMilestone) U.markGuideMilestone("gameStarted");
    S.Save.autosave(S.State.current);
    U.closeModal(true); U.showGame(); U.showIntro();
  }
  function executeCommand(action, officerId) {
    var state = S.State.current, castleId = state.campaign.selectedCastleId, result;
    if (action === "develop") result = S.Systems.Domestic.executeDevelopment(state, castleId, officerId);
    else if (action === "cultivate") result = S.Systems.Domestic.executeCultivation(state, castleId, officerId);
    else if (action === "recruit") result = S.Systems.Domestic.executeRecruitment(state, castleId, officerId);
    else if (action === "train") result = S.Systems.Domestic.executeTraining(state, castleId, officerId);
    else if (action === "rest") result = S.Systems.Domestic.executeRest(state, castleId, officerId);
    else if (action === "scout") { U.showScoutTargets(castleId, officerId); return; }
    if (result) {
      if (result.ok && U.markGuideMilestone) U.markGuideMilestone("commandUsed");
      if (U.commit(result)) U.closeModal();
    }
  }
  function advanceSeason() {
    var result = S.Systems.Turn.advance(S.State.current, {});
    if (result.ok && U.markGuideMilestone) U.markGuideMilestone("seasonAdvanced");
    if (U.commit(result)) {
      if (result.stateChanges && result.stateChanges.interruptedByTactical) { S.Systems.BattleAdapter.openPending(); return; }
      var armyBattle = result.stateChanges && (result.stateChanges.armyActions || []).map(function (item) { return item && item.report; }).find(Boolean);
      if (armyBattle && U.showBattleReport) { U.showBattleReport(armyBattle); return; }
      var pending = S.State.current.diplomacy.proposals.some(function (item) { return item.status === "pending" && item.targetFactionId === S.State.current.campaign.playerFactionId; });
      if (pending) U.showPendingProposals();
      else if (!U.showDefenseNotifications() && S.State.current.campaign.gameOver) U.showEnding();
    }
  }
  function handleDebug(action) {
    var state = S.State.current, result;
    if (action === "resources") result = S.Debug.Actions.setResources(state, Number(U.el("debugGold").value), Number(U.el("debugFood").value), Number(U.el("debugTroops").value));
    else if (action === "season") result = S.Systems.Turn.advance(state, { skipAI: true });
    else if (action === "commands") result = S.Systems.Campaign.recoverCommands(state);
    else if (action === "ai-toggle") result = S.Systems.Campaign.setAI(state, !state.settings.aiEnabled);
    else if (action === "ai1") result = S.Debug.Actions.runAI(state, 1);
    else if (action === "ai10") result = S.Debug.Actions.runAI(state, 10);
    else if (action === "sim100") result = S.Debug.Actions.simulate100(state);
    else if (action === "simall") result = S.Debug.Actions.simulateAll(state);
    else if (action === "transfer") result = S.Debug.Actions.transferCastle(state, U.el("debugTransferCastle").value, U.el("debugTransferFaction").value);
    else if (action === "move") result = S.Debug.Actions.moveOfficer(state, U.el("debugMoveOfficer").value, U.el("debugMoveCastle").value);
    else if (action === "repair") result = S.Debug.Actions.repair(state);
    else if (action === "event-pack-on") result = S.Debug.Actions.enableEventPack(state, U.el("debugEventPack").value, true);
    else if (action === "event-pack-off") result = S.Debug.Actions.enableEventPack(state, U.el("debugEventPack").value, false);
    else if (action === "event-validate-packs") result = S.Debug.Actions.validateEventPacks();
    else if (action === "event-validate-defs") result = S.Debug.Actions.validateEvents();
    else if (action === "event-emit") result = S.Debug.Actions.emitEventTrigger(state, U.el("debugEventTrigger").value);
    else if (action === "event-queue") result = S.Debug.Actions.queueEvent(state, U.el("debugEventId").value);
    else if (action === "event-clear") result = S.Debug.Actions.clearEventQueue(state);
    else if (action === "event-profile-add" || action === "event-profile-remove") result = S.Debug.Actions.editOfficerProfile(state, U.el("debugProfileOfficer").value, U.el("debugProfileKind").value, U.el("debugProfileId").value, action === "event-profile-add");
    else if (action === "event-stress") result = S.Debug.Actions.eventStress(state, Number(U.el("debugEventStressCount").value), U.el("debugEventTrigger").value);
    else if (action === "victory") result = S.Debug.Actions.forceVictory(state);
    else if (action === "validate") { var validation = S.State.validateState(state); U.notify(validation.ok ? "状態検証 PASS" : validation.errors.join(" / "), validation.ok ? "" : "error"); U.renderDebugPanel(); return; }
    else if (action === "reset") result = S.Debug.Actions.reset();
    else if (action === "battle") {
      var source = state.castles[state.campaign.selectedCastleId];
      if (!source || source.factionId !== state.campaign.playerFactionId || !S.Systems.Battle.availableTargets(state, source.id, state.campaign.playerFactionId, { ignoreDiplomacy: true }).length) source = S.Systems.Turn.playerCastles(state).find(function (item) { return S.Systems.Battle.availableTargets(state, item.id, state.campaign.playerFactionId, { ignoreDiplomacy: true }).length; });
      if (!source) { U.notify("開始できる戦闘がありません", "error"); return; }
      U.toggleDebug(false); U.showBattlePlanner(source.id, false, true); return;
    } else if (action === "close") { U.toggleDebug(false); return; }
    if (result) { U.commit(result); if (S.State.current.campaign.gameOver) U.showEnding(); else U.renderDebugPanel(); }
  }
  function handleDiplomacyAction(action, targetId) {
    var state = S.State.current, playerId = state.campaign.playerFactionId, messenger = U.el("diplomacyMessenger"), messengerId = messenger && messenger.value, result, prisoner;
    var proposalOptions = { messengerId: messengerId, random: Math.random };
    if (action === "improve") result = S.Systems.Diplomacy.improveRelations(state, playerId, targetId, messengerId, {});
    else if (action === "declare_war") result = S.Systems.Diplomacy.declareWar(state, playerId, targetId, {});
    else if (action === "peace") result = S.Systems.Diplomacy.makePeace(state, playerId, targetId, proposalOptions);
    else if (action === "ceasefire") result = S.Systems.Diplomacy.makeCeasefire(state, playerId, targetId, proposalOptions);
    else if (action === "non_aggression") result = S.Systems.Diplomacy.makeNonAggression(state, playerId, targetId, proposalOptions);
    else if (action === "alliance") result = S.Systems.Diplomacy.makeAlliance(state, playerId, targetId, proposalOptions);
    else if (action === "extend") result = S.Systems.Diplomacy.propose(state, "extend", playerId, targetId, proposalOptions);
    else if (action === "break_treaty") result = S.Systems.Diplomacy.breakTreaty(state, playerId, targetId, {});
    else if (action === "aid") result = S.Systems.Diplomacy.sendAid(state, playerId, targetId, { gold: Number(U.el("diplomacyAidGold").value), food: Number(U.el("diplomacyAidFood").value) });
    else if (action === "reinforcement") result = S.Systems.Diplomacy.requestReinforcement(state, playerId, targetId, { messengerId: messengerId, sourceCastleId: U.el("diplomacyReinforceSource").value, targetCastleId: U.el("diplomacyReinforceTarget").value, troops: Number(U.el("diplomacyReinforceTroops").value), random: Math.random });
    else if (action === "prisoner_exchange") result = S.Systems.Diplomacy.propose(state, "prisoner_exchange", playerId, targetId, proposalOptions);
    else if (action === "release_prisoner") { prisoner = state.prisoners.find(function (id) { return state.officers[id].captorFactionId === playerId && state.officers[id].factionId === targetId; }); result = prisoner ? S.Systems.Diplomacy.releasePrisoner(state, playerId, prisoner) : { ok: false, errors: ["解放できる捕虜がいません"] }; }
    else if (action === "surrender") result = S.Systems.Diplomacy.recommendSurrender(state, playerId, targetId, proposalOptions);
    else if (action === "vassalage") result = S.Systems.Diplomacy.proposeVassalage(state, playerId, targetId, proposalOptions);
    else if (action === "release_vassal") result = S.Systems.Diplomacy.releaseVassal(state, playerId, targetId);
    else if (action === "independence") result = S.Systems.Diplomacy.independence(state, playerId, {});
    if (result && U.commit(result)) { S.Systems.Victory.check(state); if (state.campaign.gameOver) U.showEnding(); else U.showDiplomacyDetail(targetId); }
  }
  document.addEventListener("change", function (event) {
    if (!event.target) return;
    if (event.target.id === "setupScenario" || event.target.id === "setupDifficulty") U.updateNewGameSetup();
    if (event.target.dataset && event.target.dataset.uiSetting) {
      var preference = U.setPreference(event.target.dataset.uiSetting, event.target.checked);
      if (!preference.ok) U.notify(preference.errors.join(" / "), "error"); else S.Save.autosave(S.State.current);
    }
    if (event.target.dataset && event.target.dataset.tutorialToggle !== undefined) {
      U.setTutorialEnabled(event.target.checked); S.Save.autosave(S.State.current);
    }
  });
  document.addEventListener("click", function (event) {
    var target = event.target.closest("button,[data-castle-id],[data-officer-id]");
    if (!target) return;
    if (target.dataset.armyId) { U.showArmyDetail(target.dataset.armyId); return; }
    if (target.dataset.castleId) { var selected = S.Systems.Campaign.selectCastle(S.State.current, target.dataset.castleId); if (selected.ok && U.markGuideMilestone && S.State.current.castles[target.dataset.castleId].factionId === S.State.current.campaign.playerFactionId) U.markGuideMilestone("castleSelected"); U.commit(selected, { autosave: false }); return; }
    if (target.dataset.officerId) { U.showOfficerDetail(target.dataset.officerId); return; }
    if (target.dataset.closeModal !== undefined) { U.closeModal(); return; }
    if (target.dataset.openHelp !== undefined) { U.showHelpCenter(); return; }
    if (target.dataset.openUxSettings !== undefined) { U.showUXSettings(); return; }
    if (target.dataset.restartTutorial !== undefined) { U.restartTutorial(); if (S.State.current.campaign.status !== "title") S.Save.autosave(S.State.current); U.closeModal(true); U.renderApp(); return; }
    if (target.dataset.dismissTutorial !== undefined) { U.dismissTutorial(); S.Save.autosave(S.State.current); return; }
    if (target.dataset.guideAction) { if (!U.handleGuideAction(target.dataset.guideAction)) U.notify("この案内を開けませんでした", "error"); return; }
    if (target.dataset.mobileEndTurn !== undefined) { advanceSeason(); return; }
    if (target.dataset.mobileNav) { if (target.dataset.mobileNav === "menu") U.showMenu(); else if (U.setMobileCampaignView && U.isMobileCampaignLayout && U.isMobileCampaignLayout()) U.setMobileCampaignView(target.dataset.mobileNav); else U.scrollToSection(target.dataset.mobileNav); return; }
    if (target.dataset.startNewGame !== undefined) { startNewGame({ scenarioId: U.el("setupScenario").value, playerFactionId: U.el("setupFaction").value, difficultyId: U.el("setupDifficulty").value, tutorialEnabled: !U.el("setupTutorial") || U.el("setupTutorial").checked }); return; }
    if (target.dataset.command) { if (target.dataset.command === "attack") U.showArmyPlanner(S.State.current.campaign.selectedCastleId); else U.showOfficerChoice(target.dataset.command); return; }
    if (target.dataset.runCommand) { executeCommand(target.dataset.runCommand, target.dataset.commandOfficer); return; }
    if (target.dataset.scoutTarget) { var scoutResult = S.Systems.Domestic.executeScout(S.State.current, target.dataset.scoutSource, target.dataset.scoutTarget, target.dataset.scoutOfficer); if (U.commit(scoutResult)) U.closeModal(); return; }
    if (target.dataset.showActiveEvent !== undefined) { U.showActiveEvent(); return; }
    if (target.dataset.resumeEventInteraction !== undefined) { U.openEventInteraction(); return; }
    if (target.dataset.eventChoice) { target.disabled = true; var eventResult = U.resolveEventChoice(target.dataset.instanceId, target.dataset.eventChoice); if (!eventResult.ok) { target.disabled = false; U.notify(eventResult.errors.join(" / "), "error"); } return; }
    if (target.dataset.eventNext !== undefined) { U.closeModal(true); if (!U.openEventInteraction() && !U.showActiveEvent()) U.renderApp(); return; }
    if (target.dataset.deployArmy !== undefined) { U.deployArmyFromModal(target); return; }
    if (target.dataset.cancelArmy) { var canceledArmy = S.Systems.Army.cancelMarch(S.State.current, target.dataset.cancelArmy); if (U.commit(canceledArmy)) U.closeModal(); return; }
    if (target.dataset.resolveBattle !== undefined) { U.resolveBattleFromModal(target); return; }
    if (target.dataset.battleFinish !== undefined) { U.closeModal(); U.renderApp(); if (S.State.current.campaign.gameOver) U.showEnding(); return; }
    if (target.dataset.defenseFinish !== undefined) { U.closeModal(); if (S.State.current.campaign.gameOver) U.showEnding(); return; }
    if (target.dataset.openRetainers !== undefined) { U.showRetainers(); return; }
    if (target.dataset.openRivals !== undefined) { U.showRivals(); return; }
    if (target.dataset.openBattles !== undefined) { U.showBattles(); return; }
    if (target.dataset.openEventHistory !== undefined) { U.showEventHistory(); return; }
    if (target.dataset.openChronicle !== undefined) { U.showChronicle(); return; }
    if (target.dataset.openPrisoners !== undefined) { U.showPrisoners(); return; }
    if (target.dataset.openDiplomacy !== undefined) { U.showDiplomacy(); return; }
    if (target.dataset.diplomacyTarget) { U.showDiplomacyDetail(target.dataset.diplomacyTarget); return; }
    if (target.dataset.openDiplomacyHistory !== undefined) { U.showDiplomacyHistory(); return; }
    if (target.dataset.openProposals !== undefined) { U.showPendingProposals(); return; }
    if (target.dataset.respondProposal) { var response = S.Systems.Diplomacy.respondProposal(S.State.current, target.dataset.proposalId, target.dataset.respondProposal === "accept", {}); U.commit(response); U.showPendingProposals(); return; }
    if (target.dataset.diplomacyAction) { handleDiplomacyAction(target.dataset.diplomacyAction, target.dataset.diplomacyFaction); return; }
    if (target.dataset.openSaveMenu !== undefined) { U.showSaveMenu(); return; }
    if (target.dataset.openMove !== undefined) { U.showMoveSetup(); return; }
    if (target.dataset.moveOfficer !== undefined) { var moved = S.Systems.Officer.moveOfficer(S.State.current, U.el("moveOfficerSelect").value, U.el("moveCastleSelect").value, {}); if (U.commit(moved)) U.closeModal(); return; }
    if (target.dataset.favoriteOfficer) { U.commit(S.Systems.Officer.toggleFavorite(S.State.current, target.dataset.favoriteOfficer)); U.showOfficerDetail(target.dataset.favoriteOfficer); return; }
    if (target.dataset.audience) { if (U.commit(S.Systems.Loyalty.privateAudience(S.State.current, target.dataset.audience))) U.showOfficerDetail(target.dataset.audience); return; }
    if (target.dataset.reward) { if (U.commit(S.Systems.Loyalty.reward(S.State.current, target.dataset.reward))) U.showOfficerDetail(target.dataset.reward); return; }
    if (target.dataset.assignDomestic) {
      var domesticOfficer = S.State.current.officers[target.dataset.assignDomestic];
      var domesticResult = domesticOfficer && domesticOfficer.castleId ? S.Systems.Officer.assignDomesticCommand(S.State.current, domesticOfficer.id, domesticOfficer.castleId) : { ok: false, errors: ["奉行に任命できません"] };
      if (U.commit(domesticResult)) U.showOfficerDetail(target.dataset.assignDomestic);
      return;
    }
    if (target.dataset.setOfficerIdle) {
      var idleResult = S.Systems.Officer.setIdleCommand(S.State.current, target.dataset.setOfficerIdle);
      if (U.commit(idleResult)) U.showOfficerDetail(target.dataset.setOfficerIdle);
      return;
    }
    if (target.dataset.appoint) { U.showAppointment(target.dataset.appoint); return; }
    if (target.dataset.appointCastle) { var appointment = S.Systems.Officer.appointGovernor(S.State.current, target.dataset.appointOfficer, target.dataset.appointCastle); if (U.commit(appointment)) U.closeModal(); return; }
    if (target.dataset.recruitPrisoner) { U.showRecruitNegotiation(target.dataset.recruitPrisoner); return; }
    if (target.dataset.negotiate) { var recruitResult = S.Systems.Prisoner.recruit(S.State.current, target.dataset.negotiateOfficer, U.el("recruiterSelect").value, false, Math.random, target.dataset.negotiate); U.commit(recruitResult); if (recruitResult.ok) U.showPrisoners(); return; }
    if (target.dataset.releasePrisoner) { U.commit(S.Systems.Prisoner.release(S.State.current, target.dataset.releasePrisoner)); U.showPrisoners(); return; }
    if (target.dataset.rivalTreatment) { U.commit(S.Systems.Rivalry.treat(S.State.current, target.dataset.rivalPlayer, target.dataset.rivalEnemy, target.dataset.rivalTreatment)); U.showPrisoners(); return; }
    if (target.dataset.saveSlot) { var saveResult = S.Save.save(S.State.current, target.dataset.saveSlot); if (U.commit(saveResult, { autosave: false, render: false })) U.showSaveMenu(); return; }
    if (target.dataset.loadSlot) { var loaded = S.Save.load(target.dataset.loadSlot); if (loaded.ok) { U.notify(loaded.recovered ? "バックアップから復旧してロードしました。" : "ロードしました。"); U.closeModal(true); U.renderApp(); if (S.State.current.events && S.State.current.events.pendingTacticalBattle) S.Systems.BattleAdapter.openPending(); else if (S.Systems.Event.hasBlockingEvent(S.State.current)) U.showActiveEvent(); } else U.notify(loaded.errors.join(" / "), "error"); return; }
    if (target.dataset.restoreSaveSlot) { var restored = S.Save.restoreBackup(target.dataset.restoreSaveSlot, Number(target.dataset.restoreGeneration)); if (restored.ok) { U.notify("バックアップを復旧しました。"); U.closeModal(true); U.renderApp(); if (S.State.current.events && S.State.current.events.pendingTacticalBattle) S.Systems.BattleAdapter.openPending(); else if (S.Systems.Event.hasBlockingEvent(S.State.current)) U.showActiveEvent(); } else U.notify(restored.errors.join(" / "), "error"); return; }
    if (target.dataset.exportSave !== undefined) { var exported = S.Save.downloadJSON(S.State.current); U.notify(exported.ok ? "JSONを出力しました。" : exported.errors.join(" / "), exported.ok ? "" : "error"); return; }
    if (target.dataset.downloadReport !== undefined) { var reportResult = U.downloadPlayReport(); U.notify(reportResult.ok ? "プレイレポートを出力しました。" : reportResult.errors.join(" / "), reportResult.ok ? "" : "error"); return; }
    if (target.dataset.importSave !== undefined) { U.el("saveImportInput").click(); return; }
    if (target.dataset.deleteAutosave !== undefined) { var removed = S.Save.remove("autosave"); U.notify(removed.ok ? "オートセーブを削除しました。" : removed.errors.join(" / "), removed.ok ? "" : "error"); return; }
    if (target.dataset.goTitle !== undefined) { U.closeModal(); U.showTitle(); return; }
    if (target.dataset.newFromEnding !== undefined) { U.showNewGameSetup(); return; }
    if (target.dataset.openTactical !== undefined) { U.closeModal(); if (!S.Systems.BattleAdapter.openPending()) U.notify("再開できる会戦がありません", "error"); return; }
    if (target.dataset.debug) handleDebug(target.dataset.debug);
  });
  U.el("newGameButton").addEventListener("click", U.showNewGameSetup);
  U.el("helpButton").addEventListener("click", U.showHelpCenter);
  U.el("continueButton").addEventListener("click", function () {
    var loaded = S.Save.load("autosave"); if (!loaded.ok) { U.notify(loaded.errors.join(" / "), "error"); return; }
    U.showGame(); if (loaded.recovered) U.notify("破損を検出し、バックアップから復旧しました。"); else if (loaded.source !== "core-0.95") U.notify("旧セーブをCore v0.95へ移行しました。"); if (S.State.current.campaign.gameOver) U.showEnding(); else if (S.State.current.events && S.State.current.events.pendingTacticalBattle) S.Systems.BattleAdapter.openPending(); else if (S.Systems.Event.hasBlockingEvent(S.State.current)) U.showActiveEvent();
  });
  U.el("menuButton").addEventListener("click", U.showMenu); U.el("chronicleButton").addEventListener("click", U.showChronicle);
  U.el("nextSeasonButton").addEventListener("click", advanceSeason);
  U.el("modalCloseButton").addEventListener("click", function () { U.closeModal(); }); U.el("modalBackdrop").addEventListener("click", function (event) { if (event.target === U.el("modalBackdrop")) U.closeModal(); });
  U.el("saveImportInput").addEventListener("change", function (event) {
    var file = event.target.files && event.target.files[0]; if (!file) return; var reader = new FileReader();
    reader.onload = function () { var result = S.Save.importJSON(reader.result); if (result.ok) { U.notify("JSONセーブを読み込みました。"); U.closeModal(true); U.renderApp(); if (S.State.current.events && S.State.current.events.pendingTacticalBattle) S.Systems.BattleAdapter.openPending(); else if (S.Systems.Event.hasBlockingEvent(S.State.current)) U.showActiveEvent(); } else U.notify(result.errors.join(" / "), "error"); };
    reader.onerror = function () { U.notify("ファイルを読み込めません", "error"); }; reader.readAsText(file); event.target.value = "";
  });
  document.addEventListener("keydown", function (event) {
    if (U.handleModalKeydown && U.handleModalKeydown(event)) return;
    var tag = event.target && event.target.tagName ? event.target.tagName.toLowerCase() : "", typing = tag === "input" || tag === "select" || tag === "textarea" || event.target && event.target.isContentEditable;
    if (event.key === "Escape") { U.closeModal(); return; }
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "d") { event.preventDefault(); U.toggleDebug(); return; }
    if (typing || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === "?" || event.key === "/") { event.preventDefault(); U.showHelpCenter(); }
    else if (event.key.toLowerCase() === "m" && U.el("gameScreen").classList.contains("active")) { event.preventDefault(); U.showMenu(); }
    else if (event.key.toLowerCase() === "g" && U.el("gameScreen").classList.contains("active")) { event.preventDefault(); U.scrollToSection("guide"); }
  });
  S.State.current = S.State.createInitialState(); S.Save.captureRuntimeCheckpoint(S.State.current, "initial-state"); U.showTitle(); if (new URLSearchParams(window.location.search).get("debug") === "1") U.toggleDebug(true);

  if (typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("resize", function () { if (U.updateMobileCampaignMode) U.updateMobileCampaignMode(); });
    window.addEventListener("orientationchange", function () { if (U.updateMobileCampaignMode) setTimeout(U.updateMobileCampaignMode, 80); });
  }
})(window.Sengoku);
