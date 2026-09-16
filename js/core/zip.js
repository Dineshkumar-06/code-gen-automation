/* Disability Code Generator — module: core/zip.js
   A minimal, dependency-free ZIP writer (STORE method, no compression) so
   "Download all" can bundle every generated tab into one .zip without a
   build step or a CDN-hosted library (per PRD's own "no build step, no CDN"
   constraint — see index.html's <script> list, all first-party). No DOM
   access, so this is Node-vm-testable like every other core/ module.

   Deliberately hand-rolled UTF-8 encoding (utf8Bytes) instead of
   TextEncoder: TextEncoder is a host/browser API, not a JS-engine builtin,
   so it doesn't exist in test/harness.js's bare vm context — only
   Uint8Array/DataView (real ECMAScript intrinsics) are used here, which
   keeps this module testable the same way as every other core/ file. */
(function(App){

  function utf8Bytes(str){
    var bytes = [];
    for (var i = 0; i < str.length; i++) {
      var code = str.charCodeAt(i);
      if (code < 0x80) {
        bytes.push(code);
      } else if (code < 0x800) {
        bytes.push(0xC0 | (code >> 6), 0x80 | (code & 0x3F));
      } else if (code >= 0xD800 && code <= 0xDBFF && i + 1 < str.length) {
        var next = str.charCodeAt(i + 1);
        if (next >= 0xDC00 && next <= 0xDFFF) {
          var cp = ((code - 0xD800) << 10) + (next - 0xDC00) + 0x10000;
          i++;
          bytes.push(0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3F), 0x80 | ((cp >> 6) & 0x3F), 0x80 | (cp & 0x3F));
        } else {
          bytes.push(0xEF, 0xBF, 0xBD); // lone surrogate -> replacement char
        }
      } else {
        bytes.push(0xE0 | (code >> 12), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
      }
    }
    return bytes;
  }

  var CRC_TABLE = (function(){
    var table = [];
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes){
    var crc = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xFF];
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  // DOS mod date/time fields are required by the format but not meaningful
  // here (these files don't have a "real" timestamp) — 1980-01-01 00:00:00,
  // the same placeholder every minimal zip writer uses, valid per spec.
  var DOS_TIME = 0, DOS_DATE = 0x21;

  function buildZip(files){
    var entries = files.map(function(f){
      return { name: new Uint8Array(utf8Bytes(f.name)), data: new Uint8Array(utf8Bytes(f.content || '')) };
    });

    var localSize = 0, centralSize = 0;
    entries.forEach(function(e){
      localSize += 30 + e.name.length + e.data.length;
      centralSize += 46 + e.name.length;
    });
    var endSize = 22;

    var buf = new Uint8Array(localSize + centralSize + endSize);
    var view = new DataView(buf.buffer);
    var pos = 0, cpos = localSize;

    entries.forEach(function(e){
      var crc = crc32(e.data);
      e._crc = crc;
      e._offset = pos;

      view.setUint32(pos, 0x04034b50, true); pos += 4;
      view.setUint16(pos, 20, true); pos += 2;       // version needed
      view.setUint16(pos, 0, true); pos += 2;        // flags
      view.setUint16(pos, 0, true); pos += 2;        // compression: store
      view.setUint16(pos, DOS_TIME, true); pos += 2;
      view.setUint16(pos, DOS_DATE, true); pos += 2;
      view.setUint32(pos, crc, true); pos += 4;
      view.setUint32(pos, e.data.length, true); pos += 4; // compressed size
      view.setUint32(pos, e.data.length, true); pos += 4; // uncompressed size
      view.setUint16(pos, e.name.length, true); pos += 2;
      view.setUint16(pos, 0, true); pos += 2;        // extra length
      buf.set(e.name, pos); pos += e.name.length;
      buf.set(e.data, pos); pos += e.data.length;
    });

    entries.forEach(function(e){
      view.setUint32(cpos, 0x02014b50, true); cpos += 4;
      view.setUint16(cpos, 20, true); cpos += 2;     // version made by
      view.setUint16(cpos, 20, true); cpos += 2;     // version needed
      view.setUint16(cpos, 0, true); cpos += 2;      // flags
      view.setUint16(cpos, 0, true); cpos += 2;      // compression
      view.setUint16(cpos, DOS_TIME, true); cpos += 2;
      view.setUint16(cpos, DOS_DATE, true); cpos += 2;
      view.setUint32(cpos, e._crc, true); cpos += 4;
      view.setUint32(cpos, e.data.length, true); cpos += 4;
      view.setUint32(cpos, e.data.length, true); cpos += 4;
      view.setUint16(cpos, e.name.length, true); cpos += 2;
      view.setUint16(cpos, 0, true); cpos += 2;      // extra length
      view.setUint16(cpos, 0, true); cpos += 2;      // comment length
      view.setUint16(cpos, 0, true); cpos += 2;      // disk number start
      view.setUint16(cpos, 0, true); cpos += 2;      // internal attrs
      view.setUint32(cpos, 0, true); cpos += 4;      // external attrs
      view.setUint32(cpos, e._offset, true); cpos += 4;
      buf.set(e.name, cpos); cpos += e.name.length;
    });

    view.setUint32(cpos, 0x06054b50, true); cpos += 4;
    view.setUint16(cpos, 0, true); cpos += 2;        // disk number
    view.setUint16(cpos, 0, true); cpos += 2;        // disk w/ central dir
    view.setUint16(cpos, entries.length, true); cpos += 2;
    view.setUint16(cpos, entries.length, true); cpos += 2;
    view.setUint32(cpos, centralSize, true); cpos += 4;
    view.setUint32(cpos, localSize, true); cpos += 4;
    view.setUint16(cpos, 0, true); cpos += 2;        // comment length

    return buf;
  }

  App.buildZip = buildZip;
  App._zipInternals = { utf8Bytes: utf8Bytes, crc32: crc32 }; // exposed for tests only

})(window.App = window.App || {});
