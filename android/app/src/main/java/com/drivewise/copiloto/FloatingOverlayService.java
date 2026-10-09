package com.drivewise.copiloto;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.Settings;
import android.speech.tts.TextToSpeech;
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
import androidx.core.content.ContextCompat;

import java.util.Locale;

public class FloatingOverlayService extends Service {

    public static final String CHANNEL_ID = "drivewise_floating_overlay_channel";
    public static final int NOTIFICATION_ID = 4102;
    public static final String PREFS_NAME = "DriveWiseHudPrefs";

    public static final String ACTION_START = "com.drivewise.copiloto.ACTION_START_OVERLAY";
    public static final String ACTION_STOP = "com.drivewise.copiloto.ACTION_STOP_OVERLAY";
    public static final String ACTION_UPDATE_CONFIG = "com.drivewise.copiloto.ACTION_UPDATE_OVERLAY_CONFIG";

    public static volatile boolean isRunning = false;

    private WindowManager windowManager;
    private WindowManager.LayoutParams windowParams;
    private FrameLayout rootContainer;

    private LinearLayout pillView;
    private LinearLayout bannerView;
    
    private TextView pillText;
    private TextView bannerTitle;
    private TextView bannerProfit;
    private TextView bannerMetrics;

    private double driverCostPerKm = 0.75;
    private double driverMinNetPerKm = 1.80;

    private String lastDetectedOfferSignature = "";
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private TextToSpeech tts;
    private boolean isTtsReady = false;

    private LocationManager locationManager;
    private Location lastValidLocation = null;

    private BroadcastReceiver accessibilityReceiver;

    private final Runnable hideBannerRunnable = () -> {
        if (bannerView != null) bannerView.setVisibility(View.GONE);
        if (pillView != null) pillView.setVisibility(View.VISIBLE);
    };

    @Override
    public void onCreate() {
        super.onCreate();
        isRunning = true;
        createNotificationChannel();
        startForegroundSafely();
        loadConfigFromPrefs();
        initTextToSpeech();
        startBackgroundGpsTracking();

        if (canDrawOverlays(this)) {
            initFloatingOverlayWindow();
        }
        
        registerAccessibilityReceiver();
    }

    private void registerAccessibilityReceiver() {
        accessibilityReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if ("com.drivewise.copiloto.ACTION_ACCESSIBILITY_RIDE_EVENT".equals(intent.getAction())) {
                    String platform = intent.getStringExtra("platform");
                    double gross = intent.getDoubleExtra("gross", 0);
                    double pickupDist = intent.getDoubleExtra("pickupDist", 0);
                    double tripDist = intent.getDoubleExtra("tripDist", 0);
                    int pickupTime = intent.getIntExtra("pickupTime", 0);
                    int tripTime = intent.getIntExtra("tripTime", 0);

                    processRideEvent(platform, gross, pickupDist, tripDist, pickupTime, tripTime);
                }
            }
        };
        IntentFilter filter = new IntentFilter("com.drivewise.copiloto.ACTION_ACCESSIBILITY_RIDE_EVENT");
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(accessibilityReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(accessibilityReceiver, filter);
        }
    }

    public static boolean canDrawOverlays(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return Settings.canDrawOverlays(context);
        }
        return true;
    }

    private void initTextToSpeech() {
        try {
            tts = new TextToSpeech(getApplicationContext(), status -> {
                if (status == TextToSpeech.SUCCESS && tts != null) {
                    int result = tts.setLanguage(Locale.forLanguageTag("pt-BR"));
                    isTtsReady = (result != TextToSpeech.LANG_MISSING_DATA &&
                        result != TextToSpeech.LANG_NOT_SUPPORTED);
                }
            });
        } catch (Exception ignored) {}
    }

    private void speakVerdict(String tier, String platform, double netProfit, double netPerKm) {
        if (!isTtsReady || tts == null) return;
        try {
            String voiceColor = "VERDE".equals(tier)
                ? "Corrida Verde"
                : ("AMARELO".equals(tier) ? "Corrida Amarela" : "Corrida Vermelha, não compensa");
            
            String speech = String.format(
                Locale.forLanguageTag("pt-BR"),
                "%s na %s. Lucro líquido %.2f reais. %.2f por quilômetro.",
                voiceColor, platform, netProfit, netPerKm
            );
            tts.speak(speech, TextToSpeech.QUEUE_FLUSH, null, "drivewise_verdict_utt");
        } catch (Exception ignored) {}
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopBackgroundGpsTracking();
            stopForeground(true);
            stopSelf();
            isRunning = false;
            return START_NOT_STICKY;
        }

        if (!canDrawOverlays(this)) {
            stopBackgroundGpsTracking();
            stopForeground(true);
            stopSelf();
            isRunning = false;
            return START_NOT_STICKY;
        }

        if (rootContainer == null) {
            initFloatingOverlayWindow();
        }

        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_UPDATE_CONFIG.equals(action)) {
                loadConfigFromPrefs();
            }
        }

        isRunning = true;
        return START_STICKY;
    }

    private void startForegroundSafely() {
        Notification notification = buildForegroundNotification();
        try {
            if (Build.VERSION.SDK_INT >= 34) {
                int fgType = android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE;
                boolean hasLoc = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
                if (hasLoc) fgType |= android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION;
                startForeground(NOTIFICATION_ID, notification, fgType);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception ignored) {}
    }

    private Notification buildForegroundNotification() {
        createNotificationChannel();
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("DriveWise Copiloto")
            .setContentText("Monitorando corridas em tempo real")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setPriority(NotificationCompat.PRIORITY_LOW);
        return builder.build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "DriveWise HUD", NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }

    private void processRideEvent(String platform, double gross, double pickupDist, double tripDist, int pickupTime, int tripTime) {
        String sig = String.format(Locale.ROOT, "%s|%.2f|%.1f", platform, gross, tripDist);
        if (sig.equals(lastDetectedOfferSignature)) return;
        lastDetectedOfferSignature = sig;

        double totalDist = pickupDist + tripDist;
        double totalCost = totalDist * driverCostPerKm;
        double netProfit = gross - totalCost;
        double netPerKm = totalDist > 0 ? netProfit / totalDist : 0;
        double totalHours = (pickupTime + tripTime) / 60.0;
        double netPerHour = totalHours > 0 ? netProfit / totalHours : 0;

        String tier = "VERMELHO";
        if (netPerKm >= driverMinNetPerKm * 1.2) tier = "VERDE";
        else if (netPerKm >= driverMinNetPerKm) tier = "AMARELO";

        bannerTitle.setText(String.format(Locale.getDefault(), "%s - %s", tier, platform));
        bannerProfit.setText(String.format(Locale.getDefault(), "R$ %.2f líq", netProfit));
        bannerMetrics.setText(String.format(Locale.getDefault(), "R$ %.2f/km | R$ %.0f/h", netPerKm, netPerHour));

        ColorizeBanner(tier);

        if (bannerView != null && pillView != null) {
            pillView.setVisibility(View.GONE);
            bannerView.setVisibility(View.VISIBLE);
        }

        speakVerdict(tier, platform, netProfit, netPerKm);

        mainHandler.removeCallbacks(hideBannerRunnable);
        mainHandler.postDelayed(hideBannerRunnable, 8000);
    }

    private void ColorizeBanner(String tier) {
        int borderColor = Color.parseColor("#EF4444"); // Red
        if ("VERDE".equals(tier)) borderColor = Color.parseColor("#10B981");
        else if ("AMARELO".equals(tier)) borderColor = Color.parseColor("#F59E0B");
        
        if (bannerView != null) {
            bannerView.setBackground(roundedBox(Color.parseColor("#0B0E15"), borderColor, 2, 16));
        }
    }

    private void loadConfigFromPrefs() {
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            driverCostPerKm = Double.longBitsToDouble(prefs.getLong("cost_per_km", Double.doubleToLongBits(0.75)));
            driverMinNetPerKm = Double.longBitsToDouble(prefs.getLong("min_net_per_km", Double.doubleToLongBits(1.80)));
            if (driverCostPerKm <= 0) driverCostPerKm = 0.75;
            if (driverMinNetPerKm <= 0) driverMinNetPerKm = 1.80;
        } catch (Exception ignored) {}
    }

    private int dp(int value) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value, getResources().getDisplayMetrics());
    }

    private GradientDrawable roundedBox(int bgColor, int borderColor, int borderDp, int radiusDp) {
        GradientDrawable gd = new GradientDrawable();
        gd.setColor(bgColor);
        gd.setCornerRadius(dp(radiusDp));
        if (borderDp > 0) gd.setStroke(dp(borderDp), borderColor);
        return gd;
    }

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
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        );

        windowParams.gravity = Gravity.TOP | Gravity.START;
        DisplayMetrics dm = getResources().getDisplayMetrics();
        windowParams.x = Math.max(dp(10), dm.widthPixels - dp(220));
        windowParams.y = dp(130);

        rootContainer = new FrameLayout(this);
        buildViews();

        rootContainer.addView(pillView);
        rootContainer.addView(bannerView);
        
        if (bannerView != null) bannerView.setVisibility(View.GONE);

        try {
            windowManager.addView(rootContainer, windowParams);
        } catch (Exception ignored) {}
    }

    private void buildViews() {
        // Standby Pill
        pillView = new LinearLayout(this);
        pillView.setOrientation(LinearLayout.HORIZONTAL);
        pillView.setGravity(Gravity.CENTER_VERTICAL);
        pillView.setPadding(dp(12), dp(8), dp(12), dp(8));
        pillView.setBackground(roundedBox(Color.parseColor("#090C12"), Color.parseColor("#10B981"), 2, 28));

        TextView pillIcon = new TextView(this);
        pillIcon.setText("⚡");
        pillIcon.setTextColor(Color.WHITE);
        pillIcon.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        pillView.addView(pillIcon);

        pillText = new TextView(this);
        pillText.setText("DriveWise");
        pillText.setTextColor(Color.parseColor("#34D399"));
        pillText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        pillText.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        LinearLayout.LayoutParams textParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        textParams.leftMargin = dp(6);
        pillView.addView(pillText, textParams);

        pillView.setOnTouchListener(new View.OnTouchListener() {
            private int initialX, initialY;
            private float initialTouchX, initialTouchY;
            private boolean moved;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                if (windowParams == null) return false;
                switch (event.getActionMasked()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = windowParams.x; initialY = windowParams.y;
                        initialTouchX = event.getRawX(); initialTouchY = event.getRawY();
                        moved = false; return true;
                    case MotionEvent.ACTION_MOVE:
                        int dx = (int) (event.getRawX() - initialTouchX);
                        int dy = (int) (event.getRawY() - initialTouchY);
                        if (Math.hypot(dx, dy) > dp(6)) moved = true;
                        DisplayMetrics dm = getResources().getDisplayMetrics();
                        windowParams.x = Math.max(0, Math.min(dm.widthPixels - dp(80), initialX + dx));
                        windowParams.y = Math.max(dp(24), Math.min(dm.heightPixels - dp(80), initialY + dy));
                        try { windowManager.updateViewLayout(rootContainer, windowParams); } catch (Exception ignored) {}
                        return true;
                    case MotionEvent.ACTION_UP: return true;
                }
                return false;
            }
        });

        // Ride Banner
        bannerView = new LinearLayout(this);
        bannerView.setOrientation(LinearLayout.VERTICAL);
        bannerView.setPadding(dp(16), dp(12), dp(16), dp(12));
        bannerView.setBackground(roundedBox(Color.parseColor("#0B0E15"), Color.parseColor("#EF4444"), 2, 16));

        bannerTitle = new TextView(this);
        bannerTitle.setTextColor(Color.WHITE);
        bannerTitle.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        bannerTitle.setTypeface(Typeface.DEFAULT_BOLD);
        bannerView.addView(bannerTitle);

        bannerProfit = new TextView(this);
        bannerProfit.setTextColor(Color.parseColor("#10B981"));
        bannerProfit.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18);
        bannerProfit.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        LinearLayout.LayoutParams profitParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        profitParams.topMargin = dp(4);
        bannerView.addView(bannerProfit, profitParams);

        bannerMetrics = new TextView(this);
        bannerMetrics.setTextColor(Color.parseColor("#94A3B8"));
        bannerMetrics.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        bannerMetrics.setTypeface(Typeface.MONOSPACE);
        LinearLayout.LayoutParams metricParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        metricParams.topMargin = dp(2);
        bannerView.addView(bannerMetrics, metricParams);

        LinearLayout btnRow = new LinearLayout(this);
        btnRow.setOrientation(LinearLayout.HORIZONTAL);
        btnRow.setGravity(Gravity.END);
        LinearLayout.LayoutParams rowParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        rowParams.topMargin = dp(8);
        
        TextView btnReject = new TextView(this);
        btnReject.setText("✕ Recusar");
        btnReject.setTextColor(Color.parseColor("#EF4444"));
        btnReject.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        btnReject.setPadding(dp(12), dp(4), dp(12), dp(4));
        btnReject.setOnClickListener(v -> {
            if (RideAccessibilityService.instance != null) {
                RideAccessibilityService.instance.performRejectRideClick();
            }
            mainHandler.removeCallbacks(hideBannerRunnable);
            hideBannerRunnable.run();
        });
        btnRow.addView(btnReject);

        TextView btnAccept = new TextView(this);
        btnAccept.setText("✓ Aceitar");
        btnAccept.setTextColor(Color.parseColor("#10B981"));
        btnAccept.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        btnAccept.setPadding(dp(16), dp(4), dp(12), dp(4));
        btnAccept.setOnClickListener(v -> {
            if (RideAccessibilityService.instance != null) {
                RideAccessibilityService.instance.performAcceptRideClick();
            }
            mainHandler.removeCallbacks(hideBannerRunnable);
            hideBannerRunnable.run();
        });
        btnRow.addView(btnAccept);

        bannerView.addView(btnRow, rowParams);
        
        bannerView.setOnTouchListener(new View.OnTouchListener() {
            private int initialX, initialY;
            private float initialTouchX, initialTouchY;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                if (windowParams == null) return false;
                switch (event.getActionMasked()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = windowParams.x; initialY = windowParams.y;
                        initialTouchX = event.getRawX(); initialTouchY = event.getRawY();
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        int dx = (int) (event.getRawX() - initialTouchX);
                        int dy = (int) (event.getRawY() - initialTouchY);
                        DisplayMetrics dm = getResources().getDisplayMetrics();
                        windowParams.x = Math.max(0, Math.min(dm.widthPixels - dp(150), initialX + dx));
                        windowParams.y = Math.max(dp(24), Math.min(dm.heightPixels - dp(150), initialY + dy));
                        try { windowManager.updateViewLayout(rootContainer, windowParams); } catch (Exception ignored) {}
                        return true;
                }
                return false;
            }
        });
    }

    // GPS Tracking (Mantido)
    private void startBackgroundGpsTracking() {
        try {
            locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
            if (locationManager == null) return;
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 4000L, 10.0f, new LocationListener() {
                    @Override public void onLocationChanged(Location location) {
                        if (location.hasAccuracy() && location.getAccuracy() > 45.0f) return;
                        if (lastValidLocation != null) {
                            float deltaMeters = lastValidLocation.distanceTo(location);
                            if (deltaMeters >= 12.0f) lastValidLocation = location;
                        } else lastValidLocation = location;
                    }
                    @Override public void onStatusChanged(String p, int s, Bundle e) {}
                    @Override public void onProviderEnabled(String p) {}
                    @Override public void onProviderDisabled(String p) {}
                }, Looper.getMainLooper());
            }
        } catch (Exception ignored) {}
    }

    private void stopBackgroundGpsTracking() {
        if (locationManager != null) try { locationManager.removeUpdates(null); } catch (Exception ignored) {}
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        isRunning = false;
        if (accessibilityReceiver != null) {
            try { unregisterReceiver(accessibilityReceiver); } catch (Exception ignored) {}
        }
        stopBackgroundGpsTracking();
        if (tts != null) { tts.stop(); tts.shutdown(); }
        if (rootContainer != null && windowManager != null) {
            try { windowManager.removeView(rootContainer); } catch (Exception ignored) {}
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) { return null; }
}
