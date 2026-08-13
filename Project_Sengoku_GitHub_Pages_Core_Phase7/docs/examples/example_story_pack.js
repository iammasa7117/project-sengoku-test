(function (S) {
  "use strict";
  // TEMP CONTENT: Core system verification data.
  // This example is disabled and is not referenced by index.html or tests/test.html.
  var pack = {
    id: "example_story_pack", name: "Disabled Story Pack Example", version: "1.0.0", enabledByDefault: false,
    events: [
      {
        id: "example_story.start", trigger: S.Config.EVENT_TRIGGERS.DIPLOMACY_CHANGED, blocking: true, once: true, priority: 10, chance: 1,
        title: "Example Start", body: "{{officer.name}} receives a verification task.", conditions: [],
        selectors: { officer: { type: "highestStatOfficer", factionId: "aotsuki", stat: "politics" } }, fallbackChoiceId: "decline",
        choices: [
          { id: "accept", label: "Accept", aiWeight: 2, resultText: "Accepted.", nextEventId: "example_story.followup", effects: [{ type: "setFlag", flag: "exampleStoryAccepted", value: true }, { type: "addCounter", counter: "exampleStoryProgress", amount: 1 }, { type: "startArc", arcId: "example_story.arc" }] },
          { id: "decline", label: "Decline", fallback: true, aiWeight: 1, resultText: "Declined.", effects: [{ type: "setFlag", flag: "exampleStoryDeclined", value: true }] }
        ]
      },
      {
        id: "example_story.followup", trigger: S.Config.EVENT_TRIGGERS.DIPLOMACY_CHANGED, blocking: true, once: true, priority: 20, chance: 1,
        title: "Example Follow-up", body: "The verification chain concludes.", conditions: [{ type: "eventFlag", flag: "exampleStoryAccepted", value: true }], selectors: {},
        choices: [{ id: "complete", label: "Complete", fallback: true, resultText: "Completed.", effects: [{ type: "officerRelationship", aId: "keiketsu", bId: "soma", amount: 1 }, { type: "advanceArc", arcId: "example_story.arc" }, { type: "completeArc", arcId: "example_story.arc" }] }]
      }
    ],
    arcs: [{ id: "example_story.arc", name: "Example Verification Arc", description: "Disabled authoring example.", startEventId: "example_story.start", initialStep: "start", steps: { start: { nextStep: "finish" }, finish: {} }, completionConditions: [{ type: "eventCounter", counter: "exampleStoryProgress", operator: ">=", value: 1 }], failureConditions: [] }]
  };
  S.Systems.Event.registerContentPack(pack);
})(window.Sengoku);
