export interface CanvasAssistPreferences {
  showGrid: boolean;
  snapToGrid: boolean;
  smartSnap: boolean;
  showSnapGuides: boolean;
  showSpacingHints: boolean;
}

interface PreferenceStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export const CANVAS_ASSIST_PREFERENCES_KEY = 'forge_canvas_assist_preferences';

export const DEFAULT_CANVAS_ASSIST_PREFERENCES: CanvasAssistPreferences = {
  showGrid: false,
  snapToGrid: false,
  smartSnap: true,
  showSnapGuides: true,
  showSpacingHints: true,
};

function readBoolean(
  value: unknown,
  fallback: boolean,
): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function parseCanvasAssistPreferences(
  raw: string | null,
): CanvasAssistPreferences {
  if (!raw) return { ...DEFAULT_CANVAS_ASSIST_PREFERENCES };
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      showGrid: readBoolean(parsed.showGrid, DEFAULT_CANVAS_ASSIST_PREFERENCES.showGrid),
      snapToGrid: readBoolean(parsed.snapToGrid, DEFAULT_CANVAS_ASSIST_PREFERENCES.snapToGrid),
      smartSnap: readBoolean(parsed.smartSnap, DEFAULT_CANVAS_ASSIST_PREFERENCES.smartSnap),
      showSnapGuides: readBoolean(
        parsed.showSnapGuides,
        DEFAULT_CANVAS_ASSIST_PREFERENCES.showSnapGuides,
      ),
      showSpacingHints: readBoolean(
        parsed.showSpacingHints,
        DEFAULT_CANVAS_ASSIST_PREFERENCES.showSpacingHints,
      ),
    };
  } catch {
    return { ...DEFAULT_CANVAS_ASSIST_PREFERENCES };
  }
}

function getBrowserStorage(): PreferenceStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadCanvasAssistPreferences(
  storage: PreferenceStorage | null = getBrowserStorage(),
): CanvasAssistPreferences {
  if (!storage) return { ...DEFAULT_CANVAS_ASSIST_PREFERENCES };
  try {
    return parseCanvasAssistPreferences(storage.getItem(CANVAS_ASSIST_PREFERENCES_KEY));
  } catch {
    return { ...DEFAULT_CANVAS_ASSIST_PREFERENCES };
  }
}

export function saveCanvasAssistPreferences(
  preferences: CanvasAssistPreferences,
  storage: PreferenceStorage | null = getBrowserStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(CANVAS_ASSIST_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // 本地存储不可用时继续使用当前会话设置，不影响画布编辑。
  }
}

export function resetCanvasAssistPreferences(
  storage: PreferenceStorage | null = getBrowserStorage(),
): CanvasAssistPreferences {
  const defaults = { ...DEFAULT_CANVAS_ASSIST_PREFERENCES };
  saveCanvasAssistPreferences(defaults, storage);
  return defaults;
}
