/* Set 2 — Phase S2-0: explicit layout selection, the Set 2 dictionary, and
   Input B's "Type of Disability / Sub-Type of Disability" header pair.

   Reference: uiicljul26 ("set 2 references.txt"), the only Set 2 SOW with
   real reference code. set2b and cwc are Set 2/3 pastes with no reference
   code; they are asserted here only for "the chosen layout claims fields
   correctly, nothing silently mangled", not for output correctness.

   Layout (Set 1/2/3) is an explicit developer choice, not something the
   parser guesses (see parsing/inputA.js, 2026-09-17) — per the user, prose-
   based detection could never be made airtight against every future SOW's
   wording, and it added real complexity (a guess AND an override AND
   warnings for when they disagreed) for a decision the developer already
   knows the answer to. Each fixture below is parsed with its own known
   layout via FIXTURES.layoutFor(). */
const App = require('./harness.js');

let pass = 0, fail = 0;
function assertEq(actual, expected, label){
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; }
  else { fail++; console.log('FAIL:', label, '\n  actual:  ', a, '\n  expected:', e); }
}
function assertTrue(cond, label, extra){
  if (cond) { pass++; } else { fail++; console.log('FAIL:', label, extra !== undefined ? '\n  ' + JSON.stringify(extra) : ''); }
}

const parseAOf = k => App.parseInputA(App.FIXTURES.byKey(k).inputA, App.FIXTURES.layoutFor(k));
const parseBOf = k => App.parseInputB(App.FIXTURES.byKey(k).inputB);

// ── choosing 'set1' claims against the Set 1 dictionary, 'set2'/'set3'
//    against the Set 2/3 dictionary ──
['bpcl', 'iifcl', 'nitr', 'csmc'].forEach(k => {
  assertTrue(parseAOf(k).isSet2 === false, k + ': set1 layout claims against the Set 1 dictionary');
});
['uiicl', 'set2b', 'cwc'].forEach(k => {
  assertTrue(parseAOf(k).isSet2 === true, k + ': set2/set3 layout claims against the shared Set 2/3 dictionary');
});

// layoutShape follows directly from the chosen layout — 'set2' -> shape 2,
// 'set3' -> shape 3 — it is no longer inferred from whether a subdistypeido
// row happens to be present.
assertEq(parseAOf('uiicl').layoutShape, 2, 'uiicl: set2 layout -> shape 2');
assertEq(parseAOf('set2b').layoutShape, 3, 'set2b: set3 layout -> shape 3');
assertEq(parseAOf('cwc').layoutShape, 3, 'cwc: set3 layout -> shape 3');
['bpcl', 'iifcl', 'nitr', 'csmc'].forEach(k => {
  assertEq(parseAOf(k).layoutShape, 1, k + ': set1 layout -> shape 1');
});

// ── uiicljul26 Input A: every row claims its dictionary entry ──
{
  const a = parseAOf('uiicl');
  assertEq(a.warnings.filter(w => w.code === 'unmatched-label').length, 0,
    'uiicl: zero unmatched labels');
  assertEq(a.fields.map(f => f.postName || (f.isNote ? '<note>' : '?')), [
    'optdisability', 'disability_type', 'subdistypeido', 'sub_disability_type',
    'sub_disability_multiple', '<note>', 'compans_time', 'disabilitysuffersoc',
    'compensatory', 'compensatary_time', 'compensatory1', 'optscribe',
    'optdisability_40less', 'compensatory2', 'scribe1', 'disability_certify',
    'scribe_name', 'scribe_id_proof', 'card_no_scribe', 'eligible_for_scribe',
    'undertake_to_produce_udid', 'edu_qual_for_scribe'
  ], 'uiicl: full document-order postName list');

  const byName = {};
  a.fields.forEach(f => { if (f.postName) byName[f.postName] = f; });

  // Set 2's "Type of Disability" is a PLAIN select carrying the category —
  // it must NOT inherit Set 1's select+multiselect / disability_multiple[].
  assertEq(byName.disability_type.control, 'select', 'uiicl: disability_type is a plain select in Set 2');
  assertTrue(!byName.disability_type.multiPostName, 'uiicl: disability_type has no multi-select twin in Set 2');
  assertEq(byName.sub_disability_multiple.control, 'multiselect', 'uiicl: sub_disability_multiple is the multiselect');
  assertEq(byName.sub_disability_multiple.multiName, 'sub_disability_multiple[]',
    'uiicl: multiselect name= attribute carries the PHP array suffix');
  assertTrue(!byName.disability_category, 'uiicl: Set 2 has no disability_category row');

  // The three sub-type rows must not swap: subdistypeido is the "for <cat>"
  // one, sub_disability_type the unqualified one.
  assertTrue(/for\s+MD\/IDs/i.test(byName.subdistypeido.label), 'uiicl: subdistypeido claimed the "for MD/IDs" row', byName.subdistypeido.label);
  assertTrue(/^Sub-Type of Disability$/i.test(byName.sub_disability_type.label.trim()),
    'uiicl: sub_disability_type claimed the unqualified row', byName.sub_disability_type.label);
  assertTrue(/Multiple/i.test(byName.sub_disability_multiple.label), 'uiicl: sub_disability_multiple claimed the "Multiple" row');
}

// ── set2b: two sub-type levels, no "for <category>" dropdown. The
//    unqualified row must claim sub_disability_type, NOT subdistypeido. ──
{
  const a = parseAOf('set2b');
  const names = a.fields.map(f => f.postName).filter(Boolean);
  assertTrue(names.indexOf('sub_disability_type') !== -1, 'set2b: has sub_disability_type');
  assertTrue(names.indexOf('sub_disability_multiple') !== -1, 'set2b: has sub_disability_multiple');
  assertTrue(names.indexOf('subdistypeido') === -1, 'set2b: no subdistypeido (it has no "for <category>" row)', names);
  assertEq(a.warnings.filter(w => w.code === 'unmatched-label').length, 0, 'set2b: zero unmatched labels');
}

// ── the layout choice is load-bearing: picking the WRONG one for a paste
//    claims fields against the wrong dictionary, surfacing as unmatched
//    labels — this is the actual mechanism the old "override vs. detection"
//    disagreement warnings used to describe secondhand ──
{
  const wrongLayout = App.parseInputA(App.FIXTURES.byKey('uiicl').inputA, 'set1');
  assertTrue(wrongLayout.isSet2 === false, 'uiicl paste read as set1: honours the (wrong) choice');
  assertTrue(wrongLayout.warnings.filter(w => w.code === 'unmatched-label').length > 0,
    'uiicl paste read as set1: its Set 2-only rows now warn as unmatched');

  const alsoWrong = App.parseInputA(App.FIXTURES.byKey('bpcl').inputA, 'set2');
  assertTrue(alsoWrong.isSet2 === true, 'bpcl paste read as set2: honours the (wrong) choice');
  assertTrue(alsoWrong.warnings.filter(w => w.code === 'unmatched-label').length > 0,
    'bpcl paste read as set2: its Set 1-only rows (disability_category) now warn as unmatched');
}

// ── Input B: the Set 2 header pair is recognized, so the header row is NOT
//    swallowed as a real category/type (the bug this phase fixed) ──
{
  const b = parseBOf('uiicl');
  assertEq(b.columns, { catCol: 0, typeCol: 1, headerRow: 0 }, 'uiicl Input B: header row located');
  assertEq(b.categories.map(c => c.label), ['VI', 'HI', 'OC', 'MD/ID'], 'uiicl Input B: four categories, no header row leaked in');
  assertEq(b.types.length, 22, 'uiicl Input B: 22 sub-types');
  assertEq(b.types[0].name, 'Blind  (B)', 'uiicl Input B: first sub-type is Blind, not the header text');
  assertEq(b.mapping, {
    '01': '01,02',                                              // VI
    '02': '03,04',                                              // HI
    '03': '05,06,07,08,09,10,11,12,13,14,15,16,17',             // OC
    '04': '18,19,20,21,22'                                      // MD/ID
  }, 'uiicl Input B: category -> sub-type mapping');
  assertEq(b.warnings, [], 'uiicl Input B: no warnings');
}
{
  const b = parseBOf('set2b');
  assertEq(b.columns.headerRow, 0, 'set2b Input B: header row located too');
  assertEq(b.categories.map(c => c.label), ['HI', 'VI', 'LD', 'ID/MD'], 'set2b Input B: four categories');
}
// Set 1 header detection must be untouched by the new sub-aware pass.
['bpcl', 'iifcl', 'nitr', 'csmc'].forEach(k => {
  assertEq(parseBOf(k).columns.headerRow, 0, k + ' Input B: header row still located');
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
