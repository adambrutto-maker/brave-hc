"""Build custom championship and All-Star SVG artwork based on Brave H.C. visual identity.
The physical cup shape is referenced to the team's HTO 2016 championship photographs;
a miniature Stanley Cup-style silhouette without NHL marks. Reproducible with no external assets.
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
CUP='''<!-- Strong miniature Stanley Cup profile, matching the Braves' actual tiered SVHL trophy. -->
<ellipse cx="100" cy="99" rx="45" ry="54" fill="#010b1a" opacity=".35"/>
<!-- Bowl has a broad flared silver rim and a real concave interior. -->
<path d="M55 48 Q57 69 76 78 Q84 82 93 84 L107 84 Q116 82 124 78 Q143 69 145 48 Z" fill="url(#silver)" stroke="#304459" stroke-width="2.1" stroke-linejoin="round"/>
<path d="M61 53 Q66 71 83 76 L117 76 Q134 71 139 53" fill="none" stroke="#faffff" stroke-width="2.2" opacity=".9"/>
<path d="M67 59 Q81 71 93 74 M133 59 Q119 71 107 74" fill="none" stroke="#627688" stroke-width="1.8" opacity=".75"/>
<path d="M74 68 L85 75 M82 70 L92 77 M126 68 L115 75 M118 70 L108 77" stroke="#61788b" stroke-width="1.2" opacity=".72"/>
<ellipse cx="100" cy="49" rx="47" ry="7.5" fill="url(#silver)" stroke="#2c4259" stroke-width="2"/>
<ellipse cx="100" cy="48.5" rx="39" ry="4.3" fill="#657d93" stroke="#eefaff" stroke-width="1.1"/>
<ellipse cx="100" cy="49.3" rx="34" ry="2.2" fill="#11293f" opacity=".8"/>
<path d="M60 46 Q100 38 140 46" fill="none" stroke="#ffffff" stroke-width="1.8" opacity=".85"/>
<!-- Stem and upper trophy collar. -->
<path d="M92 81 L108 81 L110 91 L90 91 Z" fill="url(#silver)" stroke="#38495b" stroke-width="1.5"/>
<ellipse cx="100" cy="84" rx="12" ry="2.4" fill="#f4faff" stroke="#354a5c" stroke-width="1.3"/>
<path d="M86 88 Q85 84 90 83 L110 83 Q115 84 114 88 L117 93 L83 93 Z" fill="url(#silver)" stroke="#334c62" stroke-width="1.7"/>
<ellipse cx="100" cy="93" rx="18" ry="3.3" fill="#d4e2ec" stroke="#385167" stroke-width="1.2"/>
<!-- Three stepped, raised upper collar sections. -->
<path d="M83 94 L117 94 L121 104 L79 104 Z" fill="url(#silver)" stroke="#394f63" stroke-width="1.7"/>
<ellipse cx="100" cy="95" rx="20" ry="3" fill="#eff7fa" stroke="#42566b" stroke-width="1.1"/>
<path d="M78 103 L122 103 L128 113 L72 113 Z" fill="url(#silver)" stroke="#405163" stroke-width="1.8"/>
<ellipse cx="100" cy="105" rx="26" ry="3" fill="#d7e5ed" stroke="#3a556a" stroke-width="1.2"/>
<path d="M71 112 L129 112 L136 120 L64 120 Z" fill="url(#silver)" stroke="#364e66" stroke-width="1.8"/>
<ellipse cx="100" cy="114" rx="32" ry="2.6" fill="#edf7ff" stroke="#394f60" stroke-width="1.1"/>
<!-- Distinct broad lower engraved tiers and curved horizontal silver ribs. -->
<path d="M65 119 L135 119 L137 127 L63 127 Z" fill="url(#silver)" stroke="#35495b" stroke-width="1.5"/>
<path d="M63 127 L137 127 L139 135 L61 135 Z" fill="url(#silver)" stroke="#35495b" stroke-width="1.5"/>
<path d="M61 135 L139 135 L140 144 L60 144 Z" fill="url(#silver)" stroke="#35495b" stroke-width="1.5"/>
<path d="M60 144 L140 144 L137 150 L63 150 Z" fill="url(#silver)" stroke="#2f4356" stroke-width="1.9"/>
<path d="M67 122 Q100 125 133 122 M65 130 Q100 133 135 130 M63 138 Q100 141 137 138 M65 147 Q100 149 135 147" fill="none" stroke="#f8ffff" stroke-width="1.6" opacity=".92"/>
<!-- Fine engraved columns, metallic glints and faceted reflection. -->
<path d="M73 119 L72 143 M79 119 L78 144 M87 119 L86 146 M113 119 L114 146 M121 119 L122 144 M127 119 L128 143" stroke="#566d84" stroke-width=".8" opacity=".78"/>
<path d="M77 99 L75 113 L69 143 M87 95 L85 111 L79 147" stroke="#ffffff" stroke-width="1.9" opacity=".55" fill="none"/>
<path d="M117 99 L125 116 L131 144" stroke="#445a6c" stroke-width="2" opacity=".6" fill="none"/>
<path d="M104 119 L108 145" stroke="#ffffff" stroke-width="2.1" opacity=".6"/>
<path d="M94 120 L95 143" stroke="#576b7d" stroke-width="1.2" opacity=".6"/>
<!-- Thin mirrored horizontal metal caps provide clear geometry at 58px. -->
<path d="M64 120 H136 M62 128 H138 M60 136 H140 M60 144 H140" stroke="#30485a" stroke-width="1.4"/>
<path d="M68 121 H132 M65 129 H135 M63 137 H137 M63 145 H137" stroke="#f7ffff" stroke-width="1" opacity=".85"/>
<!-- Championship banner remains clear at the embedded mobile icon size. -->
<path d="M46 149 L154 149 L148 174 L52 174 Z" fill="#941c35" stroke="#f0c276" stroke-width="3"/>
<path d="M51 151 L149 151" stroke="#faeac4" stroke-width="1.2" opacity=".85"/>
<text x="100" y="166" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" font-weight="900" letter-spacing=".6" fill="#fff">SVHL CUP</text>
<text x="100" y="186" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" font-weight="900" letter-spacing="1.4" fill="#f9df98">CHAMPION</text>'''
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
"sourcePolicy":"Detailed silver miniature Stanley Cup-style shape and engraved lower tiers follow the SVHL cup visible in historic HTO team photos; not a photo crop, NHL logo, or claim of NHL affiliation.",
"assets":[]}
for filename,title,art in assets:
 b=svg(title,art).encode("utf-8");(DEST/filename).write_bytes(b)
 manifest["assets"].append({"file":filename,"label":title,"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest()})
(DEST/"source-manifest.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"assets":len(assets),"folder":str(DEST)}))
