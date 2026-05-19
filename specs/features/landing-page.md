# Feature: Marketing Landing Page (`/`)

## Status
[ ] Draft  [ ] Reviewed  [ ] Implemented  [ ] Tested

## Problem
The root route `/` currently redirects unauthenticated visitors directly to `/auth/signin`,
giving no context about what Pmail is or why they should sign up. There is no public
face for the product. Visitors who arrive from search, social, or word-of-mouth have no
way to evaluate the product before committing to OAuth.

## Success criteria
- [ ] `/` renders for unauthenticated users without redirect
- [ ] `/` redirects already-authenticated users to `/inbox` (server-side, no flash)
- [ ] Page loads in < 1.5 s on a 4G connection (no client-side data fetching, SSG)
- [ ] All interactive elements (CTA buttons, nav links) are keyboard-accessible
- [ ] Page passes Lighthouse accessibility score ≥ 90
- [ ] Works correctly at 375 px (iPhone SE), 768 px (tablet), 1280 px+ (desktop)
- [ ] "Get Started" CTA links to `/auth/signin`
- [ ] Dark-first design consistent with the app's indigo/dark palette

---

## Page sections

### 1 — Navigation bar
- Left: Pmail logo (mail icon + wordmark)
- Right: "Sign in" ghost link → `/auth/signin`, "Get Started" primary button → `/auth/signin`
- Sticky on scroll, backdrop blur, border-bottom on scroll (intersection observer)
- Collapses to hamburger menu on mobile (Sheet component)

### 2 — Hero
- **Headline**: "The AI-first email client that works the way you think"
- **Sub-headline**: 1–2 sentences — unified inbox, AI summaries, reply drafts, instant search
- **Primary CTA**: "Get Started — it's free" → `/auth/signin`
- **Secondary CTA**: "See how it works" → smooth-scrolls to #how-it-works
- **Hero visual**: Full-bleed mockup of the 3-pane inbox UI — a high-fidelity screenshot
  or SVG illustration showing the sidebar, email list, reading pane with an AI summary card.
  Rendered as a `<figure>` with a subtle gradient-fade at the bottom.
  Use a dark-themed browser-frame wrapper (rounded corners, traffic-light dots).

### 3 — Social proof bar
- Single row of logos / text: "Works with Gmail · Outlook · iCloud · Yahoo · Any IMAP server"
- Muted foreground, small caps, icon per provider

### 4 — Features grid (`#features`)
- **Section heading**: "Everything email should have always been"
- 6 feature cards in a 3-col (desktop) / 2-col (tablet) / 1-col (mobile) grid
- Each card: icon, title, 2-sentence description

| # | Icon | Title | Description |
|---|------|-------|-------------|
| 1 | Sparkles | AI Summaries | Claude reads each thread and surfaces a 3-sentence brief so you absorb context in seconds. |
| 2 | Zap | Smart Reply Drafts | One click generates a full reply in your voice — edit or send as-is. |
| 3 | Inbox | Unified Inbox | Gmail, Outlook, iCloud, and any IMAP account in a single, fast, sorted list. |
| 4 | Shield | End-to-End Encrypted | Email bodies are AES-256-GCM encrypted at rest. Even we can't read your mail. |
| 5 | Search | Instant Search | Full-text search across every account in under 200 ms. |
| 6 | Smartphone | PWA — Install Anywhere | Works offline. Add to home screen on iOS, Android, or desktop. |

### 5 — How it works (`#how-it-works`)
- **Section heading**: "Up and running in 60 seconds"
- 3-step horizontal timeline on desktop, vertical on mobile

| Step | Icon | Title | Body |
|------|------|-------|------|
| 1 | LogIn | Connect your accounts | Sign in with Google or Microsoft in one click, or enter IMAP credentials for any provider. |
| 2 | BrainCircuit | Let AI do the reading | Pmail summarises, prioritises, and drafts replies — you only read what matters. |
| 3 | Send | Reply at the speed of thought | Accept an AI draft, tweak it, or write from scratch — all in the same composer. |

### 6 — Feature deep-dive (alternating rows)
Three alternating image-left / image-right sections, each with:
- A dark mockup image/illustration (can be a placeholder SVG with gradient fill)
- Headline + 3-bullet benefit list
- Optional secondary CTA

| Row | Visual side | Headline | Benefits |
|-----|-------------|----------|----------|
| A | Right | "Your inbox, prioritised by AI" | Urgent threads float to the top · Zero-attention newsletters filtered out · Action items extracted automatically |
| B | Left | "Reply drafts that sound like you" | Context-aware suggestions · Tone control (professional / casual) · One-click send or manual edit |
| C | Right | "Search that actually works" | Searches all accounts at once · Understands natural language · Results in < 200 ms |

### 7 — CTA banner
- Full-width dark card with indigo gradient background
- Headline: "Ready to spend less time on email?"
- Sub: "Connect your first account in under a minute."
- Button: "Get Started Free" → `/auth/signin`

### 8 — Footer
- Logo + tagline left
- Links right: Privacy Policy, Terms of Service, GitHub (link to repo), Status
- Bottom row: © 2025 Pmail · Made with Claude

---

## Routing / auth changes

### Middleware update
Add `/` (and `/features`, `/privacy`, `/terms` if they exist) to the public path list in
`auth.config.ts` so the `authorized` callback never redirects them.

Current public check:
```ts
const isPublic = nextUrl.pathname.startsWith("/auth") || nextUrl.pathname.startsWith("/api/auth");
```

New:
```ts
const isPublic =
  nextUrl.pathname === "/" ||
  nextUrl.pathname.startsWith("/auth") ||
  nextUrl.pathname.startsWith("/api/auth");
```

### Root page server redirect
`app/page.tsx` — server component, checks session and redirects authenticated users:
```ts
import { auth } from "@/auth";
import { redirect } from "next/navigation";
export default async function RootPage() {
  const session = await auth();
  if (session) redirect("/inbox");
  return <LandingPage />;
}
```

---

## Component structure

```
app/
  page.tsx                     ← server: auth check → redirect or render
  (marketing)/
    layout.tsx                 ← minimal layout (no AppShell, no sidebar)
    _components/
      LandingNav.tsx           ← sticky nav, client (scroll state)
      HeroSection.tsx          ← server
      SocialProofBar.tsx       ← server
      FeaturesGrid.tsx         ← server
      HowItWorks.tsx           ← server
      DeepDiveRows.tsx         ← server
      CtaBanner.tsx            ← server
      LandingFooter.tsx        ← server
      BrowserMockup.tsx        ← presentational wrapper for hero visual
      FeatureCard.tsx          ← reusable card
      StepItem.tsx             ← reusable step
```

---

## Visual design

### Palette (dark-first, consistent with app)
- Background: `hsl(240 10% 4%)` — near-black
- Surface/card: `hsl(240 10% 8%)` — dark card
- Primary: `hsl(239 84% 67%)` — indigo-500
- Accent glow: `shadow-primary/20` or `shadow-primary/30` on CTAs
- Text: `hsl(0 0% 95%)` heading, `hsl(240 5% 60%)` muted

### Typography
- Headings: `font-bold tracking-tight`, hero at `text-5xl md:text-7xl`
- Body: `text-sm md:text-base text-muted-foreground`

### Motion
- Fade-in-up on section entry using `@keyframes` + `animation-delay` (no JS library)
- Subtle gradient mesh background on hero (CSS only, two radial gradients)
- Hover: `scale-[1.02]` on feature cards, `bg-primary/90` on buttons

### Hero browser mockup
Rendered as a static SVG or a styled div tree showing:
- Browser chrome (dark, with 3 colored dots)
- Sidebar with 4 folder items
- Email list with 3 rows (avatar circles + placeholder text bars)
- Reading pane with an AI summary card (indigo badge + text bars)

---

## Implementation notes

1. The page is fully static (no `fetch`, no database) — eligible for SSG (`export const dynamic = "force-static"` except root page which needs session check).
2. Images/illustrations: use inline SVG or CSS gradients — no external image dependencies at launch. Placeholder boxes with gradient fills are acceptable as v1.
3. The marketing layout must NOT import AppShell, Sidebar, or any store — zero bundle overlap with the app shell.
4. Keep component files < 120 lines each; extract sub-components liberally.
5. Use `next/link` for all internal CTAs (prefetch enabled by default).

---

## Developer contact

Displayed in the footer and on a dedicated `/contact` card within the landing page footer column.

```
Name:     Parias Mukeba
Role:     Founder & Lead Engineer
Email:    pariasmukeba@gmail.com
GitHub:   github.com/marcuselliot
Twitter:  @pariaslunkamba
Location: Kinshasa, DRC
```

### Contact section (footer column — "Built by")
Rendered as a compact card beside the footer link columns:

```
┌─────────────────────────────────────────┐
│  Parias Mukeba                          │
│  Founder & Lead Engineer · Pmail        │
│                                         │
│  📧  pariasmukeba@gmail.com             │
│  🐙  github.com/marcuselliot            │
│  🐦  @pariaslunkamba                    │
│  📍  Kinshasa, DRC                      │
└─────────────────────────────────────────┘
```

- Email is a `mailto:` link
- GitHub and Twitter open in `_blank` with `rel="noopener noreferrer"`
- Card uses `bg-card border border-border rounded-lg p-4` — consistent with app cards
- Avatar: initials "ME" in a `w-10 h-10 rounded-full bg-primary` circle

### Data constant
Define in `app/(marketing)/_components/LandingFooter.tsx`:

```ts
const DEVELOPER = {
  name: "Parias Mukeba",
  role: "Founder & Lead Engineer",
  email: "pariasmukeba@gmail.com",
  github: "https://github.com/marcuselliot",
  twitter: "https://twitter.com/pariaslunkamba",
  location: "Kinshasa, DRC",
  initials: "PM",
} as const;
```

---

## Out of scope (v1)
- Pricing page
- Blog / changelog
- Interactive demo / sandbox
- Animations via Framer Motion
- Real screenshots (use SVG mockups)
- A/B testing variants
