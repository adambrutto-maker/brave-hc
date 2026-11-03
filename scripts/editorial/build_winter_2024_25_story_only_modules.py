#!/usr/bin/env python3
"""Build PRIVATE, unapproved Winter 2024/25 historical recap review modules.

The 24 independent Markdown research drafts and source index are immutable
inputs. Outputs are HTML story-only fragments for review, NEVER publishable
native field replacements. Private native field inspection/backup is still
required before combining original HTO media, event tables and story text.

Zero network, browser, HTO or GitHub writes. Output must be outside the repo
and must not already exist, to prevent overwriting authoritative sources.
"""
from __future__ import annotations
from pathlib import Path
from datetime import datetime,timezone
from hashlib import sha256
from html import escape
from urllib.parse import urlparse,parse_qs
import argparse,json,re,sys
from hto_native_article_readability import style_native_article,blocks
from bs4 import BeautifulSoup

REPO=Path(__file__).resolve().parents[2]
DIR=REPO/"docs"/"editorial"/"native_hto"/"2024-25"
INDEX=DIR/"REVIEW_INDEX.md"
SOURCE=DIR/"261103_Winter2024_25_Public_Source_Preservation_v2.json"
MATCH=re.compile(r"\[Unapproved draft\]\(review_drafts/([^\)]+\.md)\)")

def sha(s: str)->str:
    return sha256(s.encode("utf-8")).hexdigest()

def generate(out:Path)->dict:
    out=out.expanduser().resolve()
    if out==REPO or REPO in out.parents:
        raise ValueError("Private output MUST be outside the public GitHub repository")
    if out.exists():
        raise ValueError("Output already exists. Refusing to overwrite previously staged candidate files.")
    verified=json.loads(SOURCE.read_text(encoding="utf-8"))
    assert verified["schema"]=="brave-hc-winter-2024-25-native-HTO-preservation-audit/v2"
    games={g["gameId"]:g for g in verified["games"]}
    index=INDEX.read_text(encoding="utf-8")
    names=MATCH.findall(index)
    if len(names)!=24 or len(set(names))!=24:
        raise ValueError("Expected exactly 24 unique source-review draft references")
    items=[]
    for name in names:
        draft=DIR/"review_drafts"/name
        if not draft.is_file():raise ValueError("Missing draft "+name)
        md=draft.read_text(encoding="utf-8")
        sections=[x.strip() for x in md.split("\n\n") if x.strip()]
        if len(sections)<6 or not sections[0].startswith("# "):
            raise ValueError("Unexpected editorial draft layout: "+name)
        if not ("NOT APPROVED OR PUBLISHED" in sections[1] or
                "UNAPPROVED EDITORIAL REVIEW DRAFT" in sections[1]):
            raise ValueError("No explicit editorial hold in draft "+name)
        if "---" not in sections:
            raise ValueError("Missing source/release-hold boundary: "+name)
        bound=sections.index("---")
        if bound<5:raise ValueError("Missing narrative paragraphs: "+name)
        narrative=sections[2:bound]
        if not 3<=len(narrative)<=12 or any(len(p)<60 or "<" in p or ">" in p for p in narrative):
            raise ValueError("Unsupported or too-short narrative paragraphs: "+name)
        notes="\n\n".join(sections[bound+1:])
        if not notes or "approval" not in notes.lower():
            raise ValueError("No explicit remaining publication approval gate: "+name)
        gidMatch=re.search(r"_HTO_(\d+)_",name)
        if gidMatch is None:raise ValueError("Missing source ID: "+name)
        gid=int(gidMatch.group(1))
        if gid not in games or gid in (2148133,2148155):
            raise ValueError("Unknown/unapproved game or original source: "+name)
        g=games[gid]
        if g["result"]=="ADMINISTRATIVE_FORFEIT":
            raise ValueError("Forfeit cannot become a played game story: "+name)
        if gid==2148163 and not all(fragment in notes.lower() for fragment in (
                "two goals against", "does not establish an empty-net goal", "no founder approval")):
            raise ValueError("April 6 disputed source note missing")
        forfeitClaim=re.search(r"(?<!\w)forfeit\s+win",md.lower())
        if forfeitClaim:raise ValueError("Played-game story makes unsupported forfeit claim: "+name)
        sourceLinks=re.findall(r"\]\((https://[^\s\)]+)\)",sections[1])
        if len(sourceLinks)!=1:raise ValueError("Missing exact official source link: "+name)
        sourceURL=sourceLinks[0]
        u=urlparse(sourceURL);query=parse_qs(u.query)
        if (u.scheme,u.hostname,u.path)!=("https","www.htosports.com","/teams/default.asp") or query.get("gameID")!=[str(gid)] or query.get("viewseas")!=["Winter_2024/2025"] or query.get("p")!=["boxscore"]:
            raise ValueError("Wrong source-game/season URL: "+name)
        if (g["gameId"],g["date"])!=(gid,name[:8][:4]+"-"+name[:8][4:6]+"-"+name[:8][6:]):
            raise ValueError("Draft filename does not match original official date: "+name)
        title=sections[0][2:].strip()
        if len(title)<18 or len(title)>160:raise ValueError("Headline length invalid: "+name)
        plain=(
          "<h2>"+escape(title)+"</h2>\n"
          "<p><strong>Historical retrospective of "+escape(g["date"])+"; reconstructed in November 2026. "
          "This was not contemporaneous reporting.</strong></p>\n"
          "<p><em>Brave H.C. "+str(g["bravesGoals"])+"–"+str(g["opponentGoals"])+" "
          +escape(g["opponent"])+" · Original HTO game #"+str(gid)+"</em></p>\n"
        )
        plain+="".join("<p>"+escape(p)+"</p>\n" for p in narrative)
        archiveLink="https://adambrutto-maker.github.io/brave-hc/widgets/hot-stove.html?tab=archive"
        plain+="<p><a href=\""+archiveLink+"\">Browse the Brave H.C. Hot Stove archive</a></p>\n"
        styled,manifest=style_native_article(plain,"recap")
        if manifest["publicationState"]!="PREPARED_NOT_PUBLISHED" or manifest["storyBlocksPreserved"]!=len(narrative)+4:
            raise ValueError("Formatter did not preserve intended article blocks: "+name)
        if blocks(BeautifulSoup(plain,"html.parser"))!=blocks(BeautifulSoup(styled,"html.parser")):
            raise ValueError("Formatter changed source text: "+name)
        if any(sub in styled for sub in ("<iframe","<video","<script","<style")):
            raise ValueError("Style module contains a forbidden executable/media element")
        items.append({"gameId":gid,"date":g["date"],"opponent":g["opponent"],
          "officialBraveGoals":g["bravesGoals"],"officialOpponentGoals":g["opponentGoals"],
          "originalPublicHTOGameSHA256":g["publicBoxscoreHTMLSHA256"],
          "originalPublicNativeRecapSHA256":g["sourceRecapHTMLSHA256"],
          "originalPreservedSourceCategory":g["publicNativeContentCategory"],
          "reviewDraft":name,"reviewDraftSHA256":sha(md),
          "narrativeParagraphs":len(narrative),
          "sourceHtmlSHA256":manifest["sourceHtmlSHA256"],
          "styledHtmlSHA256":manifest["styledHtmlSHA256"],
          "sourceUrl":sourceURL,
          "candidateName":f"{g['date'].replace('-','')}_HTO_{gid}_STORY_ONLY_DRAFT.html",
          "editorialApproval":"NOT_APPROVED_FOR_PUBLICATION",
          "nativeEditorFieldInspectedAndBackedUp":False,
          "includesOriginalHTOPhotosVideosOrTables":False,
          "publicationSafe":False,
          "sourceScope":"HISTORICAL_ARTICLE_TEXT_ONLY"})
    if len(items)!=24 or {x["gameId"] for x in items}|{2148133,2148155}!={g["gameId"] for g in games}:
        raise ValueError("24 draft cards do not exactly cover played games without a contemporary original")
    # Reconstruct approved style deterministically from immutable input, then
    # create the output only after all validation has passed.
    out.mkdir(parents=True)
    for item in items:
        md=(DIR/"review_drafts"/item["reviewDraft"]).read_text(encoding="utf-8")
        parts=[x.strip() for x in md.split("\n\n") if x.strip()]
        num=parts.index("---")
        sourceURL=item["sourceUrl"]
        html=(
           "<h2>"+escape(parts[0][2:].strip())+"</h2>\n"
           "<p><strong>Historical retrospective of "+escape(item["date"])+"; reconstructed in November 2026. This was not contemporaneous reporting.</strong></p>\n"
           "<p><em>Brave H.C. "+str(item["officialBraveGoals"])+"–"+str(item["officialOpponentGoals"])+" "+escape(item["opponent"])+" · Original HTO game #"+str(item["gameId"])+"</em></p>\n"
        )+"".join("<p>"+escape(p)+"</p>\n" for p in parts[2:num])+(
           "<p><a href=\"https://adambrutto-maker.github.io/brave-hc/widgets/hot-stove.html?tab=archive\">Browse the Brave H.C. Hot Stove archive</a></p>\n"
        )
        styled,check=style_native_article(html,"recap")
        if check["sourceHtmlSHA256"]!=item["sourceHtmlSHA256"] or check["styledHtmlSHA256"]!=item["styledHtmlSHA256"]:
            raise ValueError("A candidate changed between validation and private-stage creation")
        (out/item["candidateName"]).write_text(styled,encoding="utf-8",newline="\n")
    summary={
      "schema":"brave-hc-winter-2024-25-story-only-private-review-candidates/v1",
      "stagedUTC":datetime.now(timezone.utc).isoformat(),
      "status":"24_STORY_MODULES_STAGED_PRIVATE_NOT_NATIVE_PASTE_READY",
      "sourceIndex":"docs/editorial/native_hto/2024-25/REVIEW_INDEX.md",
      "sourceReviewPR":"https://github.com/adambrutto-maker/brave-hc/pull/205",
      "publishedNativeArticlesAdded":0,
      "originalNativeMediaOrStatisticsModified":False,
      "originalAuthenticatedEditorFieldsInspectedAndBackedUp":False,
      "founderApprovalRecorded":False,
      "nextGate":"Review 24 editorial stories, inspect/backup each exact native HTO source field and its media/tables, obtain Founder approval, then build a separate field-preserving publication candidate and independently verify after any authorized save",
      "items":items
    }
    (out/"PRIVATE_REVIEW_MANIFEST.json").write_text(json.dumps(summary,indent=2,ensure_ascii=False)+"\n",encoding="utf-8",newline="\n")
    return summary

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--output-dir",required=True,help="New PRIVATE directory outside the repository; must not exist")
    args=parser.parse_args()
    result=generate(Path(args.output_dir))
    print(json.dumps({"status":result["status"],"count":len(result["items"]),
      "sourceVerified":all(item["originalPublicHTOGameSHA256"] for item in result["items"]),
      "unapproved":all(item["editorialApproval"]=="NOT_APPROVED_FOR_PUBLICATION" for item in result["items"])}))
if __name__=="__main__":
    try:main()
    except (AssertionError,ValueError,OSError) as error:
        print("HISTORICAL_STORY_STAGE_HELD",error,file=sys.stderr)
        sys.exit(2)
