/* Phase 7a — reg_qry_arrays.php: a bare list of quoted DB column names, one
   per pasted field, in document order. No golden reference exists for this
   file (only a short user-supplied format example), so acceptance here is
   "correct against BPCL's own known field list" plus "no crash across every
   real SOW fixture". */
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

function ctxFor(key){
  const sample = App.FIXTURES.byKey(key);
  const parseA = App.parseInputA(sample.inputA);
  const parseB = App.parseInputB(sample.inputB);
  const resolve = App.resolveAll(parseA, parseB);
  const typeField = parseA.fields.filter(f => f.control === 'select+multiselect')[0];
  const exclusionGroups = App.parseExclusions(typeField ? typeField.validations : '', resolve.typeIndex, resolve.warnings);
  return { parseA, parseB, resolve, exclusionGroups };
}

// ── bpcl: exact expected DB column list, in document order, one line per
//    field, no disability_multiple[] duplicate line, no note row ──
{
  const out = App.GEN.qryArrays(ctxFor('bpcl'));
  const expected = [
    'disability', 'disability_category', 'disability_type', 'compans_time',
    'disabilitysuffersoc', 'compensatory', 'compensatary_time', 'compensatory1',
    'scribe', 'disability_40less', 'compensatory2', 'scribe1', 'disability_certify',
    'scribe_name', 'scribe_id_proof', 'card_no_scribe', 'eligible_for_scribe',
    'undertake_to_produce_udid', 'edu_qual_for_scribe'
  ].map(n => `"${n}",`).join('\n');
  assertEq(out, expected, 'bpcl: reg_qry_arrays.php exact document-order field list, DB names not POST names');
  assertTrue(!out.includes('disability_multiple'), 'bpcl: disability_multiple[] not duplicated as its own DB column');
}

// ── iifcljul26: only pastes rows 3/4/5 — must emit exactly those three,
//    nothing from the constant blocks it never mentions ──
{
  const out = App.GEN.qryArrays(ctxFor('iifcl'));
  assertEq(out, '"disability",\n"disability_category",\n"disability_type",', 'iifcl: only the 3 pasted fields, DB name for optdisability');
}

// ── every Set 1 + Set 2 sample: no crash, output is a string ──
for (const key of ['bpcl', 'iifcl', 'nitr', 'csmc', 'cwc', 'set2b']) {
  const out = App.GEN.qryArrays(ctxFor(key));
  assertTrue(typeof out === 'string', key + ': qryArrays generates without crashing');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
