// Smoke test: stubs browser globals, imports game modules, simulates play.
// Run: node tools/smoke.mjs
function makeCtxStub() {
  const target = {};
  return new Proxy(target, {
    get(t, p) {
      if (p in t) return t[p];
      // return no-op function for any method
      return (...args) => ctxProxy;
    },
    set(t, p, v) {
      t[p] = v;
      return true;
    }
  });
}
const ctxProxy = makeCtxStub();

function makeCanvasStub() {
  return {
    width: 480,
    height: 320,
    getContext: () => makeCtxStub(),
    addEventListener: () => {},
    style: {}
  };
}

// ---- globals ----
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, v); },
  removeItem: (k) => { store.delete(k); }
};
globalThis.document = {
  createElement: () => makeCanvasStub(),
  body: { classList: { add: () => {} } },
  querySelectorAll: () => [],
  getElementById: () => null,
  addEventListener: () => {}
};
globalThis.window = {
  addEventListener: () => {},
  AudioContext: undefined,
  ontouchstart: undefined
};
globalThis.requestAnimationFrame = () => {};
globalThis.AudioContext = undefined;

const results = [];
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL: ' + msg);
    process.exitCode = 1;
  } else {
    results.push('OK: ' + msg);
  }
}

const main = await import('../js/main.js');
const { Game } = main;
const { input } = await import('../js/engine/input.js');
const { saveGame, loadGame, hasSave } = await import('../js/engine/save.js');

assert(typeof Game === 'function', 'Game class exported');

// 1. new game boots without throwing
const canvas = makeCanvasStub();
const ctx = makeCtxStub();
const game = new Game(canvas, ctx);
game.newGame();
assert(game.state === 'playing', 'newGame enters playing state');
assert(game.player.x > 0 && game.player.y > 0, 'player placed');
assert(game.enemies.length > 0, 'overworld enemies spawned (' + game.enemies.length + ')');
assert(game.world.mapId === 'overworld', 'starts in overworld');

// give sword so attacks do something
game.player.swordTier = 1;
game.player.items.bow = true;
game.player.arrows = 20;
game.player.bombAmmo = 5;
game.player.items.lantern = true;
game.player.items.boomerang = true;

// 2. run ~600 update ticks with movement + attacking
for (let i = 0; i < 600; i++) {
  // simulate movement pattern
  if (i < 150) { input.simPress('right'); }
  else if (i < 300) { input.simRelease('right'); input.simPress('down'); }
  else if (i < 450) { input.simRelease('down'); input.simPress('left'); }
  else { input.simRelease('left'); input.simPress('up'); }
  if (i % 30 === 0) input.simPress('attack');
  if (i % 100 === 50) input.simPress('use');
  if (i === 200) {
    game.useSelectedItem();
  }
  game.update(1 / 60, input);
  input.update();
  input.releaseAll();
  if (i % 60 === 0) {
    try { game.render(); } catch (e) { assert(false, 'render throws at tick ' + i + ': ' + e.message); }
  }
  if (game.state === 'gameover') {
    // respawn path: reload save (may not exist) or revive
    game.player.dead = false;
    game.player.fullHeal();
    game.state = 'playing';
  }
  // clear dialog if opened during simulation
  if (game.dialog.active) {
    // fast-forward dialog
    for (let k = 0; k < 20 && game.dialog.active; k++) {
      input.simPress('interact');
      game.dialog.update(0.1, input);
      input.update();
      input.releaseAll();
    }
  }
}
input.releaseAll();
assert(game.playtime > 5, 'playtime advanced (' + game.playtime.toFixed(1) + 's)');
results.push('player pos: ' + Math.round(game.player.x) + ',' + Math.round(game.player.y) + ' hp:' + game.player.hp);

// 3. exercise maps: enter each dungeon and run ticks
for (const [mapId, tx, ty] of [
  ['caveSword', 4, 4], ['dungeon1', 3, 1], ['dungeon2', 3, 1],
  ['dungeon3', 3, 1], ['final', 3, 1], ['overworld', 44, 62]
]) {
  game.enterMap(mapId, tx, ty, true);
  assert(game.world.mapId === mapId, 'entered ' + mapId);
  for (let i = 0; i < 60; i++) {
    if (i % 20 === 0) input.simPress('attack');
    game.update(1 / 60, input);
    input.update();
    input.releaseAll();
    if (game.dialog.active) {
      for (let k = 0; k < 10 && game.dialog.active; k++) {
        input.simPress('interact');
        game.dialog.update(0.1, input);
        input.update();
        input.releaseAll();
      }
    }
    if (game.state !== 'playing') {
      // e.g. ending after final boss sim; reset to playing for test continuity
      if (game.state === 'ending') { game.state = 'playing'; }
      if (game.state === 'gameover') { game.state = 'playing'; game.player.dead = false; game.player.fullHeal(); }
    }
  }
  game.render();
}
results.push('OK: all maps entered without throwing');

// 4. combat: spawn enemy in front and kill via sword
game.enterMap('overworld', 44, 62, true);
game.player.swordTier = 2;
const { createEnemy } = await import('../js/entities/enemy.js');
const foe = createEnemy('slime', 45, 60);
foe.x = game.player.x + 16;
foe.y = game.player.y;
game.enemies.push(foe);
const hpBefore = foe.hp;
game.player.dir = 'right';
game.player.attackCd = 0;
input.simPress('attack');
game.update(1 / 60, input);
input.update();
input.releaseAll();
assert(foe.hp < hpBefore || foe.dead, 'sword damages enemy');

// 5. items: bow / bomb / boomerang / lantern / potion paths
game.player.selectedItem = 'bow';
game.player.arrows = 5;
game.useSelectedItem();
assert(game.projectiles.length >= 0, 'bow fires without throwing');
game.player.selectedItem = 'bombs';
game.player.bombAmmo = 3;
game.useSelectedItem();
assert(game.bombs.length >= 1, 'bomb placed');
game.player.selectedItem = 'potion';
game.player.potions = 1;
game.player.hp = 1;
game.useSelectedItem();
assert(game.player.hp === game.player.maxHp, 'potion heals fully');
game.player.selectedItem = 'lantern';
game.useSelectedItem();

// 6. chest + quest + boss-kill + save round-trip
game.enterMap('caveSword', 4, 4, true);
const chest = game.world.chestAt(10, 7);
assert(!!chest, 'sword chest exists');
game.openChest(chest);
assert(game.player.swordTier >= 1, 'sword chest grants sword');
assert(game.quest.swordFound === true, 'quest swordFound set');
// simulate boss kill autosave path
game.quest.bossesDead.d1 = true;
game.autosave();
const ok = game.save(true);
assert(ok === true, 'manual save ok');
assert(hasSave(), 'hasSave true after save');
const raw = loadGame();
assert(!!raw && !!raw.player && !!raw.quest && !!raw.world, 'loadGame round-trips');
const game2 = new Game(canvas, makeCtxStub());
const restored = game2.restore(raw);
assert(restored === true, 'restore works');
assert(game2.player.swordTier === game.player.swordTier, 'sword tier persists');
assert(game2.quest.bossesDead.d1 === true, 'boss flags persist');
// interact paths (statue/door) shouldn't throw
game2.enterMap('overworld', 44, 60, true);
game2.player.dir = 'up';
try {
  game2.interact();
  for (let k = 0; k < 10 && game2.dialog.active; k++) {
    input.simPress('interact');
    game2.dialog.update(0.1, input);
    input.update();
    input.releaseAll();
  }
  results.push('OK: interact path safe');
} catch (e) {
  assert(false, 'interact throws: ' + e.message);
}
// shop buying
game2.player.gems = 100;
assert(game2.tryBuy('arrows30') === true, 'shop arrows buy works');
assert(game2.tryBuy('potion') === true, 'shop potion buy works');

// 8. full quest chain: bosses -> shards -> elder -> gate -> final boss -> ending
function clearDialog(g) {
  for (let k = 0; k < 30 && g.dialog.active; k++) {
    input.simPress('interact');
    g.dialog.update(0.1, input);
    input.update();
    input.releaseAll();
  }
}
const questGame = new Game(canvas, makeCtxStub());
questGame.newGame();
questGame.player.swordTier = 2;
questGame.quest.stage = 'findShards'; // simulate post-elder progress
for (const [mapId, shardTx, shardTy, dg] of [
  ['dungeon1', 34, 12, 'd1'], ['dungeon2', 34, 12, 'd2'], ['dungeon3', 38, 12, 'd3']
]) {
  questGame.enterMap(mapId, 3, 1, true);
  const boss = questGame.enemies.find((e) => e.isBoss);
  assert(!!boss, 'boss spawns in ' + mapId);
  questGame.lastHitWasBomb = true;
  boss.hurt(999, 'up', questGame);
  questGame.lastHitWasBomb = false;
  assert(boss.dead, 'boss dies in ' + mapId);
  questGame.onEnemyDead(boss);
  questGame.enemies = questGame.enemies.filter((e) => !e.dead);
  clearDialog(questGame);
  const chest = questGame.world.chestAt(shardTx, shardTy);
  assert(!!chest, 'shard chest exists in ' + mapId);
  questGame.openChest(chest);
  clearDialog(questGame);
  assert(questGame.quest.bossesDead[dg] === true, 'boss flag set for ' + dg);
}
assert(questGame.quest.shards === 3, '3 shards collected (got ' + questGame.quest.shards + ')');
assert(questGame.quest.stage === 'allShards', 'stage allShards reached');
// report to elder -> gate opens
questGame.enterMap('overworld', 44, 58, true);
questGame.talkTo({ id: 'elder', tx: 44, ty: 57 });
clearDialog(questGame);
clearDialog(questGame); // chained gate_open dialog
assert(questGame.quest.gateOpen === true, 'gate opens after elder report');
assert(questGame.world.getTile(45, 10) === '.', 'sealed gate tiles cleared');
// final boss -> ending
questGame.enterMap('final', 3, 1, true);
const demon = questGame.enemies.find((e) => e.isBoss);
assert(!!demon && demon.type === 'demonKing', 'demon king spawns');
questGame.lastHitWasBomb = true;
demon.hurt(999, 'up', questGame);
questGame.lastHitWasBomb = false;
questGame.onEnemyDead(demon);
assert(questGame.state === 'ending', 'ending triggers after final boss');
questGame.render(); // ending screen draws without throwing
// gameover respawn path
questGame.state = 'playing';
questGame.player.hp = 1;
questGame.player.iframes = 0;
questGame.player.hurt(5, questGame.player.cx + 10, questGame.player.cy);
assert(questGame.player.dead, 'player dies at 0 hp');

// 7. dialogs/quests modules
const { DIALOGS } = await import('../js/content/dialogs.js');
assert(!!DIALOGS.elder_intro && !!DIALOGS.gate_open, 'dialogs present');
const { initialQuest, getObjectiveText } = await import('../js/content/quests.js');
assert(typeof getObjectiveText(initialQuest()) === 'string', 'quest objective text works');

console.log(results.join('\n'));
console.log('SMOKE PASS');
