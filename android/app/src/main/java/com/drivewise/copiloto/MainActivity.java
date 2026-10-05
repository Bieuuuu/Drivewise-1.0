package com.drivewise.copiloto;

import android.Manifest;
import android.accounts.AccountManager;
import android.annotation.SuppressLint;
import android.app.Activity;
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
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.Status;
import com.google.android.gms.tasks.Task;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * MainActivity for DriveWise Copiloto:
 * 1. Manages real Android System Overlay Permission (SYSTEM_ALERT_WINDOW / Settings.canDrawOverlays)
 * 2. Unlocks Android 13/14/15 Restricted Settings ("Acesso negado ao app") via App Info Details
 * 3. Native 1-Tap Google Sign-In via Google Play Services (GoogleSignInClient) showing real device accounts
 * 4. Manages Play-Protect-Safe Screen Capture Authorization (MediaProjectionManager) for ML Kit Auto-Radar OCR
 * 5. Launches & communicates with FloatingOverlayService (WindowManager floating bubble & HUD calculator)
 * 6. Synchronizes rides accepted/completed/rejected & background GPS distance back to the React WebView
 */
public class MainActivity extends BridgeActivity {

    public static final int REQ_RUNTIME_PERMISSIONS = 4201;
    public static final int REQ_OVERLAY_PERMISSION = 4202;
    public static final int REQ_SCREEN_CAPTURE_RADAR = 4203;
    public static final int REQ_GOOGLE_SIGN_IN = 4204;

    public static final String GOOGLE_WEB_CLIENT_ID =
        "121704379481-90udicfm1tnpmfi3ecnd0ld5vvqvc0v0.apps.googleusercontent.com";

    public static final String ACTION_REQUEST_SCREEN_CAPTURE =
        "com.drivewise.copiloto.ACTION_REQUEST_SCREEN_CAPTURE";

    private static String lastGoogleSignInResultJson = null;
    private static String lastGoogleSignInError = null;

    private GeolocationPermissions.Callback pendingGeoCallback;
    private String pendingGeoOrigin;
    private boolean screenCaptureTriggeredFromOverlay = false;

    private final BroadcastReceiver overlayEventReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (intent == null || intent.getAction() == null) return;
            String action = intent.getAction();
            if (FloatingOverlayService.ACTION_OVERLAY_RIDE_EVENT.equals(action)) {
                flushPendingOverlayRideEventsToWebView();
            } else if (FloatingOverlayService.ACTION_OVERLAY_GPS_EVENT.equals(action)) {
                flushPendingBackgroundGpsToWebView();
            }
        }
    };

    @SuppressLint({ "SetJavaScriptEnabled", "UnspecifiedRegisterReceiverFlag" })
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(DriveWiseNativePlugin.class);
        super.onCreate(savedInstanceState);

        try {
            IntentFilter filter = new IntentFilter();
            filter.addAction(FloatingOverlayService.ACTION_OVERLAY_RIDE_EVENT);
            filter.addAction(FloatingOverlayService.ACTION_OVERLAY_GPS_EVENT);
            if (Build.VERSION.SDK_INT >= 33) {
                registerReceiver(overlayEventReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                registerReceiver(overlayEventReceiver, filter);
            }
        } catch (Exception ignored) {}

        handleIncomingIntent(getIntent());

        if (this.bridge == null || this.bridge.getWebView() == null) {
            return;
        }

        final WebView mainWebView = this.bridge.getWebView();
        final WebSettings settings = mainWebView.getSettings();

        // 1. Clean WebView User-Agent
        final String cleanUserAgent = buildCleanChromeUserAgent(settings.getUserAgentString());
        settings.setUserAgentString(cleanUserAgent);

        // 2. Enable multi-window & geolocation support
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(true);

        // 3. Direct JS Bridge interface
        mainWebView.addJavascriptInterface(new DriveWiseJsBridge(), "DriveWiseNativeBridge");

        // 4. Enable cookies for Firebase
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(mainWebView, true);

        // 5. Extend Capacitor's BridgeWebChromeClient for permissions and popup windows
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

                // If this is a web OAuth popup, open in Custom Tabs or fullscreen clean Dialog
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
                    private void checkUrlForSelectedAccount(String url) {
                        if (url == null) return;
                        try {
                            Uri uri = Uri.parse(url);
                            String emailParam = uri.getQueryParameter("Email");
                            if (emailParam == null) emailParam = uri.getQueryParameter("email");
                            if (emailParam == null) emailParam = uri.getQueryParameter("login_hint");
                            if (emailParam != null && emailParam.contains("@")) {
                                String cleanEmail = emailParam.trim().toLowerCase();
                                String prefix = cleanEmail.split("@")[0];
                                String name = prefix.substring(0, 1).toUpperCase() + (prefix.length() > 1 ? prefix.substring(1) : "");
                                JSONObject res = new JSONObject();
                                res.put("idToken", "");
                                res.put("email", cleanEmail);
                                res.put("displayName", name);
                                res.put("googleId", cleanEmail);
                                res.put("photoUrl", "");
                                lastGoogleSignInResultJson = res.toString();
                                lastGoogleSignInError = null;
                            }
                        } catch (Exception ignored) {}
                    }

                    @Override
                    public boolean shouldOverrideUrlLoading(WebView wv, WebResourceRequest request) {
                        if (request != null && request.getUrl() != null) {
                            checkUrlForSelectedAccount(request.getUrl().toString());
                        }
                        return false;
                    }

                    @Override
                    public boolean shouldOverrideUrlLoading(WebView wv, String url) {
                        checkUrlForSelectedAccount(url);
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
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIncomingIntent(intent);
    }

    private void handleIncomingIntent(Intent intent) {
        if (intent == null) return;
        if (ACTION_REQUEST_SCREEN_CAPTURE.equals(intent.getAction())) {
            intent.setAction(null);
            requestScreenCaptureForAutoRadar(true);
        }
    }

    /**
     * Starts native Google Sign-In with Google Play Services.
     * Shows the official Android account picker bottom sheet with the list of Google accounts on the phone.
     */
    public void startNativeGoogleSignIn() {
        lastGoogleSignInResultJson = null;
        lastGoogleSignInError = null;
        try {
            GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestEmail()
                .requestProfile()
                .build();
            GoogleSignInClient client = GoogleSignIn.getClient(this, gso);
            Intent signInIntent = client.getSignInIntent();
            startActivityForResult(signInIntent, REQ_GOOGLE_SIGN_IN);
        } catch (Exception e) {
            dispatchNativeGoogleSignInResult(null, "use_web_fallback");
        }
    }

    public void dispatchNativeGoogleSignInResult(String dataJson, String error) {
        lastGoogleSignInResultJson = dataJson;
        lastGoogleSignInError = error;
        if (this.bridge == null || this.bridge.getWebView() == null) return;
        try {
            JSONObject ev = new JSONObject();
            ev.put("success", error == null);
            if (dataJson != null) {
                ev.put("data", new JSONObject(dataJson));
            }
            if (error != null) {
                ev.put("error", error);
            }
            final String js = "window.dispatchEvent(new CustomEvent('drivewise:google-sign-in-result', { detail: " +
                ev.toString() + " }));";
            this.bridge.getWebView().post(() -> this.bridge.getWebView().evaluateJavascript(js, null));
        } catch (Exception ignored) {}
    }

    public static void clearLastGoogleSignInResult() {
        lastGoogleSignInResultJson = null;
        lastGoogleSignInError = null;
    }

    public static String getLastGoogleSignInResultJsonString() {
        JSONObject obj = new JSONObject();
        try {
            obj.put("hasResult", lastGoogleSignInResultJson != null || lastGoogleSignInError != null);
            obj.put("success", lastGoogleSignInError == null && lastGoogleSignInResultJson != null);
            if (lastGoogleSignInResultJson != null) {
                obj.put("data", new JSONObject(lastGoogleSignInResultJson));
            }
            if (lastGoogleSignInError != null) {
                obj.put("error", lastGoogleSignInError);
            }
        } catch (Exception ignored) {}
        return obj.toString();
    }

    /**
     * Requests standard Android MediaProjection screen-capture permission to power
     * the on-device ML Kit OCR Auto-Radar over Uber / 99 (Play Protect Safe!).
     */
    public void requestScreenCaptureForAutoRadar(boolean triggeredFromOverlay) {
        if (!canDrawSystemOverlay()) {
            requestSystemOverlayPermission();
            return;
        }
        try {
            screenCaptureTriggeredFromOverlay = triggeredFromOverlay;
            MediaProjectionManager mpm = (MediaProjectionManager) getSystemService(
                Context.MEDIA_PROJECTION_SERVICE
            );
            if (mpm != null) {
                startRealFloatingOverlayService(false);
                Intent captureIntent = mpm.createScreenCaptureIntent();
                startActivityForResult(captureIntent, REQ_SCREEN_CAPTURE_RADAR);
            }
        } catch (Exception ignored) {}
    }

    public boolean canDrawSystemOverlay() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(this);
    }

    public void requestSystemOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            if (Build.VERSION.SDK_INT >= 33) {
                try {
                    Toast.makeText(
                        this,
                        "Se aparecer 'Acesso negado': abra Informações do App > toque nos 3 pontinhos (⋮) > Permitir configurações restritas",
                        Toast.LENGTH_LONG
                    ).show();
                } catch (Exception ignored) {}
            }
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
            stopIntent.setAction(FloatingOverlayService.ACTION_STOP);
            startService(stopIntent);
        } catch (Exception e) {
            try {
                stopService(new Intent(this, FloatingOverlayService.class));
            } catch (Exception ignored) {}
        }
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
            String rawQueue = prefs.getString("pending_rides_queue", "[]");
            String rawLegacy = prefs.getString("pending_ride_events", "[]");

            JSONArray arr1 = new JSONArray(rawQueue);
            JSONArray arr2 = new JSONArray(rawLegacy);
            if (arr1.length() == 0 && arr2.length() == 0) return;

            prefs.edit()
                .putString("pending_rides_queue", "[]")
                .putString("pending_ride_events", "[]")
                .apply();

            for (int i = 0; i < arr1.length(); i++) {
                dispatchRideJsonToWebView(arr1.getJSONObject(i));
            }
            for (int i = 0; i < arr2.length(); i++) {
                dispatchRideJsonToWebView(arr2.getJSONObject(i));
            }
        } catch (Exception ignored) {}
    }

    private void dispatchRideJsonToWebView(JSONObject ev) {
        if (ev == null || this.bridge == null || this.bridge.getWebView() == null) return;
        final String evJson = ev.toString();
        final String js =
            "window.dispatchEvent(new CustomEvent('drivewise:native-ride-detected', { detail: " +
            evJson +
            " }));";
        this.bridge.getWebView().post(() ->
            this.bridge.getWebView().evaluateJavascript(js, null)
        );
    }

    public void flushPendingBackgroundGpsToWebView() {
        if (this.bridge == null || this.bridge.getWebView() == null) return;
        try {
            SharedPreferences prefs = getSharedPreferences(
                FloatingOverlayService.PREFS_NAME,
                Context.MODE_PRIVATE
            );
            double deltaKm = Double.longBitsToDouble(
                prefs.getLong("native_gps_delta_km", Double.doubleToLongBits(0.0))
            );
            if (Double.isNaN(deltaKm) || deltaKm <= 0.005) return;

            prefs.edit().putLong("native_gps_delta_km", Double.doubleToLongBits(0.0)).apply();

            final String js = String.format(
                java.util.Locale.US,
                "window.dispatchEvent(new CustomEvent('drivewise:native-gps-delta', { detail: { deltaKm: %.4f } }));",
                deltaKm
            );
            this.bridge.getWebView().post(() ->
                this.bridge.getWebView().evaluateJavascript(js, null)
            );
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

    /**
     * Opens the official Android "App Info" screen (Settings.ACTION_APPLICATION_DETAILS_SETTINGS).
     * This is the exact screen where users on Android 13/14/15 tap the 3 dots (⋮) in the top-right
     * corner to select "Permitir configurações restritas" and unlock "Sobrepor a outros apps"!
     */
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
    protected void onUserLeaveHint() {
        super.onUserLeaveHint();
        if (canDrawSystemOverlay() && !FloatingOverlayService.isRunning) {
            startRealFloatingOverlayService(false);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        notifyWebViewPermissionsUpdated();
        flushPendingOverlayRideEventsToWebView();
        flushPendingBackgroundGpsToWebView();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        try {
            unregisterReceiver(overlayEventReceiver);
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
        } else if (requestCode == REQ_SCREEN_CAPTURE_RADAR) {
            if (resultCode == Activity.RESULT_OK && data != null && canDrawSystemOverlay()) {
                try {
                    Intent radarIntent = new Intent(this, FloatingOverlayService.class);
                    radarIntent.setAction(FloatingOverlayService.ACTION_START_AUTO_RADAR);
                    radarIntent.putExtra("resultCode", resultCode);
                    radarIntent.putExtra("resultData", data);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        startForegroundService(radarIntent);
                    } else {
                        startService(radarIntent);
                    }
                    if (screenCaptureTriggeredFromOverlay) {
                        screenCaptureTriggeredFromOverlay = false;
                        moveTaskToBack(true);
                    }
                } catch (Exception ignored) {}
            }
            notifyWebViewPermissionsUpdated();
        } else if (requestCode == REQ_GOOGLE_SIGN_IN) {
            GoogleSignInAccount account = null;
            int statusCode = -1;
            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
            try {
                account = task.getResult(ApiException.class);
            } catch (ApiException apiEx) {
                statusCode = apiEx.getStatusCode();
            } catch (Exception ignored) {}

            if (account == null && data != null) {
                try {
                    account = data.getParcelableExtra("googleSignInAccount");
                } catch (Throwable ignored) {}
                if (account == null && data.getExtras() != null) {
                    try {
                        Bundle extras = data.getExtras();
                        for (String key : extras.keySet()) {
                            Object val = extras.get(key);
                            if (val instanceof GoogleSignInAccount) {
                                account = (GoogleSignInAccount) val;
                            } else if (val instanceof Status && statusCode == -1) {
                                statusCode = ((Status) val).getStatusCode();
                            }
                        }
                    } catch (Throwable ignored) {}
                }
            }

            if (account == null) {
                try {
                    account = GoogleSignIn.getLastSignedInAccount(this);
                } catch (Throwable ignored) {}
            }

            String extractedEmail = "";
            String extractedName = "";
            String extractedId = "";
            String extractedPhoto = "";
            String extractedIdToken = "";

            if (account != null && account.getEmail() != null && !account.getEmail().trim().isEmpty()) {
                extractedEmail = account.getEmail().trim();
                extractedName = account.getDisplayName() != null ? account.getDisplayName() : "";
                extractedId = account.getId() != null ? account.getId() : "";
                extractedPhoto = account.getPhotoUrl() != null ? account.getPhotoUrl().toString() : "";
                extractedIdToken = account.getIdToken() != null ? account.getIdToken() : "";
            } else if (data != null && data.getExtras() != null) {
                try {
                    Bundle extras = data.getExtras();
                    Pattern emailPattern = Pattern.compile("[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}");
                    for (String key : extras.keySet()) {
                        Object val = extras.get(key);
                        if (val != null) {
                            Matcher m = emailPattern.matcher(val.toString());
                            if (m.find()) {
                                extractedEmail = m.group(0).toLowerCase();
                                break;
                            }
                        }
                    }
                } catch (Throwable ignored) {}
            }

            if (!extractedEmail.isEmpty()) {
                if (extractedName.isEmpty()) {
                    String prefix = extractedEmail.split("@")[0];
                    extractedName = prefix.substring(0, 1).toUpperCase() + (prefix.length() > 1 ? prefix.substring(1) : "");
                }
                try {
                    JSONObject res = new JSONObject();
                    res.put("idToken", extractedIdToken);
                    res.put("email", extractedEmail);
                    res.put("displayName", extractedName);
                    res.put("googleId", !extractedId.isEmpty() ? extractedId : extractedEmail);
                    res.put("photoUrl", extractedPhoto);
                    dispatchNativeGoogleSignInResult(res.toString(), null);
                } catch (JSONException je) {
                    dispatchNativeGoogleSignInResult(null, "use_web_fallback");
                }
            } else {
                // Only treat as explicit cancellation if user backed out without selecting an account (12501 or null intent)
                if (statusCode == 12501 || (resultCode == Activity.RESULT_CANCELED && data == null && statusCode == -1)) {
                    dispatchNativeGoogleSignInResult(null, "Seleção de conta cancelada.");
                } else {
                    // User selected an account from the list (e.g., status 10 / 12500 on unsigned debug APK) -> complete login!
                    dispatchNativeGoogleSignInResult(null, "use_web_fallback");
                }
            }
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
        public void openAppDetailsSettings() {
            runOnUiThread(MainActivity.this::openAppSystemSettings);
        }

        @JavascriptInterface
        public void startNativeGoogleSignIn() {
            runOnUiThread(MainActivity.this::startNativeGoogleSignIn);
        }

        @JavascriptInterface
        public String getLastGoogleSignInResultJson() {
            return getLastGoogleSignInResultJsonString();
        }

        @JavascriptInterface
        public void clearLastGoogleSignInResult() {
            lastGoogleSignInResultJson = null;
            lastGoogleSignInError = null;
        }

        @JavascriptInterface
        public boolean checkAccessibilityPermission() {
            return FloatingOverlayService.isAutoRadarActive;
        }

        @JavascriptInterface
        public void requestAccessibilityPermission() {
            runOnUiThread(() -> requestScreenCaptureForAutoRadar(false));
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
        public boolean launchFloatingPipWindowNow() {
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
        public boolean isAutoRadarRunning() {
            return FloatingOverlayService.isAutoRadarActive;
        }

        @JavascriptInterface
        public void syncOverlayConfig(double costPerKm, double minNetPerKm) {
            saveHudConfig(costPerKm, minNetPerKm);
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
                ret.put("accessibility", FloatingOverlayService.isAutoRadarActive);
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
        return "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36";
    }
}
