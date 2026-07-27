export const PAGE_THUMBNAIL_DEBOUNCE_MS = 500;
export const PAGE_THUMBNAIL_FLUSH_EVENT = 'forge:thumbnail-flush';

export interface PageThumbnailTarget {
  courseId: string;
  pageId: string;
}

interface ThumbnailSchedulerClock {
  set: (callback: () => void, delayMs: number) => unknown;
  clear: (timer: unknown) => void;
}

const defaultClock: ThumbnailSchedulerClock = {
  set: (callback, delayMs) => setTimeout(callback, delayMs),
  clear: (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>),
};

export function isSamePageThumbnailTarget(
  left: PageThumbnailTarget | null,
  right: PageThumbnailTarget | null,
): boolean {
  return left?.courseId === right?.courseId && left?.pageId === right?.pageId;
}

export function createPageThumbnailScheduler(
  capture: (target: PageThumbnailTarget) => void,
  options: {
    delayMs?: number;
    clock?: ThumbnailSchedulerClock;
  } = {},
) {
  const delayMs = options.delayMs ?? PAGE_THUMBNAIL_DEBOUNCE_MS;
  const clock = options.clock ?? defaultClock;
  let pendingTarget: PageThumbnailTarget | null = null;
  let timer: unknown = null;

  const cancel = () => {
    if (timer !== null) clock.clear(timer);
    timer = null;
    pendingTarget = null;
  };

  const runPending = () => {
    const target = pendingTarget;
    timer = null;
    pendingTarget = null;
    if (target) capture(target);
  };

  return {
    schedule(target: PageThumbnailTarget) {
      if (timer !== null) clock.clear(timer);
      pendingTarget = target;
      timer = clock.set(runPending, delayMs);
    },
    flush(target?: PageThumbnailTarget) {
      const captureTarget = target ?? pendingTarget;
      cancel();
      if (captureTarget) capture(captureTarget);
    },
    cancel,
  };
}

export function requestPageThumbnailFlush(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PAGE_THUMBNAIL_FLUSH_EVENT));
}
