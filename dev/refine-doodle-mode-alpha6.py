from pathlib import Path

path=Path('index.html')
text=path.read_text(encoding='utf-8')

css_anchor='''  .advancedDisclosure{margin:12px 0;border:1px solid var(--line);border-radius:10px;background:#fff}\n'''
css_new='''  .doodle-project #patternScatterDisclosure,.doodle-project #repeatControls,.doodle-project #repeatPreviewToggle,.doodle-project #repeatPreviewHeading,.doodle-project #preview,.doodle-project #previewScaleField{display:none!important}\n  .advancedDisclosure{margin:12px 0;border:1px solid var(--line);border-radius:10px;background:#fff}\n'''
if text.count(css_anchor)!=1: raise SystemExit(f'CSS anchor guard failed: {text.count(css_anchor)}')
text=text.replace(css_anchor,css_new,1)

old='''    $("projectSetupIntro").textContent=state.project?.isPractice?"Turn your current practice artwork into a named print project. Your drawing is kept, and its straight repeat stays in place.":"Jump straight into a practice tile, or set up a print project with its name, customer, colourway and repeat layout.";'''
new='''    $("projectSetupIntro").textContent=state.project?.isPractice?"Turn your current practice artwork into a named Pattern Project. Your drawing is kept, and its straight repeat stays in place.":"Jump straight into a practice tile, or create a seamless Pattern Project or standalone Doodle Project.";'''
if text.count(old)!=1: raise SystemExit(f'setup copy guard failed: {text.count(old)}')
text=text.replace(old,new,1)

path.write_text(text,encoding='utf-8')
print('Refined Doodle Mode visibility and setup copy')
