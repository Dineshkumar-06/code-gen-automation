/* Phase 2 acceptance test — Input A parser against the BPCL fixture (rows 3-22). */
const App = require('./harness.js');

let pass = 0, fail = 0;
function assertEq(actual, expected, label){
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; }
  else { fail++; console.log('FAIL:', label, '\n  actual:  ', a, '\n  expected:', e); }
}
function assertTrue(cond, label){
  if (cond) { pass++; } else { fail++; console.log('FAIL:', label); }
}

const result = App.parseInputA(App.FIXTURES.inputA);

assertEq(result.fields.length, 20, 'total rows parsed (3,4,5,6,7,8,9,10,11,12,12.1-12.4,17-22)');
assertEq(result.warnings.length, 0, 'no unmatched-label warnings');

// rows 3-12 (10 rows including the note) — PRD §Phase-2 acceptance
const rows3to12 = result.fields.filter(f => ['3','4','5','6','7','8','9','10','11','12'].indexOf(f.slNo) !== -1);
assertEq(rows3to12.length, 10, 'ten field objects for rows 3-12');

function byPostName(pn){ return result.fields.find(f => f.postName === pn); }

assertEq(byPostName('optdisability').slNo, '3', 'row 3 -> optdisability');
assertEq(byPostName('disability_category').slNo, '4', 'row 4 -> disability_category');
assertEq(byPostName('disability_type').slNo, '5', 'row 5 -> disability_type');
assertEq(byPostName('compans_time').slNo, '7', 'row 7 -> compans_time');
assertEq(byPostName('disabilitysuffersoc').slNo, '8', 'row 8 -> disabilitysuffersoc');

// The two disambiguation traps.
assertEq(byPostName('compensatary_time').slNo, '10', 'row 10 -> compensatary_time (dominant-hand trap)');
assertEq(byPostName('compensatory').slNo, '9', 'row 9 (1st occurrence) -> compensatory');
assertEq(byPostName('compensatory1').slNo, '11', 'row 11 (2nd occurrence) -> compensatory1');
assertEq(byPostName('optscribe').slNo, '12', 'row 12 (1st occurrence) -> optscribe');
assertEq(byPostName('scribe1').slNo, '12.3', 'row 12.3 (2nd occurrence of same label) -> scribe1');

// note row
const noteField = result.fields.find(f => f.isNote);
assertTrue(!!noteField, 'note row (6) detected');
assertEq(result.noteText, 'To select multiple disabilities please hold the CTRL key and click on the disabilities', 'note text extracted');

// 12.1-12.4 constant subtree
assertEq(byPostName('optdisability_40less').slNo, '12.1', 'row 12.1 -> optdisability_40less');
assertEq(byPostName('compensatory2').slNo, '12.2', 'row 12.2 -> compensatory2');
assertEq(byPostName('disability_certify').slNo, '12.4', 'row 12.4 -> disability_certify');
assertTrue(byPostName('optdisability_40less').constant === true, '12.1-12.4 rows flagged constant');

// 17-22 constant subtree
assertEq(byPostName('scribe_name').slNo, '17', 'row 17 -> scribe_name');
assertEq(byPostName('card_no_scribe').slNo, '19', 'row 19 -> card_no_scribe');
assertEq(byPostName('edu_qual_for_scribe').slNo, '22', 'row 22 -> edu_qual_for_scribe');
assertTrue(byPostName('scribe_name').constant === true, '17-22 rows flagged constant');

// validations text preserved byte-for-byte (whole cell, including internal whitespace runs)
const row5 = result.fields.find(f => f.slNo === '5');
assertTrue(row5.validations.indexOf('should not select together') !== -1, 'row 5 validations text intact (exclusion phrase present)');
assertTrue(row5.validations.indexOf('A popup message should be displayed') !== -1, 'row 5 validations text intact (popup phrase present)');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
