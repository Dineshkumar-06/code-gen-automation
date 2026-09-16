/* Set 2 — Phase S2-2: resolver + exclusion groups for uiicljul26.

   Every expectation below is read off the Set 2 reference code in
   "set 2 references.txt" (reg_details.php's disabled= conditions,
   reg_validations.php's if() gates and reg_submit.php's NULL guards all agree
   with each other), translated into THIS paste's own document-order codes:

     categories   01=VI  02=HI  03=OC  04=MD/ID
     sub-types    01=Blind 02=Low vision 03=Deaf 04=Hard of Hearing
                  05..17 = OC's thirteen, 18=ASD 19=SLD 20=MI
                  21=Intellectual Disability 22=Multiple Disabilities

   (The reference's own config.php numbers these differently — see
   generators/config2.js's header for why that is not a divergence.) */
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

const sample = App.FIXTURES.byKey('uiicl');
const parseA = App.parseInputA(sample.inputA);
const parseB = App.parseInputB(sample.inputB);
const R = App.resolveAll(parseA, parseB);
const cond = k => JSON.parse(JSON.stringify(R.resolved[k] && R.resolved[k].enabledWhen));

const IN = (field, codes) => ({ field, op: 'in', codes });
const EQ = (field, value) => ({ field, op: '==', value });
const OR = (...conditions) => ({ op: 'or', conditions });

// ── structural roles (core/set2.js) ──
{
  const roles = App.SET2.roles(parseA, parseB);
  assertEq(roles.idoCategoryCode, '04', 'roles: MD/ID is the routing category');
  assertEq(roles.idoCategoryLabel, 'MD/ID', 'roles: routing category label');
  assertEq(roles.idoTypeCodes, ['18', '19', '20', '21', '22'], 'roles: MD/ID sub-type codes');
  assertEq(roles.multipleCode, '22', 'roles: "Multiple Disabilities" code');
  assertEq(roles.multiTriggerField, 'subdistypeido', 'roles: subdistypeido opens the multi-select');
  assertEq(roles.subTypeCategories.map(c => c.label), ['VI', 'HI', 'OC'], 'roles: the other three categories');
  assertEq(roles.mulOptionCodes.length, 21, 'roles: multi-select offers every sub-type but "Multiple Disabilities"');
  assertEq(roles.warnings, [], 'roles: no warnings — both signals agree');
}

// ── per-field enablement, checked against the reference's own PHP ──
assertEq(cond('disability_type'), EQ('optdisability', 'Y'),
  'disability_type <- optdisability==Y   (ref: disabled if $row_reg[disability] != Y)');

assertEq(cond('subdistypeido'), IN('disability_type', ['04']),
  'subdistypeido <- disability_type is MD/ID   (ref: disabled if disability_type != 04)');

assertEq(cond('sub_disability_multiple'), IN('subdistypeido', ['22']),
  'sub_disability_multiple <- subdistypeido is Multiple Disabilities   (ref: disabled if subdistypeido != 25)');

// ref: disabled if disability=='' || =='N' || disability_type=='' || =='04',
// i.e. enabled for exactly the three non-routing categories.
assertEq(cond('sub_disability_type'),
  OR(EQ('optdisability', 'Y'), IN('disability_type', ['01', '02', '03'])),
  'sub_disability_type <- optdisability==Y OR one of the three non-routing categories');

// ref: (subdistypeido in 15,16,17,19) || multi contains any of those four
assertEq(cond('compans_time'),
  OR(IN('subdistypeido', ['18', '19', '20', '21']),
     IN('sub_disability_multiple', ['18', '19', '20', '21'])),
  'compans_time <- ASD/SLD/MI/Intellectual Disability, via subdistypeido or the multi-select');

// ref: disability_type=='01'(OC) || =='03'(HI) || multi contains any OC/HI sub-type
const OC_HI = OR(
  IN('disability_type', ['02', '03']),                      // HI, OC
  IN('sub_disability_multiple',
     ['03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17'])
);
assertEq(cond('disabilitysuffersoc'), OC_HI, 'disabilitysuffersoc <- OC/HI category, or any OC/HI sub-type in the multi-select');
assertEq(cond('compensatary_time'), OC_HI, 'compensatary_time <- same condition as disabilitysuffersoc');

assertEq(cond('compensatory'), EQ('disabilitysuffersoc', 'Y'), 'compensatory <- disabilitysuffersoc==Y');
assertEq(cond('compensatory1'), EQ('compensatary_time', 'Y'), 'compensatory1 <- compensatary_time==Y');

// ref: (multi contains 10,11,15,16,17,19) || (subdistypeido in 15,16,17,19)
//      || (sub_disability_type in 10,11) || disabilitysuffersoc=='Y' || compensatary_time=='Y'
assertEq(cond('optscribe'),
  OR(IN('subdistypeido', ['18', '19', '20', '21']),
     IN('sub_disability_type', ['01', '02']),
     IN('sub_disability_multiple', ['01', '02', '18', '19', '20', '21']),
     EQ('disabilitysuffersoc', 'Y'),
     EQ('compensatary_time', 'Y')),
  'optscribe <- Blind/Low Vision or ASD/SLD/MI/ID routed per dropdown, plus the two Y-flags');

// The SOW writes "Blindness"; Input B writes "Blind  (B)". Dropping it would
// silently narrow the scribe condition (and would not raise an
// unresolved-abbreviation warning, since it is not an abbreviation).
assertTrue(cond('optscribe').conditions
  .some(c => c.field === 'sub_disability_type' && c.codes.indexOf('01') !== -1),
  'optscribe: "Blindness" resolved to Input B\'s "Blind  (B)"');

// ── value constraint: "Should be YES if Cerebral palsy is selected in 6" ──
assertEq(R.resolved.disabilitysuffersoc.constraint,
  { whenField: 'sub_disability_type', op: 'includes', code: '14', shouldBe: 'Y' },
  'disabilitysuffersoc constraint <- Cerebral Palsy on sub_disability_type');

// ── popups ──
assertTrue(/Please select 'Yes', if you are VI, OC/.test(R.popupText),
  'popupText read from the Set 2 category row, not from a Set 1 type row', R.popupText);
// The Appendix-II popup is WRITTEN on row 15 (compensatory2) but says
// 'in pt. no. 16'. The reference reg_details.js hangs it off .scribe1 (row
// 16), so the OWNER is the point the sentence names, not the row it sits on.
assertEq(R.fieldPopups, {
  optscribe: 'Please provide the relevant scribe form as per the format indicated in the advertisement (Appendix-I)',
  scribe1:   'Please provide the relevant scribe form as per the format indicated in the advertisement (Appendix-II)'
}, 'per-field popups, each owned by the point its sentence names');
{
  const row15 = parseA.fields.filter(f => f.slNo === '15')[0];
  assertTrue(/Appendix-II/.test(row15.validations), 'sanity: the Appendix-II text really is written on row 15');
  assertEq(row15.postName, 'compensatory2', 'sanity: row 15 is compensatory2, not scribe1');
}

// ── no surprises ──
assertEq(R.warnings.map(w => w.code), ['set2-layout'],
  'uiicl resolves with only the informational layout notice', R.warnings.map(w => w.msg));

// ── exclusion groups: Set 2 states them as numbered "only one ... from" lines ──
{
  const src = App.exclusionSourceField(parseA);
  assertEq(src.postName, 'sub_disability_multiple', 'exclusion source is the Sub-Type of Multiple Disability row');

  const w = [];
  const groups = App.parseExclusions(src.validations, R.typeIndex, w);
  assertEq(groups.length, 3, 'three exclusion groups, matching the reference');
  assertEq(groups[0].codes, ['05', '06', '07', '08', '09', '10', '11', '12'],
    'group 1: the eight OC mobility sub-types (OA/OL/BL/OAL/BA/BLA/BLOA/BAOL)');
  assertEq(groups[1].codes, ['01', '02'], 'group 2: Blind / Low vision');
  assertEq(groups[2].codes, ['03', '04'], 'group 3: Deaf / Hard of Hearing');
  assertEq(groups[1].message, 'Blind  (B) & Low vision (LV)',
    'group message uses Input B\'s own spelling, not the prose\'s ("Blind/Low Vision")');
  assertEq(w, [], 'no exclusion warnings — "Candidate can select only one Nature of Disability." is not a cluster');
}

// ── a Set 2 multi-select with no exclusion rule is a normal outcome ──
{
  const w = [];
  const groups = App.parseExclusions('Should be enabled and mandatory if selected Multiple Disabilities in point no 5.1.', R.typeIndex, w);
  assertEq(groups, [], 'no exclusion prose -> no groups');
  assertEq(w.map(x => x.code), ['no-exclusion-phrase'], 'no exclusion prose -> one informational warning');
}

// ── Set 1 is untouched: bpcl still parses its own "*"-delimited clusters ──
{
  const pa = App.parseInputA(App.FIXTURES.byKey('bpcl').inputA);
  const pb = App.parseInputB(App.FIXTURES.byKey('bpcl').inputB);
  const r = App.resolveAll(pa, pb);
  const src = App.exclusionSourceField(pa);
  assertEq(src.postName, 'disability_type', 'bpcl: exclusion source is still the Type of Disability row');
  const groups = App.parseExclusions(src.validations, r.typeIndex, []);
  assertEq(groups.map(g => g.codes), [
    ['05', '06', '07', '08', '09', '10', '11'], ['01', '02'], ['03', '04']
  ], 'bpcl: three groups unchanged');
}

// ── no crash across every fixture ──
App.FIXTURES.samples.forEach(s => {
  try {
    const pa = App.parseInputA(s.inputA), pb = App.parseInputB(s.inputB);
    const r = App.resolveAll(pa, pb);
    const src = App.exclusionSourceField(pa);
    App.parseExclusions(src ? src.validations : '', r.typeIndex, []);
    pass++;
  } catch (e) { fail++; console.log('FAIL: crash on fixture', s.key, e.message); }
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
