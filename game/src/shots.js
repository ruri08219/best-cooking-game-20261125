// The screenshot scenes behind ?shot=start|play|serve|rush. Each one stages a
// deterministic kitchen from the world's own scene setup, so the frame is what a
// real shift looks like and the same seed always gives the same frame.
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const BEST = { start: 0, play: 480, serve: 720, rush: 1250 };

/**
 * Set `world` to the named scene and return the screen to draw over it and the
 * best score to show.
 */
export function stageShot(name, world) {
  const scene = name === 'play' || name === 'serve' || name === 'rush' ? name : 'start';
  world.stageScene(scene);
  const screen = scene === 'start' ? SCREEN_TITLE : SCREEN_PLAY;
  return { screen, best: BEST[scene] };
}

export { SCREEN_OVER };
