from pathlib import Path

p = Path('mobile/App.tsx')
s = p.read_text()
old = '''  window.PatternForgeAndroid = {
    saveFile: function (payload) { return send('saveFile', payload); },
    shareFile: function (payload) { return send('shareFile', payload); }
  };
  return true;
})();
true;
`;'''
new = '''  window.PatternForgeAndroid = {
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

  return true;
})();
true;
`;'''
if old not in s:
    raise SystemExit('Android bridge anchor not found')
s = s.replace(old, new, 1)
p.write_text(s)
print('mobile download bridge patched')
