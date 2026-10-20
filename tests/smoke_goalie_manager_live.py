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
REQUEST_TYPE="brave-hc-goalie-confirmation/v3"
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
                           "fixture_signature","expected_goalie","change_reason"}, "Unexpected fields"
    assert payload["type"]==REQUEST_TYPE, "Wrong request version"
    return payload


def expect_link(page,row,expected,goalie,custom="",reason=None):
    prior=captured(page)
    row.locator("button").click()
    found=captured(page)
    assert len(found)==len(prior)+1, "Click did not prepare exactly one review link"
    body=decode(found[-1])
    assert body["game_key"]==expected["assignmentKey"], "Wrong game key"
    assert body["fixture_signature"]==expected["fixtureSignature"], "Wrong league revision"
    assert body["expected_goalie"]==expected["previous"], "Incorrect prior goalie"
    assert body["goalie"]==goalie and body["custom_goalie_name"]==custom, "Wrong chosen goalie"
    expected_reason=reason or ("NO_CHANGE" if (custom or goalie)==expected["previous"]
                               else "NEW_BOOKING" if expected["previous"]=="TBD"
                               else "BOOKING_CHANGE")
    assert body["change_reason"]==expected_reason, "Wrong manager change reason"


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
        summary=page.locator("#coverage").inner_text()
        expected_tbd=sum(1 for g in first["games"] if
                         initial.get(g["assignmentKey"],"TBD")=="TBD")
        assert "TBD" in summary and str(expected_tbd)+" TBD" in summary, (
            "Coverage summary does not match saved goalie assignments")
        def review_needed(g):
            name=initial.get(g["assignmentKey"],"TBD")
            return (name=="TBD" or g.get("htoSyncStatus")!="MATCH" or
                    (g.get("requiresGoalieReconfirmation") and name!="TBD" and
                     saved.get("scheduleConfirmations",{}).get(g["assignmentKey"])!=g.get("fixtureSignature")))
        attention=sum(bool(review_needed(g)) for g in first["games"])
        page.locator("#show-needs").click()
        visible=page.locator("#games tr:visible").count()
        assert visible==attention, f"Attention filter showed {visible}, expected {attention}"
        assert page.locator("#show-needs").get_attribute("aria-pressed")=="true"
        page.locator("#show-all").click()
        assert page.locator("#games tr:visible").count()==len(first["games"])
        assert page.locator("#show-all").get_attribute("aria-pressed")=="true"
        rows=page.locator("#games tr")
        for i,g in enumerate(first["games"]):
            row=rows.nth(i)
            assert g["date"] in row.locator("td").nth(0).inner_text()
            assert g["opponent"] in row.locator("td").nth(0).inner_text()
            assert g["rink"] in row.locator("td").nth(1).inner_text()
            selected=row.locator("select").input_value()
            assert selected==initial.get(g["assignmentKey"],"TBD"), "Dropdown lost saved starter"
            if "Anthony Paolucci" not in initial.values():
                assert row.locator('select option[value="Anthony Paolucci"]').count()==0, (
                    "Full-time skater with secondary G role was offered as a direct goalie choice")

        primary=first["games"][0]
        current={**primary,"previous":initial.get(primary["assignmentKey"],"TBD")}
        expect_link(page,rows.first,current,current["previous"])
        # Replacing an already-recorded goaltender requires affirmative,
        # categorized manager review. All popups are intercepted.
        if current["previous"]!="TBD":
            first_row=rows.first
            alternative="Dev Leong" if current["previous"]!="Dev Leong" else "Stephen Logue"
            first_row.locator("select").select_option(alternative)
            page.evaluate("window.confirm=()=>false")
            previous_count=len(captured(page))
            first_row.locator("button").click()
            assert len(captured(page))==previous_count, "Declined replacement produced a request"
            page.evaluate("window.confirm=()=>true;window.prompt=()=>''")
            first_row.locator("button").click()
            assert len(captured(page))==previous_count, "Missing reason produced a request"
            page.evaluate("window.prompt=()=> '4'")
            expect_link(page,first_row,current,alternative,reason="BOOKING_CHANGE")
            first_row.locator("select").select_option("TBD")
            page.evaluate("window.prompt=()=> '1'")
            expect_link(page,first_row,current,"TBD",reason="GOALIE_UNAVAILABLE")
            first_row.locator("select").select_option(current["previous"])
            page.evaluate("window.prompt=()=> null")


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
    print("PASS: goalie coverage summary, read-only attention filter and restore-all")
    print("PASS: live manager rows, saved selections, current goalie, alternate goalie, rental, invalid/cancelled rental")
    print("PASS: v3 reasons, replacement confirmation, cancellation, and initial booking; all Github popups intercepted")
    print("PASS: no goalie assignment modification made by browser test")


if __name__=="__main__":
    try:
        run()
    except Exception as e:
        print("MANAGER UI QA FAILED:",e,file=sys.stderr)
        sys.exit(2)
