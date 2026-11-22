#!/usr/bin/env python3
"""Brave H.C. published lineup fail-closed captain policy checks.
This deliberately enforces manager-required chemistry, rotation, uniform
player type size and no public-facing internal roster-status suffixes.
All validation uses the public-release source contract, never WhatsApp data.
"""
from __future__ import annotations
import copy,hashlib,json,re,struct,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
RULES=ROOT/"scripts/brave_hc_captain_lineup_rules.json"
ASSETS=ROOT/"widgets/assets/lineups"
class CaptainRulesHold(ValueError):pass
def require(ok,msg):
 if not ok:raise CaptainRulesHold(msg)
def load(p):return json.loads(Path(p).read_text(encoding="utf-8-sig"))
def file_sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def people(record):
 lines=record.get("forwards")
 require(isinstance(lines,list) and len(lines) in (1,2,3),"FORWARD_LINE_COUNT_INVALID")
 body=[]
 for row in lines:
  require(isinstance(row,dict),"FORWARD_ROW_INVALID")
  for key in ("LW","RW"):
   require(isinstance(row.get(key),dict),"NO_SPARE_WINGER_COMPLETE_PAIRS_REQUIRED")
   body.append(row[key])
  if row.get("C") is not None:body.append(row["C"])
 for pair in record.get("defence",[]):
  for key in ("LD","RD"):
   if pair.get(key) is not None:body.append(pair[key])
 return body
def validate(record,rule,base=ASSETS,*,check_assets=True,check_public=False):
 require(rule.get("schema")=="brave-hc-captain-lineup-rules/v1","CAPTAIN_POLICY_INVALID")
 require(record.get("schema")=="brave-hc-published-captain-lineup/v1","LINEUP_SOURCE_SCHEMA")
 require(record.get("season")==rule.get("season"),"SEASON_MISMATCH")
 require(record.get("status")=="FINAL_TEAM_LINEUP" and record.get("userManagerApproved") is True,
         "CAPTAIN_FINAL_APPROVAL_NOT_GRANTED")
 require(record.get("namedPollVotesIncluded") is False and
         record.get("privateWhatsAppGroupContentIncluded") is False,"PRIVATE_POLL_CONTENT_NOT_ALLOWED")
 all_players=people(record)
 names=[p.get("name") for p in all_players]
 require(all(isinstance(n,str) and n.strip() for n in names),"BLANK_PLAYER")
 require(len(names)==len(set(names)),"DUPLICATE_SKATER")
 require(len(names) in range(7,15),"INVALID_TEAM_SIZE")
 require(len(record["forwards"])*2 in (2,4,6),"WHOLE_WINGER_PAIRS")
 centres=[f["C"]["name"] for f in record["forwards"] if f.get("C")]
 required=rule["twoCentres"]["required"]
 require(len(centres)==2 and set(centres)==set(required),"EXACTLY_TWO_PERMANENT_CENTRES_REQUIRED")
 require(record.get("centreRotation")==centres,"CENTRE_ROTATION_NOT_MATCHING_LINES")
 if len(record["forwards"])==3:
  require(record["forwards"][2].get("C") is None and
          record.get("line3CentreDisplay")==rule["printing"]["thirdForwardLineCentreCell"],
          "THIRD_CENTRE_IS_NOT_ALLOWED")
 # Immutability of preferred buddy pairing when both are dressed as wingers.
 buddy=rule["wingers"]["preferredBuddyPair"]; anchor=buddy["player"]
 available=[n for n in buddy["partnersPriority"] if n in names]
 if anchor in names and available:
  required_pair={anchor,available[0]}
  actual=[{row["LW"]["name"],row["RW"]["name"]} for row in record["forwards"]]
  require(required_pair in actual,"MICHAEL_PROVENZANO_BUDDY_PAIR_BROKEN")
 # Roster eligibility: two centres, 2/4/6 winger slots, 3-6 defenders.
 wing_names=[p["name"] for f in record["forwards"] for p in (f["LW"],f["RW"])]
 defender_names=[p["name"] for pair in record["defence"] for p in (pair.get("LD"),pair.get("RD")) if p is not None]
 require(len(wing_names)==2*len(record["forwards"]),"UNPAIRED_WINGER")
 require(3<=len(defender_names)<=6 and len(defender_names)+len(wing_names)+2==len(names),
         "SKATER_ACCOUNTING_NOT_VALID")
 require(len(defender_names)==6 if len(names)==14 else True,"14_SKATER_DEFENCE_PAIRS_REQUIRED")
 # Exactly one uniform type size across all skater+goalie names.
 goalie=record.get("goalie")
 require(isinstance(goalie,dict),"GOALIE_REQUIRED")
 visible=all_players+[goalie]
 sz=[v.get("playerFontPx") for v in visible]
 require(all(type(n)==int and 24<=n<=78 for n in sz) and len(set(sz))==1,
         "INCONSISTENT_PLAYER_NAME_FONT")
 printspec=record.get("printSpec",{})
 require(printspec.get("allPlayerCellsSameFontSizePx")==sz[0] and
         printspec.get("independentFontShrinkApplied") is False,"INDEPENDENT_FONT_SHRINK_FORBIDDEN")
 require(printspec.get("publicRoleLabelsIncluded") is False,"VISIBLE_STATUS_LABELS_FORBIDDEN")
 require(printspec.get("pixelWidth")==rule["printing"]["pixelWidth"] and
         printspec.get("pixelHeight")==rule["printing"]["pixelHeight"],"BAD_ORIGINAL_ARTWORK_DIMENSIONS")
 # No role metadata on the actual visible names, jersey strings, or display.
 forbidden=rule["printing"]["excludeVisibleRoleLabels"]
 pat=re.compile(r"(?<![A-Za-z])(?:"+"|".join(re.escape(s) for s in forbidden)+r")(?![A-Za-z])",re.I)
 for v in visible:
  s=v.get("displayText")
  require(isinstance(s,str) and s.strip(),"VISIBLE_TEXT_REQUIRED")
  require(not pat.search(s),"CAPTAIN_FORBIDDEN_VISIBLE_STATUS_LABEL")
  require(v["name"] in s,"DISPLAY_TEXT_DOES_NOT_MATCH_PLAYER")
  jersey=v.get("jerseyNumber")
  if jersey is not None:
   require(isinstance(jersey,str) and jersey.isdigit() and
          s.startswith("#"+jersey+" - "),"PLAYER_NUMBER_DISPLAY_INVALID")
  else:
   require(s==v["name"],"UNKNOWN_NUMBER_MUST_BE_OMITTED")
 overrides=rule["printing"]["jerseyNumberOverrides"]
 for name,num in overrides.items():
  for v in visible:
   if v["name"]==name:require(v.get("jerseyNumber")==num,"CAPTAIN_JERSEY_OVERRIDE_WRONG")
 # Corrections are immutable even after a newer game's card becomes current.
 if record.get("sourceCorrection",{}).get("htoPlayerId")==849368:
  correction=rule["playerIdentityCorrections"]["849368"]
  aliases=set(correction["legacyAliases"])
  matching=[p for p in visible if p.get("name")==correction["canonicalName"]
            or p.get("name") in aliases or p.get("htoPlayerId")==849368]
  require(len(matching)==1,"DAMIEN_PROFILE_IDENTITY_MISSING_OR_DUPLICATED")
  p=matching[0]
  require(p.get("name")==correction["canonicalName"]
          and p.get("jerseyNumber")==correction["jerseyNumber"]
          and p.get("htoPlayerId")==849368 and p.get("displayText")=="#0 - Pavaday, Damien",
          "DAMIEN_NAME_JERSEY_OR_HTO_ID_WRONG")
 # Game 366 R5 signed history remains protected after it stops being current.
 if record.get("captainPairOrderRevision")=="20261115_GAME366_R5_SOURCE_REVIEWED":
  prefs=rule["wingers"]["captainPreferredPairsWhenBothWingEligible"]
  actual=[{row["LW"]["name"],row["RW"]["name"]} for row in record["forwards"]]
  for pair in prefs:
   if set(pair).issubset(set(wing_names)):
    require(set(pair) in actual,"CAPTAIN_PREFERRED_WINGER_PAIR_SPLIT:"+"/".join(pair))
  expected=rule["wingers"]["game366PairSlotOrder20261115"]
  order=[[row["LW"]["name"],row["RW"]["name"]] for row in record["forwards"]]
  require(order==expected,"GAME366_CAPTAIN_LINE_SLOT_ROTATION_BROKEN")
  require(centres==["Carosi, Justin","Saindon, Stephane"],"GAME366_CENTRE_ROTATION_ORDER_BROKEN")
 # Captain's current fixture-specific override: Keith/Damien are together,
 # so Jamie/Damien's generic preference does not apply to November 22.
 if record.get("gameId")=="367":
  require(record.get("officialHTOGameId")=="3375686" and
          record.get("gameDate")=="2026-11-22" and
          record.get("opponent")=="Dateline Predators" and
          record.get("gameTime")=="20:00" and record.get("rink")=="B Rink",
          "GAME367_WRONG_FIXTURE")
  require(len(names)==13 and len(record["defence"])==3
          and len(defender_names)==5,"GAME367_WRONG_SKATER_OR_DEFENCE_COUNT")
  expected=rule["wingers"]["game367PairSlotOrder20261122"]
  order=[[row["LW"]["name"],row["RW"]["name"]] for row in record["forwards"]]
  require(order==expected and record.get("hardBuddyPairs")==expected,
          "GAME367_CAPTAIN_APPROVED_WINGER_ORDER_BROKEN")
  require(centres==["Saindon, Stephane","Carosi, Justin"],
          "GAME367_CENTRE_ROTATION_NOT_SWAPPED")
  dp=[[x["LD"]["name"] if x.get("LD") else None,
       x["RD"]["name"] if x.get("RD") else None] for x in record["defence"]]
  require(dp==[["Rajkumar, Sanjay","Triumbari, Francesco"],
               ["Brutto, Adam","Pagnotta, Alex"],["Kober, Adam",None]],
          "GAME367_DEFENSIVE_PARTNERSHIP_OR_FIFTH_D_BROKEN")
  require(goalie.get("name")=="Logue, Stephen" and goalie.get("jerseyNumber")=="70",
          "GAME367_GOALIE_INCORRECT")
 # Final image/PDF must exist, be exactly hash-bound and PDF one-page plausible.
 if check_assets:
  pdf=base/Path(record["pdf"]["path"]).name
  png=base/Path(record["png"]["path"]).name
  for kind,p in [("pdf",pdf),("png",png)]:
   require(p.is_file(),"MISSING_PUBLISHED_"+kind.upper())
   require(file_sha(p)==record[kind]["sha256"],"PUBLISHED_"+kind.upper()+"_SHA_CHANGED")
  pnghead=png.read_bytes()[:24]
  require(pnghead[:8]==b"\x89PNG\r\n\x1a\n","PNG_SIGNATURE_CHANGED")
  w,h=struct.unpack(">II",pnghead[16:24])
  require((w,h)==(3300,2550),"PUB_IMAGE_SIZE_CHANGED")
  require(pdf.read_bytes()[:5]==b"%PDF-","PDF_NOT_REAL")
 if check_public:
  manifest=load(ROOT/"widgets/game-centre-lineup-public.json")
  current=manifest.get("publishedWorkingCard",{})
  # Only the contract whose exact SHA is currently pointed to is an active release.
  # Retain older wrong cards as immutable audit evidence without wrongly asserting
  # they still represent the current public roster.
  active=(current.get("fixtureId")==int(record["officialHTOGameId"]) and
          (current.get("sha256")==record["pdf"]["sha256"] or
           current.get("previewSHA256")==record["png"]["sha256"]))
  if active:
   require(current.get("managerLineupStatus")=="FINAL_TEAM_LINEUP" and
           current.get("sha256")==record["pdf"]["sha256"] and
           current.get("previewSHA256")==record["png"]["sha256"],"LIVE_FINAL_MANIFEST_NOT_MATCHING_CONTRACT")
   require(manifest.get("privateWhatsAppPollDataPublished") is False,"PUBLIC_PRIVATE_POLL_VIOLATION")
   if current.get("revision",0)>=4:
    correction=rule["playerIdentityCorrections"]["849368"]
    aliases=set(correction["legacyAliases"])
    matching=[p for p in visible if p.get("name")==correction["canonicalName"] or
              p.get("name") in aliases or p.get("htoPlayerId")==849368]
    require(len(matching)==1,"DAMIEN_PROFILE_IDENTITY_MISSING_OR_DUPLICATED")
    person=matching[0]
    require(person.get("name")==correction["canonicalName"] and
            person.get("jerseyNumber")==correction["jerseyNumber"] and
            person.get("htoPlayerId")==correction["stableNativeHTOPlayerId"] and
            person.get("displayText")=="#0 - Pavaday, Damien",
            "DAMIEN_NAME_JERSEY_OR_HTO_ID_WRONG")
   if current.get("revision",0)>=5:
    prefs=rule["wingers"].get("captainPreferredPairsWhenBothWingEligible",[])
    require(len(prefs)>=2 and all(len(pair)==2 for pair in prefs),"CAPTAIN_WINGER_PAIR_POLICY_MISSING")
    actual=[{line["LW"]["name"],line["RW"]["name"]} for line in record["forwards"]]
    wing_set=set(wing_names)
    for pair in prefs:
     if set(pair).issubset(wing_set):
      require(set(pair) in actual,"CAPTAIN_PREFERRED_WINGER_PAIR_SPLIT:"+"/".join(pair))
    if current["fixtureId"]==3375685:
     expected=rule["wingers"].get("game366PairSlotOrder20261115")
     require(len(expected)==3,"CAPTAIN_GAME366_PAIR_ORDER_RULE_MISSING")
     actual_order=[[line["LW"]["name"],line["RW"]["name"]] for line in record["forwards"]]
     require(actual_order==expected,"GAME366_CAPTAIN_LINE_SLOT_ROTATION_BROKEN")
     require(record.get("hardBuddyPairs")==expected,"SIGNED_GAME366_PAIR_CONTRACT_CHANGED")
     require(centres==["Carosi, Justin","Saindon, Stephane"],"GAME366_CENTRE_ROTATION_ORDER_BROKEN")
 return {"status":"PASS_CAPTAIN_HARD_RULES","gameId":record["officialHTOGameId"],
         "playerCount":len(names),"wingPairs":len(record["forwards"]),
         "nameFontPx":sz[0],"preferredBuddyPaired":bool(anchor in names and available),
         "jerseyOverridesVerified":True,"publicAssetsVerified":check_assets}
def check_all():
 rules=load(RULES)
 contracts=sorted(ASSETS.glob("*.lineup.json"))
 require(bool(contracts),"NO_PUBLISHED_CAPTAIN_LINEUP_CONTRACT")
 reviewed=[load(p) for p in contracts]
 results=[validate(item,rules,ASSETS,check_assets=True,check_public=True) for item in reviewed]
 current=load(ROOT/"widgets/game-centre-lineup-public.json").get("publishedWorkingCard",{})
 require(any(p.get("officialHTOGameId")==str(current.get("fixtureId")) and
             p.get("pdf",{}).get("sha256")==current.get("sha256") and
             p.get("png",{}).get("sha256")==current.get("previewSHA256")
             for p in reviewed),"LIVE_CARD_HAS_NO_EXACT_SIGNED_PLAYER_CONTRACT")
 return results
if __name__=="__main__":
 try:
  result=check_all()
  print(json.dumps({"status":"PASS","contracts":len(result),"checks":result},indent=2))
 except (CaptainRulesHold,ValueError,FileNotFoundError,KeyError,TypeError) as e:
  print(json.dumps({"status":"HOLD","reason":str(e)}))
  raise SystemExit(2)
