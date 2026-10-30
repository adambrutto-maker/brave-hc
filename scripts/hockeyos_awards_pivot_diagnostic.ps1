$ErrorActionPreference='Stop'
$baseline='D:\BruTTech\Products\HockeyOS\261019_Award_GameLog_Staging_v1\Disposable_Awards_Replay_20261021_023525\Review_Only_Master_Workbook.xlsx'
$source='D:\BruTTech\Products\HockeyOS\Reference Implementations\Brave H.C\01 Team Records\261001_Brave_HC_Master_Workbook.xlsx'
$baselineHash='4cdb22400d8eb849b9f039feec19a72e590c586014c39ba07be1a48b7939d311'
$sourceHash='0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154'
$folder='D:\BruTTech\Products\HockeyOS\261019_Award_GameLog_Staging_v1\Pivot_Diagnostic_'+[DateTime]::UtcNow.ToString('yyyyMMdd_HHmmss')
if((Get-FileHash -LiteralPath $baseline).Hash.ToLower() -ne $baselineHash){throw 'Baseline changed'}
if((Get-FileHash -LiteralPath $source).Hash.ToLower() -ne $sourceHash){throw 'Original changed'}
New-Item -ItemType Directory -Path $folder | Out-Null
$copy=Join-Path $folder 'Review_Only_Pivot_Diagnostic.xlsx'
Copy-Item -LiteralPath $baseline -Destination $copy
$receipt=[ordered]@{state='COPY_CREATED';copy=$copy;originalModified=$false;currentScoresVerified=$false;publicationAuthorized=$false;pivots=@()}
$receiptPath=Join-Path $folder 'pivot-runtime.json'
[IO.File]::WriteAllText('C:\Users\adamb\AppData\Local\Temp\awards-pivot-diagnostic-receipt-path.txt',$receiptPath)
function State($value){$receipt.state=$value;$receipt.observedAt=[DateTime]::UtcNow.ToString('o');[IO.File]::WriteAllText($receiptPath,($receipt|ConvertTo-Json -Depth 10))}
$excel=$null;$book=$null
try{
 State 'OPENING_DIAGNOSTIC_COPY'
 $excel=New-Object -ComObject Excel.Application
 $excel.Visible=$false;$excel.DisplayAlerts=$false;$excel.EnableEvents=$false;$excel.AutomationSecurity=3;$excel.AskToUpdateLinks=$false
 $book=$excel.Workbooks.Open($copy,0,$false)
 $openedPath=[string]$book.FullName
 $receipt.openedFullName=$openedPath;$receipt.openedReadOnly=[bool]$book.ReadOnly
 if([string]::IsNullOrWhiteSpace($openedPath)){throw 'Excel returned an empty FullName; refresh prohibited'}
 if($book.ReadOnly -or [IO.Path]::GetFullPath($openedPath) -ne [IO.Path]::GetFullPath($copy)){throw 'Copy open mismatch'}
 $excel.Calculation=-4135
 $sheet=$book.Worksheets.Item('Player Stats')
 foreach($name in @('PlayerStatsBySeason','GoalieStatsBySeason')){
  State ('REFRESHING_'+$name)
  $pivot=$sheet.PivotTables($name)
  $pivot.PivotCache().Refresh()
  if(-not $pivot.RefreshTable()){throw 'Pivot refresh returned false'}
  $receipt.pivots+=@{name=$name;records=$pivot.PivotCache().RecordCount;range=$pivot.TableRange2.Address()}
 }
 State 'SAVING_PIVOT_DIAGNOSTIC_ONLY'
 $excel.CalculateBeforeSave=$false
 $book.Save()
 $receipt.copySaved=$true
 $receipt.sourceHashUnchanged=((Get-FileHash -LiteralPath $source).Hash.ToLower() -eq $sourceHash)
 $receipt.baselineHashUnchanged=((Get-FileHash -LiteralPath $baseline).Hash.ToLower() -eq $baselineHash)
 State 'PIVOTS_REFRESHED_DOWNSTREAM_NOT_RECALCULATED'
}catch{$receipt.error=$_.Exception.Message;State 'FAILED';throw}
finally{if($null -ne $book){$book.Close($false)};if($null -ne $excel){$excel.Quit()}}
Write-Output ($receipt|ConvertTo-Json -Depth 10)
