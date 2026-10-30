#!/usr/bin/env python3
"""ENG59 GitHub Pages release-surface *preflight*, never a deploy approval.

Pages workflow uploads repository root. Check exact source-only candidate
assets, all relative HTML files on the three affected pages, required local
runtime fetches, source-only JSON schemas and no private review files in
tracked release content. This does not attest that a human has reviewed it.
"""
from __future__ import annotations
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
import argparse,hashlib,json,re,subprocess

class ReleaseSurfaceHold(ValueError):pass
def need(ok,why):
 if not ok:raise ReleaseSurfaceHold("ENG59_PAGES_SOURCE_SURFACE_HOLD:"+why)

PAGES=(
 "division-fit-lab.html",
 "league-intelligence.html",
 "player-game-audit.html",
)
SCRIPTS={
 "division-fit-lab.html":("video-strength-evidence.js","division-fit-lab.js"),
 "league-intelligence.html":("league-intelligence.js",),
 "player-game-audit.html":("player-game-audit.js",)
}
SOURCE_JSON={
 "svhl-official-game-id-bridges.json":
 ("brave-hc-svhl-current-official-game-id-bridge/v1",
 "OFFICIAL_GAMEINFO_IDENTITY_MATCHED_NO_RATING_OR_STATS_WRITE"),
 "brave-historical-gameinfo-ids.json":
 ("brave-hc-historical-source-matched-gameinfo-ids/v1",
 "HISTORICAL_EXACT_GAMEINFO_IDS_SOURCE_QUALIFIED_PLAYER_STATS_HELD_SEPARATELY"),
 "svhl-gameinfo-hold-review.json":
 ("brave-hc-svhl-gameinfo-raw-source-holds-review/v1",
 "SOURCE_HASH_VERIFIED_AUTHOR_AUDIT_NOT_INDEPENDENTLY_ACCEPTED"),
}
REQUIRED_FETCH={
 "division-fit-lab.js":"svhl-official-game-id-bridges.json",
 "league-intelligence.js":"brave-historical-gameinfo-ids.json",
 "player-game-audit.js":"svhl-gameinfo-hold-review.json",
}
PRIVATE_PATTERNS=(
 re.compile(r"(^|/)(?:\.env(?:[./]|$)|id_rsa|private[-_]key|credentials?\.json$)",re.I),
 re.compile(r"(?i)(?:^|/)(?:[^/]*PRIVATE\.(?:json|csv|md)|.*\.b64$|.*\.(?:pfx|pem|key|bak)$)"),
)
class Links(HTMLParser):
 def __init__(self):
  super().__init__();self.refs=[];self.script_sources=[]
 def handle_starttag(self,tag,attrs):
  attrs=dict(attrs)
  for field in ("href","src"):
   v=attrs.get(field)
   if not v:continue
   # only relative explicit paths; remote routes are not local assets.
   if v.startswith("./") or v.startswith("../"):
    self.refs.append(v)
   if tag=="script" and field=="src":self.script_sources.append(v)

def safe_path(widgets,link):
 path=urlsplit(link).path
 need(not path.startswith("../") and path.startswith("./") and
   ".." not in path.split("/") and
   "\\" not in path and "%" not in path,
   "RELATIVE_ASSET_PATH_NOT_SAFE")
 target=(widgets/path[2:]).resolve()
 need(target.is_relative_to(widgets.resolve()) and target.is_file(),
   "LOCAL_RELEASE_ASSET_NOT_AVAILABLE:"+link)
 return target

def sha256(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def check(repo,tracked=None):
 repo=Path(repo).resolve()
 widgets=repo/"widgets"
 need(widgets.is_dir(),"WIDGETS_ROOT_MISSING")
 pages=repo/".github"/"workflows"/"pages.yml"
 need(pages.is_file(),"PAGES_WORKFLOW_MISSING")
 workflow=pages.read_text(encoding="utf-8")
 need("branches: [\"main\"]" in workflow and
   "path: '.'" in workflow and
   "actions/upload-pages-artifact@" in workflow and
   "actions/deploy-pages@" in workflow,
   "PAGES_PUBLICATION_PATH_OR_TRIGGER_CHANGED")
 if tracked is None:
  try:tracked=set(subprocess.check_output(
      ["git","-C",str(repo),"ls-files"],text=True).splitlines())
  except (OSError,subprocess.CalledProcessError) as e:
   raise ReleaseSurfaceHold("NO_GIT_SOURCE_TREE") from e
 else:tracked=set(tracked)
 need(all(path not in tracked for path in (
   "widgets/ENG59_Private_Source_Owner_Cases.json",
   "widgets/261027_ENG59_Raw98_Disposition_PRIVATE.json")),
   "KNOWN_PRIVATE_REVIEW_ASSET_TRACKED")
 bad=[p for p in tracked if any(rx.search(p) for rx in PRIVATE_PATTERNS)]
 need(not bad,"PRIVATE_EVIDENCE_OR_CREDENTIAL_FILE_TRACKED:"+",".join(bad[:4]))
 # Pages uploads the full repository root: pre-existing filenames containing
 # private-related words must remain explicitly flagged for separate review.
 preexistingPrivateNamed=sorted(p for p in tracked if re.search("private",p,re.I))
 page_checks={}
 assets=set()
 for name in PAGES:
  page=widgets/name
  need(page.is_file() and f"widgets/{name}" in tracked,"PAGE_NOT_IN_PUBLISH_TREE")
  html=page.read_text(encoding="utf-8")
  parser=Links();parser.feed(html)
  resolved=[safe_path(widgets,ref) for ref in parser.refs]
  required=SCRIPTS[name]
  for item in required:
   need(any(urlsplit(s).path=="./"+item for s in parser.script_sources),
     "RUNTIME_SCRIPT_NOT_LOADED:"+name+":"+item)
  page_checks[name]={"localLinks":len(resolved),
      "runtimeDependencies":list(required)}
  assets.update(resolved);assets.add(page)
 for js,source in REQUIRED_FETCH.items():
  js_path=widgets/js
  need(js_path.is_file() and f"widgets/{js}" in tracked,
    "RUNTIME_FETCH_SCRIPT_MISSING")
  code=js_path.read_text(encoding="utf-8")
  need(('fetch("./'+source+'"') in code,
    "RUNTIME_LOCAL_EVIDENCE_FETCH_NOT_DECLARED:"+js)
  asset=widgets/source
  need(asset.is_file() and f"widgets/{source}" in tracked,
    "SOURCE_JSON_NOT_TRACKED_FOR_GITHUB_PAGES:"+source)
  data=json.loads(asset.read_text(encoding="utf-8"))
  expected=SOURCE_JSON[source]
  need((data.get("schema"),data.get("status"))==expected,
    "SOURCE_JSON_SCHEMA_OR_ACCEPTANCE_SCOPE_CHANGED:"+source)
  need(not data.get("independentAcceptedForHistoricalPlayerCorrections",False)
     and not data.get("independentScorerCorrectionsAccepted",False)
     and data.get("publicStatsOrScoresChanged") is not True
     and data.get("videoStrengthCalibrated") is not True,
     "UNACCEPTED_OFFICIAL_CORRECTION_IN_SOURCE_JSON:"+source)
  assets.update((js_path,asset))
 tracked_assets={str(p.relative_to(repo)).replace("\\","/") for p in assets}
 missing=sorted(tracked_assets-tracked)
 need(not missing,"RUNTIME_ASSET_UNTRACKED_IN_GITHUB_PAGES:"+str(missing))
 need((widgets/"brave-historical-gameinfo-ids.json").is_file() and
  (widgets/"svhl-official-game-id-bridges.json").is_file(),
  "EXACT_GAME_IDENTITY_BRIDGES_MISSING")
 return {
  "schema":"ENG59_STATIC_PAGES_REVIEW_SURFACE_V1",
  "status":"STATIC_RELEASE_ASSETS_AND_PRIVATE_EXCLUSIONS_VERIFIED_REVIEW_ONLY",
  "pagesWorkflowSource":"PAGES_FROM_MAIN_ROOT_ONLY",
  "scopedHTMLPages":len(PAGES),"scopedTrackedFiles":len(tracked),
  "checkedLocalAssetLinks":sum(p["localLinks"] for p in page_checks.values()),
  "sourceOnlyEvidenceFeeds":len(REQUIRED_FETCH),
  "runtimeAssetSHA256":{str(p.relative_to(repo)).replace("\\","/"):sha256(p)
    for p in sorted(assets)},
  "pageChecks":page_checks,
  "eng59PrivateReviewPacketsTracked":False,
  "preexistingPrivateNamedPathsRequiringHumanReview":preexistingPrivateNamed,
  "independentPrivacyReviewSigned":False,
  "independentReviewSigned":False,
  "automaticProductionDeploymentAuthorized":False,
  "warning":"Root-path Pages deployment already contains private-named code/docs; static dependency review only, not independent privacy assessment or full site security audit."
 }

def main():
 p=argparse.ArgumentParser()
 p.add_argument("--repo",type=Path,default=Path(__file__).resolve().parents[1])
 p.add_argument("--report",type=Path)
 a=p.parse_args()
 result=check(a.repo)
 if a.report:
  need(not a.report.resolve().is_relative_to((a.repo/"widgets").resolve()),
   "REVIEW_RECEIPT_CANNOT_ENTER_PUBLIC_WIDGET_DIRECTORY")
  a.report.parent.mkdir(parents=True,exist_ok=True)
  a.report.write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
 print(json.dumps({k:result[k] for k in
   ("status","scopedHTMLPages","checkedLocalAssetLinks",
    "sourceOnlyEvidenceFeeds","eng59PrivateReviewPacketsTracked",
    "automaticProductionDeploymentAuthorized")}))
if __name__=="__main__":main()
