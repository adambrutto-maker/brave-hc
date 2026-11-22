#!/usr/bin/env python3
"""One-time owner-authorized Game 367 public card, using the approved blank Lines artwork.
No WhatsApp votes or private coaching material. No HTO CMS writes.
Creates versioned assets and updates the public Game Centre pointer locally;
Git release and public readback remain separately controlled.
"""
from __future__ import annotations
import copy, hashlib, json, shutil, subprocess
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
W=ROOT/"widgets"
ASSETS=W/"assets/lineups"
CARD="game-367-2026-11-22-working"
FIXTURE_ID="3375686"
DATE="2026-11-22"
OPP="Dateline Predators"
TIME="20:00"
RINK="B Rink"
PUCK_DROP="2026-11-23T01:00:00Z"
ROLLOVER="2026-11-23T02:00:00Z"
NAVY=(7,43,84)
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def require(ok,msg):
    if not ok: raise RuntimeError("RELEASE HOLD: "+msg)
def read(p):return json.loads(p.read_text(encoding="utf-8-sig"))
def dump(p,v):
    p.write_text(json.dumps(v,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
def utc(t):return t.strftime("%Y-%m-%dT%H:%M:%SZ")
def player(name):
    require(name in jerseys,"Missing verified source jersey for "+name)
    number=jerseys[name]
    require(isinstance(number,int) and 0<=number<=999,"Invalid jersey for "+name)
    p={"name":name,"jerseyNumber":str(number),"playerFontPx":58,
       "displayText":f"#{number} - {name}"}
    if name=="Pavaday, Damien":p["htoPlayerId"]=849368
    return p

status=subprocess.run(["git","status","--porcelain=v1"],cwd=ROOT,text=True,capture_output=True,check=True)
require(status.stdout.strip()=="?? scripts/publish_game367_261122.py","Git repository has unrelated edits; will not mingle releases")
schedule=read(W/"svhl-upcoming.json")
fixtures=[g for g in schedule["games"] if g.get("date")==DATE]
require(len(fixtures)==1,"Game date not unique in verified schedule")
f=fixtures[0]
require((f["opponent"],f["time"],f["rink"],str(f["htoGameId"]),f["htoSyncStatus"])==
        (OPP,TIME,RINK,FIXTURE_ID,"MATCH"),"Wrong official Game 367 fixture")
require(f.get("fixtureSignature")=="2026-11-22|20:00|Dateline Predators|B Rink|home",
        "Fixture signature mismatch")
roster=read(W/"hockeyos-hto-current-v20.json")["roster"]
jerseys={}
for p in roster:
    name=p["name"].split(" - ")[0]
    if name in jerseys:require(jerseys[name]==p["jersey"],"Conflicting jersey "+name)
    jerseys[name]=p["jersey"]

wing_pairs=[
    ("Provenzano, Mario","Provenzano, Michael"),
    ("Povegliano, Adam","Rosenberg, Jamie"),
    ("Pearsoll, Keith","Pavaday, Damien")
]
centres=["Saindon, Stephane","Carosi, Justin"]
defence_pairs=[
    ("Rajkumar, Sanjay","Triumbari, Francesco"),
    ("Brutto, Adam","Pagnotta, Alex"),
    ("Kober, Adam",None)
]
goalie=player("Logue, Stephen")
forward_rows=[]
for i,(lw,rw) in enumerate(wing_pairs):
    forward_rows.append({"line":i+1,"LW":player(lw),
                         "C":player(centres[i]) if i<2 else None,"RW":player(rw)})
defence_rows=[{"pair":i+1,"LD":player(ld),"RD":player(rd) if rd else None}
              for i,(ld,rd) in enumerate(defence_pairs)]
skaters=[p["name"] for row in forward_rows for col in ("LW","C","RW") if (p:=row.get(col))]
skaters += [p["name"] for row in defence_rows for col in ("LD","RD") if (p:=row.get(col))]
require(len(skaters)==13 and len(set(skaters))==13,"Skater accounting failed")
require(set(skaters).isdisjoint({"Kong, Henry","Paolucci, Anthony"}),"Nonattendee inserted")
require(centres==["Saindon, Stephane","Carosi, Justin"],
        "Must rotate starting centre order from Nov 15")
require([set(p) for p in wing_pairs]==[
    {"Provenzano, Mario","Provenzano, Michael"},
    {"Povegliano, Adam","Rosenberg, Jamie"},
    {"Pearsoll, Keith","Pavaday, Damien"}],"Captain-approved whole pairs changed")

manifest_path=W/"game-centre-lineup-public.json"
manifest=read(manifest_path)
old=manifest.get("publishedWorkingCard",{})
require(old.get("fixtureId")==3375685 and old.get("gameDate")=="2026-11-15",
        "Unexpected current public lineup pointer; stop rather than overwrite")
require(manifest["approved"] is None and manifest["weeklyAutoPublishEnabled"] is False
        and manifest["privateWhatsAppPollDataPublished"] is False,"Public release gates changed")
require((W/"assets/lineups/brave-hc-blank-original-card.png").is_file(),"Original artwork missing")
image=Image.open(ASSETS/"brave-hc-blank-original-card.png").convert("RGB")
require(image.size in ((1980,1530),(3300,2550)),"Original artwork dimensions changed")
if image.size==(1980,1530):image=image.resize((3300,2550),Image.Resampling.LANCZOS)
font=ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf",58)
big=ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf",80)
top=ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf",56)
small=ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf",44)
caption=ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf",47)
draw=ImageDraw.Draw(image)
def textcenter(s,center,size_font,available,color=NAVY):
    bounds=draw.textbbox((0,0),s,font=size_font)
    width=bounds[2]-bounds[0]
    require(width<=available,"58px uniform player name does not fit: "+s)
    draw.text(center,s,font=size_font,fill=color,anchor="mm")
def cell(s,rect):
    x0,y0,x1,y1=rect
    draw.rectangle((x0+9,y0+9,x1-9,y1-9),fill="white")
    textcenter(s,((x0+x1)//2,(y0+y1)//2),font,x1-x0-35)

# Draw only over the blank editable fields. Original crest, rules and cell borders remain intact.
draw.rectangle((174,417,3103,570),fill=(19,57,91))
textcenter("BRAVE H.C. LINES - FINAL",(1650,482),big,2900,color="white")
textcenter("BRAVE H.C. vs DATELINE PREDATORS  |  SUN NOV 22, 2026  |  8:00 PM  |  B RINK",
           (1650,222),top,3050)
wing_bounds=[((573,708,1406,866),(1418,708,2250,866),(2260,708,3098,866)),
             ((573,868,1406,1024),(1418,868,2250,1024),(2260,868,3098,1024)),
             ((573,1027,1406,1177),(1418,1027,2250,1177),(2260,1027,3098,1177))]
for row,bounds in zip(forward_rows,wing_bounds):
    for col,rect in zip(("LW","C","RW"),bounds):
        v=row[col]
        cell(v["displayText"] if v else "-",rect)
d_bounds=[((573,1404,1406,1563),(1418,1404,2250,1563)),
          ((573,1565,1406,1721),(1418,1565,2250,1721)),
          ((573,1723,1406,1878),(1418,1723,2250,1878))]
for row,bounds in zip(defence_rows,d_bounds):
    for col,rect in zip(("LD","RD"),bounds):
        v=row[col]
        cell(v["displayText"] if v else "-",rect)
# The fifth defender is a rotation, not a fictional third two-player pair.
draw.rectangle((164,1729,564,1904),fill="white")
draw.rectangle((164,1881,564,1904),fill=(19,57,91))
draw.line((158,1880,568,1880),fill=NAVY,width=7)
textcenter("ROTATING D",(365,1783),small,385)
textcenter("(5TH D)",(365,1840),small,385)
cell(goalie["displayText"],(1418,1973,2250,2120))
textcenter("FINAL TEAM LINEUP - 13 SKATERS - STEPHEN LOGUE #70",(1650,2300),caption,3100)
textcenter("CAROSI & SAINDON ROTATE CENTRE; KOBER ROTATES AS FIFTH DEFENCEMAN",
           (1650,2410),caption,3100)

png=ASSETS/(CARD+".png")
pdf=ASSETS/(CARD+".pdf")
contract_path=ASSETS/(CARD+".lineup.json")
require(not any(p.exists() for p in (png,pdf,contract_path)),"Game 367 assets already exist; no overwrite")
image.save(png,"PNG",optimize=True,dpi=(300,300))
image.save(pdf,"PDF",resolution=300.0,title="Brave H.C. Game 367 Final Lineup - November 22, 2026")
require(png.stat().st_size>100000 and pdf.stat().st_size>30000,
        "Rendered assets appear incomplete")
png_sha=sha(png)
pdf_sha=sha(pdf)
now=utc(datetime.now(timezone.utc))
require(datetime.now(timezone.utc)<datetime(2026,11,23,1,0,tzinfo=timezone.utc),
        "Cannot publish after puck drop without separate approval")
contract={
 "schema":"brave-hc-published-captain-lineup/v1","season":"W2026/27",
 "gameId":"367","officialHTOGameId":FIXTURE_ID,"gameDate":DATE,"opponent":OPP,
 "gameTime":TIME,"rink":RINK,"status":"FINAL_TEAM_LINEUP","userManagerApproved":True,
 "sourceOfManagerAuthorization":"Captain explicitly confirmed Keith attendance, Game 367 line composition, and ordered publication in active conversation",
 "notLeagueOfficialScorekeeperRelease":True,
 "currentRotationUsedVerifiedActualIceTime":False,
 "rotationContext":"Three whole captain-approved winger pairs rotate across lines, with two rotating centres (starting order reversed from Nov15). Kober is fifth rotating D; slots are NOT measured ice time.",
 "forwards":forward_rows,"defence":defence_rows,"goalie":goalie,"centreRotation":centres,
 "line3CentreDisplay":"-","hardBuddyPairs":[list(x) for x in wing_pairs],
 "captainLineupPolicy":"scripts/brave_hc_captain_lineup_rules.json",
 "printSpec":{"source":"approved original Brave H.C. artwork Lines!G5:J16",
 "pixelWidth":3300,"pixelHeight":2550,"allPlayerCellsSameFontSizePx":58,
 "fontFamily":"Arial Bold","independentFontShrinkApplied":False,"publicRoleLabelsIncluded":False},
 "pdf":{"path":"assets/lineups/"+pdf.name,"sha256":pdf_sha},
 "png":{"path":"assets/lineups/"+png.name,"sha256":png_sha},
 "namedPollVotesIncluded":False,"privateWhatsAppGroupContentIncluded":False,
 "venueDataCopiedFromVerifiedHTOandSVHL":True,
 "sourceCorrection":{"htoPlayerId":849368,"oldSpelling":"Pavaday, Damian",
 "correctSpelling":"Pavaday, Damien","jerseyNumber":"0","identityStable":True,
 "captainVerified":True,"nativeHTOProfileEditState":"PENDING_AUTHENTICATED_HTO_ADMIN",
 "sourceOfNumber":"HTO public roster and player profile show #0"},
 "captainPairOrderRevision":"20261122_GAME367_MANAGER_APPROVED"}
dump(contract_path,contract)
manifest["notice"]="Captain-approved FINAL Game 367 roster: Mario/Michael Provenzano, Adam Povegliano/Jamie Rosenberg, Keith Pearsoll/Damien Pavaday as winger pairs; Stephane Saindon and Justin Carosi alternate at centre. Sanjay/Francesco and Adam Brutto/Alex Pagnotta defence; Adam Kober fifth rotating D; Stephen Logue #70 confirmed. Actual ice time unmeasured."
manifest["workingCard"]={"fixtureId":3375686,"gameDate":DATE,"puckDropUTC":PUCK_DROP,
 "opponent":OPP,"sha256":pdf_sha}
manifest["publishedWorkingCard"]={
 "fixtureId":3375686,"gameDate":DATE,"opponent":OPP,"puckDropUTC":PUCK_DROP,
 "state":"PUBLIC_WORKING_LINEUP","authorizedForPublic":True,
 "goalieConfirmed":True,"sourceRange":"Lines!G5:J16","sourceSha256":pdf_sha,
 "publishedAt":now,"expiresAt":ROLLOVER,
 "url":"./assets/lineups/"+pdf.name,"sha256":pdf_sha,
 "previewImage":"./assets/lineups/"+png.name,"previewSHA256":png_sha,
 "managerConfirmedGoalie":{"source":"MANAGER_DIRECT_CONFIRMATION","status":"CONFIRMED_FOR_FIXTURE",
 "name":"Stephen Logue","number":"70","fixtureId":3375686,"gameDate":DATE,
 "puckDropUTC":PUCK_DROP,"confirmedAtUTC":now},
 "rentalGoalie":None,"revision":1,"skaterCount":13,
 "rotationPolicy":"CAPTAIN_THREE_WINGER_PAIRS_TWO_ROTATING_CENTRES_FIFTH_D_GAME367",
 "managerLineupStatus":"FINAL_TEAM_LINEUP","managerFinalReplacementAuthorized":True,
 "unconfirmedNamesMarked":False}
private_backup=Path(r"D:\BruTTech\Products\HockeyOS\attendance_automation_v0_1\outputs\261122_Game367_PrePublication_Manifest.json")
require(not private_backup.exists(),"Existing one-time backup exists; refuse replay")
private_backup.write_bytes(manifest_path.read_bytes())
dump(manifest_path,manifest)
print(json.dumps({"state":"LOCAL_CANDIDATE_NOT_ONLINE","fixtureId":3375686,
 "date":DATE,"opponent":OPP,"time":TIME,"rink":RINK,"skaters":len(skaters),
 "goalie":"Stephen Logue","png_sha256":png_sha,"pdf_sha256":pdf_sha,
 "manifest":str(manifest_path),"png":str(png),"pdf":str(pdf)},indent=2))
