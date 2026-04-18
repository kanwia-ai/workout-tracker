# Workout Tracker — UI Design Spec

Paste-ready for v0 / Lovable / Cursor / Figma AI / Claude artifacts.

## Vibe in one paragraph

**Playful-strong.** This app helps someone who *hates* working out feel excited to open it. Think: the opposite of bro-gym aesthetic (no aggro black-and-red, no stock photos of men with veins, no "GRIND HUSTLE" typography). Instead: a friendly app that happens to be about lifting heavy things. Tactile. A little cheeky. Confident but never preachy. Dark mode always. Rewards the small wins.

## Mascot — "Lumo" (placeholder name)

A round, squishy, expressive little creature that lives in the corner of the screen. Evolves with the user. Reacts to events:

- **Idle (no workout today)**: sleeping, snoring Z's
- **Rest timer between sets**: doing a tiny bicep flex
- **Mid-set**: eyes wide, cheering
- **PR hit**: explodes into sparkles, then returns stars-in-eyes
- **Session complete**: flops backward, sweat droplet, content smile
- **Skipped 3+ days**: slightly sad but not guilt-trippy — gently waves you back

Lumo is ~48px in the nav bar. Frame-by-frame animation style (think Duolingo owl, Apple Memoji, Finch). Renders as SVG or tiny Lottie. **This is the single most important delight element.**

## Color Palette (dark-mode first)

```
--bg-deep:    #0B0B0F    /* near-black, warm */
--bg-raised:  #18181F    /* card surface */
--bg-overlay: #242430    /* modals, sheets */

/* Brand — warmer, more playful than a typical "activity" orange */
--brand:      #FF7A45    /* apricot-coral */
--brand-soft: #FF7A4533  /* 20% tint for backgrounds */

/* Accents — used for specific phase/state energy */
--accent-mint:  #6EE7C7  /* rest days, cool-down, recovery */
--accent-plum:  #C9A0FF  /* PRs, celebration, night */
--accent-sun:   #FFD86E  /* warm-up, morning, energy */
--accent-blush: #FF9AA2  /* completion, heart, you-did-it */

/* Neutrals */
--text-primary:   #F2F2F6
--text-secondary: #8A8A99
--text-tertiary:  #55556A
```

Rule: never use more than 2 accent colors per screen. Orange (brand) + one cool accent per context.

## Typography

- **Display / headlines**: **General Sans** (fallback Manrope) — sturdy, modern, friendly
- **Body**: **Inter** — neutral, legible
- **Accent moments (PRs, streaks, mascot speech)**: **Fraunces** *italic* — just enough literary flourish to feel crafted
- **Numbers (weights, reps, timers)**: tabular numerals always (`font-variant-numeric: tabular-nums`)

Size rhythm: 34 → 24 → 18 → 15 → 13 → 11. No font smaller than 11px.

## Animation & Interaction

- **Set complete**: a juicy bounce (spring physics), a tiny burst of 6-8 particles in brand color, subtle haptic tap (iOS). Sound (optional, opt-in): a satisfying *klop*.
- **PR hit**: the whole card does a "level-up" flash — gradient sweep, particle burst, "NEW PR" in Fraunces italic with a scale-in, Lumo goes stars-in-eyes
- **Day switch**: soft horizontal slide, 240ms
- **Rest timer**: number pulses subtly in time with itself. Not distracting.
- **Regenerate routine**: the old content dissolves into dots, new content fades in
- **Loading (plan generation)**: Lumo is "thinking" — little pencil tapping animation, no fake progress percentages. Just time elapsed + "still cooking."

## Key moments (screens to design)

### 1. Day strip (top of home)
7 day cards Mon-Sun with dates. Training days show a small exercise icon in their assigned focus color (legs → plum, upper → sun, full → mint). Rest days show a moon + Z's. Today has a subtle glow.

### 2. Session view
- **Preamble**: a chat-bubble-style card from Lumo: *"Today's about glutes. You've got 48h of recovery from Wednesday — legs should feel ready."* (Styled as mascot speech.)
- **Warmup / Cardio / Cool-down**: collapsible accordions, each with its accent color. Title line + "regenerate" pencil icon.
- **Main lifts**: each exercise is a card with: name + "?" info icon + 3-5 circular set buttons. Tapping fills the circle with a satisfying animation. Optional weight field; tap a small caret to expand into per-set weights.

### 3. PR celebration
Modal overlay. Confetti. Big "NEW PR" in Fraunces italic. The old number struck through above the new number. Shareable card (screenshot for Insta) optional.

### 4. Onboarding
Warm and short. Each step has Lumo saying something contextual. "Tell me about you" not "Profile Setup." Progress bar made of Lumo footprints.

### 5. Empty states
Never just "No data yet." Always a Lumo moment — *"We haven't worked out together yet. Let's fix that."*

## Microcopy voice

- **Good**: "this one's kinda mean, sorry" · "45 seconds. shake it out." · "nice. next set, same weight." · "nope — ran out of reps. log it honestly."
- **Banned**: "You got this!" · "Crush it!" · "No pain no gain" · "Beast mode" · "Let's go!" · Any phrase a LinkedIn influencer would use.

Voice = *a close friend who also lifts*. Low-key. Dry. Never condescending. Never shouty.

## What to avoid

- Gradient blobs, glassmorphism, AI-slop aesthetic
- Stock fitness photography (replace with illustrations / Lumo moments)
- Progress bars that lie
- Red/green "good/bad" color coding (use the accents — cool for recovery, warm for effort)
- "Gamification" that's actually just stats in a dress (streaks OK; points/badges are tacky)
- Overcrowded dashboards. One primary thing per screen.
- Tutorial popups. Teach through doing.

## Technical notes for the design tool

- Mobile-first, 390×844 default viewport
- iOS safe-area insets respected (top + bottom)
- Works as an installable PWA (React + Vite + Tailwind v4 stack)
- All colors must be tokens (no hard-coded hex in components)
- Component library implied: buttons, cards, accordions, modals, bottom sheets, inputs, sliders, radio groups — modern, rounded (2xl), 56px tap targets for primary actions
