/* Disability Code Generator — module: generators/config.js
   Phase 4 — emits config.php's three PHP arrays (PRD §3): $arrDiscategory,
   $arrDisabilityType2, $arrpostCategoryDisability_mapping. Pure translation
   of Phase 1's parse of Input B (parseB.categories/types/mapping) into PHP
   array-literal syntax — no resolver involvement, since these three arrays
   just ARE Input B's own data.

   $disability_duplicate1/2/3 are intentionally NOT emitted — PRD §3
   explicitly excludes them from generation. */
(function(App){

  // Each entry line carries its own trailing ",\n" (including the LAST one —
  // the reference's closing ");" follows directly with no blank line before it).
  function arrayBlock(items, keyProp, valProp){
    var out = '';
    for (var i = 0; i < items.length; i++) {
      out += "'" + items[i][keyProp] + "'=>'" + items[i][valProp] + "',\n";
    }
    return out;
  }

  function scribeIdProofField(fields){
    for (var i = 0; i < fields.length; i++) if (fields[i].postName === 'scribe_id_proof') return fields[i];
    return null;
  }

  function genConfig(ctx){
    var categories = ctx.parseB.categories || [];
    var types = ctx.parseB.types || [];
    var mapping = ctx.parseB.mapping || {};
    var fields = (ctx.parseA && ctx.parseA.fields) || [];

    var out = "$arrDiscategory=array(\n" + arrayBlock(categories, 'code', 'label') + ");";
    out += "\n\n";
    out += "$arrDisabilityType2=array(\n" + arrayBlock(types, 'code', 'name') + ");";
    out += "\n\n";
    out += "$arrpostCategoryDisability_mapping = array(\n";
    for (var i = 0; i < categories.length; i++) {
      out += "'" + categories[i].code + "'=>'" + (mapping[categories[i].code] || '') + "',\n";
    }
    out += ");";

    var scribeField = scribeIdProofField(fields);
    if (scribeField) {
      var entries = App.DICT.scribeIdProofEntries(scribeField.values);
      out += "\n\n$arrScribeIDProof=array(\n" + arrayBlock(entries, 'code', 'name') + ");";
    }

    return out;
  }

  App.GEN = App.GEN || {};
  App.GEN.config = genConfig;

})(window.App = window.App || {});
