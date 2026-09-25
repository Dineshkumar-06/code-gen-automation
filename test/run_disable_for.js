/* "Disable for <value>" exclusions (2026-09-16).

   Bug reported by the user: a real SOW's compans_time row read "Enabled and
   Mandatory if selected yes for '<root toggle>'. Disable for Low Vision" —
   a base enable rule plus a named exception. "Disable"/"Disabled" contains
   neither "enabled" nor "mandatory", so resolveEnablement's own sentence
   filter (ENABLEMENT_RE) silently dropped the exception sentence entirely,
   leaving `compans_time.enabledWhen` a plain `optdisability == 'Y'` gate.
   That shape has no 'in' condition anywhere, and detailsJs.js/
   validationsPhp.js/submitPhp.js's own `compansCodes()` ONLY know how to
   read an 'in' condition — no 'in' means every one of them silently emitted
   `if(false)`/`(0)`, i.e. compans_time was never enabled by ANY of the
   generated code, in any of the four files that touch it.

   Built with hand-constructed parseA/parseB rather than through
   App.parseInputA, same as run_exclusions.js's hand-written variants —
   isolates the resolver's own new behaviour from TSV-quoting concerns,
   which are covered elsewhere (test/run_inputA.js). */
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

const TYPES = [
  { code: '01', name: 'Low vision (LV)' },
  { code: '02', name: 'Hard of Hearing (HH)' },
  { code: '03', name: 'One Arm (OA)' },
  { code: '04', name: 'Cerebral Palsy (CP)' },
  { code: '05', name: 'Autism Spectrum Disorder (ASD) (M)' }
];
const CATEGORIES = [
  { code: '01', label: 'A' }, { code: '02', label: 'B' },
  { code: '03', label: 'C' }, { code: '04', label: 'D' }
];

function field(postName, slNo, control, validations){
  return { postName, slNo, control, validations, isNote: false, constant: false };
}

function parseAWith(fields, isSet2){
  return { fields, warnings: [], noteText: '', isSet2: !!isSet2, layoutShape: isSet2 ? 2 : 1 };
}
function parseBWith(mapping){
  return { types: TYPES, categories: CATEGORIES, mapping: mapping || {}, warnings: [] };
}

// ── Set 1: the reported shape exactly — a root-toggle-only base condition
//    plus "Disable for Low Vision" and nothing else. Must become a positive
//    inclusion list of every OTHER type, not stay a bare '==' gate. ──
{
  const fields = [
    field('optdisability', '1', 'radio', ''),
    field('disability_type', '2', 'select+multiselect', ''),
    field('compans_time', '3', 'radio',
      'Enabled and Mandatory if selected yes for "Are you a person with benchmark disability".\nDisable for Low Vision')
  ];
  const parseA = parseAWith(fields);
  const parseB = parseBWith();
  const result = App.resolveAll(parseA, parseB);

  assertEq(result.resolved.compans_time.enabledWhen,
    { field: 'disability_type', op: 'in', codes: ['02','03','04','05'] },
    'root-toggle-only base + disable-for-LV -> disability_type in [every OTHER code]');

  assertTrue(result.warnings.some(w => w.code === 'disable-for-applied'),
    'a disable-for-applied warning is raised so the substitution is reviewable', result.warnings);

  // The 4 real consumers must now see a usable code list, not "no codes".
  const ctx = { parseA, parseB, resolve: result };
  const submit = App.GEN.submit(ctx);
  assertTrue(submit.includes("in_array('02',$disability_type_arr)") && !submit.includes('&& (0))'),
    'submitPhp.js: $compans_time gate lists the real codes, not the literal 0-codes fallback');
}

// ── A positive value list ALREADY exists (optscribe's own real shape: an OR
//    with an 'in' member) — the exclusion must narrow THAT list in place,
//    not replace the whole OR with a synthesized one. ──
{
  const fields = [
    field('optdisability', '1', 'radio', ''),
    field('disability_type', '2', 'select+multiselect', ''),
    field('disabilitysuffersoc', '3', 'radio', ''),
    field('optscribe', '4', 'radio',
      'Enabled and Mandatory for Low Vision / Hard of Hearing selected YES in point 3.\nDisable for Low Vision')
  ];
  const parseA = parseAWith(fields);
  const parseB = parseBWith();
  const result = App.resolveAll(parseA, parseB);

  const cond = result.resolved.optscribe.enabledWhen;
  const inCond = (cond.op === 'or' ? cond.conditions : [cond]).find(c => c.op === 'in' && c.field === 'disability_type');
  assertTrue(!!inCond, 'optscribe still resolves to an in-condition on disability_type', cond);
  assertEq(inCond.codes, ['02'], 'Low Vision (01) is removed from the already-resolved list, Hard of Hearing (02) stays');
}

// ── No disability-type field in the paste at all — the exclusion has
//    nothing to attach to. Must warn, not crash, and leave the base
//    condition exactly as resolveEnablement found it. ──
{
  const fields = [
    field('optdisability', '1', 'radio', ''),
    field('compans_time', '2', 'radio',
      'Enabled and Mandatory if selected yes for "Are you a person with benchmark disability".\nDisable for Low Vision')
  ];
  const parseA = parseAWith(fields);
  const parseB = parseBWith(); // real types, so "Low Vision" DOES resolve to a code —
                                // the point being tested is having nowhere to attach it
  const result = App.resolveAll(parseA, parseB);

  assertEq(result.resolved.compans_time.enabledWhen, { field: 'optdisability', op: '==', value: 'Y' },
    'no type field to attach to -> base condition is left untouched');
  assertTrue(result.warnings.some(w => w.code === 'disable-for-unattached'),
    'a disable-for-unattached warning explains why nothing changed', result.warnings);
}

// ── An OR of several unrelated facts, none of them an 'in' on the type
//    field — not a shape this has been taught to combine with an exclusion.
//    Must warn and leave everything alone rather than guess. ──
{
  const fields = [
    field('optdisability', '1', 'radio', ''),
    field('disability_type', '2', 'select+multiselect', ''),
    field('disabilitysuffersoc', '3', 'radio', ''),
    field('compensatary_time', '4', 'radio', ''),
    field('optscribe', '5', 'radio',
      'Enabled and Mandatory if selected yes in point 3 or selected yes in point 4.\nDisable for Low Vision')
  ];
  const parseA = parseAWith(fields);
  const parseB = parseBWith();
  const result = App.resolveAll(parseA, parseB);

  const before = { op: 'or', conditions: [
    { field: 'disabilitysuffersoc', op: '==', value: 'Y' },
    { field: 'compensatary_time', op: '==', value: 'Y' }
  ] };
  assertEq(result.resolved.optscribe.enabledWhen, before, 'an unrelated OR-of-facts shape is left exactly as resolved, untouched by the exclusion');
  assertTrue(result.warnings.some(w => w.code === 'disable-for-unresolved'),
    'a disable-for-unresolved warning flags that the exclusion could not be safely combined', result.warnings);
}

// ── Set 2/3: the same exclusion, routed against the split sub-type fields
//    rather than a single disability_type dropdown. ──
{
  const fields = [
    field('optdisability', '1', 'radio', ''),
    field('disability_type', '2', 'select', ''),
    field('subdistypeido', '3', 'select', 'Enabled if selected D in point no 2'),
    field('sub_disability_type', '4', 'select', ''),
    field('compans_time', '5', 'radio',
      'Enabled and Mandatory if selected yes for "root".\nDisable for Cerebral Palsy')
  ];
  const parseA = parseAWith(fields, true);
  // Category D (04) routes through subdistypeido (named in its own row
  // above) and holds only ASD (05); everything else — Low Vision/HH/One
  // Arm/Cerebral Palsy, categories A/B/C — goes through sub_disability_type.
  const parseB = parseBWith({ '01': '01', '02': '02', '03': '03,04', '04': '05' });
  const result = App.resolveAll(parseA, parseB);

  const cond = result.resolved.compans_time.enabledWhen;
  const conds = cond.op === 'or' ? cond.conditions : [cond];
  const ido = conds.find(c => c.field === 'subdistypeido');
  const other = conds.find(c => c.field === 'sub_disability_type');
  assertEq(ido, { field: 'subdistypeido', op: 'in', codes: ['05'] },
    'Set 2/3: subdistypeido keeps its own full list — Cerebral Palsy (04) is not one of its codes anyway');
  assertEq(other, { field: 'sub_disability_type', op: 'in', codes: ['01','02','03'] },
    'Set 2/3: sub_disability_type excludes Cerebral Palsy (04) specifically');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
