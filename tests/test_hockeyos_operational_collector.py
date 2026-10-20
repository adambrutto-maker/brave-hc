"""Operational writer tests run only inside temporary directories."""
import json
import os
import sys
import tempfile
import unittest
from datetime import datetime, timezone, timedelta
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
import hockeyos_operational_collector as collector
from test_hockeyos_feed_adapter_review import fixture

def payload():
    evidence=fixture()
    now=datetime.now(timezone.utc)
    evidence["observationStartedAt"]=(now-timedelta(seconds=2)).isoformat()
    evidence["observationCompletedAt"]=(now-timedelta(seconds=1)).isoformat()
    value=collector.adapter.adapt_review(evidence,now)
    value.update(schema="brave-hc-hto-verified-game-feed/v1",
                 sourceReadback=evidence["observationStartedAt"])
    return value

class OperationalCollectorTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        self.folder=self.root/collector.FEED_DIRECTORY;self.folder.mkdir()
        self.path=self.folder/collector.FEED_BASENAME
    def write(self,value,**kwargs):
        return collector.write_feed(value,self.path,operational_root=self.root,**kwargs)
    def test_default_is_check_only_and_does_not_write(self):
        with patch.object(collector,"verified_feed",return_value=payload()),patch("builtins.print") as printed:
            self.assertEqual(collector.main([]),0)
        self.assertFalse(self.path.exists())
        self.assertEqual(json.loads(printed.call_args.args[0])["state"],"CHECK_ONLY_SOURCE_VERIFIED")
    def test_first_write_roundtrip_preserves_null_and_hash(self):
        value=payload();receipt=self.write(value,expected_absent=True)
        self.assertEqual(json.loads(self.path.read_bytes()),value)
        self.assertIsNone(json.loads(self.path.read_bytes())["goalieGameTotals"]["Fictional Goalie 0"]["potg"])
        self.assertEqual(receipt["outputSHA256"],collector.digest(self.path.read_bytes()))
        self.assertIsNone(receipt["backupPath"])
    def test_replacement_has_exclusive_verified_backup_and_rollback(self):
        old=b'{"old":true}\n';self.path.write_bytes(old)
        receipt=self.write(payload(),expected_sha=collector.digest(old))
        backup=Path(receipt["backupPath"])
        self.assertEqual(backup.read_bytes(),old)
        self.assertEqual(receipt["backupSHA256"],collector.digest(old))
        result=collector.rollback_feed(self.path,receipt["outputSHA256"],backup,
                                      receipt["backupSHA256"],operational_root=self.root)
        self.assertEqual(self.path.read_bytes(),old)
        self.assertEqual(result["outputSHA256"],collector.digest(old))
    def test_hash_mismatch_and_wrong_expected_absence_preserve_old(self):
        old=b'{"old":true}';self.path.write_bytes(old)
        for kwargs in ({"expected_sha":"0"*64},{"expected_absent":True},{}):
            with self.assertRaises(collector.CollectorHold):self.write(payload(),**kwargs)
            self.assertEqual(self.path.read_bytes(),old)
    def test_separate_output_lock_contention_preserves_old(self):
        old=b'{"old":true}';self.path.write_bytes(old)
        lock=self.path.with_name(self.path.name+".collector-lock.json")
        lock.write_text('{"another":"owner"}')
        with self.assertRaisesRegex(collector.CollectorHold,"OUTPUT_LOCK_CONTENDED"):
            self.write(payload(),expected_sha=collector.digest(old))
        self.assertEqual(self.path.read_bytes(),old)
        self.assertEqual(lock.read_text(),'{"another":"owner"}')
    def test_serialization_failure_happens_before_filesystem_mutation(self):
        value=payload();value["unsupported"]=object()
        with self.assertRaises(TypeError):self.write(value,expected_absent=True)
        self.assertEqual(list(self.folder.iterdir()),[])
    def test_partial_temp_write_failure_and_replace_failure_preserve_old(self):
        old=b'{"old":true}';self.path.write_bytes(old)
        real_fdopen=os.fdopen
        class BrokenWrite:
            def __init__(self,handle):self.handle=handle
            def __enter__(self):return self
            def __exit__(self,*args):self.handle.close()
            def write(self,data):
                self.handle.write(data[:8]);raise OSError("partial write")
        with patch.object(collector.os,"fdopen",side_effect=lambda fd,mode:BrokenWrite(real_fdopen(fd,mode))):
            with self.assertRaises(OSError):self.write(payload(),expected_sha=collector.digest(old))
        self.assertEqual(self.path.read_bytes(),old)
        self.assertFalse(any(p.suffix==".tmp" for p in self.folder.iterdir()))
        with patch.object(collector.os,"replace",side_effect=OSError("replace failed")):
            with self.assertRaises(OSError):self.write(payload(),expected_sha=collector.digest(old))
        self.assertEqual(self.path.read_bytes(),old)
    def test_wrong_root_target_suffix_and_symlink_refused(self):
        value=payload()
        for target,root in ((self.folder/"other.json",self.root),(self.path,None),
                            (self.folder/"original.xlsx",self.root)):
            with self.assertRaises(collector.CollectorHold):
                collector.write_feed(value,target,expected_absent=True,operational_root=root)
        if hasattr(os,"symlink"):
            linked=self.root/"linked"
            try:linked.symlink_to(self.folder,target_is_directory=True)
            except OSError:return
            with self.assertRaises(collector.CollectorHold):
                collector.write_feed(value,linked/collector.FEED_BASENAME,expected_absent=True,operational_root=self.root)
    def test_rollback_wrong_current_or_backup_hash_preserves_new(self):
        old=b'{"old":true}';self.path.write_bytes(old)
        receipt=self.write(payload(),expected_sha=collector.digest(old));new=self.path.read_bytes()
        for current,backuphash in (("0"*64,receipt["backupSHA256"]),(receipt["outputSHA256"],"0"*64)):
            with self.assertRaises(collector.CollectorHold):
                collector.rollback_feed(self.path,current,receipt["backupPath"],backuphash,operational_root=self.root)
            self.assertEqual(self.path.read_bytes(),new)
    def test_top_level_flags_cannot_hide_falsified_source_evidence(self):
        value=payload();value["discoveryEvidence"]["coverageVerified"]=False
        with self.assertRaises(collector.adapter.review.ReviewHold):
            self.write(value,expected_absent=True)
        self.assertFalse(self.path.exists())
    def test_write_cli_requires_target_root_and_expected_state_before_network(self):
        with patch.object(collector,"verified_feed") as collect:
            with self.assertRaises(collector.CollectorHold):collector.main(["--write-feed"])
            collect.assert_not_called()

if __name__=="__main__":unittest.main()
