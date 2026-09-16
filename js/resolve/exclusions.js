/* Disability Code Generator — module: resolve/exclusions.js
   Parses the mutual-exclusion groups from whichever row carries the
   multi-select (PRD §8) — the Type of Disability row in Set 1, the
   Sub-Type of Multiple Disability row in Set 2.
   Group count is dynamic — parsed from prose, never fixed at three — so the
   result feeds an editable review panel rather than emitting directly.

   Members are found by scanning each cluster for known type names rather than
   splitting on delimiters, because the delimiter is not stable across SOWs:

     BPCL       "OA (One Arm) / OL (One leg) /OAL (One Arm and One Leg)/BL ..."   slashes
     iifcljul26 "One Arm (OA), One Leg (OL), Both Legs(BL), One Arm and One Leg"  commas
     nitrjul26  "One Arm (OA), Both Arm (BA), ... & One Arm, One Leg (OAL)"       both
     csmcnov25  "OA- One Arm, BA- Both Arms,OL- One Leg, BL- Both Legs"           commas, reversed

   Splitting on '/' and '&' alone silently dropped three of four members from
   the comma-separated clusters. Scanning is separator-agnostic.

   The CLUSTERS themselves are delimited two different ways across the SOWs
   seen so far, so both are tried in turn (see extractClusterTexts):

     Set 1  "... but  * OA (One Arm) / OL (One leg) ...  * Blindness & low
             vision  * Hard of Hearing & Deaf   should not select together."
     Set 2  "1. Candidate can select only one disability from (OA/OL/BL/OAL/
             BA/BLA/BLOA/BAOL)\n2. Candidate can select only one disability
             from (Blind/Low Vision)\n..."

   Per the user (2026-09-11): a Set 2 multi-select sometimes states no
   exclusion groups at all, and in that case no extra validation is wanted —
   so "no groups" is a normal outcome, reported as an informational warning
   rather than treated as a parse failure.

   No DOM access (the review panel lives in js/ui/ui.js). */
(function(App){

  // Input B's own name for a code (exact spelling/casing as pasted), for
  // building exclusion messages that quote the requirement, not the
  // validation prose's own — sometimes differently-cased or abbreviated —
  // wording. See CLAUDE.md "Exclusion group message casing" (real bug:
  // iifcljul26's Input B spells code 02 "Low Vision", but its validation
  // prose casually writes "low vision" — the message must say "Low Vision").
  function nameByCode(typeIndex){
    var map = {};
    var entries = (typeIndex && typeIndex.entries) || [];
    for (var i = 0; i < entries.length; i++) map[entries[i].code] = entries[i].name;
    return map;
  }

  // Strategy 1 (Set 1): "... should not select together", clusters split on '*'.
  function clustersByShouldNotSelect(text){
    var span = App.findExclusionClauseSpan(text);
    if (!span) return null;

    var clause = text.slice(span.start, span.end);
    var phraseIdx = clause.search(/should not select together/i);
    var segment = clause.slice(0, phraseIdx);

    // PRD §8 step 3: split on '*' for clusters. Text before the FIRST '*' is
    // descriptive preamble ("In case of category -E candidate has to select
    // more than 1 values in Type of disability but"), not a cluster.
    var starIdx = segment.indexOf('*');
    if (starIdx === -1) return [segment.trim()].filter(Boolean);
    return segment.slice(starIdx).split('*')
      .map(function(s){ return s.trim(); })
      .filter(Boolean);
  }

  // Strategy 2 (Set 2): one cluster per line reading "... can select only one
  // <something> from (A/B/C)". The "from" is required: the same cell also
  // carries a bare "Candidate can select only one Nature of Disability.",
  // which is the rule's own preamble and names no members at all.
  var ONLY_ONE_FROM_RE = /\bonly\s+one\b[^\n]*\bfrom\b/i;

  function clustersByOnlyOneFrom(text){
    var lines = String(text).split(/\n+/);
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      if (ONLY_ONE_FROM_RE.test(lines[i])) {
        // Keep only the part after "from" — the lead-in is boilerplate and
        // scanning it would be harmless but pointless.
        var m = /\bfrom\b([\s\S]*)$/i.exec(lines[i]);
        var body = (m ? m[1] : lines[i]).trim();
        if (body) out.push(body);
      }
    }
    return out.length ? out : null;
  }

  function extractClusterTexts(text){
    return clustersByShouldNotSelect(text) || clustersByOnlyOneFrom(text);
  }

  function parseExclusions(multiRowValidations, typeIndex, warnings){
    var text = multiRowValidations || '';
    var clusterTexts = extractClusterTexts(text);
    if (!clusterTexts) {
      warnings.push({ code: 'no-exclusion-phrase',
        msg: 'The multi-select row\'s validation text states no mutual-exclusion rule ' +
             '(neither "should not select together" nor "can select only one ... from ..."), ' +
             'so no exclusion groups were produced and no extra validation will be generated.' });
      return [];
    }

    var groups = [];
    for (var i = 0; i < clusterTexts.length; i++) {
      var clusterText = clusterTexts[i];
      var scan = App.scanTypeNames(clusterText, typeIndex);

      // PRD §8 step 7: a cluster resolving to fewer than 2 members is discarded.
      if (scan.codes.length < 2) {
        warnings.push({ code: 'exclusion-cluster-too-small',
          msg: 'Exclusion cluster resolved to ' + scan.codes.length +
               ' member(s) and was discarded — check it in the review panel: "' +
               clusterText.replace(/\s+/g, ' ').slice(0, 90) + '"' });
        continue;
      }

      // PRD §7 — a cluster was found but a member could not be resolved.
      var missed = App.findUnresolvedAbbrevs(clusterText, typeIndex);
      for (var u = 0; u < missed.length; u++) {
        warnings.push({ code: 'exclusion-member-unresolved', abbrev: missed[u],
          msg: 'Exclusion cluster member "' + missed[u] + '" could not be resolved to a disability type — ' +
               'add it to the group in the review panel if it belongs.' });
      }

      // Editable in the review panel; defaults to the matched members' own
      // Input B names (exact spelling/casing), in the order the cluster text
      // names them — never the raw prose text, which may spell or case a
      // name differently from how Input B itself defines it.
      var names = nameByCode(typeIndex);
      var defaultMessage = scan.codes.map(function(c){ return names[c] || c; }).join(' & ');

      groups.push({
        codes: App.uniqSortAsc(scan.codes),
        matched: scan.matched,
        message: defaultMessage
      });
    }

    return groups;
  }

  // Which pasted row states the exclusion rule: the row that IS the
  // multi-select. Set 1 puts it on Type of Disability (that row doubles as
  // the category-E list box); Set 2 has a dedicated Sub-Type of Multiple
  // Disability row. Single source of truth so ui.js, the tests and any future
  // emitter cannot disagree about where to read it from.
  function exclusionSourceField(parseA){
    var fields = (parseA && parseA.fields) || [];
    var i;
    for (i = 0; i < fields.length; i++) if (fields[i].postName === 'sub_disability_multiple') return fields[i];
    for (i = 0; i < fields.length; i++) if (fields[i].control === 'select+multiselect') return fields[i];
    return null;
  }

  App.parseExclusions = parseExclusions;
  App.exclusionSourceField = exclusionSourceField;

})(window.App = window.App || {});
