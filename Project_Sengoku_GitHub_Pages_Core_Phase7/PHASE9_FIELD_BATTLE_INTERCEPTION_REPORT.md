# Project Sengoku Phase 9 — Field Battle / Interception 実装レポート

## 目的
Phase 8で可視化された敵Armyに対し、城へ到達される前に迎撃し、街道上でArmy同士の野戦を発生させる。

## 実装内容
- `Army.canIntercept()`：敵軍がプレイヤー城へ向かう最終隣接区間に入ったか判定。
- `Army.deployIntercept()`：防衛城から迎撃Armyを出陣。敵軍と逆向きの同一街道へ進出。
- `Army.findEnemyContact()` / `sameSegment()`：同一進軍区間の敵Army接触を検出。
- `Army.resolveFieldBattleLegacy()`：AI同士、またはTactical無効時のArmy野戦自動解決。
- `BattleAdapter.buildArmyBattleSpec()` / `prepareTacticalFieldBattle()`：プレイヤーが参加するArmy野戦をB5.3 Tacticalへ接続。
- `Army.applyFieldTacticalOutcome()`：Tactical結果を両Armyへ返し、敗軍撤退・勝軍継続・迎撃軍帰還を処理。
- 敵Army詳細に「迎撃可能」表示と「迎撃軍を出す」ボタンを追加。
- 迎撃Armyは地図上で「迎」旗を表示。
- 野戦は城の所有権を直接変更しない。Siegeは発生しない。

## ゲームフロー
敵軍接近 → 最終区間で「迎撃可能」 → 武将/兵種/兵数を選んで迎撃軍出陣 → 次季に街道接触 → Tactical野戦 → 勝利なら敵軍撤退、敗北なら敵侵攻続行。

## 互換性
- `schemaVersion` は12のまま。既存セーブへの破壊的変更なし。
- UI-2、Phase 8 Living Front、Core/Tactical Adapter境界を維持。
- 城攻略Tactical、Siege、外交、内政、AI Armyは既存経路を維持。

## テスト
- Core: 103/103 PASS
- Phase 0: 8/8 PASS
- Phase 1 Unit/Army: 13/13 PASS
- Phase 2 Army Marching: 10/10 PASS
- Phase 3 Domestic: 13/13 PASS
- Phase 4 Tactical Integration: 11/11 PASS
- Tactical Bridge: 7/7 PASS
- Phase 5 Siege: 9/9 PASS
- Phase 6 Mobile Campaign: 7/7 PASS
- Phase 7 Strategic Depth: 10/10 PASS
- Phase 8 Living Front: 6/6 PASS
- UI-1: 6/6 + Static 14/14 PASS
- UI-2: 4/4 + Static 12/12 PASS
- Phase 9: 7/7 + Static 9/9 PASS
- Core Static: 34/34 PASS
- Long / Diplomacy / Event / EventStress / Save200 / Release / LivingWorld simulations: PASS
- Tactical B5.x 13 scripts: ALL PASS
- Tactical neutral 60 battles: 33-27, 55%, PASS
- JavaScript syntax: PASS

## 意図的に未実装
- 任意地点をタップして迎撃地点を自由指定する機能
- 複数Armyの同時合流/大規模連合軍
- 日単位の連続位置・速度追跡
- 野戦後の追撃（B6）
- 高度な戦術AI（B7）

Phase 9では、季節ターンのまま「敵が見える → 城外へ迎撃に出る → 野戦で止める」という戦略判断を成立させることを優先した。
