# Claude Code Review — Phase 6 Mobile Campaign UX

コード変更はせずレビューのみしてください。

Phase 5 Playable Loop v0.1をベースに、Phase 6では戦略画面をスマートフォン横画面専用ゲームUIへ再構成しました。

重点確認:
1. `src/ui/mobileCampaign.js`のview切替が既存stateへ不要な依存を追加していないか。
2. `main.js`の`advanceSeason()`共通化で旧`nextSeasonButton`挙動が完全に維持されているか。
3. mobile bottom「次季」からTactical interrupt / battle report / diplomacy proposal / defense notification / game overまで旧経路と同じ結果になるか。
4. Desktopは従来の3panel/scroll UXを維持しているか。
5. iPhone landscape 844x390 / 932x430でmap/side/councilが実用的か。
6. safe-area、modal z-index、Tactical overlay z-index、portrait rotate overlayの衝突がないか。
7. 選択城ドックの詳細/出陣導線に誤操作や情報不足がないか。
8. Accessibility（aria-current、button target size、focus）に問題がないか。
9. Phase 6でゲームロジックやschema/save互換に意図しない変更が入っていないか。

Critical / High / Medium / Lowで指摘し、最後に「実機テストで必ず見る項目」を列挙してください。
