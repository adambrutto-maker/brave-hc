"""Real Edge visual and source-integrity acceptance of earned milestone wall."""
import collections,functools,http.server,json,threading,os
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.support.ui import WebDriverWait
R=Path(__file__).resolve().parents[1]
ledger=json.loads((R/"widgets/player-highlights-ledger.json").read_text(encoding="utf8"))
players={pid:p for pid,p in ledger["players"].items() if p["items"]}
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(("127.0.0.1",0),functools.partial(Handler,directory=str(R)))
threading.Thread(target=server.serve_forever,daemon=True).start()
kind=os.getenv('BRAVE_QA_BROWSER','edge').lower()
o=webdriver.ChromeOptions() if kind=='chrome' else Options()
o.add_argument('--headless=new');o.add_argument('--no-sandbox')
if kind=='chrome':o.add_argument('--disable-dev-shm-usage')
d=webdriver.Chrome(options=o) if kind=='chrome' else webdriver.Edge(options=o)
totals=collections.Counter();samples=[]
try:
 for pid,player in players.items():
  for width in (355,810):
   d.set_window_size(975,980)
   d.execute_cdp_cmd("Emulation.setDeviceMetricsOverride",{"width":width,"height":980,"deviceScaleFactor":1,"mobile":False})
   d.get(f"http://127.0.0.1:{server.server_port}/widgets/player-highlights.html?playerID={pid}")
   WebDriverWait(d,18).until(lambda x:x.execute_script("return !!document.getElementById('milestoneGrid') && !!document.querySelector('#legacy .ph-event')"))
   current=d.execute_script("""const section=document.getElementById('milestoneSection'),grid=document.getElementById('milestoneGrid'),
    tiles=[...grid.querySelectorAll('.ph-earned-tile')],history=[...document.querySelectorAll('#legacy .ph-event')],
    filters=[...document.querySelectorAll('#milestoneFilters button')];
    return {name:document.getElementById('playerName').textContent,hidden:section.hidden,earned:tiles.length,
      img:tiles.map(t=>t.querySelector('img')?.src||''),header:section.querySelector('h3').textContent,
      visibleGridColumns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,
      titles:tiles.map(t=>t.textContent),sourceCount:document.querySelector('#milestoneCount').textContent,
      filters:filters.map(b=>b.textContent),outOfBounds:document.documentElement.scrollWidth>innerWidth+4,
      history:history.length};""")
   expected=sum(i["category"]=="milestone" for i in player["items"])
   assert current["name"]==player["name"] and current["hidden"]==(expected==0),(pid,current)
   assert current["earned"]==expected,(pid,current,expected)
   assert not current["outOfBounds"],(pid,width,"horizontal overflow")
   if expected:assert current["visibleGridColumns"]==(2 if width==355 else 3),(pid,width,current["visibleGridColumns"])
   assert all("assets/round-clubs/" in path or path.startswith("data:image/png;base64,") or "brave_hc_logo.png" in path for path in current["img"]),(pid,"invalid original or verified future club badge")
   extra_expected=sum(i.get("provenance")=="OFFICIAL_DATED_HTO_AWARDS_PARITY" for i in player["items"])
   assert sum("assets/round-clubs/" not in path for path in current["img"])==extra_expected,(pid,"future verified club art mismatch")
   assert len(current["titles"])==expected,(pid,"missing badge")
   assert all("UNLOCKED" in s and "Earned " in s for s in current["titles"]),(pid,current)
   if expected:
    first_date=current["titles"][0]
    assert current["sourceCount"]==str(expected)+" earned",(pid,current)
    d.execute_script("document.querySelectorAll('#milestoneGrid img').forEach(i=>i.loading='eager');")
    WebDriverWait(d,18).until(lambda x:x.execute_script("return [...document.querySelectorAll('#milestoneGrid img')].every(i=>i.complete)"))
    assert d.execute_script("return [...document.querySelectorAll('#milestoneGrid img')].every(i=>i.naturalWidth>0)"),pid
    tabs=current["filters"]
    assert tabs and tabs[0].startswith("All (")
    for metric in ("Games","Points","Wins","Goals","Assists","Shutouts"):
     if not any(f.startswith(metric+" (") for f in tabs):continue
     d.execute_script("""const target=arguments[0];[...document.querySelectorAll('#milestoneFilters button')].find(b=>b.textContent.startsWith(target)).click();""",metric+" (")
     filtered=d.execute_script("""return {count:document.querySelectorAll('#milestoneGrid .ph-earned-tile').length,
       active:[...document.querySelectorAll('#milestoneFilters button')].filter(b=>b.getAttribute('aria-pressed')==='true').map(b=>b.textContent)};""")
     assert filtered["count"]==sum(i["category"]=="milestone" and (" "+metric[:-1]+" Club") in i["sourceText"] for i in player["items"]),(pid,metric,filtered)
     assert len(filtered["active"])==1 and filtered["active"][0].startswith(metric),(pid,filtered)
    d.execute_script("document.querySelector('#milestoneFilters button').click();")
   if kind=='edge' and (pid,width) in [("354054",355),("354054",810),("354060",810)]:
    el=d.find_element("id","milestoneSection")
    el.screenshot(str(R/f"docs/261028_Milestone_Wall_{pid}_{width}.png"))
    samples.append({"id":pid,"width":width,"milestones":expected})
   totals["sessions"]+=1;totals["badges"]+=expected if width==355 else 0
   if width==355:totals["profiles"]+=1
 assert totals["sessions"]==86 and totals["badges"]==134 and totals["profiles"]==43,totals
 print(json.dumps({"status":"PASS","totals":dict(totals),"sampleScreenshots":samples},indent=2))
finally:d.quit();server.shutdown()
