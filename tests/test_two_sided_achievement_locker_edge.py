"""Two-sided HockeyOS locker: real responsive, source-only, mobile button tests."""
from collections import Counter
from pathlib import Path
import functools,http.server,json,os,threading
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.support.ui import WebDriverWait
R=Path(__file__).resolve().parents[1]
led=json.loads((R/"widgets/player-highlights-ledger.json").read_text(encoding="utf8"))
people={pid:p for pid,p in led["players"].items() if p["items"]}
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(("127.0.0.1",0),functools.partial(Quiet,directory=str(R)))
threading.Thread(target=server.serve_forever,daemon=True).start()
kind=os.getenv("BRAVE_QA_BROWSER","edge").lower()
opts=webdriver.ChromeOptions() if kind=="chrome" else Options()
opts.add_argument("--headless=new");opts.add_argument("--no-sandbox")
if kind=="chrome":opts.add_argument("--disable-dev-shm-usage")
driver=None
totals=Counter();screenshots=[]
try:
 driver=webdriver.Chrome(options=opts) if kind=="chrome" else webdriver.Edge(options=opts)
 for pid,p in people.items():
  for width in (355,810):
   driver.set_window_size(1050,1200)
   driver.execute_cdp_cmd("Emulation.setDeviceMetricsOverride",
    {"width":width,"height":1200,"deviceScaleFactor":1,"mobile":False})
   driver.get(f"http://127.0.0.1:{server.server_port}/widgets/player-highlights.html?playerID={pid}")
   WebDriverWait(driver,20).until(lambda d:d.execute_script("return !!document.querySelector('#legacy .ph-event')"))
   expectedMilestone=sum(x["category"]=="milestone" for x in p["items"])
   expectedOther=sum(x["category"]!="milestone" for x in p["items"])
   expectedDiscipline=sum(x["category"]=="discipline" for x in p["items"])
   start=driver.execute_script("""const m=document.getElementById('milestoneSection'),h=document.getElementById('honorsSection');
    return {name:document.querySelector('#playerName').textContent,
      hostHidden:document.querySelector('#lockerSection').hidden,
      milestoneHidden:m.hidden,honorsHidden:h.hidden,historyClosed:!document.querySelector('#historyDetails').open,
      milestones:document.querySelectorAll('#milestoneGrid .ph-earned-tile').length,
      honours:document.querySelector('#honorsCount').textContent,
      overflow:document.documentElement.scrollWidth>innerWidth+4};""")
   assert start["name"]==p["name"] and not start["hostHidden"] and start["historyClosed"],(pid,start)
   assert start["milestones"]==expectedMilestone and start["honours"]==f"{expectedOther} records",(pid,start)
   assert not start["overflow"],(pid,width)
   if expectedMilestone:assert not start["milestoneHidden"] and start["honorsHidden"],(pid,start)
   else:assert start["milestoneHidden"] and not start["honorsHidden"],(pid,start)
   if not expectedOther:
    # A milestone-only player has no honours side to switch to.
    assert driver.execute_script("return document.querySelector('#lockerHonors').hidden")
    totals["sessions"]+=1
    if width==355:
     totals["profiles"]+=1;totals["milestones"]+=expectedMilestone
    continue
   driver.execute_script("document.querySelector('#lockerHonors').click()")
   flipped=driver.execute_script("""return {milestoneHidden:document.querySelector('#milestoneSection').hidden,
       honorsHidden:document.querySelector('#honorsSection').hidden,
       pressed:document.querySelector('#lockerHonors').getAttribute('aria-pressed'),
       other:document.querySelector('#lockerMilestones').getAttribute('aria-pressed'),
       visible:document.querySelectorAll('#honorsGrid .ph-honor-card').length,
       discipline:document.querySelectorAll('#disciplineGrid .ph-honor-card').length,
       separated:document.querySelector('#disciplineGroup').hidden,
       captions:[...document.querySelectorAll('#disciplineGrid .ph-honor-class')].map(e=>e.textContent),
       filters:[...document.querySelectorAll('#honorsFilters button')].map(e=>e.textContent),
       overflow:document.documentElement.scrollWidth>innerWidth+4};""")
   assert flipped["milestoneHidden"] and not flipped["honorsHidden"] and flipped["pressed"]=="true" and flipped["other"]=="false",(pid,flipped)
   assert flipped["visible"]==min(6,expectedOther-expectedDiscipline),(pid,flipped)
   driver.execute_script("document.querySelectorAll('#honorsGrid img,#disciplineGrid img').forEach(i=>i.loading='eager')")
   WebDriverWait(driver,15).until(lambda d:d.execute_script("return [...document.querySelectorAll('#honorsGrid img,#disciplineGrid img')].every(i=>i.complete)"))
   assert driver.execute_script("return [...document.querySelectorAll('#honorsGrid img,#disciplineGrid img')].every(i=>i.naturalWidth>0)"),(pid,"broken honour image")
   assert flipped["discipline"]==expectedDiscipline and flipped["separated"]==(expectedDiscipline==0),(pid,flipped)
   assert all("Disciplinary record"==x for x in flipped["captions"]),(pid,flipped)
   assert not flipped["overflow"],(pid,width,flipped)
   assert len(flipped["filters"])>=1,(pid,flipped)
   if expectedOther-expectedDiscipline>6:
    driver.execute_script("document.querySelector('#honorsMore').click()")
    result=driver.execute_script("return document.querySelectorAll('#honorsGrid .ph-honor-card').length")
    assert result==expectedOther-expectedDiscipline,(pid,result,expectedOther)
    driver.execute_script("document.querySelector('#honorsMore').click()")
   for label,category in (("Awards","award"),("Cups","championship"),("Recognition","recognition"),
                         ("Leadership","leadership"),("Historical","record"),("Discipline","discipline")):
    count=sum(x["category"]==category for x in p["items"])
    if count==0:continue
    driver.execute_script("""const label=arguments[0];const btn=[...document.querySelectorAll('#honorsFilters button')].find(b=>b.textContent.startsWith(label+' ('));
       if(!btn)throw Error('missing filter '+label);btn.click();""",label)
    observed=driver.execute_script("""return {
      list:document.querySelectorAll('#honorsGrid .ph-honor-card').length,
      discipline:document.querySelectorAll('#disciplineGrid .ph-honor-card').length,
      active:[...document.querySelectorAll('#honorsFilters button')].filter(b=>b.getAttribute('aria-pressed')==='true').length};""")
    assert observed["active"]==1 and observed["list"]==(0 if category=="discipline" else min(6,count)) and observed["discipline"]==(count if category=="discipline" else 0),(pid,label,observed)
   driver.execute_script("document.querySelector('#honorsFilters button').click()")
   if kind=="edge" and (pid,width) in (("354054",355),("354054",810),("354060",810)):
    driver.execute_script("document.querySelectorAll('#honorsGrid img').forEach(i=>i.loading='eager')")
    WebDriverWait(driver,15).until(lambda d:d.execute_script("return [...document.querySelectorAll('#honorsGrid img')].every(i=>i.complete)"))
    shot=R/f"docs/261028_Achievement_Locker_Awards_{pid}_{width}.png"
    driver.find_element("id","lockerSection").screenshot(str(shot))
    screenshots.append(str(shot))
   if expectedMilestone:
    driver.execute_script("document.querySelector('#lockerMilestones').click()")
    back=driver.execute_script("""return {
      milestoneHidden:document.querySelector('#milestoneSection').hidden,
      honorsHidden:document.querySelector('#honorsSection').hidden,
      count:document.querySelectorAll('#milestoneGrid .ph-earned-tile').length};""")
    assert not back["milestoneHidden"] and back["honorsHidden"] and back["count"]==expectedMilestone,(pid,back)
   totals["sessions"]+=1
   if width==355:
    totals["profiles"]+=1;totals["milestones"]+=expectedMilestone;totals["otherRecords"]+=expectedOther
    totals["discipline"]+=expectedDiscipline
 assert dict(totals)=={"sessions":86,"profiles":43,"milestones":97,"otherRecords":209,"discipline":3},totals
 print(json.dumps({"status":"PASS","verifiedTotals":dict(totals),"screenshots":screenshots},indent=2))
finally:
 if driver:driver.quit()
 server.shutdown()
