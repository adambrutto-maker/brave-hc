/* Brave H.C. administrative-forfeit normalization, source-safe and side-effect free.
 * Use Sports Village official HOME-first/VISITOR-second finals for team standings.
 * Preserve source HTO 0-0 cells and -WIN/-Forfeit labels; never mint player stats.
 * This file does not load or overwrite data on its own.
 */
(function (root) {
  "use strict";
  const SCHEMA = "brave-hc-svhl-canonical-administrative-forfeits/v1";
  function assert(condition, reason) {
    if (!condition) throw new Error("Official forfeit validation failed: " + reason);
  }
  function validateLedger(ledger) {
    assert(ledger && ledger.schema === SCHEMA, "schema");
    assert(ledger.status === "RECONCILED_DUAL_SOURCE_ALL_FOUR_FORFEITS_BOTH_SEASONS", "source status");
    assert(Array.isArray(ledger.forfeits) && ledger.forfeits.length === 4, "exactly four source-verified games");
    assert(ledger.authorityRules?.leagueDisplayedScoreOrientation === "HOME_TEAM_FIRST_VISITOR_TEAM_SECOND_ON_BOTH_TEAM_PAGES", "score orientation");
    assert(ledger.authorityRules?.zeroPlayerCredits === true, "zero player credits");
    const ids = ledger.forfeits.map(x => x.htoGameId);
    assert(new Set(ids).size === 4, "duplicate game ID");
    for (const x of ledger.forfeits) validateRow(x);
    return true;
  }
  function validateRow(x) {
    assert(x && Number.isInteger(x.htoGameId) && Number.isInteger(x.svhlGameId), "game identities");
    assert(x.season === "Winter_2024/2025" || x.season === "Winter_2025/2026", "historical season");
    assert(x.eventType === "ADMINISTRATIVE_FORFEIT" && x.playedOnIce === false, "forfeit classification");
    assert(x.countsInOnIceGoalOrAssistStats === false, "on-ice scoring exclusion");
    assert(x.bravesHomeAway === "HOME" || x.bravesHomeAway === "VISITOR", "home/visitor");
    const league = x.leagueHomeAwayScore;
    assert(Number.isInteger(league?.home) && Number.isInteger(league?.visitor), "official score");
    const goalFor = x.bravesHomeAway === "HOME" ? league.home : league.visitor;
    const goalAgainst = x.bravesHomeAway === "HOME" ? league.visitor : league.home;
    assert(goalFor === 1 && goalAgainst === 0, "league forfeit winner and result");
    assert(x.leagueCanonicalTeamScore?.braves === goalFor &&
      x.leagueCanonicalTeamScore?.opponent === goalAgainst &&
      x.leagueCanonicalTeamScore?.outcome === "W", "canonical score must follow home/away");
    const source = x.sourceCheck;
    assert(source?.reciprocalScoresEqual === true &&
      source?.htoForfeitWinnerMatchesLeague === true, "reciprocal team verification");
    assert(source?.bravesLeagueTeamPage?.teamRole === x.bravesHomeAway, "Brave side");
    assert(source?.opponentLeagueTeamPage?.teamRole !== x.bravesHomeAway, "opponent side");
    for (const row of [source.bravesLeagueTeamPage, source.opponentLeagueTeamPage]) {
      assert(row.leagueHomeGoals === league.home && row.leagueVisitorGoals === league.visitor, "reciprocal home/away goals");
    }
    const hto = source?.originalHTOBoxscore?.rawDisplay;
    assert(hto && hto.bravesGoals === 0 && hto.opponentGoals === 0 &&
      hto.bravesLabel === "Brave H.C. - WIN" &&
      hto.opponentLabel?.endsWith(" - Forfeit"), "unaltered HTO forfeit source");
    const contribution = x.countsInLeagueStandings;
    assert(contribution && contribution.gp === 1 && contribution.w === 1 &&
      contribution.l === 0 && contribution.t === 0 &&
      contribution.gf === 1 && contribution.ga === 0, "league standings contribution");
    return true;
  }
  function getCanonicalForfeit(ledger, season, htoGameId) {
    validateLedger(ledger);
    assert(typeof season === "string" && Number.isInteger(htoGameId), "lookup args");
    const matches = ledger.forfeits.filter(g => g.season === season && g.htoGameId === htoGameId);
    assert(matches.length < 2, "ambiguous game identity");
    if (matches.length === 0) return null; // Played game: never infer or change its official score.
    const g = matches[0], original = g.sourceCheck.originalHTOBoxscore.rawDisplay;
    const result = {
      season: g.season, date: g.date, htoGameId: g.htoGameId,
      svhlGameId: g.svhlGameId, opponent: g.opponent,
      gameType: "ADMINISTRATIVE_FORFEIT",
      playedOnIce: false, officialAuthority: "SVHL_LEAGUE_FINAL",
      officialTeamFinal: {braves: 1, opponent: 0, result: "W"},
      standingsContribution: {...g.countsInLeagueStandings},
      onIcePlayerStatisticsContribution: {gp: 0, goals: 0, assists: 0},
      sourceHTODisplay: {
        bravesGoals: original.bravesGoals, opponentGoals: original.opponentGoals,
        bravesLabel: original.bravesLabel, opponentLabel: original.opponentLabel
      }
    };
    return result;
  }
  const api = Object.freeze({validateLedger, getCanonicalForfeit});
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.BraveOfficialForfeitResults = api;
})(typeof window !== "undefined" ? window : {});
