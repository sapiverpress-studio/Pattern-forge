from pathlib import Path

path = Path('mobile/App.tsx')
text = path.read_text(encoding='utf-8')

if "expo-screen-orientation" in text:
    raise SystemExit('Android Doodle orientation patch already applied')

old = "import * as Sharing from 'expo-sharing';\n"
new = "import * as Sharing from 'expo-sharing';\nimport * as ScreenOrientation from 'expo-screen-orientation';\n"
assert text.count(old) == 1, 'Sharing import anchor drifted'
text = text.replace(old, new, 1)

old = "const ALLOWED_HOST = 'sapiver-pattern-forge.netlify.app';\n\n"
new = """const ALLOWED_HOST = 'sapiver-pattern-forge.netlify.app';\n\nfunction isDoodleUrl(rawUrl: string) {\n  try {\n    const url = new URL(rawUrl, PATTERN_FORGE_URL);\n    return (\n      url.pathname === '/app/doodle/' ||\n      url.pathname === '/app/doodle' ||\n      (url.pathname === '/app/' && url.searchParams.get('workspace') === 'doodle')\n    );\n  } catch {\n    return false;\n  }\n}\n\nasync function setWorkspaceOrientation(workspace: string) {\n  if (Platform.OS !== 'android') return;\n  try {\n    if (workspace === 'doodle') {\n      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);\n    } else {\n      await ScreenOrientation.unlockAsync();\n    }\n  } catch (error) {\n    console.warn('Pattern Forge orientation change failed:', error);\n  }\n}\n\n"""
assert text.count(old) == 1, 'Allowed host anchor drifted'
text = text.replace(old, new, 1)

old = """  document.addEventListener('click', function (event) {\n    var node = event.target;\n    var anchor = node && node.closest ? node.closest('a[href]') : null;\n    if (!anchor || anchor.download) return;\n    try {\n      var target = new URL(anchor.href, window.location.href);\n      if (target.hostname !== window.location.hostname) return;\n      event.preventDefault();\n      send('navigate', { url: target.href });\n    } catch (_) {}\n  }, true);\n\n  return true;\n"""
new = """  document.addEventListener('click', function (event) {\n    var node = event.target;\n    var anchor = node && node.closest ? node.closest('a[href]') : null;\n    if (!anchor || anchor.download) return;\n    try {\n      var target = new URL(anchor.href, window.location.href);\n      if (target.hostname !== window.location.hostname) return;\n      event.preventDefault();\n      send('navigate', { url: target.href });\n    } catch (_) {}\n  }, true);\n\n  function reportWorkspace() {\n    var body = document.body;\n    if (!body) return;\n    var doodle = body.dataset.workspace === 'doodle' || body.classList.contains('doodle-project');\n    send('workspace', { workspace: doodle ? 'doodle' : 'other' });\n  }\n\n  function watchWorkspace() {\n    if (!document.body) return;\n    reportWorkspace();\n    new MutationObserver(reportWorkspace).observe(document.body, {\n      attributes: true,\n      attributeFilter: ['class', 'data-workspace']\n    });\n  }\n\n  if (document.body) watchWorkspace();\n  else document.addEventListener('DOMContentLoaded', watchWorkspace, { once: true });\n\n  return true;\n"""
assert text.count(old) == 1, 'Android bridge navigation anchor drifted'
text = text.replace(old, new, 1)

old = """  useEffect(() => {\n    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {\n      if (canGoBack) {\n        webRef.current?.goBack();\n        return true;\n      }\n      return false;\n    });\n    return () => subscription.remove();\n  }, [canGoBack]);\n\n"""
new = old + """  useEffect(() => {\n    void setWorkspaceOrientation(isDoodleUrl(currentUrl) ? 'doodle' : 'other');\n  }, [currentUrl]);\n\n  useEffect(() => {\n    return () => {\n      if (Platform.OS === 'android') void ScreenOrientation.unlockAsync();\n    };\n  }, []);\n\n"""
assert text.count(old) == 1, 'Back handler anchor drifted'
text = text.replace(old, new, 1)

old = """      } else if (message.action === 'saveFile') {\n        await saveFile(message.payload || {});\n"""
new = """      } else if (message.action === 'workspace') {\n        await setWorkspaceOrientation(String(message.payload?.workspace || 'other'));\n      } else if (message.action === 'saveFile') {\n        await saveFile(message.payload || {});\n"""
assert text.count(old) == 1, 'Message handler anchor drifted'
text = text.replace(old, new, 1)

path.write_text(text, encoding='utf-8')
print('Applied Android Doodle landscape orientation patch.')
