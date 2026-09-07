// Enemy base + all enemy AI incl. 4 bosses with phases.
import { TILE_SIZE } from '../world/tiles.js';
import { moveWithTileCollision, dist, dirVec } from '../engine/utils.js';
import { ENEMY_STATS } from '../content/enemies.js';

let nextId = 1;

export class Enemy {
  constructor(type, tx, ty) {
    const st = ENEMY_STATS[type] || ENEMY_STATS.slime;
    this.id = nextId++;
    this.type = type;
    this.name = st.name;
    this.maxHp = st.hp;
    this.hp = st.hp;
    this.damage = st.damage;
    this.speed = st.speed;
    this.ai = st.ai;
    this.w = st.w || 12;
    this.h = st.h || 12;
    this.x = tx * TILE_SIZE + (TILE_SIZE - this.w) / 2;
    this.y = ty * TILE_SIZE + (TILE_SIZE - this.h) / 2;
    this.dir = 'down';
    this.t = Math.random() * 10;
    this.hitT = 0;
    this.stun = 0;
    this.shootCd = 1 + Math.random() * 2;
    this.lungeT = 0;
    this.lungeCd = 2;
    this.dead = false;
    this.isBoss = !!st.boss;
    this.dungeon = st.dungeon || null;
    this.phase = 1;
    this.summonCd = 4;
    this.chargeT = 0;
    this.chargeCd = 3;
    this.flying = !!st.flying;
    this.color = st.color;
    this.homeTx = tx;
    this.homeTy = ty;
    this.splitDone = false;
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  // True if the given pixel point lies inside a safe zone of the current map.
  inSafeZone(game, px, py) {
    const zones = game.world.mapDef().safeZones;
    if (!zones) return false;
    for (const z of zones) {
      if (px >= z.x0 * TILE_SIZE && px < z.x1 * TILE_SIZE &&
          py >= z.y0 * TILE_SIZE && py < z.y1 * TILE_SIZE) return true;
    }
    return false;
  }

  hurt(amount, fromDir, game) {
    if (this.dead) return false;
    // knight shielded front: block unless from behind or bomb
    if (this.ai === 'shielded' || this.ai === 'bossKnight') {
      const want = this.dir; // enemy facing
      // if attack comes from front (opposite of fromDir?), approximate: if fromDir equals enemy dir -> front hit blocked
      if (fromDir === this.dir && amount < 99 && !game?.lastHitWasBomb) {
        return 'blocked';
      }
    }
    this.hp -= amount;
    this.hitT = 0.15;
    if (this.hp <= 0) {
      this.dead = true;
      return true;
    }
    // boss phase transitions
    if (this.isBoss) {
      const frac = this.hp / this.maxHp;
      if (this.type === 'demonKing') {
        this.phase = frac < 0.33 ? 3 : frac < 0.66 ? 2 : 1;
      } else {
        this.phase = frac < 0.5 ? 2 : 1;
      }
    }
    return true;
  }

  update(dt, game) {
    if (this.dead) return { projectiles: [], spawns: [] };
    this.t += dt;
    if (this.hitT > 0) this.hitT -= dt;
    if (this.stun > 0) { this.stun -= dt; return { projectiles: [], spawns: [] }; }
    const p = game.player;
    const dx = p.cx - this.cx;
    const dy = p.cy - this.cy;
    const d = Math.hypot(dx, dy) || 1;
    let mx = 0;
    let my = 0;
    const projectiles = [];
    const spawns = [];
    const spd = this.speed * (this.phase === 3 ? 1.5 : this.phase === 2 ? 1.25 : 1);

    const facePlayer = () => {
      if (Math.abs(dx) > Math.abs(dy)) this.dir = dx < 0 ? 'left' : 'right';
      else this.dir = dy < 0 ? 'up' : 'down';
    };

    // Safe zones (e.g. village): enemies never chase/attack inside, and
    // wanderers that drifted in walk back home instead.
    const pSafe = this.inSafeZone(game, p.cx, p.cy);
    const eSafe = this.inSafeZone(game, this.cx, this.cy);
    if (pSafe || eSafe) {
      if (eSafe) {
        const hx = this.homeTx * TILE_SIZE + TILE_SIZE / 2 - this.cx;
        const hy = this.homeTy * TILE_SIZE + TILE_SIZE / 2 - this.cy;
        const hd = Math.hypot(hx, hy) || 1;
        if (hd > TILE_SIZE * 0.5) {
          mx = (hx / hd) * spd;
          my = (hy / hd) * spd;
        }
      }
    } else {
    switch (this.ai) {
      case 'chase':
        facePlayer();
        mx = (dx / d) * spd;
        my = (dy / d) * spd;
        break;
      case 'shooter':
        facePlayer();
        if (d > 120) { mx = (dx / d) * spd; my = (dy / d) * spd; }
        else if (d < 70) { mx = -(dx / d) * spd; my = -(dy / d) * spd; }
        this.shootCd -= dt;
        if (this.shootCd <= 0 && d < 200) {
          this.shootCd = 2.2;
          projectiles.push({ kind: 'rock', x: this.cx, y: this.cy, dx: dx / d, dy: dy / d, hostile: true });
        }
        break;
      case 'erratic': {
        facePlayer();
        const a = this.t * 3.1 + this.id;
        mx = Math.cos(a) * spd + (dx / d) * spd * 0.4;
        my = Math.sin(a * 1.3) * spd + (dy / d) * spd * 0.4;
        if (this.type === 'wisp') {
          this.shootCd -= dt;
          if (this.shootCd <= 0 && d < 170) {
            this.shootCd = 2.8;
            projectiles.push({ kind: 'fire', x: this.cx, y: this.cy, dx: dx / d, dy: dy / d, hostile: true });
          }
        }
        break;
      }
      case 'lunger':
        facePlayer();
        this.lungeCd -= dt;
        if (this.lungeT > 0) {
          this.lungeT -= dt;
          const v = dirVec(this.dir);
          mx = v.x * spd * 3;
          my = v.y * spd * 3;
        } else if (this.lungeCd <= 0 && d < 110) {
          this.lungeT = 0.35;
          this.lungeCd = 2.0;
        } else {
          mx = (dx / d) * spd * 0.5;
          my = (dy / d) * spd * 0.5;
        }
        break;
      case 'shielded':
        facePlayer();
        mx = (dx / d) * spd;
        my = (dy / d) * spd;
        break;
      case 'bossSlime':
        facePlayer();
        mx = (dx / d) * spd;
        my = (dy / d) * spd;
        // split once at half hp
        if (!this.splitDone && this.hp < this.maxHp / 2) {
          this.splitDone = true;
          spawns.push({ type: 'slimeSmall', x: this.cx - 20, y: this.cy });
          spawns.push({ type: 'slimeSmall', x: this.cx + 20, y: this.cy });
          spawns.push({ type: 'slimeSmall', x: this.cx, y: this.cy - 20 });
        }
        // hop: burst movement
        if (this.phase === 2) {
          const hop = Math.sin(this.t * 5) > 0.3 ? 1.6 : 0.5;
          mx *= hop; my *= hop;
        }
        break;
      case 'bossOcto':
        facePlayer();
        this.shootCd -= dt * (this.phase === 2 ? 1.8 : 1);
        this.chargeCd -= dt;
        if (this.chargeT > 0) {
          this.chargeT -= dt;
          const v = dirVec(this.dir);
          mx = v.x * spd * 3.2;
          my = v.y * spd * 3.2;
        } else if (this.chargeCd <= 0 && d < 200) {
          this.chargeT = 0.5;
          this.chargeCd = 3.5;
        } else {
          mx = (dx / d) * spd * 0.6;
          my = (dy / d) * spd * 0.6;
        }
        if (this.shootCd <= 0) {
          this.shootCd = 1.6;
          const n = this.phase === 2 ? 5 : 3;
          for (let i = 0; i < n; i++) {
            const a = Math.atan2(dy, dx) + (i - (n - 1) / 2) * 0.3;
            projectiles.push({ kind: 'rock', x: this.cx, y: this.cy, dx: Math.cos(a), dy: Math.sin(a), hostile: true });
          }
        }
        break;
      case 'bossKnight':
        facePlayer();
        this.lungeCd -= dt;
        this.shootCd -= dt;
        if (this.lungeT > 0) {
          this.lungeT -= dt;
          const v = dirVec(this.dir);
          mx = v.x * spd * 3.5;
          my = v.y * spd * 3.5;
        } else if (this.lungeCd <= 0 && d < 220) {
          this.lungeT = 0.4;
          this.lungeCd = this.phase === 2 ? 1.4 : 2.2;
        } else {
          mx = (dx / d) * spd;
          my = (dy / d) * spd;
        }
        if (this.phase === 2 && this.shootCd <= 0 && d < 200) {
          this.shootCd = 2.0;
          projectiles.push({ kind: 'fire', x: this.cx, y: this.cy, dx: dx / d, dy: dy / d, hostile: true });
        }
        break;
      case 'bossDemon': {
        facePlayer();
        this.shootCd -= dt * (this.phase === 3 ? 2 : 1);
        this.summonCd -= dt;
        this.lungeCd -= dt;
        if (this.phase === 1) {
          mx = (dx / d) * spd * 0.4;
          my = (dy / d) * spd * 0.4;
          if (this.shootCd <= 0) {
            this.shootCd = 1.2;
            const n = 3;
            for (let i = 0; i < n; i++) {
              const a = Math.atan2(dy, dx) + (i - 1) * 0.35;
              projectiles.push({ kind: 'fire', x: this.cx, y: this.cy, dx: Math.cos(a), dy: Math.sin(a), hostile: true });
            }
          }
        } else if (this.phase === 2) {
          if (this.lungeT > 0) {
            this.lungeT -= dt;
            const v = dirVec(this.dir);
            mx = v.x * spd * 3;
            my = v.y * spd * 3;
          } else if (this.lungeCd <= 0) {
            this.lungeT = 0.4;
            this.lungeCd = 1.8;
          } else {
            mx = (dx / d) * spd;
            my = (dy / d) * spd;
          }
          if (this.summonCd <= 0) {
            this.summonCd = 6;
            spawns.push({ type: 'bat', x: this.cx + 24, y: this.cy });
            spawns.push({ type: 'slimeSmall', x: this.cx - 24, y: this.cy });
          }
        } else {
          mx = (dx / d) * spd * 1.2;
          my = (dy / d) * spd * 1.2;
          if (this.shootCd <= 0) {
            this.shootCd = 0.9;
            for (let i = 0; i < 8; i++) {
              const a = (i / 8) * Math.PI * 2 + this.t;
              projectiles.push({ kind: 'fire', x: this.cx, y: this.cy, dx: Math.cos(a), dy: Math.sin(a), hostile: true });
            }
          }
        }
        break;
      }
      default:
        mx = (dx / d) * spd;
        my = (dy / d) * spd;
    }
    } // end safe-zone gate

    // tile collision (flying ignores water? keep simple: flying ignores all)
    if (!this.flying) {
      const isSolid = (ch) => {
        if (ch === '.' || ch === ',' || ch === 'G' || ch === 'B' || ch === 'F' || ch === 'P' || ch === 'S' || ch === 'N' || ch === '=' || ch === 'A' || ch === 'O') return false;
        return true;
      };
      const res = moveWithTileCollision(
        game.world.grid.map((r) => r.join('')), TILE_SIZE, isSolid,
        this.x, this.y, this.w, this.h, mx * dt, my * dt
      );
      this.x = res.x;
      this.y = res.y;
    } else {
      this.x += mx * dt;
      this.y += my * dt;
    }
    return { projectiles, spawns };
  }

  draw(ctx, camOff) {
    const sx = Math.round(this.x - camOff.x);
    const sy = Math.round(this.y - camOff.y);
    try {
      const flash = this.hitT > 0 && Math.floor(this.hitT * 40) % 2 === 0;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(sx, sy + this.h - 2, this.w, 2);
      ctx.fillStyle = flash ? '#ffffff' : this.color;
      if (this.type === 'slimeSmall' || this.type === 'slime' || this.type === 'slimeKing') {
        const squash = Math.sin(this.t * 6) > 0 ? 1 : 0;
        ctx.fillRect(sx, sy + squash, this.w, this.h - squash);
        ctx.fillStyle = '#fff';
        ctx.fillRect(sx + 3, sy + 3, 2, 2);
        ctx.fillRect(sx + this.w - 5, sy + 3, 2, 2);
        if (this.isBoss) {
          ctx.fillStyle = '#7d2e1e';
          ctx.fillRect(sx + 2, sy - 4, this.w - 4, 3); // crown-ish
        }
      } else if (this.type === 'bat' || this.type === 'wisp') {
        const flap = Math.sin(this.t * 12) > 0 ? 2 : 0;
        ctx.fillRect(sx - 2, sy + 2 - flap, 4, 3);
        ctx.fillRect(sx + this.w - 2, sy + 2 - flap, 4, 3);
        ctx.fillRect(sx + 1, sy + 1, this.w - 2, this.h - 2);
        ctx.fillStyle = this.type === 'wisp' ? '#fff' : '#e33';
        ctx.fillRect(sx + 3, sy + 4, 2, 2);
      } else if (this.type === 'knight' || this.type === 'knightCaptain') {
        ctx.fillRect(sx + 1, sy, this.w - 2, this.h);
        ctx.fillStyle = '#3d3d4a';
        ctx.fillRect(sx + 2, sy + 1, this.w - 4, 4); // helm
        ctx.fillStyle = '#ffd94a';
        ctx.fillRect(sx + 3, sy + 6, this.w - 6, 2);
        if (this.dir === 'left') { ctx.fillStyle = '#5d5d6e'; ctx.fillRect(sx - 3, sy + 3, 3, 8); }
        if (this.dir === 'right') { ctx.fillStyle = '#5d5d6e'; ctx.fillRect(sx + this.w, sy + 3, 3, 8); }
      } else if (this.type === 'octo' || this.type === 'octoKing') {
        ctx.fillRect(sx + 1, sy + 2, this.w - 2, this.h - 2);
        ctx.fillStyle = '#7d2e1e';
        ctx.fillRect(sx + 3, sy + 4, 2, 2);
        ctx.fillRect(sx + this.w - 5, sy + 4, 2, 2);
        const wig = Math.floor(this.t * 6) % 2;
        ctx.fillStyle = flash ? '#fff' : this.color;
        ctx.fillRect(sx + 1 + wig, sy + this.h - 3, 3, 3);
        ctx.fillRect(sx + this.w - 4 - wig, sy + this.h - 3, 3, 3);
      } else if (this.type === 'demonKing') {
        ctx.fillRect(sx, sy, this.w, this.h);
        ctx.fillStyle = '#3d154d';
        ctx.fillRect(sx - 3, sy - 5, 5, 6);
        ctx.fillRect(sx + this.w - 2, sy - 5, 5, 6);
        ctx.fillStyle = '#ff4f4f';
        ctx.fillRect(sx + 4, sy + 6, 3, 3);
        ctx.fillRect(sx + this.w - 7, sy + 6, 3, 3);
      } else {
        ctx.fillRect(sx, sy, this.w, this.h);
        ctx.fillStyle = '#222';
        ctx.fillRect(sx + 3, sy + 4, 2, 2);
        ctx.fillRect(sx + this.w - 5, sy + 4, 2, 2);
      }
      if (this.stun > 0) {
        ctx.fillStyle = '#ffd94a';
        ctx.fillRect(sx + 2, sy - 5, 2, 2);
        ctx.fillRect(sx + this.w - 4, sy - 7, 2, 2);
      }
    } catch (e) { /* stub */ }
  }
}

export function createEnemy(type, tx, ty) {
  return new Enemy(type, tx, ty);
}

export function createEnemyAtPixel(type, x, y) {
  const e = new Enemy(type, 0, 0);
  e.x = x;
  e.y = y;
  return e;
}
