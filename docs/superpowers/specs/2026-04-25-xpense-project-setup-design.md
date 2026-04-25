# Xpense — Project Setup Design Spec
**Date:** 2026-04-25
**Stack:** React Native · Expo SDK 52 (managed workflow) · TypeScript · NativeWind v4 · React Navigation

> **Expo SDK:** Target SDK 52 (`npx create-expo-app@latest`). NativeWind v4 is compatible with SDK 50+. All peer dependencies should be installed at versions compatible with SDK 52 (use `npx expo install` for Expo-managed packages to get the correct pinned versions).

---

## 1. Scope

Bootstrap a brand-new Expo TypeScript project at the root of `C:\Users\Lenovo T470s\Desktop\Aliasger\Xpense` using `create-expo-app` with the blank TypeScript template. Install and configure all specified dependencies, create the design token system, wire up font loading, and set up bottom-tab navigation with a centre FAB. All five tab screens are empty placeholders. The result must run without errors via `expo start`.

Out of scope: data layer, state management, any real screen content, authentication.

---

## 2. Dependencies

```
nativewind@^4
tailwindcss
@expo-google-fonts/plus-jakarta-sans
@expo-google-fonts/space-mono
expo-font
@react-navigation/native
@react-navigation/native-stack
@react-navigation/bottom-tabs
react-native-safe-area-context
react-native-screens
expo-status-bar
@expo/vector-icons        # bundled with Expo SDK — Ionicons for tab icons
```

---

## 3. File Structure

```
Xpense/
├── App.tsx
├── app.json
├── babel.config.js
├── metro.config.js
├── tailwind.config.js
├── global.css
├── tsconfig.json
├── package.json
│
├── src/
│   ├── theme/
│   │   ├── colors.ts
│   │   ├── fonts.ts
│   │   ├── spacing.ts
│   │   └── index.ts
│   │
│   ├── navigation/
│   │   ├── RootNavigator.tsx
│   │   └── BottomTabNavigator.tsx
│   │
│   └── screens/
│       ├── HomeScreen.tsx
│       ├── HistoryScreen.tsx
│       ├── AddScreen.tsx
│       ├── ReportsScreen.tsx
│       └── SettingsScreen.tsx
│
└── stitch_financial_reports_screen/   # design reference, untouched
```

---

## 4. Tailwind / NativeWind Configuration

### `tailwind.config.js`
Extends Tailwind with brand tokens under `theme.extend.colors` and `theme.extend.fontFamily`. The `content` array must include `'./App.tsx'` and `'./src/**/*.{ts,tsx}'` so Tailwind scans all source files.

**Color tokens:**
| Token | Value |
|---|---|
| `brand-navy` | `#1E1058` |
| `brand-violet` | `#9B6EF0` |
| `brand-yellow` | `#EDD900` |
| `brand-purple-soft` | `#5B35D4` |
| `brand-purple-pale` | `#EEEAF8` |
| `surface-bg` | `#F5F4FC` |
| `surface-card` | `#FFFFFF` |
| `surface-border` | `#EEE8F8` |
| `text-primary` | `#1A1040` |
| `text-muted` | `#9080B8` |
| `text-disabled` | `#C0B8E0` |
| `income` | `#22C87A` |
| `income-bg` | `#E8F8F0` |
| `expense` | `#E05C5C` |
| `expense-bg` | `#FEEDED` |
| `khumus` | `#F0B429` |
| `khumus-bg` | `#FFF8E0` |
| `loan` | `#C48A00` |
| `loan-bg` | `#FFF3D0` |
| `pending` | `#3B82F6` |
| `pending-bg` | `#EFF6FF` |

**Font families:**
- `sans` → `PlusJakartaSans` (all weights, for UI copy)
- `mono` → `SpaceMono` (for all currency/number values)

### `global.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### `metro.config.js`
Wraps the default Expo metro config with `withNativeWind`. Exact content:
```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: './global.css' });
```

### `babel.config.js`
Adds `nativewind/babel` plugin after `babel-preset-expo`.

---

## 5. Theme System (`src/theme/`)

### `colors.ts`
Exports all 20 tokens as a typed `const` object and a `ColorToken` union type.

### `fonts.ts`
Exports font family name string constants matching what `expo-font` registers:
- `PlusJakartaSans_400Regular`
- `PlusJakartaSans_500Medium`
- `PlusJakartaSans_700Bold`
- `SpaceMono_400Regular`
- `SpaceMono_700Bold`

### `spacing.ts`
4pt grid: numeric keys 1–12 (values 4–48px), plus named aliases `marginEdge` (20), `gutter` (16), `stackSm` (8), `stackMd` (16), `stackLg` (24).

### `index.ts`
Re-exports `colors`, `fonts`, `spacing` and their types.

---

## 6. App Bootstrap (`App.tsx`)

1. Call `useFonts()` which returns `[fontsLoaded, fontError]`.
2. While `!fontsLoaded && !fontError` return `null` — Expo splash screen stays visible. If `fontError` is truthy, log with `console.error('Font load error:', fontError)` and proceed to render (system fonts will be used as fallback; do not hang indefinitely on the splash screen).
3. `SafeAreaProvider` requires no special `edges` or `mode` config — defaults are correct. `NavigationContainer` with `react-native-screens` handles bottom inset for the tab bar automatically.
4. Render:
```tsx
<SafeAreaProvider>
  <StatusBar style="dark" backgroundColor="transparent" translucent={false} />
  <NavigationContainer>
    <RootNavigator />
  </NavigationContainer>
</SafeAreaProvider>
```

Provider order: `SafeAreaProvider` outermost so all screens can call `useSafeAreaInsets()`; `NavigationContainer` inside it so the tab bar bottom padding respects the home indicator.

---

## 7. Navigation

### `RootNavigator.tsx`
Native stack with a single registered screen named `"MainTabs"` whose `component` is `BottomTabNavigator`. The stack contains only this screen at setup time. Future modal screens (e.g. the Add transaction flow) will be registered as additional `<Stack.Screen>` entries so they push on top of and cover the tab bar.

```tsx
<Stack.Navigator screenOptions={{ headerShown: false }}>
  <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
</Stack.Navigator>
```

### `BottomTabNavigator.tsx`
Five tabs. Tab bar style:

```
backgroundColor: #FFFFFF
borderTopWidth: 0.5
borderTopColor: #EEE8F8
height: 64
activeTintColor: #1E1058
inactiveTintColor: #C0B8E0
```

| Tab | Screen | Icon (Ionicons) | Label |
|---|---|---|---|
| Home | HomeScreen | `home` | "Home" |
| History | HistoryScreen | `time-outline` | "History" |
| **Add** | AddScreen | — | hidden |
| Reports | ReportsScreen | `bar-chart-outline` | "Reports" |
| Settings | SettingsScreen | `settings-outline` | "Settings" |

**FAB tab (Add):** The Add tab uses these options:
```tsx
tabBarShowLabel: false,   // hides label space entirely — no ghost text below FAB
tabBarButton: (props) => <FABButton {...props} />,
```
`FABButton` is a component defined in `BottomTabNavigator.tsx`:
- Outer wrapper: `View` with `style={{ position: 'absolute', bottom: 20, alignSelf: 'center' }}`
- `TouchableOpacity`: 60×60, `borderRadius: 30`, `backgroundColor: '#1E1058'`, `justifyContent: 'center'`, `alignItems: 'center'`
- Icon: `Ionicons` name `"add"`, size 32, color `"#EDD900"`
- Shadow (iOS): `shadowColor: '#1E1058'`, `shadowOffset: { width: 0, height: 4 }`, `shadowOpacity: 0.25`, `shadowRadius: 8`
- Elevation (Android): `elevation: 8`

---

## 8. Placeholder Screens

Each of the five screens renders a centred `<Text>` label on a `surface-bg` (`#F5F4FC`) background. No logic, no state. They exist solely to confirm navigation works.

---

## 9. Design Reference

The `stitch_financial_reports_screen/` directory contains HTML prototypes and PNG screens from the "Calm Finance" design system. Typography, colour usage, and spacing in future screens should follow `DESIGN.md` in that directory.

---

## 10. Success Criteria

- `expo start` launches without errors or warnings
- All five tabs are tappable and navigate correctly
- FAB is visually elevated above the tab bar
- `src/theme/colors.ts` exports all 20 colour tokens
- `tailwind.config.js` contains all brand colours
- Fonts load before any screen renders
