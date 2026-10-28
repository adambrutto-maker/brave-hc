"""Source-only integrity of 29 AUTHENTIC uniform full-crest milestone medals.
Existing 22 original artwork assets are preserved and verified separately.
No awards, recipient rows, HTO records or calculations may be derived here.
"""
from collections import Counter
from pathlib import Path
from PIL import Image
import hashlib,json,unittest

ROOT=Path(__file__).resolve().parents[1]
A=ROOT/"widgets/assets/full-crest-clubs"
M=json.loads((A/"source-manifest.json").read_text(encoding="utf-8"))
H=json.loads((ROOT/"widgets/player-highlights-ledger.json").read_text(encoding="utf-8"))
OLD_PATH=ROOT/"widgets/assets/round-clubs/source-manifest.json"
OLD=json.loads(OLD_PATH.read_text(encoding="utf-8"))
KNOWN={
 ("GOALS",50,"bronze"),("GOALS",100,"silver"),
 ("ASSISTS",50,"bronze"),("ASSISTS",100,"silver"),("ASSISTS",200,"gold"),
 ("SHUTOUTS",5,"bronze"),("SHUTOUTS",10,"silver")
}
RIM={"bronze":(201,145,95),"silver":(185,202,217),"gold":(229,182,84),"platinum":(216,233,244)}
def sha(raw):return hashlib.sha256(raw).hexdigest()

class UnifiedMedalSourceIntegrity(unittest.TestCase):
 def test_authentic_crest_source_and_type_sizes(self):
  c=ROOT/"widgets/brave_hc_logo.png"
  self.assertEqual(sha(c.read_bytes()),M["sourceLogoSha256"])
  self.assertEqual(M["sourceLogoSha256"],"d27f74ca6c64ebcd1cd7d1a7f4758315987c10ad0ef2f7da5f99e8757568d51e")
  self.assertEqual(M["original5000PixelLogoSha256"],"e245640bd0c1f3c3c8e3caea89e69a446d465f97724d9c6878992670229730b5")
  self.assertEqual(M["uniformBadgeNumberFontPxAt600"],118)
  self.assertEqual(M["uniformBadgeMetricFontPxAt600"],51)
  with Image.open(c) as image:self.assertEqual(image.size,(1000,1000))
 def test_exact_six_metric_families_and_29_assets(self):
  self.assertEqual(M["schema"],"brave-hc-full-crest-milestone-art/v2")
  self.assertEqual(M["earnedMilestoneEvents"],134)
  self.assertEqual(M["earnedRecipientEvents"],37)
  self.assertEqual(len(M["assets"]),29)
  self.assertEqual(len(list(A.glob("*.webp"))),29)
  original={(x["metric"],x["value"],x["tier"]) for x in OLD["assets"]}
  actual={(x["metric"],x["value"],x["tier"]) for x in M["assets"]}
  self.assertEqual(actual,original|KNOWN)
  self.assertEqual(len(actual),29)
  self.assertEqual({x["metric"] for x in M["assets"]}, {"GAMES","POINTS","WINS","GOALS","ASSISTS","SHUTOUTS"})
 def test_original_22_images_and_unchanged_provenance(self):
  self.assertEqual(OLD["schema"],"brave-hc-rounded-milestone-art/v1")
  self.assertEqual(len(OLD["assets"]),22)
  self.assertEqual(sha(OLD_PATH.read_bytes().replace(b"\r\n",b"\n")),M["approvedRoundClubSourceManifestSha256"])
  for item in OLD["assets"]:
   raw=(ROOT/"widgets"/item["path"]).read_bytes()
   self.assertEqual(sha(raw),item["sha256"])
   self.assertEqual(len(raw),item["bytes"])
   matched=[x for x in M["assets"] if x["metric"]==item["metric"] and x["value"]==item["value"]]
   self.assertEqual(len(matched),1)
   self.assertEqual(matched[0]["originalApprovedArtPath"],item["path"])
   self.assertEqual(matched[0]["originalApprovedArtSha256"],item["sha256"])
   self.assertEqual(matched[0]["sourceVerifiedInSnapshot"],item["sourceVerifiedInSnapshot"])
 def test_original_verified_recipient_data_unchanged(self):
  self.assertEqual(len(H["players"]),43)
  items=[i for p in H["players"].values() for i in p["items"]]
  self.assertEqual(len(items),343)
  earned=[i for i in items if i["category"]=="milestone"]
  self.assertEqual(len(earned),134)
  supp=Counter(x["awardCategory"] for x in earned if x.get("provenance")=="OFFICIAL_DATED_HTO_AWARDS_PARITY")
  self.assertEqual(supp,{"50 Goal Club":8,"100 Goal Club":6,"50 Assist Club":14,
   "100 Assist Club":6,"200 Assist Club":1,"5 Shutout Club":1,"10 Shutout Club":1})
 def test_all_29_authentic_centered_and_alpha_rings(self):
  for item in M["assets"]:
   p=ROOT/"widgets"/item["path"]
   self.assertEqual(p.name,f"{item['value']}_{item['metric'].lower()}_{item['tier']}_200.webp")
   b=p.read_bytes()
   self.assertEqual(len(b),item["bytes"])
   self.assertEqual(sha(b),item["sha256"])
   with Image.open(p) as im:
    self.assertEqual(im.format,"WEBP")
    self.assertEqual(im.mode,"RGBA")
    self.assertEqual(im.size,(200,200))
    self.assertEqual([im.getpixel(q)[3] for q in ((0,0),(199,0),(0,199),(199,199))],[0]*4)
    self.assertLess(im.getpixel((100,130))[0]+im.getpixel((100,130))[1]+im.getpixel((100,130))[2],150)
    pixel=im.getpixel((100,9))
    self.assertGreater(pixel[3],210)
    self.assertTrue(all(abs(c-q)<36 for c,q in zip(pixel[:3],RIM[item["tier"]])),(p.name,pixel))
    horse=im.getpixel((100,55))
    self.assertGreater(horse[0],170,p.name)
    self.assertLess(horse[1],130,p.name)
   self.assertEqual(item["foreground"],"UNIFORM_CENTERED_NUMBER_AND_METRIC_DARK_PLAQUE")
 def test_future_threshold_rarity_and_runtime_source_gate(self):
  self.assertEqual(M["tierPolicy"]["5_shutouts"],"bronze")
  self.assertEqual(M["tierPolicy"]["10_shutouts"],"silver")
  self.assertEqual(M["tierPolicy"]["20_shutouts"],"gold")
  self.assertEqual(M["tierPolicy"]["30+_shutouts"],"platinum")
  script=(ROOT/"widgets/player-highlights-v2.js").read_text(encoding="utf-8")
  self.assertIn("fullCrestFamily:fullCrestFamily.has(type)",script)
  self.assertIn("new Set(['game','point','win','goal','assist','shutout'])",script)
  self.assertIn("if(art.fullCrestFamily){",script)
  self.assertIn("art.fullCrest?'full-crest-clubs/'",script)
  self.assertIn("validSupplementalClub(",script)

if __name__=="__main__":unittest.main(verbosity=2)
