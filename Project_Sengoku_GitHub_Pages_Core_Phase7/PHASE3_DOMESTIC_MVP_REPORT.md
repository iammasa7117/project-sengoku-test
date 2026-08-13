# Playable Sengoku Loop Phase 3 — Domestic MVP 実装レポート

## 目的
Phase 2で成立した「Unit → Army → 進軍 → Legacy Battle」に、戦争を支える最小の内政循環を接続しました。Mobile-firstを維持し、内政パラメータを増やしすぎず、人口・金・兵糧・徴兵・Army維持費が互いに意味を持つ状態を狙っています。

## 実装内容

### schema 12
`schemaVersion`を11→12へ更新しました。各城に以下を追加します。

- `population`
- `agriculture`

schema 11セーブは`migrateV11()`でschema 12へ自動移行します。旧兵力・Unit・Army・外交・イベント等は保持し、人口と農業のみ既存の`income` / `guardTroops`から決定論的に補完します。

### 人口 → 税 / 徴兵
- `Domestic.goldYieldForCastle()`：既存`income` + 人口由来の税収ボーナス。
- `Domestic.recruitmentCapacity()`：人口から徴兵上限を算出。
- 徴兵成功時は人口を減らし、同数を守備兵へ移します。
- 上限到達時は金・兵糧を消費する前に拒否します。

### 農業 → 兵糧
- `Domestic.foodYieldForCastle()`で農業Lvを季節兵糧へ変換。
- 新命令`executeCultivation()`（UI: 「開墾」）を追加。
- 開墾は金と命令1を消費し、農業+1と人口増加を行います。

### 季節経済
従来`turnSystem.js`内に直書きされていたプレイヤー/AI収入処理を`Domestic.processSeasonEconomy()`へ集約しました。

季節処理は概ね：

`城収入 + 農業収穫 → Army維持費支払い → 人口自然増 → 外交 → Army移動/戦闘 → AI行動 → イベント`

となります。

### Army維持費
Field Armyは毎季、兵力に応じて金と兵糧を消費します。

- 金：遠征兵25人ごとに1
- 兵糧：遠征兵12人ごとに1

不足しても資源は負値にせず、遠征Unitの士気を低下させます。これはv0.1向けの簡易兵站で、独立した`supplies`フィールドはまだ導入していません。

### AI対称性
AI徴兵も人口・徴兵上限を使います。AI内政でも人口が増えるようにし、プレイヤー側だけ新経済ルールを受ける非対称状態を避けました。

### Mobile UI
城詳細に以下を表示します。

- 人口
- 守備兵
- 徴兵上限
- 収入基盤
- 農業
- 防備
- 士気
- 徴兵余地
- 季節の金
- 季節の兵糧
- 遠征軍の金/兵糧維持費

Army編成とArmy詳細にも維持費情報を表示します。PWA `orientation: landscape`、safe-area、既存の44px以上タッチ領域を維持しています。

## 意図的に未実装
- commerce/securityの独立stat
- 建物
- 税率
- 交易路
- 独立したArmy supplies
- 日単位の人口/経済Tick
- Tactical Battle統合

## テスト結果
実装後に以下を実行しPASSを確認しました。

- Core regression: 103 / 103
- Phase 0 Battle Refactor: 8 / 8
- Phase 1 Unit/Army: 13 / 13
- Phase 2 Army Marching: 10 / 10
- Phase 3 Domestic MVP: 13 / 13
- Phase 3 static: 10 / 10
- Phase 3 DOM: 3 / 3
- existing static checks: 34 / 34
- Phase 2 static: 8 / 8
- Phase 2 DOM: 3 / 3
- v1 Phase 1/2/3 suites: 25 / 18 / 25 PASS
- longSimulation: PASS
- diplomacySimulation: PASS
- eventSimulation: PASS
- eventStress: PASS
- releaseSimulation: PASS
- saveStabilitySimulation: 200 cycles / 3 corruption recoveries / PASS
- 全JS `node --check`: PASS

実機iPhone/Androidのタッチ操作は自動テストでは保証していないため、GitHub Pages上で手動確認が必要です。

## 次Phase
次はTactical接続の前準備として、Battle Request / BattleAdapter境界を実装し、Core ArmyのUnit構成からTactical初期化データを生成し、Tactical結果をBattleOutcomeへ戻す統合に進むのが本線です。
