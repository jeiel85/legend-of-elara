// Typewriter dialog box with pages, name, quest triggers.
import { fillTemplate } from '../content/dialogs.js';
import { audio } from '../engine/audio.js';

export class DialogSys {
  constructor() {
    this.active = false;
    this.name = '';
    this.pages = [];
    this.pageIndex = 0;
    this.chars = 0;
    this.t = 0;
    this.onDone = null;
    this.shopMode = false;
  }

  show(name, pages, onDone, vars) {
    this.active = true;
    this.name = name || '';
    this.pages = vars ? fillTemplate(pages, vars) : pages.slice();
    this.pageIndex = 0;
    this.chars = 0;
    this.t = 0;
    this.onDone = onDone || null;
  }

  get currentText() {
    return this.pages[this.pageIndex] || '';
  }

  get shownText() {
    const full = this.currentText;
    return full.substring(0, Math.floor(this.chars));
  }

  get pageDone() {
    return this.chars >= this.currentText.length;
  }

  update(dt, input) {
    if (!this.active) return;
    this.t += dt;
    const full = this.currentText;
    if (!this.pageDone) {
      const prev = Math.floor(this.chars);
      this.chars = Math.min(full.length, this.chars + dt * 45);
      if (Math.floor(this.chars) !== prev && full[Math.floor(this.chars)] !== '\n') {
        if (Math.floor(this.chars) % 3 === 0) audio.blip();
      }
      if (input.justPressed('interact') || input.justPressed('confirm') || input.justPressed('attack')) {
        this.chars = full.length;
        input.consume('interact');
        input.consume('confirm');
        input.consume('attack');
      }
    } else {
      if (input.justPressed('interact') || input.justPressed('confirm') || input.justPressed('attack')) {
        input.consume('interact');
        input.consume('confirm');
        input.consume('attack');
        this.pageIndex++;
        this.chars = 0;
        if (this.pageIndex >= this.pages.length) {
          this.active = false;
          const cb = this.onDone;
          this.onDone = null;
          if (cb) cb();
        }
      }
    }
  }

  draw(ctx, W, H) {
    if (!this.active) return;
    try {
      const bx = 8;
      const bw = W - 16;
      const bh = 84;
      const by = H - bh - 8;
      ctx.fillStyle = 'rgba(10,10,20,0.92)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#fff';
      ctx.fillRect(bx, by, bw, 2);
      ctx.fillRect(bx, by + bh - 2, bw, 2);
      ctx.fillRect(bx, by, 2, bh);
      ctx.fillRect(bx + bw - 2, by, 2, bh);
      ctx.font = '12px monospace';
      ctx.textBaseline = 'top';
      if (this.name) {
        ctx.fillStyle = '#ffd94a';
        ctx.fillText(this.name, bx + 8, by + 6);
      }
      ctx.fillStyle = '#fff';
      const lines = this.shownText.split('\n');
      lines.forEach((ln, i) => ctx.fillText(ln, bx + 8, by + 24 + i * 15));
      if (this.pageDone) {
        if (Math.floor(this.t * 3) % 2 === 0) {
          ctx.fillStyle = '#ffd94a';
          ctx.fillText('▼ ENTER', bx + bw - 70, by + bh - 18);
        }
      }
    } catch (e) { /* stub */ }
  }
}
