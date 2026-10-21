"""Read-only QA of a *disposable* Excel recalculation from Plan 03.

Inputs are the original immutable XLSX, untouched copy, Excel-modified copy,
private official HTO period manifest and private Excel QA receipt. This program
does not load Excel, write spreadsheets, publish statistics or contact HTO.
"""
from __future__ import annotations
from collections import Counter
import argparse
import hashlib
import json
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

SOURCE_SHA = "0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154"
MAIN_SHEET = "xl/worksheets/sheet12.xml"
NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
PERIOD_COLUMNS = ("K", "L", "M", "N", "P", "Q", "R", "S")
FORMULA_COLUMNS = ("O", "T", "U", "W", "X")
GAMES = {
    370: (359, 0, 3, -3),
    371: (360, 3, 6, -3),
    372: (361, 2, 3, -1),
    373: (362, 1, 7, -6),
}

class EvidenceHold(ValueError):
    pass

def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def read_xlsx(path: Path) -> dict:
    try:
        with ZipFile(path) as z:
            bad = z.testzip()
            if bad:
                raise EvidenceHold("CORRUPT_EXCEL_ZIP_MEMBER")
            names = set(z.namelist())
            root = ET.fromstring(z.read(MAIN_SHEET))
            cells = {}
            for node in root.iter(NS+"c"):
                ref=node.get("r")
                if not ref:continue
                formula=node.find(NS+"f")
                value=node.find(NS+"v")
                cells[ref] = {
                    "formula": None if formula is None else formula.text,
                    "value": None if value is None else value.text,
                    "type": node.get("t"),
                }
            return {
                "members": names, "cells": cells,
                "sheetCount": sum(x.startswith("xl/worksheets/sheet") and x.endswith(".xml") for x in names),
                "tableCount": sum(x.startswith("xl/tables/table") and x.endswith(".xml") for x in names),
                "pivotDefinitions": sum(x.startswith("xl/pivotCache/pivotCacheDefinition") and x.endswith(".xml") for x in names),
            }
    except (OSError, KeyError, ValueError) as exc:
        if isinstance(exc, EvidenceHold):raise
        raise EvidenceHold("EXCEL_STRUCTURE_NOT_READABLE") from exc

def number(cell, ref: str) -> int:
    try:
        value=float(cell["value"])
        if not value.is_integer():raise ValueError("fraction")
        return int(value)
    except (KeyError, TypeError, ValueError, OverflowError) as exc:
        raise EvidenceHold("CELL_NOT_NUMERIC_"+ref) from exc

def audit(original: dict, changed: dict, manifest: dict, receipt: dict) -> dict:
    if original["members"] != changed["members"]:
        raise EvidenceHold("EXCEL_ZIP_COMPONENT_MEMBERS_CHANGED")
    structure = (17, 35, 3)
    for model in (original, changed):
        if (model["sheetCount"],model["tableCount"],model["pivotDefinitions"]) != structure:
            raise EvidenceHold("EXCEL_SHEET_TABLE_PIVOT_COUNTS_CHANGED")
    if (manifest.get("schema") != "brave-hc-private-workbook-reconciliation-receipt/v1"
        or manifest.get("review",{}).get("status") != "FOUR_VERIFIED_RESULTS_READY_FOR_WORKBOOK_OWNER_REVIEW_NOT_APPLIED"):
        raise EvidenceHold("HTO_WORKBOOK_MANIFEST_NOT_ACCEPTED")
    if (receipt.get("schema") != "brave-hc-private-excel-disposable-recalculation/v1"
        or receipt.get("masterScheduleRecalculated") is not True
        or receipt.get("preservedSourceCopyHashMatches") is not True
        or receipt.get("originalWorkbookHashMatches") is not True
        or receipt.get("workbookFullRecalculationVerified") is not False):
        raise EvidenceHold("EXCEL_DISPOSABLE_QA_RECEIPT_NOT_ACCEPTED")
    rows=manifest["review"].get("proposed")
    if not isinstance(rows, list) or len(rows)!=4:
        raise EvidenceHold("HTO_FOUR_GAME_REVIEW_INCOMPLETE")
    orig=original["cells"];new=changed["cells"]
    if set(orig)!=set(new):
        raise EvidenceHold("EXCEL_WORKSHEET_CELL_IDENTITY_CHANGED")
    target=set()
    verified=[]
    for row in rows:
        r=row.get("worksheetRow")
        if r not in GAMES or (row.get("gameNumber"), row["expectedAfterFormulaRecalculation"]["GF"],
                 row["expectedAfterFormulaRecalculation"]["GA"],
                 row["expectedAfterFormulaRecalculation"]["goalDifference"]) != GAMES[r]:
            raise EvidenceHold("HTO_WORKBOOK_ROW_MAPPING_CHANGED")
        for col in PERIOD_COLUMNS:
            ref=f"{col}{r}"
            target.add(ref)
            if orig[ref]["formula"] is not None or orig[ref]["value"] is not None:
                raise EvidenceHold("ORIGINAL_PERIOD_INPUT_NOT_EMPTY")
            if new[ref]["formula"] is not None or number(new[ref],ref)!=row["reviewOnlyPeriodCells"][col]:
                raise EvidenceHold("RECALCULATED_PERIOD_INPUT_CONFLICT")
        expected={"O":GAMES[r][1], "T":GAMES[r][2], "W":GAMES[r][3], "X":1}
        for col in FORMULA_COLUMNS:
            ref=f"{col}{r}"
            if (orig[ref]["formula"] is None or orig[ref]["formula"]!=new[ref]["formula"]):
                raise EvidenceHold("ORIGINAL_EXCEL_FORMULA_CHANGED_"+ref)
            if col=="U":
                if orig[ref]["value"]!="T" or new[ref]["value"]!="L":
                    raise EvidenceHold("LOSS_RESULT_NOT_RECALCULATED")
            elif number(new[ref],ref)!=expected[col]:
                raise EvidenceHold("RECALCULATED_MASTER_VALUE_MISMATCH_"+ref)
        verified.append({"worksheetRow":r,"gameNumber":GAMES[r][0],
                         "officialGF":GAMES[r][1],"officialGA":GAMES[r][2],
                         "result":"L","countedGame":1})
    if len(target)!=32:
        raise EvidenceHold("EXPECTED_PERIOD_INPUT_COVERAGE_NOT_32")
    for ref in [f"{c}374" for c in PERIOD_COLUMNS]:
        if orig[ref]!=new[ref] or new[ref]["value"] is not None:
            raise EvidenceHold("UNPLAYED_FIFTH_GAME_PERIOD_CHANGED")
    for col,value in (("O",0),("T",0),("W",0),("X",0)):
        ref=col+"374"
        if number(new[ref],ref)!=value or orig[ref]["formula"]!=new[ref]["formula"]:
            raise EvidenceHold("UPCOMING_GAME_CACHED_OR_FORMULA_CHANGED")
    if new["U374"]["value"]!="T":
        raise EvidenceHold("UPCOMING_FIXTURE_MARKED_PLAYED")
    if orig["AN37"]["formula"]!=new["AN37"]["formula"] or number(orig["AN37"],"AN37")!=1 or number(new["AN37"],"AN37")!=4:
        raise EvidenceHold("W2026_27_SEASON_GAME_COUNT_NOT_RECALCULATED")
    buckets=Counter()
    for ref in orig:
        a=orig[ref];b=new[ref]
        if a["formula"]!=b["formula"]:
            raise EvidenceHold("UNREVIEWED_EXCEL_FORMULA_DEFINITION_CHANGE_"+ref)
        if a==b:continue
        if ref in target:
            buckets["official_period_inputs"]+=1
        elif a["formula"] is not None:
            buckets["formula_cached_value_recalculated"]+=1
        else:
            raise EvidenceHold("UNREVIEWED_SOURCE_VALUE_CHANGED_"+ref)
    if buckets["official_period_inputs"]!=32:
        raise EvidenceHold("PERIOD_INPUT_COUNT_MISMATCH")
    return {
        "status":"DISPOSABLE_MASTER_SCHEDULE_SOURCE_FORMULAS_PASS",
        "periodInputsConfirmed":32,
        "games":verified,
        "winter2026RecordedGamesBefore":1,
        "winter2026RecordedGamesAfter":4,
        "formulaCachedValuesRecalculated":buckets["formula_cached_value_recalculated"],
        "worksheetSheetsPreserved":17,
        "excelTablesPreserved":35,
        "pivotCacheDefinitionsPreserved":3,
        "zipComponentsPreserved":len(original["members"]),
        "upcomingHTOGame3375682Admitted":False,
        "originalWorkbookModified":False,
        "fullWorkbookAndPivotRecalculationCertified":False,
        "publicWatchOrProjectionsReleased":False,
    }

def main():
    p=argparse.ArgumentParser(description=__doc__)
    for arg in ("original","rollback_copy","calculated_copy","shadow_manifest","excel_receipt"):
        p.add_argument("--"+arg.replace("_","-"),type=Path,required=True)
    a=p.parse_args()
    if sha(a.original)!=SOURCE_SHA or sha(a.rollback_copy)!=SOURCE_SHA:
        raise EvidenceHold("ORIGINAL_OR_ROLLBACK_SOURCE_HASH_DRIFT")
    if sha(a.calculated_copy)==SOURCE_SHA:
        raise EvidenceHold("DISPOSABLE_COPY_WAS_NOT_RECALCULATED")
    receipt=json.loads(a.excel_receipt.read_text(encoding="utf-8-sig"))
    if sha(a.calculated_copy)!=str(receipt.get("candidateHash","")).lower():
        raise EvidenceHold("CALCULATED_COPY_RECEIPT_SHA_MISMATCH")
    manifest=json.loads(a.shadow_manifest.read_text(encoding="utf-8-sig"))
    result=audit(read_xlsx(a.rollback_copy),read_xlsx(a.calculated_copy),manifest,receipt)
    result["calculatedCopySHA256"]=sha(a.calculated_copy)
    result["originalAndRollbackSHA256"]=SOURCE_SHA
    print(json.dumps(result,indent=2))

if __name__=="__main__":
    main()
