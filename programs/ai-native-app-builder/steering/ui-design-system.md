---
id: ui-design-system
description: "UI design system standards for AWS app builder projects"
inclusion: always
priority: 83
---
<!-- FDE_MANAGED hash:ui-design-system-v1 -->

# UI Design System — Enforced Standards for All App Levels

## Rule

When generating frontend code at **any appLevel** (PoC, MVP, or Production), the agent MUST apply a structured design system. A PoC is not an excuse for unstyled or developer-only UI. Every user-facing screen must look polished, professional, and domain-appropriate from day one.

## Design Tokens (Required)

All generated UI code MUST use a token-based design system. Do not hardcode arbitrary values.

### Spacing Scale (4px base)

```
--space-1: 4px    --space-2: 8px    --space-3: 12px   --space-4: 16px
--space-5: 20px   --space-6: 24px   --space-8: 32px   --space-10: 40px
--space-12: 48px  --space-16: 64px  --space-20: 80px  --space-24: 96px
```

### Typography Scale

```
--text-xs: 0.75rem (12px)   --text-sm: 0.875rem (14px)   --text-base: 1rem (16px)
--text-lg: 1.125rem (18px)  --text-xl: 1.25rem (20px)    --text-2xl: 1.5rem (24px)
--text-3xl: 1.875rem (30px) --text-4xl: 2.25rem (36px)
```

Font stack: `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

### Color Palette (HSL)

```
--brand-50: hsl(214, 100%, 97%)   --brand-100: hsl(214, 95%, 93%)
--brand-500: hsl(214, 84%, 56%)   --brand-600: hsl(214, 84%, 46%)
--brand-700: hsl(214, 84%, 36%)   --brand-900: hsl(214, 84%, 16%)

--gray-50: hsl(220, 14%, 97%)     --gray-100: hsl(220, 14%, 95%)
--gray-200: hsl(220, 13%, 91%)    --gray-300: hsl(220, 12%, 83%)
--gray-500: hsl(220, 9%, 46%)     --gray-700: hsl(220, 14%, 25%)
--gray-900: hsl(220, 14%, 10%)

--success: hsl(142, 71%, 45%)     --warning: hsl(38, 92%, 50%)
--error: hsl(0, 84%, 60%)         --info: hsl(214, 84%, 56%)
```

### Border Radius

```
--radius-sm: 4px   --radius-md: 8px   --radius-lg: 12px   --radius-xl: 16px   --radius-full: 9999px
```

### Shadows

```
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05)
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)
```

## Component Patterns (Required)

### Every page MUST include:

1. **Loading skeletons** — animated placeholder shapes while data loads (never a blank screen)
2. **Empty states** — illustration or icon + explanation + call-to-action when no data exists
3. **Error states** — friendly message + retry button (never raw error text or stack traces)
4. **Responsive layout** — works at 375px (mobile), 768px (tablet), 1280px (desktop)

### Navigation

- Sidebar navigation for apps with 4+ top-level routes
- Top navigation for simpler apps (2-3 routes)
- Always show current location (active state on nav item)
- Mobile: collapsible sidebar or bottom tab bar

### Tables and Lists

- Sortable column headers
- Row hover state
- Pagination (not infinite scroll for data-heavy views)
- Status badges with semantic colors
- Empty state when no rows match filters

### Forms

- Labels above inputs (not floating labels for accessibility)
- Inline validation on blur
- Submit button disabled until form is valid
- Loading state on submit button during API call
- Success/error toast notification after submission

### Modals and Dialogs

- Focus trap (keyboard cannot escape modal)
- Close on Escape key
- Backdrop click to close (with confirmation if unsaved changes)
- Max-width constraint (never full-screen modals on desktop)

## Domain-Specific Patterns

### Financial Services / Banking

- Higher whitespace density (trust signals)
- Progress steppers for multi-step workflows (KYC, onboarding)
- Document preview with zoom capability
- SLA/status gauges (visual, not just text)
- Metric cards for KPIs on dashboards
- Subtle animations (no flashy transitions)

### Healthcare

- High-contrast mode support
- Large touch targets (min 44px)
- Clear data hierarchy (critical info elevated)
- Consent and confirmation patterns

### General AI Applications

- Streaming text indicator (typing animation)
- Source attribution display (citations with expandable references)
- Confidence indicators (when agent is uncertain)
- Conversation history sidebar
- Agent "thinking" state (not just a spinner)

## Interaction Design

### Required micro-interactions:

- **Button press** — subtle scale transform (0.98) on `:active`
- **Hover** — background tint change within 150ms
- **Focus rings** — 2px offset ring (blue) on keyboard focus (`:focus-visible` only)
- **Page transitions** — fade or slide (150-200ms, ease-out)
- **Toast notifications** — slide in from top-right, auto-dismiss after 5s
- **Skeleton shimmer** — left-to-right gradient animation on loading placeholders

### Accessibility (WCAG 2.1 AA minimum):

- Color contrast ratio: 4.5:1 for normal text, 3:1 for large text
- All interactive elements keyboard accessible
- ARIA labels on icon-only buttons
- Skip-to-content link
- Reduced motion: respect `prefers-reduced-motion`

## What This Steering Does NOT Do

- Does not prescribe a specific component library (Tailwind, Shadcn, Amplify UI are all valid)
- Does not replace domain research with the customer
- Does not generate Figma files (but the token system maps 1:1 to Figma variables)

## Reference

See `references/layer-5-ui-design-system.md` for full implementation examples, component code, and links to AWS sample repos with polished UIs.
