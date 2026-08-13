(function (S) {
  "use strict";
  var U = S.UI;

  function state() { return S.State.current; }
  function fmt(value) { return Number(value || 0).toLocaleString("ja-JP"); }
  function pct(value, max) { return Math.max(4, Math.min(100, Math.round((Number(value || 0) / Math.max(1, Number(max || 100))) * 100))); }
  function unitIcon(type) { return { kiba: "騎", samurai: "侍", teppo: "鉄", ashigaru: "足" }[type] || "兵"; }
  function unitName(type) { var data = S.Data.getUnitType && S.Data.getUnitType(type); return data ? data.name : type; }
  function portraitFile(officer, isLord) {
    if (!officer) return "assets/ui/portrait-ronin.svg";
    if (isLord) return "assets/ui/portrait-lord.svg";
    var s = officer.stats || {};
    if ((s.intellect || 0) >= (s.might || 0) && (s.intellect || 0) >= (s.leadership || 0)) return "assets/ui/portrait-strategist.svg";
    if ((s.politics || 0) >= (s.might || 0) && (s.politics || 0) >= (s.leadership || 0)) return "assets/ui/portrait-steward.svg";
    return "assets/ui/portrait-warrior.svg";
  }
  function portrait(officer, isLord, className) {
    var name = officer ? officer.name : "未任命";
    return '<span class="sv-portrait ' + (className || "") + '"><img src="' + portraitFile(officer, isLord) + '" alt="' + U.escape(name) + 'の仮武将画" loading="lazy"><em>' + U.escape(name.slice(0, 1)) + '</em></span>';
  }
  function bar(label, value, max, kind) {
    return '<div class="sv-stat-row ' + (kind || "") + '"><span>' + U.escape(label) + '</span><strong>' + U.escape(fmt(value)) + '</strong><i><b style="width:' + pct(value, max) + '%"></b></i></div>';
  }
  function assignmentLabel(officer) { return S.Systems.Officer.assignmentLabel ? S.Systems.Officer.assignmentLabel(officer) : "家臣"; }
  function armyUnitsAtOrigin(st, castleId) {
    var totals = { kiba: 0, samurai: 0, teppo: 0, ashigaru: 0 };
    Object.keys(st.armies || {}).forEach(function (armyId) {
      var army = st.armies[armyId];
      if (!army || army.originCastleId !== castleId || army.status === "disbanded") return;
      (army.unitIds || []).forEach(function (unitId) {
        var unit = st.units[unitId]; if (unit && totals[unit.unitType] !== undefined) totals[unit.unitType] += unit.troops;
      });
    });
    return totals;
  }
  function openVisual(html) { U.openModal('<div class="strategic-visual-screen">' + html + '</div>', { modalClass: "strategic-visual-modal" }); }

  function castleFeatureCards(castle) {
    return '<div class="sv-feature-strip">' +
      '<div><span class="sv-feature-icon keep">本</span><small>本丸</small><strong>Lv.' + castle.defense + '</strong></div>' +
      '<div><span class="sv-feature-icon farm">田</span><small>農地</small><strong>Lv.' + castle.agriculture + '</strong></div>' +
      '<div><span class="sv-feature-icon market">市</span><small>城下町</small><strong>' + fmt(castle.income) + '</strong></div>' +
      '<div><span class="sv-feature-icon people">民</span><small>人口</small><strong>' + fmt(castle.population) + '</strong></div>' +
      '</div>';
  }

  U.renderCastleDetail = function () {
    var st = state(), castle = st && st.castles[st.campaign.selectedCastleId], root = U.el("castleDetail");
    if (!root) return;
    if (!castle) { root.innerHTML = '<div class="castle-detail muted">城を選択してください。</div>'; return; }
    var friendly = castle.factionId === st.campaign.playerFactionId, known = friendly || st.events.intel[castle.id] > 0;
    var faction = st.factions[castle.factionId], governor = castle.governorId ? st.officers[castle.governorId] : null;
    var domestic = S.Systems.Domestic, profile = domestic.castleProfile(castle), recruitCapacity = domestic.recruitmentCapacity(castle), recruitRoom = domestic.recruitmentRoom(castle);
    var officers = friendly ? S.Systems.Officer.atCastle(st, castle.id, st.campaign.playerFactionId) : [];
    var steward = friendly ? S.Systems.Officer.domesticOfficerAt(st, castle.id) : null;
    var troopTypes = armyUnitsAtOrigin(st, castle.id);
    var buttons = friendly && st.campaign.status !== "opening" ? '<div class="sv-castle-actions">' +
      '<button type="button" class="sv-main-action domestic" data-open-domestic-screen><span>内政</span><small>城を育てる</small></button>' +
      '<button type="button" class="sv-main-action retainers" data-open-retainers><span>家臣一覧</span><small>能力と役目</small></button>' +
      '<button type="button" class="sv-main-action recruit" data-open-recruitment-screen><span>人材登用</span><small>在野・捕虜</small></button>' +
      '<button type="button" class="sv-main-action army" data-command="attack"><span>出陣</span><small>軍勢を編成</small></button>' +
      '</div>' : '';
    root.innerHTML = '<div class="castle-detail sv-castle-overview">' +
      '<section class="sv-castle-hero"><img src="assets/ui/castle-hero.svg" alt="戦国城郭の仮ビジュアル"><div class="sv-hero-shade"></div>' +
      '<div class="sv-castle-name"><small>' + U.escape(faction.name) + '　' + U.escape(profile.type) + '</small><h3>' + U.escape(castle.name) + '</h3><span>' + U.escape(profile.title) + '</span></div>' +
      (governor ? '<div class="sv-lord-card">' + portrait(governor, true, "lord") + '<div><small>城主</small><strong>' + U.escape(governor.name) + '</strong><em>' + U.escape(governor.role) + '</em></div></div>' : '') +
      '</section>' +
      '<section class="sv-castle-body"><div class="sv-overview-grid"><div class="sv-key-stats">' +
      bar('人口', known ? castle.population : 0, 60000, 'people') +
      bar('守備兵', known ? castle.guardTroops : 0, Math.max(100, recruitCapacity), 'troops') +
      bar('民忠', known ? castle.morale : 0, 100, 'loyalty') +
      bar('防備', known ? castle.defense : 0, 8, 'defense') +
      '<div class="sv-capacity"><span>徴兵可能</span><strong>' + (known ? fmt(recruitRoom) : '?') + '</strong><small>上限 ' + (known ? fmt(recruitCapacity) : '?') + '</small></div></div>' +
      '<div class="sv-troop-box"><div class="sv-section-title">編成中の兵科</div><div class="sv-troop-types">' + ["kiba","samurai","teppo","ashigaru"].map(function (type) { return '<div><span>' + unitIcon(type) + '</span><small>' + unitName(type) + '</small><strong>' + fmt(troopTypes[type]) + '</strong></div>'; }).join('') + '</div><p>城の守備兵は共通プールです。兵科は出陣時に武将ごとのUnitへ編成します。</p></div></div>' +
      castleFeatureCards(castle) +
      (friendly ? '<div class="sv-role-strip"><span><small>城主</small><strong>' + U.escape(governor ? governor.name : '未任命') + '</strong></span><span><small>奉行</small><strong>' + U.escape(steward ? steward.name : '未任命') + '</strong></span><span><small>在城武将</small><strong>' + officers.length + '名</strong></span></div>' : '') +
      buttons + '</section></div>';
  };

  U.showDomesticVisual = function () {
    var st = state(), castle = st.castles[st.campaign.selectedCastleId]; if (!castle) return;
    var D = S.Systems.Domestic, recruitRoom = D.recruitmentRoom(castle), goldYield = D.effectiveGoldYieldForCastle(st, castle), foodYield = D.effectiveFoodYieldForCastle(st, castle);
    var cards = [
      ['cultivate','新田開発','石高を増やし、人口と兵糧基盤を育てる','command-farm.svg','green'],
      ['develop','商業投資','城下を発展させ、季節の金収入を増やす','command-market.svg','gold'],
      [null,'城の強化','城防御を高める建築系コマンド（今後実装）','command-fort.svg','blue','disabled'],
      ['train','軍事訓練','兵を鍛え、城の士気を高める','command-train.svg','purple'],
      [null,'建設','施設スロットを使った建築（今後実装）','command-build.svg','brown','disabled'],
      [null,'人材登用','在野武将・捕虜の候補を見る','command-recruit.svg','orange','recruit'],
      ['scout','調略・偵察','敵城の兵力情報を探る','command-scout.svg','teal'],
      [null,'外交','同盟・停戦・援軍など外交交渉へ','command-diplomacy.svg','cyan','diplomacy'],
      ['recruit','兵士要請','人口から守備兵を徴兵する（残' + recruitRoom + '）','command-army.svg','navy'],
      ['attack','出兵依頼','武将と兵科を選び軍勢を出陣させる','command-army.svg','red'],
      [null,'武将移動','家臣を別の自勢力城へ移動する','portrait-steward.svg','slate','move'],
      [null,'評定','軍議画面で今季の家臣提案を確認する','portrait-strategist.svg','violet','council']
    ];
    var html = '<header class="sv-screen-header"><div><small>城内政</small><h2>' + U.escape(castle.name) + '　内政</h2></div><div class="sv-resource-chips"><span>金<strong>' + fmt(st.campaign.gold) + '</strong></span><span>兵糧<strong>' + fmt(st.campaign.food) + '</strong></span><span>季収<strong>+' + fmt(goldYield) + '</strong></span><span>季糧<strong>+' + fmt(foodYield) + '</strong></span></div></header>' +
      '<div class="sv-command-grid">' + cards.map(function (c) {
        var attrs = c[5] === 'disabled' ? ' disabled aria-disabled="true"' : c[5] === 'recruit' ? ' data-open-recruitment-screen' : c[5] === 'diplomacy' ? ' data-open-diplomacy' : c[5] === 'move' ? ' data-open-move' : c[5] === 'council' ? ' data-visual-council' : c[0] ? ' data-command="' + c[0] + '"' : '';
        return '<button type="button" class="sv-command-card ' + c[4] + '"' + attrs + '><img src="assets/ui/' + c[3] + '" alt=""><span><strong>' + U.escape(c[1]) + '</strong><small>' + U.escape(c[2]) + '</small></span>' + (c[5] === 'disabled' ? '<em>準備中</em>' : '') + '</button>';
      }).join('') + '</div><div class="sv-footer-note">内政の数値は戦争に直結します。人口→徴兵、農業→兵糧、商業→金、軍事訓練→士気。</div>';
    openVisual(html);
  };

  U.showRetainers = function () {
    var st = state(), playerId = st.campaign.playerFactionId, faction = st.factions[playerId];
    var list = Object.keys(st.officers).map(function (id) { return st.officers[id]; }).filter(function (o) { return o.factionId === playerId && o.status === 'active'; }).sort(function (a,b) { return (b.stats.leadership + b.stats.might + b.stats.intellect + b.stats.politics) - (a.stats.leadership + a.stats.might + a.stats.intellect + a.stats.politics); });
    var rows = list.map(function (o) {
      var castle = o.castleId && st.castles[o.castleId], a = assignmentLabel(o), assignment = S.Systems.Officer.assignment(o);
      var unit = Object.keys(st.units || {}).map(function (id) { return st.units[id]; }).find(function (u) { return u.officerId === o.id && u.status !== 'destroyed'; });
      return '<button type="button" class="sv-retainer-row" data-officer-id="' + U.escape(o.id) + '">' + portrait(o, assignment.type === 'governor') + '<span class="name"><strong>' + U.escape(o.name) + '</strong><small>' + U.escape(castle ? castle.name : '軍勢・在外') + ' / ' + U.escape(a) + '</small></span>' +
        '<span class="stat"><small>統率</small><b>' + o.stats.leadership + '</b></span><span class="stat"><small>武勇</small><b>' + o.stats.might + '</b></span><span class="stat"><small>知略</small><b>' + o.stats.intellect + '</b></span><span class="stat"><small>政治</small><b>' + o.stats.politics + '</b></span><span class="loyal"><small>忠誠</small><b>' + o.loyalty + '</b></span><span class="army"><small>兵力</small><b>' + (unit ? fmt(unit.troops) : '—') + '</b><em>' + (unit ? unitIcon(unit.unitType) + unitName(unit.unitType) : '在城') + '</em></span></button>';
    }).join('');
    openVisual('<header class="sv-screen-header"><div><small>家臣団</small><h2>' + U.escape(faction.name) + '　家臣一覧</h2></div><div class="sv-resource-chips"><span>家臣<strong>' + list.length + '名</strong></span></div></header><div class="sv-retainer-head"><span>武将 / 所属</span><span>統率</span><span>武勇</span><span>知略</span><span>政治</span><span>忠誠</span><span>兵力</span></div><div class="sv-retainer-list">' + rows + '</div><div class="sv-footer-note">武将をタップすると詳細・褒賞・城主任命・奉行任命を確認できます。</div>');
  };

  U.showRecruitmentVisual = function () {
    var st = state(), playerId = st.campaign.playerFactionId;
    var ronin = Object.keys(st.officers).map(function (id) { return st.officers[id]; }).filter(function (o) { return o.status === 'ronin'; });
    var prisoners = (st.prisoners || []).map(function (id) { return st.officers[id]; }).filter(function (o) { return o && o.captorFactionId === playerId; });
    function card(o, kind) {
      return '<article class="sv-recruit-card">' + portrait(o, false, 'large') + '<div class="sv-recruit-title"><strong>' + U.escape(o.name) + '</strong><small>' + U.escape(kind) + ' / ' + U.escape(o.role || '武将') + '</small></div><div class="sv-recruit-stats"><span>統<b>' + o.stats.leadership + '</b></span><span>武<b>' + o.stats.might + '</b></span><span>知<b>' + o.stats.intellect + '</b></span><span>政<b>' + o.stats.politics + '</b></span></div><div class="sv-recruit-loyal">忠誠 ' + o.loyalty + '　野心 ' + o.ambition + '</div>' + (kind === '捕虜' ? '<button class="button primary" data-recruit-prisoner="' + U.escape(o.id) + '">登用交渉</button>' : '<button class="button secondary" disabled>在野登用は次フェーズ</button>') + '</article>';
    }
    var cards = ronin.map(function (o) { return card(o,'在野'); }).concat(prisoners.map(function (o) { return card(o,'捕虜'); }));
    openVisual('<header class="sv-screen-header"><div><small>人材登用</small><h2>在野・登用候補</h2></div><div class="sv-resource-chips"><span>候補<strong>' + cards.length + '名</strong></span><span>金<strong>' + fmt(st.campaign.gold) + '</strong></span></div></header>' + (cards.length ? '<div class="sv-recruit-grid">' + cards.join('') + '</div>' : '<div class="sv-empty-recruit"><img src="assets/ui/portrait-ronin.svg" alt="在野武将の仮シルエット"><h3>現在、登用できる在野武将はいません</h3><p>勢力滅亡や捕虜の発生によって候補が増えます。今後は探索・人材登用コマンドも追加できます。</p></div>') + '<div class="sv-footer-note">※ 仮武将画・城画像はUI確認用のオリジナル仮素材です。</div>');
  };
})(window.Sengoku);
