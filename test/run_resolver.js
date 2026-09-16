/* Phase 3 acceptance test — resolver against the BPCL fixture.
   PRD §Phase-3 acceptance: row 7 -> disability_type in ['17','18','19','20'];
   row 8 -> optdisability=='Y' with a should-be-Y constraint on type '15';
   row 12 -> union of ['01','02','17','18','19','20'], cerebral palsy Y,
   dominant hand Y. Zero unresolved warnings. Popup text matches the
   reference alert() argument character-for-character. */
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

const parseA = App.parseInputA(App.FIXTURES.inputA);
const parseB = App.parseInputB(App.FIXTURES.inputB);
const result = App.resolveAll(parseA, parseB);

assertEq(result.warnings, [], 'zero warnings against the BPCL fixture');

assertEq(result.resolved.compans_time.enabledWhen, { field: 'disability_type', op: 'in', codes: ['17','18','19','20'] }, 'row 7 -> disability_type in [17,18,19,20]');

assertEq(result.resolved.disabilitysuffersoc.enabledWhen, { field: 'optdisability', op: '==', value: 'Y' }, 'row 8 -> optdisability == Y');
assertEq(result.resolved.disabilitysuffersoc.constraint, { whenField: 'disability_type', op: 'includes', code: '15', shouldBe: 'Y' }, 'row 8 -> should-be-Y constraint on type 15');

assertEq(result.resolved.compensatary_time.enabledWhen, { field: 'optdisability', op: '==', value: 'Y' }, 'row 10 -> optdisability == Y (Gap 1 alias)');
assertEq(result.resolved.compensatory.enabledWhen, { field: 'disabilitysuffersoc', op: '==', value: 'Y' }, 'row 9 -> disabilitysuffersoc == Y (Gap 2 previous-point)');
assertEq(result.resolved.compensatory1.enabledWhen, { field: 'compensatary_time', op: '==', value: 'Y' }, 'row 11 -> compensatary_time == Y (Gap 2 previous-point)');

const row12 = result.resolved.optscribe.enabledWhen;
assertTrue(row12.op === 'or', 'row 12 is an OR of conditions', row12);
const row12Codes = row12.conditions.find(c => c.op === 'in');
assertEq(row12Codes, { field: 'disability_type', op: 'in', codes: ['01','02','17','18','19','20'] }, 'row 12 -> disability_type in [01,02,17,18,19,20] (Gap 3: no 15)');
assertTrue(row12.conditions.some(c => JSON.stringify(c) === JSON.stringify({ field: 'disabilitysuffersoc', op: '==', value: 'Y' })), 'row 12 -> disabilitysuffersoc == Y branch present');
assertTrue(row12.conditions.some(c => JSON.stringify(c) === JSON.stringify({ field: 'compensatary_time', op: '==', value: 'Y' })), 'row 12 -> compensatary_time == Y branch present');
assertTrue(!row12Codes.codes.includes('15'), 'Gap 3: type 15 (Cerebral Palsy gloss) is NOT in row 12s code list');

const REFERENCE_POPUP = "Please select 'Yes' if you are eligible for and wish to use the services of a scribe for the exam. Only those candidates who are eligible for and opt for services of a scribe, will be permitted to use a scribe in the exam";
assertEq(result.popupText, REFERENCE_POPUP, 'popup text matches reference alert() argument character-for-character');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
