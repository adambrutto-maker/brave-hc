$ErrorActionPreference='Stop'
$base='D:\BruTTech\Products\HockeyOS\261019_Award_GameLog_Staging_v1'
$baseline=Join-Path $base 'Metadata_Review_20261021_045236\Review_Only_Metadata_Candidate.xlsx'
$baselineHash='12e90e974176bf49860c45d1becb375b76e21efc1fa9319fc5e0ae104addc994'
$source='D:\BruTTech\Products\HockeyOS\Reference Implementations\Brave H.C\01 Team Records\261001_Brave_HC_Master_Workbook.xlsx'
$sourceHash='0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154'
$schemaPath='C:\Users\adamb\AppData\Local\Temp\hockeyos-awards-source-formula-inspection.json'
if((Get-FileHash -LiteralPath $schemaPath).Hash.ToLower() -ne '2e90a8cacad89ebfc714548ca5f24751bcfe9745f065112c91ede3a75552adae'){throw 'Schema changed'}
foreach($check in @(@{path=$source;hash=$sourceHash},@{path=$baseline;hash=$baselineHash})){
 if((Get-FileHash -LiteralPath $check.path).Hash.ToLower() -ne $check.hash){throw 'Input workbook changed'}
}
$inputPath='C:\Users\adamb\AppData\Local\Temp\awards-resolved-game-inputs.json'
if((Get-FileHash -LiteralPath $inputPath).Hash.ToLower() -ne 'd940763965786aa4288217838e102eb5611a73995f5b5d71afc56f7247a31fe4'){throw 'Derived input package changed'}
$inputs=Get-Content -LiteralPath $inputPath -Raw|ConvertFrom-Json
if($inputs.rows.Count -ne 57 -or $inputs.derivedObservationCount -ne 42 -or $inputs.unknownSkaterPIM -ne 0 -or $inputs.unknownGoaliePOTG -ne 0){throw 'Derived input coverage differs'}
$folder=Join-Path $base ('Calculation_Review_'+[DateTime]::UtcNow.ToString('yyyyMMdd_HHmmss'))
New-Item -ItemType Directory -Path $folder|Out-Null
$copy=Join-Path $folder 'Review_Only_Calculation_Candidate.xlsx'
Copy-Item -LiteralPath $baseline -Destination $copy
$check=Get-Item -LiteralPath $copy
while($null -ne $check){if($check.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Redirected path rejected'};$check=if($check -is [IO.FileInfo]){$check.Directory}else{$check.Parent}}
& 'C:\Users\adamb\AppData\Local\Programs\Python\Python312\python.exe' -c 'import os,sys;assert not os.path.samefile(sys.argv[1],sys.argv[2]);assert os.stat(sys.argv[2]).st_nlink==1' $source $copy
if($LASTEXITCODE -ne 0){throw 'Copy alias rejected'}
$receipt=[ordered]@{state='COPY_CREATED';copy=$copy;baseline=$baseline;source=$source;currentScoresVerified=$false;publicationAuthorized=$false;recalculationPerformed=$false;inputWrites=@();pivotRefreshes=@();scope='Native reference diagnostic with derived observations; not production acceptance'}
$receiptPath=Join-Path $folder 'calculation-runtime.json'
[IO.File]::WriteAllText('C:\Users\adamb\AppData\Local\Temp\awards-calculation-current-receipt.txt',$receiptPath)
function State($s){$receipt.state=$s;$receipt.observedAt=[DateTime]::UtcNow.ToString('o');[IO.File]::WriteAllText($receiptPath,($receipt|ConvertTo-Json -Depth 12))}
$excel=$null;$book=$null;$books=$null
try{
 State 'OPENING_CALCULATION_COPY'
 $excel=New-Object -ComObject Excel.Application
 $excel.Visible=$false;$excel.DisplayAlerts=$false;$excel.EnableEvents=$false;$excel.AutomationSecurity=3;$excel.AskToUpdateLinks=$false
 $books=$excel.Workbooks
 $book=$books.Open([string]$copy,0,$false)
 if($null -eq $book){throw 'Open returned no workbook'}
 # Hold before any write unless every independent workbook identity agrees.
 $full=[string]$book.FullName;$name=[string]$book.Name;$path=[string]$book.Path
 $receipt.openedFullName=$full;$receipt.openedName=$name;$receipt.openedPath=$path;$receipt.openedReadOnly=[bool]$book.ReadOnly
 if([string]::IsNullOrWhiteSpace($path) -or [string]::IsNullOrWhiteSpace($name)){throw 'Workbook runtime path/name unavailable'}
 $combined=[IO.Path]::GetFullPath((Join-Path $path $name))
 $member=$books.Item(1)
 $memberPath=[IO.Path]::GetFullPath((Join-Path ([string]$member.Path) ([string]$member.Name)))
 if($book.ReadOnly -or $books.Count -ne 1 -or $combined -ne [IO.Path]::GetFullPath($copy) -or $memberPath -ne $combined -or [int64]$book.Application.Hwnd -ne [int64]$excel.Hwnd){throw 'Workbook identity differs'}
 if(-not [string]::IsNullOrWhiteSpace($full) -and [IO.Path]::GetFullPath($full) -ne $combined){throw 'FullName conflicts with Path and Name'}
 $receipt.verifiedRuntimePath=$combined;$receipt.runtimeIdentityMethod='Path plus Name, collection member path, single workbook in isolated Excel instance and matching application Hwnd'
 $receipt.fullNamePropertyAvailable=(-not [string]::IsNullOrWhiteSpace($full))
 $excel.Calculation=-4135;$excel.CalculateBeforeSave=$false
 $schema=Get-Content -LiteralPath $schemaPath -Raw|ConvertFrom-Json
 $sheet=$book.Worksheets.Item(1)
 $award=$book.Worksheets.Item('Awards & Records').ListObjects.Item('AwardScoring');$awardBefore=@()
 for($i=1;$i -le $award.ListColumns.Count;$i++){$c=$award.DataBodyRange.Cells.Item(1,$i);$awardBefore+=@{formula=[string]$c.Formula;array=[bool]$c.HasArray}}
 if($awardBefore.Count -ne 146 -or @($awardBefore|Where-Object array).Count -ne 132){throw 'Scoring formula inventory differs'}
 State 'APPLYING_42_DERIVED_OBSERVATIONS'
 $indexes=@{};$tables=@{}
 foreach($name in @('SkaterStatsByGame','GoalieStatsByGame')){
  $table=$book.Worksheets.Item('Player Game Logs').ListObjects.Item($name);$tables[$name]=$table
  $names=$table.ListColumns.Item('Name').DataBodyRange.Value2;$games=$table.ListColumns.Item('Game #').DataBodyRange.Value2;$index=@{}
  for($i=1;$i -le $table.ListRows.Count;$i++){
   if($games.GetValue($i,1) -notin @(359,360,361,362)){continue}
   $key=([string]$names.GetValue($i,1))+'|'+([int]$games.GetValue($i,1))
   if($index.ContainsKey($key)){throw 'Duplicate source appearance'};$index[$key]=$i
  }
  $indexes[$name]=$index
 }
 $written=@{}
 foreach($entry in $inputs.rows){
  if($null -eq $entry.derivedObservations){continue}
  $table=$tables[[string]$entry.targetTable];$index=$indexes[[string]$entry.targetTable]
  $key=([string]$entry.inputs.Name)+'|'+([int]$entry.inputs.'Game #')
  if(-not $index.ContainsKey($key)){throw 'Derived appearance not found'}
  foreach($d in $entry.derivedObservations){
   if($d.method -ne 'ADDITIVE_SEASON_REMAINDER' -or $d.value -ne 0 -or $d.residual -ne 0 -or $d.name -ne $entry.inputs.Name -or $d.sourceGameId -ne $entry.sourceGameId){throw 'Unexpected derivation'}
   $field=[string]$d.field
   if(($entry.targetTable -eq 'SkaterStatsByGame' -and $field -ne 'PIM') -or ($entry.targetTable -eq 'GoalieStatsByGame' -and $field -ne 'POTG')){throw 'Unplanned field write'}
   $writeKey=([string]$entry.targetTable)+'|'+$key+'|'+$field
   if($written.ContainsKey($writeKey)){throw 'Duplicate derived write'};$written[$writeKey]=$true
   $cell=$table.ListColumns.Item($field).DataBodyRange.Cells.Item([int]$index[$key],1)
   if($cell.HasFormula){throw 'Derived target contains a formula'}
   $old=$cell.Value2
   if($null -ne $old -and $old -ne '' -and [double]$old -ne 0){throw 'Existing value conflicts with exact season remainder'}
   $cell.Value2=[double]0
   $receipt.inputWrites+=@{table=[string]$entry.targetTable;name=[string]$entry.inputs.Name;game=[int]$entry.inputs.'Game #';field=$field;row=[int]$cell.Row;column=[int]$cell.Column;previousValue=$old;value=0;method=[string]$d.method}
  }
 }
 if($receipt.inputWrites.Count -ne 42){throw 'Derived write count differs'}
 State 'CALCULATING_GAME_LOG_HELPERS'
 $book.Worksheets.Item('Player Game Logs').Calculate()
 State 'REFRESHING_SEASON_PIVOTS'
 foreach($name in @('PlayerStatsBySeason','GoalieStatsBySeason')){
  $pivot=$book.Worksheets.Item('Player Stats').PivotTables($name)
  $pivot.PivotCache().Refresh()
  if(-not $pivot.RefreshTable()){throw 'Pivot refresh returned false'}
  $receipt.pivotRefreshes+=@{name=$name;records=[int]$pivot.PivotCache().RecordCount;range=[string]$pivot.TableRange2.Address()}
 }
 State 'RECALCULATING_FULL_DOWNSTREAM_REFERENCE'
 $excel.CalculateFullRebuild()
 if($excel.CalculationState -ne 0){throw 'Native calculation incomplete'}
 $receipt.recalculationPerformed=$true;$receipt.calculationState=[int]$excel.CalculationState
 State 'EXPORTING_REFERENCE_VALUES'
 $rows=@();$errors=@();$headers=@();$values=$award.DataBodyRange.Value2
 for($c=1;$c -le $award.ListColumns.Count;$c++){$headers+=[string]$award.ListColumns.Item($c).Name}
 for($r=1;$r -le $award.ListRows.Count;$r++){
  $record=[ordered]@{}
  for($c=1;$c -le $headers.Count;$c++){$v=$values.GetValue($r,$c);$record[$headers[$c-1]]=$v;if($v -is [int] -and $v -lt -2000000000){$errors+=@{row=$r;field=$headers[$c-1];code=$v}}}
  $rows+=,$record
 }
 $pi=$book.Worksheets.Item(1).ListObjects.Item('PlayerInfo');$piv=$pi.DataBodyRange.Value2;$piFields=@();$piRows=@()
 for($c=1;$c -le $pi.ListColumns.Count;$c++){
  $n=[string]$pi.ListColumns.Item($c).Name
  if($n -match '^(Current |Career |All-Time )' -or $n -in @('Website Name','Active Status','Active Eligible','Position','Position 2','Position Group','Award Scoring Type','First Season','Recent Season','Rookie Year','Rookie Status')){$piFields+=@{name=$n;index=$c}}
 }
 for($r=1;$r -le $pi.ListRows.Count;$r++){$rec=[ordered]@{};foreach($f in $piFields){$rec[$f.name]=$piv.GetValue($r,$f.index)};$piRows+=,$rec}
 $controls=@{};foreach($address in @('C1','J2','AH1','V2')){$controls[$address]=$book.Worksheets.Item('Master Schedule').Range($address).Value2}
 [IO.File]::WriteAllText((Join-Path $folder 'native-reference-values.json'),([ordered]@{state='RECALCULATED_REFERENCE_NOT_PRODUCTION_VERIFIED';controls=$controls;awardRows=$rows;awardErrors=$errors;playerInfoRows=$piRows;currentScoresVerified=$false;publicationAuthorized=$false}|ConvertTo-Json -Depth 14),[Text.UTF8Encoding]::new($false))
 for($i=1;$i -le $award.ListColumns.Count;$i++){$c=$award.DataBodyRange.Cells.Item(1,$i);if([string]$c.Formula -ne $awardBefore[$i-1].formula -or [bool]$c.HasArray -ne $awardBefore[$i-1].array){throw 'Source scoring formula changed'}}
 $receipt.awardFormulaModeChecks=146;$receipt.awardErrorCount=$errors.Count;$receipt.controls=$controls
 State 'SAVING_RECALCULATED_REFERENCE_COPY'
 $book.Save();$receipt.copySaved=$true
 State 'REFERENCE_COPY_SAVED_REQUIRES_SOURCE_AND_COHORT_PARITY_REVIEW'
}catch{$receipt.error=$_.Exception.Message;State 'FAILED_REVIEW_ONLY';throw}
finally{
 if($null -ne $book){$book.Close($false)}
 if($null -ne $excel){$excel.Quit()}
 $receipt.sourceHashUnchanged=((Get-FileHash -LiteralPath $source).Hash.ToLower() -eq $sourceHash)
 $receipt.baselineHashUnchanged=((Get-FileHash -LiteralPath $baseline).Hash.ToLower() -eq $baselineHash)
 State ([string]$receipt.state)
}
