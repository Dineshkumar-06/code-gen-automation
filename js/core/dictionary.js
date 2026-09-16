/* Disability Code Generator — module: core/dictionary.js
   The standardized name dictionary (PRD §4): the fixed POST-name / LANG-key
   lookup, never derived from the paste.

   Matching is two-tier, because the SAME logical field is worded differently
   between SOWs. nitrjul26's scribe1 row reads "...and wish to avail the
   services of Scribe ?" where BPCL's reads "Do you intend to use the services
   of a scribe ?"; its optdisability_40less row says "sec 2(s)... and not
   covered under sec 2(r)" where BPCL says "Section 2(s)... but not covered
   under the definition of Section 2(r)... i.e. persons having less than 40%".
   Enumerating every wording is a losing game, so:

     1. exact match on the normalized label (fast, unambiguous), then
     2. keyword signature — {all: [...], none: [...]} against the normalized
        label, capturing what actually identifies the field.

   Duplicate-label disambiguation still works on top of both: several rows can
   match the same family (a paste has three "If Yes, do you need compensatory
   time" rows), and makeLabelClaimer() hands out entries in declaration order,
   which is document order. That is why ENTRIES order is load-bearing —
   optscribe must precede scribe1, compensatory precede compensatory1
   precede compensatory2.

   Do not "improve" a POST name to better describe its field: row 10 is the
   dominant-hand question but its variable is `compensatary_time`, a quirk of
   the reference code that downstream files depend on. */
(function(App){
  var normLabel = App.normLabel;

  // sig: {all: [...substrings that must ALL appear], none: [...that must not]}
  //
  // ENTRIES1 is the Set 1 layout (Disability Category -> Type of Disability,
  // with the type field doubling as the category-E multi-select). ENTRIES2,
  // built from it below, is the Set 2 layout. entriesFor(layout) picks; every
  // lookup here takes an optional layout argument and defaults to Set 1.
  var ENTRIES1 = [
    { postName: 'optdisability', langKey: 'reg_optdisability', control: 'radio',
      labels: ['are you a person with benchmark disability of 40% and above'],
      sig: { all: ['benchmark disability'] } },

    { postName: 'disability_category', langKey: 'reg_disability_category', control: 'select',
      labels: ['disability category'],
      sig: { all: ['disability category'], none: ['sub'] } },

    { postName: 'disability_type', langKey: 'reg_disability_type', control: 'select+multiselect',
      multiPostName: 'disability_multiple[]',
      labels: ['type of disability'],
      sig: { all: ['type of disability'], none: ['sub'] } },

    { postName: 'compans_time', langKey: 'reg_compans_time', control: 'radio',
      labels: ['do you need compensatory time at the time of examination'],
      sig: { all: ['compensatory time'], none: ['if yes'] } },

    { postName: 'disabilitysuffersoc', langKey: 'reg_disabilitysuffersoc', control: 'radio',
      labels: ['are you suffering from cerebral palsy and your writing speed is affected'],
      sig: { all: ['cerebral palsy'] } },

    { postName: 'compensatory', langKey: 'reg_compensatory', control: 'radio',
      labels: ['if yes, do you need compensatory time at the time of examination'],
      sig: { all: ['if yes', 'compensatory time'] } },

    { postName: 'compensatary_time', langKey: 'reg_compensatary_time', control: 'radio',
      labels: ['whether your dominant (writing) hand is affected'],
      sig: { all: ['dominant', 'hand'] } },

    { postName: 'compensatory1', langKey: 'reg_compensatory', control: 'radio',
      labels: ['if yes, do you need compensatory time at the time of examination'],
      sig: { all: ['if yes', 'compensatory time'] } },

    { postName: 'optscribe', langKey: 'reg_optscribe', control: 'radio',
      labels: ['do you intend to use the services of a scribe'],
      sig: { all: ['services of'], none: ['2(s)'] } },

    // ── rows 12.1-12.4 equivalents — the optdisability=='N' subtree,
    //    constant block (PRD §5): recognized so no false "unmatched label"
    //    warning fires, but never fed to the resolver.
    { postName: 'optdisability_40less', langKey: 'reg_optdisability_40less', control: 'radio', constant: true,
      labels: [],
      sig: { all: ['2(s)', '2(r)', 'difficulty in writing'] } },

    { postName: 'compensatory2', langKey: 'reg_compensatory', control: 'radio', constant: true,
      labels: ['if yes, do you need compensatory time at the time of examination'],
      sig: { all: ['if yes', 'compensatory time'] } },

    { postName: 'scribe1', langKey: 'reg_optscribe1', control: 'radio', constant: true,
      labels: ['do you intend to use the services of a scribe'],
      sig: { all: ['services of'] } },

    { postName: 'disability_certify', langKey: 'reg_disability_certify', control: 'checkbox', constant: true,
      labels: [],
      sig: { all: ['i certify', 'competent medical authority'] } },

    // ── scribe name / ID / undertakings constant block (PRD §5) ──
    { postName: 'scribe_name', langKey: 'reg_scribe_name', control: 'text', constant: true,
      labels: ['name of the scribe'],
      sig: { all: ['name of the scribe'] } },

    { postName: 'scribe_id_proof', langKey: 'reg_scribe_id_proof', control: 'select', constant: true,
      labels: ['id card of scribe'],
      sig: { all: ['id card of'], none: ['number'] } },

    { postName: 'card_no_scribe', langKey: 'reg_card_no_scribe', control: 'text', constant: true,
      labels: ['id card number of scribe'],
      sig: { all: ['id card number'] } },

    { postName: 'eligible_for_scribe', langKey: 'reg_eligible_for_scribe', control: 'checkbox', constant: true,
      labels: [],
      sig: { all: ['eligible for scribe'] } },

    { postName: 'undertake_to_produce_udid', langKey: 'reg_undertake_to_produce_udid', control: 'checkbox', constant: true,
      labels: [],
      sig: { all: ['undertake to produce'] } },

    { postName: 'edu_qual_for_scribe', langKey: 'reg_edu_qual_for_scribe', control: 'checkbox', constant: true,
      labels: [],
      sig: { all: ['educational qualification'] } }
  ];

  /* ── Set 2 layout (PRD §10; reference: uiicljul26) ────────────────────────
     Set 2 keeps every Set 1 field except `disability_category`, and differs in
     three ways:

       - "Type of Disability" (`disability_type`) is a PLAIN single select in
         Set 2. It carries what Set 1 called the *category* (VI / HI / OC /
         MD-ID), and it has no multi-select twin — Set 1's
         `disability_multiple[]` lives on this same row only because Set 1's
         category-E case reuses the type dropdown as a list box.
       - three fields Set 1 has no equivalent for, all sitting between
         `disability_type` and the note row:
           `subdistypeido`           the sub-type dropdown for the ONE category
                                     that routes through it (MD/ID), i.e. the
                                     category whose own sub-type list contains
                                     "Multiple Disabilities";
           `sub_disability_type`     the sub-type dropdown for every OTHER
                                     category;
           `sub_disability_multiple` the multi-select, opened only when
                                     `subdistypeido` == the Multiple
                                     Disabilities code.
       - the exclusion groups (PRD §8) are stated on `sub_disability_multiple`'s
         own Validations cell, not on `disability_type`'s.

     Signature design: all three new labels share "sub" + "disability", so each
     sig is written to exclude the other two rather than to spell out this
     SOW's own wording ("...for MD/IDs'"), which is per-project.
       "Sub-Type of Disability for MD/IDs'"  -> has 'for', not 'multiple'
       "Sub-Type of Disability"              -> neither
       "Sub-Type of Multiple Disability"     -> has 'multiple disability'

     Order is load-bearing here exactly as it is for ENTRIES1: the claimer
     hands out entries in declaration order, so subdistypeido must precede
     sub_disability_type (a paste with only one sub-type dropdown and no
     "for ..." qualifier claims sub_disability_type, since subdistypeido's sig
     requires 'for'). */
  var SET2_SUBTYPE_ENTRIES = [
    { postName: 'subdistypeido', langKey: 'reg_subdistypeido', control: 'select',
      labels: [],
      sig: { all: ['sub', 'type of disability', 'for'], none: ['multiple'] } },

    { postName: 'sub_disability_type', langKey: 'reg_sub_disability', control: 'select',
      labels: ['sub-type of disability', 'sub - type of disability', 'sub type of disability'],
      sig: { all: ['sub', 'type of disability'], none: ['multiple', 'for'] } },

    { postName: 'sub_disability_multiple', langKey: 'reg_sub_disability_multiple', control: 'multiselect',
      // name= attribute carries the PHP array suffix; id=/class=/DB column do not.
      multiName: 'sub_disability_multiple[]',
      labels: [],
      sig: { all: ['sub', 'multiple disability'] } }
  ];

  // Built from ENTRIES1 so the two layouts can never drift apart on the 19
  // fields they share (label wordings, sigs, langKeys, constant flags).
  var ENTRIES2 = (function(){
    var out = [];
    for (var i = 0; i < ENTRIES1.length; i++) {
      var e = ENTRIES1[i];
      if (e.postName === 'disability_category') continue;   // Set 2 has no such row
      if (e.postName === 'disability_type') {
        var t = {};
        for (var k in e) t[k] = e[k];
        t.control = 'select';        // plain dropdown in Set 2 ...
        delete t.multiPostName;      // ... with no multi-select twin
        out.push(t);
        for (var j = 0; j < SET2_SUBTYPE_ENTRIES.length; j++) out.push(SET2_SUBTYPE_ENTRIES[j]);
        continue;
      }
      out.push(e);
    }
    return out;
  })();

  function entriesFor(layout){ return (layout === 2 || layout === '2' || layout === true) ? ENTRIES2 : ENTRIES1; }

  // Hidden fields belonging to the block (PRD §4). NOTE: the reference emits
  // both inside a PHP block comment; open question for Phase 4, see CLAUDE.md.
  var HIDDEN_FIELDS = [
    { name: 'hidden_cerebral_scribe', afterPostName: 'disabilitysuffersoc', sourceField: 'disabilitysuffersoc' },
    { name: 'hidden_dominant_scribe', afterPostName: 'compensatary_time',   sourceField: 'compensatary_time' }
  ];

  // Resolver Gap 1 (quoted-label reference): validation prose names a field by
  // paraphrase, e.g. rows quoting "Are you a Person with Disability" when the
  // actual label is "...benchmark disability of 40% and above".
  var LABEL_ALIASES = {
    'are you a person with disability': 'optdisability',
    'are you a person with benchmark disability of 40% and above': 'optdisability'
  };

  function sigMatches(norm, sig){
    if (!sig) return false;
    var i;
    if (sig.all) {
      for (i = 0; i < sig.all.length; i++) if (norm.indexOf(sig.all[i]) === -1) return false;
    }
    if (sig.none) {
      for (i = 0; i < sig.none.length; i++) if (norm.indexOf(sig.none[i]) !== -1) return false;
    }
    return true;
  }

  function candidatesFor(norm, layout){
    var ENTRIES = entriesFor(layout);
    var exact = [], bySig = [];
    for (var i = 0; i < ENTRIES.length; i++) {
      var e = ENTRIES[i];
      if (e.labels && e.labels.indexOf(norm) !== -1) exact.push(e);
      else if (sigMatches(norm, e.sig)) bySig.push(e);
    }
    // Exact matches rank ahead of signature matches, but both stay in
    // declaration order so the claimer's document-order logic holds.
    return exact.concat(bySig);
  }

  // Hands out one entry per call for a given label, in declaration order, so
  // repeated labels (three "If Yes... compensatory time" rows) map to
  // compensatory -> compensatory1 -> compensatory2 by position in the paste.
  function makeLabelClaimer(layout){
    var claimed = {};
    return function claim(normLabelText){
      var cands = candidatesFor(normLabelText, layout);
      for (var i = 0; i < cands.length; i++) {
        if (!claimed[cands[i].postName]) {
          claimed[cands[i].postName] = true;
          return cands[i];
        }
      }
      return null;
    };
  }

  function findByNormalizedLabel(norm, layout){
    var cands = candidatesFor(norm, layout);
    return cands.length ? cands[0] : null;
  }

  function resolveAlias(norm, layout){
    var postName = LABEL_ALIASES[norm];
    if (!postName) return null;
    var ENTRIES = entriesFor(layout);
    for (var i = 0; i < ENTRIES.length; i++) if (ENTRIES[i].postName === postName) return ENTRIES[i];
    return null;
  }

  // A field's POST name (the form input's name=/id= and $_POST key) does not
  // always equal its actual DB column name / PHP variable name. Confirmed by
  // grepping every reference file supplied so far (reg_details.php's
  // $row_reg[...] reads, reg_submit.php's $-variable assignments, and the
  // user's print.php's $reg-> properties all agree): exactly three fields
  // differ, always by dropping a leading "opt" — but this is recorded as an
  // explicit map, not a strip-the-prefix rule, matching this dictionary's own
  // "don't infer, enumerate" precedent (see the file-header note on
  // compensatary_time). Single source of truth for every emitter that needs
  // the real DB name, not just detailsPhp.js's original (narrower) use.
  var DB_NAME_OVERRIDES = {
    optdisability: 'disability',
    optscribe: 'scribe',
    optdisability_40less: 'disability_40less'
  };
  function dbNameFor(postName){ return DB_NAME_OVERRIDES[postName] || postName; }

  // scribe_id_proof dropdown codes (row 18/9.6/20's Values cell). Fixed by
  // validation requirement, not by a given SOW's own paste order: the
  // generated reg_validations.php itself tests scribe_id_proof=='01' (PAN's
  // 10-char format) and =='05'||=='06' (12-digit Aadhaar/e-Aadhaar format),
  // so those three codes can never be renumbered by whichever order a SOW
  // happens to list the values in. Enumerated explicitly, same "don't infer"
  // precedent as DB_NAME_OVERRIDES above.
  var SCRIBE_ID_PROOF_CODES = {
    'pan card': '01',
    'passport': '02',
    'driving licence': '03',
    'driving license': '03',
    'voters card': '04',
    'aadhaar card': '05',
    'aadhar card': '05',
    'eaadhaar card': '06',
    'eaadhar card': '06'
  };
  function normIdProofName(s){
    return String(s || '').toLowerCase().replace(/[’'\-]/g, '')
      .replace(/\s+/g, ' ').trim().replace(/[\.\:\*\,]+$/, '');
  }
  // Splits the raw pasted Values cell ("Values PAN Card/ Passport/ ...", or
  // nitrjul26's "Values are \nPAN Card/...") into an ordered {code,name} list.
  // A name outside the known map above falls back to the next unused
  // two-digit code (07, 08, ...) — a safety net, not a modeled default; it
  // never fires against any real fixture (every Set 1 sample's scribe_id_proof
  // Values cell is a subset of the six names above).
  function scribeIdProofEntries(rawValues){
    var s = String(rawValues || '').replace(/^\s*values?\b\s*(?:are\b)?\s*/i, '');
    var parts = s.split('/');
    var out = [], next = 7;
    for (var i = 0; i < parts.length; i++) {
      var name = parts[i].replace(/\s+/g, ' ').trim();
      if (!name) continue;
      var code = SCRIBE_ID_PROOF_CODES[normIdProofName(name)];
      if (!code) { code = (next < 10 ? '0' : '') + next; next++; }
      out.push({ code: code, name: name });
    }
    return out;
  }

  App.DICT = {
    ENTRIES: ENTRIES1,
    ENTRIES1: ENTRIES1,
    ENTRIES2: ENTRIES2,
    entriesFor: entriesFor,
    HIDDEN_FIELDS: HIDDEN_FIELDS,
    LABEL_ALIASES: LABEL_ALIASES,
    makeLabelClaimer: makeLabelClaimer,
    findByNormalizedLabel: findByNormalizedLabel,
    resolveAlias: resolveAlias,
    candidatesFor: candidatesFor,
    dbNameFor: dbNameFor,
    scribeIdProofEntries: scribeIdProofEntries
  };

})(window.App = window.App || {});
