# Project Sengoku Phase 9.1 — Field Battle Stabilization Report

## 目的
Phase 9のArmy Interception / Field Battleを新機能追加なしで安定化し、迎撃UI・同季複数接触・Tactical割込み後のseason処理を安全にする。

## 修正内容
- `src/ui/renderArmy.js`
  - 未定義だった`interceptHtml`を生成。
  - 迎撃可能時に「迎撃可能」「迎撃軍を出す」を表示。
  - 迎撃圏外ではボタンを出さず、最終隣接区間で迎撃可能になる旨を表示。
- `src/systems/armySystem.js`
  - season内の`engagedArmies`追跡を追加し、1 Armyが同一seasonに複数Field Battleへ参加することを防止。
  - 接触開始順を「player Army → 兵力 → ID同率判定」とし、単純なArmy ID順への依存を軽減。
  - Tactical割込み時に`resumeState`（phase/index/ids/contact tracking）を返し、処理位置を復元可能にした。
- `src/systems/turnSystem.js`
  - `pendingTacticalBattle.resumeArmyState`へArmy処理の中断位置を保存。
  - Tactical結果適用後、未処理Armyのseason処理を再開してからseason後半処理へ進む。
- `src/systems/battleAdapter.js`
  - Tactical完了時に`resumeArmyState`を`Turn.resumeAfterTactical()`へ引き継ぐ。
- `src/main.js`
  - 同一seasonで別Tacticalが続いた場合、戦報を閉じた後にpending Tacticalを開ける経路を追加。
- `01_START_GAME.html`
  - 上記source変更をself-contained bundleへ同期。

## 互換性
- `schemaVersion = 12`を維持。
- 既存Save形式を変更しない。
- `resumeArmyState`は`pendingTacticalBattle`内の追加情報として保存され、旧Saveに存在しない場合は従来どおりseason後半処理へ進む。
- Core/Tactical Adapter境界、Castle Siege、Diplomacy、Domestic、AI Army、UI-2を維持。

## 新規テスト
- `tests/phase9_1StabilizationTests.js`: 4/4 PASS
  - 1 Army = 1 Field Battle / season
  - 接触相手が単純なArmy ID順だけで決まらない
  - Tactical後に未処理Armyを再開
  - schema12 Save/Loadでresume位置を保持
- `tests/phase9FieldBattleDomTests.js`: 2/2 PASS
  - 迎撃可能Army詳細
  - 迎撃圏外Army詳細
- `tests/phase9_1StabilizationStatic.js`: 8/8 PASS

## 回帰結果
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
- Phase 9 Field Battle: 7/7 PASS
- UI-1: 6/6 + Static 14/14 PASS
- UI-2: 4/4 + Static 12/12 PASS
- Core Static: 34/34 PASS
- Save Stability: 200 cycles / PASS
- Release / Long / Diplomacy / Event / EventStress / LivingWorld simulations: PASS
- Tactical B5.x and balance simulation: PASS
- JavaScript syntax: 141 files PASS
- `01_START_GAME.html` inline bundle syntax: PASS

## Phase 10へ進む前の手動確認
実機iPhone/Android横画面で、敵Armyタップ → 迎撃 → 編成 → 野戦 → Core復帰を1回確認する。自動テストではDOM/logic/bundleまで確認済み。
