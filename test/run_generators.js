/* Structural regression test for the 5 emitters that used to be pinned to a
   byte-exact diff against the BPCL reference document (test/golden.js,
   removed 2026-09-09 per the user's request — SOWs vary too much for
   byte-exact expectations to generalize, and it was blocking real alignment
   fixes across every file it covered). The resolver/exclusion logic these
   emitters consume is already deeply verified elsewhere (run_resolver.js,
   run_exclusions.js, run_multi.js) — what's left to guard here is that the
   mechanical assembly/gating in config.js/detailsPhp.js/detailsJs.js/
   validationsPhp.js/submitPhp.js itself doesn't silently break: the right
   fields are present, gated correctly, and carry the right DB names/codes. */
const App = require('./harness.js');

let pass = 0, fail = 0;
function assertTrue(cond, label, extra){
  if (cond) { pass++; } else { fail++; console.log('FAIL:', label, extra !== undefined ? '\n  ' + JSON.stringify(extra) : ''); }
}
function assertEq(actual, expected, label){
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; }
  else { fail++; console.log('FAIL:', label, '\n  actual:  ', a, '\n  expected:', e); }
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

const GENS = ['config', 'detailsPhp', 'detailsJs', 'validations', 'submit'];

// ── bpcl: structural correctness for every one of the 5 emitters ──
{
  const ctx = ctxFor('bpcl');

  const config = App.GEN.config(ctx);
  assertTrue(config.includes("'05'=>'A'") === false && config.includes("'05'=>'E'"), 'bpcl config: category 05 maps to E');
  assertTrue(config.includes("'01'=>'01,02'"), 'bpcl config: category mapping for 01');
  assertTrue(config.includes("'20'=>'Mental Illness'"), 'bpcl config: type 20 is Mental Illness');

  const detailsPhp = App.GEN.detailsPhp(ctx);
  assertTrue(detailsPhp.includes("$row_reg['disability']") && !detailsPhp.includes("$row_reg['optdisability']"), 'bpcl detailsPhp: DB name "disability", never "optdisability"');
  assertTrue(detailsPhp.includes("$scribeTypes = ['01','02','17','18','19','20']"), 'bpcl detailsPhp: scribeTypes carries the resolved codes exactly');
  assertTrue(detailsPhp.includes("in_array('17', explode(',', $row_reg['disability_type']))"), 'bpcl detailsPhp: compans_time disabled-guard references resolved code 17');
  assertTrue(detailsPhp.includes('fnSelectArrayHash($arrScribeIDProof'), 'bpcl detailsPhp: scribe_id_proof block present (all rows 17-22 pasted)');

  const detailsJs = App.GEN.detailsJs(ctx);
  assertTrue(detailsJs.includes('#disability_category') && detailsJs.includes('#disability_type'), 'bpcl detailsJs: category/type change handlers present');
  assertTrue(detailsJs.length > 5000, 'bpcl detailsJs: substantial handler set emitted (all 11), not a truncated fallback');

  const validations = App.GEN.validations(ctx);
  assertTrue(validations.includes('$exclgrp1') && validations.includes('$exclgrp3') && !validations.includes('$exclgrp4'), 'bpcl validations: exactly 3 dynamic exclusion groups ($exclgrp1..3)');
  assertTrue(validations.includes('$exclcnt1') && validations.includes('$exclcnt3'), 'bpcl validations: matching $exclcntN counters for all 3 groups');

  const submit = App.GEN.submit(ctx);
  assertTrue(submit.includes("$disability=($_POST['optdisability']"), 'bpcl submit: root toggle reads $_POST[\'optdisability\'] (POST name, not DB name, on the read side)');
  assertTrue(submit.includes('$Scribe_flg'), 'bpcl submit: scribe-enable flag computation present');
}

// ── iifcljul26: only rows 3-5 pasted — every emitter must reflect that
//    subset, not the full BPCL-shaped template (the "fields not in the
//    paste" bug class this whole tool was built to avoid) ──
{
  const ctx = ctxFor('iifcl');
  const detailsPhp = App.GEN.detailsPhp(ctx);
  assertTrue(!detailsPhp.includes('compans_time') && !detailsPhp.includes('scribe_name'), 'iifcl detailsPhp: no compans_time/scribe_name markup (never pasted)');
  const submit = App.GEN.submit(ctx);
  assertTrue(!submit.includes('$Scribe_flg'), 'iifcl submit: no scribe computation (optscribe never pasted)');
  const validations = App.GEN.validations(ctx);
  assertTrue(validations.includes('$exclgrp1') && validations.includes('$exclgrp3'), 'iifcl validations: still gets its own 3 exclusion groups (independent of BPCL\'s)');
  assertTrue(!validations.includes('if(false)') && !validations.includes('compans_time'), 'iifcl validations: no dead if(false) compans_time block (2026-09-11 fix)');

  const detailsJs = App.GEN.detailsJs(ctx);
  ['scribe_name', 'scribe_id_proof', 'card_no_scribe', 'eligible_for_scribe', 'undertake_to_produce_udid',
   'edu_qual_for_scribe', 'compans_time', 'compensatory1', 'optdisability_40less', 'scribe1',
   'disability_certify'].forEach(function(f){
    assertTrue(!new RegExp('\\.' + f + '(?![a-zA-Z0-9_])').test(detailsJs), 'iifcl detailsJs: .optdisability handler does not reference absent field "' + f + '" (2026-09-11 fix)');
  });
  assertTrue(detailsJs.includes('.disability_category') && detailsJs.includes('#disability_type'), 'iifcl detailsJs: still references its own present fields');
  assertTrue((function(){ try { new Function(detailsJs); return true; } catch (e) { return false; } })(), 'iifcl detailsJs: still valid JS syntax');
}

// ── csmcnov25: 2 exclusion groups (no middle group) — confirms the dynamic
//    group-count codegen actually varies N, not just always 3 ──
{
  const ctx = ctxFor('csmc');
  const validations = App.GEN.validations(ctx);
  assertTrue(validations.includes('$exclgrp1') && validations.includes('$exclgrp2') && !validations.includes('$exclgrp3'), 'csmc validations: exactly 2 exclusion groups');
}

// ── every Set 1 + Set 2 sample: every one of the 5 emitters runs without
//    crashing (Set 2 samples produce incomplete/partial output by design,
//    per PRD §10 — the point here is purely "does not throw") ──
for (const key of ['bpcl', 'iifcl', 'nitr', 'csmc', 'cwc', 'set2b']) {
  const ctx = ctxFor(key);
  for (const gen of GENS) {
    let out;
    try { out = App.GEN[gen](ctx); } catch (e) { out = null; }
    assertTrue(typeof out === 'string', key + '.' + gen + ': generates without crashing');
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
