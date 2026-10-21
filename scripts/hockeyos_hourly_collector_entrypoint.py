"""Scheduled collector entrypoint; explicit configured root, fresh prior hash per run."""
import argparse
import os
import sys
from pathlib import Path
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
import hockeyos_operational_collector as collector

def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--operational-root",default=os.environ.get("HOCKEYOS_OPERATIONAL_ROOT"))
    parser.add_argument("--check-only",action="store_true")
    args=parser.parse_args(argv)
    if args.check_only:
        return collector.main(["--check-only"])
    if not args.operational_root:
        raise collector.CollectorHold("EXPLICIT_SCHEDULED_OPERATIONAL_ROOT_REQUIRED")
    root=Path(args.operational_root)
    output=collector.bound_output(root/collector.FEED_DIRECTORY/collector.FEED_BASENAME,root)
    old=collector.current_bytes(output)
    command=["--write-feed","--operational-root",str(root),"--output-path",str(output)]
    if old is None:command.append("--expected-absent")
    else:command.extend(["--expected-current-sha",collector.digest(old)])
    # The operational writer compares this state again under its separate lock.
    return collector.main(command)

if __name__=="__main__":
    try:raise SystemExit(main())
    except (collector.CollectorHold,collector.adapter.review.ReviewHold,
            collector.adapter.review.helper.BoxscoreSchemaHold,OSError,ValueError,KeyError) as error:
        import json
        print(json.dumps({"state":"HOLD","reason":str(error),"workbookWritten":False,"publisherUpdated":False}),file=sys.stderr)
        raise SystemExit(2)
