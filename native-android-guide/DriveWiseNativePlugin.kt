package com.drivewise.copiloto

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "DriveWiseNative")
class DriveWiseNativePlugin : Plugin() {

    @PluginMethod
    fun checkOverlayPermission(call: PluginCall) {
        val ret = JSObject()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            ret.put("granted", Settings.canDrawOverlays(context))
        } else {
            ret.put("granted", true)
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun requestOverlayPermission(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${context.packageName}")
            ).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        }
        val ret = JSObject().apply { put("success", true) }
        call.resolve(ret)
    }

    @PluginMethod
    fun checkAccessibilityPermission(call: PluginCall) {
        val ret = JSObject().apply {
            put("granted", DriveWiseAccessibilityService.isServiceRunning)
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun requestAccessibilityPermission(call: PluginCall) {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
        val ret = JSObject().apply { put("success", true) }
        call.resolve(ret)
    }

    @PluginMethod
    fun startFloatingOverlay(call: PluginCall) {
        val intent = Intent(context, FloatingOverlayService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
        val ret = JSObject().apply { put("success", true) }
        call.resolve(ret)
    }

    @PluginMethod
    fun stopFloatingOverlay(call: PluginCall) {
        val intent = Intent(context, FloatingOverlayService::class.java)
        context.stopService(intent)
        val ret = JSObject().apply { put("success", true) }
        call.resolve(ret)
    }
}
