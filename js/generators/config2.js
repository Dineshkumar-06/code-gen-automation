/* Disability Code Generator — module: generators/config2.js
   Set 2's config.php arrays. Loaded AFTER generators/config.js, which it
   wraps: App.GEN.config() now dispatches on ctx.parseA.isSet2, so the tab
   strip, the zip and every test keep seeing one `config` key.

   Set 2 replaces Set 1's three arrays with six, because the sub-type question
   is split across two dropdowns plus a multi-select (see core/set2.js):

     $arrDisabilityType2            the CATEGORY dropdown (row 5). Set 1 uses
                                    this same name for its TYPE list — the
                                    name is fixed by the reference application,
                                    it is not a hint that the two hold the
                                    same thing.
     $arrDisabilityTypeIDO          sub-types of the one routing category
                                    (`subdistypeido`, row 5.1).
     $arr_subDisabilityType2        sub-types of every OTHER category
                                    (`sub_disability_type`, row 6).
     $arr_subDisability_map_Edit    category -> its sub-type codes, for those
                                    other categories. Read by
                                    ajax_getSubType_disability.php.
     $arr_mulsubDisabilityType2     EVERY sub-type, for the multi-select.
     $arr_MulsubDisability_map_Edit routing-category sub-type -> the multi-
                                    select's option codes. Only the "Multiple
                                    Disabilities" entry maps to anything; the
                                    rest map to '' so the ajax returns nothing.
                                    Read by ajax_getSubType_Multiple_disability.php.

   Codes are this paste's own document-order codes from parseInputB, exactly
   as Set 1 assigns them. The reference config.php happens to use a different
   numbering (OC=01 although VI is listed first, Blind=10, ASD=15, Multiple
   Disabilities=25) — that is the reference application's historical master
   table, not something derivable from a SOW, and every generated file here
   uses one consistent set of codes throughout, so the numbering is internally
   correct either way. Confirmed with the user 2026-09-11.

   The IDO category's sub-types are emitted COMMENTED-OUT inside
   $arr_subDisabilityType2 / $arr_subDisability_map_Edit, reproducing the
   reference: they are genuinely dead there (that category routes through
   $arrDisabilityTypeIDO instead), and leaving them visible-but-disabled
   documents the exclusion rather than hiding it. */
(function(App){

  var genConfigSet1 = App.GEN && App.GEN.config;

  function phpStr(s){ return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }

  function line(code, value, commented){
    return (commented ? '// ' : '') + "'" + code + "'=>'" + phpStr(value) + "',\n";
  }

  function typesByCode(types){
    var m = {};
    for (var i = 0; i < types.length; i++) m[types[i].code] = types[i].name;
    return m;
  }

  function scribeIdProofField(fields){
    for (var i = 0; i < fields.length; i++) if (fields[i].postName === 'scribe_id_proof') return fields[i];
    return null;
  }

  function has(fields, postName){
    for (var i = 0; i < fields.length; i++) if (fields[i].postName === postName) return true;
    return false;
  }

  function genConfigSet2(ctx){
    var categories = ctx.parseB.categories || [];
    var types = ctx.parseB.types || [];
    var mapping = ctx.parseB.mapping || {};
    var fields = (ctx.parseA && ctx.parseA.fields) || [];
    var roles = ctx.set2 || App.SET2.roles(ctx.parseA, ctx.parseB);
    var nameOf = typesByCode(types);
    var isIdo = {};
    for (var i = 0; i < roles.idoTypeCodes.length; i++) isIdo[roles.idoTypeCodes[i]] = true;

    var parts = [];

    // ── row 5: the category dropdown ──
    var s = '$arrDisabilityType2 = array(\n';
    for (i = 0; i < categories.length; i++) s += line(categories[i].code, categories[i].label, false);
    parts.push(s + ');');

    // ── row 5.1: the routing category's own sub-types ──
    if (has(fields, 'subdistypeido')) {
      s = '$arrDisabilityTypeIDO = array(\n';
      for (i = 0; i < roles.idoTypeCodes.length; i++) {
        s += line(roles.idoTypeCodes[i], nameOf[roles.idoTypeCodes[i]], false);
      }
      parts.push(s + ');');
    }

    // ── row 6: every other category's sub-types ──
    if (has(fields, 'sub_disability_type')) {
      s = '$arr_subDisabilityType2 = array(\n';
      for (i = 0; i < types.length; i++) s += line(types[i].code, types[i].name, !!isIdo[types[i].code]);
      parts.push(s + ');');

      s = '$arr_subDisability_map_Edit = array(\n';
      for (i = 0; i < categories.length; i++) {
        var cat = categories[i];
        s += line(cat.code, mapping[cat.code] || '', cat.code === roles.idoCategoryCode);
      }
      parts.push(s + ');');
    }

    // ── row 6.1: the multi-select ──
    if (has(fields, 'sub_disability_multiple')) {
      s = '$arr_mulsubDisabilityType2 = array(\n';
      for (i = 0; i < types.length; i++) s += line(types[i].code, types[i].name, false);
      parts.push(s + ');');

      // Keyed by whichever dropdown carries the "Multiple Disabilities"
      // option (subdistypeido when the routing split exists, otherwise the
      // single sub-type dropdown) — see core/set2.js's multiTriggerField.
      var mulKeys = (roles.multiTriggerField === 'subdistypeido')
        ? roles.idoTypeCodes
        : types.map(function(t){ return t.code; });
      s = '$arr_MulsubDisability_map_Edit = array(\n';
      for (i = 0; i < mulKeys.length; i++) {
        s += line(mulKeys[i], mulKeys[i] === roles.multipleCode ? roles.mulOptionCodes.join(',') : '', false);
      }
      parts.push(s + ');');
    }

    var scribeField = scribeIdProofField(fields);
    if (scribeField) {
      var entries = App.DICT.scribeIdProofEntries(scribeField.values);
      s = '$arrScribeIDProof = array(\n';
      for (i = 0; i < entries.length; i++) s += line(entries[i].code, entries[i].name, false);
      parts.push(s + ');');
    }

    return parts.join('\n\n');
  }

  App.GEN = App.GEN || {};
  App.GEN.configSet2 = genConfigSet2;
  App.GEN.config = function(ctx){
    return (ctx.parseA && ctx.parseA.isSet2) ? genConfigSet2(ctx) : genConfigSet1(ctx);
  };

})(window.App = window.App || {});
