#!/usr/bin/env python3
"""Read-only live browser verification of the Brave H.C. goalie manager.

Intercepts window.open before interacting with the page, so Github issues are
NEVER submitted or even opened. Does not alter confirmed goalies or HTO records.
Tests the exact prefilled issue payload against live published read-only data.
"""
import json
import re
import shutil
import sys
import urllib.request
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import sync_playwright

MANAGER="https://adambrutto-maker.github.io/brave-hc/widgets/goalie-manager-v1.2.html"
RAW="https://raw.githubusercontent.com/adambrutto-maker/brave-hc/main/widgets/"
REQUEST_TYPE="brave-hc-goalie-confirmation/v2"
TITLE="GOALIE_CONFIRMATION_REQUEST"


def load(name):
    req=urllib.request.Request(RAW+name,headers={"User-Agent":"BraveHC-Manager-QA/1.0"})
    with urllib.request.urlopen(req,timeout=25) as response:
        return json.load(response)


def captured(page):
    return page.evaluate("window.__capturedOpen||[]")


def decode(link):
    uri=urlparse(link)
    assert uri.scheme=="https" and uri.netloc=="github.com", "Request URL is not GitHub"
    assert uri.path=="/adambrutto-maker/brave-hc/issues/new", "Unexpected issue destination"
    params=parse_qs(uri.query)
    assert params.get("title")==[TITLE], "Unexpected GitHub issue title"
    assert "body" in params and len(params["body"])==1, "Missing issue request"
    payload=json.loads(params["body"][0])
    assert set(payload)=={"type","game_key","goalie","custom_goalie_name",
                           "fixture_signature","expected_goalie"}, "Unexpected fields"
    assert payload["type"]==REQUEST_TYPE, "Wrong request version"
    return payload


def expect_link(page,row,expected,goalie,custom=""):
    prior=captured(page)
    row.locator("button").click()
    found=captured(page)
    assert len(found)==len(prior)+1, "Click did not prepare exactly one review link"
    body=decode(found[-1])
    assert body["game_key"]==expected["assignmentKey"], "Wrong game key"
    assert body["fixture_signature"]==expected["fixtureSignature"], "Wrong league revision"
    assert body["expected_goalie"]==expected["previous"], "Incorrect prior goalie"
    assert body["goalie"]==goalie and body["custom_goalie_name"]==custom, "Wrong chosen goalie"


def run():
    first=load("svhl-upcoming.json")
    saved=load("goalie-assignments.json")
    initial=dict(saved["assignments"])
    if not first["games"]:
        raise AssertionError("No upcoming SVHL games to check")
    exe=shutil.which("google-chrome") or shutil.which("google-chrome-stable")
    if not exe:
        raise AssertionError("No system Chrome binary for live manager QA")
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=exe,headless=True,args=["--no-sandbox"])
        context=browser.new_context(viewport={"width":1280,"height":850})
        # No outgoing GitHub issue can be created, and no real popup opens.
        context.add_init_script("""window.__capturedOpen=[];
            window.open=function(url){window.__capturedOpen.push(String(url));return null;};
        """)
        context.route(re.compile(r"https://github\.com/.*"),lambda route: route.abort())
        page=context.new_page()
        page.goto(MANAGER,wait_until="domcontentloaded",timeout=45000)
        page.wait_for_function(
            "count=>document.querySelectorAll('#games tr').length===count",
            arg=len(first["games"]),timeout=30000)
        rows=page.locator("#games tr")
        for i,g in enumerate(first["games"]):
            row=rows.nth(i)
            assert g["date"] in row.locator("td").nth(0).inner_text()
            assert g["opponent"] in row.locator("td").nth(0).inner_text()
            assert g["rink"] in row.locator("td").nth(1).inner_text()
            selected=row.locator("select").input_value()
            assert selected==initial.get(g["assignmentKey"],"TBD"), "Dropdown lost saved starter"

        primary=first["games"][0]
        current={**primary,"previous":initial.get(primary["assignmentKey"],"TBD")}
        expect_link(page,rows.first(),current,current["previous"])

        target=first["games"][1] if len(first["games"])>1 else first["games"][0]
        row=rows.nth(1 if len(first["games"])>1 else 0)
        prev=initial.get(target["assignmentKey"],"TBD")
        checked={**target,"previous":prev}
        chosen="Dev Leong" if prev!="Dev Leong" else "Stephen Logue"
        row.locator("select").select_option(chosen)
        expect_link(page,row,checked,chosen)

        row.locator("select").select_option("Other / rental")
        page.evaluate("window.prompt=()=> 'Fictional QA Goalie'")
        expect_link(page,row,checked,"Other / rental","Fictional QA Goalie")

        before=len(captured(page))
        page.evaluate("window.prompt=()=> '<invalid>'")
        row.locator("button").click()
        assert len(captured(page))==before, "Invalid rental still prepared a request"
        assert "valid rental goalie name" in page.locator("#status").inner_text()
        page.evaluate("window.prompt=()=> null")
        row.locator("button").click()
        assert len(captured(page))==before, "Cancelled rental still prepared a request"

        assert not page.locator("#status").inner_text().startswith("Manager not ready")
        browser.close()
    after=load("goalie-assignments.json")["assignments"]
    assert after==initial, "Read-only UI smoke coincided with changed goalie assignments"
    print("PASS: live manager rows, saved selections, current goalie, alternate goalie, rental, invalid/cancelled rental")
    print("PASS: v2 issue payload binds game revision and expected old goalie; GitHub popup intercepted")
    print("PASS: no goalie assignment modification made by browser test")


if __name__=="__main__":
    try:
        run()
    except Exception as e:
        print("MANAGER UI QA FAILED:",e,file=sys.stderr)
        sys.exit(2)
