/**
 * DriveWise Native Bridge (Capacitor / Android WebView)
 *
 * Connects the React/TypeScript frontend directly to:
 * 1. window.DriveWiseNativeBridge (@JavascriptInterface in MainActivity.java)
 * 2. window.Capacitor.Plugins.DriveWiseNative (Capacitor Plugin)
 * 3. Web/PWA fallback when running in a standard desktop/mobile browser
 */

export interface NativePermissionsStatus {
  overlay: boolean;
  accessibility: boolean;
  location: boolean;
  notifications: boolean;
  overlayRunning: boolean;
}

export interface NativeOverlayRidePayload {
  platform?: string;
  grossValue?: number;
  distanceKm?: number;
  durationMin?: number;
  netProfit: number;
  profitPerKm: number;
  hourlyRate: number;
  score: number;
  recommendation: string;
  expand?: boolean;
}

export interface NativeGoogleSignInResult {
  success: boolean;
  idToken?: string;
  email?: string;
  displayName?: string;
  googleId?: string;
  photoUrl?: string;
  error?: string;
}

export interface NativeBridgePlugin {
  checkOverlayPermission: () => Promise<{ granted: boolean }>;
  requestOverlayPermission: () => Promise<{ success: boolean }>;
  openAppDetailsSettings: () => Promise<{ success: boolean }>;
  nativeGoogleSignIn: () => Promise<NativeGoogleSignInResult>;
  checkAccessibilityPermission: () => Promise<{ granted: boolean }>;
  requestAccessibilityPermission: () => Promise<{ success: boolean }>;
  requestRuntimePermissions: () => Promise<{ success: boolean }>;
  checkAllPermissions: () => Promise<NativePermissionsStatus>;
  startFloatingOverlay: () => Promise<{ success: boolean }>;
  launchFloatingPipWindowNow: () => Promise<{ success: boolean }>;
  stopFloatingOverlay: () => Promise<{ success: boolean }>;
  syncOverlayConfig: (costPerKm: number, minNetPerKm: number) => Promise<{ success: boolean }>;
  updateOverlayData: (payload: NativeOverlayRidePayload) => Promise<{ success: boolean }>;
}

declare global {
  interface Window {
    DriveWiseNativeBridge?: {
      checkOverlayPermission: () => boolean;
      requestOverlayPermission: () => void;
      openAppDetailsSettings?: () => void;
      startNativeGoogleSignIn?: () => void;
      getLastGoogleSignInResultJson?: () => string;
      clearLastGoogleSignInResult?: () => void;
      checkAccessibilityPermission: () => boolean;
      requestAccessibilityPermission: () => void;
      requestRuntimePermissions: () => void;
      startFloatingOverlay: () => boolean;
      launchFloatingPipWindowNow?: () => boolean;
      stopFloatingOverlay: () => void;
      isOverlayRunning: () => boolean;
      syncOverlayConfig: (costPerKm: number, minNetPerKm: number) => void;
      updateOverlayDataJson: (jsonString: string) => boolean;
      checkAllPermissionsJson: () => string;
    };
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
      Plugins?: {
        DriveWiseNative?: any;
      };
    };
  }
}

export const isNativeAndroid = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (window.DriveWiseNativeBridge) return true;
  if (window.Capacitor?.isNativePlatform?.() && window.Capacitor?.getPlatform?.() === 'android') {
    return true;
  }
  return Boolean(window.Capacitor?.Plugins?.DriveWiseNative);
};

export const nativeBridge: NativeBridgePlugin = {
  async checkOverlayPermission() {
    if (typeof window !== 'undefined' && window.DriveWiseNativeBridge) {
      try {
        const granted = Boolean(window.DriveWiseNativeBridge.checkOverlayPermission());
        return { granted };
      } catch (e) {
        console.warn('[NativeBridge] checkOverlayPermission JSBridge error:', e);
      }
    }
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.DriveWiseNative) {
      try {
        return await window.Capacitor.Plugins.DriveWiseNative.checkOverlayPermission();
      } catch (e) {
        console.warn('[NativeBridge] checkOverlayPermission Capacitor error:', e);
      }
    }
    const saved = localStorage.getItem('dw_overlay_permission_granted') === 'true';
    return { granted: saved };
  },

  async requestOverlayPermission() {
    if (typeof window !== 'undefined' && window.DriveWiseNativeBridge) {
      try {
        window.DriveWiseNativeBridge.requestOverlayPermission();
        return { success: true };
      } catch (e) {
        console.warn('[NativeBridge] requestOverlayPermission JSBridge error:', e);
      }
    }
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.DriveWiseNative) {
      try {
        return await window.Capacitor.Plugins.DriveWiseNative.requestOverlayPermission();
      } catch (e) {
        console.warn('[NativeBridge] requestOverlayPermission Capacitor error:', e);
      }
    }
    localStorage.setItem('dw_overlay_permission_granted', 'true');
    return { success: true };
  },

  async openAppDetailsSettings() {
    if (typeof window !== 'undefined' && window.DriveWiseNativeBridge?.openAppDetailsSettings) {
      try {
        window.DriveWiseNativeBridge.openAppDetailsSettings();
        return { success: true };
      } catch (e) {
        console.warn('[NativeBridge] openAppDetailsSettings JSBridge error:', e);
      }
    }
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.DriveWiseNative?.openAppDetailsSettings) {
      try {
        return await window.Capacitor.Plugins.DriveWiseNative.openAppDetailsSettings();
      } catch (e) {
        console.warn('[NativeBridge] openAppDetailsSettings Capacitor error:', e);
      }
    }
    return { success: true };
  },

  async nativeGoogleSignIn(): Promise<NativeGoogleSignInResult> {
    if (typeof window === 'undefined') {
      return { success: false, error: 'Ambiente não suportado.' };
    }

    try {
      window.DriveWiseNativeBridge?.clearLastGoogleSignInResult?.();
    } catch {}

    return new Promise<NativeGoogleSignInResult>((resolve) => {
      let timeoutId: any = null;
      let checkIntervalId: any = null;
      let hasFinished = false;

      const finish = (result: NativeGoogleSignInResult) => {
        if (hasFinished) return;
        hasFinished = true;
        clearTimeout(timeoutId);
        clearInterval(checkIntervalId);
        window.removeEventListener('drivewise:google-sign-in-result', handleResult);
        window.removeEventListener('focus', checkBridgeState);
        resolve(result);
      };

      const handleResult = (event: Event) => {
        const customEvent = event as CustomEvent<{
          success?: boolean;
          data?: {
            idToken?: string;
            email?: string;
            displayName?: string;
            googleId?: string;
            photoUrl?: string;
          };
          error?: string;
        }>;

        if (customEvent.detail?.success && customEvent.detail.data?.email) {
          finish({
            success: true,
            idToken: customEvent.detail.data.idToken || '',
            email: customEvent.detail.data.email,
            displayName: customEvent.detail.data.displayName || '',
            googleId: customEvent.detail.data.googleId || '',
            photoUrl: customEvent.detail.data.photoUrl || '',
          });
        } else {
          finish({
            success: false,
            error: customEvent.detail?.error || 'Login com Google cancelado ou não concluído.',
          });
        }
      };

      const checkBridgeState = () => {
        if (typeof window !== 'undefined' && window.DriveWiseNativeBridge?.getLastGoogleSignInResultJson) {
          try {
            const raw = window.DriveWiseNativeBridge.getLastGoogleSignInResultJson();
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed.hasResult) {
                if (parsed.success && parsed.data?.email) {
                  finish({
                    success: true,
                    idToken: parsed.data.idToken || '',
                    email: parsed.data.email,
                    displayName: parsed.data.displayName || '',
                    googleId: parsed.data.googleId || '',
                    photoUrl: parsed.data.photoUrl || '',
                  });
                } else if (parsed.error) {
                  finish({
                    success: false,
                    error: parsed.error,
                  });
                }
              }
            }
          } catch {}
        }
      };

      window.addEventListener('drivewise:google-sign-in-result', handleResult);
      window.addEventListener('focus', checkBridgeState);

      // Periodically check bridge state every 400ms for fast responsive resolution
      checkIntervalId = setInterval(checkBridgeState, 400);

      timeoutId = setTimeout(() => {
        finish({ success: false, error: 'Tempo limite ao aguardar resposta do Google Play Services.' });
      }, 90000);

      if (window.DriveWiseNativeBridge?.startNativeGoogleSignIn) {
        try {
          window.DriveWiseNativeBridge.startNativeGoogleSignIn();
          return;
        } catch (e: any) {
          finish({ success: false, error: e?.message || 'Falha ao iniciar Google Sign-In.' });
          return;
        }
      }

      if (window.Capacitor?.Plugins?.DriveWiseNative?.nativeGoogleSignIn) {
        window.Capacitor.Plugins.DriveWiseNative.nativeGoogleSignIn().catch((e: any) => {
          finish({ success: false, error: e?.message || 'Falha no plugin Google Sign-In.' });
        });
        return;
      }

      finish({ success: false, error: 'Google Play Services não disponível neste dispositivo.' });
    });
  },

  async checkAccessibilityPermission() {
    if (typeof window !== 'undefined' && window.DriveWiseNativeBridge) {
      try {
        const granted = Boolean(window.DriveWiseNativeBridge.checkAccessibilityPermission());
        return { granted };
      } catch (e) {
        console.warn('[NativeBridge] checkAccessibilityPermission JSBridge error:', e);
      }
    }
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.DriveWiseNative) {
      try {
        return await window.Capacitor.Plugins.DriveWiseNative.checkAccessibilityPermission();
      } catch (e) {
        console.warn('[NativeBridge] checkAccessibilityPermission Capacitor error:', e);
      }
    }
    const saved = localStorage.getItem('dw_accessibility_permission_granted') === 'true';
    return { granted: saved };
  },

  async requestAccessibilityPermission() {
    if (typeof window !== 'undefined' && window.DriveWiseNativeBridge) {
      try {
        window.DriveWiseNativeBridge.requestAccessibilityPermission();
        return { success: true };
      } catch (e) {
        console.warn('[NativeBridge] requestAccessibilityPermission JSBridge error:', e);
      }
    }
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.DriveWiseNative) {
      try {
        return await window.Capacitor.Plugins.DriveWiseNative.requestAccessibilityPermission();
      } catch (e) {
        console.warn('[NativeBridge] requestAccessibilityPermission Capacitor error:', e);
      }
    }
    localStorage.setItem('dw_accessibility_permission_granted', 'true');
    return { success: true };
  },

  async requestRuntimePermissions() {
    if (typeof window !== 'undefined' && window.DriveWiseNativeBridge) {
      try {
        window.DriveWiseNativeBridge.requestRuntimePermissions();
        return { success: true };
      } catch (e) {
        console.warn('[NativeBridge] requestRuntimePermissions JSBridge error:', e);
      }
    }
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.DriveWiseNative) {
      try {
        return await window.Capacitor.Plugins.DriveWiseNative.requestRuntimePermissions();
      } catch (e) {
        console.warn('[NativeBridge] requestRuntimePermissions Capacitor error:', e);
      }
    }
    return { success: true };
  },

  async checkAllPermissions(): Promise<NativePermissionsStatus> {
    if (typeof window !== 'undefined' && window.DriveWiseNativeBridge) {
      try {
        const raw = window.DriveWiseNativeBridge.checkAllPermissionsJson();
        const parsed = JSON.parse(raw);
        return {
          overlay: Boolean(parsed.overlay),
          accessibility: Boolean(parsed.accessibility),
          location: Boolean(parsed.location),
          notifications: Boolean(parsed.notifications),
          overlayRunning: Boolean(parsed.overlayRunning),
        };
      } catch (e) {
        console.warn('[NativeBridge] checkAllPermissions JSBridge error:', e);
      }
    }
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.DriveWiseNative) {
      try {
        return await window.Capacitor.Plugins.DriveWiseNative.checkAllPermissions();
      } catch (e) {
        console.warn('[NativeBridge] checkAllPermissions Capacitor error:', e);
      }
    }
    const overlay = localStorage.getItem('dw_overlay_permission_granted') === 'true';
    const accessibility = localStorage.getItem('dw_accessibility_permission_granted') === 'true';
    return {
      overlay,
      accessibility,
      location: true,
      notifications: true,
      overlayRunning: overlay,
    };
  },

  async startFloatingOverlay() {
    if (typeof window !== 'undefined' && window.DriveWiseNativeBridge) {
      try {
        const success = Boolean(window.DriveWiseNativeBridge.startFloatingOverlay());
        return { success };
      } catch (e) {
        console.warn('[NativeBridge] startFloatingOverlay JSBridge error:', e);
        return { success: false };
      }
    }
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.DriveWiseNative) {
      try {
        return await window.Capacitor.Plugins.DriveWiseNative.startFloatingOverlay();
      } catch (e) {
        console.warn('[NativeBridge] startFloatingOverlay Capacitor error:', e);
        return { success: false };
      }
    }
    return { success: true };
  },

  async launchFloatingPipWindowNow() {
    if (typeof window !== 'undefined' && window.DriveWiseNativeBridge?.launchFloatingPipWindowNow) {
      try {
        const success = Boolean(window.DriveWiseNativeBridge.launchFloatingPipWindowNow());
        return { success };
      } catch (e) {
        console.warn('[NativeBridge] launchFloatingPipWindowNow JSBridge error:', e);
        return { success: false };
      }
    }
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.DriveWiseNative) {
      try {
        return await window.Capacitor.Plugins.DriveWiseNative.startFloatingOverlay({
          enterPipNow: true,
        });
      } catch (e) {
        console.warn('[NativeBridge] launchFloatingPipWindowNow Capacitor error:', e);
        return { success: false };
      }
    }
    return { success: true };
  },

  async stopFloatingOverlay() {
    if (typeof window !== 'undefined' && window.DriveWiseNativeBridge) {
      try {
        window.DriveWiseNativeBridge.stopFloatingOverlay();
        return { success: true };
      } catch (e) {
        console.warn('[NativeBridge] stopFloatingOverlay JSBridge error:', e);
        return { success: false };
      }
    }
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.DriveWiseNative) {
      try {
        return await window.Capacitor.Plugins.DriveWiseNative.stopFloatingOverlay();
      } catch (e) {
        console.warn('[NativeBridge] stopFloatingOverlay Capacitor error:', e);
        return { success: false };
      }
    }
    return { success: true };
  },

  async syncOverlayConfig(costPerKm: number, minNetPerKm: number) {
    if (typeof window !== 'undefined' && window.DriveWiseNativeBridge) {
      try {
        window.DriveWiseNativeBridge.syncOverlayConfig(costPerKm, minNetPerKm);
        return { success: true };
      } catch (e) {
        console.warn('[NativeBridge] syncOverlayConfig JSBridge error:', e);
      }
    }
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.DriveWiseNative) {
      try {
        return await window.Capacitor.Plugins.DriveWiseNative.syncOverlayConfig({
          costPerKm,
          minNetPerKm,
        });
      } catch (e) {
        console.warn('[NativeBridge] syncOverlayConfig Capacitor error:', e);
      }
    }
    return { success: true };
  },

  async updateOverlayData(payload: NativeOverlayRidePayload) {
    if (typeof window !== 'undefined' && window.DriveWiseNativeBridge) {
      try {
        const success = Boolean(
          window.DriveWiseNativeBridge.updateOverlayDataJson(JSON.stringify(payload))
        );
        return { success };
      } catch (e) {
        console.warn('[NativeBridge] updateOverlayData JSBridge error:', e);
        return { success: false };
      }
    }
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.DriveWiseNative) {
      try {
        return await window.Capacitor.Plugins.DriveWiseNative.updateOverlayData(payload);
      } catch (e) {
        console.warn('[NativeBridge] updateOverlayData Capacitor error:', e);
        return { success: false };
      }
    }
    return { success: true };
  },
};
