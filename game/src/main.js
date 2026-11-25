// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between four screens: title, play, paused
// and game over. Sounds answer every event the world reports.
//
// ?seed=N fixes the order sequence. ?shot=start|play|serve|rush (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createSound } from './sound.js';
import {
  createWorld,
  EVENT_BURN,
  EVENT_CHOP,
  EVENT_CHOP_DONE,
  EVENT_ERROR,
  EVENT_GRILL_DONE,
  EVENT_GRILL_START,
  EVENT_MISS,
  EVENT_OVER,
  EVENT_PICKUP,
  EVENT_SERVE,
  EVENT_TRASH,
} from './world.js';
import {
  ACTION_CHOP,
  ACTION_GRILL,
  ACTION_MUTE,
  ACTION_PAUSE,
  ACTION_PLATE,
  ACTION_SERVE,
  ACTION_TRASH,
  createInput,
} from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const sound = createSound();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, sound.isMuted());
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each serve.
  function announce(message) {
    status.textContent = message;
  }

  function playEvents(events) {
    if (events & EVENT_PICKUP) sound.pickup();
    if (events & EVENT_CHOP) sound.chop();
    if (events & EVENT_CHOP_DONE) sound.chopDone();
    if (events & EVENT_GRILL_START) sound.grillStart();
    if (events & EVENT_GRILL_DONE) sound.grillDone();
    if (events & EVENT_BURN) sound.burn();
    if (events & EVENT_SERVE) {
      sound.serve();
      announce(`Served! Score ${world.state.score}.`);
    }
    if (events & EVENT_MISS) {
      sound.miss();
      announce(`An order walked out. ${world.state.hearts} hearts left.`);
    }
    if (events & EVENT_ERROR) sound.error();
    if (events & EVENT_TRASH) sound.pickup();
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    sound.start();
    announce('Playing. Serve every order before its bar runs out.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Shift over. Score ${world.state.score}. Best ${best}.`);
  }

  function step() {
    const events = world.step(STEP);
    playEvents(events);
    if (events & EVENT_OVER) endGame();
  }

  function handleInput() {
    for (const click of input.takeClicks()) {
      sound.unlock();
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
        startGame();
        return;
      }
      if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
        return;
      }
      playEvents(world.click(click.x, click.y));
    }
    const bin = input.takeBin();
    if (bin !== -1 && screen === SCREEN_PLAY) {
      sound.unlock();
      playEvents(world.takeBin(bin));
    }
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = sound.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_SERVE) {
      sound.unlock();
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER) startGame();
      else if (screen === SCREEN_PLAY) playEvents(world.useServe());
      else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    if (screen !== SCREEN_PLAY) return;
    if (actions & ACTION_CHOP) playEvents(world.useChop());
    if (actions & ACTION_GRILL) playEvents(world.useGrill());
    if (actions & ACTION_PLATE) playEvents(world.usePlate());
    if (actions & ACTION_TRASH) playEvents(world.useTrash());
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleInput();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, sound.isMuted());
  }

  // Leaving the tab pauses a running game rather than letting orders walk out unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Sizzle and Serve. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
