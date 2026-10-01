from pathlib import Path
p=Path('app/js/workspace.js')
s=p.read_text()
old='''    const card = document.querySelector('.projectSetupCard');
    const heading = card?.querySelector('h2');
    const intro = card?.querySelector('.projectSetupIntro');'''
new='''    const heading = document.getElementById('projectSetupTitle');
    const intro = document.getElementById('projectSetupIntro');'''
if old not in s: raise SystemExit('workspace heading anchor missing')
s=s.replace(old,new,1)
p.write_text(s)
print('workspace router refined for resume prompt')
