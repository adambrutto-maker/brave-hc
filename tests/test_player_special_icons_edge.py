"""All-43-profile responsive QA for Cup, All-Star and James Norris artwork."""
import functools,http.server,json,pathlib,threading
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.support.ui import WebDriverWait
root=pathlib.Path(__file__).resolve().parents[1]
d=json.loads((root/"widgets/player-highlights-ledger.json").read_text(encoding="utf-8"))
players={pid:p for pid,p in d["players"].items() if p["items"]}
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(("127.0.0.1",0),functools.partial(Quiet,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
op=Options();op.add_argument("--headless=new");op.add_argument("--disable-gpu");op.add_argument("--no-sandbox")
browser=None
rec={"schema":"brave-hc-special-icons-browser-acceptance/v1","profiles":0,"highlights":0,
     "awardImages":0,"clubImages":0,"specialImages":0,"norrisVerified":0,
     "missedAssets":0,"overflow":0,"widths":[355,810]}
try:
 browser=webdriver.Edge(options=op)
 for pid,p in players.items():
  for width in rec["widths"]:
   browser.set_window_size(width,950)
   browser.get(f"http://127.0.0.1:{server.server_port}/widgets/player-highlights.html?playerID={pid}")
   WebDriverWait(browser,20).until(lambda b:b.execute_script("return !!document.querySelector('#legacy .ph-event')"))
   browser.execute_script("const b=document.querySelector('#expand');if(b&&!b.hidden)b.click();document.querySelectorAll('#legacy img').forEach(i=>i.loading='eager');")
   WebDriverWait(browser,20).until(lambda b:b.execute_script("return [...document.querySelectorAll('#legacy img')].every(i=>i.complete)"))
   x=browser.execute_script("""const rows=[...document.querySelectorAll('#legacy .ph-event')],images=[...document.querySelectorAll('#legacy img')];
return {name:document.querySelector('#playerName').textContent,rows:rows.length,
award:images.filter(x=>x.src.includes('/assets/awards/')).length,
club:images.filter(x=>x.src.includes('/assets/full-crest-clubs/')).length,
special:images.filter(x=>x.src.includes('/assets/special/')).length,
broken:images.filter(x=>!x.naturalWidth).map(x=>x.src),
norris:rows.filter(x=>x.querySelector('.ph-event-title')?.textContent.includes('James Norris Award')).map(x=>x.querySelector('img')?.src||''),
overflow:document.documentElement.scrollWidth>innerWidth+4};""")
   assert x["name"]==p["name"],(pid,"identity")
   assert x["rows"]==len(p["items"]),(pid,"rows")
   assert not x["broken"],(pid,"missing images",x["broken"])
   assert not x["overflow"],(pid,"horizontal overflow",width)
   assert all("james-norris.webp" in src for src in x["norris"]),(pid,"James Norris emblem not loaded",x["norris"])
   if width==355:
    rec["highlights"]+=x["rows"];rec["awardImages"]+=x["award"]
    rec["clubImages"]+=x["club"];rec["specialImages"]+=x["special"]
    rec["norrisVerified"]+=len(x["norris"])
   rec["profiles"]+=1
 assert rec["profiles"]==86,rec
 assert rec["highlights"]==343,rec
 assert rec["awardImages"]==105,rec
 assert rec["clubImages"]==97,rec
 assert rec["specialImages"]==58,rec
 assert rec["norrisVerified"]==16,rec
 rec["status"]="PASS"
 (root/"docs/261027_Brave_HC_Special_Icons_All43_Browser_QA.json").write_text(json.dumps(rec,indent=2)+"\n",encoding="utf-8")
 print(json.dumps(rec,indent=2))
finally:
 if browser:browser.quit()
 server.shutdown()
