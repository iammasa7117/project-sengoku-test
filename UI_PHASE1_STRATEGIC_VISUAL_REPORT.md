# Project Sengoku — Phase UI-1 Strategic Visual Overhaul 実装レポート

## 目的
Phase 8 Living Frontを土台に、戦略画面を「開発用UI」から「戦国ゲームとして視覚的に理解できるUI」へ改修した。ゲームロジック・schemaVersion 12・Tactical B5.3は変更していない。

## 実装内容
- 城詳細を大幅再設計
  - オリジナル仮城郭アート
  - 城主の仮武将画
  - 人口 / 守備兵 / 民忠 / 防備をバー表示
  - 徴兵可能数
  - 編成中Army兵科の実データ表示
  - 本丸 / 農地 / 城下町 / 人口の視覚カード
  - 内政 / 家臣一覧 / 人材登用 / 出陣の4主要導線
- 内政コマンド画面
  - 新田開発 / 商業投資 / 軍事訓練 / 偵察 / 外交 / 徴兵 / 出陣 / 武将移動などを大型タイル化
  - 未実装の城強化・建設は「準備中」と明示し、偽のゲーム処理は追加していない
- 家臣一覧
  - 仮武将画、所属・役割、統率/武勇/知略/政治、忠誠、Unit兵力を横一列で比較可能
- 在野・登用候補
  - roninとプレイヤー捕虜をカード表示
  - 捕虜は既存の登用交渉へ接続
  - ronin直接登用は未実装のため明示的に無効化
- Mobile-first
  - iPhone/Android横画面ではビジュアルモーダルを全画面化
  - safe-area対応
  - タップ領域と情報密度を横画面向けに調整

## 仮アート
`assets/ui/` に城郭1点、コマンド9点、武将タイプ5点のオリジナルSVGを追加。正式アートへ置換可能。

## 非変更事項
- schemaVersion 12
- Save migration / checksum / backup
- validateState / repairState
- Army / Living Front AI
- BattleAdapter / Tactical B5.3
- Siege / diplomacy / loyalty / prisoner / events

## テスト
- Core 103/103 PASS
- Phase 0 8/8 PASS
- Phase 1 13/13 PASS
- Phase 2 10/10 PASS
- Phase 3 13/13 PASS
- Phase 4 Tactical Integration 11/11 PASS
- BattleSpec Bridge 7/7 PASS
- Phase 5 Siege 9/9 PASS
- Phase 6 Mobile Campaign 7/7 PASS
- Phase 7 Strategic Depth 10/10 PASS
- Phase 8 Living Front 6/6 PASS
- Core Static 34/34 PASS
- Phase UI-1 DOM/logic 6/6 PASS
- Phase UI-1 Static 14/14 PASS
- DOM 15/15 / UI Smoke 8/8 PASS
- Save 200 cycles + corruption recovery 3/3 PASS
- Living World simulation 24 seasons / validation PASS
- Tactical B5.x all tests PASS
- Tactical neutral balance 33-27 / 55% PASS
- 全JS `node --check` PASS

## 実機で見る点
自動ビジュアルスクリーンショットは実行環境のlocalhost/fileブロックにより取得不能。iPhone Safari実機で最終確認が必要。
