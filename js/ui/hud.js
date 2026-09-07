// Top bar HUD: hearts (half support), gems, keys, item icon, quest hint, boss bars.
import { getObjectiveText } from '../content/quests.js';

export function drawHUD(ctx, game, W) {
  try {
    const p = game.player;
    // top bar bg
    ctx.fillStyle = 'rgba(8,8,16,0.85)';
    ctx.fillRect(0, 0, W, 26);
    // hearts
    const maxHearts = Math.ceil(p.maxHp / 2);
    for (let i = 0; i < maxHearts; i++) {
      const hpForHeart = p.hp - i * 2;
      const hx = 6 + i * 13;
      const hy = 6;
      ctx.fillStyle = '#3a0a14';
      ctx.fillRect(hx, hy, 11, 10);
      if (hpForHeart >= 2) {
        ctx.fillStyle = '#ff4f6e';
        ctx.fillRect(hx + 1, hy + 1, 9, 8);
      } else if (hpForHeart === 1) {
        ctx.fillStyle = '#ff4f6e';
        ctx.fillRect(hx + 1, hy + 1, 4, 8);
        ctx.fillStyle = '#3a0a14';
        ctx.fillRect(hx + 6, hy + 1, 4, 8);
      }
      ctx.fillStyle = '#fff';
      ctx.fillRect(hx + 3, hy + 3, 2, 2);
    }
    ctx.font = '11px monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#5bd9ff';
    const gemX = 6 + maxHearts * 13 + 6;
    ctx.fillText('◆' + p.gems, gemX, 7);
    ctx.fillStyle = '#ffd94a';
    ctx.fillText('🔑' + p.keys, gemX + 60, 7);
    ctx.fillStyle = '#fff';
    ctx.fillText('[' + itemShort(p.selectedItem) + ']', gemX + 110, 7);
    // quest hint line (toggle with Q)
    if (game.showQuest) {
      ctx.fillStyle = 'rgba(8,8,16,0.8)';
      ctx.fillRect(0, 26, W, 16);
      ctx.fillStyle = '#ffe9a8';
      ctx.font = '11px monospace';
      const obj = getObjectiveText(game.quest);
      ctx.fillText('목표: ' + obj, 6, 29);
    }
    // boss HP bar (only after the boss intro triggered on proximity)
    const boss = game.currentBoss();
    if (boss && !boss.dead && boss.introDone) {
      const bw = 220;
      const bx = (W - bw) / 2;
      const by = 46;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(bx - 2, by - 2, bw + 4, 12);
      ctx.fillStyle = '#5a0a1a';
      ctx.fillRect(bx, by, bw, 8);
      ctx.fillStyle = '#ff4f4f';
      ctx.fillRect(bx, by, bw * Math.max(0, boss.hp / boss.maxHp), 8);
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.fillText(boss.name, bx, by - 11);
    }
    // arrows/bombs counts
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.fillText('➶' + p.arrows + '  ●' + p.bombAmmo, W - 80, 7);
  } catch (e) { /* stub */ }
}

function itemShort(id) {
  if (id === 'bow') return '활';
  if (id === 'bombs') return '폭탄';
  if (id === 'boomerang') return '부메랑';
  if (id === 'lantern') return '랜턴';
  if (id === 'potion') return '포션';
  return id;
}
