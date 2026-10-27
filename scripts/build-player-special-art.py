"""Build custom championship and All-Star SVG artwork based on Brave H.C. visual identity.
The physical cup shape is referenced to the team's HTO 2016 championship photographs;
not a Stanley Cup silhouette. Reproducible with no external assets.
"""
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/"widgets/assets/special"
DEST.mkdir(parents=True,exist_ok=True)
SILVER='''<defs>
<linearGradient id="silver" x1="0" x2="1"><stop stop-color="#8299ae"/><stop offset=".21" stop-color="#fcffff"/><stop offset=".47" stop-color="#a7b5c4"/><stop offset=".76" stop-color="#eef5fa"/><stop offset="1" stop-color="#6e8194"/></linearGradient>
<linearGradient id="navy" x1="0" x2="0.6" y1="0" y2="1"><stop stop-color="#194267"/><stop offset="1" stop-color="#071728"/></linearGradient>
</defs>'''
BASE='''<circle cx="100" cy="100" r="95" fill="#061829" stroke="#c49b57" stroke-width="7"/>
<circle cx="100" cy="100" r="84" fill="url(#navy)" stroke="#8b1630" stroke-width="4"/>
<text x="100" y="34" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" letter-spacing="2.2" font-weight="bold" fill="#f9d690">BRAVE H.C.</text>'''
CUP='''<ellipse cx="100" cy="58" rx="36" ry="8" fill="url(#silver)" stroke="#213b54" stroke-width="2"/>
<path d="M64 57 Q72 75 80 76 L80 85 Q69 92 71 98 L75 104 L74 111 L77 121 L76 130 Q72 135 72 140 L128 140 Q128 135 124 130 L123 121 L126 111 L125 104 L129 98 Q131 92 120 85 L120 76 Q128 75 136 57" fill="url(#silver)" stroke="#3b4c5f" stroke-width="2.2"/>
<path d="M80 77 L120 77 M78 86 L122 86 M76 96 L124 96 M76 105 L124 105 M77 114 L123 114 M77 122 L123 122 M76 131 L124 131" stroke="#61778c" stroke-width="2.8" opacity=".9"/>
<path d="M69 141 Q66 145 69 149 L131 149 Q134 145 131 141 Z" fill="url(#silver)" stroke="#475c6e" stroke-width="2"/>
<ellipse cx="100" cy="58" rx="30" ry="4" fill="#d0dce6" stroke="#526c80" stroke-width="1.3"/>
<path d="M49 151 L151 151 L144 174 L56 174 Z" fill="#951b34" stroke="#e2b768" stroke-width="3"/>
<text x="100" y="167" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" font-weight="900" letter-spacing=".4" fill="#ffffff">SVHL CUP</text>
<text x="100" y="185" text-anchor="middle" font-family="Arial,sans-serif" font-size="10.5" font-weight="bold" letter-spacing="1.7" fill="#f7db9b">CHAMPION</text>'''
STAR_PATH="100,46 114,84 154,84 123,108 134,149 100,126 66,149 77,108 46,84 86,84"
def svg(name,contents):
 return '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><title>Brave H.C. '+name+'</title>'+SILVER+BASE+contents+'</svg>\n'
NOM='''<polygon points="'''+STAR_PATH+'''" fill="#cedbe6" stroke="#e6c276" stroke-width="5" stroke-linejoin="round"/>
<polygon points="100,62 111,91 141,91 117,108 125,135 100,119 75,135 83,108 59,91 89,91" fill="#788faa" stroke="#f7fafd" stroke-width="1.7"/>
<path d="M32 146 L168 146 L161 172 L39 172 Z" fill="#b21d3e" stroke="#e7c07b" stroke-width="3"/>
<text x="100" y="165" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" letter-spacing="1.0" font-size="17" fill="#fff">ALL-STAR</text>
<text x="100" y="184" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="11" letter-spacing="1" fill="#f3d99f">NOMINEE</text>'''
ACT='''<polygon points="'''+STAR_PATH+'''" fill="#eacb75" stroke="#fff0b0" stroke-width="5" stroke-linejoin="round"/>
<polygon points="100,62 111,91 141,91 117,108 125,135 100,119 75,135 83,108 59,91 89,91" fill="#f9e5a3" stroke="#bc9a58" stroke-width="2"/>
<path d="M32 146 L168 146 L161 172 L39 172 Z" fill="#9d1c39" stroke="#e7c07b" stroke-width="3"/>
<text x="100" y="165" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" letter-spacing="1" font-size="17" fill="#fff">ALL-STAR</text>
<text x="100" y="184" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="11" letter-spacing="2" fill="#f3d99f">SELECTED</text>'''
assets=[
("svhl-cup-champion.svg","SVHL Cup Champion",CUP),
("all-star-nomination.svg","All-Star Nomination",NOM),
("all-star-selected.svg","All-Star Selected",ACT)]
manifest={"schema":"brave-hc-special-emblems/v1","artSource":"Brave H.C. HTO championship photos, Winter 2015/16 and Summer 2016",
"photoAlbums":[{"season":"Summer 2016","id":17381,"image":"Braves.jpg"},{"season":"Winter 2015/16","id":15938,"image":"6127aa1f-033e-445c-ab8f-35baf4a0537f1.jpg"}],
"sourcePolicy":"Vector illustration faithfully follows the tall silver SVHL cup visible in historic HTO photos; not a photo crop or NHL Stanley Cup.",
"assets":[]}
for filename,title,art in assets:
 b=svg(title,art).encode("utf-8");(DEST/filename).write_bytes(b)
 manifest["assets"].append({"file":filename,"label":title,"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest()})
(DEST/"source-manifest.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"assets":len(assets),"folder":str(DEST)}))
