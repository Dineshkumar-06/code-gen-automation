/* Disability Code Generator — module: generators/detailsJs2.js
   Set 2's reg_details.js. Loaded AFTER generators/detailsJs.js, which it
   wraps: App.GEN.detailsJs() dispatches on ctx.parseA.isSet2 so the tab
   strip, the zip and every test keep seeing one `detailsJs` key.

   Same design as Set 1's emitter: the cascade wiring (which handler hangs off
   which class, and what it resets) is structural to this standardized
   section, so it is fixed template text. The SOW-derived pieces are:

     - the alert() text, and WHICH categories it fires for
       (ctx.resolve.popupText / popupCategories — the requirement names them:
       "A popup message should be displayed to VI, OC, MD/ID candidates ...");
     - the two per-field scribe popups (ctx.resolve.fieldPopups), each hung
       off the point the requirement names rather than the row it is written
       on — see resolver.js's extractFieldPopups;
     - every code list, compiled from resolveAll()'s resolved{} and routed to
       the dropdown that actually offers it;
     - the routing category / "Multiple Disabilities" codes, from core/set2.js.

   GATING. Per CLAUDE.md's 2026-09-11 entry ("Absent-field leakage"), this
   file gates EVERY cross-field reference on that field's own presence, not
   just each handler's trigger field: a class name for a field the SOW never
   pasted is inert in jQuery but misleading to the developer pasting the
   output into a real project. Helper builders below return '' when a paste
   has none of the fields a line would touch, and the line is then omitted
   whole rather than emitted with an empty selector. */
(function(App){

  var genDetailsJsSet1 = App.GEN && App.GEN.detailsJs;

  function jsStr(s){
    return "'" + String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
  }

  // "x == '01' || x == '02'"
  function anyEquals(expr, codes){
    var out = [];
    for (var i = 0; i < codes.length; i++) out.push(expr + " == '" + codes[i] + "'");
    return out.join(' || ');
  }

  // A ".a,.b,.c" selector built only from the classes this paste actually has.
  function classSel(has, names){
    var out = [];
    for (var i = 0; i < names.length; i++) if (has(names[i])) out.push('.' + names[i]);
    return out.join(',');
  }

  // `$(".a,.b").prop({...})`, or '' when none of the classes exist.
  function propLine(has, names, props, indent){
    var sel = classSel(has, names);
    if (!sel) return '';
    return indent + '$("' + sel + '").prop(' + props + ');\n';
  }

  // Pull the codes a resolved entry attaches to one particular field.
  function codesFor(entry, field){
    if (!entry || !entry.enabledWhen) return [];
    var conds = (entry.enabledWhen.op === 'or') ? entry.enabledWhen.conditions : [entry.enabledWhen];
    for (var i = 0; i < conds.length; i++) {
      if (conds[i].op === 'in' && conds[i].field === field) return conds[i].codes;
    }
    return [];
  }

  // Which fields a resolved entry requires to be 'Y'.
  function yFieldsFor(entry){
    if (!entry || !entry.enabledWhen) return [];
    var conds = (entry.enabledWhen.op === 'or') ? entry.enabledWhen.conditions : [entry.enabledWhen];
    var out = [];
    for (var i = 0; i < conds.length; i++) {
      if (conds[i].op === '==' && conds[i].value === 'Y') out.push(conds[i].field);
    }
    return out;
  }

  // The reference counts matching selections with a .each() loop rather than
  // testing $(sel).val(), because a <select multiple> returns an array.
  function multiCountLoop(codes, counter, indent){
    return indent + counter + ' = 0;\n' +
      indent + "$('#sub_disability_multiple :selected').each(function (i, sel) {\n" +
      indent + '\tif (' + anyEquals('$(sel).val()', codes) + ') {\n' +
      indent + '\t\t' + counter + '++;\n' +
      indent + '\t}\n' +
      indent + '});\n';
  }

  // Single-line so the literal can be dropped at any nesting depth without
  // the emitted object's own newlines fighting the caller's indent.
  var DISABLE = "{ 'disabled': true, 'checked': false }";

  function genDetailsJsSet2(ctx){
    var resolved = ctx.resolve.resolved;
    var fields = ctx.parseA.fields;
    var roles = ctx.set2 || App.SET2.roles(ctx.parseA, ctx.parseB);
    var popupText = ctx.resolve.popupText;
    var fieldPopups = ctx.resolve.fieldPopups || {};

    function has(postName){
      for (var i = 0; i < fields.length; i++) if (fields[i].postName === postName) return true;
      return false;
    }

    var idoCat = roles.idoCategoryCode || '';
    var mulCode = roles.multipleCode || '';
    var trigger = roles.multiTriggerField || 'subdistypeido';
    var subTypeCats = roles.subTypeCategories.map(function(c){ return c.code; });
    var popupCats = ctx.resolve.popupCategories;

    // Code lists, each already routed to the dropdown that offers it.
    var compansIdo   = codesFor(resolved.compans_time, 'subdistypeido');
    var compansMulti = codesFor(resolved.compans_time, 'sub_disability_multiple');
    var socCats      = codesFor(resolved.disabilitysuffersoc, 'disability_type');
    var socMulti     = codesFor(resolved.disabilitysuffersoc, 'sub_disability_multiple');
    var scribeIdo    = codesFor(resolved.optscribe, 'subdistypeido');
    var scribeSub    = codesFor(resolved.optscribe, 'sub_disability_type');
    var scribeMulti  = codesFor(resolved.optscribe, 'sub_disability_multiple');
    var scribeY      = yFieldsFor(resolved.optscribe).filter(has);

    // ── the four "reset a dependent field" fragments, reused verbatim by
    //    several handlers, each trimmed to the classes this paste has ──
    function resetSocGroup(indent){
      return propLine(has, ['disabilitysuffersoc'], DISABLE, indent) +
             propLine(has, ['compensatory'], DISABLE, indent) +
             propLine(has, ['compensatary_time'], DISABLE, indent) +
             propLine(has, ['compensatory1'], DISABLE, indent);
    }
    function enableSocPair(indent){
      var out = '';
      if (has('disabilitysuffersoc')) out += indent + "$(\".disabilitysuffersoc\").prop({ 'disabled': false, 'checked': false });\n";
      if (has('compensatory')) out += propLine(has, ['compensatory'], DISABLE, indent);
      if (has('compensatary_time')) out += indent + "$(\".compensatary_time\").prop({ 'disabled': false, 'checked': false });\n";
      if (has('compensatory1')) out += propLine(has, ['compensatory1'], DISABLE, indent);
      return out;
    }
    function clearMultiSelect(indent){
      if (!has('sub_disability_multiple')) return '';
      return indent + '$("#sub_disability_multiple").val(\'\');\n' +
             indent + '$("#sub_disability_multiple option").remove();\n' +
             indent + '$("#sub_disability_multiple optgroup").remove();\n' +
             indent + "$(\"#sub_disability_multiple\").prop('disabled', true);\n";
    }
    // Rows 17.1-17.6 — reset / enable, trimmed to the ones this paste has.
    var TEXTISH = ['scribe_name', 'scribe_id_proof', 'card_no_scribe'];
    var CHECKISH = ['eligible_for_scribe', 'undertake_to_produce_udid', 'edu_qual_for_scribe'];
    function scribeDetailReset(indent){
      var out = '';
      var t = classSel(has, TEXTISH);
      var c = classSel(has, CHECKISH);
      if (t) out += indent + '$("' + t + '").val("").prop("disabled", true);\n';
      if (c) out += indent + '$("' + c + '").prop("disabled", true).prop("checked", false);\n';
      return out;
    }
    function scribeDetailEnable(indent){
      var all = classSel(has, TEXTISH.concat(CHECKISH));
      if (!all) return '';
      return indent + '$("' + all + '").prop("disabled", false);\n';
    }

    var p = [];

    // ── 1. the category dropdown ──────────────────────────────────────────
    if (has('disability_type')) {
      var h = '$("#disability_type").change(function () {\n';

      if (popupText) {
        var trig = (popupCats && popupCats.length)
          ? anyEquals('$(this).val()', popupCats)
          : "$(this).val() != ''";
        h += '\tif (' + trig + ') {\n' +
             '\t\tlet msg = ' + jsStr(popupText) + ';\n' +
             "\t\tmyCustomAlert(msg, 'Disability Type Instructions');\n" +
             '\t\tif (regpage_button_status) {\n' +
             '\t\t\tDisableEditFn(0);\n' +
             '\t\t\tfinalsubmit(0, 1, 0);\n' +
             '\t\t\tDisableEditFn(1);\n' +
             '\t\t}\n' +
             '\t}\n\n';
      }

      if (has('subdistypeido')) {
        h += "\tif ($(this).val() == '" + idoCat + "') {\n" +
             "\t\t$(\".subdistypeido\").prop('disabled', false);\n" +
             '\t} else {\n' +
             '\t\t$(".subdistypeido").val(\'\');\n' +
             "\t\t$(\".subdistypeido\").prop('disabled', true);\n" +
             clearMultiSelect('\t\t') +
             '\t}\n\n';
      }

      if (has('sub_disability_type')) {
        h += '\t$("#sub_disability_type").val(\'\');\n' +
             "\t$(\"#sub_disability_type\").prop('disabled', true);\n" +
             '\tif (' + anyEquals('$(this).val()', subTypeCats) + ') {\n' +
             "\t\t$(\"#sub_disability_type\").prop('disabled', false);\n" +
             '\t\tgetSub_Typedisability();\n' +
             '\t}\n\n';
      }

      var socReset = resetSocGroup('\t\t'), socEnable = enableSocPair('\t\t');
      if (socReset && socCats.length) {
        h += '\tif (!(' + anyEquals('$(this).val()', socCats) + ')) {\n' +
             socReset +
             '\t} else {\n' +
             socEnable +
             '\t}\n\n';
      }

      h += propLine(has, ['compans_time'], DISABLE, '\t');
      h += '});\n\n';
      p.push(h);
    }

    // ── 2. the sub-type dropdown resets whatever hangs off it ─────────────
    if (has('sub_disability_type')) {
      var r = resetSocGroup('\t');
      if (r) p.push('$("#sub_disability_type").change(function () {\n' + r + '});\n\n');
    }

    // ── 3. the routing dropdown opens the multi-select / compans_time ─────
    if (has('subdistypeido')) {
      var h3 = '$("#subdistypeido").change(function () {\n' +
        '\tvar df = $(this).val();\n\n';
      if (has('sub_disability_multiple')) {
        h3 += "\tif (df == '" + mulCode + "') {\n" +
              "\t\t$(\"#sub_disability_multiple\").prop('disabled', false);\n" +
              '\t\tgetSub_TypeMuldisability();\n' +
              '\t} else {\n' +
              clearMultiSelect('\t\t') +
              resetSocGroup('\t\t') +
              propLine(has, ['optscribe'], "{ 'checked': false }", '\t\t') +
              '\t}\n\n';
      }
      if (has('compans_time') && compansIdo.length) {
        h3 += '\tif (' + anyEquals('df', compansIdo) + ') {\n' +
              "\t\t$(\".compans_time\").prop({ 'disabled': false, 'checked': false });\n" +
              '\t} else {\n' +
              "\t\t$(\".compans_time\").prop({ 'disabled': true, 'checked': false });\n" +
              '\t}\n';
      }
      h3 += '});\n\n';
      p.push(h3);
    }

    // ── 4. the multi-select drives compans_time and the cerebral/dominant
    //       pair. The reference binds TWO separate change handlers to this
    //       same element, one of which counts a narrower code list than the
    //       other; they are merged here into the single handler the resolved
    //       conditions actually describe. ────────────────────────────────
    if (has('sub_disability_multiple')) {
      var h4 = '$("#sub_disability_multiple").change(function () {\n';
      var wrote = false;
      if (socMulti.length && (resetSocGroup('\t\t') || enableSocPair('\t\t'))) {
        h4 += multiCountLoop(socMulti, 'flagoc', '\t') + '\n' +
              '\tif (flagoc > 0) {\n' + enableSocPair('\t\t') +
              '\t} else {\n' + resetSocGroup('\t\t') + '\t}\n\n';
        wrote = true;
      }
      if (has('compans_time') && compansMulti.length) {
        h4 += multiCountLoop(compansMulti, 'flag', '\t') + '\n' +
              '\tif (flag > 0) {\n' +
              "\t\t$(\".compans_time\").prop({ 'disabled': false, 'checked': false });\n" +
              '\t} else {\n' +
              "\t\t$(\".compans_time\").prop({ 'disabled': true, 'checked': false });\n" +
              '\t}\n';
        wrote = true;
      }
      h4 += '});\n\n';
      if (wrote) p.push(h4);
    }

    // ── 5/6. the two scribe popups ───────────────────────────────────────
    [['optscribe', 'optscribe'], ['scribe1', 'scribe1']].forEach(function(pair){
      var msg = fieldPopups[pair[0]];
      if (!msg || !has(pair[0])) return;
      p.push('$(".' + pair[1] + '").click(function (e) {\n' +
        "\tif ($(this).val() == 'Y') {\n" +
        '\t\tlet msg = ' + jsStr(msg) + ';\n' +
        "\t\tmyCustomAlert(msg, 'Scribe Instructions');\n" +
        '\t}\n});\n\n');
    });

    // ── 7. the scribe enable computation, bound to both the click and the
    //       change flavours of the same rule ──────────────────────────────
    if (has('optscribe')) {
      var reads = '', test = [];
      for (var y = 0; y < scribeY.length; y++) {
        reads += '\tvar ds' + y + " = $('input[name=" + scribeY[y] + "]:checked').val();\n";
        test.push('ds' + y + " == 'Y'");
      }
      if (has('subdistypeido') && scribeIdo.length) {
        reads += '\tvar dsIdo = $("#subdistypeido").val();\n';
        test.push('(' + anyEquals('dsIdo', scribeIdo) + ')');
      }
      if (has('sub_disability_type') && scribeSub.length) {
        reads += '\tvar dsSub = $("#sub_disability_type").val();\n';
        test.push('(' + anyEquals('dsSub', scribeSub) + ')');
      }
      var loop = '';
      if (has('sub_disability_multiple') && scribeMulti.length) {
        loop = multiCountLoop(scribeMulti, 'flag', '\t');
        test.push('flag > 0');
      }

      var body = reads + (loop ? '\n' + loop : '') + '\n' +
        '\tif (' + (test.length ? test.join(' || ') : 'false') + ') {\n' +
        "\t\t$(\".optscribe\").prop({ 'disabled': false, 'checked': false });\n" +
        '\t} else {\n' +
        "\t\t$(\".optscribe\").prop({ 'disabled': true, 'checked': false });\n" +
        '\t}\n' +
        scribeGate(has, scribeDetailReset);

      p.push('$(".optscribeset").click(function () {\n' + body + '});\n\n');
      p.push('$(".optscribesetchange").change(function () {\n' + body + '});\n\n');
    }

    // ── 8/9. the two "if Yes, open the compensatory question" handlers ────
    if (has('disabilitysuffersoc') && has('compensatory')) {
      p.push('$(".disabilitysuffersoc").click(function () {\n' +
        "\tif ($(this).val() == 'Y') {\n" +
        "\t\t$(\".compensatory\").prop({ 'disabled': false, 'checked': false });\n" +
        '\t} else {\n' +
        "\t\t$(\".compensatory\").prop({ 'disabled': true, 'checked': false });\n" +
        '\t}\n});\n\n');
    }
    if (has('compensatary_time') && has('compensatory1')) {
      p.push('$(".compensatary_time").click(function () {\n' +
        "\tif ($(this).val() == 'Y') {\n" +
        "\t\t$(\".compensatory1\").prop({ 'disabled': false, 'checked': false });\n" +
        '\t} else {\n' +
        "\t\t$(\".compensatory1\").prop({ 'disabled': true, 'checked': false });\n" +
        '\t}\n});\n\n');
    }

    // ── 10. the root toggle resets the whole section ─────────────────────
    if (has('optdisability')) {
      var common = '';
      if (has('subdistypeido')) {
        common += '\t\t$(".subdistypeido").val(\'\');\n' +
                  "\t\t$(\".subdistypeido\").prop('disabled', true);\n";
      }
      if (has('sub_disability_type')) {
        common += '\t\t$("#sub_disability_type").val(\'\');\n' +
                  "\t\t$(\"#sub_disability_type\").prop('disabled', true);\n";
      }
      common += clearMultiSelect('\t\t') +
        propLine(has, ['compans_time'], DISABLE, '\t\t') +
        propLine(has, ['optscribe'], DISABLE, '\t\t') +
        resetSocGroup('\t\t') +
        propLine(has, ['scribe1'], DISABLE, '\t\t') +
        propLine(has, ['compensatory2'], DISABLE, '\t\t') +
        propLine(has, ['disability_certify'], DISABLE, '\t\t');

      // The 2(s) sub-tree is the ONE thing that differs between the branches:
      // answering N to the root toggle is what opens it.
      var less = has('optdisability_40less');
      p.push('$(".optdisability").click(function () {\n' +
        scribeDetailReset('\t') +
        "\n\tif ($(this).val() == 'Y') {\n" +
        common +
        (less ? "\t\t$(\".optdisability_40less\").prop({ 'disabled': true, 'checked': false });\n" : '') +
        '\t} else {\n' +
        common +
        (less ? "\t\t$(\".optdisability_40less\").prop({ 'disabled': false, 'checked': false });\n" : '') +
        '\t}\n});\n\n');
    }

    // ── 11. answering Yes to either scribe question opens the detail rows ─
    var scribeTriggers = classSel(has, ['optscribe', 'scribe1']);
    if (scribeTriggers && scribeDetailReset('')) {
      p.push('$("' + scribeTriggers + '").on("click", function () {\n' +
        '\tlet selectedVal = $(this).val();\n\n' +
        scribeDetailReset('\t') +
        '\n\tif (regpage_button_status) {\n' +
        '\t\tDisableEditFn(0);\n' +
        '\t\tfinalsubmit(0, 1, 0);\n' +
        '\t\tDisableEditFn(1);\n' +
        '\t}\n\n' +
        '\tif (selectedVal === "Y") {\n' +
        scribeDetailEnable('\t\t') +
        '\t}\n});\n\n');
    }

    // ── 12. the ID-proof pair ────────────────────────────────────────────
    if (has('card_no_scribe') && has('scribe_id_proof')) {
      p.push("$('#card_no_scribe').keyup(function () {\n" +
        "\tvar up = $('#scribe_id_proof').val();\n" +
        "\tif (up == '01') {\n" +
        '\t\tthis.value = this.value.toLocaleUpperCase();\n' +
        '\t}\n});\n\n');
      p.push('$("#scribe_id_proof").change(function () {\n' +
        '\t$(".card_no_scribe").val("").prop("disabled", false);\n' +
        '});\n\n');
    }

    // ── 13. the 2(s) sub-tree toggle ─────────────────────────────────────
    if (has('optdisability_40less')) {
      var lessReset = propLine(has, ['compensatory2'], DISABLE, '\t\t') +
        propLine(has, ['scribe1'], DISABLE, '\t\t') +
        propLine(has, ['disability_certify'], DISABLE, '\t\t');
      var lessEnable = propLine(has, ['compensatory2'], "{ 'disabled': false }", '\t\t') +
        propLine(has, ['scribe1'], "{ 'disabled': false }", '\t\t') +
        propLine(has, ['disability_certify'], "{ 'disabled': false }", '\t\t');
      p.push('$(".optdisability_40less").click(function () {\n' +
        scribeDetailReset('\t') +
        "\n\tif ($(this).val() == 'Y') {\n" +
        lessEnable +
        '\t} else {\n' +
        lessReset +
        '\t}\n\n' +
        '\tif (regpage_button_status) {\n' +
        '\t\tDisableEditFn(0);\n' +
        '\t\tfinalsubmit(0, 1, 0);\n' +
        '\t\tDisableEditFn(1);\n' +
        '\t}\n});\n\n');
    }

    // ── the two ajax helper pairs, verbatim template text. Each is emitted
    //    only if the dropdown it populates exists, since nothing would call
    //    it otherwise. Endpoints: generators/ajaxPhp2.js. ─────────────────
    if (has('sub_disability_type')) p.push(SUBTYPE_HELPERS);
    // The multi-select is repopulated from whichever dropdown carries the
    // "Multiple Disabilities" option — subdistypeido when the routing split
    // exists, otherwise the single sub-type dropdown. Hardcoding
    // #subdistypeido here would name an element the second known Set 2 shape
    // (fixture set2b) does not have.
    if (has('sub_disability_multiple')) {
      p.push(SUBTYPE_MULTIPLE_HELPERS.split('%TRIGGER%').join(trigger));
    }

    return p.join('').replace(/\s+$/, '') + '\n';
  }

  // The scribe-detail reset that trails the enable computation in handler 7.
  function scribeGate(has, scribeDetailReset){
    var inner = scribeDetailReset('\t\t');
    if (!inner) return '';
    var conds = [];
    if (has('optscribe')) conds.push("$(\"input[name='optscribe']:checked\").val() != 'Y'");
    if (has('scribe1')) conds.push("$(\"input[name='scribe1']:checked\").val() != 'Y'");
    if (!conds.length) return '';
    return '\n\tif (' + conds.join(' && ') + ') {\n' + inner + '\t}\n';
  }

  var SUBTYPE_HELPERS =
    '//------------------------------------- sub disability type -------------------------------------\n' +
    'function getSub_Typedisability() {\n' +
    '\tvar x = 1;\n' +
    "\tdocument.getElementById('sub_disability_type').options.length = 0;\n" +
    "\tdocument.getElementById('sub_disability_type').options[0] = new Option('Select', '');\n" +
    "\tcompany_apply = document.getElementById('disability_type').value;\n\n" +
    "\tvar centre_list1 = '';\n" +
    "\tif (company_apply != \"\") {\n" +
    '\t\tcentre_list1 = getSubTypeDisability();\n\n' +
    '\t\tif (centre_list1.indexOf(",") == -1) {\n' +
    '\t\t\tvar centre_info1 = centre_list1.split("|");\n' +
    '\t\t\tcentre_code1 = jQuery.trim(centre_info1[0].toString());\n' +
    '\t\t\tcentre_value1 = jQuery.trim(centre_info1[1].toString());\n' +
    "\t\t\tdocument.getElementById('sub_disability_type').options[x] = new Option(centre_value1, centre_code1);\n" +
    '\t\t} else {\n' +
    '\t\t\tvar centre_multiple1 = centre_list1.split(",");\n' +
    '\t\t\tfor (i = 0; i < centre_multiple1.length; i++) {\n' +
    '\t\t\t\tcentre_list1 = centre_multiple1[i];\n' +
    '\t\t\t\tvar centre_info1 = centre_list1.split("|");\n' +
    '\t\t\t\tcentre_code1 = jQuery.trim(centre_info1[0].toString());\n' +
    '\t\t\t\tcentre_value1 = jQuery.trim(centre_info1[1].toString());\n' +
    "\t\t\t\tdocument.getElementById('sub_disability_type').options[x] = new Option(centre_value1, centre_code1);\n" +
    '\t\t\t\tx++;\n' +
    '\t\t\t}\n' +
    '\t\t}\n' +
    '\t}\n' +
    '}\n\n' +
    'function getSubTypeDisability() {\n' +
    '\tif (window.XMLHttpRequest) {\n' +
    '\t\txmlhttp = new XMLHttpRequest();\n' +
    '\t} else {\n' +
    '\t\txmlhttp = new ActiveXObject("Microsoft.XMLHTTP");\n' +
    '\t}\n' +
    "\tseldisability_type = document.getElementById('disability_type').value;\n" +
    "\txmlhttp.open(\"POST\", 'ajax_getSubType_disability.php?selcompany=' + seldisability_type, false);\n" +
    '\txmlhttp.send(null);\n' +
    '\treturn xmlhttp.responseText;\n' +
    '}\n\n';

  var SUBTYPE_MULTIPLE_HELPERS =
    '//----------------------------------- sub disability multiple -----------------------------------\n' +
    'function getSub_TypeMuldisability() {\n' +
    '\tvar x = 0;\n' +
    "\tdocument.getElementById('sub_disability_multiple').options.length = 0;\n" +
    "\tcompany_apply = document.getElementById('%TRIGGER%').value;\n\n" +
    "\tvar centre_list1 = '';\n" +
    "\tif (company_apply != \"\") {\n" +
    '\t\tcentre_list1 = getSubTypeMultipleDisability(company_apply);\n\n' +
    '\t\tif (centre_list1.indexOf(",") == -1) {\n' +
    '\t\t\tvar centre_info1 = centre_list1.split("|");\n' +
    '\t\t\tcentre_code1 = jQuery.trim(centre_info1[0].toString());\n' +
    '\t\t\tcentre_value1 = jQuery.trim(centre_info1[1].toString());\n' +
    "\t\t\tdocument.getElementById('sub_disability_multiple').options[x] = new Option(centre_value1, centre_code1);\n" +
    '\t\t} else {\n' +
    '\t\t\tvar centre_multiple1 = centre_list1.split(",");\n' +
    '\t\t\tfor (i = 0; i < centre_multiple1.length; i++) {\n' +
    '\t\t\t\tcentre_list1 = centre_multiple1[i];\n' +
    '\t\t\t\tvar centre_info1 = centre_list1.split("|");\n' +
    '\t\t\t\tcentre_code1 = jQuery.trim(centre_info1[0].toString());\n' +
    '\t\t\t\tcentre_value1 = jQuery.trim(centre_info1[1].toString());\n' +
    "\t\t\t\tdocument.getElementById('sub_disability_multiple').options[x] = new Option(centre_value1, centre_code1);\n" +
    '\t\t\t\tx++;\n' +
    '\t\t\t}\n' +
    '\t\t}\n' +
    '\t}\n' +
    '}\n\n' +
    'function getSubTypeMultipleDisability(seldisability_type) {\n' +
    '\tif (window.XMLHttpRequest) {\n' +
    '\t\txmlhttp = new XMLHttpRequest();\n' +
    '\t} else {\n' +
    '\t\txmlhttp = new ActiveXObject("Microsoft.XMLHTTP");\n' +
    '\t}\n' +
    "\txmlhttp.open(\"POST\", 'ajax_getSubType_Multiple_disability.php?selcompany=' + seldisability_type, false);\n" +
    '\txmlhttp.send(null);\n' +
    '\treturn xmlhttp.responseText;\n' +
    '}\n\n';

  App.GEN = App.GEN || {};
  App.GEN.detailsJsSet2 = genDetailsJsSet2;
  App.GEN.detailsJs = function(ctx){
    return (ctx.parseA && ctx.parseA.isSet2) ? genDetailsJsSet2(ctx) : genDetailsJsSet1(ctx);
  };

})(window.App = window.App || {});
