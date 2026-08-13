Project Sengoku Playable Sengoku Loop Phase 0 の独立レビューをしてください。

今回はコード変更をせず、レビューだけしてください。

目的:
既存 Battle.resolve() を、将来CoreとTacticalをBattleOutcome境界で接続できるように、
- Battle.resolveLegacy(state, options)
- Battle.applyOutcome(state, plan, outcome)
- Battle.resolve(state, options) 互換ラッパー
へ分割しました。

確認してほしいこと:
1. 旧Battle.resolveと挙動が実質完全互換か
2. resolveLegacyが正常系でstateを変更していないか
3. RNG消費順が旧実装と一致しているか
4. 退却/捕縛/因縁の分岐が旧実装と一致しているか
5. applyOutcomeに計算ロジックが不必要に残っていないか
6. BattleOutcomeのフィールドがPhase 4のTactical Adapterに発展可能か
7. 既存Battle.resolveのAPI/返却shapeが壊れていないか
8. schemaVersion 10を維持してよい変更範囲か
9. validateState/save/event/diplomacyへの回帰リスク
10. Phase 1 (Unit/Army/guardTroops/assignment/schema v11)へ進んでよいか

必ず実際のコードと tests/phase0BattleRefactorTests.js を読んでください。
可能なら既存テストも再実行してください。

Critical / High / Medium / Low に分けて指摘し、最後に GO / GO WITH FIXES / NO-GO の判定をください。
