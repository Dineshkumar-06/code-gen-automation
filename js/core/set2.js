/* Disability Code Generator — module: core/set2.js
   Set 2 structural roles, derived once and shared by every Set 2 emitter.

   Set 2 splits the sub-type question across two dropdowns, and which category
   goes to which is the one structural fact that is neither fixed nor stated
   as a normal enable/disable condition:

     - exactly ONE category routes through `subdistypeido` ("Sub-Type of
       Disability for MD/IDs'" in the reference) — call it the IDO category;
     - every OTHER category routes through `sub_disability_type`;
     - one sub-type UNDER the IDO category is the "Multiple Disabilities"
       entry, and picking it opens `sub_disability_multiple`, whose option
       list is every sub-type in the paste except that entry itself.

   Two independent signals identify the IDO category, for the same reason
   parsing/inputA.js's Set 2 detection has two (prose wording is per-SOW):

     1. the `subdistypeido` row's own Validations cell names the category
        ("...if selected 'MD/ID' in point no 5"). Strongest signal — it is the
        requirement stating the routing directly.
     2. the category whose own sub-type list contains a "Multiple
        Disabilities" entry. Structural rather than prose-based, and the one
        that still works for a SOW with no subdistypeido row at all.

   Signal 1 wins when both fire; a disagreement is warned rather than silently
   resolved, since it means the paste says two different things.

   No DOM access. */
(function(App){
  var normName = App.normName;

  var MULTIPLE_RE = /multiple\s+disabilit/i;

  function fieldByPostName(fields, postName){
    for (var i = 0; i < (fields || []).length; i++) {
      if (fields[i].postName === postName) return fields[i];
    }
    return null;
  }

  function escRe(s){ return String(s).replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&'); }

  // A category label is often a bare 2-3 letter code ("VI", "OC", "MD/ID"),
  // so it must match on word boundaries or "OC" hits inside "OCcupation".
  // Longest label first, so "MD/ID" is not shadowed by a hypothetical "MD".
  function categoryNamedIn(text, categories){
    if (!text) return null;
    var sorted = categories.slice().sort(function(a, b){ return b.label.length - a.label.length; });
    for (var i = 0; i < sorted.length; i++) {
      var lbl = String(sorted[i].label).trim();
      if (!lbl) continue;
      var re = new RegExp('(^|[^A-Za-z0-9])' + escRe(lbl) + '($|[^A-Za-z0-9])', 'i');
      if (re.test(text)) return sorted[i].code;
    }
    return null;
  }

  function roles(parseA, parseB){
    var fields = (parseA && parseA.fields) || [];
    var categories = (parseB && parseB.categories) || [];
    var types = (parseB && parseB.types) || [];
    var mapping = (parseB && parseB.mapping) || {};
    var warnings = [];

    // ── the "Multiple Disabilities" sub-type, and the category holding it ──
    var multipleCode = null;
    for (var t = 0; t < types.length; t++) {
      if (MULTIPLE_RE.test(types[t].name)) { multipleCode = types[t].code; break; }
    }

    var byMultiple = null;
    if (multipleCode) {
      for (var c = 0; c < categories.length; c++) {
        var csv = String(mapping[categories[c].code] || '');
        if (csv.split(',').indexOf(multipleCode) !== -1) { byMultiple = categories[c].code; break; }
      }
    }

    // ── signal 1: the subdistypeido row's own Validations cell ──
    var idoField = fieldByPostName(fields, 'subdistypeido');
    var byProse = idoField ? categoryNamedIn(idoField.validations, categories) : null;

    // The routing split only EXISTS when the paste actually has a
    // subdistypeido row. The second known Set 2 shape (fixture `set2b`) has
    // one sub-type dropdown serving every category, with "Multiple
    // Disabilities" appearing inside that single list — there is no IDO
    // category there to name, and pretending otherwise would generate a
    // second dropdown for a field the SOW never asked for.
    var idoCategoryCode = idoField ? (byProse || byMultiple) : null;

    if (idoField && !byProse && byMultiple) {
      warnings.push({ code: 'set2-ido-category-inferred',
        msg: 'The "' + idoField.label + '" row\'s Validations cell does not name which category routes through it; ' +
             'using "' + labelOf(categories, byMultiple) + '" because that is the category listing a ' +
             '"Multiple Disabilities" sub-type. Check this is right.' });
    }
    if (byProse && byMultiple && byProse !== byMultiple) {
      warnings.push({ code: 'set2-ido-category-conflict',
        msg: 'Conflicting signals for the sub-type routing category: the "' + idoField.label + '" row names "' +
             labelOf(categories, byProse) + '", but "' + labelOf(categories, byMultiple) +
             '" is the category listing a "Multiple Disabilities" sub-type. Using "' + labelOf(categories, byProse) +
             '" (the requirement\'s own wording).' });
    }
    if (idoField && !idoCategoryCode) {
      warnings.push({ code: 'set2-ido-category-not-found',
        msg: 'Could not work out which disability category routes through "' + idoField.label + '". ' +
             'Its Validations cell names no category from Input B, and no category lists a ' +
             '"Multiple Disabilities" sub-type. That dropdown will be generated with an empty option list.' });
    }
    if (!multipleCode && fieldByPostName(fields, 'sub_disability_multiple')) {
      warnings.push({ code: 'set2-multiple-type-not-found',
        msg: 'Input B lists no "Multiple Disabilities" sub-type, so nothing can open the ' +
             'multi-select. Add it to Input B under the sub-type routing category.' });
    }

    var idoTypeCodes = idoCategoryCode
      ? String(mapping[idoCategoryCode] || '').split(',').filter(Boolean)
      : [];

    var subTypeCategories = categories.filter(function(cat){ return cat.code !== idoCategoryCode; });

    // Whichever dropdown holds the "Multiple Disabilities" option is the one
    // whose change handler opens the multi-select: subdistypeido when the
    // routing split exists, otherwise the single sub-type dropdown.
    var multiTriggerField = null;
    if (fieldByPostName(fields, 'sub_disability_multiple')) {
      multiTriggerField = idoField ? 'subdistypeido'
        : (fieldByPostName(fields, 'sub_disability_type') ? 'sub_disability_type' : null);
    }

    // Options offered by the multi-select: every sub-type in the paste except
    // the "Multiple Disabilities" entry that opened it.
    var mulOptionCodes = types
      .map(function(ty){ return ty.code; })
      .filter(function(code){ return code !== multipleCode; });

    return {
      idoCategoryCode: idoCategoryCode || null,
      idoCategoryLabel: idoCategoryCode ? labelOf(categories, idoCategoryCode) : null,
      idoTypeCodes: idoTypeCodes,
      subTypeCategories: subTypeCategories,
      multipleCode: multipleCode,
      multiTriggerField: multiTriggerField,
      mulOptionCodes: mulOptionCodes,
      warnings: warnings
    };
  }

  function labelOf(categories, code){
    for (var i = 0; i < categories.length; i++) if (categories[i].code === code) return categories[i].label;
    return code;
  }

  function typeName(types, code){
    for (var i = 0; i < types.length; i++) if (types[i].code === code) return types[i].name;
    return '';
  }

  App.SET2 = {
    roles: roles,
    typeName: typeName,
    categoryNamedIn: categoryNamedIn
  };

})(window.App = window.App || {});
