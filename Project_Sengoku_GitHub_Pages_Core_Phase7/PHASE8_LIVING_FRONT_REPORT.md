# Project Sengoku Phase 8 — Living Front / AI Army 実装レポート

## 目的

Phase 7までのMobile Campaign / Strategic Depthを維持したまま、AI勢力もArmy Entityとして地図上を移動させ、「敵軍が近づいてくる」「味方AIが前線へ援軍を送る」というLiving Frontを成立させる。

日単位Living World、Army同士の本格迎撃、Tactical B7 AIはまだ導入しない。世界Clockは季節ターンのまま維持する。

## 実装内容

### 1. AI侵攻を物理Army化

通常プレイ中のAI侵攻は、旧`Battle.resolve()`即時攻撃ではなく、`AI.launchArmyAttack()` → `Army.deployAndMarch()`を通る。

- 城から守備兵を実際にUnitへ切り出す
- 最大3Unitを武将へ割り当てる
- `state.armies`へArmy Entityを生成
- 自領を経由した最大3区間の進軍路を使用
- 1勢力につき侵攻Armyは同時1隊まで
- 到着時のAI戦は引き続きLegacy Battleで自動解決

既存の`AI.attack()`はテスト/シミュレーション互換用の即時解決APIとして残した。

### 2. AI援軍Army

`AI.launchReinforcementArmy()`を追加。

敵Armyが自城へ向かっている場合、その城を優先して別の自城から援軍Armyを出す。脅威がない場合でも、弱い前線城へ補強を検討する。

援軍は`mission: "reinforce"`として移動し、味方城へ到着すると自動解散して守備兵へ合流する。守備兵を瞬間移動させない。

### 3. Army mission / Friendly Route

`Army`へ後方互換可能な任意フィールド`mission`を追加。

- `attack`
- `reinforce`

追加API:

- `Army.findFriendlyRoute()`
- `Army.startTransfer()`
- `Army.threatsAgainstFaction()`

schemaVersionは12のまま。旧Armyでmissionが存在しない場合はattack相当として扱う。

### 4. Living Front表示

戦略マップ上でAI Armyも既存Army markerとして可視化する。

- 侵攻軍: 「軍」
- 援軍: 「援」
- プレイヤー領へ向かう敵軍: 赤いThreat表示
- 選択城へ敵軍が接近中ならmap noteに警告と最短ETAを表示

これにより、敵攻撃が即時ダイアログではなく「近づいてくる出来事」として見える。

### 5. Simulation互換

既存の100季・Release Simulation等は、これまで通りLegacy即時解決経路を使用する。

`Turn.finishSeason`から`AI.runSeason`へ`simulation`を明示的に渡し、通常プレイと長期自動検証の挙動を分離した。これにより既存の決定論的ベースラインを維持する。

## セーブ / schema

- schemaVersion: **12のまま**
- migration: 不要
- Army `mission`は任意追加フィールド
- 既存save envelope / checksum / backup / migrate chainに変更なし

## Phase 8でまだ実装しないもの

- Army vs Armyの野戦迎撃
- 複数Army合流・分割
- プレイヤーによる援軍専用UI
- AIのTactical Battle操作（B7）
- 日単位Clock
- 連続位置progress
- 補給線・兵站遮断

## テスト結果

新規:

- Phase8 Living Front logic: **6/6 PASS**
- Phase8 static: **8/8 PASS**
- Normal-world AI Army simulation 24季: **PASS**
  - 最大同時Army: 6
  - 敵AI侵攻Army確認
  - AI援軍Army確認
  - 16 battle
  - final validation PASS

既存回帰:

- Core: **103/103 PASS**
- Phase 0: 8/8
- Phase 1: 13/13
- Phase 2: 10/10
- Phase 3: 13/13
- Phase 4 Tactical Integration: 11/11
- BattleSpec Bridge: 7/7
- Phase 5 Siege: 9/9
- Phase 6 Mobile Campaign: 7/7
- Phase 7 Strategic Depth: 10/10
- Core static: 34/34
- 長期AI / 外交 / Event / 10,000 stress / Save 200 cycles / Release Simulation: PASS
- 全JS `node --check`: PASS

Tactical B5.x:

- 全13テストPASS
- 60戦 neutral balance: player 33 / enemy 27 / draw 0、PASS

## 実機テスト重点

1. 「敵軍が地図上で近づく」ことが一目で理解できるか
2. Threat markerが小さすぎないか
3. 敵Armyをタップして兵力・目的地を確認しやすいか
4. AI援軍の「援」表示が侵攻軍と区別できるか
5. 敵軍が到着した時に急に感じず、事前警告として機能しているか
6. 複数Armyが同時に表示されたとき地図が読めるか

## 次フェーズ候補

Phase 9は **Field Interception / Defensive Response** を推奨する。

Army同士が同一戦線で遭遇した場合の迎撃、プレイヤーが接近中の敵Armyへ対応する導線、援軍・防衛Armyの意味を強化する。ただしTactical B7や日単位化はまだ必須ではない。
