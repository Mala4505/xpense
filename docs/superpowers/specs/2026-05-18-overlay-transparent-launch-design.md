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
          SQLiteProvider
          QuickEntryOverlay
          Toast
                 │
    user closes overlay
                 │
          OverlayActivity.finish()
                 │
    user returns to previous content
```

---

## Components

### New: `plugins/src/OverlayActivity.kt`

- Extends `ReactActivity`
- Overrides `getMainComponentName()` to return `"OverlayApp"`
- Uses `MainApplication`'s shared `ReactNativeHost` (same JS bundle, shared instance manager)
- No additional code needed — `ReactActivity` handles everything

```kotlin
package com.mala455.Xpense

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class OverlayActivity : ReactActivity() {
    override fun getMainComponentName(): String = "OverlayApp"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
```

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

Minimal RN root component registered as `"OverlayApp"` in `AppRegistry`. It:
- Calls `openOverlay()` on mount
- Sets `isOverlayActivity = true` in `overlayStore` so `App.tsx` suppresses its own Modal (prevents double-overlay if main app is in background)
- Watches `isOpen` — when it transitions to `false` (after having been `true`), calls `BackHandler.exitApp()` to finish `OverlayActivity`

```tsx
import React, { useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
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
      useOverlayStore.getState().setOverlayActivityMode(false);
    };
  }, []);

  useEffect(() => {
    if (isOpen) { hasOpened.current = true; return; }
    if (hasOpened.current) BackHandler.exitApp();
  }, [isOpen]);

  return (
    <SQLiteProvider databaseName="xpense.db" useSuspense={false}>
      <QuickEntryOverlay />
      <Toast />
    </SQLiteProvider>
  );
}
```

`BackHandler.exitApp()` calls `currentActivity.finish()` on Android, which finishes `OverlayActivity` and returns the user to whatever was underneath.

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

1. Suppress the main app's `<QuickEntryOverlay />` when `isOverlayActivity` is true (prevents double-modal when main app is in background and OverlayActivity is in foreground).
2. Register `"OverlayApp"` with `AppRegistry`.

```tsx
// In App.tsx component:
const isOverlayActivity = useOverlayStore((s) => s.isOverlayActivity);
// ...
{!isOverlayActivity && <QuickEntryOverlay />}

// At bottom of App.tsx file (outside component):
import { AppRegistry } from 'react-native';
import { OverlayApp } from './src/OverlayApp';
AppRegistry.registerComponent('OverlayApp', () => OverlayApp);
```

---

## Native Changes

### Modified: `plugins/src/QuickSettingsTileService.kt`

Replace the `xpense://overlay` deep link intent with a direct `OverlayActivity` class intent:

```kotlin
override fun onClick() {
    super.onClick()
    val intent = Intent(this, OverlayActivity::class.java).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
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

Replace `fireOverlayIntent()` with a foreground-aware version:

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
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
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

Handles three things:
1. Copies `OverlayActivity.kt` to the platform's Java source directory.
2. Creates `res/values/overlay_styles.xml` with the transparent theme.
3. Registers `<activity android:name=".OverlayActivity" android:theme="@style/Theme.Xpense.Overlay" android:taskAffinity="" android:exported="false" />` in `AndroidManifest.xml`.

`android:taskAffinity=""` puts `OverlayActivity` in its own task so `BackHandler.exitApp()` (which calls `finishAffinity`) only closes `OverlayActivity`'s task, not `MainActivity`'s.

### Modified: `plugins/withBackTapService.js`

Also copies the updated `BackTapService.kt` (already does this via `withDangerousMod`). No structural change needed.

### Modified: `app.json`

Add `"./plugins/withOverlayActivity"` to the `plugins` array.

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `plugins/src/OverlayActivity.kt` | Create | Transparent ReactActivity hosting OverlayApp |
| `plugins/withOverlayActivity.js` | Create | Config plugin: copy KT file, create styles.xml, register in manifest |
| `src/OverlayApp.tsx` | Create | Minimal RN root: SQLiteProvider + QuickEntryOverlay + Toast |
| `plugins/src/QuickSettingsTileService.kt` | Modify | Launch OverlayActivity instead of deep link |
| `plugins/src/BackTapService.kt` | Modify | Foreground check → deep link or OverlayActivity |
| `src/stores/overlayStore.ts` | Modify | Add `isOverlayActivity` flag + setter |
| `App.tsx` | Modify | Suppress overlay Modal in activity mode; register OverlayApp |
| `app.json` | Modify | Add withOverlayActivity plugin |

---

## Edge Cases

**User opens overlay from QS while Xpense is already open:**  
`OverlayActivity` launches → `MainActivity` pauses → `isOverlayActivity = true` suppresses the main Modal → no double-overlay. User closes → `OverlayActivity` finishes → `MainActivity` resumes from where it was.

**User opens overlay, then presses Android back button:**  
`OverlayActivity.onBackPressed()` is called → Activity finishes → user returns to previous context. Store cleanup (`setOverlayActivityMode(false)`) runs via `useEffect` cleanup in `OverlayApp`.

**App was never launched before (BackTapService not running):**  
`BackTapService` starts from `MainActivity.onCreate()`. If the user has never opened the app, the service is not running and back tap has no effect. This is existing behavior, unchanged.

**OverlayActivity appears without MainApplication initialized:**  
`OverlayActivity` extends `ReactActivity` which uses `MainApplication`'s `ReactNativeHost`. Android initializes `MainApplication.onCreate()` before any Activity. The RN bundle loads, JS runs, and `OverlayApp` renders normally.
