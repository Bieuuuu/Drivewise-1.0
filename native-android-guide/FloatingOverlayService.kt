package com.drivewise.copiloto

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.TextView
import androidx.core.app.NotificationCompat

/**
 * Serviço que desenha a Bolha Flutuante (Overlay) sobre a Uber, 99 e a tela inicial
 */
class FloatingOverlayService : Service() {

    private var windowManager: WindowManager? = null
    private var floatingView: View? = null
    private var params: WindowManager.LayoutParams? = null

    companion object {
        const val CHANNEL_ID = "drivewise_overlay_channel"
        const val NOTIFICATION_ID = 101
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        startForegroundServiceWithNotification()
        createFloatingWidget()
    }

    private fun startForegroundServiceWithNotification() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "DriveWise Copiloto em Execução",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Mantém o Copiloto ativo em segundo plano para analisar corridas"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }

        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("DriveWise Copiloto Ativo")
            .setContentText("Monitorando chamadas da Uber e 99 em tempo real")
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setOngoing(true)
            .build()

        startForeground(NOTIFICATION_ID, notification)
    }

    private fun createFloatingWidget() {
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

        val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 30
            y = 200
        }

        // Cria a View do Copiloto Flutuante
        val view = TextView(this).apply {
            text = "⚡ DRIVEWISE\nR$ 0,00/km"
            setTextColor(Color.BLACK)
            setBackgroundColor(Color.parseColor("#10B981")) // Verde Esmeralda
            setPadding(32, 20, 32, 20)
            textSize = 13f
        }

        // Permite arrastar a bolha pela tela
        view.setOnTouchListener(object : View.OnTouchListener {
            private var initialX = 0
            private var initialY = 0
            private var initialTouchX = 0f
            private var initialTouchY = 0f

            override fun onTouch(v: View?, event: MotionEvent?): Boolean {
                when (event?.action) {
                    MotionEvent.ACTION_DOWN -> {
                        initialX = params!!.x
                        initialY = params!!.y
                        initialTouchX = event.rawX
                        initialTouchY = event.rawY
                        return true
                    }
                    MotionEvent.ACTION_MOVE -> {
                        params!!.x = initialX + (event.rawX - initialTouchX).toInt()
                        params!!.y = initialY + (event.rawY - initialTouchY).toInt()
                        windowManager?.updateViewLayout(floatingView, params)
                        return true
                    }
                }
                return false
            }
        })

        floatingView = view
        windowManager?.addView(floatingView, params)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == "ACTION_UPDATE_RIDE") {
            val gross = intent.getDoubleExtra("EXTRA_VALUE", 0.0)
            val distance = intent.getDoubleExtra("EXTRA_DISTANCE", 0.0)
            if (gross > 0 && distance > 0) {
                val perKm = gross / distance
                val isGood = perKm >= 2.0
                (floatingView as? TextView)?.apply {
                    text = String.format("R$ %.2f\n%.1f km (R$ %.2f/km)", gross, distance, perKm)
                    setBackgroundColor(if (isGood) Color.parseColor("#10B981") else Color.parseColor("#EF4444"))
                    setTextColor(Color.WHITE)
                }
            }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        if (floatingView != null) {
            windowManager?.removeView(floatingView)
        }
    }
}
