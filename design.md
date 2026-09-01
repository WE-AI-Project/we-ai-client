# 🎨 UI/UX Design Guidelines

This document defines the comprehensive UI/UX layout and spacing standards for desktop and web applications, fully aligned with the official Microsoft Fluent 2 Design System. Use these specifications to maintain visual hierarchy, consistency, and optimized data density across all software interfaces.

---

## 1. Spacing & Layout Architecture

Fluent 2 is built on a **4px Base Unit grid system**. All padding, margin, and element dimensions must align with multiples of this base unit to ensure geometric harmony across different screens.

### 1.1 Spacing Ramp Specification
The following tokens define the standard distance between UI components and their internal layout structure.

| Token Name | Pixel Value | Intended UI Usage Context |
| :--- | :--- | :--- |
| `spacingNone` | `0px` | Edge-to-edge alignment, seamless grid connections. |
| `spacing2` | `2px` | Micro-adjustments, icon badge offsets, fine-line alignment. |
| `spacing4` | `4px` | Internal control spacing (e.g., [Icon + Text] inside a button). |
| `spacing6` | `6px` | Vertical compact padding within list items. |
| `spacing8` | `8px` | Distance between adjacent controls (e.g., buttons in a row). |
| `spacing10` | `10px` | Gap between form labels and their respective input fields. |
| `spacing12` | `12px` | Standard vertical/horizontal spacing, combobox internal padding. |
| `spacing16` | `16px` | Standard Card container padding, dialog content margins. |
| `spacing20` | `20px` | Separation between major content blocks within large widgets. |
| `spacing24` | `24px` | Default global page margin, separation between master-detail views. |
| `spacing32` | `32px` | Large section spacing for landing pages or login screens. |
| `spacing40` | `40px` | Marketing hero sections, splash screen layout spacers. |

### 1.2 Layout Density System
Desktop software must scale layout density based on user input mechanisms and data complexity.

*   **Standard Density**
    *   **Target**: General consumer apps, touch/mouse hybrid inputs, settings, and onboarding flows.
    *   **Rule**: List item heights must be at least `36px`, keeping container margins to a minimum of `16px`.
*   **Compact Density**
    *   **Target**: Professional data analytics, developer tools, ERP systems, and heavy data grids.
    *   **Rule**: Optimized purely for precise mouse interaction. List item heights are compressed to roughly `28px`, with element spacing restricted to `4px` or `8px` to maximize information density.

---

## 2. Typography & Visual Hierarchy

Fluent 2 typography relies on calibrated combinations of size, tracking, and line height to lead the user's eye naturally through the information architecture.

| Typography Role | Font Size | Line Height | Font Weight | Intended Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | `68px` | `92px` | Bold / Regular | Large dashboard metrics, hero page titles. |
| **Title Large** | `40px` | `52px` | Semibold | Main welcome headers, dashboard root levels. |
| **Title 1** | `32px` | `40px` | Semibold | Main page headers, first-level titles. |
| **Title 2** | `24px` | `32px` | Semibold | Modal pop-up titles, section headers inside cards. |
| **Title 3** | `20px` | `28px` | Semibold | Sub-sections, localized group headers. |
| **Body 1 Strong** | `14px` | `20px` | Semibold | Data grid headers, button labels, active menu items. |
| **Body 1 (Main)** | `14px` | `20px` | Regular | **Primary body copy**, text fields inputs, standard labels. |
| **Caption 1** | `12px` | `16px` | Regular | Helper text beneath input fields, timestamps, metadata. |
| **Caption 2** | `10px` | `14px` | Regular | Badge counters, legal fine print, inline status indicators. |

---

## 3. Shapes & Corner Radius (Geometry)

Rounded corners represent a foundational visual identity in Fluent 2. Corner radius scales proportionally to the size and structural tier of the UI element.

*   **Circular (50% / 999px)**: User profile avatars, progress indicator bars, toggle switch knobs.
*   **Small Corner (`4px`)**: Interactive micro-controls like Buttons, Text Fields, Checkboxes, and Comboboxes.
*   **Medium Corner (`8px`)**: Layout blocks such as Content Cards, Flyout menus, Context Menus, and Tooltips.
*   **Large Corner (`12px`)**: System overlays including Dialog boxes, Modal windows, and main Application Canvas containers.

---

## 4. Responsive Breakpoints

Desktop applications must adapt dynamically when windows are resized. Fluent 2 utilizes the following structural breaking points:

*   **Small (`< 600px`)**: Global margin `16px`. Single-column layouts only. Top/side navigation collapses into a hamburger menu or bottom sheet.
*   **Medium (`600px` to `1023px`)**: Global margin `24px`. Multi-column split views allowed. Side navigation collapses into compact icons.
*   **Large (`1024px` to `1439px`)**: Global margin `24px`. Full desktop master-detail views unlocked. Side navigation locks into an expanded state.
*   **Extra Large (`≥ 1440px`)**: Global margin `32px`. Content canvas can cap max-width at `1920px` and auto-center to prevent over-stretching.

---

## 🔗 Official Reference Guidelines
*   [Fluent 2 Design System Official Portal](https://microsoft.design)
*   [Fluent 2 Layout & Grid Documentation](https://microsoft.designlayout)
