---
name: event-timeline-playful-ui
description: >-
  Event Timeline web UI style guide — playful claymorphism with blue-orange
  gradients, large rounded corners, capsule tabs, and light Chinese copy.
  Use when building or restyling pages in apps/web, updating shared UI
  components, or when the user asks for playful/cute UI in this project.
---

# Event Timeline Playful UI

Project-specific visual language for `apps/web`. Reference implementation: `/` (我的关注), `EventCard`, `FollowingTabs`.

## Style Keywords

- Playful claymorphism (soft, not toy-like)
- Blue-orange gradient accents (`brand-*` + `orange-*`)
- Large radius: hero `rounded-[1.75rem]`, cards `rounded-[1.35rem]`, pills `rounded-full`
- White/translucent surfaces with light blur and soft shadows
- Capsule tabs with gradient active state
- Chinese copy: friendly, concise, not childish

## Color & Tokens

| Role | Tailwind |
|------|----------|
| Primary | `brand-500`–`brand-700` |
| Accent | `orange-400`–`orange-600` |
| Card border | `border-blue-100/80` |
| Card hover | `hover:border-blue-200`, `hover:shadow-blue-100/70` |
| Muted text | `text-slate-500` minimum (not `slate-400` for body) |
| Heat gradient | `from-brand-500 via-blue-400 to-orange-400` |

## Reusable Patterns

### Page hero (`PageHeader` with `variant="playful"`)

- Gradient bg: `from-white via-blue-50 to-orange-50`
- Decorative blur orbs (absolute, low opacity)
- Optional eyebrow pill: `rounded-full border border-blue-100 bg-white/80`
- Title: `text-3xl font-black sm:text-4xl`
- Optional stat grid in `rounded-2xl bg-white/75 backdrop-blur`

### List card (`card-hover` or `EventCard` pattern)

- Top accent bar: `h-1 bg-gradient-to-r from-brand-500 via-blue-400 to-orange-400`
- Hover: `-translate-y-0.5`, `duration-200`
- Meta chips: `rounded-full bg-slate-50 px-2.5 py-1`

### Segmented tabs (`FollowingTabs` / `CollectionTabs`)

- Container: `rounded-2xl border border-blue-100/80 bg-white/80 p-1.5 backdrop-blur`
- Active: `bg-gradient-to-r from-brand-600 to-blue-500 text-white shadow-sm`
- Inactive hover: `hover:bg-blue-50 hover:text-brand-700`
- Dot indicator before label on active tab

### Heat bar

```tsx
<div className="h-2 w-20 overflow-hidden rounded-full bg-blue-50 ring-1 ring-blue-100">
  <div className="h-full rounded-full bg-gradient-to-r from-brand-500 via-blue-400 to-orange-400" style={{ width: `${pct}%` }} />
</div>
```

## Global CSS Classes (`globals.css`)

- `.card` — static clay container
- `.card-hover` — interactive list card (matches EventCard hover)
- `.btn-primary` / `.btn-secondary` — rounded-lg pills with smooth transitions

Prefer these classes over one-off styles when possible.

## Copy Tone (Chinese)

- Empty states: suggest next action with light personality
- Avoid corporate stiffness; avoid memes or excessive slang
- Examples: 「换个筛选条件试试」 / 「候选池里有好苗子时，把它加入关注」

## Constraints

- **No emoji as UI icons** — use SVG (Heroicons/Lucide) if icons needed
- **Tables & forms**: clay on outer shell only; keep rows/inputs clean and scannable
- **Transitions**: 150–300ms; respect `prefers-reduced-motion`
- **Contrast**: light mode text ≥ 4.5:1; borders visible (`border-blue-100`, not `white/10`)
- **Nav height**: keep sticky offsets stable (`top-20` for sidebars); don't change header height without checking `CandidateStickyBackNav`
- **Dashboard / guide**: global tokens apply lightly; full playful hero optional on those pages

## Implementation Checklist

When restyling a page:

1. Use `PageHeader` with `variant="playful"` (or custom hero matching home page)
2. Align tabs with `FollowingTabs` pattern
3. List items → `.card-hover` or `EventCard`-style
4. Update `EmptyState` descriptions to playful tone
5. Run `ReadLints` on touched files
6. Verify 375px / 768px / 1024px — no horizontal scroll

## File Map

| Area | Key files |
|------|-----------|
| Tokens | `apps/web/src/app/globals.css`, `tailwind.config.ts` |
| Primitives | `components/ui/PageHeader`, `Alert`, `EmptyState`, `Badge` |
| Shell | `components/Nav.tsx` |
| Following | `(home)/page.tsx`, `EventCard`, `FollowingTabs` |
| Hot | `app/hot/page.tsx`, `HotTrendBoards`, `HotSpotEvents` |
| Candidates | `app/candidates/*`, `CandidateList`, `CandidateDetail` |
| Collection | `app/collection/*`, `CollectionTabs` |
| Settings | `app/settings/*` |
