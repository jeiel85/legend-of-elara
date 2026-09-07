// Math, collision and small helpers. No DOM access.
export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function dist(ax, ay, bx, by) {
  return Math.sqrt(dist2(ax, ay, bx, by));
}

let seed = 123456789;
export function srand(s) {
  seed = s >>> 0;
}
export function rnd() {
  // mulberry32
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export function randInt(a, b) {
  return a + Math.floor(Math.random() * (b - a + 1));
}
export function choice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function aabbOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Tile collision: rect vs solid tiles in a grid.
// grid: array of strings, tileSize px, isSolid(ch) fn.
// Returns corrected position and collision flags.
export function moveWithTileCollision(grid, tileSize, isSolid, x, y, w, h, dx, dy) {
  let hitX = false;
  let hitY = false;
  // X axis
  let nx = x + dx;
  if (collidesAt(grid, tileSize, isSolid, nx, y, w, h)) {
    // step back to tile boundary
    if (dx > 0) {
      const tx = Math.floor((nx + w) / tileSize);
      nx = tx * tileSize - w - 0.01;
    } else if (dx < 0) {
      const tx = Math.floor(nx / tileSize);
      nx = (tx + 1) * tileSize + 0.01;
    }
    hitX = true;
    if (collidesAt(grid, tileSize, isSolid, nx, y, w, h)) {
      nx = x;
    }
  }
  // Y axis
  let ny = y + dy;
  if (collidesAt(grid, tileSize, isSolid, nx, ny, w, h)) {
    if (dy > 0) {
      const ty = Math.floor((ny + h) / tileSize);
      ny = ty * tileSize - h - 0.01;
    } else if (dy < 0) {
      const ty = Math.floor(ny / tileSize);
      ny = (ty + 1) * tileSize + 0.01;
    }
    hitY = true;
    if (collidesAt(grid, tileSize, isSolid, nx, ny, w, h)) {
      ny = y;
    }
  }
  return { x: nx, y: ny, hitX, hitY };
}

export function collidesAt(grid, tileSize, isSolid, x, y, w, h) {
  const x0 = Math.floor(x / tileSize);
  const y0 = Math.floor(y / tileSize);
  const x1 = Math.floor((x + w - 0.01) / tileSize);
  const y1 = Math.floor((y + h - 0.01) / tileSize);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const ch = tileAt(grid, tx, ty);
      if (isSolid(ch, tx, ty)) return true;
    }
  }
  return false;
}

export function tileAt(grid, tx, ty) {
  if (ty < 0 || ty >= grid.length) return '#';
  const row = grid[ty];
  if (tx < 0 || tx >= row.length) return '#';
  return row[tx];
}

export function dirVec(dir) {
  if (dir === 'up') return { x: 0, y: -1 };
  if (dir === 'down') return { x: 0, y: 1 };
  if (dir === 'left') return { x: -1, y: 0 };
  return { x: 1, y: 0 };
}

export function oppositeDir(dir) {
  if (dir === 'up') return 'down';
  if (dir === 'down') return 'up';
  if (dir === 'left') return 'right';
  return 'left';
}
