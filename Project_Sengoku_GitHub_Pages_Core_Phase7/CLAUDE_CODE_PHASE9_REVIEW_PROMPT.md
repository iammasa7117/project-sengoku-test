# Claude Code Review — Project Sengoku Phase 9

コード変更はせずレビューのみしてください。

Phase 9ではPhase 8 + UI-2を基準に、Army Interception / Field Battleを追加しました。

確認対象:
- `src/systems/armySystem.js`
- `src/systems/battleAdapter.js`
- `src/state/validateState.js`
- `src/systems/turnSystem.js`
- `src/ui/renderArmy.js`
- `src/ui/renderMap.js`
- `src/main.js`
- `tests/phase9FieldBattleTests.js`
- `tests/phase9FieldBattleStatic.js`

重点レビュー:
1. 同一segment接触判定に処理順依存がないか。
2. player/AI ArmyのTactical野戦結果返却で兵力二重計上・消失がないか。
3. 迎撃勝利/敗北/引分の撤退・継続ロジックが妥当か。
4. `pendingTacticalBattle.kind="field_battle"`追加が既存城攻略Tacticalを壊していないか。
5. save/validateState互換性。
6. 季節ターン内で複数Army接触した場合の危険性。
7. exploit（迎撃による無限撤退、兵力回復、同Army二重戦闘）がないか。
8. Mobile UXで敵軍→迎撃→編成→野戦が理解できるか。

Critical / High / Mediumに分類し、Phase 10へ進む前に直すべき事項を明示してください。
