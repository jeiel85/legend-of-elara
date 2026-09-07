// Map loading, tile collision, warps, doors, dark rooms, secrets.
import { TILE_SIZE, isSolidChar } from './tiles.js';
import { MAPS, EXTRA_WARPS } from './maps.js';
import { tileAt } from '../engine/utils.js';

export class World {
  constructor() {
    this.mapId = 'overworld';
    this.grid = []; // mutable array of arrays of chars
    this.chests = new Map(); // chestId -> opened bool (per session; persisted in game state)
    this.openedDoors = new Set(); // "mapId:tx,ty"
    this.removedTiles = new Map(); // mapId -> Map("tx,ty" -> '.')
    this.gateOpen = false;
  }

  mapDef() {
    return MAPS[this.mapId];
  }

  mapPixelSize() {
    const def = this.mapDef();
    const w = Math.max(...def.grid.map((r) => r.length));
    return { w: w * TILE_SIZE, h: def.grid.length * TILE_SIZE };
  }

  loadMap(mapId) {
    this.mapId = mapId;
    const def = MAPS[mapId];
    this.grid = def.grid.map((row) => row.split(''));
    // re-apply removed tiles (cut grass, opened secrets, doors)
    const rm = this.removedTiles.get(mapId);
    if (rm) {
      for (const [key, ch] of rm) {
        const [tx, ty] = key.split(',').map(Number);
        if (this.grid[ty] && tx < this.grid[ty].length) this.grid[ty][tx] = ch;
      }
    }
    for (const key of this.openedDoors) {
      const [m, rest] = key.split(':');
      if (m !== mapId) continue;
      const [tx, ty] = rest.split(',').map(Number);
      if (this.grid[ty] && tx < this.grid[ty].length) this.grid[ty][tx] = '.';
    }
    // sealed gate opens permanently
    if (mapId === 'overworld' && this.gateOpen) {
      for (let y = 0; y < this.grid.length; y++) {
        for (let x = 0; x < this.grid[y].length; x++) {
          if (this.grid[y][x] === 'X') this.grid[y][x] = '.';
        }
      }
    }
  }

  getTile(tx, ty) {
    if (ty < 0 || ty >= this.grid.length) return '#';
    const row = this.grid[ty];
    if (!row || tx < 0 || tx >= row.length) return '#';
    return row[tx];
  }

  setTile(tx, ty, ch, persist) {
    if (ty < 0 || ty >= this.grid.length) return;
    if (!this.grid[ty] || tx < 0 || tx >= this.grid[ty].length) return;
    this.grid[ty][tx] = ch;
    if (persist) {
      if (!this.removedTiles.has(this.mapId)) this.removedTiles.set(this.mapId, new Map());
      this.removedTiles.get(this.mapId).set(tx + ',' + ty, ch);
    }
  }

  isSolid(tx, ty) {
    const ch = this.getTile(tx, ty);
    return isSolidChar(ch);
  }

  isSolidPixel(x, y, w, h) {
    const x0 = Math.floor(x / TILE_SIZE);
    const y0 = Math.floor(y / TILE_SIZE);
    const x1 = Math.floor((x + w - 0.01) / TILE_SIZE);
    const y1 = Math.floor((y + h - 0.01) / TILE_SIZE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (this.isSolid(tx, ty)) return true;
      }
    }
    return false;
  }

  tileAtPixel(x, y) {
    return this.getTile(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE));
  }

  // Warp check: player center tile. Returns warp object or null.
  warpAt(tx, ty) {
    const def = this.mapDef();
    if (def.warps) {
      for (const w of def.warps) {
        if (w.tx === tx && w.ty === ty) {
          if (w.needGate && !this.gateOpen) return null;
          return w;
        }
      }
    }
    for (const w of EXTRA_WARPS) {
      if (w.fromMap === this.mapId && w.tx === tx && w.ty === ty) return w;
    }
    return null;
  }

  chestAt(tx, ty) {
    const def = this.mapDef();
    if (!def.chests) return null;
    for (const c of def.chests) {
      if (c.tx === tx && c.ty === ty) return c;
    }
    return null;
  }

  isChestOpened(id) {
    return this.chests.get(id) === true;
  }

  openChest(id) {
    this.chests.set(id, true);
  }

  npcAt(tx, ty) {
    const def = this.mapDef();
    if (!def.npcs) return null;
    for (const n of def.npcs) {
      if (n.tx === tx && n.ty === ty) return n;
    }
    return null;
  }

  // adjacent interactable: chest/statue/npc/sign/door in front of player
  interactTarget(px, py, dir) {
    const cx = px + 6;
    const cy = py + 7;
    const tx = Math.floor(cx / TILE_SIZE);
    const ty = Math.floor(cy / TILE_SIZE);
    const dv = dir === 'up' ? [0, -1] : dir === 'down' ? [0, 1] : dir === 'left' ? [-1, 0] : [1, 0];
    const candidates = [
      [tx, ty],
      [tx + dv[0], ty + dv[1]]
    ];
    const def = this.mapDef();
    for (const [ax, ay] of candidates) {
      const chest = this.chestAt(ax, ay);
      if (chest && !this.isChestOpened(chest.id)) return { kind: 'chest', chest };
      if (this.getTile(ax, ay) === 'O') return { kind: 'statue', tx: ax, ty: ay };
      const npc = this.npcAt(ax, ay);
      if (npc) return { kind: 'npc', npc };
      if (def.signs) {
        for (const s of def.signs) {
          if (s.tx === ax && s.ty === ay) return { kind: 'sign', sign: s };
        }
      }
      const t = this.getTile(ax, ay);
      if (t === 'd') return { kind: 'lockeddoor', tx: ax, ty: ay };
      if (t === 'L') return { kind: 'bossdoor', tx: ax, ty: ay };
    }
    return null;
  }

  openDoor(tx, ty) {
    this.setTile(tx, ty, '.', true);
    this.openedDoors.add(this.mapId + ':' + tx + ',' + ty);
  }

  setGateOpen() {
    this.gateOpen = true;
    if (this.mapId === 'overworld') {
      for (let y = 0; y < this.grid.length; y++) {
        for (let x = 0; x < this.grid[y].length; x++) {
          if (this.grid[y][x] === 'X') this.grid[y][x] = '.';
        }
      }
    }
  }

  // serialize dynamic tile changes
  serialize() {
    const removed = {};
    for (const [mapId, m] of this.removedTiles) {
      removed[mapId] = Array.from(m.entries());
    }
    return {
      mapId: this.mapId,
      openedDoors: Array.from(this.openedDoors),
      removed,
      chests: Array.from(this.chests.entries()),
      gateOpen: this.gateOpen
    };
  }

  deserialize(s) {
    if (!s) return;
    this.openedDoors = new Set(s.openedDoors || []);
    this.removedTiles = new Map();
    if (s.removed) {
      for (const k of Object.keys(s.removed)) {
        this.removedTiles.set(k, new Map(s.removed[k]));
      }
    }
    this.chests = new Map(s.chests || []);
    this.gateOpen = !!s.gateOpen;
    this.loadMap(s.mapId || 'overworld');
  }

  // cut grass/bush at tile; returns true if cut
  cutAt(tx, ty) {
    const ch = this.getTile(tx, ty);
    if (ch === 'G' || ch === 'B') {
      this.setTile(tx, ty, '.', true);
      return true;
    }
    return false;
  }
}

export function tileAtGrid(grid, tx, ty) {
  return tileAt(grid.map((r) => r.join('')), tx, ty);
}
