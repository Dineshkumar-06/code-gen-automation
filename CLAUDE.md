# Disability Section Code Generator

Current rules and state only. The dated write-up behind each rule — the bug,
the real SOW that exposed it, how it was verified — is in
[CHANGELOG.md](CHANGELOG.md), searchable by the names used here. Read the
entry there before reversing any rule below.

## Purpose

Browser-only tool (no build step, no server, no CDN, runs from `file://`)
that turns two clipboard pastes from a SOW Excel workbook — **Input A** (Basic
Details rows) and **Input B** (Other Details: category → type table) — into
paste-in PHP/JS/SQL for a registration application's disability section. The
section's structure is fixed across projects; only the values, the category
mapping and the enable/disable logic change per SOW. Spec: [PRD.md](PRD.md).
File map: [TREE.md](TREE.md) (update it when files are added/removed).

## Architecture

- ES5 IIFE modules on `window.App`, loaded in dependency order by
  `index.html`. **No DOM outside `js/ui/` and `js/main.js`** — that is what
  lets `test/harness.js` load everything else into a Node `vm` sandbox.
- `harness.js`'s file list and `index.html`'s `<script>` order must agree.
- **Set 2/3 emitters wrap Set 1's**: each `js/generators/*2.js` captures
  `App.GEN.x` at load time and replaces it with a layout dispatcher. **Load
  order is load-bearing** — a `2` file loaded before its Set 1 sibling
  captures `undefined`.
- Pipeline: `parseInputA(raw, layout, fieldOverrides)` + `parseInputB(raw)`
  → `resolveAll(parseA, parseB, manualAliases)` + `parseExclusions(...)` →
  `App.GEN.*(ctx)`. **No emitter parses prose**; everything downstream reads
  the resolver's output.
- New output tab = four places: `harness.js` list, `index.html` script tag,
  `ui.js` `TABS` entry (`lang`, optional `sets`), `regenerate()`.

## Layouts

Chosen explicitly by the developer (`#layout-override`, required). Nothing
is auto-detected from prose; an unknown value falls back to Set 1. Samples
prefill it via `FIXTURES.layoutFor(key)`.

| | category dropdown | type/sub-type dropdowns | multi-select opened by | reference SOW |
|---|---|---|---|---|
| **Set 1** | `disability_category` (A-E) | `disability_type` (+ `disability_multiple[]`) | category E | bpcl |
| **Set 2** | `disability_type` holds the CATEGORY | `subdistypeido` (the one routing category) + `sub_disability_type` (the rest) | `subdistypeido` | uiicljul26 (`uiicl`) |
| **Set 3** | `disability_type` holds the CATEGORY | one `sub_disability_type` for every category | `sub_disability_type` | licjamar26 (`set2b` fixture key) |

`parseInputA` returns `isSet2` and `layoutShape` (1/2/3). `core/set2.js`
derives Set 2/3's roles: `idoCategoryCode` (null in shape 3),
`multipleCode`, `multiTriggerField`, `mulOptionCodes`/`mulOptions`/`mulFlat`.
**Multi-select options** are every sub-type (grouped) unless the row's
Values cell lists them, does not call them sub-types/sub-groups, and no
exclusion rule is stated (`App.hasExclusionRule`): then exactly the listed
names, each with its own category or sub-type code, in Input B order, flat
(`multi-values-from-column`; a code clash falls back with
`multi-values-code-clash`). The same field name
means different things across layouts (Set 2's "Type of Disability" row is
the category), so the code list for a field always comes from
`App.codeListForField(postName, parseA, parseB, roles)`, never from
`parseB.types` directly.

Tabs: Set 1 ships 11 files (`ajax_getdisability_type.php`), Set 2/3 ship 12
(the two `ajax_getSubType_*` endpoints). `activeTabs()` drives the zip, the
manifest and the header count; never hardcode a count.

## Dictionary (`js/core/dictionary.js`)

A fixed lookup; field names are never derived from the paste.

- Tables: `ENTRIES1` (Set 1), `ENTRIES1_NATURE` (Set 1 where "Type of
  Disability" is the category and "Nature of Disability" the type — used
  only when some row says "Nature of Disability" and none says "Disability
  Category"), `ENTRIES2` (built FROM `ENTRIES1`, so the 19 shared fields can
  never drift apart), `ENTRIES3` (= `ENTRIES2` with the sub-type LANG key
  `reg_sub_disability_type`; Set 2 keeps `reg_sub_disability`, and each
  reference says so for its own layout).
- Matching is two-tier: exact `normLabel()` match (lowercase, whitespace
  collapsed, bilingual `" / <translation>"` suffix cut, trailing `?:*.,-`
  stripped), then a keyword signature `{all, none}`.
- `makeLabelClaimer()` hands out entries in declaration order, so repeated
  labels map by paste position: rows 9/11 → `compensatory`/`compensatory1`
  (then `compensatory2`), rows 12/12.3 → `optscribe`/`scribe1`. **`ENTRIES`
  order is load-bearing.**
- **Row 10 is `compensatary_time`** (the dominant-hand question). The name
  does not describe it and the spelling is deliberate — do not "fix" it.
- Rows 12.1-12.4 and 17-22 are recognised but `constant: true`; they are
  never resolved.
- `DB_NAME_OVERRIDES` / `dbNameFor()`: a POST name is not always the column —
  `optdisability`→`disability`, `optscribe`→`scribe`,
  `optdisability_40less`→`disability_40less`. An enumerated map, not a
  strip-"opt" rule.
- `LABEL_ALIASES`: paraphrases SOWs use when quoting a row (e.g. "Are you a
  Person with Disability").

**Row mapping** (step 2 panel): `S.fieldOverrides` (`{rowIndex: postName |
''}`) is an INPUT to parsing, applied in `claimFields()` via `reserve()`
before label claiming, so every consumer sees it. A hand-chosen field leaves
the pool; the row that would have claimed it shows as unmatched.

## Parsing

- `js/parsing/tsv.js` is quote-aware (Excel wraps multi-line cells in `"..."`
  with `""` escapes). Always parse through it; never split lines then tabs.
- Sl No is **not** a stable identifier (decimals, duplicates within one
  paste). Point references resolve only against the pasted block's own
  `fieldsBySlNo`.
- The note row is matched by its `note:` prefix; its cleaned text is
  `parseA.noteText`.
- `parseA.dropdownRows` records which row became category / type / sub-type
  / multi-select; the UI shows it as a neutral one-line note, deliberately
  not a warning.
- **Input B** column detection, in order: `detectColumnsBySubHeader()` (a
  "Sub-…" or "Nature of" column is the narrower one), then Set 1's header
  pair, then the shape fallback. On the shape fallback `guessHeaderRow()`
  skips a header-ish first row (`inputb-header-guessed`) or warns
  (`inputb-no-header`) — otherwise a header is swallowed as data and every
  code shifts by one.
- A sub-type cell is split on `,` and `;` (`splitTypeCell()`,
  `inputb-type-list-split`), **never on `/`**: `MD/ID` is a single real
  label. Prose scanning is the opposite (below), because prose is free text.
- Codes are assigned in paste order (01, 02, …) in every layout. The
  references number codes from their own application's master table; that
  is not derivable from a SOW (user's call).

## Resolver (`js/resolve/resolver.js`)

Conditions: `{field, op:'==', value}`, `{field, op:'selected'}` (dropdowns —
non-empty, never `=='Y'`), `{field, op:'in', codes}`, combined with `{op:'or',
conditions}`. Several enabling sentences on one field are OR'd.

Five reference modes: **point number** (`point no 3`, `pt. no. 16`,
`point no.- 4.1`, chains like `5.1 or 6.1` — each number must name a real
row); **value name** via `scanTypeNames()` (searches for known names,
longest first, non-overlapping; SOWs mix `/`, `&`, `,`, `or` in one
sentence, so never split on a delimiter); **quoted popup text**; **quoted
label** (`selected yes for "<label>"` — `resolveQuotedLabel()` tries this
paste's own rows first, including 12+ char prefixes, then the dictionary and
`LABEL_ALIASES`; a hit on the row being resolved is discarded); **previous
point**.

Rules that have each been broken once:

- **Gloss rule.** A clause with a point reference AND a yes/no cue emits
  `field == Y/N` and drops any names in that clause as glosses (`selected
  YES in Cerebral palsy in pt 8` is "point 8 == Y"). Names with no point
  reference, or a reference with no yes/no cue, are real values.
- Clause boundaries are commas/semicolons or a new "selected yes/no", never
  `/`, `&` or bare `or`. `healPointRefPeriods()` stops `point. No. 5` from
  splitting a sentence.
- `optdisability` (the root toggle) is never resolved — it gates, it is not
  gated.
- **Constraint** (`extractShouldBeConstraint()`), scanned across the whole
  cell: `should be` / `must be` / `mandatorily` Yes if <value> in <point>.
  Value and reference are read only AFTER the phrase; the earliest reference
  naming a real row wins. Applies to any field (`disabilitysuffersoc` and
  `compensatary_time` both emit it).
- **"Disable for X"** (`extractDisabledForCodes()`, own pass over the whole
  cell): removes codes from an existing `in`; turns a plain gate into the
  complement `in` over that dropdown's own list (`disable-for-applied`);
  an OR of other facts is left alone with `disable-for-unresolved`.
- **Popup**: `findPopupSpan()` takes the LONGEST quoted span at or after the
  lead-in (a quoted category can precede the message); an unclosed quote
  takes the rest of the cell (`popup-unterminated`). If the type row has no
  lead-in and the category row does, the category row is used. Set 2/3 also
  have per-field popups (`extractFieldPopups()`) — **owned by the point the
  sentence names, not the row it is written on** — and `popupCategories`,
  scanned from the lead-in up to where the message starts.
- **Set 2/3 value routing** (`set2ValueConditions()`): category and
  sub-type names are scanned together (`ctx.valueIndex`, codes `c:`/`t:`),
  and each named value gates on **every dropdown that offers it**, point
  reference or not — **but only dropdowns that come before the row** (one
  named by point reference is always eligible). Row 10's "for HI,VI,OC/LD"
  is not gated by the row-11 multi-select offering the same names. Chained
  references accept `&` and a repeated "point no" (`point no 9 & Point no
  11`).
- **No guessing.** Undefined initialisms and typos (`Cerebral Pasy`) raise
  `value-name-unmatched` / `exclusion-member-unresolved` with `abbrev` and
  are assigned by the developer in the value-alias panel
  (`S.manualAliases`, folded into the one shared `typeIndex`). Never
  fuzzy-match. Name tolerance stops at trailing `-s` and `-ness`.

## Exclusion groups (`js/resolve/exclusions.js`)

Group count is dynamic. Two cluster formats: "should not select together"
split on `*` (text before the first `*` is preamble), and numbered "only one
disability from (…)" lines (the `from` is required). A numbered list beats
prose describing the same rule; a parent category named in a cluster is the
grouping, not a member. `findUnresolvedAbbrevs()` runs before the
under-2-members discard, so an unresolved cluster's names still reach the
alias panel. Default message = matched codes' Input B names joined `" & "`
(never the raw prose casing). Zero groups emits no cascade.
`App.exclusionSourceField(parseA)` is the single answer to which row states
the rule.

## Emitters — rules

- **Gate on presence, at field level.** Every block and every cross-field
  reference is gated on `has(postName)` against `ctx.parseA.fields`. A
  dictionary "group" (12.1-12.4, 17-22) is only a label; its rows do not
  travel together. Wrappers open only if at least one inner field exists.
- Set 1's hidden mirrors (`hidden_cerebral_scribe`,
  `hidden_dominant_scribe`) are emitted inside a PHP block comment, as its
  reference does; Set 3's (plus `hidden_benchmarkdisability`) are live,
  because its reference and its JS use them.
- `reg_details.php`: `$disabilitymulti = explode(...)` is hoisted to the top.
  `disabled` tests are the negated resolved condition, plus fixed structural
  guards prose cannot express (type dropdowns need a category; Set 2's
  `sub_disability_type` is disabled for the routing category).
- `reg_details.js`: `.optdisability`'s Y branch enables what the root toggle
  alone enables (`rootYFields()`), excluding dropdowns their parent populates.
  The multi-select opener hangs off `roles.multiTriggerField`.
  `getSub_TypeMuldisability()` builds `<optgroup>`s from Input B (flat when
  `roles.mulFlat`). The scribe handlers read every dropdown its condition
  names, the category included (`dsCat`). A `#sub_disability_type` change
  only unchecks the cerebral/dominant pair and disables its follow-ups (the
  uiicl reference's form) — never disables the pair.
- `reg_validations.php`: exclusion counters are `$exclgrpN`/`$exclcntN` for N
  groups (first/middle/last templates copied from BPCL's reference).
  `withRoot()` does not AND the root test onto a guard that already is it.
- `disability_queries`: `PREEXISTING_COLUMNS` (11 base-table columns) get no
  `ALTER`, listed in a leading comment; `VARCHAR(N)` uses the row's own Max
  Length (fallback 50).
- `reg_details_lang.php` dedupes by LANG key; `disability_queries` does not
  (`compensatory*` share a key but are three columns).
- `functions.php`: Set 1 gets `fnSelectArrayMultiHash`, Set 2/3 get a
  generated `PrintArrSub_disDetails()` (optgroups from Input B, flat when
  `roles.mulFlat`), or a stub comment when there is no multi-select.
- **Not emitted, by design:** markup/validation for the 40less block
  (18.11-18.14 in Indian Bank) and `compensatory`/`compensatory1`
  validation — the host application's base code already has them.

## Deliberate divergences from the references

Not regressions. Each was confirmed with the user; see CHANGELOG.md.

1. Codes follow paste order, not the reference application's master table.
2. Set 2/3 exclusion validation reuses Set 1's `$exclgrpN` counters, not
   the reference's per-group `array_diff < N` form.
3. The redundant inner `$row_reg['disability'] == 'Y'` conjuncts are not
   reproduced (`reg_submit.php` NULLs dependents anyway).
4. `enabled`/`disabled` if/else markup → plain `if (not enabled) disabled`.
5. Duplicate `#sub_disability_multiple` handlers merged into one.
6. `$arr_MulsubDisability_map_Edit` keys are this paste's own codes; shape 3
   emits only the Multiple Disabilities key.
7. Set 3's self-inclusion of the Multiple Disabilities code in its own
   multi-select list is not reproduced, and validation rejects that code.
8. No `AFTER <column>` clauses; per-row Max Length instead of `VARCHAR(50)`.
9. Exclusion messages use Input B's spelling, not the prose's.

## UI contracts (`js/ui/`)

- Three steps: 1 pastes + layout + Excel view; 2 warnings, Row mapping,
  value aliases, resolved-conditions / popup / exclusion panels, Excel view
  (collapsed), live preview; 3 stats, zip, per-file cards. `nav.js` owns
  steps, theme and icons.
- Step 1's single forward button re-parses only if the pastes or layout
  changed since the last parse; otherwise it just navigates (so step-2 edits
  survive a round trip). A zero-field parse says so.
- The stepper only goes back: a step needs `unlocked` AND `visited`.
- **Edit-freeze**: the resolved-conditions, popup and exclusion panels
  override DERIVED output; first edit sets `_resolvedEdited` /
  `_popupTextEdited` / `_exclusionGroupsEdited` and `regenerate()` stops
  re-deriving them. `manualAliases` and `fieldOverrides` are INPUTS, re-applied
  on every re-read. Everything resets on a new paste / sample / layout
  (`resetState()`). Changing Row mapping re-reads the paste and drops
  step-2 edits (they are keyed by field).
- `_`-prefixed keys on resolved entries are UI scratch; strip them in any
  `JSON.stringify` of `resolved`.
- Generated code goes in via `textContent` (`setCode()`), never `innerHTML`.
  `reg_details.php`/`print.php` highlight as `php-template`. highlight.js is
  vendored; no network dependencies.
- Colours only through the theme tokens in `css/styles.css`. Every generated
  `<select>` gets a `name` + `aria-label` (`nameControl()`).
- Nothing is persisted except the theme; a `beforeunload` guard arms once
  anything is parsed.

## Testing

`test/run_*.js`, each standalone (`node test/run_resolver.js`); all at once:

```
for f in test/run_*.js; do echo "--- $f"; node "$f" | tail -1; done
```

20 files, 882 assertions. `node test/report.js <key>` dumps resolver output
for eyeballing. Fixtures live in `js/core/fixtures.js`
(`bpcl iifcl nitr csmc nature` Set 1, `uiicl indian` Set 2, `set2b cwc`
Set 3). `indian` is checked against the user's hand-coded JS/validation
(`run_indian.js`).

- `run_php_lint.js` runs `php -l` on every generated PHP file for every
  fixture (fragments get `<?php` prepended, with a negative control). PHP
  from `$PHP_BIN`, PATH, or `C:/xampp/php/php.exe`; SKIPs if none found.
- Generated `reg_details.js` is parsed with `new Function()` in the
  generator tests.
- Tests assert on warning `code`, never `msg` — messages can be reworded.
- **Do not rebuild the golden byte-diff harness** (removed 2026-09-09: SOWs
  vary too much for byte-exact expectations) **or the in-browser simulator**
  (removed 2026-09-25: a second implementation that could only approximate
  the host framework). References are checked structurally
  (`run_set2_generators.js`, `run_set3_generators.js`).
- UI changes are verified in Chrome from `file://`, with zero app console
  errors.

## Known open gaps

- Set 3 is verified against one SOW only; Set 2 against uiicl (reference
  code) and Indian Bank (the user's hand-coded files). Add the next real one
  as a fixture.
- `cwc` has three unmodelled rows (a CWC-provided-scribe question, a
  scribe-qualification textbox) that stay unmatched.
- The alias panel maps to types only, not categories.
- Untested on real input: the `or` branch of the `disabled` compiler, and
  "disable for" case 3.
- Remaining ungated references in `reg_details.js`: `.optdisability_40less`'s
  inner references and the ds1/ds2 reads (harmless no-ops).
- `.depdisability`/`.depdisabilitytype` are verbatim carryover with no
  dictionary entry.
- No save/restore of a session.

## Reference material

- `C:\Work\Tools\disability_automation\disability_automation NF.txt` (not
  in repo): BPCL's Set 1 reference for the five original files.
- `references/set 2 references.txt` (on disk, not committed): uiicljul26.
- `set 3 code reference.md`: licjamar26 (= fixture `set2b`).
- `disability_set_1_references.txt`: five more SOWs' pastes, no reference
  code. Source workbooks under `references/set 1/`, `references/set 2/`.
