// Shared, side-effect-light helpers for local progress and stable view links.
const storageIssues = new Set();
export function savedStorageIssueKeys() { return [...storageIssues]; }
export function reportStorageIssue(key) {
  storageIssues.add(key);
  if (typeof window !== "undefined") window.dispatchEvent(new Event("ig:storage-issue"));
}
function matchesFallbackType(value, fallback) {
  if (Array.isArray(fallback)) return Array.isArray(value);
  if (fallback !== null && typeof fallback === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  return typeof value === typeof fallback && (typeof value !== "number" || Number.isFinite(value));
}
export function loadSavedValue(storageProvider, key, fallback) {
  try {
    const raw = storageProvider().getItem(key);
    if (raw === null) return { value: fallback, writable: true };
    const value = JSON.parse(raw);
    if (!matchesFallbackType(value, fallback)) return { value: fallback, writable: false };
    return { value, writable: true };
  } catch {
    // Never replace unreadable or malformed existing user data with defaults.
    return { value: fallback, writable: false };
  }
}
export function saveSavedValue(storageProvider, key, value, initialRead) {
  if (!initialRead?.writable) return false;
  try {
    storageProvider().setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export const VIEW_IDS = ["today", "library", "journal", "wishes"];
export function viewFromHash(hash = "") {
  const name = String(hash).replace(/^#/, "");
  return VIEW_IDS.includes(name) ? name : "today";
}
