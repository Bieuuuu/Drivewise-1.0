package com.drivewise.copiloto;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "DriveWiseNative")
public class DriveWiseNativePlugin extends Plugin {

    @PluginMethod
    public void checkOverlayPermission(PluginCall call) {
        JSObject ret = new JSObject();
        boolean granted = Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(getContext());
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        Context ctx = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(ctx)) {
            try {
                Intent intent = new Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + ctx.getPackageName())
                );
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(intent);
            } catch (Exception e) {
                Intent fallback = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(fallback);
            }
        }
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void checkAccessibilityPermission(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", DriveWiseAccessibilityService.isAccessibilitySettingsOn(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void requestAccessibilityPermission(PluginCall call) {
        Context ctx = getContext();
        try {
            Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(intent);
        } catch (Exception ignored) {}
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestRuntimePermissions(PluginCall call) {
        if (getActivity() != null) {
            List<String> perms = new ArrayList<>();
            perms.add(Manifest.permission.ACCESS_FINE_LOCATION);
            perms.add(Manifest.permission.ACCESS_COARSE_LOCATION);
            if (Build.VERSION.SDK_INT >= 33) {
                perms.add(Manifest.permission.POST_NOTIFICATIONS);
            }
            ActivityCompat.requestPermissions(
                getActivity(),
                perms.toArray(new String[0]),
                MainActivity.REQ_RUNTIME_PERMISSIONS
            );
        }
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void startFloatingOverlay(PluginCall call) {
        Context ctx = getContext();
        boolean canDraw = Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(ctx);
        if (canDraw) {
            Intent intent = new Intent(ctx, FloatingOverlayService.class);
            intent.setAction(FloatingOverlayService.ACTION_START_OVERLAY);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ctx.startForegroundService(intent);
            } else {
                ctx.startService(intent);
            }
        }
        JSObject ret = new JSObject();
        ret.put("success", canDraw);
        call.resolve(ret);
    }

    @PluginMethod
    public void stopFloatingOverlay(PluginCall call) {
        Context ctx = getContext();
        Intent intent = new Intent(ctx, FloatingOverlayService.class);
        ctx.stopService(intent);
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void updateOverlayData(PluginCall call) {
        Context ctx = getContext();
        boolean canDraw = Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(ctx);
        if (canDraw) {
            Intent intent = new Intent(ctx, FloatingOverlayService.class);
            intent.setAction(FloatingOverlayService.ACTION_UPDATE_RIDE);
            intent.putExtra("EXTRA_PLATFORM", call.getString("platform", "UBER"));
            intent.putExtra("EXTRA_VALUE", call.getDouble("grossValue", 34.50));
            intent.putExtra("EXTRA_DISTANCE", call.getDouble("distanceKm", 9.0));
            intent.putExtra("EXTRA_DURATION", call.getInt("durationMin", 20));
            intent.putExtra("EXTRA_NET_PROFIT", call.getDouble("netProfit", 24.15));
            intent.putExtra("EXTRA_NET_PER_KM", call.getDouble("profitPerKm", 2.68));
            intent.putExtra("EXTRA_NET_PER_HOUR", call.getDouble("hourlyRate", 69.0));
            intent.putExtra("EXTRA_SCORE", call.getInt("score", 94));
            intent.putExtra("EXTRA_TIER", call.getString("recommendation", "EXCELENTE"));
            intent.putExtra("EXTRA_EXPAND", call.getBoolean("expand", true));
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ctx.startForegroundService(intent);
            } else {
                ctx.startService(intent);
            }
        }
        JSObject ret = new JSObject();
        ret.put("success", canDraw);
        call.resolve(ret);
    }

    @PluginMethod
    public void syncOverlayConfig(PluginCall call) {
        Context ctx = getContext();
        double costPerKm = call.getDouble("costPerKm", 0.75);
        double minNetPerKm = call.getDouble("minNetPerKm", 1.80);
        android.content.SharedPreferences.Editor editor = ctx
            .getSharedPreferences(FloatingOverlayService.PREFS_NAME, Context.MODE_PRIVATE)
            .edit();
        editor.putLong("cost_per_km", Double.doubleToRawLongBits(costPerKm));
        editor.putLong("min_net_per_km", Double.doubleToRawLongBits(minNetPerKm));
        editor.apply();

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void checkAllPermissions(PluginCall call) {
        Context ctx = getContext();
        boolean overlay = Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(ctx);
        boolean accessibility = DriveWiseAccessibilityService.isAccessibilitySettingsOn(ctx);
        boolean location = ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION)
            == PackageManager.PERMISSION_GRANTED
            || ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_COARSE_LOCATION)
            == PackageManager.PERMISSION_GRANTED;
        boolean notifications = Build.VERSION.SDK_INT < 33
            || ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS)
            == PackageManager.PERMISSION_GRANTED;

        JSObject ret = new JSObject();
        ret.put("overlay", overlay);
        ret.put("accessibility", accessibility);
        ret.put("location", location);
        ret.put("notifications", notifications);
        ret.put("overlayRunning", FloatingOverlayService.isOverlayRunning);
        call.resolve(ret);
    }
}
