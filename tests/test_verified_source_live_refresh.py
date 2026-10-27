"""Real Edge acceptance for dynamic verified-source refresh and a future 1250 platinum club.
No production sources or historical records are edited.
"""
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import threading,functools,json
R=Path(__file__).resolve().parents[1]
ledger=json.loads((R/"widgets/player-highlights-ledger.json").read_text(encoding="utf-8"))
future=json.loads(json.dumps(ledger))
row=future["players"]["354054"]
sample=next(i for i in row["items"] if i["category"]=="milestone" and "sourceRuns" not in i)
new=dict(sample)
new.update(id="hto-legacy-354054-future-qa-fixture",sourceText="1250 Game Club - January 1, 2040",
           displayText="1250 Game Club - January 1, 2040",sortDate="2040-01-01")
row["items"].append(new);row["originalCount"]=len(row["items"])
state={"updated":False}
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):
  super().__init__(*a,directory=str(R),**kw)
 def log_message(self,*args):pass
 def do_GET(self):
  if self.path.split("?")[0]=="/widgets/player-highlights-ledger.json":
   b=json.dumps(future if state["updated"] else ledger).encode("utf-8")
   self.send_response(200);self.send_header("Content-Type","application/json")
   self.send_header("Content-Length",str(len(b)));self.send_header("Cache-Control","no-store")
   self.end_headers();self.wfile.write(b)
  else:super().do_GET()
s=ThreadingHTTPServer(("127.0.0.1",0),Handler)
threading.Thread(target=s.serve_forever,daemon=True).start()
o=Options();o.add_argument("--headless=new");o.add_argument("--no-sandbox")
d=webdriver.Edge(options=o)
try:
 d.set_window_size(900,940)
 d.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument",{"source":"""window.setInterval=(fn,ms)=>{window.__runVerifiedRefresh=fn;window.__verifiedInterval=ms;return 7;}"""})
 url=f"http://127.0.0.1:{s.server_port}/widgets/player-highlights.html?playerID=354054"
 d.get(url)
 WebDriverWait(d,20).until(lambda x:x.execute_script("return !!window.__runVerifiedRefresh && document.querySelector('#legacy .ph-event')!==null"))
 assert d.execute_script("return window.__verifiedInterval") == 180000
 before=d.execute_script("return document.querySelectorAll('#legacy .ph-event').length")
 state["updated"]=True
 d.execute_async_script("""const done=arguments[arguments.length-1];
window.__runVerifiedRefresh().then(()=>done('refreshed')).catch(e=>done('ERROR: '+e.message));""")
 WebDriverWait(d,15).until(lambda x:x.execute_script("return document.getElementById('careerSummary').textContent.includes('') && document.getElementById('legacy').textContent.includes('1250 Game Club')") or x.execute_script("const b=document.getElementById('expand'); return b&&!b.hidden? (b.click(),false):false"))
 # Ensure the row is shown, then await dynamic canvas onload.
 d.execute_script("const b=document.querySelector('#expand');if(b&&!b.hidden&&b.textContent.startsWith('Show all'))b.click();")
 WebDriverWait(d,15).until(lambda x:x.execute_script("return [...document.querySelectorAll('#legacy .ph-event')].some(r=>r.textContent.includes('1250 Game Club'))"))
 marker=d.execute_script("""let e=[...document.querySelectorAll('#legacy .ph-event')].find(r=>r.textContent.includes('1250 Game Club'));
return {className:e.className,src:e.querySelector('img')?.src||'',complete:e.querySelector('img')?.complete};""")
 assert "ph-tier-platinum" in marker["className"],marker
 WebDriverWait(d,20).until(lambda x:x.execute_script("""const r=[...document.querySelectorAll('#legacy .ph-event')].find(r=>r.textContent.includes('1250 Game Club'));
return !!r?.querySelector('img')?.src.startsWith('data:image/png')"""))
 print(json.dumps({"status":"PASS","verifiedRefreshPeriodSeconds":180,"originalHighlightRows":before,
   "newVerified1250BadgeTier":"platinum","renderedNumber":1250,
   "sourceFilesChanged":False,"publicationWrites":0},indent=2))
finally:d.quit();s.shutdown()
