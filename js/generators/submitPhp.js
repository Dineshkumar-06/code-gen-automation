/* Disability Code Generator — module: generators/submitPhp.js
   Phase 6a — emits reg_submit.php: the getVal() assignment chain (PRD §Phase-6).

   Same design as detailsPhp.js/detailsJs.js: one statement (or small statement
   group) per field, almost all fixed template text — the NULL-fallback
   pattern and the cascade of which field's value depends on which other
   field's resolved value is structural to this standardized section, not
   something prose parsing could discover. The only dynamic pieces are the
   two resolver-derived code-lists gating $compans_time and $Scribe_flg (same
   codes detailsJs.js uses, from resolved.compans_time / resolved.optscribe's
   'in' condition), substituted per-site with the reference's own exact
   quoting style. Each statement is gated on has(postName) for its own field —
   a SOW missing e.g. optdisability_40less/scribe1/compensatory2/
   disability_certify (the rows 12.1-12.4 constant block) or any of the
   rows 17-22 scribe-detail fields must not get that assignment at all. */
(function(App){

  function eqChain(template, codes){
    if (!codes.length) return '0';
    var out = [];
    for (var i = 0; i < codes.length; i++) out.push(template.replace('%C', codes[i]));
    return out.join(' || ');
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

  function genSubmit(ctx){
    var resolved = ctx.resolve.resolved;
    var fields = ctx.parseA.fields;
    var compansCodesList = compansCodes(resolved);
    var scribeCodesList = scribeCodes(resolved);

    function has(postName){
      for (var i = 0; i < fields.length; i++) if (fields[i].postName === postName) return true;
      return false;
    }

    var parts = [];
    if (has('optdisability')) parts.push("$disability=($_POST['optdisability'] != '')?getVal($_POST['optdisability']):NULL;\n\n");
    if (has('disability_category')) parts.push("$disability_category = ($_POST['disability_category']!='' && $disability == 'Y') ?getVal($_POST['disability_category']):NULL;\n\n");
    if (has('disability_type')) parts.push("// $disability_type=($_POST['disability_type']!='' && $disability == 'Y') ?getVal($_POST['disability_type']):'';\n/* disability type value for  json */\n//$disability_type_val = ($disability_type != '')?getVal($arrDisabilityType2[$_POST['disability_type']]):NULL;\n\n" + "if($disability_category == '05')\n{\n\t$disability_type = ($_POST['disability_multiple']!='' && $disability_category!='' && $disability == 'Y') ?implode(',',$_POST['disability_multiple']):NULL;\n}\nelse\n{\n\t$disability_type = ($_POST['disability_type']!='' && $disability_category!='' && $disability == 'Y') ?getVal($_POST['disability_type']):NULL;\n}\n");
    if (has('compans_time')) parts.push("$disability_type_arr = explode(',',$disability_type);\n$compans_time = ($_POST['compans_time']!='' && $disability == 'Y' && $disability_category!='' && (" + eqChain("in_array('%C',$disability_type_arr)", compansCodesList) + ")) ? getVal($_POST['compans_time']) : NULL;\n\n");
    if (has('disabilitysuffersoc')) parts.push("// $disability_per=($_POST['disability_per']!='' && $disability == 'Y') ?getVal($_POST['disability_per']):'';\n" + "$disabilitysuffersoc = ($_POST['disabilitysuffersoc']!='' && $disability == 'Y') ? getVal($_POST['disabilitysuffersoc']) : NULL;\n");
    if (has('compensatory')) parts.push("$compensatory = ($_POST['compensatory']!='' && $disability == 'Y' && $disabilitysuffersoc == 'Y') ? getVal($_POST['compensatory']) : '';\n");
    if (has('compensatary_time')) parts.push("$compensatary_time = ($_POST['compensatary_time']!='' && $disability == 'Y') ? getVal($_POST['compensatary_time']) : NULL;\n");
    if (has('compensatory1')) parts.push("$compensatory1 = ($_POST['compensatory1']!='' && $disability == 'Y' && $compensatary_time == 'Y') ? getVal($_POST['compensatory1']) : '';\n\n");
    if (has('optscribe')) parts.push("$Scribe_flg = 0;\nif(\n\t((" + eqChain("$_POST['disability_type'] == '%C'", scribeCodesList) + ") \n\t|| \n\t((is_array($_POST['disability_multiple']) && (" + eqChain("in_array('%C',$_POST['disability_multiple'])", scribeCodesList) + "))))\n\t\t && $disability_category!=''\n)\n{\n\t$Scribe_flg = 1;\n}\n// echo $Scribe_flg;\n\n// exit;\n\n" + "$scribe = (($Scribe_flg == 1 || $compensatary_time == 'Y' || $disabilitysuffersoc =='Y') && $disability == 'Y')?getVal($_POST['optscribe']):NULL;\n\n\n");
    if (has('optdisability_40less')) parts.push("$disability_40less=($disability == 'N')?getVal($_POST['optdisability_40less']):NULL;\n");
    if (has('compensatory2')) parts.push("$compensatory2=($_POST['compensatory2']!='' && $disability_40less == 'Y') ? getVal($_POST['compensatory2']) : NULL;\n");
    if (has('scribe1')) parts.push("$scribe1=($_POST['scribe1']!='' && $disability_40less == 'Y') ? getVal($_POST['scribe1']) : NULL;\n");
    if (has('disability_certify')) parts.push("$disability_certify=($_POST['disability_certify']!='' && $disability_40less == 'Y') ? getVal($_POST['disability_certify']) : '';\n\n\n");
    if (has('scribe_name')) parts.push("$scribe_name = ($scribe=='Y' || $scribe1=='Y')?getVal($_POST['scribe_name']):NULL;\n");
    if (has('scribe_id_proof')) parts.push("$scribe_id_proof = ($scribe=='Y' || $scribe1=='Y')?getVal($_POST['scribe_id_proof']):NULL;\n");
    if (has('card_no_scribe')) parts.push("$card_no_scribe = ($scribe=='Y' || $scribe1=='Y')?getVal($_POST['card_no_scribe']):NULL;\n\n");
    if (has('eligible_for_scribe')) parts.push("$eligible_for_scribe = ($scribe=='Y' || $scribe1=='Y')?getVal($_POST['eligible_for_scribe']):NULL;\n");
    if (has('undertake_to_produce_udid')) parts.push("$undertake_to_produce_udid = ($scribe=='Y' || $scribe1=='Y')?getVal($_POST['undertake_to_produce_udid']):NULL;\n");
    if (has('edu_qual_for_scribe')) parts.push("$edu_qual_for_scribe = ($scribe=='Y' || $scribe1=='Y')?getVal($_POST['edu_qual_for_scribe']):NULL;");

    return parts.join('');
  }

  App.GEN = App.GEN || {};
  App.GEN.submit = genSubmit;

})(window.App = window.App || {});
