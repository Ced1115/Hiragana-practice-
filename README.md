# Hiragana Flashcards

A simple offline-capable PWA for practicing hiragana — flashcards with stroke order and handwriting practice, plus a typing mode for short words and combos.

**Live app:** https://ced1115.github.io/Hiragana-practice-/

## Features

- **Flashcard mode** — see the romaji, draw the character, reveal to check yourself against the real shape, stroke order diagram, and an overlay comparison.
- **Typing mode** — see a hiragana word or combo, type the romaji reading. Pulls from a small curated word list (with meanings) when possible, otherwise falls back to random character combos.
- **Mastery queue** — characters you miss get reshuffled back into the round; a round only resets once everything's been answered correctly at least once.
- **Progress tracking** — per-character accuracy and a daily streak, saved locally in the browser (`localStorage`), so progress persists across sessions on the same device.
- **Installable** — has a manifest and service worker, so it can be added to your phone's home screen and works offline after the first load (stroke order diagrams are cached as you see them).

## Project structure

```
index.html          entry point
manifest.json        PWA metadata (name, icons, theme)
service-worker.js    offline caching
css/
  style.css          all styling
js/
  data.js            hiragana groups + word list
  storage.js          localStorage stats/streak logic
  strokes.js           fetches & renders stroke order (KanjiVG)
  drawpad.js            handwriting canvas
  selection.js          character selection screen + mode picker
  flashcards.js         flashcard mode logic
  typing.js              typing mode logic
icons/
  icon-192.png, icon-512.png
```

## Stroke order data

Stroke order diagrams are fetched live from [KanjiVG](https://github.com/KanjiVG/kanjivg) (via jsDelivr), an open-source project providing stroke data for kana and kanji. Requires an internet connection the first time each character is viewed; cached afterward.

## Running locally

No build step — just open `index.html` in a browser, or serve the folder with any static file server, e.g.:

```
python3 -m http.server 8000
```

## Notes

- Progress and streaks are stored per-browser via `localStorage`. Clearing site data/cache will reset them.
- This is a personal learning tool, not a polished product — built incrementally with Claude.
