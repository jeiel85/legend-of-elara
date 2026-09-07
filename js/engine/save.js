// Versioned localStorage save with try/catch fallback.
export const SAVE_KEY = 'elara.save.v1';
export const SAVE_VERSION = 1;

export function hasSave() {
  try {
    if (typeof localStorage === 'undefined') return false;
    return !!localStorage.getItem(SAVE_KEY);
  } catch (e) {
    return false;
  }
}

export function readRawSave() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== SAVE_VERSION) return null;
    return data;
  } catch (e) {
    return null;
  }
}

export function writeRawSave(data) {
  try {
    if (typeof localStorage === 'undefined') return false;
    data.version = SAVE_VERSION;
    data.savedAt = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

export function clearSave() {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(SAVE_KEY);
  } catch (e) { /* ignore */ }
}

// Build a serializable snapshot from game state. Game passes a plain object.
export function saveGame(snapshot) {
  const data = Object.assign({}, snapshot);
  return writeRawSave(data);
}

export function loadGame() {
  return readRawSave();
}
