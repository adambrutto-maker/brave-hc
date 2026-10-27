"""Brave H.C. light-background historical icon system.

The original award JPG/WebP assets are not modified. Regenerates only the 19
custom SVG milestone, championship and heritage illustrations as 200px artwork
that presents at the same physical 58px (48px mobile) size as original awards.
"""
from pathlib import Path
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "widgets" / "assets"

NAVY = "#102c4b"
INK = "#061d38"
RED = "#a42040"
GOLD = "#c99043"
BRIGHT = "#ffe0a0"
SILVER = "#edf6fc"

HEADER = """<rect width="200" height="200" fill="#ffffff"/>
<path d="M100 5 L180 31 L175 125 Q168 169 100 195 Q32 169 25 125 L20 31 Z"
  fill="#0a2744" stroke="#071c35" stroke-width="3.5"/>
<path d="M100 15 L169 39 L165 121 Q158 159 100 184 Q42 159 35 121 L31 39 Z"
  fill="#ffffff" stroke="#bb2344" stroke-width="5"/>
<path d="M35 40 L100 17 L165 40 L162 60 L38 60 Z" fill="#122f51"/>
<text x="100" y="46" font-family="Arial,sans-serif" font-size="12.6"
 font-weight="900" letter-spacing="1.4" text-anchor="middle" fill="#fff">BRAVE H.C.</text>
<path d="M40 61 Q100 68 160 61" stroke="#dcac5f" stroke-width="3.5" fill="none"/>"""

WREATH = """<g fill="#d3a04c" stroke="#76502b" stroke-width="1">
<ellipse cx="46" cy="90" rx="6" ry="13" transform="rotate(-27 46 90)"/>
<ellipse cx="40" cy="109" rx="6" ry="13" transform="rotate(-10 40 109)"/>
<ellipse cx="48" cy="127" rx="6" ry="12" transform="rotate(27 48 127)"/>
<ellipse cx="154" cy="90" rx="6" ry="13" transform="rotate(27 154 90)"/>
<ellipse cx="160" cy="109" rx="6" ry="13" transform="rotate(10 160 109)"/>
<ellipse cx="152" cy="127" rx="6" ry="12" transform="rotate(-27 152 127)"/>
</g>
<path d="M48 139 Q29 114 49 78 M152 139 Q171 114 151 78"
 stroke="#996123" stroke-width="3" fill="none"/>"""

METAL = """<defs>
<linearGradient id="silver" x1="0" x2="1"><stop stop-color="#637f99"/>
 <stop offset=".24" stop-color="#f8ffff"/><stop offset=".53" stop-color="#9babbb"/>
 <stop offset=".77" stop-color="#fff"/><stop offset="1" stop-color="#50677c"/></linearGradient>
<linearGradient id="gold" x1="0" x2="1"><stop stop-color="#8a561f"/>
 <stop offset=".28" stop-color="#ffe4a2"/><stop offset=".58" stop-color="#bd832d"/>
 <stop offset=".83" stop-color="#ffebae"/><stop offset="1" stop-color="#805021"/></linearGradient>
</defs>"""

def text(x, y, s, size=20, fill=NAVY, weight=900, stroke="", sw=0):
    return (f'<text x="{x}" y="{y}" text-anchor="middle" font-family="Arial,sans-serif" '
            f'font-size="{size}" font-weight="{weight}" fill="{fill}" '
            f'stroke="{stroke or "none"}" stroke-width="{sw}" paint-order="stroke" '
            f'letter-spacing=".3">{s}</text>')

def ribbon(caption, muted=False):
    col="#5e788f" if muted else RED
    size=15 if len(caption)<=12 else 12.2 if len(caption)<=17 else 10.2
    return (f'<path d="M32 147 Q100 157 168 147 L162 168 Q100 190 38 168 Z" '
            f'fill="{col}" stroke="{INK}" stroke-width="3"/>'
            f'<path d="M43 149 Q100 160 158 149" fill="none" stroke="{BRIGHT}" stroke-width="2"/>'
            +text(100,169,caption,size,fill="#fff"))

def tier_info(quantity):
    """Artwork advances only for independently published verified source milestones."""
    if quantity < 100: return ("bronze","#b57441","#f8d3a2",0)
    if quantity < 200: return ("silver","#8da8ba","#f1f9fc",1)
    if quantity < 300: return ("gold","#d8a53b","#fff0a2",2)
    if quantity < 400: return ("platinum","#c3d9e6","#ffffff",3)
    if quantity < 750: return ("diamond","#88c8e8","#effbff",4)
    return ("legend","#f0c26e","#fff3b0",5)

def number_badge(quantity,measure):
    tier,primary,light,rank=tier_info(quantity)
    size=72 if quantity<100 else 60 if quantity<1000 else 49
    ornament=('<path d="M61 77 L139 77 L147 116 L100 147 L53 116 Z" fill="#123657" stroke="'+primary+'" stroke-width="'+str(4.4+rank*.65)+'"/>')
    ornament+=('<path d="M63 82 H137" stroke="'+light+'" stroke-width="3.6"/>')
    if rank>=2:
        ornament+=('<path d="M73 70 L100 62 L127 70" stroke="'+light+'" stroke-width="3" fill="none"/>')
    if rank>=3:
        ornament+=('<path d="M65 111 L50 99 L57 118 L79 139 M135 111 L150 99 L143 118 L121 139" fill="none" stroke="'+primary+'" stroke-width="4"/>')
    if rank>=4:
        ornament+=('<path d="M78 64 L88 59 L100 63 L112 59 L122 64" fill="none" stroke="'+light+'" stroke-width="4"/>')
    if rank>=5:
        ornament+='<circle cx="100" cy="65" r="5" fill="#f2ca60" stroke="#6f521c"/>'
    numeric=text(100,128,str(quantity),size,fill=light,stroke="#071f3c",sw=2.4)
    flourish=('<path d="M58 145 Q100 '+str(152+rank*1.25)+' 142 145" fill="none" stroke="'+primary+'" stroke-width="'+str(2.5+rank*.3)+'"/>')
    return WREATH+ornament+numeric+flourish+ribbon(measure)

def mini_cup():
    return """<ellipse cx="100" cy="72" rx="37" ry="7" fill="url(#silver)" stroke="#173650" stroke-width="2.5"/>
<path d="M65 72 Q70 92 84 97 L116 97 Q130 92 135 72 Z"
  fill="url(#silver)" stroke="#233e58" stroke-width="2.5"/>
<ellipse cx="100" cy="72" rx="29" ry="3" fill="#aec1d2" stroke="#4f6880" stroke-width="1"/>
<path d="M88 96 L112 96 L115 108 L85 108 Z" fill="url(#silver)" stroke="#354b61" stroke-width="2"/>
<path d="M80 106 L120 106 L125 118 L75 118 Z" fill="url(#silver)" stroke="#2c4960" stroke-width="2"/>
<path d="M70 116 L130 116 L137 129 L63 129 Z" fill="url(#silver)" stroke="#2d485e" stroke-width="2"/>
<path d="M62 128 L138 128 L143 141 L57 141 Z" fill="url(#silver)" stroke="#2d485e" stroke-width="2.3"/>
<path d="M67 120 Q100 123 133 120 M60 132 Q100 135 140 132"
  stroke="#ffffff" stroke-width="2.5" fill="none"/>
<path d="M76 120 V127 M86 120 V129 M116 120 V129 M126 120 V127
M72 133 V140 M85 133 V142 M114 133 V142 M128 133 V140"
  stroke="#647e92" stroke-width="1.3"/>
<path d="M88 80 Q95 93 100 94" stroke="#faffff" stroke-width="3" fill="none"/>"""

def star(selected):
    gold=selected
    fill="url(#gold)" if gold else "url(#silver)"
    rim=GOLD if gold else NAVY
    pts="100,65 113,94 147,96 122,116 130,145 100,129 70,145 78,116 53,96 87,94"
    return (f'<polygon points="{pts}" fill="{fill}" stroke="{rim}" stroke-width="5" stroke-linejoin="round"/>'
            +f'<polygon points="100,76 109,99 134,100 115,114 122,134 100,123 78,134 85,114 66,100 91,99"'
            f' fill="none" stroke="{("#fff6d5" if gold else "#fff")}" stroke-width="2.5" />')

def motif_heritage(name):
    if name=="art-ross.svg":
        return """<path d="M78 88 Q100 69 122 88 L118 117 Q100 129 82 117 Z"
 fill="url(#gold)" stroke="#4d3650" stroke-width="3.1"/>
<ellipse cx="100" cy="86" rx="23" ry="5" fill="#ffeaa4" stroke="#915d22" stroke-width="2"/>
<path d="M92 120 L108 120 L110 133 L90 133 Z" fill="url(#gold)" stroke="#6a431f" stroke-width="2"/>
<path d="M82 133 L118 133 L123 141 L77 141 Z" fill="url(#gold)" stroke="#694520" stroke-width="2.2"/>
""" +text(100,111,"PTS",18,fill=NAVY)
    if name=="rocket-richard.svg":
        return """<g transform="rotate(35 100 109)">
<path d="M100 67 Q127 81 121 117 L80 117 Q75 83 100 67 Z"
 fill="url(#gold)" stroke="#24394e" stroke-width="3"/>
<ellipse cx="100" cy="98" rx="11" ry="12" fill="#123b63" stroke="#ffffff" stroke-width="2.5"/>
<path d="M81 111 L68 131 L82 129 L90 115 M119 111 L132 131 L118 129 L110 115"
 fill="#a32142" stroke="#173650" stroke-width="2"/>
<path d="M87 118 L113 118 L100 146 Z" fill="#f8bb4c" stroke="#fadc91" stroke-width="3"/>
</g>"""
    if name=="hall-of-fame-inductee.svg":
        return """<path d="M75 73 L125 73 L133 105 L122 134 L100 143 L78 134 L67 105 Z"
fill="#173d63" stroke="#bd2745" stroke-width="5"/>""" +text(100,122,"HOF",39,fill="#fff",stroke="#061e35",sw=2) + WREATH
    if name in ("captain.svg","assistant-captain.svg"):
        glyph="C" if name=="captain.svg" else "A"
        return """<path d="M69 72 L100 63 L131 72 L125 131 L100 143 L75 131 Z"
fill="#f4faff" stroke="#a21f40" stroke-width="5"/>""" +text(100,131,glyph,70,fill=NAVY,stroke="#d4a055",sw=1.4) + WREATH
    if name=="discipline-record.svg":
        return """<rect x="72" y="65" width="56" height="81" rx="8"
fill="#f7fafc" stroke="#4c637b" stroke-width="4"/>
<path d="M82 78 H119 M82 89 H119 M82 100 H111"
stroke="#37506a" stroke-width="4" stroke-linecap="round"/>
<path d="M100 107 L118 140 H82 Z" fill="#d5dce3" stroke="#526e85" stroke-width="2.5"/>
<path d="M100 119 V130" stroke="#445a70" stroke-width="3"/>
<circle cx="100" cy="135" r="2" fill="#445a70"/>"""
    raise ValueError(name)

def draw(group,filename):
    if group=="clubs":
        m=re.match(r"club-(game|point|win)-(\d+)\.svg$",filename)
        if not m: raise ValueError(filename)
        kind,n=m.group(1),int(m.group(2))
        measure={"game":"GAMES","point":"POINTS","win":"WINS"}[kind]
        content=number_badge(n,measure)
    elif group=="special":
        if filename=="svhl-cup-champion.svg":
            content=mini_cup()+WREATH+ribbon("SVHL CUP")
        else:
            selected=filename=="all-star-selected.svg"
            content=star(selected)+WREATH+ribbon("ALL-STAR")
    elif group=="heritage":
        content=motif_heritage(filename)
        captions={
          "art-ross.svg":"ART ROSS", "rocket-richard.svg":"ROCKET RICHARD",
          "hall-of-fame-inductee.svg":"HALL OF FAME",
          "captain.svg":"CAPTAIN","assistant-captain.svg":"ASSISTANT",
          "discipline-record.svg":"DISCIPLINE"
        }
        content+=ribbon(captions[filename], filename=="discipline-record.svg")
    else:raise ValueError(group)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">'
            f'<title>Brave H.C. {filename.replace("-", " ").replace(".svg","")} icon</title>'
            + METAL + HEADER + content + '</svg>\n')

def build_group(group):
    folder=ART/group
    manifest_path=folder/"source-manifest.json"
    manifest=json.loads(manifest_path.read_text(encoding="utf-8"))
    if group=="clubs":
        # Future templates are available but never grant a new milestone automatically.
        existing={entry.get("file",Path(entry.get("path","")).name) for entry in manifest["assets"]}
        for typ,levels in (("game",(50,100,200,300,400,500,750,1000)),
                           ("point",(50,100,200,300,400,500,750,1000)),
                           ("win",(50,100,200,300,400,500))):
            for level in levels:
                filename=f"club-{typ}-{level}.svg"
                if filename not in existing:
                    manifest["assets"].append({"file":filename,
                        "path":"assets/clubs/"+filename,
                        "label":f"{level} {typ.title()} Club",
                        "sha256":"","bytes":0,"pixels":[200,200],
                        "status":"ART_TEMPLATE_ONLY_NOT_A_HISTORIC_AWARD"})
        manifest["availableThresholds"]={"game":[50,100,200,300,400,500,750,1000],
              "point":[50,100,200,300,400,500,750,1000],
              "win":[50,100,200,300,400,500]}
        manifest["policy"]="Only exact verified HTO source milestones qualify. No projection-based awards."
    for entry in manifest["assets"]:
        filename=entry.get("file",Path(entry.get("path","")).name)
        assert filename.endswith(".svg"),filename
        payload=draw(group,filename).encode("utf-8")
        (folder/filename).write_bytes(payload)
        entry["sha256"]=hashlib.sha256(payload).hexdigest()
        entry["bytes"]=len(payload)
        entry["pixels"]=[200,200]
    manifest["presentation"]="White-ground original-award-matched 200px shield illustrations, 58px desktop/48px mobile."
    manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"{group}: regenerated {len(manifest['assets'])} bright shields and updated hashes")

if __name__=="__main__":
    import sys
    for group in (sys.argv[1:] or ["clubs","special","heritage"]):
        build_group(group)
