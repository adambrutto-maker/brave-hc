"""Independent responsive browser acceptance for three exact HTO multiline
records projected into discrete badge cards, and diamond-style platinum tier.
Original 343 source rows remain intact and can be expanded in the Timeline.
No network mutations, CMS edits, or invented award recipients.
"""
from pathlib import Path
import collections,functools,http.server,json,os,hashlib,threading
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from composite_badge_expectations import projected_items,counts,SPECS

R=Path(__file__).resolve().parents[1]
ledger_path=R/"widgets/player-highlights-ledger.json"
record_path=R/"widgets/player-record-book.json"
raw_before=ledger_path.read_bytes(),record_path.read_bytes()
ledger=json.loads(raw_before[0])["players"]
book=json.loads(raw_before[1])["players"]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(("127.0.0.1",0),functools.partial(Quiet,directory=str(R)))
threading.Thread(target=server.serve_forever,daemon=True).start()
kind=os.getenv("BRAVE_QA_BROWSER","edge").lower()
opts=webdriver.ChromeOptions() if kind=="chrome" else Options()
opts.add_argument("--headless=new");opts.add_argument("--no-sandbox")
if kind=="chrome":opts.add_argument("--disable-dev-shm-usage")
driver=None
total=collections.Counter()
samples=[
 ("354058",355),("354058",810),("354058",320),
 ("354062",355),("354062",810),
 ("652571",355),("652571",810),
 ("354060",355),("354060",810)
]
try:
 driver=webdriver.Chrome(options=opts) if kind=="chrome" else webdriver.Edge(options=opts)
 for pid,width in samples:
  original=ledger[pid];spec=SPECS.get(pid)
  wanted=projected_items(pid,original["name"],original["items"])
  display=counts(pid,original["name"],original["items"])
  records=len(book[pid]["entries"])
  driver.set_window_size(1100,1050)
  driver.execute_cdp_cmd("Emulation.setDeviceMetricsOverride",
   {"width":width,"height":1000,"deviceScaleFactor":1,"mobile":False})
  driver.get(f"http://127.0.0.1:{server.server_port}/widgets/player-highlights.html?playerID={pid}")
  WebDriverWait(driver,25).until(lambda b:b.execute_script(
   "return !document.getElementById('lockerSection').hidden && Number(document.getElementById('lockerAllCount').textContent)===arguments[0]",
   display["all"]+records))
  view=driver.execute_script("""return ['lockerMilestonesCount','lockerHonorsCount','lockerAllCount','lockerRecordsCount'].map(id=>Number(document.getElementById(id).textContent));""")
  assert view==[display["milestones"],display["honors"],display["all"]+records,records],(pid,width,view)
  driver.execute_script("document.getElementById('lockerHonors').click()")
  if spec:
   if not driver.execute_script("return document.getElementById('honorsMore').hidden"):
    driver.execute_script("document.getElementById('honorsMore').click()")
   cards=driver.execute_script("""return [...document.querySelectorAll('#honorsGrid .ph-honor-card')].map(x=>({
    title:x.querySelector('.ph-honor-title')?.textContent,
    date:x.querySelector('.ph-honor-date')?.textContent,
    artwork:x.querySelector('img')?.src||'',
    kind:x.querySelector('.ph-honor-class')?.textContent,
    border:getComputedStyle(x).borderTopColor
   }));""")
   # The combined HTO original must NOT render as a single grouped card.
   assert not any('\n' in x["title"] for x in cards),(pid,width,"multiline still combined",cards)
   awardParts=[(cat,label) for cat,label in spec["lines"] if cat!="milestone"]
   for category,label in awardParts:
    assert " - " in label
    title,date=label.split(" - ",1)
    matches=[x for x in cards if x["title"]==title and x["date"]==date]
    assert len(matches)==1,(pid,width,category,label,matches,cards)
    art=matches[0]["artwork"]
    if title.startswith("James Norris"):assert "james_norris.webp" in art,(pid,width,art)
    if title.startswith("Elected Assistant Captain"):assert "assistant_captain.webp" in art,(pid,width,art)
    if title.startswith("Conn Smythe"):assert "conn_smythe.webp" in art,(pid,width,art)
    if title.startswith("Hart Award"):assert "hart_mvp.webp" in art,(pid,width,art)
    if title.startswith("Rookie of the Year"):assert "rookie_of_the_year.webp" in art,(pid,width,art)
    if title.startswith("SVHL Cup"):assert "svhl_cup.webp" in art or "svhl-cup-champion" in art,(pid,width,art)
    assert matches[0]["border"]=="rgb(229, 182, 84)",(pid,width,matches[0])
   if pid=="354058" and width==355:
    driver.find_element("id","honorsSection").screenshot(str(R/"docs/261028_Alex_Separate_Norris_AssistantCaptain_355.png"))
   if pid=="652571" and width==355:
    driver.find_element("id","honorsSection").screenshot(str(R/"docs/261028_David_Three_Independent_Awards_355.png"))
   driver.execute_script("document.getElementById('lockerMilestones').click()")
   if pid=="354062":
    medal=driver.execute_script("""return [...document.querySelectorAll('#milestoneGrid .ph-earned-tile')].map(x=>({
      title:x.querySelector('.ph-earned-name')?.textContent,
      src:x.querySelector('img')?.src
     })).filter(x=>x.title==='50 Game Club');""")
    assert len(medal)==1 and "50_games_bronze_200.webp" in medal[0]["src"],(pid,width,medal)
  else:
   # A player with true platinum demonstrates top-rarity diamond finish.
   driver.execute_script("document.getElementById('lockerMilestones').click()")
   variants=driver.execute_script("""return [...document.querySelectorAll('#milestoneGrid .ph-earned-tile')].map(t=>{
    const s=getComputedStyle(t);
    return {tier:t.querySelector('.ph-earned-tier').textContent.trim(),
      border:s.borderTopColor,background:s.backgroundImage,
      sparkle:getComputedStyle(t,'::after').content,
      image:t.querySelector('img')?.src||''};
   })""")
   diamond=[x for x in variants if x["tier"]=="PLATINUM"]
   silver=[x for x in variants if x["tier"]=="SILVER"]
   assert diamond,(pid,width,"expected platinum sample")
   for x in diamond:
    assert x["border"]=="rgb(57, 199, 243)",(pid,width,x)
    assert ("65, 125, 212" in x["background"] or "radial-gradient" in x["background"]),(pid,width,x)
    assert "✦" in x["sparkle"],(pid,width,x)
   if silver:
    assert all(x["border"]=="rgb(185, 202, 217)" for x in silver)
    assert all(x["border"]!=silver[0]["border"] for x in diamond)
   if width==355:
    driver.find_element("id","milestoneSection").screenshot(str(R/"docs/261028_Platinum_Diamond_Finish_355.png"))
  # All tab shows independent inventory badges and the original source ledger
  # still carries one multiline entry per HTO record (not overwritten).
  driver.execute_script("document.getElementById('lockerAll').click()")
  for i in range(20):
   if driver.execute_script("return document.getElementById('allMore').hidden"):break
   driver.execute_script("document.getElementById('allMore').click()")
  else:raise AssertionError("All pagination failed to terminate")
  allCards=driver.execute_script("""return [...document.querySelectorAll('#allGrid .ph-inventory-card')].map(x=>({
    title:x.querySelector('.ph-inventory-name')?.textContent,
    meta:x.querySelector('.ph-inventory-kind')?.textContent,
    art:x.querySelector('img')?.src||''
  }));""")
  assert len(allCards)==display["all"]+records,(pid,width,len(allCards))
  if spec:
   for category,label in spec["lines"]:
    title=label.split(" - ")[0]
    hit=[x for x in allCards if x["title"]==title]
    assert hit,(pid,width,title,"missing separate All badge")
    if title=="Elected Assistant Captain":
     assert len(hit)==1 and "assistant_captain.webp" in hit[0]["art"]
   driver.execute_script("document.getElementById('historyDetails').open=true;const b=document.getElementById('expand');if(!b.hidden)b.click()")
   source=driver.execute_script("""return [...document.querySelectorAll('#legacy .ph-event')].map(x=>x.textContent)""")
   raw=spec["lines"][0][1]
   assert sum(raw in t for t in source)==1,(pid,width,"source entry lost")
   assert len(source)==len(original["items"]),(pid,width,len(source))
  assert driver.execute_script("return document.documentElement.scrollWidth<=innerWidth+4"),(pid,width,"overflow")
  total["sessions"]+=1
  total["originalSourceRowsChecked"]+=len(original["items"])
  total["presentationRowsChecked"]+=display["all"]
 assert ledger_path.read_bytes()==raw_before[0] and record_path.read_bytes()==raw_before[1]
 print(json.dumps({"status":"PASS_COMPOSITE_BADGES_AND_DISTINCT_DIAMOND_PLATINUM",
  "checks":dict(total),"compositeSourceRecords":3,"additionalDisplayBadges":4,
  "originalHTOWrites":0,"unchangedLedgerSHA256":hashlib.sha256(raw_before[0]).hexdigest()},indent=2))
finally:
 if driver:driver.quit()
 server.shutdown()
