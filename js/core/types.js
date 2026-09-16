/* Disability Code Generator — module: core/types.js
   Searchable index over Input B's disability types, and the two lookups the
   resolver and exclusion parser both need.

   Why this exists: real SOWs name a disability type three different ways in
   validation prose — full name ("Specific Learning Disability (SLD)"), bare
   name ("specific learning disability"), or abbreviation ("SLD"). And they
   join lists of them with whatever separator the author felt like: " or ",
   "/", ",", "&", or several in one sentence:

     "Enabled and Mandatory for B /LV OR Mental Illness (MI)/ Specific
      Learning Disability (SLD) or ASD, selected YES in Cerebral palsy in pt.5"

   Splitting on delimiters cannot survive that. scanTypeNames() instead
   searches the text for known type names directly, longest match first,
   consuming matched ranges so "One Arm" can't also match inside "One Arm and
   One Leg". Separators become irrelevant — which is the point.

   No DOM access. */
(function(App){
  var normName = App.normName;

  function escapeRe(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  // "One Arm (OA)" -> base "One Arm", abbrev "OA".
  function splitParenAbbrev(name){
    var m = String(name).match(/^(.*?)\s*\(([^)]*)\)\s*$/);
    if (!m) return { base: String(name).trim(), abbrev: null };
    return { base: m[1].trim(), abbrev: m[2].trim() };
  }

  // Keys are matched with word boundaries, so a 1-2 char abbreviation like
  // "B" or "MI" still can't match mid-word. Abbreviations stay in the index
  // because SOWs really do write "B /LV" and expect it understood.
  // `aliases`: user-supplied { rawAbbrevText: code }, from the "Unmatched
  // values" review panel — a human resolving an abbreviation the SOW's own
  // type list never spelled out (see findUnresolvedAbbrevs below). Folded
  // into the same byKey/allKeys scanTypeNames() uses, so one assignment
  // propagates to every consumer of this index: resolveEnablement(),
  // extractShouldBeConstraint(), and parseExclusions() alike.
  function buildTypeIndex(types, aliases){
    var entries = [];
    for (var i = 0; i < types.length; i++) {
      var t = types[i];
      var parts = splitParenAbbrev(t.name);
      var keys = {};
      function addKey(k){
        k = normName(k);
        if (k) keys[k] = true;
      }
      addKey(t.name);
      addKey(parts.base);
      if (parts.abbrev) addKey(parts.abbrev);
      // Trailing-s tolerance: the SOW says "Both Legs", the type list says
      // "Both Leg" (PRD §8 calls this out explicitly).
      //
      // -ness tolerance, same tier and same justification: SOW prose and the
      // Other Details sheet disagree on the adjective/noun form of exactly the
      // disabilities that have one. uiicljul26's scribe row says "Blindness /
      // Low Vision" while its own type list says "Blind  (B)"; bpcl is the
      // mirror image (type list "Blindness", prose "Blindness"), and "Deaf" /
      // "Deafness" behaves the same way. Without this the named value is
      // silently dropped from the condition — it is not an abbreviation, so
      // findUnresolvedAbbrevs() below would not flag it either.
      var seed = Object.keys(keys);
      for (var k = 0; k < seed.length; k++) {
        var base = seed[k];
        if (base.slice(-1) === 's') addKey(base.slice(0, -1));
        else addKey(base + 's');
        if (base.slice(-4) === 'ness') addKey(base.slice(0, -4));
        else if (/[a-z]{3,}$/.test(base)) addKey(base + 'ness');
      }
      entries.push({ code: t.code, name: t.name, base: parts.base, abbrev: parts.abbrev, keys: Object.keys(keys) });
    }

    // Flat key -> code map, plus a length-sorted key list for scanning.
    var byKey = {};
    var allKeys = [];
    for (var e = 0; e < entries.length; e++) {
      for (var j = 0; j < entries[e].keys.length; j++) {
        var key = entries[e].keys[j];
        if (byKey[key] === undefined) { byKey[key] = entries[e].code; allKeys.push(key); }
      }
    }
    // Manual aliases layer on top, keyed by their own normalized text. A
    // valid code (present in `types`) wins over an absent/stale one, and an
    // alias always wins over whatever it's assigned to — the human is the
    // authority here, that's the point of assigning it.
    var codesByCode = {};
    for (var cc = 0; cc < types.length; cc++) codesByCode[types[cc].code] = true;
    aliases = aliases || {};
    for (var rawKey in aliases) {
      if (!Object.prototype.hasOwnProperty.call(aliases, rawKey)) continue;
      var code = aliases[rawKey];
      if (!codesByCode[code]) continue;
      var normKey = normName(rawKey);
      if (!normKey) continue;
      if (byKey[normKey] === undefined) allKeys.push(normKey);
      byKey[normKey] = code;
    }

    allKeys.sort(function(a, b){ return b.length - a.length; }); // longest first

    return { entries: entries, byKey: byKey, allKeys: allKeys };
  }

  // Exact-ish single-name lookup (the whole string is expected to BE a name).
  function matchTypeName(name, index){
    if (!index || !index.byKey) return null;
    var norm = normName(name);
    if (index.byKey[norm] !== undefined) return index.byKey[norm];
    var stripped = normName(splitParenAbbrev(name).base);
    if (index.byKey[stripped] !== undefined) return index.byKey[stripped];
    return null;
  }

  // Finds every type named anywhere in `text`, longest name first, without
  // letting two matches overlap. Returns codes in order of first appearance.
  function scanTypeNames(text, index){
    if (!index || !index.allKeys.length) return { codes: [], matched: [] };
    var hay = normName(String(text || '').replace(/\n/g, ' '));
    if (!hay) return { codes: [], matched: [] };

    var taken = new Array(hay.length);
    var hits = [];

    for (var k = 0; k < index.allKeys.length; k++) {
      var key = index.allKeys[k];
      var re = new RegExp('(^|[^a-z0-9])' + escapeRe(key) + '($|[^a-z0-9])', 'g');
      var m;
      while ((m = re.exec(hay))) {
        var start = m.index + m[1].length;
        var end = start + key.length;
        var free = true;
        for (var p = start; p < end; p++) { if (taken[p]) { free = false; break; } }
        if (free) {
          for (var q = start; q < end; q++) taken[q] = true;
          hits.push({ start: start, code: index.byKey[key], key: key });
        }
        re.lastIndex = m.index + Math.max(1, m[1].length); // allow adjacent matches
      }
    }

    hits.sort(function(a, b){ return a.start - b.start; });
    var codes = [], seen = {}, matched = [];
    for (var h = 0; h < hits.length; h++) {
      if (seen[hits[h].code]) continue;
      seen[hits[h].code] = true;
      codes.push(hits[h].code);
      matched.push(hits[h].key);
    }
    return { codes: codes, matched: matched };
  }

  // Words that look like disability abbreviations but aren't, so an
  // unresolved-name warning doesn't cry wolf on ordinary validation prose.
  var ABBREV_STOPWORDS = {
    YES:1, NO:1, OR:1, AND:1, IF:1, IN:1, OF:1, FOR:1, NOT:1, ALL:1, ANY:1, THE:1,
    NA:1, ID:1, UDID:1, RPWD:1, OM:1, PAN:1, CTRL:1, DD:1, III:1, II:1, AGE:1, SOW:1
  };

  // PRD §7: "a disability value name in validation text has no match in the
  // type table — do not silently drop it." scanTypeNames only reports what it
  // FOUND, so this catches what it missed. The realistic miss is an
  // abbreviation the Other Details sheet never spelled out: nitrjul26's
  // validations say "SLD/ASD" but its type list has "Autism Spectrum Disorder"
  // with no "(ASD)", so ASD is unresolvable without a human.
  // Works per member-chunk, not per whole string, because an abbreviation
  // sitting NEXT TO a name that did resolve is just a gloss for it —
  // "OA (One Arm)" must not warn about "OA". Only a chunk that resolved to
  // nothing at all, yet still contains an abbreviation-shaped token, is a
  // genuine miss ("... (SLD) or ASD" -> the ASD chunk).
  function findUnresolvedAbbrevs(text, index){
    var chunks = String(text || '').split(/[\/,&*\n]|\s+or\s+/i);
    var out = [], seen = {};

    for (var c = 0; c < chunks.length; c++) {
      var chunk = chunks[c];
      if (!chunk.trim()) continue;
      if (scanTypeNames(chunk, index).codes.length) continue; // chunk resolved — nothing missed here

      var re = /\b[A-Z][A-Z0-9]{1,5}\b/g, m;
      while ((m = re.exec(chunk))) {
        var tok = m[0];
        if (ABBREV_STOPWORDS[tok] || seen[tok]) continue;
        if (index && index.byKey[normName(tok)] !== undefined) continue;
        seen[tok] = true;
        out.push(tok);
      }
    }
    return out;
  }

  App.buildTypeIndex = buildTypeIndex;
  App.matchTypeName = matchTypeName;
  App.scanTypeNames = scanTypeNames;
  App.splitParenAbbrev = splitParenAbbrev;
  App.findUnresolvedAbbrevs = findUnresolvedAbbrevs;

})(window.App = window.App || {});
