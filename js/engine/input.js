// Keyboard + touch input abstraction. Safe to import in Node (guards document).
// API: input.held(name), input.justPressed(name), input.consume(name),
// input.update() (call at end of frame), input.simPress(name) for tests.

const GAME_KEYS = [
  'up', 'down', 'left', 'right',
  'attack', 'use', 'interact', 'inventory', 'mute', 'cycle', 'quest', 'confirm', 'cancel'
];

function createState() {
  const held = {};
  const just = {};
  for (const k of GAME_KEYS) {
    held[k] = false;
    just[k] = false;
  }
  return { held, just };
}

class InputManager {
  constructor() {
    const s = createState();
    this.heldMap = s.held;
    this.justMap = s.just;
    this.touchMode = false;
    this._keyMap = {
      ArrowUp: 'up', KeyW: 'up',
      ArrowDown: 'down', KeyS: 'down',
      ArrowLeft: 'left', KeyA: 'left',
      ArrowRight: 'right', KeyD: 'right',
      KeyZ: 'attack', KeyJ: 'attack', Space: 'attack',
      KeyX: 'use', KeyK: 'use',
      Enter: 'interact', KeyE: 'interact',
      KeyI: 'inventory', Tab: 'inventory',
      KeyM: 'mute',
      KeyC: 'cycle', KeyL: 'cycle',
      KeyQ: 'quest',
      Escape: 'cancel'
    };
    if (typeof document !== 'undefined' && typeof window !== 'undefined') {
      this._attach();
    }
  }

  _attach() {
    window.addEventListener('keydown', (e) => {
      const name = this._keyMap[e.code];
      if (name) {
        if (name === 'inventory' && e.code === 'Tab') e.preventDefault();
        if (name === 'attack' && e.code === 'Space') e.preventDefault();
        if (!this.heldMap[name]) this.justMap[name] = true;
        this.heldMap[name] = true;
      }
      // Enter also acts as confirm
      if (e.code === 'Enter' || e.code === 'Space') {
        if (!this.heldMap.confirm) this.justMap.confirm = true;
        this.heldMap.confirm = true;
      }
    });
    window.addEventListener('keyup', (e) => {
      const name = this._keyMap[e.code];
      if (name) this.heldMap[name] = false;
      if (e.code === 'Enter' || e.code === 'Space') this.heldMap.confirm = false;
    });
    window.addEventListener('blur', () => this.releaseAll());
  }

  // Bind on-screen touch buttons: element with data-key attribute.
  bindTouch(root) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    const els = root.querySelectorAll('[data-key]');
    els.forEach((el) => {
      const name = el.getAttribute('data-key');
      if (!GAME_KEYS.includes(name)) return;
      const down = (e) => {
        e.preventDefault();
        this.touchMode = true;
        if (!this.heldMap[name]) this.justMap[name] = true;
        this.heldMap[name] = true;
        if (typeof document !== 'undefined') document.body.classList.add('touch');
      };
      const up = (e) => {
        e.preventDefault();
        this.heldMap[name] = false;
        if (name === 'confirm') this.heldMap.confirm = false;
      };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('pointerleave', up);
      // confirm mirror
      if (name === 'interact' || name === 'attack') {
        const cdown = (e) => {
          e.preventDefault();
          if (!this.heldMap.confirm) this.justMap.confirm = true;
          this.heldMap.confirm = true;
        };
        el.addEventListener('pointerdown', cdown);
        el.addEventListener('pointerup', (e) => {
          e.preventDefault();
        });
      }
    });
    if (typeof window !== 'undefined' && 'ontouchstart' in window) {
      this.touchMode = true;
      if (typeof document !== 'undefined') document.body.classList.add('touch');
    }
  }

  held(name) {
    return !!this.heldMap[name];
  }

  justPressed(name) {
    return !!this.justMap[name];
  }

  consume(name) {
    this.justMap[name] = false;
  }

  press(name) {
    // programmatic press (also used by touch fallback + tests)
    if (!this.heldMap[name]) this.justMap[name] = true;
    this.heldMap[name] = true;
  }

  release(name) {
    this.heldMap[name] = false;
  }

  releaseAll() {
    for (const k of GAME_KEYS) this.heldMap[k] = false;
  }

  simPress(name) {
    this.press(name);
  }

  simRelease(name) {
    this.release(name);
  }

  update() {
    for (const k of GAME_KEYS) this.justMap[k] = false;
  }
}

export const input = new InputManager();
export { InputManager };
