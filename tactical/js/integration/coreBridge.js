(function (T) {
  "use strict";
  var I = T.Integration = T.Integration || {};
  var params = new URLSearchParams(window.location.search);
  I.integrated = params.get("integrated") === "1";
  if (!I.integrated) return;

  function parseSpec() {
    try { return JSON.parse(params.get("spec") || "null"); } catch (error) { return null; }
  }
  I.spec = parseSpec();
  if (!I.spec || !I.spec.attacker || !I.spec.defender || !Array.isArray(I.spec.attacker.units) || !Array.isArray(I.spec.defender.units)) return;

  function add(state, spec) { state.units[spec.id] = T.createUnit(spec); state.order.push(spec.id); }
  function positions(count, side) {
    var F = T.FIELD, out = [], columns = Math.min(7, Math.max(1, count));
    for (var i = 0; i < count; i += 1) {
      var row = Math.floor(i / columns), col = i % columns;
      var x = columns === 1 ? F.width / 2 : 145 + col * ((F.width - 290) / (columns - 1));
      var yBase = side === "player" ? F.height - 72 : 72;
      var y = side === "player" ? yBase - row * 72 : yBase + row * 72;
      out.push({ x: x, y: y });
    }
    return out;
  }
  function createFromSpec(seed) {
    var spec = I.spec, actualSeed = Number(seed === undefined ? spec.seed : seed) >>> 0;
    var state = {seed:actualSeed,rng:new T.RNG(actualSeed),tick:0,maxTicks:Number(spec.maxTicks)||7000,status:"running",winner:null,units:{},order:[],selectedUnitId:null,selectedUnitIds:[],orderMode:null,facingPrompt:null,eventMessages:[],visualEffects:[],initialTotals:{player:0,enemy:0},ui:{rosterCollapsed:false}};
    var sides = [{ key:"player", units:spec.attacker.units || [] }, { key:"enemy", units:spec.defender.units || [] }];
    sides.forEach(function (group) {
      var pos = positions(group.units.length, group.key);
      group.units.forEach(function (raw, idx) {
        var troops = Math.max(1, Math.floor(Number(raw.troops) || 1));
        var item = {
          id:String(raw.id), officerId:String(raw.officerId || raw.id), officerName:String(raw.officerName || raw.officerId || raw.id),
          coreOfficerId:raw.coreOfficerId || null, coreUnitId:raw.coreUnitId || null,
          side:group.key, unitType:T.UnitTypes[raw.unitType] ? raw.unitType : "ashigaru",
          troops:troops, maxTroops:Math.max(troops, Math.floor(Number(raw.maxTroops)||troops)), morale:Number(raw.morale),
          x:pos[idx].x, y:pos[idx].y, facing:group.key === "player" ? -Math.PI/2 : Math.PI/2, isCommander:Boolean(raw.isCommander)
        };
        if (!Number.isFinite(item.morale)) item.morale = 80;
        add(state, item); state.initialTotals[group.key] += troops;
      });
      if (group.units.length && !T.getUnits(state, group.key).some(function (u) { return u.isCommander; })) T.getUnits(state, group.key)[0].isCommander = true;
    });
    return state;
  }
  T.createBattleState = createFromSpec;

  function resultButton(result) {
    var panel = document.getElementById("resultPanel"); if (!panel || document.getElementById("returnToCoreBtn")) return;
    var button = document.createElement("button"); button.id="returnToCoreBtn"; button.type="button"; button.className="bridge-return-btn";
    button.textContent = "戦略画面へ結果を戻す";
    button.addEventListener("click", function () {
      button.disabled = true; button.textContent = "結果を反映中…";
      var targetOrigin = window.location && window.location.origin && window.location.origin !== "null" ? window.location.origin : "*";
      window.parent.postMessage({type:"PROJECT_SENGOKU_TACTICAL_OUTCOME", battleId:I.spec.battleId, result:result}, targetOrigin);
    });
    panel.appendChild(button);
  }
  I.onFinish = resultButton;

  window.addEventListener("DOMContentLoaded", function () {
    var title = document.querySelector(".menu-head strong"); if (title) title.textContent = "CORE連動会戦";
    var seedInput = document.getElementById("seedInput"); if (seedInput) { seedInput.value = String(I.spec.seed >>> 0); seedInput.disabled = true; }
    var restart = document.getElementById("restartBtn"); if (restart) restart.textContent = "同条件で再戦";
  });
})(window.Tactical = window.Tactical || {});
