package com.drivewise.copiloto;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
import android.text.TextUtils;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Native Android Accessibility Service that reads incoming ride cards on Uber Driver,
 * 99 Motorista, and InDrive, and immediately triggers the FloatingOverlayService HUD.
 */
public class DriveWiseAccessibilityService extends AccessibilityService {

    public static volatile boolean isServiceRunning = false;
    public static final String ACTION_RIDE_DETECTED = "com.drivewise.copiloto.ACTION_RIDE_DETECTED";

    private static final Pattern VALUE_PATTERN = Pattern.compile(
        "R\\$\\s*([0-9]{1,4}[.,][0-9]{2})"
    );
    private static final Pattern KM_PATTERN = Pattern.compile(
        "([0-9]{1,3}(?:[.,][0-9]{1,2})?)\\s*km",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern MIN_PATTERN = Pattern.compile(
        "([0-9]{1,3})\\s*min",
        Pattern.CASE_INSENSITIVE
    );

    private long lastDetectionTimestamp = 0L;
    private double lastDetectedGross = 0.0;
    private double lastDetectedKm = 0.0;

    public static boolean isAccessibilitySettingsOn(Context context) {
        if (isServiceRunning) return true;
        if (context == null) return false;
        try {
            int accessibilityEnabled = Settings.Secure.getInt(
                context.getContentResolver(),
                Settings.Secure.ACCESSIBILITY_ENABLED,
                0
            );
            if (accessibilityEnabled == 1) {
                String settingValue = Settings.Secure.getString(
                    context.getContentResolver(),
                    Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
                );
                if (settingValue != null) {
                    TextUtils.SimpleStringSplitter splitter = new TextUtils.SimpleStringSplitter(':');
                    splitter.setString(settingValue);
                    String expectedPrefix = context.getPackageName() + "/";
                    while (splitter.hasNext()) {
                        String componentName = splitter.next();
                        if (
                            componentName.startsWith(expectedPrefix) ||
                            componentName.contains("DriveWiseAccessibilityService")
                        ) {
                            return true;
                        }
                    }
                }
            }
        } catch (Exception ignored) {}
        return false;
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        isServiceRunning = true;
        try {
            AccessibilityServiceInfo info = new AccessibilityServiceInfo();
            info.eventTypes =
                AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED |
                AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED;
            info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC;
            info.notificationTimeout = 120;
            info.flags =
                AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS |
                AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS |
                AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS;
            this.setServiceInfo(info);
        } catch (Exception ignored) {}
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null || event.getPackageName() == null) return;

        String pkg = event.getPackageName().toString().toLowerCase(Locale.ROOT);
        // Only inspect ride-hailing apps (Uber Driver, 99 Motorista, DiDi, InDrive)
        boolean isDriverApp =
            pkg.contains("ubercab") ||
            pkg.contains("uber") ||
            pkg.contains("taxis99") ||
            pkg.contains("didi") ||
            pkg.contains("99") ||
            pkg.contains("indrive");

        if (!isDriverApp) return;

        AccessibilityNodeInfo rootNode = null;
        try {
            rootNode = getRootInActiveWindow();
            if (rootNode == null) {
                rootNode = event.getSource();
            }
        } catch (Exception ignored) {}

        if (rootNode == null) return;

        List<String> texts = new ArrayList<>();
        collectAllTexts(rootNode, texts, 0);

        Double grossValue = null;
        List<Double> distances = new ArrayList<>();
        List<Integer> durations = new ArrayList<>();

        for (String text : texts) {
            if (grossValue == null) {
                Matcher vm = VALUE_PATTERN.matcher(text);
                if (vm.find()) {
                    String raw = vm.group(1);
                    if (raw != null) {
                        try {
                            double val = Double.parseDouble(raw.replace(".", "").replace(",", "."));
                            if (val >= 4.0 && val <= 1500.0) {
                                grossValue = val;
                            }
                        } catch (Exception ignored) {}
                    }
                }
            }

            Matcher kmMatcher = KM_PATTERN.matcher(text);
            while (kmMatcher.find()) {
                String rawKm = kmMatcher.group(1);
                if (rawKm != null) {
                    try {
                        double kmVal = Double.parseDouble(rawKm.replace(",", "."));
                        if (kmVal > 0.05 && kmVal <= 300.0 && distances.size() < 2) {
                            distances.add(kmVal);
                        }
                    } catch (Exception ignored) {}
                }
            }

            Matcher minMatcher = MIN_PATTERN.matcher(text);
            while (minMatcher.find()) {
                String rawMin = minMatcher.group(1);
                if (rawMin != null) {
                    try {
                        int minVal = Integer.parseInt(rawMin);
                        if (minVal >= 1 && minVal <= 360 && durations.size() < 2) {
                            durations.add(minVal);
                        }
                    } catch (Exception ignored) {}
                }
            }
        }

        if (grossValue != null && !distances.isEmpty()) {
            double totalDistanceKm = 0.0;
            for (Double d : distances) {
                totalDistanceKm += d;
            }
            int totalDurationMin = 0;
            for (Integer m : durations) {
                totalDurationMin += m;
            }
            if (totalDurationMin <= 0) {
                totalDurationMin = Math.max(5, (int) Math.round(totalDistanceKm * 2.2));
            }

            long now = System.currentTimeMillis();
            if (
                now - lastDetectionTimestamp < 2500 &&
                Math.abs(grossValue - lastDetectedGross) < 0.05 &&
                Math.abs(totalDistanceKm - lastDetectedKm) < 0.1
            ) {
                return;
            }

            lastDetectionTimestamp = now;
            lastDetectedGross = grossValue;
            lastDetectedKm = totalDistanceKm;

            String platformName = "Uber";
            if (pkg.contains("99") || pkg.contains("didi")) {
                platformName = "99";
            } else if (pkg.contains("indrive")) {
                platformName = "InDrive";
            }

            // 1. Update Native Floating Overlay Service outside the app
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(this)) {
                try {
                    Intent overlayIntent = new Intent(this, FloatingOverlayService.class);
                    overlayIntent.setAction(FloatingOverlayService.ACTION_UPDATE_RIDE);
                    overlayIntent.putExtra("EXTRA_PACKAGE", pkg);
                    overlayIntent.putExtra("EXTRA_PLATFORM", platformName);
                    overlayIntent.putExtra("EXTRA_VALUE", grossValue);
                    overlayIntent.putExtra("EXTRA_DISTANCE", totalDistanceKm);
                    overlayIntent.putExtra("EXTRA_DURATION", totalDurationMin);
                    overlayIntent.putExtra("EXTRA_EXPAND", true);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        startForegroundService(overlayIntent);
                    } else {
                        startService(overlayIntent);
                    }
                } catch (Throwable ignored) {}
            }

            // 2. Broadcast to MainActivity so WebView also logs the ride
            try {
                Intent broadcast = new Intent(ACTION_RIDE_DETECTED);
                broadcast.setPackage(getPackageName());
                broadcast.putExtra("platform", platformName);
                broadcast.putExtra("grossValue", grossValue);
                broadcast.putExtra("totalDistanceKm", totalDistanceKm);
                broadcast.putExtra("durationMinutes", totalDurationMin);
                sendBroadcast(broadcast);
            } catch (Exception ignored) {}
        }
    }

    private void collectAllTexts(AccessibilityNodeInfo node, List<String> list, int depth) {
        if (node == null || depth > 18) return;
        try {
            CharSequence text = node.getText();
            if (text != null && text.length() > 0) {
                list.add(text.toString());
            }
            CharSequence desc = node.getContentDescription();
            if (desc != null && desc.length() > 0) {
                list.add(desc.toString());
            }
            int count = node.getChildCount();
            for (int i = 0; i < count; i++) {
                AccessibilityNodeInfo child = node.getChild(i);
                if (child != null) {
                    collectAllTexts(child, list, depth + 1);
                }
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onInterrupt() {
        isServiceRunning = false;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        isServiceRunning = false;
    }
}
