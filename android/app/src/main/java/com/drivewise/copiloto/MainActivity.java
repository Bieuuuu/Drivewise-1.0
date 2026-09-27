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
import java.util.Locale;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {

    public static final int REQ_RUNTIME_PERMISSIONS = 4201;
    private GeolocationPermissions.Callback pendingGeoCallback;
    private String pendingGeoOrigin;

    private final BroadcastReceiver rideDetectedReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (intent == null || bridge == null || bridge.getWebView() == null) return;
            try {
                String platform = intent.getStringExtra("platform");
                double grossValue = intent.getDoubleExtra("grossValue", 0.0);
                double totalDistanceKm = intent.getDoubleExtra("totalDistanceKm", 0.0);
                int durationMinutes = intent.getIntExtra("durationMinutes", 15);

                JSONObject payload = new JSONObject();
                payload.put("platform", platform != null ? platform : "Uber");
                payload.put("grossValue", grossValue);
                payload.put("totalDistanceKm", totalDistanceKm);
                payload.put("durationMinutes", durationMinutes);

                final String js =
                    "window.dispatchEvent(new CustomEvent('drivewise:native-ride-detected', { detail: " +
                    payload.toString() +
                    " }));";
                bridge.getWebView().post(() -> bridge.getWebView().evaluateJavascript(js, null));
            } catch (Exception ignored) {}
        }
    };

    @SuppressLint({ "SetJavaScriptEnabled", "UnspecifiedRegisterReceiverFlag" })
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(DriveWiseNativePlugin.class);
        super.onCreate(savedInstanceState);

        try {
            IntentFilter filter = new IntentFilter(DriveWiseAccessibilityService.ACTION_RIDE_DETECTED);
            if (Build.VERSION.SDK_INT >= 33) {
                registerReceiver(rideDetectedReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                registerReceiver(rideDetectedReceiver, filter);
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

        // 3. Direct JS Bridge interface so permission & overlay methods always work instantaneously
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
                boolean hasLocation =
                    ContextCompat.checkSelfPermission(
                        MainActivity.this,
                        Manifest.permission.ACCESS_FINE_LOCATION
                    ) ==
                    PackageManager.PERMISSION_GRANTED ||
                    ContextCompat.checkSelfPermission(
                        MainActivity.this,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                    ) ==
                    PackageManager.PERMISSION_GRANTED;

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

    @Override
    public void onResume() {
        super.onResume();
        notifyWebViewPermissionsUpdated();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        try {
            unregisterReceiver(rideDetectedReceiver);
        } catch (Exception ignored) {}
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
            boolean hasLocation =
                ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                ) ==
                PackageManager.PERMISSION_GRANTED;

            if (pendingGeoCallback != null && pendingGeoOrigin != null) {
                pendingGeoCallback.invoke(pendingGeoOrigin, hasLocation, false);
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
            return (
                Build.VERSION.SDK_INT < Build.VERSION_CODES.M ||
                Settings.canDrawOverlays(MainActivity.this)
            );
        }

        @JavascriptInterface
        public void requestOverlayPermission() {
            if (
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
                !Settings.canDrawOverlays(MainActivity.this)
            ) {
                try {
                    Intent intent = new Intent(
                        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + getPackageName())
                    );
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                } catch (Exception e) {
                    Intent fallback = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
                    fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(fallback);
                }
            }
        }

        @JavascriptInterface
        public boolean checkAccessibilityPermission() {
            return DriveWiseAccessibilityService.isAccessibilitySettingsOn(MainActivity.this);
        }

        @JavascriptInterface
        public void requestAccessibilityPermission() {
            try {
                Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void requestRuntimePermissions() {
            runOnUiThread(MainActivity.this::requestAndroidRuntimePermissions);
        }

        @JavascriptInterface
        public boolean startFloatingOverlay() {
            boolean canDraw = checkOverlayPermission();
            if (canDraw) {
                try {
                    Intent intent = new Intent(MainActivity.this, FloatingOverlayService.class);
                    intent.setAction(FloatingOverlayService.ACTION_START_OVERLAY);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        startForegroundService(intent);
                    } else {
                        startService(intent);
                    }
                    return true;
                } catch (Throwable ignored) {}
            }
            return false;
        }

        @JavascriptInterface
        public void stopFloatingOverlay() {
            try {
                Intent intent = new Intent(MainActivity.this, FloatingOverlayService.class);
                stopService(intent);
            } catch (Throwable ignored) {}
        }

        @JavascriptInterface
        public boolean isOverlayRunning() {
            return FloatingOverlayService.isOverlayRunning;
        }

        @JavascriptInterface
        public void syncOverlayConfig(double costPerKm, double minNetPerKm) {
            try {
                SharedPreferences.Editor editor = getSharedPreferences(
                    FloatingOverlayService.PREFS_NAME,
                    Context.MODE_PRIVATE
                ).edit();
                editor.putLong("cost_per_km", Double.doubleToRawLongBits(costPerKm));
                editor.putLong("min_net_per_km", Double.doubleToRawLongBits(minNetPerKm));
                editor.apply();
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public boolean updateOverlayDataJson(String jsonString) {
            if (!checkOverlayPermission()) return false;
            try {
                JSONObject obj = new JSONObject(jsonString);
                Intent intent = new Intent(MainActivity.this, FloatingOverlayService.class);
                intent.setAction(FloatingOverlayService.ACTION_UPDATE_RIDE);
                intent.putExtra(
                    "EXTRA_PLATFORM",
                    obj.optString("platform", "UBER").toUpperCase(Locale.ROOT)
                );
                intent.putExtra("EXTRA_VALUE", obj.optDouble("grossValue", 34.50));
                intent.putExtra("EXTRA_DISTANCE", obj.optDouble("distanceKm", 9.0));
                intent.putExtra("EXTRA_DURATION", obj.optInt("durationMin", 20));
                intent.putExtra("EXTRA_NET_PROFIT", obj.optDouble("netProfit", 24.15));
                intent.putExtra("EXTRA_NET_PER_KM", obj.optDouble("profitPerKm", 2.68));
                intent.putExtra("EXTRA_NET_PER_HOUR", obj.optDouble("hourlyRate", 69.0));
                intent.putExtra("EXTRA_SCORE", obj.optInt("score", 94));
                intent.putExtra("EXTRA_TIER", obj.optString("recommendation", "EXCELENTE"));
                intent.putExtra("EXTRA_EXPAND", obj.optBoolean("expand", true));
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(intent);
                } else {
                    startService(intent);
                }
                return true;
            } catch (Throwable ignored) {
                return false;
            }
        }

        @JavascriptInterface
        public String checkAllPermissionsJson() {
            try {
                boolean overlay = checkOverlayPermission();
                boolean accessibility = checkAccessibilityPermission();
                boolean location =
                    ContextCompat.checkSelfPermission(
                        MainActivity.this,
                        Manifest.permission.ACCESS_FINE_LOCATION
                    ) ==
                    PackageManager.PERMISSION_GRANTED ||
                    ContextCompat.checkSelfPermission(
                        MainActivity.this,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                    ) ==
                    PackageManager.PERMISSION_GRANTED;
                boolean notifications =
                    Build.VERSION.SDK_INT < 33 ||
                    ContextCompat.checkSelfPermission(
                        MainActivity.this,
                        Manifest.permission.POST_NOTIFICATIONS
                    ) ==
                    PackageManager.PERMISSION_GRANTED;

                JSONObject ret = new JSONObject();
                ret.put("overlay", overlay);
                ret.put("accessibility", accessibility);
                ret.put("location", location);
                ret.put("notifications", notifications);
                ret.put("overlayRunning", FloatingOverlayService.isOverlayRunning);
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
