package com.drivewise.copiloto;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Dialog;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.projection.MediaProjectionManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.provider.Settings;
import android.view.Gravity;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ImageButton;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * MainActivity for DriveWise Copiloto:
 * 1. Manages real Android System Overlay Permission (SYSTEM_ALERT_WINDOW / Settings.canDrawOverlays)
 * 2. Launches & communicates with FloatingOverlayService (real WindowManager floating bubble & HUD calculator)
 * 3. Synchronizes rides accepted/completed/rejected in the floating overlay back to the React WebView
 * 4. Manages GPS Location & Notification Runtime Permissions + In-App OAuth Multi-Window WebView
 */
public class MainActivity extends BridgeActivity {

    public static final int REQ_RUNTIME_PERMISSIONS = 4201;
    public static final int REQ_OVERLAY_PERMISSION = 4202;
    public static final int REQ_SCREEN_CAPTURE_PERMISSION = 4203;

    private MediaProjectionManager screenCaptureManager;

    private GeolocationPermissions.Callback pendingGeoCallback;
    private String pendingGeoOrigin;

    private final BroadcastReceiver overlayRideReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (intent == null) return;
            if (FloatingOverlayService.ACTION_OVERLAY_RIDE_EVENT.equals(intent.getAction())) {
                flushPendingOverlayRideEventsToWebView();
            }
        }
    };

    @SuppressLint({ "SetJavaScriptEnabled", "UnspecifiedRegisterReceiverFlag" })
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(DriveWiseNativePlugin.class);
        super.onCreate(savedInstanceState);

        try {
            IntentFilter filter = new IntentFilter(FloatingOverlayService.ACTION_OVERLAY_RIDE_EVENT);
            if (Build.VERSION.SDK_INT >= 33) {
                registerReceiver(overlayRideReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                registerReceiver(overlayRideReceiver, filter);
            }
        } catch (Exception ignored) {}

        if (this.bridge == null || this.bridge.getWebView() == null) {
            return;
        }

        final WebView mainWebView = this.bridge.getWebView();
        final WebSettings settings = mainWebView.getSettings();

        // 1. Clean WebView User-Agent so Google OAuth treats it as standard Chrome Mobile
        final String cleanUserAgent = buildCleanChromeUserAgent(settings.getUserAgentString());
        settings.setUserAgentString(cleanUserAgent);

        // 2. Enable multi-window & geolocation support
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(true);

        // 3. Direct JS Bridge interface so permission & HUD methods work instantaneously
        mainWebView.addJavascriptInterface(new DriveWiseJsBridge(), "DriveWiseNativeBridge");

        // 4. Enable cookies and third-party cookies for Firebase /__/auth/handler & Google OAuth
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(mainWebView, true);

        // 5. Extend Capacitor's BridgeWebChromeClient to handle OAuth popup windows & Geolocation permissions
        mainWebView.setWebChromeClient(new BridgeWebChromeClient(this.bridge) {
            @Override
            public void onGeolocationPermissionsShowPrompt(
                String origin,
                GeolocationPermissions.Callback callback
            ) {
                boolean hasLocation = hasLocationPermission();
                if (hasLocation) {
                    callback.invoke(origin, true, false);
                } else {
                    pendingGeoOrigin = origin;
                    pendingGeoCallback = callback;
                    requestAndroidRuntimePermissions();
                }
            }

            @Override
            public boolean onCreateWindow(
                WebView view,
                boolean isDialog,
                boolean isUserGesture,
                Message resultMsg
            ) {
                if (resultMsg == null || !(resultMsg.obj instanceof WebView.WebViewTransport)) {
                    return false;
                }

                final Dialog oauthDialog = new Dialog(
                    MainActivity.this,
                    android.R.style.Theme_Black_NoTitleBar_Fullscreen
                );
                Window window = oauthDialog.getWindow();
                if (window != null) {
                    window.setLayout(
                        WindowManager.LayoutParams.MATCH_PARENT,
                        WindowManager.LayoutParams.MATCH_PARENT
                    );
                }

                FrameLayout container = new FrameLayout(MainActivity.this);
                container.setBackgroundColor(Color.parseColor("#0B0D11"));

                final WebView popupWebView = new WebView(MainActivity.this);
                WebSettings popupSettings = popupWebView.getSettings();
                popupSettings.setJavaScriptEnabled(true);
                popupSettings.setDomStorageEnabled(true);
                popupSettings.setDatabaseEnabled(true);
                popupSettings.setJavaScriptCanOpenWindowsAutomatically(true);
                popupSettings.setSupportMultipleWindows(true);
                popupSettings.setUserAgentString(cleanUserAgent);

                CookieManager.getInstance().setAcceptCookie(true);
                CookieManager.getInstance().setAcceptThirdPartyCookies(popupWebView, true);

                popupWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView wv, WebResourceRequest request) {
                        return false;
                    }

                    @Override
                    public boolean shouldOverrideUrlLoading(WebView wv, String url) {
                        return false;
                    }
                });

                popupWebView.setWebChromeClient(new WebChromeClient() {
                    @Override
                    public void onCloseWindow(WebView windowWebView) {
                        try {
                            if (oauthDialog.isShowing()) {
                                oauthDialog.dismiss();
                            }
                        } catch (Exception ignored) {}
                        try {
                            windowWebView.destroy();
                        } catch (Exception ignored) {}
                    }
                });

                ImageButton closeBtn = new ImageButton(MainActivity.this);
                closeBtn.setImageResource(android.R.drawable.ic_menu_close_clear_cancel);
                closeBtn.setBackgroundColor(Color.argb(140, 19, 22, 28));
                FrameLayout.LayoutParams btnParams = new FrameLayout.LayoutParams(108, 108);
                btnParams.gravity = Gravity.TOP | Gravity.END;
                btnParams.setMargins(24, 36, 24, 24);
                closeBtn.setOnClickListener(v -> {
                    try {
                        oauthDialog.dismiss();
                    } catch (Exception ignored) {}
                    try {
                        popupWebView.destroy();
                    } catch (Exception ignored) {}
                });

                container.addView(
                    popupWebView,
                    new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                );
                container.addView(closeBtn, btnParams);

                oauthDialog.setContentView(container);
                oauthDialog.setOnCancelListener(dialog -> {
                    try {
                        popupWebView.destroy();
                    } catch (Exception ignored) {}
                });

                oauthDialog.show();

                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(popupWebView);
                resultMsg.sendToTarget();
                return true;
            }
        });
    }

    public boolean canDrawSystemOverlay() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(this);
    }

    public void requestSystemOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            try {
                Intent intent = new Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getPackageName())
                );
                startActivityForResult(intent, REQ_OVERLAY_PERMISSION);
                return;
            } catch (Exception e) {
                try {
                    Intent fallback = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
                    fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(fallback);
                    return;
                } catch (Exception ignored) {}
            }
        }
        startRealFloatingOverlayService(false);
        notifyWebViewPermissionsUpdated();
    }

    public boolean startRealFloatingOverlayService(boolean expandNow) {
        if (!canDrawSystemOverlay()) {
            return false;
        }
        try {
            Intent serviceIntent = new Intent(this, FloatingOverlayService.class);
            serviceIntent.setAction(
                expandNow ? FloatingOverlayService.ACTION_EXPAND : FloatingOverlayService.ACTION_START
            );
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public void stopRealFloatingOverlayService() {
        try {
            Intent stopIntent = new Intent(this, FloatingOverlayService.class);
            stopService(stopIntent);
        } catch (Exception ignored) {}
    }

    /**
     * Zero-toque OCR: asks the user for one-time screen-capture consent (standard Android
     * MediaProjection dialog — NOT blocked by Play Protect) and then starts
     * ScreenCaptureService, which reads Uber/99/InDrive offer cards automatically.
     */
    public boolean requestAndStartScreenCapture() {
        try {
            if (screenCaptureManager == null) {
                screenCaptureManager = (MediaProjectionManager)
                    getSystemService(Context.MEDIA_PROJECTION_SERVICE);
            }
            if (screenCaptureManager == null) return false;
            Intent captureIntent = screenCaptureManager.createScreenCaptureIntent();
            startActivityForResult(captureIntent, REQ_SCREEN_CAPTURE_PERMISSION);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public void stopScreenCaptureService() {
        try {
            Intent stopIntent = new Intent(this, ScreenCaptureService.class);
            stopIntent.setAction(ScreenCaptureService.ACTION_STOP);
            startService(stopIntent);
        } catch (Exception ignored) {}
    }

    public void saveHudConfig(double costPerKm, double minNetPerKm) {
        try {
            SharedPreferences.Editor ed = getSharedPreferences(
                FloatingOverlayService.PREFS_NAME,
                Context.MODE_PRIVATE
            ).edit();
            ed.putLong("cost_per_km", Double.doubleToRawLongBits(costPerKm));
            ed.putLong("min_net_per_km", Double.doubleToRawLongBits(minNetPerKm));
            ed.apply();

            if (FloatingOverlayService.isRunning) {
                Intent cfgIntent = new Intent(this, FloatingOverlayService.class);
                cfgIntent.setAction(FloatingOverlayService.ACTION_UPDATE_CONFIG);
                startService(cfgIntent);
            }
        } catch (Exception ignored) {}
    }

    public void pushRideDataToFloatingOverlay(
        String platform,
        double grossValue,
        double distanceKm,
        int durationMin,
        boolean expand
    ) {
        if (!canDrawSystemOverlay()) return;
        try {
            Intent dataIntent = new Intent(this, FloatingOverlayService.class);
            dataIntent.setAction(FloatingOverlayService.ACTION_UPDATE_DATA);
            dataIntent.putExtra("platform", platform != null ? platform : "Uber");
            dataIntent.putExtra("grossValue", grossValue);
            dataIntent.putExtra("distanceKm", distanceKm);
            dataIntent.putExtra("durationMin", durationMin);
            dataIntent.putExtra("expand", expand);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(dataIntent);
            } else {
                startService(dataIntent);
            }
        } catch (Exception ignored) {}
    }

    public void flushPendingOverlayRideEventsToWebView() {
        if (this.bridge == null || this.bridge.getWebView() == null) return;
        try {
            SharedPreferences prefs = getSharedPreferences(
                FloatingOverlayService.PREFS_NAME,
                Context.MODE_PRIVATE
            );
            String raw = prefs.getString("pending_ride_events", "[]");
            JSONArray arr = new JSONArray(raw);
            if (arr.length() == 0) return;

            // Clear queue before dispatching
            prefs.edit().putString("pending_ride_events", "[]").apply();

            for (int i = 0; i < arr.length(); i++) {
                JSONObject ev = arr.getJSONObject(i);
                final String evJson = ev.toString();
                final String js =
                    "window.dispatchEvent(new CustomEvent('drivewise:native-ride-detected', { detail: " +
                    evJson +
                    " }));";
                this.bridge.getWebView().post(() ->
                    this.bridge.getWebView().evaluateJavascript(js, null)
                );
            }
        } catch (Exception ignored) {}
    }

    public boolean hasLocationPermission() {
        return (
            ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED
        );
    }

    public boolean hasNotificationPermission() {
        return (
            Build.VERSION.SDK_INT < 33 ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED
        );
    }

    public void requestAndroidRuntimePermissions() {
        List<String> needed = new ArrayList<>();
        if (
            ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            needed.add(Manifest.permission.ACCESS_FINE_LOCATION);
            needed.add(Manifest.permission.ACCESS_COARSE_LOCATION);
        }
        if (
            Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            needed.add(Manifest.permission.POST_NOTIFICATIONS);
        }

        if (!needed.isEmpty()) {
            ActivityCompat.requestPermissions(
                this,
                needed.toArray(new String[0]),
                REQ_RUNTIME_PERMISSIONS
            );
        } else {
            notifyWebViewPermissionsUpdated();
        }
    }

    public void openAppSystemSettings() {
        try {
            Intent intent = new Intent(
                Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.parse("package:" + getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
        } catch (Exception ignored) {}
    }

    @Override
    public void onResume() {
        super.onResume();
        notifyWebViewPermissionsUpdated();
        flushPendingOverlayRideEventsToWebView();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        try {
            unregisterReceiver(overlayRideReceiver);
        } catch (Exception ignored) {}
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_OVERLAY_PERMISSION) {
            if (canDrawSystemOverlay()) {
                startRealFloatingOverlayService(false);
            }
            notifyWebViewPermissionsUpdated();
        } else if (requestCode == REQ_SCREEN_CAPTURE_PERMISSION) {
            // Zero-toque: user granted screen-capture consent for this turn → start OCR reader.
            boolean started = false;
            if (resultCode == RESULT_OK && data != null) {
                try {
                    Intent captureIntent = new Intent(this, ScreenCaptureService.class);
                    captureIntent.setAction(ScreenCaptureService.ACTION_START_WITH_RESULT);
                    captureIntent.putExtra(ScreenCaptureService.EXTRA_RESULT_CODE, resultCode);
                    captureIntent.putExtra(ScreenCaptureService.EXTRA_RESULT_DATA, data);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        startForegroundService(captureIntent);
                    } else {
                        startService(captureIntent);
                    }
                    started = true;
                } catch (Exception ignored) {}
            }
            dispatchScreenCaptureResultToWebView(started);
        }
    }

    private void dispatchScreenCaptureResultToWebView(boolean started) {
        if (this.bridge == null || this.bridge.getWebView() == null) return;
        final String js =
            "window.dispatchEvent(new CustomEvent('drivewise:screen-capture-status', { detail: " +
            "{\"capturing\":" + (started ? "true" : "false") +
            ",\"reading\":" + quoteJson(FloatingOverlayService.lastAutoReadingJson) + "} }));";
        this.bridge.getWebView().post(() ->
            this.bridge.getWebView().evaluateJavascript(js, null)
        );
    }

    private static String quoteJson(String maybeJson) {
        if (maybeJson == null || maybeJson.isEmpty()) return "null";
        try {
            new JSONObject(maybeJson);
            return maybeJson; // already valid JSON object
        } catch (Exception e) {
            return "null";
        }
    }

    @Override
    public void onRequestPermissionsResult(
        int requestCode,
        @NonNull String[] permissions,
        @NonNull int[] grantResults
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_RUNTIME_PERMISSIONS) {
            boolean hasLoc = hasLocationPermission();
            if (pendingGeoCallback != null && pendingGeoOrigin != null) {
                pendingGeoCallback.invoke(pendingGeoOrigin, hasLoc, false);
                pendingGeoCallback = null;
                pendingGeoOrigin = null;
            }
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

        @JavascriptInterface
        public boolean checkOverlayPermission() {
            return canDrawSystemOverlay();
        }

        @JavascriptInterface
        public void requestOverlayPermission() {
            runOnUiThread(MainActivity.this::requestSystemOverlayPermission);
        }

        @JavascriptInterface
        public boolean checkAccessibilityPermission() {
            return hasLocationPermission() && hasNotificationPermission();
        }

        @JavascriptInterface
        public void requestAccessibilityPermission() {
            runOnUiThread(() -> {
                if (!hasLocationPermission() || !hasNotificationPermission()) {
                    requestAndroidRuntimePermissions();
                } else {
                    openAppSystemSettings();
                }
            });
        }

        @JavascriptInterface
        public void requestRuntimePermissions() {
            runOnUiThread(MainActivity.this::requestAndroidRuntimePermissions);
        }

        @JavascriptInterface
        public boolean startFloatingOverlay() {
            if (!canDrawSystemOverlay()) {
                return false;
            }
            runOnUiThread(() -> startRealFloatingOverlayService(false));
            return true;
        }

        @JavascriptInterface
        public boolean expandFloatingOverlayNow() {
            if (!canDrawSystemOverlay()) {
                runOnUiThread(MainActivity.this::requestSystemOverlayPermission);
                return false;
            }
            runOnUiThread(() -> startRealFloatingOverlayService(true));
            return true;
        }

        @JavascriptInterface
        public void stopFloatingOverlay() {
            runOnUiThread(MainActivity.this::stopRealFloatingOverlayService);
        }

        @JavascriptInterface
        public boolean isOverlayRunning() {
            return FloatingOverlayService.isRunning;
        }

        @JavascriptInterface
        public void syncOverlayConfig(double costPerKm, double minNetPerKm) {
            saveHudConfig(costPerKm, minNetPerKm);
        }

        @JavascriptInterface
        public boolean startScreenCaptureAutoRead() {
            final MainActivity act = MainActivity.this;
            // Overlay HUD must be running so the OCR reading has somewhere to land.
            runOnUiThread(() -> {
                if (act.canDrawSystemOverlay()) act.startRealFloatingOverlayService(false);
                act.requestAndStartScreenCapture();
            });
            return true;
        }

        @JavascriptInterface
        public void stopScreenCaptureAutoRead() {
            runOnUiThread(MainActivity.this::stopScreenCaptureService);
        }

        @JavascriptInterface
        public String getScreenCaptureStatusJson() {
            try {
                JSONObject ret = new JSONObject();
                ret.put("capturing", ScreenCaptureService.isCapturing);
                String reading = FloatingOverlayService.lastAutoReadingJson;
                ret.put("readingAt", FloatingOverlayService.lastAutoReadingAt);
                ret.put("reading", (reading != null && !reading.isEmpty())
                    ? new JSONObject(reading) : JSONObject.NULL);
                return ret.toString();
            } catch (Exception e) {
                return "{\"capturing\":false,\"reading\":null}";
            }
        }

        @JavascriptInterface
        public boolean updateOverlayDataJson(String jsonString) {
            try {
                JSONObject obj = new JSONObject(jsonString);
                String platform = obj.optString("platform", "Uber");
                double gross = obj.optDouble("grossValue", 0.0);
                double dist = obj.optDouble("distanceKm", 5.0);
                int dur = obj.optInt("durationMin", 12);
                boolean expand = obj.optBoolean("expand", false);

                runOnUiThread(() ->
                    pushRideDataToFloatingOverlay(platform, gross, dist, dur, expand)
                );
                return true;
            } catch (Throwable ignored) {
                return false;
            }
        }

        @JavascriptInterface
        public String checkAllPermissionsJson() {
            try {
                boolean overlayReady = canDrawSystemOverlay();
                boolean location = hasLocationPermission();
                boolean notifications = hasNotificationPermission();

                JSONObject ret = new JSONObject();
                ret.put("overlay", overlayReady);
                ret.put("accessibility", location && notifications);
                ret.put("location", location);
                ret.put("notifications", notifications);
                ret.put("overlayRunning", FloatingOverlayService.isRunning);
                return ret.toString();
            } catch (Exception e) {
                return "{\"overlay\":false,\"accessibility\":false,\"location\":false,\"notifications\":false,\"overlayRunning\":false}";
            }
        }
    }

    private String buildCleanChromeUserAgent(String originalUa) {
        if (originalUa == null || originalUa.isEmpty()) {
            return "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
        }
        return originalUa
            .replace("; wv)", ")")
            .replace("; wv", "")
            .replace("Version/4.0 ", "");
    }
}
