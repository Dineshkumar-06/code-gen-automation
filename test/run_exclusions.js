/* Phase 3 acceptance test — exclusion-group parser.
   PRD §Phase-3 acceptance: exactly three groups —
   ['05','06','07','08','09','10','11'], ['01','02'], ['03','04'] — every
   member resolved, including "BL (Both Legs)" matching the type list's
   "Both Leg". Plus two hand-written variants: single-cluster (no '*'
   bullets) and two-cluster. */
const App = require('./harness.js');

let pass = 0, fail = 0;
function assertEq(actual, expected, label){
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; }
  else { fail++; console.log('FAIL:', label, '\n  actual:  ', a, '\n  expected:', e); }
}

const parseA = App.parseInputA(App.FIXTURES.inputA);
const parseB = App.parseInputB(App.FIXTURES.inputB);
const typeIndex = App.buildTypeIndex(parseB.types);

const row5 = parseA.fields.find(f => f.slNo === '5');

// --- BPCL fixture: exactly three groups ---
{
  const warnings = [];
  const groups = App.parseExclusions(row5.validations, typeIndex, warnings);
  assertEq(groups.map(g => g.codes), [
    ['05','06','07','08','09','10','11'],
    ['01','02'],
    ['03','04']
  ], 'BPCL: exactly three groups with correct codes');
  assertEq(warnings, [], 'BPCL: no exclusion warnings (all members resolved, including BL->Both Leg)');
}

// --- Hand-written variant: single cluster, no '*' bullets ---
{
  const text = 'Blindness / low vision should not select together.';
  const warnings = [];
  const groups = App.parseExclusions(text, typeIndex, warnings);
  assertEq(groups.length, 1, 'single-cluster variant: one group produced');
  assertEq(groups[0].codes, ['01','02'], 'single-cluster variant: correct codes');
}

// --- Hand-written variant: two clusters ---
{
  const text = 'Candidate has to select more than 1 values but * One Arm / One Leg * Deaf & Hard of Hearing should not select together.';
  const warnings = [];
  const groups = App.parseExclusions(text, typeIndex, warnings);
  assertEq(groups.length, 2, 'two-cluster variant: two groups produced');
  assertEq(groups[0].codes, ['05','06'], 'two-cluster variant: group 1 codes');
  assertEq(groups[1].codes, ['03','04'], 'two-cluster variant: group 2 codes');
}

// --- No exclusion phrase at all ---
{
  const warnings = [];
  const groups = App.parseExclusions('Nothing relevant here.', typeIndex, warnings);
  assertEq(groups, [], 'no phrase: zero groups');
  assertEq(warnings.length, 1, 'no phrase: one warning raised');
  assertEq(warnings[0].code, 'no-exclusion-phrase', 'no phrase: correct warning code');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
