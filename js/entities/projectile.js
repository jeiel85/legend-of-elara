// Arrows, enemy rocks/fire, boomerang (returns), bombs (timer + explosion).
import { TILE_SIZE } from '../world/tiles.js';
import { aabbOverlap } from '../engine/utils.js';

let pid = 1;

export class Projectile {
  constructor(opts) {
    this.id = pid++;
    this.kind = opts.kind; // arrow|rock|fire|boomerang
    this.x = opts.x || 0;
    this.y = opts.y || 0;
    this.w = opts.kind === 'fire' ? 8 : 6;
    this.h = opts.kind === 'fire' ? 8 : 6;
    this.dx = opts.dx || 0;
    this.dy = opts.dy || 0;
    this.speed = opts.kind === 'arrow' ? 200 : opts.kind === 'boomerang' ? 170 : 110;
    this.hostile = !!opts.hostile;
    this.dead = false;
    this.life = 2.5;
    this.damage = opts.damage || 1;
    // boomerang specifics
    this.returning = false;
    this.travelT = 0;
    this.maxTravel = 0.55;
    this.t = 0;
  }

  update(dt, game) {
    this.t += dt;
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    if (this.kind === 'boomerang') {
      this.travelT += dt;
      if (this.travelT >= this.maxTravel) this.returning = true;
      if (this.returning && game) {
        const px = game.player.cx;
        const py = game.player.cy;
        const dx = px - (this.x + this.w / 2);
        const dy = py - (this.y + this.h / 2);
        const d = Math.hypot(dx, dy) || 1;
        this.dx = dx / d;
        this.dy = dy / d;
        if (d < 10) { this.dead = true; return; }
      }
    }
    this.x += this.dx * this.speed * dt;
    this.y += this.dy * this.speed * dt;
    // wall collision (non-flying projectiles die on solid)
    if (game && game.world.isSolidPixel(this.x, this.y, this.w, this.h)) {
      this.dead = true;
    }
  }

  box() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  draw(ctx, camOff) {
    const sx = Math.round(this.x - camOff.x);
    const sy = Math.round(this.y - camOff.y);
    try {
      if (this.kind === 'arrow') {
        ctx.fillStyle = '#8a5a2e';
        ctx.fillRect(sx, sy + 2, 6, 2);
        ctx.fillStyle = '#e8e8e8';
        ctx.fillRect(sx + 4, sy + 1, 2, 4);
      } else if (this.kind === 'rock') {
        ctx.fillStyle = '#8d9099';
        ctx.fillRect(sx + 1, sy + 1, 4, 4);
      } else if (this.kind === 'fire') {
        ctx.fillStyle = Math.floor(this.t * 10) % 2 ? '#ff9e2e' : '#ff4f4f';
        ctx.fillRect(sx, sy, 8, 8);
        ctx.fillStyle = '#ffd94a';
        ctx.fillRect(sx + 2, sy + 2, 4, 4);
      } else if (this.kind === 'boomerang') {
        ctx.fillStyle = '#ffd94a';
        const r = Math.floor(this.t * 12) % 2;
        if (r) { ctx.fillRect(sx, sy + 2, 8, 2); }
        else { ctx.fillRect(sx + 3, sy, 2, 8); }
      }
    } catch (e) { /* stub */ }
  }
}

export class Bomb {
  constructor(x, y) {
    this.x = x - 5;
    this.y = y - 5;
    this.w = 10;
    this.h = 10;
    this.timer = 2.0;
    this.dead = false;
    this.exploded = false;
    this.explodeT = 0;
    this.t = 0;
  }

  box() {
    if (!this.exploded) return { x: this.x, y: this.y, w: this.w, h: this.h };
    return { x: this.x - 18, y: this.y - 18, w: 46, h: 46 };
  }

  update(dt) {
    this.t += dt;
    if (!this.exploded) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.exploded = true;
        this.explodeT = 0.35;
      }
    } else {
      this.explodeT -= dt;
      if (this.explodeT <= 0) this.dead = true;
    }
  }

  draw(ctx, camOff) {
    const sx = Math.round(this.x - camOff.x);
    const sy = Math.round(this.y - camOff.y);
    try {
      if (!this.exploded) {
        ctx.fillStyle = '#222';
        ctx.fillRect(sx + 1, sy + 3, 8, 7);
        ctx.fillStyle = Math.floor(this.t * 8) % 2 ? '#ff4f4f' : '#fff';
        ctx.fillRect(sx + 4, sy, 2, 3);
      } else {
        const r = 1 - this.explodeT / 0.35;
        ctx.fillStyle = '#ffd94a';
        ctx.fillRect(sx - 18, sy - 18, 46, 46);
        ctx.fillStyle = '#ff9e2e';
        ctx.fillRect(sx - 12 + r * 4, sy - 12 + r * 4, 34 - r * 8, 34 - r * 8);
        ctx.fillStyle = '#fff';
        ctx.fillRect(sx - 4, sy - 4, 18, 18);
      }
    } catch (e) { /* stub */ }
  }
}

export function playerBox(p) {
  return { x: p.x, y: p.y, w: p.w, h: p.h };
}

export function boxesHit(a, b) {
  return aabbOverlap(a, b);
}
