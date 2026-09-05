# What Chalk's spec fixes for the portfolio demo

Resolves [#7](https://github.com/hermanno3005/portfolio/issues/7) under the map
[#6](https://github.com/hermanno3005/portfolio/issues/6).

**Question.** What does Chalk's spec fix that the portfolio demo must get right?

**Sources** (all in [hermanno3005/Chalk](https://github.com/hermanno3005/Chalk), read
2026-09-05 from `main`):

- `SPEC.md` — the build spec; sections cited as SPEC §n.
- `CONTEXT.md` — the glossary; cited as CONTEXT "Language".
- `docs/adr/0002-rep-maxes-are-derived-never-stored.md` — cited as ADR-0002.
- `docs/research/swiftdata-cloudkit.md` — checked; it is about persistence only and adds
  nothing on the derivation or Epley. Not cited below.

Wording in code spans and block quotes is verbatim from those files. Where this note
paraphrases, it says so. The demo is a terminal animation, not the app, so the last
section separates what it must reproduce from what it may drop.

---

## 1. The log sheet — two stages, seeding, commit (SPEC §6)

### Structure (SPEC §6, §6.1)

- "A sheet over the calling screen, **two stages**: reps, then weight. One giant number on
  screen at a time." (§6)
- "**Stage one: reps.** Stage two: weight." (§6.1)
- The stage-two header "carries an `N reps` button back to stage one, so the earlier answer
  is always visible and correctable without cancelling." (§6.1)
- Stage change and the digit animate (`.contentTransition(.numericText())`); "the motion is
  what makes staging read as progress rather than a detour." (§6.1)
- "Cancel dismisses without writing. **Save** commits." (§6.1)

### Input modes, both stages (SPEC §6.2)

- Steppers: "**±1 rep**, **±2.5 kg**."
- "Tapping the giant number swaps the steppers for a keypad"; the decimal key is dead on
  the reps stage; "The typed value flows into reps/weight **as you type**, so the verdict
  line stays live."
- Weight stepping "snaps to the 2.5 kg grid" — from a typed 57 kg: "`+` → 57.5 → 60 → 62.5;
  `−` → 55 → 52.5."
- "`−` **clamps at 0** for weight and **at 1** for reps."
- "Tap only. No hold-to-repeat, no acceleration".

### Seeding (SPEC §6.3)

- Reps "seed from your **most recent entry for this exercise on any machine**".
  "**Cold start: 5 reps.**"
- "**Weight is pre-filled only if you proved it on this exact machine**" — the most recent
  entry on the machine in scope; for free-weight, simply the most recent entry for the
  exercise.
- "**Otherwise the weight stage opens blank with the keypad already up.**"
- "**Never seed a weight from another machine.**" "there is no arbitrary `20 kg` default
  anywhere."
- "the common log is **two taps: Next, Save.**" Seeding from the current best is rejected —
  "it quietly encourages logging a rep-max you did not hit."

### Commit (SPEC §6.7)

- "**Save is enabled only for `reps >= 1` and `weight > 0`.** No upper bound, no outlier
  confirmation, no hard ceiling".
- "0 kg is displayable but **not savable**."
- "**After saving, the sheet closes**, the detail screen flashes a brief confirmation, and
  the curve updates behind it. The sheet never stays open to log again".
- Nothing is cached: "Rep-maxes are recomputed after every edit and every delete. Nothing
  caches them." (SPEC §3, invariant 5; ADR-0002.)

**Demo consequence.** The animation's log beat is: reps stage showing a seeded rep count →
Next → weight stage showing the seeded weight with the verdict line live under it → Save →
sheet gone, curve redrawn. The verdict line must not appear on the reps stage (§6.5 below).

---

## 2. The verdict line — five states (SPEC §6.5)

Weight stage only. "Under the number, one line with five states:"

| Condition | Line |
|---|---|
| Beats `best[reps]` | `Beats your 5-rep best by 2.5 kg` |
| Equals `best[reps]` | `Matches your 5-rep best` |
| Below `best[reps]` | `Your 5-rep best is 55 kg` |
| No entry at that rep count, no usable sibling | `First entry at 5 reps` |
| No entry at that rep count, sibling has history | `No history here — 55 kg × 5 on Hammer Strength` |

(Table reproduced verbatim from SPEC §6.5. `5`, `2.5 kg`, `55 kg` and `Hammer Strength`
are the spec's example values; the rep count in the line is the reps chosen on stage one,
`best[reps]` is the current rep-max at that count, and the margin is `weight − best[reps]`.)

Which shows when:

- States 1–3 apply whenever `best[reps]` exists for the scope in view (an entry with
  `reps >= N` exists — remember backfill, §4 below). Compare the weight on screen with it.
- State 4 applies when no entry in scope reaches that rep count and, for a gym-bound
  exercise, no sibling machine has a `best[5]`; also for any free-weight exercise with no
  entry at that count.
- State 5 is "the **hint** — the same sentence and the same most-recently-used sibling as
  §5.4, in **secondary colour, visibly softer than a real verdict**." Gym-bound only. It
  quotes the sibling's `best[5]` and, per §5.4, "shows nothing at all if the sibling has
  no `best[5]`" — no fallback to `best[3]`.
- "**Stage one stays silent.** The line is meaningless until both numbers exist".
- The line is live: it updates as the weight changes, by stepper or keypad (§6.2).

Number formatting for all of these (SPEC §3, Storage details): kilograms only, "**Display
trims the trailing zero: `60`, not `60.0`; `57.5` stays `57.5`.**"

---

## 3. Strength-curve drawing rules (SPEC §5.2, with §5.1 and §5.4)

- **Axis.** "line over a **fixed 1–12 rep x axis**, identical for every exercise so shapes
  are comparable. Leading y axis visible."
- **Y framing.** "**Y axis framed to the data, not anchored at 0** — real strength curves
  are shallow and a zero-based axis flattens them into the top third."
- **Interpolation.** "**Stepped interpolation, with a point mark on every rep count.**
  Monotonic backfill means every untrained rep count repeats the value above it, so the
  curve is a **staircase, not a slope**. Do not smooth it".
- **Backfilled cells.** "**Backfilled cells are not marked** on the curve. The flat run
  reads as a floor on its own." (§4) — so every rep count 1–12 that has a value gets the
  same point mark, whether proven directly or floored.
- **Missing cells.** `best` is "absent where no entry reaches that rep count" (§4,
  `RepMaxCurve`). A cell with no entry at or above it has no point and no line.
- **Ghost curve.** "**The ghost curve sits behind it**, dashed and visibly see-through. It
  must be legible as guidance and impossible to mistake for the solid curve — the first
  scaffolding failed both halves by drawing both as thin dashed grey." So: solid curve
  solid and opaque; ghost dashed, translucent, behind, and different in weight or colour
  from the solid one — not merely a dashed copy.
- **Ghost is unconditional.** "drawn **unconditionally whenever the curve is drawn at
  all** … including against a single entry, where it floats far above a flat line." (§4)
- **Default selection.** "Default selection is **5 reps**." Selection is sticky; a rule
  mark plus an enlarged point track it. (§5.2)
- **Readout above the curve** (§5.1): "One large number — the best weight at the selected
  rep count — with `best for N reps · M entries ›` beneath it. `M` is the count of entries
  with `reps >= N` in scope." Curve is 150 pt tall on the phone.
- **Zero entries** (§5.4): "draws **no chart at all** — no axes, no flat line at zero, no
  ghost. Short text where the chart would be".
- **Non-goal** (§11): "**A trend over time** — no '5RM this year' chart anywhere". The demo
  must not draw a date-axis chart.

---

## 4. The derivation and the ghost (SPEC §4, ADR-0002, CONTEXT)

### Monotonic backfill

```
best[n] = max(weight) over all entries with reps >= n
```
(SPEC §4; CONTEXT "Monotonic backfill" writes it `best[n] = max(weight) where reps >= n`.)

- "A `5 × 55 kg` proves 55 kg at 1, 2, 3, 4 and 5 reps, so it **floors** all of them.
  Nothing is inferred beyond what the lift physically demonstrates. No Epley, no Brzycki,
  no cell fabricated from another, anywhere in the derivation." (§4)
- "**Always the all-time maximum.** No decay, no rolling window, no staleness marker." (§4)
- "**Entries above 12 reps are stored and still floor everything up to 12** — a
  `25 × 30 kg` sets a 30 kg floor across the whole axis. They simply get no point of their
  own." (§4)
- "**Deleting an entry can lower a rep-max. That is the derivation working, not data
  loss.**" (§4; ADR-0002 same.)
- Scope: free-weight → every entry for the exercise; gym-bound → one machine's entries
  only. "**Hints never enter the derivation**". (§4)
- "One fetch, one O(n) pass produces all twelve cells. Do not write twelve `reps >= n`
  predicates." (§4; ADR-0002.) In practice: walk n from 12 down to 1 carrying a running
  max of weights whose reps ≥ n.

### The ghost curve (Epley)

> Epley (`w × (1 + reps/30)`) applied to every entry; take the **single** entry with the
> highest resulting estimated 1RM; project that estimate back across 1–12
> (`ghost[n] = e1RM / (1 + n/30)`).
> (SPEC §4, "The ghost curve")

So, per entry `e1RM = weight × (1 + reps/30)`; `E = max` of those over the scope;
`ghost[n] = E / (1 + n/30)` for n = 1…12. Note `ghost[1] = E / (1 + 1/30)`, not `E` —
the formula is applied uniformly, so the projection at 1 rep is slightly below the
estimate itself.

"The ghost is **guidance only**: never a rep-max, never persisted, never presented as a
number you have lifted." (§4) CONTEXT: "A see-through Epley projection drawn behind the
strength curve, showing headroom you have not yet demonstrated."

### Worked example for a demo dataset

Entries: `5 × 55`, `8 × 50`, `3 × 60`, `1 × 65`, `12 × 40`, `25 × 30`.

- `best[1] = 65`, `best[2..3] = 60`, `best[4..5] = 55`, `best[6..8] = 50`,
  `best[9..12] = 40`. The `25 × 30` floors nothing here (30 is below every other cell) and
  gets no point of its own.
- Epley: 5×55 → 64.17; 8×50 → 63.33; 3×60 → 66; 1×65 → 67.17; 12×40 → 56; 25×30 → 55.
  `E = 67.17` (from `1 × 65`). `ghost[1] = 65.0`, `ghost[5] = 57.6`, `ghost[12] = 48.0`.

(The arithmetic is mine; the rules it applies are the spec's.)

---

## 5. Vocabulary — what the demo may say and must not (CONTEXT "Language")

Every term below is a CONTEXT.md glossary entry; the _Avoid_ lists are verbatim.

| Use | Meaning (paraphrased) | Avoid (verbatim) |
|---|---|---|
| **Entry** | one logged `reps × weight` performance | Record, set, log line |
| **Rep-max**, written `best[n]` | heaviest weight proven at a rep count; derived, never stored | PR, personal record, 1RM (as a stored value), max |
| **Monotonic backfill** | the rule `best[n] = max(weight) where reps >= n` | Interpolation, estimation |
| **Strength curve** | the twelve rep-maxes on a fixed axis | Graph, chart, progression |
| **Ghost curve** | the see-through Epley projection behind it | Estimated max, projected 1RM, target |
| **History sheet** | the `reps >= n` list, newest first | Log screen, entry list, records list |
| **Exercise** | a movement in the library | Lift, movement, activity |
| **Free-weight** | load transfers between gyms | Barbell, non-machine |
| **Gym-bound** | load does not transfer; one machine's entries only | Machine exercise, fixed-weight |
| **Last entry**, written `8 × 52.5 kg · today` | what you last did | Latest, most recent set, history line |
| **Gym** / **Machine** / **Current gym** | where you lift | Location, club, venue / Station, equipment, apparatus / Home gym, default gym, active location |
| **Hint** | another machine's numbers, shown when this one has none | Estimate, reference, suggestion |

Also from SPEC §1, defining the product: "It is **not** a workout logger. There are no
sessions, no sets, no routines, no rest timers. The unit of record is one entry." A demo
caption must not say "set", "session" or "workout".

Number format: kilograms only, never lb; `60` not `60.0`, `57.5` stays `57.5` (SPEC §3).
The multiplication sign in `reps × weight` is `×` (U+00D7) throughout SPEC and CONTEXT.

---

## What the demo must reproduce, and what it may drop

Must get right (each is a "must" or a verbatim string in the spec):

1. Two-stage log: reps, then weight; verdict line on the weight stage only, live as the
   weight changes; Save closes the sheet and the curve redraws (§6.1, §6.5, §6.7).
2. Verdict-line strings exactly as the §6.5 table, numbers formatted per §3.
3. Curve: x axis fixed 1–12; y framed to data; stepped line with a point on every cell;
   ghost dashed, translucent, behind, visibly distinct from the solid curve; ghost always
   drawn when the curve is; default selection at 5 reps (§5.2, §4).
4. Numbers derive from entries by backfill; Epley only in the ghost; new entry can raise a
   run of cells at once, never one cell alone (§4).
5. Words: entry, rep-max, strength curve, ghost curve; never PR / personal record / set /
   1RM-as-a-number / chart (CONTEXT).

May drop, being phone UI rather than the model: steppers vs keypad and the 2.5 kg snap
(§6.2), the machine caption and the whole gym-bound apparatus (§6.4, §5.3), the hint state
if the demo's exercise is free-weight (states 4 and 5 then reduce to `First entry at N
reps`), the scrub gesture, the readout's `M entries ›` link, and the history sheet (§5.6).
A free-weight exercise is the simplest honest choice for the demo: one scope, no machine
row, four reachable verdict states.
