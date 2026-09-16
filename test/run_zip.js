/* Verifies js/core/zip.js's hand-rolled STORE-method ZIP writer by parsing
   its own output back out (a minimal store-only reader, right here) and
   checking every file's name/content round-trips byte-for-byte — including
   non-ASCII text (real generated code contains it, e.g. scribe_id_proof's
   "Voter’s Card" curly apostrophe, see config.js/dictionary.js). */
const App = require('./harness.js');

let pass = 0, fail = 0;
function assertTrue(cond, label, extra){
  if (cond) { pass++; } else { fail++; console.log('FAIL:', label, extra !== undefined ? '\n  ' + JSON.stringify(extra) : ''); }
}

// Minimal STORE-only zip reader (central directory -> local headers), used
// only to verify buildZip()'s output structurally — not a general unzip.
function readZip(buf){
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let pos = buf.length - 22;
  while (pos >= 0 && view.getUint32(pos, true) !== 0x06054b50) pos--;
  if (pos < 0) throw new Error('EOCD signature not found');
  const count = view.getUint16(pos + 10, true);
  const centralOffset = view.getUint32(pos + 16, true);

  const entries = [];
  let cpos = centralOffset;
  for (let i = 0; i < count; i++) {
    if (view.getUint32(cpos, true) !== 0x02014b50) throw new Error('bad central directory header at entry ' + i);
    const crc = view.getUint32(cpos + 16, true);
    const compSize = view.getUint32(cpos + 20, true);
    const nameLen = view.getUint16(cpos + 28, true);
    const extraLen = view.getUint16(cpos + 30, true);
    const commentLen = view.getUint16(cpos + 32, true);
    const localOffset = view.getUint32(cpos + 42, true);
    const name = Buffer.from(buf.slice(cpos + 46, cpos + 46 + nameLen)).toString('utf8');
    cpos += 46 + nameLen + extraLen + commentLen;

    if (view.getUint32(localOffset, true) !== 0x04034b50) throw new Error('bad local header for ' + name);
    const lNameLen = view.getUint16(localOffset + 26, true);
    const lExtraLen = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + lNameLen + lExtraLen;
    const content = Buffer.from(buf.slice(dataStart, dataStart + compSize)).toString('utf8');
    entries.push({ name, content, crc });
  }
  return entries;
}

// ── round-trip: several files, including one empty file ──
{
  const files = [
    { name: 'config.php', content: "$arrDiscategory=array(\n'A'=>'Blindness',\n);" },
    { name: 'reg_details.php', content: '<?php\n\techo "x";\n?>' },
    { name: 'empty.txt', content: '' }
  ];
  const buf = App.buildZip(files);
  const entries = readZip(buf);
  assertTrue(entries.length === files.length, 'zip: entry count matches file count');
  files.forEach((f, i) => {
    assertTrue(entries[i] && entries[i].name === f.name, 'zip: filename round-trips for ' + f.name, entries[i]);
    assertTrue(entries[i] && entries[i].content === f.content, 'zip: content round-trips for ' + f.name, entries[i]);
  });
}

// ── non-ASCII content (real generator output: curly apostrophe in "Voter’s Card") ──
{
  const files = [{ name: 'unicode.txt', content: "Voter’s Card / E-Aadhaar Card" }];
  const buf = App.buildZip(files);
  const entries = readZip(buf);
  assertTrue(entries[0] && entries[0].content === files[0].content, 'zip: non-ASCII content round-trips', entries[0]);
}

// ── CRC actually reflects the content (not a stub) ──
{
  const buf = App.buildZip([{ name: 'a.txt', content: 'same' }]);
  const bufDifferent = App.buildZip([{ name: 'a.txt', content: 'different' }]);
  const crcA = readZip(buf)[0].crc;
  const crcB = readZip(bufDifferent)[0].crc;
  assertTrue(crcA !== crcB, 'zip: CRC-32 differs for different content');
}

// ── real generated output for a fixture round-trips through the zip ──
{
  const sample = App.FIXTURES.byKey('bpcl');
  const parseA = App.parseInputA(sample.inputA);
  const parseB = App.parseInputB(sample.inputB);
  const resolve = App.resolveAll(parseA, parseB);
  const config = App.GEN.config({ parseA, parseB, resolve });
  const buf = App.buildZip([{ name: 'config.php', content: config }]);
  const entries = readZip(buf);
  assertTrue(entries[0] && entries[0].content === config, 'zip: real config.php output round-trips byte-for-byte');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
