/* BruTTech LeagueOS ↔ HockeyOS V18. Original browser-local review bridge.
   This module never writes official scores, season totals, rosters, or HTO records. */
(function () {
  "use strict";
  const KEY = "leagueos-v15-scorer-demo";
  const FIXTURES = "./leagueos-source-qualified-current-fixtures-v4.json";
  const CLUB = "Braves HC";
  const escapeHtml = x => String(x == null ? "" : x).replace(/[&<>"']/g,
    c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let sourcePromise = null;

  function storageSnapshot(store) {
    try {
      const data = JSON.parse(store.getItem(KEY) || "null");
      return data && data.version === 15 && data.drafts && typeof data.drafts === "object"
        ? data.drafts : {};
    } catch (_) { return {}; }
  }
  function safeScore(value) {
    return Number.isInteger(value) && value >= 0 && value <= 99;
  }
  function eventTotals(events) {
    const list = Array.isArray(events) ? events : [];
    return {
      home: list.filter(e => e && e.kind === "goal" && e.side === "home").length,
      away: list.filter(e => e && e.kind === "goal" && e.side === "away").length
    };
  }
  function reconcile(draft) {
    const r = draft && draft.result;
    if (!r || !safeScore(r.home) || !safeScore(r.away)) {
      return {code:"NO_VALID_RESULT", label:"Result not complete", match:false};
    }
    const events = Array.isArray(draft.events) ? draft.events : [];
    const totals = eventTotals(events);
    const match = totals.home === r.home && totals.away === r.away;
    if (!events.some(e => e && e.kind === "goal") && r.home + r.away > 0) {
      return {code:"NO_GOAL_DETAIL", label:"Final entered; goal details missing", match:false};
    }
    if (!match) {
      return {code:"EVENT_CONFLICT", label:"Final score conflicts with recorded goals", match:false};
    }
    return {code:"EVENT_COUNTS_MATCH", label:"Recorded goal counts match the draft", match:true};
  }
  function numericStat(value) {
    return value === null || value === "" || value === undefined ? null :
      Number.isInteger(value) && value >= 0 && value <= 99 ? value : null;
  }
  function powerPlaySummary(draft, side) {
    const own = draft?.teamStats?.[side] || {};
    const opp = draft?.teamStats?.[side === "home" ? "away" : "home"] || {};
    const opportunities = numericStat(own.ppo), goals = numericStat(own.ppg);
    const oppOpportunities = numericStat(opp.ppo), oppGoals = numericStat(opp.ppg);
    return {
      ppo:opportunities, ppg:goals,
      ppPercent: opportunities === null || goals === null ? null :
        (opportunities === 0 ? (goals === 0 ? null : null) : 100 * goals / opportunities),
      pkPercent:oppOpportunities === null || oppGoals === null || oppOpportunities === 0
        ? null : 100 * (oppOpportunities - oppGoals) / oppOpportunities
    };
  }
  function playerRows(draft, side) {
    const map = new Map();
    const get = (raw) => {
      const jersey = String(raw == null ? "" : raw).trim();
      if (!/^\d{1,3}$/.test(jersey)) return null;
      if (!map.has(jersey)) map.set(jersey, {jersey, g:0, a:0, shots:0, pim:0});
      return map.get(jersey);
    };
    for (const e of (Array.isArray(draft?.events) ? draft.events : [])) {
      if (!e || e.side !== side) continue;
      const p = get(e.jersey);
      if (e.kind === "goal") {
        if (p) p.g++;
        const assistSet = new Set(Array.isArray(e.assists) ? e.assists.map(String) : []);
        for (const jersey of assistSet) {
          if (jersey === String(e.jersey)) continue;
          const a = get(jersey); if (a) a.a++;
        }
      } else if (e.kind === "shot") { if (p) p.shots++; }
      else if (e.kind === "penalty") { if (p) p.pim += Number(e.penalty) || 0; }
    }
    return [...map.values()].map(p => ({...p,pts:p.g+p.a}))
      .sort((a,b) => b.pts-a.pts || b.g-a.g || Number(a.jersey)-Number(b.jersey));
  }
  function qualify(fixture, draft) {
    if (!fixture || !["FUTURE_RECIPROCAL_FIXTURE"].includes(fixture.status) ||
        ![fixture.home,fixture.away].includes(CLUB) || !draft ||
        !draft.result || draft.result.saved !== true ||
        !safeScore(draft.result.home) || !safeScore(draft.result.away)) return null;
    const side = fixture.home === CLUB ? "home" : "away";
    return {fixture, result:draft.result, side, eventReview:reconcile(draft),
      players:playerRows(draft,side), power:powerPlaySummary(draft,side),
      eventCount:Array.isArray(draft.events)?draft.events.length:0};
  }
  function statValue(n){return n === null ? "Not entered" : String(n);}
  function pctValue(n){return n === null ? "—" : n.toFixed(1) + "%";}
  function card(item) {
    const {fixture:f,result:r,side,eventReview:review,players,power,eventCount} = item;
    const against = side === "home" ? f.away : f.home;
    const clubScore = r[side],otherScore = r[side === "home" ? "away" : "home"];
    const validation = review.match ? "match" : "hold";
    const rows = players.slice(0,6).map(p =>
      '<tr><td>#'+escapeHtml(p.jersey)+'</td><td>'+p.g+'</td><td>'+p.a+
      '</td><td>'+p.pts+'</td><td>'+p.shots+'</td><td>'+p.pim+'</td></tr>').join("");
    return '<article class="v18-draft-card"><header><span>LOCAL PRACTICE · GAME #'+
      escapeHtml(f.game_id)+'</span><strong>Brave H.C. vs '+escapeHtml(against)+
      '</strong><small>'+escapeHtml(f.date)+' · '+escapeHtml(f.time)+
      ' · '+escapeHtml(f.rink||"Rink unverified")+'</small></header>'+
      '<div class="v18-snapshot-row"><div><small>PRACTICE RESULT</small><b>'+
      clubScore+'–'+otherScore+'</b><small>'+escapeHtml(r.decision||"Outcome unknown")+
      ' · not official</small></div><div><small>EVENT CHECK</small><strong class="'+validation+
      '">'+escapeHtml(review.label)+'</strong><small>'+eventCount+
      ' events · unverified jersey identity</small></div></div>'+
      '<div class="v18-stats-row"><span>PPG <b>'+statValue(power.ppg)+'</b></span>'+
      '<span>PPO <b>'+statValue(power.ppo)+'</b></span>'+
      '<span>PP% <b>'+pctValue(power.ppPercent)+'</b></span>'+
      '<span>PK% <b>'+pctValue(power.pkPercent)+'</b></span></div>'+
      '<details><summary>Jersey-level practice statistics ('+players.length+
      ')</summary><div class="v18-table-scroll"><table><thead><tr><th>Jersey</th>'+
      '<th>G</th><th>A</th><th>PTS</th><th>Shots</th><th>PIM</th></tr></thead><tbody>'+
      (rows || '<tr><td colspan="6">No jersey-tagged events yet.</td></tr>')+
      '</tbody></table></div><p>Jerseys are not authenticated player IDs. No appearance, award, or career total is changed.</p></details>'+
      '</article>';
  }
  function loadFixtures() {
    if (!sourcePromise) sourcePromise = fetch(FIXTURES,{cache:"no-store"})
      .then(r => {if(!r.ok)throw Error("Source HTTP "+r.status);return r.json();})
      .then(x => {
        if(x.schema !== "bruttech-svhl-current-fixture-window/v4" ||
           !Array.isArray(x.fixtures)) throw Error("Source schema not verified");
        return x.fixtures;
      }).catch(err => {sourcePromise=null;throw err;});
    return sourcePromise;
  }
  async function mountTeam(){
    const root=document.getElementById("team-leagueos-bridge-mount");
    if(!root)return;
    root.innerHTML='<p>Checking browser-local LeagueOS game drafts against the dated public fixture registry…</p>';
    try {
      const fixtures=await loadFixtures();
      if(!root.isConnected)return;
      const drafts=storageSnapshot(localStorage);
      const items=fixtures.map(f => qualify(f,drafts[String(f.game_id)])).filter(Boolean)
        .sort((a,b) => (b.result.savedAt||"").localeCompare(a.result.savedAt||""));
      root.innerHTML='<div class="v18-bridge-heading"><div><span>LEAGUEOS → HOCKEYOS</span>'+
        '<h2>Game result review inbox</h2><p>Practice submissions from the LeagueOS scorer appear here on the same device. The public HTO standings, player records and team statistics remain unchanged.</p></div>'+
        '<button type="button" class="btn" data-go="league-scoring">Open league scorer</button></div>'+
        (items.length ? items.map(card).join("") :
         '<div class="v18-empty"><strong>No saved Brave H.C. practice results in this browser.</strong>'+
         '<p>Open Game sheets in LeagueOS, choose the source-listed Brave H.C. fixture, enter a practice result and save. The locally saved result will then appear here.</p></div>')+
        '<p class="v18-boundary">REVIEW ONLY · No cross-device sync · No official write · No roster authorization · No league approval. Historical official games are never overwritten.</p>';
    } catch (_) {
      if(root.isConnected)root.innerHTML='<div class="v18-empty"><strong>Fixture verification unavailable</strong>'+
        '<p>LeagueOS drafts are held rather than linked to an unverified game. Retry by reopening Team home.</p></div>';
    }
  }
  window.LeagueOSTeamBridgeV18={mountTeam,_test:{
    storageSnapshot,safeScore,eventTotals,reconcile,powerPlaySummary,playerRows,qualify
  }};
})();