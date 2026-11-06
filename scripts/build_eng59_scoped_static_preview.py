#!/usr/bin/env python3
"""Build a PRIVATE scoped GitHub Pages candidate, never deploy or authorize.

The existing site redirects index.html into widgets/analytics.html. Preserve
only these source-tracked web assets; exclude entire docs/, scripts/, archive/,
snapshots/, .github/, internal txt/md and private review packets.

A candidate is NOT independently privacy-approved; static JSON/web content
still requires separate content approval. No network or original writes.
"""
from __future__ import annotations
import argparse,hashlib,json,os,re,shutil,subprocess
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote

EXT={".html",".js",".css",".json",".png",".jpg",".jpeg",".webp",".svg",".gif",".ico"}
TEXT={".html",".js",".css",".json",".svg"}
MARK="ENG59_SCOPED_WEB_ASSET_PREVIEW_V1"
class PreviewHold(ValueError):pass
def need(ok,why):
 if not ok:raise PreviewHold("ENG59_SCOPED_PREVIEW_HOLD:"+why)
def digest(path):
 h=hashlib.sha256()
 with path.open("rb") as f:
  for block in iter(lambda:f.read(65536),b""):h.update(block)
 return h.hexdigest()
def canonical_source(path):
 """Use Git blob LF representation instead of checkout-specific CRLF text."""
 raw=Path(path).read_bytes()
 return raw.replace(b"\r\n",b"\n") if Path(path).suffix.lower() in TEXT else raw

def git_stage(repo):
 try:
  algo=subprocess.check_output(["git","-C",str(repo),"rev-parse",
    "--show-object-format"],text=True).strip()
  need(algo in ("sha1","sha256"),"GIT_OBJECT_HASH_FORMAT_UNSUPPORTED")
  raw=subprocess.check_output(["git","-C",str(repo),"ls-files","--stage","-z"])
 except (OSError,subprocess.CalledProcessError) as e:
  raise PreviewHold("GIT_INDEX_UNAVAILABLE") from e
 entries={}
 for item in raw.split(b"\0"):
  if not item:continue
  spec,name=item.split(b"\t",1)
  mode,oid,stage=spec.decode("ascii").split()
  if stage=="0":entries[name.decode("utf-8")]=(mode,oid)
 return algo,entries

def git_hash(data,algo):
 record=b"blob "+str(len(data)).encode("ascii")+b"\0"+data
 return hashlib.new(algo,record).hexdigest()

def verify_artwork_manifests(widgets,package_paths,manifest_overrides=None):
 """Cross-check approved artwork and retained non-runtime source-backup hashes.

 This does not accept artwork rights/ownership or change awards. It only
 proves declared assets are complete and source-hash-concordant in the
 candidate website package.
 """
 widgets=Path(widgets).resolve()
 kinds=("approved","awards","clubs","heritage","round-clubs","special","full-crest-clubs")
 discovered={p.split("/")[2] for p in package_paths if
  p.startswith("widgets/assets/") and p.endswith("/source-manifest.json")}
 need(discovered==set(kinds),"ARTWORK_FAMILY_MANIFEST_SET_DRIFT")
 count=0
 backupCount=0
 additionalProvenanceCount=0
 seen=set()
 backups=set()
 for kind in kinds:
  source=f"assets/{kind}/source-manifest.json"
  need("widgets/"+source in package_paths,
       "ARTWORK_SOURCE_MANIFEST_NOT_INCLUDED:"+kind)
  manifest_bytes=(manifest_overrides or {}).get(kind)
  if manifest_bytes is None:
   manifest_bytes=canonical_source(widgets/source)
  if isinstance(manifest_bytes,str):manifest_bytes=manifest_bytes.encode("utf8")
  doc=json.loads(manifest_bytes)
  if kind=="full-crest-clubs":
   need(doc.get("schema")=="brave-hc-full-crest-milestone-art/v2" and
    doc.get("sourceLogoPath")=="widgets/brave_hc_logo.png" and
    isinstance(doc.get("sourceLogoSha256"),str) and
    re.fullmatch("[a-f0-9]{64}",doc["sourceLogoSha256"]) and
    re.fullmatch("[a-f0-9]{64}",str(doc.get("original5000PixelLogoSha256",""))) and
    doc.get("approvedRoundClubSourceManifestSha256")==
      hashlib.sha256(canonical_source(widgets/"assets/round-clubs/source-manifest.json")).hexdigest() and
    doc.get("original22ApprovedClubAssetsUnchanged") is True and
    doc.get("legacyApprovedAssetCount")==22 and
    doc.get("newGoalAssistShutoutAssetCount")==7 and
    doc.get("earnedMilestoneEvents")==134 and
    doc.get("earnedRecipientEvents")==37,
    "NEW_FULL_CREST_MANIFEST_SOURCE_PROVENANCE_UNQUALIFIED")
   logo=widgets.parent/doc["sourceLogoPath"]
   need(doc["sourceLogoPath"] in package_paths and logo.is_file() and
    not logo.is_symlink() and
    hashlib.sha256(canonical_source(logo)).hexdigest()==doc["sourceLogoSha256"],
    "NEW_FULL_CREST_SOURCE_LOGO_SHA_MISMATCH")
  entries=doc.get("files") if kind=="approved" else doc.get("assets")
  need(isinstance(entries,list) and entries,
       "ARTWORK_SOURCE_MANIFEST_EMPTY:"+kind)
  if kind=="full-crest-clubs":
   need(len(entries)==29 and
      sum(e.get("sourceVerifiedInSnapshot") is True for e in entries)==17 and
      sum(e.get("sourceVerifiedInSnapshot") is False for e in entries)==12 and
      sum(bool(e.get("originalApprovedArtPath")) for e in entries)==22 and
      all(isinstance(e,dict) and
       e.get("metric") in ("GAMES","POINTS","WINS","GOALS","ASSISTS","SHUTOUTS") and
       e.get("tier") in ("bronze","silver","gold","platinum") and
       type(e.get("sourceVerifiedInSnapshot")) is bool and
       type(e.get("value")) is int and e.get("value")>0 and
       e.get("size")==[200,200] for e in entries),
      "NEW_FULL_CREST_BADGE_METADATA_UNQUALIFIED")
  for entry in entries:
   local=(entry.get("file") if kind=="approved" else entry.get("path")) or f"assets/{kind}/{entry.get('file','')}"
   need(local.startswith("assets/"+kind+"/") and
        ".." not in local.split("/") and "\\" not in local and
        not local.startswith("/") and
        ("widgets/"+local) in package_paths,
        "ARTWORK_ASSET_MISSING_OR_UNSAFE:"+kind)
   need(local not in seen,"DUPLICATE_ARTWORK_ASSET:"+local)
   seen.add(local)
   path=(widgets/local).resolve()
   need(path.is_relative_to(widgets) and path.is_file() and
        not path.is_symlink(),"ARTWORK_ASSET_FILE_UNQUALIFIED:"+local)
   data=canonical_source(path)
   if kind=="full-crest-clubs":
    need(path.suffix.lower()==".webp" and len(data)>=12 and
      data[:4]==b"RIFF" and data[8:12]==b"WEBP",
      "NEW_FULL_CREST_BADGE_WEBP_HEADER_INVALID")
    original=entry.get("originalApprovedArtPath")
    if original:
     need(original.startswith("assets/round-clubs/") and
       "widgets/"+original in package_paths and
       re.fullmatch("[a-f0-9]{64}",str(entry.get("originalApprovedArtSha256",""))) and
       hashlib.sha256(canonical_source(widgets/original)).hexdigest()==
          entry["originalApprovedArtSha256"],
       "FULL_CREST_ORIGINAL_APPROVED_ART_SOURCE_DRIFT")
    else:
     need(entry["metric"] in ("GOALS","ASSISTS","SHUTOUTS") and
       entry["sourceVerifiedInSnapshot"] is True,
       "FULL_CREST_NEW_GOAL_ASSIST_SHUTOUT_NOT_SOURCE_QUALIFIED")
   need(entry.get("bytes")==len(data) and
        re.fullmatch("[a-f0-9]{64}",str(entry.get("sha256",""))) and
        hashlib.sha256(data).hexdigest()==entry["sha256"],
        "ARTWORK_SOURCE_MANIFEST_HASH_OR_SIZE_CONFLICT:"+local)
   backup=entry.get("opaqueSourcePath")
   if backup is not None:
    need(isinstance(backup,str) and backup.startswith("assets/opaque-originals/")
     and ".." not in backup.split("/") and "\\" not in backup
     and ("widgets/"+backup) not in package_paths and backup not in backups,
     "OPAQUE_SOURCE_BACKUP_NOT_PRIVATE_OR_DUPLICATE:"+str(backup))
    backups.add(backup)
    backing=(widgets/backup).resolve()
    need(backing.is_relative_to(widgets) and backing.is_file() and
     not backing.is_symlink() and
     re.fullmatch("[a-f0-9]{64}",str(entry.get("opaqueSourceSha256",""))) and
     hashlib.sha256(canonical_source(backing)).hexdigest()==entry["opaqueSourceSha256"],
     "OPAQUE_BACKUP_SOURCE_HASH_CONFLICT:"+backup)
    backupCount+=1
   # Three approved discipline-art provenance files are not runtime imagery.
   # Verify their exact original bytes while keeping them off the web surface.
   for name,checksum in (("sourceArtPath","sourceArtSha256"),
       ("sourceWebpPath","sourceWebpSha256"),
       ("priorNeutralBackup","priorNeutralSha256")):
    artifact=entry.get(name)
    if artifact is None:continue
    need(isinstance(artifact,str) and
     artifact.startswith(("assets/approved-sources/","assets/approved-history/")) and
     ".." not in artifact.split("/") and "\\" not in artifact and
     artifact not in backups and ("widgets/"+artifact) not in package_paths,
     "ARTWORK_PROVENANCE_FILE_UNSAFE_OR_PUBLIC:"+str(artifact))
    backing=(widgets/artifact).resolve()
    need(backing.is_relative_to(widgets) and backing.is_file() and
     not backing.is_symlink() and
     re.fullmatch("[a-f0-9]{64}",str(entry.get(checksum,""))) and
     hashlib.sha256(canonical_source(backing)).hexdigest()==entry[checksum],
     "ARTWORK_PROVENANCE_HASH_CONFLICT:"+artifact)
    backups.add(artifact)
    additionalProvenanceCount+=1
   count+=1
 return {"manifestsVerified":len(kinds),"artworkAssetsVerified":count,
  "sourceBackupsVerifiedButNotPublished":backupCount,
  "additionalProvenanceAssetsVerifiedButNotPublished":additionalProvenanceCount}

def tracked(repo):
 return set(subprocess.check_output(["git","-C",str(repo),"ls-files","-z"]).decode("utf-8").rstrip("\0").split("\0"))
def head(repo):
 return subprocess.check_output(["git","-C",str(repo),"rev-parse","HEAD"],text=True).strip()
def index(repo,files=None):
 repo=Path(repo).resolve()
 paths=tracked(repo) if files is None else set(files)
 required={"index.html","widgets/analytics.html",
           "widgets/league-intelligence.html","widgets/division-fit-lab.html",
           "widgets/player-game-audit.html",
           "widgets/video-strength-evidence.js",
           "widgets/brave-historical-gameinfo-ids.json",
           "widgets/svhl-official-game-id-bridges.json",
           "widgets/svhl-gameinfo-hold-review.json"}
 need(required<=paths,"MANDATORY_WEB_ENTRYPOINT_OR_SOURCE_MISSING")
 source_only_prefixes=("widgets/assets/opaque-originals/",
   "widgets/assets/approved-sources/","widgets/assets/approved-history/")
 included=sorted(p for p in paths if p=="index.html" or (
    p.startswith("widgets/") and
    not p.startswith(source_only_prefixes) and
    Path(p).suffix.lower() in EXT))
 # Opaque originals are preserved in Git for provenance, but they are not
 # runtime website resources and must never be packaged in a public preview.
 for rel in included:
  if rel.endswith((".html",".js")):
   need(not any(prefix in canonical_source(repo/rel) for prefix in
     (b"opaque-originals",b"approved-sources/",b"approved-history/")),
    "BACKUP_ARTWORK_LINKED_FROM_PUBLIC_RUNTIME:"+rel)
 need("index.html" in included,"HOME_REDIRECT_NOT_IN_PACKAGE")
 pathsData={}
 algorithm,gitIndex=git_stage(repo)
 for rel in included:
  f=(repo/rel).resolve()
  need(f.is_relative_to(repo) and f.is_file() and not f.is_symlink(),
       "WEB_ASSET_MISSING_OR_SYMLINK:"+rel)
  need(not re.search(r"(?i)(?:PRIVATE|secret|password|token|credential|\.pem$|\.key$)",rel),
       "PRIVATE_NAMED_WEB_ASSET:"+rel)
  data=canonical_source(f)
  mode,gitOID=gitIndex.get(rel,(None,None))
  need(mode=="100644" or mode=="100755",
       "WEB_ASSET_NOT_REGULAR_SOURCE_FILE:"+rel)
  need(git_hash(data,algorithm)==gitOID,
       "WEB_SOURCE_DIFFERS_FROM_COMMITTED_GIT_BLOB:"+rel)
  pathsData[rel]={"sha256":hashlib.sha256(data).hexdigest(),
    "bytes":len(data),"gitBlob":gitOID}
 verify_artwork_manifests(repo/"widgets",set(included))
 return included,pathsData,paths

class References(HTMLParser):
 def __init__(self):super().__init__();self.urls=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  for field in ("href","src"):
   v=a.get(field)
   if v is not None:self.urls.append(v)

def validate_html(base,package_paths):
 """Check every relative page asset reference inside the public site package."""
 base=Path(base).resolve()
 counted=0
 for rel in sorted(package_paths):
  if not rel.endswith(".html"):continue
  parser=References();parser.feed((base/rel).read_text(encoding="utf-8-sig"))
  for url in parser.urls:
   x=urlsplit(url)
   if x.scheme or x.netloc or url.startswith(("#","mailto:","tel:","javascript:","data:")):continue
   if not x.path:continue
   need(not x.path.startswith("/") and "%" not in x.path and
        "\\" not in x.path,
        "UNSAFE_ABSOLUTE_OR_ENCODED_LOCAL_URL:"+rel)
   path=(base/rel).parent.joinpath(unquote(x.path)).resolve()
   need(path.is_relative_to(base) and path.exists() and path.is_file(),
        "MISSING_WEB_PAGE_DEPENDENCY:"+rel+":"+x.path)
   counted+=1
 return counted

def build(repo,output,check_only=False):
 repo=Path(repo).resolve();output=Path(output).resolve()
 need(not output.is_relative_to(repo) and not repo.is_relative_to(output),
      "PREVIEW_OUTPUT_CANNOT_BE_INSIDE_OR_ABOVE_REPO")
 need(not output.exists(),"CANDIDATE_ALREADY_EXISTS_NO_OVERWRITE")
 inc,sources,alltracked=index(repo)
 artwork=verify_artwork_manifests(repo/"widgets",set(inc))
 need(not any(p.startswith(("docs/","scripts/","archive/","snapshots/",".github/"))
    for p in inc),"NON_WEB_SOURCE_FILES_IN_PREVIEW")
 # Preflight all existing HTML links against exact selected source files
 references=validate_html(repo,set(inc))
 srcHash=head(repo)
 parent=output.parent
 need(parent.is_dir(),"OUTPUT_PARENT_MISSING")
 stage=parent/(output.name+".staging")
 need(not stage.exists(),"EXISTING_PREVIEW_STAGE_NO_OVERWRITE")
 if not check_only:
  stage.mkdir()
  try:
   for rel in inc:
    src=repo/rel;dest=stage/rel
    dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_bytes(canonical_source(src))
    need(digest(dest)==sources[rel]["sha256"],"COPY_SHA256_MISMATCH:"+rel)
   need(validate_html(stage,set(inc))==references,"COPIED_PACKAGE_HTML_REFERENCES_CHANGED")
   os.replace(stage,output)
  except Exception:
   # Never remove a pre-existing directory; this stage was created by us.
   shutil.rmtree(stage,ignore_errors=True)
   raise
 preview={
  "schema":MARK,
  "status":"PRIVATE_SCOPED_PREVIEW_VALIDATED_NOT_PRODUCTION_OR_PRIVACY_APPROVED",
  "sourceGitHead":srcHash,
  "rootPagesWorkflowChanged":False,
  "canonicalGitBlobBytes":True,
  "excludedNonRuntimeOpaqueBackups":len([x for x in alltracked if x.startswith("widgets/assets/opaque-originals/")]),
  "excludedApprovedSourceAndHistoryFiles":len([x for x in alltracked if x.startswith(("widgets/assets/approved-sources/","widgets/assets/approved-history/"))]),
  "artworkManifestCoverage":artwork,
  "previewFiles":len(inc),
  "previewBytes":sum(x["bytes"] for x in sources.values()),
  "validatedHTMLReferences":references,
  "onlyAllowedWebExtensions":True,
  "includedInternalDocsOrScripts":False,
  "includedUntrackedPrivateSource":False,
  "independentPrivacyApproval":False,
  "publicReleaseApproved":False,
  "productionDeploymentPerformed":False,
  "note":"The scope excludes existing docs/scripts and private-named assets. All static web-asset CONTENT still requires independent privacy/rights review.",
  "files":sources
 }
 return preview

def main():
 p=argparse.ArgumentParser()
 p.add_argument("--repo",type=Path,default=Path(__file__).resolve().parents[1])
 p.add_argument("--output",required=True,type=Path)
 p.add_argument("--receipt",type=Path)
 p.add_argument("--check-only",action="store_true")
 args=p.parse_args()
 result=build(args.repo,args.output,args.check_only)
 if args.receipt:
  need(not args.receipt.resolve().is_relative_to(args.repo.resolve()),
       "RECEIPT_MUST_STAY_OUTSIDE_PUBLIC_REPOSITORY")
  args.receipt.write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
 print(json.dumps({k:result[k] for k in (
  "status","sourceGitHead","previewFiles","previewBytes",
  "validatedHTMLReferences","publicReleaseApproved")}))
if __name__=="__main__":main()
