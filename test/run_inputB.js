/* Phase 1 acceptance test — Input B parser: the BPCL fixture (one sub-type
   per row) plus the comma-separated-list shape cwcsep25 uses. */
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

function assertTrue(cond, label, extra){
  if (cond) { pass++; } else { fail++; console.log('FAIL:', label, extra !== undefined ? extra : ''); }
}

/* --- several sub-types on one line --------------------------------------
   cwcsep25 writes a whole group in a single cell where every other SOW gives
   each sub-type its own row with a blank category cell. Read literally that
   is one disability named "OL, OA, ADV, MDY, DR" -- unmatchable by any
   validation sentence, and offered to the candidate as one nonsense option. */
const listed = App.parseInputB(
  'Category\tSub-Category\n' +
  'OH\tOL, OA, ADV, MDY, DR\n' +
  'HH \tHH\n' +
  'VH\tLV');

assertEq(listed.categories.map(c => c.label), ['OH', 'HH', 'VH'], 'comma form: categories unaffected');
assertEq(listed.types.map(t => t.name), ['OL', 'OA', 'ADV', 'MDY', 'DR', 'HH', 'LV'],
  'comma form: the listed cell becomes five separate sub-types');
assertEq(listed.mapping['01'], '01,02,03,04,05', 'comma form: all five map to their category');
assertEq(listed.mapping['02'], '06', 'comma form: a single-value cell still yields one sub-type');
assertEq(listed.warnings.map(w => w.code), ['inputb-type-list-split'],
  'comma form: the split is reported, since it is where a name containing a comma would be torn in two');

/* Semicolons separate too; a slash NEVER does -- "MD/ID" is a single label in
   two of the real pastes, and a sub-type name may be spelled the same way. */
const semi = App.parseInputB('Category\tSub-Category\nOH\tOL; OA\nVH\tLV');
assertEq(semi.types.map(t => t.name), ['OL', 'OA', 'LV'], 'semicolons separate as well');

const slashed = App.parseInputB('Category\tSub-Category\nMD/ID\tAutism/ASD\nVH\tLV');
assertEq(slashed.categories.map(c => c.label), ['MD/ID', 'VH'], 'a slash in a category label is not a separator');
assertEq(slashed.types.map(t => t.name), ['Autism/ASD', 'LV'], 'a slash in a sub-type name is not a separator');

/* The one-per-row SOWs must be untouched: no split, and no warning that would
   send a developer looking for a problem that is not there. */
['bpcl', 'iifcl', 'nitr', 'csmc', 'uiicl', 'set2b'].forEach(key => {
  const b = App.parseInputB(App.FIXTURES.byKey(key).inputB);
  assertTrue(b.warnings.filter(w => w.code === 'inputb-type-list-split').length === 0,
    key + ': one-per-row paste is not reported as a list');
  assertTrue(b.types.every(t => t.name.indexOf(',') === -1),
    key + ': no sub-type name survives with a comma in it');
});

/* cwcsep25 lists its whole table TWICE, so the same cell is split twice and
   must be named once. */
const cwc = App.parseInputB(App.FIXTURES.byKey('cwc').inputB);
assertEq(cwc.types.length, 7, 'cwc: seven sub-types, not three');
assertEq((cwc.warnings[0].msg.match(/OL, OA, ADV, MDY, DR/g) || []).length, 1,
  'cwc: the repeated cell is named once in the warning');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
