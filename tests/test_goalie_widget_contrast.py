import importlib.util
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
path=ROOT/"tests"/"smoke_goalie_widget_live.py"
spec=importlib.util.spec_from_file_location("smoke_goalie_widget_live",path)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class WidgetContrastTests(unittest.TestCase):
    def test_live_css_source_meets_wcag_normal_text_contrast(self):
        html=(ROOT/"widgets"/"goalie-schedule-v1.2-HTO-embed.html").read_text(encoding="utf-8")
        levels=m.verify_css_contrast(html)
        self.assertEqual(len(levels),5)
        self.assertTrue(all(ratio>=4.5 for ratio in levels.values()))

    def test_bad_game_text_contrast_rejected(self):
        html=(ROOT/"widgets"/"goalie-schedule-v1.2-HTO-embed.html").read_text(encoding="utf-8")
        corrupt=html.replace("color:#fff!important;background:transparent!important",
                             "color:#08182a!important;background:transparent!important")
        self.assertNotEqual(corrupt,html)
        with self.assertRaisesRegex(AssertionError,"Insufficient source CSS contrast"):
            m.verify_css_contrast(corrupt)

    def test_bad_tbd_contrast_rejected(self):
        html=(ROOT/"widgets"/"goalie-schedule-v1.2-HTO-embed.html").read_text(encoding="utf-8")
        corrupt=html.replace("td.bg-tbd{color:#ffb3c0!important}",
                             "td.bg-tbd{color:#102b43!important}")
        self.assertNotEqual(corrupt,html)
        with self.assertRaisesRegex(AssertionError,"Insufficient source CSS contrast"):
            m.verify_css_contrast(corrupt)

    def test_expected_standard_contrast_examples(self):
        self.assertAlmostEqual(m.contrast_ratio("#fff","#000"),21.0,places=1)
        self.assertAlmostEqual(m.contrast_ratio("#000","#fff"),21.0,places=1)
        self.assertAlmostEqual(m.contrast_ratio("#777","#777"),1.0,places=1)


if __name__=="__main__":
    unittest.main(verbosity=2)
