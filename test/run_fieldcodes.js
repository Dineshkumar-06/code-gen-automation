/* core/fieldcodes.js — the value list each field's own dropdown offers.

   The review panel used to render ONE list (Input B's types) for every
   condition, whatever field the condition targeted. That is wrong the moment
   two dropdowns in the same paste hold different lists, which is every real
   SOW: Set 1's disability_category holds categories, and in Set 2/3 the same
   field name — disability_type — holds the CATEGORY rather than the type, so
   "04" rendered as "Hard of Hearing" where the requirement means "MD/ID".

   Acceptance: every list matches what config.php / config2.js actually emits
   for that dropdown, across all three layout shapes. */
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

function envFor(key){
  const sample = App.FIXTURES.byKey(key);
  const parseA = App.parseInputA(sample.inputA);
  const parseB = App.parseInputB(sample.inputB);
  const resolve = App.resolveAll(parseA, parseB);
  return { parseA, parseB, roles: resolve.set2, resolve };
}
function codesOf(env, postName){
  return App.codeListForField(postName, env.parseA, env.parseB, env.roles).map(o => o.code);
}
function namesOf(env, postName){
  return App.codeListForField(postName, env.parseA, env.parseB, env.roles).map(o => o.name);
}

// ── Set 1: the two disability dropdowns hold different lists ──
{
  const env = envFor('bpcl');
  assertEq(namesOf(env, 'disability_category'), ['A', 'B', 'C', 'D', 'E'],
    'bpcl: disability_category offers Input B\'s categories, not its types');
  assertEq(codesOf(env, 'disability_category'), env.parseB.categories.map(c => c.code),
    'bpcl: disability_category codes are the category codes');
  assertEq(codesOf(env, 'disability_type'), env.parseB.types.map(t => t.code),
    'bpcl: disability_type offers every Input B type');
  assertEq(codesOf(env, 'disability_multiple'), env.parseB.types.map(t => t.code),
    'bpcl: the multi-select sibling offers the same type list');

  // The bug in miniature: same code, two dropdowns, two different meanings.
  const cat01 = namesOf(env, 'disability_category')[0];
  const type01 = namesOf(env, 'disability_type')[0];
  assertTrue(cat01 !== type01,
    'bpcl: code 01 does not mean the same thing in both dropdowns', { cat01, type01 });
}

// ── Set 2 (shape 2, uiicl): disability_type holds the CATEGORY, and the
//    sub-type question is split across three fields with three lists ──
{
  const env = envFor('uiicl');
  assertTrue(env.parseA.isSet2 && env.parseA.layoutShape === 2, 'uiicl: is shape 2');

  assertEq(namesOf(env, 'disability_type'), ['VI', 'HI', 'OC', 'MD/ID'],
    'uiicl: disability_type offers the CATEGORIES (VI/HI/OC/MD-ID), not sub-types');

  // subdistypeido serves exactly the routing category's own sub-types.
  assertEq(codesOf(env, 'subdistypeido'), env.roles.idoTypeCodes,
    'uiicl: subdistypeido offers only the routing category\'s sub-types');
  assertTrue(codesOf(env, 'subdistypeido').indexOf(env.roles.multipleCode) !== -1,
    'uiicl: the "Multiple Disabilities" entry is one of them (it is what opens the multi-select)');

  // sub_disability_type serves every OTHER category — config2.js comments the
  // routing category's codes out of $arr_subDisabilityType2 for this reason.
  const subType = codesOf(env, 'sub_disability_type');
  assertTrue(env.roles.idoTypeCodes.every(c => subType.indexOf(c) === -1),
    'uiicl: sub_disability_type excludes every routing-category sub-type', { subType, ido: env.roles.idoTypeCodes });
  assertEq(subType.length, env.parseB.types.length - env.roles.idoTypeCodes.length,
    'uiicl: sub_disability_type is exactly the remaining types');

  // The multi-select offers everything except the entry that opened it.
  assertEq(codesOf(env, 'sub_disability_multiple'), env.roles.mulOptionCodes,
    'uiicl: sub_disability_multiple offers the multi-select\'s own option list');
  assertTrue(codesOf(env, 'sub_disability_multiple').indexOf(env.roles.multipleCode) === -1,
    'uiicl: "Multiple Disabilities" is not selectable inside the list it opens');

  // The exact case the user reported: subdistypeido is enabled when
  // disability_type is the MD/ID category, and that code must read "MD/ID".
  const cond = [];
  (function walk(c){ if (!c) return; if (c.op === 'or') return (c.conditions || []).forEach(walk); cond.push(c); })(
    env.resolve.resolved['subdistypeido'].enabledWhen);
  const inCond = cond.filter(c => c.op === 'in' && c.field === 'disability_type')[0];
  assertTrue(!!inCond, 'uiicl: subdistypeido resolves to an `in` condition on disability_type');
  const list = App.codeListForField('disability_type', env.parseA, env.parseB, env.roles);
  assertEq(inCond.codes.map(code => (list.filter(o => o.code === code)[0] || {}).name), ['MD/ID'],
    'uiicl: that condition\'s code renders as the MD/ID CATEGORY, not a sub-type name');
}

// ── Shape 3 (set2b): one sub-type dropdown serving every category, so there
//    is no routing split to carve out ──
{
  const env = envFor('set2b');
  assertTrue(env.parseA.layoutShape === 3, 'set2b: is shape 3');
  assertEq(namesOf(env, 'disability_type'), ['HI', 'VI', 'LD', 'ID/MD'],
    'set2b: disability_type offers its own categories');
  assertEq(env.roles.idoCategoryCode, null, 'set2b: no routing category exists');
  assertEq(codesOf(env, 'sub_disability_type'), env.parseB.types.map(t => t.code),
    'set2b: with no routing split its one sub-type dropdown keeps every type');
  assertEq(codesOf(env, 'sub_disability_multiple'), env.roles.mulOptionCodes,
    'set2b: the multi-select still excludes the entry that opens it');
}

// ── scribe_id_proof is not a disability list at all ──
{
  const env = envFor('bpcl');
  const proof = App.codeListForField('scribe_id_proof', env.parseA, env.parseB, env.roles);
  assertEq(proof, App.DICT.scribeIdProofEntries(
    env.parseA.fields.filter(f => f.postName === 'scribe_id_proof')[0].values),
    'bpcl: scribe_id_proof offers its own pasted Values list, matching $arrScribeIDProof');
  assertTrue(proof.every(o => env.parseB.types.every(t => t.name !== o.name)),
    'bpcl: none of its entries are disability types');
}

// ── a field with no list of its own falls back to the types, as before ──
{
  const env = envFor('bpcl');
  assertEq(codesOf(env, 'optdisability'), env.parseB.types.map(t => t.code),
    'bpcl: a Y/N radio has no code list of its own and falls back to the types');
}

// ── no crash on any fixture, for any field it actually pastes ──
App.FIXTURES.samples.forEach(function(sample){
  const parseA = App.parseInputA(sample.inputA);
  const parseB = App.parseInputB(sample.inputB);
  const roles = App.resolveAll(parseA, parseB).set2;
  let ok = true;
  parseA.fields.forEach(function(f){
    if (!f.postName) return;
    const list = App.codeListForField(f.postName, parseA, parseB, roles);
    if (!Array.isArray(list) || list.some(o => !o || o.code === undefined || o.name === undefined)) ok = false;
  });
  assertTrue(ok, sample.key + ': every pasted field yields a well-formed {code,name} list');
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
