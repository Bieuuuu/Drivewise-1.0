import { Capacitor } from '@capacitor/core';

/**
 * Detects whether the application is running inside the installed native Android/iOS APK
 * (Capacitor WebView) or as an installed standalone PWA on the device home screen.
 *
 * When this returns true, the app must skip the public marketing landing page and open
 * directly into the authentication screen (Login / Register) or the authenticated dashboard.
 */
export function isInstalledNativeOrPwaApp(): boolean {
  try {
    // 1. Compile-time flag injected during APK build in GitHub Actions
    if (import.meta.env.VITE_NATIVE_APP === 'true') {
      return true;
    }

    // 2. Official Capacitor runtime check
    if (Capacitor.isNativePlatform()) {
      return true;
    }

    if (typeof window !== 'undefined') {
      // 3. Global window.Capacitor bridge check
      const winCap = (window as any).Capacitor;
      if (
        winCap &&
        (winCap.isNativePlatform?.() === true ||
          (typeof winCap.getPlatform === 'function' &&
            winCap.getPlatform() !== 'web'))
      ) {
        return true;
      }

      // 4. Capacitor Android/iOS local WebView origin (https://localhost with no port, capacitor://, file://)
      const { protocol, hostname, port } = window.location;
      if (protocol === 'capacitor:' || protocol === 'file:') {
        return true;
      }
      if (hostname === 'localhost' && (!port || port === '')) {
        return true;
      }

      // 5. Android System WebView userAgent signature (; wv)
      const ua = window.navigator?.userAgent || '';
      if (
        /\bwv\b/i.test(ua) ||
        (/Android/i.test(ua) && /Version\/[0-9.]+/i.test(ua))
      ) {
        return true;
      }

      // 6. Installed Standalone PWA (Android / iOS Home Screen)
      const isStandalone =
        (typeof window.matchMedia === 'function' &&
          window.matchMedia('(display-mode: standalone)').matches) ||
        (window.navigator as any).standalone === true;

      if (isStandalone) {
        return true;
      }
    }
  } catch {
    // Ignore environment inspection errors
  }

  return false;
}
