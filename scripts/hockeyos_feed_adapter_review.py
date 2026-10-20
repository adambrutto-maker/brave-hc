"""Proposed consumer contract adapter; GET-only review, never a production writer."""
import copy
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit, parse_qsl
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
import hockeyos_discovery_review as discovery
candidate=discovery.candidate
review=discovery.review
MAX_AGE_SECONDS=7200
MAX_OBSERVATION_SECONDS=600


def timestamp(value):
    if not isinstance(value,str): raise review.ReviewHold("MISSING_OBSERVATION_TIMESTAMP")
    try: parsed=datetime.fromisoformat(value.replace("Z","+00:00"))
    except ValueError: raise review.ReviewHold("INVALID_OBSERVATION_TIMESTAMP")
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise review.ReviewHold("NAIVE_OBSERVATION_TIMESTAMP")
    return parsed.astimezone(timezone.utc)


def observe_discovery(fetch=review.fetch_html, clock=lambda:datetime.now(timezone.utc)):
    """Capture timestamps around actual GETs and retain parsed source evidence."""
    started=clock().isoformat()
    source=fetch(candidate.SCORE_URL)
    scores_provenance=discovery.validate_scores_content(source)
    discovered=discovery.parse_boxscore_links(source)
    unknown=set(discovered)-set(candidate.GAME_MAP)
    if unknown: raise review.ReviewHold("UNMAPPED_COMPLETED_GAMES:"+",".join(map(str,sorted(unknown))))
    games,sk,go,season_provenance=candidate.collect_sources(fetch=fetch)
    completed=clock().isoformat()
    plan=discovery.reconciliation_plan(discovered,candidate.GAME_MAP,discovery.season_team_games(sk))
    payload=candidate.build_candidate(games,sk,go,season_provenance)
    verified=[g["htoGameId"] for g in payload["games"]]
    if len(verified)!=len(set(verified)) or set(verified)!=set(plan["gameIdsToReverify"]):
        raise review.ReviewHold("REVERIFIED_GAME_COVERAGE_MISMATCH")
    plan["coverageVerified"]=True
    return {"state":"DISCOVERY_REVIEW_SOURCE_COVERAGE_PASS",
            "scoresProvenance":scores_provenance,"discovery":plan,"candidate":payload,
            "sourceContentIdentityVerified":True,"seasonProvenance":season_provenance,
            "gameProvenance":{str(g["htoGameId"]):g["contentProvenance"] for g in games},
            "observationStartedAt":started,"observationCompletedAt":completed,
            "productionAcceptance":False,"releaseState":"REVIEW_ONLY_NOT_PRODUCTION_ACCEPTANCE"}


def adapt_review(envelope, now=None):
    """Pure, bounded adapter. Caller supplies actual observed source envelope."""
    now=datetime.now(timezone.utc) if now is None else now
    if not isinstance(now,datetime) or now.tzinfo is None:
        raise review.ReviewHold("INVALID_REVIEW_CLOCK")
    started=timestamp(envelope.get("observationStartedAt"))
    completed=timestamp(envelope.get("observationCompletedAt"))
    if started>completed or completed>now or started>now:
        raise review.ReviewHold("FUTURE_OR_REVERSED_OBSERVATION")
    if (now-started).total_seconds()>MAX_AGE_SECONDS:
        raise review.ReviewHold("STALE_SOURCE_OBSERVATION")
    if (completed-started).total_seconds()>MAX_OBSERVATION_SECONDS:
        raise review.ReviewHold("OBSERVATION_WINDOW_TOO_LONG")
    if (envelope.get("state")!="DISCOVERY_REVIEW_SOURCE_COVERAGE_PASS" or
        envelope.get("productionAcceptance") is not False or
        envelope.get("releaseState")!="REVIEW_ONLY_NOT_PRODUCTION_ACCEPTANCE" or
        envelope.get("sourceContentIdentityVerified") is not True):
        raise review.ReviewHold("UNVERIFIED_DISCOVERY_STATE")
    plan=envelope["discovery"]; payload=envelope["candidate"]
    if (plan.get("coverageVerified") is not True or plan.get("allGamesDiscovered") is not True or
        plan.get("requiresAllBoxscoresReverified") is not True or
        plan.get("mappingPolicy")!="EXPLICIT_AUDITED_MAP_ONLY" or
        plan.get("retainedAuditedGameIds")!=[] or plan.get("productionAcceptance") is not False):
        raise review.ReviewHold("DISCOVERY_COVERAGE_NOT_ACCEPTABLE")
    expected=set(candidate.GAME_MAP)
    for field in ("discoveredGameIds","gameIdsToReverify"):
        values=plan.get(field)
        if not isinstance(values,list) or any(not isinstance(v,int) or isinstance(v,bool) for v in values) or len(values)!=len(set(values)) or set(values)!=expected:
            raise review.ReviewHold("DISCOVERY_GAME_SET_MISMATCH")
    if plan.get("seasonTeamGP")!=len(expected) or isinstance(plan.get("seasonTeamGP"),bool):
        raise review.ReviewHold("SEASON_GAME_COUNT_MISMATCH")
    if (payload.get("schema")!="brave-hc-hto-game-feed-candidate/v1" or
        payload.get("season")!="W2026/27" or payload.get("auditedGameMapComplete") is not True or
        payload.get("playerAggregateParity") is not True or payload.get("parityScope")!="COMPLETE_FIELDS_ONLY" or
        payload.get("productionAcceptance") is not False or payload.get("consumerCompatibilityVerified") is not False):
        raise review.ReviewHold("INVALID_CANDIDATE_CONTRACT")
    if payload.get("teamGP")!=len(expected) or isinstance(payload.get("teamGP"),bool):
        raise review.ReviewHold("CANDIDATE_GAME_COUNT_MISMATCH")
    games=payload["games"]
    ids=[g["htoGameId"] for g in games]
    if len(ids)!=len(set(ids)) or set(ids)!=expected:
        raise review.ReviewHold("CANDIDATE_GAME_SET_MISMATCH")
    if review.response_identity(envelope["scoresProvenance"]["canonicalURL"])!=review.response_identity(candidate.SCORE_URL):
        raise review.ReviewHold("SCORES_PROVENANCE_MISMATCH")
    season=envelope["seasonProvenance"]
    if season.get("seasonTitle")!=review.SEASON_TITLE or review.response_identity(season.get("canonicalURL",""))!=review.response_identity(candidate.STATS_URL):
        raise review.ReviewHold("SEASON_IDENTITY_MISMATCH")
    if set(envelope["gameProvenance"])!={str(gid) for gid in expected}:
        raise review.ReviewHold("GAME_PROVENANCE_COVERAGE_MISMATCH")
    for game in games:
        gid=game["htoGameId"]; number,day=candidate.GAME_MAP[gid]
        evidence=envelope["gameProvenance"][str(gid)]
        if game["workbookGameNumber"]!=number or game["date"]!=day:
            raise review.ReviewHold("WORKBOOK_MAPPING_MISMATCH")
        if (evidence.get("gameDate")!=review.GAME_DATES[gid] or
            evidence.get("seasonBasis")!="AUDITED_2026_27_GAME_DATE_MAP_AND_VERIFIED_SEASON_STATS" or
            review.response_identity(evidence.get("canonicalURL",""))!=review.response_identity(game["sourceUrl"])):
            raise review.ReviewHold("GAME_CONTENT_PROVENANCE_MISMATCH")
        query=dict(parse_qsl(urlsplit(game["sourceUrl"]).query))
        if query.get("gameID")!=str(gid) or query.get("u")!="BRAVESHOCKEY" or query.get("p")!="boxscore":
            raise review.ReviewHold("GAME_URL_IDENTITY_MISMATCH")
    parity=payload["missingStatFields"]["seasonParity"]
    for key,complete,total in (("skaters",120,120),("goalies",11,12)):
        check=parity[key]
        if (check.get("completeFieldComparisons")!=complete or check.get("expectedFieldComparisons")!=total or
            check.get("discrepancies")!=[]):
            raise review.ReviewHold("BOUNDED_131_FIELD_PARITY_REQUIRED")
    if parity["skaters"].get("incompleteFields")!=[]:
        raise review.ReviewHold("UNEXPECTED_SKATER_INCOMPLETENESS")
    incomplete=parity["goalies"].get("incompleteFields")
    if not isinstance(incomplete,list) or len(incomplete)!=1 or incomplete[0].get("field")!="POTG" or incomplete[0].get("unknownGames")!=1:
        raise review.ReviewHold("UNKNOWN_GOALIE_POTG_NOT_PRESERVED")
    for name,totals in payload["goalieGameTotals"].items():
        rows=[p for g in games for p in g["goalies"] if p["name"]==name]
        known=[p["potg"] for p in rows if p["potg"] is not None]; unknown=len(rows)-len(known)
        if not rows or totals.get("potg")!=(None if unknown else sum(known)):
            raise review.ReviewHold("GOALIE_UNKNOWN_TOTAL_CHANGED")
        expected_completeness={"knownSubtotal":sum(known),"unknownCount":unknown,"complete":unknown==0}
        if payload["goalieAggregateCompleteness"][name]["potg"]!=expected_completeness:
            raise review.ReviewHold("GOALIE_COMPLETENESS_CHANGED")
    if payload.get("inferredPerGamePOTG")!=[]:
        raise review.ReviewHold("INFERRED_POTG_NOT_ALLOWED")
    proposed=copy.deepcopy(payload)
    proposed.update(schema="brave-hc-hto-operational-contract-candidate/v1",
                    originalCandidateSchema=payload["schema"],
                    proposedConsumerSchema="brave-hc-hto-verified-game-feed/v1",
                    sourceReadback=envelope["observationStartedAt"],
                    observationStartedAt=envelope["observationStartedAt"],
                    observationCompletedAt=envelope["observationCompletedAt"],
                    allGamesDiscovered=True,
                    discoveryEvidence=copy.deepcopy(plan),
                    sourceContentIdentityVerified=True,
                    sourceEvidence={"scores":copy.deepcopy(envelope["scoresProvenance"]),
                                    "season":copy.deepcopy(season),"games":copy.deepcopy(envelope["gameProvenance"])},
                    productionAcceptance=False,consumerCompatibilityVerified=False,
                    releaseState="OPERATIONAL_CONTRACT_REVIEW_ONLY")
    return proposed


def main(argv=None):
    argv=sys.argv[1:] if argv is None else argv
    if argv!=["--live-read-only"]: raise review.ReviewHold("EXPLICIT_LIVE_READ_ONLY_REQUIRED")
    print(json.dumps(adapt_review(observe_discovery())),flush=True)
    return 0


if __name__=="__main__":
    try: raise SystemExit(main())
    except (review.ReviewHold,review.helper.BoxscoreSchemaHold,KeyError,ValueError) as error:
        print(json.dumps({"state":"HOLD","reason":str(error),"productionAcceptance":False}),file=sys.stderr)
        raise SystemExit(2)
