/* Disability Code Generator — module: ui/ui.js
   Rendering, tabs, copy, exclusion review panel.
   The only module that touches the DOM. */
(function(App){
  var S = App.S;
  var escH = App.escH;
  var escA = App.escA;

  // lang drives both the hljs grammar (language-<lang> class) and which
  // highlight.js language file index.html needs to load — this tool only
  // ever emits these three, see vendor/highlightjs/languages/.
  //
  // `sets` lists the layouts a file belongs to; omitted means both. The two
  // layouts differ only in their companion AJAX endpoints, because the
  // cascade they serve is genuinely different: Set 1 repopulates one type
  // dropdown from the chosen category, Set 2 feeds a sub-type dropdown and a
  // multi-select from two different maps. Emitting the other layout's
  // endpoint would hand the developer a file nothing in their output calls.
  var TABS = [
    { key: 'config',      title: 'config.php',         deferred: false, lang: 'php' },
    { key: 'detailsPhp',  title: 'reg_details.php',     deferred: false, lang: 'php-template' },
    { key: 'detailsJs',   title: 'reg_details.js',      deferred: false, lang: 'javascript' },
    { key: 'validations', title: 'reg_validations.php', deferred: false, lang: 'php' },
    { key: 'submit',      title: 'reg_submit.php',      deferred: false, lang: 'php' },
    { key: 'ajaxPhp',     title: 'ajax_getdisability_type.php', deferred: false, lang: 'php', sets: [1] },
    { key: 'ajaxSubType', title: 'ajax_getSubType_disability.php', deferred: false, lang: 'php', sets: [2] },
    { key: 'ajaxSubTypeMultiple', title: 'ajax_getSubType_Multiple_disability.php', deferred: false, lang: 'php', sets: [2] },
    { key: 'functionsPhp',title: 'functions.php',       deferred: false, lang: 'php' },
    { key: 'qryArrays',   title: 'reg_qry_arrays.php',  deferred: false, lang: 'php' },
    { key: 'print',       title: 'print.php',           deferred: false, lang: 'php-template' },
    { key: 'queries',     title: 'disability_queries',  deferred: false, lang: 'sql' },
    { key: 'lang',        title: 'reg_details_lang.php',deferred: false, lang: 'php' }
  ];

  // Which layout's files are on show. Set by regenerate() from the parse;
  // defaults to Set 1 so the empty boot state looks like it always has.
  function currentSet(){ return S.layoutSet === 2 ? 2 : 1; }
  function inCurrentSet(t){ return !t.sets || t.sets.indexOf(currentSet()) !== -1; }
  function activeTabs(){ return TABS.filter(function(t){ return !t.deferred && inCurrentSet(t); }); }

  // A tab for the other layout is hidden, not removed — the panels stay in
  // the DOM so switching layouts costs no rebuild. If the open tab is the one
  // being hidden, focus falls back to the first visible one.
  function applyTabVisibility(){
    var openStillVisible = false, first = null;
    TABS.forEach(function(t){
      var tab = document.getElementById('tab-' + t.key);
      var panel = document.getElementById('pv-' + t.key);
      if (!tab || !panel) return;
      var show = inCurrentSet(t);
      tab.hidden = !show;
      if (!show) { panel.classList.add('hidden'); return; }
      if (!first) first = t.key;
      if (tab.classList.contains('on')) openStillVisible = true;
    });
    if (!openStillVisible && first) switchTab(first);
  }

  function buildTabStrip(){
    var strip = document.getElementById('tabs');
    var panels = document.getElementById('panels');
    strip.innerHTML = '';
    panels.innerHTML = '';
    TABS.forEach(function(t, i){
      var tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'tab' + (i === 0 ? ' on' : '') + (t.deferred ? ' deferred' : '');
      tab.id = 'tab-' + t.key;
      tab.textContent = t.title + (t.deferred ? ' (deferred)' : '');
      if (t.deferred) tab.disabled = true;
      else tab.onclick = function(){ switchTab(t.key); };
      strip.appendChild(tab);

      var panel = document.createElement('div');
      panel.className = 'code-panel' + (i === 0 ? '' : ' hidden');
      panel.id = 'pv-' + t.key;
      // Preview carries Copy only — download lives on step 3, which owns
      // delivery (per-file cards + the zip).
      panel.innerHTML = t.deferred
        ? '<div class="cp-body"><pre>// ' + t.title + ' — reference not yet supplied (PRD §10 open item).</pre></div>'
        : '<div class="cp-hdr"><span class="cp-title">' + t.title + '</span>' +
          '<div class="cp-acts"><button class="btn btn-s" onclick="copyCode(\'' + t.key + '\',this)">' +
          App.ICON.copy + 'Copy</button></div></div>' +
          '<div class="cp-body"><pre><code id="code-' + t.key + '" class="language-' + t.lang + '"></code></pre></div>';
      panels.appendChild(panel);
    });
  }

  function switchTab(key){
    TABS.forEach(function(t){
      if (t.deferred) return;
      document.getElementById('tab-' + t.key).classList.toggle('on', t.key === key);
      document.getElementById('pv-' + t.key).classList.toggle('hidden', t.key !== key);
    });
  }

  // Sets a <code id> element's text and re-highlights it via highlight.js
  // (vendored locally, vendor/highlightjs/ — see index.html). textContent,
  // never innerHTML: the generated code is arbitrary PHP/JS/SQL and must
  // never be interpreted as markup. hljs.highlightElement reads the element's
  // own text and existing language-* class, so nothing here needs to know
  // which of the two themes is active. Guarded with typeof/try so a blocked
  // or missing script degrades to plain unhighlighted text, not a crash.
  function setCode(id, code){
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = code || '';
    delete el.dataset.highlighted;
    try { if (typeof hljs !== 'undefined') hljs.highlightElement(el); } catch (e) {}
  }

  function copyCode(key, btn){
    var code = S.generated[key] || '';
    var ta = document.createElement('textarea');
    ta.value = code;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    flashButton(btn, 'Copied!');
  }

  // ── file download (single file + whole-project zip) ──
  // A real <a download> click, not window.open — works from file:// same as
  // the copy button's execCommand pattern above, no server/upload involved.
  function downloadBlob(blob, filename){
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  }

  // innerHTML, not textContent: every button here carries an inline SVG that
  // textContent would silently eat.
  function flashButton(btn, label){
    if (!btn) return;
    var orig = btn.innerHTML;
    btn.innerHTML = App.ICON.check + label;
    setTimeout(function(){ btn.innerHTML = orig; }, 1500);
  }

  // Tab title doubles as the real output filename everywhere else in this
  // codebase (ajax_getdisability_type.php, functions.php, etc. — see
  // buildTabStrip()), so it's the filename here too, not a re-derivation.
  function downloadCode(key, btn){
    var tab = TABS.filter(function(t){ return t.key === key; })[0];
    if (!tab) return;
    var code = S.generated[key] || '';
    downloadBlob(new Blob([code], { type: 'text/plain' }), tab.title);
    flashButton(btn, 'Downloaded!');
  }

  function downloadAllZip(btn){
    var files = activeTabs()
      .map(function(t){ return { name: t.title, content: S.generated[t.key] || '' }; });
    var bytes = App.buildZip(files);
    downloadBlob(new Blob([bytes], { type: 'application/zip' }), 'disability-section-generated.zip');
    flashButton(btn, 'Downloaded!');
  }

  // ── step 3: the file manifest ──
  // Rendered lazily when the step is entered (App.NAV.goStep) rather than on
  // every regenerate(), since nothing on step 3 is editable.
  function fmtSize(chars){
    return (chars >= 1024) ? (chars / 1024).toFixed(1) + ' KB' : chars + ' B';
  }

  function statTile(value, label, cls){
    return '<div class="stat"><span class="stat-v' + (cls ? ' ' + cls : '') + '">' + value +
      '</span><span class="stat-k">' + label + '</span></div>';
  }

  function renderFileManifest(){
    var grid = document.getElementById('file-grid');
    var stats = document.getElementById('export-stats');
    if (!grid) return;

    var files = activeTabs();
    var totalChars = 0, totalLines = 0;

    grid.innerHTML = '';
    files.forEach(function(t){
      var code = S.generated[t.key] || '';
      var lines = code ? code.split('\n').length : 0;
      totalChars += code.length;
      totalLines += lines;

      var card = document.createElement('div');
      card.className = 'file-card';
      card.innerHTML =
        '<div class="file-main"><span class="file-ico">' + App.ICON.file + '</span>' +
        '<span class="file-meta"><span class="file-name">' + escH(t.title) + '</span>' +
        '<span class="file-size">' + lines + ' lines · ' + fmtSize(code.length) + '</span></span></div>' +
        '<div class="file-acts">' +
        '<button class="btn btn-s" onclick="copyCode(\'' + t.key + '\',this)">' + App.ICON.copy + 'Copy</button>' +
        '<button class="btn btn-s" onclick="downloadCode(\'' + t.key + '\',this)">' + App.ICON.download + 'Download</button>' +
        '</div>';
      grid.appendChild(card);
    });

    if (stats) {
      stats.innerHTML =
        statTile(files.length, 'Files') +
        statTile(totalLines, 'Lines') +
        statTile(fmtSize(totalChars), 'Total size') +
        statTile(S.warnings.length, 'Warnings', S.warnings.length ? 'warn' : '');
    }
  }

  // ── Input A excel view ──
  // Real SOW pastes have quoted, embedded-newline Validations cells (see
  // js/parsing/tsv.js) that are unreadable as raw tab-separated text in a
  // textarea. This renders the same App.parseTSV() output the actual parser
  // consumes, so what's shown here is exactly what Phase 2 will see —
  // including ragged rows, which get flagged rather than silently misaligned.
  var INPUT_A_HEADERS = ['Sl No.', 'Label Name', 'Type', 'Max Length', 'Mandatory ?', 'Input Method', 'Values', 'Default Value', 'Validations', 'Help Text', 'Addl Remarks'];

  // Rendered into every element carrying .excel-view-mount / .excel-view-summary-text
  // — step 1 keeps its own copy (expanded by default, tied to the paste), and
  // step 2 carries a second, collapsed-by-default copy so a developer
  // reviewing/editing resolved conditions can check the original SOW text
  // without leaving the page they're editing on. One render call keeps both
  // in sync; nothing here assumes there's only one.
  function renderExcelView(rawText){
    var boxes = document.querySelectorAll('.excel-view-mount');
    var summaries = document.querySelectorAll('.excel-view-summary-text');
    var rows = App.parseTSV(rawText || '');

    if (!rows.length) {
      boxes.forEach(function(box){ box.innerHTML = '<div class="alert alert-warn" style="margin:10px">Nothing pasted yet.</div>'; });
      summaries.forEach(function(s){ s.textContent = ''; });
      return;
    }

    var maxCols = INPUT_A_HEADERS.length;
    for (var r = 0; r < rows.length; r++) if (rows[r].length > maxCols) maxCols = rows[r].length;

    // A real paste often omits trailing empty columns UNIFORMLY (BPCL's rows
    // are all 9 cells, never the full 11 — the parser pads short rows with
    // '' for exactly this reason, see inputA.js COLS mapping). So "differs
    // from 11" is the wrong mismatch signal — it would flag every row of a
    // perfectly normal paste. "Differs from what most OTHER rows in this
    // same paste have" is the actual anomaly worth a highlight.
    var lenCounts = {};
    for (var lc = 0; lc < rows.length; lc++) lenCounts[rows[lc].length] = (lenCounts[rows[lc].length] || 0) + 1;
    var modeLen = rows[0].length, modeCount = 0;
    for (var lenKey in lenCounts) if (lenCounts[lenKey] > modeCount) { modeCount = lenCounts[lenKey]; modeLen = Number(lenKey); }

    var html = '<table class="excel-table"><thead><tr><th>#</th>';
    for (var c = 0; c < maxCols; c++) html += '<th>' + escH(INPUT_A_HEADERS[c] || ('Col ' + (c + 1))) + '</th>';
    html += '</tr></thead><tbody>';

    var mismatchCount = 0;
    rows.forEach(function(row, ri){
      var mismatch = row.length !== modeLen;
      if (mismatch) mismatchCount++;
      html += '<tr' + (mismatch ? ' class="row-mismatch"' : '') + '>';
      html += '<td class="row-num">' + (ri + 1) + '</td>';
      for (var c = 0; c < maxCols; c++) html += '<td>' + escH(row[c] != null ? row[c] : '') + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
    boxes.forEach(function(box){ box.innerHTML = html; });

    var summaryText = rows.length + ' row(s), ' + modeLen + ' column(s) typical' +
      (mismatchCount ? ' — ' + mismatchCount + ' row(s) have a different column count (highlighted): check for an unquoted cell containing a tab or newline' : '');
    summaries.forEach(function(s){ s.textContent = summaryText; });
  }

  // btn is the clicked toggle itself — each panel's body/button pair is found
  // by DOM proximity, not by id, since there can be more than one instance
  // (step 1 + step 2's reference copy) and they must collapse independently.
  function toggleExcelView(btn){
    var panel = btn.closest('.panel');
    var body = panel.querySelector('.excel-view-mount');
    var hiding = !body.classList.contains('hidden');
    body.classList.toggle('hidden', hiding);
    btn.textContent = hiding ? 'Show' : 'Hide';
  }

  // The full list lives on step 2 (where the panels that fix these warnings
  // are); step 1 gets a one-line parse receipt, since a wrecked paste has to
  // be visible without leaving the page you fix it on.
  var warningsOpen = true;

  function renderWarnings(warnings){
    var box = document.getElementById('alerts-box');
    var receipt = document.getElementById('s1-status');
    var n = warnings.length;

    if (receipt) {
      // Reached only after a parse has run, so zero fields means the paste
      // yielded nothing — which has to say so, or step 1's button looks dead.
      receipt.innerHTML = !S.fields.length
        ? '<div class="alert alert-warn"><span class="alert-line">' + App.ICON.alert +
          '<span>No rows recognised — check Input A, or load a sample.</span></span></div>'
        : '<div class="alert ' + (n ? 'alert-warn' : 'alert-ok') + '"><span class="alert-line">' +
          (n ? App.ICON.alert : App.ICON.ok) + '<span>' + S.fields.length + ' row(s) parsed' +
          (n ? ' — ' + n + ' warning(s), listed on the next step.' : ' — no warnings.') +
          '</span></span></div>';
    }

    if (!box) return;
    if (!n) {
      box.innerHTML = '<div class="alert alert-ok"><span class="alert-line">' + App.ICON.ok +
        '<span>Parsed — no warnings.</span></span></div>';
      return;
    }
    box.innerHTML = '<div class="alert alert-warn">' +
      '<button class="alert-hdr" type="button" aria-expanded="' + (warningsOpen ? 'true' : 'false') +
      '" onclick="toggleWarnings(this)">' + App.ICON.alert + '<span>' + n + ' warning(s)</span>' +
      App.ICON.caret + '</button><ul' + (warningsOpen ? '' : ' class="hidden"') + '>' +
      warnings.map(function(w){ return '<li>[' + escH(w.code) + '] ' + escH(w.msg) + '</li>'; }).join('') +
      '</ul></div>';
  }

  function toggleWarnings(btn){
    warningsOpen = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', warningsOpen ? 'true' : 'false');
    var list = btn.parentNode.getElementsByTagName('ul')[0];
    if (list) list.classList.toggle('hidden', !warningsOpen);
  }

  // ── exclusion review panel ──
  var currentExclusionGroups = [];

  // Once the developer edits a group, regenerate() must stop re-deriving
  // exclusionGroups from the raw text on every render — otherwise the next
  // regenerate() call (which every edit itself triggers) would immediately
  // discard the edit.
  function markExclusionsEdited(){
    S._exclusionGroupsEdited = true;
  }

  function renderExclusionPanel(groups, allTypes){
    currentExclusionGroups = groups;
    var box = document.getElementById('excl-panel-body');
    if (!groups.length) {
      box.innerHTML = '<div class="alert alert-warn">No exclusion groups (see warnings panel).</div>';
      return;
    }
    box.innerHTML = '';
    groups.forEach(function(g, gi){
      var div = document.createElement('div');
      div.className = 'excl-group';

      var hdr = document.createElement('div');
      hdr.className = 'excl-group-hdr';
      var msgInput = document.createElement('input');
      msgInput.className = 'msg-input';
      msgInput.name = 'excl-msg-' + gi;
      msgInput.setAttribute('aria-label', 'Exclusion message for group ' + (gi + 1));
      msgInput.value = g.message;
      msgInput.oninput = function(){ g.message = msgInput.value; markExclusionsEdited(); regenerate(); };
      var removeGroupBtn = document.createElement('button');
      removeGroupBtn.className = 'btn btn-s';
      removeGroupBtn.textContent = 'Remove group';
      removeGroupBtn.onclick = function(){ currentExclusionGroups.splice(gi, 1); markExclusionsEdited(); renderExclusionPanel(currentExclusionGroups, allTypes); regenerate(); };
      hdr.appendChild(msgInput);
      hdr.appendChild(removeGroupBtn);
      div.appendChild(hdr);

      var chips = document.createElement('div');
      chips.className = 'chips';
      g.codes.forEach(function(code, ci){
        var t = allTypes.find(function(x){ return x.code === code; });
        var chip = document.createElement('span');
        chip.className = 'chip';
        chip.innerHTML = '<span>' + escH(t ? t.name : code) + ' (' + code + ')</span>';
        var x = document.createElement('button');
        x.className = 'x'; x.textContent = '×';
        x.onclick = function(){
          // `codes` is the only member list a group has — parseExclusions()
          // returns {codes, matched, message}, and the chip label here is
          // looked up from allTypes rather than stored. An earlier parallel
          // `g.names.splice(...)` threw on every PARSED group (undefined),
          // aborting the handler before markExclusionsEdited()/regenerate()
          // ran: the chip vanished from the panel but the edit never reached
          // the generated code and was discarded by the next re-render. Only
          // hand-added groups survived, because "Add group" seeded names: [].
          g.codes.splice(ci, 1);
          markExclusionsEdited();
          renderExclusionPanel(currentExclusionGroups, allTypes);
          regenerate();
        };
        chip.appendChild(x);
        chips.appendChild(chip);
      });
      div.appendChild(chips);

      var addWrap = document.createElement('div');
      addWrap.className = 'add-member';
      var select = document.createElement('select');
      select.name = 'excl-add-' + gi;
      select.setAttribute('aria-label', 'Add member to group ' + (gi + 1));
      select.innerHTML = '<option value="">+ add member</option>' +
        allTypes.filter(function(t){ return g.codes.indexOf(t.code) === -1; })
          .map(function(t){ return '<option value="' + t.code + '">' + escH(t.name) + '</option>'; }).join('');
      select.onchange = function(){
        if (!select.value) return;
        var t = allTypes.find(function(x){ return x.code === select.value; });
        g.codes.push(t.code);
        markExclusionsEdited();
        renderExclusionPanel(currentExclusionGroups, allTypes);
        regenerate();
      };
      addWrap.appendChild(select);
      div.appendChild(addWrap);

      box.appendChild(div);
    });

    var controls = document.createElement('div');
    controls.className = 'group-controls';
    var addGroupBtn = document.createElement('button');
    addGroupBtn.className = 'btn btn-s';
    addGroupBtn.textContent = 'Add group';
    addGroupBtn.onclick = function(){
      currentExclusionGroups.push({ codes: [], matched: [], message: '' });
      markExclusionsEdited();
      renderExclusionPanel(currentExclusionGroups, allTypes);
    };
    controls.appendChild(addGroupBtn);
    box.appendChild(controls);
  }

  // ── unmatched value aliases ──
  // Unlike the edit-freeze panels below, this isn't overriding derived
  // output — it's an INPUT to derivation (like the layout override select),
  // so it's always re-applied on every regenerate(), never frozen.
  function collectUnresolvedAbbrevs(warnings){
    var out = [], seen = {};
    warnings.forEach(function(w){
      if (w.code !== 'value-name-unmatched' && w.code !== 'exclusion-member-unresolved') return;
      if (!w.abbrev || seen[w.abbrev]) return;
      seen[w.abbrev] = true;
      out.push(w.abbrev);
    });
    return out;
  }

  function renderValueAliasPanel(warnings, allTypes){
    var box = document.getElementById('value-alias-panel');
    var unresolved = collectUnresolvedAbbrevs(warnings);
    var assignedKeys = Object.keys(S.manualAliases);
    if (!unresolved.length && !assignedKeys.length) { box.innerHTML = ''; box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    box.innerHTML = '';

    if (unresolved.length) {
      var hint = document.createElement('div');
      hint.className = 'panel-hint';
      hint.textContent = 'Unmatched value names. Assigning one applies it everywhere it appears.';
      box.appendChild(hint);

      unresolved.forEach(function(abbrev){
        var row = document.createElement('div');
        row.className = 'cond-row';
        var lbl = document.createElement('span');
        lbl.className = 'chip';
        lbl.innerHTML = '<span>' + escH(abbrev) + '</span>';
        row.appendChild(lbl);
        var sel = document.createElement('select');
        sel.name = 'alias-' + abbrev;
        sel.setAttribute('aria-label', 'Assign "' + abbrev + '" to a disability type');
        sel.innerHTML = '<option value="">assign to type…</option>' +
          allTypes.map(function(t){ return '<option value="' + escA(t.code) + '">' + escH(t.name) + ' (' + escA(t.code) + ')</option>'; }).join('');
        sel.onchange = function(){
          if (!sel.value) return;
          S.manualAliases[abbrev] = sel.value;
          regenerate();
        };
        row.appendChild(sel);
        box.appendChild(row);
      });
    }

    if (assignedKeys.length) {
      var chips = document.createElement('div');
      chips.className = 'chips';
      assignedKeys.forEach(function(abbrev){
        var code = S.manualAliases[abbrev];
        var t = allTypes.find(function(x){ return x.code === code; });
        var chip = document.createElement('span');
        chip.className = 'chip';
        chip.innerHTML = '<span>' + escH(abbrev) + ' → ' + escH(t ? t.name : code) + ' (' + escA(code) + ')</span>';
        var x = document.createElement('button');
        x.className = 'x'; x.textContent = '×';
        x.onclick = function(){ delete S.manualAliases[abbrev]; regenerate(); };
        chip.appendChild(x);
        chips.appendChild(chip);
      });
      box.appendChild(chips);
    }
  }

  // ── resolved conditions review panel ──
  // Same rationale as the exclusion panel above: resolveEnablement()/
  // extractShouldBeConstraint() read free-text Validations prose, which
  // varies far more across real SOWs than any single sample suggested (see
  // CLAUDE.md "Generalization pass"). This panel makes every field's
  // enable/disable condition, value constraint, and the popup text editable
  // before it reaches the generators — not just exclusion groups.
  var CONDITION_OPS = ['==', 'selected', 'in'];

  function markResolvedEdited(){ S._resolvedEdited = true; }
  function markPopupTextEdited(){ S._popupTextEdited = true; }

  // Conditions are stored on entry.enabledWhen as either a single condition
  // or {op:'or', conditions:[...]}. Editing works against a flat array
  // (entry._condList) that's lazily derived once, then kept authoritative —
  // mirroring how exclusion groups stop re-deriving from raw text once edited.
  function condListOf(entry){
    if (!entry._condList) {
      var ew = entry.enabledWhen;
      if (!ew) entry._condList = [];
      else if (ew.op === 'or') entry._condList = ew.conditions.slice();
      else entry._condList = [ew];
    }
    return entry._condList;
  }

  function syncEnabledWhen(entry){
    var list = entry._condList || [];
    if (!list.length) delete entry.enabledWhen;
    else if (list.length === 1) entry.enabledWhen = list[0];
    else entry.enabledWhen = { op: 'or', conditions: list };
  }

  function fieldOptionsHtml(allFields, selected){
    return allFields.filter(function(f){ return f.postName; }).map(function(f){
      return '<option value="' + escA(f.postName) + '"' + (f.postName === selected ? ' selected' : '') + '>' +
        escH(f.label) + ' [' + escH(f.postName) + ']</option>';
    }).join('');
  }

  function typeOptionsHtml(allTypes, exclude){
    return '<option value="">+ add value</option>' + allTypes.filter(function(t){ return exclude.indexOf(t.code) === -1; })
      .map(function(t){ return '<option value="' + escA(t.code) + '">' + escH(t.name) + '</option>'; }).join('');
  }

  // Every generated control gets a name + aria-label: these rows are built
  // from data, so there is no static <label> to point at them, and a bare
  // <select> announces as "combo box" with no indication of which field's
  // condition it edits.
  function nameControl(el, id, label){
    el.name = id;
    el.setAttribute('aria-label', label);
  }

  // codesFor(postName) -> [{code,name}] for that field's own dropdown. A
  // condition's codes are only meaningful against the field it targets, and
  // the lists differ per field and per layout — see core/fieldcodes.js.
  function renderCondRow(cond, allFields, codesFor, onRemove, onChange, ctx){
    var key = (ctx && ctx.key) || 'field';
    var pos = (ctx && ctx.pos) || 1;
    var suffix = ' for ' + key + ', condition ' + pos;
    var idBase = 'cond-' + key + '-' + pos;

    var row = document.createElement('div');
    row.className = 'cond-row';

    var fieldSel = document.createElement('select');
    fieldSel.className = 'field-select';
    fieldSel.innerHTML = fieldOptionsHtml(allFields, cond.field);
    fieldSel.onchange = function(){ cond.field = fieldSel.value; onChange(); };
    nameControl(fieldSel, idBase + '-field', 'Target field' + suffix);
    row.appendChild(fieldSel);

    var opSel = document.createElement('select');
    opSel.innerHTML = CONDITION_OPS.map(function(o){ return '<option value="' + o + '"' + (o === cond.op ? ' selected' : '') + '>' + o + '</option>'; }).join('');
    nameControl(opSel, idBase + '-op', 'Operator' + suffix);
    opSel.onchange = function(){
      cond.op = opSel.value;
      delete cond.value; delete cond.codes;
      if (cond.op === '==') cond.value = 'Y';
      if (cond.op === 'in') cond.codes = [];
      onChange();
    };
    row.appendChild(opSel);

    if (cond.op === '==') {
      var valSel = document.createElement('select');
      valSel.className = 'val-input';
      valSel.innerHTML = ['Y', 'N'].map(function(v){ return '<option value="' + v + '"' + (v === cond.value ? ' selected' : '') + '>' + v + '</option>'; }).join('');
      valSel.onchange = function(){ cond.value = valSel.value; onChange(); };
      nameControl(valSel, idBase + '-value', 'Expected value' + suffix);
      row.appendChild(valSel);
    } else if (cond.op === 'in') {
      var opts = codesFor(cond.field);
      var chips = document.createElement('span');
      chips.className = 'chips';
      (cond.codes || []).forEach(function(code, ci){
        var t = opts.find(function(x){ return x.code === code; });
        var chip = document.createElement('span');
        chip.className = 'chip';
        chip.innerHTML = '<span>' + escH(t ? t.name : code) + ' (' + escH(code) + ')</span>';
        var x = document.createElement('button');
        x.className = 'x'; x.textContent = '×';
        x.onclick = function(){ cond.codes.splice(ci, 1); onChange(); };
        chip.appendChild(x);
        chips.appendChild(chip);
      });
      row.appendChild(chips);

      var addSel = document.createElement('select');
      addSel.innerHTML = typeOptionsHtml(opts, cond.codes || []);
      addSel.onchange = function(){
        if (!addSel.value) return;
        cond.codes = cond.codes || [];
        cond.codes.push(addSel.value);
        onChange();
      };
      nameControl(addSel, idBase + '-add', 'Add a value' + suffix);
      row.appendChild(addSel);
    }

    var rm = document.createElement('button');
    rm.className = 'btn btn-s'; rm.textContent = 'Remove';
    rm.setAttribute('aria-label', 'Remove condition ' + pos + ' for ' + key);
    rm.onclick = onRemove;
    row.appendChild(rm);

    return row;
  }

  function renderConstraintRow(entry, allFields, codesFor, onChange){
    var wrap = document.createElement('div');
    wrap.className = 'constraint-row';
    var c = entry.constraint;
    if (!c) {
      var addBtn = document.createElement('button');
      addBtn.className = 'btn btn-s'; addBtn.textContent = 'Add value constraint';
      addBtn.onclick = function(){
        var whenField = (allFields.filter(function(f){ return f.postName; })[0] || {}).postName;
        entry.constraint = { whenField: whenField, op: 'includes', code: (codesFor(whenField)[0] || {}).code, shouldBe: 'Y' };
        markResolvedEdited(); onChange();
      };
      wrap.appendChild(addBtn);
      return wrap;
    }

    var lbl1 = document.createElement('span'); lbl1.className = 'lbl'; lbl1.textContent = 'this field should be Y when';
    wrap.appendChild(lbl1);

    var ckey = entry.postName || 'field';
    var whenSel = document.createElement('select');
    whenSel.className = 'field-select';
    whenSel.innerHTML = fieldOptionsHtml(allFields, c.whenField);
    whenSel.onchange = function(){
      c.whenField = whenSel.value;
      // Each field has its own option list, so the previously chosen code may
      // not exist in the new one — leaving it would show the dropdown's first
      // entry while the data still held the old code.
      var opts = codesFor(c.whenField);
      if (!opts.some(function(o){ return o.code === c.code; })) c.code = (opts[0] || {}).code;
      markResolvedEdited(); onChange();
    };
    nameControl(whenSel, 'constraint-' + ckey + '-field', 'Value constraint: source field for ' + ckey);
    wrap.appendChild(whenSel);

    var lbl2 = document.createElement('span'); lbl2.className = 'lbl'; lbl2.textContent = 'includes';
    wrap.appendChild(lbl2);

    var codeSel = document.createElement('select');
    codeSel.innerHTML = codesFor(c.whenField).map(function(t){ return '<option value="' + escA(t.code) + '"' + (t.code === c.code ? ' selected' : '') + '>' + escH(t.name) + '</option>'; }).join('');
    codeSel.onchange = function(){ c.code = codeSel.value; markResolvedEdited(); onChange(); };
    nameControl(codeSel, 'constraint-' + ckey + '-code', 'Value constraint: value for ' + ckey);
    wrap.appendChild(codeSel);

    var rmBtn = document.createElement('button');
    rmBtn.className = 'btn btn-s'; rmBtn.textContent = 'Remove constraint';
    rmBtn.onclick = function(){ delete entry.constraint; markResolvedEdited(); onChange(); };
    wrap.appendChild(rmBtn);

    return wrap;
  }

  function renderResolvedPanel(resolved, allFields, codesFor){
    var body = document.getElementById('resolved-panel-body');
    body.innerHTML = '';

    var keys = Object.keys(resolved);
    if (!keys.length) {
      body.innerHTML = '<div class="alert alert-warn">No resolved conditions (see warnings panel).</div>';
    }

    keys.forEach(function(postName){
      var entry = resolved[postName];
      var card = document.createElement('div');
      card.className = 'resolved-card';

      var hdr = document.createElement('div');
      hdr.className = 'resolved-hdr';
      var f = allFields.filter(function(x){ return x.postName === postName; })[0];
      hdr.innerHTML = '<span class="rf-name">' + escH(f ? f.label : postName) +
        ' <span class="muted">[' + escH(postName) + (f ? ', row ' + escH(f.slNo) : '') + ']</span></span>';
      var rmField = document.createElement('button');
      rmField.className = 'btn btn-s'; rmField.textContent = 'Remove override';
      rmField.onclick = function(){ delete resolved[postName]; markResolvedEdited(); renderResolvedPanel(resolved, allFields, codesFor); regenerate(); };
      hdr.appendChild(rmField);
      card.appendChild(hdr);

      var list = condListOf(entry);
      var rerender = function(){ renderResolvedPanel(resolved, allFields, codesFor); regenerate(); };
      list.forEach(function(cond, ci){
        card.appendChild(renderCondRow(cond, allFields, codesFor, function(){
          list.splice(ci, 1); syncEnabledWhen(entry); markResolvedEdited(); rerender();
        }, function(){ syncEnabledWhen(entry); markResolvedEdited(); rerender(); },
        { key: postName, pos: ci + 1 }));
      });

      var condControls = document.createElement('div');
      condControls.className = 'cond-controls';
      var addCondBtn = document.createElement('button');
      addCondBtn.className = 'btn btn-s'; addCondBtn.textContent = 'Add condition (OR)';
      addCondBtn.onclick = function(){
        list.push({ field: (allFields.filter(function(x){ return x.postName; })[0] || {}).postName, op: '==', value: 'Y' });
        syncEnabledWhen(entry); markResolvedEdited(); rerender();
      };
      condControls.appendChild(addCondBtn);
      card.appendChild(condControls);

      card.appendChild(renderConstraintRow(entry, allFields, codesFor, rerender));

      body.appendChild(card);
    });

    var addRow = document.getElementById('resolved-add-row');
    addRow.innerHTML = '';
    var addLabel = document.createElement('span');
    addLabel.className = 'lbl';
    addLabel.textContent = 'Add override for field:';
    addRow.appendChild(addLabel);
    var addSel = document.createElement('select');
    addSel.className = 'field-select';
    nameControl(addSel, 'add-override', 'Add a condition override for a field');
    addSel.innerHTML = '<option value="">choose field…</option>' + allFields
      .filter(function(f){ return f.postName && !f.isNote && !f.constant && !resolved[f.postName]; })
      .map(function(f){ return '<option value="' + escA(f.postName) + '">' + escH(f.label) + ' [' + escH(f.postName) + ']</option>'; }).join('');
    addSel.onchange = function(){
      if (!addSel.value) return;
      var f = allFields.filter(function(x){ return x.postName === addSel.value; })[0];
      resolved[addSel.value] = { postName: addSel.value, slNo: f ? f.slNo : null, mandatory: 'conditional' };
      markResolvedEdited();
      renderResolvedPanel(resolved, allFields, codesFor);
      regenerate();
    };
    addRow.appendChild(addSel);
  }

  function renderPopupTextRow(popupText){
    var row = document.getElementById('popup-text-row');
    row.innerHTML = '';
    var label = document.createElement('label');
    label.setAttribute('for', 'popup-text-input');
    label.textContent = 'Popup text (alert()):';
    row.appendChild(label);
    var input = document.createElement('input');
    input.id = 'popup-text-input';
    input.value = popupText || '';
    input.placeholder = '(none found — see warnings)';
    input.oninput = function(){ S.popupText = input.value; markPopupTextEdited(); };
    input.onchange = function(){ regenerate(); };
    row.appendChild(input);
  }

  // ── main pipeline ──
  function regenerate(){
    var parseA = S._lastParseA, parseB = S._lastParseB;
    if (!parseA || !parseB) return;

    var resolve = App.resolveAll(parseA, parseB, S.manualAliases);
    if (!S._resolvedEdited) S.resolved = resolve.resolved;
    if (!S._popupTextEdited) S.popupText = resolve.popupText;
    resolve.resolved = S.resolved;
    resolve.popupText = S.popupText;
    S.warnings = resolve.warnings.slice();

    // Whichever row IS the multi-select carries the exclusion rule: Type of
    // Disability in Set 1, Sub-Type of Multiple Disability in Set 2.
    var exclSource = App.exclusionSourceField(parseA);
    if (!S._exclusionGroupsEdited) {
      S.exclusionGroups = App.parseExclusions(exclSource ? exclSource.validations : '', resolve.typeIndex, S.warnings);
    }

    S.layoutSet = parseA.isSet2 ? 2 : 1;
    var ctx = { parseA: parseA, parseB: parseB, resolve: resolve,
                exclusionGroups: S.exclusionGroups, set2: resolve.set2 || null };
    S.generated.config = App.GEN.config(ctx);
    S.generated.detailsPhp = App.GEN.detailsPhp(ctx);
    S.generated.detailsJs = App.GEN.detailsJs(ctx);
    S.generated.validations = App.GEN.validations(ctx);
    S.generated.submit = App.GEN.submit(ctx);
    S.generated.qryArrays = App.GEN.qryArrays(ctx);
    S.generated.lang = App.GEN.lang(ctx);
    S.generated.queries = App.GEN.queries(ctx);
    S.generated.print = App.GEN.print(ctx);
    S.generated.functionsPhp = App.GEN.functionsPhp(ctx);
    if (S.layoutSet === 2) {
      S.generated.ajaxSubType = App.GEN.ajaxSubType();
      S.generated.ajaxSubTypeMultiple = App.GEN.ajaxSubTypeMultiple();
    } else {
      S.generated.ajaxPhp = App.GEN.ajaxPhp();
    }

    applyTabVisibility();
    // The two layouts don't ship the same number of files (Set 2 has two
    // companion AJAX endpoints where Set 1 has one), so the header badge
    // follows the active layout rather than naming a fixed count.
    var badge = document.getElementById('file-count');
    if (badge) badge.textContent = activeTabs().length + ' files';
    TABS.forEach(function(t){ setCode('code-' + t.key, S.generated[t.key]); });

    // Each dropdown offers its own values, and which list a field holds
    // differs per layout — Set 2's disability_type asks for the CATEGORY
    // where Set 1's asks for the type. See core/fieldcodes.js.
    var codesFor = function(postName){
      return App.codeListForField(postName, parseA, parseB, resolve.set2);
    };

    renderWarnings(S.warnings);
    renderValueAliasPanel(S.warnings, parseB.types);
    renderPopupTextRow(S.popupText);
    renderResolvedPanel(S.resolved, parseA.fields, codesFor);
    // Every exclusion group constrains the one row that IS the multi-select,
    // so its members come from that field's own option list.
    renderExclusionPanel(S.exclusionGroups,
      exclSource ? codesFor(exclSource.postName) : parseB.types);
  }

  function generate(){
    App.resetState();
    S._exclusionGroupsEdited = false;
    S._resolvedEdited = false;
    S._popupTextEdited = false;
    S.rawInputA = document.getElementById('input-a').value;
    S.rawInputB = document.getElementById('input-b').value;
    renderExcelView(S.rawInputA);

    var layoutOverride = document.getElementById('layout-override').value || null;
    var parseA = App.parseInputA(S.rawInputA, layoutOverride);
    var parseB = App.parseInputB(S.rawInputB);
    S._lastLayoutOverride = layoutOverride;
    S._lastParseA = parseA;
    S._lastParseB = parseB;
    S.fields = parseA.fields;
    S.noteText = parseA.noteText;
    S.categories = parseB.categories;
    S.types = parseB.types;
    S.mapping = parseB.mapping;

    regenerate();

    // Steps 2 and 3 stay locked until a parse actually produced fields —
    // an empty paste has nothing to configure or export.
    var ok = !!(parseA.fields && parseA.fields.length);
    if (App.NAV) App.NAV.setParsed(ok);
    return ok;
  }

  // Step 1's single forward action. A separate "Parse" button was a second
  // click for the same intent, but re-parsing unconditionally would discard
  // step 2's edits every time you stepped back here — so an unchanged paste
  // just navigates, and only a changed one re-parses.
  function parseAndReview(){
    var a = document.getElementById('input-a').value;
    var b = document.getElementById('input-b').value;
    var layout = document.getElementById('layout-override').value || null;
    var stale = !S._lastParseA || a !== S.rawInputA || b !== S.rawInputB ||
                layout !== S._lastLayoutOverride;
    var ok = stale ? generate() : !!(S.fields && S.fields.length);
    if (ok) App.NAV.goStep(2);
  }

  function populateSamplePicker(){
    var sel = document.getElementById('sample-picker');
    sel.innerHTML = '<option value="">Load sample…</option>' +
      App.FIXTURES.samples.map(function(s){
        return '<option value="' + s.key + '">' + escH(s.name) + '</option>';
      }).join('');
  }

  function loadSample(key){
    if (!key) return;
    var sample = App.FIXTURES.byKey(key);
    if (!sample) return;
    S._currentSample = sample;
    document.getElementById('input-a').value = sample.inputA;
    document.getElementById('input-b').value = sample.inputB;
    document.getElementById('layout-override').value = '';
    generate();
  }

  window.generate = generate;
  window.parseAndReview = parseAndReview;
  window.loadSample = loadSample;
  window.copyCode = copyCode;
  window.downloadCode = downloadCode;
  window.downloadAllZip = downloadAllZip;
  window.toggleExcelView = toggleExcelView;
  window.toggleWarnings = toggleWarnings;
  App.buildTabStrip = buildTabStrip;
  App.populateSamplePicker = populateSamplePicker;
  App.renderExcelView = renderExcelView;
  App.renderFileManifest = renderFileManifest;

})(window.App = window.App || {});
