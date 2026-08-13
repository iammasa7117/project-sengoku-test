(function (global) {
  "use strict";
  var tests = [];
  function test(name, callback) { tests.push({ name: name, callback: callback }); }
  function assert(condition, message) { if (!condition) throw new Error(message || "Assertion failed"); }
  function equal(actual, expected, message) { if (actual !== expected) throw new Error((message || "値が一致しません") + "（actual: " + actual + ", expected: " + expected + "）"); }
  function run() {
    var root = document.getElementById("results"), passed = 0;
    root.innerHTML = "";
    var selected = global.SengokuTestFilter ? tests.filter(function (item) { global.SengokuTestFilter.lastIndex = 0; return global.SengokuTestFilter.test(item.name); }) : tests;
    selected.forEach(function (item, index) {
      var card = document.createElement("div");
      try {
        item.callback();
        passed += 1;
        card.className = "test pass";
        card.innerHTML = "<strong>PASS " + (index + 1) + ". " + item.name + "</strong>";
      } catch (error) {
        card.className = "test fail";
        card.innerHTML = "<strong>FAIL " + (index + 1) + ". " + item.name + "</strong><small>" + String(error && (error.stack || error.message) || error) + "</small>";
      }
      root.appendChild(card);
    });
    var summary = document.getElementById("summary");
    summary.textContent = passed + " / " + selected.length + " PASS";
    summary.className = passed === selected.length ? "pass" : "fail";
    document.title = passed === selected.length ? "PASS — Sengoku Core Tests" : "FAIL — Sengoku Core Tests";
    global.SengokuTestResults = { passed: passed, total: selected.length, ok: passed === selected.length };
  }
  global.SengokuTest = { test: test, assert: assert, equal: equal, run: run };
})(window);
