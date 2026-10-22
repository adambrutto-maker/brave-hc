# Plan03 Optional 499 — BRUTTECH 1 ONLY. Private disposable staging, NEVER original.
# Requires current source hashes and exactly two official HTO opponent names.
# No automatic original adoption, HTO CMS changes or website publication.
$ErrorActionPreference='Stop'
$root='D:\BruTTech\Products\HockeyOS'
$original=Join-Path $root 'Reference Implementations\Brave H.C\01 Team Records\261001_Brave_HC_Master_Workbook.xlsx'
$source=Join-Path $root 'Plan03\Excel_Disposable_Composite_FullRecalc_261021_01\01_Full_Calculation_Review_COPY.xlsx'
$periods=Join-Path $root 'Plan03\source-archive\261021_HTO_Official_Four_Game_Periods_PRIVATE.json'
$folder=Join-Path $root 'Plan03\Excel_Disposable_Optional499_261022_01'
$rollback=Join-Path $folder '00_497_Input_Verbatim_DoNotEdit.xlsx'
$candidate=Join-Path $folder '01_Optional499_OpponentNames_COPY.xlsx'
$stage=Join-Path $folder '00_Stage_Progress.json'
$receipt=Join-Path $folder '02_Optional499_Excel_Receipt.json'
$originalSHA='0002FD9F06596AF8D0A00FC1B53A618EF15479F941AD5C1E6265B27002A65154'
$sourceSHA='DE9BC6ED615A7C330809A0B2F8888F42C357D641F2A2266E0FCA20914521F979'
$periodSHA='81790E38B0FF2A4563CB4FBF5D94911640E4BDD41A736D8E5C5FC419CEE9066C'
$excel=$null;$workbook=$null;$worksheet=$null
$phase='PREFLIGHT';$reason=$null;$saved=$false;$written=@()
function ReadSHA256($path){(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash}
function SaveStage($name){
  $state=[ordered]@{schema='brave-hc-private-optional499-stage/v1';
   at=(Get-Date).ToUniversalTime().ToString('o');state=$name;originalEdited=$false}
  $state|ConvertTo-Json -Compress|Set-Content -LiteralPath $stage -Encoding UTF8
}
try {
  if(Test-Path $folder){throw 'TARGET_ALREADY_EXISTS_REFUSE_OVERWRITE'}
  if(@(Get-Process EXCEL -ErrorAction SilentlyContinue).Count -ne 0){throw 'EXCEL_ALREADY_RUNNING_HOLD'}
  foreach($check in @(@($original,$originalSHA),@($source,$sourceSHA),@($periods,$periodSHA))){
    if(-not (Test-Path -LiteralPath $check[0])){throw 'SOURCE_EVIDENCE_NOT_FOUND'}
    if((ReadSHA256 $check[0]) -ne $check[1]){throw 'SOURCE_EVIDENCE_HASH_DRIFT'}
  }
  $sourceData=Get-Content -LiteralPath $periods -Raw -Encoding UTF8|ConvertFrom-Json
  if($sourceData.schema -ne 'brave-hc-private-hto-official-period-source/v1' -or
     $sourceData.state -ne 'OFFICIAL_PERIODS_VERIFIED_REVIEW_ONLY' -or
     $sourceData.games.Count -ne 4){throw 'OFFICIAL_HTO_SOURCE_AUTHORITY_CHANGED'}
  $expected=@(
    @{gid=3356177;game=359;name='Dateline Predators'},
    @{gid=3356178;game=360;name='Mohawks H.C.'},
    @{gid=3369564;game=361;name='Michelob Morts'},
    @{gid=3375601;game=362;name='Zamboner Crew'})
  foreach($item in $expected){
    $matched=@($sourceData.games|Where-Object{[int]$_.htoGameId -eq $item.gid})
    if($matched.Count -ne 1 -or [int]$matched[0].workbookGameNumber -ne $item.game -or
       [string]$matched[0].opponent -cne $item.name){throw 'HTO_OPPONENT_IDENTITY_NOT_GROUNDED'}
  }
  $null=New-Item -ItemType Directory -Path $folder
  Copy-Item -LiteralPath $source -Destination $rollback
  Copy-Item -LiteralPath $rollback -Destination $candidate
  if((ReadSHA256 $rollback) -ne $sourceSHA -or (ReadSHA256 $candidate) -ne $sourceSHA){
    throw 'DISPOSABLE_COPIES_FAILED_VERBATIM_SOURCE_CHECK'
  }
  SaveStage 'VERBATIM_BACKUP_CREATED'
  Write-Output 'PRIVATE_497_SOURCE_AND_499_DISPOSABLE_COPIES_READY'
  $phase='OPEN_PRIVATE_COPY'
  $excel=New-Object -ComObject Excel.Application
  $excel.Visible=$false;$excel.DisplayAlerts=$false
  $excel.EnableEvents=$false;$excel.ScreenUpdating=$false
  $excel.AskToUpdateLinks=$false;$excel.AutomationSecurity=3
  SaveStage $phase
  $workbook=$excel.Workbooks.Open($candidate,0,$false)
  if($null -eq $workbook -or $workbook.ReadOnly){throw 'DISPOSABLE_WORKBOOK_NOT_WRITABLE'}
  if($workbook.Worksheets.Count -ne 17){throw 'SEVENTEEN_SHEETS_NOT_PRESENT'}
  if([int]$excel.Calculation -ne -4135){throw 'ORIGINAL_MANUAL_CALCULATION_MODE_CHANGED'}
  $worksheet=$workbook.Worksheets.Item('Master Schedule')
  if($worksheet.ProtectContents){throw 'MASTER_SCHEDULE_PROTECTED'}
  if($worksheet.Range('H370').Value2 -cne 'Dateline Predators' -or
     $worksheet.Range('H371').Value2 -cne 'Mohawks HC' -or
     $null -ne $worksheet.Range('H372').Value2 -or
     $null -ne $worksheet.Range('H373').Value2){throw 'LEGACY_OPPONENT_BASELINE_CHANGED'}
  if($worksheet.Range('X374').Value2 -ne 0 -or
     $null -ne $worksheet.Range('H374').Value2){throw 'PREVIEW_FIFTH_GAME_HAS_BEEN_ADMITTED'}
  foreach($row in @(372,373)){
    foreach($column in @('F','G','I')){
      if($null -ne $worksheet.Range($column+$row).Value2){throw 'UNVERIFIED_GAME_METADATA_ALREADY_PRESENT'}
    }
  }
  $mapping=@(@{row=372;game=361;name='Michelob Morts'},@{row=373;game=362;name='Zamboner Crew'})
  $phase='WRITE_TWO_VERIFIED_NAMES_PRIVATE_ONLY';SaveStage $phase
  foreach($item in $mapping){
    if([int]$worksheet.Range('B'+$item.row).Value2 -ne $item.game){throw 'HTO_GAME_ROW_IDENTITY_DRIFT'}
    $cell=$worksheet.Range('H'+$item.row)
    if($cell.HasFormula -or $null -ne $cell.Value2){throw 'SOURCE_OPPONENT_INPUT_ALREADY_FILLED'}
    $cell.Value2=[string]$item.name
    $written+=@{address='H'+$item.row;name=$item.name}
  }
  if($written.Count -ne 2){throw 'EXPECTED_TWO_SOURCE_OPPONENT_CHANGES'}
  if($worksheet.Range('H371').Value2 -cne 'Mohawks HC' -or
     $null -ne $worksheet.Range('H374').Value2){throw 'UNAPPROVED_ALIAS_OR_FUTURE_GAME_EDIT'}
  $phase='SAVE_DISPOSABLE_METADATA_CANDIDATE';SaveStage $phase
  $workbook.Save()
  $saved=$true
  SaveStage 'PRIVATE_499_METADATA_SAVED_INDEPENDENT_QA_PENDING'
  Write-Output 'OPTIONAL_499_PRIVATE_OPPONENT_NAMES_SAVED_NEEDS_INDEPENDENT_QA'
} catch {
  $reason=$_.Exception.Message
  Write-Output ('OPTIONAL_499_METADATA_HOLD_'+$phase+':'+$reason)
  if(Test-Path $folder){SaveStage ('HOLD_'+$phase)}
} finally {
  # Receipt is recorded BEFORE COM cleanup; Excel can stall during Close/Quit.
  if(Test-Path $folder){
    $report=[ordered]@{schema='brave-hc-private-optional499-disposable/v1';
      at=(Get-Date).ToUniversalTime().ToString('o');status=$phase;error=$reason;
      source497SHA=(ReadSHA256 $source);originalSHA=(ReadSHA256 $original);
      rollbackSHA=if(Test-Path $rollback){ReadSHA256 $rollback}else{$null};
      candidateSHA=if(Test-Path $candidate){ReadSHA256 $candidate}else{$null};
      saved=$saved;enteredOpponentNames=$written;
      originalWorkbookModified=$false;publicPublisherModified=$false;
      full499ModelRecalculationCertified=$false;ownerOriginalWorkbookApproval=$false}
    $report|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $receipt -Encoding UTF8
    Write-Output ('PRIVATE_OPPONENT_METADATA_RECEIPT='+$receipt)
  }
  if($workbook -ne $null){try{$workbook.Close($false)|Out-Null}catch{Write-Output ('CLOSE_WARNING_'+$_.Exception.Message)}}
  foreach($item in @($worksheet,$workbook)){
    if($item -ne $null){try{[void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($item)}catch{}}
  }
  if($excel -ne $null){
    try{$excel.Quit()}catch{Write-Output ('EXCEL_QUIT_WARNING_'+$_.Exception.Message)}
    try{[void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($excel)}catch{}
  }
  [GC]::Collect();[GC]::WaitForPendingFinalizers();[GC]::Collect()
}
if(-not $saved){exit 2}
