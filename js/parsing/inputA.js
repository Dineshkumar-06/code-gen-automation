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

  // Set 2 (PRD §10, deferred) detection — two independent signals, since the
  // two real Set 2 SOWs seen so far (cwcsep25: 2 dropdowns; a second sample:
  // 3 dropdowns incl. a nested "Sub-Type of Multiple Disability" multi-select)
  // do NOT share a dropdown-count structural signature. Both DO share:
  //
  //   1. a "Sub-Type of Disability" label (or its "...Multiple Disability"
  //      variant) — the strong signal, proven on both known samples with
  //      zero false positives on four known Set 1 samples.
  //   2. the disability-type-equivalent field's Values cell names its
  //      category codes INLINE ("HI, VI, LD, ID/MD", "OH, HH, VH") instead of
  //      deferring to Other Details ("Refer other details", Set 1's phrasing)
  //      — a corroborating signal for a SOW that might phrase signal 1
  //      differently than either sample has.
  //
  // A structural "count the dropdowns" check was considered and rejected: it
  // is not actually invariant between the two known Set 2 shapes.
  var SUBTYPE_LABEL_RE = /sub\s*-?\s*type\s+of\s+(multiple\s+)?disability/i;
  var DEFERS_TO_OTHER_DETAILS_RE = /other\s+details/i;
  var INLINE_CODE_LIST_RE = /^(?:values?\s+are\s*)?"?\s*[A-Za-z]{1,6}(?:\s*\/\s*[A-Za-z]{1,6})*\s*(?:,\s*[A-Za-z]{1,6}(?:\s*\/\s*[A-Za-z]{1,6})*\s*){1,}"?\s*$/;

  // Runs on RAW rows, before any dictionary claiming — the layout decides
  // which dictionary to claim against (Set 2 has three fields Set 1 does not,
  // and types its "Type of Disability" row differently), so detection may not
  // depend on claimed postNames. Signal 2 therefore identifies the
  // type-of-disability row by an unclaimed dictionary lookup rather than by
  // the claimed control type it used to read.
  function detectSet2(fields){
    for (var i = 0; i < fields.length; i++) {
      if (SUBTYPE_LABEL_RE.test(normLabel(fields[i].label))) {
        return { isSet2: true, reason: 'sub-type-label', field: fields[i].label };
      }
    }
    var typeField = null;
    for (var j = 0; j < fields.length; j++) {
      if (fields[j].isNote || !fields[j].label) continue;
      var hit = DICT.findByNormalizedLabel(normLabel(fields[j].label));
      if (hit && hit.postName === 'disability_type') { typeField = fields[j]; break; }
    }
    if (typeField && typeField.values && !DEFERS_TO_OTHER_DETAILS_RE.test(typeField.values)
        && INLINE_CODE_LIST_RE.test(typeField.values.trim())) {
      return { isSet2: true, reason: 'inline-category-codes', field: typeField.label };
    }
    return { isSet2: false };
  }

  // layoutOverride: undefined/null = auto-detect (default); 'set1' or 'set2'
  // forces the layout and suppresses the auto-detection warning, since the
  // developer has made an explicit, informed choice rather than the tool
  // guessing. See CLAUDE.md "Set 2 detection" — the override exists precisely
  // because prose-based detection cannot be made airtight against every
  // future SOW's wording.
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
  function claimFields(fields, layout, warnings){
    var claim = DICT.makeLabelClaimer(layout);
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      if (field.isNote) continue;

      var entry = claim(normLabel(field.label));
      if (!entry) {
        warnings.push({ code: 'unmatched-label',
          msg: 'Row ' + (field.slNo || (field._row + 1)) + ': label "' + field.label.slice(0, 70) +
               '" does not match any dictionary entry — it will not be generated.' });
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

  function parseInputA(raw, layoutOverride){
    var warnings = [];
    var read = readRows(raw);
    var fields = read.fields;

    var detected = detectSet2(fields);
    var isSet2, autoDetected = detected.isSet2;

    if (layoutOverride === 'set1') {
      isSet2 = false;
    } else if (layoutOverride === 'set2') {
      isSet2 = true;
    } else {
      isSet2 = detected.isSet2;
    }

    claimFields(fields, isSet2 ? 2 : 1, warnings);

    // Among the "not Set 1" pastes there are two structurally different
    // shapes, and only one of them has reference code:
    //
    //   SHAPE 2 (uiicljul26) — the sub-type question SPLITS. One category
    //     routes to its own dropdown ("Sub-Type of Disability for MD/IDs'",
    //     `subdistypeido`), every other category routes to
    //     `sub_disability_type`, and picking "Multiple Disabilities" in the
    //     routing dropdown opens the multi-select.
    //   SHAPE 3 (fixture set2b) — no routing dropdown at all. ONE sub-type
    //     dropdown serves every category, with "Multiple Disabilities" sitting
    //     inside that single list and opening the multi-select from there.
    //
    // Flagged separately at the user's request (2026-09-11) so it is not
    // silently treated as the same thing; Set 3 support proper is deferred.
    // Generation still runs — core/set2.js degrades correctly (no routing
    // split, the plain sub-type dropdown becomes the multi-select's trigger)
    // and the output is well formed, but nothing has verified it against real
    // reference code, which is what the warning says.
    var layoutShape = 1;
    if (isSet2) {
      var hasRoutingDropdown = false;
      for (var s3 = 0; s3 < fields.length; s3++) {
        if (fields[s3].postName === 'subdistypeido') { hasRoutingDropdown = true; break; }
      }
      layoutShape = hasRoutingDropdown ? 2 : 3;
    }

    if (isSet2 && !layoutOverride) {
      var why = detected.reason === 'sub-type-label'
        ? 'found a "' + detected.field + '" field'
        : 'the "' + detected.field + '" field names its categories inline instead of deferring to Other Details';
      if (layoutShape === 2) {
        warnings.push({ code: 'set2-layout',
          msg: 'Set 2 layout detected (' + why + '): "Type of Disability" holds the category. ' +
               'Use the layout selector if this is wrong.' });
      } else {
        warnings.push({ code: 'set3-layout',
          msg: 'Third layout detected (' + why + ', but one sub-type dropdown serves every category). ' +
               'Generated as a best effort — no reference code exists for this shape, so review every file.' });
      }
    }
    if (isSet2 && layoutOverride === 'set2' && !autoDetected) {
      warnings.push({ code: 'set2-forced',
        msg: 'Set 2 forced by the layout selector — auto-detection did not read this paste as Set 2.' });
    }

    return { fields: fields, noteText: read.noteText, warnings: warnings,
             isSet2: isSet2, layoutShape: layoutShape,
             autoDetectedSet2: autoDetected, set2Reason: detected.reason };
  }

  App.parseInputA = parseInputA;

})(window.App = window.App || {});
