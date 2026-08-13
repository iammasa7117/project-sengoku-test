Project Sengoku Phase UI-1 Strategic Visual Overhaulをレビューしてください。

コード変更はまだ行わず、レビューのみしてください。

背景：Phase 8 Living Frontのゲームロジックは維持しつつ、「何のゲームか視覚的に分かりづらい」という実機フィードバックを受け、戦略UIを全面的に視覚化しました。合意済みモックは docs/UI_PHASE1_REFERENCE_MOCK.png です。

確認対象：
- src/ui/strategicVisual.js
- styles/strategicVisual.css
- assets/ui/*.svg
- src/ui/dom.js の modalClass対応
- src/main.js の新UI導線
- index.html の読込順
- tests/phaseUI1StrategicVisualTests.js
- tests/phaseUI1StrategicVisualStatic.js

特に確認してください：
1. 既存Core/Army/Tactical/Siegeへの回帰がないか
2. DOMへ直接偽データを表示していないか
3. 未実装機能を実装済みに見せていないか
4. iPhone landscape 844x390 / 932x430で情報量が過多ではないか
5. タッチターゲット、safe-area、スクロール、モーダル閉じる操作
6. renderCastleDetailを後ロードモジュールでoverrideする方式の保守性
7. openModalのmodalClass追加が既存モーダルへ影響しないか
8. 在野0人・捕虜0人・城主未任命など空状態の安全性
9. 仮アートを正式素材へ置換しやすい構造か
10. UI-1をこの時点で固定しPhase 9へ戻ってよいか

Critical / High / Mediumに分け、最後に「採用して次へ進める / 修正後に進める」の判定をください。
