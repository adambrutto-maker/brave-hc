#!/usr/bin/env python3
"""Build a human-review correction packet from the public SVHL/HTO comparison.

This module does not perform any remote writes, notifications, or edits.
"""
from __future__ import annotations

import re
from collections import Counter
from typing import Any

SVHL_URL = "https://leagues.sportsvillage.ca/Leagues.aspx?leagueid=570&page_type=Adult&sc=HOCKEY#Schedule"
HTO_LIST = "https://www.htosports.com/teams/default.asp?p=schedule&s=hockey&u=BRAVESHOCKEY&format=List"
HTO_ADMIN = "https://www.hometeamsonline.com/admin/default.asp?p=schedule"
HTO_PREVIEW = "https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=preview&gameID="

ACTIONS = {
    "EDIT_HTO": ("Edit existing HTO game", "Verify SVHL, then update the existing HTO game; preserve its ID."),
    "REVIEW_RESCHEDULE": ("Review rescheduled game", "Verify the SVHL change, edit the existing HTO record, and reconfirm the goalie."),
    "REVIEW_IDENTITY": ("Verify opponent or game identity", "Do not edit, delete, or create records until the event identity is confirmed."),
    "REVIEW_OR_ADD": ("Check for duplicates", "Locate any prior matching HTO game before adding a record."),
    "ADD_HTO": ("Add missing HTO game after review", "Confirm there is no HTO duplicate, then add the new game and record its ID."),
    "REVIEW_HTO_ONLY": ("Investigate HTO-only game", "Check SVHL postponement/cancellation; do not delete scored or historic HTO records automatically."),
}
FIELDS = (("date", "Date"), ("time", "Toronto start"),
          ("opponent", "Opponent"), ("rink", "Rink"), ("side", "Home/away"))


def safe(value: Any) -> str:
    """Treat untrusted provider names as plain text for the issue Markdown."""
    output = str(value if value is not None else "—")
    output = re.sub(r"[\r\n\t]+", " ", output)
    output = re.sub(r"[\x00-\x1f\x7f]", "", output)[:160]
    for char in ("\\", chr(96), "|", "[", "]", "<", ">", "*"):
        output = output.replace(char, " ")
    return " ".join(output.split()) or "—"


def row_view(row: dict | None) -> str:
    if not row:
        return "Not listed"
    return " · ".join(f"{label}: {safe(row.get(key))}" for key, label in FIELDS)


def game_link(row: dict | None) -> str:
    if not row:
        return "No existing HTO ID"
    identifier = str(row.get("htoGameId", ""))
    if not re.fullmatch(r"[0-9]{3,15}", identifier):
        return "Unverified HTO ID — locate manually in HTO"
    return f"[HTO game {identifier}]({HTO_PREVIEW}{identifier})"


def render_review(items: list[dict]) -> str:
    """Stable issue body for human HTO review, with precise old/new fields."""
    changes = [r for r in items if r.get("action") != "MATCH"]
    if not changes:
        return ""
    counts = Counter(r.get("action") for r in changes)
    for key in counts:
        if key not in ACTIONS:
            raise ValueError(f"Unknown reconciliation action {key!r}")
    out = [
        "# Brave H.C. — SVHL / HTO schedule review", "",
        "**Manual review required. Nothing in HTO was edited.** SVHL is authoritative for dates, start times, opponents and rinks. This is a comparison packet, not proof of cancellation or authorization to modify HTO.",
        "",
        f"- [Official SVHL Sunday Winter 2026/27]({SVHL_URL})",
        f"- [HTO full-season List View]({HTO_LIST})",
        f"- [HTO administrator Schedule & Results]({HTO_ADMIN})", "",
        f"**Outstanding discrepancies:** {len(changes)} — " +
        ", ".join(f"{k}: {v}" for k, v in sorted(counts.items())), "",
    ]
    for index, record in enumerate(changes, 1):
        action = record["action"]
        heading, instruction = ACTIONS[action]
        svhl = record.get("svhl") if isinstance(record.get("svhl"), dict) else None
        hto = record.get("hto") if isinstance(record.get("hto"), dict) else None
        diffs = record.get("changes") or {}
        if not isinstance(diffs, dict):
            raise ValueError("Invalid difference data")
        opponent = svhl.get("opponent") if svhl else (hto.get("opponent") if hto else "Unidentified game")
        out += [f"### {index}. {heading} — {safe(opponent)}", "",
                f"**HTO record:** {game_link(hto)}", "",
                f"**Authoritative SVHL:** {row_view(svhl)}", "",
                f"**Current HTO:** {row_view(hto)}", ""]
        if diffs:
            out += ["**Differences (HTO → SVHL):**", ""]
            for field, label in FIELDS:
                if field not in diffs:
                    continue
                values = diffs[field]
                if not isinstance(values, dict):
                    raise ValueError("Invalid difference field")
                out.append(f"- **{label}:** {safe(values.get('hto'))} → {safe(values.get('svhl'))}")
            out.append("")
        out.extend([f"**Manager action:** {instruction}", ""])
        if action in ("EDIT_HTO", "REVIEW_RESCHEDULE", "REVIEW_IDENTITY"):
            out.extend(["Preserve the existing HTO game ID and prior results. Do not create a replacement game. Reconfirm any assigned goalie following a material schedule change.", ""])
        if action in ("ADD_HTO", "REVIEW_OR_ADD"):
            out.extend(["Search the complete 2026/27 HTO schedule before selecting New Game. Record the new permanent HTO ID only if the fixture is genuinely absent.", ""])
    out.extend([
        "## Verification and closeout", "",
        "1. Confirm every discrepancy against **live SVHL** and **live HTO**.",
        "2. Only an authorized HTO manager should make necessary changes in Schedule & Results; no bulk import or automatic deletion.",
        "3. Verify the public HTO List View and obtain a new goalie confirmation where required.",
        "4. Rerun the read-only GitHub reconciliation; the review issue should close only when the comparison reports no discrepancies.", "",
        "**No HTO records, league records, goaltender assignments or notifications are changed by this issue.**",
    ])
    return "\n".join(out) + "\n"
