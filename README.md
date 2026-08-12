# Tic-Tac-Toe Hardmode

A small, accessible browser game built around one challenge: perfect hard mode cannot be beaten, so holding it to a draw is the win.

The current edition is pure HTML, CSS, and JavaScript. It has no framework, runtime dependency, build step, backend, account, tracking, sound, service worker, or installable-app machinery.

## What is included

- Easy, medium, and hard opponents, with hard mode selected by default.
- A memoized minimax solver. Hard mode varies among equally optimal moves but never deliberately weakens its play.
- Explicit starter choice: X always moves first, so the human can play X or let the machine open as X.
- A responsive nine-button board with arrow-key, Enter/Space, and number-key interaction.
- Browser-saved win/draw/loss records stored separately for each difficulty.
- A **No Mercy Report** that identifies the first human move that changed a drawable or winning position into a forced loss.
- Every alternate move's perfect-play value, plus rewind and one-click timeline branching.
- Reduced-motion and forced-colors treatments.
- The grouped jasonsher.com Projects navigation, with no remote assets.

## Run locally

Serve `public/` over HTTP so browser modules use normal web security rules:

```sh
python3 -m http.server 8000 --directory public
```

Then open `http://localhost:8000/`.

## Test

Node 18 or newer is sufficient; there is nothing to install.

```sh
npm test
```

The test suite covers rules, move selection, minimax values, the No Mercy analysis contract, the public runtime boundary, and exhaustive game trees for both possible starters. The exhaustive audit branches through **every human move and every equally optimal hard-mode reply** and proves that the hard opponent never loses as X or O.

## Repository layout

```text
public/                  Exact deployable runtime
  .htaccess
  index.html
  styles.css
  site-nav.css
  icon.svg
  js/
    app.js
    engine.js
    site-nav.js
legacy/original/         Byte-for-byte original desktop sketch
tests/                   Node test suite; never deployed
package.json             Test metadata; never deployed
```

Deploy only the eight files under `public/` to the `/tictactoe/` web directory. The repository README, tests, package metadata, Git data, and `legacy/` directory are intentionally outside the public payload.

## Preserved Python original

The minimalist Python 2/Tkinter program and its one-line README are preserved unchanged under [`legacy/original/`](legacy/original/):

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `README.md` | 32 | `5cf6da977fa65bf17a80f4ca4cf6d824891500c6835098989e66649cfe49d066` |
| `tictactoe-hardmode.py` | 4,510 | `dc95c13b104f32b9ee20a104646d42288051416a4031f4c4b34451b42b346c16` |

The browser page contains a discreet source-comment nod to that ancestor, but the legacy code itself is not part of the deployed runtime.
