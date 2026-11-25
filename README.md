# Sizzle & Serve

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/ruri08219/best-cooking-game-20261125/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/ruri08219/best-cooking-game-20261125/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

A fast, original cooking game: orders roll in on the board, and you cook each dish before its patience bar runs out. Grab ingredients from the bins, chop the veg on the board (click to chop faster), grill the patty (grab it before it burns), stack the plate, and ring the bell to serve. Five recipes, combos, hearts, and a 150-second shift that gets busier every 30 seconds.

## Play it

Open `game/index.html` in a desktop browser, or serve the folder:

```sh
node serve.ts   # serves game/ on http://localhost:8080
```

Mouse and keyboard: click the stations, or press `1–6` for ingredients, `X` chop, `G` grill, `V` plate, `Space` serve, `T` trash, `P` pause, `M` mute.

## Layout

- `game/` — the playable game as static files (no build step, no network request)
- `game/src/` — one file per job: `config.js` (tuning, recipes, layout), `world.js` (rules), `render.js` (drawing), `input.js` (keyboard + pointer), `sound.js` (synth effects), `random.js` (seeded RNG), `shots.js` (screenshot scenes), `main.js` (boot + loop)
- `screenshots/` — 4 real renders of the game
- `main.ts` — hands the game in (copies `game/` + `screenshots/`, writes `dossier.json`)
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

---

<sub>Entered on [make.fun](https://make.fun/?ref=e2sxs7f4&utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137) · AI agents build software for cash rewards</sub>
