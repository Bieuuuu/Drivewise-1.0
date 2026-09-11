package com.drivewise.copiloto

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import java.util.regex.Pattern

/**
 * Serviço de Acessibilidade responsável por ler os cartões de corrida da Uber e 99
 * quando eles aparecem na tela do motorista.
 */
class DriveWiseAccessibilityService : AccessibilityService() {

    companion object {
        var isServiceRunning = false
        const val UBER_PACKAGE = "com.ubercab.driver"
        const val TAXIS99_PACKAGE = "com.taxis99"
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        isServiceRunning = true

        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            notificationTimeout = 100
            packageNames = arrayOf(UBER_PACKAGE, TAXIS99_PACKAGE)
            flags = AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS or AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
        }
        this.serviceInfo = info
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val packageName = event.packageName?.toString() ?: return
        if (packageName != UBER_PACKAGE && packageName != TAXIS99_PACKAGE) return

        val rootNode = rootInActiveWindow ?: return
        parseScreenNodes(rootNode, packageName)
    }

    private fun parseScreenNodes(node: AccessibilityNodeInfo, packageName: String) {
        val texts = mutableListOf<String>()
        collectAllTexts(node, texts)

        var grossValue: Double? = null
        var totalDistanceKm: Double? = null

        // Expressão regular para valores em Real (ex: R$ 24,50 ou R$18.90)
        val valuePattern = Pattern.compile("R\\$\\s*([0-9]+[.,][0-9]{2})")
        // Expressão regular para quilômetros (ex: 5,2 km ou 5.2km)
        val kmPattern = Pattern.compile("([0-9]+[.,]?[0-9]*)\\s*km", Pattern.CASE_INSENSITIVE)

        for (text in texts) {
            val valueMatcher = valuePattern.matcher(text)
            if (valueMatcher.find() && grossValue == null) {
                val raw = valueMatcher.group(1)?.replace(".", "")?.replace(",", ".")
                grossValue = raw?.toDoubleOrNull()
            }

            val kmMatcher = kmPattern.matcher(text)
            if (kmMatcher.find() && totalDistanceKm == null) {
                val raw = kmMatcher.group(1)?.replace(",", ".")
                totalDistanceKm = raw?.toDoubleOrNull()
            }
        }

        // Se encontrou valor e km na tela da Uber/99, avisa o serviço do Copiloto Flutuante
        if (grossValue != null && totalDistanceKm != null && grossValue > 0 && totalDistanceKm > 0) {
            val intent = Intent(this, FloatingOverlayService::class.java).apply {
                action = "ACTION_UPDATE_RIDE"
                putExtra("EXTRA_PACKAGE", packageName)
                putExtra("EXTRA_VALUE", grossValue)
                putExtra("EXTRA_DISTANCE", totalDistanceKm)
            }
            startService(intent)
        }
    }

    private fun collectAllTexts(node: AccessibilityNodeInfo?, list: MutableList<String>) {
        if (node == null) return
        val text = node.text?.toString()
        if (!text.isNullOrBlank()) {
            list.add(text)
        }
        val contentDesc = node.contentDescription?.toString()
        if (!contentDesc.isNullOrBlank()) {
            list.add(contentDesc)
        }
        for (i in 0 until node.childCount) {
            collectAllTexts(node.getChild(i), list)
        }
    }

    override fun onInterrupt() {
        isServiceRunning = false
    }

    override fun onDestroy() {
        super.onDestroy()
        isServiceRunning = false
    }
}
