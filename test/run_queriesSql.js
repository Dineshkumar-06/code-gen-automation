/* Phase 7c — disability_queries: one ALTER TABLE ADD statement per pasted
   field, in document order, against `registration`. No golden reference
   exists for this file (only the user's two-example format spec), so
   acceptance is an exact hand-verified expected list for BPCL (every field
   type: radio/select/select+multiselect/text/checkbox all appear there)
   plus no-crash across every fixture.

   2026-09-16: eleven of those columns (disability, disability_type,
   disabilitysuffersoc, compensatory, compensatary_time, compensatory1,
   scribe, disability_40less, compensatory2, scribe1, disability_certify)
   already exist on every project's base `registration` table, per the
   user — an ALTER TABLE ADD for one of them errors the moment it runs
   against a real project. queriesSql.js now skips them and leaves a
   leading SQL comment saying which were skipped and why. */
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

const PREEXISTING = ['disability', 'disability_type', 'disabilitysuffersoc',
  'compensatory', 'compensatary_time', 'compensatory1', 'scribe',
  'disability_40less', 'compensatory2', 'scribe1', 'disability_certify'];
function skipHeader(names){ return '-- Already on the base `registration` table, skipped: ' + names.join(', '); }

// ── bpcl: exact expected DDL, in document order, DB names not POST names,
//    correct type per control (radio->ENUM, checkbox->VARCHAR(1) despite
//    empty Max Length cell, select/text->VARCHAR(their own pasted length)),
//    and the 11 columns already on the base table are skipped, not ALTERed ──
{
  const out = App.GEN.queries(ctxFor('bpcl'));
  const expected = [
    skipHeader(PREEXISTING),
    alter('disability_category', 'VARCHAR( 2 )'),
    alter('compans_time', "ENUM( 'Y', 'N' )"),
    alter('scribe_name', 'VARCHAR( 35 )'),
    alter('scribe_id_proof', 'VARCHAR( 100 )'),
    alter('card_no_scribe', 'VARCHAR( 100 )'),
    alter('eligible_for_scribe', 'VARCHAR( 1 )'),
    alter('undertake_to_produce_udid', 'VARCHAR( 1 )'),
    alter('edu_qual_for_scribe', 'VARCHAR( 1 )')
  ].join('\n');
  assertEq(out, expected, 'bpcl: exact 8-statement DDL (11 preexisting columns skipped), document order, correct DB names/types/lengths');
  PREEXISTING.forEach(name => {
    assertTrue(!out.includes('ADD `' + name + '`'), 'bpcl: no ALTER TABLE for preexisting column ' + name);
  });
}

// ── checkbox length is always 1, never read from the (empty) Max Length cell.
//    disability_certify is itself preexisting, so this needs a field that
//    (a) is a checkbox and (b) is not already on the base table ──
{
  const out = App.GEN.queries(ctxFor('bpcl'));
  assertTrue(out.includes(alter('eligible_for_scribe', 'VARCHAR( 1 )')), 'bpcl: checkbox forced to VARCHAR(1) despite blank Max Length');
}

// ── iifcljul26: only rows 3-5 pasted, and 2 of those 3 (disability,
//    disability_type) are preexisting -> exactly 1 real ALTER statement ──
{
  const out = App.GEN.queries(ctxFor('iifcl'));
  assertEq(out, skipHeader(['disability', 'disability_type']) + '\n' + alter('disability_category', 'VARCHAR( 5 )'),
    'iifcl: only disability_category needs DDL — disability/disability_type are already on the base table');
  assertTrue(!out.includes("ADD `disability`") && !out.includes('ADD `disability_type`'),
    'iifcl: no ALTER TABLE for either preexisting column');
}

// ── a field whose DB name is preexisting is skipped regardless of layout —
//    Set 2/3's own disability_type (which holds the CATEGORY there) is the
//    identical DB column and must not get a second ALTER TABLE either ──
{
  const out = App.GEN.queries(ctxFor('set2b'));
  assertTrue(!out.includes('ADD `disability_type`'), 'set2b: disability_type (holding the category here) is still skipped as preexisting');
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
