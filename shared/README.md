# College Events Platform — Design System

## Files

| File | Purpose |
|------|---------|
| `design-tokens.css` | Master CSS custom properties + base styles + component classes |
| `tailwind-preset.css` | Tailwind v4 `@theme` block mapping tokens to utility classes |
| `StyleGuide.jsx` | Living reference component — route at `/style-guide` (dev only) |

## Usage in each portal

Each portal's `src/index.css` imports in this order:

```css
@import "../../shared/design-tokens.css";   /* tokens + base + components */
@import "tailwindcss";                       /* Tailwind engine */
@import "../../shared/tailwind-preset.css"; /* token → Tailwind mapping */
```

## Color Palette

| Role | Token | Hex |
|------|-------|-----|
| Primary (Navy) | `--color-primary-600` | `#1e3a8a` |
| Accent (Light Blue) | `--color-accent-500` | `#0ea5e9` |
| Text Primary | `--color-gray-900` | `#111827` |
| Text Secondary | `--color-gray-600` | `#4b5563` |
| Border | `--color-gray-200` | `#e5e7eb` |
| Background | `--color-bg` | `#ffffff` |
| Surface Subtle | `--color-gray-50` | `#f9fafb` |

## Typography

- **Display / Headings**: Inter (600–700 weight)
- **Body**: Roboto / Open Sans (400–500 weight)
- **Mono**: ui-monospace / Cascadia Code

## Component Classes

All reusable component base classes are in `design-tokens.css`:

- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`
- `.btn-sm`, `.btn-lg`
- `.card`, `.card-flat`
- `.badge`, `.badge-{primary|accent|success|warning|error|neutral}`
- `.input` (with `.error`, `:disabled` states)
- `.table`
- `.alert`, `.alert-{info|success|warning|error}`
- `.progress-track`, `.progress-fill`
- `.skeleton`
- `.nav-item` (with `.active`)
- `.stat-card`
- `.topbar`, `.sidebar`
- `.modal-overlay`, `.modal`
- `.label`, `.caption`

## Layout

- 12-column grid: `.grid-12` + `.col-{1–12}`
- Page shell: `.page-layout` → `.sidebar` + `.main-content`
- Max content width: `1200px` (`--content-max-width`)
- Sidebar width: `240px` (`--sidebar-width`)
- Topbar height: `64px` (`--topbar-height`)

## Portal Differentiation

Each portal overrides `--portal-accent` and optionally `--brand` in its own `index.css`:

| Portal | Brand Override |
|--------|---------------|
| Student | `--color-accent-500` (light blue) |
| Faculty | `--color-primary-600` (navy) |
| Super Admin | `--color-primary-800` (deep navy) |
