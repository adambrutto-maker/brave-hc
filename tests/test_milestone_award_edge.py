"""Headless Edge browser smoke test of original award artwork and new club icons."""
import functools, http.server, json, pathlib, threading
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.support.ui import WebDriverWait

ROOT=pathlib.Path(__file__).resolve().parents[1]
handler=functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(ROOT))
server=http.server.ThreadingHTTPServer(("127.0.0.1",0),handler)
thread=threading.Thread(target=server.serve_forever,daemon=True)
thread.start()
options=Options()
options.add_argument("--headless=new")
options.add_argument("--disable-gpu")
options.add_argument("--no-sandbox")
driver=None
results=[]
try:
 driver=webdriver.Edge(options=options)
 for pid,width in [("354054",355),("354060",355),("354055",355),("634098",355),("354054",810)]:
  driver.set_window_size(width,930)
  driver.get(f"http://127.0.0.1:{server.server_port}/widgets/player-highlights.html?playerID={pid}")
  WebDriverWait(driver,20).until(lambda d: d.execute_script("return !!document.querySelector('#legacy .ph-event')"))
  driver.execute_script("const x=document.querySelector('#expand');if(x&&!x.hidden)x.click();")
  driver.execute_script("document.querySelectorAll('#legacy .ph-event img').forEach(i=>i.loading='eager')")
  WebDriverWait(driver,15).until(lambda d: d.execute_script("return [...document.querySelectorAll('#legacy .ph-event img')].every(i=>i.complete)"))
  r=driver.execute_script("""const rows=[...document.querySelectorAll('#legacy .ph-event')];
return {name:document.querySelector('#playerName').textContent,rows:rows.length,
 images:rows.flatMap(r=>[...r.querySelectorAll('img')].map(i=>({src:i.getAttribute('src'),alt:i.alt,width:i.naturalWidth}))),
 titles:rows.map(r=>r.querySelector('.ph-event-title')?.textContent||''),
 overflow:document.documentElement.scrollWidth>innerWidth+4,
 errors:document.querySelector('#notice').textContent};""")
  assert not r['overflow'], (pid,width,"horizontal overflow")
  assert all(i['width']>0 for i in r['images']), (pid,width,"broken image",r['images'])
  assert not any("Bill Masterton" in t or "Decidation" in t for t in r['titles']), (pid,"historic name")
  if pid=="354054":
   assert len([t for t in r['titles'] if "Andrew Cristillo Award for Dedication" in t])==3
   assert any("club-game-300.svg" in i["src"] for i in r['images'])
  if pid=="354055":
   assert any("club-win-100.svg" in i["src"] for i in r['images'])
   assert any("club-win-50.svg" in i["src"] for i in r['images'])
  if pid=="634098":
   assert any("Andrew Cristillo Award for Dedication" in t for t in r['titles'])
  if pid=="354060":
   assert any("cristillo-dedication.webp" in i["src"] for i in r['images'])
  results.append({"id":pid,"width":width,"name":r["name"],"rows":r["rows"],
                  "awardImages":sum("assets/awards/" in i["src"] for i in r["images"]),
                  "clubImages":sum("assets/clubs/" in i["src"] for i in r["images"]),
                  "brokenImages":0,"horizontalOverflow":False})
 print(json.dumps({"status":"PASS","results":results},indent=2))
finally:
 if driver:driver.quit()
 server.shutdown()
