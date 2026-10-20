"""Opt-in four-game October 20 audit. GET-only, stdout-only; never production ingestion.
Scope is the four audited game IDs, not automatic game discovery.
"""
import ast,json,subprocess,base64
from pathlib import Path
from html.parser import HTMLParser
from urllib.request import Request,urlopen
from datetime import datetime,timezone
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"tests"))
from lib import hockeyos_hto_boxscore_header_review as helper
ns={name:getattr(helper,name) for name in ("skater_rows","goalie_rows","check_game_observations")}
class Parser(HTMLParser):
 def __init__(self):
  super().__init__();self.tables=[];self.table=None;self.row=None;self.cell=None
 def handle_starttag(self,tag,attrs):
  if tag=="table":self.table=[]
  if tag=="tr" and self.table is not None:self.row=[]
  if tag in ("td","th") and self.row is not None:self.cell=[]
 def handle_data(self,data):
  if self.cell is not None:self.cell.append(data)
 def handle_endtag(self,tag):
  if tag in ("td","th") and self.cell is not None:
   self.row.append(" ".join("".join(self.cell).split()));self.cell=None
  if tag=="tr" and self.row is not None:
   if self.row:self.table.append(self.row)
   self.row=None
  if tag=="table" and self.table is not None:self.tables.append(self.table);self.table=None
pns={"Parser":Parser}
if "--live-read-only" not in sys.argv:
 raise SystemExit("Explicit --live-read-only required. GET requests only; stdout only; not a collector or award scorer.")
receipts=[];allsk=[];allgoal=[]
for gid in [3356177,3356178,3369564,3375601]:
 url=f"https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&sportsHQ=BRAVESHOCKEY&gameID={gid}&p=boxscore"
 with urlopen(Request(url,headers={"User-Agent":"Mozilla/5.0","Cache-Control":"no-cache"}),timeout=18) as response:
  assert response.status==200
  source=response.read().decode("utf8","replace")
 parser=pns["Parser"]();parser.feed(source)
 board=next(t for t in parser.tables if t and t[0] and t[0][0]=="REGULAR SEASON")
 team=next(r for r in board if r and r[0]=="Brave H.C.")
 opponent=[r for r in board[1:] if r and r[0]!="Brave H.C." and r[-1].isdigit()]
 assert len(opponent)==1,board
 gf=int(team[-1]);ga=int(opponent[0][-1])
 sk=next(t for t in parser.tables if t and t[0][:3]==["No","Name","POS"])
 go=next(t for t in parser.tables if t and t[0][:2]==["No","Name"] and "GP" in t[0])
 skaters=ns["skater_rows"](sk,verified_team_goals=gf);goalies=ns["goalie_rows"](go)
 receipt=ns["check_game_observations"](hto_game_id=gid,official_goals_for=gf,official_goals_against=ga,skaters=skaters,goalies=goalies)
 receipt["headers"]={"skaters":sk[0],"goalies":go[0]};receipt["sourceURL"]=url
 receipts.append(receipt);allsk+=skaters;allgoal+=goalies
 print(json.dumps(receipt),flush=True)
print(json.dumps({"observedAt":datetime.now(timezone.utc).isoformat(),"games":len(receipts),"skaterRows":len(allsk),"goalieRows":len(allgoal),"goals":sum(p["g"] for p in allsk),"assists":sum(p["a"] for p in allsk),"pimKnown":sum(p["pim"] for p in allsk if p["pim"] is not None),"pimUnknownRows":sum(p["pim"] is None for p in allsk),"goalieGA":sum(p["goalsAgainst"] for p in allgoal),"unknownGoaliePOTG":sum(p["potg"] is None for p in allgoal),"productionModified":False}),flush=True)

url="https://www.htosports.com/teams/default.asp?p=stats&s=hockey&u=BRAVESHOCKEY"
with urlopen(Request(url,headers={"User-Agent":"Mozilla/5.0","Cache-Control":"no-cache"}),timeout=18) as response:
 assert response.status==200
 source=response.read().decode("utf8","replace")
parser=pns["Parser"]();parser.feed(source)
sk=next(t for t in parser.tables if t and t[0][:3]==["No","Name","POS"] and "GP" in t[0])
go=next(t for t in parser.tables if t and t[0][:2]==["No","Name"] and "GP" in t[0] and "GA" in t[0])
diffs=[];checked=0
for table,observations,fields in [(sk,allsk,{"GP":"gameAppearance","G":"g","A":"a","Pts":"pts","+/-":"plusminus","POTG":"potg"}),(go,allgoal,{"GP":"gp","L":"losses","GA":"goalsAgainst","POTG":"potg"})]:
 head=table[0];season={}
 for row in table[1:]:
  if len(row)!=len(head) or row[head.index("Name")]=="Team Stats":continue
  name=row[head.index("Name")];season[name]=row
 names={x["name"] for x in observations}
 for name in sorted(names | set(season)):
  if name not in season or name not in names:
   diffs.append({"name":name,"identityPresence":{"games":name in names,"season":name in season}});continue
  rows=[x for x in observations if x["name"]==name]
  for col,key in fields.items():
   if col not in head:continue
   known=[x[key] for x in rows if x[key] is not None]
   official=int(season[name][head.index(col)])
   if len(known)!=len(rows):
    print(json.dumps({"name":name,"field":col,"state":"INCOMPLETE_NOT_ZERO","knownSubtotal":sum(known),"unknownGames":len(rows)-len(known),"seasonPublished":official}),flush=True)
    continue
   checked+=1
   if sum(known)!=official:diffs.append({"name":name,"field":col,"boxscoreTotal":sum(known),"season":official})
print(json.dumps({"seasonParityObservedAt":datetime.now(timezone.utc).isoformat(),"completeFieldComparisons":checked,"discrepancies":diffs,"skaterIdentities":len({x["name"] for x in allsk}),"goalieIdentities":len({x["name"] for x in allgoal}),"seasonHeaders":{"skaters":sk[0],"goalies":go[0]},"productionModified":False}),flush=True)

if diffs: raise SystemExit(2)
