package com.mala455.Xpense

import android.app.ActivityManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import androidx.core.app.NotificationCompat
import kotlin.math.sqrt

class BackTapService : Service(), SensorEventListener {

    private var sensorManager: SensorManager? = null
    private var accelerometer: Sensor? = null

    private val taps = mutableListOf<Long>()
    private var lastTrigger = 0L
    private var lastTapTime = 0L
    private var wasAbove = false

    private val THRESHOLD = 1.5f
    private val TAP_WINDOW_MS = 400L
    private val MIN_TAP_GAP_MS = 150L
    private val COOLDOWN_MS = 1500L

    private var receiverRegistered = false
    private val unlockReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (intent.action == Intent.ACTION_USER_PRESENT) warmUpOverlay()
        }
    }

    companion object {
        private const val CHANNEL_ID = "backtap"
        private const val NOTIF_ID = 1001
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        createNotificationChannel()
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Xpense is active")
            .setSmallIcon(R.drawable.ic_qs_tile)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setOngoing(true)
            .build()
        startForeground(NOTIF_ID, notification)

        val sm = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        sensorManager = sm
        accelerometer = sm.getDefaultSensor(Sensor.TYPE_LINEAR_ACCELERATION)
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(this)) {
            accelerometer?.let {
                sm.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME)
            }
        }

        if (!receiverRegistered) {
            registerReceiver(unlockReceiver, IntentFilter(Intent.ACTION_USER_PRESENT))
            receiverRegistered = true
        }

        return START_STICKY
    }

    override fun onDestroy() {
        sensorManager?.unregisterListener(this)
        if (receiverRegistered) {
            unregisterReceiver(unlockReceiver)
            receiverRegistered = false
        }
        super.onDestroy()
    }

    override fun onSensorChanged(event: SensorEvent) {
        val x = event.values[0]
        val y = event.values[1]
        val z = event.values[2]
        val magnitude = sqrt(x * x + y * y + z * z * 1.5f)
        val now = System.currentTimeMillis()
        val isAbove = magnitude > THRESHOLD

        if (isAbove && !wasAbove) {
            wasAbove = true
            if (now - lastTapTime >= MIN_TAP_GAP_MS) {
                lastTapTime = now
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
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            return
        }
        if (isAppInForeground()) return

        val intent = Intent(this, OverlayActivity::class.java)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        startActivity(intent)
    }

    private fun warmUpOverlay() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) return
        if (isAppInForeground()) return
        val intent = Intent(this, OverlayActivity::class.java)
        intent.putExtra("WARM_UP_ONLY", true)
        intent.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK or
            Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS or
            Intent.FLAG_ACTIVITY_NO_HISTORY
        )
        startActivity(intent)
    }

    private fun isAppInForeground(): Boolean {
        val am = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        // IMPORTANCE_FOREGROUND (100) = activity in foreground; excludes foreground services (125)
        return am.runningAppProcesses?.any {
            it.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND &&
            it.processName == packageName
        } ?: false
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
