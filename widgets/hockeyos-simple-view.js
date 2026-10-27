/* HockeyOS progressive-disclosure UX. No source data, ratings or official records are modified. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const section = id => $(id)?.closest("section");
  const isDivision = Boolean($("layout-design-options"));
  const isLeague = Boolean($("profile-title"));
  if (!isDivision && !isLeague) return;
  document.body.classList.add("hockeyos-simplified", isDivision ? "division-view" : "scouting-view");

  function node(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function details(id, title, help) {
    const el = node("details", "os-disclosure");
    el.id = id;
    const label = node("summary", "", title);
    el.append(label);
    if (help) el.append(node("p", "os-helper", help));
    return el;
  }
  function safeMove(container, nodes) {
    nodes.forEach(item => { if (item && item !== container) container.append(item); });
  }
  const main = document.querySelector("main");
  const firstSection = main.querySelector("section");
  const nav = node("nav", "os-topnav");
  nav.setAttribute("aria-label", "HockeyOS quick navigation");
  const links = node("div", "os-views");
  const scoutingLink = node("a", !isDivision ? "current" : "", "Scout a team");
  scoutingLink.href = "./league-intelligence.html";
  if (!isDivision) scoutingLink.setAttribute("aria-current", "page");
  const divisionLink = node("a", isDivision ? "current" : "", "Compare divisions");
  divisionLink.href = "./division-fit-lab.html";
  if (isDivision) divisionLink.setAttribute("aria-current", "page");
  links.append(scoutingLink, divisionLink);
  const modes = node("div", "os-modes");
  modes.setAttribute("role", "group");
  modes.setAttribute("aria-label", "Level of detail");
  const simpleBtn = node("button", "os-mode", "Essentials");
  simpleBtn.type = "button";
  const fullBtn = node("button", "os-mode", "All data");
  fullBtn.type = "button";
  modes.append(simpleBtn, fullBtn);
  nav.append(links, modes);
  main.insertBefore(nav, main.querySelector("h1") || firstSection);

  const vault = details("os-more-data",
    isDivision ? "Explore the complete division evidence" : "Explore full standings, history and league research",
    "Every original dataset, comparison, source reference and research control is retained below.");
  vault.classList.add("os-data-vault");
  const jumps = node("nav", "os-data-jumps");
  jumps.setAttribute("aria-label", "Jump to a detailed data section");
  const destinations = isDivision
    ? [["source-title","Source data"],["connection-title","Cross-division games"],["scenario-title","Other layouts"],
       ["stability-title","Weekly history"],["history-title","Older seasons"],["handoff-title","Research report"]]
    : [["scout-title","Cristillo opponents"],["league-title","All standings"],["league-strength-title","Division strength"],
       ["historical-archive-title","Season archives"],["movement-title","Team movements"]];
  for (const [id,label] of destinations) {
    const link = node("a", "", label);
    link.href = "#"+id;
    jumps.append(link);
  }
  vault.append(jumps);
  let profileDeep, teamDetails, optionsDetails;
  const expandable = [vault];

  if (isLeague) {
    const heading = main.querySelector("h1");
    heading.textContent = "Scout the opposition. Keep the game plan simple.";
    main.querySelector(".sub").textContent =
      "Choose an opponent, see the facts that matter, and prepare matchups. Open All data for complete league standings, history and research.";

    const hero = node("section", "os-hero panel");
    hero.id = "os-scout-hero";
    hero.setAttribute("aria-label", "Choose an opponent");
    hero.append(node("div", "os-eyebrow", "GAME-DAY SCOUTING"));
    hero.append(node("h2", "", "Who are we preparing for?"));
    const chooseLabel = node("label", "os-select-label", "Choose an opponent");
    chooseLabel.htmlFor = "os-quick-team";
    const choose = node("select", "os-quick-select");
    choose.id = "os-quick-team";
    choose.setAttribute("aria-label", "Choose a team to scout");
    choose.add(new Option("Loading official teams…", ""));
    hero.append(chooseLabel, choose);
    hero.append(node("p", "os-helper", "Select any adult Sunday team. This is scouting research, not a forecast or confirmed game-day roster."));
    main.insertBefore(hero, section("fixtures-title"));

    // The native source team's selector remains authoritative for choosing a team.
    const original = $("team-filter");
    const profileName = $("profile-title");
    function syncTeam() {
      if (!original) return;
      const originalOptions = Array.from(original.options);
      if (originalOptions.length && (
          choose.options.length !== originalOptions.length ||
          originalOptions.some((o,i) => choose.options[i]?.value !== o.value))) {
        choose.replaceChildren(...originalOptions.map(o => new Option(o.text, o.value)));
      }
      if (original.value && choose.value !== original.value) choose.value = original.value;
    }
    choose.addEventListener("change", () => {
      original.value = choose.value;
      original.dispatchEvent(new Event("change", {bubbles:true}));
      syncTeam();
      $("profile-title")?.scrollIntoView({behavior:"smooth",block:"start"});
    });
    original.addEventListener("change", syncTeam);
    const teamWatch = new MutationObserver(syncTeam);
    teamWatch.observe(original,{childList:true,subtree:true});
    if (profileName) new MutationObserver(syncTeam).observe(profileName,{childList:true,subtree:true,characterData:true});
    syncTeam();

    const profile = section("profile-title");
    const fixtures = section("fixtures-title");
    if (profile && fixtures) fixtures.after(profile);
    profile?.classList.add("os-main-profile");
    const basic = new Set([
      "profile-metrics","plain-opponent-summary","roster-scouting-status",
      "roster-player-priorities","copy-roster-plan","roster-copy-status",
      "roster-scouting-caution"
    ]);
    profileDeep = details("os-profile-deep", "Full team analysis, source history and completed games",
      "Open to see all original ratings, historical context, game results and WhatsApp scouting details.");
    for (const child of Array.from(profile.children)) {
      if (child.matches(".details")) continue;
      if (child.id && basic.has(child.id)) continue;
      if (child.matches("h3") && (
        child.textContent.includes("plain language") ||
        child.textContent.includes("Players to prepare"))) continue;
      if (child.matches("p.small") && child.previousElementSibling?.matches("h3") &&
          child.previousElementSibling.textContent.includes("Players to prepare")) continue;
      profileDeep.append(child);
    }
    profile.append(profileDeep);
    expandable.push(profileDeep);
    // The actual game-day sharing action belongs in Essentials, not behind All data.
    // Move existing, source-checked controls; never create duplicate handlers or send messages.
    const quickActions = node("div", "os-scout-actions");
    quickActions.id = "os-scout-actions";
    quickActions.setAttribute("aria-label", "Game-day scouting actions");
    quickActions.append(node("strong", "os-action-heading", "Ready to share the scouting brief?"));
    const actionButtons = node("div", "os-action-buttons");
    const whatsapp = $("copy-scout-brief");
    const matchup = $("copy-roster-plan");
    if (whatsapp) {
      whatsapp.textContent = "Copy scouting brief for WhatsApp";
      whatsapp.classList.add("os-primary-action");
      actionButtons.append(whatsapp);
    }
    if (matchup) {
      matchup.textContent = "Copy planned player matchups";
      matchup.classList.add("os-secondary-action");
      actionButtons.append(matchup);
    }
    quickActions.append(actionButtons);
    const actionHelp = node("p", "os-helper",
      "Copy only—nothing is sent. Verify the current opponent, actual lineup and game time before sharing.");
    quickActions.append(actionHelp);
    for (const id of ["scout-copy-status", "roster-copy-status"]) {
      const feedback = $(id);
      if (feedback) quickActions.append(feedback);
    }
    $("roster-player-priorities")?.after(quickActions);
    const copy = $("copy-roster-plan");
    if (copy) copy.textContent = "Copy planned player matchups";
    const threats = $("roster-player-priorities");
    const enhanceThreatCards = () => {
      if (!threats) return;
      observer.disconnect();
      threats.querySelectorAll("article").forEach(card => {
        if (card.dataset.osEnhanced) return;
        card.dataset.osEnhanced="true";
        const selects = Array.from(card.querySelectorAll("select"));
        if (!selects.length) return;
        const box = details("", "Plan a player matchup", "Optional. Confirm game-day attendance before assigning anyone.");
        box.classList.add("os-matchup-control");
        const hint = Array.from(card.querySelectorAll("p")).find(p => p.textContent.includes("Possible matchup"));
        if (hint) box.append(hint);
        selects.forEach(s => box.append(s));
        box.open = document.body.classList.contains("os-all-data");
        card.append(box);
      });
      observer.observe(threats,{childList:true});
    };
    const observer = new MutationObserver(enhanceThreatCards);
    observer.observe(threats,{childList:true});
    enhanceThreatCards();
    safeMove(vault, [
      section("scout-title"),section("league-title"),section("league-strength-title"),
      section("historical-archive-title"),section("movement-title"),
      Array.from(main.querySelectorAll("section")).find(s=>s.querySelector("h2")?.textContent === "How to read this")
    ]);
    profile.after(vault);
  } else {
    main.querySelector("h1").textContent="Find a better division structure.";
    main.querySelector(".intro").innerHTML =
      "Compare practical layouts for adult Sunday hockey. <strong>All teams stay accounted for.</strong> These are research options, not official division changes.";
    const layout = section("layout-title");
    const gate = section("gate-title");
    const notice = $("notice");
    if (layout && notice) notice.after(layout);
    if (layout && gate) layout.after(gate);
    layout?.classList.add("os-main-layout");
    const explanation = node("p","os-helper",
      "Start with the goal below. A proposed layout is a what-if study, not a league recommendation.");
    $("layout-design-focus")?.closest(".layout-research-bar")?.before(explanation);
    // Preserve all 22 team rows, source evidence and caveats in an accessible detail.
    teamDetails = details("os-team-details", "View every proposed team placement",
      "All original club names, scores and roster-construction evidence are here.");
    safeMove(teamDetails, [
      $("layout-proposal-label"), $("layout-proposal-comparison"),
      $("layout-roster-source-status"), $("layout-proposal-groups")
    ]);
    const anchor = $("layout-caveat");
    anchor?.before(teamDetails);
    expandable.push(teamDetails);
    optionsDetails = details("os-division-controls", "Advanced placement and enrollment controls",
      "Compare evidence-aware swaps or test 21/23-team capacity planning without changing any real source team.");
    const controls = $("layout-placement-mode")?.closest(".layout-research-bar");
    safeMove(optionsDetails, [
      controls, $("layout-refinement-detail"), $("layout-refinement-swaps"),
      $("layout-total-planning")
    ]);
    $("layout-copy")?.before(optionsDetails);
    expandable.push(optionsDetails);
    safeMove(vault, [
      section("source-title"),section("connection-title"),section("scenario-title"),
      section("stability-title"),section("history-title"),section("handoff-title")
    ]);
    gate?.after(vault);
  }

  function applyMode(full) {
    document.body.classList.toggle("os-all-data", full);
    document.body.classList.toggle("os-essentials", !full);
    simpleBtn.setAttribute("aria-pressed", String(!full));
    fullBtn.setAttribute("aria-pressed", String(full));
    for (const d of expandable) d.open=full;
    document.querySelectorAll(".os-matchup-control").forEach(d=>d.open=full);
  }
  simpleBtn.addEventListener("click",()=>applyMode(false));
  fullBtn.addEventListener("click",()=>applyMode(true));
  applyMode(false);
})();