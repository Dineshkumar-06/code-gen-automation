/* Disability Code Generator — module: generators/validationsPhp.js
   Phase 6b — emits reg_validations.php: $mandatory_flds/$arr_flds/
   $validate_flds_value, the $errmsgarr else-branches, and the disability_type
   multi-select exclusion-group block (PRD §8/§Phase-6).

   Same design as the other Phase 4-6 emitters: fixed template text per field,
   gated on has(postName), with resolver-derived dynamic pieces spliced in:
   the disabilitysuffersoc Y-constraint code (resolved.disabilitysuffersoc.constraint),
   the compans_time/optscribe enabling code-lists (same resolved 'in' conditions
   detailsJs.js/submitPhp.js already use), and the exclusion-group block itself —
   PRD §8 requires $exclgrpN/$exclcntN arrays and the final structural gate to be
   built from however many groups THIS SOW's paste produces, never hardcoded for
   three.

   Known, accepted divergence from the BPCL reference: the group cascade's
   per-position formatting (blank-line placement, extra parens on the last
   condition) is reproduced exactly for the first/middle/last positions using
   literal templates lifted from the BPCL reference — this byte-matched BPCL's
   real 3-group case under the old golden diff, but it is genuinely 3 inconsistent
   hand-typed formatting quirks in the original PHP, not a rule with any other
   real example to generalize from. Documented here rather than silently papered
   over — same tier as exclusions.js's "Hard of Hearing & Deaf" divergence. */
(function(App){

  function eqChainBare(template, codes){
    if (!codes.length) return '0';
    var out = [];
    for (var i = 0; i < codes.length; i++) out.push(template.replace('%C', codes[i]));
    return out.join(' || ');
  }

  // Reference quirk: a double space follows the FIRST term only.
  function eqChainMulti(codes){
    if (!codes.length) return 'false';
    var out = [];
    for (var i = 0; i < codes.length; i++) out.push("$disability_mularr[$i]=='" + codes[i] + "'");
    return out.length > 1 ? out[0] + '  || ' + out.slice(1).join(' || ') : out[0];
  }

  function eqChainSingle(codes){
    if (!codes.length) return 'false';
    var out = [];
    for (var i = 0; i < codes.length; i++) out.push("$_POST['disability_type']=='" + codes[i] + "'");
    return out.join(' || ');
  }

  function eqChainScribeBare(codes){
    if (!codes.length) return '0';
    var out = [];
    for (var i = 0; i < codes.length; i++) out.push("$_POST['disability_type'] == '" + codes[i] + "'");
    return out.join(' || ');
  }

  function eqChainScribeInArray(codes){
    if (!codes.length) return '0';
    var out = [];
    for (var i = 0; i < codes.length; i++) out.push("in_array('" + codes[i] + "',$_POST['disability_multiple'])");
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

  function escDouble(s){ return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$'); }
  function escSingle(s){ return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }

  var TPL1 = "\t\t\t\tif(%CNT%>1)\n\t\t\t\t{\n\t\t\t\t\t$errmsg.= \"$LANG[reg_disability_type] can not select %MSG% together\";\n\n\t\t\t\t\t$errmsgarr[]='disability_type|'.$LANG['reg_disability_type'].' can not select %MSG% together|C';\n\t\t\t\t}\n";
  var TPL2 = "\t\t\t\telse if(%CNT%>1)\n\t\t\t\t{\n\t\t\t\t\t$errmsg.= \"$LANG[reg_disability_type] can not select %MSG% together\";\n\t\t\t\t\t$errmsgarr[]='disability_type|'.$LANG['reg_disability_type'].' can not select %MSG% together|C';\n\t\t\t\t}\n";
  var TPL3 = "\t\t\t\telse if((%CNT%>1))\n\t\t\t\t{\n\t\t\t\t\t\n\t\t\t\t\t$errmsg.= \"$LANG[reg_disability_type] can not select %MSG% together\";\n\t\t\t\t\t$errmsgarr[]='disability_type|'.$LANG['reg_disability_type'].' can not select %MSG% together|C';\n";

  function fillTpl(tpl, n, msg){
    return tpl.split('%CNT%').join('$exclcnt' + n)
      .replace('%MSG%', escDouble(msg))
      .replace('%MSG%', escSingle(msg));
  }

  function exclCascade(groups){
    var out = [];
    for (var i = 0; i < groups.length; i++) {
      var n = i + 1, msg = groups[i].message;
      if (groups.length === 1) { out.push(fillTpl(TPL1, n, msg).replace(/\}\n$/, '')); }
      else if (i === 0) { out.push(fillTpl(TPL1, n, msg)); }
      else if (i === groups.length - 1) { out.push(fillTpl(TPL3, n, msg)); }
      else { out.push(fillTpl(TPL2, n, msg)); }
    }
    return out.join('');
  }

  function exclDeclarations(groups){
    var decl = [], cnt = [];
    for (var i = 0; i < groups.length; i++) {
      var n = i + 1;
      var codes = groups[i].codes.map(function(c){ return "'" + c + "'"; }).join(',');
      var indent = (i === groups.length - 1) ? '\t\t    ' : '\t\t\t';
      decl.push(indent + '$exclgrp' + n + ' = array(' + codes + ');');
      cnt.push('$exclcnt' + n + ' = 0;');
    }
    return decl.join('\n') + '\n\n\t\t    ' + cnt.join('') + '$count4=0;$count5=0; $count6=0;\n';
  }

  function exclIncrementLoop(groups){
    var out = [];
    for (var i = 0; i < groups.length; i++) {
      var n = i + 1;
      out.push('\t\t\t\tif(in_array($disability_mularr[$i],$exclgrp' + n + ',true))\n\t\t\t\t{\n\t\t\t\t\t$exclcnt' + n + ' = $exclcnt' + n + '+1;\n\t\t\t\t}');
    }
    return out.join('\n') + '\n\n';
  }

  function exclGate(groups){
    var terms = [];
    for (var i = 0; i < groups.length; i++) terms.push('$exclcnt' + (i + 1) + '<=1');
    terms.push('$count4==0');
    terms.push('$count5==0');
    return '\t\t\t\tif(' + terms.join(' && ') + ' /* && $count6==0 */)\n';
  }

  // The multi-select and single-select branches of the disability_type
  // validation block each carry their own compans_time mandatory/errmsgarr
  // check. When compans_time itself was never pasted, eqChainMulti/
  // eqChainSingle degrade to the literal 'false' (their own no-codes
  // fallback) — which used to still emit a live `if(false){mandatory}
  // else{errmsgarr}` for a field that doesn't exist in the target project.
  // Caught by the user against iifcljul26 (only rows 3-5 pasted): gate the
  // whole self-contained if/else statement on has('compans_time') instead of
  // leaving a permanently-false condition as dead code.
  function compansMultiBlock(compansCodesList){
    return "\t\t\tif(" + eqChainMulti(compansCodesList) + ")\n\t\t\t{\n\t\t\t\t// echo \"sadsd\";\n\t\t\t\t$mandatory_flds['compans_time'] = 'reg_compans_time|radiobutton|1|compans_time';\n\t\t\t\t$validate_flds_value['compans_time'] = 'reg_compans_time|Should be either Yes or No|Y,N|C';\n\t\t\t}\n\t\t\telse\n\t\t\t{\n\t\t\t\t$errmsgarr[]='compans_time|';\n\t\t\t}\n";
  }

  function compansSingleBlock(compansCodesList){
    return "\tif(" + eqChainSingle(compansCodesList) + ")\n\t{\n\t\t$mandatory_flds['compans_time'] = 'reg_compans_time|radiobutton|1|compans_time';\n\t\t$validate_flds_value['compans_time'] = 'reg_compans_time|Should be either Yes or No|Y,N|C';\n\t}\n\telse\n\t{\n\t\t$errmsgarr[]='compans_time|';\n\t}\n";
  }

  function genValidations(ctx){
    var resolved = ctx.resolve.resolved;
    var fields = ctx.parseA.fields;
    var groups = ctx.exclusionGroups || [];
    var compansCodesList = compansCodes(resolved);
    var scribeCodesList = scribeCodes(resolved);

    function has(postName){
      for (var i = 0; i < fields.length; i++) if (fields[i].postName === postName) return true;
      return false;
    }

    function disabilitySuffersocBlock(){
      var constraint = resolved.disabilitysuffersoc && resolved.disabilitysuffersoc.constraint;
      if (!constraint) return "\t\t\n\t\t//------------------ disabilitysuffersoc ----------------\n\t\t$mandatory_flds['disabilitysuffersoc'] = 'reg_disabilitysuffersoc|radiobutton|1|disabilitysuffersoc'; \n\t\t$validate_flds_value['disabilitysuffersoc'] = 'reg_disabilitysuffersoc|Should be either Yes or No|Y,N|C';\n\t\t\t\n";
      return "\t\t\n\t\t//------------------ disabilitysuffersoc ----------------\n\t\t$mandatory_flds['disabilitysuffersoc'] = 'reg_disabilitysuffersoc|radiobutton|1|disabilitysuffersoc'; \n\t\t\n\t\tif($_POST['disability_type'] == '15' || (is_array($_POST['disability_multiple']) && in_array('15',$_POST['disability_multiple'])))\n\t\t{\n\t\t\t$validate_flds_value['disabilitysuffersoc'] = 'reg_disabilitysuffersoc|Should be Yes|Y|C';\n\t\t} else {\n\t\t\t$validate_flds_value['disabilitysuffersoc'] = 'reg_disabilitysuffersoc|Should be either Yes or No|Y,N|C';\n\t\t}\n\t\t\t\n".split("'15'").join("'" + constraint.code + "'");
    }

    var parts = [];
    if (has('optdisability')) {
      parts.push("if($_POST['optdisability'] == 'Y'){\n");
      if (has('disability_category')) parts.push("\n\t// ----------------- disability_category Type ----------------\n\t$mandatory_flds['disability_category'] = 'reg_disability_category|dropdown|2|disability_category';\n\t$arr_flds['disability_category'] = 'reg_disability_category|arrDiscategory';\n\n");
      parts.push("\t// ----------------- Disability Type ----------------\n\t// $mandatory_flds['disability_type'] = 'reg_disability_type|dropdown|5|disability_type';\n\t// $arr_flds['disability_type'] = 'reg_disability_type|arrDisabilityType2';\n\n\t//------------------ disability_per ----------------\n\t// $mandatory_flds['disability_per'] = 'reg_disability_per|dropdown|5|disability_per';\n\t// $arr_flds['disability_per'] = 'reg_disability_per|arrDisabilitypercentage';\n\t//$validate_flds_value['disability_per'] = 'reg_disability_per|invalid|40,41|C';\n");
      if (has('disabilitysuffersoc')) parts.push(disabilitySuffersocBlock());
      if (has('compensatary_time')) parts.push("\t//------------------ compensatary_time ---------------------\n\t$mandatory_flds['compensatary_time'] = 'reg_compensatary_time|radiobutton|1|compensatary_time';\n\t$validate_flds_value['compensatary_time'] = 'reg_compensatary_time|Should be either Yes or No|Y,N|C';\n\n");
      parts.push("}else{\n");
      if (has('disability_category')) parts.push("\t$errmsgarr[]='disability_category|';\n");
      parts.push("\t// $errmsgarr[]='disability_type|';\n\t// $errmsgarr[]='disability_per|';\n");
      if (has('disabilitysuffersoc')) parts.push("\t$errmsgarr[]='disabilitysuffersoc|';\n");
      if (has('compensatary_time')) parts.push("\t$errmsgarr[]='compensatary_time|';\n");
      parts.push("}\n\n");
    }

    if (has('disability_type')) parts.push("$errmsgarr[]='disability_type|';\n");
    if (has('compans_time')) parts.push("$errmsgarr[]='compans_time|';\n");

    if (has('disability_type')) {
      parts.push("if($_POST['optdisability'] == \"Y\" && ($_POST['disability_category']!='') ){\n\t// echo $_POST['disability_category'];\n\tif($_POST['disability_category']=='05')\n\t{\n\t\t//$mandatory_flds['disability_type'] = 'reg_disability_type|dropdown|30|disability_multiple';\n\t\t$disability_mularr=$_POST['disability_multiple'];\n\n\t\t$disability_maparr=explode(\",\", $arrpostCategoryDisability_mapping[$_POST['disability_category']]);\n\n\t\t" + exclDeclarations(groups) + "\n\t\t// print_r($_POST['disability_multiple']);\n\n\t\tif(!is_array($_POST['disability_multiple']))\n\t\t{\n\t\t\t$errmsgarr[]='disability_type|Please select '.$LANG['reg_disability_type'];\n\t\t\t$errmsg.='Please select '.$LANG['reg_disability_type'];\n\t\t\t$count5=$count5+1;\n\t\t}\n\n\t\tif(is_array($_POST['disability_multiple']) && count($_POST['disability_multiple'])==1)\n\t\t{\n\t\t\t$errmsgarr[]='disability_type|Please select '.$LANG['reg_disability_type'].' more than one|C';\n\t\t\t$errmsg.='Please select '.$LANG['reg_disability_type'].' more than one';\n\t\t\t$count5=$count5+1;\n\t\t}\n\t\tif(is_array($_POST['disability_multiple'])) {\n\t\t\tfor($i=0;$i<count($disability_mularr);$i++)\n\t\t\t{\n\n\t\t\t\tif(!in_array($disability_mularr[$i],$disability_maparr,true))\n\t\t\t\t{\n\t\t\t\t\t$errmsg.='Invalid value for'.$LANG['reg_disability_type'];\n\t\t\t\t\t$errmsgarr[]='disability_type|Invalid value for'.$LANG['reg_disability_type'].'|C';\n\t\t\t\t\t$count4=$count4+1;\n\t\t\t\t}\n\n\t\t\t\t" + exclIncrementLoop(groups) + exclCascade(groups) + "\t\t\t\t}else if(count($_POST['disability_multiple'])>1){\n\n\t\t\t\t$post_disability_nature_arr_exists = 0;\n\n\t\t\t\tforeach($disability_mularr as $pdnaVal)\n\t\t\t\t{\n\t\t\t\t\t//echo $pdnaVal.\"-\";\n\t\t\t\t\tif(!array_key_exists($pdnaVal,$arrDisabilityType2))\n\t\t\t\t\t{\n\t\t\t\t\t\t//echo \"invalid\";\n\t\t\t\t\t\t$post_disability_nature_arr_exists++;\n\t\t\t\t\t\tbreak;\n\t\t\t\t\t}\n\t\t\t\t}\n\n\t\t\t\tif($post_disability_nature_arr_exists>0)\n\t\t\t\t{\n\t\t\t\t\t$errmsg.= \"$LANG[reg_disability_type] invalid value\";\n\t\t\t\t\t$errmsgarr[]=\"disability_type_mul|$LANG[reg_disability_type] invalid value|C\";\n\n\t\t\t\t}\n\t\t\t\telse if(count(array_unique($disability_mularr))<count($disability_mularr)){\n\n\t\t\t\t\t$errmsg.= \"$LANG[reg_disability_type] duplicate value\";\n\t\t\t\t\t$errmsgarr[]=\"disability_type_mul|$LANG[reg_disability_type] duplicate value|C\";\n\t\t\t\t}\n\t\t\t\telse\n\t\t\t\t{\n\t\t\t\t\t$errmsgarr[]=\"disability_type_mul|\";\n\t\t\t\t}\n\t\t\t}\n\n\t\t\t" + exclGate(groups) + "\t\t\t\t{\n\t\t\t\t$errmsgarr[]='disability_type|';\n\t\t\t}\n\t\t\t// echo $disability_mularr[$i];\n");
      if (has('compans_time')) parts.push(compansMultiBlock(compansCodesList));
      parts.push("\t\t}\n\t}\n}\nelse\n{\n\t//$arr_PostDisabilityType4 = $arrpostCategoryDisability_mapping[$_POST['designation']];\n\t$disability_maparr2 = explode(\",\", $arrpostCategoryDisability_mapping[$_POST['disability_category']]);\n\n\tif((IsNullOrEmptyStringField($_POST['disability_type']) && ($_POST['disability_category']!='05') && $_POST['disability_category']!=''))\n\t{\n\t\t$finalsubmit=\"N\";\n\t\t$errmsg.=\"Please select the \".$LANG['reg_disability_type'];\n\t\t$errmsgarr[]='disability_type| Please select the '.$LANG['reg_disability_type'];\n\t} else if((!in_array($_POST['disability_type'],$disability_maparr2,true)) && ($_POST['disability_category']!='05' && $_POST['disability_category']!=''))\n\t{\n\t\t$finalsubmit=\"N\";\n\t\t$errmsg.=\"Invalid for \".$LANG['reg_disability_type'];\n\t\t$errmsgarr[]=\"disability_type|Invalid for \".$LANG['reg_disability_type'].\"|C\";\n\t} else {\n\t\t$errmsgarr[]='disability_type|';\n\t}\n\n");
      if (has('compans_time')) parts.push(compansSingleBlock(compansCodesList));
      parts.push("} /* else {\n\t$errmsgarr[]='disability_type|';\n} */\n\n}else{\n$errmsgarr[]='disability_type|';\n" + (has('compans_time') ? "$errmsgarr[]='compans_time|';\n" : '') + "}\n");
    }

    if (has('optscribe')) {
      parts.push("\n$Scribe_flg = 0;\nif(\n(" + eqChainScribeBare(scribeCodesList) + ")\n||\n((is_array($_POST['disability_multiple']) && (" + eqChainScribeInArray(scribeCodesList) + ")))\n){\n\t$Scribe_flg = 1;\n}\n");
      parts.push("//------------------ scribe ---------------------\nif(($Scribe_flg == 1 || $_POST['disabilitysuffersoc'] == 'Y'|| $_POST['compensatary_time'] == 'Y') && ($_POST['optdisability'] == \"Y\"))\n{\n\t$mandatory_flds['optscribe'] = 'reg_optscribe|radiobutton|1|optscribe';\n\t$validate_flds_value['optscribe'] = 'reg_optscribe|Should be either Yes or No|Y,N|C';\n}else{\n\t$errmsgarr[]='optscribe|';\n}\n");
    }

    var anyScribeDetail = has('scribe_name') || has('scribe_id_proof') || has('card_no_scribe') ||
      has('eligible_for_scribe') || has('undertake_to_produce_udid') || has('edu_qual_for_scribe');
    if (anyScribeDetail) {
      parts.push("\n\n$errmsgarr[] = 'card_no_scribe|';\n");
      parts.push("if($_POST['optscribe']=='Y' || $_POST['scribe1']=='Y'){\n");
      if (has('scribe_name')) parts.push("\t$non_mandatory_flds['scribe_name'] = 'reg_scribe_name|textbox|35|scribe_name';\n\t$function_validation['scribe_name'] = 'reg_scribe_name|isAlphaSpace';\n\n");
      if (has('scribe_id_proof')) parts.push("\t//$mandatory_flds['card_no_scribe'] = 'reg_card_no_scribe|textbox|100|card_no_scribe';\n\t$non_mandatory_flds['scribe_id_proof'] = 'reg_scribe_id_proof|dropdown|5|scribe_id_proof';\n\t$arr_flds['scribe_id_proof'] = 'reg_scribe_id_proof|arrScribeIDProof';\n\t//$arr_flds['trained_apprentice_bank'] = 'reg_trained_apprentice_bank|arrtrained_apprentice_bank';\n\n");
      if (has('eligible_for_scribe')) parts.push("\t$non_mandatory_flds['eligible_for_scribe'] = 'reg_eligible_for_scribe|radiobutton|1|eligible_for_scribe';\n\t$validate_flds_value['eligible_for_scribe'] = 'reg_eligible_for_scribe|Should be Checked|Y|C';\n\n");
      if (has('edu_qual_for_scribe')) parts.push("\t$non_mandatory_flds['edu_qual_for_scribe'] = 'reg_edu_qual_for_scribe|radiobutton|1|edu_qual_for_scribe';\n\t$validate_flds_value['edu_qual_for_scribe'] = 'reg_edu_qual_for_scribe|Should be Checked|Y|C';\n\n");
      if (has('undertake_to_produce_udid')) parts.push("\t$non_mandatory_flds['undertake_to_produce_udid'] = 'reg_undertake_to_produce_udid|radiobutton|1|undertake_to_produce_udid';\n\t$validate_flds_value['undertake_to_produce_udid'] = 'reg_undertake_to_produce_udid|Should be Checked|Y|C';\n\n");
      if (has('card_no_scribe')) parts.push("\tif($_POST['scribe_id_proof']=='01' && $_POST['card_no_scribe'] !='')\n\t{\n\n\t\t/*if($_POST['card_no_scribe']=='')\n\t\t{\n\t\t\t$finalsubmit = \"N\";\n\t\t\t$errmsg .= 'Please enter '.$LANG['reg_card_no_scribe'];\n\t\t\t$errmsgarr[] = 'card_no_scribe|Please enter '.$LANG['reg_card_no_scribe'];\n\t\t}\n\t\telse\n\t\t{*/\n\t\t\t$fixed_len_flds['card_no_scribe'] = 'reg_card_no_scribe|10';\n\t\t\t$pattern = \"/[A-Z]{5}\\d{4}[A-Z]{1}$/\";\n\t\t\tif((!preg_match($pattern, $_POST['card_no_scribe']))) {\n\t\t\t\t$finalsubmit = \"N\";\n\t\t\t\t$errmsg .= $LANG['reg_card_no_scribe'] . ' should be first 5 Capital alphabets, next 4 numeric & last 1 Capital alphabet|C';\n\t\t\t\t$errmsgarr[] = 'card_no_scribe|' . $LANG['reg_card_no_scribe'] . ' should be first 5 Capital alphabets, next 4 numeric & last 1 Capital alphabet|C';\n\t\t\t}/* else {\n\t\t\t\t$errmsgarr[] = 'card_no_scribe|';\n\t\t\t} */\n\t\t\t// }\n\n\t}\n\telse if($_POST['scribe_id_proof']=='05' || $_POST['scribe_id_proof']=='06' )\n\t{\n\t\t$non_mandatory_flds['card_no_scribe'] = 'reg_card_no_scribe|textbox|12|card_no_scribe';\n\t\t$function_validation['card_no_scribe'] = 'reg_card_no_scribe|isFieldZero,isIntCustom';\n\t\t$fixed_len_flds['card_no_scribe'] = 'reg_idaadharcard_no|12';\n\t}\n\telse\n\t{\n\t\t$non_mandatory_flds['card_no_scribe'] = 'reg_card_no_scribe|textbox|100|card_no_scribe';\n\t\t$function_validation['card_no_scribe'] = 'reg_card_no_scribe|isFieldZero,isIntAlphaSpace';\n\t}\n\n");
      parts.push("}else{\n");
      if (has('scribe_name')) parts.push("\t$errmsgarr[] = 'scribe_name|';\n");
      if (has('scribe_id_proof')) parts.push("\t$errmsgarr[] = 'scribe_id_proof|';\n");
      parts.push("\t// $errmsgarr[] = 'card_no_scribe|';\n");
      if (has('eligible_for_scribe')) parts.push("\t$errmsgarr[] = 'eligible_for_scribe|';\n");
      if (has('edu_qual_for_scribe')) parts.push("\t$errmsgarr[] = 'edu_qual_for_scribe|';\n");
      if (has('undertake_to_produce_udid')) parts.push("\t$errmsgarr[] = 'undertake_to_produce_udid|';\n");
      parts.push("}");
    }

    return parts.join('');
  }

  App.GEN = App.GEN || {};
  App.GEN.validations = genValidations;

})(window.App = window.App || {});
