---
name: Calm Finance
colors:
  surface: '#fef7ff'
  surface-dim: '#e1d3ff'
  surface-bright: '#fef7ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f8f1ff'
  surface-container: '#f3eaff'
  surface-container-high: '#eee4ff'
  surface-container-highest: '#e9ddff'
  on-surface: '#201143'
  on-surface-variant: '#484550'
  inverse-surface: '#362859'
  inverse-on-surface: '#f6edff'
  outline: '#797581'
  outline-variant: '#c9c4d2'
  surface-tint: '#5f559c'
  primary: '#050027'
  on-primary: '#ffffff'
  primary-container: '#1e1058'
  on-primary-container: '#877dc7'
  inverse-primary: '#c8bfff'
  secondary: '#7042c3'
  on-secondary: '#ffffff'
  secondary-container: '#aa7dff'
  on-secondary-container: '#3d0088'
  tertiary: '#695f00'
  on-tertiary: '#ffffff'
  tertiary-container: '#bdad00'
  on-tertiary-container: '#474000'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5deff'
  primary-fixed-dim: '#c8bfff'
  on-primary-fixed: '#1b0b55'
  on-primary-fixed-variant: '#473d82'
  secondary-fixed: '#ebddff'
  secondary-fixed-dim: '#d3bbff'
  on-secondary-fixed: '#260059'
  on-secondary-fixed-variant: '#5825a9'
  tertiary-fixed: '#f9e51d'
  tertiary-fixed-dim: '#dbc900'
  on-tertiary-fixed: '#201c00'
  on-tertiary-fixed-variant: '#4f4800'
  background: '#fef7ff'
  on-background: '#201143'
  surface-variant: '#e9ddff'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  amount-xl:
    fontFamily: Space Mono
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  amount-md:
    fontFamily: Space Mono
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  margin-edge: 20px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
---

## Brand & Style

This design system is built on a foundation of **Corporate Minimalism**, specifically tailored for a premium Android financial experience. It prioritizes clarity and high-end aesthetics to evoke a sense of calm and professional reliability. The interface avoids aggressive gradients or complex shadows, instead using a "Stacked Flat" approach where depth is communicated through distinct tonal layers and subtle color shifts. The target audience values precision and speed, requiring a UI that feels both sophisticated and approachable.

## Colors

The palette is anchored by a deep **Primary Navy**, providing the "hero" weight necessary for high-value components like credit cards and Floating Action Buttons (FABs). A vibrant **Yellow CTA** is used sparingly for primary conversion points to ensure immediate visual hierarchy. 

Functional semantics are clearly delineated: 
- **Income/Expense:** Standard green and red for cash flow.
- **Specialized Assets:** Gold for savings/khumus and Amber for debt-related items.
- **Labels:** A specific high-contrast purple is reserved for metadata and tags to separate secondary information from primary body text.

## Typography

This system utilizes a dual-font strategy. **Plus Jakarta Sans** handles all interface copy, offering a soft, modern humanist feel that remains highly legible on mobile screens. For all financial data, balances, and transaction amounts, **Space Mono** provides a technical, tabular precision that ensures numbers are easy to scan and distinguish. 

- Use **Space Mono** exclusively for currency and mathematical values.
- Use **Plus Jakarta Sans** for all labels, descriptions, and headers.
- Muted text (#9080B8) should be used for descriptions and timestamps to maintain a clean hierarchy.

## Layout & Spacing

The layout follows a **Fluid Grid** model optimized for Android handheld devices. Content is contained within 20px side margins to ensure comfort on curved screens and one-handed use. 

Spacing follows a 4px baseline grid. Vertical rhythm is established through three primary stack sizes (8px, 16px, 24px). Hero cards and list containers should utilize the full width of the margins, while interactive elements like chips use 12px horizontal padding.

## Elevation & Depth

This design system avoids heavy drop shadows in favor of **Tonal Layering**. Depth is achieved by placing elements on the `App background` (#F5F4FC) and using `Soft purple bg` (#EEEAF8) for secondary or inactive containers. 

For the highest level of the stack (Floating Action Buttons and Active Hero Cards), a very soft, low-opacity shadow (#1E1058 at 8% alpha) may be used to provide a subtle "lift." Overlays and bottom sheets use a 28px top-corner radius to clearly signal their position at the top of the z-axis.

## Shapes

The shape language is consistently rounded to reinforce the "friendly yet professional" tone. 
- **Cards:** Use a dual-radius approach; outer containers use 18px while nested items use 16px to create a harmonious concentric look.
- **Buttons:** A fixed 14px radius is applied to all primary and secondary buttons.
- **Inputs:** Slightly sharper at 12px to maintain a functional, "structured" appearance for data entry.

## Components

### Buttons & Interaction
- **Primary CTA:** Solid `Yellow CTA` (#EDD900) with Navy text. Used for "Send," "Pay," or "Confirm."
- **Secondary Button:** Solid `Primary Navy` (#1E1058) with White text. Used for hero actions.
- **Ghost/Inactive:** `Soft purple bg` (#EEEAF8) with `Muted text`.

### Cards
Hero cards (like total balance) use the `Primary Navy` background with `Space Mono` white text. Standard transaction cards use a white background or no background with a bottom border separator of `Soft purple bg`.

### Inputs
Fields should have a `Soft purple bg` fill with no border in their default state. Upon focus, a 1.5px border of `Violet accent` (#9B6EF0) is applied.

### Chips & Tags
Used for categories (e.g., "Food," "Rent"). These use `Purple label` (#5B35D4) text on a `Soft purple bg` container. Status-specific chips (Pending, Income) use 10% opacity versions of their respective semantic colors.

### Bottom Sheets
Always utilize the 28px top-corner radius. The handle bar should be 32px wide, 4px tall, and colored in `Muted text` at 20% opacity.