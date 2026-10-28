"""Final design-coherence acceptance for the complete Brave H.C. Trophy Room.
Verify in actual Edge/Chrome (mobile and desktop) that all six medal families
share one FULL logo backdrop and centered 11px labels, awards use gold cards,
the archival art itself remains authentic, and discipline/Records are NOT gold.
No HTO/admin state mutations or award decisions.
"""
from pathlib import Path
from collections import Counter
from composite_badge_expectations import projected_items
import functools,http.server,json,threading,os
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.support.ui import WebDriverWait

ROOT=Path(__file__).resolve().parents[1]
ledger=json.loads((ROOT/"widgets/player-highlights-ledger.json").read_text(encoding="utf-8"))["players"]
book=json.loads((ROOT/"widgets/player-record-book.json").read_text(encoding="utf-8"))["players"]
discipline=next(pid for pid,p in ledger.items() if any(x["category"]=="discipline" for x in p["items"]))
cases=[("354060",355),("354060",810),("354055",355),("354055",810),
       ("354054",320),("354054",1280),("354046",355),("354049",810),
       ("354058",355),("354058",810),("354062",355),("652571",810),(discipline,355)]
gold="rgb(229, 182, 84)"
ring={"bronze":"rgb(201, 145, 95)","silver":"rgb(185, 202, 217)",
      "gold":gold,"platinum":"rgb(57, 199, 243)"}
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(("127.0.0.1",0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
browser_kind=os.getenv("BRAVE_QA_BROWSER","edge").lower()
opts=webdriver.ChromeOptions() if browser_kind=="chrome" else Options()
opts.add_argument("--headless=new");opts.add_argument("--no-sandbox")
if browser_kind=="chrome":opts.add_argument("--disable-dev-shm-usage")
driver=None
totals=Counter()
def names(cases):return [x for x in cases if x]
try:
 driver=webdriver.Chrome(options=opts) if browser_kind=="chrome" else webdriver.Edge(options=opts)
 for pid,width in cases:
  player=ledger[pid]
  display=projected_items(pid,player["name"],player["items"])
  milestones=[x for x in display if x["category"]=="milestone"]
  honors=[x for x in display if x["category"] not in ("milestone","discipline")]
  disciplines=[x for x in display if x["category"]=="discipline"]
  recordcount=len(book[pid]["entries"])
  driver.set_window_size(1100,1050)
  driver.execute_cdp_cmd("Emulation.setDeviceMetricsOverride",
    {"width":width,"height":1000,"deviceScaleFactor":1,"mobile":False})
  driver.get(f"http://127.0.0.1:{server.server_port}/widgets/player-highlights.html?playerID={pid}")
  WebDriverWait(driver,24).until(lambda d:d.execute_script(
   "return !document.getElementById('lockerSection').hidden && Number(document.getElementById('lockerAllCount').textContent)==arguments[0]",
   len(display)+recordcount))
  driver.execute_script("document.querySelector('#lockerMilestones').click();")
  medals=driver.execute_script("""return [...document.querySelectorAll('#milestoneGrid .ph-earned-tile')].map(t=>{
   const im=t.querySelector('img'),label=t.querySelector('.ph-earned-name'),date=t.querySelector('.ph-earned-date'),
    tier=t.querySelector('.ph-earned-tier').textContent.toLowerCase(),s=getComputedStyle(t);
   return {
     title:label.textContent,src:im.src,tier,cardclass:t.className,border:s.borderTopColor,
     background:s.backgroundImage,iconWidth:parseFloat(getComputedStyle(im).width),
     labelSize:getComputedStyle(label).fontSize,labelAlign:getComputedStyle(label).textAlign,
     labelDisplay:getComputedStyle(label).display,labelAlignContent:getComputedStyle(label).alignContent,
     dateSize:getComputedStyle(date).fontSize,chipSize:getComputedStyle(t.querySelector('.ph-earned-tier')).fontSize
   };} )""")
  assert len(medals)==len(milestones),(pid,width,len(medals),len(milestones))
  for t in medals:
   assert "/assets/full-crest-clubs/" in t["src"],(pid,width,t)
   assert "ph-fullcrest-family" in t["cardclass"],(pid,width,t)
   assert t["border"]==ring[t["tier"]] and "linear-gradient" in t["background"],(pid,width,t)
   assert t["iconWidth"]==(88 if width<=370 else 96),(pid,width,t)
   assert (t["labelSize"],t["labelAlign"],t["labelDisplay"],t["labelAlignContent"],t["dateSize"],t["chipSize"])==(
    "11px","center","block","center","10px","9px"),(pid,width,t)
  driver.execute_script("document.querySelector('#lockerHonors').click();")
  awards=driver.execute_script("""return [...document.querySelectorAll('#honorsGrid .ph-honor-card')].map(t=>{
   const s=getComputedStyle(t),label=t.querySelector('.ph-honor-title'),date=t.querySelector('.ph-honor-date'),im=t.querySelector('img');
   return {className:t.className,border:s.borderTopColor,background:s.backgroundImage,
      icon:im?.src||'',imageWidth:im?parseFloat(getComputedStyle(im).width):0,
      labelFont:getComputedStyle(label).fontSize,labelAlign:getComputedStyle(label).textAlign,
      labelDisplay:getComputedStyle(label).display,dateFont:getComputedStyle(date).fontSize};
  })""")
  assert len(awards)==min(6,len(honors)),(pid,width,len(awards),len(honors))
  for a in awards:
   assert "ph-gold-honour" in a["className"] and a["border"]==gold,(pid,width,a)
   assert "linear-gradient" in a["background"],(pid,width,a)
   assert (a["labelFont"],a["labelAlign"],a["labelDisplay"],a["dateFont"])==("11px","center","block","10px"),(pid,width,a)
   if a["icon"]:assert a["imageWidth"]==(88 if width<=370 else 96),(pid,width,a)
  driver.execute_script("document.querySelector('#lockerAll').click();")
  for _ in range(15):
   hidden=driver.execute_script("return document.getElementById('allMore').hidden")
   if hidden:break
   driver.execute_script("document.getElementById('allMore').click()")
  else:raise AssertionError("All pagination did not terminate")
  allstatus=driver.execute_script("""return [...document.querySelectorAll('#allGrid .ph-inventory-card')].map(t=>{
   const s=getComputedStyle(t),label=t.querySelector('.ph-inventory-name'),date=t.querySelector('.ph-inventory-date');
   return {className:t.className,border:s.borderTopColor,background:s.backgroundImage,
    titleFont:label?getComputedStyle(label).fontSize:null,titleAlign:label?getComputedStyle(label).textAlign:null,
    dateFont:date?getComputedStyle(date).fontSize:null,icon:t.querySelector('img')?.src||''};
  })""")
  assert len(allstatus)==len(display)+recordcount,(pid,width,len(allstatus))
  allmedals=[a for a in allstatus if "ph-inventory-milestone" in a["className"]]
  allhonors=[a for a in allstatus if "ph-gold-honour" in a["className"]]
  allDiscipline=[a for a in allstatus if "ph-inventory-discipline" in a["className"]]
  assert len(allmedals)==len(milestones)
  assert len(allhonors)==len(honors)
  assert len(allDiscipline)==len(disciplines)
  for c in allmedals:
   assert "/assets/full-crest-clubs/" in c["icon"] and "ph-fullcrest-family" in c["className"]
   assert any(c["border"]==x for x in ring.values())
  for c in allhonors:
   assert c["border"]==gold,(pid,width,c)
   assert c["titleFont"]=="11px" and c["titleAlign"]=="center" and c["dateFont"]=="10px"
  for c in allDiscipline:
   assert "ph-gold-honour" not in c["className"] and c["border"]!=gold
  driver.execute_script("document.querySelector('#lockerRecords').click();")
  records=driver.execute_script("""return [...document.querySelectorAll('#records .ph-record-card')].map(t=>({
   border:getComputedStyle(t).borderTopColor,cls:t.className}));""")
  assert len(records)==min(12,recordcount)
  assert all("ph-gold-honour" not in r["cls"] for r in records)
  assert driver.execute_script("return document.documentElement.scrollWidth<=innerWidth+4"),(pid,width,"overflow")
  if pid=="354060" and width==355:
   driver.execute_script("document.querySelector('#lockerMilestones').click();")
   driver.find_element("id","lockerSection").screenshot(str(ROOT/"docs/261028_Unified_Trophy_Milestones_355_Proof.png"))
   driver.execute_script("document.querySelector('#lockerHonors').click();")
   driver.find_element("id","lockerSection").screenshot(str(ROOT/"docs/261028_Unified_Trophy_Awards_355_Proof.png"))
   driver.execute_script("document.querySelector('#lockerAll').click();")
   driver.find_element("id","lockerSection").screenshot(str(ROOT/"docs/261028_Unified_Trophy_All_355_Proof.png"))
  totals["sessions"]+=1
  totals["milestoneCards"]+=len(medals)
  totals["goldHonors"]+=len(honors)
  totals["neutralDiscipline"]+=len(disciplines)
  totals["mappedRecords"]+=recordcount
 print(json.dumps({"status":"UNIFIED_TROPHY_BROWSER_PASS",
  "checks":dict(totals),"allTitlesCenteredAndUniform":True,"allAwardsGoldCards":True,
  "allMilestonesTierCards":True,"allDataUntouched":True,"backendWrites":0},indent=2))
finally:
 if driver:driver.quit()
 server.shutdown()
