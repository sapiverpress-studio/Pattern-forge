from pathlib import Path
import re

ROOT = Path('.')
source_path = ROOT / 'index.html'
source = source_path.read_text(encoding='utf-8')

if '1.2.0-alpha.6.5' not in source:
    raise SystemExit('Guard failed: expected alpha.6.5 source')

style_matches = list(re.finditer(r'<style>(.*?)</style>', source, flags=re.S))
script_matches = list(re.finditer(r'<script>(.*?)</script>', source, flags=re.S))
if len(style_matches) != 1:
    raise SystemExit(f'Guard failed: expected exactly one inline style block, found {len(style_matches)}')
if len(script_matches) != 1:
    raise SystemExit(f'Guard failed: expected exactly one inline script block, found {len(script_matches)}')

editor_css = style_matches[0].group(1).strip() + '\n'
editor_js = script_matches[0].group(1).strip() + '\n'

app_html = source
app_html = app_html.replace('1.2.0-alpha.6.5', '1.2.0-alpha.7.0')
app_html = app_html.replace('<title>Sapiver Pattern Forge — Seamless Pattern Design</title>', '<title>Sapiver Pattern Forge — Editor</title>')
app_html = app_html.replace('<meta name="application-name" content="Sapiver Pattern Forge">', '<meta name="application-name" content="Sapiver Pattern Forge">\n<link rel="manifest" href="/manifest.webmanifest">\n<meta name="theme-color" content="#2c5f54">')
app_html = re.sub(r'<style>.*?</style>', '<link rel="stylesheet" href="/app/assets/editor.css">', app_html, count=1, flags=re.S)
app_html = re.sub(r'<script>.*?</script>', '<script src="/app/js/platform.js"></script>\n<script src="/app/js/editor.js"></script>\n<script src="/app/js/workspace.js"></script>', app_html, count=1, flags=re.S)

launcher = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Sapiver Pattern Forge</title>
<meta name="description" content="Create seamless patterns or standalone transparent artwork with Sapiver Pattern Forge.">
<meta name="theme-color" content="#2c5f54">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="stylesheet" href="/assets/product.css">
</head>
<body>
<main class="productShell">
  <header class="productHead">
    <p class="eyebrow">Sapiver Press</p>
    <h1>Sapiver Pattern Forge</h1>
    <p class="lede">Choose what you want to make. Pattern and Doodle use the same drawing engine, projects and export system, without putting every control on the start screen.</p>
  </header>
  <section class="choiceGrid" aria-label="Create or open a project">
    <a class="choiceCard primary" href="/app/pattern/">
      <span class="choiceTag">Pattern</span>
      <h2>Create a seamless pattern</h2>
      <p>Straight, half-drop and brick repeats with live preview and print-ready export.</p>
      <strong>New Pattern →</strong>
    </a>
    <a class="choiceCard" href="/app/doodle/">
      <span class="choiceTag">Doodle</span>
      <h2>Create standalone artwork</h2>
      <p>Draw transparent motifs and illustrations without repeat wrapping.</p>
      <strong>New Doodle →</strong>
    </a>
    <a class="choiceCard compact" href="/app/">
      <span class="choiceTag">Projects</span>
      <h2>Open an existing project</h2>
      <p>Resume an autosaved project or open a Pattern Forge project file.</p>
      <strong>Open project →</strong>
    </a>
    <a class="choiceCard compact" href="/help/">
      <span class="choiceTag">Help</span>
      <h2>Quick guide</h2>
      <p>Pattern, Doodle, layers, images and exports in one short guide.</p>
      <strong>View help →</strong>
    </a>
  </section>
  <footer>Pattern Forge v1.2 · Browser workspace prepared for a future Android wrapper.</footer>
</main>
</body>
</html>
'''

product_css = '''
:root{--bg:#f4f1eb;--panel:#fff;--ink:#171717;--muted:#6a675f;--line:#d8d2c8;--accent:#2c5f54;--accent2:#173d36;--radius:20px;--shadow:0 12px 38px rgba(0,0,0,.08)}
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}a{color:inherit}.productShell{width:min(1080px,calc(100% - 32px));margin:0 auto;padding:clamp(34px,8vw,82px) 0 28px}.productHead{max-width:760px;margin-bottom:28px}.eyebrow{margin:0 0 8px;color:var(--accent);font-size:.72rem;font-weight:850;letter-spacing:.13em;text-transform:uppercase}.productHead h1{font-size:clamp(2rem,7vw,4.5rem);letter-spacing:-.055em;line-height:.96;margin:0}.lede{font-size:clamp(1rem,2.1vw,1.18rem);line-height:1.55;color:var(--muted);max-width:700px}.choiceGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.choiceCard{display:flex;min-height:260px;flex-direction:column;text-decoration:none;background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:clamp(20px,4vw,32px);box-shadow:var(--shadow);transition:transform .15s ease,border-color .15s ease}.choiceCard:hover{transform:translateY(-2px);border-color:#9caaa4}.choiceCard.primary{background:var(--accent2);color:#fff;border-color:var(--accent2)}.choiceCard.compact{min-height:190px}.choiceTag{width:max-content;border:1px solid currentColor;border-radius:999px;padding:5px 9px;font-size:.68rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;opacity:.75}.choiceCard h2{font-size:clamp(1.35rem,3vw,2.05rem);line-height:1.06;letter-spacing:-.035em;margin:22px 0 10px}.choiceCard p{color:var(--muted);line-height:1.5;margin:0 0 22px;max-width:460px}.choiceCard.primary p{color:#d9e6e2}.choiceCard strong{margin-top:auto;font-size:.9rem}footer{padding:24px 2px;color:var(--muted);font-size:.78rem}.guide{max-width:780px}.guide nav{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0 28px}.guide nav a{background:#fff;border:1px solid var(--line);border-radius:10px;padding:8px 10px;text-decoration:none;font-weight:700;font-size:.82rem}.guide section{background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px;margin:10px 0}.guide h2{margin-top:0}.guide li{margin:.45rem 0;line-height:1.45}@media(max-width:720px){.choiceGrid{grid-template-columns:1fr}.choiceCard,.choiceCard.compact{min-height:190px}.productShell{width:min(100% - 22px,1080px);padding-top:28px}}
'''.strip() + '\n'

route_pattern = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pattern Forge — Pattern</title><script>location.replace('../?workspace=pattern')</script></head><body><a href="../?workspace=pattern">Open Pattern workspace</a></body></html>\n'''
route_doodle = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pattern Forge — Doodle</title><script>location.replace('../?workspace=doodle')</script></head><body><a href="../?workspace=doodle">Open Doodle workspace</a></body></html>\n'''

platform_js = r'''(() => {
  const nativeBridge = window.PatternForgeAndroid || null;
  const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches || false;
  const runtime = nativeBridge ? 'android-native' : (standalone ? 'pwa' : 'web');
  async function invoke(action, payload = {}) {
    if (!nativeBridge || typeof nativeBridge[action] !== 'function') return { handled:false };
    try {
      const result = nativeBridge[action](JSON.stringify(payload));
      return { handled:true, result };
    } catch (error) {
      console.error(`PatternForge Android bridge ${action} failed`, error);
      return { handled:false, error:String(error) };
    }
  }
  window.PatternForgePlatform = Object.freeze({
    runtime,
    isNativeAndroid: Boolean(nativeBridge),
    isStandalone: standalone,
    invoke,
    capabilities: Object.freeze({
      nativeFileSave: Boolean(nativeBridge?.saveFile),
      nativeShare: Boolean(nativeBridge?.shareFile),
      nativeOpenFile: Boolean(nativeBridge?.openFile)
    })
  });
})();
'''.strip() + '\n'

workspace_js = r'''(() => {
  function applyWorkspaceEntry(){
    const params = new URLSearchParams(location.search);
    const workspace = params.get('workspace');
    if (!['pattern','doodle'].includes(workspace)) return;
    document.body.dataset.workspace = workspace;
    const typeInput = document.getElementById('projectTypeInput');
    if (typeInput) {
      typeInput.value = workspace;
      typeInput.dispatchEvent(new Event('change', { bubbles:true }));
      const field = typeInput.closest('.field');
      if (field) field.hidden = true;
    }
    const card = document.querySelector('.projectSetupCard');
    const heading = card?.querySelector('h2');
    const intro = card?.querySelector('.projectSetupIntro');
    if (heading) heading.textContent = workspace === 'pattern' ? 'New Pattern Project' : 'New Doodle';
    if (intro) intro.textContent = workspace === 'pattern'
      ? 'Set up a seamless pattern project, or open one you already started.'
      : 'Set up standalone transparent artwork, or open one you already started.';
    document.title = workspace === 'pattern' ? 'Sapiver Pattern Forge — Pattern' : 'Sapiver Pattern Forge — Doodle';
    const cleanPath = workspace === 'pattern' ? '/app/pattern/' : '/app/doodle/';
    if (location.pathname !== cleanPath) history.replaceState({workspace}, '', cleanPath);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(applyWorkspaceEntry, 0), {once:true});
  else setTimeout(applyWorkspaceEntry, 0);
})();
'''.strip() + '\n'

manifest = '''{
  "name": "Sapiver Pattern Forge",
  "short_name": "Pattern Forge",
  "description": "Create seamless patterns and standalone transparent artwork.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#f4f1eb",
  "theme_color": "#2c5f54",
  "categories": ["design", "productivity", "graphics"]
}\n'''

help_html = '''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pattern Forge — Quick Guide</title><meta name="theme-color" content="#2c5f54"><link rel="stylesheet" href="/assets/product.css"></head>
<body><main class="productShell guide"><p class="eyebrow">Sapiver Pattern Forge</p><h1>Quick guide</h1><nav><a href="/">Home</a><a href="/app/pattern/">Pattern</a><a href="/app/doodle/">Doodle</a><a href="/app/">Open project</a></nav>
<section><h2>Pattern workspace</h2><ul><li>Use Pattern when the artwork must repeat seamlessly.</li><li>Choose straight, half-drop or brick when you create the project.</li><li>Use Repeat Preview to inspect the finished repeat before export.</li></ul></section>
<section><h2>Doodle workspace</h2><ul><li>Use Doodle for standalone transparent motifs and illustrations.</li><li>Doodle does not wrap artwork across the canvas edges.</li><li>Export PNG or SVG artwork for reuse in other designs.</li></ul></section>
<section><h2>Shared tools</h2><ul><li>Drawing, imported images, layers, selection, snapping, eraser, undo and autosave use the same engine in both workspaces.</li><li>Start again clears placed/drawn artwork while keeping the project setup and imported image library.</li><li>Removing a used library image warns before removing its placed copies.</li></ul></section>
</main></body></html>\n'''

android_doc = '''# Android readiness\n\nPattern Forge now uses a stable web-app boundary so a future Android version can wrap the same editor instead of forking the drawing engine.\n\n## Stable entry points\n- `/` — product launcher\n- `/app/` — shared editor engine / existing-project entry\n- `/app/pattern/` — Pattern workspace entry\n- `/app/doodle/` — Doodle workspace entry\n\n## Shared engine\nThe tested editor remains one shared codebase in `/app/js/editor.js` with presentation in `/app/assets/editor.css`. Pattern and Doodle are workspace entries, not separate engines.\n\n## Platform boundary\n`/app/js/platform.js` exposes `window.PatternForgePlatform`. A future Android WebView/Capacitor wrapper can provide `window.PatternForgeAndroid` methods such as `saveFile`, `shareFile`, and `openFile` without rewriting drawing, layers, repeat maths, autosave, or export generation.\n\n## PWA metadata\n`/manifest.webmanifest` defines the installable app identity and stable scope. A service worker is deliberately not added yet; caching project/editor code before the refactor settles would add avoidable stale-build risk.\n\n## Next Android-specific work (future)\n1. Route browser downloads through the platform adapter when a native bridge is present.\n2. Add native file picker/share-sheet implementation.\n3. Add Android icons/splash assets and package metadata.\n4. Wrap `/app/` with Capacitor or a minimal Android WebView shell.\n5. Re-run the same browser regression suite inside the Android wrapper.\n'''

product_test = r'''import { chromium } from 'playwright';
function assert(v,m){ if(!v) throw new Error(m); }
const browser=await chromium.launch({headless:true});
try{
  const ctx=await browser.newContext({viewport:{width:390,height:844}});
  const page=await ctx.newPage();
  const errors=[]; page.on('pageerror',e=>errors.push(String(e))); page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  assert(await page.getByRole('heading',{name:'Sapiver Pattern Forge'}).isVisible(),'launcher heading missing');
  assert((await page.locator('a[href="/app/pattern/"]').count())===1,'Pattern launcher missing');
  assert((await page.locator('a[href="/app/doodle/"]').count())===1,'Doodle launcher missing');
  assert((await page.locator('a[href="/app/"]').count())===1,'Open project launcher missing');
  await page.goto('http://127.0.0.1:4173/app/pattern/',{waitUntil:'networkidle'});
  await page.waitForURL('**/app/pattern/');
  await page.waitForTimeout(250);
  assert(await page.locator('meta[name="app-version"]').getAttribute('content')==='1.2.0-alpha.7.0','wrong alpha.7 app version');
  assert(await page.locator('#projectTypeInput').inputValue()==='pattern','Pattern route did not preselect Pattern');
  assert(await page.locator('#projectTypeInput').evaluate(el=>el.closest('.field')?.hidden===true),'Pattern route should hide redundant project type field');
  assert(await page.evaluate(()=>window.PatternForgePlatform?.runtime)==='web','platform adapter missing');
  await page.goto('http://127.0.0.1:4173/app/doodle/',{waitUntil:'networkidle'});
  await page.waitForURL('**/app/doodle/');
  await page.waitForTimeout(250);
  assert(await page.locator('#projectTypeInput').inputValue()==='doodle','Doodle route did not preselect Doodle');
  assert(errors.length===0,`browser errors: ${errors.join(' | ')}`);
  await ctx.close();
  console.log('PASS product workspaces: launcher, Pattern route, Doodle route, shared app and platform adapter');
} finally { await browser.close(); }
'''.strip() + '\n'

# Update current-regression URLs/version expectations for the new shared app path.
for test in (ROOT / 'tests').glob('*.mjs'):
    text = test.read_text(encoding='utf-8')
    text = text.replace('http://127.0.0.1:4173/', 'http://127.0.0.1:4173/app/')
    text = re.sub(r'1\.2\.0-alpha\.6\.\d+', '1.2.0-alpha.7.0', text)
    test.write_text(text, encoding='utf-8')

(ROOT / 'app/assets').mkdir(parents=True, exist_ok=True)
(ROOT / 'app/js').mkdir(parents=True, exist_ok=True)
(ROOT / 'app/pattern').mkdir(parents=True, exist_ok=True)
(ROOT / 'app/doodle').mkdir(parents=True, exist_ok=True)
(ROOT / 'assets').mkdir(parents=True, exist_ok=True)
(ROOT / 'help').mkdir(parents=True, exist_ok=True)
(ROOT / 'docs').mkdir(parents=True, exist_ok=True)
(ROOT / 'tests').mkdir(parents=True, exist_ok=True)

source_path.write_text(launcher, encoding='utf-8')
(ROOT / 'app/index.html').write_text(app_html, encoding='utf-8')
(ROOT / 'app/assets/editor.css').write_text(editor_css, encoding='utf-8')
(ROOT / 'app/js/editor.js').write_text(editor_js, encoding='utf-8')
(ROOT / 'app/js/platform.js').write_text(platform_js, encoding='utf-8')
(ROOT / 'app/js/workspace.js').write_text(workspace_js, encoding='utf-8')
(ROOT / 'app/pattern/index.html').write_text(route_pattern, encoding='utf-8')
(ROOT / 'app/doodle/index.html').write_text(route_doodle, encoding='utf-8')
(ROOT / 'assets/product.css').write_text(product_css, encoding='utf-8')
(ROOT / 'manifest.webmanifest').write_text(manifest, encoding='utf-8')
(ROOT / 'help/index.html').write_text(help_html, encoding='utf-8')
(ROOT / 'docs/ANDROID-READINESS.md').write_text(android_doc, encoding='utf-8')
(ROOT / 'tests/product-workspaces-smoke.mjs').write_text(product_test, encoding='utf-8')

# Static guards.
assert '/app/assets/editor.css' in app_html
assert '/app/js/editor.js' in app_html
assert '<style>' not in app_html
assert '<script>' not in app_html
assert '1.2.0-alpha.7.0' in app_html
assert '1.2.0-alpha.6.5' not in app_html
print('Applied product workspace refactor alpha.7.0')
