/* Disability Code Generator — module: generators/langPhp.js
   reg_details_lang.php — $LANG['langKey'] = 'label text'; lines, one per
   pasted field, in document order. The label text is the SOW's OWN verbatim
   question wording (field.label, set at parse time in inputA.js) — never a
   hardcoded English string — because per-project label wording is exactly
   what varies between SOWs; only the LANG key itself is standardized.

   Dedup by langKey, keeping the FIRST occurrence's text: three dictionary
   entries intentionally share 'reg_compensatory' (compensatory/compensatory1/
   compensatory2 — see dictionary.js's ENTRIES comment), so without dedup a
   SOW pasting all three would emit the same $LANG key three times. Their
   label text is always identical by construction (same dictionary
   label/signature match), so "first wins" never silently drops a distinct
   wording.

   The note row (row 6, control==='note', no postName) has no field.label
   worth using — inputA.js leaves it holding the raw, still-"Note:"-prefixed
   text. It gets its own line here from ctx.parseA.noteText (the version
   inputA.js already strips the prefix from), gated on that being non-empty,
   same gate detailsPhp.js's own reg_desc2 block uses.

   PHP single-quoted string escaping only needs to handle \ and ' — no other
   character is special inside '...'. */
(function(App){

  function escapePhpSingleQuoted(text){
    return String(text).replace(/\s+/g, ' ').trim()
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'");
  }

  function genLangPhp(ctx){
    var fields = ctx.parseA.fields;
    var noteText = ctx.parseA.noteText;
    var seen = {};
    var lines = [];

    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      var langKey, text;

      if (f.isNote) {
        if (!noteText) continue;
        langKey = f.langKey; text = noteText;
      } else if (f.postName) {
        langKey = f.langKey; text = f.label;
      } else {
        continue; // unmatched-label row — nothing standardized to key it by
      }

      if (seen[langKey]) continue;
      seen[langKey] = true;
      lines.push("$LANG['" + langKey + "'] = '" + escapePhpSingleQuoted(text) + "';");
    }

    return lines.join('\n');
  }

  App.GEN = App.GEN || {};
  App.GEN.lang = genLangPhp;

})(window.App = window.App || {});
