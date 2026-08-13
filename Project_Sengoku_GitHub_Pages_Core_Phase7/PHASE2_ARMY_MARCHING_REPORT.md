# Project Sengoku — Playable Sengoku Loop Phase 2 Report

## Scope

Phase 2 connects the Phase 1 Unit/Army data model to an actual player-visible strategic flow while intentionally leaving Tactical B5.3 disconnected.

Implemented flow:

`Castle → Unit composition → Army deployment → strategic-map march → next-season arrival → Legacy Battle → capture or retreat`

This is a transitional integration phase. The objective is to prove the strategic backbone before Domestic MVP and Tactical integration.

## Mobile-first implementation

- Regular player `attack` actions now open the Army deployment planner instead of the legacy battle planner.
- The planner is designed as a bottom-sheet/modal flow already used by the mobile Core UI.
- Up to 3 officer-led Units can be assigned per Army in this phase.
- Unit 1 is the commander.
- Each Unit stores its selected `unitType` and troop count.
- Touch controls retain the Core mobile minimum target sizing and add 46px form controls for Army composition.
- The strategic map renders a tappable Army marker between origin and destination.
- Army details show commander, total troops, route, Unit composition, and a retreat action.
- Landscape safe-area handling was extended for short iPhone/Android viewports.
- `manifest.webmanifest` requests `standalone` + `landscape` when installed as a PWA.

## Army Marching logic

New/extended APIs in `src/systems/armySystem.js`:

- `Army.totalTroops(state, armyOrId)`
- `Army.startMarch(state, armyId, destinationCastleId)`
- `Army.deployAndMarch(state, castleId, destinationCastleId, unitSpecs, options)`
- `Army.cancelMarch(state, armyId)`
- `Army.resolveArrivalLegacy(state, armyId, options)`
- `Army.advanceSeason(state, options)`

Phase 2 intentionally supports only adjacent-castle movement. `currentLocation` while marching is:

```js
{
  fromCastleId,
  toCastleId,
  hopsRemaining: 1
}
```

The Army arrives when the next strategic season is advanced.

## Legacy Battle bridge

Tactical B5.3 is deliberately not connected yet.

When a field Army reaches an enemy castle, Phase 2 performs a compatibility bridge:

1. Snapshot Army troop total / officer membership.
2. Return the field Army to the origin troop pool through the existing guarded `Army.disband` path.
3. Create the existing Core `Battle.plan` using that exact deployed troop total.
4. Resolve with existing `Battle.resolve` / Legacy Battle.
5. On victory, move the remaining Army officers to the captured target; on defeat, they remain/return at origin.

This lets Phase 2 prove `Castle → Army → March → Battle → Castle` without prematurely coupling Core to Tactical.

### Known deliberate limitation

`unitType` is preserved in Unit data but **does not affect the Legacy Battle formula**. 足軽/騎馬/鉄砲/侍 differences become combat-relevant when the later BattleAdapter/Tactical integration is implemented.

## Strategic clock integration

`Turn.advance()` now runs `Army.advanceSeason()` after diplomacy season-start processing and before AI strategic actions.

This means:

- player launches Army during the current season;
- Army is visible on the map;
- next season advances the Army and resolves arrival;
- AI then sees the resulting updated ownership state.

World time remains the existing seasonal turn model. No day-tick/Living World conversion was introduced.

## Validation additions

`validateState` now checks:

- marching `currentLocation.fromCastleId` and `toCastleId` exist;
- the marching segment is an actual castle-neighbor edge;
- `hopsRemaining` is a non-negative integer;
- `marching` Armies use the marching location shape;
- `arrived` Armies use `{castleId}`.

Schema remains **11**. No migration is required from Phase 1.

## UI changes

New file:

- `src/ui/renderArmy.js`

Updated:

- `index.html` — `armyLayer`, `renderArmy.js`, mobile/PWA metadata
- `renderMap.js` — Army markers and Army-aware map notes
- `renderApp.js` — total force includes field Units
- `renderOfficers.js` — regular invasion command renamed to Army deployment
- `renderBattle.js` — common battle-report renderer reuse
- `main.js` — deployment/cancel/detail handlers and Army battle report after season advance
- `styles/components.css` / `styles/responsive.css` — Army UI + mobile landscape rules

Opening-event battles and debug battles still use the existing direct Legacy battle planner so scenario compatibility is preserved.

## Tests added

### Phase 2 logic

`node tests/nodeHarness.js tests/phase2ArmyMarchingTests.js`

**10 / 10 PASS**

Covers:

- API presence
- deployment + command consumption
- adjacent-only restriction
- minimum attack force
- retreat/cancel
- diplomacy cancellation before arrival
- victory/capture on arrival
- defeat/return on arrival
- `Turn.advance` integration
- save/load of marching Army

### Phase 2 DOM

`node tests/phase2ArmyMarchingDomHarness.js`

**3 / 3 PASS**

### Phase 2 static

`node tests/phase2ArmyMarchingStatic.js`

**8 / 8 PASS**

## Regression results

Confirmed after Phase 2 changes:

- Core baseline: **103 / 103 PASS**
- Phase 0 Battle refactor: **8 / 8 PASS**
- Phase 1 Unit/Army: **13 / 13 PASS**
- v1 Phase 1: **25 / 25 PASS**
- v1 Phase 1 DOM: **5 / 5 PASS**
- v1 Phase 1 static: **9 / 9 PASS**
- v1 Phase 2: **18 / 18 PASS**
- v1 Phase 2 DOM: **17 / 17 PASS**
- v1 Phase 2 static: **20 / 20 PASS**
- v1 Phase 3: **25 / 25 PASS**
- v1 Phase 3 DOM: **8 / 8 PASS**
- v1 Phase 3 static: **24 / 24 PASS** after updating the obsolete schema-10 assertion to schema 11
- legacy phase tests: **18 / 18, 23 / 23, 29 / 29 PASS**
- legacy DOM: **15 / 15 PASS**
- UI smoke: **8 / 8 PASS**
- static checks: **34 / 34 PASS**
- save stability: **200 cycles, 3/3 corruption recoveries, PASS**
- long simulation: PASS
- diplomacy simulation: PASS
- event simulation: PASS
- event stress: PASS
- release simulation: PASS
- all `src/*.js` syntax checks: PASS

## Not implemented in Phase 2

- Domestic MVP (population/tax/food loops)
- multi-hop pathfinding
- continuous Army progress
- Army supply
- AI-created field Armies (AI still uses existing Legacy strategic attacks)
- Tactical B5.3 integration
- BattleAdapter
- Siege MVP separation
- B6 fatigue/pursuit
- B7 Tactical AI
- 15v15 / 20v20
- day-based Living World

## Next recommended phase

**Phase 3 — Domestic MVP**

Minimum target:

- population
- tax/gold relationship
- recruitment capacity
- food production/consumption
- Army maintenance
- Officer Assignment UI refinement

After that, proceed to the BattleAdapter/Tactical integration phase.
