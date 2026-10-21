"""Opt-in four-game source review. Successful checks never authorize production."""
import json
import sys
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, parse_qsl
from urllib.request import Request, urlopen
from datetime import datetime, timezone

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tests"))
from lib import hockeyos_hto_boxscore_header_review as helper

MAX_BODY_BYTES = 2_000_000
GAME_IDS = (3356177, 3356178, 3369564, 3375601)
SKATER_FIELDS = {"GP":"gameAppearance","G":"g","A":"a","Pts":"pts","+/-":"plusminus","POTG":"potg"}
GOALIE_FIELDS = {"GP":"gp","L":"losses","GA":"goalsAgainst","POTG":"potg"}

class ReviewHold(ValueError):
    pass

class Parser(HTMLParser):
    def __init__(self):
        super().__init__(); self.tables=[]; self.table=None; self.row=None; self.cell=None
    def handle_starttag(self, tag, attrs):
        if tag=="table": self.table=[]
        if tag=="tr" and self.table is not None: self.row=[]
        if tag in ("td","th") and self.row is not None: self.cell=[]
    def handle_data(self, data):
        if self.cell is not None: self.cell.append(data)
    def handle_endtag(self, tag):
        if tag in ("td","th") and self.cell is not None:
            self.row.append(" ".join("".join(self.cell).split())); self.cell=None
        if tag=="tr" and self.row is not None:
            if self.row: self.table.append(self.row)
            self.row=None
        if tag=="table" and self.table is not None:
            self.tables.append(self.table); self.table=None

def response_identity(url):
    parsed=urlsplit(url)
    if parsed.scheme!="https" or parsed.hostname!="www.htosports.com" or parsed.port not in (None,443) or parsed.username or parsed.password or parsed.fragment:
        raise ReviewHold("UNTRUSTED_RESPONSE_URL")
    return parsed.path.casefold(), sorted(parse_qsl(parsed.query, keep_blank_values=True))


# This audit is deliberately bounded to the previously reconciled four-game map.
GAME_DATES = {3356177:"Sunday, Sep 20, 2026",3356178:"Sunday, Sep 27, 2026",
              3369564:"Sunday, Oct 4, 2026",3375601:"Sunday, Oct 18, 2026"}
SEASON_TITLE = "Brave H.C. Stats - Winter 2026/2027"

class ContentMetadata(HTMLParser):
    def __init__(self):
        super().__init__(); self.canonical=[]; self.titles=[]; self.dates=[]
        self.title=None; self.div_depth=0; self.span_depth=0; self.first_span=None
    def handle_starttag(self,tag,attrs):
        values=dict(attrs)
        if tag=="meta" and values.get("property")=="og:url":
            if sum(key=="property" for key,value in attrs)!=1 or sum(key=="content" for key,value in attrs)!=1:
                raise ReviewHold("AMBIGUOUS_CANONICAL_ATTRIBUTES")
            self.canonical.append(values.get("content"))
        if tag=="title":
            if self.title is not None: raise ReviewHold("NESTED_TITLE")
            self.title=[]
        if tag=="div":
            if self.div_depth:
                self.div_depth+=1
                if "gameHeaderDateLocation" in values.get("class","").split():
                    raise ReviewHold("NESTED_GAME_DATE_HEADER")
            elif "gameHeaderDateLocation" in values.get("class","").split():
                self.div_depth=1; self.first_span=None; self.span_depth=0
        if tag=="span" and self.div_depth:
            if self.first_span is None: self.first_span=[]; self.span_depth=1
            elif self.span_depth: self.span_depth+=1
    def handle_data(self,data):
        if self.title is not None: self.title.append(data)
        if self.div_depth and self.span_depth: self.first_span.append(data)
    def handle_endtag(self,tag):
        if tag=="title" and self.title is not None:
            self.titles.append(" ".join("".join(self.title).split())); self.title=None
        if tag=="span" and self.span_depth: self.span_depth-=1
        if tag=="div" and self.div_depth:
            self.div_depth-=1
            if not self.div_depth:
                self.dates.append(None if self.first_span is None else " ".join("".join(self.first_span).split()))

def verify_content(source,url,game_id=None):
    metadata=ContentMetadata(); metadata.feed(source); metadata.close()
    if len(metadata.canonical)!=1 or not isinstance(metadata.canonical[0],str):
        raise ReviewHold("MISSING_OR_DUPLICATE_CANONICAL_URL")
    if response_identity(metadata.canonical[0])!=response_identity(url):
        raise ReviewHold("CONTENT_CANONICAL_URL_MISMATCH")
    if game_id is not None:
        if game_id not in GAME_DATES:
            raise ReviewHold("GAME_NOT_IN_AUDITED_DATE_MAP")
        # The expected URL identity contains the game ID and is checked above.
        query=dict(parse_qsl(urlsplit(url).query))
        if query.get("gameID")!=str(game_id) or query.get("p")!="boxscore":
            raise ReviewHold("REQUESTED_GAME_ID_MISMATCH")
        if metadata.dates!=[GAME_DATES[game_id]] or metadata.div_depth or metadata.span_depth:
            raise ReviewHold("GAME_HEADER_DATE_MISMATCH")
        return {"canonicalURL":metadata.canonical[0],"gameDate":GAME_DATES[game_id],
                "seasonBasis":"AUDITED_2026_27_GAME_DATE_MAP_AND_VERIFIED_SEASON_STATS"}
    if metadata.titles!=[SEASON_TITLE] or metadata.title is not None:
        raise ReviewHold("SEASON_TITLE_MISMATCH")
    return {"canonicalURL":metadata.canonical[0],"seasonTitle":SEASON_TITLE}

def fetch_html(url, opener=urlopen):
    expected=response_identity(url)
    with opener(Request(url,headers={"User-Agent":"Mozilla/5.0","Cache-Control":"no-cache"}),timeout=18) as response:
        if response.status!=200:
            raise ReviewHold("HTTP_STATUS")
        if response_identity(response.geturl())!=expected:
            raise ReviewHold("RESPONSE_URL_MISMATCH")
        if response.headers.get_content_type()!="text/html":
            raise ReviewHold("NON_HTML_RESPONSE")
        body=response.read(MAX_BODY_BYTES+1)
        if len(body)>MAX_BODY_BYTES:
            raise ReviewHold("RESPONSE_TOO_LARGE")
    return body.decode("utf8","replace")

def parse_tables(source):
    parser=Parser(); parser.feed(source); return parser.tables

def unique_table(tables, predicate):
    found=[table for table in tables if table and isinstance(table[0],list) and predicate(table[0])]
    if len(found)!=1: raise ReviewHold("AMBIGUOUS_OR_MISSING_TABLE")
    return found[0]

def season_rows(table, fields, expected_names):
    if not isinstance(table,list) or len(table)<2 or not isinstance(table[0],list):
        raise ReviewHold("SEASON_TABLE_MISSING")
    head=table[0]
    if any(not isinstance(value,str) for value in head):
        raise ReviewHold("INVALID_SEASON_HEADER")
    named=[value for value in head if value]
    if len(named)!=len(set(named)):
        raise ReviewHold("DUPLICATE_SEASON_HEADER")
    if not {"Name", *fields}.issubset(named):
        raise ReviewHold("MISSING_SEASON_COLUMNS")
    rows={}; identities=set(); team_count=0
    for row in table[1:]:
        if not isinstance(row,list) or len(row)!=len(head) or any(not isinstance(value,str) for value in row):
            raise ReviewHold("MALFORMED_SEASON_ROW")
        name=row[head.index("Name")].strip()
        if name=="Team Stats":
            team_count+=1
            if team_count>1: raise ReviewHold("DUPLICATE_SEASON_TEAM_TOTAL")
            continue
        if not name or name.casefold() in identities:
            raise ReviewHold("DUPLICATE_OR_EMPTY_SEASON_IDENTITY")
        identities.add(name.casefold())
        values={}
        for field in fields:
            value=row[head.index(field)].strip()
            if not value or (value[0] in "+-" and not value[1:].isdigit()) or (value[0] not in "+-" and not value.isdigit()):
                raise ReviewHold("INVALID_SEASON_NUMBER")
            number=int(value)
            if field!="+/-" and number<0: raise ReviewHold("NEGATIVE_SEASON_NUMBER")
            values[field]=number
        rows[name]=values
    if set(rows)!=set(expected_names):
        raise ReviewHold("SEASON_IDENTITY_COVERAGE_MISMATCH")
    return rows

def compare_season(table, observations, fields):
    names={row["name"] for row in observations}
    if not names: raise ReviewHold("EMPTY_OBSERVATIONS")
    official=season_rows(table,fields,names)
    differences=[]; incomplete=[]; checked=0
    for name in sorted(names):
        rows=[row for row in observations if row["name"]==name]
        for field,key in fields.items():
            values=[row[key] for row in rows]
            known=[value for value in values if value is not None]
            if any(not isinstance(value,int) or isinstance(value,bool) for value in known):
                raise ReviewHold("INVALID_OBSERVATION_NUMBER")
            subtotal=sum(known)
            if len(known)!=len(values):
                incomplete.append({"name":name,"field":field,"knownSubtotal":subtotal,"unknownGames":len(values)-len(known),"seasonPublished":official[name][field]})
                # Unknown observations cannot repair an already excessive known subtotal.
                if field!="+/-" and subtotal>official[name][field]:
                    differences.append({"name":name,"field":field,"reason":"KNOWN_SUBTOTAL_EXCEEDS_SEASON"})
                continue
            checked+=1
            if subtotal!=official[name][field]:
                differences.append({"name":name,"field":field,"boxscoreTotal":subtotal,"season":official[name][field]})
    return {"completeFieldComparisons":checked,"expectedFieldComparisons":len(names)*len(fields),"incompleteFields":incomplete,"discrepancies":differences}

def main(argv=None):
    argv=sys.argv[1:] if argv is None else argv
    if argv!=["--live-read-only"]:
        raise ReviewHold("EXPLICIT_LIVE_READ_ONLY_REQUIRED")
    receipts=[]; allsk=[]; allgoal=[]
    for gid in GAME_IDS:
        url=f"https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&sportsHQ=BRAVESHOCKEY&gameID={gid}&p=boxscore"
        source=fetch_html(url)
        provenance=verify_content(source,url,game_id=gid)
        tables=parse_tables(source)
        board=unique_table(tables,lambda head:head and head[0]=="REGULAR SEASON")
        teams=[row for row in board[1:] if row and row[0]=="Brave H.C."]
        opponents=[row for row in board[1:] if row and row[0]!="Brave H.C." and row[-1].isdigit()]
        if len(teams)!=1 or len(opponents)!=1: raise ReviewHold("AMBIGUOUS_SCOREBOARD")
        try: gf=int(teams[0][-1]); ga=int(opponents[0][-1])
        except (ValueError,IndexError): raise ReviewHold("INVALID_SCOREBOARD")
        sk=unique_table(tables,lambda head:head[:3]==["No","Name","POS"])
        go=unique_table(tables,lambda head:head[:2]==["No","Name"] and "GP" in head)
        skaters=helper.skater_rows(sk,verified_team_goals=gf); goalies=helper.goalie_rows(go)
        receipt=helper.check_game_observations(hto_game_id=gid,official_goals_for=gf,official_goals_against=ga,skaters=skaters,goalies=goalies)
        receipt.update(sourceURL=url,sourceContentIdentityVerified=True,contentProvenance=provenance,releaseState="REVIEW_ONLY_NOT_PRODUCTION_ACCEPTANCE")
        receipts.append(receipt); allsk+=skaters; allgoal+=goalies
    url="https://www.htosports.com/teams/default.asp?p=stats&s=hockey&u=BRAVESHOCKEY"
    source=fetch_html(url)
    season_provenance=verify_content(source,url)
    tables=parse_tables(source)
    sk=unique_table(tables,lambda head:head[:3]==["No","Name","POS"] and "GP" in head)
    go=unique_table(tables,lambda head:head[:2]==["No","Name"] and "GP" in head and "GA" in head)
    result={"observedAt":datetime.now(timezone.utc).isoformat(),"games":receipts,
            "skaters":compare_season(sk,allsk,SKATER_FIELDS),"goalies":compare_season(go,allgoal,GOALIE_FIELDS),
            "releaseState":"REVIEW_ONLY_NOT_PRODUCTION_ACCEPTANCE","productionAcceptance":False,
            "seasonProvenance":season_provenance,"sourceContentIdentityVerified":True,"productionModified":False}
    print(json.dumps(result),flush=True)
    # Source-review success is distinct from deployment or award-model acceptance.
    return 0 if not (result["skaters"]["discrepancies"] or result["goalies"]["discrepancies"]) else 2

if __name__=="__main__":
    try: raise SystemExit(main())
    except (ReviewHold, helper.BoxscoreSchemaHold) as error:
        print(json.dumps({"state":"HOLD","reason":str(error),"productionAcceptance":False}),file=sys.stderr)
        raise SystemExit(2)
