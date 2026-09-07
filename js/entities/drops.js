// Pickups: hearts, gems, keys, ammo, shards, containers.
export class Drop {
  constructor(kind, x, y, amount) {
    this.kind = kind; // heart|gem|key|arrows|bombs|heartPiece|shard|container
    this.x = x;
    this.y = y;
    this.w = 10;
    this.h = 10;
    this.amount = amount || 1;
    this.t = 0;
    this.life = 25;
    this.dead = false;
    this.vx = (Math.random() * 2 - 1) * 40;
    this.vy = -40 - Math.random() * 30;
  }

  update(dt) {
    this.t += dt;
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    // small pop physics then rest
    if (this.t < 0.4) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vy += 200 * dt;
    }
  }

  box() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  draw(ctx, camOff) {
    const sx = Math.round(this.x - camOff.x);
    const sy = Math.round(this.y - camOff.y + Math.sin(this.t * 5) * 1);
    try {
      if (this.kind === 'heart') {
        ctx.fillStyle = '#ff4f6e';
        ctx.fillRect(sx + 1, sy + 2, 8, 6);
        ctx.fillRect(sx + 2, sy + 1, 2, 2);
        ctx.fillRect(sx + 6, sy + 1, 2, 2);
        ctx.fillStyle = '#fff';
        ctx.fillRect(sx + 3, sy + 3, 1, 1);
      } else if (this.kind === 'gem') {
        ctx.fillStyle = this.amount >= 5 ? '#5bd9ff' : '#3fa34d';
        ctx.fillRect(sx + 2, sy + 1, 6, 8);
        ctx.fillStyle = '#fff';
        ctx.fillRect(sx + 3, sy + 2, 2, 2);
      } else if (this.kind === 'key' || this.kind === 'bosskey') {
        ctx.fillStyle = this.kind === 'bosskey' ? '#8a2e8a' : '#ffd94a';
        ctx.fillRect(sx + 1, sy + 4, 8, 2);
        ctx.fillRect(sx + 7, sy + 2, 2, 6);
      } else if (this.kind === 'arrows') {
        ctx.fillStyle = '#8a5a2e';
        ctx.fillRect(sx + 2, sy + 4, 6, 2);
        ctx.fillStyle = '#e8e8e8';
        ctx.fillRect(sx + 6, sy + 3, 2, 4);
      } else if (this.kind === 'bombs') {
        ctx.fillStyle = '#222';
        ctx.fillRect(sx + 2, sy + 3, 6, 5);
      } else {
        ctx.fillStyle = '#ffd94a';
        ctx.fillRect(sx + 1, sy + 1, 8, 8);
      }
    } catch (e) { /* stub */ }
  }
}

export function rollEnemyDrop(type) {
  // returns array of {kind, amount}
  const r = Math.random();
  if (type === 'slimeSmall') {
    if (r < 0.15) return [{ kind: 'heart' }];
    if (r < 0.4) return [{ kind: 'gem', amount: 1 }];
    return [];
  }
  if (r < 0.22) return [{ kind: 'heart' }];
  if (r < 0.55) return [{ kind: 'gem', amount: 1 + Math.floor(Math.random() * 3) }];
  if (r < 0.62) return [{ kind: 'arrows', amount: 3 }];
  if (r < 0.69) return [{ kind: 'bombs', amount: 2 }];
  if (r < 0.72) return [{ kind: 'gem', amount: 5 }];
  return [];
}

export function rollGrassDrop() {
  const r = Math.random();
  if (r < 0.08) return [{ kind: 'heart' }];
  if (r < 0.3) return [{ kind: 'gem', amount: 1 }];
  if (r < 0.34) return [{ kind: 'arrows', amount: 2 }];
  if (r < 0.37) return [{ kind: 'bombs', amount: 1 }];
  return [];
}
