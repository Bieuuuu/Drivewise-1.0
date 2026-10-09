package com.drivewise.copiloto;

import android.accessibilityservice.AccessibilityServiceInfo;
import android.app.Activity;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.accessibility.AccessibilityManager;
import android.webkit.JavascriptInterface;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {

    public static final int REQ_OVERLAY_PERMISSION = 4202;
    public static final int REQ_APP_DETAILS_SETTINGS = 4205;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(DriveWiseNativePlugin.class);
        super.onCreate(savedInstanceState);
        
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().addJavascriptInterface(new DriveWiseJsBridge(), "DriveWiseNativeBridge");
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        notifyWebViewPermissionsUpdated();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_OVERLAY_PERMISSION || requestCode == REQ_APP_DETAILS_SETTINGS) {
            notifyWebViewPermissionsUpdated();
        }
    }

    private void notifyWebViewPermissionsUpdated() {
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().post(() ->
                this.bridge.getWebView().evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('drivewise:permissions-updated'));",
                    null
                )
            );
        }
    }

    public class DriveWiseJsBridge {
        private final Context mContext = MainActivity.this;

        @JavascriptInterface
        public boolean checkAccessibilityPermission() {
            return isAccessibilityServiceEnabled(mContext, RideAccessibilityService.class);
        }

        @JavascriptInterface
        public void requestAccessibilityPermission() {
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                } catch (Exception ignored) {}
            });
        }

        @JavascriptInterface
        public boolean checkOverlayPermission() {
            return Settings.canDrawOverlays(mContext);
        }

        @JavascriptInterface
        public void requestOverlayPermission() {
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
                    intent.setData(Uri.parse("package:" + mContext.getPackageName()));
                    if (Build.VERSION.SDK_INT >= 33) {
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                    } else {
                        startActivityForResult(intent, REQ_OVERLAY_PERMISSION);
                    }
                } catch (Exception ignored) {}
            });
        }

        @JavascriptInterface
        public void openRestrictedSettings() {
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                    intent.setData(Uri.parse("package:" + mContext.getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                } catch (Exception ignored) {}
            });
        }

        @JavascriptInterface
        public void startFloatingOverlay() {
            if (!Settings.canDrawOverlays(mContext)) return;
            runOnUiThread(() -> {
                Intent intent = new Intent(mContext, FloatingOverlayService.class);
                intent.setAction(FloatingOverlayService.ACTION_START);
                startService(intent);
            });
        }

        @JavascriptInterface
        public void stopFloatingOverlay() {
            runOnUiThread(() -> {
                Intent intent = new Intent(mContext, FloatingOverlayService.class);
                intent.setAction(FloatingOverlayService.ACTION_STOP);
                startService(intent);
            });
        }

        @JavascriptInterface
        public boolean isOverlayRunning() {
            return FloatingOverlayService.isRunning;
        }

        private boolean isAccessibilityServiceEnabled(Context context, Class<?> serviceClass) {
            try {
                final String service = context.getPackageName() + "/" + serviceClass.getCanonicalName();
                AccessibilityManager am = (AccessibilityManager) context.getSystemService(Context.ACCESSIBILITY_SERVICE);
                List<AccessibilityServiceInfo> enabledServices = am.getEnabledAccessibilityServiceList(
                        AccessibilityServiceInfo.FEEDBACK_ALL_MASK);
                for (AccessibilityServiceInfo enabledService : enabledServices) {
                    ComponentName enabledName = enabledService.getResolveInfo().activityInfo.getComponentName();
                    if (enabledName != null && enabledName.flattenToString().equals(service)) {
                        return true;
                    }
                }
            } catch (Exception ignored) {}
            return false;
        }
    }
}
