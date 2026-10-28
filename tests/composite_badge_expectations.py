"""Independent test oracle for published HTO multiline-record badge projections.
These are DISPLAY copies only. Original 343 authoritative ledger rows remain.
"""
SPECS={
 "354058":{
  "name":"Alex Pagnotta","sourceID":"hto-legacy-354058-04",
  "lines":[
   ("award","James Norris Award - Winter 2019/20"),
   ("leadership","Elected Assistant Captain - Winter 2019/20")
  ]
 },
 "354062":{
  "name":"Daniel Buzzelli","sourceID":"hto-legacy-354062-03",
  "lines":[
   ("milestone","50 Game Club - September 23, 2018"),
   ("championship","SVHL Cup Champion - Winter 2012/13")
  ]
 },
 "652571":{
  "name":"David Corasaniti","sourceID":"hto-legacy-652571-01",
  "lines":[
   ("award","Conn Smythe Award Playoff MVP - Winter 2019/20"),
   ("award","Hart Award Team MVP - Winter 2019/20"),
   ("award","Rookie of the Year Award - Winter 2019/20")
  ]
 }
}
def projected_items(pid,name,rows):
 """Return independent expected UI items. Fail test if source fixture drifts."""
 key=str(pid)
 spec=SPECS.get(key)
 if spec is None:return list(rows)
 assert name==spec["name"],(pid,name)
 origin=[x for x in rows if x["id"]==spec["sourceID"]]
 assert len(origin)==1,(pid,spec["sourceID"])
 rec=origin[0]
 assert rec["category"]=="record"
 assert rec["sourceText"]=="\n".join(text for _,text in spec["lines"])
 assert rec["displayText"]==rec["sourceText"]
 assert rec["publication"]=="EXISTING_HTO_MANUAL_RECORD"
 assert rec["provenance"]=="EXISTING_NATIVE_HTO_HIGHLIGHTS"
 out=[]
 for item in rows:
  if item["id"]!=spec["sourceID"]:
   out.append(item);continue
  for idx,(category,source) in enumerate(spec["lines"],1):
   out.append({
    "category":category,"sourceText":source,"displayText":source,
    "sourceRecordID":item["id"],"presentationOnly":True,
    "id":item["id"]+"::presentation-"+str(idx)
   })
 assert len(out)==len(rows)+len(spec["lines"])-1
 return out
def counts(pid,name,rows):
 items=projected_items(pid,name,rows)
 return {
  "milestones":sum(x["category"]=="milestone" for x in items),
  "honors":sum(x["category"] not in ("milestone","discipline") for x in items),
  "discipline":sum(x["category"]=="discipline" for x in items),
  "all":len(items)
 }
