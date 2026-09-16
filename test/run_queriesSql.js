/* Phase 7c — disability_queries: one ALTER TABLE ADD statement per pasted
   field, in document order, against `registration`. No golden reference
   exists for this file (only the user's two-example format spec), so
   acceptance is an exact hand-verified expected list for BPCL (every field
   type: radio/select/select+multiselect/text/checkbox all appear there)
   plus no-crash across every fixture. */
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

function alter(name, type){
  return `ALTER TABLE \`registration\` ADD \`${name}\` ${type} CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL ;`;
}

// ── bpcl: exact expected DDL, in document order, DB names not POST names,
//    correct type per control (radio->ENUM, checkbox->VARCHAR(1) despite
//    empty Max Length cell, select/text->VARCHAR(their own pasted length)) ──
{
  const out = App.GEN.queries(ctxFor('bpcl'));
  const expected = [
    alter('disability', "ENUM( 'Y', 'N' )"),
    alter('disability_category', 'VARCHAR( 2 )'),
    alter('disability_type', 'VARCHAR( 10 )'),
    alter('compans_time', "ENUM( 'Y', 'N' )"),
    alter('disabilitysuffersoc', "ENUM( 'Y', 'N' )"),
    alter('compensatory', "ENUM( 'Y', 'N' )"),
    alter('compensatary_time', "ENUM( 'Y', 'N' )"),
    alter('compensatory1', "ENUM( 'Y', 'N' )"),
    alter('scribe', "ENUM( 'Y', 'N' )"),
    alter('disability_40less', "ENUM( 'Y', 'N' )"),
    alter('compensatory2', "ENUM( 'Y', 'N' )"),
    alter('scribe1', "ENUM( 'Y', 'N' )"),
    alter('disability_certify', 'VARCHAR( 1 )'),
    alter('scribe_name', 'VARCHAR( 35 )'),
    alter('scribe_id_proof', 'VARCHAR( 100 )'),
    alter('card_no_scribe', 'VARCHAR( 100 )'),
    alter('eligible_for_scribe', 'VARCHAR( 1 )'),
    alter('undertake_to_produce_udid', 'VARCHAR( 1 )'),
    alter('edu_qual_for_scribe', 'VARCHAR( 1 )')
  ].join('\n');
  assertEq(out, expected, 'bpcl: exact 19-statement DDL, document order, correct DB names/types/lengths');
}

// ── checkbox length is always 1, never read from the (empty) Max Length cell ──
{
  const out = App.GEN.queries(ctxFor('bpcl'));
  assertTrue(out.includes(alter('disability_certify', 'VARCHAR( 1 )')), 'bpcl: checkbox forced to VARCHAR(1) despite blank Max Length');
}

// ── iifcljul26: only rows 3-5 pasted -> exactly 3 statements ──
{
  const out = App.GEN.queries(ctxFor('iifcl'));
  assertEq(out.split('\n').length, 3, 'iifcl: only the 3 pasted fields get DDL');
  assertTrue(out.includes(alter('disability', "ENUM( 'Y', 'N' )")), 'iifcl: DB name (disability), not POST name (optdisability)');
}

// ── missing/non-numeric Max Length on a VARCHAR-type field falls back
//    rather than emitting VARCHAR( NaN ) — synthetic, no real fixture hits this ──
{
  const fakeCtx = { parseA: { fields: [
    { postName: 'disability_category', isNote: false, control: 'select', maxLength: '' }
  ] } };
  const out = App.GEN.queries(fakeCtx);
  assertEq(out, alter('disability_category', 'VARCHAR( 50 )'), 'fallback: blank Max Length on a select field defaults to VARCHAR(50), not VARCHAR(NaN)');
}

// ── every Set 1 + Set 2 sample: no crash, output is a string ──
for (const key of ['bpcl', 'iifcl', 'nitr', 'csmc', 'cwc', 'set2b']) {
  const out = App.GEN.queries(ctxFor(key));
  assertTrue(typeof out === 'string', key + ': queries generates without crashing');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
