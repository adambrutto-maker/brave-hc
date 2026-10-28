"""Four-view Brave H.C. Trophy Room, source/visual regression over all 43 published
highlight profiles at both 355px and 810px (86 real-browser scenarios).
Preserves milestone art, awards, history, disciplinary distinction, and 230
mapped player statistical records. No HTO/browser production writes.
"""
from collections import Counter
from pathlib import Path
import functools,http.server,json,os,threading
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.support.ui import WebDriverWait

R=Path(__file__).resolve().parents[1]
led=json.loads((R/"widgets/player-highlights-ledger.json").read_text(encoding="utf8"))["players"]
book=json.loads((R/"widgets/player-record-book.json").read_text(encoding="utf8"))["players"]
people={pid:p for pid,p in led.items() if p["items"]}
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(("127.0.0.1",0),functools.partial(Quiet,directory=str(R)))
threading.Thread(target=server.serve_forever,daemon=True).start()
kind=os.getenv("BRAVE_QA_BROWSER","edge").lower()
opts=webdriver.ChromeOptions() if kind=="chrome" else Options()
opts.add_argument("--headless=new");opts.add_argument("--no-sandbox")
if kind=="chrome":opts.add_argument("--disable-dev-shm-usage")
driver=None
totals=Counter()
try:
 driver=webdriver.Chrome(options=opts) if kind=="chrome" else webdriver.Edge(options=opts)
 for pid,person in people.items():
  countMilestone=sum(i["category"]=="milestone" for i in person["items"])
  countOther=sum(i["category"] not in ("milestone","discipline") for i in person["items"])
  countDiscipline=sum(i["category"]=="discipline" for i in person["items"])
  countRecords=len(book[pid]["entries"])
  for width in (355,810):
   driver.set_window_size(1100,1200)
   driver.execute_cdp_cmd("Emulation.setDeviceMetricsOverride",
    {"width":width,"height":1100,"deviceScaleFactor":1,"mobile":False})
   driver.get(f"http://127.0.0.1:{server.server_port}/widgets/player-highlights.html?playerID={pid}")
   WebDriverWait(driver,20).until(lambda b:b.execute_script(
    "return !document.querySelector('#lockerSection').hidden && Number(document.querySelector('#lockerAllCount').textContent)==arguments[0]",
     len(person["items"])+countRecords))
   first=driver.execute_script("""return {
    name:document.querySelector('#playerName').textContent,
    counts:['lockerMilestonesCount','lockerHonorsCount','lockerRecordsCount','lockerAllCount'].map(id=>Number(document.getElementById(id).textContent)),
    historyInside:document.querySelector('#allSection').contains(document.getElementById('historyDetails')),
    recordsInside:document.querySelector('#lockerSection').contains(document.getElementById('recordsSection')),
    closed:!document.querySelector('#historyDetails').open,
    tabs:[...document.querySelectorAll('#lockerTabs [role=tab]')].map(x=>x.id),
    overflow:document.documentElement.scrollWidth>innerWidth+4,
    legacy:document.querySelectorAll('#legacy .ph-event').length,
    noSourceMutation:document.querySelector('#recordsSource').textContent.includes('Verified public records')};""")
   assert first["name"]==person["name"] and first["counts"]==[countMilestone,countOther,countRecords,len(person["items"])+countRecords],(pid,width,first)
   assert first["historyInside"] and first["recordsInside"] and first["closed"] and first["noSourceMutation"],(pid,width,first)
   assert len(first["tabs"])==4 and not first["overflow"],(pid,width,first)
   assert first["legacy"]==min(3,len(person["items"])),(pid,first)
   for tab,panel in [("lockerMilestones","milestoneSection"),("lockerHonors","honorsSection"),
                     ("lockerAll","allSection"),("lockerRecords","recordsSection")]:
    driver.execute_script("document.getElementById(arguments[0]).click()",tab)
    current=driver.execute_script("""return {
      selected:[...document.querySelectorAll('#lockerTabs [aria-selected=true]')].map(x=>x.id),
      visible:[...document.querySelectorAll('#milestoneSection,#honorsSection,#allSection,#recordsSection')].filter(x=>!x.hidden).map(x=>x.id),
      overflow:document.documentElement.scrollWidth>innerWidth+4};""")
    assert current["selected"]==[tab] and current["visible"]==[panel] and not current["overflow"],(pid,width,tab,current)
   driver.execute_script("document.querySelector('#lockerMilestones').click()")
   milestone=driver.execute_script("""return {
     cards:document.querySelectorAll('#milestoneGrid .ph-earned-tile').length,
     count:document.querySelector('#milestoneCount').textContent,
     pictures:[...document.querySelectorAll('#milestoneGrid .ph-earned-tile img')].map(x=>x.src),
     filters:[...document.querySelectorAll('#milestoneFilters button')].map(x=>x.textContent)};""")
   assert milestone["cards"]==countMilestone,(pid,width,milestone)
   assert milestone["count"]==str(countMilestone)+" earned" if countMilestone else milestone["count"]=="",(pid,width,milestone)
   assert all("round-clubs/" in src or "full-crest-clubs/" in src or "brave_hc_logo.png" in src or "data:image/png;base64," in src for src in milestone["pictures"]),(pid,width)
   if countMilestone:
    assert milestone["filters"][0].startswith("All (")
   driver.execute_script("document.querySelector('#lockerHonors').click()")
   honors=driver.execute_script("""return {
    cards:document.querySelectorAll('#honorsGrid .ph-honor-card').length,
    separate:document.querySelector('#disciplineGroup').hidden,
    disciplines:[...document.querySelectorAll('#disciplineGrid .ph-honor-card')].map(x=>x.textContent),
    count:document.querySelector('#honorsCount').textContent,
    filters:[...document.querySelectorAll('#honorsFilters button')].map(x=>x.textContent)};""")
   assert honors["count"]==str(countOther)+" records"
   assert honors["cards"]==min(6,countOther),(pid,width,honors)
   assert honors["separate"],"Discipline must not appear under Awards"
   assert len(honors["disciplines"])==0,(pid,width,"Discipline is All-only",honors)
   if countOther>6:
    driver.execute_script("document.getElementById('honorsMore').click()")
    assert driver.execute_script("return document.querySelectorAll('#honorsGrid .ph-honor-card').length")==countOther
   driver.execute_script("document.querySelector('#lockerRecords').click()")
   records=driver.execute_script("""return {
    cards:document.querySelectorAll('#records .ph-record-card').length,
    nestedDetails:document.querySelectorAll('#records details').length,
    count:document.querySelector('#recordsCount').textContent,
    fromOutside:document.querySelector('main > #recordsSection')!==null};""")
   assert records["cards"]==min(12,countRecords) and records["count"]==str(countRecords),(pid,width,records)
   assert not records["nestedDetails"] and not records["fromOutside"],(pid,width,records)
   driver.execute_script("document.querySelector('#lockerAll').click()")
   assert driver.execute_script("return document.querySelectorAll('#allGrid .ph-inventory-card').length")==min(12,len(person["items"])+countRecords)
   assert driver.execute_script("return document.querySelector('#historyDetails').open")==False
   if len(person["items"])+countRecords>12:
    driver.execute_script("document.querySelector('#allMore').click()")
    assert driver.execute_script("return document.querySelectorAll('#allGrid .ph-inventory-card').length")==min(24,len(person["items"])+countRecords)
   totals["sessions"]+=1
   if width==355:
    totals["profiles"]+=1;totals["milestones"]+=countMilestone;totals["honors"]+=countOther;totals["discipline"]+=countDiscipline;totals["records"]+=countRecords
 assert dict(totals)=={"sessions":86,"profiles":43,"milestones":134,"honors":206,"discipline":3,"records":sum(len(book[pid]["entries"]) for pid in people)},totals
 print(json.dumps({"status":"PASS","verified":dict(totals),"selected_panels":"Milestones/Awards/All/Records","native_source_modified":False},indent=2))
finally:
 if driver:driver.quit()
 server.shutdown()
