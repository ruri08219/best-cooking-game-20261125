// Sizzle & Serve — every tuning number, colour and layout rect in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** One shift lasts this long; the timer bar drains from full to empty. */
export const SHIFT_SECONDS = 150;

export const HEARTS = 3;

/** How many ingredients the chef's tray holds at once. */
export const TRAY_MAX = 3;

/** How many items fit on one plate. */
export const PLATE_MAX = 5;

/** Seconds a chop takes; every click on the board while chopping shaves this off. */
export const CHOP_SECONDS = 1.2;
export const CHOP_CLICK_BONUS = 0.18;

/** Seconds a patty needs on the grill, and when it burns after it is done. */
export const GRILL_SECONDS = 2.5;
export const GRILL_BURN_AFTER = 6;

/** The grill has two slots; the chopping board has one. */
export const GRILL_SLOTS = 2;

/** Orders: how often a new one arrives, and how long a customer waits. */
export const ORDER = {
  firstAt: 2,
  interval: 13,
  intervalPerLevel: 1.1,
  minInterval: 7,
  patience: 48,
  patiencePerLevel: 3,
  minPatience: 28,
  maxOnBoard: 3,
};

/** Seconds of play per level, and the last level. */
export const LEVEL = { seconds: 30, max: 5 };

/** Score: a served dish pays its base plus a patience bonus and a combo bonus. */
export const SCORE = { base: 100, patienceBonus: 100, comboStep: 25, comboCap: 3 };

/**
 * Ingredients. `prep` says what a bin hands you and what station finishes it:
 * ready = serve as-is, chop = needs the board, grill = needs the grill.
 */
export const INGREDIENTS = {
  bun: { name: 'Bun', prep: 'ready', key: '1', color: '#e8a54b', dark: '#b97a28' },
  patty: { name: 'Patty', prep: 'grill', key: '2', color: '#8a5a33', dark: '#5f3c1e' },
  lettuce: { name: 'Lettuce', prep: 'chop', key: '3', color: '#69b455', dark: '#3f7d33' },
  tomato: { name: 'Tomato', prep: 'chop', key: '4', color: '#e2574c', dark: '#a83228' },
  cheese: { name: 'Cheese', prep: 'ready', key: '5', color: '#f2c94c', dark: '#c79a1d' },
  onion: { name: 'Onion', prep: 'chop', key: '6', color: '#c9a0dc', dark: '#8f68a8' },
};

/** An item is { kind, state }: raw | chopped | cooked. Bins hand out raw/ready items. */
export function itemKey(item) {
  return `${item.kind}:${item.state}`;
}

/**
 * Recipes. Each lists the exact items a plate must hold (order does not matter).
 * minLevel gates the harder dishes until the shift heats up.
 */
export const RECIPES = [
  {
    id: 'classic',
    name: 'Classic Burger',
    minLevel: 1,
    needs: [
      { kind: 'bun', state: 'ready' },
      { kind: 'patty', state: 'cooked' },
      { kind: 'lettuce', state: 'chopped' },
    ],
  },
  {
    id: 'cheese',
    name: 'Cheese Melt',
    minLevel: 1,
    needs: [
      { kind: 'bun', state: 'ready' },
      { kind: 'patty', state: 'cooked' },
      { kind: 'cheese', state: 'ready' },
    ],
  },
  {
    id: 'garden',
    name: 'Garden Stack',
    minLevel: 1,
    needs: [
      { kind: 'bun', state: 'ready' },
      { kind: 'lettuce', state: 'chopped' },
      { kind: 'tomato', state: 'chopped' },
      { kind: 'cheese', state: 'ready' },
    ],
  },
  {
    id: 'smoky',
    name: 'Smoky Onion Burger',
    minLevel: 2,
    needs: [
      { kind: 'bun', state: 'ready' },
      { kind: 'patty', state: 'cooked' },
      { kind: 'onion', state: 'chopped' },
      { kind: 'cheese', state: 'ready' },
    ],
  },
  {
    id: 'double',
    name: 'Double Trouble',
    minLevel: 3,
    needs: [
      { kind: 'bun', state: 'ready' },
      { kind: 'patty', state: 'cooked' },
      { kind: 'patty', state: 'cooked' },
      { kind: 'cheese', state: 'ready' },
      { kind: 'tomato', state: 'chopped' },
    ],
  },
];

/** Layout of the kitchen, in field coordinates. */
export const LAYOUT = {
  hud: { x: 0, y: 0, w: 1280, h: 56 },
  board: { x: 24, y: 68, w: 1232, h: 104 },
  bins: { x: 24, y: 196, w: 300, h: 220 },
  chop: { x: 348, y: 196, w: 220, h: 220 },
  grill: { x: 592, y: 196, w: 280, h: 220 },
  plate: { x: 896, y: 196, w: 180, h: 220 },
  serve: { x: 1100, y: 196, w: 156, h: 220 },
  trash: { x: 1170, y: 648, w: 86, h: 56 },
  chef: { x: 24, y: 448, w: 420, h: 200 },
  tray: { x: 468, y: 648, w: 680, h: 56 },
  hint: { x: 24, y: 648, w: 420, h: 56 },
};

export const PALETTE = {
  wall: '#f6e7c8',
  wallTile: '#eed9a8',
  floor: '#c98f5f',
  floorDark: '#b57a4c',
  counter: '#8a5a33',
  counterTop: '#a9743f',
  counterEdge: '#6e4525',
  board: '#2f3b2d',
  boardFrame: '#7a5a34',
  paper: '#fff8e6',
  paperEdge: '#e0cfa8',
  text: '#2b2118',
  muted: '#7a6a55',
  hud: '#3a2a1c',
  hudText: '#ffe9b8',
  gold: '#f2c94c',
  green: '#69b455',
  red: '#e2574c',
  amber: '#f2994a',
  steel: '#9aa5b1',
  steelDark: '#6e7a88',
  grillHot: '#ff7a3c',
  white: '#ffffff',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'sizzle-and-serve.best';
