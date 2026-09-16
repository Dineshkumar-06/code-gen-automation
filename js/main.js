/* Disability Code Generator — module: main.js
   Bootstrap. Loads last; wires the theme, the stepper, the tab strip and the
   static action-bar hints once the DOM is ready. */
(function(App){

  function setHint(id, text){
    var el = document.getElementById(id);
    if (el) el.innerHTML = App.ICON.info + '<span>' + text + '</span>';
  }

  // Nothing here is persisted anywhere (no localStorage/server for the
  // pasted data itself — only the theme choice is). A reload, tab close, or
  // stray Cmd/Ctrl+R silently discards a parsed paste plus any resolved-
  // conditions/exclusion-group edits, so once a parse has actually produced
  // fields the browser's own "leave site?" confirmation is armed to guard
  // against that. Checked live at unload time (App.S.fields, not a snapshot
  // taken when the listener was attached), so it also disarms itself if the
  // user clears the pastes and re-parses down to nothing.
  function confirmUnloadIfParsed(e){
    if (!App.S.fields || !App.S.fields.length) return undefined;
    e.preventDefault();
    e.returnValue = '';   // required for the dialog to fire; browsers ignore the text itself
    return '';
  }

  document.addEventListener('DOMContentLoaded', function(){
    var mark = document.getElementById('brand-mark');
    if (mark) mark.innerHTML = App.ICON.logo;

    App.NAV.initTheme();
    App.NAV.buildSteps();
    App.buildTabStrip();
    App.populateSamplePicker();
    App.renderExcelView('');
    window.addEventListener('beforeunload', confirmUnloadIfParsed);

    // ignoreUnescapedHTML: generated PHP/JS is full of "<"/">" that would
    // otherwise trip hljs's "looks like it might already be HTML" warning —
    // it's always plain text here (see setCode() in ui.js), never markup.
    try { if (typeof hljs !== 'undefined') hljs.configure({ ignoreUnescapedHTML: true }); } catch (e) {}

    setHint('s2-hint', 'Edits survive until you re-parse.');
  });

})(window.App = window.App || {});
