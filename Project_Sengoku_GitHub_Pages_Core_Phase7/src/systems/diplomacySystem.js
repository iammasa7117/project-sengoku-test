(function (S) {
  "use strict";
  var D = S.Systems.Diplomacy = {}, C = S.Data.diplomacy;
  function clamp(value) { return S.Util.clamp(Math.round(value), 0, 100); }
  function fail(message) { return { ok: false, errors: [message], messages: [], stateChanges: {} }; }
  function result(message, changes) { return { ok: true, errors: [], messages: message ? [message] : [], stateChanges: changes || {} }; }
  function account(state, factionId) { return factionId === state.campaign.playerFactionId ? state.campaign : state.factions[factionId]; }
  function factionIds(state) { return Object.keys(state.factions); }
  function alive(state, id) { return Boolean(state.factions[id] && state.factions[id].alive); }
  function majorType(type) { return ["declare_war", "peace", "ceasefire", "non_aggression", "alliance", "break_treaty", "vassalage", "release_vassal", "independence", "surrender"].indexOf(type) >= 0; }
  D.key = C.pairKey;
  D.relation = function (state, a, b) { return state.diplomacy.relations[D.key(a, b)] || null; };
  D.status = function (state, a, b) { var relation = D.relation(state, a, b); return relation ? relation.status : null; };
  D.label = function (status) { return C.statusLabels[status] || status; };
  D.history = function (state, type, actorId, targetId, text, details) {
    var entry = { id: "diplomacy_" + (state.diplomacy.history.length + 1), turn: state.campaign.turn, type: type, actorFactionId: actorId || null, targetFactionId: targetId || null, text: text, major: majorType(type), details: details || {} };
    state.diplomacy.history.push(entry);
    if (state.diplomacy.history.length > 240) state.diplomacy.history.shift();
    if (S.Systems.Event && text) S.Systems.Event.addLog(state, text, entry.major ? "major" : "good");
    return entry;
  };
  D.changeRelation = function (state, a, b, changes) {
    var relation = D.relation(state, a, b); if (!relation) return fail("外交関係が存在しません");
    ["score", "trust", "grievance"].forEach(function (key) { if (Number.isFinite(changes[key])) relation[key] = clamp(relation[key] + changes[key]); });
    return result("", { relation: relation });
  };
  D.castlesFor = function (state, factionId) { return Object.keys(state.castles).map(function (id) { return state.castles[id]; }).filter(function (castle) { return castle.factionId === factionId; }); };
  D.power = function (state, factionId) { var castles = D.castlesFor(state, factionId); return castles.reduce(function (sum, castle) { return sum + castle.troops + castle.defense * 12 + castle.morale / 5; }, 0) + castles.length * 60; };
  D.commonBorder = function (state, a, b) { return D.castlesFor(state, a).some(function (castle) { return castle.neighbors.some(function (id) { return state.castles[id] && state.castles[id].factionId === b; }); }); };
  D.warsFor = function (state, factionId) { return factionIds(state).filter(function (id) { return id !== factionId && D.status(state, factionId, id) === "war" && alive(state, id); }); };
  D.commonEnemies = function (state, a, b) { var wars = D.warsFor(state, a); return D.warsFor(state, b).filter(function (id) { return wars.indexOf(id) >= 0; }); };
  D.overlordOf = function (state, subjectId) { var item = state.diplomacy.vassalage[subjectId]; return item ? item.overlordFactionId : null; };
  D.rootOverlord = function (state, factionId) { var seen = {}, current = factionId; while (D.overlordOf(state, current) && !seen[current]) { seen[current] = true; current = D.overlordOf(state, current); } return current; };
  D.wouldCycle = function (state, subjectId, overlordId) { return subjectId === overlordId || D.rootOverlord(state, overlordId) === subjectId; };
  D.canAttack = function (state, attackerId, defenderId) {
    if (!alive(state, attackerId) || !alive(state, defenderId)) return { ok: false, reason: "存続勢力ではありません" };
    if (attackerId === defenderId) return { ok: false, reason: "同一勢力です" };
    if (D.status(state, attackerId, defenderId) !== "war") return { ok: false, reason: "宣戦布告されていません" };
    if (D.overlordOf(state, attackerId) === defenderId || D.overlordOf(state, defenderId) === attackerId) return { ok: false, reason: "宗主・従属間では侵攻できません" };
    var overlord = D.overlordOf(state, attackerId);
    if (overlord && D.status(state, overlord, defenderId) !== "war") return { ok: false, reason: "宗主の敵以外へ侵攻できません" };
    return { ok: true, reason: "戦争状態" };
  };
  function setStatus(state, a, b, status, options) {
    options = options || {}; var relation = D.relation(state, a, b), duration = options.duration;
    if (!relation || C.statuses.indexOf(status) < 0) return fail("外交状態が不正です");
    relation.status = status; relation.sinceTurn = state.campaign.turn; relation.lastActionTurn = state.campaign.turn;
    relation.expiresTurn = C.treatyStatuses.indexOf(status) >= 0 ? state.campaign.turn + (Number.isInteger(duration) ? duration : C.durations[status]) : null;
    if (status !== "war") relation.redeclareAfterTurn = Math.max(relation.redeclareAfterTurn || 0, state.campaign.turn + C.declarationCooldown);
    return relation;
  }
  function canChangeThisTurn(state, a, b, options) { var relation = D.relation(state, a, b); return Boolean(options && options.ignoreTiming) || !relation || relation.lastActionTurn !== state.campaign.turn; }
  D.declareWar = function (state, actorId, targetId, options) {
    options = options || {}; var relation = D.relation(state, actorId, targetId);
    if (!relation || !alive(state, actorId) || !alive(state, targetId) || actorId === targetId) return fail("宣戦対象が不正です");
    if (D.overlordOf(state, actorId)) return fail("従属勢力は独自に宣戦できません");
    if (relation.status !== "neutral") return fail("中立状態からのみ宣戦できます。条約は先に破棄してください");
    if (!options.ignoreTiming && state.campaign.turn < relation.redeclareAfterTurn) return fail("再宣戦クールダウン中です");
    if (!options.ignoreWarLimit && D.warsFor(state, actorId).length >= C.maxConcurrentWars) return fail("同時戦争数の上限です");
    if (!canChangeThisTurn(state, actorId, targetId, options)) return fail("同じ季節に外交状態を再変更できません");
    setStatus(state, actorId, targetId, "war", options); D.changeRelation(state, actorId, targetId, { score: -18, trust: -12, grievance: 15 });
    var text = state.factions[actorId].name + "が" + state.factions[targetId].name + "へ宣戦しました。"; D.history(state, "declare_war", actorId, targetId, text); S.Systems.Event.addChronicle(state, text);
    return result(text, { status: "war" });
  };
  D.breakTreaty = function (state, actorId, targetId, options) {
    options = options || {}; var relation = D.relation(state, actorId, targetId);
    if (!relation || C.treatyStatuses.indexOf(relation.status) < 0) return fail("破棄できる条約がありません");
    if (!canChangeThisTurn(state, actorId, targetId, options)) return fail("締結した季節には破棄できません");
    var old = relation.status; setStatus(state, actorId, targetId, "neutral", options); relation.brokenTreaties += 1;
    D.changeRelation(state, actorId, targetId, { score: C.treatyBreak.score, trust: C.treatyBreak.trust, grievance: C.treatyBreak.grievance });
    state.diplomacy.reputation[actorId] = clamp(state.diplomacy.reputation[actorId] + C.treatyBreak.reputation);
    var text = state.factions[actorId].name + "が" + D.label(old) + "を破棄しました。"; D.history(state, "break_treaty", actorId, targetId, text, { oldStatus: old });
    return result(text, { status: "neutral", reputation: state.diplomacy.reputation[actorId] });
  };
  function enactTreaty(state, type, actorId, targetId, options) {
    options = options || {}; var status = type === "peace" ? "neutral" : type, relation = D.relation(state, actorId, targetId);
    if (!relation) return fail("外交関係が存在しません");
    if (type === "peace" && relation.status !== "war") return fail("和平は戦争中のみ締結できます");
    if (type === "ceasefire" && relation.status !== "war") return fail("停戦は戦争中のみ締結できます");
    if ((type === "non_aggression" || type === "alliance") && ["neutral", "ceasefire", "non_aggression", "alliance"].indexOf(relation.status) < 0) return fail("この状態では条約を締結できません");
    if (!canChangeThisTurn(state, actorId, targetId, options)) return fail("同じ季節に外交状態を再変更できません");
    setStatus(state, actorId, targetId, status, options);
    var delta = type === "alliance" ? { score: 15, trust: 12, grievance: -10 } : type === "non_aggression" ? { score: 9, trust: 8, grievance: -7 } : { score: 7, trust: 5, grievance: -12 };
    D.changeRelation(state, actorId, targetId, delta);
    state.diplomacy.warExhaustion[actorId] = clamp(state.diplomacy.warExhaustion[actorId] - 8); state.diplomacy.warExhaustion[targetId] = clamp(state.diplomacy.warExhaustion[targetId] - 8);
    var text = state.factions[actorId].name + "と" + state.factions[targetId].name + "が" + (type === "peace" ? "和平" : D.label(status)) + "に合意しました。"; D.history(state, type, actorId, targetId, text);
    return result(text, { status: status, expiresTurn: relation.expiresTurn });
  }
  D.extendTreaty = function (state, actorId, targetId, options) {
    options = options || {}; var relation = D.relation(state, actorId, targetId);
    if (!relation || C.treatyStatuses.indexOf(relation.status) < 0) return fail("延長できる条約がありません");
    if (!canChangeThisTurn(state, actorId, targetId, options)) return fail("同じ季節には延長できません");
    relation.expiresTurn = Math.max(relation.expiresTurn || state.campaign.turn, state.campaign.turn) + (options.duration || C.durations[relation.status]); relation.lastActionTurn = state.campaign.turn;
    D.changeRelation(state, actorId, targetId, { score: 4, trust: 5, grievance: -2 });
    var text = state.factions[actorId].name + "と" + state.factions[targetId].name + "が" + D.label(relation.status) + "を延長しました。"; D.history(state, "extend", actorId, targetId, text);
    return result(text, { expiresTurn: relation.expiresTurn });
  };
  D.improveRelations = function (state, actorId, targetId, messengerId, options) {
    options = options || {}; var messenger = state.officers[messengerId], source = account(state, actorId);
    if (!D.relation(state, actorId, targetId) || !messenger || messenger.factionId !== actorId || messenger.status !== "active") return fail("使者または対象勢力が不正です");
    if (source.gold < C.relationImprove.gold) return fail("関係改善に必要な金がありません");
    source.gold -= C.relationImprove.gold; var politicsBonus = Math.floor(messenger.stats.politics / 20);
    D.changeRelation(state, actorId, targetId, { score: C.relationImprove.score + politicsBonus, trust: C.relationImprove.trust + Math.floor(politicsBonus / 2), grievance: C.relationImprove.grievance });
    var text = messenger.name + "が使者となり、" + state.factions[targetId].name + "との関係を改善しました。"; D.history(state, "improve", actorId, targetId, text, { messengerId: messengerId });
    return result(text, { relation: D.relation(state, actorId, targetId) });
  };
  D.sendAid = function (state, actorId, targetId, offer, options) {
    options = options || {}; offer = offer || {}; var source = account(state, actorId), target = account(state, targetId), gold = Math.max(0, Math.floor(Number(offer.gold) || 0)), food = Math.max(0, Math.floor(Number(offer.food) || 0));
    if (!D.relation(state, actorId, targetId) || gold + food < C.aid.minimum) return fail("援助量が不足しています");
    if (source.gold < gold || source.food < food) return fail("援助資源が不足しています");
    source.gold -= gold; source.food -= food; target.gold += gold; target.food += food;
    D.changeRelation(state, actorId, targetId, { score: Math.floor((gold + food) / C.aid.scoreDivisor), trust: 5, grievance: -3 });
    state.diplomacy.warExhaustion[targetId] = clamp(state.diplomacy.warExhaustion[targetId] - Math.max(1, Math.floor((gold + food) / C.aid.exhaustionDivisor)));
    var text = state.factions[actorId].name + "が" + state.factions[targetId].name + "へ金" + gold + "・兵糧" + food + "を援助しました。"; D.history(state, "aid", actorId, targetId, text, { gold: gold, food: food });
    return result(text, { gold: gold, food: food });
  };
  D.sendReinforcement = function (state, actorId, targetId, sourceCastleId, targetCastleId, troops) {
    var relation = D.relation(state, actorId, targetId), source = state.castles[sourceCastleId], target = state.castles[targetCastleId], amount = Math.floor(Number(troops));
    if (!relation || relation.status !== "alliance") return fail("援軍には同盟が必要です");
    if (!source || source.factionId !== actorId || !target || target.factionId !== targetId) return fail("援軍の城指定が不正です");
    if (!Number.isFinite(amount) || amount <= 0 || amount > source.troops - S.Config.MIN_GARRISON) return fail("実兵力を超える援軍は送れません");
    S.Systems.Unit.changeGuardTroops(state, source, -amount); S.Systems.Unit.changeGuardTroops(state, target, amount); D.changeRelation(state, actorId, targetId, { score: 7, trust: 8, grievance: -3 });
    var text = state.factions[actorId].name + "が" + target.name + "へ援軍" + amount + "を送りました。"; D.history(state, "reinforcement", actorId, targetId, text, { sourceCastleId: sourceCastleId, targetCastleId: targetCastleId, troops: amount });
    return result(text, { troops: amount });
  };
  D.exchangePrisoners = function (state, actorId, targetId) {
    var actorPrisoner = state.prisoners.find(function (id) { return state.officers[id].factionId === actorId && state.officers[id].captorFactionId === targetId; });
    var targetPrisoner = state.prisoners.find(function (id) { return state.officers[id].factionId === targetId && state.officers[id].captorFactionId === actorId; });
    if (!actorPrisoner || !targetPrisoner) return fail("交換できる双方の捕虜がいません");
    S.Systems.Prisoner.release(state, actorPrisoner, "捕虜交換"); S.Systems.Prisoner.release(state, targetPrisoner, "捕虜交換"); D.changeRelation(state, actorId, targetId, { score: 5, trust: 6, grievance: -6 });
    var text = state.factions[actorId].name + "と" + state.factions[targetId].name + "が捕虜を交換しました。"; D.history(state, "prisoner_exchange", actorId, targetId, text, { released: [actorPrisoner, targetPrisoner] });
    return result(text, { released: [actorPrisoner, targetPrisoner] });
  };
  D.releasePrisoner = function (state, actorId, officerId) {
    var officer = state.officers[officerId]; if (!officer || officer.captorFactionId !== actorId) return fail("解放できる捕虜ではありません");
    var targetId = officer.factionId, released = S.Systems.Prisoner.release(state, officerId, "一方的解放"); if (!released.ok) return released;
    if (D.relation(state, actorId, targetId)) D.changeRelation(state, actorId, targetId, { score: 8, trust: 9, grievance: -8 });
    D.history(state, "release_prisoner", actorId, targetId, state.factions[actorId].name + "が" + officer.name + "を一方的に解放しました。", { officerId: officerId }); return released;
  };
  D.vassalize = function (state, overlordId, subjectId, options) {
    options = options || {};
    if (!alive(state, overlordId) || !alive(state, subjectId) || D.wouldCycle(state, subjectId, overlordId)) return fail("従属関係が不正または循環します");
    if (state.diplomacy.vassalage[subjectId]) return fail("対象はすでに従属しています");
    state.diplomacy.vassalage[subjectId] = { subjectFactionId: subjectId, overlordFactionId: overlordId, sinceTurn: state.campaign.turn, independenceAllowedTurn: state.campaign.turn + C.independenceCooldown, tribute: S.Util.deepClone(C.tribute) };
    var relation = D.relation(state, overlordId, subjectId); if (relation) { relation.status = "alliance"; relation.sinceTurn = state.campaign.turn; relation.expiresTurn = null; relation.lastActionTurn = state.campaign.turn; }
    D.warsFor(state, overlordId).forEach(function (enemyId) { var subjectRelation = D.relation(state, subjectId, enemyId); if (subjectRelation) { subjectRelation.status = "war"; subjectRelation.sinceTurn = state.campaign.turn; subjectRelation.expiresTurn = null; } });
    var text = state.factions[subjectId].name + "が" + state.factions[overlordId].name + "へ従属しました。"; D.history(state, options.surrender ? "surrender" : "vassalage", overlordId, subjectId, text); S.Systems.Event.addChronicle(state, text);
    return result(text, { subjectFactionId: subjectId, overlordFactionId: overlordId });
  };
  D.releaseVassal = function (state, overlordId, subjectId) {
    var item = state.diplomacy.vassalage[subjectId]; if (!item || item.overlordFactionId !== overlordId) return fail("解放できる従属勢力ではありません");
    delete state.diplomacy.vassalage[subjectId]; var relation = D.relation(state, overlordId, subjectId); if (relation) { relation.status = "neutral"; relation.expiresTurn = null; relation.sinceTurn = state.campaign.turn; relation.redeclareAfterTurn = state.campaign.turn + C.declarationCooldown; }
    var text = state.factions[overlordId].name + "が" + state.factions[subjectId].name + "の従属を解除しました。"; D.history(state, "release_vassal", overlordId, subjectId, text); return result(text, { released: subjectId });
  };
  D.independence = function (state, subjectId, options) {
    options = options || {}; var item = state.diplomacy.vassalage[subjectId]; if (!item) return fail("従属勢力ではありません");
    if (!options.forceSuccess && state.campaign.turn < item.independenceAllowedTurn) return fail("独立クールダウン中です");
    var overlordId = item.overlordFactionId, success = options.forceSuccess === true || D.power(state, subjectId) / Math.max(1, D.power(state, overlordId)) >= 0.55 || state.diplomacy.warExhaustion[overlordId] >= 70;
    if (!success) { D.history(state, "independence_failed", subjectId, overlordId, state.factions[subjectId].name + "の独立は失敗しました。"); return fail("独立に失敗しました"); }
    delete state.diplomacy.vassalage[subjectId]; var relation = D.relation(state, subjectId, overlordId); relation.status = "war"; relation.sinceTurn = state.campaign.turn; relation.expiresTurn = null; relation.lastActionTurn = state.campaign.turn;
    var text = state.factions[subjectId].name + "が" + state.factions[overlordId].name + "から独立しました。"; D.history(state, "independence", subjectId, overlordId, text); S.Systems.Event.addChronicle(state, text); return result(text, { independent: subjectId });
  };
  D.evaluateProposal = function (state, proposal, options) {
    options = options || {}; if (options.forceAccept === true) return { accepted: true, score: 999 }; if (options.forceAccept === false) return { accepted: false, score: -999 };
    var relation = D.relation(state, proposal.actorFactionId, proposal.targetFactionId), weights = C.evaluation, messenger = proposal.messengerId && state.officers[proposal.messengerId], actorPower = D.power(state, proposal.actorFactionId), targetPower = D.power(state, proposal.targetFactionId), offer = proposal.offer || {}, rng = options.random || Math.random;
    var score = (relation.score - 50) * weights.score + (relation.trust - 50) * weights.trust + relation.grievance * weights.grievance + (state.diplomacy.reputation[proposal.actorFactionId] - 50) * weights.reputation;
    score += (actorPower / Math.max(1, targetPower) - 1) * weights.powerRatio + (D.commonBorder(state, proposal.actorFactionId, proposal.targetFactionId) ? weights.commonBorder : 0) + D.commonEnemies(state, proposal.actorFactionId, proposal.targetFactionId).length * weights.commonEnemy;
    score += (state.diplomacy.warExhaustion[proposal.targetFactionId] || 0) * weights.exhaustion + (messenger ? messenger.stats.politics * weights.messengerPolitics : 0) + relation.brokenTreaties * weights.brokenTreaties + ((offer.gold || 0) + (offer.food || 0)) * weights.offeredResources;
    score += C.difficultyEvaluation[state.campaign.difficultyId] || 0; score += (rng() * 2 - 1) * weights.randomRange;
    if (["alliance", "non_aggression"].indexOf(proposal.type) >= 0) score -= 8;
    if (proposal.type === "surrender" || proposal.type === "vassalage") score += (actorPower / Math.max(1, targetPower) - 1) * 28 - D.castlesFor(state, proposal.targetFactionId).length * 5;
    if (proposal.type === "peace" || proposal.type === "ceasefire") score += (state.diplomacy.warExhaustion[proposal.targetFactionId] || 0) * 0.35;
    return { accepted: score >= 0, score: Math.round(score) };
  };
  function executeProposal(state, proposal, options) {
    options = Object.assign({ ignoreTiming: true }, options || {});
    if (proposal.type === "peace") return enactTreaty(state, "peace", proposal.actorFactionId, proposal.targetFactionId, options);
    if (proposal.type === "ceasefire") return enactTreaty(state, "ceasefire", proposal.actorFactionId, proposal.targetFactionId, options);
    if (proposal.type === "non_aggression") return enactTreaty(state, "non_aggression", proposal.actorFactionId, proposal.targetFactionId, options);
    if (proposal.type === "alliance") return enactTreaty(state, "alliance", proposal.actorFactionId, proposal.targetFactionId, options);
    if (proposal.type === "extend") return D.extendTreaty(state, proposal.actorFactionId, proposal.targetFactionId, options);
    if (proposal.type === "aid") return D.sendAid(state, proposal.actorFactionId, proposal.targetFactionId, proposal.offer, options);
    if (proposal.type === "reinforcement") return proposal.reinforcementFromTarget ? D.sendReinforcement(state, proposal.targetFactionId, proposal.actorFactionId, proposal.sourceCastleId, proposal.targetCastleId, proposal.troops) : D.sendReinforcement(state, proposal.actorFactionId, proposal.targetFactionId, proposal.sourceCastleId, proposal.targetCastleId, proposal.troops);
    if (proposal.type === "prisoner_exchange") return D.exchangePrisoners(state, proposal.actorFactionId, proposal.targetFactionId);
    if (proposal.type === "surrender") return D.vassalize(state, proposal.actorFactionId, proposal.targetFactionId, { surrender: true });
    if (proposal.type === "vassalage") return D.vassalize(state, proposal.actorFactionId, proposal.targetFactionId, {});
    if (proposal.type === "release_vassal") return D.releaseVassal(state, proposal.actorFactionId, proposal.targetFactionId);
    if (proposal.type === "independence") return D.independence(state, proposal.actorFactionId, options);
    return fail("未対応の外交提案です");
  }
  D.propose = function (state, type, actorId, targetId, options) {
    options = options || {};
    if (C.proposalTypes.indexOf(type) < 0 || !alive(state, actorId) || !alive(state, targetId) || actorId === targetId) return fail("外交提案が不正です");
    var pair = D.relation(state, actorId, targetId); if (["peace", "ceasefire", "non_aggression", "alliance", "extend"].indexOf(type) >= 0 && pair && pair.lastActionTurn === state.campaign.turn && !options.ignoreTiming) return fail("同じ季節に外交状態を再変更できません");
    var duplicate = state.diplomacy.proposals.some(function (item) { return item.actorFactionId === actorId && item.targetFactionId === targetId && item.type === type && (item.status === "pending" || item.createdTurn >= state.campaign.turn - 2); }); if (duplicate) return fail("同じ提案の再送クールダウン中です");
    var proposal = { id: "proposal_" + state.diplomacy.nextProposalId++, type: type, actorFactionId: actorId, targetFactionId: targetId, messengerId: options.messengerId || null, offer: options.offer || null, sourceCastleId: options.sourceCastleId || null, targetCastleId: options.targetCastleId || null, troops: options.troops || null, reinforcementFromTarget: Boolean(options.reinforcementFromTarget), createdTurn: state.campaign.turn, expiresTurn: state.campaign.turn + C.proposalLifetime, status: "pending", evaluationScore: null };
    if (targetId === state.campaign.playerFactionId && actorId !== state.campaign.playerFactionId && !options.autoResolvePlayer) {
      state.diplomacy.proposals.push(proposal); D.history(state, "proposal", actorId, targetId, state.factions[actorId].name + "から" + D.proposalLabel(type) + "の提案が届きました。", { proposalId: proposal.id }); return result("外交提案が届きました。", { proposal: proposal, pending: true });
    }
    var evaluation = D.evaluateProposal(state, proposal, options); proposal.evaluationScore = evaluation.score; proposal.status = evaluation.accepted ? "accepted" : "rejected"; state.diplomacy.proposals.push(proposal);
    if (!evaluation.accepted) { D.history(state, "proposal_rejected", actorId, targetId, state.factions[targetId].name + "が" + D.proposalLabel(type) + "を拒否しました。", { proposalId: proposal.id, score: evaluation.score }); return fail("提案は拒否されました（評価" + evaluation.score + "）"); }
    var enacted = executeProposal(state, proposal, options); if (!enacted.ok) proposal.status = "failed"; return enacted;
  };
  D.respondProposal = function (state, proposalId, accept, options) {
    options = options || {}; var proposal = state.diplomacy.proposals.find(function (item) { return item.id === proposalId; });
    if (!proposal || proposal.status !== "pending" || proposal.targetFactionId !== state.campaign.playerFactionId || state.campaign.turn > proposal.expiresTurn) return fail("応答できる提案ではありません");
    proposal.status = accept ? "accepted" : "rejected"; proposal.evaluationScore = accept ? 100 : -100;
    if (!accept) { D.history(state, "proposal_rejected", proposal.targetFactionId, proposal.actorFactionId, state.factions[proposal.targetFactionId].name + "が提案を拒否しました。", { proposalId: proposal.id }); return result("提案を拒否しました。", { proposal: proposal }); }
    return executeProposal(state, proposal, Object.assign({ ignoreTiming: true }, options));
  };
  D.proposalLabel = function (type) { return { peace: "和平", ceasefire: "停戦", non_aggression: "不戦条約", alliance: "同盟", extend: "条約延長", aid: "物資援助", reinforcement: "援軍", prisoner_exchange: "捕虜交換", surrender: "降伏", vassalage: "従属", release_vassal: "従属解除", independence: "独立" }[type] || type; };
  D.makePeace = function (state, a, b, options) { return D.propose(state, "peace", a, b, options); };
  D.makeCeasefire = function (state, a, b, options) { return D.propose(state, "ceasefire", a, b, options); };
  D.makeNonAggression = function (state, a, b, options) { return D.propose(state, "non_aggression", a, b, options); };
  D.makeAlliance = function (state, a, b, options) { return D.propose(state, "alliance", a, b, options); };
  D.recommendSurrender = function (state, a, b, options) { return D.propose(state, "surrender", a, b, options); };
  D.proposeVassalage = function (state, a, b, options) { return D.propose(state, "vassalage", a, b, options); };
  D.requestReinforcement = function (state, requesterId, allyId, options) { options = Object.assign({}, options || {}, { reinforcementFromTarget: true }); return D.propose(state, "reinforcement", requesterId, allyId, options); };
  D.expireTreaties = function (state) {
    var expired = [];
    Object.keys(state.diplomacy.relations).forEach(function (key) { var relation = state.diplomacy.relations[key]; if (C.treatyStatuses.indexOf(relation.status) >= 0 && Number.isInteger(relation.expiresTurn) && relation.expiresTurn <= state.campaign.turn) { var old = relation.status; relation.status = "neutral"; relation.expiresTurn = null; relation.sinceTurn = state.campaign.turn; relation.lastActionTurn = state.campaign.turn; expired.push(key); D.history(state, "treaty_expired", relation.factionAId, relation.factionBId, D.label(old) + "が期限を迎えました。"); } });
    return expired;
  };
  D.expireProposals = function (state) { var expired = []; state.diplomacy.proposals.forEach(function (proposal) { if (proposal.status === "pending" && proposal.expiresTurn <= state.campaign.turn) { proposal.status = "expired"; expired.push(proposal.id); } }); return expired; };
  D.processTribute = function (state) {
    var transfers = [];
    Object.keys(state.diplomacy.vassalage).forEach(function (subjectId) { var item = state.diplomacy.vassalage[subjectId], source = account(state, subjectId), target = account(state, item.overlordFactionId); if (!source || !target) return; var gold = Math.min(source.gold, Math.max(item.tribute.minimumGold, Math.floor(source.gold * item.tribute.goldRate))), food = Math.min(source.food, Math.max(item.tribute.minimumFood, Math.floor(source.food * item.tribute.foodRate))); source.gold -= gold; source.food -= food; target.gold += gold; target.food += food; transfers.push({ subjectFactionId: subjectId, overlordFactionId: item.overlordFactionId, gold: gold, food: food }); D.history(state, "tribute", subjectId, item.overlordFactionId, state.factions[subjectId].name + "が貢納を納めました。", { gold: gold, food: food }); });
    return transfers;
  };
  D.updateWarExhaustion = function (state) { factionIds(state).forEach(function (id) { var amount = D.warsFor(state, id).length ? C.exhaustion.longWar : -C.exhaustion.peaceRecovery; state.diplomacy.warExhaustion[id] = clamp((state.diplomacy.warExhaustion[id] || 0) + amount); }); };
  D.recordBattle = function (state, attackerId, defenderId, attackerWon, castleChanged) {
    state.diplomacy.warExhaustion[attackerId] = clamp((state.diplomacy.warExhaustion[attackerId] || 0) + C.exhaustion.battle + (attackerWon ? 0 : C.exhaustion.defeat));
    state.diplomacy.warExhaustion[defenderId] = clamp((state.diplomacy.warExhaustion[defenderId] || 0) + C.exhaustion.battle + (attackerWon ? C.exhaustion.defeat : 0) + (castleChanged ? C.exhaustion.castleLoss : 0));
  };
  D.updateStagnation = function (state) {
    var stagnation = state.diplomacy.stagnation, ownership = Object.keys(state.castles).sort().map(function (id) { return id + ":" + state.castles[id].factionId; }).join(","), majorCount = state.diplomacy.history.filter(function (item) { return item.major; }).length;
    var changed = state.campaign.battleCount !== stagnation.lastBattleCount || (stagnation.lastOwnership && ownership !== stagnation.lastOwnership) || majorCount !== stagnation.lastMajorDiplomacyCount;
    stagnation.seasons = changed ? 0 : stagnation.seasons + 1; stagnation.maximum = Math.max(stagnation.maximum, stagnation.seasons); stagnation.lastBattleCount = state.campaign.battleCount; stagnation.lastOwnership = ownership; stagnation.lastMajorDiplomacyCount = majorCount;
    if (stagnation.seasons >= 12) { stagnation.reevaluations += 1; stagnation.seasons = 0; D.history(state, "strategic_reevaluation", null, null, "戦局停滞を受け、各勢力が戦略を再評価しました。", { reevaluation: stagnation.reevaluations }); return true; }
    return false;
  };
  D.processSeasonStart = function (state) {
    if (state.diplomacy.processedTurn === state.campaign.turn) return { ok: true, stateChanges: { skipped: true }, messages: [], errors: [] };
    state.diplomacy.processedTurn = state.campaign.turn; var expiredTreaties = D.expireTreaties(state), expiredProposals = D.expireProposals(state), tribute = D.processTribute(state); D.updateWarExhaustion(state); var reevaluate = D.updateStagnation(state);
    return result("", { expiredTreaties: expiredTreaties, expiredProposals: expiredProposals, tribute: tribute, strategicReevaluation: reevaluate });
  };
  D.actionAvailability = function (state, actorId, targetId) {
    var relation = D.relation(state, actorId, targetId), status = relation ? relation.status : null, source = account(state, actorId), messenger = Object.keys(state.officers).map(function (id) { return state.officers[id]; }).filter(function (officer) { return officer.factionId === actorId && officer.status === "active"; }).sort(function (a, b) { return b.stats.politics - a.stats.politics; })[0];
    function item(id, enabled, reason) { return { id: id, label: D.proposalLabel(id === "declare_war" ? "宣戦" : id), enabled: Boolean(enabled), reason: enabled ? "実行可能" : reason }; }
    return [
      item("improve", messenger && source.gold >= C.relationImprove.gold, messenger ? "金が不足" : "使者がいません"),
      item("declare_war", status === "neutral" && !D.overlordOf(state, actorId) && state.campaign.turn >= relation.redeclareAfterTurn, status !== "neutral" ? "中立ではありません" : "宣戦制限中"),
      item("peace", status === "war", "戦争中ではありません"), item("ceasefire", status === "war", "戦争中ではありません"),
      item("non_aggression", ["neutral", "ceasefire"].indexOf(status) >= 0, "現在の状態では締結不可"), item("alliance", ["neutral", "ceasefire", "non_aggression"].indexOf(status) >= 0, "現在の状態では締結不可"),
      item("extend", C.treatyStatuses.indexOf(status) >= 0, "期限付き条約がありません"), item("break_treaty", C.treatyStatuses.indexOf(status) >= 0 && relation.lastActionTurn !== state.campaign.turn, "破棄できる条約がありません"),
      item("aid", source.gold + source.food >= C.aid.minimum, "資源が不足"), item("prisoner_exchange", true, "交換対象が必要"), item("surrender", status === "war", "戦争中ではありません"), item("vassalage", !state.diplomacy.vassalage[targetId], "すでに従属中")
    ];
  };
})(window.Sengoku);
