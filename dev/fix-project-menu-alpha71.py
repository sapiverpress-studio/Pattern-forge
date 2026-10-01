from pathlib import Path
p=Path('app/js/editor.js')
s=p.read_text()
old='''  function showProjectSetup(){
    const overlay=$("projectSetupOverlay");overlay.hidden=false;'''
new='''  function showProjectSetup(){
    pendingAutosaveData=null;
    $("resumePrompt").hidden=true;
    $("newProjectSetup").hidden=false;
    const overlay=$("projectSetupOverlay");overlay.hidden=false;'''
if old not in s: raise SystemExit('showProjectSetup anchor missing')
s=s.replace(old,new,1)
p.write_text(s)
print('project menu now restores normal setup view')
