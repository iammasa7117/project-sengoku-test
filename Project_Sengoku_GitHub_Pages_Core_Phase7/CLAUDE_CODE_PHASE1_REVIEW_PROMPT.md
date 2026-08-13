# Claude Code Review — Playable Sengoku Loop Phase 1

Project SengokuのPlayable Sengoku Loop Phase 1を独立レビューしてください。

**今回はコードを変更しないでください。レビューのみです。**

## 目的

Phase 0のBattle boundary refactorに続き、Phase 1では既存Coreへ以下を追加しました。

- schemaVersion 10 → 11
- `state.units{}`
- `state.armies{}`
- `castle.guardTroops`
- `officer.assignment`
- Unit System
- Army System
- v10 → v11 migration
- validateState不変条件
- runtimeのcastle兵力更新を共通helperへ集約

まだArmy marching、Domestic MVP、BattleAdapter、Tactical接続、Siegeは実装していません。

## 必ず実コードを確認してください

重点確認対象:

- `src/state/schema.js`
- `src/state/createInitialState.js`
- `src/state/migrateState.js`
- `src/state/validateState.js`
- `src/data/unitTypes.js`
- `src/systems/unitSystem.js`
- `src/systems/armySystem.js`
- `src/systems/officerSystem.js`
- `src/systems/battleSystem.js`
- `src/systems/domesticSystem.js`
- `src/systems/aiSystem.js`
- `src/systems/diplomacySystem.js`
- `src/systems/eventSystem.js`
- `src/systems/prisonerSystem.js`
- `src/systems/loyaltySystem.js`
- `src/systems/turnSystem.js`
- `src/systems/victorySystem.js`
- `src/ui/debugPanel.js`
- `tests/phase1UnitArmyTests.js`

## 確認してほしいこと

1. schema 11へのmigrationは旧v10セーブを安全に維持できるか
2. `guardTroops`をSource of Truth、`troops`を実データmirrorとする方法に穴がないか
3. runtime中に`castle.troops`だけを書き換えるコードパスが残っていないか
4. Unit/Armyのownershipと相互参照に破綻がないか
5. `officer.assignment`と既存`castleId`/governor/prisoner/ronin処理の整合性
6. active Armyを含むsave/load後にvalidateStateが成立するか
7. Army.deploy/disbandで兵力が二重計上・消失しないか
8. faction総兵力計算が派遣中Unitを落としていないか
9. Legacy battle/domestic/AI/diplomacy/eventが新ミラー方式で回帰していないか
10. event preflight / JSON deepClone / save envelopeと新データが衝突していないか
11. Phase 2でArmy marchingを実装する前に直すべきCritical/High問題があるか
12. Mobile-firstの次Phaseへ進める状態か

## テスト

既存テストを実際に再実行してください。最低限:

```sh
node tests/nodeHarness.js
node tests/nodeHarness.js tests/phase0BattleRefactorTests.js
node tests/nodeHarness.js tests/phase1UnitArmyTests.js
node tests/nodeHarness.js tests/v1Phase1Tests.js
node tests/nodeHarness.js tests/v1Phase2Tests.js
node tests/nodeHarness.js tests/v1Phase3Tests.js
node tests/staticChecks.js
node tests/longSimulation.js
node tests/releaseSimulation.js
node tests/diplomacySimulation.js
node tests/eventSimulation.js
node tests/eventStress.js
node tests/saveStabilitySimulation.js
```

全JSの`node --check`も行ってください。

## 回答形式

- A. 実装確認
- B. Critical
- C. High
- D. Medium/Low
- E. Migration/Save評価
- F. Unit/Army ownership評価
- G. 既存Core回帰評価
- H. Phase 2へ進む際の必須修正
- I. 判定

最後の判定は必ず次のいずれかにしてください。

- **GO**
- **GO WITH FIXES**
- **NO-GO**

理由をコードファイル・関数名付きで説明してください。
