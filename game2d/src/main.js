import Phaser from 'phaser';
import { TownScene } from './scenes/TownScene.js';

// Phaser is a 2D engine; "orthographic top-down" here just means the default
// 2D camera with a ¾ pixel-art tilemap and no perspective. pixelArt:true gives
// us NEAREST filtering + roundPixels so the chunky 16px art stays crisp.
//
// Scale.NONE + an explicit viewport size (not Scale.RESIZE) is deliberate:
// RESIZE measures the parent at boot, and if layout hasn't settled it reads 0,
// which boots the renderer's framebuffer at 0×0 → "Incomplete Attachment". We
// size the game from the viewport ourselves and drive resizes manually below.
const vw = () => Math.max(1, window.innerWidth || document.documentElement.clientWidth);
const vh = () => Math.max(1, window.innerHeight || document.documentElement.clientHeight);

const game = new Phaser.Game({
  type: Phaser.AUTO,            // WebGL where available, Canvas2D fallback (both supported)
  parent: 'game',
  backgroundColor: '#06060a',   // near-black: frames the lit area
  pixelArt: true,
  roundPixels: true,
  render: { antialias: false, antialiasGL: false },
  scale: { mode: Phaser.Scale.NONE, width: vw(), height: vh() },
  scene: [TownScene],
});

// keep the canvas filling the viewport on rotate / resize (mobile-first)
const onResize = () => game.scale.resize(vw(), vh());
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);

// expose for quick poking in the console during the spike
window.__game = game;
