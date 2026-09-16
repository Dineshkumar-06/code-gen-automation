# File tree

Live artifact — update whenever a file is added, removed, or substantially
repurposed. See [CLAUDE.md](CLAUDE.md) for the "why", this file is just the "what".

```
.
├── PRD.md                        full spec (§1-10), phase-by-phase build plan
├── claude_code_start_prompt.md   session kickoff instructions (process, stop points)
├── CLAUDE.md                     dense project state: dictionary, resolver modes, phase status
├── TREE.md                       this file
├── README.md                     (empty placeholder, not yet written)
├── disability_set_1_references.txt  5 real SOWs' Input A/B pastes (no reference code) — source
│                                    for the iifcl/nitr/csmc/cwc/set2b fixtures
├── set 2 references.txt          uiicljul26: the one Set 2 SOW WITH reference code for every
│                                 output file. Source for the `uiicl` fixture and for every
│                                 Set 2 emitter's template text
├── ajax_getSubType_disability.php           supplied verbatim by the user; embedded in
├── ajax_getSubType_Multiple_disability.php  generators/ajaxPhp2.js as Set 2's two endpoints
├── index.html                    markup only: anti-FOUC theme script, header, stepper, the
│                                 three step pages; loads css + js in dependency order
│
├── references/
│   ├── set 1/                    source .xlsx workbooks for the 4 SOWs above (Set 1 layout)
│   └── set 2/                    (empty) — Set 2's reference material arrived as
│                                 `set 2 references.txt` instead, not as a workbook
│
├── vendor/highlightjs/           highlight.js, vendored locally — not a CDN dependency, per
│   ├── highlight.min.js          this project's own "no build step, no CDN" rule. The root
│   │                             bundle already includes php/javascript/sql (~40 languages
│   │                             total; confirmed via hljs.listLanguages()), so no separate
│   │                             languages/*.min.js files are needed
│   └── styles/
│       ├── atom-one-dark.min.css
│       └── atom-one-light.min.css   swapped in step with data-theme by js/ui/nav.js
│
├── css/
│   └── styles.css                dual-theme token layer (dark default + light, see the
│                                 THEME CONTRACT header comment), stepper, step pages,
│                                 panels, tabs, alerts, chips, export file grid. No
│                                 @font-face/@import/CDN — system font stacks only
│
├── js/
│   ├── core/
│   │   ├── state.js              App.S singleton; escH/escA/ind; normLabel (labels, strips
│   │   │                         bilingual "/translation" suffix) / normName (type names, does not)
│   │   ├── dictionary.js         §4 name dictionary: exact-label match, then keyword-signature
│   │   │                         match, + 12.1-12.4/17-22 constant-block entries + quoted-label
│   │   │                         alias table (resolver mode 4). TWO layouts: ENTRIES1 (Set 1)
│   │   │                         and ENTRIES2, built from it so the 19 shared fields can't
│   │   │                         drift — every lookup takes an optional layout arg
│   │   ├── set2.js               Set 2 structural roles shared by every Set 2 emitter: which
│   │   │                         category routes through subdistypeido (two independent
│   │   │                         signals), its sub-type codes, the "Multiple Disabilities"
│   │   │                         code, which dropdown opens the multi-select, its option list
│   │   ├── fieldcodes.js         which value list each field's OWN dropdown offers — categories,
│   │   │                         types, or one of Set 2's three sub-type slices. The same code
│   │   │                         means different things per field, and disability_type holds
│   │   │                         the CATEGORY in Set 2/3; mirrors what config.js/config2.js emit
│   │   ├── types.js              searchable index over Input B's types: scanTypeNames() finds
│   │   │                         names/abbreviations directly instead of delimiter-splitting;
│   │   │                         findUnresolvedAbbrevs() surfaces genuine misses (PRD §7)
│   │   ├── fixtures.js           FIXTURES.samples[] — 6 real SOW Input A/B pastes (bpcl is the
│   │   │                         one with reference output; iifcl/nitr/csmc don't have any;
│   │   │                         uiicl is SHAPE 2 and has reference code for every file;
│   │   │                         set2b + cwc are SHAPE 3 — one sub-type dropdown serving every
│   │   │                         category, no routing dropdown — and have none. See the file's
│   │   │                         own SETS comment)
│   │   └── zip.js                dependency-free ZIP writer (STORE method) for "Download all";
│   │                             hand-rolled UTF-8 + CRC-32 so it needs no TextEncoder and
│   │                             stays loadable in the Node vm harness
│   │
│   ├── parsing/
│   │   ├── tsv.js                Excel-clipboard-aware TSV parser: quoted multi-line cells,
│   │   │                         doubled "" -> literal ". Shared by inputA.js and inputB.js
│   │   ├── inputB.js             Phase 1 — Other Details paste -> categories[]/types[]/mapping{};
│   │   │                         header-driven column detection, falls back to a sparse/dense
│   │   │                         structural heuristic
│   │   └── inputA.js             Phase 2 — Basic Details paste -> field objects. TWO PASSES:
│   │                             readRows() splits the paste with no dictionary involvement,
│   │                             detectSet2() runs on those raw rows (isSet2, two independent
│   │                             signals), then claimFields() claims against THAT layout's
│   │                             dictionary. Also returns layoutShape (1/2/3): shape 3 is a
│   │                             non-Set-1 paste with NO "Sub-Type of Disability for
│   │                             <category>" routing dropdown, flagged distinctly because only
│   │                             shape 2 has reference code. Optional layoutOverride
│   │                             ('set1'/'set2') for the UI's manual override
│   │
│   ├── resolve/
│   │   ├── resolver.js           Phase 3 — the five resolver modes -> enabledWhen/constraint,
│   │   │                         clause-boundary splitting (comma/semicolon/"selected yes|no",
│   │   │                         never on name-separators), popup-text extraction, shared
│   │   │                         quote/exclusion-span helpers
│   │   └── exclusions.js         Phase 3 — §8 exclusion-cluster parser (scanTypeNames-based,
│   │                             not delimiter-split; feeds the review panel). Two cluster
│   │                             formats tried in turn: Set 1's "should not select together"
│   │                             + '*' split, then Set 2's numbered "can select only one ...
│   │                             from (...)" lines. exclusionSourceField() is the single
│   │                             source of truth for WHICH row states the rule
│   │
│   ├── generators/
│   │   ├── stubs.js              legacy Phase 4-6 placeholder module — every tab's real
│   │   │                         emitter has since overridden App.GEN[tab], kept only as
│   │   │                         the App.GEN initializer other generator files extend
│   │   ├── config.js             Phase 4 — config.php: $arrDiscategory/$arrDisabilityType2/
│   │   │                         $arrpostCategoryDisability_mapping, straight from Phase 1's
│   │   │                         parseB output; no resolver involvement
│   │   ├── config2.js            Set 2's config.php: six arrays instead of three, because the
│   │   │                         sub-type question splits across two dropdowns + a multi-select.
│   │   │                         WRAPS config.js — App.GEN.config dispatches on parseA.isSet2,
│   │   │                         so load order matters for this and every other *2.js below
│   │   ├── detailsPhp.js         Phase 4 — reg_details.php: rows 3-12 + the constant 17-22
│   │   │                         block. Mostly fixed template (names/ids/LANG keys are
│   │   │                         dictionary-standardized); `disabled` conditions and the
│   │   │                         scribe $scribeTypes/Y-check are compiled from resolved{};
│   │   │                         every field's block gated on has(postName) so a SOW that
│   │   │                         never pastes a row doesn't get its markup. Exports
│   │   │                         scribeDetailBlock() so Set 2 reuses the 17.1-17.6 markup
│   │   ├── detailsPhp2.js        Set 2's reg_details.php: the category dropdown + the three
│   │   │                         sub-type fields + the same dependent rows. `disabled` guards
│   │   │                         compiled positively then negated; multi-select membership
│   │   │                         reads $disabilitymulti. Carries the one structural conjunct
│   │   │                         prose can't settle (sub_disability_type is meaningless under
│   │   │                         the routing category)
│   │   ├── detailsJs.js          Phase 5 — reg_details.js: the 11 jQuery cascade handlers,
│   │   │                         same fixed-template-plus-gating design as detailsPhp.js;
│   │   │                         dynamic pieces are popupText + two resolver-derived code-lists
│   │   │                         (compans_time's and optscribe's 'in' condition codes)
│   │   ├── detailsJs2.js         Set 2's reg_details.js: 13 handlers + the two ajax helper
│   │   │                         pairs. Every cross-field reference is has()-gated, not just
│   │   │                         each handler's own trigger; code lists routed per dropdown;
│   │   │                         the alert fires only for the categories the SOW names
│   │   ├── submitPhp.js          Phase 6 — reg_submit.php: the getVal()/NULL-fallback
│   │   │                         assignment chain, one statement group per field, gated
│   │   │                         on has(postName); same two resolver-derived code-lists
│   │   │                         as detailsJs.js
│   │   ├── submitPhp2.js         Set 2's reg_submit.php: same shape, but each guard refers to
│   │   │                         the PHP variables assigned ABOVE it (not $_POST), so document
│   │   │                         order is load-bearing — asserted by the test
│   │   ├── validationsPhp.js     Phase 6 — reg_validations.php: $mandatory_flds/$arr_flds/
│   │   │                         $validate_flds_value + $errmsgarr else-branches, gated
│   │   │                         per field. The disability_category=='05' exclusion-group
│   │   │                         block ($exclgrpN/$exclcntN declarations, increment loop,
│   │   │                         message cascade, final gate) is generated from
│   │   │                         ctx.exclusionGroups' actual length, never hardcoded for
│   │   │                         three — see CLAUDE.md "Phase 6" for the cascade-formatting
│   │   │                         modeling call
│   │   ├── validationsPhp2.js    Set 2's reg_validations.php: per-field mandatory/errmsgarr
│   │   │                         gates from the same resolved conditions the other two Set 2
│   │   │                         emitters use, plus the exclusion cascade on
│   │   │                         sub_disability_multiple (Set 1's dynamic $exclgrpN counters,
│   │   │                         written plainly — no golden to byte-match). Zero groups
│   │   │                         emits no cascade at all, per the user
│   │   ├── ajaxPhp.js            ajax_getdisability_type.php — a 6th output tab, beyond
│   │   │                         PRD's original five. 100% static for Set 1 (no ctx, no
│   │   │                         gating): the AJAX endpoint getSub_TypeMuldisability()
│   │   │                         (appended to detailsJs.js's output) calls to repopulate
│   │   │                         the type dropdown. Set 1 only — see ui.js's TABS `sets`.
│   │   ├── ajaxPhp2.js           Set 2's two endpoints, verbatim from the files in the repo
│   │   │                         root: ajax_getSubType_disability.php feeds the sub-type
│   │   │                         dropdown, ajax_getSubType_Multiple_disability.php feeds the
│   │   │                         multi-select. Same 100%-static tier. Set 2 only
│   │   ├── functionsPhp.js       functions.php — a 7th output tab, same static-for-Set-1
│   │   │                         tier as ajaxPhp.js. Holds fnSelectArrayMultiHash(),
│   │   │                         which detailsPhp.js's disability_type select blocks
│   │   │                         already call but which was never actually defined
│   │   │                         anywhere in the generated output before this
│   │   ├── functionsPhp2.js     Set 2/3's functions.php: PrintArrSub_disDetails(), which
│   │   │                         reg_details.php's multi-select calls to print its <option>
│   │   │                         list. SOW-DERIVED, unlike Set 1's helper — one <optgroup>
│   │   │                         per Input B category, holding that category's sub-type codes
│   │   │                         minus the "Multiple Disabilities" entry that opened the list
│   │   ├── qryArrays.js          Phase 7 — reg_qry_arrays.php: one "dbName", line per pasted
│   │   │                         field in document order, via App.DICT.dbNameFor()
│   │   ├── langPhp.js            Phase 7 — reg_details_lang.php: $LANG['key'] = 'label';
│   │   │                         per field, deduped by langKey, verbatim SOW wording
│   │   ├── queriesSql.js         Phase 7 — disability_queries: one ALTER TABLE ADD per field,
│   │   │                         DDL type from field.control, VARCHAR length from maxLength.
│   │   │                         Set 2's multi-select column is sized from the CODE TABLE
│   │   │                         (it stores a CSV), not from the SOW's display-width cell
│   │   └── printPhp.js           Phase 7 — print.php: one label/value <tr> per field, three
│   │                             independently gated nesting levels. Serves BOTH layouts: a
│   │                             field a layout lacks is simply not in parseA.fields, so only
│   │                             disability_type's own row needed a Set 2 alternate
│   │
│   ├── ui/
│   │   ├── nav.js                DOM-touching: the 3-step wizard (goStep/setParsed gating),
│   │   │                         the stepper strip, the light/dark theme toggle
│   │   │                         (data-theme + localStorage 'dscg-theme'), and App.ICON,
│   │   │                         the shared inline-SVG icon set
│   │   └── ui.js                 DOM-touching: layout-aware TABS (`sets` field hides the other
│   │                             layout's companion AJAX files from the strip, the zip and the
│   │                             step-3 manifest), Excel view, warnings, the three editable
│   │                             review panels (value aliases, resolved conditions,
│   │                             exclusion groups), the step-2 preview tab strip, and the
│   │                             step-3 file manifest + copy/download/zip actions
│   │
│   └── main.js                   bootstrap; theme, stepper, tab strip, sample picker, the
│                                 static action-bar hints, hljs.configure(), and the
│                                 beforeunload "unsaved work" guard (armed once a parse has
│                                 produced fields, checked live at unload time) on
│                                 DOMContentLoaded (loads last)
│
└── test/
    ├── harness.js               Node vm-sandbox loader (fake window, no DOM) — mirrors
    │                            eligibility_code_generator/test/harness.js
    ├── run_inputB.js            Phase 1 acceptance test
    ├── run_inputA.js            Phase 2 acceptance test
    ├── run_resolver.js          Phase 3 acceptance test (resolver, BPCL)
    ├── run_exclusions.js        Phase 3 acceptance test (exclusion parser + 2 hand-written variants)
    ├── run_multi.js             generalization + Set 2 detection/override regression test —
    │                            all 6 real SOW samples
    ├── run_generators.js        structural regression test for the 5 original emitters
    ├── run_set2_parse.js         Set 2 — layout detection, the Set 2 dictionary, and Input B's
    │                             "Type of Disability / Sub-Type of Disability" header pair
    ├── run_set2_resolve.js       Set 2 — every field's resolved condition checked against the
    │                             reference PHP's own tests, plus popups and exclusion groups
    ├── run_set2_generators.js    Set 2 — all twelve output files: expected content, a PHP-aware
    │                             brace/quote balance walker, a real parse of reg_details.js,
    │                             and a zero-absent-field-leakage sweep across every fixture
    ├── run_qryArrays.js         Phase 7 acceptance test (reg_qry_arrays.php)
    ├── run_langPhp.js           Phase 7 acceptance test (reg_details_lang.php)
    ├── run_queriesSql.js        Phase 7 acceptance test (disability_queries)
    ├── run_printPhp.js          Phase 7 acceptance test (print.php)
    ├── run_fieldcodes.js        core/fieldcodes.js — each field's own value list, all 3 shapes
    ├── run_zip.js               core/zip.js round-trip test (parses its own zip back out)
    └── report.js                human-readable resolver dump for one/all fixtures — the
                                 "eyeball it" view for samples with no reference code to diff
                                 against (node test/report.js <key>, e.g. nitr)
```

## Running the tests

```
node test/run_inputB.js
node test/run_inputA.js
node test/run_resolver.js
node test/run_exclusions.js
node test/run_multi.js
node test/run_generators.js
node test/run_qryArrays.js
node test/run_langPhp.js
node test/run_queriesSql.js
node test/run_printPhp.js
node test/run_zip.js
node test/run_set2_parse.js
node test/run_set2_resolve.js
node test/run_set2_generators.js
node test/report.js nitr        # or: bpcl, iifcl, csmc, uiicl, set2b, cwc — omit for all
```

Or all of them at once (POSIX shell):

```
for f in test/run_*.js; do echo "--- $f"; node "$f" | tail -1; done
```

14 files, 505 assertions.

## Running the app

Open `index.html` directly from `file://` in a browser. No server, no build
step, no CDN dependencies.

Three steps, gated on a successful parse (see `js/ui/nav.js`):

1. **Paste & Parse** — the two pastes, the sample picker, the layout override,
   and the Excel view that shows what the parser actually sees.
2. **Configure & Review** — warnings, value aliases, resolved conditions,
   exclusion groups, and a live read-only preview of every output file
   (11 for Set 1, 12 for Set 2/3 — the two layouts' companion AJAX endpoints
   differ, and the header badge follows whichever is active).
3. **Generate & Export** — per-file copy/download cards plus
   "Download all (.zip)".

The theme toggle (top right) persists to `localStorage` under `dscg-theme` and
falls back to the OS `prefers-color-scheme`.
