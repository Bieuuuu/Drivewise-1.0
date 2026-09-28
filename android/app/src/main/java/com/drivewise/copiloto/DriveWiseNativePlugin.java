package com.drivewise.copiloto;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "DriveWiseNative")
public class DriveWiseNativePlugin extends Plugin {

    @PluginMethod
    public void checkOverlayPermission(PluginCall call) {
        JSObject ret = new JSObject();
        boolean granted = MainActivity.isPipSupported(getContext());
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        if (getActivity() instanceof MainActivity) {
            MainActivity act = (MainActivity) getActivity();
            act.runOnUiThread(() -> {
                act.requestAndroidRuntimePermissions();
                act.setPipHudEnabled(true);
            });
        }
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void checkAccessibilityPermission(PluginCall call) {
        Context ctx = getContext();
        boolean location =
            ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_COARSE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED;
        JSObject ret = new JSObject();
        ret.put("granted", location);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestAccessibilityPermission(PluginCall call) {
        if (getActivity() instanceof MainActivity) {
            MainActivity act = (MainActivity) getActivity();
            act.runOnUiThread(act::requestAndroidRuntimePermissions);
        }
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestRuntimePermissions(PluginCall call) {
        if (getActivity() instanceof MainActivity) {
            MainActivity act = (MainActivity) getActivity();
            act.runOnUiThread(act::requestAndroidRuntimePermissions);
        }
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void startFloatingOverlay(PluginCall call) {
        boolean enterPipNow = call.getBoolean("enterPipNow", false);
        if (getActivity() instanceof MainActivity) {
            MainActivity act = (MainActivity) getActivity();
            act.runOnUiThread(() -> {
                act.setPipHudEnabled(true);
                act.showHudNotification();
                if (enterPipNow) {
                    act.enterFloatingPipHud();
                }
            });
        }
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void stopFloatingOverlay(PluginCall call) {
        if (getActivity() instanceof MainActivity) {
            MainActivity act = (MainActivity) getActivity();
            act.runOnUiThread(() -> {
                act.setPipHudEnabled(false);
                act.cancelHudNotification();
            });
        }
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void updateOverlayData(PluginCall call) {
        if (getActivity() instanceof MainActivity) {
            MainActivity act = (MainActivity) getActivity();
            String platform = call.getString("platform", "UBER");
            double gross = call.getDouble("grossValue", 34.50);
            double distance = call.getDouble("distanceKm", 9.0);
            int duration = call.getInt("durationMin", 20);
            double netProfit = call.getDouble("netProfit", 24.15);
            double profitPerKm = call.getDouble("profitPerKm", 2.68);
            double hourlyRate = call.getDouble("hourlyRate", 69.0);
            int score = call.getInt("score", 94);
            String tier = call.getString("recommendation", "EXCELENTE");
            act.runOnUiThread(() ->
                act.updateHudMetrics(
                    platform,
                    gross,
                    distance,
                    duration,
                    netProfit,
                    profitPerKm,
                    hourlyRate,
                    score,
                    tier
                )
            );
        }
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void syncOverlayConfig(PluginCall call) {
        if (getActivity() instanceof MainActivity) {
            MainActivity act = (MainActivity) getActivity();
            double costPerKm = call.getDouble("costPerKm", 0.75);
            double minNetPerKm = call.getDouble("minNetPerKm", 1.80);
            act.saveHudConfig(costPerKm, minNetPerKm);
        }
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void checkAllPermissions(PluginCall call) {
        Context ctx = getContext();
        boolean location =
            ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_COARSE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED;
        boolean notifications =
            Build.VERSION.SDK_INT < 33 ||
            ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED;
        boolean pipSupported = MainActivity.isPipSupported(ctx);

        JSObject ret = new JSObject();
        ret.put("overlay", pipSupported && (location || notifications));
        ret.put("accessibility", location);
        ret.put("location", location);
        ret.put("notifications", notifications);
        ret.put("overlayRunning", MainActivity.isPipHudActive);
        call.resolve(ret);
    }
}
