# Content Pack Guide — Core v0.95

Packは次の形で、`events`と任意の`arcs`をまとめます。

```js
{
  id: "my_pack",
  name: "My Pack",
  version: "1.0.0",
  enabledByDefault: false,
  events: [],
  arcs: []
}
```

IDは小文字英数字から始まり、小文字英数字、`.`、`_`、`-`だけを使います。Pack、event、arc、choiceのIDは各スコープで一意にしてください。`nextEventId`と`queueEvent.eventId`は登録済みeventを参照し、self/indirect cycleを作れません。

`enabledByDefault: false`のPackは新規stateの`enabledPackIds`に入りません。デバッグパネルまたは`Event.enablePack`で明示的に有効化できます。通常ゲームへ自動読込しない例は`docs/examples/example_story_pack.js`です。

登録手順:

1. `Event.validateContentPack(pack)`で単体検証。
2. `Event.registerContentPack(pack)`でRegistry全体、重複、参照、循環を検証。
3. `state.events.engine.enabledPackIds`へSystems経由で追加。
4. 注入RNGを使う集中テストを追加。

Packデータへ関数、HTML、任意URL、storage/file/DOM処理を入れてはいけません。外部データを`fetch()`する構成も非対応です。
