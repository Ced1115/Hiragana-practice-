// ══════════════════════════════════════════════════════════════════
//  QUIZ MODE — three behaviors sharing one mastery-queue engine:
//    - hiragana/katakana: type the romaji for a word/combo
//    - kanji: meaning shown, pick the kanji from 4 options
//    - vocab: bidirectional meaning-matching, 4 options
// ══════════════════════════════════════════════════════════════════
let quizQueue = [];
let quizRoundTotal = 0;
let quizRoundNumber = 1;
let quizSeen = 0, quizRight = 0, quizWrong = 0;
let quizAnswered = false;
let currentQuizItem = null;
let quizAllCards = [];
let quizSetKey = null;

function shuffleQ(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── deck builders per set type ──

function randomKanaCombo(selectedArr, charMap) {
  const len = Math.random() < 0.5 ? 2 : 3;
  const picks = [];
  for (let i = 0; i < len; i++) picks.push(selectedArr[Math.floor(Math.random() * selectedArr.length)]);
  return {
    h: picks.map(p => p.display).join(''),
    r: picks.map(p => p.romaji).join(''),
    isWord: false
  };
}

function buildKanaTypeDeck(setKey) {
  quizAllCards = SETS[setKey].groups.flatMap(g => g.items).filter(it => selected.has(it.id));
  const selectedSet = new Set(quizAllCards.map(it => it.id));
  const charMap = setKey === 'hiragana' ? HIRAGANA_CHAR_TO_ROMAJI : KATAKANA_CHAR_TO_ROMAJI;
  const wordPool = SETS[setKey].words || [];

  const realWords = wordPool
    .filter(w => wordUsesOnlySelected(w, selectedSet, charMap))
    .map(w => ({ h: w.h, r: w.r, isWord: true, meaning: w.meaning, kanji: w.kanji }));

  const targetSize = Math.max(6, Math.min(20, quizAllCards.length));
  let deck = shuffleQ([...realWords]).slice(0, targetSize);

  while (deck.length < targetSize && quizAllCards.length >= 2) {
    deck.push(randomKanaCombo(quizAllCards, charMap));
  }
  if (quizAllCards.length === 1) {
    deck = [{ h: quizAllCards[0].display, r: quizAllCards[0].romaji, isWord: false }];
  }
  return shuffleQ(deck);
}

function buildKanjiQuizDeck() {
  quizAllCards = SETS.kanji.groups.flatMap(g => g.items).filter(it => selected.has(it.id));
  return shuffleQ([...quizAllCards]);
}

function buildVocabQuizDeck() {
  quizAllCards = SETS.vocab.groups.flatMap(g => g.items).filter(it => selected.has(it.id));
  return shuffleQ(quizAllCards.map(w => ({
    word: w,
    direction: Math.random() < 0.5 ? 'jp-to-en' : 'en-to-jp'
  })));
}

function startQuizSession(setKey) {
  quizSetKey = setKey;
  quizRoundNumber = 1;
  quizSeen = 0; quizRight = 0; quizWrong = 0;
  ['typeSeenCount','typeRightCount','typeWrongCount'].forEach(id => document.getElementById(id).textContent = '0');

  if (setKey === 'hiragana' || setKey === 'katakana') {
    quizQueue = buildKanaTypeDeck(setKey);
  } else if (setKey === 'kanji') {
    quizQueue = buildKanjiQuizDeck();
  } else {
    quizQueue = buildVocabQuizDeck();
  }
  quizRoundTotal = quizQueue.length;

  document.getElementById('kanaTypeArea').classList.toggle('hidden', setKey !== 'hiragana' && setKey !== 'katakana');
  document.getElementById('quizOptionsArea').classList.toggle('hidden', setKey === 'hiragana' || setKey === 'katakana');

  loadQuizItem();
}

function loadQuizItem() {
  quizAnswered = false;
  const item = quizQueue[0];
  currentQuizItem = item;

  if (quizSetKey === 'hiragana' || quizSetKey === 'katakana') {
    loadKanaTypeItem(item);
  } else if (quizSetKey === 'kanji') {
    loadKanjiQuizItem(item);
  } else {
    loadVocabQuizItem(item);
  }
  updateQuizProgress();
}

// ── kana branch: typed romaji ──
function loadKanaTypeItem(item) {
  document.getElementById('typeHiragana').textContent = item.h;
  document.getElementById('typeWordHint').textContent = item.isWord ? '(real word)' : '';
  const input = document.getElementById('typeInput');
  input.value = '';
  input.disabled = false;
  input.classList.remove('correct','incorrect');
  document.getElementById('typeFeedback').textContent = '';
  document.getElementById('typeFeedback').className = 'type-feedback';
  document.getElementById('typeWordInfo').classList.remove('visible');
  document.getElementById('typeSubmitBtn').disabled = false;
  document.getElementById('typeNextBtn').disabled = true;
  setTimeout(() => input.focus(), 50);
}

function checkKanaType() {
  if (quizAnswered) return;
  const input = document.getElementById('typeInput');
  const guess = input.value.trim().toLowerCase();
  if (guess === '') return;

  quizAnswered = true;
  quizSeen++;
  document.getElementById('typeSeenCount').textContent = quizSeen;

  const correct = guess === currentQuizItem.r;
  const feedback = document.getElementById('typeFeedback');
  input.disabled = true;
  document.getElementById('typeSubmitBtn').disabled = true;
  document.getElementById('typeNextBtn').disabled = false;

  if (correct) {
    quizRight++;
    document.getElementById('typeRightCount').textContent = quizRight;
    input.classList.add('correct');
    feedback.textContent = '✓ Correct!';
    feedback.classList.add('correct');
  } else {
    quizWrong++;
    document.getElementById('typeWrongCount').textContent = quizWrong;
    input.classList.add('incorrect');
    feedback.textContent = `✗ It was "${currentQuizItem.r}"`;
    feedback.classList.add('incorrect');
  }

  if (currentQuizItem.isWord) {
    const infoEl = document.getElementById('typeWordInfo');
    document.getElementById('typeWordKanji').textContent = currentQuizItem.kanji || currentQuizItem.h;
    document.getElementById('typeWordMeaning').textContent = currentQuizItem.meaning || '';
    infoEl.classList.add('visible');
  }

  // Record per-character stats for every character in the word/combo
  const charMap = quizSetKey === 'hiragana' ? HIRAGANA_CHAR_TO_ROMAJI : KATAKANA_CHAR_TO_ROMAJI;
  for (const ch of currentQuizItem.h) {
    const romaji = charMap[ch];
    if (romaji) recordResult(`${quizSetKey}:${romaji}`, correct);
  }

  requeueOrFinish(correct, () => quizSetKey === 'hiragana' || quizSetKey === 'katakana' ? buildKanaTypeDeck(quizSetKey) : []);
}

// ── kanji branch: multiple choice from meaning ──
function pickKanjiDistractors(correctItem, count) {
  const pool = quizAllCards.length >= count + 1 ? quizAllCards : SETS.kanji.groups.flatMap(g => g.items);
  return shuffleQ([...pool.filter(it => it.id !== correctItem.id)]).slice(0, count);
}

function loadKanjiQuizItem(item) {
  document.getElementById('typeWordHint').textContent = item.meaning;
  const distractors = pickKanjiDistractors(item, 3);
  const options = shuffleQ([item, ...distractors]);

  const optionsWrap = document.getElementById('quizOptions');
  optionsWrap.innerHTML = '';
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option';
    btn.textContent = opt.display;
    btn.dataset.key = opt.id;
    btn.addEventListener('click', () => selectKanjiOption(opt.id, btn));
    optionsWrap.appendChild(btn);
  });

  document.getElementById('typeFeedback').textContent = '';
  document.getElementById('typeFeedback').className = 'type-feedback';
  document.getElementById('typeWordInfo').classList.remove('visible');
  document.getElementById('typeNextBtn').disabled = true;
}

function selectKanjiOption(chosenId, btnEl) {
  if (quizAnswered) return;
  quizAnswered = true;
  quizSeen++;
  document.getElementById('typeSeenCount').textContent = quizSeen;

  const correct = chosenId === currentQuizItem.id;
  const feedback = document.getElementById('typeFeedback');

  document.querySelectorAll('.quiz-option').forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.key === currentQuizItem.id) btn.classList.add('correct');
    else if (btn === btnEl) btn.classList.add('incorrect');
  });
  document.getElementById('typeNextBtn').disabled = false;

  if (correct) {
    quizRight++;
    document.getElementById('typeRightCount').textContent = quizRight;
    feedback.textContent = '✓ Correct!';
    feedback.classList.add('correct');
  } else {
    quizWrong++;
    document.getElementById('typeWrongCount').textContent = quizWrong;
    feedback.textContent = `✗ It was ${currentQuizItem.display}`;
    feedback.classList.add('incorrect');
  }

  const infoEl = document.getElementById('typeWordInfo');
  document.getElementById('typeWordKanji').textContent = currentQuizItem.display;
  const onText = currentQuizItem.onyomi.length ? 'On: ' + currentQuizItem.onyomi.join('、') : '';
  const kunText = currentQuizItem.kunyomi.length ? 'Kun: ' + currentQuizItem.kunyomi.join('、') : '';
  document.getElementById('typeWordMeaning').textContent = [onText, kunText].filter(Boolean).join('  ·  ');
  infoEl.classList.add('visible');

  recordResult(`kanji:${currentQuizItem.id}`, correct);
  requeueOrFinish(correct, buildKanjiQuizDeck);
}

// ── vocab branch: bidirectional meaning quiz ──
function pickVocabDistractors(correctWord, count) {
  const pool = quizAllCards.length >= count + 1 ? quizAllCards : SETS.vocab.groups.flatMap(g => g.items);
  return shuffleQ([...pool.filter(w => w.id !== correctWord.id)]).slice(0, count);
}

function loadVocabQuizItem(item) {
  const word = item.word;
  const promptEl = document.getElementById('typeWordHint');
  const optionsWrap = document.getElementById('quizOptions');
  optionsWrap.innerHTML = '';

  const distractors = pickVocabDistractors(word, 3);
  const optionWords = shuffleQ([word, ...distractors]);

  if (item.direction === 'jp-to-en') {
    promptEl.innerHTML = `<span class="quiz-jp-prompt">${word.display}</span><span class="quiz-jp-kana">${word.reading || ''}</span>`;
    optionWords.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option quiz-option-text';
      btn.textContent = opt.meaning;
      btn.dataset.key = opt.id;
      btn.addEventListener('click', () => selectVocabOption(opt.id, btn));
      optionsWrap.appendChild(btn);
    });
  } else {
    promptEl.innerHTML = `<span class="quiz-meaning-prompt">${word.meaning}</span>`;
    optionWords.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option quiz-option-jp';
      btn.innerHTML = `<span class="quiz-option-jp-main">${opt.display}</span><span class="quiz-option-jp-kana">${opt.reading || ''}</span>`;
      btn.dataset.key = opt.id;
      btn.addEventListener('click', () => selectVocabOption(opt.id, btn));
      optionsWrap.appendChild(btn);
    });
  }

  document.getElementById('typeFeedback').textContent = '';
  document.getElementById('typeFeedback').className = 'type-feedback';
  document.getElementById('typeWordInfo').classList.remove('visible');
  document.getElementById('typeNextBtn').disabled = true;
}

function selectVocabOption(chosenId, btnEl) {
  if (quizAnswered) return;
  quizAnswered = true;
  quizSeen++;
  document.getElementById('typeSeenCount').textContent = quizSeen;

  const word = currentQuizItem.word;
  const correct = chosenId === word.id;
  const feedback = document.getElementById('typeFeedback');

  document.querySelectorAll('.quiz-option').forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.key === word.id) btn.classList.add('correct');
    else if (btn === btnEl) btn.classList.add('incorrect');
  });
  document.getElementById('typeNextBtn').disabled = false;

  if (correct) {
    quizRight++;
    document.getElementById('typeRightCount').textContent = quizRight;
    feedback.textContent = '✓ Correct!';
    feedback.classList.add('correct');
  } else {
    quizWrong++;
    document.getElementById('typeWrongCount').textContent = quizWrong;
    feedback.textContent = `✗ It was ${word.display} (${word.meaning})`;
    feedback.classList.add('incorrect');
  }

  const infoEl = document.getElementById('typeWordInfo');
  document.getElementById('typeWordKanji').textContent = word.display + '  ·  ' + (word.reading || '');
  document.getElementById('typeWordMeaning').textContent = `${word.meaning}  ·  ${word.level || ''} ${word.type || ''}`;
  infoEl.classList.add('visible');

  recordResult(`vocab:${word.id}`, correct);

  const item = quizQueue.shift();
  if (!correct) {
    item.direction = Math.random() < 0.5 ? 'jp-to-en' : 'en-to-jp';
    const insertPos = quizQueue.length === 0 ? 0 : Math.floor(Math.random() * quizQueue.length) + 1;
    quizQueue.splice(insertPos, 0, item);
  }
  if (quizQueue.length === 0) {
    quizRoundNumber++;
    flashQuizRoundComplete();
    quizQueue = buildVocabQuizDeck();
    quizRoundTotal = quizQueue.length;
  }
}

// ── shared helpers (kana-type and kanji branches use this; vocab has its own inline version above
//    because its items aren't simple "shift from front" cards but {word, direction} wrappers) ──
function requeueOrFinish(correct, rebuildDeckFn) {
  const item = quizQueue.shift();
  if (!correct) {
    const insertPos = quizQueue.length === 0 ? 0 : Math.floor(Math.random() * quizQueue.length) + 1;
    quizQueue.splice(insertPos, 0, item);
  }
  if (quizQueue.length === 0) {
    quizRoundNumber++;
    flashQuizRoundComplete();
    quizQueue = rebuildDeckFn();
    quizRoundTotal = quizQueue.length;
  }
}

function advanceQuizItem() {
  if (!quizAnswered) return;
  loadQuizItem();
}

function flashQuizRoundComplete() {
  const label = document.getElementById('typeProgressLabel');
  label.textContent = '✓ All correct!';
  label.style.color = 'var(--green)';
  setTimeout(() => { label.style.color = ''; }, 1200);
}

function updateQuizProgress() {
  const remaining = quizQueue.length;
  const mastered = quizRoundTotal - remaining;
  const pct = quizRoundTotal === 0 ? 0 : (mastered / quizRoundTotal) * 100;
  document.getElementById('typeProgressFill').style.width = pct + '%';
  document.getElementById('typeProgressLabel').textContent = `${mastered} / ${quizRoundTotal} · round ${quizRoundNumber}`;
}

document.getElementById('typeSubmitBtn').addEventListener('click', checkKanaType);
document.getElementById('typeNextBtn').addEventListener('click', advanceQuizItem);

document.getElementById('typeInput').addEventListener('keydown', e => {
  if (e.code === 'Enter') {
    e.preventDefault();
    if (!quizAnswered) checkKanaType();
    else advanceQuizItem();
  }
});
