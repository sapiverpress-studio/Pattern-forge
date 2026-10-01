# Android readiness

Pattern Forge now uses a stable web-app boundary so a future Android version can wrap the same editor instead of forking the drawing engine.

## Stable entry points
- `/` — product launcher
- `/app/` — shared editor engine / existing-project entry
- `/app/pattern/` — Pattern workspace entry
- `/app/doodle/` — Doodle workspace entry

## Shared engine
The tested editor remains one shared codebase in `/app/js/editor.js` with presentation in `/app/assets/editor.css`. Pattern and Doodle are workspace entries, not separate engines.

## Platform boundary
`/app/js/platform.js` exposes `window.PatternForgePlatform`. A future Android WebView/Capacitor wrapper can provide `window.PatternForgeAndroid` methods such as `saveFile`, `shareFile`, and `openFile` without rewriting drawing, layers, repeat maths, autosave, or export generation.

## PWA metadata
`/manifest.webmanifest` defines the installable app identity and stable scope. A service worker is deliberately not added yet; caching project/editor code before the refactor settles would add avoidable stale-build risk.

## Next Android-specific work (future)
1. Route browser downloads through the platform adapter when a native bridge is present.
2. Add native file picker/share-sheet implementation.
3. Add Android icons/splash assets and package metadata.
4. Wrap `/app/` with Capacitor or a minimal Android WebView shell.
5. Re-run the same browser regression suite inside the Android wrapper.

## Expo Android shell
A first Expo SDK 57 Android shell now lives in `/mobile/`. It loads the hosted product through `react-native-webview`, injects the existing Pattern Forge Android bridge, supports Android back navigation, and routes generated exports to native Android file saving/share handling.

The Expo project is linked to EAS project `53addbf0-0314-4e3e-9120-08fa61a0ee4a` under the `sapiverforge` owner and uses Android package `uk.co.sapiverpress.patternforge`.
