# Workout Tracker v2 — Implementation Plan

## Overview
Personal gym companion PWA for ~5 users. Strength training focused (60-90 min sessions), with adaptive warm-ups/cool-downs, exercise capture from social media, progress visualization, and multi-user support.

**Stack:** Vite + React + TypeScript + Tailwind CSS + Supabase + Dexie.js + vite-plugin-pwa
**Hosting:** Replit
**AI:** Gemini 2.5 Flash (free tier) for video exercise extraction

---

## Phase 1: Foundation — Usable Gym Companion
**Goal:** Replace the current artifact with a deployed, persistent, beautiful mobile app you can actually use at the gym tomorrow.

### 1.1 Project Setup
- [ ] Initialize Vite + React + TypeScript project
- [ ] Install and configure Tailwind CSS
- [ ] Install and configure vite-plugin-pwa (manifest, service worker, iOS meta tags)
- [ ] Set up Supabase project (database + auth)
- [ ] Set up Dexie.js for offline-first IndexedDB storage
- [ ] Configure Supabase magic link auth
- [ ] Deploy to Replit, confirm PWA installs on iPhone

### 1.2 Data Model (Supabase)
Tables:
- `users` — id, email, display_name, created_at
- `schedules` — id, user_id, day_of_week, workout_id, is_rest_day
- `workouts` — id, title, emoji, est_minutes, created_by
- `workout_sections` — id, workout_id, name, note, sort_order
- `workout_exercises` — id, section_id, exercise_id, sets, reps, rest_seconds, sort_order, track_weight
- `exercises` — id, name, description, instructions, primary_muscles[], secondary_muscles[], movement_pattern, equipment[], difficulty, body_region, knee_safety, knee_safety_notes, laterality, cues[], source, video_url, image_url, created_by
- `session_logs` — id, user_id, workout_id, date, started_at, ended_at, phases_json (timestamps for warm-up/lifts/cardio/cool-down), completed_sets, total_sets, notes
- `set_logs` — id, session_log_id, exercise_id, set_number, weight, reps_completed, timestamp
- `cardio_logs` — id, user_id, date, type (stairmaster/treadmill/bike/walk/elliptical), duration_minutes, incline, distance, notes, started_at, ended_at
- `user_goals` — id, user_id, goal_type, target_value, current_value, unit, created_at
- `personal_records` — id, user_id, exercise_id, weight, date

### 1.3 Core Tracker UI (use frontend-design skill)
- [ ] Weekly schedule bar (Mon-Sun, today highlighted)
- [ ] Today's workout view with sections and exercises
- [ ] Set completion buttons (tap to complete, tap again to undo)
- [ ] **Adjustable rest timer** — tap the rest time to edit, overlay timer with pause/resume/restart/skip
- [ ] **Work timer** — for timed exercises (planks, swings), same controls as rest timer
- [ ] Weight logging per exercise (with "last time" reference and PR indicator)
- [ ] **Session timer** — "Start Workout" button, phase tracking (warm-up → lifts → cardio → cool-down), timestamps for Oura cross-reference
- [ ] Progress bar for current workout (sets completed / total)
- [ ] Daily cardio section (interactive, not just static text)

### 1.4 Auth + Persistence
- [ ] Login screen with magic link (enter email, check inbox, tap link, done)
- [ ] Sync Dexie.js ↔ Supabase (write to IndexedDB first, sync to server when online)
- [ ] On app load: pull latest from Supabase if IndexedDB was cleared
- [ ] User profile (name, avatar/emoji)

### 1.5 Port Existing Data
- [ ] Migrate current WORKOUTS, SCHEDULE, WARMUP, COOLDOWN arrays into Supabase seed data
- [ ] Map current workout structure to new data model

**Deliverable:** Deployed PWA on Replit that you and your cousin can install on your phones and use at the gym. Persistent data, auth, adjustable timers, session timestamps.

---

## Phase 2: Exercise Library + Adaptive Warm-ups/Cool-downs
**Goal:** Smart warm-ups and cool-downs that match your workout, plus a browsable exercise library.

### 2.1 Seed Exercise Library
- [ ] Import curated warm-up library (40 exercises with full tags)
- [ ] Import curated cool-down library (40 exercises with full tags)
- [ ] Import open-source exercise data (free-exercise-db GitHub, 800+ exercises)
- [ ] Tag all exercises with knee_safety (safe/caution/avoid)
- [ ] Add meniscus-specific notes where relevant
- [ ] Exercise detail view (description, instructions, form cues, common mistakes, regressions/progressions)

### 2.2 Adaptive Warm-up/Cool-down Engine
- [ ] Given today's workout → identify target muscle groups
- [ ] Select warm-up movements that match: 3-5 min general cardio suggestion → joint mobility for target areas → dynamic stretches → muscle activation
- [ ] Select cool-down stretches that match worked muscles
- [ ] Duration picker: 5 / 10 / 15 / 20 min warm-up or cool-down
- [ ] Type picker: dynamic / mobility / recovery / activation
- [ ] Knee-safety filter: auto-exclude `knee_avoid` exercises for users with knee flag

### 2.3 Standalone Mobility Routines
- [ ] Pre-built routines: Hip Mobility (10-15 min), Back/Spine (10-12 min), General Flexibility (15-20 min)
- [ ] "Build me a mobility routine" — pick duration + focus area
- [ ] Accessible from home screen (not just as part of a workout)

### 2.4 Exercise Browser
- [ ] Search exercises by name
- [ ] Filter by: muscle group, equipment, body region, difficulty, knee-safety
- [ ] Tap to view full detail (instructions, cues, video link if available)
- [ ] "Add to my workout" flow

**Deliverable:** Warm-ups and cool-downs that actually match leg day vs. arm day. Browsable exercise library. Standalone mobility routines.

---

## Phase 3: Specialized Protocols
**Goal:** Quad strengthening and glute protocols with progression tracking.

### 3.1 Quad Strengthening Protocol
- [ ] 9-week progressive program (TKEs → wall sits → leg press partial → step-ups → split squats)
- [ ] Week-by-week exercise unlocking (weeks 1-2: isometrics only, weeks 3-4: add machine work, etc.)
- [ ] Pain/swelling check-in after each session — if flagged, auto-regresses
- [ ] Progress tracking specific to the protocol

### 3.2 Glute Protocol
- [ ] Glute max exercises (hip thrusts, glute bridges, RDLs, cable kickbacks)
- [ ] Glute medius/minimus (banded clamshells, lateral walks, fire hydrants, side-lying abduction)
- [ ] Deep stabilizers (Pilates-style: banded hip CARs, donkey kicks, hip circles)
- [ ] Suggested integration: banded activation as lower-body warm-up, heavier work as main lifts

### 3.3 Protocol UI
- [ ] Protocol overview screen (what week you're on, what's next)
- [ ] Exercises marked with which protocol they belong to
- [ ] Protocol progress visualization

**Deliverable:** Structured quad and glute programs that progress over time, with PT/Pilates-style activation work integrated.

---

## Phase 4: Progress Visualizations
**Goal:** See your progress without being overwhelmed (anti-Oura: one insight at a time).

### 4.1 Weekly Recap Card
- [ ] Shows on home screen after completing a week
- [ ] 1-2 highlights: "You trained 4x this week" / "New PR on hip thrusts" / "Stair master up to 28 min"
- [ ] Tap to see more detail

### 4.2 Individual Charts (accessible from profile/history)
- [ ] **Weight progression per exercise** — line chart over time (e.g., lat pulldown: 50 → 75 lbs over 8 weeks)
- [ ] **Cardio duration trend** — line chart with goal line (stair master → 60 min target)
- [ ] **Consistency calendar** — GitHub-style contribution graph for gym days
- [ ] **Session duration** — how long workouts are over time
- [ ] **Volume by muscle group** — heat map or bar chart showing if you're balanced or neglecting something

### 4.3 Design Principles
- Default view: clean, minimal, one card at a time
- Swipe or tap to explore deeper
- No dashboard with 15 charts

**Deliverable:** Motivating progress views that show trends without drowning you in data.

---

## Phase 5: Social Media Exercise Capture
**Goal:** Paste a TikTok/IG/YouTube URL and extract the exercise into your library.

### 5.1 Backend: Video Extraction Pipeline
- [ ] API endpoint: accepts URL
- [ ] yt-dlp downloads video (handle TikTok, Instagram, YouTube)
- [ ] Send video to Gemini 2.5 Flash API with structured extraction prompt
- [ ] Return: exercise name, muscle groups, equipment, sets/reps/duration, form cues, text overlays
- [ ] Error handling: if download fails, return "try screenshot instead"

### 5.2 Backend: Screenshot Fallback
- [ ] API endpoint: accepts 1-3 images
- [ ] Send to Gemini 2.5 Flash vision
- [ ] Same structured extraction as video path

### 5.3 Frontend: Capture Flow
- [ ] "Add Exercise" button → "From URL" or "From Screenshot"
- [ ] URL input → loading state → review extracted data
- [ ] Edit any field before saving
- [ ] "Add to Library" saves to exercises table
- [ ] "Add to [Day]" adds to a specific workout
- [ ] Save source URL for reference

**Deliverable:** Paste a URL, get structured exercise data, add it to your plan. Screenshot fallback for private/restricted content.

---

## Phase 6: Cardio Tracking + Goals
**Goal:** Track cardio sessions with goal progression.

### 6.1 Cardio Logging
- [ ] Quick-log from today's workout view: type (stair master, incline treadmill, bike, walk, elliptical), duration, optional incline/distance
- [ ] Start/stop timer option (or manual entry)
- [ ] Timestamps captured (for Oura cross-reference)

### 6.2 Goal System
- [ ] Set a goal: "60 minutes on stair master"
- [ ] Progress line on cardio chart showing trend toward target
- [ ] Milestone celebrations (hit 30 min? 45 min?)

**Deliverable:** Cardio logging integrated into workout flow, with stair master goal tracking.

---

## Phase 7: Workout Builder
**Goal:** "I have 30 minutes, build me a lower body workout."

### 7.1 Builder Flow
- [ ] Input: available time (15/30/45/60 min), focus area (lower/upper/full/specific muscle), equipment available (gym/home), intensity preference
- [ ] Engine selects exercises from library: warm-up → main lifts → accessories → cool-down
- [ ] Respects knee-safety flags
- [ ] Shows preview → user can swap any exercise → confirm and go
- [ ] Save as a new workout or use as one-off

### 7.2 Smart Suggestions
- [ ] Based on history: "You haven't hit back in 5 days" or "Your quads are lagging behind your glutes"
- [ ] Progressive overload hints: "Last time you did 65 lbs, try 70"

**Deliverable:** On-demand workout generation from your exercise library.

---

## Build Order Rationale

| Phase | Why This Order |
|-------|---------------|
| 1. Foundation | You need something you can use at the gym ASAP. Replaces the broken artifact. |
| 2. Library + Warm-ups | The #1 complaint about the current tracker (same warm-up every day). Biggest quality-of-life improvement. |
| 3. Protocols | Your meniscus and glute goals are personal priorities. |
| 4. Visualizations | Needs data from phases 1-3 to be meaningful. |
| 5. Social Capture | Cool feature but not blocking daily use. |
| 6. Cardio + Goals | Enhances the tracker but basic logging works from Phase 1. |
| 7. Workout Builder | Needs the full exercise library (Phase 2) and usage history to work well. |

---

## Design Direction

- **Mobile-first** — designed for iPhone in portrait, used at the gym
- **Dark mode** — easier to see in gym lighting, matches current tracker aesthetic
- **Large tap targets** — you're tapping with sweaty hands between sets
- **Minimal chrome** — the workout is the UI, not buttons around the workout
- **Progressive disclosure** — show what matters now, details on tap
- **Anti-Oura** — one insight at a time, not a dashboard explosion
