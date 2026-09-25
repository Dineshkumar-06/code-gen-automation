/* Generalization regression test — locks in behavior across all four real
   Set 1 SOWs (bpcl, iifcljul26, nitrjul26, csmcnov25), which differ in every
   way that matters: Sl No scheme, category naming, label language, and
   validation phrasing (see core/fixtures.js). cwcsep25/set2b/uiicl (Set 2/3)
   are checked separately below, each parsed against its own known layout
   (see FIXTURES.layoutFor() — layout selection is an explicit developer
   choice, not autodetected; see parsing/inputA.js, 2026-09-17).

   These are not byte-exact golden diffs (no reference PHP/JS exists for
   three of the four) — per the agreed acceptance basis, this checks
   plausibility: no crash, no unmatched labels, no unexpected warnings beyond
   the one known SOW data issue (csmcnov25's own point-ref typo), and the
   resolver reaching the right conditions where they can be independently
   verified against the reference HTML/JS logic patterns. */
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

function run(key, layoutOverride){
  const sample = App.FIXTURES.byKey(key);
  const A = App.parseInputA(sample.inputA, layoutOverride || App.FIXTURES.layoutFor(key));
  const B = App.parseInputB(sample.inputB);
  const R = App.resolveAll(A, B);
  const typeField = A.fields.filter(f => f.control === 'select+multiselect')[0];
  const groups = App.parseExclusions(typeField ? typeField.validations : '', R.typeIndex, R.warnings);
  return { A, B, R, groups };
}

// ── every Set 1 sample: zero unmatched labels against its own layout ──
for (const key of ['bpcl', 'iifcl', 'nitr', 'csmc']) {
  const { A } = run(key);
  assertEq(A.isSet2, false, key + ': set1 layout claims false for isSet2');
  const unmatched = A.warnings.filter(w => w.code === 'unmatched-label');
  assertEq(unmatched, [], key + ': zero unmatched labels');
}

// ── bpcl: full byte-level correctness already covered by run_resolver.js;
//    here just confirm the multi-sample harness agrees ──
{
  const { R, groups } = run('bpcl');
  assertEq(groups.map(g => g.codes), [['05','06','07','08','09','10','11'],['01','02'],['03','04']], 'bpcl: three exclusion groups');
  assertEq(R.warnings, [], 'bpcl: zero warnings');
}

// ── iifcljul26: comma-separated exclusion cluster (the real bug this
//    generalization fixed — used to silently drop 3 of 4 members) ──
{
  const { R, groups } = run('iifcl');
  assertEq(groups.length, 3, 'iifcl: three exclusion groups');
  assertEq(groups[2].codes.length, 4, 'iifcl: comma-separated cluster keeps all 4 members (was silently dropping to 1)');
  assertTrue(R.resolved.disability_type.enabledWhen.op === 'selected', 'iifcl: disability_type gated on disability_category being selected, not ==Y (it is a dropdown)', R.resolved.disability_type);
  assertEq(R.warnings, [], 'iifcl: zero warnings');
}

// ── nitrjul26: decimal/duplicate Sl Nos, dash-form point ref, unquoted
//    constraint name, comma+slash+OR mixed separators, and the one true gap
//    (ASD has no abbreviation in this SOW's own type list) surfaced not dropped ──
{
  const { R, groups } = run('nitr');
  assertEq(R.resolved.disabilitysuffersoc.constraint,
    { whenField: 'disability_type', op: 'includes', code: '10', shouldBe: 'Y' },
    'nitr: unquoted constraint name ("selected cerebral palsy in point no.- 4.1") resolves to Cerebral Palsy (10)');
  assertTrue(R.resolved.compans_time.enabledWhen.codes.includes('16') && R.resolved.compans_time.enabledWhen.codes.includes('17'),
    'nitr: compans_time picks up Mental Illness + SLD from "Mental Illness or Specific Learning Disability (SLD)/ASD"', R.resolved.compans_time);
  assertEq(groups.length, 3, 'nitr: three exclusion groups despite mixed comma/slash/& separators');
  const warningCodes = R.warnings.map(w => w.code);
  assertEq(warningCodes, ['value-name-unmatched', 'value-name-unmatched'], 'nitr: only the genuine ASD gap warns (both occurrences)');
}

// ── csmcnov25: bilingual labels resolve via translation-stripping; the
//    SOW's own point-ref typo ("point no 3" when rows start at 5) is
//    correctly caught rather than silently mis-resolved ──
{
  const { A, R, groups } = run('csmc');
  assertEq(A.fields.find(f => f.postName === 'optdisability').slNo, '5', 'csmc: bilingual optdisability label matched');
  assertEq(A.fields.find(f => f.postName === 'disability_type').slNo, '7', 'csmc: bilingual disability_type label matched');
  assertEq(groups.length, 2, 'csmc: two exclusion groups');
  assertEq(R.warnings.map(w => w.code), ['point-ref-unresolved'], 'csmc: only the SOWs own point-ref typo warns');
}

// ── cwcsep25 and set2b: picking the 'set3' layout claims both correctly
//    despite their different structural shapes (labels are what generalizes,
//    not dropdown count) — neither has a "Sub-Type of Disability for
//    <category>" routing dropdown, unlike uiicl's Set 2 shape below.
//    Layout is now an explicit developer choice (see parsing/inputA.js), so
//    there is no detection signal left to assert on — just that the choice
//    claims fields with zero unmatched labels. ──
{
  const { A } = run('cwc');
  assertTrue(A.isSet2, 'cwc (set3 layout): isSet2 true');
  assertEq(A.layoutShape, 3, 'cwc: shape 3 — one sub-type dropdown, no routing dropdown');
  // cwc has 3 genuinely SOW-specific rows this tool doesn't model at all
  // (a CWC-provided-scribe question, a scribe-qualification textbox) — these
  // warn as unmatched regardless of layout, not a layout-selection mistake.
  assertEq(A.warnings.filter(w => w.code === 'unmatched-label').length, 3, 'cwc: its 3 known unmodeled rows warn as unmatched');
}
{
  const { A } = run('set2b');
  assertTrue(A.isSet2, 'set2b (set3 layout): isSet2 true');
  assertEq(A.layoutShape, 3, 'set2b: shape 3 — the user flagged this as a third layout, 2026-09-11');
  assertEq(A.warnings.filter(w => w.code === 'unmatched-label'), [], 'set2b: zero unmatched labels');
}

// ── uiicljul26 IS the Set 2 shape: it has the routing dropdown, and it is
//    the only non-Set-1 sample with reference code for every output file ──
{
  const { A } = run('uiicl');
  assertEq(A.layoutShape, 2, 'uiicl (set2 layout): shape 2 — it has the "for MD/IDs" routing dropdown');
  assertEq(A.warnings.filter(w => w.code === 'unmatched-label'), [], 'uiicl: zero unmatched labels');
}

// ── picking the wrong layout for a paste is a real, visible mistake: it
//    claims fields against the wrong dictionary, which shows up as unmatched
//    labels rather than being silently corrected for you ──
{
  const sample = App.FIXTURES.byKey('cwc');
  const A = App.parseInputA(sample.inputA, 'set1');
  assertEq(A.isSet2, false, 'cwc read as set1: honours the (wrong) choice');
  assertEq(A.layoutShape, 1, 'cwc read as set1: shape follows the chosen layout');
  assertTrue(A.warnings.some(w => w.code === 'unmatched-label'), 'cwc read as set1: its Set 2/3-only rows now warn as unmatched');
}
{
  const sample = App.FIXTURES.byKey('bpcl');
  const A = App.parseInputA(sample.inputA, 'set2');
  assertEq(A.isSet2, true, 'bpcl read as set2: honours the (wrong) choice');
  assertTrue(A.warnings.some(w => w.code === 'unmatched-label'), 'bpcl read as set2: its Set 1-only rows (disability_category) now warn as unmatched');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
