"""Install approved Brave H.C. artwork from a downloaded ChatGPT release ZIP.

Only operates on the given, verified local user-supplied archive. No HTO writes,
no changes to production, no inference of recipient identity or award history.
"""
from pathlib import Path
import argparse,json,zipfile,hashlib,shutil,io
from PIL import Image
R=Path(__file__).resolve().parents[1]
DEST=R/"widgets/assets/approved"
EXPECTED={
 "hart_mvp","conn_smythe","james_norris","lady_byng","rookie_of_the_year",
 "most_improved","rolaids_relief","andrew_cristillo","art_ross","rocket_richard",
 "svhl_cup","hall_of_fame","all_star_nomination","all_star_selection",
 "captain","assistant_captain","discipline_record"}
def install(archive):
    assert archive.is_file(),f"Artwork ZIP not downloaded on BRUTTECH 1: {archive}"
    with zipfile.ZipFile(archive) as z:
        entries=z.namelist()
        prefix="BraveHC_Full_Approved_Icon_ReleaseCandidate_20261027/"
        name=prefix+"release_manifest.json"
        if name not in entries:raise ValueError("Wrong or incomplete approved artwork package")
        manifest=json.loads(z.read(name))
        assets=manifest["individual_assets"]
        slugs={a["slug"] for a in assets}
        if slugs!=EXPECTED or len(assets)!=len(EXPECTED):
            raise ValueError("Expected exactly 17 distinct approved icons")
        staged=[]
        for a in assets:
            slug=a["slug"];file=prefix+"icons/"+a["webp"]
            if file not in entries:raise FileNotFoundError(file)
            blob=z.read(file)
            if hashlib.sha256(blob).hexdigest()!=a["sha256"]:raise ValueError("Source hash mismatch: "+slug)
            with Image.open(io.BytesIO(blob)) as pic:
                if pic.size!=(200,200) or pic.format!="WEBP":raise ValueError("Wrong dimensions: "+slug)
            staged.append((slug,blob))
    DEST.mkdir(parents=True,exist_ok=True)
    records=[]
    for slug,blob in staged:
        p=DEST/(slug+".webp")
        p.write_bytes(blob)
        records.append({"slug":slug,"file":"assets/approved/"+p.name,"bytes":len(blob),
                        "sha256":hashlib.sha256(blob).hexdigest(),"source":"APPROVED_USER_ARTWORK_PACKAGE"})
    out={"schema":"brave-hc-approved-icon-art/v1",
          "status":"EXACT_VISUAL_CONCEPT_ART_IMPORTED_NOT_AN_AWARD_SOURCE",
          "sourceZipSha256":hashlib.sha256(archive.read_bytes()).hexdigest(),
          "sourceZipName":archive.name,"files":records,
          "suspensionPolicy":"Muted administrative record icon, not a medal or honour."}
    (DEST/"source-manifest.json").write_text(json.dumps(out,indent=2)+"\n",encoding="utf-8")
    print("APPROVED_ASSET_IMPORT_PASS",len(records),"assets",DEST)
if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--zip",type=Path,default=Path(r"D:\Downloads\BraveHC_Approved_Set_Neutral_Discipline_ReleaseCandidate_20261027.zip"))
    install(ap.parse_args().zip)
