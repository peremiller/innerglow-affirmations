# ✦ InnerGlow — Daily Affirmations & Mindfulness

A premium, offline-first wellness app in a **single `index.html`** — no build step, no dependencies, all state in `localStorage`.

**Live:** https://innerglow-affirmations.vercel.app

![theme](https://img.shields.io/badge/stack-vanilla%20JS%20%2B%20localStorage-b596ff) ![file](https://img.shields.io/badge/size-~34KB%20single%20file-6ce5cf)

## Features

Inspired by the best mobile wellness apps (I am, Affirmation, Gratitude, Daylio, Motivation, Loving Kindness, 100 wishes):

- **Affirmation of the day** — deterministic daily pick from 48 affirmations across 8 categories, with responsive category visuals, prev/next browsing, and text-to-speech "Listen"
- **Flexible spoken repetition** — choose 1×, 2×, or 3× for every affirmation before moving to the next; defaults to 2× and remembers your choice
- **Library** — filter by category, ♥ favorites, and **write your own** affirmations
- **Mood check-in** — Daylio-style 5-emoji daily mood with a supportive response and a 7-day mood chart
- **Gratitude journal** — three entries a day with rotating prompts, plus full history
- **Guided practice** — breathing orb with aura layers synced to inhale/exhale, in **Breathe** or **Loving-Kindness** (metta phrases) mode, 1–5 minutes
- **Real streaks** — 🔥 streak, weekly consistency %, and mindful minutes computed from actual usage (local-timezone day keys)
- **Share card** — renders the current affirmation onto a branded 1080×1080 PNG (native share sheet on mobile)
- **Daily glow alerts** — browser notifications and a three-event calendar download for 11:15 AM, 7:00 PM, and 12:15 AM Manila time
- **100 Wishes** — intentions list with check-off-when-true progress
- **4 themes** — aurora, sunrise, forest, midnight

## Run locally

```bash
python3 -m http.server 4741
```

Then open http://localhost:4741. (Opening `index.html` directly also works.)

## Deploy

```bash
vercel deploy --prod
```

## Design notes

Dark glassmorphism with Instrument Serif display type, specular card edges, and accent-tinted shadows. Visual polish came out of a multi-AI design-panel critique round (Gemini suggestions applied: editorial serif, layered breathing orb, springy micro-interactions).

---

Built with [Claude Code](https://claude.com/claude-code).

_Auto-deploys from `main` via Vercel GitHub integration._

## Team moments

Select **Team moment** to choose an intention, a 1/2/3/5-minute duration, music,
optional narration, and one of six sceneries. **Your own words** keeps a custom
message on screen throughout. Preferences are stored on the current device.
**Present full screen** requests native fullscreen and falls back to an immersive
browser-filling view where the Fullscreen API is unavailable. Space pauses,
left/right arrows change slides, M mutes music, and Escape exits. Presentation
controls fade while idle and remain available to keyboard users. Sharing audio in
Teams or Zoom requires enabling sound in that application's screen sharing flow.

Scenery photography is bundled locally as optimized WebP, with separate gallery
thumbnails. Sources: Unsplash images `photo-1473448912268-2022ce9509d8`,
`photo-1475924156734-496f6cac6ec1`, `photo-1464822759023-fed622ff2c3b`,
`photo-1501785888041-af3ef285b470`, and `photo-1509316785289-025f5b846b35`.
The Northern glow image and all music tracks retain the app's existing assets.
No inference server is required for this browser-based feature.
