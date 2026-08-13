
## Phase 12 — Pursuit Risk / Commander Capture & Escape
- 追撃前に捕縛見込みと深追いリスクを表示。
- 追撃成功時、敗走軍総大将を既存捕虜システムへ送る可能性を追加。
- 捕縛時は指揮崩壊として敗走Armyを散開解散し、生存兵を退却先へ帰還。
- 捕縛失敗時は敵将逃亡として戦報へ記録。
- 深追い事故で勝者総大将に追加疲労+6、体力-8、場合により軽傷。
- Player追撃結果はBattle ID由来の安定rollでSaveリロード再抽選を抑制。
- schemaVersion 12維持。
# Phase 10 — 2026-08-13
- Field Battle敗軍を即時解散から`returning`敗走Armyへ変更。
- 敗走軍を地図上の「退」旗、Army詳細の敗走中/退却路として可視化。
- Battle発生Turn内の即帰城を防ぎ、次Turnに自城へ帰還。
- Player勝利時の追撃判断を追加。追撃は敗走兵18%追加損害、総大将fatigue +8。
- 追撃拒否、二重追撃防止、Turn期限、Save/Loadを実装。
- Phase 10 logic 13/13、static 12/12、DOM 3/3 PASS。全主要回帰・simulation・Tactical tests PASS。

# Phase 9.1 — Field Battle Stabilization

- Enemy Army Detailの`interceptHtml`未定義を修正し、迎撃可能表示と迎撃ボタンを復旧。
- 1 Armyが同一seasonに複数Field Battleへ参加しないようseason-scoped接触追跡を追加。
- 接触開始順の単純なArmy ID依存を軽減。
- Tactical割込み時のArmy処理位置を保存し、結果適用後に未処理Armyのseason処理を再開。
- `schemaVersion = 12`と既存Save互換性を維持。
- Phase 9.1 logic 4/4、DOM 2/2、Static 8/8、Core 103/103、全主要回帰・simulation PASS。

# Mobile Campaign v0.2 — Phase 6 / Smartphone-first Campaign UX

- 戦略画面をiPhone/Android横画面の固定ゲームシェルへ変更。
- 地図 / 城 / 軍議を下部ナビで即時切替。長いページスクロールを不要化。
- 地図下部へ選択城ドックを追加し、詳細/出陣を2タップ以内に集約。
- 下部ナビへ「次季」を追加し、既存`Turn.advance`経路を共用。
- 横画面HUDは金・兵糧・命令を優先表示。
- 戦略画面にも縦画面回転オーバーレイを追加。
- schemaVersion 12、Battle/Siege/Domestic/AI/Saveロジックは無変更。

# Playable Sengoku Loop v0.1 — Phase 5 / Siege + Occupation

- `src/systems/siegeSystem.js`を追加し、野戦勝利と城占領を分離。
- Tactical圧勝は即落城、僅差勝利は`Army.status = "besieging"`として包囲継続。
- 包囲は季節ごとに守備兵・士気・防備へ損害を与え、条件達成時に落城。
- 包囲Armyは既存の遠征維持費対象で、プレイヤーは任意撤退可能。
- Legacy Battleは従来の「勝利=即落城」を`Siege.resolveLegacy`経由で完全互換維持。
- 地図へ「囲」マーカー、Army詳細へ攻城メーター、戦報へ「落城/包囲継続」を追加。
- `besieging`のvalidateState整合性とsave/loadを追加。schemaVersionは12のまま。
- Phase5 focused 9/9、static 9/9、Core 103/103、Tactical全テスト、長期/外交/Event/Save/Release simulation PASS。

# Playable Loop Phase 4 — Tactical Integration

- Core Army到着戦とTactical B5.3を`BattleAdapter`で接続。
- TacticalへCore stateを渡さずplain `BattleSpec`のみを渡す境界を実装。
- Tactical結果を`postMessage`で返し、`BattleOutcome`へ変換してCoreへ適用。
- プレイヤー会戦中は季節後半処理を停止し、結果適用後に再開。
- AI/AIおよび自動解決はLegacy Battleを維持。
- Core/Tactical兵力スケール差をAdapter内の25倍変換で吸収。
- Tactical B5.3を可変Unit数のBattleSpecで初期化可能にし、7v7既存ルール/テストを維持。
- schemaVersionは12のまま。

# Playable Loop Phase 3 — Domestic MVP

- `schemaVersion` 11→12。旧Phase 2セーブへ`population`/`agriculture`を非破壊補完。
- 城人口を税収ボーナス・徴兵上限へ接続。
- 農業を季節兵糧収入へ接続し、「開墾」命令を追加。
- 徴兵を人口→守備兵の変換に変更し、人口由来の徴兵上限を導入。
- Field Armyに季節ごとの金・兵糧維持費を追加。物資不足時は遠征Unit士気低下。
- AI徴兵も人口・徴兵上限を利用。
- iPhone/Android横画面向けに城内政の季節収支カードとArmy維持費表示を追加。

# Playable Sengoku Loop Phase 2 — Army Marching

- Added mobile-first Army deployment UI (up to 3 officer-led Units, first Unit commander).
- Added `Army.startMarch`, `deployAndMarch`, `cancelMarch`, `advanceSeason`, and Legacy arrival resolution.
- Player armies now appear on the strategic map while marching and resolve on the next season tick.
- Army arrival bridges safely into existing Legacy Battle without changing the Tactical prototype.
- Total force display now counts castle guards + field Units.
- Added marching invariants to `validateState`.
- Added PWA landscape manifest and landscape safe-area adjustments.
- Added 10 logic tests, 3 DOM tests, and 8 static Phase 2 checks.
- Updated the stale v1.0 static schema assertion from schema 10 to the already-adopted playable-loop schema 11.

# Playable Sengoku Loop Phase 1 — Unit / Army Foundation

- `schemaVersion`を10→11へ更新。v10セーブからの非破壊migrationを追加。
- `state.units{}` / `state.armies{}` を追加。
- `castle.guardTroops`を城守備兵のSource of Truthとして追加し、既存`castle.troops`は同値ミラーとして温存。getterは不使用。
- `src/data/unitTypes.js`、`src/systems/unitSystem.js`、`src/systems/armySystem.js`を追加。
- 武将へ`assignment`（governor/domestic/army/idle）を追加し、城主・捕虜・浪人・Army所属との不変条件を拡張。
- runtime中の城兵力変更をUnit guard helperへ集約。
- Phase1 focused 13/13、既存Core 103/103、Phase0 8/8、長期/イベント/外交/セーブsimulationをPASS。
- Army marching、Domestic MVP、Tactical接続、Siegeは意図的に次Phase以降へ延期。
- player-facing次PhaseはMobile-first（iPhone/Android横画面）を必須条件とする。

# Core v1.0.1 Test Play Hotfix

## Playable Sengoku Loop Phase 0 — Battle boundary refactor
- `Battle.resolveLegacy` と `Battle.applyOutcome` を追加し、既存 `Battle.resolve` を互換ラッパー化。
- Legacy戦闘結果を `BattleOutcome` 形式で表現。
- 新機能・schema・UI・バランス変更なし。
- 既存回帰テスト + Phase0 8/8 + 長期シミュレーションをPASS。


- 画面幅1050px以下で、下部モバイルナビがモーダルより前面に出て「軍議を始める」などのボタン操作を妨げる問題を修正しました。
- モーダル表示中は下部ナビを非表示・操作不能にし、モーダルを確実に最前面へ表示します。
- ゲーム内容、バランス、セーブ形式は変更していません。

# CHANGELOG

## Core v1.0 — 正式リリース

- Core v1.0 RC1を正式版へ昇格
- 表示名、HTMLタイトル、デバッグ見出し、プレイレポート名を正式版表記へ更新
- ゲーム内容、バランス、AI、セーブ形式には変更なし
- `schemaVersion: 10`、`gameVersion: "core-0.95"`を互換性維持のため継続
- 自動テスト、長期シミュレーション、静的検査、JavaScript構文検査を再実行
- Safari、Chrome、iPhoneの実機手動操作は未実施

# Changelog

## Core v1.0 RC1 — Balance and Release QA

### Added

- 難易度別の序盤防衛、AI行動数、侵攻閾値、投入兵力、対プレイヤー侵攻上限
- 停滞に応じた段階的な侵攻判断強化
- 一強勢力への小幅抑制と劣勢勢力への小幅回復支援
- 落城直後の士気安定化
- 勝利・敗北画面の戦役統計とRC1プレイレポート
- Release Balanceデバッグsnapshot
- Phase 3 focused 25項目、DOM 8項目、static 24項目
- 4勢力×3難易度の決定論的RC1長期シミュレーション
- リリースガイド、バランスノート、受入チェックリスト

### Preserved

- `schemaVersion: 10`、`gameVersion: "core-0.95"`と既存セーブ互換
- Core v0.95イベント、外交、忠誠、捕虜、Phase 1セーブ復旧、Phase 2操作案内
- `file://`直接起動、外部依存なし
- 正式人物、正式物語、画像、音楽は未追加

### Limitation

- Safari、Chrome、iPhoneの実機手動操作は未実施。RC1でユーザー受入確認を行う。

## Core v1.0 Phase 2 — Guidance, Accessibility, Mobile

### Added

- 状況別「次の一手」と初回5項目チェックリスト
- タイトル・メニューから開ける遊び方、用語集、キーボード一覧
- 初心者ガイドの有効化、閉じる、進行保存、再開
- 文字拡大、高コントラスト、動きを減らす表示設定
- モーダルの見出し関連付け、初期focus、focus trap、focus復帰
- skip link、城の`aria-label`・`aria-pressed`、武将のbutton化
- スマートフォン下部ナビ、横スクロール地図、bottom-sheet modal、safe-area対応
- `Sengoku.Systems.UX`によるガイド進行・表示設定の状態変更
- Phase 2 focused 18項目、DOM 15項目、static 20項目

### Preserved

- Core v1.0 Phase 1のchecksum、3世代バックアップ、自動復旧
- `schemaVersion: 10`、`gameVersion: "core-0.95"`と旧セーブ互換
- 戦役、外交、AI、イベント、バランス、正式コンテンツ未追加
- `file://`直接起動、外部依存なし

### Limitation

- Safari、Chrome、iPhoneでの実機手動操作は未実施。DOM・静的・回帰検査で代替。

## Core v1.0 Phase 1 — Save Recovery

### Added

- checksum付きsave envelopeと保存後読戻し検証
- オートセーブ・手動3スロットごとの3世代バックアップ
- JSON破損、checksum不一致、移行失敗時の自動fallback
- セーブ管理画面の保存状態、破損表示、手動バックアップ復旧
- 正常保存・ロード・import時のruntime checkpoint
- 不正状態autosave時の直前正常state復旧
- 25 focused tests、5 DOM tests、9 static checks、200-cycle save stability simulation
- `docs/SAVE_RECOVERY_GUIDE.md`

### Preserved

- Core v0.95.1の戦役、外交、AI、イベント、バランス、103回帰テスト
- `schemaVersion: 10`、`gameVersion: "core-0.95"`、旧plain JSONと既知legacy save移行
- `file://`直接起動、外部依存なし、クラウド・ネットワーク保存なし

## Core v0.95.1 release cleanup

### Fixed

- standalone legacy test runnerへ`contentPacks.js`と`eventExtensions.js`の依存読込を追加
- `TEST_RESULTS.md`のPhase 1〜3・DOM UIテスト実行コマンドを実際のHarness構成に修正
- ゲーム挙動、バランス、セーブ形式、`schemaVersion: 10`、`gameVersion: "core-0.95"`は変更なし

## Core v0.95

### Added

- `schemaVersion: 10`、`gameVersion: "core-0.95"`とschema 9→10無損失移行
- Content Pack Registry、trigger index、注入可能な決定論RNG、安定event instance
- blocking choice、費用・実行不能理由、原子的preflight/commit、結果・履歴
- 非プレイヤー勢力の決定論的AI choiceとfallback
- 汎用Story Arc定義・runtime・履歴・diagnostics
- 空のpersonality/traitレジストリと武将profile追加・削除・条件・selector・AI modifier
- 論理・戦役・勢力・城・武将・関係・因縁・外交・event状態の条件と安全演算子
- 決定論selector、既存Systemsを再利用するevent effects、汎用interaction
- 連鎖・emit・queue・履歴・diagnostics・choice・effect・selector上限と循環・不正参照検出
- event debug tools、著者ガイド、schema/Packリファレンス、無効example pack
- Phase 3集中テスト、15 DOM検査、8-seed×300季event simulation、10,000 emit stress

### Preserved

- Core v0.9の103回帰テスト、外交・戦略AI・全シナリオ、v0.2〜v0.9セーブ移行
- `file://`直接起動、外部依存なし、`window.Sengoku`単一名前空間

### Not added

- 正式人物・性格・特性・物語、AI物語判断、GUI event editor、UI全面刷新

## Core v0.9

### Fixed from Core v0.8

- 武将関係を`state.relationships.officers`へ移し、`state.diplomacy.relations`を勢力ペア専用へ分離しました。
- 通常合戦を`war`状態だけに限定し、UI、Battle計画・解決、AI、AI対AI、AI対プレイヤーの迂回経路を閉じました。
- v0.8武将関係値を保持するschema 8→9移行と回帰テストを追加しました。

### Added

- `schemaVersion: 9`、`gameVersion: "core-0.9"`
- 中立、戦争、停戦、不戦条約、同盟の完全勢力ペア状態
- 関係改善、宣戦、和平、条約締結・延長・破棄、物資援助、援軍、捕虜交換・解放
- 降伏、方向付き従属、貢納、従属解除、独立、循環・軍事制限、覇権勝利
- 0〜100の戦争疲弊と合戦・徴兵・AI和平への小幅補正
- AI提案pending、受諾／拒否UI、外交一覧・詳細・履歴、スマートフォン対応
- 各勢力0〜1外交行動、同時戦争上限、再宣戦・提案クールダウン、12季停滞再評価
- 103回帰テスト、8 UIスモーク検査、18静的検査、200季×8 seed全勢力AI検査

### Preserved

- Core v0.8の52テストと既存ゲーム機能
- `owari_short`のシナリオ固有初陣、`core_campaign`の12城・4勢力
- 直接`index.html`起動、外部依存なし、単一`window.Sengoku`名前空間
- v0.2〜v0.8セーブ移行

### Not added

- 正式人物、新性格、正式ストーリー、結婚、子ども、家系、装備
- 本格諜報、暗殺、生成AI、オンライン、クラウド、課金、UI全面刷新

## Core v0.8

### Fixed from Core v0.7

- 合戦の投入兵力を実兵力以下かつ最低守備兵を残す値へ制限し、最低20兵を生成していた幽霊兵力を廃止しました。
- 城主任命を共通関数へ集約し、一人の武将が複数城の城主になる経路を閉じました。
- 離反時に旧城主解除、所属・配属更新、忠誠事件、戦国記、軍議ログ、生涯記録を残すよう修正しました。
- 離反・捕虜・武将移動・落城後に旧勢力の城主・配属参照が残らないよう修正しました。
- 城主、所属、配属、双方向・重複隣接、捕虜、pendingBattle、参照整合性の厳格検証を追加しました。
- 固定分岐だった季節イベントを`events.js`の条件・効果定義から実行する方式へ変更しました。

### Added

- `schemaVersion: 8`、`gameVersion: "core-0.8"`
- `owari_short`と`core_campaign`のシナリオ定義
- 12城・4勢力・各勢力最低4武将の長期検証キャンペーン
- `easy`、`normal`、`hard`の難易度データと合戦・AI・初期資源補正
- シナリオ、勢力、難易度を順に選ぶ新規ゲーム画面
- 動的プレイヤー勢力、動的勝敗・エンディング・レポート
- 基本AI、AI対AI侵攻、AI対プレイヤー侵攻、防衛戦報告
- 自勢力城間の武将移動
- 勢力滅亡、全城支配または他勢力全滅による天下統一
- セーブ概要表示、v0.7から`owari_short`への移行
- 城移譲、武将移動、AI 1/10季、100季節、検証、明示修復のデバッグ操作
- 既存13項目を保持した52項目の回帰テスト、静的検査、100季節×3回のシミュレーション

### Preserved

- Core v0.7の4城短期戦役とシナリオ固有の初陣
- 内政、徴兵、訓練、休養、偵察、侵攻
- 総大将、副将、戦術、戦場判断、負傷
- 捕虜、登用、解放、忠誠、不満、面談、褒賞、約束、離反
- 宿敵、因縁、戦国記、合戦記録、オートセーブ、手動3スロット、JSON入出力
- v0.2〜v0.6既知セーブ移行とv0.6 legacy資料

### Not added

- 正式人物、新性格、正式ストーリー、結婚、子ども、世代交代、装備
- 本格外交、同盟、停戦、生成AI、オンライン、クラウド、課金、UI全面刷新

## Phase 7 — Strategic Depth / Strategic Campaign v0.3

- Added static identities and strategic modifiers for all 12 castles.
- Connected governor/domestic officer assignments to economy, population growth, and siege defense.
- Added exclusive domestic assignment commands and validation/repair safeguards.
- Added multi-hop Army route finding (friendly intermediate castles, max 3 segments), route ETA, and terrain/profile travel pacing.
- Added route interruption/retreat behavior when an intermediate friendly castle changes ownership.
- Added mobile castle identity, assignment chips, strategic route and ETA UI.
- Added AI domestic assignment and castle strategic-defense awareness.
- Kept schemaVersion 12 and existing Tactical B5.3 rules unchanged.
