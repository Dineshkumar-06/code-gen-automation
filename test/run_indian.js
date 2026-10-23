/* Indian Bank apprentices 2026-27 (fixture `indian`, references/SOW.xlsx) —
   a Set 2 paste the tool used to get badly wrong, checked against the user's
   own hand-coded reg_details.js and validation (2026-10-23).

   What it exercises, each of which was broken:
     - the multi-select offers what its Values cell lists ('Select from
       "OC/LD"/ VI/ HI/ SLD/ MI/ ASD'): three CATEGORY codes plus the routing
       category's sub-type codes, flat — not every sub-type in optgroups;
     - a named value gates on every dropdown that offers it AND precedes the
       row ("for VI or SLD/ MI/ ASD" -> category, subdistypeido, multi);
     - "in point no 9 & Point no 11" chains;
     - a category and sub-types named in one clause both survive;
     - row 18.11's "Sec 2( r )" still matches optdisability_40less;
     - the scribe JS tests the category (it used to exist only in PHP);
     - a sub-type change clears, but does not disable, the cerebral-palsy /
       dominant-hand pair.
   Codes are this paste's own (Input B order), so they are written literally. */
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

function ctxOf(inputA, inputB, layout){
  const parseA = App.parseInputA(inputA, layout);
  const parseB = App.parseInputB(inputB);
  const resolve = App.resolveAll(parseA, parseB);
  const src = App.exclusionSourceField(parseA);
  const exclusionGroups = App.parseExclusions(
    src ? src.validations : '', resolve.typeIndex, resolve.warnings, resolve.categoryIndex);
  return { parseA, parseB, resolve, exclusionGroups, set2: resolve.set2 || null };
}
function ctxFor(key){
  const s = App.FIXTURES.byKey(key);
  return ctxOf(s.inputA, s.inputB, App.FIXTURES.layoutFor(key));
}
function condStr(c){
  if (!c) return '';
  if (c.op === 'or') return c.conditions.map(condStr).sort().join(' | ');
  if (c.op === 'in') return c.field + ' in ' + c.codes.join(',');
  return c.field + ' ' + c.op + ' ' + (c.value || '');
}
function warnCodes(ctx){ return ctx.resolve.warnings.map(w => w.code); }

const C = ctxFor('indian');
const R = C.resolve.resolved;
const roles = C.set2;

// ── parsing ──────────────────────────────────────────────────────────────
const byRow = {};
C.parseA.fields.forEach(f => { byRow[f.slNo] = f.postName; });
assertEq(byRow['18.11'], 'optdisability_40less', '18.11 matches despite "Sec 2( r )"');
assertEq(byRow['18.12'], 'compensatory2', '18.12');
assertEq(byRow['18.13'], 'scribe1', '18.13');
assertEq(byRow['18.14'], 'disability_certify', '18.14');
assertLacks(warnCodes(C).join(','), 'unmatched-label', 'no row left unmatched');

// ── the multi-select's own option list ─────────────────────────────────────
assertEq(roles.mulFlat, true, 'multi-select options come from its Values cell');
assertEq(roles.mulOptionCodes, ['01', '02', '03', '14', '15', '16'], 'OC/LD, VI, HI + ASD, SLD, MI, Input B order');
assertEq(roles.mulOptions.map(o => o.name), ['OC/LD', 'VI', 'HI', 'ASD', 'SLD', 'MI'], 'option names');
assertTrue(warnCodes(C).indexOf('multi-values-from-column') !== -1, 'says where the list came from');
assertLacks(warnCodes(C).join(','), 'multi-values-unmatched', '"OC/LD" is not reported as "OC" and "LD"');
assertEq(App.codeListForField('sub_disability_multiple', C.parseA, C.parseB, roles).map(o => o.code),
  roles.mulOptionCodes, 'review panel offers the same list');

// ── resolved conditions = the user's hand-coded validation ──────────────────
assertEq(condStr(R.compans_time.enabledWhen),
  'sub_disability_multiple in 14,15,16 | subdistypeido in 14,15,16', 'row 13: point 9 & Point no 11');
assertEq(condStr(R.disabilitysuffersoc.enabledWhen),
  'disability_type in 01,03 | sub_disability_multiple in 01,03', 'row 14: OC/LD / HI under point 8 & point 11');
assertEq(condStr(R.compensatary_time.enabledWhen),
  'disability_type in 01,03 | sub_disability_multiple in 01,03', 'row 16');
assertEq(condStr(R.optscribe.enabledWhen),
  'compensatary_time == Y | disability_type in 02 | disabilitysuffersoc == Y | sub_disability_multiple in 02,14,15,16 | subdistypeido in 14,15,16',
  'row 18: VI or SLD/MI/ASD, from every dropdown above it');
// Hierarchy: row 10 comes BEFORE the multi-select, which offers HI/VI/OC/LD
// too, so it must not be gated by it.
assertLacks(condStr(R.sub_disability_type.enabledWhen), 'sub_disability_multiple', 'row 10 not gated by the later multi-select');
assertHas(condStr(R.sub_disability_type.enabledWhen), 'disability_type in 01,02,03', 'row 10 on the category');
assertEq(condStr(R.sub_disability_multiple.enabledWhen), 'subdistypeido in 17', 'row 11');

// ── config.php / functions.php ─────────────────────────────────────────────
const config = App.GEN.config(C);
assertHas(config, "$arr_mulsubDisabilityType2 = array(\n'01'=>'OC/LD',\n'02'=>'VI',\n'03'=>'HI',\n'14'=>'ASD',\n'15'=>'SLD',\n'16'=>'MI',\n);",
  'the multi-select array holds exactly the listed options');
assertHas(config, "'17'=>'01,02,03,14,15,16',", 'Multiple Disabilities opens that list');
const fn = App.GEN.functionsPhp(C);
assertLacks(fn, 'optgroup', 'PrintArrSub_disDetails is flat');
assertHas(fn, 'foreach ($arr_mulsubDisabilityType2 as $k => $v) {', 'one loop over the array');

// ── reg_details.js ───────────────────────────────────────────────────────
const js = App.GEN.detailsJs(C);
assertTrue((() => { try { new Function(js); return true; } catch (e) { return false; } })(), 'reg_details.js parses');
const sub = js.slice(js.indexOf('$("#sub_disability_type").change'), js.indexOf('$("#subdistypeido").change'));
assertHas(sub, '$(".disabilitysuffersoc,.compensatary_time").prop(\'checked\', false);', 'sub-type change clears the pair');
assertLacks(sub, ".disabilitysuffersoc\").prop({ 'disabled': true", 'but does not disable it');
const multi = js.slice(js.indexOf('$("#sub_disability_multiple").change'), js.indexOf('$(".optscribeset").click'));
assertHas(multi, "$(sel).val() == '01' || $(sel).val() == '03'", 'multi-select: OC/LD or HI opens the pair');
assertHas(multi, "$(sel).val() == '14' || $(sel).val() == '15' || $(sel).val() == '16'", 'multi-select: SLD/MI/ASD opens compans_time');
['$(".optscribeset").click', '$(".optscribesetchange").change'].forEach(h => {
  const body = js.slice(js.indexOf(h), js.indexOf('\n});\n', js.indexOf(h)));
  assertHas(body, 'var dsCat = $("#disability_type").val();', h + ' declares the category it tests');
  assertHas(body, "(dsCat == '02')", h + ': VI');
  assertHas(body, "(dsIdo == '14' || dsIdo == '15' || dsIdo == '16')", h + ': SLD/MI/ASD');
  assertHas(body, "$(sel).val() == '02' || $(sel).val() == '14' || $(sel).val() == '15' || $(sel).val() == '16'", h + ': multi-select');
});
const loader = js.slice(js.indexOf('function getSub_TypeMuldisability'));
assertLacks(loader, 'optgroup', 'multi-select loader builds a flat list');

// ── validations.php / reg_submit.php / reg_details.php ───────────────────────
const val = App.GEN.validations(C);
assertHas(val, 'in_array("14",$_POST[\'sub_disability_multiple\'],true)', 'compans_time validation reads the multi-select');
assertHas(val, "if ($_POST['sub_disability_type'] == '06') {", 'Cerebral palsy rule on the sub-type dropdown');
assertLacks(val, 'in_array("06"', 'and not on a multi-select that has no Cerebral palsy');
const submit = App.GEN.submit(C);
assertHas(submit, "$scribe = (($disability_type == '02' ||", 'submit keeps a VI candidate\'s scribe answer');
assertHas(submit, 'in_array("02",$_POST[\'sub_disability_multiple\'],true)', 'and one picked through the multi-select');
const php = App.GEN.detailsPhp(C);
assertHas(php, 'in_array("01", $disabilitymulti) || in_array("03", $disabilitymulti)', 'reg_details.php reload state reads the multi-select');

// ── the Values-cell rule's own gates, on variants of the same paste ──────────
const S = App.FIXTURES.byKey('indian');
// Row 11 is one line; its Values cell (column 7) is Excel-quoted, so it is
// replaced as a whole cell rather than by its text.
function withMultiRow(values, extraValidation){
  return S.inputA.split('\n').map(l => {
    if (l.indexOf('11\tSub-Type of Multiple Disability') !== 0) return l;
    const cells = l.split('\t');
    if (values != null) cells[6] = values;
    if (extraValidation) cells[8] += ' ' + extraValidation;
    return cells.join('\t');
  }).join('\n');
}
let v = ctxOf(withMultiRow('Select sub-types of OC/LD / VI / HI'), S.inputB, 'set2');
assertEq(v.set2.mulFlat, false, 'Values cell describing sub-types keeps the grouped list');
v = ctxOf(withMultiRow('List given in other details'), S.inputB, 'set2');
assertEq(v.set2.mulFlat, false, 'a Values cell naming nothing keeps the grouped list');
v = ctxOf(withMultiRow(null, 'Candidate can select only one disability from (OA/OL)'), S.inputB, 'set2');
assertEq(v.set2.mulFlat, false, 'an exclusion rule keeps the grouped list');
v = ctxOf(withMultiRow('Select from VI / OL / SLD'), S.inputB, 'set2');
assertEq(v.set2.mulFlat, false, 'VI (02) and OL (02) clash: grouped list');
assertTrue(warnCodes(v).indexOf('multi-values-code-clash') !== -1, 'and the clash is warned');

// ── the other Set 2/3 fixtures keep their grouped lists ──────────────────────
['uiicl', 'set2b'].forEach(k => assertEq(ctxFor(k).set2.mulFlat, false, k + ' (exclusion rule) stays grouped'));

// ── category scribe rule in a fixture that is not this one: cwc's "for VH" ──
const cwcJs = App.GEN.detailsJs(ctxFor('cwc'));
assertHas(cwcJs, "(dsCat == '03')", 'cwc: picking VH enables the scribe question in JS too');

console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
