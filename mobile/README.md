# Sapiver Pattern Forge — Android app

Expo SDK 57 Android shell for the hosted Sapiver Pattern Forge editor.

## Identity
- Expo owner: `sapiverforge`
- Expo slug: `pattern-forge`
- EAS project ID: `53addbf0-0314-4e3e-9120-08fa61a0ee4a`
- Android package: `uk.co.sapiverpress.patternforge`
- Hosted app: `https://sapiver-pattern-forge.netlify.app/`

## Local development
```bash
npm install
npx expo start
```
Open in Expo Go for basic WebView testing.

## APK test build
```bash
npx eas-cli@latest build --platform android --profile preview
```

## UX2 staging APK
The UX2 preview installs as a separate app alongside the production app, displays the UX2 label, and loads the UX2 Netlify staging site.

```bash
npx eas-cli@latest build --platform android --profile preview-ux2
```

The Android launcher uses the Sapiver icon family in `assets/`: the full launcher icon, adaptive foreground/background, and Android themed monochrome icon.

## Play Store build
```bash
npx eas-cli@latest build --platform android --profile production
```

## Native bridge
The app injects `window.PatternForgeAndroid` before the hosted editor loads. Pattern Forge's existing `/app/js/platform.js` detects this and exposes the native runtime through `window.PatternForgePlatform`.

The first native capability is export saving/sharing. The web editor sends generated files as base64 through the bridge; Android uses the Storage Access Framework so the customer can choose where to save them.
