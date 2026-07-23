# The pay and hours transparency model

How this board treats pay and hours, and why. Portable: another job board could
adopt this whole model. Scoped to the core disclosure mechanics and deliberately
excludes the living-wage / living-hours badge tier, which is a separate, newer
layer built on top of this foundation.

The one idea everything else follows from: **only disclosure counts, and it is
never dressed up as more than it is.**

---

## 1. Pay

### Only employer-STATED pay is "shown"

An aggregator's predicted or normalised salary is not disclosure, so it never
earns the transparency treatment. One flag carries this: `pay_is_estimated`,
set true for any figure the source computed rather than the employer stating.

```
showsPay(job) = !pay_is_estimated AND (pay_min > 0 OR pay_max > 0)
```

Two non-obvious rules are baked in:

- **A zero bound is not a figure.** Aggregators report `0` for an unknown bound.
  Stored as `null`, never rendered, or the board would show a fictitious "£0"
  floor. `> 0`, never `>= 0`.
- **An estimate is excluded even when present.** A predicted £26,000 is worth
  nothing to someone who needs to know the real rate, and printing it as if the
  employer said it is the exact dishonesty the board exists to avoid.

### Prefer the employer's own words over the normalised number

Aggregators normalise everything to an annual figure, so a £12.50/hr kitchen
porter arrives as "£26,000", meaningless to a shift worker who thinks in hourly
rates. The advert text usually states the real basis ("£12.50 per hour"), so the
board parses that in preference to the normalised number. A figure lifted from
the employer's own wording is also genuinely employer-STATED, so it can carry the
transparency treatment; the normalised number cannot.

The pay parser has three safety rules that matter for a fairness board:

- **Ranges before single figures.** "£12.21 - £14.00 per hour" must not match
  only the upper bound and report £14 as the minimum. On a board that trades on
  fairness, **pay must never read high.** The floor is sacred.
- **Plausibility bounds.** A number only counts as pay if it sits in a sane band
  (hourly roughly £8-60, annual £12k-200k) AND has a period cue nearby, so
  "40 hours per week" or "£1,000 referral bonus" are never mistaken for pay.
- **Currency-optional mode, opt-in.** Some feeds write pay without a £
  ("14.56 per hour"). A stricter default (£ required) is kept for noisier
  snippet sources; a looser mode is enabled per source where the full advert is
  available and the risk is low.

### Render honestly

`formatPay` keeps the real basis (hourly stays hourly, annual stays annual),
shows a range as a range and a single rate as a single rate, and uses the floor
so nothing reads higher than the employer promised.

A **fixed rate is more transparent than a range**, not less ("this is a £15/hr
role, no negotiating"), so it is never penalised. The upper bound is optional.

### Name the gap, do not hide it

A listing with no stated pay is not dropped and not padded with an estimate. It
says **"Pay not disclosed"**, plainly. Naming the absence is more honest than
hiding the listing, and it puts quiet, visible pressure on employers who do not
disclose, which over time is the actual mechanism that moves a market.

### Enforce it at source

Aggregated rows carry whatever the feed gave. But a listing posted DIRECTLY to
the board **cannot be submitted without pay.** This is where disclosure is
actually enforced rather than merely hoped for, and it costs an honest employer
nothing.

---

## 2. Hours

### Shift pattern is native-only, and required

No aggregator feed carries shift pattern. That is precisely why asking for it is
worth something: it is information a jobseeker cannot get anywhere else on the
board. It is a **required field on a direct post** and simply absent on
aggregated rows, never guessed.

Why never guessed: inferring hours (or experience, or anything) from the advert
BODY produces confident nonsense. Chain adverts are boilerplate-dominated. In
one sample, 39 of 40 ads from a single pub chain mentioned "apprentice" in a
generic perks blurb, so body-matching would have labelled experienced roles as
entry level. The lesson generalises: **infer only from the title, or not at all.**

### Contract: hours beat permanence

Where a source splits "hours" (part-time / full-time) from "permanence"
(permanent / temporary), the hours axis wins, because part-time vs full-time is
what a shift worker actually filters on.

---

## 3. What each source can honestly support

The board mixes aggregated feeds and direct posts, and is explicit about what
each can and cannot claim.

| | Aggregated snippet feed | Full-description feed / direct post |
|---|---|---|
| Description | A **capped snippet**. Never presented as the full ad. | The complete advert. |
| Shown as | An "extract", with a link out to the source for the rest. | The listing itself. |
| Structured data (JobPosting) | **Never.** Marking up truncated content as a complete listing risks a search-engine structured-data penalty. | Yes, where the full text is held. |
| Shift pattern / experience | Absent. | Present (direct posts). |

The rule under the table: **never present a fragment as the whole.** A snippet
gets an honest "this is an extract" notice and sends the reader to the source,
rather than dressing a truncated blurb up as the full advert.

---

## 4. Design rules that keep it honest

- **Computed, never stored (for what is shown).** The transparency signals a
  reader sees are derived live from the pay and the fields, so they can never
  drift from the data they describe. (A denormalised copy exists only where a
  database needs something cheap to sort or rank on, and it is written from the
  same rule.)
- **Never over-claim.** Every rule fails safe: the floor over the ceiling, the
  stated figure over the estimate, absent over guessed. On a board whose whole
  value is trust, a single figure that reads too high costs more than a hundred
  honest "not disclosed" labels.
- **Honesty over polish.** A visible "Pay not disclosed" or "this is an extract"
  is worth more than a prettier card that implies something untrue.
- **Enforce at the point of entry.** The strongest transparency is the field an
  employer cannot skip when posting, not the one the board tries to reconstruct
  afterwards.

---

## 5. Why it is also a growth strategy, not just ethics

Disclosure is the product. A board where the pay is up front, and the gaps are
named rather than hidden, is more useful to a jobseeker and more trusted, which
is what earns the traffic and the return visits. The honesty and the growth are
the same lever, not a trade-off.
