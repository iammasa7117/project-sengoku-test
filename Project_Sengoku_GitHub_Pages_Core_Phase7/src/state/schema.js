(function (S) {
  "use strict";
  S.State.schema = {
    schemaVersion: 12,
    gameVersion: "core-0.95",
    required: ["meta", "campaign", "factions", "castles", "officers", "units", "armies", "relationships", "diplomacy", "prisoners", "rivalries", "events", "chronicle", "settings", "debug"]
  };

  S.State.createUXSettings = function () {
    return {
      tutorial: {
        enabled: true,
        completed: false,
        dismissed: false,
        milestones: {
          gameStarted: false,
          castleSelected: false,
          commandUsed: false,
          seasonAdvanced: false,
          menuOpened: false
        }
      },
      ui: {
        largeText: false,
        highContrast: false,
        reducedMotion: false
      }
    };
  };
  S.State.upgradeUXSettings = function (settings) {
    var item = settings && typeof settings === "object" && !Array.isArray(settings) ? settings : {};
    var defaults = S.State.createUXSettings();
    if (typeof item.aiEnabled !== "boolean") item.aiEnabled = true;
    if (typeof item.autosave !== "boolean") item.autosave = true;
    if (typeof item.sound !== "boolean") item.sound = false;
    if (!item.tutorial || typeof item.tutorial !== "object" || Array.isArray(item.tutorial)) item.tutorial = {};
    if (typeof item.tutorial.enabled !== "boolean") item.tutorial.enabled = defaults.tutorial.enabled;
    if (typeof item.tutorial.completed !== "boolean") item.tutorial.completed = defaults.tutorial.completed;
    if (typeof item.tutorial.dismissed !== "boolean") item.tutorial.dismissed = defaults.tutorial.dismissed;
    if (!item.tutorial.milestones || typeof item.tutorial.milestones !== "object" || Array.isArray(item.tutorial.milestones)) item.tutorial.milestones = {};
    Object.keys(defaults.tutorial.milestones).forEach(function (key) {
      if (typeof item.tutorial.milestones[key] !== "boolean") item.tutorial.milestones[key] = false;
    });
    if (!item.ui || typeof item.ui !== "object" || Array.isArray(item.ui)) item.ui = {};
    Object.keys(defaults.ui).forEach(function (key) {
      if (typeof item.ui[key] !== "boolean") item.ui[key] = defaults.ui[key];
    });
    return item;
  };

  S.State.createOfficerProfile = function () {
    return { personalityIds: [], traitIds: [], tags: [] };
  };
  S.State.createEventEngineState = function (seed) {
    var normalizedSeed = Number.isInteger(seed) ? seed >>> 0 : S.Config.DEFAULT_EVENT_RNG_SEED >>> 0;
    var registry = S.Data.ContentPackRegistry || { packs: {}, order: [] };
    var enabledPackIds = registry.order.filter(function (id) { return registry.packs[id] && registry.packs[id].enabledByDefault !== false; });
    return {
      enabledPackIds: enabledPackIds,
      onceKeys: {},
      cooldowns: {},
      firedEventIds: {},
      instanceKeys: {},
      nextInstanceId: 1,
      activeEvent: null,
      queue: [],
      pendingInteraction: null,
      variables: {},
      counters: {},
      arcs: {},
      diagnostics: [],
      emissionCount: 0,
      lastTrigger: null,
      history: [],
      emissions: [],
      metrics: { matchedEvents: 0, queuedEvents: 0, automaticResolutions: 0, aiChoiceDistribution: {}, arcStarts: 0, arcCompletions: 0, maxQueueLength: 0, maxChainDepth: 0 },
      rng: { seed: normalizedSeed, state: normalizedSeed, calls: 0 }
    };
  };
  S.State.upgradeEventEngineState = function (engine) {
    var defaults = S.State.createEventEngineState(engine && engine.rng && engine.rng.seed), item = engine && typeof engine === "object" && !Array.isArray(engine) ? engine : {};
    if (!Array.isArray(item.enabledPackIds)) item.enabledPackIds = defaults.enabledPackIds.slice();
    if (!Array.isArray(item.emissions)) item.emissions = Array.isArray(item.history) && item.history.some(function (entry) { return entry && entry.eventIds; }) ? item.history.slice() : [];
    if (!Array.isArray(item.history) || item.history.some(function (entry) { return entry && entry.eventIds; })) item.history = [];
    Object.keys(defaults).forEach(function (key) { if (item[key] === undefined || item[key] === null && defaults[key] !== null) item[key] = S.Util.deepClone(defaults[key]); });
    defaults.enabledPackIds.forEach(function (packId) { if (item.enabledPackIds.indexOf(packId) < 0) item.enabledPackIds.push(packId); });
    if (item.activeEvent && !Number.isInteger(item.activeEvent.chainDepth)) item.activeEvent.chainDepth = 1;
    (item.queue || []).forEach(function (instance) { if (!Number.isInteger(instance.chainDepth)) instance.chainDepth = 1; });
    return item;
  };
})(window.Sengoku);
