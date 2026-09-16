/* Disability Code Generator — module: generators/stubs.js
   Phase 4-6 placeholder. Real emitters land later ("All emitters consume the
   resolved structure. No emitter parses prose directly." — PRD §6). Until
   then each tab dumps the resolver data that will feed it, so Phase 3's
   output is reviewable per PRD §Phase-3's stop-and-show requirement. */
(function(App){

  // Review-panel state (e.g. resolved[x]._condList, the editing scratch array
  // for enabledWhen) is prefixed with "_" and must never leak into generator
  // previews — strip it here rather than at every call site.
  function pretty(x){
    return JSON.stringify(x, function(k, v){ return (k.charAt(0) === '_') ? undefined : v; }, 2);
  }

  function header(file, note){
    return '/* ' + file + ' — not yet generated (Phase 4-6). ' + note + ' */\n\n';
  }

  function genConfig(ctx){
    return header('config.php', 'Shown below: Phase 1 parse of Input B.') +
      '$arrDiscategory (preview)\n' + pretty(ctx.parseB.categories) + '\n\n' +
      '$arrDisabilityType2 (preview)\n' + pretty(ctx.parseB.types) + '\n\n' +
      '$arrpostCategoryDisability_mapping (preview)\n' + pretty(ctx.parseB.mapping);
  }

  function genDetailsPhp(ctx){
    return header('reg_details.php', 'Shown below: Phase 2 field objects (rows 3-12 + constant-block rows 12.1-12.4, 17-22).') +
      pretty(ctx.parseA.fields.map(function(f){
        return { slNo: f.slNo, label: f.label, postName: f.postName, control: f.control, constant: !!f.constant, isNote: !!f.isNote };
      }));
  }

  function genDetailsJs(ctx){
    return header('reg_details.js', 'Shown below: Phase 3 resolved enabledWhen/constraint structures that will drive the jQuery handlers.') +
      pretty(ctx.resolve.resolved) + '\n\n' +
      'popupText (both alert() sites use this string verbatim):\n' + pretty(ctx.resolve.popupText);
  }

  function genValidations(ctx){
    return header('reg_validations.php', 'Shown below: Phase 3 exclusion groups (dynamic $exclgrpN / $exclcntN, PRD §8) as currently edited in the review panel.') +
      pretty(ctx.exclusionGroups);
  }

  function genSubmit(ctx){
    return header('reg_submit.php', 'Shown below: resolved structures for optscribe / $Scribe_flg-relevant fields.') +
      pretty(ctx.resolve.resolved);
  }

  App.GEN = {
    config: genConfig,
    detailsPhp: genDetailsPhp,
    detailsJs: genDetailsJs,
    validations: genValidations,
    submit: genSubmit
  };

})(window.App = window.App || {});
