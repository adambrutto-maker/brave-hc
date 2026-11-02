"""HTO native editor article-pack source, identity and security regression."""
from __future__ import annotations

import copy
from html.parser import HTMLParser
import json
from pathlib import Path
import tempfile
import unittest

import build_hto_native_article_pack as app

ROOT = Path(__file__).resolve().parents[2]
INDEX = ROOT / "docs/editorial/261102_BraveHC_HTO_Historical_Game_Source_Index.json"


def fixtures():
    return (json.loads((ROOT / "widgets/hot-stove-approved.json").read_text(encoding="utf8")),
            json.loads((ROOT / "widgets/countdown.json").read_text(encoding="utf8")),
            json.loads(INDEX.read_text(encoding="utf8")))


class ElementValidator(HTMLParser):
    ALLOWED = {"h2","h3","p","strong","em","a"}
    def __init__(self):
        super().__init__()
        self.names=[]
        self.links=[]
    def handle_starttag(self,tag,attrs):
        self.names.append(tag)
        if tag not in self.ALLOWED:
            raise AssertionError("Disallowed native HTML tag "+tag)
        if tag=="a":
            allowed={k for k,_ in attrs}=={"href"}
            if not allowed: raise AssertionError("Unsafe hyperlink attributes")
            self.links.append(dict(attrs)["href"])
        elif attrs:raise AssertionError("Untrusted HTO source attributes")


class NativePackTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.feed,cls.countdown,cls.index=fixtures()

    def test_exact_season_archive_index(self):
        self.assertEqual(self.index["gameCount"],372)
        self.assertEqual(self.index["seasonCount"],18)
        self.assertEqual(self.index["verifiedScoreRows"],358)
        self.assertEqual(self.index["forfeitReviewCount"],5)
        self.assertEqual(self.index["heldScoringParityCount"],9)
        self.assertEqual(len(set(g["id"] for s in self.index["seasons"] for g in s["games"])),372)

    def test_seven_existing_editor_targets(self):
        records=app.build(self.feed,self.countdown,self.index)
        self.assertEqual(len(records),7)
        self.assertEqual({r["gameId"] for r in records},
                         {3356177,3356178,3369564,3375601,3375682,3375683,3375684})
        self.assertEqual(sum(r["targetField"]=="Game Summary" for r in records),6)
        self.assertEqual(sum(r["targetField"]=="Game Preview" for r in records),1)

    def test_no_widget_or_script_in_native_output(self):
        records=app.build(self.feed,self.countdown,self.index)
        for r in records:
            html,_=app.render_native(r)
            parser=ElementValidator()
            parser.feed(html)
            self.assertTrue(parser.links)
            self.assertTrue(all(u.startswith("https://adambrutto-maker.github.io/brave-hc/widgets/hot-stove.html") for u in parser.links))
            self.assertNotIn("<iframe",html)
            self.assertNotIn("<script",html)
            self.assertNotIn("<style",html)

    def test_recaps_match_exact_ht0_scores(self):
        for record in app.build(self.feed,self.countdown,self.index):
            if record["type"]=="postgame":
                self.assertIn("p=boxscore",record["nativePage"])
                self.assertIn("gameID="+str(record["gameId"]),record["nativePage"])
                self.assertEqual(len(record["sourceFingerprint"]),64)

    def test_precise_future_schedule_page(self):
        r=[r for r in app.build(self.feed,self.countdown,self.index) if r["type"]=="pregame"][0]
        self.assertEqual(r["gameId"],3375684)
        self.assertIn("p=preview",r["nativePage"])
        self.assertIn("Sunday, November 8",r["byline"])
        self.assertIn("D Rink",r["byline"])
        self.assertEqual(len(r["paragraphs"]),10)

    def test_approved_article_source_is_not_mutated(self):
        frozen=json.dumps(self.feed,sort_keys=True,ensure_ascii=False)
        app.build(self.feed,self.countdown,self.index)
        self.assertEqual(json.dumps(self.feed,sort_keys=True,ensure_ascii=False),frozen)

    def test_forfeit_cannot_be_story(self):
        f=copy.deepcopy(self.feed)
        target=f["archive"][0]["article"]
        target["gameId"]=2215012
        target["id"]="recap-2215012"
        with self.assertRaisesRegex(app.Hold,"HTO_GAME_NOT_VERIFIED_OR_FORFEIT"):
            app.build(f,self.countdown,self.index)

    def test_wrong_score_blocked(self):
        f=copy.deepcopy(self.feed)
        f["latestArticle"]["boxScore"]["ourGoals"]+=1
        with self.assertRaisesRegex(app.Hold,"SOURCE_PARITY_FAILED"):
            app.build(f,self.countdown,self.index)

    def test_wrong_editorial_status_blocked(self):
        f=copy.deepcopy(self.feed)
        f["latestArticle"]["editorialState"]="DRAFT_NOT_APPROVED"
        with self.assertRaisesRegex(app.Hold,"NOT_FOUNDER_APPROVED"):
            app.build(f,self.countdown,self.index)

    def test_preview_paragraph_substitution_blocked(self):
        f=copy.deepcopy(self.feed)
        f["gamePreview"]["sections"][0]["paragraphs"][0]="Unrelated"
        with self.assertRaisesRegex(app.Hold,"PREVIEW_SECTIONS_PARAGRAPH_PARITY_FAILED"):
            app.build(f,self.countdown,self.index)

    def test_new_fixture_identity_change_blocked(self):
        countdown=copy.deepcopy(self.countdown)
        countdown["games"][0]["opponent"]="Other Team"
        with self.assertRaisesRegex(app.Hold,"PREVIEW_MISSING_EXACT_SCHEDULE_ID"):
            app.build(self.feed,countdown,self.index)

    def test_html_entities_escaped_not_executed(self):
        r=copy.deepcopy(app.build(self.feed,self.countdown,self.index)[0])
        r["headline"]='<script>alert("hello")</script>'
        r["paragraphs"].append('<img src=x onerror="bad()">')
        html,plain=app.render_native(r)
        self.assertIn("&lt;script&gt;",html)
        self.assertIn("&lt;img src=x onerror=",html)
        self.assertNotIn("<img",html)
        self.assertNotIn("<script",html)
        ElementValidator().feed(html)

    def test_outputs_are_marked_staged(self):
        with tempfile.TemporaryDirectory() as d:
            records=app.build(self.feed,self.countdown,self.index)
            man=app.publish_pack(records,Path(d))
            self.assertEqual(man["publicationState"],"STAGED_NOT_PUBLISHED")
            self.assertFalse(man["nativeHTOChanged"])
            self.assertFalse(man["editorReadbackVerified"])
            self.assertEqual(len(man["entries"]),7)
            for entry in man["entries"]:
                html=(Path(d)/entry["htmlFile"]).read_text(encoding="utf8")
                self.assertTrue(html.startswith("<h2>"))
                self.assertEqual(len(entry["contentSha256"]),64)
                from hashlib import sha256
                self.assertEqual(sha256((Path(d)/entry["htmlFile"]).read_bytes()).hexdigest(),
                                 entry["contentSha256"],"Manifest hash must match actual bytes on any OS")
                self.assertEqual(entry["publicationState"],
                                 "REQUIRES_NATIVE_ADMIN_EDIT_AND_READBACK")

    def test_no_output_inside_public_repo(self):
        with self.assertRaisesRegex(app.Hold,"MUST_NOT_BE_GENERATED_INSIDE_PUBLIC_REPO"):
            app.publish_pack([],ROOT/"docs/editorial/unsafe")


if __name__=="__main__":
    unittest.main(verbosity=2)
