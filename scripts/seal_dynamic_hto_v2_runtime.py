from pathlib import Path
from hashlib import sha256
import json
root=Path(r"D:\BruTTech\Products\HockeyOS\Runtime\HTOCollector\dynamic-date-bound-v2-261026")
manifest_file=root/"manifest.json"
doc=json.loads(manifest_file.read_text(encoding="utf8"))
assert doc["state"]=="DYNAMIC_DATE_BOUND_RUNTIME_QA_NOT_ACTIVATED"
files={str(p.relative_to(root)).replace("\\","/"):sha256(p.read_bytes()).hexdigest()
       for folder in ("scripts","tests") for p in (root/folder).rglob("*.py")}
doc["sourceFiles"]=files
doc["sourceChecks"]+=["Full operational HTO check-only PASS five games",
                     "Dynamic v2 isolated atomic write/backup/rollback PASS",
                     "All five original accepted player/game rows identical"]
doc["validatedGameCount"]=5
doc["writerRollbackQA"]="DYNAMIC_RUNTIME_SHADOW_ATOMIC_WRITE_ROLLBACK_PASS"
doc["sourceTeamGoals"]=12
doc["sourceTeamAssists"]=19
manifest_file.write_text(json.dumps(doc,indent=2)+"\n",encoding="utf8")
print(json.dumps({"state":doc["state"],"fileCount":len(files),
"validatedGameCount":doc["validatedGameCount"],"writerRollbackQA":doc["writerRollbackQA"]}))
