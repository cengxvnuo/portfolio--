---
name: AIGC Dark Tech Portfolio
colors:
  surface: '#1d100f'
  surface-dim: '#1d100f'
  surface-bright: '#453534'
  surface-container-lowest: '#170b0a'
  surface-container-low: '#261817'
  surface-container: '#2a1c1b'
  surface-container-high: '#352625'
  surface-container-highest: '#41312f'
  on-surface: '#f6ddda'
  on-surface-variant: '#e1bfbb'
  inverse-surface: '#f6ddda'
  inverse-on-surface: '#3c2d2b'
  outline: '#a88a86'
  outline-variant: '#59413e'
  surface-tint: '#ffb4ac'
  primary: '#ffb4ac'
  on-primary: '#690007'
  primary-container: '#ff665c'
  on-primary-container: '#690007'
  inverse-primary: '#b02d29'
  secondary: '#c6c7c2'
  on-secondary: '#2f312e'
  secondary-container: '#484a46'
  on-secondary-container: '#b8b9b4'
  tertiary: '#55dcb4'
  on-tertiary: '#00382a'
  tertiary-container: '#00ad88'
  on-tertiary-container: '#00382b'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad6'
  primary-fixed-dim: '#ffb4ac'
  on-primary-fixed: '#410003'
  on-primary-fixed-variant: '#8e1215'
  secondary-fixed: '#e3e3de'
  secondary-fixed-dim: '#c6c7c2'
  on-secondary-fixed: '#1a1c19'
  on-secondary-fixed-variant: '#464744'
  tertiary-fixed: '#75f9d0'
  tertiary-fixed-dim: '#55dcb4'
  on-tertiary-fixed: '#002117'
  on-tertiary-fixed-variant: '#00513e'
  background: '#1d100f'
  on-background: '#f6ddda'
  surface-variant: '#41312f'
typography:
  display-lg:
    fontFamily: Newsreader
    fontSize: 72px
    fontWeight: '300'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Newsreader
    fontSize: 40px
    fontWeight: '400'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: '400'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Newsreader
    fontSize: 24px
    fontWeight: '400'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  grid-margin: 2rem
  grid-gutter: 1px
  module-padding: 1.5rem
  stack-gap: 0.75rem
---

## Brand & Style
This design system embodies a "Dark Tech" aesthetic tailored for high-end AIGC portfolios. It draws heavily from **Minimalism** and **Glassmorphism**, structured within a **Modular Bento** layout. The brand personality is architectural, cinematic, and authoritative, avoiding the "plastic" tropes of AI design in favor of sophisticated, structural elegance.

The visual narrative is built on high-contrast shifts between deep obsidian surfaces and warm bone-white panels. It prioritizes precision through thin divider lines and intentional whitespace, creating a gallery-like environment where the AI-generated content is the focal point. The emotional response is one of discovery—feeling like a high-level creative studio dashboard rather than a consumer app.

## Colors
The palette is rooted in deep blacks and off-whites to create a premium, timeless feel.
- **Background & Cards:** Use `#0D0F10` for the primary canvas. Modular cards use `#17191B` to create subtle depth without relying on shadows.
- **Accents:** `#FF665C` (Coral Red) is used sparingly for critical calls to action, active states, or notification pips.
- **Light Panels:** `#E9E9E4` is reserved for "Hero" or "Invert" modules where high contrast is needed to highlight specific data or featured work.
- **Lines:** Borders and dividers must remain at `rgba(255,255,255,0.16)` to maintain the "Thin Line" architectural aesthetic.

## Typography
The typographic system uses a high-contrast pairing:
- **Serif (Newsreader):** Used for headlines and editorial storytelling. It adds a literary, "human" quality to counter the tech-heavy aesthetic.
- **Sans-serif (Hanken Grotesk):** Used for body copy and interface elements. It provides a sharp, contemporary feel.
- **Monospace (Geist):** Used for labels, metadata, and technical specs. This reinforces the "Tech" aspect of the portfolio.

Always use low-weight variations for large headings to maintain the architectural lightness.

## Layout & Spacing
The layout follows a **Strict Modular Bento Grid**. 
- **The 1px Rule:** Instead of traditional gutters, use 1px borders between modules to create a seamless, blueprint-like appearance.
- **Bento Logic:** Content is housed in "cells" that span 1, 2, or 3 columns. Vertical heights should be standardized (e.g., Square, Tall, Wide).
- **Safe Margins:** Use 2rem margins on desktop, scaling down to 1rem on mobile. 
- **Alignment:** All text should align to the top-left of its respective module, creating a clear reading path across the grid.

## Elevation & Depth
Depth is created through **Tonal Layers** and **Backdrop Blurs** rather than traditional shadows.
- **Layer 0:** Background (`#0D0F10`).
- **Layer 1:** Modular Cards (`#17191B`) with a 1px border.
- **Layer 2 (Overlays):** Glassmorphic panels. These use a very low-opacity white background (4-8%) with a high `backdrop-filter: blur(20px)`.
- **Contrast:** When a Light Panel (`#E9E9E4`) is used, it should appear physically "inset" or "elevated" by having zero border and sharp 100% opacity.

## Shapes
The design system uses **Soft (0.25rem)** roundedness to maintain a precise, technical feel. 
- **Modules:** Use `rounded-lg` (0.5rem) for main bento cells.
- **Circular Motifs:** Icons, status pips, and profile avatars should be perfect circles (`50%` radius) to contrast with the strict rectangular grid. 
- **In-card Elements:** Small buttons or tags use the base `rounded` (0.25rem) setting.

## Components
- **Bento Cards:** The core component. Must have a 1px border of `rgba(255,255,255,0.16)`. Content should have a standard 1.5rem internal padding.
- **Buttons:** 
  - *Primary:* Solid `#F4F4F0` with `#111111` text. 
  - *Secondary:* Ghost style with 1px border and `#F4F4F0` text.
  - *Accent:* Solid `#FF665C` for high-conversion actions.
- **Chips/Tags:** Monospace font (Geist), small caps, with a light glass background. No borders.
- **Input Fields:** Dark background (`#0D0F10`), 1px bottom-only border for a minimalist, architectural feel. Active state highlights the border in `#FF665C`.
- **Circular Progress/Visuals:** Use thin strokes (1px or 2px) for any data visualization or decorative circular elements to match the divider line weight.
- **Image Treatment:** AIGC assets should have a subtle 5% "noise" overlay to integrate them into the dark UI aesthetic and prevent them from looking disconnected.