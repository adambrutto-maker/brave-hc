"""Public-only Brave H.C. canonical identity integrity contract.

Checks saved *published* feed semantics without access to private Master
Workbook or official HTO account. The offline proof cannot itself authorize
new franchise mergers; it prevents regression of already source-admitted data.

Fails closed on source-key rewrites, accidental league-name display, duplicate
matchup games, false no-history records and missing original same-game proof.
"""
from __future__ import annotations
from argparse import ArgumentParser
from datetime import datetime,timezone,timedelta
from pathlib import Path
from urllib.parse import parse_qs,urlparse
import json,re,sys

LEAGUE="Braves HC"
CANONICAL="Brave H.C."
EXPECTED={"Mohawks HC":("Mohawks H.C.","VERIFIED_HISTORICAL_NAME_VARIANT"),
          "Sugo Sundays":("Michelob Morts","VERIFIED_CURRENT_NAME_ALIAS_ONLY")}
EXACT_CORE={"Mid Ice Crisis","Big Bastones","Zamboner Crew","Dateline Predators"}
MAPLEWOLVES_HISTORICAL={"gp":10,"w":3,"l":6,"t":1,"gf":39,"ga":56}
MAPLEWOLVES_PLAYOFFS={"gp":2,"w":1,"l":1,"t":0,"gf":11,"ga":12}
ORIGINAL_MOHAWKS={"gp":49,"w":19,"l":19,"t":11,"gf":190,"ga":170}
ORIGINAL_MOHAWKS_RS={"gp":42,"w":16,"l":18,"t":8,"gf":161,"ga":155}
MOHAWKS_PLAYOFFS={"gp":7,"w":3,"l":1,"t":3,"gf":29,"ga":15}

class IdentityHold(ValueError):pass
def require(cond,code):
    if not cond:raise IdentityHold(code)
def load(path):return json.loads(Path(path).read_text(encoding="utf8"))
def total(contract,label):
    require(type(contract) is dict, "MISSING_TOTAL_"+label)
    for key in ("gp","w","l","t","gf","ga"):
        require(type(contract.get(key)) is int and contract[key]>=0,
                "NEGATIVE_OR_INVALID_TOTAL_"+label+"_"+key)
    require(contract["gp"]==contract["w"]+contract["l"]+contract["t"],
            "UNBALANCED_WLT_"+label)
    return contract
def sum_scores(a,b):
    return {k:a[k]+b[k] for k in ("gp","w","l","t","gf","ga")}
def source_url_is(url,kind,gid=None):
    if not isinstance(url,str):return False
    u=urlparse(url)
    q=parse_qs(u.query)
    if kind=="league":
        return u.scheme=="https" and u.hostname=="leagues.sportsvillage.ca" and u.path=="/TeamInfo.aspx" and q.get("leagueid")==["570"] and q.get("teamid") in (["13680"],["13709"])
    return (u.scheme=="https" and u.hostname=="www.htosports.com"
            and u.path=="/teams/default.asp" and q.get("u")==["BRAVESHOCKEY"]
            and q.get("p")==["boxscore"] and q.get("gameID")==[str(gid)])
def validate(standings,opponents,proof,html,js,now=None,check_fresh=False):
    now=now or datetime.now(timezone.utc)
    require(standings.get("schema")=="brave-hc-svhl-standings/v1" and
            standings.get("division")=="Cristillo" and standings.get("team")==LEAGUE,
            "SVHL_SOURCE_IDENTIFIER_MUST_REMAIN_UNCHANGED")
    teams=standings.get("teams")
    require(isinstance(teams,list) and len(teams)==8 and
            len({t.get("name") for t in teams})==8 and
            all(isinstance(t.get("name"),str) and t["name"].strip() for t in teams) and
            sum(t["name"]==LEAGUE for t in teams)==1,
            "DIVISION_TEAM_SOURCE_IDENTITIES_CHANGED")
    for t in teams:
        require(type(t.get("gp")) is int and type(t.get("w")) is int and
                type(t.get("l")) is int and type(t.get("t")) is int and
                all(t[k]>=0 for k in ("gp","w","l","t")) and
                t["gp"]==t["w"]+t["l"]+t["t"],"SVHL_STANDINGS_STAT_ARITHMETIC_CHANGED")
    require(opponents.get("schema")=="brave-hc-opponent-intelligence/v1" and
            opponents.get("status")=="PUBLIC_VERIFIED_SOURCE_IDENTITY" and
            opponents.get("publishable") is True and
            opponents.get("sourceTeamCanonical")==CANONICAL and
            opponents.get("sourceLeagueTeamAlias")==LEAGUE,
            "CANONICAL_TEAM_SOURCE_AUTHORITY_REGRESSED")
    coverage=opponents.get("coverage",{})
    entries=opponents.get("teams")
    require(type(coverage) is dict and isinstance(entries,list) and
            type(coverage.get("seasonOpponentArchives")) is int and
            0<=coverage["seasonOpponentArchives"]<=min(24,coverage.get("currentSeasonGames",0)) and
            coverage.get("currentDivisionOpponents")==7 and
            len(entries)==7+coverage["seasonOpponentArchives"] and
            len({x.get("name") for x in entries})==len(entries),
            "OPPONENT_VS_DIVISION_MEMBERSHIP_MISMATCH")
    current_keys={x["name"] for x in teams if x["name"]!=LEAGUE}
    present_division={x["name"] for x in entries if x.get("membershipStatus")=="CURRENT_DIVISION"}
    archived={x["name"] for x in entries if x.get("membershipStatus")=="SEASON_OPPONENT_ARCHIVE"}
    require(present_division==current_keys and
            not current_keys.intersection(archived) and
            len(archived)==coverage["seasonOpponentArchives"] and
            current_keys|archived=={x["name"] for x in entries},
            "OPPONENT_VS_DIVISION_MEMBERSHIP_MISMATCH")
    require(coverage.get("historicalGameRecords")==358 and
            type(coverage.get("currentSeasonGames")) is int and
            coverage["currentSeasonGames"]>=5 and
            coverage.get("aliasesNeedingReview")==0 and
            coverage.get("canonicalHistoricalLinks")==1 and
            coverage.get("verifiedCurrentGameAliases")==1 and
            coverage.get("historicalContinuityNotEstablished")==1,
            "PUBLIC_SOURCE_COVERAGE_SCOPE_DRIFT")
    identities={entry["name"]:entry for entry in entries}
    for name in archived:
        entry=identities[name]
        require(entry.get("verification") in
                ("VERIFIED_EXACT_NAME","VERIFIED_HISTORICAL_NAME_VARIANT",
                 "VERIFIED_CURRENT_NAME_ALIAS_ONLY") and
                type(entry.get("sourceHTOGames")) is int and
                1<=entry["sourceHTOGames"]<=coverage["currentSeasonGames"] and
                isinstance(entry.get("allTime"),dict) and
                type(entry["allTime"].get("gp")) is int and
                entry["allTime"]["gp"]>=entry["sourceHTOGames"],
                "ARCHIVED_OPPONENT_NEEDS_SOURCE_QUALIFIED_HTO_HISTORY_"+name)
    for name in EXACT_CORE | {"Maplewolves"}:
        if name not in identities:continue
        e=identities[name]
        require(e.get("verification")=="VERIFIED_EXACT_NAME" and
                e.get("identityScope")=="EXACT_NAME_ONLY_NO_UNREVIEWED_ALIASES" and
                not e.get("canonicalName"),"EXACT_OPPONENT_ARBITRARILY_RENAMED_"+name)
    if "Maplewolves" in identities:
        m=identities["Maplewolves"]
        require(m.get("allTime") is not None and m.get("regularSeason") is not None and
                m.get("playoffs")==MAPLEWOLVES_PLAYOFFS and
                m["allTime"].get("gp")==MAPLEWOLVES_HISTORICAL["gp"]+m.get("sourceHTOGames",0) and
                m["regularSeason"].get("gp")==8+m.get("sourceHTOGames",0),
                "MAPLEWOLVES_TEN_GAME_MASTER_HISTORY_DRIFT")
        if m.get("sourceHTOGames")==0:
            require(m["allTime"]==MAPLEWOLVES_HISTORICAL,
                    "MAPLEWOLVES_ORIGINAL_WORKBOOK_RESULTS_CHANGED")
    if "Other Way" in identities:
        remaining=identities["Other Way"]
        require(remaining.get("verification")=="NO_EXACT_HISTORY" and
                not any(k in remaining for k in ("regularSeason","allTime","playoffs","lastFive")),
                "NO_HISTORY_MUST_NOT_BECOME_ZERO_GAME_RECORD")
    for name,(canonical,status) in EXPECTED.items():
        require(name in identities,"APPROVED_CANONICAL_IDENTITY_MISSING_"+name)
        e=identities[name]
        require(e.get("canonicalName")==canonical and
                e.get("leagueDisplayAlias")==name and
                e.get("verification")==status and
                e.get("sourceNames",{}).get("hto")==canonical and
                e.get("sourceHTOGames",0)>=1,
                "APPROVED_CANONICAL_IDENTITY_DRIFT_"+name)
        totals=[total(e.get(k),name+"_"+k) for k in ("regularSeason","allTime","playoffs")]
        rs,alltime,playoff=totals
        require(alltime==sum_scores(rs,playoff),"PLAYOFF_PLUS_REGULAR_SEASON_DO_NOT_SUM_"+name)
        links=e.get("sourceLinks",{})
        require(source_url_is(links.get("svhl"),"league") and
                source_url_is(links.get("hto"),"hto",3356178 if name=="Mohawks HC" else 3369564),
                "OFFICIAL_SOURCE_IDENTITY_LINK_DRIFT_"+name)
    moh=identities["Mohawks HC"]
    require(moh.get("historicalWorkbookReport")=="Master Schedule!J317" and
            moh.get("identityScope")=="WORKBOOK_HISTORY_AND_HTO_CURRENT_GAME" and
            moh["sourceNames"].get("workbook")=="Mohawks HC" and
            moh["allTime"]["gp"]==ORIGINAL_MOHAWKS["gp"]+moh["sourceHTOGames"] and
            moh["regularSeason"]["gp"]==ORIGINAL_MOHAWKS_RS["gp"]+moh["sourceHTOGames"] and
            moh["playoffs"]==MOHAWKS_PLAYOFFS,
            "MOHAWKS_49_GAME_WORKBOOK_LINEAGE_OR_DEDUPLICATION_BROKEN")
    # The first HTO addition is known from two independently grounded 2026
    # source pages, including GP/GF/GA and final result. Future approved games
    # can change totals only with new individually source-admitted provenance.
    if moh["sourceHTOGames"]==1:
        expected=sum_scores(ORIGINAL_MOHAWKS,{"gp":1,"w":0,"l":1,"t":0,"gf":3,"ga":6})
        require(moh["allTime"]==expected,"MOHAWKS_50_GAME_SOURCE_SCORE_CHANGED")
    sugo=identities["Sugo Sundays"]
    require(sugo.get("historicalRecordsAreLimited") is True and
            sugo.get("identityScope")=="HTO_CURRENT_GAME_ONLY" and
            sugo["sourceNames"].get("workbook") is None and
            sugo["allTime"]["gp"]==sugo["sourceHTOGames"] and
            sugo["playoffs"]["gp"]==0,
            "MICHELOB_CURRENT_ONLY_SCOPE_OR_INVENTED_HISTORY")
    if sugo["sourceHTOGames"]==1:
        require(sugo["allTime"]=={"gp":1,"w":0,"l":1,"t":0,"gf":2,"ga":3},
                "MICHELOB_FIRST_OFFICIAL_RESULT_DRIFT")
    require(coverage.get("sourceQualifiedOpponents")==
            sum(x.get("verification")!="NO_EXACT_HISTORY" for x in entries) and
            coverage.get("noExactHistory")==
            sum(x.get("verification")=="NO_EXACT_HISTORY" for x in entries),
            "CANONICAL_PUBLIC_RECORD_COUNT_REGRESSED")
    for name in EXPECTED:
        e=identities[name]
        require(e.get("membershipStatus")==
                ("CURRENT_DIVISION" if name in current_keys else "SEASON_OPPONENT_ARCHIVE"),
                "CANONICAL_CURRENT_VS_ARCHIVE_MEMBERSHIP_DRIFT_"+name)
    require(proof.get("schema")=="brave-hc-2026-single-game-identity-proof/v1" and
            proof.get("status")=="OFFICIAL_SAME_GAME_PROOF_VERIFIED" and
            proof.get("franchiseHistoryMerged") is False,
            "OFFICIAL_GAME_IDENTITY_PROOFS_NOT_SOURCE_QUALIFIED")
    pairs=proof.get("sameGamePairs",[])
    require(len(pairs)==2 and {g.get("divisionName") for g in pairs}==set(EXPECTED),
            "OFFICIAL_GAME_PROOF_SET_CHANGED")
    for g in pairs:
        e=identities[g["divisionName"]]
        require(g.get("htoRecordedOpponent")==e["canonicalName"] and
                g.get("scope")=="THIS_COMPLETED_GAME_ONLY" and
                g.get("historicalFranchiseMergeAuthorized") is False and
                (g["htogameId"],g["date"],g["bravesGoals"],g["opponentGoals"])==
                ((3356178,"2026-09-27",3,6) if g["divisionName"]=="Mohawks HC"
                 else (3369564,"2026-10-04",2,3)) and
                g.get("result")=="L",
                "HTO_SVHL_ONE_GAME_PROOF_DRIFT")
    require("home-premium.js?v=3.6.5" in html and
            'home-premium.css?v=20261026-readability' in html,
            "HTML_JS_CSS_RELEASE_VERSION_NOT_PINNED")
    require('t.name===d.team?"Brave H.C.":(alias?.canonicalName||t.name)' in js and
            '["PUBLIC_VERIFIED_EXACT_ONLY","PUBLIC_VERIFIED_SOURCE_IDENTITY"]' in js and
            't.w/t.gp).toFixed(3).replace(/^0(?=\\.)/,"")' in js,
            "CANONICAL_UI_OR_DECIMAL_WIN_PCT_REGRESSION")
    if check_fresh:
        try:stamp=datetime.fromisoformat(opponents["asOf"].replace("Z","+00:00")).astimezone(timezone.utc)
        except (ValueError,KeyError,TypeError) as ex:raise IdentityHold("PUBLIC_CANONICAL_SOURCE_TIMESTAMP_BAD") from ex
        require(timedelta(0)<=now-stamp<=timedelta(days=10),
                "PUBLIC_CANONICAL_SOURCE_STALE_OVER_TEN_DAYS")
    return {"status":"CANONICAL_PUBLIC_IDENTITY_CONTRACT_PASS",
            "teamName":CANONICAL,"leagueSourceKey":LEAGUE,
            "divisionTeams":len(teams),            "verifiedOpponents":coverage["sourceQualifiedOpponents"],
            "currentDivisionOpponents":len(current_keys),
            "seasonOpponentArchives":len(archived),
            "mohawksAllTimeGames":moh["allTime"]["gp"],
            "mohawksSourceHTOGames":moh["sourceHTOGames"],
            "michelobCurrentGames":sugo["allTime"]["gp"],
            "unmatchedOpponents":["Other Way"],"franchiseHistoryNotInvented":True}
def main():
    p=ArgumentParser()
    p.add_argument("--widgets",default=str(Path(__file__).resolve().parents[1]/"widgets"))
    p.add_argument("--check-fresh",action="store_true")
    opt=p.parse_args()
    root=Path(opt.widgets)
    try:
        result=validate(load(root/"standings.json"),load(root/"opponent-intelligence.json"),
            load(root/"current-opponent-identity-bridges.json"),
            (root/"home-panels.html").read_text(encoding="utf8"),
            (root/"home-premium.js").read_text(encoding="utf8"),
            check_fresh=opt.check_fresh)
        print(json.dumps(result));return 0
    except (IdentityHold,KeyError,TypeError,ValueError,OSError) as e:
        print(json.dumps({"status":"HOLD","reason":str(e),
            "franchiseMerged":False,"sourceWorkbookChanged":False}),file=sys.stderr)
        return 2
if __name__=="__main__":sys.exit(main())
