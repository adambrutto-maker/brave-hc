"""GET-only HTO discovery review; unknown game mappings HOLD, no writer."""
import json
import sys
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, parse_qsl

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import hockeyos_collector_candidate as candidate
review = candidate.review


class BoxscoreLinks(HTMLParser):
    def __init__(self):
        super().__init__(); self.links=[]
    def handle_starttag(self, tag, attrs):
        if tag != "a": return
        hrefs=[value for key,value in attrs if key=="href"]
        if len(hrefs)>1: raise review.ReviewHold("DUPLICATE_LINK_HREF")
        if hrefs and hrefs[0]: self.links.append(hrefs[0])


def parse_boxscore_links(source, scores_url=candidate.SCORE_URL):
    """Extract official same-team boxscore identities without guessing dates."""
    parser=BoxscoreLinks(); parser.feed(source); parser.close()
    found={}
    for href in parser.links:
        url=urljoin(scores_url,href)
        parsed=urlsplit(url)
        pairs=parse_qsl(parsed.query,keep_blank_values=True)
        page_values=[value for key,value in pairs if key.casefold()=="p"]
        if not any(value.casefold()=="boxscore" for value in page_values): continue
        keys=[key.casefold() for key,value in pairs]
        if len(keys)!=len(set(keys)): raise review.ReviewHold("DUPLICATE_BOXSCORE_QUERY_KEY")
        query={key.casefold():value for key,value in pairs}
        review.response_identity(url)
        if parsed.path.casefold()!="/teams/default.asp" or query.get("u")!="BRAVESHOCKEY" or query.get("s")!="hockey":
            raise review.ReviewHold("FOREIGN_BOXSCORE_LINK")
        if query.get("sportshq","BRAVESHOCKEY")!="BRAVESHOCKEY":
            raise review.ReviewHold("FOREIGN_BOXSCORE_LINK")
        if page_values!=["boxscore"] or not query.get("gameid","").isascii() or not query.get("gameid","").isdigit() or int(query["gameid"])<1:
            raise review.ReviewHold("INVALID_BOXSCORE_IDENTITY")
        gid=int(query["gameid"])
        found[gid]=f"https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&sportsHQ=BRAVESHOCKEY&gameID={gid}&p=boxscore"
    if not found: raise review.ReviewHold("NO_OFFICIAL_BOXSCORE_LINKS")
    return found


def validate_scores_content(source, scores_url=candidate.SCORE_URL):
    metadata=review.ContentMetadata(); metadata.feed(source); metadata.close()
    if len(metadata.canonical)!=1 or not isinstance(metadata.canonical[0],str):
        raise review.ReviewHold("MISSING_OR_DUPLICATE_SCORES_CANONICAL")
    if review.response_identity(metadata.canonical[0])!=review.response_identity(scores_url):
        raise review.ReviewHold("SCORES_CANONICAL_MISMATCH")
    return {"canonicalURL":metadata.canonical[0]}


def reconciliation_plan(discovered, audited_map, season_team_gp):
    """Pagination may retain audited IDs only; every retained game needs revalidation."""
    if not isinstance(season_team_gp,int) or isinstance(season_team_gp,bool) or season_team_gp<1:
        raise review.ReviewHold("INVALID_SEASON_TEAM_GP")
    if not isinstance(audited_map,dict) or not audited_map:
        raise review.ReviewHold("MISSING_AUDITED_GAME_MAP")
    numbers=set()
    for gid,mapping in audited_map.items():
        if not isinstance(gid,int) or isinstance(gid,bool) or gid<1 or not isinstance(mapping,(tuple,list)) or len(mapping)!=2:
            raise review.ReviewHold("INVALID_AUDITED_GAME_MAP")
        number,game_date=mapping
        if not isinstance(number,int) or isinstance(number,bool) or number<1 or number in numbers:
            raise review.ReviewHold("INVALID_WORKBOOK_GAME_NUMBER")
        numbers.add(number)
        try: date.fromisoformat(game_date)
        except (ValueError,TypeError): raise review.ReviewHold("INVALID_AUDITED_GAME_DATE")
    if not discovered: raise review.ReviewHold("NO_OFFICIAL_BOXSCORE_LINKS")
    if any(not isinstance(gid,int) or isinstance(gid,bool) or gid<1 for gid in discovered):
        raise review.ReviewHold("INVALID_DISCOVERED_GAME_ID")
    unknown=sorted(set(discovered)-set(audited_map))
    if unknown: raise review.ReviewHold("UNMAPPED_COMPLETED_GAMES:"+",".join(map(str,unknown)))
    if len(audited_map)!=season_team_gp:
        raise review.ReviewHold("VERIFIED_GAME_COUNT_NOT_SEASON_GP")
    retained=sorted(set(audited_map)-set(discovered))
    return {"discoveredGameIds":sorted(discovered),"retainedAuditedGameIds":retained,
            "gameIdsToReverify":sorted(audited_map),"seasonTeamGP":season_team_gp,
            "mappingPolicy":"EXPLICIT_AUDITED_MAP_ONLY","requiresAllBoxscoresReverified":True,
            "coverageVerified":False,"allGamesDiscovered":not retained,"productionAcceptance":False}


def season_team_games(table):
    head=table[0]
    if head.count("Name")!=1 or head.count("GP")!=1:
        raise review.ReviewHold("SEASON_TEAM_GP_HEADER")
    rows=[r for r in table[1:] if isinstance(r,list) and len(r)==len(head) and r[head.index("Name")]=="Team Stats"]
    if len(rows)!=1: raise review.ReviewHold("SEASON_TEAM_TOTAL_MISSING_OR_DUPLICATE")
    value=rows[0][head.index("GP")]
    if not isinstance(value,str) or not value.isascii() or not value.isdigit():
        raise review.ReviewHold("INVALID_SEASON_TEAM_GP")
    return int(value)


def main(argv=None):
    argv=sys.argv[1:] if argv is None else argv
    if argv!=["--live-read-only"]: raise review.ReviewHold("EXPLICIT_LIVE_READ_ONLY_REQUIRED")
    source=review.fetch_html(candidate.SCORE_URL)
    scores_provenance=validate_scores_content(source)
    discovered=parse_boxscore_links(source)
    # Refuse unknown IDs before fetching any fixed audited boxscore set.
    unknown=set(discovered)-set(candidate.GAME_MAP)
    if unknown: raise review.ReviewHold("UNMAPPED_COMPLETED_GAMES:"+",".join(map(str,sorted(unknown))))
    games,sk,go,season_provenance=candidate.collect_sources()
    plan=reconciliation_plan(discovered,candidate.GAME_MAP,season_team_games(sk))
    payload=candidate.build_candidate(games,sk,go,season_provenance)
    verified=[g["htoGameId"] for g in payload["games"]]
    if len(verified)!=len(set(verified)) or set(verified)!=set(plan["gameIdsToReverify"]):
        raise review.ReviewHold("REVERIFIED_GAME_COVERAGE_MISMATCH")
    plan["coverageVerified"]=True
    print(json.dumps({"state":"DISCOVERY_REVIEW_SOURCE_COVERAGE_PASS",
                      "scoresProvenance":scores_provenance,"discovery":plan,
                      "candidate":payload,"productionAcceptance":False,
                      "releaseState":"REVIEW_ONLY_NOT_PRODUCTION_ACCEPTANCE"}),flush=True)
    return 0


if __name__=="__main__":
    try: raise SystemExit(main())
    except (review.ReviewHold,review.helper.BoxscoreSchemaHold,KeyError,ValueError) as error:
        print(json.dumps({"state":"HOLD","reason":str(error),"productionAcceptance":False}),file=sys.stderr)
        raise SystemExit(2)
