## Overview

This system lives on a warm, paper-toned canvas (`{colors.canvas}` — #F8F5F2) that stays calm and still — no animated mesh, no saturated neon, nothing competing for attention. Where a louder brand shouts in gradient bands, this one whispers in warm neutrals: a soft beige surface (`{colors.surface}` — #F5EFE6) lifts cards and panels off the base, a confident olive (`{colors.primary}` — #708238) carries every primary action, and a grounded brown (`{colors.secondary}` — #A67B5B) fills the secondary layer. The one loud gesture is structural, not chromatic: a near-black olive Sidebar/Wrapper (`{colors.sidebar}` — #131507) anchors every screen, giving the light, airy content real weight without a single saturated hue. The whole system reads like a well-kept study: warm, unhurried, built for long focused sessions rather than a quick jolt of energy.

The brand anchor is **Olive** (`{colors.primary}` — #708238) — it owns the primary CTA, active states, and the brand mark. Around it sits one supporting accent: a warm **Brown** (`{colors.secondary}` — #A67B5B), used for secondary actions, icons, and badges. Surfaces stack in warm lights — the paper canvas, a slightly deeper beige surface (`{colors.surface}`), and the dark olive Sidebar/Wrapper (`{colors.sidebar}`) that never changes regardless of what page is on screen.

Geometry is soft and generous. Everyday controls round at `{rounded.sm}` (12px) and `{rounded.lg}` (16px); media tiles and feature panels bow out at `{rounded.xl}` (40px) and beyond; the most expressive shapes reach `{rounded.jumbo}` (120px) and pill caps. Nothing is sharp. The result is warm and approachable rather than clinical, without tipping into playful.

**Key Characteristics:**
- Warm, paper-toned canvas (`{colors.canvas}`) — flat and still, never animated or saturated; calm is the point.
- One accent colour: Olive (`{colors.primary}`) owns CTAs and active states; warm Brown (`{colors.secondary}`) carries secondary actions and badges.
- The dark olive Sidebar/Wrapper (`{colors.sidebar}`) is the system's only dark surface — a fixed weight anchor against the light content, not a mood gradient.
- Confident, medium-weight display type set over generously rounded content cards — legible first, expressive second.
- Soft geometry: 12–16px on controls, 40px+ on media, up to `{rounded.jumbo}` on signature shapes.
- Page rhythm: light content pages framed by the constant dark Sidebar/Wrapper — no dark hero, no black showcase band, no neon marquee.

## Colors

### Brand & Accent
- **Primary Accent — Olive** (`{colors.primary}` — #708238): The main brand colour. Primary CTA fill, active/selected states, brand mark. The single most-used action colour.
- **Secondary — Brown** (`{colors.secondary}` — #A67B5B): The warm supporting accent. Secondary buttons, icons, badges, and step/rank markers — the counterweight to Olive.
- **Link** (`{colors.link}`): Reuses Olive (`{colors.primary}`) for inline links on light surfaces; falls back to `{colors.ink-inverse}` for links on the dark Sidebar/Wrapper.

### Surface
- **Background Base** (`{colors.canvas}` — #F8F5F2): The overall page background. Warm and clean rather than a cold neutral grey — the default surface behind everything.
- **Surface / Card / Panel** (`{colors.surface}` — #F5EFE6): Elevated cards, panels, popovers, and FAQ rows — a touch heavier than the base to read as "lifted."
- **Sidebar / Wrapper** (`{colors.sidebar}` — #131507): The one dark surface in the system — persistent navigation and outer window chrome. Held over from the product's original dark-olive identity; it is the fixed weight anchor every other surface is measured against.

### Text
- **Text Base** (`{colors.ink}` — #1F1F1F): Default text on all light surfaces (Background Base, Surface). A deep charcoal rather than pure black — easier on the eyes across long sessions.
- **Muted Text** (`{colors.muted}` — rgba(31,31,31,0.65)): Secondary/tertiary text, derived from Text Base at reduced opacity rather than a separate grey.
- **Inverse Text** (`{colors.ink-inverse}`): Reuses Background Base (#F8F5F2) as light text on the dark Sidebar/Wrapper, and on filled Olive or Brown surfaces (buttons, bands, badges).

### Border
- **Border** (`{colors.border}` — rgba(31,31,31,0.12)): Dividers and card outlines, derived from Text Base rather than a standalone hue.

### Depth Anchor
There is no animated brand gradient in this system — that role is filled structurally instead. The near-black Sidebar/Wrapper (`{colors.sidebar}`) sits fixed against the warm Background Base (`{colors.canvas}`) on every screen; that one dark-to-light pairing carries the same signature weight an animated mesh would on a louder brand, just held quiet and constant instead of in motion.

## Typography

### Font Family
- **Display face** — a heavy, confident grotesque for headlines, set at 700–800 weight. Wide and self-assured without needing to be loud.
- **Body companion** — a lighter weight of the same family (or a matching humanist sans) for lead paragraphs, links, and buttons (weight 500).
- **UI sans** — the in-product sans used for dense body copy (16px / 400).

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
- Centered max-width content column (~1200px) on the full-bleed warm Background Base canvas.
- Feature sections alternate a two-column split (text + media) with stacked full-width Olive or Brown accent cards.
- CTA and showcase bands are full-bleed colour fields with their own rounded inner containers.

### Whitespace Philosophy
Sections breathe through large vertical gaps of Background Base, occasionally broken by an Olive or Brown band for rhythm — with the dark Sidebar/Wrapper providing the one constant contrast on every screen. Inside cards, generous padding lets product screenshots and content float with air.

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
The dark Sidebar/Wrapper nav (logo · links · profile · primary CTA) collapses to an icon-only rail below 768px. Two-column feature rows stack media-over-text; accent cards span full width. Wide tables become horizontally scrollable; ranked/list rows keep their layout but drop secondary columns.

#### Image Behavior
Product screenshots sit inside rounded media frames (`{rounded.lg}`–`{rounded.xl}`) or bleed past card edges as accents. Media scales fluidly within its container and keeps its corner radius at every width.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 — Flat | No shadow; separation by colour field + large radius | Most cards, colour bands |
| 1 — Soft float | `0 3px 68px rgba(19,21,7,0.10)` — wide, olive-tinted, very diffuse | Floating media cards, elevated mockups |

This system leans on warm colour layering and radius for depth far more than on shadow. The one defined shadow is a wide, olive-tinted diffuse glow that lifts elevated cards off the Background Base without a hard edge.

### Decorative Depth
- Depth comes from three flat, warm tones layered in sequence — Background Base, Surface, and the dark Sidebar/Wrapper — rather than from motion or gradient.
- Product screenshots may overlap card edges slightly to build foreground/background layering.
- Full-bleed Olive or dark Sidebar/Wrapper bands push depth by contrast against the light canvas scroll.

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
Media is presented at soft-cornered rectangles (`{rounded.lg}`–`{rounded.xl}`), never hard-edged. The hero media block uses a directional bottom-only radius (88px bottom corners) for a swooping base. Avatars and circular icon controls are fully round.

## Components

> No hover states documented. Component specs cover Default and Active/Pressed only; variants are separate `components:` entries.

### Buttons

**`button-primary`** — the Olive pill CTA
- Background `{colors.primary}`, text `{colors.ink-inverse}`, type `{typography.link-lg}`, rounded `{rounded.sm}`, padding `{spacing.lg} {spacing.xl}`. The everyday action button across hero and feature sections.

**`button-secondary`** — the Brown alternate-action CTA
- Background `{colors.secondary}`, text `{colors.ink-inverse}`, type `{typography.link-lg}`, rounded `{rounded.sm}`, padding `{spacing.sm} {spacing.xl}`. Used where a second, lower-emphasis action sits next to the primary one.

**`button-surface`** — light solid button
- Background `{colors.surface}`, text `{colors.ink}`, type `{typography.link}`, rounded `{rounded.lg}`, padding `{spacing.xs} {spacing.md}`.

**`button-ghost`** — translucent button on the dark Sidebar/Wrapper
- Background `rgba(255,255,255,0.06)`, text `{colors.ink-inverse}`, type `{typography.link}`, rounded `{rounded.lg}`, padding `{spacing.md}`.

**`button-ghost-sm`** — compact ghost button (sidebar CTA row)
- Background `rgba(255,255,255,0.06)`, text `{colors.ink-inverse}`, type `{typography.link-sm}`, rounded `{rounded.xs}`, padding `{spacing.sm} {spacing.xxl}`.

### Cards & Containers

**`hero`** — light content hero
- Background Base `{colors.canvas}` field, Text Base `{colors.ink}` headline at `{typography.display-xl}`, lead paragraph, and a CTA pair. The hero media block carries a swooping bottom-only radius.

**`feature-card-accent`** — Olive accent feature panel
- Background `{colors.primary}`, inverse text `{colors.ink-inverse}`, `{rounded.xl}` (40px), padding `{spacing.section}`. Frames a product screenshot or key visual.

**`feature-card-surface`** — raised beige feature card
- Background `{colors.surface}`, text `{colors.ink}`, `{rounded.xl}`, padding `{spacing.xxl}`. Holds product screenshots or secondary mockups.

**`showcase-band-sidebar`** — full-bleed dark showcase band
- Background `{colors.sidebar}`, inverse text `{colors.ink-inverse}`, `{rounded.xl}`, padding `{spacing.section}`. Reuses the one dark tone in the system to frame a hero product demo with maximum contrast.

**`stat-card`** — big-number stat card
- Background `{colors.primary}` (Olive), inverse text, headline at `{typography.display-md}`, `{rounded.xl}`, padding `{spacing.xxl}`.

**`step-card`** — numbered step panel (1/2/3 process)
- Background `{colors.secondary}` (Brown), inverse text, label at `{typography.heading-sm}`, `{rounded.lg}`, padding `{spacing.xl}`.

**`cta-band`** — full-bleed Olive CTA band
- Background `{colors.primary}`, inverse headline at `{typography.display-md}`, `{rounded.xl}`, padding `{spacing.section}`, with a `button-surface` or `button-secondary` CTA.

**`marquee-band`** — scrolling banner band
- Background `{colors.primary}`, inverse display text at `{typography.display-lg}`, padding `{spacing.lg}`.

**`faq-accordion`** — collapsible FAQ row
- Background `{colors.surface}`, text `{colors.ink}`, question at `{typography.link-lg}`, `{rounded.lg}`, padding `{spacing.xl}`.

### Inputs & Forms

> The kit-mirror `ex-*` form surfaces below model inputs against `{rounded.lg}` surfaces and `{colors.surface}` fills, with `{colors.ink}` text and `{colors.border}` outlines.

### Navigation

**`sidebar-nav`** — dark persistent sidebar
- Background `{colors.sidebar}`, inverse `{colors.ink-inverse}` links at `{typography.link}`, padding `{spacing.md} {spacing.xl}`. Slots: logo · nav links · profile/settings · a Olive primary CTA. Collapses to an icon-only rail below 768px.

**`footer`** — light link footer
- Background `{colors.canvas}`, `{colors.ink}` links (muted at `{colors.muted}` for secondary items) at `{typography.link}`, padding `{spacing.section}`, organized into multi-column link groups.

### Signature Components

**`pricing-table`** — plan comparison table
- Surface `{colors.surface}`, body text at `{typography.body}`, `{rounded.lg}`, padding `{spacing.xl}`. Plan columns with the featured tier carrying a `{colors.secondary}` (Brown) badge, each row ending in a `button-primary` "Subscribe".

**`rank-feature`** — top-ranked item card
- Surface `{colors.surface}`, large media, rank number + title at `{typography.heading-sm}`, `{rounded.lg}`, padding `{spacing.md}`.

**`rank-row`** — ranked list row
- Surface `{colors.surface}`, body text at `{typography.body}`, `{rounded.md}`, padding `{spacing.sm} {spacing.md}`. Rank · icon · title · metadata columns.

**`badge`** — small rounded tag / category chip
- Background `{colors.secondary}` (Brown), inverse text at `{typography.link-sm}`, `{rounded.lg}`, padding `{spacing.xxs} {spacing.sm}`.

### Examples (illustrative)

> Auto-derived kit-mirror demonstration surfaces (`scripts/derive-examples-block.mjs`). Each `ex-*` entry references brand-native primitives so downstream consumers (`/preview-design`, `/generate-kit`) re-skin the same 10 surfaces consistently. `TO_FILL` markers indicate missing primitives — resolve in the LLM judgment pass.

**`ex-pricing-tier`** — Default pricing tier card. Re-uses feature-card chrome with brand canvas-soft surface.
- Properties: `backgroundColor`, `textColor`, `borderColor`, `rounded`, `padding`

**`ex-pricing-tier-featured`** — Featured/highlighted tier — polarity-flipped surface (dark fill + light text in light mode, light fill + dark text in dark mode).
- Properties: `backgroundColor`, `textColor`, `rounded`, `padding`

**`ex-product-selector`** — What's Included summary card — re-purposed for SaaS / B2B verticals (NOT a literal product gallery).
- Properties: `backgroundColor`, `rounded`, `padding`

**`ex-cart-drawer`** — Subscription summary — re-purposed for SaaS / B2B (line items per add-on, not literal cart).
- Properties: `backgroundColor`, `rounded`, `padding`, `item-divider`

**`ex-app-shell-row`** — Sidebar nav row inside the App Shell example. Active state uses brand primary as the indicator.
- Properties: `backgroundColor`, `activeIndicator`, `rounded`, `padding`

**`ex-data-table-cell`** — Default data-table th + td chrome. Header uses mono-caps eyebrow typography; body uses body-sm.
- Properties: `headerBackground`, `headerTypography`, `bodyTypography`, `cellPadding`, `rowBorder`

**`ex-auth-form-card`** — Sign-in / sign-up card. Re-uses feature-card chrome with text-input primitives inside.
- Properties: `backgroundColor`, `rounded`, `padding`

**`ex-modal-card`** — Modal dialog surface — same chrome as feature-card with elevated shadow.
- Properties: `backgroundColor`, `rounded`, `padding`

**`ex-empty-state-card`** — Empty-state illustration frame.
- Properties: `backgroundColor`, `rounded`, `padding`, `captionTypography`

**`ex-toast`** — Toast notification surface — feature-card shape + medium shadow.
- Properties: `backgroundColor`, `rounded`, `padding`, `typography`


## Do's and Don'ts

### Do
- Lead with the warm Background Base (`{colors.canvas}`) and let the dark Sidebar/Wrapper (`{colors.sidebar}`) carry the contrast weight.
- Use `{colors.primary}` Olive for the primary action on a screen; reserve `{colors.secondary}` Brown for the secondary or alternate action.
- Keep body text on `{colors.ink}` Text Base for legibility against the light surfaces; flip to `{colors.ink-inverse}` only on the dark Sidebar/Wrapper or on filled Olive/Brown surfaces.
- Round generously — `{rounded.sm}`–`{rounded.lg}` on controls, `{rounded.xl}`+ on media and feature panels.
- Frame product screenshots inside `{colors.surface}` panels rather than heavy shadows.
- Let the Sidebar/Wrapper stay visually constant across every screen — it's the one fixed element the rest of the system is measured against.

### Don't
- Don't animate or saturate the canvas — the calm warm base is the brand, not a backdrop for motion.
- Don't introduce a third loud accent beyond Olive and Brown; two accents plus the neutral scale is the full chord.
- Don't lighten the Sidebar/Wrapper to match the canvas — the dark-to-light contrast is intentional weight, not an oversight.
- Don't set headlines in a timid mid-weight — display type is 700–800 or it loses the brand's voice.
- Don't lean on drop shadows for hierarchy beyond the single soft-float level; depth comes from Background Base / Surface / Sidebar-Wrapper layering.
- Don't set body text directly on the Surface beige without checking contrast against `{colors.ink}` — verify it, don't assume it matches the canvas.
