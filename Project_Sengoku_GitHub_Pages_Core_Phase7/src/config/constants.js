(function (S) {
  "use strict";
  S.Config.SCHEMA_VERSION = 12;
  S.Config.GAME_VERSION = "core-0.95";
  S.Config.SEASONS = ["春", "夏", "秋", "冬"];
  S.Config.MIN_GARRISON = 8;
  S.Config.MIN_ATTACK_FORCE = 10;
  S.Config.DEFAULT_COMMIT_RATIO = 0.6;
  S.Config.EVENT_TRIGGERS = Object.freeze({
    CAMPAIGN_START: "campaign_start",
    SEASON_START: "season_start",
    SEASON_STARTED: "season_start",
    SEASON_END: "season_end",
    BATTLE_START: "battle_start",
    BATTLE_END: "battle_end",
    CASTLE_CAPTURED: "castle_captured",
    OFFICER_LOYALTY_CHANGED: "officer_loyalty_changed",
    OFFICER_DEFECTED: "officer_defected",
    DIPLOMACY_CHANGED: "diplomacy_changed",
    FACTION_ELIMINATED: "faction_eliminated"
  });
  S.Config.DEFAULT_EVENT_RNG_SEED = 1597463007;
  S.Config.SAVE_KEYS = {
    autosave: "project_sengoku_core_v095_autosave",
    manual1: "project_sengoku_core_v095_manual_1",
    manual2: "project_sengoku_core_v095_manual_2",
    manual3: "project_sengoku_core_v095_manual_3"
  };
  S.Config.LEGACY_SAVE_KEYS = [
    "project_sengoku_core_v09_autosave",
    "project_sengoku_core_v09_manual_1",
    "project_sengoku_core_v09_manual_2",
    "project_sengoku_core_v09_manual_3",
    "project_sengoku_core_v08_autosave",
    "project_sengoku_core_v08_manual_1",
    "project_sengoku_core_v08_manual_2",
    "project_sengoku_core_v08_manual_3",
    "project_sengoku_core_autosave",
    "project_sengoku_core_manual_1",
    "project_sengoku_core_manual_2",
    "project_sengoku_core_manual_3",
    "ps_rebuild_alpha_v06_rival_drama",
    "ps_rebuild_alpha_v05_loyalty_drama",
    "ps_rebuild_alpha_v04_battle_drama",
    "ps_rebuild_alpha_v03_retainer_drama",
    "ps_rebuild_alpha_v02_short_campaign"
  ];
  S.Config.ALLOWED_OFFICER_STATUS = ["active", "prisoner", "ronin"];
})(window.Sengoku);
