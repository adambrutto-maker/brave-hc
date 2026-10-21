"""Compare loaded Excel formulas with captured source; no workbook access or edits."""
import json,re,sys
from pathlib import Path

def canonical(formula, context, fields):
    if not isinstance(formula,str):raise ValueError("Formula text missing")
    out=[];i=0
    while i<len(formula):
        if formula[i]=='"':
            start=i;i+=1
            while i<len(formula):
                if formula[i]=='"':
                    if i+1<len(formula) and formula[i+1]=='"':i+=2;continue
                    i+=1;break
                i+=1
            else:raise ValueError("Unterminated formula string")
            out.append(formula[start:i]);continue
        if formula.startswith("_xlfn.",i):
            i+=6;continue
        prefix=re.match(r"[A-Za-z_][A-Za-z0-9_.]*(?=\[)",formula[i:])
        if formula[i]=='[' or prefix:
            table=prefix.group() if prefix else context
            if prefix:i+=len(table)
            start=i;depth=0
            while i<len(formula):
                ch=formula[i]
                if ch=="'" and i+1<len(formula) and formula[i+1] in "[]#@'":
                    i+=2;continue
                if ch=='[':depth+=1
                if ch==']':
                    depth-=1
                    if depth==0:i+=1;break
                i+=1
            if depth:raise ValueError("Unterminated structured reference")
            ref=formula[start:i]
            if table==context:
                row=re.fullmatch(r"\[@\[([^\]]+)\]\]|\[@([^\[\]]+)\]|\[\[#This Row\],\[([^\]]+)\]\]",ref)
                column=re.fullmatch(r"\[([^#@\[\]]+)\]",ref)
                if row:
                    field=next(v for v in row.groups() if v is not None)
                    if field not in fields:raise ValueError("Unknown context row field: "+field)
                    ref="[[#This Row],["+field+"]]"
                elif column:
                    field=column.group(1)
                    if field not in fields:raise ValueError("Unknown context column field: "+field)
                elif not prefix:
                    tokens=re.findall(r"\[([^\[\]]+)\]",ref)
                    if any(not t.startswith("#") and t not in fields for t in tokens):
                        raise ValueError("Unrecognized context reference")
            out.append(table+ref);continue
        out.append(formula[i]);i+=1
    return "".join(out)

def compare(capture,native):
    cols=capture["columns"]
    if len(cols)!=146 or len(native)!=146:raise ValueError("Expected 146 source columns")
    fields={c["name"] for c in cols}
    if len(fields)!=146:raise ValueError("Duplicate source field")
    differences=[];arrays=0
    for source,loaded in zip(cols,native):
        expected_array=source["firstStoredFormula"]["metadata"].get("t")=="array"
        arrays+=bool(loaded["hasArray"])
        if loaded["name"]!=source["name"]:raise ValueError("Source/header order differs")
        if bool(loaded["hasArray"])!=expected_array:
            differences.append({"field":source["name"],"reason":"ARRAY_MODE_DIFFERS"})
        left=canonical("="+source["firstStoredFormula"]["formula"],"AwardScoring",fields)
        right=canonical(loaded["formula"],"AwardScoring",fields)
        if left!=right:
            differences.append({"field":source["name"],"reason":"FORMULA_DIFFERS","sourceCanonical":left,"nativeCanonical":right})
    if arrays!=132:differences.append({"reason":"EXPECTED_132_ARRAY_COLUMNS","actual":arrays})
    return {"checked":146,"nativeArrayColumns":arrays,"differences":differences,
            "allowedNotation":"Known current-table column and row shorthand; _xlfn namespace only. Standalone @ operators and quoted text are not removed.",
            "currentScoresVerified":False,"publicationAuthorized":False}

if __name__=="__main__":
    folder=Path(sys.argv[1])
    capture=json.loads((folder/"261020_Awards_Original_Formula_Capture.json").read_text(encoding="utf-8-sig"))
    native=json.loads((folder/"loaded-native-formulas.json").read_text(encoding="utf-8-sig"))
    result=compare(capture,native)
    (folder/"loaded-formula-comparison.json").write_text(json.dumps(result,indent=2),encoding="utf-8")
    print(json.dumps({"checked":result["checked"],"nativeArrayColumns":result["nativeArrayColumns"],"differences":len(result["differences"])}),flush=True)
    raise SystemExit(1 if result["differences"] else 0)

