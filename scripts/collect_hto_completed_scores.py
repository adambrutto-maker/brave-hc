"""Read-only Brave H.C. official HTO Scores collector.

Extracts completed source gameIDs, date, opponent and period-final score from
the native HTO Scores HTML, using Python stdlib only. No workbook/HTO writes.
Never treat a schedule preview or an empty score as a completed game.
The resulting private JSON remains source evidence, not approved publication.
"""
from __future__ import annotations
from argparse import ArgumentParser
from datetime import datetime,timezone,timedelta
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.parse import urlparse,parse_qs
import json,sys,re,os

SCORES="https://www.htosports.com/teams/default.asp?p=scores&s=hockey&u=BRAVESHOCKEY"
EXPECTED_FOUR={3356177:("2026-09-20","Dateline Predators",0,3),
               3356178:("2026-09-27","Mohawks H.C.",3,6),
               3369564:("2026-10-04","Michelob Morts",2,3),
               3375601:("2026-10-18","Zamboner Crew",1,7)}
TEAM="Brave H.C."
class Hold(ValueError):pass

class HTOScoreCardParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.div_depth=0
        self.active=None
        self.cell=None
        self.row=None
        self.cards=[]
        self.pageText=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=="div":
            self.div_depth+=1
            classes=(a.get("class") or "").split()
            if "scoreBoard" in classes and "periodScore" in classes:
                if self.active is not None:raise Hold("NESTED_SCORECARD")
                self.active={"depth":self.div_depth,"text":[],"rows":[],"anchors":[]}
        if self.active is None:return
        if tag=="tr":self.row=[]
        if tag in ("td","th"):self.cell=[]
        if tag=="a":
            self.active["anchors"].append({"href":a.get("href",""),"text":[]})
    def handle_data(self,data):
        self.pageText.append(data)
        if self.active is None:return
        self.active["text"].append(data)
        if self.cell is not None:self.cell.append(data)
        if self.active["anchors"] and self.active["anchors"][-1].get("open",True):
            self.active["anchors"][-1]["text"].append(data)
    def handle_endtag(self,tag):
        if self.active is not None:
            if tag in ("td","th") and self.cell is not None:
                if self.row is not None:self.row.append(" ".join("".join(self.cell).split()))
                self.cell=None
            if tag=="tr" and self.row is not None:
                self.active["rows"].append(self.row);self.row=None
            if tag=="a" and self.active["anchors"]:
                self.active["anchors"][-1]["open"]=False
        if tag=="div":
            if self.active and self.div_depth==self.active["depth"]:
                self.cards.append(self.active);self.active=None
            self.div_depth-=1
            if self.div_depth < 0:self.div_depth=0

def parse_native_html(html):
    parser=HTOScoreCardParser()
    parser.feed(html)
    parser.close()
    if "BRAVE H.C. WINTER 2026/2027 SCORES" not in " ".join(parser.pageText).upper():
        raise Hold("HTO_SCORES_WRONG_SEASON")
    if len(parser.cards)<5:raise Hold("EXPECTED_FIVE_COMPLETED_GAMES_MISSING")
    result=[]
    for card in parser.cards:
        rows=card["rows"]
        if len(rows)!=3 or not rows[0] or rows[0][0]!="REGULAR SEASON":
            raise Hold("GAME_SCORE_TABLE_SCHEMA_CHANGED")
        if len(rows[0])!=7 or any(len(r)!=7 for r in rows[1:]):
            raise Hold("GAME_SCORE_TABLE_COLUMNS_CHANGED")
        ours=[r for r in rows[1:] if r[0]==TEAM]
        their=[r for r in rows[1:] if r[0]!=TEAM]
        if len(ours)!=1 or len(their)!=1:raise Hold("BRAVES_SCORE_ROW_NOT_UNIQUE")
        try:
            oursInts=[int(x) for x in ours[0][1:]]
            theirInts=[int(x) for x in their[0][1:]]
        except (TypeError,ValueError) as exc:raise Hold("GAME_SCORES_INVALID") from exc
        if any(x<0 for x in oursInts+theirInts):raise Hold("NEGATIVE_GOALS")
        if sum(oursInts[:5])!=oursInts[-1] or sum(theirInts[:5])!=theirInts[-1]:
            raise Hold("PERIOD_SUMS_NOT_FINAL_SCORE")
        text=" ".join(" ".join(card["text"]).split())
        match=re.search(r"\b(?:Sep|Oct|Nov|Dec|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug)\s+\d{1,2},\s+20\d\d\b",text)
        if not match:raise Hold("GAME_DATE_MISSING")
        day=datetime.strptime(match.group(0),"%b %d, %Y").strftime("%Y-%m-%d")
        links=[]
        for a in card["anchors"]:
            href=a["href"]
            if "Box Score and Summary" not in " ".join("".join(a["text"]).split()):continue
            u=urlparse(href if href.startswith("http") else "https://www.htosports.com/teams/"+href)
            if u.netloc not in ("www.htosports.com","htosports.com"):raise Hold("HTO_LINK_HOST_INVALID")
            query=parse_qs(u.query)
            if query.get("p")!=["boxscore"] or query.get("u")!=["BRAVESHOCKEY"] or len(query.get("gameID",[]))!=1:
                raise Hold("HTO_GAME_LINK_SCHEMA_CHANGED")
            try:gameid=int(query["gameID"][0])
            except ValueError as exc:raise Hold("HTO_GAME_ID_INVALID") from exc
            links.append(gameid)
        if len(links)!=1:raise Hold("COMPLETED_GAME_LINK_NOT_UNIQUE")
        gf,ga=oursInts[-1],theirInts[-1]
        result.append({"htoGameId":links[0],"date":day,"season":"W2026/27","gameType":"Regular Season",
                       "opponentExact":their[0][0],"gf":gf,"ga":ga,
                       "result":"W" if gf>ga else "L" if gf<ga else "T",
                       "sourceUrl":"https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&sportsHQ=BRAVESHOCKEY&gameID="+str(links[0])+"&p=boxscore"})
    ids=[g["htoGameId"] for g in result]
    if len(ids)!=len(set(ids)):raise Hold("DUPLICATE_HTO_GAME_ID")
    dates=[g["date"] for g in result]
    if dates!=sorted(dates,reverse=True):raise Hold("HTO_GAME_CHRONOLOGY_CHANGED")
    for gameid,(day,name,gf,ga) in EXPECTED_FOUR.items():
        g=next((v for v in result if v["htoGameId"]==gameid),None)
        if not g or (g["date"],g["opponentExact"],g["gf"],g["ga"])!=(day,name,gf,ga):
            raise Hold("AUDITED_FOUR_GAME_PARITY_DRIFT_"+str(gameid))
    return result

def collect(url=SCORES):
    req=Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; HockeyOS read-only audit)"})
    with urlopen(req,timeout=18) as response:
        if response.status!=200:raise Hold("HTO_SCORES_HTTP_ERROR")
        raw=response.read(500_000)
        if len(raw)>=500_000:raise Hold("HTO_SCORES_UNEXPECTEDLY_LARGE")
        html=raw.decode("utf-8",errors="replace")
    games=parse_native_html(html)
    return {"schema":"brave-hc-hto-completed-score-evidence/private-v1",
            "status":"PRIVATE_SOURCE_ONLY","publicationAuthorized":False,"source":url,
            "collectedAtUTC":datetime.now(timezone.utc).isoformat(),
            "sourceGamesCount":len(games),"games":games}

def stage(output):
    data=collect()
    out=Path(output);out.parent.mkdir(parents=True,exist_ok=True)
    tmp=out.with_suffix(out.suffix+".tmp")
    tmp.write_text(json.dumps(data,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    os.replace(tmp,out)
    return {"path":str(out),"status":data["status"],"sourceGamesCount":len(data["games"]),
            "latest":data["games"][0],"noWritesToWorkbook":True,"published":False}

def main():
    p=ArgumentParser()
    p.add_argument("--output",required=True)
    a=p.parse_args()
    try:print(json.dumps(stage(a.output)));return 0
    except (Hold,OSError,ValueError,KeyError,TypeError) as exc:
        print(json.dumps({"status":"HELD","error":str(exc),"published":False}),file=sys.stderr);return 2
if __name__=="__main__":sys.exit(main())
