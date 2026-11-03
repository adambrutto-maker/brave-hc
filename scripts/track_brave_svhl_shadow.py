"""Private Brave H.C. HTO-vs-SVHL discrepancy tracker.

HTO is the authoritative Brave H.C. player statistic. SVHL observations are
stored in separate shadow tables; same-name joins are REVIEW CANDIDATES ONLY.
No public feed, HTO statistic, accepted score, workbook or team roster is
modified. The main opponent scouting tables remain Brave-free.
"""
from __future__ import annotations
from argparse import ArgumentParser
from collections import Counter
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
import json
import re
import sqlite3
import sys
import unicodedata

HTO = "brave-hc-hto-player-actuals/v1"
SVHL = "brave-hc-public-svhl-roster-seasons/v1"
LEAGUE = "brave-hc-league-intelligence/public-v1"
REPORT = "brave-hc-braves-svhl-shadow-review/private-v1"
BRAVE = 13679
STATS = ("gp", "g", "a", "pts")
HEX = re.compile(r"^[0-9a-f]{64}$")
class ShadowHold(ValueError):
    pass

def need(ok, reason):
    if not ok:
        raise ShadowHold("BRAVES_SOURCE_SHADOW_HOLD:" + reason)

def canonical_name(name):
    text = str(name).strip()
    if "," in text:
        left, right = [x.strip() for x in text.split(",", 1)]
        text = right + " " + left
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", text.lower())

def stamp(s):
    try:
        date = datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except ValueError as ex:
        raise ShadowHold("BRAVES_SOURCE_SHADOW_HOLD:SOURCE_TIME_INVALID") from ex
    need(date.tzinfo is not None, "SOURCE_TIME_NAIVE")
    return date

def source(path):
    raw = Path(path).read_bytes()
    need(100 < len(raw) < 8_000_000, "SOURCE_FILE_SIZE_INVALID")
    return json.loads(raw), sha256(raw).hexdigest()

def examine(hto, svhl, league, hashes):
    need(hto.get("schema") == HTO and hto.get("status") == "VERIFIED_HTO_CURRENT" and
         hto.get("season") == "W2026/27" and hto.get("sourceUrl", "").startswith(
             "https://www.htosports.com/teams/default.asp") and
         isinstance(hto.get("players"), list) and
         hto.get("playerCount") == len(hto["players"]) and
         svhl.get("schema") == SVHL and svhl.get("sourceLeagueId") == 570 and
         svhl.get("currentTeams") == 22 and
         league.get("schema") == LEAGUE and league.get("leagueId") == 570 and
         league.get("currentSourceDataConcordant") is True,
         "UNSUPPORTED_SOURCE_CONTRACT")
    htime, stime = stamp(hto.get("asOf")), stamp(svhl.get("asOf"))
    need(svhl.get("sourceLeagueAsOf") == league.get("asOf"),
         "SVHL_ROSTER_AND_LEAGUE_SOURCE_NOT_BOUND")
    lbrave = [x for x in league["teams"] if x["sourceTeamId"] == BRAVE]
    sbrave = [x for x in svhl["teams"] if x["sourceTeamId"] == BRAVE]
    need(len(lbrave) == len(sbrave) == 1 and
         lbrave[0]["leagueName"] == sbrave[0]["name"] == "Braves HC" and
         lbrave[0]["divisionNow"] == sbrave[0]["division"] ==
             "The Cristillo Division" and
         sbrave[0]["rosterCount"] == len(sbrave[0]["players"]) and
         sbrave[0]["sourceSHA256"] and
         HEX.fullmatch(sbrave[0]["sourceSHA256"]),
         "BRAVES_LEAGUE_SOURCE_OR_DIVISION_CHANGED")
    need(all(type(hto.get(k)) is int and hto[k] >= 0 for k in
             ("teamGP", "teamGF", "teamGA")) and
         all(type(lbrave[0]["record"].get(k)) is int and
             lbrave[0]["record"][k] >= 0 for k in ("gp", "gf", "ga")),
         "TEAM_TOTALS_INVALID")
    hkeys = {}
    for player in hto["players"]:
        key = canonical_name(player.get("name"))
        need(key and all(type(player.get(f)) is int and player[f] >= 0
                         for f in STATS) and player["pts"] == player["g"] + player["a"],
             "HTO_PLAYER_SOURCE_INVALID")
        need(player.get("name") and key not in hkeys, "HTO_IDENTITY_DUPLICATE_NAME")
        hkeys[key] = player
    skeys, ids = {}, set()
    for player in sbrave[0]["players"]:
        key = canonical_name(player.get("name"))
        need(type(player.get("playerId")) is int and player["playerId"] > 0 and
             player["playerId"] not in ids and key and
             all(type(player.get(f)) is int and player[f] >= 0
                 for f in STATS + ("pim",)) and
             player.get("statStatus") in
                ("PUBLISHED_ARITHMETICALLY_CONSISTENT", "SOURCE_CONFLICT_HOLD") and
             player.get("profileUrl") ==
                (f"https://leagues.sportsvillage.ca/playerinfo.aspx?leagueid=570"
                 f"&teamid={BRAVE}&playerid={player['playerId']}&page_type=Adult"),
             "SVHL_BRAVES_PLAYER_OR_IDENTITY_INVALID")
        ids.add(player["playerId"])
        skeys.setdefault(key, []).append(player)
    matches = []
    missing = []
    for key, h in sorted(hkeys.items()):
        maybe = skeys.get(key, [])
        if len(maybe) != 1 or key.startswith("unknown"):
            missing.append({"htoName": h["name"], "status":
                "NO_UNAMBIGUOUS_EXACT_NAME_CANDIDATE",
                "possibleSvhlPlayerIds": [s["playerId"] for s in maybe]})
            continue
        s = maybe[0]
        qualified = s["statStatus"] == "PUBLISHED_ARITHMETICALLY_CONSISTENT"
        deltas = {k: s[k] - h[k] for k in STATS} if qualified else None
        matches.append({"matchStatus":"EXACT_UNIQUE_NAME_REVIEW_CANDIDATE_NOT_ID_VERIFIED",
            "htoName": h["name"], "svhlName": s["name"],
            "svhlPlayerId": s["playerId"], "sourceStatus": s["statStatus"],
            "hto": {k: h[k] for k in STATS},
            "svhl": {k: s[k] for k in STATS + ("pim",)},
            "svhlMinusHto": deltas,
            "differentValues": [k for k in STATS if deltas is not None and deltas[k] != 0],
            "identityConfirmed": False})
    matched_ids = {m["svhlPlayerId"] for m in matches}
    svhl_only = [{"playerId": s["playerId"], "name": s["name"],
                  "status": "NO_EXACT_UNIQUE_HTO_NAME_CANDIDATE"}
                  for s in sbrave[0]["players"] if s["playerId"] not in matched_ids]
    gaps = Counter(k for m in matches for k in m["differentValues"])
    capture_id = sha256(("brave-hto-svhl-shadow-v1|" +
        hashes["hto"] + "|" + hashes["svhl"] + "|" + hashes["league"]).encode()).hexdigest()
    return {"schema": REPORT,
        "status": "PRIVATE_DIFFERENCE_REVIEW_ONLY", "captureId": capture_id,
        "generatedAtUTC": datetime.now(timezone.utc).isoformat(),
        "sourceHashes": hashes, "htoAsOf": htime.isoformat(),
        "svhlRosterAsOf": stime.isoformat(),
        "sourceObservationTimeDifferenceHours":
            round((stime-htime).total_seconds()/3600, 2),
        "sourcePolicy": {"BravePlayerActuals": "HTO_AUTHORITATIVE",
            "BraveSVHL": "PRIVATE_SHADOW_OBSERVATION_NOT_ACCEPTED",
            "opponents": "SVHL_SOURCE_QUALIFIED_OTHER_TEAMS_ONLY"},
        "teamContext": {"hto": {"gp": hto["teamGP"], "gf": hto["teamGF"],
            "ga": hto["teamGA"]},
            "svhl": {k: lbrave[0]["record"][k] for k in ("gp", "gf", "ga")}},
        "sourceCounts": {"htoRows": len(hto["players"]),
            "svhlRows": len(sbrave[0]["players"]),
            "uniqueNameReviewCandidates": len(matches),
            "htoUnmatched": len(missing), "svhlUnmatched": len(svhl_only),
            "candidatePlayersWithNonzeroDifferences":
                sum(bool(m["differentValues"]) for m in matches),
            "differentFieldsByType": dict(gaps)},
        "nameReviewCandidates": matches, "unmatchedHTO": missing,
        "unmatchedSVHL": svhl_only,
        "htoPIMUnavailableInThisFeed": True,
        "manualCrossSystemIdentityReviewStillRequired": True,
        "sourceTimeDifferenceMayExplainSomeChanges": True,
        "automaticHTOCorrectionAuthorized": False,
        "publicStatisticsPublicationAuthorized": False,
        "linkedToOpponentsPublicFeed": False,
        "note": ("The HTO and SVHL team/player snapshots were captured at different "
                 "times. Deltas are observations, not necessarily official errors. "
                 "Matching normalized names are candidates only and do not prove "
                 "that different source player IDs describe the same person. "
                 "No missing stat is treated as zero.")}

def checked_specialty(profiles, svhl):
    if profiles is None:
        return []
    brave = next(t for t in svhl["teams"] if t["sourceTeamId"] == BRAVE)
    source = {p["playerId"]:p for p in brave["players"]}
    need(profiles.get("schema") ==
         "brave-hc-svhl-own-player-profiles-shadow/private-v1" and
         profiles.get("sourceRosterAsOf") == svhl.get("asOf") and
         profiles.get("officialSVHLTeamId") == BRAVE and
         profiles.get("htoIsAuthoritative") is True and
         profiles.get("publicPublicationAllowed") is False and
         len(profiles.get("profileRows",[])) == profiles.get("attempted") ==
         profiles.get("verified",0) + profiles.get("held",0) == len(source) and
         {p["playerId"] for p in profiles["profileRows"]} == set(source),
         "BRAVES_PRIVATE_PROFILE_COVERAGE_INVALID")
    verified=[]
    fields=("ppGoals","ppAssists","pkGoals","pkAssists",
            "gameWinningGoals","gameTyingGoals")
    for p in profiles["profileRows"]:
        need(p["status"] in ("PRIVATE_PROFILE_VERIFIED","PRIVATE_PROFILE_HELD"),
             "BRAVES_PRIVATE_PROFILE_STATUS_INVALID")
        if p["status"] != "PRIVATE_PROFILE_VERIFIED":
            continue
        expected=source[p["playerId"]]
        details=p.get("stats")
        need(HEX.fullmatch(p.get("sourceSHA256","")) is not None and
             p.get("sourceUrl") == expected["profileUrl"] and
             isinstance(details,dict) and
             all(type(details.get(k)) is int and details[k]>=0 for k in fields) and
             all(details.get(ext)==expected[k] for ext,k in (
                 ("GP","gp"),("G","g"),("A","a"),("PTS","pts"),("PIM","pim"))) and
             details["ppGoals"]+details["pkGoals"]<=details["G"] and
             details["ppAssists"]+details["pkAssists"]<=details["A"] and
             details["gameWinningGoals"]<=details["G"] and
             details["gameTyingGoals"]<=details["G"],
             "BRAVES_PRIVATE_PROFILE_SOURCE_CONFLICT")
        verified.append(p)
    return verified

def write_db(db, audit, hto, svhl, profiles=None):
    verified = checked_specialty(profiles,svhl)
    path = Path(db)
    need(path.name.startswith("svhl_opponent_players_") and
         path.suffix.lower() == ".sqlite" and path.is_file(),
         "SHARED_DATABASE_OR_UNAUTHORIZED_TARGET")
    connection = sqlite3.connect(str(path), timeout=12)
    try:
        connection.executescript("""CREATE TABLE IF NOT EXISTS brave_shadow_capture (
            capture_id TEXT PRIMARY KEY, hto_sha TEXT NOT NULL,
            svhl_sha TEXT NOT NULL, league_sha TEXT NOT NULL,
            hto_asof TEXT NOT NULL, svhl_asof TEXT NOT NULL,
            review_status TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS brave_shadow_hto_player (
            capture_id TEXT NOT NULL, name TEXT NOT NULL, name_key TEXT NOT NULL,
            gp INTEGER, g INTEGER, a INTEGER, pts INTEGER,
            PRIMARY KEY (capture_id,name_key));
            CREATE TABLE IF NOT EXISTS brave_shadow_svhl_player (
            capture_id TEXT NOT NULL, source_player_id INTEGER NOT NULL,
            source_name TEXT NOT NULL, source_page_sha TEXT NOT NULL,
            gp INTEGER, g INTEGER, a INTEGER, pts INTEGER, pim INTEGER,
            PRIMARY KEY (capture_id,source_player_id));
            CREATE TABLE IF NOT EXISTS brave_shadow_name_review (
            capture_id TEXT NOT NULL, hto_key TEXT NOT NULL,
            svhl_player_id INTEGER NOT NULL, identity_confirmed INTEGER NOT NULL,
            delta_gp INTEGER,delta_g INTEGER,delta_a INTEGER,delta_pts INTEGER,
            PRIMARY KEY (capture_id,hto_key,svhl_player_id));
            CREATE TABLE IF NOT EXISTS brave_shadow_specialty (
            capture_id TEXT NOT NULL, svhl_player_id INTEGER NOT NULL,
            profile_source_sha TEXT NOT NULL, observed_at_utc TEXT NOT NULL,
            pp_goals INTEGER, pp_assists INTEGER, pk_goals INTEGER, pk_assists INTEGER,
            game_winning_goals INTEGER, game_tying_goals INTEGER,
            PRIMARY KEY(capture_id,svhl_player_id,profile_source_sha));""")
        connection.execute("BEGIN IMMEDIATE")
        cap = audit["captureId"]
        connection.execute("INSERT OR IGNORE INTO brave_shadow_capture VALUES (?,?,?,?,?,?,?)",
                           (cap,audit["sourceHashes"]["hto"],audit["sourceHashes"]["svhl"],
                            audit["sourceHashes"]["league"],audit["htoAsOf"],
                            audit["svhlRosterAsOf"],audit["status"]))
        for p in hto["players"]:
            connection.execute("INSERT OR IGNORE INTO brave_shadow_hto_player VALUES (?,?,?,?,?,?,?)",
                (cap,p["name"],canonical_name(p["name"]),*(p[k] for k in STATS)))
        brave = next(t for t in svhl["teams"] if t["sourceTeamId"] == BRAVE)
        for p in brave["players"]:
            connection.execute("INSERT OR IGNORE INTO brave_shadow_svhl_player VALUES (?,?,?,?,?,?,?,?,?)",
                (cap,p["playerId"],p["name"],brave["sourceSHA256"],
                 *(p[k] for k in STATS + ("pim",))))
        for m in audit["nameReviewCandidates"]:
            delta = m["svhlMinusHto"]
            connection.execute("INSERT OR IGNORE INTO brave_shadow_name_review VALUES (?,?,?,?,?,?,?,?)",
                (cap,canonical_name(m["htoName"]),m["svhlPlayerId"],0,
                 *(delta[k] if delta is not None else None for k in STATS)))
        for p in verified:
            v=p["stats"]
            connection.execute("INSERT OR IGNORE INTO brave_shadow_specialty VALUES (?,?,?,?,?,?,?,?,?,?)",
                (cap,p["playerId"],p["sourceSHA256"],profiles["asOf"],
                 v["ppGoals"],v["ppAssists"],v["pkGoals"],v["pkAssists"],
                 v["gameWinningGoals"],v["gameTyingGoals"]))
        connection.commit()
        return {"sourceCaptures":connection.execute(
            "SELECT COUNT(*) FROM brave_shadow_capture").fetchone()[0],
            "htoPlayerRows":connection.execute(
            "SELECT COUNT(*) FROM brave_shadow_hto_player").fetchone()[0],
            "svhlPlayerRows":connection.execute(
            "SELECT COUNT(*) FROM brave_shadow_svhl_player").fetchone()[0],
            "candidateComparisonRows":connection.execute(
            "SELECT COUNT(*) FROM brave_shadow_name_review").fetchone()[0],
            "bravesPrivateSpecialtyRows":connection.execute(
            "SELECT COUNT(*) FROM brave_shadow_specialty").fetchone()[0]}
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

def main():
    p = ArgumentParser()
    for x in ("hto","svhl-roster","league","db","out"):
        p.add_argument("--"+x, type=Path,required=True)
    p.add_argument("--brave-profiles",type=Path)
    p.add_argument("--check-only",action="store_true")
    args = p.parse_args()
    try:
        h, hs = source(args.hto)
        s, ss = source(args.svhl_roster)
        l, ls = source(args.league)
        audit = examine(h,s,l,{"hto":hs,"svhl":ss,"league":ls})
        profiles = source(args.brave_profiles)[0] if args.brave_profiles else None
        checked_specialty(profiles,s)
        stats = {"databaseWritten":False} if args.check_only else write_db(args.db,audit,h,s,profiles)
        if not args.check_only:
            need(args.out.parent.is_dir() and
                 args.out.resolve() not in (args.hto.resolve(),
                 args.svhl_roster.resolve(),args.league.resolve()) and
                 "widgets" not in [x.lower() for x in args.out.parts],
                 "PRIVATE_RECEIPT_PATH_REQUIRED")
            temp=args.out.with_suffix(args.out.suffix+".tmp")
            temp.write_text(json.dumps(audit,ensure_ascii=False,indent=2)+"\n",
                            encoding="utf8")
            temp.replace(args.out)
        print(json.dumps({"state":audit["status"],**audit["sourceCounts"],**stats,
                          "publicModified":False,"htoModified":False}))
        return 0
    except (ShadowHold, OSError, KeyError, ValueError, TypeError, sqlite3.Error) as exc:
        print(json.dumps({"state":"HOLD","reason":str(exc)[:400],
                          "publicModified":False}), file=sys.stderr)
        return 2

if __name__ == "__main__":
    sys.exit(main())
