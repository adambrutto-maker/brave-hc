"""Live-local Selenium acceptance of one in-place four-view player trophy room.
Uses frozen public-source snapshots in this Git branch; no network-site mutations.
"""
from pathlib import Path
import collections,functools,http.server,json,threading,time,traceback,os
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.support.ui import WebDriverWait
ROOT=Path(__file__).resolve().parents[1]
LEDGER=json.loads((ROOT/"widgets/player-highlights-ledger.json").read_text(encoding="utf-8"))["players"]
BOOK=json.loads((ROOT/"widgets/player-record-book.json").read_text(encoding="utf-8"))["players"]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(("127.0.0.1",0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
kind=os.getenv("BRAVE_QA_BROWSER","edge").lower()
opts=webdriver.ChromeOptions() if kind=="chrome" else Options()
opts.add_argument("--headless=new")
opts.add_argument("--no-sandbox")
if kind=="chrome":opts.add_argument("--disable-dev-shm-usage")
opts.set_capability("goog:loggingPrefs",{"browser":"ALL"})
browser=None
scenarios=[("354054",355),("354054",810),("354060",355),("354285",320),("354285",355),("354285",810),
 ("354041",355),("776208",355),("354049",810),("354285",1280)]
totals=collections.Counter()
try:
 browser=webdriver.Chrome(options=opts) if kind=="chrome" else webdriver.Edge(options=opts)
 for pid,width in scenarios:
  browser.execute_cdp_cmd("Emulation.setDeviceMetricsOverride",{"width":width,"height":900,"deviceScaleFactor":1,"mobile":False})
  browser.set_window_size(1280,950)
  url=f"http://127.0.0.1:{server.server_port}/widgets/player-highlights.html?playerID={pid}"
  browser.get(url)
  WebDriverWait(browser,22).until(lambda b:b.execute_script("return document.getElementById('lockerSection') && !document.getElementById('lockerSection').hidden"))
  entries=LEDGER.get(pid,{}).get("items",[])
  expectedHighlights=len(entries)
  expectedMilestones=sum(i["category"]=="milestone" for i in entries)
  expectedAwards=sum(i["category"] not in ("milestone","discipline") for i in entries)
  expectedRecords=len(BOOK[pid]["entries"])
  try:
   WebDriverWait(browser,8).until(lambda b:b.execute_script(
    "return Number(document.getElementById('lockerAllCount').textContent)==arguments[0]",
    expectedHighlights+expectedRecords))
  except Exception:
   print("LOAD_DIAGNOSTIC",pid,browser.execute_script("return {notice:document.getElementById('notice').textContent, counts:['lockerMilestonesCount','lockerHonorsCount','lockerAllCount','lockerRecordsCount'].map(x=>document.getElementById(x).textContent),legacy:document.querySelectorAll('#legacy .ph-event').length,all:document.querySelectorAll('#allGrid .ph-inventory-card').length}"),flush=True)
   print("BROWSER_LOGS",browser.get_log("browser"),flush=True)
   raise
  tabs=[("milestones","lockerMilestones","milestoneSection"),("honors","lockerHonors","honorsSection"),
    ("all","lockerAll","allSection"),("records","lockerRecords","recordsSection")]
  status=browser.execute_script("""const host=document.getElementById('lockerSection');
    return {inDOM:host.contains(document.getElementById('recordsSection')),
      allInside:host.contains(document.getElementById('allSection')),
      currentInside:document.getElementById('allSection').contains(document.getElementById('currentSection')),
      legacyInside:document.getElementById('allSection').contains(document.getElementById('historyDetails')),
      buttons:[...document.querySelectorAll('#lockerTabs button')].map(x=>x.textContent.trim()),
      counts:['lockerMilestonesCount','lockerHonorsCount','lockerAllCount','lockerRecordsCount'].map(id=>Number(document.getElementById(id).textContent)),
      width:document.documentElement.scrollWidth,client:innerWidth,
      tabRole:document.querySelector('#lockerTabs').getAttribute('role')};""")
  assert status["inDOM"] and status["allInside"] and status["currentInside"] and status["legacyInside"],(pid,width,status)
  assert status["tabRole"]=="tablist" and len(status["buttons"])==4,(pid,width,status)
  assert status["counts"]==[expectedMilestones,expectedAwards,expectedHighlights+expectedRecords,expectedRecords],(pid,width,status)
  assert status["width"]<=width+4,(pid,width,status)
  for key,btn,panel in tabs:
   browser.execute_script("document.getElementById(arguments[0]).click()",btn)
   result=browser.execute_script("""return {
    selected:[...document.querySelectorAll('#lockerTabs button[aria-selected="true"]')].map(e=>e.id),
    visible:[...document.querySelectorAll('#milestoneSection,#honorsSection,#allSection,#recordsSection')].filter(e=>!e.hidden).map(e=>e.id),
    overflow:document.documentElement.scrollWidth-innerWidth,
    displayed:document.getElementById(arguments[0]).getClientRects().length>0,
    directRecords:document.querySelector('#records details')===null,
    cards:document.querySelectorAll('#records .ph-record-card').length,
    combined:document.querySelectorAll('#allGrid .ph-inventory-card').length,
    legacyOutside:document.querySelector('body > #recordsSection')!==null
   }""",panel)
   assert result["selected"]==[btn] and result["visible"]==[panel] and result["displayed"],(pid,width,key,result)
   assert result["overflow"]<=4 and result["directRecords"] and not result["legacyOutside"],(pid,width,key,result)
   if key=="records":assert result["cards"]==min(12,expectedRecords),(pid,width,key,result)
   if key=="all":assert result["combined"]==min(12,expectedHighlights+expectedRecords),(pid,width,key,result)
   totals["tabSwitches"]+=1
  if expectedRecords>12:
   browser.execute_script("document.getElementById('recordsMore').click()")
   observed=browser.execute_script("return document.querySelectorAll('#records .ph-record-card').length")
   assert observed==min(24,expectedRecords),(pid,width,observed)
   totals["recordsLoadMore"]+=1
  if expectedHighlights+expectedRecords>12:
   browser.execute_script("document.getElementById('lockerAll').click()")
   browser.execute_script("document.getElementById('allMore').click()")
   observed=browser.execute_script("return document.querySelectorAll('#allGrid .ph-inventory-card').length")
   assert observed==min(24,expectedHighlights+expectedRecords),(pid,width,observed)
   totals["allLoadMore"]+=1
  # Arrow keyboard should move focus and active tab without relocating documents.
  browser.execute_script("document.getElementById('lockerRecords').click();document.getElementById('lockerRecords').focus()")
  browser.execute_script("""const e=new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true});
   document.getElementById('lockerTabs').dispatchEvent(e)""")
  selected=browser.execute_script("return document.querySelector('#lockerTabs button[aria-selected=true]').id")
  assert selected=="lockerMilestones",(pid,width,selected)
  if pid=="354285" and width in (355,810):
   for tab in ("lockerMilestones","lockerHonors","lockerAll","lockerRecords"):
    browser.execute_script("document.getElementById(arguments[0]).click()",tab)
    browser.find_element("id","lockerSection").screenshot(str(ROOT/"docs"/f"261028_TrophyRoom_{pid}_{width}_{tab}.png"))
  totals["sessions"]+=1
  totals["sourceHighlights"]+=expectedHighlights
  totals["sourceRecords"]+=expectedRecords
  print("ACCEPTED",pid,width,"milestones",expectedMilestones,"honors",expectedAwards,"records",expectedRecords,flush=True)
 print(json.dumps({"status":"PASS","totals":dict(totals)},indent=2))
finally:
 if browser:browser.quit()
 server.shutdown()
