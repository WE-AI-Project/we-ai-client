Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")
scriptDir = objFSO.GetParentFolderName(WScript.ScriptFullName)
WshShell.Run chr(34) & scriptDir & "\launch-synaipse.bat" & Chr(34), 0
Set WshShell = Nothing
Set objFSO = Nothing
