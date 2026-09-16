/* Disability Code Generator — module: core/fieldcodes.js
   Which value list each field's own dropdown actually offers.

   The review panel lets a condition target any pasted field, but an `in`
   condition's codes only mean anything against that field's OWN option list,
   and those lists are not interchangeable. The same two-digit code names a
   different thing in each dropdown, and across the two layouts the SAME field
   changes which list it holds:

     Set 1    disability_category     -> Input B's categories
              disability_type         -> Input B's types
              disability_multiple     -> Input B's types

     Set 2/3  disability_type         -> Input B's CATEGORIES (row 5 asks for
                                         the category in this layout, even
                                         though it is headed "Type of
                                         Disability")
              subdistypeido           -> the routing category's own sub-types
              sub_disability_type     -> every OTHER category's sub-types
              sub_disability_multiple -> the multi-select's own option list

   So "01" under Set 2's disability_type is the VI category, while "01" under
   sub_disability_type is the Blind sub-type. Rendering one list for all of
   them mislabels every chip on every other field.

   Each list mirrors what js/generators/config.js and config2.js emit for that
   dropdown, so the panel can only offer values the generated code can hold.

   No DOM access. */
(function(App){

  function categoryOptions(parseB){
    return ((parseB && parseB.categories) || []).map(function(c){
      return { code: c.code, name: c.label };
    });
  }

  function typeOptions(parseB){
    return ((parseB && parseB.types) || []).map(function(t){
      return { code: t.code, name: t.name };
    });
  }

  function codeSet(codes){
    var set = {};
    for (var i = 0; i < (codes || []).length; i++) set[codes[i]] = true;
    return set;
  }

  function only(options, codes){
    var keep = codeSet(codes);
    return options.filter(function(o){ return keep[o.code]; });
  }

  function except(options, codes){
    var drop = codeSet(codes);
    return options.filter(function(o){ return !drop[o.code]; });
  }

  function fieldByPostName(parseA, postName){
    var fields = (parseA && parseA.fields) || [];
    for (var i = 0; i < fields.length; i++) {
      if (fields[i].postName === postName) return fields[i];
    }
    return null;
  }

  // `roles` is core/set2.js's output (resolveAll's `.set2`), null for Set 1.
  function codeListForField(postName, parseA, parseB, roles){
    var types = typeOptions(parseB);

    // Not a disability list at all — its codes come from its own pasted
    // Values cell, the same way config.php's $arrScribeIDProof is built.
    if (postName === 'scribe_id_proof') {
      var field = fieldByPostName(parseA, postName);
      return field ? App.DICT.scribeIdProofEntries(field.values) : [];
    }

    if (parseA && parseA.isSet2) {
      if (postName === 'disability_type') return categoryOptions(parseB);
      if (postName === 'subdistypeido') return only(types, roles && roles.idoTypeCodes);
      // Shape 3 has no routing split, so idoTypeCodes is empty and its one
      // sub-type dropdown keeps every type — which is exactly what it serves.
      if (postName === 'sub_disability_type') return except(types, roles && roles.idoTypeCodes);
      if (postName === 'sub_disability_multiple') return only(types, roles && roles.mulOptionCodes);
      return types;
    }

    if (postName === 'disability_category') return categoryOptions(parseB);
    return types;
  }

  App.codeListForField = codeListForField;

})(window.App = window.App || {});
