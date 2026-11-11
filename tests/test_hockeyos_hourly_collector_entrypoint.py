"""Scheduled wrapper tests: temporary directories and mocked collector only."""
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
import hockeyos_hourly_collector_entrypoint as hourly

class HourlyCollectorTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        self.folder=self.root/hourly.collector.FEED_DIRECTORY;self.folder.mkdir()
        self.output=self.folder/hourly.collector.FEED_BASENAME
    def test_each_run_observes_current_hash_instead_of_baked_hash(self):
        with patch.object(hourly.collector,"main",return_value=0) as run:
            for data in (b'{"first":true}',b'{"second":true}'):
                self.output.write_bytes(data)
                self.assertEqual(hourly.main(["--operational-root",str(self.root)]),0)
                command=run.call_args.args[0]
                self.assertEqual(command[command.index("--expected-current-sha")+1],hourly.collector.digest(data))
                self.assertIn("--write-feed",command)
    def test_absent_feed_uses_explicit_expected_absent(self):
        with patch.object(hourly.collector,"main",return_value=0) as run:
            hourly.main(["--operational-root",str(self.root)])
            self.assertIn("--expected-absent",run.call_args.args[0])
    def test_no_root_never_silently_succeeds_or_collects(self):
        with patch.dict(os.environ,{},clear=True),patch.object(hourly.collector,"main") as run:
            with self.assertRaises(hourly.collector.CollectorHold):hourly.main([])
            run.assert_not_called()
    def test_configured_root_environment_supports_no_argument_wrapper(self):
        with patch.dict(os.environ,{"HOCKEYOS_OPERATIONAL_ROOT":str(self.root)}),patch.object(hourly.collector,"main",return_value=0) as run:
            hourly.main([])
            self.assertIn(str(self.root),run.call_args.args[0])
    def test_explicit_check_only_never_requests_write(self):
        with patch.object(hourly.collector,"main",return_value=0) as run:
            hourly.main(["--check-only"])
            run.assert_called_once_with(["--check-only"])
    def test_nonzero_writer_result_propagates(self):
        with patch.object(hourly.collector,"main",return_value=2):
            self.assertEqual(hourly.main(["--operational-root",str(self.root)]),2)

if __name__=="__main__":unittest.main()
