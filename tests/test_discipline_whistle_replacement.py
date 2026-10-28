"""Regression guard for user-approved discipline whistle/referee-card replacement."""
from pathlib import Path
from hashlib import sha256
import importlib.util,json,unittest
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/"widgets/assets"
class DisciplineArtwork(unittest.TestCase):
 def test_exact_approved_source_and_backward_safe_manifest(self):
  doc=json.loads((ASSETS/"approved/source-manifest.json").read_text("utf-8"))
  entry=next(x for x in doc["files"] if x["slug"]=="discipline_record")
  self.assertEqual(len(doc["files"]),17)
  self.assertEqual(entry["approval"],"USER_APPROVED_2026-10-27_WHISTLE_RED_AND_YELLOW_CARDS")
  self.assertEqual(entry["source"],"USER_APPROVED_WHISTLE_AND_RED_YELLOW_CARDS")
  for field,h in (
   ("sourceArtPath","sourceArtSha256"),("sourceWebpPath","sourceWebpSha256"),
   ("priorNeutralBackup","priorNeutralSha256")):
   self.assertEqual(sha256((ROOT/"widgets"/entry[field]).read_bytes()).hexdigest(),
                    entry[h],field)
  target=ASSETS/"approved/discipline_record.webp"
  self.assertEqual(target.read_bytes(),(ROOT/"widgets"/entry["sourceWebpPath"]).read_bytes())
  self.assertEqual(sha256(target.read_bytes()).hexdigest(),entry["sha256"])
  self.assertNotEqual(entry["sha256"],entry["priorNeutralSha256"])
  self.assertEqual(target.stat().st_size,entry["bytes"])
  with Image.open(target) as im:
   self.assertEqual(im.mode,"RGBA")
   self.assertEqual(im.size,(200,200))
   self.assertTrue(all(im.getpixel(pt)[3]==0 for pt in
                   ((0,0),(199,0),(0,199),(199,199))))
   pixels=[im.getpixel((x,y)) for y in range(200) for x in range(200)]
   self.assertGreater(sum(r>130 and g<115 and b<120 and a>180 for r,g,b,a in pixels),1200,
                      "Red penalty card absent")
   self.assertGreater(sum(r>130 and g>100 and b<100 and a>180 for r,g,b,a in pixels),300,
                      "Yellow referee card absent")
 def test_original_opaque_package_cannot_undo_locked_artwork(self):
  legacy=ROOT/"scripts/install-approved-artwork.py"
  spec=importlib.util.spec_from_file_location("old_importer",legacy)
  mod=importlib.util.module_from_spec(spec)
  spec.loader.exec_module(mod)
  with self.assertRaisesRegex(ValueError,"REFUSE_OVERWRITING_LOCKED_TRANSPARENT_ARTWORK"):
   mod.install(Path("NOT_A_REINSTALL_REQUEST.zip"))
 def test_three_historical_suspensions_not_awards(self):
  ledger=json.loads((ROOT/"widgets/player-highlights-ledger.json").read_text("utf-8"))
  entries=[(p["name"],i["sourceText"]) for p in ledger["players"].values()
           for i in p["items"] if i["category"]=="discipline"]
  self.assertEqual(len(entries),3,entries)
  names={x[0] for x in entries}
  self.assertEqual(names,{"Stefano Ardizzi","Julian Kercz","Stefano Mazzei"})
  for name,source in entries:
   self.assertIn("Game Suspension",source)
  code=(ROOT/"widgets/player-highlights-v2.js").read_text("utf-8")
  self.assertIn("if(item.category==='discipline')return approvedOrFallback(art,'discipline_record')",code)
  self.assertIn("?v=whistle-cards-20261028",code)
  for name in ("player-highlights.html","player-highlights-v2-preview.html"):
   self.assertIn("player-highlights-v2.js?v=15",(ROOT/"widgets"/name).read_text("utf-8"))
if __name__=="__main__":unittest.main()
