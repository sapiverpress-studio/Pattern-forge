from pathlib import Path

p = Path('app/index.html')
s = p.read_text(encoding='utf-8')

css_anchor = '<link rel="stylesheet" href="/app/assets/editor.css">'
css_repl = css_anchor + '\n<link rel="stylesheet" href="/app/assets/canvas-first-v2.css">'
if '/app/assets/canvas-first-v2.css' not in s:
    if css_anchor not in s:
        raise SystemExit('editor stylesheet anchor missing')
    s = s.replace(css_anchor, css_repl, 1)

script_anchor = '<script src="/app/js/workspace.js"></script>'
script_repl = script_anchor + '\n<script src="/app/js/canvas-first-v2.js"></script>'
if '/app/js/canvas-first-v2.js' not in s:
    if script_anchor not in s:
        raise SystemExit('workspace script anchor missing')
    s = s.replace(script_anchor, script_repl, 1)

s = s.replace('<meta name="theme-color" content="#2c5f54">','<meta name="theme-color" content="#526d8f">')
s = s.replace('<meta name="app-version" content="1.2.0-alpha.7.0">','<meta name="app-version" content="1.3.0-ux2-alpha.1">')

p.write_text(s, encoding='utf-8')
print('Canvas-first shell linked into real editor')
