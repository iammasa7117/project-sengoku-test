# Project Sengoku Phase 11 — Pursuit Doctrine / Cavalry & Command

## 目的
Phase 10で成立した「野戦勝利 → 敗走 → 追撃判断」を、固定値の戦後処理から軍編成と武将能力に結びついた戦略システムへ進化させる。

## 実装内容

### 1. 追撃Profile
`Army.pursuitProfile()`を追加。

追撃率は以下を基準に決定する。

- 基礎: 10%
- 騎馬比率: 最大 +16%
- 総大将の武力: 50を基準に補正
- 総大将の統率: 50を基準に補正
- 最終追撃率: 8%〜32%に制限

追撃効果を「低 / 中 / 高」で表示する。

### 2. 騎馬の戦略的価値
Army内の生存兵から騎馬兵数を集計し、騎馬比率が高いほど追撃率が上昇する。

Phase 10では追撃は一律18%だったが、Phase 11ではArmy編成によって結果が変化する。

### 3. 総大将能力
総大将の`might`と`leadership`を追撃性能へ反映。

- 武力が高いほど敗走軍へ圧力をかけやすい。
- 統率が高いほど追撃時の疲労コストを抑えやすい。
- 追撃疲労は5〜12の範囲。

### 4. Battle Report / UI
Playerが追撃判断を行う戦報に以下を表示。

- 追撃効果: 低 / 中 / 高
- 騎馬比率
- 予想追加損害率
- 総大将の追加疲労

結果だけではなく、「なぜこのArmyは追撃に向いているか」が判断できるようにした。

### 5. AI Pursuit
AI勢力がField Battleに勝利した場合も追撃判断を行う。

AIは以下を確認する。

- 追撃率が最低基準以上か
- 勝利側総大将が疲労しすぎていないか
- 敗走Armyに生存兵がいるか

条件を満たす場合は自動追撃。疲労が高い場合などは「深追いを避ける」。

AI追撃もPlayerと同じ追撃Profileを使用する。

### 6. Phase 10 Save後方互換
Phase 10時点の未解決追撃Battle ReportにはPhase 11のprofile fieldが存在しない。

そのため旧戦報では以下へfallbackする。

- 追撃率: 18%
- 追撃疲労: +8

`schemaVersion = 12`を維持しmigrationを不要にした。

## Battle Report追加field

- `pursuitRate`
- `pursuitFatigueCost`
- `pursuitCavalryRatio`
- `pursuitEffectLabel`
- `pursuitLeadership`
- `pursuitMight`
- `pursuitByAI`

既存Report利用側は追加fieldを無視できるため後方互換。

## 変更ファイル

- `src/systems/armySystem.js`
- `src/ui/renderArmy.js`
- `index.html`
- `01_START_GAME.html`
- `README.md`
- `README_まずここを開く.txt`
- `VERSION.txt`
- `tests/phase11PursuitDoctrineTests.js`
- `tests/phase11PursuitDoctrineStatic.js`
- `tests/phase11PursuitDoctrineDomTests.js`
- `tests/phase11PursuitDoctrineDomHarness.js`

## Phase 11 Tests

- Logic: 9/9 PASS
- Static: 10/10 PASS
- DOM: 2/2 PASS

確認内容:

1. 騎馬比率で追撃率が上昇。
2. 総大将能力で追撃率/疲労が変化。
3. Player追撃が固定18%ではなくprofileを使用。
4. 戦報に追撃profileを保存。
5. AI勝利時の自動追撃。
6. 高疲労AIの深追い回避。
7. AI追撃でも城所有権不変。
8. Phase 11 profileのSave/Load。
9. Phase 10旧戦報の18%/+8 fallback。
10. Player追撃判断UI。
11. AI追撃結果UI。

## Regression

- Core: 103/103 PASS
- Phase 0: 8/8 PASS
- Phase 1 Unit/Army: 13/13 PASS
- Phase 2 Army Marching: 10/10 PASS
- Phase 3 Domestic: 13/13 PASS
- Phase 4 Tactical Integration: 11/11 PASS
- Tactical Bridge: 7/7 PASS
- Phase 5 Siege: 9/9 PASS
- Phase 6 Mobile Campaign: 7/7 PASS
- Phase 7 Strategic Depth: 10/10 PASS
- Phase 8 Living Front: 6/6 + Static 8/8 PASS
- Phase 9 Field Battle: 7/7 + Static 9/9 PASS
- Phase 9.1 Stabilization: 4/4 + Static 8/8 PASS
- Phase 10 Battle Aftermath: 13/13 + Static 12/12 + DOM 3/3 PASS
- UI-1: 6/6 + Static 14/14 PASS
- UI-2: 4/4 + Static 12/12 PASS
- Core Static: 34/34 PASS
- Save Stability: 200 cycles / 3 corruption recoveries / PASS
- Release / Long / Diplomacy / Event / EventStress / Living World: PASS
- Tactical B1-B5 test scripts: ALL PASS
- Neutral Tactical balance: 60/60, player 33 / enemy 27 / draw 0, PASS
- JavaScript syntax: 150 files PASS
- `01_START_GAME.html` inline JavaScript syntax: PASS

## Phase 11で意図的に未実装

- 追撃側の兵力損失/反撃事故
- 武将捕縛
- 追撃専用Tactical Battle
- 武将traitsによる追撃性格差
- 地形による追撃補正
- 敗走Armyへの通常Army再迎撃
- 複数季の長距離敗走

これらはPhase 12以降で追加可能。
