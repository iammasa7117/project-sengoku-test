# Project Sengoku Phase 8 — iPhone / Android 実機テスト

## 起動

GitHub Pages版をSafari/Chromeで開き、横画面にしてください。

## 最優先テスト

1. 新規ゲームを開始し、AIをONのまま季節を進める。
2. 戦争状態の勢力から敵Armyが出陣するまで数季進める。
3. 地図に赤系の敵Army markerが出ることを確認。
4. プレイヤー城へ向かう敵軍はThreat表示になり、城選択時の説明に「敵軍接近」が出ることを確認。
5. 敵Armyをタップして、任務・兵力・進軍路・残りETAを確認。
6. AI側が援軍を出した場合「援」markerで表示されることを確認。
7. 敵Army到着後、Legacy Battleで結果が処理され、ゲームが続行できることを確認。
8. 自分のArmy出陣 → Tactical Battle → Core復帰もPhase 7同様に動くことを確認。

## 見てほしいUX

- 複数Armyが出ても地図が読めるか
- 赤いThreatが目立ちすぎない/弱すぎないか
- ETAが理解しやすいか
- 「敵が瞬間移動で攻めてくる」感が消えたか
- 敵軍を見てから防御を考える時間が生まれたか

## 今回まだできないこと

- 敵Armyそのものへ自軍をぶつけて迎撃する
- Army同士の途中野戦
- AI Tactical Battle
- 日単位での連続移動

これらはPhase 9以降の候補です。
