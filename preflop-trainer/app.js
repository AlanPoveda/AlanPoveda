/* ============================================================================
 * app.js — lógica do Preflop Trainer
 * ==========================================================================*/
(() => {
  'use strict';
  const R = window.PokerRanges;
  const $ = (id) => document.getElementById(id);

  // Naipes para exibição das cartas
  const SUITS = [
    { ch: '♠', color: 'black' },
    { ch: '♥', color: 'red' },
    { ch: '♦', color: 'red' },
    { ch: '♣', color: 'black' },
  ];

  const RFI_POSITIONS = ['UTG', 'HJ', 'CO', 'BTN', 'SB'];
  const ACTION_COLORS = { raise: 'raise', '3bet': 'threebet', call: 'call', fold: 'fold' };
  const ACTION_LABELS = { raise: 'RAISE', '3bet': '3-BET', call: 'CALL', fold: 'FOLD' };

  // -------------------------------------------------------- estado ----------
  let mode = 'rfi';          // 'rfi' | 'facing' | 'grid'
  let current = null;        // { handId, cards, correct, pos/spotKey }
  let answered = false;

  const DEFAULT_STATS = { hands: 0, correct: 0, streak: 0, best: 0 };
  let stats = loadStats();

  function loadStats() {
    try {
      const s = JSON.parse(localStorage.getItem('preflopTrainerStats'));
      if (s && typeof s.hands === 'number') return { ...DEFAULT_STATS, ...s };
    } catch (_) {}
    return { ...DEFAULT_STATS };
  }
  function saveStats() {
    try { localStorage.setItem('preflopTrainerStats', JSON.stringify(stats)); } catch (_) {}
  }
  function renderStats() {
    $('statAccuracy').textContent = stats.hands ? Math.round((stats.correct / stats.hands) * 100) + '%' : '—';
    $('statStreak').textContent = stats.streak;
    $('statBest').textContent = stats.best;
    $('statHands').textContent = stats.hands;
  }

  // -------------------------------------------------- baralho / mãos --------
  function dealHand() {
    // duas cartas distintas
    const a = Math.floor(Math.random() * 52);
    let b = Math.floor(Math.random() * 52);
    while (b === a) b = Math.floor(Math.random() * 52);
    const card = (idx) => ({ rankIdx: Math.floor(idx / 4), suit: SUITS[idx % 4] });
    let c1 = card(a), c2 = card(b);
    // ordena por rank (alto primeiro) para exibição consistente
    if (c1.rankIdx > c2.rankIdx) [c1, c2] = [c2, c1];
    const hi = R.RANKS[c1.rankIdx], lo = R.RANKS[c2.rankIdx];
    let handId;
    if (c1.rankIdx === c2.rankIdx) handId = hi + hi;
    else handId = hi + lo + (c1.suit.ch === c2.suit.ch ? 's' : 'o');
    return { handId, cards: [c1, c2] };
  }

  function renderCards(cards) {
    const wrap = $('cards');
    wrap.innerHTML = '';
    for (const c of cards) {
      const el = document.createElement('div');
      el.className = 'card ' + c.suit.color;
      el.innerHTML = `<span class="card-rank">${R.RANKS[c.rankIdx]}</span><span class="card-suit">${c.suit.ch}</span>`;
      wrap.appendChild(el);
    }
  }

  // ------------------------------------------------------ quiz ----------------
  function newQuestion() {
    answered = false;
    $('feedback').hidden = true;
    const { handId, cards } = dealHand();

    if (mode === 'rfi') {
      const pos = RFI_POSITIONS[Math.floor(Math.random() * RFI_POSITIONS.length)];
      const inRange = R.RFI_SETS[pos].has(handId);
      current = { handId, cards, pos, correct: inRange ? 'raise' : 'fold' };
      $('scenarioPos').textContent = `Você está no ${pos}`;
      $('scenarioSub').textContent = 'Todos deram fold pra você. Open raise ou fold?';
      buildActions([
        { action: 'raise', label: 'Raise', key: 'R' },
        { action: 'fold', label: 'Fold', key: 'F' },
      ]);
    } else {
      const keys = Object.keys(R.FACING_SETS);
      const spotKey = keys[Math.floor(Math.random() * keys.length)];
      const cfg = R.FACING_SETS[spotKey];
      current = { handId, cards, spotKey, correct: R.facingAction(handId, spotKey) };
      $('scenarioPos').textContent = `Você está no ${cfg.hero}`;
      $('scenarioSub').textContent = `${cfg.raiser} abre para 2.5bb. Sua ação: 3-bet, call ou fold?`;
      buildActions([
        { action: '3bet', label: '3-Bet', key: 'T' },
        { action: 'call', label: 'Call', key: 'C' },
        { action: 'fold', label: 'Fold', key: 'F' },
      ]);
    }
    renderCards(cards);
    $('handLabel').textContent = prettyHand(current.handId);
  }

  function prettyHand(id) {
    if (id.length === 2) return id;               // par
    return id.slice(0, 2) + (id[2] === 's' ? ' suited' : ' offsuit');
  }

  function buildActions(defs) {
    const wrap = $('actions');
    wrap.innerHTML = '';
    for (const d of defs) {
      const btn = document.createElement('button');
      btn.className = 'btn action-btn ' + ACTION_COLORS[d.action];
      btn.innerHTML = `${d.label}<span class="key-hint">${d.key}</span>`;
      btn.dataset.action = d.action;
      btn.addEventListener('click', () => answer(d.action));
      wrap.appendChild(btn);
    }
  }

  function answer(action) {
    if (answered) return;
    answered = true;
    const correct = current.correct;
    const isRight = action === correct;

    stats.hands++;
    if (isRight) {
      stats.correct++;
      stats.streak++;
      if (stats.streak > stats.best) stats.best = stats.streak;
    } else {
      stats.streak = 0;
    }
    saveStats();
    renderStats();

    // marca botões
    for (const btn of $('actions').children) {
      const a = btn.dataset.action;
      if (a === correct) btn.classList.add('is-correct');
      if (a === action && !isRight) btn.classList.add('is-wrong');
      btn.disabled = true;
    }

    // feedback
    $('feedbackHead').textContent = isRight ? '✓ Correto!' : '✗ Errou';
    $('feedbackHead').className = 'feedback-head ' + (isRight ? 'ok' : 'bad');
    $('feedbackDetail').innerHTML = feedbackText();
    renderMiniGrid();
    $('feedback').hidden = false;
    $('nextBtn').focus();
  }

  function feedbackText() {
    const hand = `<strong>${current.handId}</strong>`;
    const act = `<span class="tag ${ACTION_COLORS[current.correct]}">${ACTION_LABELS[current.correct]}</span>`;
    if (mode === 'rfi') {
      return `Com ${hand} no <strong>${current.pos}</strong>, a jogada certa é ${act}.`;
    }
    const cfg = R.FACING_SETS[current.spotKey];
    return `No ${cfg.hero} vs open do ${cfg.raiser}, com ${hand} o certo é ${act}.`;
  }

  // ------------------------------------------ grids (mini + grande) ----------
  // Retorna a ação de uma mão para o range atualmente em foco
  function actionForCell(handId, source) {
    if (source.type === 'rfi') return source.set.has(handId) ? 'raise' : 'fold';
    return R.facingAction(handId, source.key);
  }

  function buildGrid(container, source, highlightId) {
    container.innerHTML = '';
    const n = R.RANKS.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        let handId, txt;
        if (i === j) { handId = R.RANKS[i] + R.RANKS[i]; txt = handId; }
        else if (i < j) { handId = R.RANKS[i] + R.RANKS[j] + 's'; txt = R.RANKS[i] + R.RANKS[j] + 's'; }
        else { handId = R.RANKS[j] + R.RANKS[i] + 'o'; txt = R.RANKS[j] + R.RANKS[i] + 'o'; }
        const cell = document.createElement('div');
        const act = actionForCell(handId, source);
        cell.className = 'gcell ' + ACTION_COLORS[act];
        cell.textContent = txt;
        if (handId === highlightId) cell.classList.add('highlight');
        container.appendChild(cell);
      }
    }
  }

  function currentQuizSource() {
    if (mode === 'rfi') return { type: 'rfi', set: R.RFI_SETS[current.pos] };
    return { type: 'facing', key: current.spotKey };
  }

  function legendHtml(kinds) {
    return kinds.map((k) => `<span class="leg"><span class="swatch ${ACTION_COLORS[k]}"></span>${ACTION_LABELS[k]}</span>`).join('');
  }

  function renderMiniGrid() {
    const source = currentQuizSource();
    buildGrid($('miniGrid'), source, current.handId);
    $('miniLegend').innerHTML = mode === 'rfi'
      ? legendHtml(['raise', 'fold'])
      : legendHtml(['3bet', 'call', 'fold']);
  }

  // ----------------------------------------------- modo Grid (consulta) ------
  function buildGridSelect() {
    const sel = $('gridSelect');
    sel.innerHTML = '';
    const og = document.createElement('optgroup'); og.label = 'Open Raise (RFI)';
    for (const pos of RFI_POSITIONS) {
      const o = document.createElement('option');
      o.value = 'rfi:' + pos; o.textContent = pos + ' — open raise';
      og.appendChild(o);
    }
    sel.appendChild(og);
    const fg = document.createElement('optgroup'); fg.label = 'Vs Raise';
    for (const key of Object.keys(R.FACING_SETS)) {
      const o = document.createElement('option');
      o.value = 'facing:' + key; o.textContent = R.FACING_SETS[key].label;
      fg.appendChild(o);
    }
    sel.appendChild(fg);
    sel.addEventListener('change', renderBigGrid);
  }

  function renderBigGrid() {
    const val = $('gridSelect').value;
    const [type, key] = val.split(':');
    let source, pct, legend;
    if (type === 'rfi') {
      source = { type: 'rfi', set: R.RFI_SETS[key] };
      pct = R.rangePercent(R.RFI_SETS[key]);
      legend = legendHtml(['raise', 'fold']);
    } else {
      source = { type: 'facing', key };
      const s = R.FACING_SETS[key];
      // % que continua no pote (3bet + call)
      const cont = new Set([...s.threeBetSet, ...s.callSet]);
      pct = R.rangePercent(cont);
      legend = legendHtml(['3bet', 'call', 'fold']);
    }
    buildGrid($('bigGrid'), source, null);
    $('gridPct').textContent = (type === 'rfi' ? 'Open: ' : 'Defesa: ') + pct.toFixed(1) + '%';
    $('gridLegend').innerHTML = legend;
  }

  // ----------------------------------------------------- modos / tabs --------
  function setMode(m) {
    mode = m;
    for (const t of document.querySelectorAll('.tab')) t.classList.toggle('active', t.dataset.mode === m);
    const isGrid = m === 'grid';
    $('quizView').hidden = isGrid;
    $('gridView').hidden = !isGrid;
    if (isGrid) renderBigGrid();
    else newQuestion();
  }

  // -------------------------------------------------------- teclado ----------
  function onKey(e) {
    if (mode === 'grid') return;
    const k = e.key.toLowerCase();
    if (answered && (k === 'enter' || k === ' ')) { e.preventDefault(); newQuestion(); return; }
    if (answered) return;
    const map = mode === 'rfi'
      ? { r: 'raise', f: 'fold' }
      : { t: '3bet', c: 'call', f: 'fold' };
    if (map[k]) { e.preventDefault(); answer(map[k]); }
  }

  // --------------------------------------------------- PWA / instalação ------
  function setupPWA() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
    let deferred = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferred = e;
      $('installPrompt').hidden = false;
    });
    $('installBtn').addEventListener('click', async () => {
      $('installPrompt').hidden = true;
      if (deferred) { deferred.prompt(); await deferred.userChoice; deferred = null; }
    });
    $('installDismiss').addEventListener('click', () => { $('installPrompt').hidden = true; });
    window.addEventListener('appinstalled', () => { $('installPrompt').hidden = true; });
  }

  // ------------------------------------------------------------- init --------
  function init() {
    renderStats();
    buildGridSelect();

    for (const t of document.querySelectorAll('.tab')) {
      t.addEventListener('click', () => setMode(t.dataset.mode));
    }
    $('nextBtn').addEventListener('click', newQuestion);
    $('statsToggle').addEventListener('click', () => $('statsBar').classList.toggle('open'));
    $('resetStats').addEventListener('click', () => {
      if (confirm('Zerar todas as estatísticas?')) {
        stats = { ...DEFAULT_STATS }; saveStats(); renderStats();
      }
    });
    document.addEventListener('keydown', onKey);

    setMode('rfi');
    setupPWA();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
