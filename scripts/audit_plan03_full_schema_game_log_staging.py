"""Plan 03 full-schema player-game-log admission preflight (READ ONLY).

Creates a review manifest, NEVER writes to XLSX, HTO or a public HockeyOS feed.
A table extension is expressly HELD when a source cell would be overwritten,
or when legacy manual fields lack official HTO values.
"""
from __future__ import annotations
from collections import Counter
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET
import argparse
import hashlib
import json
import re

from audit_plan03_player_game_log_coverage import (
    load_xlsx_rows, audit as coverage_audit, SOURCE_SHA, MAP, ReviewHold
)

NS="{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
SCHEMAS={
  "skaters":{"table":"SkaterStatsByGame","tableNo":9,"ref":"A2:FB4668",
             "firstNewRow":4669,"lastNewRow":4708,"colStart":1,"colEnd":158,"expectedColumns":158,
             "templateRow":4668,
             "mapped":{"A":"game","P":"no","Q":"name","R":"position","S":"gp",
                       "T":"g","U":"a","V":"pts","AB":"pim","AJ":"plusminus","AP":"potg"}},
  "goalies":{"table":"GoalieStatsByGame","tableNo":10,"ref":"FD2:JO363",
             "firstNewRow":364,"lastNewRow":366,"colStart":160,"colEnd":275,"expectedColumns":116,
             "templateRow":363,
             "mapped":{"FD":"game","GG":"no","GH":"name","GI":"gp",
                       "GK":"losses","GQ":"goalsAgainst","HA":"potg"}},
}
KNOWN_GAMES={3356177,3356178,3369564,3375601}
SUPPORTED = {
 "skaters":{"gp","g","a","pts","plusminus","potg","pim"},
 "goalies":{"gp","losses","goalsAgainst","potg"},
}

def col_num(name):
 n=0
 for char in name:n=n*26+ord(char)-64
 return n

def whole_number(x, label, *, allow_negative=False):
 if type(x) is not int or (not allow_negative and x<0):
  raise ReviewHold("HTO_FIELD_INVALID_"+label)
 return x

def cell_source_text(cell, shared_strings):
 """Decode Excel cell storage without confusing shared-string IDs with values.

 Returns (kind, decoded value, raw on-disk value). A whitespace-only string
 occupies a physical cell but is not evidence of a numeric/statistical input.
 """
 formula=cell.find(NS+"f")
 value=cell.find(NS+"v")
 inline=cell.find(NS+"is")
 raw=value.text if value is not None else None
 if formula is not None:
  return "formula", None, raw
 ctype=cell.get("t")
 if ctype=="s":
  if raw is None:
   raise ReviewHold("SHARED_STRING_INDEX_MISSING")
  try:
   idx=int(raw)
   if str(idx)!=raw or idx<0:
    raise ValueError("Invalid index")
   text=shared_strings[idx]
  except (ValueError, IndexError) as exc:
   raise ReviewHold("SHARED_STRING_INDEX_INVALID") from exc
  return ("whitespace_only_shared_string" if not text.strip()
          else "preexisting_shared_string"), text, raw
 if inline is not None:
  text="".join(node.text or "" for node in inline.iter(NS+"t"))
  return ("whitespace_only_inline_string" if not text.strip()
          else "preexisting_inline_string"), text, None
 if raw is not None:
  return ("whitespace_only_value" if not raw.strip()
          else "preexisting_value"), raw, raw
 return "empty_or_style_only", None, None


def row_structure(book: Path):
 if hashlib.sha256(book.read_bytes()).hexdigest()!=SOURCE_SHA:
  raise ReviewHold("IMMUTABLE_SOURCE_SHA_DRIFT")
 with ZipFile(book) as z:
  if z.testzip() is not None:raise ReviewHold("SOURCE_XLSX_CORRUPTED")
  headings={}
  for kind,cfg in SCHEMAS.items():
   root=ET.fromstring(z.read(f"xl/tables/table{cfg['tableNo']}.xml"))
   if root.get("displayName")!=cfg["table"] or root.get("ref")!=cfg["ref"]:
    raise ReviewHold("ORIGINAL_TABLE_BOUNDARY_CHANGED")
   fields=root.find(NS+"tableColumns")
   names=[c.get("name") for c in fields.findall(NS+"tableColumn")]
   if len(names)!=cfg["expectedColumns"]:
    raise ReviewHold("LEGACY_FULL_SCHEMA_COLUMN_COUNT_DRIFT")
   headings[kind]=names
   # Confirm mapped fields by header name, not only by Excel letter.
   expected={"skaters":{"A":"Game #","P":"#","Q":"Name","R":"POS","S":"GP",
                          "T":"G","U":"A","V":"Pts","AB":"PIM","AJ":"+/-","AP":"POTG"},
             "goalies":{"FD":"Game #","GG":"#","GH":"Name","GI":"GP",
                         "GK":"L","GQ":"GA","HA":"POTG"}}[kind]
   for column,label in expected.items():
    idx=col_num(column)-cfg["colStart"]
    if names[idx]!=label:
     raise ReviewHold("LEGACY_COLUMN_HEADER_MISMATCH_"+column)
  stringroot=ET.fromstring(z.read("xl/sharedStrings.xml"))
  shared_strings=["".join(t.text or "" for t in node.iter(NS+"t"))
                  for node in stringroot.findall(NS+"si")]
  templates={name:{} for name in SCHEMAS}
  collisions={name:[] for name in SCHEMAS}
  with z.open("xl/worksheets/sheet3.xml") as source:
   for _,row in ET.iterparse(source,events=("end",)):
    if row.tag!=NS+"row":continue
    r=int(row.get("r","0"))
    for kind,cfg in SCHEMAS.items():
     template=r==cfg["templateRow"]
     proposed=cfg["firstNewRow"]<=r<=cfg["lastNewRow"]
     if not template and not proposed:continue
     for c in row.findall(NS+"c"):
      ref=c.get("r","")
      m=re.match(r"^([A-Z]+)(\d+)$",ref)
      if not m:continue
      col=m.group(1)
      if not cfg["colStart"]<=col_num(col)<=cfg["colEnd"]:continue
      f=c.find(NS+"f");v=c.find(NS+"v")
      if template:
       templates[kind][col]={"formula":f is not None,
            "nonBlank":v is not None and v.text is not None}
      if proposed:
       state,decoded,raw=cell_source_text(c,shared_strings)
       if state!="empty_or_style_only":
        collisions[kind].append({
          "cell":ref,"kind":state,"value":decoded,
          "onDiskValue":raw,"excelCellType":c.get("t"),
          "statisticalInputVerified":False,
          "safeToOverwriteWithoutOwnerReview":False
        })
    row.clear()
  return headings,templates,collisions

def manifest(feed, baseline, headings, templates, collisions):
 covered=coverage_audit(feed,baseline)
 if (covered["status"]!="GAME_LOG_INCOMPLETE_HOLD"
     or covered["officialSkaterGameObservations"]!=54
     or covered["legacySkaterGameRows"]!=14
     or covered["officialGoalieGameObservations"]!=4
     or covered["legacyGoalieGameRows"]!=1):
  raise ReviewHold("LEGACY_SOURCE_COVERAGE_UNEXPECTED")
 if (set(x["htoGameId"] for x in feed["games"])!=KNOWN_GAMES
     or feed.get("playerAggregateParity") is not True
     or feed.get("allGamesDiscovered") is not True):
  raise ReviewHold("HTO_GAME_IDS_OR_PARITY_DRIFT")
 output={"skaters":[],"goalies":[]}
 coverage=Counter()
 # All 43 proposed rows stay private. Existing game 359 data is NEVER overwritten.
 for kind in output:
  cfg=SCHEMAS[kind]
  already={(int(r["game"]),r["name"]) for r in baseline[kind]}
  staged=[]
  for game in sorted(feed["games"], key=lambda g: MAP[g["htoGameId"]]):
   gid=game["htoGameId"];game_no=MAP[gid]
   source=game[kind]
   names=[x.get("name") for x in source]
   if len(set(names))!=len(names) or any(not isinstance(n,str) or not n for n in names):
    raise ReviewHold("UNIQUE_PLAYER_IDENTITY_NOT_ESTABLISHED")
   for person in source:
    if (game_no,person["name"]) in already:continue
    values={"game":game_no,"name":person["name"],"no":person.get("no")}
    if kind=="skaters":values["position"]=person.get("position")
    for k in SUPPORTED[kind]:
     value=person.get(k)
     if value is not None:whole_number(value,k,allow_negative=k=="plusminus")
     values[k]=value
    if kind=="skaters" and values["g"]+values["a"]!=values["pts"]:
     raise ReviewHold("HTO_SKATER_G_A_POINTS_MISMATCH")
    if kind=="goalies" and values["gp"]==1 and values["losses"]!=1:
     raise ReviewHold("UNEXPECTED_GOALIE_LOSS_BASELINE")
    if not isinstance(values["no"],str) or not values["no"]:
     raise ReviewHold("HTO_JERSEY_PROVENANCE_ABSENT")
    withheld=[]
    proposed={}
    for col,k in cfg["mapped"].items():
     value=values.get(k)
     if value is None:
      withheld.append({"column":col,"sourceField":k,"reason":"UNKNOWN_IN_VERIFIED_HTO_FEED"})
      coverage[f"{kind}_withheld_{k}"]+=1
     else:proposed[col]=value
    labels=headings[kind]
    unmapped_manual=[
      {"column":col,"field":labels[col_num(col)-cfg["colStart"]]}
      for col,meta in sorted(templates[kind].items(),key=lambda pair:col_num(pair[0]))
      if not meta["formula"] and col not in cfg["mapped"]
    ]
    flags=[]
    if values["no"]=="0":flags.append("HTO_JERSEY_ZERO_VALIDATE")
    if person["name"].startswith("Unknown,"):flags.append("IDENTITY_PLACEHOLDER_NO_PROFILE_INFERENCE")
    staged.append({"worksheetRow":cfg["firstNewRow"]+len(staged),
      "sourceGame":gid,"bookGame":game_no,"name":person["name"],
      "proposedSourceOnlyCells":proposed,"withheldHTOFields":withheld,
      "unavailableLegacyManualFields":unmapped_manual,"identityReviewFlags":flags,
      "approvedForExcelWrite":False})
  if len(staged)!=cfg["lastNewRow"]-cfg["firstNewRow"]+1:
   raise ReviewHold("STAGED_ROWS_NOT_EXACT_"+kind.upper())
  output[kind]=staged
 summary={}
 for kind,cfg in SCHEMAS.items():
  labels=headings[kind]
  mapped=cfg["mapped"]
  formula_count=sum(bool(s["formula"]) for s in templates[kind].values())
  manual_count=sum(not s["formula"] for s in templates[kind].values())
  summary[kind]={"fullColumnCount":len(labels),
    "currentTableRef":cfg["ref"],
    "requiredProposedExtensionRows":[cfg["firstNewRow"],cfg["lastNewRow"]],
    "sourceValueFieldsCount":len(mapped),
    "templateFormulaColumns":formula_count,
    "templateManualColumns":manual_count,
    "unsupportedExampleFields":[x for x in labels if x in ("SOG","PPG","SHG","GWG","GTG","FO","SA","Saves","Pct")],
    "admissionCollisionCells":collisions[kind]}
 collision_count=sum(len(v) for v in collisions.values())
 whitespace_count=sum(1 for values in collisions.values() for cell in values
                      if cell["kind"].startswith("whitespace_only_"))
 meaningful_count=collision_count-whitespace_count
 return {
  "schema":"brave-hc-plan03-private-game-log-full-schema-preflight/v1",
  "status":"REVIEW_ONLY_HELD_FOR_EXISTING_CELLS_AND_UNSUPPORTED_STATS",
  "officialGames":4,
  "legacyGameLogCoverage":covered,
  "tables":summary,
  "stagedRows":{"skaters":len(output["skaters"]),"goalies":len(output["goalies"])},
  "withheldOfficialFields":dict(coverage),
  "sourceProposedRows":output,
  "sourceCollisions":collision_count,
  "sourceWhitespaceOnlyCells":whitespace_count,
  "sourceMeaningfulDataCollisions":meaningful_count,
  "sourceCellStorageDecoded":True,
  "sourceRecordConflictCount":len(covered["conflicts"]),
  "identityAssignmentApproved":False,
  "formulaPropagationVerified":False,
  "structuredTableResizeApproved":False,
  "originalWorkbookModified":False,
  "disposableWorkbookModified":False,
  "sourcePublicationAuthorized":False,
  "nextGame3375682Admitted":False,
 }

def main():
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument("--immutable-workbook",type=Path,required=True)
 p.add_argument("--hto-feed",type=Path,required=True)
 a=p.parse_args()
 feed=json.loads(a.hto_feed.read_text(encoding="utf8"))
 headings,templates,collisions=row_structure(a.immutable_workbook)
 legacy=load_xlsx_rows(a.immutable_workbook)
 print(json.dumps(manifest(feed,legacy,headings,templates,collisions),indent=2,ensure_ascii=False))

if __name__=="__main__":main()
