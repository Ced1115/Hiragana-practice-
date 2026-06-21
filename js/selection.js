// ══════════════════════════════════════════════════════════════════
//  SELECTION SCREEN — character grid, group toggles, mode picker
// ══════════════════════════════════════════════════════════════════
const selected = new Set();
const groupWrap = document.getElementById('groupWrap');

GROUPS.forEach((group, gi) => {
  const div = document.createElement('div'); div.className = 'group';
  const header = document.createElement('div'); header.className = 'group-header';
  const title = document.createElement('span'); title.className = 'group-title'; title.textContent = group.name;
  const toggleBtn = document.createElement('button'); toggleBtn.className = 'group-toggle-btn'; toggleBtn.textContent = 'Select row';
  toggleBtn.onclick = e => {
    e.stopPropagation();
    const allIn = group.kana.every(k => selected.has(k.r));
    group.kana.forEach(k => allIn ? selected.delete(k.r) : selected.add(k.r));
    toggleBtn.textContent = allIn ? 'Select row' : 'Deselect row';
    div.querySelectorAll('.kana-cell').forEach(cell => cell.classList.toggle('selected', selected.has(cell.dataset.r)));
    updateSelCount();
  };
  header.appendChild(title); header.appendChild(toggleBtn);
  const grid = document.createElement('div'); grid.className = 'group-grid';
  group.kana.forEach(k => {
    const cell = document.createElement('div'); cell.className = 'kana-cell'; cell.dataset.r = k.r;
    const dot = document.createElement('span'); dot.className = 'mastery-dot'; dot.dataset.dotFor = k.r;
    const cm = document.createElement('span'); cm.className = 'check-mark'; cm.textContent = '✓';
    const acc = document.createElement('div'); acc.className = 'accuracy-line'; acc.dataset.accFor = k.r;
    const hEl = document.createElement('div'); hEl.className = 'kana-h'; hEl.textContent = k.h;
    const rEl = document.createElement('div'); rEl.className = 'kana-r'; rEl.textContent = k.r;
    cell.appendChild(dot); cell.appendChild(cm); cell.appendChild(acc); cell.appendChild(hEl); cell.appendChild(rEl);
    cell.onclick = () => {
      selected.has(k.r) ? selected.delete(k.r) : selected.add(k.r);
      cell.classList.toggle('selected', selected.has(k.r));
      toggleBtn.textContent = group.kana.every(k2 => selected.has(k2.r)) ? 'Deselect row' : 'Select row';
      updateSelCount();
    };
    grid.appendChild(cell);
  });
  div.appendChild(header); div.appendChild(grid); groupWrap.appendChild(div);
});

// ── Init persistent state ──
loadStats();
loadStreak();
renderStreakBadge();
paintMasteryDots();

function updateSelCount() {
  const n = selected.size;
  document.getElementById('selCount').textContent = `${n} character${n !== 1 ? 's' : ''} selected`;
  document.getElementById('startBtn').disabled = n === 0;
}

document.getElementById('selAllBtn').addEventListener('click', () => {
  const allSelected = GROUPS.every(g => g.kana.every(k => selected.has(k.r)));
  GROUPS.forEach(g => g.kana.forEach(k => allSelected ? selected.delete(k.r) : selected.add(k.r)));
  document.getElementById('selAllBtn').textContent = allSelected ? 'Select all' : 'Deselect all';
  document.querySelectorAll('.kana-cell').forEach(cell => cell.classList.toggle('selected', selected.has(cell.dataset.r)));
  document.querySelectorAll('.group').forEach((groupEl, gi) => {
    groupEl.querySelector('.group-toggle-btn').textContent = GROUPS[gi].kana.every(k => selected.has(k.r)) ? 'Deselect row' : 'Select row';
  });
  updateSelCount();
});

// ── Mode picker ──
let practiceMode = 'flashcard'; // 'flashcard' | 'typing'

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    practiceMode = btn.dataset.mode;
  });
});

// ── Start button: branch into the chosen practice mode ──
document.getElementById('startBtn').addEventListener('click', () => {
  document.getElementById('screenSel').classList.remove('active');

  if (practiceMode === 'typing') {
    startTypingSession();
    document.getElementById('screenTyping').classList.add('active');
    return;
  }

  startFlashcardSession();
  document.getElementById('screenPractice').classList.add('active');
});

document.getElementById('backBtn').addEventListener('click', () => {
  document.getElementById('screenPractice').classList.remove('active');
  document.getElementById('screenSel').classList.add('active');
  paintMasteryDots();
});

document.getElementById('typeBackBtn').addEventListener('click', () => {
  document.getElementById('screenTyping').classList.remove('active');
  document.getElementById('screenSel').classList.add('active');
  paintMasteryDots();
});
