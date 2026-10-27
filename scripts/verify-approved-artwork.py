"""Validate staged official-logo milestone badges and approved artwork manifest.
Use --require-approved at release gate; does not infer recipient accomplishments.
"""
from pathlib import Path
import hashlib,json,argparse
from PIL import Image
R=Path(__file__).resolve().parents[1]
a=argparse.ArgumentParser();a.add_argument("--require-approved",action="store_true");opt=a.parse_args()
def check(path,assetKey,expectedSchema,expectedCount):
 if not path.is_file():return False
 obj=json.loads(path.read_text("utf-8"))
 assert obj["schema"]==expectedSchema
 assets=obj[assetKey];assert len(assets)==expectedCount
 for item in assets:
  file=R/"widgets"/(item.get("path") or item.get("file"))
  assert file.is_file(),file
  b=file.read_bytes()
  assert len(b)==item["bytes"],file
  assert hashlib.sha256(b).hexdigest()==item["sha256"],file
  with Image.open(file) as image:assert image.size==(200,200) and image.format=="WEBP",file
 return True
roundp=R/"widgets/assets/round-clubs/source-manifest.json"
approvedp=R/"widgets/assets/approved/source-manifest.json"
assert check(roundp,"assets","brave-hc-rounded-milestone-art/v1",22)
approved=check(approvedp,"files","brave-hc-approved-icon-art/v1",17)
assert approved or not opt.require_approved,"Missing imported approved artwork: upload/download release ZIP into BRUTTECH 1"
print(json.dumps({"roundClubAssets":"PASS_22","approvedArtwork":"PASS_17" if approved else "PENDING_SOURCE_FILE_TRANSFER",
"sourceAchievementMutations":0}))
