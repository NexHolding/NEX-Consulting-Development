// Shared client-side activity indicator. Each operation has its own 300 ms threshold.
const listeners = new Set<() => void>();
const pending = new Map<
  symbol,
  { ready: boolean; timer: ReturnType<typeof setTimeout> }
>();
let visible = false;
let shownAt = 0;
let hideTimer: ReturnType<typeof setTimeout> | undefined;
function emit(next: boolean) {
  if (next === visible) return;
  visible = next;
  if (next) shownAt = Date.now();
  listeners.forEach((listener) => listener());
}
function reconcile() {
  clearTimeout(hideTimer);
  if ([...pending.values()].some((item) => item.ready)) emit(true);
  else if (visible)
    hideTimer = setTimeout(
      () => emit(false),
      Math.max(0, 400 - (Date.now() - shownAt)),
    );
}
export function beginLoading() {
  const id = Symbol();
  pending.set(id, {
    ready: false,
    timer: setTimeout(() => {
      const item = pending.get(id);
      if (item) {
        item.ready = true;
        reconcile();
      }
    }, 300),
  });
  let finished = false;
  return () => {
    if (finished) return;
    finished = true;
    clearTimeout(pending.get(id)?.timer);
    pending.delete(id);
    reconcile();
  };
}
export async function withLoading<T>(operation: () => Promise<T>): Promise<T> {
  const finish = beginLoading();
  try {
    return await operation();
  } finally {
    finish();
  }
}
export function subscribeLoading(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export const loadingSnapshot = () => visible;
export const serverLoadingSnapshot = () => false;
