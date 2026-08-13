# Project Sengoku — Phase UI-2 Command Visual Report

## Goal
UI-1で整えた「城・内政・家臣・登用」に続き、戦略ゲームの主要操作である「軍団編成・出陣準備・外交・評定」を同じモバイル横画面のビジュアル言語へ統一する。

## Implemented
- 軍団編成/出陣準備を全画面戦略UI化。
  - 出陣元、守備兵、出陣可能兵、命令数を上部に集約。
  - 侵攻先/進軍路/ETA/敵兵力を1つの作戦選択欄へ集約。
  - 総大将・第二部隊・第三部隊をカードとして可視化。
  - 既存の `armyTarget / armyOfficerX / armyTypeX / armyTroopsX` IDを維持し、Army.deployAndMarchへそのまま接続。
- 外交画面を勢力カード型へ刷新。
  - 勢力、外交状態、関係、信頼、遺恨、評判、疲弊、国力、条約残りを視覚化。
  - 外交詳細は大きい操作タイルへ変更。既存の全外交アクションを維持。
  - 援助・援軍の詳細入力も既存IDを維持。
- 評定を全画面ビジュアル化。
  - 統率/知略/武勇/政治の代表家臣が「守備・偵察・出陣・商業」を進言。
  - 既存 command 系へ接続し、新しいゲームロジックは追加していない。
  - 通常のモバイル軍議パネルもUI-2カード表現へ更新。
- オリジナル仮アートを3点追加。
  - `army-camp.svg`
  - `diplomacy-scroll.svg`
  - `council-hall.svg`
- schemaVersionは12のまま。セーブデータ変更なし。

## Compatibility
- Core / Unit / Army / Domestic / Diplomacy / Siege / Living Front / Tactical B5.3のロジックは変更なし。
- 旧UIテストが依存する操作ID・dataset・API名を維持。
- GitHub Pages Lite版はCore/TacticalのJS/CSSをbundle化し、ブラウザアップロード制限対策として全28ファイルに削減。

## Tests
- Core 103/103 PASS
- Phase 0 8/8 PASS
- Phase 1 13/13 PASS
- Phase 2 10/10 PASS
- Phase 3 13/13 PASS
- Phase 4 Tactical Integration 11/11 PASS
- Tactical Bridge 7/7 PASS
- Phase 5 Siege 9/9 PASS
- Phase 6 Mobile Campaign 7/7 PASS
- Phase 7 Strategic Depth 10/10 PASS
- Phase 8 Living Front 6/6 PASS
- UI-1 6/6 + Static 14/14 PASS
- UI-2 4/4 + Static 12/12 PASS
- Core Static 34/34 PASS
- DOM 15/15 PASS
- UI Smoke 8/8 PASS
- Save 200 cycles / recovery 3/3 PASS
- Long simulation / Diplomacy / Events / Event stress / Release / Living World PASS
- Tactical B5.x 全13テストPASS、60戦 33-27、勝率55%
- 全137 JSファイル構文PASS
- GitHub Pages Lite bundle JS構文PASS、HTTP配信主要URL 200

## Deferred
- 正式武将イラスト・正式城画像
- 軍団の陣形プリセット
- 出陣画面でのリアルタイム兵数スライダー連動表示
- 外交イベント専用演出
- Phase 9 Field Battle / Interception
