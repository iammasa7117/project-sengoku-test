(function (S) {
  "use strict";
  // Extension registries intentionally ship empty. Content packs may register data-only definitions.
  S.Data.PersonalityRegistry = { definitions: {}, order: [] };
  S.Data.TraitRegistry = { definitions: {}, order: [] };
  S.Data.StoryArcRegistry = { definitions: {}, order: [], manualDefinitions: {} };
})(window.Sengoku);
