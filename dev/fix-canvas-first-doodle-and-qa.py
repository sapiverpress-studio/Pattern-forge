from pathlib import Path
p=Path('app/js/canvas-first-v2.js')
s=p.read_text(encoding='utf-8')

old="""(() => {
  const $ = id => document.getElementById(id);
"""
new="""(() => {
  if(new URLSearchParams(location.search).get('legacy')==='1') return;
  const $ = id => document.getElementById(id);
"""
if "get('legacy')==='1'" not in s:
    if old not in s: raise SystemExit('adapter start anchor missing')
    s=s.replace(old,new,1)

old2="const patternDock=document.querySelector('[data-ux2-panel=\"pattern\"]');if(patternDock)patternDock.hidden=doodle;"
new2="const patternDock=document.querySelector('[data-ux2-panel=\"pattern\"]');if(patternDock){patternDock.hidden=doodle;patternDock.style.display=doodle?'none':'';}"
if old2 not in s: raise SystemExit('pattern dock anchor missing')
s=s.replace(old2,new2,1)

p.write_text(s,encoding='utf-8')
print('Doodle Pattern dock hidden reliably; legacy=1 bypass available for engine regression QA')
