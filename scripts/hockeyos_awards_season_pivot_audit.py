"""Read-only audit of season PivotTable refresh prerequisites; never edits Excel."""
import sys,json,zipfile,hashlib,xml.etree.ElementTree as E
from pathlib import Path
N={"m":"http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
def audit(path):
 before=hashlib.sha256(Path(path).read_bytes()).hexdigest()
 out=[]
 with zipfile.ZipFile(path) as z:
  caches={}
  rel={r.attrib["Id"]:r.attrib["Target"] for r in E.fromstring(z.read("xl/_rels/workbook.xml.rels"))}
  for c in E.fromstring(z.read("xl/workbook.xml")).findall("m:pivotCaches/m:pivotCache",N):
   target=rel[c.attrib["{"+N["m"].replace("/spreadsheetml/2006/main","/officeDocument/2006/relationships")+"}id"]]
   import posixpath
   p=target.lstrip("/") if target.startswith("/") else posixpath.normpath("xl/"+target)
   caches[c.attrib["cacheId"]]=E.fromstring(z.read(p))
  tables={}
  for p in z.namelist():
   if p.startswith("xl/tables/") and p.endswith(".xml"):
    t=E.fromstring(z.read(p));tables[t.attrib["name"]]=t
  for p in z.namelist():
   if not(p.startswith("xl/pivotTables/pivotTable") and p.endswith(".xml")):continue
   t=E.fromstring(z.read(p))
   if t.attrib["name"] not in ("PlayerStatsBySeason","GoalieStatsBySeason"):continue
   cache=caches[t.attrib["cacheId"]];source=cache.find("m:cacheSource/m:worksheetSource",N)
   name=source.attrib.get("name");table=tables[name]
   import re
   a,b=table.attrib["ref"].split(":")
   rows=int(re.search(r"\d+",b).group())-int(re.search(r"\d+",a).group())-int(table.attrib.get("totalsRowCount","0"))
   fields=list(t.find("m:pivotFields",N))
   hidden=sum(x.attrib.get("h")=="1" for f in fields for x in f.findall("m:items/m:item",N))
   out.append({"pivot":t.attrib["name"],"sourceTable":name,"sourceDataRows":rows,"cachedRecords":int(cache.attrib["recordCount"]),"cacheCoverageMatches":rows==int(cache.attrib["recordCount"]),"pageFieldCount":len(t.findall("m:pageFields/m:pageField",N)),"filterCount":len(t.findall("m:filters/m:filter",N)),"hiddenItemCount":hidden,"dataFieldCount":len(t.findall("m:dataFields/m:dataField",N))})
 after=hashlib.sha256(Path(path).read_bytes()).hexdigest()
 if before!=after:raise ValueError("Workbook changed during audit")
 if len(out)!=2:raise ValueError("Expected both season pivots")
 return {"workbookSha256":after,"readOnlyHashUnchanged":True,"pivots":out,"currentScoresVerified":False}
if __name__=="__main__":print(json.dumps(audit(sys.argv[1]),indent=2))
