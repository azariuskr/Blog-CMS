# THEMING.md — Semantic Token Contract v1

This file defines the **semantic meaning** of theme tokens used across admin and public/blog UI.

## Rule 1: Semantics over palette
Do not encode design decisions with raw colors in JSX/class strings.
Use semantic tokens (`bg-background`, `text-foreground`, etc.) and component variants.

## Rule 2: One meaning everywhere
Admin and blog must use the same token meanings.
Utilities like `navy-blue-blog-*` are pattern helpers, not a second color system.

## Core token meanings
- `--background`: app/page background
- `--foreground`: default readable text on background
- `--card`: surface background for cards/panels/dialog bodies
- `--card-foreground`: text/icons on card surfaces
- `--popover`: floating surface background
- `--popover-foreground`: text/icons on popovers
- `--muted`: low-emphasis surface (subtle section backgrounds)
- `--muted-foreground`: secondary text
- `--border`: default separators/field borders
- `--input`: input border/background token for controls
- `--ring`: keyboard focus ring color
- `--primary`: primary action/accent background
- `--primary-foreground`: readable content on primary
- `--secondary`: secondary action background
- `--secondary-foreground`: readable content on secondary
- `--accent`: highlight/selection/hover accent surface
- `--accent-foreground`: readable content on accent
- `--destructive`: danger action/background
- `--destructive-foreground`: readable content on destructive

## Interaction mapping
- Hover states: derive from `accent`/`muted` families, not raw HSL.
- Focus states: always visible via `ring` token.
- Active states: remain in semantic family of base control.
- Disabled states: reduce emphasis via opacity + muted foreground.

## Authoring policy
### Allowed
- semantic utility classes (`bg-card`, `text-muted-foreground`, `border-border`)
- component variants defined in UI primitives

### Disallowed (new code)
- hardcoded color values in class strings (`hsl(...)`, `#hex`, `rgb(...)`)
- per-page custom color systems that bypass semantic tokens

## Migration note
Legacy hardcoded colors may still exist and should be removed incrementally.
New/edited code must not introduce new hardcoded color usage.
