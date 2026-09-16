/* Disability Code Generator — module: core/state.js
   Shared state singleton (App.S), string helpers, and label normalization.
   No DOM access here — this file must load unmodified in the Node vm harness. */
(function(App){

  function freshState(){
    return {
      // raw pastes
      rawInputA: '',
      rawInputB: '',

      // Phase 1 output (Input B)
      categories: [],          // [{code:'01', letter:'A'}, ...]
      types: [],                // [{code:'01', name:'Blindness'}, ...] appearance order
      mapping: {},               // categoryCode -> 'csv,of,type,codes'

      // Phase 2 output (Input A)
      fields: [],                // field objects, see parsing/inputA.js
      noteText: '',              // row 6 note text -> reg_desc2

      // Phase 3 output (resolver)
      resolved: {},              // postName -> enabledWhen structure
      popupText: null,           // row 5's extracted alert() text, or null
      exclusionGroups: [],       // [{codes:['05',...], names:[...], message:'...'}]

      // User-assigned value aliases (rawAbbrevText -> type code), for
      // abbreviations the SOW's own type list never spelled out (e.g. "ASD").
      // Fed into buildTypeIndex() on every regenerate(), so one assignment
      // reaches every field's condition scan, not just the row that warned.
      manualAliases: {},

      warnings: [],              // [{code, msg}]

      // Which disability layout the current parse is: 1 or 2 (PRD §10).
      // Drives which companion AJAX files are offered — see ui.js's TABS.
      layoutSet: 1,

      // generated code, cached per tab key
      generated: {
        config: '',
        detailsPhp: '',
        detailsJs: '',
        validations: '',
        submit: ''
      }
    };
  }

  var S = freshState();

  function resetState(){
    var fresh = freshState();
    for (var k in fresh) { S[k] = fresh[k]; }
    return S;
  }

  // ── string helpers ──
  function escH(s){
    s = (s == null) ? '' : String(s);
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function escA(s){
    return escH(s).replace(/"/g,'&quot;');
  }

  function ind(n){
    var out = '';
    for (var i=0;i<n;i++) out += '\t';
    return out;
  }

  // Collapse Excel/typographic artifacts before normalizing: smart quotes -> straight,
  // NBSP -> space, then lowercase + collapse whitespace + strip trailing ?/:/ *.
  function cleanText(s){
    s = (s == null) ? '' : String(s);
    return s
      .replace(/[‘’′]/g, "'")
      .replace(/[“”″]/g, '"')
      .replace(/ /g, ' ');
  }

  // Bilingual labels: several SOWs append a translation after " / ", e.g.
  //   "Are you a person with benchmark disability of 40% and above ? / आपण ४० ..."
  // Cut at the first space-slash-space. Requiring spaces on BOTH sides is what
  // keeps this from mangling genuine English labels that contain a slash, such
  // as "I undertake to produce UDID/disability certificate/ Appendix-I ...".
  function stripTranslation(s){
    var i = String(s).indexOf(' / ');
    return (i === -1) ? s : s.slice(0, i);
  }

  function normLabel(s){
    s = cleanText(s);
    s = stripTranslation(s);
    s = s.toLowerCase();
    s = s.replace(/\s+/g, ' ').trim();
    // Trailing punctuation varies freely between SOWs ("?", " :", ".", "*").
    s = s.replace(/[\?\:\*\.\,\-]+$/, '').trim();
    return s;
  }

  // Disability type/category names, and any free text scanned for them.
  // Deliberately does NOT strip translations: a slash here is a separator
  // between type names ("OA (One Arm) / OL (One leg) / ..."), not a bilingual
  // delimiter, and cutting at it would silently drop most of a cluster.
  function normName(s){
    s = cleanText(s).toLowerCase();
    s = s.replace(/\s+/g, ' ').trim();
    s = s.replace(/[\?\:\*\.\,]+$/, '').trim();
    return s;
  }

  function addWarning(code, msg){
    S.warnings.push({ code: code, msg: msg });
  }

  App.S = S;
  App.resetState = resetState;
  App.escH = escH;
  App.escA = escA;
  App.ind = ind;
  App.cleanText = cleanText;
  App.stripTranslation = stripTranslation;
  App.normLabel = normLabel;
  App.normName = normName;
  App.addWarning = addWarning;

})(window.App = window.App || {});
