"""Browser-level read-only release acceptance for all 43 profiles with legacy highlights."""
import functools, http.server, json, pathlib, threading
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.support.ui import WebDriverWait

root=pathlib.Path(__file__).resolve().parents[1]
ledger=json.loads((root/"widgets/player-highlights-ledger.json").read_text(encoding="utf-8"))
players={pid:p for pid,p in ledger["players"].items() if p["items"]}
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
handler=functools.partial(Quiet,directory=str(root))
srv=http.server.ThreadingHTTPServer(("127.0.0.1",0),handler)
threading.Thread(target=srv.serve_forever,daemon=True).start()
opts=Options()
opts.add_argument("--headless=new")
opts.add_argument("--disable-gpu")
opts.add_argument("--no-sandbox")
browser=None
results={"schema":"brave-hc-legacy-highlights-browser-acceptance/v1",
         "tested":0,"identities":len(players),"highlights":0,
         "awardImages":0,"clubImages":0,"retroactiveDedicationTitles":0,
         "missingImages":0,"horizontalOverflows":0,"widths":[355,810]}
try:
    browser=webdriver.Edge(options=opts)
    for pid,rec in players.items():
        for width in [355,810]:
            browser.set_window_size(width,850)
            browser.get(f"http://127.0.0.1:{srv.server_port}/widgets/player-highlights.html?playerID={pid}")
            WebDriverWait(browser,18).until(lambda d: d.execute_script("return document.querySelector('#legacy .ph-event')!==null"))
            browser.execute_script("const x=document.querySelector('#expand');if(x&&!x.hidden)x.click();document.querySelectorAll('#legacy .ph-event img').forEach(i=>i.loading='eager');")
            WebDriverWait(browser,18).until(lambda d: d.execute_script("return [...document.querySelectorAll('#legacy .ph-event img')].every(i=>i.complete)"))
            facts=browser.execute_script("""const rows=[...document.querySelectorAll('#legacy .ph-event')],imgs=[...document.querySelectorAll('#legacy .ph-event img')];
return {name:document.querySelector('#playerName').textContent,rows:rows.length,broken:imgs.filter(i=>!i.naturalWidth).map(i=>i.src),
award:imgs.filter(i=>i.src.includes('/assets/awards/')).length,clubs:imgs.filter(i=>i.src.includes('/assets/round-clubs/')).length,
titles:rows.map(r=>r.querySelector('.ph-event-title')?.textContent||''),
overflow:document.documentElement.scrollWidth>innerWidth+4,notice:document.querySelector('#notice').textContent};""")
            assert facts["name"]==rec["name"],(pid,"identity mismatch",facts["name"])
            assert facts["rows"]==len(rec["items"]),(pid,"item count",facts["rows"],len(rec["items"]))
            assert not facts["broken"],(pid,"missing asset",facts["broken"])
            assert not facts["overflow"],(pid,"horizontal scroll",width)
            assert not any("Bill Masterton" in x or "Award for Decidation" in x for x in facts["titles"]),(pid,"old label")
            expected_historic=sum(x["category"]=="award" and x["sourceText"].startswith("Bill Masterton Award for") for x in rec["items"])
            assert sum("Andrew Cristillo Award for Dedication" in x for x in facts["titles"])>=expected_historic,(pid,"award renaming")
            results["tested"]+=1
            if width==355:
                results["highlights"]+=facts["rows"]
                results["awardImages"]+=facts["award"]
                results["clubImages"]+=facts["clubs"]
                results["retroactiveDedicationTitles"]+=expected_historic
    assert results["tested"]==86,results
    assert results["highlights"]==343,results
    assert results["awardImages"]==105,results
    assert results["clubImages"]==97,results
    assert results["retroactiveDedicationTitles"]==10,results
    results["status"]="PASS"
    # Preserve the original PR #121 release receipt; write ongoing QA to a new file.
    receipt=root/"docs/261027_Profile_All43_Current_Responsive_QA.json"
    receipt.write_text(json.dumps(results,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(results,indent=2))
finally:
    if browser:browser.quit()
    srv.shutdown()
