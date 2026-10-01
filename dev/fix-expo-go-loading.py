from pathlib import Path

p = Path('mobile/App.tsx')
s = p.read_text(encoding='utf-8')

repls = [
("  SafeAreaView,\n  StyleSheet,", "  StatusBar as RNStatusBar,\n  StyleSheet,"),
("import { StatusBar } from 'expo-status-bar';", "import { StatusBar as ExpoStatusBar } from 'expo-status-bar';"),
("  const [loading, setLoading] = useState(true);\n  const [loadError, setLoadError] = useState(false);", "  const [loading, setLoading] = useState(true);\n  const [loadError, setLoadError] = useState(false);\n  const [loadProgress, setLoadProgress] = useState(0);"),
("\n  const handleMessage = useCallback", "\n  useEffect(() => {\n    if (!loading || loadError) return;\n    const timer = setTimeout(() => {\n      setLoading(false);\n      setLoadError(true);\n    }, 12000);\n    return () => clearTimeout(timer);\n  }, [loading, loadError, currentUrl]);\n\n  const handleMessage = useCallback"),
("    <SafeAreaView style={styles.safeArea}>\n      <StatusBar style=\"light\" />", "    <View style={styles.safeArea}>\n      <ExpoStatusBar style=\"light\" />"),
("          onLoadStart={() => {\n            setLoading(true);\n            setLoadError(false);\n          }}\n          onLoadEnd={() => setLoading(false)}", "          onLoadStart={() => {\n            setLoadProgress(0);\n            setLoading(true);\n            setLoadError(false);\n          }}\n          onLoadProgress={(event) => {\n            const progress = event.nativeEvent.progress;\n            setLoadProgress(progress);\n            if (progress >= 0.75) setLoading(false);\n          }}\n          onLoadEnd={() => {\n            setLoadProgress(1);\n            setLoading(false);\n          }}"),
("          <View pointerEvents=\"none\" style={styles.loadingOverlay}>\n            <ActivityIndicator size=\"large\" color=\"#2c6658\" />\n          </View>", "          <View pointerEvents=\"none\" style={styles.loadingOverlay}>\n            <ActivityIndicator size=\"large\" color=\"#2c6658\" />\n            <Text style={styles.loadingText}>Loading Pattern Forge… {Math.round(loadProgress * 100)}%</Text>\n          </View>"),
("            <Text style={styles.errorText}>Check your internet connection and try again.</Text>", "            <Text style={styles.errorText}>Pattern Forge did not finish loading. Check your connection and try again.</Text>"),
("    </SafeAreaView>", "    </View>"),
("  safeArea: {\n    flex: 1,\n    backgroundColor: '#2c6658',\n  },", "  safeArea: {\n    flex: 1,\n    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) : 0,\n    backgroundColor: '#2c6658',\n  },"),
("  errorOverlay: {", "  loadingText: {\n    marginTop: 14,\n    fontSize: 15,\n    color: '#47655d',\n  },\n  errorOverlay: {")
]

for old, new in repls:
    if old not in s:
        raise SystemExit(f'Expected anchor not found: {old[:80]!r}')
    s = s.replace(old, new, 1)

if 'SafeAreaView' in s:
    raise SystemExit('Deprecated SafeAreaView still present')
if 'onLoadProgress=' not in s or 'RNStatusBar.currentHeight' not in s:
    raise SystemExit('Loading/safe-area patch incomplete')

p.write_text(s, encoding='utf-8')
print('Applied Expo Go loading and safe-area fix')
