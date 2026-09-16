/* Set 2 — Phases S2-1 / S2-3..S2-6: all eleven output files for uiicljul26.

   There is no ground-truth document for Set 2 (the reference arrived as
   pasted chat content, and its config.php numbers codes from the reference
   application's own historical master table rather than from the paste — see
   generators/config2.js), so acceptance here is not a byte-diff. It is:

     - explicit expected content for the pieces that matter (which arrays,
       which conditions, which rows, in which order);
     - "the emitted code is well formed" — balanced PHP braces/strings and a
       real JS parse of reg_details.js;
     - "no field the paste never mentioned is referenced anywhere", the
       regression CLAUDE.md's 2026-09-11 entry was written about;
     - "no crash on any fixture", including the two Set 2 pastes that have no
       reference code at all. */
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

function ctxFor(key){
  const sample = App.FIXTURES.byKey(key);
  const parseA = App.parseInputA(sample.inputA);
  const parseB = App.parseInputB(sample.inputB);
  const resolve = App.resolveAll(parseA, parseB);
  const src = App.exclusionSourceField(parseA);
  const exclusionGroups = App.parseExclusions(src ? src.validations : '', resolve.typeIndex, []);
  return { parseA, parseB, resolve, exclusionGroups, set2: resolve.set2 || null };
}

/* A PHP-aware balance check. Walks the text tracking single-quoted,
   double-quoted, // and # line comments and block comments, so a brace or
   quote inside a string or comment is not counted. Catches exactly the two
   classes of defect a string-concatenating emitter actually produces: an
   unbalanced block, and a string opened with one quote style and closed with
   the other. */
function phpBalance(src){
  let depth = { '{': 0, '(': 0, '[': 0 };
  const close = { '}': '{', ')': '(', ']': '[' };
  let i = 0, mode = null;
  while (i < src.length) {
    const c = src[i], next = src[i + 1];
    if (mode === "'" || mode === '"') {
      if (c === '\\') { i += 2; continue; }
      if (c === mode) mode = null;
      i++; continue;
    }
    if (mode === 'line') { if (c === '\n') mode = null; i++; continue; }
    if (mode === 'block') { if (c === '*' && next === '/') { mode = null; i += 2; continue; } i++; continue; }
    if (c === "'" || c === '"') { mode = c; i++; continue; }
    if (c === '/' && next === '/') { mode = 'line'; i += 2; continue; }
    if (c === '#') { mode = 'line'; i++; continue; }
    if (c === '/' && next === '*') { mode = 'block'; i += 2; continue; }
    if (c === '{' || c === '(' || c === '[') depth[c]++;
    else if (close[c]) depth[close[c]]--;
    i++;
  }
  return { mode, depth };
}
function assertPhpWellFormed(src, label){
  const r = phpBalance(src);
  assertTrue(r.mode === null, label + ': no unterminated string or comment', 'ended in mode ' + r.mode);
  assertTrue(r.depth['{'] === 0 && r.depth['('] === 0 && r.depth['['] === 0,
    label + ': balanced braces/parens/brackets', JSON.stringify(r.depth));
}

const C = ctxFor('uiicl');

// ── config.php ────────────────────────────────────────────────────────────
{
  const out = App.GEN.config(C);
  ['$arrDisabilityType2', '$arrDisabilityTypeIDO', '$arr_subDisabilityType2',
   '$arr_subDisability_map_Edit', '$arr_mulsubDisabilityType2',
   '$arr_MulsubDisability_map_Edit', '$arrScribeIDProof'].forEach(name => {
    assertHas(out, name + ' = array(', 'config.php declares ' + name);
  });
  assertLacks(out, '$arrDiscategory', 'config.php: no Set 1 $arrDiscategory');
  assertLacks(out, '$arrpostCategoryDisability_mapping', 'config.php: no Set 1 category mapping');

  assertHas(out, "'04'=>'MD/ID',", 'config.php: MD/ID is category 04');
  assertHas(out, "'22'=>'Multiple Disabilities',", 'config.php: Multiple Disabilities is sub-type 22');
  // The routing category's own sub-types are dead in $arr_subDisabilityType2
  // (it routes through $arrDisabilityTypeIDO) — commented, as the reference does.
  assertHas(out, "// '18'=>'Autism Spectrum Disorder (ASD)',", 'config.php: routing sub-types commented out of the plain sub-type array');
  assertHas(out, "// '04'=>'18,19,20,21,22',", 'config.php: routing category commented out of the sub-type map');
  // The multi-select offers everything EXCEPT the entry that opened it.
  assertHas(out, "'22'=>'01,02,03,04,05,06,07,08,09,10,11,12,13,14,15,16,17,18,19,20,21',",
    'config.php: Multiple Disabilities maps to every other sub-type');
  ['18', '19', '20', '21'].forEach(c => assertHas(out, "'" + c + "'=>'',", 'config.php: routing sub-type ' + c + ' opens no multi-select'));
}

// ── reg_details.php ───────────────────────────────────────────────────────
{
  const out = App.GEN.detailsPhp(C);
  assertPhpWellFormed(out, 'reg_details.php');
  ['disability_type', 'subdistypeido', 'sub_disability_type', 'sub_disability_multiple']
    .forEach(f => assertHas(out, 'id="' + f + '"', 'reg_details.php renders #' + f));
  assertHas(out, 'name="sub_disability_multiple[]"', 'reg_details.php: multi-select name carries the PHP array suffix');
  assertHas(out, '$disabilitymulti = explode(",", $row_reg[\'sub_disability_multiple\']);',
    'reg_details.php sets up $disabilitymulti once before the fields that read it');
  assertHas(out, "if (!($row_reg['disability_type'] == '04'))",
    'reg_details.php: subdistypeido disabled unless the routing category is chosen');
  assertHas(out, "$row_reg['disability_type'] != '04'",
    'reg_details.php: sub_disability_type carries the structural not-the-routing-category guard');
  assertHas(out, 'in_array("18", $disabilitymulti)', 'reg_details.php: multi-select membership reads $disabilitymulti');
  // Set 1 leftovers must not appear.
  // 'disability_multiple' is checked as a whole id, since it is a substring
  // of Set 2's own sub_disability_multiple.
  ['disability_category', 'fnSelectArrayMultiHash', '$arrDiscategory']
    .forEach(n => assertLacks(out, n, 'reg_details.php: no Set 1 ' + n));
  assertLacks(out, 'id="disability_multiple"', 'reg_details.php: no Set 1 disability_multiple field');
}

// ── reg_details.js ────────────────────────────────────────────────────────
{
  const out = App.GEN.detailsJs(C);
  let parsed = true, err = '';
  try { new Function(out); } catch (e) { parsed = false; err = e.message; }
  assertTrue(parsed, 'reg_details.js parses as JavaScript', err);

  assertHas(out, "myCustomAlert(msg, 'Disability Type Instructions')", 'reg_details.js: the type-row alert');
  // The alert fires for the three categories the requirement names, not all four.
  assertHas(out, "if ($(this).val() == '01' || $(this).val() == '03' || $(this).val() == '04') {",
    'reg_details.js: alert gated on VI / OC / MD-ID only, not HI');
  assertHas(out, 'Appendix-I)', 'reg_details.js: the optscribe popup');
  assertHas(out, 'Appendix-II)', 'reg_details.js: the scribe1 popup');
  assertHas(out, 'getSub_Typedisability()', 'reg_details.js: sub-type ajax call');
  assertHas(out, 'getSub_TypeMuldisability()', 'reg_details.js: multi-select ajax call');
  assertHas(out, "'ajax_getSubType_disability.php?selcompany='", 'reg_details.js: sub-type endpoint');
  assertHas(out, "'ajax_getSubType_Multiple_disability.php?selcompany='", 'reg_details.js: multi-select endpoint');
  assertHas(out, "if (df == '22') {", 'reg_details.js: the multi-select opens on Multiple Disabilities');

  // The Appendix-II popup is stated on row 15 but names pt. 16 — it must hang
  // off .scribe1, never off .compensatory2.
  assertHas(out, '$(".scribe1").click(function (e) {', 'reg_details.js: Appendix-II popup hangs off .scribe1');
  assertLacks(out, '$(".compensatory2").click(function (e) {', 'reg_details.js: ... and not off .compensatory2');
}

// ── reg_validations.php ───────────────────────────────────────────────────
{
  const out = App.GEN.validations(C);
  assertPhpWellFormed(out, 'reg_validations.php');
  assertHas(out, "$mandatory_flds['subdistypeido']", 'reg_validations.php validates subdistypeido');
  assertHas(out, "$arr_flds['subdistypeido'] = 'reg_subdistypeido|arrDisabilityTypeIDO';",
    'reg_validations.php checks subdistypeido against its own array');
  assertHas(out, '$arr_subDisability_map_Edit[$_POST[\'disability_type\']]',
    'reg_validations.php validates sub_disability_type against the map its options come from');
  assertHas(out, "$_POST['subdistypeido'] == '22' && $_POST['disability_type'] == '04'",
    'reg_validations.php: multi-select gated on both the trigger and the routing category');

  // Exclusion groups: three, dynamic $exclgrpN, not the reference's array_diff form.
  assertHas(out, "$exclgrp1 = array('05','06','07','08','09','10','11','12'); $exclcnt1 = 0;", 'exclusion group 1');
  assertHas(out, "$exclgrp2 = array('01','02'); $exclcnt2 = 0;", 'exclusion group 2');
  assertHas(out, "$exclgrp3 = array('03','04'); $exclcnt3 = 0;", 'exclusion group 3');
  assertLacks(out, '$exclgrp4', 'exactly three exclusion groups');
  assertLacks(out, 'array_diff', 'exclusion check uses counters, not the reference array_diff form');
  assertLacks(out, 'err_lbl_disability_nature', 'exclusion messages are inline, not invented $LANG keys');
  assertHas(out, 'can not select Blind  (B) & Low vision (LV) together',
    'exclusion message uses Input B spelling');

  // The Should-be-Yes constraint reaches through both dropdowns.
  assertHas(out, "$_POST['sub_disability_type'] == '14' || (is_array($_POST['sub_disability_multiple']) && in_array(\"14\",$_POST['sub_disability_multiple'],true))",
    'cerebral-palsy constraint checks both the sub-type dropdown and the multi-select');
  assertHas(out, "'reg_disabilitysuffersoc|Should be Yes|Y|C'", 'cerebral-palsy constraint forces Yes');
}

// ── the Set 3 shape (set2b): no routing dropdown, so the single sub-type
//    dropdown must become the multi-select's trigger everywhere it matters ──
{
  const c3 = ctxFor('set2b');
  assertEq(c3.parseA.layoutShape, 3, 'set2b is shape 3');
  assertEq(c3.set2.idoCategoryCode, null, 'set2b: no routing category — there is no routing dropdown');
  assertEq(c3.set2.multiTriggerField, 'sub_disability_type', 'set2b: the plain sub-type dropdown opens the multi-select');

  const js = App.GEN.detailsJs(c3);
  assertLacks(js, 'subdistypeido', 'set2b reg_details.js: never names the routing dropdown it does not have');
  assertHas(js, "document.getElementById('sub_disability_type').value", 'set2b: the ajax helper reads the dropdown it does have');

  const cfg = App.GEN.config(c3);
  assertLacks(cfg, '$arrDisabilityTypeIDO', 'set2b config.php: no routing-dropdown array');
  assertHas(cfg, '$arr_mulsubDisabilityType2 = array(', 'set2b config.php: still has the multi-select array');

  assertPhpWellFormed(App.GEN.detailsPhp(c3), 'set2b reg_details.php');
  assertPhpWellFormed(App.GEN.validations(c3), 'set2b reg_validations.php');
  assertPhpWellFormed(App.GEN.submit(c3), 'set2b reg_submit.php');
  assertPhpWellFormed(App.GEN.functionsPhp(c3), 'set2b functions.php');
}

// ── a Set 2 paste with no exclusion rule emits no cascade ─────────────────
{
  const noExcl = Object.assign({}, C, { exclusionGroups: [] });
  const out = App.GEN.validations(noExcl);
  assertPhpWellFormed(out, 'reg_validations.php (no exclusion groups)');
  assertLacks(out, '$exclgrp', 'no exclusion groups -> no cascade at all');
  assertHas(out, "$errmsgarr[] = 'sub_disability_multiple|';",
    'no exclusion groups -> the multi-select still clears its own error slot');
}

// ── reg_submit.php ────────────────────────────────────────────────────────
{
  const out = App.GEN.submit(C);
  assertPhpWellFormed(out, 'reg_submit.php');
  assertHas(out, "$subdistypeido = ($disability_type == '04' && $disability == 'Y')",
    'reg_submit.php: subdistypeido written only under the routing category');
  assertHas(out, 'is_array($_POST[\'sub_disability_multiple\']) && $subdistypeido == \'22\'',
    'reg_submit.php: the multi-select CSV is only built when it was really open');
  assertHas(out, '$sub_disability_multiple = implode(",", $_POST[\'sub_disability_multiple\']);',
    'reg_submit.php: the multi-select is stored as a CSV');
  // DB column names, not POST names.
  assertHas(out, '$disability = ', 'reg_submit.php: optdisability stores to $disability');
  assertHas(out, '$scribe = ', 'reg_submit.php: optscribe stores to $scribe');
  assertHas(out, '$disability_40less = ', 'reg_submit.php: optdisability_40less stores to $disability_40less');
  // A guard may only reference variables assigned above it.
  const lines = out.split('\n');
  const assignedAt = {};
  lines.forEach((l, i) => { const m = /^\$([a-z_0-9]+) =/.exec(l) || /^\t\$([a-z_0-9]+) =/.exec(l); if (m && !(m[1] in assignedAt)) assignedAt[m[1]] = i; });
  let ordered = true, why = '';
  lines.forEach((l, i) => {
    const m = /^\$([a-z_0-9]+) = \((.*)\) \?/.exec(l);
    if (!m) return;
    (m[2].match(/\$([A-Za-z_][A-Za-z_0-9]*)/g) || []).forEach(ref => {
      const name = ref.slice(1);
      if (name === '_POST') return;
      if (!(name in assignedAt) || assignedAt[name] > i) { ordered = false; why = l.slice(0, 90); }
    });
  });
  assertTrue(ordered, 'reg_submit.php: every guard refers only to variables assigned above it', why);
}

// ── functions.php: PrintArrSub_disDetails(), the multi-select's <option>
//    printer. Unlike Set 1's helper this one is SOW-DERIVED — its <optgroup>
//    headings and their membership are Input B's own category -> sub-type
//    table, minus the "Multiple Disabilities" entry that opened the list. ──
{
  const out = App.GEN.functionsPhp(C);
  assertPhpWellFormed(out, 'functions.php');
  assertHas(out, 'function PrintArrSub_disDetails($in_selected)', 'functions.php defines the multi-select printer');
  assertHas(out, 'global $arr_mulsubDisabilityType2;', 'functions.php reads the array config2.js emits');
  assertLacks(out, 'fnSelectArrayMultiHash', 'functions.php: no Set 1 helper for a Set 2 paste');

  // One optgroup per category, in Input B's own order.
  const labels = (out.match(/<optgroup label='([^']*)'>/g) || []).map(m => /'([^']*)'/.exec(m)[1]);
  assertEq(labels, ['VI', 'HI', 'OC', 'MD/ID'], 'functions.php: one optgroup per category, in Input B order');

  // Membership comes from the mapping, and "Multiple Disabilities" (22) —
  // the entry that OPENED this list — is in no group.
  assertHas(out, "if ($k == '01' || $k == '02') {", 'functions.php: VI holds Blind / Low vision');
  assertHas(out, "if ($k == '03' || $k == '04') {", 'functions.php: HI holds Deaf / Hard of Hearing');
  assertHas(out, "if ($k == '18' || $k == '19' || $k == '20' || $k == '21') {",
    'functions.php: MD/ID holds its four sub-types and NOT Multiple Disabilities');
  assertLacks(out, "$k == '22'", 'functions.php: the Multiple Disabilities code is offered in no optgroup');

  // Every code the multi-select offers must appear in exactly one optgroup.
  const grouped = (out.match(/\$k == '(\d+)'/g) || []).map(m => /'(\d+)'/.exec(m)[1]);
  assertEq(grouped.slice().sort(), C.set2.mulOptionCodes.slice().sort(),
    'functions.php: every offered sub-type is grouped exactly once');
}

// ── Set 1 still gets its own helper ───────────────────────────────────────
{
  const out = App.GEN.functionsPhp(ctxFor('bpcl'));
  assertHas(out, 'function fnSelectArrayMultiHash', 'functions.php: Set 1 keeps fnSelectArrayMultiHash');
  assertLacks(out, 'PrintArrSub_disDetails', 'functions.php: Set 1 does not get the Set 2 helper');
}

// ── the two static ajax endpoints ─────────────────────────────────────────
{
  assertPhpWellFormed(App.GEN.ajaxSubType(), 'ajax_getSubType_disability.php');
  assertPhpWellFormed(App.GEN.ajaxSubTypeMultiple(), 'ajax_getSubType_Multiple_disability.php');
  assertHas(App.GEN.ajaxSubType(), '$arr_subDisability_map_Edit', 'sub-type endpoint reads the sub-type map');
  assertHas(App.GEN.ajaxSubTypeMultiple(), '$arr_MulsubDisability_map_Edit', 'multi-select endpoint reads the multi map');
}

// ── reg_qry_arrays.php / reg_details_lang.php / disability_queries ────────
{
  const qry = App.GEN.qryArrays(C);
  assertEq(qry.split('\n').length, 21, 'reg_qry_arrays.php: one line per pasted field (21 of 22 rows; the note has no column)');
  ['"subdistypeido",', '"sub_disability_type",', '"sub_disability_multiple",'].forEach(n =>
    assertHas(qry, n, 'reg_qry_arrays.php lists ' + n));
  assertHas(qry, '"disability",', 'reg_qry_arrays.php uses DB names, not POST names');

  const lang = App.GEN.lang(C);
  assertHas(lang, "$LANG['reg_subdistypeido'] = 'Sub-Type of Disability for MD/IDs", 'lang: subdistypeido label verbatim from the SOW');
  assertHas(lang, "$LANG['reg_sub_disability'] = 'Sub-Type of Disability';", 'lang: sub_disability_type label');
  assertHas(lang, "$LANG['reg_sub_disability_multiple'] = 'Sub-Type of Multiple Disability';", 'lang: multi-select label');

  const ddl = App.GEN.queries(C);
  assertHas(ddl, 'ADD `subdistypeido` VARCHAR( 25 )', 'DDL: subdistypeido uses its own pasted Max Length');
  // The multi-select stores a CSV of codes, so its width comes from the code
  // table (21 codes x 3 chars - 1), not from the SOW's display-width cell (25).
  assertHas(ddl, 'ADD `sub_disability_multiple` VARCHAR( 62 )', 'DDL: multi-select sized for the whole CSV, not one value');
  assertHas(ddl, "ADD `compans_time` ENUM( 'Y', 'N' )", 'DDL: radio -> ENUM');
}

// ── print.php ─────────────────────────────────────────────────────────────
{
  const out = App.GEN.print(C);
  assertPhpWellFormed(out, 'print.php');
  const order = ['reg_optdisability', 'reg_disability_type', 'reg_subdistypeido', 'reg_sub_disability',
    'reg_sub_disability_multiple', 'reg_compans_time', 'reg_disabilitysuffersoc'];
  let at = -1, inOrder = true;
  order.forEach(k => { const i = out.indexOf("$LANG['" + k + "']"); if (i <= at) inOrder = false; at = i; });
  assertTrue(inOrder, 'print.php: rows in the reference order, the three new ones right after disability_type');
  // Set 2's disability_type is a single code, not Set 1's CSV.
  assertHas(out, "($reg->disability_type != '') ? $arrDisabilityType2[$reg->disability_type] : '-'",
    'print.php: Set 2 disability_type prints one category, not an exploded CSV');
  assertHas(out, '$arr_mulsubDisabilityType2[$val]', 'print.php: the multi-select resolves names from its own array');
}

// ── absent-field leakage: nothing may name a field this paste lacks ───────
{
  const ALL = ['optdisability', 'disability_category', 'disability_type', 'subdistypeido',
    'sub_disability_type', 'sub_disability_multiple', 'compans_time', 'disabilitysuffersoc',
    'compensatory', 'compensatary_time', 'compensatory1', 'optscribe', 'optdisability_40less',
    'compensatory2', 'scribe1', 'disability_certify', 'scribe_name', 'scribe_id_proof',
    'card_no_scribe', 'eligible_for_scribe', 'undertake_to_produce_udid', 'edu_qual_for_scribe'];

  ['uiicl', 'set2b', 'cwc'].forEach(key => {
    const c = ctxFor(key);
    const present = new Set(c.parseA.fields.map(f => f.postName).filter(Boolean));
    const outs = {
      'reg_details.php': App.GEN.detailsPhp(c),
      'reg_details.js': App.GEN.detailsJs(c),
      'reg_validations.php': App.GEN.validations(c),
      'reg_submit.php': App.GEN.submit(c),
      'print.php': App.GEN.print(c),
      'functions.php': App.GEN.functionsPhp(c)
    };
    Object.keys(outs).forEach(name => {
      // strip line comments so a note about a field does not count as a reference
      const live = outs[name].split('\n').filter(l => !/^\s*(\/\/|#)/.test(l.trim())).join('\n');
      const leaked = ALL.filter(f => !present.has(f) &&
        new RegExp('[.#\'"\\[$>]' + f + '\\b').test(live));
      assertEq(leaked, [], key + ' / ' + name + ': references no field the paste lacks');
    });
  });
}

// ── well-formedness and no crash across every fixture, both layouts ───────
App.FIXTURES.samples.forEach(s => {
  try {
    const c = ctxFor(s.key);
    const php = [App.GEN.config(c), App.GEN.detailsPhp(c), App.GEN.validations(c),
                 App.GEN.submit(c), App.GEN.print(c), App.GEN.functionsPhp(c)];
    php.forEach((src, i) => {
      const r = phpBalance(src);
      assertTrue(r.mode === null && r.depth['{'] === 0 && r.depth['('] === 0,
        s.key + ': generated PHP #' + i + ' is well formed', JSON.stringify(r));
    });
    new Function(App.GEN.detailsJs(c));
    App.GEN.qryArrays(c); App.GEN.lang(c); App.GEN.queries(c);
    pass++;
  } catch (e) { fail++; console.log('FAIL: crash/parse error on fixture', s.key, e.message); }
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
