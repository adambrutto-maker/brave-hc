"""Safe source-bound native HTO Awards action planner. NOT a publisher.
Read verified current-game milestone candidate receipt + authoritative original
98 milestone manifest + current live HTO Awards HTML. Plan only missing individual
club category/recipient entries, globally ascending numeric thresholds across all goalie and skater/game types.
Never issue or grant a native award without external authenticated UI write and
independent post-save public/Historical Records source-parity verification.
"""
from __future__ import annotations
import argparse,datetime,hashlib,json,re
from collections import Counter
from pathlib import Path
from typing import Any
import requests
from bs4 import BeautifulSoup
from aw19_verified_club_engine import planned_awards_category_order
URL="https://www.htosports.com/teams/default.asp?p=awards&s=hockey&u=BRAVESHOCKEY"
CLUB=re.compile(r"\d+\s+(?:Game|Point|Win|Goal|Assist|Shutout)\s+Club$")
HONOURS=("Brave H.C. Hall of Fame","Maurice 'Rocket' Richard Trophy",
         "Art Ross Award","Hart Award","Conn Smythe Award Playoff MVP",
         "James Norris Trophy","Most Improved Player",
         "Lady Byng Award for Sportsmanship","Andrew Cristillo Award for Dedication",
         "Rookie of the Year","Rolaids Relief Man Award")

def norm(value:str)->str:return re.sub(r"\s+"," ",value or "").strip()
def extract_awards(html:bytes)->dict[str,list[str]]:
 soup=BeautifulSoup(html,"html.parser")
 groups={}
 for g in soup.select(".modGroupWrapper"):
  head=g.select_one(".modGroupHeading")
  if not head:continue
  title=norm(head.get_text(" ",strip=True))
  if title in groups:raise ValueError("Duplicate public HTO Awards category")
  groups[title]=[norm(x.get_text(" ",strip=True)) for x in g.select(".modGroupItem")]
 return groups

def validate_historical_preservation(groups:dict[str,list[str]], source:dict)->dict:
 if not set(HONOURS)<=set(groups):raise ValueError("Historical honours category disappeared")
 if len(groups.get("Brave H.C. Hall of Fame",[]))!=5:raise ValueError("Hall of Fame source count drift")
 categories=source.get("source_categories",[])
 if len(categories)!=10 or source.get("source_count")!=98:raise ValueError("Historic source of 98 missing")
 for cat in categories:
  club=cat["club"]
  if club not in groups:raise ValueError("Original native club category absent: "+club)
  live=groups[club]
  if len(live)<cat["original_count"]:raise ValueError("Original milestone category count smaller than its historic source")
  for row in (r for r in source["source_entries"] if r["club"]==club):
   target=row["award_year"]+" - "+row["player"]+" - "
   matches=[v for v in live if v.startswith(target) and row["display_date"] in v]
   if len(matches)!=1:raise ValueError("Original HTO club entry source missing/duplicated: "+repr((club,row["player"],row["display_date"])))
 if sum(map(len,groups.values()))<244:raise ValueError("Published historic 244 awards unexpectedly decreased")
 historical_honours=sum(len(groups[n]) for n in HONOURS)
 if historical_honours!=146:raise ValueError("Original 146 honours count drift")
 for name in groups:
  if name not in HONOURS and not CLUB.fullmatch(name):raise ValueError("Unknown native category "+name)
 return {"original_honours_verified":historical_honours,"historic_milestones_verified":98,
         "current_total_awards":sum(map(len,groups.values()))}

def source_events_are_fresh(receipt,now=None):
 now=now or datetime.datetime.now(datetime.timezone.utc)
 if receipt.get("schema")!="brave-hc-aw19-exact-current-game-reconciliation/v1":
  raise ValueError("AW19 candidate receipt schema mismatch")
 if not receipt.get("status","").startswith("SOURCE_RECONCILIATION_PASS"):
  raise ValueError("Upstream HTO source is not verified")
 stamp=datetime.datetime.fromisoformat(receipt["source_feed_timestamp"].replace("Z","+00:00"))
 if stamp.tzinfo is None or not datetime.timedelta(0)<=now-stamp<=datetime.timedelta(hours=3):
  raise ValueError("AW19 verified collector source is stale/future")
 if not isinstance(receipt.get("proposed_milestones"),list):raise ValueError("AW19 candidate proposals missing")
 return True

def build_actions(receipt:dict[str,Any],groups:dict[str,list[str]],historical:dict, *,now=None)->dict:
 source_events_are_fresh(receipt,now=now)
 preservation=validate_historical_preservation(groups,historical)
 rows=[];held=[];seen=set()
 for p in receipt["proposed_milestones"]:
  club=p.get("club")
  if not isinstance(club,str) or not CLUB.fullmatch(club) or p.get("status")!="OFFICIAL_GAME_VERIFIED_READY_FOR_NATIVE_HOLD_UNTIL_PARITY":
   held.append({"proposal":p,"reason":"UNSUPPORTED_OR_UNVERIFIED_THRESHOLD"});continue
  key=p.get("award_key")
  if not key or key!=str(p.get("player_id"))+":"+club or key in seen:
   held.append({"proposal":p,"reason":"SOURCE_IDENTITY_DUPLICATE_OR_INVALID"});continue
  seen.add(key)
  if not isinstance(p.get("source_sha256"),str) or not re.fullmatch("[0-9a-fA-F]{64}",p["source_sha256"]):
   held.append({"proposal":p,"reason":"MISSING_BOXSCORE_EVIDENCE_HASH"});continue
  if p.get("date")!=receipt["game_date"] or str(p.get("game_id"))!=str(receipt["verified_game_id"]):
   held.append({"proposal":p,"reason":"DATED_GAME_SOURCE_ID_MISMATCH"});continue
  try:datetime.date.fromisoformat(p["date"])
  except Exception:
   held.append({"proposal":p,"reason":"INVALID_EARNED_DATE"});continue
  year=str(datetime.date.fromisoformat(p["date"]).year)
  if p.get("award_year")!=int(year) or not isinstance(p.get("recipient"),str) or not p["recipient"].strip():
   held.append({"proposal":p,"reason":"INVALID_RECIPIENT_OR_YEAR"});continue
  name=norm(p["recipient"])
  notes=norm(p.get("notes",""))
  if not notes.startswith("Earned ") or not p["date"].startswith(year):
   held.append({"proposal":p,"reason":"ACHIEVEMENT_NOTES_MISSING"});continue
  # Public HTO category membership has names but not player IDs. Hold same-name
  # collisions until exact native ID can be compared in authenticated editor.
  if club in groups:
   similar=[x for x in groups[club] if re.fullmatch(r"\d{4}\s*-\s*"+re.escape(name)+r"(?:\s+-.*)?",x,re.I)]
   if similar:
    held.append({"proposal":p,"reason":"NAME_ALREADY_IN_CLUB_CHECK_NATIVE_PLAYER_ID","existing_rows":similar});continue
  rows.append({"action":"ADD_NATIVE_AWARD_AFTER_AUTHENTICATED_RECHECK","club":club,
               "source_player_id":p["player_id"],"year":int(year),"recipient":name,
               "notes":notes,"achievement_date":p["date"],
               "official_game_id":p["game_id"],"source_url":p["source_url"],
               "source_sha256":p["source_sha256"]})
 new_clubs=set(x["club"] for x in rows)-set(groups)
 category_order=planned_awards_category_order(list(groups)+list(new_clubs))
 # Preserve category list cardinality; never preempt original 11 honours.
 assert len(category_order)==len(groups)+len(new_clubs)
 assert category_order[:len(HONOURS)]==list(HONOURS)
 return {"schema":"brave-hc-aw19-hto-native-actions/v1",
  "status":"READ_ONLY_NO_ACTIONS" if not rows and not held else
          "REVIEW_HELD" if held else "VERIFIED_SOURCE_ACTIONS_STAGED_NOT_APPLIED",
  "source_game_id":receipt["verified_game_id"],"source_game_date":receipt["game_date"],
  "current_awards_preservation":preservation,
  "native_award_actions_staged":rows,"held_source_candidates":held,
  "new_category_names_ordered":[x for x in category_order if x in new_clubs],
  "current_and_proposed_category_order":category_order,
  "live_awards_total_before":sum(map(len,groups.values())),
  "native_hto_writes":0,"published_awards_created":0,
  "implementation_gate":"Authenticated HTO original award-ID backup, verify player source identity and game/earned date, create first-earned club only, save one row, independent 244-source parity + chronology and rollback."}

def main():
 parser=argparse.ArgumentParser()
 parser.add_argument("--candidates",type=Path,required=True)
 parser.add_argument("--historic-source",type=Path,required=True)
 parser.add_argument("--output",type=Path,required=True)
 args=parser.parse_args()
 receipt=json.loads(args.candidates.read_text(encoding="utf-8-sig"))
 original=json.loads(args.historic_source.read_text(encoding="utf-8-sig"))
 response=requests.get(URL,timeout=25,headers={"Cache-Control":"no-cache"})
 response.raise_for_status()
 categories=extract_awards(response.content)
 result=build_actions(receipt,categories,original)
 result["public_awards_sha256"]=hashlib.sha256(response.content).hexdigest()
 args.output.parent.mkdir(parents=True,exist_ok=True)
 args.output.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
 print(json.dumps({k:v for k,v in result.items() if k not in ("current_and_proposed_category_order","native_award_actions_staged","held_source_candidates")},indent=2))
 print("ACTIONS",result["native_award_actions_staged"][:5],"HOLDS",result["held_source_candidates"][:5])
if __name__=="__main__":main()
