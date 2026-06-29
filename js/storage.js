// ══════════════════════════════════════════════════════════════════
//  STORAGE — one unified schema, with one-time migration from the
//  four standalone apps' separate localStorage keys.
// ══════════════════════════════════════════════════════════════════
const STORAGE_KEY = 'nihongo-stats-v1';
const STREAK_KEY = 'nihongo-streak-v1';
const MIGRATION_FLAG_KEY = 'nihongo-migrated-v1';

// stats["set:id"] = { seen, correct, lastResult }
let stats = {};
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

function registerActivityToday() {
  const today = todayStr();
  if (streakData.lastDate === today) return;
  if (streakData.lastDate) {
    const gap = daysBetween(streakData.lastDate, today);
    if (gap === 1) streakData.count += 1;
    else if (gap > 1) streakData.count = 1;
  } else {
    streakData.count = 1;
  }
  streakData.lastDate = today;
  saveStreak();
  renderStreakBadge();
}

function renderStreakBadge() {
  const badge = document.getElementById('streakBadge');
  if (!badge) return;
  const n = streakData.count || 0;
  badge.textContent = n > 0 ? `🔥 ${n} day streak` : '🔥 0 day streak';
  badge.classList.toggle('active', n > 0);
}

// recordResult now takes a SET-QUALIFIED key ("hiragana:ka", "kanji:水", "vocab:今日")
function recordResult(key, correct) {
  if (!stats[key]) stats[key] = { seen: 0, correct: 0, lastResult: null };
  stats[key].seen++;
  if (correct) stats[key].correct++;
  stats[key].lastResult = correct ? 'right' : 'wrong';
  saveStats();
  registerActivityToday();
}

function masteryLevel(key) {
  const s = stats[key];
  if (!s || s.seen === 0) return 0;
  const acc = s.correct / s.seen;
  if (s.lastResult === 'wrong') return 1;
  if (acc >= 0.8 && s.seen >= 3) return 3;
  if (acc >= 0.5) return 2;
  return 1;
}

function paintMasteryDots() {
  document.querySelectorAll('.mastery-dot').forEach(dot => {
    const key = dot.dataset.dotFor;
    const lvl = masteryLevel(key);
    dot.classList.remove('level-1','level-2','level-3');
    if (lvl > 0) dot.classList.add(`level-${lvl}`);
  });

  document.querySelectorAll('.accuracy-line').forEach(line => {
    const key = line.dataset.accFor;
    const s = stats[key];
    line.classList.remove('acc-low','acc-mid','acc-high');
    if (!s || s.seen === 0) { line.textContent = ''; return; }
    const pct = Math.round((s.correct / s.seen) * 100);
    line.textContent = pct + '%';
    if (pct < 50) line.classList.add('acc-low');
    else if (pct < 80) line.classList.add('acc-mid');
    else line.classList.add('acc-high');
  });
}

// Aggregate stats for a whole set (used on the Library home screen)
function setSummary(setKey) {
  const groups = SETS[setKey].groups;
  let total = 0, attempted = 0, solid = 0;
  groups.forEach(g => g.items.forEach(item => {
    total++;
    const key = `${setKey}:${item.id}`;
    const s = stats[key];
    if (s && s.seen > 0) attempted++;
    if (masteryLevel(key) === 3) solid++;
  }));
  return { total, attempted, solid };
}

// ══════════════════════════════════════════════════════════════════
//  MIGRATION — pulls progress from the 4 standalone apps' old keys,
//  if present, into the unified schema. Runs once; sets a flag so
//  it never re-runs (and never overwrites progress made in this app).
// ══════════════════════════════════════════════════════════════════
function migrateOldData() {
  if (localStorage.getItem(MIGRATION_FLAG_KEY)) return; // already done

  const OLD_KEYS = {
    hiragana: { stats: 'hiragana-stats-v1', streak: 'hiragana-streak-v1' },
    katakana: { stats: 'katakana-stats-v1', streak: 'katakana-streak-v1' },
    kanji:    { stats: 'kanji-stats-v1',    streak: 'kanji-streak-v1' },
    vocab:    { stats: 'vocab-stats-v1',    streak: 'vocab-streak-v1' },
  };

  let migratedAny = false;
  let bestStreak = { count: 0, lastDate: null };

  Object.entries(OLD_KEYS).forEach(([setKey, keys]) => {
    try {
      const rawStats = localStorage.getItem(keys.stats);
      if (rawStats) {
        const oldStats = JSON.parse(rawStats);
        // Old stats were keyed by bare id (romaji / kanji char / jp word) — requalify with set prefix
        Object.entries(oldStats).forEach(([oldId, record]) => {
          const newKey = `${setKey}:${oldId}`;
          // Don't clobber if somehow already present
          if (!stats[newKey]) {
            stats[newKey] = record;
            migratedAny = true;
          }
        });
      }
    } catch {}

    try {
      const rawStreak = localStorage.getItem(keys.streak);
      if (rawStreak) {
        const oldStreak = JSON.parse(rawStreak);
        // Take whichever old app had the most recent/longest streak as the merged starting point
        if (oldStreak.lastDate && (!bestStreak.lastDate || oldStreak.lastDate > bestStreak.lastDate)) {
          bestStreak = oldStreak;
        } else if (oldStreak.count > bestStreak.count && oldStreak.lastDate === bestStreak.lastDate) {
          bestStreak = oldStreak;
        }
      }
    } catch {}
  });

  if (migratedAny) saveStats();
  if (bestStreak.lastDate && !streakData.lastDate) {
    streakData = bestStreak;
    saveStreak();
  }

  localStorage.setItem(MIGRATION_FLAG_KEY, '1');

  if (migratedAny) {
    console.log('[nihongo] Migrated progress from standalone apps into unified storage.');
  }
}
