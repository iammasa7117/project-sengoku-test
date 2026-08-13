# Phase 10 — Battle Aftermath / Pursuit

- Phase 10 logic: **13 / 13 PASS**
- Phase 10 DOM: **3 / 3 PASS**
- Phase 10 static: **12 / 12 PASS**
- Core regression: **103 / 103 PASS**
- Phase 0〜9.1 / Siege / UI-1 / UI-2: **PASS**
- Save stability: **200 cycles / 3 recoveries / PASS**
- Release / Long / Diplomacy / Event / EventStress / LivingWorld: **PASS**
- Tactical B5.x + neutral balance: **PASS**
- JavaScript syntax: **147 files PASS**
- `01_START_GAME.html` inline JavaScript syntax: **PASS**

# Phase 9.1 / Field Battle Stabilization verification

- Phase 9.1 logic: **4 / 4 PASS**
- Phase 9.1 DOM: **2 / 2 PASS**
- Phase 9.1 static: **8 / 8 PASS**
- Core regression: **103 / 103 PASS**
- Phase 0〜9 / Siege / UI-1 / UI-2: **PASS**
- Save stability: **200 cycles / PASS**
- Release / Long / Diplomacy / Event / EventStress / LivingWorld: **PASS**
- Tactical B5.x + neutral balance: **PASS**
- Core/Tactical JavaScript syntax: **141 files PASS**
- `01_START_GAME.html` inline JavaScript syntax: **PASS**

---

# Phase 6 / Mobile Campaign v0.2 verification

- Core regression: **103 / 103 PASS**
- Phase 0 / 1 / 2 / 3 Domestic: **8 / 13 / 10 / 13 PASS**
- Phase 4 Tactical Integration: **11 / 11 PASS**
- Phase 4 BattleSpec bridge: **7 / 7 PASS**
- Phase 5 Siege logic/static: **9 / 9 / 9 / 9 PASS**
- Phase 6 Mobile Campaign logic: **7 / 7 PASS**
- Phase 6 Mobile Campaign static: **10 / 10 PASS**
- Phase 2 / 3 DOM: **3 / 3 / 3 / 3 PASS**
- Core static: **34 / 34 PASS**
- Tactical B5.x embedded tests: **all PASS**
- Tactical neutral balance: **player 33 / enemy 27 / draw 0, PASS**
- Long / Diplomacy / Event / Event stress / Release simulations: **PASS**
- Save stability: **200 cycles / 3 corruption recoveries / PASS**
- All Core/Tactical JavaScript syntax checks: **PASS**
- Local HTTP serving: **PASS**
- Automated Chromium visual run: **environment blocked local navigation**, so real iPhone/Android landscape/portrait acceptance remains manual.

---

# Phase 5 / Playable Sengoku Loop v0.1 verification

- Core regression: **103 / 103 PASS**
- Phase 0 / 1 / 2 / 3: **8 / 13 / 10 / 13 PASS**
- Phase 4 Tactical Integration: **11 / 11 PASS**
- Phase 4 BattleSpec bridge: **7 / 7 PASS**
- Phase 5 Siege logic: **9 / 9 PASS**
- Phase 5 Siege static: **9 / 9 PASS**
- Phase 2 / 3 DOM: **3 / 3 / 3 / 3 PASS**
- Core static: **34 / 34 PASS**
- Tactical B5.x embedded test files: **all PASS**
- Tactical neutral balance: **player 33 / enemy 27 / draw 0, PASS**
- Long / Diplomacy / Event / Event stress / Release simulations: **PASS**
- Save stability: **200 cycles / 3 corruption recoveries / PASS**
- All JavaScript syntax checks: **PASS**

Actual iPhone/Android touch, rotation, safe-area and Tactical iframe transition remain manual acceptance tests.

---

# Phase 4 Tactical Integration verification

- Core regression: 103 / 103 PASS
- Phase 0 / 1 / 2 / 3: 8 / 13 / 10 / 13 PASS
- Phase 4 integration logic: 11 / 11 PASS
- Phase 4 integration static: 10 / 10 PASS
- Phase 4 Tactical BattleSpec bridge: 7 / 7 PASS
- Tactical B5.x embedded tests: all 13 files PASS
- Existing static checks: 34 / 34 PASS
- Long / Diplomacy / Event / Event stress / Release simulations: PASS
- Save stability: 200 cycles, 3 corruption recoveries, PASS
- All Core/Tactical JavaScript syntax checks: PASS

Real iPhone/Android touch + iframe transition remains manual verification.

---

# Playable Sengoku Loop Phase 1 — Test Results

実行日: 2026-08-09

| 対象 | 結果 |
|---|---:|
| Core smoke | **103 / 103 PASS** |
| Phase 0 Battle refactor | **8 / 8 PASS** |
| Phase 1 Unit/Army | **13 / 13 PASS** |
| Core v1 Phase 1 | **25 / 25 PASS** |
| Core v1 Phase 2 | **18 / 18 PASS** |
| Core v1 Phase 3 | **25 / 25 PASS** |
| Core static checks | **34 / 34 PASS** |
| 全JS構文検査 | **PASS** |
| longSimulation | **PASS** |
| releaseSimulation | **PASS / deterministic replay PASS** |
| diplomacySimulation | **PASS** |
| eventSimulation | **PASS / deterministic replay PASS** |
| eventStress | **PASS** |
| saveStabilitySimulation | **200 cycles / 3 recoveries / PASS** |

Phase 1はデータモデル基盤のため、新しいplayer-facingモバイルUIは追加していません。既存UIの動作仕様は維持しています。

---

# Project Sengoku Core v1.0 Test Results

実行日: 2026-08-05

## Core v1.0.1 Test Play Hotfix — Mobile modal interaction

| 対象 | 結果 |
|---|---:|
| Mobile modal DOM regression | **2 / 2 PASS** |
| v1 Phase 2 DOM total | **17 / 17 PASS** |
| Chromium narrow-width flow (390px) | **PASS** |
| Chromium tablet-width flow (900px) | **PASS** |
| Chromium desktop flow (1280px) | **PASS** |

390px・900pxでは、モーダル表示中に下部ナビが`visibility:hidden`かつ操作不能となることを確認しました。新規ゲーム開始→「軍議を始める」→初陣三択→結果→出陣軍議まで、クリック遮断とJavaScript例外なしで到達しました。

```sh
node tests/v1Phase2DomHarness.js
```

## Core v1.0 Phase 3 — Balance and Release QA

| 対象 | 結果 |
|---|---:|
| Phase 3 focused tests | **25 / 25 PASS** |
| Phase 3 DOM tests | **8 / 8 PASS** |
| Phase 3 static checks | **24 / 24 PASS** |
| RC1 release simulation | **12 / 12 valid, PASS** |
| 決定論的再実行 | **PASS** |

検証内容:

- Easy／Normal／Hardの資源・兵力・戦闘・AI行動差
- 序盤防衛支援と対プレイヤー侵攻上限
- 停滞時の侵攻閾値低下と安全な下限
- 一強抑制、劣勢回復、落城後士気
- 勝利・敗北画面、戦役統計、プレイレポート
- Release Balance debug snapshot
- セーブ互換、最終状態検証、外部依存なし

RC1 release simulationは4開始勢力×3難易度の12構成を全勢力AIで240季実行し、未決着時は360季まで継続しました。12/12で合戦が発生し、10/12が360季以内に終結しました。最大停滞は12季、条約違反攻撃、不正数値、負兵力、重複城主、未解決合戦はすべて0です。

```sh
node tests/nodeHarness.js tests/v1Phase3Tests.js
node tests/v1Phase3DomHarness.js
node tests/v1Phase3StaticChecks.js
node tests/releaseSimulation.js
```

## Core v1.0 Phase 2 — Guidance, Accessibility, Mobile

| 対象 | 結果 |
|---|---:|
| 操作案内focused tests | **18 / 18 PASS** |
| 操作案内DOM tests | **15 / 15 PASS** |
| 操作案内static checks | **20 / 20 PASS** |

```sh
node tests/nodeHarness.js tests/v1Phase2Tests.js
node tests/v1Phase2DomHarness.js
node tests/v1Phase2StaticChecks.js
```

## Core v1.0 Phase 1 — Save Recovery

| 対象 | 結果 |
|---|---:|
| セーブfocused tests | **25 / 25 PASS** |
| セーブDOM tests | **5 / 5 PASS** |
| セーブstatic checks | **9 / 9 PASS** |
| 200-cycle保存・読込・破損復旧simulation | **PASS** |

200回の保存・読込、3回の意図的破損から3/3自動復旧、最終`validateState` PASS、3世代バックアップ維持を確認しました。

```sh
node tests/nodeHarness.js tests/v1Phase1Tests.js
node tests/v1Phase1DomHarness.js
node tests/v1Phase1StaticChecks.js
node tests/saveStabilitySimulation.js
```

## Core v0.95 Event Phase 1〜3

| 対象 | 結果 |
|---|---:|
| Event Phase 1 | **18 / 18 PASS** |
| Event Phase 2 | **23 / 23 PASS** |
| Event Phase 3 | **29 / 29 PASS** |
| Core DOM UI | **15 / 15 PASS** |
| UI smoke | **8 / 8 PASS** |
| Core static checks | **34 / 34 PASS** |

```sh
node tests/nodeHarness.js tests/phase1Tests.js
node tests/nodeHarness.js tests/phase2Tests.js
node tests/nodeHarness.js tests/phase3Tests.js
node tests/domNodeHarness.js
node tests/uiSmoke.js
node tests/staticChecks.js
```

## 全回帰テスト

結果: **103 / 103 PASS**

既存テストを削除・弱体化せず、RC1変更後に全回帰を実行しました。

```sh
node tests/nodeHarness.js
```

## 長期シミュレーション

- legacy 100季×3構成: **3 / 3 PASS**
- 外交AI 8構成、200〜300季: **8 / 8 PASS**、5構成が終結
- Event 8 seed×300季: **8 / 8 PASS**、決定論的再実行PASS
- Event stress: **11 / 11 PASS**、10,000回`Event.emit`を含む
- RC1 4勢力×3難易度、240〜360季: **12 / 12 PASS**、10構成が終結

全検査で条約違反攻撃、不正数値、負兵力、重複城主、参照不整合、queue・chain上限違反、未解決active eventは0です。

```sh
node tests/longSimulation.js
node tests/diplomacySimulation.js
node tests/eventSimulation.js
node tests/eventStress.js
node tests/releaseSimulation.js
```

## セーブと移行

- `schemaVersion: 10`
- `gameVersion: "core-0.95"`
- Core v0.95、v0.95.1、v1.0 Phase 1、Phase 2の互換経路を維持
- checksum、3世代バックアップ、自動復旧、JSON入出力を維持
- RC1のバランス情報は既存stateを破壊せずdifficulty定義から適用

## JavaScript構文検査

全JavaScript **72 / 72** `node --check` PASS。

```sh
find . -name '*.js' -type f -print0 | xargs -0 -n1 node --check
```

## ブラウザ検証環境

この自動検査環境では、Safari、Chrome、iPhoneによるローカル`file://`実操作は実施していません。直接起動構成はHTML参照検査、DOMテスト、静的検査、Nodeテストで確認しました。正式版公開後もSafari、Chrome、iPhoneでの実機受入確認を推奨します。

## ZIP整合性

最終ZIP作成後に`unzip -t`、ZIP直下、SHA-256を確認し、リリース報告へ記録します。

## Core v1.0正式版 再検査（2026-08-05）

RC1から正式版への表示・文書昇格後に、ゲームロジックを変更せず全検査を再実行しました。

- 全回帰: **103 / 103 PASS**
- v1 Phase 1: **25 / 25 PASS**、DOM **5 / 5 PASS**、static **9 / 9 PASS**
- v1 Phase 2: **18 / 18 PASS**、DOM **15 / 15 PASS**、static **20 / 20 PASS**
- v1 Phase 3: **25 / 25 PASS**、DOM **8 / 8 PASS**、static **24 / 24 PASS**
- Core event Phase 3: **29 / 29 PASS**、Core DOM **15 / 15 PASS**
- UI smoke: **8 / 8 PASS**、Core static: **34 / 34 PASS**
- セーブ安定性: **200 cycle PASS**、破損復旧 **3 / 3 PASS**
- 外交、イベント、10,000 emit stress、12構成release simulation: **PASS**
- 全JavaScript構文検査: **PASS**

Safari、Chrome、iPhoneの実機手動操作は未実施です。

## Phase 7 Strategic Depth — 2026-08-10

- Core main: 103/103 PASS
- Phase 0: 8/8 PASS
- Phase 1 Unit/Army: 13/13 PASS
- Phase 2 Army Marching: 10/10 PASS
- Phase 3 Domestic MVP: 13/13 PASS
- Phase 4 Tactical Integration: 11/11 PASS
- Tactical BattleSpec Bridge: 7/7 PASS
- Phase 5 Siege: 9/9 PASS
- Phase 6 Mobile Campaign logic: 7/7 PASS
- Phase 7 Strategic Depth logic: 10/10 PASS
- Phase 7 Strategic Depth static: 11/11 PASS
- Core static: 34/34 PASS
- v1 regression suites/static checks: all PASS
- DOM smoke: 15/15 PASS
- UI smoke: 8/8 PASS
- Tactical B5.x test scripts: all PASS
- Tactical neutral balance: player 33 / enemy 27 / draw 0; determinism PASS
- Long / diplomacy / event / release simulations: validation PASS
- Event stress: 10,000 emits PASS
- Save stability: 200 cycles, 3 corruption recoveries, finalValidation true
- JavaScript syntax (`node --check`): 128 files PASS
- HTTP smoke: index, castle profile data, Tactical entry, manifest all served HTTP 200

Real iPhone/Android touch-layout testing remains manual and is not claimed by the automated suite.
