"""Reconcile pinned replay observations against participant season counts."""
import json,sys,collections
def reconcile(candidate,participants):
 expected={p["name"]:p for p in participants["players"]}
 totals={};seen=set();missing=[];errors=[]
 if len(expected)!=len(participants["players"]):errors.append({"duplicateParticipantIdentity":True})
 if candidate["season"]!=participants["season"]:errors.append({"seasonMismatch":True})
 for r in candidate["rows"]:
  i=r["inputs"];name=i["Name"];key=(r["targetTable"],r["sourceGameId"],name)
  if key in seen:errors.append({"duplicate":list(key)})
  seen.add(key)
  if name not in expected:errors.append({"unmatchedIdentity":name})
  t=totals.setdefault(name,collections.Counter())
  if r["targetTable"] not in ("SkaterStatsByGame","GoalieStatsByGame"):
   errors.append({"unknownTable":r["targetTable"]});continue
  role=expected.get(name,{}).get("position")
  if role and ((role=="Skater") != (r["targetTable"]=="SkaterStatsByGame")):errors.append({"roleMismatch":name})
  fields=("GP","G","A","Pts") if r["targetTable"]=="SkaterStatsByGame" else ("GP","L","GA")
  for k in fields:
   v=i.get(k)
   if not isinstance(v,(int,float)) or isinstance(v,bool):errors.append({"invalidCount":k,"player":name})
   else:t[k]+=v
  for k,v in i.items():
   if v is None:missing.append({"player":name,"game":r["sourceGameId"],"field":k})
 for name,p in expected.items():
  if name not in totals:errors.append({"missingParticipant":name});continue
  if p.get("position")=="Skater":
   for src,k in (("gp","GP"),("goals","G"),("assists","A"),("points","Pts")):
    if p[src]!=totals[name][k]:errors.append({"player":name,"field":k,"season":p[src],"games":totals[name][k]})
  elif p.get("position")=="Goalie":
   for src,k in (("gp","GP"),("losses","L"),("goalsAgainst","GA")):
    value=p.get("officialHTOStats",{}).get(src)
    if value is None or value!=totals[name][k]:errors.append({"player":name,"field":k,"season":value,"games":totals[name][k]})
  else:errors.append({"unknownRole":name})
 return {"state":"SOURCE_COUNT_PARITY_PASS" if not errors else "SOURCE_COUNT_PARITY_FAIL","playerCoverage":len(totals),"appearanceRows":len(seen),"missingObservations":missing,"errors":errors,"currentAwardScoresVerified":False,"identityMetadataVerified":False}
if __name__=="__main__":
 result=reconcile(json.load(open(sys.argv[1])),json.load(open(sys.argv[2])))
 print(json.dumps(result,indent=2));sys.exit(bool(result["errors"]))
