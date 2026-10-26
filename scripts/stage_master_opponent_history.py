"""Read-only importer for Brave H.C. historical opponent intelligence.

Canonical Master Workbook is immutable. No Excel automation, recalculation,
source-cell updates, HTO writes, network requests, or public JSON publication.
Output is a PRIVATE review-stage JSON with workbook hash and source rows.

Usage:
python scripts/stage_master_opponent_history.py --workbook ORIGINAL.xlsx --output STAGED.json

Release hold remains until current HTO game IDs and exact opponent identity
aliases are independently reconciled and signed off.
"""
from __future__ import annotations
from argparse import ArgumentParser
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET
import json
import os
import re
import sys

N = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
ORIGINAL_SHA = "0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154"
SHEET = "xl/worksheets/sheet12.xml"
FIELDS = {"B", "C", "D", "E", "H", "O", "T", "U", "X"}
VALID_TYPES = {"Regular Season", "Playoffs"}

class SourceHold(ValueError):
    pass

def serial_date(value):
    try:
        n = float(value)
        if not (40000 < n < 90000):
            raise ValueError("outside expected Excel serial range")
        return (datetime(1899, 12, 30) + timedelta(days=n)).strftime("%Y-%m-%d")
    except (ValueError, TypeError, OverflowError) as exc:
        raise SourceHold("Invalid workbook game date") from exc

def number(value):
    try:
        x = float(value)
        if not x.is_integer() or x < 0 or x > 50:
            raise ValueError("unexpected goal count")
        return int(x)
    except (TypeError, ValueError) as exc:
        raise SourceHold("Noninteger or missing score in completed game") from exc

def read_records(source):
    with ZipFile(source) as z:
        if z.testzip() is not None:
            raise SourceHold("Workbook ZIP has damaged member")
        strings_root = ET.fromstring(z.read("xl/sharedStrings.xml"))
        strings = ["".join(t.text or "" for t in x.iter(N+"t")) for x in strings_root.findall(N+"si")]
        records = []
        seen = set()
        skipped = 0
        with z.open(SHEET) as stream:
            for _,row in ET.iterparse(stream, events=("end",)):
                if row.tag != N+"row": continue
                rid = int(row.get("r", "0"))
                if rid <= 3:
                    row.clear()
                    continue
                values = {}
                for cell in row.findall(N+"c"):
                    match = re.fullmatch(r"([A-Z]+)([0-9]+)", cell.get("r",""))
                    if not match or match.group(1) not in FIELDS:
                        continue
                    v = cell.find(N+"v")
                    if v is None: continue
                    val = v.text
                    if cell.get("t") == "s":
                        try: val = strings[int(val)]
                        except (IndexError,ValueError,TypeError) as exc:
                            raise SourceHold("Invalid opponent shared string") from exc
                    values[match.group(1)] = val
                row.clear()
                if not values.get("B") or not re.fullmatch(r"[0-9]+", str(values["B"])):
                    continue
                if str(values.get("X","0")) not in ("1", "1.0"):
                    skipped += 1
                    continue
                game_no = int(values["B"])
                if game_no in seen:
                    raise SourceHold("Duplicate workbook game number")
                seen.add(game_no)
                if values.get("D") not in VALID_TYPES or values.get("U") not in ("W","L","T"):
                    raise SourceHold(f"Invalid historical game type or W-L-T row {rid}")
                opponent = values.get("H")
                if not isinstance(opponent, str) or not opponent.strip():
                    raise SourceHold(f"Completed game has no exact opponent name row {rid}")
                gf,ga = number(values.get("O")),number(values.get("T"))
                result = values["U"]
                # Some playoff decisions can be shootouts; retain source result and
                # detect discrepancies rather than silently changing a score.
                inconsistent = (gf>ga and result!="W") or (gf<ga and result!="L") or (gf==ga and result!="T")
                records.append({
                    "workbookGame":game_no,"sourceRow":rid,"date":serial_date(values.get("E")),
                    "season":values["C"],"type":values["D"],"opponentExact":opponent.strip(),
                    "bravesGF":gf,"bravesGA":ga,"result":result,
                    "scoreResultDisagreement":inconsistent,"gameContested":True
                })
        if not records:
            raise SourceHold("No historical completed games")
        return records,skipped

def stage(source,output):
    source = Path(source)
    if not source.is_file(): raise SourceHold("Canonical workbook file missing")
    hash_value = sha256(source.read_bytes()).hexdigest()
    if hash_value != ORIGINAL_SHA:
        raise SourceHold("Workbook hash drifted; require new source owner acceptance")
    records,skipped = read_records(source)
    byname = defaultdict(list)
    for x in records: byname[x["opponentExact"]].append(x)
    opponents = []
    for name,games in sorted(byname.items()):
        def totals(rows):
            return dict(gp=len(rows),w=sum(x["result"]=="W" for x in rows),
                        l=sum(x["result"]=="L" for x in rows),t=sum(x["result"]=="T" for x in rows),
                        gf=sum(x["bravesGF"] for x in rows),
                        ga=sum(x["bravesGA"] for x in rows))
        opponents.append({"exactName":name,
                          "regularSeason":totals([g for g in games if g["type"]=="Regular Season"]),
                          "allTime":totals(games),"playoffs":totals([g for g in games if g["type"]=="Playoffs"]),
                          "sourceRows":[g["sourceRow"] for g in games],
                          "identityStatus":"EXACT_ONLY"})
    disagreements = [x["sourceRow"] for x in records if x["scoreResultDisagreement"]]
    current_season = [g for g in records if g["season"]=="W2026/27"]
    output_doc = {
        "schema":"brave-hc-opponent-master-history-stage/v1",
        "status":"PRIVATE_HISTORICAL_REVIEW_ONLY",
        "published":False,"originalWorkbookWritten":False,
        "currentSeasonUpToDate":False,
        "requiredBeforePublication":["verified-current-HTO-gameID-joins",
            "reviewed-opponent-identity-aliases","independent-result-parity",
            "source-admission-and-release-approval"],
        "source":{"type":"canonical-original-master-workbook","sha256":hash_value,
            "sheet":"Master Schedule","fileName":source.name},
        "stagedAtUTC":datetime.now(timezone.utc).isoformat(),
        "counts":{"completedHistorical":len(records),"opponentsExact":len(opponents),
            "unusedFuturePlaceholders":skipped,
            "completedCurrentSeasonWorkbook":len(current_season),
            "scoreResultDisagreementRows":disagreements},
        "opponents":opponents,"games":records
    }
    output = Path(output)
    output.parent.mkdir(parents=True,exist_ok=True)
    temp = output.with_suffix(output.suffix+".tmp")
    temp.write_text(json.dumps(output_doc,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    os.replace(temp,output)
    return {"status":output_doc["status"],"path":str(output),
            **output_doc["counts"],"sha256":hash_value,
            "scope":"LOCAL_PRIVATE_NO_GITHUB_PUBLICATION"}

def main(argv=None):
    p=ArgumentParser()
    p.add_argument("--workbook",required=True)
    p.add_argument("--output",required=True)
    args=p.parse_args(argv)
    try:
        print(json.dumps(stage(args.workbook,args.output),ensure_ascii=False))
        return 0
    except (SourceHold,OSError,ValueError,KeyError,ET.ParseError) as exc:
        print(json.dumps({"status":"HELD","error":str(exc),"published":False}),file=sys.stderr)
        return 2
if __name__=="__main__":sys.exit(main())
