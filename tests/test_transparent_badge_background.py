"""Prevents opaque-white tiles from returning to the Brave H.C. player widget."""
from hashlib import sha256
from pathlib import Path
import json,unittest
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/"widgets/assets"
FILECOUNT={"approved":17,"round-clubs":22}
class TransparentBadges(unittest.TestCase):
 def test_every_approved_badge_is_alpha_webp_with_source_provenance(self):
  for group,count in FILECOUNT.items():
   meta=json.loads((ASSETS/group/"source-manifest.json").read_text(encoding="utf-8"))
   names=meta["files"] if group=="approved" else meta["assets"]
   self.assertEqual(len(names),count)
   for item in names:
    f=ASSETS/group/Path(item.get("file") or item.get("path")).name
    opaque=ROOT/"widgets"/item["opaqueSourcePath"]
    self.assertTrue(opaque.exists(),str(opaque))
    self.assertEqual(sha256(opaque.read_bytes()).hexdigest(),item["opaqueSourceSha256"])
    self.assertEqual(sha256(f.read_bytes()).hexdigest(),item["sha256"])
    self.assertEqual(len(f.read_bytes()),item["bytes"])
    self.assertEqual(item["background"],"TRANSPARENT_EXTERIOR_APPROVED_ART_PRESERVED")
    with Image.open(f) as im:
     self.assertEqual(im.format,"WEBP")
     self.assertEqual(im.size,(200,200))
     self.assertEqual(im.mode,"RGBA")
     corners=[im.getpixel(c)[3] for c in ((0,0),(199,0),(0,199),(199,199))]
     self.assertTrue(all(c==0 for c in corners),(group,f.name,corners))
     alpha=im.getchannel("A")
     visible=sum(x>200 for x in alpha.getdata())
     transparent=sum(x==0 for x in alpha.getdata())
     self.assertGreater(visible,6000,(group,f.name,"main award lost"))
     self.assertGreater(transparent,2500,(group,f.name,"white exterior not removed"))
  for n in ("all_star_nomination.webp","all_star_selection.webp"):
   with Image.open(ASSETS/"approved"/n) as im:
    self.assertTrue(all(im.getpixel((x,7))[3]==0 for x in range(200)),n)
 def test_no_white_background_in_widget_css(self):
  for fname in ("player-highlights.html","player-highlights-v2-preview.html"):
   text=(ROOT/"widgets"/fname).read_text("utf-8")
   self.assertIn(".ph-symbol.ph-approved-art,.ph-symbol.ph-milestone-art{background:transparent;border:0",text)
   self.assertIn(".ph-symbol.ph-approved-art.ph-cristillo-black-patch{border:0!important;background:transparent!important}",text)
   expected="player-highlights-v2.js?v="+("20" if fname=="player-highlights.html" else "17")
   self.assertIn(expected,text)
  javascript=(ROOT/"widgets/player-highlights-v2.js").read_text("utf-8")
  self.assertIn("?v=transparent-20261027",javascript)

if __name__=="__main__":unittest.main()
