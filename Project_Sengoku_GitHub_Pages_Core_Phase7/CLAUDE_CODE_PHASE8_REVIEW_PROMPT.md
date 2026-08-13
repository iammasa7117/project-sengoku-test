# Claude Code Review Prompt — Project Sengoku Phase 8 Living Front

コード変更はせず、Phase 8をレビューしてください。

重点確認:

1. 通常プレイのAI攻撃が`AI.launchArmyAttack`から実Armyを作り、旧即時Battleと二重実行されないか。
2. simulation/allFactions時は既存Legacy経路が維持され、決定論テストを壊していないか。
3. `mission: attack/reinforce`追加がschema12/旧saveへ安全か。
4. `findFriendlyRoute` / `startTransfer`で敵城を援軍路として通過できないこと。
5. 援軍到着時にUnit/Armyが消え、守備兵へ兵数が正しく戻ること。
6. 兵力二重計上・武将assignment重複が起きないこと。
7. 1勢力1侵攻Army制限が過剰にAIを停止させないか。
8. fieldThreshold（旧instant attackより低い閾値）の設計が妥当か。
9. Threat表示がMobile-first UIとして十分か。
10. Phase 9でArmy vs Army interceptionを入れる前に直すべき構造がないか。

既存のvalidateState/save/event transaction/Tactical B5.xルールを壊す提案は避けてください。

最後にCritical / High / Mediumと、Phase 9へ進んでよいかを回答してください。
