/* Disability Code Generator — module: generators/validationsPhp2.js
   Set 2's reg_validations.php. Loaded AFTER generators/validationsPhp.js,
   which it wraps: App.GEN.validations() dispatches on ctx.parseA.isSet2.

   Shape per field: `if (<the field's own resolved enable condition>) { declare
   it mandatory } else { $errmsgarr[] = '<field>|'; }` — the same condition
   reg_details.php negates into `disabled` and reg_submit.php uses to decide
   whether to write the column, so the three can never disagree. Every block
   is gated on has(postName).

   EXCLUSION GROUPS (PRD §8). Confirmed with the user 2026-09-11: Set 1's
   dynamic $exclgrpN/$exclcntN codegen is reused rather than the Set 2
   reference's own `count(array_diff(array(...), $_POST[...])) < 7` form. The
   reference's thresholds are group-size-specific (`< 7` only means "more than
   one of these eight"), its messages come from $LANG keys that would have to
   be invented per group in reg_details_lang.php, and it only handles the
   exactly-three groups it was hand-written for. The counter form handles
   however many groups this paste produces and keeps the editable
   exclusion-group review panel working unchanged.

   This is NOT the byte-for-byte reproduction Set 1's emitter attempts — Set 1
   has a golden reference to match and this layout does not, so the block here
   is written plainly rather than reproducing the original's inconsistent
   hand-typed indentation.

   Also per the user: a Set 2 multi-select sometimes states no exclusion rule
   at all. Zero groups emits no cascade — not an empty one. */
(function(App){

  var genValidationsSet1 = App.GEN && App.GEN.validations;

  var MULTI = 'sub_disability_multiple';

  function escSingle(s){ return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
  function escDouble(s){ return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$'); }

  // The PHP expression, against $_POST, that is true when this condition holds.
  function expr(cond){
    var i, parts = [];
    if (cond.op === '==') return "$_POST['" + cond.field + "'] == '" + cond.value + "'";
    if (cond.op === 'selected') return "$_POST['" + cond.field + "'] != ''";
    if (cond.op === 'in') {
      if (cond.field === MULTI) {
        for (i = 0; i < cond.codes.length; i++) {
          parts.push('in_array("' + cond.codes[i] + '",$_POST[\'' + MULTI + '\'],true)');
        }
        if (!parts.length) return 'false';
        return "(is_array($_POST['" + MULTI + "']) && (" + parts.join(' || ') + '))';
      }
      for (i = 0; i < cond.codes.length; i++) parts.push("$_POST['" + cond.field + "'] == '" + cond.codes[i] + "'");
      if (!parts.length) return 'false';
      return (parts.length === 1) ? parts[0] : '(' + parts.join(' || ') + ')';
    }
    return 'false';
  }

  function guardFor(resolved, postName){
    var entry = resolved[postName];
    if (!entry || !entry.enabledWhen) return null;
    var w = entry.enabledWhen;
    if (w.op !== 'or') return expr(w);
    var parts = [];
    for (var i = 0; i < w.conditions.length; i++) parts.push(expr(w.conditions[i]));
    if (!parts.length) return null;
    return (parts.length === 1) ? parts[0] : '(' + parts.join(' || ') + ')';
  }

  // ── the exclusion cascade, for however many groups this paste produced ──
  function exclusionBlock(groups, indent){
    if (!groups || !groups.length) return '';
    var i, n, out = '';

    out += indent + '// Mutual-exclusion groups: at most one member of each may be chosen.\n';
    for (i = 0; i < groups.length; i++) {
      n = i + 1;
      var codes = groups[i].codes.map(function(c){ return "'" + c + "'"; }).join(',');
      out += indent + '$exclgrp' + n + ' = array(' + codes + '); $exclcnt' + n + ' = 0;\n';
    }
    out += '\n' + indent + "foreach ($_POST['" + MULTI + "'] as $exclval) {\n";
    for (i = 0; i < groups.length; i++) {
      n = i + 1;
      out += indent + '\tif (in_array($exclval, $exclgrp' + n + ', true)) { $exclcnt' + n + '++; }\n';
    }
    out += indent + '}\n\n';

    for (i = 0; i < groups.length; i++) {
      n = i + 1;
      var msg = groups[i].message;
      out += indent + (i === 0 ? 'if' : '} else if') + ' ($exclcnt' + n + ' > 1) {\n' +
        indent + '\t$errmsg .= $LANG[\'reg_' + MULTI + '\'] . " can not select ' + escDouble(msg) + ' together<br/>";\n' +
        indent + '\t$errmsgarr[] = \'' + MULTI + "|'.$LANG['reg_" + MULTI + "'].' can not select " + escSingle(msg) + " together|C';\n";
    }
    out += indent + '} else {\n' +
      indent + '\t$errmsgarr[] = \'' + MULTI + "|';\n" +
      indent + '}\n';
    return out;
  }

  function genValidationsSet2(ctx){
    var resolved = ctx.resolve.resolved;
    var fields = ctx.parseA.fields;
    var roles = ctx.set2 || App.SET2.roles(ctx.parseA, ctx.parseB);
    var groups = ctx.exclusionGroups || [];

    function has(postName){
      for (var i = 0; i < fields.length; i++) if (fields[i].postName === postName) return true;
      return false;
    }
    function maxLen(postName, dflt){
      for (var i = 0; i < fields.length; i++) {
        if (fields[i].postName === postName) {
          var n = parseInt(String(fields[i].maxLength).replace(/[^0-9]/g, ''), 10);
          if (!isNaN(n) && n > 0) return n;
        }
      }
      return dflt;
    }

    var rootY = has('optdisability') ? "$_POST['optdisability'] == 'Y'" : null;
    function withRoot(g){
      if (!g) return rootY;
      if (!rootY) return g;
      return g + ' && ' + rootY;
    }

    var out = [];

    // ── the category dropdown ──
    if (has('disability_type')) {
      out.push('if (' + (rootY || 'true') + ') {\n' +
        '\t// ----------------- Type of Disability ----------------\n' +
        "\t$mandatory_flds['disability_type'] = 'reg_disability_type|dropdown|5|disability_type';\n" +
        "\t$arr_flds['disability_type'] = 'reg_disability_type|arrDisabilityType2';\n" +
        '} else {\n' +
        "\t$errmsgarr[] = 'disability_type|';\n" +
        '}\n\n');
    }

    // ── the two root toggles cannot both be Yes ──
    if (has('optdisability') && has('optdisability_40less')) {
      out.push("if ($_POST['optdisability_40less'] == 'Y' && $_POST['optdisability'] == 'Y') {\n" +
        '\t$errmsg .= "Both ".$LANG[\'reg_optdisability\']." and ".$LANG[\'reg_optdisability_40less\']." Should not be YES";\n' +
        '\t$errmsgarr[] = "disability_alert|Both ".$LANG[\'reg_optdisability\']." and ".$LANG[\'reg_optdisability_40less\']." Should not be YES|C";\n' +
        '} else {\n' +
        "\t$errmsgarr[] = 'disability_alert|';\n" +
        '}\n\n');
    }

    // ── the routing sub-type dropdown ──
    if (has('subdistypeido')) {
      out.push('// --------------- subdistypeido --------------------\n' +
        'if (' + (withRoot(guardFor(resolved, 'subdistypeido')) || 'true') + ') {\n' +
        "\t$mandatory_flds['subdistypeido'] = 'reg_subdistypeido|dropdown|5|subdistypeido';\n" +
        "\t$arr_flds['subdistypeido'] = 'reg_subdistypeido|arrDisabilityTypeIDO';\n" +
        '} else {\n' +
        "\t$errmsgarr[] = 'subdistypeido|';\n" +
        '}\n\n');
    }

    // ── the other sub-type dropdown. Validated against the very map its
    //    <option> list is built from, so a hand-posted code from another
    //    category is rejected. ──
    if (has('sub_disability_type')) {
      var subCats = roles.subTypeCategories.map(function(c){ return "$_POST['disability_type'] == '" + c.code + "'"; });
      var subGuard = subCats.length ? '(' + subCats.join(' || ') + ')' : "$_POST['disability_type'] != ''";
      out.push('// --------------- sub_disability_type --------------------\n' +
        'if (' + (withRoot(subGuard) || 'true') + ') {\n' +
        "\t$arrDisTypeEdit = explode(\",\", $arr_subDisability_map_Edit[$_POST['disability_type']]);\n" +
        "\tif (trim($_POST['sub_disability_type']) == '') {\n" +
        '\t\t$errmsg .= "Please Select ".$LANG[\'reg_sub_disability\']." <br /><br />";\n' +
        "\t\t$errmsgarr[] = 'sub_disability_type|Please Select '.$LANG['reg_sub_disability'];\n" +
        "\t} elseif (!in_array($_POST['sub_disability_type'], $arrDisTypeEdit, true)) {\n" +
        '\t\t$errmsg .= $LANG[\'reg_sub_disability\']." is invalid <br /><br />";\n' +
        "\t\t$errmsgarr[] = 'sub_disability_type|'.$LANG['reg_sub_disability'].' is invalid|C';\n" +
        '\t} else {\n' +
        "\t\t$errmsgarr[] = 'sub_disability_type|';\n" +
        '\t}\n' +
        '} else {\n' +
        "\t$errmsgarr[] = 'sub_disability_type|';\n" +
        '}\n\n');
    }

    // ── the multi-select: membership, "more than one", then exclusions ──
    if (has(MULTI)) {
      var openParts = [];
      var resolvedOpen = guardFor(resolved, MULTI);
      if (resolvedOpen) openParts.push(resolvedOpen);
      if (has('disability_type') && roles.idoCategoryCode) {
        openParts.push("$_POST['disability_type'] == '" + roles.idoCategoryCode + "'");
      }
      var openGuard = withRoot(openParts.join(' && ')) || 'true';
      var excl = exclusionBlock(groups, '\t\t\t');
      out.push('// --------------- ' + MULTI + ' --------------------\n' +
        'if (' + openGuard + ') {\n' +
        "\tif (empty($_POST['" + MULTI + "'])) {\n" +
        '\t\t$errmsg .= "Please Select ".$LANG[\'reg_' + MULTI + '\'];\n' +
        "\t\t$errmsgarr[] = '" + MULTI + "|Please Select '.$LANG['reg_" + MULTI + "'];\n" +
        '\t} else {\n' +
        "\t\t$_POST['" + MULTI + "'] = array_unique($_POST['" + MULTI + "']);\n" +
        '\t\t$disablCnt = 0; $disablCntBad = 0;\n' +
        "\t\tforeach ($_POST['" + MULTI + "'] as $key) {\n" +
        '\t\t\tif (array_key_exists($key, $arr_mulsubDisabilityType2)) { $disablCnt++; } else { $disablCntBad++; }\n' +
        '\t\t}\n\n' +
        '\t\tif ($disablCntBad > 0) {\n' +
        '\t\t\t$errmsg .= $LANG[\'reg_' + MULTI + '\']." is Invalid";\n' +
        "\t\t\t$errmsgarr[] = '" + MULTI + "|'.$LANG['reg_" + MULTI + "'].' is Invalid|C';\n" +
        '\t\t} else if ($disablCnt < 2) {\n' +
        '\t\t\t$errmsg .= "Please Select ".$LANG[\'reg_' + MULTI + '\']." more than 1 values";\n' +
        "\t\t\t$errmsgarr[] = '" + MULTI + "|Please Select '.$LANG['reg_" + MULTI + "'].' more than 1 values|C';\n" +
        '\t\t} else {\n' +
        (excl || "\t\t\t$errmsgarr[] = '" + MULTI + "|';\n") +
        '\t\t}\n' +
        '\t}\n' +
        '} else {\n' +
        "\t$errmsgarr[] = '" + MULTI + "|';\n" +
        '}\n\n');
    }

    // ── compans_time ──
    if (has('compans_time')) {
      out.push('// --------------- compans_time --------------------\n' +
        'if (' + (withRoot(guardFor(resolved, 'compans_time')) || 'true') + ') {\n' +
        "\t$mandatory_flds['compans_time'] = 'reg_compans_time|radiobutton|1|compans_time';\n" +
        "\t$validate_flds_value['compans_time'] = 'reg_compans_time|Should be either Yes or No|Y,N|C';\n" +
        '} else {\n' +
        "\t$errmsgarr[] = 'compans_time|';\n" +
        '}\n\n');
    }

    // ── disabilitysuffersoc + compensatary_time share one condition in the
    //    reference; they are emitted together only when the resolver agrees
    //    they really do, so a SOW that gates them differently still works. ──
    var socGuard = withRoot(guardFor(resolved, 'disabilitysuffersoc'));
    var domGuard = withRoot(guardFor(resolved, 'compensatary_time'));
    var shared = has('disabilitysuffersoc') && has('compensatary_time') && socGuard === domGuard;

    function socBody(indent){
      var s = indent + "$mandatory_flds['disabilitysuffersoc'] = 'reg_disabilitysuffersoc|radiobutton|1|disabilitysuffersoc';\n";
      var c = resolved.disabilitysuffersoc && resolved.disabilitysuffersoc.constraint;
      if (c && c.code) {
        // "Should be YES if <type> is selected" — the constraint names ONE
        // sub-type, which can be reached through either dropdown.
        var tests = ["$_POST['" + c.whenField + "'] == '" + c.code + "'"];
        if (has(MULTI)) {
          tests.push("(is_array($_POST['" + MULTI + "']) && in_array(\"" + c.code + '",$_POST[\'' + MULTI + "'],true))");
        }
        s += indent + 'if (' + tests.join(' || ') + ') {\n' +
             indent + "\t$validate_flds_value['disabilitysuffersoc'] = 'reg_disabilitysuffersoc|Should be " +
               (c.shouldBe === 'Y' ? 'Yes' : 'No') + '|' + c.shouldBe + "|C';\n" +
             indent + '} else {\n' +
             indent + "\t$validate_flds_value['disabilitysuffersoc'] = 'reg_disabilitysuffersoc|Should be either Yes or No|Y,N|C';\n" +
             indent + '}\n';
      } else {
        s += indent + "$validate_flds_value['disabilitysuffersoc'] = 'reg_disabilitysuffersoc|Should be either Yes or No|Y,N|C';\n";
      }
      return s;
    }
    function domBody(indent){
      return indent + "$mandatory_flds['compensatary_time'] = 'reg_compensatary_time|radiobutton|1|compensatary_time';\n" +
             indent + "$validate_flds_value['compensatary_time'] = 'reg_compensatary_time|Should be either Yes or No|Y,N|C';\n";
    }

    if (shared) {
      out.push('// --------------- disabilitysuffersoc and compensatary_time --------------------\n' +
        'if (' + socGuard + ') {\n' + socBody('\t') + '\n' + domBody('\t') +
        '} else {\n' +
        "\t$errmsgarr[] = 'disabilitysuffersoc|';\n" +
        "\t$errmsgarr[] = 'compensatary_time|';\n" +
        '}\n\n');
    } else {
      if (has('disabilitysuffersoc')) {
        out.push('// --------------- disabilitysuffersoc --------------------\n' +
          'if (' + (socGuard || 'true') + ') {\n' + socBody('\t') +
          '} else {\n' + "\t$errmsgarr[] = 'disabilitysuffersoc|';\n" + '}\n\n');
      }
      if (has('compensatary_time')) {
        out.push('// --------------- compensatary_time --------------------\n' +
          'if (' + (domGuard || 'true') + ') {\n' + domBody('\t') +
          '} else {\n' + "\t$errmsgarr[] = 'compensatary_time|';\n" + '}\n\n');
      }
    }

    // ── optscribe ──
    if (has('optscribe')) {
      out.push('// --------------- scribe --------------------\n' +
        'if (' + (withRoot(guardFor(resolved, 'optscribe')) || 'true') + ') {\n' +
        "\t$mandatory_flds['optscribe'] = 'reg_optscribe|radiobutton|1|optscribe';\n" +
        "\t$validate_flds_value['optscribe'] = 'reg_optscribe|Should be either Yes or No|Y,N|C';\n" +
        '} else {\n' +
        "\t$errmsgarr[] = 'optscribe|';\n" +
        '}\n\n');
    }

    // ── rows 17.1-17.6 ──
    var scribeY = [];
    if (has('optscribe')) scribeY.push("$_POST['optscribe'] == 'Y'");
    if (has('scribe1')) scribeY.push("$_POST['scribe1'] == 'Y'");
    var anyDetail = ['scribe_name', 'scribe_id_proof', 'card_no_scribe', 'eligible_for_scribe',
      'undertake_to_produce_udid', 'edu_qual_for_scribe'].some(has);

    if (scribeY.length && anyDetail) {
      var body = '', elseBody = '';
      if (has('card_no_scribe')) out.push("$errmsgarr[] = 'card_no_scribe|';\n");

      if (has('scribe_name')) {
        body += "\t$non_mandatory_flds['scribe_name'] = 'reg_scribe_name|textbox|" + maxLen('scribe_name', 35) + "|scribe_name';\n" +
                "\t$function_validation['scribe_name'] = 'reg_scribe_name|isAlphaSpace';\n\n";
        elseBody += "\t$errmsgarr[] = 'scribe_name|';\n";
      }
      if (has('scribe_id_proof')) {
        body += "\t$non_mandatory_flds['scribe_id_proof'] = 'reg_scribe_id_proof|dropdown|5|scribe_id_proof';\n" +
                "\t$arr_flds['scribe_id_proof'] = 'reg_scribe_id_proof|arrScribeIDProof';\n\n";
        elseBody += "\t$errmsgarr[] = 'scribe_id_proof|';\n";
      }
      ['eligible_for_scribe', 'undertake_to_produce_udid', 'edu_qual_for_scribe'].forEach(function(f){
        if (!has(f)) return;
        body += "\t$non_mandatory_flds['" + f + "'] = 'reg_" + f + "|radiobutton|1|" + f + "';\n" +
                "\t$validate_flds_value['" + f + "'] = 'reg_" + f + "|Should be Checked|Y|C';\n\n";
        elseBody += "\t$errmsgarr[] = '" + f + "|';\n";
      });

      // The ID-number format depends on which ID proof was chosen. The three
      // codes are fixed by requirement, not by paste order — see
      // dictionary.js's SCRIBE_ID_PROOF_CODES.
      if (has('card_no_scribe') && has('scribe_id_proof')) {
        body += "\tif ($_POST['scribe_id_proof'] == '01' && $_POST['card_no_scribe'] != '') {\n" +
          "\t\t$fixed_len_flds['card_no_scribe'] = 'reg_card_no_scribe|10';\n" +
          '\t\t$pattern = "/[A-Z]{5}\\d{4}[A-Z]{1}$/";\n' +
          "\t\tif (!preg_match($pattern, $_POST['card_no_scribe'])) {\n" +
          '\t\t\t$finalsubmit = "N";\n' +
          "\t\t\t$errmsg .= $LANG['reg_card_no_scribe'] . ' should be first 5 Capital alphabets, next 4 numeric & last 1 Capital alphabet|C';\n" +
          "\t\t\t$errmsgarr[] = 'card_no_scribe|' . $LANG['reg_card_no_scribe'] . ' should be first 5 Capital alphabets, next 4 numeric & last 1 Capital alphabet|C';\n" +
          '\t\t}\n' +
          "\t} else if ($_POST['scribe_id_proof'] == '05' || $_POST['scribe_id_proof'] == '06') {\n" +
          "\t\t$non_mandatory_flds['card_no_scribe'] = 'reg_card_no_scribe|textbox|12|card_no_scribe';\n" +
          "\t\t$function_validation['card_no_scribe'] = 'reg_card_no_scribe|isFieldZero,isIntCustom';\n" +
          "\t\t$fixed_len_flds['card_no_scribe'] = 'reg_card_no_scribe|12';\n" +
          '\t} else {\n' +
          "\t\t$non_mandatory_flds['card_no_scribe'] = 'reg_card_no_scribe|textbox|" + maxLen('card_no_scribe', 100) + "|card_no_scribe';\n" +
          "\t\t$function_validation['card_no_scribe'] = 'reg_card_no_scribe|isFieldZerowithSpace,isFieldZero,isIntAlphaSpace';\n" +
          '\t}\n';
      }

      out.push('if (' + scribeY.join(' || ') + ') {\n' + body + '} else {\n' + elseBody + '}\n');
    }

    return out.join('').replace(/\s+$/, '') + '\n';
  }

  App.GEN = App.GEN || {};
  App.GEN.validationsSet2 = genValidationsSet2;
  App.GEN.validations = function(ctx){
    return (ctx.parseA && ctx.parseA.isSet2) ? genValidationsSet2(ctx) : genValidationsSet1(ctx);
  };

})(window.App = window.App || {});
