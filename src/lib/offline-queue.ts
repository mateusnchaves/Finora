/*
 * Transactions recorded without internet wait here (localStorage) until the connection
 * comes back; OfflineSync sends them. The queue belongs to the signed-in user and is
 * cleared with the offline cache when the user changes.
 */

const KEY = "finora-offline-transactions";
export const QUEUE_EVENT = "finora-offline-queue";

export type PendingTransaction = {
  id: string;
  values: Record<string, string>;
  createdAt: string;
  /** Set when the server refused it, so the user can see why and discard it. */
  error?: string;
};

/** Raw stored value, for useSyncExternalStore (a string compares by value). */
export function queueSnapshot(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function readQueue(): PendingTransaction[] {
  try {
    const saved = localStorage.getItem(KEY);
    return saved ? (JSON.parse(saved) as PendingTransaction[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: PendingTransaction[]) {
  try {
    if (queue.length) localStorage.setItem(KEY, JSON.stringify(queue));
    else localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(QUEUE_EVENT));
}

export function addToQueue(values: Record<string, string>) {
  writeQueue([...readQueue(), { id: crypto.randomUUID(), values, createdAt: new Date().toISOString() }]);
}

export function removeFromQueue(ids: string[]) {
  writeQueue(readQueue().filter((item) => !ids.includes(item.id)));
}

export function markFailed(id: string, error: string) {
  writeQueue(readQueue().map((item) => (item.id === id ? { ...item, error } : item)));
}

export function clearQueue() {
  writeQueue([]);
}

/** Plain string fields of a form, without React's internal action fields. */
export function formFields(form: HTMLFormElement): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of new FormData(form)) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }
  return values;
}
