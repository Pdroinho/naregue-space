export function readStorage(key: string) {
  try { return window.localStorage.getItem(key) } catch { return null }
}

export function writeStorage(key: string, value: string) {
  try { window.localStorage.setItem(key, value) } catch { /* best effort */ }
}

export function removeStorage(key: string) {
  try { window.localStorage.removeItem(key) } catch { /* best effort */ }
}
