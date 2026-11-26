#!/usr/bin/env python3
"""Prepare Brave H.C. 2025/26 native HTO retrospective + preserved graphics.

Reads (1) freshly verified individual HTO game evidence, (2) existing reviewed
historical articles and (3) read-only authenticated native HTO original
Recap HTML backups. Produces review-only HTML, never edits any HTO field.
"""
from __future__ import annotations
from hashlib import sha256
from html import escape
from pathlib import Path
from bs4 import BeautifulSoup
from datetime import datetime,timezone
import json,re,sys,urllib.parse

ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/"docs/editorial/native_hto/2025-26"
INDEX=BASE/"review_index.json"
EVIDENCE=BASE/"official_boxscore_source_audit.json"
ORIGINALS=Path.home()/"AppData/Local/BruTTech/HTOEditorAudit/20261102/winter2025_26_native_originals"
STAGED=BASE/"publication_candidates"
FORMATTER=Path.home()/"AppData/Local/Temp/bravehc_hto_site_colours_release_branch/scripts/editorial"
sys.path.insert(0,str(FORMATTER))
from hto_native_article_readability import style_native_article

def requires(ok,msg):
 if not ok:raise ValueError(msg)

def norm(text):
 return re.sub(r"\s+"," ",str(text)).strip()

def section(full,open_head,close_head):
 requires(open_head in full and close_head in full,"REVIEW_MARKDOWN_SECTIONS_MISSING")
 after=full.split(open_head,1)[1].split(close_head,1)[0]
 chunks=[norm(x) for x in re.split(r"\n\s*\n",after)]
 paragraphs=[]
 for block in chunks:
  if not block:continue
  if block.startswith("#") or block.startswith("**"):raise ValueError("Unexpected markup inside story section")
  paragraphs.append(block)
 requires(3<=len(paragraphs)<=12,"HISTORICAL_STORY_PARAGRAPH_COVERAGE")
 return paragraphs

def render_plain(source):
 return escape(source,quote=False)

def official_link(gid):
 return ("https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY"
         "&s=hockey&sportsHQ=BRAVESHOCKEY&gameID="+str(gid)+"&p=boxscore")

def render(entry,raw,source_html):
 eid=entry["gameId"]
 is_full=entry["evidenceGrade"]=="FULL_GAME_EVENTS_AND_SKATERS"
 if is_full:
  body=section(raw,"## Historical editorial verification","## Historical editorial verification")
 else:
  body=section(raw,"## Historical game account","## Source and editorial limitations")
 # full event content uses original Markdown before the verification heading;
 # the alternate source-based extraction is handled below.
 return body

def full_body(raw):
 if "## Historical editorial verification" not in raw:
  raise ValueError("FULL_EDITORIAL_VERIFICATION_MISSING")
 s=raw.split("## Historical editorial verification",1)[0]
 lines=s.splitlines()
 # Drop heading and the two bold editorial-meta lines. Remaining prose starts
 # with the first source-verified original narrative paragraph.
 chunks=[norm(x) for x in re.split(r"\n\s*\n",s)]
 paras=[]
 for chunk in chunks:
  if not chunk or chunk.startswith("#") or chunk.startswith("**"):continue
  paras.append(chunk)
 requires(3<=len(paras)<=12,"FULL_EVENT_PARAGRAPH_COVERAGE")
 return paras

def native_article(entry,story_text):
 gid=entry["gameId"]
 if entry["evidenceGrade"]=="FULL_GAME_EVENTS_AND_SKATERS":
  body=full_body(story_text)
 else:
  body=section(story_text,"## Historical game account","## Source and editorial limitations")
 game_date=datetime.strptime(entry["date"],"%Y-%m-%d")
 display=game_date.strftime("%B ")+str(game_date.day)+", "+str(game_date.year)
 scope="Playoffs" if entry["gameType"]=="PLAYOFFS" else "Regular season"
 meta="Historical retrospective · "+display+" · "+scope+" · Brave H.C. "+str(entry["goalsFor"])+"–"+str(entry["goalsAgainst"])+" "+entry["opponent"]
 if entry["evidenceGrade"]=="SCOREBOARD_AND_SKATERS_ONLY":
  note=("Retrospective prepared in November 2026 from the official HTO final and period scores "
        "and named player totals. A complete goal-by-goal event log is not available, "
        "so individual goal times, goal strength and tactical causes are not asserted.")
 elif entry["evidenceGrade"]=="EVENTS_WITH_PARTIAL_PLAYER_STATS":
  note=("Retrospective prepared in November 2026 from the official HTO overtime event and "
        "goalie record. The original scoring line does not identify the credited scorer, "
        "and complete skater point data are unavailable.")
 else:
  note=("Retrospective prepared in November 2026 from the official HTO goal-event and "
        "credited player-stat record. It is not original game-day reporting.")
 pieces=["<h2>"+render_plain(entry["headline"])+"</h2>",
         "<p><strong>"+render_plain(meta)+"</strong></p>"]
 for para in body:
  pieces.append("<p>"+render_plain(para)+"</p>")
 pieces+=["<h3>Historical source and context</h3>",
          "<p>"+render_plain(note)+"</p>",
          '<p><a href="'+escape(official_link(gid),quote=True)+'">Official HTO game box score</a></p>',
          '<p><a href="https://adambrutto-maker.github.io/brave-hc/widgets/hot-stove.html?tab=archive">Browse the Brave H.C. Hot Stove archive</a></p>']
 src="\n".join(pieces)+"\n"
 styled,proof=style_native_article(src,"recap")
 return styled,body,proof

def check_legacy_html(raw,claimed_images,gid):
 doc=BeautifulSoup(raw,"html.parser")
 tags=doc.find_all(True)
 requires(all(t.name in ("p","img","br","a","strong","em","span","div","iframe") for t in tags),
          "ORIGINAL_HTO_LEGACY_HTML_NEEDS_MANUAL_REVIEW")
 embedded=doc.find_all("iframe")
 requires((gid==2214988 and len(embedded)==1) or (gid!=2214988 and not embedded),
          "LEGACY_VIDEO_GAME_IDENTITY_CHANGED")
 for video in embedded:
  url=urllib.parse.urlparse(video.get("src",""))
  requires(url.scheme=="https" and url.hostname=="www.youtube.com" and
           url.path=="/embed/hJ0mNCGkw7w",
           "UNRECOGNIZED_ORIGINAL_HISTORIC_VIDEO")
 imgs=doc.find_all("img")
 requires(len(imgs)==claimed_images,"ORIGINAL_HTO_IMAGE_COUNT_CHANGED")
 requires(not doc.get_text(" ",strip=True),"ORIGINAL_HTO_CONTEMPORARY_TEXT_MUST_BE_RECONCILED")
 for img in imgs:
  u=urllib.parse.urlparse(img.get("src",""))
  requires(u.scheme=="https" and u.hostname=="media.hometeamsonline.com" and
           "/photos/hockey/BRAVESHOCKEY/" in u.path and u.path.lower().endswith(".jpg"),
           "ORIGINAL_HTO_IMAGE_ASSET_UNVERIFIED")
 requires(not doc.find(["script","style"]),"UNSAFE_ORIGINAL_HTO_CODE")
 return imgs,embedded

def main():
 index=json.loads(INDEX.read_text(encoding="utf8"))
 prior=json.loads((ORIGINALS/"native_original_fields_manifest.json").read_text(encoding="utf8"))
 audit=json.loads(EVIDENCE.read_text(encoding="utf8"))
 requires(index["playedGamesVerified"]==24 and
          index["newRetrospectiveArticlesPublished"]==0,
          "UNEXPECTED_REVIEW_RELEASE_STATUS")
 requires(len(prior["games"])==24 and prior["sourceFieldsReadOnly"] and
          prior["nativeHTOChanges"]==0,"AUTHENTICATED_ORIGINAL_HTO_BACKUP_INCOMPLETE")
 requires({g["gameId"] for g in prior["games"]}=={g["gameId"] for g in index["games"]},
          "HTO_GAME_IDS_NOT_IN_COMPLETE_SOURCE_REGISTER")
 old_by_id={g["gameId"]:g for g in prior["games"]}
 source_by_id={g["id"]:g for g in audit["games"]}
 STAGED.mkdir(parents=True,exist_ok=True)
 out=[]
 for entry in index["games"]:
  gid=entry["gameId"]
  old=old_by_id[gid]
  evidence=source_by_id[gid]
  requires(evidence["date"]==entry["date"] and
           evidence["gf"]==entry["goalsFor"] and
           evidence["ga"]==entry["goalsAgainst"],"OFFICIAL_GAME_SOURCE_IDENTITY_CHANGED")
  original=(ORIGINALS/old["file"]).read_text(encoding="utf8")
  requires(sha256(original.encode()).hexdigest()==old["sourceSHA256"],
           "NATIVE_ORIGINAL_FIELD_CHANGED_SINCE_BACKUP_"+str(gid))
  images,videos=check_legacy_html(original,old["imageCount"],gid)
  markdown=(BASE/entry["file"]).read_text(encoding="utf8")
  requires(sha256(markdown.encode()).hexdigest()==entry["fileSHA256"],
           "REVIEW_ARTICLE_SOURCE_HASH_CHANGED_"+str(gid))
  heading=markdown.splitlines()[0]
  requires(heading.startswith("# ") and len(heading)>5,
           "REVIEW_ARTICLE_HEADLINE_MISSING_"+str(gid))
  entry={**entry,"headline":heading[2:].strip()}
  styled,body,proof=native_article(entry,markdown)
  # Article first, historic HTO image embeds are preserved in exact prior form.
  # No changes to the original image src, widths, alt/title or ordering.
  combined=styled+"\n"+original.strip()+"\n" if original.strip() else styled
  actual_img=BeautifulSoup(combined,"html.parser").find_all("img")
  requires(len(actual_img)==len(images),"LEGACY_IMAGES_NOT_RETAINED")
  actual_video=BeautifulSoup(combined,"html.parser").find_all("iframe")
  requires([str(x) for x in actual_video]==[str(x) for x in videos],
           "ORIGINAL_HISTORIC_VIDEO_MARKUP_CHANGED")
  requires([str(x) for x in actual_img]==[str(x) for x in images],
           "LEGACY_HTO_IMAGE_MARKUP_OR_ORDER_CHANGED")
  requires(sha256(styled.encode()).hexdigest()==proof["styledHtmlSHA256"],
           "ARTICLE_NATIVE_STYLING_HASH_MISMATCH")
  filename=entry["date"].replace("-","")+"_HTO_"+str(gid)+"_RETROSPECTIVE_PLUS_ORIGINAL.html"
  destination=STAGED/filename
  destination.write_text(combined,encoding="utf8",newline="\n")
  data={
   "gameId":gid,"date":entry["date"],"headline":entry["headline"],
   "sourceGrade":entry["evidenceGrade"],"sourceArticle":entry["file"],
   "storyParagraphs":len(body),"sourceArticleSha256":entry["fileSHA256"],
   "nativeField":"Scores > Recap","exactGameUrl":official_link(gid),
   "originalNativeSourceSHA256":old["sourceSHA256"],
   "originalImagesRetained":len(images),
   "originalVideoEmbedsRetained":len(videos),
   "originalNativeFieldEmpty":old["empty"],
   "preexistingHumanNarrative":old["textLength"]>0,
   "styledArticleSHA256":proof["styledHtmlSHA256"],
   "combinedFile":filename,"combinedSHA256":sha256(destination.read_bytes()).hexdigest(),
   "legacyMediaPreserved":True,"nativeHTOWrites":0,
   "editorialStatus":"RELEASE_CANDIDATE_REQUIRES_FOUNDER_APPROVAL",
   "livePublicationVerified":False}
  out.append(data)
  print("NATIVE_CANDIDATE",gid,entry["date"],"paragraphs",len(body),"old_images",len(images),flush=True)
 requires(len(out)==24 and sum(g["originalImagesRetained"] for g in out)==33 and
          sum(g["originalVideoEmbedsRetained"] for g in out)==1,
          "EXPECTED_TWENTY_FOUR_WITH_THIRTY_THREE_LEGACY_IMAGES_AND_ONE_VIDEO")
 manifest={"schema":"brave-hc-hto-native-history-release-candidates/v1",
  "generatedAtUTC":datetime.now(timezone.utc).isoformat(),
  "season":"Winter 2025/2026","officialGames":24,
  "originalNativeSourcesInspected":24,"preservedLegacyImageCount":33,
  "preservedOriginalYouTubeEmbeds":1,
  "historicalRetrospectiveArticlesApproved":False,
  "publicationState":"STAGED_NOT_PUBLISHED","nativeHTOWrites":0,
  "approvalGate":"Review and approve individual original-season retrospectives before native insertion",
  "sourceIndexSHA256":sha256(INDEX.read_bytes().replace(b"\r\n",b"\n")).hexdigest(),
  "games":out}
 (STAGED/"manifest.json").write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+"\n",
                                     encoding="utf8",newline="\n")
 print("CANDIDATES_DONE",json.dumps({"games":len(out),"historicImagesRetained":33,
  "alreadyPublished":0,"sourceTextsUntouched":True,"output":str(STAGED)},ensure_ascii=True),flush=True)

if __name__=="__main__":main()
