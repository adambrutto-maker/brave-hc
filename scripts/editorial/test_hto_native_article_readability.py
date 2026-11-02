"""Regression checks for source-preserving high-contrast HTO native article skins."""
from __future__ import annotations
from bs4 import BeautifulSoup
from hashlib import sha256
import re,sys,unittest

import hto_native_article_readability as app

INTRO="Brave H.C. returns to the ice on Sunday after two contrasting results in league play."
SECOND="A previous victory was followed by a difficult outing, and a new opponent awaits the team."
SOURCE_LINK="https://adambrutto-maker.github.io/brave-hc/widgets/hot-stove.html?tab=preview"

PREVIEW=(
  "<h2>Other Way Next as Braves Prepare</h2>"
  "<p><strong>Sunday, November 8, 2026 · D Rink</strong></p>"
  "<p>"+INTRO+"</p>"
  "<p>"+SECOND+"</p>"
  "<p>Common Opponents Offer a Closer Look</p>"
  "<p>Both teams have faced some of the same clubs, with very different results.</p>"
  "<p>A Chance to Carry the Offence Forward</p>"
  "<p>There is another opportunity to build on the positives from earlier games.</p>"
  "<p><a href=\""+SOURCE_LINK+"\">Browse the Brave H.C. Hot Stove archive</a></p>"
)
RECAP=(
  "<h2>Braves Edged in Sunday Match</h2>"
  "<p><strong>Sunday, November 1, 2026 | Brave H.C. 2–7 Mid Ice Crisis</strong></p>"
  "<p><em>A hard-fought matchup produced two third-period goals.</em></p>"
  "<p>Brave H.C. played a competitive game in which the visitors scored in each period.</p>"
  "<h3>First Period</h3>"
  "<p>The first period finished 1–0 in favour of the opposition.</p>"
  "<h3>Second Period</h3>"
  "<p>The Braves did not score in the second and entered the final period trailing.</p>"
  "<p><a href=\"https://adambrutto-maker.github.io/brave-hc/widgets/hot-stove.html?tab=archive\">Browse the Brave H.C. Hot Stove archive</a></p>"
)

def contrast(rgb_text: str, rgb_bg="#ffffff"):
    def c(text):
        if text.startswith("#"):
            return tuple(int(text[i:i+2],16) for i in (1,3,5))
        raise ValueError("Only CSS hex values expected")
    def luminance(rgb):
        v=[n/255 for n in rgb]
        v=[n/12.92 if n<=.04045 else ((n+.055)/1.055)**2.4 for n in v]
        return .2126*v[0]+.7152*v[1]+.0722*v[2]
    aa,bb=luminance(c(rgb_text)),luminance(c(rgb_bg))
    return (max(aa,bb)+.05)/(min(aa,bb)+.05)


class NativeEditorSkins(unittest.TestCase):
    def test_preview_headings_semantics_restored(self):
        styled,p=app.style_native_article(PREVIEW,"preview",(
            "Common Opponents Offer a Closer Look","A Chance to Carry the Offence Forward"))
        soup=BeautifulSoup(styled,"html.parser")
        self.assertEqual(len(soup.find_all("h3")),2)
        self.assertEqual(p["storyBlocksPreserved"],len(app.blocks(BeautifulSoup(PREVIEW,"html.parser"))))
        self.assertEqual(p["restoredPreviewHeadings"],
                         ["A Chance to Carry the Offence Forward","Common Opponents Offer a Closer Look"])

    def test_recap_existing_headings_styled(self):
        styled,p=app.style_native_article(RECAP,"recap")
        soup=BeautifulSoup(styled,"html.parser")
        self.assertEqual(len(soup.find_all("h3")),2)
        self.assertEqual(p["originalH3Count"],p["styledH3Count"])
        self.assertEqual(app.blocks(soup),app.blocks(BeautifulSoup(RECAP,"html.parser")))

    def test_exact_text_remains_unchanged(self):
        for src,kind in ((RECAP,"recap"),(PREVIEW,"preview")):
            styled,p=app.style_native_article(src,kind)
            orig=app.blocks(BeautifulSoup(src,"html.parser"))
            after=app.blocks(BeautifulSoup(styled,"html.parser"))
            self.assertEqual(orig,after)
            self.assertEqual(p["storyBlocksPreserved"],len(orig))

    def test_woff_or_widget_not_required(self):
        for src,kind in ((PREVIEW,"preview"),(RECAP,"recap")):
            styled,p=app.style_native_article(src,kind)
            self.assertIn("background-color:#ffffff",styled)
            self.assertIn("border-top:5px solid #ae263e",styled)
            self.assertIn("font-size:25px",styled)
            self.assertIn("font-size:16px",styled)
            self.assertNotIn("<style",styled)
            self.assertNotIn("<script",styled)
            self.assertNotIn("<iframe",styled)
            self.assertNotIn("javascript:",styled)
            self.assertFalse(p["siteWideThemeModified"])
            self.assertFalse(p["videoOrHighlightsTouched"])

    def test_high_contrast_reading_colors(self):
        self.assertGreater(contrast("#162e45"),12)
        self.assertGreater(contrast("#18384f"),11)
        self.assertGreater(contrast("#112a42"),12)
        self.assertGreater(contrast("#122d45","#ecf3f8"),10)
        self.assertGreater(contrast("#a31e38","#f0f4f8"),6)

    def test_wrap_is_single_light_card(self):
        styled,_=app.style_native_article(RECAP,"recap")
        soup=BeautifulSoup(styled,"html.parser")
        self.assertEqual(len(soup.find_all("div")),1)
        self.assertEqual(soup.div.get("style"),app.STYLE["wrap"])
        self.assertEqual(len(soup.find_all("h2")),1)

    def test_reject_script_or_embeds(self):
        for injection in ('<script>alert(1)</script>', '<iframe src="https://example.com"></iframe>',
                          '<style>body{background:red}</style>'):
            with self.assertRaises(app.StyleHold):
                app.style_native_article(RECAP+injection,"recap")

    def test_reject_inline_event_handlers(self):
        with self.assertRaisesRegex(app.StyleHold,"event handlers"):
            app.style_native_article(RECAP.replace("<h2>","<h2 onclick=\"alert(1)\">"),"recap")

    def test_reject_non_https_links(self):
        bad=RECAP.replace("https://adambrutto-maker.github.io","javascript:alert(1)//")
        with self.assertRaisesRegex(app.StyleHold,"https"):
            app.style_native_article(bad,"recap")

    def test_dont_double_skin_input(self):
        styled,_=app.style_native_article(RECAP,"recap")
        with self.assertRaisesRegex(app.StyleHold,"Unsupported source tag"):
            app.style_native_article(styled,"recap")

    def test_missing_exact_section_heading_held(self):
        with self.assertRaisesRegex(app.StyleHold,"Not every specified"):
            app.style_native_article(PREVIEW,"preview",("Nonexistent period heading",))

    def test_duplicate_heading_held(self):
        with self.assertRaisesRegex(app.StyleHold,"Duplicate"):
            app.style_native_article(PREVIEW,"preview",("Common Opponents Offer a Closer Look",)*2)

    def test_recap_rejects_preview_restoration(self):
        with self.assertRaisesRegex(app.StyleHold,"preview-only"):
            app.style_native_article(RECAP,"recap",("First Period",))

    def test_reject_unsupported_mode(self):
        with self.assertRaisesRegex(app.StyleHold,"preview or recap"):
            app.style_native_article(RECAP,"podcast")

    def test_sha_receipts_match_styled_output(self):
        styled,p=app.style_native_article(PREVIEW,"preview")
        self.assertEqual(sha256(styled.encode("utf8")).hexdigest(),p["styledHtmlSHA256"])
        self.assertEqual(sha256(PREVIEW.encode("utf8")).hexdigest(),p["sourceHtmlSHA256"])
        self.assertEqual(p["publicationState"],"PREPARED_NOT_PUBLISHED")

    def test_no_score_or_authoritative_record_modification(self):
        styled,p=app.style_native_article(RECAP,"recap")
        self.assertFalse(p["scoresModified"])
        self.assertNotIn("scoreboard",styled.lower())
        self.assertNotIn("scoresedit",styled.lower())

if __name__=="__main__":
    unittest.main(verbosity=2)
