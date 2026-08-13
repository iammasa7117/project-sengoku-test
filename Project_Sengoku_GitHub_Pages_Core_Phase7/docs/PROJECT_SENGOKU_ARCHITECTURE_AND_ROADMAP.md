# Project Sengoku 正式アーキテクチャ & 開発ロードマップ

**性質: 設計専用ドキュメント。コード変更は一切行っていません。**
**前提: `PROJECT_SENGOKU_INVESTIGATION_REPORT.md`（全ファイル調査結果）を根拠に設計しています。**
**最重要目標: 「Playable Sengoku Loop v0.1」を最短距離で一周させること。Tacticalの見た目強化より優先。**

設計方針として、既存コードの「壊さない部分」（validateState、save envelope、checksum、backup世代、migration chain、event preflight→validate→commit、決定論的テスト、Tacticalの対称勝利条件、troopStrengthFactor、morale/rout挙動）は一切変更せず、その上に**追加**する形で設計しています。リネームや再構築より、既存名の温存と新規フィールドの追加を優先しました。

---

## 1. 推奨アーキテクチャ図

### 1-1. 全体構成

```
┌─────────────────────────────────────────────────────────────────────┐
│  Core (window.Sengoku)                                               │
│  ─────────────────────                                               │
│  World = 既存 state オブジェクトそのもの（新しい"World"型は作らない）      │
│   ├─ state.factions[]        既存・無改修                              │
│   ├─ state.castles[]         既存＋新規フィールド追加のみ（guardTroops等）│
│   ├─ state.officers[]        既存＋assignmentフィールド追加のみ           │
│   ├─ state.units{}           ★新規（Phase 1）                         │
│   ├─ state.armies{}          ★新規（Phase 1）                         │
│   ├─ state.diplomacy         既存・無改修                              │
│   └─ state.events            既存・無改修                              │
│                                                                        │
│  turnSystem.advance()  ── 季節ターン処理（既存・無改修）                    │
│                                                                        │
│  Battle.plan(state, params) ── 既存API、シグネチャ無改修                  │
│         │                                                             │
│         ├─ AI vs AI / 自動解決の場合                                    │
│         │     └─▶ Battle.resolveLegacy(state, plan) → BattleOutcome   │
│         │                                                             │
│         └─ プレイヤー主導でTactical選択時                                │
│               └─▶ BattleAdapter.startTacticalBattle(state, plan) ★新規 │
└────────────────────────────┼───────────────────────────────────────────┘
                              │  Coreのstateは渡さない。値のコピーのみ受け渡し
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Tactical (window.Tactical) ── コード無改修のまま独立動作を維持            │
│  T.createBattleState(seed) → T.Clock(100ms) → T.stepSimulation        │
│  → T.finishBattle() → {win, winner, seed, durationTicks,              │
│                          attackerLoss, defenderLoss, units:[...]}     │
│  （既存の結果JSONフォーマットは一切変更しない）                             │
└────────────────────────────┼───────────────────────────────────────────┘
                              │
                              ▼
              BattleAdapter.translateResult(...) ★新規
                              │
                              ▼  共通フォーマット
                    BattleOutcome { ... }  （3章）
                              │
                              ▼
              Battle.applyOutcome(state, plan, outcome) ★新規（Phase 0で抽出）
                              │
                              ▼
              Siege.resolve(state, outcome) ★新規（Phase 3）
                              │
                              ▼
              turnSystemが季節処理を再開
```

`BattleAdapter`だけが両方の名前空間を知る唯一のファイルです。Tactical側のファイルは1行も変更しません。

### 1-2. Clockの関係（5章参照）

```
World Clock（季節ターン、既存turnSystem） ──┐
                                          │ Tactical Battle開始で一時停止
                                          ▼
                          Tactical Clock（100ms fixed tick、既存T.Clock）
                                          │ finishBattle()で終了
                                          ▼
World Clock 再開 ── 次の季節処理へ
```

World Clockは**完全に独立した2本目のClockにはしません**。Playable Loop v0.1では季節ターンのまま、Tactical戦闘中だけ一時停止するモーダル的な扱いに留めます（詳細5章）。

---

## 2. データモデル

### 2-0. 前提となる設計判断

ユーザー案の`Castle.economy`や`Officer.stats`のような**入れ子オブジェクト化はここでは採用しません**。既存コードは`castle.income`・`castle.defense`・`officer.leadership`等をすべてトップレベルのフラットなフィールドとして扱っており（`domesticSystem.js`、`aiSystem.js`、`eventSystem.js`のselector、`debugPanel.js`のstateダンプ、`renderOfficers.js`の描画など、非常に広範囲から直接参照）、入れ子構造への変更はほぼ全システムファイルに影響する破壊的リネームになります。実利益（可読性の向上）に対してリスクが不釣り合いに大きいため、`economy`・`stats`は本ドキュメント内での**概念上のグルーピング名**として扱い、実データは既存どおりフラットな追加フィールドとします。

同様に、`World`という新しいラッパー型も作りません。既存の`state`オブジェクトが実質的にWorldの役割を担っており、新規に`state.units`・`state.armies`を追加するだけで十分です。

### 2-1. Castle（既存フィールドは維持、追加のみ）

```
Castle（既存・無改修）
- id, name, factionId
- troops        ← 既存名を維持。後方互換ミラーとして残す（4章）
- income, defense, morale
- x, y, neighbors
- governorId

Castle（新規追加フィールド）
- guardTroops   ← 新しい Source of Truth。troopsと常に同値（4章）
- population    ← Phase 2、内政MVP（6章）
- (agriculture, commerce, security は SHOULD/LATER、6章)
```

`stationedOfficerIds`のような配列は**追加しません**。既存の`officerSystem.js`にすでに`O.atCastle(state, castleId)`という検索関数があり、`officer.location`側から逆引きできるため、Castle側に重複した配列を持たせると双方向同期のバグ源になります（調査レポート13章で指摘した「重複処理」パターンと同種のリスク）。Castleの隣接リストが双方向整合性を必要とする既存の`validateState`チェックと同じ理由で、片方向の参照だけを正とするのが安全です。

### 2-2. Officer（既存フィールドは維持、`assignment`のみ追加）

```
Officer（既存・無改修）
- id, name, factionId, castleId
- leadership, might, intellect, politics   ← フラットのまま維持
- loyalty, ambition, lordTrust
- health, fatigue, exp, level, merit, seasonMerit
- status: "active" | "prisoner" | "ronin"
- history[], loyaltyHistory[], battles[], rescues[]
- extension { personality, relationships, storyFlags }

Officer（新規追加）
- assignment: {
    type: "governor" | "domestic" | "army" | "idle",
    castleId: string | null,   // governor/domesticのとき
    armyId: string | null      // armyのとき
  }
```

詳細設計は7章。

### 2-3. Unit（新規、`state.units{}`）

```
Unit
- id
- factionId          // officerからも辿れるが、フィルタ高速化のため冗長保持（Tactical側のunit.sideと同じ考え方）
- officerId
- unitType            // Coreの兵種定義。Tacticalの4種(ashigaru/samurai/teppo/kiba)とキーを合わせる（3-4章）
- troops, maxTroops
- morale
- experience          // schemaには含めるが、v0.1では加算ロジックは未実装（LATER）
- status: "active" | "routed" | "destroyed"   // Tacticalの既存語彙とそのまま一致させる
- armyId              // 所属Army。null = 現在Armyに属さない（通常発生しない想定だが安全のため許容）
```

### 2-4. Army（新規、`state.armies{}`）

```
Army
- id, factionId, commanderId
- unitIds[]
- originCastleId, destinationCastleId
- route[]             // v0.1では[origin, destination]のみ。既存castle.neighborsを再利用し新規経路探索は作らない
- currentLocation      // { castleId } または { fromCastleId, toCastleId, hopsRemaining }
- status: "marching" | "arrived" | "in_battle" | "returning" | "disbanded"
```

`progress`（0-100%の連続進捗）と`supplies`（独立した兵站リソース）は**v0.1では持たせません**。5章のClock設計により移動は「1季節1hop」の離散処理のため、連続的な進捗値は不要です。詳細は8章。

### 2-5. Battle / BattleOutcome

3章で詳述します。

### 2-6. Economy / Diplomacy / Event の責務境界

- **Economy**：新しい型は作らず、`domesticSystem.js`（城レベルの数値操作）と`turnSystem.js`（季節ごとの資源処理）と`S.Config.Balance`（数値チューニング）の既存3点分割をそのまま踏襲し、6章のMUST項目をこの3ファイルに追加する形にします。
- **Diplomacy / Event**：本設計では**一切変更しません**。`diplomacySystem.js`・`eventSystem.js`は調査レポートで確認済みの通り既に成熟しており、Unit/Army導入と直接の依存関係を持たせない設計にしています（因縁・外交の戦績記録は`BattleOutcome`経由で間接的に連携するのみ）。

---

## 3. Battle統合方式

### 3-1. 現状の`battleSystem.resolve()`の分割

調査済みの通り、現在の`resolve()`は「スコア計算」と「事後処理（兵力移動・城主変更・武将移動・捕縛/逃亡・勲功・因縁記録・外交記録・ログ・勝敗判定）」が1関数に同居しています。これを次の3関数へ分割します。

```
Battle.plan(state, params)              既存のまま無改修（合戦計画の作成のみ）

Battle.resolveLegacy(state, plan)       ★新規（resolve()前半のスコア計算のみを抽出）
  → BattleOutcome を返す（stateは変更しない）

Battle.applyOutcome(state, plan, outcome) ★新規（resolve()後半の事後処理を抽出）
  → 兵力移動・武将処遇・勲功・因縁・外交記録・ログを適用（城の所有権変更は含まない、3-3参照）

Battle.resolve(state, plan)             既存の外部シグネチャを維持する薄いラッパー
  = resolveLegacy → applyOutcome → Siege.resolve(threshold=0) を内部で順に呼ぶだけ
  既存の呼び出し元（renderBattle.jsのresolveBattleFromModal等）は一切変更不要
```

この分割の要点は、**既存の`Battle.resolve`という名前と外部からの見え方を1バイトも変えない**ことです。内部だけを割ります。Phase 0（6章）ではこの分割だけを行い、新しいテストで「分割前後で同一入力に対して同一の状態変化が起きること」を確認してから次のPhaseへ進みます。

### 3-2. BattleOutcome の推奨フィールド

ユーザー案をベースに、実コードの要求から4点補強しました。

```
BattleOutcome {
  battleId,
  mode: "legacy" | "tactical",     // ★追加：どちらの解決経路で生まれたかを明示。report/デバッグ表示用

  attackerFactionId, defenderFactionId,
  winnerFactionId, loserFactionId,  // ★注意：null許容にする（下記3-2-1）

  targetCastleId,
  castleCaptured: boolean,          // ★注意：applyOutcomeでは決めない。Siege.resolveの結果を書き戻す（3-3）

  attackerLosses, defenderLosses,   // 集計値。legacy/tactical両対応
  survivingUnits: [{unitId, officerId, troopsAfter, moraleAfter}],
  routedUnits: [unitId, ...],
  destroyedUnitIds: [unitId, ...],  // ★追加：Tacticalのstatus(active/routed/destroyed)3値をそのまま持ち込むために必須。
                                     //   「壊滅」と「潰走したが生存」を区別しないとapplyOutcomeがUnitを誤って削除する

  capturedOfficerIds: [...],
  killedOfficerIds: [...],
  retreatedOfficerIds: [...],       // ★追加：既存battleSystemは捕縛/逃亡/戦死の3分岐を持つが、ユーザー案は2つしかなかった
  commanderDefeated: { officerId, resolution: "captured"|"killed"|"retreated" } | null,
                                     // ★追加：因縁・戦国記の文面生成が「敗軍総大将の処遇」単体を必要とするための便宜フィールド

  merit: [{officerId, amount}],     // legacy/tacticalで計算式が異なってよい。形だけ揃える
  intelUsed: boolean,               // legacy固有。tacticalはfalse固定でよい
  durationTicks,                    // tactical固有。legacyは0でよい
  seed
}
```

**3-2-1. 引き分けの扱い（重要な発見）**：現行の`battleSystem.resolve`は`win = attack >= defense`で必ず勝敗が決するため、引き分けを想定していません。一方、Tacticalの`step.js`は両陣営同時壊滅時に兵力差で引き分けを判定できます（`draw`）。`BattleOutcome.winnerFactionId`/`loserFactionId`は両方null（またはdraw専用の値）を許容する形にし、`applyOutcome`側に「勝者不在」の分岐を用意しておく必要があります。legacyパスはこの分岐に到達しませんが、tacticalパスは到達しうるため、ここを見落とすと**Tactical接続後にのみ再現する新種のバグ**になります。

### 3-3. 城の占領はapplyOutcomeから切り離す

現行`battleSystem.resolve`は勝利＝即座に城の所有権移転です。9章のSiege MVPを導入すると「野戦に勝っても即落城しない」ケースが生まれるため、**城の所有権変更ロジックを`Battle.applyOutcome`から`Siege.resolve(state, outcome)`という別関数へ切り出します**。legacyパスは`Siege.resolve`を閾値0（＝現状と完全に同じ「勝てば即落城」）で呼ぶことで、既存の挙動を1件も変えずに済みます。詳細は9章。

---

## 4. castle.troops移行方式

### 4-1. Source of Truth

**`castle.guardTroops`を新しい正とし、`castle.troops`（既存名）はそれと常に同値のミラーとして残します。**両方とも実データフィールドであり、どちらもgetterにはしません。

理由：Unit System導入後、城を出た兵力はUnit/Armyの`troops`が正になり、城に残っている兵力（garrison）だけが`castle.guardTroops`/`castle.troops`です。「城の総兵力＝守備兵＋派遣中の全Unitの合計」のような**合算型の派生値にはしません**。合算にすると、読み取りのたびに全Armyを走査するgetter相当の処理が必要になり、`S.Util.deepClone`（`JSON.parse(JSON.stringify)`）がgetterを静かに固定値へ焼き込む既知の罠に正面から抵触します。

代わりに「城を出た瞬間に城の数字から引き、城に戻った瞬間に城の数字へ足す」という、既存の合戦委任兵力（committedTroops）の扱いと全く同じ発想の**離散的な受け渡し**にします。

### 4-2. いつ同期するか

同期は明示的な関数呼び出し時のみに限定し、定期リコンサイルやgetterは使いません。

```
Army.deploy(state, castleId, unitSpecs)
  → castle.guardTroops -= 合計、castle.troops も同時に同じ値へ更新
  → 新規Unitを作成、Armyを作成

Army.disband(state, armyId)  /  Army.arriveAndGarrison(state, armyId, castleId)
  → 生存Unitのtroopsをcastle.guardTroops/troopsへ加算
  → Unit/Armyをstateから削除
```

`castle.guardTroops`と`castle.troops`への書き込みは**必ず同じ内部ヘルパー関数（例：`setGuardTroops(castle, value)`）を通す**という規律にし、片方だけを更新するコードパスを作らないことをルール化します。

### 4-3. save/load時の扱い

`state.units`・`state.armies`は他のstateキーと同じ**ただのプレーンデータ**です。既存の`saveSystem.js`（checksum付きenvelope、`JSON.stringify`ベース）は特別な対応なしにそのまま保存・復元できます。新規のシリアライズ処理は不要です。

### 4-4. migrateStateでの旧セーブ変換

新規`migrateV10`（既存の`migrateV09`/`migrateV08`/`migrateV07`と同じ命名規則）を追加します。

- `state.units = {}`、`state.armies = {}`を補完（存在しなければ）
- 各`castle.guardTroops = castle.troops`を補完（既存の`troops`値をそのまま正としてコピーするだけ。データの意味は変わらない＝旧セーブは「全軍が城に在籍中」という状態として自然に解釈できる）
- 破壊的な変換は一切なし。既存キャンペーンの続行に影響を与えない、純粋な追加型マイグレーションです

### 4-5. validateStateへの追加

- `castle.troops === castle.guardTroops`（新しいミラー整合性チェック。既存の隣接双方向性チェックと同系統）
- `unit.armyId`が指す`army.unitIds`に自分のidが含まれる（双方向整合性、既存パターンを踏襲）
- `army.unitIds`の各要素が実在し、`factionId`が一致する
- `unit.troops <= unit.maxTroops`かつ`>= 0`
- `unit.officerId`が指す武将の`status === "active"`かつ`assignment.type === "army"`かつ`assignment.armyId`が一致（7章と連動）

### 4-6. 一時的な二重管理による不整合の防止

- 兵力の増減は**deploy/disband/arriveAndGarrisonの3関数のみ**が担当し、他のコードから`castle.troops`や`unit.troops`を直接書き換えることを禁止するという開発規約にします（既存コードでも城主変更は`officerSystem`の共通関数経由に集約されている、という前例と同じ考え方です）。
- `validateState`（4-5）はコミットの都度走る軽量チェックに留め、「兵力保存則」（このターンに減った分＋増えた分が戦闘での実損失と一致するか）のような重い検証は既存の`longSimulation.js`/`releaseSimulation.js`と同じ位置づけの**長期シミュレーションテストの中でのみ**実施し、通常の`validateState`のホットパスには含めません。

---

## 5. Playable Sengoku Loop MUST / SHOULD / LATER

Loopの各ステップをMUST（v0.1に必須）/ SHOULD（近い将来だが v0.1のブロッカーではない）/ LATERに分類します。

### 城を持つ・内政する（6章に詳細）

- **MUST**：`castle.population`の導入、税→gold・人口上限→徴兵上限という2本の接続、Army駐留による兵糧/gold消費（維持費）
- **SHOULD**：`castle.commerce`・`castle.agriculture`を`income`から分離した独立stat化
- **LATER**：`castle.security`、建物、人口変動イベント、交易路

### 武将を配置する・兵を編成する（7章に詳細）

- **MUST**：`officer.assignment`（governor/domestic/army/idle）の導入とvalidateStateでの排他制御
- **SHOULD**：assignment変更のUI上でのわかりやすい警告・確認フロー
- **LATER**：複数武将による合議制の指揮、内政担当武将ごとの専門ボーナス

### Armyを出陣させる・隣城へ移動する（8章に詳細）

- **MUST**：`Army`エンティティ、`castle.neighbors`を再利用した1季1hop移動、`Battle.plan`との接続
- **SHOULD**：出陣コストの調整、進軍中Armyのマップ表示
- **LATER**：`progress`連続値、複数Army合流・分岐、経路探索、伏兵・迎撃

### 敵軍とTactical Battle（3・4章に詳細）

- **MUST**：`BattleAdapter`、プレイヤー主導攻撃時のみTactical接続、legacy自動解決との共存
- **SHOULD**：Tactical Battle画面への遷移演出、戦闘中断・降参コマンド
- **LATER**：AI vs AIをTacticalで実行、B6疲労/追撃、B7高度戦術AI、20v20

### 戦闘結果をCoreへ返す・城を攻略する（3・9章に詳細）

- **MUST**：`Battle.applyOutcome`、簡易`Siege.resolve`（9章）
- **SHOULD**：僅差勝利時の再攻城猶予演出
- **LATER**：本格攻城戦（破城槌・櫓・兵糧攻め・時間経過ダメージ）

### 占領した城を統治する

- **MUST**：既存の城主再任命ロジック（`officerSystem`）をそのまま再利用。新規ロジック不要
- **SHOULD**：占領直後の治安/忠誠への影響（既存`loyaltySystem`の入力を1つ増やすだけ）
- **LATER**：占領地特有のイベント、旧勢力住民の反乱

---

## 6. Phase別ロードマップ

各Phaseは「前のPhaseの全テストが通り続けていること」を開始条件とします。**Phase 4で初めてCoreとTacticalが実際に接続されます。**

### Phase 0 — Battle関数の安全な分割（新機能なし）

- **目的**：3章の分割を行い、この後の全Phaseが依拠する土台を作る。Unit/Armyはまだ1行も書かない。
- **変更対象ファイル**：`src/systems/battleSystem.js`のみ
- **新規ファイル**：なし
- **schemaVersion変更**：なし（v10のまま）
- **必要なmigration**：なし
- **必要なテスト**：既存103/103回帰の全PASS維持。加えて「分割前後で同一plan入力→同一の状態変化・同一のBattleOutcome相当値」を確認するゴールデンテストを新規追加
- **完了条件**：既存テスト全PASS、かつ`resolveLegacy`/`applyOutcome`が単体で呼び出し可能

### Phase 1 — Unit/Armyデータモデル導入（戦闘とは未接続）

- **目的**：`state.units`/`state.armies`を追加し、`castle.guardTroops`とのミラー関係を成立させる。プレイヤー向けUIはまだ変更しない
- **変更対象ファイル**：`schema.js`、`createInitialState.js`、`validateState.js`、`migrateState.js`、`officers.js`／`officerSystem.js`（assignment追加）
- **新規ファイル**：`src/systems/unitSystem.js`、`src/systems/armySystem.js`、`src/data/unitTypes.js`
- **schemaVersion変更**：**10 → 11**
- **必要なmigration**：`migrateV10`（4-4参照、非破壊的追加のみ）
- **必要なテスト**：unitSystem/armySystemの単体テスト、validateState新規チェックのテスト、v10セーブ→v11ロードの継続性テスト、既存103/103回帰維持
- **完了条件**：デバッグパネルから手動でUnit/Armyを作成・破棄でき、新しいvalidateState不変条件を含めて全PASS

### Phase 2 — 内政MVP拡張 + Officer Assignment

- **目的**：5-6章のMUST項目（population/税/徴兵上限/維持費）と、`assignment`変更のUIを実装
- **変更対象ファイル**：`domesticSystem.js`、`balance.js`、`turnSystem.js`、`renderOfficers.js`、`renderModals.js`
- **新規ファイル**：なし（既存拡張で対応）
- **schemaVersion変更**：**11 → 12**（`castle.population`等の必須フィールド追加）
- **必要なmigration**：`migrateV11`（既存城へのデフォルト値補完）
- **必要なテスト**：人口→税・徴兵上限、農業→兵糧→維持費の循環がNターン破綻しないことを検証するシミュレーションテスト
- **完了条件**：新指標が季節ごとに矛盾なく変化し、validateStateの範囲チェックを含めて全PASS

### Phase 3 — Army出陣・移動（まだTacticalとは未接続）

- **目的**：プレイヤーがArmyを編成し隣接城へ進軍、到達後は`Battle.resolveLegacy`で瞬間解決。**この時点でPlayable Loopが「Tactical Battle以外」の全工程で一周する**
- **変更対象ファイル**：`aiSystem.js`（攻撃判断の対象をArmy経由に更新。判断ロジック自体は不変）、`battleSystem.js`、`turnSystem.js`（Armyの1季1hop移動処理）、`renderMap.js`／`renderOfficers.js`
- **新規ファイル**：`src/systems/siegeSystem.js`（閾値0でlegacy接続、9章）
- **schemaVersion変更**：なし（v12のまま。Armyの形はPhase 1で確定済み）
- **必要なmigration**：なし
- **必要なテスト**：編成→進軍→到達→`resolveLegacy`→`Siege.resolve(threshold=0)`→占領、の結合テスト。既存の即時攻撃経路も並行して回帰確認
- **完了条件**：Playable Loopが戦闘部分を除いて一周する

### Phase 4 — BattleAdapter + Tactical接続 ★CoreとTacticalがここで初めてつながる

- **目的**：`BattleAdapter`を実装し、プレイヤー主導の攻撃についてTactical Battle画面を起動できるようにする
- **変更対象ファイル**：`battleSystem.js`（呼び分け追加。デフォルトはlegacy）、`renderBattle.js`（Tactical起動導線）
- **新規ファイル**：`src/systems/battleAdapter.js`（Tactical側は無改修）
- **schemaVersion変更**：なし
- **必要なmigration**：なし
- **必要なテスト**：Adapterの往復変換（plan→Tactical初期化スペック、Tactical結果→BattleOutcome）の単体テスト、同一seedでの決定論再現テスト。Tactical既存13スイートは無改修のため影響なし
- **完了条件**：プレイヤーがArmyを出し、隣城でTactical Battle画面が開き、結果がCoreへ反映されて城を占領できるところまでが1本のプレイフローとして通る

### Phase 5 — Siegeの本接続 + 占領後統治の確認

- **目的**：Tactical経由の結果に対して`Siege.resolve`を非ゼロ閾値で適用し、占領後処理（城主再任命・士気低下など既存ロジックの再利用）が違和感なく機能するか確認
- **変更対象ファイル**：`siegeSystem.js`（閾値パラメータ化）
- **新規ファイル**：なし
- **schemaVersion変更**：なし
- **必要なmigration**：なし
- **必要なテスト**：僅差勝利で城が落ちない分岐、圧勝で即落城する分岐の両方をカバーするシナリオテスト
- **完了条件**：**Playable Sengoku Loop v0.1が、Tactical Battleを経由した占領まで含めて完全に一周する。ここがv0.1のゴール**

### Phase 6以降（v0.1範囲外・参考）

AI vs AIをTacticalで実行する場合の検討、B6疲労/追撃、B7戦術AI、内政SHOULD/LATER項目、Personality/Traitコンテンツ投入など。8章参照。

---

## 7. Critical Risks

- **兵力の二重計上／消失**：`guardTroops`⇔Unit間の受け渡しを専用関数以外が行うと、兵力が増減どちらの方向にもズレうる。対策は4-6の「専用関数への集約＋長期シミュレーションでの保存則チェック」。
- **`deepClone`のgetter地雷**：Unit/Army関連で将来誰かが派生値をgetterで実装すると、`eventSystem`のpreflightクローンと本クローンが静かに乖離する。**stateツリー内は常に生データのみを持ち、計算値はUI層かread-time専用の純粋関数で扱う**、という原則をこの段階でチーム内ルールとして明文化しておくべきです。
- **Battle分割時の外部互換性破壊**：Phase 0でのリファクタ中に、`renderBattle.js`等の呼び出し側が気づかぬうちに挙動が変わるリスク。対策はゴールデンテスト（分割前後で同一入力→同一出力）。
- **legacyとTacticalのBattleOutcome意味論の不一致**：引き分けの扱い（3-2-1）、勲功計算式の違いなど、両モードで完全に同一の意味論を保証できない箇所がある。`mode`フィールドで出自を明示し、`applyOutcome`側で分岐を許容する設計（3章）で吸収します。
- **schemaVersion連続バンプによるセーブ互換破壊**：Phase 1・2で v10→v11→v12 と連続してバンプするため、各Phaseで移行前後の状態に対する`validateState`とプレイ継続確認テストを省略すると旧セーブが壊れます。
- **AIの判断ロジックとデータモデルのズレ**：`aiSystem.js`が`castle.troops`を直接読み書きしている既存箇所が、Unit/Army導入後に取り残されると、AIだけ旧モデルのまま動いてプレイヤー側の新モデルと矛盾します。Phase 3で該当箇所の棚卸しが必須です。
- **Adapter経由での決定論の崩壊**：CoreとTacticalの乱数消費タイミングが噛み合わないと、既存テストが前提とする「同一操作は同一結果」が壊れます。対策は「Adapterが Core の決定論的RNGから1回だけseedを払い出し、Tactical内部はそのseedのみで完結させる」という設計（4-4章図の通り、Tactical側は無改修）。
- **UI合成方法の未決定**：Core画面とTactical画面をどう1つの体験としてつなぐか（別画面遷移かモーダルオーバーレイか）はPhase 4で初めて具体化する、意図的な未決定事項です。

---

## 8. 今やらないもの

ユーザー提示の候補はすべて後回しが妥当と判断しました。

| 項目 | 判断 | 理由 |
|---|---|---|
| B5.4の見た目polish | 後回し | どのLoopステップにも寄与しない |
| B6 fatigue/pursuit | 後回し | Tactical単体の深化。Core接続（v0.1のゴール）を遅らせるだけ |
| B7 高度戦術AI | 後回し | 10章の通り、v0.1ではAIはTactical画面を使わない（AI vs AIはlegacy継続）ため技術的に不要 |
| 20v20 | 後回し | 密度/パフォーマンス調整より、7v7で最初のLoopを一周させる方が優先度が高い |
| 本格Siege | 後回し | 9章のMVPで「野戦結果が意味を持つ」ことは達成できる |
| 全国マップ | 後回し | 現状12城で最初のLoop検証には十分 |
| Personality/Trait/Storyコンテンツ大量追加 | 後回し | Loopが一周しない状態でコンテンツを増やしても検証できない。ただし「仕組み」自体は既に実装済みのため、着手タイミングはいつでも選べる |
| 日単位Living World完全化 | 後回し | 5章の結論通り、v0.1は季節ターンのままで十分。Army移動は1季1hopで足りる |

**AI MVP（10章）の結論として追加で後回しにできるもの**：AIがTactical Battle画面を使うケース全般（AI vs AI、AI攻撃をプレイヤーが観戦するケース）。v0.1ではAI関与の戦闘はすべてlegacy自動解決に統一し、Tactical Battleはプレイヤー主導の攻撃のみに限定します。これによりB7の後回し判断がより強く裏付けられます。

---

## 9. 補足：Siege MVP と Officer Assignment の詳細設計

（本文3・7章で触れた内容の実装イメージを補足します。設計のみで、コードではありません。）

### Siege MVP（Q9への回答）

```
Siege.resolve(state, outcome, threshold) {
  if (outcome.winnerFactionId !== attackerFactionId) return  // 野戦で負けていれば城は無傷
  defenseScore = castle.defense + castle.guardTroops相当値
  attackScore  = outcome.survivingUnitsの合計troops（legacyはcommittedTroops - losses）
  if (attackScore > defenseScore * threshold) {
    castle所有権を移転（既存の城主再任命ロジックをそのまま再利用）
    outcome.castleCaptured = true
  } else {
    castle.guardTroops/defenseに軽微なダメージのみ。Armyは隣接地に留まり翌季再攻撃可能
    outcome.castleCaptured = false
  }
}
```
`threshold = 0`で呼べば既存の「勝てば即落城」と完全に同じ挙動になるため、legacyパスは無改修同然で導入できます。

### Officer Assignment の排他制御（Q7への回答）

`assignment`の変更は必ず次の順で行う共通関数（例：`Officer.reassign(state, officerId, newAssignment)`）に集約します。

1. 現在の`assignment`に応じて、`castle.governorId`のクリア／`army.commanderId`または`unit.officerId`からの除去を先に行う（既存の`officerSystem.clearGovernorAssignments`と同じ「先に古い役割を外してから新しい役割を与える」パターン）
2. 新しい`assignment`を設定し、対応する側（castle.governorId、army.commanderId等）を更新
3. `validateState`が「同一officerIdがcastles[].governorId／armies[].commanderId／units[].officerIdの合計で1回しか出現しない」ことを検証（既存の単一城主制チェックを役割全体へ一般化したもの）

これにより「城で内政しながらArmyにも所属する」という矛盾は、構造的な共通関数と、保険としてのvalidateStateチェックの二重で防止されます。

---

以上、コード変更は行っていません。次にコードへ着手する場合は、Phase 0（Battle関数の分割のみ、新機能なし）から始めることを推奨します。
