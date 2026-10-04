# Android readiness

Updated 4 October 2026. Browser regression tests pass; a fresh physical-device Android release check is still required. See [the current handover](UX2-HANDOVER-2026-10-04.md) for evidence and deployment identifiers.

## Stable entry points
- `/` — product launcher
- `/app/` — shared editor engine / existing-project entry
- `/app/pattern/` — Pattern workspace entry
- `/app/doodle/` — Doodle workspace entry

## Shared engine
The tested editor remains one shared codebase in `/app/js/editor.js` with presentation in `/app/assets/editor.css`. Pattern and Doodle are workspace entries, not separate engines.

## Platform boundary
`/app/js/platform.js` exposes `window.PatternForgePlatform`. The existing Expo/React Native WebView wrapper in `mobile/App.tsx` injects `window.PatternForgeAndroid` with saveFile, shareFile and setFullscreen. It also intercepts Blob downloads, handles same-site navigation and locks Doodle to landscape.

Android saving already uses the Storage Access Framework directory picker. The wrapper writes Base64 export data to the chosen directory, or uses a cached file and share sheet when available. This is implemented source, not evidence that exports have passed on a physical phone. Native file opening relies on the WebView file-input flow; no openFile bridge method is implemented.

`mobile/eas.json` contains a preview-ux2 APK profile pointing at the isolated UX2 staging site. The default wrapper URL still points at the production website. Verify the profile and effective URL when evaluating an installed APK; publishing staging alone does not prove which website that APK uses.

## PWA metadata
`/manifest.webmanifest` defines the installable app identity and stable scope. A service worker is deliberately not added yet; caching project/editor code before the refactor settles would add avoidable stale-build risk.

## Remaining release checks

1. On the intended APK and phone, save and reopen PNG, SVG, JSON and ZIP. Check directory-picker cancellation, share cancellation and readable saved files.
2. Import artwork, transform it, save, terminate the app and reopen. Include images in the library that have not been placed on the canvas.
3. Check fullscreen, camera cutouts, system bars, orientation changes, favourites persistence and drawing while switching tools.
4. Exercise Android Back with a palette open and in fullscreen. Current native handling only uses WebView history; it does not explicitly close palettes or exit fullscreen first.
5. Measure peak memory and responsiveness with large imports, multiple layers, 4000-pixel artwork and rectangular repeat exports. Browser pass results do not establish low-memory phone reliability.
6. Verify offline cold start before advertising offline operation. The wrapper loads a hosted page and there is no service worker or bundled offline editor in this configuration.
7. Read the actual installed/build version and existing release history before changing versionCode. Source currently says Android version 1.0.0 / versionCode 1; the web alpha label is a separate version.

No APK/AAB was built or published in this verification pass. Before changing mobile code, read `mobile/AGENTS.md` and its required version-specific Expo documentation, then run the mobile checks.
