// Player: 4-dir pixel movement with tile collision, sword arc, items, damage/iframes.
import { TILE_SIZE } from '../world/tiles.js';
import { moveWithTileCollision, dirVec } from '../engine/utils.js';
import { swordDamage } from '../content/items.js';

export class Player {
  constructor() {
    this.w = 12;
    this.h = 14;
    this.x = 0;
    this.y = 0;
    this.dir = 'down';
    this.speed = 95;
    this.hp = 6; // half-hearts
    this.maxHp = 6;
    this.gems = 0;
    this.keys = 0;
    this.arrows = 10;
    this.bombAmmo = 3;
    this.swordTier = 0;
    this.items = {}; // id -> true/count
    this.selectedItem = 'bow';
    this.iframes = 0;
    this.knockX = 0;
    this.knockY = 0;
    this.attackCd = 0;
    this.attackT = 0; // active swing timer
    this.useCd = 0;
    this.moving = false;
    this.animT = 0;
    this.dead = false;
    this.hasShield = false;
    this.potions = 0;
    this.heartPieces = 0;
    this.bossKeys = {}; // dungeon -> bool
    this.compass = {}; // dungeon -> bool
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  placeAtTile(tx, ty) {
    this.x = tx * TILE_SIZE + 2;
    this.y = ty * TILE_SIZE + 1;
    this.knockX = 0;
    this.knockY = 0;
  }

  swordDmg() {
    return swordDamage(this.swordTier);
  }

  update(dt, input, world) {
    if (this.dead) return {};
    const out = {};
    if (this.iframes > 0) this.iframes -= dt;
    if (this.attackCd > 0) this.attackCd -= dt;
    if (this.attackT > 0) this.attackT -= dt;
    if (this.useCd > 0) this.useCd -= dt;

    let dx = 0;
    let dy = 0;
    if (input.held('left')) dx -= 1;
    if (input.held('right')) dx += 1;
    if (input.held('up')) dy -= 1;
    if (input.held('down')) dy += 1;
    this.moving = dx !== 0 || dy !== 0;
    if (this.moving) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      if (Math.abs(dx) > Math.abs(dy)) this.dir = dx < 0 ? 'left' : 'right';
      else this.dir = dy < 0 ? 'up' : 'down';
      this.animT += dt;
    }

    // knockback decay
    dx = dx * this.speed + this.knockX;
    dy = dy * this.speed + this.knockY;
    this.knockX *= Math.pow(0.001, dt);
    this.knockY *= Math.pow(0.001, dt);
    if (Math.abs(this.knockX) < 5) this.knockX = 0;
    if (Math.abs(this.knockY) < 5) this.knockY = 0;

    const isSolid = (ch) => {
      // player collides with solid; warps/stairs walkable
      const map = { '.': 0, ',': 0, G: 0, B: 0, F: 0, P: 0, S: 0, N: 0, '=': 0, A: 0, O: 0 };
      if (map[ch] === 0) return false;
      // use tile props fallback
      const solids = { g: 1, T: 1, n: 1, '#': 1, '^': 1, H: 1, R: 1, W: 1, d: 1, L: 1, C: 1, V: 1, K: 1, X: 1, '~': 1 };
      return !!solids[ch];
    };
    const res = moveWithTileCollision(
      world.grid.map((r) => r.join('')), TILE_SIZE, isSolid,
      this.x, this.y, this.w, this.h, dx * dt, dy * dt
    );
    this.x = res.x;
    this.y = res.y;

    // pushable blocks: if blocked and pushing, try to push
    if ((res.hitX || res.hitY) && this.moving) {
      this.tryPush(world);
    }

    if (input.justPressed('attack')) {
      if (this.attackCd <= 0 && this.swordTier > 0) {
        this.attackCd = 0.4;
        this.attackT = 0.25;
        out.attack = true;
      } else if (this.swordTier <= 0) {
        out.noSword = true;
      }
    }
    if (input.justPressed('use')) {
      out.useItem = true;
    }
    if (input.justPressed('cycle')) {
      this.cycleItem();
    }
    return out;
  }

  cycleItem() {
    const order = ['bow', 'bombs', 'boomerang', 'lantern', 'potion'];
    const owned = order.filter((id) => {
      if (id === 'potion') return this.potions > 0;
      if (id === 'bow') return !!this.items.bow;
      if (id === 'bombs') return this.bombAmmo > 0 || !!this.items.bombs;
      if (id === 'boomerang') return !!this.items.boomerang;
      if (id === 'lantern') return !!this.items.lantern;
      return false;
    });
    if (owned.length === 0) return;
    let i = owned.indexOf(this.selectedItem);
    i = (i + 1) % owned.length;
    this.selectedItem = owned[i];
  }

  tryPush(world) {
    const cx = this.cx;
    const cy = this.cy;
    const tx = Math.floor(cx / TILE_SIZE);
    const ty = Math.floor(cy / TILE_SIZE);
    const d = dirVec(this.dir);
    const bx = tx + d.x;
    const by = ty + d.y;
    if (world.getTile(bx, by) !== 'K') return false;
    const dx2 = bx + d.x;
    const dy2 = by + d.y;
    if (world.getTile(dx2, dy2) !== '.' && world.getTile(dx2, dy2) !== ',') return false;
    world.setTile(bx, by, '.', true);
    world.setTile(dx2, dy2, 'K', true);
    return true;
  }

  // sword hitbox in front (active while attackT>0)
  swordBox() {
    if (this.attackT <= 0) return null;
    const range = 14;
    if (this.dir === 'up') return { x: this.x - 4, y: this.y - range, w: this.w + 8, h: range + 6 };
    if (this.dir === 'down') return { x: this.x - 4, y: this.y + this.h - 2, w: this.w + 8, h: range + 6 };
    if (this.dir === 'left') return { x: this.x - range, y: this.y - 4, w: range + 6, h: this.h + 8 };
    return { x: this.x + this.w - 6, y: this.y - 4, w: range + 6, h: this.h + 8 };
  }

  hurt(amount, fromX, fromY) {
    if (this.iframes > 0 || this.dead) return false;
    this.hp -= amount;
    this.iframes = 1.0;
    const dx = this.cx - fromX;
    const dy = this.cy - fromY;
    const len = Math.hypot(dx, dy) || 1;
    this.knockX = (dx / len) * 180;
    this.knockY = (dy / len) * 180;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
    }
    return true;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  fullHeal() {
    this.hp = this.maxHp;
  }

  // shield blocks projectile coming from front?
  shieldBlocks(px, py) {
    if (!this.hasShield && !this.items.shield) return false;
    const d = dirVec(this.dir);
    // vector from player to projectile
    const vx = px - this.cx;
    const vy = py - this.cy;
    return vx * d.x + vy * d.y > 0;
  }

  serialize() {
    return {
      x: this.x, y: this.y, dir: this.dir,
      hp: this.hp, maxHp: this.maxHp, gems: this.gems, keys: this.keys,
      arrows: this.arrows, bombAmmo: this.bombAmmo, swordTier: this.swordTier,
      items: this.items, selectedItem: this.selectedItem,
      hasShield: this.hasShield, potions: this.potions,
      heartPieces: this.heartPieces, bossKeys: this.bossKeys, compass: this.compass
    };
  }

  deserialize(s) {
    if (!s) return;
    Object.assign(this, {
      x: s.x, y: s.y, dir: s.dir || 'down',
      hp: s.hp, maxHp: s.maxHp, gems: s.gems, keys: s.keys,
      arrows: s.arrows, bombAmmo: s.bombAmmo, swordTier: s.swordTier,
      items: s.items || {}, selectedItem: s.selectedItem || 'bow',
      hasShield: !!s.hasShield, potions: s.potions || 0,
      heartPieces: s.heartPieces || 0, bossKeys: s.bossKeys || {}, compass: s.compass || {}
    });
    this.dead = false;
    this.iframes = 0;
    this.knockX = 0;
    this.knockY = 0;
  }

  draw(ctx, camOff, frame) {
    const sx = Math.round(this.x - camOff.x);
    const sy = Math.round(this.y - camOff.y);
    // blink during iframes
    if (this.iframes > 0 && Math.floor(frame / 4) % 2 === 0) return;
    try {
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(sx + 1, sy + 12, 10, 3);
      // body (tunic green)
      const walk = this.moving ? (Math.floor(this.animT * 8) % 2) : 0;
      ctx.fillStyle = '#2fa32f';
      ctx.fillRect(sx + 2, sy + 6, 8, 6 - walk);
      // head
      ctx.fillStyle = '#ffcf9e';
      ctx.fillRect(sx + 3, sy + 1, 6, 5);
      // hair/hat
      ctx.fillStyle = '#e8a34f';
      ctx.fillRect(sx + 3, sy, 6, 2);
      if (this.dir === 'up') {
        ctx.fillStyle = '#2fa32f';
        ctx.fillRect(sx + 3, sy + 1, 6, 5);
      }
      // eyes by dir
      ctx.fillStyle = '#222';
      if (this.dir === 'down') { ctx.fillRect(sx + 4, sy + 3, 1, 1); ctx.fillRect(sx + 7, sy + 3, 1, 1); }
      else if (this.dir === 'left') { ctx.fillRect(sx + 3, sy + 3, 1, 1); }
      else if (this.dir === 'right') { ctx.fillRect(sx + 8, sy + 3, 1, 1); }
      // sword swing arc
      if (this.attackT > 0) {
        ctx.fillStyle = '#e8e8e8';
        const d = dirVec(this.dir);
        const px = sx + 6 + d.x * 10 - 4;
        const py = sy + 7 + d.y * 10 - 4;
        ctx.fillRect(px, py, 8, 8);
        ctx.fillStyle = '#8a5a2e';
        ctx.fillRect(sx + 6 + d.x * 5 - 1, sy + 7 + d.y * 5 - 1, 2, 2);
      }
    } catch (e) { /* stub ctx */ }
  }
}
