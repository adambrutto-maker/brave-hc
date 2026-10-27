"""Build the original Brave H.C.-branded scalable 50/100/200/300 club icons.
No source HTO records, existing award logos, widget markup or production files are modified.
"""
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[1]
svgDir=ROOT/"widgets/assets/clubs"
svgDir.mkdir(parents=True,exist_ok=True)
manifest={"schema":"brave-hc-club-milestone-art/v1","created":"2026-10-27",
          "scope":"Verified 50/100/200/300 game/point clubs and 50/100 goalie win clubs","assets":[]}
for typ,levels in [("game",[50,100,200,300]),("point",[50,100,200,300]),("win",[50,100])]:
 for count in levels:
    label=f"{count} {typ.title()} Club"
    noun={"game":"GAMES","point":"POINTS","win":"WINS"}[typ]
    kind={"game":"G","point":"P","win":"W"}[typ]
    font=69 if count<100 else 60
    svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
<title>Brave H.C. {label}</title>
<defs>
 <linearGradient id="badge" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#183d58"/><stop offset="1" stop-color="#061727"/></linearGradient>
 <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f7e1a0"/><stop offset=".54" stop-color="#bb8840"/><stop offset="1" stop-color="#f8e5ad"/></linearGradient>
</defs>
<circle cx="100" cy="100" r="96" fill="#071b2b" stroke="#8b172b" stroke-width="7"/>
<circle cx="100" cy="100" r="86" fill="url(#badge)" stroke="url(#gold)" stroke-width="5"/>
<path d="M40 63 L100 37 L160 63 L153 136 Q133 162 100 174 Q67 162 47 136 Z" fill="#102f49" stroke="#a07c4c" stroke-width="1.8"/>
<text x="100" y="60" fill="#f4deb1" font-size="13" font-family="Arial,sans-serif" font-weight="bold" letter-spacing="1.1" text-anchor="middle">BRAVE H.C.</text>
<path d="M38 73 H162" stroke="#ad203c" stroke-width="5"/>
<text x="100" y="128" text-anchor="middle" font-family="Arial,sans-serif" font-size="{font}" font-weight="900" fill="#ffffff">{count}</text>
<text x="100" y="146" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" letter-spacing="2.3" font-weight="bold" fill="#eecb79">{noun}</text>
<path d="M52 155 H148" stroke="#8b2336" stroke-width="3"/>
<text x="100" y="168" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" letter-spacing="3" font-weight="bold" fill="#f9ecce">CLUB</text>
<circle cx="30" cy="100" r="3.3" fill="#f2d58f"/><circle cx="170" cy="100" r="3.3" fill="#f2d58f"/>
</svg>
'''
    filename=f"club-{typ}-{count}.svg"
    blob=svg.encode("utf-8")
    (svgDir/filename).write_bytes(blob)
    manifest["assets"].append({"label":label,"path":"assets/clubs/"+filename,
                               "bytes":len(blob),"sha256":hashlib.sha256(blob).hexdigest()})
(svgDir/"source-manifest.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"clubIcons":len(manifest["assets"]),"assetsFolder":str(svgDir)}))
