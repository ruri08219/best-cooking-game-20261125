// The game's rules and state, with no drawing and no browser in it: orders on
// the board, the tray, the chopping board, the grill, the plate, the serving
// window, score, combo, hearts and the shift timer. step() advances one fixed
// step and returns what happened as bit flags, so the caller can react (sounds,
// announcements) without the world knowing about screens or sound.

import {
  CHOP_CLICK_BONUS,
  CHOP_SECONDS,
  GRILL_BURN_AFTER,
  GRILL_SECONDS,
  GRILL_SLOTS,
  HEARTS,
  INGREDIENTS,
  itemKey,
  LAYOUT,
  LEVEL,
  ORDER,
  PLATE_MAX,
  RECIPES,
  SCORE,
  SHIFT_SECONDS,
  STEP,
  TRAY_MAX,
} from './config.js';
import { pick } from './random.js';

export const EVENT_PICKUP = 1;
export const EVENT_CHOP = 2;
export const EVENT_CHOP_DONE = 4;
export const EVENT_GRILL_START = 8;
export const EVENT_GRILL_DONE = 16;
export const EVENT_BURN = 32;
export const EVENT_SERVE = 64;
export const EVENT_MISS = 128;
export const EVENT_ERROR = 256;
export const EVENT_OVER = 512;
export const EVENT_TRASH = 1024;

const BIN_ORDER = ['bun', 'patty', 'lettuce', 'tomato', 'cheese', 'onion'];

function inside(rect, x, y) {
  return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

/** The six ingredient bins sit 2 across, 3 down, inside the bins panel. */
export function binRect(index) {
  const panel = LAYOUT.bins;
  const cols = 2;
  const rows = 3;
  const gap = 8;
  const w = (panel.w - gap * (cols + 1)) / cols;
  const h = (panel.h - 28 - gap * (rows + 1)) / rows;
  const col = index % cols;
  const row = Math.floor(index / cols);
  return {
    x: panel.x + gap + col * (w + gap),
    y: panel.y + 28 + gap + row * (h + gap),
    w,
    h,
  };
}

function sameMultiset(a, b) {
  if (a.length !== b.length) return false;
  const counts = new Map();
  for (const item of a) counts.set(itemKey(item), (counts.get(itemKey(item)) ?? 0) + 1);
  for (const item of b) {
    const key = itemKey(item);
    const left = counts.get(key) ?? 0;
    if (left === 0) return false;
    counts.set(key, left - 1);
  }
  return true;
}

function orderPatience(level) {
  return Math.max(ORDER.minPatience, ORDER.patience - ORDER.patiencePerLevel * (level - 1));
}

function orderInterval(level) {
  return Math.max(ORDER.minInterval, ORDER.interval - ORDER.intervalPerLevel * (level - 1));
}

export function createWorld(random) {
  const state = {
    time: 0,
    shiftLeft: SHIFT_SECONDS,
    level: 1,
    score: 0,
    combo: 0,
    bestCombo: 0,
    hearts: HEARTS,
    served: 0,
    missed: 0,
    tray: [],
    plate: [],
    orders: [],
    chop: { item: null, progress: 0, done: false },
    grill: [],
    popups: [],
    particles: [],
    over: false,
    orderTimer: ORDER.firstAt,
    nextOrderId: 1,
    tickSecond: -1,
  };
  for (let i = 0; i < GRILL_SLOTS; i += 1) {
    state.grill.push({ item: null, progress: 0, done: false, burn: 0 });
  }

  function reset() {
    state.time = 0;
    state.shiftLeft = SHIFT_SECONDS;
    state.level = 1;
    state.score = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.hearts = HEARTS;
    state.served = 0;
    state.missed = 0;
    state.tray = [];
    state.plate = [];
    state.orders = [];
    state.chop = { item: null, progress: 0, done: false };
    for (const slot of state.grill) {
      slot.item = null;
      slot.progress = 0;
      slot.done = false;
      slot.burn = 0;
    }
    state.popups = [];
    state.particles = [];
    state.over = false;
    state.orderTimer = ORDER.firstAt;
    state.nextOrderId = 1;
    state.tickSecond = -1;
  }

  function popup(x, y, text, color) {
    state.popups.push({ x, y, text, life: 1.4, color });
  }

  function burst(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = random() * Math.PI * 2;
      const speed = 30 + random() * 70;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: 0.5 + random() * 0.4,
        color,
        size: 3 + random() * 4,
      });
    }
  }

  function spawnOrder() {
    const available = RECIPES.filter((recipe) => recipe.minLevel <= state.level);
    const recipe = pick(random, available);
    const patience = orderPatience(state.level);
    state.orders.push({
      id: state.nextOrderId,
      recipe,
      patience,
      patienceMax: patience,
    });
    state.nextOrderId += 1;
  }

  function trayIndex(kind, wantedState) {
    for (let i = 0; i < state.tray.length; i += 1) {
      if (state.tray[i].kind === kind && state.tray[i].state === wantedState) return i;
    }
    return -1;
  }

  function takeBin(index) {
    const kind = BIN_ORDER[index];
    if (!kind) return 0;
    if (state.tray.length >= TRAY_MAX) {
      popup(LAYOUT.bins.x + LAYOUT.bins.w / 2, LAYOUT.bins.y + 8, 'Tray full!', '#e2574c');
      return EVENT_ERROR;
    }
    const def = INGREDIENTS[kind];
    state.tray.push({ kind, state: def.prep === 'ready' ? 'ready' : 'raw' });
    burst(LAYOUT.bins.x + LAYOUT.bins.w / 2, LAYOUT.bins.y + 60, def.color, 6);
    return EVENT_PICKUP;
  }

  function useChop() {
    const board = state.chop;
    if (board.item !== null && board.done) {
      if (state.tray.length >= TRAY_MAX) {
        popup(LAYOUT.chop.x + LAYOUT.chop.w / 2, LAYOUT.chop.y + 8, 'Tray full!', '#e2574c');
        return EVENT_ERROR;
      }
      state.tray.push(board.item);
      board.item = null;
      board.progress = 0;
      board.done = false;
      return EVENT_PICKUP;
    }
    if (board.item !== null) {
      board.progress += CHOP_CLICK_BONUS;
      burst(LAYOUT.chop.x + LAYOUT.chop.w / 2, LAYOUT.chop.y + 110, '#69b455', 4);
      return EVENT_CHOP;
    }
    const choppable = ['lettuce', 'tomato', 'onion'];
    for (const kind of choppable) {
      const at = trayIndex(kind, 'raw');
      if (at !== -1) {
        board.item = state.tray.splice(at, 1)[0];
        board.progress = 0;
        board.done = false;
        return EVENT_CHOP;
      }
    }
    popup(LAYOUT.chop.x + LAYOUT.chop.w / 2, LAYOUT.chop.y + 8, 'Need lettuce, tomato or onion!', '#e2574c');
    return EVENT_ERROR;
  }

  function useGrill() {
    for (const slot of state.grill) {
      if (slot.item !== null && slot.done) {
        if (state.tray.length >= TRAY_MAX) {
          popup(LAYOUT.grill.x + LAYOUT.grill.w / 2, LAYOUT.grill.y + 8, 'Tray full!', '#e2574c');
          return EVENT_ERROR;
        }
        state.tray.push({ kind: 'patty', state: 'cooked' });
        slot.item = null;
        slot.progress = 0;
        slot.done = false;
        slot.burn = 0;
        return EVENT_PICKUP;
      }
    }
    const at = trayIndex('patty', 'raw');
    if (at === -1) {
      popup(LAYOUT.grill.x + LAYOUT.grill.w / 2, LAYOUT.grill.y + 8, 'Need a raw patty!', '#e2574c');
      return EVENT_ERROR;
    }
    for (const slot of state.grill) {
      if (slot.item === null) {
        state.tray.splice(at, 1);
        slot.item = { kind: 'patty', state: 'raw' };
        slot.progress = 0;
        slot.done = false;
        slot.burn = 0;
        burst(LAYOUT.grill.x + LAYOUT.grill.w / 2, LAYOUT.grill.y + 110, '#ff7a3c', 8);
        return EVENT_GRILL_START;
      }
    }
    popup(LAYOUT.grill.x + LAYOUT.grill.w / 2, LAYOUT.grill.y + 8, 'Grill full!', '#e2574c');
    return EVENT_ERROR;
  }

  function usePlate() {
    if (state.tray.length === 0) {
      popup(LAYOUT.plate.x + LAYOUT.plate.w / 2, LAYOUT.plate.y + 8, 'Tray is empty!', '#e2574c');
      return EVENT_ERROR;
    }
    if (state.plate.length + state.tray.length > PLATE_MAX) {
      popup(LAYOUT.plate.x + LAYOUT.plate.w / 2, LAYOUT.plate.y + 8, 'Plate full!', '#e2574c');
      return EVENT_ERROR;
    }
    for (const item of state.tray) state.plate.push(item);
    state.tray = [];
    return EVENT_PICKUP;
  }

  function useServe() {
    if (state.plate.length === 0) {
      popup(LAYOUT.serve.x + LAYOUT.serve.w / 2, LAYOUT.serve.y + 8, 'Plate is empty!', '#e2574c');
      return EVENT_ERROR;
    }
    for (let i = 0; i < state.orders.length; i += 1) {
      const order = state.orders[i];
      if (sameMultiset(state.plate, order.recipe.needs)) {
        const patienceShare = order.patience / order.patienceMax;
        state.combo += 1;
        state.bestCombo = Math.max(state.bestCombo, state.combo);
        const mult = Math.min(state.combo, SCORE.comboCap);
        const points =
          SCORE.base + Math.round(SCORE.patienceBonus * patienceShare) + (mult - 1) * SCORE.comboStep;
        state.score += points;
        state.served += 1;
        state.orders.splice(i, 1);
        state.plate = [];
        popup(LAYOUT.board.x + 180 + i * 330 + 155, LAYOUT.board.y + 60, `SERVED! +${points}`, '#69b455');
        burst(LAYOUT.serve.x + LAYOUT.serve.w / 2, LAYOUT.serve.y + 110, '#f2c94c', 14);
        return EVENT_SERVE;
      }
    }
    popup(LAYOUT.serve.x + LAYOUT.serve.w / 2, LAYOUT.serve.y + 8, 'No order matches!', '#e2574c');
    return EVENT_ERROR;
  }

  function useTrash() {
    if (state.tray.length > 0) {
      state.tray = [];
      return EVENT_TRASH;
    }
    if (state.plate.length > 0) {
      state.plate = [];
      return EVENT_TRASH;
    }
    return 0;
  }

  /** A click anywhere in the kitchen: bins, board, grill, plate, window or trash. */
  function click(x, y) {
    if (inside(LAYOUT.serve, x, y)) return useServe();
    if (inside(LAYOUT.plate, x, y)) return usePlate();
    if (inside(LAYOUT.grill, x, y)) return useGrill();
    if (inside(LAYOUT.chop, x, y)) return useChop();
    if (inside(LAYOUT.trash, x, y)) return useTrash();
    for (let i = 0; i < BIN_ORDER.length; i += 1) {
      if (inside(binRect(i), x, y)) return takeBin(i);
    }
    return 0;
  }

  /**
   * One fixed step: the shift clock, order patience, chop and grill progress,
   * spawning, particles and popups. Returns what happened as bit flags.
   */
  function step(dt) {
    let events = 0;
    if (state.over) return events;
    state.time += dt;
    state.shiftLeft = Math.max(0, state.shiftLeft - dt);
    state.level = Math.min(LEVEL.max, 1 + Math.floor(state.time / LEVEL.seconds));

    state.orderTimer -= dt;
    if (state.orderTimer <= 0 && state.orders.length < ORDER.maxOnBoard) {
      spawnOrder();
      state.orderTimer = orderInterval(state.level);
    }

    for (let i = state.orders.length - 1; i >= 0; i -= 1) {
      const order = state.orders[i];
      order.patience -= dt;
      if (order.patience <= 0) {
        state.orders.splice(i, 1);
        state.hearts -= 1;
        state.combo = 0;
        state.missed += 1;
        popup(LAYOUT.board.x + 200 + i * 300, LAYOUT.board.y + 20, 'Order walked out!', '#e2574c');
        events |= EVENT_MISS;
        if (state.hearts <= 0) {
          state.over = true;
          events |= EVENT_OVER;
          return events;
        }
      }
    }

    const board = state.chop;
    if (board.item !== null && !board.done) {
      board.progress += dt;
      if (board.progress >= CHOP_SECONDS) {
        board.progress = CHOP_SECONDS;
        board.done = true;
        board.item = { kind: board.item.kind, state: 'chopped' };
        if (state.tray.length < TRAY_MAX) {
          state.tray.push(board.item);
          board.item = null;
          board.progress = 0;
          board.done = false;
        }
        events |= EVENT_CHOP_DONE;
      }
    }

    for (const slot of state.grill) {
      if (slot.item === null) continue;
      if (!slot.done) {
        slot.progress += dt;
        if (slot.progress >= GRILL_SECONDS) {
          slot.progress = GRILL_SECONDS;
          slot.done = true;
          slot.burn = 0;
          events |= EVENT_GRILL_DONE;
        }
      } else {
        slot.burn += dt;
        if (slot.burn >= GRILL_BURN_AFTER) {
          slot.item = null;
          slot.progress = 0;
          slot.done = false;
          slot.burn = 0;
          popup(LAYOUT.grill.x + LAYOUT.grill.w / 2, LAYOUT.grill.y + 60, 'BURNT!', '#e2574c');
          burst(LAYOUT.grill.x + LAYOUT.grill.w / 2, LAYOUT.grill.y + 110, '#555555', 10);
          events |= EVENT_BURN;
        }
      }
    }

    for (let i = state.popups.length - 1; i >= 0; i -= 1) {
      const popupItem = state.popups[i];
      popupItem.life -= dt;
      popupItem.y -= 24 * dt;
      if (popupItem.life <= 0) state.popups.splice(i, 1);
    }
    for (let i = 0; i < state.particles.length; i += 1) {
      const particle = state.particles[i];
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 60 * dt;
    }
    state.particles = state.particles.filter((particle) => particle.life > 0);

    if (state.shiftLeft <= 0) {
      state.over = true;
      events |= EVENT_OVER;
    }
    return events;
  }

  /**
   * Set the world to a named screenshot scene (start, play, serve, rush). Every
   * scene is deterministic: the same scene always shows the same kitchen.
   */
  function stageScene(name) {
    reset();
    if (name === 'play') {
      state.time = 55;
      state.level = 2;
      state.score = 480;
      state.combo = 2;
      state.bestCombo = 2;
      state.shiftLeft = 95;
      state.orders = [
        { id: 1, recipe: RECIPES[0], patience: 26, patienceMax: 48 },
        { id: 2, recipe: RECIPES[2], patience: 38, patienceMax: 48 },
      ];
      state.plate = [
        { kind: 'bun', state: 'ready' },
        { kind: 'patty', state: 'cooked' },
      ];
      state.tray = [{ kind: 'lettuce', state: 'chopped' }];
      state.grill[0] = { item: { kind: 'patty', state: 'raw' }, progress: 1.5, done: false, burn: 0 };
      state.chop = { item: { kind: 'lettuce', state: 'raw' }, progress: 0.55, done: false };
      return;
    }
    if (name === 'serve') {
      state.time = 70;
      state.level = 3;
      state.score = 720;
      state.combo = 3;
      state.bestCombo = 3;
      state.shiftLeft = 80;
      state.orders = [{ id: 1, recipe: RECIPES[0], patience: 33, patienceMax: 48 }];
      state.plate = [
        { kind: 'bun', state: 'ready' },
        { kind: 'patty', state: 'cooked' },
        { kind: 'lettuce', state: 'chopped' },
      ];
      state.grill[0] = { item: { kind: 'patty', state: 'raw' }, progress: 2.5, done: true, burn: 1 };
      popup(LAYOUT.board.x + 180 + 155, LAYOUT.board.y + 60, 'SERVED! +240', '#69b455');
      return;
    }
    if (name === 'rush') {
      state.time = 128;
      state.level = 5;
      state.score = 1250;
      state.combo = 4;
      state.bestCombo = 4;
      state.shiftLeft = 22;
      state.orders = [
        { id: 1, recipe: RECIPES[4], patience: 4, patienceMax: 48 },
        { id: 2, recipe: RECIPES[3], patience: 17, patienceMax: 48 },
        { id: 3, recipe: RECIPES[2], patience: 29, patienceMax: 48 },
      ];
      state.plate = [
        { kind: 'bun', state: 'ready' },
        { kind: 'patty', state: 'cooked' },
      ];
      state.tray = [{ kind: 'cheese', state: 'ready' }];
      state.grill[0] = { item: { kind: 'patty', state: 'raw' }, progress: 2.5, done: true, burn: 2 };
      state.grill[1] = { item: { kind: 'patty', state: 'raw' }, progress: 2.0, done: false, burn: 0 };
      state.chop = { item: { kind: 'onion', state: 'raw' }, progress: 0.85, done: false };
      return;
    }
    // start (and any other name): the title screen over a fresh kitchen.
    state.orders = [
      { id: 1, recipe: RECIPES[0], patience: 48, patienceMax: 48 },
      { id: 2, recipe: RECIPES[1], patience: 44, patienceMax: 48 },
    ];
    state.tray = [{ kind: 'bun', state: 'ready' }];
  }

  reset();
  return { state, reset, click, takeBin, useChop, useGrill, usePlate, useServe, useTrash, step, stageScene };
}
