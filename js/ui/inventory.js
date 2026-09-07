// Inventory overlay: item grid, select, quest log tab, shop buying.
import { ITEM_DEFS, SELECTABLE_ITEMS, SHOP_STOCK, swordName } from '../content/items.js';
import { getObjectiveText } from '../content/quests.js';
import { audio } from '../engine/audio.js';

export class InventoryUI {
  constructor() {
    this.open = false;
    this.tab = 0; // 0 items, 1 quest, 2 shop
    this.cursor = 0;
  }

  toggle() {
    this.open = !this.open;
    this.tab = 0;
    this.cursor = 0;
  }

  ownedList(player) {
    const list = [];
    for (const id of SELECTABLE_ITEMS) {
      if (id === 'potion') {
        if (player.potions > 0) list.push(id);
      } else if (id === 'bombs') {
        list.push(id); // always show bombs slot (ammo may be 0)
      } else if (player.items[id]) {
        list.push(id);
      }
    }
    return list;
  }

  update(dt, input, game) {
    if (!this.open) return;
    if (input.justPressed('inventory') || input.justPressed('cancel')) {
      this.open = false;
      input.consume('inventory');
      input.consume('cancel');
      return;
    }
    if (input.justPressed('left')) { this.cursor = Math.max(0, this.cursor - 1); input.consume('left'); }
    if (input.justPressed('right')) { this.cursor = Math.min(8, this.cursor + 1); input.consume('right'); }
    if (input.justPressed('up')) { this.tab = (this.tab + 2) % 3; this.cursor = 0; input.consume('up'); }
    if (input.justPressed('down')) { this.tab = (this.tab + 1) % 3; this.cursor = 0; input.consume('down'); }
    if (input.justPressed('interact') || input.justPressed('confirm')) {
      input.consume('interact');
      input.consume('confirm');
      if (this.tab === 0) {
        const owned = this.ownedList(game.player);
        const pick = owned[this.cursor];
        if (pick) {
          game.player.selectedItem = pick;
          audio.pickup();
        }
      } else if (this.tab === 2) {
        const stock = SHOP_STOCK[this.cursor];
        if (stock) game.tryBuy(stock.id);
      }
    }
  }

  draw(ctx, game, W, H) {
    if (!this.open) return;
    try {
      const p = game.player;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, W, H);
      const pw = 400;
      const ph = 220;
      const px = (W - pw) / 2;
      const py = (H - ph) / 2;
      ctx.fillStyle = '#14141f';
      ctx.fillRect(px, py, pw, ph);
      ctx.fillStyle = '#ffd94a';
      ctx.fillRect(px, py, pw, 2);
      ctx.fillRect(px, py + ph - 2, pw, 2);
      ctx.fillRect(px, py, 2, ph);
      ctx.fillRect(px + pw - 2, py, 2, ph);
      ctx.font = '12px monospace';
      ctx.textBaseline = 'top';
      const tabs = ['아이템 (↑↓ 전환)', '퀘스트', '상점'];
      tabs.forEach((t, i) => {
        ctx.fillStyle = this.tab === i ? '#ffd94a' : '#888';
        ctx.fillText((i === this.tab ? '▶' : ' ') + t, px + 14 + i * 130, py + 8);
      });
      ctx.fillStyle = '#666';
      ctx.fillText('I/Tab: 닫기  ←→: 선택  Enter: 결정', px + 14, py + ph - 20);

      if (this.tab === 0) {
        ctx.fillStyle = '#fff';
        ctx.fillText('검: ' + swordName(p.swordTier) + '  방패: ' + (p.hasShield || p.items.shield ? '있음' : '없음'), px + 14, py + 30);
        ctx.fillText(`하트: ${p.hp}/${p.maxHp}  조각: ${p.heartPieces}/4  젬:${p.gems} 열쇠:${p.keys} 화살:${p.arrows} 폭탄:${p.bombAmmo}`, px + 14, py + 46);
        const owned = this.ownedList(p);
        owned.forEach((id, i) => {
          const ix = px + 14 + (i % 4) * 95;
          const iy = py + 70 + Math.floor(i / 4) * 52;
          const sel = p.selectedItem === id;
          ctx.fillStyle = this.cursor === i ? '#2e6fd9' : sel ? '#3a5a1a' : '#222';
          ctx.fillRect(ix, iy, 88, 44);
          ctx.fillStyle = sel ? '#ffd94a' : '#fff';
          ctx.fillRect(ix, iy, 88, 2);
          const def = ITEM_DEFS[id];
          ctx.fillStyle = '#fff';
          ctx.fillText((this.cursor === i ? '▶' : ' ') + (def ? def.name : id), ix + 4, iy + 6);
          ctx.font = '10px monospace';
          ctx.fillStyle = '#aaa';
          let sub = '';
          if (id === 'bow') sub = `화살 ${p.arrows}`;
          if (id === 'bombs') sub = `폭탄 ${p.bombAmmo}`;
          if (id === 'potion') sub = `x${p.potions}`;
          ctx.fillText(sub, ix + 4, iy + 24);
          ctx.font = '12px monospace';
        });
        ctx.fillStyle = '#aaa';
        ctx.font = '10px monospace';
        const selId = owned[this.cursor];
        if (selId && ITEM_DEFS[selId]) ctx.fillText(ITEM_DEFS[selId].desc, px + 14, py + 170);
        ctx.font = '12px monospace';
        ctx.fillStyle = '#fff';
        ctx.fillText(`문장 조각: ${game.quest.shards}/3`, px + 280, py + 30);
      } else if (this.tab === 1) {
        ctx.fillStyle = '#ffe9a8';
        ctx.fillText('목표: ' + getObjectiveText(game.quest), px + 14, py + 32);
        ctx.fillStyle = '#fff';
        const lines = [
          `검: ${swordName(p.swordTier)}`,
          `문장 조각: ${game.quest.shards}/3 (D1:${game.quest.bossesDead.d1 ? 'O' : 'X'} D2:${game.quest.bossesDead.d2 ? 'O' : 'X'} D3:${game.quest.bossesDead.d3 ? 'O' : 'X'})`,
          `봉인된 문: ${game.quest.gateOpen ? '열림' : '닫힘'}`,
          `처치: ${game.quest.kills}  사망: ${game.deaths}  플레이: ${Math.floor(game.playtime / 60)}분`,
          '',
          '조작: 이동 WASD/방향키, Z/J/Space 검,',
          'X/K 아이템, C/L 아이템 전환, E/Enter 대화,',
          'I/Tab 인벤토리, Q 목표 표시, M 음소거'
        ];
        lines.forEach((ln, i) => ctx.fillText(ln, px + 14, py + 52 + i * 16));
      } else {
        ctx.fillStyle = '#fff';
        ctx.fillText(`보유 젬: ${p.gems}`, px + 14, py + 32);
        SHOP_STOCK.forEach((s, i) => {
          const iy = py + 52 + i * 32;
          ctx.fillStyle = this.cursor === i ? '#2e6fd9' : '#222';
          ctx.fillRect(px + 14, iy, pw - 28, 26);
          ctx.fillStyle = p.gems >= s.price ? '#fff' : '#777';
          ctx.fillText((this.cursor === i ? '▶' : ' ') + `${s.name} - ${s.price}젬 (${s.desc})`, px + 20, iy + 6);
        });
      }
    } catch (e) { /* stub */ }
  }
}
