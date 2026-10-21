"""Read-only public boxscore detail collection; no sign-in or site mutations."""
from html.parser import HTMLParser
from concurrent.futures import ThreadPoolExecutor
from urllib.request import Request,urlopen
from datetime import datetime,timezone
import json,hashlib
from pathlib import Path
GAMES=(3356177,3356178,3369564,3375601)
class Tables(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.tables=[];self.table=None;self.row=None;self.cell=None
 def handle_starttag(self,tag,attrs):
  if tag=='table':self.table=[]
  elif tag=='tr' and self.table is not None:self.row=[]
  elif tag in ('td','th') and self.row is not None:self.cell=[]
 def handle_data(self,data):
  if self.cell is not None:self.cell.append(data)
 def handle_endtag(self,tag):
  if tag in ('td','th') and self.cell is not None:self.row.append(' '.join(''.join(self.cell).split()));self.cell=None
  elif tag=='tr' and self.row is not None:self.table.append(self.row);self.row=None
  elif tag=='table' and self.table is not None:self.tables.append(self.table);self.table=None

def collect(game):
 url=f'https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&sportsHQ=BRAVESHOCKEY&gameID={game}&p=boxscore'
 with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=25) as response:data=response.read()
 parser=Tables();parser.feed(data.decode('utf-8',errors='replace'))
 relevant=[t for t in parser.tables if t and (any('Strength' in c for c in t[0]) or 'GP' in t[0] and 'GA' in t[0])]
 if not relevant:raise ValueError('Required public tables missing')
 return {'sourceGameId':game,'sourceUrl':url,'htmlSha256':hashlib.sha256(data).hexdigest(),'tables':relevant}
if __name__=='__main__':
 import sys
 with ThreadPoolExecutor(max_workers=4) as pool:games=list(pool.map(collect,GAMES))
 p={'state':'PUBLIC_BOXSCORE_DETAIL_OBSERVATIONS_ONLY','observedAt':datetime.now(timezone.utc).isoformat(),'games':games,'readOnly':True,'publicationAuthorized':False};Path(sys.argv[1]).write_text(json.dumps(p,indent=2));print(json.dumps(p,indent=2))
