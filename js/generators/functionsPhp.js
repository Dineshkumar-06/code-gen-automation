/* Disability Code Generator — module: generators/functionsPhp.js
   functions.php — the shared helper functions the emitted markup calls.
   Set 1 needs exactly one so far: fnSelectArrayMultiHash(), which
   detailsPhp.js's disability_type single/multi-select blocks both call to
   render <option> tags from the category-filtered $arrDisabilityType2
   slice, marking whichever ones are already selected. (fnSelectArrayHash(),
   used for disability_category/scribe_id_proof, is assumed already present
   in the target project's own codebase — not supplied here.)

   Same tier as ajaxPhp.js: 100% static for Set 1, supplied verbatim by the
   user, not derived from either paste. Per the user, Set 2 (or a future
   layout) may need a different function set here — this file is where that
   would change, not the SOW-derived emitters. */
(function(App){

  var FUNCTIONS_PHP = "<?php\n\nfunction fnSelectArrayMultiHash($arrhasname, $in='')\n\t{\n\t\t$op='';$sel = '';\n\t\t$in_array = explode(',',$in);\n\t\tforeach($arrhasname as $key => $value){\n\t\tif(in_array($key,$in_array))\n\t\t  $sel = 'Selected';\n\t\telse\n\t\t  $sel = ''; \n\t\t$op .= \"<option value=\\\"$key\\\" $sel>$value</option>\";\n\t\t}\n\t\treturn $op;\n\t}\n";

  function genFunctionsPhp(){
    return FUNCTIONS_PHP;
  }

  App.GEN = App.GEN || {};
  App.GEN.functionsPhp = genFunctionsPhp;

})(window.App = window.App || {});
