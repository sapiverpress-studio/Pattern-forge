from pathlib import Path
p=Path('app/js/editor.js')
s=p.read_text(encoding='utf-8')
old='''  renderAll();
  loadAutosave();
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")saveAutosave();});
'''
new='''  renderAll();
  const explicitWorkspaceEntry=new URLSearchParams(location.search).get("workspace");
  if(!["pattern","doodle"].includes(explicitWorkspaceEntry))loadAutosave();
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")saveAutosave();});
'''
if old not in s: raise SystemExit('loadAutosave init anchor not found')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
print('Explicit New Pattern/New Doodle routes no longer reopen autosave')
