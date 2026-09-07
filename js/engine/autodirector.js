// Auto-progression director ("자동 진행"): drives the game through every
// stage to the ending on its own. Doubles as an attract/demo mode and as
// the end-to-end test harness (tools/smoke.mjs runs it headlessly).
//
// The director never fakes game state: it teleports the player, grants the
// loadout a stage requires, and presses real input keys (interact) so all
// dialogs/chests/quest events go through the normal game paths. Boss damage
// is applied directly (a "backstab" hit from behind, the intended way to
// beat shielded bosses) so the demo can't be softlocked by boss AI.
import { currentStage, STAGE_TOTAL } from '../content/stages.js';
import { TILE_SIZE } from '../world/tiles.js';

const PULSE = 0.12; // seconds a simulated key stays held

export class AutoDirector {
  constructor() {
    this.active = false;
    this.done = false;
    this.t = 0;          // timer inside current step
    this.pulseKey = null;
    this.pulseT = 0;
    this.hitCd = 0;      // boss damage tick cooldown
    this.grantedFor = null; // map id already granted a loadout
  }

  // fresh=true: start a brand new auto run (from title). fresh=false:
  // attach to the current run mid-game (P key while playing).
  start(game, fresh) {
    this.active = true;
    this.done = false;
    this.t = 0;
    this.pulseKey = null;
    this.pulseT = 0;
    this.hitCd = 0;
    this.grantedFor = null;
    game.auto = true;
    if (fresh) {
      game.newGame();
      game.lastStageN = 1;
      game.stageBannerT = 2.8;
    }
  }

  deactivate(game) {
    this.active = false;
    if (game) game.auto = false;
  }

  toggle(game) {
    if (this.active) this.deactivate(game);
    else this.start(game, false);
  }

  pulse(inp, key) {
    if (this.pulseKey) inp.release(this.pulseKey);
    this.pulseKey = key;
    this.pulseT = PULSE;
    inp.press(key);
  }

  // teleport within a map or enter another map at a tile
  tp(game, mapId, tx, ty) {
    if (game.world.mapId !== mapId) {
      game.enterMap(mapId, tx, ty, true);
    } else {
      game.player.x = tx * TILE_SIZE + 2;
      game.player.y = ty * TILE_SIZE + 2;
      const size = game.world.mapPixelSize();
      game.camera.snap(game.player.cx, game.player.cy, size.w, size.h);
    }
  }

  grantUntil(game, swordTier, dungeon) {
    const p = game.player;
    p.swordTier = Math.max(p.swordTier, swordTier);
    p.keys = Math.max(p.keys, 3);
    p.items.bombs = true;
    p.bombAmmo = Math.max(p.bombAmmo, 5);
    p.items.bow = true;
    p.arrows = Math.max(p.arrows, 10);
    p.items.lantern = true;
    p.items.boomerang = true;
    if (dungeon) p.bossKeys[dungeon] = true;
    p.fullHeal();
  }

  update(dt, game, inp) {
    if (!this.active) return;
    // release a finished key pulse
    if (this.pulseKey) {
      this.pulseT -= dt;
      if (this.pulseT <= 0) {
        inp.release(this.pulseKey);
        this.pulseKey = null;
      }
    }
    if (game.state === 'ending') {
      this.done = true;
      this.deactivate(game);
      return;
    }
    if (game.state === 'gameover') {
      // god mode should prevent this; recover anyway
      this.pulse(inp, 'interact');
      return;
    }
    if (game.state !== 'playing') return;

    this.t += dt;
    this.hitCd -= dt;
    // god mode while auto: demo must reach the ending
    game.player.god = true;
    if (game.player.hp < game.player.maxHp) game.player.fullHeal();

    // advance any dialog (typewriter finish + page turns)
    if (game.dialog.active) {
      if (this.t >= 0.55) {
        this.t = 0;
        this.pulse(inp, 'interact');
      }
      return;
    }
    if (game.inventory.open) game.inventory.open = false;

    const st = currentStage(game.quest);
    const fn = this['stage' + st.n];
    if (fn) fn.call(this, game, inp);
  }

  // ---- stage scripts ----

  // talk to the elder (village center)
  stage1(game, inp) {
    this.grantedFor = null;
    this.tp(game, 'overworld', 44, 58);
    game.player.dir = 'up';
    if (this.t >= 0.8) {
      this.t = 0;
      this.pulse(inp, 'interact');
    }
  }

  // wooden sword chest in the forest cave
  stage2(game, inp) {
    this.tp(game, 'caveSword', 10, 8);
    game.player.dir = 'up';
    if (this.t >= 0.8) {
      this.t = 0;
      this.pulse(inp, 'interact');
    }
  }

  // report back to the elder
  stage3(game, inp) {
    this.tp(game, 'overworld', 44, 58);
    game.player.dir = 'up';
    if (this.t >= 0.8) {
      this.t = 0;
      this.pulse(inp, 'interact');
    }
  }

  stage4(game, inp) { this.dungeon(game, inp, 'dungeon1', 'd1', 1, 34, 10, 34, 12); }
  stage5(game, inp) { this.dungeon(game, inp, 'dungeon2', 'd2', 2, 33, 11, 34, 12); }
  stage6(game, inp) { this.dungeon(game, inp, 'dungeon3', 'd3', 2, 36, 11, 38, 12); }

  // generic dungeon stage: kill the boss, then open the shard chest
  dungeon(game, inp, mapId, dg, swordTier, bossTx, bossTy, shardTx, shardTy) {
    if (this.grantedFor !== mapId) {
      this.grantUntil(game, swordTier, dg);
      this.grantedFor = mapId;
    }
    const boss = game.enemies.find((e) => e.isBoss && !e.dead);
    if (boss) {
      this.tp(game, mapId, bossTx, bossTy);
      // face the boss so the demo looks right
      const dx = boss.cx - game.player.cx;
      const dy = boss.cy - game.player.cy;
      game.player.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
      // backstab tick: damage from behind bypasses shielded fronts
      const near = Math.hypot(dx, dy) < 140;
      if (near && this.hitCd <= 0) {
        this.hitCd = 0.45;
        const r = boss.hurt(game.player.swordDmg(), boss.dir, game);
        if (r && r !== 'blocked') {
          game.burst(boss.cx, boss.cy, '#fff', 6);
          game.camera.shake(2, 0.12);
        }
        if (boss.dead) game.onEnemyDead(boss);
      }
    } else {
      // boss down: open the shard chest
      this.tp(game, mapId, shardTx, shardTy - 1);
      game.player.dir = 'down';
      if (this.t >= 0.8) {
        this.t = 0;
        this.pulse(inp, 'interact');
      }
    }
  }

  // report 3 shards to the elder -> sealed gate opens
  stage7(game, inp) {
    this.tp(game, 'overworld', 44, 58);
    game.player.dir = 'up';
    if (this.t >= 0.8) {
      this.t = 0;
      this.pulse(inp, 'interact');
    }
  }

  // final dungeon: shining sword chest, then the demon king
  stage8(game, inp) {
    if (this.grantedFor !== 'final') {
      this.grantUntil(game, game.player.swordTier >= 3 ? 3 : 2, null);
      this.grantedFor = 'final';
    }
    if (game.world.mapId !== 'final') {
      this.tp(game, 'final', 3, 2);
      return;
    }
    if (game.player.swordTier < 3) {
      // grab the shining sword from its chest (20,2); stand on (19,2)
      this.tp(game, 'final', 19, 2);
      game.player.dir = 'right';
      if (this.t >= 0.8) {
        this.t = 0;
        this.pulse(inp, 'interact');
      }
      return;
    }
    const boss = game.enemies.find((e) => e.isBoss && !e.dead);
    if (boss) {
      this.tp(game, 'final', 36, 11);
      const dx = boss.cx - game.player.cx;
      const dy = boss.cy - game.player.cy;
      game.player.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
      const near = Math.hypot(dx, dy) < 140;
      if (near && this.hitCd <= 0) {
        this.hitCd = 0.45;
        const r = boss.hurt(game.player.swordDmg(), boss.dir, game);
        if (r && r !== 'blocked') {
          game.burst(boss.cx, boss.cy, '#fff', 6);
          game.camera.shake(2, 0.12);
        }
        if (boss.dead) game.onEnemyDead(boss);
      }
    }
    // boss dead -> onEnemyDead already switched to the ending state
  }
}
