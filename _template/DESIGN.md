# Design System: The Tactile Editorial

## 1. Overview & Creative North Star: "The Digital Curator"
This design system moves away from the cold, clinical nature of standard productivity apps. Our Creative North Star is **The Digital Curator**: an experience that feels like a bespoke, high-end stationery shop. We prioritize the "feel" of heavy-stock paper, the precision of a fountain pen, and the luxury of white space.

To break the "template" look, we reject the rigid grid. We use intentional asymmetry—such as off-center typography in headers and overlapping card elements—to create an editorial layout that feels curated rather than generated. We don't just "display" notes; we "publish" them onto a digital canvas.

---

## 2. Colors & Surface Philosophy
The palette is a sophisticated blend of parchment tones (`#faf9f5`) and "ink" accents (`#516070`). 

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning content. Boundaries must be defined through tonal shifts or background color transitions. A sidebar in `surface-container-low` should sit against a `background` page without a stroke line.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the `surface-container` tiers to create depth:
- **Level 0 (Base):** `surface` (#faf9f5) for the main application backdrop.
- **Level 1 (Sub-sections):** `surface-container-low` (#f4f4ef) for sidebar or secondary navigation.
- **Level 2 (Active Cards):** `surface-container-lowest` (#ffffff) to make active note cards "pop" against the warmer background.
- **Level 3 (Modals/Overlays):** `surface-bright` (#faf9f5) with high-diffusion shadows.

### The Glass & Gradient Rule
For floating elements (like a floating action button or a hovering toolbar), use **Glassmorphism**:
- **Background:** `surface-container-lowest` at 80% opacity.
- **Effect:** `backdrop-filter: blur(12px)`.
- **Polish:** Use a subtle linear gradient on primary buttons—from `primary` (#516070) to `primary-dim` (#455464)—to give the "ink" a rich, liquid depth.

---

## 3. Typography: The Editorial Contrast
We use a high-contrast typographic pairing to distinguish between the "Instrument" (the UI) and the "Artifact" (the content).

- **The Instrument (Sans-Serif):** **Inter** is our functional voice. It is used for labels, navigation, and system feedback.
- **The Artifact (Serif):** **Newsreader** is our soul. This serif font mimics the rhythm of a printed book and is used for all note titles and body content.

**Hierarchy Intent:**
- **Display-LG (Inter):** Used for large, expressive brand moments.
- **Title-LG (Newsreader):** Used for the note’s main heading to evoke an authorial feel.
- **Body-MD (Newsreader):** The primary reading experience. Line height should be generous (1.6) to mimic high-quality typesetting.

---

## 4. Elevation & Depth
In this system, elevation is a product of light and material, not structural boxes.

- **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` section. The slight shift from ivory to pure white creates a natural "lift" that feels expensive and soft.
- **Ambient Shadows:** When a card must float (e.g., a dragging state), use a shadow color tinted with the `on-surface` (#2f342e) color at 5% opacity.
  - *Spec:* `box-shadow: 0 12px 32px rgba(47, 52, 46, 0.06);`
- **Ghost Borders:** If accessibility requires a border, use `outline-variant` (#afb3ac) at 15% opacity. Never use a 100% opaque border.

---

## 5. Components

### Cards & Notes
- **Styling:** No dividers. Separate the title (`title-lg`) from the body (`body-md`) using 24px of vertical white space.
- **Shape:** Use `rounded-lg` (1rem) for note cards to maintain a friendly, organic feel.

### Buttons
- **Primary:** Background `primary`, Text `on-primary`. Use `rounded-full` for a "smooth pebble" tactile feel.
- **Secondary:** Background `secondary-container`, Text `on-secondary-container`. No border.
- **Tertiary:** Text `primary`. Use for low-emphasis actions; only shows a `surface-container-high` background on hover.

### Tabs (The "Bookmark" Style)
Instead of bottom-border tabs, use an offset background. The active tab should be `surface-container-lowest` with a `sm` shadow, while inactive tabs remain flat against the `surface-container` background.

### Code Input Fields
- **Background:** `surface-dim`.
- **Typography:** Use a monospaced variant of Inter at `label-md` size.
- **Style:** Inset shadow (`inner`) to simulate the code being "pressed" into the paper.

### Success States
- Use `tertiary` (#575e78) instead of a harsh green. The soft blue-grey maintains the sophisticated "ink" aesthetic while signaling completion through the `on-tertiary-container` icon.

---

## 6. Do’s and Don’ts

### Do:
- **Embrace Negative Space:** If you think a section needs a line, try adding 16px of extra padding instead.
- **Use "Paper" Textures:** Apply a 2% noise SVG overlay to the `background` to break the digital flatness.
- **Center the Focus:** Use centered card layouts for note-taking to mimic a physical notebook lying open on a desk.

### Don't:
- **No Pure Blacks:** Never use #000000. Use `on-surface` (#2f342e) for text and `primary` (#516070) for deep accents.
- **No Sharp Corners:** Avoid `none` or `sm` rounding. Everything should feel worn and soft, like a well-loved journal.
- **No Divider Overload:** Forbid the use of horizontal rules (`<hr>`). Use tonal shifts between `surface-container` levels to separate the header from the content.

### Accessibility Note:
While we use soft tones, ensure the contrast between `on-surface-variant` and `surface` always meets WCAG AA standards. If text feels too light on a parchment background, move up one level in the `on-surface` hierarchy.