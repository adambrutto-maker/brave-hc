"""Browser QA: independent hourly HTO stats source and newer verified source refresh."""
import copy,functools,http.server,json,os,threading
from datetime import datetime,timedelta
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.support.ui import WebDriverWait
ROOT=Path(__file__).resolve().parents[1]
old=json.loads((ROOT/"widgets/player-actuals-hourly.json").read_text(encoding="utf-8"))
participant=json.loads((ROOT/"widgets/awards-participants.json").read_text(encoding="utf-8"))
actual=json.loads((ROOT/"widgets/player-actuals.json").read_text(encoding="utf-8"))
assert participant["status"]=="UNRANKED_VERIFIED_SEASON_APPEARANCES_NOT_AWARD_SCORES"
assert participant["officialTeamGames"]==old["teamGP"]==7
future=copy.deepcopy(old)
# The synthetic newer hourly source must be newer than the current verified
# participant/actual feeds; old fixed October dates would already be stale.
source_times=[datetime.fromisoformat(t.replace("Z","+00:00")) for t in
 [old["asOf"],actual["asOf"],participant["sourceReference"]["htoReadback"]]]
future["asOf"]=(max(source_times)+timedelta(days=1)).isoformat()
future["teamGP"]+=1
p=next(x for x in future["players"] if x["name"]=="Brutto, Adam")
p["gp"]+=1;p["a"]+=1;p["pts"]+=1
future["teamAssists"]+=1;future["teamPlayerPoints"]+=1
state={"mode":"existing"}
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def log_message(self,*args):pass
 def do_GET(self):
  if self.path.split("?")[0]=="/widgets/player-actuals-hourly.json":
   mode=state["mode"]
   if mode=="unavailable":
    self.send_error(404);return
   obj=old if mode=="existing" else copy.deepcopy(future)
   if mode=="unverified":obj["status"]="MODEL_BASED_AWARD_GUESSES"
   if mode=="bad-aggregate":obj["teamPlayerPoints"]+=2
   body=json.dumps(obj).encode("utf-8")
   self.send_response(200)
   self.send_header("Content-Type","application/json")
   self.send_header("Content-Length",str(len(body)))
   self.send_header("Cache-Control","no-store")
   self.end_headers();self.wfile.write(body)
   return
  super().do_GET()
server=http.server.ThreadingHTTPServer(("127.0.0.1",0),functools.partial(Handler))
threading.Thread(target=server.serve_forever,daemon=True).start()
kind=os.getenv("BRAVE_QA_BROWSER","edge").lower()
opts=webdriver.ChromeOptions() if kind=="chrome" else Options()
opts.add_argument("--headless=new");opts.add_argument("--no-sandbox")
if kind=="chrome":opts.add_argument("--disable-dev-shm-usage")
browser=None
try:
 browser=webdriver.Chrome(options=opts) if kind=="chrome" else webdriver.Edge(options=opts)
 browser.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument",{"source":"""
 window.__intervals={};
 window.setInterval=(fn,ms)=>{window.__intervals[ms]=fn;return ms;};
 """})
 url=f"http://127.0.0.1:{server.server_port}/widgets/player-highlights.html?playerID=354054"
 browser.get(url)
 WebDriverWait(browser,20).until(lambda d:d.execute_script("return !!window.__intervals[3600000] && !!window.__intervals[180000] && !!document.querySelector('#statsDate').textContent"))
 def read():
  return browser.execute_script("""return {timestamp:document.querySelector('#statsDate').textContent,
     scoring:document.querySelector('#currentSection').textContent,
     historicalCount:document.querySelectorAll('#legacy .ph-event').length,
     sourceCount:document.querySelectorAll('#currentSection .ph-source').length};""")
 init=read()
 assert "Stats snapshot" in init["timestamp"],init
 assert "Points per game" in init["scoring"],init
 assert "HTO games played" not in init["scoring"],("stale hourly actuals overrode verified newer participant",init)
 for mode in ("unverified","bad-aggregate"):
  state["mode"]=mode
  browser.execute_async_script("const done=arguments[arguments.length-1];window.__intervals[3600000]().then(()=>done('ok')).catch(e=>done(e.message))")
  assert read()["timestamp"]==init["timestamp"],(mode,read())
 state["mode"]="new"
 browser.execute_async_script("const done=arguments[arguments.length-1];window.__intervals[3600000]().then(()=>done('ok')).catch(e=>done(e.message))")
 WebDriverWait(browser,12).until(lambda d:"HTO games played" in d.execute_script("return document.querySelector('#currentSection').textContent"))
 later=read()
 assert later["sourceCount"]==1 and later["historicalCount"]==init["historicalCount"],later
 assert later["scoring"]!=init["scoring"],later
 assert later["timestamp"]!=init["timestamp"],("New verified hourly readback not selected",later)
 assert "HTO games played" in later["scoring"],later
 assert str(p["gp"]) in later["scoring"],("New player GP not shown",later)
 assert "HTO assists" in later["scoring"] and str(p["a"]) in later["scoring"],later
 print(json.dumps({"status":"PASS","initialPublishedHTOHour":participant["sourceReference"]["htoReadback"],
  "laterSource":future["asOf"],"historicalAwardsUnchanged":True,
  "unverifiedRejected":True,"aggregateDriftRejected":True,
  "verifiedHourlySelected":True,"verifiedHistoryPollSeconds":180,
  "currentStatsPollSeconds":3600},indent=2))
finally:
 if browser:browser.quit()
 server.shutdown()
