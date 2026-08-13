"use strict";
var fs = require("fs"), path = require("path"), root = path.resolve(__dirname, ".."), passed = 0, failed = 0;
function check(name, condition) { if (condition) { passed += 1; process.stdout.write("PASS " + name + "\n"); } else { failed += 1; process.stderr.write("FAIL " + name + "\n"); } }
var save = fs.readFileSync(path.join(root, "src/save/saveSystem.js"), "utf8");
var modal = fs.readFileSync(path.join(root, "src/ui/renderModals.js"), "utf8");
var main = fs.readFileSync(path.join(root, "src/main.js"), "utf8");
var dom = fs.readFileSync(path.join(root, "src/ui/dom.js"), "utf8");
check("checksum envelope", save.indexOf('ENVELOPE_FORMAT = "project-sengoku-save"') >= 0 && save.indexOf("checksum(JSON.stringify(parsed.state))") >= 0);
check("3 generation backups", save.indexOf("BACKUP_GENERATIONS = 3") >= 0 && save.indexOf("rotateBackups") >= 0);
check("staging verified write", save.indexOf('"__staging"') >= 0 && save.indexOf("verifyWrite") >= 0);
check("load fallback candidates", save.indexOf("findValidCandidate") >= 0 && save.indexOf('kind: "backup"') >= 0);
check("runtime checkpoint", save.indexOf("captureRuntimeCheckpoint") >= 0 && save.indexOf("restoreRuntimeCheckpoint") >= 0);
check("save recovery UI", modal.indexOf("data-restore-save-slot") >= 0 && modal.indexOf("破損検出") >= 0);
check("restore action handler", main.indexOf("restoreBackup") >= 0 && main.indexOf("loaded.recovered") >= 0);
check("invalid autosave recovery", dom.indexOf('saved.code === "validation_failed"') >= 0 && dom.indexOf("restoreRuntimeCheckpoint") >= 0);
check("no cloud or network persistence", !/\bfetch\s*\(|XMLHttpRequest|indexedDB|WebSocket/.test(save));
process.stdout.write(passed + " / " + (passed + failed) + " v1 Phase 1 static checks PASS\n");
if (failed) process.exitCode = 1;
