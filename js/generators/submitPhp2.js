/* Disability Code Generator — module: generators/submitPhp2.js
   Set 2's reg_submit.php. Loaded AFTER generators/submitPhp.js, which it
   wraps: App.GEN.submit() dispatches on ctx.parseA.isSet2.

   One assignment (or small statement group) per pasted field, in document
   order, each gated on has(postName). The guard on each assignment is the
   field's own resolved enable condition — the same structure reg_details.php
   negates into `disabled` and reg_validations.php turns into a mandatory-field
   gate — so the three files can never disagree about when a column is written.

   Order is load-bearing: like the reference, a guard refers to the PHP
   variables assigned ABOVE it ($disability, $disability_type, $subdistypeido)
   rather than re-reading $_POST, so a value rejected upstream cannot leak
   into a downstream column. Only the multi-select is read from $_POST, since
   it arrives as an array and is stored as a CSV.

   Variable names are DB column names, not POST names — $disability for
   optdisability, $scribe for optscribe, $disability_40less for
   optdisability_40less (App.DICT.dbNameFor). */
(function(App){

  var genSubmitSet1 = App.GEN && App.GEN.submit;

  var MULTI = 'sub_disability_multiple';

  function v(postName){ return '$' + App.DICT.dbNameFor(postName); }

  // The PHP expression that is true when this condition holds, written
  // against the variables already assigned above.
  function expr(cond){
    var i, parts = [];
    if (cond.op === '==') return v(cond.field) + " == '" + cond.value + "'";
    if (cond.op === 'selected') return v(cond.field) + " != ''";
    if (cond.op === 'in') {
      if (cond.field === MULTI) {
        for (i = 0; i < cond.codes.length; i++) {
          parts.push('in_array("' + cond.codes[i] + '",$_POST[\'' + MULTI + '\'],true)');
        }
        if (!parts.length) return 'false';
        return "(is_array($_POST['" + MULTI + "']) && (" + parts.join(' || ') + '))';
      }
      for (i = 0; i < cond.codes.length; i++) parts.push(v(cond.field) + " == '" + cond.codes[i] + "'");
      if (!parts.length) return 'false';
      return (parts.length === 1) ? parts[0] : '(' + parts.join(' || ') + ')';
    }
    return 'false';
  }

  function guardFor(resolved, postName){
    var entry = resolved[postName];
    if (!entry || !entry.enabledWhen) return null;
    var w = entry.enabledWhen;
    if (w.op === 'or') {
      var parts = [];
      for (var i = 0; i < w.conditions.length; i++) parts.push(expr(w.conditions[i]));
      if (!parts.length) return null;
      return (parts.length === 1) ? parts[0] : '(' + parts.join(' || ') + ')';
    }
    return expr(w);
  }

  function genSubmitSet2(ctx){
    var resolved = ctx.resolve.resolved;
    var fields = ctx.parseA.fields;
    var roles = ctx.set2 || App.SET2.roles(ctx.parseA, ctx.parseB);

    function has(postName){
      for (var i = 0; i < fields.length; i++) if (fields[i].postName === postName) return true;
      return false;
    }

    var idoCat = roles.idoCategoryCode || '';
    var mulCode = roles.multipleCode || '';
    var trigger = roles.multiTriggerField || 'subdistypeido';
    var rootY = has('optdisability') ? "$disability == 'Y'" : null;

    // AND the root toggle onto every dependent field, as the reference does:
    // it is what makes switching the root answer to N clear the whole
    // sub-tree in one pass.
    function withRoot(g){
      if (!g && !rootY) return null;
      if (!g) return rootY;
      if (!rootY) return g;
      return g + ' && ' + rootY;
    }

    // `$x = (<guard>) ? getVal($_POST['<post>']) : <fallback>;`
    function assign(postName, guard, fallback){
      var lhs = v(postName) + ' = ';
      if (!guard) return lhs + "getVal($_POST['" + postName + "']);\n";
      return lhs + '(' + guard + ") ? getVal($_POST['" + postName + "']) : " + (fallback || 'NULL') + ';\n';
    }

    var out = [];

    if (has('optdisability')) {
      out.push("$disability = ($_POST['optdisability'] != '') ? getVal($_POST['optdisability']) : NULL;\n");
    }
    if (has('disability_type')) {
      out.push(assign('disability_type', "$_POST['disability_type'] != '' && $_POST['disability_type'] != '0'" + (rootY ? " && $_POST['optdisability'] == 'Y'" : '')));
    }
    if (has('subdistypeido')) {
      out.push(assign('subdistypeido', withRoot(guardFor(resolved, 'subdistypeido'))));
    }
    if (has('sub_disability_type')) {
      // Structural, exactly as in reg_details.php: this column only ever
      // holds a sub-type of a NON-routing category.
      var subCats = roles.subTypeCategories.map(function(c){ return "$disability_type == '" + c.code + "'"; });
      var subGuard = "$_POST['sub_disability_type'] != ''" +
        (subCats.length ? ' && (' + subCats.join(' || ') + ')' : '');
      out.push(assign('sub_disability_type', withRoot(subGuard)));
    }
    if (has(MULTI)) {
      var openParts = ["is_array($_POST['" + MULTI + "'])", '$' + trigger + " == '" + mulCode + "'"];
      if (has('disability_type') && idoCat) openParts.push("$disability_type == '" + idoCat + "'");
      if (rootY) openParts.push(rootY);
      out.push('\nif (' + openParts.join(' && ') + ') {\n' +
        '\t$' + MULTI + ' = implode(",", $_POST[\'' + MULTI + '\']);\n' +
        '} else {\n' +
        "\t$" + MULTI + " = '';\n" +
        '}\n\n');
    }

    ['compans_time', 'disabilitysuffersoc', 'compensatory', 'compensatary_time', 'compensatory1', 'optscribe']
      .forEach(function(postName){
        if (!has(postName)) return;
        // The reference stores '' rather than NULL for the two "if Yes,
        // compensatory time" follow-ups; every other column stores NULL.
        var fallback = (postName === 'compensatory' || postName === 'compensatory1') ? "''" : 'NULL';
        out.push(assign(postName, withRoot(guardFor(resolved, postName)), fallback));
      });

    // ── the 2(s) sub-tree: opened by answering N to the root toggle ──
    if (has('optdisability_40less')) {
      out.push('\n' + assign('optdisability_40less', has('optdisability') ? "$disability == 'N'" : null));
      if (has('compensatory2')) out.push(assign('compensatory2', "$_POST['compensatory2'] != '' && $disability_40less == 'Y'", "''"));
      if (has('scribe1')) out.push(assign('scribe1', "$_POST['scribe1'] != '' && $disability_40less == 'Y'"));
      if (has('disability_certify')) out.push(assign('disability_certify', "$_POST['disability_certify'] != '' && $disability_40less == 'Y'", "''"));
    }

    // ── rows 17.1-17.6: written whenever either scribe question is Yes ──
    var scribeY = [];
    if (has('optscribe')) scribeY.push("$scribe == 'Y'");
    if (has('scribe1')) scribeY.push("$scribe1 == 'Y'");
    var scribeGuard = scribeY.join(' || ');
    if (scribeGuard) {
      var wrote = false;
      ['scribe_name', 'scribe_id_proof', 'card_no_scribe', 'eligible_for_scribe',
       'undertake_to_produce_udid', 'edu_qual_for_scribe'].forEach(function(postName){
        if (!has(postName)) return;
        if (!wrote) { out.push('\n'); wrote = true; }
        out.push(assign(postName, scribeGuard));
      });
    }

    return out.join('').replace(/\s+$/, '') + '\n';
  }

  App.GEN = App.GEN || {};
  App.GEN.submitSet2 = genSubmitSet2;
  App.GEN.submit = function(ctx){
    return (ctx.parseA && ctx.parseA.isSet2) ? genSubmitSet2(ctx) : genSubmitSet1(ctx);
  };

})(window.App = window.App || {});
