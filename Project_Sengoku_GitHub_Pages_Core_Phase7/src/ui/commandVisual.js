(function (S) {
  "use strict";
  var U = S.UI;
  function state() { return S.State.current; }
  function portraitPath(officer, role) {
    if (role === "leader") return "assets/ui/portrait-lord.svg";
    if (role === "strategist") return "assets/ui/portrait-strategist.svg";
    if (role === "warrior") return "assets/ui/portrait-warrior.svg";
    return "assets/ui/portrait-steward.svg";
  }
  function advisorCard(officer, role, title, body, action, button) {
    return '<article class="sv-council-card"><img src="' + portraitPath(officer, role) + '" alt=""><div class="sv-council-copy"><small>' + U.escape(officer ? officer.name : "家臣") + 'の進言</small><strong>' + U.escape(title) + '</strong><p>' + U.escape(body) + '</p></div><button class="button secondary" data-command="' + action + '">' + U.escape(button) + '</button></article>';
  }
  U.showCouncilVisual = function () {
    var st = state(), playerId = st.campaign.playerFactionId, holdings = S.Systems.Turn.playerCastles(st), selected = st.castles[st.campaign.selectedCastleId];
    if (!selected || selected.factionId !== playerId) selected = holdings[0];
    var officers = Object.keys(st.officers).map(function (id) { return st.officers[id]; }).filter(function (o) { return o.factionId === playerId && o.status === "active"; });
    var leader = officers.slice().sort(function (a,b) { return b.stats.leadership-a.stats.leadership; })[0], strategist = officers.slice().sort(function (a,b) { return b.stats.intellect-a.stats.intellect; })[0], warrior = officers.slice().sort(function (a,b) { return b.stats.might-a.stats.might; })[0], politician = officers.slice().sort(function (a,b) { return b.stats.politics-a.stats.politics; })[0];
    var pending = st.diplomacy.proposals.filter(function (p) { return p.status === "pending" && p.targetFactionId === playerId; }).length;
    var html = '<div class="strategic-visual-screen"><header class="sv-screen-header"><div><small>評定 / 今季の方針</small><h2>' + U.escape(selected ? selected.name : "領国") + '　軍議</h2></div><div class="sv-resource-chips"><span>命令<strong>' + st.campaign.commands + '</strong></span><span>外交提案<strong>' + pending + '</strong></span></div></header>' +
      '<section class="sv-council-stage"><img src="assets/ui/council-hall.svg" alt="評定の仮ビジュアル"><div><strong>家臣の進言を聞く</strong><p>今季の限られた命令を、内政・偵察・軍備・侵攻のどこへ使うか決めます。</p></div></section>' +
      '<div class="sv-council-grid">' +
      advisorCard(leader,"leader",selected ? selected.name + "の守りを固める" : "守りを固める","徴兵して敵襲への備えを厚くします。","recruit","徴兵") +
      advisorCard(strategist,"strategist","敵情を探る","敵城を偵察し、兵数を把握してから動きます。","scout","偵察") +
      advisorCard(warrior,"warrior","攻勢へ出る","軍団を編成し、敵領へ進軍して主導権を握ります。","attack","出陣") +
      advisorCard(politician,"steward","国力を蓄える","城下を発展させ、次の戦のための金を増やします。","develop","商業投資") +
      '</div><div class="sv-screen-actions"><button class="button secondary" data-open-diplomacy>外交へ</button><button class="button primary" data-close-modal>評定を終える</button></div></div>';
    U.openModal(html, { modalClass: "strategic-visual-modal" });
  };
})(window.Sengoku);
