/* Disability Code Generator — module: generators/printPhp.js
   print.php — the registration preview-page markup: one <tr> label/value row
   per pasted field, in the same document order/nesting the user's own
   reference supplied. Unlike detailsPhp.js's golden, this reference arrived
   as pasted chat text rather than an external ground-truth document, so
   byte-exact whitespace parity can't be verified with confidence — this file
   was therefore never byte-diffed while that harness existed (removed
   2026-09-09) — see qryArrays.js/langPhp.js/queriesSql.js for the same
   "no byte-exact reference" tier. Content, PHP
   logic, $LANG keys, and $reg-> property names are all transcribed verbatim
   from the reference; indentation is normalized to a single flat style —
   every <tr> block starts at column 0 with one-tab-indented <td>s,
   regardless of PHP-level if/wrapper nesting — since the reference's own
   pasted text had one block (compensatory2/scribe1/disability_certify)
   sitting one tab deeper than every sibling block for no structural reason;
   caught by the user as bad alignment (2026-09-09).

   Almost the entire block is fixed template text, same tier as
   detailsPhp.js's own reasoning: $LANG keys and the property names read off
   $reg (a stdClass, not $row_reg's array) are both standardized by the
   dictionary regardless of SOW wording, so nothing here is SOW-derived
   except which rows exist at all — every row/wrapper below is gated on
   has(postName) for its own field, same convention as every prior emitter.

   $reg-> property names use the SAME 3 POST-name exceptions as everywhere
   else (App.DICT.dbNameFor): $reg->disability (optdisability), $reg->scribe
   (optscribe), $reg->disability_40less (optdisability_40less) — baked into
   the fixed template text directly since these are structural, not computed
   per field the way qryArrays.js/queriesSql.js need to compute them.

   Three nesting levels, each gated the way detailsPhp.js's own "a group is
   never atomic" lesson demands (CLAUDE.md, "Follow-up: rows 17-22 needed
   per-field gating too"):
     1. The `if($reg->disability=='Y')` wrapper (rows: category, type,
        compans_time, disabilitysuffersoc, compensatory, compensatary_time,
        compensatory1, optscribe) — opened only if has('optdisability'),
        since $reg->disability has no meaning for a SOW that never asks the
        root toggle at all. Each inner row still gated on its OWN postName.
     2. The `if($reg->disability_40less=='Y')` wrapper (compensatory2,
        scribe1, disability_certify) — opened only if
        has('optdisability_40less'), same reasoning.
     3. The scribe-detail wrapper (scribe_name/scribe_id_proof/
        card_no_scribe/eligible_for_scribe/undertake_to_produce_udid/
        edu_qual_for_scribe) — its HTML/PHP is emitted at all only if ANY of
        the six is present (anyScribeDetail, same helper name/logic as
        detailsPhp.js's), but the wrapper's runtime PHP condition is
        `$reg->scribe=='Y' || $reg->scribe1=='Y'` — the actual PARENT that
        enables this section per the Validations column, same condition
        detailsPhp.js's own $disable_scribe already uses
        ($row_reg['scribe']=='Y' || $row_reg['scribe1']=='Y'). NOT a check
        that a dependent field is non-empty (the literal reference text
        checked `$reg->scribe_name!='' || ...` across all 6 fields, which is
        circular — one of those OR terms is the very field the wrapper
        exists to gate — and doesn't reflect the SOW's own enabling rule).
        Each row inside is still individually gated on its own field. */
(function(App){

  // Set 2 (see core/set2.js) reuses this same emitter: its row order, its
  // three nesting levels and its per-field gating are identical. Only two
  // things differ, both handled inline below — Set 2's `disability_type` is a
  // single category code rather than Set 1's CSV of type codes, and Set 2 has
  // three extra rows (subdistypeido / sub_disability_type /
  // sub_disability_multiple) immediately after it. A field a layout does not
  // have is never in ctx.parseA.fields, so no layout flag is needed to skip
  // the rows that do not apply.
  var ROW_OPTDISABILITY =
    "<tr>\n\t<td class=\"w-50\"><?php echo $LANG['reg_optdisability']; ?></td>\n\t<td class=\"w-1\">:</td>\n\t<td class=\"w-40\"><?PHP echo ($reg->disability != '') ? ChangeBoolean($reg->disability) : '-'; ?></td>\n</tr>\n\n";

  var OPEN_DISABILITY_IF = "<?php if($reg->disability == 'Y') { ?>\n";
  var CLOSE_DISABILITY_IF = "<?php } ?>\n\n";

  var ROW_DISABILITY_CATEGORY =
    "<tr>\n\t<td><?php echo $LANG['reg_disability_category']; ?></td>\n\t<td>:</td>\n\t<td><?PHP echo ($reg->disability_category != '') ? $arrDiscategory[$reg->disability_category] : '-'; ?></td>\n</tr>\n\n";

  var ROW_DISABILITY_TYPE =
    "<tr>\n\t<td><?php echo $LANG['reg_disability_type']; ?></td>\n\t<td>:</td>\n\t<td>\n\t\t<?php\n\t\t$netDisdet = [];\n\t\t$netDiskeydet = [];\n\n\t\tif (!empty($reg->disability_type)) {\n\t\t\t$DisMultiArr = explode(\",\", $reg->disability_type);\n\n\t\t\tforeach ($DisMultiArr as $val) {\n\t\t\t\tif (isset($arrDisabilityType2[$val])) {\n\t\t\t\t\t$netDisdet[] = $arrDisabilityType2[$val];\n\t\t\t\t\t$netDiskeydet[] = $val;\n\t\t\t\t}\n\t\t\t}\n\n\t\t\techo implode(\", \", $netDisdet);\n\t\t} else {\n\t\t\techo \"-\";\n\t\t}\n\t\t?>\n\t</td>\n</tr>\n\n";

  // ── Set 2 only ────────────────────────────────────────────────────────
  // In Set 2 `disability_type` holds ONE category code, not Set 1's CSV of
  // type codes, so it prints as a single array lookup rather than an
  // explode/implode. The three rows after it are the fields Set 2 adds; only
  // the multi-select needs the CSV treatment, and it reads
  // $arr_mulsubDisabilityType2, the array that actually holds its options.
  var ROW_DISABILITY_TYPE_SET2 =
    "<tr>\n\t<td><?php echo $LANG['reg_disability_type']; ?></td>\n\t<td>:</td>\n\t<td><?PHP echo ($reg->disability_type != '') ? $arrDisabilityType2[$reg->disability_type] : '-'; ?></td>\n</tr>\n\n";

  var ROW_SUBDISTYPEIDO =
    "<tr>\n\t<td><?php echo $LANG['reg_subdistypeido']; ?></td>\n\t<td>:</td>\n\t<td><?PHP echo ($reg->subdistypeido != '') ? $arrDisabilityTypeIDO[$reg->subdistypeido] : '-'; ?></td>\n</tr>\n\n";

  var ROW_SUB_DISABILITY_TYPE =
    "<tr>\n\t<td><?php echo $LANG['reg_sub_disability']; ?></td>\n\t<td>:</td>\n\t<td><?PHP echo ($reg->sub_disability_type != '') ? $arr_subDisabilityType2[$reg->sub_disability_type] : '-'; ?></td>\n</tr>\n\n";

  var ROW_SUB_DISABILITY_MULTIPLE =
    "<tr>\n\t<td><?php echo $LANG['reg_sub_disability_multiple']; ?></td>\n\t<td>:</td>\n\t<td>\n\t\t<?php\n\t\t$netDisdet = [];\n\n\t\tif (!empty($reg->sub_disability_multiple)) {\n\t\t\t$DisMultiArr = explode(\",\", $reg->sub_disability_multiple);\n\n\t\t\tforeach ($DisMultiArr as $val) {\n\t\t\t\tif (isset($arr_mulsubDisabilityType2[$val])) {\n\t\t\t\t\t$netDisdet[] = $arr_mulsubDisabilityType2[$val];\n\t\t\t\t}\n\t\t\t}\n\n\t\t\techo implode(\", \", $netDisdet);\n\t\t} else {\n\t\t\techo \"-\";\n\t\t}\n\t\t?>\n\t</td>\n</tr>\n\n";

  var ROW_COMPANS_TIME =
    "<tr>\n\t<td class=\"w-50\"><?php echo $LANG['reg_compans_time']; ?></td>\n\t<td class=\"w-1\">:</td>\n\t<td class=\"w-40\"><?PHP echo ($reg->compans_time != '') ? ChangeBoolean($reg->compans_time) : '-'; ?></td>\n</tr>\n";

  var ROW_DISABILITYSUFFERSOC =
    "<tr>\n\t<td><?php echo $LANG['reg_disabilitysuffersoc']; ?></td>\n\t<td>:</td>\n\t<td><?PHP echo ($reg->disabilitysuffersoc!='' && $reg->disabilitysuffersoc!='NA') ? ChangeBoolean($reg->disabilitysuffersoc):'-'; ?></td>\n</tr>\n\n";

  var ROW_COMPENSATORY =
    "<tr>\n\t<td><?php echo $LANG['reg_compensatory']; ?></td>\n\t<td>:</td>\n\t<td><?PHP echo ($reg->compensatory!='') ? ChangeBoolean($reg->compensatory):'-'; ?></td>\n</tr>\n\n";

  var ROW_COMPENSATARY_TIME =
    "<tr>\n\t<td><?php echo $LANG['reg_compensatary_time']; ?></td>\n\t<td>:</td>\n\t<td><?PHP echo ($reg->compensatary_time!='') ? ChangeBoolean($reg->compensatary_time):'-'; ?></td>\n</tr>\n";

  var ROW_COMPENSATORY1 =
    "<tr>\n\t<td><?php echo $LANG['reg_compensatory']; ?></td>\n\t<td>:</td>\n\t<td><?PHP echo ($reg->compensatory1!='') ? ChangeBoolean($reg->compensatory1):'-'; ?></td>\n</tr>\n\n";

  var ROW_OPTSCRIBE =
    "<tr>\n\t<td><?php echo $LANG['reg_optscribe']; ?></td>\n\t<td>:</td>\n\t<td><?PHP echo ($reg->scribe!='') ? ChangeBoolean($reg->scribe):'-'; ?></td>\n</tr>\n";

  var ROW_40LESS =
    "<tr>\n\t<td><?php echo $LANG['reg_optdisability_40less']; ?></td>\n\t<td>:</td>\n\t<td><?PHP echo ($reg->disability_40less!='') ? ChangeBoolean($reg->disability_40less):'-'; ?></td>\n</tr>\n";

  var OPEN_40LESS_IF = "<?php if($reg->disability_40less == 'Y') { ?>\n";
  var CLOSE_40LESS_IF = "<?php } ?>\n\n";

  var ROW_COMPENSATORY2 =
    "<tr>\n\t<td><?php echo $LANG['reg_compensatory']; ?></td>\n\t<td>:</td>\n\t<td><?PHP echo ($reg->compensatory2!='') ? ChangeBoolean($reg->compensatory2):'-'; ?></td>\n</tr>\n";

  var ROW_SCRIBE1 =
    "<tr>\n\t<td><?php echo $LANG['reg_optscribe1']; ?></td>\n\t<td>:</td>\n\t<td><?PHP echo ($reg->scribe1!='') ? ChangeBoolean($reg->scribe1):'-'; ?></td>\n</tr>\n";

  var ROW_DISABILITY_CERTIFY =
    "<tr>\n\t<td><?php echo $LANG['reg_disability_certify']; ?></td>\n\t<td>:</td>\n\t<td><?PHP echo ($reg->disability_certify!='') ? ChangeBoolean($reg->disability_certify):'-'; ?></td>\n</tr>\n";

  // The gate is whether the PARENT (scribe/scribe1) was actually enabled,
  // same condition detailsPhp.js's own $disable_scribe already uses
  // ($row_reg['scribe']=='Y' || $row_reg['scribe1']=='Y') — not whether a
  // dependent field happens to be non-empty, which is circular (one of the
  // "or" terms was scribe_name!='', the very field the wrapper exists to
  // gate) and doesn't match what the Validations column actually says
  // enables this section. Caught by the user after the literal reference
  // text (composited from $reg->disability/$reg->disability_40less plus
  // all 6 dependent fields' own emptiness) was transcribed verbatim.
  var OPEN_SCRIBE_DETAIL_IF = "<?php if($reg->scribe == 'Y' || $reg->scribe1 == 'Y') { ?>\n\n";
  var CLOSE_SCRIBE_DETAIL_IF = "<?php } ?>\n";

  var ROW_SCRIBE_NAME =
    "<tr>\n\t<td><?php echo $LANG['reg_scribe_name']; ?></td>\n\t<td>:</td>\n\t<td><?PHP echo ($reg->scribe_name != '') ? ChangeBoolean($reg->scribe_name) : '-'; ?></td>\n</tr>\n";

  var ROW_SCRIBE_ID_PROOF =
    "<tr>\n\t<td><?php echo $LANG['reg_scribe_id_proof']; ?></td>\n\t<td>:</td>\n\t<td><?PHP echo ($reg->scribe_id_proof!='') ? $arrScribeIDProof[$reg->scribe_id_proof]:'-'; ?></td>\n</tr>\n";

  var ROW_CARD_NO_SCRIBE =
    "<tr>\n\t<td><?php echo $LANG['reg_card_no_scribe']; ?></td>\n\t<td>:</td>\n\t<td style=\"word-break: break-all;\">\n\t\t<?php if(($reg->appl_status == \"C\" && $show_mask_status=='0') || $show_mask_status=='1'){\n\t\t\t$card_no_scribe_show=($reg->card_no_scribe!='')?ccMasking($reg->card_no_scribe):'';\n\t\t} else {\n\t\t\t$card_no_scribe_show=$reg->card_no_scribe;\n\t\t}\n\t\techo ($reg->card_no_scribe!='') ? $card_no_scribe_show:'-'; ?>\n\t</td>\n</tr>\n";

  var ROW_ELIGIBLE_FOR_SCRIBE =
    "<tr>\n\t<td><?php echo $LANG['reg_eligible_for_scribe']; ?></td>\n\t<td>:</td>\n\t<td><?PHP echo ($reg->eligible_for_scribe != '') ? ChangeBoolean($reg->eligible_for_scribe) : '-'; ?></td>\n</tr>\n\n";

  var ROW_UNDERTAKE =
    "<tr>\n\t<td><?php echo $LANG['reg_undertake_to_produce_udid']; ?></td>\n\t<td>:</td>\n\t<td><?PHP echo ($reg->undertake_to_produce_udid != '') ? ChangeBoolean($reg->undertake_to_produce_udid) : '-'; ?></td>\n</tr>\n";

  var ROW_EDU_QUAL =
    "<tr>\n\t<td><?php echo $LANG['reg_edu_qual_for_scribe']; ?></td>\n\t<td>:</td>\n\t<td><?PHP echo ($reg->edu_qual_for_scribe != '') ? ChangeBoolean($reg->edu_qual_for_scribe) : '-'; ?></td>\n</tr>\n\n";

  function genPrintPhp(ctx){
    var fields = ctx.parseA.fields;
    function has(postName){
      for (var i = 0; i < fields.length; i++) if (fields[i].postName === postName) return true;
      return false;
    }

    var isSet2 = !!(ctx.parseA && ctx.parseA.isSet2);

    var parts = [];
    if (has('optdisability')) parts.push(ROW_OPTDISABILITY);

    if (has('optdisability')) {
      parts.push(OPEN_DISABILITY_IF);
      if (has('disability_category')) parts.push(ROW_DISABILITY_CATEGORY);
      if (has('disability_type')) parts.push(isSet2 ? ROW_DISABILITY_TYPE_SET2 : ROW_DISABILITY_TYPE);
      if (has('subdistypeido')) parts.push(ROW_SUBDISTYPEIDO);
      if (has('sub_disability_type')) parts.push(ROW_SUB_DISABILITY_TYPE);
      if (has('sub_disability_multiple')) parts.push(ROW_SUB_DISABILITY_MULTIPLE);
      if (has('compans_time')) parts.push(ROW_COMPANS_TIME);
      if (has('disabilitysuffersoc')) parts.push(ROW_DISABILITYSUFFERSOC);
      if (has('compensatory')) parts.push(ROW_COMPENSATORY);
      if (has('compensatary_time')) parts.push(ROW_COMPENSATARY_TIME);
      if (has('compensatory1')) parts.push(ROW_COMPENSATORY1);
      if (has('optscribe')) parts.push(ROW_OPTSCRIBE);
      parts.push(CLOSE_DISABILITY_IF);
    }

    if (has('optdisability_40less')) parts.push(ROW_40LESS);

    if (has('optdisability_40less')) {
      parts.push(OPEN_40LESS_IF);
      if (has('compensatory2')) parts.push(ROW_COMPENSATORY2);
      if (has('scribe1')) parts.push(ROW_SCRIBE1);
      if (has('disability_certify')) parts.push(ROW_DISABILITY_CERTIFY);
      parts.push(CLOSE_40LESS_IF);
    }

    var anyScribeDetail = has('scribe_name') || has('scribe_id_proof') || has('card_no_scribe') ||
      has('eligible_for_scribe') || has('undertake_to_produce_udid') || has('edu_qual_for_scribe');
    if (anyScribeDetail) {
      parts.push(OPEN_SCRIBE_DETAIL_IF);
      if (has('scribe_name')) parts.push(ROW_SCRIBE_NAME);
      if (has('scribe_id_proof')) parts.push(ROW_SCRIBE_ID_PROOF);
      if (has('card_no_scribe')) parts.push(ROW_CARD_NO_SCRIBE);
      if (has('eligible_for_scribe')) parts.push(ROW_ELIGIBLE_FOR_SCRIBE);
      if (has('undertake_to_produce_udid')) parts.push(ROW_UNDERTAKE);
      if (has('edu_qual_for_scribe')) parts.push(ROW_EDU_QUAL);
      parts.push(CLOSE_SCRIBE_DETAIL_IF);
    }

    return parts.join('');
  }

  App.GEN = App.GEN || {};
  App.GEN.print = genPrintPhp;

})(window.App = window.App || {});
