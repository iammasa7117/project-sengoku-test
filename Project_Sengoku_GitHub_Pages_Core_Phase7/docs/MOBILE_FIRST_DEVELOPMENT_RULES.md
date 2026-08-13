# Project Sengoku — Mobile-first Development Rules

Project Sengoku は携帯ゲームを主対象とする。PCは検証環境であり、UI設計の基準にはしない。

## Primary target
- iPhone / Android の横画面を戦闘の基準とする。
- Coreの戦略・内政UIもスマートフォンから無理なく操作できることを各Phaseの完了条件に含める。
- 画面幅の違いに依存しないレスポンシブ設計を維持する。

## Input
- Pointer Eventsを基本とし、マウス専用操作を作らない。
- hover必須操作を作らない。
- 主要タップ領域は原則44 CSS px以上を確保する。
- 指で対象を隠す操作ではプレビューや重要表示を接触点からオフセットする。
- スクロール、ブラウザジェスチャー、ゲーム操作の衝突を避ける。

## Layout
- safe-area (`env(safe-area-inset-*)`) を考慮する。
- 常設HUDは最小限にし、ゲーム世界の表示面積を優先する。
- デスクトップUIを縮小して携帯版にしない。各画面をMobile-firstで設計する。

## Architecture
- UI都合をCore stateのドメインモデルへ混入させない。
- Core / Tactical間はAdapter/Boundaryを介し、TacticalがCore stateを直接参照しない。
- 将来のApp Store / Google Play配布を阻害するWeb固有の密結合を避ける。

## Phase gate
Phase 0は内部リファクタのみのためUI変更なし。Phase 2以降、プレイヤー向け画面を追加・変更するPhaseでは、上記のMobile-first条件を自動/手動テスト項目へ追加する。
