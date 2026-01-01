# Magic Mirror Design System PRD

## "Quiet Presence" — Design Identity

> The mirror should feel like a calm, intelligent presence in your home — not demanding attention, but gracefully providing information when you look at it. Like a wise friend who speaks softly but always has something worthwhile to say.

---

## 1. Core Principles

### 1.1 Whisper, Don't Shout

- Information appears gently, fades gracefully
- Urgency communicated through animation speed, not visual loudness
- The black background dominates; white is precious, used sparingly

### 1.2 Breathing Rhythm

- All animations follow organic, breath-like timing
- Slow pulses (2-3 seconds), not quick flashes
- Creates subconscious calm, not anxiety

### 1.3 Intelligent Negative Space

- 60%+ of the screen is pure black at any time
- Information floats in darkness like stars
- Space IS the design, text is punctuation

### 1.4 Typographic Weight as Emotion

- Light weights (100-300) = calm, ambient information
- Medium weights (400-500) = actionable, important
- Never go above 500 — no bold, no heavy, no shouting

### 1.5 Motion as Meaning

- Vertical motion = time flow (past ↑, future ↓)
- Horizontal motion = category change
- Fade = state change (appearing/disappearing)
- Scale = emphasis (subtle, max 1.05)

---

## 2. Color System

### 2.1 The Constraint

**Pure monochrome only.** White (#FFFFFF) on Black (#000000).

No grays. No accent colors. No exceptions.

### 2.2 Opacity as Palette

Instead of colors, we use opacity to create visual hierarchy:

| Level     | Opacity | Use Case                          |
| --------- | ------- | --------------------------------- |
| Hero      | `1.0`   | Clock time, critical alerts       |
| Primary   | `0.87`  | Current temperature, event titles |
| Secondary | `0.60`  | Date, forecast, descriptions      |
| Tertiary  | `0.38`  | Labels, metadata, section headers |
| Disabled  | `0.20`  | Inactive states, placeholders     |
| Hint      | `0.10`  | Subtle dividers, ambient texture  |

### 2.3 CSS Variables

```css
:root {
  --color-bg: #000000;
  --color-fg: #ffffff;

  --opacity-hero: 1;
  --opacity-primary: 0.87;
  --opacity-secondary: 0.6;
  --opacity-tertiary: 0.38;
  --opacity-disabled: 0.2;
  --opacity-hint: 0.1;
}
```

---

## 3. Typography

### 3.1 Font Selection

| Role        | Font    | Rationale                                                          |
| ----------- | ------- | ------------------------------------------------------------------ |
| **Display** | Syne    | Unique geometric character, excellent at large sizes, not overused |
| **Body**    | DM Sans | Excellent readability, warm, good x-height for distance viewing    |

Both are Google Fonts with variable weight support.

### 3.2 Type Scale (Perfect Fourth — 1.333)

| Token         | Size  | Use Case           |
| ------------- | ----- | ------------------ |
| `--text-6xl`  | 180px | Clock time display |
| `--text-5xl`  | 128px | Hero numbers       |
| `--text-4xl`  | 96px  | Large displays     |
| `--text-3xl`  | 64px  | Section heroes     |
| `--text-2xl`  | 48px  | Headlines          |
| `--text-xl`   | 36px  | Subheadlines       |
| `--text-lg`   | 28px  | Lead text          |
| `--text-base` | 21px  | Body text          |
| `--text-sm`   | 16px  | Secondary text     |
| `--text-xs`   | 12px  | Captions, metadata |

### 3.3 Font Weights

| Token                 | Weight | Use Case                        |
| --------------------- | ------ | ------------------------------- |
| `--weight-thin`       | 100    | Decorative, very large text     |
| `--weight-extralight` | 200    | Clock, hero displays            |
| `--weight-light`      | 300    | Headlines, emphasis             |
| `--weight-normal`     | 400    | Body text                       |
| `--weight-medium`     | 500    | Strong emphasis (use sparingly) |

### 3.4 Label Styling

All labels/section headers:

- Transform: `uppercase`
- Letter-spacing: `0.2em`
- Font-size: `--text-sm`
- Weight: `--weight-normal`
- Opacity: `--opacity-tertiary`

---

## 4. Spacing System

### 4.1 Base Unit

All spacing derives from an **8px base unit**.

### 4.2 Spacing Scale

| Token        | Value | Use Case           |
| ------------ | ----- | ------------------ |
| `--space-1`  | 8px   | Tight spacing      |
| `--space-2`  | 16px  | Related elements   |
| `--space-3`  | 24px  | List item spacing  |
| `--space-4`  | 32px  | Component padding  |
| `--space-5`  | 40px  | —                  |
| `--space-6`  | 48px  | Widget padding     |
| `--space-8`  | 64px  | Section margins    |
| `--space-10` | 80px  | —                  |
| `--space-12` | 96px  | Major section gaps |
| `--space-16` | 128px | Zone separations   |

### 4.3 Layout Constants

```css
:root {
  --container-width: 1080px;
  --container-height: 2560px;
  --margin-x: 48px;
  --margin-y: 64px;
}
```

---

## 5. Layout Zones

The 1080×2560 portrait canvas is divided into semantic zones:

```
┌─────────────────────────────────┐
│          64px margin            │
├─────────────────────────────────┤
│                                 │
│         ░░░ CLOCK ░░░          │  HERO ZONE
│         Time + Date             │  ~400px
│                                 │
├─────────────────────────────────┤
│         ─── divider ───         │
├─────────────────────────────────┤
│                                 │
│        ░░░ WEATHER ░░░         │  GLANCE ZONE
│        Current + Forecast       │  ~500px
│                                 │
├─────────────────────────────────┤
│         ─── divider ───         │
├─────────────────────────────────┤
│                                 │
│       ░░░ CALENDAR ░░░         │  PLANNING ZONE
│       Today's Events            │  ~800px (flexible)
│       Both calendars merged     │
│                                 │
├─────────────────────────────────┤
│         ─── divider ───         │
├─────────────────────────────────┤
│                                 │
│         ░░░ NEWS ░░░           │  CONTEXT ZONE
│         Headlines               │  ~400px
│                                 │
├─────────────────────────────────┤
│         ─── divider ───         │
├─────────────────────────────────┤
│                                 │
│      ░░░ AI SUMMARY ░░░        │  DELIGHT ZONE
│      (optional, dismissible)    │  ~300px
│                                 │
├─────────────────────────────────┤
│          64px margin            │
└─────────────────────────────────┘
```

### 5.1 Alignment

| Alignment | Margin | Use Case               |
| --------- | ------ | ---------------------- |
| Left      | 48px   | Labels, secondary info |
| Center    | —      | Time, primary data     |
| Right     | 48px   | Metadata, timestamps   |

---

## 6. Animation System

### 6.1 Performance Constraint

All animations MUST use only `transform` and `opacity` (GPU-accelerated).
**Never animate:** width, height, margin, padding, top, left, right, bottom.

### 6.2 Timing Tokens

```css
:root {
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
  --duration-slower: 800ms;
}
```

### 6.3 Animation Taxonomy

#### Presence Animations (enter/exit)

- Fade: opacity 0 → 1
- Slide: translateY(20px) → translateY(0)
- Stagger: 100ms delay between siblings
- Duration: 400-600ms
- Easing: `--ease-out` for enter, `--ease-in` for exit

#### State Transitions (data change)

- Numbers: slide-up-and-fade replacement
- Text: crossfade (200ms)
- Icons: scale(0.95) → scale(1) with opacity

#### Ambient Animations (continuous)

- Clock separator: opacity pulse 1 → 0.2 → 1 over 2s
- Dividers: subtle gradient shimmer (optional)
- Keep count low for Pi performance

#### Attention Animations (emphasis)

- Glow: text-shadow pulse
- Scale: scale(1.02) briefly
- Position: subtle x-translation

#### Seasonal/Easter Eggs

- December: snow particles (canvas, <50 particles)
- Birthdays: confetti burst
- Special messages: typewriter reveal

### 6.4 The Signature Animation

**Clock digit transitions** — "Waterfall of Time":

1. Current digit: fade out + translateY(-40px)
2. New digit: fade in + translateY(40px) → translateY(0)
3. Spring physics: slight overshoot, settle
4. Duration: 400ms

---

## 7. Component Patterns

### 7.1 Widget Container

```
┌─────────────────────────────────┐
│  LABEL              metadata →  │  --opacity-tertiary
│                                 │
│  Primary Content                │  --opacity-primary
│  Secondary detail               │  --opacity-secondary
│                                 │
└─────────────────────────────────┘
```

- Padding: `--space-6` (48px) horizontal, `--space-4` (32px) vertical

### 7.2 Divider

- Height: 1px
- Background: horizontal gradient
  ```css
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.15) 20%,
    rgba(255, 255, 255, 0.15) 80%,
    transparent 100%
  );
  ```
- Margin: `--space-8` vertical

### 7.3 List Item

```
│  ●  Event Title                 │
│     Secondary info    2:30 PM → │
```

- Left indicator: bullet (●) or 2px border
- Spacing between items: `--space-3` (24px)

### 7.4 Data Display

| Pattern     | Typography                                | Opacity   |
| ----------- | ----------------------------------------- | --------- |
| Hero number | `--text-6xl`, `--weight-extralight`       | hero      |
| Large value | `--text-2xl`, `--weight-light`            | primary   |
| Label       | `--text-sm`, `--weight-normal`, uppercase | tertiary  |
| Body        | `--text-base`, `--weight-normal`          | secondary |

---

## 8. Atmospheric Effects

### 8.1 Approved Effects (Pi-safe)

- **Gradient dividers** — zero performance cost
- **Opacity layering** — creates depth through transparency
- **Selective text-shadow** — subtle glow on hero elements
  ```css
  text-shadow: 0 0 30px rgba(255, 255, 255, 0.1);
  ```

### 8.2 Avoid (Pi performance risk)

- SVG filters
- Backdrop blur
- Heavy particle systems (>50 particles)
- Continuous noise texture animation

---

## 9. Accessibility Considerations

### 9.1 Contrast

- White on black naturally exceeds WCAG AAA requirements
- Maintain minimum opacity of 0.38 for readable text

### 9.2 Distance Viewing

- Mirror viewed from 3-6 feet away
- Minimum readable size: `--text-sm` (16px)
- Prefer larger sizes for primary content

### 9.3 Motion Sensitivity

- Respect `prefers-reduced-motion` media query
- Provide instant transitions as fallback
- No auto-playing video or rapid flashing

---

## 10. Naming Conventions

### 10.1 CSS Classes

```
.mirror-*         Global mirror styles
.widget-*         Widget container styles
.text-mirror-*    Typography scale
.animate-*        Animation utilities
```

### 10.2 Component Files

```
/components
  /widgets
    Clock.tsx
    Weather.tsx
    Calendar.tsx
    News.tsx
    AISummary.tsx
  /ui
    Divider.tsx
    Label.tsx
    AnimatedNumber.tsx
```

### 10.3 Design Tokens File

All tokens defined in:

- `src/styles/tokens.css` (CSS custom properties)
- `src/lib/tokens.ts` (TypeScript constants for Framer Motion)

---

## 11. Implementation Checklist

- [ ] Install Google Fonts: Syne, DM Sans
- [ ] Create `tokens.css` with all CSS custom properties
- [ ] Create `tokens.ts` for animation values
- [ ] Build base `Widget` container component
- [ ] Build `Divider` component
- [ ] Build `AnimatedNumber` component (digit transitions)
- [ ] Refactor `Clock` with new design system
- [ ] Build `Weather` widget
- [ ] Build `Calendar` widget
- [ ] Build `News` widget
- [ ] Build `AISummary` widget
- [ ] Implement seasonal animations hook
- [ ] Test on Raspberry Pi for performance

---

## 12. Version History

| Version | Date       | Changes                   |
| ------- | ---------- | ------------------------- |
| 1.0.0   | 2024-12-30 | Initial design system PRD |
