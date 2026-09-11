import { Capacitor } from '@capacitor/core';

export interface NativeRideData {
  platform: 'uber' | '99' | 'indrive';
  grossValue: number;
  totalDistanceKm: number;
  pickupDistanceKm?: number;
  tripDistanceKm?: number;
  durationMinutes?: number;
  pickupAddress?: string;
  destinationAddress?: string;
  rawText?: string;
}

/**
 * Interface for the native Android DriveWise plugin
 * Implemented in Android Studio (Kotlin) as a Capacitor Plugin
 */
export interface DriveWiseNativePlugin {
  checkOverlayPermission: () => Promise<{ granted: boolean }>;
  requestOverlayPermission: () => Promise<{ success: boolean }>;
  checkAccessibilityPermission: () => Promise<{ granted: boolean }>;
  requestAccessibilityPermission: () => Promise<{ success: boolean }>;
  startFloatingOverlay: (options?: { opacity?: number; autoAccept?: boolean }) => Promise<{ success: boolean }>;
  stopFloatingOverlay: () => Promise<{ success: boolean }>;
  updateOverlayData: (data: {
    status: 'idle' | 'analyzing' | 'approved' | 'rejected';
    netProfit: number;
    hourlyRate: number;
    profitPerKm: number;
    recommendation: 'EXCELENTE' | 'BOA' | 'RUIM';
  }) => Promise<{ success: boolean }>;
}

// Fallback dummy for Web/PWA preview
const WebNativeFallback: DriveWiseNativePlugin = {
  checkOverlayPermission: async () => ({ granted: false }),
  requestOverlayPermission: async () => ({ success: false }),
  checkAccessibilityPermission: async () => ({ granted: false }),
  requestAccessibilityPermission: async () => ({ success: false }),
  startFloatingOverlay: async () => ({ success: false }),
  stopFloatingOverlay: async () => ({ success: false }),
  updateOverlayData: async () => ({ success: false }),
};

export const isNativeAndroid = (): boolean => {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
};

export const getNativeBridge = (): DriveWiseNativePlugin => {
  if (isNativeAndroid()) {
    const plugin = (Capacitor as unknown as { Plugins?: { DriveWiseNative?: DriveWiseNativePlugin } })
      ?.Plugins?.DriveWiseNative;
    if (plugin) {
      return plugin;
    }
  }
  return WebNativeFallback;
};
