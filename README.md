# ✦ InnerGlow — Daily Affirmations & Mindfulness

A premium, offline-first wellness app in a **single `index.html`** — no build step, no dependencies, all state in `localStorage`.

**Live:** https://innerglow-affirmations.vercel.app

![theme](https://img.shields.io/badge/stack-vanilla%20JS%20%2B%20localStorage-b596ff) ![file](https://img.shields.io/badge/size-~34KB%20single%20file-6ce5cf)

## Features

Inspired by the best mobile wellness apps (I am, Affirmation, Gratitude, Daylio, Motivation, Loving Kindness, 100 wishes):

- **Affirmation of the day** — deterministic daily pick from 48 affirmations across 8 categories (Prosperity, Confidence, Health, Career, Love, Gratitude, Calm, Sleep), with prev/next browsing and text-to-speech "Listen"
- **Library** — filter by category, ♥ favorites, and **write your own** affirmations
- **Mood check-in** — Daylio-style 5-emoji daily mood with a supportive response and a 7-day mood chart
- **Gratitude journal** — three entries a day with rotating prompts, plus full history
- **Guided practice** — breathing orb with aura layers synced to inhale/exhale, in **Breathe** or **Loving-Kindness** (metta phrases) mode, 1–5 minutes
- **Real streaks** — 🔥 streak, weekly consistency %, and mindful minutes computed from actual usage (local-timezone day keys)
- **Share card** — renders the current affirmation onto a branded 1080×1080 PNG (native share sheet on mobile)
- **Daily reminder** — downloads a repeating `.ics` calendar event
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
