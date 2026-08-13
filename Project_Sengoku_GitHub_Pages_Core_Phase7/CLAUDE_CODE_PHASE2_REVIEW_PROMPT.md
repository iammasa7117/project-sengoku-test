# Claude Code Review — Project Sengoku Playable Loop Phase 2

コード変更はまだ行わず、Phase 2実装をレビューしてください。

## 目的

Phase 1のUnit/Army基盤から、以下の最初の戦略ループを接続しました。

Castle → Unit編成 → Army出陣 → 地図上進軍 → 次季到着 → Legacy Battle → 占領/帰還

Tactical B5.3はまだ接続していません。

## 主な変更

- `src/systems/armySystem.js`
  - `totalTroops`
  - `startMarch`
  - `deployAndMarch`
  - `cancelMarch`
  - `resolveArrivalLegacy`
  - `advanceSeason`
- `turnSystem.js`へArmy seasonal phase追加
- `validateState.js`へmarch location invariant追加
- `src/ui/renderArmy.js`新規
- `renderMap.js`へArmy marker
- 通常侵攻UIをArmy編成へ変更
- schemaは11のまま
- AIは既存Legacy attackのまま
- Tacticalは無改修

## 特に確認してほしいこと

1. Army到着時のLegacy bridgeで兵力が二重計上/消失しないか。
2. `Army.disband → Battle.plan → Battle.resolve`という互換ブリッジに隠れたstate整合性問題がないか。
3. 総大将が城主だった場合、出陣時にgovernorが外れ、勝敗後に正しく再配置されるか。
4. 2人目以降のArmy武将の勝利後移動処理に不整合がないか。
5. 外交状態が進軍中に変化した場合の撤収処理が安全か。
6. `Turn.advance`内のArmy処理順（外交season-start後、AI前）が妥当か。
7. save/load中のmarching Armyがschema11 invariantsを満たすか。
8. 将来BattleAdapter/Tacticalへ置換するとき、このPhase 2 bridgeを安全に削除できるか。
9. Mobile-first UIで指操作・情報密度・横画面safe-areaにCriticalな問題がないか。
10. Phase 3 Domestic MVPへ進む前に直すべきCritical/High問題があるか。

## 実行してほしいテスト

```sh
node tests/nodeHarness.js tests/phase2ArmyMarchingTests.js
node tests/phase2ArmyMarchingDomHarness.js
node tests/phase2ArmyMarchingStatic.js
node tests/nodeHarness.js
node tests/nodeHarness.js tests/phase1UnitArmyTests.js
node tests/nodeHarness.js tests/phase0BattleRefactorTests.js
node tests/staticChecks.js
node tests/saveStabilitySimulation.js
```

必要なら長期simulationも再実行してください。

## 回答形式

- Current implementation summary
- Critical
- High
- Medium
- Good design / keep
- Test findings
- Phase 3へ進んでよいか: YES / NO
- YESの場合でも、Phase 3前に行うべき小修正があれば列挙

コードは変更しないでください。
