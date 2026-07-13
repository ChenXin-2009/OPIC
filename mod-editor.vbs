CreateObject("WScript.Shell").Run """" & CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & "\src\lib\mods\mod-editor\mod-editor.exe""", 0, False
