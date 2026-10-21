$ErrorActionPreference='Stop'
$base='D:\BruTTech\Products\HockeyOS\261019_Award_GameLog_Staging_v1'
$baseline=Join-Path $base 'Carlyle_Metadata_Review_20261021_052450\Review_Only_Metadata_Candidate.xlsx'
$baselineHash='68392eccdd7087f4efbc32cabf23cb308aa7843eb33df72d714a3a099754a132'
$source='D:\BruTTech\Products\HockeyOS\Reference Implementations\Brave H.C\01 Team Records\261001_Brave_HC_Master_Workbook.xlsx'
$sourceHash='0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154'
$schemaPath='C:\Users\adamb\AppData\Local\Temp\hockeyos-awards-source-formula-inspection.json'
if((Get-FileHash -LiteralPath $schemaPath).Hash.ToLower() -ne '2e90a8cacad89ebfc714548ca5f24751bcfe9745f065112c91ede3a75552adae'){throw 'Schema changed'}
foreach($check in @(@{path=$source;hash=$sourceHash},@{path=$baseline;hash=$baselineHash})){
 if((Get-FileHash -LiteralPath $check.path).Hash.ToLower() -ne $check.hash){throw 'Input workbook changed'}
}
$folder=Join-Path $base ('Carlyle_DI_Review_'+[DateTime]::UtcNow.ToString('yyyyMMdd_HHmmss'))
New-Item -ItemType Directory -Path $folder|Out-Null
$copy=Join-Path $folder 'Review_Only_Metadata_Candidate.xlsx'
Copy-Item -LiteralPath $baseline -Destination $copy
$check=Get-Item -LiteralPath $copy
while($null -ne $check){if($check.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Redirected path rejected'};$check=if($check -is [IO.FileInfo]){$check.Directory}else{$check.Parent}}
& 'C:\Users\adamb\AppData\Local\Programs\Python\Python312\python.exe' -c 'import os,sys;assert not os.path.samefile(sys.argv[1],sys.argv[2]);assert os.stat(sys.argv[2]).st_nlink==1' $source $copy
if($LASTEXITCODE -ne 0){throw 'Copy alias rejected'}
$receipt=[ordered]@{state='COPY_CREATED';copy=$copy;baseline=$baseline;source=$source;currentScoresVerified=$false;publicationAuthorized=$false;recalculationPerformed=$false;rosterStatus='DI';rosterStatusSource='Adam direct confirmation, October 21 2026';playerName='Carlyle, Adam';addedRows=@();writes=@();displacedCells=@()}
$receiptPath=Join-Path $folder 'metadata-runtime.json'
[IO.File]::WriteAllText('C:\Users\adamb\AppData\Local\Temp\awards-carlyle-di-current-receipt.txt',$receiptPath)
function State($s){$receipt.state=$s;$receipt.observedAt=[DateTime]::UtcNow.ToString('o');[IO.File]::WriteAllText($receiptPath,($receipt|ConvertTo-Json -Depth 12))}
$excel=$null;$book=$null;$books=$null
try{
 State 'OPENING_METADATA_COPY'
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
 # Only the confirmed raw status changes on the existing identity row.
 $pi=$sheet.ListObjects.Item('PlayerInfo')
 if($pi.Range.Row+$pi.Range.Rows.Count-1 -ne 116){throw 'PlayerInfo extent changed'}
 $identity=$pi.ListColumns.Item('Website Name').DataBodyRange.Value2;$matches=@()
 for($i=1;$i -le $pi.ListRows.Count;$i++){if($identity.GetValue($i,1) -eq 'Carlyle, Adam'){$matches+=,$i}}
 if($matches.Count -ne 1){throw 'Unique Carlyle identity required'}
 $statusCell=$pi.ListColumns.Item('Current Roster Status').DataBodyRange.Cells.Item($matches[0],1)
 if($statusCell.HasFormula -or -not [string]::IsNullOrEmpty([string]$statusCell.Value2)){throw 'Expected blank raw status'}
 $statusCell.Value2='DI'
 $receipt.writes+=@{table='PlayerInfo';row=$statusCell.Row;field='Current Roster Status';value='DI';existingCell=([string]$statusCell.Address()).Replace('$','')}
 $jobs=@(
  @{table='RosterStatusBySeason';oldEnd=496;key='Name';values=@{'Name'='Carlyle, Adam';'Season'='W2026/27';'Status'='DI'}}
 )
 foreach($job in $jobs){
  State ('PREFLIGHT_'+$job.table)
  $table=$sheet.ListObjects.Item($job.table);$defs=@($schema.tables|Where-Object name -eq $job.table)
  if($defs.Count -ne 1 -or $table.ShowTotals -or $table.Range.Row+$table.Range.Rows.Count-1 -ne $job.oldEnd){throw 'Unexpected source table'}
  $map=@{};for($i=1;$i -le $table.ListColumns.Count;$i++){$map[[string]$table.ListColumns.Item($i).Name]=$i}
  if($map.Count -ne $defs[0].columns.Count){throw 'Schema/header count differs'}
  $names=$table.ListColumns.Item($job.key).DataBodyRange.Value2
  for($i=1;$i -le $table.ListRows.Count;$i++){if($names.GetValue($i,1) -eq 'Carlyle, Adam'){throw 'Carlyle already exists'}}
  $raw=@();$calculated=@()
  foreach($d in $defs[0].columns){
   $header=[regex]::Replace([string]$d.name,'_x([0-9A-Fa-f]{4})_', { [string][char][Convert]::ToInt32($args[0].Groups[1].Value,16) })
   if(-not $map.ContainsKey($header)){throw 'Unknown schema header'}
   $last=$table.DataBodyRange.Cells.Item($table.ListRows.Count,$map[$header])
   if([bool]$last.HasFormula -ne [bool]$d.formula){throw "Last row formula classification differs: $header"}
   if($d.formula){$calculated+=@{column=$map[$header];array=[bool]$last.HasArray}}else{$raw+=$map[$header]}
  }
  foreach($key in $job.values.Keys){if($map[$key] -notin $raw){throw 'Proposed input is not a raw field'}}
  $oldRows=$table.Range.Rows.Count;$collisions=@()
  for($i=1;$i -le $table.ListColumns.Count;$i++){$c=$sheet.Cells.Item($job.oldEnd+1,$table.Range.Column+$i-1);if($null -ne $c.Value2 -or $c.HasFormula){$collisions+=@{row=$c.Row;column=$c.Column;value=$c.Value2;formula=[string]$c.Formula;array=[bool]$c.HasArray;hasFormula=[bool]$c.HasFormula}}}
  [void]$table.ListRows.Add([int]($table.ListRows.Count+1),$true)
  foreach($c in $collisions){$moved=$sheet.Cells.Item($c.row+1,$c.column);if([bool]$moved.HasFormula -ne $c.hasFormula -or (-not $c.hasFormula -and $moved.Value2 -ne $c.value)){throw 'Displaced content changed'};$receipt.displacedCells+=@{fromRow=$c.row;toRow=$c.row+1;column=$c.column;value=$c.value;hasFormula=$c.hasFormula}}
  $table.Range.Rows.Item($oldRows).Copy($table.Range.Rows.Item($oldRows+1))|Out-Null
  foreach($idx in $raw){$table.DataBodyRange.Cells.Item($table.ListRows.Count,$idx).ClearContents()|Out-Null}
  foreach($c in $calculated){$new=$table.DataBodyRange.Cells.Item($table.ListRows.Count,$c.column);if(-not $new.HasFormula -or [bool]$new.HasArray -ne $c.array){throw 'Copied calculated mode differs'}}
  foreach($key in $job.values.Keys){$cell=$table.DataBodyRange.Cells.Item($table.ListRows.Count,$map[$key]);$cell.Value2=[string]$job.values[$key];$receipt.writes+=@{table=$job.table;row=$cell.Row;field=$key;value=$job.values[$key]}}
  $receipt.addedRows+=@{table=$job.table;row=$job.oldEnd+1;columnStart=$table.Range.Column;columnCount=$table.ListColumns.Count;range=$table.Range.Address()}
 }
 for($i=1;$i -le $award.ListColumns.Count;$i++){$c=$award.DataBodyRange.Cells.Item(1,$i);if([string]$c.Formula -ne $awardBefore[$i-1].formula -or [bool]$c.HasArray -ne $awardBefore[$i-1].array){throw 'Scoring formula changed'}}
 $receipt.awardFormulaModeChecks=146;$receipt.unresolvedMetadata=@('Position 2');$receipt.rosterStatusConfirmationApplied=$true;$receipt.expectedWrites=4
 State 'SAVING_METADATA_COPY_WITHOUT_RECALCULATION'
 $book.Save();$receipt.copySaved=$true
 State 'METADATA_COPY_SAVED_REQUIRES_XML_CHECKS_AND_DOWNSTREAM_CALCULATION'
}catch{$receipt.error=$_.Exception.Message;State 'FAILED_REVIEW_ONLY';throw}
finally{
 if($null -ne $book){$book.Close($false)}
 if($null -ne $excel){$excel.Quit()}
 $receipt.sourceHashUnchanged=((Get-FileHash -LiteralPath $source).Hash.ToLower() -eq $sourceHash)
 $receipt.baselineHashUnchanged=((Get-FileHash -LiteralPath $baseline).Hash.ToLower() -eq $baselineHash)
 State ([string]$receipt.state)
}
