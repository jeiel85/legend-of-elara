// ALL map data. Overworld grid is built by a deterministic painter (still stored
// as ASCII-string grids). Dungeons/caves are literal ASCII grids.
// Tile legend: see js/world/tiles.js

function buildOverworld() {
  const W = 90;
  const H = 70;
  const g = [];
  for (let y = 0; y < H; y++) {
    let row = '';
    for (let x = 0; x < W; x++) {
      // border
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) { row += 'T'; continue; }
      // north snow / mountain y<18
      if (y < 18) { row += 'N'; continue; }
      // lake rect
      if (x >= 64 && x <= 85 && y >= 30 && y <= 51) { row += '~'; continue; }
      // base grass with variation
      row += ((x + y) % 7 === 0) ? ',' : '.';
    }
    g.push(row);
  }
  const set = (x, y, ch) => {
    if (y < 0 || y >= H || x < 0 || x >= W) return;
    g[y] = g[y].substring(0, x) + ch + g[y].substring(x + 1);
  };
  const rect = (x0, y0, x1, y1, ch) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, ch);
  };
  const scatter = (x0, y0, x1, y1, ch, step, off) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if ((x * 3 + y * 7 + off) % step === 0) set(x, y, ch);
    }
  };

  // mountain peaks north
  scatter(4, 2, 86, 8, '^', 3, 1);
  scatter(4, 2, 86, 15, 'n', 5, 2);
  scatter(4, 2, 86, 15, '#', 7, 0);
  // snow path to gate
  for (let y = 9; y <= 22; y++) { set(44, y, 'P'); set(45, y, 'P'); set(46, y, 'P'); }
  // sealed gate wall at y=10
  for (let x = 41; x <= 49; x++) set(x, 10, 'X');
  set(45, 10, 'X');
  // final entrance behind gate
  set(45, 7, 'A');
  // D3 entrance (mountain cave)
  rect(66, 8, 72, 12, '#');
  set(69, 10, 'A');
  set(69, 11, 'P'); set(69, 12, 'P'); set(69, 13, 'P');

  // forest patches (center)
  scatter(18, 28, 50, 52, 'T', 4, 0);
  scatter(18, 28, 50, 52, 'B', 6, 1);
  scatter(18, 28, 50, 52, 'G', 3, 2);
  // clearings for D1 + sword cave surroundings
  rect(32, 31, 40, 37, '.');
  rect(25, 39, 32, 45, '.');
  set(35, 33, 'A'); // D1 entrance
  set(28, 42, 'A'); // sword cave entrance
  // forest dungeon surroundings trees ring
  set(34, 32, 'T'); set(36, 32, 'T'); set(34, 34, 'T'); set(36, 34, 'T');

  // cemetery west
  rect(4, 26, 24, 44, ',');
  scatter(4, 26, 24, 44, 'g', 4, 1);
  scatter(4, 26, 24, 44, 'T', 8, 3);
  rect(12, 30, 18, 36, '.');
  set(15, 33, 'A'); // secret cave (heart piece)
  // cemetery path east
  for (let x = 24; x <= 34; x++) { set(x, 40, 'P'); set(x, 41, 'P'); }

  // lake: sand rim + bridge + island
  for (let x = 63; x <= 86; x++) {
    set(x, 29, 'S'); set(x, 52, 'S');
  }
  for (let y = 29; y <= 52; y++) {
    set(63, y, 'S'); set(86, y, 'S');
  }
  for (let x = 60; x <= 86; x++) { set(x, 40, '='); set(x, 41, '='); }
  rect(73, 36, 80, 44, '.');
  // re-water around island edges (keep island)
  // D2 entrance on island
  set(76, 38, 'A');
  // lakeside path west to village
  for (let x = 50; x <= 63; x++) { set(x, 40, 'P'); set(x, 41, 'P'); }

  // grass tufts / bushes everywhere south-center
  scatter(28, 44, 62, 56, 'G', 3, 0);
  scatter(28, 44, 62, 56, 'B', 7, 2);
  scatter(4, 46, 30, 60, 'G', 4, 1);

  // village south x32..58 y54..68
  rect(32, 54, 58, 68, '.');
  for (let x = 32; x <= 58; x++) { set(x, 60, 'P'); set(x, 61, 'P'); }
  for (let y = 54; y <= 68; y++) { set(44, y, 'P'); set(45, y, 'P'); }
  // houses: 3 blocks
  function house(x0, y0) {
    // 7x5 house: roof top, walls, door gap at bottom center
    for (let x = x0; x < x0 + 7; x++) { set(x, y0, 'R'); set(x, y0 + 1, 'R'); }
    for (let x = x0; x < x0 + 7; x++) set(x, y0 + 2, 'H');
    for (let x = x0; x < x0 + 7; x++) set(x, y0 + 3, 'H');
    set(x0 + 3, y0 + 3, '.'); // door
    set(x0 + 3, y0 + 2, '.');
  }
  house(34, 55);
  house(48, 55);
  house(38, 63);
  // save statue plaza
  set(45, 59, 'O');
  set(44, 58, 'F'); set(46, 58, 'F');
  // village trees border
  for (let x = 32; x <= 58; x += 4) { set(x, 54, 'T'); }
  set(32, 62, 'T'); set(58, 62, 'T');

  // paths connecting village north
  for (let y = 44; y <= 54; y++) { set(44, y, 'P'); set(45, y, 'P'); }
  // clearing around statue + entrances markers
  set(35, 34, 'A');
  return g;
}

const OVERWORLD = buildOverworld();

// Small cave with the wooden sword chest.
const CAVE_SWORD = [
  'WWWWWWWWWWWWWWWWWWWW',
  'W..................W',
  'W..K.....WW.....T..W',
  'W........WW........W',
  'W...A..............W',
  'W..................W',
  'W.....WWWWWW.......W',
  'W.....W....W.......W',
  'W.....W....W.......W',
  'W..................W',
  'W..................W',
  'WWWWWWWWWWWWWWWWWWWW'
];

// Secret cemetery cave: heart piece + gems.
const CAVE_SECRET = [
  'WWWWWWWWWWWWWWWWWWWW',
  'W..................W',
  'W..C..........g....W',
  'W..................W',
  'W.....KKK..........W',
  'W..................W',
  'W..A...............W',
  'W..................W',
  'WWWWWWWWWWWWWWWWWWWW'
];

// Lakeside cave: bow pickup (needs nothing) + arrows.
const CAVE_LAKE = [
  'WWWWWWWWWWWWWWWWWWWWWW',
  'W....................W',
  'W..V..........C......W',
  'W....................W',
  'W......KK............W',
  'W..A.................W',
  'W....................W',
  'WWWWWWWWWWWWWWWWWWWWWW'
];

// Dungeon 1: forest (boss: giant slime). 40x16 hand grid.
const DUNGEON1 = [
  'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
  'W..A....................WW.............W',
  'W.......................WW.....K.......W',
  'W...K......WWWWWW.......WW.............W',
  'W..........WW..WW.......WW....WWWW.....W',
  'W..........WW..WW.............WWWW.....W',
  'W.....d....WW..WW....CCC......WW.......W',
  'W..........WW..WW....CCC..............WW',
  'W.....K....WW..WW.............WWWW.....W',
  'W..........WW..WW.....VV......WWWW..L..W',
  'W.....................VV...........W...WW',
  'W...O.....KK......................W...WW',
  'W.................................W...W',
  'W......d.........................WWW...W',
  'W.....................................W',
  'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW'
];

// Dungeon 2: lake (boss: octo king). dark + water motif.
const DUNGEON2 = [
  'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
  'W..A......WW.............C.............W',
  'W.........WW..........................WW',
  'W....K....WW....WWWWWW.....WWWWWW......W',
  'W.........WW....W....W.....W....W......W',
  'W....d....WW....W....W.....W....W......W',
  'W.........WW....W....W.....W....W......W',
  'W......~~~~~~~~~.....W.....W....W......W',
  'W......~~~~~~~~~...........W....W......W',
  'W......~~~~~~~~~.....KKK...W....W...L..W',
  'W.........WW...............W....W..W...W',
  'W....O....WW....VVV........W.......W...W',
  'W.........WW....VVV................W...W',
  'W.....K...WW.....................WWW...W',
  'W.....................................W',
  'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW'
];

// Dungeon 3: mountain (boss: knight captain). snow + push puzzles.
const DUNGEON3 = [
  'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
  'W..A..........WW..............C............W',
  'W.............WW..........................WW',
  'W....KK......WW.....WWWWWW......WWWWWW....WW',
  'W.............WW.....W....W......W....W....W',
  'W.....d.......WW.....W....W......W....W....W',
  'W.............WW.....W....W......W....W....W',
  'W.......KKK...WW.....W....W......W....W....W',
  'W.............WW.................W....W....W',
  'W.....VVV.....WW.....KKKKK.......W....W.L.WW',
  'W.....VVV.....WW.................W....WW...W',
  'W.............WW.....d.................W...W',
  'W....O........WW......................WWW..W',
  'W..........................................W',
  'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW'
];

// Final dungeon: gauntlet + demon king.
const DUNGEON_FINAL = [
  'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
  'W..A...............C......................WW',
  'W...................C......KKK.............W',
  'W....WWWWWW....WWWWWW......KKK.....WWWW....W',
  'W....W....W....W....W..............W..W....W',
  'W....W....W....W....W.....VVV......W..W....W',
  'W....W....W....W....W.....VVV......W..W....W',
  'W.........d.........................W..W...W',
  'W....W....W....KKK.........d..........W....W',
  'W....W....W....KKK.........................W',
  'W....WWWWWW.............WWWWWW....WWWW.....W',
  'W.......................W....W....W..W..W..W',
  'W....O..................W....W....W.....W..W',
  'W.........................................W',
  'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW'
];

export const MAPS = {
  overworld: {
    id: 'overworld',
    name: '엘라라 대륙',
    grid: OVERWORLD,
    spawn: { tx: 44, ty: 62 },
    music: 'overworld',
    dark: false,
    weather: 'leaves',
    // village rect (tiles): enemies never chase/attack inside
    safeZones: [{ x0: 32, y0: 54, x1: 59, y1: 69 }],
    warps: [
      { tx: 35, ty: 33, toMap: 'dungeon1', toTx: 3, toTy: 1 },
      { tx: 35, ty: 34, toMap: 'dungeon1', toTx: 3, toTy: 1 },
      { tx: 28, ty: 42, toMap: 'caveSword', toTx: 4, toTy: 4 },
      { tx: 76, ty: 38, toMap: 'dungeon2', toTx: 3, toTy: 1 },
      { tx: 69, ty: 10, toMap: 'dungeon3', toTx: 3, toTy: 1 },
      { tx: 45, ty: 7, toMap: 'final', toTx: 3, toTy: 1, needGate: true },
      { tx: 15, ty: 33, toMap: 'caveSecret', toTx: 3, toTy: 6 }
    ],
    saveStatues: [{ tx: 45, ty: 59 }],
    npcs: [
      { id: 'elder', tx: 44, ty: 57, dialog: 'elder' },
      { id: 'shop1', tx: 50, ty: 58, dialog: 'shop1', shop: true },
      { id: 'villager1', tx: 38, ty: 59, dialog: 'villager1' },
      { id: 'villager2', tx: 47, ty: 64, dialog: 'villager2' },
      { id: 'fisher', tx: 61, ty: 42, dialog: 'fisher' },
      { id: 'gravekeeper', tx: 13, ty: 36, dialog: 'gravekeeper' },
      { id: 'mountaineer', tx: 68, ty: 14, dialog: 'mountaineer' }
    ],
    enemies: [
      { type: 'slime', tx: 40, ty: 46 }, { type: 'slime', tx: 50, ty: 48 },
      { type: 'octo', tx: 55, ty: 42 }, { type: 'goblin', tx: 30, ty: 48 },
      { type: 'slime', tx: 25, ty: 50 }, { type: 'octo', tx: 58, ty: 36 },
      { type: 'skeleton', tx: 14, ty: 40 }, { type: 'bat', tx: 18, ty: 30 },
      { type: 'goblin', tx: 48, ty: 30 }, { type: 'slime', tx: 63, ty: 52 },
      { type: 'knight', tx: 45, ty: 24 }, { type: 'octo', tx: 70, ty: 44 },
      { type: 'skeleton', tx: 20, ty: 38 }, { type: 'goblin', tx: 36, ty: 44 },
      { type: 'bat', tx: 55, ty: 20 }, { type: 'knight', tx: 50, ty: 16 }
    ],
    chests: [
      { id: 'ow_heart1', tx: 8, ty: 28, loot: { kind: 'heartPiece' } },
      { id: 'ow_gems1', tx: 80, ty: 46, loot: { kind: 'gems', amount: 30 } },
      { id: 'ow_bombs1', tx: 60, ty: 14, loot: { kind: 'bombs', amount: 5 } }
    ],
    signs: [
      { tx: 44, ty: 52, text: '북쪽: 설산과 봉인된 문\n동쪽: 호수  서쪽: 묘지' },
      { tx: 33, ty: 38, text: '숲의 동굴: D1 북쪽\n남쪽 작은 동굴: 검이 잠들어 있다' }
    ]
  },
  caveSword: {
    id: 'caveSword', name: '숲의 작은 동굴', grid: CAVE_SWORD,
    spawn: { tx: 4, ty: 4 }, music: 'dungeon', dark: false,
    warps: [{ tx: 4, ty: 4, toMap: 'overworld', toTx: 28, toTy: 43 }],
    npcs: [], enemies: [{ type: 'bat', tx: 12, ty: 6 }],
    chests: [{ id: 'sword_wood', tx: 10, ty: 7, loot: { kind: 'sword', tier: 1 } }],
    signs: []
  },
  caveSecret: {
    id: 'caveSecret', name: '묘지의 비밀 동굴', grid: CAVE_SECRET,
    spawn: { tx: 3, ty: 6 }, music: 'dungeon', dark: true,
    warps: [{ tx: 3, ty: 6, toMap: 'overworld', toTx: 15, toTy: 34 }],
    npcs: [], enemies: [{ type: 'skeleton', tx: 12, ty: 3 }],
    chests: [
      { id: 'sec_heart', tx: 14, ty: 2, loot: { kind: 'heartPiece' } },
      { id: 'sec_gems', tx: 15, ty: 2, loot: { kind: 'gems', amount: 50 } }
    ],
    signs: []
  },
  caveLake: {
    id: 'caveLake', name: '호숫가 동굴', grid: CAVE_LAKE,
    spawn: { tx: 3, ty: 5 }, music: 'dungeon', dark: false,
    warps: [{ tx: 3, ty: 5, toMap: 'overworld', toTx: 62, toTy: 42 }],
    npcs: [],
    enemies: [{ type: 'octo', tx: 12, ty: 3 }],
    chests: [{ id: 'lake_bow', tx: 14, ty: 2, loot: { kind: 'item', item: 'bow' } }],
    signs: []
  },
  dungeon1: {
    id: 'dungeon1', name: '숲의 동굴 (D1)', grid: DUNGEON1,
    spawn: { tx: 3, ty: 1 }, music: 'dungeon', dark: false,
    warps: [{ tx: 3, ty: 1, toMap: 'overworld', toTx: 35, toTy: 34 }],
    saveStatues: [{ tx: 5, ty: 11 }],
    npcs: [],
    enemies: [
      { type: 'slime', tx: 8, ty: 4 }, { type: 'slime', tx: 15, ty: 8 },
      { type: 'goblin', tx: 28, ty: 3 }, { type: 'bat', tx: 30, ty: 10 },
      { type: 'skeleton', tx: 18, ty: 12 }
    ],
    chests: [
      { id: 'd1_key1', tx: 29, ty: 2, loot: { kind: 'key' } },
      { id: 'd1_compass', tx: 8, ty: 8, loot: { kind: 'item', item: 'compass_d1' } },
      { id: 'd1_bombs', tx: 20, ty: 6, loot: { kind: 'bombs', amount: 5 } },
      { id: 'd1_boss', tx: 34, ty: 12, loot: { kind: 'shard', dungeon: 'd1' }, bossChest: true, needBossDead: 'd1' }
    ],
    boss: { type: 'slimeKing', tx: 33, ty: 9, dungeon: 'd1' },
    signs: [{ tx: 5, ty: 3, text: '균열(C)은 폭탄으로!\n덩굴(V)은 랜턴으로!' }]
  },
  dungeon2: {
    id: 'dungeon2', name: '호수의 동굴 (D2)', grid: DUNGEON2,
    spawn: { tx: 3, ty: 1 }, music: 'dungeon', dark: false,
    warps: [{ tx: 3, ty: 1, toMap: 'overworld', toTx: 76, toTy: 39 }],
    saveStatues: [{ tx: 5, ty: 11 }],
    npcs: [],
    enemies: [
      { type: 'octo', tx: 10, ty: 6 }, { type: 'bat', tx: 25, ty: 4 },
      { type: 'skeleton', tx: 30, ty: 8 }, { type: 'wisp', tx: 15, ty: 10 },
      { type: 'goblin', tx: 20, ty: 12 }
    ],
    chests: [
      { id: 'd2_key1', tx: 6, ty: 13, loot: { kind: 'key' } },
      { id: 'd2_bosskey', tx: 30, ty: 3, loot: { kind: 'bosskey', dungeon: 'd2' } },
      { id: 'd2_lantern', tx: 16, ty: 11, loot: { kind: 'item', item: 'lantern' } },
      { id: 'd2_boss', tx: 34, ty: 12, loot: { kind: 'shard', dungeon: 'd2' }, bossChest: true, needBossDead: 'd2' }
    ],
    boss: { type: 'octoKing', tx: 33, ty: 9, dungeon: 'd2' },
    signs: []
  },
  dungeon3: {
    id: 'dungeon3', name: '설산의 동굴 (D3)', grid: DUNGEON3,
    spawn: { tx: 3, ty: 1 }, music: 'dungeon', dark: true,
    warps: [{ tx: 3, ty: 1, toMap: 'overworld', toTx: 69, toTy: 11 }],
    saveStatues: [{ tx: 5, ty: 12 }],
    npcs: [],
    enemies: [
      { type: 'knight', tx: 12, ty: 5 }, { type: 'wisp', tx: 25, ty: 5 },
      { type: 'bat', tx: 32, ty: 8 }, { type: 'skeleton', tx: 18, ty: 10 },
      { type: 'goblin', tx: 25, ty: 12 }
    ],
    chests: [
      { id: 'd3_key1', tx: 8, ty: 3, loot: { kind: 'key' } },
      { id: 'd3_bosskey', tx: 33, ty: 4, loot: { kind: 'bosskey', dungeon: 'd3' } },
      { id: 'd3_boomerang', tx: 16, ty: 9, loot: { kind: 'item', item: 'boomerang' } },
      { id: 'd3_boss', tx: 38, ty: 12, loot: { kind: 'shard', dungeon: 'd3' }, bossChest: true, needBossDead: 'd3' }
    ],
    boss: { type: 'knightCaptain', tx: 36, ty: 9, dungeon: 'd3' },
    signs: [{ tx: 5, ty: 3, text: '어둠 속에서는 랜턴이 필요하다' }]
  },
  final: {
    id: 'final', name: '봉인된 성역', grid: DUNGEON_FINAL,
    spawn: { tx: 3, ty: 1 }, music: 'boss', dark: false,
    warps: [{ tx: 3, ty: 1, toMap: 'overworld', toTx: 45, toTy: 8 }],
    saveStatues: [{ tx: 5, ty: 12 }],
    npcs: [],
    enemies: [
      { type: 'knight', tx: 10, ty: 5 }, { type: 'knight', tx: 20, ty: 8 },
      { type: 'wisp', tx: 28, ty: 6 }, { type: 'skeleton', tx: 15, ty: 11 },
      { type: 'octo', tx: 30, ty: 12 }
    ],
    chests: [
      { id: 'fin_sword', tx: 20, ty: 2, loot: { kind: 'sword', tier: 3 } },
      { id: 'fin_potion', tx: 22, ty: 2, loot: { kind: 'item', item: 'potion' } }
    ],
    boss: { type: 'demonKing', tx: 36, ty: 9, dungeon: 'final' },
    signs: []
  }
};

// Extra lake cave entrance placed dynamically by world (not a warp tile on grid).
export const EXTRA_WARPS = [
  { fromMap: 'overworld', tx: 62, ty: 42, toMap: 'caveLake', toTx: 3, toTy: 5 }
];
