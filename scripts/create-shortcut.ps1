$WshShell = New-Object -ComObject WScript.Shell
$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktopPath "SynAIpse.lnk"

# 이 스크립트는 <repo>\scripts\ 아래에 있으므로, 상위 폴더가 프로젝트 루트다.
$projectRoot = Split-Path -Parent $PSScriptRoot
$vbsPath = Join-Path $projectRoot "launch-synaipse.vbs"

$shortcut = $WshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "wscript.exe"
$shortcut.Arguments = "`"$vbsPath`""
$shortcut.WorkingDirectory = $projectRoot
$shortcut.Description = "SynAIpse - Intelligent Multi-Agent Project Management Platform"
$shortcut.WindowStyle = 1
$shortcut.Save()

Write-Host "SynAIpse Desktop Shortcut created successfully at: $shortcutPath"
