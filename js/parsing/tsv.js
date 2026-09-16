/* Disability Code Generator — module: parsing/tsv.js
   Excel-clipboard TSV parser. Shared by inputA.js and inputB.js.

   When a spreadsheet cell contains newlines or quotes, Excel wraps the whole
   cell in double quotes and doubles any embedded quote ("" == one literal ").
   Every SOW sample except BPCL has multi-line Validations cells in exactly
   this shape, so splitting the paste on '\n' first would shred them.

   The one rule that matters and is easy to get wrong: a '"' only opens a
   quoted cell when it is the FIRST character of that cell. A '"' anywhere
   else is a literal character. BPCL's row 4 validations cell is unquoted yet
   contains  selected yes for "Are you a person..."  — those quotes must
   survive verbatim, because the resolver's quoted-label mode reads them.

   No DOM access. */
(function(App){

  function parseTSV(text){
    var s = String(text == null ? '' : text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    var rows = [];
    var row = [];
    var cell = '';
    var inQuotes = false;
    var cellStart = true; // are we at the first character of the current cell?

    for (var i = 0; i < s.length; i++) {
      var ch = s[i];

      if (inQuotes) {
        if (ch === '"') {
          if (s[i + 1] === '"') { cell += '"'; i++; }  // "" -> literal "
          else { inQuotes = false; }                    // closing quote
        } else {
          cell += ch;                                   // newlines included
        }
        continue;
      }

      if (ch === '"' && cellStart) { inQuotes = true; cellStart = false; continue; }

      if (ch === '\t') { row.push(cell); cell = ''; cellStart = true; continue; }

      if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; cellStart = true; continue; }

      cell += ch;
      cellStart = false;
    }

    row.push(cell);
    rows.push(row);

    // Drop rows that are entirely empty (blank lines between pasted blocks).
    return rows.filter(function(r){
      for (var i = 0; i < r.length; i++) { if (String(r[i]).trim() !== '') return true; }
      return false;
    });
  }

  App.parseTSV = parseTSV;

})(window.App = window.App || {});
