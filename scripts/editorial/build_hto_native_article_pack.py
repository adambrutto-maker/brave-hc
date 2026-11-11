#!/usr/bin/env python3
"""Build game-specific HTO native Preview/Summary editor packages. No HTO writes.

HTO per-game fields are the intended primary article home. GitHub Hot Stove is
a mirrored source/season archive. Each approved article is keyed to the exact
HTO gameID and must be reviewed in the authorized HTO admin before publishing.

The output uses only simple escaped headings, paragraphs and a single mirror link:
no inline scripts, style tags, iframes, event handlers, images or external assets.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
from hashlib import sha256
from html import escape
import json
from pathlib import Path
import re
import sys
from urllib.parse import parse_qs, urlparse


SOURCE_PREFIX = "https://www.htosports.com/teams/default.asp"
MIRROR_PREFIX = "https://adambrutto-maker.github.io/brave-hc/widgets/hot-stove.html"
HEADINGS = (
    "First Period", "Second Period", "Third Period", "Overtime",
    "Game Leaders", "Game Recognition", "Milestone and Recognition",
    "Next Up", "Scoreless Opening", "Postgame", "Career Milestone",
)
ROOT = Path(__file__).resolve().parents[2]


class Hold(ValueError):
    pass


def check(ok, code):
    if not ok:
        raise Hold(code)


def out_html(value):
    return escape(str(value), quote=True)


def clean(text):
    check(isinstance(text, str), "ARTICLE_TEXT_NOT_STRING")
    value = re.sub(r"\s+", " ", text).strip()
    check(value and len(value) <= 1600, "ARTICLE_TEXT_EMPTY_OR_TOO_LONG")
    return value


def is_heading(s):
    return (len(s) <= 100 and any(s.startswith(x) for x in HEADINGS)
            and not s.startswith("Next Up:") and not s.endswith("."))


def native_url(game_id, kind):
    check(type(game_id) is int and game_id > 0, "GAME_ID_INVALID")
    check(kind in ("preview", "boxscore"), "NATIVE_ROUTE_INVALID")
    return (SOURCE_PREFIX + "?u=BRAVESHOCKEY&s=hockey&sportsHQ=BRAVESHOCKEY"
            + "&gameID=" + str(game_id) + "&p=" + kind)


def source_game(article, season_index):
    game_id = article.get("gameId")
    check(type(game_id) is int, "RECAP_GAME_ID_INVALID")
    entries = [g for s in season_index["seasons"] for g in s["games"]
               if g["id"] == game_id]
    check(len(entries) == 1, "HTO_GAME_ID_NOT_UNIQUE_IN_REGISTER")
    game = entries[0]
    box = article.get("boxScore") or {}
    check(game["disposition"] == "SOURCE_SCORE_VERIFIED" and not game["forfeit"],
          "HTO_GAME_NOT_VERIFIED_OR_FORFEIT")
    check((game["date"], game["opponentRaw"], game["gf"], game["ga"]) ==
          (article.get("date"), box.get("opponent"),
           box.get("ourGoals"), box.get("theirGoals")),
          "HTO_APPROVED_ARTICLE_SOURCE_PARITY_FAILED")
    return game


def verified_recap(article, register):
    check(article.get("editorialState") == "FOUNDER_APPROVED",
          "RECAP_NOT_FOUNDER_APPROVED")
    check(article.get("verification", {}).get("status") == "SOURCE_VERIFIED",
          "RECAP_NOT_SOURCE_VERIFIED")
    check(re.fullmatch(r"[a-f0-9]{64}", article.get("evidenceFingerprint", "")),
          "ARTICLE_SOURCE_FINGERPRINT_INVALID")
    check(article.get("id") == "recap-" + str(article.get("gameId")),
          "ARTICLE_ID_MISMATCH")
    source_game(article, register)
    urls = article.get("sourceUrls") or []
    check(isinstance(urls, list) and len(urls) > 0, "RECAP_BOX_SCORE_SOURCE_MISSING")
    parsed = urlparse(urls[0])
    query = parse_qs(parsed.query)
    check(parsed.scheme == "https" and parsed.hostname in
          ("www.htosports.com", "htosports.com") and
          query.get("p") == ["boxscore"] and
          query.get("gameID") == [str(article["gameId"])],
          "ARTICLE_BOX_SCORE_LINK_IDENTITY_MISMATCH")
    check(isinstance(article.get("paragraphs"), list) and
          3 <= len(article["paragraphs"]) <= 60, "ARTICLE_PARAGRAPHS_INVALID")
    return {
        "gameId": article["gameId"],
        "targetField": "Game Summary",
        "nativePage": native_url(article["gameId"], "boxscore"),
        "headline": clean(article["headline"]),
        "byline": clean(article["displayDate"]) + " | Brave H.C. " +
                  str(article["boxScore"]["ourGoals"]) + "–" +
                  str(article["boxScore"]["theirGoals"]) + " " +
                  clean(article["boxScore"]["opponent"]),
        "dek": clean(article["dek"]),
        "paragraphs": [clean(p) for p in article["paragraphs"]],
        "mirror": MIRROR_PREFIX + "?tab=archive&article=" + article["id"],
        "sourceFingerprint": article["evidenceFingerprint"],
        "sourceArticle": article["id"],
        "date": article["date"],
        "type": "postgame",
    }


def verified_preview(feed, countdown):
    p = feed.get("gamePreview") or {}
    check(p.get("editorialState") == "FOUNDER_APPROVED", "PREVIEW_NOT_APPROVED")
    check(isinstance(p.get("sections"), list) and
          len(p["sections"]) >= 2, "PREVIEW_SECTIONS_UNVERIFIED")
    check(isinstance(p.get("paragraphs"), list), "PREVIEW_PARAGRAPHS_INVALID")
    sections = p["sections"]
    flattened = [line for section in sections for line in section.get("paragraphs", [])]
    check(flattened == p["paragraphs"], "PREVIEW_SECTIONS_PARAGRAPH_PARITY_FAILED")
    check(countdown.get("schema") == "brave-hc-upcoming-countdown/v1",
          "UPCOMING_SCHEDULE_SCHEMA_INVALID")
    matches = [g for g in countdown.get("games", [])
               if g.get("opponent") == p.get("opponent") and
               g.get("puckDrop") == p.get("puckDrop")]
    check(len(matches) == 1, "PREVIEW_MISSING_EXACT_SCHEDULE_ID")
    game = matches[0]
    check(game.get("gameDate") == p["puckDrop"][:10],
          "PREVIEW_CALENDAR_DATE_MISMATCH")
    paras = []
    for section in sections:
        if section.get("heading"):
            paras.append(clean(section["heading"]))
        for line in section.get("paragraphs", []):
            paras.append(clean(line))
    check(len(paras) >= 6, "PREVIEW_INSUFFICIENT_APPROVED_TEXT")
    return {
        "gameId": game["id"],
        "targetField": "Game Preview",
        "nativePage": native_url(game["id"], "preview"),
        "headline": clean(p["headline"]),
        "byline": clean(p["gameDateLine"]),
        "dek": "",
        "paragraphs": paras,
        "mirror": MIRROR_PREFIX + "?tab=preview",
        "sourceFingerprint": sha256(json.dumps(
            {"gameId": game["id"], "paragraphs": paras, "headline": p["headline"]},
            ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest(),
        "sourceArticle": "pregame-" + str(game["id"]),
        "date": game["gameDate"],
        "type": "pregame",
    }


def render_native(record):
    paragraphs = record["paragraphs"]
    tags = [
        "<h2>" + out_html(record["headline"]) + "</h2>",
        "<p><strong>" + out_html(record["byline"]) + "</strong></p>",
    ]
    plain = [record["headline"], record["byline"]]
    if record["dek"]:
        tags.append("<p><em>" + out_html(record["dek"]) + "</em></p>")
        plain.append(record["dek"])
    for p in paragraphs:
        tags.append(("<h3>" if is_heading(p) else "<p>") + out_html(p) +
                    ("</h3>" if is_heading(p) else "</p>"))
        plain.append(p)
    tags.append('<p><a href="' + out_html(record["mirror"]) +
                '">Browse the Brave H.C. Hot Stove archive</a></p>')
    plain.append("Archive mirror: " + record["mirror"])
    return "\n".join(tags) + "\n", "\n\n".join(plain) + "\n"


def build(feed, countdown, source_index):
    check(feed.get("editorialState") == "FOUNDER_APPROVED" and
          feed.get("team") == "Brave H.C.", "APPROVED_FEED_INVALID")
    check(source_index.get("schema") == "brave-hc-hto-archive-source-index/v1",
          "SOURCE_REGISTER_INVALID")
    check(source_index.get("seasonCount") == 18,
          "SOURCE_REGISTER_SEASON_COVERAGE_INCOMPLETE")
    articles = [feed["latestArticle"]] + [x["article"] for x in feed["archive"]]
    records = [verified_recap(a, source_index) for a in articles]
    records.append(verified_preview(feed, countdown))
    ids = [r["gameId"] for r in records]
    check(len(ids) == len(set(ids)), "DUPLICATE_ARTICLE_GAME_ID")
    return sorted(records, key=lambda r: (r["date"], r["type"]))


def publish_pack(records, output):
    check(output != ROOT and ROOT not in output.parents,
          "HTO_PUBLICATION_FILES_MUST_NOT_BE_GENERATED_INSIDE_PUBLIC_REPO")
    output.mkdir(parents=True, exist_ok=True)
    manifest = {
        "schema": "brave-hc-hto-native-editor-pack/v1",
        "generatedAtUTC": datetime.now(timezone.utc).isoformat(),
        "publicationState": "STAGED_NOT_PUBLISHED",
        "nativeHTOChanged": False,
        "editorReadbackVerified": False,
        "mode": "Native HTO Game Preview and Game Summary; no per-game widget",
        "entries": [],
    }
    for record in records:
        label = ("preview" if record["type"] == "pregame" else "summary")
        stem = record["date"].replace("-", "") + "_HTO_" + str(record["gameId"]) + "_" + label
        html_content, text_content = render_native(record)
        (output / (stem + ".html")).write_text(html_content, encoding="utf-8", newline="\n")
        (output / (stem + ".txt")).write_text(text_content, encoding="utf-8", newline="\n")
        manifest["entries"].append({
            "gameId": record["gameId"], "date": record["date"],
            "targetField": record["targetField"], "nativePage": record["nativePage"],
            "headline": record["headline"], "sourceArticle": record["sourceArticle"],
            "sourceFingerprint": record["sourceFingerprint"],
            "htmlFile": stem + ".html", "textFile": stem + ".txt",
            "contentSha256": sha256(html_content.encode("utf-8")).hexdigest(),
            "publicationState": "REQUIRES_NATIVE_ADMIN_EDIT_AND_READBACK",
            "verifiedExistingFieldBackup": False,
        })
    (output / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    return manifest


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--feed", default=str(ROOT / "widgets/hot-stove-approved.json"))
    p.add_argument("--countdown", default=str(ROOT / "widgets/countdown.json"))
    p.add_argument("--index", required=True)
    p.add_argument("--output-dir", required=True)
    args = p.parse_args()
    try:
        out = Path(args.output_dir).expanduser().resolve()
        data = build(json.loads(Path(args.feed).read_text(encoding="utf-8")),
                     json.loads(Path(args.countdown).read_text(encoding="utf-8")),
                     json.loads(Path(args.index).read_text(encoding="utf-8")))
        manifest = publish_pack(data, out)
        print(json.dumps({"status": "HTO_NATIVE_PUBLICATION_PACK_STAGED",
                          "nativeHTOChanged": False,
                          "entries": len(manifest["entries"]),
                          "summary": sum(x["targetField"] == "Game Summary"
                                         for x in manifest["entries"]),
                          "preview": sum(x["targetField"] == "Game Preview"
                                         for x in manifest["entries"]),
                          "outputDir": str(out)}))
        return 0
    except (Hold, OSError, ValueError, TypeError, KeyError) as exc:
        print(json.dumps({"status": "HELD", "reason": str(exc),
                          "nativeHTOChanged": False}), file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
