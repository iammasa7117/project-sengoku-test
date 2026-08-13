# Project Sengoku — Phase 5 / Playable Sengoku Loop v0.1 実装レポート

実装日: 2026-08-10

## 結論

Phase 5で、Tactical会戦後の結果を簡易Siegeへ接続し、**城 → 内政 → 武将/Unit → Army → 進軍 → Tactical会戦 → 攻城 → 占領 → 新領地統治**までを一本のプレイループとして接続しました。

これを **Playable Sengoku Loop v0.1** とします。

## Phase 5で追加したもの

### 1. `Siege` システム

新規: `src/systems/siegeSystem.js`

- Tacticalの野戦勝利と城の落城を分離。
- 圧勝ならその場で落城。
- 僅差勝利ならArmyは敵城前に残り、`besieging`状態へ移行。
- 次の季節ごとに攻城を自動継続し、守備兵・士気・防備を削る。
- 条約/外交状態が変わった場合、最低侵攻兵力を割った場合は撤退。
- プレイヤーは包囲中Armyの詳細から任意撤退可能。

### 2. Legacy Battle互換

既存AI戦・自動解決は従来どおり「勝てば即落城」を維持します。

`Battle.applyOutcome()`は城所有権変更を直接行わず、Legacy勝利時は`Siege.resolveLegacy()`へ委譲します。外部の`Battle.resolve()` APIは維持しています。

### 3. Tactical会戦 → Siege

Tactical結果がCoreへ戻ると、 surviving Army と敵城の

- 生存兵力
- Army平均士気
- 城守備兵
- 城防御
- 城士気

から攻城力/城防御力を評価します。

野戦勝利だけでは必ずしも城を奪えないため、リアルタイム会戦と戦略レイヤーの間に意味のある接続ができました。

### 4. 包囲の永続状態

`Army.status`へ`besieging`を追加し、任意の`army.siege`状態を保存します。

`schemaVersion`は**12のまま**です。新しい必須トップレベルstateを増やしていないためmigrationは追加していません。

`validateState`へ包囲Armyの参照整合性を追加しています。

### 5. Mobile-first UI

- 地図上の包囲Armyを「囲」マーカーで表示。
- Army詳細に攻城力 / 城防御 / 必要値のメーターを表示。
- 「包囲を解いて撤退」をタッチ操作可能なボタンとして追加。
- Tactical戦闘結果に「落城」「包囲継続」を明示。
- iPhone/Android横画面の既存safe-area対応を維持。

## Playable Sengoku Loop v0.1

```text
城を所有
  ↓
内政（人口 / 農業 / 金 / 兵糧 / 徴兵）
  ↓
武将をUnitへ配置
  ↓
Army編成・出陣
  ↓
戦略マップ上を進軍
  ↓
敵城到達
  ↓
Tactical B5.3 リアルタイム会戦
  ↓
勝利 → Siege判定
  ├─ 圧勝 → 落城
  └─ 僅差 → 包囲継続 → 次季攻城
  ↓
占領
  ↓
城主・守備兵を配置し、新領地として統治
```

## 主要な設計境界

```text
Core Army / Unit
      ↓ BattleSpec
BattleAdapter
      ↓
Tactical B5.3
      ↓ Tactical Result
BattleAdapter
      ↓ BattleOutcome
Battle.applyOutcome
      ↓
Siege.resolveTactical / resolveLegacy
      ↓
Core state
```

TacticalはCore stateを直接参照しません。

## 自動検査

- Core全回帰: **103 / 103 PASS**
- Phase 0: **8 / 8 PASS**
- Phase 1 Unit/Army: **13 / 13 PASS**
- Phase 2 Army Marching: **10 / 10 PASS**
- Phase 3 Domestic MVP: **13 / 13 PASS**
- Phase 4 Tactical Integration: **11 / 11 PASS**
- Phase 4 Bridge: **7 / 7 PASS**
- Phase 5 Siege logic: **9 / 9 PASS**
- Phase 5 Siege static: **9 / 9 PASS**
- Core static: **34 / 34 PASS**
- Phase 2/3 DOM: **3 / 3 PASS / 3 / 3 PASS**
- Tactical embedded B5.x: **全13テストファイルPASS**
- Tactical neutral balance: 60戦 player 33 / enemy 27 / draw 0, PASS
- longSimulation: PASS
- diplomacySimulation: PASS
- eventSimulation: PASS / deterministic replay PASS
- eventStress: PASS
- saveStabilitySimulation: 200 cycles / corruption recovery 3 / 3 PASS
- releaseSimulation: PASS / deterministic replay PASS
- 全JavaScript `node --check`: PASS

## 未検証

自動環境では実際のiPhone/Android Safari/Chromeによる指操作、回転、safe-area、Tactical iframeの実機遷移は検証していません。Phase 5完成判定の最後は実機受入テストを行ってください。

## v0.1で意図的に後回し

- B5.4見た目polish
- B6疲労/追撃
- B7高度Tactical AI
- 15v15 / 20v20
- 本格Siege専用戦闘画面
- 日単位Living World
- 全国マップ
- Personality/Trait/Story大量コンテンツ
- オンライン / クラウド / 課金
