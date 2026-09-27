package com.drivewise.copiloto;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.util.DisplayMetrics;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.core.app.NotificationCompat;
import java.util.Locale;

/**
 * Native Android Foreground Service that renders the DriveWise Floating HUD Overlay
 * OUTSIDE the app (over Uber Driver, 99 Motorista, InDrive, Waze, and Home Screen).
 */
public class FloatingOverlayService extends Service {

    public static final String CHANNEL_ID = "drivewise_overlay_hud_channel";
    public static final int NOTIFICATION_ID = 1042;
    public static final String PREFS_NAME = "DriveWiseNativePrefs";

    public static final String ACTION_START_OVERLAY = "com.drivewise.copiloto.ACTION_START_OVERLAY";
    public static final String ACTION_STOP_OVERLAY = "com.drivewise.copiloto.ACTION_STOP_OVERLAY";
    public static final String ACTION_UPDATE_RIDE = "com.drivewise.copiloto.ACTION_UPDATE_RIDE";
    public static final String ACTION_UPDATE_CONFIG = "com.drivewise.copiloto.ACTION_UPDATE_CONFIG";

    public static volatile boolean isOverlayRunning = false;

    private WindowManager windowManager;
    private FrameLayout rootContainer;
    private LinearLayout compactPillView;
    private LinearLayout expandedCardView;
    private WindowManager.LayoutParams windowParams;

    // UI References in Compact Pill
    private View compactDotView;
    private TextView compactTitleText;
    private TextView compactSubtitleText;

    // UI References in Expanded HUD Card
    private TextView cardPlatformBadge;
    private TextView cardScoreBadge;
    private TextView cardGrossValueText;
    private TextView cardNetProfitText;
    private TextView cardNetPerKmText;
    private TextView cardNetPerHourText;
    private TextView cardTripInfoText;
    private TextView cardVerdictBanner;

    // Current state
    private boolean isExpanded = false;
    private String currentPlatform = "UBER";
    private double currentGross = 34.50;
    private double currentDistanceKm = 9.0;
    private int currentDurationMin = 21;
    private double currentNetProfit = 24.15;
    private double currentNetPerKm = 2.68;
    private double currentNetPerHour = 69.0;
    private int currentScore = 94;
    private String currentTier = "EXCELENTE";
    private int simulationStep = 0;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        startForegroundSafely();
        loadSavedDefaults();
        if (canDrawOverlays()) {
            createOverlayWindow();
            isOverlayRunning = true;
        }
    }

    private boolean canDrawOverlays() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return Settings.canDrawOverlays(this);
        }
        return true;
    }

    private void loadSavedDefaults() {
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            currentPlatform = prefs.getString("last_platform", "UBER");
            currentGross = Double.longBitsToDouble(
                prefs.getLong("last_gross", Double.doubleToLongBits(34.50))
            );
            currentDistanceKm = Double.longBitsToDouble(
                prefs.getLong("last_distance", Double.doubleToLongBits(9.0))
            );
            currentDurationMin = prefs.getInt("last_duration", 21);
            currentNetProfit = Double.longBitsToDouble(
                prefs.getLong("last_net_profit", Double.doubleToLongBits(24.15))
            );
            currentNetPerKm = Double.longBitsToDouble(
                prefs.getLong("last_net_km", Double.doubleToLongBits(2.68))
            );
            currentNetPerHour = Double.longBitsToDouble(
                prefs.getLong("last_net_hour", Double.doubleToLongBits(69.0))
            );
            currentScore = prefs.getInt("last_score", 94);
            currentTier = prefs.getString("last_tier", "EXCELENTE");
        } catch (Exception ignored) {}
    }

    private void saveCurrentRideToPrefs() {
        try {
            SharedPreferences.Editor editor = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit();
            editor.putString("last_platform", currentPlatform);
            editor.putLong("last_gross", Double.doubleToRawLongBits(currentGross));
            editor.putLong("last_distance", Double.doubleToRawLongBits(currentDistanceKm));
            editor.putInt("last_duration", currentDurationMin);
            editor.putLong("last_net_profit", Double.doubleToRawLongBits(currentNetProfit));
            editor.putLong("last_net_km", Double.doubleToRawLongBits(currentNetPerKm));
            editor.putLong("last_net_hour", Double.doubleToRawLongBits(currentNetPerHour));
            editor.putInt("last_score", currentScore);
            editor.putString("last_tier", currentTier);
            editor.apply();
        } catch (Exception ignored) {}
    }

    private void startForegroundSafely() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "DriveWise Copiloto HUD Flutuante",
                    NotificationManager.IMPORTANCE_LOW
                );
                channel.setDescription("Mantém o semáforo de lucro flutuando sobre a Uber e 99");
                NotificationManager manager = getSystemService(NotificationManager.class);
                if (manager != null) {
                    manager.createNotificationChannel(channel);
                }
            }

            Intent openAppIntent = new Intent(this, MainActivity.class);
            openAppIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, openAppIntent, pendingFlags);

            Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("DriveWise Copiloto Ativo")
                .setContentText("HUD flutuante monitorando chamadas da Uber, 99 e InDrive")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();

            if (Build.VERSION.SDK_INT >= 34) {
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
                );
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Throwable ignored) {
            // Even if foreground notification is restricted, overlay window still attaches when SYSTEM_ALERT_WINDOW is granted
        }
    }

    private int dp(int value) {
        return (int) TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            value,
            getResources().getDisplayMetrics()
        );
    }

    private GradientDrawable createRoundedDrawable(int fillColor, int strokeColor, int strokeWidthDp, int radiusDp) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(fillColor);
        drawable.setCornerRadius(dp(radiusDp));
        if (strokeWidthDp > 0) {
            drawable.setStroke(dp(strokeWidthDp), strokeColor);
        }
        return drawable;
    }

    private void createOverlayWindow() {
        if (rootContainer != null) {
            return;
        }

        windowManager = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
        if (windowManager == null) return;

        int layoutType;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            layoutType = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            //noinspection deprecation
            layoutType = WindowManager.LayoutParams.TYPE_PHONE;
        }

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        int savedX = prefs.getInt("overlay_x", dp(12));
        int savedY = prefs.getInt("overlay_y", dp(110));

        windowParams = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        );
        windowParams.gravity = Gravity.TOP | Gravity.START;
        windowParams.x = savedX;
        windowParams.y = savedY;

        rootContainer = new FrameLayout(this);

        buildCompactPillView();
        buildExpandedCardView();

        rootContainer.addView(compactPillView);
        rootContainer.addView(expandedCardView);

        updateOverlayUI();
        setExpandedMode(false);

        try {
            windowManager.addView(rootContainer, windowParams);
        } catch (Throwable e) {
            e.printStackTrace();
        }
    }

    private void buildCompactPillView() {
        compactPillView = new LinearLayout(this);
        compactPillView.setOrientation(LinearLayout.HORIZONTAL);
        compactPillView.setGravity(Gravity.CENTER_VERTICAL);
        compactPillView.setPadding(dp(12), dp(8), dp(14), dp(8));
        compactPillView.setBackground(
            createRoundedDrawable(
                Color.parseColor("#0B0D13"),
                Color.parseColor("#10B981"),
                2,
                28
            )
        );

        // Status Dot
        compactDotView = new View(this);
        LinearLayout.LayoutParams dotParams = new LinearLayout.LayoutParams(dp(10), dp(10));
        dotParams.setMarginEnd(dp(8));
        compactDotView.setLayoutParams(dotParams);
        compactDotView.setBackground(
            createRoundedDrawable(Color.parseColor("#10B981"), Color.TRANSPARENT, 0, 10)
        );

        // Text Column
        LinearLayout textCol = new LinearLayout(this);
        textCol.setOrientation(LinearLayout.VERTICAL);

        compactTitleText = new TextView(this);
        compactTitleText.setText("⚡ DRIVEWISE • NOTA 94");
        compactTitleText.setTextColor(Color.WHITE);
        compactTitleText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        compactTitleText.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);

        compactSubtitleText = new TextView(this);
        compactSubtitleText.setText("R$ 2,68/km líq • +R$ 24,15");
        compactSubtitleText.setTextColor(Color.parseColor("#34D399"));
        compactSubtitleText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        compactSubtitleText.setTypeface(Typeface.DEFAULT_BOLD);

        textCol.addView(compactTitleText);
        textCol.addView(compactSubtitleText);

        compactPillView.addView(compactDotView);
        compactPillView.addView(textCol);

        attachDragAndTapListener(compactPillView, true);
    }

    private void buildExpandedCardView() {
        DisplayMetrics dm = getResources().getDisplayMetrics();
        int cardWidthPx = Math.min(dp(330), dm.widthPixels - dp(24));

        expandedCardView = new LinearLayout(this);
        expandedCardView.setOrientation(LinearLayout.VERTICAL);
        expandedCardView.setPadding(dp(14), dp(12), dp(14), dp(12));
        FrameLayout.LayoutParams cardParams = new FrameLayout.LayoutParams(
            cardWidthPx,
            FrameLayout.LayoutParams.WRAP_CONTENT
        );
        expandedCardView.setLayoutParams(cardParams);
        expandedCardView.setBackground(
            createRoundedDrawable(
                Color.parseColor("#0B0D13"),
                Color.parseColor("#10B981"),
                2,
                22
            )
        );

        // 1. Header Bar (Draggable)
        LinearLayout headerRow = new LinearLayout(this);
        headerRow.setOrientation(LinearLayout.HORIZONTAL);
        headerRow.setGravity(Gravity.CENTER_VERTICAL);
        headerRow.setPadding(0, 0, 0, dp(8));

        cardPlatformBadge = new TextView(this);
        cardPlatformBadge.setText("⚡ DRIVEWISE • UBER");
        cardPlatformBadge.setTextColor(Color.WHITE);
        cardPlatformBadge.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        cardPlatformBadge.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        LinearLayout.LayoutParams platParams = new LinearLayout.LayoutParams(
            0,
            LinearLayout.LayoutParams.WRAP_CONTENT,
            1f
        );
        cardPlatformBadge.setLayoutParams(platParams);

        cardScoreBadge = new TextView(this);
        cardScoreBadge.setText("NOTA 94 • EXCELENTE");
        cardScoreBadge.setTextColor(Color.parseColor("#050608"));
        cardScoreBadge.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10);
        cardScoreBadge.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        cardScoreBadge.setPadding(dp(8), dp(3), dp(8), dp(3));
        cardScoreBadge.setBackground(
            createRoundedDrawable(Color.parseColor("#34D399"), Color.TRANSPARENT, 0, 8)
        );

        TextView minBtn = new TextView(this);
        minBtn.setText(" — ");
        minBtn.setTextColor(Color.parseColor("#94A3B8"));
        minBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        minBtn.setTypeface(Typeface.DEFAULT_BOLD);
        minBtn.setPadding(dp(8), dp(2), dp(8), dp(2));
        minBtn.setOnClickListener(v -> setExpandedMode(false));

        headerRow.addView(cardPlatformBadge);
        headerRow.addView(cardScoreBadge);
        headerRow.addView(minBtn);
        attachDragAndTapListener(headerRow, false);

        // 2. Main Financial Row
        LinearLayout mainFinRow = new LinearLayout(this);
        mainFinRow.setOrientation(LinearLayout.HORIZONTAL);
        mainFinRow.setGravity(Gravity.CENTER_VERTICAL);
        mainFinRow.setPadding(dp(10), dp(8), dp(10), dp(8));
        mainFinRow.setBackground(
            createRoundedDrawable(
                Color.parseColor("#121621"),
                Color.parseColor("#1E293B"),
                1,
                14
            )
        );

        cardGrossValueText = new TextView(this);
        cardGrossValueText.setText("Bruto: R$ 34,50");
        cardGrossValueText.setTextColor(Color.WHITE);
        cardGrossValueText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        cardGrossValueText.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        LinearLayout.LayoutParams grossParams = new LinearLayout.LayoutParams(
            0,
            LinearLayout.LayoutParams.WRAP_CONTENT,
            1f
        );
        cardGrossValueText.setLayoutParams(grossParams);

        cardNetProfitText = new TextView(this);
        cardNetProfitText.setText("+R$ 24,15 líq");
        cardNetProfitText.setTextColor(Color.parseColor("#34D399"));
        cardNetProfitText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        cardNetProfitText.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);

        mainFinRow.addView(cardGrossValueText);
        mainFinRow.addView(cardNetProfitText);

        // 3. Three-Column Metrics Row
        LinearLayout metricsGrid = new LinearLayout(this);
        metricsGrid.setOrientation(LinearLayout.HORIZONTAL);
        metricsGrid.setPadding(0, dp(8), 0, dp(8));

        cardNetPerKmText = createMetricBox(metricsGrid, "R$/KM LÍQ", "R$ 2,68");
        cardNetPerHourText = createMetricBox(metricsGrid, "GANHO/H", "R$ 69/h");
        cardTripInfoText = createMetricBox(metricsGrid, "TRAJETO", "9,0 km • 21m");

        // 4. Verdict Banner
        cardVerdictBanner = new TextView(this);
        cardVerdictBanner.setText("✓ VALE A PENA ACEITAR • Alta margem líquida");
        cardVerdictBanner.setTextColor(Color.parseColor("#A7F3D0"));
        cardVerdictBanner.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        cardVerdictBanner.setTypeface(Typeface.DEFAULT_BOLD);
        cardVerdictBanner.setPadding(dp(10), dp(7), dp(10), dp(7));
        cardVerdictBanner.setBackground(
            createRoundedDrawable(
                Color.parseColor("#064E3B"),
                Color.parseColor("#10B981"),
                1,
                10
            )
        );

        // 5. Interactive Action Buttons Row (Works outside the app!)
        LinearLayout actionsRow = new LinearLayout(this);
        actionsRow.setOrientation(LinearLayout.HORIZONTAL);
        actionsRow.setPadding(0, dp(10), 0, 0);

        TextView btnSimulate = createActionButton(
            "⚡ Testar Chamada",
            Color.parseColor("#1E293B"),
            Color.parseColor("#38BDF8")
        );
        btnSimulate.setOnClickListener(v -> triggerNextSimulatedRide());

        TextView btnOpenApp = createActionButton(
            "Abrir App",
            Color.parseColor("#10B981"),
            Color.parseColor("#050608")
        );
        btnOpenApp.setOnClickListener(v -> {
            setExpandedMode(false);
            Intent openIntent = new Intent(FloatingOverlayService.this, MainActivity.class);
            openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(openIntent);
        });

        TextView btnCollapse = createActionButton(
            " Bolha ",
            Color.parseColor("#1E293B"),
            Color.parseColor("#E2E8F0")
        );
        btnCollapse.setOnClickListener(v -> setExpandedMode(false));

        LinearLayout.LayoutParams btn1Params = new LinearLayout.LayoutParams(
            0,
            LinearLayout.LayoutParams.WRAP_CONTENT,
            1.2f
        );
        btn1Params.setMarginEnd(dp(6));
        btnSimulate.setLayoutParams(btn1Params);

        LinearLayout.LayoutParams btn2Params = new LinearLayout.LayoutParams(
            0,
            LinearLayout.LayoutParams.WRAP_CONTENT,
            1f
        );
        btn2Params.setMarginEnd(dp(6));
        btnOpenApp.setLayoutParams(btn2Params);

        LinearLayout.LayoutParams btn3Params = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        btnCollapse.setLayoutParams(btn3Params);

        actionsRow.addView(btnSimulate);
        actionsRow.addView(btnOpenApp);
        actionsRow.addView(btnCollapse);

        expandedCardView.addView(headerRow);
        expandedCardView.addView(mainFinRow);
        expandedCardView.addView(metricsGrid);
        expandedCardView.addView(cardVerdictBanner);
        expandedCardView.addView(actionsRow);
    }

    private TextView createMetricBox(LinearLayout parent, String label, String initialValue) {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setPadding(dp(6), dp(6), dp(6), dp(6));
        box.setBackground(
            createRoundedDrawable(
                Color.parseColor("#11141D"),
                Color.parseColor("#1E293B"),
                1,
                10
            )
        );
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            0,
            LinearLayout.LayoutParams.WRAP_CONTENT,
            1f
        );
        params.setMargins(dp(2), 0, dp(2), 0);
        box.setLayoutParams(params);

        TextView lbl = new TextView(this);
        lbl.setText(label);
        lbl.setTextColor(Color.parseColor("#94A3B8"));
        lbl.setTextSize(TypedValue.COMPLEX_UNIT_SP, 9);
        lbl.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);

        TextView val = new TextView(this);
        val.setText(initialValue);
        val.setTextColor(Color.WHITE);
        val.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        val.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);

        box.addView(lbl);
        box.addView(val);
        parent.addView(box);
        return val;
    }

    private TextView createActionButton(String title, int bgColor, int textColor) {
        TextView btn = new TextView(this);
        btn.setText(title);
        btn.setTextColor(textColor);
        btn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        btn.setTypeface(Typeface.DEFAULT_BOLD);
        btn.setGravity(Gravity.CENTER);
        btn.setPadding(dp(10), dp(9), dp(10), dp(9));
        btn.setBackground(createRoundedDrawable(bgColor, Color.TRANSPARENT, 0, 12));
        return btn;
    }

    private void attachDragAndTapListener(View handleView, final boolean toggleExpandOnTap) {
        handleView.setOnTouchListener(new View.OnTouchListener() {
            private int initialX;
            private int initialY;
            private float initialTouchX;
            private float initialTouchY;
            private boolean moved;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                if (windowParams == null || windowManager == null || rootContainer == null) {
                    return false;
                }
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = windowParams.x;
                        initialY = windowParams.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        moved = false;
                        return true;

                    case MotionEvent.ACTION_MOVE:
                        float dx = event.getRawX() - initialTouchX;
                        float dy = event.getRawY() - initialTouchY;
                        if (Math.hypot(dx, dy) > dp(6)) {
                            moved = true;
                        }
                        windowParams.x = Math.max(0, initialX + (int) dx);
                        windowParams.y = Math.max(dp(24), initialY + (int) dy);
                        try {
                            windowManager.updateViewLayout(rootContainer, windowParams);
                        } catch (Exception ignored) {}
                        return true;

                    case MotionEvent.ACTION_UP:
                        if (moved) {
                            try {
                                getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                                    .edit()
                                    .putInt("overlay_x", windowParams.x)
                                    .putInt("overlay_y", windowParams.y)
                                    .apply();
                            } catch (Exception ignored) {}
                        } else if (toggleExpandOnTap) {
                            setExpandedMode(!isExpanded);
                        }
                        return true;
                }
                return false;
            }
        });
    }

    private void setExpandedMode(boolean expanded) {
        this.isExpanded = expanded;
        if (compactPillView != null && expandedCardView != null) {
            compactPillView.setVisibility(expanded ? View.GONE : View.VISIBLE);
            expandedCardView.setVisibility(expanded ? View.VISIBLE : View.GONE);
            try {
                if (windowManager != null && rootContainer != null && windowParams != null) {
                    windowManager.updateViewLayout(rootContainer, windowParams);
                }
            } catch (Exception ignored) {}
        }
    }

    private void triggerNextSimulatedRide() {
        simulationStep = (simulationStep + 1) % 3;
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        double costPerKm = Double.longBitsToDouble(
            prefs.getLong("cost_per_km", Double.doubleToLongBits(0.75))
        );

        if (simulationStep == 0) {
            evaluateAndDisplayRide("UBER", 36.80, 9.2, 19, costPerKm, true);
        } else if (simulationStep == 1) {
            evaluateAndDisplayRide("99", 11.40, 8.6, 24, costPerKm, true);
        } else {
            evaluateAndDisplayRide("INDRIVE", 28.00, 10.5, 22, costPerKm, true);
        }
    }

    private void evaluateAndDisplayRide(
        String platform,
        double gross,
        double distanceKm,
        int durationMin,
        double costPerKm,
        boolean expandCard
    ) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        double minNetPerKm = Double.longBitsToDouble(
            prefs.getLong("min_net_per_km", Double.doubleToLongBits(1.80))
        );

        double safeDist = Math.max(0.5, distanceKm);
        int safeMin = Math.max(2, durationMin);
        double tripCost = safeDist * costPerKm;
        double netProfit = gross - tripCost;
        double netPerKm = netProfit / safeDist;
        double netPerHour = (netProfit / safeMin) * 60.0;

        int score;
        String tier;
        if (netPerKm >= minNetPerKm * 1.15) {
            score = Math.min(99, (int) Math.round(82 + (netPerKm - minNetPerKm) * 12));
            tier = "EXCELENTE";
        } else if (netPerKm >= minNetPerKm * 0.85) {
            score = Math.min(79, Math.max(60, (int) Math.round(68 + (netPerKm - minNetPerKm) * 15)));
            tier = "BOA";
        } else {
            score = Math.max(15, Math.min(55, (int) Math.round((netPerKm / Math.max(0.5, minNetPerKm)) * 55)));
            tier = "RUIM";
        }

        this.currentPlatform = platform != null ? platform.toUpperCase(Locale.ROOT) : "UBER";
        this.currentGross = gross;
        this.currentDistanceKm = safeDist;
        this.currentDurationMin = safeMin;
        this.currentNetProfit = netProfit;
        this.currentNetPerKm = netPerKm;
        this.currentNetPerHour = netPerHour;
        this.currentScore = score;
        this.currentTier = tier;

        saveCurrentRideToPrefs();
        updateOverlayUI();
        if (expandCard) {
            setExpandedMode(true);
        }
    }

    private void updateOverlayUI() {
        if (compactPillView == null || expandedCardView == null) return;

        int accentColor;
        int badgeBgColor;
        int bannerBgColor;
        String verdictText;

        if ("EXCELENTE".equalsIgnoreCase(currentTier)) {
            accentColor = Color.parseColor("#10B981"); // Emerald
            badgeBgColor = Color.parseColor("#34D399");
            bannerBgColor = Color.parseColor("#064E3B");
            verdictText = String.format(
                Locale.forLanguageTag("pt-BR"),
                "✓ ACEITAR %s • +R$ %.2f líquido (R$ %.2f/km)",
                currentPlatform,
                currentNetProfit,
                currentNetPerKm
            );
        } else if ("BOA".equalsIgnoreCase(currentTier) || "REGULAR".equalsIgnoreCase(currentTier)) {
            accentColor = Color.parseColor("#F59E0B"); // Amber
            badgeBgColor = Color.parseColor("#FBBF24");
            bannerBgColor = Color.parseColor("#451A03");
            verdictText = String.format(
                Locale.forLanguageTag("pt-BR"),
                "⚠ ATENÇÃO %s • Margem moderada (R$ %.2f/km)",
                currentPlatform,
                currentNetPerKm
            );
        } else {
            accentColor = Color.parseColor("#F43F5E"); // Rose
            badgeBgColor = Color.parseColor("#FB7185");
            bannerBgColor = Color.parseColor("#4C0519");
            verdictText = String.format(
                Locale.forLanguageTag("pt-BR"),
                "✕ RECUSAR %s • Baixo retorno (R$ %.2f/km)",
                currentPlatform,
                currentNetPerKm
            );
        }

        // Update Compact Pill
        compactPillView.setBackground(
            createRoundedDrawable(Color.parseColor("#0B0D13"), accentColor, 2, 28)
        );
        compactDotView.setBackground(
            createRoundedDrawable(accentColor, Color.TRANSPARENT, 0, 10)
        );
        compactTitleText.setText(
            String.format(
                Locale.forLanguageTag("pt-BR"),
                "⚡ %s • NOTA %d (%s)",
                currentPlatform,
                currentScore,
                currentTier
            )
        );
        compactSubtitleText.setText(
            String.format(
                Locale.forLanguageTag("pt-BR"),
                "R$ %.2f/km líq • +R$ %.2f",
                currentNetPerKm,
                currentNetProfit
            )
        );
        compactSubtitleText.setTextColor(badgeBgColor);

        // Update Expanded Card
        expandedCardView.setBackground(
            createRoundedDrawable(Color.parseColor("#0B0D13"), accentColor, 2, 22)
        );
        cardPlatformBadge.setText("⚡ DRIVEWISE HUD • " + currentPlatform);
        cardScoreBadge.setText("NOTA " + currentScore + " • " + currentTier);
        cardScoreBadge.setBackground(
            createRoundedDrawable(badgeBgColor, Color.TRANSPARENT, 0, 8)
        );

        cardGrossValueText.setText(
            String.format(Locale.forLanguageTag("pt-BR"), "Bruto: R$ %.2f", currentGross)
        );
        cardNetProfitText.setText(
            String.format(Locale.forLanguageTag("pt-BR"), "+R$ %.2f líq", currentNetProfit)
        );
        cardNetProfitText.setTextColor(badgeBgColor);

        cardNetPerKmText.setText(
            String.format(Locale.forLanguageTag("pt-BR"), "R$ %.2f/km", currentNetPerKm)
        );
        cardNetPerKmText.setTextColor(badgeBgColor);

        cardNetPerHourText.setText(
            String.format(Locale.forLanguageTag("pt-BR"), "R$ %.0f/h", currentNetPerHour)
        );
        cardTripInfoText.setText(
            String.format(
                Locale.forLanguageTag("pt-BR"),
                "%.1f km • %dm",
                currentDistanceKm,
                currentDurationMin
            )
        );

        cardVerdictBanner.setText(verdictText);
        cardVerdictBanner.setBackground(
            createRoundedDrawable(bannerBgColor, accentColor, 1, 10)
        );

        try {
            if (windowManager != null && rootContainer != null && windowParams != null) {
                windowManager.updateViewLayout(rootContainer, windowParams);
            }
        } catch (Exception ignored) {}
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (!canDrawOverlays()) {
            stopSelf();
            return START_NOT_STICKY;
        }

        if (rootContainer == null) {
            createOverlayWindow();
            isOverlayRunning = true;
        }

        if (intent != null && intent.getAction() != null) {
            String action = intent.getAction();
            if (ACTION_STOP_OVERLAY.equals(action)) {
                stopSelf();
                return START_NOT_STICKY;
            } else if (ACTION_UPDATE_RIDE.equals(action)) {
                String platform = intent.getStringExtra("EXTRA_PLATFORM");
                if (platform == null) {
                    String pkg = intent.getStringExtra("EXTRA_PACKAGE");
                    if (pkg != null && pkg.toLowerCase(Locale.ROOT).contains("99")) {
                        platform = "99";
                    } else if (pkg != null && pkg.toLowerCase(Locale.ROOT).contains("indrive")) {
                        platform = "INDRIVE";
                    } else {
                        platform = "UBER";
                    }
                }

                double gross = intent.getDoubleExtra("EXTRA_VALUE", currentGross);
                double distance = intent.getDoubleExtra("EXTRA_DISTANCE", currentDistanceKm);
                int duration = intent.getIntExtra(
                    "EXTRA_DURATION",
                    Math.max(5, (int) Math.round(distance * 2.2))
                );
                boolean expand = intent.getBooleanExtra("EXTRA_EXPAND", true);

                if (intent.hasExtra("EXTRA_NET_PROFIT") && intent.hasExtra("EXTRA_SCORE")) {
                    // Pre-evaluated ride sent from React WebView
                    this.currentPlatform = platform.toUpperCase(Locale.ROOT);
                    this.currentGross = gross;
                    this.currentDistanceKm = Math.max(0.5, distance);
                    this.currentDurationMin = Math.max(2, duration);
                    this.currentNetProfit = intent.getDoubleExtra("EXTRA_NET_PROFIT", 0.0);
                    this.currentNetPerKm = intent.getDoubleExtra("EXTRA_NET_PER_KM", 0.0);
                    this.currentNetPerHour = intent.getDoubleExtra("EXTRA_NET_PER_HOUR", 0.0);
                    this.currentScore = intent.getIntExtra("EXTRA_SCORE", 80);
                    String tier = intent.getStringExtra("EXTRA_TIER");
                    this.currentTier = tier != null ? tier.toUpperCase(Locale.ROOT) : "EXCELENTE";

                    saveCurrentRideToPrefs();
                    updateOverlayUI();
                    if (expand) {
                        setExpandedMode(true);
                    }
                } else if (gross > 0 && distance > 0) {
                    SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                    double costPerKm = Double.longBitsToDouble(
                        prefs.getLong("cost_per_km", Double.doubleToLongBits(0.75))
                    );
                    evaluateAndDisplayRide(platform, gross, distance, duration, costPerKm, expand);
                }
            } else if (ACTION_UPDATE_CONFIG.equals(action)) {
                double costPerKm = intent.getDoubleExtra("EXTRA_COST_PER_KM", 0.75);
                double minNetPerKm = intent.getDoubleExtra("EXTRA_MIN_NET_PER_KM", 1.80);
                SharedPreferences.Editor editor = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit();
                editor.putLong("cost_per_km", Double.doubleToRawLongBits(costPerKm));
                editor.putLong("min_net_per_km", Double.doubleToRawLongBits(minNetPerKm));
                editor.apply();
            }
        }

        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        isOverlayRunning = false;
        if (rootContainer != null && windowManager != null) {
            try {
                windowManager.removeView(rootContainer);
            } catch (Exception ignored) {}
            rootContainer = null;
        }
    }
}
