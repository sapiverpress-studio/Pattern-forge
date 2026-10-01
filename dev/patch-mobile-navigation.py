from pathlib import Path
p=Path('mobile/App.tsx')
s=p.read_text()

s=s.replace("const ALLOWED_HOST = 'sapiver-pattern-forge.netlify.app';\n", """const ALLOWED_HOST = 'sapiver-pattern-forge.netlify.app';

function normaliseInternalUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl, PATTERN_FORGE_URL);
    if (url.hostname !== ALLOWED_HOST) return null;
    if (url.pathname === '/app/pattern/' || url.pathname === '/app/pattern') {
      url.pathname = '/app/';
      url.search = '?workspace=pattern';
    } else if (url.pathname === '/app/doodle/' || url.pathname === '/app/doodle') {
      url.pathname = '/app/';
      url.search = '?workspace=doodle';
    }
    return url.toString();
  } catch {
    return null;
  }
}
""",1)

anchor="""  window.HTMLAnchorElement.prototype.click = function () {
    var href = this.getAttribute('href') || this.href || '';
    var blob = nativeBlobUrls[href];
    var name = this.download;
    if (!blob || !name) return originalAnchorClick.call(this);

    blob.arrayBuffer().then(function (buffer) {
      var bytes = new Uint8Array(buffer);
      var binary = '';
      var chunk = 0x8000;
      for (var i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
      }
      send('saveFile', {
        name: name,
        mimeType: blob.type || 'application/octet-stream',
        base64: btoa(binary)
      });
    }).catch(function (error) {
      send('bridgeError', { message: 'Could not prepare export: ' + String(error) });
    });
  };

  return true;
"""
replacement=anchor.replace("\n  return true;\n", """

  // Route all same-site navigation through the native shell. This avoids
  // Android WebView getting stuck on the lightweight workspace redirect pages.
  document.addEventListener('click', function (event) {
    var node = event.target;
    var anchor = node && node.closest ? node.closest('a[href]') : null;
    if (!anchor || anchor.download) return;
    try {
      var target = new URL(anchor.href, window.location.href);
      if (target.hostname !== window.location.hostname) return;
      event.preventDefault();
      send('navigate', { url: target.href });
    } catch (_) {}
  }, true);

  return true;
""")
if anchor not in s: raise SystemExit('bridge anchor not found')
s=s.replace(anchor,replacement,1)

s=s.replace("  const [loadError, setLoadError] = useState(false);\n", "  const [loadError, setLoadError] = useState(false);\n  const [currentUrl, setCurrentUrl] = useState(PATTERN_FORGE_URL);\n",1)

old="""      if (message.action === 'saveFile') {
        await saveFile(message.payload || {});
      } else if (message.action === 'shareFile') {
"""
new="""      if (message.action === 'navigate') {
        const target = normaliseInternalUrl(String(message.payload?.url || ''));
        if (target) {
          setLoading(true);
          setLoadError(false);
          setCurrentUrl(target);
        }
      } else if (message.action === 'saveFile') {
        await saveFile(message.payload || {});
      } else if (message.action === 'shareFile') {
"""
if old not in s: raise SystemExit('message anchor not found')
s=s.replace(old,new,1)

if "source={{ uri: PATTERN_FORGE_URL }}" not in s: raise SystemExit('source anchor not found')
s=s.replace("source={{ uri: PATTERN_FORGE_URL }}","source={{ uri: currentUrl }}",1)

p.write_text(s)
print('patched mobile navigation')
