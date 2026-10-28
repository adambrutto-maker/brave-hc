"""Source-only regression: 7 authentic, finished, full-crest Goal/Assist/Shutout
artworks with tier metallic rings and readable foreground. No award inference.
"""
from collections import Counter
from pathlib import Path
from PIL import Image
import hashlib,json,unittest

R=Path(__file__).resolve().parents[1]
A=R/"widgets/assets/full-crest-clubs"
M=json.loads((A/"source-manifest.json").read_text(encoding="utf-8"))
H=json.loads((R/"widgets/player-highlights-ledger.json").read_text(encoding="utf-8"))
PREVIOUS=json.loads((R/"widgets/assets/round-clubs/source-manifest.json").read_text(encoding="utf-8"))
EXPECTED={
 ("GOALS",50,"bronze"):"50_goals_bronze_200.webp",
 ("GOALS",100,"silver"):"100_goals_silver_200.webp",
 ("ASSISTS",50,"bronze"):"50_assists_bronze_200.webp",
 ("ASSISTS",100,"silver"):"100_assists_silver_200.webp",
 ("ASSISTS",200,"gold"):"200_assists_gold_200.webp",
 ("SHUTOUTS",5,"bronze"):"5_shutouts_bronze_200.webp",
 ("SHUTOUTS",10,"silver"):"10_shutouts_silver_200.webp"
}
RIM={"bronze":(201,145,95),"silver":(185,202,217),"gold":(229,182,84),"platinum":(216,233,244)}
def digest(raw):return hashlib.sha256(raw).hexdigest()
class FullCrestMilestoneBadgeIntegrity(unittest.TestCase):
 def test_original_authenticated_logo_remains_exact(self):
  src=(R/"widgets/brave_hc_logo.png").read_bytes()
  self.assertEqual(M["sourceLogoSha256"],digest(src))
  self.assertEqual(M["sourceLogoSha256"],
    "d27f74ca6c64ebcd1cd7d1a7f4758315987c10ad0ef2f7da5f99e8757568d51e")
  self.assertEqual(M["original5000PixelLogoSha256"],
    "e245640bd0c1f3c3c8e3caea89e69a446d465f97724d9c6878992670229730b5")
  with Image.open(R/"widgets/brave_hc_logo.png") as im:self.assertEqual(im.size,(1000,1000))
 def test_only_seven_exact_published_thresholds(self):
  self.assertEqual(M["schema"],"brave-hc-full-crest-milestone-art/v1")
  self.assertEqual(M["earnedRecipientEvents"],37)
  items=[x for p in H["players"].values() for x in p["items"]
    if x.get("provenance")=="OFFICIAL_DATED_HTO_AWARDS_PARITY"]
  self.assertEqual(len(items),37)
  clubs=Counter(x["awardCategory"] for x in items)
  self.assertEqual(clubs,{"50 Goal Club":8,"100 Goal Club":6,
    "50 Assist Club":14,"100 Assist Club":6,"200 Assist Club":1,
    "5 Shutout Club":1,"10 Shutout Club":1})
  keys={(x["metric"],x["value"],x["tier"]) for x in M["assets"]}
  self.assertEqual(keys,set(EXPECTED))
  self.assertEqual(len(M["assets"]),7)
  self.assertEqual(len(list(A.glob("*.webp"))),7)
 def test_full_bleed_crest_metal_and_dark_foreground(self):
  for entry in M["assets"]:
   key=entry["metric"],entry["value"],entry["tier"]
   p=R/"widgets"/entry["path"]
   self.assertEqual(p.name,EXPECTED[key])
   raw=p.read_bytes()
   self.assertEqual(len(raw),entry["bytes"])
   self.assertEqual(digest(raw),entry["sha256"])
   with Image.open(p) as im:
    self.assertEqual(im.format,"WEBP")
    self.assertEqual(im.size,(200,200))
    self.assertEqual(im.mode,"RGBA")
    corners=[im.getpixel(xy)[3] for xy in ((0,0),(199,0),(0,199),(199,199))]
    self.assertEqual(corners,[0,0,0,0],p.name)
    # The authentic BRAND and HORSE artwork is visible at full-badge scale.
    red_top=im.getpixel((100,18));red_horse=im.getpixel((100,55))
    self.assertGreater(red_top[0],170,p.name)
    self.assertGreater(red_horse[0],170,p.name)
    self.assertLess(red_top[1],95,p.name)
    self.assertLess(red_horse[1],105,p.name)
    metallic=im.getpixel((100,9))
    self.assertGreater(metallic[3],220,p.name)
    self.assertTrue(all(abs(v-ex)<35 for v,ex in zip(metallic[:3],RIM[entry["tier"]])),(p.name,metallic))
    # The lower foreground plate is genuinely opaque enough for legibility.
    plate=im.getpixel((100,130))
    self.assertEqual(plate[3],255,p.name)
    self.assertLess(sum(plate[:3]),130,(p.name,plate))
    self.assertEqual(entry["background"],"AUTHENTIC_FULL_BLEED_BRAVE_HC_CREST")
 def test_original_game_point_win_assets_remain_separate(self):
  self.assertEqual(PREVIOUS["schema"],"brave-hc-rounded-milestone-art/v1")
  self.assertEqual(len(PREVIOUS["assets"]),22)
  self.assertFalse(any("full-crest-clubs/" in e["path"] for e in PREVIOUS["assets"]))
  self.assertTrue(all(x["metric"] in ("GAMES","POINTS","WINS") for x in PREVIOUS["assets"]))
 def test_future_tier_policy_explicit(self):
  self.assertEqual(M["tierPolicy"]["5_shutouts"],"bronze")
  self.assertEqual(M["tierPolicy"]["10_shutouts"],"silver")
  self.assertEqual(M["tierPolicy"]["20_shutouts"],"gold")
  self.assertEqual(M["tierPolicy"]["30+_shutouts"],"platinum")
  s=(R/"widgets/player-highlights-v2.js").read_text(encoding="utf-8")
  self.assertIn("fullCrestFamily:fullCrestFamily.has(type)",s)
  self.assertIn("if(art.fullCrestFamily){",s)
  self.assertIn("art.fullCrest?'full-crest-clubs/'",s)
if __name__=="__main__":unittest.main(verbosity=2)
