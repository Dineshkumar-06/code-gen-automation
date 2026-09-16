/* Disability Code Generator — module: generators/functionsPhp2.js
   Set 2's functions.php. Loaded AFTER generators/functionsPhp.js, which it
   wraps: App.GEN.functionsPhp() dispatches on ctx.parseA.isSet2, so the tab
   keeps one key and stays visible for both layouts — each just gets the
   helpers its own generated markup actually calls.

   Set 2 needs exactly one: PrintArrSub_disDetails(), which
   reg_details.php's multi-select calls to print its <option> list. Supplied
   by the user 2026-09-11.

   Unlike Set 1's fnSelectArrayMultiHash() — genuinely static, it just walks
   whatever array it is handed — this one is SOW-DERIVED, because it groups
   the sub-types under <optgroup> headings and both the headings and their
   membership come from Input B:

     one <optgroup label="<category label>"> per category, listing that
     category's own sub-type codes, minus the "Multiple Disabilities" entry
     that opened this list in the first place.

   The user's reference copy hardcodes four labels and four code lists
   ('10'/'11' under VI, '12'/'13' under HI, thirteen under OC, four under
   MD/ID) — those are uiicljul26's own Other Details table, not fixed values,
   so they are generated here from parseB.categories / parseB.mapping and
   core/set2.js's mulOptionCodes. A category left with no codes after the
   exclusion is skipped rather than emitted as an empty <optgroup>.

   The emitted PHP keeps the reference's own structure verbatim otherwise —
   the foreach-over-$arr_mulsubDisabilityType2-with-an-if pattern rather than
   a tighter loop — so a developer diffing this against a real project's copy
   sees only the values change. */
(function(App){

  var genFunctionsPhpSet1 = App.GEN && App.GEN.functionsPhp;

  // Inside a PHP double-quoted string, printed into an HTML attribute that
  // the reference delimits with single quotes.
  function attrStr(s){
    return String(s == null ? '' : s)
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\$/g, '\\$')
      .replace(/'/g, '&#39;');
  }

  function optgroupBlock(label, codes){
    var tests = [];
    for (var i = 0; i < codes.length; i++) tests.push("$k == '" + codes[i] + "'");
    return "\t\tprint \"<optgroup label='" + attrStr(label) + "'>\";\n" +
      '\t\tforeach ($arr_mulsubDisabilityType2 as $k => $v) {\n' +
      '\t\t\tif (' + tests.join(' || ') + ') {\n' +
      '\t\t\t\tprint "<option value=\'$k\'";\n' +
      '\t\t\t\tif (isset($in_selected) && in_array($k, $selected)) {\n' +
      '\t\t\t\t\tprint " selected";\n' +
      '\t\t\t\t}\n' +
      '\t\t\t\tprint ">$v</option>";\n' +
      '\t\t\t}\n' +
      '\t\t}\n' +
      '\t\tprint "</optgroup>";\n';
  }

  function genFunctionsPhpSet2(ctx){
    var fields = (ctx.parseA && ctx.parseA.fields) || [];
    var categories = (ctx.parseB && ctx.parseB.categories) || [];
    var mapping = (ctx.parseB && ctx.parseB.mapping) || {};
    var roles = ctx.set2 || App.SET2.roles(ctx.parseA, ctx.parseB);

    var hasMulti = false;
    for (var f = 0; f < fields.length; f++) {
      if (fields[f].postName === 'sub_disability_multiple') { hasMulti = true; break; }
    }
    // Nothing calls it if the paste has no multi-select at all. Say so rather
    // than shipping a bare "<?php" the developer has to puzzle over.
    if (!hasMulti) {
      return '<?php\n\n' +
        '// Nothing to define here for this paste: PrintArrSub_disDetails() prints the\n' +
        "// multi-select's <option> list, and this SOW has no multi-select field.\n";
    }

    var offered = {};
    for (var o = 0; o < roles.mulOptionCodes.length; o++) offered[roles.mulOptionCodes[o]] = true;

    var blocks = [];
    for (var c = 0; c < categories.length; c++) {
      var csv = String(mapping[categories[c].code] || '');
      var codes = (csv ? csv.split(',') : []).filter(function(code){ return code && offered[code]; });
      if (!codes.length) continue;
      blocks.push(optgroupBlock(categories[c].label, codes));
    }

    return '<?php\n\n' +
      'function PrintArrSub_disDetails($in_selected)\n' +
      '\t{\n' +
      '\t\t$selected = explode(",", $in_selected);\n\n' +
      '\t\tglobal $arr_mulsubDisabilityType2;\n\n' +
      blocks.join('\n') +
      '\t}\n';
  }

  App.GEN = App.GEN || {};
  App.GEN.functionsPhpSet2 = genFunctionsPhpSet2;
  App.GEN.functionsPhp = function(ctx){
    return (ctx && ctx.parseA && ctx.parseA.isSet2) ? genFunctionsPhpSet2(ctx) : genFunctionsPhpSet1(ctx);
  };

})(window.App = window.App || {});
