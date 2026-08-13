# Project Sengoku Phase 10 — Battle Aftermath / Retreat & Pursuit

## 目的
Phase 9 / 9.1で成立した街道野戦に「戦後」を追加し、敗軍が瞬間的に消える状態をやめる。

野戦勝利 → 敗軍が地図上を敗走 → 勝者が追撃するか判断 → 次季に生存兵が自城へ帰還、という流れを成立させる。

## 実装内容

### 1. 敗走Army
- Field Battle敗軍は原則、即`disband()`せず`status="returning"`へ移行。
- `mission="retreat"`、`retreatCastleId`、`retreatStartedTurn`を保持。
- Battle発生Turn内では帰還処理を行わず、追撃判断の時間を確保。
- 次のTurnのArmy phaseで自勢力城へ帰還し、生存兵を守備兵へ戻してArmyを解散。
- 退却先が戦場segmentの自勢力側endpointとして解決できない特殊ケースでは、既存の安全な自城帰還へfallback。

### 2. 地図 / Army UI
- 敗走軍を地図上に残す。
- 旗表示は`退`。
- Army Detailは`任務: 撤退`、`状態: 敗走中`、`退却路`、残り季数を表示。
- 敗走ArmyはThreat、迎撃、通常Field Contact対象から除外。

### 3. 追撃
プレイヤー側がField Battleに勝利し、敵敗走Armyが存在する場合のみ同Turn中に追撃可能。

追撃する:
- 敗走時点の残存兵へ18%（最低1兵）の追加損害。
- 勝利側総大将のfatigue +8。
- 同一Battleの二重追撃は禁止。

追撃しない:
- 追加損害なし。
- 戦報を確定して軍議へ戻る。

追撃は追加Tactical Battleを起こさない。Phase 10 v0.1では戦後の即時判断として扱う。

### 4. Battle Report
Field Battle reportに以下を追加:
- `winnerArmyId`
- `loserArmyId`
- `winnerFactionId`
- `winnerCommanderId`
- `battleTurn`
- `pursuitAvailable`
- `pursuitResolved`
- `pursuitLoss`
- `pursuitResult`

既存Battle Report利用側は追加fieldを無視できるため後方互換。

## 意図的なPhase 9仕様変更
Phase 9ではField Battle敗軍は即座に自城へ戻りArmyが消えていた。
Phase 10では「撤退」の意味を、原則1Turnだけ地図に残る`returning` Armyへ変更した。

城所有権、Siege発生条件、Core/Tactical Adapter境界は変更していない。

## 互換性
- `schemaVersion = 12` 維持。
- 既存Saveは`returning` Armyを持たないため破壊的migration不要。
- Phase 9.1 Tactical season resumeを維持。
- Castle Siege Tactical / Siege / Diplomacy / Domestic / AI Armyを維持。
- `file://`直接起動、`window.Sengoku`、UI-2を維持。
- `01_START_GAME.html` self-contained bundleへsource変更を同期。

## 変更ファイル
- `src/systems/armySystem.js`
- `src/state/validateState.js`
- `src/ui/renderMap.js`
- `src/ui/renderArmy.js`
- `src/main.js`
- `styles/components.css`
- `index.html`
- `01_START_GAME.html`
- `tests/phase9FieldBattleTests.js`（Phase 10の意図的な撤退仕様変更へ期待値更新）
- `tests/phase10BattleAftermathTests.js`
- `tests/phase10BattleAftermathStatic.js`
- `tests/phase10BattleAftermathDomTests.js`
- `tests/phase10BattleAftermathDomHarness.js`

## Phase 10テスト
- Phase 10 logic: 13/13 PASS
- Phase 10 static: 12/12 PASS
- Phase 10 DOM: 3/3 PASS

確認内容:
1. Legacy敗軍が`returning`になる。
2. 同じTurn内で即帰城しない。
3. 次Turnに生存兵が自城へ帰還。
4. Tactical敗軍も同じ敗走経路を使う。
5. Tactical season resumeでも敗走Armyが消えない。
6. 敗走Armyは接触/迎撃/Threat対象外。
7. 敗走stateのschema12 Save/Load。
8. Player勝利時のみ追撃可能。
9. 追撃による追加損害とfatigue。
10. 二重追撃禁止。
11. 追撃しない場合は追加損害なし。
12. 次Turn以降は追撃不可。
13. 未選択追撃機会のSave/Load。

## Regression
- Core: 103/103 PASS
- Phase 0: 8/8 PASS
- Phase 1 Unit/Army: 13/13 PASS
- Phase 2 Army Marching: 10/10 PASS（正式nodeHarness）
- Phase 3 Domestic: 13/13 PASS
- Phase 4 Tactical Integration: 11/11 PASS
- Tactical Bridge: 7/7 PASS
- Phase 5 Siege: 9/9 PASS
- Phase 6 Mobile Campaign: 7/7 PASS
- Phase 7 Strategic Depth: 10/10 PASS
- Phase 8 Living Front: 6/6 + Static 8/8 PASS
- Phase 9 Field Battle: 7/7 PASS
- Phase 9.1 Stabilization: 4/4 PASS
- UI-1: 6/6 + Static 14/14 PASS
- UI-2: 4/4 + Static 12/12 PASS
- Core Static: 34/34 PASS
- Save Stability: 200 cycles / 3 corruption recoveries / PASS
- Release / Long / Diplomacy / Event / EventStress / LivingWorld: PASS
- Tactical B5.x scripts: ALL PASS
- Neutral Tactical balance: 60/60, player 33 / enemy 27 / draw 0, PASS
- JavaScript syntax: 147 files PASS
- `01_START_GAME.html` inline JavaScript syntax: PASS

## Phase 10 v0.1で意図的に未実装
- AI勝利時の追撃判断
- 騎馬比率・武将特性による追撃性能差
- 追撃側の兵損失/反撃事故
- 追撃から捕縛判定への接続
- 複数季に及ぶ長距離敗走
- 敗走Armyへの再迎撃
- Tactical B6としての追撃戦画面

これらはPhase 11以降でゲームバランスを見ながら追加可能。
