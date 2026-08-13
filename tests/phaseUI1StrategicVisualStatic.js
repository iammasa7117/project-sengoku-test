"use strict";
var fs = require("fs"), path = require("path"), root = path.resolve(__dirname, "..");
function read(file) { return fs.readFileSync(path.join(root, file), "utf8"); }
function exists(file) { return fs.existsSync(path.join(root, file)); }
var html = read("index.html"), visual = read("src/ui/strategicVisual.js"), css = read("styles/strategicVisual.css"), main = read("src/main.js"), dom = read("src/ui/dom.js");
var checks = [
  ["UI-1 title marker", /Strategic Visual UI-1/.test(html)],
  ["strategic visual stylesheet loaded", /styles\/strategicVisual\.css/.test(html)],
  ["strategic visual module loaded", /src\/ui\/strategicVisual\.js/.test(html)],
  ["castle overview override exists", /U\.renderCastleDetail\s*=/.test(visual)],
  ["domestic visual screen exists", /U\.showDomesticVisual/.test(visual)],
  ["retainer visual roster exists", /U\.showRetainers/.test(visual)],
  ["recruitment visual screen exists", /U\.showRecruitmentVisual/.test(visual)],
  ["main routes domestic visual button", /openDomesticScreen/.test(main)],
  ["main routes recruitment visual button", /openRecruitmentScreen/.test(main)],
  ["modal class option supported", /options\.modalClass/.test(dom)],
  ["castle temporary art exists", exists("assets/ui/castle-hero.svg")],
  ["officer temporary art exists", exists("assets/ui/portrait-lord.svg")],
  ["command temporary art exists", exists("assets/ui/command-farm.svg")],
  ["mobile landscape visual rules exist", /orientation:landscape/.test(css)]
];
var fail = checks.filter(function (c) { console.log((c[1] ? "PASS " : "FAIL ") + c[0]); return !c[1]; });
console.log((checks.length - fail.length) + " / " + checks.length + " PASS");
if (fail.length) process.exitCode = 1;
