(function (S) {
  "use strict";
  var seasonEvents = [
    {
      id: "autumn_harvest", trigger: S.Config.EVENT_TRIGGERS.SEASON_START, category: "season", blocking: false, once: false, priority: 10, chance: 1,
      kicker: "SEASON EVENT", title: "秋の収穫", body: "領内の収穫が兵糧庫を満たしました。", message: "秋の収穫で兵糧{{value.amount}}を得ました。",
      conditions: [{ type: "seasonIn", values: [2] }, { type: "playerCastleCountAtLeast", value: 1 }],
      choices: [{ id: "auto", label: "確認", fallback: true, resultText: "秋の収穫で兵糧{{value.amount}}を得ました。", effects: [
        { type: "campaignResource", resource: "food", operation: "add", formula: { base: 18, perPlayerCastle: 5 }, storeAs: "amount" },
        { type: "addLog", text: "秋の収穫で兵糧{{value.amount}}を得ました。", logType: "major" },
        { type: "addChronicle", text: "秋の収穫で兵糧{{value.amount}}を得ました。" }
      ] }]
    },
    {
      id: "winter_hardship", trigger: S.Config.EVENT_TRIGGERS.SEASON_START, category: "season", blocking: false, once: false, priority: 20, chance: 0.45,
      kicker: "SEASON EVENT", title: "厳しい冬", body: "寒波が{{castle.name}}の守備隊を疲弊させました。", message: "厳しい冬により{{castle.name}}の士気が低下しました。",
      conditions: [{ type: "seasonIn", values: [3] }, { type: "playerCastleCountAtLeast", value: 1 }], selectors: { castle: { type: "randomPlayerCastle" } },
      choices: [{ id: "auto", label: "確認", fallback: true, resultText: "厳しい冬により{{castle.name}}の士気が低下しました。", effects: [
        { type: "castleMorale", target: "castle", operation: "add", amount: -8, minimum: 35 },
        { type: "addLog", text: "厳しい冬により{{castle.name}}の士気が低下しました。", logType: "major" },
        { type: "addChronicle", text: "厳しい冬により{{castle.name}}の士気が低下しました。" }
      ] }]
    },
    {
      id: "summer_merchants", trigger: S.Config.EVENT_TRIGGERS.SEASON_START, category: "season", blocking: false, once: false, priority: 30, chance: 0.4,
      kicker: "SEASON EVENT", title: "商人の来訪", body: "領内を訪れた商人が軍資金を献上しました。", message: "商人が訪れ、軍資金{{value.amount}}を献上しました。",
      conditions: [{ type: "seasonIn", values: [1] }, { type: "playerCastleCountAtLeast", value: 1 }],
      choices: [{ id: "auto", label: "確認", fallback: true, resultText: "商人が訪れ、軍資金{{value.amount}}を献上しました。", effects: [
        { type: "campaignResource", resource: "gold", operation: "add", formula: { base: 15, perPlayerCastle: 0 }, storeAs: "amount" },
        { type: "addLog", text: "商人が訪れ、軍資金{{value.amount}}を献上しました。", logType: "major" },
        { type: "addChronicle", text: "商人が訪れ、軍資金{{value.amount}}を献上しました。" }
      ] }]
    }
  ];
  var openingEvents = [{
    id: "owari_opening_council", trigger: S.Config.EVENT_TRIGGERS.CAMPAIGN_START, category: "opening", blocking: true, once: true, priority: 10, chance: 1,
    kicker: "OPENING COUNCIL", title: "最初の一手", body: "{{castle.name}}から鳴海砦へ進む策を選んでください。", message: "最初の軍議が始まりました。",
    conditions: [{ type: "scenarioIs", value: "owari_short" }],
    selectors: {
      faction: { type: "playerFaction" }, castle: { type: "castleById", id: "kiyosu" },
      standardOfficer: { type: "officerById", id: "keiketsu" }, nightOfficer: { type: "officerById", id: "soma" }, assaultOfficer: { type: "officerById", id: "kanenobu" }
    },
    choices: [
      { id: "standard", label: "正攻法", speakerTarget: "standardOfficer", resultText: "{{standardOfficer.name}}の正攻法を採用しました。", effects: [{ type: "requestBattlePlanner", sourceTarget: "castle", targetId: "narumi", opening: true, preset: { tacticId: "standard", commanderId: "keiketsu" } }] },
      { id: "night", label: "夜襲", speakerTarget: "nightOfficer", resultText: "{{nightOfficer.name}}の夜襲策を採用しました。", effects: [{ type: "requestBattlePlanner", sourceTarget: "castle", targetId: "narumi", opening: true, preset: { tacticId: "night", commanderId: "soma" } }] },
      { id: "assault", label: "強襲", speakerTarget: "assaultOfficer", resultText: "{{assaultOfficer.name}}の強襲策を採用しました。", effects: [{ type: "requestBattlePlanner", sourceTarget: "castle", targetId: "narumi", opening: true, preset: { tacticId: "assault", commanderId: "kanenobu" } }] }
    ]
  }];
  var seasonPack = { id: "core_season_events", name: "Core Season Events", version: "2.0.0", enabledByDefault: true, events: seasonEvents };
  var openingPack = { id: "core_opening_events", name: "Core Opening Events", version: "1.0.0", enabledByDefault: true, events: openingEvents };
  S.Data.ContentPackRegistry = {
    packs: { core_season_events: seasonPack, core_opening_events: openingPack },
    order: ["core_season_events", "core_opening_events"], triggerIndex: {}
  };
  S.Data.contentPackRegistry = S.Data.ContentPackRegistry;
  S.Data.ContentPacks = S.Data.ContentPackRegistry;
  S.Data.contentPacks = [seasonPack, openingPack];
  S.Data.events = seasonEvents;
})(window.Sengoku);
