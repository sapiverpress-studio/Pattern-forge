import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

const PATTERN_FORGE_URL =
  process.env.EXPO_PUBLIC_PATTERN_FORGE_URL ??
  'https://sapiver-pattern-forge.netlify.app/';

const ALLOWED_HOST = 'sapiver-pattern-forge.netlify.app';

const ANDROID_BRIDGE = String.raw`
(function () {
  if (window.PatternForgeAndroid) return true;

  function send(action, rawPayload) {
    try {
      var payload = typeof rawPayload === 'string'
        ? JSON.parse(rawPayload || '{}')
        : (rawPayload || {});

      window.ReactNativeWebView.postMessage(JSON.stringify({
        source: 'PatternForgeAndroid',
        action: action,
        payload: payload
      }));
      return true;
    } catch (error) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        source: 'PatternForgeAndroid',
        action: 'bridgeError',
        payload: { message: String(error) }
      }));
      return false;
    }
  }

  window.PatternForgeAndroid = {
    saveFile: function (payload) { return send('saveFile', payload); },
    shareFile: function (payload) { return send('shareFile', payload); }
  };
  return true;
})();
true;
`;

type NativeFilePayload = {
  name?: string;
  mimeType?: string;
  base64?: string;
};

function safeFileName(name?: string) {
  const cleaned = String(name || 'pattern-forge-export')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'pattern-forge-export';
}

async function writeCacheFile(payload: NativeFilePayload) {
  if (!payload.base64) throw new Error('Export data was empty.');
  const name = safeFileName(payload.name);
  const uri = `${FileSystem.cacheDirectory}${Date.now()}-${name}`;
  await FileSystem.writeAsStringAsync(uri, payload.base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return { uri, name, mimeType: payload.mimeType || 'application/octet-stream' };
}

async function saveFile(payload: NativeFilePayload) {
  if (!payload.base64) throw new Error('Export data was empty.');
  const name = safeFileName(payload.name);
  const mimeType = payload.mimeType || 'application/octet-stream';

  if (Platform.OS === 'android') {
    const permission =
      await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

    if (permission.granted) {
      const uri = await FileSystem.StorageAccessFramework.createFileAsync(
        permission.directoryUri,
        name,
        mimeType,
      );
      await FileSystem.writeAsStringAsync(uri, payload.base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      Alert.alert('Saved', `${name} has been saved.`);
      return;
    }
  }

  const file = await writeCacheFile(payload);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: file.mimeType,
      dialogTitle: `Save ${file.name}`,
    });
  }
}

async function shareFile(payload: NativeFilePayload) {
  const file = await writeCacheFile(payload);
  if (!(await Sharing.isAvailableAsync())) {
    Alert.alert('Share unavailable', 'Sharing is not available on this device.');
    return;
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: file.mimeType,
    dialogTitle: `Share ${file.name}`,
  });
}

export default function App() {
  const webRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack) {
        webRef.current?.goBack();
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [canGoBack]);

  const handleMessage = useCallback(async (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data || '{}');
      if (message?.source !== 'PatternForgeAndroid') return;

      if (message.action === 'saveFile') {
        await saveFile(message.payload || {});
      } else if (message.action === 'shareFile') {
        await shareFile(message.payload || {});
      } else if (message.action === 'bridgeError') {
        console.warn('Pattern Forge bridge error:', message.payload?.message);
      }
    } catch (error) {
      Alert.alert(
        'Pattern Forge',
        error instanceof Error ? error.message : 'The requested action could not be completed.',
      );
    }
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <WebView
          ref={webRef}
          source={{ uri: PATTERN_FORGE_URL }}
          injectedJavaScriptBeforeContentLoaded={ANDROID_BRIDGE}
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          allowsBackForwardNavigationGestures
          onMessage={handleMessage}
          onNavigationStateChange={(state) => setCanGoBack(state.canGoBack)}
          onLoadStart={() => {
            setLoading(true);
            setLoadError(false);
          }}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setLoadError(true);
          }}
          onShouldStartLoadWithRequest={(request) => {
            try {
              const url = new URL(request.url);
              if (url.hostname === ALLOWED_HOST || url.protocol === 'about:') return true;
              void Linking.openURL(request.url);
              return false;
            } catch {
              return true;
            }
          }}
          style={styles.webView}
        />

        {loading && !loadError ? (
          <View pointerEvents="none" style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#2c6658" />
          </View>
        ) : null}

        {loadError ? (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorTitle}>Pattern Forge could not load</Text>
            <Text style={styles.errorText}>Check your internet connection and try again.</Text>
            <Pressable
              accessibilityRole="button"
              style={styles.retryButton}
              onPress={() => {
                setLoadError(false);
                setLoading(true);
                webRef.current?.reload();
              }}
            >
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2c6658',
  },
  container: {
    flex: 1,
    backgroundColor: '#f4f1e9',
  },
  webView: {
    flex: 1,
    backgroundColor: '#f4f1e9',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f1e9',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: '#f4f1e9',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#183d35',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#5f665f',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    minWidth: 150,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#2c6658',
  },
  retryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
