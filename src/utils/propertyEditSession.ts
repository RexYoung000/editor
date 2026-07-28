export const PROPERTY_EDIT_IDLE_MS = 500;

export interface PropertyEditClock {
  set(callback: () => void, delayMs: number): unknown;
  clear(timer: unknown): void;
}

export interface PropertyEditSession {
  begin(): void;
  change(applyChange: () => void): void;
  commit(): boolean;
  dispose(): void;
}

const defaultClock: PropertyEditClock = {
  set: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
  clear: (timer) => globalThis.clearTimeout(timer as ReturnType<typeof setTimeout>),
};

const activeSessions = new Set<PropertyEditSession>();

export function parseFiniteNumberDraft(raw: string): number | null {
  const value = raw.trim();
  if (!/^[+-]?(?:(?:\d+\.?\d*)|(?:\.\d+))(?:e[+-]?\d+)?$/i.test(value)) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function createPropertyEditSession(
  getSnapshot: () => string,
  commitHistory: () => void,
  options: { idleMs?: number; clock?: PropertyEditClock } = {},
): PropertyEditSession {
  const idleMs = options.idleMs ?? PROPERTY_EDIT_IDLE_MS;
  const clock = options.clock ?? defaultClock;
  let baseline: string | null = null;
  let changed = false;
  let timer: unknown = null;

  const clearTimer = () => {
    if (timer === null) return;
    clock.clear(timer);
    timer = null;
  };

  const session: PropertyEditSession = {
    begin() {
      if (baseline === null) baseline = getSnapshot();
    },
    change(applyChange) {
      session.begin();
      applyChange();
      changed = true;
      clearTimer();
      timer = clock.set(() => {
        timer = null;
        session.commit();
      }, idleMs);
    },
    commit() {
      clearTimer();
      const shouldCommit = changed && baseline !== null && baseline !== getSnapshot();
      baseline = null;
      changed = false;
      if (shouldCommit) commitHistory();
      return shouldCommit;
    },
    dispose() {
      session.commit();
      activeSessions.delete(session);
    },
  };

  activeSessions.add(session);
  return session;
}

export function commitPendingPropertyEdits(): void {
  [...activeSessions].forEach((session) => session.commit());
}
