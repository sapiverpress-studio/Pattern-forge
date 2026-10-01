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
import * as ScreenOrientation from 'expo-screen-orientation';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

const PATTERN_FORGE_URL =
  process.env.EXPO_PUBLIC_PATTERN_FORGE_URL ??
  'https://sapiver-pattern-forge.netlify.app/';

const ALLOWED_HOST = 'sapiver-pattern-forge.netlify.app';

function isDoodleUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl, PATTERN_FORGE_URL);
    return (
      url.pathname === '/app/doodle/' ||
      url.pathname === '/app/doodle' ||
      (url.pathname === '/app/' && url.searchParams.get('workspace') === 'doodle')
    );
  } catch {
    return false;
  }
}

async function setWorkspaceOrientation(workspace: string) {
  if (Platform.OS !== 'android') return;
  try {
    if (workspace === 'doodle') {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    } else {
      await ScreenOrientation.unlockAsync();
    }
  } catch (error) {
    console.warn('Pattern Forge orientation change failed:', error);
  }
}

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

  // Production Pattern Forge may still use normal browser Blob downloads.
  // Intercept those inside the WebView so Android can save them natively
  // without waiting for a website deployment.
  var nativeBlobUrls = Object.create(null);
  var nativeBlobSequence = 0;
  var originalCreateObjectURL = window.URL.createObjectURL.bind(window.URL);
  var originalRevokeObjectURL = window.URL.revokeObjectURL.bind(window.URL);
  var originalAnchorClick = window.HTMLAnchorElement.prototype.click;

  window.URL.createObjectURL = function (value) {
    if (value instanceof Blob) {
      var key = 'pf-native-blob:' + (++nativeBlobSequence);
      nativeBlobUrls[key] = value;
      return key;
    }
    return originalCreateObjectURL(value);
  };

  window.URL.revokeObjectURL = function (url) {
    if (nativeBlobUrls[url]) {
      delete nativeBlobUrls[url];
      return;
    }
    return originalRevokeObjectURL(url);
  };

  window.HTMLAnchorElement.prototype.click = function () {
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

  function reportWorkspace() {
    var body = document.body;
    if (!body) return;
    var doodle = body.dataset.workspace === 'doodle' || body.classList.contains('doodle-project');
    send('workspace', { workspace: doodle ? 'doodle' : 'other' });
  }

  function watchWorkspace() {
    if (!document.body) return;
    reportWorkspace();
    new MutationObserver(reportWorkspace).observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'data-workspace']
    });
  }

  if (document.body) watchWorkspace();
  else document.addEventListener('DOMContentLoaded', watchWorkspace, { once: true });

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
  const [currentUrl, setCurrentUrl] = useState(PATTERN_FORGE_URL);

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

  useEffect(() => {
    void setWorkspaceOrientation(isDoodleUrl(currentUrl) ? 'doodle' : 'other');
  }, [currentUrl]);

  useEffect(() => {
    return () => {
      if (Platform.OS === 'android') void ScreenOrientation.unlockAsync();
    };
  }, []);

  const handleMessage = useCallback(async (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data || '{}');
      if (message?.source !== 'PatternForgeAndroid') return;

      if (message.action === 'navigate') {
        const target = normaliseInternalUrl(String(message.payload?.url || ''));
        if (target) {
          setLoading(true);
          setLoadError(false);
          setCurrentUrl(target);
        }
      } else if (message.action === 'workspace') {
        await setWorkspaceOrientation(String(message.payload?.workspace || 'other'));
      } else if (message.action === 'saveFile') {
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
          source={{ uri: currentUrl }}
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
