# PRD — Disability Section Code Generator

**Owner:** KARUPPASAMY
**Target location:** `C:\Work\Tools\disability_code_generator`
**Pattern:** same as `eligibility_code_generator` — single-file browser tool, no build step, no server, no file uploads.

---

## 1. Purpose

A developer building a registration application must hand-write the disability
section across five PHP/JS files. The section is structurally identical every
time; only the *values* (disability categories, disability types, their mapping)
and the *conditional logic* (which field enables which) change per SOW.

This tool takes two clipboard pastes from the SOW workbook and emits ready-to-paste
code snippets for each target file.

**Non-goal:** this tool does not read `.xlsx` files. There is no upload. Everything
arrives as tab-separated text in a textarea.

---

## 2. Inputs

The UI has exactly two textareas.

### Input A — "Basic Details rows"

The developer selects the disability rows from the SOW `Basic Details` sheet and
pastes them. Tab-separated, one row per line. Column order:

```
Sl No. | Label Name | Type | Max Length | Mandatory ? | Input Method | Values | Default Value | Validations | Help Text | Addl Remarks
```

Trailing columns are often absent. The parser must tolerate rows with 5–11 columns.

Rows in scope: **3, 4, 5, 6 (note), 7, 8, 9, 10, 11, 12**.
Rows 12.1–12.4 and 17–22 may be present in the paste; see §5.

### Input B — "Other Details values"

The developer selects the Disability Category and Type of Disability columns from
the SOW `Other Details` sheet and pastes them. Two significant columns:

```
Disability Category | Type of Disability
```

The category letter appears **only on the row where its first type begins**;
subsequent rows in that group have a blank category cell. This blank-cell shape
*is* the grouping and must be preserved by the parser.

Example of what arrives:

```
A	Blindness
	low vision
B	Deaf
	Hard of Hearing
C	One Arm
	One Leg
```

The paste may contain extra leading/trailing columns (Post Name, GST tables). The
parser must locate the two relevant columns rather than assume fixed indices — see
Phase 1.

---

## 3. Output

A tabbed output panel, one tab per target file, each with a copy-to-clipboard
button. Snippets only — not whole files.

**In scope now:**

| Tab | Contents |
|---|---|
| `config.php` | `$arrDiscategory`, `$arrDisabilityType2`, `$arrpostCategoryDisability_mapping` |
| `reg_details.php` | HTML block for the disability section |
| `reg_details.js` | jQuery handlers for all conditional behaviour |
| `reg_validations.php` | `$mandatory_flds`, `$arr_flds`, `$validate_flds_value`, `$errmsgarr`, multi-select count checks |
| `reg_submit.php` | `getVal()` assignment chain |

**Deferred to a later update** (references not yet supplied): `reg_qry_arrays.php`,
`print.php`, `disability_queries`, `reg_details_lang.php`.

Build the tab strip so these four can be added without restructuring.

**Explicitly excluded:** validation arrays in `config.php`, and the
`$disability_duplicate1/2/3` arrays. Do not emit them.

---

## 4. The standardized name dictionary

Field variable names are **not** derived and **not** entered by the developer.
They are a fixed lookup, keyed by normalized label text.

Normalization for matching: lowercase, collapse runs of whitespace to one space,
strip trailing `?`, `:`, `*` and surrounding spaces.

| SOW row | Normalized label (match key) | POST name | LANG key | Control |
|---|---|---|---|---|
| 3 | `are you a person with benchmark disability of 40% and above` | `optdisability` | `reg_optdisability` | radio Y/N |
| 4 | `disability category` | `disability_category` | `reg_disability_category` | select |
| 5 | `type of disability` | `disability_type` + `disability_multiple[]` | `reg_disability_type` | select + multi-select |
| 6 | starts with `note:` | — | `reg_desc2` | note text |
| 7 | `do you need compensatory time at the time of examination` | `compans_time` | `reg_compans_time` | radio Y/N |
| 8 | `are you suffering from cerebral palsy and your writing speed is affected` | `disabilitysuffersoc` | `reg_disabilitysuffersoc` | radio Y/N |
| 9 | `if yes, do you need compensatory time at the time of examination` (1st occurrence) | `compensatory` | `reg_compensatory` | radio Y/N |
| 10 | `whether your dominant (writing) hand is affected` | `compensatary_time` | `reg_compensatary_time` | radio Y/N |
| 11 | `if yes, do you need compensatory time at the time of examination` (2nd occurrence) | `compensatory1` | `reg_compensatory` | radio Y/N |
| 12 | `do you intend to use the services of a scribe` (1st occurrence) | `optscribe` | `reg_optscribe` | radio Y/N |

Two traps, both confirmed against the reference code and both easy to get wrong:

- **Row 10 is the dominant-hand question, but its variable is named
  `compensatary_time`.** The name does not describe the field. Do not try to
  infer it.
- **Rows 9 and 11 have identical label text.** Disambiguate by document order:
  the occurrence following row 8 is `compensatory`, the occurrence following
  row 10 is `compensatory1`. Same for row 12 vs 12.3, which also share text.

Two hidden fields also belong to the block and are always emitted:
`hidden_cerebral_scribe` (after row 8) and `hidden_dominant_scribe` (after row 10).

---

## 5. Constant blocks

Rows 12.1–12.4 (the `optdisability == 'N'` subtree) and rows 17–22 (scribe
name/ID/undertakings) are **standardized and identical in every project**. They are
not generated from the paste. Emit them verbatim from a stored template, appended
to the relevant tabs, so the developer gets one complete block to paste.

If those rows are absent from Input A, still emit the constant blocks. If present,
still emit the constant blocks — do not attempt to generate from them.

---

## 6. The resolver

This is the part that turns SOW prose into code, and the reason the tool is
possible at all.

The `Validations` column refers to other things in two ways:

**By point number** — "if selected yes for point no 3", "In point no. 5",
"selected YES in Cerebral palsy in pt 8". Resolve the integer to the row with
that Sl No. *within the pasted disability block only*, then to its POST name via
the dictionary. Scoping matters: Sl No. 17–22 are reused later in the sheet for
Religion and Mother Tongue, so a document-wide lookup would resolve wrongly.

Accept these surface forms: `point no 3`, `point no. 3`, `pt 8`, `pt.10`,
`point number 5`, `In point no 12`.

**By disability value name** — "if selected Autism Spectrum Disorder or specific
learning disability or Mental Illness or Intellectual Disability In point no. 5".
Normalize each candidate name and look it up in the type table built from Input B,
producing `'17','18','19','20'`.

Name matching must be case-insensitive and whitespace-collapsed. The source
documents are inconsistent: `One leg` vs `One Leg`, `Both Leg` vs `Both Legs`,
`specific learning disability` vs `Specific Learning Disability`. Match on the
normalized form. If a name in the validation text has no match in the type table,
do not silently drop it — surface it in the warnings panel.

**By quoted popup text** — row 5's validations contain the literal alert message
in quotes, introduced by a phrase like "A popup message should be displayed to
candidates". Extract the quoted span and use it verbatim as the `alert()` argument.
Do not hardcode the message.

Extraction rules:

- Look for a quoted span anywhere in the cell. Accept straight double quotes and
  typographic quotes (`"` `"` `"`), since Excel autocorrect produces either.
- Take the longest quoted span if more than one is present.
- The message itself contains single quotes (`'Yes'`), so emit it inside a
  double-quoted JS string. Escape any embedded double quotes and backslashes.
- Strip leading/trailing whitespace but preserve internal punctuation and casing
  exactly — this text is candidate-facing and may be legally reviewed.
- If no quoted span is found, emit no `alert()` call and raise a warning. Do not
  fall back to a stored default; a stale message is worse than none.

The same extracted string is used at both alert sites (the single-select handler
and the multi-select handler).

**Fixed text stays fixed.** Nothing else in the block is candidate-facing prose
except row 6's note, which goes to `reg_desc2`.



```js
{
  postName: 'compans_time',
  enabledWhen: {
    field: 'disability_type',
    op: 'in',
    codes: ['17','18','19','20']
  },
  mandatory: 'conditional'
}
```

All emitters consume this structure. No emitter parses prose directly.

---

## 7. Warnings panel

The tool never fails silently. Show a warnings list above the output whenever:

- a point-number reference cannot be resolved within the block
- a disability value name in validation text has no match in the type table
- a label in Input A does not match any dictionary entry
- Input B produced a type list whose length is not what the category mapping implies
- row 5's validation text does not contain `should not select together`, so no
  exclusion groups were produced (see §8)
- an exclusion cluster was found but one or more of its members could not be
  resolved to a type code
- an exclusion cluster resolved to fewer than 2 members and was discarded
- no quoted popup message was found in row 5, so no `alert()` was emitted

Warnings do not block generation. They tell the developer which snippet to
eyeball before pasting.

---

## 8. Mutual exclusion — parsed per SOW

Inside the multi-select category, certain disabilities cannot be chosen together.
**The groups vary between requirements.** They must be parsed from row 5's
`Validations` text, and the number of groups is not fixed.

### Source shape

```
In case of category -E candidate has to select more than 1 values in Type of
disability but    * OA (One Arm) / OL (One leg) /OAL (One Arm and One Leg) /
BL (Both Legs) / BA (Both Arms) / BLOA (Both Legs and One Arm) /
BLA (Both Legs and Arms)   * Blindness & low vision   * Hard of Hearing & Deaf
should not select together.
```

### Parsing algorithm

1. Find the phrase `should not select together` (case-insensitive, whitespace
   collapsed). If absent, emit no exclusion block at all and raise a warning.
2. Take the text preceding it, back to the nearest sentence boundary or to the
   start of the cell.
3. Split that segment on `*` to get cluster candidates. If no `*` is present,
   treat the whole segment as one cluster.
4. Split each cluster on `/` and `&`.
5. For each member token: if it matches `ABBREV (Full Name)`, take the
   parenthesized text; otherwise take the token as-is. Trim.
6. Normalize (lowercase, collapse whitespace) and look up in the type table from
   Input B to get a code.
7. Discard clusters resolving to fewer than 2 codes. Keep the rest, in order.

Note step 5 matters: `OA (One Arm)` must resolve via the parenthesized name, not
the abbreviation. Note also that the source text says `BL (Both Legs)` while the
type list says `Both Leg` — normalization alone will not bridge that. Match
first on the exact normalized name, then retry with a trailing `s` added and
removed before declaring a member unresolved.

### Review panel — required

Because this is unconstrained prose and a wrong parse silently lets invalid
combinations through, the tool must **show the parsed groups back before
emitting**. Render each group as a row of chips above the output panel, with:

- the resolved name and code on each chip
- an X to remove a member
- an "add member" control offering the unassigned types
- add-group and remove-group controls

Emission uses whatever the panel currently shows, so a developer can correct an
odd phrasing without touching the tool's code. Default state is whatever the
parser produced.

### Emitted code

Group count is dynamic, so the reference's `$arr1/$arr2/$arr3` +
`$count1/$count2/$count3` naming cannot be reused: `$count4` and `$count5` are
already taken by the invalid-value and structural checks, and a fourth exclusion
group would collide.

Generate instead, for N groups:

```php
$exclgrp1 = array('05','06','07','08','09','10','11');
$exclgrp2 = array('01','02');
$exclgrp3 = array('03','04');

$exclcnt1 = 0; $exclcnt2 = 0; $exclcnt3 = 0;
$count4 = 0; $count5 = 0;
```

with one `if(in_array($disability_mularr[$i], $exclgrpN, true)) { ++$exclcntN; }`
per group inside the existing loop, and the final gate becoming:

```php
if($exclcnt1<=1 && $exclcnt2<=1 && $exclcnt3<=1 && $count4==0 && $count5==0)
```

`$count4` and `$count5` keep their reference meanings and are not renamed.

This is a deliberate, documented divergence from the hand-written reference. See
Phase 7 for how the golden test handles it.

---

## 9. Phase-by-phase build plan

Each phase is one Claude Code session. Do not start a phase until the previous
one's acceptance criteria pass.

### Phase 0 — Scaffold

Build `index.html`: a single self-contained file, no build step, no CDN
dependencies beyond what `eligibility_code_generator` already uses. Two labelled
textareas (Input A, Input B), a Generate button, a warnings panel, and a tabbed
output area with five tabs and a copy button per tab. Wire the tabs to render
placeholder text.

*Acceptance:* opens from `file://` in a browser, tabs switch, copy button copies.

### Phase 1 — Input B parser

Split the paste into lines, then tab-separated cells. Identify the category
column and the type column by scanning for the column containing single-letter
values `A`–`E` and the column to its right containing multi-word names. Do not
hardcode indices.

Walk rows top to bottom. A non-empty category cell opens a new group; blank
category cells attach to the currently open group. Build:

- `categories[]` — letters in appearance order, coded `'01'`, `'02'`, …
- `types[]` — unique normalized names in appearance order, coded `'01'`…`'20'`;
  a name seen again (as in category E) reuses its existing code
- `mapping{}` — category code → CSV of type codes

*Acceptance:* pasting the BPCL Other Details range reproduces `$arrDiscategory`,
`$arrDisabilityType2` and `$arrpostCategoryDisability_mapping` exactly as in the
reference `config.php`, including E mapping to all 20 codes.

### Phase 2 — Input A parser

Parse tab-separated rows into field objects: `slNo`, `label`, `type`, `maxLength`,
`mandatory`, `inputMethod`, `values`, `defaultValue`, `validations`. Tolerate
5–11 columns. Preserve `validations` text unmodified — Phase 3 needs it whole.

Match each label against the dictionary in §4 using the normalization rules,
handling the duplicate-label disambiguation by document order. Attach `postName`,
`langKey` and `control` to each field. Skip the row 6 note (store its text for
`reg_desc2`).

*Acceptance:* pasting SOW rows 3–12 yields ten field objects with correct POST
names, including `compensatary_time` on the dominant-hand row and `compensatory`
vs `compensatory1` correctly ordered.

### Phase 3 — Resolver

Implement point-reference and value-name resolution per §6. Produce the
`enabledWhen` structure for every conditional field. Implement the exclusion-group
parser and its editable review panel per §8. Implement the warnings panel per §7.

*Acceptance:* against the BPCL paste, row 7 resolves to
`disability_type in ['17','18','19','20']`; row 8 resolves to
`optdisability == 'Y'` with a should-be-Y constraint on type `'15'`; row 12
resolves to the union of `['01','02','17','18','19','20']`, cerebral palsy Y, and
dominant hand Y. Zero unresolved warnings.

The exclusion parser produces exactly three groups —
`['05','06','07','08','09','10','11']`, `['01','02']`, `['03','04']` — with every
member resolved, including `BL (Both Legs)` matching the type list's `Both Leg`.
Editing a chip in the review panel changes the generated snippet.

Also test the parser against two hand-written variants: a single-cluster text with
no `*` bullets, and a two-cluster text. Both should produce the right group count.

The popup message extracted from row 5 matches the reference alert text
character-for-character. Test that editing the quoted text in Input A changes the
generated `alert()`, and that a row 5 with no quoted span raises the warning
instead of emitting a default.

### Phase 4 — Emitters: `config.php` and `reg_details.php`

Emit the three config arrays. Emit the HTML block: one `<div class="form-group">`
per field, radio pairs for Y/N fields, single select plus hidden multi-select for
row 5, the note div for row 6, the hidden fields from §4, then the §5 constant
blocks. Use `$LANG[...]` keys, `fnSelectArrayHash` / `fnSelectArrayMultiHash`, and
`chk_radio()` exactly as the reference does.

*Acceptance:* generated output is functionally identical to the reference
`reg_details.php` block — same names, ids, classes, LANG keys, disabled
conditions, and the `disability_category != '05'` display toggle on row 5.

### Phase 5 — Emitter: `reg_details.js`

Emit the jQuery handlers from the resolver structures:
`#disability_category` change (multi vs single select toggle), `#disability_type`
change and `#disability_multiple` click (scribe alert + `compans_time` enable
based on resolved codes), `.optscribeset` / `.optscribesetchange`,
`.disabilitysuffersoc` click, `.compensatary_time` click, `.optdisability` click
(full reset cascade).

Carry the app plumbing through as fixed template text: `regpage_button_status`,
`DisableEditFn()`, `finalsubmit()`. These have no SOW representation.

*Acceptance:* generated code matches the reference behaviour, with the code
literals (`'17'`–`'20'`, `'15'`, `'01'`,`'02'`) coming from the resolver rather
than being hardcoded, and the `alert()` text at both sites coming from the row 5
quoted span rather than a stored string.

### Phase 6 — Emitters: `reg_validations.php` and `reg_submit.php`

Validations: emit `$mandatory_flds` / `$arr_flds` / `$validate_flds_value` in the
pipe-delimited house format, the `$errmsgarr` else-branch, and the multi-select
block with N dynamically generated `$exclgrpN` arrays, their `$exclcntN` counters,
the invalid-value `$count4` and structural `$count5` checks, and the final gate —
all per §8. The gate condition must be built from the actual group count, not
written for three.

Submit: emit the `getVal()` assignment chain with NULL fallbacks, the
`disability_category == '05'` implode branch, and the `$Scribe_flg` computation
built from the resolver's row-12 codes.

*Acceptance:* both snippets reproduce the reference files' logic for the BPCL SOW.

### Phase 7 — Golden test and hardening

Store the BPCL Input A and Input B pastes as a fixture with a "Load sample"
button. Diff generated output against the stored reference snippets and show
pass/fail per file. Then harden the parsers: extra blank lines, quoted cells
containing tabs, smart quotes, trailing whitespace, missing columns.

One block will not match byte-for-byte: the exclusion arrays and counters are
renamed per §8 (`$exclgrp*` / `$exclcnt*` instead of `$arr1`–`$arr3` /
`$count1`–`$count3`). Normalize that renaming before diffing rather than weakening
the test — map the reference's names onto the generated scheme, then compare.

*Acceptance:* "Load sample" → Generate produces five green diffs, with the
exclusion-block renaming applied as a documented normalization.

---

## 10. Open items for a later update

- References for `reg_qry_arrays.php`, `print.php`, `disability_queries`,
  `reg_details_lang.php` → adds four output tabs
- Set 2 disability layout (`Sub-Type of Disability for MD/IDs'`,
  `Sub-Type of Disability`, `Sub-Type of Multiple Disability`) → currently no
  reference code and no value lists; treat as a future mode toggle in the UI
