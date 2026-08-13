"use strict";
var fs = require("fs"), path = require("path"), root = path.resolve(__dirname, "..");
function read(file) { return fs.readFileSync(path.join(root, file), "utf8"); }
var checks = [
  ["schema version is 12", read("src/config/constants.js").indexOf("SCHEMA_VERSION = 12") >= 0 && read("src/state/schema.js").indexOf("schemaVersion: 12") >= 0],
  ["v11 migration exists", read("src/state/migrateState.js").indexOf("function migrateV11") >= 0],
  ["population validation exists", read("src/state/validateState.js").indexOf("城人口が不正") >= 0],
  ["agriculture validation exists", read("src/state/validateState.js").indexOf("城農業が不正") >= 0],
  ["season economy is centralized", read("src/systems/turnSystem.js").indexOf("processSeasonEconomy") >= 0],
  ["cultivation command is wired", read("src/main.js").indexOf('action === "cultivate"') >= 0 && read("src/ui/renderOfficers.js").indexOf('data-command=\\"cultivate\\"') >= 0],
  ["castle detail displays population", read("src/ui/renderOfficers.js").indexOf("徴兵上限") >= 0 && read("src/ui/renderOfficers.js").indexOf("季節の兵糧") >= 0],
  ["army UI displays upkeep", read("src/ui/renderArmy.js").indexOf("季節維持費") >= 0 && read("src/ui/renderArmy.js").indexOf("armyUpkeepGoldDivisor") >= 0],
  ["mobile economy cards exist", read("styles/responsive.css").indexOf("Phase 3 Domestic MVP") >= 0 && read("styles/components.css").indexOf("domestic-economy-strip") >= 0],
  ["PWA remains landscape", read("manifest.webmanifest").indexOf('"orientation": "landscape"') >= 0]
];
var failed = checks.filter(function (item) { return !item[1]; });
checks.forEach(function (item) { process.stdout.write((item[1] ? "PASS " : "FAIL ") + item[0] + "\n"); });
process.stdout.write((checks.length - failed.length) + " / " + checks.length + " PASS\n");
if (failed.length) process.exitCode = 1;
