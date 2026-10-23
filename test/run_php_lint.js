/* `php -l` on every generated PHP file, for every fixture.

   The Node suite checks structure (right fields, gating, codes) and runs a
   real `new Function()` parse of reg_details.js, but nothing else parses the
   generated PHP — run_set2_generators.js's brace/quote walker would not catch
   a missing `;` or a bad `?>` split. This is the lightweight guard suggested
   when the step-3 simulator was removed (2026-09-25): the real PHP parser,
   no interpreter of our own.

   Each output is wrapped by what KIND of file it is, because linting a bare
   fragment as-is would read it as inline HTML and pass without parsing a
   single statement:
     - 'fragment'  bare PHP pasted into an existing <?php block
                   (config, validations, submit, lang)  -> "<?php\n" prepended
     - 'template'  HTML interleaved with <?php ?> (reg_details.php, print.php)
     - 'file'      a complete file that opens its own <?php (ajax, functions)
     - 'list'      reg_qry_arrays.php's bare `"col",` lines -> wrapped in array()
   reg_details.js (JS) and disability_queries (SQL) are not PHP and are skipped.

   PHP is found via $PHP_BIN, then `php` on PATH, then XAMPP's default path.
   With none available the file reports SKIP and exits 0 — the rest of the
   suite must not depend on a PHP install. */
const App = require('./harness.js');
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

function findPhp(){
  const candidates = [process.env.PHP_BIN, 'php', 'C:/xampp/php/php.exe'].filter(Boolean);
  for (const c of candidates) {
    const r = cp.spawnSync(c, ['-v'], { encoding: 'utf8' });
    if (!r.error && r.status === 0) return c;
  }
  return null;
}

const PHP = findPhp();
if (!PHP) {
  console.log('SKIP: php not found (set PHP_BIN to enable) — 0 passed, 0 failed');
  process.exit(0);
}

let pass = 0, fail = 0;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dscg-lint-'));

function wrap(kind, code){
  if (kind === 'fragment') return '<?php\n' + code + '\n';
  if (kind === 'list') return '<?php\n$qry_arrays = array(\n' + code + '\n);\n';
  return code;
}

// Returns '' when it lints clean, else php's own message.
function lint(name, source){
  const file = path.join(tmp, name.replace(/[^\w.-]/g, '_') + '.php');
  fs.writeFileSync(file, source);
  const r = cp.spawnSync(PHP, ['-l', '-d', 'display_errors=1', file], { encoding: 'utf8' });
  return r.status === 0 ? '' : ((r.stdout || '') + (r.stderr || '')).trim();
}

function check(label, kind, code){
  const err = lint(label, wrap(kind, code));
  if (!err) { pass++; return; }
  fail++;
  console.log('FAIL:', label, '\n  ' + err.split('\n').join('\n  '));
}

// Negative control: prove the lint actually parses the wrapped fragment, so
// a green run cannot mean "every file was read as inline HTML".
if (lint('control', wrap('fragment', "$a = 1\n$b = 2;")) === '') {
  fail++; console.log('FAIL: negative control — a missing `;` linted clean');
} else { pass++; }

function ctxFor(key){
  const sample = App.FIXTURES.byKey(key);
  const parseA = App.parseInputA(sample.inputA, App.FIXTURES.layoutFor(key));
  const parseB = App.parseInputB(sample.inputB);
  const resolve = App.resolveAll(parseA, parseB);
  const src = App.exclusionSourceField(parseA);
  const exclusionGroups = App.parseExclusions(
    src ? src.validations : '', resolve.typeIndex, resolve.warnings, resolve.categoryIndex);
  return { parseA, parseB, resolve, exclusionGroups, set2: resolve.set2 || null };
}

const OUTPUTS = [
  ['config',       'fragment', 'config.php'],
  ['detailsPhp',   'template', 'reg_details.php'],
  ['validations',  'fragment', 'reg_validations.php'],
  ['submit',       'fragment', 'reg_submit.php'],
  ['functionsPhp', 'file',     'functions.php'],
  ['qryArrays',    'list',     'reg_qry_arrays.php'],
  ['lang',         'fragment', 'reg_details_lang.php'],
  ['print',        'template', 'print.php']
];

for (const sample of App.FIXTURES.samples) {
  const ctx = ctxFor(sample.key);
  for (const [gen, kind, title] of OUTPUTS) {
    check(sample.key + ' ' + title, kind, App.GEN[gen](ctx));
  }
  const ajax = ctx.parseA.isSet2
    ? [['ajaxSubType', 'ajax_getSubType_disability.php'],
       ['ajaxSubTypeMultiple', 'ajax_getSubType_Multiple_disability.php']]
    : [['ajaxPhp', 'ajax_getdisability_type.php']];
  for (const [gen, title] of ajax) check(sample.key + ' ' + title, 'file', App.GEN[gen]());
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
