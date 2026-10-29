"""Real browser WEB-07: centered medals, exact tier pills on All,
gold set vs silver tied official HTO historical record marks."""
from pathlib import Path
from collections import Counter
import functools,http.server,threading,json,os
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from composite_badge_expectations import counts
R=Path(__file__).resolve().parents[1]
ledger=json.loads((R/"widgets/player-highlights-ledger.json").read_text())["players"]
book=json.loads((R/"widgets/player-record-book.json").read_text())["players"]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(("127.0.0.1",0),functools.partial(Quiet,directory=str(R)))
threading.Thread(target=server.serve_forever,daemon=True).start()
kind=os.getenv("BRAVE_QA_BROWSER","edge")
opt=webdriver.ChromeOptions() if kind=="chrome" else Options()
opt.add_argument("--headless=new");opt.add_argument("--no-sandbox")
if kind=="chrome":opt.add_argument("--disable-dev-shm-usage")
d=None
cases=[("354060",355),("354060",810),("354054",320),("354054",810),
 ("354058",355),("354062",810),("354055",355),("354041",810)]
colors={"bronze":"rgb(201, 145, 95)","silver":"rgb(185, 202, 217)",
 "gold":"rgb(229, 182, 84)","platinum":"rgb(57, 199, 243)"}
totals=Counter()
try:
 d=webdriver.Chrome(options=opt) if kind=="chrome" else webdriver.Edge(options=opt)
 for pid,width in cases:
  p=ledger[pid];expected=counts(pid,p["name"],p["items"])
  n=len(book[pid]["entries"])
  d.set_window_size(1200,1200)
  d.execute_cdp_cmd("Emulation.setDeviceMetricsOverride",{"width":width,"height":1000,"deviceScaleFactor":1,"mobile":False})
  d.get(f"http://127.0.0.1:{server.server_port}/widgets/player-highlights.html?playerID={pid}")
  WebDriverWait(d,24).until(lambda b:b.execute_script(
   "return !document.getElementById('lockerSection').hidden && Number(document.getElementById('lockerAllCount').textContent)==arguments[0]",
   expected["all"]+n))
  d.execute_script("document.getElementById('lockerMilestones').click()")
  medals=d.execute_script("""return [...document.querySelectorAll('#milestoneGrid .ph-earned-tile')].map(x=>{
   const t=x.querySelector('.ph-earned-tier'),im=x.querySelector('img');
   return {title:x.querySelector('.ph-earned-name').textContent,tier:t.textContent,
    ring:getComputedStyle(x).borderTopColor,pill:getComputedStyle(t).borderTopColor,src:im.src};})""")
  assert len(medals)==expected["milestones"]
  for x in medals:assert x["ring"]==x["pill"]==colors[x["tier"].lower()] and "full-crest-clubs/" in x["src"]
  d.execute_script("document.getElementById('lockerAll').click()")
  for _ in range(30):
   if d.execute_script("return document.getElementById('allMore').hidden"):break
   d.execute_script("document.getElementById('allMore').click()")
  else:raise AssertionError("All pagination")
  allcards=d.execute_script("""return [...document.querySelectorAll('#allGrid .ph-inventory-card')].map(x=>{
   const t=x.querySelector('.ph-inventory-tier');
   return {title:x.querySelector('.ph-inventory-name')?.textContent||'',level:t?.textContent||'',
    label:t?.getAttribute('aria-label')||'',ring:getComputedStyle(x).borderTopColor,
    pill:t?getComputedStyle(t).borderTopColor:'',type:x.querySelector('.ph-inventory-kind')?.textContent,
    cls:x.className,src:x.querySelector('img')?.src||''};})""")
  assert len(allcards)==expected["all"]+n
  tiers=[x for x in allcards if "ph-inventory-milestone" in x["cls"]]
  assert Counter((x["title"],x["level"]) for x in tiers)==Counter((x["title"],x["tier"]) for x in medals),(pid,width,[(x["title"],x["level"]) for x in tiers],[(x["title"],x["tier"]) for x in medals])
  for x in tiers:
   assert x["label"]==x["level"].lower()+" milestone level"
   assert x["ring"]==x["pill"]==colors[x["level"].lower()]
   assert "full-crest-clubs/" in x["src"]
  allmarks=[x for x in allcards if "ph-inventory-stat" in x["cls"]]
  assert len(allmarks)==n
  assert all(x["type"] in ("RECORD SET","RECORD TIED") for x in allmarks)
  d.execute_script("document.getElementById('lockerRecords').click()")
  for _ in range(30):
   if d.execute_script("return document.getElementById('recordsMore').hidden"):break
   d.execute_script("document.getElementById('recordsMore').click()")
  else:raise AssertionError("Record pagination")
  rec=d.execute_script("""return [...document.querySelectorAll('#records .ph-record-card')].map(x=>({
   status:x.querySelector('.ph-record-kind').textContent,cls:x.className,
   line:getComputedStyle(x).borderLeftColor}));""")
  assert len(rec)==n and Counter(x["status"] for x in rec)==Counter(x["type"] for x in allmarks)
  for x in rec:
   assert x["status"] in ("RECORD SET","RECORD TIED")
   assert "ph-record-"+("set" if x["status"]=="RECORD SET" else "tied") in x["cls"]
   assert x["line"]==("rgb(201, 163, 76)" if x["status"]=="RECORD SET" else "rgb(183, 200, 216)"),x
   totals[x["status"]]+=1
  if pid=="354060" and width==355:
   d.execute_script("document.getElementById('lockerMilestones').click()")
   d.find_element("id","milestoneSection").screenshot(str(R/"docs/261028_WEB07_Centered_BRAVE_HC_Milestones.png"))
   d.execute_script("document.getElementById('lockerAll').click()")
   d.find_element("id","allSection").screenshot(str(R/"docs/261028_WEB07_All_Matching_Metal_Tiers.png"))
  if pid=="354054" and width==320:
   d.execute_script("document.getElementById('lockerRecords').click()")
   d.find_element("id","recordsSection").screenshot(str(R/"docs/261028_WEB07_Record_Set_Tied_GoldSilver.png"))
  assert d.execute_script("return document.documentElement.scrollWidth<=innerWidth+4")
  totals["sessions"]+=1;totals["tiers"]+=len(tiers);totals["records"]+=n
 print(json.dumps({"status":"WEB07_MILESTONE_AND_RECORD_PARITY_PASS","cases":dict(totals)},indent=2))
finally:
 if d:d.quit()
 server.shutdown()
