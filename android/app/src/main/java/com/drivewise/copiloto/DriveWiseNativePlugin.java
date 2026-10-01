package com.drivewise.copiloto;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Settings;
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
        Context ctx = getContext();
        boolean granted = Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(ctx);
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        if (getActivity() instanceof MainActivity) {
            MainActivity act = (MainActivity) getActivity();
            act.runOnUiThread(act::requestSystemOverlayPermission);
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
        boolean expandNow = call.getBoolean("enterPipNow", false);
        boolean started = false;
        if (getActivity() instanceof MainActivity) {
            MainActivity act = (MainActivity) getActivity();
            if (act.canDrawSystemOverlay()) {
                act.runOnUiThread(() -> act.startRealFloatingOverlayService(expandNow));
                started = true;
            }
        }
        JSObject ret = new JSObject();
        ret.put("success", started);
        call.resolve(ret);
    }

    @PluginMethod
    public void stopFloatingOverlay(PluginCall call) {
        if (getActivity() instanceof MainActivity) {
            MainActivity act = (MainActivity) getActivity();
            act.runOnUiThread(act::stopRealFloatingOverlayService);
        }
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void updateOverlayData(PluginCall call) {
        if (getActivity() instanceof MainActivity) {
            MainActivity act = (MainActivity) getActivity();
            String platform = call.getString("platform", "Uber");
            double gross = call.getDouble("grossValue", 0.0);
            double distance = call.getDouble("distanceKm", 5.0);
            int duration = call.getInt("durationMin", 12);
            boolean expand = call.getBoolean("expand", false);
            act.runOnUiThread(() ->
                act.pushRideDataToFloatingOverlay(platform, gross, distance, duration, expand)
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
        boolean overlay = Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(ctx);
        boolean location =
            ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_COARSE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED;
        boolean notifications =
            Build.VERSION.SDK_INT < 33 ||
            ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED;

        JSObject ret = new JSObject();
        ret.put("overlay", overlay);
        ret.put("accessibility", location);
        ret.put("location", location);
        ret.put("notifications", notifications);
        ret.put("overlayRunning", FloatingOverlayService.isRunning);
        call.resolve(ret);
    }
}
