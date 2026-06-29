// ══════════════════════════════════════════════════════════════════
//  APP SHELL — library home screen (pick a set), navigation between
//  screens. Each set's selection/practice screens are built by
//  set-selection.js / flashcards.js / typing.js using a shared
//  "currentSet" pointer so the same code paths serve all 4 sets.
// ══════════════════════════════════════════════════════════════════

let currentSet = null; // 'hiragana' | 'katakana' | 'kanji' | 'vocab'

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function renderLibrary() {
  const wrap = document.getElementById('libraryWrap');
  wrap.innerHTML = '';

  Object.entries(SETS).forEach(([setKey, setData]) => {
    const summary = setSummary(setKey);
    const pct = summary.total === 0 ? 0 : Math.round((summary.solid / summary.total) * 100);

    const card = document.createElement('button');
    card.className = 'library-card';
    card.innerHTML = `
      <div class="library-card-top">
        <span class="library-jp">${setData.jp}</span>
        <span class="library-label">${setData.label}</span>
      </div>
      <div class="library-progress-bar"><div class="library-progress-fill" style="width:${pct}%"></div></div>
      <div class="library-stats">${summary.solid} / ${summary.total} solid</div>
    `;
    card.addEventListener('click', () => openSet(setKey));
    wrap.appendChild(card);
  });
}

function openSet(setKey) {
  currentSet = setKey;
  document.getElementById('setScreenTitle').textContent = `${SETS[setKey].jp} — ${SETS[setKey].label}`;
  buildSelectionScreen(setKey);
  showScreen('screenSel');
}

document.getElementById('libraryBackBtn')?.addEventListener('click', () => {
  renderLibrary();
  showScreen('screenLibrary');
});

// ── Init persistent state (runs once at load) ──
migrateOldData();
loadStats();
loadStreak();
renderStreakBadge();
renderLibrary();
