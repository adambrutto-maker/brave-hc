#!/usr/bin/env python3
"""ENG59 reviewer inventory of pre-existing private-named GitHub Pages paths.

Read-only developer classification, NOT independent privacy approval. Never
emits source-text snippets, credential values or file contents. GitHub Pages
publishes the repository root (including pre-existing source files).
"""
from pathlib import Path
import argparse,hashlib,json,re,subprocess
from check_eng59_static_release_surface import check,ReleaseSurfaceHold

EXPECTED={
 "docs/261022_Plan03_497_Cell_Integrated_Private_Workbook_Review.md":
    "PRIVATE_WORKBOOK_REVIEW_NARRATIVE",
 "scripts/build_private_online_opponent_ledger.py":
    "PRIVATE_WORKFLOW_SOURCE_CODE",
 "scripts/refresh_private_opponent_ledger.py":
    "PRIVATE_WORKFLOW_SOURCE_CODE"
}
CREDENTIAL=re.compile(
 r"(?im)^\s*(?:[A-Z0-9_]*(?:API_KEY|PASSWORD|ACCESS_TOKEN|CLIENT_SECRET|PRIVATE_KEY)"
 r"|(?:api[_-]?key|password|access[_-]?token|client[_-]?secret))\s*[:=]\s*"
 r"(?P<value>(?:[\"'][^\"']{8,}[\"']|[^\s#]{16,}))"
)
PEM=re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")
WINPATH=re.compile(r"\b[A-Z]:\\(?:[^\s\"'<>|]{2,})",re.I)
HTTP=re.compile(r"https?://[a-z0-9.-]+(?:/[^\s\"'<>]*)?",re.I)
EMAIL=re.compile(r"\b[A-Z0-9._%+\-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b",re.I)
SOURCE_HASH=re.compile(r"\b[a-f0-9]{64}\b")
BINARY=re.compile(r"\x00")
def need(ok,reason):
 if not ok:raise ReleaseSurfaceHold("ENG59_PREEXISTING_PAGES_EXPOSURE_HOLD:"+reason)

def scan(text,source_kind):
 need(not BINARY.search(text),"UNEXPECTED_BINARY_SOURCE_FILE")
 # This does not prove keys absent; only flags obvious embedded credential forms.
 detected=CREDENTIAL.findall(text)
 return {
  "privateNamedSourceType":source_kind,
  "lines":len(text.splitlines()),
  "absoluteWindowsPathReferences":len(WINPATH.findall(text)),
  "publicWebURLReferences":len(HTTP.findall(text)),
  "emailLikeReferences":len(EMAIL.findall(text)),
  "sha256LikeFingerprints":len(SOURCE_HASH.findall(text)),
  "credentialAssignmentCandidates":len(detected),
  "embeddedPrivateKeyBlocks":len(PEM.findall(text)),
  "rawPrivateWorkbookContentsAssessed":False,
  "requiresIndependentContentAndPublicSharingReview":True,
  "privacyApproved":False
 }

def evaluate(repo,tracked=None,text_overrides=None):
 repo=Path(repo).resolve()
 pages=check(repo,tracked)
 observed=set(pages["preexistingPrivateNamedPathsRequiringHumanReview"])
 need(observed==set(EXPECTED),"PREEXISTING_PRIVATE_NAMED_PATH_SET_DRIFT")
 rec={}
 for path,kind in sorted(EXPECTED.items()):
  file=repo/path
  need(file.is_file(),"PRIVATE_NAMED_SOURCE_PATH_DISAPPEARED")
  text=(text_overrides or {}).get(path)
  if text is None:text=file.read_text(encoding="utf-8-sig")
  metrics=scan(text,kind)
  metrics["repoPath"]=path
  metrics["sourceFileSHA256"]=hashlib.sha256(file.read_bytes()).hexdigest()
  metrics["trackedInGitHubPagesRoot"]=True
  rec[path]=metrics
 need(all(x["lines"]>0 and x["privacyApproved"] is False for x in rec.values()),
   "EMPTY_OR_AUTOCLEARED_PRIVATE_SOURCE")
 credentialRisk=sum(x["credentialAssignmentCandidates"]+x["embeddedPrivateKeyBlocks"] for x in rec.values())
 need(credentialRisk==0,"LITERAL_CREDENTIAL_OR_PRIVATE_KEY_BLOCK_IN_PAGES_SOURCE")
 return {
  "schema":"ENG59_PREEXISTING_PAGES_PRIVACY_SCOPE_REVIEW_V1",
  "status":"DEVELOPER_SCOPED_SOURCE_INVENTORY_HUMAN_PRIVACY_APPROVAL_REQUIRED",
  "deployMechanism":"GITHUB_PAGES_PUBLISHES_REPOSITORY_ROOT_ON_MAIN",
  "candidatePrivateNamedSourceFiles":len(rec),
  "scopedSourceFiles":rec,
  "literalCredentialPatternCandidates":credentialRisk,
  "credentialAbsenceIndependentlyCertified":False,
  "sourceSharingAndPrivacyApproved":False,
  "currentReleaseDeploymentAuthorized":False,
  "notModifiedExternalWorkstreamFiles":True,
  "limitations":[
    "Static regex counts do not guarantee no secret, personal information or private content.",
    "The private-workbook narrative contains paths and facts about protected work; original source remains out of GitHub only to the extent checked separately.",
    "The two private-ledger scripts are source code, not published ledger JSON, but still are included in Pages root content.",
    "A human must decide the intended visibility/rights of these historical files before release. The tool neither redacts nor removes them."
  ]
 }

def main():
 p=argparse.ArgumentParser()
 p.add_argument("--repo",type=Path,default=Path(__file__).resolve().parents[1])
 p.add_argument("--report",type=Path)
 args=p.parse_args()
 result=evaluate(args.repo)
 if args.report:
  from check_eng59_static_release_surface import need as surface_need
  surface_need(not args.report.resolve().is_relative_to((args.repo/"widgets").resolve()),
    "PRIVATE_CONTENT_REVIEW_REPORT_MUST_STAY_OUTSIDE_WIDGETS")
  args.report.parent.mkdir(parents=True,exist_ok=True)
  args.report.write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
 print(json.dumps({
  "status":result["status"],
  "preexistingTrackedPrivateNamedPaths":result["candidatePrivateNamedSourceFiles"],
  "literalCredentialPatternCandidates":result["literalCredentialPatternCandidates"],
  "privacyApproved":result["sourceSharingAndPrivacyApproved"],
  "releaseAuthorized":result["currentReleaseDeploymentAuthorized"]}))
if __name__=="__main__":main()
