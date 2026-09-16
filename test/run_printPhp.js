/* Phase 7d — print.php: preview-page <tr> rows, structurally/content-matched
   against the user's real reference (see printPhp.js header for why this
   was never byte-diffed despite having genuine reference text — it arrived as
   pasted chat text, not an external ground-truth document, so byte-exact
   whitespace can't be verified with confidence). Acceptance here is
   structural: every row present for BPCL (all fields pasted), correct
   $reg-> DB names (not POST names) baked into the fixed template, correct
   nesting/gating for a partial paste (iifcljul26), and no crash elsewhere. */
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

// ── bpcl: every LANG key from the reference present, in the right relative
//    order, correct $reg-> DB names (not POST names) for the 3 exceptions ──
{
  const out = App.GEN.print(ctxFor('bpcl'));
  const expectedKeysInOrder = [
    'reg_optdisability', 'reg_disability_category', 'reg_disability_type', 'reg_compans_time',
    'reg_disabilitysuffersoc', 'reg_compensatory', 'reg_compensatary_time', 'reg_compensatory',
    'reg_optscribe', 'reg_optdisability_40less', 'reg_compensatory', 'reg_optscribe1',
    'reg_disability_certify', 'reg_scribe_name', 'reg_scribe_id_proof', 'reg_card_no_scribe',
    'reg_eligible_for_scribe', 'reg_undertake_to_produce_udid', 'reg_edu_qual_for_scribe'
  ];
  const found = [...out.matchAll(/\$LANG\['(\w+)'\]/g)].map(m => m[1]);
  assertEq(found, expectedKeysInOrder, 'bpcl: all 19 rows present, correct document order (incl. 3x reg_compensatory)');

  assertTrue(out.includes('$reg->disability !=') && !out.includes('$reg->optdisability'), 'bpcl: DB name "disability", never "optdisability"');
  assertTrue(out.includes('$reg->scribe!=') && !out.includes('$reg->optscribe'), 'bpcl: DB name "scribe", never "optscribe"');
  assertTrue(out.includes('$reg->disability_40less!=') && !out.includes('$reg->optdisability_40less'), 'bpcl: DB name "disability_40less", never "optdisability_40less"');

  assertTrue(out.includes("if($reg->disability == 'Y')"), 'bpcl: outer disability==Y wrapper present');
  assertTrue(out.includes("if($reg->disability_40less == 'Y')"), 'bpcl: disability_40less==Y wrapper present');
  assertTrue(out.includes("if($reg->scribe == 'Y' || $reg->scribe1 == 'Y')"), 'bpcl: scribe-detail wrapper gated on scribe/scribe1, not on a dependent field\'s own emptiness');
  assertTrue(!out.includes("scribe_name != '' ||"), 'bpcl: no circular "scribe_name!=\'\' || ..." condition anywhere (that was the wrapper\'s own old, wrong gate)');
  assertTrue(out.includes('$arrScribeIDProof[$reg->scribe_id_proof]'), 'bpcl: scribe_id_proof looks up $arrScribeIDProof');
  assertTrue(out.includes('ccMasking($reg->card_no_scribe)'), 'bpcl: card_no_scribe masking block present');
}

// ── alignment: every <tr> in the file starts flush at column 0 — no block
//    sits an extra tab deeper than its siblings (the bug caught 2026-09-09:
//    the compensatory2/scribe1/disability_certify block, inside the
//    disability_40less wrapper, used to be indented one tab deeper than
//    every other <tr> block in the file for no structural reason) ──
{
  const out = App.GEN.print(ctxFor('bpcl'));
  const badlyIndented = out.split('\n').filter(l => /^\t+<tr>/.test(l));
  assertEq(badlyIndented, [], 'bpcl: no <tr> line is indented (every block is flush at column 0)');
}

// ── iifcljul26: only optdisability/disability_category/disability_type
//    pasted — the disability==Y wrapper opens (has optdisability), but NONE
//    of the 40less wrapper, the scribe-detail wrapper, or any row inside
//    them should appear at all ──
{
  const out = App.GEN.print(ctxFor('iifcl'));
  assertTrue(out.includes('reg_disability_category') && out.includes('reg_disability_type'), 'iifcl: pasted rows present');
  assertTrue(!out.includes('reg_compans_time'), 'iifcl: compans_time row absent (never pasted)');
  assertTrue(!out.includes('reg_optscribe'), 'iifcl: optscribe row absent (never pasted)');
  assertTrue(!out.includes("disability_40less == 'Y'"), 'iifcl: no 40less wrapper at all (optdisability_40less never pasted)');
  assertTrue(!out.includes('scribe_name') && !out.includes('scribe_id_proof'), 'iifcl: no scribe-detail wrapper (none of its 6 fields pasted)');
}

// ── a SOW with none of optdisability/optdisability_40less pasted must not
//    emit either "if($reg->disability" wrapper at all (would reference an
//    undefined property for no reason) — synthetic, no real fixture hits this ──
{
  const fakeCtx = { parseA: { fields: [
    { postName: 'compans_time', isNote: false }
  ] } };
  const out = App.GEN.print(fakeCtx);
  assertEq(out, '', 'no root toggle pasted: nothing emitted at all (compans_time only exists inside the disability==Y wrapper)');
}

// ── every Set 1 + Set 2 sample: no crash, output is a string ──
for (const key of ['bpcl', 'iifcl', 'nitr', 'csmc', 'cwc', 'set2b']) {
  const out = App.GEN.print(ctxFor(key));
  assertTrue(typeof out === 'string', key + ': print generates without crashing');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
