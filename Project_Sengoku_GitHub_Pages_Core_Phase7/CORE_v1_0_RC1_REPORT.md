# Project Sengoku Core v1.0 RC1 Report

## Scope

Core v1.0 Phase 2を基準に、難易度差、AI攻勢判断、序盤防衛、一強化抑制、劣勢勢力支援、落城後士気、終了画面、プレイレポート、リリース文書を調整しました。

## Automated verification

- Core regression: 103/103 PASS
- Event Phase 1/2/3: 18/18、23/23、29/29 PASS
- v1 Phase 1/2/3 focused: 25/25、18/18、25/25 PASS
- DOM: Phase 1 5/5、Phase 2 15/15、Phase 3 8/8、Core 15/15 PASS
- Static: Phase 1 9/9、Phase 2 20/20、Phase 3 24/24、Core 34/34 PASS
- Save stability: 200 cycles、破損復旧3/3 PASS
- Diplomacy 8構成、Event 8 seed、Event stress 10,000 emit、RC1 12構成: PASS
- JavaScript: 72/72 syntax PASS

## Compatibility

- `schemaVersion: 10`
- `gameVersion: core-0.95`
- Core v0.95、v0.95.1、v1.0 Phase 1、Phase 2のセーブ経路を維持
- `file://`直接起動を維持

## Content exclusions

正式人物、正式性格・特性、正式物語、画像、音楽、オンライン機能は追加していません。

## Manual limitation

Safari、Chrome、iPhoneの実操作確認は自動検査環境では未実施です。RC1配布後に実機受入確認を行います。
