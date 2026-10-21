"""Plan 03: never equate legacy record-holder rows to official HTO Record entries.

Read-only source scope comparison. The official HTO Record Book is a
different representation from RecordLedger Major/Minor/Display and profile
fields I13/J13 have lost their formulas. This is NOT an authoring adapter.
"""
from __future__ import annotations
import argparse
from collections import Counter
import json
from pathlib import Path
import re
from audit_plan03_profile_record_streak_sources import read_original, SourceHold

OFFICIAL_AUTHORITY="OFFICIAL_HTO_PUBLIC_READBACK"
OFFICIAL_BASELINE=558
OFFICIAL_GROUPS=119
OFFICIAL_PLAYER="Adam Brutto"
EXPECTED_PERIODS={"Playoffs":7,"Game":10,"Season":2,"Career":6}

def read_verified_hto_records(snapshot:dict,player=OFFICIAL_PLAYER)->dict:
    if (snapshot.get("schema")!="brave-hc-hto-history-snapshot/v1"
        or snapshot.get("type")!="records"
        or snapshot.get("entryCount")!=OFFICIAL_BASELINE
        or snapshot.get("source",{}).get("authority")!=OFFICIAL_AUTHORITY):
        raise SourceHold("OFFICIAL_HTO_RECORD_SNAPSHOT_NOT_ADMITTED")
    groups=snapshot.get("groups")
    if not isinstance(groups,list) or len(groups)!=OFFICIAL_GROUPS:
        raise SourceHold("HTO_RECORD_GROUPS_CHANGED_REVIEW_REQUIRED")
    entries=[]
    total=0
    pattern=re.compile(r"(?<![A-Za-z])"+re.escape(player)+r"(?![A-Za-z])",re.I)
    for group in groups:
        items=group.get("items") if isinstance(group,dict) else None
        if not isinstance(items,list):
            raise SourceHold("RECORD_GROUP_MALFORMED")
        for item in items:
            if not isinstance(item,str):raise SourceHold("HTO_RECORD_ENTRY_NOT_TEXT")
            total+=1
            if pattern.search(item):
                entries.append({"category":group.get("category"),"period":group.get("period"),"entry":item})
    if total!=OFFICIAL_BASELINE:raise SourceHold("OFFICIAL_HTO_RECORD_ENTRY_COUNT_CONFLICT")
    periods=dict(Counter(x["period"] for x in entries))
    if len(entries)!=25 or periods!=EXPECTED_PERIODS:
        raise SourceHold("PLAYER_OFFICIAL_RECORD_MENTIONS_CHANGED_REVIEW_REQUIRED")
    return {"allEntries":total,"allGroups":len(groups),"playerEntries":entries,"periods":periods}

def reconcile(original:dict,official:dict)->dict:
    profile=original.get("profile",{})
    if (profile.get("player")!="Brutto, Adam"
        or profile.get("I13")!={"value":"#REF!","formula":False,"type":"e"}
        or profile.get("J13")!={"value":"#REF!","formula":False,"type":"e"}):
        raise SourceHold("ORIGINAL_PROFILE_ERRORS_OR_IDENTITY_CHANGED")
    roster=[r for r in original.get("roster",[]) if r.get("name")==profile["player"]]
    if len(roster)!=1:raise SourceHold("LEGACY_PROFILE_ROSTER_NOT_UNIQUE")
    row=roster[0]
    if tuple(str(row.get(k)) for k in ("major","minor","total","points"))!=("15","13","28","196"):
        raise SourceHold("LEGACY_RECORD_HOLDER_COUNTS_CHANGED")
    classes=Counter(r.get("class") for r in original.get("ledger",[]))
    if classes!={"Major":15,"Minor":13,"Display":51}:
        raise SourceHold("LEGACY_RECORD_LEDGER_SCOPE_CHANGED")
    if (sum(int(float(r.get("major") or 0)) for r in original["ledger"])!=15
        or sum(int(float(r.get("minor") or 0)) for r in original["ledger"])!=13
        or sum(int(float(r.get("points") or 0)) for r in original["ledger"])!=196):
        raise SourceHold("LEGACY_RECORD_LEDGER_TOTALS_CHANGED")
    if (official.get("allEntries"),official.get("allGroups"))!=(558,119):
        raise SourceHold("OFFICIAL_HTO_SOURCE_BASELINE_CHANGED")
    rows=official.get("playerEntries",[])
    if len(rows)!=25 or Counter(x["period"] for x in rows)!=EXPECTED_PERIODS:
        raise SourceHold("OFFICIAL_PROFILE_RECORD_SCOPE_CHANGED")
    return {
        "schema":"brave-hc-plan03-legacy-hto-record-scope-review/v1",
        "status":"RECORD_COUNT_METHODS_DISTINCT_PROFILE_FORMULAS_UNRECOVERED",
        "legacy":{"countedMajorHolderRows":15,"countedMinorHolderRows":13,
                  "countedHolderRows":28,"displayOnlyRows":51,"allLedgerOccurrences":79,
                  "recordPoints":196},
        "officialHTO":{"source":"OFFICIAL_HTO_PUBLIC_READBACK",
                       "allRecordBookEntries":558,"allGroups":119,
                       "playerMentionEntries":25,"playerMentionPeriods":dict(Counter(x["period"] for x in rows))},
        "theseAreDifferentStatisticalScopes":True,
        "differenceOfThreeIsNotEvidenceOfThreeMissingRecords":True,
        "activeProfileRecordsDefinitionCertified":False,
        "totalProfileRecordsDefinitionCertified":False,
        "profileFormulaTextRecovered":False,
        "currentRecordHolderMappingsIndependentlyValidated":False,
        "nativeHTORecordBookChanged":False,
        "originalWorkbookChanged":False,
        "publicProfileRecordsPublished":False,
    }

def main():
    a=argparse.ArgumentParser(description=__doc__)
    a.add_argument("--original-workbook",required=True,type=Path)
    a.add_argument("--verified-hto-records",required=True,type=Path)
    options=a.parse_args()
    source=read_original(options.original_workbook)
    hto=read_verified_hto_records(json.loads(options.verified_hto_records.read_text(encoding="utf-8")))
    print(json.dumps(reconcile(source,hto),indent=2,ensure_ascii=False))

if __name__=="__main__":
    main()
