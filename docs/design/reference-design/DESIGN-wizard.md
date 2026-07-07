# Design System Inspired by GTO Wizard

## 1. Visual Theme & Atmosphere

GTO Wizard's design system embodies a modern, high-contrast aesthetic built for competitive gaming and poker strategy. The interface balances dark, immersive backgrounds with vibrant accent colors that demand attention and convey energy. The visual language communicates confidence, precision, and mastery—reflecting the platform's mission to help users crush their competition. Typography is clean and purposeful, with generous whitespace and sharp geometric shapes. The overall mood is sophisticated yet accessible, combining luxury gaming aesthetics with approachable, functional interface patterns.

**Key Characteristics**

- Deep, near-black dark mode foundation (`#000000`, `#121212`, `#1E1E1E`)
- Vibrant neon accents (lime green `#AAFBB2`, electric blue `#23B5EF`, `#29B6F6`)
- Minimal, high-contrast design with deliberate use of negative space
- Geometric borders and outlined button states for interactive emphasis
- Premium feel through strategic color restraint and precision spacing
- Game-focused energy with competitive, motivational messaging

## 2. Color Palette & Roles

### Primary

- **Brand Primary** (`#AAFBB2`): Vibrant lime green accent used for emphasis, highlights, and key interactive elements; conveys energy and winning momentum
- **Brand Dark** (`#000000`): Primary background and dominant neutral; establishes the dark mode foundation

### Accent Colors

- **Electric Blue** (`#23B5EF`): Secondary accent for alternative interactive states and premium feature highlights
- **Bright Blue** (`#29B6F6`): Supporting accent for social login and tertiary actions
- **Purple Accent** (`#AA00DC`): Rare highlight color for exclusive or premium content
- **Warm Orange** (`#FF8F00`): Warm accent for tertiary highlights and alternative CTAs

### Interactive

- **Link Text** (`#6F6F6F`): Subdued gray for secondary links and helper text in light contexts
- **Link Hover** (`#FFFFFF`): White text for hovered or active link states with full opacity
- **Link Secondary** (`rgba(255, 255, 255, 0.7)`): Semi-transparent white for tertiary navigation and action links

### Neutral Scale

- **White** (`#FFFFFF`): Primary text on dark backgrounds; maximum contrast
- **Light Gray** (`#F5F5F5`): Very light background and surface alternative
- **Medium Gray** (`#9F9F9F`): Secondary text and disabled states
- **Dark Gray** (`#6F6F6F`): Tertiary text and muted information
- **Subtle Gray** (`#CFCFCF`): Borders and dividers on light backgrounds

### Surface & Borders

- **Surface Dark** (`#121212`): Elevated surface in dark mode; card backgrounds
- **Surface Darker** (`#1E1E1E`): Secondary elevated surface for nested containers
- **Border Subtle** (`rgba(0, 0, 0, 0.1)`): Very subtle borders on dark backgrounds
- **Border Medium** (`rgba(219, 68, 55, 0.25)`): Colored borders for outlined button variants (red tint)

### Semantic / Status

- **Error Red** (`#F03C3C`): Primary error state indicator
- **Error Bold** (`#F44336`): Intensified error messaging
- **Error Dark** (`#E72341`): Deep error state for critical alerts
- **Warning Orange** (`#FFA726`): Warning and caution messaging

## 3. Typography Rules

### Font Family

**Primary: Inter** (`font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`)
Weights: 300, 400, 500, 600, 700

**Secondary: Poppins** (`font-family: 'Poppins', 'Inter', sans-serif`)
Weights: 400 (body text context)

### Hierarchy

| Role           | Font    | Size   | Weight | Line Height | Letter Spacing | Notes                               |
| -------------- | ------- | ------ | ------ | ----------- | -------------- | ----------------------------------- |
| Display/H1     | Inter   | 28px   | 500    | 42px        | 0px            | Large page headings; hero messaging |
| Heading 2      | Inter   | 14px   | 500    | 21px        | 0px            | Section headings and subheadings    |
| Body Primary   | Poppins | 17.5px | 400    | 24px        | 0px            | Main content and descriptive text   |
| Button/Label   | Inter   | 16px   | 600    | 24px        | 0px            | Button text and strong labels       |
| Body Secondary | Inter   | 14px   | 400    | 21px        | 0px            | Secondary text, descriptions        |
| Link/Action    | Inter   | 14px   | 600    | 20px        | 0px            | Links and action text               |
| Caption        | Inter   | 12px   | 500    | 17.16px     | 0px            | Small helper text and metadata      |

### Principles

- **Contrast-driven**: Optimize for dark mode readability with maximum white-on-black contrast
- **Hierarchy through weight**: Use weight shifts (400 → 600 → 700) for visual prominence over size alone
- **Generous line height**: 1.5x to 1.8x multiplier ensures legibility in gaming-focused interface
- **Purposeful sizing**: Discrete sizes (12px, 14px, 16px, 17.5px, 28px) create clear visual hierarchy
- **Premium spacing**: Inter as primary font conveys modern, professional gaming aesthetic

## 4. Component Stylings

### Buttons

#### Primary Button

- **Background**: `rgb(149, 218, 156)` (Solid lime green)
- **Text Color**: `#000000`
- **Padding**: `12px 32px`
- **Border Radius**: `8px`
- **Border**: `none`
- **Font**: Inter, 16px, weight 600
- **Height**: `48px`
- **Box Shadow**: `0px 4px 12px rgba(170, 251, 178, 0.3)`
- **Hover State**: `background: rgba(170, 251, 178, 0.85)`, `box-shadow: 0px 6px 16px rgba(170, 251, 178, 0.4)`
- **Active State**: `background: rgba(170, 251, 178, 0.7)`

#### Secondary Button (Outlined)

- **Background**: `rgba(219, 68, 55, 0.1)`
- **Text Color**: `#FFFFFF`
- **Padding**: `12px 24px`
- **Border Radius**: `8px`
- **Border**: `2px solid rgba(219, 68, 55, 0.25)`
- **Font**: Inter, 14px, weight 700
- **Height**: `48px`
- **Box Shadow**: `none`
- **Hover State**: `background: rgba(219, 68, 55, 0.15)`, `border-color: rgba(219, 68, 55, 0.35)`
- **Active State**: `background: rgba(219, 68, 55, 0.2)`

#### Ghost Button (Transparent)

- **Background**: `transparent`
- **Text Color**: `rgba(255, 255, 255, 0.7)`
- **Padding**: `8px 16px`
- **Border Radius**: `6px`
- **Border**: `none`
- **Font**: Inter, 14px, weight 600
- **Height**: `32px`
- **Box Shadow**: `none`
- **Hover State**: `background: rgba(255, 255, 255, 0.1)`, `color: #FFFFFF`
- **Active State**: `background: rgba(255, 255, 255, 0.15)`

#### Icon Button (Circular)

- **Background**: `transparent`
- **Text Color**: `#FFFFFF`
- **Padding**: `4px`
- **Border Radius**: `50%`
- **Border**: `none`
- **Font**: Inter, 14px, weight 400
- **Width**: `35px`
- **Height**: `35px`
- **Box Shadow**: `none`
- **Hover State**: `background: rgba(255, 255, 255, 0.1)`
- **Active State**: `background: rgba(255, 255, 255, 0.2)`

#### Social Auth Button (Login Variant)

- **Background**: Themed by provider (Google: `rgba(219, 68, 55, 0.15)`, Facebook: `rgba(35, 181, 239, 0.15)`, Apple: `#000000`)
- **Text Color**: `#FFFFFF`
- **Padding**: `16px 24px`
- **Border Radius**: `12px`
- **Border**: `2px solid` (provider-specific color with 0.25 opacity)
- **Font**: Inter, 14px, weight 700
- **Height**: `168px`
- **Width**: `168px`
- **Box Shadow**: `none`
- **Hover State**: Border opacity increases to 0.35, background opacity to 0.2

### Cards & Containers

#### Primary Card

- **Background**: `#121212`
- **Padding**: `24px`
- **Border Radius**: `12px`
- **Border**: `1px solid rgba(255, 255, 255, 0.08)`
- **Box Shadow**: `0px 8px 24px rgba(0, 0, 0, 0.4)`
- **Text Color**: `#FFFFFF`

#### Secondary Card (Outlined)

- **Background**: `transparent`
- **Padding**: `16px 20px`
- **Border Radius**: `8px`
- **Border**: `1px solid rgba(255, 255, 255, 0.15)`
- **Box Shadow**: `none`
- **Text Color**: `#FFFFFF`

#### Login Provider Card (Social Button Container)

- **Background**: `rgba(0, 0, 0, 0.3)`
- **Padding**: `24px`
- **Border Radius**: `12px`
- **Border**: `2px solid rgba(219, 68, 55, 0.2)` (red variant) or provider-specific color
- **Box Shadow**: `none`
- **Hover State**: Border color opacity increases to 0.35, background to 0.4

### Inputs & Forms

#### Text Input

- **Background**: `#1E1E1E`
- **Text Color**: `#FFFFFF`
- **Padding**: `12px 16px`
- **Border Radius**: `8px`
- **Border**: `1px solid rgba(255, 255, 255, 0.12)`
- **Font**: Inter, 14px, weight 400
- **Height**: `44px`
- **Box Shadow**: `none`
- **Focus State**: `border-color: rgba(170, 251, 178, 0.5)`, `box-shadow: 0px 0px 0px 3px rgba(170, 251, 178, 0.1)`
- **Error State**: `border-color: #F03C3C`, `box-shadow: 0px 0px 0px 3px rgba(240, 60, 60, 0.1)`

#### Checkbox / Toggle

- **Background (Unchecked)**: `#1E1E1E`
- **Background (Checked)**: `#AAFBB2`
- **Border**: `1px solid rgba(255, 255, 255, 0.2)`
- **Border Radius**: `4px` (checkbox) or `50%` (toggle)
- **Width/Height**: `20px`

### Navigation

#### Primary Navigation Link

- **Text Color**: `rgba(255, 255, 255, 0.7)`
- **Font**: Inter, 14px, weight 500
- **Padding**: `8px 12px`
- **Border Radius**: `0px`
- **Border**: `none`
- **Background**: `transparent`
- **Hover State**: `color: #FFFFFF`, `background: rgba(255, 255, 255, 0.08)`
- **Active State**: `color: #AAFBB2`, `border-bottom: 2px solid #AAFBB2`

#### Breadcrumb Link

- **Text Color**: `#6F6F6F`
- **Font**: Inter, 14px, weight 500
- **Padding**: `0px`
- **Hover State**: `color: #FFFFFF`

#### Footer Link

- **Text Color**: `rgba(255, 255, 255, 0.7)`
- **Font**: Inter, 12px, weight 500
- **Text Decoration**: `underline` (on hover)
- **Hover State**: `color: #FFFFFF`

## 5. Layout Principles

### Spacing System

**Base Unit**: `4px`

**Scale**: 4px, 8px, 12px, 16px, 24px, 32px, 40px, 44px, 64px, 96px

**Usage Context**:

- `4px` – Micro-spacing within components (icon padding, tight gaps)
- `8px` – Component internal spacing, small gaps
- `12px` – Form input spacing, medium gaps between elements
- `16px` – Standard padding around content, default margins
- `24px` – Card padding, section margins
- `32px` – Large section spacing, container margins
- `40px` – Gap between major sections
- `44px` – Login form field height standard, large padding
- `64px` – Major section separation
- `96px` – Page-level padding / hero section spacing

### Grid & Container

- **Max Width**: `1440px` (standard 2-column breakpoint)
- **Container Padding**: `24px` on desktop, `16px` on tablet, `12px` on mobile
- **Column Strategy**: 12-column responsive grid; adapts from 3 columns (desktop) → 2 columns (tablet) → 1 column (mobile)
- **Section Pattern**: Hero (full-width dark background) → Content section (constrained, centered) → Form area (right-aligned, login context)

### Whitespace Philosophy

The design prioritizes breathing room and visual clarity. Generous margins between sections reduce cognitive load and emphasize competitive positioning. Dark backgrounds are intentionally paired with minimal content density—each element has deliberate isolation. Vertical rhythm is maintained through consistent 24px and 32px gaps between logical sections. Login and social auth buttons receive prominent vertical spacing (40px–64px) to indicate importance and encourage interaction.

### Border Radius Scale

- `4px` – Tight, subtle controls (checkboxes, small toggles)
- `6px` – Navigation pills and ghost buttons
- `8px` – Primary buttons, outlined variants, input fields
- `12px` – Cards, elevated containers, social auth buttons
- `50%` – Circular icon buttons and full-circle badges

## 6. Depth & Elevation

| Level          | Treatment                                                                                            | Use                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Flat (0)       | `box-shadow: none`                                                                                   | Buttons with transparent or flat fills; utility elements |
| Level 1        | `box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.25)`                                                       | Standard card shadows, elevated buttons                  |
| Level 2        | `box-shadow: 0px 8px 24px rgba(0, 0, 0, 0.4)`                                                        | Primary cards, lifted containers, modals                 |
| Level 3        | `box-shadow: 0px 12px 32px rgba(0, 0, 0, 0.5)`                                                       | Floating panels, top-level overlays                      |
| Accent (Green) | `box-shadow: 0px 4px 12px rgba(170, 251, 178, 0.3)` (hover: `0px 6px 16px rgba(170, 251, 178, 0.4)`) | Primary button emphasis; premium states                  |

**Shadow Philosophy**: Shadows are subtly used to create soft depth differentiation in dark mode. The primary strategy relies on border opacity and background color shifts rather than aggressive shadows. Accent colors (lime green, blue) receive subtle glow-like shadows to draw focus. Shadows use pure black with varying opacity (0.25–0.5) to maintain dark mode visual coherence without harsh contrasts.

## 7. Do's and Don'ts

### Do

- **Use lime green (`#AAFBB2`) for all primary call-to-action buttons** – It's the brand signature and command user attention
- **Maintain high contrast** – Minimum 7:1 ratio for text on dark backgrounds ensures readability and gaming focus
- **Leverage the 24px/32px spacing scale** – Consistent rhythm creates visual harmony and professional polish
- **Apply border colors thoughtfully** – Use provider-specific colors (red for error/warning, blue for alternate) with 0.2–0.25 opacity
- **Create visual hierarchy through weight** – Use Inter weight shifts (400 → 600 → 700) rather than size changes alone
- **Respect the dark mode aesthetic** – Never use pure white backgrounds; prefer `#121212` or `#1E1E1E` for surfaces
- **Group social login buttons visually** – Use consistent `168px` square cards with provider-specific color accents and borders
- **Provide hover states on all interactive elements** – Subtle opacity shifts or background color changes enhance usability

### Don't

- **Don't use more than 3 accent colors in a single view** – Dilutes energy and creates visual chaos
- **Don't apply lime green to non-primary actions** – Reserve it for main CTAs (sign up, login, start trial)
- **Don't use light backgrounds or transparency without clear intent** – The dark mode foundation is sacred
- **Don't ignore focus states** – All interactive elements must have clear keyboard/focus indicators (0.1–0.2 opacity overlays)
- **Don't over-shadow elements** – Shadows should enhance depth subtly, not dominate the composition
- **Don't mix font families across a single line** – Stick to Inter for consistency; Poppins body text is optional for body copy contexts
- **Don't reduce padding or spacing below 8px** – Preserve the generous breathing room that defines the premium feel
- **Don't desaturate accent colors** – Keep them vibrant and punchy to maintain competitive energy

## 8. Responsive Behavior

### Breakpoints

| Breakpoint | Width        | Key Changes                                                                                                 |
| ---------- | ------------ | ----------------------------------------------------------------------------------------------------------- |
| Desktop    | 1440px+      | Full 2-column layout (left: hero/marketing, right: login form); max-width container; 24px padding           |
| Tablet     | 768px–1439px | Single-column stacked layout; 50/50 split becomes 1 column; 16px padding; cards full-width                  |
| Mobile     | 320px–767px  | Full-width single column; hero messaging above form; 12px padding; buttons full-width (except icon buttons) |

### Touch Targets

- **Minimum button height**: `44px` (login buttons, primary actions)
- **Minimum touch target**: `48px × 48px` (icon buttons, close actions)
- **Link touch area**: `32px` minimum height for text links in navigation
- **Form input minimum**: `44px` height
- **Spacing between touch targets**: `8px` minimum gap to prevent accidental activation

### Collapsing Strategy

- **Hero section**: On mobile, display single column with centered messaging; reduce H1 size to 24px
- **Social auth buttons**: On tablet/mobile, stack vertically (full-width cards instead of 3-across row)
- **Login form**: Reduce horizontal padding from `44px` to `16px` on mobile; maintain vertical spacing for readability
- **Navigation**: Collapse into hamburger menu on tablet; hide secondary nav links
- **Cards**: Full bleed on mobile (edge-to-edge with 12px gutters); maintain 24px internal padding
- **Typography**: H1 scales from 28px (desktop) → 24px (tablet) → 20px (mobile); body remains 17.5px

## 9. Agent Prompt Guide

### Quick Color Reference

- **Primary CTA**: Lime Green (`#AAFBB2`) – Use for main "Sign Up," "Login," "Start Free Trial" buttons
- **Background**: Black (`#000000`) – Page background; use `#121212` for elevated surfaces
- **Heading Text**: White (`#FFFFFF`) – Maximum contrast on dark backgrounds
- **Body Text**: White (`#FFFFFF`) at full opacity; secondary text uses `rgba(255, 255, 255, 0.7)`
- **Error/Validation**: Red (`#F03C3C` or `#F44336`) – Error messages, invalid inputs, alerts
- **Links**: Gray (`#6F6F6F`) in neutral context; white `#FFFFFF` in dark/focused state
- **Border/Divider**: Subtle transparent white (`rgba(255, 255, 255, 0.08–0.15)`) on dark surfaces
- **Social Google**: Red-tinted border/background (`rgba(219, 68, 55, 0.1)–0.25`)
- **Social Facebook**: Blue tint (`#23B5EF` or `#29B6F6`)
- **Social Apple**: Pure black background (`#000000`)

### Iteration Guide

1. **Always prioritize lime green (`#AAFBB2`) for primary buttons** – It's the brand signature and commands 50% of all accent color usage; every interactive flow must terminate in a green CTA
2. **Apply dark mode foundation universally** – Default to `#000000` for page background, `#121212` for cards/containers; never use white or light grays as primary surfaces
3. **Use Inter font exclusively for all UI** – 16px weight 600 for buttons, 14px weight 500 for headings, 14px weight 400 for secondary text; Poppins body copy is optional
4. **Maintain minimum 8px spacing between elements** – No component should have padding or margin below 8px; use the scale (8, 12, 16, 24, 32, 40, 44, 64, 96px) exclusively
5. **Add hover states with opacity shifts or background color changes** – All buttons, links, and cards require clear hover feedback; no interactions should feel static
6. **Group social login buttons as 168px square cards** – Each provider (Google, Facebook, Apple) receives a dedicated card with provider-specific border color and Icon centered
7. **Implement focus/keyboard navigation states** – Add 3px inset focus ring with 0.1–0.2 opacity overlay; ensure all interactive elements are keyboard-accessible
8. **Apply border radius consistently** – Use 8px for buttons/inputs, 12px for cards, 4px for small controls, 50% for circular elements; no other radius values
9. **Use the typography hierarchy table verbatim** – H1 at 28px weight 500 for hero, H2 at 14px weight 500 for sections, body at 14px weight 400; deviations break visual coherence
10. **Render error states with red borders and subtle glow** – Invalid inputs: `border-color: #F03C3C`, `box-shadow: 0px 0px 0px 3px rgba(240, 60, 60, 0.1)`; maintain consistency across all error feedback
