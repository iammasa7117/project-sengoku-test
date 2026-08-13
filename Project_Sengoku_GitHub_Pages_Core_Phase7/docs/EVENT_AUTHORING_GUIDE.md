# Event Authoring Guide — Core v0.95

イベントはJavaScript処理ではなく、Content Pack内のプレーンなデータとして定義します。関数、HTML、URL・storage・file・DOM操作は使用できません。Packは`window.Sengoku.Data.ContentPackRegistry`へ登録され、起動時または登録時に検証・コンパイルされます。

## 最小イベント

```js
{
  id: "example.event",
  trigger: Sengoku.Config.EVENT_TRIGGERS.SEASON_START,
  blocking: true,
  once: false,
  priority: 10,
  chance: 1,
  title: "検証イベント",
  body: "{{officer.name}}へ方針を示します。",
  conditions: [{ type: "season", operator: "==", value: 0 }],
  selectors: { officer: { type: "highestStatOfficer", factionId: "aotsuki", stat: "politics" } },
  choices: [{ id: "accept", label: "受け入れる", aiWeight: 2, resultText: "受け入れました。", effects: [{ type: "setFlag", flag: "exampleAccepted", value: true }] }]
}
```

`selector`は発火時に一度だけ解決され、instanceの`targets`へIDが保存されます。表示用templateは`{{campaign.year}}`、`{{value.name}}`、`{{selectorName.field}}`だけを参照し、出力時にescapeされます。

choiceは条件と費用の両方を満たす場合だけ選択できます。AI用には`aiWeight`と、全候補が利用不能な場合の`fallbackChoiceId`または`fallback: true`を指定します。effectと費用は同じ複製状態でpreflightされ、1件でも失敗すると一切commitされません。

## Story Arc

Packの`arcs`へ`id`、`name`、`description`、`startEventId`、`initialStep`、`steps`、`completionConditions`、`failureConditions`を定義します。stepの`nextStep`は既知stepだけを指せます。循環は禁止です。`startArc`、`advanceArc`、`setArcStep`、`completeArc`、`failArc` effectで進行します。

## 安全上限

- chain 12、1 emit 20 event、queue 50、history 500、diagnostics 200
- 1 eventあたりchoice 12、effect 30、selector 20
- 未知type・参照、重複ID、self/indirect cycle、関数、raw HTMLは拒否

通常ゲームへ追加する前に`Event.validateContentPack(pack)`、`Event.registerContentPack(pack)`、集中テスト、DOMテスト、決定論simulationを実行してください。
