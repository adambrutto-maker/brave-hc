"""Plan 03: read-only optional 499-cell opponent metadata review.

An already accepted, fully calculated 497-cell PRIVATE Excel workbook is the
immutable input. A *different disposable* copy can add only H372/H373 with
official HTO opponent names. This checker never writes Excel or publishes.

Passing this narrow metadata source review does NOT certify recalculated
499-cell outputs or grant original-workbook owner permission.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

from audit_plan03_missing_schedule_opponents import (
    validate as validate_hto_opponents,
    schedule_rows,
    NameHold,
    MAP,
    ORIGINAL_SHA,
    COMPOSITE_SHA as ACCEPTED_497_SHA,
)
from audit_plan03_integrated_497_source import read_master_schedule_caches
from audit_plan03_exact_promotion_preflight import (
    source_manifest_contract,
    scan_workbook,
    PromotionHold,
    CORRECTED_GOALIE,
    numeric,
)

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
EXTRA = {372: ("H372", "Michelob Morts"), 373: ("H373", "Zamboner Crew")}
SCHEDULE_REVIEW_COLUMNS = {"B", "C", "D", "E", "F", "G", "H", "I", "O", "T", "U", "X"}
FULL_WORKBOOK_SHEETS = 17
EXPECTED_FORMULAS = 545506

class MetadataHold(ValueError):
    pass


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def text_at(cell, shared):
    v = cell.find(NS+"v")
    inline = cell.find(NS+"is")
    raw = v.text if v is not None else None
    if cell.get("t") == "s" and raw is not None:
        try:
            i = int(raw)
            if str(i) != raw or i < 0:
                raise ValueError("bad index")
            return ("text",shared[i])
        except (ValueError,IndexError) as exc:
            raise MetadataHold("INVALID_EXCEL_SHARED_STRING") from exc
    if inline is not None:
        return ("text","".join(t.text or "" for t in inline.iter(NS+"t")))
    if raw is None:
        return None
    if cell.get("t") == "e":
        return ("error",raw)
    if cell.get("t") == "b":
        return ("boolean",raw)
    if cell.get("t") in ("str","inlineStr"):
        return ("text",raw)
    # Do not coerce semantic source values such as Mohawks HC to numbers.
    return ("numeric",raw)


def workbook_fingerprints(path):
    """Typed source inputs for schedule (minus the two proposed names) and formulas.

    Formula caches are intentionally excluded. The names are excluded from the
    stable schedule digest, but verified individually by compare() below.
    """
    with ZipFile(path) as z:
        if z.testzip() is not None:
            raise MetadataHold("EXCEL_PACKAGE_ZIP_CRC_FAILURE")
        names = set(z.namelist())
        ss = ET.fromstring(z.read("xl/sharedStrings.xml"))
        strings = ["".join(t.text or "" for t in row.iter(NS+"t"))
                   for row in ss.findall(NS+"si")]
        workbook = ET.fromstring(z.read("xl/workbook.xml"))
        sheet_names = [s.get("name") for s in workbook.find(NS+"sheets")]
        if len(sheet_names) != FULL_WORKBOOK_SHEETS:
            raise MetadataHold("EXPECTED_SEVENTEEN_SHEETS")
        formula_sha = hashlib.sha256()
        schedule_sha = hashlib.sha256()
        formula_count = 0
        schedule_manual_count = 0
        source_h = {}
        schedule_fields = {}
        for index, sheet_name in enumerate(sheet_names,1):
            with z.open(f"xl/worksheets/sheet{index}.xml") as stream:
                for _,row in ET.iterparse(stream, events=("end",)):
                    if row.tag != NS+"row":
                        continue
                    row_num = int(row.get("r","0"))
                    for cell in row.findall(NS+"c"):
                        ref = cell.get("r")
                        if not ref:
                            continue
                        formula = cell.find(NS+"f")
                        if formula is not None:
                            formula_count += 1
                            formula_sha.update((sheet_name+"|"+ref+"|"+(formula.text or "")+"\n").encode("utf8"))
                            continue
                        if index != 12:
                            continue
                        value = text_at(cell,strings)
                        if value is None:
                            continue
                        if 370 <= row_num <= 374 and ref in ("H370","H371","H372","H373","H374"):
                            source_h[ref] = value
                        if 370 <= row_num <= 374 and ref[:1] in SCHEDULE_REVIEW_COLUMNS:
                            schedule_fields[ref] = value
                        if ref in ("H372","H373"):
                            continue
                        # Typed digest of EVERY unchanged manual cell in Master Schedule.
                        schedule_sha.update((ref+"|"+json.dumps(value,ensure_ascii=False)+"\n").encode("utf8"))
                        schedule_manual_count += 1
                    row.clear()
        return {
            "members":names,"sheets":sheet_names,"formulaSHA":formula_sha.hexdigest(),
            "formulaCount":formula_count,
            "stableScheduleManualSHA":schedule_sha.hexdigest(),
            "stableScheduleManualCount":schedule_manual_count,
            "scheduleOpponentCells":source_h,
            "scheduleFields":schedule_fields,
        }


def compare_499(accepted497, candidate499, source_proof, *, base_sha, candidate_sha,
                source497=None, candidate497=None, original=None):
    """No claim that the candidate's dependent formulas/pivots were recalculated."""
    if base_sha != ACCEPTED_497_SHA or base_sha == candidate_sha:
        raise MetadataHold("PRIVATE_497_SOURCE_HASH_OR_NEW_CANDIDATE_INVALID")
    if not isinstance(candidate_sha,str) or len(candidate_sha) != 64:
        raise MetadataHold("PRIVATE_499_CANDIDATE_HASH_INVALID")
    if (source_proof.get("status")!="TWO_OPPONENT_NAMES_VERIFIED_PRIVATE_REVIEW_ONLY"
        or source_proof.get("source497CellCompositeTechnicallyVerifiedSeparately") is not True
        or source_proof.get("newOpponentValuesInsertedInComposite") is not False
        or source_proof.get("wouldBecomeAdditionalSourceCells") != 2
        or source_proof.get("sourceOfTruthOwnerApprovalGranted") is not False):
        raise MetadataHold("OFFICIAL_ADDITIONAL_NAME_SOURCE_REVIEW_NOT_ACCEPTED")
    proposals=source_proof.get("newOpponentNamesProposed")
    if not isinstance(proposals,list) or len(proposals)!=2:
        raise MetadataHold("HTO_SOURCE_NAME_PROPOSALS_INCOMPLETE")
    if any(row.get("approvalToWriteOriginal") is not False for row in proposals):
        raise MetadataHold("HTO_SOURCE_REVIEW_MUST_NOT_APPROVE_ORIGINAL_WRITE")
    official_rows = {(x.get("cell"),x.get("verifiedOpponent")) for x in proposals}
    if official_rows != {(ref,val) for ref,val in EXTRA.values()}:
        raise MetadataHold("HTO_SOURCE_NAME_SET_CHANGED")
    if accepted497["members"] != candidate499["members"]:
        raise MetadataHold("EXCEL_PACKAGE_COMPONENTS_CHANGED")
    if accepted497["sheets"] != candidate499["sheets"]:
        raise MetadataHold("EXCEL_WORKSHEET_ORDER_CHANGED")
    if (accepted497["formulaCount"] != EXPECTED_FORMULAS
        or candidate499["formulaCount"] != EXPECTED_FORMULAS
        or accepted497["formulaSHA"] != candidate499["formulaSHA"]):
        raise MetadataHold("WORKBOOK_FORMULA_DEFINITION_DRIFT")
    if (accepted497["stableScheduleManualSHA"]!=candidate499["stableScheduleManualSHA"]
        or accepted497["stableScheduleManualCount"]!=candidate499["stableScheduleManualCount"]):
        raise MetadataHold("OTHER_SCHEDULE_MANUAL_SOURCE_EDIT_DETECTED")
    if accepted497["scheduleOpponentCells"].get("H372") is not None or accepted497["scheduleOpponentCells"].get("H373") is not None:
        raise MetadataHold("497_BASELINE_ALREADY_CONTAINS_OPPONENT_NAME")
    for row,(ref,name) in EXTRA.items():
        if candidate499["scheduleOpponentCells"].get(ref) != ("text",name):
            raise MetadataHold("HTO_OPPONENT_NAME_NOT_IN_CORRECT_CELL_"+ref)
    for key in ("H370","H371","H374"):
        if accepted497["scheduleOpponentCells"].get(key)!=candidate499["scheduleOpponentCells"].get(key):
            raise MetadataHold("OTHER_OFFICIAL_OR_FUTURE_OPPONENT_CHANGED_"+key)
    if candidate499["scheduleOpponentCells"].get("H371") != ("text","Mohawks HC"):
        raise MetadataHold("UNAPPROVED_MOHAWKS_ALIAS_NORMALIZATION")
    for row in (372,373):
        for col in ("F","G","I"):
            key=col+str(row)
            if (accepted497["scheduleFields"].get(key) is not None
                or candidate499["scheduleFields"].get(key) is not None):
                raise MetadataHold("UNVERIFIED_ADJACENT_GAME_METADATA_ENTERED_"+key)
    if candidate499["scheduleFields"].get("X374") != accepted497["scheduleFields"].get("X374"):
        raise MetadataHold("UNPLAYED_FUTURE_GAME_CHANGED")
    if original is not None and source497 is not None and candidate497 is not None:
        if (source497["tableRefs"]!=candidate497["tableRefs"]
            or source497["legacyManualHashes"]!=candidate497["legacyManualHashes"]
            or source497["legacyManualCounts"]!=candidate497["legacyManualCounts"]):
            raise MetadataHold("HTO_PLAYER_INPUT_SOURCE_CHANGED_DURING_OPPONENT_STAGE")
    return {
      "schema":"brave-hc-plan03-optional-499-opponent-source-gate/v1",
      "status":"PRIVATE_499_OPPONENT_METADATA_SAVED_REVIEW_ONLY",
      "priorIntegratedSourceChanges":497,
      "newOfficialOpponentCells":2,
      "totalSourceChangesUnderReview":499,
      "newOpponentNames":[{"cell":ref,"opponent":name} for ref,name in EXTRA.values()],
      "source497CandidateSHA256":base_sha,
      "source499CandidateSHA256":candidate_sha,
      "otherScheduleSourceInputsPreserved":True,
      "worksheetAndFormulaDefinitionsPreserved":True,
      "historicalAliasPreserved":True,
      "October25FixtureUnplayed":True,
      "all497PlayerAndTeamInputFieldsCompared":source497 is not None,
      "499FullWorkbookRecalculationCertified":False,
      "499OfficialHTOPivotParityCertified":False,
      "ownerOriginalWorkbookApproval":False,
      "originalWorkbookModified":False,
      "publicWatchOrAwardReleaseAuthorized":False,
    }


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--original",required=True,type=Path)
    parser.add_argument("--accepted-497",required=True,type=Path)
    parser.add_argument("--new-499-candidate",required=True,type=Path)
    parser.add_argument("--source-joined-hto",required=True,type=Path)
    parser.add_argument("--source-period-evidence",required=True,type=Path)
    args=parser.parse_args()
    if digest(args.original)!=ORIGINAL_SHA or digest(args.accepted_497)!=ACCEPTED_497_SHA:
        raise MetadataHold("IMMUTABLE_OR_ACCEPTED_497_SHA_DRIFT")
    joined=json.loads(args.source_joined_hto.read_text(encoding="utf8"))
    periods=json.loads(args.source_period_evidence.read_text(encoding="utf8"))
    plan,unknown=source_manifest_contract(joined,periods)
    original=scan_workbook(args.original,plan,unknown,is_original=True)
    accepted_inputs=scan_workbook(args.accepted_497,plan,unknown,is_original=False)
    candidate_inputs=scan_workbook(args.new_499_candidate,plan,unknown,is_original=False)
    # Exact approved 497 player, goalie, team and blank source data are still present.
    for sheet in (3,12):
        for ref,val in plan[sheet].items():
            if candidate_inputs["targetCellValues"][sheet].get(ref)!=val:
                raise MetadataHold("EXISTING_497_HTO_SOURCE_INPUT_CHANGED_"+ref)
    for ref in unknown:
        if candidate_inputs["targetCellValues"][3].get(ref) is not None:
            raise MetadataHold("HTO_UNKNOWN_FIELD_FILLED_"+ref)
    for ref,(_,new) in CORRECTED_GOALIE.items():
        if candidate_inputs["targetCellValues"][3].get(ref)!=("number",numeric(new)):
            raise MetadataHold("GOALIE_SOURCE_CHANGED_"+ref)
    if candidate_inputs["targetCellValues"][3].get("Y4674") is not None:
        raise MetadataHold("NONZERO_OR_NONBLANK_Y4674")
    if accepted_inputs["tableRefs"]!=candidate_inputs["tableRefs"]:
        raise MetadataHold("SOURCE_TABLE_RANGE_CHANGED")
    if accepted_inputs["legacyManualHashes"]!=candidate_inputs["legacyManualHashes"] or accepted_inputs["legacyManualCounts"]!=candidate_inputs["legacyManualCounts"]:
        raise MetadataHold("HISTORICAL_PLAYER_MANUAL_SOURCE_DRIFT")
    # The future October 25 fixture remains uncounted, and all four old
    # completed-game formula caches must remain in the approved score scope.
    base_games=read_master_schedule_caches(args.accepted_497)
    new_games=read_master_schedule_caches(args.new_499_candidate)
    if base_games!=new_games:
        raise MetadataHold("499_METADATA_COPY_CHANGED_VERIFIED_TEAM_SCORE_RESULTS")
    source_claim=validate_hto_opponents(
        schedule_rows(args.original),schedule_rows(args.accepted_497),periods)
    before=workbook_fingerprints(args.accepted_497)
    after=workbook_fingerprints(args.new_499_candidate)
    result=compare_499(before,after,source_claim,
        base_sha=ACCEPTED_497_SHA,candidate_sha=digest(args.new_499_candidate),
        original=original,source497=accepted_inputs,candidate497=candidate_inputs)
    result["fourExistingHTOTeamGameCachesUnchanged"]=True
    result["immutableOriginalSHA256"]=ORIGINAL_SHA
    result["HTOPeriodSourceSHA256"]=digest(args.source_period_evidence)
    result["privateJoinedSourceSHA256"]=digest(args.source_joined_hto)
    print(json.dumps(result,indent=2,ensure_ascii=False))

if __name__=="__main__":
    main()
