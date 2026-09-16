/* Phase 1 acceptance test — Input B parser against the BPCL fixture. */
const App = require('./harness.js');

let pass = 0, fail = 0;
function assertEq(actual, expected, label){
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; }
  else { fail++; console.log('FAIL:', label, '\n  actual:  ', a, '\n  expected:', e); }
}

const result = App.parseInputB(App.FIXTURES.inputB);

assertEq(result.categories.length, 5, 'category count');
assertEq(result.categories.map(c => c.label), ['A','B','C','D','E'], 'category letters in order');
assertEq(result.categories.map(c => c.code), ['01','02','03','04','05'], 'category codes');

assertEq(result.types.length, 20, 'type count (20 unique)');
assertEq(result.types[0], { code: '01', name: 'Blindness' }, 'type 01');
assertEq(result.types[19], { code: '20', name: 'Mental Illness' }, 'type 20');

assertEq(result.mapping['01'], '01,02', 'mapping A');
assertEq(result.mapping['02'], '03,04', 'mapping B');
assertEq(result.mapping['03'], '05,06,07,08,09,10,11,12,13,14,15,16', 'mapping C');
assertEq(result.mapping['04'], '17,18,19,20', 'mapping D');
assertEq(result.mapping['05'], '01,02,03,04,05,06,07,08,09,10,11,12,13,14,15,16,17,18,19,20', 'mapping E (all 20, reusing codes)');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
