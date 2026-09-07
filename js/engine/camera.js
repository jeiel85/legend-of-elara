// Simple follow camera with map clamping.
import { clamp } from './utils.js';

export class Camera {
  constructor(viewW, viewH) {
    this.viewW = viewW;
    this.viewH = viewH;
    this.x = 0;
    this.y = 0;
    this.shakeT = 0;
    this.shakeMag = 0;
  }

  shake(mag, time) {
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeT = Math.max(this.shakeT, time);
  }

  update(dt, focusX, focusY, mapPixelW, mapPixelH) {
    if (this.shakeT > 0) this.shakeT -= dt;
    else this.shakeMag = 0;
    let tx = focusX - this.viewW / 2;
    let ty = focusY - this.viewH / 2;
    tx = clamp(tx, 0, Math.max(0, mapPixelW - this.viewW));
    ty = clamp(ty, 0, Math.max(0, mapPixelH - this.viewH));
    // smooth follow
    const k = 1 - Math.pow(0.0001, dt);
    this.x += (tx - this.x) * k;
    this.y += (ty - this.y) * k;
    if (Math.abs(tx - this.x) < 0.5) this.x = tx;
    if (Math.abs(ty - this.y) < 0.5) this.y = ty;
  }

  snap(focusX, focusY, mapPixelW, mapPixelH) {
    this.x = clamp(focusX - this.viewW / 2, 0, Math.max(0, mapPixelW - this.viewW));
    this.y = clamp(focusY - this.viewH / 2, 0, Math.max(0, mapPixelH - this.viewH));
  }

  offset() {
    let ox = this.x;
    let oy = this.y;
    if (this.shakeT > 0 && this.shakeMag > 0) {
      ox += (Math.random() * 2 - 1) * this.shakeMag;
      oy += (Math.random() * 2 - 1) * this.shakeMag;
    }
    return { x: Math.round(ox), y: Math.round(oy) };
  }
}
