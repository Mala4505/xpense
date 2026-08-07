# Xpense — Full App Review: Findings & Fix Plan

Generated 2026-08-07 from a full-app review (5 parallel subagent passes: DB/business logic, native Android, theme/design-system, React hooks, build/APK readiness) plus a clean `npx tsc --noEmit` (zero type errors — everything below is a runtime/logic/config issue, not a type error).

Work top to bottom. Each phase is independently shippable; don't start a later phase until the one before it is done, since a couple of native/build fixes (Phase 4/5) require a `prebuild` that later phases don't depend on.

---

## Decisions already made (don't relitigate)
- **AnimatedThemeToggle's SVG-based animation stays as-is.** DESIGN.md nominally specifies Ionicons + 200ms opacity cross-fade; the current hand-drawn SVG morph is being kept intentionally. Not a bug, not in scope.
- **Shadow color fix scope:** unify shadow color only (not the app's actual brand purple/navy used for buttons, chips, active states, etc.). New `colors.shadow` token replaces all `shadowColor` usages (both the pure-black ones and the ones currently using `colors.brandNavy`). Proposed values — confirm before implementing:
  - Light: `#332B45`
  - Dark: `#0F0C18`

---

## Phase 1 — Data correctness (P0, do first)
Money/state can silently end up wrong. Fix before building anything else.

- [x] **AddSheet.tsx edit path never got the loan refactor.** [`src/components/AddSheet.tsx:218-227`](src/components/AddSheet.tsx#L218-L227) still uses old logic: always creates a *new* loan instead of settling an existing one via `findOldestOpenLoan`/`LOAN_TYPE_BY_CATEGORY`, and never sets `paid_amount`. Port the same logic already used in `AddScreen.tsx`/`StepNote.tsx`; import `LOAN_TYPE_BY_CATEGORY` from `src/utils/loanCategories.ts` instead of the duplicated local map at `AddSheet.tsx:48`.
- [x] **`updateTransaction` doesn't recompute `khumus_share`.** [`src/queries/transactions.ts:46`](src/queries/transactions.ts#L46) — editing amount or category on a khumus-eligible transaction leaves the old share stale. Recompute (or null out) `khumus_share` on every update based on the new amount/category.
- [x] **Overlay store doesn't fully reset between uses.** [`src/stores/overlayStore.ts:48-57`](src/stores/overlayStore.ts#L48-L57) — `resetOverlay`'s `initialState` is missing `selectedCategoryId` and `personName`, so they survive a reset (zustand `set()` is a shallow merge). Add both to `initialState`.
- [x] **Category reorder writes group-local index into a global column.** [`src/queries/categories.ts:51`](src/queries/categories.ts#L51) + [`src/screens/CategoryManagementScreen.tsx:894`](src/screens/CategoryManagementScreen.tsx#L894) — `reorderCategories` sets `sort_order = 0..n-1` per group (income/expense are reordered separately), colliding order values across groups and scrambling `getAllCategories ORDER BY sort_order` everywhere it's consumed (AddSheet/AddScreen category grids). Needs a sort-order scheme that's unique per row regardless of group (e.g. offset each group's range, or store order per-group-per-tab). Also: `onStartShouldSetPanResponder` returns true on a plain tap, not just a drag — gate the reorder write on actual movement, not press.

## Phase 2 — Data correctness (P1)
Wrong results in specific, less-common states.

- [x] **Loan settlement: exact float compare, no repayment spill-over.** [`src/queries/loans.ts:86`](src/queries/loans.ts#L86) `refreshLoanStatus` — use an epsilon for the `>=` compare; decide whether overpayment should spill into the next open loan for that person or just cap at 0 remaining (currently goes negative).
- [x] **Same-transaction loan-creation + repayment miscounts.** [`src/screens/AddScreen.tsx:228`](src/screens/AddScreen.tsx#L228) — a "Loan Given" transaction with `status: partial` and a paid amount carries both the new `loan_id` and a `paid_amount > 0`, so it double-counts as a repayment of the loan it just created.
- [x] **Deleting a repayment doesn't unwind loan status.** [`src/screens/HistoryScreen.tsx:128`](src/screens/HistoryScreen.tsx#L128) `deleteTransaction` — call `refreshLoanStatus` after delete so a loan doesn't stay stuck `settled`.
- [x] **Backup/restore is incomplete — real data-loss risk.** [`src/utils/export.ts:208`](src/utils/export.ts#L208), [`src/screens/SettingsScreen.tsx:531-548`](src/screens/SettingsScreen.tsx#L531-L548) — export only captures transactions; categories, loans, and budgets aren't included, and `loan_id`/`paid_amount` are dropped on restore. This is the only recovery mechanism (no cloud sync) — needs to cover all four tables, validate row shape before insert, and match categories by stable id, not name.
- [x] **Deleting a category orphans transactions.** [`src/queries/categories.ts:47`](src/queries/categories.ts#L47) `deleteCategory` — no cascade/reassignment, so Reports' category breakdown stops summing to the displayed total, and lingering budget rows for the deleted category are never cleaned up. Decide: block delete if transactions exist, reassign to "Uncategorized," or cascade-delete.
- [x] `initPromise` in [`src/db/database.ts:9`](src/db/database.ts#L9) ignores the `db` argument on repeat calls — if `SQLiteProvider` ever remounts with a new handle, table creation/seeding is skipped for it. Low priority unless you're seeing fast-refresh DB weirdness.

## Phase 3 — Dark mode / visual regressions
- [x] **Home screen reintroduces the card-on-card bug DESIGN.md names by name.** [`src/screens/HomeScreen.tsx:429`](src/screens/HomeScreen.tsx#L429) (foreground sheet) and [`src/components/ui/TransactionRow.tsx:259`](src/components/ui/TransactionRow.tsx#L259) (rows) both resolve to `surfaceCard` in dark mode — rows are invisible against the sheet. Also `HomeScreen.tsx:291` puts the screen root itself on `surfaceCard` instead of `surfaceBg`. Fix: screen root and sheet container → `surfaceBg`; only individual rows/cards → `surfaceCard`.
- [x] **Hardcoded light-mode hex left in partially-migrated components:**
  - [`src/components/overlay/StepAmount.tsx:150`](src/components/overlay/StepAmount.tsx#L150), [`StepNote.tsx:251`](src/components/overlay/StepNote.tsx#L251), [`StepCategory.tsx:384`](src/components/overlay/StepCategory.tsx#L384) — cancel-button fill hardcoded `#F0EAF8`; should be `colors.surfaceElevated`/`colors.brandPale`.
  - [`StepCategory.tsx:344`](src/components/overlay/StepCategory.tsx#L344) — info strip hardcoded `#EFF6FF` (light-mode `pendingBg`); should be `colors.pendingBg`.
  - [`src/components/home/PendingStrip.tsx:54,81`](src/components/home/PendingStrip.tsx#L54) — border/text hardcoded `#BFDBFE`/`#1D4ED8`; should be theme tokens matching the already-correct `colors.pendingBg` used elsewhere in the same component.
- [x] **Reports chart gradient fill isn't theme-aware.** [`src/screens/ReportsScreen.tsx:162-167`](src/screens/ReportsScreen.tsx#L162-L167) — `<LinearGradient>` stop colors hardcoded to light-mode `income`/`expense` hex while the stroke/dots below correctly use `colors.income`/`colors.expense`. Switch gradient stops to theme tokens.
- [x] **Unify shadow color** per the Decisions section above — replace pure-black shadows ([`HomeScreen.tsx:45`](src/screens/HomeScreen.tsx#L45) `iosShadow`, [`HeroCards.tsx:109`](src/components/home/HeroCards.tsx#L109), [`CategoryManagementScreen.tsx:696`](src/screens/CategoryManagementScreen.tsx#L696), [`OnboardingCategorySetupScreen.tsx:314`](src/screens/onboarding/OnboardingCategorySetupScreen.tsx#L314), [`OnboardingWelcomeScreen.tsx:216`](src/screens/onboarding/OnboardingWelcomeScreen.tsx#L216)) and the 18 `colors.brandNavy`-as-shadow sites with the new `colors.shadow` token. Add the token to `lightColors`/`darkColors` in `src/theme/colors.ts` first.

## Phase 4 — Native Android robustness
- [x] **Template/generated-file drift will silently reintroduce a crash.** `plugins/src/OverlayActivity.kt` (the prebuild source-of-truth template) is missing a try/catch guard around `onUserLeaveHint()` that's present in the currently-checked-out generated `android/app/src/main/java/com/mala455/Xpense/OverlayActivity.kt`. `withOverlayActivity.js` unconditionally overwrites from the template on every prebuild — any `expo prebuild --clean` wipes the fix. **Port the guard into the template**, not just the generated file.
- [x] **BackTapService starts unconditionally on cold start**, even when the user has disabled back-tap in settings — `MainActivity.onCreate` calls `startService` unconditionally; `App.tsx` only calls `.stop()` after JS hydrates. A foreground-service notification briefly flashes for users who opted out. Fix: gate the native start on the persisted setting (read it natively before starting, or don't auto-start and let JS call `.start()` when enabled).
- [x] **Missing Play-required manifest property** for the `specialUse` foreground service type: `<property android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE" .../>` is absent — required for SDK 34+, risks Play Console rejection. Add via `withBackTapService.js`'s manifest injection.
- [x] **Accelerometer subscribes at ~50Hz regardless of overlay-permission grant** (only checked at fire-time in `fireOverlayIntent`) — battery drain for users who denied the permission. Gate subscription on `Settings.canDrawOverlays()`. Also fix the `lateinit sensorManager` crash risk in `onDestroy` if the service is destroyed before `onStartCommand` runs (null-check or initialize eagerly).
- [x] **No `onNewIntent` override on `OverlayActivity`** — backgrounding (Home button) instead of dismissing leaves a stale instance; a repeat back-tap/QS-tile trigger resumes the old step instead of restarting the flow. Add `onNewIntent` to refresh intent extras and reset the RN-side flow.
- [x] Low priority: [`src/components/overlay/StepNote.tsx:152-156`](src/components/overlay/StepNote.tsx#L152-L156) `handleDone()` only logs a failed save to console — add a visible error state so the user knows a save failed while the overlay is still open.

## Phase 5 — Build / APK readiness
Do this phase right before you build.

- [x] **`react-native-screens` patch is silently never applied.** `patch-package` isn't a dependency and isn't wired into `postinstall.js`. Either add `patch-package` + a `postinstall` step that runs it, or delete `patches/react-native-screens+4.23.0.patch` if it's stale/abandoned.
- [x] **`expo-notifications` isn't registered in `app.json`'s `plugins` array**, so the generated manifest never declares `POST_NOTIFICATIONS` — permission prompts silently never fire on Android 13+. Add `"expo-notifications"` to `plugins` (with icon/color config as needed), then re-run `expo prebuild`.
- [x] **14 packages are behind their expected Expo SDK 55 patch versions.** Run `npx expo install --check` and accept the recommended bumps before building, to avoid native-module ABI mismatches at Gradle/CMake link time.
- [x] **No EAS profile produces a local APK directly** (default is AAB). Either keep using `expo run:android` (produces APK, unaffected by eas.json), or add `"android": {"buildType": "apk"}` to the `preview` profile in `eas.json` if you want EAS to build one.

## Phase 6 — Minor / polish (optional, low risk either way)
- [x] Toast auto-dismiss timer doesn't reset on rapid re-triggers — [`src/components/ui/Toast.tsx:16-20`](src/components/ui/Toast.tsx#L16-L20), key the effect off `message`/`subMessage` or a toast id, not just `visible`.
- [x] `React.memo` on `TransactionRow` is neutralized by inline arrow-function props at every call site (`HistoryScreen.tsx:144-145`, `RecentList.tsx:74`) — harmless, but wrap callbacks in `useCallback` if you want the memoization to actually do anything.
- [x] Category drag-reorder can visually snap back before the DB refresh resolves — `incomeSplit`/`expenseSplit`/`loanItems` in `CategoryManagementScreen.tsx` (~line 880-890) aren't memoized, so any unrelated re-render recreates them and resets `DraggableCategoryGroup`'s local order. Wrap in `useMemo` keyed on `[categories, pinnedCategoryNames]`.
- [x] "0 days left" shown on the final day of the month in `BudgetCard.tsx:35` / `WeeklyPaceView.tsx:122`.
- [x] A few unguarded async fetches with no cancellation on unmount/rapid re-open: `AddSheet.tsx:119-161`, `StepCategory.tsx:46-48`, `WeeklyPaceView.tsx:57` (contrast with the correctly-guarded `useNoteSuggestions.ts`, which is the pattern to copy).
- [ ] `getTopNotesForCategory`'s `HAVING cnt > 1` means a note must be typed twice before it's ever suggested — may or may not be intended.
