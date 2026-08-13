# Project Sengoku — Playable Sengoku Loop Phase 1 Report

実装日: 2026-08-09

## 目的

Phase 1は、Playable Sengoku Loop v0.1へ進むための**データモデル基盤**です。プレイヤー向けの新しい進軍UIやTactical Battle接続はまだ行わず、既存Coreを壊さない形で Unit / Army / Officer Assignment / Castle Guard を追加しました。

このPhaseでは、既存の外交・忠誠・捕虜・イベント・セーブ・季節ターン・Legacy Battleの挙動を維持します。

## 主要変更

### 1. schemaVersion 10 → 11

`state`へ次を追加しました。

- `state.units = {}`
- `state.armies = {}`
- 各城へ `guardTroops`
- 各武将へ `assignment`

旧schema 10セーブは、破壊的変更なしでschema 11へ移行します。

### 2. Castle Guard

新しい城内守備兵のSource of Truthは `castle.guardTroops` です。

既存コード・旧セーブ互換のため `castle.troops` は削除せず、**getterではない実データの同値ミラー**として維持します。

兵力変更は `Unit.setGuardTroops()` / `Unit.changeGuardTroops()` を経由し、両フィールドを同時更新します。

### 3. Unit System

新規: `src/systems/unitSystem.js`

Unitは以下を保持します。

- `id`
- `factionId`
- `officerId`
- `unitType`
- `troops`
- `maxTroops`
- `morale`
- `experience`
- `status`
- `armyId`

兵種キーはTactical側と合わせています。

- `ashigaru`
- `samurai`
- `teppo`
- `kiba`

### 4. Army System

新規: `src/systems/armySystem.js`

Phase 1ではArmyを作成・解散できる基盤だけを実装しました。

Armyは以下を保持します。

- `id`
- `factionId`
- `commanderId`
- `unitIds[]`
- `originCastleId`
- `destinationCastleId`
- `route[]`
- `currentLocation`
- `status`

`Army.deploy()`で城守備兵をUnitへ移し、`Army.disband()` / `Army.arriveAndGarrison()`で生存兵を城へ戻します。

**実際の城間marchingは次Phaseです。**

### 5. Officer Assignment

武将へ次のassignmentを追加しました。

- `governor`
- `domestic`
- `army`
- `idle`

Army所属武将が同時に城内勤務になる矛盾を防ぐため、既存officerSystemと各状態遷移処理を同期しました。

### 6. 既存 `castle.troops` 直接書き込みの集約

runtime側の兵力書き込みをUnit Systemのguard helperへ集約しました。

対象:

- battleSystem
- domesticSystem
- aiSystem
- diplomacySystem
- eventSystem
- debugPanel

create/migration/Unit System内部の初期化・修復経路だけを例外としています。

また、勢力総兵力は城守備兵だけではなく、派遣中の生存Unitも含めて集計できます。

### 7. validateState拡張

schema 11では以下を検査します。

- `castle.guardTroops >= 0`
- `castle.troops === castle.guardTroops`
- Unitのtroops/maxTroops範囲
- Unit ⇔ Army相互参照
- Unit ⇔ Officer相互参照
- ArmyとUnitのfaction一致
- commanderがArmy内Unitの武将であること
- Army所属武将のassignment整合性
- governor assignmentとcastle governorの整合性

## セーブ移行

schema 10 → 11は追加型migrationです。

旧セーブ読み込み時:

- `state.units = {}`
- `state.armies = {}`
- `castle.guardTroops = castle.troops`
- officer assignmentを既存状態から補完

既存兵力・城・武将・外交・イベント等の意味は変更しません。

## Mobile-first方針

Phase 1はデータモデルのみのため、新しいプレイヤーUIは追加していません。

既存Coreのモバイル対応は維持しています。次のplayer-facing Phaseからは以下を必須条件とします。

- iPhone / Android横画面を第一基準
- Pointer Events
- マウスhover必須操作なし
- 主要タップ領域44 CSS px以上を目安
- safe-area対応
- 指で重要情報を隠しにくい配置
- PC UIを単純縮小しない

## 今回あえて実装していないもの

- Armyの城間移動
- Army編成の本番UI
- 新しい内政MVP
- BattleAdapter
- Core ⇔ Tactical接続
- Tactical BattleSpec外部入力
- Siege
- B5.4/B6/B7
- 20v20
- 日単位Living World

## テスト結果

2026-08-09に再実行。

| テスト | 結果 |
|---|---:|
| Core smoke | 103 / 103 PASS |
| Phase 0 Battle refactor | 8 / 8 PASS |
| Phase 1 Unit/Army | 13 / 13 PASS |
| Core v1 Phase 1 | 25 / 25 PASS |
| Core v1 Phase 2 | 18 / 18 PASS |
| Core v1 Phase 3 | 25 / 25 PASS |
| Core static checks | 34 / 34 PASS |
| 全JS構文検査 | PASS |
| longSimulation | PASS |
| releaseSimulation | PASS + deterministic replay PASS |
| diplomacySimulation | PASS |
| eventSimulation | PASS + deterministic replay PASS |
| eventStress | PASS |
| saveStabilitySimulation | 200 cycles / 3 recoveries / PASS |

Safari / Chrome / iPhone実機での新規Phase 1手動操作は、このPhaseでは新UIがないため自動検証対象外です。既存モバイルUIのコードは変更していません。

## Phase 1 完了判定

**PASS**

- 既存Coreの回帰テストを維持
- schema 11移行成立
- Unit / Armyをstateへ安全に保存可能
- active Armyを含むsave/load成立
- guardTroops / troopsミラーをvalidateStateで保証
- Unit/Army/Officerのownership不変条件を確立

次Phaseでは、この基盤を使って**スマホでArmyを編成 → 出陣 → 隣接城へ移動 → Legacy Battleへ到達**する縦のゲームループを作ります。
