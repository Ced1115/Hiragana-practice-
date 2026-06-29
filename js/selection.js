// ══════════════════════════════════════════════════════════════════
//  SELECTION SCREEN — builds the character/word picker for whichever
//  set is currently open. Kana/kanji render as a grid; vocab renders
//  as a list (more fields per row). Driven entirely by the unified
//  item schema, so one function serves all 4 sets.
// ══════════════════════════════════════════════════════════════════
const selected = new Set(); // holds selected item.id strings, scoped to currentSet
let practiceMode = 'flashcard'; // 'flashcard' | 'typing'

function buildSelectionScreen(setKey) {
  selected.clear();
  practiceMode = 'flashcard';

  const setData = SETS[setKey];
  const isListLayout = setKey === 'vocab';
  const groupWrap = document.getElementById('groupWrap');
  groupWrap.innerHTML = '';
  groupWrap.className = isListLayout ? 'group-wrap list-layout' : 'group-wrap';

  setData.groups.forEach(group => {
    const div = document.createElement('div'); div.className = 'group';
    const header = document.createElement('div'); header.className = 'group-header';
    const title = document.createElement('span'); title.className = 'group-title'; title.textContent = group.name;
    const toggleBtn = document.createElement('button'); toggleBtn.className = 'group-toggle-btn'; toggleBtn.textContent = 'Select all';
    toggleBtn.onclick = e => {
      e.stopPropagation();
      const allIn = group.items.every(it => selected.has(it.id));
      group.items.forEach(it => allIn ? selected.delete(it.id) : selected.add(it.id));
      toggleBtn.textContent = allIn ? 'Select all' : 'Deselect all';
      div.querySelectorAll('[data-cell-id]').forEach(cell => cell.classList.toggle('selected', selected.has(cell.dataset.cellId)));
      updateSelCount();
    };
    header.appendChild(title); header.appendChild(toggleBtn);

    const container = document.createElement('div');
    container.className = isListLayout ? 'vocab-list' : 'group-grid';

    group.items.forEach(item => {
      const cell = isListLayout ? buildVocabCell(setKey, item) : buildGridCell(setKey, item);
      cell.addEventListener('click', () => {
        selected.has(item.id) ? selected.delete(item.id) : selected.add(item.id);
        cell.classList.toggle('selected', selected.has(item.id));
        toggleBtn.textContent = group.items.every(it2 => selected.has(it2.id)) ? 'Deselect all' : 'Select all';
        updateSelCount();
      });
      container.appendChild(cell);
    });

    div.appendChild(header); div.appendChild(container); groupWrap.appendChild(div);
  });

  paintMasteryDots();
  updateSelCount();
  setupModePicker(setKey);
  setupVocabFilters(setKey);

  document.getElementById('selAllBtn').onclick = () => {
    const allItems = setData.groups.flatMap(g => g.items);
    const allSelected = allItems.every(it => selected.has(it.id));
    allItems.forEach(it => allSelected ? selected.delete(it.id) : selected.add(it.id));
    document.getElementById('selAllBtn').textContent = allSelected ? 'Select all' : 'Deselect all';
    document.querySelectorAll('[data-cell-id]').forEach(cell => cell.classList.toggle('selected', selected.has(cell.dataset.cellId)));
    document.querySelectorAll('.group').forEach((groupEl, gi) => {
      groupEl.querySelector('.group-toggle-btn').textContent =
        setData.groups[gi].items.every(it => selected.has(it.id)) ? 'Deselect all' : 'Select all';
    });
    updateSelCount();
  };

  document.getElementById('startBtn').onclick = () => {
    if (practiceMode === 'typing') {
      startQuizSession(setKey);
      showScreen('screenTyping');
    } else {
      startFlashcardSession(setKey);
      showScreen('screenPractice');
    }
  };
}

function buildGridCell(setKey, item) {
  const cell = document.createElement('div');
  cell.className = 'kana-cell';
  cell.dataset.cellId = item.id;
  const dot = document.createElement('span'); dot.className = 'mastery-dot'; dot.dataset.dotFor = `${setKey}:${item.id}`;
  const cm = document.createElement('span'); cm.className = 'check-mark'; cm.textContent = '✓';
  const acc = document.createElement('div'); acc.className = 'accuracy-line'; acc.dataset.accFor = `${setKey}:${item.id}`;
  const hEl = document.createElement('div'); hEl.className = 'kana-h'; hEl.textContent = item.display;
  const rEl = document.createElement('div'); rEl.className = 'kana-r';
  rEl.textContent = setKey === 'kanji' ? item.meaning.split(',')[0].split(' ')[0] : item.id;
  cell.appendChild(dot); cell.appendChild(cm); cell.appendChild(acc); cell.appendChild(hEl); cell.appendChild(rEl);
  return cell;
}

function buildVocabCell(setKey, item) {
  const cell = document.createElement('div');
  cell.className = 'vocab-cell';
  cell.dataset.cellId = item.id;

  const dot = document.createElement('span'); dot.className = 'mastery-dot'; dot.dataset.dotFor = `${setKey}:${item.id}`;
  const cm = document.createElement('span'); cm.className = 'check-mark'; cm.textContent = '✓';

  const main = document.createElement('div'); main.className = 'vocab-main';
  const jpEl = document.createElement('span'); jpEl.className = 'vocab-jp'; jpEl.textContent = item.display;
  const kanaEl = document.createElement('span'); kanaEl.className = 'vocab-kana'; kanaEl.textContent = item.reading || '';
  main.appendChild(jpEl); main.appendChild(kanaEl);

  const meaningEl = document.createElement('div'); meaningEl.className = 'vocab-meaning'; meaningEl.textContent = item.meaning || '';

  const tags = document.createElement('div'); tags.className = 'vocab-tags';
  if (item.level) {
    const levelTag = document.createElement('span'); levelTag.className = `tag tag-level tag-${item.level.toLowerCase()}`; levelTag.textContent = item.level;
    tags.appendChild(levelTag);
  }
  if (item.type) {
    const typeTag = document.createElement('span'); typeTag.className = 'tag tag-type'; typeTag.textContent = item.type;
    tags.appendChild(typeTag);
  }
  const accLine = document.createElement('span'); accLine.className = 'accuracy-line accuracy-inline'; accLine.dataset.accFor = `${setKey}:${item.id}`;
  tags.appendChild(accLine);

  cell.appendChild(dot); cell.appendChild(cm); cell.appendChild(main); cell.appendChild(meaningEl); cell.appendChild(tags);
  return cell;
}

function updateSelCount() {
  const n = selected.size;
  document.getElementById('selCount').textContent = `${n} selected`;
  document.getElementById('startBtn').disabled = n === 0;
}

function setupVocabFilters(setKey) {
  const row = document.getElementById('vocabFilterRow');
  row.classList.toggle('hidden', setKey !== 'vocab');
  if (setKey !== 'vocab') return;

  const applyFilter = level => {
    const allItems = SETS.vocab.groups.flatMap(g => g.items);
    allItems.filter(it => it.level === level).forEach(it => selected.add(it.id));
    document.querySelectorAll('[data-cell-id]').forEach(cell => cell.classList.toggle('selected', selected.has(cell.dataset.cellId)));
    document.querySelectorAll('.group').forEach((groupEl, gi) => {
      groupEl.querySelector('.group-toggle-btn').textContent =
        SETS.vocab.groups[gi].items.every(it => selected.has(it.id)) ? 'Deselect all' : 'Select all';
    });
    updateSelCount();
  };

  document.getElementById('filterN5').onclick = () => applyFilter('N5');
  document.getElementById('filterN4').onclick = () => applyFilter('N4');
}

function setupModePicker(setKey) {
  const modeWrap = document.getElementById('modePicker');
  const typingBtn = document.getElementById('modeTyping');
  // Kanji's second mode is a meaning-matching quiz, not a typed-romaji check —
  // relabel the button so it's accurate per set.
  typingBtn.textContent = setKey === 'kanji' ? 'Quiz' : (setKey === 'vocab' ? 'Meaning Quiz' : 'Typing');
  document.getElementById('modeFlashcard').textContent = setKey === 'vocab' ? 'Reading' : 'Flashcards';

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === 'flashcard');
    btn.onclick = () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      practiceMode = btn.dataset.mode;
    };
  });
}

document.getElementById('backBtn').addEventListener('click', () => {
  showScreen('screenSel');
  paintMasteryDots();
});
document.getElementById('typeBackBtn').addEventListener('click', () => {
  showScreen('screenSel');
  paintMasteryDots();
});
