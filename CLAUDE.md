# Disability Section Code Generator

## Acceptance, and the golden harness that was deliberately removed (2026-09-16)

**Read this before trusting any verification claim further down.**

**How output is verified today**: the `test/run_*.js` suite — 15 files, 535
assertions, each runnable on its own (`node test/run_inputA.js`). That is the
whole of it. There is no byte-diff against a reference document any more.

**What used to exist**: phases 0-6 were built against a golden byte-diff
harness — `js/core/goldens.js` (the five reference files, transcribed from the
ground-truth document), `js/core/diff.js` (the normalizations applied before
comparing, e.g. `normalizeGoldenExclusionNaming()`) and `test/golden.js` (the
runner), with a `GOLDEN_KEYS` list naming which tabs were diffed and which
were exempt.

**It was removed on 2026-09-09, at the user's request, and that was the right
call — do not rebuild it.** The reason is recorded in `test/run_generators.js`'s
own header: SOWs vary too much for byte-exact expectations to generalize, and
pinning the emitters to one project's exact bytes was actively blocking real
alignment fixes across every file it covered. `test/run_generators.js` is its
deliberate replacement: it guards that the mechanical assembly and gating in
the five emitters still work (right fields present, gated correctly, right DB
names and codes) without asserting one SOW's whitespace. The resolver and
exclusion logic those emitters consume is covered separately by
`run_resolver.js` / `run_exclusions.js` / `run_multi.js`.

**So when a section below says an emitter "PASSES `test/golden.js`
byte-for-byte"**, read it as a dated record from before that removal, not a
check you can run. It is also the REASON each emitter reproduces the
reference's own formatting quirks — the inconsistent exclusion cascade
templates, the `$row_reg[...]` key exceptions, the 15 dynamic slots cut into
`reg_details.php`'s static template. That rationale is why the write-ups were
kept when the harness went. Same for "is not in `GOLDEN_KEYS`": it records
that a file never had a byte-exact reference to diff against, which is still
true of it.

`App.GOLDENS` does not exist at runtime, and nothing under `js/` or `test/`
loads any of the three deleted files.

## One forward action per step; stepper only goes back (2026-09-16)

Two asks from the user, both about navigation.

### "Parse pastes" was redundant

Step 1 had two buttons for one intent: a green "Parse pastes", then a
"Configure & Review" that stayed `disabled` until the parse succeeded. The
first button is gone; `parseAndReview()` (ui.js) is now the step's single
forward action.

**It does not re-parse unconditionally, which is the whole subtlety.** The
old Parse button was also the explicit "throw it away and start again"
action — `generate()` calls `resetState()` and clears `_resolvedEdited` /
`_popupTextEdited` / `_exclusionGroupsEdited`. Wiring the forward button
straight to `generate()` would therefore have destroyed every step-2 edit any
time the developer stepped back to step 1 and forward again. So it re-parses
only when the pastes or the layout override actually changed since the last
parse (`S.rawInputA` / `S.rawInputB` / the new `S._lastLayoutOverride`), and
otherwise just navigates. Verified both directions: an edit survives a
step-1-and-back round trip, and switching samples still discards it.

The layout-override `<select>` still calls `generate()` directly — it
re-parses in place without moving the developer off step 1.

**A parse that finds nothing now says so.** The step 1 receipt rendered the
empty string when `S.fields.length` was 0, which was invisible-but-harmless
while a separate Parse button existed. With one button doing both jobs it
would have looked like a dead button, so zero fields now renders a warn
alert ("No rows recognised — check Input A, or load a sample"). Safe because
`renderWarnings()` only runs after a parse has actually happened — boot
leaves the receipt untouched, since `regenerate()` returns early with no
`_lastParseA`.

`setParsed()` no longer touches `#btn-step2.disabled`: the button has to stay
clickable, because clicking it is what triggers the parse.

### The stepper is a way back, not a shortcut forward

`unlocked` (a successful parse happened) was doing double duty as "may click
this in the stepper", so both steps 2 AND 3 lit up the moment anything
parsed — offering a jump to a page the developer had never opened. nav.js now
tracks `visited` separately and the stepper needs both: `item.disabled =
s.n > unlocked || !visited[s.n]`. `goStep()` marks the step visited on
arrival, so the action-bar buttons still move forward normally and the
stepper only ever offers pages already seen.

A failed parse resets `visited` to `{1:true}` alongside dropping `unlocked`,
so recovery starts clean rather than leaving stale clickable steps behind.

Step 1's forward button is `btn-accent`, matching step 2's "Generate &
Export" — accent is "go to the next step" throughout, and `btn-primary`
green stays reserved for the terminal action (step 3's "Download all").

Verified in Chrome by driving the whole contract: boot locks 2/3; an empty
parse leaves them locked and shows the receipt; a successful parse still
leaves BOTH locked in the stepper until visited; visiting 2 unlocks only 2;
visiting 3 unlocks 3; stepping back keeps them; clearing the pastes re-locks
both and refuses `goStep(3)`. Zero console errors; Node suite unaffected
(15 files, 535 assertions).

## UI prose trimmed (2026-09-16)

Per the user: too much static explanatory text, which makes the tool harder
to use rather than easier. The page had the same thing said up to three times
— header blurb, page-head paragraph, panel hint, and action-bar hint all
overlapping — so the cut was mostly de-duplication, not loss of information.
~59% fewer words of static prose (392 -> 162).

Removed outright where the surrounding UI already said it: the step 1 and
step 3 action-bar hints (their own headings and the buttons beside them said
the same), and the Live preview panel's hint. The two dead `<span class="action-bar-hint">` elements went
with them rather than being left empty.

Kept, because nothing else on the page says it: that edits survive until you
re-parse (step 2's action bar), and that the Excel view is what catches a
mangled paste (step 1).

**One stale fact died with it**: the Live preview hint said "all eleven
output files". Set 2/3 ships twelve — the same hardcoded-count bug the header
badge was fixed for on 2026-09-11, still sitting in the prose underneath it.

The layout warnings were cut too (`set2-layout`, `set3-layout`,
`set2-forced`) — they fire on every Set 2/3 parse, so they were the most
repeatedly-read text in the tool. Each keeps its actual finding and its
"here's what to do" clause and drops the background explanation. Safe to
reword: the tests assert on warning `code`, never on `msg`.

## Review panel showed one value list for every field (2026-09-16)

**Bug, reported by the user against a Set 2 paste**: the resolved-conditions
review panel rendered chips and its "+ add value" dropdown from ONE list —
`parseB.types`, Input B's second column — no matter which field the condition
actually targeted. So `subdistypeido`'s condition, which is
`disability_type in ['04']`, displayed **"Hard of Hearing (HH) (04)"** when
the requirement means the **MD/ID category**. Per the user: "if the disability
category field is selected, it's respective values must be displayed in the
adjacent dropdown ... it must be displayed as VI, HI etc."

Not Set-2-specific — it is the same defect in both layouts, because two
dropdowns in the same paste never hold the same list:

| | Set 1 | Set 2/3 |
|---|---|---|
| `disability_category` | Input B's **categories** | — |
| `disability_type` | Input B's types | Input B's **categories** |
| `disability_multiple` | Input B's types | — |
| `subdistypeido` | — | the routing category's own sub-types |
| `sub_disability_type` | — | every OTHER category's sub-types |
| `sub_disability_multiple` | — | the multi-select's own option list |

The same two-digit code means a different thing in each column, and the SAME
field name flips meaning across layouts — Set 2's row 5 is headed "Type of
Disability" but asks for the category. Set 1 only looked right by luck: its
resolver never produces a `disability_category in [...]` condition, so the one
list on show happened to be the correct one for every condition the parser
emits. Point a condition at `disability_category` by hand and it mislabelled
just as badly.

**`js/core/fieldcodes.js` (new)** — `App.codeListForField(postName, parseA,
parseB, roles)` returns `[{code,name}]` for that field's own dropdown. Each
list mirrors what `config.js` / `config2.js` actually emit for that control
(`$arrDiscategory`, `$arrDisabilityTypeIDO`, `$arr_subDisabilityType2` minus
its commented-out routing codes, `mulOptionCodes`), so the panel can only
offer values the generated code can hold. A core module rather than a
ui.js-local helper for this project's usual reason — no DOM, so
`test/harness.js` loads it and the per-layout branching is Node-testable.

- **Shape 3 needs no special case.** `roles.idoTypeCodes` is empty there, so
  "every type except the routing category's" is every type — which is exactly
  what its single sub-type dropdown serves.
- **`scribe_id_proof` is handled too**, from its own pasted Values cell via
  the existing `DICT.scribeIdProofEntries()`. It is in the target-field
  dropdown, so it is reachable by hand, and it is the same bug class.
- **Anything else falls back to the types**, unchanged from before — a Y/N
  radio has no code list of its own, and `in` on one is a manual edit the
  resolver never produces.

**Threading**: the three panel renderers now take a `codesFor(postName)`
function instead of a fixed `allTypes` array, so each condition row resolves
its own list from `cond.field` (and the constraint row from `c.whenField`) and
re-resolves on the very next render when the user changes the target field.

Two consequences beyond the reported symptom, both the same rule applied:

- **The exclusion panel now offers the multi-select's own options**, via
  `App.exclusionSourceField(parseA)` — which already is the single source of
  truth for which row states the rule. For Set 1 that is `disability_type`,
  unchanged. For Set 2 it is `sub_disability_multiple`, which narrows the
  "+ add value" list by one: the "Multiple Disabilities" entry is what OPENS
  the multi-select and can never be a member of an exclusion group inside it.
- **Changing a constraint's `whenField` now resets its code** when the old one
  is absent from the new field's list. Without it the `<select>` fell back to
  showing its first option while the data still held the stale code — the
  display and `c.code` silently disagreeing.

Deliberately NOT changed: `renderValueAliasPanel` still lists types only.
Manual aliases feed `buildTypeIndex(types, aliases)`, which is type-only by
construction; making an abbreviation resolvable to a CATEGORY would mean
changing the resolver's alias plumbing, which is a different change.

An `in` condition's existing codes are left alone when the user re-points it
at another field. The chips re-label under the new list immediately (and show
the bare code when it isn't in it), so the change is visible and correctable
— clearing them would silently discard the user's own work.

Verified in Chrome from `file://`, not just by the suite: uiicl's
`subdistypeido` card now reads "MD/ID (04)" and `sub_disability_type`'s reads
"VI (01) / HI (02) / OC (03)" (was "Blind (B) / Low vision (LV) / Deaf (D)");
every other card's chips come from its own target field; re-pointing a bpcl
condition at `disability_category` re-populates the dropdown with A-E live;
bpcl's own parsed output is unchanged; zero console errors. Node suite: 15
files, **535 assertions** (was 505) — `test/run_fieldcodes.js` (30) is new.

## reg_details.php / print.php highlighting (2026-09-16)

Per the user, those two tabs highlighted badly. They are the only two output
files that interleave raw HTML with `<?php ?>` blocks — every other tab is
either pure PHP or builds its markup inside PHP string literals
(`functionsPhp`'s `$op .= "<option ...>"`, `functionsPhp2`'s `print`
statements), where the plain `php` grammar is already right. Both were tagged
`lang: 'php'`, so highlight.js tokenized the whole file as PHP and left the
surrounding tags and attributes flat.

Fixed by tagging those two `lang: 'php-template'` — the grammar the vendored
bundle already registers for exactly this (confirmed present:
`hljs.listLanguages()` includes both `php-template` and `xml`, so nothing new
had to be vendored). Token spans went 1775 -> 1987 for `reg_details.php` and
371 -> 717 for `print.php`, and the browser's count matches Node's exactly.
No other tab needed it — each generator's output was checked for markup
outside string literals.

## PrintArrSub_disDetails + a third layout shape (2026-09-11)

Two follow-ups to "Set 2 implemented end-to-end" below, both from the user.

### `PrintArrSub_disDetails()` — supplied, and it is SOW-derived

The helper `reg_details.php`'s multi-select calls to print its `<option>`
list, previously flagged as residual scope. It now lands in
`js/generators/functionsPhp2.js`, wrapping `functionsPhp.js` the same way
every other Set 2 emitter wraps its Set 1 counterpart — so `functions.php`
is back to being a tab BOTH layouts show, each getting only the helper its
own generated markup calls (Set 1: `fnSelectArrayMultiHash`, Set 2/3:
`PrintArrSub_disDetails`).

**Unlike Set 1's helper this one is not static.** `fnSelectArrayMultiHash`
just walks whatever array it is handed; `PrintArrSub_disDetails` groups the
sub-types under `<optgroup>` headings, and both the headings and their
membership come straight from Input B:

> one `<optgroup label="<category label>">` per category, listing that
> category's own sub-type codes, minus the "Multiple Disabilities" entry that
> opened this list in the first place.

The user's reference copy hardcodes four labels and four code lists
(`'10'`/`'11'` under VI, `'12'`/`'13'` under HI, thirteen under OC, four under
MD/ID). Those are uiicljul26's own Other Details table — per the user,
"the values must be dynamically assigned based on the requirement" — so they
are generated from `parseB.categories` / `parseB.mapping` intersected with
`core/set2.js`'s `mulOptionCodes`. A category left with no codes after that
intersection is skipped rather than emitted as an empty `<optgroup>`. The
emitted PHP otherwise keeps the reference's own structure verbatim (the
foreach-over-the-whole-array-with-an-`if` pattern rather than a tighter loop),
so a developer diffing against a real project's copy sees only values change.

A Set 2/3 paste with no multi-select row at all (fixture `cwc`) has nothing to
define here, and says so in a comment rather than shipping a bare `<?php`.

Test: `run_set2_generators.js` asserts the optgroup labels ARE Input B's
categories in Input B's order, that the "Multiple Disabilities" code appears
in no group, and — the assertion that actually pins the rule — that the codes
grouped across all optgroups are exactly `mulOptionCodes`, each once.

### `set2b` is a third layout shape, not a Set 2 variant

Per the user: flag it as Set 3, look at it properly later. Among the "not
Set 1" pastes there are two structurally different shapes and only one has
reference code:

| | routing dropdown | sub-type dropdown | multi-select opened by |
|---|---|---|---|
| **shape 2** (uiicljul26) | `subdistypeido`, for ONE category | `sub_disability_type`, for the rest | `subdistypeido` |
| **shape 3** (set2b) | none | one, serving EVERY category | `sub_disability_type` |

`parseInputA` now returns `layoutShape` (1, 2 or 3) alongside `isSet2`.
Shape 3 is detected structurally — no claimed `subdistypeido` row — and gets
its own `set3-layout` warning INSTEAD of `set2-layout`, because the Set 2
warning's "output follows the Set 2 reference (uiicljul26)" is misleadingly
confident for a paste that is not that shape. The new warning says plainly
that output is best-effort and every file needs review.

**Generation still runs for shape 3.** `core/set2.js` already degraded
correctly (`idoCategoryCode` null, `multiTriggerField` falling back to
`sub_disability_type`), and the output is well formed with zero absent-field
leakage — that was verified when Set 2 landed. Nothing about shape 3 is
*known* wrong; it is simply unverified, which is what the warning says.
Deliberately NOT done, per "we can check that later": no Set 3 entry in the
layout-override selector, and no attempt to model whatever else may differ.

`cwc` turns out to be shape 3 too — same single-dropdown structure, but with
no multi-select row at all — so its fixture metadata moved to `set: 3`
alongside `set2b`'s, rather than leaving the fixture list contradicting the
parser. `set2b`'s fixture KEY stays `set2b` (renaming it would churn every
test and the sample picker's saved value for no gain); its display name and
its `set` field say 3.

### Two tidy-ups while in there

- The header badge was the literal text "11 files". The two layouts don't ship
  the same count (Set 2/3 has two companion AJAX endpoints where Set 1 has
  one, so 12 vs 11), so it is now `#file-count`, written from
  `activeTabs().length` on every regenerate.
- `run_multi.js`'s cwc/set2b assertions were rewritten around `layoutShape`
  and the `set3-layout` warning; they previously asserted `set2-layout`, which
  is exactly the conflation this change exists to remove.

Verified: 505 assertions across 14 test files, all passing (was 450). Set 1
output re-snapshotted and diffed — all nine generated files x four Set 1
fixtures still byte-identical. In Chrome from `file://`: bpcl shows 11 files
with `fnSelectArrayMultiHash`; uiicl shows 12 with `PrintArrSub_disDetails`
grouped VI/HI/OC/MD-ID and a `set2-layout` warning; set2b shows 12 with its
own HI/VI/LD/ID-MD optgroups and a `set3-layout` warning; cwc's functions.php
is the explanatory stub; zero console errors.

## Set 2 implemented end-to-end (2026-09-11)

Set 2 is no longer deferred. Reference material for one real Set 2 SOW
(`uiicljul26`) arrived as `set 2 references.txt` plus the two ajax files
already sitting in the repo root, covering all the same output files Set 1
emits. All eleven tabs now generate for a Set 2 paste, and Set 1's output is
byte-identical to before (verified per-emitter, not just by the suite).

**How the two layouts coexist.** Every Set 2 emitter is a NEW file loaded
immediately after its Set 1 counterpart, which it wraps:

```js
var genXSet1 = App.GEN.x;                       // captured at load time
App.GEN.x = function(ctx){ return ctx.parseA.isSet2 ? genXSet2(ctx) : genXSet1(ctx); };
```

so `App.GEN.config/detailsPhp/detailsJs/validations/submit` keep ONE key each
and the tab strip, the zip, `regenerate()` and every test stayed unchanged.
`index.html` and `test/harness.js` list `config2.js`, `detailsPhp2.js`,
`detailsJs2.js`, `submitPhp2.js`, `validationsPhp2.js`, `ajaxPhp2.js` right
after their Set 1 siblings — **load order is load-bearing**, a `2` file loaded
first would capture `undefined` as its Set 1 fallback. Four emitters needed no
Set 2 variant at all: `qryArrays.js` and `langPhp.js` work unchanged (they
project `parseA.fields`, and the three new fields' DB names equal their POST
names), `queriesSql.js` needed only a `multiselect` branch, and `printPhp.js`
needed one alternate row plus three new ones, done inline.

### What Set 2 actually is

Set 1: `Disability Category` -> `Type of Disability` (that one row doubles as
the category-E multi-select). Set 2: `Type of Disability` holds the CATEGORY
(VI / HI / OC / MD-ID), and the sub-type question splits across three fields:

| field | role |
|---|---|
| `subdistypeido` | sub-types of the ONE category that routes through it |
| `sub_disability_type` | sub-types of every OTHER category |
| `sub_disability_multiple` | the multi-select, opened by picking "Multiple Disabilities" |

Everything else — all 19 other rows — is the same dictionary entry as Set 1,
same label wordings, same langKeys, same constant flags.

- **`js/core/dictionary.js` is now two dictionaries.** `ENTRIES1` is Set 1;
  `ENTRIES2` is BUILT FROM IT (drop `disability_category`, retype
  `disability_type` as a plain `select` with no `multiPostName`, splice in the
  three new entries after it) so the 19 shared fields can never drift apart.
  `entriesFor(layout)` picks; `candidatesFor`/`makeLabelClaimer`/
  `findByNormalizedLabel`/`resolveAlias` all take an optional layout, default
  Set 1. The three new sigs are written to exclude EACH OTHER rather than to
  spell out this SOW's own "...for MD/IDs'" wording: `subdistypeido` requires
  `for` and forbids `multiple`; `sub_disability_type` forbids both;
  `sub_disability_multiple` requires `multiple disability`. Declaration order
  matters as always — a paste with one unqualified sub-type dropdown and no
  "for <category>" row claims `sub_disability_type`, which is what the second
  known Set 2 shape (fixture `set2b`) needs.
- **`parseInputA` is now two passes**, because the layout decides which
  dictionary to claim against and detection used to run *after* claiming:
  `readRows()` splits the paste and finds the note row with no dictionary
  involvement, `detectSet2()` runs on those raw rows, then `claimFields()`
  claims against the right layout. `detectSet2`'s corroborating signal used to
  find the type row by its claimed `control`; it now uses an unclaimed
  `DICT.findByNormalizedLabel` lookup.
- **`js/core/set2.js` (new)** derives the structural roles every Set 2 emitter
  shares: which category routes through `subdistypeido` (the "IDO category"),
  its sub-type codes, the "Multiple Disabilities" code, which dropdown opens
  the multi-select, and the multi-select's own option list. Two independent
  signals for the IDO category, same reasoning as Set 2 detection itself:
  (1) the `subdistypeido` row's own Validations cell names it ("...if selected
  'MD/ID' in point no 5") — strongest, it IS the requirement; (2) the category
  whose sub-type list contains a "Multiple Disabilities" entry — structural,
  and the only one available for a SOW with no `subdistypeido` row. Signal 1
  wins; a disagreement warns rather than silently picking. Category labels are
  matched on word boundaries, longest first, because they are bare 2-3 letter
  codes ("OC" would otherwise hit inside "OCcupation").
  **`idoCategoryCode` is null when the paste has no `subdistypeido` row at
  all** — `set2b` has one sub-type dropdown serving every category, and
  inventing a routing split there would generate a second dropdown the SOW
  never asked for.

### Input B: a real bug, not a Set 2 nicety

Set 2's Other Details is headed `Type of Disability` / `Sub-Type of
Disability`. **Both match `TYPE_HDR_RE`, neither matches `CAT_HDR_RE`**, so
`detectColumnsByHeader` found no pair, the paste fell through to
`detectColumnsByShape` (which has no `headerRow` to skip), and the header row
was swallowed as a real category + a real type — silently shifting every code
by one. `detectColumnsBySubHeader()` now runs FIRST: the column headed "Sub-…"
is the narrower one, the parent is whichever other column carries a
category-or-type word. Set 1's pass is untouched and still runs as the
fallback. This also fixed `set2b`, which had the identical latent bug.

### Resolver: three additions, all gated on `ctx.set2`

Set 1 resolution is bit-for-bit unchanged (verified: all four Set 1 fixtures'
`reg_details.php` byte-identical through the refactor).

1. **Category names are values too.** Set 2 rows say `if selected "OC / HI"
   under point. No. 5 or 6 or 6.1`. A second `buildTypeIndex` over
   `parseB.categories` is scanned per clause; a hit emits
   `disability_type in [cat codes]`, plus `sub_disability_multiple in
   [their sub-type codes]` when the clause also points at the multi-select —
   the same fact at the finer grain, which is exactly what the reference PHP
   does. NOT widened to the multi-select for a clause with no point reference
   at all ("Should be enabled & mandatory for VI, HI, OC" is a fact about the
   category dropdown only).
2. **A clause can chain point references.** `collectPointRefs()` takes the
   first `POINT_REF_RE` hit then keeps consuming `or|and|,|/` + number, but
   only while the number names a row that actually exists in this paste — so
   "in point no 12 or 40%" can't be mistaken for a chain. Needed because Set 2
   asks one question of two or three dropdowns at once ("in point no 5.1 or
   6.1").
3. **Bare type names route by code.** With no point reference, each named
   sub-type goes to whichever dropdown offers it: IDO-category codes to
   `subdistypeido`, the rest to `sub_disability_type`, and all of them also to
   `sub_disability_multiple`, which offers everything. This reproduces the
   reference's `optscribe` condition exactly (Blind/Low Vision -> the plain
   sub-type dropdown, ASD/SLD/MI/ID -> the routing one, all six -> the
   multi-select).

**Three cross-cutting resolver fixes fell out of this**, each a real defect
that also affects Set 1:

- **`splitSentences` severed conditions at "point. No."** — uiicljul26 writes
  `if selected "OC / HI" under point. No. 5 or 6 or 6.1`, and splitting there
  left an orphan fragment carrying no "enabled"/"mandatory" cue, which was
  then dropped entirely. `healPointRefPeriods()` collapses ONLY the periods
  inside a reference (identified by what follows: a `no`/`number`
  continuation, or a digit), so a sentence genuinely ending "... point." is
  untouched. `POINT_REF_RE` already accepted both spellings.
- **`POINT_REF_RE` didn't match "pt. no. 16"** — the two alternatives were
  `point\s*(no|number)?...` and `pt\.?\s*`, so `pt` followed by `no` failed.
  Merged into one `(?:point|pt)\s*\.?\s*(?:no|number)?\s*\.?\s*[-–:]?\s*`.
  This is what made the Appendix-II popup land on the wrong field (below).
- **`-ness` tolerance in `buildTypeIndex`** — uiicljul26's scribe row says
  "Blindness / Low Vision" while its own Other Details says "Blind  (B)", so
  the scribe condition silently lost a value. It is not an abbreviation, so
  `findUnresolvedAbbrevs()` would not have flagged it either. Added alongside
  the existing trailing-s tolerance, same justification and same tier.

**Per-field popups (new).** Set 2 pops a different message for each scribe
question. `extractFieldPopups()` scans every field's own Validations for a
"pop-up" sentence and takes its longest quoted span. **The OWNER is the point
the sentence names, not the row it is written on** — uiicljul26 states the
Appendix-II popup on row 15 (`compensatory2`) while saying "If selected 'Yes'
in pt. no. 16 ...", and the reference `reg_details.js` duly hangs it off
`.scribe1` (row 16). Caught by `test/run_set2_generators.js`; the first
implementation put it on `compensatory2` because of the `POINT_REF_RE` gap
above, and `test/run_set2_resolve.js` had encoded that wrong behaviour before
the generator test contradicted it.

**`popupCategories` (new).** The Set 2 alert does not fire for every category:
"A popup message should be displayed to VI, OC, MD/ID candidates ..." names
them, and the reference tests exactly those three of four. Scanned from the
popup lead-in (stopping at the first quote) with the category index. Falls
back to "every category" with a warning if the sentence names none.

**The stale `set2-inputb-unreliable` warning is gone** — Input B now parses
correctly for Set 2, so telling the developer not to trust it was wrong.

### Exclusion groups: a second cluster format

Set 1 finds clusters by "should not select together" + `*` splitting. Set 2
writes numbered lines instead:

```
1. Candidate can select only one disability from (OA/OL/BL/OAL/BA/BLA/BLOA/BAOL)
2. Candidate can select only one disability from (Blind/Low Vision)
```

`extractClusterTexts()` tries strategy 1, then `clustersByOnlyOneFrom()`.
The `from` is REQUIRED: the same cell also carries a bare "Candidate can
select only one Nature of Disability.", which is the rule's own preamble and
names no members — without the `from` requirement it became a 0-member
cluster and raised a spurious warning. Member scanning, the <2-member
discard, and the Input-B-spelling message default are all shared unchanged.

**`App.exclusionSourceField(parseA)` (new)** is now the single source of truth
for WHICH row states the rule — `sub_disability_multiple` if present, else the
`select+multiselect` row — so `ui.js`, the tests and any future emitter cannot
disagree. `regenerate()` used to inline the `select+multiselect` filter.

Per the user: **a Set 2 multi-select sometimes states no exclusion rule at
all, and then no extra validation is wanted.** Zero groups emits no cascade —
not an empty one — and the "no exclusion phrase" warning is worded as
informational rather than as a parse failure.

### Deliberate divergences from the pasted Set 2 reference

All four confirmed with the user (2026-09-11) or documented in the emitter's
own header. There is no ground-truth document for Set 2 — the reference
arrived as pasted chat content — so none of these are byte-diff regressions.

1. **Codes are assigned in paste order, as Set 1 does** (VI=01 HI=02 OC=03
   MD/ID=04; sub-types 01..22 in Other-Details order). The reference's
   config.php numbers them from the reference application's own historical
   master table (OC=01 though VI is listed first, Blind=10, ASD=15, Multiple
   Disabilities=25, AAV=09/MDy=08 swapped against document order) — not
   derivable from any SOW. Every generated file uses one consistent set of
   codes throughout, so the numbering is internally correct either way.
   **User's call, asked explicitly.**
2. **Exclusion validation reuses Set 1's dynamic `$exclgrpN`/`$exclcntN`
   counters**, not the reference's `count(array_diff(array(...), $_POST[...]))
   < 7` form. That form's threshold is group-size-specific, its messages come
   from `$LANG['err_lbl_disability_nature_invalid_*']` keys that would have to
   be invented per group, and it only handles the exactly-three groups it was
   hand-written for. **User's call, asked explicitly** ("can be reused from
   old logic if it reduces the complexity").
3. **The reference's redundant `$row_reg['disability'] == 'Y'` conjunct** on
   `disabilitysuffersoc` and `compensatary_time` (but not on `compans_time` or
   `optscribe`) is not reproduced. It cannot change behaviour —
   `reg_submit.php` NULLs every dependent column when the root toggle is not
   Y, so the inner test can never pass on a re-render — and the emitter emits
   exactly what the resolver resolved, for every field alike, as Set 1 does.
4. **`if (...) { ?> enabled <?php } else { ?> disabled <?php }`** — the
   reference writes two fields this way. `enabled` is not an HTML attribute
   and does nothing; every other field in the same reference file uses the
   plain `if (not enabled) { ?>disabled<?php }` form, which is used throughout.
5. **The two `$("#sub_disability_multiple").change(...)` handlers** the
   reference binds to the same element (one counting a narrower code list than
   the other, apparently a copy-paste artefact) are merged into the single
   handler the resolved conditions describe.
6. **`$arr_MulsubDisability_map_Edit`'s keys** are this paste's own routing
   sub-type codes. The reference's keys (22/23/24/15/25) are stale carryover —
   22/23/24 were the codes its own `$arr_subDisabilityType2` has commented
   out, so three of its five keys name codes `subdistypeido` can never hold.

### Structural guards (prose can't settle these)

Two places where the resolver's documented OR-merge is not what the section
structurally means, handled the same way Set 1's emitter already handles its
"a category must be chosen first" guard — an ANDed conjunct in the emitter,
not a change to the resolver:

- **`sub_disability_type`'s `disabled`** gets `&& disability_type != '' &&
  disability_type != '<IDO>'`. Its `<option>` list is built from
  `$arr_subDisability_map_Edit`, which by construction has no entry for the
  routing category, so the dropdown is meaningless there whatever the prose
  says. Without it the row's two requirement sentences ("enabled if YES in
  point no 4" / "enabled & mandatory for VI, HI, OC") merge to an OR and the
  dropdown stays enabled for MD/ID.
- **`sub_disability_multiple`'s validation gate** gets
  `&& disability_type == '<IDO>'` alongside the resolved trigger test, so
  `reg_details.php`, `reg_validations.php` and `reg_submit.php` agree.

`subdistypeido` and `sub_disability_multiple` need nothing else: their own
resolved conditions already imply everything structural about them.

### Absent-field gating

`detailsJs2.js` was built has()-gated from the start, per the 2026-09-11
"Absent-field leakage" entry — every cross-field reference, not just each
handler's own trigger. Helper builders (`classSel`/`propLine`/
`scribeDetailReset`/`clearMultiSelect`/`resetSocGroup`) return `''` when a
paste has none of the classes a line would touch, and the line is then omitted
whole rather than emitted with an empty selector. One leak the test caught:
`getSub_TypeMuldisability()`'s `document.getElementById('subdistypeido')` was
fixed template text, which named an element `set2b` does not have — it is now
`%TRIGGER%`-substituted from `roles.multiTriggerField`.

`js/generators/detailsPhp.js`'s rows-17.1-17.6 block was extracted to
`App.GEN.scribeDetailBlock(has)` so Set 2 reuses it rather than carrying a
second copy. Verified byte-identical output for all four Set 1 fixtures before
and after the extraction.

### Exclusion chip edits silently did nothing (pre-existing bug, both layouts)

Found while verifying Set 2 in the browser, but it was never Set-2-specific.
`renderExclusionPanel`'s chip remove/add handlers called
`g.names.splice(...)` / `g.names.push(...)`, but `parseExclusions()` returns
`{codes, matched, message}` — there is no `names` array. So on every PARSED
group the handler threw a TypeError **after** mutating `g.codes` but **before**
`markExclusionsEdited()` and `regenerate()`: the chip disappeared from the
panel, the generated code never changed, and the next re-render discarded the
edit. Only hand-added groups worked, because "Add group" seeded `names: []`.
`codes` is the only member list a group has (the chip label is looked up from
`allTypes`, the message is `g.message`), so the parallel array is gone.
Verified in Chrome for both bpcl and uiicl: removing a chip now flips
`_exclusionGroupsEdited`, re-renders with one fewer chip, and
`$exclgrp2 = array('02')` appears in the generated `reg_validations.php`.

### Layout-aware tab strip

The two layouts' companion AJAX endpoints genuinely differ, so `TABS` entries
gained a `sets` field (omitted = both): `ajax_getdisability_type.php` is Set 1
only, `ajax_getSubType_disability.php` and
`ajax_getSubType_Multiple_disability.php` are Set 2/3 only. (`functions.php`
was Set-1-only until `PrintArrSub_disDetails` arrived; it now serves both —
see the top of this file.) `S.layoutSet` is set
by `regenerate()`; `applyTabVisibility()` hides the other layout's tabs
(`hidden`, not removed — the panels stay in the DOM) and moves focus to the
first visible tab if the open one is being hidden; `activeTabs()` drives the
zip and the step-3 manifest, so neither ships a file nothing in the output
calls. Set 1 comes to eleven files, Set 2/3 to twelve — so the header badge
is written from `activeTabs().length` rather than naming a fixed count.

### Residual scope, deliberately not done

- ~~**`PrintArrSub_disDetails()`**~~ — **CLOSED**, supplied by the user and
  implemented; see "PrintArrSub_disDetails + a third layout shape" at the top
  of this file. It turned out to be SOW-derived, not static.
- ~~**`functions.php` for Set 2**~~ — **CLOSED**: the tab serves both layouts
  again, each getting only the helper its own markup calls.
- ~~**`set2b`'s shape is supported but unverified**~~ — still unverified, but
  no longer conflated with Set 2: it is flagged as **shape 3** with its own
  `set3-layout` warning, per the user. See the top of this file. `cwc` is
  shape 3 as well; three of its rows are genuinely SOW-specific fields this
  tool does not model (a CWC-provided-scribe question, a scribe-qualification
  textbox) and still warn as unmatched, as they did before.

Verified in Chrome from `file://`, not just by reading the code: the Set 2
sample parses to 22 fields / 1 informational warning / 3 exclusion groups;
the tab strip flips correctly between layouts and falls back when the open tab
is hidden; step 2 renders 11 resolved-condition cards including the three new
fields; editing the popup text and removing an exclusion chip both reach the
generated code; step 3 lists exactly the 11 Set 2 files (1164 lines, 62.9 KB)
and both download paths fire with the right blob
(`disability-section-generated.zip`, 65.7 KB `application/zip`; `config.php`,
2.1 KB `text/plain`); highlight.js tokenizes the Set 2 output (1068 spans in
`reg_details.js`); the unsaved-work guard still arms; zero console errors from
app code. Node suite: 14 files, **450 assertions** (was 218), all passing —
`test/run_set2_parse.js` (37), `test/run_set2_resolve.js` (43) and
`test/run_set2_generators.js` (152) are new, and the latter includes a
PHP-aware brace/quote balance walker (strings and comments skipped) plus a
real `new Function()` parse of every generated `reg_details.js`.


## optdisabledexservice removed from detailsJs.js (2026-09-11)

Follow-up to the fix above. The previous entry classed `.optdisabledexservice`
alongside `.depdisability`/`.depdisabilitytype` as harmless verbatim carryover
from the real reference application, kept as fixed text since none of the
three are in this dictionary. Per the user: `optdisabledexservice` specifically
names the real reg_details.js's `disabled_exserviceman` field — an
ex-serviceman reservation toggle, unrelated to the disability section
entirely, not merely "a field this tool doesn't model yet." Removed outright
from `optdisabilityHandlerBody()`'s N-branch rather than left as fixed text;
`.depdisability`/`.depdisabilitytype` are untouched (not flagged, still
plausibly relevant carryover). Verified: the string `optdisabledexservice`
no longer appears in `reg_details.js` output for any of bpcl/iifcl/nitr/csmc;
full suite (11 files, 218 assertions) unaffected.

## Absent-field leakage in validationsPhp.js and detailsJs.js (2026-09-11)

**Bug, caught by the user against iifcljul26's real output** (only rows 3-5
pasted: `optdisability`/`disability_category`/`disability_type` — every
scribe/compensatory/disabilitysuffersoc field absent). Two distinct spots
still emitted code describing fields that don't exist in that project at all:

1. **`reg_validations.php`**: the `disability_type` block's compans_time
   mandatory/errmsgarr check degrades to a live `if(false){$mandatory_flds[...]}
   else{$errmsgarr[]='compans_time|';}` when `compans_time` was never pasted
   — `eqChainMulti`/`eqChainSingle` return the literal string `'false'` as
   their own "no codes" fallback (a sensible default when compans_time exists
   but resolves to zero codes), but that fallback was also firing when
   compans_time doesn't exist in the paste at all, which is a different
   situation entirely. Fixed: `compansMultiBlock()`/`compansSingleBlock()`
   (`validationsPhp.js`) are each a complete, self-contained `if/else`
   statement — safe to omit wholesale without unbalancing the surrounding
   braces — now spliced in only when `has('compans_time')`, same for the
   outer-else's own `$errmsgarr[]='compans_time|';` line.
2. **`reg_details.js`**: this was worse, because Phase 5's own design
   note explicitly *decided* to allow it: "Selector strings inside a kept
   handler that reference a sibling field's class... are not further
   sub-gated even if that sibling field is absent — jQuery silently no-ops
   on a selector matching nothing, so this is inert rather than visibly
   wrong... Revisit this only if a future real SOW shows it actually causes a
   problem." The user's report is exactly that revisit trigger. iifcl's
   `.optdisability` handler — pasted in full by the user — still emitted
   every scribe_name/scribe_id_proof/card_no_scribe/eligible_for_scribe/
   undertake_to_produce_udid/edu_qual_for_scribe/disabilitysuffersoc/
   compensatary_time/optscribe/compans_time/compensatory/compensatory1/
   optdisability_40less/scribe1/compensatory2/disability_certify line
   verbatim — eleven-plus fields, none of which exist in that project.
   "Inert" (jQuery no-ops harmlessly) turned out not to be the same bar as
   "not misleading" (a developer pasting this into a real project sees
   fields referenced that were never part of the SOW). **This reverses that
   design decision**: every cross-field reference is now gated on that
   field's own presence, not just each handler's own trigger field.

   `detailsJs.js` was rebuilt around a small set of has()-gated helpers
   rather than fixed strings:
   - `scribeDetailReset(has, indent)` / `scribeDetailEnable(has, indent)` —
     the rows-17-22 scribe-detail sextet's reset/enable lines, each trimmed
     to only the classes THIS paste actually has (or '' if none), reused at
     all 5 sites that used to hardcode the full six unconditionally
     (`.optscribeset`, `.optscribesetchange`, `.optdisability`,
     `.optscribe,.scribe1`, `.optdisability_40less`) — the same
     independent-per-field gating `detailsPhp.js`'s rows-17-22 section
     already established (see "Follow-up: rows 17-22 needed per-field
     gating too").
   - `optdisabilityHandlerBody(has)` — the `.optdisability` handler
     specifically, rebuilt line-by-line from has()-gated fragments for
     every field it touches (disabilitysuffersoc/compensatary_time,
     disability_category, disability_type/disability_multiple, optscribe/
     compans_time/compensatory/compensatory1, and the Y/N branches'
     optdisability_40less/scribe1/compensatory2/disability_certify).
   - The two `#disability_type`/`#disability_multiple` handlers' compans_time
     toggle blocks (both the initial reset and the final if/else) are now
     gated on `has('compans_time')` too, same reasoning as the validations
     fix — and so is the one live (non-commented) `.compans_time` reference
     inside the verbatim `getSub_TypeMuldisability()` ajax helper.
   - **Deliberately NOT touched** (scope boundary, not an oversight):
     `optdisabilityHandlerBody` still emits `.depdisability`/
     `.depdisabilitytype`/`.optdisabledexservice` unconditionally — these
     aren't in this dictionary at all (verbatim carryover from the real
     reference application, same tier as the commented-out `ds1`/`ds2` reads
     inside `getSub_TypeMuldisability()`), so there's no `has()` to gate them
     on. Also not touched: `.optdisability_40less`'s own internal
     compensatory2/scribe1/disability_certify references, and the ds1/ds2
     boolean-condition reads in `.optscribeset`/`.optscribesetchange` (they
     read `$('input[name=X]:checked').val()`, safely `undefined` on a
     missing field rather than a dead class reference) — neither is
     exercised by iifcl (optscribe/optdisability_40less are themselves absent
     there, so those handlers don't even get emitted), so — per this same
     section's own "revisit only if it actually causes a problem" precedent
     — these stay as documented residual scope rather than expanding the fix
     to code paths nobody has hit yet.

Verified: iifcl's `reg_validations.php` no longer contains `if(false)` or the
string `compans_time` at all; iifcl's `.optdisability` handler now emits only
the `disability_category`/`disability_type`/`disability_multiple` lines (down
from referencing 15 fields to 3); a scripted check confirmed zero leakage of
any absent field's class name into live (non-commented) code for iifcl,
nitr (all fields present) and csmc (scribe-detail sextet absent, a different
partial-subset shape than iifcl's) alike; BPCL's `.optdisability` handler
output is byte-identical to the pre-fix hardcoded template when every field
is present, confirming the has()-gated rebuild reproduces the original
exactly rather than just "looking similar"; `new Function(detailsJs)` parses
without a SyntaxError for all four fixtures. Full suite (11 files, 204
assertions) unaffected.

## Unload guard, highlight.js, and a step-2 Excel reference view (2026-09-10)

Three follow-up requests against the just-shipped 3-step wizard.

- **Unsaved-work guard.** Nothing pasted/parsed/edited is persisted anywhere
  (only the theme choice lives in `localStorage`), so a stray reload or tab
  close silently threw away a whole parse plus any resolved-conditions/
  exclusion-group edits. `main.js`'s `confirmUnloadIfParsed()` arms the
  browser's native `beforeunload` confirmation once `App.S.fields.length`
  is non-zero, checked live at unload time rather than snapshotted when the
  listener was attached — so clearing the pastes and re-parsing to nothing
  disarms it again. Verified by dispatching a synthetic `beforeunload` event:
  `defaultPrevented` is `true` right after a parse, `false` again after
  clearing both textareas and re-parsing.
- **highlight.js, vendored, not CDN'd.** `vendor/highlightjs/` (the file
  actually vendored: `highlight.min.js` + `styles/atom-one-{dark,light}.min.css`)
  keeps this a "no build step, no CDN" tool per its own PRD constraint, even
  though the sibling `eligibility_code_generator` tool pulls the same library
  from cdnjs — a network dependency this tool has never had. One surprise
  worth recording: cdnjs's root-level `highlight.min.js` for this version is
  already the "common" bundle with ~40 languages built in (confirmed via
  `hljs.listLanguages()`), including all three this tool ever emits
  (php/javascript/sql) — the separate `languages/*.min.js` files initially
  vendored alongside it were dead weight and have been removed; the plan-of-
  record is just the one script.
  - Every code tab's markup changed from a bare `<pre id="code-KEY">` to
    `<pre><code id="code-KEY" class="language-LANG"></code></pre>`
    (`js/ui/ui.js`'s `buildTabStrip()`), `LANG` coming from a new `lang` field
    on each `TABS` entry — `php` for everything except `detailsJs`
    (`javascript`) and `queries` (`sql`, since `disability_queries` is bare
    `ALTER TABLE` DDL with no `<?php` wrapper).
  - `setCode(id, code)` (`ui.js`) replaces the old direct `textContent`
    assignment: sets the text, clears `dataset.highlighted` (hljs's own
    re-highlight guard), then calls `hljs.highlightElement()` — guarded by
    `typeof hljs !== 'undefined'` so a blocked/missing script degrades to
    plain text, never a crash. Still `textContent`, never `innerHTML` — the
    generated code is arbitrary PHP/JS/SQL and must never be parsed as markup.
  - Theme sync: both hljs theme stylesheets load in `<head>` (`#hljs-dark` /
    `#hljs-light`, one `disabled`), and `js/ui/nav.js`'s `applyTheme()` now
    also flips their `.disabled` alongside `data-theme` and the sun/moon icon
    — same swap-the-stylesheet approach the sibling tool uses.
  - `main.js` calls `hljs.configure({ignoreUnescapedHTML:true})` on boot —
    generated code is full of `<`/`>` that would otherwise trip hljs's "looks
    like markup" warning even though it's always plain text.
  - `css/styles.css`: hljs's own theme paints a hardcoded panel background on
    the element it highlights; `.cp-body pre code.hljs{background:transparent;
    padding:0}` overrides just that (specificity picked to always win
    regardless of `<link>` order) so code sits on the card's own `--bg-elev`
    instead of a second, mismatched surface — syntax-token colors
    (`.hljs-keyword` etc.) are untouched and still win over the page's own
    base text color, since a single-class selector always outranks the
    two-bare-element selector carrying that fallback.
- **Excel view now also lives on step 2, collapsed by default.** The user's
  own dilemma: reviewing/editing resolved conditions on step 2 often needs a
  glance back at the original SOW wording (a label, a Validations cell), but
  moving the Excel view off step 1 entirely would leave that step sparse.
  Resolution — keep it in both places rather than picking one: step 1's copy
  stays exactly as it was (expanded by default, the immediate "did I paste
  this right" check); step 2 gets a second copy of the same panel, collapsed
  by default so it doesn't add scroll weight to a page that's already dense,
  with the row/column summary visible in its header even while collapsed so
  there's a reason to open it. One data-rendering pass now serves both:
  `renderExcelView()` in `ui.js` was regeneralized from `getElementById` on a
  single id to `querySelectorAll('.excel-view-mount')` /
  `.excel-view-summary-text`, so both panels stay in sync from one call and
  neither panel's markup/JS had to be duplicated. `toggleExcelView(btn)` was
  regeneralized the same way — it now finds its own panel via
  `btn.closest('.panel')` instead of a hardcoded id, so the two instances
  collapse independently (verified: opening step 2's copy does not affect
  step 1's expanded state, and vice versa).

Verified in Chrome from `file://`: `hljs.listLanguages()` includes php/
javascript/sql after loading only the one vendored script; token `<span>`
counts are non-zero for all three (`reg_details.php` 1775, `disability_queries`
209, `reg_details.js` 854 — 209 is a strict SQL grammar tokenizing 19
near-identical `ALTER TABLE` lines, so a low-but-nonzero count there is
correct, not a partial failure); switching light/dark swaps the hljs
stylesheet and the code stays readable in both; step 2's Excel reference
panel shows all 20 parsed rows when expanded, independently of step 1's;
the `beforeunload` guard arms/disarms as described above; zero console
errors from app code. Node suite unaffected (11 files, 204 assertions).

## UI split into three pages + light/dark theme (2026-09-10)

One page carrying two pastes, the Excel view, three editable review panels and
eleven code tabs had become unscannable, so the tool is now a three-step
wizard. Per the user's own instruction, the page structure deliberately mirrors
the sibling `eligibility_code_generator` tool — same step vocabulary
("Configure & Review" / "Generate & Export"), same `goStep(n)` entry point,
same `.steps`/`.step-item`/`.step-num`/`.action-bar`/`.theme-toggle` class
names — so a developer who knows that tool navigates this one without
relearning it.

- **`js/ui/nav.js`** (new, second DOM-touching module alongside `ui.js` — the
  "no DOM outside `js/ui/`" rule still holds, and `test/harness.js` loads
  neither): `goStep(n)`, the stepper strip, the theme toggle, and `App.ICON`,
  a shared inline-SVG icon set (SVG, never emoji — emoji can't take
  `currentColor` and render differently per platform).
- **Step gating is real, not cosmetic.** `App.NAV.setParsed(ok)` is called at
  the end of every `generate()` with whether the parse actually produced
  fields; steps 2-3 stay locked (and `goStep` refuses them) until it did.
  Clearing the pastes and re-parsing re-locks them and bounces back to step 1,
  so you can't sit on a stale step 3. Two deliberate additions over the
  sibling tool, which only disables its Next button: reachable steps are
  clickable in the stepper, and the gate is on parse output rather than on
  the button alone.
- **What lives where**: step 1 = the two pastes + sample picker + layout
  override + Excel view + a one-line parse receipt (`#s1-status`); step 2 =
  the full warning list + the three editable review panels + a read-only live
  preview of all eleven files; step 3 = stat tiles, "Download all (.zip)", and
  a card per file with Copy + Download. The warning list sits on step 2 rather
  than step 1 because that is where the panels that *fix* those warnings are —
  step 1 only needs "20 rows parsed, 3 warnings, listed on the next step",
  since a wrecked paste has to be visible on the page you fix it on.
- **Step 3 deviates from the sibling tool's layout on purpose**: that tool
  stacks a full code panel per file, which works for its six files but would
  be a wall of scroll for eleven. Compact per-file cards (name, line count,
  size, Copy, Download) carry the same information architecture and stay
  scannable; the code itself was already previewed on step 2.
- **Theme**: `data-theme` on `<html>`, persisted to `localStorage` under
  `dscg-theme`, falling back to `prefers-color-scheme` and then dark. An
  anti-FOUC IIFE in `<head>` stamps the attribute *before* the stylesheet
  paints — without it a dark-mode developer gets a white flash on every load.
  `css/styles.css` now has a documented THEME CONTRACT header and two token
  blocks; the light palette's text/muted/accent/semantic colours were picked
  to clear WCAG AA (4.5:1) on their own surfaces, not by inverting the dark
  ones. Nothing outside the token blocks may hardcode a colour.
- **Accessibility pass while in there**: the review panels build their
  `<select>`s from data, so there is no static `<label>` to point at them —
  DevTools flagged 33 unlabelled form fields, all pre-existing. Each now gets
  a `name` + a contextual `aria-label` ("Operator for optscribe, condition 1"),
  via `nameControl()`. Tabs became real `<button>`s (keyboard-reachable),
  focus-visible rings are global, and `prefers-reduced-motion` kills the page
  transition.
- **`flashButton()` had to switch from `textContent` to `innerHTML`**: every
  button now carries an inline SVG that `textContent` would silently eat.

Verified in Chrome from `file://` (not just by reading the code): all three
steps render in both themes; parse unlocks and re-locks correctly; a
programmatic `goStep(3)` on an empty paste is refused; the collapsible warning
box round-trips its `aria-expanded`; 0 unlabelled form fields remain (was 33);
both download paths fire with the right blob (`disability-section-generated.zip`,
56 KB `application/zip`; `config.php`, 940 B `text/plain`); no console errors
from app code; and the narrow layout collapses the stepper to numbers with no
horizontal overflow. The Node suite (11 files, 204 assertions) is unaffected.

## Phase 7 — four more output tabs: reg_qry_arrays.php, reg_details_lang.php, disability_queries, print.php (2026-09-09, in progress)

The user supplied real reference material/format examples for four more
paste-in files, all already stubbed as `deferred:true` tab placeholders since
Phase 0. Building phase-by-phase with a checkpoint after each, per the user's
own request, since each is a materially different re-projection of
`ctx.parseA.fields`:

1. `reg_qry_arrays.php` (`js/generators/qryArrays.js`, `App.GEN.qryArrays()`)
   — **done**. A bare list of `"dbName",` lines, one per pasted field, in
   document order (`ctx.parseA.fields` — already document-ordered, see the
   "Generalization pass" section's Sl-No-is-not-stable-identifier finding).
   Two deliberate exclusions: the note row (no `postName`) and
   `disability_type`'s `multiPostName` (`disability_multiple[]`) —
   `submitPhp.js` already treats `disability_type` as the one DB column
   holding either the single-select value or the imploded multi-select CSV
   (see `reg_submit.php`'s own `if($disability_category=='05')` branch), so a
   second array line for the multi-select sibling would name a DB column
   nothing ever writes to.
   **A POST name is not always the DB column name** — caught by the user
   immediately after first landing this generator using raw `field.postName`
   (it emitted `"optdisability"`, not the real DB field `"disability"`).
   `detailsPhp.js` had already discovered 2 of these 3 exceptions for its own
   narrower purpose ($row_reg[...] reads, its old file-local `ROW_REG_KEY`);
   grepping `reg_submit.php`'s own `$`-variable assignments and the user's
   print.php reference (still unimplemented but supplied in full) confirmed
   a third: `optdisability_40less` -> `disability_40less`. All three drop a
   leading "opt" — but per this dictionary's own "don't infer, enumerate"
   precedent (see `compensatary_time`'s note), this is recorded as an
   explicit map, `DB_NAME_OVERRIDES` in `js/core/dictionary.js`
   (`App.DICT.dbNameFor()`), not a strip-the-prefix rule that might
   over-generalize to a future SOW's field. Promoted out of `detailsPhp.js`
   into this single shared spot precisely because a second consumer
   (`qryArrays.js`) needed it — `detailsPhp.js`'s `rowRegKey()` now delegates
   to `App.DICT.dbNameFor()` too, behavior-unchanged (verified:
   `test/golden.js` still all 5 PASS).
   Verified: BPCL's list matches the reference's own row order exactly (19
   fields, rows 3-12 + the 12.1-12.4/17-22 constant block) with correct DB
   names; iifcljul26 (which only pastes rows 3-5) emits exactly those 3
   (`disability`, `disability_category`, `disability_type`), nothing from the
   constant blocks it never mentions; no crash across all 6 fixtures. No
   golden reference exists for this file (only the user's short format
   example), so acceptance is `test/run_qryArrays.js`'s explicit
   expected-list assertion for BPCL, not a byte-diff.
2. `reg_details_lang.php` (`js/generators/langPhp.js`, `App.GEN.lang()`) —
   **done**. `$LANG['langKey'] = 'label text';`, one per pasted field, in
   document order, using each field's own verbatim SOW question text
   (`field.label` — never a hardcoded English string, since per-project
   wording is exactly what a SOW's own paste supplies). Deduped by `langKey`,
   first occurrence wins: `compensatory`/`compensatory1`/`compensatory2` all
   intentionally share `reg_compensatory` (dictionary.js), so an unde-duped
   emit would repeat the same `$LANG` key 3 times for BPCL. The note row
   (row 6, no `postName`) gets its own `reg_desc2` line sourced from
   `ctx.parseA.noteText` instead of `field.label`, since inputA.js leaves the
   note field's own `.label` holding the raw, still-"Note:"-prefixed text —
   `noteText` is the already-cleaned version every other consumer
   (detailsPhp.js's note block) already uses. PHP single-quoted string
   escaping (`\` and `'` only) verified with a synthetic case — no real SOW
   fixture happens to contain either character in a label.
   Verified: BPCL emits 18 lines (20 candidate fields+note minus 2 dedup
   collisions), matching hand-checked expected text for `reg_optdisability`/
   `reg_desc2`/`reg_scribe_id_proof`; iifcljul26 (rows 3-5 + note only) emits
   exactly 4 lines, no `compans_time`/`scribe_name`/etc.; no crash across all
   6 fixtures. No golden reference exists for this file, so acceptance is
   `test/run_langPhp.js`'s explicit assertions, not a byte-diff.
3. `disability_queries` (`js/generators/queriesSql.js`, `App.GEN.queries()`)
   — **done**. One `ALTER TABLE \`registration\` ADD ...` statement per
   pasted field, in document order, DDL type from `field.control` (already
   resolved by the dictionary — no new type detection needed):
   `radio`->`ENUM('Y','N')`, `checkbox`->`VARCHAR(1)` (always — confirmed the
   Max Length cell is blank for every checkbox row in every real fixture, so
   there's nothing to read there anyway), `select`/`select+multiselect`/
   `text`->`VARCHAR(N)` where N is THIS field's own pasted Max Length
   (`field.maxLength`, parsed but unused until now — see the earlier research
   pass). DB column names go through the same `App.DICT.dbNameFor()` map
   Phase 7a introduced (`optdisability`->`disability` etc.) — this DDL must
   add the column `reg_submit.php`'s own `$`-variables actually write to.
   **No dedup, unlike `reg_details_lang.php`**: `compensatory`/
   `compensatory1`/`compensatory2` share one LANG key but are three distinct
   real DB columns (`reg_submit.php` assigns to three separate
   `$`-variables), so each gets its own `ALTER TABLE` line.
   A `VARCHAR` field with a missing/non-numeric Max Length falls back to 50
   rather than emitting `VARCHAR( NaN )` — never fires against any real
   fixture (every dropdown/textbox row in bpcl/iifcl/nitr/csmc carries a real
   numeric Max Length), so this is a safety net, not a modeled default; if a
   future SOW hits it, it's a signal for the developer to fill in the real
   length before shipping the DDL, not a value to trust.
   Verified: BPCL's 19-statement DDL matches an exact hand-verified expected
   list (covering every control type it has: radio/select/
   select+multiselect/text/checkbox) including `disability_category`
   VARCHAR(2) and `scribe_name` VARCHAR(35) — i.e. the tool's own two
   VARCHAR examples' *lengths* were illustrative only, not fixed values, each
   SOW's own pasted length is what's emitted; iifcljul26 (rows 3-5 only)
   emits exactly 3 statements; no crash across all 6 fixtures. No golden
   reference exists for this file, so acceptance is
   `test/run_queriesSql.js`'s explicit assertions, not a byte-diff.
4. `print.php` (`js/generators/printPhp.js`, `App.GEN.print()`) — **done**.
   One `<tr>` label/value row per pasted field, in the reference's own
   document order/nesting. Almost entirely fixed template text (same
   reasoning as `detailsPhp.js`): `$LANG` keys and the `$reg->` property
   names are both standardized regardless of SOW wording, so the only
   SOW-derived thing is which rows/wrappers exist at all — every row is
   gated on `has(postName)` for its own field.
   **Not added to `GOLDEN_KEYS`/the diff view despite having genuine,
   complete reference text** — unlike every Phase 4-6 file, this reference
   arrived as pasted chat content rather than an external ground-truth
   document (`disability_automation NF.txt`), so byte-exact *whitespace*
   parity isn't something a transcription can honestly claim to verify.
   Content, PHP logic, `$LANG` keys and `$reg->` property names are all
   transcribed verbatim; only indentation was normalized to this codebase's
   own tab style. Acceptance is `test/run_printPhp.js`'s structural
   assertions (all 19 rows present in the reference's exact order including
   the repeated `reg_compensatory` key 3x; correct DB names on the 3 known
   exceptions; correct nesting), not a byte-diff.
   Three nesting levels, each independently gated per the project's
   established "a group is never atomic" rule (see "Follow-up: rows 17-22
   needed per-field gating too" below): the `if($reg->disability=='Y')`
   wrapper (category/type/compans_time/disabilitysuffersoc/compensatory/
   compensatary_time/compensatory1/optscribe) opens only if
   `has('optdisability')` — a SOW missing the root toggle entirely gets none
   of this, not a wrapper testing an undefined property for no reason; the
   `if($reg->disability_40less=='Y')` wrapper (compensatory2/scribe1/
   disability_certify) opens only if `has('optdisability_40less')`; the
   scribe-detail wrapper's HTML/PHP is emitted at all only if ANY of its six
   fields is present (`anyScribeDetail`, same helper logic `detailsPhp.js`
   already uses for its own rows 17-22 block), but its runtime PHP
   condition is `$reg->scribe=='Y' || $reg->scribe1=='Y'` — the actual
   parent that enables the section per the Validations column, same
   condition `detailsPhp.js`'s own `$disable_scribe` already uses
   (`$row_reg['scribe']=='Y' || $row_reg['scribe1']=='Y'`). **Corrected
   2026-09-09**: the literal reference text instead composited
   `($reg->disability_40less=='Y' || $reg->disability=='Y') &&` with all six
   dependent fields' own emptiness (`$reg->scribe_name!='' || ...`) — caught
   by the user as circular (one of those OR terms is the very field the
   wrapper exists to gate) and not what actually enables the section.
   Each row inside every wrapper is still independently gated on its own
   field on top of that.
   Verified: BPCL emits all 19 rows in the reference's exact order with the
   correct DB names (`disability`/`scribe`/`disability_40less`, never the
   raw POST names) baked into the fixed template; iifcljul26 (rows 3-5 only)
   emits just the root row + the 3 pasted inner rows, with neither the
   40less wrapper nor the scribe-detail wrapper appearing at all; a
   synthetic case confirms a paste with no root toggle at all emits nothing
   (not a wrapper referencing an undefined `$reg->disability`); no crash
   across all 6 fixtures.

**All four new tabs are now live** (`test/run_qryArrays.js`,
`test/run_langPhp.js`, `test/run_queriesSql.js`, `test/run_printPhp.js` — 55
assertions between them, on top of the pre-existing 89, for 144 total across
the full suite; `test/golden.js` unaffected, still 5/5 PASS).

Wiring for each new tab followed the exact four-place pattern every prior
emitter established (see "Phase 4" below for the fullest description):
`test/harness.js`'s file list, `index.html`'s `<script>` load order,
`js/ui/ui.js`'s `TABS` entry (`deferred:false`) plus the DOM-push list in
`regenerate()`. None of the four joined `GOLDEN_KEYS` — see each one's
write-up above for why.

**Shared infrastructure this phase added**: `App.DICT.dbNameFor()`
(`js/core/dictionary.js`) — a POST name is not always the real DB column
name (`optdisability`->`disability`, `optscribe`->`scribe`,
`optdisability_40less`->`disability_40less`, confirmed against
`reg_submit.php`'s own `$`-variables and the user's print.php reference).
Caught by the user immediately after `qryArrays.js` first landed using the
raw POST name; `detailsPhp.js` had already discovered 2 of the 3 exceptions
for its own narrower purpose (a file-local `ROW_REG_KEY`) — promoted to
`dictionary.js` once a second consumer needed the same map, with
`detailsPhp.js`'s `rowRegKey()` now delegating to it (behavior-unchanged,
`test/golden.js` still all 5 PASS).

## New tab: functions.php (2026-09-08)

Same tier and rationale as `ajax_getdisability_type.php`: a 7th output tab,
`js/generators/functionsPhp.js` (`App.GEN.functionsPhp()`), **100% static for
Set 1** — no `ctx`, no gating, verbatim user-supplied content. Holds
`fnSelectArrayMultiHash()`, which `detailsPhp.js`'s disability_type
single/multi-select blocks both already call (to render `<option>` tags from
the category-filtered `$arrDisabilityType2` slice) but which — like
`getSub_TypeMuldisability()` before it — was never actually defined anywhere
in the generated output. `fnSelectArrayHash()` (used by disability_category/
scribe_id_proof) is assumed to already exist in the target project and was
not supplied. Per the user, this file's *content* is Set-1-specific and may
need to differ for Set 2 once that layout is built — this generator is where
that future change lands, not any SOW-derived emitter. Wired the same way as
`ajaxPhp.js`: `test/harness.js`/`index.html` load order, a `TABS` entry in
`js/ui/ui.js`, `regenerate()` populates `S.generated.functionsPhp`, and it's
deliberately excluded from `GOLDEN_KEYS`/the diff view (never varies, so
nothing to diff).

## Exclusion group message casing bug (2026-09-08)

**Bug**: `parseExclusions()`'s exclusion-message default was the raw
validation-prose cluster text verbatim (`clusterText.replace(/\s+/g, ' ')`) —
whatever casing/spelling the SOW author happened to type in the free-form
Validations cell, not necessarily what Input B's own Type-of-Disability list
defines. Real case the user caught: iifcljul26's Input B spells code `02`
**"Low Vision"** (capital V), but its Validations prose casually writes
`"Blindness & low vision"` — the generated `$errmsg`/`$errmsgarr` text said
"low vision", silently disagreeing with the requirement's own canonical
name. BPCL's own reference has the identical latent bug in its group-1
message (prose says "One leg", Input B says "One Leg") — nobody had noticed
because nothing compared the two.

**Fix**: the default message is now built from each matched code's actual
Input B name (`typeIndex.entries[].name`, exact spelling/casing as pasted),
joined `" & "` in the order `scanTypeNames()` found them — never the raw
prose. Still fully editable in the review panel per PRD §8 (a human can
restore the SOW's own wording if a specific project wants it).

**Golden impact**: this changes BPCL's own group-1 message from the
reference's hand-formatted abbreviated form ("OA (One Arm) / OL (One leg)
/OAL...") to the canonical joined form ("One Arm & One Leg & ...") —
`js/core/diff.js`'s `normalizeGoldenExclusionNaming()` gained a third
normalization (alongside the `$arr*`→`$exclgrp*` renaming and the group-3
reorder) mapping the reference's old text onto the new canonical text, so
`test/golden.js` stays green while being explicit that this is a
by-design change, not a coincidental match.

Verified: iifcljul26 now says "Blindness & Low Vision"; bpcl/iifcl/nitr/csmc
all produce plausible, Input-B-accurate messages (including nitr/csmc's own
parenthesized-abbreviation styles, e.g. "Deaf (D) & Hard of Hearing (HH)",
since that's how those SOWs' Input B itself spells the names); `test/golden.js`
and the full `test/run_*` suite (89 assertions) still pass.

## New tab: ajax_getdisability_type.php + missing reg_details.js functions (2026-09-08)

User supplied real reference material from a later branch
(`c:\svn\branch\bpclapr26\script\reg_details.js`, line ~1374) that the
original golden excerpt (lines 459-867 of the ground-truth doc) never
covered: `getSub_TypeMuldisability()` and `ajaxDisabilityType()`. This closed
a real gap — `detailsPhp.js`'s `disability_category` select has always
emitted `onchange="getSub_TypeMuldisability()"`, but that function was never
defined anywhere in our output, so the generated page would have thrown a
ReferenceError the moment a candidate touched that dropdown.

- **`getSub_TypeMuldisability()` + `ajaxDisabilityType()`** are now appended
  to `reg_details.js`'s output (`js/generators/detailsJs.js`), gated on
  `has('disability_category') && has('disability_type')` — both fixed,
  verbatim template text (no SOW-derived pieces; they operate purely on
  `disab_cate`/AJAX response data, not resolver output). `js/core/goldens.js`'s
  `GOLD.detailsJs` was extended with the same verbatim text so
  `test/golden.js` still byte-matches — this was always logically part of
  the same real reg_details.js file, just outside the line range the
  original Phase 0 golden extraction happened to capture.
- **`ajax_getdisability_type.php`** is a new, sixth output tab
  (`js/generators/ajaxPhp.js`, `App.GEN.ajaxPhp()`) — unlike every other
  emitter, **100% static for Set 1**: no `ctx` parameter, no field gating,
  no resolver involvement. It's the AJAX endpoint `getSub_TypeMuldisability()`
  calls to repopulate the type dropdown from `$arrpostCategoryDisability_mapping`/
  `$arrDisabilityType2` (both already in `config.php`) whenever the candidate
  changes `disability_category`. Per the user: a fixed companion file a
  developer downloads once per project, never diffed against a golden (it
  never varies), so it's wired into the tab strip and `regenerate()` but
  deliberately left out of `GOLDEN_KEYS`/the diff view.
- Both additions are wired the same way as every other emitter:
  `test/harness.js` and `index.html` load the new/changed files in the same
  dependency-ordered list; `js/ui/ui.js`'s `TABS` array gained the
  `ajaxPhp` entry (title `ajax_getdisability_type.php`, not deferred).

Verified: `test/golden.js` still shows all five PRD-original files PASS;
`js/generators/ajaxPhp.js` reproduces the supplied PHP byte-for-byte; full
`test/run_*` suite (89 assertions) unaffected.

## Phase 6 — reg_validations.php and reg_submit.php emitters (2026-09-08)

Both land, and **all five output files now PASS `test/golden.js` byte-for-byte
against BPCL** — the full acceptance target since Phase 0.

- `js/generators/submitPhp.js` (reg_submit.php): straightforward — one
  `getVal()`/NULL-fallback statement (or small statement group) per field,
  each gated on `has(postName)`, same shape as the other emitters. Two
  resolver-derived code-lists (`compans_time`'s and `optscribe`'s `'in'`
  condition codes, same extraction helpers as `detailsJs.js`) get spliced in
  at the two sites that need them.
- `js/generators/validationsPhp.js` (reg_validations.php): the same design,
  but with one genuinely hard part PRD §8 calls out explicitly: the
  disability_category=='05' (multi-select) branch's exclusion-group block
  can't just gate-and-splice fixed text, because the reference hardcodes
  exactly three groups (`$arr1..3`/`$count1..3`) and this tool's own group
  count is dynamic (`ctx.exclusionGroups`, PRD §8). Built four small pure
  functions instead — `exclDeclarations()`, `exclIncrementLoop()`,
  `exclCascade()`, `exclGate()` — that generate the `$exclgrpN`/`$exclcntN`
  declarations, the per-group increment loop, the if/else-if message
  cascade, and the final structural gate (`$exclcnt1<=1 && ... && $exclcntN<=1
  && ...`) for however many groups N actually is, never hardcoded for three.
  `disabilitysuffersoc`'s Y-constraint (the `'15'`/`'10'`-per-SOW code from
  `resolved.disabilitysuffersoc.constraint`) is spliced the same way
  `detailsPhp.js` already does it elsewhere.

**The exclusion cascade's byte-exact reproduction for BPCL's real 3-group
case relies on a documented modeling call**: `exclCascade()` reproduces the
first/middle/last group's formatting using three literal templates lifted
directly from the BPCL reference, because the reference's own three groups
are formatted *inconsistently* with each other (group 1 has a blank line the
middle group doesn't; the last group has extra parens around its condition
and a leading blank line the other two don't, and its closing brace glues
directly onto the next `else if` with no newline). There is only one real
example to generalize from, so "first gets template A, every middle group
(if any) gets template B, the last gets template C" is a judgment call, not
a discovered rule — flagging it here rather than presenting it as more
principled than it is. It happens to reproduce BPCL exactly and generalizes
sensibly to other group counts (verified: csmcnov25 resolves to 2 groups —
first + last only, no middle — and generates without crashing).

**One pre-existing divergence, not a new one**: BPCL's third exclusion
group's message reads "Deaf & Hard of Hearing" in the reference but
"Hard of Hearing & Deaf" from `parseExclusions()` (member order follows the
SOW's own prose — see "Exclusion groups" below; this was already documented
as an editable-in-the-review-panel divergence before Phase 6 existed).
`js/core/diff.js`'s `normalizeGoldenExclusionNaming()` now also normalizes
this one message's word order (alongside the pre-existing `$arr*`→`$exclgrp*`
naming normalization) so `test/golden.js` can go fully green without
special-casing this SOW's own hand-edited reference text as if it were a
generalizable rule.

Verified: `test/golden.js` all five PASS; `test/run_*` (89 assertions) still
pass; bpcl/iifcl/nitr/csmc all generate both new files without crashing
(csmc's 2-group case confirmed the dynamic exclusion-group codegen actually
exercises N≠3, not just always 3).

`test/harness.js` and `index.html` load `submitPhp.js` then
`validationsPhp.js` after the Phase 4-5 emitters, same override pattern as
before.

## Phase 5 — reg_details.js emitter (2026-09-08)

`js/generators/detailsJs.js`, PASSES `test/golden.js` byte-for-byte against
BPCL. Same design as Phase 4's `detailsPhp.js`: one handler block per
triggering field/class, almost all fixed template text (the cascade wiring —
`#disability_category` change, `#disability_type` change, `#disability_multiple`
click, `.optscribeset`/`.optscribesetchange`, `.disabilitysuffersoc` click,
`.compensatary_time` click, `.optdisability` click, `.optscribe,.scribe1`
click, `#scribe_id_proof` change, `.optdisability_40less` click — 11 handlers
total) is structural to the standardized section, not derivable from SOW
prose. Two genuinely dynamic pieces, both resolver-derived:

- **The popup `alert()` text** (`ctx.resolve.popupText`), verbatim at its two
  call sites (`#disability_type` change, `#disability_multiple` click) — same
  string Phase 3 already extracts for the review panel.
- **Two code-lists**, each substituted at several sites with the reference's
  own exact per-site spacing: `resolved.compans_time`'s `'in'` codes (which
  `disability_type`/`disability_multiple` values turn on `compans_time` —
  2 sites) and `resolved.optscribe`'s `'in'` condition codes, found by
  scanning its `'or'` group same as `detailsPhp.js`'s `scribeSlots()`
  (3 sites × 2 near-duplicate handlers = 6 occurrences). Empty-codes case
  emits `if (false)`, not a syntactically-broken empty `||` chain — same
  precedent as `detailsPhp.js`'s `scribeYCheck()`.

**Gating scope decision** (documented here because it's narrower than it
could be): each handler is gated on `has(postName)` for its own *triggering*
field/row, same as `reg_details.php`'s per-field gating — a SOW missing
`optscribe` or `optdisability_40less` entirely does not get that handler's
block. Selector strings *inside* a kept handler that reference a sibling
field's class (e.g. `.scribe_name,.scribe_id_proof,.card_no_scribe` inside
`.optdisability`'s click handler) are **not** further sub-gated even if that
sibling field is absent from the paste — jQuery silently no-ops on a selector
matching nothing, so an absent field's class name sitting inertly in another
handler's fixed text has no visible effect (unlike the reg_details.php bugs
this phase's design otherwise mirrors, where an absent field's *own* HTML
block would visibly render). Revisit this only if a future real SOW shows it
actually causes a problem.

Verified: BPCL byte-matches golden exactly (10704 chars); bpcl/iifcl/nitr/csmc
all generate without crashing (iifcl's much shorter output, 4674 chars,
correctly excludes every handler for fields it never pastes); a hand syntax-
check of iifcl's generated JS (`new Function(...)`) confirms the `if (false)`
empty-codes fallback produces valid JS, not `==false`.

`test/harness.js` and `index.html` both load `js/generators/detailsJs.js`
after `detailsPhp.js`, overriding `stubs.js`'s JSON-preview `App.GEN.detailsJs`
same as Phase 4's two emitters did.

## Follow-up: rows 17-22 needed per-field gating too (2026-09-08)

The first fields-not-in-the-paste fix (below) still treated the rows 17-22
scribe-detail section (`scribe_name`/`scribe_id_proof`/`card_no_scribe`/
`eligible_for_scribe`/`undertake_to_produce_udid`/`edu_qual_for_scribe`) as
one atomic block, gated only on whether `scribe_name` was present. **Real
counter-example supplied by the user**: a SOW pasting rows 9.5-9.9 (its own
Sl No scheme) that has scribe name/id/card-number/eligibility/UDID-undertaking
rows but genuinely never asks the `edu_qual_for_scribe` question at all — the
old atomic gate still emitted all three of that section's checkboxes
(`eligible_for_scribe`, `undertake_to_produce_udid`, AND `edu_qual_for_scribe`)
instead of the two the paste actually supports.

**Fix**: `genDetailsPhp()` now gates each of those six rows independently on
its own `has(postName)`, same as rows 3-12. The section's own wrapper
(`<div class="row reg_det_section">` + the `$disable_scribe` PHP setup +
closing `</div>`) is emitted only if **at least one** of the six is present
(`anyScribeDetail`), and stays out entirely if none are. Verified against the
user's sample: `edu_qual_for_scribe` no longer appears while the other five
(all actually pasted) still do; BPCL's `reg_details.php` still byte-matches
`test/golden.js` (all 6 rows present there, so all 6 still render, unchanged).

**Lesson for any future emitter work here**: a dictionary "group" of rows
(12.1-12.4, 17-22) is a *labeling* convenience only — it says nothing about
whether those rows travel together in a given SOW's paste. Always gate at
the individual postName/row level, never at the group level, even for rows
that look like they'd obviously co-occur.

## Fields-not-in-the-paste bug in detailsPhp.js (2026-09-08)

**Bug**: `genDetailsPhp()` emitted the *entire* rows-3-through-22 template
unconditionally — every field's HTML/PHP, regardless of whether that row
actually appeared in the SOW's own Input A paste. Correct only by accident
for BPCL, whose paste happens to include every row 3-22. Broke on any SOW
whose paste is a subset — real case: **iifcljul26 only pastes rows 3/4/5**
(optdisability, disability_category, disability_type + a note); it never
mentions compans_time, disabilitysuffersoc, compensatory, compensatary_time,
compensatory1, optscribe, or the scribe-name detail fields at all. The old
generator still emitted all of that reference-only boilerplate for it.

**Fix**: `genDetailsPhp()` now builds `parts[]` and gates each row-3-through-12
field's block on `has(postName)` — a lookup against `ctx.parseA.fields` — and
gates the rows-17-22 scribe-name section on `has('scribe_name')`. The note
block (row 6) gates on `ctx.parseA.noteText` being non-empty instead, since it
has no postName. **The outer `<div class="row reg_det_section">` wrapper
(opened once at the very top, closed once right after the optscribe block) is
always emitted regardless of which inner fields are present** — it's
structural to the section, not a per-field artifact, and skipping fields
inside it must never leave it unclosed. Verified: BPCL (full paste, all
fields present) still byte-matches `test/golden.js` exactly, and iifcljul26
now emits only the 3-field+note block it actually pastes (confirmed no
`compans_time`/`disabilitysuffersoc`/`compensatory`/`compensatary_time`/
`scribe_name` substrings in its output, down from 17320 to 4933 chars).
config.js was not affected — its arrays come straight from Input B's own
category/type data, not from which Input A rows exist, so nothing there was
ever paste-subset-dependent in the first place.

**Applied to every emitter since**: Phase 5 (`reg_details.js`) and Phase 6
(`reg_validations.php`, `reg_submit.php`) both follow the same rule — never
assume a field exists just because the standardized dictionary *could*
describe it; always check `ctx.parseA.fields` (or `resolveAll()`'s
`resolved{}`, which is already naturally scoped to pasted fields) before
emitting that field's code.

## Phase 4 — config.php and reg_details.php emitters (2026-09-04)

Both emitters land, matching the BPCL golden byte-for-byte
(`node test/golden.js` → `config.php: PASS`, `reg_details.php: PASS`), and
verified not to crash across all 6 sample fixtures including both Set 2
samples.

- `js/generators/config.js` — `$arrDiscategory`/`$arrDisabilityType2`/
  `$arrpostCategoryDisability_mapping`, a direct translation of Phase 1's
  `parseB.categories`/`types`/`mapping` into PHP array-literal syntax. No
  resolver involvement; these arrays just ARE Input B's own data.
- `js/generators/detailsPhp.js` — the rows 3-12 HTML/PHP block plus the
  constant 17-22 scribe-name block. **Key design call**: since the
  dictionary standardizes every field's name/id/class/LANG key regardless of
  SOW wording (that's the entire point of PRD §4), almost the whole block is
  fixed template text — the only genuinely SOW-derived pieces are the
  `disabled` conditions (compiled from `resolveAll()`'s `resolved{}`) and the
  scribe-enable block's `$scribeTypes` array + Y/N field pair (compiled from
  `resolved['optscribe']`). Structural boilerplate that prose-parsing could
  never discover — the type dropdowns' and `compans_time`'s implicit "a
  category must be chosen first" guard, and the `$enableScribe` single/multi-
  select branching — is fixed template text too, same tier as the rows
  12.1-12.4 / 17-22 constant blocks (per CLAUDE.md's own account of those:
  never fed to the resolver either).
- **The `$row_reg[...]` array key a field reads back does not always equal
  its POST name.** Found by grepping every `row_reg['...']` occurrence in the
  golden reference: `optdisability` reads `$row_reg['disability']` and
  `optscribe` reads `$row_reg['scribe']`; every other field's key matches its
  postName exactly. `ROW_REG_KEY` in `detailsPhp.js` holds this exception
  map — easy to miss since the POST field's own `name=`/`id=`/`class=`
  attributes DO use the real postName; only the read-back differs.
- **The `disabled`-condition compiler** (`compileDisabledCore`/`negateOne`)
  negates a resolved `enabledWhen` (De Morgan for an `or` group) into the
  PHP the reference actually writes: `==` → `$row_reg[k] != 'v'`, `selected`
  → `$row_reg[k] == ''`, `in` → an `!in_array(...) && !in_array(...)` chain
  per code. Two known real-condition shapes it never needs to touch: no
  Phase-4 field for BPCL actually resolves to an `or` group (only
  `optscribe`'s bespoke handling does), so that branch is exercised only by
  construction/logic, not by a byte-matched golden case — worth a second
  look if a future SOW's Phase-4 field genuinely produces one.
- **Resilience beyond BPCL**: a SOW whose paste never produces a resolved
  `optscribe` entry (real case: `iifcl`) made the scribe Y-check degenerate
  to `if ()` — syntactically invalid PHP. Fixed: `scribeYCheck()` now
  returns `if (false)` when there are no Y/N conditions to check, which is
  both valid PHP and the semantically correct answer ("no direct yes/no
  field enables scribe for this SOW").
- **How the template was authored without hand-transcribing ~17KB of
  PHP/HTML**: a one-off Node script (not checked in) split
  `App.GOLDENS.detailsPhp` at 15 known dynamic-slot markers using a single
  forward-advancing cursor — safe even though several markers share
  identical text (e.g. the `disability != 'Y'` guard appears 5 times across
  3 different fields), because cursor-order search resolves each occurrence
  to its correct field automatically. The script verified
  `staticTextLength + cutMarkerLength === goldenLength` (17320 = 17320)
  before any code was written, so the static template in `detailsPhp.js` is
  byte-exact by construction, not by eyeballing.

Hidden fields (`hidden_cerebral_scribe`/`hidden_dominant_scribe`): emitted
PHP-comment-wrapped per the resolution above, reproduced verbatim (they were
never resolver-driven to begin with).

Phase 5 (`reg_details.js`) and Phase 6 (`reg_validations.php`,
`reg_submit.php`) are done — see "Phase 5" and "Phase 6" above. All Phase
4-6 emitters have replaced their `js/generators/stubs.js` placeholders.

## Input A excel view (2026-09-04)

Raw pasted TSV is hard to eyeball — Excel-clipboard cells are quoted with
embedded literal newlines (see `js/parsing/tsv.js`), so a wall of tab text in
a `<textarea>` doesn't visually separate into rows/columns. `renderExcelView()`
in `js/ui/ui.js` renders a live spreadsheet-like `<table>` under the Input A
textarea, driven by `App.parseTSV()` — the same quote-aware parser
`parseInputA()` itself consumes, so what's shown is exactly what Phase 2
will see, not an approximation.

- Wired to the textarea's own `oninput` (`index.html`'s `#input-a`), so it
  updates as the user pastes — before they've even clicked Generate, which
  was the actual ask (checking the paste is hard to do by eye). Also called
  from `generate()` (covers `loadSample()`, which sets `.value` via JS and
  therefore never fires a real `input` event) and once on `DOMContentLoaded`
  for the empty state.
- **Ragged-row detection compares each row's cell count to the *modal* cell
  count across the paste, not to the fixed 11-column header list.** The
  first version compared against the full header count and flagged nearly
  every row in every real sample — Excel drops trailing empty columns
  *uniformly*, so BPCL's rows are all 9 cells, nitrjul26's are all 9,
  iifcljul26's are all 11, never a fixed 11 across every SOW. That's normal
  (see `js/parsing/inputA.js`'s `COLS` mapping, which already pads missing
  trailing cells with `''`), not a paste error. Comparing to the mode instead
  catches the thing actually worth flagging — one row with a different cell
  count than its siblings in the *same* paste, the real signature of an
  unquoted cell containing a stray tab or newline — without crying wolf on
  every normal paste. Verified: zero false positives across all 6 sample
  fixtures; a synthetic ragged paste (one row missing a tab) correctly flags
  exactly that row.
- Collapsible (`toggleExcelView()`) but visible by default, since the point
  is catching paste errors immediately, not saving vertical space.

## Manual value aliasing for unresolved abbreviations (2026-09-04)

`findUnresolvedAbbrevs()` (`js/core/types.js`) flags an abbreviation a SOW's
Validations prose uses but its own Other Details type list never spells out
— nitrjul26's real example: validations say "...SLD)/ASD" but the type list
only has "Autism Spectrum Disorder", no "(ASD)". Previously this only
produced a `value-name-unmatched`/`exclusion-member-unresolved` warning and
the value was silently dropped everywhere it appeared. It's now resolvable
in the UI without hand-editing every affected field individually.

**Why one assignment reaches every field:** `resolveEnablement()`,
`extractShouldBeConstraint()`, and `parseExclusions()` all scan validation
text through the *same* `typeIndex` object, built once per `resolveAll()`
call by `buildTypeIndex()`. `buildTypeIndex(types, aliases)` now layers a
second argument — `{rawAbbrevText: code}`, from `S.manualAliases` — on top of
the types parsed from Input B, folding each alias into the same `byKey`/
`allKeys` structure `scanTypeNames()` searches. So assigning "ASD" once
propagates into whichever fields' conditions mention it (scribe, compensatory
time, exclusion clusters, anywhere) on the very next `regenerate()` — no
per-field patching, because there's only one index and every consumer shares
it.

**UI**: `renderValueAliasPanel()` in `js/ui/ui.js`, a panel between the
warnings box and the resolved-conditions panel (`#value-alias-panel` in
`index.html`, hidden when empty). It lists every abbreviation currently
appearing in a `value-name-unmatched` or `exclusion-member-unresolved`
warning (deduplicated — one dropdown per abbreviation even if it recurs
across several rows, since a single assignment clears all of them at once),
each with a dropdown of known types; picking one writes `S.manualAliases[abbrev]
= code` and calls `regenerate()`. Already-assigned aliases render as
removable chips (`abbrev → type name (code) ×`) below, both to confirm what
was assigned and to allow undoing it.

**Distinct from the edit-freeze panels** (exclusion groups, resolved
conditions — see below): those override *derived output*, so they freeze
re-derivation on first edit. `manualAliases` is an INPUT to derivation, like
the Layout override select — always re-applied on every `regenerate()`,
never frozen, and reset (like everything else) only by `generate()` (new
paste or sample load). If a field's conditions were already manually edited
in the resolved-conditions panel (`S._resolvedEdited`), a later alias
assignment won't reach that field's `resolved{}` entry — same "the human's
edit wins" tradeoff the other panels already make — but exclusion groups and
any not-yet-edited field still update live.

## Set 2 detection (2026-09-04)

A second, structurally different Set 2 SOW arrived (`disability_set_1_references.txt`
sample "5.", fixture key `set2b`): 3 disability dropdowns (Type of Disability
→ Sub-Type of Disability → a nested Sub-Type of Multiple Disability
multi-select, gated on choosing "Multiple Disabilities" as the sub-type) vs.
cwcsep25's 2. Since the two known Set 2 shapes don't share a dropdown-count
signature, `detectSet2()` in `js/parsing/inputA.js` uses two independent
checks instead:

1. **Primary** — a label matching `/sub\s*-?\s*type\s+of\s+(multiple\s+)?disability/i`.
   Proven on both known Set 2 samples, zero false positives on all four Set 1 samples.
2. **Corroborating** — the disability-type-equivalent field's Values cell
   names its categories inline (`"HI, VI, LD, ID/MD"`, `"OH, HH, VH"`) instead
   of deferring to Other Details (`"Refer other details"`, Set 1's phrasing).
   Exists for a future SOW that might not use "sub-type" wording at all.

On top of both, `index.html` has an explicit **Layout override** selector
(Auto-detect / Force Set 1 / Force Set 2) — the user's own suggestion,
because prose-based detection can't be made airtight against every future
SOW's wording, and this is cheaper than chasing one more edge case per
surprise. Forcing Set 1 suppresses the `set2-layout` warning outright
(informed choice, nothing to double-check); forcing Set 2 on a paste
auto-detection didn't flag raises a distinct `set2-forced` warning instead
(going against the tool's own read is worth flagging back). Threaded through
`parseInputA(raw, layoutOverride)`; `js/ui/ui.js` reads the selector on every
Generate and resets it to Auto-detect whenever a new sample loads.

**SUPERSEDED 2026-09-11** — see "Set 2 implemented end-to-end" at the top of
this file. Set 2 is no longer deferred: detection now chooses which dictionary
to claim against and which emitters run, and all eleven files generate. The
`set2-layout` warning is still raised (it is informational, telling the
developer how the paste was read) but no longer says the output is incomplete.
The `set2-inputb-unreliable` warning this section described is gone —
`inputB.js` now recognises Set 2's own "Type of Disability" / "Sub-Type of
Disability" header pair, which it genuinely did not before.

## Generalization pass (2026-09-03)

The parsers/resolver were originally built against one SOW (BPCL) and did not
survive contact with four more real SOWs the user supplied
(`disability_set_1_references.txt`, `references/set 1/*.xlsx`). Root cause:
**Sl No is not a stable identifier** — it varies per SOW (whole numbers,
decimals, even a duplicated "4.2" within one SOW) — and **validation prose
phrasing varies far more than the single BPCL sample suggested**. Point-
reference resolution itself was already fine (it's scoped to each paste's own
Sl No map), but everything else needed generalizing:

- **Excel-quoted multi-line cells** — three of the four new SOWs have
  Validations cells wrapped in `"..."` with embedded `""` and real newlines
  (standard Excel clipboard format). The old line-then-tab split would have
  shredded them. Fixed by `js/parsing/tsv.js`, a proper quote-aware TSV
  parser used by both Input A and Input B now.
- **Bilingual labels** (csmcnov25 appends `/ अपंगत्वाचा प्रवर्ग :` etc. to every
  label) — `normLabel()` now cuts at the first `" / "` before matching.
  Deliberately NOT applied to `normName()` (type names), because a `/` there
  separates disability names, not a translation — conflating the two broke
  BPCL's own exclusion cluster.
- **Same field, different wording between SOWs** — the dictionary
  (`js/core/dictionary.js`) is now two-tier: exact normalized-label match
  first, then a keyword signature (`{all:[...], none:[...]}`) per entry. This
  is what lets nitrjul26's "...wish to avail the services of Scribe ?" match
  `scribe1` even though BPCL's own `scribe1` row reads "Do you intend to use
  the services of a scribe ?".
- **Value names joined by whatever separator, in the same sentence** —
  `"B /LV OR Mental Illness (MI)/ Specific Learning Disability (SLD) or ASD"`
  mixes slash, "OR", and comma. Splitting on delimiters cannot survive this.
  `js/core/types.js` replaces delimiter-splitting with `scanTypeNames()`:
  search the text directly for known type names (full name, bare name, or
  parenthesized abbreviation), longest match first, non-overlapping. This
  also fixed a real bug: the exclusion parser used to split only on `/` and
  `&`, so iifcljul26's comma-separated cluster
  `"One Arm (OA), One Leg (OL), Both Legs(BL), One Arm and One Leg (OAL)"`
  silently collapsed to one member instead of four.
- **A named value can be genuinely unresolvable** — nitrjul26's own type list
  never defines an "(ASD)" abbreviation for Autism Spectrum Disorder, yet its
  validations say "...SLD)/ASD". `findUnresolvedAbbrevs()` in `types.js`
  surfaces this as a warning (chunk-scoped, so an abbreviation glossing a name
  that DID resolve — "OA (One Arm)" — never false-positives).
- **A dropdown is "selected", not `== 'Y'`** — iifcljul26's Type of Disability
  row is gated on "Disability category selected in previous point", which
  must become a non-empty check, not a Y/N one. `resolver.js`'s
  `makeCondition()` is now control-aware (`op: 'selected'` for
  select/select+multiselect fields).
- **Set 2 detected, not silently mangled** — cwcsep25 has a Sub-Type of
  Disability field and Other-Details columns headed `Category`/`Sub-Category`
  instead of `Disability Category`/`Type of Disability`. `parseInputA()`
  detects this (`isSet2`) and raises a `set2-layout` warning rather than
  emitting garbage. **Set 2 is implemented as of 2026-09-11** (see the top of
  this file); `cwc` itself still has no reference code, so it remains a
  "detected, generates without crashing" fixture rather than a verified one.

**Multi-sample fixtures**: `js/core/fixtures.js` now holds
`FIXTURES.samples[]` — bpcl (the one with reference output, though the
transcription of it has since been deleted), iifcl, nitr, csmc (Set 1,
no reference code — acceptance is "no crash, no unmatched labels, correct
warnings" per `test/run_multi.js`), and cwc (Set 2, included only to verify
detection). The browser's sample picker and `test/report.js <key>` both read
from this list.

## Purpose

Browser-only tool (no build step, no server, no upload — runs from `file://`)
that turns two clipboard pastes from a SOW Excel workbook into paste-in PHP/JS
snippets for a registration application's disability section. The section is
structurally identical across projects; only the disability values, their
category mapping, and the conditional enable/disable logic change per SOW.
Full spec: [PRD.md](PRD.md). Ground truth for all five output files and the
real BPCL sample pastes lives at
`C:\Work\Tools\disability_automation\disability_automation NF.txt` (not in
this repo) — see "Ground truth" below for exact line ranges.

## Architecture

Modular `js/` split mirroring `C:\Work\Tools\eligibility_code_generator`
(chosen over PRD §Phase-0's literal "single file" so the resolver is
Node-testable, not just browser-testable): ES5 IIFE modules on a shared
`window.App` namespace, loaded in dependency order by `index.html`. No DOM
access outside `js/ui/ui.js` and `js/main.js` — this is what lets
`test/harness.js` load every other module into a Node `vm` sandbox with a
fake `window` and no DOM. See [TREE.md](TREE.md) for the file-by-file map.

## The standardized name dictionary (PRD §4)

Fixed lookup in `js/core/dictionary.js`. Never derived from the paste.
Matching is two-tier, because the same logical field is worded differently
across real SOWs (see "Generalization pass" above):

1. exact match on the normalized label (`normLabel()` in `state.js`:
   lowercase, whitespace-collapsed, bilingual `" / <translation>"` suffix cut,
   trailing `?:*.,-` stripped), then
2. a keyword signature per entry — `sig: {all:[...], none:[...]}` tested
   against the same normalized label.

`DICT.makeLabelClaimer()` still hands out one entry per call in declaration
order, so repeated labels/signatures (three "If Yes... compensatory time"
rows) map to `compensatory` → `compensatory1` → `compensatory2` by position
in the paste — this is why `ENTRIES` order in dictionary.js is load-bearing.

| SOW row | POST name | LANG key | Note |
|---|---|---|---|
| 3 | `optdisability` | `reg_optdisability` | root Y/N toggle |
| 4 | `disability_category` | `reg_disability_category` | |
| 5 | `disability_type` + `disability_multiple[]` | `reg_disability_type` | popup + exclusions live here |
| 6 | — | `reg_desc2` | note row, matched by `note:` prefix, not the dictionary |
| 7 | `compans_time` | `reg_compans_time` | |
| 8 | `disabilitysuffersoc` | `reg_disabilitysuffersoc` | |
| 9 | `compensatory` | `reg_compensatory` | 1st of two identical labels |
| 10 | `compensatary_time` | `reg_compensatary_time` | **dominant-hand row — name doesn't describe the field** |
| 11 | `compensatory1` | `reg_compensatory` | 2nd of two identical labels |
| 12 | `optscribe` | `reg_optscribe` | 1st of two identical labels |
| 12.1 | `optdisability_40less` | `reg_optdisability_40less` | constant block (optdisability=='N' subtree) |
| 12.2 | `compensatory2` | `reg_compensatory` | constant block |
| 12.3 | `scribe1` | `reg_optscribe1` | constant block, 2nd occurrence of row-12's label |
| 12.4 | `disability_certify` | `reg_disability_certify` | constant block, checkbox |
| 17-22 | `scribe_name`, `scribe_id_proof`, `card_no_scribe`, `eligible_for_scribe`, `undertake_to_produce_udid`, `edu_qual_for_scribe` | `reg_scribe_*` | constant block |

Two disambiguation traps (both confirmed against the reference code):
**row 10's variable is `compensatary_time`**, not a name describing the
dominant-hand question — don't "fix" it. **Rows 9/11 and rows 12/12.3 share
label text** — disambiguated purely by document order via
`DICT.makeLabelClaimer()`, which hands out dictionary entries for a repeated
label in declaration order as the parser encounters each paste row.

Rows 12.1-12.4 and 17-22 are recognized (so Phase 2 doesn't raise a false
"unmatched label" warning) but flagged `constant: true` and **never fed to
the resolver** — PRD §5 says they're emitted verbatim from a stored template
regardless of what's in the paste.

## The resolver — five modes

`js/resolve/resolver.js`. PRD §6 defines three; real SOW text needed two more
(found first in BPCL, confirmed general against four more SOWs). Conditions
are `{field,op:'==',value}`, `{field,op:'selected'}` (dropdown/multiselect —
"selected" means non-empty, never `=='Y'`; see the generalization note above),
or `{field,op:'in',codes:[...]}`, combined with `{op:'or',conditions:[...]}`
for multiple independent enabling conditions. **No emitter parses prose
directly** — everything downstream consumes `resolveAll()`'s output.

1. **Point number** — `point no 3`, `pt.10`, `point no.- 4.1` (dash form),
   scoped to the pasted block only via `fieldsBySlNo` (Sl Nos recur
   document-wide for unrelated questions later in the sheet, and even
   *within* one paste — nitrjul26 reuses "4.2" for two different rows).
2. **Value name** — found via `scanTypeNames()` (core/types.js), which
   searches text directly for known type names/abbreviations rather than
   splitting on a delimiter. This is deliberate: real SOWs mix `/`, `&`,
   `,` and `or`/`OR` as separators in the same sentence
   (`"B /LV OR Mental Illness (MI)/ Specific Learning Disability (SLD) or ASD"`),
   so no single split pattern survives across SOWs.
3. **Quoted popup text** — longest quoted span in the Type-of-Disability
   row's cell (`extractPopupText()`), straight or typographic quotes,
   verbatim, no fallback default.
4. **Quoted-label reference** — `selected yes for "<label>"`, and its
   reversed-word-order cousin `"YES is selected for point "<label>""`
   (nitrjul26). Matched via the dictionary directly, then
   `DICT.LABEL_ALIASES` for paraphrases the dictionary's own label never says
   (BPCL rows 8/10 quote `"Are you a Person with Disability"`, a synonym for
   the real label).
5. **Previous-point reference** — `previous point selected 'Yes'` resolves to
   whichever field immediately precedes it in document order
   (`findPreviousField()`).

**Condition boundaries** (`splitClauses()`) are found independently of value
names — on a comma/semicolon, or where `"selected yes/no"` begins a new
clause — never on `/`, `&`, or bare `or`, since those separate names, not
conditions.

**The one mistake this all guards against:** a value name and a point
reference sharing a clause, where the name is a **gloss** for the point, not
a selectable value — `selected YES in Cerebral palsy in pt 8` means "point 8
== Y", not "type includes Cerebral Palsy" (the reference's `$scribeTypes` has
no `'15'`). `resolveEnablement()` handles this per clause: a clause with a
point-ref **and** a yes/no cue emits `field==Y/N` and discards any names in
*that* clause as glosses; a clause with names and **no** point-ref (or a
point-ref with no yes/no cue) treats the names as real values. Verified
across BPCL, nitrjul26 and csmcnov25 (`test/run_multi.js`) — the equivalent
row always resolves to a clean `disability_type in [...]` with no
contaminating code from a same-clause gloss.

A field can additionally carry a **constraint** distinct from `enabledWhen`,
found by `extractShouldBeConstraint()` scanning the whole cell (not just
enablement sentences, since these carry no "enabled"/"mandatory" cue of their
own): BPCL's quoted `Should be YES if "Cerebral palsy" is selected in 5` and
nitrjul26's unquoted `This point should be Yes if selected cerebral palsy in
point no.- 4.1` both become
`{whenField:'disability_type', op:'includes', code:'15'|'10', shouldBe:'Y'}` —
a value constraint on a *different* field than the one being enabled.

## Exclusion groups (PRD §8)

Members are found with the same `scanTypeNames()` used by the resolver, not
by splitting on `/` and `&` — real clusters use commas too (iifcljul26:
`"One Arm (OA), One Leg (OL), Both Legs(BL), One Arm and One Leg (OAL)"`; the
old delimiter-split silently kept only the first member here).

`js/resolve/exclusions.js`, `parseExclusions()`. Group count is dynamic — not
fixed at three — so parsing feeds an editable chip review panel rather than
emitting directly. One correction beyond PRD §8's literal algorithm: when
splitting the pre-phrase segment on `*`, the text **before the first `*`** is
descriptive preamble ("In case of category -E candidate has to select more
than 1 values in Type of disability but"), not a cluster candidate — only
content after an asterisk is a cluster. Verified against BPCL: exactly three
groups, `['05'..'11']`, `['01','02']`, `['03','04']`, all members resolved
including `BL (Both Legs)` → `Both Leg` via the trailing-s retry.

**Message default (revised 2026-09-08 — see "Exclusion group message casing
bug" below)**: the exclusion message defaults to the matched codes' own
Input B names (exact spelling/casing as pasted), joined `" & "` in the order
found — **not** the raw SOW cluster text. The raw-prose default this replaced
looked plausible against BPCL (2 of 3 messages happened to byte-match) but
was wrong in principle: prose casing can disagree with Input B's own casing
(iifcljul26: prose says "low vision", Input B says "Low Vision"), and BPCL's
own group-1 message had the identical latent bug (prose "One leg" vs Input
B's "One Leg"). Still fully editable in the review panel per PRD §8. Combined
with PRD §8's own `$exclgrp*`/`$exclcnt*` renaming (dynamic group count means
`$arr1..3`/`$count1..3` can't be reused) and BPCL's own group-3 hand-reorder
("Deaf & Hard of Hearing" vs. our order-of-first-appearance "Hard of Hearing
& Deaf"), `js/core/diff.js` normalized all of this before diffing against the
reference goldens. (That file and the diff runner are gone — see the top of
this file; the normalizations are recorded here because they document which
divergences from the reference were deliberate.)

## Current phase status

**All phases 0-7 complete for BOTH layouts.** Set 1 is generalized across 4
real SOWs; **Set 2 landed 2026-09-11** against `uiicljul26`, the one Set 2 SOW
with reference code — see "Set 2 implemented end-to-end" at the top of this
file for the design, the divergences and the residual scope. See "Phase 4",
"Phase 5" and "Phase 6" below for Set 1's own emitters. The five PRD-original
output files each byte-matched the BPCL reference when they landed, under the
golden harness that has since been removed (see the top of this file).
**Phase 7 (four more output tabs — `reg_qry_arrays.php`,
`reg_details_lang.php`, `disability_queries`, `print.php`) is also complete**,
see the "Phase 7" section above; what remains open is further hardening.

- Phase 0 (scaffold + golden fixture): done. `index.html` + `css/styles.css`
  + full `js/` module tree; tab strip includes the four PRD §3 deferred tabs
  as visibly disabled placeholders; copy button uses the offscreen-textarea +
  `execCommand('copy')` pattern (no `navigator.clipboard`, unreliable from
  `file://`); a sample picker (5 real SOWs) was wired from the start rather
  than deferred to Phase 7. It also shipped a live golden-diff view (BPCL
  only — the only sample with reference code); **that view is gone**, removed
  with the rest of the golden harness.
- Phase 1 (Input B parser): done, `js/parsing/inputB.js`, header-driven column
  detection (falls back to a structural sparse/dense heuristic). `test/run_inputB.js`
  — reproduces the reference `config.php` arrays exactly.
- Phase 2 (Input A parser): done, `js/parsing/inputA.js`, on top of the
  quote-aware `js/parsing/tsv.js`. `test/run_inputA.js` — ten field objects
  for rows 3-12 with both disambiguation traps correct; zero unmatched-label
  warnings across all 20 pasted rows (3-22).
- Phase 3 (resolver + exclusions + popup text): done, `js/resolve/` +
  `js/core/types.js`. `test/run_resolver.js` + `test/run_exclusions.js` —
  zero warnings against BPCL, all PRD §Phase-3 acceptance targets match
  exactly. Popup text matches the reference `alert()` argument
  character-for-character; chip edits propagate live to the (stub) generated
  snippet.
- **Generalization** (see top of this file): done, `test/run_multi.js` (24
  assertions) — zero unmatched labels and zero-or-explained warnings across
  bpcl/iifcljul26/nitrjul26/csmcnov25; cwcsep25 (Set 2) correctly detected and
  flagged rather than mangled. 83 assertions total across the full suite.
- Phase 4 (emitters: `config.php`, `reg_details.php`): **done** —
  `js/generators/config.js` + `js/generators/detailsPhp.js`, both byte-matched
  the reference when they landed; verified not to crash across all 6 fixtures.
  Covered now by `test/run_generators.js`. See "Phase 4" above for the design.
- Phase 5 (emitter: `reg_details.js`): **done** — `js/generators/detailsJs.js`,
  byte-matched the reference when it landed; verified not to crash across
  bpcl/iifcl/nitr/csmc. See "Phase 5" above for the design.
- Phase 6 (emitters: `reg_validations.php`, `reg_submit.php`): **done** —
  `js/generators/validationsPhp.js` + `js/generators/submitPhp.js`, both
  byte-matched the reference when they landed (two documented reference-only
  divergences normalized away, same tier as the pre-existing
  `$arr*`→`$exclgrp*` renaming); verified not to crash across
  bpcl/iifcl/nitr/csmc. See "Phase 6" above for the design, especially the
  dynamic exclusion-group codegen.
- Phase 7 (hardening): not started. The golden fixture and diff view it would
  have leaned on were deliberately removed in 2026-09-09 and are not coming
  back — see the top of this file; `test/run_generators.js` covers that ground
  structurally instead.

**Resolved-conditions review panel (2026-09-04):** done, per the
2026-09-03 discussion — the chip-style editable review no longer covers only
exclusion groups. A second panel in `index.html` ("Resolved conditions
review"), rendered by `renderResolvedPanel()` / `renderPopupTextRow()` in
`js/ui/ui.js`, makes every field's enable/disable condition(s), its optional
value constraint, and the popup `alert()` text editable before generation:

- Each `resolved{}` entry renders as a card (field label + postName + row
  number) with one row per condition (target field, operator `==`/`selected`/
  `in`, and a Y/N select or type-code chips depending on operator), an "Add
  condition (OR)" button — multiple conditions on one field are always OR'd,
  matching `resolveEnablement()`'s own merge behavior — and an optional
  value-constraint row (`whenField` / `includes` / `code`) with add/remove.
  A "Remove override" button drops the field from `resolved{}` entirely; an
  "Add override for field" select at the bottom adds a blank entry for any
  field the resolver didn't produce one for, so a fully-missed condition can
  be authored by hand, not just a wrong one corrected.
- The popup text is a single editable input, separate from the per-field
  cards since it's a single string, not a field map.
- Same edit-freezes-re-derivation contract as exclusion groups: `S._resolvedEdited`
  / `S._popupTextEdited` flip true on first edit (`markResolvedEdited()` /
  `markPopupTextEdited()`), and `regenerate()` stops overwriting `S.resolved`
  / `S.popupText` from `resolveAll()`'s fresh output once set — both reset to
  false only in `generate()` (new paste or sample load). `resolve.resolved`
  and `resolve.popupText` are then pointed at the (possibly edited) `S.`
  copies before generators run, so `js/generators/stubs.js`'s preview and the
  real Phase 4+ emitters both see edits, not the raw parse.
- Each condition's edit scratch state (`entry._condList`, the flat
  add/remove/OR-merge working array derived from `enabledWhen`) is a
  `_`-prefixed field on the resolved entry, stripped by `stubs.js`'s `pretty()`
  (a `JSON.stringify` replacer dropping `_`-prefixed keys) so it never leaks
  into the generator preview — worth remembering if a future emitter also
  does `JSON.stringify(resolved...)` directly instead of going through `GEN`.

Verified in-browser across all 6 fixtures (no crash, correct card/warning
counts) and by scripted DOM interaction: chip removal, add-condition,
constraint-code edits, remove/re-add override, and popup-text edits all
propagate into `S.generated.detailsJs` and survive subsequent `regenerate()`
calls without being clobbered.

## One thing needed from the user before Phase 4

**Rows 12.1-12.4's exact hidden-field comment behavior** — the reference
emits both `hidden_cerebral_scribe` (after row 8) and `hidden_dominant_scribe`
(after row 10) **inside a PHP block comment** (`<?php /* ?> … <?php */ ?>`),
i.e. effectively never rendered, while PRD §4 says they are "always emitted".
**Resolved 2026-09-04: match the reference exactly** (emit them
comment-wrapped, not live) — Phase 4's `reg_details.php` emitter should
follow this when it lands. Nothing else blocked Phase 4 at the time — Input B,
the 12.1-12.4 HTML block and all five reference snippets were in
`js/core/fixtures.js` / `js/core/goldens.js` (the latter has since been
deleted; Phase 4 shipped long ago, so this is history, not an open item).

## Ground truth (external, not in this repo)

`C:\Work\Tools\disability_automation\disability_automation NF.txt` — the
reference document. **`js/core/goldens.js`, which held the transcription, has
been deleted** (see the top of this file — deliberately, and not to be
rebuilt), so these line ranges are now only the record of where each reference
file originally came from, not a description of anything in the repo:
Input A paste 8-27, `config.php` arrays 93-131 (excludes
`$disability_duplicate1/2/3`, explicitly out of scope per PRD §3),
`reg_details.php` 155-456, `reg_details.js` 459-867, `reg_validations.php`
871-1151, `reg_submit.php` 1155-1208. Input B and the rows 12.1-12.4 HTML
block are not in that file — both were supplied directly by the user. Input B
is still in `js/core/fixtures.js`, which survives; the reference snippets went
with `goldens.js`.

## Additional SOW samples (in this repo)

`disability_set_1_references.txt` — five real SOWs' Input A/B pastes
(iifcljul26, nitrjul26, cwcsep25, csmcnov25, and an unnamed 5th that is also
Set 2 — fixture key `set2b`), no reference PHP/JS for any of them. Extracted
into `js/core/fixtures.js` (see "Generalization pass" and "Set 2 detection"
above). The matching source workbooks for the four Set 1 samples are at
`references/set 1/*.xlsx`; `references/set 2/` is still empty, reserved for
when Set 2 reference material arrives.
