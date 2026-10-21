"""Plan 03: read-only validation of a source-only import in a disposable XLSX.

Never changes files, invokes Excel, imports private source data to CI, or
approves native HTO or public stats publishing.
"""
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile
import argparse
import hashlib
import json
import re

N="{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
SOURCE_SHA="0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154"
EXPANDED_SHA="36ce65c7483cddd8d15cb8d7179e2b01b4065330e8212674a5f969fd938699c9"
BOUNDS={"skaters":(1,158,2,4668,4669,4708),"goalies":(160,275,2,363,364,366)}
TABLE_REFS={"SkaterStatsByGame":"A2:FB4708","GoalieStatsByGame":"FD2:JO366"}

class ImportHold(ValueError):pass

def sha(path):
 return hashlib.sha256(path.read_bytes()).hexdigest()

def col_number(s):
 n=0
 for c in s:n=n*26+ord(c)-64
 return n

def cells_from_xlsx(path):
 with ZipFile(path) as z:
  if z.testzip() is not None:raise ImportHold("XLSX_CONTAINER_CORRUPTED")
  names=set(z.namelist())
  table={}
  for id in (9,10):
   el=ET.fromstring(z.read(f"xl/tables/table{id}.xml"))
   table[el.get("displayName")]=el.get("ref")
  ss=ET.fromstring(z.read("xl/sharedStrings.xml"))
  strings=["".join(t.text or "" for t in si.iter(N+"t")) for si in ss.findall(N+"si")]
  cells={}
  with z.open("xl/worksheets/sheet3.xml") as data:
   for _,row in ET.iterparse(data,events=("end",)):
    if row.tag!=N+"row":continue
    num=int(row.get("r","0"))
    for kind,(lo,hi,start,end,newlo,newhi) in BOUNDS.items():
     if not start<=num<=newhi:continue
     for cell in row.findall(N+"c"):
      ref=cell.get("r","")
      m=re.match(r"^([A-Z]+)(\d+)$",ref)
      if not m or not lo<=col_number(m.group(1))<=hi:continue
      f=cell.find(N+"f");v=cell.find(N+"v");inline=cell.find(N+"is")
      raw=v.text if v is not None else None
      typ=cell.get("t")
      if typ=="s" and raw is not None:
       try:value=strings[int(raw)]
       except (ValueError,IndexError) as exc:raise ImportHold("INVALID_SHARED_STRING_INDEX") from exc
      elif inline is not None:
       value="".join(t.text or "" for t in inline.iter(N+"t"))
      else:value=raw
      # Keep original formula expressions; ignore their recalculated caches.
      cells[ref]={"formula":None if f is None else f.text or "","value":value}
    row.clear()
  return {"members":names,"table":table,"cells":cells}

def compare(pre,post,staging,receipt):
 if pre["members"]!=post["members"]:
  raise ImportHold("EXCEL_PACKAGE_COMPONENTS_CHANGED")
 if pre["table"]!=TABLE_REFS or post["table"]!=TABLE_REFS:
  raise ImportHold("EXPECTED_RESIZED_TABLE_BOUNDS_CHANGED")
 if receipt.get("schema")!="brave-hc-private-source-only-disposable-import/v1":
  raise ImportHold("SOURCE_IMPORT_RECEIPT_INVALID")
 if (receipt.get("status")!="SOURCE_ONLY_INPUT_STAGED_NOT_RECALCULATED"
     or receipt.get("saved") is not True
     or receipt.get("originalWorkbookChanged") is not False
     or receipt.get("sourceOfTruthPromotionApproved") is not False
     or receipt.get("publicStatisticsReleased") is not False
     or receipt.get("Y4674Preserved") is not True):
  raise ImportHold("SOURCE_IMPORT_ACCEPTANCE_NOT_RECORDED")
 if (staging.get("schema")!="brave-hc-private-game-log-gtg-join-receipt/v1"
     or staging.get("result",{}).get("schema")!="brave-hc-private-source-joined-game-log-staging/v1"
     or staging["result"].get("stagedRows")!={"skaters":40,"goalies":3}
     or staging["result"].get("status")!="HTO_GTGS_JOINED_REVIEW_ONLY"
     or staging["result"].get("structuredTableResizeApproved") is not False):
  raise ImportHold("SOURCE_GTGS_REVIEW_ENVELOPE_CHANGED")
 permitted={}
 withheld=set()
 required={"skaters":set(range(4669,4709)),"goalies":set(range(364,367))}
 for kind,(lo,hi,start,end,newlo,newhi) in BOUNDS.items():
  entries=staging["result"]["sourceProposedRows"][kind]
  if len(entries)!=len(required[kind]) or {row.get("worksheetRow") for row in entries}!=required[kind]:
   raise ImportHold("STAGED_SOURCE_ROW_RANGE_INVALID")
  for row in entries:
   num=row["worksheetRow"]
   for col,value in row["proposedSourceOnlyCells"].items():
    ref=f"{col}{num}"
    if ref in permitted or ref in withheld or not lo<=col_number(col)<=hi:
     raise ImportHold("STAGED_SOURCE_CELL_DUPLICATE_OR_OUTSIDE_TABLE")
    if value is None or isinstance(value,bool):
     raise ImportHold("SOURCE_NULL_OR_BOOL_NOT_VALID_INPUT")
    permitted[ref]=value
   for obj in row["withheldHTOFields"]:
    ref=f"{obj['column']}{num}"
    if ref in permitted or ref in withheld:
     raise ImportHold("WITHHELD_FIELD_CLASHES_WITH_SOURCE_INPUT")
    withheld.add(ref)
 if len(permitted)!=receipt.get("stagedSourceInputCells"):
  raise ImportHold("WRITTEN_CELL_COUNT_DISAGREES_WITH_SOURCE_RECEIPT")
 if len(withheld)!=receipt.get("unknownSourceCellsPreservedBlank"):
  raise ImportHold("WITHHELD_SOURCE_COUNT_DISAGREES_WITH_RECEIPT")
 if receipt.get("stagedSkaterRows")!=40 or receipt.get("stagedGoalieRows")!=3:
  raise ImportHold("DISPOSABLE_ROW_COUNTS_NOT_43")
 counters=Counter()
 for kind,(lo,hi,start,end,newlo,newhi) in BOUNDS.items():
  for ref in set(pre["cells"])|set(post["cells"]):
   m=re.match(r"^([A-Z]+)(\d+)$",ref)
   if m is None:continue
   c=col_number(m.group(1));n=int(m.group(2))
   if not lo<=c<=hi or not start<=n<=newhi:continue
   src=pre["cells"].get(ref,{"formula":None,"value":None})
   dest=post["cells"].get(ref,{"formula":None,"value":None})
   if src["formula"]!=dest["formula"]:
    raise ImportHold("STRUCTURED_EXCEL_FORMULA_CHANGED_"+ref)
   if n<=end:
    if src["formula"] is None and src["value"]!=dest["value"]:
     raise ImportHold("EXISTING_MANUAL_SOURCE_VALUE_CHANGED_"+ref)
    continue
   if ref in permitted:
    if src["formula"] is not None or src["value"] is not None:
     raise ImportHold("HTO_INPUT_WOULD_OVERWRITE_OLD_VALUE_"+ref)
    value=permitted[ref]
    target=dest["value"]
    if dest["formula"] is not None or target is None:
     raise ImportHold("HTO_STAGED_INPUT_MISSING_"+ref)
    if isinstance(value,(float,int)) and not isinstance(value,bool):
     try:ok=float(target)==float(value)
     except (ValueError,TypeError):ok=False
    else:ok=target==str(value)
    if not ok:raise ImportHold("HTO_STAGED_VALUE_CHANGED_"+ref)
    counters["sourceCells"]+=1
   elif ref in withheld:
    if dest["value"] is not None or dest["formula"] is not None:
     raise ImportHold("UNKNOWN_SOURCE_FIELD_WAS_FILLED_"+ref)
    counters["withheldCells"]+=1
   elif ref=="Y4674":
    if src["value"]!=" " or dest["value"]!=" ":
     raise ImportHold("SOURCE_WHITESPACE_MARKER_CHANGED")
   elif src["formula"] is None and dest["formula"] is None:
    if src["value"]!=dest["value"]:
     raise ImportHold("UNAPPROVED_MANUAL_VALUE_ADDED_"+ref)
 if counters["sourceCells"]!=len(permitted) or counters["withheldCells"]!=len(withheld):
  raise ImportHold("CELL_ACCOUNTING_MISMATCH")
 return {"schema":"brave-hc-plan03-source-only-import-readback/v1",
         "status":"DISPOSABLE_43ROW_SOURCE_FIELDS_VALIDATED_NOT_FOR_PUBLICATION",
         "sourceStagedCells":counters["sourceCells"],
         "withheldUnknownFields":counters["withheldCells"],
         "stagedSkaterRows":40,"stagedGoalieRows":3,
         "sourceY4674WhitespacePreserved":True,
         "allExistingManualValuesAndFormulasPreserved":True,
         "fullWorkbookAndPivotRecalculationCertified":False,
         "publicReleaseApproved":False,"originalWorkbookModified":False}

def main():
 p=argparse.ArgumentParser(description=__doc__)
 for name in ("original_workbook","expanded_pre_copy","source_import_copy","private_htoplan","excel_receipt"):
  p.add_argument("--"+name.replace("_","-"),type=Path,required=True)
 a=p.parse_args()
 if sha(a.original_workbook)!=SOURCE_SHA:raise ImportHold("ORIGINAL_WORKBOOK_HASH_DRIFT")
 if sha(a.expanded_pre_copy)!=EXPANDED_SHA:raise ImportHold("EXPANDED_INPUT_HASH_DRIFT")
 receipt=json.loads(a.excel_receipt.read_text(encoding="utf-8-sig"))
 if receipt.get("candidateSHA256","").lower()!=sha(a.source_import_copy):
  raise ImportHold("SOURCE_IMPORT_COPY_RECEIPT_HASH_DRIFT")
 staging=json.loads(a.private_htoplan.read_text(encoding="utf-8-sig"))
 if receipt.get("privateHTOPlanSHA256","").lower()!=sha(a.private_htoplan):
  raise ImportHold("SOURCE_HTO_PLAN_SHA_MISMATCH")
 result=compare(cells_from_xlsx(a.expanded_pre_copy),cells_from_xlsx(a.source_import_copy),staging,receipt)
 result["candidateSHA256"]=sha(a.source_import_copy)
 print(json.dumps(result,indent=2))

if __name__=="__main__":main()
