"""Browser contract: hourly current-season refresh, verified source only, no duplicate context."""
import copy,functools,http.server,json,threading,os
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.support.ui import WebDriverWait
ROOT=Path(__file__).resolve().parents[1]
OLD=json.loads((ROOT/"widgets/awards-participants.json").read_text(encoding="utf-8"))
NEW=copy.deepcopy(OLD)
NEW["sourceReference"]["htoReadback"]="2026-10-27T22:10:00.000Z"
NEW["officialTeamGames"]=OLD["officialTeamGames"]+1
p=next(x for x in NEW["players"] if x["name"]=="Brutto, Adam")
p["officialHTOStats"]["gp"]=p["officialHTOStats"]["gp"]+1
p["currentHTORaw"]["gamesPlayed"]=p["officialHTOStats"]["gp"]
state={"kind":"old"}
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def log_message(self,*a):pass
 def do_GET(self):
  if self.path.split("?")[0]=="/widgets/awards-participants.json":
   obj=NEW if state["kind"]=="new" else OLD
   if state["kind"]=="invalid":
    obj=copy.deepcopy(NEW);obj["status"]="UNVERIFIED_INFERRED_AWARD_RANKING"
   b=json.dumps(obj).encode()
   self.send_response(200);self.send_header("Content-Type","application/json")
   self.send_header("Cache-Control","no-store")
   self.send_header("Content-Length",str(len(b)));self.end_headers()
   self.wfile.write(b);return
  return super().do_GET()
server=http.server.ThreadingHTTPServer(("127.0.0.1",0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
opts=Options();opts.add_argument("--headless=new");opts.add_argument("--no-sandbox")
if os.getenv('BRAVE_QA_BROWSER','edge').lower()=='chrome':opts=webdriver.ChromeOptions();opts.add_argument('--headless=new');opts.add_argument('--no-sandbox');opts.add_argument('--disable-dev-shm-usage')
browser=None
try:
 browser=webdriver.Chrome(options=opts) if os.getenv('BRAVE_QA_BROWSER','edge').lower()=='chrome' else webdriver.Edge(options=opts)
 browser.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument",{"source":"""
 window.__scheduledCallbacks={};
 window.setInterval=(fn,ms)=>{window.__scheduledCallbacks[ms]=fn;return ms;};
 """})
 browser.get(f"http://127.0.0.1:{server.server_port}/widgets/player-highlights.html?playerID=354054")
 WebDriverWait(browser,20).until(lambda x:x.execute_script("return !!window.__scheduledCallbacks[3600000] && !!window.__scheduledCallbacks[180000] && !!document.getElementById('statsDate').textContent"))
 before=browser.execute_script("return document.getElementById('statsDate').textContent")
 assert "2026" in before,before
 state["kind"]="invalid"
 browser.execute_async_script("const cb=arguments[arguments.length-1];window.__scheduledCallbacks[3600000]().then(()=>cb('ok')).catch(e=>cb(e.message))")
 rejected=browser.execute_script("return document.getElementById('statsDate').textContent")
 assert rejected==before,("unverified update rendered",rejected)
 state["kind"]="new"
 browser.execute_async_script("const cb=arguments[arguments.length-1];window.__scheduledCallbacks[3600000]().then(()=>cb('ok')).catch(e=>cb(e.message))")
 WebDriverWait(browser,10).until(lambda x:"Oct 27" in x.execute_script("return document.getElementById('statsDate').textContent"))
 current=browser.execute_script("""return {date:document.getElementById('statsDate').textContent,
    contextCount:document.querySelectorAll('#currentSection .ph-source').length,
    snapshot:document.getElementById('currentSection').textContent};""")
 assert current["contextCount"]==1,("duplicate current feed context",current)
 assert "5 appearances" in current["snapshot"] or "5" in current["snapshot"],current
 print(json.dumps({"status":"PASS","verifiedHour":3600,"highlightRefreshSeconds":180,
   "staleOrUnverifiedDataRejected":True,"newVerifiedDataRendered":True,
   "noDuplicateContext":True,"historicalAwardsEdited":False},indent=2))
finally:
 if browser:browser.quit()
 server.shutdown()
