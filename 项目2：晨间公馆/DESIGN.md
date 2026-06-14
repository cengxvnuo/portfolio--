---
name: Maison Matin Design System
colors:
  surface: '#fbf9f5'
  surface-dim: '#dbdad6'
  surface-bright: '#fbf9f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3ef'
  surface-container: '#efeeea'
  surface-container-high: '#eae8e4'
  surface-container-highest: '#e4e2de'
  on-surface: '#1b1c1a'
  on-surface-variant: '#4e4444'
  inverse-surface: '#30312e'
  inverse-on-surface: '#f2f0ed'
  outline: '#807474'
  outline-variant: '#d2c3c3'
  surface-tint: '#6a5b5b'
  primary: '#261a1a'
  on-primary: '#ffffff'
  primary-container: '#3c2f2f'
  on-primary-container: '#a99696'
  inverse-primary: '#d6c2c1'
  secondary: '#4e635a'
  on-secondary: '#ffffff'
  secondary-container: '#cee5da'
  on-secondary-container: '#52675e'
  tertiary: '#291b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#432f00'
  on-tertiary-container: '#b9954f'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#f3dedd'
  primary-fixed-dim: '#d6c2c1'
  on-primary-fixed: '#241919'
  on-primary-fixed-variant: '#524343'
  secondary-fixed: '#d1e8dd'
  secondary-fixed-dim: '#b5ccc1'
  on-secondary-fixed: '#0b1f18'
  on-secondary-fixed-variant: '#374b43'
  tertiary-fixed: '#ffdea5'
  tertiary-fixed-dim: '#e9c176'
  on-tertiary-fixed: '#261900'
  on-tertiary-fixed-variant: '#5d4201'
  background: '#fbf9f5'
  on-background: '#1b1c1a'
  surface-variant: '#e4e2de'
typography:
  display-lg:
    fontFamily: Libre Caslon Text
    fontSize: 64px
    fontWeight: '400'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Libre Caslon Text
    fontSize: 40px
    fontWeight: '400'
    lineHeight: '1.2'
  headline-lg:
    fontFamily: Libre Caslon Text
    fontSize: 32px
    fontWeight: '400'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Libre Caslon Text
    fontSize: 24px
    fontWeight: '400'
    lineHeight: '1.4'
  body-lg:
    fontFamily: DM Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: DM Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.5'
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  margin-desktop: 80px
  margin-mobile: 24px
  section-gap: 120px
---

## Brand & Style
The design system embodies the "Shanghai Morning"—a sophisticated intersection of heritage architecture and contemporary leisure. It draws heavily from **High-End Editorial** design movements, prioritizing rhythmic whitespace, asymmetrical balance, and a curated AIGC-inspired aesthetic that feels both ethereal and grounded.

The visual narrative is "Refined Warmth." It avoids the coldness of pure minimalism by using a tactile color palette and soft, natural lighting metaphors. The target audience is the discerning urbanite seeking a sanctuary from the city's pace. The UI should feel like a high-fashion lifestyle magazine: spacious, authoritative, yet deeply inviting.

## Colors
The palette is rooted in organic, culinary tones found in a boutique brunch setting.
- **Cream White (#FDFBF7):** The "Canvas." Used for large background areas to evoke natural morning light.
- **Dark Walnut Brown (#3C2F2F):** The "Ink." Used for primary typography and structural elements to provide weight and prestige.
- **Sage Green (#8DA399):** The "Botanical." Used for secondary UI elements, iconography, and success states, reflecting freshness.
- **Beet Pink (#D47F8C):** The "Garnish." A vibrant accent for highlights, special offers, or critical call-to-actions.
- **Brass Gold (#C5A059):** The "Ornament." Reserved for interactive hints, borders, and premium signifiers.

## Typography
The typography system relies on the contrast between a literary serif and a modern geometric sans-serif. 

**Libre Caslon Text** is used for all editorial headings, menu items, and pull-quotes. It provides an authoritative, historical texture reminiscent of classic Shanghai publishing. 

**DM Sans** provides a clean, functional counterpoint for body copy and navigational elements. Its low-contrast, geometric forms ensure legibility against the cream background. Use `label-caps` for small navigational hints or overlines to create a modern, architectural rhythm.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy inspired by editorial spreads. 
- **Desktop:** A 12-column grid with a maximum content width of 1280px. Margins are intentionally wide (80px) to allow the content to breathe.
- **Mobile:** A 4-column grid with 24px margins.

Spacing is aggressive and generous. Use large vertical gaps (`section-gap`) between different content blocks to emphasize the "slow living" brand ethos. Elements should frequently use asymmetrical offsets—for example, an image spanning columns 1-7 with text starting on column 9—to mimic a magazine layout.

## Elevation & Depth
Depth is achieved through **Tonal Layers** and **Ambient Shadows** rather than traditional skeuomorphism.
- **Surface Hierarchy:** The base layer is Cream White. Elevated elements (like cards or menus) use a subtle "Paper" tint slightly lighter than the background or a very thin 1px Brass Gold border.
- **Shadows:** Shadows must be extremely soft and diffused, imitating natural sunlight. Use high blur radii (30px+) and low opacity (5-8%) with a slight Walnut Brown tint to avoid a "grey/dirty" look.
- **Glassmorphism:** Use sparingly for navigation overlays or mobile drawers, with a heavy backdrop blur (20px) to maintain the soft, morning-light atmosphere.

## Shapes
The design system utilizes **Soft** roundedness (0.25rem). This subtle softening of corners removes the industrial "sharpness" of a digital interface while maintaining the structured, editorial grid. 

Buttons and input fields should strictly follow the `rounded-sm` or `rounded-md` pattern. Photography, however, can occasionally use a `rounded-xl` (1.5rem) or a circular crop to create a more organic, friendly feel within the rigid grid.

## Components
- **Buttons:** Primary buttons use a solid Walnut Brown background with Cream text. Secondary buttons use a Brass Gold outline with Walnut text. All buttons use `label-caps` typography for a "boutique" feel.
- **Input Fields:** Minimalist design—either a simple Walnut bottom-border or a very light Sage-tinted background. Labels should sit above the field in `label-caps`.
- **Cards:** Image-led. The image should occupy at least 70% of the card area. Typography on cards should be clean, using Walnut Brown for titles. No heavy borders; use soft ambient shadows to separate them from the Cream background.
- **Chips/Tags:** Used for menu categories (e.g., "Vegan," "Chef's Special"). Use Sage Green or Beet Pink with 10% opacity backgrounds and full-color text.
- **Dividers:** Use 1px solid Brass Gold lines to separate major editorial sections, often spanning only partial widths of the grid for a more dynamic look.
- **Signature Component (The Menu):** A specialized list component using Serif typography for item names and Sans-serif for descriptions, separated by generous whitespace rather than lines.