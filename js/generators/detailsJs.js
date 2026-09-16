/* Disability Code Generator — module: generators/detailsJs.js
   Phase 5 — emits reg_details.js: the jQuery handlers driving the disability
   section's conditional show/hide/enable/disable cascade (PRD §Phase-5).

   Design mirrors detailsPhp.js: one handler block per triggering field/class,
   almost all fixed template text (the cascade wiring itself is structural to
   this standardized section, not something prose parsing could discover).
   The only genuinely SOW-derived pieces are: the popup alert() text (two
   sites, from resolveAll()'s popupText) and two code-lists that gate which
   disability_type/disability_multiple values turn on compans_time (from
   resolved.compans_time's 'in' condition) and optscribe (from resolved.optscribe's
   'in' condition, wherever it sits inside its 'or' group) — each appearing at
   several sites with the reference's own exact spacing per site.

   Each handler is gated on whether its OWN triggering field/row was actually
   pasted (same has(postName) gate as detailsPhp.js) — a SOW missing e.g.
   optscribe or optdisability_40less must not get that handler's block just
   because the standardized template has a slot for it.

   REVISED 2026-09-11: selector strings *inside* a kept handler that reference
   ANOTHER field's class used to be left as fixed text even when that field
   was absent — jQuery no-ops on a selector matching nothing, so it was inert
   rather than visibly wrong. The user caught this in iifcljul26's real output
   (only optdisability/disability_category/disability_type pasted): the
   `.optdisability` handler still emitted every scribe/compensatory/
   compensatory1/disabilitysuffersoc/compensatary_time/optdisability_40less/
   scribe1/compensatory2/disability_certify line verbatim, describing eleven
   fields that don't exist in that project at all. "Inert" isn't the same as
   "not misleading" — a developer pasting this into a project that never has
   those fields shouldn't see them referenced. Every cross-field reference is
   now built from small has()-gated fragments (see the scribeDetailReset/
   optdisabilityHandlerBody helpers below) instead of one fixed string. Two
   call sites — the two
   compans_time toggles inside the #disability_type/#disability_multiple
   handlers — get the same treatment as the analogous fix in
   validationsPhp.js: when compans_time itself was never pasted, that whole
   toggle (not just the codes list) is omitted, not left as dead code gated
   on a permanently-false condition. */
(function(App){

  function eqChainNoSpace(expr, codes){
    if (!codes.length) return 'false';
    var out = [];
    for (var i = 0; i < codes.length; i++) out.push(expr + "=='" + codes[i] + "'");
    return out.join(' || ');
  }

  function eqChainSpace(expr, codes){
    if (!codes.length) return 'false';
    var out = [];
    for (var i = 0; i < codes.length; i++) out.push(expr + " == '" + codes[i] + "'");
    return out.join(' || ');
  }

  function escJsStr(s){
    return String(s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }

  function compansCodes(resolved){
    var e = resolved.compans_time;
    return (e && e.enabledWhen && e.enabledWhen.op === 'in') ? e.enabledWhen.codes : [];
  }

  function scribeCodes(resolved){
    var e = resolved.optscribe;
    if (!e || !e.enabledWhen) return [];
    var conds = (e.enabledWhen.op === 'or') ? e.enabledWhen.conditions : [e.enabledWhen];
    for (var i = 0; i < conds.length; i++) if (conds[i].op === 'in') return conds[i].codes;
    return [];
  }

  // ── shared cross-field reference helpers ──
  // A field's class name always equals its postName in this dictionary (see
  // core/dictionary.js) — no separate lookup needed to go from one to the other.
  function classSel(names){ return names.map(function(n){ return '.' + n; }).join(','); }

  var SCRIBE_VAL_RESET = ['scribe_name', 'scribe_id_proof', 'card_no_scribe'];
  var SCRIBE_CHECK_RESET = ['eligible_for_scribe', 'undertake_to_produce_udid', 'edu_qual_for_scribe'];
  var SCRIBE_DETAIL_ALL = SCRIBE_VAL_RESET.concat(SCRIBE_CHECK_RESET);

  // The rows-17-22 scribe-detail fields are independently gated per-SOW (see
  // CLAUDE.md's "Follow-up: rows 17-22 needed per-field gating too") — a
  // paste can have some of the six without all six. Used at every site that
  // resets this block on a scribe-enabling change. Returns '' if none of the
  // six are present, so a handler whose paste happens to have zero of them
  // emits no reset lines at all rather than a call against nothing.
  function scribeDetailReset(has, indent){
    indent = indent || '\t';
    var g1 = SCRIBE_VAL_RESET.filter(has);
    var g2 = SCRIBE_CHECK_RESET.filter(has);
    var out = '';
    if (g1.length) out += indent + '$("' + classSel(g1) + '").val("").prop("disabled", true);\n';
    if (g2.length) out += indent + '$("' + classSel(g2) + '").prop("disabled", true).prop("checked", false);\n';
    return out;
  }

  // The Y-branch equivalent: enables whichever of the six scribe-detail
  // fields are actually present, all in one combined selector (same shape as
  // the reference's own single call spanning two lines).
  function scribeDetailEnable(has, indent){
    indent = indent || '\t\t';
    var present = SCRIBE_DETAIL_ALL.filter(has);
    if (!present.length) return '';
    return indent + '$("' + classSel(present) + '")\n' + indent + '.prop("disabled", false);\n';
  }

  // A small "disable+uncheck this group" block, used repeatedly across
  // handlers for whichever subset of a class-group is actually present.
  function disableCheckedBlock(indent, names){
    if (!names.length) return '';
    return indent + '$("' + classSel(names) + '").prop({\n' +
      indent + "\t'disabled': true,\n" +
      indent + "\t'checked':false\n" +
      indent + '});\n';
  }

  // ── the .optdisability click handler, rebuilt from has()-gated fragments ──
  // This is the root Y/N toggle's handler: on any change it resets every
  // dependent field before re-enabling only the ones the chosen branch
  // allows. Every line below names a specific field and is gated on that
  // field's own presence — "depservice"/"depdisability"/"depdisabilitytype"
  // are NOT part of this dictionary at all (they're verbatim carryover from
  // the real reference application, outside this tool's own field model)
  // and are left as fixed text, same tier as the hidden_cerebral_scribe/
  // hidden_dominant_scribe comment-wrapped fields. "optdisabledexservice"
  // (per the user: the real reg_details.js's disabled_exserviceman field, an
  // ex-serviceman reservation toggle, not a disability field at all) was the
  // same kind of carryover but confirmed irrelevant to this section entirely
  // — removed outright rather than left as fixed text.
  function optdisabilityHandlerBody(has){
    var out = [];
    out.push("\tvar depservice = $('input[name=depservice]:checked').val();");
    out.push('');

    var reset = scribeDetailReset(has);
    if (reset) { out.push(reset.replace(/\n$/, '')); out.push(''); }

    var ds = ['disabilitysuffersoc', 'compensatary_time'].filter(has);
    if (ds.length) {
      out.push('\t$("' + classSel(ds) + '").prop({');
      out.push("\t\t'checked' : false");
      out.push('\t});');
      out.push('');
    }

    if (has('disability_category')) {
      out.push('\t$("#disability_category").val("");');
      out.push('');
    }

    if (has('disability_type')) {
      out.push("\t$(\"#disability_type\").val('');");
      out.push("\t$(\"#disability_type\").prop('disabled',true);");
      out.push('');
      out.push('\t$("#disability_multiple").val([]).find("option").remove();');
      out.push("\t$(\"#disability_multiple\").prop('disabled',true);");
      out.push('');
    }

    var offGroup = ['optscribe', 'compans_time', 'compensatory', 'compensatory1'].filter(has);
    if (offGroup.length) {
      out.push('\t$("' + classSel(offGroup) + '").prop({');
      out.push("\t\t'disabled' : true,");
      out.push("\t\t'checked' : false");
      out.push('\t});');
      out.push('');
    }

    out.push("\tif($(this).val()=='Y') {");
    out.push('');
    if (has('disability_category')) {
      out.push('\t\t$(".disability_category").prop("disabled", false);');
      out.push('');
    }
    ['optdisability_40less', 'scribe1', 'compensatory2'].forEach(function(f){
      if (has(f)) out.push(disableCheckedBlock('\t\t', [f]).replace(/\n$/, ''));
    });
    if (has('optdisability_40less') || has('scribe1') || has('compensatory2')) out.push('');
    if (has('disability_certify')) {
      out.push('\t\t$(".disability_certify").prop({');
      out.push("\t\t\t'disabled' : true,");
      out.push("\t\t\t'checked' : false");
      out.push('\t\t});');
      out.push('');
    }
    if (has('disabilitysuffersoc')) out.push('\t\t$(".disabilitysuffersoc").prop(\'disabled\', false);');
    if (has('compensatary_time')) out.push('\t\t$(".compensatary_time").prop(\'disabled\', false);');
    out.push('\t} else {');
    out.push("\t\t$(\".depdisability,.depdisabilitytype\").val('');");
    out.push("\t\t$(\".depdisability,.depdisabilitytype\").prop('disabled',true);");
    out.push('');
    if (has('optscribe')) { out.push(disableCheckedBlock('\t\t', ['optscribe']).replace(/\n$/, '')); out.push(''); }
    if (has('disabilitysuffersoc')) {
      out.push('\t\t$(".disabilitysuffersoc").prop({');
      out.push("\t\t\t'disabled' : true,");
      out.push("\t\t\t'checked' : false");
      out.push('\t\t});');
      out.push('');
    }
    if (has('compensatary_time')) {
      out.push('\t\t$(".compensatary_time").prop({');
      out.push("\t\t\t'disabled' : true,");
      out.push("\t\t\t'checked' : false");
      out.push('\t\t});');
      out.push('');
    }
    if (has('compensatory')) {
      out.push('\t\t$(".compensatory").prop(\'checked\', false);');
      out.push("\t\t$(\".compensatory\").prop('disabled',true);");
    }
    if (has('compensatory1')) {
      out.push('\t\t$(".compensatory1").prop(\'checked\', false);');
      out.push("\t\t$(\".compensatory1\").prop('disabled',true);");
    }
    out.push('');
    if (has('optdisability_40less')) {
      out.push('\t\t$(".optdisability_40less").prop({');
      out.push("\t\t\t'disabled': false,");
      out.push("\t\t\t'checked':false");
      out.push('\t\t});');
    }
    if (has('scribe1')) { out.push(disableCheckedBlock('\t\t', ['scribe1']).replace(/\n$/, '')); }
    if (has('compensatory2')) { out.push(disableCheckedBlock('\t\t', ['compensatory2']).replace(/\n$/, '')); }
    if (has('disability_certify')) {
      out.push('');
      out.push('\t\t$(".disability_certify").prop({');
      out.push("\t\t\t'disabled' : true,");
      out.push("\t\t\t'checked' : false");
      out.push('\t\t});');
    }
    out.push('\t}');

    return out.join('\n') + '\n';
  }

  function genDetailsJs(ctx){
    var resolved = ctx.resolve.resolved;
    var fields = ctx.parseA.fields;
    var popupText = escJsStr(ctx.resolve.popupText);
    var compansCodesList = compansCodes(resolved);
    var scribeCodesList = scribeCodes(resolved);

    function has(postName){
      for (var i = 0; i < fields.length; i++) if (fields[i].postName === postName) return true;
      return false;
    }

    var parts = [];
    if (has('disability_category')) parts.push("$(\"#disability_category\").change(function () {\n\tlet category = $(this).val();\n\n\t$(\"#disability_type, #disability_multiple\").prop(\"disabled\", true).hide();\n\n\tif (category === \"05\") {\n\t\t$(\"#disability_multiple\").prop(\"disabled\", false).show();\n\t} else if (category !== \"\") {\n\t\t$(\"#disability_type\").prop(\"disabled\", false).show();\n\t} else {\n\t\t$(\"#disability_type\").show().prop(\"disabled\", true);\n\t}\n});\n\n");

    if (has('disability_type')) {
      var compansReset71 = has('compans_time') ? "\t$(\".compans_time\").prop({\n\t\t'disabled': true,\n\t\t'checked': false\n\t});\n" : '';
      var compansToggle71 = has('compans_time')
        ? "\tif(" + eqChainNoSpace('$(this).val()', compansCodesList) + ")\n\t{\n\t\t$(\".compans_time\").prop({\n\t\t\t'disabled' : false,\n\t\t\t'checked' : false\n\t\t});\n\t}\n\telse\n\t{\n\t\t$(\".compans_time\").prop({\n\t\t\t'disabled' : true,\n\t\t\t'checked' : false\n\t\t});\n\t}\n"
        : '';
      parts.push("$(\"#disability_type\").change(function() {\n" + compansReset71 + "\tvar disability = $('input[name=optdisability]:checked').val();\n\tvar selectedtypedis = $(this).val();\n\n\tvar disability_category = $(\"#disability_category\").val();\n\tif(disability=='Y' && selectedtypedis != '')\n\t{\n\t\talert(\"" + popupText + "\");\n\t}\n" + compansToggle71 + "\n});\n\n");
    }

    if (has('disability_type')) {
      var compansReset72 = has('compans_time') ? "\t$(\".compans_time\").prop({\n\t\t'disabled': true,\n\t\t'checked': false\n\t});\n" : '';
      var compansToggle72 = has('compans_time')
        ? "\tif(mi_count>0)\n\t{\n\t\t$(\".compans_time\").prop({\n\t\t\t'disabled' : false,\n\t\t\t'checked' : false\n\t\t});\n\t}\n\telse\n\t{\n\n\t\t$(\".compans_time\").prop({\n\t\t\t'disabled' : true,\n\t\t\t'checked' : false\n\t\t});\n\n\t}\n\n"
        : '';
      parts.push("$(\"#disability_multiple\").click(function() {\n" + compansReset72 + "\tvar disability = $('input[name=optdisability]:checked').val();\n\tvar disability_category = $(\"#disability_category\").val();\n\tvar selectedtypedis = $(this).val();\n\tvar mi_count=0;\n\tif(disability=='Y'  && selectedtypedis != '' && selectedtypedis !== null)\n\t{\n\t\talert(\"" + popupText + "\");\n\t\tvar disability_type = $(\"#disability_multiple\").val().toString().split(',');\n\n\t\tfor(i=0;i<disability_type.length;i++)\n\t\t{\n\t\t\tif(" + eqChainNoSpace('disability_type[i]', compansCodesList) + ")\n\t\t\t{\n\t\t\t\t++mi_count;\n\t\t\t}\n\t\t}\n\n\t} else {\n\n\t}\n\n" + compansToggle72 + "\tif(regpage_button_status) {\n\t\tDisableEditFn(0);\n\t\tfinalsubmit(0,1,0);\n\t\tDisableEditFn(1);\n\t}\n\n});\n\n");
    }

    if (has('optscribe')) parts.push("$(\".optscribeset\").click(function(){\n\tvar ds1 = $('input[name=disabilitysuffersoc]:checked').val();\n\tvar ds2 = $('input[name=compensatary_time]:checked').val();\n\n\tvar disability_category = $('#disability_category').val();\n\n\tif(disability_category=='05')\n\t{\n\t\tvar ds3 = $(\"#disability_multiple\").val();\n\t\tflag = 0;\n\t\t$('#disability_multiple :selected').each(function(i, sel){\n\n\t\t\tif(" + eqChainSpace('$(sel).val()', scribeCodesList) + "){\n\t\t\t\tflag++;\n\t\t\t}\n\t\t});\n\n\t\tif(ds1 == 'Y' ||  ds2 == 'Y' || (" + eqChainSpace('ds3', scribeCodesList) + ") || (flag>0) ) {\n\t\t\t$(\".optscribe\").prop('disabled',false);\n\t\t\t$(\".optscribe\").prop('checked',false);\n\t\t}else{\n\t\t\t$(\".optscribe\").prop('disabled',true);\n\t\t\t$(\".optscribe\").prop('checked',false);\n\t\t}\n\t}\n\telse{\n\t\tvar ds3 = $(\"#disability_type\").val();\n\t\tif(ds1 == 'Y' ||ds2 == 'Y' || " + eqChainSpace('ds3', scribeCodesList) + "){\n\n\t\t\t$(\".optscribe\").prop('disabled',false);\n\t\t\t$(\".optscribe\").prop('checked',false);\n\t\t}else{\n\t\t\t$(\".optscribe\").prop('disabled',true);\n\t\t\t$(\".optscribe\").prop('checked',false);\n\t\t}\n\t}\n\n\tif($(\"input[name='optscribe']:checked\").val() != 'Y' && $(\"input[name='scribe1']:checked\").val() != 'Y'){\n\n" + scribeDetailReset(has, '\t\t') + "\n\t}\n});\n\n");
    if (has('optscribe')) parts.push("$(\".optscribesetchange\").change(function(){\n\tvar ds1 = $('input[name=disabilitysuffersoc]:checked').val();\n\tvar ds2 = $('input[name=compensatary_time]:checked').val();\n\n\tvar disability_category = $('#disability_category').val();\n\n\tif(disability_category=='05')\n\t{\n\t\tvar ds3 = $(\"#disability_multiple\").val();\n\t\tflag = 0;\n\t\t$('#disability_multiple :selected').each(function(i, sel){\n\n\t\t\tif(" + eqChainSpace('$(sel).val()', scribeCodesList) + "){\n\t\t\t\tflag++;\n\t\t\t}\n\t\t});\n\n\t\tif(ds1 == 'Y' ||  ds2 == 'Y' || (" + eqChainSpace('ds3', scribeCodesList) + ") || (flag>0) ) {\n\t\t\t$(\".optscribe\").prop('disabled',false);\n\t\t\t$(\".optscribe\").prop('checked',false);\n\t\t}else{\n\t\t\t$(\".optscribe\").prop('disabled',true);\n\t\t\t$(\".optscribe\").prop('checked',false);\n\t\t}\n\t}\n\telse{\n\t\tvar ds3 = $(\"#disability_type\").val();\n\t\tif(ds1 == 'Y' ||ds2 == 'Y' || " + eqChainSpace('ds3', scribeCodesList) + "){\n\n\t\t\t$(\".optscribe\").prop('disabled',false);\n\t\t\t$(\".optscribe\").prop('checked',false);\n\t\t}else{\n\t\t\t$(\".optscribe\").prop('disabled',true);\n\t\t\t$(\".optscribe\").prop('checked',false);\n\t\t}\n\t}\n\n\tif($(\"input[name='optscribe']:checked\").val() != 'Y' && $(\"input[name='scribe1']:checked\").val() != 'Y'){\n\n" + scribeDetailReset(has, '\t\t') + "\n\t}\n\n});\n\n");
    if (has('disabilitysuffersoc')) parts.push("$(\".disabilitysuffersoc\").click(function() {\n\n\t$(\".compensatory\").prop('checked', false);\n\t$(\".compensatory\").prop('disabled',true);\n\n\tif($(this).val()=='Y') {\n\n\t\t$(\".compensatory\").prop('disabled',false);\n\t} else {\n\n\t\t$(\".compensatory\").prop('checked', false);\n\t\t$(\".compensatory\").prop('disabled',true);\n\n\t}\n});\n\n");
    if (has('compensatary_time')) parts.push("$(\".compensatary_time\").click(function() {\n\n\t$(\".compensatory1\").prop('checked', false);\n\t$(\".compensatory1\").prop('disabled',true);\n\n\tif($(this).val()=='Y') {\n\t\t$(\".compensatory1\").prop('disabled',false);\n\t} else {\n\t\t$(\".compensatory1\").prop('checked', false);\n\t\t$(\".compensatory1\").prop('disabled',true);\n\n\t}\n});\n\n");
    if (has('optdisability')) parts.push("$(\".optdisability\").click(function() {\n" + optdisabilityHandlerBody(has) + "});\n\n");
    if (has('optscribe')) {
      var enableAll = scribeDetailEnable(has);
      var yBlock = enableAll ? "\tif (selectedVal === \"Y\") {\n" + enableAll + "\t}\n\n" : '';
      parts.push("$(\".optscribe,.scribe1\").on(\"click\", function () {\n\n\tlet selectedVal = $(this).val();\n\n" + scribeDetailReset(has) + "\n\tif(regpage_button_status) {\n\t\tDisableEditFn(0);\n\t\tfinalsubmit(0,1,0);\n\t\tDisableEditFn(1);\n\t}\n\n" + yBlock + "});\n\n");
    }
    if (has('scribe_id_proof')) parts.push("$(\"#scribe_id_proof\").change(function() {\n\n\t$(\".card_no_scribe\").val(\"\").prop(\"disabled\", false);\n});\n\n");
    if (has('optdisability_40less')) parts.push("$(\".optdisability_40less\").click(function() {\n\n" + scribeDetailReset(has) + "\n\t$(\".compensatory2\").prop('checked', false);\n\t$(\".compensatory2\").prop('disabled',true);\n\n\t$(\".scribe1\").prop({\n\t\t'disabled': true,\n\t\t'checked':false\n\t});\n\n\t$(\".disability_certify\").prop({\n\t\t'disabled' : true,\n\t\t'checked' : false\n\t});\n\n\tif($(this).val()=='Y') {\n\n\t\t$(\".compensatory2\").prop('disabled',false);\n\n\t\t$(\".scribe1\").prop({\n\t\t\t'disabled': false,\n\t\t\t'checked':false\n\t\t});\n\n\t\t$(\".disability_certify\").prop({\n\t\t\t'disabled' : false,\n\t\t\t'checked' : false\n\t\t});\n\n\t} else {\n\n\t\t$(\".compensatory2\").prop('checked', false);\n\t\t$(\".compensatory2\").prop('disabled',true);\n\n\t\t$(\".scribe1\").prop({\n\t\t\t'disabled': true,\n\t\t\t'checked':false\n\t\t});\n\n\t\t$(\".disability_certify\").prop({\n\t\t\t'disabled' : true,\n\t\t\t'checked' : false\n\t\t});\n\n\t}\n\n\tif(regpage_button_status) {\n\t\tDisableEditFn(0);\n\t\tfinalsubmit(0,1,0);\n\t\tDisableEditFn(1);\n\t}\n\n});");

    // Verbatim helper functions (real reference file, outside the captured golden
    // excerpt's line range) that wire up the AJAX-loaded Type of Disability options —
    // disability_category's onchange (see detailsPhp.js) calls getSub_TypeMuldisability(),
    // which is otherwise undefined in any captured golden slice. Fixed template text,
    // gated on the two fields it actually manipulates being present at all.
    if (has('disability_category') && has('disability_type')) parts.push("\n\nfunction getSub_TypeMuldisability(){\n\t//alert('here->');\n\tvar x=0;\n\tdisab_cate=document.getElementById('disability_category').value;\n\t//var ds1 = $('input[name=disabilitysuffersoc]:checked').val();\n\t//var ds2 = $('input[name=compensatary_time]:checked').val();\n\t//document.getElementById('disability_nature').options.length=0;\n\t//disability_type=document.getElementById('disability_type').value;\n\tvar centre_list1='';\n\t//var addyear=0;\n\n\tdocument.getElementById('disability_type').innerHTML='<option value=\"\">Select</option>';\n\t//document.getElementById('disability_multiple').innerHTML='<option value=\"\">Select</option>';\n\tdocument.getElementById('disability_multiple').options.length=0;\n\n\t/* if(disability_type !=\"\" && disab_cate!=\"\" && disab_cate!=\"N\"){ */\n\t\t//alert(\"one\");\n" + (has('compans_time') ? "\t\t$(\".compans_time\").prop({'disabled' : true,'checked' : false});\n" : '') + "\t\t//alert(centre_list1);\n\t\tif(disab_cate=='05'){\n\t\t\t$('#disability_multiple').prop({'selected':false}).show();\n\t\t\t$('#disability_type').prop({'selected':false}).hide();\n\t\t}\n\t\telse if(disab_cate=='01'||disab_cate=='02'||disab_cate=='03'||disab_cate=='04')\n\t\t{\n\t\t\t$('#disability_type').prop({'selected':false}).show();\n\t\t\t$('#disability_multiple').prop({'selected':false}).hide();\n\t\t}\n\t\telse\n\t\t{\n\n\t\t\t$(\"#disability_multiple option\").prop({'selected':false});\n\n\t\t\t/* if(ds1 == 'Y' ||ds2 == 'Y')\n\t\t\t{\n\t\t\t\tif(!$(\"#optscribe\").is(':enabled')) {\n\t\t\t\t\t$(\".optscribe\").prop('disabled',false);\n\t\t\t\t}\n\t\t\t}else{\n\t\t\t\t$(\".optscribe\").prop('disabled',true);\n\t\t\t\t$(\".optscribe\").prop('checked',false);\n\t\t\t} */\n\t\t\treturn false;\n\n\t\t}\n\t\tcentre_list1=ajaxDisabilityType(disab_cate);\n\t\tvar centre_multiple1 = centre_list1.split(\",\");\n\n\t\tfor(i = 0; i < centre_multiple1.length; i++){\n\t\t\tcentre_list1=centre_multiple1[i];\n\t\t\tvar centre_info1 = centre_list1.split(\"|\");\n\t\t\tcentre_code1=jQuery.trim(centre_info1[0]);\n\t\t\tcentre_value1=jQuery.trim(centre_info1[1]);\n\t\t\tif(disab_cate=='05'){\n\t\t\t\tdocument.getElementById('disability_multiple').options[x] = new Option(centre_value1,centre_code1);\n\t\t\t}\n\t\t\telse\n\t\t\t{\n\t\t\t\tdocument.getElementById('disability_type').options[x] = new Option(centre_value1,centre_code1);\n\t\t\t}\n\n\t\t\tx++;\n\t\t}\n\n\t\t/* }\n\telse\n\t{\n\t\t$('#disability_type').prop({'selected':false}).show();\n\t\t$('#disability_multiple').prop({'selected':false}).hide();\n\n\t\t$(\"#disability_multiple option\").prop({'selected':false});\n\t\t$(\".compensatory2\").prop({'disabled' : true,'checked' : false});\n\t\tif(ds1 == 'Y' ||ds2 == 'Y')\n\t\t{\n\t\t\tif(!$(\"#optscribe\").is(':enabled')) {\n\t\t\t\t$(\".optscribe\").prop('disabled',false);\n\t\t\t}\n\t\t}else{\n\t\t\t$(\".optscribe\").prop('disabled',true);\n\t\t\t$(\".optscribe\").prop('checked',false);\n\t\t}\n\t} */\n}\n\nfunction ajaxDisabilityType(disab_cate){\n\tif (window.XMLHttpRequest)\n\t{\n\t\txmlhttp=new XMLHttpRequest();\n\t}\n\telse\n\t{// code for IE6, IE5\n\t\txmlhttp=new ActiveXObject(\"Microsoft.XMLHTTP\");\n\t}\n\tvar seldisability_type;\n\tvar post_val;\n\txmlhttp.open(\"POST\",'ajax_getdisability_type.php?disab_cate='+disab_cate,false);\n\txmlhttp.send(null);\n\n\treturn xmlhttp.responseText;\n}");

    return parts.join('');
  }

  App.GEN = App.GEN || {};
  App.GEN.detailsJs = genDetailsJs;

})(window.App = window.App || {});
