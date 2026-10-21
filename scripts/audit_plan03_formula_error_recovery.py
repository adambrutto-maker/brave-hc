"""Read-only Plan 03 Y4674 formula-error recovery acceptance gate.

Checks immutable original workbook and two PRIVATE disposable XLSX copies.
The sole source intervention is clearing a whitespace-only Excel shared string
at Y4674; HTO player statistics, source formulas, and live publishers are not
modified. Never write a workbook or query HTO.
"""
from __future__ import annotations
import argparse
from hashlib import sha256
import json
from pathlib import Path
import re
from xml.etree import ElementTree as ET
from zipfile import ZipFile

NS="{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
ORIGINAL_SHA="0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154"
BEFORE_SHA="a9069bffe4227311d9e8b22822aa0be3e5c849d00cf3b97f05961446ec22bcea"
EXPECTED_ORIGINAL={
 ("Skater Profile","I13","#REF!"),
 ("Skater Profile","J13","#REF!"),
}
NEW_ERRORS={
 ("Player Game Logs","BC4674","#VALUE!"),
 ("Player Game Logs","BP4674","#VALUE!"),
 ("Player Stats","Z649","#VALUE!"),
}
GOALIE_CELLS=("GJ363","GK363","GQ363","HA363")
TARGET_Y="Y4674"

class FormulaRecoveryHold(ValueError):
    pass

def sha(path):
    return sha256(path.read_bytes()).hexdigest()

def scan(path):
    """Read Excel XML; compare decoded typed source cells and formula definitions."""
    result={"memberNames":set(),"names":[],"formulas":{},"formulaCount":0,
            "errors":set(),"samples":{}}
    with ZipFile(path) as z:
        corrupt=z.testzip()
        if corrupt is not None:
            raise FormulaRecoveryHold("CORRUPTED_WORKBOOK_MEMBER")
        result["memberNames"]=set(z.namelist())
        wb=ET.fromstring(z.read("xl/workbook.xml"))
        result["names"]=[el.get("name") for el in wb.find(NS+"sheets")]
        shared=ET.fromstring(z.read("xl/sharedStrings.xml"))
        words=["".join(t.text or "" for t in item.iter(NS+"t"))
               for item in shared.findall(NS+"si")]
        for index,name in enumerate(result["names"],1):
            digest=sha256()
            with z.open(f"xl/worksheets/sheet{index}.xml") as stream:
                for _,row in ET.iterparse(stream,events=("end",)):
                    if row.tag!=NS+"row":continue
                    for cell in row.findall(NS+"c"):
                        ref=cell.get("r")
                        if not ref:continue
                        formula=cell.find(NS+"f")
                        stored=cell.find(NS+"v")
                        raw=stored.text if stored is not None else None
                        if formula is not None:
                            result["formulaCount"]+=1
                            digest.update((ref+"\x1f"+(formula.text or "")+"\n").encode("utf-8"))
                        if cell.get("t")=="e":
                            result["errors"].add((name,ref,raw))
                        if name=="Player Game Logs" and ref in (*GOALIE_CELLS,TARGET_Y):
                            if cell.get("t")=="s" and raw is not None:
                                value=words[int(raw)]
                            else:
                                value=raw
                            result["samples"][ref]=(value,formula is not None)
                    row.clear()
            result["formulas"][name]=digest.hexdigest()
    return result

def classify(original, before, after, *, original_sha, before_sha, after_sha):
    if original_sha!=ORIGINAL_SHA or before_sha!=BEFORE_SHA:
        raise FormulaRecoveryHold("IMMUTABLE_OR_PRE_REPAIR_SOURCE_HASH_DRIFT")
    if not isinstance(after_sha,str) or not re.fullmatch(r"[0-9a-f]{64}",after_sha):
        raise FormulaRecoveryHold("REPAIRED_SOURCE_SHA_INVALID")
    if original["errors"]!=EXPECTED_ORIGINAL:
        raise FormulaRecoveryHold("ORIGINAL_SOURCE_ERRORS_DIFFER_FROM_VERIFIED_BASELINE")
    if before["errors"]!=EXPECTED_ORIGINAL|NEW_ERRORS:
        raise FormulaRecoveryHold("PRE_REPAIR_ERROR_SET_NOT_VERIFIED")
    if after["errors"]!=EXPECTED_ORIGINAL:
        raise FormulaRecoveryHold("NEW_OR_UNREPAIRED_FORMULA_ERRORS")
    if len(after["names"])!=17 or not (original["names"]==before["names"]==after["names"]):
        raise FormulaRecoveryHold("WORKBOOK_SHEET_NAMES_OR_ORDER_CHANGED")
    if before["memberNames"]!=after["memberNames"]:
        raise FormulaRecoveryHold("EXCEL_PACKAGE_STRUCTURE_DRIFT")
    if (before["formulaCount"]!=545506 or after["formulaCount"]!=before["formulaCount"]
        or before["formulas"]!=after["formulas"]):
        raise FormulaRecoveryHold("FORMULA_COUNT_OR_DEFINITION_CHANGED")
    if before["samples"].get(TARGET_Y)!=(" ",False):
        raise FormulaRecoveryHold("Y4674_NOT_SINGLE_WHITESPACE_SOURCE")
    if after["samples"].get(TARGET_Y, (None,False))!=(None,False):
        raise FormulaRecoveryHold("Y4674_DISPOSABLE_CLEANUP_NOT_BLANK")
    for ref in GOALIE_CELLS:
        if before["samples"].get(ref)!=after["samples"].get(ref):
            raise FormulaRecoveryHold("GOALIE_PREVIOUSLY_VERIFIED_DATA_CHANGED_"+ref)
    return {
      "schema":"brave-hc-plan03-formula-error-recovery/v1",
      "status":"THREE_VALUE_ERRORS_CLEARED_DISPOSABLE_ONLY",
      "originalBaselineErrors":len(EXPECTED_ORIGINAL),
      "newValueErrorsBefore":len(NEW_ERRORS),
      "newValueErrorsAfter":0,
      "formulaDefinitionsPreserved":True,
      "formulaCount":545506,
      "sheetsChecked":17,
      "Y4674Before":"single_whitespace_shared_string",
      "Y4674After":"empty_source_cell_unknown_statistic",
      "originalWorkbookSHA256":ORIGINAL_SHA,
      "privatePreRepairSHA256":BEFORE_SHA,
      "privateRepairedSHA256":after_sha,
      "existingGoalieInputValuesUnchanged":True,
      "sourceOfTruthModified":False,
      "unsupportedPIMandPOTGResolved":False,
      "allSheetCalculationsCertified":False,
      "awardsAndPublicReleaseAuthorized":False,
      "futureHTOGame3375682Admitted":False,
    }

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--original",type=Path,required=True)
    p.add_argument("--before",type=Path,required=True)
    p.add_argument("--after",type=Path,required=True)
    a=p.parse_args()
    result=classify(scan(a.original),scan(a.before),scan(a.after),
        original_sha=sha(a.original),before_sha=sha(a.before),after_sha=sha(a.after))
    print(json.dumps(result,indent=2))

if __name__=="__main__":
    main()
