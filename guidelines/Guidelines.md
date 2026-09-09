## Overview

This system lives on a dark navy canvas (`{colors.canvas}` — #0A0D3A) — the same dark surface now covers the sidebar, the wrapper, *and* the main content area, so there is no separate light content plane anymore. A vivid indigo (`{colors.primary}` — #5865F2) carries every primary action and active state, with a hot pink (`{colors.accent}` — #EC48BD) as the secondary/attention accent and a bright green (`{colors.success}` — #35ED7E) reserved for success/running states. Panels and cards lift off the base with two dark elevations — a navy panel tone (`{colors.secondary}` / `{colors.muted}` — #1E2353) and a dark charcoal card tone (`{colors.card}` — #23272A). Nothing here is warm or paper-toned; the whole system reads as one continuous dark surface with saturated indigo/pink punctuation, built for long focused sessions in low light.

The brand anchor is **Indigo** (`{colors.primary}` — #5865F2) — it owns the primary CTA, active states, rings, and focus outlines. Around it sits **Pink** (`{colors.accent}` — #EC48BD), used for the secondary accent, gradients, and highlight badges. Surfaces stack in dark layers — the navy background, the slightly-lighter navy panel/popover surface, and the dark charcoal card surface — with the Sidebar/Wrapper (`{colors.sidebar}`) using the exact same navy as the page background, since this is a dark-only app (see **Dark-only, by design** below).

Geometry is soft and generous, unchanged from the previous iteration. Everyday controls round at `{rounded.sm}` (12px) and `{rounded.lg}` (16px); media tiles and feature panels bow out at `{rounded.xl}` (40px) and beyond; the most expressive shapes reach `{rounded.jumbo}` (120px) and pill caps.

**Key Characteristics:**
- Dark navy canvas (`{colors.canvas}`) everywhere — sidebar, wrapper, *and* main content share the same dark base; there is no light content plane.
- Two accent colours: Indigo (`{colors.primary}`) owns CTAs, active states, rings, and focus; Pink (`{colors.accent}`) carries secondary emphasis, gradients, and badges.
- Green (`{colors.success}`), amber (`{colors.warning}`), and red (`{colors.destructive}`) are reserved for semantic status only — success/running, warning, and error/destructive respectively. Never use them decoratively.
- Confident, medium-weight display type set over generously rounded content cards — legible first, expressive second.
- Soft geometry: 12–16px on controls, 40px+ on media, up to `{rounded.jumbo}` on signature shapes.
- Page rhythm: every surface is dark; depth comes from layering navy → panel → card, not from a light/dark contrast pairing.

## Dark-only, by design

This app currently ships **one theme**: dark. `:root` and `.dark` in `theme.css` intentionally hold identical values, and `<html>` carries `class="dark"` so that Tailwind's `dark:` utility variants (used throughout the shadcn `ui/` primitives) resolve correctly instead of silently going unused. The Settings page still shows a Light/Dark/System picker as a placeholder for future work — it is not wired to anything yet. If/when a real light theme is built, split the values in `:root` from `.dark` and wire that picker up; until then, treat every surface in this app as dark.

## Colors

### Brand & Accent
- **Primary Accent — Indigo** (`{colors.primary}` — #5865F2): The main brand colour. Primary CTA fill, active/selected states, focus rings (`{colors.ring}` — rgba(88,101,242,0.60)), input borders. The single most-used action colour.
- **Secondary Accent — Pink** (`{colors.accent}` — #EC48BD): The supporting accent. Gradient end-stops, highlight badges, "info/memory" tags — the counterweight to Indigo.
- **Success / Running — Green** (`{colors.success}` — #35ED7E): Success states, active/running indicators, positive chart series.
- **Warning — Cyan** (`{colors.warning}` — #00B0F4): Used for warning/attention states in this system (not the conventional amber — amber (#f59e0b) is reserved separately for build/CI "modify" style badges).
- **Destructive — Red** (`{colors.destructive}` — #B85450): Errors, deletions, failed states. *Known inconsistency:* this is a legacy brownish red left over from the previous olive palette rather than a saturated red; several components hardcode `#ef4444`/`#dc2626` instead. Standardize on one before shipping new destructive UI (see `colors.ts` TODOs).
- **Link**: Reuses Indigo (`{colors.primary}`) for inline links.

### Surface
- **Background Base** (`{colors.canvas}` — #0A0D3A): The overall page background — sidebar, wrapper, *and* main content. Dark navy, not a light neutral.
- **Panel / Popover / Muted** (`{colors.secondary}` / `{colors.muted}` — #1E2353): Panels, popovers, muted fills, input backgrounds, table headers — a step lighter than the base to read as "lifted."
- **Card** (`{colors.card}` — #23272A): Cards, tables, and terminal-style panels — dark charcoal, a distinct hue from the panel tone rather than a lighter shade of it.
- **Sidebar / Wrapper** (`{colors.sidebar}` — #0A0D3A): Persistent navigation and outer window chrome. Currently identical to Background Base (see **Dark-only, by design**) rather than a separate darker anchor — this used to be the system's one dark surface when content was light; now that content is also dark, the sidebar no longer needs a heavier tone of its own, but it also has no visual separation from the content it sits beside. Consider giving it a distinct value (e.g. pure black `{colors.outer}` — #000000, already used for the outermost wrapper) if that flatness becomes a problem.

### Text
- **Text on Dark** (`{colors.foreground}` — #FFFFFF): Default text on all surfaces — background, card, and popover all use pure white foreground.
- **Muted Text** (`{colors.muted-foreground}` — #B5B9DE): Secondary/tertiary text on dark surfaces.
- **Sidebar Text**: Sidebar-specific text uses white at varying opacity (`rgba(255,255,255,0.55/0.80/0.95)`) rather than a separate hue, for active/hover/default states.

### Border
- **Border** (`{colors.border}` — rgba(255,255,255,0.14)): Dividers and card outlines, a white tint at low opacity rather than a standalone hue — works because every surface is dark.
- **Border Subtle** (rgba(255,255,255,0.08)): Lower-emphasis dividers (e.g. between list rows).

## Typography

### Font Family
- **Display face** — a heavy, confident grotesque for headlines, set at 700–800 weight.
- **Body companion** — a lighter weight of the same family (or a matching humanist sans) for lead paragraphs, links, and buttons (weight 500).
- **UI sans** — Pretendard Variable (see `index.html`), the in-product sans used for dense body copy (16px / 400).

**Note on font substitutes:** pair a confident geometric grotesque — **Hanken Grotesk** or **Space Grotesk** at 700–800 — for display, with **Inter** or **Plus Jakarta Sans** for body and UI. Keep headlines bold and tracked tight; confident weight is the brand's voice, not volume.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.display-xl}` | 82px | 800 | 1.0 | 0 | Hero headline |
| `{typography.display-lg}` | 62px | 800 | 1.05 | 0 | Marquee band, major headline |
| `{typography.display-md}` | 56px | 700 | 1.05 | 0 | Section headline, CTA band |
| `{typography.heading-lg}` | 48px | 700 | 1.1 | 0 | Sub-section heading |
| `{typography.heading-sm}` | 22px | 700 | 1.2 | 0 | Card heading, step label |
| `{typography.body-lg}` | 20px | 500 | 1.4 | 0 | Lead paragraph |
| `{typography.link-lg}` | 18px | 500 | 1.4 | 0 | Large button label, prominent link |
| `{typography.body}` | 16px | 400 | 1.5 | 0 | Default body copy |
| `{typography.link}` | 16px | 500 | 1.4 | 0 | Nav link, button label |
| `{typography.link-sm}` | 14px | 500 | 1.4 | 0 | Small link, badge, fine print |

### Principles
- Headlines are short and declarative, set at 700–800 — the most prominent element on the page, without resorting to all-caps.
- Body copy drops to the lighter 400–500 weight so the display type stays the visual lead.
- The display-to-body weight jump (800 → 400/500) is deliberate; there is no timid mid-weight in between.

## Layout

### Spacing System
- **Base unit**: 8px.
- **Tokens**: `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 20px · `{spacing.xl}` 24px · `{spacing.xxl}` 32px · `{spacing.section}` 40px.
- Card interiors run `{spacing.xl}`–`{spacing.section}`; buttons pad `{spacing.sm}`–`{spacing.lg}` vertical by `{spacing.xl}` horizontal.

### Grid & Container
- Centered max-width content column (~1200px) on the full-bleed dark navy Background Base.
- Feature sections alternate a two-column split (text + media) with stacked full-width Indigo or Pink accent cards.
- CTA and showcase bands are full-bleed colour fields with their own rounded inner containers.

### Whitespace Philosophy
Sections breathe through large vertical gaps of Background Base, occasionally broken by an Indigo/Pink gradient band for rhythm. Inside cards, generous padding lets content and screenshots float with air even though the surrounding surface is dark.

### Responsive Strategy

#### Breakpoints
| Name | Width | Key Changes |
|---|---|---|
| Mobile | < 768px | Single column; sidebar collapses to icon rail; CTAs stack full-width |
| Tablet | 768–1023px | Two-column splits begin stacking; accent cards go full-width |
| Laptop | 1024–1279px | Container narrows; multi-column grids retained |
| Desktop | ≥ 1280px | Full multi-column grids; centered ~1200px column |

#### Touch Targets
`{components.button-primary}` and `{components.button-secondary}` clear ≥44px tap height via their vertical padding. Nav links and list rows meet the same minimum on mobile.

#### Collapsing Strategy
The Sidebar/Wrapper nav (logo · links · profile · primary CTA) collapses to an icon-only rail below 768px. Two-column feature rows stack media-over-text; accent cards span full width. Wide tables become horizontally scrollable; ranked/list rows keep their layout but drop secondary columns.

#### Image Behavior
Product screenshots sit inside rounded media frames (`{rounded.lg}`–`{rounded.xl}`) or bleed past card edges as accents. Media scales fluidly within its container and keeps its corner radius at every width.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 — Flat | No shadow; separation by colour field + large radius | Most cards, colour bands |
| 1 — Soft float | Diffuse dark shadow, e.g. `0 2px 12px rgba(0,0,0,0.32)` | Floating cards, popovers, elevated panels |

Since every surface is now dark, depth comes primarily from stepping through Background Base → Panel/Muted → Card (`#0A0D3A` → `#1E2353` → `#23272A`), not from a light-vs-dark contrast pairing the way the old sidebar/content duotone worked. The one defined shadow is a diffuse dark glow that lifts elevated cards off the Background Base without a hard edge.

### Decorative Depth
- Depth comes from three dark tones layered in sequence — Background Base, Panel, and Card — rather than from motion or gradient.
- The Indigo→Pink gradient (`{gradient.header}` — `linear-gradient(135deg, #0A0D3A, #1E2353, #5865F2, #EC48BD)`) is the one recurring decorative element, used sparingly on page headers and banners.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 6px | Small ghost buttons, compact chips |
| `{rounded.sm}` | 12px | Primary / secondary CTA buttons, links, table cells |
| `{rounded.md}` | 14px | Rank/list rows, mid controls |
| `{rounded.lg}` | 16px | Surface buttons, cards, media frames |
| `{rounded.xl}` | 40px | Accent feature panels, large media tiles |
| `{rounded.pill}` | 50px | Pill caps, badges, avatar chips |
| `{rounded.jumbo}` | 120px | Signature oversized rounded shape cards |
| `{rounded.full}` | 9999px | Circular avatars and icon buttons |

### Photography Geometry
Media is presented at soft-cornered rectangles (`{rounded.lg}`–`{rounded.xl}`), never hard-edged. Avatars and circular icon controls are fully round.

## Components

> No hover states documented. Component specs cover Default and Active/Pressed only; variants are separate `components:` entries.

### Buttons

**`button-primary`** — the Indigo pill CTA
- Background `{colors.primary}`, text `{colors.foreground}`, type `{typography.link-lg}`, rounded `{rounded.sm}`, padding `{spacing.lg} {spacing.xl}`. The everyday action button.

**`button-secondary`** — the Pink alternate-action CTA
- Background `{colors.accent}`, text `{colors.foreground}`, type `{typography.link-lg}`, rounded `{rounded.sm}`, padding `{spacing.sm} {spacing.xl}`. Used where a second, lower-emphasis action sits next to the primary one.

**`button-surface`** — card-toned solid button
- Background `{colors.card}`, text `{colors.foreground}`, type `{typography.link}`, rounded `{rounded.lg}`, padding `{spacing.xs} {spacing.md}`.

**`button-ghost`** — translucent button on the Sidebar/Wrapper
- Background `rgba(255,255,255,0.06)`, text `{colors.foreground}`, type `{typography.link}`, rounded `{rounded.lg}`, padding `{spacing.md}`.

**`button-ghost-sm`** — compact ghost button (sidebar CTA row)
- Background `rgba(255,255,255,0.06)`, text `{colors.foreground}`, type `{typography.link-sm}`, rounded `{rounded.xs}`, padding `{spacing.sm} {spacing.xxl}`.

### Cards & Containers

**`feature-card-accent`** — Indigo accent feature panel
- Background `{colors.primary}`, inverse text `{colors.foreground}`, `{rounded.xl}` (40px), padding `{spacing.section}`.

**`feature-card-surface`** — card-toned feature panel
- Background `{colors.card}`, text `{colors.foreground}`, `{rounded.xl}`, padding `{spacing.xxl}`.

**`stat-card`** — big-number stat card
- Background `{colors.primary}` (Indigo), inverse text, headline at `{typography.display-md}`, `{rounded.xl}`, padding `{spacing.xxl}`.

**`step-card`** — numbered step panel (1/2/3 process)
- Background `{colors.accent}` (Pink), inverse text, label at `{typography.heading-sm}`, `{rounded.lg}`, padding `{spacing.xl}`.

**`cta-band`** — full-bleed Indigo→Pink gradient CTA band
- Background `{gradient.indigo}` (`linear-gradient(135deg, #5865F2, #EC48BD)`), inverse headline at `{typography.display-md}`, `{rounded.xl}`, padding `{spacing.section}`.

### Navigation

**`sidebar-nav`** — dark persistent sidebar
- Background `{colors.sidebar}`, text `{colors.foreground}` links at `{typography.link}`, padding `{spacing.md} {spacing.xl}`. Slots: logo · nav links · profile/settings · an Indigo primary CTA. Collapses to an icon-only rail below 768px.

## Do's and Don'ts

### Do
- Lead with the dark navy Background Base (`{colors.canvas}`) — it now covers every surface, not just the sidebar.
- Use `{colors.primary}` Indigo for the primary action on a screen; reserve `{colors.accent}` Pink for the secondary or alternate action.
- Keep body text on `{colors.foreground}` white for legibility; drop to `{colors.muted-foreground}` for secondary/tertiary text.
- Round generously — `{rounded.sm}`–`{rounded.lg}` on controls, `{rounded.xl}`+ on media and feature panels.
- Pull every colour from `colors.ts` / `theme.css` tokens, not a hardcoded hex — see the TODOs left in `colors.ts` for known unmigrated spots (`CTA_BG`, `FILE_COLORS`, `CHANGE_*`, `BRANCH_COLORS`, `CODE_*`, `STATUS_ERROR`) before copying their values into new code.

### Don't
- Don't reintroduce a light content plane without deliberately building a real light theme (split `:root` from `.dark` in `theme.css` first) — right now this app is dark-only.
- Don't introduce a third loud accent beyond Indigo and Pink; the semantic status colours (green/cyan/red) are for state, not decoration.
- Don't set headlines in a timid mid-weight — display type is 700–800 or it loses the brand's voice.
- Don't lean on drop shadows for hierarchy; depth comes from Background Base / Panel / Card layering.
- Don't hardcode a hex value that already has a name in `colors.ts` — if the palette changes again, every hardcoded copy is a place someone has to hunt down by hand.
