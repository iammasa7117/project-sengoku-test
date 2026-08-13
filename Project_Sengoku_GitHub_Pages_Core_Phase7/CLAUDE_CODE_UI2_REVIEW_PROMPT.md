# Claude Code Review — Project Sengoku Phase UI-2

コード変更はせずレビューのみしてください。

対象：Phase UI-2（UI-1を土台に、軍団編成/出陣、外交、評定をモバイル戦国ゲームUIへ再設計）。

確認してほしい点：
1. `renderArmy.js` の新UIが既存 `deployArmyFromModal` と完全互換か。
2. `armyTarget / armyOfficer1..3 / armyType1..3 / armyTroops1..3` を維持できているか。
3. `renderDiplomacy.js` の全既存外交アクション、使者、援助、援軍入力、AI提案、外交履歴が欠落していないか。
4. `commandVisual.js` の評定が既存 command APIだけを使い、ゲームロジックを重複実装していないか。
5. iPhone Landscapeで情報量が多すぎないか。844×390 / 932×430を想定してCritical/High/MediumでUX問題を指摘。
6. UI-1とのデザイン一貫性。
7. GitHub Pages Lite bundleが実行順・相対パス・Tactical iframe統合を壊す可能性がないか。
8. accessibility（tap target、focus、select、contrast）の問題。
9. Phase 9へ進む前に直すべきUI項目。

既存テストを実行し、レポートのPASS主張も裏取りしてください。
