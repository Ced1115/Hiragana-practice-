// ══════════════════════════════════════════════════════════════════
//  FLASHCARD MODE — two UX branches sharing one mastery queue engine:
//    - kana/kanji: draw-pad + reveal + stroke order (+ readings for kanji)
//    - vocab: type-the-romaji + check (no drawing, no stroke order)
// ══════════════════════════════════════════════════════════════════
let allCards = [];
let queue = [];
let roundTotal = 0;
let roundNumber = 1;
let seen = 0, right = 0, wrong = 0, revealed = false;
let currentItem = null;
let currentChar = ''; // mirrors currentItem.display; drawpad.js reads this for the Compare overlay
let flashSetKey = null;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function startNewRound() {
  queue = shuffle([...allCards]);
  roundTotal = queue.length;
}

function startFlashcardSession(setKey) {
  flashSetKey = setKey;
  allCards = SETS[setKey].groups.flatMap(g => g.items).filter(it => selected.has(it.id));
  roundNumber = 1;
  startNewRound();
  seen = 0; right = 0; wrong = 0;
  ['seenCount','rightCount','wrongCount'].forEach(id => document.getElementById(id).textContent = '0');

  const isDrawMode = setKey === 'hiragana' || setKey === 'katakana' || setKey === 'kanji';
  document.getElementById('drawModeArea').classList.toggle('hidden', !isDrawMode);
  document.getElementById('typeModeArea').classList.toggle('hidden', isDrawMode);
  document.getElementById('drawBtnRow').classList.toggle('hidden', !isDrawMode);
  document.getElementById('gradeRow').classList.toggle('hidden', !isDrawMode);
  document.getElementById('checkBtnRow').classList.toggle('hidden', isDrawMode);

  if (isDrawMode) loadDrawCard(); else loadTypeCard();
}

// ── Draw-mode branch (hiragana / katakana / kanji) ──
function loadDrawCard() {
  revealed = false;
  document.getElementById('gradeRow').classList.remove('visible');
  document.getElementById('strokeWrap').classList.remove('visible');
  document.getElementById('strokeContainer').innerHTML = '';
  clearDrawCanvas();
  document.getElementById('drawSection').classList.remove('hidden');
  document.getElementById('overlayChar').classList.remove('visible');
  document.getElementById('compareBtn').disabled = true;
  document.getElementById('compareBtn').textContent = 'Compare';
  document.getElementById('readingInfo').classList.remove('visible');

  const item = queue[0];
  currentItem = item;
  currentChar = item.display;
  const hEl = document.getElementById('hiragana');
  hEl.style.transition = 'none';
  hEl.style.opacity = '0';
  hEl.classList.remove('visible');

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      hEl.textContent = item.display;
      document.getElementById('romaji').textContent = flashSetKey === 'kanji' ? '' : item.romaji;
      hEl.style.transition = '';
      updateProgress();
    });
  });

  fetchStrokeSvg(item.display).catch(() => {});
}

async function reveal() {
  if (revealed) return;
  revealed = true;
  document.getElementById('compareBtn').disabled = false;
  const hEl = document.getElementById('hiragana');
  hEl.style.opacity = '';
  hEl.classList.add('visible');
  document.getElementById('gradeRow').classList.add('visible');
  seen++;
  document.getElementById('seenCount').textContent = seen;

  if (flashSetKey === 'kanji') {
    const item = queue[0];
    document.getElementById('readingMeaning').textContent = item.meaning;
    document.getElementById('readingOn').textContent = item.onyomi.length ? item.onyomi.join('、') : '—';
    document.getElementById('readingKun').textContent = item.kunyomi.length ? item.kunyomi.join('、') : '—';
    document.getElementById('readingInfo').classList.add('visible');
  }

  const container = document.getElementById('strokeContainer');
  container.innerHTML = '<div class="stroke-msg">Loading…</div>';
  document.getElementById('strokeWrap').classList.add('visible');

  try {
    const rawSvg = await fetchStrokeSvg(currentItem.display);
    const svgEl = buildColoredSvg(rawSvg);
    if (svgEl) { container.innerHTML = ''; container.appendChild(svgEl); }
    else container.innerHTML = '<div class="stroke-msg">—</div>';
  } catch {
    container.innerHTML = '<div class="stroke-msg">unavailable</div>';
  }
}

function gradeDraw(correct) {
  const item = queue.shift();
  recordResult(`${flashSetKey}:${item.id}`, correct);
  finishGrading(correct, item);
  loadDrawCard();
}

function advanceDraw() {
  const item = queue.shift();
  queue.push(item);
  loadDrawCard();
}

// ── Type-mode branch (vocab) ──
function loadTypeCard() {
  const item = queue[0];
  currentItem = item;
  currentChar = item.display;

  document.getElementById('vocabJp').textContent = item.display;
  const input = document.getElementById('readingInput');
  input.value = '';
  input.disabled = false;
  input.classList.remove('correct','incorrect');
  document.getElementById('readingFeedback').textContent = '';
  document.getElementById('readingFeedback').className = 'type-feedback';
  document.getElementById('readingAnswer').classList.remove('visible');
  document.getElementById('checkBtn').disabled = false;
  document.getElementById('vocabNextBtn').disabled = true;
  updateProgress();
  setTimeout(() => input.focus(), 50);
}

function checkReading() {
  const input = document.getElementById('readingInput');
  const guess = input.value.trim().toLowerCase();
  if (guess === '') return;

  seen++;
  document.getElementById('seenCount').textContent = seen;

  const correct = guess === currentItem.romaji;
  const feedback = document.getElementById('readingFeedback');
  input.disabled = true;
  document.getElementById('checkBtn').disabled = true;
  document.getElementById('vocabNextBtn').disabled = false;

  if (correct) {
    input.classList.add('correct');
    feedback.textContent = '✓ Correct!';
    feedback.classList.add('correct');
  } else {
    input.classList.add('incorrect');
    feedback.textContent = `✗ It was "${currentItem.romaji}"`;
    feedback.classList.add('incorrect');
  }

  document.getElementById('answerKana').textContent = currentItem.reading || '';
  document.getElementById('answerMeaning').textContent = currentItem.meaning || '';
  document.getElementById('readingAnswer').classList.add('visible');

  const item = queue.shift();
  recordResult(`${flashSetKey}:${item.id}`, correct);
  finishGrading(correct, item);
}

function advanceType() {
  loadTypeCard();
}

// ── Shared bookkeeping ──
function finishGrading(correct, item) {
  if (correct) {
    right++;
    document.getElementById('rightCount').textContent = right;
  } else {
    wrong++;
    document.getElementById('wrongCount').textContent = wrong;
    const insertPos = queue.length === 0 ? 0 : Math.floor(Math.random() * queue.length) + 1;
    queue.splice(insertPos, 0, item);
  }

  if (queue.length === 0) {
    roundNumber++;
    flashRoundComplete();
    startNewRound();
  }
}

function flashRoundComplete() {
  const label = document.getElementById('progressLabel');
  label.textContent = '✓ All correct!';
  label.style.color = 'var(--green)';
  setTimeout(() => { label.style.color = ''; }, 1200);
}

function updateProgress() {
  const remaining = queue.length;
  const masteredThisRound = roundTotal - remaining;
  const pct = roundTotal === 0 ? 0 : (masteredThisRound / roundTotal) * 100;
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressLabel').textContent = `${masteredThisRound} / ${roundTotal} · round ${roundNumber}`;
}

// ── Event wiring ──
document.getElementById('revealBtn').addEventListener('click', reveal);
document.getElementById('nextBtn').addEventListener('click', () => { if (!revealed) reveal(); else advanceDraw(); });
document.getElementById('gradeGood').addEventListener('click', () => gradeDraw(true));
document.getElementById('gradeBad').addEventListener('click', () => gradeDraw(false));

document.getElementById('checkBtn').addEventListener('click', checkReading);
document.getElementById('vocabNextBtn').addEventListener('click', advanceType);
document.getElementById('readingInput').addEventListener('keydown', e => {
  if (e.code === 'Enter') {
    e.preventDefault();
    if (!document.getElementById('checkBtn').disabled) checkReading();
    else advanceType();
  }
});

document.addEventListener('keydown', e => {
  if (!document.getElementById('screenPractice').classList.contains('active')) return;
  if (flashSetKey === 'vocab') return; // vocab uses the text input's own Enter handling
  if (e.code === 'Space') { e.preventDefault(); reveal(); }
  if (e.code === 'ArrowRight' || e.code === 'Enter') { if (!revealed) reveal(); else advanceDraw(); }
  if (e.code === 'ArrowUp') gradeDraw(true);
  if (e.code === 'ArrowDown') gradeDraw(false);
});
