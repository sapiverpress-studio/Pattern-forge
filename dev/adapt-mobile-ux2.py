from pathlib import Path

p = Path('mobile/App.tsx')
s = p.read_text(encoding='utf-8')

replacements = [
    (
        "  SafeAreaView,\n  StyleSheet,",
        "  StatusBar as RNStatusBar,\n  StyleSheet,",
    ),
    (
        "import { StatusBar } from 'expo-status-bar';",
        "import { StatusBar as ExpoStatusBar } from 'expo-status-bar';",
    ),
    (
        "const ALLOWED_HOST = 'sapiver-pattern-forge.netlify.app';",
        "const ALLOWED_HOST = new URL(PATTERN_FORGE_URL).hostname;",
    ),
    (
        "  const [loadError, setLoadError] = useState(false);\n  const [currentUrl, setCurrentUrl] = useState(PATTERN_FORGE_URL);",
        "  const [loadError, setLoadError] = useState(false);\n  const [loadProgress, setLoadProgress] = useState(0);\n  const [currentUrl, setCurrentUrl] = useState(PATTERN_FORGE_URL);",
    ),
    (
        "    <SafeAreaView style={styles.safeArea}>\n      <StatusBar style=\"light\" />",
        "    <View style={styles.safeArea}>\n      <ExpoStatusBar style=\"dark\" />",
    ),
    (
        "          onLoadStart={() => {\n            setLoading(true);\n            setLoadError(false);\n          }}\n          onLoadEnd={() => setLoading(false)}",
        "          onLoadStart={() => {\n            setLoadProgress(0);\n            setLoading(true);\n            setLoadError(false);\n          }}\n          onLoadProgress={(event) => {\n            const progress = event.nativeEvent.progress;\n            setLoadProgress(progress);\n            if (progress >= 0.8) setLoading(false);\n          }}\n          onLoadEnd={() => {\n            setLoadProgress(1);\n            setLoading(false);\n          }}",
    ),
    (
        '            <ActivityIndicator size="large" color="#2c6658" />',
        '            <ActivityIndicator size="large" color="#526d8f" />\n            <Text style={styles.loadingText}>Loading Pattern Forge… {Math.round(loadProgress * 100)}%</Text>',
    ),
    (
        '            <Text style={styles.errorText}>Check your internet connection and try again.</Text>',
        '            <Text style={styles.errorText}>Pattern Forge did not finish loading. Check your connection and try again.</Text>',
    ),
    (
        '    </SafeAreaView>',
        '    </View>',
    ),
    (
        "  safeArea: {\n    flex: 1,\n    backgroundColor: '#2c6658',\n  },",
        "  safeArea: {\n    flex: 1,\n    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) : 0,\n    backgroundColor: '#eef1f4',\n  },",
    ),
    (
        "    backgroundColor: '#f4f1e9',",
        "    backgroundColor: '#eef1f4',",
    ),
    (
        "    color: '#183d35',",
        "    color: '#17202b',",
    ),
    (
        "    color: '#5f665f',",
        "    color: '#687483',",
    ),
    (
        "    backgroundColor: '#2c6658',",
        "    backgroundColor: '#526d8f',",
    ),
]

for old, new in replacements:
    if old in s:
        s = s.replace(old, new, 1)

anchor = "  const handleMessage = useCallback(async (event: WebViewMessageEvent) => {"
timeout_effect = """  useEffect(() => {
    if (!loading || loadError) return;
    const timer = setTimeout(() => {
      setLoading(false);
      setLoadError(true);
    }, 15000);
    return () => clearTimeout(timer);
  }, [loading, loadError, currentUrl]);

"""
if timeout_effect.strip() not in s:
    if anchor not in s:
        raise SystemExit('handleMessage anchor missing')
    s = s.replace(anchor, timeout_effect + anchor, 1)

if 'loadingText:' not in s:
    style_anchor = '  errorOverlay: {'
    loading_style = """  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: '#526d8f',
  },
"""
    if style_anchor not in s:
        raise SystemExit('errorOverlay style anchor missing')
    s = s.replace(style_anchor, loading_style + style_anchor, 1)

if 'SafeAreaView' in s:
    raise SystemExit('deprecated SafeAreaView still present')
if "const ALLOWED_HOST = new URL(PATTERN_FORGE_URL).hostname;" not in s:
    raise SystemExit('dynamic WebView host not applied')
if 'onLoadProgress=' not in s:
    raise SystemExit('WebView progress handling not applied')
if 'RNStatusBar.currentHeight' not in s:
    raise SystemExit('Android safe-area handling not applied')

p.write_text(s, encoding='utf-8')
print('Adapted Expo shell to UX2 colours, dynamic preview host, safe area and resilient loading')
