"""Render exact Brave H.C. full-crest Goal/Assist/Shutout badge artwork.
Inputs: verified public 1000x1000 authentic Brave H.C. crest, locally corroborated
to 5000px original in protected archive (the archive is NOT published).
Output: 200x200 transparent-exterior WebP, metallic tier rings, full-bleed official
logo background and foreground number/metric with readable translucent plate.

Default is --check (read-only), --write creates the seven approved static assets.
Does NOT grant awards or touch the published historical achievement ledger.
"""
from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageChops
from collections import Counter
import hashlib, json, io, argparse

ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/"widgets/assets/full-crest-clubs"
CREST=ROOT/"widgets/brave_hc_logo.png"
MANIFEST=DEST/"source-manifest.json"
CREST_SHA="d27f74ca6c64ebcd1cd7d1a7f4758315987c10ad0ef2f7da5f99e8757568d51e"
ORIGINAL_5000_SHA="e245640bd0c1f3c3c8e3caea89e69a446d465f97724d9c6878992670229730b5"
ART=(
 (50,"goals","bronze"),(100,"goals","silver"),
 (50,"assists","bronze"),(100,"assists","silver"),
 (200,"assists","gold"),(5,"shutouts","bronze"),(10,"shutouts","silver")
)
METALS={
 "bronze":{"rim":"#C9915F","shine":"#F8D6AB","deep":"#65452A"},
 "silver":{"rim":"#B9CAD9","shine":"#F1F7FC","deep":"#516A80"},
 "gold":{"rim":"#E5B654","shine":"#FFE8AF","deep":"#84632C"},
 "platinum":{"rim":"#D8E9F4","shine":"#FFFFFF","deep":"#6F91AA"}
}
S=600
def sha(raw):return hashlib.sha256(raw).hexdigest()
def font(size):
 for name in ("arialbd.ttf","seguisb.ttf","Arial.ttf"):
  p=Path("C:/Windows/Fonts")/name
  if p.exists():return ImageFont.truetype(str(p),size)
 raise RuntimeError("No reproducible Windows bold font installed")
def render(source:Image.Image,count:int,metric:str,tier:str)->Image.Image:
 """Transparent circle; authentic crest covers the medallion, not a small icon."""
 assert (count,metric,tier) in ART
 metal=METALS[tier]
 crest=source.resize((532,532),Image.Resampling.LANCZOS)
 layer=Image.new("RGBA",(S,S),(0,0,0,0))
 # Whole authentic circular crest as background with original red horse and
 # original navy/BRAVE/H.C. artwork visible; nothing is squeezed or re-drawn.
 layer.alpha_composite(crest,(34,34))
 # Crop exterior to circular silhouette; no square colour tile.
 mask=Image.new("L",(S,S),0);md=ImageDraw.Draw(mask)
 md.ellipse((25,25,575,575),fill=255)
 layer.putalpha(ImageChops.darker(layer.getchannel("A"),mask))
 ring=ImageDraw.Draw(layer,"RGBA")
 # Metallic rings OUTSIDE the crest, with tier-specific trim and light.
 ring.ellipse((23,23,577,577),outline=metal["deep"],width=16)
 ring.ellipse((25,25,575,575),outline=metal["rim"],width=11)
 ring.ellipse((39,39,561,561),outline=metal["shine"],width=4)
 ring.ellipse((48,48,552,552),outline="#11253C",width=4)
 # Shadow bottom over the horse only where numeric label needs contrast.
 grad=Image.new("RGBA",(S,S),(0,0,0,0))
 pixels=grad.load()
 for y in range(298,555):
  a=round(154*min(1,(y-298)/112))
  for x in range(50,550):
   if (x-300)**2+(y-300)**2<=248**2:pixels[x,y]=(4,16,28,a)
 layer=Image.alpha_composite(layer,grad)
 plaque=Image.new("RGBA",(S,S),(0,0,0,0));p=ImageDraw.Draw(plaque,"RGBA")
 p.rounded_rectangle((95,339,505,502),radius=31,
   fill=(5,22,39,227),outline=metal["rim"],width=5)
 p.line((155,439,445,439),fill=metal["rim"],width=3)
 layer=Image.alpha_composite(layer,plaque)
 dr=ImageDraw.Draw(layer)
 number_font=font(111 if count<100 else 99 if count<1000 else 83)
 label_font=font(43 if len(metric)<=6 else 37)
 dr.text((300,389),str(count),font=number_font,anchor="mm",
         fill="#FFFFFF",stroke_width=4,stroke_fill="#092136")
 dr.text((300,466),metric.upper(),font=label_font,anchor="mm",
         fill=metal["shine"],stroke_width=1,stroke_fill="#071729")
 # Restore dark exterior transparency after plaque/ring composition.
 alpha=layer.getchannel("A")
 hard=Image.new("L",(S,S),0);hd=ImageDraw.Draw(hard)
 hd.ellipse((17,17,583,583),fill=255)
 alpha=ImageChops.darker(alpha,hard)
 layer.putalpha(alpha)
 return layer.resize((200,200),Image.Resampling.LANCZOS)

def expected_payload():
 raw=CREST.read_bytes()
 assert sha(raw)==CREST_SHA,"Verified authentic widget logo source changed"
 source=Image.open(io.BytesIO(raw)).convert("RGBA")
 assert source.size==(1000,1000)
 art=[]
 blobs={}
 previews=[]
 for count,metric,tier in ART:
  name=f"{count}_{metric}_{tier}_200.webp"
  img=render(source,count,metric,tier)
  assert img.size==(200,200) and img.mode=="RGBA"
  with io.BytesIO() as buf:
   img.save(buf,format="WEBP",lossless=True,method=6,exact=True)
   b=buf.getvalue()
  blobs[name]=b
  art.append({
   "path":"assets/full-crest-clubs/"+name,
   "metric":metric.upper(),"value":count,"tier":tier,
   "sourceVerifiedInSnapshot":True,"bytes":len(b),"sha256":sha(b),
   "size":[200,200],"background":"AUTHENTIC_FULL_BLEED_BRAVE_HC_CREST",
   "foreground":"TIER_OUTLINE_NUMBER_METRIC_DARK_PLAQUE"
  })
  previews.append((name,img))
 ledger=json.loads((ROOT/"widgets/player-highlights-ledger.json").read_text(encoding="utf-8"))
 rec=Counter(x["awardCategory"] for p in ledger["players"].values() for x in p["items"]
  if x.get("category")=="milestone" and x.get("provenance")=="OFFICIAL_DATED_HTO_AWARDS_PARITY")
 assert sum(rec.values())==37 and set(rec)=={
  f"{c} {m.title()[:-1] if m!='shutouts' else 'Shutout'} Club"
  for c,m,_ in ART
 },"Do not fabricate new milestones or badge families"
 assert [rec.get(k) for k in ("50 Goal Club","100 Goal Club","50 Assist Club",
   "100 Assist Club","200 Assist Club","5 Shutout Club","10 Shutout Club")]==[8,6,14,6,1,1,1]
 manifest={
  "schema":"brave-hc-full-crest-milestone-art/v1",
  "source":"EXACT_AUTHENTIC_BRAVE_HC_CREST_IN_PUBLIC_WIDGET_VERIFIED_AGAINST_ORIGINAL_5000PX_ARCHIVE",
  "sourceLogoPath":"widgets/brave_hc_logo.png","sourceLogoSha256":CREST_SHA,
  "original5000PixelLogoSha256":ORIGINAL_5000_SHA,
  "design":"Full original crest behind legible number and category, tier-aligned outer rings; transparent exterior. Never infer achievement.",
  "tierPolicy":{"50":"bronze","100":"silver","200":"gold","300+":"platinum",
                "5_shutouts":"bronze","10_shutouts":"silver","20_shutouts":"gold","30+_shutouts":"platinum"},
  "earnedRecipientEvents":37,"assets":art
 }
 return blobs,manifest,previews

def main():
 parser=argparse.ArgumentParser()
 parser.add_argument("--write",action="store_true")
 parser.add_argument("--check",action="store_true")
 a=parser.parse_args()
 assert a.write ^ a.check,"Choose exactly --write or --check"
 blobs,manifest,previews=expected_payload()
 raw=(json.dumps(manifest,indent=2,ensure_ascii=False)+"\n").encode("utf-8")
 if a.write:
  DEST.mkdir(parents=True,exist_ok=True)
  for name,b in blobs.items():(DEST/name).write_bytes(b)
  MANIFEST.write_bytes(raw)
  if not (ROOT/"docs").exists():raise RuntimeError("Missing docs directory")
  w=220;gap=15
  sheet=Image.new("RGB",(w*4+gap*5,300*2+gap*3),"#0A2036")
  dr=ImageDraw.Draw(sheet)
  for i,(name,img) in enumerate(previews):
   col,row=i%4,i//4
   x=gap+col*(w+gap);y=gap+row*(300+gap)
   sheet.paste(img,(x+10,y+11),img)
   dr.text((x+110,y+225),name.replace("_200.webp",""),anchor="ma",font=font(16),fill="#D8E9F4")
  sheet.save(ROOT/"docs/261028_FullCrest_Goal_Assist_Shutout_Visual_QA.png")
 else:
  assert MANIFEST.read_bytes()==raw,"Badge manifest drift"
  for name,b in blobs.items():
   assert (DEST/name).read_bytes()==b,"Regenerated source bitmap changed: "+name
 print(json.dumps({"status":"FULL_CREST_MILESTONE_"+("WRITE" if a.write else "READONLY_REGEN")+" _PASS",
                    "original5000pxProof":ORIGINAL_5000_SHA,"widgetLogo":CREST_SHA,
                    "assets":len(blobs),"recipientEvents":37,
                    "metricFamilies":["GOALS","ASSISTS","SHUTOUTS"],
                    "tiers":list(METALS),"exactBytes":sum(len(b) for b in blobs.values())},indent=2))
if __name__=="__main__":main()
