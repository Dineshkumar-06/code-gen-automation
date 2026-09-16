/* Disability Code Generator — module: generators/ajaxPhp.js
   ajax_getdisability_type.php — the AJAX endpoint getSub_TypeMuldisability()
   (see detailsJs.js) calls to repopulate #disability_type/#disability_multiple
   from $arrpostCategoryDisability_mapping/$arrDisabilityType2 (both already
   emitted by config.js) whenever the candidate changes disability_category.

   Unlike every other tab, this file is 100% static for Set 1 — supplied
   verbatim by the user, not derived from either paste in any way, not even
   field presence. It's a fixed companion script a developer downloads once
   per project alongside the SOW-derived files; nothing here varies by SOW. */
(function(App){

  var AJAX_PHP = "<?php\nrequire_once('config.php');\n\n$disab_cate=$_REQUEST['disab_cate'];\n\n\nglobal $arrDisabilityType2;\nglobal $arrpostCategoryDisability_mapping;\n\n$centre_code_csv=$arrpostCategoryDisability_mapping[$disab_cate];\n\n\nif($centre_code_csv!=\"\"){\n\n\t$centre_code_arr=explode(\",\",$centre_code_csv);\n\n\tforeach($centre_code_arr as $key=>$val)\n\t\t$arrlocal_lang_edit[$val]=$arrDisabilityType2[$val];\n\t//asort($arrlocal_lang_edit);\n\t$return_val=($disab_cate=='05')?'':'|Select,';\n\n\tforeach ($arrlocal_lang_edit as $k=>$v)\n\t{\n\t\t$return_val.=$k.\"|\".$v.\",\";\n\t}\n\n\t$return_val=substr($return_val,0,-1);\n\n\techo $return_val;\n\n\texit;\n\n}\n?>";

  function genAjaxPhp(){
    return AJAX_PHP;
  }

  App.GEN = App.GEN || {};
  App.GEN.ajaxPhp = genAjaxPhp;

})(window.App = window.App || {});
