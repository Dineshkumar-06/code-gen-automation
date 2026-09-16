/* Disability Code Generator — module: generators/qryArrays.js
   reg_qry_arrays.php — a paste-in list of DB column (POST) names, one per
   pasted field, in document order, for the target project's own DB-fields
   array (see reg_qry_arrays.php lines 110-118 supplied by the user as the
   format reference).

   100% a re-projection of ctx.parseA.fields — no new parsing, no dictionary
   work. Same has()-less style as the other ctx-based emitters, except there
   is nothing to gate: parseA.fields is already scoped to exactly the rows
   this SOW's own paste contains (unmatched-label rows already carry
   postName===null and are skipped below).

   Two exclusions, both deliberate:
     - the note row (control==='note', postName===null) is not a DB field.
     - disability_type's multiPostName ('disability_multiple[]') does NOT
       get its own line — reg_submit.php (submitPhp.js) treats disability_type
       as the one DB column that holds either the single-select value or the
       imploded multi-select CSV, never both/separate columns. Emitting a
       second row here would create a DB column nothing ever writes to.

   The DB column name is not always the POST name — App.DICT.dbNameFor()
   (js/core/dictionary.js) applies the same 3 known exceptions detailsPhp.js's
   $row_reg reads and the user's print.php reference both already confirm
   (optdisability->disability, optscribe->scribe,
   optdisability_40less->disability_40less). */
(function(App){
  var DICT = App.DICT;

  function genQryArrays(ctx){
    var fields = ctx.parseA.fields;
    var lines = [];
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      if (!f.postName || f.isNote) continue;
      lines.push('"' + DICT.dbNameFor(f.postName) + '",');
    }
    return lines.join('\n');
  }

  App.GEN = App.GEN || {};
  App.GEN.qryArrays = genQryArrays;

})(window.App = window.App || {});
