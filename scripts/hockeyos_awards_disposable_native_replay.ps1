$ErrorActionPreference = 'Stop'
$replayFolder = [IO.File]::ReadAllText('C:\Users\adamb\AppData\Local\Temp\hockeyos-awards-current-replay-folder.txt').Trim()
$approvedFolder = 'D:\BruTTech\Products\HockeyOS\261019_Award_GameLog_Staging_v1\Disposable_Awards_Replay_20261021_023525'
if ([IO.Path]::GetFullPath($replayFolder) -ne $approvedFolder) { throw 'Replay folder is not the approved disposable folder' }
$prep = Get-Content -LiteralPath (Join-Path $replayFolder 'preparation.json') -Raw | ConvertFrom-Json
$source = 'D:\BruTTech\Products\HockeyOS\Reference Implementations\Brave H.C\01 Team Records\261001_Brave_HC_Master_Workbook.xlsx'
$expected = '0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154'
$approvedCopy = Join-Path $approvedFolder 'Review_Only_Master_Workbook.xlsx'
if ([IO.Path]::GetFullPath([string]$prep.copy) -ne $approvedCopy -or $approvedCopy -eq [IO.Path]::GetFullPath($source)) { throw 'Copy path containment failed' }
$checkPath=Get-Item -LiteralPath $approvedCopy
while($null -ne $checkPath){
 if($checkPath.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Linked or redirected replay path rejected'}
 $checkPath=if($checkPath -is [IO.FileInfo]){$checkPath.Directory}else{$checkPath.Parent}
}
& 'C:\Users\adamb\AppData\Local\Programs\Python\Python312\python.exe' -c 'import os,sys; assert not os.path.samefile(sys.argv[1],sys.argv[2]); assert os.stat(sys.argv[2]).st_nlink==1' $source $approvedCopy
if($LASTEXITCODE -ne 0){throw 'Copy aliases source or has multiple hard links'}
$inputPins=@{
 '261020_Awards_Four_Game_Input_Candidate.json'='812a615b4f75763d0fc2315612cfa933a15122de64c3ff04719c7be1480063d0'
 '261020_Awards_Disposable_Replay_Plan.json'='3777a48152656f9aa250b1daec5045e57573e67fe9313d596163492f61a1bb24'
 '261020_Awards_Original_Formula_Capture.json'='73251e8e4fda7ecb229b9df096cacfcab8e92ddd4c474dcd6a3c646a2920390d'
}
foreach($name in $inputPins.Keys){if((Get-FileHash -LiteralPath (Join-Path $replayFolder $name) -Algorithm SHA256).Hash.ToLower() -ne $inputPins[$name]){throw "Pinned review input changed: $name"}}
if ((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLower() -ne $expected) { throw 'Original source changed' }
if ((Get-FileHash -LiteralPath $prep.copy -Algorithm SHA256).Hash.ToLower() -ne $expected) { throw 'Disposable copy differs before open' }
$inputs = Get-Content -LiteralPath (Join-Path $replayFolder '261020_Awards_Four_Game_Input_Candidate.json') -Raw | ConvertFrom-Json
$plan = Get-Content -LiteralPath (Join-Path $replayFolder '261020_Awards_Disposable_Replay_Plan.json') -Raw | ConvertFrom-Json
if((Get-FileHash -LiteralPath 'C:\Users\adamb\AppData\Local\Temp\hockeyos-awards-source-formula-inspection.json' -Algorithm SHA256).Hash.ToLower() -ne '2e90a8cacad89ebfc714548ca5f24751bcfe9745f065112c91ede3a75552adae'){throw 'Captured table schema changed'}
$schema = Get-Content -LiteralPath 'C:\Users\adamb\AppData\Local\Temp\hockeyos-awards-source-formula-inspection.json' -Raw | ConvertFrom-Json
$captured=Get-Content -LiteralPath (Join-Path $replayFolder '261020_Awards_Original_Formula_Capture.json') -Raw | ConvertFrom-Json
if ($inputs.rows.Count -ne 57 -or $plan.appendNewNamedRows.Count -ne 43 -or $plan.updateMatchedNamedRows.Count -ne 14) { throw 'Unexpected approved input shape' }
$receipt = [ordered]@{ state='STARTING'; copy=$prep.copy; folder=$replayFolder; sourceWorkbookSha256=$expected; publicationAuthorized=$false; missingObservationsRetained=@(); expansionCellsPreserved=@(); restoredCalculatedFlags=@(); writes=0; originalWorkbookModified=$false; masterScheduleResultsImported=$false }
function State([string]$phase) {
 $receipt.state=$phase; $receipt.observedAt=[DateTime]::UtcNow.ToString('o')
 [IO.File]::WriteAllText((Join-Path $replayFolder 'runtime-receipt.json'),($receipt | ConvertTo-Json -Depth 12),[Text.UTF8Encoding]::new($false))
}
$excel=$null; $book=$null
try {
 State 'OPENING_DISPOSABLE_COPY'
 $excel=New-Object -ComObject Excel.Application
 $excel.Visible=$false; $excel.DisplayAlerts=$false; $excel.EnableEvents=$false
 $excel.AskToUpdateLinks=$false; $excel.AutomationSecurity=3
 $book=$excel.Workbooks.Open([string]$prep.copy,0,$false)
 if ($book.ReadOnly -or $book.FullName -ne $prep.copy) { throw 'Unexpected opened workbook' }
 $excel.Calculation=-4135
 $sheet=$book.Worksheets.Item('Player Game Logs')
 $award=$book.Worksheets.Item('Awards & Records').ListObjects.Item('AwardScoring')
 $before=@()
 if($award.ListColumns.Count -ne 146 -or $captured.columns.Count -ne 146){throw 'Unexpected source scoring column count'}
 $nativeArrayCount=0
 for($i=1;$i -le $award.ListColumns.Count;$i++){
  $cell=$award.DataBodyRange.Cells.Item(1,$i)
  if($cell.HasArray){$nativeArrayCount++}
  $before+=@{name=[string]$award.ListColumns.Item($i).Name;formula=[string]$cell.Formula;hasArray=[bool]$cell.HasArray}
 }
 [IO.File]::WriteAllText((Join-Path $replayFolder 'loaded-native-formulas.json'),($before | ConvertTo-Json -Depth 8),[Text.UTF8Encoding]::new($false))
 if((Get-FileHash -LiteralPath (Join-Path $replayFolder 'loaded-formula-compare.py') -Algorithm SHA256).Hash.ToLower() -ne '9c0b6f662e67eb3a70eab505a2d90ba339959ee8bc8b778a94e134da29f0e058'){throw 'Formula comparison helper changed'}
 & 'C:\Users\adamb\AppData\Local\Programs\Python\Python312\python.exe' (Join-Path $replayFolder 'loaded-formula-compare.py') $replayFolder
 if($LASTEXITCODE -ne 0){$receipt.loadedFormulaComparisonPath=Join-Path $replayFolder 'loaded-formula-comparison.json';throw 'Loaded source formula or array mode differs after notation comparison'}
 if($nativeArrayCount -ne 132){throw 'Expected 132 stored array-formula columns'}
 $receipt.sourceFormulaBaselineChecks=146;$receipt.sourceArrayColumns=132
 $tables=@{}; $columnMaps=@{}; $nextRows=@{}
 foreach($name in @('SkaterStatsByGame','GoalieStatsByGame')){
  $table=$sheet.ListObjects.Item($name); $tables[$name]=$table
  if($table.ShowTotals){throw 'Unexpected table totals row'}
  $map=@{}
  for($i=1;$i -le $table.ListColumns.Count;$i++){$map[[string]$table.ListColumns.Item($i).Name]=$i}
  $columnMaps[$name]=$map
  $oldEnd=$table.Range.Row+$table.Range.Rows.Count-1
  $count=if($name -eq 'SkaterStatsByGame'){40}else{3}
  $expectedOld=if($name -eq 'SkaterStatsByGame'){4668}else{363}
  if($oldEnd -ne $expectedOld){throw "Unexpected table extent: $name"}
  $schemas=@($schema.tables | Where-Object name -eq $name)
  if($schemas.Count -ne 1 -or $schemas[0].columns.Count -ne $table.ListColumns.Count -or $map.Count -ne $table.ListColumns.Count){throw 'Incomplete or ambiguous table schema'}
  $tableSchema=$schemas[0];$schemaSeen=@{};$templateChecks=@();$templateRepairs=@()
  foreach($column in $tableSchema.columns){
   $decodedHeader=[regex]::Replace([string]$column.name,'_x([0-9A-Fa-f]{4})_', { [string][char][Convert]::ToInt32($args[0].Groups[1].Value,16) })
   if($schemaSeen.ContainsKey($decodedHeader) -or -not $map.ContainsKey($decodedHeader)){throw 'Schema/native header mismatch'}
   $schemaSeen[$decodedHeader]=$true
   $lastSource=$table.DataBodyRange.Cells.Item($table.ListRows.Count,$map[$decodedHeader])
   if(-not $column.formula -and $lastSource.HasFormula){throw "Source raw input unexpectedly contains a formula: $decodedHeader"}
   if($column.formula -and -not $lastSource.HasFormula){
    $role=if($name -eq 'SkaterStatsByGame'){'Skater'}else{'Goalie'}
    $approvedRow=@($plan.updateMatchedNamedRows | Where-Object { $_.role -eq $role -and $_.existingRow -eq $oldEnd })
    if($approvedRow.Count -ne 1){throw 'Formula repair is not an approved matched current row'}
    if($sheet.Cells.Item($oldEnd,$table.Range.Column+$map['Name']-1).Value2 -ne $approvedRow[0].name -or [int]$sheet.Cells.Item($oldEnd,$table.Range.Column+$map['Game #']-1).Value2 -ne $approvedRow[0].gameNumber){throw 'Formula repair row identity differs'}
    $templateIndex=$table.ListRows.Count-1
    while($templateIndex -ge 1 -and -not $table.DataBodyRange.Cells.Item($templateIndex,$map[$decodedHeader]).HasFormula){$templateIndex--}
    if($templateIndex -lt 1){throw 'No existing calculated formula template'}
    $template=$table.DataBodyRange.Cells.Item($templateIndex,$map[$decodedHeader])
    $templateChecks+=@{table=$name;field=$decodedHeader;fields=@($map.Keys);nativeFormula=[string]$template.Formula;sourceFormula=[string]$column.formula;nativeHasArray=[bool]$template.HasArray;expectedHasArray=($column.formulaMetadata.array -eq '1')}
    $templateRepairs+=@{field=$decodedHeader;columnIndex=$map[$decodedHeader];templateIndex=$templateIndex;oldValue=$lastSource.Value2;row=$oldEnd}
   }
  }
  if($templateChecks.Count){
   [IO.File]::WriteAllText((Join-Path $replayFolder 'source-template-checks.json'),(ConvertTo-Json -InputObject @($templateChecks) -Depth 8),[Text.UTF8Encoding]::new($false))
   & 'C:\Users\adamb\AppData\Local\Programs\Python\Python312\python.exe' (Join-Path $replayFolder 'loaded-formula-compare.py') $replayFolder --templates
   if($LASTEXITCODE -ne 0){throw 'Existing formula template differs from captured column definition'}
   foreach($repair in $templateRepairs){
    $template=$table.DataBodyRange.Cells.Item($repair.templateIndex,$repair.columnIndex)
    $target=$table.DataBodyRange.Cells.Item($table.ListRows.Count,$repair.columnIndex)
    $template.Copy($target)
    if(-not $target.HasFormula -or [bool]$target.HasArray -ne [bool]$template.HasArray){throw 'Calculated flag restoration failed'}
    $receipt.restoredCalculatedFlags+=@{table=$name;row=$repair.row;field=$repair.field;priorValue=$repair.oldValue;templateRow=$template.Row;scope='Current matched row in disposable copy only'}
   }
  }
  State ('EXPANDING_'+$name)
  $oldRows=$table.Range.Rows.Count
  $collisions=@()
  $below=$table.Range.Cells.Item($oldRows+1,1).Resize($count,$table.Range.Columns.Count)
  $belowValues=$below.Value2
  for($r=1;$r -le $count;$r++){for($c=1;$c -le $table.Range.Columns.Count;$c++){
   if($null -ne $belowValues.GetValue($r,$c)){
    $cell=$below.Cells.Item($r,$c)
    $collisions+=@{row=[int]$cell.Row;column=[int]$cell.Column;value=$cell.Value2;hasFormula=[bool]$cell.HasFormula;formula=[string]$cell.Formula}
   }
  }}
  [IO.File]::WriteAllText((Join-Path $replayFolder ($name+'-expansion-preflight.json')),($collisions | ConvertTo-Json -Depth 6),[Text.UTF8Encoding]::new($false))
  for($i=1;$i -le $count;$i++){[void]$table.ListRows.Add([int]($table.ListRows.Count+1),$true)}
  foreach($collision in $collisions){
   $moved=$sheet.Cells.Item($collision.row+$count,$collision.column)
   if([bool]$moved.HasFormula -ne $collision.hasFormula -or (-not $collision.hasFormula -and $moved.Value2 -ne $collision.value)){throw 'Native row insertion did not preserve displaced content'}
   $receipt.expansionCellsPreserved+=@{fromRow=$collision.row;toRow=$collision.row+$count;column=$collision.column;value=$collision.value;hasFormula=$collision.hasFormula;method='Native ListRows.Add with AlwaysInsert=true'}
  }
  $sourceRow=$table.Range.Rows.Item($oldRows)
  for($i=1;$i -le $count;$i++){$sourceRow.Copy($table.Range.Rows.Item($oldRows+$i))}
  foreach($column in $tableSchema.columns){
   $decodedHeader=[regex]::Replace([string]$column.name,'_x([0-9A-Fa-f]{4})_', { [string][char][Convert]::ToInt32($args[0].Groups[1].Value,16) })
   $idx=$map[$decodedHeader]
   if(-not $idx){throw "Header not found: $name/$($column.name)"}
   $newRange=$table.Range.Cells.Item($oldRows+1,$idx).Resize($count,1)
   if(-not $column.formula){$newRange.ClearContents()}
   elseif($newRange.HasFormula -ne $true){throw "Expanded formula column incomplete: $name/$($column.name)"}
  }
  $nextRows[$name]=$oldEnd+1
 }
 State 'APPLYING_STAGED_NAMED_ROWS'
 foreach($entry in $inputs.rows){
  $tableName=[string]$entry.targetTable; $table=$tables[$tableName];$map=$columnMaps[$tableName]
  if(-not $table){throw 'Unknown target table'}
  $role=if($tableName -eq 'SkaterStatsByGame'){'Skater'}else{'Goalie'}
  $player=[string]$entry.inputs.Name; $game=[int]$entry.inputs.'Game #'
  if($player -in @('Congiusti, Marco','Unknown, Johnny')){throw 'Excluded identity in candidate'}
  $matched=@($plan.updateMatchedNamedRows | Where-Object { $_.name -eq $player -and $_.gameNumber -eq $game -and $_.role -eq $role })
  if($matched.Count -gt 1){throw 'Ambiguous matched input row'}
  if($matched.Count -eq 1){
   $row=[int]$matched[0].existingRow
   if($sheet.Cells.Item($row,$table.Range.Column+$map['Name']-1).Value2 -ne $player -or [int]$sheet.Cells.Item($row,$table.Range.Column+$map['Game #']-1).Value2 -ne $game){throw 'Matched source identity changed'}
  }else{
   $planned=@($plan.appendNewNamedRows | Where-Object { $_.name -eq $player -and $_.gameNumber -eq $game -and $_.role -eq $role })
   if($planned.Count -ne 1){throw 'Unplanned append'}
   $row=[int]$nextRows[$tableName];$nextRows[$tableName]=$row+1
  }
  foreach($property in $entry.inputs.PSObject.Properties){
   $idx=$map[$property.Name]
   if(-not $idx){throw "Input header missing: $($property.Name)"}
   $cell=$sheet.Cells.Item($row,$table.Range.Column+$idx-1)
   if($cell.HasFormula){throw "Refusing formula overwrite: $player/$($property.Name)"}
   if($null -eq $property.Value){
    $receipt.missingObservationsRetained+=@{name=$player;game=$game;field=$property.Name;copyRow=$row;existingValue=$cell.Value2;sourceVerified=$false}
    continue
   }
   if($property.Value -is [ValueType]){$cell.Value2=[double]$property.Value}else{$cell.Value2=[string]$property.Value}
   $receipt.writes++
  }
 }
 if($nextRows['SkaterStatsByGame'] -ne 4709 -or $nextRows['GoalieStatsByGame'] -ne 367){throw 'Append row count mismatch'}
 for($i=1;$i -le $award.ListColumns.Count;$i++){
  $cell=$award.DataBodyRange.Cells.Item(1,$i)
  if([string]$cell.Formula -ne $before[$i-1].formula -or [bool]$cell.HasArray -ne $before[$i-1].hasArray){throw 'Award formula or array mode changed during import'}
 }
 $receipt.formulaFirstRowChecksBeforeRecalculation=$before.Count
 $receipt.tableExtents=@{SkaterStatsByGame=$tables['SkaterStatsByGame'].Range.Address();GoalieStatsByGame=$tables['GoalieStatsByGame'].Range.Address()}
 State 'RECALCULATING_DISPOSABLE_COPY'
 $excel.CalculateFullRebuild()
 if($excel.CalculationState -ne 0){throw 'Excel calculation is incomplete'}
 State 'EXTRACTING_REVIEW_RESULTS'
 $values=$award.DataBodyRange.Value2
 $rows=@();$errors=@()
 for($r=1;$r -le $award.DataBodyRange.Rows.Count;$r++){
  $record=[ordered]@{}
  for($c=1;$c -le $award.ListColumns.Count;$c++){
   $v=$values.GetValue($r,$c);$field=[string]$award.ListColumns.Item($c).Name
   $record[$field]=$v
   if($v -is [int] -and $v -lt -2000000000){$errors+=@{row=$r;field=$field;errorCode=$v}}
  }
  $rows+=,$record
 }
 $result=[ordered]@{state='REVIEW_CALCULATION_ONLY';seasonSelector=$book.Worksheets.Item('Master Schedule').Range('C1').Value2;rows=$rows;cellErrors=$errors;missingSourceInputs=$receipt.missingObservationsRetained;currentScoresVerified=$false;publicationAuthorized=$false}
 [IO.File]::WriteAllText((Join-Path $replayFolder 'calculated-awards-review.json'),($result | ConvertTo-Json -Depth 14),[Text.UTF8Encoding]::new($false))
 for($i=1;$i -le $award.ListColumns.Count;$i++){
  $cell=$award.DataBodyRange.Cells.Item(1,$i)
  if([string]$cell.Formula -ne $before[$i-1].formula -or [bool]$cell.HasArray -ne $before[$i-1].hasArray){throw 'Award formula or array mode changed after recalculation'}
 }
 $receipt.formulaFirstRowChecksAfterRecalculation=$before.Count
 $receipt.calculationState=[int]$excel.CalculationState;$receipt.awardCellErrors=$errors.Count
 State 'SAVING_DISPOSABLE_COPY'
 $book.Save()
 $receipt.copySaved=$true
 State 'REVIEW_COPY_SAVED_NEEDS_XML_AND_SOURCE_PARITY_CHECKS'
} catch {
 $receipt.error=$_.Exception.Message
 State 'FAILED_REVIEW_ONLY'
 throw
} finally {
 if($null -ne $book){$book.Close($false)}
 if($null -ne $excel){$excel.Quit();[void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($excel)}
 $receipt.sourceHashUnchanged=((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLower() -eq $expected)
 State ([string]$receipt.state)
}

