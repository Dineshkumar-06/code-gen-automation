/* Disability Code Generator — module: generators/detailsPhp.js
   Phase 4 — emits reg_details.php: the HTML/PHP block for rows 3-12 plus the
   constant 17-22 scribe-name block (PRD §4/§5).

   Design: names, ids, classes and LANG keys are fixed by the standardized
   dictionary (js/core/dictionary.js) regardless of which SOW produced them —
   that IS the point of the dictionary (PRD §4). So almost the entire block
   is one constant HTML/PHP template; the only genuinely SOW-derived pieces
   are the `disabled` conditions (compiled from resolveAll()'s `resolved{}`)
   and the scribe-enable block's `$scribeTypes` array + Y/N field pair
   (compiled from resolved['optscribe']). Everything else — including the
   category-selected guard on the type dropdowns/compans_time, and the
   $enableScribe single/multi-select branching — is structural to this one
   standardized section, not something prose parsing could discover, so it's
   fixed template text, same tier as the rows 12.1-12.4 / 17-22 constant
   blocks (never fed to the resolver either).

   Hidden fields (PRD §4, rows between 8/10): resolved 2026-09-04 — the
   reference wraps both `hidden_cerebral_scribe` and `hidden_dominant_scribe`
   in a PHP block comment (never rendered), reproduced verbatim below rather
   than emitted live; see CLAUDE.md "One thing needed from the user". */
(function(App){

  // A postName's `$row_reg[...]` array key usually matches it exactly, but
  // not always — the reference reads $row_reg['disability'] for the
  // optdisability field and $row_reg['scribe'] for optscribe. Now a shared
  // dictionary.js map (App.DICT.dbNameFor) since reg_qry_arrays.php/
  // disability_queries/print.php need the same postName->DB-name exceptions,
  // not just this file's own $row_reg reads.
  function rowRegKey(postName){ return App.DICT.dbNameFor(postName); }

  // Negates one resolved condition into the PHP expression that's true when
  // that condition is NOT met (i.e. when the gated field should be disabled).
  function negateOne(cond){
    if (cond.op === '==') return "$row_reg['" + rowRegKey(cond.field) + "'] != '" + cond.value + "'";
    if (cond.op === 'selected') return "$row_reg['" + rowRegKey(cond.field) + "'] == ''";
    if (cond.op === 'in') {
      var out = [];
      for (var i = 0; i < cond.codes.length; i++) {
        out.push("!in_array('" + cond.codes[i] + "', explode(',', $row_reg['" + rowRegKey(cond.field) + "']))");
      }
      return out.join(' && ');
    }
    return 'false'; // unreachable for the resolver's known op set
  }

  // De Morgan: NOT(A OR B OR ...) = NOT A AND NOT B AND ... . An 'in'
  // condition's own negation is already an && chain, so it gets its own
  // parens when combined with sibling negations at this level.
  function compileDisabledCore(enabledWhen){
    if (!enabledWhen) return null;
    if (enabledWhen.op === 'or') {
      var parts = [];
      for (var i = 0; i < enabledWhen.conditions.length; i++) {
        var c = enabledWhen.conditions[i];
        var neg = negateOne(c);
        parts.push(c.op === 'in' ? '(' + neg + ')' : neg);
      }
      return parts.join(' && ');
    }
    return negateOne(enabledWhen);
  }

  // Rows 4, 8, 9, 10, 11: a plain `<?php if (...) { ?>disabled<?php } ?>`
  // guard, or nothing at all if the field has no resolved condition (row 3,
  // the root toggle, is never itself disabled).
  function plainDisabled(resolved, postName){
    var entry = resolved[postName];
    if (!entry || !entry.enabledWhen) return '';
    return '<?php if (' + compileDisabledCore(entry.enabledWhen) + ') { ?>disabled<?php } ?>';
  }

  // Row 5 (disability_type select + multiselect): a ternary-style guard,
  // always additionally requiring a category to be chosen — the type list's
  // options themselves come from the chosen category (see genConfig), so an
  // empty category makes the type field meaningless regardless of what the
  // SOW's own validation prose says triggers it.
  function ternaryDisabled(resolved, postName){
    var entry = resolved[postName];
    var core = (entry && entry.enabledWhen) ? compileDisabledCore(entry.enabledWhen) : 'true';
    return '(' + core + " || $row_reg['disability_category'] == '') ? 'disabled' : ''";
  }

  // Row 7 (compans_time): same category-empty guard as row 5, but rendered
  // as a plain if-block instead of a ternary (matches the reference's own
  // choice of markup style for this one field).
  function compansTimeDisabled(resolved){
    var entry = resolved.compans_time;
    if (!entry || !entry.enabledWhen) return '';
    var core = compileDisabledCore(entry.enabledWhen);
    return "<?php if (( " + core + ") || $row_reg['disability_category'] == '') { ?>disabled<?php } ?>";
  }

  // Row 12 (optscribe)'s enable check is computed PHP, not a simple negated
  // guard: resolved['optscribe'] is always an OR of one 'in' condition on
  // disability_type (-> $scribeTypes) plus one or more '==' Y conditions on
  // other fields (-> the final cerebral-palsy/dominant-hand check). Both
  // slots are pulled from the same resolved entry so they can never drift
  // apart from each other.
  function scribeSlots(resolved){
    var entry = resolved.optscribe;
    var conds = [];
    if (entry && entry.enabledWhen) conds = (entry.enabledWhen.op === 'or') ? entry.enabledWhen.conditions : [entry.enabledWhen];
    var codes = [], yFields = [];
    for (var i = 0; i < conds.length; i++) {
      if (conds[i].op === 'in') codes = codes.concat(conds[i].codes);
      else if (conds[i].op === '==' && conds[i].value === 'Y') yFields.push(conds[i].field);
    }
    return { codes: codes, yFields: yFields };
  }

  function scribeTypesLine(resolved){
    var codes = scribeSlots(resolved).codes;
    var quoted = [];
    for (var i = 0; i < codes.length; i++) quoted.push("'" + codes[i] + "'");
    return '$scribeTypes = [' + quoted.join(',') + ']; // Disability vals that enable scribe ';
  }

  function scribeYCheck(resolved){
    var fields = scribeSlots(resolved).yFields;
    if (!fields.length) return 'if (false)'; // no direct Y/N field enables scribe for this SOW — valid PHP, never fires
    var parts = [];
    for (var i = 0; i < fields.length; i++) parts.push("$row_reg['" + rowRegKey(fields[i]) + "'] == 'Y'");
    return 'if (' + parts.join(' || ') + ')';
  }

  // Rows 17.1-17.6 (scribe name / ID / undertakings). Extracted from
  // genDetailsPhp so Set 2's emitter (generators/detailsPhp2.js) can reuse
  // the exact same markup instead of carrying a second copy of it — the block
  // is identical between the two layouts, including the $disable_scribe gate
  // on scribe/scribe1. `has` is the caller's own postName-presence test.
  function scribeDetailBlock(has){
    var out = [];
    // Rows 17-22 (scribe name/id/eligibility detail) are six independently
    // pasted rows, not one atomic unit — a SOW can ask some of them and not
    // others (real case: no edu_qual_for_scribe row at all), so each field's
    // own div is gated on its own postName, not on the section as a whole.
    var anyScribeDetail = has('scribe_name') || has('scribe_id_proof') || has('card_no_scribe') ||
      has('eligible_for_scribe') || has('undertake_to_produce_udid') || has('edu_qual_for_scribe');
    if (anyScribeDetail) {
      out.push("<!-- name of the scribe -->\n\n<div class=\"row reg_det_section\">\n\n<?php\n$disable_scribe=\"disabled\";\nif($row_reg['scribe']=='Y' || $row_reg['scribe1']=='Y'){\n\t$disable_scribe=\"\";\n}\n?>\n\n");
      if (has('scribe_name')) out.push("<div class=\"form-group col-md-6 col-lg-4\">\n\t<label><?php echo $LANG['reg_scribe_name']; ?> </label>\n\t<input class=\"form-control scribe_name\" id=\"scribe_name\" maxlength=\"35\" size=\"40\" name=\"scribe_name\" onkeypress=\"return (alpha(event) && alphactrl(event));\" onkeyup=\"return (alpham(event,this));\" onkeydown=\"return alphactrl(event)\" value=\"<?php echo $row_reg['scribe_name']; ?>\"  <?php echo $disable_scribe;?> />\n\n\t<small class=\"form-text text-muted\"><?php echo $LANG['max_35_character']; ?></small>\n\t<div class=\"invalid-feedback\" id=\"err_scribe_name\"> </div>\n</div>\n\n");
      if (has('scribe_id_proof')) out.push("<div class=\"form-group col-md-6 col-lg-4 mb-0\">\n\t<label><?php echo $LANG['reg_scribe_id_proof']; ?>:<sup class=\"error\"></sup></label>\n\t<select class=\"custom-select scribe_id_proof\" name=\"scribe_id_proof\" id=\"scribe_id_proof\"  <?php echo $disable_scribe;?> >\n\t\t<option value=\"\" selected=\"selected\"><?php echo $LANG['select_btn']; ?></option>\n\t\t<?php echo fnSelectArrayHash($arrScribeIDProof, $row_reg['scribe_id_proof']); ?>\n\t</select>\n\t<div class=\"invalid-feedback\" id=\"err_scribe_id_proof\"></div>\n</div>\n\n");
      if (has('card_no_scribe')) out.push("<div class=\"form-group col-md-6 col-lg-4\">\n\t<label><?php echo $LANG['reg_card_no_scribe']; ?> </label>\n\t<input class=\"form-control card_no_scribe\" id=\"card_no_scribe\" maxlength=\"100\" size=\"40\" name=\"card_no_scribe\" onkeypress=\"return alphadigitspace(event)\" onkeyup=\"return (alphadigitspace(event,this));\" value=\"<?php echo $row_reg['card_no_scribe']; ?>\"  <?php echo $disable_scribe;?> />\n\n\t<small class=\"form-text text-muted\"><?php echo $LANG['max_100_character']; ?></small>\n\t<div class=\"invalid-feedback\" id=\"err_card_no_scribe\"> </div>\n</div>\n\n");
      if (has('eligible_for_scribe')) out.push("<div class=\"form-group col-md-6 col-lg-4\">\n\t<label><?php echo $LANG['reg_eligible_for_scribe']; ?> <sup class=\"error\"></sup></label>\n\t<div class=\"custom-control custom-checkbox \">\n\t\t<input type=\"checkbox\" value=\"Y\" name=\"eligible_for_scribe\" id=\"eligible_for_scribe\" <?php $a = chk_radio($row_reg['eligible_for_scribe'], \"Y\"); echo $a; ?> <?php echo $disable_scribe;?> class=\"custom-control-input eligible_for_scribe\">\n\t\t<label class=\"custom-control-label\" for=\"eligible_for_scribe\"><?php // echo $LANG['yes_lbl']; ?></label>\n\t</div>\n\t<div class=\"invalid-feedback\" id=\"err_eligible_for_scribe\"></div>\n</div>\n\n");
      if (has('undertake_to_produce_udid')) out.push("<div class=\"form-group col-md-6 col-lg-4\">\n\t<label><?php echo $LANG['reg_undertake_to_produce_udid']; ?> <sup class=\"error\"></sup></label>\n\t<div class=\"custom-control custom-checkbox \">\n\t\t<input type=\"checkbox\" value=\"Y\" name=\"undertake_to_produce_udid\" id=\"undertake_to_produce_udid\" <?php $a = chk_radio($row_reg['undertake_to_produce_udid'], \"Y\"); echo $a; ?>  <?php echo $disable_scribe;?> class=\"custom-control-input undertake_to_produce_udid\">\n\t\t<label class=\"custom-control-label\" for=\"undertake_to_produce_udid\"><?php // echo $LANG['yes_lbl']; ?></label>\n\t</div>\n\t<div class=\"invalid-feedback\" id=\"err_undertake_to_produce_udid\"></div>\n</div>\n\n");
      if (has('edu_qual_for_scribe')) out.push("<div class=\"form-group col-md-6 col-lg-4\">\n\t<label><?php echo $LANG['reg_edu_qual_for_scribe']; ?> <sup class=\"error\"></sup></label>\n\t<div class=\"custom-control custom-checkbox \">\n\t\t<input type=\"checkbox\" value=\"Y\" name=\"edu_qual_for_scribe\" id=\"edu_qual_for_scribe\" <?php $a = chk_radio($row_reg['edu_qual_for_scribe'], \"Y\"); echo $a; ?> <?php echo $disable_scribe;?> class=\"custom-control-input edu_qual_for_scribe\">\n\t\t<label class=\"custom-control-label\" for=\"edu_qual_for_scribe\"><?php // echo $LANG['yes_lbl']; ?></label>\n\t</div>\n\t<div class=\"invalid-feedback\" id=\"err_edu_qual_for_scribe\"></div>\n</div>");
      out.push("\n</div>");
    }

    return out.join('');
  }

  function genDetailsPhp(ctx){
    var resolved = ctx.resolve.resolved;
    var fields = ctx.parseA.fields;

    // Only emit a row-3-through-12 block for a field the paste actually contains —
    // a SOW that never pastes e.g. compans_time/optscribe/etc. must not get that
    // field's markup just because the standardized template has a slot for it.
    function has(postName){
      for (var i = 0; i < fields.length; i++) if (fields[i].postName === postName) return true;
      return false;
    }

    var parts = [];
    parts.push("<!-- Disability -->\n<div class=\"row reg_det_section\">\n");
    if (has('optdisability')) parts.push("<div class=\"form-group col-md-6 col-lg-4\">\n\t<label><?php echo $LANG['reg_optdisability']; ?> <sup class=\"error\">*</sup></label>\n\t<div class=\"custom-control custom-radio custom-control-inline\">\n\t\t<input type=\"radio\" value=\"Y\" name=\"optdisability\" id=\"optdisability1\" <?php $a = chk_radio($row_reg['disability'], \"Y\"); echo $a; ?> class=\"custom-control-input optdisability getyears getfee\">\n\t\t<label class=\"custom-control-label\" for=\"optdisability1\"><?php echo $LANG['yes_lbl']; ?></label>\n\t</div>\n\t<div class=\"custom-control custom-radio custom-control-inline\">\n\t\t<input type=\"radio\" value=\"N\" name=\"optdisability\" id=\"optdisability2\" <?php $a = chk_radio($row_reg['disability'], \"N\"); echo $a; ?> class=\"custom-control-input optdisability getyears getfee\">\n\t\t<label class=\"custom-control-label\" for=\"optdisability2\"><?php echo $LANG['no_lbl']; ?></label>\n\t</div>\n\t\n\t<div class=\"invalid-feedback\" id=\"err_optdisability\"></div>\n\t<!--Edit Window For lower fee to higher fee -->\n\t<!--<div class=\"invalid-feedback\" id=\"err_disability_edit\"></div> -->\n</div>\n\n");
    if (has('disability_category')) parts.push("<div class=\"form-group col-md-6 col-lg-4\">\n\t<label for=\"disability_category\">\n\t\t<?php echo $LANG['reg_disability_category']; ?> <sup class=\"error\"></sup>\n\t</label>\n\t<select\n\t\tclass=\"custom-select depdisability optscribesetchange disability_category\" \n\t\tname=\"disability_category\" \n\t\tid=\"disability_category\" \n\t\t" + plainDisabled(resolved, 'disability_category') + "\n\t\tonchange=\"getSub_TypeMuldisability()\"\n\t>\n\t\t<option value=\"\" selected=\"selected\"><?php echo $LANG['select_btn']; ?></option>\n\t\t<?php echo fnSelectArrayHash($arrDiscategory, $row_reg['disability_category']); ?>\n\t</select>\n\t<div class=\"invalid-feedback\" id=\"err_disability_category\"></div>\n</div>\n\n");
    if (has('disability_type')) parts.push("<div class=\"form-group col-md-6 col-lg-4\">\n\t<label for=\"disability_type\"><?= $LANG['reg_disability_type']; ?></label>\n\t\n\t<!-- Single select -->\n\t<select class=\"custom-select depdisability optscribesetchange scribecls compans_rpwd\" \n\t\t\tname=\"disability_type\" \n\t\t\tid=\"disability_type\" \n\t\t\t<?= " + ternaryDisabled(resolved, 'disability_type') + " ?>\n\t\t\tstyle=\"display: <?= ($row_reg['disability_category'] != '05') ? 'block' : 'none' ?>\">\n\t\t<option value=\"\" selected=\"selected\"><?= $LANG['select_btn']; ?></option>\n\n\t\t<?php if($row_reg['disability_type']!= '' && $row_reg['disability_category']!='05' && $row_reg['disability_category']!='')\n\t\t\t{ \n\t\t\t$arr_subDisabilityType4=$arrpostCategoryDisability_mapping[$row_reg['disability_category']];\n\t\t\t$arr_subDisabilityType2_arr=explode(\",\",$arr_subDisabilityType4);\n\t\t\tforeach($arr_subDisabilityType2_arr as $key=>$val)\t\t\t\t\t\t\n\t\t\t$arr_subDisabilityType2_edit[$val]=$arrDisabilityType2[$val];\n\t\t\t echo fnSelectArrayMultiHash($arr_subDisabilityType2_edit, $row_reg['disability_type']);\n\t\t\t}\n\t\t\telse if(array_key_exists($row_reg['disability_category'],$arrDiscategory))\n\t\t\t{\n\t\t\t\t$arr_subDisabilityType4=$arrpostCategoryDisability_mapping[$row_reg['disability_category']];\n\t\t\t\t$arr_subDisabilityType2_arr=explode(\",\",$arr_subDisabilityType4);\n\t\t\t\tforeach($arr_subDisabilityType2_arr as $key=>$val)\t\t\t\t\t\t\n\t\t\t\t$arr_subDisabilityType2_edit[$val]=$arrDisabilityType2[$val];\n\t\t\t\t echo fnSelectArrayMultiHash($arr_subDisabilityType2_edit, '');\n\t\t\t}\n\t\t?>\n\t</select>\n\n\t<!-- Multi select -->\n\t<select class=\"custom-select disability_multiple optscribesetchange scribecls compans_rpwd\" \n\t\t\tname=\"disability_multiple[]\" \n\t\t\tid=\"disability_multiple\" \n\t\t\t<?= " + ternaryDisabled(resolved, 'disability_type') + " ?>\n\t\t\tmultiple \n\t\t\tstyle=\"height:120px !important; display: <?= ($row_reg['disability_category'] == '05') ? 'block' : 'none' ?>\">\n\n\t\t<?php if($row_reg['disability_type']!= '' && $row_reg['disability_category']=='05')\n\t\t\t{ \n\t\t\t$arr_subDisabilityType4=$arrpostCategoryDisability_mapping[$row_reg['disability_category']];\n\t\t\t$arr_subDisabilityType2_arr=explode(\",\",$arr_subDisabilityType4);\n\t\t\tforeach($arr_subDisabilityType2_arr as $key=>$val)\t\t\t\t\t\t\n\t\t\t$arr_subDisabilityType2_edit[$val]=$arrDisabilityType2[$val];\n\t\t\t echo fnSelectArrayMultiHash($arr_subDisabilityType2_edit, $row_reg['disability_type']);\n\t\t\t}\n\t\t\telse if(array_key_exists($row_reg['disability_category'],$arrDiscategory))\n\t\t\t{\n\t\t\t\t$arr_subDisabilityType4=$arrpostCategoryDisability_mapping[$row_reg['disability_category']];\n\t\t\t$arr_subDisabilityType2_arr=explode(\",\",$arr_subDisabilityType4);\n\t\t\tforeach($arr_subDisabilityType2_arr as $key=>$val)\t\t\t\t\t\t\n\t\t\t$arr_subDisabilityType2_edit[$val]=$arrDisabilityType2[$val];\n\t\t\t echo fnSelectArrayMultiHash($arr_subDisabilityType2_edit, '');\n\t\t\t}\n\t\t?>\n\t</select>\n\n\t<div class=\"invalid-feedback\" id=\"err_disability_type\"></div>\n</div> \n\n");
    if (ctx.parseA.noteText) parts.push("<div class=\"form-group col-sm-12 col-lg-12\">\n\t<div class=\"mb-2 label text-note\">\n\t\t<div class=\"blob blue\"></div>\n\t\t<?php echo $LANG['reg_desc2']; ?>\n\t</div>\n</div>\n\n");
    if (has('compans_time')) parts.push("<div class=\"form-group col-md-6 col-lg-4\">\n\t<label><?php echo $LANG['reg_compans_time']; ?> </label>\n\t\n\t<div class=\"custom-control custom-radio custom-control-inline\">\n\t\t<input type=\"radio\" value=\"Y\" name=\"compans_time\" id=\"compans_time1\" \n\t\t\t<?php $a = chk_radio($row_reg['compans_time'], \"Y\"); echo $a; ?> \n\t\t\t" + compansTimeDisabled(resolved) + " \n\t\t\tclass=\"custom-control-input compans_time\">\n\t\t<label class=\"custom-control-label\" for=\"compans_time1\"><?php echo $LANG['yes_lbl']; ?></label>\n\t</div>\n\n\t<div class=\"custom-control custom-radio custom-control-inline\">\n\t\t<input type=\"radio\" value=\"N\" name=\"compans_time\" id=\"compans_time2\" \n\t\t\t<?php $a = chk_radio($row_reg['compans_time'], \"N\"); echo $a; ?> \n\t\t\t" + compansTimeDisabled(resolved) + " \n\t\t\tclass=\"custom-control-input compans_time\">\n\t\t<label class=\"custom-control-label\" for=\"compans_time2\"><?php echo $LANG['no_lbl']; ?></label>\n\t</div>\n\t<div class=\"invalid-feedback\" id=\"err_compans_time\"></div>\n</div>\n");
    if (has('disabilitysuffersoc')) parts.push("<div class=\"form-group col-md-6 col-lg-4\">\n\t<label><?php echo $LANG['reg_disabilitysuffersoc']; ?> </label>\n\t<div class=\"custom-control custom-radio custom-control-inline\">\n\t\t<input type=\"radio\" value=\"Y\" name=\"disabilitysuffersoc\" id=\"disabilitysuffersoc1\" <?php $a = chk_radio($row_reg['disabilitysuffersoc'], \"Y\"); echo $a; ?> " + plainDisabled(resolved, 'disabilitysuffersoc') + " class=\"custom-control-input disabilitysuffersoc optscribeset\">\n\t\t<label class=\"custom-control-label\" for=\"disabilitysuffersoc1\"><?php echo $LANG['yes_lbl']; ?></label>\n\t</div>\n\t<div class=\"custom-control custom-radio custom-control-inline\">\n\t\t<input type=\"radio\" value=\"N\" name=\"disabilitysuffersoc\" id=\"disabilitysuffersoc2\" <?php $a = chk_radio($row_reg['disabilitysuffersoc'], \"N\"); echo $a; ?> " + plainDisabled(resolved, 'disabilitysuffersoc') + " class=\"custom-control-input disabilitysuffersoc optscribeset\">\n\t\t<label class=\"custom-control-label\" for=\"disabilitysuffersoc2\"><?php echo $LANG['no_lbl']; ?></label>\n\t</div>\n\t <?php /* ?><input type=\"hidden\" name=\"hidden_cerebral_scribe\" id=\"hidden_cerebral_scribe\" value=\"<?php echo $row_reg['disabilitysuffersoc']; ?>\">  <?php */ ?>\n\t<div class=\"invalid-feedback\" id=\"err_disabilitysuffersoc\"></div>\n</div>\n\n");
    if (has('compensatory')) parts.push("<div class=\"form-group col-md-6 col-lg-4 \">\n\t<label><?php echo $LANG['reg_compensatory']; ?></label>\n\t<div class=\"custom-control custom-radio custom-control-inline\">\n\t\t<input type=\"radio\" value=\"Y\" name=\"compensatory\" id=\"compensatory1\" <?php $a = chk_radio($row_reg['compensatory'], \"Y\"); echo $a; ?> " + plainDisabled(resolved, 'compensatory') + " class=\"custom-control-input r-bt compensatory\">\n\t\t<label class=\"custom-control-label\" for=\"compensatory1\"><?php echo $LANG['yes_lbl']; ?></label>\n\t</div>\n\t<div class=\"custom-control custom-radio custom-control-inline\">\n\t\t<input type=\"radio\" value=\"N\" name=\"compensatory\" id=\"compensatory2\" <?php $a = chk_radio($row_reg['compensatory'], \"N\"); echo $a; ?> " + plainDisabled(resolved, 'compensatory') + " class=\"custom-control-input r-bt compensatory\">\n\t\t<label class=\"custom-control-label\" for=\"compensatory2\"><?php echo $LANG['no_lbl']; ?></label>\n\t</div>\n\t<div class=\"invalid-feedback\" id=\"err_compensatory\"></div>\n</div>\n\n");
    if (has('compensatary_time')) parts.push("<div class=\"form-group col-md-6 col-lg-4\">\n\t<label><?php echo $LANG['reg_compensatary_time']; ?> </label>\n\t<div class=\"custom-control custom-radio custom-control-inline\">\n\t\t<input type=\"radio\" value=\"Y\" name=\"compensatary_time\" id=\"compensatary_time1\" <?php $a = chk_radio($row_reg['compensatary_time'], \"Y\"); echo $a; ?> " + plainDisabled(resolved, 'compensatary_time') + " class=\"custom-control-input compensatary_time optscribeset\">\n\t\t<label class=\"custom-control-label\" for=\"compensatary_time1\"><?php echo $LANG['yes_lbl']; ?></label>\n\t</div>\n\t<div class=\"custom-control custom-radio custom-control-inline\">\n\t\t<input type=\"radio\" value=\"N\" name=\"compensatary_time\" name=\"compensatary_time\" id=\"compensatary_time2\" <?php $a = chk_radio($row_reg['compensatary_time'], \"N\"); echo $a; ?> " + plainDisabled(resolved, 'compensatary_time') + " class=\"custom-control-input compensatary_time optscribeset\">\n\t\t<label class=\"custom-control-label\" for=\"compensatary_time2\"><?php echo $LANG['no_lbl']; ?></label>\n\t</div>\n\t<?php /* ?><input type=\"hidden\" name=\"hidden_dominant_scribe\" id=\"hidden_dominant_scribe\" value=\"<?php echo $row_reg['compensatary_time']; ?>\"> <?php */ ?>\n\t<div class=\"invalid-feedback\" id=\"err_compensatary_time\"></div>\n</div>\n\n");
    if (has('compensatory1')) parts.push("<div class=\"form-group col-md-6 col-lg-4\">\n\t<label><?php echo $LANG['reg_compensatory']; ?></label>\n\t<div class=\"custom-control custom-radio custom-control-inline\">\n\t\t<input type=\"radio\" value=\"Y\" name=\"compensatory1\" id=\"compensatory11\" <?php $a = chk_radio($row_reg['compensatory1'], \"Y\"); echo $a; ?> " + plainDisabled(resolved, 'compensatory1') + " class=\"custom-control-input r-bt compensatory1\">\n\t\t<label class=\"custom-control-label\" for=\"compensatory11\"><?php echo $LANG['yes_lbl']; ?></label>\n\t</div>\n\t<div class=\"custom-control custom-radio custom-control-inline\">\n\t\t<input type=\"radio\" value=\"N\" name=\"compensatory1\" id=\"compensatory21\" <?php $a = chk_radio($row_reg['compensatory1'], \"N\"); echo $a; ?> " + plainDisabled(resolved, 'compensatory1') + " class=\"custom-control-input r-bt compensatory1\">\n\t\t<label class=\"custom-control-label\" for=\"compensatory21\"><?php echo $LANG['no_lbl']; ?></label>\n\t</div>\n\t<div class=\"invalid-feedback\" id=\"err_compensatory1\"></div>\n</div>");
    // The scribe-compute PHP + optscribe field itself; the outer "row reg_det_section"
    // wrapper opened in `prefix` is always closed below regardless, so the markup
    // stays valid HTML whether or not this SOW has a scribe question at all.
    if (has('optscribe')) parts.push("\n\n<?php\n\t$enableScribe = false;\n\t" + scribeTypesLine(resolved) + "\n\n\t// Check single select\n\tif ($row_reg['disability_category'] != '05' && in_array($row_reg['disability_type'], $scribeTypes)) {\n\t\t$enableScribe = true;\n\t}\n\n\t// Check multi-select\n\t// echo __LINE__;\n\tif ($row_reg['disability_category'] == '05') {\n\t\t$selectedDisabilities = explode(',',$row_reg['disability_type']) ?? [];\n\t\tforeach ($selectedDisabilities as $val) {\n\t\t\t//echo $val.\">>>\";\n\t\t\tif (in_array($val, $scribeTypes)) {\n\t\t\t\t$enableScribe = true;\n\t\t\t\tbreak;\n\t\t\t}\n\t\t}\n\t}\n\n\t// Check cerebral palsy or dominant hand yes\n\t" + scribeYCheck(resolved) + " {\n\t\t$enableScribe = true;\n\t}\n?>\n\n<div class=\"form-group col-md-6 col-lg-4\">\n\t<label><?php echo $LANG['reg_optscribe']; ?></label>\n\t<div class=\"custom-control custom-radio custom-control-inline\">\n\t\t<input type=\"radio\" value=\"Y\" name=\"optscribe\" id=\"optscribe1\"\n\t\t\t<?php $a = chk_radio($row_reg['scribe'], \"Y\"); echo $a; ?>\n\t\t\t<?php if(!$enableScribe){ ?>disabled<?php } ?>\n\t\t\tclass=\"custom-control-input optscribe\">\n\t\t<label class=\"custom-control-label\" for=\"optscribe1\"><?php echo $LANG['yes_lbl']; ?></label>\n\t</div>\n\t<div class=\"custom-control custom-radio custom-control-inline\">\n\t\t<input type=\"radio\" value=\"N\" name=\"optscribe\" id=\"optscribe2\"\n\t\t\t<?php $a = chk_radio($row_reg['scribe'], \"N\"); echo $a; ?>\n\t\t\t<?php if(!$enableScribe){ ?>disabled<?php } ?>\n\t\t\tclass=\"custom-control-input optscribe\">\n\t\t<label class=\"custom-control-label\" for=\"optscribe2\"><?php echo $LANG['no_lbl']; ?></label>\n\t</div>\n\t<div class=\"invalid-feedback\" id=\"err_optscribe\"></div>\n\t\n\t<?php if (file_exists(STATIC_VIEW_PATH.'scribe.pdf')) { ?>\n\t\t<div class=\"text_style_bd link left pt-2\" style=\"cursor:pointer;\">\n\t\t\t<a target=\"_blank\" href=\"<?php echo STATIC_VIEW_URL.\"loadpdf.php?file=$fileType&t=$docName#toolbar=0&navpanes=0\";?>\" class=\"text_style_bd link left guidelink\">\n\t\t\t\t<div class=\"blob blue\"></div> Guidelines for Scribe\n\t\t\t</a>\n\t\t</div>\n\t<?php } ?>\n</div>");
    parts.push("\n\n</div>\n\n");
    parts.push(scribeDetailBlock(has));

    return parts.join('');
  }

  App.GEN = App.GEN || {};
  App.GEN.detailsPhp = genDetailsPhp;
  App.GEN.scribeDetailBlock = scribeDetailBlock;

})(window.App = window.App || {});
