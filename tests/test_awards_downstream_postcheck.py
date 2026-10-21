import sys,unittest,zipfile,io
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from hockeyos_awards_downstream_postcheck import equal,cache_value,in_rectangles,pivot_rectangles,array_dependents,output_review,source_cache_fields
import xml.etree.ElementTree as E
class DownstreamChecks(unittest.TestCase):
 def fixture(self):
  candidate={'rows':[{'targetTable':'SkaterStatsByGame','inputs':{'Name':'Pavaday, Damian','GP':1,'G':0,'A':1,'Pts':1}}]}
  data={'controls':{'C1':'W2026/27'},'awardErrors':[],'playerInfoRows':[{'Website Name':'Pavaday, Damian','Current Skater GP':1,'Current Total Raw G':0,'Current Total Raw A':1,'Current Total Raw Pts':1,'Current Roster Status':'DI','Recent Season':'W2026/27'}],'awardRows':[{'Name':'Pavaday, Damian','Art Ross Award Score':1,'Rocket Richard Award Score':0,'Art Ross Eligible':1,'Rookie Eligible':0}]}
  return data,candidate
 def test_current_counts_and_dropin(self):
  data,candidate=self.fixture();out=output_review(data,candidate)
  self.assertEqual(out['playerInfoAndCountTitleMismatches'],[]);self.assertEqual(out['damian']['rookieEligible'],0)
 def test_legacy_other_season_population_reported(self):
  data,candidate=self.fixture();data['playerInfoRows'][0]['Recent Season']='W2025/26'
  self.assertEqual(output_review(data,candidate)['eligiblePopulationByCategory']['Art Ross Eligible']['otherSeasonNames'],['Pavaday, Damian'])
 def test_unaccepted_current_identity_is_reported(self):
  data,candidate=self.fixture();data['playerInfoRows'].append({'Website Name':'Unknown Johnny','Recent Season':'W2026/27'});data['awardRows'].append({'Name':'Unknown Johnny','Art Ross Eligible':1})
  self.assertEqual(output_review(data,candidate)['eligiblePopulationByCategory']['Art Ross Eligible']['currentNamesOutsideAcceptedParticipants'],['Unknown Johnny'])
 def test_missing_goalie_cannot_hide_in_skater_coverage(self):
  data,candidate=self.fixture();candidate['rows'].append({'targetTable':'GoalieStatsByGame','inputs':{'Name':'Leong, Dev'}})
  self.assertEqual(output_review(data,candidate)['currentParticipantsMissingFromAwardTable'],['Leong, Dev'])
 def test_missing_current_player_cannot_pass_counts(self):
  data,candidate=self.fixture();data['awardRows'][0]['Name']='Other, Player'
  self.assertEqual(output_review(data,candidate)['playerInfoAndCountTitleMismatches'][0]['reason'],'AWARD_TABLE_OMITS_CURRENT_SKATER')
 def test_pivot_derived_fields_are_not_database_record_columns(self):
  fields=[E.fromstring('<cacheField name="GP"/>'),E.fromstring('<cacheField name="Pts/GP" databaseField="0" formula="Pts/GP"/>')]
  source,extras=source_cache_fields(fields,['GP']);self.assertEqual(len(source),1);self.assertEqual(extras[0]['formula'],'Pts/GP')
  fields[1].set('databaseField','1')
  with self.assertRaises(ValueError):source_cache_fields(fields,['GP'])
 def test_wrong_database_header_rejected(self):
  with self.assertRaises(ValueError):source_cache_fields([E.fromstring('<cacheField name="A"/>')],['G'])
 def test_numeric_serialization(self):
  self.assertTrue(equal(0.1,0.100000000000001));self.assertFalse(equal(1,2));self.assertFalse(equal(None,0))
 def test_cache_types(self):
  for xml,want in [('<m/>',None),('<n v="2"/>',2),('<s v="name"/>','name'),('<d v="1899-12-31T00:00:00"/>',1),('<e v="#N/A"/>',('error','#N/A'))]:self.assertEqual(cache_value(E.fromstring(xml)),want)
  with self.assertRaises(ValueError):cache_value(E.fromstring('<unsupported/>'))
 def test_rectangles_precise(self):
  rect=[(1,2,46,655)]
  for a in ['A2','AT655']:self.assertTrue(in_rectangles(a,rect))
  for a in ['A1','AU2','A656']:self.assertFalse(in_rectangles(a,rect))
 def test_array_cache_exemption_excludes_anchor_and_neighbours(self):
  b=io.BytesIO()
  with zipfile.ZipFile(b,'w') as z:z.writestr('sheet.xml','<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><f t="array" ref="B2:B4">SUM(A1)</f></worksheet>')
  with zipfile.ZipFile(b) as z:self.assertEqual(array_dependents(z,'sheet.xml'),{'B3','B4'})
 def test_only_named_pivot_ranges(self):
  b=io.BytesIO()
  with zipfile.ZipFile(b,'w') as z:
   z.writestr('xl/worksheets/sheet2.xml','<worksheet/>')
   z.writestr('xl/worksheets/_rels/sheet2.xml.rels','<Relationships><Relationship Type="x/pivotTable" Target="../pivotTables/pivotTable1.xml"/><Relationship Type="x/pivotTable" Target="../pivotTables/pivotTable2.xml"/></Relationships>')
   for i,name in [(1,'PlayerStatsBySeason'),(2,'OtherPivot')]:z.writestr(f'xl/pivotTables/pivotTable{i}.xml',f'<pivotTableDefinition xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" name="{name}"><location ref="A2:AT655"/></pivotTableDefinition>')
  with zipfile.ZipFile(b) as z:self.assertEqual(pivot_rectangles(z),{'xl/worksheets/sheet2.xml':[(1,2,46,655)]})
if __name__=='__main__':unittest.main()
