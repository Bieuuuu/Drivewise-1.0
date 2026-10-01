package com.drivewise.copiloto;

import android.annotation.SuppressLint;
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
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Real System Floating Overlay Service (TYPE_APPLICATION_OVERLAY via WindowManager).
 *
 * Floats independently on top of Uber, 99, InDrive, Waze, and the Android Home Screen:
 * - Minimized State: Compact, draggable Floating Pill/Bubble ("⚡ DriveWise"). Tapping it
 *   expands the interactive HUD card IN-PLACE over Uber/99 without opening the main app.
 * - Expanded State: Real-time Ride Profitability Calculator & Traffic-Light HUD (Verde / Amarelo / Vermelho)
 *   with inline touch keypad, platform switcher, and real Ride Lifecycle actions (Aceitar, Concluir, Recusar)
 *   that sync directly with the driver's shift and financial history in DriveWise.
 * - Zero fake or random simulations.
 */
public class FloatingOverlayService extends Service {

    public static final String CHANNEL_ID = "drivewise_floating_overlay_channel";
    public static final int NOTIFICATION_ID = 4102;
    public static final String PREFS_NAME = "DriveWiseHudPrefs";

    public static final String ACTION_START = "com.drivewise.copiloto.ACTION_START_OVERLAY";
    public static final String ACTION_STOP = "com.drivewise.copiloto.ACTION_STOP_OVERLAY";
    public static final String ACTION_EXPAND = "com.drivewise.copiloto.ACTION_EXPAND_OVERLAY";
    public static final String ACTION_UPDATE_DATA = "com.drivewise.copiloto.ACTION_UPDATE_OVERLAY_DATA";
    public static final String ACTION_UPDATE_CONFIG = "com.drivewise.copiloto.ACTION_UPDATE_OVERLAY_CONFIG";
    public static final String ACTION_OVERLAY_RIDE_EVENT = "com.drivewise.copiloto.ACTION_OVERLAY_RIDE_EVENT";

    /** Last real reading pushed by the OCR ScreenCaptureService (zero-toque). */
    public static volatile String lastAutoReadingJson = "";
    public static volatile long lastAutoReadingAt = 0L;

    // Ride lifecycle state machine: a stable OCR reading ("received") is remembered so the
    // later accepted/completed/rejected event carries the SAME numbers + auto-read source.
    private static double pendingOfferGross = 0.0;
    private static double pendingOfferKm = 0.0;
    private static int pendingOfferMin = 0;
    private static String pendingOfferPlatform = "Uber";
    private static boolean pendingOfferFromAuto = false;
    private static long pendingOfferAt = 0L;

    public static volatile boolean isRunning = false;

    private WindowManager windowManager;
    private WindowManager.LayoutParams windowParams;
    private FrameLayout rootContainer;

    // 1. Minimized Floating Pill Views
    private LinearLayout collapsedPillView;
    private View pillStatusDot;
    private TextView pillMainText;
    private TextView pillSubText;

    // 2. Expanded Interactive HUD Card Views
    private LinearLayout expandedCardView;
    private TextView platformUberBtn;
    private TextView platform99Btn;
    private TextView platformIndriveBtn;

    // Active Input Field selector (0 = Gross R$, 1 = Distance KM, 2 = Duration MIN)
    private int activeInputField = 0;
    private String rawInputBuffer = "";

    private LinearLayout grossInputBox;
    private TextView grossValueLabel;
    private LinearLayout distInputBox;
    private TextView distValueLabel;
    private LinearLayout timeInputBox;
    private TextView timeValueLabel;

    // Live Traffic Light Verdict & Profit Breakdown Views
    private LinearLayout verdictContainer;
    private TextView verdictTitleText;
    private TextView verdictNetProfitText;
    private TextView verdictMetricsText;

    // In-Route Banner vs Calculator Keypad Container
    private LinearLayout keypadSection;
    private LinearLayout preAcceptButtonsRow;
    private LinearLayout inRouteSection;
    private TextView inRouteSummaryText;

    // Driver calibrated parameters (synced from DriveWise app)
    private double driverCostPerKm = 0.75;
    private double driverMinNetPerKm = 1.80;

    // Current real ride evaluation state (starts at 0 = clean standby, NO random simulation!)
    private String selectedPlatform = "Uber";
    private double currentGross = 0.0;
    private double currentDistanceKm = 5.0;
    private int currentDurationMin = 12;
    private boolean isRideInRoute = false;

    // Zero-toque: true when the current numbers came from the OCR screen reader instead
    // of the manual keypad. Shown as a badge in the HUD so the driver trusts the data.
    private boolean isAutoReadFilled = false;
    private String autoReadBadgeText = "";

    // Computed real-time metrics
    private double computedCost = 0.0;
    private double computedNetProfit = 0.0;
    private double computedNetPerKm = 0.0;
    private double computedGrossPerKm = 0.0;
    private double computedNetPerHour = 0.0;
    private int computedScore = 0;
    private String computedTier = "AGUARDANDO";

    private boolean isExpanded = false;

    public static void appendPendingRideEvent(
        Context ctx,
        String actionType,
        String platform,
        double grossValue,
        double distanceKm,
        int durationMin
    ) {
        appendPendingRideEvent(ctx, actionType, platform, grossValue, distanceKm, durationMin, false);
    }

    public static void appendPendingRideEvent(
        Context ctx,
        String actionType,
        String platform,
        double grossValue,
        double distanceKm,
        int durationMin,
        boolean fromAutoRead
    ) {
        try {
            SharedPreferences prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String existingJson = prefs.getString("pending_ride_events", "[]");
            JSONArray arr = new JSONArray(existingJson);

            JSONObject ev = new JSONObject();
            ev.put("id", "ov-" + System.currentTimeMillis());
            ev.put("action", actionType); // "received" | "accepted" | "completed" | "rejected"
            ev.put("platform", platform);
            ev.put("grossValue", grossValue);
            ev.put("totalDistanceKm", distanceKm);
            ev.put("durationMinutes", durationMin);
            ev.put("source", fromAutoRead ? "ocr-auto-read" : "manual-overlay");
            ev.put("timestamp", System.currentTimeMillis());

            // Ride lifecycle state machine: remember the pending offer so a later
            // accepted/completed/rejected event reuses the SAME numbers and provenance.
            if ("received".equals(actionType)) {
                pendingOfferGross = grossValue;
                pendingOfferKm = distanceKm;
                pendingOfferMin = durationMin;
                pendingOfferPlatform = platform;
                pendingOfferFromAuto = fromAutoRead;
                pendingOfferAt = System.currentTimeMillis();
            } else if ("accepted".equals(actionType)) {
                // Keep the pending offer alive (it is the ride in route).
            } else if ("completed".equals(actionType) || "rejected".equals(actionType)) {
                boolean sameRide =
                    Math.abs(pendingOfferGross - grossValue) < 0.01 &&
                    (System.currentTimeMillis() - pendingOfferAt) < 3_600_000L;
                if (sameRide && pendingOfferFromAuto) {
                    ev.put("source", "ocr-auto-read");
                    fromAutoRead = true;
                }
                if ("completed".equals(actionType) || "rejected".equals(actionType)) {
                    pendingOfferGross = 0.0;
                    pendingOfferAt = 0L;
                }
            }

            arr.put(ev);
            prefs.edit().putString("pending_ride_events", arr.toString()).apply();

            Intent broadcast = new Intent(ACTION_OVERLAY_RIDE_EVENT);
            broadcast.setPackage(ctx.getPackageName());
            broadcast.putExtra("event_json", ev.toString());
            ctx.sendBroadcast(broadcast);
        } catch (Exception ignored) {}
    }

    @Override
    public void onCreate() {
        super.onCreate();
        loadConfigFromPrefs();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            isRunning = false;
            stopSelf();
            return START_NOT_STICKY;
        }

        startForegroundSafely();
        loadConfigFromPrefs();

        if (rootContainer == null) {
            initFloatingOverlayWindow();
        }

        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_EXPAND.equals(action)) {
                setExpandedState(true);
            } else if (ACTION_UPDATE_CONFIG.equals(action)) {
                loadConfigFromPrefs();
                recalculateMetrics();
                refreshOverlayUI();
            } else if (ACTION_UPDATE_DATA.equals(action)) {
                String plat = intent.getStringExtra("platform");
                double gross = intent.getDoubleExtra("grossValue", 0.0);
                double dist = intent.getDoubleExtra("distanceKm", 5.0);
                int dur = intent.getIntExtra("durationMin", 12);
                boolean expand = intent.getBooleanExtra("expand", false);

                if (plat != null && !plat.isEmpty()) {
                    if (plat.equalsIgnoreCase("99")) selectedPlatform = "99";
                    else if (plat.equalsIgnoreCase("INDRIVE")) selectedPlatform = "InDrive";
                    else selectedPlatform = "Uber";
                }
                if (gross > 0) {
                    currentGross = gross;
                    currentDistanceKm = Math.max(0.5, dist);
                    currentDurationMin = Math.max(1, dur);
                    rawInputBuffer = "";
                    isAutoReadFilled = true;
                    autoReadBadgeText = "📷 Lido da tela automaticamente";
                    lastAutoReadingJson = String.format(
                        Locale.ROOT,
                        "{\"grossValue\":%.2f,\"totalKm\":%.2f,\"durationMin\":%d,\"platform\":\"%s\"}",
                        gross, dist, dur, selectedPlatform
                    );
                    lastAutoReadingAt = System.currentTimeMillis();
                    recalculateMetrics();
                    if (expand) {
                        setExpandedState(true);
                    } else {
                        refreshOverlayUI();
                    }
                }
            }
        }

        isRunning = true;
        return START_STICKY;
    }

    private void startForegroundSafely() {
        Notification notification = buildForegroundNotification();
        try {
            if (Build.VERSION.SDK_INT >= 34) {
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
                );
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            try {
                startForeground(NOTIFICATION_ID, notification);
            } catch (Exception ignored) {}
        }
    }

    private void loadConfigFromPrefs() {
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            driverCostPerKm = Double.longBitsToDouble(
                prefs.getLong("cost_per_km", Double.doubleToLongBits(0.75))
            );
            driverMinNetPerKm = Double.longBitsToDouble(
                prefs.getLong("min_net_per_km", Double.doubleToLongBits(1.80))
            );
            if (driverCostPerKm <= 0 || Double.isNaN(driverCostPerKm)) driverCostPerKm = 0.75;
            if (driverMinNetPerKm <= 0 || Double.isNaN(driverMinNetPerKm)) driverMinNetPerKm = 1.80;
        } catch (Exception ignored) {}
    }

    private int dp(int value) {
        return (int) TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            value,
            getResources().getDisplayMetrics()
        );
    }

    private GradientDrawable roundedBox(int bgColor, int borderColor, int borderDp, int radiusDp) {
        GradientDrawable gd = new GradientDrawable();
        gd.setColor(bgColor);
        gd.setCornerRadius(dp(radiusDp));
        if (borderDp > 0) {
            gd.setStroke(dp(borderDp), borderColor);
        }
        return gd;
    }

    @SuppressLint("ClickableViewAccessibility")
    private void initFloatingOverlayWindow() {
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        if (windowManager == null) return;

        int layoutType = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;

        windowParams = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        );

        windowParams.gravity = Gravity.TOP | Gravity.START;
        DisplayMetrics dm = getResources().getDisplayMetrics();
        windowParams.x = Math.max(dp(12), dm.widthPixels - dp(160));
        windowParams.y = dp(140);

        rootContainer = new FrameLayout(this);

        buildCollapsedPillView();
        buildExpandedCardView();

        rootContainer.addView(collapsedPillView);
        rootContainer.addView(expandedCardView);

        setExpandedState(false);
        recalculateMetrics();
        refreshOverlayUI();

        try {
            windowManager.addView(rootContainer, windowParams);
        } catch (Exception ignored) {}
    }

    @SuppressLint("ClickableViewAccessibility")
    private void buildCollapsedPillView() {
        collapsedPillView = new LinearLayout(this);
        collapsedPillView.setOrientation(LinearLayout.HORIZONTAL);
        collapsedPillView.setGravity(Gravity.CENTER_VERTICAL);
        collapsedPillView.setPadding(dp(12), dp(8), dp(14), dp(8));
        collapsedPillView.setBackground(
            roundedBox(Color.parseColor("#090C12"), Color.parseColor("#10B981"), 2, 28)
        );

        // Status indicator dot
        pillStatusDot = new View(this);
        LinearLayout.LayoutParams dotLp = new LinearLayout.LayoutParams(dp(10), dp(10));
        dotLp.rightMargin = dp(8);
        pillStatusDot.setLayoutParams(dotLp);
        pillStatusDot.setBackground(roundedBox(Color.parseColor("#10B981"), Color.TRANSPARENT, 0, 10));
        collapsedPillView.addView(pillStatusDot);

        // Text column
        LinearLayout textCol = new LinearLayout(this);
        textCol.setOrientation(LinearLayout.VERTICAL);

        pillMainText = new TextView(this);
        pillMainText.setText("⚡ DriveWise");
        pillMainText.setTextColor(Color.WHITE);
        pillMainText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        pillMainText.setTypeface(Typeface.DEFAULT_BOLD);
        textCol.addView(pillMainText);

        pillSubText = new TextView(this);
        pillSubText.setText("Toque p/ calcular");
        pillSubText.setTextColor(Color.parseColor("#34D399"));
        pillSubText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10);
        pillSubText.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        textCol.addView(pillSubText);

        collapsedPillView.addView(textCol);

        // Drag & Tap listener on the floating pill (expands IN-PLACE over Uber/99, NEVER opens MainActivity!)
        collapsedPillView.setOnTouchListener(new View.OnTouchListener() {
            private int initialX;
            private int initialY;
            private float initialTouchX;
            private float initialTouchY;
            private boolean moved;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                if (windowParams == null || windowManager == null) return false;
                switch (event.getActionMasked()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = windowParams.x;
                        initialY = windowParams.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        moved = false;
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        int dx = (int) (event.getRawX() - initialTouchX);
                        int dy = (int) (event.getRawY() - initialTouchY);
                        if (Math.hypot(dx, dy) > dp(6)) {
                            moved = true;
                        }
                        DisplayMetrics dm = getResources().getDisplayMetrics();
                        windowParams.x = Math.max(0, Math.min(dm.widthPixels - dp(80), initialX + dx));
                        windowParams.y = Math.max(dp(24), Math.min(dm.heightPixels - dp(80), initialY + dy));
                        try {
                            windowManager.updateViewLayout(rootContainer, windowParams);
                        } catch (Exception ignored) {}
                        return true;
                    case MotionEvent.ACTION_UP:
                        if (!moved) {
                            setExpandedState(true);
                        }
                        return true;
                }
                return false;
            }
        });
    }

    @SuppressLint("ClickableViewAccessibility")
    private void buildExpandedCardView() {
        DisplayMetrics dm = getResources().getDisplayMetrics();
        int cardWidthPx = Math.min(dp(336), dm.widthPixels - dp(20));

        expandedCardView = new LinearLayout(this);
        expandedCardView.setOrientation(LinearLayout.VERTICAL);
        expandedCardView.setPadding(dp(12), dp(10), dp(12), dp(12));
        expandedCardView.setBackground(
            roundedBox(Color.parseColor("#0B0E15"), Color.parseColor("#1E293B"), 2, 20)
        );
        expandedCardView.setLayoutParams(
            new FrameLayout.LayoutParams(cardWidthPx, ViewGroup.LayoutParams.WRAP_CONTENT)
        );

        // 1. TOP HEADER BAR (Drag Handle + Title + Minimize / Open App / Close)
        LinearLayout headerRow = new LinearLayout(this);
        headerRow.setOrientation(LinearLayout.HORIZONTAL);
        headerRow.setGravity(Gravity.CENTER_VERTICAL);
        headerRow.setPadding(0, 0, 0, dp(8));

        TextView headerTitle = new TextView(this);
        headerTitle.setText("⚡ COPILOTO DRIVEWISE");
        headerTitle.setTextColor(Color.WHITE);
        headerTitle.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        headerTitle.setTypeface(Typeface.DEFAULT_BOLD);
        LinearLayout.LayoutParams titleLp = new LinearLayout.LayoutParams(
            0,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            1f
        );
        headerRow.addView(headerTitle, titleLp);

        // Dragging on header moves the expanded card
        headerTitle.setOnTouchListener(new View.OnTouchListener() {
            private int initialX;
            private int initialY;
            private float initialTouchX;
            private float initialTouchY;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                if (windowParams == null || windowManager == null) return false;
                switch (event.getActionMasked()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = windowParams.x;
                        initialY = windowParams.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        int dx = (int) (event.getRawX() - initialTouchX);
                        int dy = (int) (event.getRawY() - initialTouchY);
                        windowParams.x = Math.max(0, initialX + dx);
                        windowParams.y = Math.max(dp(20), initialY + dy);
                        try {
                            windowManager.updateViewLayout(rootContainer, windowParams);
                        } catch (Exception ignored) {}
                        return true;
                }
                return false;
            }
        });

        // Open Main App button (discrete)
        TextView openAppBtn = new TextView(this);
        openAppBtn.setText("Painel ↗");
        openAppBtn.setTextColor(Color.parseColor("#94A3B8"));
        openAppBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10);
        openAppBtn.setTypeface(Typeface.DEFAULT_BOLD);
        openAppBtn.setPadding(dp(8), dp(4), dp(8), dp(4));
        openAppBtn.setBackground(roundedBox(Color.parseColor("#161B26"), Color.parseColor("#334155"), 1, 8));
        openAppBtn.setOnClickListener(v -> {
            setExpandedState(false);
            Intent openIntent = new Intent(FloatingOverlayService.this, MainActivity.class);
            openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(openIntent);
        });
        headerRow.addView(openAppBtn);

        // Minimize to Floating Pill button
        TextView minimizeBtn = new TextView(this);
        minimizeBtn.setText(" — ");
        minimizeBtn.setTextColor(Color.WHITE);
        minimizeBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        minimizeBtn.setTypeface(Typeface.DEFAULT_BOLD);
        minimizeBtn.setPadding(dp(10), dp(4), dp(10), dp(4));
        minimizeBtn.setBackground(roundedBox(Color.parseColor("#1E293B"), Color.parseColor("#475569"), 1, 8));
        LinearLayout.LayoutParams minLp = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        minLp.leftMargin = dp(6);
        minimizeBtn.setOnClickListener(v -> setExpandedState(false));
        headerRow.addView(minimizeBtn, minLp);

        expandedCardView.addView(headerRow);

        // 2. PLATFORM SELECTOR ROW (UBER | 99 | INDRIVE)
        LinearLayout platRow = new LinearLayout(this);
        platRow.setOrientation(LinearLayout.HORIZONTAL);
        platRow.setPadding(0, 0, 0, dp(8));

        platformUberBtn = createPlatformTab("Uber");
        platform99Btn = createPlatformTab("99");
        platformIndriveBtn = createPlatformTab("InDrive");

        LinearLayout.LayoutParams tabLp1 = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        tabLp1.rightMargin = dp(4);
        LinearLayout.LayoutParams tabLp2 = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        tabLp2.rightMargin = dp(4);
        LinearLayout.LayoutParams tabLp3 = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);

        platRow.addView(platformUberBtn, tabLp1);
        platRow.addView(platform99Btn, tabLp2);
        platRow.addView(platformIndriveBtn, tabLp3);
        expandedCardView.addView(platRow);

        // 3. THREE SELECTABLE METRIC INPUT BOXES (VALOR R$ | DISTÂNCIA KM | TEMPO MIN)
        LinearLayout metricsInputRow = new LinearLayout(this);
        metricsInputRow.setOrientation(LinearLayout.HORIZONTAL);
        metricsInputRow.setPadding(0, 0, 0, dp(8));

        grossValueLabel = new TextView(this);
        grossInputBox = createMetricInputBox("VALOR (R$)", grossValueLabel, 0);

        distValueLabel = new TextView(this);
        distInputBox = createMetricInputBox("TOTAL (KM)", distValueLabel, 1);

        timeValueLabel = new TextView(this);
        timeInputBox = createMetricInputBox("TEMPO (MIN)", timeValueLabel, 2);

        LinearLayout.LayoutParams mLp1 = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        mLp1.rightMargin = dp(5);
        LinearLayout.LayoutParams mLp2 = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        mLp2.rightMargin = dp(5);
        LinearLayout.LayoutParams mLp3 = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);

        metricsInputRow.addView(grossInputBox, mLp1);
        metricsInputRow.addView(distInputBox, mLp2);
        metricsInputRow.addView(timeInputBox, mLp3);
        expandedCardView.addView(metricsInputRow);

        // 4. LIVE TRAFFIC-LIGHT VERDICT BANNER (Semáforo de Rentabilidade Real)
        verdictContainer = new LinearLayout(this);
        verdictContainer.setOrientation(LinearLayout.VERTICAL);
        verdictContainer.setPadding(dp(10), dp(8), dp(10), dp(8));

        verdictTitleText = new TextView(this);
        verdictTitleText.setTextColor(Color.WHITE);
        verdictTitleText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        verdictTitleText.setTypeface(Typeface.DEFAULT_BOLD);
        verdictContainer.addView(verdictTitleText);

        verdictNetProfitText = new TextView(this);
        verdictNetProfitText.setTextColor(Color.parseColor("#34D399"));
        verdictNetProfitText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18);
        verdictNetProfitText.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        verdictNetProfitText.setPadding(0, dp(2), 0, dp(2));
        verdictContainer.addView(verdictNetProfitText);

        verdictMetricsText = new TextView(this);
        verdictMetricsText.setTextColor(Color.parseColor("#E2E8F0"));
        verdictMetricsText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        verdictMetricsText.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        verdictContainer.addView(verdictMetricsText);

        LinearLayout.LayoutParams vLp = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        vLp.bottomMargin = dp(8);
        expandedCardView.addView(verdictContainer, vLp);

        // 5. FAST COMPACT TOUCH KEYPAD (for typing ride offer values in 1 second over Uber/99)
        keypadSection = new LinearLayout(this);
        keypadSection.setOrientation(LinearLayout.VERTICAL);

        String[][] rows = new String[][] {
            { "1", "2", "3", "⌫" },
            { "4", "5", "6", "C" },
            { "7", "8", "9", "," },
            { "-1", "+1", "0", "+5" }
        };

        for (String[] rowKeys : rows) {
            LinearLayout keyRow = new LinearLayout(this);
            keyRow.setOrientation(LinearLayout.HORIZONTAL);
            LinearLayout.LayoutParams rowLp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            );
            rowLp.bottomMargin = dp(4);

            for (int i = 0; i < rowKeys.length; i++) {
                final String key = rowKeys[i];
                TextView keyBtn = new TextView(this);
                keyBtn.setText(key);
                keyBtn.setGravity(Gravity.CENTER);
                keyBtn.setTextColor(Color.WHITE);
                keyBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
                keyBtn.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
                keyBtn.setPadding(0, dp(7), 0, dp(7));

                boolean isSpecial = "⌫".equals(key) || "C".equals(key) || "-1".equals(key) || "+1".equals(key) || "+5".equals(key);
                keyBtn.setBackground(
                    roundedBox(
                        isSpecial ? Color.parseColor("#1E293B") : Color.parseColor("#141923"),
                        Color.parseColor("#334155"),
                        1,
                        8
                    )
                );
                keyBtn.setOnClickListener(v -> handleKeypadPress(key));

                LinearLayout.LayoutParams kLp = new LinearLayout.LayoutParams(
                    0,
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    1f
                );
                if (i < rowKeys.length - 1) kLp.rightMargin = dp(4);
                keyRow.addView(keyBtn, kLp);
            }
            keypadSection.addView(keyRow, rowLp);
        }
        expandedCardView.addView(keypadSection);

        // 6. PRE-ACCEPTANCE DECISION BUTTONS (✕ RECUSAR | ✓ ACEITAR | ✓ SOMAR AO DIA)
        preAcceptButtonsRow = new LinearLayout(this);
        preAcceptButtonsRow.setOrientation(LinearLayout.HORIZONTAL);
        preAcceptButtonsRow.setPadding(0, dp(4), 0, 0);

        TextView rejectBtn = new TextView(this);
        rejectBtn.setText("✕ Recusar");
        rejectBtn.setGravity(Gravity.CENTER);
        rejectBtn.setTextColor(Color.parseColor("#FDA4AF"));
        rejectBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        rejectBtn.setTypeface(Typeface.DEFAULT_BOLD);
        rejectBtn.setPadding(dp(6), dp(10), dp(6), dp(10));
        rejectBtn.setBackground(roundedBox(Color.parseColor("#4C0519"), Color.parseColor("#F43F5E"), 1, 10));
        rejectBtn.setOnClickListener(v -> {
            if (currentGross > 0) {
                appendPendingRideEvent(
                    FloatingOverlayService.this,
                    "rejected",
                    selectedPlatform,
                    currentGross,
                    currentDistanceKm,
                    currentDurationMin
                );
            }
            resetRideCalculator();
            setExpandedState(false);
        });

        TextView acceptInRouteBtn = new TextView(this);
        acceptInRouteBtn.setText("✓ Em Rota");
        acceptInRouteBtn.setGravity(Gravity.CENTER);
        acceptInRouteBtn.setTextColor(Color.parseColor("#080A0F"));
        acceptInRouteBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        acceptInRouteBtn.setTypeface(Typeface.DEFAULT_BOLD);
        acceptInRouteBtn.setPadding(dp(6), dp(10), dp(6), dp(10));
        acceptInRouteBtn.setBackground(roundedBox(Color.parseColor("#38BDF8"), Color.TRANSPARENT, 0, 10));
        acceptInRouteBtn.setOnClickListener(v -> {
            if (currentGross <= 0) return;
            isRideInRoute = true;
            appendPendingRideEvent(
                FloatingOverlayService.this,
                "accepted",
                selectedPlatform,
                currentGross,
                currentDistanceKm,
                currentDurationMin
            );
            refreshOverlayUI();
            setExpandedState(false);
        });

        TextView completeDirectBtn = new TextView(this);
        completeDirectBtn.setText("✓ Concluir (+Dia)");
        completeDirectBtn.setGravity(Gravity.CENTER);
        completeDirectBtn.setTextColor(Color.parseColor("#052E16"));
        completeDirectBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        completeDirectBtn.setTypeface(Typeface.DEFAULT_BOLD);
        completeDirectBtn.setPadding(dp(6), dp(10), dp(6), dp(10));
        completeDirectBtn.setBackground(roundedBox(Color.parseColor("#34D399"), Color.TRANSPARENT, 0, 10));
        completeDirectBtn.setOnClickListener(v -> {
            if (currentGross <= 0) return;
            appendPendingRideEvent(
                FloatingOverlayService.this,
                "completed",
                selectedPlatform,
                currentGross,
                currentDistanceKm,
                currentDurationMin
            );
            resetRideCalculator();
            setExpandedState(false);
        });

        LinearLayout.LayoutParams bLp1 = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 0.9f);
        bLp1.rightMargin = dp(5);
        LinearLayout.LayoutParams bLp2 = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        bLp2.rightMargin = dp(5);
        LinearLayout.LayoutParams bLp3 = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.3f);

        preAcceptButtonsRow.addView(rejectBtn, bLp1);
        preAcceptButtonsRow.addView(acceptInRouteBtn, bLp2);
        preAcceptButtonsRow.addView(completeDirectBtn, bLp3);
        expandedCardView.addView(preAcceptButtonsRow);

        // 7. IN-ROUTE SECTION (Shown when a ride was accepted and driver is currently on the trip)
        inRouteSection = new LinearLayout(this);
        inRouteSection.setOrientation(LinearLayout.VERTICAL);
        inRouteSection.setPadding(0, dp(4), 0, 0);
        inRouteSection.setVisibility(View.GONE);

        inRouteSummaryText = new TextView(this);
        inRouteSummaryText.setTextColor(Color.parseColor("#BAE6FD"));
        inRouteSummaryText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        inRouteSummaryText.setPadding(0, 0, 0, dp(8));
        inRouteSection.addView(inRouteSummaryText);

        LinearLayout inRouteBtns = new LinearLayout(this);
        inRouteBtns.setOrientation(LinearLayout.HORIZONTAL);

        TextView cancelTripBtn = new TextView(this);
        cancelTripBtn.setText("✕ Cancelar");
        cancelTripBtn.setGravity(Gravity.CENTER);
        cancelTripBtn.setTextColor(Color.parseColor("#FDA4AF"));
        cancelTripBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        cancelTripBtn.setTypeface(Typeface.DEFAULT_BOLD);
        cancelTripBtn.setPadding(dp(8), dp(11), dp(8), dp(11));
        cancelTripBtn.setBackground(roundedBox(Color.parseColor("#4C0519"), Color.parseColor("#F43F5E"), 1, 10));
        cancelTripBtn.setOnClickListener(v -> {
            isRideInRoute = false;
            resetRideCalculator();
            setExpandedState(false);
        });

        TextView finishTripBtn = new TextView(this);
        finishTripBtn.setText("✓ CONCLUIR E SOMAR NO DIA");
        finishTripBtn.setGravity(Gravity.CENTER);
        finishTripBtn.setTextColor(Color.parseColor("#052E16"));
        finishTripBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        finishTripBtn.setTypeface(Typeface.DEFAULT_BOLD);
        finishTripBtn.setPadding(dp(8), dp(11), dp(8), dp(11));
        finishTripBtn.setBackground(roundedBox(Color.parseColor("#34D399"), Color.TRANSPARENT, 0, 10));
        finishTripBtn.setOnClickListener(v -> {
            appendPendingRideEvent(
                FloatingOverlayService.this,
                "completed",
                selectedPlatform,
                currentGross,
                currentDistanceKm,
                currentDurationMin
            );
            isRideInRoute = false;
            resetRideCalculator();
            setExpandedState(false);
        });

        LinearLayout.LayoutParams irLp1 = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 0.8f);
        irLp1.rightMargin = dp(6);
        LinearLayout.LayoutParams irLp2 = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.5f);
        inRouteBtns.addView(cancelTripBtn, irLp1);
        inRouteBtns.addView(finishTripBtn, irLp2);
        inRouteSection.addView(inRouteBtns);

        expandedCardView.addView(inRouteSection);
    }

    private TextView createPlatformTab(final String platformName) {
        TextView tv = new TextView(this);
        tv.setText(platformName.toUpperCase(Locale.ROOT));
        tv.setGravity(Gravity.CENTER);
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        tv.setTypeface(Typeface.DEFAULT_BOLD);
        tv.setPadding(dp(6), dp(6), dp(6), dp(6));
        tv.setOnClickListener(v -> {
            selectedPlatform = platformName;
            refreshOverlayUI();
        });
        return tv;
    }

    private LinearLayout createMetricInputBox(String label, TextView valueTv, final int fieldIndex) {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(dp(8), dp(6), dp(8), dp(6));

        TextView titleTv = new TextView(this);
        titleTv.setText(label);
        titleTv.setTextColor(Color.parseColor("#94A3B8"));
        titleTv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 9);
        titleTv.setTypeface(Typeface.DEFAULT_BOLD);
        box.addView(titleTv);

        valueTv.setTextColor(Color.WHITE);
        valueTv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        valueTv.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        valueTv.setPadding(0, dp(2), 0, 0);
        box.addView(valueTv);

        box.setOnClickListener(v -> {
            activeInputField = fieldIndex;
            rawInputBuffer = "";
            isAutoReadFilled = false;
            autoReadBadgeText = "";
            refreshOverlayUI();
        });
        return box;
    }

    private void handleKeypadPress(String key) {
        // Driver started typing manually → the numbers are no longer an OCR reading.
        isAutoReadFilled = false;
        autoReadBadgeText = "";
        if ("C".equals(key)) {
            rawInputBuffer = "";
            if (activeInputField == 0) currentGross = 0.0;
            else if (activeInputField == 1) currentDistanceKm = 1.0;
            else currentDurationMin = 5;
        } else if ("⌫".equals(key)) {
            if (!rawInputBuffer.isEmpty()) {
                rawInputBuffer = rawInputBuffer.substring(0, rawInputBuffer.length() - 1);
            }
            applyBufferToActiveField();
        } else if ("-1".equals(key) || "+1".equals(key) || "+5".equals(key)) {
            rawInputBuffer = "";
            double delta = "-1".equals(key) ? -1.0 : "+1".equals(key) ? 1.0 : 5.0;
            if (activeInputField == 0) {
                currentGross = Math.max(0.0, currentGross + delta);
            } else if (activeInputField == 1) {
                currentDistanceKm = Math.max(0.5, currentDistanceKm + (delta == 5.0 ? 2.0 : delta * 0.5));
            } else {
                currentDurationMin = Math.max(1, currentDurationMin + (int) delta);
            }
        } else {
            String normalized = ",".equals(key) ? "." : key;
            if (".".equals(normalized) && rawInputBuffer.contains(".")) {
                return;
            }
            if (rawInputBuffer.length() < 6) {
                rawInputBuffer += normalized;
                applyBufferToActiveField();
            }
        }
        recalculateMetrics();
        refreshOverlayUI();
    }

    private void applyBufferToActiveField() {
        double parsed = 0.0;
        try {
            if (!rawInputBuffer.isEmpty() && !".".equals(rawInputBuffer)) {
                parsed = Double.parseDouble(rawInputBuffer);
            }
        } catch (Exception ignored) {}

        if (activeInputField == 0) {
            currentGross = Math.max(0.0, parsed);
        } else if (activeInputField == 1) {
            currentDistanceKm = Math.max(0.5, parsed > 0 ? parsed : 0.5);
        } else {
            currentDurationMin = Math.max(1, (int) Math.round(parsed > 0 ? parsed : 1));
        }
    }

    private void resetRideCalculator() {
        currentGross = 0.0;
        rawInputBuffer = "";
        activeInputField = 0;
        isRideInRoute = false;
        isAutoReadFilled = false;
        autoReadBadgeText = "";
        recalculateMetrics();
        refreshOverlayUI();
    }

    private void recalculateMetrics() {
        if (currentGross <= 0.0) {
            computedCost = 0.0;
            computedNetProfit = 0.0;
            computedNetPerKm = 0.0;
            computedGrossPerKm = 0.0;
            computedNetPerHour = 0.0;
            computedScore = 0;
            computedTier = "AGUARDANDO";
            return;
        }

        double dist = Math.max(0.5, currentDistanceKm);
        int dur = Math.max(1, currentDurationMin);

        computedCost = dist * driverCostPerKm;
        computedNetProfit = currentGross - computedCost;
        computedGrossPerKm = currentGross / dist;
        computedNetPerKm = computedNetProfit / dist;
        computedNetPerHour = (computedNetProfit / dur) * 60.0;

        double ratio = computedNetPerKm / Math.max(0.5, driverMinNetPerKm);
        if (computedNetProfit <= 0) {
            computedScore = 15;
            computedTier = "PREJUÍZO";
        } else if (ratio >= 1.10) {
            computedScore = Math.min(99, (int) Math.round(80 + (ratio - 1.0) * 35));
            computedTier = "EXCELENTE";
        } else if (ratio >= 0.85) {
            computedScore = Math.max(55, Math.min(79, (int) Math.round(60 + (ratio - 0.85) * 75)));
            computedTier = "ATENÇÃO";
        } else {
            computedScore = Math.max(20, Math.min(54, (int) Math.round(ratio * 55)));
            computedTier = "RUIM";
        }
    }

    private void setExpandedState(boolean expand) {
        this.isExpanded = expand;
        if (collapsedPillView != null && expandedCardView != null) {
            collapsedPillView.setVisibility(expand ? View.GONE : View.VISIBLE);
            expandedCardView.setVisibility(expand ? View.VISIBLE : View.GONE);
        }
        refreshOverlayUI();
        if (windowManager != null && rootContainer != null && windowParams != null) {
            try {
                DisplayMetrics dm = getResources().getDisplayMetrics();
                if (expand) {
                    windowParams.x = Math.max(dp(8), (dm.widthPixels - dp(336)) / 2);
                }
                windowManager.updateViewLayout(rootContainer, windowParams);
            } catch (Exception ignored) {}
        }
    }

    private void refreshOverlayUI() {
        if (collapsedPillView == null || expandedCardView == null) return;

        // 1. Update Platform Tabs
        updatePlatformTabStyle(platformUberBtn, "Uber".equalsIgnoreCase(selectedPlatform), "#FFFFFF");
        updatePlatformTabStyle(platform99Btn, "99".equalsIgnoreCase(selectedPlatform), "#FBBF24");
        updatePlatformTabStyle(platformIndriveBtn, "InDrive".equalsIgnoreCase(selectedPlatform), "#34D399");

        // 2. Update Metric Input Boxes
        grossInputBox.setBackground(
            roundedBox(
                Color.parseColor("#131822"),
                activeInputField == 0 ? Color.parseColor("#10B981") : Color.parseColor("#263042"),
                activeInputField == 0 ? 2 : 1,
                10
            )
        );
        distInputBox.setBackground(
            roundedBox(
                Color.parseColor("#131822"),
                activeInputField == 1 ? Color.parseColor("#10B981") : Color.parseColor("#263042"),
                activeInputField == 1 ? 2 : 1,
                10
            )
        );
        timeInputBox.setBackground(
            roundedBox(
                Color.parseColor("#131822"),
                activeInputField == 2 ? Color.parseColor("#10B981") : Color.parseColor("#263042"),
                activeInputField == 2 ? 2 : 1,
                10
            )
        );

        grossValueLabel.setText(
            currentGross > 0
                ? String.format(Locale.forLanguageTag("pt-BR"), "R$ %.2f", currentGross)
                : "R$ 0,00"
        );
        distValueLabel.setText(
            String.format(Locale.forLanguageTag("pt-BR"), "%.1f km", currentDistanceKm)
        );
        timeValueLabel.setText(currentDurationMin + " min");

        // 3. Update Traffic-Light Verdict & Collapsed Floating Pill
        if (isRideInRoute && currentGross > 0) {
            collapsedPillView.setBackground(
                roundedBox(Color.parseColor("#081420"), Color.parseColor("#38BDF8"), 2, 28)
            );
            pillStatusDot.setBackground(roundedBox(Color.parseColor("#38BDF8"), Color.TRANSPARENT, 0, 10));
            pillMainText.setText("🟢 EM ROTA • " + selectedPlatform.toUpperCase(Locale.ROOT));
            pillSubText.setText(
                String.format(Locale.forLanguageTag("pt-BR"), "+R$ %.2f líq", computedNetProfit)
            );
            pillSubText.setTextColor(Color.parseColor("#38BDF8"));

            verdictContainer.setBackground(
                roundedBox(Color.parseColor("#082F49"), Color.parseColor("#38BDF8"), 2, 12)
            );
            verdictTitleText.setText("🟢 VIAGEM EM ANDAMENTO (" + selectedPlatform.toUpperCase(Locale.ROOT) + ")");
            verdictNetProfitText.setText(
                String.format(
                    Locale.forLanguageTag("pt-BR"),
                    "+R$ %.2f líq (Bruto R$ %.2f)",
                    computedNetProfit,
                    currentGross
                )
            );
            verdictNetProfitText.setTextColor(Color.parseColor("#38BDF8"));
            verdictMetricsText.setText(
                String.format(
                    Locale.forLanguageTag("pt-BR"),
                    "R$ %.2f/km líq • %.1f km • Custo -R$ %.2f",
                    computedNetPerKm,
                    currentDistanceKm,
                    computedCost
                )
            );

            keypadSection.setVisibility(View.GONE);
            preAcceptButtonsRow.setVisibility(View.GONE);
            inRouteSection.setVisibility(View.VISIBLE);
            inRouteSummaryText.setText(
                "Ao finalizar a corrida com o passageiro, toque abaixo para somar automaticamente no seu faturamento de hoje:"
            );
            return;
        }

        keypadSection.setVisibility(View.VISIBLE);
        preAcceptButtonsRow.setVisibility(View.VISIBLE);
        inRouteSection.setVisibility(View.GONE);

        if (currentGross <= 0.0) {
            // Clean Standby State (NO fake simulation!)
            collapsedPillView.setBackground(
                roundedBox(Color.parseColor("#090C12"), Color.parseColor("#10B981"), 2, 28)
            );
            pillStatusDot.setBackground(roundedBox(Color.parseColor("#10B981"), Color.TRANSPARENT, 0, 10));
            pillMainText.setText("⚡ DriveWise");
            pillSubText.setText("Calcular chamada");
            pillSubText.setTextColor(Color.parseColor("#34D399"));

            verdictContainer.setBackground(
                roundedBox(Color.parseColor("#111622"), Color.parseColor("#334155"), 1, 12)
            );
            verdictTitleText.setText(
                String.format(
                    Locale.forLanguageTag("pt-BR"),
                    "DIGITE O VALOR DA CHAMADA (Custo: R$ %.2f/km)",
                    driverCostPerKm
                )
            );
            verdictNetProfitText.setText("Lucro Líquido Real");
            verdictNetProfitText.setTextColor(Color.parseColor("#94A3B8"));
            verdictMetricsText.setText(
                String.format(
                    Locale.forLanguageTag("pt-BR"),
                    "Sua meta mínima: R$ %.2f/km líq",
                    driverMinNetPerKm
                )
            );
        } else {
            int accentColor;
            int bgColor;
            String trafficLabel;

            if ("EXCELENTE".equals(computedTier)) {
                accentColor = Color.parseColor("#10B981");
                bgColor = Color.parseColor("#064E3B");
                trafficLabel = "🟢 COMPENSA ACEITAR • NOTA " + computedScore;
            } else if ("ATENÇÃO".equals(computedTier)) {
                accentColor = Color.parseColor("#F59E0B");
                bgColor = Color.parseColor("#451A03");
                trafficLabel = "🟡 ATENÇÃO (MARGEM MÉDIA) • NOTA " + computedScore;
            } else {
                accentColor = Color.parseColor("#F43F5E");
                bgColor = Color.parseColor("#4C0519");
                trafficLabel = "🔴 NÃO COMPENSA • NOTA " + computedScore;
            }

            collapsedPillView.setBackground(
                roundedBox(Color.parseColor("#090C12"), accentColor, 2, 28)
            );
            pillStatusDot.setBackground(roundedBox(accentColor, Color.TRANSPARENT, 0, 10));
            pillMainText.setText(
                String.format(
                    Locale.forLanguageTag("pt-BR"),
                    "%s • +R$ %.2f",
                    selectedPlatform.toUpperCase(Locale.ROOT),
                    computedNetProfit
                )
            );
            pillSubText.setText(
                String.format(
                    Locale.forLanguageTag("pt-BR"),
                    "R$ %.2f/km líq • Nota %d",
                    computedNetPerKm,
                    computedScore
                )
            );
            pillSubText.setTextColor(accentColor);

            verdictContainer.setBackground(roundedBox(bgColor, accentColor, 2, 12));
            verdictTitleText.setText(
                (isAutoReadFilled ? autoReadBadgeText + "\n" : "") + trafficLabel
            );
            verdictNetProfitText.setText(
                String.format(
                    Locale.forLanguageTag("pt-BR"),
                    "%sR$ %.2f líquido",
                    computedNetProfit >= 0 ? "+" : "",
                    computedNetProfit
                )
            );
            verdictNetProfitText.setTextColor(accentColor);
            verdictMetricsText.setText(
                String.format(
                    Locale.forLanguageTag("pt-BR"),
                    "R$ %.2f/km líq • R$ %.0f/h • Custo -R$ %.2f",
                    computedNetPerKm,
                    computedNetPerHour,
                    computedCost
                )
            );
        }
    }

    private void updatePlatformTabStyle(TextView tab, boolean selected, String activeHex) {
        if (selected) {
            tab.setTextColor(Color.parseColor("#080A0F"));
            tab.setBackground(roundedBox(Color.parseColor(activeHex), Color.TRANSPARENT, 0, 8));
        } else {
            tab.setTextColor(Color.parseColor("#94A3B8"));
            tab.setBackground(roundedBox(Color.parseColor("#141923"), Color.parseColor("#263042"), 1, 8));
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "DriveWise Copiloto Flutuante",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Mantém a bolha flutuante ativa sobre Uber, 99 e InDrive");
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildForegroundNotification() {
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        Intent expandIntent = new Intent(this, FloatingOverlayService.class);
        expandIntent.setAction(ACTION_EXPAND);
        PendingIntent expandPi = PendingIntent.getService(this, 301, expandIntent, flags);

        Intent stopIntent = new Intent(this, FloatingOverlayService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent stopPi = PendingIntent.getService(this, 302, stopIntent, flags);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("⚡ Copiloto DriveWise Ativo")
            .setContentText("Bolha flutuante pronta sobre Uber, 99 e InDrive")
            .setContentIntent(expandPi)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .addAction(android.R.drawable.ic_menu_view, "Abrir Calculadora HUD", expandPi)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Desativar HUD", stopPi)
            .build();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        isRunning = false;
        if (windowManager != null && rootContainer != null) {
            try {
                windowManager.removeView(rootContainer);
            } catch (Exception ignored) {}
            rootContainer = null;
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
