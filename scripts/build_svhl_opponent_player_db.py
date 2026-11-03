"""Build a private, append-only SQLite source ledger and privacy-minimal public scout.

Read only source-qualified SVHL Sunday player records from the existing roster
collector. Brave H.C. player statistics are ALWAYS HTO-authoritative and are
excluded, including historical records from source-labelled Brave teams.
No future attendance, positions, outcomes, player scoring or special teams
counts are inferred from the roster.
"""
from __future__ import annotations
from argparse import ArgumentParser
from collections import defaultdict
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
import json
import re
import sqlite3
import sys

SCHEMA = "brave-hc-opponent-player-intelligence/public-v1"
FULL = "brave-hc-svhl-full-season-team-capture/private-v1"
PROFILE = "brave-hc-opponent-profile-capture/private-v1"
ROSTER = "brave-hc-public-svhl-roster-seasons/v1"
LEAGUE = "brave-hc-league-intelligence/public-v1"
BRAVE = 13679
ADULT = {"Fazzari Partners", "The Cristillo Division", "Remax Division"}
BRAVE_NAMES = {"braves", "braveshc", "bravehc"}
HEX = re.compile(r"^[0-9a-f]{64}$")
FIELDS = ("gp", "g", "a", "pts", "pim")
SPECIAL_FIELDS = ("ppGoals", "ppAssists", "pkGoals", "pkAssists",
                  "gameWinningGoals", "gameTyingGoals")
class DatabaseHold(ValueError):
    pass

def need(ok, reason):
    if not ok:
        raise DatabaseHold("OPPONENT_PLAYER_DATABASE_HOLD:" + reason)

def normalized(name):
    return re.sub("[^a-z0-9]", "", str(name).lower())

def team_is_brave(t):
    return (t.get("leagueId") == 570 and t.get("sourceTeamId") == BRAVE or
            normalized(t.get("name", "")) in BRAVE_NAMES)

def source_url(lid, tid, pid):
    return (f"https://leagues.sportsvillage.ca/playerinfo.aspx?"
            f"leagueid={lid}&teamid={tid}&playerid={pid}&page_type=Adult")

def source_team_url(lid, tid):
    return (f"https://leagues.sportsvillage.ca/TeamInfo.aspx?"
            f"leagueid={lid}&teamid={tid}&page_type=Adult")

def as_date(iso):
    stamp = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    need(stamp.tzinfo is not None, "SOURCE_TIMESTAMP_WITHOUT_TIMEZONE")
    return stamp.astimezone(timezone.utc)

def validate_sources(league, roster, full, profiles):
    need(league.get("schema") == LEAGUE and league.get("leagueId") == 570 and
         league.get("currentSourceDataConcordant") is True and
         roster.get("schema") == ROSTER and roster.get("currentTeams") == 22 and
         full.get("schema") == FULL and full.get("sourceScope") ==
         "PUBLIC_SVHL_ADULT_SUNDAY_NON_VAHL_ONLY" and
         full.get("braveHTOAuthoritative") is True and
         full.get("originalWorkbookWritten") is False and
         full.get("sourceLeagueAsOf") == league.get("asOf") ==
         roster.get("sourceLeagueAsOf") and
         full.get("capturedAt") == roster.get("asOf"),
         "ROSTER_CAPTURE_OR_LEAGUE_SOURCE_MISMATCH")
    need(0 <= (as_date(full["capturedAt"]) -
                as_date(league["asOf"])).total_seconds() <= 86400,
         "ROSTER_NOT_CONTEMPORARY_WITH_LEAGUE")
    current = {t["sourceTeamId"]: t for t in league["teams"]
               if t["divisionNow"] in ADULT and t["sourceTeamId"] != BRAVE}
    need(len(current) == 21, "SUNDAY_OPPONENT_TEAM_COUNT_CHANGED")
    need(len(full["sourceTeams"]) == full["sourceTeamCount"] and
         full["sourceTeamCount"] >= 200 and
         full["playerSeasonRows"] ==
         sum(len(t["players"]) for t in full["sourceTeams"]),
         "ALL_SEASON_TEAM_SOURCE_COUNT_MISMATCH")
    current_ids = set()
    seen = set()
    for team in full["sourceTeams"]:
        lid, tid = team["leagueId"], team["sourceTeamId"]
        need(type(lid) is int and lid in (570, 547, 531, 512, 494, 476, 420, 375)
             and type(tid) is int and tid > 0 and
             team["division"] != "VAHL Division" and
             team["sourceUrl"] == source_team_url(lid, tid) and
             HEX.fullmatch(team["sourceSHA256"]) is not None and
             team["rosterCount"] == len(team["players"]), "SOURCE_TEAM_PROVENANCE_BAD")
        if lid == 570:
            need(tid == BRAVE or (tid in current and
                 team["name"] == current[tid]["leagueName"] and
                 team["division"] == current[tid]["divisionNow"]),
                 "CURRENT_OPPONENT_TEAM_SOURCE_CHANGED")
            if tid != BRAVE:
                current_ids.add(tid)
        for p in team["players"]:
            pid = p.get("playerId")
            need(type(pid) is int and pid > 0 and
                 (lid, tid, pid) not in seen and p.get("name") and
                 p.get("profileUrl") == source_url(lid, tid, pid) and
                 all(type(p.get(k)) is int and 0 <= p[k] <= 2000 for k in FIELDS) and
                 p.get("statStatus") in
                 ("PUBLISHED_ARITHMETICALLY_CONSISTENT", "SOURCE_CONFLICT_HOLD") and
                 (p["statStatus"] == "SOURCE_CONFLICT_HOLD" or p["g"] + p["a"] == p["pts"]),
                 "PLAYER_SEASON_SOURCE_ID_OR_ARITHMETIC_INVALID")
            seen.add((lid, tid, pid))
    need(current_ids == set(current), "OPPONENT_CURRENT_SOURCE_TEAM_COVERAGE_INCOMPLETE")
    rt = {t["sourceTeamId"]: t for t in roster["teams"]}
    need(len(rt) == 22 and all(x in rt for x in current), "PUBLIC_ROSTER_TEAM_COVERAGE_BAD")
    full_current = {t["sourceTeamId"]: t for t in full["sourceTeams"]
                    if t["leagueId"] == 570}
    for tid in current:
        a, b = full_current[tid], rt[tid]
        need(a["sourceSHA256"] == b["sourceSHA256"] and
             a["name"] == b["name"] and len(a["players"]) == len(b["players"]) and
             all(q["playerId"] == p["playerId"] and
                 all(q[k] == p[k] for k in FIELDS)
                 for p, q in zip(a["players"], b["players"])),
             "CURRENT_PUBLIC_ROSTER_NOT_FROM_SAME_CAPTURE")
    if profiles is not None:
        need(profiles.get("schema") == PROFILE and
             profiles.get("leagueId") == 570 and
             profiles.get("opponentTeams") == 21 and
             profiles.get("sourceLeagueAsOf") == league["asOf"] and
             profiles.get("sourceRosterAsOf") == roster["asOf"] and
             profiles.get("bravesSVHLPlayerStatsImported") is False and
             profiles.get("notAnAttendanceOrLineupProof") is True,
             "PROFILE_SOURCE_SCOPE_BAD")
        submitted = profiles.get("profileRows", [])
        expected = {(tid, p["playerId"]) for tid in current
                    for p in full_current[tid]["players"]}
        need(len(submitted) == profiles.get("playersAttempted") ==
             profiles.get("profilesVerified", 0) + profiles.get("profilesHeld", 0) and
             {(p["teamId"], p["playerId"]) for p in submitted} == expected,
             "PROFILE_PLAYER_CAPTURE_COVERAGE_BAD")
        for p in submitted:
            need(p.get("status") in
                 ("PROFILE_VERIFIED_AGAINST_ROSTER", "PROFILE_SOURCE_HOLD") and
                 p.get("profileUrl") == source_url(570, p["teamId"], p["playerId"]),
                 "PROFILE_LINK_NOT_ID_BOUND")
            if p["status"] == "PROFILE_VERIFIED_AGAINST_ROSTER":
                v = p.get("stats")
                original = next(x for x in full_current[p["teamId"]]["players"]
                                if x["playerId"] == p["playerId"])
                need(HEX.fullmatch(p.get("sourceSHA256", "")) is not None and
                     isinstance(v, dict) and
                     all(type(v.get(k)) is int and v[k] >= 0 for k in SPECIAL_FIELDS) and
                     all(v.get(src) == original[dst]
                         for src, dst in (("GP", "gp"), ("G", "g"),
                                          ("A", "a"), ("PTS", "pts"), ("PIM", "pim")),
                     "PROFILE_SPECIAL_STATS_NOT_ROSTER_RECONCILED")
    return current

def make_public(league, roster, full, profiles=None):
    current = validate_sources(league, roster, full, profiles)
    byplayer = defaultdict(list)
    for team in full["sourceTeams"]:
        if team_is_brave(team):
            continue
        for p in team["players"]:
            if team["leagueId"] == 570:
                continue
            byplayer[p["playerId"]].append({
                "leagueId": team["leagueId"], "season": team["season"],
                "teamId": team["sourceTeamId"], "teamName": team["name"],
                "division": team["division"], "nameAsPublished": p["name"],
                "gp": p["gp"], "g": p["g"], "a": p["a"],
                "pts": p["pts"], "pim": p["pim"],
                "sourceStatus": p["statStatus"],
                "sourcePageSHA256": team["sourceSHA256"],
                "profileUrl": p["profileUrl"]})
    extra = {(p["teamId"], p["playerId"]): p for p in
             (profiles or {}).get("profileRows", [])}
    teams = []
    special_count = 0
    historical_count = 0
    for source in roster["teams"]:
        tid = source["sourceTeamId"]
        if tid == BRAVE:
            continue
        need(tid in current, "PUBLIC_CURRENT_OPPONENT_NOT_QUALIFIED")
        players = []
        for p in source["players"]:
            pid = p["playerId"]
            history = sorted(byplayer[pid],
                key=lambda x: (-x["leagueId"], x["teamId"]))
            # Only same-source player ID is a candidate association.
            # Name changes across official pages remain explicitly unverified.
            for h in history:
                h["nameMatch"] = normalized(h["nameAsPublished"]) == normalized(p["name"])
            historical_count += len(history)
            detail = extra.get((tid, pid))
            verified = bool(detail and detail["status"] == "PROFILE_VERIFIED_AGAINST_ROSTER")
            if verified:
                special_count += 1
            ok = p["statStatus"] == "PUBLISHED_ARITHMETICALLY_CONSISTENT"
            players.append({
                "playerId": pid, "name": p["name"], "jersey": p["jersey"],
                "positionAsPublished": p["positionAsPublished"],
                "gp": p["gp"], "g": p["g"], "a": p["a"],
                "pts": p["pts"], "pim": p["pim"],
                "publishedPtsPerGP": round(p["pts"]/p["gp"], 3)
                    if ok and p["gp"] else None,
                "sourceStatus": p["statStatus"],
                "sourceWarnings": p["statWarnings"],
                "profileUrl": p["profileUrl"],
                "specialtyStats": {k: detail["stats"][k] for k in SPECIAL_FIELDS}
                    if verified else None,
                "specialtyStatus": "PROFILE_VERIFIED" if verified else
                    "PROFILE_HELD" if detail else "NOT_YET_CAPTURED",
                "priorSeasonTeamObservations": history,
                "priorSourceScope": "SAME_SVHL_PLAYER_ID_NOT_A_GAME_ATTENDANCE_PROOF",
                "nextGameAttendanceVerified": False,
            })
        teams.append({
            "sourceTeamId": tid,
            "name": source["name"],
            "division": source["division"],
            "sourceRosterPageSHA256": source["sourceSHA256"],
            "sourceUrl": source["sourceUrl"],
            "playerCount": len(players),
            "players": players,
        })
    need(len(teams) == 21 and sum(x["playerCount"] for x in teams) ==
         roster["currentPlayerObservations"] -
         next(t["rosterCount"] for t in roster["teams"]
              if t["sourceTeamId"] == BRAVE), "PUBLIC_OPPONENT_PLAYER_COUNT_DRIFT")
    return {
        "schema": SCHEMA,
        "status": "SOURCE_QUALIFIED_DESCRIPTIVE_OPPONENT_PLAYER_INTELLIGENCE",
        "capturedAt": roster["asOf"],
        "leagueSourceAsOf": league["asOf"],
        "sourceLeagueId": 570,
        "sourceAuthority": {"braveHC": "HTO_ONLY",
                            "opponents": "SVHL_PUBLIC_TEAMINFO_AND_PLAYERINFO",
                            "historical": "SVHL_SAME_OFFICIAL_PLAYER_ID_PER_SEASON_TEAM"},
        "teamCount": 21, "playerCount": sum(t["playerCount"] for t in teams),
        "historicalSeasonTeamSources": full["sourceTeamCount"],
        "linkedPriorPlayerSeasonTeamObservations": historical_count,
        "currentSpecialtyProfilesVerified": special_count,
        "svhlBravePlayerStatsPublished": False,
        "VAHLExcluded": True,
        "completePlayerGameAttendanceVerified": False,
        "confidenceNotice": ("League-reported season totals, not individually verified "
            "game attendance or lineup confirmation. Earlier same-ID observations "
            "can include different teams in one season and are not additive by "
            "default. Player stats may be incomplete or corrected later. "
            "Special teams abbreviations PPG and PPA mean power-play goals and "
            "assists, not points per game. No opponent win probability."),
        "teams": sorted(teams, key=lambda t: t["name"]),
    }

def install_sqlite(db, full, profiles, public):
    db = Path(db)
    need(db.suffix.lower() == ".sqlite" and db.parent.is_dir(),
         "SQLITE_TARGET_MUST_BE_PRIVATE_EXISTING_FOLDER")
    # Only write new private SQLite; do not point this routine at HockeyOS's
    # existing official or accepted shared statistics database.
    need(db.name.startswith("svhl_opponent_players_"),
         "PROTECTED_SHARED_DATABASE_PATH_REFUSED")
    con = sqlite3.connect(str(db), timeout=15)
    try:
        con.execute("BEGIN IMMEDIATE")
        con.execute("""CREATE TABLE IF NOT EXISTS player_season_observations (
            league_id INTEGER NOT NULL, team_id INTEGER NOT NULL,
            player_id INTEGER NOT NULL, source_sha256 TEXT NOT NULL,
            seen_at_utc TEXT NOT NULL, season TEXT NOT NULL, team_name TEXT NOT NULL,
            division TEXT NOT NULL, player_name TEXT NOT NULL,
            jersey TEXT, position_published TEXT, gp INTEGER, g INTEGER,
            a INTEGER, pts INTEGER, pim INTEGER, source_status TEXT,
            profile_url TEXT NOT NULL,
            PRIMARY KEY (league_id, team_id, player_id, source_sha256))""")
        con.execute("""CREATE TABLE IF NOT EXISTS specialty_observations (
            league_id INTEGER NOT NULL, team_id INTEGER NOT NULL,
            player_id INTEGER NOT NULL, source_sha256 TEXT NOT NULL,
            seen_at_utc TEXT NOT NULL, pp_goals INTEGER, pp_assists INTEGER,
            pk_goals INTEGER, pk_assists INTEGER, gwg INTEGER, gtg INTEGER,
            PRIMARY KEY (league_id, team_id, player_id, source_sha256))""")
        con.execute("""CREATE TABLE IF NOT EXISTS capture_runs (
            source_hash TEXT PRIMARY KEY, captured_at_utc TEXT NOT NULL,
            league_id INTEGER NOT NULL, source_team_count INTEGER NOT NULL,
            source_player_rows INTEGER NOT NULL, bravo_hto_only INTEGER NOT NULL)""")
        con.execute("CREATE INDEX IF NOT EXISTS idx_player_season_identity ON "
                    "player_season_observations(player_id, league_id, team_id)")
        con.execute("CREATE INDEX IF NOT EXISTS idx_player_team_season ON "
                    "player_season_observations(team_id, league_id)")
        content_sha = sha256(json.dumps(full, sort_keys=True,
            ensure_ascii=False).encode("utf-8")).hexdigest()
        con.execute("INSERT OR IGNORE INTO capture_runs VALUES (?,?,?,?,?,?)",
            (content_sha, full["capturedAt"], 570, full["sourceTeamCount"],
             full["playerSeasonRows"], 1))
        records = 0
        for team in full["sourceTeams"]:
            if team_is_brave(team):
                continue
            for p in team["players"]:
                con.execute("INSERT OR IGNORE INTO player_season_observations VALUES "
                    "(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    (team["leagueId"], team["sourceTeamId"], p["playerId"],
                     team["sourceSHA256"], full["capturedAt"], team["season"],
                     team["name"], team["division"], p["name"], p["jersey"],
                     p["positionAsPublished"], p["gp"], p["g"], p["a"], p["pts"],
                     p["pim"], p["statStatus"], p["profileUrl"]))
                records += 1
        for item in (profiles or {}).get("profileRows", []):
            if item["status"] != "PROFILE_VERIFIED_AGAINST_ROSTER":
                continue
            st = item["stats"]
            con.execute("INSERT OR IGNORE INTO specialty_observations VALUES "
                "(?,?,?,?,?,?,?,?,?,?,?)",
                (570, item["teamId"], item["playerId"], item["sourceSHA256"],
                 profiles["asOf"], *(st[k] for k in SPECIAL_FIELDS)))
        con.commit()
        return {"sourceSnapshotSHA256": content_sha, "inputSeasonPlayerRows": records,
                "storedSeasonObservations": con.execute(
                    "SELECT COUNT(*) FROM player_season_observations").fetchone()[0],
                "storedSpecialtyObservations": con.execute(
                    "SELECT COUNT(*) FROM specialty_observations").fetchone()[0],
                "storedCaptureRuns": con.execute(
                    "SELECT COUNT(*) FROM capture_runs").fetchone()[0],
                "publicOpponentPlayers": public["playerCount"]}
    except Exception:
        con.rollback()
        raise
    finally:
        con.close()

def main():
    p = ArgumentParser()
    for key in ("league", "roster", "full", "database", "public-out"):
        p.add_argument("--" + key, type=Path, required=True)
    p.add_argument("--profiles", type=Path)
    p.add_argument("--check-only", action="store_true")
    args = p.parse_args()
    try:
        read = lambda f: json.loads(f.read_text(encoding="utf-8-sig"))
        league, roster, full = read(args.league), read(args.roster), read(args.full)
        profiles = read(args.profiles) if args.profiles else None
        public = make_public(league, roster, full, profiles)
        if not args.check_only:
            need(args.public_out.parent.is_dir(), "OUTPUT_FOLDER_NOT_FOUND")
            state = install_sqlite(args.database, full, profiles, public)
            target = args.public_out
            temp = target.with_suffix(target.suffix + ".tmp")
            temp.write_text(json.dumps(public, ensure_ascii=False,
                             indent=2) + "\n", encoding="utf8")
            temp.replace(target)
        else:
            state = {"dbWritten": False, "publicWritten": False}
        print(json.dumps({"status": "OPPONENT_PLAYER_SOURCE_PASS",
             "opponents": public["teamCount"], "players": public["playerCount"],
             "linkedPriorRows": public["linkedPriorPlayerSeasonTeamObservations"],
             "specialtyVerified": public["currentSpecialtyProfilesVerified"],
             **state}))
        return 0
    except (DatabaseHold, ValueError, KeyError, OSError, TypeError,
            sqlite3.Error) as exc:
        print(json.dumps({"status": "HOLD", "reason": str(exc)[:500]}),
              file=sys.stderr)
        return 2

if __name__ == "__main__":
    sys.exit(main())
