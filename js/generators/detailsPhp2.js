/* Disability Code Generator — module: generators/detailsPhp2.js
   Set 2's reg_details.php. Loaded AFTER generators/detailsPhp.js, which it
   wraps: App.GEN.detailsPhp() dispatches on ctx.parseA.isSet2 so the tab
   strip, the zip and every test keep seeing one `detailsPhp` key.

   Same design as Set 1's emitter (see detailsPhp.js's header): names, ids,
   classes and LANG keys are fixed by the dictionary regardless of SOW
   wording, so the markup is one constant template and the only SOW-derived
   pieces are

     - the `disabled` conditions, compiled from resolveAll()'s resolved{},
     - the two codes the sub-type dropdowns pivot on (which category routes
       through subdistypeido, and which sub-type is "Multiple Disabilities"),
       both from core/set2.js — never hardcoded as the reference's own '04' /
       '25'.

   Every row is gated on its own postName being in the paste, per this
   project's standing rule that a dictionary "group" is a labelling
   convenience and says nothing about which rows a given SOW pastes.

   Two deliberate differences from the pasted reference text:

   1. The reference ANDs a redundant `$row_reg['disability'] == 'Y'` into
      disabilitysuffersoc's and compensatary_time's conditions but not into
      compans_time's or optscribe's. It is redundant because reg_submit.php
      NULLs every dependent column when the root toggle is not Y, so the
      inner test can never pass on a re-render. This emitter emits exactly
      what the resolver resolved, for every field alike — consistent with
      Set 1's emitter, which does the same.
   2. disabilitysuffersoc / compensatary_time are written in the reference as
      `if (...) { ?> enabled <?php } else { ?> disabled <?php }`. `enabled` is
      not an HTML attribute and does nothing; every other field in the same
      file uses the plain `if (not enabled) { ?>disabled<?php }` form, which
      is what is emitted here throughout.

   NOTE for the developer: the multi-select's option list is printed by
   `PrintArrSub_disDetails()`, a helper the reference application already
   provides. It is reproduced verbatim from the reference and is NOT defined
   by this tool's functions.php output. */
(function(App){

  var genDetailsPhpSet1 = App.GEN && App.GEN.detailsPhp;

  function dbKey(postName){ return App.DICT.dbNameFor(postName); }

  // Positive form: the PHP expression that is TRUE when this condition holds.
  // Multi-select membership reads $disabilitymulti, the explode() of the
  // stored CSV that the template sets up once before the dependent fields.
  function enabledExpr(cond){
    var i, parts = [];
    if (cond.op === '==') return "$row_reg['" + dbKey(cond.field) + "'] == '" + cond.value + "'";
    if (cond.op === 'selected') return "$row_reg['" + dbKey(cond.field) + "'] != ''";
    if (cond.op === 'in') {
      if (cond.field === 'sub_disability_multiple') {
        for (i = 0; i < cond.codes.length; i++) parts.push('in_array("' + cond.codes[i] + '", $disabilitymulti)');
      } else {
        for (i = 0; i < cond.codes.length; i++) {
          parts.push("$row_reg['" + dbKey(cond.field) + "'] == '" + cond.codes[i] + "'");
        }
      }
      if (!parts.length) return 'false';
      return (parts.length === 1) ? parts[0] : '(' + parts.join(' || ') + ')';
    }
    return 'false';
  }

  function enabledExprFor(enabledWhen){
    if (!enabledWhen) return null;
    if (enabledWhen.op === 'or') {
      var parts = [];
      for (var i = 0; i < enabledWhen.conditions.length; i++) parts.push(enabledExpr(enabledWhen.conditions[i]));
      if (!parts.length) return null;
      return parts.join(' || ');
    }
    return enabledExpr(enabledWhen);
  }

  // A guard that is structural rather than prose-derived, ANDed onto the
  // resolved condition. Exactly the same move Set 1's emitter makes for its
  // type dropdowns ("the type list's options themselves come from the chosen
  // category, so an empty category makes the type field meaningless
  // regardless of what the SOW's own validation prose says").
  //
  // Only sub_disability_type needs one. Its <option> list is built from
  // $arr_subDisability_map_Edit, which by construction has no entry for the
  // routing category — so the dropdown is meaningless unless a NON-routing
  // category is chosen, whatever the prose says. Without this the field's two
  // requirement sentences ("enabled if YES in point no 4" and "enabled &
  // mandatory for VI, HI, OC") merge to an OR, per the resolver's documented
  // merge rule, and the dropdown would wrongly stay enabled for MD/ID.
  //
  // subdistypeido and sub_disability_multiple need none: their own resolved
  // conditions (disability_type == <routing category>, and
  // <trigger> == <Multiple Disabilities>) already imply everything structural
  // about them.
  function structuralGuard(postName, roles, has){
    if (postName !== 'sub_disability_type') return null;
    if (!has('disability_type')) return null;
    var parts = ["$row_reg['disability_type'] != ''"];
    if (roles.idoCategoryCode) parts.push("$row_reg['disability_type'] != '" + roles.idoCategoryCode + "'");
    return parts.join(' && ');
  }

  // `<?php if (NOT enabled) { ?>disabled<?php } ?>`, or '' when the field has
  // no resolved condition at all (the root toggle is never itself disabled).
  function disabledGuard(resolved, postName, roles, has){
    var entry = resolved[postName];
    var expr = entry && enabledExprFor(entry.enabledWhen);
    var structural = roles ? structuralGuard(postName, roles, has) : null;
    if (!expr && !structural) return '';
    var full = expr ? (structural ? '(' + expr + ') && ' + structural : expr) : structural;
    return '<?php if (!(' + full + ')) { ?>disabled<?php } ?>';
  }

  function genDetailsPhpSet2(ctx){
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

    var p = [];
    p.push('<!-- Disability -->\n<div class="row reg_det_section">\n\n');
    p.push('<div class="form-group col-sm-12">\n\t<h5 class="m-0"><?php echo $LANG[\'reg_disblty_lbl\']; ?>:</h5>\n</div>\n\n');

    if (has('optdisability')) {
      p.push('<div class="form-group col-md-6 col-lg-4">\n' +
        '\t<label><?php echo $LANG[\'reg_optdisability\']; ?> <sup class="error">*</sup></label>\n' +
        '\t<div class="custom-control custom-radio custom-control-inline">\n' +
        '\t\t<input type="radio" value="Y" name="optdisability" id="optdisability1" <?php $a = chk_radio($row_reg[\'disability\'], "Y"); echo $a; ?> class="custom-control-input optdisability getyears getfee">\n' +
        '\t\t<label class="custom-control-label" for="optdisability1"><?php echo $LANG[\'yes_lbl\']; ?></label>\n' +
        '\t</div>\n' +
        '\t<div class="custom-control custom-radio custom-control-inline">\n' +
        '\t\t<input type="radio" value="N" name="optdisability" id="optdisability2" <?php $a = chk_radio($row_reg[\'disability\'], "N"); echo $a; ?> class="custom-control-input optdisability getyears getfee">\n' +
        '\t\t<label class="custom-control-label" for="optdisability2"><?php echo $LANG[\'no_lbl\']; ?></label>\n' +
        '\t</div>\n' +
        '\t<div class="invalid-feedback" id="err_optdisability"></div>\n' +
        '\t<!--Edit Window For lower fee to higher fee -->\n' +
        '\t<!--<div class="invalid-feedback" id="err_disability_edit"></div> -->\n' +
        '</div>\n\n');
    }

    // Row 5 — the CATEGORY dropdown (the SOW calls it "Type of Disability").
    if (has('disability_type')) {
      p.push('<div class="form-group col-md-6 col-lg-4 ">\n' +
        '\t<label for="disability_type"><?php echo $LANG[\'reg_disability_type\']; ?> </label>\n' +
        '\t<select class="custom-select depdisability optscribesetchange" name="disability_type" id="disability_type" ' +
        disabledGuard(resolved, 'disability_type') + '>\n' +
        '\t\t<option value="" selected="selected"><?php echo $LANG[\'select_btn\']; ?></option>\n' +
        '\t\t<?php echo fnSelectArrayHash($arrDisabilityType2, $row_reg[\'disability_type\']); ?>\n' +
        '\t</select>\n' +
        '\t<?php if (file_exists(STATIC_VIEW_PATH . \'disability.pdf\')) { ?>\n' +
        '\t\t<?php\n' +
        '\t\t$fileTypeEn = encrypt(STATIC_VIEW_PATH);\n' +
        '\t\t$fileType = base64_encode($fileTypeEn);\n' +
        '\t\t$docNameEn = encrypt(\'disability.pdf\');\n' +
        '\t\t$docName = base64_encode($docNameEn);\n' +
        '\t\t?>\n' +
        '\t\t<div class="info_box_new_doc">\n' +
        '\t\t\t<div class="blob blue"></div>\n' +
        '\t\t\t<a target="_blank" href="<?php echo STATIC_VIEW_URL . "loadpdf.php?file=$fileType&t=$docName#toolbar=0&navpanes=0"; ?>" class="">Definition of Disabilities</a>\n' +
        '\t\t</div>\n' +
        '\t<?php } ?>\n' +
        '\t<div class="invalid-feedback" id="err_disability_type"></div>\n' +
        '</div>\n\n');
    }

    // Row 5.1 — sub-types of the one routing category.
    if (has('subdistypeido')) {
      p.push('<div class="form-group col-md-6 col-lg-4 ">\n' +
        '\t<label for="subdistypeido"><?php echo $LANG[\'reg_subdistypeido\']; ?> </label>\n' +
        '\t<select class="custom-select optscribesetchange subdistypeido" name="subdistypeido" id="subdistypeido" ' +
        disabledGuard(resolved, 'subdistypeido') + '>\n' +
        '\t\t<option value="" selected="selected"><?php echo $LANG[\'select_btn\']; ?></option>\n' +
        '\t\t<?php echo fnSelectArrayHash($arrDisabilityTypeIDO, $row_reg[\'subdistypeido\']); ?>\n' +
        '\t</select>\n' +
        '\t<div class="invalid-feedback" id="err_subdistypeido"></div>\n' +
        '</div>\n\n');
    }

    // Row 6 — sub-types of every other category. The option list is built
    // from $arr_subDisability_map_Edit, so it depends on the chosen category
    // and skips the routing category entirely: structural template text, the
    // same tier as Set 1's own category-mapping <option> block.
    if (has('sub_disability_type')) {
      p.push('<div class="form-group col-md-6 col-lg-4 ">\n' +
        '\t<label for="sub_disability_type"><?php echo $LANG[\'reg_sub_disability\']; ?> </label>\n' +
        '\t<select class="custom-select optscribesetchange sub_disability_type" name="sub_disability_type" id="sub_disability_type" ' +
        disabledGuard(resolved, 'sub_disability_type', roles, has) + '>\n' +
        '\t\t<option value="" selected="selected"><?php echo $LANG[\'select_btn\']; ?></option>\n' +
        '\t\t<?php\n' +
        '\t\tif ($row_reg[\'disability_type\'] != \'\' && $row_reg[\'disability_type\'] != \'' + idoCat + '\') {\n' +
        '\t\t\t$arr_subDisabilityType4 = $arr_subDisability_map_Edit[$row_reg[\'disability_type\']];\n' +
        '\t\t\t$arr_subDisabilityType2_arr = explode(",", $arr_subDisabilityType4);\n' +
        '\t\t\tforeach ($arr_subDisabilityType2_arr as $key => $val)\n' +
        '\t\t\t\t$arr_subDisabilityType2_edit[$val] = $arr_subDisabilityType2[$val];\n' +
        '\t\t\techo fnSelectArrayHash($arr_subDisabilityType2_edit, $row_reg[\'sub_disability_type\']);\n' +
        '\t\t} ?>\n' +
        '\t</select>\n' +
        '\t<div class="invalid-feedback" id="err_sub_disability_type"></div>\n' +
        '</div>\n\n');
    }

    // Row 6.1 — the multi-select.
    if (has('sub_disability_multiple')) {
      var openCond = "$row_reg['" + trigger + "'] == '" + mulCode + "'" +
        (has('disability_type') && idoCat ? " && $row_reg['disability_type'] == '" + idoCat + "'" : '');
      p.push('<div class="form-group col-md-6 col-lg-4 ">\n' +
        '\t<label for="sub_disability_multiple"><?php echo $LANG[\'reg_sub_disability_multiple\']; ?></label>\n' +
        '\t<select class="custom-select listMenu left sub_disability_multiple optscribesetchange" name="sub_disability_multiple[]" id="sub_disability_multiple" ' +
        disabledGuard(resolved, 'sub_disability_multiple') + ' multiple style="height:135px !important;">\n' +
        '\t\t<?php\n' +
        '\t\tif (' + openCond + ') {\n' +
        '\t\t\tPrintArrSub_disDetails($row_reg[\'sub_disability_multiple\']);\n' +
        '\t\t}\n' +
        '\t\t?>\n' +
        '\t</select>\n' +
        '\t<div class="invalid-feedback" id="err_sub_disability_multiple"></div>\n' +
        '</div>\n\n');
    }

    if (ctx.parseA.noteText) {
      p.push('<div class="form-group col-sm-12 ">\n' +
        '\t<div class="mb-2 label text-note ">\n' +
        '\t\t<span class="info_box_note ">\n' +
        '\t\t\t<div class="blob blue"></div>\n' +
        '\t\t\t<?php echo $LANG[\'reg_desc2\']; ?>\n' +
        '\t\t</span>\n' +
        '\t</div>\n' +
        '</div>\n\n');
    }

    // Every condition below that tests the multi-select reads $disabilitymulti,
    // so it is set up once here rather than re-exploded per field. Emitted
    // whenever the multi-select exists, regardless of which dependent fields
    // this paste happens to have.
    if (has('sub_disability_multiple')) {
      p.push('<?php\n$disabilitymulti = explode(",", $row_reg[\'sub_disability_multiple\']);\n?>\n\n');
    }

    p.push(radioBlock(has, resolved, 'compans_time', 'reg_compans_time', 'compans_time1', 'compans_time2',
      'custom-control-input r-bt compans_time', 'custom-control-input compans_time', null));
    p.push(radioBlock(has, resolved, 'disabilitysuffersoc', 'reg_disabilitysuffersoc', 'disabilitysuffersoc1', 'disabilitysuffersoc2',
      'custom-control-input disabilitysuffersoc optscribeset', 'custom-control-input disabilitysuffersoc optscribeset',
      '\t<?php /* ?><input type="hidden" name="hidden_cerebral_scribe" id="hidden_cerebral_scribe" value="<?php echo $row_reg[\'disabilitysuffersoc\']; ?>"> <?php */ ?>\n'));
    p.push(radioBlock(has, resolved, 'compensatory', 'reg_compensatory', 'compensatory1', 'compensatory2',
      'custom-control-input r-bt compensatory', 'custom-control-input r-bt compensatory', null));
    p.push(radioBlock(has, resolved, 'compensatary_time', 'reg_compensatary_time', 'compensatary_time1', 'compensatary_time2',
      'custom-control-input compensatary_time optscribeset', 'custom-control-input compensatary_time optscribeset',
      '\t<?php /* ?><input type="hidden" name="hidden_dominant_scribe" id="hidden_dominant_scribe" value="<?php echo $row_reg[\'compensatary_time\']; ?>"> <?php */ ?>\n'));
    p.push(radioBlock(has, resolved, 'compensatory1', 'reg_compensatory', 'compensatory11', 'compensatory21',
      'custom-control-input r-bt compensatory1', 'custom-control-input r-bt compensatory1', null));

    if (has('optscribe')) {
      var scribeGuard = disabledGuard(resolved, 'optscribe');
      p.push('<div class="form-group col-md-6 col-lg-6 ">\n' +
        '\t<label><?php echo $LANG[\'reg_optscribe\']; ?></label>\n' +
        '\t<div class="custom-control custom-radio custom-control-inline">\n' +
        '\t\t<input type="radio" value="Y" name="optscribe" id="optscribe1" <?php $a = chk_radio($row_reg[\'scribe\'], "Y"); echo $a; ?> ' + scribeGuard + ' class="custom-control-input optscribe">\n' +
        '\t\t<label class="custom-control-label" for="optscribe1"><?php echo $LANG[\'yes_lbl\']; ?></label>\n' +
        '\t</div>\n' +
        '\t<div class="custom-control custom-radio custom-control-inline">\n' +
        '\t\t<input type="radio" value="N" name="optscribe" id="optscribe2" <?php $a = chk_radio($row_reg[\'scribe\'], "N"); echo $a; ?> ' + scribeGuard + ' class="custom-control-input optscribe">\n' +
        '\t\t<label class="custom-control-label" for="optscribe2"><?php echo $LANG[\'no_lbl\']; ?></label>\n' +
        '\t</div>\n' +
        '\t<div class="invalid-feedback" id="err_optscribe"></div>\n' +
        '\t<?php if (file_exists(STATIC_VIEW_PATH . \'scribe.pdf\')) { ?>\n' +
        '\t\t<?php\n' +
        '\t\t$fileTypeEn = encrypt(STATIC_VIEW_PATH);\n' +
        '\t\t$fileType = base64_encode($fileTypeEn);\n' +
        '\t\t$docNameEn = encrypt(\'scribe.pdf\');\n' +
        '\t\t$docName = base64_encode($docNameEn);\n' +
        '\t\t?>\n' +
        '\t\t<div class="info_box_new_doc">\n' +
        '\t\t\t<div class="blob blue"></div>\n' +
        '\t\t\t<a target="_blank" href="<?php echo STATIC_VIEW_URL . "loadpdf.php?file=$fileType&t=$docName#toolbar=0&navpanes=0"; ?>" class="">Guidelines for Scribe</a>\n' +
        '\t\t</div>\n' +
        '\t<?php } ?>\n' +
        '</div>\n');
    }

    p.push('\n</div>\n\n');

    // Rows 17.1-17.6 — identical to Set 1's, including the $disable_scribe
    // gate on scribe/scribe1, so the Set 1 emitter's own block is reused
    // rather than transcribed a second time. Each row is independently gated
    // there too.
    p.push(App.GEN.scribeDetailBlock(has));

    return p.join('').replace(/\s+$/, '');
  }

  // The five radio rows between the note and optscribe are structurally
  // identical apart from their names, ids, classes and optional trailing
  // hidden field, so one builder covers all of them.
  function radioBlock(has, resolved, postName, langKey, idY, idN, clsY, clsN, extra){
    if (!has(postName)) return '';
    var guard = disabledGuard(resolved, postName);
    return '<div class="form-group col-md-6 col-lg-6">\n' +
      '\t<label><?php echo $LANG[\'' + langKey + '\']; ?></label>\n' +
      '\t<div class="custom-control custom-radio custom-control-inline">\n' +
      '\t\t<input type="radio" value="Y" name="' + postName + '" id="' + idY + '" <?php $a = chk_radio($row_reg[\'' + postName + '\'], "Y"); echo $a; ?> ' + guard + ' class="' + clsY + '">\n' +
      '\t\t<label class="custom-control-label" for="' + idY + '"><?php echo $LANG[\'yes_lbl\']; ?></label>\n' +
      '\t</div>\n' +
      '\t<div class="custom-control custom-radio custom-control-inline">\n' +
      '\t\t<input type="radio" value="N" name="' + postName + '" id="' + idN + '" <?php $a = chk_radio($row_reg[\'' + postName + '\'], "N"); echo $a; ?> ' + guard + ' class="' + clsN + '">\n' +
      '\t\t<label class="custom-control-label" for="' + idN + '"><?php echo $LANG[\'no_lbl\']; ?></label>\n' +
      '\t</div>\n' +
      (extra || '') +
      '\t<div class="invalid-feedback" id="err_' + postName + '"></div>\n' +
      '</div>\n\n';
  }

  App.GEN = App.GEN || {};
  App.GEN.detailsPhpSet2 = genDetailsPhpSet2;
  App.GEN.detailsPhp = function(ctx){
    return (ctx.parseA && ctx.parseA.isSet2) ? genDetailsPhpSet2(ctx) : genDetailsPhpSet1(ctx);
  };

})(window.App = window.App || {});
