import Phaser from 'phaser';

/* TownScene — Phase 2: a walkable Oppidum.
 *
 * Phase-1 town (Ninja CC0 ground graded toward the grey Grok Keep + tinted
 * placeholder houses + trees + the dark/torch lighting) is now WALKABLE:
 *   • an animated 4-direction hero (Ninja Adventure CC0 samurai spritesheet),
 *   • snap-to-tile step movement (keyboard + on-screen D-pad),
 *   • a follow camera, and
 *   • collision against water, building footprints, trees and the map edge.
 * The hero carries a lantern glow that trails them. Enterable-building triggers
 * are Phase 3 (the door tiles are deliberately left walkable in front).
 */

const TILE = 16;
const SHORT_SIDE_TILES = 13;            // closer than Phase 1 — a small hero, world around them
const STEP_MS = 140;                    // per-tile step duration
const RADIAL_R = 128;
const GROUND_GRADE = 0x9ea29c;
const KEEP_IMG = { w: 576, h: 704 };
const KEEP_SCALE = 0.18;
const TORCHES_IMG = [[212, 452], [366, 452]];
const SHOW_LABELS = true;

// screen/shop = how the EXISTING game opens this interior (showScreen / openShop);
// lockKey = the game's UNLOCKS gate (checked in the iframe before entering).
const BUILDINGS = {
  keep:       { tex: 'keep',  scale: KEEP_SCALE, label: 'The Wayward Keep', fw: 5, fh: 2, screen: 'sync' },
  chapel:     { tex: 'house', tint: 0xeae2d0, door: 0xfff0c8, label: 'The Hollow Choir', screen: 'chapel', lockKey: 'chapel' },
  tavern:     { tex: 'house', tint: 0xffc59a, door: 0xff9a40, label: 'The Foundered Horse', screen: 'tavern' },
  inn:        { tex: 'house', tint: 0xe9d8c0, door: 0xffcf90, label: "Maren's Inn", screen: 'inn', lockKey: 'inn' },
  bank:       { tex: 'house', tint: 0xc2c7d2, door: 0xffe0a0, label: 'The Bank', screen: 'bank', lockKey: 'bank' },
  library:    { tex: 'house', tint: 0xcabfd6, door: 0xc9b6ff, label: 'The Library', screen: 'library' },
  blacksmith: { tex: 'house', tint: 0xb6a896, door: 0xff6a28, label: 'The Blacksmith', shop: 'blacksmith' },
  woodsmith:  { tex: 'house', tint: 0xd2b78c, door: 0xffcf90, label: 'The Woodsmith', shop: 'woodsmith', lockKey: 'woodsmith' },
  armorer:    { tex: 'house', tint: 0xbabec8, door: 0xffe0a0, label: 'The Armorer', shop: 'armorer', lockKey: 'armorer' },
  apothecary: { tex: 'house', tint: 0xc6d2ac, door: 0x9cff80, label: 'The Apothecary', shop: 'apothecary', lockKey: 'apothecary' },
};
// hero spritesheet (4 cols = dir, rows = frames). frame = row*4 + col.
const DIR = {
  down:  { dx: 0, dy: 1, idle: 0, walk: [0, 4, 8, 12] },
  up:    { dx: 0, dy: -1, idle: 1, walk: [1, 5, 9, 13] },
  left:  { dx: -1, dy: 0, idle: 2, walk: [2, 6, 10, 14] },  // col2 faces left
  right: { dx: 1, dy: 0, idle: 3, walk: [3, 7, 11, 15] },   // col3 faces right
};

export class TownScene extends Phaser.Scene {
  constructor() { super('town'); }

  preload() {
    this.load.image('tiles', 'assets/tiles/oppidum-tiles.png');
    this.load.spritesheet('hero', 'assets/char/hero.png', { frameWidth: 16, frameHeight: 16 });
    this.load.image('keep', 'assets/buildings/keep.png');
    this.load.image('house', 'assets/buildings/house.png');
    this.load.image('tree', 'assets/props/tree.png');
    this.load.tilemapTiledJSON('map', 'assets/maps/oppidum.tmj');
  }

  create() {
    const map = this.make.tilemap({ key: 'map' });
    this.map = map;
    const tileset = map.addTilesetImage('oppidum', 'tiles');
    const ground = map.createLayer('ground', tileset, 0, 0).setDepth(0);
    if (GROUND_GRADE !== 0xffffff) ground.setTint(GROUND_GRADE);
    this.W = map.width; this.H = map.height;
    const Wp = map.widthInPixels, Hp = map.heightInPixels;
    const obj = (l) => map.getObjectLayer(l)?.objects ?? [];
    this.ensureRadials();

    // ---- collision grid (water + building footprints + trees) ----
    this.blocked = new Uint8Array(this.W * this.H);
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) {
      const t = ground.getTileAt(x, y); if (t && t.index === 5) this.block(x, y);
    }

    const lights = [];
    this.labels = [];
    this.doors = {};   // "tx,ty" of the tile in front of a door → building info

    for (const t of obj('props')) {
      this.add.image(t.x, t.y, 'tree').setOrigin(0.5, 1).setScale(0.8).setDepth(t.y);
      this.block(this.tileX(t.x), this.tileY(t.y));            // tree trunk blocks
    }

    for (const b of obj('buildings')) {
      const cfg = BUILDINGS[b.type]; if (!cfg) continue;
      const spr = this.add.image(b.x, b.y, cfg.tex).setOrigin(0.5, 1).setDepth(b.y);
      if (cfg.scale) spr.setScale(cfg.scale);
      if (cfg.tint) spr.setTint(cfg.tint);
      this.blockFootprint(this.tileX(b.x), this.tileY(b.y), cfg.fw ?? 3, cfg.fh ?? 2);
      this.doors[this.tileX(b.x) + ',' + (this.tileY(b.y) + 1)] = { screen: cfg.screen, shop: cfg.shop, lockKey: cfg.lockKey, label: cfg.label };
      if (b.type === 'keep') {
        const kp = (ix, iy) => ({ x: b.x + (ix - KEEP_IMG.w / 2) * KEEP_SCALE, y: b.y - (KEEP_IMG.h - iy) * KEEP_SCALE });
        lights.push({ ...kp(KEEP_IMG.w / 2, KEEP_IMG.h / 2), reveal: 170 });
        for (const [ix, iy] of TORCHES_IMG) lights.push({ ...kp(ix, iy), glow: { tint: 0xffb060, alpha: 0.5, core: 30 } });
      } else {
        // reveal the whole building (so it isn't dimmed by the veil) + a warm door glow
        lights.push({ x: b.x, y: b.y - 24, reveal: 66, glow: { tint: cfg.door, alpha: 0.34, core: 26 } });
      }
      if (SHOW_LABELS) this.addLabel(b.x, spr.getTopCenter().y - 2, cfg.label);
    }

    // hero spawn + braziers
    let spawn = { x: Wp / 2, y: Hp / 2 };
    for (const m of obj('meta')) {
      if (m.type === 'spawn') spawn = m;
      else if (m.type === 'brazier') lights.push({ x: m.x, y: m.y, reveal: 46, glow: { tint: 0xff9a3c, alpha: 0.5, core: 40 } });
    }
    // a big, near-flat reveal so the whole town reads as lit (erased twice to
    // flatten the centre); the wilderness/lake beyond it stays dark framing.
    const town = { x: (17 + 31) / 2 * TILE, y: (10 + 22) / 2 * TILE, reveal: 340 };
    lights.push(town, { ...town, reveal: 300 });

    // ---- the hero ----
    for (const [name, d] of Object.entries(DIR)) {
      this.anims.create({ key: name, frames: this.anims.generateFrameNumbers('hero', { frames: d.walk }), frameRate: 8, repeat: -1 });
    }
    this.tx = this.tileX(spawn.x); this.ty = this.tileY(spawn.y); this.face = 'down'; this.moving = false;
    this.hero = this.add.sprite(this.cx(this.tx), this.cy(this.ty), 'hero', DIR.down.idle).setOrigin(0.5, 1);
    this.lantern = this.add.image(this.hero.x, this.hero.y - 6, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD).setTint(0xffc878).setAlpha(0.5).setScale(34 / RADIAL_R).setDepth(9001);
    this.tweens.add({ targets: this.lantern, alpha: 0.36, scale: 30 / RADIAL_R, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // ---- darkness veil + erased reveals + static warm glows ----
    const veil = this.add.renderTexture(0, 0, Wp, Hp).setOrigin(0, 0).setDepth(9000);
    veil.fill(0x05050b, 0.84);
    for (const l of lights) {
      const r = l.reveal ?? (l.glow ? l.glow.core * 1.5 : 0); if (!r) continue;
      const mask = this.make.image({ x: l.x, y: l.y, key: 'lightmask', add: false });
      mask.setScale(r / RADIAL_R); veil.erase(mask);
    }
    for (const l of lights) {
      if (!l.glow) continue;
      const { tint, alpha, core } = l.glow;
      const g = this.add.image(l.x, l.y, 'glow').setBlendMode(Phaser.BlendModes.ADD)
        .setTint(tint).setAlpha(alpha).setScale(core / RADIAL_R).setDepth(9001);
      this.tweens.add({ targets: g, alpha: alpha * 0.74, scale: (core / RADIAL_R) * 0.92, duration: 820 + Math.floor((l.x * 13 + l.y * 7) % 520), yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }

    // ---- input ----
    this.keys = this.input.keyboard.addKeys({
      up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', W: 'W', A: 'A', S: 'S', D: 'D', E: 'E', space: 'SPACE',
    });
    window.__onEnter = () => this.tryEnter();   // the on-screen A button calls this

    // ---- camera follows the hero ----
    this.cameras.main.setBounds(0, 0, Wp, Hp);
    this.applyZoom();
    this.cameras.main.startFollow(this.hero, true, 0.16, 0.16);
    this.scale.on('resize', this.applyZoom, this);
  }

  update() {
    if (typeof window !== 'undefined' && window.__interiorOpen) return;  // paused while inside a building
    this.hero.setDepth(this.hero.y);
    this.lantern.setPosition(this.hero.x, this.hero.y - 6);
    const atDoor = this.moving ? null : this.doors[this.tx + ',' + this.ty];
    if (atDoor && (Phaser.Input.Keyboard.JustDown(this.keys.E) || Phaser.Input.Keyboard.JustDown(this.keys.space))) { this.enter(atDoor); return; }
    if (!this.moving) {
      const d = this.readDir();
      if (d) {
        this.face = d;
        const nx = this.tx + DIR[d].dx, ny = this.ty + DIR[d].dy;
        if (this.walkable(nx, ny)) {
          if (this.hero.anims.currentAnim?.key !== d || !this.hero.anims.isPlaying) this.hero.play(d);
          this.moving = true; this.tx = nx; this.ty = ny;
          this.tweens.add({ targets: this.hero, x: this.cx(nx), y: this.cy(ny), duration: STEP_MS, ease: 'Linear', onComplete: () => { this.moving = false; } });
        } else this.setIdle();
      } else this.setIdle();
    }
    this.setPrompt(atDoor ? atDoor.label : null);
  }

  tryEnter() {
    if (this.moving || window.__interiorOpen) return;
    const atDoor = this.doors[this.tx + ',' + this.ty];
    if (atDoor) this.enter(atDoor);
  }
  enter(info) {
    this.setIdle();
    window.__interior?.open({ screen: info.screen, shop: info.shop, lockKey: info.lockKey, label: info.label });
  }
  setPrompt(label) {
    if (label === this._prompt) return;
    this._prompt = label;
    window.__setPrompt?.(label ? `Enter ${label}  ▸ E` : null);
  }

  readDir() {
    const k = this.keys, p = (typeof window !== 'undefined' && window.__pad) || {};
    if (k.up.isDown || k.W.isDown || p.up) return 'up';
    if (k.down.isDown || k.S.isDown || p.down) return 'down';
    if (k.left.isDown || k.A.isDown || p.left) return 'left';
    if (k.right.isDown || k.D.isDown || p.right) return 'right';
    return null;
  }
  setIdle() { this.hero.anims.stop(); this.hero.setFrame(DIR[this.face].idle); }

  // tile/pixel helpers (sprites are bottom-centre anchored)
  cx(tx) { return tx * TILE + TILE / 2; }
  cy(ty) { return (ty + 1) * TILE; }
  tileX(px) { return Math.floor(px / TILE); }
  tileY(py) { return Math.floor((py - 1) / TILE); }
  block(x, y) { if (x >= 0 && y >= 0 && x < this.W && y < this.H) this.blocked[y * this.W + x] = 1; }
  blockFootprint(tx, ty, fw, fh) { const hw = (fw - 1) >> 1; for (let y = ty - fh + 1; y <= ty; y++) for (let x = tx - hw; x <= tx + hw; x++) this.block(x, y); }
  walkable(x, y) { return x >= 0 && y >= 0 && x < this.W && y < this.H && !this.blocked[y * this.W + x]; }

  addLabel(x, y, text) {
    this.labels.push(this.add.text(x, y, text, {
      fontFamily: 'monospace', fontSize: '9px', color: '#f1e2bc', stroke: '#000000', strokeThickness: 3, resolution: 3,
    }).setOrigin(0.5, 1).setDepth(9500));
  }

  applyZoom() {
    const cam = this.cameras.main;
    const short = Math.min(this.scale.width, this.scale.height);
    const zoom = Math.max(2, Math.min(5, Math.floor(short / (SHORT_SIDE_TILES * TILE))));
    cam.setZoom(zoom);
    for (const t of this.labels) t.setScale(1 / zoom);
  }

  ensureRadials() {
    const radial = (key, stops) => {
      if (this.textures.exists(key)) return;
      const s = RADIAL_R * 2;
      const tex = this.textures.createCanvas(key, s, s);
      const ctx = tex.getContext();
      const g = ctx.createRadialGradient(RADIAL_R, RADIAL_R, 0, RADIAL_R, RADIAL_R, RADIAL_R);
      stops.forEach(([o, c]) => g.addColorStop(o, c));
      ctx.fillStyle = g; ctx.fillRect(0, 0, s, s); tex.refresh();
    };
    radial('lightmask', [[0.0, 'rgba(255,255,255,1)'], [0.5, 'rgba(255,255,255,0.55)'], [1.0, 'rgba(255,255,255,0)']]);
    radial('glow', [[0.0, 'rgba(255,255,255,0.9)'], [0.4, 'rgba(255,255,255,0.4)'], [1.0, 'rgba(255,255,255,0)']]);
  }
}
