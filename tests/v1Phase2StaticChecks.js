"use strict";
var fs = require("fs"), path = require("path"), root = path.resolve(__dirname, ".."), passed = 0, failed = 0;
function read(file) { return fs.readFileSync(path.join(root, file), "utf8"); }
function check(name, condition) { if (condition) { passed += 1; process.stdout.write("PASS " + name + "\n"); } else { failed += 1; process.stderr.write("FAIL " + name + "\n"); } }
var index = read("index.html"), uxSystem = read("src/systems/uxSystem.js"), ux = read("src/ui/uxGuide.js"), main = read("src/main.js"), schema = read("src/state/schema.js"), migrate = read("src/state/migrateState.js"), validate = read("src/state/validateState.js"), dom = read("src/ui/dom.js"), responsive = read("styles/responsive.css"), components = read("styles/components.css"), base = read("styles/base.css"), map = read("src/ui/renderMap.js"), officers = read("src/ui/renderOfficers.js");
check("ux system and guide loaded", index.indexOf('src/systems/uxSystem.js') >= 0 && index.indexOf('src/ui/uxGuide.js') >= 0 && ux.indexOf("S.Systems.UX") >= 0 && uxSystem.indexOf("markMilestone") >= 0);
check("guide panel exists", index.indexOf('id="guidePanel"') >= 0 && index.indexOf('aria-live="polite"') >= 0);
check("mobile navigation exists", index.indexOf('id="mobileNav"') >= 0 && (index.match(/data-mobile-nav=/g) || []).length === 5);
check("help entry on title", index.indexOf('id="helpButton"') >= 0);
check("skip link", index.indexOf('class="skip-link"') >= 0 && base.indexOf('.skip-link:focus') >= 0);
check("tutorial and ui defaults", schema.indexOf("createUXSettings") >= 0 && schema.indexOf("largeText") >= 0 && schema.indexOf("gameStarted") >= 0);
check("schema10 migration upgrades ux", migrate.indexOf("upgradeUXSettings(clone.settings)") >= 0);
check("ux settings validated", validate.indexOf("チュートリアル設定が不正です") >= 0 && validate.indexOf("表示設定が不正です") >= 0);
check("context recommendation", ux.indexOf("getGuideRecommendation") >= 0 && ux.indexOf('action: "end-turn"') >= 0 && ux.indexOf('action: "proposals"') >= 0);
check("help and glossary", ux.indexOf("showHelpCenter") >= 0 && ux.indexOf("戦争疲弊") >= 0 && ux.indexOf("キーボード操作") >= 0);
check("accessibility settings", ux.indexOf("showUXSettings") >= 0 && ux.indexOf("highContrast") >= 0 && ux.indexOf("reducedMotion") >= 0);
check("focus trap and restore", dom.indexOf("handleModalKeydown") >= 0 && dom.indexOf("modalReturnFocus") >= 0);
check("keyboard shortcuts", main.indexOf('event.key.toLowerCase() === "m"') >= 0 && main.indexOf('event.key.toLowerCase() === "g"') >= 0);
check("mobile tap targets", responsive.indexOf("min-height: 44px") >= 0 && responsive.indexOf("safe-area-inset-bottom") >= 0);
check("mobile map scroll", index.indexOf("map-scroll-shell") >= 0 && responsive.indexOf("width: 760px") >= 0);
check("preference body classes", base.indexOf("body.large-text") >= 0 && base.indexOf("body.high-contrast") >= 0 && base.indexOf("body.reduced-motion") >= 0);
check("castle aria labels", map.indexOf('setAttribute("aria-label"') >= 0 && map.indexOf('setAttribute("aria-pressed"') >= 0);
check("officer is keyboard button", officers.indexOf('<button type="button" class="officer-line"') >= 0);
check("no external dependencies", !/https?:\/\//.test(index) && !/\bfetch\s*\(/.test(ux));
check("no eval", !/\beval\s*\(|new Function/.test(ux + main));
process.stdout.write(passed + " / " + (passed + failed) + " v1 Phase 2 static checks PASS\n");
if (failed) process.exitCode = 1;
