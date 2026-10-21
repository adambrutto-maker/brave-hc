"""Reconcile pinned replay observations against participant season counts."""
import json,sys,collections
def reconcile(candidate,participants):
 expected={p["name"]:p for p in participants["players"]}
 totals={};seen=set();missing=[];errors=[]
 for r in candidate["rows"]:
  i=r["inputs"];name=i["Name"];key=(r["targetTable"],r["sourceGameId"],name)
  if key in seen:errors.append({"duplicate":list(key)})
  seen.add(key)
  if name not in expected:errors.append({"unmatchedIdentity":name})
  t=totals.setdefault(name,collections.Counter())
  for k in ("GP","G","A","Pts"):
   v=i.get(k)
   if r["targetTable"]=="SkaterStatsByGame":
    if v is None:errors.append({"missingCount":k,"player":name})
    else:t[k]+=v
  for k,v in i.items():
   if v is None:missing.append({"player":name,"game":r["sourceGameId"],"field":k})
 for name,p in expected.items():
  if name not in totals:errors.append({"missingParticipant":name});continue
  if p.get("position")=="Skater":
   for src,k in (("gp","GP"),("goals","G"),("assists","A"),("points","Pts")):
    if p[src]!=totals[name][k]:errors.append({"player":name,"field":k,"season":p[src],"games":totals[name][k]})
 return {"state":"SOURCE_COUNT_PARITY_PASS" if not errors else "SOURCE_COUNT_PARITY_FAIL","playerCoverage":len(totals),"appearanceRows":len(seen),"missingObservations":missing,"errors":errors,"currentAwardScoresVerified":False,"identityMetadataVerified":False}
if __name__=="__main__":
 result=reconcile(json.load(open(sys.argv[1])),json.load(open(sys.argv[2])))
 print(json.dumps(result,indent=2));sys.exit(bool(result["errors"]))
