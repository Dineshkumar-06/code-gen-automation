/* Disability Code Generator — module: resolve/resolver.js
   Turns SOW validation prose into enabledWhen structures (PRD §6).

   Design note — why this does NOT split on delimiters to find value names:
   real SOWs join type names with " or ", "OR", "/", "&" and "," in the same
   sentence, sometimes with no separator at all. So names are found by
   scanning for known type names (core/types.js scanTypeNames), and splitting
   is used only to find CONDITION boundaries, which are reliably marked by:
       a comma/semicolon, or
       "selected YES"/"selected NO" starting a new clause, or
       " or "/" OR " immediately followed by "selected".

   The five reference modes (PRD §6 defines the first three; modes 4 and 5
   were found against real SOW text — see CLAUDE.md):
     1 point number   "point no 3", "pt.10", "point no.- 4.1"
     2 value name     scanned against Input B's type table
     3 quoted popup   longest quoted span in the type row's cell
     4 quoted label   "selected yes for <quoted label>", "YES is selected for
                      point <quoted label>" — resolved via dictionary, then
                      DICT.LABEL_ALIASES for paraphrases
     5 previous point "previous point selected 'Yes'"

   The trap this guards against (PRD §Phase-3 acceptance): a value name and a
   point reference can share a clause, where the name is a GLOSS for the point
   and not a selectable value — "selected YES in Cerebral palsy in pt 8" means
   "point 8 == Y", NOT "type includes Cerebral Palsy". The reference code
   settles it: $scribeTypes has no '15'.

   SET 2 (see core/set2.js) adds three things on top, all gated on
   ctx.set2 being present so Set 1 resolution is bit-for-bit unchanged:
     - CATEGORY names resolve as values too. Set 2's "Type of Disability" row
       holds the category (VI / HI / OC / MD/ID), and rows say things like
       'if selected "OC / HI" under point. No. 5 or 6 or 6.1'.
     - a clause can chain several point references ("point no 5.1 or 6.1"),
       because Set 2 asks the same question of two or three different
       dropdowns.
     - bare type names with NO point reference route by code to whichever
       dropdown actually offers them: the routing category's sub-types go to
       `subdistypeido`, the rest to `sub_disability_type`, and all of them
       also to `sub_disability_multiple`, which offers everything.

   No emitter parses prose. No DOM access. */
(function(App){
  var normName = App.normName;
  var normLabel = App.normLabel;
  var DICT = App.DICT;

  var QUOTE_RE       = /["“”]([^"“”]*)["“”]/g;
  // "point no 3", "point no.- 4.1", "pt.10", "pt. no. 16" (uiicljul26 writes
  // the scribe popup's owner that way) and a bare "point 5" all reach the
  // same shape: an optional lead word, an optional "no"/"number", optional
  // periods/dashes, then the number.
  var POINT_REF_RE   = /(?:point|pt)\s*\.?\s*(?:no|number)?\s*\.?\s*[-–:]?\s*(\d+(?:\.\d+)*)/i;
  var POINT_REF_RE_G = new RegExp(POINT_REF_RE.source, 'gi');
  var BARE_REF_RE    = /\bin\s+(\d+(?:\.\d+)*)\b/i;
  var ENABLEMENT_RE  = /\benabled\b|\bmandatory\b/i;
  var SHOULD_BE_Y_RE = /should\s+be\s+(?:yes|y)\b/i;

  // "point no 5.1 or 6.1", "under point. No. 5 or 6 or 6.1" — Set 2 routinely
  // asks one question of several dropdowns at once. The first reference is
  // found by POINT_REF_RE as usual; each further one must be introduced by a
  // connector AND name a row that actually exists in this paste, so an
  // ordinary "... in point no 12 or 40% ..." cannot be mistaken for a chain.
  var CHAINED_REF_RE = /^\s*(?:or|and|,|\/)\s*(\d+(?:\.\d+)*)\b/i;

  function collectPointRefs(clause, fieldsBySlNo){
    var m = clause.match(POINT_REF_RE);
    if (!m) return [];
    var refs = [m[1]];
    var rest = clause.slice(m.index + m[0].length);
    var cm;
    while ((cm = rest.match(CHAINED_REF_RE))) {
      if (!fieldsBySlNo || !fieldsBySlNo[cm[1]]) break;
      refs.push(cm[1]);
      rest = rest.slice(cm[0].length);
    }
    return refs;
  }

  function extractQuotedSpans(text){
    var spans = [], re = new RegExp(QUOTE_RE.source, 'g'), m;
    while ((m = re.exec(text))) spans.push({ text: m[1], start: m.index, end: m.index + m[0].length });
    return spans;
  }

  // PRD §8 steps 1-2: find "should not select together" and walk back to the
  // nearest sentence boundary. Shared with exclusions.js.
  function findExclusionClauseSpan(text){
    var idx = text.search(/should not select together/i);
    if (idx === -1) return null;
    var tail = /should not select together\.?/i.exec(text.slice(idx));
    var end = idx + (tail ? tail[0].length : 'should not select together'.length);
    var before = text.slice(0, idx);
    var boundaryRe = /\.\s+(?=[A-Z])/g;
    var start = 0, bm;
    while ((bm = boundaryRe.exec(before))) start = bm.index + bm[0].length;
    return { start: start, end: end };
  }

  // Remove the popup quote and the exclusion clause before scanning for
  // enablement, so neither contaminates point-ref / name detection.
  function stripNoiseSpans(text){
    var spans = [];
    var lead = /A popup message should be displayed[^"“”]*/i.exec(text);
    if (lead) {
      var after = text.slice(lead.index + lead[0].length);
      var q = extractQuotedSpans(after)[0];
      if (q && q.start === 0) spans.push([lead.index, lead.index + lead[0].length + q.end]);
      else spans.push([lead.index, lead.index + lead[0].length]);
    }
    var excl = findExclusionClauseSpan(text);
    if (excl) spans.push([excl.start, excl.end]);

    spans.sort(function(a, b){ return a[0] - b[0]; });
    var out = '', pos = 0;
    for (var i = 0; i < spans.length; i++) {
      if (spans[i][0] < pos) continue;
      out += text.slice(pos, spans[i][0]);
      pos = spans[i][1];
    }
    return out + text.slice(pos);
  }

  // A point reference can carry a period that is NOT a sentence end:
  // uiicljul26 writes 'if selected "OC / HI" under point. No. 5 or 6 or 6.1.'
  // — splitting at "point." severs the condition from the very rows it
  // applies to, and the orphaned "No. 5 or 6 or 6.1" fragment then carries no
  // "enabled"/"mandatory" cue and is dropped entirely.
  //
  // Only periods INSIDE a reference are collapsed, each one identified by
  // what follows it (a "no"/"number" continuation, or a digit), so an
  // ordinary sentence ending in "... point." is untouched. POINT_REF_RE
  // already accepts both the collapsed and uncollapsed spellings, so nothing
  // downstream has to know this happened.
  function healPointRefPeriods(text){
    return String(text)
      .replace(/\b(point|pt)\s*\.\s*(?=(?:no|number)\b)/gi, '$1 ')
      .replace(/\b(no|number)\s*\.\s*(?=[-–:]?\s*\d)/gi, '$1 ')
      .replace(/\bpt\s*\.\s*(?=\d)/gi, 'pt ');
  }

  function splitSentences(text){
    return healPointRefPeriods(text).split(/\.\s+(?=[A-Z])|\n+/)
      .map(function(s){ return s.trim(); })
      .filter(Boolean);
  }

  // Condition boundaries — see the design note at the top of this file.
  function splitClauses(sentence){
    return sentence
      .split(/\s*[,;]\s*|\s+(?=selected\s+(?:yes|no)\b)|\s+or\s+(?=selected\b)/i)
      .map(function(s){ return s.trim(); })
      .filter(Boolean);
  }

  function uniqSortAsc(codes){
    var seen = {}, out = [];
    for (var i = 0; i < codes.length; i++) if (!seen[codes[i]]) { seen[codes[i]] = true; out.push(codes[i]); }
    out.sort();
    return out;
  }

  function resolveQuotedLabel(text){
    var norm = normLabel(text);
    return DICT.findByNormalizedLabel(norm) || DICT.resolveAlias(norm);
  }

  function resolvePointRefField(ref, ctx, sourceSlNo, warnings){
    var f = ctx.fieldsBySlNo[ref];
    if (!f || !f.postName) {
      warnings.push({ code: 'point-ref-unresolved',
        msg: 'Row ' + sourceSlNo + ': point reference "' + ref + '" could not be resolved within the pasted block.' });
      return null;
    }
    return f;
  }

  function findPreviousField(field, ctx){
    var idx = ctx.fields.indexOf(field);
    for (var i = idx - 1; i >= 0; i--) {
      if (ctx.fields[i].postName && !ctx.fields[i].isNote) return ctx.fields[i];
    }
    return null;
  }

  // A dropdown is "selected" (non-empty), never equal to 'Y'. iifcljul26's
  // type row says "enabled if Disability category selected in previous point",
  // which must become a non-empty test, matching how the reference guards the
  // type field on  $row_reg['disability_category'] == ''.
  function makeCondition(targetField, cue){
    var control = targetField.control || '';
    if (control === 'select' || control === 'select+multiselect' || control === 'multiselect') {
      return { field: targetField.postName, op: 'selected' };
    }
    return { field: targetField.postName, op: '==', value: cue || 'Y' };
  }

  // Yes/no cue, tested with point-reference text removed — "point no. 5"
  // contains the word "no" as reference syntax, not as a value cue.
  function yesNoCue(clause){
    var t = clause.replace(POINT_REF_RE_G, ' ');
    if (/\byes\b/i.test(t)) return 'Y';
    if (/\bno\b/i.test(t)) return 'N';
    return null;
  }

  // ── Set 2 value routing ──────────────────────────────────────────────
  // Which sub-type dropdown offers a given code, and therefore which field a
  // condition naming that code has to test. Only fields actually present in
  // the paste get a condition — same has()-gating rule every emitter follows.
  function set2RouteTypeCodes(codes, ctx){
    var roles = ctx.set2, out = [];
    var isIdo = {};
    for (var i = 0; i < roles.idoTypeCodes.length; i++) isIdo[roles.idoTypeCodes[i]] = true;

    var ido = [], other = [];
    for (var c = 0; c < codes.length; c++) (isIdo[codes[c]] ? ido : other).push(codes[c]);

    if (ido.length && ctx.hasField['subdistypeido']) {
      out.push({ field: 'subdistypeido', op: 'in', codes: uniqSortAsc(ido) });
    }
    if (other.length && ctx.hasField['sub_disability_type']) {
      out.push({ field: 'sub_disability_type', op: 'in', codes: uniqSortAsc(other) });
    }
    // The multi-select offers every sub-type, so it answers for all of them.
    if (ctx.hasField['sub_disability_multiple']) {
      out.push({ field: 'sub_disability_multiple', op: 'in', codes: uniqSortAsc(codes) });
    }
    return out;
  }

  // A CATEGORY name ("OC", "HI", "MD/ID") is answered by the category
  // dropdown itself, and — when the clause also points at the multi-select —
  // by the multi-select holding any sub-type of that category, which is the
  // same fact stated at the finer grain.
  function set2CategoryConditions(catCodes, refs, ctx){
    var out = [{ field: 'disability_type', op: 'in', codes: uniqSortAsc(catCodes) }];

    var namesMulti = false;
    for (var r = 0; r < refs.length; r++) {
      var f = ctx.fieldsBySlNo[refs[r]];
      if (f && f.postName === 'sub_disability_multiple') { namesMulti = true; break; }
    }
    // Deliberately NOT defaulted to true for a clause with no point reference
    // at all: "Should be enabled & mandatory for VI, HI, OC" states which
    // categories the dropdown serves, which is a fact about the category
    // dropdown only. Widening it to the multi-select there would attach a
    // condition the requirement never asked for.

    if (namesMulti && ctx.hasField['sub_disability_multiple']) {
      var sub = [];
      for (var c = 0; c < catCodes.length; c++) {
        var csv = String(ctx.categoryMapping[catCodes[c]] || '');
        var parts = csv ? csv.split(',') : [];
        for (var p = 0; p < parts.length; p++) if (parts[p]) sub.push(parts[p]);
      }
      if (sub.length) out.push({ field: 'sub_disability_multiple', op: 'in', codes: uniqSortAsc(sub) });
    }
    return out;
  }

  function resolveEnablement(field, cleanedText, ctx, warnings){
    var sentences = splitSentences(cleanedText).filter(function(s){ return ENABLEMENT_RE.test(s); });
    var conditions = [];
    var pendingCodes = [];   // names with no explicit point-ref yet
    var pendingSeen = false;

    for (var s = 0; s < sentences.length; s++) {
      if (/previous\s+point/i.test(sentences[s])) {
        var prev = findPreviousField(field, ctx);
        if (prev) conditions.push(makeCondition(prev, 'Y'));
        else warnings.push({ code: 'point-ref-unresolved',
          msg: 'Row ' + field.slNo + ': "previous point" reference could not be resolved.' });
        continue;
      }

      var clauses = splitClauses(sentences[s]);
      for (var c = 0; c < clauses.length; c++) {
        var clause = clauses[c];
        var pm = clause.match(POINT_REF_RE);
        var cue = yesNoCue(clause);

        // Mode 4 — quoted label (with or without a point reference).
        var quoted = extractQuotedSpans(clause);
        var labelHit = null;
        for (var q = 0; q < quoted.length; q++) {
          var hit = resolveQuotedLabel(quoted[q].text);
          if (hit) { labelHit = hit; break; }
        }
        if (labelHit) {
          conditions.push(makeCondition(labelHit, cue));
          continue;
        }

        if (pm && cue) {
          // Point reference + yes/no cue: names in THIS clause are glosses.
          var tf = resolvePointRefField(pm[1], ctx, field.slNo, warnings);
          if (tf) conditions.push(makeCondition(tf, cue));
          continue;
        }

        var refs = ctx.set2 ? collectPointRefs(clause, ctx.fieldsBySlNo) : (pm ? [pm[1]] : []);

        // Set 2 — a CATEGORY named here is a value of the category dropdown.
        // Checked before type names because the two indexes are disjoint and
        // a category-only clause would otherwise fall through to `continue`.
        if (ctx.set2 && field.postName !== 'disability_type') {
          var catScan = App.scanTypeNames(clause, ctx.categoryIndex);
          if (catScan.codes.length) {
            conditions = conditions.concat(set2CategoryConditions(catScan.codes, refs, ctx));
            continue;
          }
        }

        // Otherwise: whatever type names appear here are real values.
        var scan = App.scanTypeNames(clause, ctx.typeIndex);
        if (!scan.codes.length) continue;

        // PRD §7 — surface names we could not resolve rather than dropping them.
        var missed = App.findUnresolvedAbbrevs(clause, ctx.typeIndex);
        for (var u = 0; u < missed.length; u++) {
          warnings.push({ code: 'value-name-unmatched', abbrev: missed[u], slNo: field.slNo,
            msg: 'Row ' + field.slNo + ': "' + missed[u] + '" looks like a disability value but has no match in the type table — ' +
                 'add it in the review panel if it belongs.' });
        }

        var attached = false;
        for (var rr = 0; rr < refs.length; rr++) {
          var target = resolvePointRefField(refs[rr], ctx, field.slNo, warnings);
          if (target && target.postName) {
            conditions.push({ field: target.postName, op: 'in', codes: uniqSortAsc(scan.codes) });
            attached = true;
          }
        }
        if (attached) continue;

        if (ctx.set2) {
          // No point reference: route each code to the dropdown offering it.
          var routed = set2RouteTypeCodes(uniqSortAsc(scan.codes), ctx);
          if (routed.length) { conditions = conditions.concat(routed); continue; }
        }

        // No explicit reference — the SOW is naming disability types
        // directly ("Enabled and Mandatory for B /LV OR Mental Illness").
        pendingCodes = pendingCodes.concat(scan.codes);
        pendingSeen = true;
      }
    }

    if (pendingSeen && pendingCodes.length) {
      if (ctx.typeFieldPostName) {
        conditions.push({ field: ctx.typeFieldPostName, op: 'in', codes: uniqSortAsc(pendingCodes) });
      } else {
        warnings.push({ code: 'no-type-field',
          msg: 'Row ' + field.slNo + ': validation names disability types but the paste has no Type of Disability field to attach them to.' });
      }
    }

    // Merge every 'in' condition on the same field; drop duplicate '==' ones.
    var merged = [], byField = {}, seenEq = {};
    for (var i = 0; i < conditions.length; i++) {
      var cond = conditions[i];
      if (cond.op === 'in') {
        if (byField[cond.field]) {
          byField[cond.field].codes = uniqSortAsc(byField[cond.field].codes.concat(cond.codes));
        } else {
          byField[cond.field] = { field: cond.field, op: 'in', codes: cond.codes.slice() };
          merged.push(byField[cond.field]);
        }
      } else {
        var key = cond.field + '|' + cond.op + '|' + (cond.value || '');
        if (!seenEq[key]) { seenEq[key] = true; merged.push(cond); }
      }
    }
    return merged;
  }

  // "Should be YES if <type> is selected in <ref>" — a value constraint on a
  // DIFFERENT field than the one being enabled, so it is found across the
  // whole cell rather than among enablement sentences.
  function extractShouldBeConstraint(text, field, ctx, warnings){
    var sentences = splitSentences(text);
    for (var s = 0; s < sentences.length; s++) {
      var sen = sentences[s];
      if (!SHOULD_BE_Y_RE.test(sen)) continue;
      if (/should\s+be\s+(?:yes|y)\b\s*(?:or|\/)\s*no/i.test(sen)) continue; // "should be Yes or No"

      var scan = App.scanTypeNames(sen, ctx.typeIndex);
      if (!scan.codes.length) continue;

      var pm = sen.match(POINT_REF_RE) || sen.match(BARE_REF_RE);
      var target = pm ? resolvePointRefField(pm[1], ctx, field.slNo, warnings) : null;
      var targetName = (target && target.postName) || ctx.typeFieldPostName;
      if (!targetName) continue;

      return { whenField: targetName, op: 'includes', code: scan.codes[0], shouldBe: 'Y' };
    }
    return null;
  }

  function resolveField(field, ctx, warnings){
    var text = field.validations || '';
    var constraint = extractShouldBeConstraint(text, field, ctx, warnings);
    var conditions = resolveEnablement(field, stripNoiseSpans(text), ctx, warnings);

    if (!conditions.length && !constraint) return null;

    var result = { postName: field.postName, slNo: field.slNo, mandatory: 'conditional' };
    if (conditions.length === 1) result.enabledWhen = conditions[0];
    else if (conditions.length > 1) result.enabledWhen = { op: 'or', conditions: conditions };
    if (constraint) result.constraint = constraint;
    return result;
  }

  function extractPopupText(text, warnings){
    var spans = extractQuotedSpans(text);
    if (!spans.length) {
      warnings.push({ code: 'no-popup-message',
        msg: 'No quoted popup message found in the Type of Disability row — no alert() will be emitted.' });
      return null;
    }
    var longest = spans[0];
    for (var i = 1; i < spans.length; i++) if (spans[i].text.length > longest.text.length) longest = spans[i];
    return longest.text.trim();
  }

  // A popup stated on a field's own row, distinct from the type row's single
  // alert(): Set 2 pops one message when the candidate answers Yes to the
  // scribe question and a different one for the 2(s) scribe question.
  //
  // The OWNER is the point the sentence names, not the row it is written on —
  // uiicljul26 states the Appendix-II popup on its row 15 while saying
  // 'If selected "Yes" in pt. no. 16 ...', and the reference reg_details.js
  // duly hangs it off .scribe1 (row 16), not off row 15's own field.
  var POPUP_SENTENCE_RE = /pop\s*-?\s*up/i;

  function extractFieldPopups(fields, fieldsBySlNo){
    var out = {};
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      if (!field.postName || field.isNote) continue;
      if (field.postName === 'disability_type') continue;   // the type row's popup is popupText
      var sentences = splitSentences(field.validations || '');
      for (var s = 0; s < sentences.length; s++) {
        if (!POPUP_SENTENCE_RE.test(sentences[s])) continue;
        var spans = extractQuotedSpans(sentences[s]);
        if (!spans.length) continue;
        var longest = spans[0];
        for (var q = 1; q < spans.length; q++) if (spans[q].text.length > longest.text.length) longest = spans[q];
        var msg = longest.text.trim();
        if (!msg) continue;

        var pm = sentences[s].match(POINT_REF_RE);
        var owner = (pm && fieldsBySlNo[pm[1]] && fieldsBySlNo[pm[1]].postName) || field.postName;
        if (!out[owner]) out[owner] = msg;
      }
    }
    return out;
  }

  // Set 2's alert() does not fire for every category: the requirement names
  // the ones it is for — "A popup message should be displayed to VI, OC,
  // MD/ID candidates \"...\"" — and the reference reg_details.js duly tests
  // $(this).val() against exactly those three. The names sit in the lead-in
  // BEFORE the quoted message, so the scan stops at the first quote.
  function extractPopupTriggerCodes(text, categoryIndex, warnings){
    var lead = /pop\s*-?\s*up[^"“”]*/i.exec(String(text || ''));
    if (!lead) return null;
    var scan = App.scanTypeNames(lead[0], categoryIndex);
    if (!scan.codes.length) {
      warnings.push({ code: 'popup-categories-not-named',
        msg: 'The popup sentence does not name which disability categories it is for, ' +
             'so the alert will fire for every category. Edit the condition in the review panel if that is wrong.' });
      return null;
    }
    return uniqSortAsc(scan.codes);
  }

  function resolveAll(parseA, parseB, manualAliases){
    var warnings = (parseA.warnings || []).slice().concat(parseB.warnings || []);
    var typeIndex = App.buildTypeIndex(parseB.types || [], manualAliases);

    var fieldsBySlNo = {};
    for (var j = 0; j < parseA.fields.length; j++) {
      var f = parseA.fields[j];
      if (!f.slNo) continue;
      // A real field wins over a note/unmatched row when Sl No is duplicated
      // (nitrjul26 uses "4.2" for both its note and its compensatory-time row).
      if (!fieldsBySlNo[f.slNo] || (!fieldsBySlNo[f.slNo].postName && f.postName)) fieldsBySlNo[f.slNo] = f;
    }

    var hasField = {};
    for (var h = 0; h < parseA.fields.length; h++) {
      if (parseA.fields[h].postName) hasField[parseA.fields[h].postName] = true;
    }

    // Set 1: the one row that is both the type dropdown and the category-E
    // list box. Set 2 has no such row — its sub-type values are spread over up
    // to three fields, so bare names route by code instead (set2RouteTypeCodes)
    // and typeFieldPostName stays null.
    var typeField = parseA.fields.filter(function(x){ return x.control === 'select+multiselect'; })[0];

    // The row carrying the section's single alert() text: the type dropdown in
    // Set 1, the category dropdown (also called "Type of Disability") in Set 2.
    var popupField = typeField;
    var set2 = null, categoryIndex = null;
    if (parseA.isSet2) {
      set2 = App.SET2.roles(parseA, parseB);
      warnings = warnings.concat(set2.warnings);
      categoryIndex = App.buildTypeIndex((parseB.categories || []).map(function(c){
        return { code: c.code, name: c.label };
      }));
      popupField = parseA.fields.filter(function(x){ return x.postName === 'disability_type'; })[0] || null;
    }

    var ctx = {
      fields: parseA.fields,
      fieldsBySlNo: fieldsBySlNo,
      hasField: hasField,
      typeIndex: typeIndex,
      typeFieldPostName: typeField ? typeField.postName : null,
      set2: set2,
      categoryIndex: categoryIndex,
      categoryMapping: (parseB && parseB.mapping) || {}
    };

    var resolved = {};
    for (var k = 0; k < parseA.fields.length; k++) {
      var field = parseA.fields[k];
      if (field.isNote || field.constant || !field.postName) continue;
      if (!field.validations || !field.validations.trim()) continue;
      var r = resolveField(field, ctx, warnings);
      if (r) resolved[field.postName] = r;
    }

    var popupText = popupField ? extractPopupText(popupField.validations || '', warnings) : null;
    var fieldPopups = extractFieldPopups(parseA.fields, fieldsBySlNo);
    var popupCategories = (set2 && popupText && popupField)
      ? extractPopupTriggerCodes(popupField.validations || '', categoryIndex, warnings) : null;

    return { resolved: resolved, popupText: popupText, fieldPopups: fieldPopups,
             popupCategories: popupCategories, warnings: warnings,
             typeIndex: typeIndex, typeFieldPostName: ctx.typeFieldPostName,
             categoryIndex: categoryIndex, set2: set2, ctx: ctx };
  }

  App.resolveAll = resolveAll;
  App.uniqSortAsc = uniqSortAsc;
  App.findExclusionClauseSpan = findExclusionClauseSpan;
  App.extractQuotedSpans = extractQuotedSpans;

})(window.App = window.App || {});
