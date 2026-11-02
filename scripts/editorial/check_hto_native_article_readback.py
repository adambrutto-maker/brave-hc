#!/usr/bin/env python3
"""Public HTO game-page readback for staged native Preview/Summary articles.

Requires requests + beautifulsoup4; never authenticates, edits, posts or alters
HTO. Designed to run before/after manual source-backed HTO editor publication.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup


def normalized(text):
    return re.sub(r"\s+", " ", text.replace("\xa0", " ")).strip()


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--pack-dir", required=True)
    p.add_argument("--output", required=True)
    p.add_argument("--expect-live", action="store_true",
                   help="Exit with code 2 unless every approved article appears publicly.")
    args = p.parse_args()
    base = Path(args.pack_dir).resolve()
    output = Path(args.output).resolve()
    manifest = json.loads((base / "manifest.json").read_text(encoding="utf-8"))
    if manifest.get("schema") != "brave-hc-hto-native-editor-pack/v1":
        raise ValueError("Unexpected native article pack")
    report = {"schema": "brave-hc-hto-native-game-readback/v1",
              "checkedAtUTC": datetime.now(timezone.utc).isoformat(),
              "writesToHTO": False, "entries": []}
    with requests.Session() as session:
        session.headers["User-Agent"] = "BraveHC-HTO-native-publication-readback/1.0"
        for entry in manifest["entries"]:
            page = entry["nativePage"]
            parts = urlparse(page)
            if parts.scheme != "https" or parts.hostname not in ("www.htosports.com", "htosports.com"):
                raise ValueError("Untrusted native page source URL")
            html_source = (base / entry["htmlFile"]).read_bytes()
            if sha256(html_source).hexdigest() != entry["contentSha256"]:
                raise ValueError("Staged article changed since manifest: " + str(entry["gameId"]))
            fragment = BeautifulSoup(html_source.decode("utf-8"), "html.parser")
            paragraphs = [normalized(p.get_text(" ",strip=True))
                          for p in fragment.find_all("p")]
            # Intro may be after byline and dek. Require at least a meaningful
            # opening, not just a team/opponent word or official score.
            opening = next((x for x in paragraphs if len(x)>=110 and
                            not x.startswith("Browse the Brave H.C.")), None)
            if not opening:
                raise ValueError("No article opening to verify: " + str(entry["gameId"]))
            item = {"gameId": entry["gameId"],
                    "targetField": entry["targetField"],
                    "nativePage": page,
                    "headline": entry["headline"],
                    "publicationState": "NOT_VISIBLE_OR_NOT_PUBLISHED"}
            try:
                response = session.get(page, timeout=25)
                response.raise_for_status()
                article_text = normalized(
                    BeautifulSoup(response.text, "html.parser").get_text(" ",strip=True)
                )
                item["http"] = response.status_code
                item["headlineVisible"] = normalized(entry["headline"]) in article_text
                item["openingVisible"] = normalized(opening) in article_text
                if item["headlineVisible"] and item["openingVisible"]:
                    item["publicationState"] = "PUBLIC_READBACK_TEXT_VERIFIED"
                else:
                    item["note"] = (
                        "Staged article not fully visible on public native HTO page. "
                        "This does not prove the administrator text field is empty."
                    )
            except requests.RequestException as exc:
                item["publicationState"] = "READBACK_SOURCE_FAILURE"
                item["reason"] = str(exc)[:180]
            report["entries"].append(item)
    report["liveVerified"] = sum(x["publicationState"] == "PUBLIC_READBACK_TEXT_VERIFIED"
                                for x in report["entries"])
    report["total"] = len(report["entries"])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print(json.dumps({"total":report["total"],"liveVerified":report["liveVerified"],
                      "notVerified":report["total"]-report["liveVerified"],
                      "writesToHTO":False,"receipt":str(output)}))
    return 2 if args.expect_live and report["liveVerified"] != report["total"] else 0


if __name__ == "__main__":
    sys.exit(main())
