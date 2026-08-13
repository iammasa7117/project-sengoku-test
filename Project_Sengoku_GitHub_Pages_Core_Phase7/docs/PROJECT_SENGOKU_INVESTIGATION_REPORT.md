# Project Sengoku 実装調査レポート

**性質: 調査専用ドキュメント。コード変更は一切行っていません。**
**対象: `Project_Sengoku_Core_v1_0_1_TestPlay_Fixed`（Core）と `Project_Sengoku_Tactical_B5_3`（Tactical）の全ファイル。**
**方法: 全ソースファイルの直接読了に加え、両プロジェクトのテストスイートを実際に`node`で実行し、ドキュメントの主張を実行結果で裏取りしています。**

凡例: **実装済み**＝動作するコードとして存在／**部分実装**＝一部の経路・範囲のみ存在／**設計だけ存在**＝ドキュメント・仕様のみでコードなし／**未実装**＝存在しない。

---

## 1. どんな種類のゲームか

現状のリポジトリは**1つのゲームではなく、2つの独立したプロトタイプ**です。

- **Core**：季節ターン制（春夏秋冬）の戦国戦略シミュレーション。城を選び、内政・徴兵・外交・合戦を指令し、季節を進めて天下統一を目指す。合戦は瞬間解決（数式1回で勝敗決定）。
- **Tactical**：Coreとは完全に切り離された、リアルタイム（固定tick）の7 vs 7小規模戦術バトル単体プロトタイプ。兵種相性・向き（正面/側面/背後）・突撃・鉄砲を持つ「面白いかどうか」だけを検証するための独立ビルド。

両者はまだ**コード上は一切つながっていません**（詳細は12章）。「今のプロジェクト」を理解するとは、この2つを別々に理解することとほぼ同義です。

---

## 2. 実装の全体進捗

| 領域 | 状態 |
|---|---|
| Core: 戦略レイヤー（城・勢力・武将・内政・外交・イベント・セーブ・合戦解決） | **実装済み**（テスト103/103 PASSを本調査でも再実行し確認） |
| Core: 正式コンテンツ（人物・城・物語） | **未実装**（データは「検証用仮コンテンツ」と明記） |
| Core: 性格/特性/物語アークの中身 | **設計だけ存在**（仕組みは完成、登録データは空） |
| Tactical: リアルタイム戦闘の中核ルール（相性・向き・兵力減衰・士気・突撃・鉄砲） | **実装済み**（B1-B4時代の致命的バグは全て修正済み。後述） |
| Tactical: モバイル操作UI（B5.3） | **実装済み**（設計時に想定した範囲で） |
| Tactical: 戦術AI（敵の高度な行動） | **部分実装**（最寄り敵への固執attackのみ。ドキュメント上も「Phase B7」として明示的に未着手） |
| Core ⇔ Tactical の統合（Unit System・Battle統合） | **設計だけ存在**（本エンジンが以前作成した設計書のみ。コードは0行） |

---

## 3. Core側に何があるか

`index.html` の`<script defer>`読み込み順がそのまま依存関係を表しています（namespace→config→data→state→systems→ui→main）。全て `window.Sengoku` 単一グローバル名前空間、ES Modules不使用、`file://`直起動、外部依存ゼロ。

### データ層 (`src/data/`)
- `castles.js`：城12件（`owari_short`用「本番」4件＋`core_campaign`用「TEMP CONTENT」8件、`// TEMP CONTENT: Core system verification data. Replace during Content Alpha.` とコード内に明記）。
- `factions.js`：勢力4件（蒼月家/朱鳥沢家/雪代家/黒鉄家（仮）。黒鉄家はTEMP CONTENT）。
- `officers.js`：`officer()`ファクトリ関数で武将オブジェクトを生成。統率/武勇/知略/政治などのstat、忠誠/野心/主君信頼、健康/疲労/経験/レベル、状態(`status`: active/prisoner/ronin)、`extension{personality, relationships, storyFlags}`を持つ。名前付き武将6名＋TEMP武将10名の計16名（`core_campaign`の「各勢力最低4武将」という仕様と一致）。
- `diplomacy.js`：外交ステータス・条約期間・提案寿命・戦争疲弊・評価重みなどの定数データ。
- `difficulties.js`：easy/normal/hardの3難易度、各約20項目の数値パラメータ。
- `contentPacks.js`：イベントの実データ（`seasonEvents`＝非ブロッキングの季節演出、`openingEvents`＝唯一のブロッキング型イベント「尾張開戦評定」）。
- `eventExtensions.js`：`PersonalityRegistry`/`TraitRegistry`/`StoryArcRegistry`を**意図的に空で出荷**（コード内コメントで明言）。

### 状態・検証層 (`src/state/`)
- `schema.js`：`schemaVersion: 10`、`gameVersion: "core-0.95"`。
- `createInitialState.js`：シナリオ+難易度+勢力/城/武将データから初期stateを構築。
- `validateState.js`（188行）：戦役・勢力・城（隣接双方向性、城主整合性）・武将（状態遷移規則、stat範囲）・捕虜・因縁・武将関係・外交（全ペア存在、条約期限規則）・従属（循環検出）・pendingBattle・イベントengine内部状態まで網羅する不変条件チェッカー。**Coreの安全網の中核**。
- `migrateState.js`：v10→v9→v8→v7→legacyの移行チェーン、`repairState`（troops負値修正、隣接双方向性修復、城主・捕虜整合性修復など）。

### システム層 (`src/systems/`) — 13ファイル、全て実装済み
officerSystem / relationshipSystem / loyaltySystem / rivalrySystem / prisonerSystem / diplomacySystem / eventSystem / releaseSystem（難易度バランス調整の共通デリゲート層）/ domesticSystem / battleSystem / aiSystem / turnSystem / uxSystem / victorySystem。各詳細は5〜10章。

### UI層 (`src/ui/`) — 12ファイル
SVGベースの地図（`renderMap.js`）、城詳細/武将詳細（`renderOfficers.js`）、合戦（`renderBattle.js`＝**単一モーダルで即時解決**）、外交（`renderDiplomacy.js`）、イベント（`renderEvents.js`）、各種モーダル（`renderModals.js`）、案内・アクセシビリティ（`uxGuide.js`）、デバッグパネル（`debugPanel.js`：state全体のJSONダンプ、100季シミュレーション、全勢力AIシミュレーションなどを持つ）。

### テスト（本調査で再実行し確認）
```
node tests/nodeHarness.js                  → 103 / 103 PASS
node tests/nodeHarness.js tests/v1Phase3Tests.js → 25 / 25 PASS
node tests/staticChecks.js                 → 34 / 34 PASS（selector/condition/effect全型登録検証含む）
find . -name '*.js' | xargs -n1 node --check → 全ファイル構文エラーなし
```
`TEST_RESULTS.md`が主張する103/103、34/34は実行結果と一致。長期シミュレーション（`longSimulation.js`＝100季×3、`diplomacySimulation.js`＝8構成×200〜300季、`eventStress.js`＝emit 10,000回、`releaseSimulation.js`＝4勢力×3難易度×240〜360季）はコード上存在を確認（ドキュメント記載の実行コマンドと一致）。**Safari/Chrome/iPhoneでの実機手動操作は未実施**であることがREADME/TEST_RESULTS.md双方に明記されています。

---

## 4. Tactical Battle側に何があるか

`prototype/tactical/index.html`から`window.Tactical`名前空間へ、rng→vec→clock→unitTypes→battleUnit→battleState→movement→combat→morale→step→render→input→hud→mainの順でscript defer読込。Coreと同様、外部依存ゼロ・`fetch()`不使用・`file://`直起動。

B1-B4（旧世代）→B5→B5.1→B5.2→B5.3という段階的改修の履歴が`B5_IMPLEMENTATION_NOTES.md`〜`B5_3_IMPLEMENTATION_NOTES.md`に残っており、**各段階が実際の人間プレイテストのフィードバックに対応して行われた記録**になっています（後述14章）。

### コアモデル (`js/model/`)
- `unitTypes.js`：ashigaru（足軽, speed13, attack0.8, defense1.4, canCharge:false, 対騎馬役）/ samurai（侍, speed15, attack1.5, defense0.9, canCharge:true, chargeMultiplier1.35）/ teppo（鉄砲, speed10, attack2.2/meleeAttack0.45, defense0.4, range200, reloadTicks24）/ kiba（騎馬, speed32, attack1.2, defense0.7, canCharge:true, chargeMultiplier1.7）の4兵種。
- `battleState.js`：`T.FIELD = {width:1600, height:760, margin:42, enemyBaseDepth:78, playerBaseDepth:78}`。7 vs 7固定編成（`types=[足軽,足軽,足軽,騎馬,騎馬,鉄砲,侍]`, `troops=[1000,1000,1000,800,800,600,900]`、両軍完全対称）。`selectedUnitIds:[]`（将来のマルチ選択用の設計上の受け皿、現状未使用）、`ui:{rosterCollapsed:false}`を保持。

### シミュレーション層 (`js/sim/`) — 実装済み・本調査で自動テスト再実行済み
- `movement.js`：単一目的地移動に加え、`routePoints`配列による複数経由点ルート、ルート完了時に`plannedOrder`へ応じて攻撃/突撃/待機へ自動遷移。射程武器は射程の88%で自動停止。
- `combat.js`（130行、全文確認済み）：
  - 兵種相性表 `MATCHUP`（例：kiba→teppo 1.6倍、ashigaru→kiba 1.3倍、kiba→ashigaru 0.8倍）
  - 方向補正表 `DIRECTION`：front{damage:1.0, morale:1.0} / flank{1.5, 2.0} / rear{2.2, 3.0}
  - `C.troopStrengthFactor(u) = sqrt(clamp(troops/maxTroops, 0, 1))` — 兵力比を平方根スケールでダメージに反映
  - `C.previewLosses` — 相性×方向×兵力比×士気×突撃倍率×乱数ジッタを合成する最終ダメージ式
  - `C.fightPairs` — 全ペアの被害を先に集計してから兵力減算→士気適用（`deferRout`指定で潰走判定を後回し）→撃破判定→潰走判定、という2段階処理で処理順依存バグを回避
  - `C.rangedFire` — 鉄砲の自動照準・sticky target・再装填タイマー・曳光効果
  - `MIN_CHARGE_DISTANCE=70`、`CHARGE_COOLDOWN=180`tick
- `morale.js`：潰走伝播半径140px（内側80pxで-12、外側で-7）。
- `step.js`：**勝敗条件は両陣営対称**（5部隊撃破 or 総大将不在/撃破 or 生存部隊0、のいずれかで敗北）。同時成立時は残存兵力で引き分け判定。`enemyAutoOrders`が12tickごとに「既存の有効な目標があれば固執、なければ最寄り」という敵の自動行動を実装（後述7章・戦術AIの実体はこれのみ）。

### UI層 (`js/ui/`)
- `render.js`：Canvas描画。`R.pickUnitNear`/`R.clientPxToWorld`でCSSピクセル→ワールド座標のデバイス依存スケーリングを行い、実機の指幅に対応。ドラッグ中は`drawAttackZones`で正面/側面/背後ゾーンをリアルタイム表示。
- `input.js`：Pointer Events統一（マウス/タッチ分岐なし）。`I.classifyRelease(unit, points, pos)`が唯一のジェスチャー意図分類関数（空地→移動、敵上→攻撃、突撃可能兵種+助走距離達成+側面/背後進入→突撃候補）。定数：`DRAG_THRESHOLD_PX=11`, `LONG_PRESS_MS=480`, `TARGET_SNAP_PX=42`。
- `hud.js`：選択パネル、ロースター（下部部隊カード、選択専用・折り畳み可）、速度切替、ジェスチャーバッジ、リザルト表示。

### テスト（本調査で13ファイル全て実行し確認、TEST_RESULTS.mdの主張と完全一致）
```
b5_1_feedback_test.js     11/11 PASS
b5_1_maneuver_test.js     PASS（歩兵拘束→騎馬側面突入→FLANK!発火のシナリオ検証）
b5_2_route_test.js        7/7 PASS
b5_2_static_test.js       10/10 PASS
b5_3_mobile_ui_test.js    14/14 PASS
b5_3_static_test.js       14/14 PASS
b5_determinism_test.js    2/2 PASS
b5_rules_test.js          20/20 PASS
b5_static_test.js         12/12 PASS
balance_simulation.js     60試合中 player 33 / enemy 27 / draw 0（勝率55.0%、35-65%許容帯内でPASS）
baseline_fix_test.js      5/5 PASS
tactical_logic_test.js    9/9 PASS（B1-B4時代からの後方互換テスト）
troop_strength_test.js    4/4 PASS
```
全JSファイルの`node --check`もエラーなし。README同様、**実機タッチ操作の自動テストは未実施**と明記。

---

## 5. 城/勢力/武将/兵力の現在のデータ構造

Core側とTactical側で**兵力の表現が根本的に異なります**。これは統合設計（8章参照）の出発点です。

**Core**：`castle.troops`は城1つにつき1つの生の数値（プールされた兵力）。武将は城に「配属」されるだけで、兵力を個別に指揮しない。合戦は`castle.troops`の一部を`committedTroops`として切り出し、1回の数式で解決。

**Tactical**：兵力は`Unit`オブジェクト（`battleUnit.js`の`T.createUnit`）が個別に保持する`troops`/`maxTroops`。1体のUnitが1人の武将（`officerId`, `officerName`, `isCommander`）に紐付き、位置・向き・進行状態・突撃状態などを持つ。

現状、**この2つのデータモデルを橋渡しするコードは存在しません**（`castle.troops`から`Unit`を生成する関数、逆に`Unit`の結果を`castle.troops`へ反映する関数、いずれも0行）。これは本エンジンが以前提示した設計書（`UNIT_AND_TACTICAL_BATTLE_DESIGN.md`）で「Unit Systemを追加し、`castle.troops`は削除せず派生値として同期する」という方針を示した対象そのものですが、**その設計はまだコード化されていません**（設計だけ存在）。

---

## 6. 戦闘システムの構造

Coreと Tacticalに、**役割の異なる2つの戦闘システムが実装済みとして存在**しています。

### Core: `battleSystem.js`（瞬間解決型）
`B.plan`（合戦計画=`Battle.start`相当）→`B.resolve`が単一の同期関数。指揮官/副将stat、戦術・戦場判断の倍率、偵察による情報補正、難易度補正、`releaseSystem`によるバランス補正、乱数ジッタを合成して`attack`/`defense`スコアを算出し、`attack >= defense`で勝敗確定。**同じ関数の中で**兵力移動、城主権の移動、城主再任命、敗北武将の逃亡/捕縛判定（因縁システムとの再戦チェック経由）、捕虜化、勲功付与、外交への戦績記録、戦国記/ログ追記、勝利判定チェックまで、**約30行にわたる事後処理が全てインラインで実行**されます（技術的負債として9章で詳述）。UIからは`renderBattle.js`の`resolveBattleFromModal`が`Battle.start`→即座に`Battle.resolve`を呼ぶだけで、**非同期・リアルタイムの合戦UIはCoreに一切存在しません**。

### Tactical: リアルタイムtickシミュレーション
`T.Clock`（tick=100ms、速度倍率0/1/3）が`T.stepSimulation`を毎tick呼び出し、`movement.js`→`combat.js`（`resolveContacts`→`fightPairs`）→`morale.js`という順で兵種相性・方向・兵力比・突撃・鉄砲を考慮した継続的な戦闘を解決します。

両者は**現状、完全に独立**しており、共通の「戦闘結果を確定する」関数（本エンジンの設計書で提案した`Battle.applyOutcome`）は存在しません。

---

## 7. AIが現在何をしているか

### Core: `aiSystem.js`（実装済み・テスト済み）
優先順位付きフォールバック型の行動ツリーです。`A.takeAction`が「援軍要請が必要か→内政が貧弱なら開発→兵力が弱いなら徴兵→攻撃候補があれば攻撃→武将移動→訓練」の順で1つを選択して実行。別途`A.takeDiplomaticAction`が劣勢時の和平/停戦、共通脅威への同盟提案、弱小隣国への合法な宣戦、捕虜交換、降伏勧告、従属提案、条約更新などを判断します。`A.simulateAll`のような一括シミュレーション関数を通じ、`longSimulation.js`/`releaseSimulation.js`で数百季分検証済み（3章参照）。学習型・適応型ではなく、あくまでルールベースの優先度分岐です。

### Tactical: 戦術AIは**部分実装**
`step.js`内の`enemyAutoOrders`が唯一の「敵の頭脳」で、12tickごとに「既存目標が有効ならそれを継続（sticky）、なければ最も近い敵に攻撃指令」を出すだけです。側面へ回り込む、退却する、複数部隊を連携させるといった**戦術的判断は一切ありません**。プロジェクト自身のドキュメント（`B5_IMPLEMENTATION_NOTES.md`）が「Tactical AI is Phase B7」と明記しており、これは見落としではなく**意図的に後回しにされた既知の未着手項目**です。`balance_simulation.js`の60試合55.0%勝率は、この単純な最寄り攻撃 AI同士がミラー対戦した結果であり、高度な戦術AIの検証ではない点に注意してください。

---

## 8. 外交/忠誠/捕虜/イベント/セーブの実装方法

いずれも**実装済み**で、Core側で最も作り込まれている領域群です。

### 外交 (`diplomacySystem.js`)
`neutral/war/ceasefire/non_aggression/alliance`の5状態を勢力ペアごとに保持（`D.pairKey`で正規化したキー）。条約延長・破棄、関係改善、援助、援軍要請、捕虜交換、従属化（`overlord`/`subject`の方向付き構造、貢納・独立クールベース・循環検出付き）、独立、降伏勧告まで一通り実装。AIへの提案は`D.evaluateProposal`が関係値・信頼・遺恨・評判・国力比・城数・共通国境・共通敵・戦争疲弊・使者の政治力・条約破棄歴・難易度・乱数を重み付け合成してその場で採否評価。プレイヤーへの提案は`pending`状態でセーブされ、外交画面で応答します。季節ごとの処理順序はREADME.mdに明記：①条約期限→②提案期限→③貢納→④戦争疲弊→⑤AI外交→⑥AI内政軍事→⑦勢力滅亡・勝敗、で`processedTurn`により二重実行を防止。

### 忠誠・関係・因縁（3つの独立した仕組み）
- `loyaltySystem.js`：忠誠変化・離反リスク計算（`(100-loyalty)*0.82 + grievance*0.72 + ambition*0.22 + neglect*5 - lordTrust*0.12`、約束破りで+28）、`processDefections`が乱数判定でリスク75以上の武将を離反させる。
- `relationshipSystem.js`：`state.relationships.officers`に保存される武将ペアの単純な好感度値。
- `rivalrySystem.js`：`state.rivalries`に保存される宿敵/遺恨トラッキング（`recordBattle`、`treat`＝厚遇/辱め/誓約で釈放後の関係が分岐）。
これら3つは**意図的に別々のデータ構造**として分離されており（CHANGELOGにも「v0.8→v0.9で武将関係を`state.relationships.officers`へ分離した」と明記）、混同されていません。

### 捕虜 (`prisonerSystem.js`)
`capture`/`release`/`recruit`（登用成功率は登用者の政治+知略と捕虜の忠誠の差、および「約束」「厚遇」手法で補正）。

### イベント (`eventSystem.js`、355行、Core最大かつ最複雑なファイル)
データ駆動型：selector（約29種：triggerOfficer/randomOfficer/highestStatOfficer/weakestBorderCastleなど）、condition（約46種：戦役/勢力/城/武将/外交/イベント状態を安全な演算子11種で評価）、effect（約60種：flags/counters/資源/城/武将stat/外交/物語アークなど）の3つのホワイトリストで構成。**preflight→検証→commitの2段階トランザクション**（`resolveTransaction`）が肝で、まず状態のクローン上で全effectを試験実行してエラーを収集し、問題なければ別クローン上で本実行、`validateState`で最終検証してから初めて実際のstateへcommitします。Story Arc（`E.Arc`：開始/step変更/進行/完了/失敗の状態機械）も実装済みですが、**personality/trait/story arcの実データは0件**（`PersonalityRegistry`等が意図的に空で出荷、5章・9章参照）。有効なContent Packは`core_season_events`（非ブロッキング演出）と`core_opening_events`（唯一のブロッキングイベント）のみ。

### セーブ (`saveSystem.js`、351行)
`ENVELOPE_FORMAT="project-sengoku-save"`、FNV-1a方式チェックサム、オートセーブ・手動3スロットそれぞれ**3世代ローリングバックアップ**。書込みは一時キー→検証→本番確定の段階的コミット。異常状態検知時はメモリ上のランタイムチェックポイントへ自動復旧。legacy救済チェーンはv0.2〜v0.8まで遡って対応。README記載の「200回保存・読込、意図的破損3回中3回自動復旧」はコード（`saveStabilitySimulation.js`）として存在を確認しています。

---

## 9. 城の内政管理（内政）がどこまで進んでいるか

**部分実装**。`domesticSystem.js`が持つ命令は5つのみです。

| 命令 | 効果 | コスト |
|---|---|---|
| `executeDevelopment` | `castle.income` 増加 | 金 |
| `executeRecruitment` | `castle.troops` 増加 | 金＋兵糧、戦争疲弊でペナルティ |
| `executeTraining` | `castle.morale` 増加 | 兵糧 |
| `executeRest` | 武将の疲労回復（`officerSystem.rest`へ委譲） | ー |
| `executeScout` | `state.events.intel[targetId]=3` を設定 | 金 |

ユーザーが以前の仕様メッセージ（Phase F）で言及した「人口/農業/商業/治安/食料/金」を個別の建物付きで管理する、より豊かな内政システムは**未実装**です。現状の内政は「収入・兵力・士気・情報」の4値操作に留まります。

---

## 10. 季節ターンはどう回っているか

`turnSystem.js`の`T.advance`が季節1回分の処理を担います。README.mdに明記された処理順序（コードとも整合）：

1. 資源収入・AI勢力の経済処理
2. 疲労/健康回復、諜報（intel）の減衰
3. 外交：条約期限→提案期限→貢納→戦争疲弊更新
4. AI外交行動（`runDiplomacySeason`）
5. AI内政・軍事行動
6. 季節・年の繰り上げ（春夏秋冬のロールオーバー）、コマンド回復
7. 季節イベント実行、約束期限チェック、離反処理
8. 勢力滅亡・勝敗判定（`victorySystem.check`）

`S.Systems.Campaign.begin/selectCastle/setAI/recoverCommands/transferCastle`が戦役全体のライフサイクル操作を提供します。連続時間（日単位など）は導入されておらず、**季節を1ターンとする離散処理のみ**です（ユーザーの仕様書が要求した「連続時間化には未着手のまま」という制約と一致）。

---

## 11. Tactical Battle B5.3の操作系はどう実装されているか

B5.3は「新しい戦闘ルールの追加」ではなく、**既存のB5戦闘ルールに対するモバイル操作UIの再設計**です（`B5_3_IMPLEMENTATION_NOTES.md`が明言）。旧来の常設Move/Attack/Chargeボタン列は完全に撤去されています。

操作フロー（実装済み）：
1. 自軍部隊をタップ選択（同時に戦闘時間が一時停止）
2. 指で押したままドラッグ＝経路を`Input.simplifyRoute`が間引きながらサンプリング
3. 敵に向けてドラッグ中は`render.js`の`drawAttackZones`が正面/側面/背後ゾーンをリアルタイム表示し、`drawGesture`がFLANK/REAR/CHARGE?のプレビューラベルを表示
4. 指を離すと`Input.classifyRelease`が単一の意図分類を実行：空地→移動、敵上→攻撃、（突撃可能兵種＋`MIN_CHARGE_DISTANCE`(70px)以上の助走＋側面/背後進入）→突撃候補
5. 向きは移動方向へ自動追従がデフォルト。手動指定は「約480ms長押し→方向へドラッグ」という上級者向け操作に格下げ（8方向メニューは撤去済み）

タップ判定は`R.clientPxToWorld`でCSSピクセル→ワールド座標のデバイス依存スケーリングを行い、固定論理ピクセルしきい値を使っていた旧世代（B1-B4）の問題を解消しています。ロースター（下部部隊カード列）は選択専用に単純化され、折り畳み可能（`state.ui.rosterCollapsed`）。`selectedUnitIds:[]`は将来のマルチ選択（矩形選択等）に備えたアーキテクチャ上の受け皿として追加されていますが、**B5.3自体は依然1部隊ずつの操作のみ**で、実際のマルチ選択ロジックは未実装です。

明示的に後回しにされている項目（`B5_3_IMPLEMENTATION_NOTES.md`「Scope intentionally deferred」）：矩形/投げ縄マルチ選択と編隊移動、完全な経由点エディタ、15v15/20v20の密集調整、B6の疲労・追撃、ネイティブ触覚フィードバック。

---

## 12. Core と Tactical は現在どれだけ独立しているか

**完全に独立**しています。本調査で以下を実際に検証しました。

```
grep -rn "window\.Sengoku\|S\.Systems\|S\.Data\|S\.State\|S\.UI\|S\.Save" Tactical/prototype/  → 0件
grep -rln "window\.Tactical\|T\.Combat\|T\.Movement"                    Core/                    → 0件
grep -rn "src=\"\.\./\|Core_v1\|Tactical_B"  両index.html                                        → 0件
```

いずれの方向にも参照は一切なく、`index.html`のscriptタグも完全に別ツリー、共有ファイルもゼロ、決定論的RNGの実装すら別物（Core：`Math.imul`ベースのLCG、Tactical：xorshift32）です。`node --check`もTactical配下全ファイルでエラーなし。

**唯一の接点は「設計書」1本のみ**：本エンジンが本エンジン自身の以前のターンで作成した`UNIT_AND_TACTICAL_BATTLE_DESIGN.md`が、両プロジェクトのフォルダに参考資料としてコピーされています（Tactical側の`UNIT_AND_TACTICAL_BATTLE_DESIGN.md`、ユーザーが今回アップロードした`preview.md`も同一内容）。これは**プレーンテキストの設計文書であり、実行コードは1行も含みません**。つまり「Unit Systemを追加してCoreとTacticalをつなぐ」という計画自体は存在しますが、**その計画のコード化は0%**です。schemaVersionも依然10のままで、設計書が提案したv11への移行は行われていません。

---

## 13. 技術的負債・重複処理・拡張しにくい箇所

- **`S.Util.deepClone = JSON.parse(JSON.stringify(...))`の罠**：`Object.defineProperty`によるgetter（派生プロパティ）を静かに固定値へ焼き込みます。イベントのpreflight処理やセーブ処理など、Core全体でこの`deepClone`が多用されているため、将来`castle.troops`をUnitからの派生値（getter）に変更した場合、preflightクローンと本クローンで値が食い違う地雷になります。Unit System導入前に必ず設計段階で対処すべき既知の落とし穴です。
- **`battleSystem.resolve()`のモノリシック構造**：スコア計算と、兵力移動・城主変更・捕虜化・勲功・因縁記録・外交記録・戦国記追記・勝利判定という事後処理約30行が1関数に混在。Tacticalの結果をCoreに反映する統合を行う前に、事後処理部分を`Battle.applyOutcome(state, plan, outcome)`のような独立関数へ切り出す必要があります（現状は瞬間解決経路にしか対応していない）。
- **性格/特性/物語アークは「仕組みだけ」**：`PersonalityRegistry`/`TraitRegistry`/`StoryArcRegistry`はAPIも検証ロジックも完成していますが、登録データが0件のため、武将の個性・因縁ドラマは現状イベントテキストの範囲でしか表現されていません。ユーザーが目指す「人物ドラマ」を厚くするには、この空のレジストリへコンテンツを流し込む作業が中心になります。
- **TEMP CONTENTの散在**：`castles.js`（12件中8件）、`factions.js`（黒鉄家）、`officers.js`（16名中10名）、`scenarios.js`（`core_campaign`の初期外交・開幕）が「検証用仮データ」と明記されたまま。正式リリース前に内容差し替えが必要な範囲がコード上明確に切り分けられている点は良い点でもありますが、量として無視できません。
- **RNG実装が2系統**：Core（`Math.imul`ベースLCG、イベント用に注入可能）とTactical（xorshift32、`T.RNG`）。現状は互いに独立なので実害はありませんが、Phase Cで統合する際にどちらか一方に統一するか、両方を意図的に併存させるかを設計判断として決めておく必要があります。
- **Tacticalのフィールド寸法がドキュメントとズレている**：`B5_1_IMPLEMENTATION_NOTES.md`は「1200x800→1500x1000」、`fixtures/scenario_basic.json`も`logicalWidth:1500, logicalHeight:1000, frontLineGap:720`と記載していますが、実際のランタイム（`battleState.js`の`T.FIELD`）は`{width:1600, height:760}`です。実害はありません（fixtureのJSON自体、コード内コメントで「ランタイムはfile://互換のためbattleState.js内で同じレイアウトを再構築する」と明記されており、実際には読み込まれていない=死んだ設定値のため）が、ドキュメントの記述更新漏れとして拾っておくべき小さな負債です。
- **Tacticalの「AI」は最小限**：7章の通り、`enemyAutoOrders`は最寄りへの固執attackのみ。ドキュメント上は既知の未着手（Phase B7）ですが、今後プレイテストの説得力を上げるには早めに着手候補になります。
- **`eventSystem.js`の肥大化**：355行に selector/condition/effectホワイトリスト、検証、Arc状態機械、AI選択、トランザクションcommitまでが1ファイルに集約。機能的には一貫していますが、新しいeffect種別を追加するたびにこの1ファイルを触ることになり、Core内で最もリグレッションリスクの高いファイルです（ただし後述のpreflight-then-commitパターンと`validateState`がこのリスクを強く緩和しています）。
- **HUDの毎フレーム再描画**：Tactical `main.js`の`loop()`は`requestAnimationFrame`ごとに`T.HUD.refresh()`を無条件に呼び、`hud.js`内で複数のDOM `textContent`/`style`書き換えを行います。差分検知なしの単純な全書き換えです。7ユニット規模の現状負荷は軽微ですが、将来ユニット数を増やす場合はプロファイリング対象になります。

---

## 14. 非常に良い設計

- **preflight→検証→commitのトランザクションパターン**（`eventSystem.resolveTransaction`）：状態のクローン上でeffectを試験実行し、`validateState`で最終検証してから初めて本stateへ反映。イベント処理中に不正な中間状態が実際のゲームに漏れ出ることを構造的に防いでいます。
- **`validateState.js`の網羅性**：城の隣接双方向性、外交の全ペア存在保証、従属の循環検出まで含む188行の不変条件チェッカーが、`repairState`による自動修復とセットで用意されています。Core全体の回帰安全網として機能しており、今後どんな変更を加える場合でも最初に走らせるべき検査です。
- **セーブの堅牢性**：チェックサム付きenvelope、3世代ローリングバックアップ、書込み後の読戻し検証、異常検知時のランタイムチェックポイント復旧。200サイクルの保存・読込・意図的破損シミュレーションで裏付けられています。
- **`releaseSystem.js`による難易度ロジックの一元化**：AI/合戦/外交の各所が難易度に応じた数値をハードコードせず、この1つのシステムに問い合わせる設計になっており、バランス調整の変更点が散らばっていません。
- **Tacticalの2段階戦闘解決**（`combat.js`の`fightPairs`）：全ペアの被害を先に計算→兵力を一括減算→士気を一括適用（`deferRout`で潰走判定を後回し）→撃破判定→潰走判定、という順序により、同一tick内での処理順依存バグ（B1-B4時代に存在した種類のバグ）を構造的に回避しています。
- **デバイス依存タップ判定**（`render.js`の`R.clientPxToWorld`/`R.pickUnitNear`）：CSSピクセルとワールド座標を明示的に変換しており、固定論理しきい値によるiPhoneサイズ間の当たり判定ズレ（B1-B4時代の実機UX問題）を解消しています。
- **決定論の一貫した検証**：Core・Tactical双方が「同一シード+同一操作＝同一結果」をテストで直接検証しており（`b5_determinism_test.js`、Core側の各種simulationの再実行一致確認）、これは今後のバランス調整やリプレイ機能にとって極めて価値のある性質です。
- **B1→B5.3の応答的な改修サイクル**：各段階（B5/B5.1/B5.2/B5.3）の実装ノートに「人間プレイテストで指摘された具体的な問題」と「対応した変更」が1対1で明記されており、実際に本エンジンが独立レビューで指摘した全Critical/Major項目（兵力無視ダメージ、非対称勝利条件、潰走連鎖範囲過大、固定論理pxタップ判定、8方向メニューの冗長性）が現時点のB5.3コードで解消済みであることを本調査で実測確認しました。継続すべき開発プロセスです。
- **`file://`互換性の一貫した維持**：Core・Tactical双方で外部依存・ビルドステップ・ES Modules・`fetch()`を排除する規律が最後まで貫かれており、テストコードもNode `vm`モジュールで同じ`<script>`ファイル群をそのまま読み込む方式を採用（実運用コードとテストの乖離が発生しにくい)。

---

## 15. 絶対に壊さない方がいい部分

- `validateState.js`の不変条件と`repairState`（Coreの回帰安全網そのもの）
- セーブenvelope形式・チェックサム・世代バックアップ・移行チェーン（過去セーブの互換性が失われる）
- `eventSystem`のpreflight→検証→commit規律（緩めると不正な中間状態がstateに漏れるリスクが復活する）
- `castle.troops`を実データフィールドのまま維持すること（ユーザー自身が明示的に要求した互換性方針。getter化は`deepClone`の罠と直接衝突する）
- Tacticalの対称勝利条件・`troopStrengthFactor`による兵力スケーリング・140px潰走伝播半径（いずれもB1-B4のCritical不具合＝「構造的にプレイヤーが勝てない」「兵力が戦闘力に影響しない」を直接修正した箇所。ここを触ると同じ不具合が再発します）
- Core/Tactical間の非依存境界（ユーザー自身が繰り返し明示的に要求している設計原則。現状ゼロ結合であることは11・12章で実測確認済み）
- 両プロジェクトの決定論的RNGとシード再現性（既存テストの多くがこの性質に依存しています）

---

## 16. 現在のProject Sengoku実装マップ

```
Project Sengoku
│
├─ 戦略マップ（Core）
│   ├─ 城            【実装済み】12件のデータ構造＋validateState整合性検証＋SVG地図描画
│   ├─ 勢力           【実装済み】4勢力、勢力別ランキング/優劣判定(releaseSystem)込み
│   ├─ 武将           【実装済み】stat/忠誠/経験/状態遷移フル実装　※内容の大半はTEMP仮データ
│   ├─ 内政           【部分実装】develop/recruit/train/rest/scoutの4値操作のみ
│   │                          （人口・商業・治安等の建物ベース内政は未実装）
│   ├─ 外交           【実装済み】5状態・条約・従属・戦争疲弊・AI提案評価まで網羅
│   ├─ AI             【実装済み】優先度フォールバック型行動ツリー、長期シミュレーション済み
│   │                          （学習型ではなくルールベース）
│   ├─ イベント        【実装済み(仕組み) / 設計だけ存在(コンテンツ)】
│   │                          selector29種/condition約46種/effect約60種＋Story Arc機構は完成
│   │                          personality/trait/story arcの実データは0件
│   ├─ セーブ          【実装済み】checksum・3世代バックアップ・移行チェーン・自動復旧
│   └─ 戦争(合戦解決)   【実装済み】battleSystem.resolveによる瞬間解決型
│                              ※事後処理がモノリシックで将来の統合には要リファクタ
│
├─ Tactical Battle（Coreとは完全非依存）
│   ├─ Unit           【実装済み】battleUnit.js、位置/向き/兵力/突撃/装填状態を保持
│   ├─ Movement        【実装済み】複数経由点ルート、射程武器の自動停止距離
│   ├─ Combat          【実装済み】相性表・troopStrengthFactor・突撃・鉄砲、テスト20/20等でPASS
│   ├─ Morale          【実装済み】潰走・140px範囲伝播・撃破処理
│   ├─ Facing          【実装済み】移動方向へ自動追従がデフォルト、手動は長押し操作
│   ├─ Flank/Rear      【実装済み】方向分類(attackDirection)＋ダメージ/士気倍率＋ライブゾーン表示
│   ├─ Charge          【実装済み】最低助走70px・cooldown180tick・侍/騎馬限定
│   ├─ Gun(鉄砲)        【実装済み】射程200・reload24tick・自動照準・sticky target
│   ├─ Mobile UI(B5.3)  【実装済み】単一ジェスチャー分類・デバイス依存タップ判定・折畳ロースター
│   │                          ※マルチ選択/編隊/経由点エディタ/触覚FBは明示的に未実装
│   └─ (戦術AI)         【部分実装】12tickごとの最寄り固執attackのみ。高度AIはPhase B7で未着手
│
└─ Core ⇔ Tactical 統合レイヤー
    └─ Unit System / Battle.applyOutcome / schema v11移行  【設計だけ存在】
                              本エンジン作成の設計書のみ。実行コードは0行。
                              現状コードレベルでの結合は完全ゼロ（grep実測で確認済み）。
```

---

以上が現時点のコードから直接確認できる実装状況の全体像です。改善案・ロードマップの提案は行っておらず、本レポートは調査結果の記述のみに限定しています。
