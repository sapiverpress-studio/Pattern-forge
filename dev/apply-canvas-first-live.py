from pathlib import Path

index = Path('app/index.html')
s = index.read_text(encoding='utf-8')
s = s.replace('<meta name="theme-color" content="#2c5f54">', '<meta name="theme-color" content="#6f89a8">')
if '/app/assets/canvas-first.css' not in s:
    s = s.replace('<link rel="stylesheet" href="/app/assets/editor.css">', '<link rel="stylesheet" href="/app/assets/editor.css">\n<link rel="stylesheet" href="/app/assets/canvas-first.css">')
if '/app/js/canvas-first-shell.js' not in s:
    s = s.replace('<script src="/app/js/workspace.js"></script>', '<script src="/app/js/workspace.js"></script>\n<script src="/app/js/canvas-first-shell.js"></script>')
index.write_text(s, encoding='utf-8')

shell = Path('app/js/canvas-first-shell.js')
s = shell.read_text(encoding='utf-8')
anchor = "  const icon = id => `<svg aria-hidden=\"true\"><use href=\"/app/assets/canvas-first-icons.svg#${id}\"></use></svg>`;\n"
insert = anchor + "  const legacyHomes = new Map();\n\n  function registerLegacyHomes(){\n    ['layersDisclosure','previewDisclosure','exportDisclosure'].forEach(id => {\n      const node = byId(id);\n      if (!node || legacyHomes.has(id)) return;\n      const marker = document.createComment(`canvas-first home: ${id}`);\n      node.parentNode.insertBefore(marker, node);\n      legacyHomes.set(id, marker);\n    });\n  }\n\n  function restoreLegacySections(){\n    legacyHomes.forEach((marker, id) => {\n      const node = byId(id);\n      if (node && node.closest('#pfPanelBody') && marker.parentNode) marker.parentNode.insertBefore(node, marker.nextSibling);\n    });\n  }\n"
if 'const legacyHomes = new Map();' not in s:
    if anchor not in s: raise SystemExit('icon anchor missing')
    s = s.replace(anchor, insert, 1)

old = "    document.body.classList.add('pf-canvas-first-live');\n    const shell = document.createElement('section');"
new = "    document.body.classList.add('pf-canvas-first-live');\n    registerLegacyHomes();\n    const shell = document.createElement('section');"
if old in s: s = s.replace(old, new, 1)

old = "    if (!panel || !body || !title) return;\n    body.innerHTML = '';\n    title.textContent ="
new = "    if (!panel || !body || !title) return;\n    restoreLegacySections();\n    body.replaceChildren();\n    title.textContent ="
if old in s: s = s.replace(old, new, 1)

shell.write_text(s, encoding='utf-8')

workspace = Path('app/js/workspace.js')
s = workspace.read_text(encoding='utf-8')
s = s.replace('background:#f4f1e9;color:#183d35', 'background:#eef1f4;color:#182230')
s = s.replace('border:1px solid #d7d2c7', 'border:1px solid #c7ced7')
s = s.replace('rgba(23,61,54,.16)', 'rgba(32,45,62,.16)')
s = s.replace('color:#5f665f', 'color:#687483')
s = s.replace('border:1px solid #cfc9bd', 'border:1px solid #c7ced7')
s = s.replace('color:#173d36', 'color:#526d8f')
workspace.write_text(s, encoding='utf-8')

print('Applied canvas-first live shell integration')
