---
name: Xpense
description: A fast, one-handed personal expense and budget tracker with Khumus and loan tracking.
colors:
  brand-navy: "#1E1058"
  brand-violet: "#9B6EF0"
  brand-yellow: "#EDD900"
  brand-purple: "#5B35D4"
  brand-pale: "#EEEAF8"
  surface-bg: "#F5F4FC"
  surface-card: "#FFFFFF"
  surface-border: "#EEE8F8"
  surface-elevated: "#EDE9FA"
  text-primary: "#1A1040"
  text-secondary: "#5B35D4"
  text-muted: "#9080B8"
  text-disabled: "#C0B8E0"
  income: "#22C87A"
  income-bg: "#E8F8F0"
  expense: "#E05C5C"
  expense-bg: "#FEEDED"
  khumus: "#F0B429"
  khumus-bg: "#FFF8E0"
  loan: "#C48A00"
  loan-bg: "#FFF3D0"
  pending: "#3B82F6"
  pending-bg: "#EFF6FF"
  dark-surface-bg: "#0A0812"
  dark-surface-card: "#1F1930"
  dark-surface-border: "#4A3F70"
  dark-surface-elevated: "#332A4F"
  dark-brand-navy: "#8B6EF0"
  dark-brand-yellow: "#F0E94A"
  dark-text-primary: "#EDEAF4"
  dark-text-secondary: "#B8AEDB"
typography:
  headerTitle:
    fontFamily: "PlusJakartaSans_700Bold"
    fontSize: "20-22px"
    fontWeight: 700
  body:
    fontFamily: "PlusJakartaSans_400Regular"
    fontSize: "12-14px"
  bodyMedium:
    fontFamily: "PlusJakartaSans_500Medium"
    fontSize: "12-15px"
    fontWeight: 500
  label:
    fontFamily: "PlusJakartaSans_400Regular"
    fontSize: "10px"
  amount:
    fontFamily: "SpaceMono_400Regular"
    fontSize: "12-34px"
    letterSpacing: "-0.3px"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "18px"
  pill: "100px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
components:
  card:
    backgroundColor: "{colors.surface-card}"
    rounded: "{rounded.lg}"
    padding: "14px"
  chip-selected:
    backgroundColor: "{colors.brand-navy}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  chip-unselected:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
---

# Design System: Xpense

## 1. Overview

**Creative North Star: "The Calm Ledger"**

Xpense is a pocket tool, not a dashboard: pulled out for ten seconds to log a coffee or a loan repayment, then put away. Every design choice serves that moment first. The palette is a single warm, confident violet-and-navy identity (never the "navy + gold" fintech cliché, never a gradient-drenched AI-SaaS purple) paired with one loud, happy accent: a mustard-yellow FAB and highlight color that gives the whole app a point of personality against its otherwise restrained lavender-tinted neutrals. Motion is spring-based throughout, never linear or bouncy, so screens feel like physical objects settling into place rather than sliding on rails.

This system explicitly rejects: cold enterprise fintech (dense tables, navy+gold, corporate trust-signaling), gamified consumer finance apps (confetti, streaks, badges), and the generic AI-tool look (saturated purple gradients or glassmorphism used as a default rather than a deliberate choice).

**Key Characteristics:**
- Restrained color strategy: tinted lavender/violet neutrals + one hero accent (yellow) used sparingly (FAB, primary CTA text, highlights)
- Violet (`brandNavy`/`brandPurple`) carries structural weight — buttons, active states, selected chips — while yellow is reserved for the single "happiest" moment per screen
- Pill-shaped chips and rounded-rectangle cards throughout; no sharp corners
- Spring physics (`damping: 22, stiffness: 280` as the default) for nearly all entrance and state-change motion

## 2. Colors

Restrained strategy: tinted neutrals carry the surface, one hero accent (yellow) is used deliberately and sparingly, one secondary accent (violet) carries structural/selected-state weight.

### Primary
- **Ledger Violet** (`#1E1058` light / `#8B6EF0` dark, key `brand-navy`): the structural accent — primary buttons, active tab icon, FAB icon, toast background, selected chips/segments, slider thumb border. Despite the token name "navy", this is actually a deep indigo-violet, not a literal navy blue — it's the color that gives every "this is selected / this is the action" moment its identity.

### Secondary
- **Bright Mustard** (`#EDD900` light / `#F0E94A` dark, key `brand-yellow`): the hero accent. Used on the FAB background and as the one bright highlight (e.g. save-button label, primary stat emphasis). Never used for structural chrome — its rarity is what makes it read as "the happy color" rather than wallpaper.
- **Soft Violet** (`#9B6EF0` light / `#B8AEDB` dark, key `brand-violet`): secondary text, links, icon tints, the moon-state of theme toggles. Lighter and less saturated than the primary violet — reduced chroma at higher lightness, per the extremes rule.

### Neutral
- **Lavender Mist** (`#F5F4FC` light / `#100E19` dark, key `surface-bg`): the app background. Tinted toward the brand's violet hue at very low chroma in both themes — never flat gray or flat black.
- **Card White / Card Ink** (`#FFFFFF` light / `#1A1726` dark, key `surface-card`): card and sheet surfaces, one step lighter (light mode) or lighter (dark mode) than the background.
- **Hairline Lavender** (`#EEE8F8` light / `#2A2438` dark, key `surface-border`): dividers and card borders, always 0.5-1px.
- **Ink** (`#1A1040` light / `#EDEAF4` dark, key `text-primary`): primary text and figures.
- **Muted Violet-Gray** (`#9080B8` light / `#A29BB5` dark, key `text-muted`): secondary labels, timestamps, subtitles.

### Named Rules
**The Tinted Neutral Rule.** No neutral surface or text color is ever pure grayscale (R=G=B) or pure black/white. Every neutral — background, card, border, muted text — carries the brand's violet hue at low chroma. A flat-gray dark mode with a bolted-on accent is the single most common AI-generated dark-theme tell; this system never produces one, in either theme.

**The One Hero Rule.** Yellow appears on at most one element per screen at rest (the FAB, or a single emphasized figure). If a screen has two "loud yellow" moments, one of them is wrong.

**The Card-Needs-a-Floor Rule.** `surface-card` is only ever placed on top of `surface-bg`, never on top of itself. A screen root, sheet, or "foreground layer" container must use `surface-bg`; only the individual cards/rows inside it use `surface-card`. This matters more in dark mode than light mode — WCAG contrast ratio badly underestimates how imperceptible a color step near-black actually is, so a step that reads fine in light mode can be functionally invisible in dark mode. (Home screen's foreground sheet and its transaction rows shared `surface-card` and were indistinguishable in dark mode until fixed — don't reintroduce this.)

## 3. Typography

**Body Font:** Plus Jakarta Sans (400/500/700 weights), with system sans-serif fallback
**Amount/Mono Font:** Space Mono (400/700 weights), used exclusively for currency figures

**Character:** A humanist geometric sans for everything conversational (labels, buttons, section headers) paired with a monospace for money — the mono gives every amount a quiet "this number is exact" precision without needing a calculator-app aesthetic everywhere.

### Hierarchy
- **Header** (700 weight, 20-22px): screen titles only.
- **Title** (700 weight, 15-17px): sheet/modal titles, section emphasis.
- **Body Medium** (500 weight, 12-15px): row labels, primary interactive text.
- **Body** (400 weight, 12-14px): descriptions, input text.
- **Label** (400 weight, 10px, sometimes uppercase + letter-spacing 0.5-0.6): section headers, sublabels, badges.
- **Amount** (mono 400/700, 12-34px, letter-spacing -0.3): every currency figure in the app, from list rows to the big entry-screen amount field.

### Named Rules
**The Mono Money Rule.** Any rendered currency amount uses Space Mono, never the sans body font. This is the one place monospace appears; it never leaks into labels or prose.

## 4. Elevation

Mostly flat, tonal layering over shadows. Cards are distinguished from the background by a lighter fill (`surface-card` vs `surface-bg`) plus a 0.5px hairline border, not by shadow. Shadows appear only for floating/interactive elements that need to visually separate from the whole screen: the FAB, a dragged category row, the toast. Shadow color is never pure black — the FAB and toast shadows sample the same violet-tinted ink as the deepest neutral text color.

### Shadow Vocabulary
- **Floating** (`shadowOffset: {0,4}, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8`): FAB, dragged rows.
- **Ambient** (`shadowOffset: {0,8}, shadowOpacity: 0.3, shadowRadius: 16, elevation: 12`): toast, anything overlaying content.

### Named Rules
**The Flat-By-Default Rule.** Cards, rows, and sheets are flat (border + fill only). Shadow is reserved for things that are temporarily "lifted" off the normal flow — dragging, floating action, transient overlays.

## 5. Components

### Buttons / FAB
- **Shape:** circular (57px, FAB) or pill/rounded-rect (14px radius, primary actions).
- **Primary:** `brand-navy` background, white or `brand-yellow` text, no border.
- **Icon-only (settings rows, chip icons):** `brand-pale` circular chip (30px) behind an Ionicons glyph tinted `brand-purple`.

### Chips (Segments, Status, Categories)
- **Style:** pill radius (100px), 1px border in unselected state.
- **Selected:** `brand-navy` (or semantic color) fill, white/inverse text.
- **Unselected:** `surface-card` fill, `text-muted` text, `surface-border` border.

### Cards / Containers
- **Corner Style:** 16-18px radius, consistently.
- **Background:** `surface-card`.
- **Shadow Strategy:** none at rest (see Elevation).
- **Border:** 0.5px `surface-border`.
- **Internal Padding:** 14-16px.

### Inputs / Fields
- **Style:** `surface-card` fill, 0.5px `surface-border`, 12px radius.
- **Focus:** no distinct focus ring currently (native focus only) — placeholder text uses `text-disabled`.

### Navigation
- **Bottom tab bar:** `surface-card` fill, 0.5px top border, active icon/label tinted `brand-navy`, inactive `text-disabled`. Center tab replaced by a raised circular FAB rather than a normal tab item.

### Theme Toggle (signature component)
Binary Light/Dark switch: a circular `surface-elevated` button holding a sun and a moon Ionicons glyph stacked on top of each other, cross-fading opacity (200ms, ease-in-out) on tap. Both icons stay mounted at all times so there's never a blank moment mid-transition. No system-appearance option — the app always uses the explicit choice.

## 6. Do's and Don'ts

### Do:
- **Do** tint every neutral (background, card, border, muted text) toward the brand violet hue, in both light and dark mode.
- **Do** keep yellow rare — one hero moment per screen, never structural chrome.
- **Do** use Space Mono exclusively for currency figures, never for labels or prose.
- **Do** use spring transitions (`damping: 22, stiffness: 280` default) for entrances and state changes.
- **Do** keep cards and rows flat (border + fill); reserve shadow for floating/dragging/overlay states only.

### Don't:
- **Don't** use flat grayscale neutrals (R=G=B hex values) anywhere, especially not in dark mode — this is the generic AI-dark-theme tell this product explicitly rejects.
- **Don't** use a saturated purple/violet gradient as a default background or hero treatment — this reads as generic AI-tool branding, which PRODUCT.md names directly as an anti-reference.
- **Don't** add confetti, streaks, badges, or other gamification chrome — this is a calm daily-use tool, not a habit-loop app.
- **Don't** introduce navy+gold "trust" fintech styling — it contradicts the warm/friendly personality.
- **Don't** use `border-left`/`border-right` colored stripes as an accent on rows or cards.
