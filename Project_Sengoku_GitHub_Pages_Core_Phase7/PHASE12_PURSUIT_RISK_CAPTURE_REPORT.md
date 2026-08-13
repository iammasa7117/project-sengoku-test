# Project Sengoku Phase 12 — Pursuit Risk / Commander Capture & Escape

## 目的
Phase 11で成立した「軍編成・総大将能力で追撃性能が変わる」仕組みに、利益と危険の両方を追加し、「追撃する」が常に正解ではない戦略判断にする。

## 実装内容

### 1. 敵総大将の捕縛 / 逃亡
追撃時、敗走Armyの総大将に対して捕縛判定を行う。

捕縛見込みは以下の影響を受ける。
- 勝者Armyの騎馬比率
- 勝者総大将の武力・統率
- 敗者総大将の武力
- 敗者総大将の疲労

最終捕縛率は3%〜28%に制限。

捕縛成功時は既存 `Prisoner.capture()` へ接続するため、既存の捕虜処遇・登用・解放・捕虜交換をそのまま利用できる。

### 2. 総大将捕縛時の敗走Army
Project SengokuのUnitは1武将と強く結び付いているため、総大将を捕虜化したままUnitをArmyへ残すとState不整合になる。

そのため捕縛成功時は「指揮崩壊」として敗走Armyを即時散開解散し、生存兵を既存の退却先自勢力城へ帰還させる。

捕虜武将本人は帰城せず捕虜状態を維持する。

### 3. 深追いリスク
追撃時に勝者総大将へ深追い事故が発生する可能性を追加。

リスクは以下で変化。
- 騎馬比率が高いほど低下
- 統率が高いほど低下
- 総大将の疲労が高いほど上昇

リスクは4%〜25%。

事故発生時:
- 追加疲労 +6
- 体力 -8
- 35%で軽傷（重傷への直接悪化はなし）

### 4. 追撃前UI
Battle Reportに以下を表示。
- 予想追加損害
- 捕縛見込み
- 深追いリスク（低 / 中 / 高）
- 通常の追撃疲労

これにより「敵を削る/捕らえる期待」と「自軍総大将への危険」を比較して判断できる。

### 5. Saveリロード再抽選の抑制
Playerの通常追撃はBattle Report ID・Turn・Army IDから安定したrollを生成する。

同じBattle ReportをSave/Loadして追撃し直しても、捕縛・深追い事故の結果が変わりにくい設計にした。

テスト用には `resolvePursuit(..., { random })` の注入が可能。

### 6. AI
Phase 11のAI追撃判断を維持し、深追いリスクが極端に高い場合は追撃を控える条件を追加。
AIが追撃した場合も同じ捕縛/事故処理を使用する。

## 追加Battle Report field
- `pursuitCaptureChance`
- `pursuitRiskChance`
- `pursuitRiskLabel`
- `pursuitLoserCommanderId`
- `pursuitLoserCommanderMight`
- `pursuitCapturedOfficerId`
- `pursuitCaptureResult`
- `pursuitIncident`
- `pursuitExtraFatigue`
- `pursuitCommanderInjury`
- `pursuitRetreatDisbanded`
- `pursuitRetreatReturnedTroops`

追加fieldのため既存Save/戦報利用側を破壊しない。Phase 11未解決戦報では現在Stateから捕縛/リスク値をfallback計算する。

## 変更ファイル
- `src/systems/armySystem.js`
- `src/systems/prisonerSystem.js`
- `src/ui/renderArmy.js`
- `index.html`
- `01_START_GAME.html`
- `README.md`
- `README_まずここを開く.txt`
- `VERSION.txt`
- `CHANGELOG.md`
- `tests/phase12PursuitRiskCaptureTests.js`
- `tests/phase12PursuitRiskCaptureStatic.js`
- `tests/phase12PursuitRiskCaptureDomTests.js`
- `tests/phase12PursuitRiskCaptureDomHarness.js`
- `tests/phase11PursuitDoctrineStatic.js`（後続Phaseタイトルを許容する回帰チェック調整）

## Phase 12 Tests
- Logic: 10/10 PASS
- Static: 11/11 PASS
- DOM: 2/2 PASS

## 互換性
- `schemaVersion = 12` 維持
- Phase 11追撃Profile維持
- Phase 10敗走維持
- Core/Tactical Adapter境界維持
- Castle Siege経路変更なし
- 既存Prisoner機能を再利用

## Phase 12で意図的に未実装
- 追撃側兵士の直接損害
- 敵副将/複数武将の同時捕縛
- 地形による捕縛/事故補正
- traits / 性格による追撃判断
- 捕縛専用Tacticalシーン
- 処刑/身代金など新しい捕虜処遇

## Regression
- Core: 103/103 PASS
- Phase 0 Battle Refactor: 8/8 PASS
- Phase 1 Unit/Army: 13/13 PASS
- Phase 2 Army Marching Logic: 10/10 PASS
- Phase 3 Domestic MVP: 13/13 PASS
- Phase 4 Tactical Integration: 11/11 PASS
- Tactical Bridge: 7/7 PASS
- Phase 5 Siege: 9/9 PASS
- Phase 6 Mobile Campaign: 7/7 PASS（専用直接実行）
- Phase 7 Strategic Depth: 10/10 PASS
- Phase 8 Living Front: 6/6 + Static 8/8 PASS
- Phase 9 Field Battle: 7/7 + Static 9/9 + DOM 2/2 PASS
- Phase 9.1 Stabilization: 4/4 + Static 8/8 PASS
- Phase 10 Battle Aftermath: 13/13 + Static 12/12 + DOM 3/3 PASS
- Phase 11 Pursuit Doctrine: 9/9 + Static 10/10 + DOM 2/2 PASS
- Phase 12 Pursuit Risk/Capture: 10/10 + Static 11/11 + DOM 2/2 PASS
- UI-1: 6/6 + Static 14/14 PASS
- UI-2: 4/4 + Static 12/12 PASS
- Core Static: 34/34 PASS
- Save Stability: 200 cycles / final validation PASS
- Release Simulation: PASS / deterministic replay PASS
- Long Simulation: PASS
- Diplomacy Simulation: PASS
- Event Simulation: PASS
- Event Stress 10,000 emits: PASS
- Living World Simulation: PASS
- Tactical test scripts 13本: ALL PASS
- Neutral Tactical balance: 60/60 completed / symmetry PASS / determinism PASS
- JavaScript syntax: 154 files PASS
- `01_START_GAME.html` inline JavaScript: 53 blocks PASS
- Bundle/source sync: PASS

### 既知の旧DOMテスト
`phase2ArmyMarchingDomHarness.js` は3件中1件、`phase3DomesticMvpDomHarness.js` は3件中1件が現在UI文言/構造と不一致でFAILする。

Phase 12変更前の正式Phase 11 ZIPでも同一FAILを再現しており、Phase 12によるregressionではない。Logic/Staticおよび現行Phase 9〜12 DOMテストはPASSしているため、今回は古いテストに合わせて現行UIを戻さない。
