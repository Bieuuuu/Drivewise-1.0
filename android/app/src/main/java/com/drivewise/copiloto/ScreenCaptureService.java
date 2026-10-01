package com.drivewise.copiloto;

import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.Image;
import android.media.ImageReader;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.DisplayMetrics;
import android.util.Log;

import androidx.annotation.Nullable;

import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * DriveWiseScreenCaptureService — Play-Protect-safe "Zero-Toque" screen reader.
 *
 * WHY THIS EXISTS:
 * The original automatic reading of Uber/99 offer cards used AccessibilityService
 * (BIND_ACCESSIBILITY_SERVICE). That permission hard-blocks sideloaded APK installs in
 * Brazil via Google Play Protect "Enhanced Fraud Protection". This service achieves the
 * SAME product outcome (automatic R$ / km / min extraction from the driver app screen)
 * using ONLY MediaProjection + on-device ML Kit OCR, neither of which is in the blocked
 * permission list.
 *
 * HOW IT WORKS:
 * 1. MainActivity asks the user for one-time screen-capture consent per turn
 *    (MediaProjectionManager.createScreenCaptureIntent()) — standard Android dialog.
 * 2. On consent, this foreground service creates a VirtualDisplay fed by MediaProjection
 *    and an ImageReader that receives full-screen frames.
 * 3. Every FRAME_INTERVAL_MS we grab the latest frame, convert it to Bitmap and run
 *    ML Kit Text Recognition v2 (fully offline, bundled model, ~150ms/frame).
 * 4. Recognized text lines are parsed by ScreenOfferAnalyzer (pure Java, unit tested).
 *    A reading must be stable across STABLE_REQUIRED consecutive frames before being
 *    trusted (anti-flicker heuristic).
 * 5. When a valid offer reading lands, FloatingOverlayService.appendPendingRideEvent(
 *    "received", ...) is called so the HUD opens with the numbers ALREADY FILLED IN —
 *    the driver only taps Aceitar / Recusar. Zero typing.
 *
 * The service also exposes the last reading through readLastReadingJson() so the React
 * layer can display "Leitura automática da tela" status.
 */
public class ScreenCaptureService extends android.app.Service {

    private static final String TAG = "DW-ScreenCapture";

    public static final String CHANNEL_ID = "drivewise_screen_capture_channel";
    public static final int NOTIFICATION_ID = 4103;

    public static final String ACTION_START_WITH_RESULT =
        "com.drivewise.copiloto.ACTION_START_SCREEN_CAPTURE";
    public static final String ACTION_STOP = "com.drivewise.copiloto.ACTION_STOP_SCREEN_CAPTURE";
    public static final String EXTRA_RESULT_CODE = "projection_result_code";
    public static final String EXTRA_RESULT_DATA = "projection_result_data";

    /** Throttle between OCR frames. Offers stay on screen 10-15s, 2.5s is plenty. */
    private static final long FRAME_INTERVAL_MS = 2500L;
    /** Consecutive identical readings required before trusting the offer. */
    private static final int STABLE_REQUIRED = 2;

    public static volatile boolean isCapturing = false;
    private static volatile String lastReadingJson = "";

    /** Shared with MainActivity/overlay so each keeps only the most recent reading. */
    private static final Object EMIT_LOCK = new Object();
    private static long lastEmittedAt = 0L;
    private static double lastEmittedGross = -1.0;
    private static double lastEmittedKm = -1.0;

    private MediaProjection mediaProjection;
    private MediaProjectionManager projectionManager;
    private VirtualDisplay virtualDisplay;
    private ImageReader imageReader;
    private TextRecognizer recognizer;
    private Handler handler;
    private Runnable frameLoop;

    private int screenWidthPx = 0;
    private int screenHeightPx = 0;
    private int screenDensityDpi = 0;

    @Nullable
    private ScreenOfferAnalyzer.OfferReading lastStableReading = null;
    private int stableStreak = 0;
    private boolean ocrBusy = false;

    public static String readLastReadingJson() {
        return lastReadingJson;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        handler = new Handler(Looper.getMainLooper());
        recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
    }

    @Override
    public int onStartCommand(@Nullable Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            teardown();
            stopSelf();
            return START_NOT_STICKY;
        }

        // Already capturing → nothing to do (consent is per-turn).
        if (isCapturing && mediaProjection != null) return START_STICKY;

        if (intent == null) return START_NOT_STICKY;

        int resultCode = intent.getIntExtra(EXTRA_RESULT_CODE, 0);
        Intent resultData = Build.VERSION.SDK_INT >= 33
            ? intent.getParcelableExtra(EXTRA_RESULT_DATA, Intent.class)
            : intent.getParcelableExtra(EXTRA_RESULT_DATA);

        if (resultCode == 0 || resultData == null) {
            Log.w(TAG, "No valid MediaProjection consent data");
            stopSelf();
            return START_NOT_STICKY;
        }

        startForegroundCompat();

        try {
            projectionManager = (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);
            mediaProjection = projectionManager.getMediaProjection(resultCode, resultData);
        } catch (Exception e) {
            Log.e(TAG, "getMediaProjection failed", e);
            stopSelf();
            return START_NOT_STICKY;
        }
        if (mediaProjection == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        DisplayMetrics dm = getResources().getDisplayMetrics();
        screenWidthPx = dm.widthPixels;
        screenHeightPx = dm.heightPixels;
        screenDensityDpi = dm.densityDpi;

        imageReader = ImageReader.newInstance(
            screenWidthPx, screenHeightPx, android.graphics.PixelFormat.RGBA_8888, 2
        );
        virtualDisplay = mediaProjection.createVirtualDisplay(
            "DriveWiseHudCapture",
            screenWidthPx, screenHeightPx, screenDensityDpi,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            imageReader.getSurface(), null, handler
        );

        frameLoop = new Runnable() {
            @Override
            public void run() {
                grabAndRecognize();
                handler.postDelayed(this, FRAME_INTERVAL_MS);
            }
        };
        handler.postDelayed(frameLoop, 600L);

        isCapturing = true;
        return START_STICKY;
    }

    private void grabAndRecognize() {
        if (ocrBusy || imageReader == null) return;
        Bitmap frame = null;
        try {
            Image img = imageReader.acquireLatestImage();
            if (img == null) return;
            try {
                frame = bitmapFromImage(img);
            } finally {
                img.close();
            }
        } catch (Exception e) {
            return; // transient frame issues are fine, next tick retries
        }
        if (frame == null) return;

        ocrBusy = true;
        final InputImage input = InputImage.fromBitmap(frame, 0);
        recognizer.process(input)
            .addOnSuccessListener(text -> {
                ocrBusy = false;
                handleOcrText(text);
            })
            .addOnFailureListener(e -> ocrBusy = false)
            .addOnCompleteListener(t -> frame.recycle());
    }

    private void handleOcrText(Text text) {
        List<ScreenOfferAnalyzer.TextBlock> blocks = new ArrayList<>();
        for (Text.TextBlock tb : text.getTextBlocks()) {
            for (Text.Line line : tb.getLines()) {
                String l = line.getText();
                if (l == null || l.trim().isEmpty()) continue;
                int left = line.getBoundingBox() != null ? line.getBoundingBox().left : 0;
                int top = line.getBoundingBox() != null ? line.getBoundingBox().top : 0;
                blocks.add(new ScreenOfferAnalyzer.TextBlock(l, left, top));
            }
        }

        ScreenOfferAnalyzer.OfferReading fresh = ScreenOfferAnalyzer.analyze(blocks);
        int[] streakHolder = new int[] { stableStreak };
        lastStableReading = ScreenOfferAnalyzer.stabilize(lastStableReading, fresh, streakHolder);
        stableStreak = streakHolder[0];

        lastReadingJson = lastStableReading != null ? lastStableReading.toJson().toString() : "";

        // Offer detected & stable → push into the HUD as a real "received" event so the
        // expanded card opens pre-filled. Driver then only decides Aceitar/Recusar.
        if (lastStableReading != null && lastStableReading.valid && stableStreak >= STABLE_REQUIRED) {
            final ScreenOfferAnalyzer.OfferReading offer = lastStableReading;

            boolean shouldEmit;
            synchronized (EMIT_LOCK) {
                long now = System.currentTimeMillis();
                boolean sameOffer =
                    Math.abs(lastEmittedGross - offer.grossValue) < 0.01 &&
                    Math.abs(lastEmittedKm - offer.totalKm) < 0.6 &&
                    (now - lastEmittedAt) < 25_000L;
                shouldEmit = !sameOffer;
                if (shouldEmit) {
                    lastEmittedAt = now;
                    lastEmittedGross = offer.grossValue;
                    lastEmittedKm = offer.totalKm;
                }
            }

            if (shouldEmit) {
                FloatingOverlayService.lastAutoReadingJson = offer.toJson().toString();
                FloatingOverlayService.lastAutoReadingAt = System.currentTimeMillis();

                if (FloatingOverlayService.isRunning) {
                    Intent fill = new Intent(this, FloatingOverlayService.class);
                    fill.setAction(FloatingOverlayService.ACTION_UPDATE_DATA);
                    fill.putExtra("platform", offer.platform);
                    fill.putExtra("grossValue", offer.grossValue);
                    fill.putExtra("distanceKm", offer.totalKm);
                    fill.putExtra("durationMin", offer.durationMin);
                    fill.putExtra("expand", true);
                    try {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            startForegroundService(fill);
                        } else {
                            startService(fill);
                        }
                    } catch (Exception ignored) {}
                }
                FloatingOverlayService.appendPendingRideEvent(
                    this,
                    "received",
                    offer.platform,
                    offer.grossValue,
                    offer.totalKm,
                    offer.durationMin,
                    true
                );
            }

            // Keep the stable reading cached; reset streak so we only re-emit when the
            // numbers actually change to a NEW offer.
            stableStreak = 0;
        }
    }

    /** Convert RGBA_8888 Image (with row padding) into a Bitmap. */
    private Bitmap bitmapFromImage(Image image) {
        ByteBuffer planes = image.getPlanes()[0].getBuffer();
        int pixelStride = image.getPlanes()[0].getPixelStride();
        int rowStride = image.getPlanes()[0].getRowStride();
        int rowPadding = rowStride - pixelStride * image.getWidth();

        Bitmap bmp = Bitmap.createBitmap(
            image.getWidth() + rowPadding / pixelStride,
            image.getHeight(),
            Bitmap.Config.ARGB_8888
        );
        bmp.copyPixelsFromBuffer(planes);

        if (rowPadding != 0) {
            Bitmap cropped = Bitmap.createBitmap(bmp, 0, 0, image.getWidth(), image.getHeight());
            if (cropped != bmp) bmp.recycle();
            return cropped;
        }
        return bmp;
    }

    private void startForegroundCompat() {
        try {
            android.app.NotificationChannel channel = new android.app.NotificationChannel(
                CHANNEL_ID, "Leitura de Tela DriveWise", android.app.NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Lê automaticamente os cards de corrida da Uber/99 via OCR local");
            android.app.NotificationManager nm = getSystemService(android.app.NotificationManager.class);
            if (nm != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                nm.createNotificationChannel(channel);
            }

            int flags = android.app.PendingIntent.FLAG_UPDATE_CURRENT |
                (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                    ? android.app.PendingIntent.FLAG_IMMUTABLE : 0);
            Intent stopIntent = new Intent(this, ScreenCaptureService.class);
            stopIntent.setAction(ACTION_STOP);
            android.app.PendingIntent stopPi =
                android.app.PendingIntent.getService(this, 305, stopIntent, flags);

            android.app.Notification notification =
                new androidx.core.app.NotificationCompat.Builder(this, CHANNEL_ID)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle("📷 Leitura Automática Ativa")
                    .setContentText("Copiloto lendo ofertas da tela via OCR no aparelho")
                    .setOngoing(true)
                    .setPriority(androidx.core.app.NotificationCompat.PRIORITY_LOW)
                    .addAction(
                        android.R.drawable.ic_menu_close_clear_cancel,
                        "Parar Leitura",
                        stopPi
                    )
                    .build();

            if (Build.VERSION.SDK_INT >= 34) {
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
                );
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            Log.e(TAG, "startForeground failed", e);
        }
    }

    private void teardown() {
        isCapturing = false;
        try {
            if (handler != null && frameLoop != null) handler.removeCallbacks(frameLoop);
        } catch (Exception ignored) {}
        try {
            if (virtualDisplay != null) virtualDisplay.release();
        } catch (Exception ignored) {}
        try {
            if (imageReader != null) imageReader.close();
        } catch (Exception ignored) {}
        try {
            if (mediaProjection != null) mediaProjection.stop();
        } catch (Exception ignored) {}
        virtualDisplay = null;
        imageReader = null;
        mediaProjection = null;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        teardown();
        try {
            if (recognizer != null) recognizer.close();
        } catch (Exception ignored) {}
    }

    @Nullable
    @Override
    public android.os.IBinder onBind(Intent intent) {
        return null;
    }
}
