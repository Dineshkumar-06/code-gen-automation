/* Phase 7b — reg_details_lang.php: $LANG['key'] = 'verbatim SOW label text';
   one per pasted field, deduped by langKey (compensatory/compensatory1/
   compensatory2 share 'reg_compensatory' by design), plus one line for the
   note row from ctx.parseA.noteText. No golden reference exists for this
   file, so acceptance is exact-match against hand-verified expected output
   for BPCL, a dedup check, and no-crash across every fixture. */
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

// ── bpcl: exact expected $LANG lines, in document order, reg_compensatory
//    deduped to ONE line despite 3 fields sharing it, reg_desc2 present ──
{
  const out = App.GEN.lang(ctxFor('bpcl'));
  const lines = out.split('\n');
  assertEq(lines.filter(l => l.includes("'reg_compensatory'")).length, 1, 'bpcl: reg_compensatory deduped to exactly one line');
  assertTrue(lines.includes("$LANG['reg_optdisability'] = 'Are you a person with benchmark disability of 40% and above ?';"), 'bpcl: reg_optdisability exact label', lines[0]);
  assertTrue(lines.includes("$LANG['reg_desc2'] = 'To select multiple disabilities please hold the CTRL key and click on the disabilities';"), 'bpcl: reg_desc2 from noteText', lines);
  assertTrue(lines.includes("$LANG['reg_scribe_id_proof'] = 'ID card of Scribe:';"), 'bpcl: constant-block field (scribe_id_proof) label included', lines);
  assertEq(lines.length, 18, 'bpcl: 19 fields + note - 2 dedup collisions (compensatory1/compensatory2 share reg_compensatory) = 18 lines');
}

// ── iifcljul26: only pastes rows 3/4/5 + note — no compans_time/scribe/etc
//    lines at all, and no reg_desc2 duplication issue since it has its own note ──
{
  const out = App.GEN.lang(ctxFor('iifcl'));
  assertTrue(!out.includes('reg_compans_time'), 'iifcl: no compans_time line (never pasted)');
  assertTrue(!out.includes('reg_scribe_name'), 'iifcl: no scribe_name line (never pasted)');
  assertEq(out.split('\n').length, 4, 'iifcl: 3 pasted fields + note = 4 lines');
}

// ── escaping: single quotes and backslashes in label text must not break
//    the PHP string (synthetic — no real fixture happens to contain one) ──
{
  const fakeCtx = {
    parseA: {
      noteText: '',
      fields: [
        { postName: 'optdisability', isNote: false, langKey: 'reg_optdisability', label: "Candidate's \"disability\" status \\ notes" }
      ]
    }
  };
  const out = App.GEN.lang(fakeCtx);
  assertEq(out, "$LANG['reg_optdisability'] = 'Candidate\\'s \"disability\" status \\\\ notes';", 'escaping: single quote and backslash both escaped for a PHP single-quoted string');
}

// ── every Set 1 + Set 2 sample: no crash, output is a string ──
for (const key of ['bpcl', 'iifcl', 'nitr', 'csmc', 'cwc', 'set2b']) {
  const out = App.GEN.lang(ctxFor(key));
  assertTrue(typeof out === 'string', key + ': lang generates without crashing');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
