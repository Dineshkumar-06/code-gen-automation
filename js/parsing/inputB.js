/* Disability Code Generator — module: parsing/inputB.js
   Parses the "Other Details" paste into categories[], types[] and mapping{}.
   PRD §Phase 1, generalized across the real SOW samples.

   Category cells are NOT reliably single letters — across four real SOWs they
   appear as "A", "a", "A - VI", and "OH". So column detection is driven by
   the header row when one is present (every sample has one), falling back to
   the structural signature: the category column is sparse (blank on
   continuation rows), the type column is dense.

   No DOM access. */
(function(App){
  var normName = App.normName;

  var CAT_HDR_RE  = /categor/i;
  var TYPE_HDR_RE = /type\s*of|sub\s*-?\s*categor|sub\s*-?\s*type/i;

  // Set 2's Input B heads its two columns "Type of Disability" /
  // "Sub-Type of Disability" — BOTH match TYPE_HDR_RE, and neither matches
  // CAT_HDR_RE, so the Set 1 pass below finds no pair and the whole paste
  // falls through to shape detection, which has no headerRow to skip and
  // therefore swallows the header as a real category + type. The sub-aware
  // pass runs first to catch exactly that shape: the column headed "Sub-…"
  // is the narrower (type) column, and the parent column is whichever other
  // column is headed with a category-or-type word.
  //
  // Some Set 1 SOWs head the pair "Type of Disability" / "Nature of
  // Disability" instead — the same trap (the parent column says "Type of",
  // no column says "category"), and "Nature of" is the narrower column
  // exactly as "Sub-" is, so it takes the same pass.
  var SUB_HDR_RE    = /sub\s*-?\s*(type|categor)|nature\s*of/i;
  var PARENT_HDR_RE = /categor|type\s*of/i;

  function trimCell(v){ return String(v == null ? '' : v).trim(); }

  // A sub-type cell does not always hold ONE sub-type. cwcsep25 writes a
  // whole group on one line:
  //
  //     Category   Sub-Category
  //     OH         OL, OA, ADV, MDY, DR
  //     HH         HH
  //     VH         LV
  //
  // where the other SOWs would have given OL/OA/ADV/MDY/DR a row each with a
  // blank category cell. Read literally that cell becomes a single disability
  // named "OL, OA, ADV, MDY, DR" -- one that no validation sentence can ever
  // match by name, and one the generated dropdown offers as a single
  // nonsense option.
  //
  // Only ',' and ';' separate. NOT '/': a slash is part of a NAME here, not a
  // separator -- "MD/ID" and "ID/MD" are single category labels in two of the
  // real pastes, and splitting on it would shred them. (This is the opposite
  // of how validation PROSE is read, where '/' does separate names. The
  // difference is that prose is free text and a table cell is not, so here
  // the safe delimiters are the ones no real name in any sample contains:
  // checked across all seven pastes, no category label or sub-type name holds
  // a comma or a semicolon, and the only cell that does is this one.)
  var LIST_SEP_RE = /\s*[,;]\s*/;

  function splitTypeCell(cell){
    return String(cell).split(LIST_SEP_RE)
      .map(function(s){ return s.trim(); })
      .filter(Boolean);
  }

  function detectColumnsBySubHeader(rows){
    for (var r = 0; r < Math.min(rows.length, 5); r++) {
      var subCol = -1, parentCol = -1;
      for (var c = 0; c < rows[r].length; c++) {
        var v = trimCell(rows[r][c]);
        if (!v) continue;
        if (SUB_HDR_RE.test(v)) { if (subCol === -1) subCol = c; continue; }
        if (parentCol === -1 && PARENT_HDR_RE.test(v)) parentCol = c;
      }
      if (subCol !== -1 && parentCol !== -1 && subCol !== parentCol) {
        return { catCol: parentCol, typeCol: subCol, headerRow: r };
      }
    }
    return null;
  }

  // Look for a header row naming both columns. Returns null if none found.
  function detectColumnsByHeader(rows){
    for (var r = 0; r < Math.min(rows.length, 5); r++) {
      var catCol = -1, typeCol = -1;
      for (var c = 0; c < rows[r].length; c++) {
        var v = trimCell(rows[r][c]);
        if (!v) continue;
        if (typeCol === -1 && TYPE_HDR_RE.test(v)) { typeCol = c; continue; }
        if (catCol === -1 && CAT_HDR_RE.test(v)) { catCol = c; }
      }
      if (catCol !== -1 && typeCol !== -1 && typeCol !== catCol) {
        return { catCol: catCol, typeCol: typeCol, headerRow: r };
      }
    }
    return null;
  }

  // Fallback: a sparse column immediately left of a dense one.
  function detectColumnsByShape(rows){
    var maxCols = 0;
    for (var r = 0; r < rows.length; r++) maxCols = Math.max(maxCols, rows[r].length);

    var filled = [];
    for (var c = 0; c < maxCols; c++) {
      var n = 0;
      for (var r2 = 0; r2 < rows.length; r2++) if (trimCell(rows[r2][c])) n++;
      filled.push(n);
    }

    var best = null;
    for (var t = 1; t < maxCols; t++) {
      if (filled[t] < rows.length * 0.6) continue;         // type column must be dense
      for (var k = t - 1; k >= 0; k--) {
        if (filled[k] >= 2 && filled[k] < filled[t]) {      // category column is sparser
          var score = filled[t] - filled[k];
          if (!best || score > best.score) best = { catCol: k, typeCol: t, score: score };
          break;
        }
      }
    }
    return best ? { catCol: best.catCol, typeCol: best.typeCol, headerRow: -1 } : null;
  }

  function pad2(n){ return (n < 10 ? '0' : '') + n; }

  // When no header is recognised the shape fallback has no header row to
  // skip, so a header this file has not seen ("Group | Disability Name")
  // used to be read as a real category + type, shifting every code by one
  // with no warning at all. A category cell that reads like a column heading
  // gives it away: across every real paste, category labels are short codes
  // ("A", "a - VI", "OH", "MD/ID") and none contain these words.
  var HEADERISH_RE = /categor|type|group|class|disabilit|nature|kind|name|\bs\.?\s*no\b/i;

  function guessHeaderRow(rows, cols, warnings){
    var first = -1;
    for (var r = 0; r < rows.length; r++) {
      if (trimCell(rows[r][cols.catCol]) || trimCell(rows[r][cols.typeCol])) { first = r; break; }
    }
    if (first === -1) return;
    var cat = trimCell(rows[first][cols.catCol]), typ = trimCell(rows[first][cols.typeCol]);
    var shown = '"' + cat + (typ ? ' | ' + typ : '') + '"';
    var othersHeaderish = false;
    for (var k = first + 1; k < rows.length; k++) {
      if (HEADERISH_RE.test(trimCell(rows[k][cols.catCol]))) { othersHeaderish = true; break; }
    }
    if (cat && HEADERISH_RE.test(cat) && !othersHeaderish) {
      cols.headerRow = first;
      warnings.push({ code: 'inputb-header-guessed',
        msg: 'Other Details: took ' + shown + ' as the header row (its column names are not ones this tool knows).' });
    } else {
      warnings.push({ code: 'inputb-no-header',
        msg: 'Other Details: no header row recognised, so the first row ' + shown +
             ' was read as data. If it is a header, delete it from the paste.' });
    }
  }

  function parseInputB(raw){
    var rows = App.parseTSV(raw);
    var cols = detectColumnsBySubHeader(rows) || detectColumnsByHeader(rows) || detectColumnsByShape(rows);

    var categories = [], types = [], mapping = {}, warnings = [];
    var typeCodeByNorm = {};

    if (!cols) {
      warnings.push({ code: 'inputb-columns-not-found',
        msg: 'Could not locate a Disability Category / Type of Disability column pair in Input B.' });
      return { categories: categories, types: types, mapping: mapping, warnings: warnings };
    }
    if (cols.headerRow === -1) guessHeaderRow(rows, cols, warnings);

    var openCatCode = null, catCounter = 0, typeCounter = 0;
    var catCodeByNorm = {};
    var splitCells = [];

    for (var i = 0; i < rows.length; i++) {
      if (i === cols.headerRow) continue;
      var catCell = trimCell(rows[i][cols.catCol]);
      var typeCell = trimCell(rows[i][cols.typeCol]);
      if (!catCell && !typeCell) continue;

      if (catCell) {
        var ck = normName(catCell);
        if (catCodeByNorm[ck]) {
          // A repeated category label (cwcsep25 lists OH/HH/VH twice) reopens
          // the existing group rather than creating a duplicate.
          openCatCode = catCodeByNorm[ck];
        } else {
          catCounter++;
          var code = pad2(catCounter);
          catCodeByNorm[ck] = code;
          openCatCode = code;
          categories.push({ code: code, label: catCell });
          mapping[code] = [];
        }
      }
      // else: blank category cell — continuation of the open group.

      if (!typeCell) continue;
      if (openCatCode === null) continue;

      var names = splitTypeCell(typeCell);
      // Deduped: cwcsep25 lists its whole table twice, and naming the same
      // cell twice in the warning reads like two different problems.
      if (names.length > 1 && splitCells.indexOf(typeCell) === -1) splitCells.push(typeCell);

      for (var n = 0; n < names.length; n++) {
        var nk = normName(names[n]);
        var typeCode = typeCodeByNorm[nk];
        if (!typeCode) {
          typeCounter++;
          typeCode = pad2(typeCounter);
          typeCodeByNorm[nk] = typeCode;
          types.push({ code: typeCode, name: names[n] });
        }
        if (mapping[openCatCode].indexOf(typeCode) === -1) mapping[openCatCode].push(typeCode);
      }
    }

    // Reported even though it is almost always right, because it is the one
    // place a genuine name containing a comma would be silently torn in two.
    // It shows up in the review panel next to the value lists it produced, so
    // a wrong split is visible rather than buried in a dropdown.
    if (splitCells.length) {
      warnings.push({ code: 'inputb-type-list-split',
        msg: splitCells.length + ' Input B cell(s) listed several sub-types on one line and were split on ' +
             'commas: ' + splitCells.map(function(c){ return '"' + c + '"'; }).join(', ') +
             '. Check the resulting values are right if any single name genuinely contains a comma.' });
    }

    for (var ci = 0; ci < categories.length; ci++) {
      if (!mapping[categories[ci].code].length) {
        warnings.push({ code: 'inputb-empty-category',
          msg: 'Category "' + categories[ci].label + '" has no disability types listed under it.' });
      }
    }

    var mappingCsv = {};
    for (var m in mapping) mappingCsv[m] = mapping[m].join(',');

    return { categories: categories, types: types, mapping: mappingCsv, warnings: warnings, columns: cols };
  }

  App.parseInputB = parseInputB;

})(window.App = window.App || {});
