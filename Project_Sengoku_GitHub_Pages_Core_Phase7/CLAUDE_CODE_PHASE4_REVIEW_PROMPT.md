Project Sengoku Playable Loop Phase 4（Tactical Integration）をレビューしてください。
コード変更はしないでください。実ファイルとテストを読んで、必要ならテストを実行してください。

特に確認してほしい点：
1. CoreとTacticalの境界が`BattleAdapter`へ集約され、Tacticalが`window.Sengoku`/Core stateへ依存していないか。
2. `BattleSpec -> Tactical result -> BattleOutcome -> Battle.applyOutcome`の責務分離が正しいか。
3. Core troop pointとTactical troop数の25倍scale変換、および残存率からCoreへ戻す処理に二重計上・丸め・兵力増殖の危険がないか。
4. player Army到着時の`Turn.advance` interruptionと`resumeAfterTactical`で、経済/外交期限/Army移動/AI/季節イベントが二重実行または未実行にならないか。
5. pending Tactical Battleをsave/loadした時に整合性と再開性が保たれるか。
6. `postMessage`受信時のsource/battleId/seed検証がこのローカル/GitHub Pages構成に十分か。
7. Tactical可変Unit数化が既存B5.3 7v7の勝敗・決定論・モバイル操作を壊していないか。
8. Tactical勝利/敗北/引分でCore Unit、武将assignment、guardTroops/troopsミラー、捕虜/退却、城主、外交戦績がvalidateState上矛盾しないか。
9. Mobile-firstの全画面iframe、landscape、safe-area、復帰ボタンに実機上のCritical問題がありそうか。
10. Phase 5 Siegeに進む前に直すべきCritical/High問題があるか。

既存の重要な不変条件（validateState、save envelope/checksum/backups/migration、event transaction、TacticalのtroopStrengthFactor・対称勝敗・morale/rout）は壊さない前提です。

回答は Critical / High / Medium / 良い点 / Phase 5へ進んでよいか の順にしてください。
