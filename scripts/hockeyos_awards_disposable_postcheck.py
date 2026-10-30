"""Read-only checks of an approved disposable replay after native Excel closes."""
import sys
sys.dont_write_bytecode=True
import json,hashlib,zipfile,re,xml.etree.ElementTree as E
from pathlib import Path
NS={"m":"http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
SOURCE=Path(r"D:\BruTTech\Products\HockeyOS\Reference Implementations\Brave H.C\01 Team Records\261001_Brave_HC_Master_Workbook.xlsx")
EXPECTED="0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154"
def number(letter):
 n=0
 for c in letter:n=n*26+ord(c)-64
 return n
def letters(n):
 text=""
 while n:n,a=divmod(n-1,26);text=chr(65+a)+text
 return text
def strings(z):
 return ["".join(v.itertext()) for v in E.fromstring(z.read("xl/sharedStrings.xml"))]
def value(cell,ss):
 if cell is None:return None
 v=cell.find("m:v",NS)
 if v is None:return None
 if cell.attrib.get("t")=="s":return ss[int(v.text)]
 if cell.attrib.get("t")=="e":return {"error":v.text}
 if cell.attrib.get("t") in ["str","inlineStr"]:return v.text
 try:return float(v.text)
 except (ValueError,TypeError):return v.text
def main(folder):
 receipt=json.loads((folder/"runtime-receipt.json").read_text(encoding="utf-8-sig"))
 if receipt["state"]!="REVIEW_COPY_SAVED_NEEDS_XML_AND_SOURCE_PARITY_CHECKS":raise ValueError("Native replay has not completed and closed")
 if hashlib.sha256(SOURCE.read_bytes()).hexdigest()!=EXPECTED:raise ValueError("Original changed")
 candidate=json.loads((folder/"261020_Awards_Four_Game_Input_Candidate.json").read_text())
 plan=json.loads((folder/"261020_Awards_Disposable_Replay_Plan.json").read_text())
 capture=json.loads((folder/"261020_Awards_Original_Formula_Capture.json").read_text())
 schema=json.loads(Path(r"C:\Users\adamb\AppData\Local\Temp\hockeyos-awards-source-formula-inspection.json").read_text())
 definitions={t["name"]:t for t in schema["tables"]}
 column_maps={}
 for table in ["SkaterStatsByGame","GoalieStatsByGame"]:
  definition=definitions[table];start=number(re.match("[A-Z]+",definition["ref"]).group())
  column_maps[table]={c["name"]:letters(start+i) for i,c in enumerate(definition["columns"])}
 nextrow={"SkaterStatsByGame":4669,"GoalieStatsByGame":364}
 expected_rows={};mutable=set()
 for entry in candidate["rows"]:
  table=entry["targetTable"];role="Skater" if table=="SkaterStatsByGame" else "Goalie"
  matches=[r for r in plan["updateMatchedNamedRows"] if r["role"]==role and r["gameNumber"]==entry["inputs"]["Game #"] and r["name"]==entry["inputs"]["Name"]]
  row=matches[0]["existingRow"] if matches else nextrow[table]
  if not matches:nextrow[table]+=1
  expected_rows[(table,row)]=entry
  for field,v in entry["inputs"].items():
   if v is not None:mutable.add((table,row,field))
 repairs={(x["table"],x["field"]):x["templateRow"] for x in receipt["restoredCalculatedFlags"]}
 hashes={};source_modes={"SkaterStatsByGame":{},"GoalieStatsByGame":{}};checks=0;differences=[];difference_count=0;saved_native=[]
 def fail(info):
  nonlocal difference_count
  difference_count+=1
  if len(differences)<50:differences.append(info)
 for label,path in [("source",SOURCE),("copy",Path(receipt["copy"]))]:
  digest=hashlib.sha256()
  with zipfile.ZipFile(path,"r") as z:
   ss=strings(z)
   for table in ["SkaterStatsByGame","GoalieStatsByGame"]:
    t=E.fromstring(z.read(definitions[table]["path"]))
    if label=="copy":
     expected_ref="A2:FB4708" if table=="SkaterStatsByGame" else "FD2:JO366"
     if t.attrib["ref"]!=expected_ref:fail({"table":table,"reason":"TABLE_RANGE","actual":t.attrib["ref"]})
   with z.open("xl/worksheets/sheet3.xml") as stream:
    for _,row in E.iterparse(stream,events=("end",)):
     if row.tag!="{"+NS["m"]+"}row":continue
     r=int(row.attrib["r"]);cells={re.match("[A-Z]+",c.attrib["r"]).group():c for c in row}
     if r>=3:
      for table,old_end in [("SkaterStatsByGame",4668),("GoalieStatsByGame",363)]:
       raw=[c["name"] for c in definitions[table]["columns"] if not c["formula"]]
       if label=="source":
        for column in definitions[table]["columns"]:
         if column["formula"] and r==repairs.get((table,column["name"]),old_end):
          cell=cells.get(column_maps[table][column["name"]]);f=None if cell is None else cell.find("m:f",NS)
          if f is None:raise ValueError("Missing source template formula")
          source_modes[table][column["name"]]=f.attrib.get("t")=="array"
       if r<=old_end:
        for field in raw:
         if (table,r,field) not in mutable:
          payload=[table,r,field,value(cells.get(column_maps[table][field]),ss)]
          digest.update(json.dumps(payload,ensure_ascii=False,separators=(",",":")).encode());digest.update(b"\n")
       entry=expected_rows.get((table,r))
       if label=="copy" and entry:
        for field,want in entry["inputs"].items():
         if want is None:continue
         actual=value(cells.get(column_maps[table][field]),ss);checks+=1
         same=actual==want or field=="#" and str(actual).removesuffix(".0")==str(want)
         if not same:fail({"table":table,"row":r,"field":field,"wanted":want,"actual":actual})
        if r>old_end:
         for field in raw:
          if entry["inputs"].get(field) is None and value(cells.get(column_maps[table][field]),ss) is not None:
           fail({"table":table,"row":r,"field":field,"reason":"MISSING_INPUT_NOT_BLANK"})
        if r>old_end:
         for c in definitions[table]["columns"]:
          if c["formula"]:
           cell=cells.get(column_maps[table][c["name"]]);f=None if cell is None else cell.find("m:f",NS)
           if f is None:fail({"table":table,"row":r,"field":c["name"],"reason":"MISSING_EXPANDED_FORMULA"})
           elif source_modes[table][c["name"]]!=(f.attrib.get("t")=="array"):
            fail({"table":table,"row":r,"field":c["name"],"reason":"EXPANDED_ARRAY_MODE_DIFFERS"})
     if label=="copy":
      for moved in receipt["expansionCellsPreserved"]:
       if r==moved["toRow"]:
        cell=cells.get(letters(moved["column"]));f=None if cell is None else cell.find("m:f",NS)
        if bool(f is not None)!=moved["hasFormula"] or not moved["hasFormula"] and value(cell,ss)!=moved["value"]:
         fail({"reason":"DISPLACED_CONTENT_NOT_PRESERVED","row":r,"column":moved["column"]})
     row.clear()
   hashes[label]=digest.hexdigest()
   if label=="copy":
    sheet=E.fromstring(z.read("xl/worksheets/sheet2.xml"))
    cells={c.attrib["r"]:c for c in sheet.findall("m:sheetData/m:row/m:c",NS)}
    for c in capture["columns"]:
     cell=cells.get(c["worksheetColumn"]+"6");f=None if cell is None else cell.find("m:f",NS)
     saved_native.append({"name":c["name"],"formula":"="+(f.text or "") if f is not None else "","hasArray":f is not None and f.attrib.get("t")=="array"})
 if hashes["source"]!=hashes["copy"]:fail({"reason":"UNMODIFIED_HISTORICAL_RAW_INPUTS_DIFFER"})
 # Import the bounded comparator from the experiment folder.
 import importlib.util
 spec=importlib.util.spec_from_file_location("loaded_compare",folder/"loaded-formula-compare.py")
 module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
 formula_review=module.compare(capture,saved_native)
 for difference in formula_review["differences"]:fail({"reason":"SAVED_FORMULA_PARITY","detail":difference})
 unchanged=hashlib.sha256(SOURCE.read_bytes()).hexdigest()==EXPECTED
 result={"state":"SAVED_REPLAY_XML_CHECKS_PASS" if difference_count==0 and unchanged else "SAVED_REPLAY_XML_CHECKS_HOLD",
  "sourceHashUnchanged":unchanged,"historicalRawInputHashes":hashes,"writtenInputChecks":checks,
  "savedScoringFormulaReview":formula_review,"differenceCount":difference_count,"differenceExamples":differences,
  "currentEligibilityVerified":False,"currentScoresVerified":False,"publicationAuthorized":False}
 (folder/"post-save-xml-review.json").write_text(json.dumps(result,indent=2),encoding="utf-8")
 print(json.dumps(result),flush=True)
 return 0 if result["state"].endswith("PASS") else 1
if __name__=="__main__":raise SystemExit(main(Path(sys.argv[1])))

