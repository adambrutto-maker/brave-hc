"""Regression: Winter 2025/26 native HTO candidate fidelity and asset preservation."""
from pathlib import Path
from hashlib import sha256
from bs4 import BeautifulSoup
from collections import Counter
from urllib.parse import urlparse,parse_qs
import json,re,unittest

import build_hto_2025_26_preserved_native_candidate as app

class HistoricNativeCandidates(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.m=json.loads((app.STAGED/"manifest.json").read_text(encoding="utf8"))
  cls.source=json.loads(app.INDEX.read_text(encoding="utf8"))
  cls.old=json.loads((app.ORIGINALS/"native_original_fields_manifest.json").read_text(encoding="utf8"))
  cls.games={g["gameId"]:g for g in cls.m["games"]}
  cls.old_by={g["gameId"]:g for g in cls.old["games"]}

 def test_24_games_match_source_index(self):
  self.assertEqual(self.m["officialGames"],24)
  self.assertEqual(set(self.games),{g["gameId"] for g in self.source["games"]})
  self.assertEqual(len(self.games),24)

 def test_retrospectives_explicitly_not_approved_or_published(self):
  self.assertFalse(self.m["historicalRetrospectiveArticlesApproved"])
  self.assertEqual(self.m["publicationState"],"STAGED_NOT_PUBLISHED")
  self.assertEqual(self.m["nativeHTOWrites"],0)
  self.assertTrue(all(not x["livePublicationVerified"] for x in self.games.values()))

 def test_all_original_HTO_fields_backed_up(self):
  self.assertEqual(self.old["officialGameTotal"],24)
  self.assertTrue(self.old["sourceFieldsReadOnly"])
  self.assertEqual(self.old["nativeHTOChanges"],0)
  self.assertEqual(self.m["originalNativeSourcesInspected"],24)
  self.assertEqual(len(self.old_by),24)

 def test_original_historical_embeds_counts(self):
  self.assertEqual(sum(g["originalImagesRetained"] for g in self.games.values()),33)
  self.assertEqual(sum(g["originalVideoEmbedsRetained"] for g in self.games.values()),1)
  self.assertEqual(self.old["originalEmptyCount"],4)
  self.assertEqual(self.old["originalHumanTextCount"],0)
  self.assertEqual({g["gameId"] for g in self.m["games"] if g["originalVideoEmbedsRetained"]},
                   {2214988})

 def test_original_embeds_exact_markup_and_order_preserved(self):
  for gid,g in self.games.items():
   original=(app.ORIGINALS/self.old_by[gid]["file"]).read_text(encoding="utf8")
   combined=(app.STAGED/g["combinedFile"]).read_text(encoding="utf8")
   self.assertEqual(sha256(original.encode("utf8")).hexdigest(),
                    g["originalNativeSourceSHA256"],str(gid))
   self.assertIn(original.strip(),combined)
   before=BeautifulSoup(original,"html.parser")
   after=BeautifulSoup(combined,"html.parser")
   self.assertEqual([str(x) for x in before.find_all("img")],
                    [str(x) for x in after.find_all("img")],str(gid))
   self.assertEqual([str(x) for x in before.find_all("iframe")],
                    [str(x) for x in after.find_all("iframe")],str(gid))

 def test_original_video_known_trusted_Historical_URL(self):
  gid=2214988
  content=(app.ORIGINALS/self.old_by[gid]["file"]).read_text(encoding="utf8")
  frame=BeautifulSoup(content,"html.parser").find("iframe")
  self.assertIsNotNone(frame)
  parsed=urlparse(frame["src"])
  self.assertEqual((parsed.scheme,parsed.hostname,parsed.path),
   ("https","www.youtube.com","/embed/hJ0mNCGkw7w"))

 def test_legacy_images_preserve_public_team_custody(self):
  for gid,g in self.games.items():
   content=(app.STAGED/g["combinedFile"]).read_text(encoding="utf8")
   for img in BeautifulSoup(content,"html.parser").find_all("img"):
    u=urlparse(img["src"])
    self.assertEqual(u.hostname,"media.hometeamsonline.com")
    self.assertIn("/photos/hockey/BRAVESHOCKEY/",u.path)

 def test_source_markdown_sha_reconciles(self):
  for source in self.source["games"]:
   p=app.BASE/source["file"]
   self.assertEqual(sha256(p.read_text(encoding="utf8").encode()).hexdigest(),
                    source["fileSHA256"],str(source["gameId"]))

 def test_style_writes_one_readable_editorial_card_per_game(self):
  for gid,g in self.games.items():
   html=(app.STAGED/g["combinedFile"]).read_text(encoding="utf8")
   doc=BeautifulSoup(html,"html.parser")
   card=next((x for x in doc.find_all("div") if "background-color:#ffffff" in (x.get("style") or "")),None)
   self.assertIsNotNone(card,str(gid))
   self.assertEqual(card.find("h2").get_text(" ",strip=True),g["headline"])
   self.assertIn("font-size:16px",card["style"])

 def test_no_official_stats_mutation_commands(self):
  source=Path(app.__file__).read_text(encoding="utf8")
  self.assertNotIn("requests.post(",source)
  self.assertNotIn("requests.put(",source)
  self.assertNotIn("git push",source)
  self.assertNotIn("a.SendKeys(",source)
  self.assertNotIn("firebase deploy",source)

 def test_correct_native_game_routes(self):
  for gid,g in self.games.items():
   parsed=urlparse(g["exactGameUrl"])
   q=parse_qs(parsed.query)
   self.assertEqual(q.get("gameID"),[str(gid)])
   self.assertEqual(q.get("p"),["boxscore"])
   self.assertEqual(parsed.hostname,"www.htosports.com")

 def test_all_source_evidence_grades_retained(self):
  grades=Counter(x["sourceGrade"] for x in self.games.values())
  self.assertEqual(grades,{"SCOREBOARD_AND_SKATERS_ONLY":18,
                          "EVENTS_WITH_PARTIAL_PLAYER_STATS":1,
                          "FULL_GAME_EVENTS_AND_SKATERS":5})

 def test_file_hashes_match_actual_disk_bytes(self):
  for gid,g in self.games.items():
   content=(app.STAGED/g["combinedFile"]).read_bytes().replace(b"\r\n",b"\n")
   self.assertEqual(sha256(content).hexdigest(),g["combinedSHA256"],str(gid))

 def test_no_script_tag_or_injected_html_in_candidate(self):
  for gid,g in self.games.items():
   doc=BeautifulSoup((app.STAGED/g["combinedFile"]).read_text(encoding="utf8"),"html.parser")
   self.assertFalse(doc.find_all(["script","style","form","input","object"]),str(gid))
   self.assertEqual(len(doc.find_all("iframe")),g["originalVideoEmbedsRetained"])

 def test_retrospective_context_explicit_in_every_article(self):
  for gid,g in self.games.items():
   doc=BeautifulSoup((app.STAGED/g["combinedFile"]).read_text(encoding="utf8"),"html.parser")
   txt=doc.get_text(" ",strip=True)
   self.assertIn("Historical retrospective",txt,str(gid))
   self.assertIn("November 2026",txt,str(gid))
   self.assertIn("Official HTO game box score",txt,str(gid))
   self.assertIn("Hot Stove archive",txt,str(gid))

 def test_same_day_schmelts_games_are_different(self):
  self.assertEqual(self.games[2215014]["date"],"2026-03-22")
  self.assertEqual(self.games[2215015]["date"],"2026-03-22")
  self.assertNotEqual(self.games[2215014]["combinedFile"],
                      self.games[2215015]["combinedFile"])

if __name__=="__main__":unittest.main(verbosity=2)
