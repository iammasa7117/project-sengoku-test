# Project Sengoku Phase 6 — Mobile Campaign UX Report

## 目的
Playable Sengoku Loop v0.1のロジックを変更せず、Core戦略画面を「PCレイアウトを縮小したWebページ」から「スマートフォン横画面のゲームシェル」へ変換する。

## 実装
- `src/ui/mobileCampaign.js`を追加。モバイル横画面判定、地図/城/軍議ビュー切替、選択城ドック描画を担当。
- `index.html`へ選択城ドック、横向き要求オーバーレイ、スマホ用下部ナビを追加。
- `renderApp.js`のResource HUDへsemantic classを追加し、モバイルでは金/兵糧/命令を優先。
- `uxGuide.scrollToSection`はスマホ横画面ではスクロールではなくビュー切替へ委譲。Desktopでは従来のscrollIntoViewを維持。
- `main.js`で既存季節進行処理を`advanceSeason()`に一本化し、画面内ボタンとモバイル下部「次季」が同じ処理を使用。
- `dom.js`でゲーム中のみ`game-active`を付与し、portrait overlayをタイトル画面へ干渉させない。
- `responsive.css`にiPhone/Android landscape game shell、safe-area、1画面パネル切替、compact HUD、selected castle dockを追加。

## 非変更範囲
- schemaVersion 12
- Battle / Tactical Bridge / Siege
- Unit / Army / Domestic
- Diplomacy / Loyalty / Prisoner / Event
- AIロジック
- Save envelope / migrations / checksum / backups
- Tactical B5.3ルール

## Phase 6の意図
このPhaseは新しいゲームシステムではなく、Playable Loopを実際の携帯ゲームとして操作可能にするUXレイヤー。次のシステム拡張へ進む前に、戦略レイヤーとTacticalレイヤーの両方が同じ「横画面モバイルゲーム」として感じられることを狙う。
