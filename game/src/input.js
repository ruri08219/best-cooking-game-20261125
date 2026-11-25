// Keyboard and pointer input. Clicks are queued with their position in field
// coordinates (the canvas letterboxes the 1280x720 field into the window, so a
// click is un-scaled back into the field); one-shot presses are queued as bit
// flags and taken once by the loop, so a press between two frames is never lost
// and never counted twice.

import { FIELD } from './config.js';

export const ACTION_SERVE = 1;
export const ACTION_PAUSE = 2;
export const ACTION_TRASH = 4;
export const ACTION_MUTE = 8;
export const ACTION_CHOP = 16;
export const ACTION_GRILL = 32;
export const ACTION_PLATE = 64;

const BIN_KEYS = new Map([
  ['Digit1', 0],
  ['Digit2', 1],
  ['Digit3', 2],
  ['Digit4', 3],
  ['Digit5', 4],
  ['Digit6', 5],
]);

export function createInput(canvas) {
  let actions = 0;
  let binAction = -1;
  const clicks = [];

  function toField(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
    const x = (clientX - rect.left - (rect.width - FIELD.width * scale) / 2) / scale;
    const y = (clientY - rect.top - (rect.height - FIELD.height * scale) / 2) / scale;
    return { x, y };
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    if (BIN_KEYS.has(event.code)) {
      binAction = BIN_KEYS.get(event.code);
    } else if (event.code === 'Space' || event.code === 'Enter') {
      actions |= ACTION_SERVE;
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      actions |= ACTION_PAUSE;
    } else if (event.code === 'KeyT') {
      actions |= ACTION_TRASH;
    } else if (event.code === 'KeyM') {
      actions |= ACTION_MUTE;
    } else if (event.code === 'KeyX') {
      actions |= ACTION_CHOP;
    } else if (event.code === 'KeyG') {
      actions |= ACTION_GRILL;
    } else if (event.code === 'KeyV') {
      actions |= ACTION_PLATE;
    } else {
      return;
    }
    event.preventDefault();
  });

  canvas.addEventListener('pointerdown', (event) => {
    clicks.push(toField(event.clientX, event.clientY));
  });

  return {
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The index of the ingredient bin a number key picked, or -1. */
    takeBin() {
      const picked = binAction;
      binAction = -1;
      return picked;
    },
    /** Every click since the last call, in field coordinates. */
    takeClicks() {
      return clicks.splice(0, clicks.length);
    },
  };
}
