"""Bounded, read-only enrichment of official SVHL opponent player profiles.

HTO remains the source for Brave H.C. Never obtain Brave H.C. player numbers
from SVHL. Only 21 other teams in the admitted adult Sunday scope are read.
The profile's "PPG" means power-play GOALS, not points per game.
"""
from __future__ import annotations
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from hashlib import sha256
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from urllib.request import Request, urlopen
from argparse import ArgumentParser
import json
import re
import sys
import time

SCHEMA = "brave-hc-opponent-profile-capture/private-v1"
LEAGUE = 570
BRAVE_TEAM_ID = 13679
ADULT = {"Fazzari Partners", "The Cristillo Division", "Remax Division"}
HEADERS = ("GP", "G", "A", "PTS", "PIM", "PPG", "PPA", "PKG", "PKA", "GWG", "GTG")
SPECIAL = {"ppGoals": "PPG", "ppAssists": "PPA", "pkGoals": "PKG",
           "pkAssists": "PKA", "gameWinningGoals": "GWG", "gameTyingGoals": "GTG"}
TABLE_ID = "ctl00_MainContent_GridViewStatsOther"

class ProfileHold(ValueError):
    pass

def need(condition, reason):
    if not condition:
        raise ProfileHold("OPPONENT_PROFILE_HOLD:" + reason)

def approved_url(team_id, player_id):
    need(type(team_id) is int and team_id > 0 and team_id != BRAVE_TEAM_ID
         and type(player_id) is int and player_id > 0, "BRAVE_OR_BAD_PLAYER_ID")
    return ("https://leagues.sportsvillage.ca/playerinfo.aspx?"
            f"leagueid={LEAGUE}&teamid={team_id}&playerid={player_id}&page_type=Adult")

class ProfileTable(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth = 0
        self.active = False
        self.rows = []
        self.row = None
        self.cell = None
    def handle_starttag(self, tag, attrs):
        if tag == "table":
            a = dict(attrs)
            if self.active:
                self.depth += 1
            elif a.get("id") == TABLE_ID:
                self.active = True
                self.depth = 1
        elif self.active:
            if tag == "tr":
                self.row = []
            if tag in ("td", "th") and self.row is not None:
                self.cell = []
    def handle_data(self, data):
        if self.active and self.cell is not None:
            self.cell.append(data)
    def handle_endtag(self, tag):
        if not self.active:
            return
        if tag in ("td", "th") and self.cell is not None and self.row is not None:
            self.row.append(" ".join("".join(self.cell).split()))
            self.cell = None
        if tag == "tr" and self.row is not None:
            if self.row:
                self.rows.append(self.row)
            self.row = None
        if tag == "table":
            self.depth -= 1
            if self.depth == 0:
                self.active = False

def parse(html, expected):
    parser = ProfileTable()
    parser.feed(html)
    rows = parser.rows
    need(len(rows) == 2 and tuple(x.upper() for x in rows[0]) == HEADERS,
         "PROFILE_STAT_TABLE_SCHEMA_CHANGED")
    need(len(rows[1]) == len(HEADERS), "PROFILE_COLUMN_COUNT_CHANGED")
    need(all(re.fullmatch(r"\d+", str(v)) for v in rows[1]), "NONINTEGER_PROFILE_STAT")
    values = {k: int(v) for k, v in zip(HEADERS, rows[1])}
    need(all(0 <= v <= 2000 for v in values.values()), "PROFILE_STAT_OUT_OF_RANGE")
    # The roster and player page are independently captured and can disagree
    # during a source refresh. Do NOT replace roster data on that basis.
    expected_base = {"GP": expected["gp"], "G": expected["g"],
                     "A": expected["a"], "PTS": expected["pts"], "PIM": expected["pim"]}
    need({k: values[k] for k in expected_base} == expected_base,
         "PROFILE_CURRENT_ROSTER_CAPTURE_DISAGREES")
    need(values["G"] + values["A"] == values["PTS"],
         "PUBLISHED_POINTS_ARITHMETIC_CONFLICT")
    need(values["PPG"] <= values["G"] and values["PKG"] <= values["G"] and
         values["PPA"] <= values["A"] and values["PKA"] <= values["A"] and
         values["GWG"] <= values["G"] and values["GTG"] <= values["G"],
         "SPECIAL_TEAMS_OR_WINNING_COUNT_CONFLICT")
    return {**{k: values[k] for k in ("GP", "G", "A", "PTS", "PIM")},
            **{target: values[source] for target, source in SPECIAL.items()}}

def fetch(url):
    u = urlparse(url)
    q = parse_qs(u.query)
    need(u.scheme == "https" and u.hostname == "leagues.sportsvillage.ca" and
         u.path.lower() == "/playerinfo.aspx" and
         q.get("leagueid") == [str(LEAGUE)] and
         q.get("page_type") == ["Adult"] and
         len(q.get("teamid", [])) == 1 and
         len(q.get("playerid", [])) == 1 and
         q["teamid"][0].isdigit() and q["playerid"][0].isdigit() and
         int(q["teamid"][0]) != BRAVE_TEAM_ID,
         "UNAPPROVED_PROFILE_SOURCE_URL")
    request = Request(url, headers={"User-Agent":
        "Mozilla/5.0 (BraveHC-HockeyOS source-verified opponent scout)"})
    with urlopen(request, timeout=18) as response:
        need(response.status == 200, "SOURCE_HTTP_ERROR")
        raw = response.read(90001)
    need(1000 <= len(raw) <= 90000, "PROFILE_SOURCE_SIZE_INVALID")
    return raw.decode("utf-8", errors="replace"), sha256(raw).hexdigest()

def collect(league, roster, *, max_workers=3, max_profiles=400, getter=fetch):
    need(league.get("schema") == "brave-hc-league-intelligence/public-v1" and
         league.get("leagueId") == LEAGUE and
         league.get("currentSourceDataConcordant") is True and
         roster.get("schema") == "brave-hc-public-svhl-roster-seasons/v1" and
         roster.get("currentTeams") == 22 and
         roster.get("sourceLeagueId") == LEAGUE, "INADMISSIBLE_SOURCE_DOCS")
    teams = {t["sourceTeamId"]: t for t in league["teams"]
             if t["divisionNow"] in ADULT and t["sourceTeamId"] != BRAVE_TEAM_ID}
    jobs = []
    for team in roster["teams"]:
        tid = team["sourceTeamId"]
        if tid == BRAVE_TEAM_ID:
            continue
        need(tid in teams and team["name"] == teams[tid]["leagueName"] and
             team["division"] == teams[tid]["divisionNow"],
             "OPPONENT_ROSTER_DIVISION_DRIFT")
        for player in team["players"]:
            jobs.append((tid, team["name"], player))
    need(len(teams) == 21 and len(jobs) <= max_profiles and
         len({(t, p["playerId"]) for t, _, p in jobs}) == len(jobs),
         "OPPONENT_PLAYER_COVERAGE_OR_CAPACITY_INVALID")
    def worker(job):
        tid, name, p = job
        url = approved_url(tid, p["playerId"])
        try:
            html, digest = getter(url)
            values = parse(html, p)
            return {"teamId": tid, "playerId": p["playerId"],
                    "team": name, "profileUrl": url, "sourceSHA256": digest,
                    "status": "PROFILE_VERIFIED_AGAINST_ROSTER",
                    "stats": values}
        except (ProfileHold, OSError, ValueError, TimeoutError) as exc:
            return {"teamId": tid, "playerId": p["playerId"],
                    "team": name, "profileUrl": url,
                    "status": "PROFILE_SOURCE_HOLD", "reason": str(exc)[:150],
                    "stats": None}
    captured = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(worker, item) for item in jobs]
        for future in as_completed(futures):
            captured.append(future.result())
    captured.sort(key=lambda x: (x["teamId"], x["playerId"]))
    return {"schema": SCHEMA, "asOf": datetime.now(timezone.utc).isoformat(),
            "leagueId": LEAGUE, "sourceLeagueAsOf": league["asOf"],
            "sourceRosterAsOf": roster["asOf"],
            "opponentTeams": len(teams), "playersAttempted": len(jobs),
            "profilesVerified": sum(p["status"] == "PROFILE_VERIFIED_AGAINST_ROSTER"
                                    for p in captured),
            "profilesHeld": sum(p["status"] != "PROFILE_VERIFIED_AGAINST_ROSTER"
                                for p in captured),
            "bravesSVHLPlayerStatsImported": False,
            "sourceAuthority": "SVHL_PUBLIC_PLAYERINFO_PROFILE_SNAPSHOT",
            "notAnAttendanceOrLineupProof": True,
            "profileRows": captured}

def main():
    p = ArgumentParser()
    p.add_argument("--league", required=True, type=Path)
    p.add_argument("--roster", required=True, type=Path)
    p.add_argument("--out", required=True, type=Path)
    p.add_argument("--max-profiles", type=int, default=400)
    args = p.parse_args()
    try:
        league = json.loads(args.league.read_text(encoding="utf-8-sig"))
        roster = json.loads(args.roster.read_text(encoding="utf-8-sig"))
        report = collect(league, roster, max_profiles=args.max_profiles)
        need(args.out.parent.is_dir(), "PRIVATE_OUTPUT_DIR_NOT_READY")
        temp = args.out.with_suffix(args.out.suffix + ".tmp")
        temp.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n",
                        encoding="utf-8")
        temp.replace(args.out)
        print(json.dumps({"status": "SVHL_OPPONENT_PROFILES_PRIVATE_CAPTURED",
            "players": report["playersAttempted"], "verified": report["profilesVerified"],
            "held": report["profilesHeld"], "bravesExcluded": True,
            "output": str(args.out)}))
        return 0
    except (ProfileHold, OSError, ValueError, TypeError, KeyError) as exc:
        print(json.dumps({"status": "HOLD", "reason": str(exc)[:350]}),
              file=sys.stderr)
        return 2

if __name__ == "__main__":
    sys.exit(main())
