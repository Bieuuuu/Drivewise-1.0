package com.drivewise.copiloto;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.GestureDescription;
import android.content.Context;
import android.content.Intent;
import android.graphics.Path;
import android.os.Bundle;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class RideAccessibilityService extends AccessibilityService {

    private static final String TAG = "RideAccessService";
    public static RideAccessibilityService instance = null;

    private String currentPlatform = "Unknown";

    private static final Pattern CURRENCY_PATTERN = Pattern.compile(
        "R\\$\\s*(\\d{1,3}(?:[.,]\\d{2}))", Pattern.CASE_INSENSITIVE
    );
    private static final Pattern DISTANCE_KM_PATTERN = Pattern.compile(
        "(\\d{1,3}(?:[.,]\\d{1,2})?)\\s*km\\b", Pattern.CASE_INSENSITIVE
    );
    private static final Pattern DURATION_MIN_PATTERN = Pattern.compile(
        "(\\d{1,3})\\s*(?:min|minutos)\\b", Pattern.CASE_INSENSITIVE
    );

    @Override
    public void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
        Log.i(TAG, "DriveWise RideAccessibilityService connected");
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        instance = null;
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null || event.getPackageName() == null) return;

        String pkg = event.getPackageName().toString();
        if (pkg.equals("com.ubercab.driver")) currentPlatform = "Uber";
        else if (pkg.equals("com.taxis99") || pkg.equals("com.didiglobal.driver") || pkg.equals("com.99taxis")) currentPlatform = "99";
        else if (pkg.equals("sinet.startup.inDriver")) currentPlatform = "InDrive";
        else return; // App não suportado ou fora do escopo

        int eventType = event.getEventType();
        if (eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED ||
            eventType == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED ||
            eventType == AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED) {
            
            AccessibilityNodeInfo rootNode = getRootInActiveWindow();
            if (rootNode == null) return;

            try {
                analyzeRideOffer(rootNode);
            } finally {
                rootNode.recycle();
            }
        }
    }

    private void analyzeRideOffer(AccessibilityNodeInfo rootNode) {
        List<Double> prices = new ArrayList<>();
        List<Double> distances = new ArrayList<>();
        List<Integer> times = new ArrayList<>();

        collectNodeData(rootNode, prices, distances, times);

        if (prices.isEmpty() && distances.isEmpty() && times.isEmpty()) return;

        double detectedGross = 0.0;
        for (double p : prices) {
            if (p >= 4.50 && p <= 650.0 && p > detectedGross) {
                detectedGross = p;
            }
        }

        double detectedPickupDist = 0.0;
        double detectedTripDist = 0.0;
        if (distances.size() == 1) {
            detectedTripDist = distances.get(0);
        } else if (distances.size() >= 2) {
            detectedPickupDist = distances.get(0);
            detectedTripDist = distances.get(1);
        }

        int detectedPickupTime = 0;
        int detectedTripTime = 0;
        if (times.size() == 1) {
            detectedTripTime = times.get(0);
        } else if (times.size() >= 2) {
            detectedPickupTime = times.get(0);
            detectedTripTime = times.get(1);
        }

        if (detectedGross > 0 || detectedTripDist > 0) {
            broadcastRideOffer(detectedGross, detectedPickupDist, detectedTripDist, detectedPickupTime, detectedTripTime);
        }
    }

    private void collectNodeData(AccessibilityNodeInfo node, List<Double> prices, List<Double> distances, List<Integer> times) {
        if (node == null) return;

        CharSequence text = node.getText();
        if (text != null) {
            String s = text.toString();
            
            Matcher priceMatcher = CURRENCY_PATTERN.matcher(s);
            while (priceMatcher.find()) {
                try {
                    prices.add(Double.parseDouble(priceMatcher.group(1).replace(",", ".")));
                } catch (Exception ignored) {}
            }

            Matcher distMatcher = DISTANCE_KM_PATTERN.matcher(s);
            while (distMatcher.find()) {
                try {
                    distances.add(Double.parseDouble(distMatcher.group(1).replace(",", ".")));
                } catch (Exception ignored) {}
            }

            Matcher timeMatcher = DURATION_MIN_PATTERN.matcher(s);
            while (timeMatcher.find()) {
                try {
                    times.add(Integer.parseInt(timeMatcher.group(1)));
                } catch (Exception ignored) {}
            }
        }

        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) {
                collectNodeData(child, prices, distances, times);
                child.recycle();
            }
        }
    }

    private void broadcastRideOffer(double gross, double pickupDist, double tripDist, int pickupTime, int tripTime) {
        try {
            Intent intent = new Intent("com.drivewise.copiloto.ACTION_ACCESSIBILITY_RIDE_EVENT");
            intent.setPackage(getPackageName());
            intent.putExtra("platform", currentPlatform);
            intent.putExtra("gross", gross);
            intent.putExtra("pickupDist", pickupDist);
            intent.putExtra("tripDist", tripDist);
            intent.putExtra("pickupTime", pickupTime);
            intent.putExtra("tripTime", tripTime);
            sendBroadcast(intent);
        } catch (Exception ignored) {}
    }

    public void performAcceptRideClick() {
        AccessibilityNodeInfo rootNode = getRootInActiveWindow();
        if (rootNode == null) return;
        try {
            List<AccessibilityNodeInfo> acceptNodes = rootNode.findAccessibilityNodeInfosByText("Aceitar");
            if (acceptNodes != null && !acceptNodes.isEmpty()) {
                acceptNodes.get(0).performAction(AccessibilityNodeInfo.ACTION_CLICK);
                return;
            }
            // Fallback para InDrive
            acceptNodes = rootNode.findAccessibilityNodeInfosByText("Accept");
            if (acceptNodes != null && !acceptNodes.isEmpty()) {
                acceptNodes.get(0).performAction(AccessibilityNodeInfo.ACTION_CLICK);
            }
        } finally {
            rootNode.recycle();
        }
    }

    public void performRejectRideClick() {
        AccessibilityNodeInfo rootNode = getRootInActiveWindow();
        if (rootNode == null) return;
        try {
            List<AccessibilityNodeInfo> rejectNodes = rootNode.findAccessibilityNodeInfosByText("Recusar");
            if (rejectNodes == null || rejectNodes.isEmpty()) {
                rejectNodes = rootNode.findAccessibilityNodeInfosByText("X");
            }
            if (rejectNodes == null || rejectNodes.isEmpty()) {
                rejectNodes = rootNode.findAccessibilityNodeInfosByText("Cancelar");
            }
            if (rejectNodes != null && !rejectNodes.isEmpty()) {
                rejectNodes.get(0).performAction(AccessibilityNodeInfo.ACTION_CLICK);
                return;
            }
        } finally {
            rootNode.recycle();
        }
    }

    @Override
    public void onInterrupt() {
        Log.e(TAG, "Accessibility Service Interrupted");
    }
}
