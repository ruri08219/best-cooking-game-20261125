// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred, the margin filled
// with the backdrop colour. Flat vector art, canvas text for the HUD and panels.
// Food is drawn as little vector icons, never emoji, so a screenshot looks the
// same on every machine.

import { FIELD, FONT, INGREDIENTS, LAYOUT, PALETTE, SHIFT_SECONDS } from './config.js';
import { binRect } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const BIN_ORDER = ['bun', 'patty', 'lettuce', 'tomato', 'cheese', 'onion'];
const BIN_LABELS = ['Bun', 'Patty', 'Lettuce', 'Tomato', 'Cheese', 'Onion'];

function roundRect(context, x, y, w, h, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + w, y, x + w, y + h, radius);
  context.arcTo(x + w, y + h, x, y + h, radius);
  context.arcTo(x, y + h, x, y, radius);
  context.arcTo(x, y, x + w, y, radius);
  context.closePath();
}

function circle(context, x, y, radius) {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

/** One ingredient, drawn as a vector icon centred at (x, y) with size `s`. */
export function drawIngredient(context, item, x, y, s) {
  const def = INGREDIENTS[item.kind];
  const half = s / 2;
  if (item.kind === 'bun') {
    context.fillStyle = '#d98f2e';
    roundRect(context, x - half, y + half * 0.1, s, half * 0.55, 4);
    context.fill();
    context.fillStyle = def.color;
    context.beginPath();
    context.arc(x, y + half * 0.1, half, Math.PI, 0);
    context.fill();
    context.fillStyle = '#fff3cf';
    circle(context, x - half * 0.4, y - half * 0.35, 2);
    circle(context, x + half * 0.1, y - half * 0.55, 2);
    circle(context, x + half * 0.45, y - half * 0.2, 2);
    return;
  }
  if (item.kind === 'patty') {
    context.fillStyle = item.state === 'cooked' ? '#6b4423' : '#c98a7a';
    roundRect(context, x - half, y - half * 0.35, s, half * 0.7, half * 0.3);
    context.fill();
    if (item.state === 'cooked') {
      context.strokeStyle = '#4a2c14';
      context.lineWidth = 2;
      for (let i = -1; i <= 1; i += 1) {
        context.beginPath();
        context.moveTo(x + i * half * 0.5 - 4, y - half * 0.3);
        context.lineTo(x + i * half * 0.5 + 4, y + half * 0.3);
        context.stroke();
      }
    }
    return;
  }
  if (item.kind === 'lettuce') {
    context.fillStyle = item.state === 'chopped' ? '#7cc46a' : def.color;
    for (let i = -1; i <= 1; i += 1) {
      context.beginPath();
      context.ellipse(x + i * half * 0.45, y, half * 0.45, half * 0.32, 0, 0, Math.PI * 2);
      context.fill();
    }
    context.strokeStyle = def.dark;
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(x - half * 0.7, y);
    context.lineTo(x + half * 0.7, y);
    context.stroke();
    return;
  }
  if (item.kind === 'tomato') {
    context.fillStyle = item.state === 'chopped' ? '#ff6b5e' : def.color;
    circle(context, x, y, half * 0.9);
    context.fillStyle = '#ffb3a7';
    circle(context, x, y, half * 0.55);
    context.fillStyle = '#ffd9d2';
    circle(context, x - half * 0.2, y - half * 0.15, half * 0.18);
    circle(context, x + half * 0.25, y + half * 0.2, half * 0.14);
    return;
  }
  if (item.kind === 'cheese') {
    context.fillStyle = def.color;
    context.beginPath();
    context.moveTo(x - half, y + half * 0.6);
    context.lineTo(x + half, y + half * 0.6);
    context.lineTo(x + half, y - half * 0.3);
    context.closePath();
    context.fill();
    context.fillStyle = def.dark;
    circle(context, x - half * 0.3, y + half * 0.25, 2.5);
    circle(context, x + half * 0.35, y + half * 0.35, 2);
    return;
  }
  // onion
  context.strokeStyle = item.state === 'chopped' ? '#b78ac9' : '#e8d5f2';
  context.lineWidth = 3;
  for (let r = 0.85; r > 0.3; r -= 0.22) {
    context.beginPath();
    context.arc(x, y, half * r, 0, Math.PI * 2);
    context.stroke();
  }
  context.fillStyle = def.dark;
  circle(context, x, y, half * 0.18);
}

function progressBar(context, x, y, w, h, share, color, track) {
  context.fillStyle = track;
  roundRect(context, x, y, w, h, h / 2);
  context.fill();
  if (share > 0) {
    context.fillStyle = color;
    roundRect(context, x, y, Math.max(h, w * share), h, h / 2);
    context.fill();
  }
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, weight) {
    const key = `${weight || ''}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight ? `${weight} ` : ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function panel(x, y, w, h, fill, edge) {
    context.fillStyle = fill;
    roundRect(context, x, y, w, h, 12);
    context.fill();
    if (edge) {
      context.strokeStyle = edge;
      context.lineWidth = 2;
      context.stroke();
    }
  }

  function drawWall() {
    context.fillStyle = PALETTE.wall;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.wallTile;
    for (let x = 0; x < FIELD.width; x += 64) {
      context.fillRect(x, 56, 2, 120);
    }
    context.fillRect(0, 176, FIELD.width, 2);
    context.fillStyle = PALETTE.floor;
    context.fillRect(0, 640, FIELD.width, 80);
    context.fillStyle = PALETTE.floorDark;
    for (let x = -40; x < FIELD.width; x += 96) {
      context.fillRect(x, 640, 3, 80);
    }
  }

  function drawHud(state, muted) {
    const hud = LAYOUT.hud;
    context.fillStyle = PALETTE.hud;
    context.fillRect(hud.x, hud.y, hud.w, hud.h);
    context.textBaseline = 'alphabetic';
    text('SIZZLE & SERVE', 24, 36, 26, PALETTE.hudText, 'left', '700');
    text(`Score ${state.score}`, 330, 36, 24, PALETTE.white, 'left', '700');
    if (state.combo >= 2) {
      context.fillStyle = PALETTE.gold;
      roundRect(context, 508, 12, 128, 32, 16);
      context.fill();
      text(`COMBO x${state.combo}`, 572, 35, 20, '#3a2a1c', 'center', '700');
    }
    const timerX = 660;
    text('SHIFT', timerX, 36, 18, PALETTE.hudText, 'left', '700');
    progressBar(context, timerX + 62, 18, 220, 18, state.shiftLeft / SHIFT_SECONDS, PALETTE.gold, '#5a4632');
    const seconds = Math.ceil(state.shiftLeft);
    text(`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`, timerX + 292, 36, 20, PALETTE.white, 'left', '700');
    text(`Lv ${state.level}`, 1010, 36, 20, PALETTE.hudText, 'left', '700');
    for (let i = 0; i < 3; i += 1) {
      context.fillStyle = i < state.hearts ? PALETTE.red : '#5a4632';
      const cx = 1100 + i * 28;
      context.beginPath();
      context.moveTo(cx, 34);
      context.bezierCurveTo(cx - 10, 24, cx - 16, 34, cx, 44);
      context.bezierCurveTo(cx + 16, 34, cx + 10, 24, cx, 34);
      context.fill();
    }
    text(muted ? 'M: sound off' : 'M: mute', 1256, 36, 16, PALETTE.hudText, 'right');
  }

  function drawOrderTicket(order, x, y, w, h) {
    panel(x, y, w, h, PALETTE.paper, PALETTE.paperEdge);
    context.save();
    context.translate(x + w / 2, y + h / 2);
    context.rotate(order.id % 2 === 0 ? 0.012 : -0.012);
    context.translate(-(x + w / 2), -(y + h / 2));
    context.textBaseline = 'alphabetic';
    text(`#${order.id}  ${order.recipe.name}`, x + 14, y + 26, 19, PALETTE.text, 'left', '700');
    const icons = order.recipe.needs;
    icons.forEach((item, i) => {
      drawIngredient(context, item, x + 26 + i * 34, y + 52, 26);
    });
    const share = Math.max(0, order.patience / order.patienceMax);
    const color = share > 0.5 ? PALETTE.green : share > 0.25 ? PALETTE.amber : PALETTE.red;
    progressBar(context, x + 14, y + h - 18, w - 28, 10, share, color, '#e8dcc0');
    context.restore();
  }

  function drawBoard(state) {
    const board = LAYOUT.board;
    panel(board.x, board.y, board.w, board.h, PALETTE.board, PALETTE.boardFrame);
    context.textBaseline = 'alphabetic';
    text('ORDER BOARD', board.x + 16, board.y + 26, 16, '#cfe3b8', 'left', '700');
    if (state.orders.length === 0) {
      text('No orders yet — the lunch rush is coming…', board.x + 180, board.y + 62, 20, '#9fb08a', 'left');
    }
    state.orders.forEach((order, i) => {
      drawOrderTicket(order, board.x + 180 + i * 330, board.y + 12, 310, 80);
    });
  }

  function drawBins(state) {
    const bins = LAYOUT.bins;
    panel(bins.x, bins.y, bins.w, bins.h, PALETTE.counter, PALETTE.counterEdge);
    context.fillStyle = PALETTE.counterTop;
    context.fillRect(bins.x + 6, bins.y + 6, bins.w - 12, 20);
    context.textBaseline = 'alphabetic';
    text('INGREDIENTS  ·  click or press 1–6', bins.x + 14, bins.y + 21, 14, '#ffe9b8', 'left', '700');
    BIN_ORDER.forEach((kind, i) => {
      const rect = binRect(i);
      const def = INGREDIENTS[kind];
      context.fillStyle = '#fbf3df';
      roundRect(context, rect.x, rect.y, rect.w, rect.h, 8);
      context.fill();
      drawIngredient(context, { kind, state: def.prep === 'ready' ? 'ready' : 'raw' }, rect.x + 26, rect.y + rect.h / 2, 34);
      text(def.name, rect.x + 50, rect.y + 24, 16, PALETTE.text, 'left', '700');
      text(`[${def.key}]`, rect.x + rect.w - 10, rect.y + 24, 14, PALETTE.muted, 'right');
      text(def.prep === 'ready' ? 'ready' : def.prep === 'chop' ? 'chop it' : 'grill it', rect.x + 50, rect.y + 44, 13, PALETTE.muted, 'left');
    });
  }

  function drawChop(state) {
    const chop = LAYOUT.chop;
    panel(chop.x, chop.y, chop.w, chop.h, PALETTE.counter, PALETTE.counterEdge);
    context.textBaseline = 'alphabetic';
    text('CHOPPING BOARD  ·  X', chop.x + 14, chop.y + 24, 15, '#ffe9b8', 'left', '700');
    context.fillStyle = '#d9b078';
    roundRect(context, chop.x + 20, chop.y + 44, chop.w - 40, 110, 10);
    context.fill();
    context.strokeStyle = '#b98d54';
    context.lineWidth = 2;
    context.stroke();
    const board = state.chop;
    if (board.item !== null) {
      const cx = chop.x + chop.w / 2;
      const cy = chop.y + 100;
      drawIngredient(context, board.item, cx, cy, 64);
      if (!board.done) {
        progressBar(context, chop.x + 30, chop.y + 168, chop.w - 60, 12, board.progress / 1.2, PALETTE.green, '#5a4632');
        text('Click the board to chop faster!', chop.x + chop.w / 2, chop.y + 204, 14, '#ffe9b8', 'center');
      } else {
        text('Chopped! Click to take it.', chop.x + chop.w / 2, chop.y + 204, 14, PALETTE.gold, 'center', '700');
      }
    } else {
      text('Drop lettuce, tomato', chop.x + chop.w / 2, chop.y + 96, 15, '#ffe9b8', 'center');
      text('or onion here', chop.x + chop.w / 2, chop.y + 118, 15, '#ffe9b8', 'center');
    }
  }

  function drawGrill(state) {
    const grill = LAYOUT.grill;
    panel(grill.x, grill.y, grill.w, grill.h, '#3c4148', '#22262c');
    context.textBaseline = 'alphabetic';
    text('GRILL  ·  G', grill.x + 14, grill.y + 24, 15, '#ffd9a8', 'left', '700');
    state.grill.forEach((slot, i) => {
      const sx = grill.x + 20 + i * 132;
      const sy = grill.y + 44;
      const sw = 116;
      const sh = 110;
      context.fillStyle = '#20242a';
      roundRect(context, sx, sy, sw, sh, 8);
      context.fill();
      context.strokeStyle = PALETTE.steelDark;
      context.lineWidth = 3;
      for (let g = 1; g < 5; g += 1) {
        context.beginPath();
        context.moveTo(sx + 8, sy + (g * sh) / 5);
        context.lineTo(sx + sw - 8, sy + (g * sh) / 5);
        context.stroke();
      }
      if (slot.item !== null) {
        const cx = sx + sw / 2;
        const cy = sy + sh / 2;
        if (!slot.done) {
          context.fillStyle = PALETTE.grillHot;
          for (let f = 0; f < 3; f += 1) {
            const fx = cx - 24 + f * 24 + Math.sin(state.time * 9 + f * 2) * 3;
            context.beginPath();
            context.moveTo(fx, cy + 22);
            context.quadraticCurveTo(fx - 8, cy, fx, cy - 14);
            context.quadraticCurveTo(fx + 8, cy, fx, cy + 22);
            context.fill();
          }
        }
        drawIngredient(context, { kind: 'patty', state: slot.done ? 'cooked' : 'raw' }, cx, cy, 56);
        if (!slot.done) {
          progressBar(context, sx + 8, sy + sh - 16, sw - 16, 8, slot.progress / 2.5, PALETTE.grillHot, '#101216');
        } else {
          const left = Math.max(0, 6 - slot.burn);
          text(left <= 2 ? `BURNS IN ${Math.ceil(left)}!` : 'Ready — click to take', cx, sy + sh + 18, 13, left <= 2 ? PALETTE.red : PALETTE.gold, 'center', '700');
        }
      } else {
        text('empty', sx + sw / 2, sy + sh / 2 + 5, 14, '#7d8894', 'center');
      }
    });
    text('Patties cook in 2.5s —', grill.x + grill.w / 2, grill.y + 192, 13, '#c8cfd6', 'center');
    text('grab them before they burn!', grill.x + grill.w / 2, grill.y + 210, 13, '#c8cfd6', 'center');
  }

  function drawPlate(state) {
    const plate = LAYOUT.plate;
    panel(plate.x, plate.y, plate.w, plate.h, PALETTE.counter, PALETTE.counterEdge);
    context.textBaseline = 'alphabetic';
    text('PLATE  ·  V', plate.x + 14, plate.y + 24, 15, '#ffe9b8', 'left', '700');
    const cx = plate.x + plate.w / 2;
    const cy = plate.y + 118;
    context.fillStyle = '#f4f6f8';
    circle(context, cx, cy, 62);
    context.fillStyle = '#dfe5ea';
    circle(context, cx, cy, 44);
    state.plate.forEach((item, i) => {
      drawIngredient(context, item, cx, cy - 18 + i * 14, 40 - i * 2);
    });
    if (state.plate.length === 0) {
      text('Build a dish here', cx, cy + 84, 14, '#ffe9b8', 'center');
    } else {
      text(`${state.plate.length} item${state.plate.length > 1 ? 's' : ''} on the plate`, cx, cy + 84, 14, '#ffe9b8', 'center');
    }
  }

  function drawServe(state) {
    const serve = LAYOUT.serve;
    panel(serve.x, serve.y, serve.w, serve.h, '#7c2e2e', '#5a1f1f');
    context.textBaseline = 'alphabetic';
    text('SERVE  ·  Space', serve.x + 14, serve.y + 24, 15, '#ffd9a8', 'left', '700');
    const cx = serve.x + serve.w / 2;
    context.fillStyle = '#5a1f1f';
    roundRect(context, serve.x + 14, serve.y + 44, serve.w - 28, 96, 8);
    context.fill();
    context.fillStyle = PALETTE.gold;
    circle(context, cx, serve.y + 66, 16);
    context.fillStyle = '#3a2a1c';
    context.fillRect(cx - 2, serve.y + 66, 4, 12);
    text('RING THE BELL', cx, serve.y + 168, 14, '#ffd9a8', 'center', '700');
    text('when the plate', cx, serve.y + 188, 13, '#e8b8b8', 'center');
    text('matches an order', cx, serve.y + 206, 13, '#e8b8b8', 'center');
  }

  function drawChef(state) {
    const chef = LAYOUT.chef;
    context.textBaseline = 'alphabetic';
    // The chef, bottom-left, holding the tray.
    const cx = chef.x + 90;
    const cy = chef.y + 110;
    context.fillStyle = '#f7e8d0';
    circle(context, cx, cy - 52, 30);
    context.fillStyle = '#ffffff';
    roundRect(context, cx - 32, cy - 92, 64, 26, 12);
    context.fill();
    context.fillStyle = '#ffffff';
    circle(context, cx - 20, cy - 92, 12);
    circle(context, cx, cy - 98, 14);
    circle(context, cx + 20, cy - 92, 12);
    context.fillStyle = '#2b2118';
    circle(context, cx - 11, cy - 54, 3);
    circle(context, cx + 11, cy - 54, 3);
    context.strokeStyle = '#2b2118';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(cx, cy - 44, 8, 0.15 * Math.PI, 0.85 * Math.PI);
    context.stroke();
    context.fillStyle = '#e2574c';
    roundRect(context, cx - 44, cy - 18, 88, 74, 14);
    context.fill();
    context.fillStyle = '#ffffff';
    roundRect(context, cx - 30, cy - 6, 60, 52, 8);
    context.fill();
    // Tray in hand, showing what is carried.
    const tray = LAYOUT.tray;
    context.fillStyle = '#c9a86a';
    roundRect(context, tray.x, tray.y, tray.w, tray.h, 10);
    context.fill();
    text('TRAY', tray.x + 14, tray.y + 36, 16, '#3a2a1c', 'left', '700');
    state.tray.forEach((item, i) => {
      drawIngredient(context, item, tray.x + 90 + i * 56, tray.y + tray.h / 2, 36);
    });
    if (state.tray.length === 0) {
      text('empty — grab ingredients from the bins', tray.x + 90, tray.y + 36, 15, '#6e5636', 'left');
    }
    // Trash bin.
    const trash = LAYOUT.trash;
    context.fillStyle = '#5a6b7a';
    roundRect(context, trash.x, trash.y, trash.w, trash.h, 8);
    context.fill();
    context.fillStyle = '#3c4a56';
    context.fillRect(trash.x + 6, trash.y + 4, trash.w - 12, 8);
    text('TRASH · T', trash.x + trash.w / 2, trash.y + 36, 13, '#ffffff', 'center', '700');
    // Hint line.
    const hint = LAYOUT.hint;
    text('Click a station, or press 1–6 for ingredients', hint.x, hint.y + 24, 14, '#5a4632', 'left');
    text('X chop · G grill · V plate · Space serve · P pause', hint.x, hint.y + 46, 14, '#5a4632', 'left');
  }

  function drawParticles(state) {
    for (const particle of state.particles) {
      context.globalAlpha = Math.max(0, Math.min(1, particle.life * 2));
      context.fillStyle = particle.color;
      circle(context, particle.x, particle.y, particle.size);
    }
    context.globalAlpha = 1;
  }

  function drawPopups(state) {
    context.textBaseline = 'alphabetic';
    for (const popupItem of state.popups) {
      context.globalAlpha = Math.max(0, Math.min(1, popupItem.life));
      text(popupItem.text, popupItem.x, popupItem.y, 24, popupItem.color, 'center', '700');
    }
    context.globalAlpha = 1;
  }

  function drawPanel(title, lines, prompt) {
    const width = 640;
    const height = 150 + lines.length * 34 + 70;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(20, 12, 6, 0.55)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(x, y, width, height, PALETTE.paper, PALETTE.paperEdge);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 66, 44, PALETTE.text, 'center', '700');
    lines.forEach((line, i) => {
      text(line, FIELD.width / 2, y + 118 + i * 34, 20, PALETTE.muted, 'center');
    });
    text(prompt, FIELD.width / 2, y + height - 34, 22, '#b97a28', 'center', '700');
  }

  function grade(score, served) {
    if (served >= 12 && score >= 1800) return 'S — Head Chef!';
    if (served >= 9 && score >= 1200) return 'A — Sous Chef!';
    if (served >= 6 && score >= 700) return 'B — Line Cook!';
    if (served >= 3) return 'C — Kitchen Hand!';
    return 'D — Keep practising!';
  }

  /** Paint one frame: the kitchen, then the HUD or a panel for the screen. */
  function draw(state, screen, best, muted) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#241a10';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawWall();
    drawBoard(state);
    drawBins(state);
    drawChop(state);
    drawGrill(state);
    drawPlate(state);
    drawServe(state);
    drawChef(state);
    drawParticles(state);
    drawHud(state, muted);
    drawPopups(state);
    if (screen === SCREEN_TITLE) {
      drawPanel('SIZZLE & SERVE', [
        'Orders roll in on the board —',
        'cook each dish before its bar runs out.',
        'Chop the veg, grill the patty, stack the plate,',
        'then ring the bell to serve. Best score: ' + best,
      ], 'Press Space or click to start the shift');
    } else if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The orders will wait for you.'], 'Press P to get back to the pass');
    } else if (screen === SCREEN_OVER) {
      drawPanel('Shift Over!', [
        `Score ${state.score}  ·  Best ${best}`,
        `${state.served} dishes served  ·  ${state.missed} walked out  ·  best combo x${state.bestCombo}`,
        grade(state.score, state.served),
      ], 'Press Space or click to cook another shift');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
