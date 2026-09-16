/* Disability Code Generator — module: ui/nav.js
   Step navigation, the stepper strip, the theme toggle, and the shared inline
   SVG icon set. DOM-touching, so it lives under js/ui/ alongside ui.js and is
   never loaded by test/harness.js.

   Split into three pages because one page carrying two pastes, an Excel view,
   three review panels and eleven code tabs is more than anyone can scan. The
   page/step vocabulary deliberately matches the sibling
   eligibility_code_generator tool (goStep(n), .steps/.step-item/.action-bar,
   "Configure & Review" / "Generate & Export"), so the two tools navigate
   identically. Two deliberate differences from that tool, both additive:
   already-visited steps are clickable in the stepper (it is buttons-only
   there), and forward navigation is gated on an actual parse having produced
   fields rather than only on a disabled Next button.

   Two separate gates, because they answer different questions: `unlocked` is
   whether a step has anything to show at all (a parse produced fields), and
   `visited` is whether the developer has actually opened it. The stepper
   needs both — it is a way back to pages already seen, not a shortcut past
   the step you are on. State lives here rather than being read back off the
   DOM, so gating is decided in one place. */
(function(App){

  // 24x24, stroke-based, stroke-width 2, round caps — one visual family.
  // SVG, never emoji: emoji render differently per platform/font and can't be
  // driven by the theme's currentColor.
  var ICON = {
    logo:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>',
    sun:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path></svg>',
    moon:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>',
    check:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    copy:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
    download:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
    archive:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="5" rx="1"></rect><path d="M4 9v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9"></path><line x1="10" y1="13" x2="14" y2="13"></line></svg>',
    file:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>',
    alert:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    ok:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    caret:     '<svg class="caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>',
    arrowLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>',
    arrowRight:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>',
    play:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg>',
    info:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
  };

  var STEPS = [
    { n: 1, label: 'Paste & Parse',      hint: 'Input A + Input B' },
    { n: 2, label: 'Configure & Review', hint: 'Resolved logic, live preview' },
    { n: 3, label: 'Generate & Export',  hint: 'Copy or download files' }
  ];

  var current = 1;
  var unlocked = 1;              // furthest step a successful parse allows
  var visited = { 1: true };     // steps actually opened — what the stepper offers

  // ── stepper ──
  function buildSteps(){
    var box = document.getElementById('steps');
    if (!box) return;
    box.innerHTML = '';
    STEPS.forEach(function(s, i){
      if (i) {
        var sep = document.createElement('span');
        sep.className = 'step-sep';
        sep.setAttribute('aria-hidden', 'true');
        sep.textContent = '›';
        box.appendChild(sep);
      }
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'step-item';
      item.id = 'si-' + s.n;
      item.innerHTML = '<span class="step-num" id="sn-' + s.n + '">' + s.n + '</span>' +
        '<span class="step-text"><span class="step-label">' + s.label + '</span>' +
        '<span class="step-hint">' + s.hint + '</span></span>';
      item.onclick = function(){ goStep(s.n); };
      box.appendChild(item);
    });
    paintSteps();
  }

  function paintSteps(){
    STEPS.forEach(function(s){
      var item = document.getElementById('si-' + s.n);
      var num = document.getElementById('sn-' + s.n);
      var page = document.getElementById('step-' + s.n);
      if (!item || !page) return;

      var isCurrent = (s.n === current);
      var isDone = (s.n < current);
      page.classList.toggle('on', isCurrent);
      item.classList.toggle('active', isCurrent);
      item.classList.toggle('done', isDone);
      // The stepper only goes back to pages already seen; moving FORWARD is
      // the action bar's job, so a step you have never opened is not a
      // shortcut you can take.
      item.disabled = s.n > unlocked || !visited[s.n];
      item.setAttribute('aria-current', isCurrent ? 'step' : 'false');
      // A done step shows a tick instead of its number — the only place the
      // number is replaced, so "where am I" stays readable at a glance.
      num.innerHTML = isDone ? ICON.check : String(s.n);
    });
  }

  function goStep(n){
    if (n < 1 || n > STEPS.length) return;
    if (n > unlocked) return;              // gated: nothing to show yet
    current = n;
    visited[n] = true;
    paintSteps();
    if (n === 3 && App.renderFileManifest) App.renderFileManifest();
    window.scrollTo(0, 0);
  }

  // Called by ui.js after every parse: `ok` is whether the parse actually
  // produced fields. A failed/empty parse must not unlock the later steps.
  function setParsed(ok){
    unlocked = ok ? STEPS.length : 1;
    if (!ok) {
      visited = { 1: true };
      current = 1;
    }
    paintSteps();
  }

  function currentStep(){ return current; }

  // ── theme ──
  var THEME_KEY = 'dscg-theme';

  function stored(){
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }

  function applyTheme(theme){
    theme = (theme === 'light') ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    var btn = document.getElementById('theme-toggle');
    if (btn) {
      // The icon shows the theme you would switch TO, which is the convention
      // the sibling tool uses too.
      btn.innerHTML = (theme === 'dark') ? ICON.sun : ICON.moon;
      var next = (theme === 'dark') ? 'light' : 'dark';
      btn.setAttribute('aria-label', 'Switch to ' + next + ' theme');
      btn.setAttribute('title', 'Switch to ' + next + ' theme');
    }
    // highlight.js ships one stylesheet per theme rather than reacting to
    // CSS variables, so it needs the same manual swap the sibling tool does.
    var hDark = document.getElementById('hljs-dark');
    var hLight = document.getElementById('hljs-light');
    if (hDark) hDark.disabled = (theme !== 'dark');
    if (hLight) hLight.disabled = (theme !== 'light');
  }

  function toggleTheme(){
    var now = document.documentElement.getAttribute('data-theme');
    applyTheme(now === 'dark' ? 'light' : 'dark');
  }

  function initTheme(){
    // index.html's anti-FOUC script has normally already stamped the
    // attribute; this only has to re-derive it when that didn't happen.
    var t = document.documentElement.getAttribute('data-theme') || stored();
    if (!t) {
      t = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
    }
    applyTheme(t);
  }

  App.ICON = ICON;
  App.NAV = {
    buildSteps: buildSteps,
    goStep: goStep,
    setParsed: setParsed,
    currentStep: currentStep,
    initTheme: initTheme,
    toggleTheme: toggleTheme
  };
  window.goStep = goStep;
  window.toggleTheme = toggleTheme;

})(window.App = window.App || {});
