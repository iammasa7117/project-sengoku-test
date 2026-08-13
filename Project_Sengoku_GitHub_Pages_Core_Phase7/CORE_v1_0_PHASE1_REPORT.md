# Project Sengoku Core v1.0 Phase 1 Report

## Scope

Core v0.95.1のゲーム仕様を維持したまま、ローカルセーブの破損検知、バックアップ、復旧、書込み安全性を実装しました。

## Added

- checksum付きsave envelope
- staging書込みと完全一致読戻し
- スロット別3世代バックアップ
- 主データ破損時の自動fallbackと主データ再構築
- セーブ管理画面の状態表示と手動復旧
- runtime checkpointと不正autosave時の復旧
- 保存diagnostics、容量・slot health集計
- 旧plain JSON、schema 10、既知legacy保存キー互換

## Preserved

- `schemaVersion: 10`
- `gameVersion: "core-0.95"`
- 戦役、外交、AI、イベント、バランス
- `file://`直接起動
- 外部ライブラリ・ネットワーク保存なし

## Verification

- v1 Phase 1 focused: 25/25 PASS
- v1 Phase 1 DOM: 5/5 PASS
- v1 Phase 1 static: 9/9 PASS
- save stability: 200 cycles, 3 intentional corruptions, 3 recoveries, PASS
- legacy Phase 1: 18/18 PASS
- legacy Phase 2: 23/23 PASS
- legacy Phase 3: 29/29 PASS
- full regression: 103/103 PASS
- existing DOM: 15/15 PASS
- UI smoke: 8/8 PASS
- existing static: 34/34 PASS
- long simulation: 3/3 profiles PASS
- diplomacy simulation: 8/8 runs PASS
- event simulation: 8/8 seeds PASS
- event stress: 11/11 PASS
- JavaScript syntax: 60/60 PASS

## Limitation

実際のSafari、Chrome、iPhoneでの`file://`手動操作はこの環境では実施していません。DOMテスト、HTML参照検査、Nodeテスト、構文検査で代替しました。
