"""Configure bounded HTO game set from completed official source and Master calendar."""
from datetime import datetime
from pathlib import Path
import hockeyos_discovery_review as discovery
import hockeyos_collector_candidate as candidate
from plan_date_bound_hto_game_ids import calendar,current_plan
from collect_hto_completed_scores import parse_native_html
from hockeyos_review_four_game_source_parity import ReviewHold

def configure(collector,root):
    # Original protected workbook always comes from the canonical source root.
    # Operational output may be a disposable test directory without workbook copies.
    master=Path(r"D:\BruTTech\Products\HockeyOS\Reference Implementations\Brave H.C\01 Team Records\261001_Brave_HC_Master_Workbook.xlsx")
    html=collector.adapter.review.fetch_html(candidate.SCORE_URL)
    discovery.validate_scores_content(html)
    games=parse_native_html(html)
    evidence={"schema":"brave-hc-hto-completed-score-evidence/private-v1",
              "status":"PRIVATE_SOURCE_ONLY","publicationAuthorized":False,
              "sourceGamesCount":len(games),"games":games}
    plan=current_plan(calendar(master),evidence)
    mapping={g["htoGameId"]:(g["masterGameNumber"],g["date"]) for g in plan["mapping"]}
    game_dates={}
    for g in plan["mapping"]:
        d=datetime.fromisoformat(g["date"])
        game_dates[g["htoGameId"]]=d.strftime("%A, %b ")+str(d.day)+d.strftime(", %Y")
    if len(mapping)!=len(games) or any(not x for x in game_dates.values()):
        raise ReviewHold("DYNAMIC_GAME_MAP_COVERAGE_MISMATCH")
    candidate.GAME_MAP=mapping
    collector.adapter.review.GAME_DATES=game_dates
    collector.adapter.review.GAME_IDS=tuple(sorted(mapping))
    # Independent HTO evidence parity: the public Scores card used to discover
    # each completed game must agree with the actual canonical HTO boxscore.
    # A correct date, player stat aggregate or URL alone is not enough.
    observed={game["htoGameId"]:game for game in games}
    for gid in sorted(mapping):
        card=observed[gid]
        url=card["sourceUrl"]
        source=collector.adapter.review.fetch_html(url)
        proof=collector.adapter.review.verify_content(source,url,game_id=gid)
        if proof["gameDate"]!=game_dates[gid]:
            raise ReviewHold("SCORECARD_BOXSCORE_DATE_CONFLICT:"+str(gid))
        tables=collector.adapter.review.parse_tables(source)
        score=collector.adapter.review.unique_table(
            tables,lambda h:h and h[0]=="REGULAR SEASON")
        if len(score)!=3 or len(score[0])!=7 or any(len(r)!=7 for r in score[1:]):
            raise ReviewHold("HTO_CANONICAL_GAME_SCOREBOARD_FORMAT_CHANGED:"+str(gid))
        ours=[r for r in score[1:] if r[0]=="Brave H.C."]
        theirs=[r for r in score[1:] if r[0]!="Brave H.C."]
        if len(ours)!=1 or len(theirs)!=1:
            raise ReviewHold("HTO_CANONICAL_GAME_OPPONENT_NOT_UNIQUE:"+str(gid))
        try:
            values=[[int(x) for x in row[1:]] for row in (ours[0],theirs[0])]
        except (TypeError,ValueError) as error:
            raise ReviewHold("HTO_CANONICAL_GAME_SCORE_NON_NUMERIC:"+str(gid)) from error
        if any(n<0 for pair in values for n in pair):
            raise ReviewHold("HTO_CANONICAL_GAME_NEGATIVE_SCORE:"+str(gid))
        if any(sum(pair[:5])!=pair[-1] for pair in values):
            raise ReviewHold("HTO_CANONICAL_GAME_PERIOD_SUM_INVALID:"+str(gid))
        if (theirs[0][0],values[0][-1],values[1][-1]) != (
                card["opponentExact"],card["gf"],card["ga"]):
            raise ReviewHold("HTO_SCORES_VS_BOX_SAME_GAME_CONFLICT:"+str(gid))
    return plan
