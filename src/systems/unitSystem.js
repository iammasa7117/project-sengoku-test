(function (S) {
  "use strict";
  var U = S.Systems.Unit = {};

  function nextId(state) {
    var index = 1, units = state.units || {};
    while (units["unit_" + index]) index += 1;
    return "unit_" + index;
  }

  U.get = function (state, id) { return state.units && state.units[id] || null; };
  U.all = function (state) { return Object.keys(state.units || {}).map(function (id) { return state.units[id]; }); };
  U.forArmy = function (state, armyId) { return U.all(state).filter(function (unit) { return unit.armyId === armyId; }); };
  U.forOfficer = function (state, officerId) { return U.all(state).filter(function (unit) { return unit.officerId === officerId; }); };
  U.totalFactionTroops = function (state, factionId) {
    var guard = Object.keys(state.castles || {}).reduce(function (sum, id) { var castle = state.castles[id]; return sum + (castle.factionId === factionId ? (Number.isFinite(castle.guardTroops) ? castle.guardTroops : castle.troops) : 0); }, 0);
    var field = U.all(state).reduce(function (sum, unit) { return sum + (unit.factionId === factionId && unit.status !== "destroyed" ? Math.max(0, unit.troops) : 0); }, 0);
    return guard + field;
  };

  U.setGuardTroops = function (state, castleOrId, value) {
    var castle = typeof castleOrId === "string" ? state.castles[castleOrId] : castleOrId;
    if (!castle || !Number.isFinite(Number(value))) return { ok: false, errors: ["守備兵更新対象が不正です"] };
    var normalized = Math.max(0, Math.floor(Number(value)));
    castle.guardTroops = normalized;
    castle.troops = normalized;
    return { ok: true, stateChanges: { castleId: castle.id, guardTroops: normalized, troops: normalized }, messages: [], errors: [] };
  };

  U.changeGuardTroops = function (state, castleOrId, delta) {
    var castle = typeof castleOrId === "string" ? state.castles[castleOrId] : castleOrId;
    if (!castle || !Number.isFinite(Number(delta))) return { ok: false, errors: ["守備兵増減対象が不正です"] };
    var current = Number.isFinite(castle.guardTroops) ? castle.guardTroops : castle.troops;
    return U.setGuardTroops(state, castle, current + Number(delta));
  };

  U.create = function (state, spec) {
    spec = spec || {};
    state.units = state.units || {};
    var officer = state.officers[spec.officerId], type = S.Data.getUnitType(spec.unitType), army = state.armies && state.armies[spec.armyId];
    if (!officer || officer.status !== "active") return { ok: false, errors: ["Unitの武将が不正です"] };
    if (!type) return { ok: false, errors: ["Unit兵種が不正です"] };
    if (!army) return { ok: false, errors: ["Unit所属Armyが不正です"] };
    if (army.factionId !== officer.factionId) return { ok: false, errors: ["UnitとArmyの勢力が一致しません"] };
    if (U.forOfficer(state, officer.id).length) return { ok: false, errors: ["同一武将に複数Unitを作成できません"] };
    var troops = Math.floor(Number(spec.troops)), maxTroops = spec.maxTroops === undefined ? Math.max(troops, type.defaultMaxTroops) : Math.floor(Number(spec.maxTroops));
    if (!Number.isFinite(troops) || troops <= 0 || !Number.isFinite(maxTroops) || maxTroops <= 0 || troops > maxTroops) return { ok: false, errors: ["Unit兵力が不正です"] };
    var id = spec.id || nextId(state);
    if (state.units[id]) return { ok: false, errors: ["Unit IDが重複しています"] };
    var unit = {
      id: id,
      factionId: officer.factionId,
      officerId: officer.id,
      unitType: type.id,
      troops: troops,
      maxTroops: maxTroops,
      morale: Number.isFinite(spec.morale) ? S.Util.clamp(Math.round(spec.morale), 0, 100) : 70,
      experience: Number.isFinite(spec.experience) ? Math.max(0, Math.floor(spec.experience)) : 0,
      status: spec.status || "active",
      armyId: army.id
    };
    state.units[id] = unit;
    return { ok: true, stateChanges: { unitId: id, unit: unit }, messages: [], errors: [] };
  };

  U.remove = function (state, unitId) {
    if (!state.units || !state.units[unitId]) return { ok: false, errors: ["Unitが見つかりません"] };
    var unit = state.units[unitId];
    delete state.units[unitId];
    return { ok: true, stateChanges: { unitId: unitId, officerId: unit.officerId }, messages: [], errors: [] };
  };
})(window.Sengoku);
