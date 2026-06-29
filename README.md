# Nihongo — Japanese Practice (merged app)

One PWA combining hiragana, katakana, kanji, and JLPT vocabulary practice — previously four separate apps, now sharing one progress system, one streak, and one home screen.

## Status

**Pass 1 of 2.** This merge focuses on getting one solid shell with working migration from the four standalone apps. Phrase/sentence practice (translating short sentences using kana + kanji + vocab together) is the planned pass 2, built on top of this foundation.

## Features

- **Library home screen** — pick a set (Hiragana / Katakana / Kanji / Vocab), each card showing live progress (X / Y "solid").
- **Per-set selection screens** — same grouping as the standalone apps (kana rows, kanji grades, vocab themes with N5/N4 quick filters).
- **Two practice modes per set:**
  - *Flashcards* — draw-pad + stroke order + reveal for hiragana/katakana/kanji; type-the-romaji + reveal for vocab.
  - *Typing / Quiz* — typed romaji for kana word/combos; multiple-choice meaning-matching for kanji; bidirectional multiple-choice for vocab.
- **One mastery queue** — same "repeat misses, clear round on 100%" mechanic across all four sets.
- **One streak, one stats schema** — every practiced item is stored as `"set:id"` (e.g. `hiragana:ka`, `kanji:水`, `vocab:今日`), so progress is unified instead of fragmented across four separate `localStorage` keys.
- **Automatic migration** — on first load, pulls progress from the four standalone apps' old `localStorage` keys (if present on the same device/browser) into the unified schema, then sets a flag so it never re-runs or overwrites newer progress. Picks whichever old app had the most recent streak as the merged starting point.
- **Installable** — manifest + service worker, works offline after first load (stroke order diagrams cached as you view them).

## Project structure

```
index.html            entry point — all 4 screens (library, selection, flashcards, quiz)
manifest.json          PWA metadata
service-worker.js      offline caching
css/
  style.css            all styling for every screen/set
js/
  data.js              unified schema: all 4 sets' data, normalized to one item shape
  storage.js            stats/streak logic + one-time migration from standalone apps
  strokes.js             KanjiVG stroke order fetching/rendering (kana + kanji)
  drawpad.js              handwriting canvas + compare overlay
  shell.js                library screen, set navigation
  selection.js            selection screen builder (grid for kana/kanji, list for vocab)
  flashcards.js           flashcard mode (draw branch + type branch)
  typing.js               quiz/typing mode (3 branches: kana, kanji, vocab)
icons/
  icon-192.png, icon-512.png
```

## The unified data shape

Every practicable item — a hiragana, a katakana, a kanji, a vocab word — is normalized to:

```js
{ id, set, display, reading, romaji, meaning, group, level, type }
```

`id` is unique *within* its set (was: romaji for kana, the character for kanji, the word for vocab). Stats are keyed by `"set:id"` so nothing collides across sets. This is what makes a future phrase mode possible — a sentence can reference items across all four sets through one consistent lookup (`ITEM_LOOKUP["kanji:水"]`, `ITEM_LOOKUP["vocab:飲む"]`, etc).

## Migration details

On first load, `migrateOldData()` checks for these old keys:

| Set | Old stats key | Old streak key |
|---|---|---|
| Hiragana | `hiragana-stats-v1` | `hiragana-streak-v1` |
| Katakana | `katakana-stats-v1` | `katakana-streak-v1` |
| Kanji | `kanji-stats-v1` | `kanji-streak-v1` |
| Vocab | `vocab-stats-v1` | `vocab-streak-v1` |

If found, each old record is re-keyed with its set prefix and merged into `nihongo-stats-v1`. The streak with the most recent `lastDate` wins as the merged streak's starting point. A flag (`nihongo-migrated-v1`) ensures this runs exactly once — it will never re-run and never overwrite progress made after the merge, even if the old keys are still sitting in `localStorage`.

**Important:** migration only works if this app is opened in the *same browser, same device* as the standalone apps were used in — `localStorage` doesn't sync across browsers or devices on its own.

## Stroke order data

Fetched live from [KanjiVG](https://github.com/KanjiVG/kanjivg) via jsDelivr. Needs an internet connection the first time each character is viewed; cached afterward (in both `localStorage`-backed in-memory cache and the service worker's cache).

## Running locally

No build step:

```
python3 -m http.server 8000
```

## Notes

- This is a personal learning tool, not a polished product — built incrementally with Claude.
- The four standalone apps (hiragana-app, katakana-app, kanji-app, vocab-app) still work independently if you'd rather keep using them separately; this merged app is additive, not a replacement requirement.
