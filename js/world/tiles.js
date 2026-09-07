// Tile definitions + procedural pre-rendered sprites.
// Tile chars are documented here. Rendering uses fillRect pixel patterns.
// Performance: sprites are pre-rendered once to offscreen canvases.

export const TILE_SIZE = 16;

// solidity / properties by char
export const TILE_PROPS = {
  '.': { solid: false, name: 'grass' },
  ',': { solid: false, name: 'grass2' },
  'G': { solid: false, name: 'cutgrass', cuttable: true },
  'B': { solid: false, name: 'bush', cuttable: true },
  'F': { solid: false, name: 'flower' },
  'P': { solid: false, name: 'path' },
  'S': { solid: false, name: 'sand' },
  'N': { solid: false, name: 'snow' },
  '=': { solid: false, name: 'bridge' },
  'A': { solid: false, name: 'stairs' },
  'O': { solid: false, name: 'statue' },
  'g': { solid: true, name: 'grave' },
  'T': { solid: true, name: 'tree' },
  'n': { solid: true, name: 'snowtree' },
  '#': { solid: true, name: 'rock' },
  '^': { solid: true, name: 'peak' },
  'H': { solid: true, name: 'housewall' },
  'R': { solid: true, name: 'roof' },
  'W': { solid: true, name: 'dungeonwall' },
  'd': { solid: true, name: 'lockeddoor' },
  'L': { solid: true, name: 'bossdoor' },
  'C': { solid: true, name: 'cracked', bombable: true },
  'V': { solid: true, name: 'vines', burnable: true },
  'K': { solid: true, name: 'block', pushable: true },
  'X': { solid: true, name: 'sealedgate' },
  '~': { solid: true, name: 'water' },
  ' ': { solid: true, name: 'void' }
};

export function isSolidChar(ch) {
  const p = TILE_PROPS[ch];
  return p ? p.solid : true;
}

export function isCuttable(ch) {
  return ch === 'G' || ch === 'B';
}

// sprite cache: char -> canvas
const spriteCache = new Map();

function makeCanvas(s) {
  if (typeof document !== 'undefined' && document.createElement) {
    const c = document.createElement('canvas');
    c.width = s;
    c.height = s;
    return c;
  }
  return null;
}

function px(g, x, y, w, h, color) {
  g.fillStyle = color;
  g.fillRect(x, y, w, h);
}

function renderSprite(ch) {
  const c = makeCanvas(TILE_SIZE);
  if (!c) return null;
  const g = c.getContext('2d');
  // base
  switch (ch) {
    case '.':
      px(g, 0, 0, 16, 16, '#3fa34d');
      px(g, 2, 3, 2, 1, '#46b155');
      px(g, 9, 8, 2, 1, '#379540');
      px(g, 5, 12, 1, 2, '#379540');
      break;
    case ',':
      px(g, 0, 0, 16, 16, '#3a9a47');
      px(g, 4, 5, 3, 1, '#46b155');
      px(g, 10, 11, 3, 1, '#2f8540');
      break;
    case 'G':
      px(g, 0, 0, 16, 16, '#3fa34d');
      px(g, 3, 4, 2, 8, '#57c24a');
      px(g, 7, 2, 2, 10, '#6ad952');
      px(g, 11, 5, 2, 7, '#57c24a');
      break;
    case 'B':
      px(g, 0, 0, 16, 16, '#3fa34d');
      px(g, 2, 4, 12, 9, '#2c7a3a');
      px(g, 3, 3, 10, 3, '#3fa34d');
      px(g, 4, 6, 2, 2, '#57c24a');
      px(g, 9, 8, 2, 2, '#57c24a');
      break;
    case 'F':
      px(g, 0, 0, 16, 16, '#3fa34d');
      px(g, 7, 6, 2, 2, '#fff');
      px(g, 6, 5, 4, 1, '#fff');
      px(g, 7, 9, 2, 4, '#2c7a3a');
      px(g, 3, 11, 2, 2, '#ff9ec6');
      break;
    case 'P':
      px(g, 0, 0, 16, 16, '#d9b77c');
      px(g, 0, 0, 16, 2, '#c9a86e');
      px(g, 4, 7, 3, 2, '#b8945e');
      px(g, 10, 10, 2, 2, '#b8945e');
      break;
    case 'S':
      px(g, 0, 0, 16, 16, '#e0c98f');
      px(g, 3, 4, 2, 1, '#cdb87f');
      px(g, 10, 9, 3, 1, '#cdb87f');
      break;
    case 'N':
      px(g, 0, 0, 16, 16, '#e8f1f5');
      px(g, 2, 5, 3, 1, '#cfdde6');
      px(g, 9, 10, 4, 1, '#cfdde6');
      break;
    case '=':
      px(g, 0, 0, 16, 16, '#a9744f');
      px(g, 0, 3, 16, 1, '#7d5233');
      px(g, 0, 9, 16, 1, '#7d5233');
      px(g, 3, 0, 1, 16, '#7d5233');
      px(g, 12, 0, 1, 16, '#7d5233');
      break;
    case 'A':
      px(g, 0, 0, 16, 16, '#5a5a6e');
      for (let i = 0; i < 4; i++) {
        px(g, 0, i * 4, 16, 1, '#2f2f3d');
        px(g, 0, i * 4 + 2, 16, 1, '#8a8aa0');
      }
      break;
    case 'O':
      px(g, 0, 0, 16, 16, '#3fa34d');
      px(g, 4, 2, 8, 11, '#9aa3ad');
      px(g, 5, 1, 6, 3, '#c3ccd4');
      px(g, 6, 5, 4, 2, '#5b8dd9');
      break;
    case 'g':
      px(g, 0, 0, 16, 16, '#4a7c43');
      px(g, 4, 3, 8, 9, '#8d9099');
      px(g, 5, 5, 6, 2, '#6b6e77');
      break;
    case 'T':
      px(g, 0, 0, 16, 16, '#3fa34d');
      px(g, 3, 1, 10, 9, '#246b2e');
      px(g, 5, 0, 6, 3, '#2c7a3a');
      px(g, 7, 10, 2, 6, '#6b4a2f');
      px(g, 4, 3, 3, 3, '#3fa34d');
      break;
    case 'n':
      px(g, 0, 0, 16, 16, '#e8f1f5');
      px(g, 3, 1, 10, 9, '#2e6b4f');
      px(g, 4, 9, 8, 2, '#e8f1f5');
      px(g, 7, 10, 2, 6, '#6b4a2f');
      break;
    case '#':
      px(g, 0, 0, 16, 16, '#7d7d8a');
      px(g, 0, 0, 16, 3, '#9a9aa8');
      px(g, 2, 6, 5, 4, '#5d5d6a');
      px(g, 9, 9, 4, 3, '#5d5d6a');
      break;
    case '^':
      px(g, 0, 0, 16, 16, '#6b6e77');
      px(g, 0, 8, 16, 8, '#54565e');
      px(g, 4, 0, 8, 6, '#e8f1f5');
      break;
    case 'H':
      px(g, 0, 0, 16, 16, '#d9c8a9');
      px(g, 0, 0, 16, 2, '#8a6f4d');
      px(g, 7, 0, 2, 16, '#b8a67f');
      break;
    case 'R':
      px(g, 0, 0, 16, 16, '#b8452e');
      px(g, 0, 4, 16, 1, '#7d2e1e');
      px(g, 0, 9, 16, 1, '#7d2e1e');
      px(g, 0, 13, 16, 1, '#7d2e1e');
      break;
    case 'W':
      px(g, 0, 0, 16, 16, '#5d5d6e');
      px(g, 0, 0, 16, 2, '#8a8aa0');
      px(g, 0, 7, 16, 2, '#3d3d4a');
      px(g, 7, 0, 2, 16, '#3d3d4a');
      px(g, 2, 2, 3, 3, '#6e6e80');
      break;
    case 'd':
      px(g, 0, 0, 16, 16, '#5d5d6e');
      px(g, 4, 0, 8, 16, '#8a5a2e');
      px(g, 7, 0, 2, 16, '#4a2e12');
      px(g, 9, 7, 2, 2, '#ffd94a');
      break;
    case 'L':
      px(g, 0, 0, 16, 16, '#5d5d6e');
      px(g, 4, 0, 8, 16, '#6e2e8a');
      px(g, 7, 0, 2, 16, '#3d154d');
      px(g, 6, 6, 4, 4, '#ffd94a');
      break;
    case 'C':
      px(g, 0, 0, 16, 16, '#7d7d8a');
      px(g, 3, 3, 10, 10, '#5d5d6a');
      px(g, 4, 4, 3, 2, '#2f2f3d');
      px(g, 9, 8, 3, 2, '#2f2f3d');
      px(g, 5, 9, 4, 1, '#2f2f3d');
      break;
    case 'V':
      px(g, 0, 0, 16, 16, '#3d5a2e');
      px(g, 2, 2, 3, 12, '#57a047');
      px(g, 7, 0, 3, 16, '#2c7a3a');
      px(g, 12, 3, 2, 10, '#57a047');
      break;
    case 'K':
      px(g, 0, 0, 16, 16, '#8a8aa0');
      px(g, 1, 1, 14, 14, '#9a9ab0');
      px(g, 1, 1, 14, 2, '#c3c3d4');
      px(g, 4, 6, 8, 4, '#5d5d6e');
      break;
    case 'X':
      px(g, 0, 0, 16, 16, '#3d3d4a');
      px(g, 2, 0, 3, 16, '#8a2e5e');
      px(g, 11, 0, 3, 16, '#8a2e5e');
      px(g, 2, 5, 12, 3, '#ffd94a');
      px(g, 6, 6, 4, 4, '#fff2a8');
      break;
    case '~':
      px(g, 0, 0, 16, 16, '#2e6fd9');
      px(g, 0, 4, 16, 1, '#7db3f2');
      px(g, 3, 9, 6, 1, '#7db3f2');
      px(g, 9, 13, 5, 1, '#7db3f2');
      break;
    default:
      px(g, 0, 0, 16, 16, '#ff00ff');
      break;
  }
  return c;
}

export function getSprite(ch) {
  if (spriteCache.has(ch)) return spriteCache.get(ch);
  const c = renderSprite(ch);
  spriteCache.set(ch, c);
  return c;
}

export function preRenderAll() {
  for (const k of Object.keys(TILE_PROPS)) getSprite(k);
}

// Draw tile at pixel coords. Falls back to flat rect if no DOM canvas cache.
export function drawTile(ctx, ch, dx, dy, frame) {
  const spr = getSprite(ch);
  if (spr && ctx.drawImage) {
    ctx.drawImage(spr, dx, dy);
    // animate water
    if (ch === '~' && frame !== undefined) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      const off = (frame >> 4) % 8;
      ctx.fillRect(dx + off, dy + 4, 4, 1);
    }
    return;
  }
  // fallback colors for stub contexts
  const colors = {
    '.': '#3fa34d', ',': '#3a9a47', G: '#57c24a', B: '#2c7a3a', F: '#3fa34d',
    P: '#d9b77c', S: '#e0c98f', N: '#e8f1f5', '=': '#a9744f', A: '#5a5a6e',
    O: '#9aa3ad', g: '#8d9099', T: '#246b2e', n: '#2e6b4f', '#': '#7d7d8a',
    '^': '#6b6e77', H: '#d9c8a9', R: '#b8452e', W: '#5d5d6e', d: '#8a5a2e',
    L: '#6e2e8a', C: '#7d7d8a', V: '#3d5a2e', K: '#8a8aa0', X: '#3d3d4a', '~': '#2e6fd9'
  };
  try {
    ctx.fillStyle = colors[ch] || '#ff00ff';
    ctx.fillRect(dx, dy, TILE_SIZE, TILE_SIZE);
  } catch (e) { /* stub */ }
}
