# 探索ラボ: teaching workspace audit and refactor

Reviewed 5 November 2026. Scope: the existing React/Vite repository, including all six algorithm categories. This is a source and interaction audit. Browser automation was blocked by the available Windows browser's URL-policy support, so no visual browser, device, or assistive-technology conformance claim is made.

## Verdict

The interface made students manage a dashboard before they could study an algorithm. The decorative introduction, duplicate category navigation, reward card, and utility toolbar competed with the actual lesson. A visualization and highlighted listing were present, but their proximity did not guarantee a student understood the relationship.

The most serious educational ambiguity was the meaning of a step. These algorithms generate snapshots of comparisons, visits, swaps, or evaluations. They do **not** generate an event for every executed line of Python. A highlighted line without that qualification looks like a debugger and can teach an inaccurate execution model.

The existing app already had valuable features: immutable snapshots, backward seeking, useful examples, keyboard handling, reduced-motion support, settings, and an accessible trace. This refactor builds around those capabilities.

## 1. Component layout: establish one attention frame

| Finding | Consequence | Implemented response |
| --- | --- | --- |
| Large introduction before the experiment | Every session starts with navigation through content that does not help the current problem | Compact category heading and a prediction prompt |
| Category selection in both sidebar and tabs | Two equally prominent answers to the same navigation question | Desktop uses the named sidebar; smaller screens use tabs and a drawer |
| 65/35 split gave the listing little room | Longer code lines demanded horizontal scanning | New installations default to 55/45; saved preferences remain respected |
| Playback belonged to the visualization card | It appeared to control one panel rather than one shared execution | A labeled, sticky playback bar spans the whole workspace |
| Variables were scattered through statistics and trace | The student had to remember values while finding the active line | A shared definition list shows recorded indices, bounds, values, frontier counts, costs, or scores as appropriate |
| Code did not follow the active line | A correct highlight could be outside the visible code pane | Scroll only the code pane when its active line leaves view |
| Long arrays could hide the current item | A new step appeared to do nothing | Pan only the array viewport to reveal the active item |
| Hint card and rewards stayed prominent throughout execution | Competing reading tasks interrupted observation | Hints are a disclosure; rewards remain accessible through navigation |

The new reading order is **algorithm/data → shared controls → current state → visualization and code → utilities/statistics/trace**. Both panels use the same immutable frame. Backward seeking restores that frame; it does not attempt to reverse a running program. A visible note explains the operation-level step model, and the code highlights use `aria-current="step"`.

Changed watch values have a border and a visible mark. Their tooltip gives the previous snapshot's value. The watch deliberately avoids inventing local variables that the algorithm engine does not record. A separate comparison readout explicitly shows the inspected array value's relationship to the target.

## 2. Accessibility and contrast: assign colors to meanings

Execution states are independent of the customizable decorative accent. Gray does not mean unreadable. Success means a found item, established route, solution, or confirmed sort position; it does not mean an unvisited value.

| Meaning | Light text / background | Dark text / background | Additional visual cue | Text contrast, light / dark |
| --- | --- | --- | --- | --- |
| Current index / corresponding code | `#175cd3` / `#eff6ff` | `#93c5fd` / `#183353` | Strong outline, pointer, “現在”, code-line marker | 5.50 / 7.11 |
| Value comparison / changed state | `#854d0e` / `#fef3c7` | `#fde68a` / `#453510` | Dashed boundary, explicit comparison expression or change mark | 6.15 / 9.53 |
| Found / confirmed | `#116149` / `#ecfdf5` | `#6ee7b7` / `#143e31` | Check mark, “発見” or “確定”, double border on array cells | 7.04 / 7.81 |
| Discarded search space | `#526174` / `#edf1f5` | `#bdcad8` / `#283544` | Hatch pattern, dashed border, “対象外” | 5.57 / 7.49 |

Ratios are calculated from the unrounded sRGB values. Paper uses the same semantic state pairs as light mode. The automated tests also check the primary text, secondary text, syntax tokens, focus cues, and input boundary tokens against their intended surfaces. They do not assess every old component or rendered pixel.

The actual CSS API is in `src/workspace.css`:

```css
/* Use role tokens instead of picking a different green on each component. */
.code-line.highlighted {
  background: var(--current-soft);
  border-color: var(--current);
}
.array-column.excluded .array-value {
  color: var(--discarded);
  background-color: var(--discarded-soft);
  border: 1px dashed var(--discarded);
}
```

If this app adopts Tailwind, map these same CSS variables into named theme colors (`current`, `compare`, `found`, `discarded`) rather than duplicating hex values in individual components. Keep the icons, labels, and border styles alongside the utilities.

Normal text needs at least 4.5:1; meaningful graphical and control-state cues generally need 3:1 against adjacent colors. [WCAG 2.2 text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

State labels, check marks, pointers, and patterns provide information alongside hue. [WCAG use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).

Primary transport controls are at least 44 CSS pixels high. This intentionally exceeds the 24-by-24 minimum or spacing alternatives in [WCAG 2.2 target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). The maze remains an inherently spatial editor and still needs real touch-device evaluation.

## 3. Flow controls: keep intervention immediate

The transport now sits above both panels and stays at the top of the viewport while scrolling within the workspace. Back, play/pause, and forward have visible Japanese labels. Desktop key hints appear beside them; phone layouts prioritize touch targets. The speed label remains visible on phones, and speed changes apply to the running interval without resetting the step.

| Action | Control / shortcut | Behavior |
| --- | --- | --- |
| Play / pause | 再生 / 一時停止; `Space` | Same action even when a transport button has focus; held Space does not repeatedly toggle |
| Previous / next snapshot | 戻る / 進む; `←` / `→` | Pause first, then seek one snapshot |
| Faster inspection | `Shift` + `←` / `→` | Seek ten snapshots |
| Change speed | Labeled select; `[` / `]` | Move through 0.25× to 16× without losing position |
| First / last | Reset / finish icons; `Home` / `End` | Seek and pause; last-step icon is omitted from the smallest transport row |
| Disable playback shortcuts | Display settings | Preserves click controls and native editing for speech-input or alternative-input workflows |

Text fields, selects, contenteditable areas, IME composition, category-tab navigation, and maze editing retain their own keyboard behavior. Modals and the navigation drawer suspend playback shortcuts. The drawer now traps focus, closes with Escape, restores its trigger's focus, and makes the background inert. A closed narrow-screen drawer is also inert.

Live narration is polite during manual stepping and suppressed during continuous playback, preventing every fast frame from queuing an announcement. This still needs verification with actual screen readers; dynamic live-region behavior varies. Reading a step manually remains available through the description, watch, and trace.

## 4. Mobile and tablet adaptation

| Available viewport width | Layout |
| --- | --- |
| Above 1100px | Named sidebar, 55/45 default visualization/code split, shared controls and watch |
| 701–1100px | Sidebar becomes a focus-managed drawer, freeing the width needed to retain both panels |
| 700px and below | Shared controls and wrapped watch; visualization with a compact synchronized code line; full code listing below |

The phone design keeps the causal connection visible without trying to fit two unreadable columns. The compact code line wraps. Full source remains horizontally scrollable within its own panel; arrays, trees, and maze diagrams keep local pan areas instead of shrinking values into illegibility. The explicit stacked and focus preferences remain available.

Page text and controls should reflow; intrinsically spatial diagrams may require their own scroll region. That exception is not permission for the whole dashboard to overflow. [WCAG reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html). Verify 320px, 390px, 768px, 1024px, and 1440px widths, browser zoom to 400%, increased text size, and both tablet orientations before claiming conformance. Those visual checks were not available in this session.

## Assumptions to challenge next

1. **“Watched” means “learned.”** The existing XP system awards completion, including jumping straight to the end. That measures exposure and use of controls. Keep it separate from claims about mastery. Add an optional prediction → step → explanation exercise and evaluate whether students can explain an unfamiliar trace later.
2. **A neat default dataset teaches the algorithm.** Middle targets and successful searches hide empty inputs, duplicates, absent targets, skewed trees, and failed paths. Existing presets and tests cover several of these, but the teaching sequence does not require students to encounter them. Offer a short curated counterexample sequence.
3. **Automatically repairing input is instruction.** Sorting a binary-search input or removing BST duplicates can conceal the prerequisite or original data. The app reports some transformations, but students still need an explicit before/after explanation and an exercise showing why invalid input breaks the method. Do not silently imply preprocessing has no cost.
4. **All learners can watch and read at once.** Peripheral vision is a convenience, not an accessible prerequisite. Screen-reader users, learners with low vision, dyslexia, attention differences, motion sensitivity, or working-memory limitations need independently understandable text and manual pacing. The refactor improves access but does not replace a full assistive-technology audit.
5. **A phone is a small laptop.** Commuters may have one hand, unstable light, a soft keyboard, little uninterrupted time, or no network. Preserve readable labels and user-controlled pacing. Large trees still require panning. This app is not a guaranteed offline PWA, and remote fonts need fallback; offline installation/caching is outside this change.
6. **Japanese descriptions imply a shared vocabulary.** International students may know English identifiers but not Japanese algorithm terminology. Keep identifiers verbatim, and consider a terminology glossary and translated explanations without changing code semantics.
7. **A saved experiment preserves the learner's place.** The current persistence restores data/settings while stopped; it does not preserve a specific execution step. Interrupted study needs an explicit resume-point design, especially on phones. Do not promise exact continuation today.

## Validation and remaining limits

Interaction regression tests cover forward/backward synchronization, current code and watch values, transport-focused Space, held-key behavior, speed changes, native text editing, shortcut disabling, drawer focus containment, Escape, and dialog handoff. Token contrast checks cover light, dark, and paper themes. The existing algorithm, persistence, import/export, and learning tests remain part of `npm run check`.

Executed successfully: `npm run check` (58 tests, TypeScript checking, Vite production build), `git diff --check`, and a production HTTP smoke check (HTML plus compiled JavaScript and CSS returned HTTP 200). The temporary preview process was stopped after the check.

Before release, perform the viewport/zoom checks above and test NVDA/Firefox, VoiceOver/Safari, forced colors, real touch panning, short landscape heights, long and skewed graphs, and every accent/theme combination. In particular, sticky controls and multiple local scroll regions need real device testing for focus visibility and comfortable reading. This is an implemented accessibility improvement, not a WCAG certification or evidence of improved learning outcomes.
