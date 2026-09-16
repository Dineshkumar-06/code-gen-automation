/* Node vm-sandbox loader — mirrors eligibility_code_generator/test/harness.js.
   Loads the browser modules with a fake `window` and no DOM, so parsers and
   the resolver are testable headlessly. This is why no module outside js/ui
   and js/main.js may touch the DOM. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const files = [
  'js/core/state.js',
  'js/core/zip.js',
  'js/core/dictionary.js',
  'js/core/types.js',
  'js/core/set2.js',
  'js/core/fieldcodes.js',
  'js/core/fixtures.js',
  'js/parsing/tsv.js',
  'js/parsing/inputB.js',
  'js/parsing/inputA.js',
  'js/resolve/resolver.js',
  'js/resolve/exclusions.js',
  'js/generators/stubs.js',
  'js/generators/config.js',
  'js/generators/config2.js',
  'js/generators/detailsPhp.js',
  'js/generators/detailsPhp2.js',
  'js/generators/detailsJs.js',
  'js/generators/detailsJs2.js',
  'js/generators/submitPhp.js',
  'js/generators/submitPhp2.js',
  'js/generators/validationsPhp.js',
  'js/generators/validationsPhp2.js',
  'js/generators/ajaxPhp.js',
  'js/generators/ajaxPhp2.js',
  'js/generators/functionsPhp.js',
  'js/generators/functionsPhp2.js',
  'js/generators/qryArrays.js',
  'js/generators/langPhp.js',
  'js/generators/queriesSql.js',
  'js/generators/printPhp.js'
];

const sandbox = { window: {}, console: console };
sandbox.global = sandbox;
vm.createContext(sandbox);

for (const f of files) {
  const full = path.join(root, f);
  if (!fs.existsSync(full)) continue; // later phases add files incrementally
  const code = fs.readFileSync(full, 'utf8');
  vm.runInContext(code, sandbox, { filename: f });
}

module.exports = sandbox.window.App;
