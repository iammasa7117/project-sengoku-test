"use strict";
var fs = require("fs"), path = require("path"), root = path.resolve(__dirname, "..");
function read(file) { return fs.readFileSync(path.join(root, file), "utf8"); }
var checks = [
  ["index has armyLayer", read("index.html").indexOf('id="armyLayer"') >= 0],
  ["index loads renderArmy", read("index.html").indexOf('src/ui/renderArmy.js') >= 0],
  ["regular attack opens mobile Army planner", read("src/main.js").indexOf('U.showArmyPlanner(S.State.current.campaign.selectedCastleId)') >= 0],
  ["season flow surfaces Army battle report", read("src/main.js").indexOf('armyActions') >= 0 && read("src/main.js").indexOf('U.showBattleReport') >= 0],
  ["map renders Army markers", read("src/ui/renderMap.js").indexOf('army-marker') >= 0],
  ["mobile Army builder exists", read("src/ui/renderArmy.js").indexOf('army-unit-builder') >= 0],
  ["touch targets remain mobile sized", read("styles/responsive.css").indexOf('min-height: 46px') >= 0],
  ["landscape safe area included", read("styles/responsive.css").indexOf('env(safe-area-inset-left)') >= 0]
];
var failed = checks.filter(function (item) { return !item[1]; });
checks.forEach(function (item) { process.stdout.write((item[1] ? "PASS " : "FAIL ") + item[0] + "\n"); });
process.stdout.write((checks.length - failed.length) + " / " + checks.length + " PASS\n");
if (failed.length) process.exitCode = 1;
