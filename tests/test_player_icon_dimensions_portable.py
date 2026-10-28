"""Portable browser-level CI test for released player icon sizes and integrity.

Default: Microsoft Edge on authorized BRUTTECH 1.
BRAVE_QA_BROWSER=chrome uses installed Chrome/ChromeDriver on GitHub Actions.
Reads only tracked fixture data and local static widgets; never modifies HTO records.
"""
import collections
import functools
import hashlib
import http.server
import json
import os
from pathlib import Path
import threading

from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait

ROOT=Path(__file__).resolve().parents[1]
LEDGER=json.loads((ROOT/"widgets/player-highlights-ledger.json").read_text(encoding="utf-8"))
PLAYERS={pid:p for pid,p in LEDGER["players"].items() if p["items"]}
HAS_APPROVED=(ROOT/"widgets/assets/approved/source-manifest.json").is_file()
EXPECTED={"approved":209,"club":97} if HAS_APPROVED else {"award":105,"club":97,"special":58,"heritage":46}
ICON_GROUPS={"award":"awards","club":"round-clubs","special":"special","heritage":"heritage","approved":"approved"}

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

def browser_driver():
    if os.getenv("BRAVE_QA_BROWSER","edge").lower()=="chrome":
        opts=webdriver.ChromeOptions()
        opts.add_argument("--headless=new")
        opts.add_argument("--disable-gpu")
        opts.add_argument("--no-sandbox")
        opts.add_argument("--disable-dev-shm-usage")
        opts.page_load_strategy="eager"
        return webdriver.Chrome(options=opts)
    opts=webdriver.EdgeOptions()
    opts.add_argument("--headless=new")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")
    opts.page_load_strategy="eager"
    return webdriver.Edge(options=opts)

def run():
    assert len(PLAYERS)==43
    assert sum(len(p["items"]) for p in PLAYERS.values())==306
    for group in ("awards","clubs","special","heritage"):
        path=ROOT/"widgets/assets"/group
        m=json.loads((path/"source-manifest.json").read_text("utf-8"))
        for asset in m["assets"]:
            fn=asset.get("file",Path(asset.get("path","")).name)
            b=(path/fn).read_bytes()
            assert len(b)==asset["bytes"],(fn,"length")
            assert hashlib.sha256(b).hexdigest()==asset["sha256"],(fn,"hash")
    server=http.server.ThreadingHTTPServer(("127.0.0.1",0),
        functools.partial(QuietHandler,directory=str(ROOT)))
    thread=threading.Thread(target=server.serve_forever,daemon=True)
    thread.start()
    driver=None
    result={"schema":"brave-hc-46-categorized-awards-pixel-parity/v1",
            "browser":os.getenv("BRAVE_QA_BROWSER","edge"),
            "profiles":len(PLAYERS),"sessions":0,"highlights":0,
            "categories":collections.Counter(),"blackPatch":0,"rolaids":0,"discipline":0,
            "badImages":0,"badSizes":0,"overflow":0}
    try:
        driver=browser_driver()
        driver.set_page_load_timeout(30)
        for pid,player in PLAYERS.items():
            for width in (355,810):
                driver.set_window_size(970,950)
                driver.execute_cdp_cmd("Emulation.setDeviceMetricsOverride",
                  {"width":width,"height":950,"deviceScaleFactor":1,"mobile":False})
                driver.get(f"http://127.0.0.1:{server.server_port}/widgets/player-highlights.html?playerID={pid}")
                WebDriverWait(driver,20).until(
                    lambda d:d.execute_script("return !!document.querySelector('#legacy .ph-event')"))
                driver.execute_script("""
                  const history=document.querySelector('#historyDetails');if(history)history.open=true;
                  const btn=document.querySelector('#expand');
                  if(btn&&!btn.hidden)btn.click();
                  document.querySelectorAll('#legacy .ph-event img').forEach(img=>img.loading='eager');
                """)
                WebDriverWait(driver,20).until(
                    lambda d:d.execute_script("return [...document.querySelectorAll('#legacy .ph-event img')].every(i=>i.complete)"))
                data=driver.execute_script("""
                  const expectedPx=arguments[0],rows=[...document.querySelectorAll('#legacy .ph-event')];
                  const imgs=[...document.querySelectorAll('#legacy .ph-event img')];
                  const title=r=>r.querySelector('.ph-event-title')?.textContent||'';
                  const categories=Object.fromEntries(['awards','round-clubs','special','heritage','approved'].map(g=>[g,
                    imgs.filter(i=>i.getAttribute('src').includes('/assets/'+g+'/')).length]));
                  const wrongSize=imgs.filter(i=> {
                    const r=i.parentElement.getBoundingClientRect();
                    return Math.round(r.width)!==expectedPx||Math.round(r.height)!==expectedPx;
                  }).map(i=>i.getAttribute('src'));
                  return {name:document.querySelector('#playerName')?.textContent,
                    rows:rows.length,viewport:innerWidth,categories,wrongSize,
                    broken:imgs.filter(i=>i.naturalWidth===0).map(i=>i.getAttribute('src')),
                    noImage:rows.filter(r=>!r.querySelector('img')).map(title),
                    opaqueFrames:imgs.filter(i=>{
                      const style=getComputedStyle(i.parentElement);
                      return style.backgroundColor!=='rgba(0, 0, 0, 0)'||parseFloat(style.borderTopWidth)>0;
                    }).map(i=>i.getAttribute('src')),
                    overflow:document.documentElement.scrollWidth>innerWidth+4,
                    norris:rows.filter(r=>title(r).includes('James Norris Award')).map(r=>r.querySelector('img')?.src||''),
                    patch:rows.filter(r=>title(r).includes('Andrew Cristillo Award for Dedication')).map(r=>({
                      logo:r.querySelector('img')?.src||'',
                      framed:!!r.querySelector('.ph-cristillo-black-patch')
                    })),
                    rolaids:rows.filter(r=>title(r).includes('Rolaids Relief Man Award')).map(r=>r.querySelector('img')?.src||''),
                    discipline:rows.filter(r=>title(r).includes('Game Suspension')).map(r=>r.querySelector('img')?.src||''),
                    tiers:rows.filter(r=>r.className.includes('ph-with-milestone-art')).map(r=>r.className),
                    titles:rows.map(title)
                  };
                """,48 if width==355 else 58)
                assert data["name"]==player["name"],(pid,"identity")
                assert data["rows"]==len(player["items"]),(pid,"missing highlight")
                assert data["viewport"]==width,(pid,"viewport",data["viewport"])
                assert not data["wrongSize"],(pid,width,"inconsistent icon sizes",data["wrongSize"])
                assert not data["broken"],(pid,width,"missing assets",data["broken"])
                assert not data["noImage"],(pid,width,"unbranded highlight",data["noImage"])
                assert not data["opaqueFrames"],(pid,width,"icon still surrounded by white tile",data["opaqueFrames"])
                assert not data["overflow"],(pid,width,"overflow")
                assert all("james-norris.webp" in u or "james_norris.webp" in u for u in data["norris"]),(pid,"Norris")
                assert all(("cristillo-dedication.webp" in x["logo"] or "andrew_cristillo.webp" in x["logo"]) and x["framed"]
                          for x in data["patch"]),(pid,"Cristillo black patch lost")
                assert all("rolaids-relief.webp" in x or "rolaids_relief.webp" in x for x in data["rolaids"]),(pid,"Rolaids")
                assert all("discipline_record.webp?v=whistle-cards-20261028" in u for u in data["discipline"]),(pid,"discipline artwork")
                assert not any("Bill Masterton Award" in x for x in data["titles"]),(pid,"old dedication label")
                result["sessions"]+=1
                if width==355:
                    result["highlights"]+=data["rows"]
                    for group,count in data["categories"].items():
                        key={v:k for k,v in ICON_GROUPS.items()}[group]
                        if count:result["categories"][key]+=count
                    result["blackPatch"]+=len(data["patch"])
                    result["rolaids"]+=len(data["rolaids"])
                    result["discipline"]+=len(data["discipline"])
        assert result["sessions"]==86,result
        assert result["highlights"]==306,result
        assert dict(result["categories"])==EXPECTED,result
        assert result["rolaids"]==2,result
        assert result["discipline"]==3,result
        assert result["blackPatch"]==11,result
        result["status"]="PASS"
        # Summary only. Do not rewrite release receipts during the CI run.
        result["categories"]=dict(result["categories"])
        print(json.dumps(result,indent=2))
    finally:
        if driver:driver.quit()
        server.shutdown()

if __name__=="__main__":
    run()
