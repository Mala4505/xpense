# Design: Transparent Overlay Activity for QS Tile & Back Tap

**Date:** 2026-05-18  
**Status:** Approved

---

## Problem

When the user taps the Quick Settings (QS) tile or back-taps from the background, Android brings `MainActivity` to the foreground. The full app (home screen, bottom tabs, balance cards) renders before the 3-step overlay appears. The user sees an unwanted flash of the app.

**Goal:** The overlay must appear directly on top of whatever content the user was viewing — another app, the home screen, or any Xpense screen — with no full-app flash.

---

## Approach: Separate OverlayActivity with Transparent Window

Launch a dedicated `OverlayActivity` from both the QS tile and BackTapService. This Activity has `windowIsTranslucent=true` so the previous content (any app, wallpaper, current Xpense screen) shows through its window. A minimal React Native component (`OverlayApp`) renders inside it — just `SQLiteProvider` + `QuickEntryOverlay` + `Toast`. When the overlay closes, `OverlayActivity.finish()` is called and the user is returned to exactly what they were doing.

**Back tap while app is already in foreground:** BackTapService checks if the app process is in the foreground. If yes, it fires the existing `xpense://overlay` deep link (the current Modal behavior, which already works correctly). If no, it launches `OverlayActivity`.

**QS tile:** Always launches `OverlayActivity` (the QS panel itself dismisses before the activity appears, so there's no "app in foreground" case for QS).

---

## Architecture

```
QS Tile tap           BackTapService (background)       BackTapService (foreground)
      │                        │                                  │
      ▼                        ▼                                  ▼
 OverlayActivity          OverlayActivity               xpense://overlay deep link
 (transparent)            (transparent)                        │
      │                        │                                  ▼
      └──────────┬─────────────┘                          openOverlay() →
                 ▼                                         Modal on current
          OverlayApp (RN)                                  Xpense screen ✓
          SQLiteProvider (with onInit)
          QuickEntryOverlay
          Toast
                 │
    user closes overlay
                 │
          ActivityFinishModule.finish()
                 │
    user returns to previous content
```

---

## Components

### New: `plugins/src/OverlayActivity.kt`

- Extends `ReactActivity`
- Overrides `getMainComponentName()` to return `"OverlayApp"`
- Uses `MainApplication`'s shared `ReactNativeHost` (same JS bundle, shared instance manager)
- Wraps delegate in `ReactActivityDelegateWrapper` (required by Expo for lifecycle dispatch to modules, including `EdgeToEdgePackage` which handles transparent system bar insets)

```kotlin
package com.mala455.Xpense

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import expo.modules.ReactActivityDelegateWrapper

class OverlayActivity : ReactActivity() {
    override fun getMainComponentName(): String = "OverlayApp"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        ReactActivityDelegateWrapper(
            this,
            BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
            object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {}
        )
}
```

### New: `plugins/src/ActivityFinishModule.kt`

Tiny native module with a single `finish()` method. Used by `OverlayApp` to close `OverlayActivity` without relying on `BackHandler.exitApp()`'s indirect `super.onBackPressed()` chain, which could be intercepted by BackHandler subscribers from other libraries.

```kotlin
package com.mala455.Xpense

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ActivityFinishModule(context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context) {

    override fun getName(): String = "ActivityFinish"

    @ReactMethod
    fun finish() {
        currentActivity?.finish()
    }
}
```

### New: `plugins/src/ActivityFinishPackage.kt`

```kotlin
package com.mala455.Xpense

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class ActivityFinishPackage : ReactPackage {
    override fun createNativeModules(ctx: ReactApplicationContext): List<NativeModule> =
        listOf(ActivityFinishModule(ctx))
    override fun createViewManagers(ctx: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
```

This package is registered in `MainApplication.getPackages()` via the config plugin.

### New: `res/values/overlay_styles.xml`

Created by the config plugin at `app/src/main/res/values/overlay_styles.xml`.

```xml
<resources>
  <style name="Theme.Xpense.Overlay" parent="Theme.AppCompat.DayNight.NoActionBar">
    <item name="android:windowIsTranslucent">true</item>
    <item name="android:windowBackground">@android:color/transparent</item>
    <item name="android:windowAnimationStyle">@android:style/Animation</item>
    <item name="android:statusBarColor">@android:color/transparent</item>
    <item name="android:navigationBarColor">@android:color/transparent</item>
  </style>
</resources>
```

### New: `src/OverlayApp.tsx`

Minimal RN root component registered as `"OverlayApp"` in `AppRegistry` (in `index.ts`). It:
- Sets `isOverlayActivity = true` in `overlayStore` so `App.tsx` suppresses its own Modal (prevents double-overlay if main app is paused in background)
- Calls `openOverlay()` on mount
- Watches `isOpen` — when it transitions to `false` (after having been `true`), calls `ActivityFinishModule.finish()` to close `OverlayActivity`
- On unmount cleanup: calls `closeOverlay()` then `setOverlayActivityMode(false)` to avoid stale `isOpen=true` state if MainActivity resumes

```tsx
import React, { useEffect, useRef } from 'react';
import { NativeModules } from 'react-native';
import { SQLiteProvider } from 'expo-sqlite';
import { QuickEntryOverlay } from './components/overlay/QuickEntryOverlay';
import { Toast } from './components/ui/Toast';
import { useOverlayStore } from './stores/overlayStore';

export function OverlayApp() {
  const isOpen = useOverlayStore((s) => s.isOpen);
  const hasOpened = useRef(false);

  useEffect(() => {
    useOverlayStore.getState().setOverlayActivityMode(true);
    useOverlayStore.getState().openOverlay();
    return () => {
      useOverlayStore.getState().closeOverlay();
      useOverlayStore.getState().setOverlayActivityMode(false);
    };
  }, []);

  useEffect(() => {
    if (isOpen) { hasOpened.current = true; return; }
    if (hasOpened.current) NativeModules.ActivityFinish?.finish?.();
  }, [isOpen]);

  return (
    <SQLiteProvider databaseName="xpense.db" useSuspense={false}>
      <QuickEntryOverlay />
      <Toast />
    </SQLiteProvider>
  );
}
```

`NativeModules.ActivityFinish?.finish?.()` calls `currentActivity?.finish()` directly in Kotlin, finishing only `OverlayActivity` without any interaction with the BackHandler chain. The optional chaining guards against the module being absent in development builds where the config plugin hasn't run.

**No `onInit` needed:** `OverlayActivity` is only reachable after `MainActivity` has been launched at least once — `BackTapService` is started from `MainActivity.onCreate()` (so it cannot run without a prior `MainActivity` launch), and the QS tile requires the user to manually add it through the tile editor (which requires opening the app). The DB schema and seed data are therefore guaranteed to already exist. Passing `onInit` to a second `SQLiteProvider` would risk calling `useBudgetStore.init(db)` twice (once from `App.tsx`'s provider and once from `OverlayApp`'s), which is not idempotent and could corrupt the budget store's internal DB reference.

**Back button while on step 2 or 3:** The Android back button triggers `OverlayActivity.onBackPressed()`, which calls `Activity.finish()`. This dismisses the entire overlay rather than navigating to the previous step. This is intentional for a quick-entry context — users expect back = cancel from a floating overlay.

---

## Store Changes

### Modified: `src/stores/overlayStore.ts`

Add two fields:

```ts
isOverlayActivity: boolean;           // true when OverlayActivity is hosting the overlay
setOverlayActivityMode: (v: boolean) => void;
```

Initial value: `isOverlayActivity: false`.

### Modified: `App.tsx`

Suppress the main app's `<QuickEntryOverlay />` when `isOverlayActivity` is true (prevents double-modal when main app is paused and OverlayActivity is in foreground):

```tsx
const isOverlayActivity = useOverlayStore((s) => s.isOverlayActivity);
// ...
{!isOverlayActivity && <QuickEntryOverlay />}
```

### Modified: `index.ts`

Register `"OverlayApp"` with `AppRegistry` here, not in `App.tsx`. This is the canonical location for root component registrations in Expo:

```ts
import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';
import App from './App';
import { OverlayApp } from './src/OverlayApp';

registerRootComponent(App);
AppRegistry.registerComponent('OverlayApp', () => OverlayApp);
```

---

## Native Changes

### Modified: `plugins/src/QuickSettingsTileService.kt`

Replace the `xpense://overlay` deep link intent with a direct `OverlayActivity` class intent. Use `FLAG_ACTIVITY_SINGLE_TOP` (not `CLEAR_TOP`) so that if an `OverlayActivity` is already on top, it receives `onNewIntent` rather than being destroyed and recreated:

```kotlin
override fun onClick() {
    super.onClick()
    val intent = Intent(this, OverlayActivity::class.java).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        val pending = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        startActivityAndCollapse(pending)
    } else {
        @Suppress("DEPRECATION")
        startActivityAndCollapse(intent)
    }
}
```

### Modified: `plugins/src/BackTapService.kt`

Replace `fireOverlayIntent()` with a foreground-aware version. `IMPORTANCE_FOREGROUND` (value 100) covers only activities in the foreground — it excludes foreground services (value 125), so `BackTapService` itself running does not falsely trip the foreground check:

```kotlin
private fun fireOverlayIntent() {
    if (isAppInForeground()) {
        // App is visible — use deep link to open the existing in-app Modal
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("xpense://overlay"))
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        startActivity(intent)
    } else {
        // App is in background or not running — launch transparent OverlayActivity
        val intent = Intent(this, OverlayActivity::class.java)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        startActivity(intent)
    }
}

private fun isAppInForeground(): Boolean {
    val am = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    return am.runningAppProcesses?.any {
        it.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND &&
        it.processName == packageName
    } ?: false
}
```

---

## Config Plugin Changes

### New: `plugins/withOverlayActivity.js`

Handles four things:
1. Copies `OverlayActivity.kt`, `ActivityFinishModule.kt`, and `ActivityFinishPackage.kt` to the platform's Java source directory.
2. Creates `res/values/overlay_styles.xml` with the transparent theme.
3. Registers `<activity android:name=".OverlayActivity" android:theme="@style/Theme.Xpense.Overlay" android:taskAffinity="" android:exported="true" />` in `AndroidManifest.xml`. `android:taskAffinity=""` places `OverlayActivity` in its own task, isolated from `MainActivity`'s task stack. `android:exported="true"` (without an `<intent-filter>`) is used rather than `false` because `TileService.startActivityAndCollapse` is called by the system process (SystemUI), and some OEM skins (Samsung OneUI 6+, Xiaomi MIUI) fail to launch `exported="false"` activities from system-privileged callers. Without an `<intent-filter>`, the activity is still unreachable from arbitrary external apps via implicit intents.
4. Adds `ActivityFinishPackage()` to `MainApplication.getPackages()` via `withMainApplication` (modifying `getPackages` in `MainApplication.kt`). Note: `withMainApplication` is the correct modifier here — `withMainActivity` targets `MainActivity.kt` and must not be used for `MainApplication` changes.

### Modified: `plugins/withBackTapService.js`

Copies the updated `BackTapService.kt` (already does this via `withDangerousMod`). No structural change needed.

### Modified: `app.json`

Add `"./plugins/withOverlayActivity"` to the `plugins` array.

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `plugins/src/OverlayActivity.kt` | Create | Transparent ReactActivity (with ReactActivityDelegateWrapper) hosting OverlayApp |
| `plugins/src/ActivityFinishModule.kt` | Create | Native module: `finish()` closes current Activity directly |
| `plugins/src/ActivityFinishPackage.kt` | Create | Registers ActivityFinishModule with RN bridge |
| `plugins/withOverlayActivity.js` | Create | Config plugin: copy KT files, create styles.xml, register activity (exported=true, taskAffinity=""), register package via withMainApplication |
| `src/OverlayApp.tsx` | Create | Minimal RN root: SQLiteProvider (no onInit) + QuickEntryOverlay + Toast |
| `index.ts` | Modify | Register `"OverlayApp"` with AppRegistry |
| `plugins/src/QuickSettingsTileService.kt` | Modify | Launch OverlayActivity (SINGLE_TOP) instead of deep link |
| `plugins/src/BackTapService.kt` | Modify | Foreground check → deep link or OverlayActivity (SINGLE_TOP) |
| `src/stores/overlayStore.ts` | Modify | Add `isOverlayActivity` flag + setter |
| `App.tsx` | Modify | Suppress overlay Modal when `isOverlayActivity` is true |
| `app.json` | Modify | Add withOverlayActivity plugin |

---

## Edge Cases

**User opens overlay from QS while Xpense is already open:**  
`OverlayActivity` launches (SINGLE_TOP, own task) → `MainActivity` pauses → `isOverlayActivity = true` suppresses the main Modal → no double-overlay. User closes → `ActivityFinishModule.finish()` → `OverlayActivity.finish()` → `MainActivity` resumes from where it was.

**User taps QS tile repeatedly:**  
`FLAG_ACTIVITY_SINGLE_TOP` delivers `onNewIntent` to the existing `OverlayActivity` instead of recreating it. No flicker, no double-overlay.

**User presses Android back button:**  
`OverlayActivity.onBackPressed()` → `Activity.finish()` → user returns to previous context. The `useEffect` cleanup in `OverlayApp` runs (`closeOverlay()` + `setOverlayActivityMode(false)`), ensuring clean store state when `MainActivity` resumes.

**App was never launched before (BackTapService not running):**  
`BackTapService` starts from `MainActivity.onCreate()`. If the user has never opened the app, the service is not running and back tap has no effect. Unchanged behavior.

**OverlayActivity as first Activity — not possible by design:**  
`BackTapService` is started exclusively from `MainActivity.onCreate()`, so it cannot fire until `MainActivity` has run at least once. The QS tile requires the user to manually add it via the tile editor, which requires opening the app. Therefore `OverlayActivity` is never the first Activity in a fresh install — `MainActivity` (and its `SQLiteProvider` with `onInit`) always runs first, guaranteeing the DB schema exists before `OverlayActivity` is ever launched.

**OverlayActivity finishes while MainActivity is resuming:**  
`useEffect` cleanup calls `closeOverlay()` before `setOverlayActivityMode(false)`, ensuring `isOpen=false` and `isOverlayActivity=false` are both set atomically. `MainActivity` resumes to a clean store state.
