(function (S, T) {
  "use strict";
  function fresh(options) { return S.State.createInitialState(options); }
  function battlePlan(overrides) {
    return Object.assign({
      sourceId: "kiyosu", targetId: "narumi", commanderId: "keiketsu", deputyId: "soma",
      tacticId: "standard", decisionId: "trust", committedTroops: 40,
      attackerFactionId: "aotsuki", defenderFactionId: "tokizawa"
    }, overrides || {});
  }
  function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }

  T.test("Phase0: resolveLegacy/applyOutcome APIが存在", function () {
    T.equal(typeof S.Systems.Battle.resolveLegacy, "function");
    T.equal(typeof S.Systems.Battle.applyOutcome, "function");
    T.equal(typeof S.Systems.Battle.resolve, "function");
  });

  T.test("Phase0: resolveLegacyはstateを変更しない", function () {
    var state = fresh();
    T.assert(S.Systems.Battle.plan(state, battlePlan()).ok);
    var before = JSON.stringify(state);
    var resolved = S.Systems.Battle.resolveLegacy(state, { forceWin: true, random: rng(7) });
    T.assert(resolved.ok, resolved.errors && resolved.errors.join(" / "));
    T.equal(JSON.stringify(state), before);
  });

  T.test("Phase0: Legacy BattleOutcomeの共通フィールド", function () {
    var state = fresh();
    T.assert(S.Systems.Battle.plan(state, battlePlan()).ok);
    var resolved = S.Systems.Battle.resolveLegacy(state, { forceWin: true, random: rng(9) });
    var o = resolved.outcome;
    T.equal(o.mode, "legacy");
    T.equal(o.attackerFactionId, "aotsuki");
    T.equal(o.defenderFactionId, "tokizawa");
    T.equal(o.winnerFactionId, "aotsuki");
    T.equal(o.loserFactionId, "tokizawa");
    T.equal(o.targetCastleId, "narumi");
    T.equal(o.castleCaptured, true);
    T.assert(Array.isArray(o.capturedOfficerIds));
    T.assert(Array.isArray(o.retreatedOfficerIds));
    T.assert(Array.isArray(o.destroyedUnitIds));
    T.equal(o.durationTicks, 0);
  });

  T.test("Phase0: resolveラッパーと二段階呼出しが完全同値", function () {
    var prepared = fresh();
    T.assert(S.Systems.Battle.plan(prepared, battlePlan()).ok);
    var wrappedState = S.Util.deepClone(prepared), splitState = S.Util.deepClone(prepared);
    var wrapped = S.Systems.Battle.resolve(wrappedState, { forceWin: true, random: rng(1234) });
    var calculated = S.Systems.Battle.resolveLegacy(splitState, { forceWin: true, random: rng(1234) });
    T.assert(calculated.ok, calculated.errors && calculated.errors.join(" / "));
    var applied = S.Systems.Battle.applyOutcome(splitState, calculated.plan, calculated.outcome);
    T.assert(wrapped.ok && applied.ok);
    T.equal(JSON.stringify(splitState), JSON.stringify(wrappedState));
    T.equal(JSON.stringify(applied), JSON.stringify(wrapped));
  });

  T.test("Phase0: 敗北でもresolveラッパーと二段階呼出しが完全同値", function () {
    var prepared = fresh();
    T.assert(S.Systems.Battle.plan(prepared, battlePlan({ tacticId: "assault" })).ok);
    var wrappedState = S.Util.deepClone(prepared), splitState = S.Util.deepClone(prepared);
    var wrapped = S.Systems.Battle.resolve(wrappedState, { forceWin: false, random: rng(4567) });
    var calculated = S.Systems.Battle.resolveLegacy(splitState, { forceWin: false, random: rng(4567) });
    var applied = S.Systems.Battle.applyOutcome(splitState, calculated.plan, calculated.outcome);
    T.assert(wrapped.ok && calculated.ok && applied.ok);
    T.equal(JSON.stringify(splitState), JSON.stringify(wrappedState));
    T.equal(JSON.stringify(applied), JSON.stringify(wrapped));
  });

  T.test("Phase0: resolveLegacyの外交エラーはpure、resolveは従来通りpendingを解除", function () {
    var prepared = fresh();
    T.assert(S.Systems.Battle.plan(prepared, battlePlan()).ok);
    T.assert(S.Systems.Diplomacy.makePeace(prepared, "aotsuki", "tokizawa", { forceAccept: true }).ok);
    var pureState = S.Util.deepClone(prepared), wrappedState = S.Util.deepClone(prepared);
    var pure = S.Systems.Battle.resolveLegacy(pureState, {});
    T.equal(pure.ok, false);
    T.assert(Boolean(pureState.events.pendingBattle));
    var wrapped = S.Systems.Battle.resolve(wrappedState, {});
    T.equal(wrapped.ok, false);
    T.equal(wrappedState.events.pendingBattle, null);
  });

  T.test("Phase0: applyOutcome後もvalidateStateを通過", function () {
    var state = fresh();
    T.assert(S.Systems.Battle.plan(state, battlePlan()).ok);
    var calculated = S.Systems.Battle.resolveLegacy(state, { forceWin: true, random: rng(88) });
    T.assert(S.Systems.Battle.applyOutcome(state, calculated.plan, calculated.outcome).ok);
    var validation = S.State.validateState(state);
    T.assert(validation.ok, validation.errors.join(" / "));
  });

  T.test("Phase0: 既存Battle.resolveの返却形を維持", function () {
    var state = fresh();
    T.assert(S.Systems.Battle.plan(state, battlePlan()).ok);
    var result = S.Systems.Battle.resolve(state, { forceWin: true, random: rng(99) });
    T.assert(result.ok);
    T.assert(Object.prototype.hasOwnProperty.call(result.stateChanges, "win"));
    T.assert(Object.prototype.hasOwnProperty.call(result.stateChanges, "owner"));
    T.assert(Object.prototype.hasOwnProperty.call(result.stateChanges, "attackerLoss"));
    T.assert(Object.prototype.hasOwnProperty.call(result.stateChanges, "defenderLoss"));
    T.assert(Object.prototype.hasOwnProperty.call(result.stateChanges, "report"));
    T.equal(Object.prototype.hasOwnProperty.call(result.stateChanges, "outcome"), false);
  });
  T.run();
})(window.Sengoku, window.SengokuTest);
