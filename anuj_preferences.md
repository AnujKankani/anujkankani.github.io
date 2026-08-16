# anuj_preferences.md

Design preferences, reconstructed from working sessions on this site. Companion
to [CLAUDE.md](CLAUDE.md) (what the code does), [TOOLS.md](TOOLS.md) (how to
build widgets) and [TODO.md](TODO.md) (what's open).

**Read the confidence markers.** Lines carrying a **quote** are things Anuj
actually said. Lines marked *(inferred)* are patterns pulled from a sequence of
decisions — useful defaults, but not instructions, and worth checking before
leaning on one hard. Anything here can be overridden by just saying so.

---

## 1. Working style

- **Give me a ranked queue, not a menu.** "ok what's next?" is a recurring
  question. The useful answer is a short prioritized list with a recommendation
  and an explicit note of what's blocked on me. *(inferred, strongly)*
- **I commit my own work.** Stage and describe; don't commit, push, or pull.
  This is golden rule 1 in CLAUDE.md and it has held every session.
- **Don't delete without asking.** Say what would be lost first. Untracked
  files are unrecoverable — treat removing one as permanent.
- **Small, obvious fixes beat re-architecture.** When a change spiralled into a
  new mechanism, the correction was: *"we had it working before. Can't you just
  do that with an if statement for light vs dark mode?"* If a request seems to
  need a redesign, propose the one-liner first.
- **Failing is fine; faking is not.** If the real solution isn't reachable, say
  which part is blocked and why, and finish the rest. No stubs, no hard-coded
  values, no disabled checks.
- **Verify before claiming.** Screenshots and measurements over assertions.
  Every "it fits now" should come with the numbers it was measured at.
- **Keep the docs true.** Two separate requests to audit every comment
  (*"make sure all the comments are needed and up to date"*) and one to audit
  every `.md` file (*"let's make sure all the existing information is
  correct"*). Stale accurate-sounding prose is treated as a defect, not
  cosmetics.
- **Delete carefully, but do delete.** *"you can delete unused code but make
  sure to double check your files so you only delete what is intended and
  nothing extra."*
- **"Done" gets audited.** After I reported a review's findings all fixed, the
  next question was *"have all the adversarial reviewer's comments been
  addressed?"* — and five had been dropped when I transcribed the review into
  a task list. Claiming completeness invites the check, so **verify against the
  original source, not against your own summary of it**, and say plainly which
  items were dropped, deferred, or judged not worth doing. *(inferred)*
- **Adversarial review is wanted, and its output is not gospel.** The ask is
  consistently "review, then tell me which are real" — a vetted list, not a
  relay. Golden rule 5 in CLAUDE.md says the same: disagree with a subagent
  when it is wrong, escalate a genuine deadlock. *(stated, via `/agents` use
  and the phrasing "determine which are real issues")*

---

## 2. Figures and illustrations

The hero figure went through roughly a dozen rounds. The pattern is consistent.

### Style

- **Light ground, always.** The first dark-themed attempt was rejected outright:
  *"No I don't like this theme. I want a light mode theme."*
- **No text in the artwork.** Stated twice, unprompted both times. Labels,
  annotations, axis text — none of it. The caption and `aria-label` carry the
  explanation instead.
- **Cartoon, not diagram.** *"Just a big picture cartoonish (or some other
  theme) type figure."* Thick outlines, flat fills, no gradients, no shading.
  The "light cartoon" and "light riso" treatments were the two that landed.
- **Not scientifically informative, and that's the point.** *"It is not geared
  to be scientifically informative."* A hero figure is a mark, not a result.
  Say so in the alt text and move on.

### Composition

- **Subtract, don't add.** Nearly every round removed something: the current
  sheet, the plasmoids, the concentric wavefronts, the infalling particles.
  Nothing was ever asked to be re-added. **When in doubt, cut an element.**
  *(inferred, very strongly — this is the single clearest pattern)*
- **One idea per half.** The hero is one black hole bisected: gravitational
  waves left, plasma right. Two descriptions of one object, not two objects.
- **Contrast carries the meaning.** Left is energy leaving, right is matter
  arriving. That opposition does the work text would otherwise have to.
- **Prefer the specific over the generic.** *"get rid of the circles and just
  have a single gravitational wave being emitted"* — one wave beats concentric
  rings. *"something that looks like a conical accretion flow"* — a named
  structure beats a generic swirl.
- **Physics should be visible in the geometry.** Particles at the jet boundary
  because *that is where acceleration happens*; the wave exiting *smoothly
  along the axis* rather than wrapping the hole. If the drawing implies wrong
  physics, it's wrong even when it's a cartoon.
- **Realism where it's cheap.** When the current sheet was still in: *"let's
  make the current sheet more realistic. It should look more like a current
  sheet undergoing reconnection with plasmoid formation. You can look up what
  this looks like."* Research the real morphology rather than inventing one.

### Things that were called out as wrong

Worth checking any new figure against these — each was a shipped draft:

| Symptom | Cause | Fix |
|---|---|---|
| Jets read as butterfly wings | lobes rotated by *opposite* angles | a bipolar pair is collinear |
| Figure read as a face | two matched dark discs side by side | unequal masses, touching |
| Trails read as lollipops | uniform-width stroke with a dot on the end | taper the trail to a point |
| Wave read as wrapping the hole | amplitude peaked at the hole | pinch amplitude to zero at both ends |
| Cream figure on a dark page | pasted the standalone build, not the themed one | inline the CSS-variable build |

---

## 3. Animation

- **Animate the figure, keep its orientation.** *"turn the figure in the
  website into an animate. Keep it horizontal as it is now."*
- **Causality is not optional.** *"Let's make sure no particles are animated
  ahead of where the jet is."* Each particle's delay is derived from its
  distance down the cone, not from its index in a list. If the animation
  implies something moved before its cause arrived, it's a bug.
- **Pacing gets tuned by ear, in percentages.** *"let's reduce the speed of the
  jet by 50%"*, then later *"let's make the jet animation 30% faster."* Expect
  the same element to be re-timed more than once — so keep the pacing in ONE
  named constant (`EMERGE_FRAC`) rather than spread across keyframes, and keep
  tests on the durable invariant (the jet finishes after the wave) rather than
  on whatever ratio is current, or every retune is a test failure.
- **End on a hold, not a loop.** *"at the end of the animation we can pause for
  a few seconds with just the particle animation."* The 17 s cycle builds for
  the first ~54%, then holds finished from 54–85% with only the particles
  moving, then fades. Give the reader time to actually look at it.
- **CSS over JavaScript for decorative motion.** *(inferred)* No rAF loop, no
  frame budget to manage, and it composites off the main thread.
- **Stop when off-screen.** Non-negotiable across the whole site.
- **Be willing to cut the whole thing.** The scroll rails went animated →
  static and fainter → dark-mode-only → *"Let's just get rid of the side
  animations and figures for both light and dark mode."* Four rounds of
  iteration ending in deletion is an acceptable outcome, not a failure.

### Photographs

- **Show the work, not just the person.** Of the photographs supplied, the ones
  that lead the slideshow are the blackboard and the conference talk — the two
  where something is being *done*. A portrait and personal shots follow.
  *(inferred, from the ordering asked for: "keep the chalk and anuj_seecs
  photos first")*
- **Horizontal photographs get horizontal space.** *"anuj_chalk is also a wide
  photo… we can change the holder to be wider for that one."* Cropping a
  landscape shot into a portrait frame discards the subject, and it gets
  noticed.
- **Cropping that clips people gets noticed too.** *"some of the vertical
  photos are being cut off."* Match the frame's aspect to the sources before
  choosing it, rather than cropping everything to a frame picked first.
- **Whitespace next to content is a prompt, not a design.** Twice now: the
  gutters beside the body text, then the gap beside the name. Both times the
  answer was to put something there, not to re-centre the text.
- **Adding is provisional.** A NASA Goddard photograph was added, integrated as
  a fifth scene, and removed two messages later. Build so that removing is as
  cheap as adding — one row in the generator, one markup block, and constants
  that a test checks. *(inferred)*

---

## 4. Layout and typography

- **The first screen must fit without scrolling.** *"reduce the size of the
  main header and figure so both fit when we load the webpage without any
  scrolling."* Treated as a hard constraint, re-measured across the viewport
  matrix — not an aesthetic judgment made on one screenshot.
- **Sizes are given in percentages.** *"make the main header 80% the size",
  "make the animation 70% the size."* Expect relative adjustments, and expect
  to be held to them — report the measured before/after ratio, not just "looks
  smaller."
- **Whitespace at the edges is suspicious.** *"there is a lot of whitespace on
  the edges. Is this intentional?"* — about the whole site, not one block. The
  reading column's `max-width` should cap *prose only*; figures, widget embeds
  and media grids break out past it.
- **Full width for wide things.** *"extend the animation so it takes up the
  whole page left to right."*
- **But never at the cost of cropping.** *"the animation is too zoomed in now.
  Parts of it are being cut off."* Fit by reshaping the artwork (flatten it,
  crop the viewBox to the content), never by cropping the drawing to the box.
- **Reverting one part of a change is fine.** *"can we undo the whitespacing
  change to the figure so it looks like it did before"* — while keeping the
  same change everywhere else.
- **Mobile is a real target, not a checkbox.** Touch targets keyed off
  `pointer: coarse`, verified at 390px and below. A rule that helps desktop and
  hurts a phone gets a breakpoint, not a shrug.

---

## 5. Video and explainers

- **One short animated walkthrough per paper.** Manim, ~60–100 s, a distinct
  palette per paper.
- **Every number on screen comes from the paper.** Hand-tuned curves are
  labelled `SCHEMATIC` until the real figure data lands, and *"drop the banner
  in the same commit that lands the data, never before."*
- **Ship a web derivative, not the master.** 30 fps, CRF 26 — ~66% smaller than
  the 1080p60 render and visually identical on slide content. Masters stay out
  of git.
- **Re-render freely; re-encode deliberately.** Each encode into `assets/` is a
  new blob in history forever.
- **Nothing loads until it's asked for.** `preload="none"` plus a poster, so a
  visitor who scrolls past downloads ~30–40 KB and no video.
- **Posters are chosen, not grabbed.** Pick a frame where a slide is fully
  built, never mid-transition.

---

## 6. Scientific honesty

This is the value that overrides the rest, and it shows up in every layer.

- **An illustration must announce itself.** The hero figure's `aria-label`
  says "Illustration:" because the artwork carries no text to say it.
- **Placeholder content doesn't ship quietly.** The Random section was cut
  rather than shipped with lorem ipsum — *"cut rather than ship lorem ipsum on
  a page aimed at hiring committees."*
- **The physics is correct or the tool doesn't exist.** No fudged constants to
  make a plot look nicer. If a formula is approximated or a regime is outside
  its validity, the page says so.
- **Placeholders that do ship are marked.** `SCHEMATIC` banners, `YOUR_ID` in
  a link, an all-zeros ORCID — visibly wrong beats plausibly wrong.
- **Don't guess my identifiers.** Email, ORCID, Scholar ID, publication details:
  ask, never invent.

---

## 7. Sharing and reuse

- **The widgets are meant to be reused; the writing is not.** The repo is MIT
  licensed for code — tool pages, `tools/`, the harness, the generators — while
  the site's prose, the explainer videos and the manim sources stay All Rights
  Reserved. Each standalone tool links its own source and the licence.
  *(**assumed, not stated** — I chose MIT and drew that scope line when adding
  [LICENSE](LICENSE). It follows from "for interactive physics explainers,
  reuse is most of the value to other researchers", which was the stated
  rationale for the item, but the specific licence and the split were my call.
  Say the word if either is wrong.)*
- **Self-containment is a feature for the reader, not just a build rule.**
  Every tool page saves to disk and still runs. Worth keeping true, and worth
  saying out loud where a visitor can see it.

---

## 8. Quick checklist for anything new

- [ ] Light ground; no text baked into the artwork
- [ ] Could an element be removed? Remove it
- [ ] Does the geometry imply the right physics?
- [ ] Does it fit above the fold — measured, at 1280×720 and up?
- [ ] Does it survive 390px wide without becoming a smudge?
- [ ] Motion: causal, slow, ends on a hold, pauses off-screen
- [ ] Is it honest about being an illustration / schematic / placeholder?
- [ ] Comments and `.md` files still true after the change?
- [ ] Staged and described — not committed
