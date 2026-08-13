# Claude Code Review — Project Sengoku Phase 5 / Playable Sengoku Loop v0.1

コード変更はせず、実装レビューだけしてください。

Phase 0〜4までの既存実装とテストを実際に読み、Phase 5で追加したSiege/占領後統治が既存の安全性を壊していないか厳しく確認してください。

## Phase 5の狙い

Playable Sengoku Loop v0.1を完成させることです。

城 → Domestic → Officer/Unit → Army → March → Tactical → BattleOutcome → Siege → Capture → Occupation

## 主な変更

- `src/systems/siegeSystem.js`追加
- Tactical野戦勝利 ≠ 常時即落城
- 圧勝時は即落城
- 僅差時はArmy.status=`besieging`
- 包囲Armyは次季に自動攻城継続
- 包囲Armyは既存Army維持費対象
- 任意撤退可能
- Legacy Battleは従来の即時落城を維持
- `Battle.applyOutcome`からLegacy城移転責務をSiegeへ委譲
- `validateState`にbesieging整合性追加
- schemaVersionは12のまま
- mobile UIに包囲メーター/囲マーカー/撤退操作を追加

## 必ず確認してほしい項目

1. `Battle.resolve` / `resolveLegacy` / `applyOutcome` / `Siege.resolveLegacy`の責務分離が安全か。
2. Legacy戦の旧挙動が本当に保持されているか。
3. Tactical戦後に守備兵・Army兵が二重計上/消失しないか。
4. `guardTroops === troops`ミラーが全経路で維持されるか。
5. `besieging` Armyをsave/loadしてもvalidateStateが成立するか。
6. 包囲中の外交変化・最低兵力割れ・任意撤退が安全か。
7. 継続攻城から落城した際、Unit/Army/Officer/城主/捕虜の参照が残らないか。
8. 同じ武将が城とArmyに二重所属しないか。
9. Battle reportを後日の落城時に更新する設計に不整合がないか。
10. Core/Tacticalのplain-data Adapter境界を壊していないか。
11. Core/Tacticalの決定論へ悪影響がないか。
12. AI Legacy経路とプレイヤーTactical経路の結果意味論が不自然に乖離していないか。
13. Mobile-first UIで、包囲状態・撤退・落城がiPhone横画面で理解しやすい構造か（静的コードから評価可能な範囲）。
14. B6/B7/20v20等を今入れずv0.1を止める判断が妥当か。

## テスト

既存テストを削除/弱体化せず再実行してください。特に:

- Core 103/103
- Phase0〜4
- Phase5 Siege 9/9
- Phase5 static 9/9
- save stability
- long/diplomacy/event/release simulations
- Tactical B5.x全テスト
- 全JS `node --check`

追加で必要と思う不変条件テストがあれば、コード変更せず「追加すべきテスト」として列挙してください。

## 回答形式

A. Phase 5実装の要約
B. Critical
C. High
D. Medium
E. 良い設計 / 壊さない部分
F. 兵力保存則レビュー
G. Siege状態遷移レビュー
H. Save/validationレビュー
I. Mobile UXレビュー
J. Playable Sengoku Loop v0.1を「完成」と呼んでよいか
K. 次にやるべきこと / まだやらないこと

単に肯定せず、実際のファイル名・関数名・データ経路を根拠に指摘してください。
