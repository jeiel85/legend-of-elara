// Bootstrap, game state machine, fixed-timestep loop.
// States: title / playing / dialog(overlay) / inventory(overlay) / gameover / ending
import { input } from './engine/input.js';
import { Camera } from './engine/camera.js';
import { audio } from './engine/audio.js';
import { saveGame, loadGame, hasSave, clearSave } from './engine/save.js';
import { TILE_SIZE, drawTile, preRenderAll } from './world/tiles.js';
import { MAPS } from './world/maps.js';
import { World } from './world/world.js';
import { Player } from './entities/player.js';
import { createEnemy, createEnemyAtPixel } from './entities/enemy.js';
import { NPC } from './entities/npc.js';
import { Projectile, Bomb, boxesHit } from './entities/projectile.js';
import { Drop, rollEnemyDrop, rollGrassDrop } from './entities/drops.js';
import { DialogSys } from './ui/dialog.js';
import { InventoryUI } from './ui/inventory.js';
import { drawHUD } from './ui/hud.js';
import { drawTitle, drawGameOver, drawEnding } from './ui/screens.js';
import { DIALOGS } from './content/dialogs.js';
import { initialQuest, getObjectiveText, questOnEvent, bossToDungeon } from './content/quests.js';
import { currentStage, STAGE_TOTAL } from './content/stages.js';
import { AutoDirector } from './engine/autodirector.js';
import { SHOP_STOCK } from './content/items.js';
import { aabbOverlap } from './engine/utils.js';

export const VIEW_W = 480;
export const VIEW_H = 320;

export class Game {
  constructor(canvas, ctx) {
    this.canvas = canvas || null;
    this.ctx = ctx || null;
    this.world = new World();
    this.player = new Player();
    this.camera = new Camera(VIEW_W, VIEW_H);
    this.dialog = new DialogSys();
    this.inventory = new InventoryUI();
    this.quest = initialQuest();
    this.state = 'title';
    this.enemies = [];
    this.npcs = [];
    this.projectiles = [];
    this.bombs = [];
    this.drops = [];
    this.particles = [];
    this.playtime = 0;
    this.deaths = 0;
    this.showQuest = true;
    this.warpCd = 0;
    this.frame = 0;
    this.pendingAfterDialog = null;
    this.lastHitWasBomb = false;
    this.auto = false;
    this.autoDirector = new AutoDirector();
    this.lastStageN = 0;
    this.stageBannerT = 0;
    this.saveExistsCache = false;
    try {
      this.saveExistsCache = hasSave();
    } catch (e) { /* ignore */ }
    try {
      preRenderAll();
    } catch (e) { /* ignore */ }
  }

  // ---------- lifecycle ----------
  newGame() {
    this.world = new World();
    this.player = new Player();
    this.quest = initialQuest();
    this.playtime = 0;
    this.deaths = 0;
    this.showQuest = true;
    this.projectiles = [];
    this.bombs = [];
    this.drops = [];
    this.particles = [];
    this.world.loadMap('overworld');
    const s = MAPS.overworld.spawn;
    this.player.placeAtTile(s.tx, s.ty);
    this.player.hp = this.player.maxHp;
    this.enterMap('overworld', s.tx, s.ty, true);
    this.state = 'playing';
    this.lastStageN = 1;
    this.stageBannerT = 2.8;
    audio.ensure();
    audio.setMusicMode('overworld');
  }

  snapshot() {
    return {
      player: this.player.serialize(),
      quest: JSON.parse(JSON.stringify(this.quest)),
      world: this.world.serialize(),
      playtime: this.playtime,
      deaths: this.deaths,
      showQuest: this.showQuest
    };
  }

  restore(snap) {
    if (!snap) return false;
    this.quest = Object.assign(initialQuest(), snap.quest);
    this.player.deserialize(snap.player);
    this.world.deserialize(snap.world);
    this.playtime = snap.playtime || 0;
    this.deaths = snap.deaths || 0;
    this.showQuest = snap.showQuest !== false;
    this.lastStageN = currentStage(this.quest).n;
    this.stageBannerT = 0;
    this.projectiles = [];
    this.bombs = [];
    this.drops = [];
    this.particles = [];
    this.spawnMapEntities();
    const size = this.world.mapPixelSize();
    this.camera.snap(this.player.cx, this.player.cy, size.w, size.h);
    audio.setMusicMode(this.world.mapDef().music || 'overworld');
    return true;
  }

  save(manual) {
    // never touch storage while the auto director is driving (protects real saves)
    if (this.auto) return false;
    const ok = saveGame(this.snapshot());
    if (!ok && manual && this.ctx) {
      // storage failed; still continue
    }
    return ok;
  }

  autosave() {
    this.save(false);
    this.saveExistsCache = true;
  }

  continueGame() {
    const data = loadGame();
    if (!data) return false;
    this.world = new World();
    this.player = new Player();
    const ok = this.restore(data);
    if (ok) {
      this.state = 'playing';
      audio.ensure();
    }
    return ok;
  }

  enterMap(mapId, tx, ty, snapCamera) {
    this.world.loadMap(mapId);
    this.player.placeAtTile(tx, ty);
    this.spawnMapEntities();
    const size = this.world.mapPixelSize();
    if (snapCamera) this.camera.snap(this.player.cx, this.player.cy, size.w, size.h);
    this.warpCd = 0.8;
    audio.setMusicMode(this.world.mapDef().music || 'overworld');
    // entering final triggers quest stage
    if (mapId === 'final' && (this.quest.stage === 'gateOpen')) {
      questOnEvent(this.quest, 'enterFinal');
    }
  }

  spawnMapEntities() {
    const def = this.world.mapDef();
    this.enemies = [];
    this.npcs = [];
    // npcs
    if (def.npcs) {
      for (const n of def.npcs) {
        const npc = new NPC(n);
        npc.sync(this.world, TILE_SIZE);
        this.npcs.push(npc);
      }
    }
    // enemies (skip dead bosses; nudge spawns out of solid tiles)
    if (def.enemies) {
      for (const s of def.enemies) {
        const e = createEnemy(s.type, s.tx, s.ty);
        this.nudgeOutOfWall(e);
        this.enemies.push(e);
      }
    }
    if (def.boss) {
      const dg = def.boss.dungeon;
      if (!this.quest.bossesDead[dg]) {
        const b = createEnemy(def.boss.type, def.boss.tx, def.boss.ty);
        this.nudgeOutOfWall(b);
        // intro roar handled on proximity
        b.introDone = false;
        this.enemies.push(b);
      }
    }
    this.projectiles = this.projectiles.filter(() => false);
    this.bombs = [];
    // drops persist? clear per map (classic respawn)
    this.drops = [];
  }

  // Move enemy to nearest walkable tile if its spawn point is inside a wall.
  nudgeOutOfWall(e) {
    const w = this.world;
    const tx0 = Math.floor(e.cx / TILE_SIZE);
    const ty0 = Math.floor(e.cy / TILE_SIZE);
    if (!w.isSolid(tx0, ty0)) return;
    for (let r = 1; r <= 4; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (!w.isSolid(tx0 + dx, ty0 + dy)) {
            e.x = (tx0 + dx) * TILE_SIZE + (TILE_SIZE - e.w) / 2;
            e.y = (ty0 + dy) * TILE_SIZE + (TILE_SIZE - e.h) / 2;
            return;
          }
        }
      }
    }
  }

  currentBoss() {
    for (const e of this.enemies) {
      if (e.isBoss && !e.dead) return e;
    }
    return null;
  }

  // ---------- shop ----------
  tryBuy(stockId) {
    const p = this.player;
    if (stockId === 'potion') {
      const s = SHOP_STOCK[0];
      if (p.gems < s.price) return false;
      p.gems -= s.price;
      p.potions++;
      p.items.potion = true;
      audio.pickup();
      this.autosave();
      return true;
    }
    if (stockId === 'shield') {
      const s = SHOP_STOCK[1];
      if (p.gems < s.price || p.hasShield) return false;
      p.gems -= s.price;
      p.hasShield = true;
      p.items.shield = true;
      audio.pickup();
      this.autosave();
      return true;
    }
    if (stockId === 'arrows30') {
      const s = SHOP_STOCK[2];
      if (p.gems < s.price) return false;
      p.gems -= s.price;
      p.arrows += 30;
      audio.pickup();
      return true;
    }
    if (stockId === 'bombs10') {
      const s = SHOP_STOCK[3];
      if (p.gems < s.price) return false;
      p.gems -= s.price;
      p.bombAmmo += 10;
      p.items.bombs = true;
      audio.pickup();
      return true;
    }
    return false;
  }

  // ---------- interaction ----------
  interact() {
    const t = this.world.interactTarget(this.player.x, this.player.y, this.player.dir);
    if (!t) return false;
    if (t.kind === 'chest') {
      this.openChest(t.chest);
      return true;
    }
    if (t.kind === 'statue') {
      this.player.fullHeal();
      this.save(true);
      audio.heal();
      this.dialog.show(DIALOGS.save_done.name, DIALOGS.save_done.pages, null);
      return true;
    }
    if (t.kind === 'npc') {
      this.talkTo(t.npc);
      return true;
    }
    if (t.kind === 'sign') {
      this.dialog.show('표지판', [t.sign.text], null);
      audio.blip();
      return true;
    }
    if (t.kind === 'lockeddoor') {
      if (this.player.keys > 0) {
        this.player.keys--;
        this.world.openDoor(t.tx, t.ty);
        audio.unlock();
        this.autosave();
      } else {
        this.dialog.show(DIALOGS.locked_needkey.name, DIALOGS.locked_needkey.pages, null);
      }
      return true;
    }
    if (t.kind === 'bossdoor') {
      const dg = this.world.mapDef().id === 'overworld' ? null : this.world.mapId;
      const needKey = dg || 'd1';
      // map bossdoor to its dungeon
      const mapBossKey = { dungeon1: 'd1', dungeon2: 'd2', dungeon3: 'd3', final: 'final' };
      const key = mapBossKey[this.world.mapId] || needKey;
      if (this.player.bossKeys[key]) {
        this.world.openDoor(t.tx, t.ty);
        audio.unlock();
        this.autosave();
      } else {
        this.dialog.show(DIALOGS.bossdoor_needkey.name, DIALOGS.bossdoor_needkey.pages, null);
      }
      return true;
    }
    return false;
  }

  talkTo(npc) {
    if (npc.id === 'elder') {
      const q = this.quest;
      if (q.stage === 'intro') {
        questOnEvent(q, 'talkElder');
        this.dialog.show(DIALOGS.elder_intro.name, DIALOGS.elder_intro.pages, () => this.autosave());
      } else if (q.stage === 'findSword') {
        // Player may have grabbed the sword before talking to the elder.
        if (this.player.swordTier >= 1) {
          q.stage = 'returnSword';
          questOnEvent(q, 'reportSword');
          this.dialog.show(DIALOGS.elder_hassword.name, DIALOGS.elder_hassword.pages, () => this.autosave());
        } else {
          this.dialog.show(DIALOGS.elder_nosword.name, DIALOGS.elder_nosword.pages, null);
        }
      } else if (q.stage === 'returnSword') {
        questOnEvent(q, 'reportSword');
        this.dialog.show(DIALOGS.elder_hassword.name, DIALOGS.elder_hassword.pages, () => this.autosave());
      } else if (q.stage === 'findShards') {
        this.dialog.show(DIALOGS.elder_progress.name, DIALOGS.elder_progress.pages, null, { shards: q.shards });
      } else if (q.stage === 'allShards') {
        questOnEvent(q, 'reportShards');
        this.world.setGateOpen();
        audio.secret();
        this.dialog.show(DIALOGS.elder_allshards.name, DIALOGS.elder_allshards.pages, () => {
          this.dialog.show(DIALOGS.gate_open.name, DIALOGS.gate_open.pages, () => this.autosave());
        });
      } else {
        this.dialog.show(DIALOGS.elder_gatedone.name, DIALOGS.elder_gatedone.pages, null);
      }
      return;
    }
    const d = DIALOGS[npc.dialog] || DIALOGS.villager1;
    this.dialog.show(d.name, d.pages, npc.shop ? () => { this.inventory.open = true; this.inventory.tab = 2; } : null);
  }

  openChest(chest) {
    if (this.world.isChestOpened(chest.id)) return;
    const loot = chest.loot || { kind: 'gems', amount: 5 };
    const p = this.player;
    if (chest.needBossDead && !this.quest.bossesDead[chest.needBossDead]) {
      // refuse: boss still alive (chest stays closed so the shard can't softlock)
      this.dialog.show('보물상자', ['보스의 기운이 상자를 봉인하고 있다.\n보스를 먼저 쓰러뜨리자!'], null);
      return;
    }
    this.world.openChest(chest.id);
    audio.key();
    if (loot.kind === 'sword') {
      p.swordTier = Math.max(p.swordTier, loot.tier);
      if (loot.tier === 1) {
        questOnEvent(this.quest, 'swordFound');
        this.dialog.show(DIALOGS.chest_sword1.name, DIALOGS.chest_sword1.pages, () => this.autosave());
      } else if (loot.tier === 3) {
        this.dialog.show(DIALOGS.chest_sword3.name, DIALOGS.chest_sword3.pages, () => this.autosave());
      } else {
        this.dialog.show('보물상자', [`강철검을 손에 넣었다!\n공격력이 올랐다!`], () => this.autosave());
      }
      audio.secret();
    } else if (loot.kind === 'shard') {
      const dg = loot.dungeon;
      if (this.quest.bossesDead[dg]) {
        questOnEvent(this.quest, 'shard');
        audio.secret();
        this.dialog.show(DIALOGS.chest_shard.name, DIALOGS.chest_shard.pages, () => this.autosave(), { count: this.quest.shards });
      } else {
        this.dialog.show('보물상자', ['보스를 쓰러뜨려야 조각을 얻을 수 있다!'], null);
      }
    } else if (loot.kind === 'heartPiece') {
      p.heartPieces++;
      audio.secret();
      if (p.heartPieces >= 4) {
        p.heartPieces = 0;
        p.maxHp += 2;
        p.hp = p.maxHp;
        this.dialog.show(DIALOGS.chest_heart_full.name, DIALOGS.chest_heart_full.pages, () => this.autosave());
      } else {
        this.dialog.show(DIALOGS.chest_heart_piece.name, DIALOGS.chest_heart_piece.pages, () => this.autosave(), { pieces: p.heartPieces });
      }
    } else if (loot.kind === 'key') {
      p.keys++;
      audio.key();
      this.dialog.show(DIALOGS.chest_key.name, DIALOGS.chest_key.pages, null);
    } else if (loot.kind === 'bosskey') {
      p.bossKeys[loot.dungeon] = true;
      audio.secret();
      this.dialog.show(DIALOGS.chest_bosskey.name, DIALOGS.chest_bosskey.pages, () => this.autosave());
    } else if (loot.kind === 'item') {
      const id = loot.item;
      if (id === 'potion') { p.potions++; p.items.potion = true; }
      else p.items[id] = true;
      if (id === 'lantern' || id === 'bow' || id === 'boomerang') p.selectedItem = id;
      if (id && id.indexOf('compass') === 0) {
        const dg = id.split('_')[1];
        p.compass[dg] = true;
        this.dialog.show(DIALOGS.chest_compass.name, DIALOGS.chest_compass.pages, () => this.autosave());
      } else {
        const names = { bow: '활', lantern: '랜턴', boomerang: '부메랑', potion: '포션' };
        this.dialog.show(DIALOGS.chest_item.name, DIALOGS.chest_item.pages, () => this.autosave(), { item: names[id] || id });
      }
      audio.secret();
    } else if (loot.kind === 'gems') {
      p.gems += loot.amount || 10;
      audio.gem();
      this.dialog.show(DIALOGS.chest_gems.name, DIALOGS.chest_gems.pages, null, { amount: loot.amount });
    } else if (loot.kind === 'bombs') {
      p.bombAmmo += loot.amount || 5;
      p.items.bombs = true;
      audio.pickup();
      this.dialog.show('보물상자', [`폭탄 ${loot.amount || 5}개를 손에 넣었다!`], null);
    }
    this.autosave();
  }

  useSelectedItem() {
    const p = this.player;
    const id = p.selectedItem;
    if (id === 'bow') {
      if (!p.items.bow) { this.dialog.show('', DIALOGS.need_bow.pages, null); return; }
      if (p.arrows <= 0) { this.dialog.show('', DIALOGS.no_arrows.pages, null); audio.blip(); return; }
      p.arrows--;
      const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[p.dir];
      this.projectiles.push(new Projectile({ kind: 'arrow', x: p.cx - 3, y: p.cy - 3, dx: d[0], dy: d[1], damage: 2 }));
      p.useCd = 0.3;
      audio.shoot();
    } else if (id === 'bombs') {
      if (p.bombAmmo <= 0) { this.dialog.show('', DIALOGS.no_bombs.pages, null); return; }
      p.bombAmmo--;
      p.items.bombs = true;
      this.bombs.push(new Bomb(p.cx, p.cy));
      p.useCd = 0.4;
      audio.blip();
    } else if (id === 'boomerang') {
      if (!p.items.boomerang) return;
      // only one at a time
      if (this.projectiles.some((pr) => pr.kind === 'boomerang' && !pr.dead)) return;
      const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[p.dir];
      this.projectiles.push(new Projectile({ kind: 'boomerang', x: p.cx - 3, y: p.cy - 3, dx: d[0], dy: d[1], damage: 1 }));
      p.useCd = 0.4;
      audio.shoot();
    } else if (id === 'lantern') {
      if (!p.items.lantern) return;
      // burn vines in front
      const cx = Math.floor(p.cx / TILE_SIZE);
      const cy = Math.floor(p.cy / TILE_SIZE);
      const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[p.dir];
      let burned = false;
      for (const [bx, by] of [[cx, cy], [cx + d[0], cy + d[1]]]) {
        if (this.world.getTile(bx, by) === 'V') {
          this.world.setTile(bx, by, '.', true);
          burned = true;
          this.burst(bx * TILE_SIZE + 8, by * TILE_SIZE + 8, '#ff9e2e', 10);
        }
      }
      if (burned) { audio.boom(); this.autosave(); }
      else audio.blip();
      p.useCd = 0.3;
    } else if (id === 'potion') {
      if (p.potions <= 0) { this.dialog.show('', DIALOGS.potion_empty.pages, null); return; }
      if (p.hp >= p.maxHp) return;
      p.potions--;
      p.fullHeal();
      audio.heal();
      p.useCd = 0.4;
    }
  }

  burst(x, y, color, n) {
    for (let i = 0; i < (n || 8); i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() * 2 - 1) * 90,
        vy: (Math.random() * 2 - 1) * 90 - 30,
        life: 0.5 + Math.random() * 0.3,
        color: color || '#fff'
      });
    }
  }

  onEnemyDead(e) {
    this.quest.kills++;
    audio.hit();
    this.burst(e.cx, e.cy, '#fff', 10);
    // drops
    const table = rollEnemyDrop(e.type);
    // bosses drop bonus + keys sometimes
    if (e.isBoss) {
      const dg = bossToDungeon(e.type);
      if (dg) this.quest.bossesDead[dg] = true;
      audio.roar();
      audio.secret();
      this.camera.shake(4, 0.4);
      if (e.type === 'slimeKing') {
        // grant steel sword
        this.player.swordTier = Math.max(this.player.swordTier, 2);
        this.dialog.show('강철검', ['거대 슬라임을 쓰러뜨렸다!\n강철검을 손에 넣었다! (공격력 상승)'], null);
      } else if (e.type === 'demonKing') {
        questOnEvent(this.quest, 'bossFinalDead');
        this.autosave();
        this.state = 'ending';
        audio.setMusicMode('off');
        return;
      } else {
        const names = { octoKing: '문어왕', knightCaptain: '기사 대장' };
        this.dialog.show('', [`${names[e.type] || '보스'}를 쓰러뜨렸다!\n보물상자에서 문장 조각을 챙기자.`], null);
      }
      // shard hint: quest shard comes from chest; still autosave
      this.autosave();
      // drop hearts + gems
      for (let i = 0; i < 5; i++) {
        this.drops.push(new Drop('gem', e.cx + (Math.random() * 24 - 12), e.cy, 5));
      }
      this.drops.push(new Drop('heart', e.cx, e.cy - 10));
      return;
    }
    // normal drops
    const gemBonus = { knight: 2, goblin: 1 };
    for (const d of table) {
      this.drops.push(new Drop(d.kind, e.cx, e.cy, d.amount));
    }
    if (gemBonus[e.type] && Math.random() < 0.15) {
      this.drops.push(new Drop('key', e.cx, e.cy));
    } else if (Math.random() < 0.03) {
      this.drops.push(new Drop('key', e.cx, e.cy));
    }
  }

  // ---------- update ----------
  update(dt, inp) {
    this.frame++;
    if (inp.justPressed('mute')) {
      audio.toggleMute();
      inp.consume('mute');
    }

    // auto director presses real input keys before anything else consumes them
    if (this.autoDirector.active) this.autoDirector.update(dt, this, inp);

    // stage tracking: banner on stage-up, timer ticks everywhere
    {
      const st = currentStage(this.quest);
      if (this.lastStageN === 0) this.lastStageN = st.n;
      else if (st.n > this.lastStageN) {
        this.lastStageN = st.n;
        this.stageBannerT = 2.8;
        audio.blip();
      }
    }
    if (this.stageBannerT > 0) this.stageBannerT -= dt;

    if (this.state === 'title') {
      try { this.saveExistsCache = hasSave(); } catch (e) { /* ignore */ }
      if (inp.justPressed('auto')) {
        inp.consume('auto');
        audio.ensure();
        this.autoDirector.start(this, true);
        return;
      }
      if (inp.justPressed('interact') || inp.justPressed('confirm') || inp.justPressed('attack')) {
        inp.consume('interact'); inp.consume('confirm'); inp.consume('attack');
        audio.ensure();
        if (this.saveExistsCache) {
          if (!this.continueGame()) this.newGame();
        } else {
          this.newGame();
        }
      }
      inp.update();
      return;
    }
    if (this.state === 'gameover') {
      if (inp.justPressed('interact') || inp.justPressed('confirm')) {
        inp.consume('interact'); inp.consume('confirm');
        // respawn at last save with full hearts, lose half gems
        const data = loadGame();
        if (data) {
          this.world = new World();
          this.player = new Player();
          this.restore(data);
          this.player.gems = Math.floor(this.player.gems / 2);
          this.player.fullHeal();
          this.player.dead = false;
          this.state = 'playing';
        } else {
          this.newGame();
        }
      }
      inp.update();
      return;
    }
    if (this.state === 'ending') {
      if (inp.justPressed('interact') || inp.justPressed('confirm')) {
        inp.consume('interact'); inp.consume('confirm');
        this.state = 'title';
        try { this.saveExistsCache = hasSave(); } catch (e) { /* ignore */ }
      }
      inp.update();
      return;
    }

    // playing (dialog/inventory are overlays that pause world)
    if (this.dialog.active) {
      this.dialog.update(dt, inp);
      inp.update();
      return;
    }
    if (this.inventory.open) {
      if (inp.justPressed('quest')) { this.showQuest = !this.showQuest; inp.consume('quest'); }
      this.inventory.update(dt, inp, this);
      inp.update();
      return;
    }

    // global keys
    if (inp.justPressed('inventory')) {
      this.inventory.open = true;
      this.inventory.tab = 0;
      inp.consume('inventory');
      inp.update();
      return;
    }
    if (inp.justPressed('quest')) {
      this.showQuest = !this.showQuest;
      inp.consume('quest');
    }
    if (inp.justPressed('auto')) {
      inp.consume('auto');
      this.autoDirector.toggle(this);
    }
    if (inp.justPressed('interact')) {
      inp.consume('interact');
      if (this.interact()) {
        inp.update();
        return;
      }
    }

    this.playtime += dt;
    if (this.warpCd > 0) this.warpCd -= dt;

    // player
    const pres = this.player.update(dt, inp, this.world);
    if (pres.attack) {
      audio.swing();
      // cut grass immediately + hit enemies handled below
      const box = this.player.swordBox();
      if (box) {
        const x0 = Math.floor(box.x / TILE_SIZE);
        const x1 = Math.floor((box.x + box.w) / TILE_SIZE);
        const y0 = Math.floor(box.y / TILE_SIZE);
        const y1 = Math.floor((box.y + box.h) / TILE_SIZE);
        for (let ty = y0; ty <= y1; ty++) {
          for (let tx = x0; tx <= x1; tx++) {
            if (this.world.cutAt(tx, ty)) {
              this.burst(tx * TILE_SIZE + 8, ty * TILE_SIZE + 8, '#6ad952', 6);
              const drops = rollGrassDrop();
              for (const d of drops) {
                this.drops.push(new Drop(d.kind, tx * TILE_SIZE + 3, ty * TILE_SIZE + 3, d.amount));
              }
            }
          }
        }
      }
    }
    if (pres.useItem) {
      inp.consume('use');
      if (this.player.useCd <= 0) this.useSelectedItem();
    }
    if (pres.noSword) {
      // hint once: show nothing (avoid dialog spam)
    }

    // sword hits enemies
    const sbox = this.player.swordBox();
    if (sbox && this.player.swordTier > 0) {
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (aabbOverlap(sbox, { x: e.x, y: e.y, w: e.w, h: e.h })) {
          this.lastHitWasBomb = false;
          const r = e.hurt(this.player.swordDmg(), this.player.dir, this);
          if (r === 'blocked') {
            audio.blip();
            this.burst(e.cx, e.cy, '#8d9099', 4);
          } else if (r) {
            audio.hit();
            this.camera.shake(2, 0.15);
            this.burst(e.cx, e.cy, '#fff', 6);
            // knockback
            const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[this.player.dir];
            e.x += d[0] * 8;
            e.y += d[1] * 8;
            if (e.dead) this.onEnemyDead(e);
          }
        }
      }
    }

    // enemies
    for (const e of this.enemies) {
      if (e.dead) continue;
      const res = e.update(dt, this);
      for (const s of res.projectiles) {
        this.projectiles.push(new Projectile({ kind: s.kind, x: s.x, y: s.y, dx: s.dx, dy: s.dy, hostile: true, damage: e.damage }));
      }
      for (const s of res.spawns) {
        this.enemies.push(createEnemyAtPixel(s.type, s.x, s.y));
      }
      // boss intro
      if (e.isBoss && !e.introDone) {
        const dd = Math.hypot(e.cx - this.player.cx, e.cy - this.player.cy);
        if (dd < 180) {
          e.introDone = true;
          audio.roar();
          audio.setMusicMode('boss');
          const intros = {
            slimeKing: DIALOGS.boss_intro_slime,
            octoKing: DIALOGS.boss_intro_octo,
            knightCaptain: DIALOGS.boss_intro_knight,
            demonKing: DIALOGS.boss_intro_demon
          };
          const d = intros[e.type];
          if (d) this.dialog.show(d.name, d.pages, null);
        }
      }
      // touch damage
      if (!e.dead && !this.player.dead) {
        if (aabbOverlap({ x: e.x, y: e.y, w: e.w, h: e.h }, { x: this.player.x, y: this.player.y, w: this.player.w, h: this.player.h })) {
          if (this.player.hurt(e.damage, e.cx, e.cy)) {
            audio.hurt();
            this.camera.shake(3, 0.25);
            if (this.player.dead) {
              this.deaths++;
              this.state = 'gameover';
              audio.setMusicMode('off');
            }
          }
        }
      }
    }
    // Remove dead enemies; switch music back once no boss remains.
    const anyBossAlive = this.enemies.some((e) => e.isBoss && !e.dead);
    this.enemies = this.enemies.filter((e) => !e.dead);
    if (!anyBossAlive && audio.musicMode === 'boss') {
      audio.setMusicMode(this.world.mapDef().music === 'boss' ? 'dungeon' : (this.world.mapDef().music || 'overworld'));
    }

    // projectiles
    for (const pr of this.projectiles) {
      pr.update(dt, this);
      if (pr.dead) continue;
      if (pr.hostile) {
        // shield block?
        if (aabbOverlap(pr.box(), { x: this.player.x, y: this.player.y, w: this.player.w, h: this.player.h })) {
          if (this.player.shieldBlocks(pr.x, pr.y)) {
            pr.dead = true;
            audio.blip();
            this.burst(this.player.cx, this.player.cy, '#8d9099', 4);
          } else if (this.player.hurt(pr.damage, pr.x, pr.y)) {
            pr.dead = true;
            audio.hurt();
            this.camera.shake(3, 0.25);
            if (this.player.dead) {
              this.deaths++;
              this.state = 'gameover';
            }
          } else {
            pr.dead = true;
          }
        }
      } else {
        for (const e of this.enemies) {
          if (e.dead) continue;
          if (aabbOverlap(pr.box(), { x: e.x, y: e.y, w: e.w, h: e.h })) {
            if (pr.kind === 'boomerang') {
              e.stun = 1.5;
              audio.hit();
              pr.returning = true;
            } else {
              this.lastHitWasBomb = false;
              const r = e.hurt(pr.damage, this.player.dir, this);
              if (r === 'blocked') audio.blip();
              else {
                audio.hit();
                this.burst(e.cx, e.cy, '#fff', 5);
                if (e.dead) this.onEnemyDead(e);
              }
              pr.dead = true;
            }
            break;
          }
        }
      }
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);

    // bombs
    for (const b of this.bombs) {
      const wasExploded = b.exploded;
      b.update(dt);
      if (b.exploded && !wasExploded) {
        audio.boom();
        this.camera.shake(5, 0.35);
        // blow cracked walls around
        const cx = Math.floor((b.x + 5) / TILE_SIZE);
        const cy = Math.floor((b.y + 5) / TILE_SIZE);
        for (let ty = cy - 2; ty <= cy + 2; ty++) {
          for (let tx = cx - 2; tx <= cx + 2; tx++) {
            if (this.world.getTile(tx, ty) === 'C') {
              const dd = Math.hypot(tx - cx, ty - cy);
              if (dd <= 2.2) {
                this.world.setTile(tx, ty, '.', true);
                this.burst(tx * TILE_SIZE + 8, ty * TILE_SIZE + 8, '#8d9099', 10);
              }
            }
          }
        }
      }
      if (b.exploded) {
        const bb = b.box();
        for (const e of this.enemies) {
          if (e.dead) continue;
          if (aabbOverlap(bb, { x: e.x, y: e.y, w: e.w, h: e.h })) {
            this.lastHitWasBomb = true;
            const r = e.hurt(4, this.player.dir, this);
            if (r && r !== 'blocked') {
              if (e.dead) this.onEnemyDead(e);
            }
            this.lastHitWasBomb = false;
          }
        }
        if (aabbOverlap(bb, { x: this.player.x, y: this.player.y, w: this.player.w, h: this.player.h })) {
          if (this.player.hurt(2, b.x, b.y)) {
            audio.hurt();
            if (this.player.dead) {
              this.deaths++;
              this.state = 'gameover';
            }
          }
        }
      }
    }
    this.bombs = this.bombs.filter((b) => !b.dead);

    // drops pickup
    for (const d of this.drops) {
      d.update(dt);
      if (d.dead) continue;
      if (aabbOverlap(d.box(), { x: this.player.x, y: this.player.y, w: this.player.w, h: this.player.h })) {
        d.dead = true;
        const p = this.player;
        if (d.kind === 'heart') { p.heal(2); audio.heal(); }
        else if (d.kind === 'gem') { p.gems += d.amount; audio.gem(); }
        else if (d.kind === 'key') { p.keys++; audio.key(); }
        else if (d.kind === 'arrows') { p.arrows += d.amount; audio.pickup(); }
        else if (d.kind === 'bombs') { p.bombAmmo += d.amount; p.items.bombs = true; audio.pickup(); }
      }
    }
    this.drops = this.drops.filter((d) => !d.dead);

    // warp check
    if (this.warpCd <= 0) {
      const tx = Math.floor(this.player.cx / TILE_SIZE);
      const ty = Math.floor(this.player.cy / TILE_SIZE);
      // chest drawing handled in render; warp via tile 'A' or warp list
      const w = this.world.warpAt(tx, ty);
      if (w) {
        if (w.needGate && !this.world.gateOpen) {
          this.dialog.show(DIALOGS.need_shards.name, DIALOGS.need_shards.pages, null, { shards: this.quest.shards });
          this.warpCd = 1.0;
        } else {
          audio.door();
          this.enterMap(w.toMap, w.toTx, w.toTy, false);
          this.autosave();
        }
      }
    }

    // sealed gate touch hint
    const ptx = Math.floor(this.player.cx / TILE_SIZE);
    const pty = Math.floor(this.player.cy / TILE_SIZE);
    if (this.world.mapId === 'overworld' && this.warpCd <= 0) {
      // adjacent to X?
      const around = [[ptx, pty], [ptx + 1, pty], [ptx - 1, pty], [ptx, pty + 1], [ptx, pty - 1]];
      for (const [ax, ay] of around) {
        if (this.world.getTile(ax, ay) === 'X') {
          if (this.quest.shards >= 3) {
            // auto-open if elder already told? require elder report first
            if (this.quest.stage === 'allShards') {
              // nudge to elder
            }
          }
          break;
        }
      }
    }

    // npcs + particles + camera
    for (const n of this.npcs) n.update(dt);
    for (const pt of this.particles) {
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 120 * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    // weather leaves in overworld
    if (this.world.mapDef().weather === 'leaves' && Math.random() < 0.1) {
      const off = this.camera.offset();
      this.particles.push({
        x: off.x + Math.random() * VIEW_W,
        y: off.y - 5,
        vx: 10 + Math.random() * 20,
        vy: 30 + Math.random() * 20,
        life: 3,
        color: '#6ad952',
        leaf: true
      });
    }
    const size = this.world.mapPixelSize();
    this.camera.update(dt, this.player.cx, this.player.cy, size.w, size.h);

    inp.update();
  }

  // ---------- render ----------
  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const camOff = this.camera.offset();
    if (this.state === 'title') {
      try { this.saveExistsCache = hasSave(); } catch (e) { /* ignore */ }
      drawTitle(ctx, VIEW_W, VIEW_H, this.frame, this.saveExistsCache);
      return;
    }
    if (this.state === 'gameover') {
      // draw last world dimmed + overlay
      this.drawWorld(ctx, camOff);
      drawGameOver(ctx, VIEW_W, VIEW_H, this.frame);
      return;
    }
    if (this.state === 'ending') {
      drawEnding(ctx, VIEW_W, VIEW_H, this.frame, {
        playtime: this.playtime, kills: this.quest.kills, deaths: this.deaths, gems: this.player.gems
      });
      return;
    }
    this.drawWorld(ctx, camOff);
    drawHUD(ctx, this, VIEW_W);
    this.dialog.draw(ctx, VIEW_W, VIEW_H);
    this.inventory.draw(ctx, this, VIEW_W, VIEW_H);
    // stage banner
    if (this.stageBannerT > 0) {
      const st = currentStage(this.quest);
      const prevAlpha = ctx.globalAlpha;
      ctx.globalAlpha = Math.max(0, Math.min(1, this.stageBannerT / 0.5));
      ctx.fillStyle = 'rgba(0,0,20,0.78)';
      ctx.fillRect(0, 118, VIEW_W, 68);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#ffd94a';
      ctx.font = 'bold 15px monospace';
      ctx.fillText('STAGE ' + st.n + '/' + STAGE_TOTAL, VIEW_W / 2, 134);
      ctx.fillStyle = '#fff';
      ctx.font = '14px monospace';
      ctx.fillText(st.name, VIEW_W / 2, 158);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.globalAlpha = prevAlpha;
    }
    // auto badge
    if (this.auto) {
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#ff5f5f';
      ctx.fillText('▶ AUTO', 6, VIEW_H - 12);
    }
    // mute icon
    try {
      ctx.font = '10px monospace';
      ctx.fillStyle = audio.muted ? '#ff4f4f' : '#666';
      ctx.fillText(audio.muted ? 'M:음소거중' : 'M:소리켬', VIEW_W - 80, VIEW_H - 12);
    } catch (e) { /* stub */ }
  }

  drawWorld(ctx, camOff) {
    try {
      ctx.fillStyle = '#0a0a18';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      const x0 = Math.max(0, Math.floor(camOff.x / TILE_SIZE));
      const y0 = Math.max(0, Math.floor(camOff.y / TILE_SIZE));
      const x1 = Math.min(this.world.grid[0].length - 1, x0 + VIEW_W / TILE_SIZE + 1);
      const y1 = Math.min(this.world.grid.length - 1, y0 + VIEW_H / TILE_SIZE + 1);
      for (let ty = y0; ty <= y1; ty++) {
        for (let tx = x0; tx <= x1; tx++) {
          const ch = this.world.getTile(tx, ty);
          drawTile(ctx, ch, tx * TILE_SIZE - camOff.x, ty * TILE_SIZE - camOff.y, this.frame);
          // chest overlay
          const chest = this.world.chestAt(tx, ty);
          if (chest && !this.world.isChestOpened(chest.id)) {
            const dx = tx * TILE_SIZE - camOff.x;
            const dy = ty * TILE_SIZE - camOff.y;
            ctx.fillStyle = '#8a5a2e';
            ctx.fillRect(dx + 2, dy + 5, 12, 8);
            ctx.fillStyle = '#ffd94a';
            ctx.fillRect(dx + 6, dy + 7, 4, 4);
          }
        }
      }
      // drops
      for (const d of this.drops) d.draw(ctx, camOff);
      // npcs
      for (const n of this.npcs) n.draw(ctx, camOff);
      // enemies
      for (const e of this.enemies) e.draw(ctx, camOff);
      // bombs/projectiles
      for (const b of this.bombs) b.draw(ctx, camOff);
      for (const pr of this.projectiles) pr.draw(ctx, camOff);
      // player
      this.player.draw(ctx, camOff, this.frame);
      // particles
      for (const pt of this.particles) {
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x - camOff.x, pt.y - camOff.y, 2, 2);
      }
      // dark rooms
      const def = this.world.mapDef();
      if (def.dark) {
        const hasLantern = !!this.player.items.lantern;
        const radius = hasLantern ? 90 : 45;
        ctx.fillStyle = 'rgba(0,0,10,0.85)';
        // cheap darkness: fill 4 rects around light circle (approx with rect hole)
        const px = this.player.cx - camOff.x;
        const py = this.player.cy - camOff.y;
        ctx.fillRect(0, 0, VIEW_W, Math.max(0, py - radius));
        ctx.fillRect(0, py + radius, VIEW_W, VIEW_H);
        ctx.fillRect(0, py - radius, Math.max(0, px - radius), radius * 2);
        ctx.fillRect(px + radius, py - radius, VIEW_W, radius * 2);
      }
    } catch (e) { /* stub ctx throws */ }
  }
}

// ---------- bootstrap (browser only) ----------
export function startFromDOM() {
  if (typeof document === 'undefined') return null;
  const canvas = document.getElementById('game');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.imageSmoothingEnabled = false;
  const game = new Game(canvas, ctx);
  // expose for debugging/testing in the browser console
  if (typeof window !== 'undefined') window.game = game;
  input.bindTouch(document);
  // buttons in HUD overlays
  document.querySelectorAll('[data-action]').forEach((el) => {
    el.addEventListener('click', () => {
      const a = el.getAttribute('data-action');
      if (a === 'mute') audio.toggleMute();
      if (a === 'auto') {
        if (game.state === 'title') game.autoDirector.start(game, true);
        else game.autoDirector.toggle(game);
      }
      if (a === 'inventory') {
        if (game.state === 'playing' && !game.dialog.active) game.inventory.open = true;
      }
    });
  });
  // unlock audio on first gesture
  const unlock = () => audio.ensure();
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  let last = 0;
  let acc = 0;
  const STEP = 1 / 60;
  function frame(t) {
    requestAnimationFrame(frame);
    if (!last) last = t;
    let dt = (t - last) / 1000;
    last = t;
    if (dt > 0.25) dt = 0.25;
    acc += dt;
    while (acc >= STEP) {
      game.update(STEP, input);
      acc -= STEP;
    }
    game.render();
  }
  audio.setMusicMode('title');
  requestAnimationFrame(frame);
  return game;
}
