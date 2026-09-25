/* Disability Code Generator — module: parsing/inputA.js
   Parses the "Basic Details" paste into field objects and matches each label
   against the §4 dictionary. PRD §Phase 2, generalized across real SOWs.

   Column ORDER is constant (Sl No | Label | Type | Max Length | Mandatory ? |
   Input Method | Values | Default Value | Validations | Help Text | Addl
   Remarks) but almost nothing else is:
     - Sl No is per-SOW and arbitrary: 3/4/5, 4/4.1/4.2, 5/6/7, and
       nitrjul26 even reuses "4.2" for two different rows.
     - the note row appears with an empty Sl No (iifcljul26) or with its text
       sitting IN the Sl No column (csmcnov25).
     - labels may carry a bilingual translation after " / " (csmcnov25).
     - Validations cells routinely span multiple lines (Excel-quoted).
   So nothing here keys off Sl No for identity — Sl No is recorded only so the
   resolver can resolve this paste's OWN point references against it.

   validations text is preserved byte-for-byte; the resolver needs the whole cell.
   No DOM access. */
(function(App){
  var normLabel = App.normLabel;
  var DICT = App.DICT;

  var COLS = ['slNo','label','type','maxLength','mandatory','inputMethod','values','defaultValue','validations','helpText','addlRemarks'];

  function isNoteText(s){ return /^note\s*:/i.test(String(s || '').trim()); }

  // Which dictionary/shape a paste is read against is now always an explicit
  // developer choice (`layout`, one of 'set1'/'set2'/'set3') rather than
  // guessed from prose. Per the user (2026-09-17): prose-based auto-detection
  // could never be made airtight against every future SOW's wording, and
  // carrying both a guess AND an override (plus the warnings for when they
  // disagreed) was more complexity than the guess ever bought — simpler for
  // the developer to just say which layout they're pasting.
  //   set1 — Disability Category -> Type of Disability (Type doubles as the
  //          category-E multi-select trigger).
  //   set2 — Type of Disability holds the CATEGORY; the sub-type question
  //          splits across subdistypeido (one routing category) and
  //          sub_disability_type (every other category).
  //   set3 — same split dictionary as set2, but ONE sub-type dropdown serves
  //          every category (no subdistypeido routing dropdown).
  var LAYOUTS = {
    set1: { isSet2: false, layoutShape: 1 },
    set2: { isSet2: true, layoutShape: 2 },
    set3: { isSet2: true, layoutShape: 3 }
  };

  // Pass 1: split the paste into raw field objects and spot the note row.
  // Nothing here consults the dictionary — the layout is not known yet.
  function readRows(raw){
    var rows = App.parseTSV(raw);
    var fields = [], noteText = '';

    for (var i = 0; i < rows.length; i++) {
      var cells = rows[i];

      var field = { _row: i };
      for (var c = 0; c < COLS.length; c++) {
        field[COLS[c]] = (cells[c] !== undefined) ? cells[c] : '';
      }
      field.slNo = String(field.slNo).trim();
      field.rawLabel = field.label;
      field.label = String(field.label).trim();

      // The note row hides in either of the first two columns depending on SOW.
      if (isNoteText(field.label) || isNoteText(field.slNo)) {
        var noteSrc = isNoteText(field.label) ? field.label : field.slNo;
        if (isNoteText(field.slNo)) { field.label = field.slNo; field.slNo = ''; }
        noteText = noteSrc.replace(/^note\s*:\s*/i, '').trim();
        field.isNote = true;
        field.postName = null;
        field.langKey = 'reg_desc2';
        field.control = 'note';
        fields.push(field);
        continue;
      }

      if (!field.label) continue; // structural/blank row
      fields.push(field);
    }

    return { fields: fields, noteText: noteText };
  }

  // Pass 2: claim a dictionary entry per row, against the layout's own
  // dictionary. Mutates the objects from pass 1 in place.
  //
  // overrides: {<row index>: postName | ''} — rows the developer mapped by
  // hand in step 2's row-mapping panel, for a label no dictionary wording
  // covers. Applied first so the chosen field is out of the pool before any
  // other row claims it by label; '' means "do not generate this row".
  function claimFields(fields, layout, warnings, opts, overrides){
    var claim = DICT.makeLabelClaimer(layout, opts);
    overrides = overrides || {};
    var forced = {};
    for (var o = 0; o < fields.length; o++) {
      var key = String(fields[o]._row);
      if (fields[o].isNote || !Object.prototype.hasOwnProperty.call(overrides, key)) continue;
      forced[key] = overrides[key] ? claim.reserve(overrides[key]) : null;
    }

    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      if (field.isNote) continue;

      var rowKey = String(field._row);
      var isForced = Object.prototype.hasOwnProperty.call(forced, rowKey);
      var entry = isForced ? forced[rowKey] : claim(normLabel(field.label));
      field.mappedByHand = isForced;
      if (!entry && isForced) {
        field.postName = null;
        field.langKey = null;
        field.control = null;
        field.constant = false;
      } else if (!entry) {
        warnings.push({ code: 'unmatched-label',
          msg: 'Row ' + (field.slNo || (field._row + 1)) + ': label "' + field.label.slice(0, 70) +
               '" matches no known field — pick one under Row mapping, or it will not be generated.' });
        field.postName = null;
        field.langKey = null;
        field.control = null;
        field.constant = false;
      } else {
        field.postName = entry.postName;
        field.multiPostName = entry.multiPostName || null;
        field.multiName = entry.multiName || null;
        field.langKey = entry.langKey;
        field.control = entry.control;
        field.constant = !!entry.constant;
      }
    }
  }

  // Which pasted row became each disability dropdown, in paste order. A label
  // can match the WRONG field with nothing to flag it ("Type of Disability"
  // is the type in BPCL but the category in other SOWs), so the UI states
  // this on every parse as a neutral note rather than a warning.
  var DROPDOWN_ROLES = {
    1: { disability_category: 'category', disability_type: 'type (+ multi-select)' },
    2: { disability_type: 'category', subdistypeido: 'sub-type (routing category)',
         sub_disability_type: 'sub-type', sub_disability_multiple: 'multi-select' }
  };
  function dropdownRows(fields, isSet2){
    var roles = DROPDOWN_ROLES[isSet2 ? 2 : 1], out = [];
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      if (f.postName && roles[f.postName]) {
        out.push({ slNo: f.slNo || String(f._row + 1), label: f.label, postName: f.postName, role: roles[f.postName] });
      }
    }
    return out;
  }

  // layout: 'set1' | 'set2' | 'set3', the developer's own explicit choice —
  // see the LAYOUTS note above. An unrecognized/missing value falls back to
  // Set 1 rather than guessing; the UI's layout selector has no blank option,
  // so this only matters for a caller that skips choosing entirely.
  function parseInputA(raw, layout, overrides){
    var warnings = [];
    var read = readRows(raw);
    var fields = read.fields;

    var chosen = LAYOUTS[layout] || LAYOUTS.set1;

    // Set 1 only: "Type of Disability" / "Nature of Disability" naming, where
    // each label sits one step down from BPCL's. See dictionary.js.
    var nature = chosen.layoutShape === 1 && DICT.usesNatureNaming(
      fields.filter(function(f){ return !f.isNote; }).map(function(f){ return normLabel(f.label); }));

    claimFields(fields, chosen.layoutShape, warnings, { nature: nature }, overrides);

    return { fields: fields, noteText: read.noteText, warnings: warnings,
             isSet2: chosen.isSet2, layoutShape: chosen.layoutShape, natureNaming: nature,
             dropdownRows: dropdownRows(fields, chosen.isSet2) };
  }

  App.parseInputA = parseInputA;

})(window.App = window.App || {});
