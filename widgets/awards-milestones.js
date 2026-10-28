/* Brave H.C. — existing native HTO Awards page embedded milestone section.
 * This is a scoped widget asset, NOT a new site page. Source grants only via published Highlights ledger.
 * HTO legacy Records remain untouched pending the owner-approved migration and independent verification. */
(function () {
  'use strict';
  const script = document.currentScript;
  const base = script && script.src ? new URL('./', script.src).href : './';
  const root = document.getElementById('brave-hc-awards-milestones');
  if (!root) return; // Never add new content outside the explicitly placed Awards mount.
  const params = new URLSearchParams(location.search);
  if (params.has('p') && params.get('p') !== 'awards') return;
  if (!document.getElementById('bhma-css')) {
    const link = document.createElement('link');
    link.id = 'bhma-css'; link.rel = 'stylesheet'; link.href = base + 'awards-milestones.css';
    document.head.append(link);
  }
  root.classList.add('bhma');
  root.setAttribute('aria-label', 'Brave H.C. verified career milestones');
  const text = (tag, contents, cls) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    e.textContent = String(contents == null ? '' : contents);
    return e;
  };
  const section = text('section', '', 'bhma-section');
  const head = text('div', '', 'bhma-heading');
  const title = text('h2', 'Milestones');
  const helper = text('p', 'Verified Games, Points and Wins achievements, shown with their earned dates.');
  const status = text('p', 'Loading verified milestone history…', 'bhma-status');
  status.setAttribute('role', 'status');
  const actions = text('div', '', 'bhma-filters');
  actions.setAttribute('role','group'); actions.setAttribute('aria-label','Milestone category');
  const grid = text('div', '', 'bhma-grid');
  const more = text('button', 'View all milestones', 'bhma-more');
  more.type = 'button'; more.hidden = true;
  head.append(title, helper);
  section.append(head, status, actions, grid, more);
  root.replaceChildren(section);
  const months = 'January February March April May June July August September October November December'.split(' ');
  const tierOf = n => n < 100 ? 'bronze' : n < 200 ? 'silver' : n < 300 ? 'gold' : 'platinum';
  const parseMilestone = (item, player, playerID) => {
    if (item.category !== 'milestone') return null;
    const cleaned = String(item.displayText || item.sourceText || '')
      .replace(/[\u00a0\ufffd]/g, ' ').replace(/\s+/g, ' ').trim();
    const m = /^(\d+) (Game|Point|Win) Club\s*[-–]\s*(\w+) (\d{1,2}), (20\d{2})$/i.exec(cleaned);
    if (!m || !months.some(x => x.toLowerCase() === m[3].toLowerCase())) throw Error('Unverifiable milestone date format');
    const count = Number(m[1]), metric = ({Game:'games',Point:'points',Win:'wins'})[m[2][0].toUpperCase() + m[2].slice(1).toLowerCase()];
    if (!Number.isSafeInteger(count) || count < 50 || !metric) throw Error('Unverifiable milestone threshold');
    const tier = tierOf(count), date = m[3]+' '+m[4]+', '+m[5];
    const stamp = Date.UTC(Number(m[5]), months.findIndex(x => x.toLowerCase() === m[3].toLowerCase()), Number(m[4]));
    if (!Number.isFinite(stamp)) throw Error('Invalid date');
    const icon = count+'_'+metric+'_'+tier+'_200.webp';
    return {id:playerID+':'+item.id, player, playerID, count,metric,tier,date,stamp,icon,
      name:count+' '+m[2]+' Club'};
  };
  function verifiedRows(ledger, corrections) {
    if (!ledger || ledger.schema !== 'brave-hc-player-highlights/v1' || !ledger.players ||
        !corrections || corrections.schema !== 'brave-hc-player-highlights-display-corrections/v1' ||
        corrections.status !== 'MANAGER_APPROVED_DISPLAY_CORRECTIONS' || !Array.isArray(corrections.corrections)) {
      throw Error('Milestone authority not verified');
    }
    const approved = new Map();
    for (const c of corrections.corrections) {
      const key = String(c.playerID)+':'+String(c.itemID);
      if (approved.has(key) || c.category !== 'milestone') throw Error('Duplicate or invalid approval');
      approved.set(key,c);
    }
    const rows = [], seen = new Set(), used = new Set();
    for (const [playerID,player] of Object.entries(ledger.players)) {
      if (!player || !Array.isArray(player.items) || typeof player.name !== 'string') throw Error('Malformed historical player');
      for (const item of player.items) {
        if (item.category !== 'milestone') continue;
        if (!item.id || !item.sourceText) throw Error('Unproven milestone source');
        const key = playerID+':'+item.id;
        if (seen.has(key)) throw Error('Duplicate milestone');
        seen.add(key);
        const approvedCorrection = approved.get(key);
        let presentation = item;
        if (approvedCorrection) {
          if (approvedCorrection.playerName !== player.name ||
              approvedCorrection.sourceText !== item.sourceText ||
              approvedCorrection.expectedDisplayText !== item.displayText) throw Error('Date approval no longer matches source');
          presentation = Object.assign({},item,{displayText:approvedCorrection.displayText});
          used.add(key);
        }
        const row = parseMilestone(presentation,player.name,playerID);
        if (row) rows.push(row);
      }
    }
    if (approved.size !== used.size) throw Error('Approved source correction not applied');
    return rows.sort((a,b) => b.stamp-a.stamp || b.count-a.count || a.player.localeCompare(b.player));
  }
  const state = {filter:'all',expanded:false,rows:[]};
  const profileUrl = id => 'https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID='+encodeURIComponent(id);
  function draw() {
    const buckets = {all:state.rows.length,games:0,points:0,wins:0};
    state.rows.forEach(x => { buckets[x.metric]++; });
    if (!buckets[state.filter]) state.filter = 'all';
    actions.replaceChildren();
    for (const name of ['all','games','points','wins']) {
      const button = text('button',(name === 'all' ? 'All' : name[0].toUpperCase()+name.slice(1))+' ('+buckets[name]+')','bhma-filter');
      button.type = 'button';button.setAttribute('aria-pressed',String(state.filter === name));
      button.addEventListener('click',()=>{state.filter=name;state.expanded=false;draw();});
      actions.append(button);
    }
    const visible = state.rows.filter(x => state.filter === 'all' || x.metric === state.filter);
    grid.replaceChildren();
    for (const row of visible.slice(0,state.expanded?visible.length:18)) {
      const tile = text('article','','bhma-card bhma-'+row.tier);
      const artwork = text('div','','bhma-artwork');
      const img = document.createElement('img');
      img.src = base+'assets/round-clubs/'+row.icon;
      img.alt = row.count+' '+row.metric+' '+row.tier+' Brave H.C. earned badge';
      img.loading = 'lazy';img.decoding='async';
      img.onerror = () => {img.remove();artwork.append(text('span',String(row.count)+' '+row.metric,'bhma-art-fallback'));};
      artwork.append(img);
      const content = text('div','','bhma-copy');
      const badge = text('span',row.tier.toUpperCase()+' · EARNED','bhma-tier');
      const name = text('strong',row.name,'bhma-name');
      const person = text('a',row.player,'bhma-player');
      person.href = profileUrl(row.playerID);
      person.rel = 'noopener noreferrer'; person.target = '_blank';
      const date = text('span','Earned '+row.date,'bhma-date');
      content.append(badge,name,person,date);
      tile.append(artwork,content);grid.append(tile);
    }
    more.hidden = visible.length <= 18;
    more.textContent = state.expanded ? 'Show fewer milestones' : 'View all '+visible.length+' milestones';
    more.setAttribute('aria-expanded',String(state.expanded));
    status.textContent = state.rows.length+' source-verified career milestones · Historical dates preserved';
  }
  more.addEventListener('click',()=>{state.expanded=!state.expanded;draw();});
  let active = false;
  async function refresh() {
    if (active) return;
    active = true;
    try {
      const [a,b] = await Promise.all([
        fetch(base+'player-highlights-ledger.json',{cache:'no-store'}),
        fetch(base+'player-highlights-display-corrections.json',{cache:'no-store'})
      ]);
      if (!a.ok || !b.ok) throw Error('Historical source unavailable');
      const rows = verifiedRows(await a.json(),await b.json());
      if (!rows.length) throw Error('No independently verified achievements');
      state.rows = rows; draw();
    } catch(error) {
      if (!state.rows.length) {
        status.textContent = 'Milestone history is temporarily unavailable. Original awards remain unchanged.';
        grid.replaceChildren(); actions.replaceChildren();
      } // Preserve last verified view during transient source outage.
      root.dataset.sourceStatus='held';
      return;
    } finally {active=false;}
    root.dataset.sourceStatus='verified';
  }
  refresh();
  window.setInterval(refresh,3*60*1000); // Existing profile source-polling cadence.
})();
