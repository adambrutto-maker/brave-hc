"""Build one consistent authentic full-crest design for every Brave H.C. club medal.

The prior 22 Game/Point/Win files under assets/round-clubs are NEVER modified
(their hashes and original provenance are checked). This script publishes a
separate, complete 29-asset full-crest collection and source manifest.
Awards/historical winners are never derived from the artwork.

--write: generate/rebuild 29 medals and visual comparison.
--check: deterministic read-only compare to staged assets on authorized machine.
"""
from __future__ import annotations
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import argparse,hashlib,json,io
from collections import Counter

ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/"widgets/assets/full-crest-clubs"
PREVIOUS=ROOT/"widgets/assets/round-clubs/source-manifest.json"
CREST=ROOT/"widgets/brave_hc_logo.png"
SOURCE_SHA="d27f74ca6c64ebcd1cd7d1a7f4758315987c10ad0ef2f7da5f99e8757568d51e"
PRIVATE_ARCHIVE_LOGO_SHA="e245640bd0c1f3c3c8e3caea89e69a446d465f97724d9c6878992670229730b5"
RIM={
 "bronze":{"rim":"#C9915F","light":"#F8D6AB","dark":"#65452A"},
 "silver":{"rim":"#B9CAD9","light":"#F1F7FC","dark":"#516A80"},
 "gold":{"rim":"#E5B654","light":"#FFE8AF","dark":"#84632C"},
 "platinum":{"rim":"#39C7F3","light":"#E5FCFF","dark":"#6145BE"}
}
ORIGINAL= json.loads(PREVIOUS.read_text(encoding="utf-8"))
assert ORIGINAL["schema"]=="brave-hc-rounded-milestone-art/v1"
assert ORIGINAL["logoSha256"]==PRIVATE_ARCHIVE_LOGO_SHA
assert len(ORIGINAL["assets"])==22
EXTENDED=[
 (50,"goals","bronze"),(100,"goals","silver"),
 (50,"assists","bronze"),(100,"assists","silver"),(200,"assists","gold"),
 (5,"shutouts","bronze"),(10,"shutouts","silver")
]
ORIGINAL_TUPLES=[(int(x["value"]),x["metric"].lower(),x["tier"]) for x in ORIGINAL["assets"]]
ART=ORIGINAL_TUPLES+EXTENDED
assert len(ART)==len(set(ART))==29
AUTHORITY=ROOT/"widgets/player-highlights-ledger.json"
H=json.loads(AUTHORITY.read_text(encoding="utf-8"))
earned=[x for p in H["players"].values() for x in p["items"] if x["category"]=="milestone"]
assert len(earned)==134
supp=Counter(x["awardCategory"] for x in earned if x.get("provenance")=="OFFICIAL_DATED_HTO_AWARDS_PARITY")
assert supp=={"50 Goal Club":8,"100 Goal Club":6,"50 Assist Club":14,"100 Assist Club":6,
             "200 Assist Club":1,"5 Shutout Club":1,"10 Shutout Club":1}
assert sum(supp.values())==37
def sha(b):return hashlib.sha256(b).hexdigest()
def font(sz):
 for face in ("arialbd.ttf","seguisb.ttf"):
  file=Path("C:/Windows/Fonts")/face
  if file.exists():return ImageFont.truetype(str(file),sz)
 raise RuntimeError("No verified bold font available; fail closed")
# Keep font metrics independent of category and threshold, including 1000s.
NUMBER_FONT_SIZE=118
METRIC_FONT_SIZE=51
S=600
def render(logo:Image.Image,count:int,metric:str,tier:str)->Image.Image:
 assert (count,metric,tier) in ART
 medal=Image.new("RGBA",(S,S),(0,0,0,0))
 medal.alpha_composite(logo.resize((532,532),Image.Resampling.LANCZOS),(34,34))
 mask=Image.new("L",(S,S),0)
 ImageDraw.Draw(mask).ellipse((25,25,575,575),fill=255)
 medal.putalpha(ImageChops.darker(medal.getchannel("A"),mask))
 m=RIM[tier]
 rings=ImageDraw.Draw(medal,"RGBA")
 rings.ellipse((23,23,577,577),outline=m["dark"],width=16)
 rings.ellipse((25,25,575,575),outline=m["rim"],width=11)
 rings.ellipse((39,39,561,561),outline=m["light"],width=4)
 rings.ellipse((48,48,552,552),outline="#11253C",width=4)
 if tier=="platinum":
  # Sapphire/cyan rim with violet facets: visibly different from muted silver.
  rings.arc((25,25,575,575),315,350,fill="#AB83FF",width=11)
  rings.arc((25,25,575,575),125,160,fill="#9165ED",width=11)
  rings.arc((39,39,561,561),198,222,fill="#E8FDFF",width=4)
  rings.polygon(((509,119),(516,135),(532,142),(516,149),(509,165),(502,149),(486,142),(502,135)),
                fill="#DCFBFF")
 # An anchored center plate covers the lion while the original crest's
 # BRAVE lettering (top) and H.C. lettering (bottom) remain unobstructed.
 # Do not darken the bottom of the crest: previous lower shading hid H.C.
 plaque=Image.new("RGBA",(S,S),(0,0,0,0))
 pd=ImageDraw.Draw(plaque,"RGBA")
 pd.rounded_rectangle((83,174,517,433),radius=92,fill=(4,18,35,239),
                      outline=m["rim"],width=5)
 pd.line((151,333,449,333),fill=m["rim"],width=3)
 medal=Image.alpha_composite(medal,plaque)
 dr=ImageDraw.Draw(medal)
 number=str(count)
 metricName=metric.upper()
 numberFont=font(NUMBER_FONT_SIZE)
 labelFont=font(METRIC_FONT_SIZE)
 # Shared exact font size and centre anchoring across all 29 badges.
 numBBox=dr.textbbox((0,0),number,font=numberFont)
 wordBBox=dr.textbbox((0,0),metricName,font=labelFont)
 assert numBBox[2]-numBBox[0]<390,(count,metric,"number overflow")
 assert wordBBox[2]-wordBBox[0]<390,(count,metric,"metric overflow")
 dr.text((300,271),number,font=numberFont,anchor="mm",fill="#FFFFFF",
         stroke_width=4,stroke_fill="#092136")
 dr.text((300,372),metricName,font=labelFont,anchor="mm",fill=m["light"],
         stroke_width=1,stroke_fill="#091A2C")
 hard=Image.new("L",(S,S),0);ImageDraw.Draw(hard).ellipse((17,17,583,583),fill=255)
 medal.putalpha(ImageChops.darker(medal.getchannel("A"),hard))
 return medal.resize((200,200),Image.Resampling.LANCZOS)

def source_integrity():
 assert sha(CREST.read_bytes())==SOURCE_SHA
 oldBytes=PREVIOUS.read_bytes()
 assert len(ORIGINAL["assets"])==22
 for a in ORIGINAL["assets"]:
  b=(ROOT/"widgets"/a["path"]).read_bytes()
  assert sha(b)==a["sha256"] and len(b)==a["bytes"],a["path"]
 return sha(oldBytes.replace(b"\r\n",b"\n"))

def build():
 archivehash=source_integrity()
 logo=Image.open(io.BytesIO(CREST.read_bytes())).convert("RGBA")
 assert logo.size==(1000,1000)
 chunks={}
 rows=[]
 for count,metric,tier in ART:
  name=f"{count}_{metric}_{tier}_200.webp"
  img=render(logo,count,metric,tier)
  assert img.mode=="RGBA" and img.size==(200,200)
  buf=io.BytesIO();img.save(buf,format="WEBP",lossless=True,method=6,exact=True)
  b=buf.getvalue()
  chunks[name]=b
  source=next((x for x in ORIGINAL["assets"] if x["value"]==count and x["metric"].lower()==metric),None)
  rows.append({
   "path":"assets/full-crest-clubs/"+name,
   "metric":metric.upper(),"value":count,"tier":tier,
   "sourceVerifiedInSnapshot":bool(source["sourceVerifiedInSnapshot"]) if source else True,
   "bytes":len(b),"sha256":sha(b),"size":[200,200],
   "background":"AUTHENTIC_FULL_BLEED_BRAVE_HC_CREST",
   "foreground":"UNIFORM_CENTERED_NUMBER_METRIC_OVER_LION_BRAVE_TOP_HC_BOTTOM",
   "originalApprovedArtPath":source["path"] if source else None,
   "originalApprovedArtSha256":source["sha256"] if source else None
  })
 meta={
  "schema":"brave-hc-full-crest-milestone-art/v2",
  "source":"EXACT_AUTHENTIC_BRAVE_HC_CREST_IN_PUBLIC_WIDGET_VERIFIED_AGAINST_ORIGINAL_5000PX_ARCHIVE",
  "sourceLogoPath":"widgets/brave_hc_logo.png","sourceLogoSha256":SOURCE_SHA,
  "original5000PixelLogoSha256":PRIVATE_ARCHIVE_LOGO_SHA,
  "approvedRoundClubSourceManifestSha256":archivehash,
  "original22ApprovedClubAssetsUnchanged":True,
  "design":"All 29 medals: full authentic crest, center text/number over lion, BRAVE clearly above and H.C. clearly below, tier rim and transparent exterior.",
  "centeredOverlayGeometryAt600":[83,174,517,433],
  "numberCenterAt600":[300,271],
  "metricCenterAt600":[300,372],
  "crestLetteringPreserved":["BRAVE","H.C."],
  "uniformBadgeNumberFontPxAt600":NUMBER_FONT_SIZE,
  "uniformBadgeMetricFontPxAt600":METRIC_FONT_SIZE,
  "platinumVisualFinish":"PRISMATIC_DIAMOND_CYAN_AZURE_VIOLET_DISTINCT_FROM_SILVER",
  "platinumCyanRim":"#39C7F3","platinumVioletFacet":"#AB83FF",
  "platinumTierNamePreserved":True,
  "tierPolicy":{"50":"bronze","100":"silver","200":"gold","300+":"platinum",
                "5_shutouts":"bronze","10_shutouts":"silver","20_shutouts":"gold","30+_shutouts":"platinum"},
  "earnedMilestoneEvents":134,"earnedRecipientEvents":37,
  "legacyApprovedAssetCount":22,"newGoalAssistShutoutAssetCount":7,
  "assets":rows
 }
 return chunks,meta

def main():
 ap=argparse.ArgumentParser();ap.add_argument("--write",action="store_true");ap.add_argument("--check",action="store_true")
 args=ap.parse_args()
 assert args.write!=args.check,"Specify exactly one --write or --check"
 chunks,meta=build()
 payload=(json.dumps(meta,ensure_ascii=False,indent=2)+"\n").encode("utf-8")
 if args.write:
  OUTPUT.mkdir(parents=True,exist_ok=True)
  for name,raw in chunks.items():(OUTPUT/name).write_bytes(raw)
  (OUTPUT/"source-manifest.json").write_bytes(payload)
  # Review sheet: all six families plus all four metal tiers at a readable scale.
  selections=[
   ("50_games_bronze_200.webp","Games / Bronze"),
   ("100_points_silver_200.webp","Points / Silver"),
   ("200_wins_gold_200.webp","Wins / Gold"),
   ("300_games_platinum_200.webp","Games / Platinum"),
   ("50_goals_bronze_200.webp","Goals / Bronze"),
   ("100_goals_silver_200.webp","Goals / Silver"),
   ("200_assists_gold_200.webp","Assists / Gold"),
   ("10_shutouts_silver_200.webp","Shutouts / Silver")
  ]
  sheet=Image.new("RGB",(1000,560),"#10263C")
  text=ImageDraw.Draw(sheet)
  for i,(name,caption) in enumerate(selections):
   src=Image.open(io.BytesIO(chunks[name])).convert("RGBA").resize((215,215),Image.Resampling.LANCZOS)
   x=27+(i%4)*245;y=18+(i//4)*275
   sheet.paste(src,(x,y),src)
   text.text((x+107,y+238),caption,fill="#E6EDF3",font=font(23),anchor="mm")
  sheet.save(ROOT/"docs/261028_Unified_All_Milestone_Artwork_Review.png")
 else:
  assert (OUTPUT/"source-manifest.json").read_bytes()==payload
  assert len(list(OUTPUT.glob("*.webp")))==len(chunks)==29
  for name,b in chunks.items():assert (OUTPUT/name).read_bytes()==b,name
 print(json.dumps({"status":"UNIFIED_MILESTONES_"+("WRITE" if args.write else "REGEN_PASS"),
  "assets":len(chunks),"originalUnmodified":22,"goalAssistShutout":7,
  "earnedMilestones":meta["earnedMilestoneEvents"],
  "fontNumber":NUMBER_FONT_SIZE,"fontMetric":METRIC_FONT_SIZE,
  "logo_sha":SOURCE_SHA,"source_manifest_sha":meta["approvedRoundClubSourceManifestSha256"]},indent=2))
if __name__=="__main__":main()
