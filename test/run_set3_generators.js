/* Set 3 — licjamar26, the one shape-3 SOW that has reference code.

   Shape 3 is "one sub-type dropdown serving every category, with Multiple
   Disabilities inside it opening the multi-select" — no routing dropdown.
   Until the reference for it arrived (2026-09-18) it generated on a
   best-effort basis with no way to check the result; the `set2b` fixture
   turned out to be byte-identical to that reference's own Basic/Other
   details pastes, so these assertions test the fixture the tool already
   shipped against the code the reference actually contains.

   Acceptance is the same basis as Set 2's, and for the same reason — the
   reference arrived as a pasted document, and its own config.php numbers
   codes from the reference application's historical master table rather
   than from the paste (user's call, 2026-09-11), so a byte-diff would be
   testing the wrong thing. What is asserted is the STRUCTURE the reference
   states, with this paste's own codes resolved through core/set2.js rather
   than written in literally. */
const App = require('./harness.js');

let pass = 0, fail = 0;
function assertEq(actual, expected, label){
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; }
  else { fail++; console.log('FAIL:', label, '\n  actual:  ', a, '\n  expected:', e); }
}
function assertTrue(cond, label, extra){
  if (cond) { pass++; } else { fail++; console.log('FAIL:', label, extra !== undefined ? '\n  ' + String(extra).slice(0, 400) : ''); }
}
function assertHas(hay, needle, label){
  assertTrue(hay.indexOf(needle) !== -1, label, 'missing: ' + needle);
}
function assertLacks(hay, needle, label){
  assertTrue(hay.indexOf(needle) === -1, label, 'unexpectedly present: ' + needle);
}

function ctxFor(key, manualAliases){
  const sample = App.FIXTURES.byKey(key);
  const parseA = App.parseInputA(sample.inputA, App.FIXTURES.layoutFor(key));
  const parseB = App.parseInputB(sample.inputB);
  const resolve = App.resolveAll(parseA, parseB, manualAliases);
  const src = App.exclusionSourceField(parseA);
  const exclusionGroups = App.parseExclusions(
    src ? src.validations : '', resolve.typeIndex, resolve.warnings, resolve.categoryIndex);
  return { parseA, parseB, resolve, exclusionGroups, set2: resolve.set2 || null };
}

const ctx = ctxFor('set2b');
const roles = ctx.set2;
const R = ctx.resolve;

/* ── structure: this really is shape 3 ─────────────────────────────────── */
assertEq(ctx.parseA.layoutShape, 3, 'licjamar26 parses as shape 3');
assertEq(roles.idoCategoryCode, null, 'shape 3 has no routing category');
assertEq(roles.multiTriggerField, 'sub_disability_type',
  'the single sub-type dropdown is what opens the multi-select');
const MUL = roles.multipleCode;
assertTrue(!!MUL, 'a "Multiple Disabilities" sub-type was found');
assertLacks(roles.mulOptionCodes.join(','), MUL,
  'the multi-select does not offer the entry that opened it (user call 2026-09-18)');

/* The one code the reference pins semantically rather than numerically. */
const CEREBRAL = (ctx.parseB.types.filter(t => /cerebral/i.test(t.name))[0] || {}).code;
assertTrue(!!CEREBRAL, 'Cerebral palsy is in the sub-type table');

/* ── resolver ──────────────────────────────────────────────────────────── */
// The category row's own cell quotes a popup message that names several
// disability types. None of them is an enablement condition: the row is
// gated on the root toggle and nothing else.
assertEq(R.resolved.disability_type.enabledWhen,
  { field: 'optdisability', op: '==', value: 'Y' },
  'the category dropdown is gated on the root toggle alone (no popup-text leakage)');

// "to VI, HI, LD, "ID/MD" candidates" — the fourth name is itself quoted,
// ahead of the message, and used to be cut off with the scan.
assertEq(R.popupCategories, ctx.parseB.categories.map(c => c.code).sort(),
  'the popup fires for every category the requirement names, quoted or not');

// 'Should be YES if "Cerebral palsy" is selected in 5 or Point no 6' — the
// EARLIEST reference is the scalar dropdown; the multi-select arm is added
// by the emitter, so it must not become the whenField itself.
assertEq(R.resolved.disabilitysuffersoc.constraint,
  { whenField: 'sub_disability_type', op: 'includes', code: CEREBRAL, shouldBe: 'Y' },
  'the cerebral-palsy constraint hangs off the sub-type dropdown');

/* ── exclusions ────────────────────────────────────────────────────────── */
// Two of the three rules resolve straight off the paste; the third names its
// members as bare initialisms Input B never spells out, so it is discarded —
// but every one of those initialisms must reach the alias panel.
assertEq(ctx.exclusionGroups.length, 2, 'two exclusion groups resolve unaided');
const unresolved = R.warnings.filter(w => w.code === 'exclusion-member-unresolved').map(w => w.abbrev);
assertEq(unresolved, ['OA', 'OL', 'BA', 'BL', 'OAL'],
  'the unresolvable members are offered for aliasing, not silently dropped');
assertTrue(R.warnings.filter(w => w.code === 'exclusion-cluster-too-small').length === 1,
  'the prose that merely DESCRIBES the rule is not mistaken for a fourth cluster');

// Assigning those five in the alias panel yields the reference's third group.
const byName = {};
ctx.parseB.types.forEach(t => { byName[t.name.trim()] = t.code; });
const aliased = ctxFor('set2b', {
  OA: byName['One Arm'], OL: byName['One Leg'], BA: byName['Both Arms'],
  BL: byName['Both Legs'], OAL: byName['One Arm and One Leg']
});
assertEq(aliased.exclusionGroups.length, 3, 'aliasing the initialisms yields all three reference groups');
assertEq(aliased.exclusionGroups[0].codes,
  [byName['One Arm'], byName['One Leg'], byName['Both Arms'], byName['Both Legs'], byName['One Arm and One Leg']].sort(),
  'the LD group is the five limb sub-types');

/* ── config.php ────────────────────────────────────────────────────────── */
const config = App.GEN.config(ctx);
assertLacks(config, '$arrDisabilityTypeIDO', 'no routing-dropdown array for a shape with no routing dropdown');
assertHas(config, '$arr_subDisability_map_Edit', 'the category -> sub-type map the ajax endpoint reads');
assertLacks(config, "// '", 'nothing is commented out: shape 3 excludes no category from the sub-type list');
// The reference keys this map on the "Multiple Disabilities" entry only.
const mulMap = config.slice(config.indexOf('$arr_MulsubDisability_map_Edit'));
assertEq((mulMap.match(/^'\d+'=>/gm) || []).length, 1,
  'the multi-select map has exactly one key');
assertHas(mulMap, "'" + MUL + "'=>'" + roles.mulOptionCodes.join(',') + "'",
  'that key is Multiple Disabilities, mapping to every other sub-type');

/* ── reg_details.php ───────────────────────────────────────────────────── */
const php = App.GEN.detailsPhp(ctx);
assertTrue(php.indexOf('$disabilitymulti = explode') < php.indexOf('in_array("', php.indexOf('$disabilitymulti')),
  '$disabilitymulti is defined before anything reads it');
assertTrue(php.indexOf('$disabilitymulti = explode') < php.indexOf('name="optdisability"'),
  '$disabilitymulti is set up at the top of the section, not mid-way down');
assertHas(php, "if (!($row_reg['disability'] == 'Y')) { ?>disabled",
  'the category dropdown is disabled unless the root answer is Yes');
assertHas(php, "if (!($row_reg['sub_disability_type'] == '" + MUL + "')) { ?>disabled",
  'the multi-select opens only on Multiple Disabilities');
// Shape 3's reference emits the hidden mirrors live, and its JS writes to them.
['hidden_benchmarkdisability', 'hidden_cerebral_scribe', 'hidden_dominant_scribe'].forEach(id => {
  assertHas(php, '<?php ?><input type="hidden" name="' + id + '"', id + ' is emitted live for shape 3');
});
assertLacks(php, '<?php /* ?><input type="hidden"', 'no hidden field is left commented out in shape 3');
assertLacks(php, 'subdistypeido', 'no routing dropdown is invented');

/* ── reg_details.js ────────────────────────────────────────────────────── */
const js = App.GEN.detailsJs(ctx);
let jsParses = true;
try { new Function(js); } catch (e) { jsParses = false; console.log('  JS parse error:', e.message); }
assertTrue(jsParses, 'reg_details.js parses as JavaScript');

// The flow shape 3 is built around, and the one that was missing entirely.
assertHas(js, '$("#sub_disability_type").change(function () {',
  'the sub-type dropdown gets a change handler');
const subHandler = js.slice(js.indexOf('$("#sub_disability_type").change'),
                            js.indexOf('$("#sub_disability_multiple").change'));
assertHas(subHandler, "if (df == '" + MUL + "') {", 'it opens the multi-select on Multiple Disabilities');
assertHas(subHandler, 'getSub_TypeMuldisability();', 'and repopulates it over ajax');
assertHas(subHandler, "$(\"#sub_disability_multiple\").prop('disabled', true);", 'and clears it otherwise');
assertLacks(subHandler, '$(".disabilitysuffersoc").prop',
  'it does NOT reset a pair that is gated on the root toggle, not on this dropdown');
assertHas(subHandler, "$(\"#hidden_cerebral_scribe,#hidden_dominant_scribe\").val('');",
  'the live hidden mirrors are blanked with the answers they mirror');

// The category dropdown has no routing dropdown to clear the stale list for it.
const catHandler = js.slice(0, js.indexOf('$("#sub_disability_type").change'));
assertHas(catHandler, '$("#sub_disability_multiple optgroup").remove();',
  'changing the category clears the multi-select it no longer matches');

// Answering Yes must switch back on whatever the root toggle alone enables.
const rootHandler = js.slice(js.indexOf('$(".optdisability").click'));
const yBranch = rootHandler.slice(rootHandler.indexOf("if ($(this).val() == 'Y')"), rootHandler.indexOf('} else {'));
assertHas(yBranch, "$(\"#disability_type\").prop('disabled', false);",
  'the category dropdown is re-enabled (nothing did this before, in either layout)');
assertHas(yBranch, "$(\".disabilitysuffersoc\").prop({ 'disabled': false, 'checked': false });",
  'the cerebral-palsy question is re-enabled');
assertHas(yBranch, "$(\".compensatary_time\").prop({ 'disabled': false, 'checked': false });",
  'the dominant-hand question is re-enabled');
assertLacks(yBranch, "$(\"#sub_disability_type\").prop('disabled', false);",
  'but not the sub-type dropdown, whose list is empty until a category is chosen');

// The ajax refetch must group exactly as PrintArrSub_disDetails does.
const labels = (js.match(/gr\d+\.label = "([^"]*)"/g) || []).map(s => s.replace(/.*"(.*)"/, '$1'));
assertEq(labels, ctx.parseB.categories.map(c => c.label.trim()),
  'the refetched multi-select is grouped by category, in Input B order');
const grouped = (js.match(/centre_code1 == '(\d+)'/g) || []).map(s => s.replace(/.*'(\d+)'/, '$1'));
assertEq(grouped.slice().sort(), roles.mulOptionCodes.slice().sort(),
  'every offered sub-type lands in exactly one optgroup');

/* ── reg_validations.php ───────────────────────────────────────────────── */
const val = App.GEN.validations(ctx);
assertLacks(val, "$_POST['optdisability'] == 'Y' && $_POST['optdisability'] == 'Y'",
  'a guard that IS the root toggle is not ANDed with itself');
assertHas(val, "if ($_POST['sub_disability_type'] == '" + CEREBRAL + "' || (is_array($_POST['sub_disability_multiple']) && in_array(\"" + CEREBRAL + "\",$_POST['sub_disability_multiple'],true))) {",
  'the cerebral-palsy constraint tests the scalar dropdown AND the multi-select');
assertHas(val, "array_key_exists($key, $arr_mulsubDisabilityType2) && $key != '" + MUL + "'",
  'the entry that opens the multi-select is rejected inside it');
// The reference validates this one via $mandatory_flds + an array_flip of
// the category's own code list; the emitter writes the same rule out as an
// explicit presence-then-membership check against the same list. Assert the
// rule, not the reference's spelling of it.
assertHas(val, '$arrDisTypeEdit = explode(",", $arr_subDisability_map_Edit[$_POST[\'disability_type\']]);',
  'the sub-type is checked against the chosen category\'s own code list');
assertHas(val, "!in_array($_POST['sub_disability_type'], $arrDisTypeEdit, true)",
  'a sub-type from another category is rejected');

/* ── reg_submit.php ────────────────────────────────────────────────────── */
const sub = App.GEN.submit(ctx);
assertLacks(sub, "$disability == 'Y' && $disability == 'Y'", 'no duplicated root conjunct on the submit side');
assertHas(sub, "$sub_disability_multiple = implode(\",\", $_POST['sub_disability_multiple']);",
  'the multi-select is stored as a CSV');
assertHas(sub, "$sub_disability_type == '" + MUL + "'", 'and only when Multiple Disabilities was chosen');

/* ── the remaining four files ──────────────────────────────────────────── */
const qry = App.GEN.qryArrays(ctx);
['"sub_disability_type",', '"sub_disability_multiple",', '"compans_time",'].forEach(line => {
  assertHas(qry, line, 'reg_qry_arrays.php lists ' + line.trim());
});
assertLacks(qry, '"optdisability"', 'reg_qry_arrays.php uses DB names, not POST names');

const ddl = App.GEN.queries(ctx);
assertHas(ddl, 'ADD `sub_disability_type`', 'the sub-type column is added');
assertHas(ddl, 'ADD `sub_disability_multiple`', 'the multi-select column is added');
assertHas(ddl, "ADD `compans_time` ENUM( 'Y', 'N' )", 'compans_time is an ENUM, from its control type');
assertLacks(ddl, 'ADD `disability_type`', 'a column already on the base table is not re-added');

const lang = App.GEN.lang(ctx);
assertHas(lang, "$LANG['reg_sub_disability_multiple'] = 'Sub-Type of Multiple Disability';",
  'the multi-select label is this SOW\'s own wording');

const print = App.GEN.print(ctx);
assertHas(print, '$arr_subDisabilityType2[$reg->sub_disability_type]', 'print.php resolves the sub-type name');
assertHas(print, 'explode(",", $reg->sub_disability_multiple)', 'print.php explodes the stored CSV');

// The sub-type dropdown's LANG key is the Set 3 reference's own
// (reg_sub_disability_type) in all four files that use it — Set 2's
// reference says reg_sub_disability, asserted in run_set2_generators.js.
[['reg_details.php', php], ['reg_validations.php', val], ['print.php', print], ['reg_details_lang.php', lang]]
  .forEach(function(p){
    assertHas(p[1], "'reg_sub_disability_type'", p[0] + ': uses reg_sub_disability_type');
    assertLacks(p[1], "'reg_sub_disability'", p[0] + ': no Set 2 key');
  });

/* ── cwc: shape 3 with no multi-select row at all ──────────────────────── */
const cwc = ctxFor('cwc');
assertEq(cwc.parseA.layoutShape, 3, 'cwc is shape 3 too');
const cwcJs = App.GEN.detailsJs(cwc);
let cwcParses = true;
try { new Function(cwcJs); } catch (e) { cwcParses = false; }
assertTrue(cwcParses, 'cwc reg_details.js parses');
assertLacks(cwcJs, 'getSub_TypeMuldisability', 'no multi-select helper for a paste with no multi-select');
assertLacks(App.GEN.detailsPhp(cwc), 'sub_disability_multiple', 'and no multi-select markup either');

console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
