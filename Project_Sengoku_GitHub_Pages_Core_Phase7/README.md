# Phase 12 — Pursuit Risk / Commander Capture & Escape

> **Phase 12:** Phase 11の追撃Doctrineを維持しつつ、追撃時に敵総大将の捕縛/逃亡と深追いリスクを追加。捕縛は既存Prisoner・登用・解放・捕虜交換へ接続し、深追い事故では勝者総大将に追加疲労・体力損耗・軽傷の可能性があります。`schemaVersion 12`、Core/Tactical境界、Siege、既存Save互換を維持。詳細: `PHASE12_PURSUIT_RISK_CAPTURE_REPORT.md` / 実機手順: `README_TESTPLAY_MOBILE_PHASE12.md`

# Phase 10 — Battle Aftermath / Retreat & Pursuit

> **Phase 10:** Phase 9.1のField Battleを基準に、敗軍が即消滅せず「退」旗で敗走する戦後処理と、Player勝利時の「追撃する / 追撃しない」判断を追加。`schemaVersion 12`、Core/Tactical境界、Siege、UI-2、既存Save互換を維持しています。詳細: `PHASE10_BATTLE_AFTERMATH_PURSUIT_REPORT.md` / 実機手順: `README_TESTPLAY_MOBILE_PHASE10.md`

> **Phase 9.1:** Phase 9のArmy Interception / Field Battleを安定化。迎撃Army詳細UI、同季二重野戦防止、Tactical割込み後のArmy season再開、Save/Load互換を追加。詳細: `PHASE9_1_STABILIZATION_REPORT.md`

> **Phase UI-2:** UI-1の城・内政・家臣・登用に加え、軍団編成・出陣準備・外交・評定を同じモバイル戦国ゲームUIへ統一。

> **Phase UI-1:** 城詳細・内政・家臣一覧・人材登用をモバイル戦国ゲームUIへ再設計。

# Phase 8 — Living Front v0.4

AI勢力も実際のArmy Entityとして地図上を進軍するMobile-first戦国キャンペーン版です。敵侵攻Army、AI援軍、Threat/ETA表示を追加しました。戦闘・セーブ・外交等の既存機能は維持しています。

詳細: `PHASE8_LIVING_FRONT_REPORT.md` / 実機手順: `README_TESTPLAY_MOBILE_PHASE8.md`

---

# Project Sengoku Strategic Campaign v0.3 — Phase 7

> **Playable Sengoku Loop v0.1とPhase 6のスマホ横画面UXを維持し、城・武将配置・進軍路に戦略的な意味を追加した版です。** schemaVersionは12のままで、既存セーブ構造を破壊しません。

## Phase 7の主要変更

- 全12城に「街道商都 / 港城 / 山城 / 関門 / 農村」などの静的な城個性を追加。金・兵糧・人口成長・攻城防御・進軍速度に小さく影響します。
- 武将の`governor / domestic / army / idle`をゲームUIで可視化。奉行は政治力に応じて季節収入・人口成長を補助します。
- 奉行は1城1名。奉行や城主を出陣させると城での役割を失うため、「城に残すか戦場へ出すか」が意思決定になります。
- Armyは隣接敵城だけでなく、自領の城を中継して最大3区間先まで侵攻可能。山道区間は2季かかる場合があります。
- 進軍画面とArmy詳細にルート・概算到着季数を表示。
- 山城などの城特性と城主統率がSiege防御へ反映されます。
- AIも余剰武将を奉行へ自動配置し、新しい城防御を侵攻評価へ反映します。AI対AI戦闘は引き続きLegacy Battleです。
- Mobile-first方針を維持し、城個性・役割・ルート情報を横画面の小さい領域でも確認できるUIにしています。

## 戦略ループ

城の個性を見る → 城主・奉行を配置 → 内政 → 武将を残す/出陣させる判断 → Army編成 → 自領を経由して進軍 → Tactical Battle → Siege → 占領統治。

---

# Project Sengoku Core v1.0

Core v1.0 Phase 1のセーブ安定化とPhase 2の初心者案内・モバイル対応を維持し、難易度差、AI攻勢、序盤防衛、停滞対策、一強化抑制、劣勢勢力支援、終了画面、最終検査を追加したリリース候補版です。追加人物・城・第四勢力・初期外交はシステム検証用の仮コンテンツであり、正式コンテンツではありません。

## 起動方法

1. ZIPを解凍します。
2. `01_START_GAME.html`をChrome、Safari、Edgeなどで直接開きます。
3. 「新しい戦を始める」からシナリオ、勢力、難易度を選びます。

ローカルサーバー、npm、ビルド、インストールは不要です。外部ライブラリ、`fetch()`、ES Modulesを使用せず、グローバル名前空間は`window.Sengoku`だけです。

## シナリオ・勢力・難易度

- `owari_short` — Core v0.7由来の4城・3勢力短期戦役。蒼月家固定の初陣を維持します。蒼月家と朱鷺沢家は戦争中、その他の勢力ペアは中立で開始します。
- `core_campaign` — 12城・4勢力、各勢力3城・最低4武将の長期検証キャンペーン。蒼月家、朱鷺沢家、雪代家、黒鉄家（仮）から選択できます。停滞防止用の初期戦争2組は仮データです。
- `easy` / `normal` / `hard` — 初期資源、初期兵力、合戦、AI経済・徴兵・侵攻に加え、AIの外交評価へ難易度補正を適用します。

長期キャンペーンは全12城支配、他勢力全滅、または全存続勢力を直接・間接に従属させる覇権で勝利します。選択勢力の所有城が0になると敗北します。

## 外交状態と攻撃合法性

勢力ペアは次のいずれかの状態を持ちます。

- `neutral` — 中立
- `war` — 戦争。通常の侵攻を開始できる唯一の状態です。
- `ceasefire` — 期限付き停戦
- `non_aggression` — 期限付き不戦条約
- `alliance` — 期限付き同盟

合戦はUI、`Battle.plan`、`Battle.resolve`、プレイヤー操作、AI対AI、AI対プレイヤーの各経路で外交合法性を検証します。条約締結後に保留中の合戦を解決することもできません。デバッグの「任意戦闘開始」だけが、画面に明示したうえで外交判定を無視できます。

## 外交行動

- 使者の政治を使う関係改善
- 宣戦、和平、停戦、不戦条約、同盟、条約延長、条約破棄
- 金・兵糧の物資援助、同盟勢力への援軍要請
- 捕虜交換、一方的捕虜解放
- 降伏勧告、従属提案、従属解除、独立

プレイヤーからAIへの提案は、その場で関係、信頼、遺恨、評判、国力比、城数、共通国境、共通敵、戦争疲弊、使者の政治、条約破棄履歴、提供資源、難易度、小さな乱数を使って評価します。AIからプレイヤーへの提案はセーブ可能な`pending`状態となり、外交画面で受諾または拒否できます。同じ提案には再送クールダウンがあります。

## 従属・独立・戦争疲弊

従属は`subject → overlord`の方向付き構造です。貢納、独自宣戦の制限、宗主の敵以外への侵攻制限、独立クールダウン、循環禁止を実装しています。宗主は従属解除を行え、従属側は条件を満たすと独立を試みます。

戦争疲弊は各勢力0〜100です。合戦、敗北、城喪失、長期戦争で上昇し、平和、停戦、援助で低下します。AIの和平判断、合戦士気、徴兵効率へ小さく反映します。

## 外交AIと停滞対策

各AI勢力は季節ごとに0〜1回の外交行動と、従来どおり1〜2回の内政・軍事行動を行います。劣勢時の和平・停戦、共通敵に対する同盟、弱い中立隣国への合法な宣戦、同盟援助、捕虜交換、降伏・従属要求、独立、条約更新を判断します。プレイヤーだけを狙わず、同時戦争は原則2件までです。

合戦、城所有権変化、主要外交変化が12季ない場合は戦略を再評価します。戦争を強制生成せず、合法な宣戦・同盟・和平の評価を促進します。

季節処理順は次のとおりです。

1. 条約期限
2. 提案期限
3. 貢納
4. 戦争疲弊
5. AI外交
6. AI内政・軍事
7. 勢力滅亡・勝敗

同じ季節の処理は`processedTurn`で二重実行を防ぎます。

## Core v0.95イベントエンジン

- `ContentPackRegistry`がイベントとStory Arcを登録し、trigger indexを事前コンパイルします。
- blocking eventは選択肢・費用・実行不能理由を表示し、非プレイヤー勢力は`aiWeight`と注入RNGで自動解決します。
- 条件は論理、戦役、勢力、城、武将、関係・因縁、外交、イベント状態を安全な演算子だけで評価します。
- selector結果はinstanceへIDとして保存し、再描画時に再抽選しません。
- effectは既存Systemsを経由し、費用を含む選択全体を複製状態でpreflightしてから原子的にcommitします。
- Story Arcは開始、step変更、進行、完了、失敗を保存し、履歴・diagnosticsへ記録します。
- personality/trait定義レジストリは空で出荷し、全武将の`profile.personalityIds`、`traitIds`、`tags`も空です。正式な性格・特性は追加していません。
- 連鎖12、1 emitあたり20 event、queue 50、履歴500、diagnostics 200、eventごとのchoice 12・effect 30・selector 20を上限とします。

通常有効なPackは`core_season_events`と`core_opening_events`です。著者向け仕様は`docs/`、無効な検証例は`docs/examples/example_story_pack.js`にあります。

## 維持したCore v0.9機能

- 季節進行、資源、命令、内政、徴兵、訓練、休養、偵察
- 汎用合戦、実兵力上限、最低守備兵、最低攻撃兵、防衛戦報告
- 自勢力城間の武将移動と共通城主任命
- 捕虜、登用、忠誠、不満、約束、離反、宿敵、因縁
- データ駆動季節イベント、勢力滅亡、動的勝敗・エンディング
- オートセーブ、手動3スロット、JSON入出力、v0.2〜v0.8移行

人物関係は`state.relationships.officers`、勢力外交は`state.diplomacy.relations`へ完全分離しています。UIは状態を直接変更せず、`Sengoku.Systems`を経由します。

## Core v1.0 Phase 1 セーブ安定化

- 各セーブをchecksum付きenvelopeで保存し、JSON破損と内容改変を読込前に検出します。
- オートセーブと手動3スロットは、それぞれ独立して直近3世代の正常バックアップを保持します。
- 主セーブが破損した場合は、最も新しい正常バックアップを自動選択し、主セーブへ安全に書き戻します。
- 保存は一時キーへ書込み・読戻し検証を行ってから確定します。失敗時にlive stateの保存時刻や概要を変更しません。
- 不正なゲーム状態をオートセーブ時に検出した場合は、メモリ上の直前正常チェックポイントへ復旧します。
- セーブ管理画面で保存領域の状態、破損、復旧可能性、前回バックアップへの手動復旧を確認できます。
- JSONエクスポートは従来どおりplain state形式で、Core v0.95以前の既知形式も読込できます。

詳細は`docs/SAVE_RECOVERY_GUIDE.md`を参照してください。



## Playable Loop Phase 3 — Domestic MVP

- `castle.population`：人口。税収ボーナスと徴兵上限に接続。
- `castle.agriculture`：農業。季節兵糧収入へ接続。
- `Domestic.recruitmentCapacity()`：人口から徴兵上限を算出。
- `Domestic.processSeasonEconomy()`：全勢力の季節収入・Army維持費・人口自然増を一括処理。
- `Domestic.upkeepForArmy()`：Army兵力から季節ごとの金・兵糧コストを算出。
- `executeCultivation()`：新しい「開墾」命令。農業と人口を増加。
- schema 11 → 12 migration：旧Phase 2セーブへ人口・農業を決定論的に補完。

Phase 3では建物、治安、交易路、税率スライダーなどはまだ追加しません。内政の数字を増やすより、**戦争に意味のある最小経済循環**を優先しています。

## Core v1.0 Phase 2 操作案内・モバイル対応

- 戦役中の状態を見て、重要イベント、外交提案、城選択、徴兵、侵攻、内政、季節進行などから「次の一手」を案内します。
- 初回プレイでは「戦役画面を見る」「自城を選ぶ」「命令を出す」「季節を進める」「メニューを開く」の5項目を追跡します。
- 新規ゲーム時に初心者ガイドを無効化でき、メニューから閉じる・再開することもできます。
- タイトル画面とメニューに「遊び方」を追加し、基本進行、用語集、キーボード操作をゲーム内で確認できます。
- 表示設定に文字拡大、高コントラスト、動きを減らす設定を追加しました。設定とガイド進行はセーブへ保存されます。
- モーダルは見出し関連付け、初期フォーカス、Tab循環、閉じた後のフォーカス復帰に対応します。
- 城と武将はキーボードで選択でき、スマートフォン幅では44px以上の操作領域、下部ナビゲーション、横スクロール地図、下から開くモーダルを使用します。
- ショートカットは`M`＝メニュー、`?`または`/`＝遊び方、`G`＝次の一手、`Esc`＝閉じる、`Ctrl+Shift+D`＝デバッグです。

詳細は`docs/BEGINNER_AND_ACCESSIBILITY_GUIDE.md`を参照してください。

## Core v1.0 正式リリース

- `easy`は初期資源・兵力・合戦補正と序盤4季の防衛支援、`normal`は序盤2季の小支援、`hard`はAI経済・徴兵・攻勢強化と序盤支援なしに調整しました。
- AIの行動回数、侵攻必要兵力比、投入兵力、対プレイヤー侵攻回数を難易度別に制御します。
- 12季停滞再評価に加え、停滞が続くほど侵攻判断を安全な下限まで段階的に強めます。
- 城数で大きく先行するAI勢力には小さな成長抑制、1城などの劣勢勢力には小さな経済・徴兵・防衛支援を適用します。
- 落城直後の城は士気が低下し、連続拡張の拠点でありながら反撃リスクも残ります。
- 勝利・敗北画面に難易度、経過季節、合戦数、主要外交、支配城、最終時点を表示し、プレイレポートへ同じ戦役情報を含めます。
- デバッグ画面に難易度・勢力順位・停滞・序盤保護を確認できるRelease Balance snapshotを追加しました。

詳細は`docs/BALANCE_NOTES.md`と`docs/RELEASE_GUIDE.md`を参照してください。

## セーブと移行

Playable Loop Phase 3では`schemaVersion: 12`です。Phase 2/1のschema 11セーブは自動移行します。`gameVersion: "core-0.95"`は既存互換のため維持しています。旧Core v0.95 baselineは`schemaVersion: 10`でした。

Core v0.95は`schemaVersion: 10`、`gameVersion: "core-0.95"`です。schema 9の全戦役・外交データを保持し、`state.events.engine`、武将profile、Pack・RNG・イベント履歴・Story Arc状態を追加します。Phase 1形式の単数`personalityId`も`personalityIds`へ正規化します。

Core v0.7の4城セーブは`owari_short`・`normal`として移行し、v0.2〜v0.6の既知配列形式・保存キーも維持します。保存概要にはシナリオ、勢力、難易度、年・季節、支配城数、保存日時を記録します。

## デバッグ

`index.html?debug=1`で起動するか、ゲーム中に`Ctrl + Shift + D`を押します。

- 資源変更、季節進行、命令回復、AI ON/OFF
- 明示的な外交無視を伴う任意戦闘
- 指定勢力への城移譲、指定武将の移動
- AIを1季／10季実行
- 100季節シミュレーション
- 全勢力AI 200季＋未決着時300季検査
- 最終状態の厳格検証、明示的整合性修復、勝利状態、初期化
- Pack有効化・無効化、全Pack/Event検証、手動emit、event queue追加・消去
- active/queue/flags/variables/counters/cooldowns/arcs/history/diagnosticsのJSON確認
- 武将personality/trait/tag編集、Event.emit stress操作

## テスト方法

`tests/test.html`を直接開くと既存103項目の回帰テストを表示します。`tests/v1Phase1Test.html`ではセーブ安定化25項目、`tests/v1Phase2Test.html`では操作案内18項目、`tests/v1Phase3Test.html`では正式版終了画面・難易度・Release DebugのDOM検査8項目を表示します。Node.jsが利用できる開発環境では、プロジェクト直下で次を実行します。ゲーム本体の起動にNode.jsは不要です。

```sh
node tests/nodeHarness.js
node tests/nodeHarness.js tests/phase2ArmyMarchingTests.js
node tests/phase2ArmyMarchingDomHarness.js
node tests/phase2ArmyMarchingStatic.js
node tests/nodeHarness.js tests/v1Phase1Tests.js
node tests/v1Phase1DomHarness.js
node tests/v1Phase1StaticChecks.js
node tests/nodeHarness.js tests/v1Phase2Tests.js
node tests/v1Phase2DomHarness.js
node tests/v1Phase2StaticChecks.js
node tests/nodeHarness.js tests/v1Phase3Tests.js
node tests/v1Phase3DomHarness.js
node tests/v1Phase3StaticChecks.js
node tests/saveStabilitySimulation.js
node tests/nodeHarness.js tests/phase3Tests.js
node tests/domNodeHarness.js
node tests/uiSmoke.js
node tests/staticChecks.js
node tests/longSimulation.js
node tests/diplomacySimulation.js
node tests/eventSimulation.js
node tests/eventStress.js
node tests/releaseSimulation.js
find . -name '*.js' -type f -print0 | xargs -0 -n1 node --check
```

`diplomacySimulation.js`は4開始勢力・3難易度を含む8 seedを全勢力AIで200季実行し、未決着時は300季まで継続します。外交行動、宣戦、和平、同盟、従属、独立、合戦、城変化、最大停滞、結末、条約違反攻撃、最終`validateState`を記録します。

## 構造

```text
Project_Sengoku_Core_v1_0/
├── index.html
├── README.md
├── CHANGELOG.md
├── TEST_RESULTS.md
├── legacy/
├── styles/
├── src/
│   ├── data/diplomacy.js
│   ├── data/contentPacks.js
│   ├── data/eventExtensions.js
│   ├── state/
│   ├── systems/eventSystem.js
│   ├── systems/diplomacySystem.js
│   ├── systems/uxSystem.js
│   ├── systems/releaseSystem.js
│   ├── ui/renderDiplomacy.js
│   └── その他Core v0.8互換モジュール
└── tests/
    ├── smokeTests.js
    ├── phase3Tests.js
    ├── v1Phase1Tests.js
    ├── v1Phase1DomTests.js
    ├── v1Phase2Tests.js
    ├── v1Phase2DomTests.js
    ├── v1Phase2StaticChecks.js
    ├── v1Phase3Tests.js
    ├── v1Phase3DomTests.js
    ├── v1Phase3StaticChecks.js
    ├── releaseSimulation.js
    ├── saveStabilitySimulation.js
    ├── domUiTests.js
    ├── eventSimulation.js
    ├── eventStress.js
    ├── uiSmoke.js
    ├── longSimulation.js
    └── diplomacySimulation.js
```

## 今回追加していないもの

正式人物、新性格、正式ストーリー、結婚、子ども、家系、装備、本格諜報、暗殺、生成AI、オンライン、クラウド、課金、UI全面刷新は対象外です。

## 既知の制約

- 長期キャンペーンの追加人物・城・第四勢力・初期外交は仮コンテンツです。
- 外交AIはCore向けの基本戦略AIであり、本格的な外交人格や物語演出はありません。
- personality/traitレジストリとStory Arc基盤は拡張点だけで、正式データは空です。
- この実行環境では`file://`のSafari・Chrome・iPhone実操作を行っていません。DOMスモーク、静的参照検査、Nodeテストで直接起動構成を検証しています。
- ブラウザの保存領域が制限される場合、ゲームは動作しますが`localStorage`へ保存できません。


## Phase 9 — Field Battle / Interception

敵Armyが自城へ向かう最終街道区間に入ると、城から迎撃Armyを出せます。同一街道でArmy同士が接触すると野戦が発生し、プレイヤー参加時はTactical B5.3で直接指揮します。野戦は城所有権を直接変更せず、敗軍撤退・勝軍継続を処理します。
