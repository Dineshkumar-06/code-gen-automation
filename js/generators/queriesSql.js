/* Disability Code Generator — module: generators/queriesSql.js
   disability_queries — one ALTER TABLE ADD COLUMN statement per pasted
   field, in document order, against the `registration` table (fixed —
   every format example the user supplied targets that table).

   DDL type comes straight from field.control (already resolved by the
   dictionary at parse time — see dictionary.js/inputA.js, no new detection
   needed, same conclusion the earlier research pass reached):
     - 'radio'                          -> ENUM('Y','N')
     - 'checkbox'                       -> VARCHAR(1), per the user's own
       rule — checkbox length is always 1, the paste's own Max Length cell
       is empty for every checkbox row in every real fixture (confirmed:
       disability_certify/eligible_for_scribe/undertake_to_produce_udid/
       edu_qual_for_scribe all have field.maxLength==='' in BPCL), so there
       is nothing meaningful to read there anyway.
     - 'select' / 'select+multiselect' / 'text' -> VARCHAR(N), N = the
       SOW's own pasted Max Length cell (field.maxLength) for THIS field —
       deliberately not a fixed number; the user's own two VARCHAR examples
       use two different lengths (15 and 35) for two different fields.

   No dedup: unlike reg_details_lang.php's LANG keys (which several fields
   deliberately share), every field here maps to its OWN real DB column —
   compensatory/compensatory1/compensatory2 are three distinct columns in
   reg_submit.php ($compensatory/$compensatory1/$compensatory2), not one
   shared name. DB column names go through the same App.DICT.dbNameFor()
   postName exceptions qryArrays.js uses (optdisability->disability etc.) —
   this DDL must add the column reg_submit.php's own $-variables (and thus
   the query layer) actually write to, not the raw POST name.

   The note row and any unmatched-label field (no postName) are skipped —
   neither is a real DB column. Hidden fields (hidden_cerebral_scribe/
   hidden_dominant_scribe) are also correctly absent: they live only in
   detailsPhp.js's dictionary.js HIDDEN_FIELDS list, comment-wrapped and
   never actually submitted (see CLAUDE.md "Phase 4"), and never appear in
   ctx.parseA.fields at all. */
(function(App){
  var DICT = App.DICT;

  // Fallback only for a select/text field whose own Max Length cell is
  // missing or non-numeric — has never fired against any real SOW fixture
  // (every dropdown/textbox row in bpcl/iifcl/nitr/csmc carries a real
  // numeric Max Length), so this is a safety net, not a modeled default.
  var FALLBACK_VARCHAR_LEN = 50;

  function alterLine(dbName, ddlType){
    return "ALTER TABLE `registration` ADD `" + dbName + "` " + ddlType +
      " CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL ;";
  }

  function varcharLen(field){
    var n = parseInt(String(field.maxLength).trim(), 10);
    return (n > 0) ? n : FALLBACK_VARCHAR_LEN;
  }

  // Set 2's multi-select column stores a CSV of the chosen sub-type codes, so
  // its width is a property of the CODE TABLE, not of the SOW's Max Length
  // cell — that cell describes how wide one displayed value is (uiicljul26
  // says 25), while the column has to hold every code at once. Worst case is
  // every offered code selected: N codes of 2 digits plus N-1 commas. The
  // pasted Max Length is still respected as a floor, so a SOW asking for more
  // than the codes need still gets what it asked for.
  function multiCsvLen(field, ctx){
    var roles = ctx.set2 || (ctx.parseA && ctx.parseA.isSet2 ? App.SET2.roles(ctx.parseA, ctx.parseB) : null);
    var n = roles ? roles.mulOptionCodes.length : 0;
    var needed = n ? (n * 3 - 1) : FALLBACK_VARCHAR_LEN;
    return Math.max(needed, varcharLen(field));
  }

  function genQueries(ctx){
    var fields = ctx.parseA.fields;
    var lines = [];

    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      if (!f.postName || f.isNote) continue;

      var dbName = DICT.dbNameFor(f.postName);
      if (f.control === 'radio') {
        lines.push(alterLine(dbName, "ENUM( 'Y', 'N' )"));
      } else if (f.control === 'checkbox') {
        lines.push(alterLine(dbName, "VARCHAR( 1 )"));
      } else if (f.control === 'multiselect') {
        lines.push(alterLine(dbName, "VARCHAR( " + multiCsvLen(f, ctx) + " )"));
      } else if (f.control === 'select' || f.control === 'select+multiselect' || f.control === 'text') {
        lines.push(alterLine(dbName, "VARCHAR( " + varcharLen(f) + " )"));
      }
      // any other control isn't emitted by the dictionary at all — nothing else to handle
    }

    return lines.join('\n');
  }

  App.GEN = App.GEN || {};
  App.GEN.queries = genQueries;

})(window.App = window.App || {});
