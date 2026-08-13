# Event Schema Reference — Core v0.95

## Event state

`state.events.engine`は`enabledPackIds`、`onceKeys`、`cooldowns`、`firedEventIds`、`instanceKeys`、`activeEvent`、`queue`、`pendingInteraction`、`variables`、`counters`、`arcs`、`history`、`diagnostics`、`emissions`、`metrics`、`rng`を保持します。

武将拡張は次の固定形です。

```js
profile: { personalityIds: [], traitIds: [], tags: [] }
```

## Safe operators

`==`、`!=`、`>`、`>=`、`<`、`<=`、`includes`、`notIncludes`、`between`、`exists`、`notExists`。

## Conditions

- logical: `all` `any` `not`
- campaign: `scenario` `difficulty` `turn` `year` `season` `resource`
- faction: `factionAlive` `factionCastleCount` `factionTotalTroops` `factionResource` `factionRank` `factionIsPlayer` `factionWarExhaustion` `factionReputation` `factionVassalStatus`
- castle: `castleOwner` `castleTroops` `castleDefense` `castleMorale` `castleDevelopment` `castleNeighbor` `castleGovernor`
- officer: `officerStatus` `officerFaction` `officerCastle` `officerStat` `officerLoyalty` `officerGrievance` `officerAmbition` `officerInjury` `officerLevel` `officerMerit` `officerPersonality` `officerTrait` `officerTag` `officerPromiseStatus`
- relationship/rivalry: `officerRelationship` `rivalryRespect` `rivalryResentment` `rivalryEncounters`
- diplomacy: `diplomacyStatus` `diplomacyScore` `diplomacyTrust` `diplomacyGrievance` `diplomacyCommonEnemy`
- event: `eventFlag` `eventVariable` `eventCounter` `eventFired` `arcStatus` `arcStep` `eventCooldown`

Phase 1/2互換aliasも維持します。

## Selectors

trigger/player/battle/byId/random系に加え、`highestStatOfficer`、`lowestStatOfficer`、`highestLoyaltyOfficer`、`lowestLoyaltyOfficer`、`highestGrievanceOfficer`、`castleGovernor`、`randomPrisoner`、`randomFactionCastle`、`weakestBorderCastle`、`strongestCastle`、`recentlyCapturedCastle`、`factionById`、`strongestFaction`、`weakestFaction`、`randomEnemyFaction`、`diplomaticPartner`を提供します。

## Effects

`Event.EFFECT_TYPES`が正式一覧です。event state、戦役・勢力、城、武将、関係・因縁、捕虜、外交、記録・Arc、interactionの各effectはすべてvalidate、preflight、applyを同じtransaction経路で通ります。城所有、任命、移動、忠誠、捕虜、関係・因縁、外交は既存Systemsを呼びます。

## Arc runtime

`inactive`、`active`、`completed`、`failed`と、`currentStep`、`completedSteps`、`startedTurn`、`updatedTurn`、`completedTurn`、`failedTurn`を保存します。
