from pathlib import Path

html_path = Path('app/index.html')
js_path = Path('app/js/editor.js')

html = html_path.read_text(encoding='utf-8')
js = js_path.read_text(encoding='utf-8')

old_button = '<button id="cancelProjectSetup" class="btn full" type="button" hidden>Back to current project</button>'
new_button = '<button id="cancelProjectSetup" class="btn full" type="button">Cancel</button>'
if html.count(old_button) != 1:
    raise SystemExit(f'Expected one cancel button anchor, found {html.count(old_button)}')
html = html.replace(old_button, new_button)

old_show = '''    $("cancelProjectSetup").hidden=!state.project;\n    $("cancelProjectSetup").textContent=state.project?.isPractice?"Back to practice":"Back to current project";'''
new_show = '''    $("cancelProjectSetup").hidden=false;\n    $("cancelProjectSetup").textContent="Cancel";'''
if js.count(old_show) != 1:
    raise SystemExit(f'Expected one showProjectSetup cancel block, found {js.count(old_show)}')
js = js.replace(old_show, new_show)

old_handler = '  $("cancelProjectSetup").addEventListener("click",()=>{$("projectSetupOverlay").hidden=true;});'
new_handler = '''  $("cancelProjectSetup").addEventListener("click",()=>{\n    if(state.project){$("projectSetupOverlay").hidden=true;return;}\n    window.location.assign("/");\n  });'''
if js.count(old_handler) != 1:
    raise SystemExit(f'Expected one cancel click handler, found {js.count(old_handler)}')
js = js.replace(old_handler, new_handler)

html_path.write_text(html, encoding='utf-8')
js_path.write_text(js, encoding='utf-8')

print('Applied project setup Cancel UX patch.')
