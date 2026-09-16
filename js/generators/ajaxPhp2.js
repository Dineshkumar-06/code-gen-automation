/* Disability Code Generator — module: generators/ajaxPhp2.js
   Set 2's two AJAX endpoints, supplied verbatim by the user:

     ajax_getSubType_disability.php           feeds #sub_disability_type from
                                               /
                                               when the
                                              category dropdown changes.
     ajax_getSubType_Multiple_disability.php  feeds #sub_disability_multiple
                                              from  /
                                               when
                                              the routing dropdown changes.

   Same tier as Set 1's ajaxPhp.js / functionsPhp.js: 100% static, not derived
   from either paste, not even field presence. Both read only arrays that
   generators/config2.js already emits, so they need no knowledge of this
   SOW's own codes. Set 1's own ajax_getdisability_type.php is NOT emitted for
   a Set 2 paste — its flow does not exist there. */
(function(App){

  var SUBTYPE_PHP = "<?php\nrequire_once('config.php');\n$company_code=$_REQUEST['selcompany'];\n\nglobal $arrDisabilityType2;\nglobal $arr_subDisabilityType2;\t\nglobal $arr_subDisability_map_Edit;\n\n$centre_code_csv=$arr_subDisability_map_Edit[$company_code];\n$centre_code_arr=explode(\",\",$centre_code_csv);\n\nforeach($centre_code_arr as $key=>$val){\n\t$arrlocal_lang_edit[$val]=$arr_subDisabilityType2[$val];\n}\t\n//asort($arrlocal_lang_edit);\n$return_val='';\nforeach ($arrlocal_lang_edit as $k=>$v)\n{\n\t$return_val.=$k.\"|\".$v.\",\";\n}\n$return_val=substr($return_val,0,-1);\necho $return_val;\nexit;\t\n?>";

  var SUBTYPE_MULTIPLE_PHP = "<?php\nrequire_once('config.php');\n\n$company_code=$_REQUEST['selcompany'];\n\nglobal $arr_subDisabilityType_id;\nglobal $arr_mulsubDisabilityType2;\t\nglobal $arr_MulsubDisability_map_Edit;\n\n$centre_code_csv=$arr_MulsubDisability_map_Edit[$company_code];\n\nif($centre_code_csv!=\"\"){\n\t\n\t$centre_code_arr=explode(\",\",$centre_code_csv);\n\n\tforeach($centre_code_arr as $key=>$val){\n\t\t$arrlocal_lang_edit[$val]=$arr_mulsubDisabilityType2[$val];\t\n\t}\n\t//asort($arrlocal_lang_edit);\n\t$return_val='';\n\n\tforeach ($arrlocal_lang_edit as $k=>$v)\n\t{\n\t\t$return_val.=$k.\"|\".$v.\",\";\n\t}\n\n\t$return_val=substr($return_val,0,-1);\n\n\techo $return_val;\n\n\texit;\t\n\n}\n?>";

  App.GEN = App.GEN || {};
  App.GEN.ajaxSubType = function(){ return SUBTYPE_PHP; };
  App.GEN.ajaxSubTypeMultiple = function(){ return SUBTYPE_MULTIPLE_PHP; };

})(window.App = window.App || {});
