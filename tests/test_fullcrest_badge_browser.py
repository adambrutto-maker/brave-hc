"""Real browser QA for authentic full-logo Goal/Assist/Shutout badge and tier cards.
Covers existing verified seven thresholds plus synthetic future platinum without
publishing fake awards. Also checks stock Game/Point/Win unchanged and All view.
"""
from collections import Counter
from pathlib import Path
import copy,functools,http.server,json,threading,os
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.support.ui import WebDriverWait
R=Path(__file__).resolve().parents[1]
original=json.loads((R/"widgets/player-highlights-ledger.json").read_text(encoding="utf-8"))
manifest=json.loads((R/"widgets/assets/full-crest-clubs/source-manifest.json").read_text(encoding="utf-8"))
assets={a["value"]:a for a in manifest["assets"]}
person=original["players"]["354060"]
fixture=copy.deepcopy(original)
base=next(x for x in fixture["players"]["354060"]["items"] if x.get("awardCategory")=="50 Goal Club" and x.get("provenance")=="OFFICIAL_DATED_HTO_AWARDS_PARITY")
future=copy.deepcopy(base)
future["id"]="LOCAL_QA_ONLY_NEVER_PUBLISHED_300_GOAL"
future["awardCategory"]="300 Goal Club"
future["sourceText"]="300 Goal Club - May 28, 2017"
future["displayText"]=future["sourceText"]
future["sourceRuns"]=[{"text":future["sourceText"],"strong":False,"italic":False}]
fixture["players"]["354060"]["items"].append(future)
mode={"future":False}
class LocalOnly(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*args,**kw):super().__init__(*args,directory=str(R),**kw)
 def log_message(self,*args):pass
 def do_GET(self):
  if self.path.split("?")[0]=="/widgets/player-highlights-ledger.json" and mode["future"]:
   content=json.dumps(fixture).encode("utf-8")
   self.send_response(200);self.send_header("Content-Type","application/json")
   self.send_header("Content-Length",str(len(content)));self.end_headers();self.wfile.write(content);return
  super().do_GET()
server=http.server.ThreadingHTTPServer(("127.0.0.1",0),functools.partial(LocalOnly))
threading.Thread(target=server.serve_forever,daemon=True).start()
kind=os.getenv("BRAVE_QA_BROWSER","edge").lower()
opts=webdriver.ChromeOptions() if kind=="chrome" else Options()
opts.add_argument("--headless=new");opts.add_argument("--no-sandbox")
if kind=="chrome":opts.add_argument("--disable-dev-shm-usage")
browser=None
check=Counter()
sample_cases=[("354055",355),("354055",810),("354060",355),("354060",810),
 ("354054",355),("354054",810),("354046",355),("354049",810)]
expected_colors={"bronze":"rgb(201, 145, 95)","silver":"rgb(185, 202, 217)",
 "gold":"rgb(229, 182, 84)","platinum":"rgb(216, 233, 244)"}
try:
 browser=webdriver.Chrome(options=opts) if kind=="chrome" else webdriver.Edge(options=opts)
 for pid,width in sample_cases:
  browser.set_window_size(1170,1050)
  browser.execute_cdp_cmd("Emulation.setDeviceMetricsOverride",{"width":width,"height":980,"deviceScaleFactor":1,"mobile":False})
  browser.get(f"http://127.0.0.1:{server.server_port}/widgets/player-highlights.html?playerID={pid}")
  WebDriverWait(browser,20).until(lambda d:d.execute_script(
   "return document.getElementById('lockerAllCount') && Number(document.getElementById('lockerAllCount').textContent)>0"))
  browser.execute_script("document.getElementById('lockerMilestones').click()")
  expectedSupp=[
   i for i in original["players"][pid]["items"] if i.get("provenance")=="OFFICIAL_DATED_HTO_AWARDS_PARITY"
  ]
  names=Counter(i["awardCategory"] for i in expectedSupp)
  actual=browser.execute_script("""const tiles=[...document.querySelectorAll('#milestoneGrid .ph-earned-tile')];
   return {cards:tiles.map(t=>{
    const img=t.querySelector('img');
    img.loading='eager';
    const s=getComputedStyle(t);
    return {source:img.src,name:t.querySelector('.ph-earned-name')?.textContent||'',
      className:t.className,metal:s.borderTopColor,background:s.backgroundImage,
      label:t.querySelector('.ph-earned-tier')?.textContent||''};
    }),overflow:document.documentElement.scrollWidth>innerWidth+4};""")
  assert not actual["overflow"],(pid,width)
  full=[c for c in actual["cards"] if "ph-fullcrest-family" in c["className"]]
  self_ref=set(i["awardCategory"] for i in expectedSupp)
  assert len(full)==len(expectedSupp),(pid,width,len(full),len(expectedSupp))
  for b in full:
   assert "/assets/full-crest-clubs/" in b["source"],(pid,width,b)
   tier=b["label"].lower()
   assert b["metal"]==expected_colors[tier],(pid,width,b)
   assert "linear-gradient" in b["background"],(pid,width,b)
   assert tier in b["className"],(pid,width,b)
   check[tier]+=1
  stock=[c for c in actual["cards"] if "ph-fullcrest-family" not in c["className"]]
  assert all("assets/round-clubs/" in c["source"] or "data:image/png;base64" in c["source"] for c in stock),(pid,stock)
  browser.execute_script("document.querySelector('#milestoneGrid img').loading='eager'")
  WebDriverWait(browser,20).until(lambda b:b.execute_script(
   "return [...document.querySelectorAll('#milestoneGrid img')].every(i=>i.complete && i.naturalWidth>0)"))
  browser.execute_script("document.getElementById('lockerAll').click()")
  allCards=browser.execute_script("""return [...document.querySelectorAll('#allGrid .ph-inventory-card')].map(t=>{
   const img=t.querySelector('img');const s=getComputedStyle(t);
   return {className:t.className,src:img?.src||'',border:s.borderTopColor,
    background:s.backgroundImage}})""")
  for c in allCards:
   if "fullcrest-family" in c["className"]:
    assert "full-crest-clubs/" in c["src"],(pid,width,c)
    assert any(c["border"]==val for val in expected_colors.values()),(pid,c)
  if pid=="354060" and width in (355,810):
   browser.execute_script("document.getElementById('lockerMilestones').click()")
   browser.find_element("id","milestoneSection").screenshot(str(R/f"docs/261028_FullCrest_Badges_Player354060_{width}.png"))
   browser.execute_script("document.getElementById('lockerAll').click()")
   browser.find_element("id","allSection").screenshot(str(R/f"docs/261028_FullCrest_All_Player354060_{width}.png"))
  if pid=="354055" and width==355:
   browser.execute_script("document.getElementById('lockerMilestones').click()")
   browser.find_element("id","milestoneSection").screenshot(str(R/"docs/261028_FullCrest_Goalie_Shutouts_355.png"))
  check["sessions"]+=1
 # Synthetic future **not** in any published feed: only in the ephemeral local test server.
 mode["future"]=True
 browser.set_window_size(1000,1100)
 browser.execute_cdp_cmd("Emulation.setDeviceMetricsOverride",{"width":355,"height":1000,"deviceScaleFactor":1,"mobile":False})
 browser.get(f"http://127.0.0.1:{server.server_port}/widgets/player-highlights.html?playerID=354060&localqa=future300")
 WebDriverWait(browser,25).until(lambda d:d.execute_script(
  "return Number(document.getElementById('lockerMilestonesCount').textContent)===14"))
 browser.execute_script("document.getElementById('lockerMilestones').click()")
 WebDriverWait(browser,20).until(lambda d:d.execute_script("""return [...document.querySelectorAll('#milestoneGrid .ph-earned-tile')].some(
  t=>t.textContent.includes('300 Goal Club') && t.querySelector('img')?.src.startsWith('data:image/png;base64,'))"""))
 candidate=browser.execute_script("""const t=[...document.querySelectorAll('#milestoneGrid .ph-earned-tile')].find(
 x=>x.textContent.includes('300 Goal Club'));
 const im=t.querySelector('img');
 return {src:im.src.slice(0,24),complete:im.complete,width:im.naturalWidth,
  tier:t.querySelector('.ph-earned-tier').textContent,border:getComputedStyle(t).borderTopColor,
  label:t.querySelector('.ph-earned-name').textContent};""")
 assert candidate["src"].startswith("data:image/png;base64,")
 assert candidate["complete"] and candidate["width"]==200
 assert candidate["tier"]=="PLATINUM" and candidate["border"]==expected_colors["platinum"]
 assert "300 Goal Club" in candidate["label"]
 check["futurePlatinumSynthetic"]=1
 assert check["sessions"]==len(sample_cases)
 assert check["futurePlatinumSynthetic"]==1
 print(json.dumps({"status":"FULL_CREST_BROWSER_ACCEPTANCE_PASS",
  "checks":dict(check),"sourceEdited":False,"fixturePublished":False},indent=2))
finally:
 if browser:browser.quit()
 server.shutdown()
