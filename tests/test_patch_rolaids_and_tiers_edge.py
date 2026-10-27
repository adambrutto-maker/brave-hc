"""QA: 32-73 patch and original Relief artwork, tier sizes on mobile/desktop."""
import functools,http.server,json,pathlib,threading
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.support.ui import WebDriverWait
root=pathlib.Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
srv=http.server.ThreadingHTTPServer(("127.0.0.1",0),functools.partial(Quiet,directory=str(root)))
threading.Thread(target=srv.serve_forever,daemon=True).start()
opt=Options();opt.add_argument("--headless=new");opt.add_argument("--no-sandbox")
browser=webdriver.Edge(options=opt)
result={"schema":"brave-hc-award-fidelity-and-scaled-milestones/v1","records":[]}
cases=[
 ("354054","Andrew Cristillo Award for Dedication","cristillo-dedication.webp"),
 ("595514","Rolaids Relief Man Award","rolaids-relief.webp"),
 ("736317","Rolaids Relief Man Award","rolaids-relief.webp")]
try:
 for width in [355,810]:
  browser.set_window_size(900,920)
  browser.execute_cdp_cmd("Emulation.setDeviceMetricsOverride", {"width":width,"height":920,"deviceScaleFactor":1,"mobile":False})
  for pid,needle,file in cases:
   browser.get(f"http://127.0.0.1:{srv.server_port}/widgets/player-highlights.html?playerID={pid}")
   WebDriverWait(browser,20).until(lambda d:d.execute_script("return !!document.querySelector('#legacy .ph-event')"))
   browser.execute_script("const x=document.querySelector('#expand');if(x&&!x.hidden)x.click();document.querySelectorAll('#legacy img').forEach(i=>i.loading='eager');")
   WebDriverWait(browser,15).until(lambda d:d.execute_script("return [...document.querySelectorAll('#legacy img')].every(i=>i.complete)"))
   info=browser.execute_script("""const needle=arguments[0],rows=[...document.querySelectorAll('#legacy .ph-event')];
    const row=rows.find(x=>x.textContent.includes(needle));
    const award=row?.querySelector('img');
    const club=rows.find(x=>x.className.includes('ph-with-milestone-art'))?.querySelector('img');
    const aBox=award?.getBoundingClientRect(),aParent=award?.parentElement.getBoundingClientRect();
    const cParent=club?.parentElement.getBoundingClientRect();
    return {award:award?.getAttribute('src')||null, naturalWidth:award?.naturalWidth||0,
      patch:row?.querySelector('.ph-cristillo-black-patch')!==null,
      awardW:aParent?.width,awardH:aParent?.height,clubW:cParent?.width,clubH:cParent?.height,
      imgW:aBox?.width,rowText:row?.textContent||'',rowCount:rows.length};""",needle)
   assert info["award"] and file in info["award"],(pid,info)
   assert info["naturalWidth"]>0,(pid,"broken")
   target=48 if width==355 else 58
   assert info["awardW"]==target and info["awardH"]==target,(pid,width,"award size",info)
   if info["clubW"] is not None:
    assert info["clubW"]==target and info["clubH"]==target,(pid,width,"milestone icon not same size",info)
   if "cristillo" in file:assert info["patch"],(pid,"black patch frame missing")
   result["records"].append({"pid":pid,"width":width,"art":file,"size":target,"loaded":True})
 result["status"]="PASS"
 (root/"docs/261027_BlackPatch_Rolaids_Milestone_Parity_QA.json").write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
 print(json.dumps(result,indent=2))
finally:
 browser.quit();srv.shutdown()
