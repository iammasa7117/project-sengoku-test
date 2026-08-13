Project Sengoku Playable Loop Phase 3 — Domestic MVPをレビューしてください。

コード変更はまだしないでください。レビューのみお願いします。

今回の主な変更:
- schemaVersion 11→12
- castle.population / castle.agriculture追加
- v11→v12 migration
- population→税収ボーナス / 徴兵上限
- agriculture→季節兵糧
- 「開墾」命令追加
- 徴兵を人口→守備兵の変換へ変更
- Armyの季節金/兵糧維持費
- 維持費不足時のUnit士気ペナルティ
- AI徴兵も人口/徴兵上限へ対応
- turnSystemの季節経済をDomestic.processSeasonEconomyへ集約
- Mobile-firstの内政/維持費UI

特に確認してほしいこと:
1. schema11→12 migrationで旧Phase2セーブが壊れないか。
2. population/agricultureをstateの生データとして持つ設計がdeepClone/save/event transactionと安全に共存するか。
3. 徴兵でpopulationを減らす処理に兵力増殖・消失・上限抜けの経路がないか。
4. AI.recruitも同じ人口制約を受けており、プレイヤー/AI非対称がないか。
5. processSeasonEconomyの処理順が既存のTurn/Diplomacy/Army/Eventと衝突しないか。
6. Army upkeepの計算・不足処理がsave/load・determinism・長期simulationを壊していないか。
7. Field Armyのみ追加維持費とするv0.1の簡略化は妥当か。
8. UIがiPhone/Android横画面のMobile-first要件を満たすか。指で押しにくい/情報過多な箇所があれば指摘。
9. Phase 3で追加しすぎたもの、逆にTactical統合前に不足しているものがあるか。
10. 次をBattleAdapter/Tactical Integrationに進めてよいか。

既存テストだけを信用せず、実際のコード・migration・state invariants・書き込み経路を追ってCritical / High / Mediumで指摘してください。
