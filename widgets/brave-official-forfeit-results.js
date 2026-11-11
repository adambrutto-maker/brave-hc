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
    validateScoringDomains(ledger);
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
  function validateScoringDomains(ledger) {
    const source = ledger.seasonScoringDomains;
    assert(source?.scope === "REGULAR_SEASON_ONLY", "season scoring scope");
    assert(source?.originalRecordType === "HTO_OFFICIAL_ON_ICE_TEAM_GOALS" &&
      source?.awardedGoalType === "SVHL_ADMINISTRATIVE_FORFEIT_AWARD", "distinct goal accounting domains");
    assert(source?.primaryHTORecordsSource?.url ===
      "https://www.htosports.com/teams/default.asp?p=records&s=hockey&u=BRAVESHOCKEY",
      "official HTO Records source");
    assert(/^[a-f0-9]{64}$/.test(source.primaryHTORecordsSource.publicHTMLSHA256 || ""), "HTO source checksum");
    assert(Array.isArray(source.seasons) && source.seasons.length === 2, "exact two verified seasons");
    const seen = new Set();
    for (const s of source.seasons) {
      assert(!seen.has(s.season), "duplicated scoring season");
      seen.add(s.season);
      const standing = ledger.seasons?.find(x => x.season === s.season)?.officialLeagueStandings?.official;
      assert(standing && Number.isInteger(standing.gf) && Number.isInteger(standing.ga), "source season standing");
      const forfeitCount = ledger.forfeits.filter(f => f.season === s.season).length;
      for (const name of ["playedGameGoalsFor","officialLeagueStandingsGoalsFor",
                          "awardedAdministrativeGoalsFor","recordedTeamGoalsAgainst",
                          "officialLeagueGoalsAgainst","forfeitWins"]) {
        assert(Number.isInteger(s[name]) && s[name] >= 0, "season metric " + name);
      }
      assert(s.totalsIdentity ===
        "HTO_ON_ICE_GOALS_PLUS_AWARDED_FORFEIT_GOALS_EQUALS_SVHL_OFFICIAL_GF", "source arithmetic rule");
      assert(s.playedGameGoalsFor + s.awardedAdministrativeGoalsFor ===
        s.officialLeagueStandingsGoalsFor, "forfeit-adjusted team goals");
      assert(s.awardedAdministrativeGoalsFor === forfeitCount && s.forfeitWins === forfeitCount,
        "awarded goals must match administrative wins");
      assert(s.officialLeagueStandingsGoalsFor === standing.gf &&
        s.recordedTeamGoalsAgainst === standing.ga &&
        s.officialLeagueGoalsAgainst === standing.ga, "official GA/GF source parity");
    }
    assert(seen.has("Winter_2024/2025") && seen.has("Winter_2025/2026"), "verified season coverage");
    return true;
  }
  function getSeasonGoalAccounting(ledger, season) {
    validateLedger(ledger);
    const s = ledger.seasonScoringDomains.seasons.find(x => x.season === season);
    if (!s) return null;
    return {
      season: s.season, playedGameGoalsFor: s.playedGameGoalsFor,
      officialLeagueStandingsGoalsFor: s.officialLeagueStandingsGoalsFor,
      awardedAdministrativeGoalsFor: s.awardedAdministrativeGoalsFor,
      officialTeamGoalsAgainst: s.officialLeagueGoalsAgainst,
      awardedGoalsExcludedFromPlayerStats: true,
      sourceAuthority: "HTO_RECORDS_AND_SVHL_LEAGUE_FINALS"
    };
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
  const api = Object.freeze({validateLedger, getCanonicalForfeit, getSeasonGoalAccounting});
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.BraveOfficialForfeitResults = api;
})(typeof window !== "undefined" ? window : {});
