# Project Sengoku Phase 7 — Strategic Depth 実装レポート

## 目的

Playable Sengoku Loop v0.1 / Mobile Campaign v0.2 を壊さず、戦略レイヤーに「どの城を取るか」「誰を城に残すか」「どの道を通るか」という判断を追加する。

Phase 7 は Tactical B6/B7 の追加フェーズではない。会戦ルールは維持し、Core 側の城・武将・Army に意味を持たせることを優先した。

## 実装内容

### 1. 城の個性

`src/data/castleTraits.js` を追加し、現行12城すべてに静的プロフィールを設定した。

各城は以下を持つ。

- 城種別（平城 / 山城 / 丘城 / 港城 / 砦）
- 固有タイトル
- 1文字アイコン
- 説明
- タグ
- 金収入補正
- 兵糧補正
- 人口成長補正
- 攻城防御補正
- 行軍補正

例：清洲は「街道商都」、熱田は「湊の交易地」、月影・白川・岩戸は山城として高い攻城防御と遅い進軍特性を持つ。

城プロフィールは静的データであり、schemaVersion 12 のセーブstateには追加していない。そのため既存セーブ互換を維持する。

### 2. 武将配置の意味

`officer.assignment` の既存基盤を活用し、奉行任命を実際の内政ボーナスへ接続した。

- 城主: 政治による軽い経済補正、統率による守備補正
- 奉行: 政治によるより強い金・兵糧・人口成長補正
- 出陣中: Army / Unit を指揮
- 待機: 配置なし

1城につき奉行1名を `validateState` で保証する。

重要なトレードオフとして、奉行をArmyへ出陣させると奉行配置が解除され、その城の内政ボーナスを失う。これにより「優秀な武将を城に残すか、戦場へ出すか」が実際の選択になった。

### 3. 城プロフィールを内政・攻城へ接続

`domesticSystem.js` に以下を追加。

- `assignmentEffects`
- `effectiveGoldYieldForCastle`
- `effectiveFoodYieldForCastle`
- `populationGrowthForCastle`

季節収入と人口成長に城プロフィール・城主・奉行の効果を反映する。

`Siege.preview` は城固有の攻城防御と城主統率による守備ボーナスを加算する。

### 4. 戦略的な複数区間進軍

Armyは「隣城へ1回移動」だけではなく、友軍城を中継して最大3区間のルートを取れるようになった。

追加API:

- `Army.segmentSeasons`
- `Army.findRoute`
- `Army.routeEta`
- `Army.reachableEnemyTargets`
- `Army.remainingEta`

ルート探索はBFS。中間地点は自勢力城のみ通過可能で、最後の目的地だけ敵城を許可する。

山道など `march` 値が低い区間は2季かかる。中継城が進軍中に敵へ奪われた場合は安全側に倒し、Armyを撤退させる。

### 5. Mobile-first UI

スマートフォン横画面の既存Phase 6 UIを維持し、以下を追加した。

- 城ノードにプロフィールアイコン
- 城詳細に城の個性カード
- 城主 / 奉行 / 守備補正の配置表示
- 武将一覧・武将詳細に役割チップ
- 奉行任命 / 解任操作
- Army編成時に武将の現在役割を表示
- 出陣先に経路・所要季節を表示
- 地図上Armyに残りETA表示
- Army詳細に全ルート表示

奉行や城主を出陣させると役割を失うことをArmy編成UIで明示する。

### 6. AI互換

高度戦術AIは追加していない。

Core AIは各城に可能なら政治の高い余剰武将を奉行として配置する。また攻撃候補評価時に敵城の固有防御・城主守備ボーナスを考慮する。

AI同士の会戦は引き続きLegacy Battleで解決する。

## セーブ / schema

- schemaVersion: **12のまま**
- 新しいcastle profileは静的データのためsave migration不要
- `repairState` は重複奉行を決定論的に解消
- 既存Phase 6 / Playable Loop v0.1のセーブ構造を維持

## 回帰テスト

Phase 7 新規:

- Strategic Depth logic: **10/10 PASS**
- Strategic Depth static: **11/11 PASS**

既存Core:

- Core main: **103/103 PASS**
- Phase 0: **8/8 PASS**
- Phase 1 Unit/Army: **13/13 PASS**
- Phase 2 Army Marching: **10/10 PASS**
- Phase 3 Domestic: **13/13 PASS**
- Phase 4 Tactical Integration: **11/11 PASS**
- Tactical Bridge: **7/7 PASS**
- Phase 5 Siege: **9/9 PASS**
- Phase 6 Mobile logic: **7/7 PASS**
- Core static: **34/34 PASS**
- Phase 2–6 static suites: 全PASS
- v1 regression suites: 全PASS
- DOM smoke: **15/15 PASS**
- UI smoke: **8/8 PASS**

Tactical B5.x:

- 全13テストスクリプト PASS
- 60戦 neutral balance: player 33 / enemy 27 / draw 0、許容帯PASS
- determinism PASS

Stress / persistence:

- long simulation: validate PASS
- diplomacy simulation: validate PASS
- event simulation: deterministic replay PASS
- 10,000 event stress: PASS
- save stability: 200 cycles / 3 recoveries / finalValidation true
- release simulation: deterministic replay / validation PASS
- JavaScript `node --check`: **128 files PASS**

## 実機確認が必要な項目

自動テストは実機iPhone/Androidのタッチ感までは保証しない。特に以下を人間が確認する。

1. 844×390 / 932×430付近で城プロフィールカードが邪魔にならないか
2. 奉行任命が片手で理解できるか
3. Armyの経路・ETAが小さすぎないか
4. 山城への2季移動が直感的に伝わるか
5. 城主/奉行を出陣させた時に「内政・守備を失った」ことが理解できるか
6. Core→Tactical→Coreの既存遷移に回帰がないか

## Phase 7で意図的に未実装

- Tactical B6 疲労 / 追撃
- Tactical B7 高度戦術AI
- 15v15 / 20v20
- AI Armyの完全なWorld Entity運用
- Army同士の迎撃
- 援軍 / 合流 / 分岐
- 日単位Living World
- 本格的な城建物・交易・治安
- Personality/Trait大量コンテンツ

## 次フェーズ候補

Phase 8は **Living Strategic World / Army AI** を推奨する。

季節ターンは維持したまま、AIもArmy Entityを実際に出陣させ、地図上に敵軍が見え、迎撃・援軍・前線防衛という「世界が動いている感」を作る。日単位Clock化はまだ行わない。
