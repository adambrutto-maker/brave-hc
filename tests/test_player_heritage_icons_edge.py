"""Full 43-profile original Brave H.C. historical Highlights artwork browser acceptance."""
import functools,http.server,json,pathlib,threading
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.support.ui import WebDriverWait

ROOT=pathlib.Path(__file__).resolve().parents[1]
d=json.loads((ROOT/"widgets/player-highlights-ledger.json").read_text(encoding="utf-8"))
players={pid:p for pid,p in d["players"].items() if p["items"]}
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(("127.0.0.1",0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
options=Options();options.add_argument("--headless=new");options.add_argument("--disable-gpu")
options.add_argument("--no-sandbox");options.page_load_strategy="eager"
browser=None
rec={"schema":"brave-hc-historical-icons-complete-browser/v1","sessions":0,"players":0,
     "highlights":0,"award":0,"club":0,"special":0,"heritage":0,
     "norris":0,"imagesMissing":0,"genericBadges":0,"layoutOverflows":0,"widths":[355,810]}
try:
 browser=webdriver.Edge(options=options)
 for pid,p in players.items():
  for width in [355,810]:
   browser.set_window_size(900,980)
   browser.execute_cdp_cmd("Emulation.setDeviceMetricsOverride", {"width":width,"height":980,"deviceScaleFactor":1,"mobile":False})
   browser.get(f"http://127.0.0.1:{server.server_port}/widgets/player-highlights.html?playerID={pid}")
   WebDriverWait(browser,20).until(lambda b:b.execute_script("return !!document.querySelector('#legacy .ph-event')"))
   browser.execute_script("const e=document.querySelector('#expand');if(e&&!e.hidden)e.click();document.querySelectorAll('#legacy img').forEach(i=>i.loading='eager');")
   WebDriverWait(browser,20).until(lambda b:b.execute_script("return [...document.querySelectorAll('#legacy img')].every(i=>i.complete)"))
   fact=browser.execute_script("""const rows=[...document.querySelectorAll('#legacy .ph-event')];
const imgs=[...document.querySelectorAll('#legacy img')];
return {name:document.querySelector('#playerName').textContent,rows:rows.length,
 counts:Object.fromEntries(['awards','round-clubs','special','heritage'].map(p=>[p,imgs.filter(i=>i.src.includes('/assets/'+p+'/')).length])),
 broken:imgs.filter(i=>!i.naturalWidth).map(i=>i.src),generic:rows.filter(r=>!r.querySelector('img')).map(r=>r.textContent),
 wrongSize:imgs.filter(i=>Math.round(i.parentElement.getBoundingClientRect().width)!==arguments[0]||Math.round(i.parentElement.getBoundingClientRect().height)!==arguments[0]).map(i=>i.src),viewport:innerWidth,
 norris:rows.filter(r=>r.querySelector('.ph-event-title')?.textContent.includes('James Norris Award'))
   .map(r=>r.querySelector('img')?.src||''),
 overflow:document.documentElement.scrollWidth>innerWidth+4,
 titles:rows.map(r=>r.querySelector('.ph-event-title')?.textContent||'')};""",48 if width==355 else 58)
   assert fact["name"]==p["name"],(pid,"identity")
   assert fact["rows"]==len(p["items"]),(pid,"missing highlights")
   assert not fact["broken"],(pid,"broken artwork",fact["broken"])
   assert not fact["wrongSize"],(pid,"inconsistent icon dimension",width,fact["wrongSize"])
   assert fact["viewport"]==width,(pid,"wrong mobile viewport",fact["viewport"])
   assert not fact["generic"],(pid,"generic icon remains",fact["generic"])
   assert not fact["overflow"],(pid,"horizontal overflow",width)
   assert all("james-norris.webp" in x for x in fact["norris"]),(pid,"Norris")
   assert not any("Bill Masterton Award" in x for x in fact["titles"]),(pid,"old dedication award naming")
   rec["sessions"]+=1
   if width==355:
    rec["players"]+=1;rec["highlights"]+=fact["rows"]
    for key,k in [("award","awards"),("club","clubs"),("special","special"),("heritage","heritage")]:
     rec[key]+=fact["counts"][k]
    rec["norris"]+=len(fact["norris"])
 assert rec["sessions"]==86,rec
 assert rec["players"]==43 and rec["highlights"]==343,rec
 assert (rec["award"],rec["club"],rec["special"],rec["heritage"])==(105,97,58,46),rec
 assert rec["norris"]==16,rec
 rec["status"]="PASS"
 out=ROOT/"docs/261027_All306_Historical_Image_Coverage_QA.json"
 out.write_text(json.dumps(rec,indent=2)+"\n",encoding="utf-8")
 print(json.dumps(rec,indent=2))
finally:
 if browser:browser.quit()
 server.shutdown()
