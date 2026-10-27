"""Build accessible, original Brave H.C. heritage award / legacy badge artwork.
Six deterministic SVG files, preserving pre-existing award, club and special artwork.
No HTO source record changes, no NHL award-logo copying, no vote/induction conflation.
"""
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"widgets/assets/heritage"
OUT.mkdir(parents=True,exist_ok=True)
BASE='''<defs>
<linearGradient id="navy" x1="0" y1="0" x2="1" y2="1">
<stop stop-color="#1b4466"/><stop offset=".6" stop-color="#09233e"/><stop offset="1" stop-color="#05152a"/></linearGradient>
<linearGradient id="gold" x1="0" x2=".8" y1="0" y2="1"><stop stop-color="#fff1b5"/><stop offset=".45" stop-color="#d09d51"/><stop offset="1" stop-color="#785328"/></linearGradient>
<linearGradient id="steel" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#6c8296"/><stop offset=".35" stop-color="#f0f9ff"/><stop offset=".65" stop-color="#a1b6c8"/><stop offset="1" stop-color="#fff"/></linearGradient>
</defs>'''
def frame(major,minor="",neutral=False):
 if neutral:
  ring="#8496a4";ribbon="#33485a";small="#aebfcd"
 else:
  ring="#dfad61";ribbon="#97223b";small="#f9d991"
 top=f'<text x="100" y="35" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="900" letter-spacing="1.7" fill="{small}">BRAVE H.C.</text>'
 footer=f'''<path d="M29 150 L171 150 L160 175 L40 175 Z" fill="{ribbon}" stroke="{ring}" stroke-width="3.2"/>
<text x="100" y="167" font-family="Arial,sans-serif" font-size="{16 if len(major)<11 else 13}" font-weight="900" letter-spacing=".5" text-anchor="middle" fill="#ffffff">{major}</text>
<text x="100" y="190" font-family="Arial,sans-serif" font-size="10" font-weight="800" letter-spacing="1.2" text-anchor="middle" fill="{small}">{minor}</text>'''
 outer=f'''<circle cx="100" cy="100" r="95" fill="#061929" stroke="{ring}" stroke-width="7"/>
<circle cx="100" cy="100" r="85" fill="url(#navy)" stroke="{("#567188" if neutral else "#a92d43")}" stroke-width="3.5"/>'''
 return outer+top,footer
def laurel():
 return '''<g fill="none" stroke="url(#gold)" stroke-width="3">
<path d="M45 133 Q23 101 48 66"/><path d="M155 133 Q177 101 152 66"/></g>
<g fill="url(#gold)">
<ellipse cx="43" cy="78" rx="6" ry="14" transform="rotate(-28 43 78)"/>
<ellipse cx="35" cy="99" rx="6" ry="14" transform="rotate(-15 35 99)"/>
<ellipse cx="42" cy="118" rx="6" ry="12" transform="rotate(26 42 118)"/>
<ellipse cx="157" cy="78" rx="6" ry="14" transform="rotate(28 157 78)"/>
<ellipse cx="165" cy="99" rx="6" ry="14" transform="rotate(15 165 99)"/>
<ellipse cx="158" cy="118" rx="6" ry="12" transform="rotate(-26 158 118)"/></g>'''
ART_ROSS=laurel()+'''<path d="M72 79 L82 69 L93 82 L100 60 L109 82 L120 69 L130 79 L125 101 L75 101 Z" fill="url(#gold)" stroke="#fff0c1" stroke-width="2.1"/>
<rect x="77" y="102" width="46" height="7" rx="3" fill="url(#gold)" stroke="#755332" stroke-width="1.2"/>
<ellipse cx="100" cy="126" rx="24" ry="10" fill="#192733" stroke="url(#steel)" stroke-width="3"/>
<path d="M76 126 L76 137 Q100 144 124 137 L124 126" fill="#1c2b3a" stroke="url(#steel)" stroke-width="3"/>
<text x="100" y="133" text-anchor="middle" font-family="Arial" font-size="11" font-weight="900" fill="#ffffff">PTS</text>'''
ROCKET='''<g transform="translate(0,-2)"><path d="M105 54 Q137 71 139 91 Q129 106 115 119 L92 105 Q87 85 105 54 Z" fill="url(#steel)" stroke="#34465c" stroke-width="2.7"/>
<path d="M104 54 Q109 73 101 92 L93 105" fill="none" stroke="#ffffff" stroke-width="3" opacity=".7"/>
<ellipse cx="117" cy="87" rx="8.5" ry="9" fill="#122f4a" stroke="#cf9d56" stroke-width="2.5"/>
<path d="M94 103 L80 113 L89 126 L102 115 Z M113 119 L108 135 L119 130 L126 107 Z" fill="#b32d48" stroke="#f5d7aa" stroke-width="1.7"/>
<path d="M81 116 Q60 126 63 142 Q82 141 93 124" fill="#e6a543" stroke="#ffdc8e" stroke-width="2"/>
<path d="M80 124 Q72 130 76 137 L86 127" fill="#fff3bf"/>
<path d="M70 84 L49 84 M65 96 L43 96 M65 108 L51 108" stroke="#e0b463" stroke-width="3.5" stroke-linecap="round"/></g>'''
HALL=laurel()+'''<path d="M68 69 Q100 54 132 69 L130 117 Q100 140 70 117 Z" fill="#143550" stroke="url(#gold)" stroke-width="3"/>
<path d="M76 83 L124 83 M76 89 L124 89" stroke="#d7b06c" stroke-width="2"/>
<path d="M81 95 L92 95 L100 110 L108 95 L119 95 L119 118 L81 118 Z" fill="url(#gold)" stroke="#fdf0c2" stroke-width="1.2"/>
<text x="100" y="130" font-family="Arial" font-size="9" font-weight="900" letter-spacing="1" fill="#f5dba5" text-anchor="middle">INDUCTED</text>'''
CAPTAIN='''<path d="M60 67 L100 52 L140 67 L135 129 L100 146 L65 129 Z" fill="#163a57" stroke="url(#gold)" stroke-width="4"/>
<path d="M70 76 L130 76 M72 125 L128 125" stroke="#af1d39" stroke-width="6"/>
<text x="100" y="122" font-family="Arial Black,Arial,sans-serif" font-size="74" font-weight="900" fill="url(#steel)" stroke="#102438" stroke-width="1.2" text-anchor="middle">C</text>'''
ASSISTANT='''<path d="M60 67 L100 52 L140 67 L135 129 L100 146 L65 129 Z" fill="#163a57" stroke="url(#steel)" stroke-width="4"/>
<path d="M70 76 L130 76 M72 125 L128 125" stroke="#af1d39" stroke-width="6"/>
<text x="100" y="122" font-family="Arial Black,Arial,sans-serif" font-size="74" font-weight="900" fill="url(#steel)" stroke="#102438" stroke-width="1.2" text-anchor="middle">A</text>'''
DISCIPLINE='''<rect x="66" y="57" width="68" height="85" rx="7" fill="#22394c" stroke="#b7c3cf" stroke-width="3"/>
<path d="M79 68 H121 M79 76 H120 M79 85 H110" stroke="#9eafbd" stroke-width="3" stroke-linecap="round"/>
<path d="M100 92 L126 133 H74 Z" fill="#aab9c7" stroke="#354b5e" stroke-width="2"/>
<path d="M100 106 V118" stroke="#293c4d" stroke-width="4" stroke-linecap="round"/>
<circle cx="100" cy="125" r="2.5" fill="#293c4d"/>'''
BADGES=[
("art-ross.svg","Art Ross Award","ART ROSS","POINT LEADER",ART_ROSS,False),
("rocket-richard.svg","Rocket Richard Award","ROCKET RICHARD","GOAL LEADER",ROCKET,False),
("hall-of-fame-inductee.svg","Hall of Fame Inductee","HALL OF FAME","INDUCTED",HALL,False),
("captain.svg","Elected Team Captain","CAPTAIN","TEAM LEADERSHIP",CAPTAIN,False),
("assistant-captain.svg","Elected Assistant Captain","ASST. CAPTAIN","TEAM LEADERSHIP",ASSISTANT,False),
("discipline-record.svg","Disciplinary Record","DISCIPLINE","HISTORICAL RECORD",DISCIPLINE,True)]
manifest={"schema":"brave-hc-heritage-icons/v1","basis":"Verified native HTO player Highlights, not inferred statistics or future predictions",
"policy":{"artRoss":"Original Brave H.C. design; do not imitate unowned awards marks",
"rocketRichard":"Original Brave H.C. design; do not copy NHL trophy logo",
"hallOfFame":"Only explicitly inducted people, not candidates or the legacy VOTE artwork",
"leadership":"Only previously published HTO elected captain/assistant-captain titles",
"discipline":"Restrained neutral caution-record symbol; no celebration of penalties"},
"assets":[]}
for filename,name,major,minor,motif,neutral in BADGES:
 head,foot=frame(major,minor,neutral)
 graphic=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><title>Brave H.C. {name}</title>{BASE}{head}{motif}{foot}</svg>\n'
 b=graphic.encode("utf-8");(OUT/filename).write_bytes(b)
 manifest["assets"].append({"file":filename,"label":name,"sha256":hashlib.sha256(b).hexdigest(),"bytes":len(b),"pixels":[200,200]})
(OUT/"source-manifest.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"created":len(BADGES),"manifest":str(OUT/"source-manifest.json")}))
