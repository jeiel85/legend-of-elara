// NPCs: villagers, shopkeepers. Drawn procedurally, interact via dialog.
export class NPC {
  constructor(def) {
    this.id = def.id;
    this.tx = def.tx;
    this.ty = def.ty;
    this.dialog = def.dialog;
    this.shop = !!def.shop;
    this.t = Math.random() * 10;
    this.x = 0;
    this.y = 0;
  }

  sync(world, TILE_SIZE) {
    this.x = this.tx * TILE_SIZE + 2;
    this.y = this.ty * TILE_SIZE + 1;
  }

  update(dt) {
    this.t += dt;
  }

  draw(ctx, camOff) {
    const sx = Math.round(this.x - camOff.x);
    const sy = Math.round(this.y - camOff.y);
    try {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(sx + 1, sy + 12, 10, 3);
      const robe = this.id === 'elder' ? '#8a2e5e' : this.shop ? '#2e6fd9' : '#7a5a3a';
      ctx.fillStyle = robe;
      ctx.fillRect(sx + 2, sy + 6, 8, 6);
      ctx.fillStyle = '#ffcf9e';
      ctx.fillRect(sx + 3, sy + 1, 6, 5);
      ctx.fillStyle = this.id === 'elder' ? '#e8e8e8' : '#3a2a1a';
      ctx.fillRect(sx + 3, sy, 6, 2);
      ctx.fillStyle = '#222';
      ctx.fillRect(sx + 4, sy + 3, 1, 1);
      ctx.fillRect(sx + 7, sy + 3, 1, 1);
      if (this.shop) {
        ctx.fillStyle = '#ffd94a';
        ctx.fillRect(sx + 1, sy - 3, 10, 2);
      }
    } catch (e) { /* stub */ }
  }
}
