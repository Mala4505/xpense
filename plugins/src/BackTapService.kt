package com.mala455.Xpense

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.net.Uri
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import kotlin.math.sqrt

class BackTapService : Service(), SensorEventListener {

    private lateinit var sensorManager: SensorManager
    private var accelerometer: Sensor? = null

    private val taps = mutableListOf<Long>()
    private var lastTrigger = 0L
    private var lastTapTime = 0L
    private var wasAbove = false
    private var wasQuiet = true
    private var lastWentQuiet = 0L

    private val THRESHOLD = 1.5f
    private val TAP_WINDOW_MS = 400L
    private val MIN_TAP_GAP_MS = 150L
    private val QUIET_FLOOR = 1.1f
    private val MIN_QUIET_MS = 80L
    private val COOLDOWN_MS = 1500L

    companion object {
        private const val CHANNEL_ID = "backtap"
        private const val NOTIF_ID = 1001
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        createNotificationChannel()
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Xpense running")
            .setSmallIcon(android.R.drawable.ic_menu_recent_history)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setOngoing(true)
            .build()
        startForeground(NOTIF_ID, notification)

        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        accelerometer?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME)
        }

        return START_STICKY
    }

    override fun onDestroy() {
        sensorManager.unregisterListener(this)
        super.onDestroy()
    }

    override fun onSensorChanged(event: SensorEvent) {
        val x = event.values[0]
        val y = event.values[1]
        val z = event.values[2]
        val magnitude = sqrt(x * x + y * y + z * z * 1.5f)
        val now = System.currentTimeMillis()
        val isAbove = magnitude > THRESHOLD

        if (magnitude < QUIET_FLOOR) {
            if (!wasQuiet) {
                wasQuiet = true
                lastWentQuiet = now
            }
        }

        if (isAbove && !wasAbove) {
            wasAbove = true
            val quietLongEnough = wasQuiet && (now - lastWentQuiet >= MIN_QUIET_MS)
            if (quietLongEnough && now - lastTapTime >= MIN_TAP_GAP_MS) {
                lastTapTime = now
                wasQuiet = false
                taps.removeAll { now - it >= TAP_WINDOW_MS }
                taps.add(now)

                if (taps.size >= 3 && now - lastTrigger > COOLDOWN_MS) {
                    lastTrigger = now
                    taps.clear()
                    fireOverlayIntent()
                }
            }
        } else if (!isAbove) {
            wasAbove = false
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    private fun fireOverlayIntent() {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("xpense://overlay"))
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        startActivity(intent)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Xpense Background",
                NotificationManager.IMPORTANCE_MIN
            ).apply { setShowBadge(false) }
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(channel)
        }
    }
}
