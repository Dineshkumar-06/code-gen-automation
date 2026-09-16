/* Human-readable resolver report across every fixture.
   Not a pass/fail test — this is the "eyeball it" view for SOWs that have no
   reference code to diff against (iifcljul26, nitrjul26, csmcnov25, set2b,
   cwcsep25), per the agreed acceptance basis: plausibility + correct
   warnings. Set-2-aware: it reports the structural roles core/set2.js derived
   and reads the exclusion rule off whichever row actually is the
   multi-select. */
const App = require('./harness.js');

function condStr(c){
  if (!c) return '(none)';
  if (c.op === 'or') return c.conditions.map(condStr).join('  OR  ');
  if (c.op === 'in') return `${c.field} in [${c.codes.join(',')}]`;
  if (c.op === 'selected') return `${c.field} is selected`;
  return `${c.field} == '${c.value}'`;
}

const only = process.argv[2];

for (const s of App.FIXTURES.samples) {
  if (only && s.key !== only) continue;

  const A = App.parseInputA(s.inputA);
  const B = App.parseInputB(s.inputB);
  const R = App.resolveAll(A, B);
  // Whichever row IS the multi-select carries the exclusion rule — the Type
  // of Disability row in Set 1, Sub-Type of Multiple Disability in Set 2.
  const exclSource = App.exclusionSourceField(A);
  const groups = App.parseExclusions(exclSource ? exclSource.validations : '', R.typeIndex, R.warnings);

  console.log(`\n${'='.repeat(74)}\n${s.name}  (set ${s.set})\n${'='.repeat(74)}`);

  if (A.isSet2) {
    const roles = App.SET2.roles(A, B);
    console.log(`\nlayout: SET 2 — "${roles.idoCategoryLabel || '(none)'}" routes through ` +
      `subdistypeido; "Multiple Disabilities" = ${roles.multipleCode || '(not found)'}; ` +
      `multi-select opened by ${roles.multiTriggerField || '(nothing)'}`);
  }

  console.log(`\ncategories: ${B.categories.map(c => c.code + '=' + c.label).join('  ')}`);
  console.log(`types (${B.types.length}): ${B.types.map(t => t.code + '=' + t.name).join('  ')}`);

  console.log('\nresolved conditions:');
  const keys = Object.keys(R.resolved);
  if (!keys.length) console.log('  (none)');
  for (const k of keys) {
    const r = R.resolved[k];
    console.log(`  ${(r.slNo || '-').padStart(5)}  ${k.padEnd(22)} ${condStr(r.enabledWhen)}`);
    if (r.constraint) {
      console.log(`${''.padEnd(30)}constraint: ${r.constraint.whenField} includes '${r.constraint.code}' => must be '${r.constraint.shouldBe}'`);
    }
  }

  console.log('\nexclusion groups:');
  if (!groups.length) console.log('  (none)');
  groups.forEach((g, i) => {
    const names = g.codes.map(c => (B.types.find(t => t.code === c) || {}).name || c);
    console.log(`  ${i + 1}. [${g.codes.join(',')}]  ${names.join(' / ')}`);
  });

  console.log(`\npopup: ${R.popupText ? '"' + R.popupText + '"' : '(none)'}`);
  if (R.popupCategories) console.log(`popup fires for categories: [${R.popupCategories.join(',')}]`);
  const fp = Object.keys(R.fieldPopups || {});
  if (fp.length) {
    console.log('per-field popups:');
    fp.forEach(k => console.log(`  ${k}: "${R.fieldPopups[k]}"`));
  }

  console.log(`\nwarnings (${R.warnings.length}):`);
  if (!R.warnings.length) console.log('  none');
  R.warnings.forEach(w => console.log(`  [${w.code}] ${w.msg}`));
}
