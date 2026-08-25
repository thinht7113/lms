# LMS Crawler Tool - PowerShell Launcher
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$py = "$PSScriptRoot\.venv\Scripts\python.exe"
if (-not (Test-Path $py)) {
    $py = "D:\BT\LMS\lms-backend\.venv\Scripts\python.exe"
}
& $py -X utf8 -m main @args
