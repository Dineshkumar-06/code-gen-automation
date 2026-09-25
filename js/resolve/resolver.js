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
  // "Should be YES if ...", and the same rule worded "Mandatorily Yes if ..."
  // (a Set 1 SOW with the "Nature of Disability" naming) or "must be Yes".
  var SHOULD_BE_Y_RE = /(?:should\s+be|must\s+be|mandatorily)\s+(?:yes|y)\b/i;
  // "Disable for Low Vision" — an EXCLUSION on an otherwise-enabled field.
  // Deliberately its own pass, not folded into resolveEnablement(): that
  // function only looks at sentences matching ENABLEMENT_RE, and "Disable
  // for X" contains neither "enabled" nor "mandatory", so it was being
  // silently dropped — the field's base rule (root toggle Y) resolved fine,
  // but the exception never reached the output at all.
  var DISABLE_FOR_RE = /\bdisabled?\s+for\b/i;

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

  // Where the popup MESSAGE itself sits in a cell. The message is the longest
  // quoted span (the same rule extractPopupText applies), which is not always
  // the FIRST quoted span after the lead-in: licjamar26 writes
  //
  //     A popup message should be displayed to VI, HI, LD, "ID/MD" candidates
  //     "Please select 'Yes', if you are VI, LD(cerebral palsy /dominant
  //     hand), ..."
  //
  // — one of the categories the popup is FOR is itself quoted, ahead of the
  // message. Stopping at the first quote therefore leaves the real message in
  // the text, and "cerebral palsy" inside it was being scanned as a value
  // name, resolving that row to an enablement condition the SOW never states.
  var POPUP_LEAD_RE = /(?:A\s+)?pop\s*-?\s*up\s+message[^"“”]*/i;

  //
  // The closing quote is sometimes simply missing — a Set 1 SOW writes
  // 'displayed to candidates "Please select 'Yes' if ... in the exam.' and
  // the cell ends. With no quoted span after the lead-in, the message is then
  // everything after the opening quote (`unterminated: true`), rather than
  // falling back to some other quoted span in the cell.
  function findPopupSpan(text){
    text = String(text || '');
    var lead = POPUP_LEAD_RE.exec(text);
    if (!lead) return null;
    var leadEnd = lead.index + lead[0].length;
    var spans = extractQuotedSpans(text).filter(function(q){ return q.start >= lead.index; });
    if (!spans.length) {
      var open = text.slice(leadEnd).search(/["“”]/);
      if (open !== -1) {
        var from = leadEnd + open;
        return { leadStart: lead.index, msgStart: from, end: text.length,
                 text: text.slice(from + 1).trim(), unterminated: true };
      }
      return { leadStart: lead.index, msgStart: leadEnd, end: leadEnd, text: '' };
    }
    var longest = spans[0];
    for (var i = 1; i < spans.length; i++) if (spans[i].text.length > longest.text.length) longest = spans[i];
    return { leadStart: lead.index, msgStart: longest.start, end: longest.end, text: longest.text.trim() };
  }

  // Remove the popup quote and the exclusion clause before scanning for
  // enablement, so neither contaminates point-ref / name detection.
  function stripNoiseSpans(text){
    var spans = [];
    var popup = findPopupSpan(text);
    if (popup) spans.push([popup.leadStart, popup.end]);
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

  // A quoted label is looked up against THIS paste's own rows first: the
  // SOW quotes its own wording, which is not necessarily the dictionary's
  // (and a row the developer re-pointed in Row mapping is only findable
  // this way). Exact match on the normalized label, or — for a quote of 12+
  // characters — one being a prefix of the other, since SOWs quote their
  // labels shortened ("...40% and above" for "...40% and above ?"). Then the
  // dictionary's own labels and paraphrase aliases, as before.
  function resolveQuotedLabel(text, ctx, self){
    var norm = normLabel(text);
    if (!norm) return null;
    var fields = (ctx && ctx.fields) || [];
    var prefix = null;
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      if (!f.postName || f.isNote || f === self) continue;
      var fl = normLabel(f.label);
      if (fl === norm) return f;
      if (!prefix && norm.length >= 12 && (fl.indexOf(norm) === 0 || norm.indexOf(fl) === 0)) prefix = f;
    }
    if (prefix) return prefix;
    // The dictionary's keyword signatures also fire on quoted VALUES
    // ('"Cerebral palsy"' matches disabilitysuffersoc's own signature), so a
    // hit naming the row being resolved is discarded: a field is never
    // enabled by itself.
    var hit = DICT.findByNormalizedLabel(norm) || DICT.resolveAlias(norm);
    return (hit && self && hit.postName === self.postName) ? null : hit;
  }

  // Does a quoted span that resolved to no field still read as the NAME of
  // another question (so dropping it loses a condition), rather than a value
  // like "Yes" or "Cerebral palsy"? Three or more words, and no disability
  // type or category named in it.
  function looksLikeQuestionRef(text, ctx){
    var t = String(text || '').trim();
    if (t.split(/\s+/).length < 3) return false;
    if (App.scanTypeNames(t, ctx.typeIndex).codes.length) return false;
    if (ctx.categoryIndex && App.scanTypeNames(t, ctx.categoryIndex).codes.length) return false;
    return true;
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
          var hit = resolveQuotedLabel(quoted[q].text, ctx, field);
          if (hit) { labelHit = hit; break; }
        }
        if (labelHit) {
          conditions.push(makeCondition(labelHit, cue));
          continue;
        }
        // "selected yes for "<a label no row has>"" used to vanish without a
        // trace. Say so, unless a point reference in the same clause still
        // carries the condition.
        if (cue && !pm) {
          for (var uq = 0; uq < quoted.length; uq++) {
            if (!looksLikeQuestionRef(quoted[uq].text, ctx)) continue;
            warnings.push({ code: 'quoted-label-unresolved', slNo: field.slNo,
              msg: 'Row ' + field.slNo + ': "' + quoted[uq].text.trim().slice(0, 70) + '" reads as another question, but no pasted row has that label — ' +
                   'this condition was not generated. Fix the row under Row mapping, or add the condition by hand below.' });
          }
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
      var sm = SHOULD_BE_Y_RE.exec(sen);
      if (!sm) continue;
      // The rule's value and reference always FOLLOW the phrase ("Should be
      // YES if <value> is selected in <ref>"). Text before it belongs to
      // whatever came first: one SOW writes '...40% and above". In point 4
      // Mandatorily Yes if "Cerebral Pasy" is selected in point no. 6', where
      // "point 4" is the tail of the enablement clause, not this rule's row.
      sen = sen.slice(sm.index);
      if (/(?:should\s+be|must\s+be|mandatorily)\s+(?:yes|y)\b\s*(?:or|\/)\s*no/i.test(sen)) continue; // "should be Yes or No"

      var scan = App.scanTypeNames(sen, ctx.typeIndex);
      if (!scan.codes.length) {
        // The rule is there but its value is not in the type table — usually
        // a misspelling ('"Cerebral Pasy"'). Name the quoted value so the
        // value-alias panel can offer it, rather than dropping the rule.
        var qs = extractQuotedSpans(sen);
        for (var qi = 0; qi < qs.length; qi++) {
          var qn = qs[qi].text.trim();
          if (!qn || /^(?:yes|no|y|n)$/i.test(qn)) continue;
          warnings.push({ code: 'value-name-unmatched', abbrev: qn, slNo: field.slNo,
            msg: 'Row ' + field.slNo + ': "' + qn + '" in a "should be Yes if ..." rule has no match in the type table — ' +
                 'assign it below and the rule will be picked up.' });
        }
        continue;
      }

      // Which reference the constraint hangs off. A constraint sentence can
      // name SEVERAL rows — licjamar26 writes 'Should be YES if "Cerebral
      // palsy" is selected in 5 or Point no 6', meaning the sub-type dropdown
      // (5) or the multi-select (6). The EARLIEST reference is the scalar
      // dropdown the emitters test with '=='; the multi-select is tested with
      // in_array() alongside it by the emitter itself, so it needs no
      // separate whenField. Taking the "point"-spelled match first instead
      // picked row 6 here and emitted a scalar == against an array field.
      var target = null;
      var cands = [];
      var pmPoint = sen.match(POINT_REF_RE);
      var pmBare  = sen.match(BARE_REF_RE);
      if (pmPoint) cands.push({ at: pmPoint.index, ref: pmPoint[1] });
      if (pmBare)  cands.push({ at: pmBare.index,  ref: pmBare[1]  });
      cands.sort(function(a, b){ return a.at - b.at; });
      for (var r = 0; r < cands.length; r++) {
        // A number that names no row in this paste is not a reference at all
        // ("... in 40% ..."), so fall through to the next candidate rather
        // than warning about it.
        if (!ctx.fieldsBySlNo[cands[r].ref]) continue;
        target = resolvePointRefField(cands[r].ref, ctx, field.slNo, warnings);
        if (target) break;
      }
      var targetName = (target && target.postName) || ctx.typeFieldPostName;
      if (!targetName) continue;

      return { whenField: targetName, op: 'includes', code: scan.codes[0], shouldBe: 'Y' };
    }
    return null;
  }

  // Which type-code dropdown(s) an exclusion has to be checked/complemented
  // against, and every code each one can actually hold. Set 1 has exactly
  // one (the type dropdown); Set 2/3's sub-type question is split across up
  // to three fields, each with its own smaller option list (reusing the same
  // roles core/set2.js already derived, and fieldcodes.js already exposes to
  // the UI — see "Review panel showed one value list for every field").
  function typeFieldsForComplement(ctx){
    var allCodes = ctx.typeIndex.entries.map(function(e){ return e.code; });
    if (!ctx.set2) {
      return ctx.typeFieldPostName ? [{ field: ctx.typeFieldPostName, allCodes: allCodes }] : [];
    }
    var roles = ctx.set2;
    var isIdo = {};
    for (var i = 0; i < roles.idoTypeCodes.length; i++) isIdo[roles.idoTypeCodes[i]] = true;
    var out = [];
    if (ctx.hasField['subdistypeido']) out.push({ field: 'subdistypeido', allCodes: roles.idoTypeCodes.slice() });
    if (ctx.hasField['sub_disability_type']) {
      out.push({ field: 'sub_disability_type', allCodes: allCodes.filter(function(c){ return !isIdo[c]; }) });
    }
    if (ctx.hasField['sub_disability_multiple']) out.push({ field: 'sub_disability_multiple', allCodes: roles.mulOptionCodes.slice() });
    return out;
  }

  function codeNames(codes, ctx){
    var byCode = {};
    for (var i = 0; i < ctx.typeIndex.entries.length; i++) byCode[ctx.typeIndex.entries[i].code] = ctx.typeIndex.entries[i].name;
    return codes.map(function(c){ return byCode[c] || c; });
  }

  // Scans the WHOLE cell independently of resolveEnablement's own sentence
  // filter — see DISABLE_FOR_RE above for why this can't share that pass.
  function extractDisabledForCodes(text, ctx, field, warnings){
    var sentences = splitSentences(text).filter(function(s){ return DISABLE_FOR_RE.test(s); });
    if (!sentences.length) return null;
    var codes = [];
    for (var s = 0; s < sentences.length; s++) {
      codes = codes.concat(App.scanTypeNames(sentences[s], ctx.typeIndex).codes);
      var missed = App.findUnresolvedAbbrevs(sentences[s], ctx.typeIndex);
      for (var u = 0; u < missed.length; u++) {
        warnings.push({ code: 'value-name-unmatched', abbrev: missed[u], slNo: field.slNo,
          msg: 'Row ' + field.slNo + ': "' + missed[u] + '" looks like a disability value but has no match in the type table — ' +
               'add it in the review panel if it belongs.' });
      }
    }
    codes = uniqSortAsc(codes);
    return codes.length ? codes : null;
  }

  // Folds a "disable for <values>" exclusion into `conditions`. Two shapes:
  //   - a positive value list already exists on the same dropdown (an 'in'
  //     condition) -> the excluded codes are simply removed from it, since
  //     they were never a value that should have enabled the field anyway;
  //   - no value list exists yet, just a plain gate like a root Y/N toggle
  //     -> "enabled if Y, but disable for X" is exactly "enabled when the
  //     dropdown holds ANY value except X", which over a closed, known
  //     option list is the same as "enabled when it holds one of ALL THE
  //     OTHERS" — so that complement is synthesized as the new condition.
  //     It replaces the plain gate rather than OR-ing alongside it (OR would
  //     WIDEN enablement to "Y, or this value", the opposite of the rule),
  //     and it is safe to drop: every consumer that reads this exact shape
  //     (compans_time/optscribe's own codes-list extraction in
  //     detailsJs.js/validationsPhp.js/submitPhp.js) already ANDs its own
  //     hardcoded root-toggle/category-non-empty guard independently of
  //     whatever this condition says — see submitPhp.js's own
  //     "$disability=='Y' && ... in_array(...)" for $compans_time.
  function applyDisabledForCodes(conditions, disabledCodes, ctx, field, warnings){
    var targets = typeFieldsForComplement(ctx);
    if (!targets.length) {
      warnings.push({ code: 'disable-for-unattached',
        msg: 'Row ' + field.slNo + ': "disable for ' + codeNames(disabledCodes, ctx).join(', ') +
             '" names a value but this paste has no disability-type field to attach the exclusion to.' });
      return conditions;
    }

    var disabledSet = {};
    for (var i = 0; i < disabledCodes.length; i++) disabledSet[disabledCodes[i]] = true;

    var touchedExisting = false;
    for (var c = 0; c < conditions.length; c++) {
      var cond = conditions[c];
      if (cond.op !== 'in') continue;
      for (var t = 0; t < targets.length; t++) {
        if (targets[t].field !== cond.field) continue;
        cond.codes = cond.codes.filter(function(code){ return !disabledSet[code]; });
        touchedExisting = true;
      }
    }
    if (touchedExisting) return conditions;

    if (conditions.length > 1) {
      // An OR of several already-distinct facts, none of them a value list
      // on the relevant dropdown — not a shape this has been taught to
      // combine with an exclusion. Leave it rather than guess.
      warnings.push({ code: 'disable-for-unresolved',
        msg: 'Row ' + field.slNo + ': "disable for ' + codeNames(disabledCodes, ctx).join(', ') +
             '" could not be combined with this field\'s other conditions automatically — check the review panel.' });
      return conditions;
    }

    var synthesized = [];
    for (var s = 0; s < targets.length; s++) {
      var kept = uniqSortAsc(targets[s].allCodes.filter(function(code){ return !disabledSet[code]; }));
      if (kept.length) synthesized.push({ field: targets[s].field, op: 'in', codes: kept });
    }
    if (!synthesized.length) return conditions;

    warnings.push({ code: 'disable-for-applied',
      msg: 'Row ' + field.slNo + ': "disable for ' + codeNames(disabledCodes, ctx).join(', ') +
           '" combined with this row\'s own base condition into a positive value list. Verify in the review panel.' });
    return synthesized;
  }

  function resolveField(field, ctx, warnings){
    var text = field.validations || '';
    var constraint = extractShouldBeConstraint(text, field, ctx, warnings);
    var conditions = resolveEnablement(field, stripNoiseSpans(text), ctx, warnings);

    var disabledCodes = extractDisabledForCodes(text, ctx, field, warnings);
    if (disabledCodes) conditions = applyDisabledForCodes(conditions, disabledCodes, ctx, field, warnings);

    if (!conditions.length && !constraint) return null;

    var result = { postName: field.postName, slNo: field.slNo, mandatory: 'conditional' };
    if (conditions.length === 1) result.enabledWhen = conditions[0];
    else if (conditions.length > 1) result.enabledWhen = { op: 'or', conditions: conditions };
    if (constraint) result.constraint = constraint;
    return result;
  }

  function extractPopupText(text, warnings, slNo){
    var popup = findPopupSpan(text);
    if (popup && popup.text) {
      if (popup.unterminated) {
        warnings.push({ code: 'popup-unterminated',
          msg: 'Row ' + slNo + ': the popup message has no closing quote — everything after the opening quote was used. Check it in the review panel.' });
      }
      return popup.text;
    }
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

  function extractFieldPopups(fields, fieldsBySlNo, popupPostName){
    var out = {};
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      if (!field.postName || field.isNote) continue;
      if (field.postName === (popupPostName || 'disability_type')) continue;   // that row's popup is popupText
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

  // Set 2/3's alert() does not fire for every category: the requirement names
  // the ones it is for — "A popup message should be displayed to VI, OC,
  // MD/ID candidates \"...\"" — and the reference reg_details.js duly tests
  // $(this).val() against exactly those three. The names sit in the lead-in
  // BEFORE the quoted message — but a category name can itself be quoted
  // there (licjamar26 writes 'to VI, HI, LD, "ID/MD" candidates "<message>"'),
  // so the scan runs to where the MESSAGE starts, not to the first quote.
  // Stopping at the first quote silently dropped ID/MD from that SOW's list.
  function extractPopupTriggerCodes(text, categoryIndex, warnings){
    var popup = findPopupSpan(text);
    if (!popup) return null;
    var leadIn = String(text || '').slice(popup.leadStart, popup.msgStart);
    var scan = App.scanTypeNames(leadIn, categoryIndex);
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
    //
    // A Set 1 SOW with the "Nature of Disability" naming states the popup on
    // its "Type of Disability" row, which is the CATEGORY dropdown there — so
    // when the type row has no popup and the category row does, use that.
    var popupField = typeField;
    if (!parseA.isSet2 && !(typeField && POPUP_LEAD_RE.test(typeField.validations || ''))) {
      var catField = parseA.fields.filter(function(x){ return x.postName === 'disability_category'; })[0];
      if (catField && POPUP_LEAD_RE.test(catField.validations || '')) popupField = catField;
    }
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
      // The root toggle enables everything else and is never itself gated.
      // Its cell often says so ("If this point is selected as Yes then point
      // 5 to 13 should be enabled"), which read as a condition ON the root
      // naming point 5 — a nonsense card in the review panel.
      if (field.postName === 'optdisability') continue;
      var r = resolveField(field, ctx, warnings);
      if (r) resolved[field.postName] = r;
    }

    var popupText = popupField ? extractPopupText(popupField.validations || '', warnings, popupField.slNo) : null;
    var fieldPopups = extractFieldPopups(parseA.fields, fieldsBySlNo, popupField && popupField.postName);
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
