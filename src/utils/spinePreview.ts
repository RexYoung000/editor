export interface SpinePreviewObject {
  play: (animation: number, loop: boolean, force?: boolean) => void;
  paused: () => void;
  once?: (event: string, caller: unknown, listener: () => void) => void;
  _forgePreviewToken?: number;
  _spinePaused?: boolean;
}

export function pauseSpineAtFirstFrame(obj: SpinePreviewObject, animationIndex: number): void {
  obj.play(animationIndex, true, true);
  obj.paused();
  obj._spinePaused = true;
}

export function playSpineOnce(obj: SpinePreviewObject, animationIndex: number): void {
  const token = (obj._forgePreviewToken ?? 0) + 1;
  obj._forgePreviewToken = token;
  obj._spinePaused = false;

  obj.once?.('stopped', obj, () => {
    if (obj._forgePreviewToken !== token) return;
    pauseSpineAtFirstFrame(obj, animationIndex);
  });
  obj.play(animationIndex, false, true);
}
