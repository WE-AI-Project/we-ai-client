$WshShell = New-Object -ComObject WScript.Shell
$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktopPath "SynAIpse.lnk"

$shortcut = $WshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "wscript.exe"
$shortcut.Arguments = "`"C:\Users\USER\orca\workspaces\we-ai-client\pteropod\launch-synaipse.vbs`""
$shortcut.WorkingDirectory = "C:\Users\USER\orca\workspaces\we-ai-client\pteropod"
$shortcut.Description = "SynAIpse - Intelligent Multi-Agent Project Management Platform"
$shortcut.WindowStyle = 1
$shortcut.Save()

Write-Host "SynAIpse Desktop Shortcut created successfully at: $shortcutPath"
