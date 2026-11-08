"""Fail-closed browser test of newer current HTO source superseding stale participant data."""
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import json,threading,copy,functools,os
R=Path(__file__).resolve().parents[1]
old=json.loads((R/"widgets/player-actuals.json").read_text("utf8"))
new=copy.deepcopy(old)
new["asOf"]="2026-11-03T10:00:00Z" # source-qualified synthetic future fixture only
new["teamGP"]+=1
player=next(p for p in new["players"] if p["name"]=="Brutto, Adam")
player["gp"]+=1;player["a"]+=1;player["pts"]+=1
new["teamAssists"]+=1;new["teamPlayerPoints"]+=1
state={"kind":"old"}
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(R),**kw)
 def log_message(self,*a):pass
 def do_GET(self):
  if self.path.split("?")[0]=="/widgets/player-actuals-hourly.json":
   self.send_error(404);return
  if self.path.split("?")[0]=="/widgets/player-actuals.json":
   obj=old if state["kind"]=="old" else new
   if state["kind"]=="invalid":obj=copy.deepcopy(new);obj["status"]="UNVERIFIED_FROM_PREDICTED_AWARDS"
   if state["kind"]=="badTotals":obj=copy.deepcopy(new);obj["teamPlayerPoints"]+=4
   b=json.dumps(obj).encode("utf8")
   self.send_response(200);self.send_header("Content-Type","application/json")
   self.send_header("Content-Length",str(len(b)));self.send_header("Cache-Control","no-store")
   self.end_headers();self.wfile.write(b);return
  return super().do_GET()
server=ThreadingHTTPServer(("127.0.0.1",0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
browser_kind=os.environ.get("BRAVE_QA_BROWSER","edge").lower()
opt=webdriver.ChromeOptions() if browser_kind=="chrome" else Options()
opt.add_argument("--headless=new");opt.add_argument("--no-sandbox")
if browser_kind=="chrome":opt.add_argument("--disable-dev-shm-usage")
browser=None
try:
 browser=webdriver.Chrome(options=opt) if browser_kind=="chrome" else webdriver.Edge(options=opt)
 browser.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument",{"source":"""
 window.__callbacks={};
 window.setInterval=(fn,ms)=>{window.__callbacks[ms]=fn;return ms;};
 """})
 browser.get(f"http://127.0.0.1:{server.server_port}/widgets/player-highlights.html?playerID=354054")
 WebDriverWait(browser,20).until(lambda d:d.execute_script("return !!window.__callbacks[3600000] && !!window.__callbacks[180000] && document.getElementById('statsDate').textContent.includes('2026')"))
 first=browser.execute_script("""return {snapshot:document.getElementById('currentSection').textContent,
    date:document.getElementById('statsDate').textContent,
    contexts:document.querySelectorAll('#currentSection .ph-source').length,
    highlights:document.querySelectorAll('#legacy .ph-event').length};""")
 source_day=browser.execute_script("return new Date(arguments[0]).toLocaleDateString('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'short',day:'numeric'})",old['asOf'])
 assert source_day in first['date'] and 'HTO games played' in first['snapshot'],first
 assert str(next(p['gp'] for p in old['players'] if p['name']=='Brutto, Adam')) in first['snapshot'],first
 for condition in ("invalid","badTotals"):
  state["kind"]=condition
  browser.execute_async_script("const done=arguments[arguments.length-1];window.__callbacks[3600000]().then(()=>done('ok')).catch(e=>done(e.message))")
  current=browser.execute_script("return document.getElementById('statsDate').textContent")
  assert current==first["date"],("unverified update displayed",condition,current)
 state["kind"]="new"
 browser.execute_async_script("const done=arguments[arguments.length-1];window.__callbacks[3600000]().then(()=>done('ok')).catch(e=>done(e.message))")
 WebDriverWait(browser,12).until(lambda d:"Nov 3" in d.execute_script("return document.getElementById('statsDate').textContent"))
 result=browser.execute_script("""return {snapshot:document.getElementById('currentSection').textContent,
    date:document.getElementById('statsDate').textContent,
    contexts:document.querySelectorAll('#currentSection .ph-source').length,
    highlights:document.querySelectorAll('#legacy .ph-event').length};""")
 assert result["contexts"]==1,(result,"duplicate context")
 assert result["highlights"]==first["highlights"],(result,"history changed")
 assert "6" in result["snapshot"] and "2" in result["snapshot"],result
 print(json.dumps({"status":"PASS","originalHTO":old['asOf'][:10],"newHTO":new['asOf'][:10],
 "newerVerifiedReplacedStale":True,"invalidStatusRejected":True,
 "incorrectTeamTotalsRejected":True,"noAwardMutation":True,
 "hourlyRefresh":3600000,"historicalRefresh":180000,"sourceContextCount":1},indent=2))
finally:
 if browser:browser.quit()
 server.shutdown()
