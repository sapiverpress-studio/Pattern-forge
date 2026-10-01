(() => {
  const nativeBridge = window.PatternForgeAndroid || null;
  const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches || false;
  const runtime = nativeBridge ? 'android-native' : (standalone ? 'pwa' : 'web');
  async function invoke(action, payload = {}) {
    if (!nativeBridge || typeof nativeBridge[action] !== 'function') return { handled:false };
    try {
      const result = nativeBridge[action](JSON.stringify(payload));
      return { handled:true, result };
    } catch (error) {
      console.error(`PatternForge Android bridge ${action} failed`, error);
      return { handled:false, error:String(error) };
    }
  }
  window.PatternForgePlatform = Object.freeze({
    runtime,
    isNativeAndroid: Boolean(nativeBridge),
    isStandalone: standalone,
    invoke,
    capabilities: Object.freeze({
      nativeFileSave: Boolean(nativeBridge?.saveFile),
      nativeShare: Boolean(nativeBridge?.shareFile),
      nativeOpenFile: Boolean(nativeBridge?.openFile)
    })
  });
})();
