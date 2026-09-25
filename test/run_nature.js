/* Set 1 with the "Type of Disability" / "Nature of Disability" naming
   (fixture `nature`, 2026-09-25). Structurally a Set 1 section, but each
   dropdown's label sits one step down from BPCL's:

       BPCL                   this SOW
       Disability Category    Type of Disability     -> disability_category
       Type of Disability     Nature of Disability   -> disability_type

   Read literally, row 5 claimed disability_type, row 6 matched nothing,
   Input B swallowed its own header row as a category, and every code was off
   by one. The same paste also carries two SOW typos this test pins the
   handling of: an unclosed popup quote and "Cerebral Pasy". */
const App = require('./harness.js');

let pass = 0, fail = 0;
function assertEq(actual, expected, label){
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; }
  else { fail++; console.log('FAIL:', label, '\n  actual:  ', a, '\n  expected:', e); }
}
function assertTrue(cond, label){ if (cond) pass++; else { fail++; console.log('FAIL:', label); } }

const sample = App.FIXTURES.byKey('nature');
const parseA = App.parseInputA(sample.inputA, 'set1');
const parseB = App.parseInputB(sample.inputB);
const bySl = {};
parseA.fields.forEach(f => { bySl[f.slNo] = f; });

/* ── Input A: the two dropdowns claim the right entries ─────────────────── */
assertEq(bySl['5'].postName, 'disability_category', 'row 5 "Type of Disability" is the category');
assertEq(bySl['6'].postName, 'disability_type', 'row 6 "Nature of Disability" is the type');
assertEq(bySl['6'].control, 'select+multiselect', 'and it keeps the category-E multi-select');
assertTrue(parseA.natureNaming, 'parseA reports the naming it used');
assertEq(parseA.warnings.filter(w => w.code === 'unmatched-label').length, 0, 'no unmatched labels');
assertEq(parseA.dropdownRows.map(r => r.slNo + ':' + r.role), ['5:category', '6:type (+ multi-select)'],
  'dropdownRows states which row became which dropdown (shown as a note, not a warning)');

/* ── Input B: "Nature of" is the narrower column, header is skipped ─────── */
assertEq(parseB.categories.map(c => c.label), ['a', 'b', 'c', 'd', 'e'], 'five categories, no header row');
assertEq(parseB.types.length, 17, 'seventeen types');
assertEq(parseB.types[0].name, 'Blindness  (B)', 'first type is the first data row, not the header');
assertEq(parseB.mapping['05'].split(',').length, 17, 'category e (MD) offers every type');

/* ── Only when a "Nature" row is present ────────────────────────────────── */
assertEq(App.DICT.usesNatureNaming(['type of disability', 'nature of disability']), true, 'type + nature -> nature naming');
assertEq(App.DICT.usesNatureNaming(['disability category', 'type of disability']), false, 'bpcl naming is untouched');
assertEq(App.DICT.usesNatureNaming(['type of disability']), false, 'a lone "Type of Disability" keeps bpcl\'s reading');
const lone = App.parseInputA('5\tType of Disability\tAlpha\t2\tConditional\tDrop down\tRefer other details\tBlank\tSelect one', 'set1');
assertEq(lone.fields[0].postName, 'disability_type', 'a paste with no "Nature" row still claims disability_type');
['bpcl', 'iifcl', 'nitr', 'csmc'].forEach(k => {
  const pa = App.parseInputA(App.FIXTURES.byKey(k).inputA, 'set1');
  assertTrue(!pa.natureNaming, k + ' is not read with the nature naming');
});
const set2 = App.parseInputA(App.FIXTURES.byKey('uiicl').inputA, 'set2');
assertTrue(!set2.natureNaming, 'Set 2 never uses it (its cell text says "Nature of Disability" too)');

/* ── Resolver ───────────────────────────────────────────────────────────── */
const r = App.resolveAll(parseA, parseB, {});
const codes = n => parseB.types.filter(t => n.test(t.name)).map(t => t.code);

assertEq(r.popupText.slice(0, 39), "Please select 'Yes' if you are eligible", 'popup found on the category row despite the missing close quote');
assertTrue(/in the exam\.$/.test(r.popupText), 'popup runs to the end of the cell');
assertEq(r.warnings.filter(w => w.code === 'popup-unterminated').length, 1, 'the missing quote is reported');

assertTrue(!r.resolved.optdisability, 'the root toggle gets no enabling condition from "point 5 to 13 should be enabled"');
assertEq(r.resolved.compans_time.enabledWhen,
  { field: 'disability_type', op: 'in', codes: codes(/autism|intellectual|learning|mental/i) },
  'compans_time: point no. 6 now resolves to the type dropdown');
const scribeIn = r.resolved.optscribe.enabledWhen.conditions.filter(c => c.op === 'in')[0];
assertEq(scribeIn.codes, codes(/blind|low vision|autism|intellectual|learning|mental/i), 'optscribe type codes');

// "Mandatorily Yes if "Cerebral Pasy" ..." — the misspelling is surfaced for
// the value-alias panel rather than dropped, and assigning it restores the rule.
const unmatched = r.warnings.filter(w => w.code === 'value-name-unmatched').map(w => w.abbrev);
assertEq(unmatched, ['Cerebral Pasy'], 'the misspelled name is offered for aliasing');
assertTrue(!r.resolved.disabilitysuffersoc.constraint, 'no constraint until it is assigned');
const cp = codes(/cerebral/i)[0];
const r2 = App.resolveAll(parseA, parseB, { 'Cerebral Pasy': cp });
assertEq(r2.resolved.disabilitysuffersoc.constraint,
  { whenField: 'disability_type', op: 'includes', code: cp, shouldBe: 'Y' },
  'assigned: the constraint hangs off point 6, not the "In point 4" before the phrase');

/* ── Exclusions ─────────────────────────────────────────────────────────── */
const src = App.exclusionSourceField(parseA);
const groups = App.parseExclusions(src.validations, r.typeIndex, r.warnings, r.categoryIndex);
assertEq(groups.map(g => g.codes), [codes(/\((OA|OL|BL|OAL ?)\)/), codes(/blind|low vision/i), codes(/deaf|hard of hearing/i)],
  'three exclusion groups, including the one missing its opening paren');

/* ── Generated output uses the paste's own labels on the right keys ─────── */
const ctx = { parseA, parseB, resolve: r2, exclusionGroups: groups, set2: null };
const lang = App.GEN.lang(ctx);
assertTrue(lang.includes("$LANG['reg_disability_category'] = 'Type of Disability';"), 'category LANG key carries "Type of Disability"');
assertTrue(lang.includes("$LANG['reg_disability_type'] = 'Nature of Disability';"), 'type LANG key carries "Nature of Disability"');
assertTrue(App.GEN.config(ctx).includes("'05'=>'e'"), 'config.php lists category e as 05, the multi-select category');

/* ── Row mapping overrides (step 2's Row mapping panel) ─────────────────── */
// A label no dictionary wording covers is unmatched, and a by-hand choice
// claims the field for it.
const odd = '5\tKind of impairment\tAlpha\t2\tConditional\tDrop down\tRefer other details\tBlank\tSelect one';
const oddA = App.parseInputA(odd, 'set1');
assertEq(oddA.fields[0].postName, null, 'an unknown label is unmatched');
assertTrue(/Row mapping/.test(oddA.warnings[0].msg), 'and the warning points at the Row mapping panel');
const oddB = App.parseInputA(odd, 'set1', { [oddA.fields[0]._row]: 'disability_type' });
assertEq(oddB.fields[0].postName, 'disability_type', 'a by-hand choice claims the field');
assertEq(oddB.fields[0].control, 'select+multiselect', 'with the entry\'s own control');
assertTrue(oddB.fields[0].mappedByHand, 'and is marked as set by hand');
assertEq(oddB.warnings.length, 0, 'no unmatched warning once mapped');

// A chosen field is out of the pool before label claiming, so the row that
// would otherwise have claimed it by label shows up unmatched instead of
// two rows silently sharing one field.
const r5 = bySl['5']._row, r6 = bySl['6']._row;
const swapped = App.parseInputA(sample.inputA, 'set1', { [r5]: 'disability_type' });
const sw = {}; swapped.fields.forEach(f => { sw[f.slNo] = f; });
assertEq(sw['5'].postName, 'disability_type', 'row 5 forced to the type dropdown');
assertEq(sw['6'].postName, null, 'row 6 can no longer claim it by label');

// '' means "do not generate this row", without an unmatched warning.
const dropped = App.parseInputA(sample.inputA, 'set1', { [r6]: '' });
const dr = dropped.fields.filter(f => f._row === r6)[0];
assertEq(dr.postName, null, 'a row set to "not generated" has no field');
assertEq(dropped.warnings.filter(w => w.code === 'unmatched-label').length, 0, 'and raises no unmatched warning');

/* ── Unfamiliar wording elsewhere (2026-09-25 follow-up) ────────────────── */

// Quoted references resolve against the paste's OWN labels first, so a row
// with wording no dictionary entry has — including one set by hand in Row
// mapping — can still be the target of `selected yes for "<label>"`.
const qA = [
  '4\tWhether PwBD candidate ?\tAlpha\t1\tYes\tRadio Button\tYES or NO\tBlank\tSelect Yes or No',
  '5\tAre you suffering from cerebral palsy and your writing speed is affected ?\tAlpha\t1\tConditional\tRadio Button\tYES or NO\tBlank\tEnabled & Mandatory if selected yes for "Whether PwBD candidate"'
].join('\n');
const qParse = App.parseInputA(qA, 'set1', { 0: 'optdisability' });
const qRes = App.resolveAll(qParse, parseB, {});
assertEq(qRes.resolved.disabilitysuffersoc.enabledWhen, { field: 'optdisability', op: '==', value: 'Y' },
  'a quote of a by-hand row\'s own label resolves to that row');
assertEq(qRes.warnings.filter(w => w.code === 'quoted-label-unresolved').length, 0, 'and raises nothing');

// A quote naming a question no row has is reported, not silently dropped.
const qMiss = App.resolveAll(App.parseInputA(qA, 'set1'), parseB, {});
assertEq(qMiss.warnings.filter(w => w.code === 'quoted-label-unresolved').length, 1,
  'an unresolvable quoted question is reported');
// Values and yes/no quotes are not questions: every fixture stays quiet.
App.FIXTURES.samples.forEach(s => {
  const a = App.parseInputA(s.inputA, App.FIXTURES.layoutFor(s.key));
  const w = App.resolveAll(a, App.parseInputB(s.inputB), {}).warnings.filter(x => x.code === 'quoted-label-unresolved');
  assertEq(w.length, 0, s.key + ': no false quoted-label warnings');
});

// Other Details with column names this tool does not know: a heading-like
// first row is skipped as the header, anything else is flagged.
const unknownHdr = App.parseInputB('Group\tDisability Name\nA\tBlindness\n\tLow Vision\nB\tDeaf');
assertEq(unknownHdr.categories.map(c => c.label), ['A', 'B'], 'an unknown header row is not read as a category');
assertEq(unknownHdr.types.map(t => t.name), ['Blindness', 'Low Vision', 'Deaf'], 'nor as a type');
assertEq(unknownHdr.warnings.map(w => w.code), ['inputb-header-guessed'], 'and the guess is stated');
const noHdr = App.parseInputB('A\tBlindness\n\tLow Vision\nB\tDeaf');
assertEq(noHdr.categories.map(c => c.label), ['A', 'B'], 'a headerless paste keeps its first row');
assertEq(noHdr.warnings.map(w => w.code), ['inputb-no-header'], 'but says no header was found');
App.FIXTURES.samples.forEach(s => {
  const w = App.parseInputB(s.inputB).warnings.filter(x => /header/.test(x.code));
  assertEq(w.length, 0, s.key + ': recognised header, no header warning');
});

// Every layout reports its dropdown rows.
assertEq(App.parseInputA(App.FIXTURES.byKey('bpcl').inputA, 'set1').dropdownRows.map(r => r.role),
  ['category', 'type (+ multi-select)'], 'bpcl dropdown rows');
assertEq(App.parseInputA(App.FIXTURES.byKey('uiicl').inputA, 'set2').dropdownRows.map(r => r.role),
  ['category', 'sub-type (routing category)', 'sub-type', 'multi-select'], 'uiicl dropdown rows');

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
