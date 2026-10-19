/* Brave H.C. official HTO player-profile links. All IDs are observed public HTO player links. */
(function (scope) {
  'use strict';
  const roster = [
    ['Stefano Ardizzi',356089],['Nolan Atkins',769343],['Adam Brutto',354054],
    ['Justin Carosi',354060],['Marco Congiusti',354041],['Andrew Cristillo',634098],
    ['Lorcan Duffy',586425],['Adam Kober',736317],['Henry Kong',846200],
    ['Dev Leong',776208],['Stephen Logue',354055],['Stefano Mazzei',595514],['Alex Pagnotta',354058],
    ['Anthony Paolucci',354057],['Damian Pavaday',849368],['Keith Pearsoll',354056],
    ['Adam Povegliano',844036],['Mario Provenzano',354045],['Michael Provenzano',686216],
    ['Krishnan Rajasooriar',700877],['Sanjay Rajkumar',845365],['Jamie Rosenberg',843644],
    ['Stephane Saindon',738846],['Francesco Triumbari',845364],['Adam Carlyle',849369]
  ];
  const normalize = name => String(name || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim().toLocaleLowerCase('en-CA');
  const byName = new Map(), names = [];
  for (const [full, id] of roster) {
    const parts = full.split(' ');
    for (const variant of [full, parts.slice(1).join(' ') + ', ' + parts[0]]) {
      byName.set(normalize(variant), id);
      names.push(variant);
    }
  }
  const profileUrl = name => {
    const id = byName.get(normalize(name));
    return id ? 'https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=' + id : null;
  };
  // Season filter format is copied from the live HTO ProfileTabStats dropdown.
  const officialSeason = input => {
    if (!input) return null;
    const v = String(input).trim().replace(/\s+/g, ' ');
    const winter = /^Winter[ _](20\d{2})[\/-](20\\d{2}|\\d{2})$/i.exec(v);
    if (winter) {
      const end = winter[2].length === 2 ? winter[1].slice(0, 2) + winter[2] : winter[2];
      return Number(end) === Number(winter[1]) + 1 ? 'Winter_' + winter[1] + '/' + end : null;
    }
    const summer = /^Summer[ _](20\d{2})$/i.exec(v);
    return summer ? 'Summer_' + summer[1] : null;
  };
  // A game link must be the actual, supplied HTO boxscore URL. Never fabricate a gameID.
  const officialGame = input => {
    if (!input || typeof input !== 'string') return null;
    try {
      const u = new URL(input);
      return u.protocol === 'https:' && u.hostname.toLowerCase() === 'www.htosports.com'
        && u.pathname.toLowerCase() === '/teams/default.asp'
        && u.searchParams.get('u') === 'BRAVESHOCKEY'
        && u.searchParams.get('p') === 'boxscore'
        && /^\d+$/.test(u.searchParams.get('gameID') || '') ? u.href : null;
    } catch { return null; }
  };
  const resolve = (name, context) => {
    const url = profileUrl(name);
    if (!url) return null;
    const game = officialGame(context?.gameUrl);
    if (game) return game;
    const season = officialSeason(context?.season);
    return season ? url + '&pageLoad=ProfileTabStats&viewseas=' + season : url;
  };
  scope.BravePlayerLinks = Object.freeze({ profileUrl, resolve, officialSeason, officialGame, knownPlayers: roster.length });
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;

  const escapeRegex = s => s.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
  const regex = new RegExp('(^|[^\\p{L}\\p{N}])(' + names
    .sort((a, b) => b.length - a.length)
    .map(s => s.split(' ').map(escapeRegex).join('[\\s\\u00a0]+'))
    .join('|') + ')(?=$|[^\\p{L}\\p{N}])', 'giu');
  const excluded = new Set(['A','BUTTON','CODE','NOSCRIPT','OPTION','PRE','SCRIPT','SELECT','STYLE','SVG','TEXTAREA']);
  function eligible(node) {
    const p = node.parentElement;
    if (!p || !node.nodeValue || !node.nodeValue.trim()) return false;
    for (let el = p; el; el = el.parentElement) if (excluded.has(el.tagName) || el.isContentEditable) return false;
    return true;
  }
  function linkText(node) {
    if (!eligible(node)) return;
    const value = node.nodeValue;
    regex.lastIndex = 0;
    const found = [];
    let m;
    while ((m = regex.exec(value))) {
      const start = m.index + m[1].length, end = start + m[2].length;
      let contextNode = node.parentElement, season = null, gameUrl = null;
      while (contextNode) {
        if (season === null && contextNode.hasAttribute('data-hto-season')) season = contextNode.getAttribute('data-hto-season');
        if (gameUrl === null && contextNode.hasAttribute('data-hto-game-url')) gameUrl = contextNode.getAttribute('data-hto-game-url');
        contextNode = contextNode.parentElement;
      }
      const href = resolve(m[2], {season, gameUrl});
      if (href && (!found.length || start >= found[found.length - 1].end)) found.push({start,end,href});
    }
    if (!found.length) return;
    const fragment = document.createDocumentFragment();
    let end = 0;
    for (const hit of found) {
      if (hit.start > end) fragment.append(document.createTextNode(value.slice(end,hit.start)));
      const a = document.createElement('a');
      a.className = 'brave-player-link';
      a.href = hit.href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.title = 'View official Brave H.C. player profile on HTO';
      a.textContent = value.slice(hit.start,hit.end);
      fragment.append(a);
      end = hit.end;
    }
    if (end < value.length) fragment.append(document.createTextNode(value.slice(end)));
    node.parentNode.replaceChild(fragment,node);
  }
  function scan(root) {
    if (root.nodeType === 3) return linkText(root);
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1 && excluded.has(root.tagName)) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(linkText);
  }
  function start() {
    const style = document.createElement('style');
    style.textContent = '.brave-player-link{color:inherit;text-decoration:underline;text-decoration-color:#d6a65b;text-underline-offset:3px}.brave-player-link:hover{color:#f3c979}.brave-player-link:focus-visible{outline:2px solid #f3c979;outline-offset:2px}';
    document.head.append(style);
    scan(document.body);
    const observer = new MutationObserver(records => {
      const added = new Set();
      for (const record of records) for (const node of record.addedNodes) added.add(node);
      added.forEach(scan);
    });
    observer.observe(document.body,{subtree:true,childList:true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})(typeof window === 'undefined' ? globalThis : window);
