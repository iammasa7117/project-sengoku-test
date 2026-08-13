Project Sengoku Phase 7「Strategic Depth」を実装しました。

今回はコードを変更せず、まず厳密にレビューしてください。

前提:
- Mobile-first。iPhone / Android横画面が主対象
- Phase 5でPlayable Sengoku Loop v0.1は一周済み
- Phase 6でMobile Campaign UXを実装済み
- Tactical B5.3の戦闘ルールは今回は変更しない
- schemaVersion 12を維持
- save/validate/event transaction/determinismを壊さない

Phase 7の目的は、戦略レイヤーに
「どの城を取るか」
「誰を城に残すか」
「どの道を通るか」
という判断を追加することです。

主な変更:
1. src/data/castleTraits.js
   - 12城すべてに城種/タイトル/タグ/金/兵糧/人口/攻城防御/行軍補正
2. Officer Assignment深化
   - 城主/奉行/Army/待機
   - 1城1奉行
   - 奉行の政治が内政へ、城主の政治/統率が経済/守備へ影響
   - 奉行を出陣させると奉行ボーナスを失う
3. Army strategic routes
   - 最大3区間
   - BFS
   - 中間地点は友軍城のみ
   - mountain/route profileで1区間の所要季節が変化
   - 中継城の所有権が変わると安全側へ撤退
4. Mobile UI
   - 城プロフィール
   - assignment chips
   - Army route / ETA
   - 出陣時の役割喪失警告
5. AI compatibility
   - AIが余剰武将を奉行に任命
   - 攻撃候補評価が城固有防御/城主守備を考慮
   - AI vs AIはLegacy Battleのまま

以下を実コードを読んで確認してください。

A. Phase 7の実装内容が実際にコードへ入っているか
B. schemaVersion 12のままで安全か
C. castleTraitsをstate外の静的データにした判断は適切か
D. Officer assignmentの排他性に抜け道がないか
E. 奉行→Army出陣で役割が解除されるフローに兵力/武将整合性バグがないか
F. Castle governorの出陣時処理に矛盾がないか
G. Domesticのボーナスが二重適用されていないか
H. Siegeへの戦略防御加算はLegacy/Tactical両方で意味が一貫するか
I. Army.findRouteのBFS、maxHops、中間友軍制約にバグがないか
J. segmentSeasons / remainingEtaにoff-by-oneがないか
K. 中継城が敵に変わった場合のretreat処理が安全か
L. セーブ/ロード中のmulti-hop Armyが正しく復元できるか
M. AI ensureAssignmentsがプレイヤー武将やGovernorを誤って奪わないか
N. Mobile UIが役割/ルート情報を過剰に常設していないか
O. Phase 6までのMobile/Tactical UXに回帰がないか
P. 既存103/103や長期simulationだけでは見つからない境界ケース

特にCritical / High / Mediumで分類してください。

また、次のPhase 8候補として
「Living Strategic World / Army AI」
を考えています。

ただし日単位Clockにはまだ移行せず、季節ターンのまま、
- AIもArmy Entityとして出陣
- 敵Armyがマップ上を移動
- Army同士の遭遇/迎撃
- 援軍
- 前線防衛
を追加し、「世界が動いている感」を強くする案です。

Phase 8へ進む前に直すべきPhase 7の問題があれば、必ず先に指摘してください。

最後に:
1. Phase 7 判定: PASS / PASS WITH FIXES / STOP
2. 必須修正
3. 推奨修正
4. Phase 8へ進んでよいか
5. Phase 8で実装すべきMUST / SHOULD / LATER

を出してください。

コード変更はしないでください。
