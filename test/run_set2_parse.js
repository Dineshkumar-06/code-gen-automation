/* Set 2 — Phase S2-0: layout detection, the Set 2 dictionary, and Input B's
   "Type of Disability / Sub-Type of Disability" header pair.

   Reference: uiicljul26 ("set 2 references.txt"), the only Set 2 SOW with
   real reference code. set2b and cwc are Set 2 pastes with no reference code;
   they are asserted here only for "detected as Set 2, nothing silently
   mangled", not for output correctness. */
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

const parseAOf = k => App.parseInputA(App.FIXTURES.byKey(k).inputA);
const parseBOf = k => App.parseInputB(App.FIXTURES.byKey(k).inputB);

// ── layout detection: Set 1 samples must stay Set 1 ──
['bpcl', 'iifcl', 'nitr', 'csmc'].forEach(k => {
  assertTrue(parseAOf(k).isSet2 === false, k + ': still detected as Set 1');
});
['uiicl', 'set2b', 'cwc'].forEach(k => {
  assertTrue(parseAOf(k).isSet2 === true, k + ': detected as a non-Set-1 layout');
});

// Two structurally different shapes hide behind "not Set 1". Only shape 2
// (uiicljul26) has reference code; shape 3 has no "Sub-Type of Disability for
// <category>" routing dropdown and is flagged separately so its best-effort
// output is never mistaken for a verified one.
assertEq(parseAOf('uiicl').layoutShape, 2, 'uiicl: shape 2 (has the routing dropdown)');
assertEq(parseAOf('set2b').layoutShape, 3, 'set2b: shape 3 (no routing dropdown)');
assertEq(parseAOf('cwc').layoutShape, 3, 'cwc: shape 3 (no routing dropdown)');
['bpcl', 'iifcl', 'nitr', 'csmc'].forEach(k => {
  assertEq(parseAOf(k).layoutShape, 1, k + ': shape 1');
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
  assertTrue(a.warnings.some(w => w.code === 'set3-layout'), 'set2b: warned as a third layout, not as Set 2');
  assertTrue(!a.warnings.some(w => w.code === 'set2-layout'), 'set2b: not claimed to follow the Set 2 reference');
  assertEq(a.warnings.filter(w => w.code === 'unmatched-label').length, 0, 'set2b: zero unmatched labels');
}

// ── layout override still wins over detection ──
{
  const forced1 = App.parseInputA(App.FIXTURES.byKey('uiicl').inputA, 'set1');
  assertTrue(forced1.isSet2 === false, 'uiicl forced to Set 1: layout honoured');
  assertTrue(forced1.warnings.filter(w => w.code === 'unmatched-label').length > 0,
    'uiicl forced to Set 1: the three Set 2 rows now warn as unmatched (the override is doing something real)');

  const forced2 = App.parseInputA(App.FIXTURES.byKey('bpcl').inputA, 'set2');
  assertTrue(forced2.isSet2 === true, 'bpcl forced to Set 2: layout honoured');
  assertTrue(forced2.warnings.some(w => w.code === 'set2-forced'), 'bpcl forced to Set 2: set2-forced warning raised');
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
