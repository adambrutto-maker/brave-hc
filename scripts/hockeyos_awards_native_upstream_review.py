"""Compare recalculated PlayerInfo winter totals with the pinned replay game inputs."""
import sys
sys.dont_write_bytecode=True
import json,hashlib,zipfile,re,xml.etree.ElementTree as E,importlib.util
from pathlib import Path

def main(folder):
 spec=importlib.util.spec_from_file_location("post",folder/"disposable-postcheck.py")
 m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
 receipt=json.loads((folder/"runtime-receipt.json").read_text(encoding="utf-8-sig"))
 if not receipt.get("copySaved") or not receipt.get("sourceHashUnchanged"):raise ValueError("Completed disposable replay required")
 path=folder/"261020_Awards_Four_Game_Input_Candidate.json"
 if hashlib.sha256(path.read_bytes()).hexdigest()!="812a615b4f75763d0fc2315612cfa933a15122de64c3ff04719c7be1480063d0":raise ValueError("Candidate changed")
 candidate=json.loads(path.read_text());expected={}
 for entry in candidate["rows"]:
  if entry["targetTable"]!="SkaterStatsByGame":continue
  inputs=entry["inputs"];player=inputs["Name"]
  totals=expected.setdefault(player,{"GP":0,"G":0,"A":0,"Pts":0})
  for field in totals:
   if inputs.get(field) is None:raise ValueError("Incomplete count input")
   totals[field]+=inputs[field]
 schema=json.loads(Path(r"C:\Users\adamb\AppData\Local\Temp\hockeyos-awards-source-formula-inspection.json").read_text())
 table=next(t for t in schema["tables"] if t["name"]=="PlayerInfo")
 cols={c["name"]:m.letters(i+1) for i,c in enumerate(table["columns"])}
 fields={"GP":"Current Skater GP","G":"Current Total Raw G","A":"Current Total Raw A","Pts":"Current Total Raw Pts"}
 actual={}
 with zipfile.ZipFile(receipt["copy"]) as z:
  ss=m.strings(z)
  for row in E.fromstring(z.read("xl/worksheets/sheet1.xml")).findall("m:sheetData/m:row",m.NS):
   if not 6<=int(row.attrib["r"])<=114:continue
   cells={re.match("[A-Z]+",c.attrib["r"]).group():c for c in row}
   name=m.value(cells.get(cols["Website Name"]),ss)
   if name not in expected:continue
   if name in actual:raise ValueError("Duplicate PlayerInfo identity")
   actual[name]={k:m.value(cells.get(cols[v]),ss) for k,v in fields.items()}
 if set(actual)!=set(expected):raise ValueError("Incomplete named PlayerInfo coverage")
 differences=[{"name":n,"field":k,"gameInputs":v,"recalculatedPlayerInfo":actual[n][k]} for n,t in expected.items() for k,v in t.items() if actual[n][k]!=v]
 out={"state":"UPSTREAM_SEASON_TOTALS_MISMATCH" if differences else "WINTER_SKATER_COUNT_PARITY_ONLY", "playersChecked":len(expected),"expectedTotals":{k:sum(t[k] for t in expected.values()) for k in fields},"recalculatedPlayerInfoTotals":{k:sum(t[k] for t in actual.values()) for k in fields},"differences":differences,"sourceGoalFormula":next(c["formula"] for c in table["columns"] if c["name"]=="Current Total Raw G"),"masterScheduleResultsImported":False,"seasonTotalsImported":False,"currentScoresVerified":False,"publicationAuthorized":False}
 (folder/"native-upstream-parity-review.json").write_text(json.dumps(out,indent=2),encoding="utf-8")
 print(json.dumps(out),flush=True)
if __name__=="__main__":main(Path(sys.argv[1]))
