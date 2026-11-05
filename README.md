# Molt Cara Companyona — season site

A static site for Season 1 of *The Historian's Notebook*. No build step, no framework.

## Publish on GitHub Pages
1. Create a repository (or a folder in an existing Pages repo) and upload everything in this folder, keeping the structure.
2. In the repository: Settings → Pages → Deploy from a branch → `main` / root (or the folder).
3. The site loads its own files by relative path, so it works at any URL.

To preview on your own computer, run a small local server from this folder (opening `index.html` directly blocks the files the hero and map load):

    python3 -m http.server 8000

then visit http://localhost:8000.

## Where things live
- `index.html` — all the page text
- `css/site.css` — colours, type, layout (palette variables at the top)
- `js/hero.js` — the salutation writing itself
- `js/letter.js` — scroll scene 1 (folio 17v) and the loupe
- `js/map.js` — scroll scene 2 (the map)
- `js/calendar.js` — the episode calendar
- `data/letter.js` — line positions, transcription, passages, glosses for f. 17v
- `data/episodes.js` — the 182 episodes (taken from the episode pages on jonathanseyfried.net)
- `data/places.js` — map places and which episodes are plotted to each
- `assets/` — the folio (original and ink-lifted), the traced salutation, the map outline

## Editing notes
- Glosses on the letter: edit `glosses` in `data/letter.js` (`line`, `x0`/`x1` in image pixels, `w` = the word, `g` = the note).
- Map destinations: edit the `eps` arrays in `data/places.js` (episode numbers plotted to each place). 123 of the 182 episodes are placed; recipients without a clear seat are left off.
- Manuscript images: ACA, Cancillería, Registros 2037, via PARES. Coastlines: Natural Earth.
