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
MARK="ENG59_SCOPED_WEB_ASSET_PREVIEW_V1"
class PreviewHold(ValueError):pass
def need(ok,why):
 if not ok:raise PreviewHold("ENG59_SCOPED_PREVIEW_HOLD:"+why)
def digest(path):
 h=hashlib.sha256()
 with path.open("rb") as f:
  for block in iter(lambda:f.read(65536),b""):h.update(block)
 return h.hexdigest()
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
 included=sorted(p for p in paths if p=="index.html" or (
    p.startswith("widgets/") and Path(p).suffix.lower() in EXT))
 need("index.html" in included,"HOME_REDIRECT_NOT_IN_PACKAGE")
 pathsData={}
 for rel in included:
  f=(repo/rel).resolve()
  need(f.is_relative_to(repo) and f.is_file() and not f.is_symlink(),
       "WEB_ASSET_MISSING_OR_SYMLINK:"+rel)
  need(not re.search(r"(?i)(?:PRIVATE|secret|password|token|credential|\.pem$|\.key$)",rel),
       "PRIVATE_NAMED_WEB_ASSET:"+rel)
  pathsData[rel]={"sha256":digest(f),"bytes":f.stat().st_size}
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
    shutil.copyfile(src,dest)
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
