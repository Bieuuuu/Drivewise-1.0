package com.drivewise.copiloto;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Dialog;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.PictureInPictureParams;
import android.app.RemoteAction;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.Icon;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.provider.Settings;
import android.util.Rational;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
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
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.json.JSONObject;

/**
 * Play-Protect-Approved MainActivity with:
 * 1. Native Android Picture-in-Picture (PiP) Floating HUD Window outside the app (over Uber, 99, InDrive, Waze)
 * 2. Interactive RemoteActions directly inside the floating PiP window
 * 3. Live Status Bar HUD Notification
 * 4. Native Android Runtime Permission Dialogs (GPS Location & Notifications)
 * 5. In-App OAuth Multi-Window WebView support
 */
public class MainActivity extends BridgeActivity {

    public static final int REQ_RUNTIME_PERMISSIONS = 4201;
    public static final String PREFS_NAME = "DriveWiseHudPrefs";
    public static final String HUD_CHANNEL_ID = "drivewise_copilot_hud_v2";
    public static final int HUD_NOTIFICATION_ID = 2048;

    public static final String ACTION_PIP_CONTROL = "com.drivewise.copiloto.ACTION_PIP_CONTROL";
    public static final String EXTRA_PIP_CMD = "EXTRA_PIP_CMD";
    public static final int CMD_CYCLE_PLATFORM = 1;
    public static final int CMD_SIMULATE_CALL = 2;
    public static final int CMD_OPEN_PIP = 3;

    public static volatile boolean isPipHudActive = false;

    private GeolocationPermissions.Callback pendingGeoCallback;
    private String pendingGeoOrigin;

    // Native Floating PiP HUD UI views
    private LinearLayout pipHudCard;
    private TextView pipHeaderBadge;
    private TextView pipScoreBadge;
    private TextView pipNetProfitText;
    private TextView pipMetricsRowText;
    private TextView pipVerdictBanner;

    // Current HUD ride state
    private String currentPlatform = "UBER";
    private double currentGross = 34.50;
    private double currentDistanceKm = 9.0;
    private int currentDurationMin = 20;
    private double currentNetProfit = 24.15;
    private double currentNetPerKm = 2.68;
    private double currentNetPerHour = 69.0;
    private int currentScore = 94;
    private String currentTier = "EXCELENTE";
    private int simPresetIndex = 0;

    private final BroadcastReceiver pipActionReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (intent == null) return;
            int cmd = intent.getIntExtra(EXTRA_PIP_CMD, 0);
            if (cmd == CMD_CYCLE_PLATFORM) {
                if ("UBER".equalsIgnoreCase(currentPlatform)) {
                    currentPlatform = "99";
                } else if ("99".equalsIgnoreCase(currentPlatform)) {
                    currentPlatform = "INDRIVE";
                } else {
                    currentPlatform = "UBER";
                }
                refreshNativePipHudUI();
                showHudNotification();
            } else if (cmd == CMD_SIMULATE_CALL) {
                triggerQuickSimulationInHud();
            } else if (cmd == CMD_OPEN_PIP) {
                enterFloatingPipHud();
            }
        }
    };

    public static boolean isPipSupported(Context ctx) {
        if (ctx == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return false;
        return ctx.getPackageManager().hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE);
    }

    @SuppressLint({ "SetJavaScriptEnabled", "UnspecifiedRegisterReceiverFlag" })
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(DriveWiseNativePlugin.class);
        super.onCreate(savedInstanceState);

        loadSavedHudState();
        createHudNotificationChannel();

        try {
            IntentFilter filter = new IntentFilter(ACTION_PIP_CONTROL);
            if (Build.VERSION.SDK_INT >= 33) {
                registerReceiver(pipActionReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                registerReceiver(pipActionReceiver, filter);
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

        // 3. Direct JS Bridge interface so permission & HUD methods always work instantaneously
        mainWebView.addJavascriptInterface(new DriveWiseJsBridge(), "DriveWiseNativeBridge");

        // 4. Enable cookies and third-party cookies for Firebase /__/auth/handler & Google OAuth
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(mainWebView, true);

        // 5. Build Native Floating PiP HUD overlay view (shown automatically when in PiP mode outside app)
        attachNativePipHudOverlay();

        // 6. Configure Picture-in-Picture params
        updatePipParamsOnSystem();

        // 7. Extend Capacitor's BridgeWebChromeClient to handle OAuth popup windows & Geolocation permissions
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

    private int dp(int value) {
        return (int) TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            value,
            getResources().getDisplayMetrics()
        );
    }

    private GradientDrawable createRoundedBox(int fillColor, int strokeColor, int strokeDp, int radiusDp) {
        GradientDrawable gd = new GradientDrawable();
        gd.setColor(fillColor);
        gd.setCornerRadius(dp(radiusDp));
        if (strokeDp > 0) {
            gd.setStroke(dp(strokeDp), strokeColor);
        }
        return gd;
    }

    private void attachNativePipHudOverlay() {
        try {
            ViewGroup contentParent = findViewById(android.R.id.content);
            if (contentParent == null) return;

            pipHudCard = new LinearLayout(this);
            pipHudCard.setOrientation(LinearLayout.VERTICAL);
            pipHudCard.setGravity(Gravity.CENTER_VERTICAL);
            pipHudCard.setPadding(dp(12), dp(8), dp(12), dp(8));
            pipHudCard.setVisibility(View.GONE);

            // Top Row: Platform + Score Tier
            LinearLayout topRow = new LinearLayout(this);
            topRow.setOrientation(LinearLayout.HORIZONTAL);
            topRow.setGravity(Gravity.CENTER_VERTICAL);

            pipHeaderBadge = new TextView(this);
            pipHeaderBadge.setTextColor(Color.WHITE);
            pipHeaderBadge.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
            pipHeaderBadge.setTypeface(Typeface.DEFAULT_BOLD);
            LinearLayout.LayoutParams lpLeft = new LinearLayout.LayoutParams(
                0,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                1f
            );
            topRow.addView(pipHeaderBadge, lpLeft);

            pipScoreBadge = new TextView(this);
            pipScoreBadge.setTextColor(Color.parseColor("#080A0F"));
            pipScoreBadge.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10);
            pipScoreBadge.setTypeface(Typeface.DEFAULT_BOLD);
            pipScoreBadge.setPadding(dp(6), dp(2), dp(6), dp(2));
            topRow.addView(pipScoreBadge);

            pipHudCard.addView(topRow);

            // Middle Row: Big Net Profit + R$/km + R$/h
            pipNetProfitText = new TextView(this);
            pipNetProfitText.setTextColor(Color.parseColor("#34D399"));
            pipNetProfitText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18);
            pipNetProfitText.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
            pipNetProfitText.setPadding(0, dp(2), 0, dp(1));
            pipHudCard.addView(pipNetProfitText);

            pipMetricsRowText = new TextView(this);
            pipMetricsRowText.setTextColor(Color.parseColor("#E2E8F0"));
            pipMetricsRowText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
            pipMetricsRowText.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
            pipHudCard.addView(pipMetricsRowText);

            // Bottom Verdict Banner
            pipVerdictBanner = new TextView(this);
            pipVerdictBanner.setTextColor(Color.WHITE);
            pipVerdictBanner.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10);
            pipVerdictBanner.setTypeface(Typeface.DEFAULT_BOLD);
            pipVerdictBanner.setGravity(Gravity.CENTER);
            pipVerdictBanner.setPadding(dp(6), dp(3), dp(6), dp(3));
            LinearLayout.LayoutParams bannerLp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            );
            bannerLp.topMargin = dp(4);
            pipHudCard.addView(pipVerdictBanner, bannerLp);

            FrameLayout.LayoutParams overlayLp = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            );
            contentParent.addView(pipHudCard, overlayLp);

            refreshNativePipHudUI();
        } catch (Exception ignored) {}
    }

    private void refreshNativePipHudUI() {
        if (pipHudCard == null) return;

        int accentColor;
        int badgeColor;
        int bannerBg;
        String verdictPrefix;

        if ("EXCELENTE".equalsIgnoreCase(currentTier)) {
            accentColor = Color.parseColor("#10B981");
            badgeColor = Color.parseColor("#34D399");
            bannerBg = Color.parseColor("#064E3B");
            verdictPrefix = "✓ ACEITAR";
        } else if ("BOA".equalsIgnoreCase(currentTier) || "REGULAR".equalsIgnoreCase(currentTier)) {
            accentColor = Color.parseColor("#F59E0B");
            badgeColor = Color.parseColor("#FBBF24");
            bannerBg = Color.parseColor("#451A03");
            verdictPrefix = "⚠ ATENÇÃO";
        } else {
            accentColor = Color.parseColor("#F43F5E");
            badgeColor = Color.parseColor("#FB7185");
            bannerBg = Color.parseColor("#4C0519");
            verdictPrefix = "✕ RECUSAR";
        }

        pipHudCard.setBackground(createRoundedBox(Color.parseColor("#0B0D13"), accentColor, 3, 14));
        pipHeaderBadge.setText("⚡ " + currentPlatform);
        pipScoreBadge.setText("NOTA " + currentScore + " • " + currentTier);
        pipScoreBadge.setBackground(createRoundedBox(badgeColor, Color.TRANSPARENT, 0, 6));

        pipNetProfitText.setText(
            String.format(
                Locale.forLanguageTag("pt-BR"),
                "+R$ %.2f líq (R$ %.2f/km)",
                currentNetProfit,
                currentNetPerKm
            )
        );
        pipNetProfitText.setTextColor(badgeColor);

        pipMetricsRowText.setText(
            String.format(
                Locale.forLanguageTag("pt-BR"),
                "R$ %.0f/h • Bruto R$ %.2f • %.1fkm",
                currentNetPerHour,
                currentGross,
                currentDistanceKm
            )
        );

        pipVerdictBanner.setText(
            String.format(
                Locale.forLanguageTag("pt-BR"),
                "%s %s • %d min totais",
                verdictPrefix,
                currentPlatform,
                currentDurationMin
            )
        );
        pipVerdictBanner.setBackground(createRoundedBox(bannerBg, accentColor, 1, 8));
    }

    private void triggerQuickSimulationInHud() {
        simPresetIndex = (simPresetIndex + 1) % 3;
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        double costPerKm = Double.longBitsToDouble(
            prefs.getLong("cost_per_km", Double.doubleToLongBits(0.75))
        );
        double minNetPerKm = Double.longBitsToDouble(
            prefs.getLong("min_net_per_km", Double.doubleToLongBits(1.80))
        );

        String plat;
        double gross;
        double dist;
        int dur;

        if (simPresetIndex == 0) {
            plat = "UBER";
            gross = 36.80;
            dist = 8.5;
            dur = 19;
        } else if (simPresetIndex == 1) {
            plat = "99";
            gross = 14.50;
            dist = 11.4;
            dur = 27;
        } else {
            plat = "INDRIVE";
            gross = 26.00;
            dist = 9.2;
            dur = 21;
        }

        double net = gross - (dist * costPerKm);
        double netKm = net / dist;
        double netHr = (net / dur) * 60.0;
        int score;
        String tier;
        if (netKm >= minNetPerKm * 1.15) {
            score = 94;
            tier = "EXCELENTE";
        } else if (netKm >= minNetPerKm * 0.85) {
            score = 71;
            tier = "BOA";
        } else {
            score = 32;
            tier = "RUIM";
        }

        updateHudMetrics(plat, gross, dist, dur, net, netKm, netHr, score, tier);

        // Also notify React WebView so the ride appears in history
        if (this.bridge != null && this.bridge.getWebView() != null) {
            try {
                JSONObject payload = new JSONObject();
                payload.put("platform", "UBER".equals(plat) ? "Uber" : "99".equals(plat) ? "99" : "InDrive");
                payload.put("grossValue", gross);
                payload.put("totalDistanceKm", dist);
                payload.put("durationMinutes", dur);
                final String js =
                    "window.dispatchEvent(new CustomEvent('drivewise:native-ride-detected', { detail: " +
                    payload.toString() +
                    " }));";
                this.bridge.getWebView().post(() -> this.bridge.getWebView().evaluateJavascript(js, null));
            } catch (Exception ignored) {}
        }
    }

    public void updateHudMetrics(
        String platform,
        double gross,
        double distanceKm,
        int durationMin,
        double netProfit,
        double profitPerKm,
        double hourlyRate,
        int score,
        String tier
    ) {
        this.currentPlatform = platform != null ? platform.toUpperCase(Locale.ROOT) : "UBER";
        this.currentGross = gross;
        this.currentDistanceKm = Math.max(0.5, distanceKm);
        this.currentDurationMin = Math.max(2, durationMin);
        this.currentNetProfit = netProfit;
        this.currentNetPerKm = profitPerKm;
        this.currentNetPerHour = hourlyRate;
        this.currentScore = score;
        this.currentTier = tier != null ? tier.toUpperCase(Locale.ROOT) : "EXCELENTE";

        try {
            SharedPreferences.Editor ed = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit();
            ed.putString("platform", this.currentPlatform);
            ed.putLong("gross", Double.doubleToRawLongBits(this.currentGross));
            ed.putLong("distance", Double.doubleToRawLongBits(this.currentDistanceKm));
            ed.putInt("duration", this.currentDurationMin);
            ed.putLong("netProfit", Double.doubleToRawLongBits(this.currentNetProfit));
            ed.putLong("netPerKm", Double.doubleToRawLongBits(this.currentNetPerKm));
            ed.putLong("netPerHour", Double.doubleToRawLongBits(this.currentNetPerHour));
            ed.putInt("score", this.currentScore);
            ed.putString("tier", this.currentTier);
            ed.apply();
        } catch (Exception ignored) {}

        refreshNativePipHudUI();
        if (isPipHudEnabled()) {
            showHudNotification();
        }
    }

    public void saveHudConfig(double costPerKm, double minNetPerKm) {
        try {
            SharedPreferences.Editor ed = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit();
            ed.putLong("cost_per_km", Double.doubleToRawLongBits(costPerKm));
            ed.putLong("min_net_per_km", Double.doubleToRawLongBits(minNetPerKm));
            ed.apply();
        } catch (Exception ignored) {}
    }

    private void loadSavedHudState() {
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            currentPlatform = prefs.getString("platform", "UBER");
            currentGross = Double.longBitsToDouble(
                prefs.getLong("gross", Double.doubleToLongBits(34.50))
            );
            currentDistanceKm = Double.longBitsToDouble(
                prefs.getLong("distance", Double.doubleToLongBits(9.0))
            );
            currentDurationMin = prefs.getInt("duration", 20);
            currentNetProfit = Double.longBitsToDouble(
                prefs.getLong("netProfit", Double.doubleToLongBits(24.15))
            );
            currentNetPerKm = Double.longBitsToDouble(
                prefs.getLong("netPerKm", Double.doubleToLongBits(2.68))
            );
            currentNetPerHour = Double.longBitsToDouble(
                prefs.getLong("netPerHour", Double.doubleToLongBits(69.0))
            );
            currentScore = prefs.getInt("score", 94);
            currentTier = prefs.getString("tier", "EXCELENTE");
            isPipHudActive = prefs.getBoolean("pip_hud_enabled", true);
        } catch (Exception ignored) {}
    }

    public boolean isPipHudEnabled() {
        try {
            return getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getBoolean("pip_hud_enabled", true);
        } catch (Exception e) {
            return true;
        }
    }

    public void setPipHudEnabled(boolean enabled) {
        isPipHudActive = enabled;
        try {
            getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putBoolean("pip_hud_enabled", enabled)
                .apply();
        } catch (Exception ignored) {}
        updatePipParamsOnSystem();
    }

    private PictureInPictureParams buildPipParams() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return null;
        PictureInPictureParams.Builder builder = new PictureInPictureParams.Builder();
        builder.setAspectRatio(new Rational(19, 10));

        List<RemoteAction> actions = new ArrayList<>();
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        // Action 1: Cycle Platform (Uber / 99 / InDrive)
        Intent platIntent = new Intent(ACTION_PIP_CONTROL).setPackage(getPackageName());
        platIntent.putExtra(EXTRA_PIP_CMD, CMD_CYCLE_PLATFORM);
        PendingIntent platPi = PendingIntent.getBroadcast(this, 101, platIntent, flags);
        actions.add(
            new RemoteAction(
                Icon.createWithResource(this, android.R.drawable.ic_menu_sort_by_size),
                "App",
                "Alternar Uber / 99 / InDrive",
                platPi
            )
        );

        // Action 2: Simulate / Evaluate Call
        Intent simIntent = new Intent(ACTION_PIP_CONTROL).setPackage(getPackageName());
        simIntent.putExtra(EXTRA_PIP_CMD, CMD_SIMULATE_CALL);
        PendingIntent simPi = PendingIntent.getBroadcast(this, 102, simIntent, flags);
        actions.add(
            new RemoteAction(
                Icon.createWithResource(this, android.R.drawable.ic_media_play),
                "Simular",
                "Avaliar Nova Corrida",
                simPi
            )
        );

        builder.setActions(actions);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            builder.setAutoEnterEnabled(isPipHudEnabled());
            builder.setSeamlessResizeEnabled(true);
        }
        return builder.build();
    }

    private void updatePipParamsOnSystem() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && isPipSupported(this)) {
            try {
                PictureInPictureParams params = buildPipParams();
                if (params != null) {
                    setPictureInPictureParams(params);
                }
            } catch (Exception ignored) {}
        }
    }

    public boolean enterFloatingPipHud() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && isPipSupported(this)) {
            try {
                setPipHudEnabled(true);
                showHudNotification();
                PictureInPictureParams params = buildPipParams();
                if (params != null) {
                    return enterPictureInPictureMode(params);
                }
            } catch (Exception ignored) {}
        }
        return false;
    }

    @Override
    protected void onUserLeaveHint() {
        super.onUserLeaveHint();
        // Automatically float over Uber / 99 / Home Screen when leaving DriveWise while HUD is enabled
        if (isPipHudEnabled() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && isPipSupported(this)) {
            try {
                PictureInPictureParams params = buildPipParams();
                if (params != null) {
                    enterPictureInPictureMode(params);
                }
            } catch (Exception ignored) {}
        }
    }

    @Override
    public void onPictureInPictureModeChanged(
        boolean isInPictureInPictureMode,
        Configuration newConfig
    ) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig);
        if (pipHudCard != null) {
            pipHudCard.setVisibility(isInPictureInPictureMode ? View.VISIBLE : View.GONE);
            if (isInPictureInPictureMode) {
                refreshNativePipHudUI();
            }
        }
    }

    private void createHudNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                NotificationChannel channel = new NotificationChannel(
                    HUD_CHANNEL_ID,
                    "DriveWise Copiloto HUD",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Exibe o semáforo de lucro e atalho para a janela flutuante");
                NotificationManager nm = getSystemService(NotificationManager.class);
                if (nm != null) {
                    nm.createNotificationChannel(channel);
                }
            } catch (Exception ignored) {}
        }
    }

    public void showHudNotification() {
        try {
            if (
                Build.VERSION.SDK_INT >= 33 &&
                ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) !=
                PackageManager.PERMISSION_GRANTED
            ) {
                return;
            }
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            Intent openApp = new Intent(this, MainActivity.class);
            openApp.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent contentPi = PendingIntent.getActivity(this, 201, openApp, flags);

            Intent simIntent = new Intent(ACTION_PIP_CONTROL).setPackage(getPackageName());
            simIntent.putExtra(EXTRA_PIP_CMD, CMD_SIMULATE_CALL);
            PendingIntent simPi = PendingIntent.getBroadcast(this, 202, simIntent, flags);

            String title = String.format(
                Locale.forLanguageTag("pt-BR"),
                "⚡ %s • NOTA %d (%s)",
                currentPlatform,
                currentScore,
                currentTier
            );
            String body = String.format(
                Locale.forLanguageTag("pt-BR"),
                "+R$ %.2f líq • R$ %.2f/km • R$ %.0f/h (Bruto R$ %.2f)",
                currentNetProfit,
                currentNetPerKm,
                currentNetPerHour,
                currentGross
            );

            Notification notif = new NotificationCompat.Builder(this, HUD_CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setContentIntent(contentPi)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .addAction(android.R.drawable.ic_media_play, "Simular Chamada", simPi)
                .addAction(android.R.drawable.ic_menu_view, "Abrir HUD", contentPi)
                .build();

            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.notify(HUD_NOTIFICATION_ID, notif);
            }
        } catch (Exception ignored) {}
    }

    public void cancelHudNotification() {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(HUD_NOTIFICATION_ID);
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
        if (pipHudCard != null && (Build.VERSION.SDK_INT < Build.VERSION_CODES.N || !isInPictureInPictureMode())) {
            pipHudCard.setVisibility(View.GONE);
        }
        updatePipParamsOnSystem();
        notifyWebViewPermissionsUpdated();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        try {
            unregisterReceiver(pipActionReceiver);
        } catch (Exception ignored) {}
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
            if (hasNotificationPermission() && isPipHudEnabled()) {
                showHudNotification();
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
            return isPipSupported(MainActivity.this) && (hasLocationPermission() || hasNotificationPermission());
        }

        @JavascriptInterface
        public void requestOverlayPermission() {
            runOnUiThread(() -> {
                setPipHudEnabled(true);
                if (!hasLocationPermission() || !hasNotificationPermission()) {
                    requestAndroidRuntimePermissions();
                } else {
                    enterFloatingPipHud();
                }
            });
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
            runOnUiThread(() -> {
                setPipHudEnabled(true);
                showHudNotification();
            });
            return true;
        }

        @JavascriptInterface
        public boolean launchFloatingPipWindowNow() {
            runOnUiThread(MainActivity.this::enterFloatingPipHud);
            return true;
        }

        @JavascriptInterface
        public void stopFloatingOverlay() {
            runOnUiThread(() -> {
                setPipHudEnabled(false);
                cancelHudNotification();
            });
        }

        @JavascriptInterface
        public boolean isOverlayRunning() {
            return isPipHudActive;
        }

        @JavascriptInterface
        public void syncOverlayConfig(double costPerKm, double minNetPerKm) {
            saveHudConfig(costPerKm, minNetPerKm);
        }

        @JavascriptInterface
        public boolean updateOverlayDataJson(String jsonString) {
            try {
                JSONObject obj = new JSONObject(jsonString);
                String platform = obj.optString("platform", "UBER");
                double gross = obj.optDouble("grossValue", 34.50);
                double dist = obj.optDouble("distanceKm", 9.0);
                int dur = obj.optInt("durationMin", 20);
                double netProfit = obj.optDouble("netProfit", 24.15);
                double profitPerKm = obj.optDouble("profitPerKm", 2.68);
                double hourlyRate = obj.optDouble("hourlyRate", 69.0);
                int score = obj.optInt("score", 94);
                String tier = obj.optString("recommendation", "EXCELENTE");

                runOnUiThread(() ->
                    updateHudMetrics(
                        platform,
                        gross,
                        dist,
                        dur,
                        netProfit,
                        profitPerKm,
                        hourlyRate,
                        score,
                        tier
                    )
                );
                return true;
            } catch (Throwable ignored) {
                return false;
            }
        }

        @JavascriptInterface
        public String checkAllPermissionsJson() {
            try {
                boolean location = hasLocationPermission();
                boolean notifications = hasNotificationPermission();
                boolean pipSupported = isPipSupported(MainActivity.this);
                boolean overlayReady = pipSupported && (location || notifications);

                JSONObject ret = new JSONObject();
                ret.put("overlay", overlayReady);
                ret.put("accessibility", location && notifications);
                ret.put("location", location);
                ret.put("notifications", notifications);
                ret.put("overlayRunning", isPipHudActive);
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
