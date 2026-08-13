# Project Sengoku — Playable Loop Phase 4 Tactical Integration Report

## 目的
Phase 3まで独立していたCore戦略レイヤーとTactical B5.3を、密結合させず`BattleAdapter`境界で初めて接続する。

## 実装した接続

```text
Core Army arrives
  -> BattleAdapter.prepareTacticalArrival
  -> plain BattleSpec
  -> tactical/index.html (full-screen iframe)
  -> Tactical fixed-tick battle
  -> plain Tactical result JSON
  -> postMessage
  -> BattleAdapter.translateResult
  -> BattleOutcome(mode="tactical")
  -> Battle.applyOutcome
  -> Turn.resumeAfterTactical
```

### Core側
- `src/systems/battleAdapter.js` 新規。
- `events.pendingTacticalBattle`をoptional runtime/save stateとして追加。schemaは12据え置き。
- player Army到着時のみTacticalへ分岐。`allowTactical:false`、simulation、AI系はLegacy経路を維持。
- Tactical開始時点でArmyは`in_battle`となり、Worldの季節処理後半を停止。
- 会戦結果を適用後にAI行動・季節繰上げ・イベント・離反等の残り処理だけを再開。経済/Army進軍を二重実行しない。
- マップ上の会戦待機Armyを「戦」マーカーで表示。ロード後もArmy詳細から再開可能。

### Core/Tactical兵力スケール
Coreの現在値（数十）は戦略用抽象兵力、Tactical B5.x（数百〜千）は既存バランス用。どちらかを全面改修せず、Adapterだけで`Core troop point × 25`へ拡大する。結果は各Unitの残存率からCore troop pointへ丸めて戻す。

### Tactical側
- B5.3の既存操作・Combat/Morale/Charge/Gunを維持。
- `coreBridge.js`を追加し、queryのplain `BattleSpec`から可変Unit数を生成。
- `battleUnit.js`が`maxTroops`とcore IDを保持可能。
- 勝敗のbroken thresholdを固定5から`ceil(unitCount*5/7)`へ一般化。7v7では従来どおり5。
- outcomeに`side` / `coreOfficerId` / `coreUnitId`を追加。
- 終了時に「戦略画面へ結果を戻す」ボタンを表示。
- Tacticalコード内に`window.Sengoku`参照は0件。

## 安全性
- Tactical iframeへCore stateそのものは渡さない。
- Core側はmessage送信元が実際のTactical iframeであること、battleId、seedを検証。
- `validateState`がpending battleと`in_battle` Armyの整合性を検証。
- pending tactical stateは既存save envelope/checksum/backupsにplain dataとして保存可能。

## テスト結果
- Core regression: 103 / 103 PASS
- Phase 0: 8 / 8 PASS
- Phase 1 Unit/Army: 13 / 13 PASS
- Phase 2 Army Marching: 10 / 10 PASS
- Phase 3 Domestic MVP: 13 / 13 PASS
- Phase 4 integration logic: 11 / 11 PASS
- Phase 4 integration static: 10 / 10 PASS
- Phase 4 Tactical BattleSpec bridge: 7 / 7 PASS
- Phase 2 static / DOM: 8 / 8, 3 / 3 PASS
- Phase 3 static / DOM: 10 / 10, 3 / 3 PASS
- Existing static checks: 34 / 34 PASS
- v1 Phase 1/2/3: 25 / 18 / 25 PASS
- v1 DOM suites: 5 / 17 / 8 PASS
- Tactical B5.x 13 test files: ALL PASS (B5.3 mobile 14/14, rules 20/20, determinism 2/2, balance 60/60 with 55% mirrored player side)
- longSimulation / diplomacySimulation / eventSimulation / eventStress / releaseSimulation: PASS
- saveStabilitySimulation: 200 cycles, 3 corruption recoveries, PASS
- Core + Tactical全JS `node --check`: PASS

## 実機未検証
自動テストではiPhone/Android Safari/Chromeの実指操作、iframe全画面遷移、アドレスバーによる実表示高の差は保証できない。GitHub Pagesで実機確認が必要。

## Phase 5へ残すもの
- Siegeを独立した非ゼロthresholdで本接続し、「野戦勝利=即落城」以外の分岐を作る。
- 占領後統治のUI/状態確認。
- Tactical B5.4 polish、B6 fatigue/pursuit、B7高度AI、20v20は引き続き後回し。
