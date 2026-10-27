"""Bring approved round club concept assets into HockeyOS release staging.
No historical recipient/award changes. Official 5000px lion source stays in archive.
"""
from pathlib import Path
import json,hashlib,shutil
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
SRC=Path(r"D:\BruTTech\Products\HockeyOS\Implementation Control\PlayerCoaching\261027_MilestoneRound_Design_CANDIDATE")
DEST=ROOT/"widgets/assets/round-clubs"
DEST.mkdir(parents=True,exist_ok=True)
source=json.loads((SRC/"manifest.json").read_text(encoding="utf-8"))
assert source["topTier"]=="platinum"
assert source["logoSha256"]=="e245640bd0c1f3c3c8e3caea89e69a446d465f97724d9c6878992670229730b5"
assets=[]
for a in source["assets"]:
 name=a["widget"]
 origin=SRC/"artwork"/name
 assert origin.is_file(),origin
 with Image.open(origin) as im:
  assert im.size==(200,200),name
 dest=DEST/name
 shutil.copy2(origin,dest)
 assets.append({"path":"assets/round-clubs/"+name,
  "metric":a["metric"],"value":a["value"],"tier":a["tier"],
  "sourceVerifiedInSnapshot":bool(a.get("observedInVerifiedLedger",False)),
  "bytes":dest.stat().st_size,"sha256":hashlib.sha256(dest.read_bytes()).hexdigest()})
meta={"schema":"brave-hc-rounded-milestone-art/v1",
 "source":"BRUTTECH_1_AUTHENTIC_5000PX_LOGO_ARCHIVE",
 "logoSha256":source["logoSha256"],"tierPolicy":{"50":"bronze","100":"silver","200":"gold","300+":"platinum"},
 "rule":"Artwork maps exact verified HTO published club milestones. No award inference from raw stats.",
 "assets":assets}
(DEST/"source-manifest.json").write_text(json.dumps(meta,indent=2)+"\n",encoding="utf-8")
print("ROUND_STAGED",len(assets),"LOGO_SOURCE",source["logoSha256"])
