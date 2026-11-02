#!/usr/bin/env python3
"""Source-preserving Brave H.C. native HTO article readability formatter.

Pure HTML generation: no HTO credentials, HTTP writes, per-game widgets,
iframes, site-wide CSS, JavaScript, video processing, or publishing.
Requires beautifulsoup4; input is already source-verified/editorially approved.
"""
from __future__ import annotations
from bs4 import BeautifulSoup
from copy import deepcopy
from hashlib import sha256
from pathlib import Path
import argparse,json,re,sys

STYLE={
 "wrap":"background-color:#ffffff;color:#152c42;border:1px solid #d9e2ec;border-top:5px solid #ae263e;border-radius:7px;padding:24px 25px 27px;margin:0 auto;max-width:740px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65;",
 "eyebrow":"color:#a8223b;font-size:11px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;line-height:1.4;margin:0 0 10px;padding:0;",
 "title":"color:#112a42;font-family:Arial,Helvetica,sans-serif;font-size:25px;font-weight:800;line-height:1.25;letter-spacing:-0.35px;margin:0 0 13px;padding:0 0 11px;border-bottom:2px solid #b42b45;",
 "meta":"color:#445e76;font-size:13px;font-weight:650;line-height:1.5;margin:0 0 20px;padding:0;",
 "body":"color:#162e45;font-size:16px;font-weight:400;line-height:1.7;margin:0 0 17px;padding:0;",
 "lead":"color:#18384f;font-size:16px;font-weight:400;line-height:1.7;margin:0 0 20px;padding:0 0 0 12px;border-left:3px solid #c4465a;",
 "dek":"color:#496175;font-size:15px;font-weight:500;line-height:1.55;margin:0 0 19px;padding:0;",
 "subhead":"color:#122d45;background-color:#ecf3f8;border-left:4px solid #af2b42;font-size:17px;font-weight:800;line-height:1.35;margin:25px 0 12px;padding:9px 11px;",
 "footer":"background-color:#f0f4f8;border-top:1px solid #d6e1ea;color:#496175;font-size:13px;line-height:1.55;padding:13px 12px;margin:26px 0 0;",
 "link":"color:#a31e38;font-size:13px;font-weight:800;text-decoration:underline;",
}
ALLOWED={"h2","h3","p","strong","em","a","br","b","i","u","span"}
LABEL_PREFIX="BRAVE H.C. / HOT STOVE"
ARCHIVE_LABEL="Browse the Brave H.C. Hot Stove archive"

class StyleHold(ValueError):
    pass

def normalized_text(value: str) -> str:
    return re.sub(r"\s+"," ",value.replace("\xa0"," ")).strip()

def blocks(soup: BeautifulSoup, strip_eyebrow: bool=True) -> list[str]:
    result=[]
    for tag in soup.find_all(["h2","h3","p"]):
        val=normalized_text(tag.get_text(" ",strip=True))
        if strip_eyebrow and val.startswith(LABEL_PREFIX):
            continue
        result.append(val)
    return result

def lint_source(soup: BeautifulSoup) -> None:
    if len(soup.find_all("h2"))!=1:
        raise StyleHold("Article must have exactly one source headline")
    if not (3<=len(blocks(soup))<=65):
        raise StyleHold("Source editorial paragraph count out of range")
    for el in soup.find_all(True):
        if el.name not in ALLOWED:
            raise StyleHold("Unsupported source tag: "+el.name)
        for key,value in el.attrs.items():
            if key.lower().startswith("on"):
                raise StyleHold("HTML event handlers not permitted")
            if key in ("src","srcdoc","formaction"):
                raise StyleHold("Remote/media asset not permitted")
        if el.name=="a":
            href=el.get("href","")
            if not isinstance(href,str) or not href.startswith("https://"):
                raise StyleHold("Links must use verified https sources")
    if any("style" in el.attrs for el in soup.find_all(True)):
        raise StyleHold("Input already contains inline styling; use the source-approved unstyled record")

def style_native_article(source_html: str, kind: str,
                         heading_texts: tuple[str,...]=()) -> tuple[str,dict]:
    """Format an approved native article without changing any source text blocks."""
    if kind not in ("preview","recap"):
        raise StyleHold("Article kind must be preview or recap")
    source=BeautifulSoup(source_html,"html.parser")
    lint_source(source)
    sections=set(map(normalized_text,heading_texts))
    if len(sections)!=len(heading_texts):
        raise StyleHold("Duplicate section heading selectors")
    if sections and kind!="preview":
        raise StyleHold("Plain-paragraph heading restoration is preview-only")
    source_blocks=blocks(source)
    out=BeautifulSoup("","html.parser")
    wrapper=out.new_tag("div")
    wrapper["style"]=STYLE["wrap"]
    eyebrow=out.new_tag("p")
    eyebrow["style"]=STYLE["eyebrow"]
    eyebrow.string="BRAVE H.C.  /  HOT STOVE  /  "+("GAME PREVIEW" if kind=="preview" else "GAME RECAP")
    wrapper.append(eyebrow)
    body_paragraph_index=0
    restored=set()
    for child in list(source.contents):
        if not getattr(child,"name",None):
            continue
        node=deepcopy(child)
        label=normalized_text(node.get_text(" ",strip=True))
        footer=ARCHIVE_LABEL in label
        if node.name=="h2":
            node["style"]=STYLE["title"]
        elif node.name=="h3" or (kind=="preview" and label in sections):
            if node.name=="p":
                node.name="h3"
                restored.add(label)
            node["style"]=STYLE["subhead"]
        elif node.name=="p":
            if footer:
                node["style"]=STYLE["footer"]
                for link in node.find_all("a"):
                    link["style"]=STYLE["link"]
            elif body_paragraph_index==0:
                node["style"]=STYLE["meta"]
                for item in node.find_all("strong"):
                    item["style"]="color:#445e76;"
            elif body_paragraph_index==1 and node.find("em"):
                node["style"]=STYLE["dek"]
            elif body_paragraph_index==1 or (body_paragraph_index==2 and kind=="recap"):
                node["style"]=STYLE["lead"]
            else:
                node["style"]=STYLE["body"]
            body_paragraph_index+=1
        wrapper.append(node)
    out.append(wrapper)
    if restored!=sections:
        raise StyleHold("Not every specified preview subheading exists in the source")
    if blocks(out)!=source_blocks:
        raise StyleHold("Editorial content changed during presentation formatting")
    final=out.decode(formatter="html")+"\n"
    if any(x in final.lower() for x in ("<script","<iframe","<style","javascript:")):
        raise StyleHold("Unsafe HTML in styled result")
    evidence={
        "schema":"brave-hc-native-hto-article-readability/v1",
        "kind":kind,
        "publicationState":"PREPARED_NOT_PUBLISHED",
        "sourceHtmlSHA256":sha256(source_html.encode("utf8")).hexdigest(),
        "styledHtmlSHA256":sha256(final.encode("utf8")).hexdigest(),
        "storyBlocksPreserved":len(source_blocks),
        "originalH3Count":len(source.find_all("h3")),
        "styledH3Count":len(out.find_all("h3")),
        "restoredPreviewHeadings":sorted(restored),
        "inlineStyleCount":final.count('style='),
        "siteWideThemeModified":False,
        "scoresModified":False,
        "videoOrHighlightsTouched":False,
    }
    return final,evidence

def main(argv=None):
    a=argparse.ArgumentParser()
    a.add_argument("--input",required=True,help="Approved unstyled HTO editor HTML")
    a.add_argument("--output",required=True,help="Separate styled HTML for native review")
    a.add_argument("--kind",choices=("preview","recap"),required=True)
    a.add_argument("--heading",action="append",default=[],
                   help="Exact preview paragraph to convert into an h3 heading")
    args=a.parse_args(argv)
    src=Path(args.input).expanduser().resolve()
    dest=Path(args.output).expanduser().resolve()
    if src==dest:
        raise StyleHold("Refusing to overwrite original approved source file")
    if dest.exists():
        raise StyleHold("Output exists; choose a new path to preserve prior evidence")
    result,manifest=style_native_article(src.read_text(encoding="utf8"),args.kind,tuple(args.heading))
    dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(result,encoding="utf8",newline="\n")
    receipt=dest.with_suffix(dest.suffix+".readability.json")
    receipt.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+"\n",encoding="utf8",newline="\n")
    print(json.dumps({"status":"STAGED_NOT_PUBLISHED","html":str(dest),
                      "receipt":str(receipt),"textBlocksPreserved":manifest["storyBlocksPreserved"]}))
    return 0

if __name__=="__main__":
    try:sys.exit(main())
    except (StyleHold,OSError,ValueError) as error:
        print("HTO_ARTICLE_STYLING_HELD:",error,file=sys.stderr)
        sys.exit(2)
