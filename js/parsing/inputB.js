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
  var SUB_HDR_RE    = /sub\s*-?\s*(type|categor)/i;
  var PARENT_HDR_RE = /categor|type\s*of/i;

  function trimCell(v){ return String(v == null ? '' : v).trim(); }

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

    var openCatCode = null, catCounter = 0, typeCounter = 0;
    var catCodeByNorm = {};

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

      var nk = normName(typeCell);
      var typeCode = typeCodeByNorm[nk];
      if (!typeCode) {
        typeCounter++;
        typeCode = pad2(typeCounter);
        typeCodeByNorm[nk] = typeCode;
        types.push({ code: typeCode, name: typeCell });
      }
      if (mapping[openCatCode].indexOf(typeCode) === -1) mapping[openCatCode].push(typeCode);
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
