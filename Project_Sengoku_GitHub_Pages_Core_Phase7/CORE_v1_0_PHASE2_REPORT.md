# Project Sengoku Core v1.0 Phase 2 Report

## Scope

Core v1.0 Phase 1のセーブ安定化と全ゲーム仕様を維持し、初回案内、状況別推奨、ヘルプ、アクセシビリティ、モバイル操作性を追加しました。

## Added

- 状況別「次の一手」
- 初回5項目チェックリストと進行保存
- 遊び方、用語集、ショートカット
- 文字拡大、高コントラスト、動きを減らす設定
- `Sengoku.Systems.UX`とschema 10旧セーブへのUX設定補完
- モーダルfocus管理、skip link、城・武将のキーボード操作
- スマートフォン下部ナビ、横スクロール地図、bottom-sheet modal
- Phase 2 browser test page、focused/DOM/static tests

## Preserved

- `schemaVersion: 10`
- `gameVersion: "core-0.95"`
- Core v1.0 Phase 1のchecksum、3世代バックアップ、自動復旧
- 戦役、外交、AI、イベント、バランス
- `file://`直接起動、外部ライブラリ・ビルドなし

## Verification

- v1 Phase 2 focused: 18/18 PASS
- v1 Phase 2 DOM: 15/15 PASS
- v1 Phase 2 static: 20/20 PASS
- v1 Phase 1 focused/DOM/static: 25/25, 5/5, 9/9 PASS
- save stability: 200 cycles, 3 intentional corruptions, 3 recoveries, PASS
- legacy Phase 1/2/3: 18/18, 23/23, 29/29 PASS
- full regression: 103/103 PASS
- existing DOM/UI/static: 15/15, 8/8, 34/34 PASS
- long, diplomacy, event simulation and event stress: PASS
- JavaScript syntax: 66/66 PASS

## Limitation

実際のSafari、Chrome、iPhoneによる`file://`手動操作は実施していません。DOMテスト、静的検査、Node回帰テストで代替しました。
