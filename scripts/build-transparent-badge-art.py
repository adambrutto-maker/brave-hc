"""Deterministic transparent-art conversion of previously approved opaque WebPs.

Keeps original opaque sources in the repository, does not edit historical award
ledger or any original art. Exterior near-white connected to canvas boundary
becomes transparent; enclosed white trophy highlights and text remain opaque.
"""
from collections import deque
from hashlib import sha256
import json
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/"widgets/assets"
GROUPS=("approved","round-clubs")
SOURCES=ASSETS/"opaque-originals"

def rematte(original):
    im=original.convert("RGBA")
    w,h=im.size
    rgb=im.load()
    def white(x,y):
        r,g,b,_=rgb[x,y]
        return min(r,g,b)>=226 and max(r,g,b)-min(r,g,b)<=25
    outside=bytearray(w*h)
    q=deque()
    for x in range(w):
        for y in (0,h-1):
            i=y*w+x
            if not outside[i] and white(x,y):outside[i]=1;q.append((x,y))
    for y in range(h):
        for x in (0,w-1):
            i=y*w+x
            if not outside[i] and white(x,y):outside[i]=1;q.append((x,y))
    while q:
        x,y=q.popleft()
        for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            if 0<=nx<w and 0<=ny<h:
                i=ny*w+nx
                if not outside[i] and white(nx,ny):
                    outside[i]=1;q.append((nx,ny))
    out=Image.new("RGBA",(w,h))
    dst=out.load()
    for y in range(h):
        for x in range(w):
            r,g,b,_=rgb[x,y]
            if outside[y*w+x]:
                dst[x,y]=(0,0,0,0)
                continue
            # A subtle grayscale anti-aliased rim outside the crest is partly
            # white-backed; remove that white to prevent a light square/halo.
            touching=any(0<=nx<w and 0<=ny<h and outside[ny*w+nx]
                        for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)))
            neutral=max(r,g,b)-min(r,g,b)<23
            avg=(r+g+b)/3
            if touching and neutral and avg>=170:
                alpha=max(28,min(255,round(255*(255-avg)/85)))
                if alpha<255:
                    dest=tuple(max(0,min(255,round((v-255*(1-alpha/255))/(alpha/255))))
                               for v in (r,g,b))
                    dst[x,y]=(*dest,alpha)
                    continue
            dst[x,y]=(r,g,b,255)
    return out, sum(outside)

def run():
    report=[]
    for group in GROUPS:
        manifest=ASSETS/group/"source-manifest.json"
        data=json.loads(manifest.read_text(encoding="utf-8"))
        entries=data["files"] if group=="approved" else data["assets"]
        for item in entries:
            name=Path(item.get("file") or item.get("path")).name
            original=SOURCES/group/name
            target=ASSETS/group/name
            if not original.exists():
                # First-stage migration: source is the imported opaque approved image.
                original.parent.mkdir(parents=True,exist_ok=True)
                original.write_bytes(target.read_bytes())
            opaque=Image.open(original)
            assert opaque.size==(200,200),original
            exact_source=item.get("sourceWebpPath")
            if exact_source:
                # Individually approved whistle + referee-card artwork supersedes
                # the old monochrome notice. Never regenerate the rejected icon.
                supplied=ROOT/"widgets"/exact_source
                blob=supplied.read_bytes()
                assert sha256(blob).hexdigest()==item["sourceWebpSha256"],("Approval source changed",name)
                approved=ROOT/"widgets"/item["sourceArtPath"]
                assert sha256(approved.read_bytes()).hexdigest()==item["sourceArtSha256"]
                output=Image.open(supplied).convert("RGBA")
                assert output.size==(200,200)
                white_pixels=sum(a==0 for a in output.getchannel("A").getdata())
            else:
                output,white_pixels=rematte(opaque)
            # The approved All-Star source sheet contained a detached 1px
            # horizontal guide at y=7; this is not part of the star shield.
            if group=='approved' and name in ('all_star_nomination.webp','all_star_selection.webp'):
                pixels=output.load()
                for y in range(0,10):
                    for x in range(output.width):pixels[x,y]=(0,0,0,0)
            assert white_pixels>=600,("No exterior white to remove",group,name,white_pixels)
            assert output.getpixel((0,0))[3]==0
            assert output.getpixel((100,100))[3]>200,(group,name,"badge centre lost")
            if exact_source:
                target.write_bytes(blob)
            else:
                output.save(target,format="WEBP",lossless=True,method=6,exact=True)
            blob=target.read_bytes()
            item["sha256"]=sha256(blob).hexdigest()
            item["bytes"]=len(blob)
            item["background"]="TRANSPARENT_EXTERIOR_APPROVED_ART_PRESERVED"
            item["opaqueSourcePath"]="assets/opaque-originals/"+group+"/"+name
            item["opaqueSourceSha256"]=sha256(original.read_bytes()).hexdigest()
            report.append({"group":group,"name":name,"oldBytes":original.stat().st_size,
                           "newBytes":len(blob),"exteriorRemoved":white_pixels})
        manifest.write_text(json.dumps(data,indent=2)+"\n",encoding="utf-8")
    assert len(report)==39
    print(json.dumps({"status":"PASS","images":len(report),
                      "groups":{x:sum(i["group"]==x for i in report) for x in GROUPS},
                      "transparentExteriorPixels":sum(i["exteriorRemoved"] for i in report)},
                     indent=2))
if __name__=="__main__":run()
