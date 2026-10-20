#!/usr/bin/env python3
"""Read-only Brave H.C. live browser smoke test.

Loads official HTO homepage and the externally hosted goalie widget through
headless Chrome. Verifies rendered game rows against verified GitHub feed.
Never signs in, clicks, edits, posts, confirms a goalie or sends messages.
"""
from __future__ import annotations
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.request
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from bs4 import BeautifulSoup

HOME="https://www.htosports.com/teams/?u=BRAVESHOCKEY&s=hockey"
WIDGET="https://adambrutto-maker.github.io/brave-hc/widgets/goalie-schedule-v1.2-HTO-embed.html"
RAW="https://raw.githubusercontent.com/adambrutto-maker/brave-hc/main/widgets/"
TZ=ZoneInfo("America/Toronto")


def get(url):
    req=urllib.request.Request(url,headers={"User-Agent":"BraveHC-GoalieSmoke/1.0"})
    with urllib.request.urlopen(req,timeout=25) as result:
        return result.read().decode("utf-8")

def chrome_path():
    env=os.environ.get("CHROME_BIN")
    for name in (env,"google-chrome","google-chrome-stable","chromium","chromium-browser"):
        if name and (shutil.which(name) or os.path.isfile(name)):
            return shutil.which(name) or name
    raise RuntimeError("No headless Chrome available for browser QA")

def render(chrome,url,viewport):
    result=subprocess.run([
        chrome,"--headless","--disable-gpu","--disable-extensions","--no-first-run",
        "--no-default-browser-check","--disable-background-networking",
        "--no-sandbox","--window-size="+viewport,"--virtual-time-budget=12000",
        "--dump-dom",url
    ],capture_output=True,text=True,timeout=45)
    if result.returncode:
        raise RuntimeError(f"Browser smoke failed at {viewport}: exit {result.returncode}; {result.stderr[-400:]}")
    return BeautifulSoup(result.stdout,"html.parser")

def expected(feed,now):
    rows=[]
    for g in feed["games"]:
        dt=datetime.fromisoformat(g["date"]+"T"+g["time"]).replace(tzinfo=TZ)
        if dt+timedelta(hours=3) >= now:
            rows.append(g)
    return sorted(rows,key=lambda g:g["date"]+g["time"])

def verify():
    now=datetime.now(TZ)
    feed=json.loads(get(RAW+"svhl-upcoming.json"))
    goalie=json.loads(get(RAW+"goalie-assignments.json"))
    if feed.get("schema")!="brave-hc-svhl-schedule/v1" or goalie.get("schema")!="brave-hc-goalie-assignments/v1":
        raise ValueError("Verified SVHL or goalie assignment feed schema changed")
    home=BeautifulSoup(get(HOME),"html.parser")
    host=home.select_one('iframe[src*="goalie-schedule-v1.2-HTO-embed.html"]')
    if not host:
        raise AssertionError("HTO homepage missing goalie iframe")
    css=get(WIDGET)
    if "#braves-goalie-svhl td" not in css or "color:#fff!important" not in css:
        raise AssertionError("High-contrast goalie widget CSS missing")
    fixtures=expected(feed,now)
    chrome=chrome_path()
    for size in ("1280,900","390,844"):
        doc=render(chrome,WIDGET,size)
        table=doc.select_one("#braves-goalie-svhl #bg-games")
        if not table:
            raise AssertionError(f"{size}: rendered table missing")
        rows=table.select("tr")
        if len(rows)!=len(fixtures):
            msg=doc.select_one("#bg-status")
            raise AssertionError(f"{size}: {len(rows)} rows rendered, expected {len(fixtures)}; status={msg.get_text(' ',strip=True) if msg else 'missing'}")
        for g,row in zip(fixtures,rows):
            cols=row.select("td")
            if len(cols)!=5:
                raise AssertionError(f"{size}: incomplete game row")
            display=[td.get_text(" ",strip=True) for td in cols]
            name=goalie["assignments"].get(g["assignmentKey"],"TBD")
            when=datetime.fromisoformat(g["date"]+"T"+g["time"]).replace(tzinfo=TZ)
            expected_date=when.strftime("%a, %b ")+str(when.day)
            expected_time=when.strftime("%I:%M %p").lstrip("0")
            if (display[0]!=expected_date or display[1]!=expected_time or
                    g["opponent"] not in display[2] or g["rink"] not in display[3] or
                    name not in display[4]):
                raise AssertionError(f"{size}: incorrect live fixture/goalie display: {display}")
        status=doc.select_one("#bg-status")
        if not status or "Schedule temporarily unavailable" in status.get_text():
            raise AssertionError(f"{size}: browser failed to read one or both live feeds")
        print(f"PASS {size}: {len(rows)} rendered official fixtures, dark theme, goalie assignments")
    print("PASS HTO homepage iframe, published source, both live GitHub feeds")
    return 0

if __name__=="__main__":
    try:
        sys.exit(verify())
    except Exception as err:
        print("LIVE WIDGET QA FAILED:",err,file=sys.stderr)
        sys.exit(2)
