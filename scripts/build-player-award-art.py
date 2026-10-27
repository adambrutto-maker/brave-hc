"""Build release-sized award artwork from the original BruTTech HockeyOS logo set.

Run: python scripts/build-player-award-art.py --source-dir PATH_TO_ORIGINAL_AWARD_LOGOS
Never modifies or renames original source images.
"""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

SOURCES = [
 ("ChatGPT Image Jun 27, 2026, 01_47_14 PM.png", "cristillo-dedication.webp", "Andrew Cristillo / Dedication"),
 ("ChatGPT Image Jun 27, 2026, 01_56_48 PM.png", "hart-mvp.webp", "Hart MVP"),
 ("ChatGPT Image Jun 27, 2026, 01_59_01 PM.png", "conn-smythe.webp", "Conn Smythe"),
 ("ChatGPT Image Jun 27, 2026, 02_07_13 PM.png", "james-norris.webp", "James Norris"),
 ("ChatGPT Image Jun 27, 2026, 02_09_20 PM.png", "lady-byng.webp", "Lady Byng"),
 ("ChatGPT Image Jun 27, 2026, 02_22_52 PM.png", "rookie-of-the-year.webp", "Rookie of the Year"),
 ("ChatGPT Image Jun 27, 2026, 02_31_51 PM.png", "most-improved.webp", "Most Improved Player"),
 ("ChatGPT Image Jun 27, 2026, 02_38_34 PM.png", "rolaids-relief.webp", "Rolaids Relief Man"),
]
def sha256(b):
 return hashlib.sha256(b).hexdigest()
def main():
 parser=argparse.ArgumentParser()
 parser.add_argument("--source-dir",required=True)
 args=parser.parse_args()
 src=Path(args.source_dir)
 dest=Path(__file__).resolve().parents[1]/"widgets"/"assets"/"awards"
 dest.mkdir(parents=True,exist_ok=True)
 manifest={"schema":"brave-hc-award-art/v1",
           "sourceAuthority":"BRUTTECH_HOCKEYOS_OWNED_AWARD_LOGO_FILES",
           "scope":"eight illustrated award winners; Hall of Fame Vote image excluded as misleading for induction",
           "assets":[]}
 for name,target,title in SOURCES:
  p=src/name
  if not p.is_file(): raise FileNotFoundError(p)
  original=p.read_bytes()
  with Image.open(p) as im:
   im=im.convert("RGB").resize((200,200),Image.Resampling.LANCZOS)
   output=dest/target
   im.save(output,format="WEBP",quality=94,method=6)
  manifest["assets"].append({"label":title,"path":"assets/awards/"+target,
    "sourceFile":name,"sourceSha256":sha256(original),
    "sha256":sha256(output.read_bytes()),"bytes":output.stat().st_size,
    "pixels":[200,200]})
 manifestFile=dest/"source-manifest.json"
 manifestFile.write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
 print("Created",len(manifest["assets"]),"optimized assets, total",sum(x["bytes"] for x in manifest["assets"]),"bytes")
if __name__=="__main__": main()
