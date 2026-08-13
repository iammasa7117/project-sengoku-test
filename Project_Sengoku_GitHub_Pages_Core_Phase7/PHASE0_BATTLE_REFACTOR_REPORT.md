# Playable Sengoku Loop — Phase 0 Battle Refactor Report

## Scope
新機能・UI・ゲームバランスは変更せず、既存 `Battle.resolve()` を将来のTactical統合に耐えられる境界へ分割した。

## Implemented
- `Battle.resolveLegacy(state, options)` を追加。
  - legacy合戦の勝敗、損害、負傷、敗軍武将の退却/捕縛予定を計算する。
  - 正常系ではstateを変更しない。
  - `BattleOutcome`形式の `outcome` を返す。
- `Battle.applyOutcome(state, plan, outcome)` を追加。
  - 旧 `Battle.resolve()` が担当していた事後処理を適用する。
  - 城所有権、兵力、武将移動、捕虜、勲功、因縁、外交戦績、戦国記、勝敗判定を従来通り処理する。
- `Battle.resolve(state, options)` は互換ラッパー化。
  - `resolveLegacy → applyOutcome` の順で呼び出す。
  - 既存の呼び出し側・返却shape・schemaVersionは変更しない。
- BattleOutcomeに将来のAdapterで必要になる共通フィールドを先行導入。
  - `mode`, `winnerFactionId`, `loserFactionId`, `capturedOfficerIds`, `retreatedOfficerIds`, `destroyedUnitIds`, `commanderDefeated`, `durationTicks` 等。

## Compatibility
- schemaVersion: 10のまま。
- migration: なし。
- UI: 変更なし。
- Mobile UX: 変更なし。
- `Battle.resolve` の既存返却shapeを維持。

## Regression / equivalence validation
既存版とPhase 0版を別プロセスで実行し、タイムスタンプ以外のstate全体と既存Battle.resolve返却値を比較した。

5シナリオ:
1. forced win / standard
2. forced loss / standard
3. natural result / deterministic RNG
4. forced win / assault
5. core_campaign / forced win

結果: 5/5 state equivalence PASS、5/5 result equivalence PASS。

## Automated tests
- Core smoke: 103/103 PASS
- v1 Phase 1: 25/25 PASS
- v1 Phase 2: 18/18 PASS
- v1 Phase 3: 25/25 PASS
- New Phase 0 Battle tests: 8/8 PASS
- Static checks: 34/34 PASS
- longSimulation: validation PASS
- releaseSimulation: PASS / deterministic replay PASS
- diplomacySimulation: PASS
- eventSimulation: PASS / deterministic replay PASS
- eventStress: PASS
- saveStabilitySimulation: 200 cycles, 3/3 corruption recoveries, finalValidation true
- JS syntax check: PASS

## Intentionally not included
- Unit/Army state
- guardTroops
- schema v11 migration
- Siege separation
- Tactical Battle connection
- UI polish

これらは次Phase以降で行う。
