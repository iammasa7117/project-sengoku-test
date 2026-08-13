"use strict";
var fs = require("fs"), path = require("path"), root = path.resolve(__dirname, ".."), passed = 0, failed = 0;
function read(file) { return fs.readFileSync(path.join(root, file), "utf8"); }
function exists(file) { return fs.existsSync(path.join(root, file)); }
function check(name, condition) { if (condition) { passed += 1; process.stdout.write("PASS " + name + "\n"); } else { failed += 1; process.stderr.write("FAIL " + name + "\n"); } }
var index = read("index.html"), testHtml = read("tests/test.html"), phase1Html = read("tests/v1Phase1Test.html"), phase2Html = read("tests/v1Phase2Test.html"), phase3Html = read("tests/v1Phase3Test.html"), release = read("src/systems/releaseSystem.js"), difficulty = read("src/data/difficulties.js"), ai = read("src/systems/aiSystem.js"), battle = read("src/systems/battleSystem.js"), turn = read("src/systems/turnSystem.js"), modal = read("src/ui/renderModals.js"), debug = read("src/ui/debugPanel.js"), components = read("styles/components.css"), responsive = read("styles/responsive.css"), schema = read("src/config/constants.js"), nodeHarness = read("tests/nodeHarness.js");
check("current release title and visible label", index.indexOf("Project Sengoku — Strategic Campaign v0.3") >= 0 && index.indexOf("PHASE 7") >= 0);
check("release system loaded", index.indexOf('src/systems/releaseSystem.js') >= 0);
check("release system loads before battle and AI", index.indexOf('src/systems/releaseSystem.js') < index.indexOf('src/systems/battleSystem.js') && index.indexOf('src/systems/releaseSystem.js') < index.indexOf('src/systems/aiSystem.js'));
check("node harness loads release system", nodeHarness.indexOf('src/systems/releaseSystem.js') >= 0);
check("difficulty opening protection", difficulty.indexOf("openingProtectionTurns") >= 0 && difficulty.indexOf("openingDefenseModifier") >= 0);
check("difficulty action profiles", difficulty.indexOf("extraActionChance") >= 0 && difficulty.indexOf("aiCommitRatio") >= 0);
check("anti snowball economy", release.indexOf("dominantEconomyModifier") >= 0 && read("src/systems/domesticSystem.js").indexOf("aiEconomyMultiplier") >= 0);
check("underdog recovery", release.indexOf("trailingRecruitModifier") >= 0 && ai.indexOf("aiRecruitMultiplier") >= 0);
check("dynamic attack threshold", release.indexOf("stagnationThresholdReductionPerSeason") >= 0 && ai.indexOf("attackThreshold") >= 0);
check("player attack cap", ai.indexOf("playerAttackLimit") >= 0 && ai.indexOf("avoidFactionId") >= 0);
check("battle release modifier", battle.indexOf('battleModifier(state') >= 0);
check("capture morale stabilization", read("src/systems/siegeSystem.js").indexOf("target.morale = Math.max(45") >= 0);
check("ending summary", modal.indexOf("ending-stats") >= 0 && modal.indexOf("プレイレポート") >= 0);
check("play report v1.0", modal.indexOf("Core v1.0 プレイレポート") >= 0 && modal.indexOf("経過季節") >= 0);
check("debug release snapshot", debug.indexOf("releaseSnapshot") >= 0);
check("final responsive readability", components.indexOf("overflow-wrap: anywhere") >= 0 && responsive.indexOf(".ending-stats") >= 0);
check("save schema remains playable-loop v12", schema.indexOf("SCHEMA_VERSION = 12") >= 0 && schema.indexOf('GAME_VERSION = "core-0.95"') >= 0);
check("release documents exist", exists("docs/RELEASE_GUIDE.md") && exists("docs/BALANCE_NOTES.md") && exists("RELEASE_CHECKLIST.md"));
check("release test files exist", exists("tests/v1Phase3Tests.js") && exists("tests/releaseSimulation.js"));
check("release DOM test files exist", exists("tests/v1Phase3DomHarness.js") && exists("tests/v1Phase3DomTests.js") && exists("tests/v1Phase3Test.html"));
check("all browser test pages load release system", [testHtml, phase1Html, phase2Html, phase3Html].every(function (html) { return html.indexOf("src/systems/releaseSystem.js") >= 0; }));
check("no external dependencies", !/https?:\/\//.test(index + release) && !/\bfetch\s*\(/.test(release));
check("no eval or new Function", !/\beval\s*\(|new Function/.test(release + ai + battle));
check("no ES modules", !/\bimport\s+|\bexport\s+/.test(release));
process.stdout.write(passed + " / " + (passed + failed) + " v1 Phase 3 static checks PASS\n");
if (failed) process.exitCode = 1;
