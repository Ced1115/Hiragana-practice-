// ══════════════════════════════════════════════════════════════════
//  PERSISTENT STORAGE  (localStorage — survives reloads, same device)
// ══════════════════════════════════════════════════════════════════
const STORAGE_KEY = 'hiragana-stats-v1';
const STREAK_KEY   = 'hiragana-streak-v1';

// stats[romaji] = { seen: n, correct: n, lastResult: 'right'|'wrong'|null }
let stats = {};
// streakData = { count: n, lastDate: 'YYYY-MM-DD' }
let streakData = { count: 0, lastDate: null };

function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    stats = raw ? JSON.parse(raw) : {};
  } catch { stats = {}; }
}
function saveStats() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stats)); } catch {}
}

function loadStreak() {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    streakData = raw ? JSON.parse(raw) : { count: 0, lastDate: null };
  } catch { streakData = { count: 0, lastDate: null }; }
}
function saveStreak() {
  try { localStorage.setItem(STREAK_KEY, JSON.stringify(streakData)); } catch {}
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

// Call once per "Got it" / "Missed" action during a session to bump the streak
function registerActivityToday() {
  const today = todayStr();
  if (streakData.lastDate === today) return; // already counted today
  if (streakData.lastDate) {
    const gap = daysBetween(streakData.lastDate, today);
    if (gap === 1) streakData.count += 1;       // consecutive day
    else if (gap > 1) streakData.count = 1;     // streak broken, restart
    // gap === 0 already handled above
  } else {
    streakData.count = 1; // first ever session
  }
  streakData.lastDate = today;
  saveStreak();
  renderStreakBadge();
}

function renderStreakBadge() {
  const badge = document.getElementById('streakBadge');
  const n = streakData.count || 0;
  badge.textContent = n > 0 ? `🔥 ${n} day streak` : '🔥 0 day streak';
  badge.classList.toggle('active', n > 0);
}

function recordResult(romaji, correct) {
  if (!stats[romaji]) stats[romaji] = { seen: 0, correct: 0, lastResult: null };
  stats[romaji].seen++;
  if (correct) stats[romaji].correct++;
  stats[romaji].lastResult = correct ? 'right' : 'wrong';
  saveStats();
  registerActivityToday();
}

// Mastery level 0–3 used to color the dot on the selection grid:
// 0 = never practiced, 1 = attempted but shaky, 2 = decent, 3 = solid
function masteryLevel(romaji) {
  const s = stats[romaji];
  if (!s || s.seen === 0) return 0;
  const acc = s.correct / s.seen;
  if (s.lastResult === 'wrong') return 1;       // most recent attempt was a miss
  if (acc >= 0.8 && s.seen >= 3) return 3;       // solid track record
  if (acc >= 0.5) return 2;
  return 1;
}

function paintMasteryDots() {
  document.querySelectorAll('.mastery-dot').forEach(dot => {
    const r = dot.dataset.dotFor;
    const lvl = masteryLevel(r);
    dot.classList.remove('level-1','level-2','level-3');
    if (lvl > 0) dot.classList.add(`level-${lvl}`);
  });

  document.querySelectorAll('.accuracy-line').forEach(line => {
    const r = line.dataset.accFor;
    const s = stats[r];
    line.classList.remove('acc-low','acc-mid','acc-high');
    if (!s || s.seen === 0) {
      line.textContent = '';
      return;
    }
    const pct = Math.round((s.correct / s.seen) * 100);
    line.textContent = pct + '%';
    if (pct < 50) line.classList.add('acc-low');
    else if (pct < 80) line.classList.add('acc-mid');
    else line.classList.add('acc-high');
  });
}
