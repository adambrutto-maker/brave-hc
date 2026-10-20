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

def payload():
    review=collector.adapter.review;candidate=collector.adapter.candidate
    observed={"games":{}};games=[];metadata={}
    player_gp={};goalie_gp={}
    for index,(gid,(number,day)) in enumerate(candidate.GAME_MAP.items()):
        url=f"https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&sportsHQ=BRAVESHOCKEY&gameID={gid}&p=boxscore"
        names=["Fictional Skater "+str((index*7+i)%20) for i in range((14,15,13,12)[index])]
        sktable=[["No","Name","POS","","+/-","POTG"]]
        for n,name in enumerate(names):
            sktable.append([str(n+1),name,"C","","0","0"]);player_gp[name]=player_gp.get(name,0)+1
        goalie="Fictional Goalie "+str(index if index<3 else 0)
        goalie_gp[goalie]=goalie_gp.get(goalie,0)+1
        header=["No","Name","","GP","L","GA","GAA","+/-"];row=["30",goalie,"","1","1","1","1.00","-1"]
        if index!=3:header.insert(7,"POTG");row.insert(7,"0")
        gotable=[header,row]
        provenance={"canonicalURL":url,"gameDate":review.GAME_DATES[gid],
                    "seasonBasis":"AUDITED_2026_27_GAME_DATE_MAP_AND_VERIFIED_SEASON_STATS"}
        observed["games"][str(gid)]={"skaters":sktable,"goalies":gotable,"GF":0,"GA":1}
        metadata[str(gid)]=provenance
        games.append({"htoGameId":gid,"sourceUrl":url,"teamGoals":0,"teamGoalsAgainst":1,
                      "skaters":review.helper.skater_rows(sktable,verified_team_goals=0),
                      "goalies":review.helper.goalie_rows(gotable),"contentProvenance":provenance})
    sk=[["No","Name","POS","","GP","G","A","Pts","+/-","POTG"]]
    for i,(name,gp) in enumerate(sorted(player_gp.items())):
        sk.append([str(i+1),name,"C","",str(gp),"0","0","0","0","0"])
    sk.append(["","Team Stats","","","4","0","0","0","0","0"])
    go=[["No","Name","","GP","L","GA","POTG"]]
    for i,(name,gp) in enumerate(sorted(goalie_gp.items())):
        go.append([str(i+30),name,"",str(gp),str(gp),str(gp),"0"])
    observed.update(skaterSeason=sk,goalieSeason=go)
    season={"canonicalURL":candidate.STATS_URL,"seasonTitle":review.SEASON_TITLE}
    data=candidate.build_candidate(games,sk,go,season)
    ids=sorted(candidate.GAME_MAP)
    plan=collector.adapter.discovery.reconciliation_plan(dict.fromkeys(ids,"url"),candidate.GAME_MAP,4)
    plan["coverageVerified"]=True
    now=datetime.now(timezone.utc)
    envelope={"state":"DISCOVERY_REVIEW_SOURCE_COVERAGE_PASS","productionAcceptance":False,
              "releaseState":"REVIEW_ONLY_NOT_PRODUCTION_ACCEPTANCE","sourceContentIdentityVerified":True,
              "observationStartedAt":(now-timedelta(seconds=2)).isoformat(),
              "observationCompletedAt":(now-timedelta(seconds=1)).isoformat(),
              "scoresProvenance":{"canonicalURL":candidate.SCORE_URL},
              "seasonProvenance":season,"gameProvenance":metadata,"candidate":data,"discovery":plan}
    value=collector.adapter.adapt_review(envelope,now)
    value.update(schema="brave-hc-hto-verified-game-feed/v1")
    value["sourceEvidence"]["observedStats"]=observed
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


    def test_corrupted_or_missing_game_rows_and_stale_parity_evidence_fail(self):
        for change in ("missing_skaters","goals","assists","points","jersey","teamG","observed_season","fake_count"):
            value=payload()
            if change=="missing_skaters":del value["games"][0]["skaters"]
            elif change=="goals":value["games"][0]["skaters"][0]["g"]=99
            elif change=="assists":value["games"][0]["skaters"][0]["a"]=99
            elif change=="points":value["games"][0]["skaters"][0]["pts"]=99
            elif change=="jersey":del value["games"][0]["skaters"][0]["no"]
            elif change=="teamG":value["teamG"]=99
            elif change=="observed_season":value["sourceEvidence"]["observedStats"]["skaterSeason"][1][5]="99"
            else:value["missingStatFields"]["seasonParity"]["skaters"]["completeFieldComparisons"]=119
            with self.assertRaises((collector.CollectorHold,collector.adapter.review.ReviewHold,KeyError)):
                self.write(value,expected_absent=True)
            self.assertFalse(self.path.exists())

if __name__=="__main__":unittest.main()
