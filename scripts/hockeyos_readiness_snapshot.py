"""Read-only HockeyOS source readiness telemetry.

This does not authorize publication or change the HTO, original workbook,
scheduled task, Git source, or named/private attendance data. Source mismatch
must remain a HOLD even when the model's self-reported flags say current.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any

from check_svhl_league_intelligence import verify as verify_league
from check_svhl_roster_intelligence import verify as verify_roster

REQUIRED = (
    "league-intelligence.json", "svhl-roster-intelligence.json",
    "projection.json", "hockeyos-team-dispersion-v365.json",
    "game-centre-lineup-public.json", "countdown.json",
    "opponent-intelligence.json",
)
SCHEMA = "hockeyos-source-readiness-observation/v1"


def parsedate(v: Any) -> datetime:
    if not isinstance(v, str):
        raise ValueError("SOURCE_TIMESTAMP_NOT_STRING")
    dt = datetime.fromisoformat(v.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        raise ValueError("SOURCE_TIMESTAMP_UNZONED")
    return dt.astimezone(timezone.utc)


def stamp(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def checked(key: str, state: str, code: str, **evidence: Any) -> dict:
    return {"key": key, "state": state, "code": code, "evidence": evidence}


def evidence_file(directory: Path, relative: str, wanted: str) -> bool:
    if not isinstance(relative, str) or not relative.startswith("./assets/lineups/"):
        return False
    resolved = (directory / relative).resolve()
    try:
        resolved.relative_to(directory.resolve())
    except ValueError:
        return False
    if not resolved.is_file() or not isinstance(wanted, str) or len(wanted) != 64:
        return False
    if resolved.stat().st_size > 12_000_000:
        return False
    return hashlib.sha256(resolved.read_bytes()).hexdigest() == wanted


def audit(sources: dict[str, dict], directory: Path, now: datetime) -> dict:
    now = now.astimezone(timezone.utc)
    checks: list[dict] = []
    league = sources["league-intelligence.json"]
    roster = sources["svhl-roster-intelligence.json"]
    projection = sources["projection.json"]
    dispersion = sources["hockeyos-team-dispersion-v365.json"]
    lineup = sources["game-centre-lineup-public.json"]
    fixtures = sources["countdown.json"]
    opponents = sources["opponent-intelligence.json"]

    try:
        result = verify_league(league, opponents)
        checks.append(checked("league", "PASS", "LEAGUE_SOURCE_VALIDATED",
                              teams=result["teams"], divisions=result["divisions"],
                              pairedGames=result["pairedGames"]))
    except (KeyError, TypeError, ValueError, AssertionError) as exc:
        checks.append(checked("league", "HOLD", "LEAGUE_VALIDATION_FAILED",
                              reason=type(exc).__name__))

    try:
        dates = {
            "league": parsedate(league.get("asOf")),
            "rosterSource": parsedate(roster.get("sourceLeagueAsOf")),
            "rosterObserved": parsedate(roster.get("asOf")),
        }
        days = round((dates["league"]-dates["rosterSource"]).total_seconds()/86400, 2)
    except (TypeError, ValueError) as exc:
        days = None
    try:
        result = verify_roster(league, roster)
        checks.append(checked("roster", "PASS", "ROSTER_SOURCE_VALIDATED",
                              teams=result["teams"], sourceAgeDays=days))
    except (KeyError, TypeError, ValueError, AssertionError) as exc:
        text = str(exc)
        known = "ROSTER_LEAGUE_SOURCE_STALE_OR_FUTURE"
        code = known if known in text else "ROSTER_SOURCE_NOT_QUALIFIED"
        checks.append(checked("roster", "HOLD", code, sourceAgeDays=days))

    inputs = projection.get("sourceInputs") or {}
    n1, n2, n3 = (inputs.get(k) for k in
                  ("workbookRecordedTeamGP", "htoRecordedTeamGP", "verifiedHTOBoxscoreGP"))
    equal_games = (all(type(v) is int and v > 0 for v in (n1,n2,n3))
                   and n1 == n2 == n3)
    if not equal_games:
        checks.append(checked("projection", "HOLD", "HTO_WORKBOOK_GAME_COVERAGE_MISMATCH",
                              workbookGames=n1, htoGames=n2, verifiedBoxscoreGames=n3))
    else:
        try:
            recent = 0 <= (now-parsedate(projection.get("htoreadback"))).total_seconds() <= 10*86400
        except (TypeError, ValueError):
            recent = False
        model = (projection.get("schema")=="brave-hc-workbook-projection/v1"
                 and projection.get("modelCurrent") is True
                 and projection.get("projectionComplete") is True
                 and projection.get("modelParity",{}).get("mismatches")==0
                 and recent)
        checks.append(checked("projection", "REVIEW" if model else "HOLD",
             "MODEL_REQUIRES_INDEPENDENT_PUBLICATION_REVIEW" if model
             else "MODEL_CURRENT_PARITY_OR_FRESHNESS_NOT_VERIFIED",
             workbookGames=n1, htoGames=n2, verifiedBoxscoreGames=n3))

    snapshot = (dispersion.get("model") or {}).get("projectionExportedAt")
    export = projection.get("exportedAt")
    matching = (isinstance(snapshot,str) and snapshot==export
                and dispersion.get("schema")=="hockeyos-team-career-relative-dispersion/v1")
    checks.append(checked("dispersion", "REVIEW" if matching else "HOLD",
         "SOURCE_MATCH_REQUIRES_ADAPTIVE_MODEL_REVIEW" if matching
         else "DISPERSION_PROJECTION_SNAPSHOT_MISMATCH",
         modelExport=export, dispersionSourceExport=snapshot,
         referenceStatus=dispersion.get("status")))

    entry = lineup.get("publishedWorkingCard")
    games = fixtures.get("games") if isinstance(fixtures,dict) else None
    valid = False
    if isinstance(entry, dict) and isinstance(games,list):
        match = next((x for x in games if x.get("id")==entry.get("fixtureId")),None)
        try:
            unexpired = now < parsedate(entry.get("expiresAt"))
            valid = bool(match and entry.get("state")=="PUBLIC_WORKING_LINEUP"
                 and entry.get("authorizedForPublic") is True
                 and entry.get("goalieConfirmed") is False
                 and lineup.get("approved") is None
                 and lineup.get("weeklyAutoPublishEnabled") is False
                 and isinstance(lineup.get("workingCard"), dict)
                 and lineup["workingCard"].get("fixtureId")==entry.get("fixtureId")
                 and lineup["workingCard"].get("sha256")==entry.get("sourceSha256")
                 and lineup.get("privateWhatsAppPollDataPublished") is False
                 and match.get("gameDate")==entry.get("gameDate")
                 and match.get("puckDropUTC")==entry.get("puckDropUTC")
                 and match.get("rolloverAtUTC")==entry.get("expiresAt")
                 and entry.get("sourceRange")=="Lines!G5:J16"
                 and unexpired
                 and evidence_file(directory,entry.get("url"),entry.get("sha256"))
                 and evidence_file(directory,entry.get("previewImage"),entry.get("previewSHA256")))
        except (KeyError, TypeError, ValueError):
            valid = False
    checks.append(checked("lineup", "PASS" if valid else "HOLD",
         "PUBLISHED_TENTATIVE_CARD_VERIFIED" if valid else "WORKING_CARD_SOURCE_OR_EXPIRY_NOT_VERIFIED",
         fixtureId=entry.get("fixtureId") if isinstance(entry,dict) else None,
         goalieConfirmed=entry.get("goalieConfirmed") if isinstance(entry,dict) else None,
         officialLineupApproved=lineup.get("approved") is not None))

    held = [x["key"] for x in checks if x["state"]=="HOLD"]
    review = [x["key"] for x in checks if x["state"]=="REVIEW"]
    return {"schema":SCHEMA,"observedAtUTC":stamp(now),
            "status":"HOLD" if held else "REVIEW" if review else "PASS",
            "checked":len(checks),"passCount":sum(x["state"]=="PASS" for x in checks),
            "holdCount":len(held),"reviewCount":len(review),
            "held":held,"needsReview":review,"checks":checks,
            "notApprovedForPublicForecast":True,
            "scope":"READ_ONLY_PUBLIC_SOURCE_EVIDENCE_NOT_A_MODEL_RELEASE"}


def run(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    p.add_argument("--as-of", type=str, default=None)
    p.add_argument("--strict", action="store_true",
                   help="Exit 2 whenever source readiness is not PASS")
    args = p.parse_args(argv)
    widgets = (args.root/"widgets").resolve()
    try:
        sources = {name:json.loads((widgets/name).read_text("utf-8-sig")) for name in REQUIRED}
        if any(not isinstance(item,dict) for item in sources.values()):
            raise TypeError("SOURCE_JSON_NOT_OBJECT")
        now = parsedate(args.as_of) if args.as_of else datetime.now(timezone.utc)
        result = audit(sources,widgets,now)
    except (OSError, KeyError, ValueError, TypeError) as exc:
        result = {"schema":SCHEMA,"status":"HOLD","checked":0,
                  "code":"REQUIRED_SOURCE_READ_FAILED",
                  "details":type(exc).__name__,
                  "notApprovedForPublicForecast":True}
    print(json.dumps(result,sort_keys=True,ensure_ascii=False))
    return 2 if args.strict and result["status"]!="PASS" else 0


if __name__ == "__main__":
    raise SystemExit(run())
