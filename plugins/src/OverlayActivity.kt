package com.mala455.Xpense

import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import expo.modules.ReactActivityDelegateWrapper

class OverlayActivity : ReactActivity() {
    override fun getMainComponentName(): String = "OverlayApp"

    // Same guard as MainActivity: the OS can deliver onUserLeaveHint()
    // before ReactActivityDelegate finishes initializing, and this
    // activity's warm-up/dismiss cycle makes fast focus changes common.
    override fun onUserLeaveHint() {
        try {
            super.onUserLeaveHint()
        } catch (e: Exception) {
            // React delegate not ready yet — safe to ignore.
        }
    }

    // OverlayActivity runs in its own task (taskAffinity="") and is launched
    // with FLAG_ACTIVITY_SINGLE_TOP, so if the overlay is merely backgrounded
    // (not dismissed) a repeat back-tap/QS-tile trigger reuses this instance
    // via onNewIntent() instead of creating a fresh one. Refresh the intent so
    // getLaunchOptions() reads fresh extras, and notify JS so the RN-side
    // overlay flow (useOverlayStore) resets to the 'amount' step instead of
    // resuming wherever it was left when backgrounded.
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        reactActivityDelegate.currentReactContext?.emitDeviceEvent("OverlayReopened")
    }

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        ReactActivityDelegateWrapper(
            this,
            BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
            object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {
                override fun getLaunchOptions(): Bundle? {
                    val isWarmUp = this@OverlayActivity.intent?.getBooleanExtra("WARM_UP_ONLY", false) ?: false
                    if (!isWarmUp) return null
                    return Bundle().apply { putBoolean("warmUpOnly", true) }
                }
            }
        )
}
