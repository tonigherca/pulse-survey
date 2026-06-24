/* Survey runner — vanilla JS, no dependencies.
 *
 * Reads data-* attributes from #runner for all URLs so nothing is hardcoded.
 * S.cur is always an index into S.questions (the FULL ordered array).
 * S.skipped is a Set of question IDs; navigation skips over them.
 * S.history stores full-array indices for back-navigation.
 */
(function () {
  'use strict';

  // =========================================================
  // STATE
  // =========================================================
  const S = {
    path:       null,
    responseId: null,
    cat:        null,
    questions:  [],     // flat ordered array, each q has .sectionTitle
    skipped:    new Set(),
    answers:    {},     // { qid: value } — value types vary by question type
    cur:        0,      // index into S.questions
    history:    [],     // stack of S.questions indices for back-nav
    gridRowIdx: 0,      // current row when iterating a likert_grid on mobile
    submitting: false,
  };

  // =========================================================
  // ENTRY
  // =========================================================
  document.addEventListener('DOMContentLoaded', async () => {
    wirePermanentButtons();

    const el = document.getElementById('runner');
    if (!el) return;

    S.path = el.dataset.path;

    try {
      S.cat = await fetchJSON(el.dataset.catalogueUrl);
      S.questions = buildQueue(S.cat, S.path);

      const res = await postJSON(el.dataset.startUrl, { path: S.path });
      S.responseId = res.response_id;

      showQuestion();
    } catch (e) {
      showError(e.message || 'A apărut o eroare. Vă rugăm reîncărcați pagina.');
    }
  });

  // =========================================================
  // CATALOGUE HELPERS
  // =========================================================
  function buildQueue(cat, path) {
    const qs = [];
    for (const sec of cat.paths[path].sections) {
      for (const q of sec.questions) {
        qs.push(Object.assign({}, q, { sectionTitle: sec.title }));
      }
    }
    return qs;
  }

  function getOptions(q) {
    if (q.options) return q.options;
    if (q.options_ref) return S.cat.option_sets[q.options_ref] || [];
    return [];
  }

  function getScalePoints(q) {
    return (S.cat.scales[q.scale] && S.cat.scales[q.scale].points) || [];
  }

  function getScaleLabel(q) {
    return (S.cat.scales[q.scale] && S.cat.scales[q.scale].label) || '';
  }

  function isMobileWidth() {
    return window.innerWidth < 640;
  }

  // =========================================================
  // BRANCHING
  // =========================================================
  function applyBranch() {
    for (const rule of S.cat.branch_rules || []) {
      if (rule.path !== S.path) continue;
      const ans = S.answers[rule.trigger.question];

      let fired = false;
      if ('only' in rule.trigger) {
        const vals = Array.isArray(ans) ? ans : (ans != null ? [ans] : []);
        fired = vals.length === 1 && vals[0] === rule.trigger.only;
      } else if ('equals' in rule.trigger) {
        fired = ans === rule.trigger.equals;
      }

      for (const qid of rule.skip) {
        if (fired) S.skipped.add(qid);
        else S.skipped.delete(qid);
      }
    }
  }

  // =========================================================
  // PROGRESS
  // =========================================================
  function progressInfo() {
    const q = S.questions[S.cur];
    if (!q) return null;

    const visible = S.questions.filter(function (vq) { return !S.skipped.has(vq.id); });
    const totalVis = visible.length;
    const posVis = visible.findIndex(function (vq) { return vq.id === q.id; }) + 1;

    const secVis = visible.filter(function (vq) { return vq.sectionTitle === q.sectionTitle; });
    const secPos = secVis.findIndex(function (vq) { return vq.id === q.id; }) + 1;
    const secTotal = secVis.length;

    const TIME = { single_select: 25, multi_select: 35, likert_grid: 75, ranking: 90, free_text: 120 };
    const remaining = visible.slice(posVis - 1);
    const secs = remaining.reduce(function (s, rq) { return s + (TIME[rq.type] || 30); }, 0);
    const mins = Math.max(1, Math.ceil(secs / 60));

    return { q: q, totalVis: totalVis, posVis: posVis, secPos: secPos, secTotal: secTotal, mins: mins };
  }

  // =========================================================
  // MAIN RENDER
  // =========================================================
  function showQuestion() {
    if (S.cur >= S.questions.length) {
      doSubmit();
      return;
    }

    const q = S.questions[S.cur];
    S.gridRowIdx = 0;

    const info = progressInfo();
    if (info) {
      document.getElementById('runner-section').textContent = info.q.sectionTitle;
      document.getElementById('runner-step').textContent = info.posVis + ' din ' + info.totalVis;
      const pct = Math.round((info.posVis / info.totalVis) * 100);
      const bar = document.getElementById('runner-bar');
      if (bar) {
        bar.style.width = pct + '%';
        bar.closest('[role=progressbar]').setAttribute('aria-valuenow', pct);
      }
      document.getElementById('runner-time').textContent = '~' + info.mins + ' minute rămase';
    }

    document.getElementById('question-area').innerHTML = renderQ(q);
    attachHandlers(q);
    updateNextBtn(q);

    const backBtn = document.getElementById('btn-back');
    if (backBtn) backBtn.style.visibility = S.history.length > 0 ? 'visible' : 'hidden';

    const body = document.getElementById('runner-body');
    if (body) body.scrollTop = 0;
  }

  // =========================================================
  // QUESTION RENDERER (dispatcher)
  // =========================================================
  function renderQ(q) {
    const ans = S.answers[q.id];
    let html = '<div class="q-wrap">';
    html += '<div class="q-section-tag">' + esc(q.sectionTitle) + '</div>';
    html += '<div class="q-text">' + esc(q.text) + '</div>';
    if (q.help) html += '<p class="q-help">' + esc(q.help) + '</p>';

    switch (q.type) {
      case 'single_select': html += renderSingle(q, ans); break;
      case 'multi_select':  html += renderMulti(q, ans);  break;
      case 'likert_grid':
        html += isMobileWidth() ? renderLikertMobile(q, ans) : renderLikertDesktop(q, ans);
        break;
      case 'ranking':   html += renderRanking(q, ans);   break;
      case 'free_text': html += renderFreeText(q, ans);  break;
      default: break;
    }

    html += '</div>';
    return html;
  }

  // =========================================================
  // SINGLE SELECT
  // =========================================================
  function renderSingle(q, ans) {
    const opts = getOptions(q);
    let html = '<div class="radio-list" role="radiogroup" aria-label="' + escAttr(q.text) + '">';
    for (const opt of opts) {
      const sel = ans === opt.key;
      html += '<button type="button"' +
        ' class="radio-opt' + (sel ? ' is-selected' : '') + '"' +
        ' data-qid="' + escAttr(q.id) + '"' +
        ' data-val="' + escAttr(opt.key) + '"' +
        ' role="radio"' +
        ' aria-checked="' + sel + '">' +
        '<span class="radio-opt__label">' + esc(opt.label) + '</span>' +
        '<span class="radio-opt__indicator" aria-hidden="true"></span>' +
        '</button>';
    }
    html += '</div>';
    return html;
  }

  // =========================================================
  // MULTI SELECT
  // =========================================================
  function renderMulti(q, ans) {
    const opts = getOptions(q);
    const checked = Array.isArray(ans) ? ans : [];
    const excl = q.exclusive_option || null;
    let html = '<div class="check-list" role="group" aria-label="' + escAttr(q.text) + '">';
    html += '<p class="q-helper">Selectați tot ce se aplică.</p>';
    for (const opt of opts) {
      const isChecked = checked.indexOf(opt.key) !== -1;
      html += '<button type="button"' +
        ' class="check-opt' + (isChecked ? ' is-checked' : '') + '"' +
        ' data-qid="' + escAttr(q.id) + '"' +
        ' data-val="' + escAttr(opt.key) + '"' +
        (excl && opt.key === excl ? ' data-exclusive="true"' : '') +
        ' aria-pressed="' + isChecked + '">' +
        '<span class="check-opt__box" aria-hidden="true"></span>' +
        '<span class="check-opt__label">' + esc(opt.label) + '</span>' +
        '</button>';
    }
    html += '</div>';
    return html;
  }

  // =========================================================
  // LIKERT GRID — desktop (full table)
  // =========================================================
  function renderLikertDesktop(q, ans) {
    const points = getScalePoints(q);
    const ansObj = (ans && typeof ans === 'object' && !Array.isArray(ans)) ? ans : {};
    let html = '<div class="likert-grid-wrap">';
    const scaleLabel = getScaleLabel(q);
    if (scaleLabel) html += '<p class="q-helper">' + esc(scaleLabel) + '</p>';
    html += '<div class="likert-table" role="group" aria-label="' + escAttr(q.text) + '">';

    // Header
    html += '<div class="likert-header" aria-hidden="true">';
    html += '<div class="likert-header__label"></div>';
    html += '<div class="likert-header__scale">';
    for (const pt of points) {
      html += '<span class="likert-header__pt">' + esc(pt.label) + '</span>';
    }
    html += '</div></div>';

    // Rows
    for (const row of q.rows) {
      const rowAns = ansObj[row.key];
      html += '<div class="likert-row">';
      html += '<div class="likert-row__label">' + esc(row.label) + '</div>';
      html += '<div class="likert-row__pts" role="radiogroup" aria-label="' + escAttr(row.label) + '">';
      for (const pt of points) {
        const sel = rowAns === pt.key;
        html += '<button type="button"' +
          ' class="scale-btn' + (sel ? ' is-selected' : '') + '"' +
          ' data-qid="' + escAttr(q.id) + '"' +
          ' data-row="' + escAttr(row.key) + '"' +
          ' data-val="' + escAttr(pt.key) + '"' +
          ' aria-label="' + escAttr(row.label + ': ' + pt.label) + '"' +
          ' aria-pressed="' + sel + '"' +
          '></button>';
      }
      html += '</div></div>';
    }

    html += '</div></div>';
    return html;
  }

  // =========================================================
  // LIKERT GRID — mobile (one row at a time)
  // =========================================================
  function renderLikertMobile(q, ans) {
    const points = getScalePoints(q);
    const ansObj = (ans && typeof ans === 'object' && !Array.isArray(ans)) ? ans : {};
    const row = q.rows[S.gridRowIdx];
    const rowAns = ansObj[row.key];

    let html = '<div class="likert-mobile-wrap">';
    html += '<p class="q-helper">Rândul ' + (S.gridRowIdx + 1) + ' din ' + q.rows.length + '</p>';
    html += '<div class="likert-row-label">' + esc(row.label) + '</div>';
    html += '<div class="likert-scale-cards" role="radiogroup" aria-label="' + escAttr(row.label) + '">';
    for (const pt of points) {
      const sel = rowAns === pt.key;
      html += '<button type="button"' +
        ' class="scale-card' + (sel ? ' is-selected' : '') + '"' +
        ' data-qid="' + escAttr(q.id) + '"' +
        ' data-row="' + escAttr(row.key) + '"' +
        ' data-val="' + escAttr(pt.key) + '"' +
        ' aria-pressed="' + sel + '"' +
        '>' + esc(pt.label) + '</button>';
    }
    html += '</div></div>';
    return html;
  }

  // =========================================================
  // RANKING
  // =========================================================
  function renderRanking(q, ans) {
    const opts = q.options || [];
    const defaultOrder = opts.map(function (o) { return o.key; });
    const order = Array.isArray(ans) ? ans : defaultOrder;
    // Build display order (follow saved order, append any missing)
    const ordered = order
      .map(function (key) { return opts.find(function (o) { return o.key === key; }); })
      .filter(Boolean);
    for (const o of opts) {
      if (!ordered.find(function (oo) { return oo.key === o.key; })) ordered.push(o);
    }

    let html = '<div class="rank-list" id="rank-list-' + escAttr(q.id) + '" data-qid="' + escAttr(q.id) + '">';
    html += '<p class="q-helper">Trageți pentru a reordona sau folosiți butoanele ↑ ↓.</p>';
    for (let i = 0; i < ordered.length; i++) {
      const item = ordered[i];
      html += '<div class="rank-item" draggable="true" data-key="' + escAttr(item.key) + '" data-idx="' + i + '">' +
        '<span class="rank-item__num">' + (i + 1) + '</span>' +
        '<span class="rank-item__label">' + esc(item.label) + '</span>' +
        '<span class="rank-item__controls">' +
        '<button type="button" class="rank-btn rank-btn--up" aria-label="Mută mai sus"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
        '<button type="button" class="rank-btn rank-btn--down" aria-label="Mută mai jos"' + (i === ordered.length - 1 ? ' disabled' : '') + '>↓</button>' +
        '</span></div>';
    }
    html += '</div>';
    return html;
  }

  // =========================================================
  // FREE TEXT
  // =========================================================
  function renderFreeText(q, ans) {
    const max = q.max_length || 300;
    const val = typeof ans === 'string' ? ans : '';
    let html = '<div class="freetext-wrap">';
    html += '<label for="ft-' + escAttr(q.id) + '" class="sr-only">' + esc(q.text) + '</label>';
    html += '<textarea' +
      ' id="ft-' + escAttr(q.id) + '"' +
      ' class="freetext-area"' +
      ' data-qid="' + escAttr(q.id) + '"' +
      ' maxlength="' + max + '"' +
      ' rows="5"' +
      ' placeholder="Răspunsul dumneavoastră (opțional)"' +
      '>' + esc(val) + '</textarea>';
    html += '<div class="freetext-counter"><span id="ft-count-' + escAttr(q.id) + '">' + val.length + '</span> / ' + max + '</div>';
    html += '</div>';
    return html;
  }

  // =========================================================
  // EVENT HANDLERS (wired after each render)
  // =========================================================
  function attachHandlers(q) {
    const area = document.getElementById('question-area');

    // Single select
    area.querySelectorAll('.radio-opt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const val = btn.dataset.val;
        S.answers[q.id] = val;

        area.querySelectorAll('.radio-opt').forEach(function (b) {
          const sel = b.dataset.val === val;
          b.classList.toggle('is-selected', sel);
          b.setAttribute('aria-checked', sel);
        });

        applyBranch();
        saveAnswer(q.id, val);
        updateNextBtn(q);
      });
    });

    // Multi select
    area.querySelectorAll('.check-opt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const val = btn.dataset.val;
        const excl = q.exclusive_option || null;
        let current = Array.isArray(S.answers[q.id]) ? S.answers[q.id].slice() : [];

        if (current.indexOf(val) !== -1) {
          current = current.filter(function (k) { return k !== val; });
        } else {
          if (excl && val === excl) {
            current = [excl];
          } else {
            current = current.filter(function (k) { return k !== excl; });
            current.push(val);
          }
        }

        S.answers[q.id] = current;

        area.querySelectorAll('.check-opt').forEach(function (b) {
          const isChecked = current.indexOf(b.dataset.val) !== -1;
          b.classList.toggle('is-checked', isChecked);
          b.setAttribute('aria-pressed', isChecked);
        });

        applyBranch();
        saveAnswer(q.id, current);
        updateNextBtn(q);
      });
    });

    // Likert desktop — scale buttons
    area.querySelectorAll('.scale-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const rowKey = btn.dataset.row;
        const val = btn.dataset.val;

        if (!S.answers[q.id] || typeof S.answers[q.id] !== 'object' || Array.isArray(S.answers[q.id])) {
          S.answers[q.id] = {};
        }
        S.answers[q.id][rowKey] = val;

        area.querySelectorAll('.scale-btn[data-row="' + rowKey + '"]').forEach(function (b) {
          const sel = b.dataset.val === val;
          b.classList.toggle('is-selected', sel);
          b.setAttribute('aria-pressed', sel);
        });

        saveAnswer(q.id + '.' + rowKey, val);
        updateNextBtn(q);
      });
    });

    // Likert mobile — scale cards (one row at a time)
    area.querySelectorAll('.scale-card').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const rowKey = btn.dataset.row;
        const val = btn.dataset.val;

        if (!S.answers[q.id] || typeof S.answers[q.id] !== 'object' || Array.isArray(S.answers[q.id])) {
          S.answers[q.id] = {};
        }
        S.answers[q.id][rowKey] = val;

        area.querySelectorAll('.scale-card').forEach(function (b) {
          const sel = b.dataset.val === val;
          b.classList.toggle('is-selected', sel);
          b.setAttribute('aria-pressed', sel);
        });

        saveAnswer(q.id + '.' + rowKey, val);

        // Auto-advance to next row after brief feedback delay
        setTimeout(function () { advanceGridRow(q); }, 280);
      });
    });

    // Ranking
    const rankList = area.querySelector('.rank-list');
    if (rankList) attachRankHandlers(q, rankList);

    // Free text
    const textarea = area.querySelector('.freetext-area');
    if (textarea) {
      textarea.addEventListener('input', function () {
        const val = textarea.value;
        S.answers[q.id] = val;
        const counter = area.querySelector('#ft-count-' + q.id);
        if (counter) counter.textContent = val.length;
      });
    }
  }

  // =========================================================
  // RANKING HANDLERS
  // =========================================================
  function attachRankHandlers(q, listEl) {
    // Up/down buttons
    listEl.querySelectorAll('.rank-btn--up').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const item = btn.closest('.rank-item');
        const prev = item.previousElementSibling;
        if (prev) {
          listEl.insertBefore(item, prev);
          syncRankState(q, listEl);
        }
      });
    });

    listEl.querySelectorAll('.rank-btn--down').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const item = btn.closest('.rank-item');
        const next = item.nextElementSibling;
        if (next) {
          listEl.insertBefore(next, item);
          syncRankState(q, listEl);
        }
      });
    });

    // Drag-and-drop
    let dragSrc = null;

    listEl.querySelectorAll('.rank-item').forEach(function (item) {
      item.addEventListener('dragstart', function (e) {
        dragSrc = item;
        item.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      item.addEventListener('dragend', function () {
        item.classList.remove('is-dragging');
        listEl.querySelectorAll('.rank-item').forEach(function (i) {
          i.classList.remove('drag-over');
        });
        dragSrc = null;
        syncRankState(q, listEl);
      });

      item.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!dragSrc || dragSrc === item) return;
        const rect = item.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        if (e.clientY < mid) {
          listEl.insertBefore(dragSrc, item);
        } else {
          listEl.insertBefore(dragSrc, item.nextSibling);
        }
      });

      item.addEventListener('drop', function (e) {
        e.preventDefault();
      });
    });
  }

  function syncRankState(q, listEl) {
    const items = listEl.querySelectorAll('.rank-item');
    const order = Array.from(items).map(function (el) { return el.dataset.key; });
    S.answers[q.id] = order;

    items.forEach(function (el, i) {
      el.querySelector('.rank-item__num').textContent = i + 1;
      el.dataset.idx = i;
      el.querySelector('.rank-btn--up').disabled = i === 0;
      el.querySelector('.rank-btn--down').disabled = i === items.length - 1;
    });

    saveAnswer(q.id, order);
    updateNextBtn(q);
  }

  // =========================================================
  // NEXT BUTTON STATE
  // =========================================================
  function isAnswered(q) {
    const ans = S.answers[q.id];
    switch (q.type) {
      case 'single_select':
        return typeof ans === 'string' && ans !== '';
      case 'multi_select':
        return Array.isArray(ans) && ans.length > 0;
      case 'likert_grid': {
        if (!ans || typeof ans !== 'object' || Array.isArray(ans)) return false;
        return q.rows.every(function (r) { return r.key in ans; });
      }
      case 'ranking':
        return Array.isArray(ans) && ans.length === (q.options || []).length;
      case 'free_text':
        return true; // always optional
      default:
        return false;
    }
  }

  function isCurrentGridRowAnswered(q) {
    const ans = S.answers[q.id];
    if (!ans || typeof ans !== 'object' || Array.isArray(ans)) return false;
    return q.rows[S.gridRowIdx] && q.rows[S.gridRowIdx].key in ans;
  }

  function updateNextBtn(q) {
    const btn = document.getElementById('btn-next');
    if (!btn) return;

    let enabled;
    if (q.type === 'free_text') {
      enabled = true;
    } else if (q.type === 'likert_grid' && isMobileWidth()) {
      enabled = isCurrentGridRowAnswered(q);
    } else {
      enabled = isAnswered(q);
    }

    btn.disabled = !enabled;
  }

  // =========================================================
  // PERMANENT BUTTON WIRING (runs once on DOMContentLoaded)
  // =========================================================
  function wirePermanentButtons() {
    const nextBtn = document.getElementById('btn-next');
    const backBtn = document.getElementById('btn-back');

    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        if (nextBtn.disabled) return;
        const q = S.questions[S.cur];
        if (!q) return;

        if (q.type === 'likert_grid' && isMobileWidth()) {
          advanceGridRow(q);
        } else {
          advance();
        }
      });
    }

    if (backBtn) {
      backBtn.addEventListener('click', goBack);
    }
  }

  // =========================================================
  // NAVIGATION
  // =========================================================
  function advance() {
    S.history.push(S.cur);
    S.cur++;

    // Skip over any newly-skipped questions
    while (S.cur < S.questions.length && S.skipped.has(S.questions[S.cur].id)) {
      S.cur++;
    }

    if (S.cur >= S.questions.length) {
      doSubmit();
      return;
    }

    showQuestion();
  }

  function advanceGridRow(q) {
    S.gridRowIdx++;
    if (S.gridRowIdx < q.rows.length) {
      // More rows in this grid — re-render for next row
      document.getElementById('question-area').innerHTML = renderQ(q);
      attachHandlers(q);
      updateNextBtn(q);
    } else {
      // All rows answered — advance to next question
      S.gridRowIdx = 0;
      advance();
    }
  }

  function goBack() {
    // On mobile likert: go back within grid rows first
    const q = S.questions[S.cur];
    if (q && q.type === 'likert_grid' && isMobileWidth() && S.gridRowIdx > 0) {
      S.gridRowIdx--;
      document.getElementById('question-area').innerHTML = renderQ(q);
      attachHandlers(q);
      updateNextBtn(q);
      return;
    }

    if (S.history.length === 0) return;
    S.gridRowIdx = 0;
    S.cur = S.history.pop();

    // Restore back-button visibility
    const backBtn = document.getElementById('btn-back');
    if (backBtn) backBtn.style.visibility = S.history.length > 0 ? 'visible' : 'hidden';

    showQuestion();
  }

  // =========================================================
  // SUBMIT
  // =========================================================
  async function doSubmit() {
    if (S.submitting) return;
    S.submitting = true;

    const el = document.getElementById('runner');
    const submitUrl = el && el.dataset.submitUrl;

    // Show a brief "saving" state in the footer
    const nextBtn = document.getElementById('btn-next');
    if (nextBtn) {
      nextBtn.disabled = true;
      nextBtn.textContent = 'Se înregistrează…';
    }

    try {
      const res = await postJSON(submitUrl, { response_id: S.responseId });
      if (res.ok) {
        showDoneScreen();
      } else {
        throw new Error(res.error || 'Eroare la trimitere.');
      }
    } catch (e) {
      S.submitting = false;
      showError('Nu am putut înregistra răspunsurile. Vă rugăm verificați conexiunea și reîncercați.');
    }
  }

  // =========================================================
  // DONE SCREEN
  // =========================================================
  function showDoneScreen() {
    const runner = document.getElementById('runner');
    if (!runner) return;

    // Replace entire runner with done screen (removes sticky header/footer)
    runner.style.display = 'block';
    runner.innerHTML = doneScreenHTML();

    // Wire email form
    const form = document.getElementById('email-form');
    if (form) {
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const emailInput = form.querySelector('input[type=email]');
        const email = emailInput ? emailInput.value.trim() : '';
        if (!email) return;

        const submitBtn = form.querySelector('button[type=submit]');
        if (submitBtn) submitBtn.disabled = true;

        const emailUrl = runner.dataset.emailUrl;
        try {
          await postJSON(emailUrl, { email: email });
          const wrap = document.getElementById('email-wrap');
          if (wrap) {
            wrap.innerHTML = '<p style="font-size:15px;color:var(--muted);margin:0;">Veți primi raportul la adresa indicată. Vă mulțumim.</p>';
          }
        } catch (_) {
          // Silent — email is best-effort; the survey response is already saved
          if (submitBtn) submitBtn.disabled = false;
        }
      });

      const noThanks = form.querySelector('[data-no-thanks]');
      if (noThanks) {
        noThanks.addEventListener('click', function () {
          const wrap = document.getElementById('email-wrap');
          if (wrap) wrap.remove();
        });
      }
    }
  }

  function doneScreenHTML() {
    const runner = document.getElementById('runner');
    const emailUrl = runner ? runner.dataset.emailUrl : '';

    return '<div class="done-screen" data-email-url="' + escAttr(emailUrl) + '">' +
      '<div class="done-check" aria-hidden="true">✓</div>' +
      '<h1 class="done-title">Vă mulțumim. Răspunsurile au fost înregistrate.</h1>' +
      '<p class="done-body">Contribuția dumneavoastră ajută la construirea primei imagini de ansamblu ' +
      'asupra digitalizării în școlile din România.</p>' +
      '<hr class="done-divider">' +
      '<div id="email-wrap">' +
      '<p class="done-email-intro">Dacă doriți să primiți raportul complet în septembrie, ' +
      'lăsați o adresă de email mai jos. Este opțional. Adresa este păstrată separat de ' +
      'răspunsurile dumneavoastră, care rămân anonime.</p>' +
      '<form id="email-form" class="email-form" novalidate>' +
      '<label for="email-input" class="sr-only">Adresa de email</label>' +
      '<input type="email" id="email-input" name="email" ' +
        'placeholder="adresa@email.ro" autocomplete="email" class="email-input">' +
      '<input type="text" name="website" style="display:none" tabindex="-1" autocomplete="off">' +
      '<div class="email-form__actions">' +
        '<button type="submit" class="edus-button edus-button--primary">Trimiteți-mi raportul</button>' +
        '<button type="button" data-no-thanks class="done-link">Nu, mulțumesc</button>' +
      '</div>' +
      '</form>' +
      '</div>' +
      '</div>';
  }

  // =========================================================
  // ERROR SCREEN
  // =========================================================
  function showError(msg) {
    const area = document.getElementById('question-area') || document.getElementById('runner');
    if (!area) return;
    area.innerHTML =
      '<div class="error-screen">' +
      '<p>' + esc(msg) + '</p>' +
      '<a href="." style="color:var(--blue);font-size:15px;font-weight:600;">Reîncărcați pagina</a>' +
      '</div>';
  }

  // =========================================================
  // API HELPERS
  // =========================================================
  function saveAnswer(questionId, value) {
    const el = document.getElementById('runner');
    if (!el || !S.responseId) return;
    postJSON(el.dataset.answerUrl, {
      response_id: S.responseId,
      question_id: questionId,
      value: value,
    }).catch(function () { /* answers are re-sent on final submit if needed */ });
  }

  async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  async function postJSON(url, data) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.error || 'HTTP ' + res.status);
    return json;
  }

  // =========================================================
  // ESCAPE HELPERS
  // =========================================================
  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escAttr(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

})();
