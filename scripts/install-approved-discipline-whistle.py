"""One-time explicit approval import: whistle and referee cards suspension graphic.

Replaces only the visual asset discipline_record.webp. Historical records remain
immutable. Original neutral icon saved for rollback, and full approved source
PNG/WebP preserved with SHA-256 identities for future regeneration.
"""
from pathlib import Path
from hashlib import sha256
from PIL import Image
import io, json, zipfile

ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/"widgets"/"assets"
SRCZIP=Path(r"G:\My Drive\BraveHC_Discipline_Whistle_RedCard_Approved_20261027.zip")
ZIP_SHA="d42d8938eb2164ea9086bd29efa5d4e8bdccbbcc29b6c97c09fd3aea935f3522"
WIDGET_SHA="505420c0403ea6645d579747a33beddcdb68e29cd92fdf901f53faf815c4d9c4"
MANIFEST=ASSETS/"approved"/"source-manifest.json"

def hexhash(data):
    return sha256(data).hexdigest()

def install(archive=SRCZIP):
    assert archive.is_file(),("Missing explicit user-approved image package",str(archive))
    assert hexhash(archive.read_bytes())==ZIP_SHA,"Approved art ZIP changed"
    with zipfile.ZipFile(archive) as z:
        m=json.loads(z.read("release_manifest.json"))
        art=z.read("discipline_record.webp")
        src=z.read("discipline_record_approved_source.png")
        preview=z.read("discipline_navy_widget_preview.png")
    assert m["status"]=="USER_APPROVED" and m["assetSha256"]==WIDGET_SHA
    assert hexhash(art)==WIDGET_SHA and hexhash(src)==m["croppedSourceSha256"]
    with Image.open(io.BytesIO(art)) as image:
        assert image.format=="WEBP" and image.size==(200,200) and image.mode=="RGBA"
        assert image.getpixel((0,0))[3]==0
        assert image.getpixel((100,100))[3]>200
    with Image.open(io.BytesIO(src)) as image:
        assert image.size==(1171,1171) and image.mode=="RGBA"
    assets=ASSETS/"approved"
    old=assets/"discipline_record.webp"
    backup=ASSETS/"approved-history"/"discipline_record_neutral_20261027.webp"
    backup.parent.mkdir(parents=True,exist_ok=True)
    if not backup.is_file():
        backup.write_bytes(old.read_bytes())
    assert backup.read_bytes()!=art,"New badge must differ from old neutral notice"
    master=ASSETS/"approved-sources"/"discipline_record_whistle_redcard_200.webp"
    original=ASSETS/"approved-sources"/"discipline_record_whistle_redcard_master.png"
    master.parent.mkdir(parents=True,exist_ok=True)
    master.write_bytes(art)
    original.write_bytes(src)
    preview_out=ROOT/"docs"/"261028_Approved_Discipline_Whistle_Cards_Navy_Preview.png"
    preview_out.write_bytes(preview)
    old.write_bytes(art)
    doc=json.loads(MANIFEST.read_text(encoding="utf-8"))
    found=[x for x in doc["files"] if x["slug"]=="discipline_record"]
    assert len(found)==1
    entry=found[0]
    # Other 16 artworks and their verified SHA values remain unchanged.
    entry["source"]="USER_APPROVED_WHISTLE_AND_RED_YELLOW_CARDS"
    entry["sha256"]=hexhash(art)
    entry["bytes"]=len(art)
    entry["background"]="TRANSPARENT_EXTERIOR_APPROVED_ART_PRESERVED"
    entry["sourceArtPath"]="assets/approved-sources/"+original.name
    entry["sourceArtSha256"]=hexhash(src)
    entry["sourceWebpPath"]="assets/approved-sources/"+master.name
    entry["sourceWebpSha256"]=hexhash(art)
    entry["priorNeutralBackup"]="assets/approved-history/"+backup.name
    entry["priorNeutralSha256"]=hexhash(backup.read_bytes())
    entry["approval"]="USER_APPROVED_2026-10-27_WHISTLE_RED_AND_YELLOW_CARDS"
    doc["suspensionPolicy"]="Neutral disciplinary record, not an award: whistle and referee cards, no crown, laurels or trophies."
    MANIFEST.write_text(json.dumps(doc,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"status":"APPROVED_ARTWORK_LOCKED","slug":entry["slug"],
      "sourceSha256":entry["sourceArtSha256"],"widgetSha256":entry["sha256"],
      "originalBackupSha256":entry["priorNeutralSha256"],
      "sourceRetained":True,"recordsMutated":0},indent=2))
if __name__=="__main__":install()
