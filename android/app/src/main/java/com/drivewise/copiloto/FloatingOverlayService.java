package com.drivewise.copiloto;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.media.Image;
import android.media.ImageReader;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
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
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Real System Floating Overlay Service (TYPE_APPLICATION_OVERLAY via WindowManager)
 * + Play-Protect-Safe Automatic Screen OCR Radar (MediaProjection + Google ML Kit TextRecognition)
 * + Native Portuguese Voice Verdict (TextToSpeech)
 * + Native Background GPS Shift Distance Tracker (LocationManager).
 *
 * Zero restricted Play Protect permissions (does NOT use BIND_ACCESSIBILITY_SERVICE,
 * BIND_NOTIFICATION_LISTENER_SERVICE, READ_SMS, or RECEIVE_SMS).
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
    public static final String ACTION_START_AUTO_RADAR = "com.drivewise.copiloto.ACTION_START_AUTO_RADAR";
    public static final String ACTION_STOP_AUTO_RADAR = "com.drivewise.copiloto.ACTION_STOP_AUTO_RADAR";
    public static final String ACTION_SCAN_SCREEN_NOW = "com.drivewise.copiloto.ACTION_SCAN_SCREEN_NOW";
    public static final String ACTION_OVERLAY_RIDE_EVENT = "com.drivewise.copiloto.ACTION_OVERLAY_RIDE_EVENT";
    public static final String ACTION_OVERLAY_GPS_EVENT = "com.drivewise.copiloto.ACTION_OVERLAY_GPS_EVENT";

    public static volatile boolean isRunning = false;
    public static volatile boolean isAutoRadarActive = false;

    private WindowManager windowManager;
    private WindowManager.LayoutParams windowParams;
    private FrameLayout rootContainer;

    // 1. Minimized Floating Pill Views
    private LinearLayout collapsedPillView;
    private View pillStatusDot;
    private TextView pillMainText;
    private TextView pillSubText;
    private TextView pillRadarActionBtn;

    // 2. Expanded Interactive HUD Card Views
    private LinearLayout expandedCardView;
    private TextView headerRadarBtn;
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

    // Computed real-time metrics
    private double computedCost = 0.0;
    private double computedNetProfit = 0.0;
    private double computedNetPerKm = 0.0;
    private double computedGrossPerKm = 0.0;
    private double computedNetPerHour = 0.0;
    private int computedScore = 0;
    private String computedTier = "AGUARDANDO";

    // Auto-Radar OCR (MediaProjection + ML Kit TextRecognizer)
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private MediaProjection mediaProjection;
    private VirtualDisplay virtualDisplay;
    private ImageReader imageReader;
    private TextRecognizer textRecognizer;
    private boolean isOcrScanInProgress = false;
    private String lastDetectedOfferSignature = "";
    private long lastDetectedOfferTimestamp = 0L;
    private static final long AUTO_SCAN_INTERVAL_MS = 1900L;

    // Native TextToSpeech for hands-free voice verdict
    private TextToSpeech tts;
    private boolean isTtsReady = false;

    // Native Background GPS Distance Tracker
    private LocationManager locationManager;
    private Location lastValidLocation = null;

    // Regex Patterns for Brazilian Uber / 99 / InDrive offer screens
    private static final Pattern CURRENCY_PATTERN = Pattern.compile(
        "R\\$\\s*(\\d{1,3}(?:[.,]\\d{2}))(?!\\s*/\\s*(?:km|min|h))",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern DISTANCE_KM_PATTERN = Pattern.compile(
        "(\\d{1,3}(?:[.,]\\d{1,2})?)\\s*km\\b(?!\\s*/\\s*h)",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern DURATION_MIN_PATTERN = Pattern.compile(
        "(\\d{1,3})\\s*(?:min|minutos)\\b",
        Pattern.CASE_INSENSITIVE
    );

    private final Runnable autoRadarScanRunnable = new Runnable() {
        @Override
        public void run() {
            if (!isRunning || !isAutoRadarActive || mediaProjection == null) {
                return;
            }
            try {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                boolean screenInteractive = pm == null || pm.isInteractive();
                // Auto-scan when screen is on, not currently in route, and card is collapsed
                if (screenInteractive && !isRideInRoute &&
                    (expandedCardView == null || expandedCardView.getVisibility() != View.VISIBLE)) {
                    captureAndAnalyzeScreenFrame(false);
                }
            } catch (Exception ignored) {}
            mainHandler.postDelayed(this, AUTO_SCAN_INTERVAL_MS);
        }
    };

    private final LocationListener backgroundGpsListener = new LocationListener() {
        @Override
        public void onLocationChanged(Location location) {
            if (location == null) return;
            // Filter inaccurate GPS points (> 45m accuracy)
            if (location.hasAccuracy() && location.getAccuracy() > 45.0f) {
                return;
            }
            if (lastValidLocation != null) {
                float deltaMeters = lastValidLocation.distanceTo(location);
                long deltaTimeSec = Math.max(1L, (location.getTime() - lastValidLocation.getTime()) / 1000L);
                double speedKmh = (deltaMeters / (double) deltaTimeSec) * 3.6;

                // Filter stationary GPS drift (< 12m) and unrealistic jumps (> 170 km/h)
                if (deltaMeters >= 12.0f && speedKmh <= 170.0) {
                    double deltaKm = deltaMeters / 1000.0;
                    recordBackgroundGpsDeltaKm(deltaKm);
                    lastValidLocation = location;
                }
            } else {
                lastValidLocation = location;
            }
        }

        @Override
        public void onStatusChanged(String provider, int status, Bundle extras) {}

        @Override
        public void onProviderEnabled(String provider) {}

        @Override
        public void onProviderDisabled(String provider) {}
    };

    @Override
    public void onCreate() {
        super.onCreate();
        isRunning = true;
        createNotificationChannel();
        startForegroundSafely(false);
        loadConfigFromPrefs();
        initTextToSpeech();
        initMlKitRecognizer();
        startBackgroundGpsTracking();

        if (canDrawOverlays(this)) {
            initFloatingOverlayWindow();
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

    private void speakVerdictInPortuguese(String text) {
        if (!isTtsReady || tts == null || text == null || text.isEmpty()) return;
        try {
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "drivewise_verdict_utt");
        } catch (Exception ignored) {}
    }

    private void initMlKitRecognizer() {
        try {
            textRecognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
        } catch (Exception ignored) {}
    }

    @SuppressLint("MissingPermission")
    private void startBackgroundGpsTracking() {
        try {
            boolean hasFine = ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED;
            boolean hasCoarse = ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_COARSE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED;

            if (!hasFine && !hasCoarse) return;

            locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
            if (locationManager == null) return;

            if (hasFine && locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    4000L,
                    10.0f,
                    backgroundGpsListener,
                    Looper.getMainLooper()
                );
            }
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(
                    LocationManager.NETWORK_PROVIDER,
                    6000L,
                    15.0f,
                    backgroundGpsListener,
                    Looper.getMainLooper()
                );
            }
        } catch (Exception ignored) {}
    }

    private void stopBackgroundGpsTracking() {
        if (locationManager != null) {
            try {
                locationManager.removeUpdates(backgroundGpsListener);
            } catch (Exception ignored) {}
        }
    }

    private void recordBackgroundGpsDeltaKm(double deltaKm) {
        if (deltaKm <= 0) return;
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            double existing = Double.longBitsToDouble(
                prefs.getLong("native_gps_delta_km", Double.doubleToLongBits(0.0))
            );
            if (Double.isNaN(existing) || existing < 0) existing = 0.0;
            double updated = existing + deltaKm;
            prefs.edit().putLong("native_gps_delta_km", Double.doubleToLongBits(updated)).apply();

            Intent gpsIntent = new Intent(ACTION_OVERLAY_GPS_EVENT);
            gpsIntent.setPackage(getPackageName());
            gpsIntent.putExtra("deltaKm", deltaKm);
            sendBroadcast(gpsIntent);
        } catch (Exception ignored) {}
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopAutoRadarProjection();
            stopBackgroundGpsTracking();
            stopForeground(true);
            stopSelf();
            isRunning = false;
            return START_NOT_STICKY;
        }

        if (!canDrawOverlays(this)) {
            stopAutoRadarProjection();
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
            if (ACTION_EXPAND.equals(action)) {
                setExpandedState(true);
            } else if (ACTION_UPDATE_CONFIG.equals(action)) {
                loadConfigFromPrefs();
                recalculateMetrics();
                refreshOverlayUI();
            } else if (ACTION_START_AUTO_RADAR.equals(action)) {
                int resultCode = intent.getIntExtra("resultCode", Activity.RESULT_CANCELED);
                Intent resultData = intent.getParcelableExtra("resultData");
                if (resultData != null) {
                    startAutoRadarProjection(resultCode, resultData);
                }
            } else if (ACTION_STOP_AUTO_RADAR.equals(action)) {
                stopAutoRadarProjection();
                refreshOverlayUI();
            } else if (ACTION_SCAN_SCREEN_NOW.equals(action)) {
                if (isAutoRadarActive && mediaProjection != null) {
                    captureAndAnalyzeScreenFrame(true);
                } else {
                    requestAutoRadarAuthorization();
                }
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

    private void startForegroundSafely(boolean includeMediaProjection) {
        Notification notification = buildForegroundNotification();
        try {
            if (Build.VERSION.SDK_INT >= 34) {
                int fgType = ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE;
                if (includeMediaProjection) {
                    fgType |= ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION;
                }
                boolean hasLoc = ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.ACCESS_FINE_LOCATION
                ) == PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                ) == PackageManager.PERMISSION_GRANTED;
                if (hasLoc) {
                    fgType |= ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION;
                }
                startForeground(NOTIFICATION_ID, notification, fgType);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                int fgType = includeMediaProjection
                    ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
                    : 0;
                if (fgType != 0) {
                    startForeground(NOTIFICATION_ID, notification, fgType);
                } else {
                    startForeground(NOTIFICATION_ID, notification);
                }
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            try {
                startForeground(NOTIFICATION_ID, notification);
            } catch (Exception ignored) {}
        }
    }

    private void startAutoRadarProjection(int resultCode, Intent resultData) {
        try {
            stopAutoRadarProjection();
            // Crucial on Android 14+: upgrade foreground service type BEFORE getMediaProjection
            startForegroundSafely(true);

            MediaProjectionManager mpm = (MediaProjectionManager) getSystemService(
                Context.MEDIA_PROJECTION_SERVICE
            );
            if (mpm == null) return;

            mediaProjection = mpm.getMediaProjection(resultCode, resultData);
            if (mediaProjection == null) return;

            mediaProjection.registerCallback(new MediaProjection.Callback() {
                @Override
                public void onStop() {
                    mainHandler.post(() -> {
                        stopAutoRadarProjection();
                        refreshOverlayUI();
                    });
                }
            }, mainHandler);

            DisplayMetrics dm = getResources().getDisplayMetrics();
            // Scale to ~720p width for ultra-fast on-device OCR (~120ms) and low RAM usage
            int targetWidth = 720;
            float scale = (float) targetWidth / (float) Math.max(720, dm.widthPixels);
            int targetHeight = Math.max(1280, Math.round(dm.heightPixels * scale));
            int densityDpi = Math.max(160, Math.round(dm.densityDpi * scale));

            imageReader = ImageReader.newInstance(
                targetWidth,
                targetHeight,
                PixelFormat.RGBA_8888,
                2
            );

            virtualDisplay = mediaProjection.createVirtualDisplay(
                "DriveWiseAutoRadarDisplay",
                targetWidth,
                targetHeight,
                densityDpi,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                imageReader.getSurface(),
                null,
                mainHandler
            );

            isAutoRadarActive = true;
            refreshOverlayUI();

            mainHandler.removeCallbacks(autoRadarScanRunnable);
            mainHandler.postDelayed(autoRadarScanRunnable, 1200L);
        } catch (Exception e) {
            isAutoRadarActive = false;
            refreshOverlayUI();
        }
    }

    private void stopAutoRadarProjection() {
        isAutoRadarActive = false;
        mainHandler.removeCallbacks(autoRadarScanRunnable);
        if (virtualDisplay != null) {
            try {
                virtualDisplay.release();
            } catch (Exception ignored) {}
            virtualDisplay = null;
        }
        if (imageReader != null) {
            try {
                imageReader.close();
            } catch (Exception ignored) {}
            imageReader = null;
        }
        if (mediaProjection != null) {
            try {
                mediaProjection.stop();
            } catch (Exception ignored) {}
            mediaProjection = null;
        }
    }

    private void requestAutoRadarAuthorization() {
        try {
            setExpandedState(false);
            Intent reqIntent = new Intent(this, MainActivity.class);
            reqIntent.setAction(MainActivity.ACTION_REQUEST_SCREEN_CAPTURE);
            reqIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(reqIntent);
        } catch (Exception ignored) {}
    }

    /**
     * Captures the current screen frame via MediaProjection ImageReader and runs
     * Google ML Kit On-Device Text Recognition to extract Uber / 99 / InDrive ride offers.
     */
    private void captureAndAnalyzeScreenFrame(final boolean manualTrigger) {
        if (isOcrScanInProgress || imageReader == null || textRecognizer == null) {
            return;
        }
        isOcrScanInProgress = true;

        // If manually triggered while expanded card is open, briefly hide our overlay for 90ms
        // so the screenshot captures the clean Uber/99 screen underneath!
        final boolean wasExpanded = expandedCardView != null &&
            expandedCardView.getVisibility() == View.VISIBLE;
        if (manualTrigger && rootContainer != null) {
            rootContainer.setAlpha(0.0f);
        }

        mainHandler.postDelayed(() -> {
            Bitmap capturedBitmap = null;
            Image image = null;
            try {
                image = imageReader != null ? imageReader.acquireLatestImage() : null;
                if (image != null) {
                    Image.Plane[] planes = image.getPlanes();
                    if (planes != null && planes.length > 0) {
                        ByteBuffer buffer = planes[0].getBuffer();
                        int pixelStride = planes[0].getPixelStride();
                        int rowStride = planes[0].getRowStride();
                        int rowPadding = rowStride - pixelStride * image.getWidth();

                        Bitmap fullBmp = Bitmap.createBitmap(
                            image.getWidth() + rowPadding / pixelStride,
                            image.getHeight(),
                            Bitmap.Config.ARGB_8888
                        );
                        fullBmp.copyPixelsFromBuffer(buffer);

                        // Crop out top status bar (top 6%) to focus on the app & offer card
                        int cropY = Math.max(0, (int) (image.getHeight() * 0.06f));
                        int cropH = Math.max(100, image.getHeight() - cropY);
                        capturedBitmap = Bitmap.createBitmap(
                            fullBmp,
                            0,
                            cropY,
                            image.getWidth(),
                            cropH
                        );
                        if (fullBmp != capturedBitmap) {
                            fullBmp.recycle();
                        }
                    }
                }
            } catch (Exception ignored) {
            } finally {
                if (image != null) {
                    try {
                        image.close();
                    } catch (Exception ignored) {}
                }
                if (manualTrigger && rootContainer != null) {
                    rootContainer.setAlpha(1.0f);
                }
            }

            if (capturedBitmap == null) {
                isOcrScanInProgress = false;
                return;
            }

            final Bitmap finalBitmap = capturedBitmap;
            try {
                InputImage inputImage = InputImage.fromBitmap(finalBitmap, 0);
                textRecognizer.process(inputImage)
                    .addOnSuccessListener(visionText -> {
                        try {
                            parseScreenTextForRideOffer(visionText, manualTrigger, wasExpanded);
                        } finally {
                            finalBitmap.recycle();
                            isOcrScanInProgress = false;
                        }
                    })
                    .addOnFailureListener(e -> {
                        finalBitmap.recycle();
                        isOcrScanInProgress = false;
                    });
            } catch (Exception e) {
                finalBitmap.recycle();
                isOcrScanInProgress = false;
            }
        }, manualTrigger ? 95L : 10L);
    }

    /**
     * Parses ML Kit OCR text blocks to identify Uber Driver, 99 Motorista, or InDrive ride offer cards.
     */
    private void parseScreenTextForRideOffer(Text visionText, boolean manualTrigger, boolean wasExpanded) {
        if (visionText == null) return;
        String fullText = visionText.getText();
        if (fullText == null || fullText.trim().isEmpty()) return;

        String lower = fullText.toLowerCase(Locale.ROOT);

        // Ignore screens that are inside DriveWise's own dashboard
        if (!manualTrigger && (lower.contains("drivewise copiloto") ||
            lower.contains("somar no turno") ||
            lower.contains("lucro líquido de hoje"))) {
            return;
        }

        // Check for ride-hail offer card signals (Uber, 99, InDrive)
        boolean hasUberSignal = lower.contains("uber") || lower.contains("uberx") ||
            lower.contains("comfort") || lower.contains("black") ||
            lower.contains("exclusivo") || lower.contains("prioridade");
        boolean has99Signal = lower.contains("99pop") || lower.contains("99plus") ||
            lower.contains("99entrega") || lower.contains("99 moto") ||
            lower.contains("taxa de deslocamento");
        boolean hasIndriveSignal = lower.contains("indrive") || lower.contains("oferecer tarifa") ||
            lower.contains("aceitar por");

        boolean hasOfferCardKeyword = hasUberSignal || has99Signal || hasIndriveSignal ||
            lower.contains("aceitar") || lower.contains("viagem") ||
            lower.contains("corrida") || lower.contains("embarque") ||
            lower.contains("passageiro") || lower.contains("inclui");

        if (!hasOfferCardKeyword && !manualTrigger) {
            return;
        }

        // 1. Extract Fare (R$ XX,XX)
        double detectedGross = 0.0;
        Matcher currencyMatcher = CURRENCY_PATTERN.matcher(fullText);
        while (currencyMatcher.find()) {
            String rawNum = currencyMatcher.group(1);
            if (rawNum != null) {
                try {
                    double val = Double.parseDouble(rawNum.replace(",", "."));
                    // Valid single ride fare range in Brazil: R$ 4.50 to R$ 650.00
                    if (val >= 4.50 && val <= 650.0 && val > detectedGross) {
                        detectedGross = val;
                    }
                } catch (Exception ignored) {}
            }
        }

        if (detectedGross <= 0.0) {
            return;
        }

        // 2. Extract Distances (km) — sums pickup distance + trip distance (up to 2 main distances on card)
        List<Double> kmList = new ArrayList<>();
        Matcher kmMatcher = DISTANCE_KM_PATTERN.matcher(fullText);
        while (kmMatcher.find()) {
            String rawKm = kmMatcher.group(1);
            if (rawKm != null) {
                try {
                    double kmVal = Double.parseDouble(rawKm.replace(",", "."));
                    if (kmVal >= 0.2 && kmVal <= 250.0) {
                        kmList.add(kmVal);
                    }
                } catch (Exception ignored) {}
            }
        }

        double detectedTotalKm = 0.0;
        if (kmList.size() == 1) {
            detectedTotalKm = kmList.get(0);
        } else if (kmList.size() >= 2) {
            // In Uber and 99 offer cards, the 2 primary km numbers are Pickup KM + Trip KM
            detectedTotalKm = kmList.get(0) + kmList.get(1);
        }

        if (detectedTotalKm <= 0.0 && !manualTrigger) {
            // Require both R$ and KM for automatic popup so random R$ text doesn't trigger false positives
            return;
        }
        if (detectedTotalKm <= 0.0) {
            detectedTotalKm = currentDistanceKm > 0 ? currentDistanceKm : 5.0;
        }

        // 3. Extract Durations (min) — sums pickup min + trip min (up to 2 main durations on card)
        List<Integer> minList = new ArrayList<>();
        Matcher minMatcher = DURATION_MIN_PATTERN.matcher(fullText);
        while (minMatcher.find()) {
            String rawMin = minMatcher.group(1);
            if (rawMin != null) {
                try {
                    int mVal = Integer.parseInt(rawMin);
                    if (mVal >= 1 && mVal <= 240) {
                        minList.add(mVal);
                    }
                } catch (Exception ignored) {}
            }
        }

        int detectedTotalMin = 0;
        if (minList.size() == 1) {
            detectedTotalMin = minList.get(0);
        } else if (minList.size() >= 2) {
            detectedTotalMin = minList.get(0) + minList.get(1);
        }
        if (detectedTotalMin <= 0) {
            detectedTotalMin = Math.max(5, (int) Math.round(detectedTotalKm * 2.2));
        }

        // 4. Identify Platform
        String detectedPlatform = selectedPlatform;
        if (has99Signal) {
            detectedPlatform = "99";
        } else if (hasIndriveSignal) {
            detectedPlatform = "InDrive";
        } else if (hasUberSignal) {
            detectedPlatform = "Uber";
        }

        // 5. Deduplicate so the same offer card on screen doesn't spam voice alerts
        String signature = String.format(
            Locale.ROOT,
            "%s|%.2f|%.1f|%d",
            detectedPlatform,
            detectedGross,
            detectedTotalKm,
            detectedTotalMin
        );
        long now = System.currentTimeMillis();
        if (!manualTrigger &&
            signature.equals(lastDetectedOfferSignature) &&
            (now - lastDetectedOfferTimestamp) < 18000L) {
            return;
        }

        lastDetectedOfferSignature = signature;
        lastDetectedOfferTimestamp = now;

        // 6. Apply detected ride offer to the Overlay HUD and announce Traffic Light Verdict!
        selectedPlatform = detectedPlatform;
        currentGross = detectedGross;
        currentDistanceKm = Math.round(detectedTotalKm * 10.0) / 10.0;
        currentDurationMin = detectedTotalMin;
        rawInputBuffer = "";

        recalculateMetrics();
        setExpandedState(true);

        // Speak voice verdict in Portuguese
        String voiceColor = "EXCELENTE".equals(computedTier)
            ? "Corrida Verde"
            : ("ATENÇÃO".equals(computedTier) ? "Corrida Amarela" : "Corrida Vermelha, não compensa");
        String speech = String.format(
            Locale.forLanguageTag("pt-BR"),
            "%s na %s. Lucro líquido %.2f reais. %.2f por quilômetro.",
            voiceColor,
            selectedPlatform,
            computedNetProfit,
            computedNetPerKm
        );
        speakVerdictInPortuguese(speech);
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
        windowParams.x = Math.max(dp(10), dm.widthPixels - dp(210));
        windowParams.y = dp(130);

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
        collapsedPillView.setPadding(dp(11), dp(7), dp(10), dp(7));
        collapsedPillView.setBackground(
            roundedBox(Color.parseColor("#090C12"), Color.parseColor("#10B981"), 2, 28)
        );

        // Status indicator dot
        pillStatusDot = new View(this);
        LinearLayout.LayoutParams dotLp = new LinearLayout.LayoutParams(dp(9), dp(9));
        dotLp.rightMargin = dp(7);
        pillStatusDot.setLayoutParams(dotLp);
        pillStatusDot.setBackground(roundedBox(Color.parseColor("#10B981"), Color.TRANSPARENT, 0, 10));
        collapsedPillView.addView(pillStatusDot);

        // Text column
        LinearLayout textCol = new LinearLayout(this);
        textCol.setOrientation(LinearLayout.VERTICAL);

        pillMainText = new TextView(this);
        pillMainText.setText("⚡ DriveWise");
        pillMainText.setTextColor(Color.WHITE);
        pillMainText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        pillMainText.setTypeface(Typeface.DEFAULT_BOLD);
        textCol.addView(pillMainText);

        pillSubText = new TextView(this);
        pillSubText.setText("Toque p/ abrir HUD");
        pillSubText.setTextColor(Color.parseColor("#34D399"));
        pillSubText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 9);
        pillSubText.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        textCol.addView(pillSubText);

        collapsedPillView.addView(textCol);

        // Quick 1-Tap Radar / OCR Screen Scan Badge on the Floating Pill
        pillRadarActionBtn = new TextView(this);
        pillRadarActionBtn.setText("📡 Auto");
        pillRadarActionBtn.setTextColor(Color.WHITE);
        pillRadarActionBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10);
        pillRadarActionBtn.setTypeface(Typeface.DEFAULT_BOLD);
        pillRadarActionBtn.setPadding(dp(8), dp(5), dp(8), dp(5));
        pillRadarActionBtn.setBackground(
            roundedBox(Color.parseColor("#065F46"), Color.parseColor("#10B981"), 1, 16)
        );
        LinearLayout.LayoutParams radarBtnLp = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        radarBtnLp.leftMargin = dp(8);
        pillRadarActionBtn.setOnClickListener(v -> {
            if (isAutoRadarActive && mediaProjection != null) {
                captureAndAnalyzeScreenFrame(true);
            } else {
                requestAutoRadarAuthorization();
            }
        });
        collapsedPillView.addView(pillRadarActionBtn, radarBtnLp);

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

        // 1. TOP HEADER BAR (Drag Handle + Title + Auto Radar / Open App / Minimize)
        LinearLayout headerRow = new LinearLayout(this);
        headerRow.setOrientation(LinearLayout.HORIZONTAL);
        headerRow.setGravity(Gravity.CENTER_VERTICAL);
        headerRow.setPadding(0, 0, 0, dp(8));

        TextView headerTitle = new TextView(this);
        headerTitle.setText("⚡ DRIVEWISE HUD");
        headerTitle.setTextColor(Color.WHITE);
        headerTitle.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
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

        // Auto-Radar / Instant Screen OCR button inside expanded HUD
        headerRadarBtn = new TextView(this);
        headerRadarBtn.setText("📡 Ativar Radar");
        headerRadarBtn.setTextColor(Color.WHITE);
        headerRadarBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10);
        headerRadarBtn.setTypeface(Typeface.DEFAULT_BOLD);
        headerRadarBtn.setPadding(dp(8), dp(4), dp(8), dp(4));
        headerRadarBtn.setBackground(
            roundedBox(Color.parseColor("#065F46"), Color.parseColor("#10B981"), 1, 8)
        );
        LinearLayout.LayoutParams hRadarLp = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        hRadarLp.rightMargin = dp(5);
        headerRadarBtn.setOnClickListener(v -> {
            if (isAutoRadarActive && mediaProjection != null) {
                captureAndAnalyzeScreenFrame(true);
            } else {
                requestAutoRadarAuthorization();
            }
        });
        headerRow.addView(headerRadarBtn, hRadarLp);

        // Open Main App button (discrete)
        TextView openAppBtn = new TextView(this);
        openAppBtn.setText("App ↗");
        openAppBtn.setTextColor(Color.parseColor("#94A3B8"));
        openAppBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10);
        openAppBtn.setTypeface(Typeface.DEFAULT_BOLD);
        openAppBtn.setPadding(dp(7), dp(4), dp(7), dp(4));
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
        minimizeBtn.setPadding(dp(9), dp(4), dp(9), dp(4));
        minimizeBtn.setBackground(roundedBox(Color.parseColor("#1E293B"), Color.parseColor("#475569"), 1, 8));
        LinearLayout.LayoutParams minLp = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        minLp.leftMargin = dp(5);
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

        // 5. FAST COMPACT TOUCH KEYPAD (for instant manual adjustment or entry over Uber/99)
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

        // 6. PRE-ACCEPTANCE DECISION BUTTONS (✕ RECUSAR | ✓ EM ROTA | ✓ SOMAR NO DIA)
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
        acceptInRouteBtn.setTextColor(Color.parseColor("#7DD3FC"));
        acceptInRouteBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        acceptInRouteBtn.setTypeface(Typeface.DEFAULT_BOLD);
        acceptInRouteBtn.setPadding(dp(6), dp(10), dp(6), dp(10));
        acceptInRouteBtn.setBackground(roundedBox(Color.parseColor("#082F49"), Color.parseColor("#38BDF8"), 1, 10));
        acceptInRouteBtn.setOnClickListener(v -> {
            if (currentGross <= 0) return;
            isRideInRoute = true;
            refreshOverlayUI();
            setExpandedState(false);
        });

        TextView completeDirectBtn = new TextView(this);
        completeDirectBtn.setText("✓ Somar no Dia");
        completeDirectBtn.setGravity(Gravity.CENTER);
        completeDirectBtn.setTextColor(Color.parseColor("#050608"));
        completeDirectBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        completeDirectBtn.setTypeface(Typeface.DEFAULT_BOLD);
        completeDirectBtn.setPadding(dp(6), dp(10), dp(6), dp(10));
        completeDirectBtn.setBackground(roundedBox(Color.parseColor("#10B981"), Color.parseColor("#34D399"), 1, 10));
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

        LinearLayout.LayoutParams bLp1 = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        bLp1.rightMargin = dp(4);
        LinearLayout.LayoutParams bLp2 = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        bLp2.rightMargin = dp(4);
        LinearLayout.LayoutParams bLp3 = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.25f);

        preAcceptButtonsRow.addView(rejectBtn, bLp1);
        preAcceptButtonsRow.addView(acceptInRouteBtn, bLp2);
        preAcceptButtonsRow.addView(completeDirectBtn, bLp3);
        expandedCardView.addView(preAcceptButtonsRow);

        // 7. IN-ROUTE SECTION (Shown when a ride is currently active/in progress)
        inRouteSection = new LinearLayout(this);
        inRouteSection.setOrientation(LinearLayout.VERTICAL);
        inRouteSection.setPadding(0, dp(4), 0, 0);
        inRouteSection.setVisibility(View.GONE);

        inRouteSummaryText = new TextView(this);
        inRouteSummaryText.setTextColor(Color.parseColor("#94A3B8"));
        inRouteSummaryText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        inRouteSummaryText.setPadding(0, 0, 0, dp(8));
        inRouteSection.addView(inRouteSummaryText);

        LinearLayout inRouteBtnRow = new LinearLayout(this);
        inRouteBtnRow.setOrientation(LinearLayout.HORIZONTAL);

        TextView cancelRouteBtn = new TextView(this);
        cancelRouteBtn.setText("Cancelar");
        cancelRouteBtn.setGravity(Gravity.CENTER);
        cancelRouteBtn.setTextColor(Color.parseColor("#FDA4AF"));
        cancelRouteBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        cancelRouteBtn.setTypeface(Typeface.DEFAULT_BOLD);
        cancelRouteBtn.setPadding(dp(8), dp(11), dp(8), dp(11));
        cancelRouteBtn.setBackground(roundedBox(Color.parseColor("#4C0519"), Color.parseColor("#F43F5E"), 1, 10));
        cancelRouteBtn.setOnClickListener(v -> {
            isRideInRoute = false;
            resetRideCalculator();
            setExpandedState(false);
        });

        TextView finishRideBtn = new TextView(this);
        finishRideBtn.setText("✓ Concluir Corrida (Somar no Turno)");
        finishRideBtn.setGravity(Gravity.CENTER);
        finishRideBtn.setTextColor(Color.parseColor("#050608"));
        finishRideBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        finishRideBtn.setTypeface(Typeface.DEFAULT_BOLD);
        finishRideBtn.setPadding(dp(10), dp(11), dp(10), dp(11));
        finishRideBtn.setBackground(roundedBox(Color.parseColor("#10B981"), Color.parseColor("#34D399"), 1, 10));
        finishRideBtn.setOnClickListener(v -> {
            if (currentGross > 0) {
                appendPendingRideEvent(
                    FloatingOverlayService.this,
                    "completed",
                    selectedPlatform,
                    currentGross,
                    currentDistanceKm,
                    currentDurationMin
                );
            }
            isRideInRoute = false;
            resetRideCalculator();
            setExpandedState(false);
        });

        LinearLayout.LayoutParams irLp1 = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 0.8f);
        irLp1.rightMargin = dp(6);
        LinearLayout.LayoutParams irLp2 = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.8f);

        inRouteBtnRow.addView(cancelRouteBtn, irLp1);
        inRouteBtnRow.addView(finishRideBtn, irLp2);
        inRouteSection.addView(inRouteBtnRow);

        expandedCardView.addView(inRouteSection);
    }

    private TextView createPlatformTab(final String platformName) {
        TextView tab = new TextView(this);
        tab.setText(platformName.toUpperCase(Locale.ROOT));
        tab.setGravity(Gravity.CENTER);
        tab.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        tab.setTypeface(Typeface.DEFAULT_BOLD);
        tab.setPadding(0, dp(6), 0, dp(6));
        tab.setOnClickListener(v -> {
            selectedPlatform = platformName;
            refreshOverlayUI();
        });
        return tab;
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
        valueTv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        valueTv.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        valueTv.setPadding(0, dp(2), 0, 0);
        box.addView(valueTv);

        box.setOnClickListener(v -> {
            activeInputField = fieldIndex;
            rawInputBuffer = "";
            refreshOverlayUI();
        });
        return box;
    }

    private void handleKeypadPress(String key) {
        if ("C".equals(key)) {
            rawInputBuffer = "";
            if (activeInputField == 0) currentGross = 0.0;
            else if (activeInputField == 1) currentDistanceKm = 1.0;
            else currentDurationMin = 5;
        } else if ("⌫".equals(key)) {
            if (rawInputBuffer.length() > 0) {
                rawInputBuffer = rawInputBuffer.substring(0, rawInputBuffer.length() - 1);
                applyRawBufferToActiveField();
            } else {
                if (activeInputField == 0) currentGross = 0.0;
            }
        } else if ("-1".equals(key) || "+1".equals(key) || "+5".equals(key)) {
            int delta = "-1".equals(key) ? -1 : ("+1".equals(key) ? 1 : 5);
            rawInputBuffer = "";
            if (activeInputField == 0) {
                currentGross = Math.max(0.0, currentGross + delta);
            } else if (activeInputField == 1) {
                currentDistanceKm = Math.max(0.5, currentDistanceKm + delta);
            } else {
                currentDurationMin = Math.max(1, currentDurationMin + delta);
            }
        } else {
            String normalizedKey = ",".equals(key) ? "." : key;
            if (".".equals(normalizedKey) && rawInputBuffer.contains(".")) {
                return;
            }
            if (rawInputBuffer.length() < 7) {
                if (".".equals(normalizedKey) && rawInputBuffer.isEmpty()) {
                    rawInputBuffer = "0.";
                } else {
                    rawInputBuffer += normalizedKey;
                }
                applyRawBufferToActiveField();
            }
        }

        recalculateMetrics();
        refreshOverlayUI();
    }

    private void applyRawBufferToActiveField() {
        if (rawInputBuffer.isEmpty()) {
            if (activeInputField == 0) currentGross = 0.0;
            return;
        }
        try {
            double parsed = Double.parseDouble(rawInputBuffer);
            if (activeInputField == 0) {
                currentGross = Math.max(0.0, parsed);
            } else if (activeInputField == 1) {
                currentDistanceKm = Math.max(0.5, parsed);
            } else {
                currentDurationMin = Math.max(1, (int) Math.round(parsed));
            }
        } catch (NumberFormatException ignored) {}
    }

    private void resetRideCalculator() {
        currentGross = 0.0;
        rawInputBuffer = "";
        activeInputField = 0;
        recalculateMetrics();
        refreshOverlayUI();
    }

    private void setExpandedState(boolean expanded) {
        if (collapsedPillView == null || expandedCardView == null) return;
        if (expanded) {
            collapsedPillView.setVisibility(View.GONE);
            expandedCardView.setVisibility(View.VISIBLE);
            DisplayMetrics dm = getResources().getDisplayMetrics();
            int cardWidthPx = Math.min(dp(336), dm.widthPixels - dp(20));
            windowParams.x = Math.max(dp(10), (dm.widthPixels - cardWidthPx) / 2);
            windowParams.y = Math.max(dp(48), Math.min(windowParams.y, dm.heightPixels - dp(440)));
        } else {
            expandedCardView.setVisibility(View.GONE);
            collapsedPillView.setVisibility(View.VISIBLE);
        }
        refreshOverlayUI();
        if (windowManager != null && rootContainer != null) {
            try {
                windowManager.updateViewLayout(rootContainer, windowParams);
            } catch (Exception ignored) {}
        }
    }

    private void recalculateMetrics() {
        loadConfigFromPrefs();
        double safeKm = Math.max(0.5, currentDistanceKm);
        int safeMin = Math.max(1, currentDurationMin);

        computedCost = safeKm * driverCostPerKm;
        computedNetProfit = currentGross - computedCost;
        computedGrossPerKm = currentGross / safeKm;
        computedNetPerKm = computedNetProfit / safeKm;
        computedNetPerHour = (computedNetProfit / (double) safeMin) * 60.0;

        if (currentGross <= 0.0) {
            computedScore = 0;
            computedTier = "AGUARDANDO";
            return;
        }

        double ratio = computedNetPerKm / Math.max(0.50, driverMinNetPerKm);
        int rawScore = (int) Math.round(ratio * 70.0);
        computedScore = Math.max(5, Math.min(100, rawScore));

        if (computedNetProfit <= 0 || computedNetPerKm < driverMinNetPerKm * 0.78) {
            computedTier = "RUIM";
        } else if (computedNetPerKm >= driverMinNetPerKm) {
            computedTier = "EXCELENTE";
        } else {
            computedTier = "ATENÇÃO";
        }
    }

    private void refreshOverlayUI() {
        if (collapsedPillView == null || expandedCardView == null) return;

        // 0. Update Radar Auto buttons on Pill and Header
        if (pillRadarActionBtn != null) {
            if (isAutoRadarActive) {
                pillRadarActionBtn.setText("📷 Ler");
                pillRadarActionBtn.setBackground(
                    roundedBox(Color.parseColor("#065F46"), Color.parseColor("#34D399"), 1, 16)
                );
            } else {
                pillRadarActionBtn.setText("📡 Auto");
                pillRadarActionBtn.setBackground(
                    roundedBox(Color.parseColor("#1E293B"), Color.parseColor("#38BDF8"), 1, 16)
                );
            }
        }
        if (headerRadarBtn != null) {
            if (isAutoRadarActive) {
                headerRadarBtn.setText("📷 Ler Tela (Radar ON)");
                headerRadarBtn.setBackground(
                    roundedBox(Color.parseColor("#065F46"), Color.parseColor("#34D399"), 1, 8)
                );
            } else {
                headerRadarBtn.setText("📡 Ativar Radar Auto");
                headerRadarBtn.setBackground(
                    roundedBox(Color.parseColor("#082F49"), Color.parseColor("#38BDF8"), 1, 8)
                );
            }
        }

        // 1. Update Platform Tabs
        updatePlatformTabStyle(platformUberBtn, "Uber".equalsIgnoreCase(selectedPlatform), "#10B981");
        updatePlatformTabStyle(platform99Btn, "99".equalsIgnoreCase(selectedPlatform), "#F59E0B");
        updatePlatformTabStyle(platformIndriveBtn, "InDrive".equalsIgnoreCase(selectedPlatform), "#38BDF8");

        // 2. Update Metric Input Boxes highlight
        grossInputBox.setBackground(
            roundedBox(
                activeInputField == 0 ? Color.parseColor("#132A23") : Color.parseColor("#141923"),
                activeInputField == 0 ? Color.parseColor("#10B981") : Color.parseColor("#263042"),
                activeInputField == 0 ? 2 : 1,
                10
            )
        );
        distInputBox.setBackground(
            roundedBox(
                activeInputField == 1 ? Color.parseColor("#132A23") : Color.parseColor("#141923"),
                activeInputField == 1 ? Color.parseColor("#10B981") : Color.parseColor("#263042"),
                activeInputField == 1 ? 2 : 1,
                10
            )
        );
        timeInputBox.setBackground(
            roundedBox(
                activeInputField == 2 ? Color.parseColor("#132A23") : Color.parseColor("#141923"),
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
            pillSubText.setText(isAutoRadarActive ? "📡 Radar Auto Ativo" : "Calcular / Radar");
            pillSubText.setTextColor(Color.parseColor("#34D399"));

            verdictContainer.setBackground(
                roundedBox(Color.parseColor("#111622"), Color.parseColor("#334155"), 1, 12)
            );
            verdictTitleText.setText(
                String.format(
                    Locale.forLanguageTag("pt-BR"),
                    isAutoRadarActive
                        ? "📡 RADAR ATIVO — TOQUE 'LER TELA' OU DIGITE (Custo: R$ %.2f/km)"
                        : "ATIVE O RADAR AUTO OU DIGITE O VALOR (Custo: R$ %.2f/km)",
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
            verdictTitleText.setText(trafficLabel);
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

    /**
     * Records a ride action (completed, accepted, rejected) into SharedPreferences queue
     * AND broadcasts an Intent so MainActivity/React syncs it to the active shift immediately.
     */
    public static void appendPendingRideEvent(
        Context context,
        String action,
        String platform,
        double grossValue,
        double distanceKm,
        int durationMin
    ) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String existingJson = prefs.getString("pending_rides_queue", "[]");
            JSONArray queue = new JSONArray(existingJson);

            JSONObject item = new JSONObject();
            item.put("action", action);
            item.put("platform", platform);
            item.put("grossValue", grossValue);
            item.put("distanceKm", distanceKm);
            item.put("durationMin", durationMin);
            item.put("timestamp", System.currentTimeMillis());
            queue.put(item);

            prefs.edit().putString("pending_rides_queue", queue.toString()).apply();

            Intent broadcast = new Intent(ACTION_OVERLAY_RIDE_EVENT);
            broadcast.setPackage(context.getPackageName());
            context.sendBroadcast(broadcast);
        } catch (Exception ignored) {}
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "DriveWise Copiloto Flutuante",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Mantém a bolha flutuante e o Radar Auto ativos sobre Uber e 99");
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

        Intent scanIntent = new Intent(this, FloatingOverlayService.class);
        scanIntent.setAction(ACTION_SCAN_SCREEN_NOW);
        PendingIntent scanPi = PendingIntent.getService(this, 303, scanIntent, flags);

        Intent stopIntent = new Intent(this, FloatingOverlayService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent stopPi = PendingIntent.getService(this, 302, stopIntent, flags);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(
                isAutoRadarActive
                    ? "📡 DriveWise • Radar Automático Ativo"
                    : "⚡ Copiloto DriveWise Ativo"
            )
            .setContentText(
                isAutoRadarActive
                    ? "Lendo chamadas da Uber, 99 e InDrive em tempo real"
                    : "Bolha flutuante pronta sobre Uber, 99 e InDrive"
            )
            .setContentIntent(expandPi)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .addAction(android.R.drawable.ic_menu_camera, "Ler Tela", scanPi)
            .addAction(android.R.drawable.ic_menu_view, "Abrir HUD", expandPi)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Desativar", stopPi)
            .build();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        isRunning = false;
        stopAutoRadarProjection();
        stopBackgroundGpsTracking();
        if (textRecognizer != null) {
            try {
                textRecognizer.close();
            } catch (Exception ignored) {}
            textRecognizer = null;
        }
        if (tts != null) {
            try {
                tts.stop();
                tts.shutdown();
            } catch (Exception ignored) {}
            tts = null;
        }
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
