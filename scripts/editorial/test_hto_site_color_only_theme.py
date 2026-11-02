"""Brave H.C. HTO colour-only theme guard.

The native HTO Site Details CSS must never change layout, positioning, typography,
scoreboards, templates, HTML or page structure. This file certifies the *source*
only. Separate browser checks must confirm HTO production geometry.
"""
from __future__ import annotations

from hashlib import sha256
from pathlib import Path
import re
import unittest

ROOT=Path(__file__).resolve().parents[2]
CSS=ROOT/"docs/design/261102_BraveHC_HTO_Native_Colour_Only_Frame_Overrides.css"
EXPECTED_SHA256="d9a9171fa792539b2dc66faf3022558dcd9728726423cf24a0b8e84602b5eb38"
EXPECTED_RULES={
    "#frameOuterWrapper":"#0d2339",
    ".fullPage .mainArea .modWrapper .modColorBG":"#142d46",
    ".frameOuterWrapper .modTitle":"#142d46",
    "#wideLinks_team .navInnerWrapper,\n#mobileNav_all .navInnerWrapper":"#142d46",
}

def parse_css(source: str):
    cleaned=re.sub(r"/\*.*?\*/","",source,flags=re.S)
    raw=re.findall(r"([^{}]+)\{([^{}]*)\}",cleaned)
    out={}
    for selector,block in raw:
        selector=selector.strip()
        if selector in out:raise ValueError("Duplicate native colour selector")
        declarations=[x.strip() for x in block.split(";") if x.strip()]
        if len(declarations)!=1:raise ValueError("More than one CSS property on "+selector)
        match=re.fullmatch(r"background-color:\s*(#[0-9a-f]{6})\s*!important",declarations[0],re.I)
        if not match:raise ValueError("Unsafe or non-colour property: "+selector)
        out[selector]=match.group(1).lower()
    return out

class HtoSiteColourOnlyGuard(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.raw=CSS.read_text(encoding="utf8")
        cls.rules=parse_css(cls.raw)

    def test_exact_native_source_checksum(self):
        self.assertEqual(sha256(self.raw.encode("utf8")).hexdigest(),EXPECTED_SHA256)

    def test_exact_four_approved_selectors(self):
        self.assertEqual(self.rules,EXPECTED_RULES)

    def test_only_background_colour_properties(self):
        self.assertEqual(len(self.rules),4)
        self.assertEqual(self.raw.count("background-color:"),4)

    def test_no_scripts_external_images_or_embeds(self):
        self.assertNotRegex(self.raw.lower(),r"@import|url\(|<script|<style|javascript:|iframe|@font-face")

    def test_no_layout_or_type_repositioning(self):
        stripped=re.sub(r"/\*.*?\*/","",self.raw,flags=re.S)
        for term in ("width:","height:","min-width:","min-height:","padding:","margin:",
                     "border:","border-width:","font:","font-family:","font-size:","font-weight:",
                     "position:","display:","transform:","grid-","flex:","overflow:","opacity:",
                     "z-index:","top:","bottom:","left:","right:","line-height:"):
            self.assertNotIn(term,stripped.lower())

    def test_reject_accidental_positioning_declaration(self):
        with self.assertRaisesRegex(ValueError,"More than one CSS property"):
            parse_css("#frameOuterWrapper{background-color:#0d2339!important;position:fixed;}")

    def test_reject_global_body_override(self):
        with self.assertRaises(AssertionError):
            self.assertEqual(parse_css("body{background-color:#ffffff!important;}"),EXPECTED_RULES)

    def test_verified_brand_colours_are_pinned(self):
        self.assertEqual(self.rules["#frameOuterWrapper"],"#0d2339")
        self.assertEqual(self.rules[".fullPage .mainArea .modWrapper .modColorBG"],"#142d46")

    def test_no_roster_schedule_stats_or_video_selector(self):
        for s in self.rules:
            self.assertNotRegex(s.lower(),r"roster|scoreboard|stats|data-table|schedule|youtube|livebarn|video|iframe")

    def test_no_change_to_mobile_navigation_structure(self):
        nav=[s for s in self.rules if "mobileNav" in s]
        self.assertEqual(len(nav),1)
        self.assertEqual(self.rules[nav[0]],"#142d46")

if __name__=="__main__":
    unittest.main(verbosity=2)
