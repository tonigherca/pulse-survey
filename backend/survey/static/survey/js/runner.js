/* Survey runner — vanilla JS, no dependencies.
 *
 * Navigation unit: SECTION (all questions in a section shown at once).
 * S.sections[]   — [{title, questions[]}] — primary navigation
 * S.questions[]  — flat array — kept for branch/submit compatibility
 * S.curSection   — index into S.sections
 * S.skipped      — Set of question IDs hidden by branch rules
 * S.answers      — {qid: value}
 * S.history      — stack of section indices for back navigation
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
    sections:   [],   // [{title, questions:[...]}]
    questions:  [],   // flat (branch + submit compat)
    skipped:    new Set(),
    answers:    {},
    curSection: 0,
    history:    [],
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
      S.cat       = await fetchJSON(el.dataset.catalogueUrl);
      S.sections  = buildSections(S.cat, S.path);
      S.questions = buildQueue(S.cat, S.path);

      const res    = await postJSON(el.dataset.startUrl, { path: S.path });
      S.responseId = res.response_id;

      showSection();
    } catch (e) {
      showError(e.message || 'A apărut o eroare. Reîncărcați pagina.');
    }
  });

  // =========================================================
  // CATALOGUE HELPERS
  // =========================================================
  function buildSections(cat, path) {
    return cat.paths[path].sections.map(function (sec) {
      return {
        title: sec.title,
        questions: sec.questions.map(function (q) {
          return Object.assign({}, q, { sectionTitle: sec.title });
        }),
      };
    });
  }

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
  function getVisibleSections() {
    return S.sections.filter(function (sec) {
      return sec.questions.some(function (q) { return !S.skipped.has(q.id); });
    });
  }

  function progressInfo() {
    const vis    = getVisibleSections();
    const cur    = S.sections[S.curSection];
    const posVis = vis.indexOf(cur) + 1;
    const total  = vis.length;

    const TIME = { single_select: 25, multi_select: 35, likert_grid: 75, ranking: 90, free_text: 120 };
    const remaining = S.sections.slice(S.curSection).reduce(function (acc, sec) {
      return acc.concat(sec.questions.filter(function (q) { return !S.skipped.has(q.id); }));
    }, []);
    const secs = remaining.reduce(function (s, q) { return s + (TIME[q.type] || 30); }, 0);
    const mins = Math.max(1, Math.ceil(secs / 60));

    return { sectionTitle: cur ? cur.title : '', posVis: posVis, total: total, mins: mins };
  }

  function updateHeader() {
    const info   = progressInfo();
    const secEl  = document.getElementById('runner-section');
    const stepEl = document.getElementById('runner-step');
    const barEl  = document.getElementById('runner-bar');
    const timeEl = document.getElementById('runner-time');

    if (secEl)  secEl.textContent  = info.sectionTitle;
    if (stepEl) stepEl.textContent = info.posVis + ' din ' + info.total;
    if (barEl) {
      const pct = Math.round((info.posVis / info.total) * 100);
      barEl.style.width = pct + '%';
      barEl.closest('[role=progressbar]').setAttribute('aria-valuenow', pct);
    }
    if (timeEl) timeEl.textContent = '~' + info.mins + ' minute rămase';
  }

  // =========================================================
  // SECTION RENDER
  // =========================================================
  function showSection() {
    if (S.curSection >= S.sections.length) {
      doSubmit();
      return;
    }

    updateHeader();

    const backBtn = document.getElementById('btn-back');
    if (backBtn) backBtn.style.visibility = S.history.length > 0 ? 'visible' : 'hidden';

    renderSection(S.sections[S.curSection]);

    const body = document.getElementById('runner-body');
    if (body) body.scrollTop = 0;
  }

  function renderSection(sec) {
    const area = document.getElementById('question-area');
    let html = '';
    for (const q of sec.questions) {
      const hidden = S.skipped.has(q.id);
      html += '<div class="q-block' + (hidden ? ' q-block--hidden' : '') +
              '" data-qid="' + escAttr(q.id) + '">';
      html += renderQ(q);
      html += '</div>';
    }
    area.innerHTML = html;

    for (const q of sec.questions) {
      attachHandlers(q);
    }

    updateSectionBtn();
  }

  // After each answer: sync hidden/visible q-blocks in current section
  function refreshSkips() {
    const area = document.getElementById('question-area');
    if (!area) return;
    const sec = S.sections[S.curSection];
    for (const q of sec.questions) {
      const block = area.querySelector('[data-qid="' + q.id + '"]');
      if (!block) continue;
      block.classList.toggle('q-block--hidden', S.skipped.has(q.id));
    }
    updateSectionBtn();
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
    const opts    = getOptions(q);
    const checked = Array.isArray(ans) ? ans : [];
    const excl    = q.exclusive_option || null;
    let html = '<div class="check-list" role="group" aria-label="' + escAttr(q.text) + '">';
    html += '<p class="q-helper">Selectează tot ce se aplică.</p>';
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

    html += '<div class="likert-header" aria-hidden="true">';
    html += '<div class="likert-header__label"></div>';
    html += '<div class="likert-header__scale">';
    for (const pt of points) {
      html += '<span class="likert-header__pt">' + esc(pt.label) + '</span>';
    }
    html += '</div></div>';

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
  // LIKERT GRID — mobile (all rows stacked, scale cards per row)
  // =========================================================
  function renderLikertMobile(q, ans) {
    const points     = getScalePoints(q);
    const ansObj     = (ans && typeof ans === 'object' && !Array.isArray(ans)) ? ans : {};
    const scaleLabel = getScaleLabel(q);

    let html = '<div class="likert-mobile-wrap">';
    if (scaleLabel) html += '<p class="q-helper">' + esc(scaleLabel) + '</p>';

    for (const row of q.rows) {
      const rowAns = ansObj[row.key];
      html += '<div class="likert-row-group">';
      html += '<div class="likert-row-group__label">' + esc(row.label) + '</div>';
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
    }

    html += '</div>';
    return html;
  }

  // =========================================================
  // RANKING
  // =========================================================
  function renderRanking(q, ans) {
    const opts         = q.options || [];
    const defaultOrder = opts.map(function (o) { return o.key; });
    const order        = Array.isArray(ans) ? ans : defaultOrder;
    const ordered      = order
      .map(function (key) { return opts.find(function (o) { return o.key === key; }); })
      .filter(Boolean);
    for (const o of opts) {
      if (!ordered.find(function (oo) { return oo.key === o.key; })) ordered.push(o);
    }

    let html = '<div class="rank-list" id="rank-list-' + escAttr(q.id) + '" data-qid="' + escAttr(q.id) + '">';
    html += '<p class="q-helper">Trage pentru a reordona sau folosește butoanele ↑ ↓.</p>';
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
      ' rows="4"' +
      ' placeholder="Răspunsul tău (opțional)"' +
      '>' + esc(val) + '</textarea>';
    html += '<div class="freetext-counter"><span id="ft-count-' + escAttr(q.id) + '">' + val.length + '</span> / ' + max + '</div>';
    html += '</div>';
    return html;
  }

  // =========================================================
  // EVENT HANDLERS — scoped to each q-block
  // =========================================================
  function attachHandlers(q) {
    const area  = document.getElementById('question-area');
    const block = area ? area.querySelector('[data-qid="' + q.id + '"]') : null;
    if (!block) return;

    // Single select
    block.querySelectorAll('.radio-opt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const val = btn.dataset.val;
        S.answers[q.id] = val;

        block.querySelectorAll('.radio-opt').forEach(function (b) {
          const sel = b.dataset.val === val;
          b.classList.toggle('is-selected', sel);
          b.setAttribute('aria-checked', sel);
        });

        applyBranch();
        saveAnswer(q.id, val);
        refreshSkips();
      });
    });

    // Multi select
    block.querySelectorAll('.check-opt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const val  = btn.dataset.val;
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

        block.querySelectorAll('.check-opt').forEach(function (b) {
          const isChecked = current.indexOf(b.dataset.val) !== -1;
          b.classList.toggle('is-checked', isChecked);
          b.setAttribute('aria-pressed', isChecked);
        });

        applyBranch();
        saveAnswer(q.id, current);
        refreshSkips();
      });
    });

    // Likert desktop — scale buttons
    block.querySelectorAll('.scale-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const rowKey = btn.dataset.row;
        const val    = btn.dataset.val;

        if (!S.answers[q.id] || typeof S.answers[q.id] !== 'object' || Array.isArray(S.answers[q.id])) {
          S.answers[q.id] = {};
        }
        S.answers[q.id][rowKey] = val;

        block.querySelectorAll('.scale-btn[data-row="' + rowKey + '"]').forEach(function (b) {
          const sel = b.dataset.val === val;
          b.classList.toggle('is-selected', sel);
          b.setAttribute('aria-pressed', sel);
        });

        saveAnswer(q.id + '.' + rowKey, val);
        updateSectionBtn();
      });
    });

    // Likert mobile — scale cards (all rows, highlight within row group only)
    block.querySelectorAll('.scale-card').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const rowKey   = btn.dataset.row;
        const val      = btn.dataset.val;

        if (!S.answers[q.id] || typeof S.answers[q.id] !== 'object' || Array.isArray(S.answers[q.id])) {
          S.answers[q.id] = {};
        }
        S.answers[q.id][rowKey] = val;

        const rowGroup = btn.closest('.likert-row-group');
        if (rowGroup) {
          rowGroup.querySelectorAll('.scale-card').forEach(function (b) {
            const sel = b.dataset.val === val;
            b.classList.toggle('is-selected', sel);
            b.setAttribute('aria-pressed', sel);
          });
        }

        saveAnswer(q.id + '.' + rowKey, val);
        updateSectionBtn();
      });
    });

    // Ranking
    const rankList = block.querySelector('.rank-list');
    if (rankList) attachRankHandlers(q, rankList);

    // Free text
    const textarea = block.querySelector('.freetext-area');
    if (textarea) {
      textarea.addEventListener('input', function () {
        const val = textarea.value;
        S.answers[q.id] = val;
        const counter = block.querySelector('#ft-count-' + q.id);
        if (counter) counter.textContent = val.length;
        updateSectionBtn();
      });
    }
  }

  // =========================================================
  // RANKING HANDLERS
  // =========================================================
  function attachRankHandlers(q, listEl) {
    listEl.querySelectorAll('.rank-btn--up').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const item = btn.closest('.rank-item');
        const prev = item.previousElementSibling;
        if (prev) { listEl.insertBefore(item, prev); syncRankState(q, listEl); }
      });
    });

    listEl.querySelectorAll('.rank-btn--down').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const item = btn.closest('.rank-item');
        const next = item.nextElementSibling;
        if (next) { listEl.insertBefore(next, item); syncRankState(q, listEl); }
      });
    });

    let dragSrc = null;

    listEl.querySelectorAll('.rank-item').forEach(function (item) {
      item.addEventListener('dragstart', function (e) {
        dragSrc = item;
        item.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      item.addEventListener('dragend', function () {
        item.classList.remove('is-dragging');
        listEl.querySelectorAll('.rank-item').forEach(function (i) { i.classList.remove('drag-over'); });
        dragSrc = null;
        syncRankState(q, listEl);
      });
      item.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!dragSrc || dragSrc === item) return;
        const rect = item.getBoundingClientRect();
        if (e.clientY < rect.top + rect.height / 2) {
          listEl.insertBefore(dragSrc, item);
        } else {
          listEl.insertBefore(dragSrc, item.nextSibling);
        }
      });
      item.addEventListener('drop', function (e) { e.preventDefault(); });
    });
  }

  function syncRankState(q, listEl) {
    const items = listEl.querySelectorAll('.rank-item');
    const order = Array.from(items).map(function (el) { return el.dataset.key; });
    S.answers[q.id] = order;

    items.forEach(function (el, i) {
      el.querySelector('.rank-item__num').textContent = i + 1;
      el.dataset.idx = i;
      el.querySelector('.rank-btn--up').disabled   = i === 0;
      el.querySelector('.rank-btn--down').disabled = i === items.length - 1;
    });

    saveAnswer(q.id, order);
    updateSectionBtn();
  }

  // =========================================================
  // SECTION COMPLETION
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
        return true;
      default:
        return false;
    }
  }

  function isSectionComplete() {
    const sec = S.sections[S.curSection];
    if (!sec) return false;
    return sec.questions
      .filter(function (q) { return !S.skipped.has(q.id); })
      .every(function (q) { return isAnswered(q); });
  }

  function updateSectionBtn() {
    const btn = document.getElementById('btn-next');
    if (btn) btn.disabled = !isSectionComplete();
  }

  // =========================================================
  // PERMANENT BUTTON WIRING
  // =========================================================
  function wirePermanentButtons() {
    const nextBtn = document.getElementById('btn-next');
    const backBtn = document.getElementById('btn-back');

    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        if (nextBtn.disabled) return;
        advance();
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
    S.history.push(S.curSection);
    S.curSection++;

    while (S.curSection < S.sections.length) {
      const sec = S.sections[S.curSection];
      if (sec.questions.some(function (q) { return !S.skipped.has(q.id); })) break;
      S.curSection++;
    }

    if (S.curSection >= S.sections.length) {
      doSubmit();
      return;
    }

    showSection();
  }

  function goBack() {
    if (S.history.length === 0) return;
    S.curSection = S.history.pop();

    const backBtn = document.getElementById('btn-back');
    if (backBtn) backBtn.style.visibility = S.history.length > 0 ? 'visible' : 'hidden';

    showSection();
  }

  // =========================================================
  // SUBMIT
  // =========================================================
  async function doSubmit() {
    if (S.submitting) return;
    S.submitting = true;

    const el        = document.getElementById('runner');
    const submitUrl = el && el.dataset.submitUrl;

    const nextBtn = document.getElementById('btn-next');
    if (nextBtn) { nextBtn.disabled = true; nextBtn.textContent = 'Se înregistrează…'; }

    try {
      const res = await postJSON(submitUrl, { response_id: S.responseId });
      if (res.ok) {
        showDoneScreen();
      } else {
        throw new Error(res.error || 'Eroare la trimitere.');
      }
    } catch (e) {
      S.submitting = false;
      showError('Nu am putut înregistra răspunsurile. Verifică conexiunea și reîncearcă.');
    }
  }

  // =========================================================
  // DONE SCREEN
  // =========================================================
  function showDoneScreen() {
    const runner = document.getElementById('runner');
    if (!runner) return;

    runner.style.display = 'block';
    runner.innerHTML = doneScreenHTML();

    const form = document.getElementById('email-form');
    if (form) {
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const emailInput = form.querySelector('input[type=email]');
        const email      = emailInput ? emailInput.value.trim() : '';
        if (!email) return;

        const submitBtn = form.querySelector('button[type=submit]');
        if (submitBtn) submitBtn.disabled = true;

        const emailUrl = runner.dataset.emailUrl;
        try {
          await postJSON(emailUrl, { email: email });
          const wrap = document.getElementById('email-wrap');
          if (wrap) wrap.innerHTML = '<p style="font-size:15px;color:var(--muted);margin:0;">Vei primi raportul la adresa indicată. Mulțumim.</p>';
        } catch (_) {
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
    const runner   = document.getElementById('runner');
    const emailUrl = runner ? runner.dataset.emailUrl : '';

    return '<div class="done-screen" data-email-url="' + escAttr(emailUrl) + '">' +
      '<div class="done-check" aria-hidden="true">✓</div>' +
      '<h1 class="done-title">Mulțumim. Răspunsurile au fost înregistrate.</h1>' +
      '<p class="done-body">Contribuția ta ajută la construirea primei imagini de ansamblu ' +
      'asupra digitalizării în școlile din România.</p>' +
      '<hr class="done-divider">' +
      '<div id="email-wrap">' +
      '<p class="done-email-intro">Dacă vrei să primești raportul complet în septembrie, ' +
      'lasă o adresă de email mai jos. Este opțional. Adresa este păstrată separat de ' +
      'răspunsurile tale, care rămân anonime.</p>' +
      '<form id="email-form" class="email-form" novalidate>' +
      '<label for="email-input" class="sr-only">Adresa de email</label>' +
      '<input type="email" id="email-input" name="email" ' +
        'placeholder="adresa@email.ro" autocomplete="email" class="email-input">' +
      '<input type="text" name="website" style="display:none" tabindex="-1" autocomplete="off">' +
      '<div class="email-form__actions">' +
        '<button type="submit" class="edus-button edus-button--primary">Trimite-mi raportul</button>' +
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
      '<a href="." style="color:var(--blue);font-size:15px;font-weight:600;">Reîncarcă pagina</a>' +
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
      value:       value,
    }).catch(function () {});
  }

  async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  async function postJSON(url, data) {
    const res  = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
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
}());
