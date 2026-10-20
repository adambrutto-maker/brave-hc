#!/usr/bin/env python3
"""HockeyOS publisher path migration: NON-EXECUTABLE REVIEW PATCHES ONLY.

Read an explicitly bounded set of source files, verify they each use the old
publisher path, and prepare unified text diffs redirected to a mandatory
HOCKEYOS_PUBLISH_REPO environment variable. The migration never executes any
source script, applies a patch, contacts HTO/GitHub, writes Excel, or changes
the scheduled task. Output patch filenames end in .review.patch.

Each patch is conditional on a separately reviewed operational migration.
"""
from __future__ import annotations
import argparse
import ast
from datetime import datetime, timezone
import difflib
import hashlib
import json
from pathlib import Path
import sys

OLD='HTO_Widget_Public_GitHub_Staging_20261016'
SELECTED=(
 '261016_Publish_HTO_Driven_Workbook_Projection.py',
 '261016_Projection_HTO_Model_Bridge.py',
 '261019_Publish_Countdown_On_Schedule.py',
 '261019_Export_HTO_NextGame_Countdown.py',
 '261017_Publish_Independent_Widget.py',
 '261016_Export_SVHL_Standings_Widget.py',
 '261017_Export_Watch_Workbook_Verified.py',
 '261019_Build_Hot_Stove_Drafts.py',
 '261019_HotStove_Roster_Context_Draft_Build.py',
 '261019_HotStove_Player_Matchup_Form.py',
 '261019_HotStove_Verified_Milestones.py',
)
ENV='Path(__import__("os").environ["HOCKEYOS_PUBLISH_REPO"]).resolve()'
ORIGINAL_EXACT=r'Path(r"D:\BruTTech\Products\HockeyOS\HTO_Widget_Public_GitHub_Staging_20261016\widgets\standings.json")'
TYPES=('ROOT','root','BASE')
class Hold(RuntimeError):
 pass
def digest(data: bytes)->str:
 return hashlib.sha256(data).hexdigest()
def transform(name:str,text:str)->tuple[str,int]:
 if OLD not in text:raise Hold(f"{name}: old publisher path missing; source changed")
 if 'from pathlib import Path' not in text:
  raise Hold(f"{name}: pathlib not imported as expected")
 new=text
 for prefix in TYPES:
  new=new.replace(prefix+'/"'+OLD+'"',ENV)
 new=new.replace(ORIGINAL_EXACT,ENV+'/"widgets"/"standings.json"')
 if OLD in new:raise Hold(f"{name}: unrecognized old-path reference remains")
 if new==text:raise Hold(f"{name}: no matching reviewed transformation")
 try:ast.parse(new,filename=name)
 except SyntaxError as exc:raise Hold(f"{name}: patched code syntax invalid: {exc.msg}") from exc
 # The transformed versions may still contain their old commands, but are
 # ONLY emitted as .review.patch files and never executed or installed.
 changes=sum(a!=b for a,b in zip(text.splitlines(),new.splitlines()))
 return new,changes

def build(source:Path,dest:Path)->dict:
 source=source.resolve()
 dest=dest.resolve()
 if not source.is_dir():raise Hold("Approved local HockeyOS source directory absent")
 if dest.exists():raise Hold("Review output exists: no overwrite allowed")
 if not dest.parent.is_dir():raise Hold("Review output parent missing")
 if dest==source or dest in (source/'HTO_Widget_Public_GitHub_Staging_20261016',
                             source/'Reference Implementations'):
  raise Hold("Cannot write into protected publisher/source workbook")
 if (source/'HTO_Widget_Public_GitHub_Staging_20261016') in dest.parents:
  raise Hold("Cannot write into old active publisher tree")
 if (source/'Reference Implementations') in dest.parents:
  raise Hold("Cannot write into original Master Workbook folder")
 if len(SELECTED)!=len(set(SELECTED)):raise Hold("Duplicate source file selection")
 converted=[]
 for name in SELECTED:
  f=source/name
  if not f.is_file():raise Hold(f"Missing dependency: {name}")
  raw=f.read_bytes()
  # Original scripts are Windows Python UTF-8; do not rewrite encoding or CRLF
  try:original=raw.decode('utf-8-sig')
  except UnicodeDecodeError as exc:raise Hold(f"Non-UTF8 source: {name}") from exc
  new,count=transform(name,original)
  patch=''.join(difflib.unified_diff(original.splitlines(keepends=True),
      new.splitlines(keepends=True),
      fromfile='original/'+name,tofile='review/'+name))
  if not patch.strip():raise Hold(f"Empty review patch for {name}")
  converted.append({'file':name,'sourceSHA256':digest(raw),
    'candidateUTF8SHA256':digest(new.encode('utf-8')),
    'changedLinesApprox':count,'sourceOldRefOccurrences':original.count(OLD),
    'patch':patch})
 # Fully validate every source BEFORE the first output write.
 dest.mkdir(parents=False,exist_ok=False)
 manifest={
  'schema':'hockeyos-publisher-path-migration-review/v1',
  'preparedAt':datetime.now(timezone.utc).isoformat(),
  'status':'REVIEW_PATCHES_PREPARED_NO_SCRIPTS_INSTALLED',
  'sourceCount':len(converted),'originalPublisherToken':OLD,
  'candidatePublisherSelector':'HOCKEYOS_PUBLISH_REPO (required, no fallback)',
  'steps':[],
  'productionTaskChanged':False,'originalSourceModified':False,
  'filesExecuted':False,'publisherActivated':False,
  'safeToDeploy':False,
  'limitations':[
   'Patches are inert text files only, not executable migrated scripts',
   'Original scripts still contain git commit/push and direct HTO reads',
   'Independent code/security review required before applying any patch',
   'The task launcher and orchestration must be separately updated as one transaction',
   'No current SVHL readback, projection award-model parity or rollback certification'
  ]
 }
 for item in converted:
  name=item['file']
  output=dest/(name+'.review.patch')
  output.write_text(item['patch'],encoding='utf-8')
  manifest['steps'].append({k:v for k,v in item.items() if k!='patch'}|
                          {'patchName':output.name,'patchSHA256':digest(output.read_bytes())})
 outfile=dest/'261020_HockeyOS_Publisher_Migration_Path_Patch_Manifest_v1.json'
 outfile.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
 return manifest

def main():
 ap=argparse.ArgumentParser()
 ap.add_argument('--source-root',required=True)
 ap.add_argument('--output-dir',required=True)
 opts=ap.parse_args()
 try:record=build(Path(opts.source_root),Path(opts.output_dir))
 except (Hold,OSError) as exc:
  print('REVIEW_PATCH_HOLD '+str(exc)[:240],file=sys.stderr)
  return 2
 print(json.dumps({'status':record['status'],'files':record['sourceCount'],
  'sourceFiles':[x['file'] for x in record['steps']],
  'productionTaskChanged':False,'publisherActivated':False}))
 return 0
if __name__=='__main__':sys.exit(main())
